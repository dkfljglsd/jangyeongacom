import { useCallback, useRef } from 'react'
import useCADStore from '../store/cadStore'
import { callGeminiIPC } from '../services/ipcService'
import { SYSTEM_PROMPT } from '../prompts/systemPrompt'
import { useReplicadWorker } from './useReplicadWorker'

export function useAIGenerate() {
  const {
    setGenerating,
    setGenerationError,
    addObjects,
    addHistory,
    clearScene,
    requestFitCamera,
  } = useCADStore()

  const { executeCode } = useReplicadWorker()

  const requestIdRef = useRef(null)

  const clearAll = useCallback(() => {
    clearScene()
    useCADStore.setState({ gltfModels: [], selectedGltfId: null })
  }, [clearScene])

  const cancel = useCallback(() => {
    requestIdRef.current = null
    setGenerating(false)
  }, [setGenerating])

  const generate = useCallback(async (promptOverride, images = []) => {
    const trimmed = (promptOverride ?? useCADStore.getState().prompt).trim()
    if (!trimmed) return null

    const reqId = `fast_${Date.now()}`
    requestIdRef.current = reqId

    setGenerating(true)
    setGenerationError(null)

    try {
      const res = await callGeminiIPC({
        requestId: reqId,
        systemPrompt: SYSTEM_PROMPT,
        userParts: [
          ...images.map((img) => {
            const [meta, data] = img.dataUrl.split(',')
            const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/png'
            return { inline_data: { mime_type: mimeType, data } }
          }),
          { text: trimmed },
        ],
        temperature: 0.4,
      })
      let cleanCode = res.text
        .replace(/```[\w]*\n?/g, '')   // 모든 코드 펜스 제거
        .replace(/```/g, '')
        .trim()
      // return [...] 이전의 OpenSCAD/설명 텍스트 제거
      const returnIdx = cleanCode.indexOf('return [')
      if (returnIdx === -1) throw new Error('AI did not return valid replicad code (missing "return [")')
      // 실제 JS 코드만 추출 (return 이전 코드도 포함)
      // 코드가 openscad 등 다른 언어면 에러
      if (cleanCode.includes('module ') || cleanCode.includes('$fn') || cleanCode.includes('cylinder(h=')) {
        throw new Error('AI generated OpenSCAD instead of JavaScript. Retrying...')
      }

      const result = await executeCode(cleanCode)

      // bufferData가 이미 포함된 CAD 오브젝트 배열 생성
      const objects = result.results.map((item, i) => ({
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
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [0.01, 0.01, 0.01], // cm → Three.js units
        },
        // Worker에서 이미 meshing 완료된 버퍼 데이터를 직접 포함
        _prebuiltBuffer: item.bufferData,
      }))

      // 전체 모델의 최저 Y를 구해서 바닥(Y=0)에 붙이기 (vertices는 cm 단위)
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
          obj.transform.position[1] = -minY * 0.01 // cm → Three.js units
        }
      }

      clearAll()
      useCADStore.setState({ lastGeneratedCode: cleanCode })
      addObjects(objects)
      addHistory({ prompt: trimmed, objects, timestamp: Date.now() })
      requestFitCamera()
      return { objects }
    } catch (err) {
      if (requestIdRef.current === null) return null // cancelled
      setGenerationError(err.message)
      return null
    } finally {
      requestIdRef.current = null
      setGenerating(false)
    }
  }, [setGenerating, setGenerationError, addObjects, addHistory, clearAll, executeCode])

  return { generate, cancel }
}
