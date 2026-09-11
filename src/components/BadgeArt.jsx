import { useState } from 'react'
import { BADGES } from '../data/badges.js'

// ============================================================================
// 徽章圖（2026-09-11）
//
// 圖檔在 `public/badges/<徽章id>.png`，由 `scripts/build-badge-icons.mjs`
// 從美術原稿轉出（去背＋裁邊＋縮到 128²）。**同源，所以 CSP 的 `img-src 'self'`
// 本來就允許**，不必動任何設定。
//
// ★★★ 圖載不出來一定要退回字形磚，不可以留一個空框。
//   會載不出來的情境比想像多：新增了一枚徽章但還沒補圖、轉檔腳本沒跑過、
//   舊版快取。這幾種的共通症狀都是「格子裡空一塊」——而字形磚本來就長得
//   夠好（那是 2026-09-10 全站禁用 emoji 時就做好的方案），退回去毫無損失。
//   ⇒ 所以圖是**加分項不是必需品**，站規「失效要退回可用狀態」在這裡的實作。
//
// ⚠️ `loading="lazy"` 是必要的：收藏庫一次列出 69 枚 ＝ 2 MB。
//   懶載入之後只有捲到的那幾張會下載，首屏實測只抓十幾張。
//
// ⚠️ `alt=""` 是對的：名稱就寫在旁邊的 `.bv-name`／`.badgechip b` 裡，
//   讀屏再唸一次圖片的 alt 等於同一個名字唸兩遍。外層按鈕另有 aria-label。
// ============================================================================
export default function BadgeArt({ id, className = '', size }) {
  const [broken, setBroken] = useState(false)
  const meta = BADGES[id]
  const glyph = meta?.glyph || '章'

  if (broken || !meta) {
    // 退回字形磚（與圖同一個位置、同一個 class，版面不會跳）
    return <span className={`badge-art is-glyph ${className}`} aria-hidden="true">{glyph}</span>
  }
  return (
    <img
      className={`badge-art ${className}`}
      src={`/badges/${id}.png`}
      alt=""
      width={size} height={size}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  )
}
