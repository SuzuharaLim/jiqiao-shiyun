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
  // ★ demo `_6` 有、移植時整個漏掉的兩個全身動作（2026-08-11 補回）
  { id: 'dance', name: '跳舞' },
  { id: 'bow', name: '鞠躬' },
  // ── 策畫書 §4.5 新增（demo 沒有，是本站自己加的）──
  { id: 'present', name: '介紹' },
  { id: 'point', name: '指向' },
  { id: 'celebrate', name: '慶祝' },
  { id: 'think', name: '思考' },
]

/** demo 的呼吸基準頻率（`_6:844`）。多個動作共用同一條，才會同步。 */
const breath = (t) => Math.sin(t * 1.5)

/** demo 的 smoothstep（bow 用）。 */
const smoothstep = (a, b, x) => {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

// ⚠️ `armA` 的預設是 **[3, 3]** 不是 [0, 0]（`_6:843`）。沒設 armA 的動作
//    手臂角度是 44+3 = 47°，不是 44°。
const blank = () => ({
  y: 0, rx: 0, ry: 0, rz: 0, sy: 1,
  armA: [3, 3], armS: [0, 0], legA: [0, 0],
  leaf: 1, expr: 'normal', allowBlink: true,
})

/**
 * @param char buildCharacter() 的回傳值
 * @param opts.reduceMotion 使用者開了「減少動態」
 */
export function createActor(char, { action = 'idle', reduceMotion = false } = {}) {
  const armSign = [-1, 1]
  let t = 0, act = action
  let blinkT = -1, blinkLeft = 1.8 + Math.random() * 2.2   // 倒數式，見 update()
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
      // ══════════════════════════════════════════════════════════════════
      // ★★★ 以下 11 個動作＋idle 逐字對齊 demo `_6` 的 tick（_6:838–968）。
      //
      // 2026-08-11 稽核發現移植版把**每一個**動作都改過：手臂角度正負相反
      // （shy 12° vs demo 110°、angry 14° vs 100°）、armS 幾乎全部漏掉、
      // 頻率快 21~70%、包絡（|sin| vs sin）被拿掉、expr／allowBlink 漏設……
      // 累積起來的結果是「動作看得出來在動，但讀不出來在做什麼」。
      // ⚠️ 要調整請先改 demo 再同步過來，不要在這裡憑感覺改。
      // ══════════════════════════════════════════════════════════════════
      case 'jump': {
        const p = (t * 1.05) % 1
        const air = Math.max(0, Math.sin(p * Math.PI))
        // ⚠️ 蹲的那一下（sq）只在週期前 14% 出現，是「起跳前的壓縮」。
        //    移植版改成四段式並把週期拉長到 1.9 秒，最後 26% 完全靜止
        //    ⇒ 節奏從「連跳」變成「跳一下、發呆、再跳一下」。
        const sq = (p < 0.14) ? Math.sin(p / 0.14 * Math.PI) : 0
        c.y = 0.46 * Math.pow(air, 0.85)
        c.sy = 1 + 0.10 * air - 0.13 * sq
        c.armA = [30 + 74 * air, 30 + 74 * air]      // 最高 148°＝真的舉過頭
        c.legA = [-16 * air - 20 * sq, -16 * air - 20 * sq]
        c.leaf = 3.0
        c.expr = air > 0.25 ? 'surprise' : 'happy'
        c.allowBlink = false
        break
      }
      case 'walk': {
        const s1 = Math.sin(t * 5.2)
        c.legA = [34 * s1, -34 * s1]
        c.armS = [-26 * s1, 26 * s1]
        c.armA = [18, 18]
        // ⚠️ 用 `sin(x + π/2)`（＝cos）**而且要減 0.008**：最高點落在雙腳交會時，
        //    而且谷底會踩到 −0.008（微微踩進地面）。移植版寫成 `|sin p| + 0.012`
        //    ⇒ y 恆為正 ⇒ 腳底永遠離地，走路變成整隻「飄」著滑行；
        //    而且相位相反（最高點落在跨最大步時），看起來每跨一步就往上蹦一次。
        c.y = 0.020 * Math.abs(Math.sin(t * 5.2 + Math.PI / 2)) - 0.008
        c.rz = 0.035 * s1
        c.rx = 0.05                                   // 前傾（移植版漏了）
        c.sy = 1 - 0.018 * Math.abs(s1)
        c.leaf = 2.0; c.expr = 'happy'
        break
      }
      case 'wave': {
        const w = Math.sin(t * 7.0)
        c.armA = [10, 100 + 12 * w]
        // ⚠️ armS = −22 是「手往前伸向鏡頭」。漏掉的話手只在身體側面的冠狀面
        //    上下擺，讀起來像敬禮而不是揮手。
        c.armS = [4, -22 + 7 * w]
        c.rz = -0.035 * Math.sin(t * 3.5)             // 隨揮手左右擺，不是固定歪
        c.y = 0.012 * Math.abs(Math.sin(t * 3.5))
        c.leaf = 1.6; c.expr = 'happy'; c.allowBlink = false
        break
      }
      case 'dance': {
        // ★ demo 有、移植整個漏掉的兩個動作之一（另一個是 bow）。
        const s2 = Math.sin(t * 4.4), c2 = Math.cos(t * 4.4)
        c.rz = 0.17 * s2; c.ry = 0.22 * Math.sin(t * 2.2)
        c.y = 0.035 * Math.abs(c2); c.sy = 1 + 0.035 * c2
        c.armA = [68 + 34 * s2, 68 - 34 * s2]
        c.armS = [-8 + 14 * c2, -8 - 14 * c2]
        c.legA = [20 * s2, -20 * s2]
        c.leaf = 2.6; c.expr = 'sing'; c.allowBlink = false
        break
      }
      case 'spin': {
        c.ry = t * 2.0                                 // 一圈 3.14 秒
        c.y = 0.028 * Math.abs(Math.sin(t * 4.0))
        c.armA = [60, 60]; c.armS = [10, 10]
        c.rz = 0.05 * Math.sin(t * 4.0)                // 左右晃，不是固定斜
        c.leaf = 2.4; c.expr = 'happy'; c.allowBlink = false
        break
      }
      case 'bow': {
        const ph = (t * 0.62) % 1
        const bw = smoothstep(0.05, 0.30, ph) * (1 - smoothstep(0.62, 0.92, ph))
        c.rx = 0.70 * bw; c.y = -0.05 * bw
        c.armA = [10 - 4 * bw, 10 - 4 * bw]
        c.armS = [22 * bw, 22 * bw]
        c.leaf = 1.8; c.expr = bw > 0.5 ? 'blink' : 'happy'; c.allowBlink = false
        break
      }
      case 'nod': {
        const nd = Math.sin(t * 3.4)
        // ⚠️ 正負半週都要有值（負半週用 −0.055 做回彈）⇒ 一大一小的連續雙擺。
        //    移植版寫成 `max(0, sin)²` ⇒ 每 1.85 秒裡有 0.92 秒完全靜止。
        c.rx = 0.22 * Math.max(0, nd) - 0.055 * Math.min(0, nd)
        c.y = -0.018 * Math.abs(nd)
        c.armA = [12, 12]
        c.leaf = 2.2; c.expr = 'happy'; c.allowBlink = false
        break
      }
      case 'shake': {
        c.ry = 0.36 * Math.sin(t * 4.6)                // 移植版是 7.0（快 52%）
        c.armA = [14, 14]
        c.armS = [-6 * Math.sin(t * 4.6), 6 * Math.sin(t * 4.6)]  // 雙臂反向甩
        c.leaf = 2.4; c.expr = 'angry'
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
        // ⚠️ armA 66（臂角 110°）＋ armS −38 ＝「雙手捧到臉前遮住臉」。
        //    移植版是 −26（臂角 12~24°、armS 0）＝雙手垂在身側「立正罰站」，
        //    差 92°——方向整個相反，不是幅度大小的問題。
        c.ry = 0.16 * Math.sin(t * 1.5); c.rx = 0.10
        c.armA = [66, 66]; c.armS = [-38, -38]
        c.y = 0.006 * breath(t)
        c.leaf = 0.7; c.expr = 'shy'; c.allowBlink = false
        break
      }
      case 'angry': {
        // ⚠️ 抖動要有**包絡**：`sin(22t) × max(0, sin(2t))` ＝ 一陣一陣地鼓氣發抖
        //    （每 3.14 秒一個週期）。移植版是三條等幅高頻正弦，看起來像模型
        //    在抖動故障而不是角色在生氣。
        const j = Math.sin(t * 22) * Math.max(0, Math.sin(t * 2.0))
        c.rz = 0.035 * j
        c.y = 0.012 * Math.abs(Math.sin(t * 4.0))     // |sin|：不會沉到地面以下
        c.armA = [56, 56]; c.armS = [-20, -20]        // 臂角 100°＝張到水平外
        c.sy = 1 + 0.030 * Math.max(0, Math.sin(t * 2.0))
        c.leaf = 3.2; c.expr = 'angry'; c.allowBlink = false
        break
      }
      case 'sleep': {
        // 睡覺是全部動作裡最該安靜的：移植版把呼吸放大 36%、位移放大 57%、
        // 葉子擺幅放大一倍，還讓側傾角跟著呼吸搖 —— 讀起來像喘不過氣。
        const br = Math.sin(t * 0.85)
        c.sy = 1 + 0.028 * br; c.y = 0.014 * br
        c.rz = 0.10; c.rx = 0.05                       // rz 是固定歪，不隨呼吸
        c.armA = [4, 4]; c.leaf = 0.25
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
        // ⚠️ 手臂要與呼吸**同頻**（都吃 breath = sin(1.5t)）：吸氣時手臂往外張 4°。
        //    移植版把 armA 拿掉、armS 改成 1.1 的獨立頻率 ⇒ 手臂與軀幹脫鉤，
        //    讀起來像手臂自己在晃而不是身體在呼吸。
        const b = breath(t)
        c.sy = 1 + 0.020 * b
        c.y = 0.014 * b
        c.ry = 0.07 * Math.sin(t * 0.55)
        c.rz = 0.020 * Math.sin(t * 0.78)
        c.armA = [2 + 4 * b, 2 + 4 * b]
        c.armS = [3 * Math.sin(t * 0.9), -3 * Math.sin(t * 0.9)]
        c.expr = 'normal'
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
      // ⚠️ 切動作時眨眼倒數要一起重設（demo 的 UI 也是這樣做：blinkNext = 1.6）
      act = next; t = 0; blinkT = -1; blinkLeft = 1.6
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
      const c = blank()
      base(c)
      additive(c)

      // ★★★ 眨眼是**倒數**不是絕對時間（demo 用 `blinkNext -= d`）。
      //
      // ⚠️ 先前寫成「`t > nextBlink` 就眨、眨完 `nextBlink = t + …`」，而
      //    `setAction()` 會把 `t` 歸零卻**不重設 nextBlink** ⇒ 在 idle 待了 60 秒
      //    （正常會眨 16 次）之後切到別的動作，下一次眨眼要等到 63.5 秒之後——
      //    角色整整一分鐘睜著眼不眨，而畫面上沒有任何其他異常。停留愈久愈嚴重。
      // ⚠️ 倒數式沒有這個問題：它與 `t` 無關，切動作時歸零即可。
      // ⚠️ `allowBlink` 變成 false 時要**把眨眼狀態清掉**（demo 的 `else { blinkOn = 0 }`）。
      //    不清的話「眨到一半切到不眨眼的動作」會把閉眼那一幀留在狀態裡，
      //    等切回來時從中途接著跑，可能只閉一瞬間就結束——看起來像抽搐。
      if (c.allowBlink) {
        blinkLeft -= d
        if (blinkT >= 0) {
          blinkT += d
          if (blinkT >= 0.12) { blinkT = -1; blinkLeft = 1.8 + Math.random() * 2.6 }
        } else if (blinkLeft <= 0) {
          blinkT = 0
        }
        if (blinkT >= 0) c.expr = 'blink'
      } else {
        blinkT = -1
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
      // ★★★ 縮的是**地面上的兩個軸**。blob 是一片 `rotation.x = -π/2` 的
      //   PlaneGeometry，它的 local x/y 才是世界的 x/z；local z 是厚度方向。
      //   先前寫成 `scale.set(bs, 1, bs)` ⇒ scale.z 完全無作用、scale.y 被鎖成 1
      //   ⇒ 跳起來時影子只在世界 X 變窄，變成一條前後拉長的橢圓，而且長軸永遠
      //   對齊世界 X（角色轉圈時影子形狀不會跟著轉）。實測 bs=0.61 時
      //   影子是 0.708 × 1.160，demo 是 0.708 × 0.708。
      const h = Math.max(0, Math.min(1, c.y / 0.5))
      const bs = 1 - 0.42 * h
      char.blob.scale.set(bs, bs, 1)
      char.blob.material.opacity = 0.26 * (1 - 0.62 * h)

      // ★★ 葉子擺動：**兩軸的頻率與幅度都不同**（x 是主要的前後點動、
      //   z 是幅度 0.8 倍的左右晃，頻率 1.75 / 1.25）。移植版把兩軸鎖成同頻
      //   1.15、幅度比例對調（z 反而是 x 的 1.4 倍），整體變慢，
      //   讀起來從「葉子前後點頭」變成「整顆左右晃」。
      for (const LR of char.leafRoots) {
        const A = LR.amp * c.leaf * DEG
        LR.node.rotation.x = A * Math.sin(t * 1.75 + LR.index * 0.9)
        LR.node.rotation.z = A * 0.8 * Math.sin(t * 1.25 + LR.index * 1.4)
      }
      return c
    },
  }
  return api
}
