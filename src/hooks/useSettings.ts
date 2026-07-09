import { useState, useCallback, useEffect, useRef } from 'react'
import { PlaySettings, EQBand, EQPreset, EQ_PRESETS } from '../types'

const STORAGE_KEY = 'asmr-player-settings'

let saveTimer: ReturnType<typeof setTimeout> | null = null
function debounceSave(data: PlaySettings) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }, 300)
}

const DEFAULT_SETTINGS: PlaySettings = {
  volume: 0.8,
  channelLeft: 1,
  channelRight: 1,
  eqBands: EQ_PRESETS.flat,
  eqPreset: 'flat',
  playMode: 'sequential',
  subtitleEnabled: true,
  subtitleFontSize: 20,
  subtitleOpacity: 0.85,
  subtitleBackground: 'semi',
  subtitleShowEarDirection: true,
  subtitleShowCharacterName: true,
  subtitleShowActions: true,
  subtitleCharacterColors: {},
  subtitlePosition: 'bottom'
}

export function useSettings() {
  const [settings, setSettings] = useState<PlaySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch { }
    return DEFAULT_SETTINGS
  })

  useEffect(() => {
    debounceSave(settings)
  }, [settings])

  const updateVolume = useCallback((vol: number) => {
    setSettings(s => ({ ...s, volume: vol }))
  }, [])

  const updateChannel = useCallback((left: number, right: number) => {
    setSettings(s => ({ ...s, channelLeft: left, channelRight: right }))
  }, [])

  const updateEQ = useCallback((bands: EQBand[]) => {
    setSettings(s => ({ ...s, eqBands: bands, eqPreset: 'custom' }))
  }, [])

  const setEQPreset = useCallback((preset: EQPreset) => {
    const bands = EQ_PRESETS[preset]
    if (bands) {
      setSettings(s => ({ ...s, eqBands: bands, eqPreset: preset }))
    }
  }, [])

  const updateSubtitle = useCallback((enabled: boolean) => {
    setSettings(s => ({ ...s, subtitleEnabled: enabled }))
  }, [])

  const updateSubtitleFontSize = useCallback((size: number) => {
    setSettings(s => ({ ...s, subtitleFontSize: size }))
  }, [])

  const updateSubtitleOpacity = useCallback((opacity: number) => {
    setSettings(s => ({ ...s, subtitleOpacity: opacity }))
  }, [])

  const updateSubtitleBackground = useCallback((bg: PlaySettings['subtitleBackground']) => {
    setSettings(s => ({ ...s, subtitleBackground: bg }))
  }, [])

  const updateSubtitleShowEar = useCallback((show: boolean) => {
    setSettings(s => ({ ...s, subtitleShowEarDirection: show }))
  }, [])

  const updateSubtitleShowName = useCallback((show: boolean) => {
    setSettings(s => ({ ...s, subtitleShowCharacterName: show }))
  }, [])

  const updateSubtitleShowActions = useCallback((show: boolean) => {
    setSettings(s => ({ ...s, subtitleShowActions: show }))
  }, [])

  const updateSubtitlePosition = useCallback((pos: PlaySettings['subtitlePosition']) => {
    setSettings(s => ({ ...s, subtitlePosition: pos }))
  }, [])

  const setCharacterColors = useCallback((colors: Record<string, string>) => {
    setSettings(s => ({ ...s, subtitleCharacterColors: colors }))
  }, [])

  const updatePlayMode = useCallback((mode: PlaySettings['playMode']) => {
    setSettings(s => ({ ...s, playMode: mode }))
  }, [])

  return {
    settings,
    updateVolume,
    updateChannel,
    updateEQ,
    setEQPreset,
    updateSubtitle,
    updateSubtitleFontSize,
    updateSubtitleOpacity,
    updateSubtitleBackground,
    updateSubtitleShowEar,
    updateSubtitleShowName,
    updateSubtitleShowActions,
    updateSubtitlePosition,
    setCharacterColors,
    updatePlayMode
  }
}
