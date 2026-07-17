import { SubtitleEntry, SubtitleFormat, SubtitleTrack, EnhancedSubtitleEntry } from '../types'
import { parseSRT } from './parsers/srt'
import { parseLRC } from './parsers/lrc'
import { parseVTT } from './parsers/vtt'
import { parseASS } from './parsers/ass'
import { enhanceSubtitleEntries } from './SubtitleEnhancer'

function detectFormat(filePath: string): SubtitleFormat | null {
  const ext = filePath.toLowerCase()
  // 支持 URL 后附加的 #ext.xxx 格式标记
  const hashMatch = ext.match(/#ext\.(srt|lrc|vtt|ass|ssa|txt)$/)
  if (hashMatch) return hashMatch[1] as SubtitleFormat
  if (ext.endsWith('.srt')) return 'srt'
  if (ext.endsWith('.lrc')) return 'lrc'
  if (ext.endsWith('.vtt')) return 'vtt'
  if (ext.endsWith('.ass')) return 'ass'
  if (ext.endsWith('.ssa')) return 'ssa'
  if (ext.endsWith('.txt')) return 'txt'
  return null
}

function parseTXT(content: string): SubtitleEntry[] {
  const lines = content.trim().split('\n').filter(l => l.trim())
  if (lines.length === 0) return []
  const firstLine = lines[0]

  const vttMatch = firstLine.match(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/)
  if (firstLine === 'WEBVTT' || vttMatch) {
    return parseVTT(content)
  }

  const srtMatch = firstLine.match(/^\d+\s*$/)
  if (srtMatch && lines.length >= 3) {
    const timeLine = lines[1]?.match(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/)
    if (timeLine) return parseSRT(content)
  }

  return lines.map((text, i) => ({
    start: i * 10,
    end: (i + 1) * 10,
    text: text.trim()
  }))
}

export function parseSubtitleFile(
  content: string,
  filePath: string,
  trackTitle?: string
): SubtitleTrack | null {
  const format = detectFormat(filePath)
  if (!format) return null

  let entries: SubtitleEntry[] = []

  switch (format) {
    case 'srt':
      entries = parseSRT(content)
      break
    case 'lrc':
      entries = parseLRC(content)
      break
    case 'vtt':
      entries = parseVTT(content)
      break
    case 'ass':
    case 'ssa':
      entries = parseASS(content)
      break
    case 'txt':
      entries = parseTXT(content)
      break
  }

  if (entries.length === 0) return null

  const { entries: enhanced, characters } = enhanceSubtitleEntries(entries, trackTitle)

  return {
    file: filePath,
    format,
    entries: enhanced,
    originalEntries: entries,
    characters
  }
}

export function getCurrentSubtitle(
  entries: EnhancedSubtitleEntry[],
  currentTime: number
): EnhancedSubtitleEntry | null {
  for (const entry of entries) {
    if (currentTime >= entry.start && currentTime < entry.end) {
      return entry
    }
  }
  return null
}
