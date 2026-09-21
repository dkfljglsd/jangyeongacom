import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { WebSocketServer } from 'ws'
import { pronounce, SUPPORTED_PRONUNCIATION } from './pronounce.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT || 8080)
const OLLAMA_HOST = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '')
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b'

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

/* ---------------- Ollama 연동 ---------------- */

app.get('/api/health', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(4000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
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
  const model = String(req.body?.model || DEFAULT_MODEL)

  if (!text) return res.status(400).json({ error: 'text is required' })
  if (from === to) return res.json({ translation: text, cached: true })

  const key = cacheKey(model, from, to, text)
  if (cache.has(key)) return res.json({ translation: cache.get(key), cached: true })

  const src = LANG_NAMES[from] || from
  const dst = LANG_NAMES[to] || to
  const system = [
    `You are a live simultaneous interpreter on a phone call.`,
    `Translate the user's utterance from ${src} into ${dst}.`,
    `Rules:`,
    `- Output ONLY the translation. No quotes, no notes, no romanization, no original text.`,
    `- Keep it natural and conversational, as spoken on a call.`,
    `- Preserve names, numbers, units and proper nouns exactly.`,
    `- The input comes from speech recognition and may be fragmentary; translate it as-is without asking questions.`,
    `- If the input is already ${dst}, repeat it unchanged.`,
  ].join('\n')

  try {
    const r = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        keep_alive: '30m',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text },
        ],
        options: { temperature: 0.2, top_p: 0.9, num_predict: 256 },
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return res.status(502).json({ error: `Ollama ${r.status}: ${body.slice(0, 300)}` })
    }

    const data = await r.json()
    let out = String(data?.message?.content || '').trim()
    out = out.replace(/^```[\w]*\n?|```$/g, '').trim()          // 코드펜스 방어
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()   // 추론형 모델 방어
    out = out.replace(/^["'“”「『]|["'“”」』]$/g, '').trim()
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
  const lang = String(req.body?.lang || 'en')
  if (!text) return res.status(400).json({ error: 'text is required' })
  try {
    res.json({ pronunciation: await pronounce(text, lang) })
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) })
  }
})

/* ---------------- WebRTC 시그널링 ---------------- */

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const rooms = new Map() // roomId -> Map(peerId -> ws)
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

    // 나머지는 같은 방의 지정 상대에게 그대로 중계 (signal / sub / lang / state)
    if (msg.to && ws.roomId) {
      const target = rooms.get(ws.roomId)?.get(msg.to)
      if (target) send(target, { ...msg, from: ws.peerId })
    }
  })

  ws.on('close', () => {
    const room = rooms.get(ws.roomId)
    if (!room) return
    room.delete(ws.peerId)
    if (room.size === 0) rooms.delete(ws.roomId)
    else for (const p of room.values()) send(p, { type: 'peer-leave', id: ws.peerId })
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
})
