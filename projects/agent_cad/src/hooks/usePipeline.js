import { useCallback, useRef } from 'react'
import usePipelineStore from '../store/pipelineStore'
import useCADStore from '../store/cadStore'
import { useReplicadWorker } from './useReplicadWorker'
import { callGeminiIPC, cancelGeminiIPC } from '../services/ipcService'
import { SYSTEM_PROMPT } from '../prompts/systemPrompt'
import {
  VIEW_INFERENCE_PROMPT,
  CONSTRAINT_PROMPT,
  PLAN_PROMPT,
  VALIDATION_PROMPT,
} from '../prompts/pipelinePrompts'

function safeParseJSON(text) {
  try {
    // JSON 블록 추출 시도
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    return JSON.parse(text)
  } catch {
    return null
  }
}

function cleanCode(code) {
  return code
    .replace(/```[\w]*\n?/g, '')
    .replace(/```/g, '')
    .trim()
}

export function usePipeline() {
  const store = usePipelineStore()
  const { addObjects, addHistory, clearScene } = useCADStore()
  const { executeCode } = useReplicadWorker()
  const requestIdRef = useRef(null)

  const clearAll = useCallback(() => {
    clearScene()
    useCADStore.setState({ gltfModels: [], selectedGltfId: null })
  }, [clearScene])

  const cancel = useCallback(async () => {
    if (requestIdRef.current) {
      await cancelGeminiIPC(requestIdRef.current)
      requestIdRef.current = null
    }
    store.failPipeline('취소되었습니다.')
  }, [store])

  const run = useCallback(async (userText, userImages = []) => {
    if (store.isRunning) return

    store.startPipeline(userText, userImages)
    const reqId = `pipeline_${Date.now()}`
    requestIdRef.current = reqId

    try {
      // ── Stage 2: View Inference ──────────────────────────────────────
      store.setStage('view_inference')
      const viewRes = await callGeminiIPC({
        requestId: reqId,
        systemPrompt: VIEW_INFERENCE_PROMPT,
        userParts: [
          { text: userText },
          ...userImages.map((url) => ({
            inline_data: { mime_type: 'image/png', data: url.split(',')[1] },
          })),
        ],
        temperature: 0.3,
      })
      const viewData = safeParseJSON(viewRes.text)
      store.setViewInference({ ...(viewData || {}), raw: viewRes.text })

      // ── Stage 3: Constraint Extraction ──────────────────────────────
      store.setStage('constraint_extraction')
      const constraintRes = await callGeminiIPC({
        requestId: reqId,
        systemPrompt: CONSTRAINT_PROMPT,
        userParts: [
          { text: `Object: ${userText}\n\nViews:\n${viewRes.text}` },
          ...userImages.map((url) => ({
            inline_data: { mime_type: 'image/png', data: url.split(',')[1] },
          })),
        ],
        temperature: 0.2,
      })
      const constraintData = safeParseJSON(constraintRes.text)
      store.setConstraints({ ...(constraintData || {}), raw: constraintRes.text })

      // ── Stage 4: CAD Planning ────────────────────────────────────────
      store.setStage('cad_planning')
      const planRes = await callGeminiIPC({
        requestId: reqId,
        systemPrompt: PLAN_PROMPT,
        userParts: [
          {
            text: `Object: ${userText}\n\nViews:\n${viewRes.text}\n\nConstraints:\n${constraintRes.text}`,
          },
        ],
        temperature: 0.3,
      })
      const planData = safeParseJSON(planRes.text)
      store.setPlan({ ...(planData || {}), raw: planRes.text })

      // ── Stage 5: Code Generation ─────────────────────────────────────
      store.setStage('code_generation')
      const codeRes = await callGeminiIPC({
        requestId: reqId,
        systemPrompt: SYSTEM_PROMPT,
        userParts: [
          {
            text: `Create a 3D model of: ${userText}

CAD Plan:
${planRes.text}

Constraints:
${constraintRes.text}

Generate the replicad JavaScript code following the plan above.`,
          },
        ],
        temperature: 0.4,
      })

      let code = cleanCode(codeRes.text)
      const returnIdx = code.indexOf('return [')
      if (returnIdx === -1) throw new Error('AI가 올바른 코드를 생성하지 못했습니다.')
      if (code.includes('module ') || code.includes('$fn')) {
        throw new Error('AI가 잘못된 언어로 코드를 생성했습니다.')
      }
      store.setGeneratedCode(code)

      // ── Stage 6: Geometry Execution ──────────────────────────────────
      store.setStage('geometry_execution')
      const workerResult = await executeCode(code)
      store.setWorkerResult(workerResult)

      // CAD Store에 결과 반영 (3D 뷰어 업데이트)
      const objects = workerResult.results.map((item, i) => ({
        id: `obj_${Date.now()}_${i}`,
        name: item.name,
        type: 'solid',
        visible: true,
        geometry: {},
        material: {
          color: item.color,
          metalness: item.metalness,
          roughness: item.roughness,
          opacity: item.opacity,
          wireframe: false,
        },
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [0.01, 0.01, 0.01] },
        _prebuiltBuffer: item.bufferData,
      }))

      // 전체 모델의 최저 Y를 구해서 바닥(Y=0)에 붙이기
      let minY = Infinity
      for (const obj of objects) {
        const verts = obj._prebuiltBuffer?.vertices
        if (!verts) continue
        for (let i = 1; i < verts.length; i += 3) {
          if (verts[i] < minY) minY = verts[i]
        }
      }
      if (minY !== Infinity && Math.abs(minY) > 0.1) {
        for (const obj of objects) {
          obj.transform.position[1] = -minY * 0.01
        }
      }

      clearAll()
      useCADStore.setState({ lastGeneratedCode: code })
      addObjects(objects)
      addHistory({ prompt: userText, objects, timestamp: Date.now() })
      useCADStore.getState().requestFitCamera()

      // ── Stage 7: Validation ──────────────────────────────────────────
      store.setStage('validation')
      const validRes = await callGeminiIPC({
        requestId: reqId,
        systemPrompt: VALIDATION_PROMPT,
        userParts: [
          {
            text: `Original request: ${userText}

Constraints:
${constraintRes.text}

Generated code:
${code}`,
          },
        ],
        temperature: 0.2,
      })
      const validData = safeParseJSON(validRes.text)
      store.setValidation({ ...(validData || {}), raw: validRes.text })

      store.finishPipeline()
      return { objects }
    } catch (err) {
      if (err.name === 'AbortError' || err.message === '취소되었습니다.') return null
      store.failPipeline(err.message || '알 수 없는 오류가 발생했습니다.')
      return null
    } finally {
      requestIdRef.current = null
    }
  }, [store, addObjects, addHistory, clearAll, executeCode])

  return { run, cancel }
}
