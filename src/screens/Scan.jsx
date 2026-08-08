import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SectionHead, Link } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { dayFor, todayOffset } from '../data/almanac.js'
import { makeSignature, matchScore, serializeSig, deserializeSig } from '../lib/scanner.js'
import { detectQuad, rectify } from '../lib/quadDetect.js'
import { toGray } from '../lib/scanner.js'
import { createTracker, makeThrottle } from '../lib/arTracker.js'
import { loadOfficialRefs, bindLocalTarget } from '../lib/arCardRegistry.js'
import { hotspotAtCenter, makeHotspotLatch, screenToCard, hitTest } from '../lib/arHotspot.js'
import { drawSimFrame, wobbleQuad } from '../lib/arSimFrame.js'
import { openBackCamera } from '../lib/arCamera.js'
import { OFFICIAL_CARDS, objectForHotspot } from '../data/arCards.js'
import ARScene from '../components/ARScene.jsx'

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
const MIN_SCORE = 58        // 匹配門檻（0–100）
const MAX_REFS = 20         // 登錄上限（localStorage 空間考量；一張約 3KB）
// ⚠️ 換 key 是刻意的：舊版登錄的是「畫面中央 128×96 的裁切」，新版登錄的是
//    「偵測到卡片後透視拉正的 48×48」。兩者的 dHash 不在同一個座標系，
//    直接沿用會讓所有舊卡片永遠對不上（而且是靜默的——使用者只會覺得
//    「以前可以現在不行」）。換 key 等於請使用者重新登錄一次，誠實且乾淨。
const LS_KEY = 'jq-ar-cards-v3'   // v3：RECT 48 → 64，舊簽名不在同一個座標系

// ---- 已登錄卡片的持久化（簽名 + 縮圖，全存本機；影像不上傳） ----
// 逐筆驗證＋逐筆 try/catch：單筆壞資料只剔除該筆，不會讓全部登錄消失
// （若整批包一個 try/catch，一筆污染 → 回 []，之後 saveRefs 覆寫 = 完好登錄永久遺失）
const HIST_LEN = 24   // 8 bins × 3 通道
function loadRefs() {
  let parsed
  try { parsed = JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  if (!Array.isArray(parsed)) return []
  const out = []
  for (const r of parsed) {
    try {
      const valid = typeof r?.id === 'string' && typeof r?.name === 'string'
        && typeof r?.sig?.hash === 'string' && /^[0-9a-fA-F]{16}$/.test(r.sig.hash)
        && Array.isArray(r.sig.hist) && r.sig.hist.length === HIST_LEN && r.sig.hist.every(Number.isFinite)
      if (valid) out.push({ ...r, aspect: Number(r.aspect) > 0 ? Number(r.aspect) : 1, ...deserializeSig(r.sig) })
    } catch { /* 剔除單筆壞資料 */ }
  }
  return out
}
function saveRefs(refs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(refs.map(r =>
      ({ id: r.id, name: r.name, thumb: r.thumb, aspect: r.aspect, sig: serializeSig(r) }))))
    return true
  } catch { return false }
}

// 鏡頭掃描 —— 自研辨識管線（dHash + 色彩直方圖，src/lib/scanner.js），零第三方相依。
export default function Scan() {
  const { setToast, pop } = useNav()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const grabRef = useRef(null)               // 取樣 canvas + context（只建一次）
  const armTimer = useRef(null)
  const trackerRef = useRef(null)
  const stageRef = useRef(null)
  const fileRef = useRef(null)
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
  const [refs, setRefs] = useState(loadRefs)
  const refsRef = useRef(refs); refsRef.current = refs
  // track：追蹤結果（含 matrix3d / pose / corners），null＝目前沒追到
  const [track, setTrack] = useState(null)
  const [seeCard, setSeeCard] = useState(false)   // 有沒有看到「一張卡片」（不論認不認得）
  const [lastAdded, setLastAdded] = useState(null) // 剛登錄的 chip id（閃爍確認）
  const [armId, setArmId] = useState(null)         // 兩段式刪除：已武裝的 chip id
  // 官方卡包：進頁自動載入，使用者不必自己登錄就有東西可掃。
  // ⚠️ 與使用者自訂登錄是**兩份清單**：官方卡不可被使用者刪掉，
  //    使用者的卡也不會因為官方卡包更新而消失。
  const [official, setOfficial] = useState([])
  const officialRef = useRef(official); officialRef.current = official
  const [officialErr, setOfficialErr] = useState(null)
  // 命中的卡面熱區（瞄準或點擊卡上的物件）
  const [hotspot, setHotspot] = useState(null)
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
      if (list.length) trackerRef.current?.setRefs([...list, ...refsRef.current])
    }).catch(() => { if (!cancelled) setOfficialErr([{ card: '官方卡包', message: '載入失敗' }]) })
    return () => { cancelled = true }
  }, [])

  // ---- 模擬掃描（僅開發模式）----
  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (!new URLSearchParams(location.search).has('simulate')) return
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
      if (simRef.current) return          // 模擬模式不開相機
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
      refs: [...officialRef.current, ...refsRef.current],
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
      tracker.setRefs([...officialRef.current, ...refsRef.current])
      const res = tracker.track(frame.data, frame.w, frame.h)
      setTrack(res)
      // 沒有登錄任何卡片時，仍然回報「有沒有看到一張卡片」，
      // 這樣登錄前的引導才知道要不要提示使用者對準
      if (!refsRef.current.length) {
        setSeeCard(!!detectQuad(toGray(frame.data, frame.w, frame.h), frame.w, frame.h))
      } else setSeeCard(!!res)

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
      } else if (latchRef.current.current) {
        latchRef.current.reset()
        setHotspot(null)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [status])

  // ---- 登錄目前畫面為卡片 ----
  const register = () => {
    const frame = grabFrame()
    if (!frame) { setToast('鏡頭尚未就緒'); return }
    if (refs.length >= MAX_REFS) { setToast(`最多登錄 ${MAX_REFS} 張，請先刪除舊的`); return }
    // ⚠️ 一定要登錄「偵測到卡片後拉正的那一張」，不是畫面中央的裁切。
    //    追蹤時比對的是拉正圖，兩邊必須是同一個座標系，否則永遠對不上。
    const quad = detectQuad(toGray(frame.data, frame.w, frame.h), frame.w, frame.h)
    if (!quad) { setToast('沒有看到卡片——請讓整張卡片入框，背景盡量單純'); return }
    const flat = rectify(frame.data, frame.w, frame.h, quad.corners, RECT)
    const sig = makeSignature(flat, RECT, RECT)
    if (sig.sharp < 18) { setToast('畫面太模糊，請對穩後再登錄'); return }
    const dup = refs.find(r => matchScore(sig, r) >= 88)
    if (dup) { setToast(`這張看起來已登錄過（${dup.name}）`); return }
    // 縮圖：直接用拉正後的影像，之後在清單裡看到的就是「系統認得的那一面」
    const tv = document.createElement('canvas')
    tv.width = RECT; tv.height = RECT
    tv.getContext('2d').putImageData(new ImageData(flat, RECT, RECT), 0, 0)
    const thumb = tv.toDataURL('image/jpeg', 0.7)
    const serial = refs.reduce((mx, r) => Math.max(mx, Number((r.name.match(/(\d+)\s*$/) || [])[1]) || 0), 0) + 1
    // 由四邊形的兩組對邊平均長度推長寬比（給疊加層排版用）
    const side = (a, b) => Math.hypot(quad.corners[b][0] - quad.corners[a][0], quad.corners[b][1] - quad.corners[a][1])
    const aspect = ((side(0, 1) + side(3, 2)) / 2) / Math.max(1e-6, (side(1, 2) + side(0, 3)) / 2)
    const ref = { id: `card-${Date.now()}`, name: `卡片 ${serial}`, thumb, aspect, hash: sig.hash, hist: sig.hist }
    const next = [...refs, ref]
    if (!saveRefs(next)) { setToast('儲存空間不足，請刪除舊卡片'); return }
    setRefs(next)
    trackerRef.current?.reset()
    setLastAdded(ref.id)
    setTimeout(() => setLastAdded(v => (v === ref.id ? null : v)), 1400)
    requestAnimationFrame(() => document.getElementById(ref.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    setToast(`已登錄「${ref.name}」——現在把鏡頭對著它，內容會直接貼上去`)
  }

  // ---- 從圖片檔登錄（.mind 那種「給我原圖」的流程）----
  //
  // 為什麼需要這條路：使用者手上有的是**設計檔**，不是印出來的實體。要他先印出來、
  // 再拿相機對著登錄，等於把最麻煩的一步留給他，而且相機登錄的品質受當下光線影響。
  // 直接吃原圖既準又快，而且同一份設計可以先登錄、之後再印。
  //
  // ⚠️ 關鍵：原圖要用**與追蹤時完全相同的正規化**——rectify() 是把偵測到的四邊形
  //    壓成 RECT×RECT 的正方形（不管卡片本身是幾比幾），所以這裡也要把整張圖
  //    壓成 RECT×RECT。任何一邊改成「保持比例」，兩邊的 dHash 就不在同一個
  //    座標系，永遠對不上——而且是靜默失敗，只會顯示「看到卡片了，但不是登錄過的」。
  const registerFromFile = async (file) => {
    if (!file) return
    if (refs.length >= MAX_REFS) { setToast(`最多登錄 ${MAX_REFS} 張，請先刪除舊的`); return }
    if (!/^image\//.test(file.type)) { setToast('請選圖片檔（PNG／JPG／WebP）'); return }
    let bmp
    try {
      bmp = typeof createImageBitmap === 'function'
        ? await createImageBitmap(file)
        : await new Promise((res, rej) => {
          const img = new Image()
          img.onload = () => res(img); img.onerror = rej
          img.src = URL.createObjectURL(file)
        })
    } catch { setToast('這個圖片讀不進來，換一張試試'); return }
    const iw = bmp.width || bmp.naturalWidth, ih = bmp.height || bmp.naturalHeight
    if (!iw || !ih) { setToast('這個圖片讀不進來，換一張試試'); return }

    const cv = document.createElement('canvas')
    cv.width = RECT; cv.height = RECT
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bmp, 0, 0, RECT, RECT)          // 與 rectify 一樣壓成正方形
    const flat = ctx.getImageData(0, 0, RECT, RECT).data
    const sig = makeSignature(flat, RECT, RECT)
    const dup = refs.find(r => matchScore(sig, r) >= 88)
    if (dup) { setToast(`這張看起來已登錄過（${dup.name}）`); return }

    // 縮圖保留原比例，清單上看得出是哪一張
    const tw = 120, th = Math.max(40, Math.round(120 * ih / iw))
    const tv = document.createElement('canvas')
    tv.width = tw; tv.height = th
    tv.getContext('2d').drawImage(bmp, 0, 0, tw, th)
    const name = (file.name || '').replace(/\.[^.]+$/, '').slice(0, 16)
      || `卡片 ${refs.length + 1}`
    const ref = {
      id: `card-${Date.now()}`, name, thumb: tv.toDataURL('image/jpeg', 0.7),
      aspect: iw / ih, hash: sig.hash, hist: sig.hist,
    }
    const next = [...refs, ref]
    if (!saveRefs(next)) { setToast('儲存空間不足，請刪除舊卡片'); return }
    setRefs(next)
    trackerRef.current?.reset()
    setLastAdded(ref.id)
    setTimeout(() => setLastAdded(v => (v === ref.id ? null : v)), 1400)
    setToast(`已登錄「${ref.name}」——把印出來的那張放進框內就會跳出內容`)
    bmp.close?.()
  }

  // 兩段式刪除：第一次點 ✕ 武裝（變朱紅），2.5 秒內再點一次才真的刪
  const askRemove = (r) => {
    if (armId === r.id) {
      clearTimeout(armTimer.current)
      setArmId(null)
      if (pendingRef.current === r.id) pendingRef.current = null
      const next = refs.filter(x => x.id !== r.id)
      setRefs(next); saveRefs(next)
      setToast(`已刪除「${r.name}」`)
    } else {
      setArmId(r.id)
      setToast('再按一次 ✕ 確認刪除')
      clearTimeout(armTimer.current)
      armTimer.current = setTimeout(() => setArmId(null), 2500)
    }
  }
  useEffect(() => () => clearTimeout(armTimer.current), [])

  // ⚠️ 曆訊要用「今天」不是錨點：dayFor(0) 是錨點 6/6，不是今天。
  const d = dayFor(todayOffset())
  const tracking = !!track

  // aria-live 只播報「階段」不播分數——追蹤是每秒 15 次，播分數會變成朗讀轟炸
  const phaseText = status !== 'ready' ? '　'
    : !refs.length
      ? (seeCard
        ? '看到一張卡片了——按下方「登錄這張卡片」，之後對到它就會跳出內容'
        : '尚未登錄卡片——把整張卡片放進框內，背景盡量單純')
      : tracking ? `已對準：${track.ref.name}`
        : seeCard ? '看到卡片了，但不是登錄過的那一張'
          : '掃描中——把登錄過的卡片放進框內'

  return (
    <>
      <TopBar title="AR 掃描｜卡片一入鏡就跳出內容" onBack />
      <div className="body scan-body">
        <div className="scan-stage" ref={stageRef}>
          {status === 'ready' && <video ref={videoRef} className="scan-video" autoPlay playsInline muted />}
          {status !== 'ready' && (
            <div className="scan-fallback">
              <Icon name="camera" style={{ width: 46, height: 46, stroke: 'var(--pfg)' }} />
              <p>
                {status === 'loading' && '正在開啟鏡頭…'}
                {status === 'denied' && '尚未允許使用相機。請在瀏覽器允許相機權限後再試。'}
                {status === 'unsupported' && '此裝置或環境無法使用相機（需 HTTPS 與相機硬體）。'}
              </p>
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
              {obj.link && (
                <Link screen={obj.link.screen} props={obj.link.props} className="btn-ghost tap">
                  {obj.link.label} ›
                </Link>
              )}
            </div>
          )
        })()}

        {/* ── 官方卡片：進頁就能掃，不必自己登錄 ── */}
        <div className="scan-official">
          <SectionHead title="官方節氣卡片" />
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
                <Link screen="arCard" props={{ slug: c.slug }} className="btn-ghost tap"
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
                trackerRef.current?.setRefs([...next, ...refsRef.current])
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

        <div className="scan-acts">
          {/* 兩條登錄路徑：有設計檔就直接吃原圖（準又快），沒有就拿相機對著實體登錄。
              ⚠️ 官方卡包上線後這兩條**刻意保留**，只是位置往下移＝降級為進階選項。 */}
          <SectionHead title="自訂掃描目標" />
          <button className="btn-primary tap" onClick={() => fileRef.current?.click()}>
            <Icon name="scroll" style={{ width: 18, height: 18, stroke: 'var(--pfg)', verticalAlign: '-3px', marginRight: 6 }} />
            從圖片檔登錄目標
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden
            aria-label="選擇要當作掃描目標的圖片檔"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; registerFromFile(f) }} />
          <button className="btn-ghost tap" onClick={register} disabled={status !== 'ready'}
            style={{ marginTop: 8, ...(status !== 'ready' ? { opacity: .55 } : null) }}>
            <Icon name="scan" style={{ width: 18, height: 18, stroke: 'currentColor', verticalAlign: '-3px', marginRight: 6 }} />
            改用相機對著實體登錄
          </button>
          <p className="muted scan-soon">
            自研平面追蹤：偵測卡片的四個角 → 透視拉正 → 比對登錄過的目標 → 解出姿態，
            內容就直接貼在卡片上並跟著傾斜。全程在你的裝置上運算，影像不上傳、零第三方相依。
            <br />
            <b>可以登錄多張</b>（上限 {MAX_REFS} 張），全部在這一頁一起掃——鏡頭對到哪一張就跳出哪一張的內容。
            <br />
            適合<b>有明確邊框的印刷品</b>（月曆頁、明信片、手帳頁）。把整張放進框內、
            紙張與背景顏色差越多越穩；純白桌面上放白紙會找不到邊。
          </p>
        </div>

        {/* 已登錄卡片（放在按鈕之後：登錄時按鈕不跳位） */}
        {refs.length > 0 && (
          <div className="scan-refs">
            {refs.map(r => (
              <div key={r.id} id={r.id} className={`scan-refchip ${r.id === lastAdded ? 'just-added' : ''}`}>
                <img src={r.thumb} alt={r.name} />
                <div className="nm">{r.name}</div>
                <button className={`del tap ${armId === r.id ? 'arm' : ''}`}
                  aria-label={armId === r.id ? `再按一次確認刪除 ${r.name}` : `刪除 ${r.name}`}
                  onClick={() => askRemove(r)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  )
}
