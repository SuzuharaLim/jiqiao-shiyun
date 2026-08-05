// ============================================================================
// 表情 —— 全部畫在 canvas 上，換表情＝換 material.map（不觸發 shader 重編譯）
//
// ⚠️ 快取的 key 必須含**角色 id**。原本是全域 `FACE_CACHE[expr]`，
//    單角色 demo 沒問題，但量產到 24 隻之後白菜與青蔥會共用同一張「開心」臉——
//    而每隻角色的臉部貼片尺寸、腮紅位置、色票都不一樣（策畫書 §6.2 #8）。
//
// ⚠️ 這一支需要 document.createElement('canvas')，Node 環境沒有。
//    幾何層刻意不相依於它，所以 check-char.mjs 可以在 Node 跑完整的組裝測試，
//    只有臉的貼圖會是 null——這是刻意的分層，不是缺陷。
// ============================================================================
import { CanvasTexture, SRGBColorSpace } from 'three'
import { PAL } from './geometry.js'

const TEX = {
  eyeX: [0.26, 0.74], eyeY: 0.40, rx: 0.120, ry: 0.142,
  glintDX: 0.042, glintDY: 0.050, glintR: 0.035,
  blushX: [0.105, 0.895], blushY: 0.60, blushR: 0.115, blushA: 0.62,
  mouthY: 0.600, mouthR: 0.102,
}

export const EXPRESSIONS = [
  'normal', 'happy', 'blink', 'sleep', 'shy', 'surprise', 'angry', 'wink',
]

export function drawFace(expr) {
  if (typeof document === 'undefined') return null
  const W = 512, H = 420
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d')
  const rx = TEX.rx * W, ry = TEX.ry * W
  const blushBoost = (expr === 'shy') ? 1.9 : (expr === 'happy' ? 1.25 : 1)

  // 腮紅先畫，才會被眼睛壓在下面
  for (const cx of TEX.blushX) {
    const px = cx * W, py = TEX.blushY * H
    const R = TEX.blushR * W * (expr === 'shy' ? 1.25 : 1)
    const a = Math.min(1, TEX.blushA * blushBoost)
    const g = x.createRadialGradient(px, py, 0, px, py, R)
    g.addColorStop(0.0, `rgba(246,142,152,${a.toFixed(3)})`)
    g.addColorStop(0.55, `rgba(246,142,152,${(a * 0.47).toFixed(3)})`)
    g.addColorStop(1.0, 'rgba(246,142,152,0)')
    x.fillStyle = g; x.beginPath(); x.arc(px, py, R, 0, Math.PI * 2); x.fill()
  }

  x.strokeStyle = PAL.eye; x.lineCap = 'round'; x.lineJoin = 'round'

  TEX.eyeX.forEach((cxn, k) => {
    const px = cxn * W, py = TEX.eyeY * H, out = (k === 0) ? -1 : 1
    const openEye = (sx, sy) => {
      x.fillStyle = PAL.eye
      x.beginPath(); x.ellipse(px, py, rx * (sx || 1), ry * (sy || 1), 0, 0, Math.PI * 2); x.fill()
      x.fillStyle = '#FFFFFF'
      x.beginPath()
      x.arc(px + out * TEX.glintDX * W, py - TEX.glintDY * W, TEX.glintR * W, 0, Math.PI * 2)
      x.fill()
    }
    const arcUp = () => {                       // ∩ 開心／滿足的閉眼
      x.lineWidth = 0.030 * W
      x.beginPath(); x.arc(px, py + 0.022 * W, rx * 0.98, Math.PI * 1.14, Math.PI * 1.86); x.stroke()
    }
    const arcDown = () => {                     // ‿ 眨眼／睡覺的閉眼
      x.lineWidth = 0.028 * W
      x.beginPath(); x.arc(px, py - 0.052 * W, rx * 1.02, Math.PI * 0.24, Math.PI * 0.76); x.stroke()
    }
    const cross = () => {                       // >< 害羞
      x.lineWidth = 0.026 * W
      const w = rx * 0.85, h = ry * 0.72, dir = -out
      x.beginPath()
      x.moveTo(px - dir * w, py - h); x.lineTo(px + dir * w * 0.6, py); x.lineTo(px - dir * w, py + h)
      x.stroke()
    }

    if (expr === 'happy') arcUp()
    else if (expr === 'blink' || expr === 'sleep') arcDown()
    else if (expr === 'shy') cross()
    else if (expr === 'surprise') openEye(1.16, 1.16)
    else if (expr === 'angry') openEye(1.0, 0.80)
    else if (expr === 'wink') { if (k === 1) arcUp(); else openEye() }
    else openEye()

    if (expr === 'angry') {                     // 斜眉
      x.lineWidth = 0.032 * W
      const bx = px, by = py - ry - 0.030 * W
      // 內側低、外側高＝生氣。反過來（內側高）會變成難過
      x.beginPath()
      x.moveTo(bx - out * rx * 0.98, by + 0.040 * W)
      x.lineTo(bx + out * rx * 0.88, by - 0.028 * W)
      x.stroke()
    }
  })

  // ── 嘴 ──
  const mx = 0.50 * W, my = TEX.mouthY * H, mr = TEX.mouthR * W
  const smile = (scale, tongue) => {
    const r = mr * scale
    x.save()
    x.beginPath(); x.arc(mx, my, r, Math.PI * 0.10, Math.PI * 0.90); x.closePath()
    x.fillStyle = PAL.mouth; x.fill(); x.clip()
    if (tongue) {
      x.fillStyle = '#D9808A'
      x.beginPath(); x.arc(mx, my + r * 0.92, r * 0.62, 0, Math.PI * 2); x.fill()
    }
    x.restore()
  }
  if (expr === 'surprise') {
    x.fillStyle = PAL.mouth
    x.beginPath(); x.ellipse(mx, my + mr * 0.15, mr * 0.44, mr * 0.62, 0, 0, Math.PI * 2); x.fill()
  } else if (expr === 'angry') {
    x.strokeStyle = PAL.mouth; x.lineWidth = 0.024 * W
    x.beginPath(); x.arc(mx, my + mr * 0.95, mr * 0.72, Math.PI * 1.18, Math.PI * 1.82); x.stroke()
  } else if (expr === 'shy') {
    x.strokeStyle = PAL.mouth; x.lineWidth = 0.020 * W
    x.beginPath()
    x.arc(mx - mr * 0.34, my, mr * 0.36, Math.PI * 0.05, Math.PI * 0.95)
    x.arc(mx + mr * 0.34, my, mr * 0.36, Math.PI * 1.05, Math.PI * 1.95, true)
    x.stroke()
  } else if (expr === 'sleep') {
    x.strokeStyle = PAL.mouth; x.lineWidth = 0.022 * W
    x.beginPath(); x.arc(mx, my, mr * 0.40, Math.PI * 0.08, Math.PI * 0.92); x.stroke()
    x.fillStyle = 'rgba(120,104,150,0.85)'
    x.font = `bold ${0.085 * W}px system-ui, sans-serif`
    x.fillText('z', 0.745 * W, 0.185 * H)
    x.font = `bold ${0.056 * W}px system-ui, sans-serif`
    x.fillText('z', 0.845 * W, 0.105 * H)
  } else if (expr === 'happy') smile(1.35, true)
  else smile(1.0, true)

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
