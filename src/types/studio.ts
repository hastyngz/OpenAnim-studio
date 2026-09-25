export type LayerType = 'shape' | 'text' | 'image' | 'path'
export type DrawingTool = 'select' | 'rectangle' | 'circle' | 'text' | 'pen' | 'bone' | 'camera'
export type AssetType = 'image' | 'svg' | 'audio'
export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'elastic' | 'bounce' | 'custom'
export type Viseme = 'A' | 'E' | 'I' | 'O' | 'U' | 'Rest'
export type CharacterPart = 'head' | 'torso' | 'limb'

export interface PathPoint {
  x: number
  y: number
  inHandle?: { x: number, y: number }
  outHandle?: { x: number, y: number }
}

export interface VisemeEvent {
  frame: number
  viseme: Viseme
  weight: number
}

export interface Keyframe {
  frame: number
  easing?: EasingType
  customBezier?: [number, number, number, number]
  path?: PathPoint[]
  x?: number
  y?: number
  scaleX?: number
  scaleY?: number
  rotation?: number
  opacity?: number
  depth?: number
}

export interface StudioLayer {
  id: string
  name: string
  type: LayerType
  visible: boolean
  locked: boolean
  color: string
  keyframes: Keyframe[]
  boneId?: string
  characterPart?: CharacterPart
  lipSync?: VisemeEvent[]
  depth?: number
}

export interface CameraKeyframe {
  frame: number
  x: number
  y: number
  zoom: number
  tilt: number
}

export interface StudioScene {
  id: string
  name: string
  layers: StudioLayer[]
  audioTracks: AudioTrack[]
  bones: Bone[]
  cameraKeyframes: CameraKeyframe[]
  totalFrames: number
  transition: 'cut' | 'fade' | 'dissolve'
}

export interface RenderPassConfig {
  engine: 'BLENDER_EEVEE_NEXT' | 'CYCLES'
  samples: number
  motionBlur: boolean
  depthOfField: boolean
}

export interface Bone {
  id: string
  name: string
  parentId?: string
  x: number
  y: number
  length: number
  rotation: number
  visible: boolean
  locked: boolean
}

export interface CharacterPreset {
  id: string
  name: string
  description: string
  accent: string
}

export interface StudioAsset {
  id: string
  name: string
  type: AssetType
  mimeType: string
  url: string
  size: number
}

export interface AudioTrack {
  id: string
  assetId: string
  name: string
  startFrame: number
  visible: boolean
  locked: boolean
  durationFrames?: number
  kind?: 'audio' | 'tts'
}

export interface FrameState {
  currentFrame: number
  totalFrames: number
  fps: number
  isPlaying: boolean
  playbackSpeed: 0.5 | 1 | 2
  loop: boolean
}

export interface TtsState {
  script: string
  voice: 'male' | 'female'
  pitch: number
  rate: number
  durationFrames: number
}

export type LayerProperties = Pick<Keyframe, 'x' | 'y' | 'scaleX' | 'scaleY' | 'rotation' | 'opacity'>