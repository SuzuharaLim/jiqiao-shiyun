// ============================================================================
// 卡面座標系 —— 純函式，零相依，可直接 node 測
//
// ★★★ 這一支存在的理由：**把「量出來的符號」換成「推導得出的約定」。**
//
// 舊版（mindScene.js）走 MindARThree 的 `anchor.group` ＋ `postMatrix`，把卡片
// 正規化成「寬度 1.0、中心在原點」的單位空間，然後發現 y 方向與直覺相反，
// 只好留下兩個常數：
//     CALIB = { vSign: -1, outAxis: +1 }   // 「實測值，不可憑直覺改」
// 那兩個數字是**這個設計自己製造出來的問題**：多包了一層 postMatrix，於是要
// 反推它與 worldMatrix 的兩次翻轉如何相消。翻轉相消寫錯不會報錯，只會讓角色
// 站到卡片上下鏡射的位置——正對卡片時幾乎看不出來。
//
// 新版**不用 postMatrix**，直接把 worldMatrix 當成物件的變換矩陣，於是只要回答
// 一個問題：worldMatrix 消費的是什麼空間？這個答案在上游原始碼裡是寫死的，
// 不必量。
//
// ── 推導（node_modules/mind-ar/src/image-target/controller.js `_glModelViewMatrix`）──
//
// 上游在 modelViewTransform 之前先乘了這個矩陣（h = 目標圖高度，單位是像素）：
//
//     [1  0  0  0]
//     [0 -1  0  h]
//     [0  0 -1  0]
//     [0  0  0  1]
//
// 也就是把輸入點 (x, y, z) 換成 (x, h − y, −z) 之後才進 modelViewTransform，
// 而 modelViewTransform 是在「目標圖像素、原點左上、y 朝下」估出來的。
//
//   ⇒ 傳進 worldMatrix 的 (x, y, z) 會被解讀成圖上的 (x, h − y)
//   ⇒ **worldMatrix 消費的空間 = 目標圖像素，原點左下，y 朝上，+z 離開紙面**
//
// 這就是標準的 OpenGL 右手系，也是上游註解裡那句「opengl has y coordinate
// system go from bottom to top, while the marker coordinate goes from top to
// bottom」在講的事。所以：
//
//     卡面 UV（原點左上、v 朝下，就是量圖時最自然的那組）
//       → 卡面座標 (u·W, (1 − v)·H, 0)
//
// 一個減法，沒有需要記住的符號。
//
// ⚠️ 單位是**目標圖的像素**不是「卡片寬 = 1」。這是刻意的：
//    ① 熱區 rect 本來就是從圖上量的，換算只有一次乘法
//    ② 角色大小要跟著卡片走時寫 `W * 0.18` 比寫 `0.18` 更明白它相對誰
//    ③ 少一層縮放就少一個可以寫反的地方
// ============================================================================

/**
 * 卡面 UV → 卡面座標（worldMatrix 消費的空間）。
 * @param u 0..1，卡面左→右
 * @param v 0..1，卡面上→下（**注意是朝下**，與量圖時一致）
 * @param W,H 目標圖尺寸（像素），由 Controller 的 dimensions 給
 * @param z 離開紙面的高度（像素單位），預設 0 ＝ 貼在卡面上
 */
export function uvToCard(u, v, W, H, z = 0) {
  return [u * W, (1 - v) * H, z]
}

/** 卡面座標 → 卡面 UV。`uvToCard` 的反函式。 */
export function cardToUv(x, y, W, H) {
  return [x / W, 1 - y / H]
}

/** 熱區矩形的中心點（UV）。 */
export function rectCenter(rect) {
  return [rect.x + rect.w / 2, rect.y + rect.h / 2]
}

/**
 * UV 是否落在某個熱區矩形內。
 * ⚠️ 邊界採「含左上、不含右下」，相鄰熱區才不會有一列像素同時屬於兩邊。
 */
export function inRect(u, v, rect) {
  return u >= rect.x && u < rect.x + rect.w && v >= rect.y && v < rect.y + rect.h
}

/**
 * 找出 UV 命中的熱區。
 * ⚠️ 重疊時取**面積最小**的那個：卡面上大框套小框是常態（曆頁那一大條裡面
 *    還有臘八粥），取大的等於小的永遠點不到。
 */
export function hitTest(hotspots, u, v) {
  let best = null
  let bestArea = Infinity
  for (const h of hotspots || []) {
    if (!inRect(u, v, h.rect)) continue
    const a = h.rect.w * h.rect.h
    if (a < bestArea) { best = h; bestArea = a }
  }
  return best
}

/**
 * 熱區命中的遲滯開關。
 *
 * ⚠️ 追蹤每秒十幾次、姿態有次像素抖動，熱區邊界附近會在命中／沒命中之間高頻
 *    跳動，而開關內容面板是整條鏈最貴的操作（會重繪、會重新排版、會打斷朗讀）。
 * ⚠️ **進出門檻必須不同**（hysteresis）：同門檻時剛好站在邊界上會以等頻率
 *    一直開一直關。離開比進入寬鬆，因為手持時短暫飄出去是常態。
 */
export function makeHotspotLatch({ enterFrames = 3, leaveFrames = 8 } = {}) {
  let current = null      // 已確認的熱區 id
  let candidate = null    // 正在累積票數的 id
  let votes = 0

  return {
    /** 餵入這一幀瞄到的 id（沒瞄到給 null），回傳 {id, changed}。 */
    push(id) {
      if (id === current) { candidate = null; votes = 0; return { id: current, changed: false } }
      if (id !== candidate) { candidate = id; votes = 0 }
      votes++
      const need = id === null ? leaveFrames : enterFrames
      if (votes >= need) {
        current = id
        candidate = null
        votes = 0
        return { id: current, changed: true }
      }
      return { id: current, changed: false }
    },
    reset() { current = null; candidate = null; votes = 0 },
    get current() { return current },
  }
}

/**
 * 卡片定義的健檢。回傳問題字串陣列（空陣列＝沒問題）。
 * ⚠️ 熱區標錯**不會拋任何錯誤**，只會讓使用者點不到東西、或點到卡片另一邊，
 *    所以這一層檢查是靠閘門跑、不是靠執行期。
 */
export function validateCard(card) {
  const bad = []
  if (!card) return ['卡片是空的']
  if (!card.mindTarget) bad.push('缺 mindTarget（.mind 目標檔）')
  if (!card.target) bad.push('缺 target（卡面圖）')
  const hs = card.hotspots || []
  if (!hs.length) bad.push('沒有任何熱區')
  if (hs.length && !hs.some(h => h.primary)) bad.push('沒有標記 primary 熱區（角色會不知道站哪裡）')
  for (const h of hs) {
    const r = h.rect || {}
    for (const k of ['x', 'y', 'w', 'h']) {
      if (typeof r[k] !== 'number' || !Number.isFinite(r[k])) { bad.push(`${h.id}：rect.${k} 不是數字`); }
    }
    if (r.w <= 0 || r.h <= 0) bad.push(`${h.id}：rect 寬高必須為正`)
    if (r.x < 0 || r.y < 0 || r.x + r.w > 1.0001 || r.y + r.h > 1.0001) {
      bad.push(`${h.id}：rect 超出卡面 0..1`)
    }
  }
  return bad
}
