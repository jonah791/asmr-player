import React, { useState, memo } from 'react'
import { Styles } from '../../styles/types'
import { TreeNode, TrackWithWork } from '../../types'

interface Props {
  node: TreeNode
  depth: number
  parentIsLast: boolean[]
  currentFile: string | null
  activeRouteId: string | null
  onPlay: (track: TrackWithWork) => void
  onSelectRoute: (routeId: string | null) => void
  workName: string
  workPath: string
  workCover?: string
}

function getRouteColor(routeId: string): string {
  const colors: Record<string, string> = { A: '#9b6dff', B: '#f472b6', C: '#60a5fa' }
  return colors[routeId] || '#9b6dff'
}

export const TreeView = memo(function TreeView({
  node, depth, parentIsLast, currentFile, activeRouteId,
  onPlay, onSelectRoute, workName, workPath, workCover
}: Props) {
  const [expanded, setExpanded] = useState(false)

  if (node.isSEVariant) return null

  const isAudioLeaf = !node.isDir && !!node.file
  const isRouteDir = !!node.isRoute
  const routeColor = isRouteDir && node.routeId ? getRouteColor(node.routeId) : undefined
  const routeSelected = isRouteDir && node.routeId && activeRouteId === node.routeId
  const isCurrentFile = isAudioLeaf && node.file === currentFile

  const handleClick = () => {
    if (isAudioLeaf && node.file) {
      onPlay({ track: { file: node.file, title: node.title || node.name, subtitles: node.subtitles || [] }, workName, workPath, workCover })
    } else if (isRouteDir && node.routeId) {
      onSelectRoute(activeRouteId === node.routeId ? null : node.routeId)
      setExpanded(true)
    } else if (node.isDir) {
      setExpanded(!expanded)
    }
  }

  const childFiltered = node.children.filter(c => !c.isSEVariant)
  const hasVisibleChildren = childFiltered.length > 0

  return (
    <div>
      <div style={{
        ...s.row,
        paddingLeft: depth * 18 + 6,
        background: isCurrentFile ? 'rgba(155, 109, 255, 0.06)' : routeSelected ? 'rgba(155, 109, 255, 0.03)' : undefined,
        borderLeft: routeSelected ? `2px solid ${routeColor}` : isCurrentFile ? '2px solid var(--accent)' : '2px solid transparent'
      }} onClick={handleClick}>
        {(depth > 0) && (
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0, position: 'absolute', left: depth * 18 - 12, top: '50%', marginTop: -6 }}>
            <line x1="0" y1="6" x2="12" y2="6" stroke="var(--border)" strokeWidth="1" />
            <line x1="0" y1="6" x2="0" y2="0" stroke="var(--border)" strokeWidth="1" />
          </svg>
        )}
        {isAudioLeaf ? (
          <svg viewBox="0 0 24 24" style={s.icon} fill="none" stroke={isCurrentFile ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" /><path d="M9 8v8l7-4-7-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" style={s.icon} fill="none" stroke={routeSelected ? routeColor : 'var(--text-dim)'} strokeWidth="1.5">
            {expanded ? <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /> : <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />}
          </svg>
        )}
        <span style={{
          ...s.label,
          color: isCurrentFile ? 'var(--accent)' : isRouteDir ? (routeSelected ? routeColor : 'var(--text-secondary)') : 'var(--text-primary)',
          fontWeight: isCurrentFile ? 600 : isRouteDir ? 500 : 400
        }}>
          {node.title || node.name}
        </span>
        {isRouteDir && node.routeId && (
          <span style={{ ...s.badge, background: `${routeColor}22`, color: routeColor, border: `1px solid ${routeColor}44` }}>
            {routeSelected ? '✓ 当前' : `路线 ${node.routeId}`}
          </span>
        )}
        {isCurrentFile && (
          <span style={s.playing}>正在播放</span>
        )}
      </div>
      {node.isDir && expanded && hasVisibleChildren && (
        <div>
          {childFiltered.map((child, ci) => (
            <TreeView
              key={child.path}
              node={child}
              depth={depth + 1}
              parentIsLast={[...parentIsLast, ci === childFiltered.length - 1]}
              currentFile={currentFile}
              activeRouteId={activeRouteId}
              onPlay={onPlay}
              onSelectRoute={onSelectRoute}
              workName={workName}
              workPath={workPath}
              workCover={workCover}
            />
          ))}
        </div>
      )}
    </div>
  )
})

const s: Styles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2xs)',
    padding: 'var(--space-2xs) var(--space-xs)',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    transition: 'background var(--transition-fast)',
    position: 'relative',
    minHeight: 'clamp(22px, 2.2vh, 28px)'
  },
  icon: {
    flexShrink: 0,
    width: 'var(--text-sm)',
    height: 'var(--text-sm)'
  },
  label: {
    fontSize: 'var(--text-xs)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.3,
    flex: 1,
    minWidth: 0
  },
  badge: {
    fontSize: 'var(--text-2xs)',
    padding: '0 var(--space-2xs)',
    borderRadius: 4,
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
    lineHeight: '1.5'
  },
  playing: {
    fontSize: 'var(--text-2xs)',
    color: 'var(--accent)',
    flexShrink: 0
  }
}
