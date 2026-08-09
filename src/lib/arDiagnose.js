// ============================================================================
// 現場診斷 —— 讓實體測試自己說出「為什麼掃不到」
//
// 沒有這一層的話，拿實體卡去掃而掃不到時，使用者（與開發者）只會知道
// 「掃不到」，然後開始亂猜：光線？角度？卡片印壞了？鏡頭？
// 而這幾個原因的處理方式完全不同，猜錯就是浪費一輪打樣。
//
// ⚠️ **刻意不做的事：反推鏡頭的 k1**。
//    我試過從卡片邊緣的弓起量（sagitta）反推 k1——公式是
//    s ≈ |k1|·r·(L/2R)²，聽起來很合理。但拿已知真值的合成畸變去驗，結果是：
//
//      真值 k1     估計         判定
//       0          −0.041       「超標」← **誤報**
//      −0.02       無法判定
//      −0.04       無法判定
//      −0.06       無法判定       （真的超標，卻判不出來）
//      −0.10       −0.129       「超標」✓
//      −0.20       無法判定
//
//    也就是說它會在鏡頭正常時說鏡頭壞了，又在真的壞時說不知道。
//    **一個會說謊的診斷比沒有診斷更糟**——使用者可能因此去換手機或放棄功能。
//    所以只保留「量得準」的觀測值：弓起量的原始 px 數（當參考，不下判斷）、
//    選到哪顆鏡頭、四邊形有沒有找到、比對分數、卡片佔畫面比例。
//    要真的量鏡頭畸變需要校正板與多張不同位置的樣本，那是另一件事。
// ============================================================================
import { boundaryPoints, largestComponent, fillFromBorder, backgroundMask, boxBlur3, otsuThreshold } from './quadDetect.js'

/**
 * 量卡片四條邊「弓起」多少像素（sagitta）。
 *
 * 這是**觀測值不是判斷**：直邊被鏡頭弓成弧線就會有弓起量，但同樣的量在不同
 * 卡片大小／位置下代表的畸變程度不同，所以這裡只回報 px 數與佔邊長的比例，
 * 不反推 k1、不下「鏡頭有問題」的結論（理由見檔頭）。
 *
 * @returns {{ maxPx: number, maxRatio: number, perEdge: number[], samples: number }|null}
 */
export function measureEdgeBow(gray, w, h, quad) {
  if (!quad || quad.length !== 4) return null
  // 重跑一次前景遮罩取輪廓點（detectQuad 沒有把它吐出來）
  const blurred = boxBlur3(gray, w, h)
  const t = otsuThreshold(blurred)
  const bg = backgroundMask(blurred, w, h)
  let best = null
  for (const strategy of [bg, null]) {
    let raw
    if (strategy) raw = strategy
    else {
      raw = new Uint8Array(w * h)
      for (let i = 0; i < raw.length; i++) raw[i] = blurred[i] > t ? 1 : 0
    }
    const comp = largestComponent(fillFromBorder(raw, w, h), w, h)
    if (comp && (!best || comp.size > best.size)) best = comp
  }
  if (!best) return null
  const pts = boundaryPoints(best.mask, w, h)
  if (pts.length < 40) return null

  // 卡片中心（用於判斷「往外弓」是哪一邊）
  const cx = quad.reduce((s, p) => s + p[0], 0) / 4
  const cy = quad.reduce((s, p) => s + p[1], 0) / 4
  const R = Math.hypot(w / 2, h / 2)

  const perEdge = []
  const ratios = []
  for (let e = 0; e < 4; e++) {
    const a = quad[e], b = quad[(e + 1) % 4]
    const ex = b[0] - a[0], ey = b[1] - a[1]
    const L = Math.hypot(ex, ey)
    if (L < 12) { perEdge.push(0); continue }
    // 邊的外法線（指離卡片中心的方向）
    let nx = -ey / L, ny = ex / L
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
    if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny }
    // ⚠️ 只收「離這條邊很近」的輪廓點，而且取**百分位數**不取最大值。
    //    第一版對所有中段點取 max，於是任何不屬於卡片邊的雜點（遮罩抓錯、
    //    卡面內部的深色塊）都會被當成弓起量——實測在 124px 寬的卡片上量出
    //    52px 的「弓起」，反推的 k1 是 −3.6（真值 −0.02）。
    //    band 上限要比預期的弓起量大一些但不能大到收進卡面內容：邊長的 8%。
    const band = Math.max(3, L * 0.08)
    const devs = []
    for (const p of pts) {
      const tt = ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (L * L)
      if (tt < 0.2 || tt > 0.8) continue              // 只看中段，避開角落
      const d = (p[0] - a[0]) * nx + (p[1] - a[1]) * ny
      if (d < -band || d > band) continue              // 離這條邊太遠 → 不是這條邊的點
      devs.push(d)
    }
    if (devs.length < 8) { perEdge.push(0); continue }
    devs.sort((x, y) => x - y)
    // 90 百分位：容忍少數雜點，又抓得到真正的弓起
    const maxOut = Math.max(0, devs[Math.min(devs.length - 1, Math.floor(devs.length * 0.90))])
    perEdge.push(+maxOut.toFixed(2))
    ratios.push(maxOut / L)
  }
  if (!ratios.length) return null
  return {
    maxPx: +Math.max(...perEdge).toFixed(2),
    maxRatio: +Math.max(...ratios).toFixed(4),
    perEdge,
    samples: pts.length,
  }
}

/** 畸變容忍上限（實測曲線見 arCamera.js）。這是**規格線**，不是現場判定的依據。 */
export const K1_LIMIT = -0.04

/**
 * 把一幀的觀測結果翻成「該怎麼辦」。
 * ⚠️ 每一條都要給**下一步動作**，不可只說「失敗」——診斷的價值在於它取代了猜測。
 */
/**
 * 由四個角推四邊形的長寬比（兩組對邊各取平均）。
 * ⚠️ 不可用包圍盒的寬高比：卡片斜放時包圍盒會接近正方形，得到的數字毫無意義。
 */
export function quadAspect(corners) {
  if (!corners || corners.length !== 4) return null
  const d = (a, b) => Math.hypot(corners[b][0] - corners[a][0], corners[b][1] - corners[a][1])
  const w = (d(0, 1) + d(3, 2)) / 2
  const h = (d(1, 2) + d(0, 3)) / 2
  return h > 1e-6 ? w / h : null
}

export function explain({
  quadFound, bestScore, minScore, distortion, cameraLabel, areaRatio,
  // 偵測到的四邊形長寬比 vs 卡片應有的長寬比
  seenAspect, cardAspect,
}) {
  if (!quadFound) {
    return {
      level: 'warn',
      what: '看不到卡片的四個角',
      why: '紙與桌面的邊界對比不足，或卡片沒有整張入框',
      next: '換深色桌面、讓整張卡片入框；確認卡片有「白留白邊＋深色框」（npm run card:frame）',
    }
  }
  if (areaRatio != null && areaRatio < 0.06) {
    return { level: 'warn', what: '卡片在畫面裡太小', why: `只佔 ${(areaRatio * 100).toFixed(1)}% 的面積`, next: '靠近一點，讓卡片佔畫面一半以上' }
  }
  // ★ 「框到的不是卡片」——2026-08-09 實測發現的失效模式。
  //    用另一台裝置掃螢幕上的卡面時，若整個螢幕都入鏡而螢幕四周是淺色牆，
  //    偵測器找到的是**螢幕的邊界**（深色螢幕 vs 淺色牆是全畫面最強的邊界），
  //    拉正整個 16:9 畫面當然對不上卡片簽名 → 實測 **0/24**（分數 12~33）。
  //    ⚠️ 這個情況 `quadFound` 是 true、分數也不足，會掉進下面那條「比對分數不足」，
  //       而那條會叫人去查目標圖版本／光線／角度——**全都是錯的方向**。
  //    長寬比是可量的訊號：小寒卡 1.37、電腦螢幕 1.78、手機螢幕 2.16。
  if (seenAspect != null && cardAspect != null && cardAspect > 0) {
    const off = Math.abs(Math.log(seenAspect / cardAspect))
    if (off > 0.18) {   // 約 ±20%；1.78/1.37 = 1.30 → 0.26，會被抓到
      return {
        level: 'warn',
        what: `框到的四邊形長寬比是 ${seenAspect.toFixed(2)}，但卡片應該是 ${cardAspect.toFixed(2)}`,
        why: '偵測到的不是卡片，而是別的矩形——最常見的是「整個螢幕」（拿另一台裝置掃螢幕上的卡面時）'
          + '，也可能是桌墊、書本或相框',
        // ⚠️ 不可寫 Markdown 的 `**粗體**`：這段會進 `.scan-diag-verdict`（純文字 <p>），
        //    星號會原樣顯示。要強調就用書名號或「」，不要靠標記語言。
        next: '靠近一點，讓那個矩形的邊框落在取景框「外面」，畫面裡只留卡片與它周圍的底色',
      }
    }
  }
  if (bestScore != null && bestScore < minScore) {
    return {
      level: 'warn',
      what: `認得出是一張卡片，但比對分數不足（${bestScore} / 門檻 ${minScore}）`,
      why: '常見原因：登錄的目標圖與印出來的不是同一版、光線太暗、角度太斜、手震模糊，'
        + '或選到了超廣角鏡頭（畸變會把邊弓成弧線）',
      // ⚠️ 這裡刻意**不**替使用者判定是哪一個原因：現場量不出可信的畸變值
      //    （見檔頭），亂猜會把人導向錯誤的方向。改成列出可觀測的事實。
      next: `依序試：① 確認目標圖是「加了收邊之後」那一版 ② 正對、靠近 `
        + `③ 找亮一點的地方 ④ 若目前鏡頭是「${cameraLabel || '未知'}」且名稱含 `
        + `ultra／超廣角／0.5x，換主鏡頭`,
    }
  }
  return { level: 'ok', what: '追蹤正常', why: '', next: '' }
}
