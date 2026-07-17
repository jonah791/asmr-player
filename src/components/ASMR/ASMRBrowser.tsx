import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { KikoeruWork, KikoeruTrackNode, DownloadTask, TrackWithWork, Track, LocalFavorite } from '../../types'

type SortOrder = 'release' | 'rate_average_2dp' | 'dl_count' | 'random'
type SortDir = 'desc' | 'asc'
type ViewTab = 'browse' | 'hot' | 'favorites'

interface Props {
  onSearch: (keyword: string, page: number, subtitleOnly?: boolean) => Promise<{ works: KikoeruWork[]; pagination: { currentPage: number; totalCount: number } }>
  onGetWorks: (page: number, order?: string, sort?: string) => Promise<{ works: KikoeruWork[]; pagination: { currentPage: number; totalCount: number } }>
  onGetTracks: (workId: number) => Promise<KikoeruTrackNode[]>
  onStartDownload: (workId: number, trackIndex: number, destDir: string) => Promise<{ taskId: string }>
  onPlay: (track: TrackWithWork) => void
  onGetFavorites: () => Promise<LocalFavorite[]>
  onAddFavorite: (work: { id: number; title: string; mainCoverUrl?: string; thumbnailCoverUrl?: string }) => Promise<void>
  onRemoveFavorite: (workId: number) => Promise<void>
  onGetWorkDetail: (workId: number) => Promise<KikoeruWork>
  coverUrlFn: (work: KikoeruWork) => string
  downloads: DownloadTask[]
}

function hasChineseSub(work: KikoeruWork): boolean {
  const lang = work.translation_info?.lang
  if (lang === 'CHI_HANS' || lang === 'CHI_HANT') return true
  if (work.other_language_editions_in_db?.some(e => e.lang === 'zh-cn' || e.lang === 'zh-tw' || e.lang === 'CHI_HANS' || e.lang === 'CHI_HANT')) return true
  if (work.tags?.some(t => t.name?.includes('中文') || t.name?.includes('中国語') || t.name?.includes('简体') || t.name?.includes('繁体'))) return true
  return false
}

const SORT_LABELS: Record<SortOrder, string> = { release: '发布日期', rate_average_2dp: '评分', dl_count: '下载数', random: '随机' }

export function ASMRBrowser({ onSearch, onGetWorks, onGetTracks, onStartDownload, onPlay, onGetFavorites, onAddFavorite, onRemoveFavorite, onGetWorkDetail, coverUrlFn, downloads }: Props) {
  const [keyword, setKeyword] = useState('')
  const [works, setWorks] = useState<KikoeruWork[]>([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedWork, setSelectedWork] = useState<KikoeruWork | null>(null)
  const [tracks, setTracks] = useState<KikoeruTrackNode[]>([])
  const [tracksLoading, setTracksLoading] = useState(false)
  const [downloading, setDownloading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('release')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [subtitleOnly, setSubtitleOnly] = useState(false)
  const [activeTab, setActiveTab] = useState<ViewTab>('browse')
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [favWorks, setFavWorks] = useState<KikoeruWork[]>([])
  const [favLoading, setFavLoading] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollLoadingRef = useRef(false)

  const pageSize = 12

  // ─── 加载列表 ───

  const loadWorks = useCallback(async (kw: string, pg: number, order: SortOrder, dir: SortDir, subOnly: boolean, append = false) => {
    setLoading(true)
    setError('')
    try {
      const data = kw.trim() ? await onSearch(kw.trim(), pg) : await onGetWorks(pg, order, dir)
      let filtered = data.works || []
      if (subOnly) filtered = filtered.filter(w => hasChineseSub(w))
      setWorks(prev => append ? [...prev, ...filtered] : filtered)
      setPage(pg)
      setTotalCount(data.pagination?.totalCount || 0)
      if (!filtered.length && !append && !kw.trim()) setError(subOnly ? '未找到有中文字幕的作品' : '暂无数据')
    } catch (e: any) {
      setError(e.message || '请求失败')
      if (!append) setWorks([])
    }
    setLoading(false)
  }, [onSearch, onGetWorks])

  const loadFavorites = useCallback(async () => {
    setFavLoading(true)
    setFavWorks([])
    try {
      const local = await onGetFavorites()
      setFavorites(new Set(local.map(f => f.id)))
      // 从 API 拉取每个收藏作品的详细信息
      if (local.length === 0) { setFavWorks([]); return }
      const details = await Promise.allSettled(local.map(f => onGetWorkDetail(f.id)))
      setFavWorks(details.map(d => d.status === 'fulfilled' ? d.value : null).filter(Boolean) as KikoeruWork[])
    } catch { setFavWorks([]) }
    setFavLoading(false)
  }, [onGetFavorites, onGetWorkDetail])

  useEffect(() => {
    if (activeTab === 'favorites') {
      setWorks([])
      setSelectedWork(null)
      loadFavorites()
      return
    }
    // 热度 Tab 自动设为下载数排序
    const order = activeTab === 'hot' ? 'dl_count' : sortOrder
    setWorks([])
    loadWorks(keyword, 1, order, sortDir, subtitleOnly)
  }, [sortOrder, sortDir, subtitleOnly, activeTab])

  // ─── 搜索 ───

  const handleSearch = useCallback((value: string) => {
    setKeyword(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { loadWorks(value, 1, sortOrder, sortDir, subtitleOnly) }, 400)
  }, [sortOrder, sortDir, subtitleOnly, loadWorks])

  // ─── 加载更多 ───

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || loading) return
    if (activeTab === 'favorites') return
    const nextPage = page + 1
    const totalPages = Math.ceil(totalCount / pageSize)
    if (page >= totalPages) return

    scrollLoadingRef.current = true
    setLoadingMore(true)
    await loadWorks(keyword, nextPage, sortOrder, sortDir, subtitleOnly, true)
    setLoadingMore(false)
    scrollLoadingRef.current = false
  }, [loadingMore, loading, activeTab, page, totalCount, keyword, sortOrder, sortDir, subtitleOnly, loadWorks])

  // ─── 详情 ───

  const handleSelectWork = useCallback(async (work: KikoeruWork) => {
    setSelectedWork(work)
    setTracksLoading(true)
    setTracks([])
    try { setTracks(await onGetTracks(work.id) || []) }
    catch (e) { console.error('加载曲目失败:', e) }
    setTracksLoading(false)
  }, [onGetTracks])

  // ─── 在线播放 ───

  /** 从 tracks 树中查找与音频同名的字幕文件 URL */
  const findSubtitleUrls = (nodes: KikoeruTrackNode[], audioTitle: string): string[] => {
    const result: string[] = []
    const audioBase = audioTitle.replace(/\.(mp3|wav|flac|m4a|ogg)$/i, '').toLowerCase()
    const walk = (list: KikoeruTrackNode[]) => {
      for (const node of list) {
        if (node.type === 'text' && node.mediaStreamUrl) {
          const nodeBase = node.title.replace(/\.(vtt|lrc|srt|ass|ssa|txt)$/i, '').toLowerCase()
          if (nodeBase === audioBase || nodeBase.startsWith(audioBase)) {
            // URL 后附加扩展名用于 format 检测
            const extMatch = node.title.match(/\.(vtt|lrc|srt|ass|ssa|txt)$/i)
            const ext = extMatch ? extMatch[0] : '.txt'
            result.push(node.mediaStreamUrl + '#ext' + ext)
          }
        }
        if (node.children) walk(node.children)
      }
    }
    walk(nodes)
    return result
  }

  /** 压平音轨树，保留文件夹标记 */
  const flattenTracksWithFolders = (nodes: KikoeruTrackNode[], depth = 0, folderPath = ''): { node: KikoeruTrackNode; folder: string; depth: number }[] => {
    const result: { node: KikoeruTrackNode; folder: string; depth: number }[] = []
    for (const node of nodes) {
      if (node.type === 'folder') {
        // 跳过没有音轨的子文件夹
        if (node.children?.some(c => c.type === 'audio' || c.children?.some(cc => cc.type === 'audio'))) {
          // 递归子文件夹
          result.push(...flattenTracksWithFolders(node.children, depth + 1, folderPath + '/' + node.title))
        }
      } else if (node.type === 'audio') {
        result.push({ node, folder: folderPath, depth })
      }
    }
    return result
  }

  const handlePlayTrack = useCallback((work: KikoeruWork, trackNode: KikoeruTrackNode) => {
    const subUrls = findSubtitleUrls(tracks, trackNode.title)
    onPlay({
      track: { file: '', title: trackNode.title, subtitles: subUrls },
      workName: work.title,
      workPath: String(work.id),
      workCover: work.mainCoverUrl || work.thumbnailCoverUrl,
      streamUrl: trackNode.mediaStreamUrl || trackNode.mediaDownloadUrl,
    })
  }, [onPlay, tracks])

  // ─── 收藏 ───

  const handleToggleFavorite = useCallback(async (work: KikoeruWork, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (favorites.has(work.id)) {
        await onRemoveFavorite(work.id)
        setFavorites(prev => { const n = new Set(prev); n.delete(work.id); return n })
        setFavWorks(prev => prev.filter(w => w.id !== work.id))
      } else {
        await onAddFavorite({ id: work.id, title: work.title, mainCoverUrl: work.mainCoverUrl, thumbnailCoverUrl: work.thumbnailCoverUrl })
        setFavorites(prev => new Set(prev).add(work.id))
        setFavWorks(prev => [...prev, work])
      }
    } catch { /* ignore */ }
  }, [favorites, onAddFavorite, onRemoveFavorite])

  // ─── 下载 ───

  const handleDownload = useCallback(async (workId: number, trackIndex: number) => {
    const key = `${workId}_${trackIndex}`
    setDownloading(prev => ({ ...prev, [key]: true }))
    try { await onStartDownload(workId, trackIndex, '') }
    catch (e: any) { console.error('下载失败:', e) }
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

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasMore = activeTab !== 'favorites' && page < totalPages

  // ─── 无限滚动 ───
  const hasMoreRef = useRef(hasMore)
  hasMoreRef.current = hasMore

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const onScroll = () => {
      if (scrollLoadingRef.current || !hasMoreRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = el
      if (scrollHeight - scrollTop - clientHeight < 300) handleLoadMore()
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [handleLoadMore])

  const isDl = (workId: number, idx: number) =>
    downloading[`${workId}_${idx}`] || downloads.some(d => d.workId === workId && d.trackIndex === idx && d.status !== 'completed')

  // ─── 作品网格 ───

  const renderGrid = (items: KikoeruWork[]) => (
    <div style={gridStyle}>
      {items.map(work => (
        <div key={work.id} style={cardStyle} onClick={() => handleSelectWork(work)}>
          <div style={cardCoverStyle}>
            <button style={favBtnStyle(favorites.has(work.id))}
              onClick={e => handleToggleFavorite(work, e)}
              title={favorites.has(work.id) ? '取消收藏' : '收藏'}>
              {favorites.has(work.id) ? '♥' : '♡'}
            </button>
            <img src={coverUrlFn(work)} alt="" style={cardImgStyle}
              onError={e => {
                const el = e.target as HTMLImageElement; el.style.display = 'none'
                el.parentElement!.innerHTML += '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:10px">无图</div>'
              }} />
          </div>
          <div style={cardBodyStyle}>
            <span style={cardTitleStyle}>{work.title}</span>
            <span style={cardSubStyle}>{work.name} · ⭐{work.rate_average_2dp?.toFixed(1)}</span>
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
  )

  // ─── 音轨详情 ───

  const renderDetail = () => {
    if (!selectedWork) return null
    return (
      <div style={detailPanelStyle}>
        <div style={detailHeaderStyle}>
          <button style={backBtnStyle} onClick={() => setSelectedWork(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M19 12H5m7-7l-7 7 7 7" /></svg>
            返回
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <button style={favBtnStyle(favorites.has(selectedWork.id))}
              onClick={e => handleToggleFavorite(selectedWork, e)}>
              {favorites.has(selectedWork.id) ? '♥' : '♡'}
            </button>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
              {selectedWork.source_id || `#${selectedWork.id}`}
            </span>
          </div>
        </div>
        <div style={detailInfoStyle}>
          <img src={coverUrlFn(selectedWork)} alt="" style={detailCoverStyle}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div style={detailMetaStyle}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, lineHeight: 1.3 }}>
              {selectedWork.title}{hasChineseSub(selectedWork) && <span style={cnBadgeStyle}>中文</span>}
            </span>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{selectedWork.name} · {selectedWork.release}</span>
            <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
              {selectedWork.vas?.slice(0, 3).map(v => <span key={v.id} style={tagStyle}>{v.name}</span>)}
            </div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-secondary)' }}>
              ⭐ {selectedWork.rate_average_2dp?.toFixed(2)} · 💾 {selectedWork.dl_count} · 💰 ¥{selectedWork.price} · ⏱ {Math.floor((selectedWork.duration || 0) / 60)}分
            </div>
          </div>
        </div>
        <div style={tracksHeaderStyle}>
          音轨 ({flattenTracksWithFolders(tracks).length})
          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-dim)', fontWeight: 400, marginLeft: 'var(--space-sm)' }}>▶ 在线播放 · ↓ 下载</span>
        </div>
        {tracksLoading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-dim)' }}>加载中…</div>
        ) : (
          <div style={tracksListStyle}>
            {(() => {
              const flat = flattenTracksWithFolders(tracks)
              let lastFolder = ''
              const allRows: JSX.Element[] = []
              flat.forEach(({ node: track, folder }, idx) => {
                if (folder !== lastFolder) {
                  allRows.push(<div key={`folder-${idx}`} style={folderHeaderStyle}>
                    {folder.split('/').filter(Boolean).map((f, i) => (
                      <span key={i}>{i > 0 ? ' / ' : ''}{f}</span>
                    ))}
                  </div>)
                  lastFolder = folder
                }
                allRows.push(
                  <div key={idx} style={trackRowStyle}>
                    <div style={trackInfoStyle}>
                      <span style={trackTitleStyle}>{track.title}</span>
                      {track.duration ? <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-dim)' }}>
                        {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                        {track.size && track.size > 1000000 ? ` · ${(track.size / 1024 / 1024).toFixed(1)}MB` : ''}
                      </span> : null}
                    </div>
                    <div style={trackActionsStyle}>
                      <button style={playBtnStyle} onClick={() => handlePlayTrack(selectedWork, track)} disabled={!track.mediaStreamUrl}>▶</button>
                      <button style={downloadBtnStyle} onClick={() => handleDownload(selectedWork.id, idx)} disabled={isDl(selectedWork.id, idx)}>{isDl(selectedWork.id, idx) ? '…' : '↓'}</button>
                    </div>
                  </div>
                )
              })
              return allRows
            })()}
            {tracks.length === 0 && <div style={{ padding: 'var(--space-md)', color: 'var(--text-dim)', fontSize: 'var(--text-xs)' }}>暂无音轨</div>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* 顶部栏 */}
      <div style={toolbarStyle}>
        <div style={searchBarStyle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--text-dim)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input style={searchInputStyle} placeholder="搜索 RJ 作品、声优、社团…"
            value={keyword} onChange={e => handleSearch(e.target.value)} />
          {loading && <div style={spinnerStyle} />}
        </div>
        <div style={filterBarStyle}>
          <div style={tabRowStyle}>
            <button style={{ ...tabBtnStyle, ...(activeTab === 'browse' ? tabActiveStyle : {}) }} onClick={() => setActiveTab('browse')}>浏览</button>
            <button style={{ ...tabBtnStyle, ...(activeTab === 'hot' ? tabActiveStyle : {}) }} onClick={() => setActiveTab('hot')}>🔥 热度</button>
            <button style={{ ...tabBtnStyle, ...(activeTab === 'favorites' ? tabActiveStyle : {}) }} onClick={() => setActiveTab('favorites')}>♥ 收藏</button>
          </div>
          {activeTab !== 'favorites' && (
            <>
              <select style={selectStyle} value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)}>
                {(Object.entries(SORT_LABELS) as [SortOrder, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button style={dirBtnStyle} onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}>{sortDir === 'desc' ? '↓' : '↑'}</button>
              <label style={filterLabelStyle}>
                <input type="checkbox" checked={subtitleOnly} onChange={e => setSubtitleOnly(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                <span>中文</span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* 内容 */}
      <div style={contentStyle} ref={contentRef}>
        {selectedWork ? renderDetail() : activeTab === 'favorites' ? (
          favLoading ? (
            <div style={emptyStyle}>加载收藏中…</div>
          ) : favWorks.length === 0 ? (
            <div style={emptyStyle}>还没有收藏作品\n浏览时点击 ♡ 即可收藏</div>
          ) : (
            renderGrid(favWorks)
          )
        ) : (
          <>
            {renderGrid(works)}
            {!loading && works.length === 0 && <div style={emptyStyle}>{error || '暂无数据'}</div>}
            {loadingMore && <div style={scrollLoadStyle}><div style={scrollSpinnerStyle} /></div>}
          </>
        )}
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' }
const toolbarStyle: React.CSSProperties = { flexShrink: 0, borderBottom: '1px solid var(--border)' }
const searchBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-tertiary)' }
const searchInputStyle: React.CSSProperties = { flex: 1, background: 'transparent', border: 'none', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' }
const spinnerStyle: React.CSSProperties = { width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.6s linear infinite' }
const filterBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: 'var(--space-2xs) var(--space-sm)', background: 'var(--bg-secondary)', flexWrap: 'wrap' }
const tabRowStyle: React.CSSProperties = { display: 'flex', gap: 2 }
const tabBtnStyle: React.CSSProperties = { background: 'transparent', border: 'none', padding: '2px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-2xs)', fontWeight: 500, color: 'var(--text-muted)' }
const tabActiveStyle: React.CSSProperties = { color: 'var(--accent)', background: 'var(--accent-dim)' }
const selectStyle: React.CSSProperties = { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1px 4px', fontSize: 'var(--text-2xs)', color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer' }
const dirBtnStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'var(--text-xs)', padding: '2px 4px' }
const filterLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto' }
const contentStyle: React.CSSProperties = { flex: 1, overflow: 'auto' }
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-sm)', padding: 'var(--space-md)' }

const cardStyle: React.CSSProperties = { background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border)', position: 'relative', transition: 'border-color var(--transition-fast)' }
const cardCoverStyle: React.CSSProperties = { width: '100%', aspectRatio: '1', overflow: 'hidden', background: 'var(--bg-tertiary)', position: 'relative' }
const cardImgStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const cardBodyStyle: React.CSSProperties = { padding: 'var(--space-xs) var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' }
const cardTitleStyle: React.CSSProperties = { fontSize: 'var(--text-2xs)', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const cardSubStyle: React.CSSProperties = { fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2xs)' }
const tagRowStyle: React.CSSProperties = { display: 'flex', gap: 'var(--space-2xs)', flexWrap: 'wrap', overflow: 'hidden' }
const miniTagStyle: React.CSSProperties = { fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
const emptyStyle: React.CSSProperties = { textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }
const loadMoreStyle: React.CSSProperties = { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm) var(--space-lg)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 500 }
const scrollLoadStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 'var(--space-md)' }
const scrollSpinnerStyle: React.CSSProperties = { width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.6s linear infinite' }
const favBtnStyle = (isFav: boolean): React.CSSProperties => ({
  position: 'absolute', top: 4, right: 4, zIndex: 2,
  background: isFav ? 'rgba(244,114,182,0.2)' : 'rgba(0,0,0,0.3)',
  border: 'none', borderRadius: '50%', width: 24, height: 24,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: isFav ? 'var(--pink)' : 'rgba(255,255,255,0.4)',
  fontSize: 14, cursor: 'pointer', backdropFilter: 'blur(4px)',
  transition: 'all var(--transition-fast)',
})
const cnMiniBadge: React.CSSProperties = { fontSize: '8px', padding: '0 3px', borderRadius: '2px', background: 'rgba(52,211,153,0.15)', color: 'var(--green)', flexShrink: 0 }

// ─── 详情 ───
const detailPanelStyle: React.CSSProperties = { padding: 'var(--space-md)', overflow: 'auto', height: '100%' }
const detailHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }
const backBtnStyle: React.CSSProperties = { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-xs) var(--space-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-2xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)' }
const detailInfoStyle: React.CSSProperties = { display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }
const detailCoverStyle: React.CSSProperties = { width: 100, height: 100, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0, background: 'var(--bg-tertiary)' }
const detailMetaStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)', flex: 1, minWidth: 0 }
const tagStyle: React.CSSProperties = { fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(155,109,255,0.1)', color: 'var(--accent)' }
const cnBadgeStyle: React.CSSProperties = { fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(52,211,153,0.15)', color: 'var(--green)', marginLeft: 'var(--space-xs)', verticalAlign: 'middle', fontWeight: 400 }
const tracksHeaderStyle: React.CSSProperties = { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-xs)' }
const tracksListStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' }
const trackRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)' }
const trackInfoStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden', flex: 1 }
const trackTitleStyle: React.CSSProperties = { fontSize: 'var(--text-2xs)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const trackActionsStyle: React.CSSProperties = { display: 'flex', gap: 'var(--space-2xs)', flexShrink: 0 }
const playBtnStyle: React.CSSProperties = { background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2xs) var(--space-xs)', color: 'var(--green)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600 }
const downloadBtnStyle: React.CSSProperties = { background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2xs) var(--space-xs)', color: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600 }
const folderHeaderStyle: React.CSSProperties = { fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontWeight: 600, padding: 'var(--space-xs) var(--space-sm) var(--space-2xs)', borderBottom: '1px solid var(--border)', marginTop: 'var(--space-xs)' }
