import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SectionHead, Link } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { dayFor, todayOffset } from '../data/almanac.js'
import { detectQuad } from '../lib/quadDetect.js'
import { toGray } from '../lib/scanner.js'
import { createTracker, makeThrottle } from '../lib/arTracker.js'
import { loadOfficialRefs, bindLocalTarget } from '../lib/arCardRegistry.js'
import { hotspotAtCenter, makeHotspotLatch, screenToCard, hitTest } from '../lib/arHotspot.js'
import { drawSimFrame, wobbleQuad } from '../lib/arSimFrame.js'
import { openBackCamera } from '../lib/arCamera.js'
import { measureEdgeBow, explain, quadAspect } from '../lib/arDiagnose.js'
import { OFFICIAL_CARDS, objectForHotspot } from '../data/arCards.js'
import ARScene from '../components/ARScene.jsx'
import SpeakButton from '../components/SpeakButton.jsx'

// ⚠️ 角色層與 three 走 React.lazy：只有真的命中「有 3D 模型的熱區」才下載
//    （138 KB gzip）。掃描頁是入口，不該為了一個可能不會發生的情境先背這個重量。
const ARCharacter = lazy(() => import('../components/ARCharacter.jsx'))

// 取樣尺寸：GRAB = 相機取樣畫面；RECT = 拉正後的方形邊長（辨識用）
const GRAB_LONG = 160        // 取樣畫面的長邊（短邊照顯示框比例算）
// ★ 拉正後的方形邊長。48 → 64 是量出來的，不是猜的：
//    合成手持晃動 ＋ 室內明亮（感測器雜訊 σ4、輕微模糊）下的追蹤成功率
//      RECT 48  48%   每幀 12.73ms（15fps 預算的 19.1%）
//      RECT 64  75%   每幀 13.67ms（20.5%）  ← 只多 0.94ms
//      RECT 80  68%   每幀 15.88ms（23.8%）  ← 細節太多反而對雜訊更敏感
//    ⚠️ 不是「越大越好」：80 比 64 差，所以不要再往上加。
//    ⚠️ 上面的數字是桌機（Intel Iris Xe）。中階手機大約慢 3~4 倍 →
//       約 50ms，在 15fps 的 66ms 預算內但不寬裕。若實機掉幀，先降到 12fps
//       再考慮縮 RECT。
const RECT = 64
// ⚠️ 門檻**絕對不可以為了「掃不到」而調低**。分數不足的正確解法是多存幾個
//    視角的簽名（arCardRegistry 的 VIEWS，7 個），實測成功率 33% → 80% 而誤判維持 0。
//    調低門檻會讓正式站把別的東西認成卡片，而且是最難發現的壞法
//    ——使用者只覺得「有時候跳出錯的內容」。
const MIN_SCORE = 58        // 匹配門檻（0–100）
// ⚠️ 模擬模式的旗標要在**模組載入時**就抓，不可在 effect 裡讀 location.search：
//    nav.jsx 的網址同步層只組路徑（pathFromState 不帶 query），所以 `?simulate=1`
//    在 React 掛載後就被洗掉了——effect 永遠讀不到。
//    抓到之後記進 sessionStorage，重新整理也還在（除錯時會一直重整）。
const SIM_FLAG = (() => {
  if (!import.meta.env.DEV) return false
  try {
    if (new URLSearchParams(location.search).has('simulate')) {
      sessionStorage.setItem('jq-ar-sim', '1')
      return true
    }
    return sessionStorage.getItem('jq-ar-sim') === '1'
  } catch { return false }
})()

// ⚠️ `jq-ar-cards-v3`（使用者自訂登錄的持久化）已隨自訂登錄流程一起移除。
//    舊裝置上殘留的那筆 localStorage 不會被讀取，也不影響官方卡包——
//    刻意不主動刪除：使用者資料不該在一次改版裡被靜默清掉，日後要恢復
//    「使用者自己的卡」時它還在。

// 鏡頭掃描 —— 自研辨識管線（dHash + 色彩直方圖，src/lib/scanner.js），零第三方相依。
export default function Scan() {
  const { setToast, pop } = useNav()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const grabRef = useRef(null)               // 取樣 canvas + context（只建一次）
  const trackerRef = useRef(null)
  const stageRef = useRef(null)
  const officialFileRef = useRef(null)
  const pendingCardRef = useRef(null)   // 正在等使用者選圖的那張官方卡 id
  // ⚠️ 模擬掃描只在開發模式生效（`/AR?simulate=1`）。正式站絕不可讓使用者
  //    在沒有卡片的情況下看到「掃到了」——那是最糟的假象。
  const simRef = useRef(null)   // { bitmap, canvas, ctx, t0, truthQuad }
  // 取樣畫面的實際尺寸（隨顯示框比例而定）——疊加層要用它換算到螢幕座標。
  // ⚠️ 初值不可隨便填。它只有在 grabFrame 真的跑過一次之後才會更新，而在那之前
  //    疊加層的縮放就是錯的（實測初值填 160×160、實際應為 100×160 時，
  //    --ar-s 是 2.35 而不是 3.75，內容整個縮小並偏移約 76px）。
  //    掛載後先照顯示框比例算一次，第一幀之前就是對的。
  const [grabSize, setGrabSize] = useState({ w: GRAB_LONG, h: GRAB_LONG })
  const [status, setStatus] = useState('loading') // loading | ready | denied | unsupported
  // ⚠️ getUserMedia 在某些環境**既不 resolve 也不 reject**（權限提示一直開著、
  //    或裝置被別的程式佔用），這一頁就會永遠停在「正在開啟鏡頭…」。
  //    不改 status（那會在使用者正要按「允許」時謊報失敗），只在等太久之後
  //    多給一條出路。
  const [slowCamera, setSlowCamera] = useState(false)
  useEffect(() => {
    if (status !== 'loading') { setSlowCamera(false); return }
    const t = setTimeout(() => setSlowCamera(true), 4000)
    return () => clearTimeout(t)
  }, [status])
  // track：追蹤結果（含 matrix3d / pose / corners），null＝目前沒追到
  const [track, setTrack] = useState(null)
  const [seeCard, setSeeCard] = useState(false)   // 有沒有看到「一張卡片」（不論認不認得）
  // 官方卡包：進頁自動載入，使用者不必自己登錄就有東西可掃。
  // ⚠️ 與使用者自訂登錄是**兩份清單**：官方卡不可被使用者刪掉，
  //    使用者的卡也不會因為官方卡包更新而消失。
  const [official, setOfficial] = useState([])
  const officialRef = useRef(official); officialRef.current = official
  const [officialErr, setOfficialErr] = useState(null)
  // 命中的卡面熱區（瞄準或點擊卡上的物件）
  const [hotspot, setHotspot] = useState(null)
  // ⚠️ 追蹤迴圈要讀「目前選中哪個熱區」，但**不可把 hotspot 放進 effect 的 deps**
  //    ——那會讓每次換熱區都重建 tracker 與 rAF 迴圈（追蹤狀態、平滑器全部重置，
  //    畫面會抖一下）。用 ref 鏡射。
  const hotspotRef = useRef(null); hotspotRef.current = hotspot
  // 現場診斷：拿實體卡掃不到時，讓畫面自己說出「觀測到什麼」而不是只說失敗。
  // ⚠️ 只放**量得準**的觀測值。曾試過反推鏡頭 k1，實測會誤報（見 arDiagnose 檔頭）。
  const [diag, setDiag] = useState(null)
  const [showDiag, setShowDiag] = useState(false)
  // 「連續找不到四個角」的計數與提示（見追蹤迴圈裡的說明）
  const noQuadRef = useRef(0)
  const noQuadAtRef = useRef(0)
  const [noQuadHint, setNoQuadHint] = useState(false)
  const noQuadHintRef = useRef(false); noQuadHintRef.current = noQuadHint
  const diagRef = useRef(0)
  const showDiagRef = useRef(false); showDiagRef.current = showDiag
  const latchRef = useRef(null)
  if (!latchRef.current) latchRef.current = makeHotspotLatch()

  // ⚠️ 這個 effect 相依 `status`，必須寫在 status 宣告之後。
  //    放在前面會踩到 TDZ——`Cannot access 'status' before initialization`，
  //    而且是**整個畫面被 ErrorBoundary 接走**（只看到「畫面暫時出了點狀況」），
  //    build 完全不會報錯。
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const sync = () => {
      const box = el.getBoundingClientRect()
      if (!box.width || !box.height) return
      const ar = box.width / box.height
      const w = ar >= 1 ? GRAB_LONG : Math.max(60, Math.round(GRAB_LONG * ar))
      const h = ar >= 1 ? Math.max(60, Math.round(GRAB_LONG / ar)) : GRAB_LONG
      setGrabSize(prev => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
    sync()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [status])

  // ---- 官方卡包（進頁就載，失敗不影響自訂登錄）----
  useEffect(() => {
    let cancelled = false
    loadOfficialRefs(RECT).then(({ refs: list, errors }) => {
      if (cancelled) return
      setOfficial(list)
      // ⚠️ 單張失敗只跳過那一張。美術漏上傳一張圖不該讓使用者連別的卡都掃不到。
      if (errors.length) setOfficialErr(errors)
      // 追蹤器已經建好時要補餵進去（不然要等下一次重建）
      if (list.length) trackerRef.current?.setRefs(list)
    }).catch(() => { if (!cancelled) setOfficialErr([{ card: '官方卡包', message: '載入失敗' }]) })
    return () => { cancelled = true }
  }, [])

  // ---- 模擬掃描（僅開發模式）----
  useEffect(() => {
    if (!SIM_FLAG) return
    const ref = official[0]
    const src = ref?.poster || ref?.card?.target
    if (!src) return
    let cancelled = false
    ;(async () => {
      try {
        const bmp = typeof createImageBitmap === 'function'
          ? await createImageBitmap(await (await fetch(src)).blob())
          : null
        if (cancelled || !bmp) return
        const canvas = document.createElement('canvas')
        simRef.current = {
          bitmap: bmp, canvas, ctx: canvas.getContext('2d', { willReadFrequently: true }),
          t0: performance.now(), aspect: ref.aspect || 1, truthQuad: null,
        }
        // 讓外部（瀏覽器測試）拿得到真值四角
        window.__arSim = simRef.current
        setStatus('ready')
        setToast('模擬掃描已啟動（僅開發模式）')
      } catch { /* 拿不到圖就不啟動，走正常相機流程 */ }
    })()
    return () => { cancelled = true; simRef.current = null; delete window.__arSim }
  }, [official])

  // ---- 開關相機 ----
  useEffect(() => {
    let cancelled = false
    async function start() {
      // ── 模擬模式：不開相機，直接進 ready ──
      // ⚠️ 原本寫 `if (simRef.current) return`，有兩個問題，合起來讓模擬模式
      //    **在沒有相機／拒絕權限時完全跑不動**——而那正是最需要它的時候：
      //    ① 這一句沒有 `setStatus`，status 永遠停在 'loading'，
      //       而追蹤迴圈是 `if (status !== 'ready') return` → 永遠不啟動
      //    ② `simRef.current` 有競態：載入目標圖的 effect 是 async，
      //       這個 effect 跑的時候它還是 null，所以其實**照樣去開了相機**，
      //       只是在有相機的開發機上會變成 ready 而看不出問題
      //    改用模組層的 SIM_FLAG（載入時就決定，沒有時序問題）。
      //    grabFrame 在模擬模式完全不碰 <video>，所以不需要串流。
      if (SIM_FLAG) { setStatus('ready'); return }
      if (!navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return }
      try {
        // ★ 避開超廣角鏡頭（畸變容忍上限只有 k1 ≈ −0.04，超廣角遠超過）。
        //    三層 fallback、盡力而為，絕不可因此開不了相機——見 lib/arCamera.js。
        const stream = await openBackCamera()
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        setStatus('ready')
      } catch (e) {
        setStatus(e?.name === 'NotAllowedError' ? 'denied' : 'unsupported')
      }
    }
    start()
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // <video> 在 status==='ready' 才進 DOM → 必須在渲染後才接上 stream
  // （若在 getUserMedia resolve 當下接，videoRef 還是 null，畫面會全黑）
  useEffect(() => {
    if (status === 'ready' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play?.().catch(() => { /* autoplay 受阻時靠 muted+playsInline */ })
    }
  }, [status])

  // ---- 取樣一幀（video → 160×120 ImageData）----
  // canvas 尺寸只設一次：對 width/height 賦值（即使同值）依規格會清空 bitmap 並重置 context
  // ⚠️ 取樣畫面的長寬比必須與**顯示區**一致，不可寫死 4:3。
  //    .scan-video 是 object-fit:cover，畫面上看得到的是「視訊被裁成顯示框比例」的
  //    那一塊。若取樣時裁成 4:3、顯示卻是 375×601，兩個裁切區根本不同——
  //    偵測會找到使用者看不到的卡片，而疊加層的座標換算也永遠對不上
  //    （實測 scale 變成非等比的 2.35 × 5.01，印章直接飛到畫面外三萬 px）。
  //    對齊之後，取樣座標 → 顯示座標就只差一個**等比**縮放。
  const grabFrame = () => {
    // ── 模擬掃描：把目標圖畫到一個會緩慢移動的透視四邊形上 ──
    // 整條鏈（偵測 → 拉正 → 比對 → 解姿態 → 貼角色 → 熱區）都跑真的，
    // 只有「相機」是假的。見 lib/arSimFrame.js。
    const sim = simRef.current
    if (sim?.bitmap) {
      const { w, h } = grabSize
      if (sim.canvas.width !== w || sim.canvas.height !== h) {
        sim.canvas.width = w; sim.canvas.height = h
      }
      const t = (performance.now() - sim.t0) / 1000
      const quad = wobbleQuad(t, { w, h, aspect: sim.aspect })
      sim.truthQuad = quad
      return drawSimFrame(sim.ctx, sim.bitmap, { w, h, quad })
    }
    const video = videoRef.current
    const stage = stageRef.current
    if (!video || video.readyState < 2 || !stage) return null
    const vw = video.videoWidth, vh = video.videoHeight
    if (!vw || !vh) return null
    const box = stage.getBoundingClientRect()
    if (!box.width || !box.height) return null
    // 取樣尺寸：長邊固定 GRAB_LONG，短邊照顯示框的比例
    const ar = box.width / box.height
    const gw = ar >= 1 ? GRAB_LONG : Math.max(60, Math.round(GRAB_LONG * ar))
    const gh = ar >= 1 ? Math.max(60, Math.round(GRAB_LONG / ar)) : GRAB_LONG
    let g = grabRef.current
    if (!g || g.cv.width !== gw || g.cv.height !== gh) {
      const cv = document.createElement('canvas')
      cv.width = gw; cv.height = gh
      g = grabRef.current = { cv, ctx: cv.getContext('2d', { willReadFrequently: true }) }
      setGrabSize({ w: gw, h: gh })
    }
    // cover：以較大的縮放比填滿，超出的部分裁掉（與 CSS 的 object-fit:cover 同一套）
    const scale = Math.max(gw / vw, gh / vh)
    const sw = gw / scale, sh = gh / scale
    g.ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, gw, gh)
    return { data: g.ctx.getImageData(0, 0, gw, gh).data, w: gw, h: gh }
  }

  // ---- AR 追蹤迴圈 ----
  // ⚠️ 用 requestAnimationFrame + 節流，不用 setInterval：分頁切到背景時 rAF
  //    會自動停下來，setInterval 不會——那等於在看不見的分頁裡持續跑影像運算。
  //    節流器以「上次完成」計時，某一幀跑太久也不會排隊堆積。
  useEffect(() => {
    if (status !== 'ready') return
    const tracker = createTracker({
      refs: officialRef.current,
      rectifySize: RECT, minScore: MIN_SCORE,
    })
    trackerRef.current = tracker
    const shouldRun = makeThrottle(15)
    let raf = 0, alive = true
    const loop = (now) => {
      if (!alive) return
      raf = requestAnimationFrame(loop)
      if (!shouldRun(now)) return
      const frame = grabFrame()
      if (!frame) return
      tracker.setRefs(officialRef.current)
      const res = tracker.track(frame.data, frame.w, frame.h)
      setTrack(res)
      // ⚠️ 官方卡一張都沒載入時（目標圖沒放進 public/ar/targets/），仍然回報
      //    「有沒有看到一張卡片」——否則畫面連「我看到卡了」都不會說，
      //    使用者完全無從分辨是「沒對準」還是「根本沒有可比對的目標」。
      if (!officialRef.current.length) {
        setSeeCard(!!detectQuad(toGray(frame.data, frame.w, frame.h), frame.w, frame.h))
      } else setSeeCard(!!res)

      // ── 「一直找不到四個角」的自動提示 ──
      //
      // ⚠️ 為什麼需要這個：實測（合成，24 幀 × 5 種桌面亮度）——
      //      加收邊版：深黑 23/24、中灰 23/24、淺灰 22/24、淺白 23/24、純白 24/24
      //      無收邊原稿：深黑 18/24、中灰 13/24、淺灰 0、淺白 0、**純白 0**
      //    紙的邊緣是白的（實測原稿紙緣內側灰階 254，98% 高於 240），放在淺色桌面
      //    上「紙與桌面的邊界」根本不存在——這不是對準問題，喬角度永遠不會成功。
      //    而畫面原本只會一直寫「掃描中」，使用者會一直換角度重試。
      //    診斷面板早就會講，但那要使用者自己去點開；掃不到的人不會知道有那個面板。
      //
      // ⚠️ 節流跑：detectQuad 是整條鏈最貴的一步，不可為了這個提示每幀多跑一次。
      if (res) { noQuadRef.current = 0; if (noQuadHintRef.current) setNoQuadHint(false) }
      else if (now - noQuadAtRef.current > 700) {
        noQuadAtRef.current = now
        const q = detectQuad(toGray(frame.data, frame.w, frame.h), frame.w, frame.h)
        if (q) noQuadRef.current = 0
        else if (++noQuadRef.current >= 8 && !noQuadHintRef.current) setNoQuadHint(true)
      }

      // ── 現場診斷（節流到約每 0.7 秒一次）──
      // ⚠️ 不可每幀跑：measureEdgeBow 會重跑一次前景遮罩，那是整條鏈第二貴的一步。
      if (showDiagRef.current && now - diagRef.current > 700) {
        diagRef.current = now
        const gray = toGray(frame.data, frame.w, frame.h)
        const dq = detectQuad(gray, frame.w, frame.h)
        const bow = dq ? measureEdgeBow(gray, frame.w, frame.h, dq.corners) : null
        const track0 = streamRef.current?.getVideoTracks?.()[0]
        const st = track0?.getSettings?.() ?? {}
        setDiag({
          camera: track0?.label || '(未知)',
          res: st.width && st.height ? `${st.width}×${st.height}` : '(未知)',
          quadFound: !!dq,
          areaRatio: res?.areaRatio ?? dq?.areaRatio ?? null,
          score: res?.score ?? null,
          minScore: MIN_SCORE,
          bowPx: bow?.maxPx ?? null,
          bowRatio: bow?.maxRatio ?? null,
          // ★ 「框到的不是卡片」的訊號：偵測到的四邊形長寬比 vs 卡片應有的。
          //    最常見是拿另一台裝置掃螢幕時整個螢幕入鏡（螢幕 1.78 vs 小寒卡 1.37）。
          //    沒有這一項時那個情況會被誤診成「比對太嚴格」——見 arDiagnose 的說明。
          seenAspect: dq ? quadAspect(dq.corners) : null,
          cardAspect: officialRef.current[0]?.aspect ?? null,
          refs: officialRef.current.length,
        })
      }

      // ── 卡面熱區：瞄準卡上的物件就跳內容 ──
      // ⚠️ 一定要走 latch（進入 3 幀／離開 8 幀）。追蹤每秒 15 次、四角偵測有
      //    1px 抖動，熱區邊界附近會高頻跳動，而開關內容面板是最貴的操作。
      const card = res?.ref?.card
      if (card && stageRef.current) {
        const box = stageRef.current.getBoundingClientRect()
        const hs = hotspotAtCenter(res.H, card.hotspots, {
          dispW: box.width, dispH: box.height, grabW: frame.w, grabH: frame.h,
        })
        const out = latchRef.current.push(hs?.id ?? null)
        if (out.changed) {
          setHotspot(out.id ? card.hotspots.find(h => h.id === out.id) ?? null : null)
        }
        // ★ 追到卡片但還沒瞄到任何熱區時，預設選中**主物件**（白菜）。
        //
        // ⚠️ 為什麼需要這個：選取只看「畫面正中心」落在哪個熱區，而白菜的 rect 是
        //    x 0.058~0.214（卡片最左），**不含卡片中心 (0.5,0.5)**。使用者最自然的
        //    動作是把整張卡對準畫面中央——那樣瞄到的永遠是身體保健／曆頁，
        //    **白菜的 3D 永遠不會出現**。而「掃到卡片就看到白菜」正是這張卡的主軸
        //    （卡面上白紙黑字印著「掃描主物件：結球白菜」）。
        //    要用中心瞄到白菜，得把卡片擺到畫面右側又不能出框——沒有人會這樣拿。
        //    /ar/card/:slug 早就是「進頁預設選主物件」，這裡對齊那個行為。
        if (!out.changed && !latchRef.current.current && !hotspotRef.current) {
          const primary = card.hotspots.find(h => h.primary)
          if (primary) setHotspot(primary)
        }
      } else if (latchRef.current.current) {
        latchRef.current.reset()
        setHotspot(null)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [status])

  // ⚠️ 「使用者自己登錄目標」（相機登錄 register／圖片檔登錄 registerFromFile／
  //    兩段式刪除 askRemove）已於 2026-08 移除——那是工程 demo 的動線。
  //    拿到卡片的人不該先被要求「登錄一張目標」才能掃；這一頁現在只認官方卡包。
  //    ⚠️ 移除的是**這一頁的 UI 與流程**，不是追蹤能力：arTracker 仍支援多目標，
  //       arCardRegistry 仍有 bindLocalTarget（美術改稿時在本機驗動線用）。
  //       日後要做「使用者自己的卡」，把這段流程接回來即可。

  // ⚠️ 曆訊要用「今天」不是錨點：dayFor(0) 是錨點 6/6，不是今天。
  const d = dayFor(todayOffset())
  const tracking = !!track

  // ★ 點取景框裡的物件就選它（不必用畫面中心去瞄）。
  //
  // ⚠️ `screenToCard` 與 `hitTest` 先前**被 import 但完全沒用到**——也就是掃描時
  //    唯一的選取方式是「把熱區移到畫面正中心」。對這張卡來說那條路走不通：
  //    白菜在卡片最左（x 0.058~0.214），要讓它落在畫面中心就得把卡片擺到右側
  //    又不能出框，而整張卡出框就偵測不到。手指直接點它才是自然動作。
  // ⚠️ 點擊要落在 `.scan-stage` 上，而 AR 疊加層是 `pointer-events:none`
  //    （否則它會吃掉整個取景畫面的點擊——那個坑 CLAUDE.md 記過）。
  const onStageTap = (e) => {
    const card = track?.ref?.card
    if (!card || !track?.H || !stageRef.current) return
    const box = stageRef.current.getBoundingClientRect()
    // ⚠️ 參數順序踩過一次：`screenToCard(H, {x,y}, layout)` 的第二個參數是**物件**，
    //    而 `hitTest(hotspots, u, v)` 的熱區陣列在**第一個**。
    //    我第一版寫成 `screenToCard(H, x, y, layout)` 與 `hitTest(uv, hotspots)`，
    //    兩個都錯，結果每一次點都回 null（點了完全沒反應，而且不會拋錯）。
    //    check-ar 當時只 grep 字串所以照樣綠燈——那一項現在改成真的呼叫一次。
    const uv = screenToCard(track.H, { x: e.clientX - box.left, y: e.clientY - box.top }, {
      dispW: box.width, dispH: box.height, grabW: grabSize.w, grabH: grabSize.h,
    })
    if (!uv) return
    const hs = hitTest(card.hotspots, uv[0], uv[1])
    // ⚠️ 點到卡片以外（uv 落在 0..1 之外或沒命中任何熱區）時**不清掉現有選擇**：
    //    手持會抖，誤觸空白處就把內容關掉會讓人以為壞了。
    if (hs) { latchRef.current.reset(); setHotspot(hs) }
  }

  // aria-live 只播報「階段」不播分數——追蹤是每秒 15 次，播分數會變成朗讀轟炸
  // ⚠️ 這段以前是講「登錄」的（「按下方登錄這張卡片」），但那顆按鈕已經移除。
  //    照舊留著會叫使用者去按一個不存在的東西——比不給提示更糟。
  //    現在區分三種狀態，而且**把「沒有可比對的目標」單獨講出來**：
  //    那一種不是使用者對不準，是站方少放了一張圖，再怎麼喬角度都不會成功。
  const phaseText = status !== 'ready' ? '　'
    : !official.length
      ? (seeCard
        ? '看到一張卡片了，但目標圖尚未安裝，所以認不出它是哪一張'
        : '目標圖尚未安裝——這一頁目前掃不到任何卡片')
      // ⚠️ 追到卡片時要講「可以點」：選取不只有「用畫面中心瞄」一種，
      //    而中心瞄不到白菜（它在卡片最左）。不講的話使用者不會知道能點。
      : tracking ? `已對準：${track.ref.name}——點卡面上的物件可以換內容`
        : seeCard ? '看到卡片了，但不是官方卡片'
          // ⚠️ 一直找不到四個角時不可只說「掃描中」：那會讓人以為再喬一下就好。
          //    白紙在淺色桌面上沒有邊界可找，換角度不會有幫助。
          : noQuadHint ? '找不到卡片的邊界——請把卡片放到深色桌面上，或改用加了收邊的那一版'
            : '掃描中——把整張卡片放進框內'

  return (
    <>
      <TopBar title="AR 掃描｜卡片一入鏡就跳出內容" onBack />
      <div className="body scan-body">
        {/* ⚠️ 取景框可點：追到卡片時點卡上的物件就選它，不必用畫面中心去瞄。
            白菜在卡片最左，用中心瞄不到（見 onStageTap 的說明）。
            ⚠️ 用 onPointerDown 不用 onClick：手持時手指會微移，
               click 需要 down/up 在同一點附近，容易漏掉。 */}
        <div className="scan-stage" ref={stageRef} onPointerDown={tracking ? onStageTap : undefined}>
          {status === 'ready' && <video ref={videoRef} className="scan-video" autoPlay playsInline muted />}
          {status !== 'ready' && (
            <div className="scan-fallback">
              <Icon name="camera" style={{ width: 46, height: 46, stroke: 'var(--pfg)' }} />
              <p>
                {status === 'loading' && '正在開啟鏡頭…'}
                {status === 'denied' && '尚未允許使用相機。請在瀏覽器允許相機權限後再試。'}
                {status === 'unsupported' && '這台裝置沒有相機，或這個環境不允許使用（需 HTTPS）。'}
              </p>
              {/* ── 不要讓這裡變成死路 ──
                  ⚠️ 桌機、拒絕權限、或 getUserMedia 一直不回應時，這一頁原本
                     **只有一行字**：沒有相機的人到這裡就走不下去了（驗收報告 B3）。
                  ⚠️ 但也**不自動導走**：`denied` 常常只是還沒按「允許」，
                     把人直接送去別的頁面等於替他放棄那條路，而且他不會知道為什麼
                     畫面突然跳掉。給出路、讓他選。
                  ⚠️ `loading` 要等一下才顯示：一開就跳出「沒有相機？」會讓正在
                     看權限提示的人以為已經失敗了。 */}
              {(status !== 'loading' || slowCamera) && OFFICIAL_CARDS[0] && (
                <div className="scan-fallback-out">
                  {status === 'loading' && <p className="muted">還在等相機權限。沒有相機的話：</p>}
                  <Link screen="arCard" params={{ slug: OFFICIAL_CARDS[0].slug }} className="btn-primary tap">
                    沒有相機？看示範內容 ›
                  </Link>
                  <p className="muted">
                    那一頁不用相機也能走完：卡面、六個物件、3D 白菜、小挑戰、徽章都在。
                  </p>
                </div>
              )}
            </div>
          )}
          {/* AR 疊加層：內容直接貼在被追蹤到的卡片上（CSS 3D matrix3d） */}
          {status === 'ready' && <ARScene track={track} day={d} grabW={grabSize.w} grabH={grabSize.h} />}
          <div className={`scan-frame ${tracking ? 'hit' : ''}`} aria-hidden="true">
            <span className="c tl" /><span className="c tr" /><span className="c bl" /><span className="c br" />
            {status === 'ready' && !tracking && <div className="scan-line" />}
          </div>
        </div>

        {/* 即時狀態列 */}
        <div className="scan-status">
          <span aria-live="polite">{phaseText}</span>
          {tracking && <span aria-hidden="true">　相似度 <b>{track.score}%</b></span>}
        </div>

        {/* ── 角色站在卡片上（命中有模型的熱區才載入）── */}
        {(() => {
          const o = hotspot ? objectForHotspot(hotspot) : null
          if (!o?.model || !track?.pose) return null
          return (
            <Suspense fallback={null}>
              <ARCharacter
                track={track} grabW={grabSize.w} grabH={grabSize.h}
                anchorUV={[hotspot.rect.x + hotspot.rect.w / 2, hotspot.rect.y + hotspot.rect.h / 2]}
                action="present"
              />
            </Suspense>
          )
        })()}

        {/* ── 命中卡面熱區：跳出那個物件的內容 ── */}
        {hotspot && (() => {
          const obj = objectForHotspot(hotspot)
          if (!obj) return null
          return (
            <div className="scan-hit ui-enter">
              <div className="scan-hit-hd">
                <b>{obj.name}</b>
                <span className="muted">{track?.ref?.name}</span>
              </div>
              {obj.line && <p className="scan-hit-line">{obj.line}</p>}
              {obj.facts?.length > 0 && (
                <dl className="scan-hit-facts">
                  {obj.facts.map(f => (
                    <div key={f.label}>
                      <dt>{f.label}</dt>
                      <dd>{f.value}{f.source && <i className="muted">（{f.source}）</i>}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {obj.warn && <p className="scan-hit-warn">{obj.warn}</p>}
              {/* 語音導覽：這裡才是它真正的使用情境——手上拿著卡、眼睛盯著卡面，
                  低頭讀這一小塊面板是彆扭的。
                  ⚠️ 換熱區時上一段一定要停（SpeakButton 依 obj.id 自己處理），
                     否則使用者瞄準白菜卻聽到臘八粥。 */}
              <SpeakButton obj={obj} className="scan-hit-speak" />
              {obj.link && (
                <Link screen={obj.link.screen} params={obj.link.props} className="btn-ghost tap">
                  {obj.link.label} ›
                </Link>
              )}
            </div>
          )
        })()}

        {/* ── 現場診斷 ──
            拿實體卡掃不到時，這一區把「觀測到什麼」列出來取代猜測。
            ⚠️ 每一行都是可觀測的事實；判讀那一段刻意不替使用者斷定原因
               （現場量不出可信的鏡頭畸變值——見 arDiagnose.js 檔頭）。 */}
        <div className="scan-diag">
          <button className="btn-ghost tap" onClick={() => setShowDiag(v => !v)}
            aria-expanded={showDiag}>
            {showDiag ? '關閉' : '打開'}掃描診斷
          </button>
          {showDiag && (
            <div className="scan-diag-box">
              {!diag && <p className="muted">正在取樣…（約每 0.7 秒更新一次）</p>}
              {diag && (() => {
                const v = explain({
                  quadFound: diag.quadFound, bestScore: diag.score, minScore: diag.minScore,
                  cameraLabel: diag.camera, areaRatio: diag.areaRatio,
                  seenAspect: diag.seenAspect, cardAspect: diag.cardAspect,
                })
                return (
                  <>
                    <dl className="scan-diag-kv">
                      <div><dt>鏡頭</dt><dd>{diag.camera}</dd></div>
                      <div><dt>解析度</dt><dd>{diag.res}</dd></div>
                      <div><dt>已登錄目標</dt><dd>{diag.refs} 個</dd></div>
                      <div><dt>找到四邊形</dt><dd>{diag.quadFound ? '是' : '否'}</dd></div>
                      <div><dt>卡片佔畫面</dt>
                        <dd>{diag.areaRatio != null ? (diag.areaRatio * 100).toFixed(1) + '%' : '—'}</dd></div>
                      <div><dt>比對分數</dt>
                        <dd>{diag.score != null ? `${diag.score} / 門檻 ${diag.minScore}` : '未達門檻'}</dd></div>
                      {/* ★ 判讀「框到的是不是卡片」的依據。並列出來才看得出結論從哪來。 */}
                      <div><dt>四邊形長寬比</dt>
                        <dd>
                          {diag.seenAspect != null ? diag.seenAspect.toFixed(2) : '—'}
                          {diag.cardAspect != null && <i className="muted">　卡片應為 {diag.cardAspect.toFixed(2)}</i>}
                        </dd></div>
                      <div><dt>邊緣弓起</dt>
                        <dd>
                          {diag.bowPx != null
                            ? `${diag.bowPx}px（佔邊長 ${(diag.bowRatio * 100).toFixed(1)}%）`
                            : '—'}
                          <i className="muted">　參考值，不代表鏡頭有問題</i>
                        </dd></div>
                    </dl>
                    <p className={`scan-diag-verdict ${v.level}`}>
                      <b>{v.what}</b>
                      {v.why && <><br />{v.why}</>}
                      {v.next && <><br /><b>試試：</b>{v.next}</>}
                    </p>
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* ── 一直找不到四個角：主動講出兩個真正的原因 ──
            ⚠️ 這一段刻意**不說「請對準」**。實測紙的邊緣是白的（紙緣內側灰階 254），
               放在淺色桌面上邊界根本不存在，喬角度永遠不會成功——
               叫使用者「再對準一點」是把責任推給他，而且是錯的建議。 */}
        {noQuadHint && !!official.length && (
          <div className="scan-nofile">
            <b>一直找不到卡片的四個角。</b>
            <p>
              偵測靠的是<b>紙與桌面的邊界</b>。白紙放在淺色桌面（或白色螢幕背景）上
              沒有邊界可找——這不是沒對準，換角度不會有幫助。
            </p>
            <p>
              <b>兩個都有效：</b>把卡片放到<b>深色桌面</b>上；
              或改用<b>加了收邊的那一版</b>（`npm run card:install` 產出的
              「-付印.png」，四邊有白留白邊＋深色實框）。
            </p>
            <p className="muted">
              實測 24 幀 × 5 種桌面亮度：加收邊版在深黑／中灰／淺灰／淺白／純白
              分別 23／23／22／23／24 中；無收邊原稿是 18／13／0／0／0
              ——比中灰更淺的背景一次都不會成功。
            </p>
          </div>
        )}

        {/* ── 官方卡片：進頁就能掃，不必自己登錄 ── */}
        <div className="scan-official">
          <SectionHead title="官方節氣卡片" />
          {/* ⚠️ 一張官方卡都沒載入時，這一頁會**完全掃不到任何東西**——四邊形照樣偵測得到，
              但沒有登錄目標可以比對，所以永遠不會命中、3D 也永遠不會出現。
              先前這個狀態是**靜默的**：使用者只看到「掃了沒反應」，無從得知是缺檔案。
              症狀與「卡片沒對準／光線不夠」完全一樣，會讓人一直換角度重試。 */}
          {!official.length && (
            <div className="scan-nofile">
              <b>目標圖尚未安裝，所以掃描不會有任何反應。</b>
              <p>
                追蹤器需要一張「這張卡長什麼樣」的參考圖才能比對。目前
                <code>public/ar/targets/</code> 裡沒有任何圖檔，等於沒有登錄目標——
                相機找得到卡片的四個角，但認不出那是哪一張，所以不會跳出白菜。
              </p>
              <p>
                <b>解法：</b>把印出來的那一版卡面圖存成
                <code>public/ar/targets/2027-xiaohan.png</code>，重新整理即可。
                裝上之後所有人都能掃，不必逐台裝置設定。
              </p>
              <p className="muted">
                ⚠️ 一定要用<b>實際付印的那一版</b>（含收邊白邊與深色框）。拿加收邊之前的稿
                登錄、印加收邊之後的卡，相機看得到卡片、四角也抓得準，卻會一律判定
                「不是登錄過的目標」——實測無框版登錄＋有框版拍攝 0/2，有框版登錄 4/4。
              </p>
            </div>
          )}
          {OFFICIAL_CARDS.map(c => {
            const loaded = official.some(o => o.id === c.id)
            const active = track?.ref?.id === c.id
            return (
              <div key={c.id} className={`scan-card${active ? ' on' : ''}`}>
                <div className="scan-card-hd">
                  <b>{c.title}</b>
                  <span className="muted">{c.subtitle}</span>
                  {active && <span className="scan-card-live">正在掃描中</span>}
                </div>
                <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                  {loaded
                    ? `拿這張卡對著鏡頭，瞄準卡上的${c.hotspots.find(h => h.primary)?.label ?? '主物件'}就會跳出內容。`
                    : '目標圖尚未上傳，這張卡目前無法掃描。'}
                </p>
                <div className="scan-card-spots">
                  {c.hotspots.map(h => (
                    <span key={h.id} className={`chip${hotspot?.id === h.id ? ' on' : ''}`}>{h.label}</span>
                  ))}
                </div>
                {/* 目標圖還沒進 public/ 時，讓使用者直接指定手邊那張圖。
                    ⚠️ 只存在這台裝置的 localStorage——正式上線仍要把圖放進
                       public/ar/targets/，否則別人打開網站還是掃不到。 */}
                {!loaded && (
                  <button className="btn-ghost tap" style={{ marginTop: 'var(--space-2)' }}
                    onClick={() => { pendingCardRef.current = c.id; officialFileRef.current?.click() }}>
                    指定本機圖片當目標（僅這台裝置）
                  </button>
                )}
                {/* 「沒有卡片？看示範」——導向不需相機的卡片頁（改版文件 §5.1）。
                    ⚠️ 這是真的 <a href>：/ar/card/:slug 允許索引，爬蟲要走得進去。 */}
                <Link screen="arCard" params={{ slug: c.slug }} className="btn-ghost tap"
                  style={{ marginTop: 'var(--space-2)' }}>
                  沒有卡片？看示範內容 ›
                </Link>
                {official.find(o => o.id === c.id)?.local && (
                  <p className="muted" style={{ fontSize: 'var(--text-2xs)', margin: '6px 0 0' }}>
                    目前用的是你指定的本機圖片，只在這台裝置有效。
                  </p>
                )}
              </div>
            )
          })}
          <input ref={officialFileRef} type="file" accept="image/*" hidden
            aria-label="選擇官方卡片的目標圖片"
            onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = ''
              const id = pendingCardRef.current; pendingCardRef.current = null
              if (!f || !id) return
              try {
                const ref = await bindLocalTarget(id, f, RECT)
                const next = [...official.filter(o => o.id !== id), ref]
                setOfficial(next)
                setOfficialErr(null)
                trackerRef.current?.setRefs(next)
                trackerRef.current?.reset()
                setToast(`已指定「${ref.name}」的目標圖——把實體卡放進框內試試`)
              } catch (err) { setToast(err?.message || '這張圖讀不進來') }
            }} />
          {officialErr && (
            <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
              官方卡包有 {officialErr.length} 張載入失敗（{officialErr.map(e => e.card).join('、')}）——
              自訂登錄不受影響。
            </p>
          )}
        </div>

        {/* ⚠️ 「自訂掃描目標」（從圖片檔登錄／相機對著實體登錄／已登錄清單）已於 2026-08 移除。
            那是工程 demo 的動線：拿到卡片的人不該先被要求「登錄一張目標」才能掃。
            這一頁現在只認官方卡包（OFFICIAL_CARDS），拿卡對著鏡頭就有反應。
            底層的 registerFromFile / 多目標追蹤仍在 lib 裡，日後要做「使用者自己的卡」再接回來。 */}
        <p className="muted scan-soon">
          自研平面追蹤：偵測卡片的四個角 → 透視拉正 → 比對官方卡 → 解出姿態，
          內容就直接貼在卡片上並跟著傾斜。全程在你的裝置上運算，影像不上傳、零第三方相依。
          <br />
          把<b>整張卡片</b>放進框內，紙張與桌面顏色差越多越穩；純白桌面上放白紙會找不到邊。
        </p>
      </div>

    </>
  )
}
