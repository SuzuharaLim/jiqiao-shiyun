// 3D 角色層的回歸測試（src/lib/char/*）
//
// 為什麼要有這支：這一層跟 almanac／AR 幾何一樣是「寫錯不會拋錯」的程式碼。
// 幾何算錯只會讓模型長歪、材質快取失效只會讓記憶體多吃幾十 MB、
// 動作通道寫反只會讓手往後翻——全部都要用眼睛看才發現，而 CI 沒有眼睛。
//
// 這支在 Node 跑（BufferGeometry 不需要 WebGL context），所以掛在 build 前面。
// 執行：node scripts/check-char.mjs
import { buildCharacter, NAPA_CABBAGE } from '../src/lib/char/factory.js'
import { createActor, ACTIONS } from '../src/lib/char/actor.js'
import { rampCacheSize, disposeRampCache, makeToonRamp } from '../src/lib/char/material.js'
import { buildLeafGeometry } from '../src/lib/char/geometry.js'

let pass = 0
const fails = []
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

// ── 幾何：NaN 是這一層最危險的失敗模式 ────────────────────────────────
// ⚠️ 剝離 A-Frame 時 schema 預設值會消失。buildLeafGeometry 讀 d.topWaveFreq，
//    而 LAYERS 那五筆設定裡沒有這個欄位——少了預設值就是 sin(undefined)=NaN，
//    整份 position 變 NaN、模型整個不見，而且**不會拋任何錯誤**。
{
  const g = buildLeafGeometry()
  const p = g.attributes.position.array
  ok(p.every(Number.isFinite), '葉片頂點無 NaN（預設參數）')
  ok(g.attributes.normal.array.every(Number.isFinite), '葉片法線無 NaN')
  ok(!!g.getIndex(), '葉片是 indexed（inverted-hull 描邊的前提）')
  ok(g.attributes.color.count === g.attributes.position.count, '頂點色數量對齊')
  // 明確重現「忘了給 topWaveFreq」的情境，確認預設值有補上
  const g2 = buildLeafGeometry({ height: 1.0, radius: 0.3, segU: 6, segV: 8 })
  ok(g2.attributes.position.array.every(Number.isFinite), '只給部分參數也不可產生 NaN')
}

// ── 組裝：節點數與原 demo 必須一致 ────────────────────────────────────
const char = buildCharacter(NAPA_CABBAGE)
const st = char.stats()

// 原 demo 的 HUD 讀數推導：葉片 29 ＋ 葉描邊 13 ＋ 菜芯 2 ＋ 四肢 8 ＋ 四肢描邊 8
//                        ＋ 臉 1 ＋ 接觸陰影 1 ＝ 62（demo 的 63 含場景地板）
ok(st.meshes === 62, `mesh 數 ${st.meshes}（應為 62：與原 demo 扣掉地板後一致）`)

// ⚠️ 幾何快取：每層葉子只有 3 種高度變體，原本每片各建一份＝29 份。
//    快取後 5 層 × 3 ＝ 15 份。這一項若退回 29，畫面完全看不出差別，
//    只有記憶體與載入時間變差（策畫書 §6.2 #11）。
ok(st.geometries === 15 + 1 + 4 + 1 + 1,
  `幾何份數 ${st.geometries}（應為 22：葉 15 ＋ 芯 1 ＋ 四肢 4 ＋ 臉 1 ＋ 陰影 1）`)
ok(st.triangles > 0 && Number.isFinite(st.triangles), `三角形數 ${st.triangles.toLocaleString()}`)

// 節點階層：接觸陰影必須掛 root 不掛 body
// ⚠️ 掛 body 的話跳躍時陰影會跟著飛起來（看起來像角色黏著一塊地板）；
//    但掛場景層級又會讓角色無法多實例（原 demo 的 getElementById('blob')）。
ok(char.blob.parent === char.root, '接觸陰影掛在 root（不隨跳躍飛起）')
ok(char.body.parent === char.root, 'body 掛在 root（動作只作用於 body）')
ok(char.blob.parent !== char.body, '接觸陰影不可掛在 body 底下')

// ── 材質快取 ──────────────────────────────────────────────────────────
// 單隻角色有 20+ 個材質，但 steps|shadowFloor 的組合只有一種
ok(rampCacheSize() === 1, `toon ramp 快取 ${rampCacheSize()} 張（20+ 個材質應共用 1 張）`)
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
ok(ACTIONS.length === 16, `動作數 ${ACTIONS.length}（原有 12 ＋ 策畫書新增 present/point/celebrate/think）`)

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
  ok(s.triangles < st.triangles * 0.75,
    `AR LOD 三角形 ${s.triangles.toLocaleString()} < 全解析度 ${st.triangles.toLocaleString()} 的 75%`)
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

if (fails.length) {
  console.error(`✗ 角色層檢查失敗 ${fails.length} 項：`)
  for (const f of fails) console.error('  · ' + f)
  process.exit(1)
}
console.log(`✓ 3D 角色層 ${pass} 項檢查全部通過（幾何、快取、動作通道、LOD、資源釋放）`)
