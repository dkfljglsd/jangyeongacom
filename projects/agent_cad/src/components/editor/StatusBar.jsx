import useCADStore from '../../store/cadStore'

export default function StatusBar() {
  const objects = useCADStore((s) => s.objects)
  const selectedId = useCADStore((s) => s.selectedId)
  const isGenerating = useCADStore((s) => s.isGenerating)

  const selected = objects.find((o) => o.id === selectedId)

  return (
    <div className="h-6 bg-zinc-950 border-t border-zinc-800 flex items-center px-4 gap-4 shrink-0">
      <span className="text-xs text-zinc-600">
        {objects.length} object{objects.length !== 1 ? 's' : ''} in scene
      </span>
      {selected && (
        <>
          <div className="w-px h-3 bg-zinc-700" />
          <span className="text-xs text-zinc-500">
            Selected: <span className="text-zinc-400">{selected.name}</span>
          </span>
        </>
      )}
      {isGenerating && (
        <>
          <div className="w-px h-3 bg-zinc-700" />
          <span className="text-xs text-blue-400 animate-pulse">AI generating...</span>
        </>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        <span className="text-xs text-zinc-600">Left drag: rotate · Right drag: pan · Scroll: zoom</span>
      </div>
    </div>
  )
}
