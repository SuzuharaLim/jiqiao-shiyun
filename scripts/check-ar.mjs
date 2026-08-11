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
import { cpuInputSize } from '../src/ar/cpuPipeline.js'
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
  cpu: stripComments(read('../src/ar/cpuPipeline.js')),
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

  // ★★★ 「認出來」只能看比對，不可等上游的光流追蹤。
  //   上游要 showing=true 需要：比對成功 ＋ 同一幀 `_trackAndUpdate` 成功 ＋
  //   連續 warmupTolerance+1 幀。比對成功但光流跟不上時，畫面上**永遠沒有反應**，
  //   而這個失敗模式只呼叫 `_detectAndMatch` 的離線測試完全看不到。
  //   我們的動線只需要認出一次就跳走，所以直接繞過那道關卡。
  ok(/controller\._detectAndMatch = async/.test(SRC.tracker),
    '★★★ 必須攔截 _detectAndMatch，比對一成功就宣告 found（不等光流追蹤）')
  ok(/getWorldMatrix\(r\.modelViewTransform/.test(SRC.tracker),
    '★★ 攔截後要自己把 modelViewTransform 換成 worldMatrix（上游只在 showing 時才做）')
  ok(/matches: \(\) => matches/.test(SRC.tracker), '★ 對外要吐比對成功次數（診斷用）')
  // ★★ 灰階尺度自動校正：只在結構性偏差（差 255 倍）時才動，且要能還原。
  //   ⚠️ 實測（注入 0~1 的壞 shader）：尺度壞掉時**特徵點會是 0**，
  //      所以「特徵點很多卻比對不到」的裝置**不是**這個成因——別搞混。
  ok(/autoFixInputScale/.test(SRC.tracker), '★ 要有灰階尺度自動校正')
  ok(/before\.max <= 1\.5[\s\S]{0,60}before\.max > 1000/.test(SRC.tracker),
    '★★ 只在明顯結構性偏差時才校正（不可把「畫面本來就暗」誤判成要校正）')
  ok(/loader\.program = original/.test(SRC.tracker), '★★ 校正沒效要還原，不可留下改過卻沒用的 shader')
  // 校正要包住整個 setOutput 運算式，不可去字串比對 `* 255.0`
  //（上游改寫法時字串比對會靜默失效）。用單純的子字串檢查，避免把 regex 寫壞。
  ok(SRC.tracker.includes('setOutput') && !SRC.tracker.includes(".replace('* 255.0'"),
    '★ 校正要包住整個 setOutput 運算式，不可字串比對 `* 255.0`（上游改寫法會靜默失效）')
  // ★★ 繞過 warmup 之後要自己把「防誤判」補回來：上游的 warmupTolerance 身兼
  //   「等光流穩定」與「去抖動」兩職，只認一次比對就跳轉會把後者一起丟掉，
  //   而這條動線誤跳的代價是直接把人送到另一頁。
  ok(/const MATCH_CONFIRM = 2/.test(SRC.tracker), '★★ 要有比對確認次數（防誤判）')
  ok(/matches >= \(cpu \? MATCH_CONFIRM_CPU : MATCH_CONFIRM\)/.test(SRC.tracker),
    '★★ 宣告 found 前要達到確認次數（兩種後端各自的門檻）')
  // ★★ CPU 後備的門檻可以是 1（一輪要 3~8 秒，多等一輪的成本遠高於誤跳），
  //    但**絕不可是 0**——那等於完全沒有確認。
  ok(/const MATCH_CONFIRM_CPU = [1-9]/.test(SRC.tracker),
    '★★ CPU 後備的確認次數至少是 1')
  ok(/已認出 \{st\.matches\} 次/.test(SRC.scan),
    '★★ 比對成功次數要在搜尋當下就看得見（>0 與 =0 的下一步完全不同）')
  // ★★★ selfTest 餵的是**內建卡面圖**，絕不可走被攔截的版本——否則自我測試
  //   一成功就會宣告「認出來了」並跳去模型頁，而使用者的卡片根本沒被認出來。
  //   那是假成功，而且自我測試是自動跑的，會發生在最不該被誤導的那群人身上。
  {
    const self = SRC.tracker.slice(SRC.tracker.indexOf('async selfTest'))
    ok(/origDetectAndMatch\(inputT, \[0\]\)/.test(self),
      '★★★ selfTest 必須呼叫未被攔截的 origDetectAndMatch（否則會假成功並誤跳轉）')
    ok(!/await controller\._detectAndMatch/.test(self),
      '★★★ selfTest 不可呼叫被攔截的 controller._detectAndMatch')
  }

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
  // ★★★ 判準必須是「心跳**有沒有前進**」，不是「總數是不是 0」。
  //   上游迴圈是 `await _detectAndMatch(...)`，比對走 worker；worker 若是跑了
  //   幾輪之後才死，總數會停在 1、2 這種非零小數字 ⇒ 「總數===0」的判準永遠
  //   不會觸發 ⇒ 使用者看到「掃描中」跑到天荒地老而畫面上毫無異常。
  ok(/stillSince/.test(SRC.session) && /now - stillSince >= limit/.test(SRC.session),
    '★★★ 看門狗要判「心跳有沒有前進」，不可只判總數是否為 0（worker 中途死掉會漏掉）')
  // ★★ CPU 後備一輪要 3~8 秒，12 秒的門檻會把「正常但很慢」誤判成「迴圈卡死」，
  //    而那個畫面說的是一件不是事實的事。
  ok(/STALL_MS_CPU/.test(SRC.session) && /backend === 'cpu' \? STALL_MS_CPU/.test(SRC.session),
    '★★ CPU 後備要放寬看門狗門檻（否則會把「慢」誤判成「卡死」）')
  // ★★★ 自我測試不可用固定睡眠等迴圈停下來：CPU 上一輪要好幾秒，
  //    賭輸的結果是 workerMatchDone 被覆蓋 ⇒ 追蹤整個靜默死掉。
  ok(/inFlight/.test(SRC.tracker) && /while \(inFlight > 0/.test(SRC.tracker),
    '★★★ 自我測試要真的等處理迴圈結束（不可用固定睡眠賭）')
  ok(/waitUntil/.test(SRC.tracker),
    '★★ 那個等待要有上限（迴圈真的死掉時死等會讓診斷永遠不回來）')
  ok(/tps/.test(SRC.session), '★★ 要算並回報心跳速率（輪/秒）')
  // ★★★ `tps` 只能有**一個**寫入者。先前看門狗那支也順手寫它、而且不 emit
  //   ⇒ 畫面顯示「比對 0 輪/秒」、診斷面板顯示「1 輪/秒」，互相矛盾；
  //   而 `stuck` 讀的正是畫面那一份 ⇒ 升級訊息與自動自我測試都不會觸發。
  {
    // 只數「指派」，不數宣告（`let tps = null`）
    const all = SRC.session.match(/(^|[^.\w])tps\s*=[^=]/gm) || []
    const writes = all.filter(m => !/let\s+tps/.test(m)).length
      + (/let tps\s*=/.test(SRC.session) ? -0 : 0)
    const decl = (SRC.session.match(/let tps\s*=/g) || []).length
    ok(writes - decl === 1,
      `★★★ tps 只能有一個寫入者（目前 ${writes - decl} 個；兩支計時器互相蓋寫會讓畫面與面板數字矛盾）`)
  }
  ok(/輪\/秒/.test(SRC.scan), '★★ 心跳速率要顯示在使用者看得到的地方，不可只藏在診斷面板')
  // ★★★ 「畫面夠清楚＋迴圈在跑＋就是沒命中」時要**自動**跑自我測試：
  //   那個結果是把原因一刀切成兩半的唯一資訊（裝置運算壞掉 vs 掃的圖不對），
  //   而使用者不可能自己問得出來，也不該被要求去找按鈕。
  ok(/const stuck = longSearch/.test(SRC.scan), '★★ 要有「卡住」的明確定義')
  // ★★★ TDZ：`stuck` 讀 `longSearch`，所以宣告順序不可顛倒。
  //   `const` 有暫時性死區，倒過來會丟「Cannot access before initialization」，
  //   **整個畫面被 ErrorBoundary 接走，而 npm run build 一個字都不會報**。
  //   這個坑在本專案已經咬過兩次（PostDetail 的 hook 順序、這裡），所以上閘門。
  {
    const iLong = SRC.scan.indexOf('const [longSearch')
    const iStuck = SRC.scan.indexOf('const stuck = longSearch')
    ok(iLong > 0 && iStuck > 0 && iLong < iStuck,
      '★★★ longSearch 必須宣告在 stuck 之前（TDZ；順序錯了 build 不報但整頁掛掉）')
  }
  ok(/autoTestedRef/.test(SRC.scan) && /selfTest\(CARD\.target\)/.test(SRC.scan),
    '★★★ 卡住時要自動跑一次自我測試（只跑一次）')
  // ★★★ 2026-08-11 已用 MindAR **官方原版範例**（/ar/plain.html）證實：
  //   Samsung Xclipse 540 / ANGLE on Vulkan 上官方版也認不出來
  //   ⇒ 函式庫與該 GPU 不相容，調程式解決不了。
  //   所以自我測試一失敗就該把使用者導向 QR，而不是繼續叫他喬角度。
  ok(/const imageTrackingDead =/.test(SRC.scan) && /const qrOnly =/.test(SRC.scan),
    '★★ 要有「圖像辨識已確定不可用」的衍生狀態')
  ok(/qrOnly[\s\S]{0,200}請改對準卡片左下角的 QR/.test(SRC.scan),
    '★★★ 確定不可用且支援 QR 時，狀態列的主要指示必須換成「對準 QR」')
  ok(/!qrOnly/.test(SRC.scan),
    '★★ 確定不可用之後不可再顯示特徵點計量（它量的是影像品質，而問題不在影像）')
  ok(/setLongSearch\(true\), 3500\)/.test(SRC.scan),
    '★★ 升級判定要在 3.5 秒（正常裝置 1.5~2.6 秒就命中；等 8 秒只是讓沒救的裝置白等）')

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

// ── E. 掃到 → 跳轉 A-Frame 模型頁 ────────────────────────────────────────
{
  const model = stripComments(read('../src/screens/ArModel.jsx'))
  const paths = read('../src/store/paths.js')
  const registry = read('../src/screens/registry.jsx')
  const app = read('../src/App.jsx')
  const seo = read('../server/seo.js')

  // ★ 新增畫面要同時改四處，漏了第三處新頁會被伺服器判成未知路由而回 404
  ok(/arModel:\s*'\/ar\/model\/:slug'/.test(paths), '★ paths.js 有 /ar/model/:slug')
  ok(/arModel:\s*ArModel/.test(registry) && /import ArModel/.test(registry), '★ registry 註冊 arModel')
  ok(/arModel:/.test(app), '★ App.jsx 的 SCREEN_TITLES 有 arModel')
  ok(/'\/ar\/model\/:slug'/.test(seo), '★★ server/seo.js 的 ROUTES 有 /ar/model/:slug（漏了會回 404）')
  // 模型頁與卡片頁內容高度重疊 → 模型頁必須 noindex，否則同一份內容兩個網址參賽
  ok(/path: '\/ar\/model\/:slug'[^}]*noindex: true/.test(seo),
    '★★ 模型頁要 noindex（內容與 /ar/card/:slug 重疊）')
  ok(/'\/ar\/model\/:slug'\]/.test(seo) || /'\/ar\/model\/:slug',/.test(seo),
    '★ 模型頁要進 entryExists（不存在的 slug 要回真 404）')

  // ★★ 掃到就跳轉——這是使用者明確要求的動線
  ok(/push\('arModel'/.test(SRC.scan), "★★★ /AR 認出卡片後要 push('arModel')")
  ok(/jumpedRef/.test(SRC.scan), '★★ 跳轉只能發生一次（追蹤會反覆 found/lost）')
  ok(/hotspot: hotspotRef\.current\?\.id/.test(SRC.scan), '★ 跳轉要把使用者瞄準的熱區帶過去')
  // ★★★ 熱區是遲滯確認的（連 3 幀），會在「認出來」之後才變動。放進 deps 的話
  //   effect 重跑 → cleanup 清掉計時器 → 但一次性旗標已經是 true → 不再重新排程
  //   ⇒ **跳轉永遠不會發生**，而畫面停在「正在開啟 3D 模型…」。實測踩過。
  ok(/useEffect\([\s\S]{0,400}?push\('arModel'[\s\S]{0,200}?\}, \[phase, push\]\)/.test(SRC.scan),
    '★★★ 跳轉 effect 的 deps 只能是 [phase, push]（hotspot 進 deps 會讓跳轉永遠不發生）')
  ok(/JUMP_DELAY_MS/.test(SRC.scan), '★ 跳轉前要留一段確認時間（辨識成功是唯一的「成了」時刻）')

  // ★★★ A-Frame 自帶 super-three，與本專案的 three 是兩份副本。
  //   角色是用本專案的 three 建的、交給 A-Frame 算繪 —— 跨副本。
  //   可行的理由是 three 用 isMesh/isBufferGeometry 這類布林旗標判斷型別，
  //   不是 instanceof。⚠️ 但那是**實測**確認的，升級任一邊都要重驗，
  //   失效方式是「模型不出現而且沒有任何錯誤訊息」。
  // ★★★ A-Frame 走**自帶的預編譯檔**，不從 npm 安裝。
  //   ⚠️ 理由是部署會失敗：aframe 的相依裡有一個 git 來源套件
  //      （three-bmfont-text → github:dmarcos/...），而 GCP 的建置環境禁止
  //      git 來源（EALLOWGIT）⇒ npm ci 直接失敗 ⇒ 整個服務部署不上去。
  //      2026-08-11 實際炸過一次。
  const pkg = JSON.parse(read('../package.json'))
  ok(!pkg.dependencies?.aframe && !pkg.devDependencies?.aframe,
    '★★★ package.json 不可有 aframe 相依（它帶 git 來源套件，GCP 建置會 EALLOWGIT 失敗）')
  ok(!/git\+ssh|"github:/.test(read('../package-lock.json')),
    '★★★ package-lock 不可出現任何 git 來源套件（同上，會讓部署整個掛掉）')
  const vendored = read('../public/vendor/aframe-1.8.0.min.js')
  ok(vendored.length > 500000, '★★ 自帶的 A-Frame 預編譯檔存在且看起來完整')
  ok(/window\.AFRAME/.test(vendored), '★★ 自帶檔會註冊 window.AFRAME')
  // 跨副本算繪的前提：A-Frame 仍然自帶 super-three
  ok(/super-three|supermedium/.test(vendored),
    '★★★ 確認 A-Frame 仍自帶 super-three（與本專案 three 為兩份副本；此假設一旦改變要重驗跨副本算繪）')
  ok(model.includes("'/vendor/aframe-1.8.0.min.js'"),
    '★ 模型頁指向的自帶檔路徑要與實際檔名一致')
  // ★★★ 跨副本的關鍵一行：**不可以**用 setObject3D（它做 instanceof 檢查，
  //   跨副本必定 false ⇒ 直接拋錯、模型永遠不出現）。實測拿到的錯誤訊息是
  //   「`Entity.setObject3D` was called with an object that was not an instance
  //     of THREE.Object3D.」
  ok(!/setObject3D/.test(model),
    '★★★ 不可用 setObject3D（A-Frame 對它做 instanceof THREE.Object3D，跨副本必定失敗）')
  ok(/this\.el\.object3D\.add\(char\.root\)/.test(model),
    '★★ 角色用 el.object3D.add 掛上（繞過 instanceof；算繪器本身是 duck typing）')
  ok(/this\.el\.object3D\.remove\(this\.char\.root\)/.test(model),
    '★★ 卸載要自己 remove（不在 object3DMap 裡，removeObject3D 找不到它）')
  ok(!/from 'aframe'|import\('aframe'\)/.test(model),
    '★★ 不可從 npm import aframe（要走自帶的預編譯檔）')
  ok(/loadAframeScript/.test(model), '★★ A-Frame 由 <script> 動態載入，不進 Vite 模組圖')
  ok(/let registered = false/.test(model),
    '★★ A-Frame 元件只能註冊一次（重複註冊會 throw，第二次進頁面整頁掛掉）')
  ok(/forceContextLoss/.test(model), '★ 離開要釋放 WebGL context')
  ok(/look-controls="enabled: false"/.test(model),
    '★ 要關掉 look-controls（開著的話相機會跟手機陀螺儀飄，看模型時畫面自己在動）')
  ok(/\.armodel-stage\s*\{[^}]*height:/.test(SRC.css),
    '★★ .armodel-stage 必須有明確高度（A-Frame 拿到 0×0 不會自己重試，症狀是整片空白）')

  // ── 版面比例（2026-08-11 使用者回報「畫面比例怪怪的」）──
  {
    // ★★★ A-Frame 1.8 的元件叫 `xr-mode-ui`。舊名 `vr-mode-ui` 在 1.8 裡
    //   **根本不存在**，寫了會被**靜默忽略** ⇒ 支援 WebXR 的裝置（使用者的
    //   Android Chrome）會冒出一顆「VR」按鈕，而桌機因為偵測不到 XR 裝置
    //   自動隱藏，本機完全看不出來。
    ok(/xr-mode-ui/.test(vendored),
      '★★★ 前提：自帶的 A-Frame 提供 xr-mode-ui（元件改名的話這條要重驗）')
    ok(/setAttribute\('xr-mode-ui', 'enabled: false'\)/.test(model),
      '★★★ 要用 xr-mode-ui 關掉進入鈕')
    ok(!/'vr-mode-ui'/.test(model),
      '★★★ 不可用 vr-mode-ui（A-Frame 1.8 沒有這個元件，會被靜默忽略）')

    // ★★★ 相機不可寫死位置：three 的 fov 是**垂直**視角，水平看得到多少
    //   完全取決於畫布長寬比。寫死一組＝「在我這台剛好」。
    //   實測（改之前）手機直立 411×551：上方留白 52.6%、下緣被裁掉。
    ok(/jq-fit/.test(model), '★★★ 相機要用 jq-fit 自動框景')
    ok(!/camera="fov: \d+"\s+position=/.test(model),
      '★★★ 相機不可寫死 position（畫面比例是輸入，不是常數）')
    ok(/cam\.aspect/.test(model),
      '★★★ 框景要讀相機的 aspect（否則等於沒有處理比例）')
    // ★★ 俯仰上界要用**常數**不可用當下角度，否則一拖動框景就忽大忽小
    ok(/maxPitch/.test(model), '★★ 框景要用最大俯仰角當靜態上界')
    // ★★ 包圍盒中心要對到旋轉原點：否則自轉是繞著重心以外的點轉（會晃），
    //    而且模型會偏在畫面一側。
    ok(/char\.root\.position\.sub\(/.test(model),
      '★★ 要把模型重心對到 rig 的旋轉原點')

    // ★★★ 沒有這一行，「拖曳可以轉動」就是一句做不到的話：預設 touch-action
    //   會讓瀏覽器把手勢當捲動吃掉，手指在模型上滑只會捲頁面。
    ok(/\.armodel-stage canvas\s*\{[^}]*touch-action:\s*none/.test(SRC.css),
      '★★★ 模型畫布要 touch-action:none（否則觸控拖曳會被瀏覽器當成捲動）')

    // ★★ dvh 的退路：舊 iOS（<15.4）不認得 dvh 會把整條 height 丟掉，
    //    而這個容器一旦沒高度 A-Frame 就拿到 0×0。
    const stage = SRC.css.match(/\.armodel-stage\s*\{[^}]*\}/)?.[0] ?? ''
    ok(/height:\s*min\(56vh/.test(stage) && /height:\s*min\(56dvh/.test(stage),
      '★★ .armodel-stage 要同時寫 vh 退路與 dvh（舊 iOS 不認 dvh 會整行丟掉）')
  }

  // ── 死路檢查：任何一種「沒救了」都要給得出下一步 ──
  //
  // ★★★ `BarcodeDetector` 是 Chrome／Android 的 API，**iOS Safari 沒有實作**
  //   ⇒ `qrReady` 在每一支 iPhone 上都是 false ⇒ 圖像辨識掛掉的 iPhone
  //   **百分之百**會走到「沒有 QR 備援」那一格。那一格若只寫「請複製診斷資料」，
  //   就是把所有 iPhone 使用者留在死路上。
  {
    const noQr = SRC.scan.slice(SRC.scan.indexOf('st.qrReady ? ('))
    ok(/screen="arCard"/.test(noQr),
      '★★★ 沒有 QR 備援時要導向卡片頁（iPhone 一定走這一格，不可只叫人複製診斷資料）')
    const pipelineBranch = SRC.scan.slice(SRC.scan.indexOf('辨識運算在這台裝置上跑不起來'))
      .slice(0, 700)
    ok(/screen="arCard"/.test(pipelineBranch),
      '★★ 運算跑不起來時也要導向卡片頁')
  }
}

// ── E2. 比對門檻與相容模式 ───────────────────────────────────────────────
{
  // ⚠️ 一定要去註解：vite.config 的註解裡就寫著「MIN_NUM_INLIERS = 4」
  //    （在說明為什麼不可以這樣設），不去掉會讓下面的負向檢查恆為失敗。
  const vite = stripComments(read('../vite.config.js'))
  const compat = stripComments(read('../src/ar/tfjsCompat.js'))

  ok(/MATCH_TUNING/.test(vite), '★ vite.config 要有比對門檻調整表')
  ok(/HAMMING_THRESHOLD = 0\.75/.test(vite), '★ Lowe 比值放寬到 0.75')

  // ★★★ 這兩條是**實測踩過的誤判陷阱**，不是預防性規則：
  //   0.8 ＋ 內點 4 ＋ 重投影 5px 時，完全不是卡片的畫面（隨機色塊＋文字狀橫條）
  //   也會命中並跳轉。病灶是 MIN_NUM_INLIERS=4——4 點正好是解出單應性矩陣的
  //   最低數量，等於「任意四點碰巧對得上就算命中」。
  // ★★★ 負向檢查的自我驗證：**先證明這個正規表示式真的抓得到**。
  //
  // ⚠️ 這一段是被真的事故逼出來的：原本寫成 `/MIN_NUM_INLIERS = [0-5]\b/`，
  //    但產生檔案時 `\b` 被寫成了**真正的退格字元（0x08）**，於是那個 regex
  //    永遠不可能匹配 ⇒ 檢查恆為通過 ⇒ **閘門是假的**。變異測試（把
  //    MIN_NUM_INLIERS 改回 4）當場抓到它沒反應，否則就這樣出貨了。
  // ⚠️ 「一個永遠通過的檢查」比沒有檢查更糟：它讓人以為那條線有人守著。
  const NEG = [
    [/MIN_NUM_INLIERS = [0-5][^0-9]/, "const MIN_NUM_INLIERS = 4'"],
    [/INLIER_THRESHOLD = [5-9]/, "const INLIER_THRESHOLD = 5'"],
    [/HAMMING_THRESHOLD = 0\.[89]/, "const HAMMING_THRESHOLD = 0.8'"],
  ]
  for (const [re, sample] of NEG) {
    ok(re.test(sample), `★★★ 負向檢查的 regex ${re} 必須抓得到 ${sample}（防止閘門本身壞掉卻靜默通過）`)
  }

  ok(!/MIN_NUM_INLIERS = [0-5][^0-9]/.test(vite),
    '★★★ 絕不可把 MIN_NUM_INLIERS 降到 6 以下（實測會讓非卡片畫面誤判並跳轉）')
  ok(!/INLIER_THRESHOLD = [5-9]/.test(vite),
    '★★ 不可放寬重投影誤差容忍（只會讓更多雜點被算成內點，同樣造成誤判）')
  ok(!/HAMMING_THRESHOLD = 0\.[89]/.test(vite),
    '★★ Lowe 比值不可放到 0.8 以上（與上面兩項一起會誤判）')

  // 建置期替換必須「找不到就爆」，不可靜默不生效
  ok(/throw new Error/.test(vite) && /找不到/.test(vite),
    '★★★ 門檻替換找不到目標字串時必須讓建置失敗（靜默不生效＝以為放寬了其實沒有）')
  ok(/worker: \{ plugins/.test(vite),
    '★★ 外掛必須也掛在 worker.plugins（matching.js 只存在於 worker 的獨立建置裡）')

  // 相容模式
  ok(/tfjsflags/.test(compat), '★ 相容模式透過網址的 tfjsflags 設定 TFJS')
  ok(/WEBGL_PACK:false/.test(compat), '★ 相容模式要關掉打包運算')
  ok(/history\.replaceState/.test(compat), '★ 用 replaceState（不留上一頁紀錄）')
  ok(/return \(\) => \{[\s\S]{0,160}replaceState/.test(compat),
    '★★ 一定要回傳「還原網址」的函式（tfjsflags 留在網址上會被分享出去）')
  ok(/reload\(\)/.test(compat),
    '★★ 開啟相容模式必須重新載入（TFJS 初始化過就不再讀旗標，不重載＝沒開）')
  // ★ 相容模式也要改用 MindAR 內建的 blob worker：「同源 worker 與內建 worker
  //   行為不同」是使用者裝置上唯一還沒被排除、成本又極低的變因。
  ok(/useBuiltinWorker/.test(compat) && /useBuiltinWorker/.test(SRC.tracker),
    '★ 相容模式要能改用 MindAR 內建的 blob worker')
  const trk = SRC.tracker
  ok(/withCompatFlags\(\)[\s\S]{0,400}?await import\('mind-ar\/dist\/mindar-image\.prod\.js'\)/.test(trk),
    '★★★ 旗標必須在 import MindAR **之前**套用（TFJS 只在模組初始化那一刻讀）')
  ok(/finally \{[\s\S]{0,80}restoreUrl\(\)/.test(trk), '★★ import 之後一定要還原網址')
}

// ── E3. QR 備援 ──────────────────────────────────────────────────────────
{
  const qr = stripComments(read('../src/ar/qrFallback.js'))
  const { matchCardFromQr } = await import('../src/ar/qrFallback.js')
  const cards = OFFICIAL_CARDS

  // ★ 只認本站網址：不限定 host 的話，路上任何一張 QR 都會觸發跳轉
  ok(matchCardFromQr('https://example.com/', cards) === null, '★★ 外站的 QR 不可觸發')
  ok(matchCardFromQr('隨便一段文字', cards) === null, '不是網址的 QR 不可觸發')
  ok(matchCardFromQr('', cards) === null, '空字串不可觸發')
  ok(matchCardFromQr('https://chengqi.tw/', cards)?.slug === cards[0].slug,
    '★ 本站網址的 QR 要對應到唯一那張官方卡')
  ok(matchCardFromQr(`https://chengqi.tw/ar/model/${cards[0].slug}`, cards)?.slug === cards[0].slug,
    '★ 帶 slug 的網址要對應到該張卡')

  // ★★★ 未來出第二張卡時，只編站台首頁的舊 QR **不可以**亂猜
  const two = [cards[0], { ...cards[0], slug: 'other-card', id: 'other' }]
  ok(matchCardFromQr('https://chengqi.tw/', two) === null,
    '★★★ 有多張卡時，只編站台首頁的 QR 不可亂猜（猜錯會帶到別張卡的內容）')
  ok(matchCardFromQr(`https://chengqi.tw/ar/model/${cards[0].slug}`, two)?.slug === cards[0].slug,
    '★ 有多張卡時，帶 slug 的網址仍要對得出來')

  ok(/BarcodeDetector/.test(qr), '用瀏覽器原生 BarcodeDetector（不碰 TFJS／WebGL／worker）')
  ok(/getSupportedFormats/.test(qr), '★★ 要 feature-detect（iOS Safari 沒有這個 API）')
  ok(/busy/.test(qr), '★ 偵測不可重疊呼叫（部分實作會拋 InvalidStateError 並靜默死掉）')
  // ⚠️ 這一條原本比對的是**註解文字**，但 `qr` 已經去過註解 ⇒ 永遠不可能通過。
  //    （與稍早那個被退格字元汙染的 regex 同一類錯誤：檢查本身壞掉。）
  //    改成驗真正的程式結構：detect() 要包在 try 裡，而且要有 finally 復位。
  ok(/try \{[\s\S]{0,220}?detector\.detect\(video\)[\s\S]{0,400}?catch[\s\S]{0,60}?finally/.test(qr),
    '★★ QR 偵測要包 try/catch/finally（失敗靜默略過，不可影響 MindAR 主路徑）')
  ok(/viaQr/.test(SRC.session) && /viaQr/.test(SRC.scan),
    '★ 要能分辨「靠 QR 認出的」並在畫面上講出來')
  // ★★★ QR 通常比追蹤引擎（1.7 MB）先有結果，所以啟動流程最後那句
  //   `to('searching')` 不可無條件執行——否則會把 QR 已經設好的 locked 蓋掉，
  //   跳轉 effect 隨即 cleanup 掉計時器而一次性旗標已是 true ⇒ 永遠不跳。
  ok(/if \(phase !== 'locked'\) to\('searching'\)/.test(SRC.session),
    '★★★ 啟動流程設回 searching 前要先確認不是已經 locked（否則 QR 命中會被蓋掉）')
  // ★★★ 圖像辨識確定沒救時（相容模式也失敗），若這台裝置支援 QR，
  //   畫面**必須**把「去對 QR」講出來——那是唯一還能用的路。
  //   先前這裡只寫「請複製診斷資料」，等於把唯一的出路藏起來。
  ok(/qrReady/.test(SRC.session) && /st\.qrReady/.test(SRC.scan),
    '★★ session 要把 qrReady 吐給畫面')
  ok(/相容模式也試過了[\s\S]{0,600}?QR/.test(SRC.scan),
    '★★★ 相容模式也失敗時，若支援 QR 必須明確引導去掃 QR（不可只叫人複製診斷資料）')
}

// ── F. 官方卡包 ──────────────────────────────────────────────────────────
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

  // ── CPU 運算後備（`src/ar/cpuPipeline.js`）──
  //
  // 這一層的存在理由是一個上游實作細節：**`.mind` 裡的描述子是 CPU kernel
  // 算出來的**（offline-compiler.js 第 5 行 import 了 kernels/cpu），而執行期
  // 跑的是 WebGL 版。兩者「應該」一致，某些 GPU 上不一致 ⇒ 特徵點抓得到、
  // 比對永遠 0 次。下面每一條都在鎖「拿掉也不會有人發現」的一行。
  {
    // ★★★ 前提本身要驗：上游哪天把那行 import 拿掉，整條路的理由就沒了。
    const offline = read('../node_modules/mind-ar/src/image-target/offline-compiler.js')
    ok(/detector\/kernels\/cpu/.test(offline),
      '★★★ 前提：offline-compiler 仍用 CPU kernel 編 .mind（拿掉的話 cpuPipeline 的整個理由消失）')
    const det = read('../node_modules/mind-ar/src/image-target/detector/detector.js')
    ok(/kernels\/webgl/.test(det) && !/kernels\/cpu/.test(det),
      '★★★ 前提：執行期的 detector 仍只 import webgl kernel（所以要由我們補 cpu 那份）')

    // ★★★ 一定要走原始碼版。`dist/mindar-image.prod.js` 把 TFJS 包在自己裡面，
    //    拿不到 `tf` 實例 ⇒ 呼叫不到 setBackend ⇒ 整條路不可能成立。
    ok(/mind-ar\/src\/image-target\/controller\.js/.test(SRC.cpu),
      '★★★ CPU 路徑要 import mind-ar/src 的 Controller（prod bundle 拿不到共用的 tf）')
    ok(!/mindar-image\.prod/.test(SRC.cpu),
      '★★★ CPU 路徑不可用 dist/mindar-image.prod.js')
    ok(/detector\/kernels\/cpu\/index\.js/.test(SRC.cpu),
      '★★★ 一定要 import CPU kernel（上游 detector.js 只 import 了 webgl 那份）')

    // ★★★ InputLoader 是唯一硬綁 WebGL 的地方（建構式碰 backend.texData、
    //    loadInput 用 gpgpu.uploadPixelDataToTexture）。不換掉就一定炸。
    ok(/patchInputLoader/.test(SRC.cpu) && /inputLoader\s*=/.test(SRC.cpu),
      '★★★ 一定要換掉 InputLoader（CPU 後端沒有 backend.texData／gpgpu）')
    // ★★ 灰階要用 `mean(2)`＝(r+g+b)/3，那是**編譯 .mind 時用的公式**
    //    （compiler-base.js）。用執行期 shader 的 luma 權重就是回到原本那條路。
    ok(/\.mean\(2\)/.test(SRC.cpu),
      '★★ CPU 版灰階要用 mean(2)（＝編譯器的 (r+g+b)/3），不可改成 luma 權重')
    ok(!/0\.299|0\.587|0\.114/.test(SRC.cpu),
      '★★ CPU 版不可出現 luma 權重（那是執行期 shader 的公式，與 .mind 不同源）')

    // ── 降解析度（純函式，可完整驗證）──
    //
    // 離線實測（node、純 JS CPU 後端、同一張卡與 `.mind`）：
    //   1280×960 一幀要 12~15 秒 → 490×368 只要 1.5~1.7 秒，
    //   而卡片佔畫面 90/75/55/40/30% 共 10 種組合**全部命中**。
    // 不縮的話「慢到沒人等得下去」與「不能用」是同一件事。
    {
      const [w1, h1] = cpuInputSize(1280, 960)
      ok(w1 * h1 <= 200000 && w1 * h1 >= 120000,
        `★★★ 1280×960 要被縮進像素預算（得到 ${w1}×${h1} ＝ ${(w1 * h1 / 1000) | 0}k）`)
      // ★★★ 長寬比必須保住：stage.js 的裁切修正用 video 的長寬比算 kx/ky，
      //    而投影矩陣來自 Controller 的 inputWidth/Height——兩者長寬比一旦
      //    不同，3D 就會與影像對不上（而且是「差一點點」那種最難查的）。
      for (const [w, h] of [[1280, 960], [1920, 1080], [1280, 720], [720, 1280]]) {
        const [a, b] = cpuInputSize(w, h)
        ok(Math.abs((a / b) / (w / h) - 1) < 0.01,
          `★★★ ${w}×${h} 縮放後長寬比要一致（得到 ${a}×${b}）`)
        ok(a % 2 === 0 && b % 2 === 0, `★ ${w}×${h} 縮放後要是偶數（得到 ${a}×${b}）`)
      }
      // 已經夠小的就不要動——放大只會更慢而且不會更準
      const [a2, b2] = cpuInputSize(400, 300)
      ok(a2 === 400 && b2 === 300, '★ 已經在預算內的尺寸不可被改動')
      // 反例：不可回傳 0 或負數（video 還沒就緒時會拿到 0）
      const [a3, b3] = cpuInputSize(0, 0)
      ok(a3 === 0 && b3 === 0, '★ 尺寸是 0 時要原樣回傳，不可算出 NaN')
    }

    // ★★★ 降解析度之後 loadInput **一定要縮放填滿**，不可照抄上游的 1:1 貼上——
    //    那會變成只把畫面左上角送進偵測器，而卡片幾乎一定在中間 ⇒ 永遠掃不到。
    ok(/drawImage\(input, 0, 0, W, H\)/.test(SRC.cpu),
      '★★★ CPU 版 loadInput 要縮放填滿（照抄上游的 1:1 會變成裁切左上角）')

    // ★★ 光流追蹤只有 WebGL 實作，不停用的話 dummyRun 當場就炸。
    ok(/disableOpticalFlow/.test(SRC.cpu) && /_trackAndUpdate\s*=\s*async/.test(SRC.cpu),
      '★★ 一定要停用光流追蹤（Tracker 沒有 CPU 版的 _compileAndRun）')

    // ★★★ 順序：webgl 建構 → 換 inputLoader → 切 cpu → addImageTargets → dummyRun
    //    切早了 InputLoader 建構式會炸；切晚了目標 tensor 會建在 webgl 上。
    // ⚠️ 一律比對「呼叫」形式（帶左括號）：檔頭的 import 清單裡也有這些名字，
    //    用裸名 indexOf 會全部指到第 3 行，順序檢查就變成永遠失敗／永遠通過。
    const iPatch = SRC.tracker.indexOf('patchInputLoader(')
    const iCpu = SRC.tracker.indexOf('useCpu(')
    const iTargets = SRC.tracker.indexOf('addImageTargets(')
    const iFlow = SRC.tracker.indexOf('disableOpticalFlow(')
    const iDummy = SRC.tracker.indexOf('controller.dummyRun(')
    ok(iPatch > 0 && iCpu > iPatch,
      '★★★ 要先換 InputLoader 才切 CPU 後端（順序反了：建構式讀 backend.texData 會 TypeError）')
    ok(iCpu > 0 && iTargets > iCpu,
      '★★★ 要在 addImageTargets **之前**切後端（否則目標 tensor 建在 webgl 上成孤兒）')
    ok(iFlow > iTargets,
      '★★ disableOpticalFlow 要在 addImageTargets 之後（controller.tracker 到那時才存在）')
    ok(iDummy > iFlow,
      '★★ dummyRun 要在停用光流之後（它會呼叫 tracker.dummyRun）')

    // ★★ CPU 後備不可拖累主 bundle：session 只能靜態 import 輕量模組。
    //    cpuPipeline 本身很輕，但它動態 import 的東西極重（TFJS 原始碼版
    //    1.66 MB），所以 session 絕不可靜態牽到它。
    ok(!/^import[^\n]*cpuPipeline/m.test(SRC.session),
      '★★ session.js 不可靜態 import cpuPipeline（tracker 才可以，而 tracker 是懶載入的）')

    // ★★★ 切後端只能重建追蹤器，**不可重建 stage**：stage.dispose() 會
    //    forceContextLoss()，同一張 canvas 之後不保證拿得回 context。
    const sw = SRC.session.slice(SRC.session.indexOf('async switchBackend'))
      .slice(0, 1400)
    ok(/tracker\.dispose\(\)/.test(sw) && /makeTracker\(/.test(sw),
      '★★★ switchBackend 要先 dispose 舊追蹤器再建新的（兩顆同時跑會互搶影格與 worker）')
    ok(!/stage\.dispose|createStage/.test(sw),
      '★★★ switchBackend 不可重建 stage（forceContextLoss 之後同一張 canvas 不保證拿得回 context）')
    ok(/if\s*\(\s*disposed\s*\|\|\s*switching/.test(SRC.session),
      '★★ 切換期間探測要停手（那一瞬間 tracker 是 null）')

    // ★★★ CPU 重試必須是**自動**的：它成立的前提是上游原始碼的實作細節，
    //    使用者不可能知道，也就不可能自己決定要不要按。
    ok(/useEffect\([\s\S]{0,600}switchBackend\('cpu'\)/.test(SRC.scan),
      '★★★ CPU 重試要掛在 effect 上自動觸發，不可做成按鈕')
    // ★★★ TDZ：`cpuTried` 必須宣告在讀它的 const 之前。這一頁已經踩過一次
    //    （longSearch），而症狀是整頁被 ErrorBoundary 接走、build 完全不報錯。
    const iDecl = SRC.scan.indexOf('const [cpuTried')
    const iUse = SRC.scan.indexOf('imageTrackingDead =')
    ok(iDecl > 0 && iUse > iDecl,
      '★★★ cpuTried 要宣告在 imageTrackingDead 之前（const 的暫時性死區）')
    // ★★ 只試一次：CPU 慢很多，反覆重建追蹤器只會讓畫面一直頓。
    ok(/cpuTried\s*\|\|\s*!failedTest|if\s*\(\s*cpuTried/.test(SRC.scan),
      '★★ CPU 重試只能跑一次')
    // ★★ 一格 render 的閃動也要擋：effect 在 render 之後才跑，少了 testPending
    //    會先閃一下「沒救了，去用 QR」再跳回「檢查中」。
    // ⚠️ 不可只寫 `/testPending/`：那連 `_testPending` 都會通過（變異測試抓到的）。
    //    要驗的是**兩件具體的事**——它的定義涵蓋「已失敗但 CPU 還沒試」，
    //    而且 JSX 真的用它當守衛。
    ok(/const testPending\s*=[^\n]*!imageTrackingDead/.test(SRC.scan),
      '★★ testPending 要涵蓋「已失敗但 CPU 重試還沒跑」（否則會閃出錯誤結論）')
    ok(/\{\s*testPending\s*&&/.test(SRC.scan),
      '★★ 「檢查中」那段要由 testPending 守衛，不可用 selfTest === idle/running 裸判')
    // ★ 切到 CPU 之後要講出來——不講的話「突然變很慢」與「當掉了」分不出來。
    ok(/backend === 'cpu'/.test(SRC.scan) && /運算後端/.test(SRC.scan),
      '★ 畫面與診斷面板都要顯示目前的運算後端')
  }

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
