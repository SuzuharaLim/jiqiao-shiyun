// ============================================================================
// 把 24 張節氣卡面編成**一個** MindAR 目標檔，並產生 src/data/arTargets.js
//
// 用法：npm run card:all -- <卡面圖資料夾>
//
//   資料夾裡放 24 張圖，檔名含節氣名即可（例如 `term-立春.png`、`小寒.jpg`）。
//   從承氣名片 PDF 取圖（除了前兩頁的單數頁＝卡面）：
//     py -c "import fitz,re,sys;d=fitz.open(sys.argv[1])
//     [d[i].get_pixmap(dpi=288).save(sys.argv[2]+'/term-'+re.sub(r'\s','',d[i].get_text())[:2]+'.png') for i in range(2,len(d),2)]" 名片.pdf 輸出資料夾
//
// ★★★ 為什麼是一個檔不是 24 個：MindAR 的 Controller 一次只吃一個 `.mind`，
//   多張卡要一起辨識就得編在同一個檔裡；比對成功時回傳的 `targetIndex`
//   就是這裡的順序（= arTargets.js 的 `index`）。
//
// ★★★ 輸出網址一律帶 `?v=<內容雜湊>`：express.static 對 dist 下的檔案一律
//   `maxAge: '1y'`，檔名不帶雜湊的話，換稿後使用者**一年內都拿舊卡面**
//   （/ar/cats 已經實際踩過）。
//
// ⚠️ 卡面圖存成 jpg：1008×576 的插畫 png 每張約 1 MB，jpg q88 約 1/6。
// ⚠️ `.mind` 的大小幾乎與卡片張數成正比（每張約 550 KB），所以編譯寬度刻意
//    壓在 COMPILE_W。實測目標圖解析度與辨識率無關（CLAUDE.md「目標圖尺寸
//    與辨識率沒有關係」那一條），壓小只省下載量。另產一份 `.mind.gz`，
//    伺服器對支援 gzip 的瀏覽器直接送它（server/index.js）。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { loadImage, createCanvas } from 'canvas'
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js'
import { AR_CATS } from '../src/data/arCats.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public', 'ar', 'targets')
const YEAR = 2027
const COMPILE_W = 640
const POSTER_W = 1008

const dir = process.argv[2]
if (!dir || !fs.existsSync(dir)) {
  console.log('用法：npm run card:all -- <卡面圖資料夾>（檔名含節氣名，共 24 張）')
  process.exit(1)
}

// 卡片順序＝年曆順序：小寒、大寒在前（2027 年 1 月），其後立春…冬至。
// ⚠️ 順序就是 targetIndex，而自我測試固定拿第 0 張（小寒）去比對。
const cats = [...AR_CATS].sort((a, b) => rank(a) - rank(b))
function rank(c) { const n = Number(c.model.cat); return n >= 23 ? n - 24 : n }

const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g)$/i.test(f))
const hash = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10)

const imgs = []
const cards = []
for (const [index, c] of cats.entries()) {
  const f = files.find(n => n.includes(c.term))
  if (!f) { console.error(`✗ 找不到「${c.term}」的卡面圖（資料夾：${dir}）`); process.exit(1) }
  // ⚠️ 先讀成 Buffer：node-canvas 在 Windows 上開不了含中文的路徑（EILSEQ）
  const src = await loadImage(fs.readFileSync(path.join(dir, f)))
  const slug = `${YEAR}-${c.link.props.slug}`

  const pw = Math.min(POSTER_W, src.width), ph = Math.round(pw * src.height / src.width)
  const poster = createCanvas(pw, ph); poster.getContext('2d').drawImage(src, 0, 0, pw, ph)
  const jpg = poster.toBuffer('image/jpeg', { quality: 0.88 })
  fs.writeFileSync(path.join(OUT_DIR, `${slug}.jpg`), jpg)

  const cw = Math.min(COMPILE_W, src.width), ch = Math.round(cw * src.height / src.width)
  const cv = createCanvas(cw, ch); cv.getContext('2d').drawImage(src, 0, 0, cw, ch)
  imgs.push(cv)
  cards.push({ slug, term: c.term, character: c.id, index, image: `/ar/targets/${slug}.jpg?v=${hash(jpg)}`, width: src.width, height: src.height })
  console.log(`  ${String(index).padStart(2)} ${c.term} ← ${f}（${src.width}×${src.height}）`)
}

console.log(`編譯 ${imgs.length} 張目標（寬 ${COMPILE_W}px）…`)
const t0 = Date.now()
const compiler = new OfflineCompiler()
let shown = -1
await compiler.compileImageTargets(imgs, (p) => {
  const s = Math.floor(p / 5) * 5
  if (s !== shown) { shown = s; process.stdout.write(`  編譯中 ${s}%\r`) }
})
const mind = Buffer.from(compiler.exportData())
const mindName = `${YEAR}-cards.mind`
fs.writeFileSync(path.join(OUT_DIR, mindName), mind)
fs.writeFileSync(path.join(OUT_DIR, `${mindName}.gz`), zlib.gzipSync(mind, { level: 9 }))

const kp = compiler.data.map(d => d.matchingData.reduce((s, m) => s + m.maximaPoints.length + m.minimaPoints.length, 0))
const low = kp.map((n, i) => [cards[i].term, n]).filter(([, n]) => n < 400)

const out = `// ============================================================================
// ⚠️ 自動產生，不要手改：npm run card:all -- <卡面圖資料夾>（scripts/compile-cards.mjs）
//
// 24 張節氣卡面共用一個 MindAR 目標檔；\`index\` 就是比對成功時的 targetIndex。
// 網址帶內容雜湊（express.static 對 dist 一律快取一年）。
// ============================================================================

export const AR_MIND = '/ar/targets/${mindName}?v=${hash(mind)}'

export const AR_TARGETS = ${JSON.stringify(cards, null, 2)}
`
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'arTargets.js'), out)

console.log(`
✓ public/ar/targets/${mindName}　${(mind.length / 1024).toFixed(0)} KB（gzip ${(fs.statSync(path.join(OUT_DIR, mindName + '.gz')).size / 1024).toFixed(0)} KB，耗時 ${((Date.now() - t0) / 1000).toFixed(0)}s）
✓ 24 張卡面 jpg、src/data/arTargets.js
  每張比對特徵點：${kp.join(' ')}`)
if (low.length) console.log(`⚠️ 特徵點偏少：${low.map(([t, n]) => `${t} ${n}`).join('、')}`)
