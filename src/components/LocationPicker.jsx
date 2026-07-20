import { useState, useEffect } from 'react'
import { api } from '../api.js'

// 地點選擇器 —— 搜尋（OSM，經後端代理）＋ 目前位置（Geolocation）＋ 地圖預覽（代理圖磚）＋ 常用位置。
const Z = 15
const lon2x = (lon, z) => Math.floor((lon + 180) / 360 * 2 ** z)
const lat2y = (lat, z) => { const r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z) }

function MapPreview({ lat, lon }) {
  const la = parseFloat(lat), lo = parseFloat(lon)
  if (!isFinite(la) || !isFinite(lo)) return null
  const cx = lon2x(lo, Z), cy = lat2y(la, Z)
  const tiles = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tiles.push({ x: cx + dx, y: cy + dy })
  return (
    <div className="lp-map">
      <div className="lp-tiles">
        {tiles.map(t => <img key={`${t.x}-${t.y}`} src={`/api/map/tile/${Z}/${t.x}/${t.y}`} alt="" width={92} height={92} loading="lazy" />)}
      </div>
      <div className="lp-pin" aria-hidden="true">📍</div>
    </div>
  )
}

export default function LocationPicker({ onClose, onPick }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [favs, setFavs] = useState([])
  const [sel, setSel] = useState(null)      // {name, lat, lon}
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => { api.myPlaces().then(r => setFavs(r.places)).catch(() => {}) }, [])
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try { const r = await api.placesSearch(q.trim()); setResults(r.places) } catch { setResults([]) } finally { setLoading(false) }
    }, 500)
    return () => clearTimeout(t)
  }, [q])

  const useCurrent = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lon } = pos.coords
      let name = '目前位置'
      try { const r = await api.placesReverse(lat, lon); if (r.short || r.name) name = r.short || r.name } catch { /* ignore */ }
      setSel({ name, lat: String(lat), lon: String(lon) }); setLocating(false)
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 8000 })
  }

  const confirm = async (fav = false) => {
    if (!sel) return
    try { await api.savePlace({ name: sel.name, lat: sel.lat, lon: sel.lon, fav }) } catch { /* 離線仍可用 */ }
    onPick(sel); onClose()
  }
  const toggleFav = async (p) => {
    try { await api.savePlace({ name: p.name, lat: p.lat, lon: p.lon, fav: !p.fav }); const r = await api.myPlaces(); setFavs(r.places) } catch { /* ignore */ }
  }
  const removeFav = async (p) => {
    try { await api.deletePlace(p.id); setFavs(fs => fs.filter(x => x.id !== p.id)) } catch { /* ignore */ }
  }

  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="sheet lp" onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="lp-hd">新增地點<button className="lp-close tap" onClick={onClose} aria-label="關閉">✕</button></div>

        <div className="lp-search">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋地點（如：台北101、鹿港）" aria-label="搜尋地點" autoFocus />
          <button className="lp-cur tap" onClick={useCurrent} disabled={locating}>{locating ? '定位中…' : '📍 目前位置'}</button>
        </div>

        <div className="lp-scroll">
          {sel && (
            <div className="lp-selected">
              <MapPreview lat={sel.lat} lon={sel.lon} />
              <div className="lp-selname">{sel.name}</div>
              <div className="lp-selacts">
                <button className="b dark tap" onClick={() => confirm(false)}>用這個地點</button>
                <button className="b tap" onClick={() => confirm(true)}>★ 存為常用</button>
              </div>
            </div>
          )}

          {loading && <div className="muted center" style={{ padding: 12, fontSize: 12 }}>搜尋中…</div>}
          {results.length > 0 && (
            <div className="lp-list">
              {results.map((p, i) => (
                <button key={i} className="lp-item tap" onClick={() => setSel({ name: p.short || p.name, lat: p.lat, lon: p.lon })}>
                  <span className="lp-ic">📍</span>
                  <span className="lp-txt"><b>{p.short || p.name.split(',')[0]}</b><small>{p.name}</small></span>
                </button>
              ))}
            </div>
          )}

          {favs.length > 0 && (
            <>
              <div className="lp-sec">常用・最近</div>
              <div className="lp-list">
                {favs.map(p => (
                  <div key={p.id} className="lp-item">
                    <button className="lp-pick tap" onClick={() => { onPick({ name: p.name, lat: p.lat, lon: p.lon }); api.savePlace({ name: p.name, lat: p.lat, lon: p.lon, fav: p.fav }).catch(() => {}); onClose() }}>
                      <span className="lp-ic">{p.fav ? '⭐' : '🕘'}</span>
                      <span className="lp-txt"><b>{p.name}</b></span>
                    </button>
                    <button className="lp-star tap" aria-label={p.fav ? '取消常用' : '設為常用'} onClick={() => toggleFav(p)}>{p.fav ? '★' : '☆'}</button>
                    <button className="lp-del tap" aria-label="刪除" onClick={() => removeFav(p)}>✕</button>
                  </div>
                ))}
              </div>
            </>
          )}

          <button className="lp-hide tap" onClick={() => { onPick({ name: '', lat: null, lon: null }); onClose() }}>不顯示地點</button>
        </div>
      </div>
    </div>
  )
}
