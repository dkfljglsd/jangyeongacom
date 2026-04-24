import { useRef, useCallback, useState } from 'react'
import Toolbar from '../components/editor/Toolbar'
import Sidebar from '../components/editor/Sidebar'
import AIPanel from '../components/ai/AIPanel'
import PropertiesPanel from '../components/editor/PropertiesPanel'
import StatusBar from '../components/editor/StatusBar'
import Viewer3D from '../components/viewer/Viewer3D'
import ModelLibrary from '../components/editor/ModelLibrary'
import useCADStore from '../store/cadStore'

const MIN_PANEL_WIDTH = 240
const MAX_PANEL_WIDTH = 600

function ColHandle({ onMouseDown }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 shrink-0 cursor-col-resize relative group select-none"
    >
      <div className="absolute inset-y-0 w-full bg-zinc-800 group-hover:bg-blue-500 transition-colors duration-150" />
    </div>
  )
}

function RowHandle({ onMouseDown }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="h-1 shrink-0 cursor-row-resize relative group select-none"
    >
      <div className="absolute inset-x-0 h-full bg-zinc-800 group-hover:bg-blue-500 transition-colors duration-150" />
    </div>
  )
}

export default function EditorPage() {
  const sceneRef = useRef(null)
  const [rightWidth, setRightWidth] = useState(288)
  const [leftWidth, setLeftWidth] = useState(208)
  const [propHeight, setPropHeight] = useState(320)
  const showModelLibrary = useCADStore((s) => s.showModelLibrary)

  const handleSceneReady = useCallback((scene) => {
    sceneRef.current = scene
  }, [])

  function makeDragX(getValue, setValue, direction = 1) {
    return (e) => {
      const startX = e.clientX
      const startVal = getValue()
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const onMove = (e) => {
        const delta = (e.clientX - startX) * direction
        setValue(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startVal + delta)))
      }
      const onUp = () => {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
  }

  function makeDragY(getValue, setValue) {
    return (e) => {
      const startY = e.clientY
      const startVal = getValue()
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
      const onMove = (e) => {
        const delta = startY - e.clientY
        setValue(Math.min(600, Math.max(80, startVal + delta)))
      }
      const onUp = () => {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      <Toolbar sceneRef={sceneRef} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Objects list */}
        <div className="shrink-0 bg-zinc-900 overflow-hidden" style={{ width: leftWidth }}>
          <Sidebar />
        </div>

        <ColHandle onMouseDown={makeDragX(() => leftWidth, setLeftWidth, 1)} />

        {/* Center: 3D Viewer */}
        <Viewer3D className="flex-1 overflow-hidden" onSceneReady={handleSceneReady} />

        <ColHandle onMouseDown={makeDragX(() => rightWidth, setRightWidth, -1)} />

        {/* Right: AI + Properties */}
        <div className="shrink-0 flex flex-col bg-zinc-900 overflow-hidden" style={{ width: rightWidth }}>
          <div className="flex-1 overflow-hidden">
            <AIPanel />
          </div>
          <RowHandle onMouseDown={makeDragY(() => propHeight, setPropHeight)} />
          <div className="shrink-0 overflow-hidden bg-zinc-900" style={{ height: propHeight }}>
            <PropertiesPanel />
          </div>
        </div>
      </div>

      <StatusBar />

      {/* Model Library overlay */}
      {showModelLibrary && <ModelLibrary />}
    </div>
  )
}
