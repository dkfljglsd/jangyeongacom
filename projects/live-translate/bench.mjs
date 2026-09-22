/* 한/영/일 3개 언어 실사용 벤치마크
   요일·숫자·고유명사 보존 + 목표 언어 누출 여부를 자동 채점한다.
   사용: node bench.mjs <model> [model2 ...] */

const OLLAMA = 'http://127.0.0.1:11434'
const MODELS = process.argv.slice(2)
if (!MODELS.length) { console.error('사용: node bench.mjs <model> [model2 ...]'); process.exit(1) }

const NAME = { ko: 'Korean', en: 'English', ja: 'Japanese' }

const LANG_RULES = {
  ja: ['Natural spoken Japanese only — no Chinese words (下午, 可否). Use 。？！. 여보세요=もしもし.'],
  ko: ['Natural spoken Korean only — no kana or hanzi. もしもし=여보세요.'],
  en: ['Natural spoken English only.'],
}

const FEW_SHOT = {
  'ko>ja': [['여보세요', 'もしもし。'], ['지금 통화 괜찮으세요', '今お電話大丈夫ですか？']],
  'ja>ko': [['もしもし', '여보세요.'], ['今お電話大丈夫ですか', '지금 통화 괜찮으세요?']],
}

const SYS = (from, to) => [
  `Interpret a phone call from ${NAME[from]} to ${NAME[to]}.`,
  `Output only the translation — no quotes, notes, or the original.`,
  `Preserve names, numbers, units and rates exactly (초당=per second, 분당=per minute). Speak naturally.`,
  `Input is speech-recognised and unpunctuated; punctuate the translation (? ! .).`,
  ...(LANG_RULES[to] || []),
].join('\n')

const shots = (from, to) => (FEW_SHOT[`${from}>${to}`] || [])
  .flatMap(([u, a]) => [{ role: 'user', content: u }, { role: 'assistant', content: a }])

const ask = async (model, from, to, text) => {
  const t0 = performance.now()
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, stream: false, keep_alive: '30m',
      messages: [{ role: 'system', content: SYS(from, to) }, ...shots(from, to), { role: 'user', content: text }],
      options: { temperature: 0, top_p: 0.9, num_predict: 256, num_ctx: 4096 },
    }),
  })
  const ms = performance.now() - t0
  const d = await r.json()
  let out = String(d?.message?.content || '').trim()
  out = out.replace(/^```[\w]*\n?|```$/g, '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  return { out, ms }
}

const DAYS = [
  ['Monday', '월요일', '月曜日'], ['Tuesday', '화요일', '火曜日'], ['Wednesday', '수요일', '水曜日'],
  ['Thursday', '목요일', '木曜日'], ['Friday', '금요일', '金曜日'], ['Saturday', '토요일', '土曜日'],
  ['Sunday', '일요일', '日曜日'],
]
const IDX = { en: 0, ko: 1, ja: 2 }

// 전각 숫자/기호를 반각으로 (일본어 출력이 ８月２０日 처럼 나오는 경우)
const normalize = s => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))

// 일본어는 "木曜日" 과 약식 "木曜" 둘 다 정답으로 본다
const hasDay = (out, expected) => {
  const n = normalize(out)
  if (/曜日$/.test(expected)) return n.includes(expected) || n.includes(expected.slice(0, -1))
  return n.includes(expected)
}

// 요일 문장 템플릿: 짧은 것과 종속절이 붙은 긴 것을 섞는다
const DAY_TPL = {
  en: [d => `let's move the review to ${d} morning if that works for you`,
       d => `the meeting is scheduled for ${d} afternoon`,
       d => `I'll send you the report on ${d}`],
  ko: [d => `${d} 오전으로 검토 일정을 옮겨도 괜찮으실까요`,
       d => `회의는 ${d} 오후로 잡혀 있습니다`,
       d => `보고서는 ${d}에 보내드리겠습니다`],
  ja: [d => `ご都合がよければ${d}の午前に打ち合わせを移しましょうか`,
       d => `会議は${d}の午後に予定されています`,
       d => `レポートは${d}にお送りします`],
}

// 목표 언어에 다른 언어 문자가 섞였는지
const LEAK = {
  ko: s => /[a-zA-Z]{3,}/.test(s.replace(/KNS|KAERI/g, '')) || /[一-鿿]/.test(s),
  ja: s => /[a-zA-Z]{3,}/.test(s.replace(/KNS|KAERI/g, '')) || /[가-힯]/.test(s),
  en: s => /[가-힯぀-ヿ一-鿿]/.test(s),
}

// 숫자/고유명사 보존 케이스
const FIDELITY = [
  // 비율 단위는 작은 프롬프트에서 가장 먼저 무너진다 (초당→per minute 등)
  { from: 'ko', to: 'en', text: '냉각재 유량이 초당 12.5리터로 측정됐습니다', must: ['12.5', 'per second'] },
  { from: 'ko', to: 'en', text: '분당 20회씩 측정합니다', must: ['20', 'per minute'] },
  { from: 'ko', to: 'en', text: '시속 60킬로미터로 달렸습니다', must: ['60', 'per hour'] },
  { from: 'ko', to: 'en', text: '냉각재 유량이 초당 12.5리터로 측정됐습니다', must: ['12.5'] },
  { from: 'ko', to: 'en', text: 'KNS 초록 마감이 8월 20일입니다', must: ['KNS', '20'] },
  { from: 'en', to: 'ko', text: 'we need the KNS abstract submitted by August 20th', must: ['KNS', '20'] },
  { from: 'en', to: 'ko', text: 'the reactor power is 1400 megawatts', must: ['1400'] },
  { from: 'ja', to: 'ko', text: '来週の打ち合わせの資料を送っていただけますか', must: [] },
  { from: 'ko', to: 'ja', text: '자료 검토하고 내일 오전까지 회신드리겠습니다', must: [] },
  { from: 'en', to: 'ja', text: 'the call is at 3 PM on August 20th', must: ['3', '20'] },
  { from: 'ja', to: 'en', text: '会議は午後3時からです', must: ['3'] },
]

const PAIRS = [['en','ko'],['ko','en'],['en','ja'],['ja','en'],['ko','ja'],['ja','ko']]

for (const model of MODELS) {
  console.log(`\n${'█'.repeat(70)}\n█ ${model}\n${'█'.repeat(70)}`)
  await ask(model, 'ko', 'en', '안녕하세요')   // 워밍업

  const times = []
  let dayOk = 0, dayTotal = 0
  const dayFails = []

  for (const [from, to] of PAIRS) {
    let ok = 0, total = 0
    for (const day of DAYS) for (const tpl of DAY_TPL[from]) {
      const text = tpl(day[IDX[from]])
      const { out, ms } = await ask(model, from, to, text)
      times.push(ms); total++; dayTotal++
      if (hasDay(out, day[IDX[to]])) { ok++; dayOk++ }
      else dayFails.push(`${from}→${to}  ${day[IDX[from]]} → ${out}`)
    }
    console.log(`  요일 ${from}→${to}: ${ok}/${total}`)
  }

  let fidOk = 0
  const fidFails = []
  for (const c of FIDELITY) {
    const { out, ms } = await ask(model, c.from, c.to, c.text)
    times.push(ms)
    const missing = c.must.filter(m => !normalize(out).includes(m))
    const leaked = LEAK[c.to](out)
    if (!missing.length && !leaked) fidOk++
    else fidFails.push(`${c.from}→${c.to}  ${missing.length ? `누락 ${missing.join(',')}` : ''}${leaked ? ' 언어혼입' : ''}  "${c.text}" → ${out}`)
  }

  const s = [...times].sort((a, b) => a - b)
  const p = q => Math.round(s[Math.min(s.length - 1, Math.floor(s.length * q))])
  console.log(`\n  ── 요일 종합   ${dayOk}/${dayTotal} (${(dayOk/dayTotal*100).toFixed(0)}%)`)
  console.log(`  ── 숫자/고유명사/언어혼입  ${fidOk}/${FIDELITY.length}`)
  console.log(`  ── 지연  중앙값 ${p(0.5)}ms · p90 ${p(0.9)}ms · 최대 ${p(1)}ms`)
  if (dayFails.length) { console.log(`\n  요일 오답 (최대 12건):`); dayFails.slice(0, 12).forEach(f => console.log('   ❌', f)) }
  if (fidFails.length) { console.log(`\n  보존 오답:`); fidFails.forEach(f => console.log('   ❌', f)) }
}
