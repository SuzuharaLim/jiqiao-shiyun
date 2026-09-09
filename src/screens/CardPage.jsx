import { Suspense, lazy, useEffect, useRef, useState } from 'react'
// ⚠️ 放大模式必須 portal 到 body，不可留在元件樹裡——見它的 JSX 上方的說明。
import { createPortal } from 'react-dom'
import { TopBar, SectionHead, Link, Breadcrumb, Disclaimer } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import AnimatedText from '../components/AnimatedText.jsx'
import { useNav } from '../store/nav.jsx'
import { cardBySlug, objectForHotspot } from '../data/arCards.js'
import SpeakButton from '../components/SpeakButton.jsx'
// 小挑戰抽成共用元件——`/ar/model/:slug` 也要同一段動線
import ArQuiz from '../components/ArQuiz.jsx'

// ============================================================================
// /ar/card/:slug —— 不用相機也能走完整條動線
//
// 三個用途，一頁兼顧：
//   ① **降級路徑**：桌機、拒絕相機權限、getUserMedia 失敗時的去處（改版文件 §5.4）
//   ② **可索引的內容頁**：`/AR` 是 noindex，這頁允許索引才吃得到搜尋流量
//   ③ **熱區校對工具**：熱區框直接畫在卡面上，用眼睛就能看出有沒有對齊
//      （rect 是人工標註的，標錯不會拋錯，只會讓使用者點不到東西）
//
// ⚠️ 熱區一定要是真的 `<button>`：改版文件 §8 #14 要求 fallback 模式全鍵盤可操作。
//    用 div + onClick 的話 Tab 走不到、螢幕閱讀器也唸不出來。
//
// ⚠️ 3D 舞台走 React.lazy：three 有 ~137KB gzip，不點就不該下載。
// ============================================================================
const ProduceStage = lazy(() => import('../components/ProduceStage.jsx'))

export default function CardPage({ slug }) {
  const { user } = useNav()
  const card = cardBySlug(slug)
  const [hotId, setHotId] = useState(null)
  const [poster, setPoster] = useState(null)
  const [showBox, setShowBox] = useState(false)   // 校對模式：把 rect 數值標出來
  const [bigScan, setBigScan] = useState(false)   // 深色滿版大圖：給另一台裝置掃
  const [want3d, setWant3d] = useState(false)

  // 卡面圖：優先用官方目標圖的靜態路徑，其次才是 localStorage 的縮圖快取。
  //
  // ⚠️ 原本只讀 `cachedPoster()`，而那份快取是**進過 /AR 才會產生**的。
  //    於是目標圖明明已經裝在 public/ar/targets/ 底下、瀏覽器一個 GET 就拿得到，
  //    這一頁卻顯示「卡面圖尚未上傳」——而這頁有三個用途都需要那張圖：
  //    ①桌機／拒絕相機權限的降級路徑 ②可被索引的內容頁 ③**熱區校對工具**。
  //    校對頁看不到卡面，等於最需要它的那個用途直接失效。
  //    （從搜尋結果直接進來的人更是永遠不會有那份快取。）
  //
  // ⚠️ 2026-08-11：localStorage 的縮圖快取已隨自研追蹤一起退役（那份快取是
  //    進過 /AR 才會產生的，而新的追蹤層不再寫它）。靜態檔就是唯一來源。
  useEffect(() => {
    if (!card) return
    setPoster(null)
    let cancelled = false
    // 先確認靜態檔真的是圖片：檔案不存在時 SPA fallback 會回 200 + index.html
    // （「檔案不存在」會偽裝成「圖片壞掉」，所以一定要看 content-type）
    fetch(card.target, { method: 'GET' })
      .then(r => (r.ok && (r.headers.get('content-type') || '').startsWith('image/')
        ? card.target : null))
      .catch(() => null)
      .then(url => { if (!cancelled) setPoster(url) })
    return () => { cancelled = true }
  }, [card])

  // 放大模式：Esc 關閉 ＋ 關閉後把焦點還給觸發按鈕（浮層一律要有，站上統一規則）
  // ⚠️ 不還焦點的話它會掉回 <body>，鍵盤使用者關掉浮層後要從整頁最開頭重新 Tab。
  const bigTriggerRef = useRef(null)
  useEffect(() => {
    if (!bigScan) return
    const onKey = e => { if (e.key === 'Escape') setBigScan(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      // 卸載時還焦點。用 try：按鈕可能已經不在（例如同時切了畫面）
      try { bigTriggerRef.current?.focus() } catch { /* 沒得還就算了 */ }
    }
  }, [bigScan])

  // 預設選中主物件——進頁就有東西看，不必先猜要點哪裡
  useEffect(() => {
    if (card && !hotId) setHotId(card.hotspots.find(h => h.primary)?.id ?? null)
  }, [card, hotId])

  if (!card) {
    return (
      <>
        <TopBar title="找不到這張卡片" />
        <div className="body">
          <div className="empty">
            <p>沒有這張節氣卡片。</p>
            <Link screen="scan" className="btn-primary tap">回 AR 掃描</Link>
          </div>
        </div>
      </>
    )
  }

  const hot = card.hotspots.find(h => h.id === hotId) ?? null
  const obj = objectForHotspot(hot)

  return (
    <>
      <TopBar title={card.title} />
      <div className="body">
        <Breadcrumb items={[
          { label: 'AR 掃描', screen: 'scan' },
          { label: card.title },
        ]} />

        <h1 className="cardp-h1">{card.title}　<small>{card.subtitle}</small></h1>
        <p className="muted cardp-lead">
          沒有實體卡片也能看：點卡面上任一個標記，就會跳出那個物件的內容。
          有卡片的話到 <Link screen="scan">AR 掃描</Link> 用鏡頭對著它。
        </p>

        {/* ── 卡面 ＋ 熱區 ── */}
        <div className={`cardp-stage${showBox ? ' calib' : ''}`}
          style={{ aspectRatio: `${card.sizeMM[0]} / ${card.sizeMM[1]}` }}>
          {poster
            ? <img className="cardp-img" src={poster} alt={`${card.title} 節氣明信片卡面`} />
            : (
              // 沒有卡面圖時不可假裝有：畫一個空的比例框並說明原因，
              //    熱區位置仍然標得出來（校對比例還是有用的）。
              <div className="cardp-noimg">
                <p>卡面圖尚未安裝</p>
                <p className="muted">
                  把付印的那一版跑 <code>npm run card:install -- 稿.png</code>，
                  圖會裝進 <code>public{card.target}</code>，這裡與 AR 掃描就都有卡面了。
                  在那之前熱區位置仍可校對（下方的框是按比例畫的）。
                </p>
              </div>
            )}
          {card.hotspots.map(h => (
            <button
              key={h.id}
              className={`cardp-hot${h.id === hotId ? ' on' : ''}${h.primary ? ' primary' : ''}`}
              style={{
                left: `${h.rect.x * 100}%`, top: `${h.rect.y * 100}%`,
                width: `${h.rect.w * 100}%`, height: `${h.rect.h * 100}%`,
              }}
              onClick={() => { setHotId(h.id); setWant3d(false) }}
              aria-pressed={h.id === hotId}
              aria-label={`${h.label}${h.hint ? '——' + h.hint : ''}`}
            >
              <span className="cardp-dot" aria-hidden="true" />
              <span className="cardp-tag">{h.label}</span>
              {showBox && (
                <span className="cardp-num" aria-hidden="true">
                  {h.rect.x.toFixed(3)}, {h.rect.y.toFixed(3)}<br />
                  {h.rect.w.toFixed(3)} × {h.rect.h.toFixed(3)}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="cardp-tools">
          <button className="btn-ghost tap" onClick={() => setShowBox(v => !v)}>
            {showBox ? '關閉' : '開啟'}熱區校對（顯示座標）
          </button>
          {/* ── 沒有印表機也要能測 AR ──
              ⚠️ 為什麼需要這個：四角偵測找的是**紙與桌面的邊界**，而卡面的紙緣是白的
                 （實測原稿紙緣內側灰階 254、98% 高於 240）。在瀏覽器裡直接看這張圖時
                 周圍是白色頁面背景 → 邊界不存在 → 用另一台裝置怎麼掃都是 0。
                 實測 24 幀 × 5 種背景亮度：白／淺白／淺灰全都 0/24。
                 這個模式把圖放到**深色滿版底**上，邊界就出現了（深色底實測 18~23/24）。 */}
          {poster && (
            <button className="btn-ghost tap" ref={bigTriggerRef} onClick={() => setBigScan(true)}>
              放大給另一台裝置掃描
            </button>
          )}
        </div>

        {/* ── 放大給另一台裝置掃描 ──
            ⚠️ **必須 createPortal 到 body**：`.screen` 有進場動畫留下的
               `transform: translateY(8px)`，而**任何非 none 的 transform 都會成為
               `position:fixed` 的容器塊**。留在元件樹裡時實測浮層 rect 是
               `132,−684 1000×1462`（視窗是 1280×720）——既不滿版、在捲動過的頁面上
               還整個跑到視窗外，症狀是**按了按鈕看起來什麼都沒發生**。
            ⚠️ 浮層要有 Esc、role="dialog"、開啟時把焦點移進來（站上統一規則）。
            ⚠️ 不做進退場動畫：它的用途是「被另一台裝置拍」，
               任何淡入都可能剛好被拍到半透明的那一幀。 */}
        {bigScan && poster && createPortal(
          <div className="cardp-big" role="dialog" aria-modal="true" aria-label="放大卡面，供另一台裝置掃描">
            <img src={poster} alt={`${card.title} 卡面（放大）`} />
            {/* ⚠️ 這三條是量出來的，不是「一般建議」。少講第一條會直接失敗：
                   實測若讓整個螢幕入鏡、而螢幕四周是淺色牆，偵測器找到的是
                   **螢幕的邊界**（深色螢幕 vs 淺色牆是最強的邊界）而不是卡片，
                   拉正整個 16:9 畫面當然對不上卡片簽名 → **0/24**。
                   只有深色底填滿取景框時才會找到卡片（17~24/24）。 */}
            {/* ⚠️ 說明與按鈕包一層：矮視窗（橫向手機、拉扁的瀏覽器）要改成左右並排。
                   直接堆成一欄時實測 844×390 下圖片被壓到 **84×61px**——
                   對「給另一台裝置拍」這個用途等於壞掉。 */}
            <div className="cardp-big-side">
              <ol className="cardp-big-steps">
                <li><b>靠近一點</b>，讓螢幕的邊框落在取景框<b>外面</b>——取景框裡只要有深色底和卡片。</li>
                <li>卡片佔畫面寬度大約 <b>五到八成</b>（實測 50%→23/24、62%→24/24、72%→24/24，但 90% 掉到 15/24）。</li>
                <li><b>把螢幕亮度開高</b>（實測亮度偏暗 0.8× 時掉到 6/24，偏亮 1.25× 仍是 24/24）。</li>
              </ol>
              <p className="muted">
                背景刻意是深色的：白紙的邊緣在白色背景上偵測不到，
                這是四角偵測的原理限制，不是對不準。
              </p>
              <button className="btn-primary tap" autoFocus onClick={() => setBigScan(false)}>
                關閉
              </button>
            </div>
            <button className="btn-primary tap" autoFocus onClick={() => setBigScan(false)}>
              關閉
            </button>
          </div>,
          document.body,
        )}

        {/* ── 命中的物件 ── */}
        {obj && (
          <div className="cardp-obj" key={obj.id}>
            <SectionHead title={obj.name} />
            {/* 吉祥物對話框：打字機。⚠️ AnimatedText 的 typewriter 自己讀
                reduce-motion（CSS 的全域 animation 覆寫碰不到 setInterval）。 */}
            {obj.line && (
              <p className="ps-say cardp-line">
                <AnimatedText text={obj.line} fx="typewriter" />
              </p>
            )}

            {/* 有 3D 模型的物件才給按鈕。⚠️ 不點不下載 three。 */}
            {obj.model && (
              want3d
                ? (
                  <Suspense fallback={<div className="ui-skeleton" style={{ height: 320 }} />}>
                    {/* 標籤用**已經查證過的** facts 標題（品種／產地／節氣俗語），
                        ⚠️ 不是營養素——那要等食藥署核對（見 arCards.js 的說明）。 */}
                    <ProduceStage
                      action="present" height={320}
                      labels={(obj.facts ?? []).map(f => ({ key: f.label, label: f.label }))}
                    />
                  </Suspense>
                )
                : (
                  <button className="btn-primary tap" onClick={() => setWant3d(true)}>
                    <Icon name="sparkle" style={{ width: 18, height: 18, stroke: 'var(--pfg)', display: 'inline-block', verticalAlign: '-3px', marginRight: 6 }} />
                    看 3D 的{obj.name}
                  </button>
                )
            )}

            {obj.facts?.length > 0 && (
              <dl className="cardp-facts">
                {obj.facts.map(f => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}{f.source && <i>（{f.source}）</i>}</dd>
                  </div>
                ))}
              </dl>
            )}
            {obj.warn && <p className="cardp-warn">{obj.warn}</p>}

            {/* 語音導覽：拿著實體卡的時候低頭讀螢幕很彆扭，用聽的比較順。
                ⚠️ 這是**輔助**不是替代——上面該有的字一個都沒少。 */}
            <SpeakButton obj={obj} />
            {obj.quiz && (
              <ArQuiz quiz={obj.quiz} loggedIn={!!user && !user.guest}
                term={card.term}
                // 圖卡上那句話用**有出處**的 fact，不用 quiz 的解說
                fact={obj.facts?.find(f => f.source) ?? obj.facts?.[0]} />
            )}
            {obj.link && (
              <Link screen={obj.link.screen} params={obj.link.props} className="btn-ghost tap cardp-more">
                {obj.link.label} ›
              </Link>
            )}
          </div>
        )}

        <Disclaimer>
          卡面的節氣、農曆與交節日期由站內天文演算逐日產生；品種與產地引用農業部開放資料。
          本頁不提供營養素數值與健康宣稱。
        </Disclaimer>
      </div>
    </>
  )
}
