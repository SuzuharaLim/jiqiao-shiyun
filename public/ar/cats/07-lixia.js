// @file 07_立夏_挪威森林貓
// @title 立夏・美髯關公 | 二十四節氣貓
(function () {
  // The renderer's lights brighten front-facing surfaces by roughly 1.45x (linear). M() turns a colour
  // SAMPLED from refs/07.png into the material colour that renders back to about that value.
  function M(hex, f) {
    f = f || 1.45; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f, 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  // picture px (502 × 502) → world units: feet at y_px 472, body axis at x_px 243, 125 px per unit
  const X = xp => (xp - 243) / 125, Y = yp => (472 - yp) / 125;
  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---- colours sampled from refs/07.png (then compensated) ----
  const FUR = M('#F7935C'), FUR_TOP = M('#F48A52'), FUR_LOW = M('#F99D66');
  const CREAM = M('#FEF4E6', 1.08), CREAM_INK = '#D9AE88', INK = '#D07442';
  const GREY = M('#B9956F'), EAR_IN = M('#FCC3A3', 1.25);
  const HAT = M('#7E8D5D'), HAT_INK = '#56633E';
  const GOLD = M('#FCCE80', 1.3), GOLD_DK = M('#E8B45F'), GOLD_INK = '#B4843A';
  const RED = M('#F37F4B'), RED_INK = '#B7552E';
  const COAT = M('#9EA96D'), COAT_INK = '#6A7848';
  const IVORY = M('#FDE3B8', 1.2), SLEEVE = M('#FADDB2', 1.2);
  const SUNY = M('#FCD080', 1.3), LEAFG = M('#8FA766'), LEAF_LT = M('#B6C58A', 1.3), LEAF_DK = M('#7C9559');
  const BEARD = M('#AA845C'), BEARD_LT = M('#CBA880', 1.3), BEARD_INK = '#6A4E35';
  const BELT = M('#76623E'), POLE = M('#94693F'), POLE_INK = '#654528';
  const BOOT = M('#827240'), BOOT_INK = '#5E5030';
  const BLADE = M('#D8D5C3', 1.3), BLADE_EDGE = M('#FBF4E8', 1.12), SWIRL = M('#8AA676'), SWIRL_LT = M('#B9CB9E', 1.25);
  const TAIL = M('#FDE9D0', 1.15), TAIL_TAN = M('#EBB686', 1.32), TAIL_INK = '#CF9A68';
  const JADE = M('#C4CE98', 1.2);

  // ---------- small canvas motifs (drawn around 0,0 at size s) ----------
  function sunM(g, s, col) {
    g.save(); g.fillStyle = col;
    g.beginPath(); g.arc(0, 0, s * 0.42, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 8; i++) {
      g.save(); g.rotate(i / 8 * Math.PI * 2);
      g.beginPath(); g.moveTo(-s * 0.1, -s * 0.58); g.quadraticCurveTo(0, -s * 1.05, s * 0.1, -s * 0.58); g.closePath(); g.fill();
      g.restore();
    }
    g.restore();
  }
  function wheatM(g, s, col, stem) {
    g.save(); g.strokeStyle = stem || col; g.fillStyle = col; g.lineCap = 'round'; g.lineWidth = s * 0.05;
    g.beginPath(); g.moveTo(0, s * 0.5); g.quadraticCurveTo(s * 0.04, 0, 0, -s * 0.5); g.stroke();
    for (let i = 0; i < 5; i++) {
      const y = s * (0.18 - i * 0.14);
      [-1, 1].forEach(k => { g.beginPath(); g.ellipse(k * s * 0.08, y, s * 0.065, s * 0.12, k * 0.45, 0, Math.PI * 2); g.fill(); });
    }
    g.beginPath(); g.ellipse(0, -s * 0.52, s * 0.055, s * 0.11, 0, 0, Math.PI * 2); g.fill();
    // two long leaves at the foot of the stem
    [-1, 1].forEach(k => {
      g.save(); g.translate(0, s * 0.35); g.rotate(k * 0.9); g.fillStyle = stem || col;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.08, -s * 0.18, 0, -s * 0.34); g.quadraticCurveTo(-s * 0.08, -s * 0.18, 0, 0); g.fill(); g.restore();
    });
    g.restore();
  }
  function sprigM(g, s, col) {
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round'; g.lineWidth = s * 0.05;
    g.beginPath(); g.moveTo(0, s * 0.5); g.quadraticCurveTo(s * 0.05, 0, -s * 0.02, -s * 0.45); g.stroke();
    [[0.25, 1], [0.2, -1], [-0.02, 1], [-0.06, -1], [-0.26, 1], [-0.3, -1]].forEach(([y, k]) => {
      g.save(); g.translate(0, s * y); g.rotate(k * 0.85);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.11, -s * 0.13, 0, -s * 0.27); g.quadraticCurveTo(-s * 0.11, -s * 0.13, 0, 0); g.fill();
      g.restore();
    });
    g.beginPath(); g.moveTo(-s * 0.02, -s * 0.44); g.quadraticCurveTo(s * 0.1, -s * 0.56, -s * 0.02, -s * 0.7); g.quadraticCurveTo(-s * 0.12, -s * 0.56, -s * 0.02, -s * 0.44); g.fill();
    g.restore();
  }
  function cloudM(g, s, fill, line) {
    g.save(); g.fillStyle = fill;
    [[-0.45, 0.05, 0.3], [0, -0.12, 0.42], [0.45, 0.02, 0.32], [0.2, 0.18, 0.26], [-0.2, 0.18, 0.26]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x * s, y * s, r * s, 0, Math.PI * 2); g.fill(); });
    g.strokeStyle = line; g.lineWidth = s * 0.07; g.lineCap = 'round';
    g.beginPath(); g.arc(-s * 0.05, -s * 0.05, s * 0.16, Math.PI * 0.2, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(s * 0.02, -s * 0.07, s * 0.07, Math.PI * 1.0, Math.PI * 2.6); g.stroke();
    g.restore();
  }
  function lotusLeafM(g, s, col, vein) {
    g.save(); g.fillStyle = col; g.strokeStyle = vein; g.lineCap = 'round';
    g.beginPath(); g.ellipse(0, 0, s * 0.55, s * 0.38, 0, -Math.PI / 2 + 0.25, Math.PI * 1.5 - 0.25); g.lineTo(0, 0); g.closePath(); g.fill();
    g.lineWidth = s * 0.035;
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + 0.55 + i / 6 * (Math.PI * 2 - 1.1); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.3); g.stroke(); }
    g.lineWidth = s * 0.06; g.strokeStyle = col;
    g.beginPath(); g.moveTo(0, s * 0.2); g.quadraticCurveTo(s * 0.04, s * 0.5, 0, s * 0.72); g.stroke();
    g.restore();
  }
  function vineM(g, s, col, leaf) {
    g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = s * 0.06;
    g.beginPath();
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2.4, r = s * (0.08 + 0.2 * i / 40); const x = Math.cos(a + 2) * r, y = Math.sin(a + 2) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.quadraticCurveTo(s * 0.4, -s * 0.1, s * 0.62, -s * 0.5); g.stroke();
    [[0.34, -0.12, -0.6], [0.5, -0.32, 0.5], [0.58, -0.5, -0.2], [0.12, 0.28, 1.9]].forEach(([x, y, a]) => {
      g.save(); g.translate(x * s, y * s); g.rotate(a); g.fillStyle = leaf;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.1, -s * 0.12, 0, -s * 0.24); g.quadraticCurveTo(-s * 0.1, -s * 0.12, 0, 0); g.fill(); g.restore();
    });
    g.restore();
  }

  let beardG = null, pawR = null, pawR0 = null, glaiveG = null, forearmR = null; const creasesR = [];

  NEKO.run({
    meta: {
      id: '07', term: '立夏', title: '立夏・美髯關公', seal: '夏',
      eyebrow: '二〇二七節氣貓 · 07 立夏 · 挪威森林貓',
      aria: '戴綠色頭巾帽、帽頂紅絨球並飄著紅帶，身穿綠色對襟外袍、紅色內裙與米白大袖，畫面左手握著青龍偃月刀、右手在胸前撫著長鬍鬚的橘紅長毛挪威森林貓 3D 模型'
    },
    theme: { accent: '#5E6E3E', accentDark: '#C3CF98', glow: 'rgba(158,169,109,0.32)', glowColor: '#D2DE9E' },
    palette: [['#F7935C', '橘紅長毛'], ['#9EA96D', '關公綠'], ['#F37F4B', '朱紅'], ['#FCCE80', '暖金']],
    spec: [['品種', '挪威森林貓'], ['角色', '關公（美髯公）'], ['頭身比', '約 1 : 1.4']],
    seed: 707,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR, low: FUR_LOW, deep: M('#E27A45'), cream: CREAM,
        ink: INK, creamInk: CREAM_INK, pattern: 'none',
        noise: { colors: [M('#FFD2B0'), M('#E47E48')], alpha: 0.07, n: 900 },
        paintBase(g, P) {
          const L = (lo, la) => P.xy(lo, la);
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.5, FUR); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // grey-brown long fur on the upper sides of the head (above the cheek ruff)
          g.filter = 'blur(12px)';
          [-1, 1].forEach(s => {
            // a grey-brown band from the ear bases down the sides of the head to the cheek ruff (lon > 56°)
            g.fillStyle = NEKO.rgba(GREY, 0.92); g.beginPath();
            [[46, 52], [41, 30], [42, 10], [50, -4], [120, -14], [150, 10], [150, 50], [100, 58]].forEach(([lo, la], i) => { const [x, y] = L(s * lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
            g.closePath(); g.fill();
            const [x, y] = L(s * 80, 14); P.blob(g, x, y, 70, 78, GREY, 0.85);
          });
          // pale cream lower face: under the eyes, the snout, the cheeks and the chin ruff
          const half = [[0, -19], [8, -21], [16, -22], [24, -20], [32, -16], [42, -10], [52, -6], [64, -4], [78, -7], [92, -15], [110, -28], [130, -42], [155, -52], [180, -55]];
          const poly = half.concat(half.slice().reverse().map(([lo, la]) => [-lo, la]));
          g.filter = 'blur(6px)'; g.fillStyle = CREAM; g.beginPath();
          poly.forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.lineTo(0, 512); g.lineTo(1024, 512); g.closePath(); g.fill();
          g.beginPath(); poly.forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill();
          g.fillRect(0, L(0, -56)[1], 1024, 512);
          // brownish bangs peeking out under the arch of the hat
          g.filter = 'blur(4px)';
          const [bx, by] = L(0, 36); P.blob(g, bx, by, 34, 22, GREY, 0.9);
          g.filter = 'none';
        }
      },
      head: { y: 2.4, neck: 1.75, w: 0.53, h: 0.6, d: 0.6, cheek: 0.36, ruff: 0.07, ruffFreq: 14, chinDrop: 0.02,
        // narrower crown (shifted under the cap, whose centre is at picture x 252); the lower half swells into the wide cream cheek ruff
        deform(p, o) { const k = 1 - 0.14 * sst(0.15, 0.5, o.y); p.x *= k * (1 + 0.42 * sst(-0.2, -0.72, o.y)); p.z *= k * (1 + 0.1 * sst(-0.3, -0.8, o.y)); p.x += 0.065 * sst(0.2, 0.55, o.y); },
        fur: { layers: 16, length: 0.06, gravity: 0.025, repeat: [9, 5] } },
      eyes: { x: 0.26, y: -0.125, r: 0.086, sx: 0.9, sy: 1.3, sz: 0.42, color: M('#6D4621'), shine: 0.95 },
      nose: { y: -0.2, color: M('#F2896A'), size: 0.62 },
      muzzle: { y: -0.29, size: 0.36, color: CREAM },
      mouth: { type: 'none' },
      blush: false,   // painted in build(): a clearly shaped peach oval with two red dots, as in the picture
      brows: null, whiskers: null,
      // big upright ears standing OUTSIDE the cap: tips at picture x 192 / 322, y 52; outer base at y ≈ 138
      ears: { x: 0.38, y: 0.245, z: -0.04, tilt: 0.2, yaw: 0.12, pitch: -0.12, size: [0.36, 0.7, 0.14], sharp: 0.9, L: { x: 0.305 }, R: { x: 0.515, tilt: 0.24 },
        color: FUR, inner: EAR_IN, innerScale: 1.12, tuft: false, fur: { layers: 10, length: 0.03, gravity: 0.008, repeat: [3, 3] } },
      bib: { color: M('#FFFBF4', 1.1), balls: [[0, 1.82, 0.36, 0.2], [0.2, 1.76, 0.3, 0.17], [-0.2, 1.76, 0.3, 0.17], [0, 1.62, 0.36, 0.16], [-0.17, 1.6, 0.3, 0.13], [0.17, 1.6, 0.3, 0.13]],
        fur: { layers: 14, length: 0.07, gravity: 0.03, repeat: [3, 2] } },
      // engine robe = the vermilion inner skirt (visible between the coat panels and below the coat hem)
      robe: {
        profile: [[0.72, 0.17], [0.73, 0.24], [0.67, 0.42], [0.55, 0.66], [0.41, 0.9], [0.31, 1.1], [0.32, 1.3], [0.38, 1.5], [0.35, 1.7], [0.12, 1.8]],
        color: '#FFFFFF', ink: RED_INK, lining: RED, hemY: 0.3,
        paint(g, w, h, D) {
          D.fill(g, RED);
          // pleat shading
          for (let x = 0; x < w; x += 42) { g.fillStyle = 'rgba(160,50,20,0.10)'; g.fillRect(x, 0, 6, h); }
          // gold band just above the hem
          g.fillStyle = M('#FCC380', 1.3); g.fillRect(0, h - 44, w, 26);
        }
      },
      collar: { color: IVORY, r: 0.028, over: -1, y0: 1.72, style: 'cross' },
      arms: {
        L: { hand: [-0.89, 1.5, 0.4], path: [[-0.44, 1.62, 0.0], [-0.7, 1.55, 0.14], [-0.85, 1.51, 0.28]], pawScale: 1.4, wrist: false },
        R: { hand: [0.15, 1.685, 0.8], path: [[0.44, 1.62, 0.0], [0.72, 1.6, 0.4], [0.29, 1.68, 0.7]], pawScale: 1.42, wrist: false }
      },
      sleeves: false,
      paws: { color: CREAM, ink: CREAM_INK },
      belt: false,
      feet: false,
      tail: {
        pts: [[0.3, 0.5, -0.45], [0.7, 0.34, -0.56], [1.08, 0.4, -0.52], [1.25, 0.72, -0.46], [1.23, 1.06, -0.4], [1.1, 1.3, -0.35], [0.92, 1.4, -0.32]],
        r: 0.33, color: TAIL, tip: TAIL, ink: TAIL_INK,
        shape: t => (t < 0.12 ? 0.55 + 0.45 * sst(0, 0.12, t) : 1) * (1 - 0.55 * sst(0.78, 1, t)),
        paint(g, w, h) {
          g.fillStyle = TAIL; g.fillRect(0, 0, w, h);
          // tan inner side of the plume, fading out toward the tip
          // canvas rows: bottom/top = the side facing the viewer, 0.75 = inner side of the curl
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, NEKO.rgba(TAIL_TAN, 1)); lg.addColorStop(0.7, NEKO.rgba(TAIL_TAN, 0.95)); lg.addColorStop(0.92, NEKO.rgba(TAIL_TAN, 0));
          const vg = g.createLinearGradient(0, 0, 0, h);
          vg.addColorStop(0, 'rgba(0,0,0,0.85)'); vg.addColorStop(0.16, 'rgba(0,0,0,0)'); vg.addColorStop(0.42, 'rgba(0,0,0,0)'); vg.addColorStop(0.58, 'rgba(0,0,0,1)'); vg.addColorStop(1, 'rgba(0,0,0,1)');
          const c2 = document.createElement('canvas'); c2.width = w; c2.height = h; const g2 = c2.getContext('2d');
          g2.fillStyle = lg; g2.fillRect(0, 0, w, h); g2.globalCompositeOperation = 'destination-in'; g2.fillStyle = vg; g2.fillRect(0, 0, w, h);
          g.drawImage(c2, 0, 0);
        },
        fur: { layers: 12, length: 0.035, gravity: 0.012, repeat: [16, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, lathe, ribbon, D } = K;
      const HY = K.cfg.head.y;

      /* ======================= face ======================= */
      // cream brow patches (oval, inner ends lower) and the two dots in each blush, painted where they land on the head
      {
        const g = K.headTex.image.getContext('2d');
        const uvAt = (x, y) => { const s = K.onSkin(x, y, [K.headMesh]); return s.uv ? [s.uv.x * 1024, (1 - s.uv.y) * 512] : null; };
        g.save(); g.filter = 'blur(1.5px)'; g.fillStyle = CREAM;
        [-1, 1].forEach(sx => {
          const cx = 0.232 * sx, cy = HY + 0.1, ang = 0.52 * sx, pts = [];   // inner ends lower (stern brows)
          for (let k = 0; k < 28; k++) {
            const a = k / 28 * Math.PI * 2, ex = Math.cos(a) * 0.1, ey = Math.sin(a) * 0.046;
            const q = uvAt(cx + ex * Math.cos(ang) - ey * Math.sin(ang), cy + ex * Math.sin(ang) + ey * Math.cos(ang));
            if (q) pts.push(q);
          }
          g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
        });
        // peach blush ovals under the outer corners of the eyes (picture: 24 × 14 px at (190, 202) / (297, 202))
        g.filter = 'blur(3px)'; g.fillStyle = M('#F9B091', 1.2);
        [-1, 1].forEach(sx => {
          const pts = [];
          for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, q = uvAt(sx * 0.43 + Math.cos(a) * 0.095, HY - 0.232 + Math.sin(a) * 0.056); if (q) pts.push(q); }
          g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
        });
        g.filter = 'none'; g.fillStyle = 'rgba(222,96,84,1)';
        [-1, 1].forEach(sx => [-0.03, 0.03].forEach(dx => { const q = uvAt(sx * 0.43 + dx, HY - 0.232); if (q) { g.beginPath(); g.arc(q[0], q[1], 3.4, 0, Math.PI * 2); g.fill(); } }));
        g.restore();
        K.headTex.needsUpdate = true;
      }

      // small thin ω mouth right under the nose (the beard hangs just below it)
      {
        const mm = std('#6E4A33', { roughness: 0.6 }), faceParts = K.muzzle.concat(K.headMesh);
        const onF = (x, y) => K.onSkin(x, y, faceParts).p.add(V(0, 0, 0.008));
        const my = HY - 0.262;
        [-1, 1].forEach(sx => mesh(tube([[0.1 * sx, my + 0.018], [0.05 * sx, my - 0.024], [0.004 * sx, my]].map(([x, y]) => onF(x, y)), 0.0085, 20, 8), mm, K.faceG));
        mesh(tube([onF(0, HY - 0.228), onF(0, my + 0.002)], 0.0085, 6, 8), mm, K.faceG);
      }

      /* ======================= long fur: cheek ruff and grey-brown side tufts ======================= */
      const edgeX = (y) => {
        let lo = 0, hi = 1.3;
        for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; }
        return lo;
      };
      const greyMat = std(GREY, { roughness: 0.95 }), creamMat = std(CREAM, { roughness: 0.95 }), furMat = std(FUR, { roughness: 0.95 });
      const lock = (parent, root, dir, len, r0, mat, ink, bend) => {
        const d = V(dir[0], dir[1], dir[2]).normalize(), a = V(root[0], root[1], root[2]);
        const b = a.clone().addScaledVector(d, len * 0.55).add(V(0, bend * len, 0)), c = a.clone().addScaledVector(d, len);
        return mesh(tube([a, b, c], t => r0 * (1 - Math.pow(t, 1.3)) + 0.004, 18, 10), mat, parent, null, null, ink);
      };
      [-1, 1].forEach(sx => {
        // [height, angle below horizontal (deg), length, root radius, material]
        [[2.64, -30, 0.13, 0.06, greyMat], [2.53, -14, 0.16, 0.07, greyMat], [2.42, 0, 0.17, 0.075, greyMat], [2.31, 12, 0.17, 0.075, greyMat], [2.2, 22, 0.16, 0.07, greyMat],
          [2.06, 32, 0.14, 0.07, creamMat], [1.95, 42, 0.14, 0.07, creamMat], [1.85, 54, 0.13, 0.07, creamMat], [1.76, 66, 0.12, 0.06, creamMat]]
          .forEach(([y, ang, len, r0, mat], i) => {
            const ex = edgeX(y), a = ang * Math.PI / 180, zz = [0.06, -0.06, 0.08, -0.04, 0.06, 0.1, -0.06, 0.08, 0.02][i];
            lock(K.faceG, [sx * (ex - 0.08), y, zz], [sx * Math.cos(a), -Math.sin(a), zz * 0.8], len, r0, mat, mat === greyMat ? '#8E6D4C' : CREAM_INK, -0.1);
          });
        // mane continuing behind the cheeks
        [[2.5, -0.26, 0.16, greyMat], [2.3, -0.32, 0.18, greyMat], [2.1, -0.3, 0.2, creamMat], [1.94, -0.24, 0.18, creamMat]].forEach(([y, z, len, mat]) => {
          const ex = edgeX(y) * 0.9;
          lock(K.faceG, [sx * (ex - 0.1), y, z], [sx * 0.45, -0.65, -0.6], len, 0.08, mat, mat === greyMat ? '#8E6D4C' : CREAM_INK, -0.05);
        });
      });
      // grey-brown bangs peeking out under the arch of the cap
      // (picture: soft brown strands x 225–270, from the arch at y 121 down to y 142)
      [[-0.11, -0.35, 0.12], [-0.055, -0.15, 0.15], [0.0, 0.05, 0.16], [0.055, 0.2, 0.15], [0.11, 0.4, 0.12]].forEach(([dx, lean, len]) => {
        const r = K.onSkin(0.05 + dx, HY + 0.385, [K.headMesh]).p;
        lock(K.faceG, [r.x, r.y, r.z + 0.015], [lean, -1, 0.6], len, 0.042, greyMat, '#9A7B5A', 0.02);
      });
      // cream chest ruff tips around the beard
      [[-0.46, 1.86, 0.2, -0.45], [-0.32, 1.8, 0.36, -0.25], [-0.16, 1.74, 0.45, -0.1], [0.16, 1.74, 0.45, 0.1], [0.32, 1.8, 0.36, 0.25], [0.46, 1.86, 0.2, 0.45]]
        .forEach(([x, y, z, dx]) => lock(K.faceG, [x, y + 0.06, z], [dx, -1, 0.3], 0.17, 0.065, creamMat, CREAM_INK, 0));
      // pink inner ear filled with feathery white fur (painted onto the inner-ear shell; front of it = u 0.25)
      K.ears.forEach(({ g, sx }) => {
        const inner = g.children[1];
        if (!inner) return;
        const tex = canvasTex(512, 512, (c, w, h) => {
          c.fillStyle = EAR_IN; c.fillRect(0, 0, w, h);
          const rowOf = t => Math.acos(2 * t - 1) / Math.PI * h;       // ear-height fraction → canvas row
          c.fillStyle = CREAM; c.strokeStyle = CREAM_INK; c.lineWidth = 2.5; c.lineJoin = 'round';
          // [u of the root, tip height fraction, lean (+ = outward), half-width in u]
          [[0.25, 0.62, 0.0, 0.07], [0.19, 0.55, 0.06, 0.06], [0.31, 0.56, -0.05, 0.06], [0.14, 0.45, 0.08, 0.05], [0.36, 0.47, -0.07, 0.05],
            [0.22, 0.38, 0.03, 0.06], [0.29, 0.4, -0.02, 0.06]].forEach(([u, tt, lean, hw]) => {
            const x0 = u * w, xt = (u + (u - 0.25) * 0.9 + 0.03 * sx) * w, yb = h, yt = rowOf(tt), ym = (yb + yt) / 2;
            c.beginPath(); c.moveTo(x0 - hw * w, yb);
            c.quadraticCurveTo(x0 - hw * w * 0.9, ym, xt, yt);
            c.quadraticCurveTo(x0 + hw * w * 0.9, ym, x0 + hw * w, yb); c.closePath(); c.fill(); c.stroke();
          });
          // soft base so the tufts merge into one fluffy mass
          const rg = c.createLinearGradient(0, rowOf(0.3), 0, h);
          rg.addColorStop(0, NEKO.rgba(CREAM, 0)); rg.addColorStop(0.35, NEKO.rgba(CREAM, 1));
          c.fillStyle = rg; c.fillRect(0.08 * w, rowOf(0.3), 0.34 * w, h);
        });
        inner.material = texMat(tex, { roughness: 0.9 });
      });

      /* ======================= 美髯: the long beard held by the image-right paw ======================= */
      beardG = part('beard', K.faceG);
      {
        const top = K.onSkin(0, HY - 0.33, K.muzzle.concat(K.headMesh)).p;
        // centreline from the chin to the tip, traced on the picture: narrow under the mouth, widest around
        // y 255–285 (x 220–258), bulging a little to the image-left, the tip swinging back to x ≈ 248 at y 320
        const cl = [[X(243), Y(212), top.z - 0.04], [X(243), Y(232), 0.66], [X(243), Y(252), 0.71], [X(242), Y(275), 0.72], [X(243), Y(297), 0.7], [X(247), Y(312), 0.67], [X(251), Y(322), 0.64]];
        const curve = K.curve3(cl);
        // half-widths measured on the picture: 8 px wide under the mouth, 44 px at y 250–275, then tapering to the tip
        const WS = [[0, 0.03], [0.18, 0.12], [0.36, 0.172], [0.57, 0.165], [0.77, 0.118], [0.91, 0.066], [1, 0.008]];
        const wf = t => { for (let i = 0; i < WS.length - 1; i++) { const [t0, w0] = WS[i], [t1, w1] = WS[i + 1]; if (t <= t1) return lerp(w0, w1, sst(t0, t1, t) * 0.5 + (t - t0) / (t1 - t0) * 0.5); } return 0.008; };
        const geo = tube(curve, wf, 60, 16);
        // flatten front-to-back so it reads as a hanging lock of hair
        const p = geo.attributes.position, c = new THREE.Vector3();
        for (let i = 0; i <= 60; i++) {
          curve.getPointAt(i / 60, c);
          for (let j = 0; j <= 16; j++) { const k = i * 17 + j; p.setZ(k, c.z + (p.getZ(k) - c.z) * 0.42); }
        }
        K.smoothNormals(geo);
        const btex = canvasTex(256, 256, (g, w, h) => {
          // hair strands running along the beard (u = along the tube, v = around it)
          g.fillStyle = BEARD; g.fillRect(0, 0, w, h);
          // irregular flowing strands: a few long light streaks and many fine darker ones
          for (let i = 0; i < 70; i++) {
            const v = K.rand() * h, light = i % 4 === 0, x0 = K.rand() * w * 0.3, x1 = w * (0.6 + K.rand() * 0.4);
            g.strokeStyle = light ? BEARD_LT : M('#80603F'); g.globalAlpha = light ? 0.45 + 0.3 * K.rand() : 0.2 + 0.25 * K.rand();
            g.lineWidth = light ? 2 + K.rand() * 4 : 1 + K.rand() * 2; g.lineCap = 'round';
            const b1 = (K.rand() - 0.5) * 14, b2 = (K.rand() - 0.5) * 14;
            g.beginPath(); g.moveTo(x0, v); g.bezierCurveTo(x0 + (x1 - x0) * 0.33, v + b1, x0 + (x1 - x0) * 0.66, v + b2, x1, v + (b1 + b2) * 0.3); g.stroke();
          }
          g.globalAlpha = 1;
        });
        mesh(geo, texMat(btex, { roughness: 0.9 }), beardG, null, null, BEARD_INK);
        // darker strand lines
        const sm = std(M('#7E5E40'), { roughness: 0.9 });
        [-0.045, 0.03].forEach((dx) => mesh(tube(cl.slice(1, 5).map(([x, y, z], k) => [x + dx * (0.6 + 0.25 * Math.sin(k * 1.2)), y, z + 0.055]), 0.008, 24, 6), sm, beardG));
        // brown side whiskers (鬢鬚) framing the beard like two big brackets: from beside the mouth they curve out
        // and down over the cream cheek fur (picture: (223, 212) → (212, 243) → (218, 257), mirrored on the right)
        const bl = std(M('#A98761'), { roughness: 0.9 }), blLt = std(M('#CDAE86', 1.25), { roughness: 0.9 });
        [-1, 1].forEach(sx => {
          const a = K.onSkin(sx * 0.15, HY - 0.3, K.muzzle.concat(K.headMesh)).p;
          const pts = [a.clone().add(V(0, 0, 0.01)), V(sx * 0.215, HY - 0.36, a.z + 0.0), V(sx * 0.252, HY - 0.45, a.z - 0.03), V(sx * 0.258, HY - 0.55, a.z - 0.05), V(sx * 0.235, HY - 0.64, a.z - 0.06), V(sx * 0.2, HY - 0.69, a.z - 0.06)];
          mesh(tube(pts, t => 0.026 * Math.sin(Math.PI * (0.12 + 0.88 * t)) + 0.005, 36, 10), bl, beardG, null, null, '#7C5E41');
          // a pale strand along the outer side
          mesh(tube(pts.slice(1, 5).map(q => q.clone().add(V(sx * 0.012, 0, 0.018))), t => 0.007 * Math.sin(Math.PI * t) + 0.002, 20, 6), blLt, beardG);
        });
      }

      /* ======================= 綠頭巾帽 (green warrior cap) ======================= */
      const hatG = part('hat', K.head);
      {
        const HXo = 0.07, JY = 2.975;   // hat centre x (picture x 252) · height where the dome meets the brim
        // outline measured on the picture (half-widths): a bulb-shaped dome (widest y 85, slightly pinched at
        // y 95–100) sitting in a flared, lampshade-like brim that ends in the gold rim at y 138–143
        const prof = new THREE.SplineCurve([[0.555, 2.6], [0.55, 2.66], [0.52, 2.72], [0.47, 2.78], [0.415, 2.84], [0.36, 2.9], [0.315, 2.945], [0.292, JY], [0.296, 3.02], [0.302, 3.08], [0.29, 3.14], [0.25, 3.19], [0.17, 3.235], [0.07, 3.262], [0.0, 3.268]].map(q => new THREE.Vector2(q[0], q[1]))).getSpacedPoints(100);
        const rAt = (y) => { for (let i = 0; i < prof.length - 1; i++) { const a = prof[i], b = prof[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < prof[0].y ? prof[0].x : 0.0; };
        const Y0 = 2.6, Y1 = 3.268;
        // lower rim: rises toward the front and forms a rounded arch over the forehead (picture: top y 121)
        const yLow = (phi) => { const f = Math.max(0, Math.cos(phi)); return Y0 + 0.1 * f * f + 0.085 * Math.exp(-Math.pow(phi / 0.42, 4)); };
        const vOf = (phi, y) => (y - yLow(phi)) / (Y1 - yLow(phi));
        const nu = 160, rim = [];
        const shell = (yA, yB, nv) => {
          const pos = [], uv = [], idx = [];
          for (let j = 0; j <= nv; j++) {
            const t = j / nv;
            for (let i = 0; i <= nu; i++) {
              const u = i / nu, phi = (u - 0.5) * Math.PI * 2;
              const y = lerp(yA(phi), yB(phi), t), r = rAt(y);
              pos.push(HXo + Math.sin(phi) * r, y, Math.cos(phi) * r); uv.push(u, vOf(phi, y));
              if (j === 0 && yA === yLow) rim.push(V(HXo + Math.sin(phi) * r, y, Math.cos(phi) * r));
            }
          }
          for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
          geo.setIndex(idx); K.smoothNormals(geo);
          return geo;
        };
        const W = 2048, H = 512;
        const tex = canvasTex(W, H, (g) => {
          D.fill(g, HAT);
          // the dome is a touch lighter than the brim
          for (let i = 0; i <= 256; i++) { const u = i / 256, phi = (u - 0.5) * Math.PI * 2; g.fillStyle = M('#879760'); g.fillRect(u * W - 5, 0, 12, H - vOf(phi, JY) * H); }
          // gold band along the lower rim
          for (let i = 0; i <= 256; i++) {
            const u = i / 256, phi = (u - 0.5) * Math.PI * 2;
            g.fillStyle = GOLD; g.fillRect(u * W - 5, H - vOf(phi, yLow(phi) + 0.05) * H, 12, 80);
          }
          const circ = 2 * Math.PI * 0.35, sxp = W / circ;
          const at = (phi, y, fn) => { const syp = H * (vOf(phi, y + 0.005) - vOf(phi, y - 0.005)) / 0.01; g.save(); g.translate((phi / (Math.PI * 2) + 0.5) * W, H - vOf(phi, y) * H); g.scale(sxp / 100 * 0.35 / rAt(y), syp / 100); fn(); g.restore(); };
          // gold sun on the front of the dome (picture: centre (247, 88), rays reach 17 px)
          at(-0.02, 3.075, () => sunM(g, 15.5, GOLD));
          // pale-green three-leaf sprigs on the brim either side of the arch (picture (216, 117) / (282, 116))
          const trefoil = () => {
            [[0, 1.12], [-1.05, 0.9], [1.05, 0.9]].forEach(([a, s]) => {
              g.save(); g.rotate(a); g.scale(s, s);
              g.fillStyle = LEAF_LT; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(4.4, -2.5, 3.6, -7.5, 0, -10); g.bezierCurveTo(-3.6, -7.5, -4.4, -2.5, 0, 0); g.fill();
              g.strokeStyle = M('#86A05C'); g.lineWidth = 0.7; g.beginPath(); g.moveTo(0, -0.5); g.lineTo(0, -7.5); g.stroke();
              g.restore();
            });
          };
          [-1, 1].forEach(k => at(k * 0.7, 2.83, trefoil));
        });
        const hatMat = texMat(tex, { side: THREE.DoubleSide, roughness: 0.85 });
        // brim (dark-green outline) and dome (drawn with a gold outline in the picture)
        mesh(shell(yLow, () => JY, 26), hatMat, hatG, null, null, HAT_INK);
        mesh(shell(() => JY, () => Y1, 30), hatMat, hatG, null, null, '#D8A64F');
        // darker seam where the flared brim meets the dome
        { const ring = []; for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2; ring.push(V(HXo + Math.sin(a) * (rAt(JY) + 0.004), JY, Math.cos(a) * (rAt(JY) + 0.004))); }
          mesh(tube(ring, 0.01, 192, 6, true), std(M('#6F7E50'), { roughness: 0.8 }), hatG); }
        // gold rim cord along the lower edge
        mesh(tube(rim.slice(0, -1).map(q => q.clone().multiplyScalar(1).add(V(0, 0.004, 0))), 0.027, 240, 8, true), std(GOLD, { roughness: 0.5 }), hatG, null, null, GOLD_INK);
        // gold knob ring and the red pompom on top (picture: ring y 55–62, pompom centre y 45, r ≈ 14 px)
        mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.07, 32), std(GOLD, { roughness: 0.45, metalness: 0.1 }), hatG, [HXo, 3.3, 0], null, GOLD_INK);
        mesh(new THREE.TorusGeometry(0.13, 0.014, 8, 40), std(GOLD_DK, { roughness: 0.5 }), hatG, [HXo, 3.335, 0], null, GOLD_INK).rotation.x = Math.PI / 2;
        const pom = mesh(sphere(0.1, 28, 20), std(RED, { roughness: 1 }), hatG, [HXo, 3.41, 0], [1.2, 0.95, 1.0], RED_INK);
        K.addFur(pom, { layers: 10, length: 0.04, gravity: 0.01, repeat: [4, 3] });
        // a fluffy red tuft trailing from the pompom down the image-right side of the dome
        const tuftM = std(RED, { roughness: 1 });
        const tuft = mesh(tube([[HXo + 0.08, 3.39, 0.0], [0.22, 3.33, -0.05], [0.33, 3.24, -0.1], [0.41, 3.13, -0.16]], t => 0.06 * (1 - 0.7 * t) + 0.012, 24, 10), tuftM, hatG, null, null, RED_INK);
        K.addFur(tuft, { layers: 8, length: 0.03, gravity: 0.01, repeat: [6, 2] });
        // the red streamer: tied at the back of the cap, it comes round the image-right side behind the ear
        // and flies out to picture (398, 192)
        const rm = std(RED, { roughness: 0.85, side: THREE.DoubleSide });
        const rb = ribbon([[0.12, 2.86, -0.56], [0.36, 2.84, -0.46], [0.56, 2.8, -0.24], [0.7, 2.73, -0.06], [0.86, 2.6, 0.02], [1.02, 2.47, 0.05], [1.14, 2.36, 0.04], [1.22, 2.27, 0.02]],
          t => 0.1 + 0.08 * sst(0.2, 0.55, t), { face: [0.2, 0.25, 1], twist: t => 0.35 * Math.sin(t * Math.PI * 1.4), segs: 90 });
        mesh(rb, rm, hatG, null, null, RED_INK);
        // swallow-tail cut at the flying end
        { const e = V(1.22, 2.27, 0.02), sh = new THREE.Shape();
          sh.moveTo(0, 0.09); sh.lineTo(0.1, 0.02); sh.lineTo(0.02, -0.02); sh.lineTo(0.06, -0.12); sh.lineTo(-0.05, -0.07); sh.lineTo(-0.04, 0.09); sh.closePath();
          const cut = mesh(new THREE.ShapeGeometry(sh), rm, hatG, [e.x - 0.01, e.y + 0.01, e.z], null, RED_INK); cut.rotation.z = -0.55; }
        // green headscarf tails (幞頭腳) hanging behind the head: the image-right one shows beside the cheek fur
        // (picture x 318–356, from under the brim at y 140 down to a slanted end at y 245)
        const fm = std(M('#7F9460'), { roughness: 0.9, side: THREE.DoubleSide });
        mesh(ribbon([[0.5, 2.7, -0.3], [0.66, 2.46, -0.28], [0.78, 2.2, -0.22], [0.86, 1.96, -0.16], [0.88, 1.84, -0.14]], t => 0.25 - 0.05 * t - 0.16 * sst(0.82, 1, t), { face: [0.35, 0.1, 1], segs: 40 }), fm, hatG, null, null, HAT_INK);
        mesh(ribbon([[-0.45, 2.7, -0.4], [-0.56, 2.46, -0.48], [-0.62, 2.2, -0.52], [-0.64, 2.0, -0.52]], t => 0.22 - 0.05 * t - 0.14 * sst(0.82, 1, t), { face: [-0.6, 0.1, -1], segs: 40 }), fm, hatG, null, null, HAT_INK);
      }

      /* ======================= open-front green outer robe (外袍) ======================= */
      const coatProf = new THREE.SplineCurve([[0.9, 0.28], [0.91, 0.36], [0.87, 0.5], [0.73, 0.7], [0.53, 0.92], [0.37, 1.1], [0.35, 1.2], [0.41, 1.38], [0.47, 1.52], [0.46, 1.66], [0.36, 1.77]]
        .map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(100);
      const coatR = (y) => { for (let i = 0; i < coatProf.length - 1; i++) { const a = coatProf[i], b = coatProf[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < 0.3 ? 0.9 : 0.36; };
      const zsc = (y) => 1 - 0.2 * sst(1.1, 0.4, y);
      const gapW = (y) => y > 1.24 ? lerp(0.28, 0.2, sst(1.4, 1.77, y)) : (y > 1.1 ? lerp(0.06, 0.28, sst(1.1, 1.24, y)) : lerp(0.17, 0.06, sst(0.28, 1.1, y)));
      const phiH = (y) => Math.asin(Math.min(gapW(y) / coatR(y), 0.97));
      const CY0 = 0.28, CY1 = 1.77;
      {
        const nu = 140, nv = 60, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, y = lerp(CY0, CY1, t), r = coatR(y), ph = phiH(y), zs = zsc(y);
          for (let i = 0; i <= nu; i++) { const phi = ph + (Math.PI * 2 - 2 * ph) * i / nu; pos.push(Math.sin(phi) * r, y, Math.cos(phi) * r * zs); uv.push(i / nu, t); }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const W = 2048, H = 1024;
        const rowY = (y) => (1 - (y - CY0) / (CY1 - CY0)) * H;
        const uOf = (phi, y) => { const ph = phiH(y); return (phi - ph) / (Math.PI * 2 - 2 * ph); };
        const phiX = (x, y) => { const a = Math.asin(Math.max(-0.99, Math.min(0.99, x / coatR(y)))); return a < 0 ? a + Math.PI * 2 : a; };
        // draw fn() in "centi-world" units centred on the coat point (phi, y)
        const at = (g, phi, y, fn) => {
          const sxp = W / (coatR(y) * (Math.PI * 2 - 2 * phiH(y))), syp = H / (CY1 - CY0);
          g.save(); g.translate(uOf(phi, y) * W, rowY(y)); g.scale(sxp / 100, syp / 100); fn(); g.restore();
        };
        const tex = canvasTex(W, H, (g) => {
          D.fill(g, COAT);
          // shoulder yoke (雲肩): slightly deeper green with a gold zigzag border and small flowers
          g.fillStyle = M('#93A064'); g.fillRect(0, 0, W, rowY(1.56));
          g.strokeStyle = GOLD; g.lineWidth = 10; g.lineJoin = 'round'; g.beginPath();
          for (let i = 0; i <= 16; i++) { const u = i / 16, y = rowY(i % 2 ? 1.5 : 1.6); i ? g.lineTo(u * W, y) : g.moveTo(u * W, y); }
          g.stroke();
          for (let i = 0; i < 16; i += 2) { const u = (i + 1) / 16; g.save(); g.translate(u * W, rowY(1.64)); g.scale(1, 1.1); D.flower(g, 0, 0, 16, M('#F2A55E'), GOLD, 5); g.restore(); }
          // hem band and the front-edge borders (below the belt)
          g.fillStyle = IVORY; g.fillRect(0, rowY(0.39), W, H);
          g.fillStyle = GOLD; g.fillRect(0, rowY(0.39) - 6, W, 6);
          const edge = (inset) => {
            const L = [];
            for (let k = 0; k <= 40; k++) {
              const y = lerp(CY0, 1.11, k / 40), circ = coatR(y) * (Math.PI * 2 - 2 * phiH(y));
              L.push([0.075 / circ * W + inset, rowY(y)]);
            }
            return L;
          };
          [[edge(0), IVORY], [edge(6), GOLD]].forEach(([L, col]) => {
            g.fillStyle = col;
            [1, -1].forEach(dir => {
              g.beginPath(); g.moveTo(dir > 0 ? 0 : W, rowY(CY0));
              L.forEach(([x, y]) => g.lineTo(dir > 0 ? x : W - x, y));
              g.lineTo(dir > 0 ? 0 : W, rowY(1.11)); g.closePath();
              if (col === GOLD) { g.save(); g.lineWidth = 6; g.strokeStyle = GOLD; g.beginPath(); L.forEach(([x, y], i) => i ? g.lineTo(dir > 0 ? x : W - x, y) : g.moveTo(dir > 0 ? x : W - x, y)); g.stroke(); g.restore(); }
              else g.fill();
            });
          });
          // motifs on the image-right panel
          at(g, phiX(0.26, 0.82), 0.82, () => sunM(g, 11, SUNY));
          at(g, phiX(0.47, 0.6), 0.6, () => cloudM(g, 13, M('#FDF3E3', 1.15), M('#B7C48F', 1.2)));
          at(g, phiX(0.72, 0.52), 0.52, () => sprigM(g, 24, LEAF_LT));
          // motifs on the image-left panel
          at(g, phiX(-0.3, 0.62), 0.62, () => wheatM(g, 30, SUNY, M('#C9B25E', 1.2)));
          at(g, phiX(-0.62, 0.52), 0.52, () => sprigM(g, 22, LEAF_LT));
          at(g, phiX(-0.52, 0.38), 0.38, () => cloudM(g, 10, M('#FDF3E3', 1.15), M('#B7C48F', 1.2)));
          // chest: a golden flower on the left breast
          at(g, phiX(-0.32, 1.46), 1.46, () => D.flower(g, 0, 0, 5, SUNY, M('#F2A55E'), 5));
          // back: sun, clouds and sprigs
          at(g, Math.PI, 0.78, () => sunM(g, 13, SUNY));
          [Math.PI - 0.9, Math.PI + 0.9].forEach(a => at(g, a, 0.56, () => sprigM(g, 24, LEAF_LT)));
          [Math.PI - 0.45, Math.PI + 0.45].forEach(a => at(g, a, 0.48, () => cloudM(g, 11, M('#FDF3E3', 1.15), M('#B7C48F', 1.2))));
        });
        mesh(geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.9 }), K.robeG, null, null, COAT_INK);
        const hem = []; for (let k = 0; k <= nu; k++) hem.push(V(pos[k * 3] * 1.004, CY0 + 0.004, pos[k * 3 + 2] * 1.004));
        mesh(tube(hem, 0.013, 200, 6), std(GOLD_DK, { roughness: 0.7 }), K.robeG);
      }

      /* ======================= 雲肩: shoulder yoke with pointed lappets and a gold edge ======================= */
      {
        const gap = 26 * Math.PI / 180, zc = 0.84;
        const prof = [[0.76, 1.5], [0.7, 1.59], [0.6, 1.68], [0.48, 1.755], [0.35, 1.8]];
        const W = 1024, H = 256;
        // lappet edge: v (0 = lower rim, 1 = neck) of the cut at u; 4 points (two front, two back)
        const phiOf = (u) => (26 + u * 308), cutV = (u) => { const k = ((phiOf(u) + 360 - 5) % 90) / 90; return 0.04 + 0.52 * Math.pow(Math.abs(k - 0.5) * 2, 1.5); };
        const tex = canvasTex(W, H, (g) => {
          g.clearRect(0, 0, W, H);
          const path = () => { g.beginPath(); g.moveTo(0, 0); for (let i = 0; i <= 200; i++) { const u = i / 200; g.lineTo(u * W, H - cutV(u) * H); } g.lineTo(W, 0); g.closePath(); };
          path(); g.fillStyle = M('#93A064'); g.fill();
          // small orange-gold flowers on each lappet
          for (let i = 0; i < 4; i++) { const u = (50 + i * 90 - 26) / 308; g.save(); g.translate(u * W, H * 0.55); g.scale(0.55, 1); D.flower(g, 0, 0, 34, M('#F2A55E'), GOLD, 5); g.restore(); }
          for (let i = 0; i < 8; i++) { const u = (i + 0.5) / 8; if (i % 2) continue; g.save(); g.translate(u * W + 40, H * 0.3); g.scale(0.55, 1); D.flower(g, 0, 0, 16, SUNY, M('#F2A55E'), 5); g.restore(); }
          // gold border along the pointed edge
          g.strokeStyle = GOLD; g.lineWidth = 22; g.lineJoin = 'round';
          g.beginPath(); for (let i = 0; i <= 200; i++) { const u = i / 200, y = H - cutV(u) * H + 8; i ? g.lineTo(u * W, y) : g.moveTo(u * W, y); } g.stroke();
          g.strokeStyle = GOLD_DK; g.lineWidth = 4;
          g.beginPath(); for (let i = 0; i <= 200; i++) { const u = i / 200, y = H - cutV(u) * H + 19; i ? g.lineTo(u * W, y) : g.moveTo(u * W, y); } g.stroke();
          // gold edge down the front opening
          g.fillStyle = GOLD; g.fillRect(0, 0, 14, H); g.fillRect(W - 14, 0, 14, H);
          g.globalCompositeOperation = 'destination-in'; path(); g.fillStyle = '#000'; g.fill(); g.globalCompositeOperation = 'source-over';
        });
        const yl = lathe(prof, 128, gap, Math.PI * 2 - gap * 2, 24);
        const ym = mesh(yl.geo, texMat(tex, { side: THREE.DoubleSide, alphaTest: 0.5, roughness: 0.85 }), K.robeG, null, [1, 1, zc]);
        ym.castShadow = true;
      }

      /* ======================= wide sleeves: green upper sleeve + big ivory hanging cuff ======================= */
      const sleevesG = part('sleeves', K.body);
      const sack = (o) => {
        const spine = new THREE.CatmullRomCurve3(o.spine.map(([x, z]) => V(x, 0, z)));
        const NT = 64, NA = 56, pos = [], uv = [], idx = [], ring = [];
        for (let i = 0; i <= NT; i++) {
          const t = i / NT, C = spine.getPointAt(t), T = spine.getTangentAt(t);
          T.y = 0; T.normalize();
          const n = V(T.z, 0, -T.x);
          const yT = o.yT(t), yB = o.yB(t), Wd = o.W(t), mid = (yT + yB) / 2, half = (yT - yB) / 2;
          for (let j = 0; j <= NA; j++) {
            const a = j / NA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            const y = mid + half * Math.sign(ca) * Math.pow(Math.abs(ca), 0.85);
            const hgt = (y - yB) / (yT - yB);
            const s = Wd * Math.sign(sa) * Math.pow(Math.abs(sa), 0.7) * (1 + 0.3 * (1 - hgt));
            const p = C.clone().addScaledVector(n, s); p.y = y;
            if (o.shear) p.addScaledVector(T, -o.shear(t) * (yT - y));   // slant the cuff opening (its lower lip recedes)
            pos.push(p.x, p.y, p.z); uv.push(t, (y - 0.3) / 1.6);
            if (i === NT) ring.push(p);
          }
        }
        for (let i = 0; i < NT; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const k = Math.floor(NT / 2) * (NA + 1) + Math.floor(NA / 4);
        const pv = V().fromBufferAttribute(geo.attributes.position, k), nv = V().fromBufferAttribute(geo.attributes.normal, k);
        const c0 = spine.getPointAt(0.5); c0.y = pv.y;
        if (nv.dot(pv.clone().sub(c0)) < 0) { for (let q = 0; q < idx.length; q += 3) { const tt = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tt; } geo.setIndex(idx); K.smoothNormals(geo); }
        const L = spine.getLength();
        const tex = canvasTex(1024, 1024, (g, w, h) => {
          D.fill(g, SLEEVE);
          // green upper sleeve for t < greenAt(y); the ivory hanging part beyond it
          const gy = [], row0 = y => (1 - (y - 0.3) / 1.6) * h;
          for (let k = 0; k <= 40; k++) { const y = 0.3 + 1.6 * k / 40; gy.push([o.greenAt(y) * w, row0(y)]); }
          g.fillStyle = COAT; g.beginPath(); g.moveTo(0, h); gy.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(0, 0); g.closePath(); g.fill();
          // gold zigzag yoke edge over the shoulder
          g.fillStyle = M('#93A064'); g.strokeStyle = GOLD; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0);
          const row = y => (1 - (y - 0.3) / 1.6) * h;
          [[0, 1.5], [0.12, 1.58], [0.22, 1.46], [0.34, 1.6], [0.42, 1.52]].forEach(([u, y]) => g.lineTo(u * w, row(y)));
          g.lineTo(0.42 * w, 0); g.closePath(); g.fill();
          g.beginPath(); [[0, 1.5], [0.12, 1.58], [0.22, 1.46], [0.34, 1.6], [0.42, 1.52]].forEach(([u, y], i) => i ? g.lineTo(u * w, row(y)) : g.moveTo(u * w, row(y))); g.stroke();
          [[0.1, 1.66], [0.28, 1.68]].forEach(([u, y]) => { g.save(); g.translate(u * w, row(y)); g.scale(1, 0.62); D.flower(g, 0, 0, 26, M('#F2A55E'), GOLD, 5); g.restore(); });
          // seam between the green upper sleeve and the ivory cuff
          g.lineJoin = 'round';
          g.strokeStyle = GOLD; g.lineWidth = 10; g.beginPath(); gy.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
          g.strokeStyle = COAT_INK; g.lineWidth = 3; g.beginPath(); gy.forEach(([x, y], i) => i ? g.lineTo(x + 7, y) : g.moveTo(x + 7, y)); g.stroke();
          // motifs, drawn in centi-world units at (t, y)
          const sxp = w / L, syp = h / 1.6;
          const at = (t, y, fn) => { g.save(); g.translate(t * w, row(y)); g.scale(sxp / 100, syp / 100); fn(); g.restore(); };
          o.motifs(at, g);
          // ivory cuff edge band near the opening
          g.fillStyle = M('#F3CE98', 1.2); g.fillRect(w - 26, 0, 26, h);
        });
        const mat = texMat(tex, { roughness: 0.9 });
        mesh(geo, mat, sleevesG, null, null, COAT_INK);
        const lin = new THREE.Mesh(geo, std(RED, { side: THREE.BackSide, roughness: 0.9 })); lin.receiveShadow = true; sleevesG.add(lin);
        mesh(tube(ring.slice(0, -1), 0.014, 120, 8, true), std(RED, { roughness: 0.8 }), sleevesG);
        return { geo, ring, mat };
      };
      const sL = sack({
        // picture: the cuff opens just under the glaive paw (y 297) and the ivory sleeve hangs to y 400, its outer
        // edge at x 105–110 showing the vermilion lining (y 300–385); the green upper sleeve ends at y ≈ 350
        spine: [[-0.28, -0.06], [-0.5, 0.0], [-0.7, 0.08], [-0.84, 0.14], [-0.92, 0.18]],
        yT: t => lerp(1.74, 1.45, sst(0, 0.75, t)), yB: t => lerp(1.36, 0.6, sst(0.1, 0.55, t)) + 0.1 * Math.pow(sst(0.8, 1, t), 1.5),
        shear: t => -0.28 * sst(0.5, 1, t),   // the lower part of the drape swings outward, so the lining shows along the outer edge
        W: t => lerp(0.09, 0.21, sst(0.2, 0.7, t)) * (1 - 0.12 * sst(0.85, 1, t)), greenAt: y => 0.58 * sst(0.92, 1.02, y),
        motifs(at, g) {
          at(0.76, 0.74, () => vineM(g, 34, LEAFG, LEAF_LT));
        }
      });
      const sR = sack({
        // picture: the forearm is raised to the chin; the ivory sleeve hangs below it (x 267–367, down to y 387),
        // its vermilion lining showing as a band that slants from the paw (280, 253) to the lower lip (318, 377)
        spine: [[0.28, -0.08], [0.58, -0.04], [0.8, 0.16], [0.74, 0.44], [0.37, 0.58]],
        yT: t => t < 0.5 ? lerp(1.74, 1.5, sst(0.05, 0.5, t)) : lerp(1.5, 1.8, sst(0.5, 1, t)), yB: t => lerp(1.36, 0.66, sst(0.15, 0.5, t)) + 0.06 * sst(0.85, 1, t),
        W: t => lerp(0.09, 0.23, sst(0.25, 0.7, t)) * (1 - 0.12 * sst(0.85, 1, t)), greenAt: y => lerp(0.5, 0.97, sst(1.25, 1.6, y)),
        shear: t => 0.26 * sst(0.55, 1, t),
        motifs(at, g) {
          at(0.93, 1.58, () => sprigM(g, 13, LEAF_LT));
          at(0.83, 1.3, () => wheatM(g, 20, SUNY, M('#C9B25E', 1.2)));
          at(0.7, 1.1, () => wheatM(g, 18, SUNY, M('#C9B25E', 1.2)));
          at(0.58, 0.86, () => lotusLeafM(g, 30, LEAFG, LEAF_DK));
        }
      });
      // the stroking paw (image-right) for the action: a tall fist gripping the beard (picture 37 × 54 px)
      pawR = K.poseG.children.find(o => o.isMesh && o.position.distanceTo(K.hands.R.p) < 1e-4);
      if (pawR) { pawR0 = pawR.position.clone(); pawR.scale.set(0.86, 1.08, 0.95); }
      // the glaive paw is a tall fist wrapped round the pole (picture 34 × 46 px)
      const pawL = K.poseG.children.find(o => o.isMesh && o.position.distanceTo(K.hands.L.p) < 1e-4);
      if (pawL) pawL.scale.set(0.86, 1.12, 0.95);
      // image-right forearm: in the picture a cream wrist runs from under the beard fist down into the sleeve
      // opening (edged by the vermilion lining). It starts inside the sleeve, leaning on the top of the sack.
      {
        const NA = 56, at = (i, j) => V().fromBufferAttribute(sR.geo.attributes.position, i * (NA + 1) + j);
        const inTop = at(56, 0), cuffTop = sR.ring[0], P = K.hands.R.p;
        const a = inTop.clone().add(V(0, -0.11, 0)), b = cuffTop.clone().add(V(-0.04, -0.19, 0.03));
        const c = V(P.x + 0.05, P.y - 0.09, P.z - 0.04);
        forearmR = group(K.poseG, a);
        mesh(tube([a, b, c].map(q => q.clone().sub(a)), q => 0.1 - 0.012 * q, 24, 16), std(CREAM, { roughness: 0.95 }), forearmR, null, null, CREAM_INK);
        forearmR.userData.v0 = c.clone().sub(a);
      }

      /* ======================= belt: dark olive band, gold medallion, red cord with a jade bead ======================= */
      {
        const beltG = K.beltG, yT = 1.245, yB = 1.105, yK = 1.175;
        const bm = std(BELT, { roughness: 0.8, side: THREE.DoubleSide });
        const band = mesh(new THREE.CylinderGeometry(coatR(yT) + 0.035, coatR(yB) + 0.035, yT - yB, 96, 1, true), bm, beltG, [0, yK, 0], null, '#5E4E30');
        band.scale.z = 1;
        const gm = std(GOLD, { roughness: 0.45, metalness: 0.1 });
        [yT, yB].forEach(y => { const r = mesh(new THREE.TorusGeometry(coatR(y) + 0.04, 0.013, 8, 128), gm, beltG, [0, y, 0]); r.rotation.x = Math.PI / 2; });
        const zK = coatR(yK) + 0.05;
        K.medal(beltG, [-0.05, yK, zK], 0.09, (g) => {
          g.fillStyle = M('#F8C674', 1.3); g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.fill();
          D.flower(g, 128, 128, 70, M('#FCDD9E', 1.3), M('#E9A94E'), 8);
          g.strokeStyle = M('#D99A44'); g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 108, 0, Math.PI * 2); g.stroke();
        }, GOLD, GOLD_INK, M('#FAD08A', 1.3));
        // gold leaf ornaments on the band
        const leafS = new THREE.Shape(); leafS.moveTo(-0.075, 0); leafS.quadraticCurveTo(-0.02, 0.045, 0.075, 0); leafS.quadraticCurveTo(-0.02, -0.045, -0.075, 0);
        [-1, 1].forEach(sx => {
          const x = -0.05 + sx * 0.17, a = Math.asin(x / (coatR(yK) + 0.04));
          const lg = group(beltG, [Math.sin(a) * (coatR(yK) + 0.045), yK, Math.cos(a) * (coatR(yK) + 0.045)], [0, a, 0]);
          const l = mesh(extrude(leafS, 0.02, 0.006, 2, 12), gm, lg, null, null, GOLD_INK); l.rotation.z = sx > 0 ? 0 : Math.PI;
        });
        // red cord loops, jade bead and tassel hanging on the image-left
        const cm = std(RED, { roughness: 0.8 });
        const onC = (x, y, off) => { const r = coatR(y) * zsc(y) + off; return V(x, y, Math.sqrt(Math.max(r * r - x * x, 0.01))); };
        mesh(tube([onC(-0.2, 1.11, 0.03), onC(-0.3, 1.02, 0.05), onC(-0.34, 0.93, 0.06)], 0.016, 24, 8), cm, beltG, null, null, RED_INK);
        mesh(tube([onC(-0.24, 1.11, 0.03), onC(-0.42, 1.0, 0.04), onC(-0.5, 0.9, 0.05), onC(-0.44, 0.98, 0.06), onC(-0.36, 1.08, 0.04)], 0.014, 36, 8), cm, beltG, null, null, RED_INK);
        const jp = onC(-0.34, 0.84, 0.08);
        mesh(sphere(0.058, 24, 18), std(JADE, { roughness: 0.35 }), beltG, jp, null, M('#8FA070'));
        const tas = K.tassel(beltG, [jp.x, jp.y - 0.08, jp.z], RED, 0.25, 0.045, RED_INK);
        K.onTick((t, k) => { tas.rotation.z = 0.08 * Math.sin(t * 1.7) * k; });
      }

      /* ======================= 青龍偃月刀 in the image-left paw ======================= */
      glaiveG = part('glaive', K.body);
      {
        const B = V(X(182), Y(452), 0.76), Tt = V(X(120), Y(245), 0.32);
        const dir = Tt.clone().sub(B).normalize();
        const axisAt = (y) => B.clone().addScaledVector(dir, (y - B.y) / dir.y);
        const orient = (m) => { m.quaternion.setFromUnitVectors(V(0, 1, 0), dir); return m; };
        const gm = std(GOLD, { roughness: 0.45, metalness: 0.12 });
        // pole
        mesh(tube([axisAt(Y(440)), Tt], 0.034, 40, 14), std(POLE, { roughness: 0.75 }), glaiveG, null, null, POLE_INK);
        // bottom ferrule (gold cap with a point) and a gold ring
        orient(mesh(new THREE.CylinderGeometry(0.046, 0.04, 0.06, 20), gm, glaiveG, axisAt(Y(437)), null, GOLD_INK));
        orient(mesh(new THREE.CylinderGeometry(0.04, 0.008, 0.13, 20), gm, glaiveG, axisAt(Y(446)), null, GOLD_INK));
        orient(mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.1, 20), gm, glaiveG, axisAt(Y(381)), null, GOLD_INK));
        // top collar
        orient(mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.2, 24), gm, glaiveG, axisAt(Y(236)), null, GOLD_INK));
        orient(mesh(new THREE.TorusGeometry(0.064, 0.016, 8, 24), gm, glaiveG, axisAt(Y(226)), null, GOLD_INK)).rotateX(Math.PI / 2);
        // gold 吞口 mount: a bulb with scrolls
        const mc = axisAt(Y(210));
        mesh(sphere(0.12, 28, 20), gm, glaiveG, mc, [1.3, 0.95, 0.85], GOLD_INK);
        const scroll = (c, R, turns, flip) => {
          const pts = [];
          for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI * 2 * turns, r = R * (1 - 0.7 * i / 30); pts.push([c.x + flip * Math.cos(a) * r, c.y + Math.sin(a) * r, c.z + 0.02]); }
          return mesh(tube(pts, t => 0.032 * (1 - 0.6 * t) + 0.004, 40, 10), gm, glaiveG, null, null, GOLD_INK);
        };
        scroll(V(X(88), Y(212), mc.z), 0.075, 1.1, -1);
        scroll(V(X(130), Y(194), mc.z), 0.07, 1.1, 1);
        scroll(V(X(120), Y(222), mc.z + 0.04), 0.05, 1.0, 1);
        scroll(V(X(96), Y(222), mc.z + 0.04), 0.045, 1.0, -1);
        // the blade (flat, facing the viewer) — outline traced from the picture
        const bz = axisAt(Y(205)).z;
        const bladeG = group(glaiveG, [X(108), Y(205), bz], [-0.13, 0, 0]);
        const pxL = ([xp, yp]) => [(xp - 108) / 125, (205 - yp) / 125];
        const outline = [[96, 206], [88, 198], [75, 186], [62, 172], [52, 156], [46, 138], [44, 118], [46, 98], [53, 78], [65, 60], [80, 46], [96, 37], [111, 33],
          [104, 45], [99, 60], [97, 80], [97, 100], [99, 120], [102, 140], [107, 160], [113, 180], [118, 200], [110, 206]];
        const sh = new THREE.Shape(); outline.map(pxL).forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath();
        const btex = canvasTex(512, 1024, (g) => {
          g.setTransform(5.12, 0, 0, 5.12, -33 * 5.12, -17.5 * 5.12);
          g.fillStyle = BLADE; g.fillRect(0, 0, 200, 260);
          // whitish cutting edge along the outer curve
          g.strokeStyle = BLADE_EDGE; g.lineWidth = 17; g.lineJoin = 'round'; g.lineCap = 'round';
          g.beginPath(); outline.slice(0, 13).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
          // green dragon-cloud swirls along the spine
          // faint green tint toward the spine
          const tg = g.createLinearGradient(60, 0, 105, 0); tg.addColorStop(0, 'rgba(160,180,140,0)'); tg.addColorStop(1, 'rgba(160,180,140,0.35)');
          g.fillStyle = tg; g.fillRect(40, 30, 80, 180);
          g.fillStyle = SWIRL; g.strokeStyle = SWIRL; g.lineCap = 'round'; g.lineJoin = 'round';
          // a coiling cloud-dragon band hugging the spine
          g.beginPath(); g.moveTo(98, 66);
          [[88, 78], [84, 92], [90, 104], [82, 116], [80, 130], [90, 140], [86, 154], [88, 168], [96, 178], [94, 190], [104, 200], [118, 200], [113, 180], [107, 160], [102, 140], [99, 120], [97, 100], [97, 80]].forEach(([x, y]) => g.lineTo(x, y));
          g.closePath(); g.fill();
          g.lineWidth = 8;
          [[76, 104, 9], [74, 146, 9], [82, 178, 8]].forEach(([x, y, r]) => {
            g.beginPath(); g.arc(x, y, r, Math.PI * 0.05, Math.PI * 1.7); g.stroke();
            g.beginPath(); g.moveTo(x + r, y + 2); g.quadraticCurveTo(x + r + 4, y + 8, x + 16, y + 6); g.stroke();
          });
          g.fillStyle = SWIRL_LT; g.strokeStyle = SWIRL_LT; g.lineWidth = 3.5;
          [[76, 104, 4], [74, 146, 4], [82, 178, 3.5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 1.6); g.stroke(); });
          g.beginPath(); g.moveTo(96, 84); g.quadraticCurveTo(90, 100, 96, 114); g.quadraticCurveTo(88, 132, 96, 146); g.quadraticCurveTo(92, 164, 100, 176); g.stroke();
        });
        btex.repeat.set(1 / 0.8, 1 / 1.6); btex.offset.set(0.6 / 0.8, 0.1 / 1.6);
        mesh(extrude(sh, 0.036, 0.012, 3, 16), [texMat(btex, { roughness: 0.4, metalness: 0.08 }), std(M('#CFC8A8', 1.2), { roughness: 0.5 })], bladeG, null, null, M('#B8925E'));
        // gold spiral knob on the back of the blade
        const kp = pxL([108, 116]);
        const pts = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI * 2.2, r = 0.062 * (1 - 0.72 * i / 30); pts.push([kp[0] + Math.cos(a) * r, kp[1] + Math.sin(a) * r, 0.035]); }
        mesh(tube(pts, t => 0.026 * (1 - 0.5 * t) + 0.004, 40, 10), gm, bladeG, null, null, GOLD_INK);
        mesh(sphere(0.045, 20, 14), gm, bladeG, [kp[0] + 0.01, kp[1] - 0.005, 0.0], [1, 1, 0.8], GOLD_INK);
      }

      /* ======================= feathery plume tufts on the tail, paw creases ======================= */
      {
        const T = K.cfg.tail, base = V(T.pts[0][0], T.pts[0][1], T.pts[0][2]);
        const tc = K.curve3(T.pts.map(q => V(q[0], q[1], q[2]).sub(base)));
        const ctr = V(0.9, 0.9, -0.4).sub(base);   // centre of the curl
        const tm = std(TAIL, { roughness: 0.95 }), tt = std(M('#F2CFA6', 1.2), { roughness: 0.95 });
        for (let i = 0; i < 10; i++) {
          const t = 0.3 + i * 0.052, p = tc.getPointAt(Math.min(t, 1)), d = tc.getTangentAt(Math.min(t, 1));
          const out = p.clone().sub(ctr); out.z = 0; out.normalize();
          const side = i % 2 ? 1 : 0.55, r = T.r * T.shape(t);
          const root = p.clone().addScaledVector(out, r * 0.8 * side).add(V(0, 0, (i % 3 - 1) * 0.08));
          const dir = d.clone().addScaledVector(out, 0.32).normalize();
          const len = 0.17 + 0.05 * Math.sin(i * 1.7);
          const b = root.clone().addScaledVector(dir, len * 0.55).addScaledVector(out, 0.03), c = root.clone().addScaledVector(dir, len).addScaledVector(out, 0.02);
          // a tuft that stays entirely inside the plume is invisible and floats (never crosses the tail surface): skip it
          const tuftC = K.curve3([root, b, c]);
          let buried = true;
          for (let k = 0; k <= 12 && buried; k++) {
            const q = k / 12, s = tuftC.getPointAt(q), rho = 0.09 * (1 - Math.pow(q, 1.1)) + 0.004;
            let dMin = 1e9, rAt = 0;
            for (let m = 0; m <= 200; m++) { const d = tc.getPointAt(m / 200).distanceTo(s); if (d < dMin) { dMin = d; rAt = T.r * T.shape(m / 200); } }
            if (dMin + rho > rAt - 0.005) buried = false;
          }
          if (buried) continue;
          mesh(tube([root, b, c], q => 0.09 * (1 - Math.pow(q, 1.1)) + 0.004, 14, 10), i % 4 === 1 ? tt : tm, K.tailG, null, null, TAIL_INK);
        }
        // tip flick
        const tp = tc.getPointAt(1), td = tc.getTangentAt(1);
        mesh(tube([tp.clone().addScaledVector(td, -0.1), tp.clone().addScaledVector(td, 0.08).add(V(0, 0.03, 0)), tp.clone().addScaledVector(td, 0.2).add(V(0.02, 0.1, 0))], q => 0.1 * (1 - q) + 0.005, 16, 10), tm, K.tailG, null, null, TAIL_INK);
        const cm = std('#C99A7C', { roughness: 0.8 });
        { // image-left paw wrapped round the pole: two finger creases
          const p = K.hands.L.p, s = 1.4;
          [-0.035, 0.035].forEach(dx => mesh(tube([[p.x + dx * s, p.y + 0.02, p.z + 0.108 * s], [p.x + dx * s * 1.1, p.y - 0.04, p.z + 0.1 * s], [p.x + dx * s * 1.2, p.y - 0.085, p.z + 0.07 * s]], 0.007, 8, 5), cm, K.poseG));
        }
        { // image-right fist: curled fingers facing the beard (short horizontal creases) and a thumb on top
          const p = K.hands.R.p, a = 0.186 * 0.84, b = 0.186 * 0.88 * 1.08, c = 0.186 * 0.95;
          const onFist = (dx, dy, off) => { const q = 1 - (dx / a) ** 2 - (dy / b) ** 2; return V(p.x + dx, p.y + dy, p.z + c * Math.sqrt(Math.max(q, 0.02)) + off); };
          [0.02, -0.05].forEach(dy => creasesR.push(mesh(tube([onFist(-0.13, dy + 0.012, 0), onFist(-0.09, dy, 0.004), onFist(-0.045, dy - 0.004, 0.004)], 0.007, 10, 5), cm, K.poseG)));
          const th = mesh(sphere(0.06, 20, 14), std(CREAM, { roughness: 0.95 }), K.poseG, onFist(-0.05, 0.1, -0.035), [1.3, 0.75, 0.9], CREAM_INK);
          th.rotation.z = 0.35; creasesR.push(th);
        }
      }

      /* ======================= boots: olive-green boots with white paw toes ======================= */
      const bootsG = part('boots', K.poseG);
      {
        const bm = std(BOOT, { roughness: 0.8 }), pm = std(CREAM, { roughness: 0.95 }), gm = std(GOLD, { roughness: 0.5 }), cm = std('#C9A07C', { roughness: 0.8 });
        [-1, 1].forEach(sx => {
          const bg = group(bootsG, [0.34 * sx, 0, 0.5]);
          mesh(sphere(0.2, 32, 24), bm, bg, [0, 0.14, 0], [1.0, 0.75, 1.15], BOOT_INK);
          mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.3, 24), bm, bg, [0, 0.3, -0.03], null, BOOT_INK);
          const toe = group(bg, [0.14 * sx, 0, 0.16], [0, 0.35 * sx, 0]);
          mesh(sphere(0.18, 32, 24), pm, toe, [0, 0.12, 0.02], [1.05, 0.7, 0.95], CREAM_INK);
          const ring = mesh(new THREE.TorusGeometry(0.155, 0.018, 8, 40), gm, toe, [0, 0.14, -0.06], [1.05, 0.8, 1], GOLD_INK);
          ring.rotation.x = -0.3;
          [-0.06, 0.06].forEach(dx => mesh(tube([[dx, 0.2, 0.17], [dx * 1.05, 0.13, 0.19], [dx * 1.1, 0.06, 0.17]], 0.007, 8, 5), cm, toe));
        });
      }

      /* ======================= floating early-summer decorations ======================= */
      {
        const items = [];
        // sun (upper right)
        {
          const sg = group(K.decor, [1.85, 3.3, -0.3]);
          const sm = std(M('#FCC56A', 1.3), { roughness: 0.6, emissive: new THREE.Color(M('#FCC56A', 1.3)).convertSRGBToLinear(), emissiveIntensity: 0.25 });
          mesh(sphere(0.28, 32, 20), sm, sg, null, [1, 1, 0.35], GOLD_INK);
          for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2, r = mesh(K.dropGeo(0.2, 0.08, 1.8), sm, sg, [Math.sin(a) * 0.42, Math.cos(a) * 0.42, 0], [1, 1, 0.4], GOLD_INK);
            r.rotation.z = -a;
          }
          items.push(sg);
        }
        // dragonflies
        const dragonfly = (pos, rz, s) => {
          const g = group(K.decor, pos, [0, 0, rz]); g.scale.setScalar(s);
          const bm = std(M('#EE7A4A'), { roughness: 0.6 });
          // slim abdomen along +y, thorax and head at the bottom
          mesh(tube([[0, 0.02, 0], [0, 0.3, 0], [0, 0.6, 0]], t => 0.03 * (1 - 0.45 * t) + 0.008, 24, 8), bm, g, null, null, RED_INK);
          mesh(sphere(0.05, 16, 12), bm, g, [0, -0.02, 0], [1, 1.3, 1], RED_INK);
          mesh(sphere(0.045, 16, 12), bm, g, [0, -0.1, 0], null, RED_INK);
          const wm = std(M('#FFFDF6', 1.05), { roughness: 0.3, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
          const wingS = new THREE.Shape(); wingS.moveTo(0, 0); wingS.quadraticCurveTo(0.12, 0.07, 0.34, 0.035); wingS.quadraticCurveTo(0.38, 0.0, 0.3, -0.03); wingS.quadraticCurveTo(0.12, -0.04, 0, 0);
          const wg = extrude(wingS, 0.01, 0.003, 1, 16);
          [[-1, 0.0, 0.18], [1, 0.0, 0.18], [-1, -0.05, -0.1], [1, -0.05, -0.1]].forEach(([k, y, a]) => {
            const w = mesh(wg, wm, g, [0, y, 0.01], [k, 1, 1], '#D8C4A6'); w.rotation.z = k * a;
          });
          return g;
        };
        items.push(dragonfly([1.95, 2.55, 0.1], -2.35, 1.0));
        items.push(dragonfly([-1.95, 1.6, 0.35], 2.4, 0.95));
        // lotus leaf on a stem (lower left)
        {
          const lg = group(K.decor, [-1.9, 0.82, 0.35], [0.9, 0.2, 0.2]); lg.scale.setScalar(0.88);
          const lm = texMat(canvasTex(512, 128, (g, w, h) => {
            D.fill(g, M('#A7BC7C')); g.fillStyle = M('#BFD096', 1.3); g.fillRect(0, 0, w, h * 0.35);
            g.strokeStyle = M('#8DA565'); g.lineWidth = 5; for (let i = 0; i < 11; i++) { const x = (i + 0.5) / 11 * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
          }), { roughness: 0.8, side: THREE.DoubleSide });
          const leaf = lathe([[0.001, 0.06], [0.2, 0.03], [0.36, -0.01], [0.44, 0.02]], 48, 0.2, Math.PI * 2 - 0.4, 16);
          mesh(leaf.geo, lm, lg, null, null, LEAF_DK);
          mesh(tube([[0, 0.05, 0], [0.02, -0.25, 0.06], [0.05, -0.5, 0.1]], 0.022, 16, 8), std(LEAF_DK, { roughness: 0.8 }), lg);
          items.push(lg);
        }
        // pink lotus bud (right)
        {
          const bg = group(K.decor, [1.95, 1.35, 0.2], [0, 0, 0.15]);
          const pk = std(M('#F7B3A4', 1.3), { roughness: 0.7 });
          mesh(K.dropGeo(0.36, 0.16, 1.6), pk, bg, [0, 0.12, 0], null, '#D98A7C');
          [-1, 1].forEach(k => { const p = mesh(K.dropGeo(0.28, 0.1, 1.8), std(M('#F9C8BA', 1.3), { roughness: 0.7 }), bg, [k * 0.08, 0.06, 0.05], [1, 1, 0.5], '#D98A7C'); p.rotation.z = -k * 0.45; });
          [-1, 1].forEach(k => { const s = mesh(K.dropGeo(0.14, 0.06, 1.6), std(LEAFG, { roughness: 0.8 }), bg, [k * 0.08, 0.0, 0.03], [1, 1, 0.5], LEAF_DK); s.rotation.z = -k * 1.2; });
          mesh(tube([[0, -0.02, 0], [0.03, -0.3, 0], [0.0, -0.6, 0]], 0.02, 16, 8), std(LEAFG, { roughness: 0.8 }), bg);
          items.push(bg);
        }
        // golden wheat ears
        const wheat = (pos, rz) => {
          const g = group(K.decor, pos, [0, 0, rz]);
          const wm = std(M('#F7C168', 1.3), { roughness: 0.7 });
          mesh(tube([[0, -0.4, 0], [0.02, -0.1, 0], [0, 0.25, 0]], 0.012, 12, 6), wm, g);
          for (let i = 0; i < 5; i++) [-1, 1].forEach(k => { const e = mesh(sphere(0.05, 12, 10), wm, g, [k * 0.045, -0.02 + i * 0.07, 0], [0.8, 1.5, 0.7], GOLD_INK); e.rotation.z = -k * 0.4; });
          mesh(sphere(0.045, 12, 10), wm, g, [0, 0.34, 0], [0.8, 1.5, 0.7], GOLD_INK);
          const lf = mesh(K.leafGeo(0.3, 0.07), std(LEAF_LT, { roughness: 0.8, side: THREE.DoubleSide }), g, [0, -0.3, 0.01]); lf.rotation.z = -0.9;
          return g;
        };
        items.push(wheat([-2.1, 2.9, -0.1], 0.2));
        items.push(wheat([1.95, 0.45, 0.25], -0.35));
        items.push(wheat([-1.55, 0.22, 0.4], 0.35));
        items.forEach((g) => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.08 * Math.sin(t * 0.8 + i) * k;
        }));
      }
    },

    action: {
      label: '撫鬚', dur: 2.0,
      run(s, p, K) {
        if (pawR && pawR0) {
          const dy = -0.18 * (0.5 - 0.5 * Math.cos(Math.PI * 4 * p)) * s, dx = -0.03 * s;
          pawR.position.set(pawR0.x + dx, pawR0.y + dy, pawR0.z);
          creasesR.forEach(c => { if (!c.userData.p0) c.userData.p0 = c.position.clone(); c.position.copy(c.userData.p0).add(K.V(dx, dy, 0)); });
          if (forearmR) { // the forearm pivots in the sleeve so its wrist end follows the fist
            const v0 = forearmR.userData.v0, v1 = v0.clone().add(K.V(dx, dy, 0));
            forearmR.quaternion.setFromUnitVectors(v0.clone().normalize(), v1.normalize());
          }
        }
        if (beardG) beardG.rotation.z = 0.03 * Math.sin(p * Math.PI * 4) * s;
        K.headG.rotation.x = -0.08 * s;
        if (glaiveG) glaiveG.rotation.z = 0.02 * s;
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '立夏的美髯關公',
        text: '立夏是夏季的開端，萬物至此長大、陽氣旺盛。橘紅長毛的挪威森林貓化身紅臉長髯的關公：戴綠頭巾帽、披綠袍，畫面左手握青龍偃月刀、右手撫著長鬍鬚，以關公綠、朱紅與暖金呼應初夏的草木與烈日。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '橘紅臉與白眉斑',
        text: '頭頂到眼周是關公般的橘紅色，眼睛上方各有一塊斜斜的奶油白橢圓眉斑，讓表情顯得認真威武。深棕大圓眼、小巧的珊瑚色鼻子、「ω」形小嘴，腮紅上點著兩顆小點；兩頰到下巴是一圈奶白色的蓬鬆長毛，上側夾雜灰棕長毛。' },
      beard: { chip: '長鬚', tag: '貓咪本體', name: '美髯',
        text: '從嘴下垂下一大束深褐色長鬍鬚，一路長到腰帶上方，末端微微往回捲；嘴角兩側還有淺褐色的月牙形鬢鬚。畫面右手握拳托在鬍鬚旁，正是關公招牌的撫鬚動作，可按「撫鬚」觀看。' },
      hat: { chip: '頭巾帽', tag: '服飾', name: '綠頭巾帽與紅纓',
        text: '墨綠色的圓頂武將帽，下緣鑲金邊、額前拱起一道小弧，露出一撮額毛。帽身正面畫著金色太陽，兩側各一枝綠葉；帽頂金環上頂著朱紅絨球，一條長長的紅帶從右後方飄出，腦後還垂著綠色巾尾。' },
      glaive: { chip: '偃月刀', tag: '道具', name: '青龍偃月刀',
        text: '畫面左手握著比身體還高的青龍偃月刀：深褐長柄配金色鐵鐏與金環，刀頭下方是金色捲雲吞口。月牙形的大刀刃呈淡青灰色、刃口泛白，刀背一路盤著青綠色的雲龍紋，背上還有一顆金色捲鈕。' },
      robe: { chip: '外袍', tag: '服飾', name: '綠袍與朱紅內裙',
        text: '綠色對襟外袍在腰下左右分開，米白寬邊從前襟一路鑲到下襬，露出裡面的朱紅百褶內裙與金色裙邊。袍身繡著金黃麥穗、太陽、祥雲與綠葉枝；胸前是紅底米白邊的交領，肩上是鑲金色鋸齒邊的雲肩。' },
      sleeves: { chip: '大袖', tag: '服飾', name: '綠肩米白大袖',
        text: '袖子上半截是綠色，下半截接一大片米白寬袖，一路垂到腰下，袖口內裡是朱紅色。畫面左袖繡著綠色捲草，右袖有金黃麥穗與一片荷葉，呼應立夏「螻蟈鳴、蚯蚓出、王瓜生」的初夏田野。' },
      belt: { chip: '腰帶', tag: '服飾', name: '墨綠腰帶與玉珮',
        text: '墨綠色寬腰帶上下壓著金線，正中是一枚金色花形圓扣，兩旁各有金色葉片飾。畫面左側垂下一條朱紅繩結，串著一顆青玉圓珠，下面接紅色流蘇。' },
      boots: { chip: '靴子', tag: '服飾', name: '綠靴白爪',
        text: '腳上穿著橄欖綠短靴，前端露出圓滾滾的白色腳爪，交界處鑲一圈金邊，站姿穩重。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '蓬鬆大尾', dir: [1, 0.25, -0.7],
        text: '挪威森林貓招牌的超大蓬鬆尾巴，從袍後的右側往外、再往上捲起，毛色是奶油米白，內側帶一片淡淡的駝色。' }
    },
    order: ['overview', 'face', 'beard', 'hat', 'glaive', 'robe', 'sleeves', 'belt', 'boots', 'tail']
  });
})();
