/* 통화에서 반복되는 짧은 말은 사전으로 즉시 바꾼다.
 *
 * 모델을 거치면 1~2 초가 걸리는데, "네" 나 "여보세요" 같은 말은 답이 정해져 있다.
 * 매번 조금씩 다르게 번역되는 것도 통화에서는 오히려 산만하다.
 *
 * 규칙은 하나뿐이다 — **발화 전체가 정확히 일치할 때만** 쓴다.
 * 조금이라도 다르면(예: "네 그렇습니다") 모델로 넘긴다. 부분 일치를 허용하면
 * "네 개 주세요" 가 "Yes" 가 되는 식으로 조용히 망가진다.
 */

const P = (ko, en, ja, out) => ({ ko, en, ja, out })

const PHRASES = [
  // 전화 열고 닫기
  P(['여보세요'], ['hello', 'hi'], ['もしもし'],
    { ko: '여보세요?', en: 'Hello?', ja: 'もしもし。' }),
  P(['안녕하세요', '안녕하십니까'], ['hello there', 'good day'], ['こんにちは'],
    { ko: '안녕하세요.', en: 'Hello.', ja: 'こんにちは。' }),
  P(['들리세요', '잘 들리세요', '제 말 들리세요'], ['can you hear me', 'do you hear me'], ['聞こえますか', '聞こえますか？'],
    { ko: '들리세요?', en: 'Can you hear me?', ja: '聞こえますか？' }),
  P(['안녕히 계세요', '안녕히 가세요', '들어가세요'], ['goodbye', 'bye', 'see you'], ['さようなら', 'さよなら'],
    { ko: '안녕히 계세요.', en: 'Goodbye.', ja: 'さようなら。' }),
  P(['끊을게요', '이만 끊을게요'], ['i will hang up now', 'i have to go'], ['失礼します'],
    { ko: '이만 끊을게요.', en: "I'll hang up now.", ja: '失礼します。' }),

  // 맞장구
  P(['네', '예', '응'], ['yes', 'yeah', 'yep'], ['はい', 'ええ'],
    { ko: '네.', en: 'Yes.', ja: 'はい。' }),
  P(['아니요', '아니오', '아니'], ['no', 'nope'], ['いいえ'],
    { ko: '아니요.', en: 'No.', ja: 'いいえ。' }),
  P(['알겠습니다', '알겠어요', '알았어요'], ['understood', 'got it', 'i see'], ['わかりました', '承知しました'],
    { ko: '알겠습니다.', en: 'Understood.', ja: 'わかりました。' }),
  P(['맞아요', '맞습니다', '그렇습니다'], ["that's right", 'correct', 'exactly'], ['そうです'],
    { ko: '맞아요.', en: "That's right.", ja: 'そうです。' }),
  P(['괜찮아요', '괜찮습니다'], ["it's okay", "it's fine", 'no problem'], ['大丈夫です'],
    { ko: '괜찮아요.', en: "It's okay.", ja: '大丈夫です。' }),
  P(['좋아요', '좋습니다', '좋네요'], ['sounds good', 'that works', 'great'], ['いいですね'],
    { ko: '좋아요.', en: 'Sounds good.', ja: 'いいですね。' }),
  P(['모르겠어요', '잘 모르겠어요', '모르겠습니다'], ["i don't know", 'not sure'], ['わかりません'],
    { ko: '잘 모르겠어요.', en: "I'm not sure.", ja: 'わかりません。' }),

  // 예의
  P(['감사합니다', '고맙습니다', '고마워요'], ['thank you', 'thanks'], ['ありがとうございます', 'ありがとう'],
    { ko: '감사합니다.', en: 'Thank you.', ja: 'ありがとうございます。' }),
  P(['죄송합니다', '미안합니다', '미안해요'], ['sorry', "i'm sorry", 'my apologies'], ['すみません', 'ごめんなさい'],
    { ko: '죄송합니다.', en: "I'm sorry.", ja: 'すみません。' }),
  P(['천만에요', '별말씀을요'], ["you're welcome", 'no worries'], ['どういたしまして'],
    { ko: '천만에요.', en: "You're welcome.", ja: 'どういたしまして。' }),

  // 통화 진행
  P(['잠시만요', '잠깐만요', '잠시만 기다려 주세요', '잠깐만'],
    ['just a moment', 'hold on', 'one moment', 'wait a second'],
    ['少々お待ちください', 'ちょっと待ってください'],
    { ko: '잠시만요.', en: 'Just a moment.', ja: '少々お待ちください。' }),
  P(['다시 말씀해 주세요', '다시 한번 말씀해 주세요', '뭐라고요'],
    ['could you say that again', 'say that again', 'come again', 'what was that'],
    ['もう一度お願いします', 'もう一度言ってください'],
    { ko: '다시 말씀해 주시겠어요?', en: 'Could you say that again?', ja: 'もう一度お願いします。' }),
  P(['조금만 더 크게 말씀해 주세요', '더 크게 말씀해 주세요', '소리가 작아요'],
    ['could you speak up', 'speak louder', 'i can barely hear you'],
    ['もう少し大きな声でお願いします'],
    { ko: '조금만 더 크게 말씀해 주시겠어요?', en: 'Could you speak up a little?', ja: 'もう少し大きな声でお願いします。' }),
  P(['소리가 끊겨요', '잘 안 들려요'], ["you're breaking up", 'i cannot hear you well'], ['声が途切れています'],
    { ko: '소리가 끊겨요.', en: "You're breaking up.", ja: '声が途切れています。' }),
  P(['지금 통화 괜찮으세요', '통화 가능하세요'], ['is now a good time', 'can you talk now'], ['今お電話大丈夫ですか'],
    { ko: '지금 통화 괜찮으세요?', en: 'Is now a good time?', ja: '今お電話大丈夫ですか？' }),
  P(['나중에 다시 걸게요', '이따 다시 걸게요'], ['i will call you back', 'let me call you back'], ['後でかけ直します'],
    { ko: '나중에 다시 걸게요.', en: "I'll call you back.", ja: '後でかけ直します。' }),
]

// 비교용 정규화 — 끝의 구두점과 중복 공백만 걷어낸다. 내용은 건드리지 않는다.
function normalize(text) {
  return String(text || '')
    .trim()
    .replace(/[.!?。！？,、\s]+$/u, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

const INDEX = new Map()
for (const entry of PHRASES) {
  for (const lang of ['ko', 'en', 'ja']) {
    for (const form of entry[lang] || []) INDEX.set(`${lang}|${normalize(form)}`, entry)
  }
}

/** 통째로 아는 말이면 대응 문장을, 아니면 null 을 돌려준다. */
export function lookupPhrase(text, from, to) {
  const entry = INDEX.get(`${from}|${normalize(text)}`)
  return entry?.out?.[to] ?? null
}

export const PHRASE_COUNT = PHRASES.length
