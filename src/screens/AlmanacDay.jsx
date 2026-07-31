import { TopBar, SectionHead, Disclaimer, useGlossary, GlossTerm, GlossPanel, Link } from '../components/ui.jsx'
import { dayFor, todayOffset, offsetFromDate, dateFromOffset } from '../data/almanac.js'
import { useNav } from '../store/nav.jsx'

// YYYY-MM-DD ⇄ 錨點偏移。⚠️ 要用本地時間建構 Date，不可 new Date('2026-08-15')
//    ——那會被當成 UTC 午夜，在 UTC+8 解讀成前一天早上 8 點，整頁差一天。
const isoOf = (off) => {
  const d = dateFromOffset(off)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const offOfIso = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return null
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(dt.getTime()) || dt.getMonth() !== Number(m[2]) - 1) return null   // 擋 2026-02-31
  return offsetFromDate(dt)
}
const RANGE = 1095   // 與首頁一致：今日前後約三年

// 完整國民曆日頁 —— 傳統每日曆頁的所有項目（建除、星宿、彭祖百忌、胎神、沖煞歲數、財喜貴方位、十二時辰、特殊日）。
// ⚠️ 這頁原本沒有自己的日期參數，也沒有翻日控制項：只能從首頁一天一天點過去，
//    重新整理就跳回今天，而且「2026年8月15日 國民曆」這類長尾搜尋完全接不到。
//    改成 /almanac/day/:date? —— 不帶日期＝今天，帶日期＝可分享的固定網址。
export default function AlmanacDay({ off, date }) {
  const { replace } = useNav()
  const T0 = todayOffset()
  // 相容舊的呼叫方式（首頁曾直接傳 off）；網址參數優先
  const cur = offOfIso(date) ?? off ?? T0
  const d = dayFor(Math.max(-RANGE, Math.min(RANGE, cur)))
  const gl = useGlossary()   // 宜/忌 詞彙白話解釋
  // 翻日＝換網址（用 replace 而不是 push，否則按上一頁要一天一天倒退回去）
  const goTo = (o) => replace('almanacDay', { date: isoOf(Math.max(-RANGE, Math.min(RANGE, o))) })

  return (
    <>
      {/* ⚠️ H1 要帶關鍵字。原本是「完整國民曆」——純功能名，搜尋的人打的是
          「2026年8月15日 農民曆」「今日宜忌」，H1 完全沒有這些字。
          TopBar 的 title 會渲染成 <h1>（見 ui.jsx）。 */}
      <TopBar title={`${d.solar.replace(/\s/g, '')} 國民曆｜宜忌・吉時・沖煞`} onBack />
      <div className="body ad-sheet">
        {/* 日期導覽：前後翻日＋直接選日期 */}
        <div className="ad-nav">
          <button className="tap" onClick={() => goTo(cur - 1)} disabled={cur <= -RANGE} aria-label="前一天">‹</button>
          <input type="date" className="ad-date" value={isoOf(cur)} aria-label="選擇日期"
            min={isoOf(-RANGE)} max={isoOf(RANGE)}
            onChange={(e) => { const o = offOfIso(e.target.value); if (o !== null) goTo(o) }} />
          <button className="tap" onClick={() => goTo(cur + 1)} disabled={cur >= RANGE} aria-label="後一天">›</button>
        </div>
        {cur !== T0 && (
          <div className="ad-nav-today">
            <button className="pill sm tap" onClick={() => goTo(T0)}>↩ 回今日</button>
          </div>
        )}
        {/* ⚠️ 前後日必須是真的 <a href>，爬蟲才走得完這 730 天的鏈。
            上面的 ‹ › 是 <button>（給鍵盤與觸控用），爬蟲點不到也記不住。 */}
        <nav className="ad-daylinks" aria-label="前後日曆頁">
          <Link screen="almanacDay" params={{ date: isoOf(cur - 1) }}>‹ 前一天（{isoOf(cur - 1)}）</Link>
          <Link screen="almanacDay" params={{ date: isoOf(cur + 7) }}>下週同日 ›</Link>
          <Link screen="almanacDay" params={{ date: isoOf(cur + 1) }}>後一天（{isoOf(cur + 1)}）›</Link>
        </nav>
        {/* 頭部 */}
        <div className="ad-head">
          <div className="ad-solar">{d.solar}</div>
          <div className="ad-sub">{d.weekday} · {d.lunar}</div>
          <div className="ad-term">{d.term}{d.festival && <span className="ad-fest">· {d.festival}</span>}</div>
        </div>

        {/* 特殊日提示 */}
        {d.flags.length > 0 && (
          <div className="ad-flags">
            {d.flags.map(f => (
              <div key={f.t} className={`ad-flag ${f.good ? 'good' : 'bad'}`}>
                <b>{f.t}</b><span>{f.d}</span>
              </div>
            ))}
          </div>
        )}

        {/* 三柱干支 */}
        <section className="ad-blk b-gz" aria-label="干支">
        <div className="ad-gz">
          <div><small>年柱</small><b>{d.yearGZ}</b></div>
          <div><small>月柱</small><b>{d.monthGZ}</b></div>
          <div><small>日柱</small><b>{d.ganzhi.replace('日', '')}</b></div>
          <div><small>納音</small><b>{d.wuxing}</b></div>
        </div>
        </section>

        {/* 宜忌 */}
        <section className="ad-blk b-yj" aria-label="今日宜忌">
        <SectionHead title="今日宜忌" />
        <div className="card">
          <div className="ad-yj">
            <div className="col"><div className="yl" style={{ color: 'var(--yi)' }}>宜</div>{d.yi.map(t => <GlossTerm key={t} term={t} cls="ty" gl={gl} />)}</div>
            <div className="col"><div className="yl" style={{ color: 'var(--ji)' }}>忌</div>{d.ji.map(t => <GlossTerm key={t} term={t} cls="tn" gl={gl} />)}</div>
          </div>
          <GlossPanel gl={gl} />
          <div className="ad-note">💡 點任一宜忌詞可看白話解釋</div>
        </div>
        </section>

        {/* 值日神煞 */}
        <section className="ad-blk b-ss" aria-label="值日神煞">
        <SectionHead title="值日・神煞" />
        <div className="card">
          <div className="kv"><span>建除十二神</span><b>{d.jianchu}日</b></div>
          <div className="ad-note">{d.jianchuYi}</div>
          <div className="kv"><span>二十八星宿</span><b>{d.xiu}宿・{d.xiuAnimal}<span className={d.xiuLuck === '吉' ? 'ad-good' : 'ad-bad'}>（{d.xiuLuck}）</span></b></div>
          <div className="kv"><span>每日胎神占方</span><b>{d.taishen}</b></div>
          <div className="kv" style={{ borderBottom: 'none' }}><span>彭祖百忌</span></div>
          <div className="ad-note">{d.pengzu[0]}<br />{d.pengzu[1]}</div>
        </div>
        </section>

        {/* 沖煞 */}
        <section className="ad-blk b-cs" aria-label="沖煞">
        <SectionHead title="沖煞" />
        <div className="card">
          <div className="kv"><span>今日沖煞</span><b>沖{d.chong.zodiac}（{d.chong.gz}）煞{d.chong.dir}</b></div>
          <div className="kv" style={{ borderBottom: 'none' }}><span>沖煞歲數（虛歲）</span><b>{d.chong.ages.join('、')} 歲</b></div>
          <div className="ad-note">＊沖煞歲數為<b>虛歲</b>（出生即一歲），非實歲；所列為所沖生肖的近三個世代。</div>
        </div>
        </section>

        {/* 吉神方位 */}
        <section className="ad-blk b-dir" aria-label="今日吉神方位">
        <SectionHead title="今日吉神方位" />
        {/* ⚠️ 這一區叫「方位」，四格就都要是方位。舊版喜神／財神給方位、
            貴神卻給生肖，性質不一致；天乙貴人的生肖另外列一行。 */}
        <div className="ad-dirs">
          <div className="ad-dir"><small>喜神</small><b>{d.xishen}</b></div>
          <div className="ad-dir"><small>財神</small><b>{d.caishen}</b></div>
          <div className="ad-dir"><small>陽貴神</small><b>{d.yanggui}</b></div>
          <div className="ad-dir"><small>陰貴神</small><b>{d.yingui}</b></div>
        </div>
        <div className="card">
          <div className="kv" style={{ borderBottom: 'none' }}>
            <span>天乙貴人（生肖）</span><b>{d.guiren}</b>
          </div>
          <div className="ad-note">＊天乙貴人指的是「哪些生肖的人是你今日的貴人」，與上方的方位是兩回事。</div>
        </div>
        </section>

        {/* 十二時辰 */}
        <section className="ad-blk b-hr" aria-label="十二時辰吉凶">
        <SectionHead title="十二時辰吉凶" extra={`吉時 ${d.luckyHours}`} />
        <div className="ad-hours">
          {d.hours12.map(h => (
            <div key={h.zhi} className={`ad-hour ${h.luck === '吉' ? 'good' : h.luck === '凶' ? 'bad' : ''}`}>
              {/* 顯示黃道黑道十二神的神名——這是判吉凶的依據，寫出來使用者才能與通書對照 */}
              <b>{h.zhi}</b><small>{h.range}</small><span>{h.shen || h.luck}</span>
            </div>
          ))}
        </div>
        </section>

        <Disclaimer text="農曆月日、二十四節氣、年月日干支依天文演算（朔望月與太陽視黃經，UTC+8 日界）。建除、星宿、宜忌、沖煞、胎神等擇日神煞屬民俗文化範疇，各家流派判定可能相異。重大事宜請以中央氣象署天文資料與專業擇日師為準。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
