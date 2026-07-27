// 內容 fetch hooks —— 一律以「資料庫」為來源；載入中/離線時回退 fallback（避免破版）。
// 因種子資料由 mock.js 灌入，fallback 與資料庫初值一致，切換無縫；使用者的新增/按讚會讓資料庫成為權威。
import { useState, useEffect } from 'react'
import { api } from '../api.js'

// 參考清單（proverbs/deities/festivals/...）
export function useContent(kind, fallback = []) {
  const [data, setData] = useState(fallback)
  useEffect(() => {
    let alive = true
    api.content(kind).then(r => { if (alive && Array.isArray(r.items)) setData(r.items) }).catch(() => {})
    return () => { alive = false }
  }, [kind])
  return data
}

// 可分頁的列表 hook（貼文／作品共用）
// ⚠️ 後端原本硬編 LIMIT，超過的內容永久看不到且前端沒有翻頁機制。
// 這裡回傳 loadMore() 與 hasMore，呼叫端在列表底部放「載入更多」即可。
function usePagedList(fetcher, key, pick, fallback) {
  const [items, setItems] = useState(fallback)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(null)

  // key 變動（換節氣）＝重新開始，不可沿用舊 cursor
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetcher(key, null).then(r => {
      if (!alive) return
      setItems(pick(r)); setHasMore(!!r.hasMore); setCursor(r.nextBefore || null)
    }).catch(() => {}).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [key])

  const loadMore = async () => {
    if (loading || !hasMore || !cursor) return
    setLoading(true)
    try {
      const r = await fetcher(key, cursor)
      setItems(prev => [...prev, ...pick(r)])
      setHasMore(!!r.hasMore); setCursor(r.nextBefore || null)
    } catch { /* 保持現有清單，不清空 */ }
    finally { setLoading(false) }
  }
  return { items, hasMore, loading, loadMore }
}

// 貼文（可依節氣）——回傳陣列以相容既有呼叫端；需要分頁時用 usePostsPaged
export function usePosts(term, fallback = []) {
  const { items } = usePagedList((t, before) => api.posts(t || undefined, before), term || '', r => r.posts, fallback)
  return items
}
export function usePostsPaged(term, fallback = []) {
  return usePagedList((t, before) => api.posts(t || undefined, before), term || '', r => r.posts, fallback)
}

// 市集作品（可依節氣篩）
export function useWorks(term, fallback = []) {
  const { items } = usePagedList((t, before) => api.works(t || undefined, before), term || '', r => r.works, fallback)
  return items
}
export function useWorksPaged(term, fallback = []) {
  return usePagedList((t, before) => api.works(t || undefined, before), term || '', r => r.works, fallback)
}
