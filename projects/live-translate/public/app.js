/* 동시통역 통화 — WebRTC 음성 + Web Speech STT + Ollama 번역 + TTS */

const $ = s => document.querySelector(s)

// [코드, 현지 표기, BCP-47, 영어 이름]
const LANGS = [
  ['ko', '한국어',           'ko-KR', 'Korean'],
  ['en', 'English',          'en-US', 'English'],
  ['ja', '日本語',            'ja-JP', 'Japanese'],
  ['zh', '中文(简体)',        'zh-CN', 'Chinese'],
  ['es', 'Español',          'es-ES', 'Spanish'],
  ['fr', 'Français',         'fr-FR', 'French'],
  ['de', 'Deutsch',          'de-DE', 'German'],
  ['vi', 'Tiếng Việt',       'vi-VN', 'Vietnamese'],
  ['ru', 'Русский',          'ru-RU', 'Russian'],
  ['ar', 'العربية',           'ar-SA', 'Arabic'],
  ['id', 'Bahasa Indonesia', 'id-ID', 'Indonesian'],
  ['th', 'ไทย',               'th-TH', 'Thai'],
  ['pt', 'Português',        'pt-BR', 'Portuguese'],
  ['hi', 'हिन्दी',              'hi-IN', 'Hindi'],
  ['it', 'Italiano',         'it-IT', 'Italian'],
  ['tr', 'Türkçe',           'tr-TR', 'Turkish'],
]

const bcp47 = code => (LANGS.find(l => l[0] === code) || LANGS[1])[2]
// 자막 꼬리표처럼 좁은 곳에는 영어 이름을 쓴다
const langName = code => (LANGS.find(l => l[0] === code) || [code, code, '', code])[3]

/* ───────── 백엔드 주소 ─────────
   프론트엔드는 정적 호스팅(예: Cloudflare Pages)에 올리고, 번역·시그널링
   백엔드는 Ollama 가 깔린 내 머신에서 돌리는 구성을 지원한다.
   빈 값이면 이 페이지를 준 서버를 그대로 쓴다(로컬 개발). */
// 정적 호스팅에 올라간 페이지의 기본 백엔드. 고정 터널이라 주소가 바뀌지 않는다.
// 로컬 개발(localhost/127.0.0.1)에서는 페이지를 준 서버를 그대로 쓴다.
const DEFAULT_API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? '' : 'https://translate-api.jangyeonga.com'

const API = {
  get base() {
    const saved = localStorage.getItem('lt.api')
    if (saved === null) return DEFAULT_API
    return saved.trim().replace(/\/+$/, '')
  },
  set base(v) {
    const clean = String(v || '').trim().replace(/\/+$/, '')
    if (clean) localStorage.setItem('lt.api', clean)
    else localStorage.removeItem('lt.api')
  },
  url(path) { return this.base ? this.base + path : path },
  wsUrl() {
    const b = this.base
    if (!b) return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
    return b.replace(/^http/, 'ws') + '/ws'
  },
}

const S = {
  ws: null, pc: null,
  myId: null, peerId: null,
  room: '', myName: 'Me', myLang: 'ko',
  peerName: 'Caller', peerLang: 'en',
  model: null,
  recog: null, wantListen: false, running: false, ttsBusy: false,
  localStream: null, seq: 0,
  pendingCandidates: [], signalQueue: Promise.resolve(),
  myNum: '', dialing: null, incoming: null, callStart: 0, timer: null,
  wsRetry: 0, wsTimer: null, wantWS: true,
}

/* ───────── 내 번호 ─────────
   브라우저마다 고정된 6자리. 상대가 이 번호로 전화를 건다. */

function myNumber() {
  let n = localStorage.getItem('lt.num')
  if (!/^\d{6}$/.test(n || '')) {
    n = String(Math.floor(100000 + Math.random() * 900000))
    localStorage.setItem('lt.num', n)
  }
  return n
}

/* ───────── 홈 (대기·걸기) ───────── */

function initHome() {
  const sel = $('#mylang')
  sel.innerHTML = LANGS
    .map(([c, native, , en]) => `<option value="${c}">${en === native ? en : `${en} (${native})`}</option>`)
    .join('')
  sel.value = (navigator.language || 'ko').slice(0, 2).toLowerCase()
  if (!LANGS.some(l => l[0] === sel.value)) sel.value = 'ko'
  const savedLang = localStorage.getItem('lt.lang')
  if (savedLang && LANGS.some(l => l[0] === savedLang)) sel.value = savedLang

  localStorage.removeItem('lt.model')   // 예전 저장값이 서버 기본값을 덮어쓰던 문제
  S.myNum = myNumber()
  $('#myId').textContent = S.myNum
  $('#name').value = localStorage.getItem('lt.name') || ''

  // 링크에 ?api= 가 실려 있으면 그것이 최신이다 — 저장해서 낡은 주소를 덮어쓴다.
  // 그러지 않으면 예전에 저장된 죽은 터널 주소를 계속 물고 있게 된다.
  const qApi = new URLSearchParams(location.search).get('api')
  if (qApi !== null) API.base = qApi

  const apiInput = $('#api')
  apiInput.placeholder = DEFAULT_API || 'http://localhost:8080'
  apiInput.value = API.base
  apiInput.onchange = () => { API.base = apiInput.value; loadHealth(); connectWS() }

  sel.onchange = () => { localStorage.setItem('lt.lang', sel.value); register() }
  $('#model').onchange = register
  $('#name').onchange = () => { localStorage.setItem('lt.name', $('#name').value.trim()); register() }

  $('#copyId').onclick = async ev => {
    try { await navigator.clipboard.writeText(S.myNum) } catch {}
    ev.currentTarget.textContent = 'Copied'
    setTimeout(() => { ev.currentTarget.textContent = 'Copy' }, 1400)
  }

  $('#dial').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6) }
  $('#dial').onkeydown = e => { if (e.key === 'Enter') placeCall() }
  $('#callBtn').onclick = placeCall

  $('#acceptBtn').onclick = acceptCall
  $('#rejectBtn').onclick = () => { sendWS({ type: 'reject', to: S.incoming.from }); endRinging() }
  $('#cancelBtn').onclick = () => { sendWS({ type: 'cancel', to: S.dialing }); endRinging() }

  // 번호로 바로 걸 수 있는 링크: ?call=123456
  const q = new URLSearchParams(location.search)
  if (q.get('call')) $('#dial').value = q.get('call').replace(/\D/g, '').slice(0, 6)

  loadHealth()
  connectWS()
}

const showScreen = id => {
  for (const s of ['home', 'ring', 'call']) $('#' + s).classList.toggle('hidden', s !== id)
}

const sendWS = msg => { if (S.ws?.readyState === 1) S.ws.send(JSON.stringify(msg)) }

function register() {
  S.myName = $('#name').value.trim() || 'Caller'
  S.myLang = $('#mylang').value
  S.model = $('#model').value || undefined
  localStorage.setItem('lt.model2', $('#model').value)
  sendWS({ type: 'register', id: S.myNum, name: S.myName, lang: S.myLang })
}

async function placeCall() {
  const to = $('#dial').value.trim()
  if (!/^\d{6}$/.test(to)) return $('#dial').focus()
  if (to === S.myNum) return alert('You cannot call your own number.')

  // 마이크는 걸기 전에 확보한다 — 받고 나서 거부되면 통화가 깨진다
  if (!await ensureMic()) return

  register()
  S.dialing = to
  sendWS({ type: 'call', to })

  $('#ringName').textContent = to
  $('#ringState').textContent = 'Calling…'
  $('#acceptBtn').classList.add('hidden')
  $('#rejectBtn').classList.add('hidden')
  $('#cancelBtn').classList.remove('hidden')
  showScreen('ring')
  ringtone.start('outgoing')
}

async function acceptCall() {
  if (!await ensureMic()) return
  ringtone.stop()
  sendWS({ type: 'accept', to: S.incoming.from })
}

function onIncomingCall(m) {
  S.incoming = m
  $('#ringName').textContent = `${m.name} (${m.from})`
  $('#ringState').textContent = `${langName(m.lang)} · Incoming call`
  $('#acceptBtn').classList.remove('hidden')
  $('#rejectBtn').classList.remove('hidden')
  $('#cancelBtn').classList.add('hidden')
  showScreen('ring')
  ringtone.start('incoming')
}

function endRinging(message) {
  ringtone.stop()
  S.dialing = S.incoming = null
  showScreen('home')
  if (message) {
    const h = $('#health')
    h.className = 'health bad'
    h.textContent = message
  }
}

async function ensureMic() {
  if (S.localStream) return true
  try {
    S.localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    })
    return true
  } catch (err) {
    alert(`The microphone is unavailable: ${err.message}\n\nIt only works over HTTPS (or on localhost).`)
    return false
  }
}

/* 벨소리 — 외부 파일 없이 만든다 */
const ringtone = {
  ctx: null, timer: null,
  start(kind) {
    this.stop()
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)()
      this.ctx.resume?.()
    } catch { return }
    const beep = () => {
      const t = this.ctx.currentTime
      const freqs = kind === 'incoming' ? [880, 1040] : [440]
      freqs.forEach((f, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain()
        o.frequency.value = f
        o.connect(g); g.connect(this.ctx.destination)
        const at = t + i * 0.28
        g.gain.setValueAtTime(0, at)
        g.gain.linearRampToValueAtTime(kind === 'incoming' ? 0.18 : 0.08, at + 0.03)
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.25)
        o.start(at); o.stop(at + 0.26)
      })
    }
    beep()
    this.timer = setInterval(beep, kind === 'incoming' ? 1400 : 2600)
  },
  stop() { clearInterval(this.timer); this.timer = null },
}

async function loadHealth() {
  const box = $('#health')
  const modelSel = $('#model')
  try {
    const r = await fetch(API.url('/api/health'))
    const h = await r.json()
    if (!h.ok) throw new Error(h.error || 'unreachable')

    box.className = 'health good'
    box.textContent = `✅ Ollama connected · ${h.models.length} models`

    // 빈 값 = 서버가 고르게 둔다. 예전에 저장된 선택이 서버 기본값을 덮어쓰지 않도록
    // 기본은 항상 '자동' 이고, 직접 고른 경우에만 그 값을 쓴다.
    const list = h.models.length ? h.models : [h.defaultModel]
    modelSel.innerHTML =
      `<option value="">Auto (recommended — ${h.defaultModel})</option>` +
      list.map(m => `<option value="${m}">${m}</option>`).join('')
    const saved = localStorage.getItem('lt.model2') || ''
    modelSel.value = list.includes(saved) ? saved : ''
  } catch (err) {
    box.className = 'health bad'
    const where = API.base || 'the server that served this page'
    const msg = String(err.message || err)

    // 사이트 주소를 번역 서버로 넣은 경우가 흔하다. HTML 이 돌아오면 그 신호다.
    const gotHtml = /Unexpected token '<'|<!DOCTYPE/i.test(msg)
    const detail = gotHtml
      ? 'That address serves a web page, not a translation server. It is probably this site&rsquo;s own address.'
      : 'Check that <code>npm start</code> and <code>ollama serve</code> are running on the backend.'

    box.innerHTML = `⚠️ Cannot reach the translation server — <b>${escapeHtml(where)}</b><br>`
      + `<span style="opacity:.8">${escapeHtml(msg)}</span><br>${detail}`

    // 기본값과 다른 주소를 쓰고 있다면, 되돌아올 버튼을 준다.
    // 잘못 넣은 주소에 갇히지 않게 하는 것이 요점이다.
    if (API.base !== DEFAULT_API) {
      const b = document.createElement('button')
      b.className = 'reset-api'
      b.textContent = DEFAULT_API
        ? `Use default (${DEFAULT_API.replace(/^https?:\/\//, '')})`
        : 'Use this site’s own server'
      b.onclick = () => {
        localStorage.removeItem('lt.api')
        $('#api').value = DEFAULT_API
        loadHealth()
        connectWS()
      }
      box.appendChild(document.createElement('br'))
      box.appendChild(b)
    }
    modelSel.innerHTML = '<option value="">(none)</option>'
  }
}

/* ───────── 시그널링 ───────── */

function connectWS() {
  clearTimeout(S.wsTimer)
  S.wantWS = true
  try { S.ws?.close() } catch {}

  let ws
  try { ws = new WebSocket(API.wsUrl()) }
  catch { return scheduleReconnect() }
  S.ws = ws

  ws.onopen = () => {
    S.wsRetry = 0
    setOnline(true)
    register()
    if (S.room) ws.send(JSON.stringify({ type: 'join', room: S.room, lang: S.myLang, name: S.myName }))
  }

  ws.onmessage = async ev => {
    const m = JSON.parse(ev.data)

    /* 전화 교환 */
    if (m.type === 'incoming')  return onIncomingCall(m)
    if (m.type === 'ringing')   { $('#ringName').textContent = `${m.name} (${m.to})`; return }
    if (m.type === 'rejected')  return endRinging('They declined the call.')
    if (m.type === 'canceled')  return endRinging()
    if (m.type === 'call-failed') {
      const why = { offline: 'That number is not online.', busy: 'That number is on another call.', gone: 'The connection to them was lost.' }
      return endRinging(why[m.reason] || 'The call could not be placed.')
    }
    if (m.type === 'accepted') {
      ringtone.stop()
      S.room = m.room
      S.peerName = m.peer.name
      S.peerLang = m.peer.lang
      enterCall()
      ws.send(JSON.stringify({ type: 'join', room: S.room, lang: S.myLang, name: S.myName }))
      return
    }

    /* 방 안에서의 미디어 연결 */
    if (m.type === 'room-full') { alert('The call could not be started.'); return hangup() }

    if (m.type === 'joined') {
      S.myId = m.id
      if (m.peers.length) {           // 내가 두 번째 → 내가 offer
        setPeer(m.peers[0])
        await makeCall(true)
      }
      return
    }

    if (m.type === 'peer-join') {     // 상대가 들어옴 → 상대가 offer를 보냄
      setPeer(m)
      await makeCall(false)
      return
    }

    if (m.type === 'peer-leave') {
      $('#peerLabel').textContent = 'They hung up'
      $('#statusDot').classList.remove('on')
      S.peerId = null
      closePC()
      setTimeout(hangup, 1500)
      return
    }

    if (m.type === 'signal') return handleSignal(m)
    if (m.type === 'sub') return onIncomingSubtitle(m)
  }

  ws.onclose = () => {
    setOnline(false)
    if (ws === S.ws) scheduleReconnect()
  }
  ws.onerror = () => { try { ws.close() } catch {} }
}

// 터널이나 네트워크가 잠깐 끊겨도 전화를 받을 수 있어야 한다.
// 다시 붙을 때까지 간격을 늘려가며 재시도한다.
function scheduleReconnect() {
  if (!S.wantWS) return
  clearTimeout(S.wsTimer)
  const wait = Math.min(1000 * 2 ** S.wsRetry++, 15000)
  S.wsTimer = setTimeout(connectWS, wait)
}

function setOnline(on) {
  $('#statusDot')?.classList.toggle('on', on)
  const badge = $('#online')
  if (!badge) return
  badge.textContent = on ? '● Ready' : '○ Connecting…'
  badge.classList.toggle('off', !on)
}

/* 통화 화면 진입 */
function enterCall() {
  S.dialing = S.incoming = null
  showScreen('call')
  $('#peerLabel').textContent = S.peerName
  $('#log').innerHTML = ''
  $('#log').innerHTML = '<div class="empty"><div class="empty-emoji">💬</div>Start speaking and subtitles will appear here.</div>'

  initCallUI()
  S.localStream?.getAudioTracks().forEach(t => { t.enabled = true })
  S.wantListen = true
  setMicUI('listening')
  startRecognition()

  S.callStart = Date.now()
  clearInterval(S.timer)
  S.timer = setInterval(() => {
    const t = Math.floor((Date.now() - S.callStart) / 1000)
    $('#roomLabel').textContent =
      `${langName(S.peerLang)} · ${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  }, 1000)
}

function setPeer(p) {
  S.peerId = p.id
  S.peerName = p.name || S.peerName
  S.peerLang = p.lang || S.peerLang
  $('#peerLabel').textContent = S.peerName
  $('#statusDot').classList.add('on')
}

const signal = data => S.ws?.send(JSON.stringify({ type: 'signal', to: S.peerId, data }))

async function makeCall(isCaller) {
  closePC()
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
  })
  S.pc = pc

  S.localStream.getTracks().forEach(t => pc.addTrack(t, S.localStream))
  pc.ontrack = e => { $('#remoteAudio').srcObject = e.streams[0]; applyAudioPrefs() }
  pc.onicecandidate = e => { if (e.candidate) signal({ candidate: e.candidate }) }

  if (isCaller) {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    signal({ sdp: pc.localDescription })
  }
}

// 시그널 처리는 반드시 직렬화한다. 그러지 않으면 sdp 를 await 하는 사이에
// 다음 candidate 핸들러가 끼어들어 remoteDescription 이 없는 상태로 addIceCandidate 가 터진다.
function handleSignal({ data }) {
  S.signalQueue = S.signalQueue.then(() => applySignal(data)).catch(err => console.warn('signal', err))
}

async function applySignal(data) {
  const pc = S.pc
  if (!pc) return

  if (data.sdp) {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
    for (const c of S.pendingCandidates.splice(0)) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch (err) { console.warn('ice', err) }
    }
    if (data.sdp.type === 'offer') {
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      signal({ sdp: pc.localDescription })
    }
    return
  }

  if (data.candidate) {
    // remote description 이 아직 없으면 버리지 말고 모아둔다
    if (!pc.remoteDescription || !pc.remoteDescription.type) {
      S.pendingCandidates.push(data.candidate)
      return
    }
    try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)) } catch (err) { console.warn('ice', err) }
  }
}

function closePC() {
  S.pc?.close()          // 로컬 트랙은 재협상에 재사용하므로 여기서 stop 하지 않는다
  S.pc = null
  S.pendingCandidates = []
  S.signalQueue = Promise.resolve()
}

/* ───────── 음성 인식 (STT) ───────── */

function startRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) {
    noteSubtitleProblem('This browser has no speech recognition, so there will be no subtitles. Use Chrome or Edge. The call itself still works.')
    return
  }

  const r = new SR()
  r.lang = bcp47(S.myLang)
  r.continuous = true
  r.interimResults = true
  S.recog = r

  r.onstart = () => { S.running = true; $('#micBtn').classList.add('on'); $('#micBtn').classList.remove('off') }

  r.onresult = e => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      const text = res[0].transcript.trim()
      if (res.isFinal) { if (text) handleFinal(text) }
      else interim += text + ' '
    }
    setLive(interim.trim())
  }

  r.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      noteSubtitleProblem('Microphone access was denied, so subtitles cannot be made. Allow it from the lock icon in the address bar.')
    }
  }

  // continuous 라도 브라우저가 주기적으로 끊는다 → 자동 재시작
  r.onend = () => {
    S.running = false
    $('#micBtn').classList.remove('on')
    if (S.wantListen && !S.ttsBusy) setTimeout(safeStart, 250)
  }

  S.wantListen = true
  safeStart()
}

function safeStart() {
  if (!S.recog || S.running || !S.wantListen) return
  try { S.recog.start() } catch {}
}

function pauseRecognition() {
  if (!S.recog || !S.running) return
  try { S.recog.stop() } catch {}
}

// state: 'listening' | 'muted' | 'denied' | 'unsupported'
function setMicUI(state) {
  const btn = $('#micBtn')
  const label = { listening: 'Mute', muted: 'Unmute' }[state]
  $('#micState').textContent = label
  btn.querySelector('.ctrl-icon').textContent = state === 'listening' ? '🎤' : '🔇'
  btn.classList.toggle('muted', state !== 'listening')
}

// 자막(음성 인식)이 안 되는 브라우저에서도 목소리는 끌 수 있어야 한다.
// 그래서 "자막을 만들 수 있는가" 와 "지금 말하고 있는가" 를 분리해 둔다.
function noteSubtitleProblem(msg) {
  S.subtitlesOff = true
  showBanner(msg)
}

function toggleMic() {
  S.wantListen = !S.wantListen
  // 자막만 멈추는 게 아니라 상대에게 가는 음성도 함께 끊는다
  S.localStream?.getAudioTracks().forEach(t => { t.enabled = S.wantListen })
  if (S.wantListen) { setMicUI('listening'); safeStart() }
  else { setMicUI('muted'); pauseRecognition(); setLive('') }
}

/* ───────── 서버 호출 ─────────
   응답을 곧바로 res.json() 하면 본문이 비었을 때(404/405 등)
   "Unexpected end of JSON input" 이 떠서 진짜 원인이 가려진다. */

/* 번역을 조각조각 받아 말풍선을 채운다.
   정확한 모델은 2초 넘게 걸리지만, 글자가 흐르면 기다림이 훨씬 짧게 느껴진다. */
async function streamTranslate(id, text, target) {
  let res
  try {
    res = await fetch(API.url('/api/translate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from: S.myLang, to: target, model: S.model, stream: true }),
    })
  } catch {
    throw new Error(`Cannot reach the translation server — ${API.base || location.origin}`)
  }

  if (!res.ok || !res.body) {
    const raw = await res.text().catch(() => '')
    let data = null
    try { data = raw ? JSON.parse(raw) : null } catch {}
    if (!API.base && (res.status === 404 || res.status === 405)) {
      throw new Error('No translation server is set. Add its address from the ⋯ menu above.')
    }
    throw new Error(data?.error || `Translation server error ${res.status}`)
  }

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = '', shown = '', finalText = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      let j
      try { j = JSON.parse(line) } catch { continue }
      if (j.error) throw new Error(j.error)
      if (j.delta) { shown += j.delta; setForeign(id, shown, false, true) }
      if (j.done) finalText = j.translation
    }
  }

  const out = (finalText ?? shown).trim()
  if (!out) throw new Error('The translation server returned an empty response.')
  return out
}

async function apiPost(path, body) {
  let res
  try {
    res = await fetch(API.url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(`Cannot reach the translation server — ${API.base || location.origin}`)
  }

  const raw = await res.text()
  let data = null
  try { data = raw ? JSON.parse(raw) : null } catch {}

  if (!res.ok) {
    // 주소를 안 넣어 정적 호스팅으로 간 경우가 가장 흔하다
    if (!API.base && (res.status === 404 || res.status === 405)) {
      throw new Error('No translation server is set. Add its address from the ⋯ menu above.')
    }
    throw new Error(data?.error || `Translation server error ${res.status}`)
  }
  if (!data) throw new Error('The translation server returned an empty response.')
  return data
}

/* ───────── 번역 파이프라인 ─────────
   말풍선은 항상 "위 = 상대 언어, 아래 = 내 언어" 로 통일한다.
   내가 말하면 위가 번역문, 상대가 말하면 위가 상대의 원문이 된다. */

async function handleFinal(text) {
  setLive('')
  const id = `m${++S.seq}`
  const target = S.peerLang || 'en'

  addMessage({
    id, side: 'me', name: S.myName,
    foreign: null, foreignLang: target,
    native: text, nativeLang: S.myLang,
  })

  translateAndSend(id, text, target)
}

async function translateAndSend(id, text, target) {
  // 서로 같은 언어를 쓰면 번역할 것이 없다 — 그냥 그대로 주고받는다
  if (target === S.myLang) {
    setForeign(id, text)
    if (S.peerId) {
      S.ws.send(JSON.stringify({
        type: 'sub', to: S.peerId,
        original: text, translation: text,
        fromLang: S.myLang, toLang: target, name: S.myName,
      }))
    }
    return
  }

  setForeign(id, 'Translating…', false, true)
  try {
    const translation = await streamTranslate(id, text, target)

    setForeign(id, translation)
    fillPronunciation(id, translation, target)
    clearBanner()

    if (S.peerId) {
      S.ws.send(JSON.stringify({
        type: 'sub', to: S.peerId,
        original: text, translation,
        fromLang: S.myLang, toLang: target, name: S.myName,
      }))
    }
  } catch (err) {
    setForeign(id, err.message, true)
    addRetry(id, () => translateAndSend(id, text, target))
    showBanner(err.message)
  }
}

function onIncomingSubtitle(m) {
  const id = `m${++S.seq}`
  addMessage({
    id, side: 'them', name: m.name || S.peerName,
    foreign: m.original, foreignLang: m.fromLang,     // 상대가 실제로 한 말
    native: m.translation, nativeLang: m.toLang,      // 내 언어로 번역된 말
  })
  fillPronunciation(id, m.original, m.fromLang)
}

// 발음은 사전 기반이라 빠르지만, 번역 표시를 막지 않도록 비동기로 채운다
async function fillPronunciation(id, text, lang) {
  if (!text || lang === S.myLang) return
  try {
    // 내가 읽을 수 있는 문자로 적어달라고 한다 (한글 / 로마자 / 가타카나)
    const d = await apiPost('/api/pronounce', { text, lang, script: S.myLang })
    if (!d.pronunciation) return
    const el = document.getElementById(id)?.querySelector('.pron')
    if (el) el.textContent = d.pronunciation
  } catch { /* 발음은 부가 정보라 실패해도 조용히 넘어간다 */ }
}

/* ───────── UI ───────── */

function initCallUI() {
  $('#micBtn').onclick = toggleMic
  $('#hangup').onclick = hangup
  $('#rawOn').onchange = applyAudioPrefs
  $('#vol').oninput = applyAudioPrefs

  // 타자로도 보낼 수 있게. 시끄러운 곳이나 발음이 잘 안 잡힐 때 쓰는 길을 열어 둔다.
  const chat = $('#chat')
  const sendChat = () => {
    const t = chat.value.trim()
    if (!t) return
    chat.value = ''
    handleFinal(t)
  }
  $('#send').onclick = sendChat
  chat.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) sendChat() }
  // 입력 중에는 내 목소리가 자막으로 끼어들지 않게 인식을 잠시 멈춘다
  chat.onfocus = () => { if (S.wantListen) pauseRecognition() }
  chat.onblur = () => { if (S.wantListen) safeStart() }

  const sheet = $('#sheet')
  const apiIn = $('#api2')
  apiIn.value = API.base
  apiIn.onchange = async () => {
    API.base = apiIn.value
    clearBanner()
    try { await apiPost('/api/pronounce', { text: 'test', lang: 'en' }); showBanner('Connected to the translation server.') ; setTimeout(clearBanner, 2000) }
    catch (e) { showBanner(e.message) }
  }
  $('#menuBtn').onclick = () => { apiIn.value = API.base; sheet.classList.remove('hidden') }
  $('#bannerFix').onclick = () => { apiIn.value = API.base; sheet.classList.remove('hidden'); apiIn.focus() }
  $('#sheetBg').onclick = $('#sheetClose').onclick = () => sheet.classList.add('hidden')

}

function applyAudioPrefs() {
  const a = $('#remoteAudio')
  a.muted = !$('#rawOn').checked
  a.volume = $('#vol').value / 100
}


function addMessage({ id, side, name, foreign, foreignLang, native, nativeLang }) {
  const log = $('#log')
  log.querySelector('.empty')?.remove()

  const sameLang = foreignLang === nativeLang

  const el = document.createElement('div')
  el.className = `msg ${side}`
  el.id = id
  el.dataset.lang = foreignLang
  el.innerHTML = sameLang
    ? `<div class="bubble">
         <div class="foreign ${foreign ? '' : 'pending'}">${escapeHtml(foreign || native || '')}</div>
       </div>`
    : `<div class="bubble">
        <div class="foreign ${foreign ? '' : 'pending'}">${foreign ? escapeHtml(foreign) : 'Translating…'}</div>
        <div class="pron"></div>
        <div class="divider"></div>
        <div class="native">${escapeHtml(native || '')}</div>
        <div class="bubble-foot">
          <span class="tag">${side === 'me'
            ? `${langName(nativeLang)} → ${langName(foreignLang)}`
            : `${langName(foreignLang)} → ${langName(nativeLang)}`}</span>
        </div>
      </div>`

  log.appendChild(el)
  log.scrollTop = log.scrollHeight
}

function setForeign(id, text, failed = false, pending = false) {
  const el = document.getElementById(id)?.querySelector('.foreign')
  if (!el) return
  el.className = `foreign${failed ? ' failed' : ''}${pending ? ' pending' : ''}`
  el.textContent = text
  document.getElementById(id)?.querySelector('.retry')?.remove()
  $('#log').scrollTop = $('#log').scrollHeight
}

// 실패한 말은 버리지 않는다 — 서버 주소를 고친 뒤 그대로 다시 보낼 수 있게 한다
function addRetry(id, fn) {
  const foot = document.getElementById(id)?.querySelector('.bubble-foot')
  if (!foot || foot.querySelector('.retry')) return
  const b = document.createElement('button')
  b.className = 'replay retry'
  b.textContent = '↻ Retry'
  b.onclick = fn
  foot.prepend(b)
}

function showBanner(msg) {
  const el = $('#banner')
  el.querySelector('span').textContent = msg
  el.classList.remove('hidden')
}
const clearBanner = () => $('#banner').classList.add('hidden')

function setLive(text) {
  const bar = $('#liveBar')
  if (!text) return bar.classList.add('hidden')
  bar.classList.remove('hidden')
  $('#liveText').textContent = text
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function hangup() {
  S.wantListen = false
  try { S.recog?.stop() } catch {}
  ringtone.stop()
  clearInterval(S.timer)
  closePC()

  // 마이크 트랙은 살려 둔다 — 다음 통화에서 권한을 다시 묻지 않게 한다
  S.room = ''
  S.peerId = null
  S.peerName = 'Caller'
  clearBanner()
  $('#sheet').classList.add('hidden')
  $('#dial').value = ''
  showScreen('home')
  connectWS()          // 통화 상태를 풀고 다시 대기 등록
}

initHome()
