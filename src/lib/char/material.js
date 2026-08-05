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

export const TOON_DEFAULTS = {
  steps: 3, shadowFloor: 0.46,
  rimColor: '#FFF4E6', rimPower: 3.2, rimAmount: 0.14,
  emissiveIntensity: 0.05,
}

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
  m.emissive.set(d.emissive ?? d.color ?? '#FFFFFF')
  m.emissiveIntensity = d.emissiveIntensity
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
export function addOutline(mesh, { thickness = 0.0032, color = '#54683B' } = {}) {
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
