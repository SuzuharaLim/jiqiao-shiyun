// ============================================================================
// 追蹤層 —— 包住 MindAR 的 Controller，**完全不知道 three 存在**
//
// 對外只吐三樣東西：
//   ① 目標圖尺寸（像素）        → 熱區換算要用
//   ② OpenGL 投影矩陣（16 個數）→ 算繪端照抄即可
//   ③ 每一幀的 worldMatrix       → 物件的變換矩陣
//
// ★ 為什麼不再用 `MindARThree`（舊版 `src/lib/mindarThree.js`，413 行）：
//   那是把上游 `mind-ar/src/image-target/three.js` **整份抄進專案再改 6 處**
//   （sRGBEncoding、Controller 來源、拿掉 CSS3DRenderer、拿掉內建 UI、補
//   dispose、stop 防呆）。代價是：
//     - 它同時擁有 video、renderer、camera、anchor、resize 五件事，
//       每一個 bug 都跨層（z-index 全黑、換鏡頭沒 resize）
//     - 上游一更新就要人工比對「我們改過哪 6 處」
//     - 為了讓 anchor 好用而多包的 postMatrix，逼出兩個量出來的符號常數
//   直接用 Controller 沒有這些問題：它不 import three，所以 sRGBEncoding
//   那個相容性問題**從一開始就不存在**，不需要抄任何上游程式碼。
//
// ⚠️ 同源 worker：上游 controller.js 第 4 行是
//        import ControllerWorker from "./controller.worker.js?worker&inline"
//    `inline` 讓 Vite 把 worker 內嵌成 **blob**，於是 CSP 必須放行
//    `worker-src blob:`。少了那一行，worker 被擋掉、比對的 Promise 永遠不
//    resolve ⇒ **永遠掃不到而畫面完全正常**（2026-08-10 正式站事故）。
//    這裡用 `?worker`（不 inline）產出**同源的 .js**，`script-src 'self'`
//    本來就允許 ⇒ AR 不再依賴伺服器的 CSP 設定。
// ============================================================================

// ⚠️ 是 `?worker` **不是** `?worker&inline`（見上）。
import ControllerWorker from 'mind-ar/src/image-target/controller.worker.js?worker'

/** 出現／消失門檻。理由見 createTracker 的註解。 */
const WARMUP = 1
const MISS = 10
/**
 * ★ 要連續比對成功幾次才宣告「認出來」。
 *
 * ⚠️ 上游的 `warmupTolerance` 其實身兼兩職：等光流追蹤穩定（我們不需要）
 *    **以及防誤判的去抖動**（我們需要）。繞過它時如果只認一次比對就跳轉，
 *    等於把後者也一起丟掉了——MindAR 是 inlier 式判定，誤判很少但不是不可能，
 *    而這條動線的代價是「直接把使用者送到另一頁」，誤跳的體感很差。
 * ⚠️ 也不要設太高：使用者實測每秒約 3~4 次成功比對，設 2 只多花約 0.3 秒，
 *    設 5 以上就會讓「明明對準了卻要等」的感覺回來。
 */
const MATCH_CONFIRM = 2

/**
 * @param video       已經在播、videoWidth/Height 都有值的 <video>
 * @param mindUrl     `.mind` 目標檔
 * @param onPose      (worldMatrix|null) → void，每幀（追到才有）
 * @param onFound/onLost
 * @param onTick      每輪處理迴圈跑完一次
 */
export async function createTracker({ video, mindUrl, onPose, onFound, onLost, onTick } = {}) {
  if (!video?.videoWidth || !video?.videoHeight) {
    throw new Error('影像尚未就緒（videoWidth 是 0）')
  }

  // ⚠️ 動態 import：這一包含 TFJS，gzip 後仍有 300 KB 級。靜態 import 會把它
  //    打進主 bundle，首頁就得為一個多數人不會點的功能背這個重量。
  const mod = await import('mind-ar/dist/mindar-image.prod.js')
  const Controller = mod.Controller ?? mod.default?.Controller
  if (!Controller) throw new Error('MindAR Controller 載入失敗')

  let disposed = false
  let ticks = 0
  let visible = false

  // 單一入口切換「有沒有認出來」，避免 onUpdate 與比對攔截兩條路各自維護狀態。
  const setVisible = (v) => {
    if (v === visible) return
    visible = v
    v ? onFound?.() : onLost?.()
  }

  const controller = new Controller({
    inputWidth: video.videoWidth,
    inputHeight: video.videoHeight,
    maxTrack: 1,
    // ★★★ 出現門檻：上游預設要**連續 6 幀**都追到才算「認出來」
    //    （DEFAULT_WARMUP_TOLERANCE=5，判斷式是 trackCount > warmupTolerance）。
    // ⚠️ 手持、卡片會動、中階手機每秒可能只處理個位數幀——連續 6 幀是很高的門檻，
    //    而**暖機期間畫面完全沒有回饋**：使用者可能已經追到好幾次、每次都沒撐到
    //    第 6 幀，看起來就是「完全掃不到」。
    // ⚠️ 這**不是**調低比對門檻。MindAR 是 inlier 式判定，比對本身沒有分數可調；
    //    warmup 只是防抖，降低它不會讓它認錯目標，只會讓「已經對的」更快出現。
    warmupTolerance: WARMUP,
    // 相對地把漏幀容忍放寬：低幀率下偶爾漏一兩幀很正常，容忍太小內容會一直閃，
    // 而閃動比慢半拍更惱人。
    missTolerance: MISS,
    onUpdate: (data) => {
      if (disposed) return
      ticks++                                  // 心跳：processDone 與 updateMatrix 都算
      if (data.type === 'processDone') { onTick?.(); return }
      if (data.type !== 'updateMatrix') return
      const m = data.worldMatrix
      if (m) { setVisible(true) } else if (visible) { setVisible(false) }
      onPose?.(m ?? null)
    },
  })

  // ★★★ 「認出來」**只看比對，不等追蹤**。
  //
  // 上游要判定「認出來了」其實有兩道關卡（controller.js 的 startProcessing）：
  //   ① `_detectAndMatch()` 比對成功（targetIndex !== -1）
  //   ② 接著**同一幀**馬上跑 `_trackAndUpdate()`（光流／模板追蹤），而且要
  //      連續 `warmupTolerance + 1` 幀都成功，才會把 `showing` 設成 true、
  //      才會發出帶 worldMatrix 的 updateMatrix。
  // 也就是說：**比對成功但光流追蹤跟不上時，畫面上永遠不會有任何反應**——
  // 狀態列一直寫「掃描中」，而其實它每一輪都認出來了。
  //
  // ⚠️ 這個失敗模式我的離線測試**完全看不到**，因為那些測試只呼叫
  //    `_detectAndMatch`，從來沒有跑過 `_trackAndUpdate`。所以「離線 4/4 全過、
  //    實機永遠掃不到」是完全可能的，而我一度以為那代表管線沒問題。
  //
  // ★ 而這一版的動線**根本不需要追蹤**：認出一次就跳到模型頁，之後看模型不再
  //   依賴相機。所以直接把第②關拿掉——包住 `_detectAndMatch`，比對一成功就
  //   自己算出 worldMatrix 並宣告 found。這同時讓辨識快很多（不必等暖機）。
  let matches = 0
  const origDetectAndMatch = controller._detectAndMatch.bind(controller)
  controller._detectAndMatch = async (inputT, targetIndexes) => {
    const r = await origDetectAndMatch(inputT, targetIndexes)
    if (!disposed && r && r.targetIndex !== -1 && r.modelViewTransform) {
      matches++
      if (!visible && matches >= MATCH_CONFIRM) {
        setVisible(true)
        // ⚠️ 這裡要自己把 modelViewTransform 換成 worldMatrix：上游只有在
        //    `showing` 為 true 時才會做這件事，而我們就是不想等它。
        try { onPose?.(controller.getWorldMatrix(r.modelViewTransform, r.targetIndex)) } catch { /* 姿態拿不到不影響「認出來」 */ }
      }
    }
    return r
  }

  // ★★★ 換成同源 worker，**必須在 addImageTargets 之前**：
  //    `setup` 訊息（含 matchingDataList）是在那支方法裡才 postMessage 的
  //    （controller.js 第 100 行）。換晚了，新 worker 收不到目標資料
  //    ⇒ 永遠比對不出東西，而且完全沒有錯誤訊息。
  let sameOriginWorker = false
  try {
    const w = new ControllerWorker()
    // ⚠️ 兩個分支要與上游逐字一致（controller.js 第 60–67 行）：
    //    workerMatchDone／workerTrackDone 漏接任何一個，對應的 Promise 就
    //    永遠不 resolve——又是一個靜默死結。
    w.onmessage = (e) => {
      if (e.data.type === 'matchDone' && controller.workerMatchDone !== null) controller.workerMatchDone(e.data)
      if (e.data.type === 'trackUpdateDone' && controller.workerTrackDone !== null) controller.workerTrackDone(e.data)
    }
    try { controller.worker?.terminate?.() } catch { /* 被擋掉的那顆本來就沒起來 */ }
    controller.worker = w
    sameOriginWorker = true
  } catch (err) {
    // 換不成就沿用內建的 blob worker——那條路需要 CSP 放行 worker-src blob:
    console.warn('[AR] 同源 worker 建立失敗，沿用內建的 blob worker', err)
  }

  const { dimensions } = await controller.addImageTargets(mindUrl)
  const [W, H] = dimensions[0] ?? [1, 1]

  // ⚠️ dummyRun 是必要的暖機（編譯 shader、配置 tensor）。少了它第一次偵測會卡
  //    好幾百毫秒，症狀是「打開相機後畫面凍住一下」。
  await controller.dummyRun(video)
  if (disposed) { try { controller.dispose() } catch { /* ignore */ } ; return null }
  controller.processVideo(video)

  return {
    targetSize: [W, H],
    projectionMatrix: controller.getProjectionMatrix(),
    inputSize: [controller.inputWidth, controller.inputHeight],
    sameOriginWorker,
    /**
     * 處理迴圈跑了幾輪。**恆為 0 代表比對根本沒在跑**，而不是「沒對準」。
     * 這是把靜默失敗變成可觀測事實的唯一鉤子。
     */
    ticks: () => ticks,
    tracking: () => visible,
    /**
     * 比對成功過幾次。
     * ⚠️ 這個數字與「有沒有認出來」是**兩件事**：上游還要光流追蹤連續成功才算數。
     *    `matches > 0` 卻一直沒認出來 ⇒ 問題在追蹤不在比對（這一版已經把那道關卡
     *    拿掉，留著這個計數是為了萬一還有殘留問題時分得出來）。
     */
    matches: () => matches,

    /**
     * ★★★ 即時特徵點探測 —— 這一版最重要的新東西。
     *
     * 回傳「**這一幀相機畫面上找得到幾個特徵點**」。
     *
     * 為什麼值得單獨做：使用者回報「掃不到」時，舊版能給的只有「有沒有追到」
     * 這個是非題，而那與「太遠／太暗／糊掉／反光／卡片不同版」全部長得一樣。
     * 特徵點數量是**直接量到的影像品質**：
     *   接近 0   → 相機畫面本身不可用（糊、暗、反光、離太遠）
     *   幾百個   → 影像沒問題，那麼追不到就是角度或卡片版本的問題
     * 有了這個數字，使用者可以**一邊移動一邊看它變大**——把盲目試誤變成有回饋
     * 的調整。這是診斷面板做不到的事，所以它顯示在狀態列上，不是藏在面板裡。
     *
     * ⚠️ 只用 `cropDetector`，**不碰 worker**。這一點是安全性的關鍵：
     *    Controller 的 `workerMatchDone` 是**單一欄位不是佇列**，
     *      _workerMatch() { this.workerMatchDone = resolve; worker.postMessage(...) }
     *    所以在處理迴圈跑著的時候再送一次 `match`，會覆蓋掉前一個 resolver，
     *    **前一個 Promise 永遠不 resolve** ⇒ 整個追蹤靜默卡死。
     *    `controller.detect()` 走的是本地 TFJS、不經過 worker，可以安全並行。
     * ⚠️ 上游的 `detect()`（置中裁切）與迴圈用的 `detectMoving()`（九宮格游走）
     *    只共用 kernel 快取與一個 detectMoving 自己才寫的索引，沒有共享可變狀態。
     */
    async probeFeatures() {
      if (disposed) return null
      try {
        const { featurePoints } = await controller.detect(video)
        return featurePoints?.length ?? 0
      } catch { return null }
    },

    /**
     * ★★ 離線自我測試：把**內建的卡面圖**接到同一條管線上。
     *
     * 把「這台裝置跑不跑得起辨識」從「相機畫面好不好」裡切出來——兩者的下一步
     * 動作完全不同，猜錯只會白繞。
     *
     * ⚠️ 一定要先 `stopProcessVideo()`：這條路**會**用到 worker（要 match），
     *    與即時迴圈同時送就會踩到上面那個單一欄位的死結。
     * ⚠️ **絕不要走 `canvas.captureStream()` ＋ 換 video srcObject**：
     *    iOS Safari 對 captureStream 支援不穩，而且 `video.play()` 在非手勢情境
     *    會被擋 ⇒ 影格永遠不更新 ⇒ 逾時。一個會給假失敗的診斷比沒有診斷更糟，
     *    它會把人推去換手機。直接餵畫面給 Controller 才是真的在測這條鏈。
     */
    async selfTest(imageUrl, { frames = 10 } = {}) {
      if (disposed) return { ok: false, stage: 'setup', reason: '追蹤已結束' }
      let img
      try {
        img = await new Promise((res, rej) => {
          const i = new Image()
          i.onload = () => res(i)
          i.onerror = () => rej(new Error('卡面圖載入失敗'))
          i.src = imageUrl
        })
      } catch (e) { return { ok: false, stage: 'image', reason: e.message } }

      const iw = controller.inputWidth, ih = controller.inputHeight
      const cvs = document.createElement('canvas')
      cvs.width = iw; cvs.height = ih
      const ctx = cvs.getContext('2d')
      if (!ctx) return { ok: false, stage: 'canvas', reason: '取不到 2D context' }

      const wasProcessing = controller.processingVideo
      try { controller.stopProcessVideo() } catch { /* ignore */ }
      // 讓正在飛的那一輪先結束，避免它的回呼與我們搶同一個欄位
      await new Promise(r => setTimeout(r, 150))

      const t0 = performance.now()
      try {
        for (let i = 0; i < frames; i++) {
          ctx.fillStyle = '#8a8a8a'; ctx.fillRect(0, 0, iw, ih)
          const w = iw * 0.55, h = w * (img.height / img.width)
          // ⚠️ 每幀給一點位移：迴圈的偵測走 detectMoving，完全靜止不是它預期的輸入
          ctx.drawImage(img, (iw - w) / 2 + Math.sin(i * 0.9) * 6, (ih - h) / 2 + Math.cos(i * 0.7) * 6, w, h)
          let inputT = null
          try {
            inputT = controller.inputLoader.loadInput(cvs)
            // ★★★ 一定要走**未被攔截**的原函式。
            //
            // ⚠️ 上面那個攔截會「比對一成功就宣告認出來」，而自我測試餵的是
            //    **內建的卡面圖**——走攔截版的話，自我測試一成功就會讓整個
            //    session 進入 locked、然後跳去模型頁，**而使用者的卡片根本
            //    沒有被認出來**。那是假成功：畫面宣告成功、實際上什麼都沒發生，
            //    正是這一層存在的理由要消滅的東西。
            //    更糟的是自我測試現在是**自動**跑的（卡住時觸發），所以這個
            //    假跳轉會發生在「一直掃不到」的人身上——最不該被誤導的那群人。
            const r = await origDetectAndMatch(inputT, [0])
            if (r && r.targetIndex !== -1 && r.modelViewTransform) {
              return { ok: true, ms: Math.round(performance.now() - t0), frames: i + 1 }
            }
          } catch (e) {
            // 拋例外＝**這台裝置跑不起這條鏈**（WebGL context／TFJS kernel／worker
            // 被擋…）。與「跑得起來但沒認出」是完全不同的結論，要分開回報。
            return { ok: false, stage: 'pipeline', reason: e?.message || String(e), frames: i + 1 }
          } finally {
            try { inputT?.dispose?.() } catch { /* ignore */ }
          }
        }
        return { ok: false, stage: 'match', reason: `跑完 ${frames} 幀都沒認出`, ms: Math.round(performance.now() - t0) }
      } finally {
        // ⚠️ 一定要把即時追蹤接回去，否則測完之後這一頁就再也不會追蹤了。
        //    每一條 return 路徑都要經過這裡，所以用 finally。
        if (wasProcessing && !disposed) {
          try { controller.processVideo(video) } catch { /* ignore */ }
        }
      }
    },

    dispose() {
      disposed = true
      try { controller.stopProcessVideo() } catch { /* ignore */ }
      try { controller.dispose() } catch { /* ignore */ }
      try { controller.worker?.terminate?.() } catch { /* ignore */ }
    },
  }
}
