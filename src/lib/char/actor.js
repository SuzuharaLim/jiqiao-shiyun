// ============================================================================
// 動作驅動 —— 通道式（每個動作只寫進一組通道，最後統一套用）
//
// 這個寫法是原 demo 最值得保留的設計：動作之間不互相知道對方存在，
// 新增一個動作就是多一個 case，不會踩到別人。
//
// ★ 唯一的架構升級（策畫書 §4.5）：原本的 switch 是**互斥**的，
//   於是「揮手同時講話」寫不出來。這裡把通道拆成 base + additive 兩份，
//   base 由 action 決定、additive 由 overlay（目前只有 talk）決定，最後相加。
//   既有的 12 個動作一行都不用改。
//
// ⚠️ reduce-motion 要在**這一層**處理，不是只靠 CSS。
//    CSS 的全域 animation 覆寫碰不到 requestAnimationFrame 驅動的東西
//    （站上的 AnimatedText 打字機就漏過一次）。這裡的作法是把幅度縮到 ~0
//    而不是整個停掉——角色僵住不動看起來像壞掉，微微呼吸才像「靜止」。
// ============================================================================
import { DEG } from './geometry.js'

export const ACTIONS = [
  { id: 'idle', name: '待機' },
  { id: 'happy', name: '開心' },
  { id: 'jump', name: '跳躍' },
  { id: 'walk', name: '走路' },
  { id: 'wave', name: '揮手' },
  { id: 'spin', name: '轉圈' },
  { id: 'nod', name: '點頭' },
  { id: 'shake', name: '搖頭' },
  { id: 'surprise', name: '驚訝' },
  { id: 'shy', name: '害羞' },
  { id: 'angry', name: '生氣' },
  { id: 'sleep', name: '睡覺' },
  // ── 策畫書 §4.5 新增 ──
  { id: 'present', name: '介紹' },
  { id: 'point', name: '指向' },
  { id: 'celebrate', name: '慶祝' },
  { id: 'think', name: '思考' },
]

const blank = () => ({
  y: 0, rx: 0, ry: 0, rz: 0, sy: 1,
  armA: [0, 0], armS: [0, 0], legA: [0, 0],
  leaf: 1, expr: 'normal', allowBlink: true,
})

/**
 * @param char buildCharacter() 的回傳值
 * @param opts.reduceMotion 使用者開了「減少動態」
 */
export function createActor(char, { action = 'idle', reduceMotion = false } = {}) {
  const armSign = [-1, 1]
  let t = 0, spin = 0, act = action
  let blinkT = -1, nextBlink = 1.6 + Math.random() * 2.6
  let overlay = null, overlayLevel = 0   // talk：由音量驅動
  let pointAt = 0                        // -1 左 … +1 右

  const base = (c) => {
    switch (act) {
      case 'happy': {
        const b = Math.pow(Math.abs(Math.sin(t * 3.0)), 1.7)
        c.sy = 0.93 + 0.07 * b; c.y = 0.17 * b
        c.rz = 0.05 * Math.sin(t * 6.0)
        c.armA = [48 + 20 * b, 48 + 20 * b]
        c.leaf = 1 + 1.8 * b
        c.expr = 'happy'; c.allowBlink = false
        break
      }
      case 'jump': {
        const ph = (t % 1.9) / 1.9
        let a
        if (ph < 0.16) {
          a = ph / 0.16; c.sy = 1 - 0.17 * Math.sin(a * Math.PI * 0.5)
          c.armA = [-16 * a, -16 * a]
        } else if (ph < 0.60) {
          a = (ph - 0.16) / 0.44
          c.y = 0.46 * Math.sin(a * Math.PI)
          c.sy = 1 + 0.11 * Math.sin(a * Math.PI)
          c.armA = [70 * Math.sin(a * Math.PI), 70 * Math.sin(a * Math.PI)]
          c.legA = [-26 * Math.sin(a * Math.PI), -26 * Math.sin(a * Math.PI)]
          c.leaf = 1 + 2.6 * Math.sin(a * Math.PI)
        } else if (ph < 0.74) {
          a = (ph - 0.60) / 0.14
          c.sy = 1 - 0.19 * Math.sin(a * Math.PI); c.leaf = 1 + 1.4 * (1 - a)
        } else c.sy = 1 + 0.012 * Math.sin(t * 5)
        c.expr = (ph > 0.16 && ph < 0.62) ? 'happy' : 'normal'
        c.allowBlink = false
        break
      }
      case 'walk': {
        const p = t * 5.0
        c.legA = [40 * Math.sin(p), -40 * Math.sin(p)]
        c.armS = [-20 * Math.sin(p), 20 * Math.sin(p)]
        c.armA = [10, 10]
        c.y = 0.022 * Math.abs(Math.sin(p)) + 0.012
        c.rz = 0.035 * Math.sin(p)
        c.ry = 0.06 * Math.sin(p * 0.5)
        c.sy = 1 + 0.012 * Math.sin(p * 2)
        c.leaf = 1.5
        break
      }
      case 'wave': {
        c.armA = [4 * Math.sin(t * 1.2), 92 + 16 * Math.sin(t * 8.5)]
        c.rz = -0.05; c.y = 0.010 * Math.sin(t * 1.6)
        c.sy = 1 + 0.016 * Math.sin(t * 1.6); c.ry = 0.10; c.leaf = 1.2
        break
      }
      case 'spin': {
        c.ry = spin; c.rz = 0.10
        c.y = 0.03 + 0.02 * Math.sin(t * 6)
        c.armA = [52, 52]; c.leaf = 2.6
        c.expr = 'happy'; c.allowBlink = false
        break
      }
      case 'nod': {
        const nq = Math.max(0, Math.sin(t * 3.4))
        c.rx = 0.26 * nq * nq; c.y = -0.012 * nq; c.leaf = 1 + 1.2 * nq
        break
      }
      case 'shake': {
        c.ry = 0.34 * Math.sin(t * 7.0)
        c.rz = 0.03 * Math.sin(t * 7.0 + 1.2); c.leaf = 2.0
        break
      }
      case 'surprise': {
        const sp = t % 2.6, k = Math.exp(-3.6 * sp)
        c.y = 0.20 * k * Math.abs(Math.sin(9 * sp))
        c.sy = 1 + 0.17 * k; c.rx = -0.05 * k
        c.armA = [78 * k, 78 * k]; c.leaf = 1 + 4.0 * k
        c.expr = (k > 0.10) ? 'surprise' : 'normal'
        c.allowBlink = k <= 0.10
        break
      }
      case 'shy': {
        c.sy = 0.975; c.y = -0.012
        c.ry = 0.13 * Math.sin(t * 1.5)
        c.rz = 0.06 * Math.sin(t * 1.5 + 0.7); c.rx = 0.07
        c.armA = [-26 + 6 * Math.sin(t * 1.5), -26 - 6 * Math.sin(t * 1.5)]
        c.leaf = 0.8; c.expr = 'shy'; c.allowBlink = false
        break
      }
      case 'angry': {
        c.y = 0.010 * Math.sin(t * 27)
        c.rz = 0.022 * Math.sin(t * 25)
        c.sy = 1 + 0.022 * Math.sin(t * 13)
        c.armA = [-30, -30]; c.leaf = 2.2
        c.expr = 'angry'; c.allowBlink = false
        break
      }
      case 'sleep': {
        const br = Math.sin(t * 0.85)
        c.sy = 1 + 0.038 * br; c.y = 0.022 * br
        c.rz = 0.13 + 0.02 * br; c.rx = 0.05
        c.armA = [-10, -10]; c.leaf = 0.5
        c.expr = 'sleep'; c.allowBlink = false
        break
      }

      // ── 新增動作 ──
      case 'present': {           // 自我介紹：雙手攤開、身體小幅左右
        const s = Math.sin(t * (2 * Math.PI / 2.2))
        c.armA = [70 + 6 * s, 70 - 6 * s]
        c.ry = 0.10 * s
        c.y = 0.012 * Math.sin(t * 1.5)
        c.sy = 1 + 0.018 * Math.sin(t * 1.5)
        c.leaf = 1.6; c.expr = 'happy'; c.allowBlink = false
        break
      }
      case 'point': {             // 指向某顆營養泡泡；pointAt −1..+1
        const i = pointAt >= 0 ? 1 : 0          // 用靠近目標的那隻手
        const mag = Math.min(1, Math.abs(pointAt))
        c.armA[i] = 60 + 45 * mag
        c.armA[1 - i] = -8
        c.ry = 0.42 * pointAt
        c.y = 0.008 * Math.sin(t * 1.8)
        c.leaf = 1.3
        break
      }
      case 'celebrate': {         // 答對＋發徽章：借 jump 前半再接 happy
        const ph = Math.min(1, t / 1.25)
        if (ph < 0.62) {
          const a = ph / 0.62
          c.y = 0.42 * Math.sin(a * Math.PI)
          c.sy = 1 + 0.12 * Math.sin(a * Math.PI)
          c.ry = a * Math.PI * 2
          c.armA = [88 * Math.sin(a * Math.PI), 88 * Math.sin(a * Math.PI)]
          c.leaf = 1 + 3.0 * Math.sin(a * Math.PI)
        } else {
          const b = Math.pow(Math.abs(Math.sin((t - 0.775) * 3.4)), 1.7)
          c.sy = 0.94 + 0.06 * b; c.y = 0.12 * b
          c.armA = [52 + 16 * b, 52 + 16 * b]; c.leaf = 1 + 1.4 * b
        }
        c.expr = 'happy'; c.allowBlink = false
        break
      }
      case 'think': {             // 作答中／答錯：微低頭、單手靠臉、眨眼加倍
        c.rx = 0.14
        c.ry = 0.10 * Math.sin(t * 0.8)
        c.armA = [-14, 74]
        c.armS = [0, -18]
        c.y = 0.008 * Math.sin(t * 1.2)
        c.leaf = 0.9
        break
      }

      default: {                  // idle
        const b2 = Math.sin(t * 1.55)
        c.sy = 1 + 0.024 * b2
        c.y = 0.012 * b2 + 0.006 * Math.sin(t * 3.1)
        c.ry = 0.05 * Math.sin(t * 0.42)
        c.rz = 0.030 * Math.sin(t * 0.71)
        c.armS = [6 * Math.sin(t * 1.1), -6 * Math.sin(t * 1.1)]
        break
      }
    }
  }

  // ★ 疊加層：可與任何 base 動作並存
  const additive = (c) => {
    if (overlay !== 'talk') return
    const lv = Math.max(0.15, overlayLevel)
    c.y += 0.006 * lv * Math.sin(t * 11)
    c.sy += 0.012 * lv * Math.sin(t * 9)
    c.rx += 0.018 * lv * Math.sin(t * 7.5)
    c.leaf += 0.5 * lv
  }

  const api = {
    get action() { return act },
    setAction(next) {
      if (act === next) return
      act = next; t = 0; spin = 0; blinkT = -1
    },
    /** 疊加層：'talk' 或 null */
    setOverlay(name, level = 0.6) { overlay = name; overlayLevel = level },
    setOverlayLevel(v) { overlayLevel = Math.max(0, Math.min(1, v)) },
    /** point 的方位：−1 最左、+1 最右 */
    setPointAt(v) { pointAt = Math.max(-1, Math.min(1, v)) },

    /** @param dtMs 毫秒。回傳這一幀的通道值（給測試用）。 */
    update(dtMs) {
      const d = Math.min(dtMs || 16, 50) / 1000
      t += d
      spin += d * 3.4
      const c = blank()
      base(c)
      additive(c)

      // 眨眼
      if (c.allowBlink) {
        if (blinkT < 0 && t > nextBlink) blinkT = 0
        if (blinkT >= 0) {
          blinkT += d
          if (blinkT < 0.12) c.expr = 'blink'
          else { blinkT = -1; nextBlink = t + 1.8 + Math.random() * 3.2 }
        }
      }

      if (reduceMotion) {
        // 保留呼吸與表情，其餘壓到 ~0（僵住不動看起來像壞掉）
        const k = 0.12
        c.y *= k; c.rx *= k; c.ry *= k; c.rz *= k
        c.sy = 1 + (c.sy - 1) * 0.35
        c.armA = c.armA.map(v => v * k); c.armS = c.armS.map(v => v * k)
        c.legA = c.legA.map(v => v * k); c.leaf = 1 + (c.leaf - 1) * k
      }

      char.setExpression(c.expr)

      // ── 套用 ──
      // 體積守恆：壓扁時往兩側鼓出去，這是 squash & stretch 的基本要求
      const sxz = 1 / Math.sqrt(c.sy)
      const b = char.body
      b.scale.set(sxz, c.sy, sxz)
      b.position.y = c.y
      b.rotation.set(c.rx, c.ry, c.rz)

      for (let i = 0; i < 2; i++) {
        const s = armSign[i]
        // 抬手＝加大與垂直軸的夾角：44° 自然下垂、90° 水平、140° 舉過頭
        char.arms[i].rotation.z = s * (44 + c.armA[i]) * DEG
        char.arms[i].rotation.x = c.armS[i] * DEG
        char.hips[i].rotation.x = c.legA[i] * DEG
      }

      // 接觸陰影隨離地高度縮小變淡（blob 掛在 root，不跟著跳）
      const h = Math.max(0, Math.min(1, c.y / 0.5))
      const bs = 1 - 0.42 * h
      char.blob.scale.set(bs, 1, bs)
      char.blob.material.opacity = 0.30 * (1 - 0.62 * h)

      for (const LR of char.leafRoots) {
        const amp = LR.amp * c.leaf
        LR.node.rotation.z = 0.024 * amp * Math.sin(t * 1.15 - 0.55 + LR.phase)
        LR.node.rotation.x = 0.017 * amp * Math.sin(t * 1.15 - 0.75 + LR.phase * 1.7)
      }
      return c
    },
  }
  return api
}
