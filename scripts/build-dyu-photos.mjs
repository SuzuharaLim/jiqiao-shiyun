// 大葉大學生態區：把原站每種植物的主照片抓下來、縮圖存到 public/dyu/
//   用法：node scripts/build-dyu-photos.mjs
//
// ⚠️ 照片版權屬大葉大學，2026-11-22 使用者表示大葉已同意授權使用；
//    頁面底部必須保留「照片：大葉大學校園植物圖鑑」的出處。
// ⚠️ 不可在前端直接引用原站網址：CSP 是 img-src 'self'，而且別人的主機不該替我們扛流量。
// 產出：
//   public/dyu/<slug>.jpg      160×160 正方形（名錄格子用，顯示 36～48px）
//   public/dyu/<slug>-l.jpg    寬 720 的 3:2（精選標本卡用，只做 FEATURED 那幾種）
//   src/data/dyuPhotos.js      有照片的 slug 清單（自動產生，不要手改）
// 主照片＝頁面上第一張 images/*.jpg（實測原站版型固定如此；u*.png 是文字圖、logo.png 是校徽）。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas, loadImage } from 'canvas'
import { DYU_GROUPS, DYU_FEATURED, DYU_BASE } from '../src/data/dyuPlants.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public/dyu')
fs.mkdirSync(OUT, { recursive: true })

const slugOf = url => url.slice(DYU_BASE.length).replace(/\.html$/, '')
const featured = new Set(DYU_FEATURED.map(f => slugOf(f.url)))
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; chengqi-build/1.0)' }

async function grab(url) {
  const r = await fetch(url, { headers: UA })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return Buffer.from(await r.arrayBuffer())
}

function cover(img, w, h) {
  const c = createCanvas(w, h), ctx = c.getContext('2d')
  const s = Math.max(w / img.width, h / img.height)
  const dw = img.width * s, dh = img.height * s
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
  return c.toBuffer('image/jpeg', { quality: 0.82 })
}

const ok = [], miss = []
for (const g of DYU_GROUPS) {
  for (const p of g.items) {
    const slug = slugOf(p.url)
    try {
      const html = (await grab(p.url)).toString('utf8')
      const m = html.match(/src="(images\/[^"]+\.jpe?g)"/i)
      if (!m) throw new Error('頁面上找不到 jpg')
      const img = await loadImage(await grab(DYU_BASE + m[1]))
      fs.writeFileSync(path.join(OUT, `${slug}.jpg`), cover(img, 160, 160))
      if (featured.has(slug)) fs.writeFileSync(path.join(OUT, `${slug}-l.jpg`), cover(img, 720, 480))
      ok.push(slug)
      process.stdout.write('.')
    } catch (e) {
      miss.push(`${p.name}（${slug}）：${e.message}`)
      process.stdout.write('x')
    }
  }
}
console.log(`\n完成 ${ok.length} 張，缺 ${miss.length} 張`)
miss.forEach(m => console.log('  缺', m))

fs.writeFileSync(path.join(ROOT, 'src/data/dyuPhotos.js'),
  `// 自動產生：node scripts/build-dyu-photos.mjs（不要手改）\n` +
  `// 有照片的植物 slug；沒列在這裡的仍顯示字形磚。\n` +
  `export const DYU_PHOTOS = new Set(${JSON.stringify(ok.sort())})\n`)
