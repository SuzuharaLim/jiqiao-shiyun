import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { dayFor, todayOffset } from '../data/almanac.js'
import { makeSignature, matchScore, serializeSig, deserializeSig } from '../lib/scanner.js'
import { detectQuad, rectify } from '../lib/quadDetect.js'
import { toGray } from '../lib/scanner.js'
import { createTracker, makeThrottle } from '../lib/arTracker.js'
import ARScene from '../components/ARScene.jsx'

// 取樣尺寸：GRAB = 相機取樣畫面；RECT = 拉正後的方形邊長（辨識用）
const GRAB_LONG = 160        // 取樣畫面的長邊（短邊照顯示框比例算）
const RECT = 48
const MIN_SCORE = 58        // 匹配門檻（0–100）
const MAX_REFS = 12         // 登錄上限（localStorage 空間考量）
// ⚠️ 換 key 是刻意的：舊版登錄的是「畫面中央 128×96 的裁切」，新版登錄的是
//    「偵測到卡片後透視拉正的 48×48」。兩者的 dHash 不在同一個座標系，
//    直接沿用會讓所有舊卡片永遠對不上（而且是靜默的——使用者只會覺得
//    「以前可以現在不行」）。換 key 等於請使用者重新登錄一次，誠實且乾淨。
const LS_KEY = 'jq-ar-cards-v2'

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
      if (valid) out.push({ ...r, ...deserializeSig(r.sig) })
    } catch { /* 剔除單筆壞資料 */ }
  }
  return out
}
function saveRefs(refs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(refs.map(r => ({ id: r.id, name: r.name, thumb: r.thumb, sig: serializeSig(r) }))))
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

  // ---- 開關相機 ----
  useEffect(() => {
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, audio: false,
        }).catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }))
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
    const tracker = createTracker({ refs: refsRef.current, rectifySize: RECT, minScore: MIN_SCORE })
    trackerRef.current = tracker
    const shouldRun = makeThrottle(15)
    let raf = 0, alive = true
    const loop = (now) => {
      if (!alive) return
      raf = requestAnimationFrame(loop)
      if (!shouldRun(now)) return
      const frame = grabFrame()
      if (!frame) return
      tracker.setRefs(refsRef.current)
      const res = tracker.track(frame.data, frame.w, frame.h)
      setTrack(res)
      // 沒有登錄任何卡片時，仍然回報「有沒有看到一張卡片」，
      // 這樣登錄前的引導才知道要不要提示使用者對準
      if (!refsRef.current.length) {
        setSeeCard(!!detectQuad(toGray(frame.data, frame.w, frame.h), frame.w, frame.h))
      } else setSeeCard(!!res)
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
    const ref = { id: `card-${Date.now()}`, name: `卡片 ${serial}`, thumb, hash: sig.hash, hist: sig.hist }
    const next = [...refs, ref]
    if (!saveRefs(next)) { setToast('儲存空間不足，請刪除舊卡片'); return }
    setRefs(next)
    trackerRef.current?.reset()
    setLastAdded(ref.id)
    setTimeout(() => setLastAdded(v => (v === ref.id ? null : v)), 1400)
    requestAnimationFrame(() => document.getElementById(ref.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    setToast(`已登錄「${ref.name}」——現在把鏡頭對著它，內容會直接貼上去`)
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

        <div className="scan-acts">
          <button className="btn-primary tap" onClick={register} disabled={status !== 'ready'}
            style={status !== 'ready' ? { opacity: .55 } : null}>
            <Icon name="scan" style={{ width: 18, height: 18, stroke: 'var(--pfg)', verticalAlign: '-3px', marginRight: 6 }} />登錄這張卡片
          </button>
          <p className="muted scan-soon">
            自研平面追蹤：偵測卡片的四個角 → 透視拉正 → 比對登錄過的卡片 → 解出姿態，
            內容就直接貼在卡片上並跟著傾斜。全程在你的裝置上運算，影像不上傳、零第三方相依。
            <br />
            適合有明確邊框的印刷品（卡片、手帳頁）；背景越單純越穩。
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
