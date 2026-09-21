/* 한/영/일 3개 언어 실사용 벤치마크
   요일·숫자·고유명사 보존 + 목표 언어 누출 여부를 자동 채점한다.
   사용: node bench.mjs <model> [model2 ...] */

const OLLAMA = 'http://127.0.0.1:11434'
const MODELS = process.argv.slice(2)
if (!MODELS.length) { console.error('사용: node bench.mjs <model> [model2 ...]'); process.exit(1) }

const NAME = { ko: 'Korean', en: 'English', ja: 'Japanese' }

const LANG_RULES = {
  ja: [
    `- Write natural spoken Japanese. Never use Chinese-only vocabulary or characters (e.g. 下午, 可否, 開会). Use 午後, 会議, ですか.`,
    `- A telephone opener ("여보세요", "hello" answering a call) is もしもし.`,
  ],
  ko: [
    `- Write natural spoken Korean. Never leave Japanese kana or Chinese characters in the output.`,
    `- A telephone opener (もしもし, "hello" answering a call) is 여보세요.`,
  ],
  en: [`- Write natural spoken English. Do not leave Korean or Japanese characters in the output.`],
}

const FEW_SHOT = {
  'ko>ja': [
    ['여보세요', 'もしもし。'],
    ['지금 통화 괜찮으세요', '今お電話大丈夫ですか？'],
    ['자료 확인하고 바로 연락드리겠습니다', '資料を確認してすぐご連絡します。'],
  ],
  'ja>ko': [
    ['もしもし', '여보세요.'],
    ['今お電話大丈夫ですか', '지금 통화 괜찮으세요?'],
    ['資料を確認してすぐご連絡します', '자료 확인하고 바로 연락드리겠습니다.'],
  ],
  'ko>en': [
    ['여보세요', 'Hello?'],
    ['잠시만 기다려 주세요', 'Just a moment, please.'],
    ['정말요 대박이네요', "Really? That's amazing!"],
  ],
  'en>ko': [
    ['hello can you hear me', '여보세요, 들리세요?'],
    ['sorry could you repeat that', '죄송한데 다시 말씀해 주시겠어요?'],
    ['wow that is amazing', '와, 정말 대단하네요!'],
  ],
}

const SYS = (from, to) => [
  `You are a live simultaneous interpreter on a phone call.`,
  `Translate the user's utterance from ${NAME[from]} into ${NAME[to]}.`,
  `Rules:`,
  `- Output ONLY the translation. No quotes, no notes, no romanization, no original text.`,
  `- Keep it natural and conversational, as spoken on a call.`,
  `- Preserve names, numbers, units and proper nouns exactly.`,
  `- The input comes from speech recognition and may be fragmentary; translate it as-is without asking questions.`,
  `- Speech recognition strips punctuation. Restore it in the translation: end questions with a question mark, exclamations with an exclamation mark, and statements with a period.`,
  `- If the input is already ${NAME[to]}, repeat it unchanged.`,
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
      options: { temperature: 0, top_p: 0.9, num_predict: 256 },
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
