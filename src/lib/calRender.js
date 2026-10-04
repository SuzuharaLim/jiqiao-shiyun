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
import { BASE_COLORS, PAPER_COLORS } from '../data/calendarRules.js'

export const PAGE_RATIO = 3 / 4          // 高 ÷ 寬
const INK = '#2B2118', MUTED = '#8A7E72', LINE = 'rgba(43,33,24,.12)'
const FONT = {
  serif: '"Noto Serif TC","Source Han Serif TC","Songti TC","PMingLiU",Georgia,serif',
  sans: 'system-ui,-apple-system,"PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif',
}

export const baseHex = (d) => (BASE_COLORS.find(c => c.id === d.style.base) || BASE_COLORS[0]).hex
export const paperHex = (d) => (PAPER_COLORS.find(c => c.id === d.style.paper) || PAPER_COLORS[0]).hex

// 淺色底座（奶油）拿來當文字色會看不見 → 文字點綴色退回深色
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const accentOf = (d) => { const h = baseHex(d); return luminance(h) > 0.45 ? '#7A5A2A' : h }
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
function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height)
  const sw = w / s, sh = h / s
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
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
  const paper = paperHex(design), base = baseHex(design), accent = accentOf(design)
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
    drawCover(ctx, image, bx, by, bw, bh)
  } else {
    // 沒有照片：用節氣／月份字當主視覺（跟文章卡、徽章字形磚同一套語彙）
    ctx.fillStyle = tint(base, 0.16)
    ctx.fillRect(bx, by, bw, bh)
    ctx.fillStyle = tint(base, 0.85)
    ctx.font = `800 ${bh * 0.62}px ${FONT.serif}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    ctx.globalAlpha = 0.22
    ctx.fillText(page.term || page.label, bx + bw - 3 * u, by + bh * 0.55)
    ctx.globalAlpha = 1
  }
  ctx.restore()
  // 詩詞／一句話：壓在圖片左下，半透明底確保看得清
  if (over.text) {
    const lines = String(over.text).split('\n').slice(0, 2)
    ctx.font = `600 ${2.3 * u}px ${font}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    const tw = Math.min(bw * 0.7, Math.max(...lines.map(l => ctx.measureText(l).width)) + 3 * u)
    const th = lines.length * 3.2 * u + 2 * u
    ctx.fillStyle = 'rgba(251,247,238,.86)'
    roundRect(ctx, bx + 2 * u, by + bh - th - 2 * u, tw, th, 0.8 * u); ctx.fill()
    ctx.fillStyle = INK
    lines.forEach((l, i) => ctx.fillText(fit(ctx, l, tw - 3 * u), bx + 3.5 * u, by + bh - th - 2 * u + (i + 1) * 3.2 * u + 0.2 * u))
  }

  // ── 標題列 ──
  const hy = by + bh + 6.6 * u
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = accent
  ctx.font = `800 ${5.2 * u}px ${font}`
  const label = page.label
  ctx.fillText(label, pad, hy)
  let lx = pad + ctx.measureText(label).width + 2.4 * u
  if (page.en) {
    ctx.font = `600 ${1.8 * u}px ${FONT.sans}`
    ctx.fillStyle = MUTED
    ctx.fillText(page.en, lx, hy - 0.4 * u)
    lx += ctx.measureText(page.en).width + 2.4 * u
  }
  if (over.title) {
    ctx.font = `700 ${2.6 * u}px ${font}`
    ctx.fillStyle = INK
    ctx.fillText(fit(ctx, over.title, W - pad - lx - 22 * u), lx, hy - 0.3 * u)
  }
  ctx.textAlign = 'right'
  ctx.font = `600 ${1.9 * u}px ${FONT.sans}`
  ctx.fillStyle = MUTED
  ctx.fillText(page.sub, W - pad, hy - 0.4 * u)

  // ── 日期格 ──
  const gy = hy + 2.6 * u
  const gh = H - gy - pad
  if (page.kind === 'quarter') {
    const colW = (W - pad * 2 - 4 * u) / 3
    page.months.forEach((mo, k) => drawGrid(ctx, {
      x: pad + k * (colW + 2 * u), y: gy, w: colW, h: gh, weeks: mo.weeks, title: mo.label,
      u, font, accent, base, marks, compact: true, design, opts,
    }))
  } else {
    drawGrid(ctx, { x: pad, y: gy, w: W - pad * 2, h: gh, weeks: page.weeks, u, font, accent, base, marks,
      tall: page.kind === 'week', design, opts })
  }

  if (opts.watermark !== false) watermark(ctx, W, H, u)
  return canvas
}

function drawGrid(ctx, { x, y, w, h, weeks, title, u, font, accent, base, marks, compact, tall, design, opts }) {
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
    ctx.fillStyle = wd === 0 ? tint(accent, 0.95) : MUTED
    ctx.fillText(WD_ZH[wd], x + cw * c + cw / 2, top + headH * 0.7)
  }
  top += headH
  const rows = weeks.length
  const ch = (y + h - top) / rows
  ctx.strokeStyle = LINE
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
    ctx.fillStyle = day.wd === 0 ? accent : INK
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
