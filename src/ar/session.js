// ============================================================================
// AR 工作階段 —— 相機 × 追蹤 × 算繪的接線層，也是**唯一**知道全貌的地方
//
// ★ 為什麼要有明確的狀態機：
//   舊版 Scan.jsx 用一堆各自獨立的旗標拼湊狀態——`status`、`armed`、`tracking`、
//   `stall`、`slowCamera`、`hintIdx`、`cspBlockedRef`。它們可以組合出**畫面看
//   起來正常、實際上什麼都沒發生**的狀態，而那正是這個功能一路上最貴的 bug 類型
//   （黑畫面、worker 被擋、目標檔沒裝、video 屬性沒設）。
//
//   這一版把「現在是什麼情況」收斂成**一個列舉值**，而且每一個值都對應一件
//   **可觀測的事實**，不是推論：
//
//     idle        還沒開始（等使用者手勢）
//     insecure    不是安全內容 —— location.protocol 就能判定
//     no-webgl    建不出 WebGL context —— 直接試過
//     no-camera   沒有 getUserMedia / 沒有鏡頭
//     no-target   .mind 抓不到（或抓到的是 SPA 的 HTML）—— content-type 判定
//     opening     正在要權限
//     denied      getUserMedia 丟 NotAllowedError
//     loading     正在下載追蹤引擎與目標檔
//     searching   在跑、還沒認出（心跳 > 0）
//     locked      追到了
//     stalled     心跳連續 12 秒沒有前進 —— 比對迴圈卡住了，**這不是沒對準**
//     failed      其他（帶 error 訊息）
//
//   UI 是這個值的純函式。不可能再出現「畫面說掃描中、其實引擎沒起來」。
//
// ★ 啟動一律由**使用者手勢**觸發（`start()` 要在 onClick 的呼叫堆疊裡）：
//   iOS 上 getUserMedia 與隨後的 video.play() 在手勢堆疊裡可靠得多；自動啟動
//   很容易拿到權限卻播不動，而那是靜默失敗。順帶也解掉「一進頁就跳權限對話框」
//   造成的高拒絕率。
// ============================================================================

import { openCamera, retune, stopStream, attach, listBackCameras } from './camera.js'
import { hitTest, makeHotspotLatch } from './cardSpace.js'
import { isCompat } from './tfjsCompat.js'
import { startQrScan, qrSupported } from './qrFallback.js'

// ★★★ 這一支**只能靜態 import 輕量模組**（camera / cardSpace 都是零相依）。
//
// ⚠️ `Scan.jsx` 靜態 import 本檔，而 Scan 在畫面對照表裡 ⇒ 本檔一定在主 bundle。
//    所以只要這裡靜態 import 了 stage.js（它 import three）或 tracker.js
//    （它 import TFJS），three 與追蹤引擎就會被拉進主 bundle——實測那會讓
//    主 bundle 從 458 kB 變成 **976 kB**，等於首頁替一個多數人不會點的功能
//    多背半 MB。tracker/stage 一律走 `await import()`，而且 check-ar 有鎖。
//
// `hasWebGL` 刻意放這裡而不是 stage.js：它是「開相機之前就要問」的能力偵測，
// 需要在**還沒載入 three** 的時候就能呼叫。
/** 這台裝置到底有沒有 WebGL。**開相機之前**就該問，不要等到失敗才猜。 */
function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

/** 心跳看門狗：心跳連續這麼久沒有前進，就不是「沒對準」的問題了。 */
const STALL_MS = 12000
/**
 * ★★ CPU 後備上要放寬很多。一輪偵測在 CPU 上要 3~8 秒（慢的手機更久），
 * 12 秒的門檻會把「正常但很慢」誤判成「比對迴圈卡死」——而那個畫面寫的是
 * 「相機開起來了，但比對程序一輪都沒跑完」，等於斬釘截鐵地告訴使用者
 * 一件不是事實的事，還把他導去複製診斷資料。
 */
const STALL_MS_CPU = 45000
/** 手動點選之後暫停中心瞄準多久。 */
const MANUAL_HOLD_MS = 4000
/** 即時特徵點探測的間隔（只在還沒追到時跑）。 */
const PROBE_MS = 900

/**
 * 目標檔是否真的存在。
 * ⚠️ 只看 `res.ok` 不夠：檔案不存在時 SPA fallback 會回 **200 + index.html**，
 *    而 MindAR 拿到那份 HTML 只會丟一個看起來像「檔案壞掉」的錯——
 *    「檔案不存在」偽裝成「檔案損毀」，會讓人去查格式而不是查路徑。
 * ⚠️ 也不可用 `cache:'force-cache'`：那會把那份 HTML 存起來，之後補上檔案也
 *    永遠拿到 HTML。
 */
export async function targetExists(url) {
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) return false
    return !(res.headers.get('content-type') || '').includes('text/html')
  } catch { return false }
}

/**
 * 內建瀏覽器偵測（LINE／FB／IG／微信）。
 * ⚠️ 這是「怎麼改程式都不會好」的一類失敗：那些 WebView 常常擋掉或閹割
 *    getUserMedia／WebGL／Worker，而且**失敗方式往往是靜默的**。從 LINE 訊息
 *    點進來是最常見的入口，所以一定要主動講。
 * ⚠️ 只能靠 userAgent 猜（沒有標準 API），所以文案要寫「可能」而不是斷定，
 *    而且**不擋人繼續嘗試**——猜錯時把人擋在門外比誤報更糟。
 */
export function inAppBrowser(ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '')) {
  if (/\bLine\//i.test(ua)) return 'LINE'
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook'
  if (/Instagram/i.test(ua)) return 'Instagram'
  if (/MicroMessenger/i.test(ua)) return '微信'
  return null
}

/** 安全內容檢查。`getUserMedia` 在 http:（非 localhost）下根本不存在。 */
export function isSecure() {
  if (typeof window === 'undefined') return false
  if (window.isSecureContext) return true
  return ['localhost', '127.0.0.1', '::1'].includes(location.hostname)
}

/**
 * 開一段 AR 工作階段。
 *
 * @param video      React 渲染的 <video>
 * @param canvas     React 渲染的 <canvas>
 * @param container  兩者的容器（量大小用）
 * @param card       卡片定義
 * @param onState    (state) => void，state 見檔頭
 */
export function createSession({ video, canvas, container, card, onState }) {
  let phase = 'idle'
  let error = null
  let stream = null
  let tracker = null
  let stage = null
  let raf = 0
  let stallTimer = 0
  let probeTimer = 0
  let rateTimer = 0
  let stopQr = null
  let viaQr = false
  let tps = null            // 心跳速率（輪/秒）；null＝還沒量到
  let prevTicks = null
  let disposed = false

  let qrReady = false
  let backend = 'webgl'       // 'webgl'｜'cpu'，見 cpuPipeline.js
  let switching = false
  let inputRange = null       // 偵測器實際讀到的灰階範圍（診斷用）
  let hotspot = null
  let features = null            // 即時特徵點數（null＝還沒量到）
  let cameras = []
  let manualUntil = 0
  const latch = makeHotspotLatch()

  const emit = () => {
    if (disposed) return
    onState?.({
      phase,
      error,
      hotspot,
      features,
      cameras,
      ticks: tracker?.ticks() ?? 0,
      tps,
      viaQr,
      qrReady,
      backend,
      switching,
      matches: tracker?.matches?.() ?? 0,
      sameOriginWorker: tracker?.sameOriginWorker ?? null,
    })
  }
  /**
   * ★★★ 終局狀態：一旦進入就**不可以再被覆蓋**。
   *
   * ⚠️ 這條規則是被真的 bug 逼出來的，不是預防性設計。實測經過：
   *    `createStage()` 因為一行寫錯而拋例外 ⇒ catch 正確地把狀態設成 `failed`，
   *    **但追蹤器是獨立在跑的**，它幾秒後的 `onFound` 又把狀態推成 `locked`
   *    ⇒ 畫面顯示「已對準：2027 小寒」，而根本沒有任何東西被算繪出來。
   *    也就是「最後一個寫入者贏」讓一個已知的致命錯誤被非同步回呼蓋掉。
   * ⚠️ 這正是這一層存在的理由——狀態必須是**單調**的：失敗之後只能靠
   *    重新建立 session（使用者按「再試一次」）才能離開。
   */
  const TERMINAL = new Set(['insecure', 'no-webgl', 'no-camera', 'no-target', 'denied', 'failed'])
  let fatal = false
  const to = (p, err = null) => {
    if (fatal) return
    if (TERMINAL.has(p)) fatal = true
    phase = p; error = err; emit()
  }

  /** 依容器與影像實際大小同步畫布與投影。轉向、換鏡頭、版面改變都要走這裡。 */
  const syncSize = () => {
    if (!stage || !container) return
    stage.resize(container.clientWidth, container.clientHeight, video.videoWidth, video.videoHeight)
  }

  // ★★ 用 ResizeObserver 盯**容器自己**，不要只聽 window 的 resize。
  //
  // ⚠️ 容器變大變小不一定伴隨 window resize：手機捲動時網址列收合（dvh 改變）、
  //    上方內容載入完成把版面推開、鍵盤彈出、SPA 切換版面……都會改變它。
  //    只聽 window 事件的話畫布尺寸與投影會停在舊值，症狀是「3D 與影像對不上」
  //    或「畫布只佔左上一小塊」，而且只在某些機型／某些捲動位置出現。
  // ⚠️ 容器一開始是 0×0 也很常見（尚未版面計算完），這時 stage.resize 會直接
  //    略過；ResizeObserver 會在它真的拿到尺寸時再叫我們一次。少了這一層，
  //    那種情況會**永久**停在 300×150 的預設畫布。
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => syncSize()) : null

  const loop = () => {
    if (disposed) return
    raf = requestAnimationFrame(loop)
    if (!stage) return
    // 中心瞄準：從畫面正中央往場景射一條線
    // ⚠️ 手動點選之後要**暫停**一段時間，只 reset 遲滯是不夠的——下一輪又會把
    //    「畫面中心那一區」推進去，約 0.3 秒後就蓋掉使用者剛點的，
    //    症狀是「點了會跳回去」。
    if (tracker?.tracking() && performance.now() >= manualUntil) {
      const uv = stage.uvAt(0, 0)
      const id = uv ? (hitTest(card.hotspots, uv[0], uv[1])?.id ?? null) : null
      const out = latch.push(id)
      if (out.changed) {
        hotspot = out.id ? card.hotspots.find(h => h.id === out.id) ?? null : null
        emit()
      }
    }
    stage.render()
  }

  /**
   * 建一個追蹤器。抽出來是為了讓 `switchBackend()` 能用**完全一樣**的接線
   * 重建——這幾個回呼漏接任何一個，症狀都是「掃到了但畫面沒反應」。
   */
  const makeTracker = (backendName) => createTrackerLazy({
    video,
    mindUrl: card.mindTarget,
    backend: backendName,
    onFound: () => { if (!disposed) to('locked') },
    onLost: () => {
      if (disposed) return
      latch.reset(); hotspot = null; manualUntil = 0
      to('searching')
    },
    onPose: (m) => stage?.setPose(m),
  })

  return {
    /** ⚠️ 一定要在使用者手勢的呼叫堆疊裡呼叫（見檔頭）。 */
    async start({ deviceId = null } = {}) {
      if (disposed) return
      try {
        // ── 先做「不必開相機就能判定」的檢查，把最常見的死路提早講清楚 ──
        if (!isSecure()) return to('insecure')
        if (!hasWebGL()) return to('no-webgl')
        if (!navigator.mediaDevices?.getUserMedia) return to('no-camera')
        // ⚠️ 目標檔要在開相機**之前**確認。少了這一步，缺檔的症狀是
        //    「相機開了、掃了沒反應」——與「沒對準／光線不夠」一模一樣。
        if (!(await targetExists(card.mindTarget))) return to('no-target')
        if (disposed) return

        to('opening')
        stream = await openCamera({ deviceId })
        if (disposed) { stopStream(stream); return }

        // ★ 拿到權限**之後**才挑得出主鏡頭：授權前 enumerateDevices 的 label
        //   是空字串。而 facingMode 在多鏡頭手機上有機會選到超廣角，
        //   實測那會讓辨識率掉到 0%（症狀是「對得很準卻認不出來」）。
        if (!deviceId) {
          const better = await retune(stream)
          if (better) { stopStream(stream); stream = better }
        }
        if (disposed) { stopStream(stream); return }

        try {
          cameras = listBackCameras(await navigator.mediaDevices.enumerateDevices())
        } catch { /* 列不出來不影響掃描 */ }

        await attach(video, stream)
        if (disposed) { stopStream(stream); return }

        // ★ QR 備援與 MindAR **並行**跑，而且不必等追蹤引擎載完（它有 1.7 MB）。
        //   對「MindAR 在這台裝置上算不對」的使用者，這是唯一還能命中的路。
        //   ⚠️ 失敗一律靜默略過：這是備援，不可反過來影響主路徑。
        try {
          qrReady = await qrSupported()
          stopQr = await startQrScan({
            video, cards: [card],
            onCard: () => {
              if (disposed || phase === 'locked') return
              viaQr = true
              to('locked')
            },
          })
        } catch { /* 沒有原生 QR 偵測就算了 */ }

        to('loading')
        tracker = await makeTracker(backend)
        if (disposed || !tracker) { tracker?.dispose(); stopStream(stream); return }

        const { createStage } = await import('./stage.js')
        stage = createStage({
          canvas,
          targetSize: tracker.targetSize,
          projection: tracker.projectionMatrix,
        })
        syncSize()
        try { ro?.observe(container) } catch { /* 舊瀏覽器沒有就靠 window 事件 */ }
        await stage.mountCharacter(card.hotspots?.find(h => h.primary) ?? card.hotspots?.[0] ?? null)
        if (disposed) return

        // ★★★ 這裡**不可以無條件**設回 searching。
        //
        // ⚠️ QR 備援是與啟動流程並行跑的，而且它通常比追蹤引擎（1.7 MB）先有結果。
        //    它一命中就 `to('locked')`，但啟動流程跑完後這一句會把狀態蓋回
        //    `searching` ⇒ Scan.jsx 的跳轉 effect 因為 phase 變了而 cleanup 掉計時器，
        //    而一次性旗標已經是 true ⇒ **跳轉永遠不會發生**。
        //    症狀：QR 明明認出來了，畫面卻退回「掃描中」然後什麼都沒發生。
        //    （與先前「hotspot 進 deps」那個坑同一類：狀態被後到的寫入蓋掉。）
        if (phase !== 'locked') to('searching')
        raf = requestAnimationFrame(loop)

        // ★★★ 心跳看門狗：判準是「心跳**有沒有在前進**」，不是「總數是不是 0」。
        //
        // ⚠️ 原本寫成「12 秒後總數 === 0 就判定卡住」，那有一個洞：
        //    上游的處理迴圈是 `await this._detectAndMatch(...)`，而比對走 Web Worker。
        //    Worker 若是**跑了幾輪之後才死**（或某一次的 Promise 永遠不 resolve），
        //    總數會停在 1、2 這種非零的小數字 ⇒ 看門狗永遠不會觸發 ⇒
        //    使用者看到的就是「掃描中」跑到天荒地老，而畫面上沒有任何異常。
        //    這正是這一層要消滅的那種失敗，卻被我自己的判準漏掉了。
        // ⚠️ 也不可用「有沒有追到」當判準——沒追到是常態（沒對準也是這樣）。
        let lastTicks = -1
        let stillSince = performance.now()
        stallTimer = setInterval(() => {
          if (disposed || !tracker) return
          const n = tracker.ticks()
          const now = performance.now()
          // ⚠️ 這裡**只**負責「心跳有沒有前進」，絕不可順手也寫 `tps`。
          //    先前兩支計時器都在寫同一個變數：這一支算出來的值會蓋掉
          //    rateTimer 的結果，而且它**不呼叫 emit**——於是畫面顯示
          //    「比對 0 輪/秒」、診斷面板卻顯示「1 輪/秒」，兩邊互相矛盾。
          //    更糟的是 `stuck` 判斷讀的正是畫面那一份，所以升級訊息與自動
          //    自我測試**都不會觸發**。一個變數只能有一個寫入者。
          if (n !== lastTicks) { lastTicks = n; stillSince = now }
          // 心跳連續這麼久沒有前進 ＝ 比對迴圈卡住了（CPU 後端要放寬，見上）
          const limit = backend === 'cpu' ? STALL_MS_CPU : STALL_MS
          if (now - stillSince >= limit && phase === 'searching') to('stalled')
        }, 1000)

        // 心跳速率（輪/秒）：這是「迴圈到底有沒有在跑」最直接的數字，
        // 而且要**放在使用者看得到的地方**——他回報「掃不到」時，這個數字
        // 一眼就能把「迴圈卡住」與「迴圈在跑但比對不到」分開。
        rateTimer = setInterval(() => {
          if (disposed || !tracker) return
          const n = tracker.ticks()
          const next = n - (prevTicks ?? n)
          prevTicks = n
          if (next !== tps) { tps = next; emit() }
        }, 1000)

        // ★★★ 即時特徵點探測：只在「還沒追到」時跑，追到就停（省算力）。
        //   這是這一版給使用者的**回饋迴路**——數字會隨著他移動而變，
        //   於是「掃不到」從盲目試誤變成有方向的調整。
        // ⚠️ 要有重入保護：`probeFeatures()` 是 async，而 CPU 後端上一次偵測
        //    可能比 PROBE_MS 還久。沒有這道鎖的話 setInterval 會**疊起來**——
        //    每 0.9 秒再丟一次進去，最後整條主執行緒都在跑探測，比對迴圈反而
        //    餓死。症狀是「切到 CPU 之後更慢，而且畫面卡頓」。
        // ★★ CPU 後端上探測**很貴**（一次偵測要好幾秒），而它與比對迴圈搶的是
        //   同一條主執行緒。照 0.9 秒的節奏跑會讓兩者各拿一半——辨識速度直接
        //   砍半，而使用者要的是「認出來」不是「看數字」。所以隔遠一點。
        const probeGap = () => (backend === 'cpu' ? 6000 : 0)
        let probing = false
        let lastProbeEnd = 0
        probeTimer = setInterval(async () => {
          // ⚠️ `switching` 期間 tracker 會短暫是 null，這裡不可以硬闖。
          if (disposed || probing || switching || !tracker || tracker.tracking()) return
          if (performance.now() - lastProbeEnd < probeGap()) return
          probing = true
          try {
            const t = tracker            // 抓住當下這一顆：切後端時會被換掉
            const n = await t.probeFeatures()
            if (disposed || t !== tracker) return
            // ★ 順便量一次輸入的數值範圍——這是「特徵點很多卻永遠比對不到」
            //   唯一還能區分「資料源頭就錯了」與「描述子本身對不上」的量測。
            if (!inputRange) { try { inputRange = await t.probeInputRange?.() } catch { /* ignore */ } }
            if (disposed || t !== tracker) return
            if (n !== null && n !== features) { features = n; emit() }
          } finally {
            probing = false
            lastProbeEnd = performance.now()
          }
        }, PROBE_MS)
      } catch (e) {
        if (disposed) return
        console.error('[AR] 啟動失敗', e)
        // ⚠️ 失敗了就把已經起來的東西收乾淨：追蹤器是獨立跑的，不收的話它會
        //    繼續吃 CPU 與相機，而畫面上已經是錯誤狀態——使用者看到的是
        //    「壞掉的頁面 ＋ 一直亮著的相機指示燈 ＋ 發燙的手機」。
        try { tracker?.dispose() } catch { /* ignore */ }
        try { stage?.dispose() } catch { /* ignore */ }
        tracker = null; stage = null
        stopStream(stream); stream = null
        const n = e?.name || ''
        if (n === 'NotAllowedError' || n === 'SecurityError') return to('denied')
        if (n === 'NotFoundError' || n === 'DevicesNotFoundError') return to('no-camera')
        to('failed', e?.message || String(e))
      }
    },

    /** 使用者點卡面上的物件。回傳有沒有選到東西。 */
    pick(clientX, clientY) {
      if (!stage || !tracker?.tracking()) return false
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return false
      const nx = ((clientX - r.left) / r.width) * 2 - 1
      const ny = -((clientY - r.top) / r.height) * 2 + 1
      const uv = stage.uvAt(nx, ny)
      const hs = uv ? hitTest(card.hotspots, uv[0], uv[1]) : null
      // ⚠️ 點到卡片以外時**不清掉現有選擇**：手持會抖，誤觸空白處就把內容關掉
      //    會讓人以為壞了。
      if (!hs) return false
      latch.reset()
      hotspot = hs
      manualUntil = performance.now() + MANUAL_HOLD_MS
      emit()
      return true
    },

    /** 直接指定熱區（卡片列上的 chip）。 */
    select(hs) {
      latch.reset()
      hotspot = hs ?? null
      manualUntil = performance.now() + MANUAL_HOLD_MS
      emit()
    },

    /**
     * ★★★ 換一套運算後端重建追蹤器（相機與 3D 場景都留著）。
     *
     * 用在「自我測試證明這台裝置的 WebGL 算出來的描述子對不上 `.mind`」時——
     * 那不是使用者對不準，再怎麼喬角度都不會成功，唯一還有機會的是改用
     * **編譯 `.mind` 時用的那份 CPU kernel** 重算（見 cpuPipeline.js）。
     *
     * ⚠️ **只重建追蹤器，不動 stage。** stage 是用 `targetSize` 與
     *    `projectionMatrix` 建的，而那兩者完全由「同一個 `.mind` ＋ 同一個
     *    影像尺寸」決定 ⇒ 重建後必定相同。反過來重建 stage 才危險：
     *    `stage.dispose()` 會 `forceContextLoss()`，同一張 canvas 之後不保證
     *    拿得回 context（那正是「第 N 次點開變成空白」那個坑）。
     *
     * ⚠️ 一定要**先 dispose 舊的**：兩個 Controller 同時跑會各自吃一份相機影格
     *    與一顆 worker，而且都在寫同一個 `hotspot`／`phase`。
     * ⚠️ `fatal` 狀態下不做：那時使用者該按的是「再試一次」（重建整個 session）。
     */
    async switchBackend(next) {
      if (disposed || switching || fatal || !tracker || next === backend) return false
      switching = true
      backend = next
      emit()
      try {
        try { tracker.dispose() } catch { /* ignore */ }
        tracker = null
        // 量測值屬於上一顆追蹤器，留著會讓診斷面板顯示與現況無關的數字。
        // ⚠️ **刻意不碰 `tps`**：那個變數只能有一個寫入者（rateTimer），
        //    多一個寫入者就會回到「畫面說 0 輪/秒、面板說 1 輪/秒」那個坑
        //    （check-ar.mjs 有鎖）。清掉 `prevTicks` 就夠了——新追蹤器的心跳
        //    從 0 重新算，下一秒 rateTimer 自己會算出正確的值。
        features = null; inputRange = null; prevTicks = null
        tracker = await makeTracker(next)
        if (disposed || !tracker) return false
        if (phase !== 'locked') to('searching')
        return true
      } catch (e) {
        console.error('[AR] 切換運算後端失敗', e)
        to('failed', e?.message || String(e))
        return false
      } finally {
        switching = false
        emit()
      }
    },

    resize: syncSize,
    selfTest: (url) => tracker?.selfTest(url) ?? Promise.resolve({ ok: false, stage: 'setup', reason: '追蹤尚未啟動' }),
    info() {
      return {
        camera: stream?.getVideoTracks?.()[0]?.label || '（未授權時看不到名稱）',
        res: video?.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : '—',
        target: tracker?.targetSize?.join(' × ') ?? '—',
        ticks: tracker?.ticks() ?? 0,
        tps,
        matches: tracker?.matches?.() ?? 0,
        qr: qrReady ? (viaQr ? '有（已由 QR 認出）' : '有') : '不支援',
        scaleFix: (() => {
          const f = tracker?.inputScaleFix?.()
          if (!f) return '不需要'
          return f.applied
            ? `已校正 ×${f.factor < 1 ? '1/255' : '255'}（${Math.round(f.before)} → ${Math.round(f.after)}）`
            : `偵測到異常但校正無效（${Math.round(f.before)}）`
        })(),
        inputRange: inputRange
          ? `${inputRange.min}~${inputRange.max}（平均 ${inputRange.mean}）`
            + (inputRange.max <= 1.5 || inputRange.max > 1000 ? '　★ 異常！' : '')
          : '—',
        compat: isCompat() ? '開啟' : '關閉',
        // ★ 這一欄要顯眼：`cpu` 代表已經改用「編譯 .mind 時用的那份 kernel」重算，
        //   慢很多是預期內的，不是壞掉。
        backend: backend === 'cpu' ? 'CPU（相容運算，較慢）' : 'WebGL（GPU）',
        worker: tracker ? (tracker.sameOriginWorker ? '同源' : '內建 blob') : '—',
        ...(stage?.deviceInfo?.() ?? {}),
      }
    },

    dispose() {
      disposed = true
      try { ro?.disconnect() } catch { /* ignore */ }
      try { stopQr?.() } catch { /* ignore */ }
      cancelAnimationFrame(raf)
      clearInterval(stallTimer)
      clearInterval(probeTimer)
      clearInterval(rateTimer)
      try { tracker?.dispose() } catch { /* ignore */ }
      try { stage?.dispose() } catch { /* ignore */ }
      // ⚠️ 一定要停串流：少了它離開這一頁之後相機指示燈還亮著。
      stopStream(stream)
      if (video) video.srcObject = null
    },
  }
}

/** 追蹤引擎是懶載入的（含 TFJS）。抽成一支只是為了 start() 讀起來乾淨。 */
async function createTrackerLazy(opts) {
  const { createTracker } = await import('./tracker.js')
  return createTracker(opts)
}
