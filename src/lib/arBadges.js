import { api } from '../api.js'

// ============================================================================
// 節氣徽章 —— 本機優先，登入後合併上後端
//
// 改版文件 §4.3 的分階段設計：P0 只存 localStorage、P1 上後端並在首次登入時
// 合併去重。這一支同時處理兩者，判準是「有沒有登入」。
//
// 為什麼是「本機優先」而不是「後端唯一」：
//   訪客也要能拿徽章。站上的訪客模式是純前端狀態（沒有 session cookie），
//   所有寫入 API 一律 401——如果徽章只存後端，訪客答對小挑戰會什麼都拿不到，
//   而那是這條動線的獎勵，拿不到就沒有動機答題。
//
// ⚠️ 命名沿用站上的 `jq-` 慣例（jq-guest／jq-theme／jq-ar-cards-v3…），
//    不要用改版文件寫的 `cq.ar.badges`——同一個 app 兩套 key 命名遲早會漏掉
//    一邊（例如「刪除帳號時清掉所有本機資料」那段程式碼）。
// ============================================================================
const KEY = 'jq-ar-badges'
// 合併過的帳號記在這裡，避免每次進站都重打一次 POST
const MERGED_KEY = 'jq-ar-badges-merged'

export function loadBadges() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []
  } catch { return [] }
}

/** 本機清單變動時通知畫面。 */
export const BADGES_EVENT = 'jq-badges-changed'

function save(list) {
  const next = [...new Set(list)]
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { return false }
  // ⚠️ 一定要發事件。徽章牆是掛載時讀一次 localStorage，而 syncBadges 是在
  //    登入之後才把後端那份拉回來——先前少了這一步的症狀是
  //    **換裝置登入後第一次進 /me 看不到徽章，要重整一次才出現**，
  //    而那正好是「上後端」要解決的情境。
  try { window.dispatchEvent(new CustomEvent(BADGES_EVENT, { detail: next })) } catch { /* SSR/測試環境沒有 window */ }
  return true
}

/**
 * 拿到一枚徽章。
 * @returns {boolean} 這次是不是**新**拿到的（用來決定要不要播慶祝動畫）
 *
 * ⚠️ 一律先寫本機再送後端，而且**不等後端回應**：
 *    答對的那一刻就要看到徽章，網路慢不該讓回饋卡住。後端失敗也沒關係——
 *    本機那份還在，下次登入時的合併會把它補上去。
 */
export function earnBadge(id, { loggedIn = false } = {}) {
  if (!id) return false
  const list = loadBadges()
  const isNew = !list.includes(id)
  if (isNew) save([...list, id])
  if (loggedIn) {
    // fire-and-forget：失敗就交給下次登入的合併
    api.earnBadges([id]).catch(() => { /* 本機那份還在 */ })
  }
  return isNew
}

export const hasBadge = id => loadBadges().includes(id)

/**
 * 登入後把本機的徽章合併到後端，並把後端有、本機沒有的抓回本機。
 *
 * ⚠️ 合併是**雙向**的：只往上推的話，換裝置登入會看不到之前拿的徽章；
 *    只往下拉的話，訪客時期拿的會被覆蓋掉。
 * ⚠️ 每個帳號只做一次（記在 MERGED_KEY）——不是為了省一次請求，而是避免
 *    「使用者手動刪掉某枚徽章」這種未來功能被合併邏輯一直復活。
 *
 * @param userId 目前登入者的 id（用來判斷這個帳號合併過了沒）
 */
export async function syncBadges(userId) {
  if (!userId) return null
  let merged = {}
  try { merged = JSON.parse(localStorage.getItem(MERGED_KEY) || '{}') } catch { /* 壞資料就重來 */ }
  const local = loadBadges()
  try {
    if (merged[userId]) {
      // 已經合併過：只往下拉，不再往上推
      const { badges } = await api.badges()
      save([...local, ...badges.map(b => b.id)])
      return badges
    }
    // 首次：把本機那份推上去（後端會忽略重複），回傳合併後的完整清單
    const res = local.length ? await api.earnBadges(local) : await api.badges()
    save([...local, ...res.badges.map(b => b.id)])
    merged[userId] = new Date().toISOString()
    try { localStorage.setItem(MERGED_KEY, JSON.stringify(merged)) } catch { /* 下次再試 */ }
    return res.badges
  } catch {
    // 後端不可用（離線、401）→ 靜靜地用本機那份，不可讓徽章消失
    return null
  }
}

export const BADGES = {
  'badge-xiaohan-napa': { id: 'badge-xiaohan-napa', name: '小寒 · 結球白菜', term: '小寒' },
  // 2026-08-11：五個熱區各給一枚（櫻花那一區沒有小挑戰，見 arCards.js 的說明）。
  // ⚠️ 新增小挑戰時**一定要一起補這裡**：`ArQuiz` 查不到 id 時會退而顯示原始 slug
  //    （arBadges.js 刻意「查不到就顯示 slug 而不是藏起來」——藏起來會變成
  //    「使用者明明拿過卻看不到」），但那是保底不是設計。check-ar.mjs 已上閘門。
  'badge-xiaohan-health': { id: 'badge-xiaohan-health', name: '小寒 · 身體保健', term: '小寒' },
  'badge-xiaohan-produce': { id: 'badge-xiaohan-produce', name: '小寒 · 當令農產', term: '小寒' },
  'badge-xiaohan-almanac': { id: 'badge-xiaohan-almanac', name: '小寒 · 曆頁', term: '小寒' },
  'badge-xiaohan-laba': { id: 'badge-xiaohan-laba', name: '小寒 · 臘八粥', term: '小寒' },
}
