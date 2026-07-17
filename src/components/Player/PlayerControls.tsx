import React, { useState, useRef, memo } from 'react'
import { Styles } from '../../styles/types'
import { TrackWithWork, PlayMode } from '../../types'

interface Props {
  isPlaying: boolean
  isPaused: boolean
  currentTime: number
  duration: number
  volume: number
  currentTrack: TrackWithWork | null
  playMode: PlayMode
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onVolumeChange: (vol: number) => void
  onPlayModeChange: (mode: PlayMode) => void
  loading: boolean
  onPrev?: () => void
  onNext?: () => void
  onShowPlaylist?: () => void       // 打开播放列表
  onShowWorkDetail?: () => void     // 返回作品详情（ASMR.one）
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const PLAY_MODE_ORDER: PlayMode[] = ['sequential', 'repeat-all', 'repeat-one', 'shuffle']
const PLAY_MODE_ICONS: Record<PlayMode, string> = {
  sequential: '↻', 'repeat-one': '↺1', 'repeat-all': '↺', shuffle: '⇄'
}
const PLAY_MODE_LABELS: Record<PlayMode, string> = {
  sequential: '顺序播放', 'repeat-one': '单曲循环', 'repeat-all': '列表循环', shuffle: '随机播放'
}

export const PlayerControls = memo(function PlayerControls({
  isPlaying, isPaused, currentTime, duration, volume, currentTrack, playMode,
  onTogglePlay, onSeek, onVolumeChange, onPlayModeChange, loading, onPrev, onNext,
  onShowPlaylist, onShowWorkDetail
}: Props) {
  const showPlayIcon = !isPlaying || isPaused
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const [hoverPct, setHoverPct] = useState<number | null>(null)
  const [seekTemp, setSeekTemp] = useState<number | null>(null)
  const [showVol, setShowVol] = useState(false)
  const hasTrack = !!currentTrack
  const displayProgress = seekTemp !== null ? seekTemp : progress
  const pausedForSeekRef = useRef(false)

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekTemp(parseFloat(e.target.value))
  }
  const handleSeekStart = () => {
    if (isPlaying) { pausedForSeekRef.current = true; onTogglePlay() }
  }
  const handleSeekCommit = () => {
    if (seekTemp !== null) {
      onSeek((seekTemp / 100) * duration)
      setSeekTemp(null)
    }
    if (pausedForSeekRef.current) { pausedForSeekRef.current = false; onTogglePlay() }
  }
  const handleHover = (e: React.MouseEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoverPct(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }
  const handleLeave = () => setHoverPct(null)

  return (
    <div style={s.container}>
      <div style={s.infoRow}>
        <div style={s.trackMeta}>
          {currentTrack ? (
            <>
              <span style={s.workName}>{currentTrack.workName}</span>
              <span style={s.trackTitle}>{currentTrack.track.title}</span>
            </>
          ) : (
            <span style={{ ...s.trackTitle, color: 'var(--text-dim)' }}>未选择音轨</span>
          )}
        </div>
      </div>

      <div style={s.progressRow}>
        <span style={s.time}>{formatTime(currentTime)}</span>
        <div style={s.progressWrap}>
          {hoverPct !== null && (
            <div style={{ ...s.timeTooltip, left: `clamp(0%, ${hoverPct * 100}%, calc(100% - 32px))` }}>
              {formatTime(hoverPct * duration)}
            </div>
          )}
          <input type="range" min={0} max={100} step={0.1} value={displayProgress}
            onChange={handleSeek} onMouseDown={handleSeekStart} onMouseUp={handleSeekCommit} onMouseMove={handleHover} onMouseLeave={() => { handleLeave(); handleSeekCommit() }}
            style={s.progressBar} disabled={!hasTrack} />
        </div>
        <span style={s.time}>{formatTime(duration)}</span>
      </div>

      <div style={s.buttonRow}>
        <div style={s.modeWrap}>
          <button style={s.modeBtn} onClick={() => {
            const i = PLAY_MODE_ORDER.indexOf(playMode)
            onPlayModeChange(PLAY_MODE_ORDER[(i + 1) % PLAY_MODE_ORDER.length])
          }} title={PLAY_MODE_LABELS[playMode]}>
            {PLAY_MODE_ICONS[playMode]}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)', marginRight: 'var(--space-sm)' }}>
          {onShowWorkDetail && currentTrack?.streamUrl && (
            <button style={s.extraBtn} onClick={onShowWorkDetail} title="返回作品详情">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5m7-7l-7 7 7 7" />
              </svg>
            </button>
          )}
          {onShowPlaylist && (
            <button style={s.extraBtn} onClick={onShowPlaylist} title="播放列表">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div style={s.centerBtns}>
          <button style={{ ...s.skipBtn, opacity: hasTrack ? 1 : 0.3 }} onClick={onPrev} disabled={!hasTrack}>
            <svg width="70%" height="70%" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
          </button>
          <button style={s.playBtn} onClick={onTogglePlay} disabled={loading || !hasTrack}>
            {loading ? (
              <svg width="55%" height="55%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            ) : showPlayIcon ? (
              <svg width="55%" height="55%" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            ) : (
              <svg width="55%" height="55%" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
            )}
          </button>
          <button style={{ ...s.skipBtn, opacity: hasTrack ? 1 : 0.3 }} onClick={onNext} disabled={!hasTrack}>
            <svg width="70%" height="70%" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
          </button>
        </div>
        <div style={s.volumeWrap}
          onMouseEnter={() => setShowVol(true)}
          onMouseLeave={() => setTimeout(() => setShowVol(false), 200)}>
          <button style={s.modeBtn} title="音量">
            <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {volume > 0 && <path d="M15.54 8.46a5 5 0 010 7.07" />}
              {volume > 0.5 && <path d="M19.07 4.93a10 10 0 010 14.14" />}
            </svg>
          </button>
          {showVol && (
            <div style={s.volPopup}>
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={e => onVolumeChange(parseFloat(e.target.value))} style={s.volSlider} />
              <span style={s.volNum}>{Math.round(volume * 100)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

const s: Styles = {
  container: {
    background: 'rgba(13, 10, 20, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderTop: '1px solid rgba(155, 109, 255, 0.06)',
    padding: 'var(--space-sm) var(--space-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    minHeight: 'clamp(56px, 7vh, 80px)',
    justifyContent: 'center'
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-sm)'
  },
  trackMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-2xs)',
    overflow: 'hidden',
    maxWidth: '90%'
  },
  workName: {
    fontSize: 'var(--text-xs)',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%'
  },
  trackTitle: {
    fontSize: 'var(--text-sm)',
    color: 'var(--text-primary)',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%'
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    minHeight: 'clamp(28px, 3vw, 36px)'
  },
  progressWrap: {
    flex: 1,
    position: 'relative',
    height: 'clamp(28px, 3vw, 36px)',
    display: 'flex',
    alignItems: 'center'
  },
  progressBar: {
    width: '100%',
    height: 'var(--slider-height)',
    margin: 0,
    cursor: 'pointer',
    display: 'block'
  },
  timeTooltip: {
    position: 'absolute',
    bottom: 'calc(100% + 4px)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '1px 6px',
    fontSize: 'var(--text-2xs)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    zIndex: 10
  },
  time: {
    fontSize: 'var(--text-2xs)',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    minWidth: 'clamp(28px, 4vw, 36px)',
    textAlign: 'center'
  },
  buttonRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-sm)'
  },
  modeWrap: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end'
  },
  centerBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)'
  },
  volumeWrap: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-start',
    position: 'relative',
    alignItems: 'center'
  },
  playBtn: {
    width: 'var(--btn-sm)',
    height: 'var(--btn-sm)',
    borderRadius: '50%',
    border: 'none',
    background: 'var(--gradient-accent)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)',
    boxShadow: '0 0 12px var(--accent-glow)',
    flexShrink: 0
  },
  skipBtn: {
    width: 'var(--btn-xs)',
    height: 'var(--btn-xs)',
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)'
  },
  modeBtn: {
    width: 'var(--btn-sm)',
    height: 'var(--btn-sm)',
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
    transition: 'all var(--transition-fast)'
  },
  volPopup: {
    position: 'absolute',
    left: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginLeft: 'var(--space-xs)',
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(16px)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius)',
    padding: 'var(--space-xs) var(--space-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    boxShadow: 'var(--glass-shadow)',
    zIndex: 50,
    whiteSpace: 'nowrap'
  },
  volSlider: {
    width: 'clamp(60px, 8vw, 100px)',
    height: 'var(--slider-height)'
  },
  volNum: {
    fontSize: 'var(--text-xs)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    minWidth: 24,
    textAlign: 'right'
  },
  extraBtn: {
    width: 'var(--btn-xs)',
    height: 'var(--btn-xs)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)'
  }
}
