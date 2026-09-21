/* 동시통역 통화 — WebRTC 음성 + Web Speech STT + Ollama 번역 + TTS */

const $ = s => document.querySelector(s)

const LANGS = [
  ['ko', '한국어',       'ko-KR'],
  ['en', 'English',      'en-US'],
  ['ja', '日本語',        'ja-JP'],
  ['zh', '中文(简体)',    'zh-CN'],
  ['es', 'Español',      'es-ES'],
  ['fr', 'Français',     'fr-FR'],
  ['de', 'Deutsch',      'de-DE'],
  ['vi', 'Tiếng Việt',   'vi-VN'],
  ['ru', 'Русский',      'ru-RU'],
  ['ar', 'العربية',       'ar-SA'],
  ['id', 'Bahasa Indonesia', 'id-ID'],
  ['th', 'ไทย',           'th-TH'],
  ['pt', 'Português',    'pt-BR'],
  ['hi', 'हिन्दी',          'hi-IN'],
  ['it', 'Italiano',     'it-IT'],
  ['tr', 'Türkçe',       'tr-TR'],
]
const bcp47 = code => (LANGS.find(l => l[0] === code) || LANGS[1])[2]
const langName = code => (LANGS.find(l => l[0] === code) || [code, code])[1]

/* ───────── 백엔드 주소 ─────────
   프론트엔드는 정적 호스팅(예: Cloudflare Pages)에 올리고, 번역·시그널링
   백엔드는 Ollama 가 깔린 내 머신에서 돌리는 구성을 지원한다.
   빈 값이면 이 페이지를 준 서버를 그대로 쓴다(로컬 개발). */
const API = {
  get base() {
    const q = new URLSearchParams(location.search).get('api')
    if (q !== null) return q.trim().replace(/\/+$/, '')
    return (localStorage.getItem('lt.api') || '').trim().replace(/\/+$/, '')
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
  room: '', myName: '나', myLang: 'ko',
  peerName: '상대방', peerLang: 'en',
  model: null,
  recog: null, wantListen: false, running: false, ttsBusy: false,
  localStream: null, seq: 0,
  pendingCandidates: [], signalQueue: Promise.resolve(),
}

/* ───────── 로비 ───────── */

function initLobby() {
  const sel = $('#mylang')
  sel.innerHTML = LANGS.map(([c, n]) => `<option value="${c}">${n}</option>`).join('')
  sel.value = (navigator.language || 'ko').slice(0, 2).toLowerCase()
  if (!LANGS.some(l => l[0] === sel.value)) sel.value = 'ko'

  const params = new URLSearchParams(location.search)
  $('#room').value = params.get('room') || ''
  $('#name').value = localStorage.getItem('lt.name') || ''
  if (!$('#room').value) $('#room').value = randomRoom()

  const apiInput = $('#api')
  apiInput.value = API.base
  apiInput.onchange = () => { API.base = apiInput.value; loadHealth() }

  $('#dice').onclick = () => { $('#room').value = randomRoom() }
  $('#join').onclick = start
  $('#room').onkeydown = e => { if (e.key === 'Enter') start() }

  loadHealth()
}

const randomRoom = () => {
  const a = ['blue', 'warm', 'quiet', 'swift', 'clear', 'bright', 'calm']
  const b = ['otter', 'maple', 'comet', 'harbor', 'pine', 'falcon', 'river']
  const p = arr => arr[Math.floor(Math.random() * arr.length)]
  return `${p(a)}-${p(b)}-${Math.floor(Math.random() * 900 + 100)}`
}

async function loadHealth() {
  const box = $('#health')
  const modelSel = $('#model')
  try {
    const r = await fetch(API.url('/api/health'))
    const h = await r.json()
    if (!h.ok) throw new Error(h.error || 'unreachable')

    box.className = 'health good'
    box.textContent = `✅ Ollama 연결됨 · 모델 ${h.models.length}개`

    const list = h.models.length ? h.models : [h.defaultModel]
    modelSel.innerHTML = list.map(m => `<option value="${m}">${m}</option>`).join('')
    const saved = localStorage.getItem('lt.model')
    modelSel.value = list.includes(saved) ? saved : (list.includes(h.defaultModel) ? h.defaultModel : list[0])
  } catch (err) {
    box.className = 'health bad'
    const where = API.base || '이 사이트와 같은 서버'
    box.innerHTML = `⚠️ 번역 서버에 연결할 수 없습니다 — <b>${escapeHtml(where)}</b><br>`
      + `<span style="opacity:.8">${escapeHtml(String(err.message || err))}</span><br>`
      + `백엔드에서 <code>npm start</code> 와 <code>ollama serve</code> 가 떠 있는지 확인하세요.`
    modelSel.innerHTML = '<option value="">(없음)</option>'
    $('.adv')?.setAttribute('open', '')   // 주소를 고칠 수 있게 설정칸을 펼쳐준다
  }
}

/* ───────── 시작 ───────── */

async function start() {
  const room = $('#room').value.trim()
  if (!room) return $('#room').focus()

  S.room = room
  S.myName = $('#name').value.trim() || '나'
  S.myLang = $('#mylang').value
  S.model = $('#model').value || undefined
  API.base = $('#api').value          // ?api= 로 들어온 값도 여기서 저장된다
  localStorage.setItem('lt.name', S.myName)
  if (S.model) localStorage.setItem('lt.model', S.model)

  $('#join').disabled = true
  try {
    S.localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    })
  } catch (err) {
    $('#join').disabled = false
    alert(`마이크를 사용할 수 없습니다: ${err.message}\n\nHTTPS(또는 localhost)에서만 동작합니다.`)
    return
  }

  history.replaceState(null, '', `?room=${encodeURIComponent(room)}`)   // api 는 localStorage 에 있다
  $('#lobby').classList.add('hidden')
  $('#call').classList.remove('hidden')
  $('#roomLabel').textContent = `방 ${room}`

  initCallUI()
  connectWS()
  startRecognition()
}

/* ───────── 시그널링 ───────── */

function connectWS() {
  const ws = new WebSocket(API.wsUrl())
  S.ws = ws

  ws.onopen = () => ws.send(JSON.stringify({ type: 'join', room: S.room, lang: S.myLang, name: S.myName }))

  ws.onmessage = async ev => {
    const m = JSON.parse(ev.data)

    if (m.type === 'room-full') {
      alert('이 방은 이미 2명이 통화 중입니다. 다른 방 이름을 쓰세요.')
      return hangup()
    }

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
      $('#peerLabel').textContent = '상대가 나갔습니다'
      $('#statusDot').classList.remove('on')
      S.peerId = null
      closePC()
      return
    }

    if (m.type === 'signal') return handleSignal(m)
    if (m.type === 'sub') return onIncomingSubtitle(m)
  }

  ws.onclose = () => {
    $('#statusDot').classList.remove('on')
    $('#peerLabel').textContent = '연결이 끊어졌습니다'
  }
}

function setPeer(p) {
  S.peerId = p.id
  S.peerName = p.name || '상대방'
  S.peerLang = p.lang || 'en'
  $('#peerLabel').textContent = S.peerName
  $('#roomLabel').textContent = `${langName(S.peerLang)} · 방 ${S.room}`
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
    setLive('⚠️ 이 브라우저는 음성 인식을 지원하지 않습니다. Chrome / Edge를 사용하세요.')
    setMicUI('unsupported')
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
      S.wantListen = false
      setMicUI('denied')
      setLive('⚠️ 마이크 권한이 거부되었습니다. 브라우저 주소창의 자물쇠에서 허용해 주세요.')
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
  const label = {
    listening: '듣는 중 — 말하면 번역됩니다',
    muted: '마이크 꺼짐',
    denied: '마이크 권한이 거부되었습니다',
    unsupported: '이 브라우저는 음성 인식을 지원하지 않습니다',
  }[state]
  $('#micState').textContent = label
  btn.textContent = state === 'listening' ? '🎤' : '🔇'
  btn.classList.toggle('off', state !== 'listening')
  btn.classList.toggle('listening', state === 'listening')
  btn.disabled = state === 'denied' || state === 'unsupported'
}

function toggleMic() {
  S.wantListen = !S.wantListen
  if (S.wantListen) { setMicUI('listening'); safeStart() }
  else { setMicUI('muted'); pauseRecognition(); setLive('') }
}

/* ───────── 서버 호출 ─────────
   응답을 곧바로 res.json() 하면 본문이 비었을 때(404/405 등)
   "Unexpected end of JSON input" 이 떠서 진짜 원인이 가려진다. */

async function apiPost(path, body) {
  let res
  try {
    res = await fetch(API.url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(`번역 서버에 연결할 수 없습니다 — ${API.base || location.origin}`)
  }

  const raw = await res.text()
  let data = null
  try { data = raw ? JSON.parse(raw) : null } catch {}

  if (!res.ok) {
    // 주소를 안 넣어 정적 호스팅으로 간 경우가 가장 흔하다
    if (!API.base && (res.status === 404 || res.status === 405)) {
      throw new Error('번역 서버 주소가 설정되지 않았습니다. 위 ⋯ 메뉴에서 넣어주세요.')
    }
    throw new Error(data?.error || `번역 서버 오류 ${res.status}`)
  }
  if (!data) throw new Error('번역 서버가 빈 응답을 보냈습니다')
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
  setForeign(id, '번역 중…', false, true)
  try {
    const data = await apiPost('/api/translate', { text, from: S.myLang, to: target, model: S.model })

    setForeign(id, data.translation)
    fillPronunciation(id, data.translation, target)
    clearBanner()

    if (S.peerId) {
      S.ws.send(JSON.stringify({
        type: 'sub', to: S.peerId,
        original: text, translation: data.translation,
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
  if ($('#ttsOn').checked) speak(m.translation, m.toLang)
}

// 발음은 사전 기반이라 빠르지만, 번역 표시를 막지 않도록 비동기로 채운다
async function fillPronunciation(id, text, lang) {
  if (!text || lang === S.myLang) return
  try {
    const d = await apiPost('/api/pronounce', { text, lang })
    if (!d.pronunciation) return
    const el = document.getElementById(id)?.querySelector('.pron')
    if (el) el.textContent = d.pronunciation
  } catch { /* 발음은 부가 정보라 실패해도 조용히 넘어간다 */ }
}

/* ───────── TTS ───────── */

function speak(text, lang) {
  if (!('speechSynthesis' in window) || !text) return
  const u = new SpeechSynthesisUtterance(text)
  const tag = bcp47(lang)
  u.lang = tag
  const v = speechSynthesis.getVoices().find(x => x.lang === tag)
    || speechSynthesis.getVoices().find(x => x.lang?.startsWith(lang))
  if (v) u.voice = v
  u.rate = 1.05

  // 스피커로 나가는 번역 음성이 내 마이크로 되돌아 들어오는 것 방지
  u.onstart = () => { S.ttsBusy = true; pauseRecognition(); duck(true) }
  u.onend = u.onerror = () => { S.ttsBusy = false; duck(false); if (S.wantListen) setTimeout(safeStart, 200) }

  speechSynthesis.speak(u)
}

// TTS 동안 상대 원음을 살짝 줄여 겹침을 줄인다
function duck(on) {
  const a = $('#remoteAudio')
  if (!a.srcObject) return
  const base = $('#rawOn').checked ? $('#vol').value / 100 : 0
  a.volume = on ? base * 0.25 : base
}

/* ───────── UI ───────── */

function initCallUI() {
  $('#micBtn').onclick = toggleMic
  $('#hangup').onclick = hangup
  $('#ttsOn').onchange = () => { if (!$('#ttsOn').checked) speechSynthesis.cancel() }
  $('#rawOn').onchange = applyAudioPrefs
  $('#vol').oninput = applyAudioPrefs

  const sheet = $('#sheet')
  const apiIn = $('#api2')
  apiIn.value = API.base
  apiIn.onchange = async () => {
    API.base = apiIn.value
    clearBanner()
    try { await apiPost('/api/pronounce', { text: 'test', lang: 'en' }); showBanner('번역 서버에 연결되었습니다') ; setTimeout(clearBanner, 2000) }
    catch (e) { showBanner(e.message) }
  }
  $('#menuBtn').onclick = () => { apiIn.value = API.base; sheet.classList.remove('hidden') }
  $('#bannerFix').onclick = () => { apiIn.value = API.base; sheet.classList.remove('hidden'); apiIn.focus() }
  $('#sheetBg').onclick = $('#sheetClose').onclick = () => sheet.classList.add('hidden')

  $('#copyLink').onclick = async () => {
    try { await navigator.clipboard.writeText(location.href) } catch {}
    $('#copyLink').textContent = '✅'
    setTimeout(() => { $('#copyLink').textContent = '🔗' }, 1200)
  }
  if ('speechSynthesis' in window) speechSynthesis.getVoices()
}

function applyAudioPrefs() {
  const a = $('#remoteAudio')
  a.muted = !$('#rawOn').checked
  a.volume = $('#vol').value / 100
}

function addMessage({ id, side, name, foreign, foreignLang, native, nativeLang }) {
  const log = $('#log')
  log.querySelector('.empty')?.remove()

  const el = document.createElement('div')
  el.className = `msg ${side}`
  el.id = id
  el.dataset.lang = foreignLang
  el.innerHTML = `
    <div class="avatar ${side === 'me' ? 'me-av' : ''}">${side === 'me' ? '🙂' : '🐣'}</div>
    <div class="bubble">
      <div class="foreign ${foreign ? '' : 'pending'}">${foreign ? escapeHtml(foreign) : '번역 중…'}</div>
      <div class="pron"></div>
      <div class="divider"></div>
      <div class="native">${escapeHtml(native || '')}</div>
      <div class="bubble-foot">
        <button class="replay" title="다시 듣기">
          <span class="wave"><i></i><i></i><i></i><i></i><i></i><i></i></span>재생
        </button>
        <span class="tag">${side === 'me'
          ? `${langName(nativeLang)} → ${langName(foreignLang)}`
          : `${langName(foreignLang)} → ${langName(nativeLang)}`}</span>
      </div>
    </div>`

  el.querySelector('.replay').onclick = () => {
    const f = el.querySelector('.foreign')
    if (!f.classList.contains('pending') && !f.classList.contains('failed')) speak(f.textContent, foreignLang)
  }

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
  b.textContent = '↻ 다시 시도'
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
  speechSynthesis?.cancel()
  closePC()
  S.ws?.close()
  S.localStream?.getTracks().forEach(t => t.stop())
  location.href = location.pathname
}

initLobby()
