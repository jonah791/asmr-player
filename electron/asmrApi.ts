import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { app, BrowserWindow, session } from 'electron'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { HttpProxyAgent } from 'http-proxy-agent'

// ─── 代理设置 ────────────────────────────────────────────────

/** 读取代理配置：优先环境变量 */
function detectProxy(): { http?: string; https?: string } {
  const p = process.env.HTTPS_PROXY || process.env.https_proxy
        || process.env.HTTP_PROXY || process.env.http_proxy
        || process.env.ALL_PROXY || process.env.all_proxy || ''
  return p ? { https: p, http: p } : {}
}

const proxyConfig = detectProxy()

/** 创建代理 agent（用于 http/https 模块或 undici） */
function createProxyAgent(url: string): https.Agent | http.Agent | undefined {
  const urlObj = new URL(url)
  const isHttps = urlObj.protocol === 'https:'
  const proxyUrl = proxyConfig.https || proxyConfig.http
  if (!proxyUrl) return undefined
  return isHttps
    ? new HttpsProxyAgent(proxyUrl)
    : new HttpProxyAgent(proxyUrl)
}

/** 配置 Electron Chromium 网络栈的代理 */
function setupElectronProxy(): void {
  const proxyUrl = proxyConfig.https || proxyConfig.http
  if (!proxyUrl) return
  try {
    app.commandLine.appendSwitch('proxy-server', proxyUrl)
  } catch { /* ignore */ }
  try {
    session.defaultSession.setProxy({
      proxyRules: proxyUrl,
      proxyBypassRules: process.env.NO_PROXY || process.env.no_proxy || undefined,
    }).catch(() => {})
  } catch { /* ignore */ }
}

// ─── 类型定义（主进程用，避免依赖 src/types） ────────────────────

interface ASMRConfig {
  serverUrl: string
  token: string
  username?: string
  isOfficial: boolean
  guestMode?: boolean
}

interface KikoeruVA { id: string | number; name: string }
interface KikoeruTag { id: number; name: string; upvote?: number; downvote?: number }
interface KikoeruWork {
  id: number; title: string; circle_id: number; name: string
  vas: KikoeruVA[]; tags: KikoeruTag[]; age: string; release: string
  dl_count: number; price: number; review_count: number; rate_count: number
  rate_average_2dp: number; has_subtitle: boolean; duration: number
  progress?: string; userRating?: number
  images: string[]; description?: string; source_url?: string; source_id?: string
}
interface KikoeruPagination { currentPage: number; pageSize: number; totalCount: number }
interface KikoeruWorksResponse { works: KikoeruWork[]; pagination: KikoeruPagination }
interface KikoeruTrackNode {
  title: string; type: string; hash?: string; size?: number
  duration?: number; subtitle?: string; children?: KikoeruTrackNode[]
  work?: { id: number; source_id: string; source_type: string }
  workTitle?: string; mediaStreamUrl?: string; mediaDownloadUrl?: string
  streamLowQualityUrl?: string
}
interface DownloadTask {
  id: string; workId: number; workTitle: string; trackIndex: number
  trackTitle: string; url: string; destPath: string
  totalBytes: number; receivedBytes: number
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error'
  error?: string
}
interface DownloadProgress {
  taskId: string; receivedBytes: number; totalBytes: number; speed: number; progress: number
}

// ─── 配置持久化 ───────────────────────────────────────────────

function configPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'asmr-config.json')
}

function loadConfig(): ASMRConfig | null {
  try {
    const p = configPath()
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch { /* ignore */ }
  return null
}

function saveConfig(config: ASMRConfig): void {
  const p = configPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(config, null, 2), 'utf-8')
}

function clearConfig(): void {
  try { fs.unlinkSync(configPath()) } catch { /* ignore */ }
}

// ─── 下载任务持久化 ──────────────────────────────────────────

function downloadsPath(): string {
  return path.join(app.getPath('userData'), 'asmr-downloads.json')
}

function loadDownloads(): DownloadTask[] {
  try {
    const p = downloadsPath()
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch { /* ignore */ }
  return []
}

function saveDownloads(tasks: DownloadTask[]): void {
  const p = downloadsPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(tasks, null, 2), 'utf-8')
}

// ─── ASMR.one API 客户端 ─────────────────────────────────────

class ASMRClient {
  private config: ASMRConfig | null = null
  private abortControllers = new Map<string, AbortController>()
  private mainWindow: BrowserWindow | null = null

  // 官方 API 备选域名
  private static readonly OFFICIAL_HOSTS = [
    'https://api.asmr-200.com',
    'https://api.asmr.one',
    'https://api.asmr-100.com',
    'https://api.asmr-300.com',
  ]

  constructor() {
    // 如果配置了代理，替换全局 fetch 为代理版
    if (proxyConfig.https || proxyConfig.http) {
      this.patchGlobalFetch()
    }
  }

  /** 用 https-proxy-agent 替换全局 fetch，使所有请求自动走代理 */
  private patchGlobalFetch(): void {
    const self = this
    const originalFetch = globalThis.fetch
    globalThis.fetch = async function proxyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input
        : input instanceof URL ? input.href
        : input.url
      const agent = createProxyAgent(url)
      if (!agent) return originalFetch(input, init)

      // 用 http/https 模块 + proxy agent 替代 fetch
      return new Promise((resolve, reject) => {
        const u = new URL(url)
        const mod = u.protocol === 'https:' ? https : http
        const method = init?.method || 'GET'
        const headers: Record<string, string> = {}
        if (init?.headers) {
          const h = init.headers as Record<string, string>
          for (const k of Object.keys(h)) headers[k] = h[k]
        }

        const req = mod.request({
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname + u.search,
          method,
          agent,
          headers,
          rejectUnauthorized: false,
        }, (res) => {
          const chunks: Buffer[] = []
          res.on('data', (c: Buffer) => chunks.push(c))
          res.on('end', () => {
            const body = Buffer.concat(chunks)
            resolve({
              ok: res.statusCode! >= 200 && res.statusCode! < 300,
              status: res.statusCode || 200,
              statusText: res.statusMessage || '',
              headers: new Headers(res.headers as Record<string, string>),
              json: () => JSON.parse(body.toString('utf-8')),
              text: () => body.toString('utf-8'),
              arrayBuffer: () => Promise.resolve(body.buffer as ArrayBuffer),
              blob: () => Promise.resolve(new Blob([body])),
              body: null, bodyUsed: true, redirected: false,
              type: 'basic' as const, url,
              clone: () => ({}) as unknown as Response,
            } as unknown as Response)
          })
        })
        req.on('error', reject)

        // 处理 POST body
        if (init?.body) {
          req.write(init.body as string | Buffer)
        }
        req.end()

        // 处理 AbortSignal
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            req.destroy()
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }
      })
    }
  }

  setMainWindow(win: BrowserWindow) { this.mainWindow = win }

  private get baseUrl(): string {
    return this.config?.serverUrl?.replace(/\/+$/, '') || ASMRClient.OFFICIAL_HOSTS[0]
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    // 游客模式也发送请求，只是不携带 Authorization
    if (this.config?.token && !this.config?.guestMode) h['Authorization'] = `Bearer ${this.config.token}`
    return h
  }

  /** 检查是否已登录或游客模式 */
  isLoggedIn(): boolean {
    return !!this.config?.token || !!this.config?.guestMode
  }

  /** 获取当前配置 */
  getConfig(): ASMRConfig | null {
    return this.config
  }

  /** 初始化：从磁盘加载配置 + 配置代理 */
  init(): ASMRConfig | null {
    this.config = loadConfig()
    setupElectronProxy()
    return this.config
  }

  /** 登录：验证凭据并保存配置（游客模式先测试连接） */
  async login(config: ASMRConfig): Promise<{ success: boolean; error?: string }> {
    // 游客模式：先测试 API 连通性
    if (config.guestMode) {
      const hosts = config.isOfficial
        ? [config.serverUrl.replace(/\/+$/, ''), ...ASMRClient.OFFICIAL_HOSTS.filter(h => !h.includes(config.serverUrl))]
        : [config.serverUrl.replace(/\/+$/, '')]

      let lastErr = ''
      for (const host of hosts.slice(0, 3)) { // 最多试 3 个
        try {
          const testUrl = `${host}/api/works?page=1&pageSize=1`
          const res = await fetch(testUrl, { signal: AbortSignal.timeout(8000) })
          const ct = res.headers.get('content-type') || ''
          if (!ct.includes('application/json')) continue
          this.config = { ...config, serverUrl: host, token: '', guestMode: true }
          saveConfig(this.config)
          return { success: true }
        } catch (e: any) {
          lastErr = e.cause?.code || e.name || e.message || String(e)
          // 继续尝试下一个域名
        }
      }
      return {
        success: false,
        error: `无法连接到 ASMR.one 服务器。\n请确认：\n1. 网络能访问外网（可能需要 VPN/代理）\n2. 尝试在浏览器打开 ${ASMRClient.OFFICIAL_HOSTS[0]}/api/works\n\n详细错误: ${lastErr || '未知'}`
      }
    }
    try {
      const res = await fetch(`${config.serverUrl}/api/auth/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: config.username, password: config.token })
      })
      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: `登录失败 (${res.status}): ${text}` }
      }
      const data = await res.json()
      if (!data.token) {
        return { success: false, error: '服务器未返回 token' }
      }
      // 自建服务器 token 字段不同
      const token = data.token || data.access_token
      this.config = { ...config, token, isOfficial: config.isOfficial ?? true }
      saveConfig(this.config!)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: `连接失败: ${e.message || e}` }
    }
  }

  /** 登出 */
  logout(): void {
    this.config = null
    clearConfig()
  }

  /** 通用请求 */
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    const res = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...(options?.headers || {}) },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API 错误 ${res.status}: ${text.slice(0, 200)}`)
    }
    return res.json()
  }

  /** 获取作品列表 */
  async getWorks(page = 1, order = 'release', sort = 'desc'): Promise<KikoeruWorksResponse> {
    const params = new URLSearchParams({ page: String(page), order, sort })
    return this.request<KikoeruWorksResponse>(`/api/works?${params}`)
  }

  /** 搜索作品 */
  async search(keyword: string, page = 1): Promise<KikoeruWorksResponse> {
    const params = new URLSearchParams({ keyword, page: String(page) })
    return this.request<KikoeruWorksResponse>(`/api/search?${params}`)
  }

  /** 获取作品详情 */
  async getWorkDetail(workId: number): Promise<KikoeruWork> {
    return this.request<KikoeruWork>(`/api/work/${workId}`)
  }

  /** 获取曲目列表 */
  async getTracks(workId: number): Promise<KikoeruTrackNode[]> {
    return this.request<KikoeruTrackNode[]>(`/api/tracks/${workId}`)
  }

  /** 获取封面 URL（官方 API 返回 mainCoverUrl 字段，不需要构造） */
  getCoverUrl(_workId: number): string {
    return ''  // 使用 work.mainCoverUrl 字段
  }

  // ─── 下载管理 ──────────────────────────────────────────────

  private tasks: DownloadTask[] = []
  private activeDownloads = new Map<string, { controller: AbortController; lastBytes: number; lastTime: number; speed: number }>()

  /** 获取所有下载任务 */
  getAllDownloads(): DownloadTask[] {
    return this.tasks
  }

  /** 开始下载一个音轨 */
  async startDownload(
    workId: number, workTitle: string, trackIndex: number, destDir: string
  ): Promise<{ taskId: string }> {
    const tracks = await this.getTracks(workId)
    const audioTracks = this.flattenAudioTracks(tracks)
    const track = audioTracks[trackIndex]
    if (!track) throw new Error(`未找到索引 ${trackIndex} 的音轨`)

    // 优先使用 mediaDownloadUrl，其次使用 mediaStreamUrl
    const fileUrl = track.mediaDownloadUrl || track.mediaStreamUrl
    if (!fileUrl) throw new Error('该音轨没有可用的下载地址')

    const safeTitle = track.title.replace(/[<>:"/\\|?*]/g, '_')
    const destPath = path.join(destDir, safeTitle)

    const taskId = `dl_${workId}_${trackIndex}_${Date.now()}`
    const task: DownloadTask = {
      id: taskId, workId, workTitle, trackIndex,
      trackTitle: track.title, url: fileUrl, destPath,
      totalBytes: 0, receivedBytes: 0, status: 'queued'
    }
    this.tasks.push(task)
    saveDownloads(this.tasks)
    this.notifyProgress()

    // 异步开始下载
    this.doDownload(task).catch(e => {
      task.status = 'error'
      task.error = e.message
      saveDownloads(this.tasks)
      this.notifyProgress()
    })

    return { taskId }
  }

  /** 实际执行下载 */
  private async doDownload(task: DownloadTask): Promise<void> {
    const controller = new AbortController()
    this.abortControllers.set(task.id, controller)
    const info = { controller, lastBytes: 0, lastTime: Date.now(), speed: 0 }
    this.activeDownloads.set(task.id, info)

    try {
      task.status = 'downloading'
      this.notifyProgress()

      const res = await fetch(task.url, {
        headers: this.headers,
        signal: controller.signal
      })
      if (!res.ok) throw new Error(`下载失败 (${res.status})`)
      if (!res.body) throw new Error('响应无 body')

      const total = Number(res.headers.get('content-length') || '0')
      task.totalBytes = total

      const destDir = path.dirname(task.destPath)
      fs.mkdirSync(destDir, { recursive: true })
      const fileStream = fs.createWriteStream(task.destPath)

      const reader = res.body.getReader()
      let received = 0

      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read()
        if (done) {
          fileStream.close()
          task.status = 'completed'
          task.receivedBytes = received
          saveDownloads(this.tasks)
          this.notifyProgress()
          this.activeDownloads.delete(task.id)
          this.abortControllers.delete(task.id)
          return
        }
        received += value.length
        task.receivedBytes = received
        fileStream.write(Buffer.from(value))

        // 每 200ms 通知一次进度
        const now = Date.now()
        if (now - info.lastTime > 200) {
          info.speed = (received - info.lastBytes) / ((now - info.lastTime) / 1000)
          info.lastBytes = received
          info.lastTime = now
          this.notifyProgress()
        }

        await pump()
      }
      await pump()
    } catch (e: any) {
      if (e.name === 'AbortError') {
        task.status = 'paused'
      } else {
        task.status = 'error'
        task.error = e.message
      }
      saveDownloads(this.tasks)
      this.notifyProgress()
      this.activeDownloads.delete(task.id)
      this.abortControllers.delete(task.id)
    }
  }

  /** 取消/暂停下载 */
  cancelDownload(taskId: string): void {
    const controller = this.abortControllers.get(taskId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(taskId)
    }
    const task = this.tasks.find(t => t.id === taskId)
    if (task && task.status === 'queued') {
      task.status = 'paused'
      saveDownloads(this.tasks)
      this.notifyProgress()
    }
  }

  /** 获取单个下载进度 */
  getDownloadProgress(taskId: string): DownloadProgress | null {
    const task = this.tasks.find(t => t.id === taskId)
    if (!task) return null
    return {
      taskId: task.id,
      receivedBytes: task.receivedBytes,
      totalBytes: task.totalBytes,
      speed: this.activeDownloads.get(taskId)?.speed || 0,
      progress: task.totalBytes > 0 ? task.receivedBytes / task.totalBytes : 0
    }
  }

  /** 通知渲染进程下载进度更新 */
  private notifyProgress(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('asmr-download-progress', this.tasks.map(t => ({
        taskId: t.id,
        receivedBytes: t.receivedBytes,
        totalBytes: t.totalBytes,
        speed: this.activeDownloads.get(t.id)?.speed || 0,
        progress: t.totalBytes > 0 ? t.receivedBytes / t.totalBytes : 0
      } as DownloadProgress)))
    }
  }

  /** 加载持久化的下载任务 */
  loadPersistedDownloads(): void {
    this.tasks = loadDownloads()
  }

  /** 压平曲目树，只取音频文件 */
  private flattenAudioTracks(nodes: KikoeruTrackNode[], depth = 0): KikoeruTrackNode[] {
    const result: KikoeruTrackNode[] = []
    for (const node of nodes) {
      if (node.type === 'audio') result.push(node)
      if (node.children && depth < 3) result.push(...this.flattenAudioTracks(node.children, depth + 1))
    }
    return result
  }
}

// ─── 单例导出 ────────────────────────────────────────────────

export const asmrClient = new ASMRClient()
