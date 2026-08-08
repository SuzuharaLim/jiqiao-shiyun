// ============================================================================
// AR 平面追蹤器 —— 把「偵測幾何」與「辨識身分」串成一條管線
//
//   相機一幀 → 找卡片四角（quadDetect）→ 透視拉正 → 四個方向各做一次簽名
//   → 與已登錄的卡片比對（scanner）→ 決定身分與正確方向
//   → 角點平滑 → 解出 homography 與 3D 姿態 → 交給渲染層
//
// 為什麼要「拉正之後再辨識」：參考簽名是正面拍的，拿歪斜的畫面直接比對，
// dHash 會因為透視變形而大幅失真。先拉正等於把辨識問題還原成正面對正面。
// 順帶好處是拉正需要的四個角，本來就是 AR 定位需要的東西——一次偵測兩用。
//
// 零第三方相依；除了取像（呼叫端用 canvas 做）之外不碰 DOM。
// ============================================================================
import { toGray, makeSignature, matchScore } from './scanner.js'
import { detectQuad, rectify, rotateRgba } from './quadDetect.js'
import { homography, poseFromHomography, cssMatrix3dString, makeSmoother } from './homography.js'

const UNIT_SQUARE = [[0, 0], [1, 0], [1, 1], [0, 1]]

/** 建立追蹤器。refs 為已登錄卡片（需含 hash / hist，見 scanner.js 的簽名格式）。 */
export function createTracker({
  refs = [],
  rectifySize = 48,      // 拉正後的邊長：太小認不準，太大每幀成本高
  minScore = 58,         // 匹配門檻（0–100）
  smoothAlpha = 0.35,
  fovDeg = 60,
} = {}) {
  const smoother = makeSmoother(smoothAlpha)
  let lastId = null

  return {
    setRefs(list) { refs = list },
    reset() { smoother.reset(); lastId = null },

    /**
     * 追蹤一幀。
     * @param {Uint8ClampedArray} rgba 取樣畫面（w*h*4）
     * @returns {null | {
     *   ref, score, rotation, corners, H, matrix3d, pose, areaRatio
     * }}  corners 為**已對齊參考方向**的四角（模型座標的 0,0 對應 corners[0]）
     */
    track(rgba, w, h) {
      const gray = toGray(rgba, w, h)
      const quad = detectQuad(gray, w, h)
      if (!quad) { smoother.reset(); lastId = null; return null }

      // 拉正 → 四個方向各比一次（卡片可能被倒著或側著放）
      const flat = rectify(rgba, w, h, quad.corners, rectifySize)
      let best = null
      if (refs.length) {
        for (let r = 0; r < 4; r++) {
          const rot = rotateRgba(flat, rectifySize, r)
          const sig = makeSignature(rot, rectifySize, rectifySize)
          for (const ref of refs) {
            // ★ 多視角簽名：同一張卡存了幾個「從斜角看」的版本，取最高分。
            //    ⚠️ 只存正面簽名時，yaw ±17°／pitch ±13° 的手持晃動會讓分數掉到
            //       37~57（門檻 58），實測追蹤成功率只有 33%——而四邊形每一幀
            //       都找得到，所以問題在比對不在偵測。
            //    ⚠️ 絕對不可以改成調低 minScore：那會讓正式站把別的東西認成卡片，
            //       而且是最難發現的壞法（使用者只覺得「有時候跳出錯的內容」）。
            //    見 arCardRegistry.js 的 VIEWS。
            const cands = ref.sigs?.length ? ref.sigs : [ref]
            for (const cand of cands) {
              const sc = matchScore(sig, cand)
              if (!best || sc > best.score) best = { ref, score: sc, rotation: r }
            }
          }
        }
      }
      if (!best || best.score < minScore) { smoother.reset(); lastId = null; return null }

      // ⚠️ 方向對齊：偵測出的角永遠是「畫面上左上優先」，與參考圖的左上不一定是同一個角。
      //    這裡是**減**不是加。一開始寫成 `(i + r) % 4`，實測 0° 與 180° 完全正確、
      //    只有 90° 與 270° 的原點跑到對角（差 155px）——因為 ±2 在 mod 4 下同值，
      //    加減之差只在奇數次旋轉時顯現。
      //    而且錯了模型**不會消失**，它會貼在卡片上但整個轉 90°，
      //    正面朝上測試永遠測不出來。四個方向都要測。
      const aligned = [0, 1, 2, 3].map(i => quad.corners[(i - best.rotation + 4) % 4])

      // 換了目標就重置平滑（否則會從上一張卡的位置飄過去）
      if (best.ref.id !== lastId) { smoother.reset(); lastId = best.ref.id }
      const corners = smoother.push(aligned)

      const H = homography(UNIT_SQUARE, corners)
      if (!H) return null
      return {
        ref: best.ref,
        score: best.score,
        rotation: best.rotation,
        corners,
        H,
        matrix3d: cssMatrix3dString(H),
        // ⚠️ 卡片長寬比要餵進去：這個分解假設模型平面是單位正方形（見 homography.js）。
        //    ref.aspect 由登錄時的目標圖算出（arCardRegistry / registerFromFile）。
        pose: poseFromHomography(H, { width: w, height: h, fovDeg, aspect: best.ref?.aspect || 1 }),
        areaRatio: quad.areaRatio,
      }
    },
  }
}

/**
 * 幀率節流器：偵測是 CPU 密集的，跟著 rAF 每秒跑 60 次會把手機燒穿。
 * 實測 160×120 的一幀在中階手機約 8–15ms，抓 15fps 綽綽有餘且省一半電。
 *
 * ⚠️ 用「上次完成的時間」而不是「上次開始的時間」計算間隔——用開始時間的話，
 *    一旦某幀跑超過間隔就會排隊堆積，越卡越糟。
 */
export function makeThrottle(fps = 15) {
  const interval = 1000 / fps
  let last = 0
  return (now) => {
    if (now - last < interval) return false
    last = now
    return true
  }
}
