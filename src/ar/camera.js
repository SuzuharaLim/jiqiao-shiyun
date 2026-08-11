// ============================================================================
// 相機層 —— 只負責「拿到一路可用的後鏡頭串流」
//
// ★ 這一層**完全不知道 AR 存在**，也不建立 <video>。
//
// 舊版的 <video> 是由 MindARThree 自己 createElement 出來、自己設 position 與
// z-index、再 appendChild 到容器裡。那個設計直接造成兩個最貴的 bug：
//   ① 上游預設 `z-index:-2`，在本站的深色取景框底下 ⇒ **畫面全黑**，
//      而追蹤照樣正常（它讀的是 video 元素的像素，不是螢幕上畫出來的結果），
//      所以每一項數字都正常、就是看不到東西。
//   ② 換鏡頭之後忘了 resize()，投影矩陣沒跟著換 ⇒ 模型整個偏掉。
//
// 新版把 <video> 交還給 React（`Scan.jsx` 裡的 `.scan-video`），疊層寫在樣式表
// 裡——那才是它該待的地方。這一層只回傳 MediaStream，由呼叫端接上去。
// **①那一類 bug 在結構上不可能再發生**，因為沒有任何 JS 會去動 video 的 z-index。
// ============================================================================

/** 後／前鏡頭的 label 特徵。label 是各家自由填的字串，只能盡力比對。 */
const BACK_RE = /back|rear|environment|後|背/i
const FRONT_RE = /front|user|前|自拍/i
/** 超廣角：桶狀畸變沒有被 ISP 校正，實測 k1 −0.07 以上辨識率就是 0%。 */
const ULTRA_RE = /ultra|超廣|廣角|wide.?angle|0\.5/i

/**
 * 「camera2 2, facing back」→ 2。
 *
 * ★ Android Chrome 給的 label 常常是這種**完全沒有語意**的字串，沒有任何
 *   ultra／廣角／0.5x 可以比對，所以純關鍵字的排除法會整個失效
 *   （2026-08-11 使用者的 Samsung 實測：診斷顯示正在用 `camera 2, facing back`）。
 *   Android 的慣例是編號越小越接近主鏡頭，所以沒有語意時改用編號排序。
 * ⚠️ 這是**啟發式**，沒有標準 API 能問「哪一顆是主鏡頭」。所以介面上一定要
 *    保留手動切換（見 listBackCameras 的用途）。
 */
export function labelIndex(label) {
  const m = /camera\d*\s+(\d+)/i.exec(label || '')
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY
}

/**
 * 從 enumerateDevices() 的結果挑一顆「不是超廣角的後鏡頭」。
 * @returns deviceId，猜不出來回 null（呼叫端要退回 facingMode，**不可因此開不了相機**）
 */
export function pickMainCameraId(devices) {
  const cams = (devices || []).filter(d => d?.kind === 'videoinput' && d.label)
  // 只有一顆就沒得挑；沒有 label 代表還沒授權，這時猜不了
  if (cams.length < 2) return null
  const back = cams.filter(d => BACK_RE.test(d.label))
  const pool = back.length ? back : cams
  // ⚠️ 全部都看起來是超廣角時要回 **null**，不可硬選一顆——那等於指定一顆已知
  //    不好的鏡頭。回 null 讓瀏覽器用 facingMode 自己決定，至少有機會是對的。
  const candidates = pool.filter(d => !ULTRA_RE.test(d.label))
  if (!candidates.length) return null
  return candidates
    .map((d, i) => ({ d, i, n: labelIndex(d.label) }))
    .sort((a, b) => (a.n - b.n) || (a.i - b.i))[0].d.deviceId
}

/** 列出可選的後鏡頭，給介面讓使用者自己換一顆試。 */
export function listBackCameras(devices) {
  return (devices || [])
    .filter(d => d?.kind === 'videoinput' && d.label)
    .filter(d => BACK_RE.test(d.label) || !FRONT_RE.test(d.label))
    .map(d => ({ deviceId: d.deviceId, label: d.label, index: labelIndex(d.label) }))
    .sort((a, b) => a.index - b.index)
}

/**
 * ★★★ 解析度必須明講。
 *
 * ⚠️ 只給 `facingMode` 的話行動瀏覽器預設回 **640×480**（本站在相機工作室已經
 *    踩過同一個坑）。640×480 下卡片就算佔半個畫面也只有約 320px 寬，
 *    可用的特徵點嚴重不足，症狀是「對得很準卻一直認不出來」。
 * ⚠️ 一定要 `ideal` **不可 `exact`**：exact 在裝置不支援時丟 OverconstrainedError
 *    ＝相機完全開不起來，比解析度低糟得多。
 * ⚠️ 也不要開到 4K：每一幀都要進 TFJS，掉幀對追蹤的傷害遠大於解析度的好處。
 */
const IDEAL = { width: { ideal: 1280 }, height: { ideal: 960 } }
/** 連續自動對焦。放 advanced 裡：不支援的瀏覽器會忽略它而不是整組拒絕。 */
const FOCUS = [{ focusMode: 'continuous' }]

function constraintsFor(deviceId) {
  const video = { ...IDEAL, advanced: FOCUS }
  if (deviceId) video.deviceId = { exact: deviceId }
  else video.facingMode = { ideal: 'environment' }
  return { audio: false, video }
}

/**
 * 開相機。
 *
 * ⚠️ 三層 fallback 缺一不可：`deviceId:{exact}` 在該鏡頭被別的程式佔用時會
 *    **直接 reject**，那時仍然要開得起來。
 * ⚠️ 最後一層失敗才把錯誤丟出去，而且丟**第一個**錯誤——那個才帶得到
 *    NotAllowedError／NotFoundError 這些真正有意義的名稱，最後一層通常只是
 *    同一個原因的重複。
 */
export async function openCamera({ deviceId = null } = {}) {
  const md = navigator.mediaDevices
  if (!md?.getUserMedia) {
    const e = new Error('這個瀏覽器不支援相機')
    e.name = 'NotSupportedError'
    throw e
  }
  const plans = [
    deviceId ? constraintsFor(deviceId) : null,
    constraintsFor(null),
    { audio: false, video: true },
  ].filter(Boolean)

  let first = null
  for (const c of plans) {
    try { return await md.getUserMedia(c) } catch (e) { first = first ?? e }
  }
  throw first
}

/**
 * 拿到權限**之後**再挑一次鏡頭。
 *
 * ⚠️ `enumerateDevices()` 在授權前 label 一律是空字串 ⇒ 第一次進來猜不出主鏡頭，
 *    只能退回 facingMode，而那在多鏡頭手機上有機會選到超廣角。
 *    所以「避開超廣角」這件事只能在這個時機做。
 * @returns {stream|null} 需要換的話回新串流，不需要換回 null
 */
export async function retune(currentStream) {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return null
    const wanted = pickMainCameraId(await navigator.mediaDevices.enumerateDevices())
    if (!wanted) return null
    const cur = currentStream?.getVideoTracks?.()[0]
    if (!cur || cur.getSettings?.().deviceId === wanted) return null
    return await openCamera({ deviceId: wanted })
  } catch { return null }      // 換不成就沿用原本那顆，絕不可因此讓相機掛掉
}

/** 停掉一路串流的所有軌道。少了它離開頁面之後相機指示燈還亮著。 */
export function stopStream(stream) {
  try { for (const t of stream?.getTracks?.() ?? []) t.stop() } catch { /* ignore */ }
}

/** 把串流接上 video 並等它真的有畫面。 */
export function attach(video, stream) {
  return new Promise((resolve, reject) => {
    if (!video) { reject(new Error('沒有 video 元素')); return }
    // ⚠️ iOS 必備：沒有 playsinline 會被強制全螢幕播放，整個版面被接管。
    video.setAttribute('playsinline', '')
    video.setAttribute('muted', '')
    video.muted = true
    let done = false
    const ok = () => {
      if (done) return
      // ⚠️ videoWidth 為 0 代表 metadata 還沒真的到位。Controller 用它建投影矩陣，
      //    這時候建出來的是 0×0，之後不會自己修正。
      if (!video.videoWidth || !video.videoHeight) return
      done = true
      // ★★★ 一定要設 width/height **屬性**，不是只有 videoWidth 就好。
      //
      // MindAR 的 InputLoader 是這樣取像的（input-loader.js `loadInput`）：
      //     context.drawImage(input, 0, 0, input.width, input.height)
      // `input.width` 讀的是 <video> 的**內容屬性**，而屬性沒設時它是 **0**
      // ⇒ `drawImage(v, 0, 0, 0, 0)` **什麼都沒畫**
      // ⇒ 追蹤每一幀都在分析一張全黑的畫布 ⇒ **永遠掃不到**。
      //
      // ⚠️ 而失效方式完全靜默：相機在播、畫面正常、心跳照跳、幀率漂亮、
      //    一個錯誤都不會有。這正是「數字全對但功能是壞的」那一類，
      //    也是這一整層要用閘門鎖住的原因（check-ar 有專測）。
      // ⚠️ 同一支 loadInput 還會用「屬性與 Controller 的 inputWidth/Height
      //    互為對調」來判斷要不要轉 90°，所以這兩個值必須與建 Controller 時
      //    傳進去的一致——都取 videoWidth/videoHeight 就自然一致。
      video.setAttribute('width', String(video.videoWidth))
      video.setAttribute('height', String(video.videoHeight))
      cleanup()
      resolve({ width: video.videoWidth, height: video.videoHeight })
    }
    const fail = () => { if (!done) { done = true; cleanup(); reject(new Error('影像無法播放')) } }
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', ok)
      video.removeEventListener('loadeddata', ok)
      video.removeEventListener('canplay', ok)
      video.removeEventListener('error', fail)
      clearInterval(poll)
      clearTimeout(bail)
    }
    video.addEventListener('loadedmetadata', ok)
    video.addEventListener('loadeddata', ok)
    video.addEventListener('canplay', ok)
    video.addEventListener('error', fail)
    video.srcObject = stream
    // ⚠️ 明確呼叫 play()：只靠 autoplay 屬性在 iOS Safari（尤其從 SPA 導頁進來、
    //    不是整頁載入時）不一定會啟動，而 video 沒在播的話 Controller 每幀讀到
    //    同一張靜止影像，偵測永遠不會成功——畫面卻是「有影像」的（第一幀）。
    //    不可 await：被擋時會 reject，而那不該讓整個 AR 失敗。
    video.play?.().catch(() => {})
    // ⚠️ 事件有可能在我們掛上監聽之前就發生完了（快取／同步就緒），輪詢當保險。
    const poll = setInterval(ok, 120)
    const bail = setTimeout(fail, 12000)
    ok()
  })
}
