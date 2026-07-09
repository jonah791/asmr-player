import React, { useState, useRef, useCallback, useEffect, memo } from 'react'
import { EnhancedSubtitleEntry, EarDirection } from '../../types'

interface Props {
  entry: EnhancedSubtitleEntry | null
  fontSize: number
  opacity: number
  background: 'transparent' | 'semi' | 'blur'
  showEarDirection: boolean
  showCharacterName: boolean
  showActions: boolean
  characterColors: Record<string, string>
  totalEntries?: number
  currentIndex?: number
  onClose?: () => void
}

const EAR_ICONS: Record<string, string> = { left: '←L', right: 'R→', both: 'L↔R', center: '●' }
const EAR_COLORS: Record<string, string> = { left: 'var(--blue)', right: 'var(--pink)', both: 'var(--orange)' }
const POS_KEY = 'asmr-subtitle-pos'

function loadPos(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(POS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { x: 0, y: 0 }
}

function savePos(pos: { x: number; y: number }) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(pos)) } catch {}
}

export const SubtitlePanel = memo(function SubtitlePanel({
  entry, fontSize, opacity, background, showEarDirection, showCharacterName, showActions,
  characterColors, totalEntries, currentIndex, onClose
}: Props) {
  const [pos, setPos] = useState(loadPos)
  const [drag, setDrag] = useState(false)
  const [start, setStart] = useState({ x: 0, y: 0 })
  const [vis, setVis] = useState(false)
  const [prevText, setPrevText] = useState('')
  const [dock, setDock] = useState(false)
  const dragRef = useRef(false)
  const handleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (entry?.text && entry.text !== prevText) {
      setVis(false)
      const t = setTimeout(() => { setVis(true); setPrevText(entry.text) }, 40)
      return () => clearTimeout(t)
    }
    if (entry?.text) { setVis(true); setPrevText(entry.text) }
  }, [entry?.text])

  const hMD = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragRef.current = true
    setDrag(true)
    setStart({ x: e.clientX - pos.x, y: e.clientY - pos.y })
  }, [pos])

  const hMM = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return
    const nx = e.clientX - start.x
    const ny = e.clientY - start.y
    setPos({ x: nx, y: ny })
  }, [start])

  const hMU = useCallback(() => {
    if (dragRef.current) {
      dragRef.current = false
      setDrag(false)
      setPos(p => { savePos(p); return p })
    }
  }, [])

  useEffect(() => {
    if (drag) {
      window.addEventListener('mousemove', hMM)
      window.addEventListener('mouseup', hMU)
      return () => { window.removeEventListener('mousemove', hMM); window.removeEventListener('mouseup', hMU) }
    }
  }, [drag, hMM, hMU])

  const hDoubleClick = useCallback(() => setDock(d => !d), [])

  if (!entry) return null

  const earIcon = showEarDirection ? EAR_ICONS[entry.earDirection || 'unknown'] || '' : ''
  const name = showCharacterName && entry.character ? entry.character : ''
  const charColor = entry.character ? characterColors[entry.character] || entry.characterColor : undefined
  const aIcons = showActions && entry.actions ? entry.actions.map(a => a.icon || '').filter(Boolean).join(' ') : ''
  const earColor = EAR_COLORS[entry.earDirection || ''] || 'var(--text-dim)'

  const bgStyle = background === 'blur'
    ? { background: `rgba(13, 10, 20, ${0.6 * opacity})`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }
    : background === 'semi'
    ? { background: `rgba(13, 10, 20, ${0.75 * opacity})` }
    : { background: 'transparent' }

  const currentOpacity = dock ? 0.15 : 1

  return (
    <div style={{
      position: 'fixed',
      left: `calc(50% + ${pos.x}px)`,
      top: `calc(50% + ${pos.y}px)`,
      transform: 'translate(-50%, -50%)',
      zIndex: 900,
      pointerEvents: 'none',
      opacity: vis ? currentOpacity : 0,
      transition: drag ? 'none' : 'opacity 0.25s ease, left 0.01s, top 0.01s',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      maxWidth: 'min(72%, 800px)',
    }}>
      {/* Drag handle */}
      <div
        ref={handleRef}
        onMouseDown={hMD}
        onDoubleClick={hDoubleClick}
        style={{
          pointerEvents: 'auto',
          cursor: drag ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '2px 10px',
          borderRadius: 8,
          background: 'rgba(13, 10, 20, 0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(155, 109, 255, 0.08)',
          marginBottom: 4,
          userSelect: 'none',
          minWidth: 60
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: 2, lineHeight: '12px' }}>⠿</span>
        {onClose && (
          <span
            onClick={(e) => { e.stopPropagation(); onClose() }}
            style={{
              pointerEvents: 'auto',
              fontSize: 10, color: 'var(--text-dim)',
              cursor: 'pointer', padding: '0 4px',
              lineHeight: '14px'
            }}
          >
            ✕
          </span>
        )}
      </div>

      {/* Text content — pointer-events: none for click-through */}
      <div style={{
        ...bgStyle,
        borderRadius: 12,
        padding: 'var(--space-sm) var(--space-lg)',
        pointerEvents: 'none',
        border: charColor ? `1px solid ${charColor}22` : '1px solid transparent',
        maxWidth: '100%'
      }}>
        {(earIcon || name || aIcons) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            marginBottom: 4
          }}>
            {earIcon && <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: 0.5, color: earColor }}>{earIcon}</span>}
            {name && <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: charColor || 'var(--accent)' }}>{name}</span>}
            {aIcons && <span style={{ fontSize: 'var(--text-sm)', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}>{aIcons}</span>}
          </div>
        )}
        <div style={{
          color: '#fff',
          textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 16px rgba(0,0,0,0.4)',
          lineHeight: 1.6, fontWeight: 500, maxWidth: '100%', fontSize,
          textAlign: 'center'
        }}>
          {entry.text.split('\n').map((l, i, a) => <span key={i}>{l}{i < a.length - 1 && <br />}</span>)}
        </div>
        {totalEntries !== undefined && currentIndex !== undefined && (
          <div style={{
            fontSize: 'var(--text-2xs)', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
            textAlign: 'center', marginTop: 4
          }}>
            {currentIndex + 1} / {totalEntries}
          </div>
        )}
      </div>
    </div>
  )
})
