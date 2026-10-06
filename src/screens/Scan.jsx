import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SectionHead, Link } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { OFFICIAL_CARDS, objectForHotspot } from '../data/arCards.js'
import { AR_CATS } from '../data/arCats.js'
import { createSession, inAppBrowser } from '../ar/session.js'
import { isCompat, enableCompatAndReload, disableCompat } from '../ar/tfjsCompat.js'
import SpeakButton from '../components/SpeakButton.jsx'

// ============================================================================
// AR 掃描 —— 這一頁只是 `src/ar/session.js` 狀態的**純函式**
//
// 所有邏輯（相機、追蹤、算繪、看門狗、探測）都在 `src/ar/` 底下，這裡不碰
// getUserMedia、不碰 three、不碰 MindAR。畫面要顯示什麼，只取決於 `phase`
// 這一個值——不可能再出現「畫面說掃描中、其實引擎沒起來」。
//
// ⚠️ <video> 與 <canvas> **由 React 渲染**，疊層寫在樣式表裡。
//    舊版是讓函式庫自己 createElement 再 appendChild，它預設 `z-index:-2`，
//    在本站的深色取景框底下 ⇒ 畫面全黑，而追蹤數字全部正常。
//    交還給 React 之後，那一類 bug 在結構上就不可能發生了。
// ============================================================================

const CARD = OFFICIAL_CARDS[0] ?? null

/**
 * 特徵點數量的判讀門檻（實測值）。
 * 這是**影像品質**的直接量測，不是「有沒有對準」。
 */
const FEAT_GOOD = 120
const FEAT_WEAK = 40

function featureVerdict(n) {
  if (n === null || n === undefined) return null
  if (n >= FEAT_GOOD) return { level: 'ok', text: '畫面清晰度足夠' }
  if (n >= FEAT_WEAK) return { level: 'warn', text: '偏少——再靠近一點' }
  return { level: 'bad', text: '太少：太遠／太暗／糊掉／反光' }
}

/**
 * ★ 認出卡片之後、跳去模型頁之前，先停這麼久。
 *
 * ⚠️ 不可設 0：辨識成功是這條動線唯一的「成了！」時刻，畫面瞬間換掉的話
 *    使用者不知道剛剛發生什麼事，只覺得「按一按就跳走了」。停一下讓取景框
 *    轉成命中色、狀態列說出卡片名稱，那一秒是回饋不是延遲。
 * ⚠️ 也不可太久：超過一秒半，手已經放下卡片了還在等，會以為當掉。
 */
const JUMP_DELAY_MS = 900

export default function Scan() {
  const { setToast, push } = useNav()
  const stageRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const sessionRef = useRef(null)

  const [st, setSt] = useState({ phase: 'idle', hotspot: null, features: null, cameras: [], ticks: 0 })
  const [inApp] = useState(() => inAppBrowser())
  const [showDiag, setShowDiag] = useState(false)
  const [info, setInfo] = useState(null)
  const [selfTest, setSelfTest] = useState('idle')
  // ⚠️ 這一個**必須**宣告在這裡（所有讀它的 const 之前）：`failedTest` 與
  //    `imageTrackingDead` 都讀它，而 `const` 有暫時性死區——順序反過來會丟
  //    「Cannot access before initialization」，整個畫面被 ErrorBoundary 接走，
  //    而 `npm run build` 一個字都不會報。這個坑這一頁已經踩過一次（longSearch）。
  const [cpuTried, setCpuTried] = useState(false)
  const [camId, setCamId] = useState(null)

  const { phase, hotspot, features, cameras } = st
  const live = phase === 'searching' || phase === 'locked' || phase === 'stalled'

  // ── 啟動／重啟 ──
  // ⚠️ 一定要在使用者手勢的呼叫堆疊裡：iOS 上 getUserMedia 與 video.play()
  //    在手勢裡可靠得多，自動啟動很容易拿到權限卻播不動（靜默失敗）。
  const boot = useCallback((deviceId = null) => {
    try { sessionRef.current?.dispose() } catch { /* ignore */ }
    setSelfTest('idle')
    const s = createSession({
      video: videoRef.current,
      canvas: canvasRef.current,
      container: stageRef.current,
      card: CARD,
      onState: setSt,
    })
    sessionRef.current = s
    s.start({ deviceId })
  }, [])

  useEffect(() => () => {
    // ⚠️ 卸載一定要 dispose：關相機軌道（否則指示燈還亮著）＋釋放 WebGL context
    //    （否則反覆進出會「第 N 次打開變成空白」）。
    try { sessionRef.current?.dispose() } catch { /* ignore */ }
    sessionRef.current = null
  }, [])

  // ── ★★★ 認出卡片 → 跳轉到 A-Frame 模型頁 ──
  //
  // 這是這條動線的核心決定：**辨識只需要成功一次**。
  // 把角色貼在卡片上的話，追蹤一斷內容就消失，使用者得一直維持手、卡片、
  // 光線三者都對——而那正是先前「掃得到卻用不起來」的主因。認出來就跳走之後，
  // 看模型不再依賴相機，可以放下卡片、雙手轉動觀察。
  //
  // ⚠️ 跳轉前要把熱區一起帶過去：使用者剛剛瞄準的是哪一區，模型頁就先講那一區
  //    的內容。沒帶的話等於忽略他剛才做的瞄準動作。
  // ⚠️ 只跳一次（`jumpedRef`）：追蹤會反覆 found/lost，不鎖的話一旦回到這一頁
  //    又追到就會再跳一次，使用者會被彈來彈去而且上一頁行為變得莫名其妙。
  const jumpedRef = useRef(false)
  // ★★ 熱區用 ref 讀，**不可以放進 deps**。
  //
  // ⚠️ 這裡踩過一次而且完全靜默：熱區是遲滯確認的（要連 3 幀），所以「認出來」
  //    之後約 0.3 秒 `hotspot` 才會從 null 變成實際那一區 ⇒ effect 重跑 ⇒
  //    cleanup 把計時器清掉 ⇒ 但 `jumpedRef.current` 已經是 true ⇒ 提早 return、
  //    **不再重新排程** ⇒ 跳轉永遠不會發生。
  //    畫面上只看得到「認出來了…正在開啟 3D 模型…」然後就停在那裡——
  //    狀態列說得斬釘截鐵，實際上什麼都不會來。
  const hotspotRef = useRef(null)
  hotspotRef.current = hotspot
  useEffect(() => {
    if (phase !== 'locked' || jumpedRef.current || !CARD) return
    jumpedRef.current = true
    const t = setTimeout(() => {
      push('arModel', { slug: CARD.slug, hotspot: hotspotRef.current?.id ?? null })
    }, JUMP_DELAY_MS)
    return () => clearTimeout(t)
  }, [phase, push])

  // 找了一段時間還沒認出來 —— 用來把毫無資訊的「掃描中」升級成講得出原因的訊息。
  // ⚠️ 這一段**必須**放在下面 `stuck` 之前：`stuck` 讀 `longSearch`，而 `const` 有
  //    暫時性死區（TDZ）。順序反過來會丟「Cannot access before initialization」，
  //    整個畫面被 ErrorBoundary 接走，而 `npm run build` 一個字都不會報。
  const [longSearch, setLongSearch] = useState(false)
  useEffect(() => {
    if (phase !== 'searching') { setLongSearch(false); return }
    // ★★ 3.5 秒，不是 8 秒。
    //
    // ⚠️ 2026-08-11 已證實：**MindAR 在某些 GPU 上根本不能用**（Samsung
    //    Xclipse 540 / ANGLE on Vulkan——連 MindAR 官方文件的原版範例
    //    `/ar/plain.html` 在該機上也認不出來，那一頁沒有本站任何一行邏輯）。
    //    對那種裝置，等 8 秒只是讓人白白對著卡片喬角度——結論早就註定了。
    //    正常裝置實測 1.5~2.6 秒就命中，所以 3.5 秒不會誤傷它們。
    const t = setTimeout(() => setLongSearch(true), 3500)
    return () => clearTimeout(t)
  }, [phase])

  // ★★★ 「卡住」的定義：找了一段時間 ＋ 畫面夠清楚 ＋ 比對迴圈在跑 ＋ 就是沒命中。
  //   這三個條件同時成立時，前面所有常見原因（當機／太暗／手震／太遠）都已被排除，
  //   所以畫面**必須**改口說別的——原本它還在講「把卡片放進框內」，那是廢話。
  const stuck = longSearch
    && features !== null && features >= FEAT_GOOD
    && (st.tps ?? 0) > 0

  // ★★★ 圖像辨識在這台裝置上已經確定不可用。
  //
  // 判準是**自我測試失敗**——那是拿「網站內建、保證正確的卡面圖」走完全相同的
  // 辨識流程，與相機、卡片、光線、距離全部無關。它失敗就代表這台機器的
  // MindAR／TFJS 算不出正確結果。
  // ⚠️ 2026-08-11 已用 MindAR **官方文件的原版範例**（`/ar/plain.html`，
  //    不含本站任何一行邏輯）在 Samsung Xclipse 540 / ANGLE on Vulkan 上證實：
  //    官方版也認不出來 ⇒ 這是函式庫與該 GPU 不相容，調程式解決不了。
  // ⇒ 所以這時候**唯一該做的事就是把使用者導向 QR**，而不是繼續叫他喬角度。
  //
  // ⚠️ 但**在宣告死亡之前還有一條路要走**：改用「編譯 `.mind` 時用的那份 CPU
  //    kernel」重算（見 `src/ar/cpuPipeline.js`）。`.mind` 裡的描述子就是 CPU
  //    kernel 產出的，執行期卻跑 WebGL 版——兩者本來就只是「應該」一致。
  //    所以自我測試失敗在 `match`／`pipeline` 時，先切 CPU 再測一次，
  //    兩次都失敗才算確定不可用。
  const RETRY_ON_CPU = new Set(['match', 'pipeline'])
  const failedTest = selfTest !== 'idle' && selfTest !== 'running' && !selfTest.ok
  const imageTrackingDead = failedTest && (cpuTried || !RETRY_ON_CPU.has(selfTest.stage))
  const qrOnly = imageTrackingDead && st.qrReady
  // ⚠️ 「還沒有定論」要包含「已經失敗、但 CPU 重試還沒跑」那一格 render——
  //    下面那個 effect 是在 render **之後**才執行的，少了這一項，畫面會閃一下
  //    「圖像辨識沒救了，去用 QR」然後又跳回「檢查中」。那種閃動比慢更傷信任。
  const testPending = selfTest === 'idle' || selfTest === 'running' || (failedTest && !imageTrackingDead)

  // ★★★ 自我測試在 WebGL 上失敗 ⇒ 自動改用 CPU 後端再測一次。
  //
  // ⚠️ 這一步一定要**自動**，不能做成按鈕：它要成立的前提（「.mind 是 CPU
  //    kernel 編的、執行期跑的是 WebGL 版」）是上游原始碼裡的實作細節，
  //    使用者不可能知道，也就不可能自己決定要不要按。
  // ⚠️ 只試一次（`cpuTried`）：CPU 慢很多，反覆重建追蹤器會讓畫面一直頓，
  //    而結論不會因為多試一次而改變。
  useEffect(() => {
    if (cpuTried || !failedTest || !RETRY_ON_CPU.has(selfTest.stage)) return
    const s = sessionRef.current
    if (!s || !CARD) return
    setCpuTried(true)
    setSelfTest('running')
    ;(async () => {
      const ok = await s.switchBackend('cpu')
      if (!ok) {
        setSelfTest({ ok: false, stage: 'match', reason: '切換 CPU 運算失敗' })
        return
      }
      setSelfTest(await s.selfTest(CARD.target))
    })().catch(() => setSelfTest({ ok: false, stage: 'match', reason: 'CPU 運算測試中斷' }))
  }, [failedTest, cpuTried])

  // 到了那個狀態就**自動**跑一次自我測試。
  // ⚠️ 不要叫使用者自己去找按鈕：他正處在「一直失敗」的情緒裡，而這個測試的
  //    結果是把原因一刀切成兩半的唯一資訊（裝置運算壞掉 vs 圖不對）。
  // ⚠️ 只跑一次（`autoTestedRef`）：它會暫停即時迴圈，反覆跑會讓畫面一直頓。
  const autoTestedRef = useRef(false)
  useEffect(() => {
    if (!stuck || autoTestedRef.current || !sessionRef.current || !CARD) return
    autoTestedRef.current = true
    setSelfTest('running')
    sessionRef.current.selfTest(CARD.target).then(setSelfTest).catch(() => setSelfTest('idle'))
  }, [stuck])

  // 轉向／版面改變要重算投影，否則 3D 與影像對不上。
  useEffect(() => {
    const on = () => sessionRef.current?.resize()
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])

  useEffect(() => {
    if (!showDiag) { setInfo(null); return }
    const t = setInterval(() => setInfo(sessionRef.current?.info() ?? null), 1000)
    setInfo(sessionRef.current?.info() ?? null)
    return () => clearInterval(t)
  }, [showDiag])

  const onStageTap = (e) => { sessionRef.current?.pick(e.clientX, e.clientY) }

  const obj = hotspot ? objectForHotspot(hotspot) : null
  const fv = featureVerdict(features)

  // ── 狀態列：一句話說清楚現在是什麼情況 ──
  const STATUS = {
    idle: '把實體卡片準備好，按下方按鈕開始。',
    insecure: '這個網址不是安全連線，瀏覽器不允許使用相機。',
    'no-webgl': '這個瀏覽器沒有 3D 繪圖能力（WebGL），AR 無法運作。',
    'no-camera': '找不到可用的相機。',
    'no-target': '目標檔尚未安裝——這一頁目前掃不到任何卡片。',
    opening: '正在要求相機權限…',
    denied: '尚未允許使用相機。',
    loading: '正在載入辨識引擎…（第一次會久一點）',
    stalled: '比對程序沒有在執行——這不是沒對準。',
  }

  return (
    <>
      <TopBar title="AR 掃描｜卡片一入鏡就跳出內容" onBack />
      <div className="body scan-body">
        <div className="scan-stage" ref={stageRef} onPointerDown={phase === 'locked' ? onStageTap : undefined}>
          {/* ⚠️ video 與 canvas 一律渲染（不可依 phase 條件掛載）：
              session 在 start() 裡就要拿到這兩個節點，條件渲染會讓它拿到 null。
              看不看得見交給 CSS 的 hidden 屬性。 */}
          <video ref={videoRef} className="scan-video" playsInline muted hidden={!live} />
          <canvas ref={canvasRef} className="scan-canvas" hidden={!live} />

          {!live && (
            <div className="scan-fallback">
              <Icon name="camera" style={{ width: 46, height: 46, stroke: 'var(--pfg)' }} />
              <p>{STATUS[phase] ?? (st.error ? `啟動失敗：${st.error}` : '　')}</p>

              {/* ── 內建瀏覽器：這是「怎麼改程式都不會好」的一類 ── */}
              {inApp && (
                <p className="scan-diag-verdict warn" style={{ textAlign: 'left' }}>
                  <b>你正在用 {inApp} 的內建瀏覽器開這一頁。</b>
                  <br />那些 App 內建的瀏覽器常常擋掉或閹割相機與 3D 繪圖，AR 很可能
                  無法運作，而且<b>不會出現任何錯誤訊息</b>。
                  <br /><b>請點右上角的「⋯」選「用預設瀏覽器開啟」</b>（Safari 或 Chrome）再試。
                </p>
              )}

              {(phase === 'idle' || phase === 'denied' || phase === 'failed') && (
                <button className="btn-primary tap" onClick={() => boot(camId)} style={{ marginTop: 'var(--space-3)' }}>
                  {phase === 'idle' ? '允許相機並開始掃描' : '再試一次'}
                </button>
              )}

              {/* ── 不要讓這裡變成死路 ──
                  桌機、拒絕權限、沒有相機的人到這裡原本只有一行字就走不下去了。
                  ⚠️ 但也**不自動導走**：`denied` 常常只是還沒按「允許」，
                     直接把人送去別頁等於替他放棄那條路。給出路、讓他選。 */}
              {phase !== 'opening' && phase !== 'loading' && CARD && (
                <div className="scan-fallback-out">
                  <Link screen="arCard" params={{ slug: CARD.slug }} className="btn-primary tap">
                    沒有相機？看示範內容 ›
                  </Link>
                  <p className="muted">
                    那一頁不用相機也能走完：卡面、六個物件、3D 白菜、小挑戰、徽章都在。
                  </p>
                </div>
              )}
            </div>
          )}

          <div className={`scan-frame ${phase === 'locked' ? 'hit' : ''}`} aria-hidden="true">
            <span className="c tl" /><span className="c tr" /><span className="c bl" /><span className="c br" />
            {phase === 'searching' && <div className="scan-line" />}
          </div>
        </div>

        {/* ── ★★★ 即時特徵點計 —— 這一版最重要的新東西 ──
            舊版在「還沒認出來」時只能給罐頭提示，而使用者無從知道自己的調整
            有沒有讓情況變好。這個數字是**相機這一幀真的找到幾個特徵點**，
            會隨著距離、光線、對焦即時變動——把盲目試誤變成有回饋的調整。
            ⚠️ 它量的是**影像品質**不是「有沒有對準」：數字很高卻認不出來，
               代表問題在角度或卡片版本，不在畫面。 */}
        {/* ★ 確定不可用之後，「畫面特徵點」這個數字已經沒有意義了——
            它量的是影像品質，而問題不在影像。繼續顯示只會讓人以為還有得調。 */}
        {phase === 'searching' && qrOnly && (
          <div className="scan-meter ok scan-qr-cta" style={{ marginTop: 'var(--space-3)' }}>
            <span><b>請對準卡片左下角的 QR code</b>——那條路不經過出問題的運算</span>
          </div>
        )}
        {phase === 'searching' && !qrOnly && (
          <>
            <div className={`scan-meter ${fv?.level ?? ''}`}>
              <div className="scan-meter-bar">
                <i style={{ width: `${Math.min(100, ((features ?? 0) / FEAT_GOOD) * 100)}%` }} />
              </div>
              <span>
                畫面特徵點 <b>{features ?? '量測中…'}</b>
                {fv && <> — {fv.text}</>}
                {/* ★★ 心跳一定要**看得見**。
                    使用者回報「掃不到」時，只有這個數字能把兩件完全不同的事分開：
                    比對迴圈根本沒在跑（＝程式的問題），還是迴圈在跑但認不出這張卡
                    （＝卡片／目標檔的問題）。藏在診斷面板裡等於沒有。 */}
                {st.tps !== null && st.tps !== undefined && (
                  <>　比對 <b>{st.tps}</b> 輪/秒</>
                )}
                {/* ★★★ 比對成功次數 —— 到這一步，這是唯一還能再細分的數字：
                       > 0 ⇒ 卡片**有**被認出來，卡在後面（追蹤／狀態轉換）
                       = 0 ⇒ 比對真的沒成功（圖不對／鏡頭不對）
                    兩者的下一步完全不同，所以要在搜尋當下就看得見，不能只在面板裡。 */}
                {(st.matches ?? 0) > 0 && <>　<b>已認出 {st.matches} 次</b></>}
              </span>
            </div>

            {/* ★★★ 畫面很好、迴圈也在跑，卻一直認不出來 —— 這種狀態原本沒有任何訊息，
                使用者只會看到「掃描中」跑到天荒地老，然後以為是自己沒對準。
                但特徵點與心跳這兩個數字已經把原因縮到只剩一個了，就該直接講出來。 */}
            {stuck && (
              <div className="scan-nofile">
                <b>比對程序在跑（{st.tps} 輪/秒），畫面也夠清楚（特徵點 {features}），但一直對不上。</b>

                {/* ★★★ 到這裡就**自動跑一次自我測試**，不要叫使用者自己去找按鈕。
                    它拿「網站自己那張卡面圖」走完全相同的辨識流程，於是把剩下的
                    可能一刀切成兩半——而這是使用者無論如何都問不出來的資訊。 */}
                {testPending && (
                  <p className="muted">
                    {cpuTried
                      // ★ 切 CPU 之後要**明講在做什麼**：這一步會停頓好幾秒，
                      //   沒有說明的話跟「當掉了」分不出來。
                      ? '這台裝置的 GPU 算不出正確結果，正在改用相容運算重試…（較慢，請稍候）'
                      : '正在自動檢查這台裝置的辨識運算…（約 3 秒，畫面會暫停一下）'}
                  </p>
                )}

                {/* ★ 已經切到 CPU 而且測過了才顯示：讓使用者知道畫面變慢是預期內的。 */}
                {st.backend === 'cpu' && !testPending && (
                  <p className="muted">目前使用<b>相容運算（CPU）</b>——比較慢是正常的，請把卡片拿穩。</p>
                )}

                {!testPending && (selfTest.ok ? (
                  <>
                    <p>
                      <b>✓ 這台裝置的辨識運算正常</b>——它認得出網站內建的那張卡面圖
                      （第 {selfTest.frames} 幀、{selfTest.ms} ms）。
                      所以問題<b>不在</b>你的手機，也不在光線或手震。
                    </p>
                    <p>
                      剩下兩種可能，由容易到難：
                      <br />① <b>讓卡片佔滿取景框</b>——特徵點會數到整個畫面（桌面、邊框、
                      背景都算），所以 {features} 這個數字高，不代表「卡片本身」佔得夠大。
                      <br />② <b>你掃的那張圖與網站的目標檔不是同一版</b>。
                      最快的驗證法：直接用這支手機打開
                      <b> chengqi.tw/ar/card/{CARD?.slug} </b>
                      看網站上的卡面長什麼樣，再跟你螢幕上那張比對。
                    </p>
                  </>
                ) : selfTest.stage === 'match' ? (
                  <>
                    <p>
                      <b>✗ 這台裝置連網站內建的卡面圖都認不出來</b>（{selfTest.ms} ms）。
                      也就是說<b>問題不在你的卡片</b>——同一張保證正確的圖，在這台裝置上
                      也比對不出來。
                      {/* ★ 已經自動試過 CPU 了就要講：否則下面「還有一招」讀起來像是
                          我們什麼都還沒做，而其實最有機會的那一招已經失敗了。 */}
                      {cpuTried && <>　<b>改用相容運算（CPU）重算也一樣</b>。</>}
                    </p>
                    {/* ★★★ 這台裝置算不對時，唯一還能試的就是換一組比較保守的
                        TFJS 設定（關掉打包運算、強制 32 位元浮點）。它會變慢，
                        所以預設不開——但對已經證明「算不對」的裝置，慢總比不能用好。
                        ⚠️ 必須重新載入：TFJS 初始化過就不會再讀那些設定了。 */}
                    {!isCompat() ? (
                      <>
                        <p>
                          還有一招可以試：<b>相容模式</b>會改用比較保守的運算設定
                          （關掉打包運算、強制 32 位元浮點），專門避開這類驅動問題。
                          會慢一些，但這台裝置目前是完全認不出來。
                        </p>
                        <button className="btn-primary tap" onClick={enableCompatAndReload}>
                          改用相容模式重試（會重新載入）
                        </button>
                      </>
                    ) : (
                      <>
                        {/* ★★★ 到這一步，圖像辨識在這台裝置上已經確定沒救了
                            （相容模式也試過）。但如果它支援原生 QR 偵測，那條路
                            **完全不經過出問題的運算**——這時候最該講的是「去對 QR」，
                            而不是叫使用者複製診斷資料。
                            ⚠️ 先前這裡只寫了「請複製診斷資料」，等於把唯一還能用的
                               路藏起來——使用者卡在這裡卻不知道有救。 */}
                        {st.qrReady ? (
                          <>
                            <p>
                              <b>相容模式也試過了，圖像辨識在這台手機上就是不行。</b>
                              這是它的繪圖驅動與辨識運算不相容，不是你或卡片的問題。
                            </p>
                            <p className="scan-qr-cta">
                              <b>但這支手機支援 QR 掃描，所以還有一條路：</b>
                              <br />把鏡頭對準<b>卡片左下角的 QR code</b>，讓它填滿畫面中央一點，
                              就會直接跳出內容。那條路用的是瀏覽器內建的條碼偵測，
                              <b>完全不經過出問題的那段運算</b>。
                            </p>
                          </>
                        ) : (
                          <>
                            {/* ★★★ 沒有 QR 備援時**絕不可以只叫人複製診斷資料**——那是
                                給我們的，不是給他的，等於把使用者留在一個死路上。
                                ⚠️ 這一格在 **iPhone 上是常態**：`BarcodeDetector` 是
                                   Chrome／Android 的 API，**iOS Safari 至今沒有實作**，
                                   所以 `qrReady` 在每一支 iPhone 上都是 false。
                                   也就是說「圖像辨識掛掉的 iPhone」百分之百會走到這裡。
                                ⇒ 這時候真正還能用的是 `/ar/card/:slug`——那一頁本來就是
                                   為「沒有相機／不想開相機」設計的，卡面、六個物件、
                                   3D 白菜、小挑戰、徽章全都在，內容一點都沒少。 */}
                            <p>
                              <b>相容模式已經開著，仍然認不出來。</b>
                              那就不是設定能解決的了——這台裝置的繪圖驅動與辨識運算不相容。
                            </p>
                            <p>
                              <b>但你手上的卡片還是能用</b>：卡片頁有一模一樣的內容，
                              而且完全不需要相機。
                            </p>
                            <Link screen="arCard" params={{ slug: CARD.slug }} className="btn-primary tap">
                              改看這張卡的完整內容 ›
                            </Link>
                            <p className="muted">
                              如果願意幫我們一把：按下方「掃描診斷 → 複製診斷資料」貼給我們，
                              那是修好這台裝置唯一需要的東西。
                            </p>
                          </>
                        )}
                        <button className="btn-ghost tap" onClick={() => { disableCompat(); location.reload() }}>
                          關掉相容模式
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <p>
                      <b>✗ 辨識運算在這台裝置上跑不起來</b>（{selfTest.stage}）：
                      <code>{selfTest.reason}</code>
                    </p>
                    {/* 同上：任何一種「沒救了」都要給得出下一步，不可以只報錯誤碼。 */}
                    <Link screen="arCard" params={{ slug: CARD.slug }} className="btn-primary tap">
                      改看這張卡的完整內容 ›
                    </Link>
                  </>
                ))}
              </div>
            )}
          </>
        )}

        <div className="scan-status">
          <span aria-live="polite">
            {phase === 'locked' ? (st.viaQr
              ? `認出來了（用卡片上的 QR）：${CARD.title}——正在開啟 3D 模型…`
              : `認出來了：${CARD.title}——正在開啟 3D 模型…`)
              : phase === 'searching' ? (qrOnly
                ? '這台手機不支援圖像辨識——請改對準卡片左下角的 QR code'
                : imageTrackingDead
                  ? '這台手機不支援圖像辨識（詳見下方說明）'
                  : '掃描中——把卡片放進框內（不必對齊四個角）')
                : STATUS[phase] ?? '　'}
          </span>
        </div>

        {/* ── 命中卡面熱區 ── */}
        {obj && (
          <div className="scan-hit ui-enter">
            <div className="scan-hit-hd">
              <b>{obj.name}</b>
              <span className="muted">{CARD?.title}</span>
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
            {/* ⚠️ 換熱區時上一段一定要停（SpeakButton 依 obj.id 自己處理），
                否則使用者瞄準白菜卻聽到臘八粥。 */}
            <SpeakButton obj={obj} className="scan-hit-speak" />
            {obj.link && (
              <Link screen={obj.link.screen} params={obj.link.props} className="btn-ghost tap">
                {obj.link.label} ›
              </Link>
            )}
          </div>
        )}

        {/* ── 比對根本沒在跑：最惡毒的一種失敗，畫面上完全看不出來 ── */}
        {phase === 'stalled' && (
          <div className="scan-nofile">
            <b>相機開起來了，但比對程序一輪都沒跑完——這不是沒對準。</b>
            <p>
              常見原因是瀏覽器擋掉了 Web Worker 或 WebGL，或這台裝置資源不足。
              請打開下方「掃描診斷」按<b>複製診斷資料</b>貼給我們，那比描述症狀有用得多。
            </p>
            <p className="muted">
              這個提示存在的理由：這種失敗<b>看起來完全正常</b>——相機在動、掃描線在跑、
              目標檔也載入了。不主動講出來的話，只會讓人以為是自己沒對準。
            </p>
          </div>
        )}

        {/* ── 目標檔沒裝：靜默失敗，一定要主動講 ── */}
        {phase === 'no-target' && (
          <div className="scan-nofile">
            <b>目標檔尚未安裝，所以掃描不會有任何反應。</b>
            <p>
              追蹤需要一份 <code>.mind</code>（從卡面圖編譯出來的特徵資料）才能比對。
              目前 <code>{CARD?.mindTarget}</code> 取不到，等於沒有可比對的目標——
              相機會開，但永遠不會認出卡片。
            </p>
            <p>
              <b>解法：</b><code>npm run card:mind -- 卡面稿.png</code>，
              產出的檔案會自動放進 <code>public/ar/targets/</code>。
            </p>
          </div>
        )}

        {/* ── 現場診斷 ── */}
        <div className="scan-diag">
          <button className="btn-ghost tap" onClick={() => setShowDiag(v => !v)} aria-expanded={showDiag}>
            {showDiag ? '關閉' : '打開'}掃描診斷
          </button>
          {showDiag && (
            <div className="scan-diag-box">
              {!info && <p className="muted">尚未啟動追蹤。</p>}
              {info && (
                <dl className="scan-diag-kv">
                  <div><dt>狀態</dt><dd>{phase}</dd></div>
                  <div><dt>鏡頭</dt><dd>{info.camera}</dd></div>
                  <div><dt>解析度</dt><dd>{info.res}</dd></div>
                  <div><dt>目標圖尺寸</dt><dd>{info.target}</dd></div>
                  <div><dt>心跳累計</dt><dd>{info.ticks}{info.ticks === 0 ? '（完全沒在處理）' : ''}</dd></div>
                  <div><dt>比對速率</dt><dd>{info.tps ?? '—'} 輪/秒{(info.tps ?? 0) === 0 ? '　★ 迴圈卡住了' : ''}</dd></div>
                  {/* ★ 比對成功次數與「有沒有認出來」是兩件事（上游還要光流追蹤跟上）。
                      這一版已經把那道關卡拿掉，這個數字留著是為了萬一還有殘留問題時分得出來。 */}
                  <div><dt>比對成功</dt><dd>{info.matches ?? '—'} 次</dd></div>
                  <div><dt>畫面特徵點</dt><dd>{features ?? '—'}</dd></div>
                  <div><dt>比對 worker</dt><dd>{info.worker}</dd></div>
                  {/* ⚠️ 相容模式會用回 MindAR 內建的 worker，而那顆帶原廠門檻（0.7），
                      不是我們放寬的 0.75——判讀時要算進去，見 tfjsCompat.js。 */}
                  {/* ★★ 偵測器實際讀到的灰階範圍。正常約 0~255；
                      max ≤ 1 或 > 1000 代表 InputLoader 的 shader 在這個驅動上
                      算錯了，那是所有後續運算的源頭（特徵點會全是雜訊）。 */}
                  <div><dt>影像數值範圍</dt><dd>{info.inputRange ?? '—'}</dd></div>
                  <div><dt>尺度自動校正</dt><dd>{info.scaleFix ?? '—'}</dd></div>
                  <div><dt>QR 備援</dt><dd>{info.qr ?? '—'}</dd></div>
                  {/* ★★ 運算後端。`CPU` 代表已經改用「編譯 .mind 時用的那份 kernel」——
                      這是唯一能解釋「為什麼突然變慢」的欄位，藏起來只會被當成當機。 */}
                  <div><dt>運算後端</dt><dd>{info.backend ?? '—'}</dd></div>
                  <div><dt>相容模式</dt><dd>{info.compat ?? '—'}{info.compat === '開啟' ? '（用原廠比對門檻）' : ''}</dd></div>
                  <div><dt>瀏覽器</dt><dd>{inApp ? `${inApp} 內建瀏覽器 ` : '一般瀏覽器'}</dd></div>
                  <div><dt>繪圖晶片</dt><dd>{info.gpu ?? '—'}</dd></div>
                  <div><dt>WebGL2</dt><dd>{info.webgl2 ?? '—'}　像素比 {info.dpr ?? '—'}</dd></div>
                </dl>
              )}

              {/* ── 換一顆鏡頭試試 ──
                  ⚠️ Android 的 label 是「camera2 2, facing back」這種沒有語意的字串，
                     自動判斷**必然**是啟發式的。超廣角的桶狀畸變實測會讓辨識率
                     直接歸零，而症狀正是「對得很準卻認不出來」——與「沒對準」
                     完全分不出來。所以一定要讓使用者當場換一顆試，那是唯一的直接證據。 */}
              {cameras.length > 1 && (
                <div className="scan-diag-self">
                  <p className="muted" style={{ margin: 0 }}>
                    這台裝置有 {cameras.length} 顆後鏡頭。<b>掃不到時換一顆試</b>
                    ——超廣角鏡頭的變形會讓辨識完全失效。
                  </p>
                  <div className="scan-card-spots">
                    {cameras.map((c, i) => (
                      <button
                        key={c.deviceId || i}
                        className={`chip${camId === c.deviceId ? ' on' : ''}`}
                        onClick={() => { setCamId(c.deviceId); boot(c.deviceId) }}
                      >
                        {c.label || `鏡頭 ${i + 1}`}
                      </button>
                    ))}
                    <button className={`chip${camId === null ? ' on' : ''}`} onClick={() => { setCamId(null); boot(null) }}>
                      自動
                    </button>
                  </div>
                </div>
              )}

              <div className="scan-diag-self">
                {/* ⚠️ 一鍵複製：要人「截圖傳給我們」的門檻其實很高（要截、要找、要傳），
                    而這幾個數字才是唯一能定位問題的東西。降到一次點擊。 */}
                <button
                  className="btn-ghost tap"
                  onClick={() => {
                    const i = sessionRef.current?.info() ?? {}
                    const text = [
                      '【機巧時運 AR 診斷】',
                      `狀態：${phase}`,
                      `鏡頭：${i.camera ?? '—'}　解析度：${i.res ?? '—'}`,
                      `目標圖：${i.target ?? '—'}　心跳：${i.ticks ?? '—'}　速率：${i.tps ?? '—'} 輪/秒`,
                      `畫面特徵點：${features ?? '—'}　比對成功：${i.matches ?? '—'} 次`,
                      `影像數值範圍：${i.inputRange ?? '—'}　尺度自動校正：${i.scaleFix ?? '—'}`,
                      `運算後端：${i.backend ?? '—'}`,
                      `比對 worker：${i.worker ?? '—'}　相容模式：${i.compat ?? '—'}　QR 備援：${i.qr ?? '—'}`,
                      `瀏覽器：${inApp ? inApp + ' 內建' : '一般'}`,
                      `繪圖晶片：${i.gpu ?? '—'}　WebGL2 ${i.webgl2 ?? '—'}　像素比 ${i.dpr ?? '—'}`,
                      `自我測試：${selfTest === 'idle' ? '尚未執行' : selfTest === 'running' ? '執行中'
                        // 一定要帶 stage：「跑不起來」與「跑得起來但沒認出」是完全
                        //    不同的結論，只寫「失敗」等於把最有用的資訊丟掉。
                        : selfTest.ok ? `成功（第 ${selfTest.frames} 幀 / ${selfTest.ms} ms）`
                          : `失敗［${selfTest.stage}］${selfTest.reason}`}`,
                      `裝置：${navigator.userAgent}`,
                    ].join('\n')
                    navigator.clipboard?.writeText(text)
                      .then(() => setToast('診斷資料已複製，貼給我們就好'))
                      .catch(() => setToast('複製失敗，請改用截圖'))
                  }}
                >
                  複製診斷資料
                </button>
                <button
                  className="btn-primary tap"
                  disabled={!live || selfTest === 'running'}
                  onClick={async () => {
                    setSelfTest('running')
                    setSelfTest(await sessionRef.current.selfTest(CARD.target))
                  }}
                >
                  {selfTest === 'running' ? '測試中…' : '用內建卡面圖自我測試'}
                </button>
                {/* ★★ 手動切到 CPU 運算。
                    自動那條路只在「自我測試失敗在 match／pipeline」時才會觸發，
                    但裝置壞掉的方式不只那兩種（例如比對其實會過、實機卻一直不中）。
                    這顆按鈕讓卡住的人自己走到那條路上，而不是只能複製診斷資料等回覆。
                    ⚠️ 已經在 CPU 上就不再顯示——一顆按了不會有事發生的按鈕
                       比沒有更糟（使用者會以為是自己按錯）。 */}
                {st.backend !== 'cpu' && (
                  <button
                    className="tap"
                    disabled={!live || selfTest === 'running' || st.switching}
                    onClick={async () => {
                      setCpuTried(true)
                      setSelfTest('running')
                      const ok = await sessionRef.current.switchBackend('cpu')
                      setSelfTest(ok
                        ? await sessionRef.current.selfTest(CARD.target)
                        : { ok: false, stage: 'match', reason: '切換 CPU 運算失敗' })
                    }}
                  >
                    改用相容運算（CPU）重試
                  </button>
                )}
                {/* ⚠️ 判讀一定要給**下一步動作**。只說「成功／失敗」等於沒有診斷。 */}
                {selfTest === 'running' && <p className="muted">正在把內建的卡面圖接到辨識流程上，請稍候。</p>}
                {selfTest !== 'idle' && selfTest !== 'running' && (
                  selfTest.ok ? (
                    <p className="scan-diag-verdict ok">
                      <b>辨識流程在這台裝置上正常</b>（第 {selfTest.frames} 幀、{selfTest.ms} ms 內認出）。
                      <br />所以掃不到的原因在<b>相機拍到的畫面</b>。請看上面的
                      「畫面特徵點」：低於 {FEAT_WEAK} 就是影像問題（太遠／太暗／糊／反光），
                      高於 {FEAT_GOOD} 還認不出來才是角度或卡片版本的問題。
                    </p>
                  ) : selfTest.stage === 'pipeline' ? (
                    <p className="scan-diag-verdict error">
                      <b>這台裝置跑不起辨識運算</b>（第 {selfTest.frames} 幀就中斷）。
                      <br /><code>{selfTest.reason}</code>
                      <br />問題<b>不在</b>你怎麼拿卡片。常見原因：用了 App 的內建瀏覽器、
                      瀏覽器停用了 WebGL、或裝置記憶體不足。
                      <br />請先改用 <b>Safari 或 Chrome 直接開網站</b>再試。
                    </p>
                  ) : selfTest.stage === 'match' ? (
                    <p className="scan-diag-verdict warn">
                      <b>運算跑得起來，但連內建的卡面圖都沒認出</b>（{selfTest.ms} ms）。
                      <br />這通常代表<b>目標檔與卡面圖不是同一版</b>。請按「複製診斷資料」貼給我們。
                    </p>
                  ) : (
                    <p className="scan-diag-verdict error">
                      <b>測試沒能開始</b>（{selfTest.stage}）：{selfTest.reason}
                    </p>
                  )
                )}
              </div>

              <p className="muted" style={{ fontSize: 'var(--text-2xs)' }}>
                追蹤由 MindAR 的特徵點比對負責，沒有「相似度分數」可以顯示
                （它是 inlier 式判定：追到就是追到）。「畫面特徵點」量的是影像品質，
                不是與卡片的相似度。
              </p>
            </div>
          )}
        </div>

        {/* ── 官方卡片 ── */}
        <div className="scan-official">
          <SectionHead title="官方節氣卡片" />
          {OFFICIAL_CARDS.map(c => (
            <div key={c.id} className={`scan-card${phase === 'locked' && c.id === CARD?.id ? ' on' : ''}`}>
              <div className="scan-card-hd">
                <b>{c.title}</b>
                <span className="muted">{c.subtitle}</span>
                {phase === 'locked' && c.id === CARD?.id && <span className="scan-card-live">正在掃描中</span>}
              </div>
              <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                拿這張卡對著鏡頭就會跳出內容；點卡面上的物件可以換內容。
              </p>
              <div className="scan-card-spots">
                {c.hotspots.map(h => (
                  <span key={h.id} className={`chip${hotspot?.id === h.id ? ' on' : ''}`}>{h.label}</span>
                ))}
              </div>
              <Link screen="arCard" params={{ slug: c.slug }} className="btn-ghost tap">
                沒有實體卡？看這張卡的完整內容 ›
              </Link>
            </div>
          ))}
        </div>

        {/* ── 二十四節氣貓 3D 圖鑑（2026-10-04）──
            不必掃卡也能看：每一隻都開在 /ar/model/2027-<節氣>（小寒那隻就是官方卡的主角）。 */}
        <div className="scan-cats">
          <SectionHead title="二十四節氣貓 3D" />
          <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: '0 0 var(--space-3)' }}>
            2027 年曆的節氣貓都做成了 3D 模型，點開就能轉動觀察、跟牠聊天。
          </p>
          <div className="scan-cats-grid">
            {AR_CATS.map(c => (
              <Link key={c.id} screen="arModel" params={{ slug: `2027-${c.link.props.slug}` }} className="scan-cat tap">
                <img src={c.model.thumb} alt="" loading="lazy" decoding="async" />
                <b>{c.term}</b>
                <span className="muted">{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
