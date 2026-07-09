import React, { useRef, useEffect, useCallback, useState, memo } from 'react'
import { Styles } from '../../styles/types'
import { EQBand, EQPreset } from '../../types'

interface Props {
  bands: EQBand[]
  preset: EQPreset
  onChange: (b: EQBand[]) => void
  onPresetChange: (p: EQPreset) => void
}

const PRESETS: { key: EQPreset; label: string }[] = [
  { key: 'flat', label: 'Flat' }, { key: 'vocal', label: '人声' },
  { key: 'bass', label: '低频' }, { key: 'asmr', label: 'ASMR' }
]
const FREQ_LABELS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k']

export const Equalizer = memo(function Equalizer({ bands, preset, onChange, onPresetChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const padding = 20

  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const pw = w - padding * 2, ph = h - padding * 2
    const maxG = 12
    if (bands.length === 0) return

    for (let i = 0; i <= 4; i++) {
      const y = padding + (ph / 4) * i
      ctx.strokeStyle = 'rgba(155, 109, 255, 0.04)'
      ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(w - padding, y); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(155, 109, 255, 0.08)'
    ctx.beginPath(); ctx.moveTo(padding, padding + ph / 2); ctx.lineTo(w - padding, padding + ph / 2); ctx.stroke()

    const pts = bands.map((b, i) => {
      const x = padding + (pw / (bands.length - 1)) * i
      return { x, y: padding + ph / 2 - (b.gain / maxG) * (ph / 2) }
    })

    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, (pts[i - 1].x + pts[i].x) / 2, (pts[i - 1].y + pts[i].y) / 2)
      ctx.lineTo(pts[i].x, pts[i].y)
    }
    ctx.strokeStyle = '#9b6dff'; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(155, 109, 255, 0.3)'; ctx.shadowBlur = 8; ctx.stroke()
    ctx.shadowBlur = 0

    pts.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = bands[i].gain >= 0 ? '#9b6dff' : '#f472b6'; ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke()
    })

    ctx.fillStyle = 'rgba(155, 109, 255, 0.2)'
    ctx.font = `${Math.min(ph * 0.08, 9)}px sans-serif`
    ctx.textAlign = 'center'
    pts.forEach((p, i) => ctx.fillText(FREQ_LABELS[i], p.x, h - 4))
  }, [bands])

  useEffect(() => { drawCurve() }, [drawCurve])

  const handleDown = (e: React.MouseEvent) => {
    const c = canvasRef.current; if (!c) return
    const x = e.clientX - c.getBoundingClientRect().left
    const i = Math.round(((x - padding) / (c.clientWidth - padding * 2)) * (bands.length - 1))
    if (i >= 0 && i < bands.length) setDragIdx(i)
  }
  const handleMove = (e: React.MouseEvent) => {
    if (dragIdx === null || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = canvasRef.current.clientHeight
    const ph = h - padding * 2
    const g = Math.max(-12, Math.min(12, -((y - padding - ph / 2) / (ph / 2)) * 12))
    onChange(bands.map((b, i) => i === dragIdx ? { ...b, gain: Math.round(g * 10) / 10 } : b))
  }
  const handleUp = () => setDragIdx(null)

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h3 style={s.title}>均衡器</h3>
        <span style={s.presetLabel}>{preset === 'custom' ? '自定义' : PRESETS.find(p => p.key === preset)?.label}</span>
      </div>
      <div style={s.presets}>
        {PRESETS.map(p => (
          <button key={p.key} style={{ ...s.presetBtn, ...(preset === p.key ? s.presetActive : {}) }} onClick={() => onPresetChange(p.key)}>
            {p.label}
          </button>
        ))}
      </div>
      <canvas ref={canvasRef} style={s.canvas} onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp} onMouseLeave={handleUp} />
    </div>
  )
})

const s: Styles = {
  container: { padding: 'var(--space-lg)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' },
  presetLabel: { fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', padding: 'var(--space-2xs) var(--space-sm)', background: 'var(--bg-tertiary)', borderRadius: 10 },
  presets: { display: 'flex', gap: 'var(--space-xs)' },
  presetBtn: {
    padding: 'var(--space-2xs) var(--space-sm)', fontSize: 'var(--text-2xs)',
    border: '1px solid var(--border)', borderRadius: 12, background: 'transparent',
    color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all var(--transition-fast)'
  },
  presetActive: { background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent)' },
  canvas: { width: '100%', height: 'clamp(100px, 20vh, 180px)', borderRadius: 'var(--radius)', background: 'var(--bg-primary)', cursor: 'pointer' }
}
