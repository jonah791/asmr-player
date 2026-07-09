import React, { memo } from 'react'
import { Styles } from '../../styles/types'
import { useSubtitleContext } from '../../contexts/SubtitleContext'

const BG_OPTS = [{ value: 'transparent' as const, label: '无背景' }, { value: 'semi' as const, label: '半透明' }, { value: 'blur' as const, label: '毛玻璃' }]
const FONT_SIZES = [14, 16, 18, 20, 22, 24, 28, 32, 36]

export const SubtitleSettings = memo(function SubtitleSettings() {
  const {
    fontSize, opacity, background, showEarDirection, showCharacterName, showActions,
    position, enabled, characters, currentEntry, subtitleCount, subtitleActiveIndex,
    onFontSizeChange, onOpacityChange, onBackgroundChange, onShowEarDirection,
    onShowCharacterName, onShowActions, onPositionChange, onEnabledChange
  } = useSubtitleContext()

  return (
    <div style={s.container}>
      <div style={s.header}>
        <span style={s.title}>字幕设置</span>
        <label style={s.toggle}>
          <input type="checkbox" checked={enabled} onChange={e => onEnabledChange(e.target.checked)} />
          <span style={s.toggleLabel}>{enabled ? '已开启' : '已关闭'}</span>
        </label>
      </div>

      {subtitleCount > 0 && <div style={s.section}><span style={s.sectionTitle}>字幕轨 ({subtitleActiveIndex + 1}/{subtitleCount})</span></div>}

      <div style={s.section}>
        <span style={s.sectionTitle}>字体大小</span>
        <div style={s.sizeOpts}>
          {FONT_SIZES.map(sz => (
            <button key={sz} style={{ ...s.sizeBtn, ...(fontSize === sz ? s.sizeBtnAct : {}) }} onClick={() => onFontSizeChange(sz)}>{sz}</button>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <span style={s.sectionTitle}>透明度 {Math.round(opacity * 100)}%</span>
        <input type="range" min={0.2} max={1} step={0.05} value={opacity} onChange={e => onOpacityChange(parseFloat(e.target.value))} style={s.slider} />
      </div>

      <div style={s.section}>
        <span style={s.sectionTitle}>背景</span>
        <div style={s.row}>{BG_OPTS.map(o => (
          <button key={o.value} style={{ ...s.optBtn, ...(background === o.value ? s.optBtnAct : {}) }} onClick={() => onBackgroundChange(o.value)}>{o.label}</button>
        ))}</div>
      </div>

      <div style={s.section}>
        <span style={s.sectionTitle}>显示选项</span>
        {[
          [showEarDirection, onShowEarDirection, '耳元方向 (L/R)'],
          [showCharacterName, onShowCharacterName, '角色名'],
          [showActions, onShowActions, '动作标注'],
        ].map(([val, fn, label]) => (
          <label key={label} style={s.checkRow}>
            <input type="checkbox" checked={val as boolean} onChange={e => (fn as (v: boolean) => void)(e.target.checked)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div style={s.section}>
        <span style={s.sectionTitle}>字幕位置</span>
        <div style={s.row}>
          <button style={{ ...s.optBtn, ...(position === 'bottom' ? s.optBtnAct : {}) }} onClick={() => onPositionChange('bottom')}>底部</button>
          <button style={{ ...s.optBtn, ...(position === 'top' ? s.optBtnAct : {}) }} onClick={() => onPositionChange('top')}>顶部</button>
        </div>
      </div>

      {characters.length > 0 && (
        <div style={s.section}>
          <span style={s.sectionTitle}>角色</span>
          {characters.map(ch => (
            <div key={ch.name} style={s.charRow}>
              <span style={{ ...s.dot, background: ch.color }} />
              <span style={s.charName}>{ch.name}</span>
              <span style={s.charCount}>{ch.mentionCount}次</span>
            </div>
          ))}
        </div>
      )}

      {currentEntry?.mood && currentEntry.mood !== 'normal' && (
        <div style={s.section}>
          <span style={s.sectionTitle}>当前语气</span>
          <span style={s.moodBadge}>{currentEntry.mood}</span>
        </div>
      )}
    </div>
  )
})

const s: Styles = {
  container: { padding: 'var(--space-lg)', flex: 1, overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' },
  title: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' },
  toggle: { display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' },
  toggleLabel: { fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' },
  section: { marginBottom: 'var(--space-lg)' },
  sectionTitle: { display: 'block', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)', textTransform: 'uppercase', letterSpacing: 0.5 },
  slider: { width: '100%', height: 'var(--slider-height)' },
  row: { display: 'flex', gap: 'var(--space-xs)' },
  optBtn: { padding: 'var(--space-2xs) var(--space-sm)', fontSize: 'var(--text-xs)', border: '1px solid var(--border)', borderRadius: 12, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all var(--transition-fast)' },
  optBtnAct: { background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent)' },
  sizeOpts: { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2xs)' },
  sizeBtn: { width: 'var(--btn-sm)', height: 'var(--btn-xs)', fontSize: 'var(--text-xs)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' },
  sizeBtnAct: { background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent)' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-2xs)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', cursor: 'pointer' },
  charRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-2xs)', padding: 'var(--space-xs) var(--space-sm)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  charName: { fontSize: 'var(--text-xs)', color: 'var(--text-primary)', flex: 1 },
  charCount: { fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' },
  moodBadge: { display: 'inline-block', padding: 'var(--space-2xs) var(--space-sm)', fontSize: 'var(--text-xs)', borderRadius: 10, background: 'var(--accent-dim)', color: 'var(--accent)' }
}
