// ============================================================================
// TFJS 相容模式 —— 給「特徵點抓得到、比對卻永遠是 0」的裝置
//
// ★ 為什麼需要這個（2026-08-11 使用者實測）：
//   Samsung Xclipse 540（ANGLE on Vulkan 1.3.279）上，
//     心跳 979、比對 18 輪/秒、畫面特徵點 185~231  ← 全部健康
//     比對成功 **0 次**
//     自我測試（餵「網站內建的卡面圖」）也失敗    ← 與相機、卡片、光線無關
//   ⇒ 這台裝置算出來的**特徵描述子**與編譯進 `.mind` 的那份對不起來。
//     特徵點的「位置」抓得到（所以數量正常），但描述子的「值」是壞的。
//     這類問題在 TFJS 的 WebGL 後端上，多半來自打包運算（packed ops）與
//     半精度貼圖在特定驅動上的行為差異。
//
// ★ 怎麼設：TFJS 只在**模組初始化的那一刻**讀 `location.search` 的 `tfjsflags`
//   （`Environment` 建構時），之後再改網址都沒用。而 MindAR 把 TFJS 包在自己的
//   bundle 裡，我們拿不到那個 `tf` 實例，所以**唯一**能設定的管道就是網址。
//   作法：在 `await import(mindar)` 之前把旗標塞進網址，import 完就還原。
//
// ⚠️ 實測確認過這個管道真的有效：`?tfjsflags=HAS_WEBGL:false` 會讓 Controller
//    直接建構失敗（`Cannot read properties of undefined (reading 'get')`）——
//    也就是旗標確實被讀進去了。（順帶得知：MindAR 硬相依 WebGL 後端，
//    純 CPU 那條路走不通，不要再試。）
//
// ⚠️ 這是**預設關閉**的。它會讓運算變慢，而且對正常的裝置沒有好處；
//    只有在自我測試失敗（＝已經證明這台裝置算不對）時才值得開。
// ============================================================================

const KEY = 'jq-ar-tfjs-compat'

/**
 * 保守設定：關掉打包運算、強制 32 位元浮點。
 * ⚠️ 這幾個是**針對驅動精度問題**的常見解法，不是萬靈丹——開了之後仍要看
 *    自我測試有沒有變成通過，不可假設它一定有效。
 */
const FLAGS = 'WEBGL_PACK:false,WEBGL_FORCE_F16_TEXTURES:false,WEBGL_RENDER_FLOAT32_ENABLED:true'

export function isCompat() {
  try { return sessionStorage.getItem(KEY) === '1' } catch { return false }
}

/**
 * ★ 相容模式也要**改用 MindAR 內建的 blob worker**，不要用我們自己建的同源 worker。
 *
 * 為什麼：比對是在 worker 裡跑的。我們平常用 Vite 的 `?worker` 從上游原始碼
 * 自己建一份（為了不依賴 CSP 的 `worker-src blob:`），而 MindAR 內建的那顆是
 * 它自己預先打包好的。兩者理論上等價，但**那是理論**——使用者的裝置回報
 * 「比對 worker：同源」且比對成功 0 次，所以「換成內建那顆」是一個還沒被
 * 排除、而且成本極低的變因。
 *
 * ⚠️ 內建那顆是 blob worker，需要 CSP 放行 `worker-src blob:`——`server/index.js`
 *    本來就保留著（`npm run check:live` 也會驗），所以這條退路是通的。
 */
export const useBuiltinWorker = isCompat

/**
 * 開啟相容模式並重新載入。
 * ⚠️ 一定要重新載入：TFJS 已經初始化過就不會再讀旗標了，不重載等於沒開。
 */
export function enableCompatAndReload() {
  try { sessionStorage.setItem(KEY, '1') } catch { /* 無痕模式可能不給寫 */ }
  location.reload()
}

export function disableCompat() {
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}

/**
 * 在載入 MindAR 之前把旗標放進網址；回傳一個「還原網址」的函式。
 *
 * ⚠️ 用 `replaceState` 不用 `pushState`：這是一個暫時性的技術細節，
 *    不該在使用者的上一頁清單裡留下一筆。
 * ⚠️ 一定要還原：`?tfjsflags=…` 留在網址上會被使用者分享出去，
 *    而且本站的路由同步層本來就不帶 query，留著只會造成混亂。
 */
export function withCompatFlags() {
  if (!isCompat() || typeof location === 'undefined') return () => {}
  let before
  try {
    before = location.href
    const url = new URL(location.href)
    url.searchParams.set('tfjsflags', FLAGS)
    history.replaceState(history.state, '', url)
  } catch { return () => {} }
  return () => {
    try { history.replaceState(history.state, '', before) } catch { /* ignore */ }
  }
}
