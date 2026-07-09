import React, { ReactNode } from 'react'
import { Styles } from '../styles/types'

interface Props {
  titleBar: ReactNode
  sidebar: ReactNode
  panel: ReactNode
  content: ReactNode
  subtitleOverlay: ReactNode
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
}

export function AppLayout({ titleBar, sidebar, panel, content, subtitleOverlay, onDrop, onDragOver }: Props) {
  return (
    <div style={styles.container} onDrop={onDrop} onDragOver={onDragOver}>
      {titleBar}
      <div style={styles.main}>
        {sidebar}
        {panel}
        <div style={styles.content}>{content}</div>
      </div>
      {subtitleOverlay}
    </div>
  )
}

const styles: Styles = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-deepest)' },
  main: { flex: 1, display: 'flex', overflow: 'hidden' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg-deepest)', minWidth: 0 }
}
