// ============================================================================
// 圖卡收邊工具 —— 把設計稿加上「白留白邊 ＋ 深色框」，並**自己驗證**追得到
//
//   node scripts/frame-card.mjs <輸入.png> [輸出.png]
//
// 為什麼要有這支：收邊是這條 AR 追蹤路線能不能用的前提（實測見下），而比例
// 做錯就白印一輪。手工加框每次都要重新量，而且「加了但比例不對」與「沒加」
// 在畫面上看不出差別——只有拿去掃才會發現追不到。
//
// ⚠️ 順序不可顛倒：**先加收邊、再匯出目標圖**。拿加收邊之前的稿去登錄、印
//    加收邊之後的卡，相機看得到卡片、四角也抓得準，但一律判定「不是登錄過的
//    目標」（實測 0/2）。這支工具因此把兩件事綁在一起：輸出的那張圖既是要
//    付印的稿，也是要登錄的目標圖。
//
// 為什麼自己寫 PNG 編解碼而不裝套件：專案的原則是零第三方相依，而 PNG 只需要
// node 內建的 zlib（IHDR 解析 ＋ IDAT inflate ＋ 反濾波）。JPEG 才需要整套
// 解碼器——所以這支只吃 PNG，設計稿請匯出成 PNG。
// ============================================================================
import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'
import { detectQuad } from '../src/lib/quadDetect.js'
import { toGray } from '../src/lib/scanner.js'

// ── PNG 解碼（8-bit truecolor / truecolor+alpha，含 palette 以外的常見情形）──
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('不是 PNG 檔（設計稿請匯出成 PNG）')
  let p = 8
  let w = 0, h = 0, depth = 0, colorType = 0, interlace = 0
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString('ascii', p + 4, p + 8)
    const data = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4)
      depth = data[8]; colorType = data[9]; interlace = data[12]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    p += 12 + len
  }
  if (depth !== 8) throw new Error(`只支援 8-bit 色深（這張是 ${depth}-bit）`)
  if (interlace) throw new Error('不支援 interlaced PNG，請關掉「交錯」再匯出')
  const ch = colorType === 2 ? 3 : colorType === 6 ? 4 : 0
  if (!ch) throw new Error(`只支援 RGB / RGBA（colorType ${colorType}）`)

  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(h * stride)
  // ⚠️ 反濾波要「就地」逐列做，而且 Paeth/Average 都要參考**已反濾波**的上一列。
  //    拿還沒反濾波的資料當參考是最常見的寫法錯誤，症狀是圖片從某一列開始
  //    整片糊掉或出現斜條紋。
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)]
    const src = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    const cur = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0
      const b = prev ? prev[i] : 0
      const c = (prev && i >= ch) ? prev[i - ch] : 0
      let v = src[i]
      if (ft === 1) v += a
      else if (ft === 2) v += b
      else if (ft === 3) v += (a + b) >> 1
      else if (ft === 4) {
        const pp = a + b - c
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c)
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
      } else if (ft !== 0) throw new Error(`未知的濾波型別 ${ft}`)
      cur[i] = v & 0xff
    }
  }
  // 統一成 RGBA
  const rgba = new Uint8ClampedArray(w * h * 4)
  for (let i = 0, n = w * h; i < n; i++) {
    rgba[i * 4] = out[i * ch]
    rgba[i * 4 + 1] = out[i * ch + 1]
    rgba[i * 4 + 2] = out[i * ch + 2]
    rgba[i * 4 + 3] = ch === 4 ? out[i * ch + 3] : 255
  }
  return { w, h, rgba }
}

// ── PNG 編碼（無濾波，靠 zlib 壓）──
const CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c }
  return (b) => { let c = ~0; for (const v of b) c = t[(c ^ v) & 255] ^ (c >>> 8); return (~c) >>> 0 }
})()
export function encodePng(w, h, rgba) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(td))
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2   // 8-bit RGB
  const raw = Buffer.alloc(h * (1 + w * 3))
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = y * (1 + w * 3) + 1 + x * 3
      raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2]
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── 加收邊 ───────────────────────────────────────────────────────────────
// 規範（實測得出，見 public/ar/targets/README.md 的表）：
//   白留白邊 = 短邊 2.5%（最外，負責深色／中灰／木紋桌面的對比）
//   深色實框 = 短邊 3.0%（在白邊內側，負責淺色桌面的對比）
// ⚠️ 版面要**內縮**進去，不是把畫布放大——放大的話實體卡的成品尺寸會變，
//    而 148×105 是明信片的規格。
export const QUIET = 0.025, FRAME = 0.030
const FRAME_RGB = [30, 30, 30]

export function addSpec(src) {
  const { w, h } = src
  const short = Math.min(w, h)
  const q = Math.max(2, Math.round(short * QUIET))
  const f = Math.max(2, Math.round(short * FRAME))
  const inset = q + f
  const iw = w - 2 * inset, ih = h - 2 * inset
  if (iw < 40 || ih < 40) throw new Error('圖太小，加了收邊之後版面不剩什麼')

  const out = new Uint8ClampedArray(w * h * 4).fill(255)
  // 版面縮到內框（最近鄰取樣就夠——這是印刷稿，使用者本來就會用高解析度來源）
  for (let y = 0; y < ih; y++) {
    const sy = Math.min(h - 1, Math.round(y * h / ih))
    for (let x = 0; x < iw; x++) {
      const sx = Math.min(w - 1, Math.round(x * w / iw))
      const s = (sy * w + sx) * 4, d = ((y + inset) * w + (x + inset)) * 4
      out[d] = src.rgba[s]; out[d + 1] = src.rgba[s + 1]; out[d + 2] = src.rgba[s + 2]; out[d + 3] = 255
    }
  }
  // 深色框（畫在白邊內側）
  const px = (x, y) => ((y * w + x) * 4)
  for (let i = 0; i < f; i++) {
    for (let x = q; x < w - q; x++) {
      for (const y of [q + i, h - 1 - q - i]) {
        const d = px(x, y); out[d] = FRAME_RGB[0]; out[d + 1] = FRAME_RGB[1]; out[d + 2] = FRAME_RGB[2]
      }
    }
    for (let y = q; y < h - q; y++) {
      for (const x of [q + i, w - 1 - q - i]) {
        const d = px(x, y); out[d] = FRAME_RGB[0]; out[d + 1] = FRAME_RGB[1]; out[d + 2] = FRAME_RGB[2]
      }
    }
  }
  return { w, h, rgba: out, quiet: q, frame: f }
}

// ── 驗證：把成品放在四種桌面上，用真的偵測器量逐角誤差 ────────────────────
// ⚠️ 只檢查「偵測得到」是不夠的：滿版出血最危險的失敗是**單角失敗**
//    （某一個角偏掉 24~64px，其他三角完全正常，偵測仍然回報成功）。
// ⚠️ 要 export：install-target.mjs 會重用同一套驗證，
//    兩邊各寫一份遲早會分岔（而分岔的症狀是「工具說過了、現場掃不到」）。
export function verify(card, label) {
  const CW = 260, CH = 195
  const X = 26, Y = 22
  const W = Math.round((CW - 2 * X) * 0.98)
  const H = Math.round(W * card.h / card.w)
  const truth = [[X, Y], [X + W - 1, Y], [X + W - 1, Y + H - 1], [X, Y + H - 1]]
  const rows = []
  for (const [name, desk] of [['深色', 35], ['中灰', 140], ['淺色', 216], ['木紋', 150]]) {
    const g = new Uint8Array(CW * CH).fill(desk)
    for (let y = 0; y < H; y++) {
      const sy = Math.min(card.h - 1, Math.round(y * card.h / H))
      for (let x = 0; x < W; x++) {
        const sx = Math.min(card.w - 1, Math.round(x * card.w / W))
        const s = (sy * card.w + sx) * 4
        // 灰階（與 scanner.js 的 toGray 同一組權重）
        g[(Y + y) * CW + (X + x)] =
          (card.rgba[s] * 0.299 + card.rgba[s + 1] * 0.587 + card.rgba[s + 2] * 0.114) | 0
      }
    }
    const q = detectQuad(g, CW, CH)
    if (!q?.corners) { rows.push({ 桌面: name, 結果: '✗ 偵測不到' }); continue }
    const errs = q.corners.map((p, i) => Math.hypot(p[0] - truth[i][0], p[1] - truth[i][1]))
    rows.push({
      桌面: name,
      最大角誤差: Math.max(...errs).toFixed(1) + 'px',
      逐角: errs.map(e => e.toFixed(1)).join(' / '),
      結果: Math.max(...errs) <= 3 ? '✓' : '✗ 有角偏掉',
    })
  }
  console.log(`\n【${label}】在四種桌面上的逐角誤差（上限 3px）`)
  for (const r of rows) {
    console.log('  ' + r.桌面.padEnd(4)
      + (r.最大角誤差 ? ` 最大 ${r.最大角誤差.padStart(7)}   逐角 ${r.逐角}   ${r.結果}` : `  ${r.結果}`))
  }
  return rows.every(r => r.結果 === '✓')
}

// ── main ────────────────────────────────────────────────────────────────
// ⚠️ 被 import 時不可執行（check-ar.mjs 會 import 上面那幾個函式來做回歸測試）。
// path.basename 一次處理掉兩種路徑分隔符號（Windows 是反斜線）
const isCli = path.basename(process.argv[1] || '') === 'frame-card.mjs'
if (!isCli) { /* 被 import：只匯出函式 */ } else {
const [inFile, outFileArg] = process.argv.slice(2)
if (!inFile) {
  console.log(`用法：node scripts/frame-card.mjs <輸入.png> [輸出.png]

把設計稿加上「白留白邊（短邊 ${(QUIET * 100).toFixed(1)}%）＋ 深色實框（短邊 ${(FRAME * 100).toFixed(1)}%）」，
並用真的偵測器在四種桌面亮度上驗證逐角誤差。

⚠️ 輸出的那張圖既是要付印的稿，也是要登錄的目標圖——兩者必須是同一版，
   否則相機看得到卡片卻判定「不是登錄過的目標」。`)
  process.exit(1)
}
const outFile = outFileArg
  || path.join(path.dirname(inFile), path.basename(inFile, '.png') + '-framed.png')

const src = decodePng(fs.readFileSync(inFile))
console.log(`讀入 ${inFile}　${src.w}×${src.h}　長寬比 ${(src.w / src.h).toFixed(4)}`)
const before = verify(src, '原稿（滿版出血）')

const framed = addSpec(src)
console.log(`\n加收邊：白邊 ${framed.quiet}px ＋ 深色框 ${framed.frame}px（版面內縮 ${framed.quiet + framed.frame}px）`)
const after = verify(framed, '加收邊之後')

fs.writeFileSync(outFile, encodePng(framed.w, framed.h, framed.rgba))
console.log(`\n寫出 ${outFile}　${(fs.statSync(outFile).size / 1024).toFixed(0)} KB`)

if (!after) {
  console.error(`
✗ 加了收邊仍有角偏掉。可能原因：
  · 版面本身的四個角落有大面積、與白邊同色的區塊
  · 圖片解析度太低，白邊與框只剩幾個像素
  請把上面的逐角數字一起回報。`)
  process.exit(1)
}
console.log(`
✓ 四種桌面都在 3px 內。${before ? '' : '（原稿有角偏掉，收邊確實有必要。）'}

接下來：
  1. 拿 ${path.basename(outFile)} 去付印
  2. 同一張放到 public/ar/targets/ 當登錄目標（或在 /AR 用「指定本機圖片」先試）
  3. 到 /ar/card/2027-xiaohan 開「熱區校對」重量六個 rect
     ⚠️ 加了收邊版面會內縮 ${((framed.quiet + framed.frame) / src.w * 100).toFixed(1)}%，熱區座標一定要重量`)
}
