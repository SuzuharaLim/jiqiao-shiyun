// AR 幾何層的回歸測試（homography.js + quadDetect.js）
//
// 為什麼要有這支：這兩個模組是純數學，寫錯不會拋錯——只會讓疊加的模型
// 「貼歪」或「亂轉」，而那在靜態截圖上看不出來，要拿著卡片轉才會發現。
// 與 check-almanac.mjs 同樣掛在 `npm run build` 前面，改壞了就出不了貨。
//
// 執行：node scripts/check-ar.mjs
import {
  homography, applyH, invert3, cssMatrix3d, poseFromHomography, makeSmoother,
} from '../src/lib/homography.js'
import {
  detectQuad, orderCorners, otsuThreshold, rectify, rotateRgba,
  convexHull, reduceHullToQuad,
} from '../src/lib/quadDetect.js'
import { makeSignature, matchScore } from '../src/lib/scanner.js'
import { screenToCard, hitTest, makeHotspotLatch, validateCard } from '../src/lib/arHotspot.js'
import { cvToThree, verticalFov } from '../src/lib/arPoseBridge.js'
import { decodePng, encodePng, addSpec, QUIET, FRAME } from './frame-card.mjs'
import { pickMainCameraId } from '../src/lib/arCamera.js'
import { OFFICIAL_CARDS, CARD_OBJECTS, objectForHotspot } from '../src/data/arCards.js'
import { termFromDate, lunarFromDate, lunarYearGanzhiIndex } from '../src/data/lunisolar.js'
import { createTracker } from '../src/lib/arTracker.js'

let pass = 0
const fails = []
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const near = (a, b, t = 1e-6) => Math.abs(a - b) < t

// ── 合成測試畫面：深色背景上一張亮色四邊形卡片（掃描線填多邊形）──────────
const W = 160, H = 120
function scene(quad, bg = 40, fg = 210) {
  const g = new Uint8Array(W * H).fill(bg)
  for (let y = 0; y < H; y++) {
    const xs = []
    for (let i = 0; i < 4; i++) {
      const a = quad[i], b = quad[(i + 1) % 4]
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]))
      }
    }
    xs.sort((p, q) => p - q)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) if (x >= 0 && x < W) g[y * W + x] = fg
    }
  }
  return g
}

// ── homography ─────────────────────────────────────────────────────────
const UNIT = [[0, 0], [1, 0], [1, 1], [0, 1]]
const quad = [[120, 80], [420, 40], [460, 300], [80, 260]]
const P = homography(UNIT, quad)
ok(!!P, 'homography 可解')
ok(Math.max(...UNIT.map((s, i) => {
  const p = applyH(P, s[0], s[1])
  return Math.hypot(p[0] - quad[i][0], p[1] - quad[i][1])
})) < 1e-6, '四角映射誤差 < 1e-6')

const back = applyH(invert3(P), ...applyH(P, 0.3, 0.7))
ok(near(back[0], 0.3, 1e-9) && near(back[1], 0.7, 1e-9), 'invert3 往返一致')

// ⚠️ CSS matrix3d 是行主序：第 4 個值必須是 h31，不是 h12。寫成列主序時
//    靜態畫面看起來很像，一旋轉才會發現角度全錯。
const m = cssMatrix3d(P)
ok(m.length === 16 && near(m[3], P[2][0]) && near(m[1], P[1][0]) && near(m[12], P[0][2]),
  'cssMatrix3d 為行主序')

ok(homography([[0, 0], [1, 1], [2, 2], [3, 3]], UNIT) === null, '四點共線回 null（不可吐 NaN 矩陣）')

// 姿態：正對鏡頭時法線接近 z 軸、卡片在相機前方、旋轉矩陣正交
const pose = poseFromHomography(
  homography(UNIT, [[220, 140], [420, 140], [420, 340], [220, 340]]), { width: 640, height: 480 })
ok(!!pose, 'poseFromHomography 可解')
ok(pose.position[2] > 0, '卡片在相機前方（z > 0）')
ok(Math.abs(pose.matrix[10]) > 0.98, '正對時法線接近 z 軸')
const axis = (j) => [pose.matrix[j * 4], pose.matrix[j * 4 + 1], pose.matrix[j * 4 + 2]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
ok([0, 1, 2].every(j => near(Math.hypot(...axis(j)), 1, 1e-6)), '旋轉三軸皆單位長')
ok(Math.abs(dot(axis(0), axis(1))) < 1e-6 && Math.abs(dot(axis(0), axis(2))) < 1e-6, '旋轉三軸互相正交')

// 平滑器：小抖動做 EMA，大位移直接跳過去（追丟重抓時不可慢慢飄過去）
const sm = makeSmoother(0.5, 120)
sm.push([[0, 0], [10, 0], [10, 10], [0, 10]])
ok(near(sm.push([[2, 0], [12, 0], [12, 10], [2, 10]])[0][0], 1, 1e-9), '小抖動走 EMA')
ok(near(sm.push([[500, 500], [510, 500], [510, 510], [500, 510]])[0][0], 500, 1e-9), '大位移直接跳過去')
sm.reset()
ok(sm.push([[7, 7], [8, 7], [8, 8], [7, 8]])[0][0] === 7, 'reset 後不殘留舊值')

// ── quadDetect ─────────────────────────────────────────────────────────
// ⚠️ 角點誤差要求 ≤2px：160 寬的取樣畫面上 5px 就是 3%，模型會明顯偏出卡片。
//    這正是「凸包直接取角」不夠、必須做 refineCorners 線擬合的原因。
for (const [q, label] of [
  [[[30, 20], [130, 20], [130, 100], [30, 100]], '正矩形'],
  [[[45, 25], [125, 15], [140, 95], [25, 85]], '透視梯形'],
  [[[80, 15], [145, 60], [80, 105], [15, 60]], '菱形'],
  [[[55, 30], [135, 45], [120, 105], [40, 90]], '斜放卡片'],
  [[[20, 15], [150, 25], [145, 105], [15, 95]], '幾乎滿版'],
]) {
  const d = detectQuad(scene(q), W, H)
  ok(!!d, `偵測到${label}`)
  if (d) {
    const exp = orderCorners(q)
    const err = Math.max(...d.corners.map((p, i) => Math.hypot(p[0] - exp[i][0], p[1] - exp[i][1])))
    ok(err <= 2, `${label}角點誤差 ${err.toFixed(2)}px（上限 2）`)
  }
}
ok(!!detectQuad(scene([[30, 20], [130, 20], [130, 100], [30, 100]], 220, 50), W, H),
  '深色卡片（極性反轉）也要找得到')

// 不是卡片的東西必須誠實回 null，不可硬給一個四邊形
const Lshape = new Uint8Array(W * H).fill(40)
for (let y = 20; y < 100; y++) for (let x = 30; x < 70; x++) Lshape[y * W + x] = 210
for (let y = 70; y < 100; y++) for (let x = 70; x < 130; x++) Lshape[y * W + x] = 210
// ⚠️ 這一項曾經通過（＝誤判成卡片）：貪婪縮頂點會收斂成貼著 L 外緣的梯形，
//    L 佔它 94%，實心度完全過關。要靠「凸包→四邊形的面積損失」才擋得掉。
ok(detectQuad(Lshape, W, H) === null, 'L 形（非四邊形）必須回 null')

const circle = new Uint8Array(W * H).fill(40)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - 80, y - 60) < 38) circle[y * W + x] = 210
ok(detectQuad(circle, W, H) === null, '圓形必須回 null')
ok(detectQuad(new Uint8Array(W * H).fill(128), W, H) === null, '純色畫面必須回 null')
ok(detectQuad(scene([[70, 55], [85, 55], [85, 68], [70, 68]]), W, H) === null, '過小物件必須回 null')

// 角點排序必須與輸入順序無關——不一致的話 homography 每幀解出不同旋轉，模型會亂轉
const rect = [[30, 20], [130, 20], [130, 100], [30, 100]]
ok(JSON.stringify(orderCorners(rect)) === JSON.stringify(orderCorners([rect[2], rect[0], rect[3], rect[1]])),
  '角點排序與輸入順序無關')

// rectify / rotateRgba
const trap = [[45, 25], [125, 15], [140, 95], [25, 85]]
const gray = scene(trap)
const rgba = new Uint8ClampedArray(W * H * 4)
for (let i = 0; i < W * H; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = gray[i]; rgba[i * 4 + 3] = 255 }
const r32 = rectify(rgba, W, H, trap, 32)
let bright = 0
for (let i = 0; i < 32 * 32; i++) if (r32[i * 4] > 150) bright++
ok(bright / 1024 > 0.92, `拉正後卡片佔比 ${(bright / 1024 * 100).toFixed(1)}%（應 > 92%）`)
let rr = r32
for (let i = 0; i < 4; i++) rr = rotateRgba(rr, 32, 1)
ok(rr.every((v, i) => v === r32[i]), '旋轉四次回到原狀')
ok(rotateRgba(r32, 32, 0) === r32, '旋轉 0 次不複製陣列')

// Otsu：雙峰分佈的門檻必須把兩群分開（0..199 皆為最佳解，取到下界也正確）
const bimodal = new Uint8Array(1000)
for (let i = 500; i < 1000; i++) bimodal[i] = 200
ok(otsuThreshold(bimodal) < 200, 'Otsu 分開雙峰')
ok(reduceHullToQuad(convexHull([[0, 0], [10, 0], [10, 10], [0, 10], [5, -1]])).length === 4,
  '凸包縮到四頂點')

// ── ★ 圖卡收邊規範：白留白邊 ＋ 深色框（實測出來的，不是美術偏好）────────
// 這一項鎖的是**印在紙上的東西**。卡片付印之後就改不了，而收邊做錯不會拋錯——
// 四角偵測仍然「找到」一個四邊形，只是某個角偏掉幾十 px，模型與熱區跟著歪。
//
// 2027 小寒卡的實測（逐角誤差，200×150 取樣、卡片約 168×104）：
//
//   收邊方式              深色桌面  中灰   淺色    木紋
//   滿版出血（第一版稿）    26px    28px   72px   28px
//   只加深色框              27px   1.4px  1.4px  1.4px
//   白留白邊 ＋ 深色框      1.4px   1.4px  1.4px  1.4px   ← 唯一全過
//
// ⚠️ 「只加深色框」不夠：深色框放在深色桌面上一樣沒有邊界對比。
//    ⚠️ 而滿版出血最致命的是**單角失敗**：小寒卡左下角是深藍 QR、上緣是橘色帶，
//       兩者都碰到紙邊，於是那一段邊界與桌面同色 → 那個角被切掉 24~64px，
//       其他三角完全正常。只檢查「有沒有偵測到」永遠測不出來。
{
  const CW = 220, CH = 165, X = 24, Y = 30, CARD_W = 168, CARD_H = 104
  const truth = [[X, Y], [X + CARD_W - 1, Y], [X + CARD_W - 1, Y + CARD_H - 1], [X, Y + CARD_H - 1]]
  // 版面內容：頂端滿版橘帶 ＋ 左下角深色 QR（＝小寒卡真正的兩個弱點）
  const paint = (g, x0, y0, w, h) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w, v = y / h
        let val = 245
        if (v < 0.10) val = 150                             // 橘帶（灰階值）
        else if (u < 0.16 && v > 0.74) val = 60             // 深藍 QR
        else if (u < 0.17 && v > 0.13 && v < 0.54) val = 150
        else if (u > 0.18 && v > 0.20 && v < 0.50) val = 95
        g[(y0 + y) * CW + (x0 + x)] = val
      }
    }
  }
  const render = (desk, mode) => {
    const g = new Uint8Array(CW * CH).fill(desk)
    const qz = Math.max(2, Math.round(CARD_H * 0.025))   // 白留白邊
    const fr = Math.max(2, Math.round(CARD_H * 0.03))    // 深色框
    if (mode === 'none') {
      paint(g, X, Y, CARD_W, CARD_H)
    } else if (mode === 'frameOnly') {
      paint(g, X, Y, CARD_W, CARD_H)
      for (let i = 0; i < fr; i++) {
        for (let x = X; x < X + CARD_W; x++) { g[(Y + i) * CW + x] = 30; g[(Y + CARD_H - 1 - i) * CW + x] = 30 }
        for (let y = Y; y < Y + CARD_H; y++) { g[y * CW + X + i] = 30; g[y * CW + X + CARD_W - 1 - i] = 30 }
      }
    } else {                                              // quietZone
      for (let y = Y; y < Y + CARD_H; y++) for (let x = X; x < X + CARD_W; x++) g[y * CW + x] = 255
      paint(g, X + qz + fr, Y + qz + fr, CARD_W - 2 * (qz + fr), CARD_H - 2 * (qz + fr))
      for (let i = 0; i < fr; i++) {
        for (let x = X + qz; x < X + CARD_W - qz; x++) {
          g[(Y + qz + i) * CW + x] = 30; g[(Y + CARD_H - 1 - qz - i) * CW + x] = 30
        }
        for (let y = Y + qz; y < Y + CARD_H - qz; y++) {
          g[y * CW + X + qz + i] = 30; g[y * CW + X + CARD_W - 1 - qz - i] = 30
        }
      }
    }
    return g
  }
  const maxErr = (g) => {
    const q = detectQuad(g, CW, CH)
    if (!q?.corners) return Infinity
    return Math.max(...q.corners.map((p, i) => Math.hypot(p[0] - truth[i][0], p[1] - truth[i][1])))
  }
  const DESKS = [['深色', 35], ['中灰', 140], ['淺色', 216], ['木紋', 150]]

  // 白留白邊＋深色框：四種桌面都要在 3px 以內
  for (const [name, desk] of DESKS) {
    const e = maxErr(render(desk, 'quietZone'))
    ok(e <= 3, `★ 白留白邊＋深色框在${name}桌面的角誤差 ${e.toFixed(1)}px（上限 3）`)
  }
  // 反例鎖定：現稿（滿版出血）在淺色桌面上一定會爛掉。
  // 這一項若「通過」＝有人改了偵測邏輯或改了這個測試，收邊規範就可以放寬了——
  // 請重跑上面那張表再決定，不要直接把這行刪掉。
  ok(maxErr(render(216, 'none')) > 10, '滿版出血在淺色桌面上角誤差 >10px（收邊規範的存在理由）')
  ok(maxErr(render(35, 'frameOnly')) > 10, '只加深色框在深色桌面上角誤差 >10px（所以必須留白邊）')
}

// ── arTracker：四個方向的對齊 ──────────────────────────────────────────
// ⚠️ 這一組是整條管線最容易寫錯又最難發現的地方：把拉正圖轉 r 次才對得上參考時，
//    角點要位移 **-r** 不是 +r。寫成 +r 的話 0° 與 180° 完全正確
//    （±2 在 mod 4 下同值），只有 90°／270° 會把原點放到對角——
//    而且模型不會消失，只是整個轉 90°。正面朝上測試永遠測不出來。
{
  const SZ = 48, CW = 200, CH = 200
  // 有明確方向性的測試卡：左上暗記號、右下亮塊
  const card = () => {
    const a = new Uint8ClampedArray(SZ * SZ * 4)
    for (let y = 0; y < SZ; y++) {
      for (let x = 0; x < SZ; x++) {
        const i = (y * SZ + x) * 4
        const v = (x < SZ / 3 && y < SZ / 3) ? 110
          : (x > SZ * 0.62 && y > SZ * 0.62) ? 245
            : 170 + ((x + y) % 40)
        a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] = 255
      }
    }
    return a
  }
  const refCard = { id: 'test-card', ...makeSignature(card(), SZ, SZ) }
  const paint = (corners) => {
    const rgba = new Uint8ClampedArray(CW * CH * 4)
    for (let i = 0; i < CW * CH; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 20; rgba[i * 4 + 3] = 255 }
    const src = card()
    const [tl, tr, br, bl] = corners
    for (let v = 0; v <= 1; v += 0.0012) {
      for (let u = 0; u <= 1; u += 0.0012) {
        const sx = (1 - v) * ((1 - u) * tl[0] + u * tr[0]) + v * ((1 - u) * bl[0] + u * br[0])
        const sy = (1 - v) * ((1 - u) * tl[1] + u * tr[1]) + v * ((1 - u) * bl[1] + u * br[1])
        const px = Math.round(sx), py = Math.round(sy)
        if (px < 0 || py < 0 || px >= CW || py >= CH) continue
        const cx = Math.min(SZ - 1, Math.floor(u * SZ)), cy = Math.min(SZ - 1, Math.floor(v * SZ))
        const s = (cy * SZ + cx) * 4, o = (py * CW + px) * 4
        rgba[o] = src[s]; rgba[o + 1] = src[s + 1]; rgba[o + 2] = src[s + 2]; rgba[o + 3] = 255
      }
    }
    return rgba
  }
  const base = [[50, 40], [160, 40], [160, 150], [50, 150]]
  for (let k = 0; k < 4; k++) {
    // 把卡片實體旋轉 k×90°：內容的原點跑到 base 的第 (-k) 個角
    const painted = paint([0, 1, 2, 3].map(i => base[(i - k + 4) % 4]))
    const tracker = createTracker({ refs: [refCard], rectifySize: SZ })
    const res = tracker.track(painted, CW, CH)
    ok(!!res, `旋轉 ${k * 90}° 時追蹤得到`)
    if (res) {
      const expect = base[(0 - k + 4) % 4]
      const d = Math.hypot(res.corners[0][0] - expect[0], res.corners[0][1] - expect[1])
      ok(d < 12, `旋轉 ${k * 90}° 的原點對齊（偏差 ${d.toFixed(1)}px，上限 12）`)
      ok(res.rotation === k, `旋轉 ${k * 90}° 判定為 r=${k}（實得 ${res.rotation}）`)
    }
  }
  // 沒有登錄任何卡片時不可硬給結果
  ok(createTracker({ refs: [] }).track(paint(base), CW, CH) === null, '無登錄卡片時回 null')
}

// ── 結果 ───────────────────────────────────────────────────────────────
// ── 卡面熱區（改版文件「決策 A」：不做物件偵測，改用卡片座標系）─────────
// ⚠️ 座標系有三層（螢幕 / 取樣畫面 / 卡面 0..1），混用是這一層唯一會錯的地方。
{
  const layout = { dispW: 375, dispH: 601, grabW: 95, grabH: 160 }
  const Hc = homography(UNIT, [[15, 40], [80, 38], [82, 110], [13, 108]])
  const HS = [
    { id: 'hs-baicai', objectId: 'obj-baicai', rect: { x: 0.08, y: 0.62, w: 0.30, h: 0.30 } },
    { id: 'hs-almanac', objectId: 'obj-almanac', rect: { x: 0.05, y: 0.05, w: 0.90, h: 0.33 } },
  ]
  // 每個熱區的中心點，反推成螢幕座標後必須命中自己
  for (const hs of HS) {
    const cu = hs.rect.x + hs.rect.w / 2, cv = hs.rect.y + hs.rect.h / 2
    const g = applyH(Hc, cu, cv)
    const pt = { x: g[0] * layout.dispW / layout.grabW, y: g[1] * layout.dispH / layout.grabH }
    const uv = screenToCard(Hc, pt, layout)
    ok(hitTest(HS, uv[0], uv[1])?.id === hs.id, `熱區 ${hs.id} 的中心點命中自己`)
  }
  const out = screenToCard(Hc, { x: 5, y: 5 }, layout)
  ok(!hitTest(HS, out[0], out[1]), '卡片外的點不可命中任何熱區')
  const nest = [
    { id: 'big', objectId: 'o', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { id: 'small', objectId: 'o', rect: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 } },
  ]
  ok(hitTest(nest, 0.5, 0.5)?.id === 'small', '熱區重疊時取面積最小的（小的意圖較明確）')

  // 防手震：進入 3 幀、離開 8 幀（hysteresis）
  // ⚠️ 沒有這層的話，四角偵測的 1px 抖動會讓邊界附近高頻開關 3D 舞台——
  //    而建 WebGL 場景／編譯 shader 是整條動線最貴的操作。
  const L = makeHotspotLatch({ enterFrames: 3, leaveFrames: 8 })
  ok(L.push('a').id === null && L.push('a').id === null, '熱區前兩幀不觸發')
  ok(L.push('a').changed === true, '熱區第三幀才觸發')
  ok(L.push(null).id === 'a', '掉一幀不可放掉（會閃爍）')
  let last
  for (let i = 0; i < 7; i++) last = L.push(null)
  ok(last.id === null && last.changed === true, '連續 8 幀沒命中才收起')
  const L2 = makeHotspotLatch({ enterFrames: 3 })
  L2.push('a'); L2.push('b'); L2.push('a')
  ok(L2.current === null, '中途換過目標要重新計數（不可累加）')

  // 熱區 JSON 是人工標註的，寫錯不拋錯——只會讓使用者點不到東西
  ok(validateCard({ id: 'c', hotspots: HS }).ok, '合法卡片通過驗證')
  ok(!validateCard({ id: 'c', hotspots: [{ id: 'x', objectId: 'o', rect: { x: 0.9, y: 0.9, w: 0.3, h: 0.3 } }] }).ok,
    'rect 超出卡面 0..1 要被擋下')
  ok(!validateCard({ id: 'c', hotspots: [{ id: 't', objectId: 'o', rect: { x: 0.1, y: 0.1, w: 0.05, h: 0.05 } }] }).ok,
    'rect 單邊 <12% 要被擋下（手機上點不到）')
}

// ── ★ 目標圖必須是「實際會印出來的那一版」（含收邊）────────────────────
// ⚠️ 這是流程陷阱不是程式 bug，而且它會浪費一整輪打樣：
//    設計檔加白邊與深色框之後，**整張圖的內容就變了**（版面被內縮、四周多了兩圈）。
//    拿「加收邊之前」的稿去登錄、印「加收邊之後」的卡，壓成 48×48 的 dHash
//    完全不同 → 相機看得到卡片、四角也抓得準，但一律判定「不是登錄過的目標」。
//    實測就是這樣踩到的：無框版登錄 + 有框版拍攝 = 0/2 追不到；
//    改用有框版登錄 = 4/4（深色/淺色桌面 × 正對/斜拍），六個熱區全部命中。
{
  const AW = 148, AH = 105
  const draw = (withSpec) => {
    const rgba = new Uint8ClampedArray(AW * AH * 4).fill(255)
    const pad = withSpec ? 3 : 0, fw = withSpec ? 3 : 0
    const ix = pad + fw, iy = pad + fw, iw = AW - 2 * ix, ih = AH - 2 * iy
    const box = (x0, y0, w, h, v) => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const px = Math.round(ix + (x0 + x) * iw / AW), py = Math.round(iy + (y0 + y) * ih / AH)
          if (px < 0 || py < 0 || px >= AW || py >= AH) continue
          const i = (py * AW + px) * 4
          rgba[i] = rgba[i + 1] = rgba[i + 2] = v; rgba[i + 3] = 255
        }
      }
    }
    box(0, 0, AW, 10, 150)        // 橘帶
    box(3, 14, 22, 42, 120)       // 白菜
    box(27, 22, 74, 30, 95)       // 身體保健
    box(5, 80, 18, 22, 60)        // QR
    if (withSpec) {
      for (let i = 0; i < fw; i++) {
        for (let x = pad; x < AW - pad; x++) {
          for (const y of [pad + i, AH - 1 - pad - i]) {
            const k = (y * AW + x) * 4; rgba[k] = rgba[k + 1] = rgba[k + 2] = 30
          }
        }
        for (let y = pad; y < AH - pad; y++) {
          for (const x of [pad + i, AW - 1 - pad - i]) {
            const k = (y * AW + x) * 4; rgba[k] = rgba[k + 1] = rgba[k + 2] = 30
          }
        }
      }
    }
    return rgba
  }
  const squash = (src, size) => {
    const out = new Uint8ClampedArray(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const sx = Math.min(AW - 1, Math.floor(x * AW / size))
        const sy = Math.min(AH - 1, Math.floor(y * AH / size))
        const si = (sy * AW + sx) * 4, oi = (y * size + x) * 4
        out[oi] = src[si]; out[oi + 1] = src[si + 1]; out[oi + 2] = src[si + 2]; out[oi + 3] = 255
      }
    }
    return out
  }
  const SZ = 48
  const sigPlain = makeSignature(squash(draw(false), SZ), SZ, SZ)
  const sigSpec = makeSignature(squash(draw(true), SZ), SZ, SZ)
  const self = matchScore(sigSpec, sigSpec)
  const cross = matchScore(sigSpec, sigPlain)
  ok(self >= 95, `有收邊版自比 ${self}（應 ≥95，作為上限基準）`)
  ok(cross < 58, `★ 無框版登錄 × 有框版拍攝的相似度 ${cross} < 門檻 58——`
    + '所以目標圖必須是加了收邊之後的那一版')
}

// ── ★ 姿態橋接：CV → three（每一項都是「貼歪但不報錯」的類型）────────────
// 驗證方法：造一張**已知姿態**的卡片（自己算出它四角的像素座標），解 pose，
// 再把模型點重投影回去比對。誤差應該趨近 0。
{
  const GW = 160, GH = 120, FOVX = 60
  const UNIT = [[0, 0], [1, 0], [1, 1], [0, 1]]
  const f = (GW / 2) / Math.tan((FOVX * Math.PI) / 360)

  // 用純 CV 公式擺一張 w×h 的卡片並投影出四角
  const synth = (aspect, yaw, pitch, dist) => {
    const k = 1 / aspect
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
    return [[0, 0], [1, 0], [1, k], [0, k]].map(([x, y]) => {
      const px = x - 0.5, py = y - k / 2
      const y1 = cp * py, z1 = sp * py
      const c = [cy * px + sy * z1, y1, -sy * px + cy * z1 + dist]
      return [GW / 2 + f * c[0] / c[2], GH / 2 + f * c[1] / c[2]]
    })
  }
  // pose + 模型點 → 像素（純 CV，不經過 three）
  const reproj = (pose, u, v) => {
    const R = [pose.matrix.slice(0, 3), pose.matrix.slice(4, 7), pose.matrix.slice(8, 11)]
    const t = pose.position, vy = v * (pose.vScale ?? 1)
    const c = [
      R[0][0] * u + R[1][0] * vy + t[0],
      R[0][1] * u + R[1][1] * vy + t[1],
      R[0][2] * u + R[1][2] * vy + t[2],
    ]
    return [GW / 2 + f * c[0] / c[2], GH / 2 + f * c[1] / c[2]]
  }
  const worstErr = (quad, aspect) => {
    const H = homography(UNIT, quad)
    const pose = poseFromHomography(H, { width: GW, height: GH, fovDeg: FOVX, aspect })
    if (!pose) return Infinity
    return Math.max(...UNIT.map(([u, v]) => {
      const p = reproj(pose, u, v), e = applyH(H, u, v)
      return Math.hypot(p[0] - e[0], p[1] - e[1])
    }))
  }

  // 正方形卡片：aspect 預設 1 就該完全正確
  ok(worstErr(synth(1, 0, 0, 3), 1) < 0.01, '正方形卡片重投影誤差 < 0.01px')

  // ★ 非正方形卡片一定要給 aspect（2027 小寒卡是 148×105）
  // ⚠️ 這個分解假設模型平面是**單位正方形**。不給 aspect 的話誤差約 12px
  //    （160px 寬的取樣畫面上約 7%）——角色會落在卡片外面，
  //    而且看起來很像「落點座標沒調好」。
  const CA = 148 / 105
  for (const [name, yaw, pitch, d] of [
    ['正對', 0, 0, 2.4], ['轉 20°', 20 * Math.PI / 180, 0, 2.4],
    ['俯視 25°', 0, 25 * Math.PI / 180, 2.4],
    ['兩軸都轉', 18 * Math.PI / 180, 15 * Math.PI / 180, 2.2],
  ]) {
    const q = synth(CA, yaw, pitch, d)
    ok(worstErr(q, CA) < 0.05, `148×105 卡片（${name}）給 aspect 後誤差 < 0.05px`)
    ok(worstErr(q, 1) > 5, `148×105 卡片（${name}）不給 aspect 誤差 >5px（所以必須給）`)
  }

  // ★ 水平 fov → 垂直 fov：兩邊都填同一個數字會差 8px
  const fovY = verticalFov(FOVX, GW / GH)
  ok(Math.abs(fovY - 46.826) < 0.01, `verticalFov(60, 4/3) = ${fovY.toFixed(3)}（應為 46.826）`)
  // 像素尺度必須與 pose 假設的 f 一致
  const pxScale = (GH / 2) / Math.tan((fovY * Math.PI) / 360)
  ok(Math.abs(pxScale - f) < 1e-6, `換算後的像素尺度 ${pxScale.toFixed(4)} ＝ pose 的 f ${f.toFixed(4)}`)
  ok(Math.abs(verticalFov(60, 1) - 60) < 1e-9, 'aspect 為 1 時垂直 fov 等於水平 fov')

  // ★ CV → three 的手性轉換：第 2、3 列取負
  {
    const m = Array.from({ length: 16 }, (_, i) => i + 1)
    const out = cvToThree(m)
    const e = out.elements
    ok(e[0] === 1 && e[4] === 5 && e[8] === 9 && e[12] === 13, 'cvToThree 保留第 1 列')
    ok(e[1] === -2 && e[5] === -6 && e[9] === -10 && e[13] === -14, 'cvToThree 第 2 列取負（y 上下顛倒）')
    ok(e[2] === -3 && e[6] === -7 && e[10] === -11 && e[14] === -15, 'cvToThree 第 3 列取負（z 前後顛倒）')
    ok(e[3] === 4 && e[7] === 8 && e[11] === 12 && e[15] === 16, 'cvToThree 保留第 4 列（齊次項）')
    // 深度必須翻正：CV 的 t.z > 0（卡片在前方）→ three 的 z < 0（相機看 −z）
    const pose = poseFromHomography(homography(UNIT, synth(1, 0, 0, 3)), { width: GW, height: GH, fovDeg: FOVX })
    ok(pose.position[2] > 0, 'CV 的 pose 深度為正（卡片在相機前方）')
    ok(cvToThree(pose.matrix).elements[14] < 0, '轉成 three 之後深度為負（相機看 −z）')
  }
}

// ── 官方卡包：熱區標註與卡面曆算 ────────────────────────────────────────
// 這一段鎖的是**印在紙上的東西**。卡片一旦付印就改不了，而熱區標錯不會拋錯，
// 只會讓使用者點不到東西或點到卡片另一邊。
{
  ok(OFFICIAL_CARDS.length >= 1, `官方卡包有 ${OFFICIAL_CARDS.length} 張卡`)
  for (const card of OFFICIAL_CARDS) {
    const v = validateCard(card)
    ok(v.ok, `${card.title} 熱區標註合法${v.ok ? '' : '：' + v.errors.join('；')}`)
    ok(card.hotspots.filter(h => h.primary).length === 1,
      `${card.title} 必須剛好有一個主物件（卡面上印著「掃描主物件」）`)
    // 每個熱區都要有對應的內容，否則點了跳出空白
    for (const hs of card.hotspots) {
      ok(!!objectForHotspot(hs), `${card.title}／${hs.id} 有對應的內容資料（${hs.objectId}）`)
    }
    // 熱區之間不可大幅重疊——重疊區塊使用者按到哪個都合理，等於隨機
    for (let i = 0; i < card.hotspots.length; i++) {
      for (let j = i + 1; j < card.hotspots.length; j++) {
        const a = card.hotspots[i].rect, b = card.hotspots[j].rect
        const ow = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
        const oh = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
        const frac = (ow * oh) / Math.min(a.w * a.h, b.w * b.h)
        ok(frac < 0.35,
          `${card.hotspots[i].id} 與 ${card.hotspots[j].id} 重疊 ${(frac * 100).toFixed(0)}%（上限 35%）`)
      }
    }
  }

  // 內容資料紀律：每個 fact 有出處；刻意不放營養宣稱
  for (const [id, obj] of Object.entries(CARD_OBJECTS)) {
    ok(!!obj.name && !!obj.link, `${id} 有名稱與導回站內的連結`)
    // ⚠️ 營養宣稱受《食品安全衛生管理法》規範，未經食藥署核對前不可出現。
    //    改版文件 §4.2 擬了草稿並自己標了待審——這裡把「待審」變成建置閘門。
    ok(!obj.nutrients, `${id} 尚未放營養素資料（須經食藥署核對後才可加）`)
    const claim = /療效|治療|預防疾病|抗癌|降血[壓糖脂]|排毒/
    ok(!claim.test(JSON.stringify(obj)), `${id} 沒有療效類宣稱用語`)
  }

  // ── 卡面曆算逐項核對（2027 小寒卡）──
  // ⚠️ 查某日屬於哪個節氣要用 termFromDate，**不可**用 termLocalDay 的序號
  //    反推公曆年：小寒在「立春起算」的序號裡屬於下一個公曆年，
  //    termLocalDay(2027, 22) 會得到 2028-01-06。
  const t = termFromDate(2027, 1, 5)
  ok(t.term === '小寒' && t.startsToday === true, '卡面小寒交節日 2027-01-05 正確')
  ok(termFromDate(2027, 1, 6).startsToday === false, '2027-01-06 不是交節日（改版文件寫錯）')
  const CARD_LUNAR = {
    1: [11, 24], 2: [11, 25], 3: [11, 26], 4: [11, 27], 5: [11, 28], 6: [11, 29], 7: [11, 30],
    8: [12, 1], 9: [12, 2], 10: [12, 3], 11: [12, 4], 12: [12, 5], 13: [12, 6], 14: [12, 7],
    15: [12, 8], 16: [12, 9],
  }
  let lunarBad = 0
  for (const [d, [lm, ld]] of Object.entries(CARD_LUNAR)) {
    const L = lunarFromDate(2027, 1, Number(d))
    if (L.month !== lm || L.day !== ld) lunarBad++
  }
  ok(lunarBad === 0, `卡面 16 個農曆日全部正確（不符 ${lunarBad} 筆）`)
  const lgz = lunarYearGanzhiIndex(2027, 3, 1)
  ok('甲乙丙丁戊己庚辛壬癸'[lgz % 10] + '子丑寅卯辰巳午未申酉戌亥'[lgz % 12] === '丁未',
    '卡面「丁未年 羊」正確')
  ok(new Date(2027, 0, 1).getDay() === 5, '2027-01-01 是星期五（卡面週欄位對齊）')
  // 臘八節＝農曆十二月初八
  const laba = lunarFromDate(2027, 1, 15)
  ok(laba.month === 12 && laba.day === 8, '卡面臘八節 2027-01-15 ＝ 農曆十二月初八')
}

// ── ★ 避開超廣角鏡頭 ────────────────────────────────────────────────────
// ⚠️ 桶狀畸變對這個追蹤器的容忍上限只有 k1 ≈ −0.04（實測：−0.04→62%、
//    −0.05→33%、−0.07 以上→**0%**）。超廣角的 k1 常在 −0.25~−0.4。
//    ⚠️ −0.07 之後的失效模式是「**四邊形照樣找得到**，但拉正後被畸變扭曲、
//       分數崩到 17~34」——症狀是「對著卡片卻一直說沒認出來」，很容易被誤診成
//       「比對太嚴格」而去調低門檻，那會讓正式站亂認。
// ⚠️ 沒有標準 constraint 可以說「不要超廣角」，只能靠 label 猜，所以這是
//    盡力而為：猜不出來要回 null 讓呼叫端退回 facingMode，**不可開不了相機**。
{
  const dev = (label, id) => ({ kind: 'videoinput', label, deviceId: id })
  const pick = (labels) => pickMainCameraId(labels.map((l, i) => dev(l, 'd' + i)))

  ok(pick(['Front Camera', 'Back Camera', 'Back Ultra Wide Camera', 'Back Telephoto Camera']) === 'd1',
    'iPhone 命名：挑到 Back Camera 而不是 Ultra Wide')
  ok(pick(['camera2 1, facing front', 'camera2 0, facing back', 'camera2 3, facing back (ultra wide)']) === 'd1',
    'Android 命名：挑到 facing back 而不是 ultra wide')
  ok(pick(['前置鏡頭', '後置主鏡頭', '後置超廣角鏡頭']) === 'd1', '中文命名：挑到後置主鏡頭')
  ok(pick(['Front', 'Back 1x', 'Back 0.5x']) === 'd1', '0.5x 命名也算超廣角')
  // 以下三種都必須回 null（讓呼叫端退回 facingMode）
  ok(pick(['Integrated Webcam']) === null, '只有一顆鏡頭時回 null（沒得挑）')
  ok(pick(['', '', '']) === null, '沒有 label（未授權）時回 null——不可亂猜')
  ok(pick(['Back Ultra Wide', 'Back ultra wide 2']) === null,
    '全部都是超廣角時回 null（有東西總比沒有好，交給 facingMode）')
  ok(pickMainCameraId(null) === null && pickMainCameraId([]) === null, '空輸入不可爆')
  ok(pickMainCameraId([{ kind: 'audioinput', label: 'Mic', deviceId: 'a' },
    dev('Back Camera', 'b'), dev('Front', 'f')]) === 'b', '只看 videoinput，忽略麥克風')
}

// ── ★ 多視角簽名的比對契約 ─// ── ★ 多視角簽名的比對契約 ──────────────────────────────────────────────
// ⚠️ dHash 對**透視縮短**很敏感：只存正面簽名時，yaw ±17°／pitch ±13° 的
//    手持晃動會讓分數掉到 37~57（門檻 58）。實測（瀏覽器，合成手持晃動）
//    追蹤成功率 33% → 多視角 80%，而誤判維持 0（立春卡 0/25、棋盤格 0/25）。
//    ⚠️ 絕對不可以改成調低 minScore：那會讓正式站把別的東西認成卡片，
//       而且是最難發現的壞法（使用者只覺得「有時候跳出錯的內容」）。
// 這裡測的是**契約**（有 sigs 就全部比過、取最高；沒有就退回 ref 本身），
// warpToSquare 需要 canvas，只能在瀏覽器驗。
{
  const SZ = 48, CW = 200, CH = 150
  // ⚠️ 「不相符」的參考圖必須真的不同。第一版只是把同一張圖平移 9px，
  //    但那張卡大半是漸層，平移後分數仍 ≥58——測試因此驗不到門檻。
  const card = (kind) => {
    const a = new Uint8ClampedArray(SZ * SZ * 4)
    for (let y = 0; y < SZ; y++) {
      for (let x = 0; x < SZ; x++) {
        const i = (y * SZ + x) * 4
        let v
        if (kind === 'A') {
          v = (x < SZ / 3 && y < SZ / 3) ? 110
            : (x > SZ * 0.62 && y > SZ * 0.62) ? 245 : 170 + ((x + y) % 40)
        } else {
          // 明暗分佈刻意反過來（左下暗、右上亮）＋不同頻率的紋理
          v = (x > SZ * 0.7 && y < SZ * 0.3) ? 60
            : (x < SZ * 0.3 && y > SZ * 0.7) ? 250 : 90 + ((x * 3 - y * 2 + 96) % 70)
        }
        a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] = 255
      }
    }
    return a
  }
  const paint = (corners, src) => {
    const rgba = new Uint8ClampedArray(CW * CH * 4)
    for (let i = 0; i < CW * CH; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 20; rgba[i * 4 + 3] = 255 }
    const [tl, tr, br, bl] = corners
    for (let v = 0; v <= 1; v += 0.0012) {
      for (let u = 0; u <= 1; u += 0.0012) {
        const sx = (1 - v) * ((1 - u) * tl[0] + u * tr[0]) + v * ((1 - u) * bl[0] + u * br[0])
        const sy = (1 - v) * ((1 - u) * tl[1] + u * tr[1]) + v * ((1 - u) * bl[1] + u * br[1])
        const px = Math.round(sx), py = Math.round(sy)
        if (px < 0 || py < 0 || px >= CW || py >= CH) continue
        const cx = Math.min(SZ - 1, Math.floor(u * SZ)), cy = Math.min(SZ - 1, Math.floor(v * SZ))
        const si = (cy * SZ + cx) * 4, di = (py * CW + px) * 4
        rgba[di] = src[si]; rgba[di + 1] = src[si + 1]; rgba[di + 2] = src[si + 2]
      }
    }
    return rgba
  }
  const quad = [[30, 24], [170, 22], [172, 122], [28, 120]]
  const seen = paint(quad, card('A'))

  // ① 只給「錯的」正面簽名 → 應該追不到
  const wrongOnly = { id: 'w', ...makeSignature(card('B'), SZ, SZ) }
  ok(createTracker({ refs: [wrongOnly], rectifySize: SZ, minScore: 58 }).track(seen, CW, CH) === null,
    '只有不符的簽名時追不到（門檻有效）')

  // ② sigs 裡多了「對的」那一個 → 應該追得到，且用的是最高分
  const withRight = {
    id: 'w', ...makeSignature(card('B'), SZ, SZ),
    sigs: [makeSignature(card('B'), SZ, SZ), makeSignature(card('A'), SZ, SZ)],
  }
  const hit = createTracker({ refs: [withRight], rectifySize: SZ, minScore: 58 }).track(seen, CW, CH)
  ok(hit !== null, '★ sigs 裡有相符的視角時追得到（多視角的作用）')
  ok(hit && hit.score >= 58, `多視角取到的分數 ${hit?.score} ≥ 58`)

  // ③ 沒有 sigs 時必須退回 ref 本身（向後相容：舊快取沒有這個欄位）
  const legacy = { id: 'L', ...makeSignature(card('A'), SZ, SZ) }
  ok(createTracker({ refs: [legacy], rectifySize: SZ, minScore: 58 }).track(seen, CW, CH) !== null,
    '沒有 sigs 欄位時退回 ref 本身（舊快取相容）')

  // ④ 多視角**不可**放寬門檻：完全不相干的圖仍要追不到
  const noise = new Uint8ClampedArray(CW * CH * 4)
  for (let i = 0; i < CW * CH; i++) {
    const v = ((i % CW) + Math.floor(i / CW)) % 2 ? 235 : 45
    noise[i * 4] = noise[i * 4 + 1] = noise[i * 4 + 2] = v; noise[i * 4 + 3] = 255
  }
  ok(createTracker({ refs: [withRight], rectifySize: SZ, minScore: 58 }).track(noise, CW, CH) === null,
    '多視角不可提高誤判：不相干的圖仍追不到')
}

// ── 收邊工具的 PNG 編解碼（scripts/frame-card.mjs）────────────────────────
// ⚠️ 手寫的 PNG 編解碼是「壞掉但不報錯」的典型：反濾波寫錯不會拋例外，
//    只會讓圖片從某一列開始整片糊掉或出現斜條紋——而那張圖是要拿去**付印**的。
{
  const W = 97, H = 61
  const rgba = new Uint8ClampedArray(W * H * 4)
  let seed = 12345
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296)
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = rnd() * 256 | 0; rgba[i * 4 + 1] = rnd() * 256 | 0
    rgba[i * 4 + 2] = rnd() * 256 | 0; rgba[i * 4 + 3] = 255
  }
  const back = decodePng(encodePng(W, H, rgba))
  ok(back.w === W && back.h === H, `PNG 往返尺寸 ${back.w}×${back.h}`)
  let diff = 0
  for (let i = 0; i < W * H * 4; i++) if (rgba[i] !== back.rgba[i]) diff++
  ok(diff === 0, `PNG 編解碼往返逐像素相同（不同位元組 ${diff}）`)

  // 外部工具匯出的 PNG 幾乎不會用 filter 0，所以反濾波一定要測
  const stride = W * 3
  const raw = Buffer.alloc(H * (1 + stride))
  for (let y = 0; y < H; y++) {
    raw[y * (1 + stride)] = 1                       // Sub
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < 3; c++) {
        const cur = rgba[(y * W + x) * 4 + c]
        const left = x > 0 ? rgba[(y * W + x - 1) * 4 + c] : 0
        raw[y * (1 + stride) + 1 + x * 3 + c] = (cur - left) & 0xff
      }
    }
  }
  // 借 encodePng 的 chunk 組法：直接拿一張 filter 0 的來換掉 IDAT 太脆弱，
  // 這裡用 zlib 自己組（與 frame-card 的編碼路徑無關，才測得出解碼）
  const zlib = await import('node:zlib')
  const crcT = Int32Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    return c
  })
  const crc = (b) => { let c = ~0; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (~c) >>> 0 }
  const chunk = (t, d) => {
    const l = Buffer.alloc(4); l.writeUInt32BE(d.length)
    const td = Buffer.concat([Buffer.from(t, 'ascii'), d])
    const cc = Buffer.alloc(4); cc.writeUInt32BE(crc(td))
    return Buffer.concat([l, td, cc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2
  const filtered = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
  const f1 = decodePng(filtered)
  let d1 = 0
  for (let i = 0; i < W * H * 4; i++) if (rgba[i] !== f1.rgba[i]) d1++
  ok(d1 === 0, `filter=1（Sub）反濾波正確（不同位元組 ${d1}）`)

  // 收邊比例：白邊 2.5%、框 3%，都以**短邊**為基準；畫布尺寸不可改變
  // ⚠️ 畫布放大的話實體卡的成品尺寸會變，而 148×105 是明信片規格。
  const spec = addSpec({ w: 1000, h: 700, rgba: new Uint8ClampedArray(1000 * 700 * 4).fill(200) })
  ok(spec.quiet === Math.round(700 * QUIET), `白邊 ${spec.quiet}px ＝ 短邊 ${(QUIET * 100)}%`)
  ok(spec.frame === Math.round(700 * FRAME), `深色框 ${spec.frame}px ＝ 短邊 ${(FRAME * 100)}%`)
  ok(spec.w === 1000 && spec.h === 700, '加收邊不改變畫布尺寸（版面內縮，不是畫布放大）')
  // 四個角落必須是白的（那是白留白邊）
  const at = (x, y) => spec.rgba[(y * spec.w + x) * 4]
  ok(at(0, 0) === 255 && at(999, 0) === 255 && at(0, 699) === 255 && at(999, 699) === 255,
    '四個角落是白留白邊')
  // 白邊內側必須是深色框
  ok(at(spec.quiet + 1, spec.h / 2 | 0) < 60, '白邊內側是深色框')
}

if (fails.length) {
  console.error(`\n[check-ar] ${fails.length} 項失敗：`)
  fails.forEach(f => console.error('  ✗ ' + f))
  process.exit(1)
}
console.log(`✓ AR 層 ${pass} 項檢查全部通過（homography、四邊形偵測、角點精修、姿態、卡面熱區、官方卡包）`)
