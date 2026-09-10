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
  // ★★★★ 唯一徽章（王座）**絕不可**寫進 localStorage。
  //   它是會被別人搶走的，而本機這份沒有人會回來把它刪掉 ⇒ 症狀是
  //   「王座早就易主了，收藏庫與個人頁卻還顯示你有」——名片端點會再驗一次
  //   所以名片不會說謊，但站內其他地方會，而使用者無從分辨哪一個才對。
  //   ⚠️ 更嚴重的是 syncBadges 會把本機這份 POST 上去合併：唯一徽章一旦
  //     混進去，就會被寫成 user_badges 的永久所有權。後端已擋（兩道），
  //     這裡是第三道——三道都必要，因為它們各自防的是不同的路徑。
  const next = [...new Set(list)].filter(id => BADGES_TIER[id] !== 'unique')
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
  // ★★★ 集滿一張卡的全部小挑戰 ⇒ 一併拿到那個節氣的卡片徽章。
  //   ⚠️ 前端這一份不是多餘的：**訪客沒有 session**，後端那條路他完全走不到，
  //     少了這裡他集滿五枚也拿不到節氣卡徽章——而訪客正是掃到卡片的主要客群。
  //   ⚠️ 判定走 termBadgesCompletedBy 這支純函式，與後端共用同一份；
  //     兩邊各寫一份遲早分岔，症狀是「本機說集滿了、重整之後又沒有」。
  const alsoEarned = termBadgesCompletedBy(id, list)
  if (isNew || alsoEarned.length) save([...list, id, ...alsoEarned])
  if (loggedIn) {
    // fire-and-forget：失敗就交給下次登入的合併。
    // 節氣卡徽章也送上去——後端會自己再算一次，重複沒有副作用。
    api.earnBadges([id, ...alsoEarned]).catch(() => { /* 本機那份還在 */ })
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

// ⚠️ 徽章「目錄」已搬到 src/data/badges.js（內容與邏輯分層，同 termArticle.js
//    與 almanac.js 的關係）。這裡 re-export 是為了讓既有的 import 一行都不用改
//    ——Profile.jsx／ArQuiz.jsx／check-ar.mjs 都是從這裡拿 BADGES 的。
export { BADGES } from '../data/badges.js'
import { BADGES as BADGE_CATALOG, termBadgesCompletedBy } from '../data/badges.js'
const BADGES_TIER = Object.fromEntries(Object.entries(BADGE_CATALOG).map(([k, v]) => [k, v.tier]))
