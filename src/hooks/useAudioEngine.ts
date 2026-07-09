import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { AudioEngine } from '../engine/AudioEngine'
import { TrackWithWork, EnhancedSubtitleEntry, EQBand, DetectedCharacter } from '../types'
import { SubtitleManager } from '../subtitle/SubtitleTrack'

let engineInstance: AudioEngine | null = null
function getEngine(): AudioEngine {
  if (!engineInstance) engineInstance = new AudioEngine()
  return engineInstance
}

export function useAudioEngine() {
  const engine = useRef(getEngine())
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTrack, setCurrentTrack] = useState<TrackWithWork | null>(null)
  const [currentSubtitle, setCurrentSubtitle] = useState<EnhancedSubtitleEntry | null>(null)
  const [subtitleEntries, setSubtitleEntries] = useState<EnhancedSubtitleEntry[]>([])
  const [subtitleCharacters, setSubtitleCharacters] = useState<DetectedCharacter[]>([])
  const [analyserData, setAnalyserData] = useState<number[]>([])
  const subtitleRef = useRef(new SubtitleManager())

  const loadTrack = useCallback(async (track: TrackWithWork) => {
    const e = engine.current
    subtitleRef.current.clear()
    setSubtitleEntries([])
    setSubtitleCharacters([])
    setCurrentSubtitle(null)
    e.setOnLoad(() => { setDuration(e.getDuration()) })
    await e.loadTrack(track)
    setCurrentTrack(track)
    setCurrentTime(0)
    e.play()
    setIsPlaying(true)
    setIsPaused(false)
    for (const subFile of track.track.subtitles) {
      await subtitleRef.current.loadFromFile(subFile, track.track.title)
    }
    setSubtitleCharacters(subtitleRef.current.getActiveCharacters())
    setSubtitleEntries(subtitleRef.current.getActiveEntries())
  }, [])

  const togglePlay = useCallback(() => {
    const e = engine.current
    if (e.isTrackPlaying()) { e.pause(); setIsPlaying(false); setIsPaused(true) }
    else { e.play(); setIsPlaying(true); setIsPaused(false) }
  }, [])

  const seek = useCallback((time: number) => {
    engine.current.seek(time)
    setCurrentTime(time)
    const entry = subtitleRef.current.getActiveEntry(time)
    setCurrentSubtitle(entry)
  }, [])

  const seekTo = useCallback((time: number) => {
    const e = engine.current
    e.seek(time)
    setCurrentTime(time)
    const entry = subtitleRef.current.getActiveEntry(time)
    setCurrentSubtitle(entry)
    if (!e.isTrackPlaying()) e.play()
    setIsPlaying(true)
    setIsPaused(false)
  }, [])
  const setVolume = useCallback((vol: number) => { engine.current.setVolume(vol) }, [])
  const setChannelVolume = useCallback((l: number, r: number) => { engine.current.setChannelVolume(l, r) }, [])
  const setEQFromBands = useCallback((bands: EQBand[]) => { engine.current.setEQFromBands(bands) }, [])

  useEffect(() => {
    const e = engine.current
    e.setOnTimeUpdate((time) => {
      setCurrentTime(time)
      const entry = subtitleRef.current.getActiveEntry(time)
      setCurrentSubtitle(entry)
    })
    e.setOnEnded(() => { setIsPlaying(false); setIsPaused(false) })
    e.setOnAnalyser((data: number[]) => { setAnalyserData(data) })
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        e.resumeContext()
        setIsPlaying(e.isTrackPlaying())
        setIsPaused(e.isTrackPaused())
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => { e.setOnTimeUpdate(null); e.setOnEnded(null); e.setOnAnalyser(null); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const currentIdx = useMemo(() => {
    if (!currentSubtitle || subtitleEntries.length === 0) return -1
    return subtitleEntries.indexOf(currentSubtitle)
  }, [currentSubtitle, subtitleEntries])

  const engineRef = useRef({
    togglePlay, seek, currentTime: 0, duration: 0,
    loadTrack, setVolume, setChannelVolume, setEQFromBands, seekTo
  })
  engineRef.current.togglePlay = togglePlay
  engineRef.current.seek = seek
  engineRef.current.currentTime = currentTime
  engineRef.current.duration = duration
  engineRef.current.loadTrack = loadTrack
  engineRef.current.setVolume = setVolume
  engineRef.current.setChannelVolume = setChannelVolume
  engineRef.current.setEQFromBands = setEQFromBands
  engineRef.current.seekTo = seekTo

  return {
    currentTrack,
    isPlaying,
    isPaused,
    currentTime,
    duration,
    currentSubtitle,
    subtitleEntries,
    subtitleCharacters,
    analyserData,
    subtitleManager: subtitleRef.current,
    currentIdx,
    loadTrack,
    togglePlay,
    seek,
    seekTo,
    setVolume,
    setChannelVolume,
    setEQFromBands,
    ref: engineRef
  }
}
