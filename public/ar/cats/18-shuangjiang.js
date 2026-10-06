// @file 18_霜降_兔猻
// @title 霜降・霜刃將軍 | 二十四節氣貓
(function () {
  /* ---------------------------------------------------------------------------
   * 18 霜降 — Pallas's cat (兔猻) frost general with twin sabres.
   * Picture scale: 1 unit ≈ 106 px of refs/18.png, feet at y = 0, body axis at px x = 250.
   * Colours are SAMPLED from the picture; def.exposure dims the lights so they render close to it.
   * ------------------------------------------------------------------------- */
  const HY = 3.06, NECK = 2.4;
  const FUR = '#C6B4A8', FUR_TOP = '#A99789', FUR_MID = '#C3B1A5', FUR_LOW = '#DCCDC2';
  const SPOT = '#6F5E57', STRIPE = '#7F6E66', CREAM = '#FAF2E8', WHITE = '#FFFBF5';
  const INK = '#8A7468', CREAM_INK = '#CDB8A6';
  const CAPE = '#8991A4', CAPE_INK = '#5C6070', LINING = '#F4E6D6';
  const GOLD = '#E2C08C', GOLD_DK = '#C9A36C', GOLD_INK = '#A07E4C';
  const MAPLE = '#E0785C', MAPLE_LT = '#EC956E', MAPLE_INK = '#B0513A', RED = '#D46A55', RED_INK = '#9C4A3A';
  const VEST = '#8A776F', SKIRT = '#B3A39A', SKIRT_INK = '#6E5E58', HEMC = '#EEE2D8';
  const ROBE = '#FAEFE1', ROBE_INK = '#B9A48F', SLEEVE = '#FAF1E6', SWIRL = '#AFBACB';
  const JADE = '#C6CFC5', SILVER = '#C4C6CB', CRYSTAL = '#C4CEDD', CRYSTAL_INK = '#6F7A8E';
  const BLADE = '#A4B1C7', BLADE_LT = '#E2E8F1', BLADE_INK = '#5E6A86', GRIP = '#46403F';
  const BOOT = '#7B7372', BOOT_DK = '#5F5857', SOLE = '#F1DEC8', LEG = '#BFAFA7', LEG_INK = '#8F7F78';
  const TAIL = '#9E8A80', TAIL_DK = '#645249', TAIL_TIP = '#F3E8DE';

  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rad = d => d * Math.PI / 180;

  // five-lobed maple leaf outline in polar form: [angle from the leaf axis (deg), radius]
  const MAPLE_PTS = [[-180, 0.1], [-140, 0.3], [-114, 0.66], [-98, 0.46], [-84, 0.38], [-70, 0.66], [-55, 0.97], [-42, 0.62], [-27, 0.4], [-14, 0.68], [0, 1.0],
    [14, 0.68], [27, 0.4], [42, 0.62], [55, 0.97], [70, 0.66], [84, 0.38], [98, 0.46], [114, 0.66], [140, 0.3]];
  const maplePoly = (s) => MAPLE_PTS.map(([a, r]) => [Math.sin(rad(a)) * r * s, Math.cos(rad(a)) * r * s - 0.12 * s]); // y up
  function mapleC(g, x, y, s, rot, color, vein) { // canvas maple leaf (canvas y down)
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.fillStyle = color; g.beginPath();
    maplePoly(s).forEach(([px, py], i) => (i ? g.lineTo(px, -py) : g.moveTo(px, -py))); g.closePath(); g.fill();
    if (vein) {
      g.strokeStyle = vein; g.lineWidth = Math.max(1, s * 0.05); g.lineCap = 'round';
      [[0, 0.8], [-55, 0.72], [55, 0.72], [-114, 0.5], [114, 0.5]].forEach(([a, r]) => { g.beginPath(); g.moveTo(0, 0.12 * s); g.lineTo(Math.sin(rad(a)) * r * s, -Math.cos(rad(a)) * r * s + 0.12 * s); g.stroke(); });
      g.beginPath(); g.moveTo(0, 0.12 * s); g.lineTo(0, 0.45 * s); g.stroke();
    }
    g.restore();
  }
  function swirlC(g, x, y, s, color, lw, flip) { // pale "wind" curl used on sleeves and the apron
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
    g.strokeStyle = color; g.lineWidth = lw || s * 0.12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-s, s * 0.35); g.bezierCurveTo(-s * 0.3, s * 0.45, s * 0.3, s * 0.1, s * 0.3, -s * 0.2);
    g.arc(s * 0.05, -s * 0.2, s * 0.25, 0, Math.PI * 1.4, true); g.stroke();
    g.restore();
  }
  function flakeC(g, x, y, s, color, lw) { // six-armed snowflake with a small hexagon core
    g.save(); g.translate(x, y); g.strokeStyle = color; g.lineWidth = lw || Math.max(2, s * 0.09); g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate(i * Math.PI / 3);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s);
      [0.45, 0.72].forEach(k => { g.moveTo(0, -s * k); g.lineTo(s * 0.2, -s * (k + 0.18)); g.moveTo(0, -s * k); g.lineTo(-s * 0.2, -s * (k + 0.18)); });
      g.stroke(); g.restore();
    }
    g.restore();
  }

  NEKO.run({
    meta: {
      id: '18', term: '霜降', title: '霜降・霜刃將軍', seal: '霜',
      eyebrow: '二〇二七節氣貓 · 18 霜降 · 兔猻',
      aria: '頭戴銀色冰晶冠、冠旁插紅楓葉，披灰藍短披風、身穿米白楓葉雪花袍與灰色裙甲，雙手各握一把刻有雪花的淡藍彎刀向外斜垂，身後拖著粗大環紋尾巴、表情臭臉的灰色兔猻 3D 模型'
    },
    theme: { accent: '#5B6478', accentDark: '#B9C1D3', glow: 'rgba(185, 193, 211, 0.32)', glowColor: '#C9D3E6' },
    palette: [['#CDB9AA', '兔猻灰褐'], ['#9A9EA9', '霜藍灰'], ['#E0785C', '楓葉紅'], ['#E2C08C', '淡金']],
    spec: [['品種', '兔猻（Pallas 貓）'], ['角色', '霜刃將軍'], ['頭身比', '約 1 : 1.6']],
    seed: 1018,
    exposure: 0.82,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR_MID, low: FUR_LOW, deep: STRIPE, cream: CREAM,
        ink: INK, creamInk: CREAM_INK, noise: { colors: ['#F7EDE3', '#A8958A'], alpha: 0.06, n: 1400 },
        paintBase(g, P) {
          const L = (lon, lat) => P.xy(lon, lat);
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.3, FUR_TOP); vg.addColorStop(0.55, FUR_MID); vg.addColorStop(0.78, FUR_LOW); vg.addColorStop(1, '#EDE2D8');
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // pale cream lower face + chin ruff (starts right under the eyes)
          const half = [[0, -6], [9, -5], [20, -9], [32, -10], [44, -12], [56, -18], [66, -28], [76, -44], [86, -64], [96, -90]];
          const poly = half.concat(half.slice().reverse().map(([lo, la]) => [-lo, la]));
          g.filter = 'blur(7px)'; g.fillStyle = '#FFF9F1'; g.beginPath();
          poly.forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill();
          // lighter fur tips all round the lower head
          const lg = g.createLinearGradient(0, L(0, -35)[1], 0, 512);
          lg.addColorStop(0, 'rgba(240,230,220,0)'); lg.addColorStop(1, 'rgba(240,230,220,0.9)');
          g.filter = 'none'; g.fillStyle = lg; g.fillRect(0, L(0, -35)[1], 1024, 512);
          // forehead spots (two rows + central dash), as drawn
          g.filter = 'blur(1.6px)';
          const spot = (lon, lat, rx, ry, rot, a) => { const [x, y] = L(lon, lat); P.blob(g, x, y, rx, ry, SPOT, a || 0.9, rot || 0); };
          [[-40, 54, 16, 12], [-19, 50, 23, 16], [-5, 55, 12, 10], [15, 50, 23, 16], [37, 55, 16, 12],
            [-28, 37, 18, 13], [26, 37, 18, 13], [-11, 27, 12, 9], [9, 27, 12, 9], [-56, 40, 15, 11], [56, 40, 15, 11],
            [-62, 60, 13, 9], [62, 60, 13, 9], [-26, 68, 14, 10], [24, 68, 14, 10], [0, 72, 13, 9]].forEach(([lo, la, rx, ry]) => spot(lo, la, rx, ry, 0.2 * Math.sign(lo)));
          spot(0, 37, 8, 20, 0, 0.9);
          // dark streaks above the outer ends of the pale brows
          spot(-27, 19, 16, 6, -0.35, 0.8); spot(27, 19, 16, 6, 0.35, 0.8);
          // cheek stripes sweeping outward from the eye corners
          g.filter = 'blur(2.5px)';
          [[[30, 11], [48, 13], [68, 16]], [[40, -5], [58, -9], [78, -13]], [[54, -27], [67, -33], [83, -39]]].forEach((s, i) => {
            const p = s.map(([lo, la]) => L(lo, la));
            P.stroke(g, p, i === 0 ? 10 : 12, STRIPE, 0.9);
            P.stroke(g, P.mirror(p), i === 0 ? 10 : 12, STRIPE, 0.9);
          });
          // faint spots / bars on the back of the head
          g.filter = 'blur(3px)';
          [-150, -120, 120, 150, 180].forEach(lon => { spot(lon, 55, 12, 8, 0, 0.45); spot(lon + 12, 32, 10, 7, 0, 0.35); });
          [-100, 100].forEach(lon => P.stroke(g, [L(lon, 20), L(lon + 6 * Math.sign(lon), 0), L(lon + 10 * Math.sign(lon), -20)], 12, STRIPE, 0.5));
          g.filter = 'none';
        }
      },
      head: { y: HY, neck: NECK, w: 0.9, h: 0.72, d: 0.84, cheek: 0.16, ruff: 0.08, ruffFreq: 13, chinDrop: 0.04,
        // Pallas's cat: broad, flat-topped skull — lift the upper dome's shoulders
        deform(p, o) { if (o.y > 0) p.y *= 1 + 0.5 * (1 - o.y); else p.x *= 1 + 0.22 * sst(-0.15, -0.72, o.y); },
        fur: { layers: 22, length: 0.13, gravity: 0.03, repeat: [10, 6] } },
      eyes: { x: 0.31, y: 0.01, r: 0.128, sx: 1.0, sy: 0.98, sz: 0.4, color: '#5A3E30', iris: '#F0D09C', pupil: '#3A2820', pupilR: 0.64, shine: 1.0 },
      nose: { y: -0.11, color: '#E0948A', size: 1.0 },
      muzzle: { y: -0.2, size: 0.42, color: CREAM },
      mouth: { type: 'none' },
      blush: { color: 'rgba(240,140,135,0.7)', x: 0.44, y: -0.12, r: 30, after: true },
      whiskers: { color: '#5E534E', n: 3, len: 0.95, r: 0.0085, y: -0.2, x: 0.28, spread: 0.12, droop: 0.2, curve: 0.02 },
      ears: { x: 0.72, y: 0.4, z: -0.08, tilt: 0.88, yaw: 0.35, pitch: -0.1, size: [0.33, 0.37, 0.15], sharp: 0.55, innerScale: 0.9, tuftScale: 1.8,
        color: FUR, inner: '#E7C6B8', tuft: '#FBF4EC', fur: { layers: 10, length: 0.04, gravity: 0.01, repeat: [3, 3] } },
      bib: false,
      robe: {
        profile: [[1.1, 0.56], [1.06, 0.64], [0.94, 0.86], [0.79, 1.12], [0.66, 1.38], [0.62, 1.56], [0.64, 1.8], [0.64, 2.0], [0.56, 2.2], [0.36, 2.36], [0.12, 2.44]],
        color: '#FFFFFF', ink: SKIRT_INK, lining: '#E9DDD2', hemY: 0.75,
        paint(g, w, h, D, R) {
          const Y = y => R.robeV(y), X = deg => 512 + deg / 360 * 1024;
          const yBelt = Y(1.55);
          g.fillStyle = SKIRT; g.fillRect(0, yBelt, w, h - yBelt);
          g.fillStyle = VEST; g.fillRect(0, 0, w, yBelt);
          // cream inner robe at the chest, with gold vest edges
          g.fillStyle = ROBE; g.fillRect(X(-32), 0, X(32) - X(-32), yBelt);
          g.fillStyle = GOLD; g.fillRect(X(-34), 0, 9, yBelt); g.fillRect(X(32) - 3, 0, 9, yBelt);
          // skirt: gold stripes flanking the apron, red under-layer on the image-left
          g.fillStyle = RED; g.fillRect(X(-37), yBelt, X(-29) - X(-37), h - yBelt);
          g.fillStyle = GOLD; g.fillRect(X(-42), yBelt, X(-37) - X(-42), h - yBelt); g.fillRect(X(30), yBelt, X(35) - X(30), h - yBelt);
          // cream hem band with a gold line
          const yH = Y(0.74);
          g.fillStyle = HEMC; g.fillRect(0, yH, w, h - yH);
          g.fillStyle = GOLD; g.fillRect(0, yH - 10, w, 10);
          g.fillStyle = SKIRT_INK; g.fillRect(0, yH - 12, w, 3); g.fillRect(0, h - 8, w, 8);
          // snowflake and three-dot flower on the image-left panel, snowflakes on the back
          flakeC(g, X(-56), Y(1.02), 34, '#FFFFFF', 5);
          [[-66, 0.92], [-62, 0.88], [-67, 0.86]].forEach(([d, y]) => D.blob(g, X(d), Y(y), 6, 6, '#FFFFFF', 0.95));
          [150, 210].forEach((d, i) => flakeC(g, X(d), Y(1.0 + 0.1 * i), 30, 'rgba(255,255,255,0.85)', 4));
          mapleC(g, X(180), Y(1.2), 34, 0.2, MAPLE);
          // back hem swirls
          [120, 180, 240].forEach(d => swirlC(g, X(d), Y(0.66), 28, 'rgba(160,172,190,0.9)', 5));
        }
      },
      collar: false,
      arms: {
        L: { hand: [-1.04, 1.56, 0.38], path: [[-0.56, 2.1, 0.0], [-1.16, 1.8, -0.02], [-1.12, 1.62, 0.27]], drop: 0.9, width: 1.22, pawScale: 1.15 },
        R: { hand: [1.07, 1.52, 0.38], path: [[0.56, 2.1, 0.0], [1.18, 1.78, -0.02], [1.14, 1.58, 0.27]], drop: 0.9, width: 1.22, pawScale: 1.15 }
      },
      sleeves: {
        style: 'wide', color: '#FFFFFF', lining: '#EADCCB', trim: '#F3E7DA', trimR: 0.05, ink: ROBE_INK,
        paint(g, w, h, D) {
          D.fill(g, SLEEVE);
          // sparse all-over maple leaves and pale-blue wind curls (the bent sleeve shows different u bands on each side)
          for (let i = 0; i < 10; i++) {
            const u = (i + 0.5) / 10;
            [[0.22, i % 2], [0.5, (i + 1) % 2], [0.78, i % 2]].forEach(([v, kind], j) => {
              const x = u * w + (j % 2 ? 36 : -14), y = (1 - v) * h;
              g.save(); g.translate(x, y); g.rotate(-Math.PI / 2 + (j % 2 ? 0.3 : -0.2));
              if (kind) mapleC(g, 0, 0, 50, 0.2, MAPLE_LT, 'rgba(190,90,60,0.5)'); else swirlC(g, 0, 0, 56, SWIRL, 11, i % 3 === 0);
              g.restore();
            });
          }
          g.fillStyle = 'rgba(200,180,160,0.35)'; g.fillRect(0, 0, w, 14);
        }
      },
      paws: { color: CREAM, ink: CREAM_INK },
      belt: { yT: 1.63, yB: 1.49, color: '#7B6A63', line: GOLD, knot: false, ink: GOLD_INK, tassel: false },
      legs: null,
      feet: false,
      tail: {
        pts: [[0.3, 0.85, -0.5], [0.9, 0.86, -0.78], [1.38, 1.05, -0.8], [1.66, 1.45, -0.7], [1.74, 1.82, -0.58], [1.64, 2.05, -0.48]],
        r: 0.46, color: TAIL, deep: TAIL_DK, tip: TAIL_TIP, tipStart: 0.8, bands: 5, bandAlpha: 0.95, ink: INK,
        shape: t => Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * t)), 0.38) * (0.82 + 0.18 * sst(0, 0.35, t)),
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, TAIL); lg.addColorStop(0.88, '#B5A196'); lg.addColorStop(0.95, TAIL_TIP); lg.addColorStop(1, TAIL_TIP);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          // jagged dark rings
          g.fillStyle = TAIL_DK;
          [[0.2, 0.07], [0.33, 0.075], [0.46, 0.075], [0.59, 0.07], [0.71, 0.065], [0.82, 0.05]].forEach(([c, bw]) => {
            const x0 = (c - bw / 2) * w, x1 = (c + bw / 2) * w, n = 10;
            g.beginPath(); g.moveTo(x0, 0);
            for (let i = 0; i <= n; i++) g.lineTo(x0 + (i % 2 ? -12 : 8), i / n * h);
            for (let i = n; i >= 0; i--) g.lineTo(x1 + (i % 2 ? 12 : -8), i / n * h);
            g.closePath(); g.fill();
          });
        },
        fur: { layers: 16, length: 0.065, gravity: 0.015, repeat: [20, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, lathe, ribbon, D } = K;

      /* ======================= face details ======================= */
      K.headMesh.material.emissive = new THREE.Color('#FFFFFF');
      K.headMesh.material.emissiveMap = K.headTex;
      K.headMesh.material.emissiveIntensity = 0.1;
      const faceParts = K.muzzle.concat(K.headMesh);
      const onF = (x, y, off) => K.onSkin(x, y, faceParts).p.add(V(0, 0, off === undefined ? 0.008 : off));
      // inverted-Y grumpy mouth: short philtrum then two slanted strokes
      {
        const mm = std('#6B4A3E', { roughness: 0.6 });
        mesh(tube([onF(0, HY - 0.15), onF(0, HY - 0.2)], 0.011, 6, 8), mm, K.faceG);
        [-1, 1].forEach(sx => mesh(tube([onF(0, HY - 0.198), onF(0.05 * sx, HY - 0.225), onF(0.1 * sx, HY - 0.255)], 0.011, 12, 8), mm, K.faceG));
      }
      // paint pale brows, eye rims and blush freckles straight onto the head map
      {
        const g = K.headTex.image.getContext('2d');
        const at = (x, y) => { const s = K.onSkin(x, y, [K.headMesh]); return s.uv ? [s.uv.x * 1024, (1 - s.uv.y) * 512] : null; };
        g.save(); g.filter = 'blur(3px)';
        [-1, 1].forEach(sx => {
          // pale brow patch slanting down toward the nose (angry)
          const a = at(0.44 * sx, HY + 0.23), b = at(0.31 * sx, HY + 0.18), c = at(0.2 * sx, HY + 0.11);
          if (a && b && c) { D.stroke(g, [a, b, c].map(q => [q[0], q[1] - 10]), 12, '#8A776E', 0.5); D.stroke(g, [a, b, c], 15, WHITE, 1); }
          // light rim round each eye
          const e = at(0.31 * sx, HY + 0.01);
          if (e) { g.strokeStyle = 'rgba(255,250,244,0.9)'; g.lineWidth = 7; g.beginPath(); g.ellipse(e[0], e[1], 27, 40, 0, 0, Math.PI * 2); g.stroke(); }
        });
        g.filter = 'none';
        [-1, 1].forEach(sx => [[0.4, -0.115], [0.47, -0.105]].forEach(([x, y]) => {
          const p = at(x * sx, HY + y); if (!p) return;
          g.strokeStyle = 'rgba(214,110,100,0.8)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(p[0] - 3, p[1] + 4); g.lineTo(p[0] + 3, p[1] - 4); g.stroke();
        }));
        g.restore();
        K.headTex.needsUpdate = true;
      }
      // grumpy upper lids: a fur-coloured cap over the top of each eye with a dark slanted lid line
      {
        const EY = K.cfg.eyes, r = EY.r, lidMat = std('#EFE6DC', { roughness: 0.9 }), lineMat = std('#4A3328', { roughness: 0.6 });
        const beta = 0.3, thc = 1.2;
        K.eyes.forEach((eg, i) => {
          const sx = i === 0 ? -1 : 1, rz = sx * beta;
          const sg = group(eg, [0, 0, 0.003]); sg.scale.set(EY.sx * 1.04, EY.sy * 1.04, EY.sz * 1.35);
          const cap = mesh(new THREE.SphereGeometry(r, 36, 12, 0, Math.PI * 2, 0, thc), lidMat, sg);
          cap.rotation.z = rz; cap.castShadow = false;
          const pts = [];
          for (let k = 0; k <= 16; k++) {
            const ph = lerp(-0.12, Math.PI + 0.12, k / 16);
            const q = V(Math.sin(thc) * Math.cos(ph), Math.cos(thc), Math.sin(thc) * Math.sin(ph)).multiplyScalar(r * 1.02);
            q.applyAxisAngle(V(0, 0, 1), rz);
            q.set(q.x * EY.sx * 1.04, q.y * EY.sy * 1.04, Math.max(q.z, 0) * EY.sz * 1.35 + 0.004);
            pts.push(q);
          }
          mesh(tube(pts, t => 0.011 + 0.007 * Math.sin(Math.PI * t), 32, 8), lineMat, eg);
        });
      }

      /* ======================= crown (冰晶冠) ======================= */
      const crown = part('crown', K.head);
      crown.position.set(0, 3.72, 0.02);
      crown.rotation.x = -0.1;
      {
        const gray = std('#8F8B8E', { roughness: 0.6, metalness: 0.1 }), gold = std(GOLD, { roughness: 0.45, metalness: 0.15 });
        const silver = std(SILVER, { roughness: 0.3, metalness: 0.2 });
        // band: a short elliptic ring sitting in the fur, with a cap inside
        mesh(new THREE.CylinderGeometry(0.46, 0.49, 0.13, 64, 1, true), std('#A4A1A3', { roughness: 0.6, side: THREE.DoubleSide }), crown, [0, 0.09, 0], [1, 1, 0.82], '#6E6A6C');
        [[0.025, 0.49, 0.03], [0.155, 0.46, 0.02]].forEach(([y, r, t]) => { const m = mesh(new THREE.TorusGeometry(r, t, 8, 72), gold, crown, [0, y, 0], [1, 0.82, 1]); m.rotation.x = Math.PI / 2; });
        mesh(sphere(0.46, 40, 16), std('#8E8B8D', { roughness: 0.7 }), crown, [0, 0.13, 0], [0.98, 0.3, 0.8]);
        // gray side plates in broad gold frames flanking the crystal
        const plate = (sx) => {
          // outline in the plate's own frame (image-right plate; mirrored for the left one)
          const mk = q => { const r = q.map(([x, y]) => [x * sx, y]); return sx < 0 ? r.reverse() : r; };
          const out = mk([[-0.145, 0.1], [0.145, 0.1], [0.105, 0.48], [-0.145, 0.44]]);
          const inn = mk([[-0.115, 0.15], [0.1, 0.15], [0.075, 0.42], [-0.115, 0.39]]);
          const pz = group(crown, [0.245 * sx, 0, 0.24], [0, 0.4 * sx, 0]);
          mesh(extrude(out, 0.04, 0.012), gold, pz, null, null, GOLD_INK);
          mesh(extrude(inn, 0.05, 0.01), gray, pz, [0, 0, 0.012]);
        };
        plate(-1); plate(1);
        // tall faceted ice crystal: chamfered pentagon gem, flat-shaded so the facets read
        const crystalMat = std(CRYSTAL, { roughness: 0.3, flatShading: true });
        const gem = (w, h, pos, rz, sc) => {
          const shp = [[-w, 0], [0, -w * 0.6], [w, 0], [w, h * 0.55], [0, h], [-w, h * 0.55]];
          const geo = new THREE.ExtrudeGeometry(K.shapeFrom(shp), { depth: 0.02, bevelEnabled: true, bevelThickness: w * 0.45, bevelSize: w * 0.42, bevelSegments: 1, curveSegments: 1 });
          geo.translate(0, 0, -0.01); geo.computeVertexNormals();
          const c = group(crown, pos, [0, 0, rz]); c.scale.setScalar(sc || 1);
          mesh(geo, crystalMat, c, null, null, CRYSTAL_INK);
          mesh(tube([[0, h * 0.97, w * 0.47], [0, h * 0.4, w * 0.47], [0, 0, w * 0.47]], 0.006, 8, 5), std('#EEF3FA', { roughness: 0.3 }), c);
          return c;
        };
        gem(0.12, 0.46, [0, 0.21, 0.36], 0);
        gem(0.05, 0.2, [-0.15, 0.19, 0.4], 0.45);
        gem(0.05, 0.2, [0.15, 0.19, 0.4], -0.45);
        // pale silver wings sweeping from the pearl to the band ends
        [-1, 1].forEach(sx => mesh(tube([[0.06 * sx, 0.2, 0.47], [0.18 * sx, 0.27, 0.44], [0.3 * sx, 0.25, 0.38], [0.41 * sx, 0.13, 0.29]], t => 0.04 - 0.012 * t, 24, 8), std('#EDEDF0', { roughness: 0.4 }), crown, null, null, '#8E8B8D'));
        // pearl in a gold setting
        const pr = group(crown, [0, 0.17, 0.47]);
        mesh(new THREE.TorusGeometry(0.095, 0.03, 12, 40), gold, pr, null, null, GOLD_INK);
        mesh(sphere(0.08, 32, 24), std(JADE, { roughness: 0.25, metalness: 0.05 }), pr, [0, 0, 0.02], [1, 1, 0.8], '#8E978D');
        mesh(sphere(0.02, 12, 10), K.M.shine, pr, [-0.028, 0.032, 0.08]).castShadow = false;
        // silver balls on short stems at the band ends
        [[-0.58, 0.17, 0.15, 0.05], [-0.43, 0.07, 0.31, 0.045], [0.43, 0.07, 0.31, 0.045], [0.58, 0.17, 0.15, 0.05]].forEach(([x, y, z, rr]) => {
          mesh(tube([[x * 0.8, y - 0.03, z * 0.85], [x, y, z]], 0.012, 6, 6), gold, crown);
          mesh(sphere(rr, 24, 18), silver, crown, [x, y, z], null, '#7F8189');
        });
        // red maple leaves tucked behind both sides
        const leafG = extrude(maplePoly(0.2), 0.02, 0.006, 2, 6);
        const lm = std(MAPLE, { roughness: 0.7 });
        [[-1, -0.5, 0.26, 0.06, 0.85, 1], [-1, -0.4, 0.36, 0.05, 0.4, 0.75], [1, 0.5, 0.26, 0.06, -0.85, 1], [1, 0.4, 0.36, 0.05, -0.4, 0.75]].forEach(([sx, x, y, z, rz, sc]) => {
          const l = mesh(leafG, lm, crown, [x, y, z], sc, MAPLE_INK); l.rotation.set(-0.1, 0.3 * sx, rz);
        });
      }

      /* ======================= fluffy neck ruff & cape ======================= */
      const capeG = part('cape', K.body);
      {
        // cream chest ruff peeking over the cape collar
        const ring = [];
        for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, front = Math.pow(Math.max(0, Math.cos(a)), 2); ring.push(V(Math.sin(a) * 0.6, 2.35 - 0.06 * front, Math.cos(a) * 0.5)); }
        const ruff = mesh(tube(ring, 0.17, 120, 16, true), std(CREAM, { roughness: 0.95 }), K.faceG, null, null, CREAM_INK);
        K.addFur(ruff, { layers: 14, length: 0.09, gravity: 0.03, repeat: [16, 3] });
        // short capelet (lathe, open at the front) squashed front-to-back
        const gap = rad(22), zs = 0.76;
        const prof = [[1.04, 1.94], [1.01, 2.02], [0.91, 2.16], [0.75, 2.28], [0.57, 2.37], [0.4, 2.43]];
        const tex = canvasTex(1024, 512, (g, w, h) => {
          D.fill(g, CAPE);
          const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,0.12)'); sh.addColorStop(1, 'rgba(60,64,80,0.12)');
          g.fillStyle = sh; g.fillRect(0, 0, w, h);
          g.fillStyle = GOLD; g.fillRect(0, h - 42, w, 34); g.fillStyle = GOLD_INK; g.fillRect(0, h - 10, w, 10);
          g.fillStyle = GOLD; g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);
          // gold scrolls on the shoulders
          [0.25, 0.75].forEach(u => { D.cloud(g, u * w, h * 0.55, 70, GOLD, 8); });
          [0.42, 0.58].forEach(u => flakeC(g, u * w, h * 0.5, 44, 'rgba(255,255,255,0.8)', 5));
        });
        const cl = lathe(prof, 96, gap, Math.PI * 2 - gap * 2, 28);
        const cm = mesh(cl.geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.85 }), capeG, null, [1, 1, zs], CAPE_INK);
        const lin = new THREE.Mesh(cl.geo, std(LINING, { side: THREE.BackSide })); cm.add(lin);
        // image-left pauldron: a gold-rimmed plate lying on the capelet over the shoulder, with a gold scroll
        {
          const capeR = y => {
            if (y <= prof[0][1]) return prof[0][0] + (prof[0][1] - y) * 0.6;
            for (let i = 0; i < prof.length - 1; i++) { const [r0, y0] = prof[i], [r1, y1] = prof[i + 1]; if (y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0)); }
            return prof[prof.length - 1][0];
          };
          const nu = 30, nv = 14, pos = [], uv = [], idx = [], edge = [];
          for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
            const u = i / nu, v = j / nv, deg = lerp(-120, -32, u);
            const yb = 1.9 + 0.13 * (1 - Math.sin(Math.PI * u)), y = lerp(yb, 2.36, v);
            const R = capeR(y) + 0.03 + 0.03 * Math.sin(Math.PI * u) * (1 - v);
            const q = V(Math.sin(rad(deg)) * R, y, Math.cos(rad(deg)) * R * zs);
            pos.push(q.x, q.y, q.z); uv.push(u, v);
            if (j === 0) edge.push(q.clone().multiply(V(1.01, 1, 1.01)));
          }
          for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
          geo.setIndex(idx); geo.computeVertexNormals();
          const ptex = canvasTex(512, 256, (g, w, h) => {
            D.fill(g, CAPE);
            g.fillStyle = GOLD; g.fillRect(0, h - 30, w, 30); g.fillRect(0, 0, 18, h); g.fillRect(w - 18, 0, 18, h);
            g.fillStyle = GOLD_INK; g.fillRect(0, h - 33, w, 3);
            // gold scrollwork (卷草): a wavy stem with curled spirals and small leaves
            g.strokeStyle = GOLD; g.fillStyle = GOLD; g.lineWidth = 9; g.lineCap = 'round';
            g.beginPath(); g.moveTo(w * 0.1, h * 0.62); g.bezierCurveTo(w * 0.3, h * 0.3, w * 0.45, h * 0.9, w * 0.62, h * 0.55); g.bezierCurveTo(w * 0.72, h * 0.35, w * 0.84, h * 0.45, w * 0.9, h * 0.6); g.stroke();
            const spiral = (cx, cy, r0, dir) => { g.beginPath(); for (let a = 0; a <= Math.PI * 3; a += 0.15) { const r = r0 * (1 - a / (Math.PI * 3.4)); const x = cx + dir * Math.cos(a) * r, y = cy + Math.sin(a) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
            g.lineWidth = 7; spiral(w * 0.2, h * 0.42, 30, 1); spiral(w * 0.52, h * 0.72, 26, -1); spiral(w * 0.8, h * 0.4, 24, 1);
            [[0.36, 0.5, -0.6], [0.68, 0.46, 0.5]].forEach(([u, v, r]) => D.leaf(g, w * u, h * v, 34, r, GOLD));
          });
          mesh(geo, texMat(ptex, { side: THREE.DoubleSide, roughness: 0.8 }), capeG, null, null, CAPE_INK);
          mesh(tube(edge, 0.02, 60, 6), std(GOLD, { roughness: 0.5 }), capeG);
        }
        // image-left front lapel with a snowflake
        const lap = K.robePanel({ parent: capeG, y0: 1.84, y1: 2.26, center: -22, deg: 13, degB: 16, off: 0.12, bulge: 0.02, color: CAPE, ink: CAPE_INK,
          paint(g, w, h) {
            g.fillStyle = GOLD; g.fillRect(0, 0, 20, h); g.fillRect(w - 20, 0, 20, h); g.fillRect(0, h - 22, w, 22);
            flakeC(g, w * 0.5, h * 0.5, 62, '#FFFFFF', 7);
          } });
        lap.castShadow = false;
        // cape end flowing out to the image-right behind the shoulder
        const flowTex = canvasTex(256, 512, (g, w, h) => {
          D.fill(g, CAPE);
          const lg = g.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, 'rgba(255,255,255,0.12)'); lg.addColorStop(0.6, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(50,55,70,0.1)');
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.fillStyle = LINING; g.fillRect(w * 0.76, 0, w * 0.24, h);
          g.fillStyle = GOLD; g.fillRect(w * 0.72, 0, w * 0.05, h);
        });
        const flowPts = [[0.22, 2.2, 0.7], [0.62, 2.18, 0.55], [1.02, 2.22, 0.12], [1.42, 2.25, -0.3], [1.8, 2.3, -0.42], [2.08, 2.26, -0.36], [2.22, 2.12, -0.28], [2.21, 1.98, -0.22]];
        const fg = ribbon(flowPts, t => t < 0.3 ? lerp(0.3, 0.52, t / 0.3) : lerp(0.52, 0.17, (t - 0.3) / 0.7), { face: [0, 0, 1], twist: t => 0.5 * sst(0.75, 1, t), segs: 96 });
        const flow = mesh(fg, texMat(flowTex, { side: THREE.BackSide, roughness: 0.85 }), capeG, null, null, CAPE_INK);
        flow.add(new THREE.Mesh(fg, std(LINING, { side: THREE.FrontSide, roughness: 0.85 })));
        capeG.userData.flow = flow;
        K.onTick((t, k) => { flow.rotation.x = 0.03 * Math.sin(t * 1.6) * k; flow.position.y = 0.02 * Math.sin(t * 1.6 + 0.6) * k; });
        // maple-leaf brooch with a pale jade stone, gold beads and a red tassel
        const br = group(capeG, [0, 2.17, 0.8]);
        const leafB = extrude(maplePoly(0.27), 0.03, 0.008, 2, 6);
        mesh(leafB, std(MAPLE, { roughness: 0.65 }), br, [0, 0.0, -0.02], null, MAPLE_INK);
        mesh(new THREE.TorusGeometry(0.075, 0.022, 10, 36), std(GOLD, { roughness: 0.45 }), br, [0, 0, 0.03], null, GOLD_INK);
        mesh(sphere(0.065, 28, 20), std(JADE, { roughness: 0.25 }), br, [0, 0, 0.04], [1, 1, 0.8], '#8E978D');
        mesh(sphere(0.018, 10, 8), K.M.shine, br, [-0.022, 0.025, 0.09]).castShadow = false;
        const bead = std(GOLD, { roughness: 0.4, metalness: 0.15 });
        mesh(sphere(0.035, 16, 12), bead, br, [0.01, -0.12, 0.02], null, GOLD_INK);
        mesh(sphere(0.038, 16, 12), bead, br, [0.0, -0.21, 0.01], null, GOLD_INK);
        const bt = K.tassel(br, [-0.01, -0.27, 0.0], RED, 0.2, 0.04, RED_INK);
        bt.rotation.z = -0.1;
        K.onTick((t, k) => { bt.rotation.z = -0.1 + 0.08 * Math.sin(t * 1.7) * k; });
        // red cord slanting across the chest to the belt
        mesh(tube([[0.02, 2.02, 0.76], [-0.12, 1.9, 0.72], [-0.3, 1.78, 0.68], [-0.5, 1.68, 0.6]], 0.02, 32, 8), std(RED, { roughness: 0.7 }), capeG);
      }

      /* ======================= belt ornaments ======================= */
      {
        const bG = K.beltG;
        const zf = y => K.robeR(y) + 0.045;
        mesh(new THREE.CylinderGeometry(K.robeR(1.72) + 0.03, K.robeR(1.64) + 0.03, 0.08, 72, 1, true), std(CAPE, { roughness: 0.8, side: THREE.DoubleSide }), bG, [0, 1.68, 0]);
        const cord = mesh(new THREE.TorusGeometry(K.robeR(1.66) + 0.045, 0.016, 8, 96), std(RED, { roughness: 0.7 }), bG, [0, 1.665, 0]); cord.rotation.x = Math.PI / 2;
        const gold = std(GOLD, { roughness: 0.45, metalness: 0.15 });
        const md = group(bG, [0, 1.555, zf(1.555) + 0.02]);
        mesh(new THREE.TorusGeometry(0.1, 0.026, 12, 40), gold, md, null, null, GOLD_INK);
        mesh(sphere(0.085, 28, 20), std(JADE, { roughness: 0.25 }), md, [0, 0, 0.015], [1, 1, 0.7], '#8E978D');
        mesh(sphere(0.022, 10, 8), K.M.shine, md, [-0.03, 0.035, 0.07]).castShadow = false;
        // centre pendant: two gold beads and a red maple leaf
        mesh(tube([[0, 1.45, zf(1.45) + 0.03], [0, 1.2, zf(1.2) + 0.04]], 0.008, 6, 6), gold, bG);
        mesh(sphere(0.038, 16, 12), gold, bG, [0, 1.38, zf(1.38) + 0.04], null, GOLD_INK);
        mesh(sphere(0.042, 16, 12), gold, bG, [0, 1.27, zf(1.27) + 0.045], null, GOLD_INK);
        const pend = group(bG, [0, 1.12, zf(1.12) + 0.06]);
        mesh(extrude(maplePoly(0.13), 0.025, 0.007, 2, 6), std(MAPLE, { roughness: 0.65 }), pend, [0, 0, 0], null, MAPLE_INK).rotation.z = Math.PI;
        // image-right red cord loop with gold beads and a tassel
        mesh(tube([[0.18, 1.6, zf(1.6)], [0.3, 1.52, zf(1.52) + 0.02], [0.4, 1.45, zf(1.45) + 0.01], [0.43, 1.52, zf(1.52)]], 0.016, 24, 8), std(RED, { roughness: 0.7 }), bG);
        mesh(sphere(0.035, 16, 12), gold, bG, [0.26, 1.63, zf(1.63) + 0.02], null, GOLD_INK);
        mesh(sphere(0.038, 16, 12), gold, bG, [0.33, 1.43, zf(1.43) + 0.03], null, GOLD_INK);
        const rt = K.tassel(bG, [0.36, 1.38, zf(1.38) + 0.03], RED, 0.24, 0.042, RED_INK);
        rt.rotation.z = 0.35;
        K.onTick((t, k) => { rt.rotation.z = 0.35 + 0.07 * Math.sin(t * 1.5) * k; pend.rotation.z = 0.06 * Math.sin(t * 1.3) * k; });
      }

      /* ======================= apron (蔽膝) ======================= */
      const apronG = part('apron', K.body);
      K.robePanel({ parent: apronG, y0: 0.4, y1: 1.47, center: 0, deg: 33, degB: 29, off: 0.045, color: ROBE, ink: ROBE_INK, texW: 256, texH: 512,
        paint(g, w, h) {
          // dark grey frame (sides + wide bottom band)
          g.fillStyle = '#7C7270'; g.fillRect(0, h - 34, w, 34); g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h);
          g.fillStyle = '#A09694'; g.fillRect(12, h - 40, w - 24, 6);
          // pale blue hills at the bottom
          g.fillStyle = '#B5BAC6'; g.beginPath(); g.ellipse(w * 0.45, h - 36, w * 0.4, 70, 0, Math.PI, 0); g.fill();
          g.fillStyle = '#D5D7DD'; g.beginPath(); g.ellipse(w * 0.85, h - 36, w * 0.2, 36, 0, Math.PI, 0); g.fill();
          // blue reeds on the left, grey leaves on the right
          g.lineCap = 'round';
          [[40, 0.5, 0.88], [62, 0.55, 0.86], [26, 0.62, 0.9]].forEach(([x, top, bot], i) => {
            g.strokeStyle = i === 1 ? '#8E9FBA' : '#A2B0C6'; g.lineWidth = 15 - i * 3;
            g.beginPath(); g.moveTo(x + 30, h * bot); g.quadraticCurveTo(x - 10, h * (top + bot) / 2, x + 50 + i * 12, h * top); g.stroke();
          });
          g.save(); g.translate(w * 0.7, h * 0.86); g.rotate(-0.25);
          g.strokeStyle = '#A59B94'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h * 0.32); g.stroke();
          for (let i = 0; i < 5; i++) { D.leaf(g, 0, -h * 0.06 * (i + 1), 46, 0.95, '#A59B94'); D.leaf(g, 0, -h * 0.06 * (i + 1) + 6, 46, -0.95, '#A59B94'); }
          g.restore();
        } });

      /* ======================= fur legs & boots ======================= */
      const bootsG = part('boots', K.body);
      {
        const legMat = std(LEG, { roughness: 0.95 });
        const bm = std(BOOT, { roughness: 0.75 }), bdm = std(BOOT_DK, { roughness: 0.75 }), sm = std(SOLE, { roughness: 0.8 });
        const gold = std(GOLD, { roughness: 0.45, metalness: 0.15 }), rm = std(RED, { roughness: 0.7 });
        // hips / underside of the body inside the hollow skirt: a closed shell hugging the skirt from the inside
        // (0.012 in), so the legs have something to grow out of and the view from below is not an empty bell
        {
          const y0 = 0.74, yc = 0.98, y1 = 1.5, Rc = K.robeR(yc) - 0.012, prof = [];
          for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; prof.push([Math.max(0.001, Rc * Math.sin(a)), yc - (yc - y0) * Math.cos(a)]); }
          for (let i = 1; i <= 10; i++) { const y = lerp(yc, y1, i / 10); prof.push([K.robeR(y) - 0.012, y]); }
          prof.push([0.001, y1]);
          mesh(lathe(prof, 64).geo, std('#8F817B', { roughness: 0.95, side: THREE.DoubleSide }), bootsG);
        }
        [-1, 1].forEach(sx => {
          // furry grey leg: from inside the boot shaft up into the hips under the skirt
          const lg = mesh(tube([[0.5 * sx, 0.26, 0.15], [0.5 * sx, 0.5, 0.11], [0.45 * sx, 0.78, 0.06], [0.38 * sx, 1.02, 0.02]], t => 0.26 + 0.05 * Math.sin(Math.PI * Math.min(1, t * 1.6)), 32, 24), legMat, bootsG, null, null, LEG_INK);
          K.addFur(lg, { layers: 12, length: 0.08, gravity: 0.03, repeat: [5, 4] });
          const b = group(bootsG, [0.5 * sx, 0, 0.18], [0, 0.18 * sx, 0]);
          mesh(sphere(0.25, 40, 28), bm, b, [0, 0.16, 0.06], [1.15, 0.72, 1.4], BOOT_DK);
          mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.16, 32), bdm, b, [0, 0.24, -0.02], null, BOOT_DK);
          const cuff = mesh(new THREE.TorusGeometry(0.265, 0.035, 10, 40), rm, b, [0, 0.31, -0.02], null, RED_INK); cuff.rotation.x = Math.PI / 2;
          mesh(sphere(0.04, 16, 12), gold, b, [0.2 * sx, 0.31, 0.16], null, GOLD_INK);
          mesh(new THREE.CylinderGeometry(0.28, 0.29, 0.05, 40), sm, b, [0, 0.025, 0.06], [1.02, 1, 1.38], '#B79E86');
          mesh(tube([[0.2 * sx, 0.3, 0.17], [0.12 * sx, 0.22, 0.32], [0.02 * sx, 0.12, 0.42]], 0.018, 16, 6), sm, b);
        });
      }

      /* ======================= twin frost sabres ======================= */
      const sabG = part('sabres', K.body);
      const sabres = [];
      {
        const Lb = 1.0, x0 = 0.3;
        const c = t => 0.1 * t * t;
        const wTop = t => 0.085 - 0.05 * sst(0.8, 1, t);
        const wBot = t => (0.095 + 0.07 * Math.sin(Math.PI / 2 * Math.min(t / 0.72, 1))) * (t > 0.72 ? Math.pow(Math.cos((t - 0.72) / 0.28 * Math.PI / 2), 0.75) : 1);
        const top = [], bot = [];
        for (let i = 0; i <= 40; i++) { const t = i / 40, x = x0 + Lb * t; top.push([x, c(t) + wTop(t)]); bot.push([x, c(t) - wBot(t)]); }
        const shp = top.concat(bot.reverse());
        const bladeGeo = extrude(shp, 0.036, 0.012, 3, 4);
        const tex = canvasTex(512, 256, (g, w, h) => {
          const Yc = v => (1 - v) * h; // v = (y + 0.22) / 0.44
          const lg = g.createLinearGradient(0, 0, 0, h);
          lg.addColorStop(0, '#B6BDC9'); lg.addColorStop(0.45, BLADE); lg.addColorStop(0.62, '#D3D8E0'); lg.addColorStop(1, BLADE_LT);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          // bright cutting edge following the lower outline
          g.strokeStyle = BLADE_LT; g.lineWidth = 16; g.beginPath();
          for (let i = 0; i <= 40; i++) { const t = i / 40, y = c(t) - wBot(t) + 0.03; const px = t * w, py = Yc((y + 0.22) / 0.44); i ? g.lineTo(px, py) : g.moveTo(px, py); }
          g.stroke();
          // etched swirl near the guard and a snowflake near the tip
          g.strokeStyle = '#8D98AE'; g.lineWidth = 5; g.lineCap = 'round';
          g.beginPath(); g.moveTo(0.05 * w, Yc(0.55)); g.bezierCurveTo(0.2 * w, Yc(0.75), 0.3 * w, Yc(0.35), 0.4 * w, Yc(0.5)); g.stroke();
          g.beginPath(); g.arc(0.36 * w, Yc(0.56), 14, 0, Math.PI * 1.6); g.stroke();
          flakeC(g, 0.66 * w, Yc(0.42), 30, '#FFFFFF', 4);
          flakeC(g, 0.49 * w, Yc(0.47), 16, 'rgba(255,255,255,0.9)', 3);
        });
        tex.repeat.set(1 / Lb, 1 / 0.44); tex.offset.set(-x0 / Lb, 0.22 / 0.44);
        const bladeMat = [texMat(tex, { roughness: 0.35, metalness: 0.05 }), std(BLADE_LT, { roughness: 0.35 })];
        const gold = std(GOLD, { roughness: 0.4, metalness: 0.2 }), gripM = std(GRIP, { roughness: 0.7 });
        [['L', -1, 0.5], ['R', 1, 0.66]].forEach(([key, sx, dn]) => {
          const H = K.hands[key].p;
          const g = group(sabG, [H.x, H.y, H.z + 0.02]);
          g.scale.x = sx; g.rotation.z = -sx * dn;
          g.userData.rz0 = g.rotation.z;
          mesh(bladeGeo, bladeMat, g, null, null, BLADE_INK);
          const gr = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.5, 20), gripM, g, [0.02, 0, 0], null, '#2E2A29'); gr.rotation.z = Math.PI / 2;
          const gd = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.055, 36), gold, g, [0.285, 0.0, 0], [1, 1, 0.75], GOLD_INK); gd.rotation.z = Math.PI / 2;
          const fe = mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.05, 20), gold, g, [-0.24, 0, 0], null, GOLD_INK); fe.rotation.z = Math.PI / 2;
          mesh(sphere(0.045, 16, 12), gold, g, [-0.27, 0, 0], null, GOLD_INK);
          // tassel hanging straight down from the pommel (built unrotated in body space)
          const dir = V(sx * Math.cos(dn), -Math.sin(dn), 0);
          const pom = H.clone().addScaledVector(dir, -0.27).add(V(0, 0, 0.02));
          const tg = group(sabG, pom);
          mesh(tube([[0, 0, 0], [0, -0.07, 0]], 0.008, 4, 6), std(RED, { roughness: 0.7 }), tg);
          mesh(sphere(0.042, 16, 12), gold, tg, [0, -0.09, 0], null, GOLD_INK);
          mesh(sphere(0.045, 16, 12), std(JADE, { roughness: 0.3 }), tg, [0, -0.18, 0], null, '#8E978D');
          K.tassel(tg, [0, -0.25, 0], RED, 0.26, 0.045, RED_INK);
          K.onTick((t, k) => { tg.rotation.z = 0.06 * Math.sin(t * 1.6 + sx) * k; });
          sabres.push({ g, tg, sx, dn, H: H.clone() });
        });
      }

      // inner sleeve + wrist: a narrow cream under-sleeve funnels from the wide sleeve's inner wall down to the wrist,
      // and a short furry wrist carries the paw out of the cuff (the paws otherwise hung inside the open bell)
      {
        const inner = std('#EFE3D4', { roughness: 0.9, side: THREE.DoubleSide }), wristM = std(CREAM, { roughness: 0.9 });
        ['L', 'R'].forEach(k => {
          const A = K.cfg.arms[k], h = K.hands[k], path = h.path, wK = A.width || 1;
          const rt = t => (0.16 + 0.04 * t) * (0.3 + 0.7 * sst(0, 0.32, t) + 0.03 * sst(0.8, 1, t)) * wK;   // engine: upper radius of the sleeve
          const t0 = 0.74, pts = [];
          for (let i = 0; i <= 8; i++) pts.push(path.getPointAt(lerp(t0, 1, i / 8)));
          const r0 = rt(t0) - 0.012;
          mesh(tube(pts, t => lerp(r0, 0.11, Math.pow(t, 0.8)), 32, 24), inner, K.robeG);
          const W = h.wrist, Pp = h.p;
          mesh(tube([W.clone().addScaledVector(h.dir, -0.12), W, W.clone().lerp(Pp, 0.6)], t => 0.1 + 0.012 * t, 12, 16), wristM, K.poseG, null, null, CREAM_INK);
        });
      }

      // toe creases on the gripping paws
      {
        const cm = std('#C9A48C', { roughness: 0.8 });
        ['L', 'R'].forEach(k => {
          const p = K.hands[k].p, sx = k === 'L' ? -1 : 1;
          [-0.04, 0.04].forEach(dx => mesh(tube([[p.x + dx - 0.02 * sx, p.y + 0.04, p.z + 0.125], [p.x + dx * 1.1, p.y - 0.02, p.z + 0.135], [p.x + dx * 1.2, p.y - 0.07, p.z + 0.11]], 0.0065, 8, 5), cm, K.poseG));
        });
      }

      /* ======================= floating decorations ======================= */
      {
        const items = [];
        const leaf3 = extrude(maplePoly(0.26), 0.025, 0.008, 2, 6);
        const mapleD = (pos, s, rot, col) => { const g = group(K.decor, pos, rot); g.scale.setScalar(s); mesh(leaf3, std(col || MAPLE, { roughness: 0.7 }), g, null, null, MAPLE_INK); mesh(tube([[0, -0.03, 0], [0.02, -0.16, 0]], 0.012, 6, 6), std(MAPLE_INK), g); items.push(g); return g; };
        mapleD([-1.95, 2.95, 0.2], 1.1, [0.2, 0.3, 0.5]);
        mapleD([2.05, 0.4, 0.4], 0.9, [0.1, -0.3, -0.6]);
        // golden falling leaves (草木黃落)
        const yl = K.leafGeo(0.36, 0.15), ym = std('#E8B864', { roughness: 0.7, side: THREE.DoubleSide });
        [[1.8, 3.55, 0.1, -0.6], [-2.05, 2.0, 0.3, 2.3]].forEach(([x, y, z, r]) => { const g = group(K.decor, [x, y, z], [0.3, 0.2, r]); mesh(yl, ym, g, [0, -0.18, 0], null, '#B8873A'); items.push(g); });
        // snowflake (霜)
        { const sf = K.snowflake(K.decor, [-1.75, 3.5, 0.2], 0.6, '#AFC2DC'); sf.children.forEach(o => o.children.forEach(m => m.isMesh && K.outline(m, '#7E90AE'))); items.push(sf); }
        // wind swirl
        const sw = group(K.decor, [2.0, 3.15, -0.3]);
        const pts = []; for (let i = 0; i <= 44; i++) { const a = i / 44 * Math.PI * 3.0, r = 0.04 + 0.2 * (1 - i / 44); pts.push([Math.cos(a) * r - i * 0.016, Math.sin(a) * r, 0]); }
        mesh(tube(pts, 0.022, 90, 8), std('#D6DEEA', { roughness: 0.7 }), sw, null, null, '#A3AEC2');
        items.push(sw);
        // chrysanthemum (霜降賞菊)
        const ch = group(K.decor, [-1.55, 0.55, 0.45], [0.3, 0.2, 0]);
        const pm = std('#FAF2E2', { roughness: 0.8 }), pm2 = std('#F1E0BE', { roughness: 0.8 });
        for (let ring = 0; ring < 3; ring++) {
          const n = 14 - ring * 3, len = 0.24 - ring * 0.06;
          for (let i = 0; i < n; i++) {
            const a = (i + ring * 0.5) / n * Math.PI * 2;
            const p = mesh(sphere(0.5, 12, 8), ring ? pm2 : pm, ch, null, [0.05, len, 0.035]);
            p.position.set(Math.cos(a) * len * 0.55, Math.sin(a) * len * 0.55, 0.03 * ring);
            p.rotation.z = a - Math.PI / 2; p.rotation.x = 0.35 - ring * 0.2;
          }
        }
        mesh(sphere(0.06, 16, 12), std('#E6C27A'), ch, [0, 0, 0.08]);
        [[-0.25, -0.25, -0.8], [0.22, -0.28, 0.9]].forEach(([x, y, r]) => { const l = mesh(K.leafGeo(0.3, 0.12), std('#5E6B5C', { side: THREE.DoubleSide }), ch, [x * 0.3, y * 0.3, -0.04]); l.rotation.z = r + Math.PI; });
        items.push(ch);
        // pampas grass plume (芒草)
        const pg = group(K.decor, [2.15, 2.35, -0.7], [0, 0, -0.35]);
        const stem = std('#CDB48C', { roughness: 0.9 }), plume = std('#F2EADB', { roughness: 1 });
        [[0, 0], [0.12, -0.25], [-0.1, 0.3]].forEach(([dx, rz]) => {
          const s = group(pg, [dx, 0, 0], [0, 0, rz]);
          const path = new THREE.CatmullRomCurve3([V(0, -0.6, 0), V(0.03, 0.1, 0), V(0.14, 0.6, 0)]);
          mesh(tube(path, 0.011, 16, 5), stem, s);
          // feathery plume: fine strands fanning off both sides of the top of the stem
          for (let i = 0; i < 16; i++) {
            const t = 0.55 + 0.45 * i / 15, p0 = path.getPointAt(t), side = i % 2 ? 1 : -1;
            const len = 0.16 * (1 - 0.5 * (i / 15));
            const p1 = p0.clone().add(V(side * len * 0.5 + 0.03, len * 0.75, 0.01 * side));
            mesh(tube([p0, p0.clone().lerp(p1, 0.5).add(V(0, 0.02, 0)), p1], t2 => 0.012 * (1 - 0.7 * t2), 8, 5), plume, s);
          }
        });
        items.push(pg);
        items.forEach(g => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.1 * Math.sin(t * 0.8 + i) * k;
        }));
      }

      K.sabres = sabres;
    },

    action: {
      label: '揮刀', dur: 1.8,
      run(s, p, K) {
        (K.sabres || []).forEach(({ g, tg, sx, H }) => {
          const rz = g.userData.rz0 + sx * 1.1 * s;
          g.rotation.z = rz;
          tg.position.set(H.x - 0.27 * sx * Math.cos(rz), H.y - 0.27 * sx * Math.sin(rz), H.z + 0.02);   // pommel tassel follows the grip
        });
        K.headG.rotation.x = -0.08 * s;
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '霜降的霜刃將軍',
        text: '霜降是秋天最後一個節氣，初霜降臨、楓葉轉紅。這隻灰色兔猻化身掌管初霜的武將：頭戴冰晶冠、雙手各握一把刻著雪花的淡藍彎刀，一臉不好惹的臭臉，把「霜葉紅於二月花」的秋意與霜寒穿在身上。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '扁寬大臉與臭臉',
        text: '兔猻招牌的扁寬大臉，灰褐色短密毛，額頭散著兩排深色斑點、眉心一道短斑，兩頰各有幾道斜紋。白色眉毛往鼻樑斜斜下壓，琥珀金色圓眼配上壓低的上眼瞼、倒 Y 字的嘴，一副很不爽的樣子；長長的深灰鬍鬚向兩側下垂。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '低矮圓耳',
        text: '兔猻的耳朵又小又圓，長在頭頂兩側偏低的位置、向外攤開，耳內是淡粉色與白色絨毛。' },
      crown: { chip: '冰晶冠', tag: '服飾', name: '銀色冰晶冠',
        text: '灰銀色冠圈上下鑲金邊，正中一顆淡青色珍珠，後方豎起一枝尖尖的多面冰晶，左右是金框灰片與小冰稜；冠圈兩端各有兩顆銀珠，後面還插著紅楓葉，冰霜與楓紅同框。' },
      cape: { chip: '披風', tag: '服飾', name: '灰藍短披風',
        text: '肩上披著灰藍色短披風，下緣滾一道淡金邊，畫面左肩有一片金紋肩甲、左胸垂著繡白雪花的前襟；右側的披風尾端被秋風吹得向外翻飛，露出米白內裡。領口別著紅楓葉胸針，中央是淡青玉石，下方垂著金珠與紅流蘇。' },
      robe: { chip: '袍與袖', tag: '服飾', name: '米白寬袖與灰裙甲',
        text: '內層是米白長袍，兩隻大寬袖上點綴紅楓葉與淡藍色風紋；外罩深灰長背心，下襬是灰色裙片，鑲米白底邊與金線，畫面左側還露出一道紅色襯裡與白色雪花紋。' },
      apron: { chip: '蔽膝', tag: '服飾', name: '秋野蔽膝',
        text: '腰前垂著米白蔽膝，外框是深灰色，下方畫著淡藍色的小山丘，左邊是隨風搖曳的藍色蘆葦，右邊是灰色枝葉，一片霜降時節的秋野風景。' },
      belt: { chip: '腰帶', tag: '服飾', name: '玉扣腰帶與楓葉墜',
        text: '深色腰帶上下壓金線，上緣有一圈灰藍腰封與紅繩，正中是金框淡青玉扣；下方垂著兩顆金珠和一片紅楓葉墜飾，右側還繫著紅繩結與紅流蘇。' },
      sabres: { chip: '雙彎刀', tag: '道具', name: '霜刃雙彎刀', dir: [0, 0.1, 1],
        text: '雙手在腰側各握一把彎刀，刀刃朝身體外側斜斜向下。淡藍灰色的刀身刻著白色雪花與風紋，刃口泛著霜白光；金色圓形護手、深色刀柄，柄尾垂著金珠、淡青玉珠和紅流蘇。按下「揮刀」可以看牠把雙刀揚起。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '粗大環紋尾', dir: [1, 0.25, -0.7],
        text: '兔猻又粗又蓬的大尾巴從右後方翹起，灰褐底色上有五、六道深色鋸齒環紋，尾端顏色轉淡、圓圓鈍鈍的，和整件衣服一樣分量十足。' },
      boots: { chip: '靴子', tag: '服飾', name: '毛絨腿與短靴',
        text: '裙襬下露出兩截灰色毛絨絨的腿，套著深灰短靴：靴口一圈紅邊、外側一顆金扣，米白色的鞋底與斜帶讓腳步看起來很穩。' }
    },
    order: ['overview', 'face', 'ears', 'crown', 'cape', 'robe', 'apron', 'belt', 'sabres', 'tail', 'boots']
  });
})();
