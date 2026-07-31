import { useState, useMemo, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SectionHead } from '../components/ui.jsx'
import { useNav } from '../store/nav.jsx'
import { useContent } from '../hooks/useApi.js'
import { dayFor, todayOffset, TERM_ORDER, monthsForTerm, offsetFromDate } from '../data/almanac.js'
import { PRODUCE_BY_MONTH } from '../data/produce.js'
import { lunarFromDate, lunarYearGanzhiIndex, nextLunarOccurrence } from '../data/lunisolar.js'
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
  // 「每日一句」必須與首頁曆頁的「今日一諺」是同一句。
  // ⚠️ 這兩處原本各自算各自的：首頁用 `proverbs[mod(off, len)]`（錨點偏移），
  //    這裡用 `floor(Date.now()/86400000) % len`（epoch 天數）——同一天、同一個 App
  //    卻給出兩句不同的「每日一句」。改成直接取曆算的那一句當起點。
  const todayProverb = dayFor(todayOffset()).proverb
  const [i, setI] = useState(null)
  const baseIdx = Math.max(0, proverbs.findIndex(p => p.tw === todayProverb))
  const cur = proverbs.length ? proverbs[(i ?? baseIdx) % proverbs.length] : null
  return (
    <>
      <TopBar title="台灣諺語" onBack />
      <div className="body">
        {cur && <div className="aicard">
          <div className="t">💬 每日一句</div>
          <div className="d" style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--acard-t)' }}>「{cur.tw}」</div>
          <div className="d" style={{ margin: '0 0 10px' }}>{cur.mean}</div>
          <button className="go tap" onClick={() => { setI(n => ((n ?? baseIdx) + 1) % proverbs.length); setToast('換一句 🗣️') }}>換一句</button>
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
  // 由介紹卡的 time 欄位解析農曆日期 → 實算今年的國曆日期與所屬節氣。
  // ⚠️ 只處理「農曆 M/D」這種明確到日的；「農曆 3 月」「三年一科」沒有確定日期，
  //    不可猜一個日期填上去。
  const dated = useMemo(() => {
    const out = []
    for (const f of festivals) {
      const m = /農曆\s*(\d+)\s*\/\s*(\d+)/.exec(f.time || '')
      if (!m) continue
      const occ = nextLunarOccurrence(Number(m[1]), Number(m[2]))
      if (!occ) continue
      const dt = occ.date
      out.push({
        ...f,
        md: `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`,
        lunarText: `農曆 ${m[1]}/${m[2]}`,
        term: dayFor(offsetFromDate(dt)).term,
        daysAway: occ.daysAway,
      })
    }
    return out.sort((a, b) => a.daysAway - b.daysAway)
  }, [festivals])
  return (
    <>
      <TopBar title="臺灣特色慶典活動" onBack />
      <div className="body">
        {/* ⚠️ 這裡原本是「節氣慶典年表」：把 termGuide 的 24 個節氣各配一場活動。
            但這些慶典絕大多數綁的是**農曆日期**，不是節氣，掛上去每年都會跑掉——
            鹽水蜂炮掛在「立春」，可是它自己的介紹就寫著「元宵 · 農曆 1/15」，
            2026 元宵是 3/3 落在雨水；南鯤鯓王爺祭掛小滿實際在芒種；
            頭城搶孤掛處暑實際已進白露。全都是現在就已經錯的。
            改成由農曆日期逐年實算，落在哪個節氣就顯示哪個節氣。 */}
        {dated.length > 0 && (
          <>
            {/* ⚠️ 標題不可寫死當年年份：今年已過的慶典會算到明年那一次，
                寫「2026 年行事曆」卻列出 2027 的日期就自相矛盾。 */}
            <SectionHead title="接下來的慶典" extra={`${dated.length} 場`} />
            {dated.map((f, i) => (
              <div key={i} className="kv" style={{ padding: '10px 16px', alignItems: 'flex-start',
                background: f.term === today ? 'var(--tone-1)' : undefined }}>
                <b style={{ flex: '0 0 5.5em' }}>{f.emoji} {f.name}</b>
                <span style={{ textAlign: 'right' }}>
                  {f.md}
                  <small className="muted" style={{ display: 'block', fontSize: 'var(--text-2xs)' }}>
                    {f.lunarText} · {f.term}{f.daysAway === 0 ? '（就是今天）' : `（還有 ${f.daysAway} 天）`}
                  </small>
                </span>
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
        <p className="muted" style={{ padding: '10px 16px 0', fontSize: 'var(--text-2xs)', lineHeight: 1.8 }}>
          ＊綁農曆日期的慶典（蜂炮、龍舟、搶孤等）每年對應的國曆日期與節氣都會變動，
          上方行事曆為當年實算結果。標示「三年一科」「兩年一小祭」等非年度性祭典，
          以及只寫月份未定日期者，不列入行事曆、僅保留介紹。實際日期請以主辦單位公告為準。
        </p>
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
  const [showAll, setShowAll] = useState(false)
  const g = byTerm[term]

  // ── 當令農產：直接取農糧署開放資料，依節氣涵蓋的月份取聯集 ──
  // ⚠️ 原本是人工在 termGuide.js 維護一張表，每個節氣只有 3–7 項，
  //    而官方 7 月盛產有 41 項——芒果、鳳梨、荔枝、龍眼、綠竹筍全被漏掉。
  //    改成從官方資料算，覆蓋率問題就不會再回來。
  const { produce, months } = useMemo(() => {
    const ms = monthsForTerm(term)
    const seen = new Map()
    for (const m of ms) {
      for (const it of (PRODUCE_BY_MONTH[String(m)] || [])) {
        // 同一品項橫跨兩個月時只留一筆，但記下它從哪個月開始盛產
        if (!seen.has(it.name)) seen.set(it.name, { ...it, month: m })
      }
    }
    return { produce: [...seen.values()], months: ms }
  }, [term])
  // 換節氣時收合，否則上一個節氣展開過，下一個就直接是 41 項的長清單
  useEffect(() => { setShowAll(false) }, [term])
  const TYPES = ['水果', '蔬菜', '雜糧特作', '花卉']
  const shown = showAll ? produce : produce.slice(0, 6)

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
          <p className="muted" style={{ padding: '4px 16px 0', fontSize: 'var(--text-xs)' }}>{g.date}</p>

          <div className="card">
            <h4><Icon name="branch" /> 陸・農產
              <small className="muted" style={{ fontWeight: 400, marginLeft: 6, fontSize: 'var(--text-2xs)' }}>
                {months.map(m => `${m} 月`).join('・')}盛產　共 {produce.length} 項
              </small>
            </h4>
            {!produce.length
              ? <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>這個節氣沒有收錄當令品項</p>
              : shown.map((r, i) => (
                <div key={r.name} className="kv" style={{ padding: '8px 0', alignItems: 'flex-start' }}>
                  <b style={{ flex: '0 0 6.5em' }}>
                    {r.name}
                    <small className="muted" style={{ display: 'block', fontWeight: 400, fontSize: 'var(--text-2xs)' }}>
                      {r.type}{months.length > 1 ? ` · ${r.month} 月起` : ''}
                    </small>
                  </b>
                  <span className="muted" style={{ textAlign: 'right', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                    {r.variety && <em style={{ fontStyle: 'normal', color: 'var(--teal-ink)' }}>{r.variety}<br /></em>}
                    {r.origin || '—'}
                  </span>
                </div>
              ))}
            {produce.length > 6 && (
              <button className="b tap" style={{ marginTop: 8 }} onClick={() => setShowAll(v => !v)}>
                {showAll ? '收合' : `展開看全部（${produce.length} 項）`}
              </button>
            )}
          </div>

          {/* ⚠️ 漁獲資料多數節氣是空的。入口文案寫「農產漁獲」卻給一句
              「沒有收錄」＝承諾落空，比不提還糟。資料補齊前直接不顯示這個區塊。 */}
          {g.sea?.length > 0 && <ProduceCard icon="wave" title="海・漁獲" rows={g.sea} />}

          {g.foods?.length > 0 && (
            <div className="card">
              <h4>應景食物</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {g.foods.flatMap(f => f.split(/[、，]/)).map(f => f.trim()).filter(Boolean)
                  .map((f, i) => <span key={i} className="ty">{f}</span>)}
              </div>
            </div>
          )}

          <p className="muted" style={{ padding: '0 16px', fontSize: 'var(--text-2xs)', lineHeight: 1.7 }}>
            ＊產地為主要產區，實際上市時間受當年氣候影響。<br />
            ＊農產資料來源：農業部（農糧署）「每月盛產農產品產地」開放資料，
            依政府資料開放授權條款第 1 版使用；本頁依節氣涵蓋的月份取聯集顯示。
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
        <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>這個節氣沒有收錄當令品項</p>
      ) : rows.map((r, i) => (
        <div key={i} className="kv" style={{ padding: '8px 0', alignItems: 'flex-start' }}>
          <b style={{ flex: '0 0 5.5em' }}>{r.name}</b>
          <span className="muted" style={{ textAlign: 'right', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>{r.origin || '—'}</span>
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
            <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>{g?.date || a.sub}</p>
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
              <p className="muted" style={{ fontSize: 'var(--text-2xs)', marginTop: 6, lineHeight: 1.7 }}>
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
