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

// 貼文（可依節氣）；fallback 作為載入中的佔位（與資料庫初值相同）
export function usePosts(term, fallback = []) {
  const [posts, setPosts] = useState(fallback)
  useEffect(() => {
    let alive = true
    // ⚠️ 先前呼叫 api.posts() 完全不傳 term，等於節氣篩選在伺服器端從未生效
    // （只能對回傳的前 60 筆做前端過濾，第 61 筆之後的該節氣內容永遠看不到）。
    api.posts(term || undefined).then(r => { if (alive) setPosts(r.posts) }).catch(() => {})
    return () => { alive = false }
  }, [term])
  return posts
}

// 市集作品（可依節氣篩）
export function useWorks(term, fallback = []) {
  const [works, setWorks] = useState(fallback)
  useEffect(() => {
    let alive = true
    api.works(term).then(r => { if (alive) setWorks(r.works) }).catch(() => {})
    return () => { alive = false }
  }, [term])
  return works
}
