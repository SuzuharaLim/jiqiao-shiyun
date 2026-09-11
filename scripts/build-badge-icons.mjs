// ============================================================================
// 徽章圖轉檔（2026-09-11）
//
//   node scripts/build-badge-icons.mjs "C:/Users/.../節氣ICON"
//
// 把美術給的原稿轉成網站用的圖：**去背 → 裁掉留白 → 縮小 → 存成 public/badges/<徽章id>.png**
//
// ★★★★ 為什麼一定要有這支腳本，而不是把圖直接丟進 public：
//   原稿是 1254×1254、**每張約 3 MB、69 張共 195 MB**。收藏庫一次顯示 69 枚 ⇒
//   照原樣就是 195 MB 的下載量。而畫面上那個位置只有 56~64 px。
//
// ★★★★ 去背是**必要的**不是美化：原稿的背景被烤進像素了，而且四組各不相同
//   （實測：格紋 25 張、白底 8 張、黑底 2 張、淺灰 4 張、奶油底 29 張）。
//   其中「格紋」是繪圖軟體的透明格線被一起輸出成不透明像素 ⇒ 直接用的話，
//   奶油色的卡片上會出現一塊灰色棋盤格方塊。
//   ⇒ 去背之後同一枚徽章在淺色與深色主題都正確，這是站規「兩個主題都要量」的前提。
//
// 去背用「**從四邊界往內泛洪**」而不是色鍵：
//   ① 先從最外圈學底色，**只收低飽和的**（Max−Min < 18）——圖案本身是金邊與
//      彩色植物，飽和度高，學不進去；
//   ② 從四邊界泛洪，只擴散到與底色相近的像素。
//   ⇒ 圖案內部就算有同色的小塊也**碰不到**（泛洪從外面進不去），
//     這正是色鍵做不到的事——色鍵會把徽章中間的淺色一起挖掉。
//
// ⚠️ 檔名→徽章 id 的對應**必須全中**：少一張就是那一枚徽章永遠沒有圖，
//   而畫面上只會退回字形磚，看起來完全正常。所以最後會逐項核對並在
//   沒有 100% 對上時**讓腳本失敗**。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas, loadImage } from 'canvas'
import { BADGES } from '../src/data/badges.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public/badges')
const SRC = process.argv[2]
if (!SRC || !fs.existsSync(SRC)) {
  console.error('用法：node scripts/build-badge-icons.mjs <原稿資料夾>')
  process.exit(1)
}

// 輸出邊長。畫面上最大的使用情境是收藏庫格子裡的 ~64px，
// 2 倍解析度 ⇒ 128 就夠；再大只是多下載。
const SIZE = 128

// ── 檔名正規化 ────────────────────────────────────────────────
// 原稿檔名不一致：有編號前綴、有全形間隔號、有多餘空白、有連續兩個點。
// 一律洗成「只剩中文」再比對。
const norm = (s) => s
  .replace(/\.[a-z0-9]+$/i, '')       // 副檔名
  .replace(/^\d+\s*[・·．.]\s*/, '')   // 「01・」這種編號前綴
  .replace(/[・·．.\s_-]/g, '')        // 間隔號、空白、多餘的點

// ⚠️ 原稿檔名把「臘八粥」寫成「蠟八粥」（蠟＝蠟燭）。
//   不建這張表的話，那一枚徽章會靜默地沒有圖。
//   **不要去改原稿檔名**——下次美術再給一次還是會是同一個字，
//   把差異記在這裡才有人看得到。
const ALIAS = { 小寒蠟八粥: '小寒臘八粥' }

// ── 目錄 → 徽章 id 的對應（由 BADGES 反查，不手打 id）──
const byKey = new Map()
for (const b of Object.values(BADGES)) {
  if (b.group === 'term') byKey.set(norm(b.term + '節氣卡'), b.id)
  else if (b.group === 'jieqi') byKey.set(norm(b.term), b.id)
  else byKey.set(norm(b.name), b.id)     // quiz 與 ar 都用徽章名
}

/**
 * 從四邊界泛洪去背。回傳去背後的 canvas 與內容的外接框。
 * @param tol 顏色容差。呼叫端會由寬到窄重試，見 keyOutAdaptive。
 */
function keyOutAndTrim(img, tol = 26) {
  // 先在較大的工作解析度上做，邊緣才不會鋸齒
  const W = 512
  const work = createCanvas(W, W)
  const wx = work.getContext('2d')
  wx.drawImage(img, 0, 0, W, W)
  const im = wx.getImageData(0, 0, W, W)
  const d = im.data

  // ① 學底色：只收低飽和（圖案是金邊與彩色植物，學不進去）
  const pal = []
  const learn = (x, y) => {
    const o = (y * W + x) * 4
    const [r, g, b] = [d[o], d[o + 1], d[o + 2]]
    if (Math.max(r, g, b) - Math.min(r, g, b) < 18) pal.push([r, g, b])
  }
  for (let i = 0; i < W; i++) { learn(i, 0); learn(i, W - 1); learn(0, i); learn(W - 1, i) }
  if (!pal.length) return null      // 四周全是圖案 ⇒ 本來就沒有背景可去
  const near = (r, g, b) => pal.some(p =>
    Math.abs(p[0] - r) < tol && Math.abs(p[1] - g) < tol && Math.abs(p[2] - b) < tol)

  // ② 泛洪（用明確的堆疊，不用遞迴——512² 遞迴會爆堆疊）
  const seen = new Uint8Array(W * W)
  const st = []
  for (let i = 0; i < W; i++) st.push(i, 0, i, W - 1, 0, i, W - 1, i)
  while (st.length) {
    const y = st.pop(), x = st.pop()
    if (x < 0 || y < 0 || x >= W || y >= W) continue
    const k = y * W + x
    if (seen[k]) continue
    const o = k * 4
    if (!near(d[o], d[o + 1], d[o + 2])) continue
    seen[k] = 1
    d[o + 3] = 0
    st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1)
  }
  wx.putImageData(im, 0, 0)

  // ③ 量內容的外接框（把去背後的留白裁掉，圖案才會填滿格子）
  let x0 = W, y0 = W, x1 = -1, y1 = -1
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x
      if (y < y0) y0 = y; if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return null

  // ④ 滲漏檢查：量**內容外接框的中央 50%** 有多少是透明的。
  //   正常去背後那裡應該全是圖案（0%）。滲漏時會是七成以上。
  const cx0 = x0 + (x1 - x0) * 0.25, cx1 = x0 + (x1 - x0) * 0.75
  const cy0 = y0 + (y1 - y0) * 0.25, cy1 = y0 + (y1 - y0) * 0.75
  let hole = 0, tot = 0
  for (let y = cy0 | 0; y <= cy1; y++) for (let x = cx0 | 0; x <= cx1; x++) {
    tot++; if (d[(y * W + x) * 4 + 3] < 128) hole++
  }
  return {
    work, box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1],
    removed: seen.reduce((a, b) => a + b, 0) / (W * W),
    hole: tot ? hole / tot : 0,
  }
}

/**
 * 由寬到窄試容差，直到不再滲漏為止。
 *
 * ★★★ 為什麼需要這一層（2026-09-11 實測）：小雪／大雪／大寒 三張節氣卡的
 *   內部是**雪景**，顏色與卡外的底色幾乎一樣，而卡框又有缺口 ⇒ 泛洪從那個
 *   缺口一路走進卡片裡面，把整片內容挖成透明。
 *   ⚠️ **淺色主題完全看不出來**（奶油挖空後露出的還是奶油底），只有深色
 *     主題才會現形成一塊黑。這正是站規「四個象限都要量」的又一次現形。
 *   ⇒ 所以不能只靠肉眼看一張表，要**逐張量中心透明率**。
 *
 * 全部容差都滲漏時**寧可不去背**（回傳原圖），而不是交出一張挖破的圖——
 * 背景色不對只是不好看，挖破是內容不見了。
 */
function keyOutAdaptive(img) {
  let loose = null
  for (const tol of [26, 18, 12, 8, 5, 3]) {
    const r = keyOutAndTrim(img, tol)
    if (!r) continue
    if (!loose) loose = r
    if (r.hole < 0.02) return { ...r, tol }
  }
  return null
}

fs.mkdirSync(OUT, { recursive: true })
const seenIds = new Set()
const skipped = []
const tightened = []
let bytes = 0

for (const dir of fs.readdirSync(SRC)) {
  const dp = path.join(SRC, dir)
  if (!fs.statSync(dp).isDirectory()) continue
  for (const f of fs.readdirSync(dp)) {
    const key0 = norm(f)
    const key = ALIAS[key0] || key0
    const id = byKey.get(key)
    if (!id) { skipped.push(`${dir}/${f}（正規化後「${key}」對不到任何徽章）`); continue }

    let img
    try {
      // ⚠️ 一定要自己讀成 Buffer 再給 loadImage：canvas 在 Windows 上
      //   開不了含中文的路徑（EILSEQ, Illegal byte sequence）。
      img = await loadImage(fs.readFileSync(path.join(dp, f)))
    } catch (e) {
      // canvas 不支援 webp。原稿混了一張 .webp，見 README 的說明。
      skipped.push(`${dir}/${f}（讀不了：${e.message.slice(0, 40)}）`)
      continue
    }

    const r = keyOutAdaptive(img)
    if (!r) { skipped.push(`${dir}/${f}（每一種容差都會滲漏或學不到底色，未去背）`); continue }
    if (r.tol !== 26) tightened.push(`${BADGES[id].name}（容差收到 ${r.tol}）`)

    // ④ 縮到輸出尺寸：等比放進正方形並留 2% 呼吸
    const out = createCanvas(SIZE, SIZE)
    const ox = out.getContext('2d')
    ox.patternQuality = 'best'
    ox.quality = 'best'
    const [bx, by, bw, bh] = r.box
    const pad = SIZE * 0.02
    const s = Math.min((SIZE - pad * 2) / bw, (SIZE - pad * 2) / bh)
    ox.drawImage(r.work, bx, by, bw, bh,
      (SIZE - bw * s) / 2, (SIZE - bh * s) / 2, bw * s, bh * s)

    const buf = out.toBuffer('image/png', { compressionLevel: 9 })
    fs.writeFileSync(path.join(OUT, id + '.png'), buf)
    bytes += buf.length
    seenIds.add(id)
  }
}

const all = Object.keys(BADGES)
const missing = all.filter(id => !seenIds.has(id))

console.log(`\n產出 ${seenIds.size} / ${all.length} 枚，共 ${(bytes / 1024).toFixed(0)} KB`
  + `（平均 ${(bytes / 1024 / Math.max(1, seenIds.size)).toFixed(1)} KB）→ public/badges/`)
if (tightened.length) {
  console.log('')
  console.log('以下這幾張的容差自動收緊過（原稿的圖案與底色太接近）：')
  tightened.forEach(t => console.log('  · ' + t))
}
if (skipped.length) {
  console.log('\n沒有處理的檔案：')
  skipped.forEach(s => console.log('  · ' + s))
}
if (missing.length) {
  console.log('\n★ 這些徽章還沒有圖（畫面會退回字形磚）：')
  missing.forEach(id => console.log(`  · ${id}（${BADGES[id].name}）`))
  console.log('\n⇒ 少一張就是那一枚徽章永遠沒有圖，而畫面上看起來完全正常。')
  process.exit(1)
}
