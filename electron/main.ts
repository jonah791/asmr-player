import { app, BrowserWindow, ipcMain, dialog, screen, session } from 'electron'
import path from 'path'
import fs from 'fs'
import { parseFile } from 'music-metadata'
import { asmrClient } from './asmrApi'

let mainWindow: BrowserWindow | null = null

// ─── 代理配置（在 app ready 之前设置 Chromium 代理） ────────
const proxyVar = process.env.HTTPS_PROXY || process.env.https_proxy
  || process.env.HTTP_PROXY || process.env.http_proxy
  || process.env.ALL_PROXY || process.env.all_proxy || ''
if (proxyVar) {
  app.commandLine.appendSwitch('proxy-server', proxyVar)
  const noProxy = process.env.NO_PROXY || process.env.no_proxy || ''
  if (noProxy) app.commandLine.appendSwitch('proxy-bypass-rules', noProxy)
}

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.wma', '.aac'])
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.lrc', '.vtt', '.ass', '.ssa'])
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.webp'])

interface ScannedTrack {
  file: string
  title: string
  subtitles: string[]
  cover?: string
}

interface ScannedTreeNode {
  name: string
  path: string
  children: ScannedTreeNode[]
  isDir: boolean
  isSEVariant?: boolean
  isRoute?: boolean
  routeId?: string
  file?: string
  title?: string
  subtitles?: string[]
}

function isAudioFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase()
  return AUDIO_EXTENSIONS.has(ext)
}

function isSubtitleFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase()
  return SUBTITLE_EXTENSIONS.has(ext)
}

function isImageFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase()
  return IMAGE_EXTENSIONS.has(ext)
}

const SE_VARIANT_PATTERNS = [/无效果音/, /無効果音/, /无音效/, /無音效/, /SE無し/, /効果音無し/, /mp3版/, /圧縮/, /压缩/, /無音/, /no.?se/i]
const ROUTE_PATTERNS = [/【[ABC]路线/, /[ABC]ルート/, /ルート[ABC]/, /[ABC]路線/, /^[ABC]$/]

function detectSEVariant(dirName: string): boolean {
  return SE_VARIANT_PATTERNS.some(p => p.test(dirName))
}

function detectRoute(dirName: string): { isRoute: boolean; routeId?: string } {
  const m = dirName.match(/[ABC]/)
  if (m && ROUTE_PATTERNS.some(p => p.test(dirName))) {
    return { isRoute: true, routeId: m[0] }
  }
  return { isRoute: false }
}

function scanAllImages(dirPath: string, depth = 0): string[] {
  if (depth > 4) return []
  const results: string[] = []
  try {
    const entries = fs.readdirSync(dirPath)
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        results.push(...scanAllImages(fullPath, depth + 1))
      } else if (isImageFile(entry)) {
        results.push(fullPath)
      }
    }
  } catch { }
  return results
}

function findCoverImage(dirPath: string): string | undefined {
  try {
    const imageFiles = scanAllImages(dirPath)
    if (imageFiles.length === 0) return undefined
    const coverKeywords = ['封面', 'cover', 'ロゴ', 'メイン', 'main', '插画', 'イラスト', 'logo', '插图', 'キービジュ', '表紙']
    for (const kw of coverKeywords) {
      const found = imageFiles.find(f => path.basename(f).toLowerCase().includes(kw))
      if (found) return found
    }
    return imageFiles[0]
  } catch { }
  return undefined
}

// ─── 内嵌字幕提取 ─────────────────────────────────────────

/** 从音频文件中提取内嵌歌词/字幕（ID3v2 SYLT/USLT），另存为 .lrc 文件 */
async function extractEmbeddedLyrics(audioFile: string): Promise<string | null> {
  try {
    const ext = path.extname(audioFile).toLowerCase()
    if (ext !== '.mp3' && ext !== '.wav' && ext !== '.flac' && ext !== '.m4a') return null

    const metadata = await parseFile(audioFile, {
      duration: false,
      skipCovers: true,
      skipPostHeaders: true,
    })

    const lyrics = metadata.common?.lyrics
    if (!lyrics || !Array.isArray(lyrics) || lyrics.length === 0) return null

    for (const entry of lyrics) {
      // 只处理同步歌词（SYLT, timeStampFormat = milliseconds）
      if (entry.syncText && entry.syncText.length > 0 && entry.timeStampFormat === 2) {
        // 过滤：跳过所有时间戳为 0 的无效数据
        const valid = entry.syncText.filter(s => s.timestamp !== undefined && s.timestamp > 0)
        if (valid.length === 0) return null
        return writeLrcFile(audioFile, valid)
      }
    }

    // 没有同步歌词 → 不提取（纯文本无法做字幕时间轴）
    return null
  } catch {
    return null  // 静默失败，不影响扫描
  }
}

/** 将同步歌词写入 .lrc 缓存文件 */
function writeLrcFile(audioFile: string, syncData: { text: string; timestamp?: number }[]): string {
  const cacheDir = path.join(app.getPath('userData'), 'embedded-lyrics')
  fs.mkdirSync(cacheDir, { recursive: true })

  const audioName = path.basename(audioFile, path.extname(audioFile))
  const lrcPath = path.join(cacheDir, `${audioName}.embedded.lrc`)

  // 如果缓存文件已存在且比音频文件新，直接返回
  try {
    const audioStat = fs.statSync(audioFile)
    const lrcStat = fs.statSync(lrcPath)
    if (lrcStat.mtimeMs >= audioStat.mtimeMs) return lrcPath
  } catch { /* 缓存不存在，重新生成 */ }

  // 生成 LRC 内容
  const lines: string[] = []
  lines.push('[ti:' + audioName + ']')
  lines.push('[re:ASMR Player embedded]')

  for (const { text, timestamp: ts } of syncData) {
    const t: number = ts ?? 0
    const mins = Math.floor(t / 60000)
    const secs = Math.floor((t % 60000) / 1000)
    const ms = Math.floor(t % 1000)
    const timestamp = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}]`
    lines.push(timestamp + text)
  }

  fs.writeFileSync(lrcPath, lines.join('\n'), 'utf-8')
  return lrcPath
}

async function scanDirectoryTree(dirPath: string, depth = 0): Promise<ScannedTreeNode> {
  const name = path.basename(dirPath)
  const node: ScannedTreeNode = { name, path: dirPath, children: [], isDir: true }
  const seVariant = detectSEVariant(name)
  if (seVariant) { node.isSEVariant = true; return node }
  const routeInfo = detectRoute(name)
  if (routeInfo.isRoute) { node.isRoute = true; node.routeId = routeInfo.routeId }

  if (depth > 5) return node
  try {
    const entries = fs.readdirSync(dirPath)
    const audioMap = new Map<string, { file: string; subtitles: string[] }>()

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) continue
      const ext = path.extname(entry).toLowerCase()
      if (isAudioFile(entry)) {
        const baseName = path.basename(entry, ext).replace(/\.wav$/i, '')
        if (!audioMap.has(baseName)) {
          audioMap.set(baseName, { file: fullPath, subtitles: [] })
        }
      }
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) continue
      const ext = path.extname(entry).toLowerCase()
      if (isSubtitleFile(entry)) {
        const baseName = path.basename(entry, ext).replace(/\.wav$/i, '')
        if (audioMap.has(baseName)) {
          audioMap.get(baseName)!.subtitles.push(fullPath)
        }
      }
    }

    // 提取内嵌字幕（MP3 ID3v2 SYLT/USLT）
    for (const [, track] of audioMap) {
      try {
        const lrcFile = await extractEmbeddedLyrics(track.file)
        if (lrcFile && !track.subtitles.includes(lrcFile)) {
          track.subtitles.push(lrcFile)
        }
      } catch { /* 静默 */ }
    }

    for (const [, track] of audioMap) {
      node.children.push({
        name: path.basename(track.file),
        path: track.file,
        children: [],
        isDir: false,
        file: track.file,
        title: path.basename(track.file, path.extname(track.file)),
        subtitles: track.subtitles
      })
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        if (entry === 'node_modules') continue
        const child = await scanDirectoryTree(fullPath, depth + 1)
        if (hasAudio(child)) {
          node.children.push(child)
        }
      }
    }
  } catch { }
  return node
}

function flattenTracks(node: ScannedTreeNode, excludeSE = true): ScannedTrack[] {
  const result: ScannedTrack[] = []
  if (excludeSE && node.isSEVariant) return result
  if (!node.isDir && node.file) {
    result.push({ file: node.file, title: node.title || node.name, subtitles: node.subtitles || [] })
  }
  for (const child of node.children) {
    result.push(...flattenTracks(child, excludeSE))
  }
  return result
}

function hasAudio(node: ScannedTreeNode): boolean {
  if (!node.isDir && node.file) return true
  return node.children.some(hasAudio)
}

function getWorkName(dirPath: string): string {
  return path.basename(dirPath)
}

async function scanWorks(rootPaths: string[]): Promise<any[]> {
  const works: any[] = []
  for (const rootPath of rootPaths) {
    try {
      const stat = fs.statSync(rootPath)
      if (stat.isDirectory()) {
        const name = getWorkName(rootPath)
        const cover = findCoverImage(rootPath)
        const tree = await scanDirectoryTree(rootPath)
        const tracks = flattenTracks(tree)
        if (tracks.length > 0) {
          works.push({ name, path: rootPath, tracks, tree, cover })
        }
      } else if (stat.isFile() && isAudioFile(rootPath)) {
        const ext = path.extname(rootPath)
        const dir = path.dirname(rootPath)
        const subtitles: string[] = []
        // 尝试提取内嵌字幕
        try {
          const lrc = await extractEmbeddedLyrics(rootPath)
          if (lrc) subtitles.push(lrc)
        } catch { /* 静默 */ }
        const singleTrack: ScannedTrack = { file: rootPath, title: path.basename(rootPath, ext), subtitles }
        const leaf: ScannedTreeNode = { name: path.basename(rootPath), path: rootPath, children: [], isDir: false, file: rootPath, title: path.basename(rootPath, ext), subtitles }
        works.push({
          name: path.basename(rootPath, ext),
          path: rootPath,
          tracks: [singleTrack],
          tree: { name: path.basename(rootPath, ext), path: rootPath, children: [leaf], isDir: true },
          cover: findCoverImage(dir)
        })
      }
    } catch { }
  }
  return works
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.85),
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 初始化 ASMR.one 客户端
  asmrClient.setMainWindow(mainWindow)
  asmrClient.init()
  asmrClient.loadPersistedDownloads()

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('open-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'openDirectory', 'multiSelections'],
    filters: [
      { name: '音频文件', extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'wma', 'aac'] }
    ]
  })
  if (result.canceled || result.filePaths.length === 0) return []
  return scanWorks(result.filePaths)
})

ipcMain.handle('scan-folder-drop', async (_event, folderPaths: string[]) => {
  return scanWorks(folderPaths)
})

ipcMain.handle('scan-default-paths', async () => {
  const musicPath = path.join(app.getPath('music'))
  const paths: string[] = []
  if (fs.existsSync(musicPath)) {
    const entries = fs.readdirSync(musicPath)
    for (const entry of entries) {
      const fullPath = path.join(musicPath, entry)
      if (fs.statSync(fullPath).isDirectory()) {
        paths.push(fullPath)
      }
    }
  }
  return scanWorks(paths)
})

ipcMain.handle('read-text-file', async (_event, filePath: string) => {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    try {
      return fs.readFileSync(filePath, 'utf16le')
    } catch {
      return null
    }
  }
})

ipcMain.handle('minimize-window', () => mainWindow?.minimize())
ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('close-window', () => mainWindow?.close())

// ─── ASMR.one API IPC handlers ──────────────────────────────

ipcMain.handle('asmr-login', async (_event, config) => {
  return asmrClient.login(config)
})

ipcMain.handle('asmr-logout', async () => {
  asmrClient.logout()
})

ipcMain.handle('asmr-get-config', async () => {
  return asmrClient.getConfig()
})

ipcMain.handle('asmr-save-config', async (_event, config) => {
  return asmrClient.login(config)
})

ipcMain.handle('asmr-search', async (_event, keyword: string, page: number) => {
  return asmrClient.search(keyword, page)
})

ipcMain.handle('asmr-get-works', async (_event, page: number, order?: string, sort?: string) => {
  return asmrClient.getWorks(page, order, sort)
})

ipcMain.handle('asmr-get-work-detail', async (_event, workId: number) => {
  return asmrClient.getWorkDetail(workId)
})

ipcMain.handle('asmr-get-tracks', async (_event, workId: number) => {
  return asmrClient.getTracks(workId)
})

ipcMain.handle('asmr-get-cover-url', async (_event, workId: number) => {
  return asmrClient.getCoverUrl(workId)
})

ipcMain.handle('asmr-start-download', async (_event, workId: number, trackIndex: number, destDir: string) => {
  const work = await asmrClient.getWorkDetail(workId)
  // 默认下载到 Music/ASMR.one 目录
  if (!destDir) {
    const musicPath = app.getPath('music')
    destDir = path.join(musicPath, 'ASMR.one')
  }
  return asmrClient.startDownload(workId, work.title, trackIndex, destDir)
})

ipcMain.handle('asmr-cancel-download', async (_event, taskId: string) => {
  asmrClient.cancelDownload(taskId)
})

ipcMain.handle('asmr-get-download-progress', async (_event, taskId: string) => {
  return asmrClient.getDownloadProgress(taskId)
})

ipcMain.handle('asmr-get-all-downloads', async () => {
  return asmrClient.getAllDownloads()
})
