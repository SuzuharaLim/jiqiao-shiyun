import { useEffect, useRef } from 'react'
import { Seal } from './ui.jsx'

// ============================================================================
// AR 疊加層 —— 把內容「貼」在被追蹤到的卡片上
//
// 用 CSS 3D 的 matrix3d 直接套用追蹤器算出的 homography：內容會跟著卡片
// 傾斜、旋轉、遠近縮放，而且不需要 WebGL、不需要任何第三方相依。
//
// ⚠️ 這一層與追蹤層是**解耦**的：它只吃一個 `track` 物件（matrix3d / pose / corners）。
//    要換成 A-Frame／three.js 渲染時，只需要另寫一個吃同樣輸入的元件，
//    追蹤層一行都不用動（見下方 <ARSceneAFrame> 的說明）。
//
// ⚠️ 疊加層必須 `pointer-events:none`：它蓋在整個取景畫面上，會吃掉底下所有點擊。
//    這個 bug 的症狀是「按鈕有時候按不動」，而畫面看起來完全正常。
// ============================================================================

/**
 * 內容以「模型座標」定義：卡片左上為 (0,0)、右下為 (1,1)。
 * homography 會把這個單位正方形映到畫面上的四邊形，所以這裡只要照著
 * 卡片本身的比例排版即可，不必管相機角度。
 */
export default function ARScene({ track, day, grabW = 160, grabH = 120 }) {
  const ref = useRef(null)
  const layerRef = useRef(null)

  // ⚠️ 追蹤器的座標系是「取樣畫面」（例如 95×160），不是螢幕像素。
  //    取樣時已把裁切比例對齊顯示框，所以這裡是**等比**縮放。
  //    一開始寫成 scaleX=寬比、scaleY=高比（非等比），因為取樣是 4:3 而顯示框是
  //    375×601——實測 scale 變成 2.35 × 5.01，內容直接飛到畫面外三萬 px。
  //    用 CSS scale 而不是在追蹤時就乘上去：poseFromHomography 的焦距假設是以
  //    取樣畫面的寬度算的，先縮放會讓 pose 的深度失真（CSS 疊加看不出來，
  //    但 A-Frame 會歪掉）。
  useEffect(() => {
    const el = layerRef.current
    if (!el) return
    const fit = () => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      el.style.setProperty('--ar-s', String(r.width / grabW))
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    ro?.observe(el)
    window.addEventListener('resize', fit)
    return () => { ro?.disconnect(); window.removeEventListener('resize', fit) }
  }, [grabW, grabH])

  // ⚠️ 直接寫 DOM 的 style，不走 React state。
  //    追蹤是每秒 15 次的高頻更新，每次都 setState 會讓整棵樹重繪，
  //    在中階手機上會直接掉幀——而這一層要的只是改一個 transform。
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!track) { el.style.opacity = '0'; return }
    el.style.opacity = '1'
    // ⚠️ 尾端的 scale(0.01) 是把 100px 的模型盒換算成「單位正方形」。
    //    模型盒不可直接做成 1px——子元素的 %、字級、translate(-50%) 全都會
    //    在 1px 的盒子裡爆掉（實測印章跑到畫面外 −12437px）。
    //    用 100px 當模型單位，子元素就能用正常的 % 與 px 排版。
    el.style.transform = `${track.matrix3d} scale(0.01)`
  }, [track])

  return (
    <div className="ar-layer" aria-hidden="true" ref={layerRef}>
      <div className="ar-scale">
        <div className="ar-anchor" ref={ref}>
        {/* 內容都用百分比定位 —— 模型座標系是 0..1 的單位正方形 */}
        <div className="ar-card-glow" />
        <div className="ar-seal"><Seal badge alt="" /></div>
        {day && (
          <>
            <div className="ar-date">{day.solar}　{day.ganzhi}</div>
            <div className="ar-term">{day.term}</div>
            <div className="ar-yi">
              <b>宜</b>{day.yi.slice(0, 3).map(t => <i key={t}>{t}</i>)}
            </div>
            <div className="ar-ji">
              <b>忌</b>{day.ji.slice(0, 2).map(t => <i key={t}>{t}</i>)}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}

/**
 * ── 給 A-Frame／three.js 用的接點 ────────────────────────────────────────
 *
 * 追蹤器每幀吐出的 `track.pose` 已經是可以直接餵給 three.js 的形狀：
 *
 *   pose.matrix    column-major 的 4×4 model-view 矩陣
 *                  → three.js:  obj.matrixAutoUpdate = false
 *                               obj.matrix.fromArray(pose.matrix)
 *                  → A-Frame:   entity.object3D.matrixAutoUpdate = false
 *                               entity.object3D.matrix.fromArray(pose.matrix)
 *   pose.position  [x, y, z]，卡片中心相對相機的位置（單位＝卡片邊長）
 *   pose.scale     卡片在世界座標的大小
 *
 * ⚠️ 焦距是用 60° 視角估的（poseFromHomography 的 fovDeg），沒有做鏡頭校正。
 *    A-Frame 的 <a-camera> 預設 fov 是 80——**兩邊的 fov 必須一致**，
 *    否則模型會浮在卡片上方或陷進桌面。要嘛把 a-camera 的 fov 設成 60，
 *    要嘛把 createTracker 的 fovDeg 設成 80。
 *
 * ⚠️ A-Frame 尚未加入相依（package.json 沒有），所以這裡只留接點不做實作——
 *    要接的時候在這個檔案加一個吃同樣 `track` 的元件即可，
 *    追蹤層（arTracker.js）完全不用改。
 */
export const AFRAME_POSE_NOTE = 'pose.matrix 為 column-major 4×4，可直接 Matrix4.fromArray()'
