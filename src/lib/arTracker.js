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

// ★ 什麼時候要向呼叫端索取高解析度取樣（見 track() 裡的說明與實測數字）。
//
// 0.15：卡片佔畫面**面積**低於這個比例才換高解析度。
//   面積比與「佔畫面寬度」的對應：62%→0.38、45%→0.20、30%→0.09、24%→0.05。
//   ⚠️ 第一版設 0.22，結果 45% 那一格**觸發了卻完全沒有增益**
//      （20/24 → 20/24），每幀卻從 2.5ms 變成 14.9ms——純浪費。
//      45% 的低解析度本來就夠用，收到 0.15 讓它不再觸發。
//   實測增益（室內一般：雜訊 σ6、模糊 1.0）：
//      佔 62%  22/24 → 22/24（不觸發，2.9ms 不變）
//      佔 45%  20/24 → 20/24（不觸發）
//      佔 30%  **10/24 → 18/24**   每幀 2.6 → 10.0ms
//      佔 24%   1/24 → 4/24        每幀 1.9 → 4.2ms
//   ⚠️ 佔 20% 以下仍是 0——那是被 detectQuad 的 minAreaRatio(0.06) 擋在偵測階段，
//      高解析度救不到。**刻意不放寬那個下限**：卡片只佔畫面 1/5 已經太遠，
//      而放寬會讓雜訊區塊有機會被當成卡片——誤認是最難發現的壞法。
// 3：放大倍率。160px 長邊 → 480px，卡片佔 30% 時從約 60px 變成約 180px 寬，
//   拉正成 64×64 就變成降採樣（有細節可用）而不是放大模糊的小圖。
//   ⚠️ 不要再往上加：成本是面積成長（3× 邊長＝9× 像素），而 480 已經足夠
//      餵滿 64×64 的拉正圖。
const HI_RES_BELOW_AREA = 0.15
const HI_RES_SCALE = 3

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
     * @param {object} [opts]
     * @param {(scale:number)=>({data:Uint8ClampedArray,w:number,h:number}|null)} [opts.sampleHiRes]
     *        「同一個畫面、放大 scale 倍」的取樣器。**只有在卡片太小時才會被呼叫**。
     * @returns {null | {
     *   ref, score, rotation, corners, H, matrix3d, pose, areaRatio, hiRes
     * }}  corners 為**已對齊參考方向**的四角（模型座標的 0,0 對應 corners[0]）
     */
    track(rgba, w, h, { sampleHiRes } = {}) {
      const gray = toGray(rgba, w, h)
      const quad = detectQuad(gray, w, h)
      if (!quad) { smoother.reset(); lastId = null; return null }

      // ── ★ 卡片小的時候，改用高解析度的取樣來拉正 ──
      //
      // ⚠️ 偵測與比對需要的東西不一樣：**偵測只要邊緣**（低解析度就夠，而且便宜），
      //    **比對要紋理**（需要像素）。兩者共用同一張 160px 取樣圖時，
      //    卡片一小就沒有細節可比——拉正成 64×64 等於放大一張模糊的小圖。
      //
      // 實測（真目標圖、合成手持晃動、深色桌面）：
      //    卡片佔畫面寬度   四邊形偵測   追蹤成功
      //      45%             24/24        21/24
      //      30%             23/24        **10/24**  ← 偵測沒問題，是比對失敗
      //    也就是「站遠一點就掃不到」的原因不在偵測，而在拉正時可用的像素太少。
      //
      // ⚠️ 只在需要時才要高解析度：卡片大的時候低解析度本來就 24/24，
      //    每幀多做一次大圖 getImageData 是白花成本（那是整條鏈最貴的操作之一）。
      // ⚠️ 變數不可叫 `corners`：下面第 123 行有 `const corners = smoother.push(aligned)`
      //    （那是**平滑後、已對齊方向**的四角，語意完全不同）。撞名會直接
      //    `Identifier 'corners' has already been declared`。這裡叫 rectCorners
      //    ——它只用來拉正，不是對外回傳的那組。
      let src = rgba, sw = w, sh = h, rectCorners = quad.corners, hiRes = false
      if (sampleHiRes && quad.areaRatio < HI_RES_BELOW_AREA) {
        const hi = sampleHiRes(HI_RES_SCALE)
        if (hi?.data) {
          const k = hi.w / w
          src = hi.data; sw = hi.w; sh = hi.h; hiRes = true
          // ⚠️ 角點必須跟著換算到高解析度的座標系，否則會拉正到完全錯的區域
          //    （而且不會拋錯，只會讓分數莫名歸零）。
          rectCorners = quad.corners.map(([x, y]) => [x * k, y * (hi.h / h)])
        }
      }

      // 拉正 → 四個方向各比一次（卡片可能被倒著或側著放）
      const flat = rectify(src, sw, sh, rectCorners, rectifySize)
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
        // 這一幀的比對有沒有用高解析度取樣（給診斷面板顯示，也方便量成本）
        hiRes,
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
