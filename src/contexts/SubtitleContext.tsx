import React, { createContext, useContext, useMemo, ReactNode } from 'react'
import { DetectedCharacter, EnhancedSubtitleEntry } from '../types'

interface SubtitleContextValue {
  fontSize: number
  opacity: number
  background: 'transparent' | 'semi' | 'blur'
  showEarDirection: boolean
  showCharacterName: boolean
  showActions: boolean
  position: 'bottom' | 'top'
  enabled: boolean
  characters: DetectedCharacter[]
  currentEntry: EnhancedSubtitleEntry | null
  subtitleCount: number
  subtitleActiveIndex: number
  onFontSizeChange: (s: number) => void
  onOpacityChange: (o: number) => void
  onBackgroundChange: (b: 'transparent' | 'semi' | 'blur') => void
  onShowEarDirection: (s: boolean) => void
  onShowCharacterName: (s: boolean) => void
  onShowActions: (s: boolean) => void
  onPositionChange: (p: 'bottom' | 'top') => void
  onEnabledChange: (e: boolean) => void
}

const SubtitleContext = createContext<SubtitleContextValue | null>(null)

export function SubtitleProvider({ value, children }: { value: SubtitleContextValue; children: ReactNode }) {
  return <SubtitleContext.Provider value={value}>{children}</SubtitleContext.Provider>
}

export function useSubtitleContext(): SubtitleContextValue {
  const ctx = useContext(SubtitleContext)
  if (!ctx) throw new Error('useSubtitleContext must be used within SubtitleProvider')
  return ctx
}
