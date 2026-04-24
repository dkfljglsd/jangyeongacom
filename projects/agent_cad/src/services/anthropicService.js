import { SYSTEM_PROMPT } from '../prompts/systemPrompt'

export async function generateCAD(userPrompt, signal, images = []) {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Google API key not found. Please set VITE_GOOGLE_API_KEY in your .env.local file.')
  }

  let response
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                ...images.map((img) => {
                  const [meta, data] = img.dataUrl.split(',')
                  const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/png'
                  return { inline_data: { mime_type: mimeType, data } }
                }),
                { text: userPrompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
          },
        }),
      }
    )
  } catch (fetchErr) {
    if (fetchErr?.name === 'AbortError') throw fetchErr
    throw new Error('네트워크 연결을 확인해주세요.')
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = err?.error?.message || ''
    if (msg.includes('quota') || msg.includes('Quota') || response.status === 429) {
      const retryMatch = msg.match(/retry in ([\d.]+)s/)
      const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 1 : 30
      await new Promise((r) => setTimeout(r, waitSec * 1000))
      return generateCAD(userPrompt, signal, images)
    }
    // 503 Service Unavailable → 잠시 후 재시도
    if (response.status === 503 || response.status === 502) {
      await new Promise((r) => setTimeout(r, 3000))
      return generateCAD(userPrompt, signal, images)
    }
    throw new Error(msg || `API error: ${response.status}`)
  }

  const data = await response.json()
  const candidate = data?.candidates?.[0]
  const text = candidate?.content?.parts?.[0]?.text

  if (!text) {
    const finishReason = candidate?.finishReason
    const blockReason = data?.promptFeedback?.blockReason
    // 빈 응답도 재시도 (SAFETY/RECITATION은 제외)
    if (!blockReason && finishReason !== 'SAFETY' && finishReason !== 'RECITATION') {
      await new Promise((r) => setTimeout(r, 2000))
      return generateCAD(userPrompt, signal, images)
    }
    throw new Error(
      blockReason ? `콘텐츠 차단: ${blockReason}` :
      finishReason ? `생성 중단: ${finishReason}` :
      '빈 응답'
    )
  }
  return text
}
