import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, Disclaimer, SectionHead, Meter } from '../components/ui.jsx'
import { useContent } from '../hooks/useApi.js'
import { combinedMatch, STARS } from '../data/match.js'

// 生肖・星座婚配。
// ⚠️ 使用者回報「缺少星座匹配的選項」——標題寫生肖・星座，畫面卻只有生肖。已補上。
// 分數改為依傳統地支關係（三合/六合/六沖/六害/相刑）與星座元素關係推算，
// 每項附理由；原本是拿「兩人今日運勢分數相減」，換一天就變，且無傳統依據。
export default function Matchmaking() {
  const zodiacs = useContent('zodiacs')   // 生肖清單嚴格來自資料庫
  const [za, setZa] = useState(null)
  const [zb, setZb] = useState(null)
  const [sa, setSa] = useState(null)
  const [sb, setSb] = useState(null)

  const res = combinedMatch({ zodiacA: za?.sign, zodiacB: zb?.sign, starA: sa, starB: sb })

  const ZodiacPicker = ({ label, val, set }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="center muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 5 }}>
        {zodiacs.map(z => (
          <button key={z.sign} className="tap" aria-pressed={val?.sign === z.sign} aria-label={`屬${z.sign}`}
            style={{
              border: `1.5px solid ${val?.sign === z.sign ? 'var(--cinnabar)' : 'var(--line2)'}`, borderRadius: 2,
              padding: '6px 0', background: val?.sign === z.sign ? 'var(--acard-bg)' : 'var(--bg)',
            }} onClick={() => set(z)}><div className="glyph" style={{ fontSize: 'var(--text-lg)' }}>{z.sign}</div></button>
        ))}
      </div>
    </div>
  )

  const StarPicker = ({ label, val, set }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="center muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 5 }}>
        {STARS.map(s => (
          <button key={s.name} className="tap" aria-pressed={val === s.name} title={s.range}
            style={{
              border: `1.5px solid ${val === s.name ? 'var(--cinnabar)' : 'var(--line2)'}`, borderRadius: 2,
              padding: '7px 0', fontSize: 'var(--text-2xs)', fontWeight: 700,
              background: val === s.name ? 'var(--acard-bg)' : 'var(--bg)',
            }} onClick={() => set(s.name)}>{s.name}</button>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <TopBar title="生肖・星座 婚配" onBack />
      <div className="body">
        <SectionHead title="生肖" extra="必選" />
        <div className="pad" style={{ display: 'flex', gap: 12 }}>
          <ZodiacPicker label="你" val={za} set={setZa} />
          <ZodiacPicker label="對方" val={zb} set={setZb} />
        </div>

        <SectionHead title="星座" extra="可選，選了一起計分" />
        <div className="pad" style={{ display: 'flex', gap: 12 }}>
          <StarPicker label="你" val={sa} set={setSa} />
          <StarPicker label="對方" val={sb} set={setSb} />
        </div>

        {res ? (
          <div className="card">
            <h4>配對指數 {res.score} 分</h4>
            <Meter score={res.score} />
            {res.zodiac && (
              <>
                <div className="kv" style={{ padding: '10px 0 4px' }}>
                  <span>生肖　{za.sign} × {zb.sign}</span><b>{res.zodiac.level}　{res.zodiac.score} 分</b>
                </div>
                <p style={{ lineHeight: 1.9 }}>{res.zodiac.reason}</p>
              </>
            )}
            {res.star && (
              <>
                <div className="kv" style={{ padding: '10px 0 4px', borderTop: '1px solid var(--line2)' }}>
                  <span>星座　{sa} × {sb}</span><b>{res.star.level}　{res.star.score} 分</b>
                </div>
                <p style={{ lineHeight: 1.9 }}>{res.star.reason}</p>
              </>
            )}
            {!res.star && (
              <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 8 }}>
                再選兩邊的星座，會把星座元素關係一起算進來。
              </p>
            )}
          </div>
        ) : (
          <div className="empty"><div className="empty-ic"><Icon name="heartPair" /></div>
            兩邊各選一個生肖（星座可選），看配對分數
          </div>
        )}
        <Disclaimer text="配對依傳統地支三合六合與星座元素關係推算，屬民俗參考，僅供娛樂；感情仍需真心經營。" />
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
