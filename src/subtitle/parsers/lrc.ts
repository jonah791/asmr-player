import { SubtitleEntry } from '../../types'

export function parseLRC(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = []
  const lines = content.split('\n')
  const tagRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/
  const multiTagRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const tags: number[] = []
    let match: RegExpExecArray | null
    let lastIndex = 0
    while ((match = multiTagRegex.exec(trimmed)) !== null) {
      const ms = match[3].length === 2 ? parseInt(match[3]) * 10 : parseInt(match[3])
      tags.push(parseInt(match[1]) * 60 + parseInt(match[2]) + ms / 1000)
      lastIndex = match.index + match[0].length
    }

    const text = trimmed.slice(lastIndex).trim()
    if (tags.length === 0 || !text) continue

    for (const tag of tags) {
      const existing = entries.find(e => Math.abs(e.start - tag) < 0.05)
      if (existing) {
        existing.text += '\n' + text
      } else {
        entries.push({ start: tag, end: tag + 5, text })
      }
    }
  }

  for (let i = 0; i < entries.length - 1; i++) {
    entries[i].end = entries[i + 1].start
  }

  return entries
}
