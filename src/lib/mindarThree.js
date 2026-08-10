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
      this.video.style.zIndex = '-2'
      this.container.appendChild(this.video)

      if (!navigator.mediaDevices?.getUserMedia) {
        reject(new Error('這個瀏覽器不支援相機'))
        return
      }

      const constraints = { audio: false, video: {} }
      if (this.shouldFaceUser) {
        if (this.userDeviceId) constraints.video.deviceId = { exact: this.userDeviceId }
        else constraints.video.facingMode = 'user'
      } else {
        // ⚠️ 這裡就是「避開超廣角」接回來的地方：arCamera 猜到的 deviceId 傳進來
        //    就用它，猜不到（未授權時 label 是空字串）就退回 facingMode。
        if (this.environmentDeviceId) constraints.video.deviceId = { exact: this.environmentDeviceId }
        else constraints.video.facingMode = 'environment'
      }

      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        this.video.addEventListener('loadedmetadata', () => {
          this.video.setAttribute('width', this.video.videoWidth)
          this.video.setAttribute('height', this.video.videoHeight)
          resolve()
        })
        this.video.srcObject = stream
      }).catch(reject)
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
