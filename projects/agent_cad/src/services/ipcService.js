/**
 * Gemini API 호출 — IPC (Electron main process) 경유
 * API 키가 렌더러에 노출되지 않음
 */
export async function callGeminiIPC({
  systemPrompt,
  userParts,
  model = 'gemini-3.1-flash-lite-preview',
  temperature = 0.4,
  maxTokens = 8192,
  requestId,
}) {
  // Electron 환경
  if (window.electronAPI?.callGemini) {
    return window.electronAPI.callGemini({
      requestId,
      model,
      systemPrompt,
      userParts,
      temperature,
      maxTokens,
    })
    // returns { text: string }
  }

  // 브라우저 fallback (Vite dev without Electron)
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
  if (!apiKey) throw new Error('VITE_GOOGLE_API_KEY not set')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: userParts }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    }
  )
  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response')
  return { text }
}

export async function cancelGeminiIPC(requestId) {
  if (window.electronAPI?.cancelGemini) {
    await window.electronAPI.cancelGemini(requestId)
  }
}
