/* 두 모델을 같은 문장으로 나란히 비교 (콜드 경로 지연 + 번역 결과)
   사용: node compare-models.mjs [modelA] [modelB] */

const A = process.argv[2] || 'qwen2.5:1.5b-instruct'
const B = process.argv[3] || 'qwen2.5:7b-instruct'
const OLLAMA = 'http://127.0.0.1:11434'

// 서버 캐시를 우회해 Ollama 를 직접 때린다 (server.js 와 동일한 프롬프트)
const LANG_NAMES = { ko:'Korean', en:'English', ja:'Japanese', zh:'Chinese (Simplified)' }

const CASES = [
  { from:'ko', to:'en', text:'여보세요 지금 통화 괜찮으세요', check:'인사/통화 가능 여부' },
  { from:'ko', to:'en', text:'다음 주 화요일 오후 세시에 회의 가능하신가요', check:'화요일=Tuesday, 3시' },
  { from:'ko', to:'en', text:'원자력연구원 장영아 연구원입니다 보고서 초안 보내드렸습니다', check:'고유명사/직함' },
  { from:'ko', to:'en', text:'냉각재 유량이 초당 12.5리터로 측정됐습니다', check:'숫자/단위 보존' },
  { from:'ko', to:'ja', text:'자료 검토하고 내일 오전까지 회신드리겠습니다', check:'일본어 경어' },
  { from:'en', to:'ko', text:"sorry could you repeat that I didn't catch the last part", check:'되묻기 표현' },
  { from:'en', to:'ko', text:'we need the KNS abstract submitted by August 20th', check:'KNS 유지, 8월 20일' },
  { from:'en', to:'ko', text:'the model is running locally so nothing leaves our network', check:'영단어 잔존 여부' },
  { from:'en', to:'ko', text:"let's move the review to Friday morning if that works for you", check:'Friday=금요일' },
  { from:'ja', to:'ko', text:'来週の打ち合わせの資料を送っていただけますか', check:'来週=다음 주, 한자 잔존 여부' },
]

const systemPrompt = (from, to) => {
  const src = LANG_NAMES[from] || from, dst = LANG_NAMES[to] || to
  return [
    `You are a live simultaneous interpreter on a phone call.`,
    `Translate the user's utterance from ${src} into ${dst}.`,
    `Rules:`,
    `- Output ONLY the translation. No quotes, no notes, no romanization, no original text.`,
    `- Keep it natural and conversational, as spoken on a call.`,
    `- Preserve names, numbers, units and proper nouns exactly.`,
    `- The input comes from speech recognition and may be fragmentary; translate it as-is without asking questions.`,
    `- If the input is already ${dst}, repeat it unchanged.`,
  ].join('\n')
}

async function translate(model, c) {
  const t0 = performance.now()
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, stream: false, keep_alive: '30m',
      messages: [
        { role: 'system', content: systemPrompt(c.from, c.to) },
        { role: 'user', content: c.text },
      ],
      options: { temperature: 0.2, top_p: 0.9, num_predict: 256 },
    }),
  })
  const ms = performance.now() - t0
  const d = await r.json()
  let out = String(d?.message?.content || '').trim()
  out = out.replace(/^```[\w]*\n?|```$/g, '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  out = out.replace(/^["'“”「『]|["'“”」』]$/g, '').trim()
  return { out, ms, evalCount: d?.eval_count ?? 0 }
}

// 모델 로딩 시간이 첫 요청에 섞이지 않게 워밍업
for (const m of [A, B]) {
  process.stdout.write(`워밍업 ${m} … `)
  const t = performance.now()
  await translate(m, { from:'ko', to:'en', text:'안녕하세요' })
  console.log(`${((performance.now()-t)/1000).toFixed(1)}s`)
}

const stats = { [A]: [], [B]: [] }
console.log('\n' + '═'.repeat(78))

for (const c of CASES) {
  const ra = await translate(A, c)
  const rb = await translate(B, c)
  stats[A].push(ra.ms); stats[B].push(rb.ms)
  console.log(`\n[${c.from}→${c.to}] ${c.text}`)
  console.log(`  확인포인트: ${c.check}`)
  console.log(`  ${A.padEnd(24)} ${String(Math.round(ra.ms)).padStart(5)}ms  ${ra.out}`)
  console.log(`  ${B.padEnd(24)} ${String(Math.round(rb.ms)).padStart(5)}ms  ${rb.out}`)
}

console.log('\n' + '═'.repeat(78))
for (const m of [A, B]) {
  const s = [...stats[m]].sort((x, y) => x - y)
  const p = q => s[Math.min(s.length - 1, Math.floor(s.length * q))]
  console.log(`${m.padEnd(24)} 중앙값 ${Math.round(p(0.5))}ms · p90 ${Math.round(p(0.9))}ms · 최대 ${Math.round(s.at(-1))}ms`)
}
