import React, { useRef, useEffect, memo } from 'react'
import { Styles } from '../../styles/types'
import { EnhancedSubtitleEntry } from '../../types'

interface Props {
  entries: EnhancedSubtitleEntry[]; currentTime: number; currentEntry: EnhancedSubtitleEntry | null
  fontSize: number; characterColors: Record<string, string>; showCharacterName: boolean
  onSeekTo: (time: number) => void
}

function fmt(s: number): string { const m = Math.floor(s / 60); return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}` }

export const TranscriptPanel = memo(function TranscriptPanel({ entries, currentTime, currentEntry, fontSize, characterColors, showCharacterName, onSeekTo }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  useEffect(() => { activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [currentEntry?.start])

  if (entries.length === 0) return <div style={s.empty}><span style={s.emptyText}>暂无字幕</span></div>

  return (
    <div style={s.container} ref={listRef}>
      {entries.map((e, i) => {
        const isActive = e === currentEntry
        const isPast = currentTime >= e.end
        const cc = e.character ? characterColors[e.character] || e.characterColor : undefined
        return (
          <div key={i} ref={isActive ? activeRef : undefined} onClick={() => onSeekTo(e.start)} style={{
            ...s.entry, ...(isActive ? s.active : {}), ...(isPast && !isActive ? s.past : {}),
            borderLeft: cc ? `3px solid ${cc}${isActive ? 'ff' : '44'}` : '3px solid transparent'
          }}>
            <div style={s.timeCol}><span style={s.time}>{fmt(e.start)}</span></div>
            <div style={s.textCol}>
              {showCharacterName && e.character && <span style={{ ...s.char, color: cc || 'var(--accent)' }}>{e.character}</span>}
              <span style={{ fontSize, ...(isActive ? { color: '#fff', fontWeight: 500 } : {}) }}>{e.text}</span>
              {e.earDirection && e.earDirection !== 'unknown' && <span style={s.ear}>{e.earDirection === 'left' ? '←L' : e.earDirection === 'right' ? 'R→' : 'L↔R'}</span>}
              {e.actions && e.actions.length > 0 && <span style={s.act}>{e.actions.map(a => a.icon || '').join(' ')}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
})

const s: Styles = {
  container: { flex: 1, overflowY: 'auto', padding: 'var(--space-sm) 0' },
  empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: 'var(--text-muted)', fontSize: 'var(--text-md)' },
  entry: { display: 'flex', gap: 'var(--space-xs)', padding: 'var(--space-xs) var(--space-md)', transition: 'all 0.2s', cursor: 'pointer' },
  active: { background: 'var(--accent-dim)' },
  past: { opacity: 0.4 },
  timeCol: { minWidth: 32, textAlign: 'right', paddingTop: 2 },
  time: { fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  textCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
  char: { fontSize: 'var(--text-xs)', fontWeight: 600 },
  ear: { fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 'var(--space-xs)' },
  act: { fontSize: 'var(--text-sm)', marginLeft: 'var(--space-2xs)' },
}
