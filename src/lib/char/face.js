// ============================================================================
// 表情 —— 全部畫在 canvas 上，換表情＝換 material.map（不觸發 shader 重編譯）
//
// ★★★ 2026-08-11 整支依 demo `大白菜擬人-動作展示_6.html`（第 645–810 行）
//   重新移植。稽核發現舊版與 demo 有 26 項分歧，其中三項是「臉看起來怪」的主因：
//     ① **9 個表情裡有 8 個完全沒有眉毛**（舊版只有 angry 畫一條直線）。
//        平常臉、開心、眨眼佔了 90% 的時間，眼睛上方是一片空白 ⇒ 臉讀成
//        「貼了兩顆黑點」而不是有表情的臉。眉毛是簡筆表情最主要的情緒載體。
//     ② **嘴整個往下掉了 0.114 H**（mouthY 0.600 vs demo 0.552），眼嘴距離
//        幾乎加倍 ⇒ Q 版比例變成「長臉／下巴很長」。
//     ③ **happy 的 ∩ 閉眼弧整組上移 0.126 H** 跑到額頭 ⇒ 從 normal 切到 happy
//        時眼睛會往上「瞬移」，看起來不像在笑。
//   另外畫布尺寸也不同（舊版 512×420、demo 576×527），而 demo 的常數是混用
//   FW/FH 的（眉寬用 FW、眉高用 FH），長寬比一變形狀就跟著變。
//   ⇒ 這裡連畫布尺寸一起對齊，常數才有意義。
//
// ⚠️ 快取的 key 必須含**角色 id**。原本是全域 `FACE_CACHE[expr]`，
//    單角色 demo 沒問題，但量產到 24 隻之後白菜與青蔥會共用同一張「開心」臉。
//
// ⚠️ 這一支需要 document.createElement('canvas')，Node 環境沒有。
//    幾何層刻意不相依於它，所以 check-char.mjs 可以在 Node 跑完整的組裝測試，
//    只有臉的貼圖會是 null——這是刻意的分層，不是缺陷。
// ============================================================================
import { CanvasTexture, SRGBColorSpace } from 'three'
import { PAL } from './geometry.js'

// demo `_6:648`。**不要改**：底下每一個常數都是這兩個數的比例。
const FW = 576, FH = 527
const TAU = Math.PI * 2
const DEG = Math.PI / 180

export const EXPRESSIONS = [
  'normal', 'happy', 'blink', 'sleep', 'shy', 'surprise', 'angry', 'wink',
  // ★ demo 有、舊版漏掉——`dance` 動作指名要用它
  'sing',
]

/** demo 的 softBlob：用 scale 把圓變成橢圓，漸層落點 0 / 0.5 / 1。 */
function softBlob(g, cx, cy, rx, ry, rgb, a) {
  g.save(); g.translate(cx, cy); g.scale(rx, ry)
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, 1)
  grd.addColorStop(0.00, `rgba(${rgb},${a})`)
  grd.addColorStop(0.50, `rgba(${rgb},${a * 0.68})`)
  grd.addColorStop(1.00, `rgba(${rgb},0)`)
  g.fillStyle = grd; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore()
}

export function drawFace(expr) {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = FW; c.height = FH
  const g = c.getContext('2d')
  g.clearRect(0, 0, FW, FH)

  const eyeY = 0.417 * FH, dx = 0.243 * FW
  const cxL = FW / 2 - dx, cxR = FW / 2 + dx
  const eRX = 0.098 * FW, eRY = 0.126 * FH
  const mY = 0.552 * FH, mW = 0.078 * FW, mH = 0.064 * FH
  const browY = 0.219 * FH

  // ── 腮紅（先畫，才會被眼睛壓在下面）──
  // ⚠️ 這是**橢圓**（0.070FW × 0.048FH）不是正圓，位置也在臉頰中段（0.214FW）
  //    不是最外緣。舊版是 R=0.115W 的正圓放在 0.105W ⇒ 兩塊蓋住半張臉的
  //    大粉紅圓餅，而且偏到臉的側面。
  const blushA = (expr === 'shy') ? 0.92 : (expr === 'angry' ? 0.36 : 0.62)
  const blushRGB = (expr === 'shy') ? '240,124,118' : '242,147,140'
  const by = 0.566 * FH, bx = 0.214 * FW, brx = 0.070 * FW, bry = 0.048 * FH
  softBlob(g, bx, by, brx, bry, blushRGB, blushA)
  softBlob(g, FW - bx, by, brx, bry, blushRGB, blushA)
  if (expr === 'shy') {
    // 漫畫式的臉紅線——沒有它「害羞」會讀成「臉很紅」
    g.save(); g.strokeStyle = 'rgba(210,86,86,0.55)'
    g.lineWidth = 0.008 * FW; g.lineCap = 'round'
    for (let s = -1; s <= 1; s++) {
      g.beginPath(); g.moveTo(bx + s * 0.024 * FW, by - 0.022 * FH)
      g.lineTo(bx + s * 0.024 * FW, by + 0.022 * FH); g.stroke()
      g.beginPath(); g.moveTo(FW - bx + s * 0.024 * FW, by - 0.022 * FH)
      g.lineTo(FW - bx + s * 0.024 * FW, by + 0.022 * FH); g.stroke()
    }
    g.restore()
  }

  // ── 五官的畫法（逐字對齊 demo）──
  function eyeOpen(cx, cy, sx, sy) {
    const rx = eRX * (sx || 1), ry = eRY * (sy || 1)
    g.save(); g.translate(cx, cy)
    // 眼珠帶漸層（下緣提亮）——沒有的話是兩個沒有體積的全黑洞
    const lg = g.createLinearGradient(0, -ry, 0, ry)
    lg.addColorStop(0, PAL.eye); lg.addColorStop(1, PAL.eyeLo)
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU)
    g.fillStyle = lg; g.fill()
    // ⚠️ 兩點高光，而且**左右眼同方向**（主光在畫面左側）。
    //    舊版是單點且左右鏡像 ⇒ 兩眼的光源方向互相矛盾，有輕微鬥雞眼感。
    g.fillStyle = 'rgba(255,255,255,0.98)'
    g.beginPath(); g.ellipse(-rx * 0.33, -ry * 0.36, rx * 0.30, ry * 0.265, -0.35, 0, TAU); g.fill()
    g.fillStyle = 'rgba(255,255,255,0.75)'
    g.beginPath(); g.ellipse(rx * 0.36, ry * 0.38, rx * 0.105, ry * 0.095, 0, 0, TAU); g.fill()
    g.restore()
  }
  function eyeArc(cx, cy, w, h, up) {
    g.strokeStyle = PAL.eye; g.lineWidth = 0.021 * FW; g.lineCap = 'round'
    g.beginPath(); g.moveTo(cx - w, cy + (up ? h * 0.55 : -h * 0.45))
    g.quadraticCurveTo(cx, cy + (up ? -h * 1.5 : h * 1.65), cx + w, cy + (up ? h * 0.55 : -h * 0.45))
    g.stroke()
  }
  function eyeCross(cx, cy, w, h) {
    g.strokeStyle = PAL.eye; g.lineWidth = 0.020 * FW
    g.lineCap = 'round'; g.lineJoin = 'round'
    const s = (cx < FW / 2) ? 1 : -1
    g.beginPath()
    g.moveTo(cx - s * w, cy - h); g.lineTo(cx + s * w * 0.55, cy); g.lineTo(cx - s * w, cy + h)
    g.stroke()
  }
  /** ★ 眉毛。demo 的 9 個表情**每一個**都畫，舊版只有 angry 有。 */
  function brow(cx, cy, w, tiltDeg, thick) {
    g.save(); g.translate(cx, cy); g.rotate(tiltDeg * DEG)
    g.strokeStyle = PAL.eye; g.lineWidth = thick; g.lineCap = 'round'
    g.beginPath(); g.moveTo(-w, 0.012 * FH)
    g.quadraticCurveTo(0, -0.017 * FH, w, 0.008 * FH); g.stroke()
    g.restore()
  }
  function mouthOpen(cx, cy, w, h, tongue) {
    g.save()
    g.beginPath()
    g.moveTo(cx - w, cy - h * 0.20)
    g.quadraticCurveTo(cx, cy - h * 0.72, cx + w, cy - h * 0.20)
    g.bezierCurveTo(cx + w * 0.92, cy + h * 1.28, cx - w * 0.92, cy + h * 1.28, cx - w, cy - h * 0.20)
    g.closePath()
    // ⚠️ 鮮紅 #B03A4C，不是舊版的灰紫褐 #7E4B52——那在淺綠白的臉上幾乎沒有彩度，
    //    讀起來像一塊污漬。嘴是這張臉上唯一的暖色點。
    g.fillStyle = '#B03A4C'; g.fill()
    if (tongue) {
      g.clip()
      g.fillStyle = '#F0808C'
      g.beginPath(); g.ellipse(cx, cy + h * 1.02, w * 0.66, h * 0.60, 0, 0, TAU); g.fill()
    }
    g.restore()
  }
  function mouthCurve(cx, cy, w, h, up) {
    g.strokeStyle = '#9C2E40'; g.lineWidth = 0.014 * FW; g.lineCap = 'round'
    g.beginPath(); g.moveTo(cx - w, cy)
    g.quadraticCurveTo(cx, cy + (up ? h * 1.7 : -h * 1.5), cx + w, cy); g.stroke()
  }

  switch (expr) {
    case 'blink':
      brow(cxL, browY, 0.040 * FW, -5, 0.0135 * FW)
      brow(cxR, browY, 0.040 * FW, 5, 0.0135 * FW)
      eyeArc(cxL, eyeY, eRX * 1.02, eRY * 0.5, false)
      eyeArc(cxR, eyeY, eRX * 1.02, eRY * 0.5, false)
      mouthOpen(FW / 2, mY, mW, mH, true)
      break
    case 'happy':
      brow(cxL, browY - 0.010 * FH, 0.040 * FW, -8, 0.0135 * FW)
      brow(cxR, browY - 0.010 * FH, 0.040 * FW, 8, 0.0135 * FW)
      // ⚠️ 圓心在 `eyeY + eRY*0.28`（眼睛**下方**）才會讀成「瞇眼笑」。
      //    舊版把弧整組畫到眼睛上方 0.126H 處 ⇒ 切換表情時眼睛往額頭瞬移。
      eyeArc(cxL, eyeY + eRY * 0.28, eRX * 1.05, eRY * 0.72, true)
      eyeArc(cxR, eyeY + eRY * 0.28, eRX * 1.05, eRY * 0.72, true)
      mouthOpen(FW / 2, mY, mW * 1.08, mH * 1.06, true)
      break
    case 'surprise':
      brow(cxL, browY - 0.026 * FH, 0.038 * FW, -12, 0.0135 * FW)
      brow(cxR, browY - 0.026 * FH, 0.038 * FW, 12, 0.0135 * FW)
      eyeOpen(cxL, eyeY, 1.10, 1.16); eyeOpen(cxR, eyeY, 1.10, 1.16)
      g.fillStyle = '#B03A4C'
      g.beginPath(); g.ellipse(FW / 2, mY + mH * 0.18, mW * 0.52, mH * 0.92, 0, 0, TAU); g.fill()
      break
    case 'shy':
      brow(cxL, browY + 0.004 * FH, 0.038 * FW, 9, 0.0130 * FW)
      brow(cxR, browY + 0.004 * FH, 0.038 * FW, -9, 0.0130 * FW)
      eyeCross(cxL, eyeY, eRX * 0.80, eRY * 0.62)
      eyeCross(cxR, eyeY, eRX * 0.80, eRY * 0.62)
      mouthCurve(FW / 2, mY, mW * 0.62, mH * 0.5, false)
      break
    case 'sleep':
      brow(cxL, browY + 0.008 * FH, 0.037 * FW, 7, 0.0125 * FW)
      brow(cxR, browY + 0.008 * FH, 0.037 * FW, -7, 0.0125 * FW)
      eyeArc(cxL, eyeY, eRX * 1.0, eRY * 0.5, false)
      eyeArc(cxR, eyeY, eRX * 1.0, eRY * 0.5, false)
      g.fillStyle = '#9C2E40'
      g.beginPath(); g.ellipse(FW / 2, mY + mH * 0.1, mW * 0.32, mH * 0.55, 0, 0, TAU); g.fill()
      // ⚠️ z 字要有**白色外框**：直接畫在淺色葉面上沒有描邊會糊掉看不清楚。
      //    顏色也要用色票裡的葉綠，舊版那個紫不在這隻角色的任何一份色票裡。
      g.lineWidth = 0.008 * FW; g.lineJoin = 'round'
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.fillStyle = 'rgba(74,102,34,0.92)'
      g.font = `bold ${0.070 * FW}px system-ui, sans-serif`
      g.strokeText('z', 0.800 * FW, 0.352 * FH); g.fillText('z', 0.800 * FW, 0.352 * FH)
      g.font = `bold ${0.048 * FW}px system-ui, sans-serif`
      g.strokeText('z', 0.872 * FW, 0.268 * FH); g.fillText('z', 0.872 * FW, 0.268 * FH)
      break
    case 'angry':
      // 內側低、外側高＝生氣。反過來（內側高）會變成難過。
      brow(cxL, browY + 0.014 * FH, 0.044 * FW, 20, 0.0158 * FW)
      brow(cxR, browY + 0.014 * FH, 0.044 * FW, -20, 0.0158 * FW)
      eyeOpen(cxL, eyeY + 0.006 * FH, 1.0, 0.86)
      eyeOpen(cxR, eyeY + 0.006 * FH, 1.0, 0.86)
      mouthCurve(FW / 2, mY + mH * 0.5, mW * 0.72, mH * 0.55, false)
      break
    case 'wink':
      brow(cxL, browY - 0.008 * FH, 0.040 * FW, -8, 0.0135 * FW)
      brow(cxR, browY, 0.040 * FW, 5, 0.0135 * FW)
      eyeArc(cxL, eyeY + eRY * 0.22, eRX * 1.02, eRY * 0.68, true)
      eyeOpen(cxR, eyeY, 1.0, 1.0)
      mouthOpen(FW / 2, mY, mW * 1.02, mH, true)
      break
    case 'sing':
      brow(cxL, browY - 0.014 * FH, 0.040 * FW, -9, 0.0135 * FW)
      brow(cxR, browY - 0.014 * FH, 0.040 * FW, 9, 0.0135 * FW)
      eyeArc(cxL, eyeY + eRY * 0.26, eRX * 1.04, eRY * 0.70, true)
      eyeArc(cxR, eyeY + eRY * 0.26, eRX * 1.04, eRY * 0.70, true)
      g.fillStyle = '#B03A4C'
      g.beginPath(); g.ellipse(FW / 2, mY + mH * 0.24, mW * 0.62, mH * 1.20, 0, 0, TAU); g.fill()
      g.save()
      g.beginPath(); g.ellipse(FW / 2, mY + mH * 0.24, mW * 0.62, mH * 1.20, 0, 0, TAU); g.clip()
      g.fillStyle = '#F0808C'
      g.beginPath(); g.ellipse(FW / 2, mY + mH * 1.30, mW * 0.50, mH * 0.62, 0, 0, TAU); g.fill()
      g.restore()
      break
    default:                                   // normal
      brow(cxL, browY, 0.040 * FW, -5, 0.0135 * FW)
      brow(cxR, browY, 0.040 * FW, 5, 0.0135 * FW)
      eyeOpen(cxL, eyeY, 1, 1); eyeOpen(cxR, eyeY, 1, 1)
      mouthOpen(FW / 2, mY, mW, mH, true)
  }

  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true
  return t
}

const FACE_CACHE = new Map()

/** @param charId 角色 id —— 不可省略，否則多角色會共用同一張臉 */
export function faceTexture(charId, expr) {
  const key = `${charId}|${expr}`
  if (!FACE_CACHE.has(key)) FACE_CACHE.set(key, drawFace(expr))
  return FACE_CACHE.get(key)
}

export function disposeFaceCache(charId) {
  for (const [key, tex] of [...FACE_CACHE]) {
    if (charId && !key.startsWith(`${charId}|`)) continue
    tex?.dispose()
    FACE_CACHE.delete(key)
  }
}
export const faceCacheSize = () => FACE_CACHE.size
