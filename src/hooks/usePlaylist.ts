import { useState, useCallback } from 'react'
import { Work, Track, TrackWithWork, TreeNode } from '../types'

function hasChildrenWithAudio(node: TreeNode): boolean {
  if (!node.isDir) return true
  return node.children.some(c => hasChildrenWithAudio(c))
}

export function usePlaylist() {
  const [works, setWorks] = useState<Work[]>([])
  const [currentWorkIdx, setCurrentWorkIdx] = useState(-1)
  const [currentTrackIdx, setCurrentTrackIdx] = useState(-1)
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null)

  const addWorks = useCallback((newWorks: Work[]) => {
    setWorks(prev => {
      const existing = new Set(prev.map(w => w.path))
      const unique = newWorks.filter(w => !existing.has(w.path))
      return [...prev, ...unique]
    })
  }, [])

  const removeWork = useCallback((workPath: string) => {
    setWorks(prev => prev.filter(w => w.path !== workPath))
  }, [])

  const getActiveTrackList = useCallback((work: Work): Track[] => {
    return work.tracks || []
  }, [])

  const getCurrent = useCallback((): TrackWithWork | null => {
    if (currentWorkIdx < 0 || currentWorkIdx >= works.length) return null
    const work = works[currentWorkIdx]
    const tracks = getActiveTrackList(work)
    if (currentTrackIdx < 0 || currentTrackIdx >= tracks.length) return null
    return { track: tracks[currentTrackIdx], workName: work.name, workPath: work.path, workCover: work.cover }
  }, [works, currentWorkIdx, currentTrackIdx, getActiveTrackList])

  const playAt = useCallback((workPath: string, trackIdx: number): TrackWithWork | null => {
    const wi = works.findIndex(w => w.path === workPath)
    if (wi < 0) return null
    const work = works[wi]
    const tracks = getActiveTrackList(work)
    if (trackIdx < 0 || trackIdx >= tracks.length) return null
    setCurrentWorkIdx(wi)
    setCurrentTrackIdx(trackIdx)
    return { track: tracks[trackIdx], workName: work.name, workPath: work.path, workCover: work.cover }
  }, [works, getActiveTrackList])

  const playNext = useCallback((): TrackWithWork | null => {
    if (currentWorkIdx < 0 || currentWorkIdx >= works.length) return null
    const work = works[currentWorkIdx]
    const tracks = getActiveTrackList(work)
    const next = currentTrackIdx + 1
    if (next < tracks.length) {
      setCurrentTrackIdx(next)
      return { track: tracks[next], workName: work.name, workPath: work.path, workCover: work.cover }
    }
    return null
  }, [works, currentWorkIdx, currentTrackIdx, getActiveTrackList])

  const playPrev = useCallback((): TrackWithWork | null => {
    if (currentWorkIdx < 0 || currentWorkIdx >= works.length) return null
    const work = works[currentWorkIdx]
    const tracks = getActiveTrackList(work)
    const prev = currentTrackIdx - 1
    if (prev >= 0) {
      setCurrentTrackIdx(prev)
      return { track: tracks[prev], workName: work.name, workPath: work.path, workCover: work.cover }
    }
    return null
  }, [works, currentWorkIdx, currentTrackIdx, getActiveTrackList])

  const selectRoute = useCallback((routeId: string | null) => {
    setActiveRouteId(routeId)
  }, [])

  return {
    works,
    currentWorkIdx,
    currentTrackIdx,
    activeRouteId,
    addWorks,
    removeWork,
    setWorks,
    getCurrent,
    playAt,
    playNext,
    playPrev,
    selectRoute,
    getActiveTrackList
  }
}
