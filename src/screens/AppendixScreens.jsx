import { useState } from 'react'
import { nayinOf } from '../data/almanac.js'
import { TopBar, SectionHead, Disclaimer } from '../components/ui.jsx'

// 國民曆常見附錄工具表：食物相剋、度量衡換算、六十甲子與三合六合對照。

const FOODS = [
  { a: '螃蟹', b: '柿子', why: '皆屬寒涼，同食易腸胃不適、腹瀉' },
  { a: '菠菜', b: '豆腐', why: '草酸＋鈣→草酸鈣（傳統說法，汆燙可解）' },
  // ⚠️ 這一則是「已被推翻的都市傳說」，不是相剋。海鮮裡的砷絕大多數是無毒的
  // 砷甜菜鹼，維他命 C 把它變成砒霜的說法沒有實證。留著是為了主動破除，
  // 不可寫成「理論上生成砷」——那等於用科學語氣替謠言背書。
  { a: '海鮮', b: '大量維他命C', why: '已證實為誤傳：海鮮中的砷主要是無毒的砷甜菜鹼，不會被維他命 C 變成砒霜', myth: true },
  { a: '牛奶', b: '巧克力', why: '草酸鈣，影響鈣吸收（份量少無妨）' },
  { a: '白蘿蔔', b: '紅蘿蔔', why: '生食時酵素破壞維C（煮熟即可）' },
  { a: '蜂蜜', b: '生蔥', why: '民間忌口說法，現代營養學存疑' },
]

const UNITS = [
  { g: '重量', rows: [['1 台斤', '＝ 0.6 公斤 ＝ 16 兩'], ['1 兩', '＝ 37.5 公克'], ['1 公斤', '＝ 1.667 台斤']] },
  { g: '長度', rows: [['1 台尺', '＝ 30.3 公分'], ['1 台寸', '＝ 3.03 公分'], ['1 公尺', '＝ 3.3 台尺']] },
  { g: '面積', rows: [['1 坪', '＝ 3.306 平方公尺（約 1.8×1.8m）'], ['1 甲', '＝ 2934 坪 ＝ 0.97 公頃'], ['1 分地', '＝ 293.4 坪']] },
  { g: '容量', rows: [['1 斗', '＝ 10 升'], ['1 石', '＝ 10 斗 ＝ 100 升'], ['1 台升', '＝ 1.8 公升']] },
]

// 即時換算用的係數表（一律換算成該類的基準單位）。
// ⚠️ 頁面叫「度量衡**換算**」卻只有一張靜態對照表、連一個輸入框都沒有——
//    使用者想算「7.5 台斤是幾公斤」還是得自己心算，名字與功能對不上。
//    數值與上面的對照表同源，改一邊要改兩邊（刻意不合併：對照表是給人看的
//    整數關係，係數表是給程式算的）。
const CONVERT = [
  { g: '重量', base: '公克', units: [['台斤', 600], ['兩', 37.5], ['公斤', 1000], ['公克', 1], ['台錢', 3.75]] },
  { g: '長度', base: '公分', units: [['台尺', 30.3], ['台寸', 3.03], ['公尺', 100], ['公分', 1], ['公里', 100000]] },
  { g: '面積', base: '平方公尺', units: [['坪', 3.30579], ['甲', 9699.17], ['分地', 969.917], ['公頃', 10000], ['平方公尺', 1]] },
  { g: '容量', base: '公升', units: [['台升', 1.8039], ['斗', 18.039], ['石', 180.39], ['公升', 1], ['毫升', 0.001]] },
]

const GAN = '甲 乙 丙 丁 戊 己 庚 辛 壬 癸'
const ZHI = '子 丑 寅 卯 辰 巳 午 未 申 酉 戌 亥'
const SANHE = [['申子辰', '合水局'], ['亥卯未', '合木局'], ['寅午戌', '合火局'], ['巳酉丑', '合金局']]
const LIUHE = ['子丑合', '寅亥合', '卯戌合', '辰酉合', '巳申合', '午未合']
const CHONG = ['子午沖', '丑未沖', '寅申沖', '卯酉沖', '辰戌沖', '巳亥沖']
const HAI = ['子未害', '丑午害', '寅巳害', '卯辰害', '申亥害', '酉戌害']
const XING = ['子卯（無禮之刑）', '寅巳申（無恩之刑）', '丑戌未（恃勢之刑）', '辰午酉亥（自刑）']
const ZOD_SANHE = [['鼠·龍·猴', '三合'], ['牛·蛇·雞', '三合'], ['虎·馬·狗', '三合'], ['兔·羊·豬', '三合']]
const ZOD_LIUHE = ['鼠牛', '虎豬', '兔狗', '龍雞', '蛇猴', '馬羊']

const P = ({ children }) => <p className="article" style={{ padding: '4px 16px' }}>{children}</p>

export function FoodTaboo() {
  return (
    <>
      <TopBar title="食物相剋" onBack />
      <div className="body">
        <SectionHead title="常見相剋組合" />
        {FOODS.map(f => (
          <div key={f.a + f.b} className="kv" style={{ padding: '12px 16px', alignItems: 'flex-start' }}>
            <span style={{ flex: '0 0 auto', fontWeight: 700 }}>{f.a} × {f.b}</span>
            <span className="muted" style={{ textAlign: 'right', fontSize: 'var(--text-xs)' }}>{f.why}</span>
          </div>
        ))}
        <Disclaimer text="食物相剋多為民間傳統說法，現代營養學多認為在日常份量下影響有限或屬迷思。腸胃敏感、過敏或特殊疾病者，飲食請諮詢醫師或營養師。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

// 有效數字：台制換算幾乎都是無理小數，全部印出來反而看不懂。
// 取 6 位有效數字後把尾巴的 0 去掉（7.5 台斤 → 4.5 公斤，不是 4.50000）。
const fmtNum = (n) => {
  if (!Number.isFinite(n)) return ''
  if (n === 0) return '0'
  const abs = Math.abs(n)
  const s = (abs >= 1e7 || abs < 1e-4) ? n.toExponential(4) : String(Number(n.toPrecision(6)))
  return s
}

export function Units() {
  const [gi, setGi] = useState(0)
  const [val, setVal] = useState('1')
  const grp = CONVERT[gi]
  const [from, setFrom] = useState(grp.units[0][0])
  // 換類別時把來源單位重設成該類第一個（否則會留著上一類的單位名稱）
  const pickGroup = (i) => { setGi(i); setFrom(CONVERT[i].units[0][0]) }
  const fromFactor = grp.units.find(([u]) => u === from)?.[1] ?? 1
  const num = Number(String(val).replace(/[,\s]/g, ''))
  const valid = val.trim() !== '' && Number.isFinite(num)

  return (
    <>
      <TopBar title="度量衡換算｜台斤、台尺、坪、甲即時換算" onBack />
      <div className="body">
        <SectionHead title="即時換算" />
        <div className="card uc">
          <div className="uc-tabs">
            {CONVERT.map((c, i) => (
              <button key={c.g} className={`chip tap ${i === gi ? 'on' : ''}`} onClick={() => pickGroup(i)}>{c.g}</button>
            ))}
          </div>
          <div className="uc-in">
            <input className="uc-num" type="text" inputMode="decimal" value={val}
              onChange={e => setVal(e.target.value)} aria-label="要換算的數值" placeholder="輸入數值" />
            <select className="uc-unit" value={from} onChange={e => setFrom(e.target.value)} aria-label="來源單位">
              {grp.units.map(([u]) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {!valid ? (
            <p className="muted uc-hint">輸入一個數字就會即時換算成同類的其他單位。</p>
          ) : (
            <div className="uc-out">
              {grp.units.filter(([u]) => u !== from).map(([u, f]) => (
                <div key={u} className="kv"><span>{u}</span><b>{fmtNum(num * fromFactor / f)}</b></div>
              ))}
            </div>
          )}
        </div>

        <SectionHead title="對照表" />
        {UNITS.map(u => (
          <div key={u.g}>
            <SectionHead title={u.g} />
            {u.rows.map(([a, b]) => (
              <div key={a} className="kv" style={{ padding: '11px 16px' }}><b>{a}</b><span className="muted">{b}</span></div>
            ))}
          </div>
        ))}
        <P>＊台制（台斤、台尺、坪、甲）為台灣民間慣用單位；1 坪源自日制，1 甲源自荷制。</P>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}

export function GanzhiTable() {
  return (
    <>
      <TopBar title="六十甲子與三合六合對照表｜天干地支查詢" onBack />
      <div className="body">
        <SectionHead title="天干・地支" />
        <div className="card">
          <div className="kv"><span>十天干</span><b style={{ letterSpacing: 2 }}>{GAN}</b></div>
          <div className="kv" style={{ borderBottom: 'none' }}><span>十二地支</span><b style={{ letterSpacing: 1 }}>{ZHI}</b></div>
        </div>

        {/* ⚠️ 這頁的 <title> 一直寫著「六十甲子與三合六合對照表」，
            但頁面上根本沒有六十甲子表——標題與內容不符。補上，
            順便附納音（正好驗證納音表修好了）。 */}
        <SectionHead title="六十甲子" extra="含納音" />
        <div className="card">
          <div className="gz-grid">
            {Array.from({ length: 60 }, (_, n) => (
              <div key={n} className="gz-cell">
                <b>{GAN[n % 10]}{ZHI[n % 12]}</b>
                <small>{nayinOf(n % 10, n % 12)}</small>
              </div>
            ))}
          </div>
          <p className="muted td-note">
            ＊天干十個、地支十二個依序配對，因十與十二的最小公倍數為六十，
            故共六十種組合。納音兩兩一組（甲子與乙丑同為海中金）。
          </p>
        </div>

        <SectionHead title="地支三合・六合" />
        <div className="card">
          {SANHE.map(([s, k]) => <div key={s} className="kv"><span>三合</span><b>{s} {k}</b></div>)}
          <div className="kv" style={{ borderBottom: 'none', alignItems: 'flex-start' }}><span>六合</span><b style={{ textAlign: 'right' }}>{LIUHE.join('、')}</b></div>
        </div>

        <SectionHead title="地支相沖・相刑・相害" />
        <div className="card">
          <div className="kv" style={{ alignItems: 'flex-start' }}><span>相沖</span><b style={{ textAlign: 'right' }}>{CHONG.join('、')}</b></div>
          <div className="kv" style={{ alignItems: 'flex-start' }}><span>相害</span><b style={{ textAlign: 'right' }}>{HAI.join('、')}</b></div>
          <div className="kv" style={{ borderBottom: 'none', alignItems: 'flex-start' }}><span>相刑</span><b style={{ textAlign: 'right', fontSize: 'var(--text-xs)' }}>{XING.join('　')}</b></div>
        </div>

        <SectionHead title="生肖合沖（實用配對）" />
        <div className="card">
          {ZOD_SANHE.map(([s, k]) => <div key={s} className="kv"><span>三合</span><b>{s}</b></div>)}
          <div className="kv" style={{ borderBottom: 'none', alignItems: 'flex-start' }}><span>六合</span><b style={{ textAlign: 'right' }}>{ZOD_LIUHE.join('、')}</b></div>
        </div>
        <P>＊三合、六合的生肖相處較合；相沖、相刑、相害則需多包容。用於合婚、擇日之初篩，非絕對吉凶。</P>
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
