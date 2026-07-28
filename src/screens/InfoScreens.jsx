import { useState, useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'
import { dayFor, todayOffset, TERM_ORDER } from '../data/almanac.js'
import { lunarFromDate, lunarYearGanzhiIndex } from '../data/lunisolar.js'
import { weighBone, HOUR_LABELS } from '../data/bone.js'

// 今日所屬節氣 —— 節氣生活資料（當令食材/俗語/養生/開運色）都以此為預設焦點。
// ⚠️ 要用 dayFor(todayOffset()) 取真實今日，不可用 dayFor(0)（0 是錨點 6/6＝芒種）。
const useCurrentTerm = () => useMemo(() => dayFor(todayOffset()).term, [])

// termGuide（ref_items）→ 依節氣查表；資料庫還沒載完時回 null，呼叫端要 guard。
function useTermGuide() {
  const items = useContent('termGuide')
  return useMemo(() => {
    const byTerm = {}
    for (const g of items) if (g?.term) byTerm[g.term] = g
    // 依節氣年度順序排列（資料庫 sort 已是此序，但 CMS 改過可能亂序）。
    // ⚠️ TERM_ORDER 以「大寒」開頭（那是 almanac.js 依國曆月日排的查表用序），
    // 但一年之始是立春——清單要從立春排起，否則使用者看到的年表開頭很怪。
    const start = TERM_ORDER.indexOf('立春')
    const yearOrder = [...TERM_ORDER.slice(start), ...TERM_ORDER.slice(0, start)]
    const list = yearOrder.filter(t => byTerm[t]).map(t => byTerm[t])
    return { byTerm, list }
  }, [items])
}

// 選中的節氣 chip 捲進視野。
// ⚠️ 24 個 chip 排成一列橫向捲動，預設選中的「今日節氣」多半在中段，
// 不捲的話使用者開頁只看到立春附近，會以為選的是立春。
// 用 inline:'center' 而非 scrollIntoView() 預設值——預設會連垂直方向一起捲，整頁會跳。
const centerChip = (el) => {
  if (!el) return
  el.scrollIntoView({ inline: 'center', block: 'nearest' })
}

export function Proverbs() {
  const { setToast } = useNav()
  const proverbs = useContent('proverbs')   // 諺語嚴格來自資料庫
  const term = useCurrentTerm()
  const { byTerm, list } = useTermGuide()
  const curGuide = byTerm[term]
  // 依日期輪替「每日一句」
  const [i, setI] = useState(() => Math.floor(Date.now() / 86400000))
  const cur = proverbs.length ? proverbs[i % proverbs.length] : null
  return (
    <>
      <TopBar title="台灣諺語" onBack />
      <div className="body">
        {cur && <div className="aicard">
          <div className="t">💬 每日一句</div>
          <div className="d" style={{ fontSize: 15, fontWeight: 700, color: 'var(--acard-t)' }}>「{cur.tw}」</div>
          <div className="d" style={{ margin: '0 0 10px' }}>{cur.mean}</div>
          <button className="go tap" onClick={() => { setI(n => (n + 1) % proverbs.length); setToast('換一句 🗣️') }}>換一句</button>
        </div>}
        {/* 節氣俗語：先講當令那一句，再列全年 */}
        {curGuide?.sayings?.length > 0 && (
          <>
            <SectionHead title={`${term}俗語`} extra="當令" />
            {curGuide.sayings.map((s, k) => (
              <div key={k} className="list-item">
                <div className="big"><Icon name="scroll" /></div>
                <div className="txt"><b>{s}</b><span>{term}・{curGuide.date}</span></div>
              </div>
            ))}
          </>
        )}

        <SectionHead title="更多諺語" />
        {proverbs.map((p, k) => (
          <div key={k} className="list-item">
            <div className="big">🗣️</div>
            <div className="txt"><b>{p.tw}</b><span>{p.mean}</span></div>
          </div>
        ))}

        {/* 全年節氣俗語年表（沒有俗語的節氣不列，不補假句） */}
        {list.some(g => g.sayings?.length) && (
          <>
            <SectionHead title="節氣俗語年表" extra={`${list.filter(g => g.sayings?.length).length} 個節氣`} />
            {list.filter(g => g.sayings?.length).map(g => (
              <div key={g.term} className="kv" style={{ padding: '10px 16px', alignItems: 'flex-start' }}>
                <b style={{ flex: '0 0 52px' }}>{g.term}</b>
                <span style={{ textAlign: 'right' }}>{g.sayings.join('、')}</span>
              </div>
            ))}
          </>
        )}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

export function Festivals() {
  const festivals = useContent('festivals')
  const today = useCurrentTerm()
  const { list } = useTermGuide()
  return (
    <>
      <TopBar title="臺灣特色慶典活動" onBack />
      <div className="body">
        {/* 節氣慶典年表：termGuide 逐節收錄的活動。
            ⚠️ 原始資料只有活動名稱，沒有地點與簡介——不得替它編造，
            下方詳細介紹卡片才是有查證地點/說明的那幾場。 */}
        {list.length > 0 && (
          <>
            <SectionHead title="節氣慶典年表" extra={`${list.reduce((a, g) => a + (g.festivals?.length || 0), 0)} 場`} />
            {list.filter(g => g.festivals?.length).map(g => (
              <div key={g.term} className="kv"
                style={{ padding: '10px 16px', alignItems: 'flex-start', background: g.term === today ? 'var(--tone-1)' : undefined }}>
                <b style={{ flex: '0 0 52px' }}>{g.term}</b>
                <span style={{ textAlign: 'right' }}>{g.festivals.join('、')}</span>
              </div>
            ))}
          </>
        )}

        <SectionHead title="慶典詳細介紹" />
        {festivals.map((f, i) => (
          <div key={i} className="card">
            <h4>{f.emoji} {f.name}</h4>
            <div className="kv"><span>時間</span><span className="muted">{f.time}</span></div>
            <div className="kv"><span>地點</span><span className="muted">{f.place}</span></div>
            <p style={{ marginTop: 8 }}>{f.desc}</p>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

export function Flowers() {
  const flowers = useContent('flowers')
  const { list } = useTermGuide()
  const blooms = list.filter(g => g.flowers?.length)
  return (
    <>
      <TopBar title="臺灣賞花景點" onBack />
      <div className="body">
        {/* 節氣花期：termGuide 只收錄了有明確花期的節氣（雨水、小暑），其餘留空不補 */}
        {blooms.length > 0 && (
          <>
            <SectionHead title="節氣花期" />
            {blooms.map(g => (
              <div key={g.term} className="kv" style={{ padding: '10px 16px', alignItems: 'flex-start' }}>
                <b style={{ flex: '0 0 52px' }}>{g.term}</b>
                <span style={{ textAlign: 'right' }}>{g.flowers.join('、')}</span>
              </div>
            ))}
          </>
        )}
        <SectionHead title="賞花景點" />
        {flowers.map((f, i) => (
          <div key={i} className="list-item">
            <div className="big">{f.emoji}</div>
            <div className="txt"><b>{f.name}</b><span>花期 {f.period}　·　{f.place}</span></div>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// 當令食材 —— 24 節氣逐節列出台灣的當令農產與漁獲，附主要產地。
// 資料來自 termGuide（《24節氣養生資料庫》），預設停在今日所屬節氣。
export function Ingredients() {
  const today = useCurrentTerm()
  const { byTerm, list } = useTermGuide()
  const [term, setTerm] = useState(today)
  const g = byTerm[term]

  return (
    <>
      <TopBar title="當令食材 陸・海" onBack />
      <div className="body">
        <div className="chips" style={{ paddingTop: 12 }}>
          {list.map(t => (
            <button key={t.term} className={`chip tap ${term === t.term ? 'on' : ''}`} onClick={() => setTerm(t.term)}
              ref={t.term === today ? centerChip : null}>
              {t.term}{t.term === today ? '・今' : ''}
            </button>
          ))}
        </div>

        {!g ? <div className="empty">載入中…</div> : <>
          <p className="muted" style={{ padding: '4px 16px 0', fontSize: 12 }}>{g.date}</p>

          <ProduceCard icon="branch" title="陸・農產" rows={g.land} />
          <ProduceCard icon="wave" title="海・漁獲" rows={g.sea} />

          {g.foods?.length > 0 && (
            <div className="card">
              <h4>應景食物</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {g.foods.flatMap(f => f.split(/[、，]/)).map(f => f.trim()).filter(Boolean)
                  .map((f, i) => <span key={i} className="ty">{f}</span>)}
              </div>
            </div>
          )}

          <p className="muted" style={{ padding: '0 16px', fontSize: 11, lineHeight: 1.7 }}>
            ＊產地為主要產區，實際上市時間受當年氣候影響。
          </p>
        </>}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// 農產/漁獲清單：名稱＋產地。空的節氣（如小滿無當令漁獲）誠實顯示，不補假資料。
function ProduceCard({ icon, title, rows }) {
  return (
    <div className="card">
      <h4><Icon name={icon} /> {title}</h4>
      {!rows?.length ? (
        <p className="muted" style={{ fontSize: 12 }}>這個節氣沒有收錄當令品項</p>
      ) : rows.map((r, i) => (
        <div key={i} className="kv" style={{ padding: '8px 0', alignItems: 'flex-start' }}>
          <b style={{ flex: '0 0 5.5em' }}>{r.name}</b>
          <span className="muted" style={{ textAlign: 'right', fontSize: 12, lineHeight: 1.6 }}>{r.origin || '—'}</span>
        </div>
      ))}
    </div>
  )
}

export function SolarTerms() {
  const solarTermArticles = useContent('solarTerms')
  const today = useCurrentTerm()
  const { byTerm } = useTermGuide()
  // 預設停在今日所屬節氣（找不到才退回第一篇）
  const [term, setTerm] = useState(null)
  const a = solarTermArticles.find(t => t.term === (term || today)) || solarTermArticles[0]
  const g = a ? byTerm[a.term] : null

  return (
    <>
      <TopBar title="24 節氣專欄" onBack />
      <div className="body">
        <div className="chips" style={{ paddingTop: 12 }}>
          {solarTermArticles.map(t => (
            <button key={t.term} className={`chip tap ${a?.term === t.term ? 'on' : ''}`} onClick={() => setTerm(t.term)}
              ref={t.term === today ? centerChip : null}>
              {t.emoji} {t.term}
            </button>
          ))}
        </div>
        {a && <>
          <div className="img" style={{ height: 150, background: 'var(--tone-1)', fontSize: 56 }}>{a.emoji}</div>
          <div className="article">
            <h3>{a.term}{a.term === today && <span className="ty" style={{ marginLeft: 8, verticalAlign: 'middle' }}>今日節氣</span>}</h3>
            <p className="muted" style={{ fontSize: 12 }}>{g?.date || a.sub}</p>
            {a.body.split('\n\n').map((para, k) => <p key={k}>{para}</p>)}
          </div>

          {/* 以下為《24節氣養生資料庫》的節氣生活層資料，逐節不同 */}
          {g?.tips?.length > 0 && (
            <div className="card">
              <h4><Icon name="bell2" /> 生活小叮嚀</h4>
              {g.tips.map((t, k) => (
                <p key={k} style={{ marginTop: k ? 6 : 4, lineHeight: 1.8 }}>・{t}</p>
              ))}
            </div>
          )}

          {(g?.organ || g?.habits?.length) && (
            <div className="card">
              <h4><Icon name="heartPair" /> 節氣養生</h4>
              {g.organ && <div className="kv" style={{ padding: '8px 0' }}><span>保養重點</span><b>{g.organ}</b></div>}
              {g.habits?.map((h, k) => (
                <div key={k} className="kv" style={{ padding: '8px 0' }}><span>作息</span><b>{h}</b></div>
              ))}
            </div>
          )}

          {(g?.luckyColor || g?.colors?.length) && (
            <div className="card">
              <h4><Icon name="palette" /> 開運色</h4>
              {g.luckyColor && <div className="kv" style={{ padding: '8px 0' }}><span>主色</span><b>{g.luckyColor}</b></div>}
              {g.colors?.map((c, k) => (
                <div key={k} className="kv" style={{ padding: '8px 0' }}><span>{c.color}</span><b>{c.effect}</b></div>
              ))}
              <p className="muted" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.7 }}>
                ＊開運色屬傳統民俗說法，各流派或有差異，僅供參考。
              </p>
            </div>
          )}

          {(g?.foods?.length || g?.festivals?.length || g?.sayings?.length) && (
            <div className="card">
              <h4><Icon name="scroll" /> 應景</h4>
              {g.foods?.length > 0 && <div className="kv" style={{ padding: '8px 0', alignItems: 'flex-start' }}>
                <span style={{ flex: '0 0 4em' }}>食物</span><b style={{ textAlign: 'right' }}>{g.foods.join('、')}</b></div>}
              {g.festivals?.length > 0 && <div className="kv" style={{ padding: '8px 0', alignItems: 'flex-start' }}>
                <span style={{ flex: '0 0 4em' }}>慶典</span><b style={{ textAlign: 'right' }}>{g.festivals.join('、')}</b></div>}
              {g.sayings?.length > 0 && <div className="kv" style={{ padding: '8px 0', alignItems: 'flex-start' }}>
                <span style={{ flex: '0 0 4em' }}>俗語</span><b style={{ textAlign: 'right' }}>{g.sayings.join('、')}</b></div>}
            </div>
          )}
        </>}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// 袁天罡秤骨 —— 骨重依傳統四柱（農曆年月日時）對照表相加，見 data/bone.js。
// ⚠️ 三個原本的缺失（使用者回報）：沒說輸入是國曆還是農曆、沒有時辰、
//    骨重是自創公式所以跟任何參考網站都對不上。三項都已修正。
export function Bone() {
  const { setToast } = useNav()
  const [cal, setCal] = useState('solar')            // solar=國曆 / lunar=農曆
  const [b, setB] = useState({ y: '', m: '', d: '' })
  const [hourIdx, setHourIdx] = useState(0)
  const [res, setRes] = useState(null)

  const go = () => {
    const Y = Number(b.y), M = Number(b.m), D = Number(b.d)
    if (!Y || Y < 1900 || Y > 2100) { setToast('請輸入西元出生年（1900–2100）'); return }
    if (!M || M < 1 || M > 12) { setToast('請輸入出生月份'); return }
    if (!D || D < 1 || D > 31) { setToast('請輸入出生日'); return }

    let gz60, lmonth, lday, shownLunar
    if (cal === 'solar') {
      const L = lunarFromDate(Y, M, D)
      if (!L) { setToast('這個日期換算不出農曆，請確認'); return }
      gz60 = lunarYearGanzhiIndex(Y, M, D)
      lmonth = L.month; lday = L.day; shownLunar = L.text
    } else {
      // 直接輸入農曆：年干支由農曆年推（正月初一為歲首）
      if (D > 30) { setToast('農曆每月最多 30 日'); return }
      gz60 = (((Y - 4) % 60) + 60) % 60
      lmonth = M; lday = D
      shownLunar = `農曆${M}月${D}日`
    }
    const w = weighBone({ gz60, lmonth, lday, hourIdx })
    if (!w) { setToast('查不到對應骨重，請確認生辰'); return }
    setRes({ ...w, shownLunar })
  }

  return (
    <>
      <TopBar title="袁天罡秤骨神術" onBack />
      <div className="body">
        <div className="pad">
          {/* 曆別必須讓使用者選並看得見——傳統秤骨用農曆，輸入國曆會整組查錯表 */}
          <div className="seg" role="tablist" aria-label="曆別" style={{ marginBottom: 10 }}>
            {[['solar', '國曆（自動換農曆）'], ['lunar', '農曆']].map(([k, lbl]) => (
              <button key={k} role="tab" aria-selected={cal === k}
                className={`tap ${cal === k ? 'on' : ''}`} onClick={() => { setCal(k); setRes(null) }}>{lbl}</button>
            ))}
          </div>
          {/* ⚠️ .search 基礎樣式是 flex:0 0 auto，三個並排時不會收縮，
              390px 手機上第三個會溢出 162px。必須 minWidth:0 + flex:'1 1 0'
              ——flex 項目預設 min-width:auto，光給 flex:1 仍不會縮到內容寬以下。 */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[['y', '西元年', 4], ['m', '月', 2], ['d', '日', 2]].map(([k, lbl, len]) => (
              <input key={k} className="search" style={{ margin: 0, flex: '1 1 0', minWidth: 0, textAlign: 'center' }}
                placeholder={lbl} aria-label={`出生${lbl}`} maxLength={len} value={b[k]} inputMode="numeric"
                onChange={e => setB(s => ({ ...s, [k]: e.target.value.replace(/\D/g, '') }))} />
            ))}
          </div>
          <div style={{ height: 10 }} />
          <label className="muted" style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: 4 }}>出生時辰</label>
          <select className="search" style={{ margin: 0, width: '100%' }} aria-label="出生時辰"
            value={hourIdx} onChange={e => setHourIdx(Number(e.target.value))}>
            {HOUR_LABELS.map((h, i) => <option key={h} value={i}>{h}</option>)}
          </select>
          <div style={{ height: 10 }} />
          <button className="btn-primary tap" onClick={go}>開始秤骨</button>
        </div>

        {res ? (
          <div className="card">
            <h4>命理骨重：{res.text}</h4>
            <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
              以 {res.shownLunar} · {HOUR_LABELS[hourIdx]} 計算
            </p>
            {/* 四項分開列出，使用者可自行與其他網站逐項對照 */}
            {res.parts.map(p => (
              <div key={p.k} className="kv" style={{ padding: '8px 0' }}>
                <span>{p.k}</span><b>{p.text}</b>
              </div>
            ))}
            <div className="kv" style={{ padding: '8px 0', borderTop: '1px solid var(--line2)' }}>
              <span>合計</span><b>{res.text}（{res.band}）</b>
            </div>
            <p style={{ marginTop: 8, lineHeight: 1.9 }}>{res.bandNote}</p>
            <p className="muted" style={{ marginTop: 8, fontSize: 'var(--text-2xs)', lineHeight: 1.7 }}>
              ＊骨重表依算準網《袁天罡稱骨算命對照表》；坊間版本的日骨重略有差異，
              與其他網站相差一兩錢屬版本不同。完整《稱骨歌》五十一首批語未收錄，
              此處以命格區間概述取代，不以自撰詩句冒充原文。秤骨為傳統民俗趣味，僅供參考娛樂。
            </p>
          </div>
        ) : <div className="empty"><div className="empty-ic"><Icon name="ruler" /></div>輸入生辰與時辰，為你秤一秤命格</div>}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
