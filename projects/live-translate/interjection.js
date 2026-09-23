/* 웃음·감탄 같은 순수 감정 표현은 번역 대상이 아니라 대응되는 표기로 바꿔야 한다.
 *
 * 모델에 맡기면 엉뚱해진다 — 측정했을 때 www 와 笑 가 "네." 로, ㅠㅠ 가
 * "ええ、大丈夫ですよ。" 로 나왔다. 규칙으로 처리하면 정확하고 즉시 끝난다.
 * 문장에 섞여 있는 경우(ㅋㅋ 그래서 어떻게 됐어)는 모델이 잘 다루므로 건드리지 않는다.
 */

// 한 종류의 감정만으로 이루어진 발화인지 본다.
// count 는 웃음의 길이를 세는 방법 — w 하나가 ㅋ 하나로 대응된다.
const PATTERNS = [
  { kind: 'laugh', re: /^[ㅋㅎ]{1,}$/,               count: t => t.length },
  { kind: 'laugh', re: /^[wｗ]{1,}$/i,               count: t => t.length },
  { kind: 'laugh', re: /^[하호허크후]{2,}$/,           count: t => t.length },
  { kind: 'laugh', re: /^(あは|ふふ|えへ|はは)+[はーっ]*$/, count: t => Math.round(t.length / 2) },
  { kind: 'laugh', re: /^(ha){1,}h?$|^(he){2,}$/i,   count: t => Math.round(t.replace(/h$/i, '').length / 2) },
  { kind: 'laugh', re: /^[（(]?笑[）)]?$/,             count: () => 2 },
  { kind: 'laugh', re: /^lol+$|^lmao+$|^rofl$/i,     count: () => 3 },
  { kind: 'cry',   re: /^[ㅠㅜ]{2,}$/ },
  { kind: 'cry',   re: /^(흑){2,}$/ },
  { kind: 'cry',   re: /^[（(]?泣[）)]?$/ },
  { kind: 'yes',   re: /^(ㅇㅇ|ㅇㅋ|ㄱㄱ)$/ },
  { kind: 'no',    re: /^(ㄴㄴ)$/ },
]

/* 말을 고르는 소리(음, 어, えーと, um)는 뜻이 없는데, 모델은 여기에
   그럴듯한 문장을 지어낸다 — 측정에서 "씨" 가 "はい。"(네) 로 나왔다.
   말한 적 없는 동의가 상대에게 전달되므로, 목록으로 못 박는다. */
const FILLERS = {
  ko: ['음', '으음', '어', '어어', '그', '그게', '저기', '저기요', '에', '흠', '흐음'],
  ja: ['えーと', 'ええと', 'えっと', 'あの', 'あのー', 'うーん', 'んー', 'ええ と'],
  en: ['um', 'uh', 'er', 'erm', 'hmm', 'hm', 'well'],
}
const FILLER_OUT = { ko: '음…', en: 'um…', ja: 'えーと…' }

const FILLER_SET = new Map()
for (const [lang, list] of Object.entries(FILLERS)) {
  for (const w of list) FILLER_SET.set(`${lang}|${w}`, true)
}

// 목표 언어별 대응 표기
const OUT = {
  cry: { ko: 'ㅠㅠ', en: ':(',   ja: '(泣)' },
  yes: { ko: 'ㅇㅇ', en: 'yeah', ja: 'うん' },
  no:  { ko: 'ㄴㄴ', en: 'nope', ja: 'ううん' },
}

// 웃음은 길이가 곧 세기다. ㅋ 과 w 는 한 글자씩 그대로 맞바꾼다 (ww = ㅋㅋ, www = ㅋㅋㅋ).
function laughFor(to, n) {
  const len = Math.min(Math.max(n, 1), 12)
  if (to === 'ko') return 'ㅋ'.repeat(len)
  if (to === 'ja') return 'w'.repeat(len)
  return len <= 2 ? 'haha' : len <= 4 ? 'hahaha' : 'hahahaha'
}

/** 말을 고르는 소리면 상대 언어의 같은 소리를 돌려준다. */
export function filler(text, from, to) {
  const t = String(text || '').trim().replace(/[.!?。！？…\s]+$/u, '').toLowerCase()
  if (!t) return null
  return FILLER_SET.has(`${from}|${t}`) ? (FILLER_OUT[to] ?? null) : null
}

/* 뜻을 알 수 없는 한 음절 조각.
   모델에 맡기면 "씨" 를 "はい。" 로 지어내므로, 차라리 들린 그대로 보여 준다.
   지어낸 문장보다 못 알아듣는 한 글자가 낫다. */
export function isLoneFragment(text) {
  const t = String(text || '').trim().replace(/[.!?。！？…\s]+$/u, '')
  return /^[가-힣]$/.test(t)
}

/** 순수 감정 표현이면 대응 표기를, 아니면 null 을 돌려준다. */
export function interjection(text, to) {
  const t = String(text || '').trim().replace(/[.!?。！？\s]+$/, '')
  if (!t || t.length > 12) return null

  for (const { kind, re, count } of PATTERNS) {
    if (!re.test(t)) continue
    if (kind === 'laugh') return laughFor(to, count ? count(t) : 2)
    return OUT[kind]?.[to] ?? null
  }
  return null
}

/** 감정 표현인지만 판별한다. 발음 표기를 붙일 필요가 없는 말을 걸러내는 데 쓴다. */
export function isInterjection(text) {
  const t = String(text || '').trim().replace(/[.!?。！？\s]+$/, '')
  if (!t || t.length > 12) return false
  return PATTERNS.some(({ re }) => re.test(t))
}
