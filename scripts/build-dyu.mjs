// 大葉大學生態區：從原站抓每種植物的照片與介紹，存進本站
//   用法：node scripts/build-dyu.mjs
//
// ⚠️ 照片與介紹文字的版權屬大葉大學。2026-11-22 使用者表示大葉已同意授權使用；
//    頁面上必須保留出處，並連回原站那一頁。
// ⚠️ 不可在前端直接引用原站網址：CSP 是 img-src 'self'。
//
// 原站的介紹文字不是 HTML 文字，而是一張張文字圖，內容寫在 <img alt>：
//   「英文名稱：…」「學名：…」…「形態特徵：…」，每段以「欄位：」開頭。
//   ⚠️ 有 28 頁的某一欄被拆成兩張圖（例：福木的用途「…為優良」＋「的園景樹及防風、防音樹種。」），
//      後半段沒有欄位名、而且在頁面上的位置不一定緊接著前半段。
//      規則：沒有欄位名的片段，接到「最近一個還沒收尾（不以句號類結尾）」的欄位。
//      2026-11-22 逐筆人工核對過 28 個接合點全部正確。原站有錯字照抄，不改。
//
// 產出（全部自動產生，不要手改）：
//   public/dyu/<slug>.jpg       160×160 縮圖（名錄格子）
//   public/dyu/<slug>-<i>.jpg   長邊 800 的照片（詳情頁相簿，i 從 0 起，最多 4 張）
//   src/data/dyuPhotos.js       有縮圖的 slug 清單（名錄用，很小，進主 bundle）
//   src/data/dyuDetails.js      每種植物的介紹（詳情頁用 import() 懶載入；伺服器 SEO 也讀它）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas, loadImage } from 'canvas'
import { DYU_GROUPS, DYU_BASE } from '../src/data/dyuPlants.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public/dyu')
fs.mkdirSync(OUT, { recursive: true })
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f))   // 舊檔清掉（原站換照片時不留孤兒）

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; chengqi-build/1.0)' }
const MAX_PHOTOS = 4
const LABELS = { '英文名稱': 'en', '學名': 'sci', '科名': 'family', '別名': 'alias', '原產地': 'origin',
  '用途': 'use', '生長習性': 'habit', '形態特徵': 'form' }

async function grab(url) {
  const r = await fetch(url, { headers: UA })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return Buffer.from(await r.arrayBuffer())
}
const jpeg = c => c.toBuffer('image/jpeg', { quality: 0.8 })
function square(img, s) {
  const c = createCanvas(s, s), ctx = c.getContext('2d')
  const k = Math.max(s / img.width, s / img.height)
  ctx.drawImage(img, (s - img.width * k) / 2, (s - img.height * k) / 2, img.width * k, img.height * k)
  return jpeg(c)
}
function fit(img, long) {
  const k = Math.min(1, long / Math.max(img.width, img.height))   // 不放大
  const w = Math.round(img.width * k), h = Math.round(img.height * k)
  const c = createCanvas(w, h); c.getContext('2d').drawImage(img, 0, 0, w, h)
  return { buf: jpeg(c), w, h }
}
const dec = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
// 原站段落之間是「。 」這種空白；轉成換行，畫面才分得出段
const tidy = s => s.replace(/[ 　]*\n[ 　]*/g, '\n').replace(/([。！？])[ 　]+/g, '$1\n')
  .replace(/[ 　]{2,}/g, ' ').trim()

function parse(html) {
  const alts = [...html.matchAll(/<img[^>]*\salt="([^"]*)"/g)].map(m => dec(m[1]).trim()).filter(Boolean)
  alts.shift()   // 第一個是植物名稱的標題圖
  const f = {}, order = []
  for (const a of alts) {
    if (a.includes('節能減碳')) continue   // 頁尾標語
    const m = a.match(/^([^：:]{2,5})[：:]\s*([\s\S]*)$/)
    if (m && LABELS[m[1].trim()]) { const k = LABELS[m[1].trim()]; f[k] = m[2].trim(); order.push(k); continue }
    const open = [...order].reverse().find(k => !/[。！？」）)]$/.test(f[k]))
    if (!open) throw new Error(`接不上的片段：${a.slice(0, 20)}`)
    f[open] += a
  }
  const miss = Object.values(LABELS).filter(k => !f[k])
  if (miss.length) throw new Error(`缺欄位：${miss.join(',')}`)
  for (const k of Object.keys(f)) f[k] = tidy(f[k])
  return f
}

const details = {}, thumbs = [], fails = []
for (const g of DYU_GROUPS) {
  for (const p of g.items) {
    try {
      const html = (await grab(p.url)).toString('utf8')
      const info = parse(html)
      const srcs = [...new Set([...html.matchAll(/src="(images\/[^"]+\.jpe?g)"/gi)].map(m => m[1]))].slice(0, MAX_PHOTOS)
      const photos = []
      // ⚠️ 原站有幾張照片檔名是中文（含空白），伺服器回 404（火焰木、紅粉撲花各一張）。
      //    單張失敗就略過那一張，不可讓整種植物跟著失敗。
      // ⚠️ 原站照片本身就很小（長邊約 160–400px，沒有更大的原檔）：fit() 不放大，
      //    詳情頁以接近原尺寸顯示，硬拉滿版會糊。
      for (const s of srcs) {
        let img
        try { img = await loadImage(await grab(DYU_BASE + s)) } catch { continue }
        const i = photos.length
        if (i === 0) { fs.writeFileSync(path.join(OUT, `${p.slug}.jpg`), square(img, 160)); thumbs.push(p.slug) }
        const { buf, w, h } = fit(img, 800)
        fs.writeFileSync(path.join(OUT, `${p.slug}-${i}.jpg`), buf)
        photos.push([w, h])
      }
      details[p.slug] = { ...info, photos }
      process.stdout.write('.')
    } catch (e) {
      fails.push(`${p.name}（${p.slug}）：${e.message}`)
      process.stdout.write('x')
    }
  }
}
console.log(`\n完成 ${Object.keys(details).length} 種，失敗 ${fails.length}`)
fails.forEach(m => console.log('  ', m))

fs.writeFileSync(path.join(ROOT, 'src/data/dyuPhotos.js'),
  `// 自動產生：node scripts/build-dyu.mjs（不要手改）\n` +
  `// 有縮圖的植物 slug；沒列在這裡的仍顯示字形磚。\n` +
  `export const DYU_PHOTOS = new Set(${JSON.stringify(thumbs.sort())})\n`)
fs.writeFileSync(path.join(ROOT, 'src/data/dyuDetails.js'),
  `// 自動產生：node scripts/build-dyu.mjs（不要手改）\n` +
  `// 內容與照片：大葉大學校園植物圖鑑 ${DYU_BASE}（經授權使用）\n` +
  `// 欄位：en 英文名稱／sci 學名／family 科名／alias 別名／origin 原產地／use 用途／habit 生長習性／form 形態特徵\n` +
  `//       photos：[[寬, 高], …]，對應 public/dyu/<slug>-<i>.jpg\n` +
  `export const DYU_DETAILS = ${JSON.stringify(details, null, 1)}\n`)
if (fails.length) process.exit(1)
