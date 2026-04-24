import { Link } from 'react-router-dom'
import {
  Grid3x3, Axis3d, Box, CircleDot, Layers, Download,
  Home, SunMedium, Triangle, Package, Cpu
} from 'lucide-react'
import useCADStore from '../../store/cadStore'
import { exportSTL, exportGLTF, exportSTEPFromCode } from '../../utils/exporters'
import { useReplicadWorker } from '../../hooks/useReplicadWorker'

function ToolBtn({ icon: Icon, label, active, onClick, variant = 'default', disabled = false }) {
  return (
    <button
      onClick={onClick}
      title={label}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
          : variant === 'primary'
          ? 'bg-blue-600 hover:bg-blue-500 text-white'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}

const VIEW_MODES = [
  { id: 'solid', icon: Box, label: 'Solid' },
  { id: 'wireframe', icon: Triangle, label: 'Wireframe' },
]

export default function Toolbar({ sceneRef }) {
  const gridVisible = useCADStore((s) => s.gridVisible)
  const showAxes = useCADStore((s) => s.showAxes)
  const viewMode = useCADStore((s) => s.viewMode)
  const toggleGrid = useCADStore((s) => s.toggleGrid)
  const toggleAxes = useCADStore((s) => s.toggleAxes)
  const setViewMode = useCADStore((s) => s.setViewMode)
  const objects = useCADStore((s) => s.objects)
  const lastGeneratedCode = useCADStore((s) => s.lastGeneratedCode)
  const showModelLibrary = useCADStore((s) => s.showModelLibrary)
  const toggleModelLibrary = useCADStore((s) => s.toggleModelLibrary)
  const replicadReady = useCADStore((s) => s.replicadReady)

  const { exportStepFromCode } = useReplicadWorker()

  const canExportStep = !!lastGeneratedCode && replicadReady

  const handleExportSTL = async () => {
    if (!sceneRef?.current) return
    try {
      await exportSTL(sceneRef.current)
    } catch (e) {
      console.error('Export STL failed', e)
    }
  }

  const handleExportGLTF = async () => {
    if (!sceneRef?.current) return
    try {
      await exportGLTF(sceneRef.current)
    } catch (e) {
      console.error('Export GLTF failed', e)
    }
  }

  const handleExportSTEP = async () => {
    if (!replicadReady) {
      alert('replicad가 아직 초기화 중입니다. 잠시 후 다시 시도하세요.')
      return
    }
    try {
      await exportSTEPFromCode(exportStepFromCode, lastGeneratedCode)
    } catch (e) {
      console.error('Export STEP failed', e)
      alert('STEP 내보내기 실패: ' + e.message)
    }
  }

  return (
    <div className="h-11 bg-zinc-900 border-b border-zinc-800 flex items-center px-3 gap-1 shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mr-3">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
          <Box className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-white hidden sm:block">CAD Studio</span>
      </Link>

      <div className="w-px h-5 bg-zinc-700 mx-1" />

      {/* View modes */}
      <div className="flex items-center gap-0.5">
        {VIEW_MODES.map(({ id, icon, label }) => (
          <ToolBtn
            key={id}
            icon={icon}
            label={label}
            active={viewMode === id}
            onClick={() => setViewMode(id)}
          />
        ))}
      </div>

      <div className="w-px h-5 bg-zinc-700 mx-1" />

      {/* Toggles */}
      <ToolBtn icon={Grid3x3} label="Grid" active={gridVisible} onClick={toggleGrid} />
      <ToolBtn icon={Axis3d} label="Axes" active={showAxes} onClick={toggleAxes} />

      <div className="w-px h-5 bg-zinc-700 mx-1" />

      <ToolBtn icon={Package} label="Models" active={showModelLibrary} onClick={toggleModelLibrary} />

      {/* replicad 상태 인디케이터 */}
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs"
        title={replicadReady ? 'replicad 솔리드 모델링 준비됨' : 'replicad 초기화 중...'}
      >
        <Cpu className="w-3.5 h-3.5" />
        <span
          className={`hidden lg:inline font-medium ${
            replicadReady ? 'text-green-400' : 'text-yellow-400 animate-pulse'
          }`}
        >
          {replicadReady ? 'Solid Ready' : 'Loading...'}
        </span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            replicadReady ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
          }`}
        />
      </div>

      {/* Export */}
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={handleExportSTL}
          disabled={objects.length === 0}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>STL</span>
        </button>
        <button
          onClick={handleExportGLTF}
          disabled={objects.length === 0}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>GLTF</span>
        </button>
        <button
          onClick={handleExportSTEP}
          disabled={!canExportStep}
          title={!replicadReady ? 'replicad 초기화 중...' : !lastGeneratedCode ? '모델을 먼저 생성하세요' : 'STEP 파일로 내보내기 (FreeCAD 호환)'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>STEP</span>
        </button>
      </div>
    </div>
  )
}
