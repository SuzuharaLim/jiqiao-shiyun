// ============================================================================
// MindARThree —— 取自 MindAR 官方實作，改到能對 three 0.185 編譯
//
// 來源：node_modules/mind-ar/src/image-target/three.js（mind-ar 1.2.5，MIT）
// 官方文件：https://hiukim.github.io/mind-ar-js-doc/more-examples/threejs-image
//
// ★ 為什麼不直接用官方的 `mind-ar/dist/mindar-image-three.prod.js`：
//   那份預編譯 bundle 的第一行是
//       import { ..., sRGBEncoding as Si, ... } from "three"
//   而 **`sRGBEncoding` 在 three 0.185 已經被移除**（r152 起棄用，之後刪掉，
//   改用 `SRGBColorSpace` ＋ `renderer.outputColorSpace`）。
//   本專案用 three 0.185.1，直接 import 會**建置失敗**：
//       ERROR: No matching export in "three/build/three.module.js"
//              for import "sRGBEncoding"
//   ⚠️ 降版 three 不是選項：角色層用了 `NeutralToneMapping`（r165 之後才有），
//      降到官方文件示範的 0.160 會把那一層打壞。
//   所以把官方那 120 行收進來、只改不相容的地方。**演算法與座標約定一行未改**，
//   換的只有色彩空間 API、Controller 的取得方式，以及補上 dispose()。
//
// 與原版的差異（逐項列出，方便日後對照上游更新）：
//   1. `renderer.outputEncoding = sRGBEncoding` → `renderer.outputColorSpace = SRGBColorSpace`
//   2. `Controller` 改從 `mind-ar/dist/mindar-image.prod.js` 取（那支只匯出
//      Controller/Compiler/UI，不碰 three，所以沒有上面那個相容問題）
//   3. **移除 CSS3DRenderer／cssScene／addCSSAnchor**：本站不用 CSS anchor，
//      留著等於白背一個 renderer 與一份 three/addons 相依
//   4. **移除內建 UI**（loading／scanning／error 覆蓋層）：本站有自己的提示，
//      原版那三個是它自己的視覺語言，會蓋住我們的畫面
//   5. 補 `dispose()`：原版只有 stop()，沒有釋放 WebGL context 的路徑，
//      而 SPA 反覆進出這一頁不釋放的症狀是「第 N 次打開變成空白」
//   6. `stop()` 加防呆：start() 失敗時 `this.video.srcObject` 是 null，
//      原版會在那裡丟 TypeError 把真正的錯誤蓋掉
// ============================================================================

import { Matrix4, Vector3, Quaternion, Scene, WebGLRenderer, PerspectiveCamera, Group, SRGBColorSpace } from 'three'
// ★★ 同源 worker（見 _useSameOriginWorker 的說明）。
// ⚠️ 是 `?worker` **不是** `?worker&inline`：inline 會把 worker 內嵌成 blob，
//    那正是 CSP 要 `worker-src blob:` 的原因。不加 inline 時 Vite 會產出一個
//    **同源的 .js 檔**，`script-src 'self'` 本來就允許。
import ControllerWorker from 'mind-ar/src/image-target/controller.worker.js?worker'

const invisibleMatrix = new Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)

export class MindARThree {
  constructor({
    container, imageTargetSrc, maxTrack,
    filterMinCF = null, filterBeta = null, warmupTolerance = null, missTolerance = null,
    environmentDeviceId = null, userDeviceId = null,
  }) {
    this.container = container
    this.imageTargetSrc = imageTargetSrc
    this.maxTrack = maxTrack
    this.filterMinCF = filterMinCF
    this.filterBeta = filterBeta
    this.warmupTolerance = warmupTolerance
    this.missTolerance = missTolerance
    this.environmentDeviceId = environmentDeviceId
    this.userDeviceId = userDeviceId
    this.shouldFaceUser = false
    // ★ 處理迴圈的心跳。呼叫端用它判斷「相機開了、但比對根本沒在跑」——
    //   那正是 CSP 擋掉 blob: worker 時的樣子（畫面完全正常，只是永遠不命中）。
    this.tickCount = 0

    this.scene = new Scene()
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.outputColorSpace = SRGBColorSpace     // ← 原版是 outputEncoding = sRGBEncoding
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.camera = new PerspectiveCamera()
    this.anchors = []

    this.renderer.domElement.style.position = 'absolute'
    // ★★★ 疊層順序必須**明寫**，不可沿用原版的隱含順序。見 _startVideo 的說明。
    this.renderer.domElement.style.zIndex = '1'      // 3D 疊在影像之上
    this.container.appendChild(this.renderer.domElement)

    this._onResize = this.resize.bind(this)
    window.addEventListener('resize', this._onResize)
  }

  async start() {
    await this._startVideo()
    await this._startAR()
  }

  stop() {
    try { this.controller?.stopProcessVideo() } catch { /* 還沒開始 */ }
    // ⚠️ start() 失敗時 srcObject 是 null；原版沒防這一層，會丟 TypeError
    //    把真正的錯誤（多半是權限被拒）蓋掉。
    const stream = this.video?.srcObject
    if (stream?.getTracks) for (const t of stream.getTracks()) t.stop()
    this.video?.remove()
  }

  addAnchor(targetIndex) {
    const group = new Group()
    group.visible = false
    group.matrixAutoUpdate = false
    const anchor = { group, targetIndex, onTargetFound: null, onTargetLost: null, onTargetUpdate: null, visible: false }
    this.anchors.push(anchor)
    this.scene.add(group)
    return anchor
  }

  _startVideo() {
    return new Promise((resolve, reject) => {
      this.video = document.createElement('video')
      this.video.setAttribute('autoplay', '')
      this.video.setAttribute('muted', '')
      this.video.setAttribute('playsinline', '')
      this.video.style.position = 'absolute'
      this.video.style.top = '0px'
      this.video.style.left = '0px'
      // ★★★ 原版是 `z-index: -2`，**在本站會讓取景畫面全黑**，必須改成 0。
      //
      // ⚠️ 依 CSS 繪製順序，負 z-index 的定位子元素畫在「第 2 步」，而
      //    `.scan-stage` 是 `position:relative; z-index:auto`（不建立堆疊脈絡），
      //    所以它自己畫在祖先脈絡的「第 6 步」——**它的深色背景
      //    （--cam-bg-deep #0C0A08）會整片蓋在 video 上面**。
      //    官方範例的容器沒有背景色，所以踩不到；本站的取景框有。
      // ⚠️ 這個 bug 特別難發現：**追蹤完全不需要 video 被看見**
      //    （MindAR 是直接讀 video 元素的像素，不是讀螢幕上畫出來的結果），
      //    所以「已對準」「熱區命中」「3D 有在算繪」全部量得到，畫面卻是黑的。
      //    ——驗 AR 不能只驗數字，一定要真的看畫面。
      // ⚠️ 也不可只把 `.scan-stage` 的背景拿掉：那是相機還沒開起來時的底色。
      //
      // ★ 實測（用瀏覽器自己的命中測試，它依循的正是繪製順序）：
      //   在取景框正中心呼叫 document.elementFromPoint，並暫時隱藏 3D canvas——
      //     z-index: 0  → 最上層是 **VIDEO**
      //     z-index: -2 → 最上層是 **DIV.scan-stage**   ← 影像掉到容器底下
      //   也就是 -2 時 video 確實被容器（背景 #0C0A08）蓋住＝黑畫面。
      this.video.style.zIndex = '0'
      this.container.appendChild(this.video)

      if (!navigator.mediaDevices?.getUserMedia) {
        reject(new Error('這個瀏覽器不支援相機'))
        return
      }

      // ★★★ 解析度必須明講——**原版沒有指定，這是 AR 掃不到的高機率主因**。
      //
      // ⚠️ 只給 `facingMode` 的話，行動瀏覽器預設回 **640×480**（本專案在相機工作室
      //    那邊已經踩過同一個坑並記在 CLAUDE.md）。640×480 下，卡片就算佔滿半個畫面
      //    也只有約 320px 寬——MindAR 要在上面找出足以比對的特徵點非常吃力，
      //    症狀就是「對得很準卻一直認不出來」。
      // ⚠️ 一定要用 `ideal` **不可用 `exact`**：exact 在裝置不支援該解析度時會直接
      //    丟 OverconstrainedError，結果是**整個相機開不起來**（黑畫面），
      //    比解析度低得多還糟。ideal 由瀏覽器夾到該裝置能給的最接近值。
      // ⚠️ 也不要開到 4K：MindAR 每幀都要把整張影像送進 TFJS，解析度愈高愈可能掉幀，
      //    而追蹤靠的是「每秒能處理幾幀」。1280×960 是偵測品質與幀率的平衡點
      //    （離線量測就是用這個尺寸，12/12）。
      const RES = { width: { ideal: 1280 }, height: { ideal: 960 } }
      const constraints = { audio: false, video: { ...RES } }
      if (this.shouldFaceUser) {
        if (this.userDeviceId) constraints.video.deviceId = { exact: this.userDeviceId }
        else constraints.video.facingMode = 'user'
      } else {
        // ⚠️ 這裡就是「避開超廣角」接回來的地方：arCamera 猜到的 deviceId 傳進來
        //    就用它，猜不到（未授權時 label 是空字串）就退回 facingMode。
        if (this.environmentDeviceId) constraints.video.deviceId = { exact: this.environmentDeviceId }
        else constraints.video.facingMode = 'environment'
      }
      // 連續自動對焦：拿在手上的卡片距離一直在變，固定對焦會糊掉。
      // ⚠️ 放在 advanced 裡：不支援的瀏覽器會**忽略**它而不是整組拒絕。
      constraints.video.advanced = [{ focusMode: 'continuous' }]
      this._lastConstraints = constraints

      const attach = (stream) => {
        this.video.addEventListener('loadedmetadata', () => {
          this.video.setAttribute('width', this.video.videoWidth)
          this.video.setAttribute('height', this.video.videoHeight)
          resolve()
        })
        this.video.srcObject = stream
      }
      // ⚠️ 三層 fallback 缺一不可（本專案在 arCamera 已量過）：
      //    `deviceId: {exact}` 在該鏡頭被別的程式佔用時會**直接 reject**，
      //    那時若不退回 facingMode，使用者看到的就是「相機打不開」。
      navigator.mediaDevices.getUserMedia(constraints)
        .then(attach)
        .catch(() => {
          const relaxed = { audio: false, video: { ...RES, facingMode: this.shouldFaceUser ? 'user' : 'environment' } }
          return navigator.mediaDevices.getUserMedia(relaxed).then(attach)
        })
        .catch(() => navigator.mediaDevices.getUserMedia({ audio: false, video: true }).then(attach))
        .catch(reject)
    })
  }

  async _startAR() {
    const video = this.video
    // ⚠️ Controller 從 `mindar-image.prod.js` 取——那支不 import three，
    //    所以不會踩到 sRGBEncoding 的相容問題。
    const mod = await import('mind-ar/dist/mindar-image.prod.js')
    const Controller = mod.Controller ?? mod.default?.Controller
    if (!Controller) throw new Error('MindAR Controller 載入失敗')

    this.controller = new Controller({
      inputWidth: video.videoWidth,
      inputHeight: video.videoHeight,
      filterMinCF: this.filterMinCF,
      filterBeta: this.filterBeta,
      warmupTolerance: this.warmupTolerance,
      missTolerance: this.missTolerance,
      maxTrack: this.maxTrack,
      onUpdate: (data) => {
        this.tickCount++          // 心跳：processDone 與 updateMatrix 都算
        if (data.type !== 'updateMatrix') return
        const { targetIndex, worldMatrix } = data
        for (let i = 0; i < this.anchors.length; i++) {
          if (this.anchors[i].targetIndex !== targetIndex) continue
          this.anchors[i].group.visible = worldMatrix !== null
          if (worldMatrix !== null) {
            const m = new Matrix4()
            m.elements = [...worldMatrix]
            m.multiply(this.postMatrixs[targetIndex])
            this.anchors[i].group.matrix = m
          } else {
            this.anchors[i].group.matrix = invisibleMatrix
          }
          if (this.anchors[i].visible && worldMatrix === null) {
            this.anchors[i].visible = false
            this.anchors[i].onTargetLost?.()
          }
          if (!this.anchors[i].visible && worldMatrix !== null) {
            this.anchors[i].visible = true
            this.anchors[i].onTargetFound?.()
          }
          this.anchors[i].onTargetUpdate?.()
        }
      },
    })

    // ★★★ 把比對用的 worker 換成**同源**的，讓 AR 不再依賴 CSP 的 `worker-src blob:`。
    //
    // ⚠️ 一定要在 addImageTargets **之前**做：`setup` 訊息（含 matchingDataList）
    //    是在那支方法裡才 postMessage 的（controller.js 第 100 行）。
    //    換晚了，新 worker 收不到目標資料 → 永遠比對不出東西。
    this._useSameOriginWorker()

    this.resize()

    const { dimensions: imageTargetDimensions } = await this.controller.addImageTargets(this.imageTargetSrc)
    this.imageTargetDimensions = imageTargetDimensions

    // ⚠️ postMatrix 把 anchor 的區域座標換到「目標圖像素座標」：
    //    position = (W/2, W/2 + (H−W)/2) ＝ (W/2, H/2)、scale = W。
    //    ⇒ 卡片寬度恆為 1.0 個區域單位、高度 H/W、中心在原點。
    //    這段與原版**逐字相同**，不要「順手簡化」——mindScene 的 uvToLocal
    //    是照這個式子推的。
    this.postMatrixs = []
    for (let i = 0; i < imageTargetDimensions.length; i++) {
      const position = new Vector3()
      const quaternion = new Quaternion()
      const scale = new Vector3()
      const [markerWidth, markerHeight] = imageTargetDimensions[i]
      position.x = markerWidth / 2
      position.y = markerWidth / 2 + (markerHeight - markerWidth) / 2
      scale.x = markerWidth
      scale.y = markerWidth
      scale.z = markerWidth
      const postMatrix = new Matrix4()
      postMatrix.compose(position, quaternion, scale)
      this.postMatrixs.push(postMatrix)
    }

    // ⚠️ dummyRun 是必要的暖機（編譯 shader、配置 tensor）。少了它第一次偵測
    //    會卡住好幾百毫秒，症狀是「打開相機後畫面凍住一下」。
    await this.controller.dummyRun(this.video)
    this.controller.processVideo(this.video)
  }

  /**
   * ★★★ 用**同源** worker 取代 MindAR 內建的 blob worker。
   *
   * 病灶：mind-ar 的 controller.js 第 4 行是
   *     import ControllerWorker from "./controller.worker.js?worker&inline"
   * `inline` 讓 Vite 把 worker 內嵌成 **blob**，於是 CSP 必須放行
   * `worker-src blob:`。少了那一行 worker 被擋掉，比對的 Promise 永遠不 resolve
   * → **永遠掃不到，而畫面完全正常**（2026-08-10 的正式站事故）。
   *
   * 這裡改用 `?worker`（不 inline）→ Vite 產出一個**同源的 .js**，
   * `script-src 'self'` 本來就允許 ⇒ **AR 不再依賴伺服器的 CSP 設定**。
   * ⚠️ CSP 的 `workerSrc` 仍然保留（server/index.js），兩層一起才穩：
   *    這一層讓「設定漏了也能跑」，那一層讓「用回原版 blob worker 也能跑」。
   *
   * ⚠️ onmessage 的兩個分支要與原版逐字一致（controller.js 第 60–67 行）：
   *    `workerMatchDone` / `workerTrackDone` 是 Controller 內部的 callback，
   *    漏接任何一個都會讓對應的 Promise 永遠不 resolve——又是一個靜默死結。
   */
  _useSameOriginWorker() {
    const c = this.controller
    if (!c) return
    try {
      const w = new ControllerWorker()
      w.onmessage = (e) => {
        if (e.data.type === 'matchDone' && c.workerMatchDone !== null) c.workerMatchDone(e.data)
        if (e.data.type === 'trackUpdateDone' && c.workerTrackDone !== null) c.workerTrackDone(e.data)
      }
      // 內建那顆（可能已被 CSP 擋掉、也可能好好的）一律收掉，避免兩顆同時在跑
      try { c.worker?.terminate?.() } catch { /* 被擋掉的那顆本來就沒起來 */ }
      c.worker = w
      this.sameOriginWorker = true
    } catch (err) {
      // 換不成就沿用內建的 blob worker——那條路需要 CSP 放行 worker-src blob:
      console.warn('[AR] 同源 worker 建立失敗，沿用內建的 blob worker', err)
      this.sameOriginWorker = false
    }
  }

  /**
   * ★★ 取得權限**之後**才重新挑鏡頭——這是唯一能真正避開超廣角的時機。
   *
   * ⚠️ `enumerateDevices()` 在授權前 label 一律是空字串，所以第一次進來時
   *    `pickMainCameraId()` 猜不出東西，只能退回 `facingMode:'environment'`——
   *    而那在多鏡頭手機上**有機會選到超廣角**。超廣角的桶狀畸變沒有被 ISP 校正
   *    （k1 常在 −0.25~−0.4），實測 k1 −0.07 之後辨識率就掉到 **0%**，
   *    症狀是「對得很準卻怎麼都認不出來」——與這次回報的狀況一致。
   * ⚠️ 只換 `srcObject`，不重建 Controller：重建要重新要權限，iOS 上很容易失敗。
   * @returns 有沒有真的換過
   */
  async retuneCamera(pickMainCameraId) {
    try {
      if (this.shouldFaceUser || !navigator.mediaDevices?.enumerateDevices) return false
      const devices = await navigator.mediaDevices.enumerateDevices()
      const wanted = pickMainCameraId(devices)
      if (!wanted) return false
      const cur = this.video?.srcObject?.getVideoTracks?.()[0]
      if (!cur || cur.getSettings?.().deviceId === wanted) return false

      const next = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { deviceId: { exact: wanted }, width: { ideal: 1280 }, height: { ideal: 960 }, advanced: [{ focusMode: 'continuous' }] },
      })
      const old = this.video.srcObject
      this.video.srcObject = next
      await this.video.play().catch(() => {})
      try { old?.getTracks?.().forEach(t => t.stop()) } catch { /* ignore */ }
      // ⚠️ 換鏡頭後解析度可能不同 → 投影矩陣要跟著重算，否則模型會整個偏掉
      this.resize()
      return true
    } catch { return false }      // 換不成就沿用原本那顆，絕不可因此讓相機掛掉
  }

  /** 原版沒有這個。SPA 反覆進出這一頁不釋放 WebGL context 會「第 N 次變空白」。 */
  dispose() {
    window.removeEventListener('resize', this._onResize)
    this.stop()
    try { this.controller?.dispose?.() } catch { /* ignore */ }
    try { this.renderer.dispose(); this.renderer.forceContextLoss?.() } catch { /* ignore */ }
    try { this.renderer.domElement.remove() } catch { /* ignore */ }
  }

  resize() {
    const { renderer, camera, container, video } = this
    if (!video || !this.controller) return

    this.video.setAttribute('width', this.video.videoWidth)
    this.video.setAttribute('height', this.video.videoHeight)

    let vw, vh                                        // video 的顯示尺寸
    const videoRatio = video.videoWidth / video.videoHeight
    const containerRatio = container.clientWidth / container.clientHeight
    if (videoRatio > containerRatio) {
      vh = container.clientHeight
      vw = vh * videoRatio
    } else {
      vw = container.clientWidth
      vh = vw / videoRatio
    }

    const proj = this.controller.getProjectionMatrix()

    // 手機轉向時 video 的寬高會對調 —— 這段與原版相同
    const inputRatio = this.controller.inputWidth / this.controller.inputHeight
    let inputAdjust
    if (inputRatio > containerRatio) inputAdjust = this.video.width / this.controller.inputWidth
    else inputAdjust = this.video.height / this.controller.inputHeight

    let videoDisplayHeight
    if (inputRatio > containerRatio) {
      videoDisplayHeight = container.clientHeight * inputAdjust
    } else {
      const videoDisplayWidth = container.clientWidth
      videoDisplayHeight = videoDisplayWidth / this.controller.inputWidth * this.controller.inputHeight
      videoDisplayHeight *= inputAdjust
    }
    const fovAdjust = container.clientHeight / videoDisplayHeight

    camera.fov = 2 * Math.atan(1 / proj[5] * fovAdjust) * 180 / Math.PI    // 垂直 fov
    camera.near = proj[14] / (proj[10] - 1.0)
    camera.far = proj[14] / (proj[10] + 1.0)
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()

    video.style.top = (-(vh - container.clientHeight) / 2) + 'px'
    video.style.left = (-(vw - container.clientWidth) / 2) + 'px'
    video.style.width = vw + 'px'
    video.style.height = vh + 'px'

    const canvas = renderer.domElement
    canvas.style.position = 'absolute'
    canvas.style.left = 0
    canvas.style.top = 0
    canvas.style.width = container.clientWidth + 'px'
    canvas.style.height = container.clientHeight + 'px'
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
}
