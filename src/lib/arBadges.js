// ============================================================================
// 節氣徽章 —— P0 只存本機，不動後端
//
// 改版文件 §4.3 的分階段：P0 localStorage、P1 上後端並在首次登入時合併去重。
// 這樣訪客也能拿徽章（站上的訪客模式沒有 session，寫入 API 一律 401）。
//
// ⚠️ 命名沿用站上的 `jq-` 慣例（jq-guest／jq-theme／jq-ar-cards-v2…），
//    不要用文件寫的 `cq.ar.badges`——同一個 app 兩套 key 命名遲早會漏掉一邊
//    （例如「刪除帳號時清掉所有本機資料」那段程式碼）。
// ============================================================================
const KEY = 'jq-ar-badges'

export function loadBadges() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []
  } catch { return [] }
}

/** @returns {boolean} 這次是不是新拿到的（用來決定要不要播慶祝動畫） */
export function earnBadge(id) {
  if (!id) return false
  const list = loadBadges()
  if (list.includes(id)) return false
  try {
    localStorage.setItem(KEY, JSON.stringify([...list, id]))
    return true
  } catch { return false }
}

export const hasBadge = id => loadBadges().includes(id)

export const BADGES = {
  'badge-xiaohan-napa': { id: 'badge-xiaohan-napa', name: '小寒 · 結球白菜', term: '小寒' },
}
