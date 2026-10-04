// ============================================================================
// 桌曆單頁的繪製（純 canvas 2D，零相依）
//
// ★★★ 2D 預覽、3D 模型的貼圖、後台的預覽**全部用這一支畫**。各自用 DOM／CSS 排一份的話，
//   三個地方遲早長得不一樣——客人在 3D 裡看到的，跟我們後台收到的，必須是同一張。
//
// ★ 預覽一律加淡浮水印、用低解析度（呼叫端決定寬度）。這是「不能把設計存回自己電腦」
//   在前台能做到的部分：截圖防不住，但截到的東西拿不去印。真正能印的原圖只在後台。
//
// 頁面比例 4:3（桌曆常見的橫式），所有尺寸都用頁寬的比例算，縮放不會跑版。
// ============================================================================
import { WD_ZH } from '../data/calendarLayout.js'
import { resolveColors } from '../data/calendarRules.js'

export const PAGE_RATIO = 3 / 4          // 高 ÷ 寬
// ⚠️ 字體只用系統字（見 calendarRules.js 的 FONTS）。設計器的文字框覆蓋層（DOM）用同一份字串，
//    畫布上的字與可拖曳的框才對得齊。
export const FONT = {
  serif: '"Noto Serif TC","Source Han Serif TC","Songti TC","PMingLiU",Georgia,serif',
  sans: 'system-ui,-apple-system,"PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif',
  kai: '"Kaiti TC","BiauKai","STKaiti","DFKai-SB","標楷體","Noto Serif TC",serif',
}

// 顏色一律從 resolveColors 拿（配色組合 ＋ 個別覆寫），不在這裡另外推
export const baseHex = (d) => resolveColors(d).base
export const paperHex = (d) => resolveColors(d).paper
const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
// 文字超過寬度就截斷加「…」
function fit(ctx, text, maxW) {
  let t = String(text || '')
  if (ctx.measureText(t).width <= maxW) return t
  while (t.length && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}
// crop：使用者在設計器裡調整的縮放與位置。
//   z ≥ 1：在「剛好填滿」之上再放大幾倍；x、y ∈ [-1, 1]：在可移動範圍內偏左／偏右、偏上／偏下（0＝置中）。
//   ★ 用「可移動範圍的比例」而不是像素：同一份設計在 900px 預覽、1024px 3D 貼圖、
//     後台用原圖重畫印刷檔時，取景都一模一樣。
export function cropRect(iw, ih, w, h, crop = {}) {
  const z = Math.min(4, Math.max(1, Number(crop.z) || 1))
  const s = Math.max(w / iw, h / ih) * z
  const sw = w / s, sh = h / s
  const cx = (iw - sw) / 2 * (1 + Math.min(1, Math.max(-1, Number(crop.x) || 0)))
  const cy = (ih - sh) / 2 * (1 + Math.min(1, Math.max(-1, Number(crop.y) || 0)))
  return { sx: cx, sy: cy, sw, sh }
}
function drawCover(ctx, img, x, y, w, h, crop) {
  const r = cropRect(img.width, img.height, w, h, crop)
  ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, x, y, w, h)
}

/**
 * 頁面上各區塊的位置（以頁寬／頁高的比例表示）。設計器拿來做「直接點頁面編輯」：
 * 點照片區＝放照片／調整照片，點標題區＝改文字。
 * ⚠️ 必須跟 drawPage 實際畫的位置一致——改 drawPage 的排版要一起改這裡。
 */
export function pageRegions(kind) {
  const H = 100 * PAGE_RATIO                          // 以 u（頁寬 1%）為單位的頁高
  // 封面：大照片＋下方書名；背面：整面照片（留 4u 白邊，跟正面的邊距一致）
  if (kind === 'cover') return {
    photo: { x: 0.04, y: 4 / H, w: 0.92, h: 52 / H },
    header: { x: 0.04, y: 58 / H, w: 0.92, h: 13 / H },
  }
  if (kind === 'back') return { photo: { x: 0.04, y: 4 / H, w: 0.92, h: (H - 8) / H } }
  const bandH = (kind === 'week' ? 0.34 : 0.36) * H
  return {
    photo: { x: 0.04, y: 4 / H, w: 0.92, h: bandH / H },
    header: { x: 0.04, y: (4 + bandH + 1) / H, w: 0.92, h: 7.4 / H },
  }
}

/**
 * 畫一頁。
 * @param canvas   目標 canvas（寬度由呼叫端設定；高度在這裡依比例設）
 * @param page     buildPages() 的其中一頁
 * @param over     使用者對這一頁的自訂 { title, text, img }
 * @param design   整份設計（樣式）
 * @param image    已載入的 HTMLImageElement，沒有就傳 null
 * @param opts     { watermark: true, yiji: { 'y-m-d': '宜…' } }
 */
export function drawPage(canvas, { page, over = {}, design, image = null, opts = {} }) {
  const W = canvas.width
  const H = Math.round(W * PAGE_RATIO)
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const u = W / 100                                   // 1u ＝ 頁寬 1%
  const font = FONT[design.style.font] || FONT.serif
  const C = resolveColors(design)
  const paper = C.paper, base = C.base, accent = C.accent, ink = C.ink
  const muted = tint(C.ink, 0.55)                    // 次要文字：日期色淡一階，跟著配色走
  const marks = design.style.marks || {}

  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)

  // ── 上方圖片區 ──
  const pad = 4 * u
  const bandH = page.kind === 'week' ? H * 0.34 : H * 0.36
  const bx = pad, by = pad, bw = W - pad * 2, bh = bandH
  ctx.save()
  roundRect(ctx, bx, by, bw, bh, 1.4 * u)
  ctx.clip()
  if (image) {
    drawCover(ctx, image, bx, by, bw, bh, over.img?.crop)
  } else {
    // 沒有照片：用節氣／月份字當主視覺（跟文章卡、徽章字形磚同一套語彙）
    ctx.fillStyle = tint(base, 0.16)
    ctx.fillRect(bx, by, bw, bh)
    ctx.fillStyle = tint(base, 0.85)
    ctx.font = `800 ${bh * 0.62}px ${FONT.serif}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    ctx.globalAlpha = 0.22
    ctx.fillText(over.glyph ?? (page.term || page.label), bx + bw - 3 * u, by + bh * 0.55)
    ctx.globalAlpha = 1
  }
  ctx.restore()
  // （舊版的「一句話」固定印在照片左下；現在由 normalizeDesign 轉成自由文字框，在最後一起畫）

  // ── 標題列 ──
  const hy = by + bh + 6.6 * u
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = accent
  ctx.font = `800 ${5.2 * u}px ${font}`
  // 預設文字都可以被這一頁覆寫（undefined＝預設、''＝隱藏），見 calendarRules.js 的 DEFAULT_TEXT_FIELDS
  const label = over.label ?? page.label
  const en = over.en ?? page.en
  ctx.fillText(label, pad, hy)
  let lx = pad + (label ? ctx.measureText(label).width + 2.4 * u : 0)
  if (en) {
    ctx.font = `600 ${1.8 * u}px ${FONT.sans}`
    ctx.fillStyle = muted
    ctx.fillText(en, lx, hy - 0.4 * u)
    lx += ctx.measureText(en).width + 2.4 * u
  }
  if (over.title) {
    ctx.font = `700 ${2.6 * u}px ${font}`
    ctx.fillStyle = ink
    ctx.fillText(fit(ctx, over.title, W - pad - lx - 22 * u), lx, hy - 0.3 * u)
  }
  ctx.textAlign = 'right'
  ctx.font = `600 ${1.9 * u}px ${FONT.sans}`
  ctx.fillStyle = muted
  ctx.fillText(over.sub ?? page.sub, W - pad, hy - 0.4 * u)

  // ── 日期格 ──
  const gy = hy + 2.6 * u
  const gh = H - gy - pad
  if (page.kind === 'quarter') {
    const colW = (W - pad * 2 - 4 * u) / 3
    page.months.forEach((mo, k) => drawGrid(ctx, {
      x: pad + k * (colW + 2 * u), y: gy, w: colW, h: gh, weeks: mo.weeks, title: mo.label,
      u, font, C, muted, marks, compact: true, design, opts,
    }))
  } else {
    drawGrid(ctx, { x: pad, y: gy, w: W - pad * 2, h: gh, weeks: page.weeks, u, font, C, muted, marks,
      tall: page.kind === 'week', design, opts })
  }

  // ── 自由文字框：「每一頁都放」的先畫，這一頁自己的疊在上面 ──
  for (const t of [...(design.texts || []), ...(over.texts || [])]) drawTextLayer(ctx, t, W, H, u, C)

  if (opts.watermark !== false) watermark(ctx, W, H, u)
  return canvas
}

/**
 * 畫封面或背面（2026-10-04）。版面由 pageRegions(kind) 決定——設計器的點擊熱區用同一份。
 * @param kind   'cover' | 'back'
 * @param title  封面書名（沒填就用桌曆名稱）
 * @param sub    封面副標（年份與頁數範圍）
 * @param glyph  封面沒照片時的主視覺大字（年份）
 */
export function drawSide(canvas, { kind, over = {}, design, image = null, title = '', sub = '', glyph = '', opts = {} }) {
  const W = canvas.width
  const H = Math.round(W * PAGE_RATIO)
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const u = W / 100
  const font = FONT[design.style.font] || FONT.serif
  const C = resolveColors(design)
  ctx.fillStyle = C.paper
  ctx.fillRect(0, 0, W, H)
  const R = pageRegions(kind)
  const px = R.photo.x * W, py = R.photo.y * H, pw = R.photo.w * W, ph = R.photo.h * H
  if (image || kind === 'cover') {
    ctx.save()
    roundRect(ctx, px, py, pw, ph, 1.4 * u)
    ctx.clip()
    if (image) drawCover(ctx, image, px, py, pw, ph, over.img?.crop)
    else {
      ctx.fillStyle = tint(C.base, 0.16)
      ctx.fillRect(px, py, pw, ph)
      ctx.fillStyle = tint(C.base, 0.85)
      ctx.globalAlpha = 0.22
      ctx.font = `800 ${ph * 0.5}px ${FONT.serif}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(over.glyph ?? glyph, px + pw / 2, py + ph * 0.54)
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }
  if (kind === 'cover') {
    const hy = R.header.y * H
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = C.accent
    ctx.font = `800 ${6.4 * u}px ${font}`
    ctx.fillText(fit(ctx, title, W - 8 * u), 4 * u, hy + 7 * u)
    ctx.fillStyle = tint(C.ink, 0.55)
    ctx.font = `600 ${2 * u}px ${FONT.sans}`
    ctx.fillText(fit(ctx, over.sub ?? sub, W - 8 * u), 4 * u, hy + 11.2 * u)
  }
  for (const t of over.texts || []) drawTextLayer(ctx, t, W, H, u, C)
  if (opts.watermark !== false) watermark(ctx, W, H, u)
  return canvas
}

/**
 * 文字框的量測（畫布與設計器的拖曳框共用，框才會剛好包住字）。
 * 回傳以畫布像素為單位的 { lines, fontSize, lineH, w, h, padX, padY }。
 */
export function measureTextLayer(ctx, t, u) {
  const fontSize = t.size * u
  ctx.font = `${t.bold ? 700 : 500} ${fontSize}px ${FONT[t.font] || FONT.serif}`
  const lines = String(t.text).split('\n')
  const lineH = fontSize * 1.28
  const w = Math.max(...lines.map(l => ctx.measureText(l).width), fontSize)
  const pad = t.bg && t.bg !== 'none'
  return { lines, fontSize, lineH, w, h: lines.length * lineH, padX: pad ? fontSize * 0.55 : 0, padY: pad ? fontSize * 0.32 : 0 }
}
function drawTextLayer(ctx, t, W, H, u, C) {
  if (!String(t.text || '').trim()) return            // 空的文字框（正在重打）：不畫，連底色也不畫
  const m = measureTextLayer(ctx, t, u)
  const cx = t.x * W, cy = t.y * H
  const left = cx - m.w / 2, top = cy - m.h / 2
  if (t.bg && t.bg !== 'none') {
    const bgHex = t.bg === 'ink' ? C.ink : t.bg === 'accent' ? C.accent : C.paper
    ctx.fillStyle = tint(bgHex, t.bg === 'paper' ? 0.88 : 0.92)
    roundRect(ctx, left - m.padX, top - m.padY, m.w + m.padX * 2, m.h + m.padY * 2, Math.min(m.fontSize * 0.5, 1.2 * u))
    ctx.fill()
  }
  ctx.fillStyle = t.color
  ctx.textBaseline = 'middle'
  ctx.textAlign = t.align
  const ax = t.align === 'left' ? left : t.align === 'right' ? left + m.w : cx
  m.lines.forEach((l, i) => ctx.fillText(l, ax, top + m.lineH * (i + 0.5)))
  ctx.textBaseline = 'alphabetic'
}

function drawGrid(ctx, { x, y, w, h, weeks, title, u, font, C, muted, marks, compact, tall, design, opts }) {
  const accent = C.accent, base = C.accent, INK = C.ink, MUTED = muted
  let top = y
  if (title) {
    ctx.textAlign = 'left'; ctx.fillStyle = accent
    ctx.font = `800 ${2.4 * u}px ${font}`
    ctx.fillText(title, x, top + 2.4 * u)
    top += 3.6 * u
  }
  const ws = design.style.weekStart === 1 ? 1 : 0
  const headH = (compact ? 2.4 : 3) * u
  const cw = w / 7
  ctx.textAlign = 'center'
  ctx.font = `700 ${(compact ? 1.3 : 1.6) * u}px ${FONT.sans}`
  for (let c = 0; c < 7; c++) {
    const wd = (c + ws) % 7
    ctx.fillStyle = (wd === 0 || wd === 6) ? C.weekend : MUTED
    ctx.fillText(WD_ZH[wd], x + cw * c + cw / 2, top + headH * 0.7)
  }
  top += headH
  const rows = weeks.length
  const ch = (y + h - top) / rows
  ctx.strokeStyle = C.grid
  ctx.lineWidth = Math.max(1, 0.12 * u)
  for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(x, top + r * ch); ctx.lineTo(x + w, top + r * ch); ctx.stroke() }

  weeks.forEach((wk, r) => wk.forEach((day, c) => {
    if (!day) return
    const cx = x + cw * c, cy = top + r * ch
    const numSize = compact ? Math.min(1.9 * u, ch * 0.42) : Math.min((tall ? 4.2 : 2.7) * u, ch * 0.42)
    // 節氣當天：淡底色標出來（這是我們跟一般月曆最大的不同）
    if (marks.term && day.term && !compact) {
      ctx.fillStyle = tint(base, 0.12)
      ctx.fillRect(cx + 0.2 * u, cy + 0.2 * u, cw - 0.4 * u, ch - 0.4 * u)
    }
    ctx.textAlign = compact ? 'center' : 'left'
    ctx.fillStyle = (day.wd === 0 || day.wd === 6) ? C.weekend : INK
    ctx.font = `700 ${numSize}px ${font}`
    const nx = compact ? cx + cw / 2 : cx + 0.9 * u
    ctx.fillText(String(day.d), nx, cy + numSize * 1.05 + (compact ? 0.2 * u : 0.5 * u))
    if (compact) {
      if (marks.term && day.term) { ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx + cw / 2, cy + ch - 0.6 * u, 0.35 * u, 0, Math.PI * 2); ctx.fill() }
      return
    }
    const small = Math.min((tall ? 1.7 : 1.35) * u, ch * 0.2)
    ctx.font = `500 ${small}px ${FONT.sans}`
    let ly = cy + numSize * 1.05 + 0.5 * u + small * 1.35
    const maxW = cw - 1.4 * u
    const tag = (marks.term && day.term) || (marks.fest && day.fest)
    if (tag) {
      ctx.fillStyle = accent
      ctx.font = `700 ${small}px ${FONT.sans}`
      ctx.fillText(fit(ctx, tag, maxW), cx + 0.9 * u, ly); ly += small * 1.3
      ctx.font = `500 ${small}px ${FONT.sans}`
    }
    if (marks.lunar && day.lunar && ly < cy + ch - 0.3 * u) {
      ctx.fillStyle = MUTED
      ctx.fillText(fit(ctx, day.lunar, maxW), cx + 0.9 * u, ly); ly += small * 1.3
    }
    const yj = marks.yiji && opts.yiji?.[`${day.y}-${day.m}-${day.d}`]
    if (yj && ly < cy + ch - 0.3 * u) {
      ctx.fillStyle = MUTED
      ctx.fillText(fit(ctx, yj, maxW), cx + 0.9 * u, ly)
    }
  }))
}

function watermark(ctx, W, H, u) {
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.rotate(-Math.PI / 9)
  ctx.font = `700 ${3 * u}px ${FONT.sans}`
  ctx.fillStyle = 'rgba(43,33,24,.07)'
  ctx.textAlign = 'center'
  for (let yy = -H; yy <= H; yy += 14 * u) {
    for (let xx = -W; xx <= W; xx += 34 * u) ctx.fillText('機巧時運 · 設計預覽', xx + ((yy / (14 * u)) % 2 ? 17 * u : 0), yy)
  }
  ctx.restore()
}

// ── 圖片載入快取（同一張圖在 2D、縮圖、3D 都會用到）──
const imgCache = new Map()
export function loadImage(url) {
  if (!url) return Promise.resolve(null)
  if (!imgCache.has(url)) {
    imgCache.set(url, new Promise((resolve) => {
      const im = new Image()
      im.decoding = 'async'
      im.onload = () => resolve(im)
      im.onerror = () => { imgCache.delete(url); resolve(null) }   // 失敗不卡住畫面，退回字形主視覺
      im.src = url
    }))
  }
  return imgCache.get(url)
}
export const imageUrlOf = (img) => (img?.id ? `/api/images/${img.id}` : null)
