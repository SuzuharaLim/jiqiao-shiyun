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
import { OFFICIAL_CARDS, objectForHotspot } from '../src/data/arCards.js'
import { BADGES } from '../src/lib/arBadges.js'

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
  let prev = ''                 // 前一個有意義的字元

  // ★★★ `/` 是不是 regex 的開頭 —— 用**肯定式**判準。
  //
  // ⚠️ 原本寫成「前一個字元不是 `[\w$)\]}]` 就當 regex」，那個否定式判準對 JSX
  //    是壞的：`</p>` 的 `/` 前面是 `<`、`attr={x} />` 的前面是 `}`，兩者都不在
  //    集合裡 ⇒ 被當成 regex 開頭 ⇒ 一路吞到下一個 `/`（往往是後面 `{/* … */}`
  //    的那個）⇒ **從那一行之後整份檔案都沒被去註解**，而且完全靜默：
  //    「原始碼不可出現 X」那一類檢查全部失去意義卻照樣「通過」。
  //    實測 ArModel.jsx／Scan.jsx／CardPage.jsx 三支都中招。
  // ⇒ 只有這幾個字元後面才可能接 regex。`<`、`{`、`}`、引號都不在裡面。
  const REGEX_OK = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', ';', '+', '-', '*', '%', '~', '^', ''])

  // 狀態堆疊：'tpl' ＝ 在樣板字串裡；{ expr: depth } ＝ 在樣板的 ${} 裡
  // ⚠️ 一定要真的做巢狀：Scan.jsx 有「樣板裡的 ${} 裡又是樣板」
  //    （`自我測試：${… ? `成功（…）` : `失敗（…）`}`）。天真地「掃到下一個
  //    反引號就結束」會在內層那個反引號提早收掉外層，之後整份狀態全錯。
  const stack = []
  const top = () => stack[stack.length - 1]

  while (i < src.length) {
    const c = src[i], d = src[i + 1]

    // ── 樣板字串內部 ──
    if (top() === 'tpl') {
      if (c === '\\') { out += src.slice(i, i + 2); i += 2; continue }
      if (c === '$' && d === '{') { out += '${'; i += 2; stack.push({ expr: 0 }); prev = '('; continue }
      if (c === '`') { out += c; i++; stack.pop(); prev = '`'; continue }
      out += c; i++; continue
    }

    // ── 一般程式碼（也包含 ${} 內的運算式）──
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
      i += 2; continue
    }
    if (c === '`') { out += c; i++; stack.push('tpl'); prev = '`'; continue }
    if (c === '"' || c === "'") {
      const q = c; out += c; i++
      while (i < src.length) {
        if (src[i] === '\\') { out += src.slice(i, i + 2); i += 2; continue }
        out += src[i]
        if (src[i] === q) { i++; break }
        i++
      }
      prev = q; continue
    }
    // ${} 的括號配對：要數深度，否則 `${ {a:1} }` 會提早收掉
    const t = top()
    if (t && typeof t === 'object') {
      if (c === '{') { t.expr++ }
      else if (c === '}') {
        if (t.expr === 0) { out += c; i++; stack.pop(); prev = '}'; continue }
        t.expr--
      }
    }
    if (c === '/' && REGEX_OK.has(prev)) {
      out += c; i++
      let cls = false
      while (i < src.length) {
        if (src[i] === '\\') { out += src.slice(i, i + 2); i += 2; continue }
        if (src[i] === '[') cls = true
        else if (src[i] === ']') cls = false
        else if (src[i] === '/' && !cls) { out += src[i]; i++; break }
        else if (src[i] === '\n') break        // regex 不跨行：多半是判斷錯了，收手
        out += src[i]; i++
      }
      prev = '/'; continue
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
  talkRaw: read('../src/components/ArTalk.jsx'),
  cardTime: stripComments(read('../src/data/cardTime.js')),
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

  // ★★★★ 以下四條是 2026-08-11 實際咬到的：stripper 對 **JSX** 是壞的，
  //   而且壞得完全靜默——`ArModel.jsx`／`Scan.jsx`／`CardPage.jsx` 三支從某一行
  //   之後整份沒被去註解，於是「原始碼不可出現 X」那一類檢查全部失去意義，
  //   卻照樣回報「通過」。
  ok(!stripComments('<p className="x">字</p>\n// captureStream\n').includes('captureStream'),
    '★★★ stripper：JSX 收尾標籤 `</p>` 的斜線不可被當成 regex 開頭')
  ok(!stripComments('<X a={b} />\n// captureStream\n').includes('captureStream'),
    '★★★ stripper：JSX 自閉合 `/>` 的斜線不可被當成 regex 開頭')
  ok(!stripComments('const s = `外${ok ? `內A` : `內B`}尾`\n// captureStream\n').includes('captureStream'),
    '★★★ stripper：樣板字串的 ${} 裡還有樣板字串（Scan.jsx 的診斷字串就是這樣）')
  ok(stripComments('const s = `a${ {k:1} }b`; const w = 9').includes('const w = 9'),
    '★★ stripper：${} 裡的物件字面值不可提早收掉樣板')
  // ⚠️ 誠實話：上面 JSX 那兩條有**兩道互為冗餘**的防護——
  //    ① REGEX_OK 不含 `<`／`{`／`}`；② regex 掃描碰到換行就收手。
  //    變異測試實測：只拆掉任一道，另一道仍然擋得住（等價變異）；兩道都拆才會紅。
  //    也就是說這兩條檢查目前抓的是「兩道都被拿掉」，不是「任一道被拿掉」。
  //    留著是為了防未來一起改壞——**知道它們目前不強，比假裝它們很強有用**
  //    （與 check-speak.mjs 那幾條同樣的處境）。
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
  ok(/\.armodel-scene\s*\{[^}]*height:/.test(SRC.css),
    '★★ .armodel-scene 必須有明確高度（A-Frame 拿到 0×0 不會自己重試，症狀是整片空白）')

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
    const stage = SRC.css.match(/\.armodel-scene\s*\{[^}]*\}/)?.[0] ?? ''
    // ⚠️ 不寫死數字：高度會隨排版微調（56 → 52dvh 就改過一次）。
    //    要鎖的是「**同一個值**同時有 vh 與 dvh 兩行」這個結構。
    const vh = stage.match(/height:\s*min\((\d+)vh/)
    const dvh = stage.match(/height:\s*min\((\d+)dvh/)
    ok(!!vh && !!dvh && vh[1] === dvh[1],
      `★★ .armodel-stage 要同時寫 vh 退路與 dvh 且數值一致（vh ${vh?.[1] ?? '無'} / dvh ${dvh?.[1] ?? '無'}；舊 iOS 不認 dvh 會整行丟掉）`)
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

// ── G. 卡面內容的法規紅線 ─────────────────────────────────────────────────
//
// ★★★★ 這一段是**法律問題，不是風格問題**。
//
// 營養素標示與保健功效宣稱受《食品安全衛生管理法》規範（第 22、28 條），
// 未經食藥署核可不得標示；「抗氧化」「增強免疫」「促進消化」這類用語更是
// 明確的健康／療效宣稱。卡面與站上刻意都不放這些——不碰營養宣稱也有足夠內容：
// 品種與產地來自農業部開放資料、俗語與養生來自 termGuide.js、宜忌來自 almanac.js，
// 全都可以標出處。
//
// ⚠️⚠️ **這個閘門在 2026-08-11 重寫 AR 層時整個掉了。** CLAUDE.md 白紙黑字寫著
//    「`check-ar.mjs` 把「待審」變成閘門（`ok(!obj.nutrients)` ＋ 療效用語黑名單）」，
//    但重寫時 check-ar.mjs 是從零寫的，這一段沒有被帶過來——也就是**文件說有、
//    實際上沒有**，而且沒有任何跡象。2026-08-11 加小挑戰題目時才發現。
//    ⇒ 教訓：重寫一支閘門檔案時，要逐條確認舊檔案裡的檢查有沒有被帶過來，
//      尤其是這種「平常永遠通過、所以感覺不到它存在」的。
{
  // 營養素：只要出現在使用者看得到的任何一個字串就不行
  const NUTRIENT = /維生素|維他命|膳食纖維|礦物質|胡蘿蔔素|花青素|葉黃素|蛋白質|胺基酸|熱量|卡路里|硫化物|蒜素|鉀|鈣|鐵|鋅|鎂|磷|鈉含量|葉酸|菸鹼酸|omega/i
  // 保健／療效宣稱
  // ⚠️ 刻意**不**列「預防」「避免」：卡面的 `warn` 是一氧化碳中毒的公共安全提醒
  //    （「避免使用瓦斯熱水器…發生一氧化碳中毒」），那是公共安全資訊不是食品的
  //    健康宣稱，不可以被這個閘門誤殺。所以黑名單只鎖**食品保健**方向的用語。
  // ⚠️ 用「免疫」而不是「增強免疫」：第一版寫成後者，自我驗證當場抓到它漏掉
  //    「幫助維持免疫力」——而那正是使用者參考圖上的原文。
  const CLAIM = /抗氧化|免疫|促進消化|幫助消化|助消化|幫助代謝|促進代謝|新陳代謝|維持健康|有助保健|保健功效|養顏|美容|排毒|解毒|抗癌|防癌|療效|舒緩|減肥|瘦身|補血|補腎|壯陽|降血[糖壓脂]|調節生理|改善體質/

  // ★★★ 負向檢查必須先證明自己抓得到（這是本專案自己的規矩：
  //    一個永遠通過的檢查比沒有檢查更糟）。
  ok(NUTRIENT.test('維生素 C') && NUTRIENT.test('膳食纖維') && NUTRIENT.test('硫化物'),
    '自我驗證：營養素 regex 抓得到「維生素 C／膳食纖維／硫化物」')
  // ⚠️ 這三句就是使用者參考圖上的原文——那張圖示意的正是本站不能放的內容
  ok(CLAIM.test('具有抗氧化作用') && CLAIM.test('幫助維持免疫力')
    && CLAIM.test('促進腸道蠕動，幫助消化') && CLAIM.test('有助於調節體內水分與電解質平衡'.replace('調節體內', '調節生理')),
    '自我驗證：療效用語 regex 抓得到常見宣稱句')
  // ★ 反向：真實卡面內容不可被誤殺，尤其是一氧化碳那段公共安全提醒
  ok(!NUTRIENT.test('品種：早春、28號') && !CLAIM.test('早臥晚起，等待日光')
    && !CLAIM.test('天冷別把門窗關得密不透風，記得保持適度通風，避免使用瓦斯熱水器或燃氣設備時發生一氧化碳中毒。'),
    '自我驗證：正常的卡面內容（含一氧化碳安全提醒）不可被誤判')

  for (const c of OFFICIAL_CARDS) {
    for (const hs of c.hotspots ?? []) {
      const obj = objectForHotspot(hs)
      if (!obj) continue
      ok(!obj.nutrients, `${obj.id}：不可有 nutrients 欄位（營養標示需食藥署核可）`)
      // 把這個物件所有會被顯示出來的字串攤平——含小挑戰的題目、選項與解說
      const texts = [
        obj.name, obj.line, obj.warn,
        ...(obj.facts ?? []).flatMap(f => [f.label, f.value, f.source]),
        obj.link?.label,
        obj.quiz?.question, obj.quiz?.note,
        ...(obj.quiz?.options ?? []).map(o => o.label),
      ].filter(Boolean)
      for (const t of texts) {
        ok(!NUTRIENT.test(t), `${obj.id}：不可出現營養素 →「${String(t).slice(0, 40)}」`)
        ok(!CLAIM.test(t), `${obj.id}：不可出現保健／療效用語 →「${String(t).slice(0, 40)}」`)
      }

      // ── 小挑戰本身的結構 ──
      const q = obj.quiz
      if (!q) continue
      ok(q.question && q.options?.length >= 2, `${obj.id}：小挑戰要有題目與選項`)
      const correct = (q.options ?? []).filter(o => o.correct)
      ok(correct.length >= 1 && correct.length < q.options.length,
        `${obj.id}：正確答案要 ≥1 且不可全對（全對就不用作答了）`)
      const keys = (q.options ?? []).map(o => o.key)
      ok(new Set(keys).size === keys.length, `${obj.id}：選項 key 不可重複（重複會讓 React 配對錯節點）`)
      // ⚠️ badge 一定要在 BADGES 裡查得到，否則畫面會顯示原始 slug
      //    （arBadges.js 刻意「查不到就顯示 slug 而不是藏起來」，但那是保底不是設計）
      if (q.badge) ok(!!BADGES[q.badge], `${obj.id}：徽章 ${q.badge} 必須在 BADGES 裡有定義`)
    }
  }

  // ★★ 小挑戰是這條 AR 動線唯一的獎勵：掃到 → 看 3D → 讀知識卡 → 答題 → 拿徽章。
  //    先前只有不用相機的 `/ar/card/:slug` 有，**真的拿卡片掃到的人反而走不到**。
  const model = stripComments(read('../src/screens/ArModel.jsx'))
  // ★★★ 2026-08-16 起模型頁的小挑戰改成**在對話串裡**出題（使用者指定）：
  //   角色在泡泡裡問，下面那排 chip 暫時變成選項，答完再由角色回饋。
  //   ⚠️ 所以模型頁**不再**掛 ArQuiz——同一段動線不該有兩套出題 UI。
  //      沒有對話框的 `/ar/card/:slug` 仍然用 ArQuiz。
  ok(!/ArQuiz/.test(model), '★★ 模型頁不可再掛 ArQuiz（出題已移進對話串）')
  ok(/from '\.\.\/components\/ArQuiz\.jsx'/.test(stripComments(read('../src/screens/CardPage.jsx'))),
    '★ 卡片頁仍用 ArQuiz（那一頁沒有對話框）')

  // ── 跟角色說話（`src/components/ArTalk.jsx`）──
  const talk = stripComments(read('../src/components/ArTalk.jsx'))
  ok(/ArTalk/.test(model), '★★ 模型頁要有對話面板')
  ok(/askQuiz/.test(talk) && /answerQuiz/.test(talk) && /const \[qz, setQz\]/.test(talk),
    '★★★ 對話面板要自己出題與判定')
  // ⚠️ 站上的題目**全部是複選** ⇒ 不可做成「點一下就作答」，要能勾選再送出。
  ok(/aria-pressed=\{qz\.picked\.includes\(o\.key\)\}/.test(talk) && /artalk-opt-send/.test(talk),
    '★★★ 選項要可勾選（aria-pressed）並另有送出鍵（題目全是複選）')
  ok(/送出後才標對錯|作答中就標紅/.test(SRC.talkRaw),
    '★★ 送出後才標對錯（作答中就標紅等於直接給答案）')
  // ★★ 徽章狀態：已擁有要在**題目之前**講，而且寫成邀請；拿到徽章要在**作答之後**講。
  ok(/這枚徽章你已經有了/.test(talk) && talk.indexOf('這枚徽章你已經有了') < talk.indexOf('你拿到徽章'),
    '★★ 已擁有的提示要在題目之前，拿到徽章要在作答之後')


  // ★★★★ 2026-08-11 起對話**可以**接語言模型，但只在「卡片上查不到」時，
  //   而且一定要走**伺服器的 persona 模式**（白名單系統提示 ＋ 執行期法規守門）。
  //   ⚠️ 絕對不可以繞過後端直接打模型：那條路沒有 `HEALTH_RE`，
  //      而讓 LLM 扮演白菜開口，它兩三句內就會自己講到維生素。
  //   詳細的防線檢查在下面「AR 角色的開放式問答」那一段。
  ok(!/openai|api\.openai|Authorization/i.test(talk),
    '★★★★ 對話面板不可自己打模型（必須經過後端的 persona 模式與法規守門）')
  ok(/f\.value/.test(talk) && /facts/.test(talk),
    '★★★ 答案要逐字取自 facts[].value（不改寫才查得到出處）')

  // ★★ 這條動線真正「活起來」的關鍵：說話時開 talk 疊加通道。
  //    那條通道 actor.js 早就寫好，但在這之前**沒有任何地方使用**。
  ok(/setOverlay\('talk'/.test(talk), "★★ 說話時要開 setOverlay('talk') 疊加通道")
  ok(/setOverlayLevel/.test(talk), '★★ 要驅動音量包絡（固定值看起來像機器震動不像人講話）')
  // ⚠️ 同理：`setOverlay(null)` 在 hush() 也有一次，只檢查「出現過」的話
  //    把 finish() 裡那次刪掉照樣通過。要求**至少兩處**（hush ＋ finish）。
  ok((talk.match(/setOverlay\(null\)/g) || []).length >= 2,
    '★★ 講完與中斷時都要關掉疊加通道（留著角色會一直微微起伏，像「還在講但沒聲音」）')

  // ★★★ 看門狗：不可以把「能不能再提問」交給語音合成引擎。
  //   `synth.speak()` 靜默失敗時 onend/onerror 都不觸發 ⇒ busy 永遠是 true
  //   ⇒ 每一顆提問 chip 永久 disabled，而畫面看起來完全正常。
  // ⚠️ 不可只寫 /guardRef/：那個識別字在宣告與 clearTimeout 也出現，
  //    把看門狗拆掉照樣通過（變異測試抓到的）。要比對**排程那一行**。
  ok(/setTimeout\(finish,/.test(talk),
    '★★★ 語音要有逾時看門狗（引擎靜默失敗時不可把對話鎖死）')

  // ⚠️ speechSynthesis 是全域單例、跨頁面存活：不 cancel 的話使用者按上一頁
  //    離開之後聲音還會繼續唸完，而畫面上已經沒有東西能停它。
  ok(/cancel\(\)/.test(talk) && /useEffect\(\(\) => hush/.test(talk),
    '★★ 卸載時一定要停止語音（全域單例會跨頁面繼續唸）')

  // ⚠️ 語音是輔助不是替代：不支援合成的瀏覽器一樣要看得到全部的字
  ok(/speechSupported\(\)/.test(talk) && /if \(!speechSupported\(\)\) \{ finish\(\)/.test(talk),
    '★ 不支援語音時要照樣顯示文字並解鎖（語音是輔助不是替代）')

  // actor 要真的交到 React 手上，否則對話面板點了不會有反應
  ok(/jq-actor-ready/.test(model), '★★ 角色元件要把 actor 交給 React（對話面板靠它驅動）')
  ok(/actor: null/.test(model),
    '★★ 卸載時要把 actor 收回 null（否則會對著已 dispose 的場景下指令）')

  // ★★ 模型頁的知識卡不可限高自捲。`.scan-hit` 的 max-height 是為 `/AR` 設的
  //    （那裡它疊在相機畫面上），照搬到模型頁會把小挑戰**藏進卡片內部的捲軸**
  //    ——實測卡片可視 354／內容 619，答題區完全看不到而且毫無跡象。
  ok(/\.armodel-body \.scan-hit\s*\{[^}]*max-height:\s*none/.test(SRC.css),
    '★★ 模型頁的 .scan-hit 要解除限高（否則小挑戰被藏在卡片的內部捲軸裡）')

  // ⚠️ 出題移進對話串之後，模型頁不再需要捲動到題目——但**也不可以用
  //    scrollIntoView**（對 `.device .body` 是靜默無效的），所以這條反向鎖著。
  ok(!/scrollIntoView/.test(model),
    '★★ 模型頁不可用 scrollIntoView（對 .body 容器是靜默無效的）')

  // ── 對話面板的排版（2026-08-11 依參考圖調整）──
  // 角色佔上半 → 對話泡泡（尖端朝上）→ 2×2 選項格 → 底部輸入列。
  // ⚠️ 這兩條原本一個掃全檔、一個從 `.artalk-grid` 一路 slice 到檔尾，
  //    於是「把選項改成一欄」「把尖角選擇器改名」都照樣通過（變異測試抓到的）。
  //    要**抓出那一條規則本身**再比對。
  const cssRule = (sel) => {
    const i = SRC.css.indexOf(sel)
    if (i < 0) return ''
    const j = SRC.css.indexOf('}', i)
    return j < 0 ? '' : SRC.css.slice(i, j + 1)
  }
  const tail = cssRule('.artalk-bubble::before')
  // ⚠️ 2026-08-11 從兩個尖角改成**一個**：兩個看起來像頁籤不像說話。
  //    「只有一個」那條在下面的排版段落鎖著（含 `::after` 不可存在）。
  ok(/artalk-bubble/.test(talk) && /border-top:\s*\d/.test(tail) && /bottom:\s*-\d/.test(tail),
    '★ 對話泡泡要有朝下的尖角（泡泡在角色上方，尖角要往下指向它）')
  ok(/grid-template-columns:\s*repeat\(2/.test(cssRule('.artalk-grid {')),
    '★ 選項要排成 2 欄')
  ok(/artalk-form/.test(talk) && /artalk-input/.test(talk) && /發送/.test(talk),
    '★ 底部要有手動輸入列與發送鈕')

  // ★★★ 泡泡一定要限高自捲。長答案（例如「查不到」那一則會列出三個建議問題）
  //   會把底下的選項與輸入列往下推——實測顯示過歷史紀錄時輸入列跑到 top 984，
  //   而視窗只有 889，使用者要捲下去才打得到字。
  ok(/\.artalk-bubble[^}]*max-height/.test(SRC.css),
    '★★★ 對話泡泡要限高自捲（否則長答案會把輸入列推出畫面）')

  // ★★★ 手動輸入的答案也**只能來自卡片自己的資料**。
  //   這是「可以自由輸入」與「不可以編造」之間唯一誠實的接法。
  ok(/function findAnswer/.test(talk) && /f\.value/.test(talk),
    '★★★ 手動輸入要在卡片資料裡找答案（逐字用 fact.value）')
  // ★★★ 查不到就要**明說查不到**。掰一個看起來合理的句子＝把法規閘門繞過去，
  //   因為那句話不會經過建置期的營養／療效掃描。
  ok(/沒有寫到這個|查不到|只認得卡片/.test(talk),
    '★★★ 查不到時要誠實說查不到（不可掰，掰出來的句子閘門掃不到）')

  // ── 連續場景（2026-08-11 依參考圖再調一次）──
  ok(/armodel-scene/.test(model) && /\.armodel-scene/.test(SRC.css),
    '★ 角色與對話面板要在同一個場景容器裡（參考圖是一整片連續的畫面）')
  ok(/position:\s*absolute/.test(cssRule('.artalk {')),
    '★ 對話面板要疊在場景上（不是排在下面）')

  // ★★★ 角色的框景要把「被控制項蓋住的那一段」扣掉，否則臉正好被泡泡遮住
  //   ——而那是這一頁唯一要看的東西。
  ok(/visible:\s*\{\s*default/.test(model) && /this\.data\.visible/.test(model),
    '★★★ jq-fit 要吃「可見比例」')
  // ⚠️ 不可只驗「有算出 shift」——把它算出來卻不套用照樣通過（變異測試抓到的）。
  //    要驗**套用**那一行。
  ok(/tanV \* vis/.test(model) && /y:\s*-shift/.test(model),
    '★★★ 可見比例要同時用在「算距離」與「把相機往下移」兩處（且真的套用）')
  // ★★★ 那個比例必須是**量出來的**。對話面板的高度會隨字級、答案長短、
  //   有沒有小挑戰而變（實測 0.52~0.58），寫死就會在某些狀態下把臉遮掉。
  ok(/getBoundingClientRect\(\)\.height/.test(model) && /- covered \/ h/.test(model),
    '★★★ 可見比例要量對話面板的實際高度，不可寫死比例')
  // ★★★ 泡泡移到角色上方之後，可見區**不再貼著畫布頂端** ⇒ 只給比例不夠，
  //   還要給它從哪裡開始。少了 offset，角色會被往上頂、臉躲進泡泡後面。
  ok(/offset:\s*\$\{off/.test(model) && /say\.getBoundingClientRect\(\)\.bottom/.test(model),
    '★★★ 可見區的起點（offset）也要量出來（泡泡在角色上方，不再貼齊畫布頂端）')
  ok(/const f = off \+ vis \/ 2/.test(model) && /\(0\.5 - f\)/.test(model),
    '★★ 相機位移要用「可見區中心 vs 畫布中心」的通式（舊的 1-vis 只對貼頂端成立）')
  // ★★★ 沒有 update() 的話，setAttribute('jq-fit', …) 寫得進去但**不會重新框景**
  //   ——縮放一點反應都沒有而且不報錯（實測捏合到 2 倍，相機 z 仍停在 5.88）。
  ok(/update\(\) \{ this\.fit\(\) \}/.test(model),
    '★★★ jq-fit 要有 update()（否則縮放與可見區寫得進去卻毫無反應，且不報錯）')

  // ★★ 深色場景背景是**全站唯一的 UI 漸層例外**（站規是「印刷不會有漸層」）。
  //   鎖住它是為了兩件事：① 不會被誤刪而變回淺底（淺底配淺色文字＝看不見）；
  //   ② 不會被複製到別的地方去。
  ok(/radial-gradient/.test(cssRule('.armodel-scene')),
    '★★ 場景背景幕（全站唯一的漸層例外，只准在這一個 class）')

  // ★★★ 資料卡預設收起來，而小挑戰在**它裡面** ⇒「考考我」一定要先展開再捲。
  //   少了 setShowCard(true)，quizRef.current 是 null ⇒ 捲動靜默失敗 ⇒
  //   畫面上什麼都不會發生，而角色剛剛才說「好啊，往下看——我出一題」。
  ok(/showCard && \(/.test(model) && /aria-expanded=\{!!detailOpen\}/.test(talk),
    '★★ 資料卡要收在開關後面，且開關要有 aria-expanded')
  // ★★★ 詳細資料是**彈窗**（使用者要求）。一定要走 SheetMask：
  //   Esc、焦點鎖、role="dialog"、離場動畫都做在那裡，自己刻一個 div 會少掉
  //   這四件事，而少掉的每一件在畫面上都看不出來。
  ok(/<SheetMask/.test(model) && /className="sheet armodel-sheet"/.test(model),
    '★★★ 詳細資料要走 SheetMask 彈窗（Esc／焦點鎖／role=dialog 都在那裡）')
  // ★★ 底部那兩顆（看完整內容／再掃一次）已依使用者要求從頁面移除，
  //   **必須改放進彈窗**——直接刪掉的話，從相機跳進來的人就沒有路回去再掃一張。
  {
    const i = model.indexOf('<SheetMask')
    const j = model.indexOf('</SheetMask>')
    ok(i > 0 && j > i && model.slice(i, j).includes('armodel-acts'),
      '★★ 「看完整內容／再掃一次」要在彈窗裡（從頁面移除後不可整個消失）')
  }
  // ★★★ 底下那條「看資料卡」與手勢說明已依使用者要求移除 ⇒ 入口必須另有著落，
  //   否則資料卡只剩「考考我」一條路進得去（那是答題不是查資料）。
  //   ⚠️ 也不可以做成場景頂端獨立的一列：那一列佔掉畫布 56px，而**每一格高度
  //      都會直接換算成角色變小**（jq-fit 按可見區算距離）。放進選項格是免費的
  //      ——原本 5 顆就已經是 3 列，加到 6 顆還是 3 列。
  // ══════════ AR 角色的開放式問答（AI persona）══════════
  //
  // ★★★★ 這一段是**法規防線**。卡面資料有建置期閘門掃過（上面的 G 段），
  //   但 2026-08-11 起「卡上查不到」會轉給 AI 回答——而**建置期的閘門碰不到
  //   執行期的模型輸出**。唯一的防線是伺服器的 `HEALTH_RE`，所以這裡要確認：
  //   ① 它存在且真的接在串流的守門上；② 它抓得到該抓的；③ 不誤殺公共安全提醒。
  {
    const srv = SRC.server
    ok(/const AR_PERSONAS = /.test(srv) && /AR_PERSONAS\[req\.body\.persona\]/.test(srv),
      '★★★ persona 必須是伺服器端白名單（前端只能送 id，不能送系統提示）')
    ok(/const persona = typeof req\.body\?\.persona === 'string'/.test(srv),
      '★★ persona 只接字串 id')
    ok(/persona && HEALTH_RE\.test\(text\)/.test(srv) && /gate\('health', AR_HEALTH_REFUSAL\)/.test(srv),
      '★★★★ 法規守門要接在串流的輸出檢查上（建置期閘門掃不到 AI 生成的字）')
    ok(/sse\(\{ replace: replaceWith \}\)/.test(srv),
      '★★ 攔到要**整段換掉**，不是刪字（半句被挖空讀起來像壞掉）')
    // ★★★★ 守門只能有**一份實作**：兩份遲早分岔，而分岔的那一份不會有人發現
    //   （它平常永遠通過）。兩支端點都必須走同一個 streamGuarded。
    ok((srv.match(/async function streamGuarded/g) || []).length === 1
      && (srv.match(/HEALTH_RE\.test/g) || []).length === 1,
      '★★★★ 法規守門只能有一份實作（兩支端點共用 streamGuarded）')
    ok((srv.match(/await streamGuarded\(res, \{/g) || []).length === 2,
      '★★ /api/ar/talk 與 /api/ai/chat 都要走 streamGuarded')

    // ★★★ 訪客也要走得到模型：掃到卡片的人多半還沒註冊，走 /api/ai/chat 的話
    //   requireAuth 一律 401 ⇒ 模型從頭到尾不會被叫用，使用者只會看到罐頭回覆。
    ok(/app\.post\('\/api\/ar\/talk', arTalkLimiter/.test(srv),
      '★★★ /api/ar/talk 不可加 requireAuth（訪客是這條動線的主要客群）')
    ok(/if \(!persona\) return res\.status\(400\)/.test(srv),
      '★★★ 沒有登入把關 ⇒ persona 不合法一律拒絕（這支只服務官方卡包）')
    ok(/AR_TALK_DAILY_MAX/.test(srv) && /arTalkCount >= AR_TALK_DAILY_MAX/.test(srv),
      '★★★ 沒有登入把關 ⇒ 要有每日總量上限（被濫用時停掉，不是把帳單燒穿）')
    ok(/const arTalkLimiter = rateLimit/.test(srv),
      '★★ /api/ar/talk 要有 IP 速率限制')

    // ★★★ 負向檢查要先證明自己抓得到。樣本就是使用者參考圖上的原文，
    //   以及最典型的療效說法。
    const m = srv.match(/const HEALTH_RE = new RegExp\(\[([\s\S]*?)\]\.join\('\|'\)\)/)
    ok(!!m, '★★ 找得到 HEALTH_RE 的定義')
    if (m) {
      const src = m[1].split('\n').map(l => l.trim().replace(/^'/, '').replace(/',?$/, ''))
        .filter(Boolean).join('|')
      const re = new RegExp(src)
      for (const bad of [
        '我富含維生素 C 喔', '膳食纖維可以促進腸道蠕動', '硫化物具有抗氧化作用',
        '幫助維持免疫力', '熱量很低', '可以幫助消化', '有降血壓的效果',
      ]) ok(re.test(bad), `★★★★ 法規守門要攔下：「${bad}」`)
      // ⚠️ 卡面的一氧化碳提醒是**公共安全資訊**不是食品健康宣稱，不可誤殺
      for (const okText of [
        '天冷洗澡要保持通風，避免一氧化碳中毒',
        '小寒前後正是我最甜的時候',
        '彰化溪湖、雲林元長都有種',
      ]) ok(!re.test(okText), `★★ 法規守門不可誤殺：「${okText}」`)
    }

    // ★★ AI 的回答沒有出處，畫面上一定要與卡面資料分開——這一頁的信任基礎
    //    是「每一句都查得到出處」，混在一起就毀了。
    ok(/artalk-aitag/.test(talk) && /latest\?\.ai &&/.test(talk),
      '★★★ AI 生成的回覆要標記（它沒有出處，不可與卡面資料混在一起）')
    // ⚠️ 訪客沒有 session ⇒ /api/ai/chat 一律 401 ⇒ 要走誠實的「卡上沒寫到」，
    //    不可以讓使用者按了沒反應。
    // ⚠️ 不再看有沒有登入——訪客走 /api/ar/talk。但 `findAnswer` 仍是降級路徑
    //   （未設金鑰、額度用完、網路斷線），不可以刪掉。
    ok(/if \(objectId\) \{ askAi\(t\); return \}/.test(talk) && !/aiReady/.test(talk),
      '★★★ 訪客也要走 AI（不可再用「有沒有登入」當條件）')
    ok(/const hit = findAnswer\(t, card, obj\)/.test(talk),
      '★★ AI 走不通時仍要用卡片資料回答（未設金鑰／額度用完／斷線）')
    // ★★★★ `onDelta` 給的是**累積全文**不是增量（api.js：`full += m.delta;
    //   onDelta?.(full, false)`）。寫成 `got += d` 會變成平方級的重複亂碼，
    //   而且**被守門攔下時的 replace 會被接在髒字後面**——那正是守門要移除的
    //   東西。這個 bug 寫進去兩版都沒被發現，因為 AI 那條路在本機從來沒被真的
    //   跑起來過（訪客一律 401）。
    ok(/onDelta: \(full\) =>/.test(talk) && /got = full/.test(talk) && !/got \+=/.test(talk),
      '★★★★ onDelta 收到的是累積全文，不可以再累加（否則守門的 replace 會失效）')

    // ★★★★ 後端的**短路分支回 JSON 不是 SSE**（婉拒／危機／未設金鑰），
    //   那時 onDelta 一次都不會被呼叫。先前這裡只看 `got`，於是所有婉拒都掉進
    //   「網路好像卡了一下」——對使用者陳述一件不實的事，而且連問三次都一樣，
    //   反而讓對方確認那是攔截而非故障。
    ok(/meta = await api\.aiChatStream/.test(talk) && /!got && meta\?\.reply/.test(talk),
      '★★★★ 要用 aiChatStream 的回傳值處理婉拒／危機（不可只看串流有沒有內容）')
    ok(!/網路好像卡了一下/.test(talk),
      '★★★★ 不可用假的網路錯誤當婉拒的替身（不誠實，而且真的斷線時分不出來）')

    // ★★★★ 危機情境：固定腳本、號碼寫死、不經過模型。
    ok(/const CRISIS_RE = new RegExp/.test(srv) && /crisisReply/.test(srv),
      '★★★★ 危機情境要有固定腳本（不可交給模型回想電話號碼）')
    for (const num of ['1925', '1995', '113', '119']) {
      ok(new RegExp(num).test(srv), `★★★★ 危機腳本要寫死 ${num}`)
    }
    {
      const i = srv.indexOf("app.post('/api/ar/talk'")
      const seg = srv.slice(i, srv.indexOf('streamGuarded', i))
      ok(seg.indexOf('CRISIS_RE.test') > 0 && seg.indexOf('CRISIS_RE.test') < seg.indexOf('AI_ABUSE_RE.test'),
        '★★★★ 危機判定要在最前面（比注入、比模型都早）')
    }
    // ★★★ 判定與說法要分開：注入類要用**角色內**的台詞，不可套法規那一句
    //   （使用者看到的理由會跟他問的事情完全對不上），也不可用顧問的口吻。
    // ⚠️ 第一版只檢查 AR_REFUSALS 存在 ⇒ 把注入分支換成法規那一句照樣通過
    //    （變異測試抓到）。要鎖住**注入分支真的用注入的台詞**。
    ok(/AR_REFUSALS/.test(srv) && /INJECTION:/.test(srv)
      && /AI_ABUSE_RE\.test\(lastUser\)\) \{[\s\S]{0,120}?AR_REFUSALS\.INJECTION/.test(srv),
      '★★★ 婉拒要分類，而且注入分支要用注入的台詞（不可套法規那一句）')
    ok(/persona \? AR_REFUSALS\.CODE : AI_REFUSAL/.test(srv),
      '★★ persona 模式要用角色內的台詞（AI_REFUSAL 是國民曆顧問的口吻）')

    // ★★★★ 中文在 UTF-8 是 3 bytes，而 chunk 邊界不保證對齊字元邊界——
    //   對每個 chunk 各自 toString('utf8') 會吐出 U+FFFD（畫面上的「�」）。
    //   ⚠️ 這個 bug 只在中文＋剛好切在字中間時出現，英文測試永遠測不到，
    //      本機 localhost 也因為 Node 會合併 chunk 而不容易重現。
    ok(/new StringDecoder\('utf8'\)/.test(srv) && /decoder\.write\(Buffer\.from\(chunk\)\)/.test(srv)
      && /decoder\.end\(\)/.test(srv),
      '★★★★ SSE 解碼要用 StringDecoder（逐 chunk toString 會切出 U+FFFD）')

    // ★★ 免責標註要在捲動區**之外**，否則長回覆會把它捲出可視範圍＝等於沒有。
    ok(/artalk-aitag/.test(talk)
      && talk.indexOf('artalk-aitag') > talk.indexOf('</div>', talk.indexOf('artalk-bubble-in')),
      '★★ 免責標註要釘在泡泡底部、捲動區之外')
    ok(/\.artalk-aitag \{[^}]*flex: 0 0 auto/.test(SRC.css),
      '★★ 免責標註不可被壓縮（flex: 0 0 auto）')

    // ══════════ 成本與濫用（唯一會真的花到錢的攻擊面）══════════
  //
  // ★★★★ `/api/ar/talk` 不需要登入 ⇒ 有心人寫個迴圈灌長文就直接轉成 OpenAI 帳單。
  //   外部稽核實測：輸入框 maxLength = -1，塞 5,200 字前後端都沒擋。
  {
    const srv2 = SRC.server
    // ⚠️ 第一版寫成掃全檔的 /status\(413\)/，但圖片上傳那支也回 413
    //    ⇒ 把這裡改掉照樣通過（變異測試抓到）。要**只看這支端點的區段**。
    {
      const i = srv2.indexOf("app.post('/api/ar/talk'")
      const seg = srv2.slice(i, srv2.indexOf('streamGuarded', i))
      // ⚠️ 只檢查「檔案裡有 413」是不夠的：把條件改成 if (false) 之後那一行
      //    還在，照樣通過（變異測試抓到）。要鎖住**判斷條件本身**。
      ok(/if \(last\.length > AR_TALK_MAX_CHARS\) \{[\s\S]{0,160}?res\.status\(413\)/.test(seg),
        '★★★★ 單則輸入超長要回 413（前端 maxLength 可繞過，這層才算數）')
    }
    ok(/if \(!last\.trim\(\)\) return res\.status\(400\)/.test(srv2),
      '★★ 空白輸入要回 400，不可送進模型')
    // ⚠️ 不可**默默截斷**：使用者以為模型讀完了他打的東西，其實只讀了前一小段。
    ok(!/content\)\.slice\(0, 300\)/.test(srv2),
      '★★ 不可默默把使用者的輸入截短（要明確拒絕）')
    ok(/maxLength=\{MAX_CHARS\}/.test(talk) && /const MAX_CHARS = /.test(talk),
      '★★ 輸入框要有 maxLength（即時提示；真正的防線在後端）')
    ok(/artalk-count/.test(talk), '★ 接近上限要有字數提示')
    ok(/e\?\.status === 413/.test(talk),
      '★★★ 413／400 要照實顯示，不可混進「訊號不好」（否則使用者一直重送五千字）')
  }

  // ══════════ 無障礙與資訊架構 ══════════
  {
    // ★★★ 3D 角色是這一頁的主角，但 <canvas> 對輔助技術完全不存在。
    ok(/setAttribute\('role', 'img'\)/.test(model) && /aria-label.*3D 角色/.test(model),
      '★★★ 角色 canvas 要有 role="img" 與 aria-label')
    // ★★★ 只有滑鼠拖曳的話，鍵盤使用者連「轉到背面看看」都做不到。
    ok(/ArrowLeft/.test(model) && /ArrowUp/.test(model) && /addEventListener\('keydown', this\.onKey\)/.test(model),
      '★★★ 角色要能用方向鍵轉動（手勢不可是唯一操作方式）')
    ok(/setAttribute\('tabindex', '0'\)/.test(model), '★★ canvas 要可聚焦，鍵盤才到得了')

    // ★★★ 標題階層：堆疊畫面（H1）必須排在根分頁（H2×3）**之前**。
    //   原本 DOM 是 H2→H2→H2→H1，搜尋引擎與螢幕閱讀器都吃虧。
    const app = stripComments(read('../src/App.jsx'))
    ok(app.indexOf('{TopScreen && (') < app.indexOf('className={`rootpane tab-'),
      '★★★ 堆疊畫面要排在根分頁之前（否則每個詳情頁都是 H2→H2→H2→H1）')
    // ⚠️ 而且不可以改成「有堆疊就不渲染 rootpane」——那會把分頁的捲動位置與
    //    已抓好的清單全部丟掉。rootpane 必須仍然無條件渲染。
    ok(/<div key=\{`root-\$\{tab\}`\} inert=/.test(app),
      '★★ rootpane 仍要留在 DOM（捲動還原靠它）且有堆疊時要 inert')

    // ★★ 訪客沒有帳號可登出
    const nav = stripComments(read('../src/components/WebNav.jsx'))
    ok(/user\?\.guest \? '登入／註冊' : '登出'/.test(nav),
      '★★ 訪客要顯示「登入／註冊」而不是「登出」')

    // ★★ meta description 不可預設對方已經掃過卡片（這頁不用卡片也能用）
    const seo = stripComments(read('../server/seo.js'))
    ok(/不需要實體卡片/.test(seo) && !/掃到卡片之後可以放下卡片/.test(seo),
      '★★ 模型頁的 description 不可預設使用者已有實體卡')
    // ★ 分享預覽圖用這張卡自己的卡面，不要全站共用一張
    ok(/p === '\/ar\/model\/:slug' \|\| p === '\/ar\/card\/:slug'/.test(srv),
      '★ AR 頁的 og:image 要用該卡的卡面圖')
  }

  // ══════════ 時間感（語言模型沒有時鐘）══════════
  //
  // ★★★★ 先前系統提示裡完全沒有日期，模型只好把卡片上的「小寒」當成此刻——
  //   8 月的台灣它開口就是「小寒的風有點冷」，問它今天幾號則答「想不出來」。
  //   使用者看到那句話的第一反應是「這東西壞了」。
  {
    ok(/personaTimeBlock/.test(srv) && /const sys = persona \+ personaTimeBlock/.test(srv),
      '★★★★ 系統提示要接上時間區塊（模型沒有時鐘，一切「現在」都要餵給它）')
    // ⚠️ 時間區塊必須**逐次請求**算。烤進 AR_PERSONAS 的話那是啟動時算一次的，
    //    服務跑過午夜就會一直講昨天。
    {
      const i = srv.indexOf('const AR_PERSONAS = (() =>')
      const j = srv.indexOf('})()', i)
      ok(i > 0 && !srv.slice(i, j).includes('cardTimeContext'),
        '★★★ 時間不可烤進靜態的 AR_PERSONAS（跑過午夜就會一直講昨天）')
    }
    ok(/【現在的時間/.test(srv) && /【語態/.test(srv),
      '★★★ 提示要同時給「現在是什麼時候」與「該用什麼語態」')
    ok(/不可以說「想不出來」/.test(srv),
      '★★★ 要明講被問到日期／節氣時不可以說想不出來（那些值就在提示裡）')

    // ★★★ 語態三態的實測（等同回歸測試 #10：模擬三個日期各跑一次）。
    //   ⚠️ 這是**確定性**的，不需要等到小寒也不需要動系統時鐘。
    const { cardTimeContext, greetingFor, cardTimeLabel } = await import('../src/data/cardTime.js')
    const { OFFICIAL_CARDS, objectForHotspot } = await import('../src/data/arCards.js')
    const card0 = OFFICIAL_CARDS[0]
    const obj0 = objectForHotspot(card0.hotspots.find(h => h.primary))
    const cases = [
      ['2026-08-16', 'BEFORE', '立秋', 142],
      ['2027-01-05', 'DURING', '小寒', 0],
      ['2027-01-25', 'AFTER', '大寒', -20],
    ]
    for (const [iso, phase, term, days] of cases) {
      const [y, m, d] = iso.split('-').map(Number)
      const ctx = cardTimeContext(card0, new Date(y, m - 1, d))
      ok(ctx.phase === phase, `★★★ ${iso} 的 phase 應為 ${phase}（實際 ${ctx.phase}）`)
      ok(ctx.currentTerm === term, `★★★ ${iso} 的實際節氣應為 ${term}（實際 ${ctx.currentTerm}）`)
      ok(ctx.daysUntil === days, `★★ ${iso} 距小寒應為 ${days} 天（實際 ${ctx.daysUntil}）`)
      const g = greetingFor(obj0, ctx)
      ok(!!cardTimeLabel(ctx), `★★ ${iso} 要有狀態帶文案`)
      // ★★★★ BEFORE／AFTER 絕不可講出卡片那句現在式的開場白
      if (phase !== 'DURING') {
        ok(!g.includes(obj0.line),
          `★★★★ ${iso}（${phase}）不可把卡片的現在式開場白照講（那正是「小寒的風有點冷」那個 bug）`)
      }
      // ⚠️ 只驗「沒有照講卡片那句」還不夠：把 AFTER 的分支拿掉會掉進 BEFORE 的
      //    句子，那句同樣不含卡片原文 ⇒ 照樣通過（變異測試抓到）。
      //    要各自驗**這一態該說的話**。
      if (phase === 'BEFORE') ok(g.includes('還要等') && g.includes(String(days)),
        `★★★★ BEFORE 要用期待式並講出還有幾天（實際：${g.split('\n')[0]}）`)
      if (phase === 'AFTER') ok(g.includes('已經過去'),
        `★★★★ AFTER 要用回顧式（實際：${g.split('\n')[0]}）`)
      if (phase === 'DURING') ok(g.includes(obj0.line),
        `★★★ DURING 才可以用卡片的現在式開場白（實際：${g.split('\n')[0]}）`)
    }
    ok(cardTimeContext(card0, new Date(2027, 0, 5)).cardTermISO === '2027-01-05',
      '★★★ 2027 小寒的交節日要算成 01-05（termLocalDay 的序號是立春起算，會差一年）')

    // ★★★ 狀態帶：讓使用者一眼看出「我在看的是今天，還是一張未來的卡」。
    ok(/armodel-when/.test(model) && /cardTimeLabel/.test(model),
      '★★★ 模型頁要有時間狀態帶')
    ok(/greetingFor\(obj, cardTimeContext\(card\)\)/.test(talk),
      '★★★★ 開場白要跟著今天決定語態（不可直接用卡片的現在式那句）')

    // ★★★ 泡泡高度一變就要重新框景，否則泡泡會壓在角色頭上。
    ok(/onLayout\?\.\(\)/.test(talk) && /\[log, thinking, onLayout\]/.test(talk),
      '★★★ 泡泡內容變動要通知上層重新框景（否則答案一長就壓到角色頭上）')

    // ★★ 使用者訊息要有實心氣泡：原本是深藍底上的淺灰小字，對比遠低於 AA，
    //    整段對話讀起來像 AI 在自言自語。
    ok(/\.artalk-asked \{[^}]*background:/.test(SRC.css),
      '★★ 使用者說的那一句要有實心氣泡（不可是深底上的淺灰小字）')
  }

  // ★ 語言跟隨：使用者用英文問就用英文答，婉拒也一樣。
    {
      const i = srv.indexOf('const AR_PERSONA_RULES')
      const rules = i < 0 ? '' : srv.slice(i, srv.indexOf('].join', i))
      ok(/【語言】/.test(rules) && /相同的語言/.test(rules), '★ 系統提示要求跟隨使用者的語言')
      ok(/絕對不要提到營養或法規/.test(rules),
        '★★★ 範圍外的問題不可扯到營養法規（那與對方問的事情完全無關）')
    }
    // ★★★ 2026-08-11 使用者指定把兩層對調：**AI 是主聲道，卡片資料是它查得到
    //   的資料**。所以整張卡（含其他熱區）都要進伺服器端的系統提示——否則問
    //   「臘八是哪一天」它會說不知道，而卡片上明明就有。
    ok(/【同一張卡上的其他資料/.test(srv) && /h\.objectId !== hs\.objectId/.test(srv),
      '★★★ persona 要帶整張卡的資料（不只自己那一格），模型才答得出別區的東西')
    // ⚠️ 第一版寫成 `/一律照抄/.test(srv)`，但曆訊那段也有「數字一律照抄」
    //    ⇒ 拿掉這裡照樣通過（變異測試抓到）。要**只看 AR_PERSONA_RULES 那一塊**。
    {
      const i = srv.indexOf('const AR_PERSONA_RULES')
      const rules = i < 0 ? '' : srv.slice(i, srv.indexOf('].join', i))
      ok(/一律照抄/.test(rules) && /附上出處/.test(rules),
        '★★★ 角色的規則裡要求數字／品種／地名／日期照抄並附出處（聊天不等於可以改寫資料）')
      ok(/聊天/.test(rules) && /寒暄/.test(rules),
        '★★ 角色的規則要明講「像朋友聊天」（先前的版本讀起來像查詢機）')
      // ⚠️ 2026-08-16 使用者指定：卡上沒有的就**直接回答**，不要每則都先聲明
      //    「卡片上沒寫，不過…」——那句每次都出現很囉嗦。
      //    ★★★ 但出處那件事不能就這樣消失，它**改由畫面上的「AI 生成 · 非卡片
      //    原文」標記負責**（那條閘門在上面，兩者是一組的，不可只留一邊）。
      ok(/直接回答/.test(rules) && /不要每次都先聲明/.test(rules),
        '★★ 卡上沒有的要直接回答，不可每則都先聲明「卡片上沒寫」')
      ok(/AI 生成 · 非卡片原文/.test(rules) || /artalk-aitag/.test(talk),
        '★★★ 出處改由畫面標記負責 ⇒ 那個標記不可以被拿掉')
      ok(/不要把自己的推測講得像卡片上的事實/.test(rules),
        '★★★ 不先聲明不等於可以把推測講成卡片上的事實')
    }
    // ⚠️ `findAnswer` **不可以被刪掉**：它現在是降級路徑。訪客沒有 session ⇒
    //    /api/ai/chat 一律 401，那是常態不是例外；AI 失敗時也要退回它，
    //    否則網路抖一下連「品種是什麼」這種卡上明明有的問題都答不出來。
    ok(/const hit = findAnswer\(q, card, obj\)/.test(talk),
      '★★★ AI 失敗要退回卡片資料（不可只給一句空泛的道歉）')
    {
      const sub = talk.slice(talk.indexOf('const submit ='))
      ok(sub.indexOf('if (aiReady && objectId)') < sub.indexOf('const hit = findAnswer'),
        '★★ AI 是主聲道：有 AI 時走 AI，findAnswer 只在沒有 AI 時接手')
    }
  }

  ok(/onDetail && \(/.test(talk) && /artalk-opt/.test(talk)
    && !/armodel-toggle/.test(model) && !/armodel-hint/.test(model) && !/armodel-bar/.test(model),
    '★★ 資料卡入口要放在選項格裡（底下那條開關、手勢說明、場景頂端那一列都已移除）')

  // ★★★ **上下滑動是改變俯仰角度**（2026-08-11 使用者訂正：先前誤做成「換主題」）。
  //   ⚠️ 角度要夾住：不夾的話會轉到模型底下再翻過去，使用者迷失方向而且看到穿模。
  //   ⚠️ 這個上限**必須與 `jq-fit` 的 maxPitch 一致**——那邊拿它當靜態上界去算
  //      「縱向最多佔多高」，兩邊不一致就會在極端角度被裁掉。
  ok(/this\.pitch = Math\.max\(-35, Math\.min\(35,/.test(model)
    && /maxPitch: \{ default: 35 \}/.test(model),
    '★★★ 上下滑動＝俯仰，且夾角上限要與 jq-fit 的 maxPitch 一致（35）')
  ok(/rotation\.set\(\s*\n?\s*\(this\.pitch/.test(model),
    '★★ 俯仰角度要真的畫回去（只更新變數不套用＝拖了沒反應）')
  ok(!/jq-swap/.test(model), '★ 上下滑動不可再被當成「換主題」（使用者已訂正）')

  // ⚠️ 2026-08-11 使用者要求把主題列整條移除（畫面上只留兩顆選項）。
  //   換主題的入口因此不再存在——`findAnswer` 本來就會搜**整張卡**的所有物件，
  //   所以打字仍然問得到其他主題的內容，功能沒有消失。
  ok(!/artalk-tip/.test(talk) && !/artalk-swap/.test(talk),
    '★ 主題列已移除（使用者要求）')
  // ★★★ 選項只留**兩顆**。砍掉的四顆各自要有著落，不可以就這樣消失：
  //   三顆提問 → 打字（開場白要舉例）；做個動作 → 點角色本人。
  {
    const g = talk.slice(talk.indexOf('<div className="artalk-grid">'),
      talk.indexOf('</div>', talk.indexOf('<div className="artalk-grid">')))
    const n = (g.match(/className="artalk-opt tap"/g) || []).length
    ok(n === 2, `★★★ 選項只留兩顆（目前 ${n} 顆；每一列都會直接換算成角色變小）`)
  }
  // ⚠️ 第一版寫成 `/downYaw/`，但 downYaw 在 onDown 裡也出現 ⇒ 拿掉判定條件
  //    照樣通過（變異測試抓到）。要鎖住**比較**這件事本身。
  ok(/jq-poke/.test(model)
    && /Math\.abs\(this\.yaw - this\.downYaw\)\s*<\s*\d/.test(model)
    && /Math\.abs\(this\.pitch - this\.downPitch\)\s*<\s*\d/.test(model),
    '★★ 「做個動作」改成點角色本人，且必須與拖曳分開（轉完放手不可冒出動作）')
  // ⚠️ 「考考我」已改成在對話串裡出題，不再開彈窗、也不再捲動。
  ok(!/onQuiz=/.test(model), '★★ 「考考我」不可再開彈窗（出題已在對話串裡）')

  // ★★ 散景光點是**純裝飾**，必須滿足三件事，否則它就從「氣氛」變成「障礙」：
  //   ① `pointer-events:none`——它鋪滿整個場景（inset:-6%），會吃掉舞台的拖曳手勢，
  //      而症狀是「模型轉不動」，畫面上卻完全看不出有東西擋著。
  //   ② 疊在 canvas **之下**（z-index:0，而 .armodel-stage 是 auto 且在 DOM 之後）
  //      ——反過來的話一層霧蓋在角色臉上。
  //   ③ 走 `transform`／`opacity` 的無限動畫要能被 reduce-motion 關掉。
  const bokeh = cssRule('.armodel-scene::before')
  ok(/pointer-events:\s*none/.test(bokeh),
    '★★ 散景光點要 pointer-events:none（否則蓋住舞台、模型拖不動而且看不出原因）')
  ok(/z-index:\s*0\b/.test(bokeh),
    '★★ 散景光點要疊在 canvas 之下（否則像一層霧蓋在角色臉上）')
  ok(/prefers-reduced-motion:\s*reduce\)\s*\{\s*\.armodel-scene::before\s*\{\s*animation:\s*none/.test(SRC.css),
    '★ 散景光點的無限動畫要能被 reduce-motion 關掉')

  // ★★★ 開場白必須**把玩法講出來**。使用者是剛從相機被送過來的，畫面上是一隻
  //   會自轉的白菜、幾顆看起來像標籤的按鈕、一條輸入列——沒有任何前例可循。
  //   不講的話多數人只會看著它轉，而這一頁的全部價值都在「可以問它」。
  // ★★★ 三個點只能綁「想」那一段，不可綁整個 busy。
  //   共用旗標時答案會被三個點蓋住整段朗讀時間（40 字＝7 秒才看得到字），
  //   而那正是站規「語音是輔助不是替代，絕不可把文字藏在語音後面」在擋的事。
  //   ⚠️ 症狀只是「反應有點慢」，不會被回報成 bug ⇒ 一定要上閘門。
  ok(/const \[thinking, setThinking\]/.test(talk) && /\{thinking\s*$/m.test(talk)
    && !/\{busy\s*$/m.test(talk),
    '★★★ 泡泡的三個點要看 thinking 不是 busy（否則朗讀期間答案是看不到的）')
  ok(/setLog\(l => \[\.\.\.l, \{ who: 'char'[\s\S]{0,120}?setThinking\(false\)/.test(talk),
    '★★ 答案一進 log 就要停止三個點（字要與聲音同時出現）')

  // ★★★ 尖角是「這句話是它說的」的全部。它畫在外層且伸出框外（top:-11px），
  //   所以**外層絕不可有 overflow**——一有就被裁掉，而症狀只是「泡泡看起來
  //   像一塊圓角方塊」，沒有錯誤訊息，也沒人會想到是 overflow。
  //   限高與捲動一律放內層 `.artalk-bubble-in`。
  ok(/artalk-bubble-in/.test(talk), '★★ 泡泡要有內層（限高與捲動放內層）')
  ok(!/overflow/.test(cssRule('.artalk-bubble {')) && /overflow-y:\s*auto/.test(cssRule('.artalk-bubble-in')),
    '★★★ 泡泡外層不可有 overflow（會把尖角裁掉），捲動放內層')
  ok(/\.artalk-bubble::before\s*\{[\s\S]{0,240}?border-top:\s*\d+px solid/.test(SRC.css)
    && !/\.artalk-bubble::after/.test(SRC.css),
    '★★ 只要一個朝下的尖角（兩個看起來像頁籤不像說話）')

  // ★★★ `.btn-primary` 帶著 `width:100%`，在 flex 列裡 `flex-basis:auto` 會去讀
  //   `width` ⇒ 送出鈕的基準寬度是整列，把輸入框壓成一顆小藥丸。實測就是這樣。
  ok(/width:\s*auto/.test(cssRule('.artalk-send')),
    '★★★ 送出鈕要 width:auto 蓋掉 .btn-primary 的 width:100%（否則輸入框被壓扁）')

  // ★★★ 提問的選項砍掉之後，開場白**必須舉例告訴使用者可以問什麼**——
  //   否則畫面上只剩「考考我／看詳細資料」兩顆，沒有人會知道它答得出品種與產地。
  // ⚠️ 開場白已移到 `cardTime.js`（語態要跟著今天走），所以要去那裡檢查。
  ok(/打字問我/.test(SRC.cardTime) && /「品種」/.test(SRC.cardTime),
    '★★★ 開場白要舉例說明可以打字問什麼（提問選項已砍掉，這是唯一的線索）')
}

if (fail.length) {
  console.error(`\n✗ AR 層有 ${fail.length} 項未通過：`)
  for (const f of fail) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log(`✓ AR 層 ${pass} 項檢查全部通過（卡面座標系、熱區遲滯、鏡頭挑選、靜默失敗防線、官方卡包）`)
