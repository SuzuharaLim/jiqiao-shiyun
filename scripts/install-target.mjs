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

const dest = path.join(ROOT, 'public', card.target)
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.writeFileSync(dest, encodePng(framed.w, framed.h, framed.rgba))
// 同時留一份在設計稿旁邊當付印稿——付印與登錄必須是同一版
const printCopy = path.join(path.dirname(inFile), path.basename(inFile, '.png') + '-付印.png')
fs.copyFileSync(dest, printCopy)

const shrink = ((framed.quiet + framed.frame) / src.w * 100).toFixed(1)
console.log(`
✓ 已安裝：public${card.target}　${(fs.statSync(dest).size / 1024).toFixed(0)} KB
✓ 付印稿：${printCopy}（與登錄目標同一版）
${before ? '' : '（原稿有角偏掉，收邊確實有必要。）'}
接下來：
  1. 重新整理 /AR —— 「目標圖尚未安裝」的橫幅會消失，就可以掃了
  2. 到 /ar/card/${card.slug} 開「熱區校對（顯示座標）」重量 ${card.hotspots.length} 個 rect
     ⚠️ 加收邊後版面內縮約 ${shrink}%，原本的熱區座標會整體偏掉，一定要重量
  3. 付印時用上面那張「-付印.png」，不要用原稿`)
