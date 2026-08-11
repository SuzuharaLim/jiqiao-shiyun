// 3D 角色層的回歸測試（src/lib/char/*）
//
// 為什麼要有這支：這一層跟 almanac／AR 幾何一樣是「寫錯不會拋錯」的程式碼。
// 幾何算錯只會讓模型長歪、材質快取失效只會讓記憶體多吃幾十 MB、
// 動作通道寫反只會讓手往後翻——全部都要用眼睛看才發現，而 CI 沒有眼睛。
//
// 這支在 Node 跑（BufferGeometry 不需要 WebGL context），所以掛在 build 前面。
// 執行：node scripts/check-char.mjs
import fs from 'node:fs'
import { Box3, Vector3, PerspectiveCamera } from 'three'
import { buildCharacter, NAPA_CABBAGE } from '../src/lib/char/factory.js'
import { createActor, ACTIONS } from '../src/lib/char/actor.js'
import { rampCacheSize, disposeRampCache, makeToonRamp } from '../src/lib/char/material.js'
import { buildLeafGeometry } from '../src/lib/char/geometry.js'

let pass = 0
const fails = []
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

// ── 幾何：NaN 是這一層最危險的失敗模式 ────────────────────────────────
// ⚠️ 剝離 A-Frame 時 schema 預設值會消失。buildLeafGeometry 讀 kAz／kRib／tsh 等
//    十幾個欄位，preset 的 layers 並沒有全部提供——少了預設值就是
//    sin(undefined)=NaN，整份 position 變 NaN、模型整個不見，
//    而且**不會拋任何錯誤**。
{
  const g = buildLeafGeometry()
  const p = g.attributes.position.array
  ok(p.every(Number.isFinite), '葉片頂點無 NaN（預設參數）')
  ok(g.attributes.normal.array.every(Number.isFinite), '葉片法線無 NaN')
  ok(!!g.getIndex(), '葉片是 indexed（inverted-hull 描邊的前提）')
  ok(g.attributes.color.count === g.attributes.position.count, '頂點色數量對齊')
  // 明確重現「只給幾個欄位」的情境，確認 LEAF_DEFAULTS 有補上其餘的
  const g2 = buildLeafGeometry({ height: 1.0, radius: 0.3, segU: 6, segV: 8 })
  ok(g2.attributes.position.array.every(Number.isFinite), '只給部分參數也不可產生 NaN')
}

// ── 組裝：節點數與原 demo 必須一致 ────────────────────────────────────
const char = buildCharacter(NAPA_CABBAGE)
const st = char.stats()

// mesh 數推導（demo _6：5 層 54 片葉）：
//   葉 54 ＋ 葉描邊 27（只描最外兩層）＋ 菜芯 1 ＋ 菜根 2 ＋ 四肢 8 ＋ 四肢描邊 8
//   ＋ 臉 1 ＋ 接觸陰影 1 ＝ 102
// ⚠️ 54 片葉子每片都描邊會讀成芹菜稈，所以只描 li>=3 的兩層。
//    這一項若變成 54＋54，畫面會從「白菜」變成「一叢綠稈」。
ok(st.meshes === 102, `mesh 數 ${st.meshes}（應為 102：葉 54＋描邊 27＋芯 1＋根 2＋四肢 16＋臉 1＋陰影 1）`)
ok(NAPA_CABBAGE.layers.reduce((a, L) => a + L.n, 0) === 54, '葉片總數 54')
ok(NAPA_CABBAGE.layers.slice(3).reduce((a, L) => a + L.n, 0) === 27, '描邊層（最外兩層）共 27 片')

// ⚠️ 幾何快取：每層 3 種高度變體，臉那片另算一份（faceClear 不同）。
//    5 層 × 3 ＝ 15，＋臉葉 1 ＝ 16；再加芯 1、四肢 4、菜根 1、頂芽 1、臉貼片 1、陰影 1 ＝ 25。
//    ⚠️ 臉葉的 key 一定要含 face 旗標，共用到別片會讓其他葉子中間出現一塊白色平面。
ok(st.geometries === 25,
  `幾何份數 ${st.geometries}（應為 25：葉 15 ＋ 臉葉 1 ＋ 芯 1 ＋ 四肢 4 ＋ 根 1 ＋ **頂芽 1** ＋ 臉貼片 1 ＋ 陰影 1）`)
// ⚠️ 這個數字先前是 24，而 24 剛好是「有陰影、**沒有頂芽**」的數字——
//    也就是這條檢查把一個缺件**鎖了起來**。2026-08-11 才發現 demo 的頂芽
//    （擋葉尖收攏處那道縫的小綠球）從來沒被移植。
//    ⇒ 教訓：這種「總數對不對」的檢查只能抓「多了或少了」，抓不到「本來就漏掉」。
//      真正該鎖的是**逐項的位置與尺寸**（見下方 DEMO6 對照表）。
ok(st.triangles > 0 && Number.isFinite(st.triangles), `三角形數 ${st.triangles.toLocaleString()}`)

// ⚠️ 包圍盒是「位置陣列全對但矩陣壞掉」唯一驗得出來的地方。
//    移植時 preset 的欄位從 leafBaseY 改名 baseY，factory 卻還在讀舊名 →
//    baseY = undefined → 所有 position.y = NaN → 世界矩陣 NaN → **模型整個不見**。
//    而每一顆 mesh 的 position 屬性都是正常的，逐點檢查完全驗不出來。
{
  char.root.updateMatrixWorld(true)
  const box = new Box3().setFromObject(char.root)
  ok(Number.isFinite(box.min.y) && Number.isFinite(box.max.y),
    '世界包圍盒非 NaN（抓 preset 欄位改名沒同步的錯）')
  const size = box.getSize(new Vector3())
  ok(size.y > 0.8 && size.y < 2.0, `角色高度 ${size.y.toFixed(3)}（合理範圍 0.8–2.0）`)
  ok(Math.abs(box.min.y + box.max.y) < 0.6, `角色大致繞原點置中（y 中心 ${((box.min.y + box.max.y) / 2).toFixed(3)}）`)
}

// ════════════════════════════════════════════════════════════════════════════
// ★★★★ 逐項對照 demo `_6` 的節點變換
//
// 這一段是 2026-08-11 那次事故的直接產物。當時使用者回報「手的位置不對」，
// 追出來的原因是：**菜身逐字取自 `大白菜擬人-動作展示_6.html`，四肢／接觸陰影／
// 相機卻是從另一支 demo `白菜擬人-cel-demo_4.html` 抄的**（該檔 1107–1111 行的
// `limbs` preset，armX 0.382／armY 0.600／handR 0.072／footSc '1 0.60 1.35'…
// 一個不差）。而那支 demo 的原點是「腳踩 y = 0」，`_6` 是「地面在 −0.785」，
// **兩套座標系差 0.785**。後果：手臂長在頭頂（使用者說的「天線」）、
// 兩條腿整個埋在菜身裡看不到、接觸陰影變成套在腰上的呼拉圈。
//
// ⚠️ 當時所有既有檢查**全部通過**：mesh 數對、幾何份數對、包圍盒非 NaN、
//    高度 1.334 落在「合理範圍 0.8–2.0」內、y 中心 −0.008 也「大致置中」。
//    ⇒ 總量型的檢查抓不到「零件位置錯了」。只有逐項對照才抓得到。
//
// ⚠️ 下面的值是把 `_6` **跑起來之後從 object3D 直接讀出來的**，不是抄原始碼
//    （抄原始碼會再犯一次同樣的錯：抄到別支檔案也看不出來）。
//    重新量的方法見 CLAUDE.md「3D 角色層」那一節。
// ════════════════════════════════════════════════════════════════════════════
{
  const DEMO6 = {
    arm:  { pos: [0.398, -0.307, 0.118] },                       // x 取絕對值（左右對稱）
    hip:  { pos: [0.116, -0.512, 0.044], rotYDeg: 10 },
    upperArm: { pos: [0, -0.098, 0] },
    hand: { pos: [0, -0.212, 0], scale: [1, 0.96, 0.98] },
    thigh: { pos: [0, -0.100, 0] },
    foot: { pos: [0, -0.208, 0.036], scale: [1.02, 0.80, 1.58] },
    bud:  { pos: [0, 0.523, 0], scale: [1, 0.80, 1] },
    rootBall: { pos: [0, -0.575, 0], scale: [1, 0.60, 1] },
    blobY: -0.785,                                                // 腳底高度
    bboxY: [-0.774, 0.660],
  }
  const EPS = 0.002
  const near3 = (v, e) => v.every((x, i) => Math.abs(x - e[i]) <= EPS)
  const P = (o) => o.position.toArray()
  const S = (o) => o.scale.toArray()

  // 手臂：char.arms 是兩個樞紐 Group，[0] 是左（x<0）
  const armL = char.arms[0]
  ok(near3([Math.abs(P(armL)[0]), P(armL)[1], P(armL)[2]], DEMO6.arm.pos),
    `手臂樞紐 ${P(armL).map(v => v.toFixed(3))}（demo ∓${DEMO6.arm.pos.join(' / ')}）`
    + '　★ 錯了就是「手長在頭頂」')
  const [upper, hand] = armL.children
  ok(near3(P(upper), DEMO6.upperArm.pos), `上臂位置 ${P(upper).map(v => v.toFixed(3))}`)
  ok(near3(P(hand), DEMO6.hand.pos), `手掌位置 ${P(hand).map(v => v.toFixed(3))}`)
  ok(near3(S(hand), DEMO6.hand.scale), `手掌 scale ${S(hand).map(v => v.toFixed(2))}（demo 1／0.96／0.98）`)

  // 腿
  const hipL = char.hips[0]
  ok(near3([Math.abs(P(hipL)[0]), P(hipL)[1], P(hipL)[2]], DEMO6.hip.pos),
    `髖關節 ${P(hipL).map(v => v.toFixed(3))}（demo ∓${DEMO6.hip.pos.join(' / ')}）`
    + '　★ 錯了就是「腿埋在菜身裡看不到」')
  ok(Math.abs(Math.abs(hipL.rotation.y * 180 / Math.PI) - DEMO6.hip.rotYDeg) < 0.5,
    `髖關節外八 ${(hipL.rotation.y * 180 / Math.PI).toFixed(1)}°（demo ∓10°；小腿不可自己 rotation.z）`)
  const [thigh, foot] = hipL.children
  ok(Math.abs(thigh.rotation.z) < 1e-6, '小腿不可有 rotation.z（那是另一支 demo 的做法）')
  ok(near3(P(thigh), DEMO6.thigh.pos), `大腿位置 ${P(thigh).map(v => v.toFixed(3))}`)
  ok(near3(P(foot), DEMO6.foot.pos), `腳掌位置 ${P(foot).map(v => v.toFixed(3))}`)
  ok(near3(S(foot), DEMO6.foot.scale), `腳掌 scale ${S(foot).map(v => v.toFixed(2))}（demo 1.02／0.80／1.58）`)

  // ★★ 尺寸也要鎖，不能只鎖位置。四肢的**每一個半徑與長度**都被抄成
  //    cel-demo_4 的值：手掌大 20%、腳掌寬 16%、小腿短 23%、上臂長 12.5%。
  //    只驗位置的話這些全部通過（變異測試證實過）。
  const sphereR = (o) => o.geometry?.parameters?.radius ?? null
  const lathe = (o) => {                       // soft-limb 沒有 parameters，量包圍盒
    o.geometry.computeBoundingBox()
    const b = o.geometry.boundingBox
    return { len: +(b.max.y - b.min.y).toFixed(4), r: +Math.max(b.max.x, -b.min.x).toFixed(4) }
  }
  ok(Math.abs(sphereR(hand) - 0.060) < 1e-6, `手掌半徑 ${sphereR(hand)}（demo 0.060；cel-demo_4 是 0.072）`)
  ok(Math.abs(sphereR(foot) - 0.068) < 1e-6, `腳掌半徑 ${sphereR(foot)}（demo 0.068；cel-demo_4 是 0.080）`)
  {
    const a = lathe(upper), l = lathe(thigh)
    // 上臂 len 0.120 ＋ 兩端球冠 rBot 0.042 / rTop 0.051 ＝ 0.213
    ok(Math.abs(a.len - 0.213) < 0.002, `上臂全長 ${a.len}（demo 0.213；cel-demo_4 是 0.230）`)
    ok(Math.abs(a.r - 0.051) < 0.002, `上臂最粗處 ${a.r}（demo 0.051）`)
    // 小腿 len 0.130 ＋ 0.050 ＋ 0.058 ＝ 0.238
    ok(Math.abs(l.len - 0.238) < 0.002, `小腿全長 ${l.len}（demo 0.238；cel-demo_4 是 0.204）`)
    ok(Math.abs(l.r - 0.058) < 0.002, `小腿最粗處 ${l.r}（demo 0.058）`)
  }

  // 頂芽（先前整顆漏掉）
  const bud = char.body.children.find(o => o.name === 'bud')
  ok(!!bud, '★★ 一定要有頂芽（擋葉尖收攏處的縫；demo 有、移植曾整顆漏掉）')
  if (bud) {
    ok(near3(P(bud), DEMO6.bud.pos), `頂芽位置 ${P(bud).map(v => v.toFixed(3))}`)
    ok(near3(S(bud), DEMO6.bud.scale), `頂芽 scale ${S(bud).map(v => v.toFixed(2))}`)
  }

  // 接觸陰影：**必須在腳底**，不是在腰上
  ok(Math.abs(char.blob.position.y - DEMO6.blobY) <= EPS,
    `接觸陰影高度 ${char.blob.position.y.toFixed(3)}（demo −0.785 ＝ 腳底）`
    + '　★ 錯了就是「一圈半透明圓盤從腰部橫向突出」')

  // 整體包圍盒（含四肢）——這是上面每一項的總和檢查
  char.root.updateMatrixWorld(true)
  const b2 = new Box3().setFromObject(char.body)
  ok(Math.abs(b2.min.y - DEMO6.bboxY[0]) < 0.02 && Math.abs(b2.max.y - DEMO6.bboxY[1]) < 0.02,
    `菜身＋四肢的 y 範圍 ${b2.min.y.toFixed(3)}~${b2.max.y.toFixed(3)}（demo ${DEMO6.bboxY.join('~')}）`)
}

// ── ProduceStage 的相機框景（`/ar/card/:slug` 的 3D 抽屜）─────────────────
//
// ★★★ 這一段是「相機注視點也在錯誤座標系裡」那個嚴重項的閘門。
//   `lookAt(0, 0.66, 0)` 來自 cel-demo_4 的 `cam: { y: 0.62 }`，那支的角色是
//   **腳踩 y = 0**；本專案的角色中心在 −0.057 ⇒ 注視點高出約一個半身高。
//   實測（把 fit() 的算式照抄過來投影包圍盒八個角）：
//     aspect 1.18 → 上留白 45.6%、下留白 **−6.4%（裁掉）**
//     aspect 1.50 → 上留白 44.5%、下留白 **−13.4%（裁掉）**
//   與 `/ar/model` 先前那個「上方留白 52.6%、下緣被裁」是同一個成因。
//
// ⚠️ 這個檢查在 Node 就能跑（相機數學是純函式），不需要 WebGL。
//    也就是說它**本來就抓得到**——只是先前沒有人寫。
{
  const src = fs.readFileSync(new URL('../src/components/ProduceStage.jsx', import.meta.url), 'utf8')
  const aimY = Number(/camera\.lookAt\(0,\s*(-?[\d.]+),\s*0\)/.exec(src)?.[1])
  const camY = Number(/camera\.position\.set\(0,\s*(-?[\d.]+),\s*dist\)/.exec(src)?.[1])
  const fov = Number(/new PerspectiveCamera\((\d+)/.exec(src)?.[1])
  ok(Number.isFinite(aimY) && Number.isFinite(camY) && Number.isFinite(fov),
    `從 ProduceStage 讀得到相機參數（fov ${fov}／camY ${camY}／aimY ${aimY}）`)
  ok(fov === 44, `ProduceStage 的 fov ${fov}（要與 demo／ArModel 一致＝44，否則描邊粗細兩頁不同）`)

  char.root.updateMatrixWorld(true)
  const bb = new Box3().setFromObject(char.body)
  const frame = (aspect) => {
    const cam = new PerspectiveCamera(fov, aspect, 0.1, 40)
    const dist = 3.05 * Math.max(1, 1.35 / Math.max(0.35, aspect))
    cam.position.set(0, camY, dist); cam.lookAt(0, aimY, 0)
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(true)
    let lo = 1, hi = -1, L = 1, R = -1
    for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
      const v = new Vector3(x, y, z).project(cam)
      lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); L = Math.min(L, v.x); R = Math.max(R, v.x)
    }
    return { top: (1 - hi) / 2 * 100, bottom: (lo + 1) / 2 * 100, left: (L + 1) / 2 * 100, right: (1 - R) / 2 * 100 }
  }
  // ★★ 俯角也要鎖。只驗「上下留白對稱」抓不到相機高度——把相機拉高、注視點
  //    跟著對，框景仍然是對稱的，但視角會從 demo 的平視變成由上往下俯瞰。
  //    demo `_6` 的軌道相機仰角約 4°（幾乎平視），這是 Q 版角色該有的視角：
  //    俯得太多會看到頭頂一大片葉子、臉被壓縮，「擬人」的感覺就沒了。
  {
    const dist = 3.05 * Math.max(1, 1.35 / 1.18)
    const elevDeg = Math.atan2(camY - aimY, dist) * 180 / Math.PI
    ok(elevDeg >= 0 && elevDeg <= 10,
      `相機俯角 ${elevDeg.toFixed(1)}°（demo 約 4°，允許 0–10°；相機 y=1.55 那個舊值是 25°）`)
  }

  // 三種長寬比：直立手機、抽屜的實際比例、寬螢幕
  for (const a of [0.75, 1.18, 1.5]) {
    const f = frame(a)
    ok(f.top > 3 && f.bottom > 3 && f.left > 3 && f.right > 3,
      `aspect ${a}：四邊留白 上${f.top.toFixed(1)} 下${f.bottom.toFixed(1)} 左${f.left.toFixed(1)} 右${f.right.toFixed(1)}（都要 > 3%，負數＝被裁掉）`)
    // 上下留白差太多＝注視點錯了（舊值在 aspect 1.18 是 45.6 vs −6.4）
    ok(Math.abs(f.top - f.bottom) < 8,
      `aspect ${a}：上下留白要對稱（差 ${Math.abs(f.top - f.bottom).toFixed(1)}%；注視點在錯的座標系時會差 50% 以上）`)
  }
}

// 效能預算：全解析度超出策畫書 §6.1 的 180k（那份預算按舊版 29 片葉估的）。
// ProduceStage 因此預設 lod 0.85；這裡把兩個門檻都鎖起來。
ok(st.triangles > 180000, `全解析度 ${st.triangles.toLocaleString()} 確實超出 180k——所以預設要降 LOD`)
{
  const web = buildCharacter(NAPA_CABBAGE, { lod: 0.85 })
  ok(web.stats().triangles <= 180000,
    `網頁抽屜 lod 0.85 ＝ ${web.stats().triangles.toLocaleString()} ≤ 180k`)
  web.dispose()
  const ar = buildCharacter(NAPA_CABBAGE, { lod: 0.6, outlineLayers: 1 })
  ok(ar.stats().triangles <= 110000,
    `AR 疊加 lod 0.6 ＝ ${ar.stats().triangles.toLocaleString()} ≤ 110k`)
  // ⚠️ draw call ≈ mesh 數，而 **LOD 只降細分、不會減少 draw call**。
  //    要進 AR 的 ≤90 只能少描一層邊（outlineLayers: 1）。
  ok(ar.stats().meshes <= 90, `AR 疊加 draw call ${ar.stats().meshes} ≤ 90（少描一層邊）`)
  ok(st.meshes <= 140, `網頁抽屜 draw call ${st.meshes} ≤ 140`)
  ok(st.meshes > 90, '全解析度的 102 確實超出 AR 的 90——所以 AR 要傳 outlineLayers: 1')
  ar.dispose()
}

// 節點階層：接觸陰影必須掛 root 不掛 body
// ⚠️ 掛 body 的話跳躍時陰影會跟著飛起來（看起來像角色黏著一塊地板）；
//    但掛場景層級又會讓角色無法多實例（原 demo 的 getElementById('blob')）。
ok(char.blob.parent === char.root, '接觸陰影掛在 root（不隨跳躍飛起）')
ok(char.body.parent === char.root, 'body 掛在 root（動作只作用於 body）')
ok(char.blob.parent !== char.body, '接觸陰影不可掛在 body 底下')

// ── 材質快取 ──────────────────────────────────────────────────────────
// 單隻角色有 20+ 個材質，但 steps|shadowFloor 的組合只有一種
// 身體共用一張（5 階／0.58），臉另外一張（3 階／0.66，demo 特地把臉調亮）。
ok(rampCacheSize() === 2, `toon ramp 快取 ${rampCacheSize()} 張（身體 1 ＋ 臉 1；20+ 個材質不可各建一張）`)
ok(makeToonRamp(3, 0.46) === makeToonRamp(3, 0.46), '相同參數回傳同一個 ramp 實例')
ok(makeToonRamp(4, 0.46) !== makeToonRamp(3, 0.46), '不同參數不可共用 ramp')

// ── 動作：每一個 action 都要能跑滿一個循環且不吐 NaN ──────────────────
const actor = createActor(char)
for (const a of ACTIONS) {
  actor.setAction(a.id)
  let bad = null
  for (let i = 0; i < 180; i++) {          // 3 秒 @60fps
    const c = actor.update(16.7)
    const vals = [c.y, c.rx, c.ry, c.rz, c.sy, ...c.armA, ...c.armS, ...c.legA, c.leaf]
    if (!vals.every(Number.isFinite)) { bad = i; break }
  }
  ok(bad === null, `動作「${a.name}」跑 3 秒不產生 NaN（第 ${bad} 幀）`)
}
ok(ACTIONS.length === 18,
  `動作數 ${ACTIONS.length}（demo 的 12 ＋ 策畫書新增 present/point/celebrate/think）`)
// ★ demo `_6` 的 12 個動作**一個都不能少**。dance／bow 先前整個沒移植，
//   而「動作數 16」那條檢查因為多了 4 個新增動作，剛好把缺的 2 個蓋過去了。
for (const id of ['idle','wave','nod','shake','jump','walk','dance','spin','bow','shy','angry','sleep']) {
  ok(ACTIONS.some(a => a.id === id), `demo 的動作「${id}」必須存在`)
}

// sy 是縮放，絕不可 ≤0（負縮放會把法線翻面，模型變成內外顛倒）
{
  let minSy = Infinity
  for (const a of ACTIONS) {
    actor.setAction(a.id)
    for (let i = 0; i < 240; i++) minSy = Math.min(minSy, actor.update(16.7).sy)
  }
  ok(minSy > 0.5, `所有動作的 sy 最小值 ${minSy.toFixed(3)}（必須 > 0.5）`)
}

// 體積守恆：壓扁時要往兩側鼓出去
{
  actor.setAction('jump')
  for (let i = 0; i < 20; i++) actor.update(16.7)
  const s = char.body.scale
  ok(Math.abs(s.x * s.x * s.y - 1) < 1e-6, 'squash & stretch 體積守恆（sxz² × sy ＝ 1）')
  ok(s.x === s.z, 'x/z 縮放一致（不可只壓一邊）')
}

// ★ 疊加層：講話必須能與其他動作並存（原 demo 的 switch 是互斥的）
{
  actor.setAction('wave'); actor.setOverlay(null)
  const plain = actor.update(16.7)
  actor.setAction('wave'); actor.setOverlay('talk', 1)
  const talking = actor.update(16.7)
  ok(talking.leaf > plain.leaf, 'talk 疊加層會影響葉子擺動（可與揮手並存）')
  ok(talking.armA[1] > 50, 'talk 疊加時揮手的手仍然舉著（base 沒有被覆蓋）')
}

// point 的方位：指右邊要用右手且身體轉向右
{
  actor.setOverlay(null)
  actor.setAction('point'); actor.setPointAt(1)
  const right = actor.update(16.7)
  actor.setAction('idle'); actor.update(16.7)
  actor.setAction('point'); actor.setPointAt(-1)
  const left = actor.update(16.7)
  ok(right.armA[1] > right.armA[0], '指右邊時用右手')
  ok(left.armA[0] > left.armA[1], '指左邊時用左手')
  ok(right.ry > 0 && left.ry < 0, '身體轉向所指的方向')
}

// ── reduce-motion：要縮小幅度而不是整個停住 ──────────────────────────
// ⚠️ JS 驅動的動畫碰不到 CSS 的全域 animation 覆寫，必須自己讀偏好設定
//    （站上的 AnimatedText 打字機就漏過一次）。
{
  const c2 = buildCharacter(NAPA_CABBAGE)
  const calm = createActor(c2, { reduceMotion: true })
  calm.setAction('jump')
  let maxY = 0
  for (let i = 0; i < 180; i++) maxY = Math.max(maxY, Math.abs(calm.update(16.7).y))
  ok(maxY < 0.08, `reduce-motion 下跳躍幅度 ${maxY.toFixed(3)}（應遠小於 0.46）`)
  ok(maxY > 0, 'reduce-motion 仍保留微幅動態（完全靜止看起來像壞掉）')
  c2.dispose()
}

// ── LOD：AR 模式細分要真的降下來 ──────────────────────────────────────
{
  const lo = buildCharacter(NAPA_CABBAGE, { lod: 0.6 })
  const s = lo.stats()
  ok(s.triangles < st.triangles * 0.5,
    `AR LOD 三角形 ${s.triangles.toLocaleString()} < 全解析度 ${st.triangles.toLocaleString()} 的一半`)
  ok(s.meshes === st.meshes, 'LOD 不可改變 mesh 數（只降細分）')
  lo.dispose()
}

// ── dispose：SPA 反覆進出必爆的洩漏點 ────────────────────────────────
{
  const tmp = buildCharacter(NAPA_CABBAGE)
  let disposed = 0
  tmp.root.traverse(o => { if (o.isMesh) o.geometry.addEventListener?.('dispose', () => disposed++) })
  tmp.dispose()
  ok(disposed > 0, 'dispose() 有實際釋放幾何')
  // ramp 是跨角色共用的，不可被單一角色的 dispose 清掉
  ok(rampCacheSize() > 0, 'dispose() 不可清掉跨角色共用的 ramp 快取')
}

char.dispose()
disposeRampCache()
ok(rampCacheSize() === 0, 'disposeRampCache() 清空共用快取')

// ── ★ 舞台的兩件效能／正確性紀律（驗收報告 M5／M6）──
{
  const fs = await import('node:fs')
  const src = fs.readFileSync(new URL('../src/components/ProduceStage.jsx', import.meta.url), 'utf8')
  // ⚠️ 「某個舊寫法不可出現」這類檢查一定要**先剝掉註解**：說明「原本怎麼寫、
  //    為什麼不行」的註解本身就含有那個舊寫法，直接 grep 會抓到自己的說明。
  //    這是這個專案第三次踩到（check-ar 兩次：三個已移除按鈕、simRef 判斷），
  //    所以這裡不再逐處重寫，統一用這個。
  //    近似即可（不處理字串裡的 `//`），對「識別字有沒有被使用」足夠。
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  // M6：three 0.185 起 `PCFSoftShadowMap` 已棄用，會印 warn 並**自動退回**
  //     PCFShadowMap——留著它等於「拿不到柔和陰影還多吃一個警告」，兩邊都輸。
  ok(!/PCFSoftShadowMap/.test(code), '★ 不可用已棄用的 PCFSoftShadowMap（three 會自動退回並印警告）')
  // ★★★ demo `_6` **沒有**真實陰影貼圖（實測 renderer.shadowMap.enabled === false）。
  //   MeshToonMaterial 的 gradientMap 套在已乘過陰影衰減的光照上 ⇒ 被遮蔽處直接
  //   掉進最暗那一階，畫面上是大塊硬邊的深色斑，把頂點色畫出來的假 AO 蓋掉。
  ok(/shadowMap\.enabled = false/.test(src), '不可開真實陰影貼圖（demo 沒有，賽璐璐靠假 AO）')
  ok(!/PCFShadowMap/.test(src), '陰影既然關掉，就不該還留著 PCFShadowMap')

  // M5：`visibilitychange` 只涵蓋「分頁切到背景」，**不涵蓋「還開著但捲出畫面」**。
  //     卡片頁很長，看完 3D 往下讀時舞台早就在畫面外，迴圈卻還在每秒算 60 次。
  ok(/new IntersectionObserver/.test(src), '★ 舞台捲出視野時要停止算圖（不只看 document.hidden）')
  ok(/if \(hidden \|\| !onScreen\)/.test(src), '★ 迴圈要同時檢查分頁可見性與是否在視野內')
  // ⚠️ 暫停時一定要更新 last，否則回到畫面時 delta 是整段離開的時間，
  //    actor 會一次前進好幾秒（動作瞬間跳到未來，看起來像壞掉）。
  ok(/if \(hidden \|\| !onScreen\) \{ last = now; return \}/.test(src),
    '★ 暫停時要把 last 推到現在（否則回來時 actor 會一次跳好幾秒）')
  ok(/io\?\.disconnect\(\)/.test(src), 'IntersectionObserver 要在卸載時斷開')
  // ⚠️ 初值必須先假設看得見：IO 第一次回呼是非同步的，給 false 會吃掉進場動畫開頭。
  ok(/let onScreen = true/.test(src), '★ onScreen 初值為 true（IO 首次回呼前不可停算圖）')
}

if (fails.length) {
  console.error(`✗ 角色層檢查失敗 ${fails.length} 項：`)
  for (const f of fails) console.error('  · ' + f)
  process.exit(1)
}
console.log(`✓ 3D 角色層 ${pass} 項檢查全部通過（幾何、快取、動作通道、LOD、資源釋放）`)
