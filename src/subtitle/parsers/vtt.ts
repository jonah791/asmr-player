import { SubtitleEntry } from '../../types'

export function parseVTT(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = []
  let text = content.trim()

  if (text.startsWith('WEBVTT')) {
    const firstNewline = text.indexOf('\n')
    text = text.slice(firstNewline + 1)
  }

  const blocks = text.split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) continue

    const timeRegex = /(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/
    let timeIdx = 0
    let timeMatch = lines[0].match(timeRegex)
    if (!timeMatch) {
      timeMatch = lines[1]?.match(timeRegex)
      timeIdx = 1
    }
    if (!timeMatch) continue

    const start = toSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4])
    const end = toSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8])
    const textLines = lines.slice(timeIdx + 1).join('\n').trim()

    if (textLines) {
      entries.push({ start, end, text: textLines })
    }
  }

  return entries
}

function toSeconds(h: string, m: string, s: string, ms: string): number {
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000
}
