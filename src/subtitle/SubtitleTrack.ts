import { SubtitleTrack as SubtitleTrackType, EnhancedSubtitleEntry, DetectedCharacter } from '../types'
import { parseSubtitleFile, getCurrentSubtitle } from './SubtitleParser'

export class SubtitleManager {
  private tracks: SubtitleTrackType[] = []
  private activeIndex = -1

  async loadFromFile(filePath: string, trackTitle?: string): Promise<SubtitleTrackType | null> {
    try {
      let content: string | null = null

      if (window.electronAPI?.readTextFile) {
        content = await window.electronAPI.readTextFile(filePath)
      } else {
        const url = filePath.startsWith('http://') || filePath.startsWith('https://') ? filePath : `file://${filePath}`
        const response = await fetch(url)
        content = await response.text()
      }

      if (!content) return null
      const track = parseSubtitleFile(content, filePath, trackTitle)
      if (track) {
        this.addTrack(track)
      }
      return track
    } catch {
      return null
    }
  }

  addTrack(track: SubtitleTrackType) {
    this.tracks.push(track)
    if (this.activeIndex === -1) {
      this.activeIndex = 0
    }
  }

  removeTrack(index: number) {
    if (index >= 0 && index < this.tracks.length) {
      this.tracks.splice(index, 1)
      if (this.activeIndex >= this.tracks.length) {
        this.activeIndex = this.tracks.length - 1
      }
    }
  }

  setActive(index: number) {
    if (index >= -1 && index < this.tracks.length) {
      this.activeIndex = index
    }
  }

  getActive(): SubtitleTrackType | null {
    return this.activeIndex >= 0 ? this.tracks[this.activeIndex] : null
  }

  getActiveEntry(currentTime: number): EnhancedSubtitleEntry | null {
    const active = this.getActive()
    if (!active) return null
    return getCurrentSubtitle(active.entries, currentTime)
  }

  getActiveEntries(): EnhancedSubtitleEntry[] {
    const active = this.getActive()
    return active?.entries || []
  }

  getActiveCharacters(): DetectedCharacter[] {
    const active = this.getActive()
    return active?.characters || []
  }

  getTracks(): SubtitleTrackType[] {
    return this.tracks
  }

  getActiveIndex(): number {
    return this.activeIndex
  }

  getActiveCharacterColor(charName: string): string | undefined {
    const chars = this.getActiveCharacters()
    return chars.find(c => c.name === charName)?.color
  }

  clear() {
    this.tracks = []
    this.activeIndex = -1
  }
}
