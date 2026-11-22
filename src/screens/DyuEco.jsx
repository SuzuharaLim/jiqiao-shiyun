// 大葉大學生態區 —— 校園植物名錄，逐種連回大葉大學校園植物圖鑑原站。
// 資料與內容紀律見 src/data/dyuPlants.js（只收名稱，不搬原站介紹文字與照片）。
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { TopBar, SectionHead } from '../components/ui.jsx'
import { glyphOf } from '../lib/text.js'
import { DYU_GROUPS, DYU_FEATURED, DYU_TOTAL, DYU_INDEX } from '../data/dyuPlants.js'

const ext = { target: '_blank', rel: 'noopener noreferrer' }

export default function DyuEco() {
  const [key, setKey] = useState('tree')
  const group = DYU_GROUPS.find(g => g.key === key) || DYU_GROUPS[0]
  return (
    <>
      <TopBar title="大葉大學生態區" onBack />
      <div className="body">
        <div className="card dyu-intro">
          <p>
            大葉大學校園裡常見的喬木、灌木與草花，共 {DYU_TOTAL} 種。點任一種植物，
            會在新分頁開啟大葉大學校園植物圖鑑的原頁，看學名、科屬、原產地、用途與形態特徵。
          </p>
          <a className="btn-ghost tap dyu-src" href={DYU_INDEX} {...ext}>
            開啟原站名錄 <Icon name="chev" style={{ width: 16 }} />
          </a>
        </div>

        <SectionHead title="先認識這三種" />
        {DYU_FEATURED.map(f => (
          <a key={f.name} className="list-item tap dyu-item" href={f.url} {...ext}
            aria-label={`${f.name}（在新分頁開啟原站介紹）`}>
            <div className="big glyph">{glyphOf(f.name)}</div>
            <div className="txt">
              <b>{f.name}<i className="dyu-sci">{f.sci}</i></b>
              <span>{f.group} · {f.family}　{f.note}</span>
            </div>
          </a>
        ))}

        <SectionHead title="校園植物名錄" extra={`${group.items.length} 種`} />
        <div className="chips dyu-chips" role="group" aria-label="植物分類">
          {DYU_GROUPS.map(g => (
            <button key={g.key} className={`chip tap ${g.key === key ? 'on' : ''}`}
              aria-pressed={g.key === key} onClick={() => setKey(g.key)}>
              {g.label} {g.items.length}
            </button>
          ))}
        </div>
        <ul className="dyu-grid">
          {group.items.map(p => (
            <li key={p.name}>
              <a className="dyu-plant tap" href={p.url} {...ext}
                aria-label={`${p.name}（在新分頁開啟原站介紹）`}>
                <span>{p.name}</span>
                <Icon name="chev" style={{ width: 14, stroke: 'var(--muted)' }} />
              </a>
            </li>
          ))}
        </ul>

        <p className="muted dyu-note">
          植物名稱與分類依大葉大學校園植物圖鑑（plants.dyu.edu.tw）；介紹內容與照片屬原站所有，請至原站閱讀。
        </p>
      </div>
    </>
  )
}
