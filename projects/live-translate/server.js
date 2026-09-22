import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { WebSocketServer } from 'ws'
import { pronounce, SUPPORTED_PRONUNCIATION } from './pronounce.js'
import { interjection, isInterjection } from './interjection.js'
import { lookupPhrase } from './phrasebook.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT || 8080)
const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '')
// 측정(요일 126건): gemma3:12b 126/126, gemma3:4b 119/126.
// 통화에서 요일·날짜 오역은 치명적이라 정확도를 택하고, 느린 만큼 스트리밍으로 덮는다.
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gemma3:12b'
const FAST_MODEL = process.env.OLLAMA_MODEL_FAST || 'gemma3:4b'

let installed = new Set()
async function refreshInstalled() {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(4000) })
    if (r.ok) installed = new Set(((await r.json()).models || []).map(m => m.name))
  } catch { /* 다음 요청에서 다시 시도한다 */ }
}

const app = express()
app.use(express.json({ limit: '256kb' }))

// 프론트엔드를 정적 호스팅(Cloudflare Pages 등)에 올리면 출처가 달라진다.
// ALLOW_ORIGIN 에 콤마로 나열하거나, 비워두면 모든 출처를 허용한다.
// 이 API 는 인증 없이 번역만 하므로 자격증명(쿠키)은 절대 받지 않는다.
const ALLOWED = (process.env.ALLOW_ORIGIN || '')
  .split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && (!ALLOWED.length || ALLOWED.includes(origin.replace(/\/$/, '')))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Max-Age', '86400')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0, etag: true }))

const LANG_NAMES = {
  ko: 'Korean', en: 'English', ja: 'Japanese', zh: 'Chinese (Simplified)',
  es: 'Spanish', fr: 'French', de: 'German', vi: 'Vietnamese',
  ru: 'Russian', ar: 'Arabic', id: 'Indonesian', th: 'Thai',
  pt: 'Portuguese', hi: 'Hindi', it: 'Italian', tr: 'Turkish',
}

/* 목표 언어별 추가 지시.
   작은 모델은 언어를 섞는다 — 일본어에 중국어 어휘를 쓰거나, 전화 인사를 엉뚱하게 옮긴다.
   다만 프롬프트가 길수록 첫 글자가 늦게 나오므로(12B 기준 토큰당 7ms) 최소한만 남긴다. */
const LANG_RULES = {
  ja: ['Natural spoken Japanese only — no Chinese words (下午, 可否). Use 。？！. 여보세요=もしもし.'],
  ko: ['Natural spoken Korean only — no kana or hanzi. もしもし=여보세요.'],
  en: ['Natural spoken English only.'],
}

/* 예시는 한↔일에만 둔다. 한↔영은 규칙만으로 충분했고, 예시 한 쌍이 20토큰씩 늘린다. */
const FEW_SHOT = {
  'ko>ja': [['여보세요', 'もしもし。'], ['지금 통화 괜찮으세요', '今お電話大丈夫ですか？']],
  'ja>ko': [['もしもし', '여보세요.'], ['今お電話大丈夫ですか', '지금 통화 괜찮으세요?']],
}

// 모델이 덧붙이는 군더더기를 걷어낸다
function tidy(raw) {
  let out = String(raw).trim()
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()   // 추론형 모델 방어
  out = out.replace(/^```[\w]*\n?|```$/g, '').trim()          // 코드펜스 방어
  out = out.replace(/^["'“”「『]|["'“”」』]$/g, '').trim()
  return out
}

function systemPrompt(from, to) {
  const src = LANG_NAMES[from] || from
  const dst = LANG_NAMES[to] || to
  return [
    `Interpret a phone call from ${src} to ${dst}.`,
    `Output only the translation — no quotes, notes, or the original.`,
    `Preserve names, numbers, units and rates exactly (초당=per second, 분당=per minute). Speak naturally.`,
    `Input is speech-recognised and unpunctuated; punctuate the translation (? ! .).`,
    ...(LANG_RULES[to] || []),
  ].join('\n')
}

const fewShot = (from, to) =>
  (FEW_SHOT[`${from}>${to}`] || []).flatMap(([u, a]) => [
    { role: 'user', content: u },
    { role: 'assistant', content: a },
  ])

/* ---------------- Ollama 연동 ---------------- */

app.get('/api/health', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(4000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    installed = new Set((data.models || []).map(m => m.name))
    res.json({
      ok: true,
      host: OLLAMA_HOST,
      defaultModel: DEFAULT_MODEL,
      models: (data.models || []).map(m => m.name).sort(),
      pronunciationLangs: SUPPORTED_PRONUNCIATION,
    })
  } catch (err) {
    res.status(503).json({ ok: false, host: OLLAMA_HOST, defaultModel: DEFAULT_MODEL, models: [], error: String(err.message || err) })
  }
})

// 짧은 발화는 반복되기 쉬워 캐시가 꽤 잘 먹는다.
const cache = new Map()
const cacheKey = (m, f, t, s) => `${m}|${f}>${t}|${s}`

app.post('/api/translate', async (req, res) => {
  const text = String(req.body?.text || '').trim()
  const from = String(req.body?.from || 'ko')
  const to = String(req.body?.to || 'en')
  let model = String(req.body?.model || '') || DEFAULT_MODEL

  if (!text) return res.status(400).json({ error: 'text is required' })
  // 같은 언어면 번역할 것이 없다. 스트리밍을 요청했다면 형식을 맞춰 돌려준다 —
  // 그러지 않으면 클라이언트가 스트림으로 읽다가 빈 응답으로 판단한다.
  if (from === to) {
    if (req.body?.stream === true) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
      return res.end(JSON.stringify({ done: true, translation: text }) + '\n')
    }
    return res.json({ translation: text, cached: true })
  }

  // 웃음·감탄, 그리고 통화에서 늘 나오는 짧은 말은 모델에 보내지 않는다.
  // 답이 정해져 있는데 1~2 초를 기다릴 이유가 없다.
  const quick = interjection(text, to) || lookupPhrase(text, from, to)
  if (quick) {
    if (req.body?.stream === true) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
      return res.end(JSON.stringify({ done: true, translation: quick }) + '\n')
    }
    return res.json({ translation: quick, cached: true })
  }

  if (!installed.size) await refreshInstalled()
  if (!installed.has(model)) model = DEFAULT_MODEL   // 안 받아둔 모델이면 기본으로

  const key = cacheKey(model, from, to, text)
  // 캐시도 요청한 형식에 맞춰 답해야 한다. 그러지 않으면 스트림으로 읽는 쪽이
  // 조각을 하나도 못 찾고 빈 응답으로 판단한다.
  if (cache.has(key)) {
    const hit = cache.get(key)
    if (req.body?.stream === true) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
      return res.end(JSON.stringify({ done: true, translation: hit }) + '\n')
    }
    return res.json({ translation: hit, cached: true })
  }

  const system = systemPrompt(from, to)

  const wantStream = req.body?.stream === true
  const body = JSON.stringify({
    model,
    stream: wantStream,
    keep_alive: '30m',
    messages: [
      { role: 'system', content: system },
      ...fewShot(from, to),
      { role: 'user', content: text },
    ],
    options: { temperature: 0.2, top_p: 0.9, num_predict: 256, num_ctx: 4096 },
  })

  /* 스트리밍 — 큰 모델은 2초쯤 걸리지만, 첫 글자가 바로 뜨면 체감은 훨씬 빠르다.
     줄 단위 JSON(NDJSON)으로 조각을 그대로 흘려보낸다. */
  if (wantStream) {
    try {
      const r = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
        signal: AbortSignal.timeout(60000),
      })
      if (!r.ok || !r.body) return res.status(502).json({ error: `Ollama ${r.status}` })

      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('X-Accel-Buffering', 'no')

      let full = ''
      const reader = r.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          let piece
          try { piece = JSON.parse(line) } catch { continue }
          const chunk = piece?.message?.content || ''
          if (chunk) { full += chunk; res.write(JSON.stringify({ delta: chunk }) + '\n') }
        }
      }

      const out = tidy(full)
      if (out) cache.set(key, out)
      res.write(JSON.stringify({ done: true, translation: out }) + '\n')
      return res.end()
    } catch (err) {
      if (!res.headersSent) return res.status(502).json({ error: String(err.message || err) })
      res.write(JSON.stringify({ error: String(err.message || err) }) + '\n')
      return res.end()
    }
  }

  try {
    const r = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(30000),
    })

    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return res.status(502).json({ error: `Ollama ${r.status}: ${body.slice(0, 300)}` })
    }

    const data = await r.json()
    const out = tidy(String(data?.message?.content || ''))
    if (!out) return res.status(502).json({ error: '빈 응답' })

    cache.set(key, out)
    if (cache.size > 2000) cache.delete(cache.keys().next().value)
    res.json({ translation: out, cached: false })
  } catch (err) {
    res.status(502).json({ error: String(err.message || err) })
  }
})

/* 발음 표기 — 번역문이 한국어로 어떻게 들리는지 (사전 기반, LLM 호출 없음) */

app.post('/api/pronounce', async (req, res) => {
  const text = String(req.body?.text || '').trim()
  const lang = String(req.body?.lang || 'en')       // 적을 말의 언어
  const script = String(req.body?.script || 'ko')   // 읽는 사람의 언어
  if (!text) return res.status(400).json({ error: 'text is required' })
  // 웃음 표기(www, ㅋㅋ)는 읽는 법을 적어봤자 그대로라 의미가 없다
  if (isInterjection(text)) return res.json({ pronunciation: '' })
  try {
    res.json({ pronunciation: await pronounce(text, lang, script) })
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) })
  }
})

/* ---------------- WebRTC 시그널링 ---------------- */

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const rooms = new Map()     // roomId -> Map(peerId -> ws)   실제 통화(미디어) 단위
const online = new Map()    // userId -> ws                 전화를 걸 수 있는 상대 목록
let seq = 0

const send = (ws, msg) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg)) }

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin
  if (ALLOWED.length && origin && !ALLOWED.includes(origin.replace(/\/$/, ''))) {
    ws.close(1008, 'origin not allowed')
    return
  }
  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })

  ws.on('message', raw => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    if (msg.type === 'join') {
      const roomId = String(msg.room || '').trim().slice(0, 64)
      if (!roomId) return send(ws, { type: 'error', reason: 'invalid-room' })

      const room = rooms.get(roomId) || new Map()
      if (room.size >= 2 && !room.has(ws.peerId)) return send(ws, { type: 'room-full' })

      ws.peerId = `p${++seq}`
      ws.roomId = roomId
      ws.lang = String(msg.lang || 'ko')
      ws.name = String(msg.name || '').slice(0, 40) || '상대방'

      const peers = [...room.values()].map(p => ({ id: p.peerId, lang: p.lang, name: p.name }))
      room.set(ws.peerId, ws)
      rooms.set(roomId, room)

      send(ws, { type: 'joined', id: ws.peerId, peers })
      for (const p of room.values()) {
        if (p !== ws) send(p, { type: 'peer-join', id: ws.peerId, lang: ws.lang, name: ws.name })
      }
      return
    }

    /* ── 전화 교환 ──
       방(room)은 미디어 연결 단위고, 그 앞단에 "걸고 받는" 과정을 둔다.
       userId 는 브라우저마다 고정된 번호라 상대가 그 번호로 걸 수 있다. */

    if (msg.type === 'register') {
      const id = String(msg.id || '').trim().slice(0, 16)
      if (!id) return
      ws.userId = id
      ws.lang = String(msg.lang || 'ko')
      ws.name = String(msg.name || '').slice(0, 40) || '상대방'
      online.set(id, ws)
      return send(ws, { type: 'registered', id })
    }

    if (msg.type === 'call') {
      const to = String(msg.to || '').trim()
      const target = online.get(to)
      if (!target || target === ws) return send(ws, { type: 'call-failed', reason: 'offline' })
      if (target.inCall || target.ringingWith) return send(ws, { type: 'call-failed', reason: 'busy' })

      ws.ringingWith = to
      target.ringingWith = ws.userId
      send(target, { type: 'incoming', from: ws.userId, name: ws.name, lang: ws.lang })
      return send(ws, { type: 'ringing', to, name: target.name, lang: target.lang })
    }

    if (msg.type === 'accept') {
      const caller = online.get(String(msg.to || ''))
      if (!caller) return send(ws, { type: 'call-failed', reason: 'gone' })
      // 두 번호로 방 이름을 만들면 양쪽이 같은 방을 고르게 된다
      const room = 'call-' + [ws.userId, caller.userId].sort().join('-')
      ws.inCall = caller.inCall = true
      ws.ringingWith = caller.ringingWith = null
      send(caller, { type: 'accepted', room, peer: { name: ws.name, lang: ws.lang } })
      return send(ws, { type: 'accepted', room, peer: { name: caller.name, lang: caller.lang } })
    }

    if (msg.type === 'reject' || msg.type === 'cancel') {
      const other = online.get(String(msg.to || ''))
      ws.ringingWith = null
      if (other) { other.ringingWith = null; send(other, { type: msg.type === 'reject' ? 'rejected' : 'canceled' }) }
      return
    }

    // 나머지는 같은 방의 지정 상대에게 그대로 중계 (signal / sub / lang / state)
    if (msg.to && ws.roomId) {
      const target = rooms.get(ws.roomId)?.get(msg.to)
      if (target) send(target, { ...msg, from: ws.peerId })
    }
  })

  ws.on('close', () => {
    if (ws.userId && online.get(ws.userId) === ws) online.delete(ws.userId)

    // 벨이 울리는 중에 끊기면 상대 화면도 정리해 준다
    if (ws.ringingWith) {
      const other = online.get(ws.ringingWith)
      if (other) { other.ringingWith = null; send(other, { type: 'canceled' }) }
    }

    const room = rooms.get(ws.roomId)
    if (!room) return
    room.delete(ws.peerId)
    if (room.size === 0) rooms.delete(ws.roomId)
    else for (const p of room.values()) { p.inCall = false; send(p, { type: 'peer-leave', id: ws.peerId }) }
  })
})

// 죽은 소켓 정리
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue }
    ws.isAlive = false
    ws.ping()
  }
}, 30000).unref()

server.listen(PORT, () => {
  console.log(`▶ live-translate  http://localhost:${PORT}`)
  console.log(`  Ollama: ${OLLAMA_HOST}  (기본 모델: ${DEFAULT_MODEL})`)
  console.log(`  허용 출처: ${ALLOWED.length ? ALLOWED.join(', ') : '(전체)'}`)
  refreshInstalled()
})
