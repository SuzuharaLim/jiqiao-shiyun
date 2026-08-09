// ============================================================================
// MindAR 追蹤層（`.mind` 目標檔）
//
// 依需求於 2026-08-10 改用 MindAR 取代自研的「四角＋dHash」與特徵點路線。
//
// ★ 關鍵設計：**輸出與舊路線完全一樣**（`{ ref, score, corners, H, matrix3d, pose }`）。
//   所以熱區命中（arHotspot）、3D 貼合（ARCharacter）、疊加層（ARScene）、
//   CSS matrix3d 全部**不用改一行**。要換回去或並行比較也只是換這一層。
//
// ★ 取捨（明確記下來，因為它與這個專案原本的原則相反）：
//   · 得到：不需要看到卡片四個角、不需要邊框、被遮住／拍不全／較遠都能追，
//     而且有 frame-to-frame 追蹤（鎖定後逐幀跟隨，比每幀重新偵測穩）
//   · 付出：**mind-ar 帶 TensorFlow.js，controller chunk 約 2.1 MB**
//     （自研版整個 AR 層是 0 額外相依）。所以一定要 lazy load——
//     ⚠️ 絕不可讓它進主 bundle，否則首頁多背 2 MB 給一個多數人不會點的功能。
//
// ⚠️ MindAR 的座標約定（讀 node_modules/mind-ar/src/image-target/three.js 確認的，
//    不是猜的）：
//      · `dimensions[i] = [markerWidth, markerHeight]` ＝ 目標圖的像素尺寸
//      · `worldMatrix`（16 個數、column-major）把**目標圖的像素座標**映到相機空間
//      · 官方 three 整合用 postMatrix 把「單位平面」換到那個像素空間：
//        position=(W/2, W/2+(H-W)/2)、scale=W
//    所以要拿卡片四角在畫面上的位置，就把 (0,0)(W,0)(W,H)(0,H) 過
//    worldMatrix → projectionMatrix → 視埠。見 cornersFromWorldMatrix。
// ============================================================================

/** 4×4 column-major 矩陣乘 4 維向量。 */
function mulVec4(m, v) {
  const o = [0, 0, 0, 0]
  for (let i = 0; i < 4; i++) {
    o[i] = m[i] * v[0] + m[4 + i] * v[1] + m[8 + i] * v[2] + m[12 + i] * v[3]
  }
  return o
}

/**
 * 由 worldMatrix ＋ projectionMatrix 算出卡片四角在**取樣畫面座標**的位置。
 *
 * @param world 16 個數，column-major（MindAR 的 onUpdate 給的）
 * @param proj  16 個數，column-major（controller.getProjectionMatrix()）
 * @param mw,mh 目標圖的像素尺寸（dimensions[i]）
 * @param vw,vh 視埠（我們的取樣畫面）尺寸
 * @returns [[x,y] ×4]，順序是卡面的左上、右上、右下、左下
 *
 * ⚠️ **y 要翻轉**：clip space 的 y 向上，畫面座標向下。漏掉的話模型會上下鏡像，
 *    而且「正對著卡片」時看起來幾乎正常——只有斜拍才會發現，正是最難測的那種。
 * ⚠️ w < 0 代表該角在相機背後，這時整個結果不可用（會投影出鏡像的鬼影）。
 */
export function cornersFromWorldMatrix(world, proj, mw, mh, vw, vh) {
  const pts = [[0, 0], [mw, 0], [mw, mh], [0, mh]]
  const out = []
  for (const [x, y] of pts) {
    const cam = mulVec4(world, [x, y, 0, 1])
    const clip = mulVec4(proj, cam)
    if (!(clip[3] > 1e-6)) return null      // 在相機背後或退化
    const ndcX = clip[0] / clip[3], ndcY = clip[1] / clip[3]
    out.push([(ndcX * 0.5 + 0.5) * vw, (1 - (ndcY * 0.5 + 0.5)) * vh])
  }
  return out.every(p => p.every(Number.isFinite)) ? out : null
}

/**
 * 建立 MindAR 追蹤器。
 *
 * ⚠️ `mind-ar` 的 Controller **只能在瀏覽器裡跑**（要 WebGL 與 video），
 *    而且模組很大——一律由呼叫端用 `await import()` 動態載入這一支。
 *
 * @param opts.mindUrl   `.mind` 檔的網址
 * @param opts.width/height 輸入影像尺寸（餵給 Controller 的）
 * @param opts.cards     與 .mind 裡目標順序**一致**的卡片陣列（targetIndex → 卡片）
 *   ⚠️ 順序就是編譯時傳給 compileImageTargets 的圖片順序。多張卡時弄錯順序會
 *      「認出 A 卻跳出 B 的內容」——不會拋錯，是最難發現的壞法。
 */
export async function createMindTracker({ mindUrl, width, height, cards = [], maxTrack = 1 }) {
  // ⚠️ 走 dist 的 prod bundle（src/ 是未打包的 ESM，會把 TFJS 拆成幾十個請求）
  const mod = await import('mind-ar/dist/mindar-image.prod.js')
  const Controller = mod.Controller ?? mod.default?.Controller
  if (!Controller) throw new Error('mind-ar 的 Controller 載入失敗')

  let latest = null            // 最近一次 onUpdate 的結果
  const controller = new Controller({
    inputWidth: width,
    inputHeight: height,
    maxTrack,
    // filterMinCF / filterBeta 是 One-Euro 濾波的參數（MindAR 內建平滑）。
    // ⚠️ 這裡**刻意用預設值**：自研版的 makeSmoother 已經移除，兩層平滑疊起來
    //    會讓追蹤變得遲鈍（實測感覺像延遲了半秒），而遲鈍比抖動更難被接受。
    onUpdate: (data) => {
      if (data.type !== 'updateMatrix') return
      const { targetIndex, worldMatrix } = data
      if (worldMatrix === null) { if (latest?.targetIndex === targetIndex) latest = null; return }
      latest = { targetIndex, worldMatrix: [...worldMatrix], at: performance.now() }
    },
  })

  const { dimensions } = await controller.addImageTargets(mindUrl)
  const proj = controller.getProjectionMatrix()

  return {
    dimensions,
    /** 餵一個 <video>：MindAR 自己跑迴圈，結果由 onUpdate 進來。 */
    async start(video) {
      // ⚠️ dummyRun 是**必要的**暖機（編譯 shader、配置 tensor）。少了它第一次
      //    偵測會卡住好幾百毫秒，症狀是「打開相機後畫面凍住一下」。
      await controller.dummyRun(video)
      controller.processVideo(video)
    },
    stop() { try { controller.stopProcessVideo() } catch { /* 已經停了 */ } },
    dispose() {
      try { controller.stopProcessVideo() } catch { /* ignore */ }
      // ⚠️ 一定要 dispose：Controller 持有 WebGL context 與 TFJS 的 tensor。
      //    行動裝置的 WebGL context 上限常見 8~16，反覆進出這一頁不釋放的話
      //    「第 N 次打開變成空白」——而前面幾次都正常。
      try { controller.dispose?.() } catch { /* ignore */ }
    },
    /**
     * 取當前追蹤結果，轉成與舊路線相同的形狀。
     * @param vw,vh 取樣畫面尺寸（用來把 clip space 換算到畫面座標）
     */
    read(vw, vh) {
      if (!latest) return null
      const dim = dimensions[latest.targetIndex]
      if (!dim) return null
      const [mw, mh] = dim
      const corners = cornersFromWorldMatrix(latest.worldMatrix, proj, mw, mh, vw, vh)
      if (!corners) return null
      const card = cards[latest.targetIndex] ?? null
      return {
        // ⚠️ ref 的形狀要與舊路線一致（下游會讀 ref.card / ref.name / ref.aspect）
        ref: card ? { id: card.id, name: card.title, card, aspect: mw / mh } : null,
        // MindAR 不給「相似度分數」——它是 inlier 式的判定，追到就是追到。
        // ⚠️ 不可硬編一個假分數當「相似度」：那會讓診斷面板顯示一個沒有意義的數字。
        score: null,
        rotation: 0,
        corners,
        targetIndex: latest.targetIndex,
        worldMatrix: latest.worldMatrix,
        projectionMatrix: proj,
        via: 'mindar',
      }
    },
  }
}
