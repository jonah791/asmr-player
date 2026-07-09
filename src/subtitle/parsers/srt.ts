import { SubtitleEntry } from '../../types'

export function parseSRT(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = []
  const blocks = content.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    const timeLine = lines[1].trim()
    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    )
    if (!timeMatch) continue

    const start = toSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4])
    const end = toSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8])
    const text = lines.slice(2).join('\n').trim()

    if (text) {
      entries.push({ start, end, text })
    }
  }

  return entries
}

function toSeconds(h: string, m: string, s: string, ms: string): number {
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000
}
