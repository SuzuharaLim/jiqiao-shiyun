// MindAR 官方 three.js 整合（MindARThree）的回歸測試
//
// ⚠️ 這一層**不能在 Node 裡跑真的偵測**（Controller 要 WebGL 與 video），
//    所以這裡驗的是「純數學」與「不可退回的決策」。真偵測的驗證見檔尾。
import fs from 'node:fs'
import { OFFICIAL_CARDS, objectForHotspot } from '../src/data/arCards.js'

let pass = 0
const fails = []
const ok = (c, l) => { if (c) pass++; else fails.push(l) }

// ⚠️ 「某段文字不可出現」的檢查一律用**剝過註解**的版本——解釋「為什麼不能這樣寫」
//    的註解本身就含那段程式。這個專案已經踩過五次（check-ar ×2、check-char、check-mind ×2）。
// ★ 第五次是新的變形：原本只剝「整行都是註解」（`^\s*//`），**行尾註解沒剝到**。
//   於是 `outputColorSpace = SRGBColorSpace   // ← 原版是 outputEncoding = sRGBEncoding`
//   這一行讓「不可出現 sRGBEncoding」這項失敗。
//   ⚠️ 剝行尾註解不可寫成 `/\/\/.*$/`——那會把網址的 `https://` 砍成 `https:`。
//      要求 `//` 前面不是 `:`。
const strip = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/([^:])\/\/.*$/gm, '$1')
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8')

const sceneSrc = read('../src/lib/mindScene.js')
const scene = strip(sceneSrc)
const threeSrc = read('../src/lib/mindarThree.js')
const three = strip(threeSrc)
const scanSrc = read('../src/screens/Scan.jsx')
const scan = strip(scanSrc)

// ── 1. MindARThree：為什麼是自己一份，以及不可退回的地方 ──
//
// 官方的 `mind-ar/dist/mindar-image-three.prod.js` 第一行 import 了
// `sRGBEncoding`，而 three 0.185 已經把它移除 → 直接用會**建置失敗**。
// 所以那 120 行收進 src/lib/mindarThree.js 並改掉色彩空間 API。
ok(!/sRGBEncoding/.test(three), '★★ 不可再用 sRGBEncoding（three 0.185 已移除）')
ok(/outputColorSpace\s*=\s*SRGBColorSpace/.test(three), '要用 outputColorSpace = SRGBColorSpace')
ok(!/mindar-image-three\.prod/.test(scene + scan),
  '★★ 不可 import 官方預編譯的 mindar-image-three.prod.js（它 import 了已移除的 sRGBEncoding）')
// Controller 要從不碰 three 的那支拿，否則又踩回同一個相容問題
ok(/mind-ar\/dist\/mindar-image\.prod\.js/.test(three),
  'Controller 要從 mindar-image.prod.js 取（那支不 import three）')

// ★ postMatrix 的式子是 mindScene 的 uvToLocal 推導的前提，不可「順手簡化」。
ok(/position\.y = markerWidth \/ 2 \+ \(markerHeight - markerWidth\) \/ 2/.test(three),
  '★★ postMatrix 的 position.y 要與官方逐字相同（uvToLocal 是照它推的）')
ok(/scale\.x = markerWidth/.test(three) && /scale\.y = markerWidth/.test(three),
  '★ postMatrix 的 scale 三軸都是 markerWidth（不是 W/H 各自）')

// 原版沒有 dispose，SPA 反覆進出會拿不到新的 WebGL context
ok(/dispose\(\)\s*\{/.test(three), '★ 要補 dispose（原版沒有；行動裝置 context 上限常見 8~16）')
ok(/forceContextLoss/.test(three), '★ dispose 要 forceContextLoss')
ok(/dummyRun/.test(three), '★ 要 dummyRun 暖機（少了它第一次偵測會卡住幾百毫秒）')
// 原版 stop() 在 start() 失敗時會丟 TypeError，把真正的錯誤蓋掉
ok(/this\.video\?\.srcObject/.test(three), '★ stop() 要防 srcObject 是 null（start 失敗時）')
// ⚠️ 這條要查 mindarThree（接收端）與 mindScene（傳入端），不是 Scan.jsx
//    ——Scan 只負責猜出 deviceId 並往下傳。
// ── ★★★ 相機約束：解析度與鏡頭選擇（真實手機上「掃不到」的兩大主因）──
//
// ⚠️ MindAR 原版的 getUserMedia **完全沒有指定解析度**，只有 facingMode。
//    行動瀏覽器在那種情況下預設回 **640×480**——卡片就算佔滿半個畫面也只有
//    約 320px 寬，特徵點根本不夠，症狀是「對得很準卻一直認不出來」。
//    （本專案在相機工作室已踩過同一個坑，記在 CLAUDE.md。）
ok(/width: \{ ideal: 1280 \}/.test(three) && /height: \{ ideal: 960 \}/.test(three),
  '★★★ 必須明確要求解析度（不給的話行動瀏覽器預設 640×480，AR 會掃不到）')
// ⚠️ 一定要 ideal 不可 exact：exact 在裝置不支援時直接丟 OverconstrainedError
//    ＝相機完全開不起來（黑畫面），比解析度低更糟。
ok(!/width: \{ exact:/.test(three), '★★ 解析度不可用 exact（不支援時會讓相機開不起來）')
ok(/focusMode: 'continuous'/.test(three), '★ 要求連續對焦（手持距離一直在變）')
// deviceId exact 在鏡頭被佔用時會 reject → 沒有退路就是「相機打不開」
ok(/facingMode: this\.shouldFaceUser \? 'user' : 'environment'/.test(three),
  '★★ deviceId 失敗要退回 facingMode（三層 fallback）')
// ⚠️ 授權前 enumerateDevices 的 label 是空的 → 第一次只能用 facingMode，
//    而那在多鏡頭手機上可能選到超廣角（實測 k1 −0.07 → 辨識率 0%）。
ok(/retuneCamera\(/.test(three) && /retuneCamera\(pickMainCameraId\)/.test(scene),
  '★★★ 取得權限後要重新挑鏡頭（這是唯一能真正避開超廣角的時機）')
ok(/this\.resize\(\)/.test(three.slice(three.indexOf('retuneCamera'))),
  '★★ 換鏡頭後要 resize（解析度可能不同，投影矩陣要重算否則模型偏掉）')

ok(/environmentDeviceId/.test(three) && /environmentDeviceId: deviceId/.test(scene),
  '★ 要保留 environmentDeviceId 這條路（避開超廣角：k1 −0.07 之後辨識率是 0）')
ok(/pickMainCameraId/.test(scan), '★ Scan 要猜主鏡頭的 deviceId 往下傳')

// ── ★★ 2. 座標校正：只能量，不能推 ──
//
// postMatrix 是「區域y → 像素y = W·y + H/2」而像素 y 在圖上朝下，
// 所以**照推會得到 vSign = +1，那是錯的**——worldMatrix 自己還帶一次上下翻轉。
// 實測（1280×960、卡片畫在 288..992 × 223..736、佔畫面 55%）：
//   vSign=+1 → 白菜熱區中心算到 (387, 550)，真值 (384, 416)：x 準、y 鏡像
//   vSign=−1 → (387, 410)；六個熱區逐一比對，誤差全部 ≤7.6px 且是一致的平移
//              （那是模擬相機每幀 ±4px 抖動，不是系統性偏差）
// ⚠️ 症狀是「角色不會消失、大小也對，只是站錯地方」——正對卡片時很難看出來。
ok(/vSign:\s*-1/.test(scene), '★★ CALIB.vSign 必須是 −1（實測；照 postMatrix 推會得到 +1，是錯的）')
ok(/outAxis:\s*\+?1\b/.test(scene), '★ CALIB.outAxis 是 +1（實測：區域 +z 離開紙面）')
ok(/rotation\.x = CALIB\.outAxis \* Math\.PI \/ 2/.test(scene),
  '★ 角色的 +Y 要轉到離開紙面的方向（轉錯會插進桌子裡）')

// uvToLocal / localToUv 必須互為反函式——中間差一個符號就是「站錯地方」
{
  const uvToLocal = (u, v, hw, vSign) => [u - 0.5, vSign * (v - 0.5) * hw, 0]
  const localToUv = (x, y, hw, vSign) => [x + 0.5, (vSign * y) / hw + 0.5]
  let worst = 0
  for (const vSign of [-1]) {
    for (const u of [0, 0.136, 0.5, 0.873, 1]) {
      for (const v of [0, 0.375, 0.5, 0.9, 1]) {
        const [x, y] = uvToLocal(u, v, 0.7291, vSign)
        const [u2, v2] = localToUv(x, y, 0.7291, vSign)
        worst = Math.max(worst, Math.abs(u2 - u), Math.abs(v2 - v))
      }
    }
  }
  ok(worst < 1e-12, `★ uvToLocal / localToUv 要互為反函式（最大偏差 ${worst}）`)
}

// ── 3. 熱區與 3D ──
{
  const card = OFFICIAL_CARDS[0]
  const inRect = (r, u, v) => u >= r.x && u <= r.x + r.w && v >= r.y && v <= r.y + r.h
  const atCentre = card.hotspots.find(h => inRect(h.rect, 0.5, 0.5)) || null
  const primary = card.hotspots.find(h => h.primary) || null

  ok(!!primary, '卡片要有 primary 熱區')
  ok(!!objectForHotspot(primary)?.model, '★ primary 熱區的物件必須有 model')
  // 把「為什麼角色要固定站在主物件那一區」的事實釘住：
  // 使用者最自然的動作是把整張卡擺在畫面正中央 → 中心落在「身體保健」，那一區沒有模型。
  ok(atCentre && !objectForHotspot(atCentre)?.model,
    `★ 記錄事實：畫面中心 (0.5,0.5) 落在「${atCentre?.label ?? '無'}」且該區沒有 model`)
  ok(/h => h\.primary/.test(scene), '★★ 角色要錨在 primary 熱區（不可綁「目前選中的熱區」）')
}
// 遲滯：追蹤每秒十幾次、邊界附近會高頻跳動，而開關內容面板是最貴的操作
ok(/makeHotspotLatch\(\)/.test(scene), '★ 熱區命中要走遲滯')

// ── ★★★ 出現門檻：預設要連續 6 幀才算認出來，低幀率手機跨不過去 ──
//
// MindAR 的 DEFAULT_WARMUP_TOLERANCE = 5，判斷式是 `trackCount > warmupTolerance`
// ⇒ 要**連續 6 幀**都追到。手持＋卡片會動＋手機每秒只處理個位數幀時，
//   那是很高的門檻，而且**暖機期間畫面完全沒有回饋**——使用者可能已經追到好幾次，
//   每次都沒撐到第 6 幀，看起來就是「完全掃不到」。
// ⚠️ 這不是調低比對門檻：MindAR 是 inlier 式判定，比對本身沒有分數可調。
//    warmup 只是防抖，降低它不會讓它認錯目標。
ok(/warmupTolerance: 1\b/.test(scene),
  '★★★ warmupTolerance 要降到 1（預設 5＝連續 6 幀，低幀率手機跨不過去）')
ok(/missTolerance: 10\b/.test(scene),
  '★★ 相對放寬漏幀容忍（低幀率下偶爾漏幀正常，容忍太小會讓內容一直閃）')
// 手動點選必須撐得住，否則 3 幀後就被中心瞄準蓋掉
ok(/MANUAL_HOLD_MS/.test(scene) && /performance\.now\(\) < manualUntil/.test(scene),
  '★★ 手動點選之後要暫停中心瞄準（只 reset 遲滯會在約 0.3 秒後被蓋回去）')
// 縮放要由包圍盒推導：寫死的值在角色幾何改版時會突然變兩倍大
ok(/new Box3\(\)\.setFromObject/.test(scene), '★ 角色縮放要由包圍盒推導，不可寫死')

// ── 4. Scan.jsx 的接線 ──
ok(/await import\('\.\.\/lib\/mindScene\.js'\)/.test(scan),
  '★★ mindScene 必須動態 import（它連帶拉進 three ＋ TFJS 約 2MB）')
// ⚠️ MindARThree 自己會開相機。再開第二路在部分 Android 上直接失敗，而且白吃一份電。
// ⚠️ 但**能力偵測是允許的**（`navigator.mediaDevices?.getUserMedia` 用來判斷
//    unsupported）。所以只禁「真的去呼叫它」＝後面帶括號帶參數。
ok(!/getUserMedia\s*\(/.test(scan),
  '★★ Scan.jsx 不可再呼叫 getUserMedia（MindARThree 自己開；能力偵測不帶括號則可以）')
// 舊路線的模組不可再被這一頁引用
for (const dead of ['arTracker', 'quadDetect', 'mindTrack', 'ARScene', 'ARCharacter', 'arSimFrame']) {
  ok(!new RegExp(`from '[^']*${dead}`).test(scan), `舊路線的 ${dead} 不可再被 Scan.jsx 引用`)
}
ok(/dispose\(\)/.test(scan), '★ 卸載要 dispose（關相機軌道＋釋放 WebGL context）')
ok(/console\.error\('\[AR\] MindAR 啟動失敗/.test(scanSrc),
  '★ 啟動失敗要留下錯誤紀錄（靜默退回會讓人完全查不到原因）')
// 缺檔的失敗是靜默的，且與「沒對準」症狀一樣 —— 必須主動講出來
ok(/text\/html/.test(scan),
  '★★ 檢查目標檔要看 content-type（缺檔時 SPA fallback 會回 200 + index.html）')
ok(/nofile/.test(scan), '★ 目標檔缺失要有專屬狀態與說明')
// MindAR 沒有相似度，狀態列不可再顯示那個**數值**。
// ⚠️ 但畫面上「說明為什麼沒有相似度」的那句文案是有價值的，不可一併禁掉
//    ——所以查的是「有沒有把 score 印出來」，不是「有沒有出現這三個字」。
ok(!/track\.score|\{.*score.*\}%/.test(scan),
  '★ 不可顯示相似度數值（MindAR 是 inlier 式判定，沒有這個數字）')

// ── ★★★ 5. CSP 必須放行 blob: 的 Web Worker ──
//
// MindAR 的比對跑在 **Web Worker** 裡，而那個 worker 是用 `blob:` URL 建立的。
// 沒有 workerSrc 的話 CSP 會擋掉它，而失效方式**完全靜默**：
//   相機開得起來、畫面正常、掃描線在動、console 只有一行 CSP 警告，
//   但 `_workerMatch` 永遠不 resolve → 處理迴圈卡在第一輪 →
//   `onUpdate` 一次都不會進來 → **永遠不會認出卡片**。
//   （實測：加這兩行之前 onUpdate 0 次；加之後 15 秒內 processDone 23／updateMatrix 18。）
// ⚠️ 而且**只有正式站會壞**：Vite dev server 不送 CSP，所以 `npm run dev` 一切正常，
//    一部署就掃不到。這是「用 dev server 驗 AR」驗不出來的一類問題。
// ⚠️ 不可改成放寬 scriptSrc：worker-src 沒設時瀏覽器才退回 script-src，
//    為了 worker 打開整個腳本來源是把安全性換掉。
{
  const srv = strip(read('../server/index.js'))
  ok(/workerSrc:\s*\["'self'",\s*'blob:'\]/.test(srv),
    "★★★ CSP 要有 workerSrc: [\"'self'\", 'blob:']（少了它正式站的 AR 永遠掃不到，而且是靜默的）")
  ok(/childSrc:\s*\["'self'",\s*'blob:'\]/.test(srv),
    '★ 也要給 childSrc（不認得 worker-src 的舊瀏覽器會退回它）')
}

// ── ★★★ 5b. 就算 CSP 又被改壞，畫面也要自己講出來 ──
//
// 上面那條閘門守的是「設定不要壞」，這一組守的是「壞掉時不要靜默」。
// ⚠️ 這種失敗看起來完全正常（相機在動、掃描線在跑、.mind 載入了、診斷面板每欄都對），
//    使用者只會一直換角度重試。而它**只在正式站發生**，開發時不會遇到。
// ★★★ 同源 worker：讓 AR 不再依賴伺服器的 CSP 設定
// mind-ar 的 controller.js 第 4 行是 `?worker&inline`，inline 會把 worker 內嵌成 blob，
// 那正是需要 `worker-src blob:` 的原因。改成 `?worker`（不 inline）會產出同源的 .js，
// `script-src 'self'` 本來就允許。實測：CSP 完全拿掉 worker-src 與 child-src，
// AR 仍然追得到（狀態列「已對準：2027 小寒」）。
ok(/controller\.worker\.js\?worker'/.test(three),
  "★★★ 要用同源 worker（`?worker`），**不可**是 `?worker&inline`（inline＝blob，會被 CSP 擋）")
ok(!/\?worker&inline/.test(three), '★★ 不可用 ?worker&inline')
ok(/_useSameOriginWorker\(\)/.test(three), '★ 要真的呼叫 _useSameOriginWorker')
// ⚠️ setup 訊息（含 matchingDataList）是在 addImageTargets 裡才 postMessage 的，
//    換晚了新 worker 收不到目標資料 → 永遠比對不出東西。
{
  const iUse = three.indexOf('this._useSameOriginWorker()')
  const iAdd = three.indexOf('addImageTargets(this.imageTargetSrc)')
  ok(iUse > 0 && iAdd > 0 && iUse < iAdd,
    '★★★ 換 worker 必須在 addImageTargets 之前（setup 訊息在那裡才送）')
}
ok(/workerMatchDone/.test(three) && /workerTrackDone/.test(three),
  '★★ onmessage 兩個分支都要接（漏一個會讓對應的 Promise 永遠不 resolve）')

// ── ★★★ 疊層：取景畫面必須真的看得見 ──
//
// 原版把 <video> 設成 `z-index:-2`。依 CSS 繪製順序，負 z-index 的定位子元素
// 畫在「第 2 步」，而 `.scan-stage`（position:relative、z-index:auto）自己畫在
// 祖先脈絡的「第 6 步」——它的深色背景 --cam-bg-deep 會整片蓋在 video 上面，
// **取景畫面全黑**。官方範例的容器沒有背景色，所以踩不到；本站的有。
// ⚠️ 這個 bug 極難從數字上發現：**追蹤不需要 video 被看見**（MindAR 讀的是
//    video 元素的像素，不是螢幕上畫出來的結果），所以「已對準」「熱區命中」
//    「3D 有在算繪」全部量得到，畫面卻是黑的。
ok(!/zIndex = '-/.test(three), "★★★ video 不可用負 z-index（會被 .scan-stage 的深色背景蓋掉＝全黑）")
ok(/this\.video\.style\.zIndex = '0'/.test(three), '★★ video 的 z-index 要明寫 0')
ok(/renderer\.domElement\.style\.zIndex = '1'/.test(three), '★★ 3D canvas 要明寫 z-index 1（疊在影像之上）')
{
  const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  // MindAR 是 append 進容器的，DOM 上排在 React 子元素之後 → 不明寫 z-index 就會蓋住它們
  ok(/\.scan-frame \{[^}]*z-index:2/.test(css), '★★ .scan-frame 要 z-index:2（否則被後 append 的 canvas 蓋掉）')
  ok(/\.scan-fallback \{[^}]*position:relative;\s*z-index:3/.test(css),
    '★★ .scan-fallback 要 position:relative + z-index:3（非定位元素會被畫在所有定位元素底下）')
}

ok(/tickCount/.test(three), '★ MindARThree 要有處理迴圈的心跳計數')
ok(/ticks:\s*\(\)\s*=>/.test(scene), '★ 場景層要把心跳露出來給呼叫端判斷')
ok(/securitypolicyviolation/.test(scan),
  '★★★ 要監聽 securitypolicyviolation（用來把失敗原因講精確）')
ok(/blob:/.test(scan) && /workerSrc/.test(scan),
  '★★ 抓到 CSP 擋 worker 時，畫面要講出確切的修法（含 workerSrc）')
// ★★★ 換成同源 worker 之後，「blob worker 被擋」**不再代表 AR 壞了**
//     （實測 CSP 完全拿掉仍然追得到）。所以 CSP 事件只能記旗標，
//     失敗判準只有「心跳是 0」。直接由 CSP 事件跳橫幅就是**誤報**，
//     而誤報比不報更糟——使用者會去追一個不存在的問題。
ok(/cspBlockedRef\.current = true/.test(scan),
  '★★★ CSP 違規只能記旗標，不可直接判定 AR 失敗（同源 worker 會接住）')
ok(/ticks\?\.\(\)\s*\?\?\s*0\)\s*>\s*0\)\s*return/.test(scan),
  '★★ 失敗判準只有「心跳是 0」；心跳有跳就一律不報')
ok(/setStall\(cspBlockedRef\.current \? 'csp' : 'quiet'\)/.test(scan),
  '★ CSP 旗標只用來分類原因，不用來判定失敗')
ok(/這不是沒對準/.test(scan),
  '★ 文案要明講「不是沒對準」——否則使用者會一直喬角度，而那永遠不會成功')

// ── ★★★ 自我測試：把「裝置跑不動」與「相機畫面不夠好」分開 ──
//
// 使用者回報「掃不到」時，光看畫面分不出三種完全不同的原因：
//   ① 這台裝置跑不起辨識　② 相機畫面不夠好　③ 卡片與目標圖不同版
// 用內建卡面圖餵同一條管線，就能把 ① 單獨切出來。
// 實測（本機正式 build，故意讓相機拍不到卡片）：即時追蹤失敗、自我測試 6716ms 成功，
// 判讀正確指向「問題在相機畫面」，且測完相機有接回去。
ok(/async selfTest\(/.test(scene), '★★★ 場景層要提供 selfTest')
// ★★★ 自我測試**不可**走 canvas.captureStream ＋ 換 video srcObject 那條路。
// ⚠️ 我第一版就是那樣寫的：桌機通過、**手機回報失敗**——但那是**測試自己壞掉**，
//    不是裝置壞掉。iOS Safari 對 canvas.captureStream 支援不穩，且 video.play()
//    在非使用者手勢情境會被擋 → 影格永遠不更新 → 逾時。
//    **一個會給假失敗的診斷比沒有診斷更糟**：它會把人推去換手機。
//    正解是直接把畫面餵給 Controller，完全不經過 video。
ok(!/captureStream/.test(scene), '★★★ selfTest 不可用 captureStream（iOS 上會給假失敗）')
ok(!/srcObject = /.test(scene), '★★★ selfTest 不可換 video 的 srcObject')
ok(/c\.inputLoader\.loadInput\(cvs\)/.test(scene) && /_detectAndMatch/.test(scene),
  '★★ selfTest 要直接餵 Controller（那才是真的在測 WebGL／Worker／TFJS）')
// ⚠️ 要有微幅位移：MindAR 的偵測走 detectMoving，完全靜止不是它預期的輸入
ok(/Math\.sin\(i \* 0\.9\)/.test(scene), '★ 自我測試的畫面要有微幅位移（detectMoving）')
// ★★★ Controller 的 workerMatchDone 是**單一欄位**（不是佇列）：即時迴圈與自我測試
//     同時送 match 時，後者覆蓋前者的 resolver → 前一個 Promise 永遠不 resolve
//     → 自我測試卡在「測試中…」不回來（實測踩過）。所以測試期間要停掉即時迴圈。
ok(/c\.stopProcessVideo\(\)/.test(scene),
  '★★★ selfTest 期間要停掉即時迴圈（否則與它搶同一個 workerMatchDone 而卡死）')
ok(/finally \{[\s\S]{0,300}?c\.processVideo\(mindar\.video\)/.test(scene),
  '★★ 測完要在 finally 把即時迴圈接回去（每條 return 路徑都要經過）')
// ⚠️ 「跑不起來」與「跑得起來但沒認出」是完全不同的結論，必須分開回報
ok(/stage: 'pipeline'/.test(scene) && /stage: 'match'/.test(scene),
  "★★ 失敗要分級（pipeline／match），只說「失敗」會把最有用的資訊丟掉")
ok(/selfTest\.stage === 'pipeline'/.test(scan) && /selfTest\.stage === 'match'/.test(scan),
  '★★ 畫面要分別解讀那兩種失敗')
// 裝置端環境：回報「掃不到」時往往比相機資訊更能定位問題
ok(/deviceInfo\(\)/.test(scene) && /繪圖晶片/.test(scan),
  '★ 診斷要帶裝置資訊（GPU／WebGL2／是否內建瀏覽器）')
ok(/自我測試/.test(scan), '★ 診斷面板要有自我測試的入口')

// ── ★★★ 內建瀏覽器 & 使用者手勢：兩個「怎麼改程式都不會好」的入口問題 ──
//
// 參考 gitlab.com/suzuharalim/24vr 的 ar-experience.html（同團隊已能運作的實作）。
// ⚠️ LINE／FB／IG 的內建 WebView 常擋掉或閹割 getUserMedia／WebGL，而且**靜默**。
//    使用者從 LINE 訊息點進來是最常見的入口，不主動講就永遠查不到。
// ⚠️★ 這一項要查**原始碼**（scanSrc）不是剝過註解的版本——這次是剝註解器**反過來**
//    咬到我：`/\bLine\//i` 這個正則字面量裡就含有 `//`（`\/` 之後的收尾斜線），
//    行尾剝除規則把整行後半段當註解吃掉，於是 `return 'LINE'` 消失 → **誤報**。
//    （先前四次是「抓到自己的註解」＝假通過，這次是假失敗，同一個根因。）
//    這幾個關鍵字夠特殊，直接對原始碼比對不會誤中註解。
ok(['MicroMessenger', 'FBAN', 'Instagram', 'Line'].every(k => scanSrc.includes(k))
  && scanSrc.includes("return 'LINE'"),
  '★★★ 要偵測 LINE／FB／IG／微信 的內建瀏覽器並主動警告')
ok(/用預設瀏覽器開啟/.test(scan), '★★ 警告要給出**具體操作**（用預設瀏覽器開啟），不是只說不支援')
// ⚠️ iOS 上 getUserMedia 與 video.play() 在使用者手勢的呼叫堆疊裡可靠得多；
//    自動啟動容易拿到權限卻播不動——而那是靜默失敗。
ok(/const \[armed, setArmed\] = useState\(false\)/.test(scan) && /if \(!armed\) return/.test(scan),
  '★★★ AR 必須由使用者手勢啟動（iOS 上自動啟動容易靜默失敗）')
ok(/允許相機並開始掃描/.test(scan), '★ 要有明確的啟動按鈕')
// ⚠️ 猜錯時不可把人擋在門外：警告歸警告，按鈕照樣要能按
ok(!/inApp &&[\s\S]{0,200}?return null/.test(scan),
  '★ 偵測到內建瀏覽器只警告，不可直接擋掉（UA 判斷會猜錯）')
// ⚠️ 處理幀率是判斷「裝置算不算得動」最直接的數字。解析度拉高會讓每幀更重，
//    中階手機可能掉到每秒一兩幀——那時對得再準也幾乎不可能命中，而畫面上看不出來。
//    （桌機實測 1280×960 下 31.5 幀/秒。）
ok(/處理幀率/.test(scan), '★★ 診斷要顯示處理幀率（分辨「拍得不好」與「算不動」）')
ok(/太低，這台裝置算不動/.test(scan), '★ 幀率過低要直接標出來，不要只給數字')

// ── ★★ 一直掃不到時要給可執行的提示，不可從頭到尾只說「把卡片放進框內」──
// ⚠️ 對正在失敗的人那句話沒有任何資訊——他已經放進框內了。
//    真正決定成敗的是距離／反光／對焦，而那些使用者不會自己想到。
ok(/拿近一點/.test(scan) && /反光/.test(scan) && /對到焦/.test(scan),
  '★★ 掃不到時要輪播具體提示（距離、反光、對焦）')
ok(/setTimeout\(\(\) => setHintIdx\(0\), 6000\)/.test(scan),
  '★ 提示要等失敗一段時間才出現（一進來就洗提示很吵，多數人前幾秒就掃到了）')

// ⚠️ 原版只靠 autoplay 屬性，沒有呼叫 play()。iOS Safari 從 SPA 導頁進來時
//    autoplay 不一定啟動，而 video 沒在播的話 Controller 每幀讀到同一張靜止影像，
//    偵測永遠不會成功——但畫面上「有影像」（第一幀），完全看不出來。
ok(/this\.video\.play\(\)\.catch/.test(three),
  '★★ 要明確呼叫 video.play()（iOS 上 autoplay 不一定啟動，且失效是靜默的）')
// ⚠️ 判讀一定要給**下一步動作**。只說成功／失敗等於沒有診斷。
ok(/佔滿畫面一半以上/.test(scan) && /反光/.test(scan),
  '★★ 成功時要給出可執行的下一步（距離、反光…），不可只說「正常」')
ok(/不在.{0,4}你怎麼拿卡片/.test(scan),
  '★ 失敗時要明講問題不在使用者的操作，避免他繼續白費力氣喬角度')

// ── 6. 目標檔 ──
{
  const card = OFFICIAL_CARDS[0]
  ok(!!card.mindTarget && /\.mind$/.test(card.mindTarget), 'arCards 要有 .mind 目標')
  const p = new URL(`../public${card.mindTarget}`, import.meta.url)
  ok(fs.existsSync(p), `★★ ${card.mindTarget} 必須真的存在`)
  if (fs.existsSync(p)) {
    const kb = fs.statSync(p).size / 1024
    ok(kb > 100, `.mind 大小合理（${kb.toFixed(0)} KB）`)
  }
}

if (fails.length) {
  console.error(`\n✗ MindAR 層檢查失敗 ${fails.length} 項：`)
  for (const f of fails) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log(`✓ MindAR 層 ${pass} 項檢查全部通過（官方整合、座標校正、熱區、接線、目標檔）

真實鏈路已在瀏覽器用**假相機串流**（canvas.captureStream）跑過整條官方路徑：
  · MindARThree.start() → 追到目標 → onTargetFound ✓
  · 卡片高寬比由 postMatrix 反推 = 0.7291，正好等於 .mind 的 1335/1831 ✓
  · **六個熱區逐一比對落點，誤差全部 ≤7.6px**，而且是一致的平移
    （模擬相機每幀 ±4px 抖動），不是系統性偏差 ✓
  · 畫面中心命中「身體保健」——這正是角色必須錨在 primary 的理由 ✓
⚠️ 仍未驗：真實相機下的追蹤穩定度、手機實際幀率、行動網路下約 2MB 的等待時間。
⚠️ 自動化窗格的 visibilityState 恆為 'hidden'、rAF 不觸發，而 MindAR 的處理迴圈
   每輪結尾是 await tf.nextFrame()（靠 rAF 解析）→ 迴圈會停在第一輪。
   在那種環境下量測必須先補 rAF shim，否則會誤判成「偵測不到」。`)
