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

// ── 結果 ───────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n[check-ar] ${fails.length} 項失敗：`)
  fails.forEach(f => console.error('  ✗ ' + f))
  process.exit(1)
}
console.log(`✓ AR 幾何層 ${pass} 項檢查全部通過（homography、四邊形偵測、角點精修、姿態）`)
