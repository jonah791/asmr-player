import React, { useRef, useEffect, memo } from 'react'
import { Styles } from '../../styles/types'

interface Props {
  analyserData: number[]
  isPlaying: boolean
  channelLeft?: number
  channelRight?: number
}

export const Visualization = memo(function Visualization({ analyserData, isPlaying, channelLeft = 0.5, channelRight = 0.5 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
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

    if (!isPlaying) {
      const cx = w / 2, cy = h / 2
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20)
      g.addColorStop(0, 'rgba(155, 109, 255, 0.15)')
      g.addColorStop(1, 'rgba(155, 109, 255, 0)')
      ctx.fillStyle = g
      ctx.fillRect(cx - 30, cy - 30, 60, 60)
      ctx.fillStyle = 'rgba(155, 109, 255, 0.2)'
      ctx.font = `${Math.min(h * 0.3, 16)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('♪', cx, cy)
      return
    }

    const data = analyserData
    const barCount = Math.min(data.length, Math.floor(w / 2.5))
    const barWidth = w / barCount
    const grad = ctx.createLinearGradient(0, h, 0, 0)
    grad.addColorStop(0, 'rgba(155, 109, 255, 0.1)')
    grad.addColorStop(0.3, 'rgba(155, 109, 255, 0.4)')
    grad.addColorStop(0.6, 'rgba(192, 132, 252, 0.6)')
    grad.addColorStop(1, 'rgba(244, 114, 182, 0.7)')
    ctx.fillStyle = grad

    for (let i = 0; i < barCount; i++) {
      const v = (data[i] || 0) / 255
      const bh = Math.max(1, v * h * 0.85)
      const x = (i / barCount) * w
      const r = Math.min(barWidth / 2, 2)
      ctx.beginPath()
      if (ctx.roundRect) {
        ctx.roundRect(x + 0.5, h - bh, barWidth - 1, bh, [r, r, 0, 0])
      } else {
        ctx.rect(x + 0.5, h - bh, barWidth - 1, bh)
      }
      ctx.fill()
    }

    const balance = (channelLeft - channelRight) / 2
    const dotX = w / 2 + balance * (w * 0.35)
    const dotY = h - 10

    ctx.beginPath()
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(244, 114, 182, 0.8)'
    ctx.fill()
    ctx.shadowColor = 'rgba(244, 114, 182, 0.5)'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.3)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.fillStyle = 'rgba(155, 109, 255, 0.15)'
    ctx.font = `${Math.min(h * 0.12, 9)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('L', 8, h - 3)
    ctx.fillText('R', w - 8, h - 3)
  }, [analyserData, isPlaying, channelLeft, channelRight])

  return (
    <div style={s.container}>
      <canvas ref={canvasRef} style={s.canvas} />
    </div>
  )
})

const s: Styles = {
  container: { height: 'var(--viz-height)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', overflow: 'hidden' },
  canvas: { width: '100%', height: '100%', display: 'block' }
}
