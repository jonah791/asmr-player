import { app, BrowserWindow, ipcMain, dialog, screen } from 'electron'
import path from 'path'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null

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

function scanDirectoryTree(dirPath: string, depth = 0): ScannedTreeNode {
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
        const child = scanDirectoryTree(fullPath, depth + 1)
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

function scanWorks(rootPaths: string[]): any[] {
  const works: any[] = []
  for (const rootPath of rootPaths) {
    try {
      const stat = fs.statSync(rootPath)
      if (stat.isDirectory()) {
        const name = getWorkName(rootPath)
        const cover = findCoverImage(rootPath)
        const tree = scanDirectoryTree(rootPath)
        const tracks = flattenTracks(tree)
        if (tracks.length > 0) {
          works.push({ name, path: rootPath, tracks, tree, cover })
        }
      } else if (stat.isFile() && isAudioFile(rootPath)) {
        const ext = path.extname(rootPath)
        const dir = path.dirname(rootPath)
        const singleTrack: ScannedTrack = { file: rootPath, title: path.basename(rootPath, ext), subtitles: [] }
        const leaf: ScannedTreeNode = { name: path.basename(rootPath), path: rootPath, children: [], isDir: false, file: rootPath, title: path.basename(rootPath, ext), subtitles: [] }
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
