import { useState, useCallback } from 'react'
import { Play, Code2, RotateCcw, Zap, SlidersHorizontal } from 'lucide-react'
import usePipelineStore from '../../store/pipelineStore'
import useCADStore from '../../store/cadStore'
import { useReplicadWorker } from '../../hooks/useReplicadWorker'

const TAEGEUKGI_CODE = `// 태극기 (Korean Flag)
// 뷰어 기준: 화면 위(북) = -Z, 화면 아래(남) = +Z
const flagBase = makeBox(90, 0.5, 60).translate([-45, 0, -30])

// ── 태극 (Y-레이어링, S자) ──────────────────────────────────────────
// 빨강=북(-Z/위), 파랑=남(+Z/아래)
// 파랑 전체 원(바닥) → 빨강 북반원(위) → 빨강점(남/파랑영역) → 파랑점(북/빨강영역)
const blueBase = makeCylinder(15, 0.5).translate([0, 0.5,  0])
const halfRed  = makeCylinder(15, 0.5).cut(makeBox(32, 1, 16).translate([-16, -0.1, 0])).translate([0, 0.52, 0])
const redDot   = makeCylinder(7.5, 0.5).translate([0, 0.54,  7.5])
const blueDot  = makeCylinder(7.5, 0.5).translate([0, 0.56, -7.5])

// ── 괘 (Trigrams) ─────────────────────────────────────────────
// 건(좌상=-X,-Z), 감(우상=+X,-Z), 리(좌하=-X,+Z), 곤(우하=+X,+Z)
// 건/곤: -45°, 감/리: +45°
const T = 0.5, bW = 8, bD = 1.5, p = 3.5

// 건 ☰ solid-solid-solid (좌상, Z<0)
const gc = [-32, 0.5, -17]
const g1  = makeBox(bW, T, bD).translate([-36, 0.5, -14      ]).rotate(45, gc, [0,1,0])
const g2  = makeBox(bW, T, bD).translate([-36, 0.5, -14 -   p]).rotate(45, gc, [0,1,0])
const g3  = makeBox(bW, T, bD).translate([-36, 0.5, -14 - 2*p]).rotate(45, gc, [0,1,0])

// 감 ☵ broken-solid-broken (우상, Z<0)
const gaC = [24, 0.5, -17]
const ga1a = makeBox(3.5, T, bD).translate([20,   0.5, -14      ]).rotate(-45, gaC, [0,1,0])
const ga1b = makeBox(3.5, T, bD).translate([24.5, 0.5, -14      ]).rotate(-45, gaC, [0,1,0])
const ga2  = makeBox(bW,  T, bD).translate([20,   0.5, -14 -   p]).rotate(-45, gaC, [0,1,0])
const ga3a = makeBox(3.5, T, bD).translate([20,   0.5, -14 - 2*p]).rotate(-45, gaC, [0,1,0])
const ga3b = makeBox(3.5, T, bD).translate([24.5, 0.5, -14 - 2*p]).rotate(-45, gaC, [0,1,0])

// 리 ☲ solid-broken-solid (좌하, Z>0)
const rC = [-32, 0.5, 17]
const r1  = makeBox(bW,  T, bD).translate([-36,   0.5, 14      ]).rotate(-45, rC, [0,1,0])
const r2a = makeBox(3.5, T, bD).translate([-36,   0.5, 14 +   p]).rotate(-45, rC, [0,1,0])
const r2b = makeBox(3.5, T, bD).translate([-31.5, 0.5, 14 +   p]).rotate(-45, rC, [0,1,0])
const r3  = makeBox(bW,  T, bD).translate([-36,   0.5, 14 + 2*p]).rotate(-45, rC, [0,1,0])

// 곤 ☷ broken-broken-broken (우하, Z>0)
const goC = [24, 0.5, 17]
const go1a = makeBox(3.5, T, bD).translate([20,   0.5, 14      ]).rotate(45, goC, [0,1,0])
const go1b = makeBox(3.5, T, bD).translate([24.5, 0.5, 14      ]).rotate(45, goC, [0,1,0])
const go2a = makeBox(3.5, T, bD).translate([20,   0.5, 14 +   p]).rotate(45, goC, [0,1,0])
const go2b = makeBox(3.5, T, bD).translate([24.5, 0.5, 14 +   p]).rotate(45, goC, [0,1,0])
const go3a = makeBox(3.5, T, bD).translate([20,   0.5, 14 + 2*p]).rotate(45, goC, [0,1,0])
const go3b = makeBox(3.5, T, bD).translate([24.5, 0.5, 14 + 2*p]).rotate(45, goC, [0,1,0])

return [
  { name: "Flag",              shape: flagBase, color: "#FFFFFF", metalness: 0, roughness: 0.8 },
  { name: "Taegeuk Blue",      shape: blueBase, color: "#003478", metalness: 0, roughness: 0.4 },
  { name: "Taegeuk Red",       shape: halfRed,  color: "#CD2E3A", metalness: 0, roughness: 0.4 },
  { name: "Taegeuk Red Dot",   shape: redDot,   color: "#CD2E3A", metalness: 0, roughness: 0.4 },
  { name: "Taegeuk Blue Dot",  shape: blueDot,  color: "#003478", metalness: 0, roughness: 0.4 },
  { name: "Geon 1",  shape: g1,   color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Geon 2",  shape: g2,   color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Geon 3",  shape: g3,   color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Gam 1a", shape: ga1a, color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Gam 1b", shape: ga1b, color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Gam 2",  shape: ga2,  color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Gam 3a", shape: ga3a, color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Gam 3b", shape: ga3b, color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Ri 1",   shape: r1,   color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Ri 2a",  shape: r2a,  color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Ri 2b",  shape: r2b,  color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Ri 3",   shape: r3,   color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Gon 1a", shape: go1a, color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Gon 1b", shape: go1b, color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Gon 2a", shape: go2a, color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Gon 2b", shape: go2b, color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Gon 3a", shape: go3a, color: "#000000", metalness: 0, roughness: 0.8 },
  { name: "Gon 3b", shape: go3b, color: "#000000", metalness: 0, roughness: 0.8 },
]`

export default function CodePanel() {
  const [code, setCode] = useState(TAEGEUKGI_CODE)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)

  const setMode = usePipelineStore((s) => s.setMode)
  const { addObjects, clearScene } = useCADStore()
  const { executeCode } = useReplicadWorker()

  const handleRun = useCallback(async () => {
    if (isRunning) return
    setIsRunning(true)
    setError(null)
    setStatus('형상 계산 중...')

    try {
      const result = await executeCode(code)
      const objects = result.results.map((item, i) => ({
        id: `obj_${Date.now()}_${i}`,
        name: item.name,
        type: 'solid',
        visible: true,
        geometry: {},
        material: {
          color: item.color,
          metalness: item.metalness ?? 0.1,
          roughness: item.roughness ?? 0.6,
          opacity: item.opacity ?? 1,
          wireframe: false,
        },
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [0.01, 0.01, 0.01] },
        _prebuiltBuffer: item.bufferData,
      }))

      // 바닥 맞추기
      let minY = Infinity
      for (const obj of objects) {
        const verts = obj._prebuiltBuffer?.vertices
        if (!verts) continue
        for (let i = 1; i < verts.length; i += 3) {
          if (verts[i] < minY) minY = verts[i]
        }
      }
      if (minY !== Infinity && Math.abs(minY) > 0.1) {
        for (const obj of objects) obj.transform.position[1] = -minY * 0.01
      }

      clearScene()
      addObjects(objects)
      useCADStore.getState().requestFitCamera()
      setStatus(`완료 — ${objects.length}개 파트`)
    } catch (err) {
      setError(err.message || String(err))
      setStatus(null)
    } finally {
      setIsRunning(false)
    }
  }, [code, executeCode, addObjects, clearScene, isRunning])

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* 헤더 */}
      <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2 shrink-0">
        <Code2 className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-semibold text-zinc-300 flex-1">코드 모드</span>
        <button
          onClick={() => setMode('fast')}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-700"
        >
          <Zap className="w-3 h-3" /> 빠른 모드
        </button>
        <button
          onClick={() => setMode('accurate')}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-700"
        >
          <SlidersHorizontal className="w-3 h-3" /> 정확 모드
        </button>
      </div>

      {/* 코드 에디터 */}
      <div className="flex-1 overflow-hidden flex flex-col p-3 gap-2 min-h-0">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full bg-zinc-900 text-zinc-100 text-xs font-mono p-3 rounded-lg border border-zinc-700 focus:border-emerald-500/50 focus:outline-none resize-none leading-relaxed"
          placeholder="replicad 코드를 입력하세요..."
        />

        {error && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {status && !error && (
          <div className="text-xs text-emerald-400 text-center">{status}</div>
        )}

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => { setCode(TAEGEUKGI_CODE); setError(null); setStatus(null) }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> 태극기
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning || !code.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning ? '실행 중...' : '실행'}
          </button>
        </div>
      </div>
    </div>
  )
}
