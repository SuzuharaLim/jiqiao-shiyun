// 桌曆頁面 → canvas 的單一入口（設計器、3D、分享頁、後台共用）
import { drawPage, loadImage, imageUrlOf } from './calRender.js'
import { dayFor, offsetFromDate } from '../data/almanac.js'

// 宜忌是選配，而且 dayFor 每天要算一整套神煞——只算「正在畫的這一頁」的日子。
function yijiFor(page) {
  const days = (page.weeks || page.months?.flatMap(m => m.weeks) || []).flat().filter(Boolean)
  const out = {}
  for (const d of days) {
    try {
      const a = dayFor(offsetFromDate(new Date(d.y, d.m - 1, d.d)))
      const yi = (a.yi || []).find(t => !t.startsWith('大事勿用'))
      out[`${d.y}-${d.m}-${d.d}`] = yi ? `宜${yi}` : '諸事不宜'
    } catch { /* 單日算不出來就略過，不讓整頁失敗 */ }
  }
  return out
}

/** 畫第 i 頁，回傳 canvas。width 決定解析度（預覽刻意低，見 calRender.js 檔頭）。 */
export async function renderPageCanvas(design, pages, i, width = 960) {
  const page = pages[i]
  if (!page) return null
  const over = design.pages?.[i] || {}
  const image = await loadImage(imageUrlOf(over.img))
  const canvas = document.createElement('canvas')
  canvas.width = width
  drawPage(canvas, {
    page, over, design, image,
    opts: { watermark: true, yiji: design.style?.marks?.yiji ? yijiFor(page) : null },
  })
  return canvas
}
