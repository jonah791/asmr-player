import React, { useMemo, memo } from 'react'
import { Styles } from '../../styles/types'
import { Work, TrackWithWork } from '../../types'
import { TreeView } from './TreeView'

interface Props {
  works: Work[]
  currentTrack: TrackWithWork | null
  activeRouteId: string | null
  onPlay: (track: TrackWithWork) => void
  onRemove: (workPath: string) => void
  onOpenFiles: () => void
  onSelectRoute: (routeId: string | null) => void
}

function getWorkColor(name: string): string {
  const colors = ['#7c5cbf', '#e55', '#4af', '#fa4', '#5e5', '#f4a', '#af5', '#5af']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function WorkCard({ work, isActive, currentFile, activeRouteId, onPlay, onRemove, onSelectRoute }: {
  work: Work
  isActive: boolean
  currentFile: string | null
  activeRouteId: string | null
  onPlay: (t: TrackWithWork) => void
  onRemove: (path: string) => void
  onSelectRoute: (routeId: string | null) => void
}) {
  const workColor = getWorkColor(work.name)
  const hasSubs = work.tracks.some(t => t.subtitles.length > 0)

  const treeCount = useMemo(() => {
    let c = 0
    function count(n: typeof work.tree) {
      if (!n.isDir) c++
      for (const child of n.children) count(child)
    }
    count(work.tree)
    return c
  }, [work.tree])

  const hasRoutes = useMemo(() => {
    function check(n: typeof work.tree): boolean {
      if (n.isRoute) return true
      return n.children.some(check)
    }
    return check(work.tree)
  }, [work.tree])

  return (
    <div style={{
      ...styles.workCard,
      borderLeft: isActive ? `3px solid ${workColor}` : '3px solid transparent',
      background: isActive ? 'var(--bg-hover)' : undefined
    }}>
      <div style={styles.workHeader}>
        <div style={styles.workInfo}>
          {work.cover && (
            <img src={`file://${work.cover}`} alt="" style={styles.coverThumb} />
          )}
          <div style={styles.workMeta}>
            <span style={styles.workName}>{work.name}</span>
            <span style={styles.workStats}>
              {treeCount} 音轨
              {hasSubs && ' · 字幕'}
              {hasRoutes && ' · 分支'}
            </span>
          </div>
        </div>
        <div style={styles.workActions}>
          <button style={styles.removeBtn} onClick={(e) => { e.stopPropagation(); onRemove(work.path) }}>✕</button>
        </div>
      </div>
      <div style={styles.treeContainer}>
        <TreeView
          node={work.tree}
          depth={0}
          parentIsLast={[]}
          currentFile={currentFile}
          activeRouteId={activeRouteId}
          onPlay={onPlay}
          onSelectRoute={onSelectRoute}
          workName={work.name}
          workPath={work.path}
          workCover={work.cover}
        />
      </div>
    </div>
  )
}

export const PlaylistPanel = memo(function PlaylistPanel({ works, currentTrack, activeRouteId, onPlay, onRemove, onOpenFiles, onSelectRoute }: Props) {
  const currentFile = currentTrack?.track.file || null

  const sortedWorks = useMemo(() => {
    if (!currentFile) return works
    const idx = works.findIndex(w => w.tracks.some(t => t.file === currentFile))
    if (idx <= 0) return works
    const copy = [...works]
    const [item] = copy.splice(idx, 1)
    copy.unshift(item)
    return copy
  }, [works, currentFile])

  if (works.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyMap}>
          <svg width="200" height="80" viewBox="0 0 200 80">
            <circle cx="20" cy="40" r="6" fill="#333" />
            <circle cx="60" cy="40" r="6" fill="#333" />
            <circle cx="100" cy="40" r="6" fill="#333" />
            <circle cx="140" cy="40" r="6" fill="#333" />
            <circle cx="180" cy="40" r="6" fill="var(--accent-dim)" stroke="var(--accent)" strokeWidth="2" />
            <line x1="26" y1="40" x2="54" y2="40" stroke="#333" strokeWidth="2" />
            <line x1="66" y1="40" x2="94" y2="40" stroke="#333" strokeWidth="2" />
            <line x1="106" y1="40" x2="134" y2="40" stroke="#333" strokeWidth="2" />
            <line x1="146" y1="40" x2="174" y2="40" stroke="var(--accent-dim)" strokeWidth="2" strokeDasharray="4" />
          </svg>
        </div>
        <p style={styles.emptyText}>拖入文件夹或文件开始播放</p>
        <p style={styles.emptyHint}>支持 RJ 同人音声作品目录</p>
        <button style={styles.openBtn} onClick={onOpenFiles}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--text-md)', height: 'var(--text-md)', marginRight: 'var(--space-2xs)', verticalAlign: 'middle' }}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
          打开文件/文件夹
        </button>
      </div>
    )
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'var(--text-md)', height: 'var(--text-md)', marginRight: 'var(--space-2xs)', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10" /><path d="M9 8v8l7-4-7-4z" /></svg>
          媒体库
        </span>
        <span style={styles.headerCount}>{works.length} 部作品</span>
        <button style={styles.addBtn} onClick={onOpenFiles}>+</button>
      </div>
      <div style={styles.list}>
        {sortedWorks.map(work => (
          <WorkCard
            key={work.path}
            work={work}
            isActive={work.tracks.some(t => t.file === currentFile)}
            currentFile={currentFile}
            activeRouteId={activeRouteId}
            onPlay={onPlay}
            onRemove={onRemove}
            onSelectRoute={onSelectRoute}
          />
        ))}
      </div>
    </div>
  )
})

const styles: Styles = {
  panel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', borderBottom: '1px solid var(--border)' },
  headerTitle: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' },
  headerCount: { fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginRight: 'auto' },
  addBtn: { width: 'var(--btn-xs)', height: 'var(--btn-xs)', borderRadius: '50%', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 'var(--text-lg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  list: { flex: 1, overflowY: 'auto', padding: 'var(--space-xs) 0' },
  workCard: { margin: 'var(--space-2xs) var(--space-xs)', borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)', overflow: 'hidden', transition: 'all 0.15s' },
  workHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-sm)', cursor: 'pointer', gap: 'var(--space-sm)' },
  workInfo: { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1, minWidth: 0 },
  coverThumb: { width: 'var(--cover-sm)', height: 'var(--cover-sm)', borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0, background: 'var(--bg-primary)' },
  workMeta: { flex: 1, minWidth: 0 },
  workName: { display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  workStats: { display: 'block', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginTop: 1 },
  workActions: { display: 'flex', gap: 'var(--space-2xs)', flexShrink: 0 },
  removeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'var(--text-xs)', padding: 'var(--space-2xs)', width: 'var(--btn-xs)', height: 'var(--btn-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  treeContainer: { borderTop: '1px solid var(--border)', padding: 'var(--space-xs) 0' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)', padding: 'var(--space-xl)' },
  emptyMap: { marginBottom: 'var(--space-sm)', opacity: 0.5 },
  emptyText: { fontSize: 'var(--text-md)', color: 'var(--text-muted)' },
  emptyHint: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', opacity: 0.6 },
  openBtn: { marginTop: 'var(--space-md)', padding: 'var(--space-sm) var(--space-lg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--accent)', fontSize: 'var(--text-md)', cursor: 'pointer', transition: 'all 0.2s' }
}
