// ============================================================================
// 把卡面圖編譯成 MindAR 的 .mind 目標檔
//
// 用法：npm run card:mind -- 稿.png [slug]
//
// ★ 為什麼要有這支：`.mind` 是 MindAR 的**預編譯特徵資料**（多尺度特徵點＋
//   匹配用的索引結構），不是圖片。官方提供的是網頁版編譯器，但那樣做有兩個問題：
//     ① 手動上傳／下載，沒有紀錄，換稿時很容易忘記重編
//     ② 編出來的檔案與「實際付印的那一版」沒有任何綁定關係
//   所以做成腳本：與 `card:install` 同一條路，**吃同一張加了收邊的圖**，
//   輸出到 `public/ar/targets/<slug>.mind`。
//
// ⚠️ 一定要用**加了收邊之後**那一版（`card:install` 產出的付印稿）。
//    MindAR 不需要邊框來偵測（它是特徵點比對），但實體卡就是那一版，
//    而 .mind 必須與實體卡一致——用原稿編譯、印收邊版，特徵點位置會整體偏移。
//
// ⚠️ 編譯很慢（多尺度特徵擷取，實測 1234×900 約需十幾秒），這是正常的。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadImage } from 'canvas'
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js'
import { OFFICIAL_CARDS } from '../src/data/arCards.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const [inFile, slugArg] = process.argv.slice(2)
if (!inFile) {
  console.log(`用法：npm run card:mind -- <卡面圖.png|jpg> [slug]

把卡面圖編譯成 MindAR 的 .mind 目標檔，輸出到 public/ar/targets/<slug>.mind

目前的官方卡：
${OFFICIAL_CARDS.map(c => `  ${c.slug}\t${c.title}`).join('\n')}

⚠️ 要用**實際付印的那一版**（card:install 產出的「-付印.png」）。
   用原稿編譯、印收邊版的話，特徵點位置會整體偏移。`)
  process.exit(1)
}

const card = slugArg
  ? OFFICIAL_CARDS.find(c => c.slug === slugArg)
  : (OFFICIAL_CARDS.length === 1 ? OFFICIAL_CARDS[0] : null)
if (!card) {
  console.error(slugArg
    ? `✗ 找不到 slug「${slugArg}」。可用：${OFFICIAL_CARDS.map(c => c.slug).join('、')}`
    : `✗ 有 ${OFFICIAL_CARDS.length} 張官方卡，請指定 slug`)
  process.exit(1)
}
if (!fs.existsSync(inFile)) { console.error(`✗ 找不到檔案：${inFile}`); process.exit(1) }

// ⚠️ **必須先讀成 Buffer 再交給 loadImage**，不可傳路徑字串：
//    node-canvas 的原生 fopen 在 Windows 上用 ANSI codepage，路徑含中文時直接
//    `EILSEQ, Illegal byte sequence`。而這個專案的檔名本來就會有中文
//    （「2027小寒-原稿-付印.png」）。Node 自己讀檔沒有這個問題。
const img = await loadImage(fs.readFileSync(path.resolve(inFile)))
console.log(`讀入 ${inFile}　${img.width}×${img.height}　長寬比 ${(img.width / img.height).toFixed(4)}`)

const compiler = new OfflineCompiler()
let lastShown = -1
const t0 = Date.now()
await compiler.compileImageTargets([img], (p) => {
  const step = Math.floor(p / 10) * 10
  if (step !== lastShown) { lastShown = step; process.stdout.write(`  編譯中 ${step}%\r`) }
})
const buf = compiler.exportData()
const secs = ((Date.now() - t0) / 1000).toFixed(1)

// 輸出檔名與 arCards.js 的 slug 綁定（不讓人手打，理由同 card:install）
const dest = path.join(ROOT, 'public', 'ar', 'targets', `${card.slug}.mind`)
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.writeFileSync(dest, buf)

// 順手把編譯結果的關鍵數字印出來——特徵點太少就是「這張圖不適合當目標」，
// ⚠️ 而那個問題在現場的症狀是「偶爾追得到、偶爾追不到」，非常難查。
// ⚠️ 欄位名是 `maximaPoints`／`minimaPoints`，**不是** `points`。
//    我第一版猜成 `m.points` → 算出 0 個特徵點 → 印出「特徵點偏少」的警告，
//    而實際上有 5000 多個。**一個會誤報的警告比沒有警告更糟**
//    （會讓人跑去重畫卡面，或反過來以為工具壞了而忽略所有警告）。
//    `trackingData[].points` 才是 `points`——兩個結構不同，這正是猜錯的原因。
const data = compiler.data?.[0]
const md = data?.matchingData ?? []
const kp = md.reduce((s, m) => s + (m.maximaPoints?.length || 0) + (m.minimaPoints?.length || 0), 0)
const scales = md.length
const trk = (data?.trackingData ?? []).reduce((s, t) => s + (t.points?.length || 0), 0)

console.log(`
✓ 已輸出：public/ar/targets/${card.slug}.mind　${(fs.statSync(dest).size / 1024).toFixed(0)} KB（耗時 ${secs}s）
  比對用尺度層數：${scales}（偵測用）
  比對用特徵點總數：${kp}
  追蹤用特徵點總數：${trk}（鎖定之後逐幀跟隨用的，與上面那組不同）`)

if (kp < 400) {
  console.log(`
⚠️ 特徵點偏少（${kp}）。這張圖的紋理可能不足——大片留白、漸層、重複紋樣都會讓
   特徵點變少，症狀是「偶爾追得到、偶爾追不到」而不是完全失敗（最難查的那種）。
   建議：卡面多一些高對比的文字／線條／不對稱圖形。`)
}
console.log(`
接下來：
  1. 確認 arCards.js 的 mindTarget 指向 /ar/targets/${card.slug}.mind
  2. 重新整理 /AR
  3. ⚠️ 拿去印的必須是**編譯時用的同一張圖**`)
