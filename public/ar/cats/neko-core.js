/* =============================================================================
 * neko-core.js — shared engine for the 2027 二十四節氣貓 3D models
 * Three.js r128 + OrbitControls, everything procedural (no model / image files).
 *
 * Coordinates: +y up, feet at y = 0, +z = the cat's front (toward the viewer),
 * +x = IMAGE-RIGHT (the viewer's right = the cat's own left).
 * Arms are named by IMAGE side: arms.L is on the image-left (x < 0).
 *
 * A character file calls NEKO.run(def). See src/API.md for the full reference.
 * ========================================================================== */
(function () {
  'use strict';
  const NEKO = window.NEKO = {};

  function isPlain(v) { return v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype; }
  // deep merge for plain objects; arrays, functions, false and null replace wholesale
  function merge(base, over) {
    if (over === undefined) return base;
    if (!isPlain(base) || !isPlain(over)) return over;
    const out = Object.assign({}, base);
    Object.keys(over).forEach(k => { out[k] = merge(base[k], over[k]); });
    return out;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) {
    if (hex.indexOf('rgb') === 0) return hex;
    const [r, g, b] = hexToRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  NEKO.merge = merge;
  NEKO.rgba = rgba;

  /* ---------------------------------------------------------------------------
   * Defaults reproduce 立春 (the orange Maine-coon official). Every field can be
   * overridden in def.cat; set a whole block to false to skip building it.
   * Face heights (eyes.y, nose.y, mouth.y, muzzle.y, blush.y, ears.y, brows.y,
   * whiskers.y) are RELATIVE to head.y. Everything else is absolute.
   * ------------------------------------------------------------------------- */
  const DEFAULTS = {
    fur: {
      color: '#F3A75E',          // flat coat colour: ears, feet, tail base, bare arms
      top: '#EF9A4F', mid: '#F5AC62', low: '#F6B570', // head map vertical gradient
      deep: '#D8793A',           // stripes, spots, tail rings
      cream: '#FFF7EC',          // muzzle, chest bib, paws, tail tip
      ink: '#B8703F',            // coloured outline for fur parts
      creamInk: '#C99D78',       // outline for cream parts
      pattern: 'tabby',          // 'tabby' | 'spots' | 'none'
      mask: { x: 512, y: 392, r: 250, sy: 0.5, color: null }, // pale lower face in head-map px; false = none
      stripe: { alpha: 0.5, blur: 5, color: null },
      spots: { n: 70, size: 11, alpha: 0.75, color: null, lat: [-35, 70], avoid: 34 },
      noise: { colors: ['#FFE9CC', '#E48A45'], alpha: 0.07, n: 900 },
      paintBase: null,           // function(g, P) replaces the whole default head painting
      paint: null                // function(g, P) extra head painting on top of the pattern
    },
    head: {
      y: 2.35, neck: 1.6,
      w: 1.04, h: 0.95, d: 0.9,  // radii multipliers of a unit sphere
      cheek: 0.13,               // lower-face bulge (Gaussian around y = -0.25)
      ruff: 0.045, ruffFreq: 15, // scalloped cheek ruff amplitude and frequency
      chinDrop: 0.05,
      deform: null,              // function(p, o) extra per-vertex deform; p = mutable {x,y,z}, o = unit-sphere point
      fur: { layers: 20, length: 0.11, gravity: 0.035, repeat: [9, 5] } // false = no shell fur
    },
    eyes: { x: 0.37, y: -0.05, r: 0.12, sx: 0.9, sy: 1.08, sz: 0.4, color: '#2A221F', iris: null, pupil: '#15100E', pupilR: 0.5, shine: 1, tilt: 0 },
    nose: { y: -0.16, color: '#F3A7A2', size: 1 },
    muzzle: { color: null, y: -0.28, size: 1 },
    mouth: { type: 'w', color: '#6B4A3A', y: -0.25, w: 0.14, open: 1, inner: '#B8474F', tongue: '#F29A9A' },
    blush: { color: 'rgba(242,140,140,0.7)', x: 0.62, y: -0.19, r: 30 },
    brows: null,               // { color, x, y, len, angle, r }
    whiskers: null,            // { color, n, len, r, y, x, spread, droop, curve }
    ears: {
      x: 0.8, y: 0.47, z: 0.02, tilt: 0.42, yaw: 0.22, pitch: -0.05,
      size: [0.36, 0.74, 0.18], sharp: 0.94,
      color: null, colorL: null, colorR: null, tip: null, tipStart: 0.62,
      inner: '#F3A7A2', tuft: null, lynx: null,
      fur: { layers: 10, length: 0.035, gravity: 0.008, repeat: [3, 3] }
    },
    bib: {
      color: null,
      balls: [[0, 1.52, 0.4, 0.27], [0.2, 1.45, 0.41, 0.2], [-0.2, 1.45, 0.41, 0.2], [0, 1.37, 0.5, 0.18]],
      fur: { layers: 14, length: 0.08, gravity: 0.03, repeat: [3, 2] }
    },
    robe: {
      profile: [[0.97, 0.18], [1.0, 0.27], [0.96, 0.48], [0.89, 0.78], [0.8, 1.02], [0.7, 1.26], [0.58, 1.45], [0.34, 1.6], [0.12, 1.66]],
      paint: null,               // function(g, w, h, D) — 1024², x = 512 front centre, bottom = hem
      color: '#FFFFFF', ink: '#9DAA7C', lining: '#E3DAC0', segs: 128, hemY: 0.42
    },
    collar: { color: '#A3BC7E', r: 0.036, over: 1, y0: 1.52, style: 'cross' }, // style 'cross' | 'round'
    furCollar: null,           // { color, y, r, tube, dip, ink, fur }
    cape: null,                // { color, paint, y0, y1, off, open, lining, trim, trimR, ink, segs }
    apron: null,               // { y0, y1, deg, degB, off, color, paint, trim, trimR, ink }
    arms: {
      L: { hand: [-0.11, 1.21, 1.0], path: null, elbowOut: 0.2, elbowDown: 0.1, drop: 1, width: 1, paw: true, pawScale: 1, shoulder: null },
      R: { hand: [0.11, 1.21, 1.0], path: null, elbowOut: 0.2, elbowDown: 0.1, drop: 1, width: 1, paw: true, pawScale: 1, shoulder: null }
    },
    sleeves: { style: 'wide', paint: null, color: '#FFFFFF', lining: '#E3DAC0', trim: '#A3BC7E', trimR: 0.034, ink: '#9DAA7C' },
    paws: { color: null, ink: null },
    belt: { yT: 0.95, yB: 0.81, color: '#6E8C4E', line: '#E4BA5C', knot: 'loops', knotColor: '#E4BA5C', ink: '#A87A26', tassel: { color: '#E4BA5C', len: 0.3 } },
    legs: null,                // { color, r, top, x, z, ink }
    feet: { color: null, toe: null, x: 0.28, y: 0.1, z: 0.82, type: 'paw', boot: null, ink: null },
    tail: {
      pts: [[0.35, 0.5, -0.62], [0.85, 0.42, -0.86], [1.3, 0.62, -0.74], [1.53, 1.05, -0.46], [1.43, 1.5, -0.26], [1.13, 1.72, -0.26]],
      r: 0.32, shape: null, color: null, deep: null, tip: null, tipStart: 0.82, bands: 5, bandAlpha: 0.7, paint: null, ink: null,
      fur: { layers: 16, length: 0.11, gravity: 0.03, repeat: [12, 8] }
    }
  };
  NEKO.DEFAULTS = DEFAULTS;

  NEKO.run = function (def) {
    try { run(def); }
    catch (e) {
      console.error(e);
      window.__NEKO_ERROR = String(e && e.stack || e);
      const s = document.getElementById('status');
      if (s) { s.hidden = false; s.textContent = '模型建立失敗：\n' + (e && e.message || e); }
    }
  };

  function run(def) {
    const Q = new URLSearchParams(location.search);
    const SHOT = Q.get('shot');
    const BG0 = !!SHOT && Q.get('bg') === '0';   // transparent background for thumbnails
    // ?embed=1 — chrome-less canvas for hosting pages (the 機巧時運 AR model page). The host drives
    // actions, the talking overlay and the visible band through window.postMessage (same origin only).
    const EMBED = !SHOT && Q.get('embed') === '1';
    const statusEl = document.getElementById('status');
    if (!window.THREE || !THREE.OrbitControls) throw new Error('3D 函式庫載入失敗，請重新整理頁面。');
    if (SHOT) document.documentElement.classList.add('shot');

    const rand = mulberry32(def.seed || 20270204);
    const reduced = !!SHOT || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cfg = merge(DEFAULTS, def.cat || {});
    const V = (x, y, z) => new THREE.Vector3(x || 0, y || 0, z || 0);
    const toV = a => a instanceof THREE.Vector3 ? a.clone() : V(a[0], a[1], a[2]);
    const C = h => new THREE.Color(h).convertSRGBToLinear();
    const UP = V(0, 1, 0);
    const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
    const lerp = (a, b, t) => a + (b - a) * t;

    const F = cfg.fur, HD = cfg.head;
    const FUR = F.color, CREAM = F.cream, DEEP = F.deep;
    const nz = (v, fb) => (v === null || v === undefined) ? fb : v;

    /* ======================= page text & theme ======================= */
    const meta = def.meta || {};
    const root = document.documentElement.style;
    const TH = def.theme || {};
    [['accent', '--accent'], ['accentInk', '--accent-ink'], ['glow', '--glow'], ['paper', '--paper'], ['accentDark', '--accent-dk'], ['glowDark', '--glow-dk']]
      .forEach(([k, v]) => { if (TH[k]) root.setProperty(v, TH[k]); });
    const $ = id => document.getElementById(id);
    $('seal').textContent = meta.seal || '貓';
    $('eyebrow').textContent = meta.eyebrow || '';
    $('title').textContent = meta.title || document.title;
    $('act').textContent = (def.action && def.action.label) || '行禮';
    statusEl.textContent = '正在搭建' + (meta.title || '節氣貓') + '…';

    /* =========================== textures =========================== */
    function canvasTex(w, h, draw, srgb = true) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); draw(g, w, h);
      const t = new THREE.CanvasTexture(c);
      if (srgb) t.encoding = THREE.sRGBEncoding;
      t.anisotropy = 4;
      return t;
    }
    function softStrokes(g, w, h, n, colors, len, alpha) {
      for (let i = 0; i < n; i++) {
        const x = rand() * w, y = rand() * h, l = len * (0.5 + rand());
        g.strokeStyle = colors[i % colors.length]; g.globalAlpha = alpha * (0.5 + rand() * 0.5);
        g.lineWidth = 2 + rand() * 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - 0.5) * l * 0.3, y + l); g.stroke();
      }
      g.globalAlpha = 1;
    }

    // ---- canvas motif kit (D): small flat icons for fabric, badges and tablets ----
    const D = {
      rgba, rand,
      fill(g, color) { g.fillStyle = color; g.fillRect(0, 0, g.canvas.width, g.canvas.height); },
      band(g, y0, y1, color) { g.fillStyle = color; g.fillRect(0, y0, g.canvas.width, y1 - y0); },
      vband(g, x0, x1, color, y0 = 0, y1 = null) { g.fillStyle = color; g.fillRect(x0, y0, x1 - x0, (y1 === null ? g.canvas.height : y1) - y0); },
      gradient(g, stops, vertical = true) {
        const w = g.canvas.width, h = g.canvas.height;
        const lg = vertical ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, 0);
        stops.forEach(([t, c]) => lg.addColorStop(t, c)); g.fillStyle = lg; g.fillRect(0, 0, w, h);
      },
      sprout(g, x, y, s, color) {
        g.save(); g.translate(x, y);
        g.strokeStyle = color; g.fillStyle = color; g.lineCap = 'round';
        g.lineWidth = Math.max(2, s * 0.09);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.06, -s * 0.35, 0, -s * 0.58); g.stroke();
        g.beginPath(); g.ellipse(-s * 0.27, -s * 0.72, s * 0.3, s * 0.14, 0.38, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(s * 0.27, -s * 0.72, s * 0.3, s * 0.14, -0.38, 0, Math.PI * 2); g.fill();
        g.restore();
      },
      leaf(g, x, y, s, angle, color, vein) {
        g.save(); g.translate(x, y); g.rotate(angle || 0); g.fillStyle = color;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.45, -s * 0.5, 0, -s); g.quadraticCurveTo(-s * 0.45, -s * 0.5, 0, 0); g.fill();
        if (vein) { g.strokeStyle = vein; g.lineWidth = Math.max(1, s * 0.05); g.beginPath(); g.moveTo(0, -s * 0.05); g.lineTo(0, -s * 0.85); g.stroke(); }
        g.restore();
      },
      flower(g, x, y, s, petal, center, n = 5, rot = 0) {
        g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = petal;
        for (let i = 0; i < n; i++) { g.save(); g.rotate(i / n * Math.PI * 2); g.beginPath(); g.ellipse(0, -s * 0.52, s * 0.3, s * 0.42, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
        g.fillStyle = center || '#F2C94C'; g.beginPath(); g.arc(0, 0, s * 0.2, 0, Math.PI * 2); g.fill();
        g.restore();
      },
      snowflake(g, x, y, s, color, lw) {
        g.save(); g.translate(x, y); g.strokeStyle = color; g.lineWidth = lw || Math.max(2, s * 0.08); g.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          g.save(); g.rotate(i * Math.PI / 3);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s);
          g.moveTo(0, -s * 0.55); g.lineTo(s * 0.22, -s * 0.75); g.moveTo(0, -s * 0.55); g.lineTo(-s * 0.22, -s * 0.75);
          g.stroke(); g.restore();
        }
        g.restore();
      },
      cloud(g, x, y, s, color, lw) { // 祥雲 curl
        g.save(); g.translate(x, y); g.strokeStyle = color; g.lineWidth = lw || Math.max(2, s * 0.09); g.lineCap = 'round';
        g.beginPath(); g.arc(0, 0, s * 0.35, Math.PI * 0.9, Math.PI * 2.6); g.stroke();
        g.beginPath(); g.arc(s * 0.55, s * 0.1, s * 0.25, Math.PI * 1.1, Math.PI * 2.5); g.stroke();
        g.beginPath(); g.arc(-s * 0.5, s * 0.12, s * 0.22, Math.PI * 0.5, Math.PI * 1.9); g.stroke();
        g.beginPath(); g.moveTo(-s * 0.9, s * 0.34); g.lineTo(s * 0.95, s * 0.34); g.stroke();
        g.restore();
      },
      wave(g, y, amp, period, color, lw, x0 = 0, x1 = null) {
        const w = x1 === null ? g.canvas.width : x1;
        g.save(); g.strokeStyle = color; g.lineWidth = lw || 4; g.lineCap = 'round'; g.beginPath();
        for (let x = x0; x <= w; x += 3) { const yy = y + Math.sin((x - x0) / period * Math.PI * 2) * amp; x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy); }
        g.stroke(); g.restore();
      },
      scallops(g, y, r, step, color, lw) { // rows of semicircle "hills" (山形 / 海浪)
        g.save(); g.strokeStyle = color; g.lineWidth = lw || 5; g.lineCap = 'round';
        for (let x = 0; x <= g.canvas.width + step; x += step) {
          g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.stroke();
          g.beginPath(); g.arc(x, y, r * 0.62, Math.PI, 0); g.stroke();
        }
        g.restore();
      },
      drop(g, x, y, s, color, hi) {
        g.save(); g.translate(x, y); g.fillStyle = color;
        g.beginPath(); g.moveTo(0, -s); g.bezierCurveTo(s * 0.15, -s * 0.55, s * 0.55, -s * 0.2, s * 0.55, s * 0.15);
        g.arc(0, s * 0.15, s * 0.55, 0, Math.PI); g.bezierCurveTo(-s * 0.55, -s * 0.2, -s * 0.15, -s * 0.55, 0, -s); g.fill();
        if (hi) { g.fillStyle = hi; g.beginPath(); g.ellipse(-s * 0.2, s * 0.05, s * 0.1, s * 0.18, 0.4, 0, Math.PI * 2); g.fill(); }
        g.restore();
      },
      flame(g, x, y, s, outer, inner) {
        g.save(); g.translate(x, y);
        const f = (k, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, -s * k); g.bezierCurveTo(s * 0.35 * k, -s * 0.55 * k, s * 0.55 * k, -s * 0.1 * k, s * 0.42 * k, s * 0.2 * k); g.arc(0, s * 0.2 * k, s * 0.42 * k, 0, Math.PI); g.bezierCurveTo(-s * 0.55 * k, -s * 0.1 * k, -s * 0.2 * k, -s * 0.4 * k, 0, -s * k); g.fill(); };
        f(1, outer || '#F08A3C'); f(0.55, inner || '#FFD36B'); g.restore();
      },
      grain(g, x, y, s, color, angle = 0) { // 稻穗 / 麥穗
        g.save(); g.translate(x, y); g.rotate(angle); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = Math.max(1.5, s * 0.05); g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.08, -s * 0.5, 0, -s); g.stroke();
        for (let i = 0; i < 6; i++) { const t = 0.35 + i * 0.11; [-1, 1].forEach(k => { g.beginPath(); g.ellipse(k * s * 0.09, -s * t, s * 0.06, s * 0.11, k * 0.5, 0, Math.PI * 2); g.fill(); }); }
        g.restore();
      },
      bolt(g, x, y, s, color) {
        g.save(); g.translate(x, y); g.fillStyle = color; g.beginPath();
        g.moveTo(s * 0.15, -s); g.lineTo(-s * 0.35, s * 0.1); g.lineTo(0, s * 0.1); g.lineTo(-s * 0.15, s); g.lineTo(s * 0.4, -s * 0.15); g.lineTo(s * 0.05, -s * 0.15); g.closePath(); g.fill();
        g.restore();
      },
      sun(g, x, y, s, color, core) {
        g.save(); g.translate(x, y); g.strokeStyle = color; g.fillStyle = core || color; g.lineWidth = Math.max(2, s * 0.08); g.lineCap = 'round';
        g.beginPath(); g.arc(0, 0, s * 0.45, 0, Math.PI * 2); g.fill();
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62); g.lineTo(Math.cos(a) * s * 0.9, Math.sin(a) * s * 0.9); g.stroke(); }
        g.restore();
      },
      moon(g, x, y, s, color, bg) {
        g.save(); g.translate(x, y); g.fillStyle = color; g.beginPath(); g.arc(0, 0, s * 0.5, 0, Math.PI * 2); g.fill();
        g.globalCompositeOperation = bg ? 'source-over' : 'destination-out'; g.fillStyle = bg || '#000';
        g.beginPath(); g.arc(s * 0.22, -s * 0.12, s * 0.42, 0, Math.PI * 2); g.fill(); g.restore();
      },
      pine(g, x, y, s, color) {
        g.save(); g.translate(x, y); g.strokeStyle = color; g.lineWidth = Math.max(1.5, s * 0.04); g.lineCap = 'round';
        g.beginPath(); g.moveTo(-s * 0.6, s * 0.3); g.lineTo(s * 0.6, -s * 0.2); g.stroke();
        for (let i = 0; i < 3; i++) {
          const cx = -s * 0.3 + i * s * 0.35, cy = s * 0.18 - i * s * 0.15;
          for (let k = 0; k < 11; k++) { const a = -Math.PI * 0.95 + k / 10 * Math.PI * 0.9; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * s * 0.28, cy + Math.sin(a) * s * 0.28); g.stroke(); }
        }
        g.restore();
      },
      frame(g, inset, color, lw, r) { // rounded rectangle frame line
        const w = g.canvas.width, h = g.canvas.height, x = inset, y = inset, W = w - inset * 2, H = h - inset * 2; r = r || 0;
        g.save(); g.strokeStyle = color; g.lineWidth = lw || 4; g.beginPath();
        g.moveTo(x + r, y); g.lineTo(x + W - r, y); g.quadraticCurveTo(x + W, y, x + W, y + r); g.lineTo(x + W, y + H - r); g.quadraticCurveTo(x + W, y + H, x + W - r, y + H);
        g.lineTo(x + r, y + H); g.quadraticCurveTo(x, y + H, x, y + H - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.stroke(); g.restore();
      },
      text(g, str, x, y, size, color, font) {
        g.save(); g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = (font || '900') + ' ' + size + 'px "Noto Serif TC","Songti TC","PMingLiU",serif'; g.fillText(str, x, y); g.restore();
      },
      tile(g, fn, o) { // tile a motif: fn(x, y, row, col)
        const w = g.canvas.width; let row = 0;
        for (let y = o.y0; y <= o.y1; y += o.step, row++) {
          let col = 0;
          for (let x = (o.x0 || 0) + (o.stagger === false ? 0 : (row % 2) * o.step / 2); x < (o.x1 || w); x += (o.stepX || o.step), col++) fn(x, y, row, col);
        }
      },
      soft(g, x, y, rx, ry, color, alpha = 1) {
        g.save(); g.translate(x, y); g.scale(1, ry / rx);
        const rg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
        rg.addColorStop(0, rgba(color, alpha)); rg.addColorStop(0.6, rgba(color, alpha * 0.8)); rg.addColorStop(1, rgba(color, 0));
        g.fillStyle = rg; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
      },
      blob(g, x, y, rx, ry, color, alpha = 1, rot = 0) {
        g.save(); g.globalAlpha = alpha; g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); g.restore();
      },
      stroke(g, pts, width, color, alpha = 1) {
        g.save(); g.strokeStyle = color; g.globalAlpha = alpha; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        if (pts.length === 3) g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
        else for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.stroke(); g.restore();
      }
    };

    // Head map painter context: equirectangular 1024 × 512, face centre at x = 512,
    // x grows toward IMAGE-RIGHT, back seam at x = 0 / 1024, top pole at y = 0.
    const P = Object.assign({}, D, {
      w: 1024, h: 512, F,
      xy: (lon, lat) => [512 + lon / 360 * 1024, (90 - lat) / 180 * 512],
      mirror: pts => pts.map(q => [1024 - q[0], q[1]])
    });
    const headTex = canvasTex(1024, 512, (g, w, h) => {
      if (F.paintBase) F.paintBase(g, P);
      else {
        const vg = g.createLinearGradient(0, 0, 0, h);
        vg.addColorStop(0, F.top); vg.addColorStop(0.55, F.mid); vg.addColorStop(1, F.low);
        g.fillStyle = vg; g.fillRect(0, 0, w, h);
        if (F.mask) {
          const mk = F.mask, mc = mk.color || CREAM;
          g.save(); g.translate(mk.x, mk.y); g.scale(1, mk.sy);
          const rg = g.createRadialGradient(0, 0, 10, 0, 0, mk.r);
          rg.addColorStop(0, rgba(mc, 1)); rg.addColorStop(0.55, rgba(mc, 1)); rg.addColorStop(1, rgba(mc, 0));
          g.fillStyle = rg; g.beginPath(); g.arc(0, 0, mk.r, 0, Math.PI * 2); g.fill(); g.restore();
        }
        const sc = F.stripe.color || DEEP, sa = F.stripe.alpha;
        g.filter = 'blur(' + F.stripe.blur + 'px)';
        if (F.pattern === 'tabby') {
          D.stroke(g, [[512, 108], [515, 150], [512, 196]], 18, sc, sa * 1.2);
          D.stroke(g, [[474, 118], [480, 152], [490, 186]], 13, sc, sa);
          D.stroke(g, [[550, 118], [544, 152], [534, 186]], 13, sc, sa);
          [[[318, 232], [356, 236], [400, 248]], [[312, 264], [352, 264], [394, 272]], [[322, 296], [356, 293], [390, 292]]].forEach(p => {
            D.stroke(g, p, 12, sc, sa);
            D.stroke(g, P.mirror(p), 12, sc, sa);
          });
          for (const x of [40, 100, 160, 864, 924, 984]) D.stroke(g, [[x, 70], [x + 12, 210], [x - 4, 350]], 26, sc, sa * 0.8);
        } else if (F.pattern === 'spots') {
          const S = F.spots, spc = S.color || sc;
          g.filter = 'blur(1.5px)';
          for (let i = 0; i < S.n; i++) {
            const lon = (rand() * 2 - 1) * 175, lat = lerp(S.lat[0], S.lat[1], rand());
            if (Math.abs(lon) < S.avoid && lat < 22) continue; // keep the face clear
            const [x, y] = P.xy(lon, lat), s = S.size * (0.6 + rand() * 0.8);
            D.blob(g, x, y, s, s * (0.7 + rand() * 0.5), spc, S.alpha, rand() * 3);
          }
        }
        g.filter = 'none';
      }
      if (F.paint) { g.save(); F.paint(g, P); g.restore(); }
      if (F.noise) softStrokes(g, w, h, F.noise.n, F.noise.colors, 22, F.noise.alpha);
    });

    // default fabric (立春): cream ground with sprout rows, gold hills and a matcha hem
    function sproutFabric(g, w, h, from, to, step, size) {
      g.fillStyle = '#F6F1DD'; g.fillRect(0, 0, w, h);
      D.tile(g, (x, y, row) => D.sprout(g, x + 30, y, size, row % 2 ? '#A3BC7E' : '#6E8C4E'), { y0: from, y1: to, step });
    }
    const robePaint = cfg.robe.paint || ((g, w, h) => {
      sproutFabric(g, w, h, 220, 760, 150, 40);
      g.strokeStyle = '#E4BA5C'; g.lineWidth = 6; g.lineCap = 'round';
      for (let x = 0; x <= w + 128; x += 128) {
        g.beginPath(); g.arc(x, 918, 52, Math.PI, 0); g.stroke();
        g.beginPath(); g.arc(x, 918, 32, Math.PI, 0); g.stroke();
        D.sprout(g, x + 64, 905, 30, '#6E8C4E');
      }
      D.wave(g, 842, 8, 128, '#E4BA5C', 5);
      g.fillStyle = '#E4BA5C'; g.fillRect(0, 922, w, 6);
      g.fillStyle = '#A3BC7E'; g.fillRect(0, 928, w, h - 928);
    });
    const sleevePaint = cfg.sleeves.paint || ((g, w, h) => {
      sproutFabric(g, w, h, 150, 470, 100, 34);
      g.fillStyle = '#A3BC7E'; g.fillRect(0, 0, w, 46);
      g.fillStyle = '#E4BA5C'; g.fillRect(0, 46, w, 5);
      g.fillStyle = '#E4BA5C'; g.fillRect(768 - 60, 150, 120, h - 150);
      g.fillStyle = '#A3BC7E'; g.fillRect(768 - 54, 150, 108, h - 150);
      g.fillStyle = '#E4BA5C'; g.fillRect(520, 108, 496, 60);
      g.fillStyle = '#A3BC7E'; g.fillRect(520, 113, 496, 50);
    });
    const T = cfg.tail;
    const tailPaint = T.paint || ((g, w, h) => {
      const base = nz(T.color, FUR), deep = nz(T.deep, DEEP), tip = nz(T.tip, CREAM);
      const lg = g.createLinearGradient(0, 0, w, 0);
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, b = T.bands ? Math.pow(0.5 + 0.5 * Math.cos(t * Math.PI * 2 * T.bands), 2) : 0;
        const c = new THREE.Color(base).lerp(new THREE.Color(deep), b * T.bandAlpha);
        if (T.tipStart < 1 && t > T.tipStart) c.lerp(new THREE.Color(tip), Math.min((t - T.tipStart) / 0.14, 1));
        lg.addColorStop(t, '#' + c.getHexString());
      }
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
    });
    const blobTex = canvasTex(128, 128, (g) => {
      const rg = g.createRadialGradient(64, 64, 2, 64, 64, 62);
      rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    }, false);
    const whiteTex = canvasTex(4, 4, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 4, 4); });

    /* =========================== materials =========================== */
    const std = (hex, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: C(hex), roughness: 0.9, metalness: 0 }, o));
    const texMat = (tex, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, map: tex, roughness: 0.9, metalness: 0 }, o));
    const M = {
      head: texMat(headTex),
      fur: std(FUR, { map: whiteTex }),
      cream: std(CREAM, { map: whiteTex }),
      pink: std(cfg.nose.color, { roughness: 0.7 }),
      eye: std(cfg.eyes.color, { roughness: 0.3 }),
      shine: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      mouth: std(cfg.mouth.color, { roughness: 0.6 }),
      gold: std('#E4BA5C', { roughness: 0.5, metalness: 0.1 })
    };

    /* ============================= scene ============================= */
    const stage = $('stage');
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!SHOT });
    renderer.setPixelRatio(SHOT ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    // def.exposure (opt-in, e.g. 0.75): linear tone mapping that dims the whole scene so colours sampled
    // from the picture render close to their sampled value (the default lights brighten fronts ~1.3–1.5×)
    if (def.exposure) { renderer.toneMapping = THREE.LinearToneMapping; renderer.toneMappingExposure = def.exposure; }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xffffff, SHOT && !BG0 ? 1 : 0);
    if (EMBED) document.documentElement.classList.add('embed');
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', meta.aria || meta.title || '節氣貓 3D 模型');
    renderer.domElement.tabIndex = 0;
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.6;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI * 0.56;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 1.1;
    controls.enablePan = false;

    scene.add(new THREE.HemisphereLight(C('#FFFBF2'), C('#E3D3B6'), 1.0));
    scene.add(new THREE.AmbientLight(0xffffff, 0.12));
    const key = new THREE.DirectionalLight(C('#FFF4E6'), 0.62);
    key.position.set(-3, 6.5, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 5.5, bottom: -1, near: 1, far: 22 });
    key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
    scene.add(key);
    const fill = new THREE.DirectionalLight(C('#F2F7FF'), 0.3); fill.position.set(4, 2, 4); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.45); rim.position.set(0, 4, -5); scene.add(rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.08 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const blob = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0.14, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.003; scene.add(blob);

    /* ============================ helpers ============================ */
    const outlined = [], furQueue = [], ticks = [];
    const asV = (p) => p === undefined || p === null ? null : (typeof p === 'number' ? V(p, p, p) : toV(p));
    function mesh(geo, mat, parent, pos, scale, ink) {
      const m = new THREE.Mesh(geo, mat);
      const pp = asV(pos), ss = asV(scale);
      if (pp) m.position.copy(pp);
      if (ss) m.scale.copy(ss);
      m.castShadow = true; m.receiveShadow = true;
      if (ink) outlined.push([m, ink]);
      (parent || character).add(m); return m;
    }
    const sphere = (r = 1, w = 40, h = 30) => new THREE.SphereGeometry(r, w, h);
    function part(name, parent) { const g = new THREE.Group(); g.userData.part = name; (parent || character).add(g); return g; }
    function group(parent, pos, rot) {
      const g = new THREE.Group(); if (pos) g.position.copy(toV(pos)); if (rot) g.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
      (parent || character).add(g); return g;
    }
    // average normals of vertices sharing a position so seams stay smooth
    function smoothNormals(geo) {
      geo.computeVertexNormals();
      const p = geo.attributes.position, n = geo.attributes.normal, groups = new Map();
      for (let i = 0; i < p.count; i++) {
        const k = p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(i);
      }
      const v = new THREE.Vector3();
      groups.forEach(ids => {
        if (ids.length < 2) return;
        v.set(0, 0, 0); ids.forEach(i => { v.x += n.getX(i); v.y += n.getY(i); v.z += n.getZ(i); });
        if (v.lengthSq() < 1e-12) return; v.normalize();
        ids.forEach(i => n.setXYZ(i, v.x, v.y, v.z));
      });
      n.needsUpdate = true; return geo;
    }
    function shapeFrom(pts) { // [[x,y],...] → THREE.Shape
      if (pts instanceof THREE.Shape) return pts;
      const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s;
    }
    function roundRectShape(w, h, r) {
      const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    // extrude a 2D shape (THREE.Shape or [[x,y]...]) along +z, centred on z = 0
    function extrude(shape, depth, bevel = 0.02, bevelSegments = 5, curveSegments = 20) {
      const d = Math.max(depth - bevel * 2, 0.001);
      const g = new THREE.ExtrudeGeometry(shapeFrom(shape), { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments, curveSegments });
      g.translate(0, 0, -d / 2); return g;
    }
    function roundBox(w, h, d, r, bevel) { return extrude(roundRectShape(w, h, r), d, bevel, 8, 16); }
    function leafGeo(L, w) {
      const s = new THREE.Shape();
      s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.45, 0, L); s.quadraticCurveTo(-w, L * 0.45, 0, 0);
      return new THREE.ShapeGeometry(s, 12);
    }
    // soft rounded ear: a sphere pulled into a blunt triangle (tip at y = 1, base at y = 0)
    function earGeo(sharp = 0.94) {
      const g = new THREE.SphereGeometry(1, 36, 28), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const t = (p.getY(i) + 1) / 2, k = Math.pow(Math.max(1 - t * sharp, 0), 0.9);
        p.setXYZ(i, p.getX(i) * k, t, p.getZ(i) * k);
      }
      return smoothNormals(g);
    }
    // lathe from [[r, y], ...] spline profile; u = 0 at the back, 0.5 at the front (+z)
    function lathe(points, segs = 64, phiStart = Math.PI, phiLength = Math.PI * 2, spaced = 48) {
      const pts = new THREE.SplineCurve(points.map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(spaced);
      return { geo: smoothNormals(new THREE.LatheGeometry(pts, segs, phiStart, phiLength)), pts };
    }
    const curve3 = (pts, closed) => new THREE.CatmullRomCurve3(pts.map(toV), !!closed);
    // tube along points; r is a number or a function of t ∈ [0, 1]
    function tube(pts, r = 0.03, segs = 48, radial = 12, closed = false) {
      const cv = Array.isArray(pts) ? curve3(pts, closed) : pts;
      if (typeof r === 'number') return new THREE.TubeGeometry(cv, segs, r, radial, closed);
      const g = new THREE.TubeGeometry(cv, segs, 1, radial, closed);
      const tp = g.attributes.position, Pp = new THREE.Vector3();
      for (let i = 0; i <= segs; i++) {
        const t = i / segs; cv.getPointAt(Math.min(t, 1), Pp);
        const rr = r(t);
        for (let j = 0; j <= radial; j++) {
          const k = i * (radial + 1) + j;
          tp.setXYZ(k, Pp.x + (tp.getX(k) - Pp.x) * rr, Pp.y + (tp.getY(k) - Pp.y) * rr, Pp.z + (tp.getZ(k) - Pp.z) * rr);
        }
      }
      return smoothNormals(g);
    }
    // flat double-sided strip along points. width: number | fn(t); face: approx normal (default +z)
    function ribbon(pts, width = 0.12, o = {}) {
      const cv = Array.isArray(pts) ? curve3(pts) : pts;
      const segs = o.segs || 64, face = toV(o.face || [0, 0, 1]).normalize();
      const pos = [], uv = [], idx = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs, Pp = cv.getPointAt(t), Tt = cv.getTangentAt(t);
        let side = Tt.clone().cross(face);
        if (side.lengthSq() < 1e-6) side = Tt.clone().cross(V(1, 0, 0));
        side.normalize();
        if (o.twist) side.applyAxisAngle(Tt, o.twist(t));
        const w = (typeof width === 'function' ? width(t) : width) / 2;
        const a = Pp.clone().addScaledVector(side, -w), b = Pp.clone().addScaledVector(side, w);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(0, t, 1, t);
        if (i < segs) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals(); return g;
    }
    // teardrop (drop / flame body): tip at +y, round bottom; h = height, r = belly radius
    function dropGeo(h = 1, r = 0.4, tipPow = 1.6, segs = 40) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, a = Math.PI * t; // 0 bottom → π top
        const y = -Math.cos(a) * 0.5 + 0.5; // 0..1
        const rr = Math.sin(a) * Math.pow(1 - y * 0.999, tipPow - 1) * r / 0.9;
        pts.push(new THREE.Vector2(Math.max(rr, 0.0001), y * h - h * 0.3));
      }
      return smoothNormals(new THREE.LatheGeometry(pts, segs));
    }

    /* ---- small ready-made props (all return a Group) ---- */
    function puff(parent, pos, s = 1, color = '#FFFFFF', ink = null) { // stylised cloud of merged balls
      const g = group(parent, pos); g.scale.setScalar(s);
      const m = std(color, { roughness: 1 });
      [[0, 0, 0, 0.42], [-0.42, -0.08, 0, 0.3], [0.44, -0.06, 0, 0.32], [-0.18, 0.2, 0, 0.3], [0.2, 0.18, 0.02, 0.28], [0.75, -0.12, 0, 0.2], [-0.72, -0.14, 0, 0.18]]
        .forEach(b => mesh(sphere(b[3], 24, 18), m, g, [b[0], b[1], b[2]], [1, 0.82, 0.6], ink));
      return g;
    }
    function flame(parent, pos, s = 1, outer = '#F08A3C', inner = '#FFD36B') {
      const g = group(parent, pos); g.scale.setScalar(s);
      const o = mesh(dropGeo(1, 0.36, 2.2), std(outer, { emissive: C(outer), emissiveIntensity: 0.55, roughness: 0.6 }), g, null, null, null);
      const i = mesh(dropGeo(0.62, 0.22, 2.2), std(inner, { emissive: C(inner), emissiveIntensity: 0.8, roughness: 0.6 }), g, [0, -0.08, 0.05]);
      o.castShadow = i.castShadow = false;
      g.userData.flicker = true;
      return g;
    }
    function drop(parent, pos, s = 1, color = '#8FC8EE') {
      const g = group(parent, pos); g.scale.setScalar(s);
      mesh(dropGeo(1, 0.34, 1.8), std(color, { roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.85 }), g, null, null, null);
      const hi = mesh(sphere(0.06, 12, 10), M.shine, g, [-0.1, 0.02, 0.26], [1, 1.6, 0.5]); hi.castShadow = false;
      return g;
    }
    function flower(parent, pos, s = 1, petal = '#F6B6C1', center = '#F2C94C', n = 5) {
      const g = group(parent, pos); g.scale.setScalar(s);
      const pm = std(petal, { roughness: 0.8 });
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        const pt = mesh(sphere(0.2, 20, 14), pm, g, [Math.sin(a) * 0.2, Math.cos(a) * 0.2, 0], [0.75, 1, 0.3]);
        pt.rotation.z = -a;
      }
      mesh(sphere(0.1, 16, 12), std(center, { roughness: 0.7 }), g, [0, 0, 0.05], [1, 1, 0.6]);
      return g;
    }
    function snowflake(parent, pos, s = 1, color = '#FFFFFF') {
      const g = group(parent, pos); g.scale.setScalar(s);
      const m = std(color, { roughness: 0.5, emissive: C(color), emissiveIntensity: 0.15 });
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3, arm = group(g, null, [0, 0, a]);
        mesh(new THREE.BoxGeometry(0.05, 0.5, 0.03), m, arm, [0, 0.25, 0]);
        [-1, 1].forEach(k => { const b = mesh(new THREE.BoxGeometry(0.04, 0.16, 0.03), m, arm, [k * 0.05, 0.34, 0]); b.rotation.z = -k * 0.8; });
      }
      return g;
    }
    function bolt(parent, pos, s = 1, color = '#F4D35E') {
      const g = group(parent, pos); g.scale.setScalar(s);
      mesh(extrude([[0.08, 0.5], [-0.18, -0.02], [0, -0.02], [-0.1, -0.5], [0.2, 0.08], [0.02, 0.08]], 0.08, 0.02), std(color, { roughness: 0.6, emissive: C(color), emissiveIntensity: 0.25 }), g, null, null, null);
      return g;
    }
    function tassel(parent, pos, color = '#E4BA5C', len = 0.3, r = 0.04, ink = null) {
      const g = group(parent, pos); const m = std(color, { roughness: 0.7 });
      mesh(sphere(r * 0.9, 16, 12), m, g, [0, 0, 0], null, ink);
      mesh(new THREE.CylinderGeometry(r * 0.8, r, r * 1.8, 16), m, g, [0, -r * 1.4, 0], null, ink);
      for (let i = 0; i < 7; i++) {
        const s = mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.36, len, 6), m, g, [(i - 3) * r * 0.28, -r * 2.3 - len / 2, (i % 2) * r * 0.2]);
        s.rotation.z = (i - 3) * 0.035;
      }
      return g;
    }
    // disc badge: gold rim cylinder + painted face (paint(g, 256) draws on a 256² canvas)
    function medal(parent, pos, r = 0.18, paint = null, rim = '#E4BA5C', ink = '#A87A26', face = '#F7EBC8') {
      const g = group(parent, pos);
      const d = mesh(new THREE.CylinderGeometry(r, r, r * 0.22, 56), std(rim, { roughness: 0.5, metalness: 0.1 }), g, null, null, ink); d.rotation.x = Math.PI / 2;
      const tex = canvasTex(256, 256, (cg) => { cg.fillStyle = face; cg.beginPath(); cg.arc(128, 128, 126, 0, Math.PI * 2); cg.fill(); if (paint) paint(cg, 256); });
      const f = mesh(new THREE.CircleGeometry(r * 0.92, 56), texMat(tex, { roughness: 0.6 }), g, [0, 0, r * 0.115]); f.castShadow = false;
      return g;
    }
    // rounded plank / tablet (笏板-like): w × h with a round top, painted face
    function tablet(parent, pos, w = 0.26, h = 0.85, paint = null, color = '#F2CF7A', edge = '#E4BA5C', ink = '#A87A26') {
      const s = new THREE.Shape(), hw = w / 2;
      s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, h - hw * 0.85); s.quadraticCurveTo(hw, h, 0, h); s.quadraticCurveTo(-hw, h, -hw, h - hw * 0.85); s.lineTo(-hw, 0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 5, curveSegments: 20 });
      geo.translate(0, 0, -0.015);
      const tex = canvasTex(256, Math.round(256 * h / w), (cg, cw, ch) => { cg.fillStyle = color; cg.fillRect(0, 0, cw, ch); if (paint) paint(cg, cw, ch); });
      tex.repeat.set(1 / w, 1 / h); tex.offset.set(0.5, 0);
      const g = group(parent, pos);
      mesh(geo, [texMat(tex, { roughness: 0.55 }), std(edge, { roughness: 0.5 })], g, null, null, ink);
      return g;
    }
    function scatter(n, fn) { for (let i = 0; i < n; i++) fn(i, rand); }

    const character = new THREE.Group(); scene.add(character);
    const body = new THREE.Group(); character.add(body);
    const decor = new THREE.Group(); scene.add(decor);

    /* ============================== robe ============================== */
    const RB = cfg.robe;
    const robeG = part('robe', body);
    const poseG = part('pose', body);
    let robeMesh = null, profPts = null;
    if (RB) {
      const robeL = lathe(RB.profile, RB.segs);
      profPts = robeL.pts;
      const robeTex = canvasTex(1024, 1024, (g, w, h) => robePaint(g, w, h, D, { robeV, robeUV, robeR, onRobe }));
      robeMesh = mesh(robeL.geo, texMat(robeTex, { color: C(RB.color), side: THREE.DoubleSide }), robeG, null, null, RB.ink);
      robeMesh.userData.isRobe = true;
    } else {
      profPts = new THREE.SplineCurve(DEFAULTS.robe.profile.map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(48);
    }
    function robeR(y) {
      for (let i = 0; i < profPts.length - 1; i++) {
        const a = profPts[i], b = profPts[i + 1];
        if ((y >= a.y && y <= b.y) || (y <= a.y && y >= b.y)) return a.x + (b.x - a.x) * ((y - a.y) / (b.y - a.y || 1));
      }
      return y < profPts[0].y ? profPts[0].x : 0.12;
    }
    // canvas y on the robe map for a height y (map is laid out by arc length from the hem)
    function robeV(y) {
      let s = 0, total = 0, at = null;
      for (let i = 0; i < profPts.length - 1; i++) {
        const a = profPts[i], b = profPts[i + 1], L = a.distanceTo(b);
        if (at === null && ((y >= a.y && y <= b.y) || (y <= a.y && y >= b.y))) at = s + L * ((y - a.y) / (b.y - a.y || 1));
        s += L;
      }
      total = s; if (at === null) at = y < profPts[0].y ? 0 : total;
      return 1024 * (1 - at / total);
    }
    function onRobe(deg, y, off = 0) { const a = deg * Math.PI / 180, r = robeR(y) + off; return V(Math.sin(a) * r, y, Math.cos(a) * r); }
    function robeUV(deg, y) { return [512 + deg / 360 * 1024, robeV(y)]; }

    // curved panel hugging the robe (aprons, side panels, capes' front flaps)
    function robePanel(o) {
      const nu = o.nu || 24, nv = o.nv || 24, pos = [], uv = [], idx = [];
      for (let j = 0; j <= nv; j++) {
        const t = j / nv, y = lerp(o.y0, o.y1, t);
        const half = lerp(o.degB !== undefined ? o.degB : o.deg, o.deg, t);
        for (let i = 0; i <= nu; i++) {
          const s = i / nu, deg = (o.center || 0) + lerp(-half, half, s);
          const bulge = o.bulge ? o.bulge * Math.sin(Math.PI * s) : 0;
          const p = onRobe(deg, y, (o.off || 0.02) + bulge);
          pos.push(p.x, p.y, p.z); uv.push(s, t);
        }
      }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = a + nu + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      const W = o.texW || 256, H = o.texH || 512;
      const tex = canvasTex(W, H, (cg, cw, ch) => { cg.fillStyle = o.color || '#FFFFFF'; cg.fillRect(0, 0, cw, ch); if (o.paint) o.paint(cg, cw, ch, D); });
      const m = mesh(g, texMat(tex, { side: THREE.DoubleSide }), o.parent || robeG, null, null, o.ink || null);
      if (o.trim) {
        const edge = [];
        for (let j = 0; j <= 16; j++) { const t = j / 16, y = lerp(o.y0, o.y1, t), half = lerp(o.degB !== undefined ? o.degB : o.deg, o.deg, t); edge.push(onRobe((o.center || 0) - half, y, (o.off || 0.02) + 0.005)); }
        const edge2 = edge.map(p => { const a = Math.atan2(p.x, p.z) * 180 / Math.PI, c = o.center || 0; return onRobe(2 * c - a, p.y, (o.off || 0.02) + 0.005); });
        const bottom = []; const hb = o.degB !== undefined ? o.degB : o.deg;
        for (let i = 0; i <= 16; i++) bottom.push(onRobe((o.center || 0) + lerp(-hb, hb, i / 16), o.y0, (o.off || 0.02) + 0.005));
        const tm = std(o.trim, { roughness: 0.7 });
        [edge, edge2, bottom].forEach(pl => mesh(tube(pl, o.trimR || 0.018, 32, 8), tm, o.parent || robeG));
      }
      return m;
    }

    if (RB && cfg.collar) {
      const CL = cfg.collar, cm = std(CL.color, { roughness: 0.8 }), sgn = CL.over;
      if (CL.style === 'round') {
        const ring = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * 360; ring.push(onRobe(a, CL.y0 + 0.04 * Math.cos(a * Math.PI / 180), 0.02)); }
        mesh(tube(ring.slice(0, -1), CL.r, 96, 10, true), cm, robeG);
      } else {
        const under = [onRobe(58 * sgn, CL.y0, 0.02), onRobe(36 * sgn, CL.y0 - 0.1, 0.02), onRobe(14 * sgn, CL.y0 - 0.24, 0.02), onRobe(2 * sgn, CL.y0 - 0.34, 0.02)];
        const over = [onRobe(-58 * sgn, CL.y0, 0.035), onRobe(-36 * sgn, CL.y0 - 0.1, 0.035), onRobe(-10 * sgn, CL.y0 - 0.25, 0.035), onRobe(18 * sgn, CL.y0 - 0.42, 0.035), onRobe(32 * sgn, CL.y0 - 0.52, 0.035)];
        mesh(tube(under, CL.r * 0.94, 48, 12), cm, robeG);
        mesh(tube(over, CL.r * 1.05, 60, 12), cm, robeG);
      }
    }

    /* ============================ sleeves ============================ */
    function sleeveGeo(path, o = {}, segT = 64, segA = 56) {
      const pos = [], uvs = [], idx = [], ring = [];
      const dropK = o.drop === undefined ? 1 : o.drop, wK = o.width === undefined ? 1 : o.width;
      for (let i = 0; i <= segT; i++) {
        const t = i / segT, Cp = path.getPointAt(t), Tt = path.getTangentAt(t);
        let side = Tt.clone().cross(UP);
        if (side.lengthSq() < 0.02) side = Tt.clone().cross(V(0, 0, 1));
        side.normalize();
        const u = side.clone().cross(Tt).normalize();
        const sc = (0.3 + 0.7 * sst(0, 0.32, t) + 0.03 * sst(0.8, 1, t)) * wK;
        const hang = sst(0.05, 0.68, t) * (1 - 0.9 * sst(0.66, 0.99, t));
        const rw = (0.18 + 0.06 * t) * sc, rt = (0.16 + 0.04 * t) * sc, drop = (0.12 + 0.62 * hang * dropK) * sc;
        for (let j = 0; j <= segA; j++) {
          const a = j / segA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
          const y = sa >= 0 ? rt * sa : -drop * Math.pow(-sa, 0.7);
          const x = rw * ca * (sa < 0 ? 1 + 0.35 * (-sa) * t : 1);
          const Pp = Cp.clone().addScaledVector(side, x).addScaledVector(u, y);
          pos.push(Pp.x, Pp.y, Pp.z); uvs.push(j / segA, t);
          if (i === segT) ring.push(Pp);
        }
      }
      for (let i = 0; i < segT; i++) for (let j = 0; j < segA; j++) {
        const a = i * (segA + 1) + j, b = a + segA + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx); smoothNormals(g);
      const k = Math.floor(segT / 2) * (segA + 1) + Math.floor(segA / 4);
      const pv = V(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]), nv = V().fromBufferAttribute(g.attributes.normal, k);
      if (nv.dot(pv.sub(path.getPointAt(0.5))) < 0) {
        for (let i = 0; i < idx.length; i += 3) { const tt = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = tt; }
        g.setIndex(idx); smoothNormals(g);
      }
      return { geo: g, ring, T: path.getTangentAt(1) };
    }
    const SL = cfg.sleeves;
    const sleeveTex = SL && SL.style === 'wide' ? canvasTex(1024, 512, (g, w, h) => sleevePaint(g, w, h, D)) : null;
    const pawColor = nz(cfg.paws.color, CREAM), pawInk = nz(cfg.paws.ink, pawColor === CREAM ? F.creamInk : F.ink);
    const pawMat = std(pawColor, { map: whiteTex });
    const hands = {}, wrists = [];
    const sleeveMeshes = [];
    ['L', 'R'].forEach(sideKey => {
      const A = cfg.arms[sideKey];
      if (!A) return;
      const sx = sideKey === 'L' ? -1 : 1;
      const H = toV(A.hand);
      let pathPts;
      if (A.path) pathPts = A.path.map(toV);
      else {
        const S = A.shoulder ? toV(A.shoulder) : V(0.44 * sx, 1.46, 0);
        const E = S.clone().lerp(H, 0.45).add(V(sx * A.elbowOut, -A.elbowDown, 0));
        const W = H.clone().addScaledVector(H.clone().sub(E).normalize(), -0.19);
        pathPts = [S, E, W];
      }
      const path = new THREE.CatmullRomCurve3(pathPts);
      const W = path.getPointAt(1), Tn = path.getTangentAt(1);
      if (SL && SL.style === 'wide') {
        const sl = sleeveGeo(path, A);
        sleeveMeshes.push(mesh(sl.geo, texMat(sleeveTex, { color: C(SL.color) }), robeG, null, null, SL.ink));
        const lining = new THREE.Mesh(sl.geo, std(SL.lining, { side: THREE.BackSide })); lining.receiveShadow = true; robeG.add(lining);
        if (SL.trim) mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sl.ring.slice(0, -1), true), 96, SL.trimR, 10, true), std(SL.trim, { roughness: 0.8 }), robeG);
      } else if (SL && SL.style === 'narrow') {
        const nm = SL.paint ? texMat(canvasTex(512, 256, (g, w, h) => SL.paint(g, w, h, D))) : std(SL.color, { roughness: 0.85 });
        sleeveMeshes.push(mesh(tube(path, t => (0.17 - 0.05 * t) * (A.width || 1), 40, 20), nm, robeG, null, null, SL.ink));
        if (SL.trim) {
          const rr = (0.12 + 0.012) * (A.width || 1), ring = [];
          const side = Tn.clone().cross(UP).lengthSq() < 0.02 ? Tn.clone().cross(V(0, 0, 1)).normalize() : Tn.clone().cross(UP).normalize();
          const u = side.clone().cross(Tn).normalize();
          for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ring.push(W.clone().addScaledVector(side, Math.cos(a) * rr).addScaledVector(u, Math.sin(a) * rr)); }
          mesh(tube(ring, SL.trimR, 48, 8, true), std(SL.trim, { roughness: 0.8 }), robeG);
        }
      } else if (SL && SL.style === 'bare') {
        sleeveMeshes.push(mesh(tube(path, t => (0.12 - 0.02 * t) * (A.width || 1), 40, 16), std(FUR, { map: whiteTex }), robeG, null, null, F.ink));
      }
      if (A.paw !== false) {
        const ps = A.pawScale || 1;
        if (A.wrist !== false) wrists.push(mesh(sphere(0.09 * ps), pawMat, poseG, W.clone().addScaledVector(Tn, -0.02), null, pawInk));
        mesh(sphere(0.12 * ps), pawMat, poseG, H, [1, 0.88, 0.95], pawInk);
      }
      hands[sideKey] = { p: H.clone(), wrist: W.clone(), dir: Tn.clone(), path };
    });

    /* ============================== belt ============================== */
    const beltG = part('belt', body);
    let tasselG = null;
    if (cfg.belt) {
      const BT = cfg.belt, yT = BT.yT, yB = BT.yB, yK = (yT + yB) / 2;
      const bm = std(BT.color, { roughness: 0.8, side: THREE.DoubleSide });
      mesh(new THREE.CylinderGeometry(robeR(yT) + 0.03, robeR(yB) + 0.03, yT - yB, 96, 1, true), bm, beltG, [0, yK, 0]);
      if (BT.line) [yT, yB].forEach(y => { const r = mesh(new THREE.TorusGeometry(robeR(y) + 0.035, 0.012, 8, 128), std(BT.line, { roughness: 0.5 }), beltG, [0, y, 0]); r.rotation.x = Math.PI / 2; });
      const zK = robeR(yK) + 0.075, km = std(BT.knotColor, { roughness: 0.5, metalness: 0.1 });
      if (BT.knot === 'loops' || BT.knot === 'bow') {
        const big = BT.knot === 'bow';
        [-1, 1].forEach(sx => {
          const l = mesh(new THREE.TorusGeometry(big ? 0.09 : 0.055, big ? 0.03 : 0.02, 12, 32), km, beltG, [(big ? 0.1 : 0.06) * sx, yK + 0.01, zK], big ? [1, 0.7, 1] : null, BT.ink);
          l.rotation.y = sx * 0.35;
        });
        mesh(sphere(big ? 0.05 : 0.042), km, beltG, [0, yK, zK + 0.012], null, BT.ink);
        if (big) [-1, 1].forEach(sx => mesh(ribbon([[0.02 * sx, yK - 0.02, zK], [0.08 * sx, yK - 0.2, zK + 0.02], [0.1 * sx, yK - 0.38, zK + 0.01]], 0.07), std(BT.knotColor, { side: THREE.DoubleSide, roughness: 0.8 }), beltG));
      } else if (BT.knot === 'disc') {
        const d = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 40), km, beltG, [0, yK, zK - 0.01], null, BT.ink); d.rotation.x = Math.PI / 2;
      }
      if (BT.tassel) {
        tasselG = new THREE.Group(); tasselG.position.set(0, yK - 0.03, zK + 0.01); tasselG.rotation.x = -0.34; beltG.add(tasselG);
        const tm = std(BT.tassel.color, { roughness: 0.6 });
        mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.07, 20), tm, tasselG, [0, -0.06, 0], null, BT.ink);
        for (let i = 0; i < 7; i++) {
          const s = mesh(new THREE.CylinderGeometry(0.011, 0.014, BT.tassel.len, 8), tm, tasselG, [(i - 3) * 0.011, -0.09 - BT.tassel.len / 2, (i % 2) * 0.008]);
          s.rotation.z = (i - 3) * 0.035;
        }
      }
    }

    /* ======================= apron / cape / collar ======================= */
    if (cfg.apron) {
      const A = cfg.apron;
      robePanel(Object.assign({ y0: 0.22, y1: 0.8, deg: 24, degB: 28, off: 0.03, color: '#FFFFFF', parent: robeG }, A));
    }
    if (cfg.cape) {
      const CP = Object.assign({ color: '#DDE6EE', y0: 1.6, y1: 0.5, off: 0.07, open: 70, lining: null, trim: null, trimR: 0.03, ink: null, segs: 96, flare: 0.12 }, cfg.cape);
      const prof = [];
      for (let i = 0; i <= 12; i++) { const y = lerp(CP.y1, CP.y0, i / 12); prof.push([robeR(y) + CP.off + CP.flare * (1 - i / 12) * (1 - i / 12), y]); }
      prof.push([0.12, CP.y0 + 0.06]);
      const half = CP.open / 2 * Math.PI / 180;
      const ctex = canvasTex(1024, 512, (g, w, h) => { g.fillStyle = CP.color; g.fillRect(0, 0, w, h); if (CP.paint) CP.paint(g, w, h, D); });
      const cl = lathe(prof, CP.segs, half, Math.PI * 2 - half * 2, 32);
      // LatheGeometry measures phi from +z (the front), so leaving [-half, half] out opens the cape at the front
      const capeMesh = mesh(cl.geo, texMat(ctex, { side: THREE.DoubleSide }), part(CP.part || 'cape', body), null, null, CP.ink);
      if (CP.lining) { const ln = new THREE.Mesh(cl.geo, std(CP.lining, { side: THREE.BackSide })); ln.receiveShadow = true; capeMesh.add(ln); }
      if (CP.trim) {
        const hem = [];
        for (let i = 0; i <= 48; i++) { const a = half + (Math.PI * 2 - half * 2) * i / 48; const r = prof[0][0]; hem.push(V(Math.sin(a) * r, CP.y1, Math.cos(a) * r)); }
        mesh(tube(hem, CP.trimR, 96, 8), std(CP.trim, { roughness: 0.8 }), capeMesh.parent);
      }
    }
    let furCollarMesh = null;
    if (cfg.furCollar) {
      const FCo = Object.assign({ color: '#FFFFFF', y: 1.55, tube: 0.13, dip: 0.12, off: 0.02, ink: '#D9D2C5', fur: { layers: 14, length: 0.07, gravity: 0.025, repeat: [14, 2] } }, cfg.furCollar);
      const ring = [];
      for (let i = 0; i < 48; i++) {
        const deg = i / 48 * 360, front = Math.pow(Math.max(0, Math.cos(deg * Math.PI / 180)), 2);
        const y = FCo.y - FCo.dip * front;
        ring.push(onRobe(deg, y, FCo.off + FCo.tube * 0.4));
      }
      furCollarMesh = mesh(tube(ring, FCo.tube, 128, 18, true), std(FCo.color, { map: whiteTex }), part('furCollar', body), null, null, FCo.ink);
      if (FCo.fur) furQueue.push([furCollarMesh, FCo.fur]);
    }

    /* ======================= bib, legs, feet ======================= */
    const bib = [];
    if (cfg.bib) {
      const bm = std(nz(cfg.bib.color, CREAM), { map: whiteTex });
      cfg.bib.balls.forEach(p => bib.push(mesh(sphere(p[3]), bm, poseG, [p[0], p[1], p[2]], null, F.creamInk)));
      if (cfg.bib.fur) bib.forEach(b => furQueue.push([b, cfg.bib.fur]));
    }
    if (cfg.legs) {
      const LG = Object.assign({ color: '#F6F1DD', r: 0.2, top: 0.7, x: 0.28, z: 0.55, ink: null }, cfg.legs);
      [-1, 1].forEach(sx => mesh(new THREE.CylinderGeometry(LG.r * 0.95, LG.r, LG.top - 0.1, 24), std(LG.color, { roughness: 0.85 }), poseG, [LG.x * sx, 0.1 + (LG.top - 0.1) / 2, LG.z], null, LG.ink));
    }
    const feet = [];
    if (cfg.feet) {
      const FT = cfg.feet, fc = nz(FT.color, FUR), tc = nz(FT.toe, CREAM);
      [-1, 1].forEach(sx => {
        if (FT.type === 'boot') {
          const B = Object.assign({ color: '#6B5140', trim: '#E4BA5C', sole: '#3E3029', shaft: 0.3, ink: '#4A3A30' }, FT.boot || {});
          const bg = group(poseG, [FT.x * sx, 0, FT.z]);
          feet.push(mesh(sphere(0.22), std(B.color, { roughness: 0.75 }), bg, [0, 0.11, 0.05], [0.95, 0.55, 1.3], B.ink));
          mesh(new THREE.CylinderGeometry(0.17, 0.19, B.shaft, 24), std(B.color, { roughness: 0.75 }), bg, [0, 0.12 + B.shaft / 2, -0.06], null, B.ink);
          if (B.trim) { const r = mesh(new THREE.TorusGeometry(0.175, 0.022, 8, 32), std(B.trim, { roughness: 0.5 }), bg, [0, 0.12 + B.shaft, -0.06]); r.rotation.x = Math.PI / 2; }
          if (B.sole) mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.035, 32), std(B.sole, { roughness: 0.8 }), bg, [0, 0.02, 0.05], [1, 1, 1.3]);
        } else {
          feet.push(mesh(sphere(0.21), std(fc, { map: whiteTex }), poseG, [FT.x * sx, FT.y, FT.z], [1, 0.55, 1.25], F.ink));
          if (tc) mesh(sphere(0.13), std(tc, { map: whiteTex }), poseG, [FT.x * sx, FT.y - 0.02, FT.z + 0.21], [1.2, 0.6, 0.85], F.creamInk);
        }
      });
    }

    /* ============================== tail ============================== */
    const tailG = part('tail', character);
    let tailMesh = null;
    if (T) {
      const base = toV(T.pts[0]);
      tailG.position.copy(base);
      const tailCurve = new THREE.CatmullRomCurve3(T.pts.map(p => toV(p).sub(base)));
      const shape = T.shape || (t => Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * t)), 0.55));
      const tailGeo = tube(tailCurve, t => T.r * shape(t) + 0.002, 140, 32);
      tailMesh = mesh(tailGeo, texMat(canvasTex(1024, 64, (g, w, h) => tailPaint(g, w, h, D))), tailG, null, null, nz(T.ink, F.ink));
      mesh(sphere(T.r * 0.53), std(nz(T.color, FUR), { map: whiteTex }), tailG, [0, 0, 0]);
      if (T.fur) furQueue.push([tailMesh, T.fur]);
    }

    /* ============================== head ============================== */
    const headG = new THREE.Group(); headG.position.set(0, HD.neck + (HD.lift || 0), 0); character.add(headG);
    const head = new THREE.Group(); head.position.set(0, -HD.neck, 0); headG.add(head);
    const HC = V(0, HD.y, 0), hy = HD.y;

    const headGeo = new THREE.SphereGeometry(1, 110, 80);
    headGeo.rotateY(-Math.PI / 2);
    {
      const p = headGeo.attributes.position;
      const furLen = new Float32Array(p.count);
      const q = { x: 0, y: 0, z: 0 };
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const cheek = Math.exp(-Math.pow((y + 0.25) / 0.62, 2));
        const ax = Math.abs(x), psi = Math.atan2(y, Math.max(ax, 1e-4));
        const side = sst(0.5, 0.92, ax) * sst(0.35, 0.0, y) * sst(-0.95, -0.55, y);
        const bump = Math.pow(0.5 + 0.5 * Math.cos(psi * HD.ruffFreq + 0.9), 2);
        const f = 1 + HD.ruff * side * bump;
        let sy = HD.h; if (y < -0.55) sy *= 1 - HD.chinDrop * sst(-0.55, -1, y);
        const face = sst(0.45, 0.8, z) * sst(-0.75, -0.45, y) * (1 - sst(0.3, 0.55, y));
        const ruff = sst(0.4, 0.9, ax) * sst(0.3, -0.2, y);
        let fl = 0.7 + 0.4 * ruff;
        if (y < -0.55) fl = Math.max(fl, 0.95);
        furLen[i] = fl * (1 - face) + 0.08 * face;
        q.x = x * HD.w * (1 + HD.cheek * cheek) * f;
        q.y = y * sy * f;
        q.z = z * HD.d * (1 + 0.05 * cheek) * (1 + 0.03 * side * HD.ruff / 0.045 * bump);
        if (HD.deform) HD.deform(q, { x, y, z });
        p.setXYZ(i, q.x, q.y, q.z);
      }
      smoothNormals(headGeo);
      headGeo.setAttribute('furLen', new THREE.BufferAttribute(furLen, 1));
    }
    const faceG = part('face', head);
    const headMesh = mesh(headGeo, M.head, faceG, HC, null, F.ink);

    const surfRay = new THREE.Raycaster();
    function onSkin(x, y, targets) {
      character.updateMatrixWorld(true);
      surfRay.set(V(x, y, 6), V(0, 0, -1));
      const h = surfRay.intersectObjects(targets || [headMesh], false)[0];
      return h ? { p: h.point.clone(), n: h.face.normal.clone().transformDirection(h.object.matrixWorld), uv: h.uv } : { p: V(x, y, 0.85), n: V(0, 0, 1) };
    }
    const zAt = (x, y) => onSkin(x, y, [headMesh]).p.z;

    const muzzle = [];
    if (cfg.muzzle) {
      const MZ = cfg.muzzle, ms = MZ.size, mm = std(nz(MZ.color, CREAM), { map: whiteTex }), my = hy + MZ.y;
      muzzle.push(mesh(sphere(0.26 * ms), mm, faceG, [0, my, zAt(0, my) - 0.16 * ms], [1.12, 0.72, 0.78]));
      [-1, 1].forEach(sx => muzzle.push(mesh(sphere(0.135 * ms), mm, faceG, [0.12 * sx * ms, my + 0.03, zAt(0.12 * sx * ms, my + 0.03) - 0.07 * ms])));
    }
    const faceParts = muzzle.concat(headMesh);
    if (cfg.nose) {
      const nose = onSkin(0, hy + cfg.nose.y, faceParts);
      mesh(sphere(0.05 * cfg.nose.size, 24, 18), M.pink, faceG, nose.p.clone().addScaledVector(nose.n, 0.01), [1.4 * cfg.nose.size, 0.95 * cfg.nose.size, 1]);
    }
    const MO = cfg.mouth;
    if (MO && MO.type !== 'none') {
      const my = hy + MO.y, mw = MO.w;
      const onF = (x, y, off = 0.008) => onSkin(x, y, faceParts).p.add(V(0, 0, off));
      if (MO.type === 'frown') {
        const pts = [[-mw * 0.55, my - 0.03], [0, my + 0.01], [mw * 0.55, my - 0.03]].map(([x, y]) => onF(x, y));
        mesh(tube(pts, 0.011, 24, 8), M.mouth, faceG);
      } else {
        const dp = MO.depth === undefined ? 0.06 : MO.depth;
        const pts = [[-mw, my], [-mw * 0.54, my - dp], [0, my - 0.005], [mw * 0.54, my - dp], [mw, my]].map(([x, y]) => onF(x, y));
        mesh(tube(pts, 0.011, 48, 8), M.mouth, faceG);
        const m0 = onF(0, hy + cfg.nose.y - 0.03);
        mesh(new THREE.TubeGeometry(new THREE.LineCurve3(m0, pts[2]), 4, 0.011, 8), M.mouth, faceG);
        if (MO.type === 'open' || MO.type === 'tongue') {
          const k = MO.open;
          const s = new THREE.Shape();
          s.moveTo(-0.085 * k, 0); s.lineTo(0.085 * k, 0);
          s.bezierCurveTo(0.085 * k, -0.1 * k, 0.04 * k, -0.13 * k, 0, -0.13 * k);
          s.bezierCurveTo(-0.04 * k, -0.13 * k, -0.085 * k, -0.1 * k, -0.085 * k, 0);
          const at = onSkin(0, my - 0.035, faceParts);
          const og = new THREE.Group(); og.position.copy(at.p).addScaledVector(at.n, 0.004); og.lookAt(og.position.clone().add(at.n)); faceG.add(og);
          mesh(extrude(s, 0.012, 0.004, 3, 16), std(MO.inner, { roughness: 0.6 }), og, [0, 0, 0], null, '#7A3A3A');
          mesh(sphere(0.05 * k, 20, 14), std(MO.tongue, { roughness: 0.6 }), og, [0, -0.095 * k, 0.006], [1.1, 0.55, 0.3]);
        }
      }
    }
    const eyes = [];
    const EY = cfg.eyes;
    const eyeMat = std(EY.color, { roughness: 0.3 });
    const irisTex = EY.iris ? canvasTex(256, 256, (g) => {
      const rg = g.createRadialGradient(128, 128, 20, 128, 128, 128);
      rg.addColorStop(0, EY.iris); rg.addColorStop(0.72, EY.iris); rg.addColorStop(1, EY.color);
      g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
      g.fillStyle = EY.pupil; g.beginPath(); g.arc(128, 136, 128 * EY.pupilR, 0, Math.PI * 2); g.fill();
    }) : null;
    [-1, 1].forEach(sx => {
      const s = onSkin(EY.x * sx, hy + EY.y, [headMesh]);
      const eg = new THREE.Group(); eg.position.copy(s.p).addScaledVector(s.n, -0.004);
      eg.lookAt(eg.position.clone().add(s.n)); faceG.add(eg);
      const inner = new THREE.Group(); inner.rotation.z = -EY.tilt * sx; eg.add(inner);
      mesh(sphere(EY.r), eyeMat, inner, [0, 0, 0], [EY.sx, EY.sy, EY.sz]);
      if (irisTex) { const ir = mesh(new THREE.CircleGeometry(EY.r * 0.93, 40), texMat(irisTex, { roughness: 0.3 }), inner, [0, 0, EY.r * EY.sz + 0.002], [EY.sx, EY.sy, 1]); ir.castShadow = false; }
      if (EY.shine) {
        const s1 = mesh(sphere(0.038 * EY.r / 0.12 * EY.shine, 20, 14), M.shine, inner, [-0.03 * EY.r / 0.12, 0.05 * EY.r / 0.12, EY.r * EY.sz - 0.008]); s1.castShadow = false;
        const s2 = mesh(sphere(0.017 * EY.r / 0.12 * EY.shine, 12, 10), M.shine, inner, [0.035 * EY.r / 0.12, -0.04 * EY.r / 0.12, EY.r * EY.sz - 0.003]); s2.castShadow = false;
      }
      eyes.push(eg);
    });
    function paintBlush() {
      const BL = cfg.blush;
      [-1, 1].forEach(sx => {
        const s = onSkin(BL.x * sx, hy + BL.y, [headMesh]);
        if (!s.uv) return;
        const g = headTex.image.getContext('2d'), cx = s.uv.x * 1024, cy = (1 - s.uv.y) * 512;
        g.save(); g.translate(cx, cy); g.scale(1, 1.15);
        const rg = g.createRadialGradient(0, 0, 2, 0, 0, BL.r);
        const bc = BL.color[0] === '#' ? rgba(BL.color, 0.7) : BL.color;
        rg.addColorStop(0, bc); rg.addColorStop(1, bc.replace(/[\d.]+\)$/, '0)'));
        g.fillStyle = rg; g.beginPath(); g.arc(0, 0, BL.r, 0, Math.PI * 2); g.fill(); g.restore();
        headTex.needsUpdate = true;
      });
    }
    if (cfg.blush && !cfg.blush.after) paintBlush();
    if (cfg.brows) {
      const BR = Object.assign({ color: '#5A3A2A', x: 0.34, y: 0.14, len: 0.2, angle: 0.35, r: 0.02 }, cfg.brows);
      [-1, 1].forEach(sx => {
        const c = V(BR.x * sx, hy + BR.y, 0), dx = Math.cos(BR.angle) * BR.len / 2, dy = Math.sin(BR.angle) * BR.len / 2;
        const inner = onSkin(c.x - sx * dx, c.y - dy, [headMesh]).p, outer = onSkin(c.x + sx * dx, c.y + dy, [headMesh]).p;
        const mid = onSkin(c.x, c.y + 0.01, [headMesh]).p;
        mesh(tube([inner, mid, outer].map(v => v.add(V(0, 0, 0.01))), t => BR.r * (0.6 + 0.6 * Math.sin(Math.PI * t)), 16, 8), std(BR.color, { roughness: 0.7 }), faceG);
      });
    }
    if (cfg.whiskers) {
      const WH = Object.assign({ color: '#8C7B6E', n: 3, len: 0.5, r: 0.0055, y: -0.24, x: 0.2, spread: 0.07, droop: 0.04, curve: 0.05 }, cfg.whiskers);
      const wm = std(WH.color, { roughness: 0.8 });
      [-1, 1].forEach(sx => {
        for (let i = 0; i < WH.n; i++) {
          const y0 = hy + WH.y + (i - (WH.n - 1) / 2) * WH.spread * 0.4;
          const a = onSkin(WH.x * sx, y0, faceParts).p;
          const ang = (i - (WH.n - 1) / 2) * WH.spread * 1.6;
          const b = a.clone().add(V(sx * WH.len * 0.5, ang * 0.5 - WH.droop * 0.3, -0.05 + WH.curve));
          const c = a.clone().add(V(sx * WH.len, ang - WH.droop, -0.16));
          mesh(tube([a, b, c], t => WH.r * (1 - 0.7 * t), 16, 5), wm, faceG);
        }
      });
    }

    // ears
    const earsG = part('ears', head);
    const ears = [], earOuters = [];
    if (cfg.ears) {
      const eGeo = earGeo(cfg.ears.sharp);
      [-1, 1].forEach(sx => {
        const E = Object.assign({}, cfg.ears, cfg.ears[sx < 0 ? 'L' : 'R'] || {});
        const eg = new THREE.Group(); eg.position.set(E.x * sx, hy + E.y, E.z);
        eg.rotation.set(E.pitch, E.yaw * sx, -E.tilt * sx); earsG.add(eg);
        const ec = nz(sx < 0 ? E.colorL : E.colorR, nz(E.color, FUR));
        let em;
        if (E.tip) {
          const et = canvasTex(64, 256, (g, w, h) => {
            const lg = g.createLinearGradient(0, h, 0, 0);
            lg.addColorStop(0, ec); lg.addColorStop(E.tipStart, ec); lg.addColorStop(Math.min(1, E.tipStart + 0.2), E.tip); lg.addColorStop(1, E.tip);
            g.fillStyle = lg; g.fillRect(0, 0, w, h);
          });
          em = texMat(et);
        } else em = std(ec, { map: whiteTex });
        const [ex, ey, ez] = E.size;
        earOuters.push(mesh(eGeo, em, eg, null, [ex, ey, ez], F.ink));
        const isc = E.innerScale || 1, tsc = E.tuftScale || 1;
        if (E.inner) mesh(eGeo, std(E.inner, { roughness: 0.8 }), eg, [0, ey * 0.11, ez * 0.44], [ex * 0.61 * isc, ey * 0.72 * isc, ez * 0.5]);
        if (E.tuft !== false) mesh(eGeo, std(nz(E.tuft, CREAM), { roughness: 0.9 }), eg, [-0.015 * sx, ey * 0.135, ez * 0.55], [ex * 0.19 * tsc, ey * 0.46 * tsc, ez * 0.28]).rotation.z = 0.2 * sx;
        if (E.lynx) {
          const LX = Object.assign({ color: '#3B2A22', len: 0.32, r: 0.04 }, E.lynx);
          mesh(tube([[0, ey * 0.92, 0], [0.02 * sx, ey + LX.len * 0.5, 0], [0.06 * sx, ey + LX.len, -0.02]], t => LX.r * (1 - t * 0.92), 20, 8), std(LX.color, { roughness: 0.9 }), eg);
        }
        ears.push({ g: eg, base: -E.tilt * sx, sx });
      });
    }

    /* ======================= kit & custom build ======================= */
    const K = {
      THREE, V, C, UP, toV, rand, rgba, D, P, SHOT, reduced, cfg, def,
      scene, camera, renderer, character, body, robeG, poseG, beltG, tailG, headG, head, faceG, earsG, decor,
      HC, headMesh, muzzle, eyes, ears, bib, feet, hands, wrists, sleeveMeshes, robeMesh, tailMesh, furCollarMesh,
      beltTassel: tasselG, headTex,
      mesh, part, group, sphere, std, texMat, canvasTex, smoothNormals, extrude, roundBox, roundRectShape, shapeFrom,
      leafGeo, earGeo, lathe, curve3, tube, ribbon, dropGeo, sleeveGeo,
      puff, flame, drop, flower, snowflake, bolt, tassel, medal, tablet, scatter,
      robeR, robeV, robeUV, onRobe, robePanel, onSkin, zAt,
      M,
      addFur(target, o) { furQueue.push([target, Object.assign({ layers: 12, length: 0.06, gravity: 0.02, repeat: [4, 4] }, o || {})]); },
      onTick(fn) { ticks.push(fn); },
      outline(m, ink) { outlined.push([m, ink]); }
    };
    window.__NEKO = K;
    // neck: an optional fur-coloured capsule from inside the collar up into the head, so the head never
    // sits on the shoulders like a separate ball. Heights are measured after build (head scale, hats, yokes).
    function addNeck(o) {
      o = Object.assign({ r: 0.42, color: null, sz: 0.85, into: 0.3, below: 0.3 }, o === true ? {} : o);
      scene.updateMatrixWorld(true);
      const hb = new THREE.Box3().setFromObject(headMesh);
      let top = profPts[profPts.length - 1].y;
      const y0 = top - o.below, y1 = hb.min.y + o.into;
      if (y1 <= y0) return null;
      const pts = [];
      for (let i = 0; i <= 16; i++) { const t = i / 16, a = Math.PI * t; pts.push(new THREE.Vector2(Math.max(o.r * Math.sin(a) ** 0.35, 0.001), y0 + (y1 - y0) * (1 - Math.cos(a)) / 2)); }
      const g = smoothNormals(new THREE.LatheGeometry(pts, 48));
      g.scale(1, 1, o.sz);
      const n = mesh(g, std(nz(o.color, FUR), { map: whiteTex }), part(o.part || 'pose', body), [0, 0, o.z || 0], null, null);
      n.name = 'neck';
      return n;
    }
    K.addNeck = addNeck;
    if (def.build) def.build(K);
    if (cfg.neck) addNeck(cfg.neck);
    if (cfg.blush && cfg.blush.after) paintBlush();

    // parts registry (aux meshes such as outlines, fur shells and glow overlays are excluded)
    const partMeshes = {};
    character.traverse(o => {
      if (!o.isMesh || o.userData.aux) return;
      let p = o; while (p && !p.userData.part) p = p.parent;
      const name = p ? p.userData.part : null;
      o.userData.partName = name;
      if (name) (partMeshes[name] = partMeshes[name] || []).push(o);
    });
    if (robeMesh) partMeshes.hem = [robeMesh];
    const pickables = [];
    character.traverse(o => { if (o.isMesh && o.userData.partName) pickables.push(o); });

    // coloured ink outline: inverted hull pushed out along smoothed normals
    const inkCache = {};
    outlined.forEach(([m, ink]) => {
      const s = (Math.abs(m.scale.x) + Math.abs(m.scale.y) + Math.abs(m.scale.z)) / 3 || 1;
      const w = (0.011 / s).toFixed(5);
      const k2 = ink + w;
      if (!inkCache[k2]) {
        const mat = new THREE.MeshBasicMaterial({ color: C(ink), side: THREE.BackSide });
        mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * ' + w + ';'); };
        mat.customProgramCacheKey = () => 'ink' + w;
        inkCache[k2] = mat;
      }
      const g = m.geometry.userData.inkGeo || (m.geometry.userData.inkGeo = smoothNormals(m.geometry.clone()));
      const o = new THREE.Mesh(g, inkCache[k2]);
      o.raycast = () => {}; o.userData.aux = true;
      m.add(o);
    });

    /* ---------- fur: stacked shells, each keeping only the strands that reach that height ---------- */
    const strandTex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighten';
      for (let i = 0; i < 7000; i++) {
        const x = rand() * w, y = rand() * h, r = 3 + rand() * 3, v = 0.7 + rand() * 0.3;
        for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) {
          if (x + ox < -r || x + ox > w + r || y + oy < -r || y + oy > h + r) continue;
          const rg = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          rg.addColorStop(0, 'rgba(255,255,255,' + v + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = rg; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    }, false);
    strandTex.generateMipmaps = false; strandTex.minFilter = THREE.LinearFilter;
    strandTex.wrapS = strandTex.wrapT = THREE.RepeatWrapping;
    const lite = !SHOT && (window.innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4);
    const furShells = [];
    function addFur(target, { layers, length, gravity, repeat }) {
      const geo = target.geometry;
      if (!geo.attributes.furLen) geo.setAttribute('furLen', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count).fill(1), 1));
      const n = lite ? Math.ceil(layers * 0.6) : layers;
      for (let i = 1; i <= n; i++) {
        const L = i / n;
        const mat = target.material.clone();
        if (!mat.map) mat.map = whiteTex;
        mat.onBeforeCompile = sh => {
          Object.assign(sh.uniforms, { uLayer: { value: L }, uLen: { value: length }, uGrav: { value: gravity }, uNoise: { value: strandTex }, uRep: { value: new THREE.Vector2(repeat[0], repeat[1]) } });
          sh.vertexShader = 'attribute float furLen;\nuniform float uLayer;\nuniform float uLen;\nuniform float uGrav;\nvarying float vFur;\n' +
            sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normal * (uLayer * uLen * furLen);\n  transformed.y -= uGrav * uLayer * uLayer * furLen;\n  vFur = furLen;');
          sh.fragmentShader = 'uniform float uLayer;\nuniform sampler2D uNoise;\nuniform vec2 uRep;\nvarying float vFur;\n' +
            sh.fragmentShader.replace('#include <alphatest_fragment>', 'float strand = texture2D(uNoise, vUv * uRep).r;\n  if (vFur < 0.05 || strand < mix(0.12, 0.85, pow(uLayer, 0.8))) discard;\n  diffuseColor.rgb *= mix(0.78, 1.05, uLayer);\n  #include <alphatest_fragment>');
        };
        mat.customProgramCacheKey = () => 'fur';
        const shell = new THREE.Mesh(geo, mat);
        shell.raycast = () => {}; shell.castShadow = false; shell.receiveShadow = true; shell.userData.aux = true;
        target.add(shell); furShells.push(shell);
      }
    }
    const furOn = Q.get('fur') !== '0';
    if (HD.fur) addFur(headMesh, HD.fur);
    if (cfg.ears && cfg.ears.fur) earOuters.forEach(e => addFur(e, cfg.ears.fur));
    furQueue.forEach(([m, o]) => addFur(m, o));
    if (!furOn) furShells.forEach(m => { m.visible = false; });

    /* ============================ parts & UI ============================ */
    const PARTS = def.parts || { overview: { chip: '全貌', tag: '設計主題', name: meta.title || '', text: '' } };
    const order = def.order || Object.keys(PARTS);
    const chipsEl = $('chips'), chipEls = {};
    order.forEach(k => {
      if (!PARTS[k]) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = PARTS[k].chip || k;
      b.setAttribute('aria-pressed', k === 'overview' ? 'true' : 'false');
      b.addEventListener('click', () => focusPart(k));
      chipsEl.appendChild(b); chipEls[k] = b;
    });
    const paletteEl = $('palette'), specEl = $('spec');
    (def.palette || []).forEach(([hex, name]) => {
      const d = document.createElement('div'); d.className = 'sw';
      const i = document.createElement('i'); i.style.background = hex; d.appendChild(i); d.appendChild(document.createTextNode(name)); paletteEl.appendChild(d);
    });
    (def.spec || []).forEach(([k, v]) => {
      const s = document.createElement('span'); s.appendChild(document.createTextNode(k + ' '));
      const b = document.createElement('b'); b.textContent = v; s.appendChild(b); specEl.appendChild(s);
    });
    function showInfo(k) {
      const p = PARTS[k] || {};
      $('infoTag').textContent = p.tag || ''; $('infoName').textContent = p.name || ''; $('infoText').textContent = p.text || '';
      paletteEl.hidden = k !== 'overview' || !paletteEl.children.length; specEl.hidden = k !== 'overview' || !specEl.children.length;
      order.forEach(o => chipEls[o] && chipEls[o].setAttribute('aria-pressed', o === k ? 'true' : 'false'));
    }
    showInfo(order[0] || 'overview');

    const spinBtn = $('spin');
    function setSpin(on) { controls.autoRotate = on; spinBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    setSpin(!reduced);
    spinBtn.addEventListener('click', () => setSpin(!controls.autoRotate));

    let fit = 1, tween = null, glow = null, actStart = -1;
    const boxOf = (objs) => { const b = new THREE.Box3(); objs.forEach(o => b.expandByObject(o)); return b; };
    function camFor(k) {
      const p = PARTS[k] || {};
      if (p.cam && p.target) { const t = toV(p.target); return { pos: toV(p.cam).sub(t).multiplyScalar(fit).add(t), target: t }; }
      const objs = k === 'overview' || !partMeshes[k] ? [character] : partMeshes[k];
      character.updateMatrixWorld(true);
      const b = boxOf(objs), c = b.getCenter(V()), s = b.getSize(V());
      const dir = toV(p.dir || (k === 'overview' ? [0.19, 0.08, 1] : [0.35, 0.22, 1])).normalize();
      const r = k === 'overview' ? s.y * 0.5 : Math.max(s.length() * 0.5, 0.35);
      const dist = (r / Math.tan(camera.fov * Math.PI / 360)) * (k === 'overview' ? 1.5 : 1.25) + (k === 'overview' ? 0 : 0.6);
      const t = p.target ? toV(p.target) : c;
      return { pos: t.clone().addScaledVector(dir, dist * fit), target: t };
    }
    function flyTo(k) {
      const c = camFor(k);
      tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: c.pos, t1: c.target, s: performance.now(), d: reduced ? 1 : 900 };
    }
    function focusPart(k) {
      showInfo(k); flyTo(k);
      if (k !== 'overview') { setSpin(false); glowPart(partMeshes[k] || []); }
    }
    // glow: temporary additive overlays, so shared materials never need cloning
    const glowMat = new THREE.MeshBasicMaterial({ color: C(TH.glowColor || '#C6E29A'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    function glowPart(meshes) {
      if (glow) glow.overlays.forEach(o => o.parent && o.parent.remove(o));
      const overlays = meshes.map(m => { const o = new THREE.Mesh(m.geometry, glowMat); o.userData.aux = true; o.raycast = () => {}; m.add(o); return o; });
      glow = { overlays, s: performance.now() };
    }
    $('reset').addEventListener('click', () => focusPart('overview'));
    const furBtn = $('furBtn');
    if (!furShells.length) furBtn.hidden = true;
    furBtn.setAttribute('aria-pressed', furOn ? 'true' : 'false');
    furBtn.addEventListener('click', () => {
      const on = furBtn.getAttribute('aria-pressed') !== 'true';
      furBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      furShells.forEach(m => { m.visible = on; });
    });
    const decorBtn = $('decorBtn');
    if (decor.children.length) {
      decorBtn.hidden = false;
      decorBtn.addEventListener('click', () => {
        const on = decorBtn.getAttribute('aria-pressed') !== 'true';
        decorBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); decor.visible = on;
      });
    }
    $('act').addEventListener('click', () => { actStart = clock.elapsedTime; });
    controls.addEventListener('start', () => { tween = null; if (controls.autoRotate) setSpin(false); });

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let downAt = null;
    function hit(e) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(pickables, false)[0];
      if (!h) return null;
      let name = h.object.userData.partName;
      if (name === 'robe' && h.object.userData.isRobe && h.point.y < RB.hemY && PARTS.hem) name = 'hem';
      return PARTS[name] ? name : null;
    }
    renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = null;
      if (moved > 6) return;
      if (EMBED) { if (hit(e)) embedPoke(); return; }
      const k = hit(e); if (k) focusPart(k);
    });
    let hoverFrame = 0;
    renderer.domElement.addEventListener('pointermove', e => {
      if (e.buttons || ++hoverFrame % 3) return;
      renderer.domElement.style.cursor = hit(e) ? 'pointer' : 'grab';
    });

    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      fit = Math.max(1, Math.pow(0.8 / camera.aspect, 0.8));
    }

    /* ============================ animation ============================ */
    const clock = new THREE.Clock();
    let nextBlink = 1.5;
    const ease = q => q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
    const flickers = []; scene.traverse(o => { if (o.userData.flicker) flickers.push(o); });
    const act = def.action || {};
    function pose(t, k) {
      body.scale.y = 1 + 0.012 * Math.sin(t * 2) * k;
      headG.position.y = HD.neck + (HD.lift || 0) + 0.018 * Math.sin(t * 2) * k;
      headG.rotation.z = (HD.roll || 0) + 0.04 * Math.sin(t * 0.9) * k;
      tailG.rotation.y = 0.14 * Math.sin(t * 1.3) * k;
      tailG.rotation.z = 0.06 * Math.sin(t * 1.3 + 1) * k;
      if (tasselG) tasselG.rotation.z = 0.09 * Math.sin(t * 1.7) * k;
      ears.forEach(({ g, base, sx }, i) => {
        const tw = Math.pow(Math.max(0, Math.sin(t * 0.55 + i * 2.1)), 40);
        g.rotation.z = base - sx * 0.16 * tw * k;
      });
      flickers.forEach((f, i) => {
        if (f.userData.s0 === undefined) f.userData.s0 = f.scale.x;
        const s = 1 + 0.08 * Math.sin(t * 9 + i * 1.7) * k, s0 = f.userData.s0;
        f.scale.set(s0 * (2 - s), s0 * s, s0 * (2 - s));
      });
      ticks.forEach(fn => fn(t, k, K));
    }
    function frame() {
      const t = clock.getElapsedTime();
      const k = reduced ? 0.25 : 1;
      pose(t, k);
      if (EMBED) applyMove(t, k);
      let blink = 1;
      if (t > nextBlink) {
        const p = (t - nextBlink) / 0.16;
        if (p >= 1) nextBlink = t + 2.4 + Math.random() * 2.6;
        else blink = 1 - 0.9 * Math.sin(Math.PI * p);
      }
      eyes.forEach(e => { e.scale.y = blink; });
      if (actStart >= 0) {
        const dur = act.dur || 1.9, p = (t - actStart) / dur;
        const s = p >= 1 ? 0 : Math.pow(Math.sin(Math.PI * Math.min(p, 1)), 1.4);
        if (act.run) act.run(s, p, K);
        else { character.rotation.x = 0.2 * s; headG.rotation.x = 0.22 * s; }
        if (p >= 1) actStart = -1;
      }
      if (tween) {
        const q = Math.min((performance.now() - tween.s) / tween.d, 1), e = ease(q);
        camera.position.lerpVectors(tween.p0, tween.p1, e);
        controls.target.lerpVectors(tween.t0, tween.t1, e);
        if (q >= 1) tween = null;
      }
      if (glow) {
        const q = (performance.now() - glow.s) / 1500;
        if (q >= 1) { glow.overlays.forEach(o => o.parent && o.parent.remove(o)); glow = null; }
        else glowMat.opacity = 0.45 * Math.sin(Math.PI * q) * (0.65 + 0.35 * Math.cos(q * Math.PI * 6));
      }
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }

    /* ============================ embed mode ============================ */
    // Whole-body moves the host can trigger (names follow the AR page's actor vocabulary).
    const MOVES = {
      present: null,
      nod: { dur: 1.2 }, happy: { dur: 1.3 }, jump: { dur: 0.95 }, spin: { dur: 1.3 },
      dance: { dur: 2.2 }, point: { dur: 1.4 }, think: { hold: true }, sleep: { hold: true },
      wave: { own: true }, bow: { own: true }
    };
    let move = null, talking = false, fitState = { visible: 1, offset: 0 }, fitBase = null, fitNeed = 0;
    function setMove(name) {
      if (!(name in MOVES)) name = 'happy';
      const spec = MOVES[name];
      if (!spec) { move = null; return; }
      if (spec.own) { move = null; actStart = clock.elapsedTime; return; }
      move = { name, spec, t0: clock.elapsedTime };
    }
    function applyMove(t, k) {
      // pose() rewrites headG.rotation.z every frame but never headG.rotation.x, so the moves below
      // must start from a reset pitch — adding onto last frame's value spins the head off the neck.
      character.position.y = 0; character.rotation.y = 0; character.rotation.z = 0; headG.rotation.x = 0;
      if (talking) {               // talking overlay: small head bobs and a light bounce
        headG.rotation.x += 0.05 * Math.max(0, Math.sin(t * 9));
        headG.rotation.z += 0.03 * Math.sin(t * 4.5);
        character.position.y += 0.02 * Math.abs(Math.sin(t * 4.5));
      }
      if (!move) return;
      const hold = !!move.spec.hold;
      const p = hold ? 1 : (t - move.t0) / move.spec.dur;
      if (!hold && p >= 1) { move = null; return; }
      const env = hold ? Math.min(1, (t - move.t0) / 0.4) : Math.sin(Math.PI * p);
      switch (move.name) {
        case 'nod': headG.rotation.x += 0.2 * Math.max(0, Math.sin(p * Math.PI * 4)); break;
        case 'happy': character.position.y += 0.18 * Math.abs(Math.sin(p * Math.PI * 2)); headG.rotation.z += 0.08 * Math.sin(p * Math.PI * 4); break;
        case 'jump': character.position.y += 0.45 * Math.sin(Math.PI * p); break;
        case 'spin': character.rotation.y = Math.PI * 2 * (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2); break;
        case 'dance':
          character.rotation.z = 0.12 * Math.sin(p * Math.PI * 6) * env;
          character.rotation.y = 0.35 * Math.sin(p * Math.PI * 3) * env;
          character.position.y += 0.06 * Math.abs(Math.sin(p * Math.PI * 6)); break;
        case 'point': character.rotation.y = -0.35 * env; headG.rotation.x += 0.1 * env; break;
        case 'think': headG.rotation.z += 0.16 * env; headG.rotation.x -= 0.06 * env; break;
        case 'sleep': headG.rotation.x += 0.22 * env; headG.rotation.z += 0.1 * env; break;
      }
    }
    function post(msg) { try { if (window.parent !== window) window.parent.postMessage(msg, location.origin); } catch (e) { /* ignore */ } }
    function embedPoke() {
      const ns = ['wave', 'nod', 'jump', 'spin', 'dance', 'happy'];
      setMove(ns[Math.floor(Math.random() * ns.length)]);
      post({ type: 'neko:poke' });
    }
    // Frame the rest-pose body inside the visible band [offset, offset + visible] of the canvas height.
    // The band is the camera's virtual full image (setViewOffset), so orbit and zoom keep working.
    function embedFit(keepZoom) {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      const vis = Math.max(0.28, Math.min(1, fitState.visible)), off = Math.max(0, Math.min(1 - vis, fitState.offset));
      const bandH = h * vis;
      camera.aspect = w / bandH;
      camera.setViewOffset(w, bandH, 0, -off * h, w, h);
      camera.updateProjectionMatrix();
      if (!fitBase) {
        const ry = character.rotation.y, py = character.position.y;
        character.rotation.y = 0; character.position.y = 0; scene.updateMatrixWorld(true);
        const b = boxOf([character]);
        character.rotation.y = ry; character.position.y = py;
        let R = 0;
        [b.min.x, b.max.x].forEach(x => [b.min.z, b.max.z].forEach(z => { R = Math.max(R, Math.hypot(x, z)); }));
        fitBase = { center: b.getCenter(V()), halfH: (b.max.y - b.min.y) / 2, R };
      }
      const tanV = Math.tan(camera.fov * Math.PI / 360), tanH = tanV * camera.aspect;
      const need = Math.max(fitBase.halfH * 1.04 / tanV, fitBase.R * 0.92 / tanH) + fitBase.R * 0.35;
      const dir = camera.position.clone().sub(controls.target);
      if (dir.lengthSq() < 1e-6) dir.set(0.19, 0.08, 1);
      const zoom = keepZoom && fitNeed ? dir.length() / fitNeed : 1;
      fitNeed = need;
      controls.target.copy(fitBase.center);
      camera.position.copy(fitBase.center).addScaledVector(dir.normalize(), need * zoom);
      controls.minDistance = need * 0.45; controls.maxDistance = need * 2.2;
      controls.update();
    }
    function embedBoot() {
      controls.enablePan = false;
      tween = null;
      embedFit(false);
      window.addEventListener('message', e => {
        if (e.origin !== location.origin || e.source !== window.parent) return;
        const d = e.data || {};
        if (d.type === 'neko:action') setMove(String(d.name || 'present'));
        else if (d.type === 'neko:overlay') talking = d.name === 'talk';
        else if (d.type === 'neko:fit') { fitState = { visible: Number(d.visible) || 1, offset: Number(d.offset) || 0 }; embedFit(true); }
        else if (d.type === 'neko:spin') setSpin(!!d.on);
      });
      requestAnimationFrame(() => requestAnimationFrame(() => post({ type: 'neko:ready', id: meta.id || '', title: meta.title || '' })));
    }

    /* ============================ shot mode ============================ */
    // ?shot=sheet renders front / three-quarter / side / back side by side (orthographic, rest pose)
    // ?shot=front|q34|side|back|decor renders one view; &fur=0 hides shell fur.
    function shot() {
      ground.visible = false; blob.visible = false;
      decor.visible = SHOT === 'decor';
      pose(Number(Q.get('t') || 0), 0);
      scene.updateMatrixWorld(true);
      const b = boxOf([character]), c = b.getCenter(V()), s = b.getSize(V());
      let R = 0;
      [b.min.x, b.max.x].forEach(x => [b.min.z, b.max.z].forEach(z => { R = Math.max(R, Math.hypot(x, z)); }));
      // ?shot=ring&el=20 → eight azimuths in one row (connectivity checks from all around, above or below)
      const views = SHOT === 'sheet' ? ['front', 'q34', 'side', 'back'] : SHOT === 'ring' ? [0, 45, 90, 135, 180, 225, 270, 315] : [SHOT === 'decor' ? 'front' : SHOT];
      const W = window.innerWidth, H = window.innerHeight, pw = Math.floor(W / views.length), aspect = pw / H;
      renderer.setSize(W, H, true);   // CSS size = buffer size, so a later viewport change can never stretch it
      renderer.domElement.style.position = 'absolute'; renderer.domElement.style.left = '0'; renderer.domElement.style.top = '0';
      const single = views.length === 1;
      const halfW = (single && views[0] === 'front' ? Math.max(Math.abs(b.min.x), Math.abs(b.max.x)) : R) * 1.05;
      let hh = Math.max(s.y / 2 * 1.05, halfW / aspect);
      if (Q.get('el')) hh *= 1 + Math.abs(Math.sin(Number(Q.get('el')) * Math.PI / 180)) * 0.5;
      if (SHOT === 'decor') { const bd = boxOf([character, decor]); hh = Math.max(bd.getSize(V()).y / 2 * 1.05, Math.max(Math.abs(bd.min.x), Math.abs(bd.max.x)) * 1.05 / aspect); c.copy(bd.getCenter(V())); c.x = 0; }
      const cam = new THREE.OrthographicCamera(-hh * aspect, hh * aspect, hh, -hh, 0.1, 100);
      const AZ = { front: 0, q34: 35, side: 90, back: 180, left: -90, q34l: -35 };
      renderer.setScissorTest(true);
      renderer.setClearColor(0xffffff, BG0 ? 0 : 1);
      views.forEach((v, i) => {
        const az = (typeof v === 'number' ? v : (AZ[v] || 0)) * Math.PI / 180, el = Number(Q.get('el') || 4) * Math.PI / 180;
        cam.position.set(Math.sin(az) * 30 * Math.cos(el), c.y + 30 * Math.sin(el), Math.cos(az) * 30 * Math.cos(el));
        cam.lookAt(0, c.y, 0); cam.updateMatrixWorld(true);
        renderer.setViewport(i * pw, 0, pw, H); renderer.setScissor(i * pw, 0, pw, H);
        renderer.clear(); renderer.render(scene, cam);
      });
      renderer.setScissorTest(false);
      window.__SHOT_DONE = true;
    }

    /* ?shot=check — geometric connectivity report (floating heads / paws / feet / props).
       Surfaces are sampled into a voxel grid; meshes whose voxels touch (26-neighbourhood) are unioned.
       Every component except the largest is reported into body[data-check] as JSON. */
    function connectivity(vs) {
      pose(0, 0); scene.updateMatrixWorld(true);
      const visibleChain = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
      const partOf = o => { for (let p = o; p; p = p.parent) if (p.userData.part) return p.userData.part; return '?'; };
      const skip = new Set((Q.get('exclude') || '').split(',').filter(Boolean));   // e.g. held props, so paws must reach the arms themselves
      const meshes = [];
      character.traverse(o => { if (o.isMesh && !o.userData.aux && visibleChain(o) && o.geometry && o.geometry.attributes.position && !skip.has(partOf(o))) meshes.push(o); });
      const box = boxOf([character]); box.expandByScalar(vs * 2);
      const nx = Math.ceil((box.max.x - box.min.x) / vs) + 1, ny = Math.ceil((box.max.y - box.min.y) / vs) + 1, nz = Math.ceil((box.max.z - box.min.z) / vs) + 1;
      const grid = new Int32Array(nx * ny * nz).fill(-1);
      const parent = meshes.map((_, i) => i);
      const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
      const count = new Int32Array(meshes.length);
      const a = V(), b = V(), c = V();
      const mark = (x, y, z, mi) => {
        const ix = Math.floor((x - box.min.x) / vs), iy = Math.floor((y - box.min.y) / vs), iz = Math.floor((z - box.min.z) / vs);
        if (ix < 0 || iy < 0 || iz < 0 || ix >= nx || iy >= ny || iz >= nz) return;
        const k = (iz * ny + iy) * nx + ix, cur = grid[k];
        if (cur === -1) { grid[k] = mi; count[mi]++; } else if (cur !== mi) union(cur, mi);
      };
      meshes.forEach((m, mi) => {
        const pos = m.geometry.attributes.position, idx = m.geometry.index, mw = m.matrixWorld;
        const tri = idx ? idx.count / 3 : pos.count / 3;
        for (let t = 0; t < tri; t++) {
          const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
          a.fromBufferAttribute(pos, i0).applyMatrix4(mw); b.fromBufferAttribute(pos, i1).applyMatrix4(mw); c.fromBufferAttribute(pos, i2).applyMatrix4(mw);
          const n = Math.min(60, Math.ceil(Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) / (vs * 0.7)));
          for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
            const u = n ? i / n : 0, w = n ? j / n : 0, q = 1 - u - w;
            mark(a.x * q + b.x * u + c.x * w, a.y * q + b.y * u + c.y * w, a.z * q + b.z * u + c.z * w, mi);
          }
        }
      });
      const nb = [];
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dz > 0 || (dz === 0 && (dy > 0 || (dy === 0 && dx > 0)))) nb.push([dx, dy, dz]);
      for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
        const mi = grid[(z * ny + y) * nx + x]; if (mi < 0) continue;
        for (const [dx, dy, dz] of nb) {
          const X = x + dx, Y = y + dy, Z = z + dz;
          if (X < 0 || Y < 0 || Z < 0 || X >= nx || Y >= ny || Z >= nz) continue;
          const o = grid[(Z * ny + Y) * nx + X]; if (o >= 0 && o !== mi) union(o, mi);
        }
      }
      const comps = {};
      meshes.forEach((m, i) => { const r = find(i); (comps[r] = comps[r] || { vox: 0, meshes: [] }).vox += count[i]; comps[r].meshes.push(i); });
      const list = Object.values(comps).sort((p, q) => q.vox - p.vox);
      const r3 = v => [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)];
      return {
        voxel: vs, meshes: meshes.length, components: list.length, mainVox: list[0] ? list[0].vox : 0,
        floating: list.slice(1).map(cp => {
          const bb = boxOf(cp.meshes.map(i => meshes[i]));
          const parts = {}; cp.meshes.forEach(i => { const k = partOf(meshes[i]) + ':' + meshes[i].geometry.type.replace('Geometry', '') + (meshes[i].name ? '(' + meshes[i].name + ')' : ''); parts[k] = (parts[k] || 0) + 1; });
          return { vox: cp.vox, n: cp.meshes.length, center: r3(bb.getCenter(V())), size: r3(bb.getSize(V())), parts };
        })
      };
    }

    statusEl.hidden = true;
    if (SHOT === 'check') {
      try { document.body.dataset.check = JSON.stringify(connectivity(Number(Q.get('vs') || 0.03))); }
      catch (e) { document.body.dataset.check = JSON.stringify({ error: String(e && e.stack || e) }); }
      return;
    }
    if (SHOT) {
      const safeShot = () => { try { shot(); } catch (e) { console.error(e); window.__NEKO_ERROR = String(e && e.stack || e); statusEl.hidden = false; statusEl.textContent = '截圖失敗：' + e.message; } };
      requestAnimationFrame(() => { safeShot(); requestAnimationFrame(safeShot); });
      // headless Chrome grows the viewport to --window-size only just before capturing: re-render at the final size
      window.addEventListener('resize', () => requestAnimationFrame(safeShot));
      return;
    }
    resize();
    const start = camFor('overview');
    camera.position.copy(start.pos); controls.target.copy(start.target); controls.update();
    new ResizeObserver(() => { resize(); if (EMBED) embedFit(true); }).observe(stage);
    if (EMBED) embedBoot();
    frame();

    // ?selftest=1 — click through every part chip, the action and the toggles, then report into the DOM
    if (Q.get('selftest')) {
      const steps = order.filter(k => PARTS[k]);
      let i = 0;
      const fail = e => { window.__NEKO_ERROR = String(e && e.stack || e); document.body.dataset.selftest = 'error'; };
      const step = () => {
        try {
          if (i < steps.length) { focusPart(steps[i++]); setTimeout(step, 250); return; }
          $('act').click(); furBtn.click(); furBtn.click();
          if (!decorBtn.hidden) { decorBtn.click(); decorBtn.click(); }
          setTimeout(() => { document.body.dataset.selftest = window.__NEKO_ERROR ? 'error' : 'ok'; document.body.dataset.parts = steps.join(','); }, 2200);
        } catch (e) { fail(e); }
      };
      setTimeout(step, 400);
    }
  }
})();
