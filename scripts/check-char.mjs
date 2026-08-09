// 3D 角色層的回歸測試（src/lib/char/*）
//
// 為什麼要有這支：這一層跟 almanac／AR 幾何一樣是「寫錯不會拋錯」的程式碼。
// 幾何算錯只會讓模型長歪、材質快取失效只會讓記憶體多吃幾十 MB、
// 動作通道寫反只會讓手往後翻——全部都要用眼睛看才發現，而 CI 沒有眼睛。
//
// 這支在 Node 跑（BufferGeometry 不需要 WebGL context），所以掛在 build 前面。
// 執行：node scripts/check-char.mjs
import { Box3, Vector3 } from 'three'
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
//    5 層 × 3 ＝ 15，＋臉葉 1 ＝ 16；再加芯 1、四肢 4、菜根 1、臉貼片 1、陰影 1 ＝ 24。
//    ⚠️ 臉葉的 key 一定要含 face 旗標，共用到別片會讓其他葉子中間出現一塊白色平面。
ok(st.geometries === 24,
  `幾何份數 ${st.geometries}（應為 24：葉 15 ＋ 臉葉 1 ＋ 芯 1 ＋ 四肢 4 ＋ 根 1 ＋ 臉貼片 1 ＋ 陰影 1）`)
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
  ok(/shadowMap\.type = PCFShadowMap/.test(src), '陰影型別用 PCFShadowMap')

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
