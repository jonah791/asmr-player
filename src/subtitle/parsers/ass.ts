import { SubtitleEntry } from '../../types'

export function parseASS(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = []
  const lines = content.split('\n')

  let formatLine: string | null = null
  let inEvents = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('[Events]')) {
      inEvents = true
      continue
    }

    if (inEvents) {
      if (trimmed.startsWith('Format:')) {
        formatLine = trimmed.slice(7).trim()
        continue
      }

      if (trimmed.startsWith('Dialogue:')) {
        if (!formatLine) continue
        const parts = trimmed.slice(9).trim().split(',')
        const formatParts = formatLine.split(',').map(f => f.trim())

        const startIdx = formatParts.indexOf('Start')
        const endIdx = formatParts.indexOf('End')
        const textIdx = formatParts.indexOf('Text')

        if (startIdx === -1 || endIdx === -1 || textIdx === -1) continue

        const startTime = parts[startIdx]?.trim()
        const endTime = parts[endIdx]?.trim()
        const text = parts.slice(textIdx).join(',').trim()

        const start = parseASSTime(startTime)
        const end = parseASSTime(endTime)

        if (isNaN(start) || isNaN(end) || !text) continue
        const cleaned = text.replace(/\\N/g, '\n').replace(/\{[^}]*\}/g, '').trim()
        if (cleaned) {
          entries.push({ start, end, text: cleaned })
        }
      }
    }
  }

  return entries
}

function parseASSTime(time: string): number {
  const parts = time.split(':')
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2])
  }
  if (parts.length === 4) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]) + parseFloat(parts[3]) / 100
  }
  return NaN
}
