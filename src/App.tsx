import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Work, TrackWithWork, PlayMode } from './types'
import { useAudioEngine } from './hooks/useAudioEngine'
import { usePlaylist } from './hooks/usePlaylist'
import { useSettings } from './hooks/useSettings'
import { SubtitleProvider } from './contexts/SubtitleContext'
import { AppLayout } from './layouts/AppLayout'
import { TitleBar } from './components/Player/TitleBar'
import { PlayerControls } from './components/Player/PlayerControls'
import { PlaylistPanel } from './components/Playlist/PlaylistPanel'
import { ChannelControl } from './components/ASMR/ChannelControl'
import { Equalizer } from './components/ASMR/Equalizer'
import { Visualization } from './components/ASMR/Visualization'
import { SubtitlePanel } from './components/Subtitle/SubtitlePanel'
import { SubtitleSettings } from './components/Subtitle/SubtitleSettings'
import { TranscriptPanel } from './components/Subtitle/TranscriptPanel'
import { ASMRPanel } from './components/ASMR/ASMRPanel'

type Panel = 'none' | 'playlist' | 'channel' | 'eq' | 'subtitle' | 'transcript' | 'asmr'

function TabIcon({ panel }: { panel: Panel }) {
  const props = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', style: { width: 'var(--text-lg)', height: 'var(--text-lg)', display: 'block' } as React.CSSProperties }
  switch (panel) {
    case 'playlist': return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M9 8v8l7-4-7-4z" /></svg>
    case 'transcript': return <svg {...props}><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="14" y2="12" /><line x1="8" y1="16" x2="12" y2="16" /></svg>
    case 'subtitle': return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="7" y1="9" x2="17" y2="9" /><line x1="7" y1="12" x2="15" y2="12" /><line x1="7" y1="15" x2="13" y2="15" /></svg>
    case 'channel': return <svg {...props}><path d="M3 18v-4a5 5 0 015-5h8a5 5 0 015 5v4" /><circle cx="12" cy="7" r="4" /></svg>
    case 'eq': return <svg {...props}><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="14" x2="4" y2="14" strokeWidth="2" stroke="currentColor" /><line x1="9" y1="21" x2="9" y2="10" /><line x1="9" y1="10" x2="9" y2="10" strokeWidth="2" stroke="currentColor" /><line x1="14" y1="21" x2="14" y2="6" /><line x1="14" y1="6" x2="14" y2="6" strokeWidth="2" stroke="currentColor" /><line x1="19" y1="21" x2="19" y2="2" /><line x1="19" y1="2" x2="19" y2="2" strokeWidth="2" stroke="currentColor" /></svg>
    case 'asmr': return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M9 8v8l7-4-7-4z" /><path d="M7 8h10M7 12h10M7 16h10" opacity="0.3" strokeWidth="1" /></svg>
  }
}

const TAB_CONFIG: { key: Panel; title: string }[] = [
  { key: 'playlist', title: '媒体库' }, { key: 'transcript', title: '台本' },
  { key: 'subtitle', title: '字幕' }, { key: 'channel', title: '声道' }, { key: 'eq', title: '均衡器' },
  { key: 'asmr', title: 'ASMR.one' }
]

export default function App() {
  const engine = useAudioEngine()
  const { works, addWorks, removeWork, activeRouteId, playAt, playNext, playPrev, selectRoute } = usePlaylist()
  const {
    settings, updateVolume, updateChannel, updateEQ, setEQPreset,
    updateSubtitle, updateSubtitleFontSize, updateSubtitleOpacity, updateSubtitleBackground,
    updateSubtitleShowEar, updateSubtitleShowName, updateSubtitleShowActions, updateSubtitlePosition, updatePlayMode
  } = useSettings()
  const [activePanel, setActivePanel] = useState<Panel>('playlist')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.scanDefaultPaths().then((w: Work[]) => { if (w.length > 0) addWorks(w) })
  }, [])

  const handleOpenFiles = useCallback(async () => {
    if (!window.electronAPI) return
    const w = await window.electronAPI.openFiles()
    if (w.length > 0) addWorks(w)
  }, [addWorks])

  const handlePlay = useCallback(async (track: TrackWithWork) => {
    const work = works.find(w => w.path === track.workPath)
    if (work) { const idx = work.tracks.findIndex(t => t.file === track.track.file); if (idx >= 0) playAt(work.path, idx) }
    setLoading(true); try { await engine.loadTrack(track) } catch (e) { console.error('Failed to load track:', track.track.file, e) }; setLoading(false)
  }, [engine, works, playAt])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); if (!window.electronAPI) return
    const paths: string[] = []; for (const item of e.dataTransfer.files) paths.push(item.path)
    if (paths.length > 0) { const nw = await window.electronAPI.scanFolderDrop(paths); if (nw.length > 0) addWorks(nw) }
  }, [addWorks])

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])
  const handlePrev = useCallback(() => { const t = playPrev(); if (t) handlePlay(t) }, [playPrev, handlePlay])
  const handleNext = useCallback(() => { const t = playNext(); if (t) handlePlay(t) }, [playNext, handlePlay])
  const handlePlayMode = useCallback((mode: PlayMode) => updatePlayMode(mode), [updatePlayMode])

  useEffect(() => { engine.setVolume(settings.volume) }, [settings.volume, engine])
  useEffect(() => { engine.setChannelVolume(settings.channelLeft, settings.channelRight) }, [settings.channelLeft, settings.channelRight, engine])
  useEffect(() => { engine.setEQFromBands(settings.eqBands) }, [settings.eqBands, engine])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const r = engine.ref.current
      switch (e.code) {
        case 'Space': e.preventDefault(); r.togglePlay(); break
        case 'ArrowLeft': r.seek(Math.max(0, r.currentTime - 5)); break
        case 'ArrowRight': r.seek(Math.min(r.duration, r.currentTime + 5)); break
        case 'ArrowUp': updateVolume(Math.min(1, settings.volume + 0.1)); break
        case 'ArrowDown': updateVolume(Math.max(0, settings.volume - 0.1)); break
        case 'KeyC': updateSubtitle(!settings.subtitleEnabled); break
      }
    }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  }, [engine.ref, settings.volume, updateVolume, settings.subtitleEnabled, updateSubtitle])

  // ASMR.one 在线播放
  useEffect(() => {
    const handler = (e: Event) => {
      const track = (e as CustomEvent).detail
      setLoading(true)
      engine.loadTrack(track).finally(() => setLoading(false))
    }
    window.addEventListener('asmr-play', handler)
    return () => window.removeEventListener('asmr-play', handler)
  }, [engine])

  const currentTrack = engine.currentTrack
  const subtitleManager = engine.subtitleManager

  const subtitleCtx = useMemo(() => ({
    fontSize: settings.subtitleFontSize, opacity: settings.subtitleOpacity,
    background: settings.subtitleBackground as 'transparent' | 'semi' | 'blur',
    showEarDirection: settings.subtitleShowEarDirection, showCharacterName: settings.subtitleShowCharacterName,
    showActions: settings.subtitleShowActions, position: settings.subtitlePosition as 'bottom' | 'top',
    enabled: settings.subtitleEnabled, characters: engine.subtitleCharacters,
    currentEntry: engine.currentSubtitle, subtitleCount: subtitleManager.getTracks().length,
    subtitleActiveIndex: subtitleManager.getActiveIndex(),
    onFontSizeChange: updateSubtitleFontSize, onOpacityChange: updateSubtitleOpacity,
    onBackgroundChange: updateSubtitleBackground, onShowEarDirection: updateSubtitleShowEar,
    onShowCharacterName: updateSubtitleShowName, onShowActions: updateSubtitleShowActions,
    onPositionChange: updateSubtitlePosition, onEnabledChange: updateSubtitle
  }), [settings.subtitleFontSize, settings.subtitleOpacity, settings.subtitleBackground,
    settings.subtitleShowEarDirection, settings.subtitleShowCharacterName, settings.subtitleShowActions,
    settings.subtitlePosition, settings.subtitleEnabled, engine.subtitleCharacters, engine.currentSubtitle,
    subtitleManager, updateSubtitleFontSize, updateSubtitleOpacity, updateSubtitleBackground,
    updateSubtitleShowEar, updateSubtitleShowName, updateSubtitleShowActions, updateSubtitlePosition, updateSubtitle])

  const sidebar = (
    <div style={sidebarStyles}>
      <div style={tabBarStyle}>
        {TAB_CONFIG.map(({ key, title }) => (
          <button key={key} style={{ ...tabStyle, ...(activePanel === key ? tabActiveStyle : {}) }}
            onClick={() => setActivePanel(activePanel === key ? 'none' : key)} title={title}>
            <span style={tabIconStyle}><TabIcon panel={key} /></span>
          </button>
        ))}
      </div>
    </div>
  )

  const panel = activePanel !== 'none' ? (
    <div key={activePanel} style={panelContentStyle}>
      {activePanel === 'playlist' && <PlaylistPanel works={works} currentTrack={currentTrack} activeRouteId={activeRouteId} onPlay={handlePlay} onRemove={removeWork} onOpenFiles={handleOpenFiles} onSelectRoute={selectRoute} />}
      {activePanel === 'transcript' && <TranscriptPanel entries={engine.subtitleEntries} currentTime={engine.currentTime} currentEntry={engine.currentSubtitle} fontSize={14} characterColors={settings.subtitleCharacterColors} showCharacterName={settings.subtitleShowCharacterName} onSeekTo={engine.seekTo} />}
      {activePanel === 'subtitle' && <SubtitleSettings />}
      {activePanel === 'channel' && <ChannelControl left={settings.channelLeft} right={settings.channelRight} onChange={updateChannel} />}
      {activePanel === 'eq' && <Equalizer bands={settings.eqBands} preset={settings.eqPreset} onChange={updateEQ} onPresetChange={setEQPreset} />}
      {activePanel === 'asmr' && <ASMRPanel />}
    </div>
  ) : null

  const haveCover = currentTrack?.workCover
  const content = (
    <>
      {currentTrack ? (
        <div style={nowPlayingStyle}>
          <div style={coverAreaStyle}>
            {haveCover ? <img src={`file://${currentTrack.workCover}`} alt="" style={coverArtStyle} /> : (
              <div style={coverPlaceholderStyle}>
                <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15"><circle cx="12" cy="12" r="10" /><path d="M9 8v8l7-4-7-4z" /></svg>
              </div>
            )}
          </div>
          <div style={coverInfoStyle}>
            <span style={nowWorkNameStyle}>{currentTrack.workName}</span>
            <span style={nowTrackTitleStyle}>{currentTrack.track.title}</span>
            {engine.subtitleCharacters.length > 0 && (
              <div style={characterTagsStyle}>
                {engine.subtitleCharacters.map(c => (
                  <span key={c.name} style={{ ...charTagStyle, background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}44` }}>{c.name}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={emptyStateStyle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="0.5" opacity="0.3" style={{ width: 'clamp(48px, 6vw, 80px)', height: 'clamp(48px, 6vw, 80px)' }}><circle cx="12" cy="12" r="10" /><path d="M9 8v8l7-4-7-4z" /></svg>
          <span style={emptyTextStyle}>选择音轨开始播放</span>
        </div>
      )}
      <div style={vizAreaStyle}>
        <Visualization analyserData={engine.analyserData} isPlaying={engine.isPlaying} channelLeft={settings.channelLeft} channelRight={settings.channelRight} />
      </div>
      <div style={playerAreaStyle}>
        <PlayerControls isPlaying={engine.isPlaying} isPaused={engine.isPaused} currentTime={engine.currentTime} duration={engine.duration}
          volume={settings.volume} currentTrack={currentTrack} playMode={settings.playMode}
          onTogglePlay={engine.togglePlay} onSeek={engine.seek} onVolumeChange={updateVolume}
          onPlayModeChange={handlePlayMode} loading={loading} onPrev={handlePrev} onNext={handleNext} />
      </div>
    </>
  )

  const subtitleOverlay = settings.subtitleEnabled && engine.currentSubtitle ? (
    <SubtitlePanel entry={engine.currentSubtitle} fontSize={settings.subtitleFontSize} opacity={settings.subtitleOpacity}
      background={settings.subtitleBackground} showEarDirection={settings.subtitleShowEarDirection}
      showCharacterName={settings.subtitleShowCharacterName} showActions={settings.subtitleShowActions}
      characterColors={settings.subtitleCharacterColors} totalEntries={engine.subtitleEntries.length}
      currentIndex={engine.currentIdx} onClose={() => updateSubtitle(false)} />
  ) : null

  return (
    <SubtitleProvider value={subtitleCtx}>
      <AppLayout titleBar={<TitleBar onOpenFiles={handleOpenFiles} />} sidebar={sidebar} panel={panel} content={content}
        subtitleOverlay={subtitleOverlay} onDrop={handleDrop} onDragOver={handleDragOver} />
    </SubtitleProvider>
  )
}

const sidebarStyles: Record<string, any> = { width: 'var(--sidebar-width)', display: 'flex', flexDirection: 'column', background: 'rgba(13, 10, 20, 0.5)', borderRight: '1px solid var(--border)', flexShrink: 0 }
const tabBarStyle: Record<string, any> = { display: 'flex', flexDirection: 'column', padding: 'var(--space-sm) 0', gap: 'var(--space-xs)', borderBottom: '1px solid var(--border)' }
const tabStyle: Record<string, any> = { width: 'var(--sidebar-width)', height: 'var(--btn-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', transition: 'all var(--transition-fast)', borderRadius: 0 }
const tabActiveStyle: Record<string, any> = { color: 'var(--accent)', background: 'rgba(155, 109, 255, 0.06)' }
const tabIconStyle: Record<string, any> = { fontSize: 'var(--text-lg)' }
const panelContentStyle: Record<string, any> = { display: 'flex', flexDirection: 'column', width: 'var(--panel-width)', background: 'var(--bg-primary)', borderRight: '1px solid var(--border)', flexShrink: 0, overflow: 'hidden', animation: 'fade-up 0.25s ease-out' }
const nowPlayingStyle: Record<string, any> = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)', padding: 'var(--space-xl)', overflow: 'auto' }
const coverAreaStyle: Record<string, any> = { width: 'var(--cover-lg)', height: 'var(--cover-lg)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', flexShrink: 0 }
const coverArtStyle: Record<string, any> = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const coverPlaceholderStyle: Record<string, any> = { width: '100%', height: '100%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-lg)' }
const coverInfoStyle: Record<string, any> = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xs)', textAlign: 'center', maxWidth: '80%' }
const nowWorkNameStyle: Record<string, any> = { fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 500 }
const nowTrackTitleStyle: Record<string, any> = { fontSize: 'var(--text-lg)', color: 'var(--text-primary)', fontWeight: 600 }
const characterTagsStyle: Record<string, any> = { display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', justifyContent: 'center', marginTop: 'var(--space-xs)' }
const charTagStyle: Record<string, any> = { fontSize: 'var(--text-2xs)', padding: 'var(--space-2xs) var(--space-xs)', borderRadius: 'var(--radius-sm)', fontWeight: 500 }
const emptyStateStyle: Record<string, any> = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)' }
const emptyTextStyle: Record<string, any> = { fontSize: 'var(--text-md)', color: 'var(--text-dim)' }
const vizAreaStyle: Record<string, any> = { height: 'var(--viz-height)', flexShrink: 0 }
const playerAreaStyle: Record<string, any> = { flexShrink: 0 }
