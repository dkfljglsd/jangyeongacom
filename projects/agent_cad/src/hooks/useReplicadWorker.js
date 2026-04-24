/**
 * useReplicadWorker.js
 * replicad Web Worker를 관리하는 React hook (싱글턴 Worker 패턴)
 *
 * 앱 전체에서 하나의 Worker 인스턴스만 사용합니다.
 * 여러 컴포넌트에서 hook을 호출해도 동일한 Worker를 공유합니다.
 */
import { useEffect, useState, useCallback } from 'react'

// ── 모듈 레벨 싱글턴 상태 ─────────────────────────────────────────────────────
let _worker = null
let _msgIdCounter = 0
const _pending = new Map()          // id → { resolve, reject }
const _readyCallbacks = new Set()   // () => void
let _isReady = false

function getOrCreateWorker() {
  if (_worker) return _worker

  _worker = new Worker(
    new URL('../workers/replicadWorker.js', import.meta.url),
    { type: 'module' }
  )

  _worker.onmessage = (event) => {
    const { id, type, ...rest } = event.data

    // Worker 준비 완료 브로드캐스트 (id === null)
    if (type === 'ready' && (id === null || id === undefined)) {
      _isReady = true
      for (const cb of _readyCallbacks) cb(true)
      return
    }

    // id 기반 promise 처리
    const pending = _pending.get(id)
    if (!pending) return
    _pending.delete(id)

    if (type === 'error') {
      pending.reject(new Error(rest.error))
    } else {
      pending.resolve({ type, ...rest })
    }
  }

  _worker.onerror = (err) => {
    console.error('[ReplicadWorker] Worker error:', err)
    for (const [, pending] of _pending) {
      pending.reject(new Error(`Worker error: ${err.message}`))
    }
    _pending.clear()
    _isReady = false
    for (const cb of _readyCallbacks) cb(false)
  }

  // Worker 초기화 트리거 (WASM 로딩)
  sendToWorker('init', {}).catch((err) => {
    console.error('[ReplicadWorker] Init failed:', err)
  })

  return _worker
}

function sendToWorker(type, payload) {
  return new Promise((resolve, reject) => {
    const id = ++_msgIdCounter
    _pending.set(id, { resolve, reject })
    _worker.postMessage({ id, type, payload })
  })
}

// ─────────────────────────────────────────────────────────────────────────────

export function useReplicadWorker() {
  const [isReady, setIsReady] = useState(_isReady)

  useEffect(() => {
    // Worker 싱글턴 생성
    getOrCreateWorker()

    // 이미 준비됐으면 즉시 반영
    if (_isReady) setIsReady(true)

    // ready 이벤트 구독
    const onReady = (ready) => setIsReady(ready)
    _readyCallbacks.add(onReady)

    return () => {
      _readyCallbacks.delete(onReady)
      // Worker는 앱 전체에서 공유하므로 컴포넌트 unmount 시 terminate하지 않음
    }
  }, [])

  /**
   * operation tree로부터 solid shape 버퍼 데이터를 빌드
   */
  const buildShape = useCallback(async (objectId, operation, transform) => {
    if (!_worker) throw new Error('Worker not initialized')
    return sendToWorker('buildShape', { objectId, operation, transform })
  }, [])

  /**
   * 여러 객체를 STEP 파일 Uint8Array로 내보내기
   */
  const exportStep = useCallback(async (objects) => {
    if (!_worker) throw new Error('Worker not initialized')
    const result = await sendToWorker('exportStep', { objects })
    return result.data
  }, [])

  /**
   * AI가 생성한 replicad JS 코드를 Worker에서 실행하고 meshing 결과 반환
   * @param {string} code - replicad 함수들을 사용하는 JS 코드 문자열
   * @returns {Promise<{ results: Array<{ name, color, metalness, roughness, opacity, bufferData }> }>}
   */
  const executeCode = useCallback(async (code) => {
    if (!_worker) throw new Error('Worker not initialized')
    return sendToWorker('executeCode', { code })
  }, [])

  const exportStepFromCode = useCallback(async (code) => {
    if (!_worker) throw new Error('Worker not initialized')
    const result = await sendToWorker('exportStepFromCode', { code })
    return result.data
  }, [])

  return { isReady, buildShape, exportStep, executeCode, exportStepFromCode }
}
