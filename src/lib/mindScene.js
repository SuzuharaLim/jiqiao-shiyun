// ============================================================================
// AR 場景層 —— MindAR 官方 three.js 整合（MindARThree）
//
// 依 https://hiukim.github.io/mind-ar-js-doc/more-examples/threejs-image
// 走**官方文件的做法**：把 video／WebGLRenderer／PerspectiveCamera／anchor 變換
// 全部交給 MindARThree，我們只負責「把東西掛到 anchor.group 上」。
//
// ★ 為什麼換掉自己接的那一版：
//   先前是自己拿 Controller 的 worldMatrix 回推卡片四角 → 解 homography →
//   用 CSS matrix3d 貼一層 DOM，3D 角色再開**另一個** WebGL canvas 疊上去。
//   那條路每一個換算都是「貼歪但不報錯」的候選，而且兩個 canvas 各自為政。
//   官方路徑只有一個 renderer、一個相機、一個 anchor，角色就在被追蹤的座標系裡。
//
// ⚠️ MindARThree 會**自己呼叫 getUserMedia 並自己建立 <video>**，塞在 container
//    裡（z-index:-2）。所以呼叫端**不可以**再自己開一路相機——兩個 stream 同時
//    抓後鏡頭在部分 Android 上會直接失敗，而且白吃一份電。
//    ⚠️ 但「避開超廣角」那層仍然保得住：建構子吃 `environmentDeviceId`，
//       把 arCamera 猜到的 deviceId 傳進去即可（猜不到就傳 null 走 facingMode）。
//
// ⚠️ anchor.group 的**區域座標系**（由 MindARThree 的 postMatrix 決定，
//    讀 node_modules/mind-ar/src/image-target/three.js 第 216–230 行確認的，不是猜的）：
//      postMatrix: position = (W/2, H/2)、scale = W   ← 注意 position.y 化簡後就是 H/2
//      所以 區域(x,y,z) → 目標圖像素(W·x + W/2, W·y + H/2, W·z)
//    ⇒ 卡片寬度恆為 **1.0** 個單位、高度為 H/W，中心在原點，卡面是 z=0 平面。
//    ⇒ 卡面 UV(u,v)（原點左上、v 向下）對應 區域(u − 0.5, (v − 0.5)·H/W, 0)
//       **前提是區域 +y 在卡面上朝下**——這一點與「離開紙面是 +z 還是 −z」
//       都由 CALIB 決定，而 CALIB 是**量出來的**，見下方註解與 check-mind。
// ============================================================================

import {
  Box3, Vector2, Vector3, Group, Raycaster, PlaneGeometry, MeshBasicMaterial, Mesh,
  HemisphereLight, DirectionalLight, Color, PCFShadowMap, NeutralToneMapping,
} from 'three'
import { buildCharacter, NAPA_CABBAGE } from './char/factory.js'
import { createActor } from './char/actor.js'
import { hitTest, makeHotspotLatch } from './arHotspot.js'

// ── 座標約定（**實測值，不可憑直覺改**）──────────────────────────────
//
// 這兩個常數決定角色是站在卡片上、還是陷進桌子裡／上下顛倒。
// 量法：start() 之後把 anchor 區域座標的幾個已知點投影到螢幕與相機空間比較。
// 量到的結果寫在 check-mind.mjs，改動前請先重跑那支。
export const CALIB = {
  // 卡面 v（0=上緣、1=下緣）對應區域 y 的方向。
  //
  // ★★ **是 −1 不是 +1**，而且「照 postMatrix 推」會推錯：
  //    postMatrix 是 `區域y → 像素y = W·y + H/2`，而像素 y 在圖上朝下，
  //    所以直覺會得到 +1。**但 worldMatrix 自己還帶一次上下翻轉**
  //    （這也正是 cornersFromWorldMatrix 那邊「不可再翻 y」的同一件事），
  //    兩者相乘之後 區域 +y 在螢幕上其實**朝上**。
  //    實測（1280×960、卡片佔 55%、畫在 288..992 × 223..736）：
  //      vSign=+1 → 白菜熱區中心算到 (387, 550)，真值 (384, 416)：x 準、y 鏡像
  //      vSign=−1 → (387, 410) 對上真值
  //    ⚠️ 症狀依舊是「角色不會消失、大小也對，只是站錯地方」——正對卡片時
  //       很難看出來，所以這個值只能量、不能推。
  vSign: -1,
  // 離開紙面（朝向觀看者）的區域軸向。角色的 +Y 要轉到這個方向上。
  // 實測：區域 +z 的點在相機空間裡比原點更靠近相機 ⇒ +z 離開紙面。
  outAxis: +1,
}

const prefersReduce = () => typeof matchMedia !== 'undefined'
  && matchMedia('(prefers-reduced-motion: reduce)').matches

/** 卡面 UV → anchor 區域座標。`hw` 是卡片高寬比（H/W）。 */
export function uvToLocal(u, v, hw) {
  return [u - 0.5, CALIB.vSign * (v - 0.5) * hw, 0]
}

/** anchor 區域座標 → 卡面 UV（uvToLocal 的反函式，給 raycast 的結果用）。 */
export function localToUv(x, y, hw) {
  return [x + 0.5, (CALIB.vSign * y) / hw + 0.5]
}

/**
 * 建立 AR 場景。
 *
 * @param container   MindARThree 要接管的容器（**必須**是 position:relative 且有明確大小）
 * @param mindUrl     `.mind` 目標檔
 * @param card        卡片定義（要 hotspots；用來決定角色站哪裡與熱區命中）
 * @param deviceId    後鏡頭的 deviceId（避開超廣角用；null＝交給 facingMode）
 * @param onFound/onLost  追到／追丟（給呼叫端更新提示文案）
 * @param onHotspot   命中的熱區變了（已走過遲滯），參數是 hotspot 或 null
 */
export async function createMindScene({
  container, mindUrl, card, deviceId = null,
  lod = 0.6, outlineLayers = 1,
  onFound, onLost, onHotspot,
} = {}) {
  // ⚠️ 用專案內的 MindARThree（`./mindarThree.js`）而不是
  //    `mind-ar/dist/mindar-image-three.prod.js`——後者 import 了 three 0.185
  //    已移除的 `sRGBEncoding`，直接用會**建置失敗**。那一支是官方實作的逐字移植，
  //    只改了色彩空間 API、Controller 的取得方式，並補上 dispose()。詳見其檔頭。
  const { MindARThree } = await import('./mindarThree.js')
  if (!MindARThree) throw new Error('MindARThree 載入失敗')

  const mindar = new MindARThree({
    container,
    imageTargetSrc: mindUrl,
    maxTrack: 1,
    // ⚠️ 三個內建 UI 全關：MindAR 的 loading／scanning 覆蓋層是它自己的視覺語言
    //    （置中的掃描框動畫），與本站的紙感介面對不上，而且會蓋住我們自己的提示。
    uiLoading: 'no', uiScanning: 'no', uiError: 'no',
    environmentDeviceId: deviceId || null,
  })

  const { renderer, scene, camera } = mindar
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap       // PCFSoftShadowMap 在 three 0.185 已棄用
  renderer.toneMapping = NeutralToneMapping
  renderer.toneMappingExposure = 0.95

  // 賽璐璐怕多光源疊出多重明暗交界 → 主光獨大，補光壓很低（沿用 ProduceStage 的配置）
  const hemi = new HemisphereLight(new Color('#FFF6EC'), new Color('#8E96D6'), 1.55)
  const key = new DirectionalLight(new Color('#FFF6EA'), 2.30)
  key.position.set(-2.4, 3.4, 2.6)
  const fill = new DirectionalLight(new Color('#CFE0FF'), 0.30); fill.position.set(2.8, 1.2, 2.2)
  const rim = new DirectionalLight(new Color('#FFE6F0'), 0.45); rim.position.set(0.6, 3.0, -3.4)
  scene.add(hemi, key, fill, rim)

  const anchor = mindar.addAnchor(0)

  // ── 啟動（MindARThree 會開相機、建 controller、載 .mind、暖機、開始處理）──
  await mindar.start()

  // ★★ 拿到權限之後才重新挑鏡頭：授權前 enumerateDevices 的 label 是空的，
  //    猜不出主鏡頭，只能退回 facingMode——而那在多鏡頭手機上可能選到超廣角。
  //    超廣角的桶狀畸變實測會讓辨識率掉到 0%，症狀正是「對得很準卻認不出來」。
  try {
    const { pickMainCameraId } = await import('./arCamera.js')
    await mindar.retuneCamera(pickMainCameraId)
  } catch { /* 換不成就沿用原本那顆 */ }

  // ⚠️ 卡片尺寸只能在 start() 之後拿：postMatrixs 是 _startAR 裡才建的。
  //    position.x = W/2、position.y = H/2（化簡後），所以反推得到 W 與 H。
  const pm = mindar.postMatrixs?.[0]
  let hw = 1
  if (pm) {
    const p = new Vector3(); p.setFromMatrixPosition(pm)
    if (p.x > 0 && p.y > 0) hw = p.y / p.x        // (H/2) / (W/2) = H/W
  }

  // ── 卡面代理平面：只用來做熱區的 raycast，不畫出來 ──
  // ⚠️ 用 three 自己的 Raycaster 取 uv，**不要**再手寫一次 homography：
  //    那正是上一版「貼歪但不報錯」的來源，而這裡函式庫已經把變換算好了。
  const planeGeo = new PlaneGeometry(1, hw)
  const planeMat = new MeshBasicMaterial({ visible: false })
  const cardPlane = new Mesh(planeGeo, planeMat)
  anchor.group.add(cardPlane)

  // ── 角色 ──
  const primary = card?.hotspots?.find(h => h.primary) ?? card?.hotspots?.[0] ?? null
  const pivot = new Group()
  anchor.group.add(pivot)

  const char = buildCharacter(NAPA_CABBAGE, { lod, outlineLayers })
  // 角色是 Y 軸朝上建的；卡面是 z=0 平面，離開紙面的方向是 CALIB.outAxis。
  // 繞 X 轉 +90° 會把 +Y 轉到 +Z（實測確認，見 check-mind）。
  char.root.rotation.x = CALIB.outAxis * Math.PI / 2
  pivot.add(char.root)

  // 依包圍盒把角色縮到「卡片寬度的 32%」高——不可寫死縮放值：
  // 角色幾何改版（葉片層數／高度）時寫死的值會讓它突然變成兩倍大。
  {
    const box = new Box3().setFromObject(char.root)
    const size = new Vector3(); box.getSize(size)
    const tall = Math.max(size.x, size.y, size.z) || 1
    const s = 0.32 / tall
    pivot.scale.setScalar(s)
  }
  if (primary) {
    const [lx, ly] = uvToLocal(
      primary.rect.x + primary.rect.w / 2,
      primary.rect.y + primary.rect.h / 2,
      hw,
    )
    pivot.position.set(lx, ly, 0)
  }

  const actor = createActor(char, { action: 'present', reduceMotion: prefersReduce() })

  // ── 追到／追丟 ──
  anchor.onTargetFound = () => { onFound?.() }
  anchor.onTargetLost = () => {
    latch.reset()
    lastHotspotId = null
    onHotspot?.(null)
    onLost?.()
  }

  // ── 熱區：從畫面正中心往場景射一條線，打到卡面代理平面就拿 uv ──
  // ⚠️ 一定要走遲滯（進入 3 幀／離開 8 幀）：追蹤每秒十幾次、邊界附近會高頻跳動，
  //    而開關內容面板是最貴的操作。
  const latch = makeHotspotLatch()
  const ray = new Raycaster()
  const centre = new Vector2(0, 0)
  let lastHotspotId = null
  // 手動點選之後暫停中心瞄準多久（見 forceHotspot）
  const MANUAL_HOLD_MS = 4000
  let manualUntil = 0

  const pollHotspot = () => {
    if (performance.now() < manualUntil) return
    if (!anchor.visible || !card?.hotspots?.length) return
    ray.setFromCamera(centre, camera)
    const hit = ray.intersectObject(cardPlane, false)[0]
    let id = null
    if (hit?.point) {
      // ⚠️ 用世界座標換回區域座標，不要直接吃 hit.uv：
      //    PlaneGeometry 的 uv 原點在左下、v 向上，與卡面 UV（左上、v 向下）
      //    差一個翻轉，而那個翻轉還要再乘 CALIB.vSign——兩層符號疊在一起
      //    最容易寫反。走區域座標只需要 localToUv 一個已驗證的換算。
      const local = cardPlane.worldToLocal(hit.point.clone())
      const [u, v] = localToUv(local.x, local.y, hw)
      id = hitTest(card.hotspots, u, v)?.id ?? null
    }
    const out = latch.push(id)
    if (out.changed && out.id !== lastHotspotId) {
      lastHotspotId = out.id
      onHotspot?.(out.id ? card.hotspots.find(h => h.id === out.id) ?? null : null)
    }
  }

  // ── 算繪迴圈（官方寫法：renderer.setAnimationLoop）──
  // ⚠️ 熱區不必每幀算：raycast 便宜但 setState 不便宜，節流到約 10 次/秒。
  let last = performance.now()
  let nextPoll = 0
  renderer.setAnimationLoop((now) => {
    const t = now ?? performance.now()
    actor.update(Math.min(t - last, 100))    // 分頁回前景時不讓動作一次跳好幾秒
    last = t
    if (t >= nextPoll) { nextPoll = t + 100; pollHotspot() }
    renderer.render(scene, camera)
  })

  return {
    mindar, anchor, hw, char, actor,
    setAction: (a) => actor.setAction(a),
    /**
     * 處理迴圈跑了幾輪。**恆為 0 代表比對根本沒在跑**，而不是「沒對準」。
     * ⚠️ 這是把一個靜默失敗變成可觀測事實的唯一鉤子——CSP 擋掉 blob: worker 時，
     *    相機、畫面、掃描線、.mind 載入全部正常，只有這個數字是 0。
     */
    ticks: () => mindar.tickCount ?? 0,
    /**
     * 使用者直接點卡面上的物件 → 回傳那個熱區。
     * ⚠️ 這條路不可省：白菜在卡片最左（x 0.058~0.214），要讓它落在畫面正中心
     *    就得把整張卡擺到畫面右側又不能出框——實務上做不到。手指點它才是自然動作。
     */
    pick(clientX, clientY) {
      if (!anchor.visible || !card?.hotspots?.length) return null
      const r = renderer.domElement.getBoundingClientRect()
      if (!r.width || !r.height) return null
      const nx = ((clientX - r.left) / r.width) * 2 - 1
      const ny = -((clientY - r.top) / r.height) * 2 + 1
      ray.setFromCamera(new Vector2(nx, ny), camera)
      const hit = ray.intersectObject(cardPlane, false)[0]
      if (!hit?.point) return null
      const local = cardPlane.worldToLocal(hit.point.clone())
      const [u, v] = localToUv(local.x, local.y, hw)
      return hitTest(card.hotspots, u, v)
    },
    /**
     * 手動選取。
     * ⚠️ 只 reset 遲滯是不夠的：下一輪輪詢又會把「畫面中心那一區」推進去，
     *    三幀之後（約 0.3 秒）就把使用者剛點的蓋掉——使用者會覺得「點了會跳回去」。
     *    所以要**暫停中心瞄準一段時間**，讓手動選取真的撐得住。
     */
    forceHotspot(hs) {
      latch.reset()
      lastHotspotId = hs?.id ?? null
      manualUntil = performance.now() + MANUAL_HOLD_MS
      onHotspot?.(hs ?? null)
    },
    /**
     * ★★★ 自我測試：用**內建的卡面圖**餵給這台裝置的辨識流程。
     *
     * 為什麼需要：使用者回報「掃不到」時，光看畫面分不出三種完全不同的原因——
     *   ① 這台裝置根本跑不起辨識（WebGL／Worker／效能）
     *   ② 辨識正常，但**相機拍到的畫面**不夠好（光線、距離、對焦、反光）
     *   ③ 印出來的卡片與目標圖不是同一版
     * 這個測試把 ① 單獨切出來：把一張「保證正確」的畫面接到同一條管線上，
     * 成功＝管線沒問題，問題在 ② 或 ③；失敗＝問題在這台裝置本身。
     *
     * ⚠️ 做法是暫時把 video 的 srcObject 換成 canvas 串流再換回來——
     *    Controller 是**持續**從 video 元素讀取的，換 srcObject 就等於換輸入源，
     *    不需要重建整個場景（重建會重新要相機權限，在 iOS 上很容易失敗）。
     */
    async selfTest({ seconds = 8 } = {}) {
      const v = mindar.video
      if (!v || !card?.target) return { ok: false, reason: 'no-video' }
      const orig = v.srcObject
      let timer = 0
      try {
        const img = await new Promise((res, rej) => {
          const i = new Image()
          i.onload = () => res(i); i.onerror = () => rej(new Error('poster'))
          i.src = card.target
        })
        const cvs = document.createElement('canvas')
        cvs.width = v.videoWidth || 1280
        cvs.height = v.videoHeight || 960
        const ctx = cvs.getContext('2d')
        let n = 0
        const draw = () => {
          ctx.fillStyle = '#8a8a8a'; ctx.fillRect(0, 0, cvs.width, cvs.height)
          const w = cvs.width * 0.55, h = w * (img.height / img.width)
          // ⚠️ 要有微幅位移：MindAR 的偵測走 detectMoving，完全靜止不是它預期的輸入
          ctx.drawImage(img, (cvs.width - w) / 2 + Math.sin(n / 12) * 4,
            (cvs.height - h) / 2 + Math.cos(n / 15) * 4, w, h)
          n++
        }
        draw()
        timer = setInterval(draw, 33)
        v.srcObject = cvs.captureStream(30)
        await v.play().catch(() => {})

        const t0 = performance.now()
        while (performance.now() - t0 < seconds * 1000) {
          if (anchor.visible) return { ok: true, ms: Math.round(performance.now() - t0) }
          await new Promise(r => setTimeout(r, 120))
        }
        return { ok: false, ms: seconds * 1000, reason: 'timeout' }
      } catch (e) {
        return { ok: false, reason: e?.message || 'error' }
      } finally {
        if (timer) clearInterval(timer)
        // ⚠️ 一定要把相機接回去，否則測完之後畫面就凍在那張圖上
        try { v.srcObject = orig; await v.play().catch(() => {}) } catch { /* ignore */ }
      }
    },
    /** 給測試用：直接問「卡面 UV 落在哪個熱區」。 */
    _hotspotAtUv: (u, v) => hitTest(card?.hotspots ?? [], u, v),
    dispose() {
      try { renderer.setAnimationLoop(null) } catch { /* ignore */ }
      try { char.dispose?.() } catch { /* ignore */ }
      planeGeo.dispose(); planeMat.dispose()
      for (const l of [hemi, key, fill, rim]) l.dispose?.()
      // ⚠️ mindar.dispose() 會停 controller、**關掉相機軌道**、移除 <video>、
      //    釋放 WebGL context 並拆掉 resize 監聽。少了它離開這一頁之後
      //    相機指示燈還亮著，而且反覆進出會拿不到新的 context。
      try { mindar.dispose() } catch { /* ignore */ }
    },
  }
}
