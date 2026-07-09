import React, { memo } from 'react'
import { Styles } from '../../styles/types'

interface Props { onOpenFiles: () => void }

export const TitleBar = memo(function TitleBar({ onOpenFiles }: Props) {
  const hMin = () => window.electronAPI?.minimizeWindow()
  const hMax = () => window.electronAPI?.maximizeWindow()
  const hClose = () => window.electronAPI?.closeWindow()

  return (
    <div style={s.bar} onDoubleClick={hMax}>
      <div style={s.left}>
        <svg viewBox="0 0 24 24" fill="none" style={{ width: 'var(--text-lg)', height: 'var(--text-lg)' }}>
          <circle cx="12" cy="12" r="10" stroke="url(#ag)" strokeWidth="1.5" fill="none" />
          <path d="M9 8v8l7-4-7-4z" fill="url(#ag)" />
          <defs><linearGradient id="ag" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#9b6dff" /><stop offset="1" stopColor="#c084fc" /></linearGradient></defs>
        </svg>
        <span style={s.title}>ASMR Player</span>
      </div>
      <div style={s.center}>
        <button style={s.menuBtn} onClick={onOpenFiles} title="打开文件/文件夹">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 'var(--text-sm)', height: 'var(--text-sm)' }}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
          <span style={s.menuText}>打开</span>
        </button>
      </div>
      <div style={s.right}>
        <button style={s.winBtn} onClick={hMin} title="最小化">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--text-xs)', height: 'var(--text-xs)' }}><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <button style={s.winBtn} onClick={hMax} title="最大化">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--text-xs)', height: 'var(--text-xs)' }}><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
        </button>
        <button style={{ ...s.winBtn, color: '#f87171' }} onClick={hClose} title="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--text-xs)', height: 'var(--text-xs)' }}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
        </button>
      </div>
    </div>
  )
})

const s: Styles = {
  bar: {
    display: 'flex', alignItems: 'center', height: 'clamp(32px, 4vh, 44px)',
    background: 'rgba(13, 10, 20, 0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(155, 109, 255, 0.06)',
    padding: '0 var(--space-sm)', WebkitAppRegion: 'drag', flexShrink: 0, zIndex: 100
  },
  left: { display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', WebkitAppRegion: 'drag', minWidth: 120 },
  center: { flex: 1, display: 'flex', justifyContent: 'center', WebkitAppRegion: 'no-drag' },
  right: { display: 'flex', gap: 'var(--space-2xs)', WebkitAppRegion: 'no-drag' },
  title: { fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.3 },
  menuBtn: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-xs)',
    padding: 'var(--space-2xs) var(--space-sm)',
    background: 'rgba(155, 109, 255, 0.08)', border: '1px solid rgba(155, 109, 255, 0.12)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
    fontSize: 'var(--text-xs)', cursor: 'pointer', transition: 'all var(--transition-fast)'
  },
  menuText: { fontSize: 'var(--text-xs)' },
  winBtn: {
    width: 'var(--win-btn-size)', height: 'var(--win-btn-size)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', borderRadius: 'var(--radius-sm)', transition: 'all var(--transition-fast)'
  }
}
