// 文字清理工具（2026-09-09 全站禁用 emoji）
//
// ★ 為什麼要有執行期的 stripEmoji：原始碼裡的 emoji 已經用 codemod 全部拿掉，
//   但正式站的資料庫（ref_items／posts／users.avatar／通知文字）與模型輸出仍然
//   會帶 emoji。只清原始碼的話，畫面上還是會冒出來。所以**凡是把資料庫或模型
//   的字串印到畫面上的地方，都要過一次 stripEmoji**。
// ⚠️ 只清「圖像式」emoji（含變體選擇子與膚色修飾），不清 ★☆✓✕ 這類排版符號：
//    星等、勾選、關閉鈕靠它們，而它們在任何字型下都是單色線條，不是彩色卡通圖。

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}\u{2615}\u{2618}\u{261D}\u{2620}\u{2622}\u{2623}\u{2626}\u{262A}\u{262E}\u{262F}\u{2638}-\u{263A}\u{2640}\u{2642}\u{2648}-\u{2653}\u{265F}\u{2660}\u{2663}\u{2665}\u{2666}\u{2668}\u{267B}\u{267E}\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}\u{269C}\u{26A0}\u{26A1}\u{26A7}\u{26AA}\u{26AB}\u{26B0}\u{26B1}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26C8}\u{26CE}\u{26CF}\u{26D1}\u{26D3}\u{26D4}\u{26E9}\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{200D}\u{FE0F}\u{20E3}\u{E0020}-\u{E007F}]/gu

/** 去掉字串裡的 emoji，並收掉它留下的多餘空白。非字串原樣回傳。 */
export function stripEmoji(s) {
  if (typeof s !== 'string') return s
  return s.replace(EMOJI_RE, '').replace(/[ \t　]{2,}/g, ' ').replace(/^[ 　]+|[ 　]+$/g, '')
}

/** 是否含 emoji（給「這個值能不能當圖示名稱」之類的判斷用） */
export function hasEmoji(s) {
  if (typeof s !== 'string') return false
  EMOJI_RE.lastIndex = 0
  return EMOJI_RE.test(s)
}

/** 取一個字當作「字形磚」（頭像／縮圖佔位）：優先第一個中文字，否則第一個字母數字，否則空字串 */
export function glyphOf(label) {
  const s = stripEmoji(String(label || ''))
  const m = s.match(/[一-鿿]/) || s.match(/[A-Za-z0-9]/)
  return m ? m[0].toUpperCase() : ''
}
