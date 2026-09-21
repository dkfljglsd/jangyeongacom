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
    const r = await fetch('/api/health')
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
    box.innerHTML = `⚠️ Ollama에 연결할 수 없습니다 (${String(err.message || err)}).<br>서버에서 <code>ollama serve</code> 실행 후 새로고침하세요. 통화는 되지만 번역이 실패합니다.`
    modelSel.innerHTML = '<option value="">(없음)</option>'
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

  history.replaceState(null, '', `?room=${encodeURIComponent(room)}`)
  $('#lobby').classList.add('hidden')
  $('#call').classList.remove('hidden')
  $('#roomLabel').textContent = room

  initCallUI()
  connectWS()
  startRecognition()
}

/* ───────── 시그널링 ───────── */

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}/ws`)
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
  $('#peerLabel').textContent = `${S.peerName} · ${langName(S.peerLang)}`
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
  const label = { listening: '듣는 중', muted: '음소거', denied: '권한 거부됨', unsupported: '지원 안 됨' }[state]
  btn.querySelector('span').textContent = label
  btn.classList.toggle('off', state !== 'listening')
  if (state !== 'listening') btn.classList.remove('on')
  btn.disabled = state === 'denied' || state === 'unsupported'
}

function toggleMic() {
  S.wantListen = !S.wantListen
  if (S.wantListen) { setMicUI('listening'); safeStart() }
  else { setMicUI('muted'); pauseRecognition(); setLive('') }
}

/* ───────── 번역 파이프라인 ───────── */

async function handleFinal(text) {
  setLive('')
  const id = `m${++S.seq}`
  addMessage({ id, side: 'me', name: S.myName, original: text, translation: null, fromLang: S.myLang, toLang: S.peerLang })

  if (!S.peerId) { setTranslation(id, '(상대 없음 — 번역만 대기)', true); return }

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from: S.myLang, to: S.peerLang, model: S.model }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

    setTranslation(id, data.translation)
    S.ws?.send(JSON.stringify({
      type: 'sub', to: S.peerId,
      original: text, translation: data.translation,
      fromLang: S.myLang, toLang: S.peerLang, name: S.myName,
    }))
  } catch (err) {
    setTranslation(id, `번역 실패: ${err.message}`, true)
  }
}

function onIncomingSubtitle(m) {
  const id = `m${++S.seq}`
  addMessage({
    id, side: 'them', name: m.name || S.peerName,
    original: m.original, translation: m.translation,
    fromLang: m.fromLang, toLang: m.toLang,
  })
  if ($('#ttsOn').checked) speak(m.translation, m.toLang)
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
  $('#copyLink').onclick = async () => {
    await navigator.clipboard.writeText(location.href)
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

function addMessage({ id, side, name, original, translation, fromLang, toLang }) {
  const log = $('#log')
  log.querySelector('.empty')?.remove()

  const el = document.createElement('div')
  el.className = `msg ${side}`
  el.id = id
  el.innerHTML = `
    <div class="meta"><b>${escapeHtml(name)}</b><span class="tag">${langName(fromLang)} → ${langName(toLang)}</span></div>
    <div class="tr ${translation ? '' : 'pending'}">${translation ? escapeHtml(translation) : '번역 중…'}</div>
    <div class="or">${escapeHtml(original)}</div>`
  log.appendChild(el)
  log.scrollTop = log.scrollHeight
}

function setTranslation(id, text, failed = false) {
  const el = document.getElementById(id)?.querySelector('.tr')
  if (!el) return
  el.className = `tr${failed ? ' failed' : ''}`
  el.textContent = text
  $('#log').scrollTop = $('#log').scrollHeight
}

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
