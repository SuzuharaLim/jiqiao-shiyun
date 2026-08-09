// 一步到位：把設計稿加上收邊，然後直接放進 public/ar/targets/ 成為官方卡的目標圖。
//
// 為什麼要有這支：原本是兩個動作——先 `npm run card:frame` 產出 -framed.png，
// 再自己把它複製到 public/ar/targets/ 並改成正確的檔名。**兩步分開就會有人只做一半**，
// 而少做第二步的症狀是「AR 完全沒反應」（沒有登錄目標可比對），
// 少做第一步的症狀更糟：淺色桌面上四角偵測不到，但深色桌面又正常，看起來像時好時壞。
//
// ⚠️ 檔名必須與 arCards.js 的 `target` 完全一致，否則放了也白放。
//    這支直接從 OFFICIAL_CARDS 讀，不讓人手打。
//
// 用法：
//   npm run card:install -- 稿.png                # 只有一張官方卡時自動對應
//   npm run card:install -- 稿.png 2027-xiaohan   # 多張卡時指定 slug
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePng, encodePng, addSpec, verify } from './frame-card.mjs'
import { OFFICIAL_CARDS } from '../src/data/arCards.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ★ 登錄目標圖的短邊上限。
//
// 為什麼要縮：**每個進 /AR 的人都要下載這張圖**，只為了算一個 64×64 的簽名
// （追蹤時 rectify 成 RECT=64，原始解析度完全用不到）。實測小寒卡的原稿
// 加收邊後是 1831×1335 / 1262 KB——那是主 JS bundle（629 KB）的 **2 倍**，
// 掛在旗艦動線的入口上。
//
// 900 的依據：CardPage 的海報在桌機顯示約 710px 寬、熱區校對也是看那張，
// 900 已有餘裕；再小會讓校對頁的卡面字看不清楚。
//
// ⚠️ 縮的**只有登錄目標**。「-付印.png」維持原解析度——那張要拿去印。
// ⚠️ 必須在**加完收邊之後**才縮：收邊的比例是取短邊的百分比，
//    先縮再加收邊會得到一樣的比例，但先加再縮可以讓兩份輸出的版面完全一致。
const TARGET_MAX_SHORT = 900

/**
 * 面積平均（box）縮圖。
 * ⚠️ 不可用「最近鄰取樣」：那會讓細線與文字產生鋸齒與摩爾紋，
 *    而 dHash 比對的就是明暗結構——取樣雜訊會直接變成分數損失。
 */
function downscale({ w, h, rgba }, maxShort) {
  const short = Math.min(w, h)
  if (short <= maxShort) return { w, h, rgba }
  const s = maxShort / short
  const nw = Math.max(1, Math.round(w * s)), nh = Math.max(1, Math.round(h * s))
  const out = new Uint8Array(nw * nh * 4)
  for (let y = 0; y < nh; y++) {
    const y0 = Math.floor(y / s), y1 = Math.min(h, Math.max(y0 + 1, Math.floor((y + 1) / s)))
    for (let x = 0; x < nw; x++) {
      const x0 = Math.floor(x / s), x1 = Math.min(w, Math.max(x0 + 1, Math.floor((x + 1) / s)))
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * w + xx) * 4
          r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; a += rgba[i + 3]; n++
        }
      }
      const o = (y * nw + x) * 4
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = a / n
    }
  }
  return { w: nw, h: nh, rgba: out }
}

const [inFile, slugArg] = process.argv.slice(2)
if (!inFile) {
  console.log(`用法：npm run card:install -- <設計稿.png> [slug]

把設計稿加上「白留白邊＋深色實框」，並直接安裝成官方卡的目標圖
（檔名與路徑由 arCards.js 決定，不必手打）。

目前的官方卡：
${OFFICIAL_CARDS.map(c => `  ${c.slug}\t${c.title}\t→ public${c.target}`).join('\n')}

⚠️ 裝進去的那一張**必須與實際付印的是同一版**。拿加收邊之前的稿登錄、
   印加收邊之後的卡，相機看得到卡片、四角也抓得準，卻會一律判定
   「不是登錄過的目標」——實測 0/2。這支輸出的圖同時是付印稿與登錄目標，
   把兩件事綁在一起就不會踩到那個坑。`)
  process.exit(1)
}

const card = slugArg
  ? OFFICIAL_CARDS.find(c => c.slug === slugArg)
  : (OFFICIAL_CARDS.length === 1 ? OFFICIAL_CARDS[0] : null)
if (!card) {
  console.error(slugArg
    ? `✗ 找不到 slug「${slugArg}」。可用：${OFFICIAL_CARDS.map(c => c.slug).join('、')}`
    : `✗ 有 ${OFFICIAL_CARDS.length} 張官方卡，請指定 slug：${OFFICIAL_CARDS.map(c => c.slug).join('、')}`)
  process.exit(1)
}

if (!fs.existsSync(inFile)) { console.error(`✗ 找不到檔案：${inFile}`); process.exit(1) }
// ⚠️ 只吃 PNG（自寫的解碼器不支援 JPEG／interlaced）。副檔名不是唯一判準，
//    但先擋掉最常見的誤用，錯誤訊息才講得清楚。
if (!/\.png$/i.test(inFile)) {
  console.error(`✗ 只支援 PNG（收到 ${path.extname(inFile) || '(無副檔名)'}）。
   請從設計軟體匯出 PNG，不要用 JPG——JPG 的壓縮雜訊會讓邊界對比變差。`)
  process.exit(1)
}

const src = decodePng(fs.readFileSync(inFile))
console.log(`讀入 ${inFile}　${src.w}×${src.h}　長寬比 ${(src.w / src.h).toFixed(4)}`)
// ⚠️ 比對用的 aspect 是從這張圖算的（arCardRegistry），與 sizeMM 無關；
//    sizeMM 只影響貼合式 3D 的實體比例。這裡順手比一下，差太多通常代表拿錯稿。
const wantAspect = card.sizeMM[0] / card.sizeMM[1]
const gotAspect = src.w / src.h
if (Math.abs(gotAspect - wantAspect) / wantAspect > 0.08) {
  console.log(`⚠️ 這張圖的長寬比 ${gotAspect.toFixed(3)} 與卡片登記的 ${wantAspect.toFixed(3)}`
    + `（${card.sizeMM[0]}×${card.sizeMM[1]}mm）差超過 8%。`
    + `\n   比對不受影響（aspect 由圖片決定），但貼合式 3D 的實體比例會不準——`
    + `\n   若這是最終尺寸，請一併更新 arCards.js 的 sizeMM。`)
}

const before = verify(src, '原稿（未加收邊）')
const framed = addSpec(src)
console.log(`\n加收邊：白邊 ${framed.quiet}px ＋ 深色框 ${framed.frame}px`)
const after = verify(framed, '加收邊之後')

if (!after) {
  console.error(`
✗ 加了收邊仍有角偏掉，**沒有安裝**（裝一張測不過的圖只會讓現場更難查）。
  可能原因：版面四角有大面積白區、或解析度太低使白邊與框只剩幾個像素。
  請把上面的逐角數字一起回報。`)
  process.exit(1)
}

// ⚠️ 付印稿要**先**寫出來，而且用**加收邊後的原解析度**——那張是要拿去印的。
//    順序寫反（先縮再存付印）會把一張 900px 的圖送去印刷廠。
const printCopy = path.join(path.dirname(inFile), path.basename(inFile, '.png') + '-付印.png')
fs.writeFileSync(printCopy, encodePng(framed.w, framed.h, framed.rgba))

// 登錄目標縮到短邊 TARGET_MAX_SHORT：每個進 /AR 的人都要下載它，
// 而追蹤只用得到 64×64 的簽名（理由見檔頭的 TARGET_MAX_SHORT）。
const small = downscale(framed, TARGET_MAX_SHORT)
const shrunk = small.w !== framed.w
if (shrunk) {
  // 縮完要**重驗一次**：白邊與深色框跟著變窄，若原稿解析度偏低可能不夠偵測。
  // ⚠️ 這一步不可省。縮圖是為了省頻寬，不是為了讓它變得測不過。
  const afterSmall = verify(small, `縮到 ${small.w}×${small.h} 之後`)
  if (!afterSmall) {
    console.error(`
✗ 縮圖之後有角偏掉，**沒有安裝**。
  付印稿已寫出（${printCopy}，原解析度、可正常使用），只是登錄目標沒裝。
  請把 scripts/install-target.mjs 的 TARGET_MAX_SHORT 調大再試。`)
    process.exit(1)
  }
}

const dest = path.join(ROOT, 'public', card.target)
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.writeFileSync(dest, encodePng(small.w, small.h, small.rgba))

const shrink = ((framed.quiet + framed.frame) / src.w * 100).toFixed(1)
console.log(`
✓ 已安裝：public${card.target}　${small.w}×${small.h}　${(fs.statSync(dest).size / 1024).toFixed(0)} KB${
  shrunk ? `（由 ${framed.w}×${framed.h} 縮下來，省 ${(100 - fs.statSync(dest).size / fs.statSync(printCopy).size * 100).toFixed(0)}% 頻寬）` : ''}
✓ 付印稿：${printCopy}　${framed.w}×${framed.h}（**原解析度**，內容與登錄目標相同）
${before ? '' : '（原稿有角偏掉，收邊確實有必要。）'}
接下來：
  1. 重新整理 /AR —— 「目標圖尚未安裝」的橫幅會消失，就可以掃了
  2. 到 /ar/card/${card.slug} 開「熱區校對（顯示座標）」重量 ${card.hotspots.length} 個 rect
     ⚠️ 加收邊後版面內縮約 ${shrink}%，原本的熱區座標會整體偏掉，一定要重量
  3. 付印時用上面那張「-付印.png」，不要用原稿`)
