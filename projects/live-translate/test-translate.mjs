/* /api/translate 실측: 실제 통화에서 나올 법한 발화로 품질·지연 확인
   사용: node test-translate.mjs [model] [baseUrl] */

const MODEL = process.argv[2] || 'qwen2.5:7b-instruct'
const BASE = process.argv[3] || 'http://127.0.0.1:8080'

// STT 가 뱉는 형태 그대로: 구두점 적고, 끊기고, 숫자/고유명사 섞임
const CASES = [
  { from: 'ko', to: 'en', text: '여보세요 지금 통화 괜찮으세요' },
  { from: 'ko', to: 'en', text: '다음 주 화요일 오후 세시에 회의 가능하신가요' },
  { from: 'ko', to: 'en', text: '원자력연구원 장영아 연구원입니다 보고서 초안 보내드렸습니다' },
  { from: 'ko', to: 'en', text: '냉각재 유량이 초당 12.5리터로 측정됐습니다' },
  { from: 'ko', to: 'ja', text: '자료 검토하고 내일 오전까지 회신드리겠습니다' },
  { from: 'en', to: 'ko', text: "sorry could you repeat that I didn't catch the last part" },
  { from: 'en', to: 'ko', text: 'we need the KNS abstract submitted by August 20th' },
  { from: 'en', to: 'ko', text: 'the model is running locally so nothing leaves our network' },
  { from: 'ja', to: 'ko', text: '来週の打ち合わせの資料を送っていただけますか' },
]

const post = async (body) => {
  const t0 = performance.now()
  const r = await fetch(`${BASE}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const ms = performance.now() - t0
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, ms, data }
}

console.log(`model: ${MODEL}\nserver: ${BASE}\n${'─'.repeat(72)}`)

const times = []
let failed = 0

for (const c of CASES) {
  const { ok, ms, data } = await post({ ...c, model: MODEL })
  if (!ok) { failed++; console.log(`❌ ${c.from}→${c.to}  ${data.error}`); continue }
  times.push(ms)
  console.log(`${c.from}→${c.to}  ${ms.toFixed(0)}ms`)
  console.log(`   원문: ${c.text}`)
  console.log(`   번역: ${data.translation}\n`)
}

// 캐시 동작 확인 (같은 문장 재요청)
const warm = await post({ ...CASES[0], model: MODEL })
console.log('─'.repeat(72))
console.log(`캐시 재요청: ${warm.ms.toFixed(0)}ms  cached=${warm.data.cached}`)

// 같은 언어 → 그대로 반환하는지
const same = await post({ text: '테스트', from: 'ko', to: 'ko', model: MODEL })
console.log(`동일 언어 패스스루: "${same.data.translation}" cached=${same.data.cached}`)

if (times.length) {
  const sorted = [...times].sort((a, b) => a - b)
  const p = q => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
  console.log(`\n지연  중앙값 ${p(0.5).toFixed(0)}ms · p90 ${p(0.9).toFixed(0)}ms · 최대 ${sorted.at(-1).toFixed(0)}ms · 실패 ${failed}건`)
}
