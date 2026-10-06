// @file 22_冬至_沙漠貓
// @title 冬至・一陽賀冬官 | 二十四節氣貓
(function () {
  /* Colours are SAMPLED from refs/22.png (tools/colors.py); def.exposure dims the lights so the
   * materials render close to the sampled values. Scale: 1 world unit ≈ 138 px of the picture
   * (feet y = 0 ↔ px 508, hat top y = 3.62 ↔ px 7, centre line x = 0 ↔ px 233). */
  // The lights brighten and warm front-facing surfaces (measured on renders at exposure 0.8: linear gain
  // ≈ R 1.18, G 1.12, B 1.0). Lc() divides a SAMPLED colour by that gain so it renders back close to it.
  function Lc(hex, k) {
    k = k || 1; const n = parseInt(hex.slice(1), 16), f = [1.18 * k, 1.12 * k, 1.0 * k];
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f[i], 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  const FUR = Lc('#F9D5AB', 0.9), FUR_TOP = Lc('#F5CB9A', 0.9), FUR_LOW = Lc('#FAD9B0', 0.9), STRIPE = Lc('#CF9D6D'), STRIPE_DK = Lc('#C18F60');
  const FACE = Lc('#FFFAF3', 0.95), CREAM = Lc('#FBF3E8'), INK = '#B98450', CREAM_INK = '#C9A27E';
  const EAR_IN = Lc('#F9CDBE'), TUFT = Lc('#FBF4EA');
  const HAT = Lc('#86878A'), HAT_DK = Lc('#7A7D81'), HAT_INK = '#5F564D';
  const GOLD = Lc('#EDC27E'), GOLD_INK = '#A98249', SUN = Lc('#E9B057'), MED_FACE = Lc('#F6E0BA');
  const RED = Lc('#DB9075'), RED_DK = Lc('#D27E62'), RED_INK = '#9C5A45', PEARL = Lc('#F8F5F0');
  const BLUE = Lc('#97A3A8'), BLUE_LT = Lc('#B6BFC3'), BLUE_DK = Lc('#858C90'), BLUE_INK = '#6D787E';
  const WAVE2 = Lc('#9FAFB7'), ROBE = Lc('#FAF2E5'), PINE = Lc('#7C8A7B'), PINE_DK = Lc('#66776A'), SNOWC = Lc('#A9B8C1'), WAVE = Lc('#AEBAC0');
  const PLUM = Lc('#FDF8F2'), PLUM_C = Lc('#EFA99A'), BERRY = Lc('#D2786A'), BRANCH = Lc('#8E6A55');
  const TAB = Lc('#F7DCA8'), TAB_EDGE = Lc('#F1CE94'), TAB_INK = '#B98B55';
  const COLLAR = Lc('#F6ECE2'), COLLAR_INK = '#C3A283';
  const TAIL = Lc('#F7D2A5', 0.82), TAIL_BAND = Lc('#D4A477', 0.86), TAIL_INK = '#B07645';
  const LEG = Lc('#F1C38E'), CREASE = '#C9A07E';

  const SST = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

  /* ---------------- flat motif painters (canvas 2D) ---------------- */
  // pine spray: a short branch with fan-shaped needle clusters, optional snow cap
  function pineSpray(g, x, y, s, ang, snow) {
    g.save(); g.translate(x, y); g.rotate(ang || 0); g.lineCap = 'round';
    g.strokeStyle = BRANCH; g.lineWidth = Math.max(2, s * 0.05);
    g.beginPath(); g.moveTo(-s * 0.55, s * 0.18); g.quadraticCurveTo(-s * 0.1, s * 0.05, s * 0.45, -s * 0.12); g.stroke();
    [[-0.28, 0.08, 0.42, -1], [0.08, -0.02, 0.5, 1], [0.38, -0.1, 0.36, -1]].forEach(([cx, cy, r, k]) => {
      const X = cx * s, Y = cy * s;
      for (let i = 0; i < 13; i++) {
        const a = -Math.PI * (0.08 + 0.84 * i / 12);
        g.strokeStyle = i % 3 ? PINE : PINE_DK; g.lineWidth = Math.max(1.5, s * 0.028);
        g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Math.cos(a) * r * s, Y + Math.sin(a) * r * s * 0.85); g.stroke();
      }
    });
    if (snow) {
      g.fillStyle = '#FFFFFF'; g.strokeStyle = 'rgba(150,160,165,0.8)'; g.lineWidth = Math.max(1.5, s * 0.02);
      g.beginPath(); g.ellipse(s * 0.1, -s * 0.36, s * 0.32, s * 0.07, -0.08, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
  }
  // plum branch: brown twig with red berries and one white five-petal blossom
  function plumBranch(g, x, y, s, flip) {
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.lineCap = 'round';
    g.strokeStyle = BRANCH; g.lineWidth = Math.max(2, s * 0.05);
    g.beginPath(); g.moveTo(-s * 0.5, s * 0.45); g.quadraticCurveTo(-s * 0.05, s * 0.1, s * 0.25, -s * 0.35); g.stroke();
    g.lineWidth = Math.max(1.5, s * 0.035);
    [[0.0, 0.08, 0.3, -0.18], [0.12, -0.12, 0.42, -0.08], [-0.2, 0.25, 0.1, 0.05]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a * s, b * s); g.lineTo(c * s, d * s); g.stroke(); });
    g.fillStyle = BERRY;
    [[0.25, -0.38, 0.07], [0.3, -0.19, 0.065], [0.44, -0.08, 0.065], [0.1, 0.06, 0.055]].forEach(([a, b, r]) => { g.beginPath(); g.arc(a * s, b * s, r * s, 0, Math.PI * 2); g.fill(); });
    D5(g, -s * 0.12, s * 0.28, s * 0.2);
    g.restore();
  }
  function D5(g, x, y, s) { // white plum blossom
    g.save(); g.translate(x, y); g.fillStyle = PLUM; g.strokeStyle = 'rgba(200,150,140,0.9)'; g.lineWidth = Math.max(1, s * 0.06);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.arc(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, s * 0.42, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.fillStyle = PLUM; g.beginPath(); g.arc(0, 0, s * 0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = PLUM_C; g.beginPath(); g.arc(0, 0, s * 0.2, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // wind / wave swirl: a curl with a long trailing stroke
  function swirl(g, x, y, s, color, dir) {
    g.save(); g.translate(x, y); g.scale(dir || 1, 1); g.strokeStyle = color; g.lineWidth = Math.max(2, s * 0.07); g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i <= 30; i++) { const a = Math.PI * 2.4 * i / 30, r = s * 0.28 * (1 - i / 36); const px = Math.cos(a + Math.PI) * r, py = Math.sin(a + Math.PI) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke();
    g.beginPath(); g.moveTo(-s * 0.28, 0); g.quadraticCurveTo(-s * 0.6, s * 0.3, -s * 1.3, s * 0.18); g.stroke();
    g.beginPath(); g.moveTo(s * 0.05, s * 0.32); g.quadraticCurveTo(s * 0.6, s * 0.4, s * 1.2, s * 0.2); g.stroke();
    g.restore();
  }
  // tangyuan bowl (湯圓): blue-grey bowl with two white rice balls
  function bowl(g, x, y, s) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#FFFFFF'; g.strokeStyle = 'rgba(160,165,165,0.9)'; g.lineWidth = Math.max(1.5, s * 0.04);
    [[-0.17, -0.2], [0.17, -0.22]].forEach(([a, b]) => { g.beginPath(); g.arc(a * s, b * s, s * 0.22, 0, Math.PI * 2); g.fill(); g.stroke(); });
    g.fillStyle = BLUE; g.strokeStyle = BLUE_INK; g.lineWidth = Math.max(1.5, s * 0.04);
    g.beginPath(); g.moveTo(-s * 0.5, -s * 0.08); g.quadraticCurveTo(-s * 0.45, s * 0.35, 0, s * 0.38); g.quadraticCurveTo(s * 0.45, s * 0.35, s * 0.5, -s * 0.08); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = GOLD; g.fillRect(-s * 0.5, -s * 0.12, s, s * 0.06);
    g.restore();
  }

  NEKO.run({
    meta: {
      id: '22', term: '冬至', title: '冬至・一陽賀冬官', seal: '冬',
      eyebrow: '二〇二七節氣貓 · 22 冬至 · 沙漠貓',
      aria: '戴灰黑方形官帽、帽前金色太陽圓徽與紅流蘇，披白色絨毛領、灰藍外袍配米白寬袖與松梅雪紋蔽膝，雙手在胸前捧著畫有太陽的淡金笏板的沙色長毛虎斑沙漠貓 3D 模型'
    },
    theme: { accent: '#5B6A72', accentDark: '#B6C3CA', glow: 'rgba(182,191,195,0.34)', glowColor: '#F2D49A' },
    palette: [['#F9D5AB', '沙金'], ['#FAF2E5', '米白'], ['#97A3A8', '霧灰藍'], ['#E9B057', '暖陽金']],
    spec: [['品種', '沙漠貓（沙色長毛虎斑）'], ['角色', '冬至一陽賀冬官'], ['頭身比', '約 1 : 1.6']],
    seed: 2212,
    exposure: 0.73,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR, low: FUR_LOW, deep: STRIPE, cream: CREAM,
        ink: INK, creamInk: CREAM_INK, noise: { colors: ['#FFE6C8', '#E4B585'], alpha: 0.08, n: 1100 },
        paintBase(g, P) {
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.5, FUR); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          const L = (lon, lat) => P.xy(lon, lat);
          // back-of-head stripes
          g.filter = 'blur(4px)';
          [-160, -132, -104, 104, 132, 160].forEach(lon => {
            const a = L(lon, 82), b = L(lon + (lon > 0 ? 5 : -5), 35), c = L(lon, -15);
            P.stroke(g, [a, b, c], 22, STRIPE, 0.6);
          });
          // cream lower face / chest with the sandy notch coming down between the eyes
          const half = [[0, 5], [4, 9], [8, 15], [13, 22], [20, 26], [27, 21], [31, 10], [34, -1], [38, -9], [42, -16], [46, -25], [50, -36], [55, -50], [60, -70], [60, -90]];
          const poly = half.concat(half.slice().reverse().map(([lo, la]) => [-lo, la]));
          g.filter = 'blur(6px)'; g.fillStyle = FACE; g.beginPath();
          poly.forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill();
          // forehead: long centre stripe, two flanking ones and two short diagonal outer ones
          g.filter = 'blur(2.5px)';
          // stripe = [lat, centre lon, half-width lon] rows from top to tip
          const stripe = (rows, col, al) => {
            const Lft = rows.map(([la, lo, hw]) => L(lo - hw, la)), Rgt = rows.map(([la, lo, hw]) => L(lo + hw, la)).reverse();
            g.fillStyle = NEKO.rgba(col, al); g.beginPath();
            Lft.concat(Rgt).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
          };
          stripe([[80, 0, 8], [60, 0, 7], [46, 0, 5.5], [34, 0, 3.2], [19, 0, 0.3]], STRIPE_DK, 0.95);
          [-1, 1].forEach(k => {
            stripe([[80, 14 * k, 7.5], [60, 13.5 * k, 6.5], [46, 12.5 * k, 5], [36, 11.5 * k, 2.8], [27, 10.5 * k, 0.3]], STRIPE_DK, 0.95);
            stripe([[56, 29 * k, 3.4], [48, 27 * k, 3], [40, 24.5 * k, 1.8], [34, 22.5 * k, 0.3]], STRIPE, 0.95);
          });
          // two cheek stripes each side sweeping out toward the ruff
          g.filter = 'blur(3px)';
          [[[39, 13], [58, 9], [84, 4]], [[45, -7], [64, -11], [88, -14]]].forEach(s => {
            const p = s.map(([lo, la]) => L(lo, la));
            P.stroke(g, p, 22, STRIPE, 0.95);
            P.stroke(g, p.map(q => [1024 - q[0], q[1]]), 22, STRIPE, 0.95);
          });
          g.filter = 'none';
        }
      },
      head: { y: 2.48, w: 0.82, h: 0.66, d: 0.8, cheek: 0.12, ruff: 0.07, ruffFreq: 14, chinDrop: 0.02,
        // broad fluffy jowls: widen the lower half of the head (the picture's face is widest below the eyes)
        deform(p, o) { const k = SST(-0.05, -0.55, o.y) * (1 - 0.5 * SST(-0.75, -1, o.y)); p.x *= 1 + 0.14 * k; },
        fur: { layers: 18, length: 0.09, gravity: 0.03, repeat: [9, 5] } },
      eyes: { x: 0.27, y: -0.02, r: 0.077, sx: 0.95, sy: 1.05, sz: 0.45, color: '#523621', shine: 0.75 },
      nose: { y: -0.085, color: '#EDA595', size: 0.66 },
      muzzle: { y: -0.16, size: 0.46, color: CREAM },
      mouth: { type: 'w', color: '#A8704F', y: -0.135, w: 0.1, depth: 0.045 },
      blush: { color: 'rgba(245,158,150,0.55)', x: 0.46, y: -0.12, r: 24 },
      ears: { x: 0.58, y: 0.27, z: -0.06, tilt: 0.5, yaw: 0.14, pitch: -0.04, size: [0.42, 0.66, 0.17], sharp: 0.95,
        color: FUR, inner: EAR_IN, tuft: TUFT, innerScale: 1.08, tuftScale: 1.55 },
      bib: { color: CREAM, balls: [[0, 1.99, 0.38, 0.28], [0.3, 1.96, 0.32, 0.22], [-0.3, 1.96, 0.32, 0.22], [0, 1.87, 0.42, 0.16]],
        fur: { layers: 14, length: 0.07, gravity: 0.03, repeat: [3, 2] } },
      robe: {
        profile: [[0.62, 0.18], [0.64, 0.3], [0.62, 0.55], [0.6, 0.85], [0.58, 1.1], [0.56, 1.35], [0.5, 1.58], [0.36, 1.76], [0.12, 1.88]],
        color: '#FFFFFF', ink: BLUE_INK, lining: ROBE, hemY: 0.4,
        paint(g, w, h, D, R) {
          D.fill(g, ROBE);
          // red under-layer on the lower front (shows between the apron and the outer robe) + white underskirt
          const yR = R.robeV(1.2), yW = R.robeV(0.34);
          g.fillStyle = RED; g.fillRect(512 - 200, yR, 400, yW - yR);
          g.fillStyle = '#FFF8EE'; g.fillRect(0, yW, w, h - yW);
          // V neckline inside the fur stole: a thin red lining edge, then the blue-grey lapel down to the paws
          const V = (deg, y) => R.robeUV(deg, y);
          const vpoly = (dTop, dBot, col) => {
            const a = V(-dTop, 1.86), b = V(-dBot, 1.3), c = V(dBot, 1.3), d = V(dTop, 1.86);
            g.fillStyle = col; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
          };
          vpoly(66, 46, RED); vpoly(58, 38, BLUE);
        }
      },
      collar: false,
      arms: {
        L: { hand: [-0.2, 1.37, 1.0], path: [[-0.5, 1.52, 0.3], [-0.46, 1.45, 0.62], [-0.34, 1.41, 0.84]], pawScale: 1.36, wrist: false },
        R: { hand: [0.2, 1.37, 1.0], path: [[0.5, 1.52, 0.3], [0.46, 1.45, 0.62], [0.34, 1.41, 0.84]], pawScale: 1.36, wrist: false }
      },
      sleeves: false,
      paws: { color: CREAM, ink: CREAM_INK },
      belt: { yT: 1.28, yB: 1.15, color: BLUE_DK, line: GOLD, knot: false, tassel: false },
      feet: false,
      tail: {
        pts: [[0.3, 0.4, -0.55], [0.78, 0.24, -0.66], [1.06, 0.4, -0.58], [1.13, 0.7, -0.52], [1.12, 0.98, -0.46], [1.13, 1.15, -0.42], [1.24, 1.27, -0.38], [1.37, 1.22, -0.34], [1.44, 1.09, -0.3], [1.41, 0.96, -0.28], [1.34, 0.88, -0.27]],
        r: 0.225, color: TAIL, deep: TAIL_BAND, tip: TAIL, tipStart: 1, bands: 4, bandAlpha: 0.9, ink: TAIL_INK,
        paint(g, w, h) {
          g.fillStyle = TAIL; g.fillRect(0, 0, w, h);
          // jagged darker bands, the top of the curl darkest
          g.fillStyle = TAIL_BAND;
          [[0.3, 0.05], [0.45, 0.055], [0.6, 0.055], [0.72, 0.05], [0.9, 0.2]].forEach(([c, bw]) => {
            const x0 = (c - bw / 2) * w, x1 = Math.min((c + bw / 2) * w, w + 20), n = 8;
            g.beginPath(); g.moveTo(x0, 0);
            for (let i = 0; i <= n; i++) g.lineTo(x0 + (i % 2 ? -12 : 9), i / n * h);
            for (let i = n; i >= 0; i--) g.lineTo(x1 + (i % 2 ? 12 : -9), i / n * h);
            g.closePath(); g.fill();
          });
        },
        shape: t => t < 0.56 ? 0.64 + 0.12 * t : t < 0.76 ? 0.707 + 0.193 * Math.sin(Math.PI / 2 * (t - 0.56) / 0.2) : 0.14 + 0.72 * Math.pow(Math.cos(Math.PI / 2 * (t - 0.76) / 0.24), 0.9),
        fur: { layers: 14, length: 0.05, gravity: 0.015, repeat: [14, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, D } = K;
      const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
      const lerp = (a, b, t) => a + (b - a) * t;
      const HY = K.cfg.head.y;
      const goldMat = std(GOLD, { roughness: 0.45, metalness: 0.1 });
      // soft fill from the front-below: evens out the top-lit 3D shading toward the flat picture-book look
      { const fl = new THREE.DirectionalLight(0xffffff, 0.34); fl.position.set(0, -4, 1.5); K.scene.add(fl); }

      /* ---------------- long fluffy cheek locks and ear tufts ---------------- */
      const edgeX = (y) => {
        let lo = 0, hi = 1.5;
        for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; }
        return lo;
      };
      const furMat = std(FUR, { roughness: 0.95 }), creamMat = std(CREAM, { roughness: 0.95 });
      const lock = (parent, root, dir, len, r0, mat, ink, bend) => {
        const d = V(dir[0], dir[1], dir[2]).normalize();
        const a = V(root[0], root[1], root[2]);
        const b = a.clone().addScaledVector(d, len * 0.55).add(V(0, bend * len, 0));
        const c = a.clone().addScaledVector(d, len);
        return mesh(tube([a, b, c], t => r0 * (1 - Math.pow(t, 1.3)) + 0.004, 20, 10), mat, parent, null, null, ink);
      };
      [-1, 1].forEach(sx => {
        // [height, angle below horizontal (deg), length, root radius]
        [[2.8, -14, 0.1, 0.07], [2.66, 0, 0.12, 0.08], [2.54, 6, 0.13, 0.085], [2.42, 14, 0.1, 0.085], [2.3, 20, 0.2, 0.095], [2.17, 30, 0.16, 0.095], [2.05, 42, 0.18, 0.09], [1.95, 54, 0.19, 0.09], [1.87, 64, 0.15, 0.08]]
          .forEach(([y, ang, len, r0], i) => {
            const ex = edgeX(y), a = ang * Math.PI / 180;
            const zz = [0.12, -0.04, 0.1, -0.06, 0.1, -0.06, 0.08, 0.02, -0.04][i];
            lock(K.faceG, [sx * (ex - 0.08), y, zz], [sx * Math.cos(a), -Math.sin(a), zz * 0.8], len, r0, furMat, INK, -0.12);
          });
        [[2.51, -0.3, 0.18], [2.31, -0.38, 0.2], [2.11, -0.36, 0.2], [2.68, -0.2, 0.15]].forEach(([y, z, len]) => {
          const ex = edgeX(y) * 0.92;
          lock(K.faceG, [sx * (ex - 0.1), y, z], [sx * 0.45, -0.65, -0.62], len, 0.09, furMat, INK, -0.05);
        });
      });
      {
        const tm = std(TUFT, { roughness: 0.95 });
        K.ears.forEach(({ g, sx }) => {
          [[-0.07, 0.0, 0.24, 0.08], [0.04, 0.0, 0.18, 0.066], [-0.13, 0.02, 0.15, 0.056]].forEach(([x, y, len, r0]) => {
            K.addFur(lock(g, [x * sx, y + 0.05, 0.12], [-0.45 * sx - x * sx, 1, 0.35], len, r0, tm, null, 0), { layers: 8, length: 0.035, gravity: 0.004, repeat: [2, 5] });
          });
        });
      }
      // cream chest-ruff tips hanging over the neckline
      [[-0.45, 1.91, 0.3, -0.35], [-0.28, 1.85, 0.42, -0.2], [-0.1, 1.81, 0.5, -0.05], [0.1, 1.81, 0.5, 0.05], [0.28, 1.85, 0.42, 0.2], [0.45, 1.91, 0.3, 0.35]]
        .forEach(([x, y, z, dx]) => lock(K.faceG, [x, y + 0.08, z], [dx, -1, 0.35], 0.16, 0.07, creamMat, CREAM_INK, 0));
      // blush freckles: two tiny dots in each blush
      {
        const g = K.headTex.image.getContext('2d');
        [-1, 1].forEach(sx => [-0.03, 0.03].forEach(dx => {
          const s = K.onSkin(sx * 0.46 + dx, HY - 0.125, [K.headMesh]);
          if (!s.uv) return;
          g.fillStyle = 'rgba(236,128,118,0.9)'; g.beginPath(); g.arc(s.uv.x * 1024, (1 - s.uv.y) * 512, 2.4, 0, Math.PI * 2); g.fill();
        }));
        K.headTex.needsUpdate = true;
      }

      /* ---------------- grey-black square official hat ---------------- */
      const hatG = part('hat', K.head);
      hatG.position.set(0, 3.04, 0.02);
      {
        const hatMat = std(HAT, { roughness: 0.85 }), bandMat = std(HAT_DK, { roughness: 0.85 });
        const DEP = 0.54, BW = 0.29, CW0 = 0.29, CW1 = 0.325, CH = 0.41, TOP = 0.565;
        const arch = (t) => { const a = Math.PI * (1 - t); return V(CW1 * Math.cos(a), CH + (TOP - CH) * Math.pow(Math.sin(a), 1.5), 0); };   // t 0 → 1: left corner → right corner
        // lower band (y 0 – 0.2) and flaring crown with a domed top (corners at CH, apex at TOP)
        mesh(extrude([[-BW, 0], [BW, 0], [BW + 0.008, 0.2], [-BW - 0.008, 0.2]], DEP + 0.04, 0.02, 3, 8), bandMat, hatG, null, null, HAT_INK);
        const crown = new THREE.Shape();
        crown.moveTo(-CW0, 0.2); crown.lineTo(CW0, 0.2);
        for (let i = 0; i <= 32; i++) { const q = arch(1 - i / 32); crown.lineTo(q.x, q.y); }
        crown.closePath();
        mesh(extrude(crown, DEP, 0.03, 4, 24), hatMat, hatG, null, null, HAT_INK);
        // gold trims: middle band, bottom rim, top edge, two front stripes
        const zF = DEP / 2 + 0.02;
        mesh(extrude([[-BW - 0.02, 0.195], [BW + 0.02, 0.195], [BW + 0.022, 0.245], [-BW - 0.022, 0.245]], DEP + 0.06, 0.012, 2, 4), goldMat, hatG, null, null, GOLD_INK);
        mesh(extrude([[-BW - 0.01, -0.01], [BW + 0.01, -0.01], [BW + 0.011, 0.025], [-BW - 0.011, 0.025]], DEP + 0.07, 0.01, 2, 4), goldMat, hatG, null, null, GOLD_INK);
        [zF - 0.005, -zF + 0.005].forEach(z => {
          const pts = [];
          for (let i = 0; i <= 30; i++) {
            const p = arch(i / 30);   // same arch as the crown outline
            pts.push(V(p.x * 1.07, CH + (p.y - CH) * 1.04 + 0.012, z));
          }
          mesh(tube(pts, 0.018, 60, 8), goldMat, hatG);
        });
        [-1, 1].forEach(sx => {
          mesh(tube([[(CW1 + 0.024) * sx, CH + 0.012, zF], [(CW1 + 0.026) * sx, CH + 0.012, 0], [(CW1 + 0.024) * sx, CH + 0.012, -zF]], 0.016, 12, 8), goldMat, hatG);
          mesh(tube([[0.15 * sx, 0.245, zF + 0.005], [0.195 * sx, 0.535, zF + 0.005]], 0.018, 8, 8), goldMat, hatG);
        });
        // pearl on the crown front, sun medallion over the band
        mesh(sphere(0.04, 24, 18), std(PEARL, { roughness: 0.25 }), hatG, [0, 0.335, zF + 0.01], null, '#B9B2A8');
        K.medal(hatG, [0, 0.175, zF + 0.03], 0.145, (g) => {
          g.strokeStyle = GOLD; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.stroke();
          D.sun(g, 128, 128, 88, SUN, SUN);
        }, GOLD, GOLD_INK, MED_FACE);
        // side ornaments: gold rods ending in quatrefoil flowers with a bead and a red tassel below
        const qShape = new THREE.Shape();
        for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2, r = 0.072 * (0.72 + 0.28 * Math.cos(4 * a)); const x = Math.cos(a + Math.PI / 4) * r, y = Math.sin(a + Math.PI / 4) * r; i ? qShape.lineTo(x, y) : qShape.moveTo(x, y); }
        const qGeo = extrude(qShape, 0.03, 0.01, 2, 8);
        const redMat = std(RED_DK, { roughness: 0.75 });
        [-1, 1].forEach(sx => {
          mesh(tube([[0.28 * sx, 0.23, 0.12], [0.44 * sx, 0.24, 0.13]], 0.016, 8, 8), goldMat, hatG);
          mesh(qGeo, goldMat, hatG, [0.44 * sx, 0.245, 0.14], null, GOLD_INK);
          mesh(sphere(0.026, 16, 12), std(MED_FACE, { roughness: 0.5 }), hatG, [0.44 * sx, 0.245, 0.165]);
          mesh(sphere(0.02, 12, 10), goldMat, hatG, [0.44 * sx, 0.13, 0.14], null, GOLD_INK);
          mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.04, 16), redMat, hatG, [0.44 * sx, 0.1, 0.14], null, RED_INK);
          for (let i = 0; i < 7; i++) { const s = mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.14, 6), redMat, hatG, [0.44 * sx + (i - 3) * 0.008, 0.01, 0.14 + (i % 2) * 0.006]); s.rotation.z = (i - 3) * 0.03; }
        });
      }

      /* ---------------- white fur collar (絨毛領): a stole round the neck, over the shoulders, ending on the paws ---------------- */
      {
        // image-left half, front tip → back: the tip tucks behind the paw top, the roll climbs diagonally
        // (≈ 33°, as in the picture) resting on the sleeve tops, wraps over the shoulder yoke and round the neck
        const half = [[0.235, 1.6, 0.84], [0.34, 1.665, 0.785], [0.46, 1.74, 0.68], [0.565, 1.82, 0.52], [0.625, 1.895, 0.28], [0.625, 1.945, -0.02], [0.51, 1.96, -0.31], [0.27, 1.965, -0.46]];
        const pts = half.map(([x, y, z]) => [-x, y, z]).concat([[0, 1.965, -0.5]], half.slice().reverse());
        // thick soft roll with rounded ends and gentle tufted lumps along it
        const rad = (t) => {
          const e = Math.min(t, 1 - t), c = Math.min(e / 0.03, 1), cap = Math.sqrt(1 - (1 - c) * (1 - c));
          return (0.104 + 0.012 * Math.sin(Math.PI * t)) * (1 + 0.07 * Math.sin(t * Math.PI * 2 * 16)) * (0.3 + 0.7 * cap);
        };
        const fc = mesh(tube(pts, rad, 220, 20), std(COLLAR, { roughness: 0.95 }), part('furCollar', K.body), null, null, COLLAR_INK);
        K.addFur(fc, { layers: 14, length: 0.05, gravity: 0.02, repeat: [30, 3] });
      }

      /* ---------------- open-front outer robe (外袍): shoulders, side skirts, hem band ---------------- */
      const coatProf = new THREE.SplineCurve([[0.9, 0.3], [0.99, 0.35], [1.06, 0.44], [1.09, 0.56], [1.06, 0.7], [0.98, 0.84], [0.87, 0.98], [0.75, 1.12], [0.66, 1.3], [0.6, 1.5], [0.53, 1.66], [0.42, 1.78], [0.3, 1.86]]
        .map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(90);
      const coatR = (y) => { for (let i = 0; i < coatProf.length - 1; i++) { const a = coatProf[i], b = coatProf[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < 0.3 ? 0.9 : 0.3; };
      const gapW = (y) => lerp(0.54, 0.4, sst(0.3, 1.2, y)) - 0.1 * sst(1.2, 1.8, y);
      const phiH = (y) => Math.asin(Math.min(gapW(y) / coatR(y), 0.97));
      const Y0 = 0.3, Y1 = 1.86;
      {
        const nu = 140, nv = 56, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, y = lerp(Y0, Y1, t), r = coatR(y), ph = phiH(y);
          const zs = 1 - 0.14 * sst(1.1, 0.45, y);
          for (let i = 0; i <= nu; i++) { const phi = ph + (Math.PI * 2 - 2 * ph) * i / nu; pos.push(Math.sin(phi) * r, y, Math.cos(phi) * r * zs); uv.push(i / nu, t); }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const W = 2048, H = 1024;
        const rowY = (y) => (1 - (y - Y0) / (Y1 - Y0)) * H;
        // canvas x of a front-view position (side sx, |x|) at height y
        const colX = (sx, ax, y) => { const r = coatR(y), ph = phiH(y), a = Math.asin(Math.min(ax / r, 0.999)); const phi = sx > 0 ? a : Math.PI * 2 - a; return (phi - ph) / (Math.PI * 2 - 2 * ph) * W; };
        const tex = canvasTex(W, H, (g) => {
          D.fill(g, ROBE);
          // blue-grey shoulder yoke with a gold edge
          const yk = rowY(1.5);
          g.fillStyle = BLUE_LT; g.fillRect(0, 0, W, yk);
          g.fillStyle = GOLD; g.fillRect(0, yk, W, 9); g.fillStyle = 'rgba(150,120,80,0.7)'; g.fillRect(0, yk + 9, W, 2);
          // hem band: light blue-grey with a gold line above
          const yh = rowY(0.46);
          g.fillStyle = BLUE_LT; g.fillRect(0, yh, W, H - yh);
          g.fillStyle = GOLD; g.fillRect(0, yh - 10, W, 10);
          g.fillStyle = 'rgba(120,110,95,0.8)'; g.fillRect(0, H - 4, W, 4);
          // motifs on the visible front-side skirts. The canvas has fewer px per world unit across than
          // down, so each motif is squeezed horizontally by that ratio to keep its drawn proportions.
          const M = (sx, ax, y, fn) => {
            const ppu = W / (coatR(y) * (Math.PI * 2 - 2 * phiH(y))), k = ppu / (H / (Y1 - Y0));
            g.save(); g.translate(colX(sx, ax, y), rowY(y)); g.scale(k, 1); fn(); g.restore();
          };
          M(-1, 0.68, 0.64, () => plumBranch(g, 0, 0, 250, false));
          M(-1, 0.97, 0.66, () => pineSpray(g, 0, 0, 150, -0.5, false));
          M(-1, 0.84, 0.5, () => D.snowflake(g, 0, 0, 22, 'rgba(200,200,205,0.9)', 5));
          M(-1, 0.93, 0.83, () => D5(g, 0, 0, 16));
          M(1, 0.82, 0.74, () => pineSpray(g, 0, 0, 220, -0.08, true));
          M(1, 0.72, 0.53, () => swirl(g, 0, 0, 72, WAVE, -1));
          M(1, 0.95, 0.6, () => swirl(g, 0, 0, 50, WAVE, 1));
          M(1, 0.6, 0.62, () => { g.fillStyle = WAVE; g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fill(); });
          // back: snowflakes, pine and swirls
          const kB = (W / (coatR(0.7) * (Math.PI * 2 - 2 * phiH(0.7)))) / (H / (Y1 - Y0));
          const B = (u, y, fn) => { g.save(); g.translate(u * W, rowY(y)); g.scale(kB, 1); fn(); g.restore(); };
          [[0.36, 0.62, 44], [0.5, 0.8, 56], [0.64, 0.6, 44], [0.43, 1.2, 36], [0.57, 1.25, 36]].forEach(([u, y, sz]) => B(u, y, () => D.snowflake(g, 0, 0, sz, SNOWC, 8)));
          B(0.5, 0.56, () => pineSpray(g, 0, 0, 220, 0.05, true));
          B(0.4, 0.5, () => swirl(g, 0, 0, 70, WAVE, 1)); B(0.6, 0.5, () => swirl(g, 0, 0, 70, WAVE, -1));
          // front edge bands (constant world width) along both open edges, gold line inside
          const edge = (inset, wd, col) => {
            [0, 1].forEach(side => {
              g.fillStyle = col; g.beginPath();
              const A = [], B = [];
              for (let k = 0; k <= 40; k++) {
                const y = lerp(Y0, Y1, k / 40), circ = coatR(y) * (Math.PI * 2 - 2 * phiH(y)), px0 = inset / circ * W, px1 = (inset + wd) / circ * W;
                A.push([side ? W - px0 : px0, rowY(y)]); B.push([side ? W - px1 : px1, rowY(y)]);
              }
              A.concat(B.reverse()).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
            });
          };
          edge(0, 0.1, BLUE); edge(0.1, 0.014, GOLD);
          // blue-grey bands framing the outer edges of the two side skirts (up to the sleeve bottoms)
          [-1, 1].forEach(sx => {
            const pts = [];
            for (let k = 0; k <= 20; k++) { const y = lerp(Y0, 0.95, k / 20); pts.push([colX(sx, coatR(y) * 0.955, y), rowY(y)]); }
            g.lineCap = 'butt'; g.lineJoin = 'round';
            g.strokeStyle = BLUE_LT; g.lineWidth = 34; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
            g.strokeStyle = GOLD; g.lineWidth = 7; g.beginPath(); pts.forEach(([x, y], i) => { const xx = x - sx * 20; i ? g.lineTo(xx, y) : g.moveTo(xx, y); }); g.stroke();
          });
        });
        mesh(geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.9 }), K.robeG, null, null, BLUE_INK);
        const hem = []; for (let k = 0; k <= nu; k++) hem.push(V(pos[k * 3] * 1.004, Y0 + 0.004, pos[k * 3 + 2] * 1.004));
        mesh(tube(hem, 0.012, 200, 6), std(BLUE_INK, { roughness: 0.8 }), K.robeG);
      }

      /* ---------------- blue-grey shoulder yoke (披肩) over the sleeve tops ---------------- */
      {
        const gap = 50 * Math.PI / 180, zc = 0.9;
        const prof = [[0.9, 1.54], [0.875, 1.62], [0.81, 1.71], [0.7, 1.79], [0.54, 1.86], [0.38, 1.91]];
        const tex = canvasTex(1024, 256, (g, w, h) => {
          D.fill(g, BLUE_LT);
          g.fillStyle = GOLD; g.fillRect(0, h - 26, w, 18); g.fillStyle = 'rgba(120,105,85,0.8)'; g.fillRect(0, h - 8, w, 8);
          [0.38, 0.5, 0.62].forEach((u, i) => D.snowflake(g, u * w, h * (i === 1 ? 0.45 : 0.55), 26, '#E9EEF0', 5));
        });
        const cl = K.lathe(prof, 96, gap, Math.PI * 2 - gap * 2, 24);
        mesh(cl.geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.9 }), K.robeG, null, [1, 1, zc], BLUE_INK);
        const hem = [];
        for (let i = 0; i <= 60; i++) { const a = gap + (Math.PI * 2 - gap * 2) * i / 60; hem.push(V(Math.sin(a) * 0.905, 1.542, Math.cos(a) * 0.905 * zc)); }
        mesh(tube(hem, 0.014, 160, 8), std(BLUE_INK, { roughness: 0.8 }), K.robeG);
      }

      /* ---------------- wide cream sleeves with blue-grey cuffs ---------------- */
      const sleevesG = part('sleeves', K.body);
      const sleeveTex = (sx) => canvasTex(1024, 1024, (g, w, h) => {
        const row = y => (1 - (y - 0.3) / 1.5) * 1024;
        D.fill(g, ROBE);
        // faint fold lines near the shoulder
        g.strokeStyle = 'rgba(205,185,160,0.45)'; g.lineWidth = 6; g.lineCap = 'round';
        [[430, row(1.52), 600, row(1.47)], [470, row(1.43), 640, row(1.4)]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2, b - 16, c, d); g.stroke(); });
        // motifs on the front face: canvas x = t along the arm (front face ≈ t 0.6 outer → 0.86 cuff);
        // the image-right sleeve runs the other way on screen, so its motifs are mirrored in place
        const at = (t, y, fn) => { g.save(); g.translate(t * w, row(y)); if (sx > 0) g.scale(-1, 1); fn(); g.restore(); };
        if (sx < 0) {
          at(0.765, 1.42, () => D.snowflake(g, 0, 0, 46, SNOWC, 8));
          at(0.72, 1.17, () => swirl(g, 0, 0, 62, WAVE, 1));
          at(0.8, 0.98, () => pineSpray(g, 0, 0, 200, -0.12, true));
        } else {
          at(0.765, 1.44, () => D.snowflake(g, 0, 0, 44, SNOWC, 8));
          at(0.8, 1.13, () => plumBranch(g, 0, 0, 190, false));
          at(0.69, 1.2, () => pineSpray(g, 0, 0, 150, -0.35, false));
        }
        // cuff: gold line then a broad blue-grey band
        g.fillStyle = GOLD; g.fillRect(868, 0, 16, h);
        g.fillStyle = BLUE_LT; g.fillRect(884, 0, w - 884, h);
        g.fillStyle = BLUE_INK; g.fillRect(1016, 0, 8, h);
        if (sx > 0) at(0.925, 1.08, () => D.snowflake(g, 0, 0, 24, '#FFFFFF', 5));
      });
      const liningMat = std(BLUE_LT, { side: THREE.BackSide, roughness: 0.9 });
      const buildSleeve = (sx) => {
        const spine = new THREE.CatmullRomCurve3([V(0.34 * sx, 0, -0.24), V(0.6 * sx, 0, -0.08), V(0.69 * sx, 0, 0.2), V(0.64 * sx, 0, 0.5), V(0.49 * sx, 0, 0.67), V(0.3 * sx, 0, 0.75)]);
        const NT = 64, NA = 56, pos = [], uv = [], idx = [], ring = [];
        for (let i = 0; i <= NT; i++) {
          const t = i / NT, C = spine.getPointAt(t), T = spine.getTangentAt(t);
          T.y = 0; T.normalize();
          const n = V(T.z, 0, -T.x).multiplyScalar(sx);
          const yT = lerp(1.76, 1.56, sst(0.25, 1, t)), yB = lerp(1.25, 0.84, sst(0, 0.8, t));
          const Wd = lerp(0.1, 0.16, sst(0, 0.3, t)) * (1 - 0.2 * sst(0.7, 1, t));
          const mid = (yT + yB) / 2, half = (yT - yB) / 2, sh = 0.16 * sst(0.55, 1, t);
          for (let j = 0; j <= NA; j++) {
            const a = j / NA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            const y = mid + half * Math.sign(ca) * Math.pow(Math.abs(ca), 0.85);
            const hgt = (y - yB) / (yT - yB);
            const s = Wd * Math.sign(sa) * Math.pow(Math.abs(sa), 0.7) * (1 + 0.25 * (1 - hgt));
            const p = C.clone().addScaledVector(n, s).addScaledVector(T, sh * Math.max(0, y - 1.0));
            p.y = y;
            pos.push(p.x, p.y, p.z); uv.push(t, (y - 0.3) / 1.5);
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
        if (nv.dot(pv.clone().sub(c0)) < 0) {
          for (let q = 0; q < idx.length; q += 3) { const tt = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tt; }
          geo.setIndex(idx); K.smoothNormals(geo);
        }
        const sm = mesh(geo, texMat(sleeveTex(sx), { roughness: 0.9 }), sleevesG, null, null, BLUE_INK);
        K.sleeveMeshes.push(sm);
        const lin = new THREE.Mesh(geo, liningMat); lin.receiveShadow = true; sleevesG.add(lin);
      };
      buildSleeve(-1); buildSleeve(1);

      /* ---------------- apron (蔽膝): pine, waves, snowflake and a bowl of tangyuan ---------------- */
      const apronG = part('apron', K.body);
      {
        const y0 = 0.17, y1 = 1.16, nu = 24, nv = 30, Rc = 1.2, pos = [], uv = [], idx = [];
        const HWB = 0.53, HWT = 0.4;
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, y = lerp(y0, y1, t), hw = lerp(HWB, HWT, t), zf = lerp(0.77, 0.66, t);
          for (let i = 0; i <= nu; i++) {
            const s = i / nu, x = lerp(-hw, hw, s);
            let z = zf - (Rc - Math.sqrt(Rc * Rc - x * x));
            z = Math.max(z, Math.sqrt(Math.max(K.robeR(y) ** 2 - x * x, 0)) + 0.03);
            pos.push(x, y, z); uv.push(s, t);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); geo.computeVertexNormals();
        // canvas 512 × 1024; x ∝ s across (bottom width 1.06), y ∝ height (0.99)
        const tex = canvasTex(512, 1024, (g, w, h) => {
          const PY = y => (1 - (y - y0) / (y1 - y0)) * h;
          const PX = (x, y) => { const hw = lerp(HWB, HWT, (y - y0) / (y1 - y0)); return (x / hw * 0.5 + 0.5) * w; };
          g.fillStyle = ROBE; g.fillRect(0, 0, w, h);
          // outer red strips (inner garment), blue-grey frame, gold inner line — in s units across the panel
          const S = (s) => s * w;
          const R0 = 0.07, F0 = 0.16;
          g.fillStyle = RED; g.fillRect(0, 0, S(R0), h); g.fillRect(w - S(R0), 0, S(R0), h);
          g.fillStyle = BLUE; g.fillRect(S(R0), 0, S(F0 - R0), h); g.fillRect(w - S(F0), 0, S(F0 - R0), h);
          g.fillRect(S(R0), h - 58, w - S(2 * R0), 58);
          g.fillStyle = GOLD; g.fillRect(S(F0), 0, 9, h - 58); g.fillRect(w - S(F0) - 9, 0, 9, h - 58); g.fillRect(S(F0), h - 67, w - S(2 * F0), 9);
          g.fillStyle = 'rgba(110,100,90,0.7)'; g.fillRect(S(R0) - 3, 0, 3, h); g.fillRect(w - S(R0), 0, 3, h); g.fillRect(S(R0), h - 3, w - S(2 * R0), 3);
          // motifs (inside the frame)
          g.save(); g.beginPath(); g.rect(S(F0) + 9, 0, w - S(2 * F0) - 18, h - 67); g.clip();
          // (px per world unit: ≈ 545 across, 1034 down → motifs squeezed across by 0.53)
          const Mo = (x, y, fn) => { g.save(); g.translate(PX(x, y), PY(y)); g.scale(0.53, 1); fn(); g.restore(); };
          g.strokeStyle = WAVE2; g.lineCap = 'round';
          [[0.64, 14, -0.5, 0.35], [0.57, 13, -0.45, 0.42], [0.33, 12, 0.02, 0.5], [0.27, 11, 0.08, 0.5]].forEach(([yy, lw, xa, xb]) => {
            g.lineWidth = lw; g.beginPath(); g.moveTo(PX(xa, yy), PY(yy) + 20); g.quadraticCurveTo(PX((xa + xb) / 2, yy), PY(yy) - 46, PX(xb, yy), PY(yy) + 8); g.stroke();
          });
          Mo(-0.2, 0.74, () => swirl(g, 0, 0, 60, WAVE2, 1));
          Mo(0.22, 0.66, () => D.snowflake(g, 0, 0, 66, SNOWC, 12));
          Mo(0.33, 0.47, () => { g.fillStyle = WAVE2; g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.fill(); });
          g.strokeStyle = BRANCH; g.lineWidth = 9; g.beginPath(); g.moveTo(PX(-0.36, 0.44), PY(0.44)); g.quadraticCurveTo(PX(-0.1, 0.3), PY(0.3), PX(0.1, 0.24), PY(0.24)); g.stroke();
          Mo(-0.14, 0.36, () => pineSpray(g, 0, 0, 330, -0.18, false));
          Mo(0.11, 0.235, () => { g.fillStyle = BERRY; g.beginPath(); g.arc(0, 0, 20, 0, Math.PI * 2); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(16, 6, 12, 0, Math.PI * 2); g.fill(); });
          Mo(0.26, 0.31, () => bowl(g, 0, 0, 190));
          g.restore();
          // hanging blue-grey sash down the centre (from the belt knot)
          const sy1 = PY(0.42);
          g.fillStyle = GOLD; g.fillRect(w / 2 - 44, 0, 88, sy1 + 8);
          g.fillStyle = BLUE_DK; g.fillRect(w / 2 - 34, 0, 68, sy1);
          g.fillStyle = BLUE; g.fillRect(w / 2 - 20, 0, 40, sy1 - 12);
        });
        mesh(geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.9 }), apronG);
      }

      /* ---------------- belt knot (盤長結), beads and red tassels ---------------- */
      const beltG = K.beltG;
      const zK = K.robeR(1.2) + 0.13;
      {
        // 盤長結-style knot: a woven centre square with four round loops, all facing the viewer
        const km = std(GOLD, { roughness: 0.45, metalness: 0.1, emissive: new THREE.Color(GOLD).convertSRGBToLinear(), emissiveIntensity: 0.12 });
        const kg = group(beltG, [0, 1.19, zK]);
        mesh(K.roundBox(0.06, 0.06, 0.03, 0.012, 0.008), km, kg, [0, 0, 0.012], null, GOLD_INK).rotation.z = Math.PI / 4;
        [[0, 0.062], [-0.062, 0], [0.062, 0], [0, -0.058]].forEach(([dx, dy]) => mesh(new THREE.TorusGeometry(0.036, 0.012, 10, 28), km, kg, [dx, dy, 0], null, GOLD_INK));
        mesh(sphere(0.022, 16, 12), km, kg, [0, 0, 0.03], null, GOLD_INK);
      }
      const tasG = group(beltG, [0, 1.1, zK + 0.02]);
      {
        const rm = std(RED_DK, { roughness: 0.75 });
        mesh(tube([[0, 0.02, 0], [0, -0.04, 0.01], [0, -0.08, 0.012]], 0.009, 8, 6), rm, tasG);
        mesh(sphere(0.032, 20, 14), std(PEARL, { roughness: 0.3 }), tasG, [0, -0.07, 0.015], null, '#BDB5AA');
        mesh(sphere(0.02, 14, 10), goldMat, tasG, [0, -0.115, 0.018], null, GOLD_INK);
        mesh(tube([[0, -0.12, 0.018], [0, -0.19, 0.03]], 0.008, 6, 6), rm, tasG);
        // two red tassels fanning out behind the big bead
        [-1, 1].forEach(sx => {
          const tg = group(tasG, [0.03 * sx, -0.1, 0.0], [0, 0, 0.28 * sx]);
          mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.05, 16), rm, tg, [0, -0.03, 0], null, RED_INK);
          for (let i = 0; i < 8; i++) { const s = mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.26, 6), rm, tg, [(i - 3.5) * 0.008, -0.18, (i % 2) * 0.008]); s.rotation.z = (i - 3.5) * 0.03; }
        });
        mesh(sphere(0.07, 28, 20), std(PEARL, { roughness: 0.35 }), tasG, [0, -0.26, 0.045], null, '#C5BCB0');
      }
      K.onTick((t, k) => { tasG.rotation.z = 0.07 * Math.sin(t * 1.6) * k; });

      /* ---------------- 笏板 with the winter sun, held upright in both paws ---------------- */
      const boardG = part('board', K.body);
      {
        const Wt = 0.3, Ht = 0.88;
        const shape = [[-0.14, 0], [0.14, 0], [0.15, 0.78], [0.085, Ht], [-0.085, Ht], [-0.15, 0.78]];
        const geo = extrude(shape, 0.04, 0.012, 3, 8);
        const tex = canvasTex(256, 800, (g, w, h) => {
          const px = x => (x / Wt + 0.5) * w, py = y => (1 - y / Ht) * h;
          g.fillStyle = TAB; g.fillRect(0, 0, w, h);
          const inset = [[-0.115, 0.03], [0.115, 0.03], [0.125, 0.76], [0.07, 0.84], [-0.07, 0.84], [-0.125, 0.76]];
          g.strokeStyle = TAB_EDGE; g.lineWidth = 9; g.beginPath(); inset.forEach(([x, y], i) => i ? g.lineTo(px(x), py(y)) : g.moveTo(px(x), py(y))); g.closePath(); g.stroke();
          D.sun(g, px(0), py(0.66), 70, SUN, SUN);
          swirl(g, px(0.0), py(0.42), 34, WAVE, -1);
          g.strokeStyle = WAVE; g.lineWidth = 6; g.lineCap = 'round';
          [0.32, 0.27].forEach(y => { g.beginPath(); g.moveTo(px(-0.11), py(y)); g.quadraticCurveTo(px(0), py(y + 0.05), px(0.11), py(y)); g.stroke(); });
          g.fillStyle = BLUE; g.beginPath(); g.moveTo(px(-0.1), py(0.18)); g.lineTo(px(0), py(0.26)); g.lineTo(px(0.1), py(0.18)); g.closePath(); g.fill();
        });
        tex.repeat.set(1 / Wt, 1 / Ht); tex.offset.set(0.5, 0);
        const bg = group(boardG, [0, 1.29, 0.98], [-0.07, 0, 0]);
        mesh(geo, [texMat(tex, { roughness: 0.6 }), std(TAB_EDGE, { roughness: 0.55 })], bg, null, null, TAB_INK);
      }
      // toe creases on the front paws
      {
        const cm = std(CREASE, { roughness: 0.8 });
        ['L', 'R'].forEach(s => {
          const p = K.hands[s].p;
          [-0.04, 0.04].forEach(dx => mesh(tube([[p.x + dx, p.y - 0.02, p.z + 0.14], [p.x + dx * 1.1, p.y - 0.08, p.z + 0.125], [p.x + dx * 1.2, p.y - 0.12, p.z + 0.09]], 0.006, 8, 5), cm, K.poseG));
        });
      }

      /* ---------------- feet: sandy legs with big cream paws ---------------- */
      {
        const fm = std(LEG, { roughness: 0.95 }), tm = std(CREAM, { roughness: 0.95 }), cm = std(CREASE, { roughness: 0.8 });
        [-1, 1].forEach(sx => {
          const fg = group(K.poseG, [0.46 * sx, 0, 0.5]);
          mesh(sphere(0.2), fm, fg, [0, 0.16, -0.1], [1.25, 0.9, 1.1], INK);
          mesh(sphere(0.2), tm, fg, [0, 0.12, 0.06], [1.3, 0.62, 1.05], CREAM_INK);
          [-0.07, 0.07].forEach(dx => mesh(tube([[dx, 0.19, 0.24], [dx * 1.05, 0.12, 0.27], [dx * 1.1, 0.05, 0.25]], 0.006, 8, 5), cm, fg));
        });
      }

      /* ---------------- floating winter decorations ---------------- */
      {
        const items = [];
        [[-2.0, 2.9, 0.1, 0.34], [2.1, 2.6, 0.2, 0.28], [-2.2, 1.2, 0.3, 0.24], [2.3, 0.9, 0.1, 0.22]].forEach(([x, y, z, s], i) => {
          const g = K.snowflake(K.decor, [x, y, z], s, i % 2 ? '#A9BCCB' : '#BCCDD9'); items.push(g);
        });
        // the returning winter sun (一陽生)
        {
          const g = group(K.decor, [-1.9, 3.7, -0.2]);
          mesh(new THREE.CircleGeometry(0.2, 40), std(SUN, { emissive: new THREE.Color(SUN).convertSRGBToLinear(), emissiveIntensity: 0.35, side: THREE.DoubleSide }), g);
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const r = mesh(new THREE.BoxGeometry(0.035, 0.1, 0.02), std(SUN, { roughness: 0.6 }), g, [Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0]); r.rotation.z = a - Math.PI / 2; }
          items.push(g);
        }
        // a floating plum blossom
        {
          const g = group(K.decor, [2.2, 3.5, 0.0]);
          K.flower(g, [0, 0, 0], 0.55, PLUM, PLUM_C, 5); items.push(g);
        }
        items.forEach((g) => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.08 * Math.sin(t * 1.0 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.15 * Math.sin(t * 0.7 + i) * k;
        }));
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '冬至「一陽生」的賀冬官',
        text: '冬至白晝最短，古人說「冬至一陽生」，陽氣從這天開始回升。這隻沙色長毛的沙漠貓化身上朝賀冬的文官：帽徽與笏板都畫著暖陽，身上披白絨領、穿灰藍配米白的冬袍，袍面繡松、梅、雪花，下襬還有一碗湯圓。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '蓬鬆圓臉與虎斑',
        text: '寬圓的大臉兩側炸開一撮撮尖長的沙色長毛，額頭有一道長、兩道短的淺棕虎斑，兩頰各兩道斜紋。眼周到下巴是奶白色，深棕圓眼、粉色小鼻、「ω」小嘴，腮紅上點著兩顆小點。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '大尖耳',
        text: '一對又大又寬的尖耳朵立在官帽兩側，耳內淡粉，冒出蓬鬆的白色耳毛——沙漠貓招牌的大耳朵。' },
      hat: { chip: '官帽', tag: '服飾', name: '暖陽方官帽',
        text: '灰黑色方形官帽，帽頂微拱、向上略為外擴，鑲金色邊線與兩道直紋。帽前中央是金框米白圓徽，畫著一輪暖陽，上方綴一顆白珍珠；兩側伸出金色花形飾，各垂一條紅流蘇。' },
      board: { chip: '笏板', tag: '道具', name: '暖陽笏板',
        text: '雙爪在胸前直直捧著淡金色笏板，板頂切成六角，內圈有金色細框。上端畫著金色太陽，下面是灰藍的雲紋與水波，呼應冬至陽氣初生。' },
      furCollar: { chip: '絨領', tag: '服飾', name: '白色絨毛領',
        text: '一圈厚厚的白色絨毛像圍脖一樣從頸後繞過雙肩，沿著前襟斜斜收成 V 字，停在捧笏的手爪上方；絨領內側露出一線朱紅襯裡與灰藍前襟，是冬衣最暖和的部分。' },
      robe: { chip: '外袍', tag: '服飾', name: '灰藍松梅冬袍',
        text: '肩部是灰藍色、鑲金邊，米白的外袍下襬向外張開，收一圈灰藍寬邊與金線。左側繡紅果白梅，右側繡覆雪松枝與捲雲水紋；前襟與蔽膝之間露出一線朱紅內襯。' },
      sleeves: { chip: '寬袖', tag: '服飾', name: '米白寬袖',
        text: '米白寬袖垂到腰下，袖口是寬寬的灰藍滾邊配金線。左袖繡雪花、捲雲與覆雪松枝，右袖繡雪花、紅果白梅與松枝。' },
      apron: { chip: '蔽膝', tag: '服飾', name: '湯圓蔽膝',
        text: '腰下垂著米白蔽膝，圍一圈灰藍框與金線，中央垂下一條灰藍帶。蔽膝上畫水波、雪花與紅果松枝，右下角還有一碗白白的湯圓——冬至吃湯圓、添一歲。' },
      belt: { chip: '結飾', tag: '服飾', name: '金結與紅流蘇',
        text: '灰藍腰帶正中繫著金色盤長結，下面串一顆白珍珠、一顆小金珠和一顆圓圓的大白珠，兩側垂下朱紅流蘇，走動時輕輕擺動。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '蓬鬆環紋大尾', dir: [1, 0.25, -0.7],
        text: '又粗又蓬的沙色大尾巴從袍子右後方豎起，頂端向右捲成小勾、尾尖朝下；身上有三道鋸齒狀的淺棕環紋，捲起的尾頂顏色最深。' }
    },
    order: ['overview', 'face', 'ears', 'hat', 'board', 'furCollar', 'robe', 'sleeves', 'apron', 'belt', 'tail']
  });
})();
