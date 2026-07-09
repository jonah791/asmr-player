export interface SubtitleEntry {
  start: number
  end: number
  text: string
}

export type SubtitleFormat = 'srt' | 'lrc' | 'vtt' | 'ass' | 'ssa' | 'txt'

/** 耳元方向 */
export type EarDirection = 'left' | 'right' | 'both' | 'center' | 'unknown'

/** 字幕情感/语气类型 */
export type SubtitleMood = 'normal' | 'whisper' | 'seductive' | 'command' | 'laugh' | 'intense' | 'sleepy' | 'action'

/** 动作/效果标注 */
export interface ActionAnnotation {
  type: 'se' | 'position' | 'perform' | 'action' | 'onomatopoeia'
  label: string
  icon?: string
}

/** 增强的子字幕条目 */
export interface EnhancedSubtitleEntry extends SubtitleEntry {
  character?: string
  characterColor?: string
  earDirection?: EarDirection
  mood?: SubtitleMood
  actions?: ActionAnnotation[]
  isOnomatopoeia?: boolean
}

/** 检测到的角色 */
export interface DetectedCharacter {
  name: string
  color: string
  avatarFile?: string
  mentionCount: number
}

/** 字幕轨 —— 增强版 */
export interface SubtitleTrack {
  file: string
  format: SubtitleFormat
  entries: EnhancedSubtitleEntry[]
  originalEntries: SubtitleEntry[]
  characters: DetectedCharacter[]
  language?: string
  label?: string
}

export interface Track {
  file: string
  title: string
  subtitles: string[]
}

export interface TreeNode {
  name: string
  path: string
  children: TreeNode[]
  isDir: boolean
  isSEVariant?: boolean
  isRoute?: boolean
  routeId?: string
  file?: string
  title?: string
  subtitles?: string[]
}

export interface Work {
  name: string
  path: string
  tracks: Track[]
  tree: TreeNode
  cover?: string
}

export type PlayMode = 'sequential' | 'repeat-one' | 'repeat-all' | 'shuffle'

export type EQPreset = 'flat' | 'vocal' | 'bass' | 'asmr' | 'custom'

export interface EQBand {
  frequency: number
  gain: number
  type: BiquadFilterType
}

export const EQ_PRESETS: Record<string, EQBand[]> = {
  flat: [
    { frequency: 32, gain: 0, type: 'lowshelf' },
    { frequency: 64, gain: 0, type: 'peaking' },
    { frequency: 125, gain: 0, type: 'peaking' },
    { frequency: 250, gain: 0, type: 'peaking' },
    { frequency: 500, gain: 0, type: 'peaking' },
    { frequency: 1000, gain: 0, type: 'peaking' },
    { frequency: 2000, gain: 0, type: 'peaking' },
    { frequency: 4000, gain: 0, type: 'peaking' },
    { frequency: 8000, gain: 0, type: 'peaking' },
    { frequency: 16000, gain: 0, type: 'highshelf' }
  ],
  vocal: [
    { frequency: 32, gain: -2, type: 'lowshelf' },
    { frequency: 64, gain: -1, type: 'peaking' },
    { frequency: 125, gain: 0, type: 'peaking' },
    { frequency: 250, gain: 2, type: 'peaking' },
    { frequency: 500, gain: 3, type: 'peaking' },
    { frequency: 1000, gain: 4, type: 'peaking' },
    { frequency: 2000, gain: 3, type: 'peaking' },
    { frequency: 4000, gain: 2, type: 'peaking' },
    { frequency: 8000, gain: 1, type: 'peaking' },
    { frequency: 16000, gain: 0, type: 'highshelf' }
  ],
  bass: [
    { frequency: 32, gain: 6, type: 'lowshelf' },
    { frequency: 64, gain: 5, type: 'peaking' },
    { frequency: 125, gain: 3, type: 'peaking' },
    { frequency: 250, gain: 1, type: 'peaking' },
    { frequency: 500, gain: 0, type: 'peaking' },
    { frequency: 1000, gain: -1, type: 'peaking' },
    { frequency: 2000, gain: -2, type: 'peaking' },
    { frequency: 4000, gain: -2, type: 'peaking' },
    { frequency: 8000, gain: -1, type: 'peaking' },
    { frequency: 16000, gain: 0, type: 'highshelf' }
  ],
  asmr: [
    { frequency: 32, gain: -4, type: 'lowshelf' },
    { frequency: 64, gain: -2, type: 'peaking' },
    { frequency: 125, gain: 0, type: 'peaking' },
    { frequency: 250, gain: 2, type: 'peaking' },
    { frequency: 500, gain: 3, type: 'peaking' },
    { frequency: 1000, gain: 4, type: 'peaking' },
    { frequency: 2000, gain: 5, type: 'peaking' },
    { frequency: 4000, gain: 4, type: 'peaking' },
    { frequency: 8000, gain: 3, type: 'peaking' },
    { frequency: 16000, gain: 2, type: 'highshelf' }
  ]
}

export interface PlaySettings {
  volume: number
  channelLeft: number
  channelRight: number
  eqBands: EQBand[]
  eqPreset: EQPreset
  playMode: PlayMode
  subtitleEnabled: boolean
  subtitleFontSize: number
  subtitleOpacity: number
  subtitleBackground: 'transparent' | 'semi' | 'blur'
  subtitleShowEarDirection: boolean
  subtitleShowCharacterName: boolean
  subtitleShowActions: boolean
  subtitleCharacterColors: Record<string, string>
  subtitlePosition: 'bottom' | 'top'
}

export const DEFAULT_CHARACTER_COLORS = [
  '#7c5cbf', '#e55', '#4af', '#fa4', '#5e5', '#f4a', '#af5', '#5af'
]

export interface TrackWithWork {
  track: Track
  workName: string
  workPath: string
  workCover?: string
}

export interface ElectronAPI {
  openFiles: () => Promise<Work[]>
  scanFolderDrop: (paths: string[]) => Promise<Work[]>
  scanDefaultPaths: () => Promise<Work[]>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  readTextFile: (path: string) => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
