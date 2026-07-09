import React, { memo } from 'react'
import { Styles } from '../../styles/types'

interface Props { left: number; right: number; onChange: (l: number, r: number) => void }

export const ChannelControl = memo(function ChannelControl({ left, right, onChange }: Props) {
  const bal = left === right ? 0 : left > right ? (left - right) / (left + right) : -(right - left) / (left + right)
  const mutedL = left === 0; const mutedR = right === 0

  const handleBalance = (v: number) => {
    const ref = Math.max(left, right, 0.01)
    if (v >= 0) onChange(Math.max(0, ref * (1 - v)), ref)
    else onChange(ref, Math.max(0, ref * (1 + v)))
  }

  return (
    <div style={s.container}>
      <h3 style={s.title}>声道控制</h3>
      <div style={s.headArea}>
        <svg width="140" height="100" viewBox="0 0 140 100" style={{ maxWidth: '100%', height: 'auto' }}>
          <ellipse cx="70" cy="55" rx="35" ry="38" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <circle cx="48" cy="58" r="8" fill={mutedL ? 'var(--bg-elevated)' : 'var(--bg-hover)'} stroke={mutedL ? 'var(--text-dim)' : 'var(--accent)'} strokeWidth="1.5" />
          <circle cx="92" cy="58" r="8" fill={mutedR ? 'var(--bg-elevated)' : 'var(--bg-hover)'} stroke={mutedR ? 'var(--text-dim)' : 'var(--pink)'} strokeWidth="1.5" />
          {!mutedL && <circle cx="48" cy="58" r="4" fill="var(--accent)" opacity={left} />}
          {!mutedR && <circle cx="92" cy="58" r="4" fill="var(--pink)" opacity={right} />}
          <circle cx="70" cy="95" r="12" fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.4" />
          <circle cx="70" cy="95" r="4" fill="var(--accent)" opacity="0.3" />
          <text x="48" y="75" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">L</text>
          <text x="92" y="75" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">R</text>
        </svg>
      </div>
      <div style={s.sliderGroup}>
        <div style={s.balanceRow}>
          <span style={{ ...s.lrLabel, color: 'var(--accent)' }}>L</span>
          <input type="range" min={-1} max={1} step={0.01} value={-bal} onChange={e => handleBalance(parseFloat(e.target.value))} style={s.balanceSlider} />
          <span style={{ ...s.lrLabel, color: 'var(--pink)' }}>R</span>
        </div>
        <div style={{ ...s.balanceLabel, textAlign: 'center' }}>
          {bal === 0 ? '居中' : bal > 0 ? `左偏 ${Math.round(Math.abs(bal) * 100)}%` : `右偏 ${Math.round(Math.abs(bal) * 100)}%`}
        </div>
      </div>
      <div style={s.channels}>
        <div style={s.channelRow}>
          <span style={s.chLabel}>L</span>
          <input type="range" min={0} max={1} step={0.01} value={left} onChange={e => onChange(parseFloat(e.target.value), right)} style={s.chSlider} />
          <span style={s.chValue}>{Math.round(left * 100)}%</span>
          <button style={{ ...s.muteBtn, color: mutedL ? 'var(--red)' : 'var(--text-muted)' }} onClick={() => onChange(left === 0 ? 1 : 0, right)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--text-md)', height: 'var(--text-md)' }}>
              {mutedL ? <><line x1="2" y1="2" x2="22" y2="22" /><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /></> : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 010 7.07" /></>}
            </svg>
          </button>
        </div>
        <div style={s.channelRow}>
          <span style={s.chLabel}>R</span>
          <input type="range" min={0} max={1} step={0.01} value={right} onChange={e => onChange(left, parseFloat(e.target.value))} style={s.chSlider} />
          <span style={s.chValue}>{Math.round(right * 100)}%</span>
          <button style={{ ...s.muteBtn, color: mutedR ? 'var(--red)' : 'var(--text-muted)' }} onClick={() => onChange(left, right === 0 ? 1 : 0)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--text-md)', height: 'var(--text-md)' }}>
              {mutedR ? <><line x1="2" y1="2" x2="22" y2="22" /><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /></> : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 010 7.07" /></>}
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
})

const s: Styles = {
  container: { padding: 'var(--space-lg)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' },
  title: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' },
  headArea: { display: 'flex', justifyContent: 'center', padding: 'var(--space-sm) 0' },
  sliderGroup: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' },
  balanceRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' },
  lrLabel: { fontSize: 'var(--text-lg)', fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: 16, textAlign: 'center' },
  balanceSlider: { flex: 1, height: 'var(--slider-height)' },
  balanceLabel: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)' },
  channels: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', padding: 'var(--space-md)' },
  channelRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' },
  chLabel: { fontSize: 'var(--text-md)', fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: 16, color: 'var(--text-secondary)' },
  chSlider: { flex: 1, height: 'var(--slider-height)' },
  chValue: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: 28, textAlign: 'right' },
  muteBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 'var(--text-md)', padding: 0 }
}

export default ChannelControl
