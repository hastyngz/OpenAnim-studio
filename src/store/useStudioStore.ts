import { create } from 'zustand'
import type { AudioTrack, Bone, CameraKeyframe, CharacterPreset, DrawingTool, EasingType, FrameState, LayerProperties, PathPoint, RenderPassConfig, StudioAsset, StudioLayer, StudioScene, TtsState, Viseme, VisemeEvent } from '../types/studio'

interface StudioState extends FrameState {
  layers: StudioLayer[]
  selectedLayerId: string
  activeTool: DrawingTool
  assets: StudioAsset[]
  audioTracks: AudioTrack[]
  bones: Bone[]
  characterPresets: CharacterPreset[]
  scenes: StudioScene[]
  activeSceneId: string
  cameraKeyframes: CameraKeyframe[]
  renderPass: RenderPassConfig
  tts: TtsState
  setCurrentFrame: (frame: number) => void
  setFps: (fps: number) => void
  togglePlaying: () => void
  setPlaying: (isPlaying: boolean) => void
  selectLayer: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  toggleAudioVisibility: (id: string) => void
  toggleAudioLock: (id: string) => void
  addBone: (bone: Bone) => void
  updateBone: (id: string, properties: Partial<Bone>) => void
  setLayerBone: (layerId: string, boneId?: string) => void
  requestCharacterPlacement: (id: string | null) => void
  addCharacterPreset: (id: string) => void
  generateLipSync: (layerId: string, durationFrames?: number) => void
  setActiveTool: (tool: DrawingTool) => void
  updateLayerProperties: (id: string, properties: LayerProperties) => void
  addKeyframe: (id: string, frame: number) => void
  setKeyframeEasing: (id: string, frame: number, easing: EasingType, customBezier?: [number, number, number, number]) => void
  updatePathAtFrame: (id: string, path: PathPoint[]) => void
  addLayer: (layer: StudioLayer) => void
  addAsset: (asset: StudioAsset) => void
  requestAssetPlacement: (id: string | null) => void
  placementAssetId: string | null
  placementCharacterPresetId: string | null
  addAudioTrack: (assetId: string, options?: { durationFrames?: number, kind?: 'audio' | 'tts' }) => void
  setTts: (tts: Partial<TtsState>) => void
  setTotalFrames: (totalFrames: number) => void
  setPlaybackSpeed: (speed: 0.5 | 1 | 2) => void
  toggleLoop: () => void
  switchScene: (id: string) => void
  addScene: () => void
  duplicateScene: (id: string) => void
  deleteScene: (id: string) => void
  reorderScene: (id: string, direction: -1 | 1) => void
  addCameraKeyframe: (frame: number) => void
  updateCameraAtFrame: (properties: Partial<Omit<CameraKeyframe, 'frame'>>) => void
  setRenderPass: (config: Partial<RenderPassConfig>) => void
}

const initialLayers: StudioLayer[] = [
  { id: 'sun', name: 'Sun', type: 'shape', visible: true, locked: false, color: '#f5b642', keyframes: [{ frame: 0, x: 660, y: 120 }, { frame: 48, x: 720, y: 190 }] },
  { id: 'mountain', name: 'Mountain range', type: 'shape', visible: true, locked: false, color: '#47636b', keyframes: [{ frame: 0, x: 0, y: 0 }] },
  { id: 'title', name: 'Title card', type: 'text', visible: true, locked: true, color: '#f0e9d8', keyframes: [{ frame: 0, x: 120, y: 390, opacity: 1 }] },
]

const cloneLayers = (layers: StudioLayer[]) => layers.map((layer) => ({ ...layer, keyframes: layer.keyframes.map((keyframe) => ({ ...keyframe, path: keyframe.path?.map((point) => ({ ...point })) })), lipSync: layer.lipSync?.map((event) => ({ ...event })) }))
const initialCamera: CameraKeyframe[] = [{ frame: 0, x: 0, y: 0, zoom: 1, tilt: 0 }]
const makeInitialScene = (id: string, name: string, layers: StudioLayer[]): StudioScene => ({ id, name, layers: cloneLayers(layers), audioTracks: [], bones: [], cameraKeyframes: [...initialCamera], totalFrames: 96, transition: 'cut' })
const initialScenes = [makeInitialScene('scene-1', 'Scene 1', initialLayers), makeInitialScene('scene-2', 'Scene 2', initialLayers), makeInitialScene('scene-3', 'Scene 3', initialLayers)]

function persistActiveScene(state: StudioState): StudioState {
  return { ...state, scenes: state.scenes.map((scene) => scene.id === state.activeSceneId ? { ...scene, layers: state.layers, audioTracks: state.audioTracks, bones: state.bones, cameraKeyframes: state.cameraKeyframes, totalFrames: state.totalFrames } : scene) }
}

export const useStudioStore = create<StudioState>((set) => ({
  currentFrame: 0,
  totalFrames: 96,
  fps: 24,
  isPlaying: false,
  layers: initialLayers,
  selectedLayerId: 'sun',
  activeTool: 'select',
  assets: [],
  audioTracks: [],
  bones: [],
  characterPresets: [
    { id: 'milo', name: 'Milo', description: 'Friendly 2D humanoid rig', accent: '#ef6f51' },
    { id: 'luna', name: 'Luna', description: 'Expressive 2D character rig', accent: '#9ed8c1' },
  ],
  scenes: initialScenes,
  activeSceneId: 'scene-1',
  cameraKeyframes: [...initialCamera],
  renderPass: { engine: 'BLENDER_EEVEE_NEXT', samples: 64, motionBlur: true, depthOfField: false },
  tts: { script: '', voice: 'female', pitch: 1, rate: 1, durationFrames: 0 },
  placementAssetId: null,
  placementCharacterPresetId: null,
  playbackSpeed: 1,
  loop: true,
  setCurrentFrame: (frame) => set((state) => ({ currentFrame: Math.max(0, Math.min(frame, state.totalFrames)) })),
  setFps: (fps) => set({ fps: Math.max(1, Math.min(fps, 60)) }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (isPlaying) => set({ isPlaying }),
  selectLayer: (id) => set({ selectedLayerId: id }),
  toggleLayerVisibility: (id) => set((state) => persistActiveScene({ ...state, layers: state.layers.map((layer) => layer.id === id ? { ...layer, visible: !layer.visible } : layer) })),
  toggleLayerLock: (id) => set((state) => persistActiveScene({ ...state, layers: state.layers.map((layer) => layer.id === id ? { ...layer, locked: !layer.locked } : layer) })),
  toggleAudioVisibility: (id) => set((state) => persistActiveScene({ ...state, audioTracks: state.audioTracks.map((track) => track.id === id ? { ...track, visible: !track.visible } : track) })),
  toggleAudioLock: (id) => set((state) => persistActiveScene({ ...state, audioTracks: state.audioTracks.map((track) => track.id === id ? { ...track, locked: !track.locked } : track) })),
  addBone: (bone) => set((state) => persistActiveScene({ ...state, bones: [...state.bones, bone] })),
  updateBone: (id, properties) => set((state) => persistActiveScene({ ...state, bones: state.bones.map((bone) => bone.id === id ? { ...bone, ...properties } : bone) })),
  setLayerBone: (layerId, boneId) => set((state) => persistActiveScene({ ...state, layers: state.layers.map((layer) => layer.id === layerId ? { ...layer, boneId } : layer) })),
  requestCharacterPlacement: (placementCharacterPresetId) => set({ placementCharacterPresetId }),
  addCharacterPreset: (presetId) => set((state) => {
    const preset = state.characterPresets.find((item) => item.id === presetId)
    if (!preset) return state
    const id = `${preset.id}-${Date.now()}`
    const root = `${id}-root`
    const head = `${id}-head`
    const armLeft = `${id}-arm-left`
    const armRight = `${id}-arm-right`
    const legLeft = `${id}-leg-left`
    const legRight = `${id}-leg-right`
    const bones: Bone[] = [
      { id: root, name: `${preset.name} torso`, x: 400, y: 280, length: 90, rotation: -90, visible: true, locked: false },
      { id: head, name: `${preset.name} head`, parentId: root, x: 0, y: 0, length: 48, rotation: 0, visible: true, locked: false },
      { id: armLeft, name: `${preset.name} arm L`, parentId: root, x: 0, y: 0, length: 75, rotation: 145, visible: true, locked: false },
      { id: armRight, name: `${preset.name} arm R`, parentId: root, x: 0, y: 0, length: 75, rotation: 35, visible: true, locked: false },
      { id: legLeft, name: `${preset.name} leg L`, parentId: root, x: 0, y: 0, length: 100, rotation: -155, visible: true, locked: false },
      { id: legRight, name: `${preset.name} leg R`, parentId: root, x: 0, y: 0, length: 100, rotation: -25, visible: true, locked: false },
    ]
    const characterLayer = (part: 'head' | 'torso' | 'limb', name: string, boneId: string, color: string): StudioLayer => ({ id: `${id}-${name.toLowerCase().replace(/ /g, '-')}`, name: `${preset.name} ${name}`, type: 'shape', visible: true, locked: false, color, boneId, characterPart: part, keyframes: [{ frame: state.currentFrame, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 }] })
    const layers = [characterLayer('head', 'Head', head, '#f1bd8e'), characterLayer('torso', 'Torso', root, preset.accent), characterLayer('limb', 'Arm L', armLeft, '#d6a477'), characterLayer('limb', 'Arm R', armRight, '#d6a477'), characterLayer('limb', 'Leg L', legLeft, '#344c62'), characterLayer('limb', 'Leg R', legRight, '#344c62')]
    return persistActiveScene({ ...state, bones: [...state.bones, ...bones], layers: [...layers, ...state.layers], placementCharacterPresetId: null, selectedLayerId: layers[0].id })
  }),
  generateLipSync: (layerId, durationFrames) => set((state) => persistActiveScene({ ...state, layers: state.layers.map((layer) => layer.id === layerId ? { ...layer, lipSync: createVisemeEvents(state.tts.script, durationFrames ?? state.tts.durationFrames) } : layer) })),
  setActiveTool: (activeTool) => set({ activeTool }),
  updateLayerProperties: (id, properties) => set((state) => persistActiveScene({ ...state, layers: state.layers.map((layer) => {
    if (layer.id !== id) return layer
    const keyframes = [...layer.keyframes]
    const frame = state.currentFrame
    const existingIndex = keyframes.findIndex((keyframe) => keyframe.frame === frame)
    const nextKeyframe = { ...(existingIndex >= 0 ? keyframes[existingIndex] : {}), frame, ...properties }
    if (existingIndex >= 0) keyframes[existingIndex] = nextKeyframe
    else keyframes.push(nextKeyframe)
    return { ...layer, keyframes: keyframes.sort((a, b) => a.frame - b.frame) }
  }) })),
  addKeyframe: (id, frame) => set((state) => persistActiveScene({ ...state, layers: state.layers.map((layer) => {
    const snappedFrame = snapFrame(frame)
    if (layer.id !== id || layer.keyframes.some((keyframe) => keyframe.frame === snappedFrame)) return layer
    const previous = [...layer.keyframes].reverse().find((keyframe) => keyframe.frame <= snappedFrame) ?? layer.keyframes[0] ?? { frame: snappedFrame }
    return { ...layer, keyframes: [...layer.keyframes, { ...previous, frame: snappedFrame }].sort((a, b) => a.frame - b.frame) }
  }) })),
  setKeyframeEasing: (id, frame, easing, customBezier) => set((state) => persistActiveScene({ ...state, layers: state.layers.map((layer) => {
    if (layer.id !== id) return layer
    const existing = layer.keyframes.find((keyframe) => keyframe.frame === frame)
    const next = existing ? { ...existing, easing, customBezier } : { frame, easing, customBezier }
    return { ...layer, keyframes: [...layer.keyframes.filter((keyframe) => keyframe.frame !== frame), next].sort((a, b) => a.frame - b.frame) }
  }) })),
  updatePathAtFrame: (id, path) => set((state) => persistActiveScene({ ...state, layers: state.layers.map((layer) => {
    if (layer.id !== id) return layer
    const frame = state.currentFrame
    const existing = layer.keyframes.find((keyframe) => keyframe.frame === frame)
    const next = { ...(existing ?? { frame }), path }
    return { ...layer, keyframes: [...layer.keyframes.filter((keyframe) => keyframe.frame !== frame), next].sort((a, b) => a.frame - b.frame) }
  }) })),
  addLayer: (layer) => set((state) => persistActiveScene({ ...state, layers: [layer, ...state.layers], selectedLayerId: layer.id })),
  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
  requestAssetPlacement: (placementAssetId) => set({ placementAssetId }),
  addAudioTrack: (assetId, options) => set((state) => {
    const asset = state.assets.find((item) => item.id === assetId)
    if (!asset || state.audioTracks.some((track) => track.assetId === assetId)) return state
    return persistActiveScene({ ...state, audioTracks: [...state.audioTracks, { id: `audio-${Date.now()}`, assetId, name: asset.name, startFrame: state.currentFrame, visible: true, locked: false, durationFrames: options?.durationFrames, kind: options?.kind ?? 'audio' }] })
  }),
  setTts: (tts) => set((state) => ({ tts: { ...state.tts, ...tts } })),
  setTotalFrames: (totalFrames) => set((state) => ({ totalFrames: Math.max(1, Math.round(totalFrames)), scenes: state.scenes.map((scene) => scene.id === state.activeSceneId ? { ...scene, totalFrames: Math.max(1, Math.round(totalFrames)) } : scene) })),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  toggleLoop: () => set((state) => ({ loop: !state.loop })),
  switchScene: (id) => set((state) => {
    const nextScene = state.scenes.find((scene) => scene.id === id)
    if (!nextScene) return state
    return {
      ...state,
      activeSceneId: nextScene.id,
      layers: cloneLayers(nextScene.layers),
      audioTracks: nextScene.audioTracks.map((track) => ({ ...track })),
      bones: nextScene.bones.map((bone) => ({ ...bone })),
      cameraKeyframes: nextScene.cameraKeyframes.map((keyframe) => ({ ...keyframe })),
      totalFrames: nextScene.totalFrames,
      currentFrame: Math.min(state.currentFrame, nextScene.totalFrames),
      selectedLayerId: nextScene.layers[0]?.id ?? state.selectedLayerId,
    }
  }),
  addScene: () => set((state) => {
    const nextIndex = state.scenes.length + 1
    const newSceneId = `scene-${nextIndex}`
    const snapshot = {
      id: newSceneId,
      name: `Scene ${nextIndex.toString().padStart(2, '0')}`,
      layers: cloneLayers(state.layers),
      audioTracks: state.audioTracks.map((track) => ({ ...track })),
      bones: state.bones.map((bone) => ({ ...bone })),
      cameraKeyframes: state.cameraKeyframes.map((keyframe) => ({ ...keyframe })),
      totalFrames: state.totalFrames,
      transition: 'cut' as const,
    }
    return { ...state, scenes: [...state.scenes, snapshot], activeSceneId: newSceneId, layers: cloneLayers(state.layers), audioTracks: state.audioTracks.map((track) => ({ ...track })), bones: state.bones.map((bone) => ({ ...bone })), cameraKeyframes: state.cameraKeyframes.map((keyframe) => ({ ...keyframe })), totalFrames: state.totalFrames, selectedLayerId: state.layers[0]?.id ?? state.selectedLayerId }
  }),
  duplicateScene: (id) => set((state) => {
    const sourceScene = state.scenes.find((scene) => scene.id === id)
    if (!sourceScene) return state
    const duplicated = {
      ...sourceScene,
      id: `${sourceScene.id}-copy-${Date.now()}`,
      name: `${sourceScene.name} Copy`,
      layers: cloneLayers(sourceScene.layers),
      audioTracks: sourceScene.audioTracks.map((track) => ({ ...track })),
      bones: sourceScene.bones.map((bone) => ({ ...bone })),
      cameraKeyframes: sourceScene.cameraKeyframes.map((keyframe) => ({ ...keyframe })),
    }
    const nextScenes = [...state.scenes, duplicated]
    return { ...state, scenes: nextScenes, activeSceneId: duplicated.id, layers: cloneLayers(duplicated.layers), audioTracks: duplicated.audioTracks.map((track) => ({ ...track })), bones: duplicated.bones.map((bone) => ({ ...bone })), cameraKeyframes: duplicated.cameraKeyframes.map((keyframe) => ({ ...keyframe })), totalFrames: duplicated.totalFrames, selectedLayerId: duplicated.layers[0]?.id ?? state.selectedLayerId }
  }),
  deleteScene: (id) => set((state) => {
    if (state.scenes.length <= 1) return state
    const remaining = state.scenes.filter((scene) => scene.id !== id)
    const nextScene = remaining.find((scene) => scene.id === state.activeSceneId && scene.id !== id) ?? remaining[0]
    return {
      ...state,
      scenes: remaining,
      activeSceneId: nextScene.id,
      layers: cloneLayers(nextScene.layers),
      audioTracks: nextScene.audioTracks.map((track) => ({ ...track })),
      bones: nextScene.bones.map((bone) => ({ ...bone })),
      cameraKeyframes: nextScene.cameraKeyframes.map((keyframe) => ({ ...keyframe })),
      totalFrames: nextScene.totalFrames,
      currentFrame: Math.min(state.currentFrame, nextScene.totalFrames),
      selectedLayerId: nextScene.layers[0]?.id ?? state.selectedLayerId,
    }
  }),
  reorderScene: (id, direction) => set((state) => {
    const index = state.scenes.findIndex((scene) => scene.id === id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= state.scenes.length) return state
    const nextScenes = [...state.scenes]
    ;[nextScenes[index], nextScenes[targetIndex]] = [nextScenes[targetIndex], nextScenes[index]]
    return { ...state, scenes: nextScenes }
  }),
  addCameraKeyframe: (frame) => set((state) => persistActiveScene({ ...state, cameraKeyframes: (() => {
    const snappedFrame = snapFrame(frame)
    const next = state.cameraKeyframes.find((keyframe) => keyframe.frame === snappedFrame)
    if (next) return state.cameraKeyframes
    const previous = [...state.cameraKeyframes].reverse().find((keyframe) => keyframe.frame <= snappedFrame) ?? state.cameraKeyframes[0] ?? { frame: snappedFrame, x: 0, y: 0, zoom: 1, tilt: 0 }
    return [...state.cameraKeyframes, { ...previous, frame: snappedFrame }].sort((a, b) => a.frame - b.frame)
  })() })),
  updateCameraAtFrame: (properties) => set((state) => persistActiveScene({ ...state, cameraKeyframes: (() => {
    const frame = state.currentFrame
    const existing = state.cameraKeyframes.find((keyframe) => keyframe.frame === frame)
    const next = { ...(existing ?? { frame, x: 0, y: 0, zoom: 1, tilt: 0 }), ...properties }
    return [...state.cameraKeyframes.filter((keyframe) => keyframe.frame !== frame), next].sort((a, b) => a.frame - b.frame)
  })() })),
  setRenderPass: (config) => set((state) => ({ ...state, renderPass: { ...state.renderPass, ...config } })),
}))

export const SNAP_INCREMENT = 4

export function snapFrame(frame: number) {
  return Math.max(0, Math.round(frame / SNAP_INCREMENT) * SNAP_INCREMENT)
}

function createVisemeEvents(script: string, durationFrames: number): VisemeEvent[] {
  const characters = [...script.toLowerCase()].filter((character) => /[a-z]/.test(character))
  if (!characters.length || !durationFrames) return [{ frame: 0, viseme: 'Rest', weight: 1 }]
  const events: VisemeEvent[] = []
  let previous: Viseme | null = null
  characters.forEach((character, index) => {
    const viseme: Viseme = character === 'a' ? 'A' : character === 'e' ? 'E' : character === 'i' ? 'I' : character === 'o' ? 'O' : character === 'u' ? 'U' : 'Rest'
    if (viseme === previous) return
    events.push({ frame: Math.round(index / characters.length * durationFrames), viseme, weight: viseme === 'Rest' ? 0.35 : 1 })
    previous = viseme
  })
  return events
}

export function interpolateLayerProperties(layer: StudioLayer, frame: number): LayerProperties {
  const keyframes = layer.keyframes
  if (!keyframes.length) return {}
  const before = [...keyframes].reverse().find((keyframe) => keyframe.frame <= frame) ?? keyframes[0]
  const after = keyframes.find((keyframe) => keyframe.frame >= frame) ?? before
  if (before.frame === after.frame) return before
  const amount = applyEasing((frame - before.frame) / (after.frame - before.frame), after.easing, after.customBezier)
  const interpolate = (key: keyof LayerProperties) => {
    const start = before[key] ?? after[key]
    const end = after[key] ?? before[key]
    return start === undefined || end === undefined ? undefined : start + (end - start) * amount
  }
  return { x: interpolate('x'), y: interpolate('y'), scaleX: interpolate('scaleX'), scaleY: interpolate('scaleY'), rotation: interpolate('rotation'), opacity: interpolate('opacity') }
}

function applyEasing(amount: number, easing: EasingType = 'linear', customBezier?: [number, number, number, number]) {
  if (easing === 'ease-in') return amount * amount
  if (easing === 'ease-out') return 1 - (1 - amount) * (1 - amount)
  if (easing === 'ease-in-out') return amount < 0.5 ? 2 * amount * amount : 1 - Math.pow(-2 * amount + 2, 2) / 2
  if (easing === 'elastic') return amount === 0 || amount === 1 ? amount : Math.pow(2, -10 * amount) * Math.sin((amount * 10 - 0.75) * (2 * Math.PI) / 3) + 1
  if (easing === 'bounce') { const n1 = 7.5625; const d1 = 2.75; let value = amount; if (value < 1 / d1) return n1 * value * value; if (value < 2 / d1) return n1 * (value -= 1.5 / d1) * value + 0.75; if (value < 2.5 / d1) return n1 * (value -= 2.25 / d1) * value + 0.9375; return n1 * (value -= 2.625 / d1) * value + 0.984375 }
  if (easing === 'custom' && customBezier) return cubicBezier(amount, customBezier)
  return amount
}

function cubicBezier(amount: number, points: [number, number, number, number]) {
  const [, y1, , y2] = points
  return 3 * (1 - amount) ** 2 * amount * y1 + 3 * (1 - amount) * amount ** 2 * y2 + amount ** 3
}

export function interpolatePath(layer: StudioLayer, frame: number): PathPoint[] {
  const keyframes = layer.keyframes.filter((keyframe) => keyframe.path)
  if (!keyframes.length) return []
  const before = [...keyframes].reverse().find((keyframe) => keyframe.frame <= frame) ?? keyframes[0]
  const after = keyframes.find((keyframe) => keyframe.frame >= frame) ?? before
  if (!before.path || !after.path) return []
  const amount = before.frame === after.frame ? 0 : applyEasing((frame - before.frame) / (after.frame - before.frame), after.easing, after.customBezier)
  return before.path.map((point, index) => {
    const end = after.path?.[index] ?? point
    const lerp = (start: number, finish: number) => start + (finish - start) * amount
    return { x: lerp(point.x, end.x), y: lerp(point.y, end.y), inHandle: point.inHandle && end.inHandle ? { x: lerp(point.inHandle.x, end.inHandle.x), y: lerp(point.inHandle.y, end.inHandle.y) } : point.inHandle, outHandle: point.outHandle && end.outHandle ? { x: lerp(point.outHandle.x, end.outHandle.x), y: lerp(point.outHandle.y, end.outHandle.y) } : point.outHandle }
  })
}