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
ok(/tickCount/.test(three), '★ MindARThree 要有處理迴圈的心跳計數')
ok(/ticks:\s*\(\)\s*=>/.test(scene), '★ 場景層要把心跳露出來給呼叫端判斷')
ok(/securitypolicyviolation/.test(scan),
  '★★★ 要監聽 securitypolicyviolation（這是確定性訊號，不是推論）')
ok(/blob:/.test(scan) && /workerSrc/.test(scan),
  '★★ 抓到 CSP 擋 worker 時，畫面要講出確切的修法（含 workerSrc）')
ok(/ticks\?\.\(\)\s*\?\?\s*0\)\s*===\s*0/.test(scan),
  '★★ 要有心跳看門狗：心跳恆 0 代表「比對沒在跑」，與「沒對準」是兩回事')
ok(/這不是沒對準/.test(scan),
  '★ 文案要明講「不是沒對準」——否則使用者會一直喬角度，而那永遠不會成功')

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
