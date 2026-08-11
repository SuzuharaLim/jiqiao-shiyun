// ============================================================================
// CPU 運算後備 —— 給「特徵點抓得到、比對永遠 0 次」的 GPU
//
// ★★★ 為什麼這條路值得做（2026-08-11，看過上游原始碼之後才確定的事）：
//
//   `mind-ar/src/image-target/offline-compiler.js` 的第 5 行是
//        import './detector/kernels/cpu/index.js'
//   也就是說——**`.mind` 裡那份特徵描述子是 CPU kernel 算出來的**。
//   而執行期的 `detector.js` 第 5 行只 import 了 `kernels/webgl/index.js`，
//   跑的是同一套演算法的 **WebGL 版本**。
//
//   兩份實作**應該**算出一樣的結果，在絕大多數 GPU 上也確實一樣。但那是
//   「應該」——WebGL 的浮點精度、貼圖格式、driver 對邊界條件的處理都不是
//   規格層級保證一致的東西。一旦某台裝置的 WebGL 版算出**位置對、值不對**的
//   描述子，症狀就會是：
//        特徵點數量 372　很漂亮      ← 位置抓得到
//        比對成功    0 次           ← 描述子與 .mind 那份對不起來
//        自我測試（餵內建卡面圖）也失敗 ← 與相機、卡片、光線全部無關
//   這正是使用者 Samsung Xclipse 540（ANGLE on Vulkan）上量到的東西，而且
//   **MindAR 官方原版範例（`public/ar/plain.html`）在同一台上也失敗**——
//   所以問題確定在函式庫與這顆 GPU 之間，不在本站加的任何一層。
//
//   ⇒ 那就別用那顆 GPU 算。改用**編譯 `.mind` 時用的同一份 CPU kernel**。
//     這不是「繞過」，這是回到產生那份資料的參考實作。
//
// ★ 為什麼先前的結論是「純 CPU 走不通，不要再試」（tfjsCompat.js 的註解）：
//   那個實驗是 `?tfjsflags=HAS_WEBGL:false`——把 WebGL **整個拿掉**。
//   Controller 建構當場就炸（`Cannot read properties of undefined (reading 'get')`），
//   因為 `InputLoader` 的建構式裡有 `backend.texData.get(...)`，CPU 後端沒有
//   `texData` 這個東西。那個結論對**當時那個做法**是對的，但它測的不是
//   「CPU kernel 能不能算」，而是「把 WebGL 拔掉會不會壞」——當然會。
//   這一支的做法完全不同：**WebGL 留著**（建構期要用），只把 tfjs 的
//   運算後端切到 cpu，並且把三處硬綁 WebGL 的地方換掉。
//
// ★ 硬綁 WebGL 的地方只有三處，而且每一處都有現成的替代品：
//
//   ① `InputLoader.loadInput()`  —— `backend.gpgpu.uploadPixelDataToTexture` ＋
//      自訂 shader。同一個檔案裡就留著它自己的舊版 `_loadInput()`（用
//      `tf.browser.fromPixels().mean(2)`），與後端無關。
//      ⚠️ 而且 `mean(2)` ＝ (r+g+b)/3，**正好就是編譯器用的灰階公式**
//         （`compiler-base.js`：`(data[o] + data[o+1] + data[o+2]) / 3`）。
//         執行期那個 shader 用的反而是 luma 權重 0.299/0.587/0.114——兩者
//         本來就不一樣。FREAK 是亮度**比較**式的描述子，單調變換多半洗得掉，
//         所以平常沒事；但既然要走參考實作，就一路走到底。
//
//   ② `Tracker.track()` / `dummyRun()` —— 光流追蹤，`_compileAndRun` 沒有
//      CPU 版本。**而這一版的動線根本不需要它**：認出一次就跳去模型頁
//      （見 tracker.js 的 MATCH_CONFIRM）。直接停用，讓迴圈退化成
//      「每一輪都重新偵測＋比對」。上游對 `_trackAndUpdate` 回傳 null 的
//      處理就是把 `isTracking` 設回 false（controller.js 第 218 行），
//      所以這是它預期內的路徑，不是硬塞。
//
//   ③ `Detector` 本身 —— 看起來像是 WebGL 專用，其實**已經全部改成
//      `tf.engine().runKernel(...)`**（11 處），舊的 `_compileAndRun` 呼叫
//      全都躺在 `/* */` 註解裡。也就是它早就是後端無關的了，只差沒有人去
//      import CPU 那份 kernel。
//
// ⚠️ 代價：CPU 慢很多。這條路**只在已經證明 GPU 算不對時才走**，
//    絕不可當預設——對正常裝置是純粹的退步。
// ⚠️ 代價二：走這條路要 import `mind-ar/src/…` 原始碼（才拿得到共用的 tfjs
//    實例），而平常走的是 `mind-ar/dist/mindar-image.prod.js`。兩者是**不同的
//    chunk**，都載入的話會有兩份 TFJS。這是刻意接受的：正常裝置永遠只載前者，
//    只有已經失敗的裝置才會多載後者——對它們來說，「多 1.7 MB」與「完全不能用」
//    之間沒什麼好權衡的。
// ============================================================================

/**
 * ★★★ CPU 路徑的輸入解析度預算（像素數）。
 *
 * 偵測器的成本幾乎與像素數成正比，而**比對成功率幾乎不受影響**。
 * 離線實測（node、純 JS tfjs CPU 後端、同一張卡、同一份 `.mind`，
 * 卡片分別佔畫面 85% / 60% / 40%，共 15 種組合**全部命中**）：
 *
 *   1280×960（123 萬像素）  特徵點 344/165/75　偵測 12.3 / 14.3 / 12.3 秒
 *    800×600（ 48 萬）      特徵點 328/163/75　偵測  5.9 /  5.2 /  5.3 秒
 *    640×480（ 31 萬）      特徵點 308/160/75　偵測  4.0 /  3.6 /  3.6 秒
 *    512×384（ 20 萬）      特徵點 288/155/77　偵測  2.8 /  2.5 /  2.2 秒
 *    400×300（ 12 萬）      特徵點 274/152/74　偵測  1.9 /  1.9 /  1.9 秒
 *
 * ⇒ 從 123 萬降到 18 萬，特徵點只掉了兩成、命中率完全沒變，速度快 5 倍。
 *   不縮的話一幀要十幾秒，使用者早就放棄了——**慢到沒人等得下去，
 *   跟不能用是同一件事**。
 *
 * ⚠️ 這是**離線合成畫面**量到的：正面、無雜訊、對焦完美。真實相機畫面
 *    更吵、有角度，特徵點會比這張表少，所以刻意不取最激進的 12 萬。
 * ⚠️ 只有 CPU 路徑縮。WebGL 路徑維持原生解析度（它本來就夠快，
 *    而降解析度會讓正常裝置的辨識距離變短）。
 */
const CPU_PIXEL_BUDGET = 180000

/**
 * 算出 CPU 路徑要用的輸入尺寸。**等比例縮放**，不裁切。
 *
 * ⚠️ 一定要維持長寬比：`stage.js` 的裁切修正用 video 的長寬比算 kx/ky，
 *    而投影矩陣來自 Controller 的 inputWidth/Height——兩者長寬比一旦不同，
 *    3D 就會與影像對不上（而且是「差一點點」那種最難查的對不上）。
 * ⚠️ 取偶數：偵測器會建影像金字塔，逐層減半，奇數邊長沒有好處。
 */
export function cpuInputSize(videoW, videoH) {
  const px = videoW * videoH
  if (!px) return [videoW, videoH]
  if (px <= CPU_PIXEL_BUDGET) return [videoW, videoH]
  const s = Math.sqrt(CPU_PIXEL_BUDGET / px)
  const even = (n) => Math.max(2, Math.round(n * s / 2) * 2)
  return [even(videoW), even(videoH)]
}

/**
 * 載入「原始碼版」的 Controller，並且註冊 CPU kernel。
 *
 * ⚠️ 一定要 import `mind-ar/src/…` 不可用 `dist/mindar-image.prod.js`：
 *    prod 那份把 TFJS **打包在自己裡面**，我們拿不到它的 `tf` 實例，
 *    也就無從呼叫 `setBackend`。走原始碼時 Vite 會把 `@tensorflow/tfjs`
 *    解析到同一份 node_modules，我們與 MindAR 共用同一個 tfjs registry。
 *
 * ⚠️ CPU kernel 的 import **必須在 Controller 之前**沒有硬性要求（registerKernel
 *    是全域的、與 backend 何時切換無關），但放前面讀起來才符合因果。
 */
export async function loadCpuController() {
  const tf = await import('@tensorflow/tfjs')
  // 上游 `detector.js` 只 import 了 webgl 那一份；CPU 這份完整存在（13 個檔案，
  // 比 webgl 版還多），只是沒有人去載。編譯 `.mind` 用的就是它。
  await import('mind-ar/src/image-target/detector/kernels/cpu/index.js')
  const mod = await import('mind-ar/src/image-target/controller.js')
  const Controller = mod.Controller ?? mod.default?.Controller
  if (!Controller) throw new Error('MindAR Controller（原始碼版）載入失敗')
  return { tf, Controller }
}

/**
 * 建構 Controller 之前要確保後端是 **webgl**。
 *
 * ⚠️ 這不是筆誤：`new Controller()` 裡會 `new InputLoader()`，而那支建構式
 *    第 26 行是 `backend.texData.get(...)`——CPU 後端沒有 `texData`，
 *    當場 TypeError。所以順序只能是
 *      webgl 建構 → 換掉 inputLoader → 切 cpu → addImageTargets → dummyRun
 *    切 cpu 一定要在 `addImageTargets` **之前**：那支會建立目標的 tensor，
 *    建在 webgl 上再切後端就成了跨後端的孤兒。
 */
export async function useWebgl(tf) {
  if (tf.getBackend() !== 'webgl') await tf.setBackend('webgl')
  await tf.ready()
}

/** 切到 CPU 後端。要在 Controller 建構之後、addImageTargets 之前。 */
export async function useCpu(tf) {
  await tf.setBackend('cpu')
  await tf.ready()
}

/**
 * 把 Controller 上三處硬綁 WebGL 的地方換掉（見檔頭）。
 *
 * ⚠️ 要在 `new Controller()` 之後、`useCpu()` 之前呼叫（這時還在 webgl，
 *    才能把建構式配出來的那張貼圖收掉）。
 * ⚠️ `controller.tracker` 這時還不存在（它在 `addImageTargets` 裡才建立，
 *    controller.js 第 98 行），所以光流那一段要另外用
 *    `disableOpticalFlow()` 在載完目標之後補。
 */
export function patchInputLoader(controller, tf) {
  const { inputWidth: W, inputHeight: H } = controller
  const old = controller.inputLoader

  // 建構式配了一張 PIXELS 用途的貼圖，換掉之後就沒人會用它了。
  // 收不掉也不是致命問題（一張 W×H 的 float32 貼圖），所以整段吞掉例外。
  try { tf.backend().disposeData?.(old.tempPixelHandle.dataId) } catch { /* ignore */ }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('取不到 2D context')

  controller.inputLoader = {
    /**
     * 與上游 `InputLoader.loadInput` 逐項對應，只差最後一步改用後端無關的 op。
     * 回傳 shape [H, W]、值域 0~255 的 float32 —— 與 shader 版的契約一致
     * （Detector 的 Laplacian 門檻 3.0 是按這個值域訂的，弄錯會讓特徵點
     *   要嘛滿天都是、要嘛一個都沒有）。
     */
    loadInput(input) {
      ctx.clearRect(0, 0, W, H)
      // ★ 與上游最大的差別：這裡是**縮放填滿**（`drawImage(input, 0, 0, W, H)`），
      //   上游是 1:1 貼上。因為 CPU 路徑刻意把輸入降到 CPU_PIXEL_BUDGET，
      //   照抄上游的畫法會變成**裁切**——只送畫面左上角那一塊進偵測器，
      //   而卡片幾乎一定在中間 ⇒ 永遠掃不到，且畫面上完全看不出來。
      //
      // ⚠️ 這裡讀 `input.width/height`（**內容屬性**）不是 videoWidth——
      //    camera.js 的 attach() 會把那兩個屬性設好；沒設就是 0，
      //    `drawImage` 會畫出一張 0×0 的黑畫布而且完全不會報錯（見 CLAUDE.md）。
      //    所以先擋掉，讓它變成看得見的錯誤而不是「永遠掃不到」。
      if (!input.width || !input.height) throw new Error('影像來源沒有 width/height 屬性')
      // ⚠️ 上游那個「輸入被轉 90 度」的分支這裡刻意不做：Controller 的尺寸是
      //    由 video 尺寸**等比例**推出來的（cpuInputSize），長寬比必定相同，
      //    轉置的情況不可能發生。與其留一段沒被走過的旋轉程式碼，不如不留。
      ctx.drawImage(input, 0, 0, W, H)
      return tf.tidy(() => {
        // ★ `mean(2)` ＝ (r+g+b)/3 ＝ **編譯 .mind 時用的那個灰階公式**
        //   （compiler-base.js）。這是上游自己留著的 `_loadInput` 寫法。
        const px = tf.browser.fromPixels(canvas, 3)
        return px.mean(2)
      })
    },
  }
}

/**
 * 停用光流追蹤（`Tracker` 只有 WebGL 實作）。
 *
 * ⚠️ 必須在 `addImageTargets()` **之後**呼叫——`controller.tracker` 到那時才存在。
 *
 * 迴圈會因此退化成「每一輪重新偵測＋比對」，這對本站的動線剛好是對的：
 * 認出一次就跳頁，本來就不需要連續追蹤。上游對 `_trackAndUpdate` 回傳 null
 * 的處理是把 `isTracking` 設回 false（controller.js 第 218–220 行），
 * 所以這是它預期內的分支。
 */
export function disableOpticalFlow(controller) {
  if (controller.tracker) controller.tracker.dummyRun = () => {}
  controller._trackAndUpdate = async () => null
}
