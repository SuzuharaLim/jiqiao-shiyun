import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, PhotoImg, useGlossary, GlossTerm, GlossPanel, SheetMask } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { BRAND } from '../data/mock.js'
import { usePosts } from '../hooks/useApi.js'
import { dayFor, dateFromOffset, offsetFromDate, monthCells, todayOffset } from '../data/almanac.js'

const WK = ['日', '一', '二', '三', '四', '五', '六']

export default function Feed() {
  const { push, liked, notifRead } = useNav()
  const T0 = todayOffset()               // 真實今日對錨點的偏移
  const [off, setOff] = useState(T0)     // 一開就停在系統當前日期
  const [cal, setCal] = useState(null) // {y, m} 開啟月曆選擇器
  const gl = useGlossary()               // 宜/忌 詞彙白話解釋
  const [provOpen, setProvOpen] = useState(false)  // 今日一諺是否展開解釋
  const [starHelp, setStarHelp] = useState(false)   // 吉日星等說明是否展開

  const d = dayFor(off)
  const gzZi = d.ganzhi.replace(/日$/, '')
  // 社群貼文（嚴格來自資料庫）。依節氣排前，開啟貼文詳情＋留言
  const allPosts = usePosts(null)
  const shots = allPosts.filter(p => p.term === d.term).concat(allPosts).slice(0, 6)

  const RANGE = 1095 // 可翻閱範圍：今日前後約三年（示範演算，已標註近似）
  const clampOff = (o) => Math.max(-RANGE, Math.min(RANGE, o))

  // ---------- 撕曆翻頁 ----------
  // 實體農民曆的動作是「撕」。原本翻日只是把字串換掉，這是全站最大的一筆浪費：
  // 翻日是這個產品的靈魂互動。動畫在 rotateX 掀到最高點時「換面」，
  // 資料其實在按下的瞬間就換好了，動畫只是蓋住那個切換點。
  // ⚠️ .calpage 已有 min-height:318px 固定插槽，所以加動畫不會造成版面位移。
  const [tear, setTear] = useState(null)          // 'next' | 'prev' | null
  const go = (delta) => {
    const next = clampOff(off + delta)
    if (next === off) return                      // 已到邊界就不要播動畫
    setTear(delta > 0 ? 'next' : 'prev')
    setOff(next)
  }
  // ⚠️ 曆頁「上下滑翻日」的手勢已於 2026-07-29 移除，切勿再加回來。
  // 使用者實測回報：手指在曆頁上稍微碰一下、或想往下捲頁面時就換了日期。
  // 這個區塊佔滿整張曆頁又位在頁面中段，垂直滑動本來就是「捲動」的意思，
  // 把它綁成翻日等於跟瀏覽器的預設手勢搶輸入——門檻調高也只是讓誤觸變難預測。
  // 翻日一律走上方的 ‹ › 與日期選擇器（明確、可預期、不會誤觸）。
  const openCal = () => { const c = dateFromOffset(off); setCal({ y: c.getFullYear(), m: c.getMonth() }) }
  const shiftCal = (dy, dm) => setCal(c => { const dt = new Date(c.y + dy, c.m + dm, 1); return { y: dt.getFullYear(), m: dt.getMonth() } })
  // 該月是否完全超出可選範圍（用於停用整組年/月箭頭）
  const monthAllFar = (y, m) => {
    const first = offsetFromDate(new Date(y, m, 1))
    const last = offsetFromDate(new Date(y, m + 1, 0))
    return last < -RANGE || first > RANGE
  }

  return (
    <>
      <TopBar brand={BRAND} right={<>
        <button className="iconbtn tap" onClick={() => push('notifications')} aria-label="通知">
          <Icon name="bell" />{!notifRead && <span className="badge-dot" />}
        </button>
        <button className="iconbtn tap" onClick={() => push('dms')} aria-label="私訊"><Icon name="send" /></button>
      </>} />

      <div className="body">
        <div className="feed-main">
        {/* 翻日：‹ › 一天，點中間日期可跳任意日 */}
        <div className="daystrip">
          <button className="side tap" onClick={() => go(-1)} disabled={off <= -RANGE}
            style={off <= -RANGE ? { opacity: .35 } : null} aria-label="前一天">‹</button>
          {/* ⚠️ 日期是全頁最大的字，眼睛的動線由上往下——它若瞬間跳字，
              會把下方 440ms 的撕曆整個蓋掉（使用者先看到跳字才看到翻頁）。
              key 帶日期讓 React 重新掛載，動畫才會重播；方向跟著翻頁走。
              ⚠️ 只動 transform 不動 opacity：這是主要資訊，不可因動畫沒跑就消失。 */}
          <button className="mid tap" onClick={openCal}>
            <div className="big daynum" key={d.solar} data-dir={tear || 'next'}>{d.solar}</div>
            <div className="wk daysub" key={`s-${d.solar}`} data-dir={tear || 'next'}>{d.weekday} · {d.lunar} · {d.term} ▾</div>
          </button>
          <button className="side tap" onClick={() => go(1)} disabled={off >= RANGE}
            style={off >= RANGE ? { opacity: .35 } : null} aria-label="後一天">›</button>
        </div>
        {/* 固定高度插槽：切換日期時不會讓下方版面跳動 */}
        <div className="daytools">
          {off === T0
            ? <span className="hint">點上方日期可翻閱任一天</span>
            : <button className="pill sm tap" onClick={() => setOff(T0)}>↩ 回今日</button>}
        </div>

        {/* 今日曆頁（精簡） */}
        <div className={`calpage${tear ? ` tear-${tear}` : ''}`}
          onAnimationEnd={() => setTear(null)}>
          <div className="hd">機巧時運 · 今日曆頁</div>
          <div className="gz"><div className="zi">{gzZi}<small>日</small></div></div>
          {/* ⚠️ 只寫「大暑」會被讀成「今天就是大暑」，但節氣是一段約 15 天的區間。
              標出區間與第幾天，語意才正確。 */}
          <div className="meta">
            <span className="term">{d.term}</span>
            {d.termRange && <small className="termrange">（{d.termRange}）第 {d.termDay} 天</small>}
          </div>

          <div className="yjcols">
            <div className="yi-col">
              {/* 印章方塊裡已有「宜」字，外面不可再重複——先前渲染成「宜宜」，螢幕閱讀器也會唸兩次 */}
              <div className="hh"><i aria-hidden="true">宜</i><span className="visually-hidden">今日宜</span></div>
              <div className="it">{d.yi.map(t => <GlossTerm key={t} term={t} gl={gl} />)}</div>
            </div>
            <div className="ji-col">
              <div className="hh"><i aria-hidden="true">忌</i><span className="visually-hidden">今日忌</span></div>
              <div className="it">{d.ji.map(t => <GlossTerm key={t} term={t} gl={gl} />)}</div>
            </div>
          </div>
          <GlossPanel gl={gl} />
          {/* 新手看不懂「解除」「作樑」，先給一句白話總結，再讓他點詞看詳解 */}
          {d.summary && <p className="daysummary">{d.summary}</p>}

          <div className="calnote">
            {/* ⚠️ 只寫「子時・丑時」新手不知道是幾點，原本要點進第二層才看得到對照 */}
            <span className="k">吉時</span>
            <span className="v">{d.hours12.filter(h => h.luck === '吉').map(h => `${h.zhi}時（${h.range}）`).join('・') || '無特別吉時'}</span>
            {/* 吉日星等逐顆點亮（key 帶 off，翻日時重播）——整排同時出現沒有「揭曉」的味道 */}
            {/* 星等原本沒有任何說明——不知道是運勢還是吉日等級、滿分幾顆。
                補上文字評等，並讓整組可點開解釋。 */}
            <button type="button" className={`stars asbtn tap${starHelp ? ' on' : ''}`}
              aria-expanded={starHelp} onClick={() => setStarHelp(v => !v)}
              aria-label={`吉日星等 ${d.stars} 顆星（滿分 5），${d.rating}，查看說明`}>
              {Array.from({ length: 5 }, (_, i) => (
                <i key={`${off}-${i}`} aria-hidden="true" style={{ animationDelay: `${i * 0.08}s` }}>
                  {i < d.stars ? '★' : '☆'}
                </i>
              ))}
              <small className="rating">{d.rating}</small>
            </button>
          </div>
          {starHelp && (
            <div className="glosspanel inrow"><span>
              吉日星等（滿分 5 顆）綜合當日的建除、二十八星宿、黃道吉時數量與特殊日神煞推算。
              {d.flags.length > 0 && `本日神煞：${d.flags.map(f => f.t).join('、')}。`}
              星等與評等來自同一組推算，不會互相矛盾。宜忌屬傳統民俗，各流派或有差異。
            </span></div>
          )}
          {/* 今日一諺：點一下展開白話解釋 */}
          <button className={`calnote asrow tap${provOpen ? ' on' : ''}`} aria-expanded={provOpen}
            onClick={() => setProvOpen(v => !v)}>
            <span className="k">今日一諺</span>
            <span className="v">「{d.proverb}」</span>
            <span className="more">{provOpen ? '收合' : '解釋'}</span>
          </button>
          {provOpen && d.proverbMean && (
            <div className="glosspanel inrow"><span>{d.proverbMean}</span></div>
          )}
        </div>
        <div className="center muted" style={{ fontSize: 'var(--text-2xs)', padding: '6px 16px 0' }}>
          ＊農曆・節氣・干支依天文演算（太陽視黃經與朔望月）；宜忌神煞屬傳統民俗，各流派或有差異
        </div>

        <button className="ad-more tap" onClick={() => push('almanacDay', { off })}>
          <span className="ad-more-ic"><Icon name="scroll" /></span>
            <span className="ad-more-tx">
            <b>看完整農民曆</b>
            <small>建除・星宿・彭祖百忌・胎神・沖煞歲數・財喜貴方位・十二時辰</small>
          </span>
          <span className="go">›</span>
        </button>

        <div className="calacts">
          <button className="b dark tap" onClick={() => push('aiChat')}><Icon name="sparkle" style={{ width: 15, height: 15, marginRight: 5, verticalAlign: -2 }} />問 AI 時光顧問</button>
          <button className="b tap" onClick={() => push('makeCalendar')}>＋ 做月曆</button>
        </div>

        </div>{/* /feed-main */}

        <aside className="feed-side">
        {/* 今日大家拍的〈節氣〉—— 桌機為右欄側欄，手機為卷軸 */}
        <div className="railhd">
          <div className="t">今日大家拍的〈<small>{d.term}</small>〉</div>
          <button className="more tap" onClick={() => push('todayShots', { term: d.term })}>更多作品 ›</button>
        </div>
        <div className="rail">
          {shots.map((p, i) => (
            <button key={`${p.id}-${i}`} className="railcard tap" onClick={() => push('postDetail', { id: p.id })}>
              <div className="ph" style={{ background: p.bg, fontSize: 56, position: 'relative', overflow: 'hidden' }}>
                {p.image ? <PhotoImg src={p.image} /> : p.emoji}
                <span className="ph-like" style={{ position: 'absolute', bottom: 6, left: 6 }}>
                  <Icon name="heart" fill style={{ width: 11, height: 11, verticalAlign: -1 }} /> {p.likes + (liked[p.id] ? 1 : 0)}
                </span>
              </div>
              <div className="cap">{p.title}</div>
              <div className="by">@{p.user}</div>
            </button>
          ))}
        </div>

        {/* 節氣攝影挑戰入口（原本掛在「更多」，移到這裡成為獨立卡片） */}
        <button className="feedchal tap" onClick={() => push('challenges')}>
          <span className="fc-ic"><Icon name="trophy" /></span>
          <span className="fc-t"><b>{d.term}攝影挑戰</b><small>拍下你的{d.term}，前 3 名收錄官方植物月曆</small></span>
          <span className="fc-go">›</span>
        </button>
        </aside>{/* /feed-side */}

      </div>

      {/* 月曆跳日期選擇器：« 年  ‹ 月 | 年月 | 月 ›  年 » */}
      {cal && (
        <SheetMask onClose={() => setCal(null)}>{close => (
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="cal-picker">
              <div className="calcap">
                <button className="tap" onClick={() => shiftCal(-1, 0)} disabled={monthAllFar(cal.y - 1, cal.m)} aria-label="上一年">«</button>
                <button className="tap" onClick={() => shiftCal(0, -1)} disabled={monthAllFar(cal.y, cal.m - 1)} aria-label="上個月">‹</button>
                <div className="mo">{cal.y} 年 {cal.m + 1} 月</div>
                <button className="tap" onClick={() => shiftCal(0, 1)} disabled={monthAllFar(cal.y, cal.m + 1)} aria-label="下個月">›</button>
                <button className="tap" onClick={() => shiftCal(1, 0)} disabled={monthAllFar(cal.y + 1, cal.m)} aria-label="下一年">»</button>
              </div>
              <div className="calwk">{WK.map(w => <span key={w}>{w}</span>)}</div>
              <div className="calgrid">
                {monthCells(cal.y, cal.m).map((c, i) => {
                  if (!c) return <span key={i} className="calcell empty" />
                  const far = Math.abs(c.off) > RANGE
                  return (
                    <button key={i} className={`calcell tap ${c.off === off ? 'on' : ''} ${c.off === T0 ? 'today' : ''}`}
                      disabled={far} onClick={() => { setOff(c.off); close() }}>{c.day}</button>
                  )
                })}
              </div>
              <div className="pad" style={{ display: 'flex', gap: 8 }}>
                <button className="b tap" onClick={() => { setOff(T0); close() }}>回今日</button>
                <button className="b dark tap" onClick={close}>完成</button>
              </div>
            </div>
          </div>
        )}</SheetMask>
      )}
    </>
  )
}
