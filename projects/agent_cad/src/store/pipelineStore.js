import { create } from 'zustand'

const usePipelineStore = create((set) => ({
  // 현재 모드
  mode: 'fast', // 'fast' | 'accurate' | 'code' | 'svg'
  setMode: (mode) => set({ mode }),

  // 파이프라인 단계
  stage: 'idle',
  // 'idle' | 'view_inference' | 'constraint_extraction' | 'cad_planning'
  // | 'code_generation' | 'geometry_execution' | 'validation' | 'done' | 'error'

  isRunning: false,
  error: null,

  // 입력
  userText: '',
  userImages: [], // base64 data URLs

  // Stage 2: View Inference 결과
  viewInference: null,
  // { front: string, side: string, top: string, raw: string }

  // Stage 3: Constraint 결과
  constraints: null,
  // { dimensions: [], relationships: [], materials: [], raw: string }

  // Stage 4: CAD Plan 결과
  plan: null,
  // { parts: [], strategy: string, raw: string }

  // Stage 5: 생성된 코드
  generatedCode: null,

  // Stage 6: Worker 실행 결과
  workerResult: null,

  // Stage 7: Validation 결과
  validation: null,
  // { passed: bool, checks: [], raw: string }

  // 드래그앤드롭으로 전달된 대기 이미지
  pendingImages: [],
  setPendingImages: (pendingImages) => set({ pendingImages }),
  clearPendingImages: () => set({ pendingImages: [] }),

  // Actions
  startPipeline: (userText, userImages = []) =>
    set({
      isRunning: true,
      error: null,
      stage: 'view_inference',
      userText,
      userImages,
      viewInference: null,
      constraints: null,
      plan: null,
      generatedCode: null,
      workerResult: null,
      validation: null,
    }),

  setStage: (stage) => set({ stage }),
  setViewInference: (viewInference) => set({ viewInference }),
  setConstraints: (constraints) => set({ constraints }),
  setPlan: (plan) => set({ plan }),
  setGeneratedCode: (generatedCode) => set({ generatedCode }),
  setWorkerResult: (workerResult) => set({ workerResult }),
  setValidation: (validation) => set({ validation }),

  finishPipeline: () => set({ isRunning: false, stage: 'done' }),
  failPipeline: (error) => set({ isRunning: false, stage: 'error', error }),
  resetPipeline: () =>
    set({
      stage: 'idle',
      isRunning: false,
      error: null,
      viewInference: null,
      constraints: null,
      plan: null,
      generatedCode: null,
      workerResult: null,
      validation: null,
    }),
}))

export default usePipelineStore
