// ============================================================================
// 賽璐璐材質 + 描邊
//
// 從 A-Frame 的 registerShader('toon') / registerComponent('outline') 剝離。
// 這兩層是整個角色的視覺識別，量產角色時**參數必須鎖在這裡**（策畫書 R12）：
// preset 只允許改色票與比例，steps／shadowFloor／rimAmount／描邊厚度不開放，
// 否則 24 隻角色會各自漂移成不同畫風。
// ============================================================================
import {
  MeshToonMaterial, ShaderMaterial, DataTexture, Color,
  RGBAFormat, NearestFilter, NoColorSpace, BackSide, Mesh,
} from 'three'
// ⚠️ 單向相依：geometry.js **不** import 本檔（那行 material.js 只出現在註解裡），
//    所以這個 import 不會造成循環。
import { PAL } from './geometry.js'

// ⚠️ gradientMap 是**查表資料不是顏色**：three 官方文件明訂必須 NearestFilter。
//    用 LinearFilter 會把階梯內插掉，等於完全沒有賽璐璐效果（畫面會變成普通的
//    平滑著色，而且不會有任何錯誤訊息，只是「怎麼看起來不像卡通」）。
//
// ⚠️ 以 steps|shadowFloor 為 key 共用。原本每個材質各建一張 DataTexture，
//    單隻白菜就有 20+ 張內容完全相同的 1×n 紋理（策畫書 §6.2 #10）。
const RAMP_CACHE = new Map()

export function makeToonRamp(steps, lo) {
  const n = Math.max(2, Math.min(8, steps | 0))
  const key = `${n}|${lo}`
  const hit = RAMP_CACHE.get(key)
  if (hit) return hit
  const d = new Uint8Array(n * 4)
  for (let i = 0; i < n; i++) {
    const v = lo + (1 - lo) * Math.pow(i / (n - 1), 0.72)
    const b = Math.round(Math.max(0, Math.min(1, v)) * 255)
    d[i * 4] = b; d[i * 4 + 1] = b; d[i * 4 + 2] = b; d[i * 4 + 3] = 255
  }
  const t = new DataTexture(d, n, 1, RGBAFormat)
  t.minFilter = t.magFilter = NearestFilter
  t.colorSpace = NoColorSpace; t.generateMipmaps = false; t.needsUpdate = true
  RAMP_CACHE.set(key, t)
  return t
}

/** 只在整個 app 收掉 3D 時呼叫——ramp 是跨角色共用的。 */
export function disposeRampCache() {
  for (const t of RAMP_CACHE.values()) t.dispose()
  RAMP_CACHE.clear()
}
export const rampCacheSize = () => RAMP_CACHE.size

/**
 * ★★★ 每一個值都對齊 demo `_6` 的 `toon-mat` 元件預設
 * （2026-08-11 從跑起來的 demo 讀 material 實測，不是抄原始碼）：
 *   steps 5、lo 0.58、rimColor #FFFFE8、rimPow 2.8、rimAmt 逐節點指定。
 *
 * ⚠️ 移植時漂成 `steps: 3, shadowFloor: 0.46`——**這是整個角色最大的單一視覺差異**。
 *    5 階柔梯變 3 階、暗面從 58% 掉到 46%（暗 21%）且中間少了兩階緩衝
 *    ⇒ 受光面到陰影面只剩一次跳躍，葉片交界處出現粗而硬的深色帶，
 *    讀起來像「髒掉的白菜」而不是「賽璐璐白菜」。
 *    實測 ramp：demo 148/187/213/235/255；漂移後 117/201/255。
 *
 * ⚠️ **emissive 要留 0**：demo 完全沒有自發光（實測 emissive #000000）。
 *    移植加了 `emissiveIntensity 0.05` 且 emissive 預設抓 color ⇒ 每顆 mesh 多一層
 *    不受頂點色、不受光照的均勻白霧，把葉片頂點色特意畫出來的「鄰葉壓在本片上
 *    的陰影溝」與假 AO 填掉一階，層層堆疊的立體感因此變平。
 * ⚠️ `rimColor` 要用 `PAL.rim`：先前寫死 '#FFF4E6'（偏粉暖白），而 PAL.rim
 *    ('#FFFFE8') 因此變成**死碼**——改色票不會有任何效果，也不會報錯。
 */
export const TOON_DEFAULTS = {
  steps: 5, shadowFloor: 0.58,
  rimColor: '#FFFFE8', rimPower: 2.8, rimAmount: 0.14,
  emissiveIntensity: 0,
}

/**
 * 臉部貼片專用：demo 特地把它的 `lo` 從全域的 0.58 **反向調高**到 0.66，
 * 階數也降到 3。理由是臉是包在葉子曲面上的弧形貼片，左右兩側的法線已經背向
 * 主光——不把暗部拉亮，五官（眼 #3A2A18、嘴）在暗半邊會糊成一片。
 * ⚠️ 這是**唯一**允許偏離全域 toon 參數的地方，不要順手拿去用在別的部位。
 */
export const FACE_TOON = { steps: 3, shadowFloor: 0.66, rimAmount: 0 }

/**
 * 賽璐璐材質。邊緣光（rim）用 onBeforeCompile 注入，不自己寫整套 shader——
 * MeshToonMaterial 已經處理好陰影、霧、色彩管理，重寫一份只會少掉那些。
 */
export function makeToonMaterial(opts = {}) {
  const d = { ...TOON_DEFAULTS, ...opts }
  const m = new MeshToonMaterial({
    color: new Color(d.color ?? '#FFFFFF'),
    vertexColors: !!d.vertexColors,
    fog: d.fog !== false,
  })
  // ⚠️ 只有明確指定 emissive 時才點自發光。預設 0 ＝ 與 demo 一致（無自發光）。
  if (d.emissive) m.emissive.set(d.emissive)
  m.emissiveIntensity = d.emissiveIntensity ?? 0
  m.gradientMap = makeToonRamp(d.steps, d.shadowFloor)

  const U = {
    uRimCol: { value: new Color(d.rimColor) },
    uRimPow: { value: d.rimPower },
    uRimAmt: { value: d.rimAmount },
  }
  m.userData.toonUniforms = U
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U)
    // geometryNormal / geometryViewDir 由 <lights_fragment_begin> 宣告，此處仍在 scope 內
    shader.fragmentShader =
      'uniform vec3 uRimCol; uniform float uRimPow; uniform float uRimAmt;\n'
      + shader.fragmentShader.replace('#include <opaque_fragment>',
        'float fres = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), uRimPow );\n'
        + 'outgoingLight += uRimCol * fres * uRimAmt;\n'
        + '#include <opaque_fragment>')
  }
  // 所有 toon 材質共用同一支編譯後的 program
  m.customProgramCacheKey = () => 'chengqi-toon-v1'
  return m
}

// ⚠️ 描邊用 inverted hull，不用 OutlineEffect / OutlinePass：
//    前者會接管 renderer.render() 與宿主打架，後者要走 EffectComposer。
//    自己加一顆 BackSide mesh 完全不碰 render loop，共用同一份 geometry
//    只多一個 draw call。前提是法線平滑且頂點已焊接（見 geometry.js）。
const OUTLINE_VS = `
uniform float thickness;
void main() {
  vec3 n = normalize( normalMatrix * normal );
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  mv.xyz += n * thickness * max( -mv.z, 0.001 );
  gl_Position = projectionMatrix * mv;
}`
const OUTLINE_FS = `
uniform vec3 color;
void main() { gl_FragColor = vec4( color, 1.0 ); }`

/**
 * 幫一顆 mesh 加描邊，回傳那顆 BackSide mesh（已 add 成 mesh 的子節點）。
 *
 * ⚠️ 原本 A-Frame 版是 `tick(){ this.apply() }`——每幀對每顆 mesh 做一次
 *    getObject3D + 比對，63 顆 × 60fps = 每秒 3,780 次無謂查詢（策畫書 §6.2 #9）。
 *    幾何在建好之後就不會換了，所以這裡改成建立時做一次即可。
 */
// ⚠️ 預設色必須是色票裡的值。先前是 '#54683B'——那個綠**不存在於任何一份
//    demo 的 PAL，也不存在於本專案的 PAL**。目前三個呼叫點都有明確傳色所以
//    看不到，但日後任何一處漏傳就會冒出第三種深綠，而且不會有錯誤訊息。
export function addOutline(mesh, { thickness = 0.0032, color = PAL.oLeaf } = {}) {
  const mat = new ShaderMaterial({
    uniforms: { thickness: { value: thickness }, color: { value: new Color(color) } },
    vertexShader: OUTLINE_VS, fragmentShader: OUTLINE_FS, side: BackSide,
  })
  const o = new Mesh(mesh.geometry, mat)
  o.castShadow = false; o.receiveShadow = false
  o.name = 'outline'
  mesh.add(o)
  return o
}
