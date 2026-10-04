import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PAGE_RATIO } from '../lib/calRender.js'

// ============================================================================
// 桌曆 3D 模型（2026-10-04）
//
// 三角帳篷式的底座（像參考圖）、頂端一排線圈、紙頁掛在頂端的鉸鏈上。
// 翻頁＝繞著頂端**往上翻過頂、落到背面**——真的桌曆就是這樣翻的。
//
// ★ 只有「目前這頁與前後各一頁」載入真的貼圖，其他頁是素色紙。
//   一頁一週是 52 頁，全部載入在中低階手機上會卡或直接失去 WebGL context。
// ★ 這個元件 **不知道** 設計資料怎麼排版：貼圖由父層的 getCanvas(i) 給，
//   與 2D 預覽、後台用的是同一支 drawPage（見 calRender.js 檔頭）。
// ⚠️ 必須 React.lazy 載入：three 不可進主 bundle（站規：AR 那邊量過，牽進來主 bundle 翻倍）。
// ⚠️ 卸載一定要 dispose ＋ forceContextLoss：行動裝置同時能存在的 WebGL context 有限，
//   反覆進出會在第 N 次變成一片空白（站規：3D 角色層踩過）。
// ============================================================================

const PW = 1.6, PH = PW * PAGE_RATIO          // 紙頁尺寸
const TILT = THREE.MathUtils.degToRad(15)     // 正面往後傾的角度
const FRONT = -TILT, BACK = -(Math.PI * 2 - TILT)
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function CalModel3D({ count, current, onFlip, getCanvas, baseColor, paperColor, version, label }) {
  const hostRef = useRef(null)
  const api = useRef(null)
  const cb = useRef({ onFlip, getCanvas })
  cb.current = { onFlip, getCanvas }

  // ── 建場景（只在頁數改變時重建）──
  useEffect(() => {
    const host = hostRef.current
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const cvs = renderer.domElement
    cvs.className = 'cal3d-canvas'
    cvs.setAttribute('role', 'img')
    cvs.setAttribute('tabindex', '0')
    host.appendChild(cvs)
    // 不給右鍵選單（「另存圖片」）——擋不住截圖，但不提供現成的下載路徑
    const noMenu = (e) => e.preventDefault()
    cvs.addEventListener('contextmenu', noMenu)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50)
    camera.position.set(1.5, 0.75, 3.6)
    const controls = new OrbitControls(camera, cvs)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 1.9
    controls.maxDistance = 6.5
    controls.minPolarAngle = THREE.MathUtils.degToRad(15)
    controls.maxPolarAngle = THREE.MathUtils.degToRad(100)
    controls.target.set(0, PH * 0.45, 0)

    scene.add(new THREE.HemisphereLight(0xfff8ee, 0x8a7f72, 1.25))
    const key = new THREE.DirectionalLight(0xffffff, 1.35)
    key.position.set(2.2, 3, 2.6)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.35)
    fill.position.set(-2.5, 1.2, -1.5)
    scene.add(fill)

    const disposables = []
    const track = (x) => { disposables.push(x); return x }
    const root = new THREE.Group()
    scene.add(root)

    // 鉸鏈在頂端；紙頁從鉸鏈往下掛
    // ⚠️ 鉸鏈高度要由「面板」長度算，不是紙頁：面板比紙頁長 0.1，
    //    用紙頁算的話面板底部會插進底板下面（側面看得一清二楚）。
    const PANEL_DOWN = PH + 0.1                       // 面板從鉸鏈往下延伸的長度
    const FOOT_T = 0.022                              // 底板厚度
    const apexY = PANEL_DOWN * Math.cos(TILT) + FOOT_T
    const standMat = track(new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.7, metalness: 0.02 }))
    const panelGeo = track(new THREE.BoxGeometry(PW + 0.14, PH + 0.12, 0.028))
    for (const ang of [FRONT, -FRONT]) {
      const pivot = new THREE.Group()
      pivot.position.set(0, apexY, 0)
      pivot.rotation.x = ang
      const m = new THREE.Mesh(panelGeo, standMat)
      // 面板在紙頁「後面」（相對於該面的外側）
      m.position.set(0, -(PH + 0.12) / 2 + 0.02, ang === FRONT ? -0.03 : 0.03)
      pivot.add(m)
      root.add(pivot)
    }
    // 底部的連接板（參考圖那種折起來的底座）
    const footDepth = 2 * PANEL_DOWN * Math.sin(TILT)
    const foot = new THREE.Mesh(track(new THREE.BoxGeometry(PW + 0.14, FOOT_T, footDepth + 0.06)), standMat)
    foot.position.set(0, FOOT_T / 2, 0)
    root.add(foot)

    // 線圈
    const ringMat = track(new THREE.MeshStandardMaterial({ color: 0xb9a26a, roughness: 0.35, metalness: 0.85 }))
    const ringGeo = track(new THREE.TorusGeometry(0.045, 0.0065, 8, 20))
    const rings = 16
    for (let i = 0; i < rings; i++) {
      const r = new THREE.Mesh(ringGeo, ringMat)
      r.rotation.y = Math.PI / 2
      r.position.set(-PW / 2 + 0.06 + (i * (PW - 0.12)) / (rings - 1), apexY + 0.005, 0)
      root.add(r)
    }

    // 紙頁
    const pageGeo = track(new THREE.PlaneGeometry(PW, PH))
    const pages = []
    for (let i = 0; i < count; i++) {
      const pivot = new THREE.Group()
      pivot.position.set(0, apexY, 0)
      // ⚠️ 正面用 MeshBasicMaterial（不受光影影響）：客人是看這一面判斷顏色的。
      //    用受光材質的話，頁面往後傾、背對主光，印上去的顏色整片發灰——
      //    3D 裡看到的顏色就跟 2D 預覽、跟我們後台收到的不一樣。立體感由底座、線圈、紙背負責。
      const front = new THREE.Mesh(pageGeo, track(new THREE.MeshBasicMaterial({ color: paperColor })))
      const back = new THREE.Mesh(pageGeo, track(new THREE.MeshStandardMaterial({ color: paperColor, roughness: 0.92 })))
      front.position.y = -PH / 2
      back.position.y = -PH / 2
      back.rotation.y = Math.PI
      pivot.add(front, back)
      root.add(pivot)
      pages.push({ pivot, front, back, angle: FRONT, tex: null })
    }

    let cur = 0
    const layout = () => {
      pages.forEach((p, i) => {
        // 疊放：還沒翻的越前面的越靠外；翻過去的越晚翻的越靠外
        const off = i >= cur ? (count - i) * 0.0016 : -(i + 1) * 0.0016
        p.front.position.z = off
        p.back.position.z = off - 0.0004
      })
    }

    const resize = () => {
      const w = host.clientWidth || 1, h = host.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // ⚠️ 距離要由長寬比**推導**，不可寫死（站規：AR 模型頁的 jq-fit 踩過同一個坑）。
      //    fov 是垂直視角，水平看得到多少取決於長寬比：直立手機寬度不夠，寫死的距離會切掉右邊。
      //    要放進的半寬約 1.2（桌曆半寬 0.87 ＋ 斜看時的透視與底座深度）。
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect
      const need = Math.max(1.2 / tanH, 0.95 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
      controls.maxDistance = Math.max(6.5, need * 1.6)
      camera.position.sub(controls.target).setLength(need).add(controls.target)
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
    ro?.observe(host)
    window.addEventListener('resize', resize)

    // 點一下（不是拖曳）＝翻下一頁；方向鍵翻前後頁
    let down = null
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY } }
    const onUp = (e) => {
      if (!down) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      down = null
      if (moved < 6) cb.current.onFlip?.(1)
    }
    const onKey = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); cb.current.onFlip?.(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); cb.current.onFlip?.(-1) }
    }
    cvs.addEventListener('pointerdown', onDown)
    cvs.addEventListener('pointerup', onUp)
    cvs.addEventListener('keydown', onKey)

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const instant = reduceMotion()
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i]
        const target = i < cur ? BACK : FRONT
        const d = target - p.angle
        p.angle = instant || Math.abs(d) < 0.002 ? target : p.angle + d * 0.14
        p.pivot.rotation.x = p.angle
      }
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    api.current = {
      setCurrent(n) { cur = n; layout() },
      setTexture(i, canvas) {
        const p = pages[i]; if (!p) return
        if (p.tex) p.tex.dispose()
        p.tex = null
        p.front.material.map = null
        if (canvas) {
          const t = new THREE.CanvasTexture(canvas)
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
          p.tex = t
          p.front.material.map = t
          p.front.material.color.set(0xffffff)
        } else {
          p.front.material.color.set(paperColor)
        }
        p.front.material.needsUpdate = true
      },
      setColors(base, paper) {
        standMat.color.set(base)
        pages.forEach(p => { p.back.material.color.set(paper); if (!p.tex) p.front.material.color.set(paper) })
      },
      loaded: new Set(),
    }
    layout()

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', resize)
      cvs.removeEventListener('pointerdown', onDown)
      cvs.removeEventListener('pointerup', onUp)
      cvs.removeEventListener('keydown', onKey)
      cvs.removeEventListener('contextmenu', noMenu)
      controls.dispose()
      pages.forEach(p => p.tex?.dispose())
      disposables.forEach(d => d.dispose?.())
      renderer.dispose()
      renderer.forceContextLoss()
      cvs.remove()
      api.current = null
    }
    // 頁數改變才重建；顏色、貼圖走下面的 effect 即時更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  useEffect(() => { api.current?.setColors(baseColor, paperColor) }, [baseColor, paperColor])
  useEffect(() => { hostRef.current?.querySelector('canvas')?.setAttribute('aria-label', label || '桌曆 3D 預覽') }, [label])

  // ── 目前頁改變、或設計內容改變（version）：只載入 current ±1 的貼圖 ──
  useEffect(() => {
    const a = api.current
    if (!a) return
    a.setCurrent(current)
    const want = new Set([current - 1, current, current + 1].filter(i => i >= 0 && i < count))
    for (const i of [...a.loaded]) if (!want.has(i)) { a.setTexture(i, null); a.loaded.delete(i) }
    let alive = true
    ;(async () => {
      for (const i of [current, current + 1, current - 1]) {
        if (!want.has(i)) continue
        const c = await cb.current.getCanvas(i)
        if (!alive || !api.current) return
        api.current.setTexture(i, c)
        api.current.loaded.add(i)
      }
    })()
    return () => { alive = false }
  }, [current, version, count])

  return <div className="cal3d" ref={hostRef} />
}
