import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { ASMRConfig, KikoeruWork, KikoeruTrackNode, DownloadTask, DownloadProgress, TrackWithWork } from '../../types'
import { ASMRLogin } from './ASMRLogin'
import { ASMRBrowser } from './ASMRBrowser'
import { ASMRDownloads } from './ASMRDownloads'

type Tab = 'browse' | 'downloads'

export function ASMRPanel() {
  const [config, setConfig] = useState<ASMRConfig | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('browse')
  const [downloads, setDownloads] = useState<DownloadTask[]>([])
  const cleanupRef = useRef<(() => void) | null>(null)

  // 初始化：检查是否已登录
  useEffect(() => {
    window.electronAPI.asmrGetConfig().then(cfg => {
      if (cfg?.token) {
        setConfig(cfg)
        setLoggedIn(true)
      }
    })
  }, [])

  // 监听下载进度
  useEffect(() => {
    const cleanup = window.electronAPI.onDownloadProgress((progresses: DownloadProgress[]) => {
      window.electronAPI.asmrGetAllDownloads().then(setDownloads)
    })
    cleanupRef.current = cleanup
    return () => cleanup()
  }, [])

  // 刷新下载列表
  useEffect(() => {
    if (loggedIn) {
      window.electronAPI.asmrGetAllDownloads().then(setDownloads)
    }
  }, [loggedIn])

  const handleLogin = useCallback(async (cfg: ASMRConfig) => {
    const result = await window.electronAPI.asmrLogin(cfg)
    if (result.success) {
      setConfig(cfg)
      setLoggedIn(true)
    }
    return result
  }, [])

  const handleLogout = useCallback(async () => {
    await window.electronAPI.asmrLogout()
    setConfig(null)
    setLoggedIn(false)
    setDownloads([])
  }, [])

  const handleSearch = useCallback(async (keyword: string, page: number) => {
    return window.electronAPI.asmrSearch(keyword, page)
  }, [])

  const handleGetWorks = useCallback(async (page: number) => {
    return window.electronAPI.asmrGetWorks(page)
  }, [])

  const handleGetTracks = useCallback(async (workId: number) => {
    return window.electronAPI.asmrGetTracks(workId)
  }, [])

  const handleStartDownload = useCallback(async (workId: number, trackIndex: number, _destDir: string) => {
    // 下载到用户的 Music/ASMR 目录
    return window.electronAPI.asmrStartDownload(workId, trackIndex, '')
  }, [])

  const handlePlay = useCallback((track: TrackWithWork) => {
    // 通过自定义事件通知 App.tsx 播放
    window.dispatchEvent(new CustomEvent('asmr-play', { detail: track }))
  }, [])

  const handleGetFavorites = useCallback(async () => {
    return window.electronAPI.asmrGetFavorites()
  }, [])

  const handleAddFavorite = useCallback(async (work: { id: number; title: string; mainCoverUrl?: string; thumbnailCoverUrl?: string }) => {
    await window.electronAPI.asmrAddFavorite(work)
  }, [])

  const handleRemoveFavorite = useCallback(async (workId: number) => {
    await window.electronAPI.asmrRemoveFavorite(workId)
  }, [])

  const handleGetWorkDetail = useCallback(async (workId: number) => {
    return window.electronAPI.asmrGetWorkDetail(workId)
  }, [])

  const handleCancelDownload = useCallback(async (taskId: string) => {
    await window.electronAPI.asmrCancelDownload(taskId)
    window.electronAPI.asmrGetAllDownloads().then(setDownloads)
  }, [])

  const coverUrlFn = useCallback((work: KikoeruWork) => {
    return work.mainCoverUrl || work.thumbnailCoverUrl || `${config?.serverUrl || ''}/api/cover/${work.id}?type=main`
  }, [config])

  if (!loggedIn) {
    return <ASMRLogin onLogin={handleLogin} />
  }

  return (
    <div style={containerStyle}>
      {/* 顶部栏 */}
      <div style={topBarStyle}>
        <div style={tabRowStyle}>
          <button style={{ ...tabBtnStyle, ...(activeTab === 'browse' ? tabActiveStyle : {}) }}
            onClick={() => setActiveTab('browse')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ width: 14, height: 14 }}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            浏览
          </button>
          <button style={{ ...tabBtnStyle, ...(activeTab === 'downloads' ? tabActiveStyle : {}) }}
            onClick={() => setActiveTab('downloads')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ width: 14, height: 14 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            下载
            {downloads.filter(d => d.status === 'downloading' || d.status === 'queued').length > 0 && (
              <span style={badgeStyle}>{downloads.filter(d => d.status === 'downloading' || d.status === 'queued').length}</span>
            )}
          </button>
        </div>
        <button style={logoutBtnStyle} onClick={handleLogout} title="登出">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ width: 14, height: 14 }}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        </button>
      </div>

      <ASMRBrowser
          onSearch={handleSearch}
          onGetWorks={handleGetWorks}
          onGetTracks={handleGetTracks}
          onStartDownload={handleStartDownload}
          onPlay={handlePlay}
          onGetFavorites={handleGetFavorites}
          onAddFavorite={handleAddFavorite}
          onRemoveFavorite={handleRemoveFavorite}
          onGetWorkDetail={handleGetWorkDetail}
          coverUrlFn={coverUrlFn}
          downloads={downloads}
        />
      {activeTab === 'downloads' && <ASMRDownloads downloads={downloads} onCancel={handleCancelDownload} />}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100%',
}
const topBarStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: 'var(--space-xs) var(--space-sm)',
  background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
  flexShrink: 0,
}
const tabRowStyle: React.CSSProperties = {
  display: 'flex', gap: 'var(--space-2xs)',
}
const tabBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)',
  background: 'transparent', border: 'none',
  padding: 'var(--space-2xs) var(--space-sm)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  fontSize: 'var(--text-2xs)', fontWeight: 500,
  color: 'var(--text-muted)', transition: 'all var(--transition-fast)',
}
const tabActiveStyle: React.CSSProperties = {
  color: 'var(--accent)', background: 'var(--accent-dim)',
}
const badgeStyle: React.CSSProperties = {
  background: 'var(--accent)', color: '#fff', borderRadius: 8,
  padding: '0 4px', fontSize: 9, fontWeight: 600, lineHeight: '14px',
  minWidth: 14, textAlign: 'center',
}
const logoutBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none',
  color: 'var(--text-dim)', cursor: 'pointer',
  padding: 'var(--space-2xs)', borderRadius: 'var(--radius-sm)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'color var(--transition-fast)',
}
