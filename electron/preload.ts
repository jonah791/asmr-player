import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFiles: () => ipcRenderer.invoke('open-files'),
  scanFolderDrop: (paths: string[]) => ipcRenderer.invoke('scan-folder-drop', paths),
  scanDefaultPaths: () => ipcRenderer.invoke('scan-default-paths'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  readTextFile: (path: string) => ipcRenderer.invoke('read-text-file', path)
})
