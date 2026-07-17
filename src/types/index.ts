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
  streamUrl?: string       // 远程流媒体 URL（ASMR.one 在线播放）
}

export interface ElectronAPI {
  openFiles: () => Promise<Work[]>
  scanFolderDrop: (paths: string[]) => Promise<Work[]>
  scanDefaultPaths: () => Promise<Work[]>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  readTextFile: (path: string) => Promise<string | null>
  // ─── ASMR.one API ───
  asmrLogin: (config: ASMRConfig) => Promise<{ success: boolean; error?: string }>
  asmrSearch: (keyword: string, page: number, subtitleOnly?: boolean) => Promise<KikoeruWorksResponse>
  asmrGetWorks: (page: number, order?: string, sort?: string, subtitleOnly?: boolean) => Promise<KikoeruWorksResponse>
  asmrGetWorkDetail: (workId: number) => Promise<KikoeruWork>
  asmrGetTracks: (workId: number) => Promise<KikoeruTrackNode[]>
  asmrGetCoverUrl: (workId: number) => Promise<string>
  asmrStartDownload: (workId: number, trackIndex: number, destDir: string) => Promise<{ taskId: string }>
  asmrCancelDownload: (taskId: string) => Promise<void>
  asmrGetDownloadProgress: (taskId: string) => Promise<DownloadProgress | null>
  asmrGetAllDownloads: () => Promise<DownloadTask[]>
  onDownloadProgress: (callback: (progresses: DownloadProgress[]) => void) => () => void
  asmrGetConfig: () => Promise<ASMRConfig | null>
  asmrSaveConfig: (config: ASMRConfig) => Promise<void>
  asmrLogout: () => Promise<void>
}

// ─── ASMR.one / Kikoeru API 类型 ─────────────────────────────────────

/** ASMR.one 服务器连接配置 */
export interface ASMRConfig {
  serverUrl: string        // 例如 https://asmr.one
  token: string            // JWT token
  username?: string
  isOfficial: boolean      // true=ASMR.one, false=自建 kikoeru
  guestMode?: boolean      // true=游客模式，无需登录
}

/** API 返回的声优信息 */
export interface KikoeruVA {
  id: string | number
  name: string
}

/** API 返回的标签信息 */
export interface KikoeruTag {
  id: number
  name: string
  upvote?: number
  downvote?: number
  myVote?: number | null
  voteStatus?: number | null
}

/** API 返回的作品条目 */
export interface KikoeruWork {
  id: number
  title: string
  circle_id: number
  name: string               // 社团名
  vas: KikoeruVA[]
  tags: KikoeruTag[]
  nsfw?: boolean
  age_category_string?: string
  release: string            // 日期 "2026-04-22"
  create_date?: string       // 入库日期
  dl_count: number
  price: number
  review_count: number
  rate_count: number
  rate_average_2dp: number
  rate_count_detail?: { review_point: number; count: number; ratio: number }[]
  has_subtitle: boolean
  duration: number           // 秒
  progress?: string
  userRating?: number | null
  // 封面 URL（官方 API 返回完整 URL）
  mainCoverUrl?: string
  samCoverUrl?: string
  thumbnailCoverUrl?: string
  description?: string
  source_url?: string
  source_id?: string         // 例如 "RJ01611156"
  source_type?: string
  circle?: { id: number; name: string; source_id: string; source_type: string }
  translation_info?: {
    lang?: string
    is_child?: boolean
    is_parent?: boolean
    is_original?: boolean
  }
  other_language_editions_in_db?: {
    id: number; lang: string; title: string; source_id: string
    is_original: boolean; source_type: string
  }[]
}

/** API 分页信息 */
export interface KikoeruPagination {
  currentPage: number
  pageSize: number
  totalCount: number
}

/** /api/works 和 /api/search 的返回结构 */
export interface KikoeruWorksResponse {
  works: KikoeruWork[]
  pagination: KikoeruPagination
}

/** 曲目树节点 (tracks 接口) */
export interface KikoeruTrackNode {
  title: string
  type: 'folder' | 'audio' | 'image' | 'text'
  hash?: string
  size?: number
  duration?: number
  subtitle?: string
  children?: KikoeruTrackNode[]
  work?: { id: number; source_id: string; source_type: string }
  workTitle?: string
  mediaStreamUrl?: string    // 流媒体播放 URL
  mediaDownloadUrl?: string  // 下载 URL
  streamLowQualityUrl?: string  // 低清流
}

/** 登录请求 */
export interface KikoeruLoginRequest {
  name: string
  password: string
  recommenderUuid?: string   // ASMR.one 注册时需要
}

/** 登录响应 */
export interface KikoeruLoginResponse {
  token: string
}

/** 用户信息 */
export interface KikoeruUser {
  user: { name: string; group: string }
  auth: boolean
}

// ─── 下载管理类型 ────────────────────────────────────────────────

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'error'

export interface DownloadTask {
  id: string
  workId: number
  workTitle: string
  trackIndex: number
  trackTitle: string
  url: string
  destPath: string
  totalBytes: number
  receivedBytes: number
  status: DownloadStatus
  error?: string
}

export interface DownloadProgress {
  taskId: string
  receivedBytes: number
  totalBytes: number
  speed: number           // bytes/s
  progress: number        // 0-1
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
