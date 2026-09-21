/* 발음 표기 — 외국어 문장이 "어떻게 들리는지"를 한글로 적는다.
 *
 * LLM 은 이 작업을 신뢰할 수 없다(번역을 내놓거나, 긴 문장에서 다른 문자가 섞인다).
 * 그래서 사전 기반 결정적 변환을 쓴다. 호출 지연이 0 이라는 이점도 크다.
 *   영어  : CMU 발음사전 → ARPAbet 음소열 → 한글
 *   일본어: kuromoji 형태소 분석 → 가타카나 읽기 → 한글
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* ───────────────── 영어 ───────────────── */

const CMU = require('cmu-pronouncing-dictionary').dictionary

// ARPAbet → 한글. 자음은 (초성, 받침) 두 형태를 갖는다.
const VOWEL = {
  AA: '아', AE: '애', AH: '어', AO: '오', AW: '아우', AY: '아이',
  EH: '에', ER: '어', EY: '에이', IH: '이', IY: '이', OW: '오우',
  OY: '오이', UH: '우', UW: '우',
}
// [초성 자모, 받침 표기]
const CONS = {
  B: ['ㅂ', '브'], CH: ['ㅊ', '치'], D: ['ㄷ', '드'], DH: ['ㄷ', '드'],
  F: ['ㅍ', '프'], G: ['ㄱ', '그'], HH: ['ㅎ', '흐'], JH: ['ㅈ', '지'],
  K: ['ㅋ', '크'], L: ['ㄹ', 'ㄹ'], M: ['ㅁ', 'ㅁ'], N: ['ㄴ', 'ㄴ'],
  NG: ['ㅇ', 'ㅇ'], P: ['ㅍ', '프'], R: ['ㄹ', '어'], S: ['ㅅ', '스'],
  SH: ['ㅅ', '시'], T: ['ㅌ', '트'], TH: ['ㅆ', '쓰'], V: ['ㅂ', '브'],
  W: ['ㅜ', '우'], Y: ['ㅣ', '이'], Z: ['ㅈ', '즈'], ZH: ['ㅈ', '지'],
}

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'

// 한글 낱자를 모아 한 음절로
const compose = (cho, jung, jong = ' ') => {
  const ci = CHO.indexOf(cho), vi = JUNG.indexOf(jung), ti = JONG.indexOf(jong)
  if (ci < 0 || vi < 0 || ti < 0) return ''
  return String.fromCharCode(0xac00 + (ci * 21 + vi) * 28 + ti)
}

// '아' 같은 완성형 모음 음절에서 중성만 꺼낸다
const jungOf = syl => JUNG[Math.floor(((syl.charCodeAt(0) - 0xac00) % (21 * 28)) / 28)]

const W_GLIDE = { 아: 'ㅘ', 애: 'ㅙ', 에: 'ㅞ', 이: 'ㅟ', 어: 'ㅝ', 오: 'ㅗ', 우: 'ㅜ' }
const Y_GLIDE = { 아: 'ㅑ', 애: 'ㅒ', 어: 'ㅕ', 에: 'ㅖ', 오: 'ㅛ', 우: 'ㅠ', 이: 'ㅣ' }

function arpabetToHangul(phones) {
  // 강세 숫자 제거
  const ph = phones.map(p => p.replace(/\d/g, ''))
  let out = ''
  let i = 0

  while (i < ph.length) {
    const p = ph[i]

    // 모음이면 앞의 활음(W/Y)을 합쳐 한 음절로
    if (VOWEL[p]) { out += VOWEL[p]; i++; continue }

    const c = CONS[p]
    if (!c) { i++; continue }

    // park→파크, morning→모닝. 단어 끝의 R 은 살린다 (hear→히어)
    if (p === 'R' && VOWEL[ph[i - 1]] && ph[i + 1] && !VOWEL[ph[i + 1]]) { i++; continue }

    // 자음 + 모음 → 한 음절
    const next = ph[i + 1]
    if (VOWEL[next]) {
      const v = VOWEL[next]
      let jung = jungOf(v[0])
      if (p === 'W' && W_GLIDE[v[0]]) { out += compose('ㅇ', W_GLIDE[v[0]]) + v.slice(1); i += 2; continue }
      if (p === 'Y' && Y_GLIDE[v[0]]) { out += compose('ㅇ', Y_GLIDE[v[0]]) + v.slice(1); i += 2; continue }

      // Hello → 헬로우, flow → 플로우. 단어 첫머리의 L 은 그대로 둔다 (last → 래스트)
      if (p === 'L' && /[가-힣]$/.test(out)) out = attachCoda(out, 'ㄹ')

      // 다음다음이 받침 가능한 자음이면 받침으로 붙인다 (N, NG, L, M)
      const after = ph[i + 2]
      const CODA = { N: 'ㄴ', NG: 'ㅇ', M: 'ㅁ', L: 'ㄹ' }
      if (after && CODA[after] && !VOWEL[ph[i + 3]]) {
        // '오이' 처럼 모음이 두 음절이면 받침은 마지막 음절에 붙는다 (포인트, 폰이트 아님)
        out += compose(c[0], jung) + v.slice(1)
        out = attachCoda(out, CODA[after])
        i += 3
        continue
      }
      out += compose(c[0], jung) + v.slice(1)
      i += 2
      continue
    }

    // 자음이 홀로 (또는 자음 앞)
    // ㄴ/ㅇ/ㅁ/ㄹ 은 낱자로 두면 '피에ㅁ' 처럼 깨지므로 앞 음절의 받침으로 붙인다
    const CODA_ONLY = { N: 'ㄴ', NG: 'ㅇ', M: 'ㅁ', L: 'ㄹ' }
    if (CODA_ONLY[p]) { out = attachCoda(out, CODA_ONLY[p]); i++; continue }
    out += c[1]
    i++
  }
  return out
}

// 앞 음절에 받침을 붙인다. 받침이 이미 있거나 한글이 아니면 보조 음절로 적는다.
function attachCoda(out, jong) {
  const last = out.at(-1)
  const FALLBACK = { 'ㄴ': '은', 'ㅇ': '응', 'ㅁ': '음', 'ㄹ': '을' }
  if (!last || last < '가' || last > '힣') return out + FALLBACK[jong]
  const code = last.charCodeAt(0) - 0xac00
  if (code % 28 !== 0) return out + FALLBACK[jong]
  return out.slice(0, -1) + String.fromCharCode(0xac00 + code + JONG.indexOf(jong))
}

// 영어 수사 — 숫자를 소리 나는 대로 읽으려면 먼저 영어 단어로 바꿔야 한다
const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine',
  'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']

function numberToWords(n) {
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '')
  if (n < 1000000) {
    const th = Math.floor(n / 1000)
    return numberToWords(th) + ' thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '')
  }
  return String(n).split('').map(d => ONES[+d]).join(' ')
}

const ORDINAL = { one:'first', two:'second', three:'third', five:'fifth', eight:'eighth',
  nine:'ninth', twelve:'twelfth' }
const toOrdinal = words => {
  const parts = words.split(' ')
  const last = parts.pop()
  parts.push(ORDINAL[last] || (last.endsWith('y') ? last.slice(0, -1) + 'ieth' : last + 'th'))
  return parts.join(' ')
}

// 대문자 약어는 글자 이름으로 읽는다 (KNS → 케이엔에스)
const LETTER = { a:'에이', b:'비', c:'씨', d:'디', e:'이', f:'에프', g:'지', h:'에이치',
  i:'아이', j:'제이', k:'케이', l:'엘', m:'엠', n:'엔', o:'오', p:'피', q:'큐',
  r:'알', s:'에스', t:'티', u:'유', v:'브이', w:'더블유', x:'엑스', y:'와이', z:'제트' }
const letterNames = w => [...w.toLowerCase()].map(ch => LETTER[ch] || '').join('')

// 사전에 없는 단어를 위한 철자 기반 근사
const SPELL = {
  a: '아', b: '브', c: '크', d: '드', e: '에', f: '프', g: '그', h: '흐',
  i: '이', j: '즈', k: '크', l: '르', m: '므', n: '느', o: '오', p: '프',
  q: '크', r: '르', s: '스', t: '트', u: '우', v: '브', w: '우', x: '크스',
  y: '이', z: '즈',
}
const spellOut = w => [...w.toLowerCase()].map(ch => SPELL[ch] || '').join('')

const NUM = ['제로', '원', '투', '쓰리', '포', '파이브', '식스', '세븐', '에잇', '나인']

const fromWords = phrase => phrase.split(' ').map(w =>
  CMU[w] ? arpabetToHangul(CMU[w].split(' ')) : spellOut(w)).join(' ')

function englishWord(raw) {
  const word = String(raw)
  if (!word) return ''

  // 12.5 같은 소수
  const dec = word.match(/^(\d+)\.(\d+)$/)
  if (dec) return fromWords(numberToWords(+dec[1]) + ' point ' + [...dec[2]].map(d => ONES[+d]).join(' '))

  // 20th, 3rd 같은 서수
  const ord = word.match(/^(\d+)(st|nd|rd|th)$/i)
  if (ord) return fromWords(toOrdinal(numberToWords(+ord[1])))

  // 순수 숫자
  if (/^\d+$/.test(word)) {
    const n = +word
    return n <= 999999 ? fromWords(numberToWords(n)) : [...word].map(d => NUM[+d]).join('')
  }

  // 대문자 약어 (KNS, KAERI 등) — 사전에 없으면 글자 이름으로
  if (/^[A-Z]{2,5}$/.test(word) && !CMU[word.toLowerCase()]) return letterNames(word)

  const clean = word.toLowerCase().replace(/[^a-z0-9']/g, '')
  if (!clean) return ''
  const phones = CMU[clean]
  if (phones) return arpabetToHangul(phones.split(' '))

  const base = clean.replace(/'s$/, '')
  if (CMU[base]) return arpabetToHangul(CMU[base].split(' ')) + '즈'

  // 숫자와 글자가 섞인 경우 (3PM 등) 쪼개서 처리
  if (/\d/.test(clean) && /[a-z]/.test(clean)) {
    return clean.split(/(\d+)/).filter(Boolean).map(englishWord).join('')
  }
  // 짧은 것은 약어로 보고 글자 이름을, 그 외 모르는 낱말(이름 등)은
  // 억지 음차(Youngah → 이오우느그아흐)보다 원문을 그대로 두는 편이 읽기 쉽다
  if (clean.length <= 3) return spellOut(clean)
  return word
}

export function englishToHangul(text) {
  return String(text)
    .split(/(\s+)/)
    .map(tok => {
      if (/^\s+$/.test(tok)) return tok
      const m = tok.match(/^([^\w']*)(.*?)([^\w']*)$/s)   // 앞뒤 구두점 보존
      const [, pre, core, post] = m
      return pre + englishWord(core) + post
    })
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/* ───────────────── 일본어 ───────────────── */

// 가타카나 → 한글. 긴 키부터 매칭한다(요음 ャュョ 처리).
const KANA = {
  キャ:'캬',キュ:'큐',キョ:'쿄',シャ:'샤',シュ:'슈',ショ:'쇼',チャ:'차',チュ:'추',チョ:'초',
  ニャ:'냐',ニュ:'뉴',ニョ:'뇨',ヒャ:'햐',ヒュ:'휴',ヒョ:'효',ミャ:'먀',ミュ:'뮤',ミョ:'묘',
  リャ:'랴',リュ:'류',リョ:'료',ギャ:'갸',ギュ:'규',ギョ:'교',ジャ:'자',ジュ:'주',ジョ:'조',
  ビャ:'뱌',ビュ:'뷰',ビョ:'뵤',ピャ:'퍄',ピュ:'퓨',ピョ:'표',
  ファ:'파',フィ:'피',フェ:'페',フォ:'포',ウィ:'위',ウェ:'웨',ウォ:'워',ヴァ:'바',ヴィ:'비',ヴェ:'베',ヴォ:'보',
  ティ:'티',ディ:'디',トゥ:'투',ドゥ:'두',シェ:'셰',ジェ:'제',チェ:'체',ツァ:'차',ツェ:'체',ツォ:'초',
  ア:'아',イ:'이',ウ:'우',エ:'에',オ:'오',
  カ:'카',キ:'키',ク:'쿠',ケ:'케',コ:'코',
  サ:'사',シ:'시',ス:'스',セ:'세',ソ:'소',
  タ:'타',チ:'치',ツ:'츠',テ:'테',ト:'토',
  ナ:'나',ニ:'니',ヌ:'누',ネ:'네',ノ:'노',
  ハ:'하',ヒ:'히',フ:'후',ヘ:'헤',ホ:'호',
  マ:'마',ミ:'미',ム:'무',メ:'메',モ:'모',
  ヤ:'야',ユ:'유',ヨ:'요',
  ラ:'라',リ:'리',ル:'루',レ:'레',ロ:'로',
  ワ:'와',ヲ:'오',ン:'ㄴ',
  ガ:'가',ギ:'기',グ:'구',ゲ:'게',ゴ:'고',
  ザ:'자',ジ:'지',ズ:'즈',ゼ:'제',ゾ:'조',
  ダ:'다',ヂ:'지',ヅ:'즈',デ:'데',ド:'도',
  バ:'바',ビ:'비',ブ:'부',ベ:'베',ボ:'보',
  パ:'파',ピ:'피',プ:'푸',ペ:'페',ポ:'포',
  ャ:'야',ュ:'유',ョ:'요',ァ:'아',ィ:'이',ゥ:'우',ェ:'에',ォ:'오',
  ー:'', '、':', ', '。':'. ', '？':'? ', '！':'! ',
}

// 받침 ㄴ / ㅅ(촉음) 을 앞 음절에 붙인다
const attachJong = (out, jong) => {
  const last = out.at(-1)
  if (!last || last < '가' || last > '힣') return out + (jong === 'ㄴ' ? '은' : '')
  const code = last.charCodeAt(0) - 0xac00
  if (code % 28 !== 0) return out + (jong === 'ㄴ' ? '은' : '')   // 이미 받침이 있음
  const ji = JONG.indexOf(jong)
  return out.slice(0, -1) + String.fromCharCode(0xac00 + code + ji)
}

function katakanaToHangul(kana) {
  let out = ''
  let i = 0
  while (i < kana.length) {
    const two = kana.slice(i, i + 2)
    if (KANA[two] !== undefined) { out += KANA[two]; i += 2; continue }
    const one = kana[i]
    if (one === 'ン') { out = attachJong(out, 'ㄴ'); i++; continue }
    if (one === 'ッ') { out = attachJong(out, 'ㅅ'); i++; continue }
    if (KANA[one] !== undefined) { out += KANA[one]; i++; continue }
    out += one
    i++
  }
  return out
}

let tokenizer = null
let tokenizerPromise = null

function getTokenizer() {
  if (tokenizer) return Promise.resolve(tokenizer)
  if (tokenizerPromise) return tokenizerPromise
  const kuromoji = require('kuromoji')
  tokenizerPromise = new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: path.join(__dirname, 'node_modules/kuromoji/dict') })
      .build((err, tk) => (err ? reject(err) : (tokenizer = tk, resolve(tk))))
  })
  return tokenizerPromise
}

// 한 자리 숫자는 일본어 읽기로 바꾼다 (3時 → 산지).
// 여러 자리는 읽는 법이 복잡해(20日=하츠카) 숫자 그대로 두는 편이 덜 틀린다.
const JP_DIGIT = ['제로','이치','니','산','욘','고','로쿠','나나','하치','큐우']

export async function japaneseToHangul(text) {
  const tk = await getTokenizer()
  const reading = tk
    .tokenize(String(text))
    .map(t => t.reading || t.surface_form)   // reading 은 가타카나
    .join('')
  return katakanaToHangul(reading)
    .replace(/(?<!\d)(\d)(?!\d)/g, (_, d) => JP_DIGIT[+d])
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/* ───────────────── 진입점 ───────────────── */

export async function pronounce(text, lang) {
  const t = String(text || '').trim()
  if (!t) return ''
  if (lang === 'en') return englishToHangul(t)
  if (lang === 'ja') return japaneseToHangul(t)
  return ''        // 한국어를 비롯한 나머지는 표기하지 않는다
}

export const SUPPORTED_PRONUNCIATION = ['en', 'ja']
