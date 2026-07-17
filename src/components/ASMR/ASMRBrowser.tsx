import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { KikoeruWork, KikoeruTrackNode, DownloadTask, TrackWithWork, Track } from '../../types'

type SortOrder = 'release' | 'rate_average_2dp' | 'dl_count' | 'random'
type SortDir = 'desc' | 'asc'

interface Props {
  onSearch: (keyword: string, page: number, subtitleOnly?: boolean) => Promise<{ works: KikoeruWork[]; pagination: { currentPage: number; totalCount: number } }>
  onGetWorks: (page: number, order?: string, sort?: string, subtitleOnly?: boolean) => Promise<{ works: KikoeruWork[]; pagination: { currentPage: number; totalCount: number } }>
  onGetTracks: (workId: number) => Promise<KikoeruTrackNode[]>
  onStartDownload: (workId: number, trackIndex: number, destDir: string) => Promise<{ taskId: string }>
  onPlay: (track: TrackWithWork) => void
  coverUrlFn: (work: KikoeruWork) => string
  downloads: DownloadTask[]
}

function hasChineseSub(work: KikoeruWork): boolean {
  const lang = work.translation_info?.lang
  if (lang === 'CHI_HANS' || lang === 'CHI_HANT') return true
  if (work.other_language_editions_in_db?.some(e => e.lang === 'zh-cn' || e.lang === 'zh-tw' || e.lang === 'CHI_HANS' || e.lang === 'CHI_HANT')) return true
  const chineseTag = work.tags?.some(t => t.name?.includes('中文') || t.name?.includes('中国語') || t.name?.includes('简体') || t.name?.includes('繁体'))
  if (chineseTag) return true
  return false
}

const SORT_LABELS: Record<SortOrder, string> = { release: '发布日期', rate_average_2dp: '评分', dl_count: '下载数', random: '随机' }

export function ASMRBrowser({ onSearch, onGetWorks, onGetTracks, onStartDownload, onPlay, coverUrlFn, downloads }: Props) {
  const [keyword, setKeyword] = useState('')
  const [works, setWorks] = useState<KikoeruWork[]>([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedWork, setSelectedWork] = useState<KikoeruWork | null>(null)
  const [tracks, setTracks] = useState<KikoeruTrackNode[]>([])
  const [tracksLoading, setTracksLoading] = useState(false)
  const [downloading, setDownloading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('release')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [subtitleOnly, setSubtitleOnly] = useState(false)
  const [activeTab, setActiveTab] = useState<'browse' | 'hot'>('browse')
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const pageSize = 12

  const loadWorks = useCallback(async (kw: string, pg: number, order: SortOrder, dir: SortDir, subOnly: boolean) => {
    setLoading(true)
    setError('')
    try {
      const data = kw.trim()
        ? await onSearch(kw.trim(), pg, subOnly)
        : await onGetWorks(pg, order, dir, subOnly)
      setWorks(data.works || [])
      setTotalCount(data.pagination?.totalCount || 0)
      if (!data.works?.length && !kw.trim()) setError('暂无数据')
    } catch (e: any) {
      setError(e.message || '请求失败')
      setWorks([])
    }
    setLoading(false)
  }, [onSearch, onGetWorks])

  useEffect(() => {
    setPage(1)
    loadWorks(keyword, 1, sortOrder, sortDir, subtitleOnly)
  }, [sortOrder, sortDir, subtitleOnly, activeTab])

  useEffect(() => { loadWorks('', 1, sortOrder, sortDir, subtitleOnly) }, [])

  const handleSearch = useCallback((value: string) => {
    setKeyword(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      loadWorks(value, 1, sortOrder, sortDir, subtitleOnly)
    }, 400)
  }, [sortOrder, sortDir, subtitleOnly, loadWorks])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    loadWorks(keyword, newPage, sortOrder, sortDir, subtitleOnly)
  }, [keyword, sortOrder, sortDir, subtitleOnly, loadWorks])

  const handleSelectWork = useCallback(async (work: KikoeruWork) => {
    setSelectedWork(work)
    setTracksLoading(true)
    setTracks([])
    try {
      const t = await onGetTracks(work.id)
      setTracks(t || [])
    } catch (e) { console.error('加载曲目失败:', e) }
    setTracksLoading(false)
  }, [onGetTracks])

  const handlePlayTrack = useCallback((work: KikoeruWork, trackNode: KikoeruTrackNode) => {
    const track: Track = { file: '', title: trackNode.title, subtitles: [] }
    const tw: TrackWithWork = {
      track,
      workName: work.title,
      workPath: String(work.id),
      workCover: work.mainCoverUrl || work.thumbnailCoverUrl,
      streamUrl: trackNode.mediaStreamUrl || trackNode.mediaDownloadUrl,
    }
    onPlay(tw)
  }, [onPlay])

  const handleDownload = useCallback(async (workId: number, trackIndex: number) => {
    const key = `${workId}_${trackIndex}`
    setDownloading(prev => ({ ...prev, [key]: true }))
    try {
      await onStartDownload(workId, trackIndex, '')
    } catch (e: any) {
      console.error('下载失败:', e)
    }
    setDownloading(prev => ({ ...prev, [key]: false }))
  }, [onStartDownload])

  const collectAudioTracks = (nodes: KikoeruTrackNode[], depth = 0): KikoeruTrackNode[] => {
    const result: KikoeruTrackNode[] = []
    for (const node of nodes) {
      if (node.type === 'audio') result.push(node)
      if (node.children && depth < 3) result.push(...collectAudioTracks(node.children, depth + 1))
    }
    return result
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const isDownloading = (workId: number, idx: number) =>
    downloading[`${workId}_${idx}`] ||
    downloads.some(d => d.workId === workId && d.trackIndex === idx && d.status !== 'completed')

  return (
    <div style={containerStyle}>
      {/* 顶部栏：搜索 + 筛选 */}
      <div style={toolbarStyle}>
        <div style={searchBarStyle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ width: 14, height: 14, color: 'var(--text-dim)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input style={searchInputStyle} placeholder="搜索 RJ 作品、声优、社团…"
            value={keyword} onChange={e => handleSearch(e.target.value)} />
          {loading && <div style={spinnerStyle} />}
        </div>

        <div style={filterBarStyle}>
          {/* Tab: 浏览 / 热度 */}
          <div style={tabRowStyle}>
            <button style={{ ...tabBtnStyle, ...(activeTab === 'browse' ? tabActiveStyle : {}) }}
              onClick={() => setActiveTab('browse')}>浏览</button>
            <button style={{ ...tabBtnStyle, ...(activeTab === 'hot' ? tabActiveStyle : {}) }}
              onClick={() => setActiveTab('hot')}>🔥 热度</button>
          </div>

          {/* 排序 */}
          <select style={selectStyle} value={sortOrder}
            onChange={e => setSortOrder(e.target.value as SortOrder)}>
            {(Object.entries(SORT_LABELS) as [SortOrder, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <button style={dirBtnStyle} onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            title={sortDir === 'desc' ? '降序' : '升序'}>
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>

          {/* 中文字幕筛选 */}
          <label style={filterLabelStyle}>
            <input type="checkbox" checked={subtitleOnly}
              onChange={e => setSubtitleOnly(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }} />
            <span>中文</span>
          </label>
        </div>
      </div>

      {/* 内容 */}
      <div style={contentStyle}>
        {selectedWork ? (
          <div style={detailPanelStyle}>
            <div style={detailHeaderStyle}>
              <button style={backBtnStyle} onClick={() => setSelectedWork(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ width: 14, height: 14 }}><path d="M19 12H5m7-7l-7 7 7 7" /></svg>
                返回
              </button>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                {selectedWork.source_id || `#${selectedWork.id}`}
              </span>
            </div>

            <div style={detailInfoStyle}>
              <img src={coverUrlFn(selectedWork)} alt=""
                style={detailCoverStyle}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              <div style={detailMetaStyle}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, lineHeight: 1.3 }}>
                  {selectedWork.title}
                  {hasChineseSub(selectedWork) && <span style={cnBadgeStyle}>中文</span>}
                </span>
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                  {selectedWork.name} · {selectedWork.release}
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                  {selectedWork.vas?.slice(0, 3).map(v => (
                    <span key={v.id} style={tagStyle}>{v.name}</span>
                  ))}
                </div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-secondary)' }}>
                  ⭐ {selectedWork.rate_average_2dp?.toFixed(2)} · 💾 {selectedWork.dl_count} · 💰 ¥{selectedWork.price}
                  · ⏱ {Math.floor((selectedWork.duration || 0) / 60)}分
                </div>
                {selectedWork.description && (
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>
                    {selectedWork.description.replace(/<[^>]*>/g, '').slice(0, 200)}
                  </div>
                )}
              </div>
            </div>

            {/* 曲目列表 */}
            <div style={tracksHeaderStyle}>
              音轨 ({collectAudioTracks(tracks).length})
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-dim)', fontWeight: 400, marginLeft: 'var(--space-sm)' }}>
                点击 ▶ 在线播放 · ↓ 下载到本地
              </span>
            </div>
            {tracksLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-dim)', fontSize: 'var(--text-xs)' }}>加载中…</div>
            ) : (
              <div style={tracksListStyle}>
                {collectAudioTracks(tracks).map((track, idx) => (
                  <div key={idx} style={trackRowStyle}>
                    <div style={trackInfoStyle}>
                      <span style={trackTitleStyle}>{track.title}</span>
                      {track.duration && (
                        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-dim)' }}>
                          {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                          {track.size && track.size > 1000000 ? ` · ${(track.size / 1024 / 1024).toFixed(1)}MB` : ''}
                        </span>
                      )}
                    </div>
                    <div style={trackActionsStyle}>
                      <button style={playBtnStyle}
                        onClick={() => handlePlayTrack(selectedWork, track)}
                        title="在线播放" disabled={!track.mediaStreamUrl}>
                        ▶
                      </button>
                      <button style={downloadBtnStyle}
                        onClick={() => handleDownload(selectedWork.id, idx)}
                        disabled={isDownloading(selectedWork.id, idx)}>
                        {isDownloading(selectedWork.id, idx) ? '…' : '↓'}
                      </button>
                    </div>
                  </div>
                ))}
                {tracks.length === 0 && (
                  <div style={{ padding: 'var(--space-md)', color: 'var(--text-dim)', fontSize: 'var(--text-xs)' }}>暂无音轨</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={gridStyle}>
              {works.map(work => (
                <div key={work.id} style={cardStyle} onClick={() => handleSelectWork(work)}>
                  <div style={cardCoverStyle}>
                    <img src={coverUrlFn(work)} alt=""
                      style={cardImgStyle}
                      onError={e => {
                        const el = e.target as HTMLImageElement
                        el.style.display = 'none'
                        el.parentElement!.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:10px">无图</div>'
                      }} />
                  </div>
                  <div style={cardBodyStyle}>
                    <span style={cardTitleStyle}>{work.title}</span>
                    <span style={cardSubStyle}>
                      {work.name} · ⭐{work.rate_average_2dp?.toFixed(1)}
                    </span>
                    <div style={rowStyle}>
                      <div style={tagRowStyle}>
                        {work.tags?.slice(0, 2).map(tag => (
                          <span key={tag.id} style={miniTagStyle}>{tag.name}</span>
                        ))}
                      </div>
                      {hasChineseSub(work) && <span style={cnMiniBadge}>中文</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!loading && works.length === 0 && (
              <div style={emptyStyle}>{error || '暂无数据'}</div>
            )}

            {totalPages > 1 && (
              <div style={paginationStyle}>
                <button style={pageBtnStyle} disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>‹</button>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
                <button style={pageBtnStyle} disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' }
const toolbarStyle: React.CSSProperties = { flexShrink: 0, borderBottom: '1px solid var(--border)' }
const searchBarStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
  padding: 'var(--space-sm) var(--space-md)',
  background: 'var(--bg-tertiary)',
}
const searchInputStyle: React.CSSProperties = {
  flex: 1, background: 'transparent', border: 'none',
  fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
  outline: 'none', fontFamily: 'inherit',
}
const spinnerStyle: React.CSSProperties = {
  width: 14, height: 14, borderRadius: '50%',
  border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
  animation: 'spin 0.6s linear infinite', flexShrink: 0,
}
const filterBarStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-xs)',
  padding: 'var(--space-2xs) var(--space-sm)',
  background: 'var(--bg-secondary)', flexWrap: 'wrap',
}
const tabRowStyle: React.CSSProperties = { display: 'flex', gap: 2 }
const tabBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', padding: '2px 8px',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  fontSize: 'var(--text-2xs)', fontWeight: 500,
  color: 'var(--text-muted)',
}
const tabActiveStyle: React.CSSProperties = { color: 'var(--accent)', background: 'var(--accent-dim)' }
const selectStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', padding: '1px 4px',
  fontSize: 'var(--text-2xs)', color: 'var(--text-secondary)',
  outline: 'none', cursor: 'pointer',
}
const dirBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none',
  color: 'var(--text-muted)', cursor: 'pointer',
  fontSize: 'var(--text-xs)', padding: '2px 4px',
}
const filterLabelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)',
  fontSize: 'var(--text-2xs)', color: 'var(--text-muted)',
  cursor: 'pointer', marginLeft: 'auto',
}
const contentStyle: React.CSSProperties = { flex: 1, overflow: 'auto' }
const gridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: 'var(--space-sm)', padding: 'var(--space-md)',
}
const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
  overflow: 'hidden', cursor: 'pointer',
  border: '1px solid var(--border)',
  transition: 'border-color var(--transition-fast), transform var(--transition-fast)',
}
const cardCoverStyle: React.CSSProperties = { width: '100%', aspectRatio: '1', overflow: 'hidden', background: 'var(--bg-tertiary)' }
const cardImgStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const cardBodyStyle: React.CSSProperties = { padding: 'var(--space-xs) var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' }
const cardTitleStyle: React.CSSProperties = { fontSize: 'var(--text-2xs)', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const cardSubStyle: React.CSSProperties = { fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2xs)' }
const tagRowStyle: React.CSSProperties = { display: 'flex', gap: 'var(--space-2xs)', flexWrap: 'wrap', overflow: 'hidden' }
const miniTagStyle: React.CSSProperties = { fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
const emptyStyle: React.CSSProperties = { textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }
const paginationStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)' }
const pageBtnStyle: React.CSSProperties = { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-xs) var(--space-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 }

// ─── detail panel styles ───
const detailPanelStyle: React.CSSProperties = { padding: 'var(--space-md)', overflow: 'auto', height: '100%' }
const detailHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }
const backBtnStyle: React.CSSProperties = { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-xs) var(--space-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-2xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)' }
const detailInfoStyle: React.CSSProperties = { display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }
const detailCoverStyle: React.CSSProperties = { width: 100, height: 100, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0, background: 'var(--bg-tertiary)' }
const detailMetaStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)', flex: 1, minWidth: 0 }
const tagStyle: React.CSSProperties = { fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(155,109,255,0.1)', color: 'var(--accent)' }
const cnBadgeStyle: React.CSSProperties = { fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(52,211,153,0.15)', color: 'var(--green)', marginLeft: 'var(--space-xs)', verticalAlign: 'middle', fontWeight: 400 }
const cnMiniBadge: React.CSSProperties = { fontSize: '8px', padding: '0 3px', borderRadius: '2px', background: 'rgba(52,211,153,0.15)', color: 'var(--green)', flexShrink: 0 }
const tracksHeaderStyle: React.CSSProperties = { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-xs)' }
const tracksListStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' }
const trackRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)' }
const trackInfoStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden', flex: 1 }
const trackTitleStyle: React.CSSProperties = { fontSize: 'var(--text-2xs)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const trackActionsStyle: React.CSSProperties = { display: 'flex', gap: 'var(--space-2xs)', flexShrink: 0 }
const playBtnStyle: React.CSSProperties = { background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2xs) var(--space-xs)', color: 'var(--green)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, transition: 'all var(--transition-fast)' }
const downloadBtnStyle: React.CSSProperties = { background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2xs) var(--space-xs)', color: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, transition: 'all var(--transition-fast)' }
