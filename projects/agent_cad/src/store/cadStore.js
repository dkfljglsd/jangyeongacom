import { create } from 'zustand'

const useCADStore = create((set, get) => ({
  // CAD objects
  objects: [],
  selectedId: null,

  // AI state
  prompt: '',
  isGenerating: false,
  generationError: null,
  history: [],

  // UI state
  activePanel: 'ai',
  viewMode: 'solid',
  gridVisible: true,
  showAxes: false,

  // replicad state
  replicadReady: false,
  lastGeneratedCode: null,
  lastGeneratedCode: null,

  // camera fit request
  fitCameraRequest: 0,

  // GLTF model library state
  gltfModels: [],
  selectedGltfId: null,
  showModelLibrary: false,

  // Object actions
  setObjects: (objects) => set({ objects }),
  addObjects: (newObjects) => set((s) => ({ objects: [...s.objects, ...newObjects] })),
  removeObject: (id) =>
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  selectObject: (id) => set({ selectedId: id }),
  clearScene: () => set({ objects: [], selectedId: null, lastGeneratedCode: null }),

  updateObjectMaterial: (id, material) =>
    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === id ? { ...o, material: { ...o.material, ...material } } : o
      ),
    })),

  updateObjectTransform: (id, transform) =>
    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === id ? { ...o, transform: { ...o.transform, ...transform } } : o
      ),
    })),

  updateObjectName: (id, name) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, name } : o)),
    })),

  toggleObjectVisible: (id) =>
    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === id ? { ...o, visible: o.visible === false ? true : false } : o
      ),
    })),

  // AI actions
  setPrompt: (prompt) => set({ prompt }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationError: (generationError) => set({ generationError }),
  addHistory: (entry) =>
    set((s) => ({ history: [entry, ...s.history].slice(0, 20) })),
  restoreFromHistory: (entry) =>
    set({ objects: entry.objects, prompt: entry.prompt }),

  // UI actions
  setActivePanel: (activePanel) => set({ activePanel }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleAxes: () => set((s) => ({ showAxes: !s.showAxes })),

  // replicad actions
  setReplicadReady: (replicadReady) => set({ replicadReady }),
  setLastGeneratedCode: (code) => set({ lastGeneratedCode: code }),
  requestFitCamera: () => set((s) => ({ fitCameraRequest: s.fitCameraRequest + 1 })),

  // GLTF model actions
  addGltfModel: (model) => set({ gltfModels: [model], selectedGltfId: model.id }),
  removeGltfModel: (id) => set((s) => ({ gltfModels: s.gltfModels.filter((m) => m.id !== id) })),
  selectGltf: (id) => set({ selectedGltfId: id }),
  updateGltfTransform: (id, transform) =>
    set((s) => ({
      gltfModels: s.gltfModels.map((m) =>
        m.id === id ? { ...m, transform: { ...m.transform, ...transform } } : m
      ),
    })),
  toggleModelLibrary: () => set((s) => ({ showModelLibrary: !s.showModelLibrary })),
}))

export default useCADStore
