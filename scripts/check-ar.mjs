// ============================================================================
// AR 層閘門（`src/ar/`）—— 掛在 npm run build 上
//
// 這一層的失敗**幾乎全部是靜默的**：相機在播、心跳在跳、幀率漂亮、一個錯誤
// 都不會有，就是永遠掃不到，或者東西出現在錯的位置。所以能寫成檢查的都要寫。
//
// 分四組：
//   A. 卡面座標系（純數學，可完整驗證）
//   B. 熱區命中與遲滯
//   C. 鏡頭挑選
//   D. **靜默失敗的原始碼防線**——那些「拿掉也不會有人發現」的一行
// ============================================================================

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  uvToCard, cardToUv, rectCenter, inRect, hitTest, makeHotspotLatch, validateCard,
} from '../src/ar/cardSpace.js'
import { pickMainCameraId, listBackCameras, labelIndex } from '../src/ar/camera.js'
import { inAppBrowser } from '../src/ar/session.js'
import { OFFICIAL_CARDS } from '../src/data/arCards.js'

let pass = 0
const fail = []
const ok = (cond, msg) => { if (cond) pass++; else fail.push(msg) }
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps

/**
 * ★★ 讀原始碼時**一定要先把註解拿掉**。
 *
 * 這一檔有一整組「原始碼不可以出現 X」的檢查，而每一條的註解裡都必須解釋
 * 「為什麼不可以出現 X」——於是 X 出現在註解裡，檢查自己把自己判成失敗。
 * （我在這個專案已經被這件事咬過五次，其中一次還是反方向：註解裡的
 *   `/\bLine\//i` 含有 `//`，被天真的 stripper 當成行註解切掉，
 *   結果是**假的失敗**。）
 *
 * 所以這支 stripper 要認得字串、樣板字串與**正規表示式字面值**。
 * 判斷 `/` 是不是 regex 開頭用標準啟發式：前一個有意義的字元不是
 * 識別字／`)`／`]`／`}` 就是 regex（`a / b` 的前面一定是這幾類之一）。
 */
function stripComments(src) {
  let out = ''
  let i = 0
  let prev = ''            // 前一個有意義的字元
  const isWordish = (c) => /[\w$)\]}]/.test(c)
  while (i < src.length) {
    const c = src[i], d = src[i + 1]
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += c; i++
      while (i < src.length) {
        if (src[i] === '\\') { out += src.slice(i, i + 2); i += 2; continue }
        out += src[i]
        if (src[i] === q) { i++; break }
        i++
      }
      prev = q
      continue
    }
    if (c === '/' && !isWordish(prev)) {          // 正規表示式字面值
      out += c; i++
      while (i < src.length) {
        if (src[i] === '\\') { out += src.slice(i, i + 2); i += 2; continue }
        if (src[i] === '[') { while (i < src.length && src[i] !== ']') { out += src[i]; i++ } }
        out += src[i]
        if (src[i] === '/') { i++; break }
        i++
      }
      prev = '/'
      continue
    }
    out += c
    if (!/\s/.test(c)) prev = c
    i++
  }
  return out
}

/** CSS 只有區塊註解。 */
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')

const read = (p) => fs.readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')
const SRC = {
  camera: stripComments(read('../src/ar/camera.js')),
  tracker: stripComments(read('../src/ar/tracker.js')),
  stage: stripComments(read('../src/ar/stage.js')),
  session: stripComments(read('../src/ar/session.js')),
  scan: stripComments(read('../src/screens/Scan.jsx')),
  css: stripCss(read('../src/styles.css')),
  server: stripComments(read('../server/index.js')),
}

// ── stripper 自我測試 ──
// ⚠️ 這支若壞了，上面**所有**原始碼檢查都會靜默失效（全部變成永遠通過）。
{
  ok(stripComments('const a = 1 // 註解裡有 /AR 與 http://x\nconst b = 2').includes('const b = 2'),
    'stripper：切掉行註解')
  ok(!stripComments('const a = 1 // captureStream\n').includes('captureStream'),
    'stripper：註解裡的關鍵字確實被拿掉')
  ok(stripComments("if (/\\bLine\\//i.test(ua)) return 'LINE'").includes("return 'LINE'"),
    '★ stripper：含 // 的正規表示式字面值不可被當成行註解（這一條咬過一次，是反方向的假失敗）')
  ok(stripComments('const r = a / b // x\nconst c = 3').includes('const c = 3'),
    'stripper：除法不會被誤認為 regex 而吃掉後面')
  ok(stripComments("const s = 'http://a.com' // y").includes('http://a.com'),
    '★ stripper：字串裡的 // 不可被切掉')
  ok(!stripComments('/* 區塊\n captureStream */ const z = 1').includes('captureStream'),
    'stripper：切掉區塊註解')
  ok(stripComments('const re = /[/]/g; const w = 9').includes('const w = 9'),
    'stripper：regex 的字元類別裡有 / 也不會斷')
}

// ── A. 卡面座標系 ────────────────────────────────────────────────────────
//
// 約定（由上游 controller.js 的 `_glModelViewMatrix` 推導，不是量的）：
// worldMatrix 消費的空間 ＝ 目標圖像素、**原點左下、y 朝上**、+z 離開紙面。
const W = 1831, H = 1335

{
  // 四個角：UV 原點左上 → 卡面座標原點左下
  const [x0, y0] = uvToCard(0, 0, W, H)          // 左上
  ok(near(x0, 0) && near(y0, H), '★ UV(0,0)（卡面左上）→ 卡面座標 (0, H)')
  const [x1, y1] = uvToCard(1, 1, W, H)          // 右下
  ok(near(x1, W) && near(y1, 0), '★ UV(1,1)（卡面右下）→ 卡面座標 (W, 0)')
  const [xc, yc] = uvToCard(0.5, 0.5, W, H)
  ok(near(xc, W / 2) && near(yc, H / 2), 'UV 中心 → 卡面中心')

  // ★★ 這一項是整個座標系的核心：**v 增加（往卡面下方）時 y 必須減少**。
  //    寫反的話角色會站在卡片上下鏡射的位置——正對卡片時幾乎看不出來，
  //    而舊版正是為了這個保留了一個「量出來、不可憑直覺改」的符號常數。
  const [, yTop] = uvToCard(0.5, 0.2, W, H)
  const [, yBot] = uvToCard(0.5, 0.8, W, H)
  ok(yTop > yBot, '★★ 卡面往下（v 變大）⇒ 卡面座標 y 變小（y 朝上）')

  // 往返
  let roundTrip = true
  for (const [u, v] of [[0, 0], [1, 1], [0.5, 0.5], [0.137, 0.842], [0.9, 0.03]]) {
    const [x, y] = uvToCard(u, v, W, H)
    const [u2, v2] = cardToUv(x, y, W, H)
    if (!near(u, u2, 1e-12) || !near(v, v2, 1e-12)) roundTrip = false
  }
  ok(roundTrip, 'uvToCard / cardToUv 互為反函式')

  // z 直接透傳（離開紙面），不參與翻轉
  ok(uvToCard(0.5, 0.5, W, H, 12)[2] === 12, 'z 原樣帶出（+z 離開紙面）')

  // 反例：若有人把 uvToCard 改成不翻 y，上面那項一定要抓到
  const wrong = (u, v) => [u * W, v * H, 0]
  ok(wrong(0.5, 0.2)[1] < wrong(0.5, 0.8)[1], '反例：不翻 y 的寫法確實會讓上面那項失敗')
}

// ── B. 熱區 ──────────────────────────────────────────────────────────────
{
  // ⚠️ 邊界值刻意用二進位可精確表示的數（0.25/0.5）。
  //    用 0.2+0.4 的話右緣是 0.6000000000000001，測「不含右邊界」會因為浮點
  //    誤差而失敗——那是測試自己的問題，不是 inRect 的問題（差距小於一個 ULP，
  //    對應到卡面上是零點幾奈米，不值得為它改判斷式）。
  const r = { x: 0.25, y: 0.25, w: 0.5, h: 0.25 }
  ok(inRect(0.25, 0.25, r), '含左上角')
  ok(!inRect(0.75, 0.25, r), '不含右邊界')
  ok(!inRect(0.25, 0.5, r), '不含下邊界')
  ok(inRect(0.7499, 0.4999, r), '邊界內側算命中')

  // 重疊時取面積最小的：卡面上大框套小框是常態，取大的等於小的永遠點不到
  const big = { id: 'big', rect: { x: 0, y: 0, w: 1, h: 1 } }
  const small = { id: 'small', rect: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 } }
  ok(hitTest([big, small], 0.5, 0.5)?.id === 'small', '★ 重疊時取面積最小的熱區')
  ok(hitTest([big, small], 0.05, 0.05)?.id === 'big', '只在大框內時取大框')
  ok(hitTest([], 0.5, 0.5) === null, '沒有熱區回 null')
  ok(hitTest(null, 0.5, 0.5) === null, 'hotspots 是 null 也不可炸')

  const [cu, cv] = rectCenter(r)
  ok(near(cu, 0.5) && near(cv, 0.375), 'rectCenter')

  // 遲滯：進 3 幀、離 8 幀，且**進出門檻必須不同**
  const l = makeHotspotLatch()
  ok(l.push('a').changed === false && l.push('a').changed === false, '進入前兩幀不切換')
  ok(l.push('a').changed === true && l.current === 'a', '第 3 幀才確認進入')
  let left = false
  for (let i = 0; i < 7; i++) left = left || l.push(null).changed
  ok(!left, '離開前 7 幀不切換（比進入寬鬆）')
  ok(l.push(null).changed === true && l.current === null, '第 8 幀才確認離開')

  // 抖動：a/null 交替不可造成任何切換
  const l2 = makeHotspotLatch()
  l2.push('a'); l2.push('a'); l2.push('a')
  let flips = 0
  for (let i = 0; i < 20; i++) if (l2.push(i % 2 ? null : 'a').changed) flips++
  ok(flips === 0, '★ 邊界抖動（每隔一幀掉出去）不會造成任何開關')

  const l3 = makeHotspotLatch({ enterFrames: 1, leaveFrames: 1 })
  ok(l3.push('x').changed === true, '門檻可調')
}

// ── C. 鏡頭挑選 ──────────────────────────────────────────────────────────
{
  const v = (label, deviceId = label) => ({ kind: 'videoinput', label, deviceId })

  ok(labelIndex('camera2 2, facing back') === 2, 'labelIndex 解析 Android 的 camera2 N')
  ok(labelIndex('camera 0, facing back') === 0, 'labelIndex 解析 camera N')
  ok(labelIndex('Back Camera') === Number.POSITIVE_INFINITY, '沒有編號時回 Infinity（排最後）')

  // ★ Android：label 完全沒有語意，只能靠編號。慣例是編號越小越接近主鏡頭。
  ok(pickMainCameraId([
    v('camera2 0, facing back'), v('camera2 1, facing front'),
    v('camera2 2, facing back'), v('camera2 3, facing back'),
  ]) === 'camera2 0, facing back', '★★ Android 無語意 label：取編號最小的後鏡頭')

  // iPhone：label 有語意，關鍵字排除法要生效
  ok(pickMainCameraId([v('Back Ultra Wide Camera'), v('Back Camera'), v('Front Camera')])
    === 'Back Camera', '★ iPhone：避開 Back Ultra Wide')
  ok(pickMainCameraId([v('後置超廣角相機'), v('後置相機')]) === '後置相機', '中文 label 也避得開超廣角')
  ok(pickMainCameraId([v('後置相機 0.5x'), v('後置主相機')]) === '後置主相機', '0.5x 命名也算超廣角')

  // ★★ 全部都是超廣角時要回 null（交給 facingMode），不可硬選一顆已知不好的
  ok(pickMainCameraId([v('Back Ultra Wide'), v('後置超廣角')]) === null,
    '★★ 全是超廣角 → 回 null 讓瀏覽器用 facingMode 決定')
  ok(pickMainCameraId([v('Back Camera')]) === null, '只有一顆就沒得挑，回 null')
  ok(pickMainCameraId([{ kind: 'videoinput', label: '', deviceId: 'a' },
    { kind: 'videoinput', label: '', deviceId: 'b' }]) === null, '未授權（label 空）→ 回 null')
  ok(pickMainCameraId([]) === null && pickMainCameraId(null) === null, '空輸入不可炸')

  const list = listBackCameras([v('camera2 2, facing back'), v('camera2 0, facing back'), v('camera2 1, facing front')])
  ok(list.length === 2 && list[0].index === 0, 'listBackCameras 濾掉前鏡頭並依編號排序')

  ok(inAppBrowser('Mozilla/5.0 Line/13.1.0') === 'LINE', '認得 LINE 內建瀏覽器')
  ok(inAppBrowser('Mozilla/5.0 [FBAN/FBIOS]') === 'Facebook', '認得 FB 內建瀏覽器')
  ok(inAppBrowser('Mozilla/5.0 Instagram 300') === 'Instagram', '認得 IG 內建瀏覽器')
  ok(inAppBrowser('Mozilla/5.0 Chrome/120') === null, '一般瀏覽器不誤報')
}

// ── D. 靜默失敗的原始碼防線 ──────────────────────────────────────────────
//
// 底下每一項都對應一個**實際踩過、而且完全不會報錯**的坑。拿掉那一行不會有
// 任何測試變紅、畫面也完全正常，只是功能是壞的——所以只能用原始碼比對來鎖。
{
  // ★★★ MindAR 的 InputLoader 讀的是 <video> 的 width/height **屬性**：
  //     context.drawImage(input, 0, 0, input.width, input.height)
  //   屬性沒設時是 0 ⇒ 畫一張 0×0 ⇒ 追蹤每幀都在分析全黑畫布 ⇒ 永遠掃不到，
  //   而相機在播、心跳照跳、幀率漂亮、一個錯誤都沒有。
  ok(/setAttribute\('width',\s*String\(video\.videoWidth\)\)/.test(SRC.camera)
    && /setAttribute\('height',\s*String\(video\.videoHeight\)\)/.test(SRC.camera),
  '★★★ camera.attach 必須設 <video> 的 width/height 屬性（InputLoader 讀屬性不是 videoWidth）')

  // ★★★ 同源 worker 必須在 addImageTargets **之前**換掉：
  //   `setup` 訊息（含 matchingDataList）是在那支方法裡才 postMessage 的，
  //   換晚了新 worker 收不到目標資料 ⇒ 永遠比對不出東西，完全沒有錯誤訊息。
  const iWorker = SRC.tracker.indexOf('controller.worker = w')
  const iTargets = SRC.tracker.indexOf('addImageTargets')
  ok(iWorker > 0 && iTargets > 0 && iWorker < iTargets,
    '★★★ 換同源 worker 必須在 addImageTargets 之前')

  // ⚠️ 是 `?worker` 不是 `?worker&inline`：inline 會產生 blob worker，
  //    那就得靠 CSP 放行 worker-src blob:，而漏設時失效完全靜默。
  ok(/controller\.worker\.js\?worker'/.test(SRC.tracker)
    && !/\?worker&inline/.test(SRC.tracker),
  '★★ worker 必須是同源（?worker），不可用 ?worker&inline')

  // 兩個 done 分支缺一不可，漏接任何一個對應的 Promise 就永遠不 resolve
  ok(/workerMatchDone/.test(SRC.tracker) && /workerTrackDone/.test(SRC.tracker),
    '★★ 同源 worker 的 onmessage 要同時接 matchDone 與 trackUpdateDone')

  // 伺服器端的 CSP 仍要放行 blob worker（雙保險：萬一同源那條路失敗會退回內建）
  ok(/workerSrc:\s*\[[^\]]*'blob:'/.test(SRC.server) && /childSrc:\s*\[[^\]]*'blob:'/.test(SRC.server),
    '★★ CSP 仍要保留 workerSrc/childSrc 的 blob:（同源 worker 失敗時的退路）')

  // ★★ probeFeatures 絕不可用 controller.match()：
  //   `workerMatchDone` 是**單一欄位不是佇列**，與處理迴圈同時送 match 會覆蓋
  //   前一個 resolver ⇒ 前一個 Promise 永遠不 resolve ⇒ 追蹤整個靜默卡死。
  const probe = SRC.tracker.slice(SRC.tracker.indexOf('async probeFeatures'),
    SRC.tracker.indexOf('async selfTest'))
  ok(probe.includes('controller.detect(') && !/controller\.match\(|_workerMatch|_detectAndMatch/.test(probe),
    '★★★ probeFeatures 只能用 controller.detect（不碰 worker），否則會與處理迴圈搶 workerMatchDone')

  // selfTest 會用 worker，所以**必須**先停迴圈，而且要在 finally 裡接回去
  const self = SRC.tracker.slice(SRC.tracker.indexOf('async selfTest'))
  ok(self.includes('stopProcessVideo'), '★ selfTest 必須先停即時迴圈（它會用 worker）')
  ok(/finally\s*\{[\s\S]*processVideo\(video\)/.test(self),
    '★★ selfTest 必須在 finally 裡把即時追蹤接回去（否則測完就再也不追蹤了）')
  ok(!/captureStream/.test(SRC.tracker),
    '★★ selfTest 不可走 canvas.captureStream（iOS 支援不穩，會給假失敗）')

  // ★★ three 的矩陣是 column-major，裁切修正改的是**列**：0,4,8,12 與 1,5,9,13。
  //    寫成行的話橫向與縱向的修正會互換，正方形畫面上完全看不出來。
  ok(/\[0,\s*4,\s*8,\s*12\][\s\S]{0,80}kx/.test(SRC.stage)
    && /\[1,\s*5,\s*9,\s*13\][\s\S]{0,80}ky/.test(SRC.stage),
  '★★ 裁切修正必須乘在投影矩陣的第 0/1 **列**（column-major 索引 0,4,8,12 與 1,5,9,13）')

  // ★★ 覆寫投影矩陣之後絕不可再呼叫 updateProjectionMatrix()，那會整個蓋掉
  ok(!/updateProjectionMatrix\(\)/.test(SRC.stage),
    '★★ 不可呼叫 updateProjectionMatrix（會覆蓋我們寫進去的投影矩陣）')

  // ★ matrixAutoUpdate 必須關掉，否則 three 每幀用 position/rotation 重算 matrix，
  //   把 worldMatrix 蓋掉（模型會固定在原點不動）
  ok(/card\.matrixAutoUpdate\s*=\s*false/.test(SRC.stage),
    '★★ 卡片節點必須關 matrixAutoUpdate（否則姿態每幀被蓋掉）')
  ok(/card\.updateMatrixWorld\(true\)/.test(SRC.stage),
    '★ setPose 之後要手動 updateMatrixWorld（否則 raycast 打到上一幀的位置）')

  // ★ 換鏡頭／轉向之後一定要重算投影，否則模型整個偏掉
  ok(/setViewport\(containerW,\s*containerH,\s*videoW,\s*videoH\)/.test(SRC.stage),
    '★ resize 必須連投影一起重算（解析度變了投影沒換 ⇒ 模型偏掉）')

  // ★ WebGL context 要釋放，否則反覆進出這一頁會「第 N 次打開變成空白」
  ok(/forceContextLoss/.test(SRC.stage), '★ dispose 要 forceContextLoss（行動裝置 context 數有上限）')
  ok(/stopStream\(stream\)/.test(SRC.session), '★ dispose 要停相機串流（否則指示燈還亮著）')

  // ★★ 疊層：任何一層拿到負 z-index 都會被 .scan-stage 的深色背景蓋住＝全黑，
  //    而追蹤數字全部正常。
  ok(/\.scan-video\s*\{[^}]*z-index:\s*0/.test(SRC.css), '★★ .scan-video 的 z-index 必須是 0（不可為負）')
  ok(/\.scan-canvas\s*\{[^}]*z-index:\s*1/.test(SRC.css), '★★ .scan-canvas 疊在影像之上（z-index 1）')
  ok(!/\.scan-(video|canvas)\s*\{[^}]*z-index:\s*-/.test(SRC.css), '★★★ 取景層不可出現負的 z-index')
  ok(/\.scan-video\[hidden\]/.test(SRC.css),
    '★ hidden 屬性要明確寫回 display:none（position/width 宣告會蓋掉它，否則出現黑幕）')

  // ★★ 目標檔要在開相機**之前**確認，而且只看 res.ok 不夠
  //    （缺檔時 SPA fallback 回 200 + index.html，錯誤會偽裝成「檔案損毀」）
  ok(/content-type[\s\S]{0,80}text\/html/.test(SRC.session),
    '★★ targetExists 必須檢查 content-type（SPA fallback 會回 200 + HTML）')
  ok(!/force-cache/.test(SRC.session), '★ 抓目標檔不可用 force-cache（會把 HTML 快取起來）')
  const startBody = SRC.session.slice(SRC.session.indexOf('async start('))
  ok(startBody.indexOf('targetExists') < startBody.indexOf('openCamera'),
    '★ 目標檔檢查要在開相機之前（缺檔的症狀與「沒對準」一模一樣）')

  // ★★★ 終局狀態不可被非同步回呼覆蓋。
  //   實測：createStage 拋錯 ⇒ 狀態正確變成 failed，但追蹤器是獨立跑的，
  //   它幾秒後的 onFound 又把狀態推成 locked ⇒ 畫面說「已對準」而什麼都沒算繪。
  ok(/const TERMINAL = new Set\(/.test(SRC.session) && /if \(fatal\) return/.test(SRC.session),
    '★★★ 終局狀態要 latch 住（否則失敗會被後到的 onFound 覆蓋成「已對準」）')
  ok(/TERMINAL[\s\S]{0,200}'failed'/.test(SRC.session), 'failed 要列進終局狀態')
  // 啟動失敗時要把已經起來的追蹤器收掉（否則它繼續吃 CPU 與相機）
  ok(/catch \(e\)[\s\S]{0,400}tracker\?\.dispose\(\)/.test(SRC.session),
    '★ 啟動失敗要 dispose 已建立的 tracker/stage 並停串流')

  // ★★ Object3D.position 是唯讀屬性，指派會丟 TypeError
  ok(!/Object\.assign\([^)]*\{\s*position:/.test(SRC.stage),
    '★★★ 不可用 Object.assign 設 Object3D.position（唯讀，會丟 TypeError）')

  // ★★ 容器大小要用 ResizeObserver 盯，不能只聽 window resize
  ok(/new ResizeObserver/.test(SRC.session) && /ro\?\.observe\(container\)/.test(SRC.session),
    '★★ 要用 ResizeObserver 盯容器（網址列收合／版面推開不會觸發 window resize）')
  ok(/ro\?\.disconnect\(\)/.test(SRC.session), 'dispose 要 disconnect ResizeObserver')

  // ★★ 心跳看門狗的判準只能是「心跳是 0」——不可用「有沒有追到」，
  //    沒追到是常態（沒對準也是這樣），拿它報錯就是誤報。
  ok(/ticks\(\)\s*\?\?\s*0\)\s*===\s*0/.test(SRC.session),
    '★★ 看門狗的失敗判準必須是「心跳 === 0」')

  // ★ 解析度必須明講；ideal 不可換成 exact（exact 不支援時相機完全開不起來）
  ok(/width:\s*\{\s*ideal:\s*1280\s*\}/.test(SRC.camera) && /height:\s*\{\s*ideal:\s*960\s*\}/.test(SRC.camera),
    '★★ getUserMedia 必須指定解析度（只給 facingMode 會拿到 640×480）')
  ok(!/width:\s*\{\s*exact:/.test(SRC.camera), '★★ 解析度不可用 exact（會丟 OverconstrainedError）')
  ok(/facingMode/.test(SRC.camera) && /video:\s*true/.test(SRC.camera),
    '★ 開相機要有三層 fallback（deviceId → facingMode → 任意）')

  // ★ warmupTolerance：上游預設 5（＝連續 6 幀）在手持低幀率下太高，
  //   而暖機期間畫面完全沒有回饋，看起來就是「完全掃不到」。
  ok(/const WARMUP = 1\b/.test(SRC.tracker), '★ warmupTolerance 降到 1（不是調低比對門檻，是防抖）')
  ok(/const MISS = 10\b/.test(SRC.tracker), '★ missTolerance 放寬到 10（低幀率下內容才不會閃')

  // ★★★ session.js 在主 bundle 裡（Scan.jsx 靜態 import 它），所以它**不可以**
  //   靜態 import stage.js（three）或 tracker.js（TFJS）。實測靜態 import 一支
  //   就讓主 bundle 從 458 kB 變成 976 kB——首頁替一個多數人不會點的功能多背半 MB。
  ok(!/^import[^\n]*from '\.\/(stage|tracker)\.js'/m.test(SRC.session),
    '★★★ session.js 不可靜態 import stage/tracker（three 與 TFJS 會被拉進主 bundle）')
  ok(/await import\('\.\/stage\.js'\)/.test(SRC.session) && /await import\('\.\/tracker\.js'\)/.test(SRC.session),
    '★★ stage 與 tracker 一律動態 import')
  ok(!/^import[^\n]*from 'three'/m.test(SRC.session) && !/^import[^\n]*from 'three'/m.test(SRC.camera),
    '★★ session/camera 不可碰 three')

  // ── Scan.jsx：這一頁只能是狀態的純函式 ──
  ok(!/getUserMedia/.test(SRC.scan), '★★ Scan.jsx 不可自己開相機（session 已經開了一路）')
  ok(!/from 'three'/.test(SRC.scan), '★ Scan.jsx 不可直接碰 three')
  // ★★ video/canvas 不可條件掛載：session.start() 當下就要拿到這兩個節點
  ok(/<video ref=\{videoRef\}/.test(SRC.scan) && /<canvas ref=\{canvasRef\}/.test(SRC.scan),
    'Scan.jsx 自己渲染 video 與 canvas（疊層交給樣式表）')
  ok(!/\{live && \(?\s*<video|\{status === 'ready' && \(?\s*<video/.test(SRC.scan),
    '★★ video/canvas 不可條件掛載（start() 會拿到 null），要用 hidden 屬性')
  // 手動點選必須暫停中心瞄準，否則約 0.3 秒後就被蓋掉（「點了會跳回去」）
  ok(/MANUAL_HOLD_MS/.test(SRC.session) && /manualUntil/.test(SRC.session),
    '★ 手動選取要暫停中心瞄準一段時間')
}

// ── E. 官方卡包 ──────────────────────────────────────────────────────────
{
  ok(OFFICIAL_CARDS.length > 0, '至少有一張官方卡')
  for (const c of OFFICIAL_CARDS) {
    const bad = validateCard(c)
    ok(bad.length === 0, `卡片 ${c.slug} 定義有問題：${bad.join('；')}`)
    ok(/\.mind$/.test(c.mindTarget), `${c.slug}：mindTarget 必須是 .mind`)
    // ★ 三者必須同一版：.mind、卡面圖、hotspots。檔名不同源最容易走鐘。
    ok(c.mindTarget.includes(c.slug) && c.target.includes(c.slug),
      `${c.slug}：.mind 與卡面圖的檔名都要含 slug（三者同版的最低保證）`)
  }

  // ★★★ 3D 角色錨在 **primary** 熱區，不可綁「目前選中的熱區」。
  //   使用者最自然的動作是把整張卡擺在畫面正中央 ⇒ 中心落在某個沒有 model 的
  //   熱區上 ⇒ 白菜永遠不出現，而卡面上白紙黑字印著「掃描主物件：結球白菜」。
  const card = OFFICIAL_CARDS[0]
  const centreHit = hitTest(card.hotspots, 0.5, 0.5)
  const primary = card.hotspots.find(h => h.primary)
  ok(!!primary, '★★ 一定要有 primary 熱區')
  ok(/find\(h => h\.primary\)/.test(SRC.session),
    '★★★ 角色必須錨在 primary 熱區（畫面中心常落在沒有模型的熱區上）')
  // 這個事實本身要釘住：中心確實會落在別的熱區
  ok(centreHit && centreHit.id !== primary.id,
    `★ 已確認畫面中心落在「${centreHit?.label ?? '（無）'}」而不是 primary，所以上一項不可拿掉`)

  // 熱區不可完全重疊（那樣小的永遠選不到，等於少一個）
  let dup = false
  for (let i = 0; i < card.hotspots.length; i++) {
    for (let j = i + 1; j < card.hotspots.length; j++) {
      const a = card.hotspots[i].rect, b = card.hotspots[j].rect
      if (near(a.x, b.x, 1e-6) && near(a.y, b.y, 1e-6) && near(a.w, b.w, 1e-6) && near(a.h, b.h, 1e-6)) dup = true
    }
  }
  ok(!dup, '沒有兩個熱區的 rect 完全相同')

  // 每個熱區的中心都要能命中它自己（標錯不會拋錯，只會讓使用者點不到）
  let selfHit = true
  for (const h of card.hotspots) {
    const [u, v] = rectCenter(h.rect)
    const got = hitTest(card.hotspots, u, v)
    // 被更小的熱區覆蓋是允許的，但中心至少要命中「某個」熱區
    if (!got) selfHit = false
  }
  ok(selfHit, '每個熱區的中心都命中得到熱區')

  // validateCard 的反例：這些寫法必須被抓到
  ok(validateCard({ ...card, hotspots: [{ id: 'x', rect: { x: 0.9, y: 0, w: 0.5, h: 0.1 } }] }).length > 0,
    '反例：rect 超出 0..1 要被抓到')
  ok(validateCard({ ...card, mindTarget: null }).length > 0, '反例：缺 mindTarget 要被抓到')
  ok(validateCard(null).length > 0, '反例：空卡片要被抓到')
}

if (fail.length) {
  console.error(`\n✗ AR 層有 ${fail.length} 項未通過：`)
  for (const f of fail) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log(`✓ AR 層 ${pass} 項檢查全部通過（卡面座標系、熱區遲滯、鏡頭挑選、靜默失敗防線、官方卡包）`)
