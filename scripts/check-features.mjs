// 特徵點層的回歸測試（FAST / rBRIEF / 配對 / RANSAC）
//
// ⚠️ 這一層是純數學，**寫錯不會拋錯**——只會讓比對率變差或貼歪。
//    所以每一項都用「已知真值」驗：自己造一張有紋理的圖，用已知的 homography
//    把它投影出去，再看能不能把那個 homography 解回來、誤差多少。
import {
  fastCorners, suppress, cornerAngle, describeKeypoints, hamming, DESC_WORDS,
  matchDescriptors, buildPyramid, blur3, extractFeatures, ransacHomography, cornersFromH,
} from '../src/lib/features.js'
import { homography } from '../src/lib/homography.js'

let pass = 0
const fails = []
const ok = (cond, label) => { if (cond) pass++; else fails.push(label) }
const near = (a, b, tol, label) => ok(Math.abs(a - b) <= tol, `${label}（得 ${a}，期望 ${b}±${tol}）`)

// ── 造一張「有豐富紋理」的測試圖 ──
// ⚠️ 不可用單純的棋盤格：那種圖上每個角點的鄰域**長得一模一樣**，描述子全部相同，
//    ratio test 會把所有配對否決掉（這正是它該做的事）。要有可分辨的局部結構。
const TW = 480, TH = 360
function makeTexture(w, h) {
  const g = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 幾層不同頻率、不同相位的條紋相乘 → 局部結構各處不同
      const a = Math.sin(x * 0.11) * Math.cos(y * 0.07)
      const b = Math.sin((x + y) * 0.043 + 1.7)
      const c = Math.sin(x * 0.019 - y * 0.031 + 0.4)
      let v = 128 + 60 * a + 40 * b + 30 * c
      // ⚠️ 光靠正弦漸層產生的角點極少（實測整張 480×360 只有 136 個、抑制後 27 個）
      //    ——FAST 找的是「中心與圓周有明顯落差」，平滑漸層沒有那種落差。
      //    真實卡面有文字、格線、圖框那種硬邊，所以測試圖也要有，否則測到的是
      //    「我的測試圖有幾個角」而不是「演算法找不找得到」。
      const bx = (x >> 4) & 7, by = (y >> 4) & 7
      const cell = (bx * 5 + by * 11 + ((x >> 6) * 3) + ((y >> 6) * 7)) % 9
      if (cell === 0) v = 20
      else if (cell === 3) v = 240
      else if (cell === 6) v = v > 128 ? 210 : 40
      g[y * w + x] = Math.max(0, Math.min(255, v))
    }
  }
  return g
}
const TEX = makeTexture(TW, TH)

// ── 1. FAST 找得到角點，而且抑制之後不重複 ──
{
  const raw = fastCorners(TEX, TW, TH, { threshold: 20 })
  ok(raw.n > 200, `FAST 在有紋理的圖上要找到夠多角點（得 ${raw.n}）`)
  const kept = suppress(raw, TW, TH, { radius: 4, maxCount: 300 })
  // 實測這張測試圖：346 原始角點 → 半徑 2 剩 148、半徑 3 剩 85、半徑 4 剩 75、半徑 6 剩 72。
  // ⚠️ 門檻取 60 是**有依據的**（實得 75），不是隨手填一個好看的數字。
  //    真正該在意的不是這一層的點數，而是整座金字塔的總量（下面那項打到上限 400）
  //    與最終的配對／RANSAC 誤差。
  ok(kept.length > 60, `抑制後仍有足夠角點（得 ${kept.length}）`)
  ok(kept.length <= 300, '不可超過 maxCount')
  // 任兩點不可太近（抑制真的有作用）
  let tooClose = 0
  for (let i = 0; i < kept.length; i++) {
    for (let j = i + 1; j < kept.length; j++) {
      const dx = kept[i].x - kept[j].x, dy = kept[i].y - kept[j].y
      if (dx * dx + dy * dy < 9) tooClose++
    }
  }
  ok(tooClose === 0, `抑制後不可有距離 <3px 的點對（得 ${tooClose}）`)
  // 平坦圖上不可有角點（否則雜訊會被當成特徵）
  const flat = new Uint8Array(200 * 200).fill(128)
  ok(fastCorners(flat, 200, 200, { threshold: 20 }).n === 0, '純平坦影像不可產生角點')
}

// ── 2. 描述子：同一點兩次要完全一樣；不同點要不一樣 ──
{
  const bl = blur3(TEX, TW, TH)
  const kps = [{ x: 100, y: 100, angle: 0 }, { x: 100, y: 100, angle: 0 }, { x: 300, y: 200, angle: 0 }]
  const d = describeKeypoints(bl, TW, TH, kps)
  ok(hamming(d, 0, d, DESC_WORDS) === 0, '同一個點、同角度 → 描述子完全相同')
  ok(hamming(d, 0, d, 2 * DESC_WORDS) > 40, '不同位置 → 描述子要明顯不同')
  // 描述子不可全 0 或全 1（取樣對沒生效的典型症狀）
  let bits = 0
  for (let k = 0; k < DESC_WORDS; k++) {
    let v = d[k] >>> 0
    while (v) { bits += v & 1; v >>>= 1 }
  }
  ok(bits > 40 && bits < 216, `描述子的 1 位元數要接近一半（得 ${bits}/256）`)
}

// ── 3. 旋轉不變性：把圖轉 30°，同一個實體點的描述子要仍然相近 ──
{
  const rot = (g, w, h, deg) => {
    const out = new Uint8Array(w * h)
    const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a)
    const cx = w / 2, cy = h / 2
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy
        const sx = Math.round(cx + ca * dx + sa * dy), sy = Math.round(cy - sa * dx + ca * dy)
        out[y * w + x] = (sx >= 0 && sy >= 0 && sx < w && sy < h) ? g[sy * w + sx] : 128
      }
    }
    return out
  }
  const deg = 30
  const R = rot(TEX, TW, TH, deg)
  const bl0 = blur3(TEX, TW, TH), bl1 = blur3(R, TW, TH)
  const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a)
  const cx = TW / 2, cy = TH / 2
  let sum = 0, cnt = 0
  for (const [x, y] of [[140, 120], [220, 180], [300, 140], [180, 250]]) {
    const ang0 = cornerAngle(TEX, TW, TH, x, y, 7)
    // 該點在旋轉後圖上的位置
    const dx = x - cx, dy = y - cy
    const rx = Math.round(cx + ca * dx - sa * dy), ry = Math.round(cy + sa * dx + ca * dy)
    if (rx < 20 || ry < 20 || rx > TW - 20 || ry > TH - 20) continue
    const ang1 = cornerAngle(R, TW, TH, rx, ry, 7)
    const d0 = describeKeypoints(bl0, TW, TH, [{ x, y, angle: ang0 }])
    const d1 = describeKeypoints(bl1, TW, TH, [{ x: rx, y: ry, angle: ang1 }])
    sum += hamming(d0, 0, d1, 0); cnt++
  }
  ok(cnt >= 3, '至少要有 3 個點落在旋轉後的圖內')
  const avg = sum / Math.max(1, cnt)
  // ⚠️ 這個數字是「有沒有旋轉不變性」的直接證據：沒有做方向對齊時會接近 128（隨機）
  ok(avg < 90, `轉 ${deg}° 後同一點的描述子距離要明顯低於隨機的 128（得 ${avg.toFixed(1)}）`)
}

// ── 4. 金字塔 ──
{
  const pyr = buildPyramid(TEX, TW, TH, { levels: 4, factor: 1.4 })
  ok(pyr.length >= 3, `金字塔要有多層（得 ${pyr.length}）`)
  ok(pyr[0].scale === 1, '第 0 層 scale 必須是 1')
  near(pyr[1].w, Math.round(TW / 1.4), 1, '第 1 層寬度')
  // scale 要能把座標換算回第 0 層
  near(pyr[1].scale, TW / pyr[1].w, 0.01, '第 1 層 scale')
  ok(pyr.every(l => l.gray.length === l.w * l.h), '每一層的緩衝區大小要正確')
}

// ── 5. ★ RANSAC：用已知真值的透視把圖投影出去，看能不能解回來 ──
{
  // 參考：卡面正規化座標的特徵點
  const ref = extractFeatures(TEX, TW, TH, { maxTotal: 400 })
  ok(ref.n > 100, `參考圖要擷取到足夠特徵（得 ${ref.n}）`)
  const refUV = ref.pts.map(p => [p.x / TW, p.y / TH])

  // 真值 H：把單位正方形投影到畫面上的一個梯形（模擬斜拍）
  const W = 320, H = 240
  const truthQuad = [[42, 30], [286, 44], [268, 196], [58, 210]]
  const truthH = homography([[0, 0], [1, 0], [1, 1], [0, 1]], truthQuad)
  ok(!!truthH, '真值 homography 要解得出來')

  // 用真值 H 把紋理畫到畫面上（反向取樣）
  const scene = new Uint8Array(W * H).fill(40)
  const inv = (() => {
    // 直接用 homography 求反向：畫面 → 卡面
    return homography(truthQuad, [[0, 0], [1, 0], [1, 1], [0, 1]])
  })()
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = inv[2][0] * x + inv[2][1] * y + inv[2][2]
      const u = (inv[0][0] * x + inv[0][1] * y + inv[0][2]) / d
      const v = (inv[1][0] * x + inv[1][1] * y + inv[1][2]) / d
      if (u < 0 || v < 0 || u >= 1 || v >= 1) continue
      scene[y * W + x] = TEX[(Math.min(TH - 1, (v * TH) | 0)) * TW + Math.min(TW - 1, (u * TW) | 0)]
    }
  }

  const q = extractFeatures(scene, W, H, { maxTotal: 400 })
  ok(q.n > 40, `畫面上要擷取到足夠特徵（得 ${q.n}）`)
  const pairs = matchDescriptors(q.desc, q.n, ref.desc, ref.n, { ratio: 0.8 })
  ok(pairs.length >= 12, `配對數要足夠（得 ${pairs.length}）`)

  const src = pairs.map(p => refUV[p.r])
  const dst = pairs.map(p => [q.pts[p.q].x, q.pts[p.q].y])
  const res = ransacHomography(src, dst, homography, { iters: 800, thresh: 4, minInliers: 8 })
  ok(!!res, 'RANSAC 要解出 homography')
  if (res) {
    ok(res.inliers.length >= 8, `inlier 數要足夠（得 ${res.inliers.length}）`)
    // ★ 最重要的一項：解出的四角與真值四角差多少
    const got = cornersFromH(res.H, 1)
    let maxErr = 0
    for (let i = 0; i < 4; i++) {
      const e = Math.hypot(got[i][0] - truthQuad[i][0], got[i][1] - truthQuad[i][1])
      if (e > maxErr) maxErr = e
    }
    ok(maxErr < 8, `★★ 解回來的四角誤差要小（最大 ${maxErr.toFixed(2)}px，上限 8）`)
  }
}

// ── 6. 負向對照：完全不同的圖不可解出 homography ──
{
  const ref = extractFeatures(TEX, TW, TH, { maxTotal: 300 })
  const refUV = ref.pts.map(p => [p.x / TW, p.y / TH])
  // 另一張紋理（不同頻率、不同相位）
  const other = new Uint8Array(320 * 240)
  for (let y = 0; y < 240; y++) {
    for (let x = 0; x < 320; x++) {
      other[y * 320 + x] = Math.max(0, Math.min(255,
        128 + 70 * Math.sin(x * 0.29 + 2.1) * Math.cos(y * 0.23 - 1.3) + 40 * Math.sin((x - y) * 0.17)))
    }
  }
  const q = extractFeatures(other, 320, 240, { maxTotal: 300 })
  const pairs = matchDescriptors(q.desc, q.n, ref.desc, ref.n, { ratio: 0.75 })
  const src = pairs.map(p => refUV[p.r])
  const dst = pairs.map(p => [q.pts[p.q].x, q.pts[p.q].y])
  const res = src.length >= 4
    ? ransacHomography(src, dst, homography, { iters: 600, thresh: 3, minInliers: 15 })
    : null
  // ⚠️ 這一項是**誤認防線**：不同的圖即使湊出一些配對，也不該有 15 個以上的 inlier
  ok(!res, `★★ 不同的圖不可解出 homography（配對 ${pairs.length}、inlier ${res?.inliers.length ?? 0}）`)
}

// ── 7. 防呆：輸入不合法不可爆 ──
{
  ok(ransacHomography([], [], homography) === null, '空輸入回 null')
  ok(ransacHomography([[0, 0], [1, 0], [1, 1]], [[0, 0], [1, 0], [1, 1]], homography) === null,
    '少於 4 點回 null')
  ok(matchDescriptors(new Uint32Array(0), 0, new Uint32Array(0), 0).length === 0, '空描述子回空配對')
  const flat = new Uint8Array(64 * 64).fill(200)
  ok(extractFeatures(flat, 64, 64).n === 0, '平坦小圖不可產生特徵')
}

if (fails.length) {
  console.error(`\n✗ 特徵點層檢查失敗 ${fails.length} 項：`)
  for (const f of fails) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log(`✓ 特徵點層 ${pass} 項檢查全部通過（FAST、rBRIEF、旋轉不變性、金字塔、RANSAC 真值、誤認防線）`)
