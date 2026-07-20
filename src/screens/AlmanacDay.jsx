import { TopBar, SectionHead, Disclaimer, useGlossary, GlossTerm, GlossPanel } from '../components/ui.jsx'
import { dayFor, todayOffset } from '../data/almanac.js'

// 完整農民曆日頁 —— 傳統每日曆頁的所有項目（建除、星宿、彭祖百忌、胎神、沖煞歲數、財喜貴方位、十二時辰、特殊日）。
export default function AlmanacDay({ off }) {
  const d = dayFor(off ?? todayOffset())
  const gl = useGlossary()   // 宜/忌 詞彙白話解釋
  return (
    <>
      <TopBar title="完整農民曆" onBack />
      <div className="body">
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
        <div className="ad-gz">
          <div><small>年柱</small><b>{d.yearGZ}</b></div>
          <div><small>月柱</small><b>{d.monthGZ}</b></div>
          <div><small>日柱</small><b>{d.ganzhi.replace('日', '')}</b></div>
          <div><small>納音</small><b>{d.wuxing}</b></div>
        </div>

        {/* 宜忌 */}
        <SectionHead title="今日宜忌" />
        <div className="card">
          <div className="ad-yj">
            <div className="col"><div className="yl" style={{ color: 'var(--yi)' }}>宜</div>{d.yi.map(t => <GlossTerm key={t} term={t} cls="ty" gl={gl} />)}</div>
            <div className="col"><div className="yl" style={{ color: 'var(--ji)' }}>忌</div>{d.ji.map(t => <GlossTerm key={t} term={t} cls="tn" gl={gl} />)}</div>
          </div>
          <GlossPanel gl={gl} />
          <div className="ad-note">💡 點任一宜忌詞可看白話解釋</div>
        </div>

        {/* 值日神煞 */}
        <SectionHead title="值日・神煞" />
        <div className="card">
          <div className="kv"><span>建除十二神</span><b>{d.jianchu}日</b></div>
          <div className="ad-note">{d.jianchuYi}</div>
          <div className="kv"><span>二十八星宿</span><b>{d.xiu}宿・{d.xiuAnimal}<span className={d.xiuLuck === '吉' ? 'ad-good' : 'ad-bad'}>（{d.xiuLuck}）</span></b></div>
          <div className="kv"><span>每日胎神占方</span><b>{d.taishen}</b></div>
          <div className="kv" style={{ borderBottom: 'none' }}><span>彭祖百忌</span></div>
          <div className="ad-note">{d.pengzu[0]}<br />{d.pengzu[1]}</div>
        </div>

        {/* 沖煞 */}
        <SectionHead title="沖煞" />
        <div className="card">
          <div className="kv"><span>今日沖煞</span><b>沖{d.chong.zodiac}（{d.chong.gz}）煞{d.chong.dir}</b></div>
          <div className="kv" style={{ borderBottom: 'none' }}><span>沖煞歲數（虛歲）</span><b>{d.chong.ages.join('、')} 歲</b></div>
          <div className="ad-note">＊沖煞歲數為<b>虛歲</b>（出生即一歲），非實歲；所列為所沖生肖的近三個世代。</div>
        </div>

        {/* 吉神方位 */}
        <SectionHead title="今日吉神方位" />
        <div className="ad-dirs">
          <div className="ad-dir"><small>喜神</small><b>{d.xishen}</b></div>
          <div className="ad-dir"><small>財神</small><b>{d.caishen}</b></div>
          <div className="ad-dir"><small>貴神（天乙貴人）</small><b>{d.guiren}</b></div>
        </div>

        {/* 十二時辰 */}
        <SectionHead title="十二時辰吉凶" extra={`吉時 ${d.luckyHours}`} />
        <div className="ad-hours">
          {d.hours12.map(h => (
            <div key={h.zhi} className={`ad-hour ${h.luck === '吉' ? 'good' : h.luck === '凶' ? 'bad' : ''}`}>
              <b>{h.zhi}</b><small>{h.range}</small><span>{h.luck}</span>
            </div>
          ))}
        </div>

        <Disclaimer text="干支、建除、星宿、宜忌、沖煞、胎神等擇日神煞屬民俗文化範疇，各家流派判定可能相異；本頁為確定性示範演算（非權威曆算），節氣以太陽視黃經為準之天文層另計。重大事宜請以中央氣象署天文資料與專業擇日師為準。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
