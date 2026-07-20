import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, PhotoImg } from '../components/ui.jsx'
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

  const d = dayFor(off)
  const gzZi = d.ganzhi.replace(/日$/, '')
  // 社群貼文（嚴格來自資料庫）。依節氣排前，開啟貼文詳情＋留言
  const allPosts = usePosts(null)
  const shots = allPosts.filter(p => p.term === d.term).concat(allPosts).slice(0, 6)

  const RANGE = 1095 // 可翻閱範圍：今日前後約三年（示範演算，已標註近似）
  const clampOff = (o) => Math.max(-RANGE, Math.min(RANGE, o))
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
          <button className="side tap" onClick={() => setOff(clampOff(off - 1))} disabled={off <= -RANGE}
            style={off <= -RANGE ? { opacity: .35 } : null} aria-label="前一天">‹</button>
          <button className="mid tap" onClick={openCal}>
            <div className="big">{d.solar}</div>
            <div className="wk">{d.weekday} · {d.lunar} · {d.term} ▾</div>
          </button>
          <button className="side tap" onClick={() => setOff(clampOff(off + 1))} disabled={off >= RANGE}
            style={off >= RANGE ? { opacity: .35 } : null} aria-label="後一天">›</button>
        </div>
        {/* 固定高度插槽：切換日期時不會讓下方版面跳動 */}
        <div className="daytools">
          {off === T0
            ? <span className="hint">點上方日期可翻閱任一天</span>
            : <button className="pill sm tap" onClick={() => setOff(T0)}>↩ 回今日</button>}
        </div>

        {/* 今日曆頁（精簡） */}
        <div className="calpage">
          <div className="hd">機 巧 時 運 · 今 日 曆 頁</div>
          <div className="gz"><div className="zi">{gzZi}<small>日</small></div></div>
          <div className="meta"><span className="term">{d.term}</span></div>

          <div className="yjcols">
            <div className="yi-col">
              <div className="hh"><i>宜</i>宜</div>
              <div className="it">{d.yi.join('　')}</div>
            </div>
            <div className="ji-col">
              <div className="hh"><i>忌</i>忌</div>
              <div className="it">{d.ji.join('　')}</div>
            </div>
          </div>

          <div className="calnote">
            <span className="k">吉時</span><span className="v">{d.luckyHours}</span>
            <span className="stars">{'★'.repeat(d.stars)}{'☆'.repeat(5 - d.stars)}</span>
          </div>
          <div className="calnote">
            <span className="k">今日一諺</span><span className="v">「{d.proverb}」</span>
          </div>
        </div>
        <div className="center muted" style={{ fontSize: 10, padding: '6px 16px 0' }}>
          ＊干支・農曆・宜忌為示範演算，正式版將接可靠曆算資料
        </div>

        <button className="ad-more tap" onClick={() => push('almanacDay', { off })}>
          <span className="ad-more-tx">
            <b>📜 看完整農民曆</b>
            <small>建除・星宿・彭祖百忌・胎神・沖煞歲數・財喜貴方位・十二時辰</small>
          </span>
          <span className="go">›</span>
        </button>

        <div className="calacts">
          <button className="b dark tap" onClick={() => push('aiChat')}>✦ 問 AI 時光顧問</button>
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
                <span className="ph-like" style={{ position: 'absolute', bottom: 6, left: 6 }}>♥ {p.likes + (liked[p.id] ? 1 : 0)}</span>
              </div>
              <div className="cap">{p.title}</div>
              <div className="by">@{p.user}</div>
            </button>
          ))}
        </div>

        {/* 節氣攝影挑戰入口（原本掛在「更多」，移到這裡成為獨立卡片） */}
        <button className="feedchal tap" onClick={() => push('challenges')}>
          <span className="fc-ic">🎯</span>
          <span className="fc-t"><b>{d.term}攝影挑戰</b><small>拍下你的{d.term}，前 3 名收錄官方植物月曆</small></span>
          <span className="fc-go">›</span>
        </button>
        </aside>{/* /feed-side */}

      </div>

      {/* 月曆跳日期選擇器：« 年  ‹ 月 | 年月 | 月 ›  年 » */}
      {cal && (
        <div className="sheet-mask" onClick={() => setCal(null)}>
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
                      disabled={far} onClick={() => { setOff(c.off); setCal(null) }}>{c.day}</button>
                  )
                })}
              </div>
              <div className="pad" style={{ display: 'flex', gap: 8 }}>
                <button className="b tap" onClick={() => { setOff(T0); setCal(null) }}>回今日</button>
                <button className="b dark tap" onClick={() => setCal(null)}>完成</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
