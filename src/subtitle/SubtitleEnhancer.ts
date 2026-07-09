import { EnhancedSubtitleEntry, SubtitleEntry, DetectedCharacter, EarDirection, SubtitleMood, ActionAnnotation, DEFAULT_CHARACTER_COLORS } from '../types'

const CHARACTER_SELF_INTRO = /(?:我是|我是|名为|名字是|我叫|叫做|称呼)\s*([^\s，。！？、,.\n]{2,8})/
const CHARACTER_REFERENCE = /([\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\w]{2,6})(?:[：:](?!\d)|(?:说着|说道|说|道|笑了笑|低声说))/

const LEFT_EAR_KEYWORDS = /左(?:耳|側|边|方|手)/
const RIGHT_EAR_KEYWORDS = /右(?:耳|側|边|方|手)/
const CENTER_POSITION = /(?:正面|正中|中央|真上)/
const WHISPER_KEYWORDS = /(?:耳语|低语|轻声|小声|ささやき|囁き|無声音|ひそひそ)/
const COMMAND_KEYWORDS = /(?:命令|指示|强制|给我|听话|言う通り|命令|指示)/
const LAUGH_KEYWORDS = /(?:呵呵|哈哈|嘻嘻|ふふ|あはは|くすくす|笑)/

const ONOMATOPOEIA_PATTERNS = [
  /啾[啵啪]{1,3}/, /撸{2,}/, /噗[滋啾]/, /转呀转/, /咕[噜啾]/,
  /chu+|chu+/, /kiss/, /んちゅ/, /ちゅ/
]

const ACTION_SE_PATTERNS: { regex: RegExp; action: ActionAnnotation }[] = [
  { regex: /舔耳/, action: { type: 'action', label: '舔耳', icon: '👅' } },
  { regex: /キス|接吻|kiss/, action: { type: 'action', label: '亲吻', icon: '💋' } },
  { regex: /手交|手淫|オナニー/, action: { type: 'action', label: '手交', icon: '✋' } },
  { regex: /射精/, action: { type: 'action', label: '射精', icon: '💦' } },
  { regex: /挿入/, action: { type: 'action', label: '插入', icon: '🔞' } },
  { regex: /SE[:：]/, action: { type: 'se', label: '音效', icon: '🔊' } },
  { regex: /足音/, action: { type: 'se', label: '脚步声', icon: '👣' } },
  { regex: /喘(?:息|气)/, action: { type: 'perform', label: '喘息', icon: '💨' } },
]

export function enhanceSubtitleEntries(
  entries: SubtitleEntry[],
  trackTitle?: string
): { entries: EnhancedSubtitleEntry[]; characters: DetectedCharacter[] } {
  const characters = extractCharacters(entries, trackTitle)
  const enhanced: EnhancedSubtitleEntry[] = entries.map(entry => {
    const character = detectCharacterForEntry(entry, characters)
    const earDirection = detectEarDirection(entry.text)
    const mood = detectMood(entry.text)
    const actions = detectActions(entry.text)
    const isOnomatopoeia = ONOMATOPOEIA_PATTERNS.some(p => p.test(entry.text))

    const color = character
      ? characters.find(c => c.name === character)?.color
      : undefined

    return {
      ...entry,
      character,
      characterColor: color,
      earDirection,
      mood,
      actions: actions.length > 0 ? actions : undefined,
      isOnomatopoeia: isOnomatopoeia || undefined
    }
  })

  return { entries: enhanced, characters }
}

function extractCharacters(entries: SubtitleEntry[], trackTitle?: string): DetectedCharacter[] {
  const nameSet = new Map<string, number>()
  const allText = entries.map(e => e.text).join(' ')

  const selfIntroMatches = allText.matchAll(new RegExp(CHARACTER_SELF_INTRO, 'g'))
  for (const m of selfIntroMatches) {
    const name = m[1].trim()
    nameSet.set(name, (nameSet.get(name) || 0) + 3)
  }

  const lines = entries.map(e => e.text)
  for (const line of lines) {
    const refMatch = line.match(CHARACTER_REFERENCE)
    if (refMatch) {
      const name = refMatch[1].trim()
      if (name.length >= 2 && !['一个', '这个', '那个', '什么', '怎么', '这样', '那样', '我们', '你们', '他们', '自己'].includes(name)) {
        nameSet.set(name, (nameSet.get(name) || 0) + 1)
      }
    }
  }

  const sorted = [...nameSet.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .filter(([, count]) => count >= 2)

  if (trackTitle) {
    for (const ch of ['塞西莉亚', '索菲', '露比', '拉比斯拉兹莉', '赫利多尔', '雨宿', '时雨', 'ソフィ', 'ミリア']) {
      if (trackTitle.includes(ch) || allText.includes(ch)) {
        if (!sorted.find(([n]) => n === ch)) {
          sorted.push([ch, 1])
        }
      }
    }
  }

  return sorted.map(([name, count], i) => ({
    name,
    color: DEFAULT_CHARACTER_COLORS[i % DEFAULT_CHARACTER_COLORS.length],
    mentionCount: count
  }))
}

function detectCharacterForEntry(entry: SubtitleEntry, characters: DetectedCharacter[]): string | undefined {
  if (characters.length === 0) return undefined

  const text = entry.text

  const colonMatch = text.match(/^([\u4e00-\u9fff\w]{2,6})\s*[：:]/)
  if (colonMatch) {
    const name = colonMatch[1]
    const found = characters.find(c => c.name === name)
    if (found) return found.name
  }

  for (const ch of characters) {
    if (text.startsWith(ch.name) && text.length > ch.name.length + 1) {
      return ch.name
    }
  }

  return undefined
}

function detectEarDirection(text: string): EarDirection {
  const hasLeft = LEFT_EAR_KEYWORDS.test(text)
  const hasRight = RIGHT_EAR_KEYWORDS.test(text)

  if (hasLeft && hasRight) return 'both'
  if (hasLeft) return 'left'
  if (hasRight) return 'right'
  if (CENTER_POSITION.test(text)) return 'center'
  return 'unknown'
}

function detectMood(text: string): SubtitleMood {
  if (ONOMATOPOEIA_PATTERNS.some(p => p.test(text))) return 'action'
  if (WHISPER_KEYWORDS.test(text)) return 'whisper'
  if (COMMAND_KEYWORDS.test(text)) return 'command'
  if (LAUGH_KEYWORDS.test(text)) return 'laugh'
  if (text.includes('！') && text.length < 15) return 'intense'
  if (text.includes('～') || text.includes('~')) return 'seductive'
  return 'normal'
}

function detectActions(text: string): ActionAnnotation[] {
  const actions: ActionAnnotation[] = []
  for (const { regex, action } of ACTION_SE_PATTERNS) {
    if (regex.test(text)) {
      actions.push(action)
    }
  }
  return actions
}
