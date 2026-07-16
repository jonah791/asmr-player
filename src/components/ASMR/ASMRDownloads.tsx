import React from 'react'
import type { DownloadTask } from '../../types'

interface Props {
  downloads: DownloadTask[]
  onCancel: (taskId: string) => void
}

export function ASMRDownloads({ downloads, onCancel }: Props) {
  const activeTasks = downloads.filter(d => d.status === 'downloading' || d.status === 'queued')
  const completedTasks = downloads.filter(d => d.status === 'completed')
  const errorTasks = downloads.filter(d => d.status === 'error')
  const pausedTasks = downloads.filter(d => d.status === 'paused')

  if (downloads.length === 0) {
    return (
      <div style={emptyStyle}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"
          style={{ width: 32, height: 32, color: 'var(--text-dim)', marginBottom: 'var(--space-sm)' }}>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>暂无下载任务</span>
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
          在浏览中点击 ↓ 按钮添加下载
        </span>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
          下载管理 ({downloads.length})
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
          <span>进行中 {activeTasks.length}</span>
          <span>已完成 {completedTasks.length}</span>
          {errorTasks.length > 0 && <span style={{ color: 'var(--red)' }}>失败 {errorTasks.length}</span>}
        </div>
      </div>

      <div style={listStyle}>
        {/* 进行中 */}
        {activeTasks.map(task => (
          <div key={task.id} style={taskCardStyle}>
            <div style={taskInfoStyle}>
              <span style={taskTitleStyle}>{task.trackTitle}</span>
              <span style={taskWorkStyle}>{task.workTitle}</span>
              <div style={progressBarBgStyle}>
                <div style={{
                  ...progressBarFillStyle,
                  width: `${task.totalBytes > 0 ? (task.receivedBytes / task.totalBytes * 100) : 0}%`
                }} />
              </div>
              <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                {formatSize(task.receivedBytes)} / {formatSize(task.totalBytes)}
              </span>
            </div>
            <button style={cancelBtnStyle} onClick={() => onCancel(task.id)}>×</button>
          </div>
        ))}

        {/* 暂停 */}
        {pausedTasks.map(task => (
          <div key={task.id} style={{ ...taskCardStyle, opacity: 0.6 }}>
            <div style={taskInfoStyle}>
              <span style={taskTitleStyle}>{task.trackTitle}</span>
              <span style={taskWorkStyle}>{task.workTitle} — 已暂停</span>
            </div>
            <button style={cancelBtnStyle} onClick={() => onCancel(task.id)}>×</button>
          </div>
        ))}

        {/* 错误 */}
        {errorTasks.map(task => (
          <div key={task.id} style={{ ...taskCardStyle, borderColor: 'rgba(248,113,113,0.3)' }}>
            <div style={taskInfoStyle}>
              <span style={taskTitleStyle}>{task.trackTitle}</span>
              <span style={{ ...taskWorkStyle, color: 'var(--red)' }}>
                {task.error || '下载失败'}
              </span>
            </div>
            <button style={cancelBtnStyle} onClick={() => onCancel(task.id)}>×</button>
          </div>
        ))}

        {/* 已完成 */}
        {completedTasks.slice(-10).reverse().map(task => (
          <div key={task.id} style={{ ...taskCardStyle, borderColor: 'rgba(52,211,153,0.2)' }}>
            <div style={taskInfoStyle}>
              <span style={taskTitleStyle}>{task.trackTitle}</span>
              <span style={{ ...taskWorkStyle, color: 'var(--green)' }}>✓ 下载完成</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100%',
  animation: 'fade-up 0.25s ease-out',
}
const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: 'var(--space-sm) var(--space-md)',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-secondary)', flexShrink: 0,
}
const listStyle: React.CSSProperties = {
  flex: 1, overflow: 'auto', padding: 'var(--space-sm)',
  display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)',
}
const taskCardStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  padding: 'var(--space-sm)', gap: 'var(--space-sm)',
  background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
}
const taskInfoStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
}
const taskTitleStyle: React.CSSProperties = {
  fontSize: 'var(--text-2xs)', fontWeight: 500,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const taskWorkStyle: React.CSSProperties = {
  fontSize: '9px', color: 'var(--text-muted)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const progressBarBgStyle: React.CSSProperties = {
  width: '100%', height: 3, background: 'var(--bg-elevated)',
  borderRadius: 2, overflow: 'hidden', marginTop: 2,
}
const progressBarFillStyle: React.CSSProperties = {
  height: '100%', background: 'var(--gradient-accent)',
  borderRadius: 2, transition: 'width 0.3s ease',
}
const cancelBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none',
  color: 'var(--text-dim)', cursor: 'pointer',
  fontSize: 'var(--text-md)', padding: 0, lineHeight: 1,
  flexShrink: 0,
}
const emptyStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  height: '100%', gap: 'var(--space-2xs)',
}
