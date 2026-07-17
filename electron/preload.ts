import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── 文件系统 ───
  openFiles: () => ipcRenderer.invoke('open-files'),
  scanFolderDrop: (paths: string[]) => ipcRenderer.invoke('scan-folder-drop', paths),
  scanDefaultPaths: () => ipcRenderer.invoke('scan-default-paths'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  readTextFile: (path: string) => ipcRenderer.invoke('read-text-file', path),

  // ─── ASMR.one API ───
  asmrLogin: (config: any) => ipcRenderer.invoke('asmr-login', config),
  asmrLogout: () => ipcRenderer.invoke('asmr-logout'),
  asmrGetConfig: () => ipcRenderer.invoke('asmr-get-config'),
  asmrSaveConfig: (config: any) => ipcRenderer.invoke('asmr-save-config', config),
  asmrSearch: (keyword: string, page: number, subtitleOnly?: boolean) => ipcRenderer.invoke('asmr-search', keyword, page, subtitleOnly),
  asmrGetWorks: (page: number, order?: string, sort?: string, subtitleOnly?: boolean) => ipcRenderer.invoke('asmr-get-works', page, order, sort, subtitleOnly),
  asmrGetWorkDetail: (workId: number) => ipcRenderer.invoke('asmr-get-work-detail', workId),
  asmrGetTracks: (workId: number) => ipcRenderer.invoke('asmr-get-tracks', workId),
  asmrGetCoverUrl: (workId: number) => ipcRenderer.invoke('asmr-get-cover-url', workId),
  asmrStartDownload: (workId: number, trackIndex: number, destDir: string) =>
    ipcRenderer.invoke('asmr-start-download', workId, trackIndex, destDir),
  asmrCancelDownload: (taskId: string) => ipcRenderer.invoke('asmr-cancel-download', taskId),
  asmrGetDownloadProgress: (taskId: string) => ipcRenderer.invoke('asmr-get-download-progress', taskId),
  asmrGetAllDownloads: () => ipcRenderer.invoke('asmr-get-all-downloads'),

  // ─── 事件监听 ───
  onDownloadProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('asmr-download-progress', handler)
    return () => ipcRenderer.removeListener('asmr-download-progress', handler)
  }
})
