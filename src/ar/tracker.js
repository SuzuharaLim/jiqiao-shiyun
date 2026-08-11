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
import { withCompatFlags, useBuiltinWorker } from './tfjsCompat.js'
import { loadCpuController, useWebgl, useCpu, patchInputLoader, disableOpticalFlow, cpuInputSize } from './cpuPipeline.js'

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
 * ★★ CPU 後備只要求**一次**。
 *
 * 兩次確認在 WebGL 上只多花約 0.3 秒（每秒 3~4 次成功比對），很划算；
 * 但 CPU 上一輪偵測要 3~8 秒，同一份保險就變成多等一整輪——而這條路的
 * 使用者是「圖像辨識本來完全不能用」的那群人，多等十秒的體感成本遠高於
 * 誤跳一次（誤跳按上一頁就回來了）。
 * 另外 CPU 版跑的正是編譯 `.mind` 時用的那份 kernel，實測 inlier 有 29~137
 * 個（門檻是 6），本來就比 WebGL 版更不容易誤判。
 */
const MATCH_CONFIRM_CPU = 1

/**
 * @param video       已經在播、videoWidth/Height 都有值的 <video>
 * @param mindUrl     `.mind` 目標檔
 * @param onPose      (worldMatrix|null) → void，每幀（追到才有）
 * @param onFound/onLost
 * @param onTick      每輪處理迴圈跑完一次
 * @param backend     'webgl'（預設）｜'cpu'。見 cpuPipeline.js 檔頭——
 *                    `'cpu'` 是給「特徵點抓得到、比對永遠 0 次」的 GPU 用的
 *                    後備，慢很多，**只在已經證明 GPU 算不對時才切**。
 */
export async function createTracker({ video, mindUrl, onPose, onFound, onLost, onTick, backend = 'webgl' } = {}) {
  if (!video?.videoWidth || !video?.videoHeight) {
    throw new Error('影像尚未就緒（videoWidth 是 0）')
  }

  const cpu = backend === 'cpu'
  let Controller, tfShared = null
  if (cpu) {
    // ★ CPU 後備走**原始碼版**的 Controller（才拿得到共用的 tfjs 實例）。
    //   相容模式的網址旗標在這條路上沒有意義（那是調 WebGL 的），刻意不套。
    const loaded = await loadCpuController()
    tfShared = loaded.tf
    Controller = loaded.Controller
    // ⚠️ 建構期一定要在 webgl 上（InputLoader 建構式碰 backend.texData）。
    await useWebgl(tfShared)
  } else {
    // ⚠️ 動態 import：這一包含 TFJS，gzip 後仍有 300 KB 級。靜態 import 會把它
    //    打進主 bundle，首頁就得為一個多數人不會點的功能背這個重量。
    // ★ 相容模式：TFJS 只在**模組初始化的那一刻**讀網址上的 `tfjsflags`，
    //   所以旗標必須在這個 import 之前放進網址、import 完馬上還原。
    //   （預設關閉；只有自我測試失敗的裝置才會開，見 tfjsCompat.js）
    const restoreUrl = withCompatFlags()
    let mod
    try {
      mod = await import('mind-ar/dist/mindar-image.prod.js')
    } finally {
      restoreUrl()
    }
    Controller = mod.Controller ?? mod.default?.Controller
  }
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

  // ★ CPU 路徑刻意降解析度（見 cpuPipeline.js 的實測表：像素數砍到 1/7，
  //   命中率不變、速度快 5 倍）。WebGL 路徑維持原生解析度。
  // ⚠️ 一定要**等比例**：`stage.js` 的裁切修正用 video 的長寬比算 kx/ky，
  //    而投影矩陣來自這裡的 inputWidth/Height——長寬比一旦不同，3D 就會
  //    與影像對不上。
  const [inW, inH] = cpu
    ? cpuInputSize(video.videoWidth, video.videoHeight)
    : [video.videoWidth, video.videoHeight]

  const controller = new Controller({
    inputWidth: inW,
    inputHeight: inH,
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

  // ★ CPU 後備：換掉唯一硬綁 WebGL 的 InputLoader，然後才切後端。
  //   順序不可調換（理由見 cpuPipeline.js）：
  //     webgl 建構 → 換 inputLoader → 切 cpu → addImageTargets → dummyRun
  if (cpu) {
    patchInputLoader(controller, tfShared)
    await useCpu(tfShared)
  }

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
  // ★★★ 處理迴圈現在有幾輪還在飛。**自我測試要等它歸零才能開始。**
  //
  // ⚠️ `workerMatchDone` 是**單一欄位不是佇列**：迴圈那一輪還在等 worker 回覆時，
  //    自我測試再送一次 match 就會覆蓋掉前一個 resolver ⇒ 前一個 Promise
  //    永遠不 resolve ⇒ 追蹤整個靜默卡死。
  // ⚠️ 原本是「stopProcessVideo 之後睡 150ms」。那在 WebGL 上夠（一輪幾十毫秒），
  //    在 CPU 後備上**完全不夠**——一輪要 3~8 秒。用固定睡眠等於賭，
  //    而賭輸的結果是整條追蹤鏈靜默死掉。改成真的等它結束。
  let inFlight = 0
  const origDetectAndMatch = controller._detectAndMatch.bind(controller)
  controller._detectAndMatch = async (inputT, targetIndexes) => {
    inFlight++
    let r
    try { r = await origDetectAndMatch(inputT, targetIndexes) } finally { inFlight-- }
    if (!disposed && r && r.targetIndex !== -1 && r.modelViewTransform) {
      matches++
      if (!visible && matches >= (cpu ? MATCH_CONFIRM_CPU : MATCH_CONFIRM)) {
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
  // ★ 相容模式下**不換 worker**，直接沿用 MindAR 內建的那顆（見 tfjsCompat.js）。
  //   這是「同源 worker 與內建 worker 行為不同」這個假設的唯一測試方式，
  //   而它在使用者的裝置上還沒被排除過。
  try {
    if (useBuiltinWorker()) throw new Error('相容模式：沿用內建 worker')
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
    // 換不成（或相容模式刻意不換）就沿用內建的 blob worker
    // ——那條路需要 CSP 放行 worker-src blob:（server/index.js 有保留）
    if (!useBuiltinWorker()) console.warn('[AR] 同源 worker 建立失敗，沿用內建的 blob worker', err)
  }

  const { dimensions } = await controller.addImageTargets(mindUrl)
  const [W, H] = dimensions[0] ?? [1, 1]

  // ⚠️ 一定要在 addImageTargets **之後**：`controller.tracker`（光流）到這時
  //    才被建立。CPU 後端沒有它的 WebGL program，不停用的話 dummyRun 當場就炸。
  if (cpu) disableOpticalFlow(controller)

  // ★★★ 灰階轉換的數值尺度自動校正。
  //
  // ⚠️ `InputLoader` 的自訂 shader 是：
  //        setOutput((0.299*r + 0.587*g + 0.114*b) * 255.0)
  //    它**假設** `texture()` 讀回來的是 0~1。這在絕大多數驅動上成立，但不是
  //    規格保證的——若某個實作回的是 0~255，輸出就會變成 0~65025。
  //    兩種偏差下 Laplacian 門檻（3.0）都會失去意義：
  //      太大 ⇒ 到處都「是特徵」，數量看起來很健康但**全是雜訊**
  //      太小 ⇒ 幾乎抓不到特徵
  //    前者正好符合實測到的「特徵點 372 很漂亮、比對成功 0 次」
  //    （Samsung Xclipse 540 on Vulkan，相容模式與換 worker 都無效）。
  //
  // ★ 既然 `inputLoader.program` 是每次 `loadInput` 都會讀的普通物件，
  //   就可以在執行期把 shader 換成帶補償係數的版本——tfjs 以 shader 原始碼
  //   為快取鍵，改了字串就會編譯成新程式。
  //
  // ⚠️ **只在數值明顯結構性偏掉時才動**（≤1.5 或 >1000）。那兩種是「乘錯 255」
  //    的特徵，與「畫面本來就暗」完全不同量級——後者絕不可誤判成需要校正，
  //    否則會把正常裝置弄壞。
  // ⚠️ 校正後要**重新量一次**確認真的修好了；沒修好就還原，不要留下一個
  //    改過卻沒用的 shader（那會讓之後的診斷更難讀）。
  let inputScaleFix = null
  const measureRange = async () => {
    let t = null, a = null, b = null
    try {
      t = controller.inputLoader.loadInput(video)
      a = t.min(); b = t.max()
      const [mn, mx] = await Promise.all([a.data(), b.data()])
      return { min: mn[0], max: mx[0] }
    } catch { return null }
    finally { for (const x of [t, a, b]) { try { x?.dispose?.() } catch { /* ignore */ } } }
  }

  async function autoFixInputScale() {
    // ⚠️ CPU 後備沒有 shader 可改（inputLoader 已被換成後端無關的版本），
    //    而「乘錯 255」本來就是 shader 專屬的問題——這裡直接跳過，
    //    不要讓它去讀一個不存在的 `program.userCode`。
    if (cpu) return
    const before = await measureRange()
    if (!before) return
    // 正常範圍：最大值應該接近 255。只處理「差了 255 倍」這種結構性偏差。
    const factor = before.max <= 1.5 ? 255 : (before.max > 1000 ? 1 / 255 : 0)
    if (!factor) return
    const loader = controller.inputLoader
    const original = loader.program
    try {
      // ⚠️ 不可去字串比對 `* 255.0`——上游改寫法（或別的偏差成因）時就會靜默失效。
      //    改成把整個 setOutput 的運算式包起來乘上係數，與內部寫法無關。
      const patched = original.userCode.replace(
        /setOutput\(([\s\S]*?)\);/,
        (_, expr) => `setOutput((${expr}) * ${factor.toFixed(8)});`)
      if (patched === original.userCode) {
        inputScaleFix = { applied: false, before: before.max, after: null, why: '找不到 setOutput' }
        return
      }
      loader.program = { ...original, userCode: patched }
      const after = await measureRange()
      if (!after || after.max <= 1.5 || after.max > 1000) {
        loader.program = original            // 沒修好就還原
        inputScaleFix = { applied: false, before: before.max, after: after?.max ?? null }
      } else {
        inputScaleFix = { applied: true, factor, before: before.max, after: after.max }
        console.warn('[AR] 偵測到灰階數值尺度異常，已自動校正', inputScaleFix)
      }
    } catch {
      loader.program = original
    }
  }

  // ⚠️ dummyRun 是必要的暖機（編譯 shader、配置 tensor）。少了它第一次偵測會卡
  //    好幾百毫秒，症狀是「打開相機後畫面凍住一下」。
  await controller.dummyRun(video)
  if (disposed) { try { controller.dispose() } catch { /* ignore */ } ; return null }
  // ⚠️ 一定要在 processVideo 之前：迴圈跑起來之後再換 shader 會與正在飛的那一輪打架。
  await autoFixInputScale()
  if (disposed) { try { controller.dispose() } catch { /* ignore */ } ; return null }
  controller.processVideo(video)

  return {
    targetSize: [W, H],
    projectionMatrix: controller.getProjectionMatrix(),
    inputSize: [controller.inputWidth, controller.inputHeight],
    sameOriginWorker,
    /** 'webgl' 或 'cpu'。診斷面板要顯示——這是最容易被誤判成「程式沒改到」的一項。 */
    backend,
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
    /** 灰階尺度有沒有被自動校正過（診斷用；null＝數值正常，沒動過）。 */
    inputScaleFix: () => inputScaleFix,

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
     * ★★★ 偵測器**實際讀到的灰階數值範圍**。
     *
     * 為什麼值得量：`InputLoader` 用一段自訂的 WebGL shader 把影像轉灰階——
     *     setOutput((0.299*r + 0.587*g + 0.114*b) * 255.0)
     * 它假設 `texture()` 讀回來的是 **0~1**。若某個驅動回的是 0~255，
     * 輸出就會是 0~65025；反過來若沒乘到 255，就會是 0~1。
     * 兩種情況下 Laplacian 門檻（3.0）都會失去意義：
     *   - 太大 ⇒ 到處都「是特徵」，數量看起來很健康但**全是雜訊**
     *   - 太小 ⇒ 幾乎沒有特徵
     * 這正好能解釋使用者的裝置「特徵點 372 很漂亮、比對成功 0 次」。
     *
     * 正常值：mean 約 60~200、max 接近 255。若 max ≤ 1 或 max > 1000，
     * 就是這一段在該驅動上算錯了——那是所有後續運算的源頭。
     */
    async probeInputRange() {
      if (disposed) return null
      let t = null, a = null, b = null, c = null
      try {
        t = controller.inputLoader.loadInput(video)
        a = t.min(); b = t.max(); c = t.mean()
        const [mn, mx, mean] = await Promise.all([a.data(), b.data(), c.data()])
        return { min: +mn[0].toFixed(1), max: +mx[0].toFixed(1), mean: +mean[0].toFixed(1) }
      } catch { return null }
      finally { for (const x of [t, a, b, c]) { try { x?.dispose?.() } catch { /* ignore */ } } }
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
    // ⚠️ CPU 後備上一幀要 3~8 秒，跑 10 幀就是一分鐘起跳——使用者早就以為當機了。
    //    而離線實測顯示合成畫面**第一幀就會命中**（15 種尺寸組合全中），
    //    所以 3 幀已經足夠有代表性。
    async selfTest(imageUrl, { frames = cpu ? 3 : 10 } = {}) {
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
      // ★★★ 真的等正在飛的那一輪結束（見 `inFlight` 的註解）。
      //    ⚠️ 一定要有上限：萬一那一輪真的死了（正是自我測試要診斷的情況之一），
      //       死等會讓整個診斷永遠不回來——那比誤判更糟。
      const waitUntil = performance.now() + 20000
      while (inFlight > 0 && performance.now() < waitUntil && !disposed) {
        await new Promise(r => setTimeout(r, 100))
      }
      if (disposed) return { ok: false, stage: 'setup', reason: '追蹤已結束' }

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
