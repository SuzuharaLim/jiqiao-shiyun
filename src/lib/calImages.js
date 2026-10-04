// ============================================================================
// 桌曆設計器的照片處理（瀏覽器端）
//
// 使用者選一張照片時，在手機上就轉成兩份：
//   · 預覽版（長邊 1400px）→ 上傳到伺服器，設計與 3D 預覽用
//   · 印刷版（長邊 3200px、JPEG 0.9）→ **只存在這個瀏覽器的 IndexedDB**，
//     送出洽詢時才上傳。大部分人不會送出，這些原圖就永遠不佔我們的空間。
//
// ★ 經過 canvas 重新編碼會丟掉 EXIF——包括 GPS 位置。存原圖等於存了使用者家的位置，
//   這一步順手把它清掉。`imageOrientation: 'from-image'` 先套用 EXIF 的旋轉，
//   否則手機直拍的照片丟掉 EXIF 之後會躺下來。
//
// ⚠️ IndexedDB 存不到的情況（無痕模式、空間不足）不可讓整個流程失敗：
//   只是那一頁送出時沒有原圖，後台會標「只有預覽解析度」。
// ============================================================================
import { CAL_LIMITS } from '../data/calendarRules.js'

const DB_NAME = 'jq-cal-print', STORE = 'blobs'
function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no idb'))
    const r = indexedDB.open(DB_NAME, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
async function idb(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => { db.close(); resolve(req?.result) }
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error) }
  })
}
export const putPrintBlob = (imageId, blob) => idb('readwrite', s => s.put(blob, imageId)).catch(() => false)
export const getPrintBlob = (imageId) => idb('readonly', s => s.get(imageId)).catch(() => null)
export const delPrintBlob = (imageId) => idb('readwrite', s => s.delete(imageId)).catch(() => false)

async function decode(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { /* 舊瀏覽器不吃選項 */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const im = new Image()
    im.src = url
    await im.decode()
    return im
  } finally { setTimeout(() => URL.revokeObjectURL(url), 0) }
}
function encode(src, longEdge, quality) {
  const s = Math.min(1, longEdge / Math.max(src.width, src.height))
  const c = document.createElement('canvas')
  c.width = Math.round(src.width * s); c.height = Math.round(src.height * s)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)      // PNG 透明處印出來是白的
  ctx.drawImage(src, 0, 0, c.width, c.height)
  return c
}
const toBlob = (c, q) => new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', q))

/**
 * 處理使用者選的照片。
 * @returns {{ preview: string(dataURL), print: Blob, w: number, h: number }}
 *          w/h 是**原圖**的尺寸（判斷印出來會不會糊用的）
 */
export async function processPick(file) {
  if (!/^image\//.test(file.type)) throw new Error('請選擇圖片檔')
  if (file.size > CAL_LIMITS.SOURCE_MAX_BYTES) throw new Error(`照片超過 ${CAL_LIMITS.SOURCE_MAX_BYTES / 1048576} MB，請換一張`)
  const bmp = await decode(file)
  const w = bmp.width, h = bmp.height
  const preview = encode(bmp, CAL_LIMITS.PREVIEW_LONG_EDGE, 0.82).toDataURL('image/jpeg', 0.82)
  const print = await toBlob(encode(bmp, CAL_LIMITS.PRINT_LONG_EDGE, 0.9), 0.9)
  bmp.close?.()
  return { preview, print, w, h }
}

export const blobToDataURL = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = () => reject(r.error)
  r.readAsDataURL(blob)
})
