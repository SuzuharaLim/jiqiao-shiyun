// @file 20_小雪_美國短毛貓
// @title 小雪・瑞雪巡使 | 二十四節氣貓
(function () {
  /* ---------------------------------------------------------------------------
   * 20 小雪 — silver-tabby American shorthair "瑞雪巡使" (snow herald) with a tasselled spear and a
   * hanging snowflake banner, blue winter cap, fur-trimmed blue capelet, cream robe and blue fur boots.
   * Picture scale: 1 unit = 100 px of refs/20.png, body axis at px x = 256, boot soles at px y = 485.
   * Colours are SAMPLED from the picture; def.exposure dims the lights so they render close to it.
   * ------------------------------------------------------------------------- */
  const S = 0.01, X = px => (px - 256) * S, Y = py => (485 - py) * S;
  const HY = 3.35, NECK = 2.62;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const rad = d => d * Math.PI / 180;

  // ---- colours sampled from refs/20.png ----
  const FUR = '#D6CFD1', FUR_TOP = '#D8D1D3', FUR_SIDE = '#D6CFD1', STRIPE = '#9A9296', STRIPE_DK = '#8A8286';
  const WHITE = '#FBF6EC', INK = '#8D7C75', CREAM_INK = '#CDBBA8';
  const EYE = '#52311D', NOSE = '#F4AFA3', EAR_IN = '#F5C2B6';
  const HAT = '#8397A6', HAT_DK = '#74889A', HAT_INK = '#56646F';
  const CAPE = '#97A8B9', CAPE_INK = '#62717F', BLUE_LT = '#B3C1CC', BAND = '#9BAEBD', SASH = '#93A6B5', BLUE_INK = '#657686';
  const PANEL = '#93A5B7', SNOW = '#8FA5B8';
  const CREAM = '#F5EEE4', ROBE_INK = '#C3AE95';
  const GOLD = '#E6C28A', GOLD_LT = '#F4D397', GOLD_DK = '#C99D62', GOLD_INK = '#A57C45';
  const RED = '#D86A50', RED_INK = '#9C4A3A', BERRY = '#D9503F';
  const PINE = '#6D7767', PINE_LT = '#86907A', PINE_INK = '#4C5446', TWIG = '#8A6A55';
  const JADE = '#A9CDB8', JADE_INK = '#6F9180';
  const BOOT = '#6D7E8B', BOOT_INK = '#4A5761', LEG = '#BDB3B0', LEG_DK = '#9C9090';
  const SHAFT = '#B7845E', SHAFT_INK = '#744E31', BLADE = '#D4D8DC', BLADE_DK = '#B5BEC8', BLADE_INK = '#8A8F96';
  const TAIL = '#CEC6C6', TAIL_DK = '#8E8384', TAIL_TIP = '#F6EFE6';

  // spear (world): butt tip → blade tip; the image-left paw grips it at py 262
  const SPB = [X(190), Y(472), 1.15], SPT = [X(84), Y(22), 0.18];
  const spearAt = y => { const t = (y - SPB[1]) / (SPT[1] - SPB[1]); return [lerp(SPB[0], SPT[0], t), y, lerp(SPB[2], SPT[2], t)]; };
  const HL0 = spearAt(Y(270)), HAND_L = [HL0[0] + 0.07, HL0[1], HL0[2] + 0.04];
  const HAND_R = [X(303), Y(314), 0.8];

  // ---------- canvas motifs ----------
  function flakeC(g, x, y, s, color, lw, rot) { // six-armed snowflake with two branch pairs and a hexagon core
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.strokeStyle = color; g.lineWidth = lw || Math.max(2, s * 0.1); g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate(i * Math.PI / 3);
      g.beginPath(); g.moveTo(0, -s * 0.18); g.lineTo(0, -s);
      [[0.45, 0.24], [0.7, 0.18]].forEach(([k, b]) => { g.moveTo(0, -s * k); g.lineTo(s * b, -s * (k + b)); g.moveTo(0, -s * k); g.lineTo(-s * b, -s * (k + b)); });
      g.stroke(); g.restore();
    }
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(Math.sin(a) * s * 0.18, -Math.cos(a) * s * 0.18); } g.closePath(); g.stroke();
    g.restore();
  }
  function cloudC(g, x, y, s, color, lw, flip) { // curling cloud-wave (祥雲浪紋): spiral + trailing line
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
    g.strokeStyle = color; g.lineWidth = lw || s * 0.12; g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i <= 50; i++) { const a = i / 50 * Math.PI * 2.1, r = s * (0.08 + 0.32 * i / 50); const px = Math.cos(a + Math.PI) * r, py = -Math.sin(a + Math.PI) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.quadraticCurveTo(s * 0.9, s * 0.5, s * 1.4, s * 0.3); g.stroke();
    g.beginPath(); g.arc(-s * 0.72, s * 0.14, s * 0.26, Math.PI * 0.2, Math.PI * 1.35); g.stroke();
    g.beginPath(); g.moveTo(-s * 1.1, s * 0.55); g.quadraticCurveTo(0, s * 0.7, s * 1.3, s * 0.62); g.stroke();
    g.restore();
  }
  function pineC(g, x, y, s, ang, berries) { // painted pine sprig with red berries (capelet / apron)
    g.save(); g.translate(x, y); g.rotate(ang || 0); g.lineCap = 'round';
    g.strokeStyle = TWIG; g.lineWidth = Math.max(2, s * 0.05);
    g.beginPath(); g.moveTo(-s * 0.1, 0); g.lineTo(s * 0.95, 0); g.stroke();
    [[0.15, 1], [0.45, 0.9], [0.75, 0.75]].forEach(([t, k]) => {
      for (let i = 0; i < 11; i++) {
        const a = -Math.PI * 0.92 + i / 10 * Math.PI * 0.84, L = s * 0.3 * k;
        g.strokeStyle = i % 2 ? PINE : PINE_LT; g.lineWidth = Math.max(1.5, s * 0.035);
        g.beginPath(); g.moveTo(s * t, 0); g.lineTo(s * t + Math.cos(a) * L, Math.sin(a) * L); g.stroke();
      }
    });
    (berries || []).forEach(([bx, by, br]) => {
      g.fillStyle = BERRY; g.beginPath(); g.arc(bx * s, by * s, br * s, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(bx * s - br * s * 0.35, by * s - br * s * 0.35, br * s * 0.28, 0, Math.PI * 2); g.fill();
    });
    g.restore();
  }

  NEKO.run({
    meta: {
      id: '20', term: '小雪', title: '小雪・瑞雪巡使', seal: '雪',
      eyebrow: '二〇二七節氣貓 · 20 小雪 · 美國短毛貓',
      aria: '戴白絨邊藍色暖帽、帽前金框雪花徽並插松枝紅果，披白毛滾邊的藍色雪花短披肩，身穿米白長袍與雪花蔽膝，畫面左爪握著掛雪花幡旗的紅纓銀槍，腳穿白絨藍靴、身後翹著環紋大尾巴的銀色虎斑美國短毛貓 3D 模型'
    },
    theme: { accent: '#4F6A80', accentDark: '#B9CADA', glow: 'rgba(172, 186, 200, 0.34)', glowColor: '#CADAE8' },
    palette: [['#D3CAC7', '銀灰虎斑'], ['#ACBAC8', '霜雪藍'], ['#FAF2E7', '月白'], ['#D86A50', '朱紅纓']],
    spec: [['品種', '美國短毛貓（銀色虎斑）'], ['角色', '小雪・瑞雪巡使'], ['頭身比', '約 1 : 1.6']],
    seed: 2020,
    exposure: 0.82,

    action: {
      label: '揮旗', dur: 2.2,
      run(s, p, K) {
        if (K.__spear) K.__spear.rotation.z = 0.16 * s * Math.sin(p * Math.PI * 4);
        if (K.__banner) K.__banner.rotation.x = 0.2 * s * Math.sin(p * Math.PI * 6);
      }
    },

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR, low: FUR_SIDE, deep: STRIPE, cream: WHITE,
        ink: INK, creamInk: CREAM_INK, pattern: 'none', mask: false,
        noise: { colors: ['#E6DFDC', '#ADA2A0'], alpha: 0.07, n: 1200 },
        paintBase(g, P) {
          const L = (lon, lat) => P.xy(lon, lat);
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.45, FUR); vg.addColorStop(1, FUR_SIDE);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // pale underside of the jaw (the front white mask is painted in build from picture coordinates)
          g.filter = 'blur(6px)'; g.fillStyle = WHITE; g.beginPath();
          [[-118, -90], [-118, -44], [-96, -30], [-72, -26], [-50, -32], [0, -40], [50, -32], [72, -26], [96, -30], [118, -44], [118, -90]].forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill();
          // bold side stripes wrapping round the cheeks toward the back
          g.filter = 'blur(2px)';
          [[[52, 16], [72, 11], [92, 4]], [[56, 0], [74, -5], [94, -11]], [[60, -16], [76, -21], [92, -26]]].forEach((s, i) => {
            const p = s.map(([lo, la]) => L(lo, la));
            P.stroke(g, p, 17 - i * 2, STRIPE_DK, 0.95); P.stroke(g, P.mirror(p), 17 - i * 2, STRIPE_DK, 0.95);
            // thinner, fading continuation toward the back of the head
            const q = [p[2], L(s[2][0] + 14, s[2][1] - 3 - i), L(s[2][0] + 26, s[2][1] - 4 - i)];
            P.stroke(g, q, 11 - i * 2, STRIPE, 0.55); P.stroke(g, P.mirror(q), 11 - i * 2, STRIPE, 0.55);
          });
          // crown & back-of-head tabby bands
          [-150, -125, -100, 100, 125, 150].forEach(lon => P.stroke(g, [L(lon, 84), L(lon + Math.sign(lon) * 8, 45), L(lon + Math.sign(lon) * 4, 0)], 20, STRIPE, 0.8));
          P.stroke(g, [L(180, 86), L(180, 40), L(180, -5)], 22, STRIPE, 0.8); P.stroke(g, [L(-180, 86), L(-180, 40), L(-180, -5)], 22, STRIPE, 0.8);
          [[0, 12], [-14, 10], [14, 10], [-30, 9], [30, 9], [-48, 9], [48, 9], [-65, 8], [65, 8]].forEach(([lon, w]) => P.stroke(g, [L(lon, 88), L(lon, 70), L(lon * 1.05, 52)], w * 1.6, STRIPE, 0.85));
          g.filter = 'none';
        }
      },
      head: { y: HY, neck: NECK, w: 0.88, h: 0.76, d: 0.84, cheek: 0.14, ruff: 0.05, ruffFreq: 16, chinDrop: 0.03,
        // round "mochi" head: narrower toward the crown, broad cheeks just below the eyes
        deform: (p, o) => { if (o.y > 0) p.x *= 1 - 0.2 * Math.pow(o.y, 1.3); else p.x *= 1 + 0.05 * Math.sin(Math.PI * Math.min(1, -o.y / 0.8)); },
        fur: { layers: 6, length: 0.018, gravity: 0.004, repeat: [12, 6] } },
      eyes: { x: 0.34, y: -0.08, r: 0.108, sx: 0.92, sy: 1.06, sz: 0.4, color: EYE, iris: '#5E3A24', pupil: '#3A2012', pupilR: 0.7, shine: 0.45 },
      nose: { y: -0.115, color: NOSE, size: 1.0 },
      muzzle: { y: -0.22, size: 0.42, color: WHITE },
      mouth: { type: 'w', color: '#5A3A2A', y: -0.215, w: 0.18, depth: 0.055 },
      blush: { color: 'rgba(246,160,150,0.72)', x: 0.51, y: -0.23, r: 26, after: true },
      whiskers: { color: '#FBF8F2', n: 3, len: 0.3, r: 0.0055, y: -0.24, x: 0.6, spread: 0.07, droop: 0.03, curve: 0.03 },
      ears: { x: 0.6, y: 0.31, z: -0.04, tilt: 0.4, yaw: 0.2, pitch: -0.05, size: [0.46, 0.62, 0.17], sharp: 1.0, tuftScale: 1.3,
        color: '#BDB5B7', inner: EAR_IN, tuft: WHITE, fur: { layers: 8, length: 0.02, gravity: 0.006, repeat: [3, 3] } },
      bib: { color: WHITE, balls: [[0, 2.64, 0.34, 0.26], [0.28, 2.64, 0.26, 0.2], [-0.28, 2.64, 0.26, 0.2]],
        fur: { layers: 12, length: 0.05, gravity: 0.02, repeat: [3, 2] } },
      robe: {
        profile: [[1.2, 0.64], [1.19, 0.72], [1.06, 1.0], [0.87, 1.35], [0.7, 1.72], [0.63, 1.95], [0.6, 2.2], [0.52, 2.42], [0.3, 2.58], [0.12, 2.64]],
        color: '#FFFFFF', ink: ROBE_INK, lining: '#E6DCCB', hemY: 0.75,
        paint(g, w, h, D, R) {
          const U = deg => 512 + deg / 360 * 1024, V = y => R.robeV(y);
          D.fill(g, CREAM);
          // blue lower panels on the sides and back, white snowflakes, gold line above the fur hem
          const yT = V(1.3), yB = V(0.66);
          g.fillStyle = PANEL; g.fillRect(0, yT, U(-40), yB - yT); g.fillRect(U(40), yT, w - U(40), yB - yT);
          g.fillStyle = '#FFFFFF'; g.fillRect(U(-40) - 6, yT, 6, yB - yT); g.fillRect(U(40), yT, 6, yB - yT);
          g.fillStyle = GOLD; g.fillRect(0, V(0.76), w, 10);
          [[-62, 1.05, 30], [-88, 0.9, 24], [-110, 1.1, 26], [62, 1.02, 30], [88, 1.12, 24], [112, 0.92, 26], [150, 1.0, 30], [-150, 1.0, 30], [180, 1.12, 24]]
            .forEach(([d, y, s]) => flakeC(g, U(d), V(y), s, '#FFFFFF', 5));
          // outer-robe front edges: blue bands from the capelet to the hem
          g.lineCap = 'butt';
          [[-1, 1], [1, 1]].forEach(([k]) => {
            g.strokeStyle = BAND; g.lineWidth = 26; g.beginPath(); g.moveTo(U(k * 30), V(2.3)); g.lineTo(U(k * 36), V(1.72)); g.lineTo(U(k * 35), V(0.64)); g.stroke();
          });
          // cross collar (交領) of the inner robe
          g.lineWidth = 20; g.strokeStyle = BLUE_LT;
          g.beginPath(); g.moveTo(U(24), V(2.5)); g.lineTo(U(-5), V(1.98)); g.stroke();
          g.beginPath(); g.moveTo(U(-24), V(2.5)); g.lineTo(U(8), V(1.96)); g.stroke();
          g.fillStyle = 'rgba(160,140,110,0.18)'; g.fillRect(0, V(0.72) - 4, w, 4);
        }
      },
      collar: false,
      arms: {
        L: { hand: HAND_L, path: [[-0.4, 2.2, 0.0], [-1.02, 1.9, 0.3], [HAND_L[0] + 0.02, HAND_L[1] - 0.15, HAND_L[2] - 0.03]], drop: 0.85, width: 1.3, pawScale: 1.65, wrist: false },
        R: { hand: HAND_R, path: [[0.4, 2.2, 0.0], [1.02, 1.85, 0.18], [HAND_R[0] + 0.2, HAND_R[1] + 0.02, HAND_R[2] - 0.14]], drop: 0.95, width: 1.32, pawScale: 1.8, wrist: false }
      },
      sleeves: {
        style: 'wide', color: '#FFFFFF', lining: '#CAD2D9', trim: WHITE, trimR: 0.065, ink: ROBE_INK,
        paint(g, w, h, D) {
          D.fill(g, CREAM);
          // blue band just inside the fur cuff
          g.fillStyle = BAND; g.fillRect(0, 0, w, 84);
          g.fillStyle = '#FFFFFF'; g.fillRect(0, 84, w, 6);
          // light-blue snowflakes on the hanging pouch (drawn rotated so they read upright)
          [[0.62, 250, 34], [0.8, 330, 30], [0.2, 300, 26], [0.95, 200, 24]].forEach(([u, y, s]) => flakeC(g, u * w, y, s, SNOW, 5, Math.PI / 2));
        }
      },
      paws: { color: WHITE, ink: CREAM_INK },
      belt: { yT: 1.95, yB: 1.72, color: SASH, line: false, knot: false, tassel: false, ink: BLUE_INK },
      legs: false,
      feet: false,
      tail: {
        pts: [[0.3, 0.8, -0.55], [0.74, 0.56, -0.78], [1.1, 0.62, -0.74], [1.36, 0.92, -0.62], [1.52, 1.36, -0.52], [1.57, 1.76, -0.42], [1.63, 1.97, -0.38], [1.79, 1.96, -0.34], [1.86, 1.82, -0.3]],
        r: 0.26, color: TAIL, ink: INK,
        shape: t => (0.74 + 0.26 * sst(0, 0.3, t) - 0.06 * sst(0.45, 0.7, t)) * (t > 0.74 ? Math.pow(Math.cos((t - 0.74) / 0.26 * Math.PI / 2), 0.8) : 1) + 0.02,
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, '#C9BFBC'); lg.addColorStop(0.7, TAIL); lg.addColorStop(0.8, '#E8E0DC'); lg.addColorStop(0.88, TAIL_TIP); lg.addColorStop(1, TAIL_TIP);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.fillStyle = TAIL_DK;
          [[0.18, 0.06], [0.33, 0.07], [0.48, 0.07], [0.62, 0.065], [0.74, 0.05]].forEach(([c, bw]) => {
            const x0 = (c - bw / 2) * w, x1 = (c + bw / 2) * w, n = 10;
            g.beginPath(); g.moveTo(x0, 0);
            for (let i = 0; i <= n; i++) g.lineTo(x0 + (i % 2 ? -13 : 9), i / n * h);
            for (let i = n; i >= 0; i--) g.lineTo(x1 + (i % 2 ? 13 : -9), i / n * h);
            g.closePath(); g.fill();
          });
        },
        fur: { layers: 12, length: 0.05, gravity: 0.012, repeat: [18, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, ribbon, lathe, medal, D } = K;
      const DS = THREE.DoubleSide, UP = V(0, 1, 0);
      const orient = (m, dir) => { m.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); return m; };
      const goldM = std(GOLD, { roughness: 0.45, metalness: 0.15 }), goldLtM = std(GOLD_LT, { roughness: 0.45, metalness: 0.1 });
      const whiteM = std(WHITE, { roughness: 0.95 }), redM = std(RED, { roughness: 0.75 });
      const furTrim = { layers: 9, length: 0.03, gravity: 0.008, repeat: [26, 4] };
      const puffy = (r, n) => t => r * (1 + 0.14 * Math.pow(Math.abs(Math.sin(t * Math.PI * n)), 0.6) - 0.07);   // scalloped fur roll

      /* ======================= face: white mask & tabby stripes painted from picture coordinates ======================= */
      {
        // flatter, painterly shading on the head: half the light comes from an emissive copy of the head map
        const hmat = K.headMesh.material;
        hmat.color = new THREE.Color(0.4, 0.4, 0.4); hmat.emissive = new THREE.Color(0.6, 0.6, 0.6); hmat.emissiveMap = K.headTex; hmat.needsUpdate = true;
        const g = K.headTex.image.getContext('2d');
        // picture px → head-map px; points just outside the silhouette slide toward the centre until they hit the head
        const uvp = (px, py) => { for (let k = 0; k < 12; k++) { const s = K.onSkin(X(px) * (1 - 0.03 * k), Y(py), [K.headMesh]); if (s.uv) return [s.uv.x * 1024, (1 - s.uv.y) * 512]; } return null; };
        // white lower face: two rounded lobes between the eyes, widening over the cheeks to the chin
        const half = [[256, 131], [249, 126], [239, 124], [228, 127], [217, 134], [207, 142], [198, 151], [191, 161], [186, 171], [181, 180], [175, 189], [167, 197], [160, 206], [155, 216], [152, 228]];
        const poly = half.concat(half.slice().reverse().map(([x, y]) => [512 - x, y]));
        const pts = poly.map(([x, y]) => uvp(x, y)).filter(Boolean);
        g.save(); g.filter = 'blur(3px)'; g.fillStyle = '#FFFDF8'; g.beginPath();
        pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
        const last = pts[pts.length - 1], first = pts[0];
        g.lineTo(last[0] + 10, 512); g.lineTo(first[0] - 10, 512); g.closePath(); g.fill();
        g.restore();
        // forehead stripes: three from the crown, two short inner ones, temple streaks
        const wedge = (top, w0, tip, col, a) => {
          const A = uvp(top[0] - w0, top[1]), B = uvp(top[0] + w0, top[1]), C = uvp(tip[0], tip[1]);
          if (!A || !B || !C) return;
          g.save(); g.globalAlpha = a || 1; g.fillStyle = col; g.beginPath(); g.moveTo(A[0], A[1] - 30); g.lineTo(B[0], B[1] - 30); g.lineTo(B[0], B[1]);
          g.quadraticCurveTo((B[0] + C[0]) / 2 + 3, (B[1] + C[1]) / 2, C[0], C[1]); g.quadraticCurveTo((A[0] + C[0]) / 2 - 3, (A[1] + C[1]) / 2, A[0], A[1]); g.closePath(); g.fill(); g.restore();
        };
        g.save(); g.filter = 'blur(1.6px)';
        wedge([256, 86], 9, [256, 112], STRIPE_DK);
        wedge([231, 86], 7.5, [228, 116], STRIPE_DK); wedge([281, 86], 7.5, [284, 116], STRIPE_DK);
        const leaf = (a, b, wd, col, al) => { const A = uvp(a[0], a[1]), B = uvp(b[0], b[1]); if (!A || !B) return; D.stroke(g, [A, [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], B], wd, col, al || 0.95); };
        leaf([246, 110], [241, 128], 15, STRIPE_DK); leaf([266, 110], [271, 128], 15, STRIPE_DK);
        leaf([212, 100], [194, 118], 12, STRIPE, 0.85); leaf([300, 100], [318, 118], 12, STRIPE, 0.85);
        // cheek stripes from the outer eye corner outward (the paintBase side stripes continue them round the head)
        [[[206, 140], [178, 142], [146, 150]], [[195, 159], [172, 161], [148, 168]], [[184, 176], [168, 179], [150, 187]]].forEach((s, i) => {
          [s, s.map(([x, y]) => [512 - x, y])].forEach(ss => {
            const q = ss.map(([x, y]) => uvp(x, y)).filter(Boolean);
            if (q.length > 1) D.stroke(g, q.length === 3 ? q : q.concat([q[q.length - 1]]), 21 - i * 2, STRIPE_DK, 0.95);
          });
        });
        g.restore();
        // blush freckles: two tiny red dots in each blush
        [-1, 1].forEach(sx => [-0.03, 0.03].forEach(dx => {
          const p = uvp(256 + sx * 51 + dx * 100, 175); if (!p) return;
          g.fillStyle = 'rgba(232,112,104,0.85)'; g.beginPath(); g.arc(p[0], p[1], 3.2, 0, Math.PI * 2); g.fill();
        }));
        K.headTex.needsUpdate = true;
      }

      /* ======================= fluffy cheek tufts ======================= */
      {
        const edgeX = (y) => { let lo = 0, hi = 1.6; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; } return lo; };
        const lock = (root, dir, len, r0, mat, ink) => {
          const d = V(dir[0], dir[1], dir[2]).normalize(), a = V(root[0], root[1], root[2]);
          const b = a.clone().addScaledVector(d, len * 0.55).add(V(0, -0.04 * len, 0)), c = a.clone().addScaledVector(d, len);
          return mesh(tube([a, b, c], t => r0 * (1 - Math.pow(t, 1.25)) + 0.004, 18, 10), mat, K.faceG, null, null, ink);
        };
        const furM = std(FUR_SIDE, { roughness: 0.95 }), whM = std(WHITE, { roughness: 0.95 });
        [-1, 1].forEach(sx => {
          [[0.1, 8, 0.16, 0.075, furM, INK], [-0.08, 20, 0.12, 0.07, furM, INK], [-0.26, 32, 0.12, 0.07, furM, INK], [-0.44, 44, 0.09, 0.07, whM, CREAM_INK], [-0.58, 55, 0.07, 0.065, whM, CREAM_INK]]
            .forEach(([yr, ang, len, r0, m, ink], i) => {
              // rooted just behind the front silhouette and swept slightly backward, so from the side they read as fur flicks
              const y = HY + yr, ex = edgeX(y), a = rad(ang), zz = [0.0, -0.1, -0.02, -0.08, -0.03][i];
              lock([sx * (ex - 0.08), y, zz], [sx * Math.cos(a), -Math.sin(a), -0.55], len, r0, m, ink);
            });
        });
      }

      /* ======================= winter cap ======================= */
      const hat = part('hat', K.head);
      hat.position.set(0, 3.99, 0.02);
      {
        const hatM = std(HAT, { roughness: 0.75 });
        // blue dome
        const dome = new THREE.SphereGeometry(0.35, 56, 24, 0, Math.PI * 2, 0, Math.PI / 2);
        mesh(dome, hatM, hat, [0, 0.19, 0], [1, 1.12, 0.94], HAT_INK);
        mesh(new THREE.CylinderGeometry(0.35, 0.36, 0.1, 56), hatM, hat, [0, 0.15, 0], [1, 1, 0.94]);
        // white fur brim
        const brim = mesh(new THREE.TorusGeometry(0.36, 0.1, 18, 72), whiteM, hat, [0, 0.12, 0], [1, 1, 1], CREAM_INK);
        brim.rotation.x = Math.PI / 2; brim.scale.set(1, 0.94, 1);
        K.addFur(brim, { layers: 12, length: 0.045, gravity: 0.01, repeat: [22, 4] });
        // pompom
        const pom = mesh(sphere(0.115, 32, 24), whiteM, hat, [-0.02, 0.64, 0.0], null, CREAM_INK);
        K.addFur(pom, { layers: 8, length: 0.025, gravity: 0.005, repeat: [6, 4] });
        // gold-rimmed snowflake medallion
        medal(hat, [0, 0.17, 0.45], 0.18, (cg) => {
          cg.fillStyle = '#ABB9C2'; cg.beginPath(); cg.arc(128, 128, 118, 0, Math.PI * 2); cg.fill();
          cg.strokeStyle = '#E9D9BA'; cg.lineWidth = 10; cg.beginPath(); cg.arc(128, 128, 108, 0, Math.PI * 2); cg.stroke();
          flakeC(cg, 128, 128, 78, '#FFFFFF', 11);
        }, GOLD, GOLD_INK, '#ABB9C2');
        // gold cord from the pompom round the image-right side, two red berries, bead and red tassel
        const cord = [V(0.07, 0.62, 0.04), V(0.2, 0.56, 0.12), V(0.32, 0.45, 0.2), V(0.42, 0.3, 0.24), V(0.47, 0.14, 0.24), V(0.47, 0.05, 0.25)];
        mesh(tube(cord, 0.017, 40, 8), goldM, hat, null, null, GOLD_INK);
        const bm = std(BERRY, { roughness: 0.4 });
        [[0.3, 0.48, 0.23, 0.045], [0.37, 0.38, 0.27, 0.045]].forEach(([x, y, z, r]) => {
          mesh(sphere(r, 24, 18), bm, hat, [x, y, z], null, RED_INK);
          mesh(sphere(r * 0.28, 10, 8), K.M.shine, hat, [x - r * 0.35, y + r * 0.35, z + r * 0.8]).castShadow = false;
        });
        mesh(sphere(0.035, 20, 14), goldM, hat, [0.47, 0.03, 0.25], null, GOLD_INK);
        K.tassel(hat, [0.47, -0.02, 0.25], RED, 0.14, 0.035, RED_INK);
        // pine sprig tucked behind the berries
        pineSprig(hat, [0.36, 0.42, 0.14], [0, 0.3, -0.95], 0.62);
      }

      /* ======================= 3D pine sprig helper ======================= */
      function pineSprig(parent, pos, rot, s, withBerries) {
        const g = group(parent, pos, rot); g.scale.setScalar(s);
        const nm = std(PINE, { roughness: 0.8 }), nm2 = std(PINE_LT, { roughness: 0.8 }), tm = std(TWIG, { roughness: 0.85 });
        mesh(tube([[0, -0.05, 0], [0.01, 0.2, 0.01], [0, 0.42, 0]], 0.013, 12, 6), tm, g);
        const needle = new THREE.CylinderGeometry(0.006, 0.009, 1, 5); needle.translate(0, 0.5, 0);
        [[0.12, 0.2], [0.26, 0.22], [0.4, 0.18]].forEach(([y, L], ci) => {
          for (let i = 0; i < 12; i++) {
            const a = -1.25 + i / 11 * 2.5, n = mesh(needle, i % 2 ? nm : nm2, g, [0, y, 0], [1, L * (0.8 + 0.3 * Math.sin(i * 2.3 + ci)), 1]);
            n.rotation.set(0.25 * Math.sin(i * 1.7), 0, a);
          }
        });
        for (let i = 0; i < 7; i++) { const n = mesh(needle, nm, g, [0, 0.42, 0], [1, 0.14, 1]); n.rotation.set(0, 0, -0.5 + i / 6); }
        if (withBerries) withBerries.forEach(([x, y, z, r]) => {
          mesh(sphere(r, 20, 14), std(BERRY, { roughness: 0.4 }), g, [x, y, z], null, RED_INK);
          mesh(tube([[x * 0.3, y - 0.08, 0], [x, y, z]], 0.007, 6, 5), tm, g);
        });
        return g;
      }

      /* ======================= capelet with white fur collar and trims ======================= */
      const capeG = part('capelet', K.body);
      const CAPE_PROF = [[1.03, 1.98], [1.0, 2.08], [0.91, 2.24], [0.77, 2.38], [0.59, 2.5], [0.4, 2.57]];
      const CAPE_Y0 = CAPE_PROF[0][1];
      const capR = (y) => {
        for (let i = 0; i < CAPE_PROF.length - 1; i++) { const [r0, y0] = CAPE_PROF[i], [r1, y1] = CAPE_PROF[i + 1]; if (y >= y0 && y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0)); }
        return y < CAPE_Y0 ? CAPE_PROF[0][0] : 0.4;
      };
      // the capelet hangs lower and wider over the image-right arm and rides up over the raised image-left arm
      const capWarp = (p) => { const k = 1 - sst(2.05, 2.45, p.y); p.y -= 0.13 * p.x * k; if (p.x > 0) p.x *= 1 + 0.1 * k * p.x; return p; };
      const onCape = (deg, y, off) => { const a = rad(deg), r = capR(y) + (off || 0); return capWarp(V(Math.sin(a) * r, y, Math.cos(a) * r)); };
      const GAP = 22;
      {
        const half = rad(GAP);
        const tex = canvasTex(1024, 512, (g, w, h) => {
          D.fill(g, CAPE);
          const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,0.1)'); sh.addColorStop(1, 'rgba(70,86,100,0.1)');
          g.fillStyle = sh; g.fillRect(0, 0, w, h);
          const u = deg => ((deg < 0 ? deg + 360 : deg) - GAP) / (360 - 2 * GAP) * w;
          // image-left shoulder: white snowflakes; image-right: pine sprig with red berries; back: more flakes
          flakeC(g, u(-38), 372, 40, '#FFFFFF', 6); flakeC(g, u(-60), 392, 34, '#FFFFFF', 5); flakeC(g, u(-84), 370, 28, '#FFFFFF', 4);
          pineC(g, u(42), 390, 130, -0.2, [[0.72, 0.08, 0.075], [0.85, 0.16, 0.075], [0.82, -0.02, 0.065]]);
          [150, 180, 210, 245].forEach((d, i) => flakeC(g, u(d), 300 + (i % 2) * 40, 34, '#FFFFFF', 5));
        });
        const cl = lathe(CAPE_PROF, 96, half, Math.PI * 2 - half * 2, 24);
        { const pa = cl.geo.attributes.position, q = V(); for (let i = 0; i < pa.count; i++) { q.fromBufferAttribute(pa, i); capWarp(q); pa.setXYZ(i, q.x, q.y, q.z); } cl.geo.computeVertexNormals(); }
        const cm = mesh(cl.geo, texMat(tex, { side: DS, roughness: 0.85 }), capeG, null, null, CAPE_INK);
        // flatter shading so both shoulders read as the same frost blue
        cm.material.color = new THREE.Color(0.6, 0.6, 0.6); cm.material.emissive = new THREE.Color(0.36, 0.36, 0.36); cm.material.emissiveMap = tex;
        // fur trim along the hem
        const hem = []; for (let i = 0; i <= 60; i++) hem.push(onCape(GAP + (360 - 2 * GAP) * i / 60, CAPE_Y0 + 0.01, 0.03));
        const hm = mesh(tube(hem, puffy(0.058, 22), 220, 10), whiteM, capeG, null, null, CREAM_INK);
        K.addFur(hm, furTrim);
        // big fur collar: thick lobes round the neck, running down both front edges of the capelet
        const path = [[-GAP - 1, CAPE_Y0 + 0.03, 0.06], [-GAP - 2, 2.14, 0.07], [-GAP - 4, 2.26, 0.1], [-32, 2.36, 0.14], [-55, 2.42, 0.16], [-90, 2.45, 0.15], [-130, 2.47, 0.13], [180, 2.48, 0.12],
          [130, 2.47, 0.13], [90, 2.45, 0.15], [55, 2.42, 0.16], [32, 2.36, 0.14], [GAP + 4, 2.26, 0.1], [GAP + 2, 2.14, 0.07], [GAP + 1, CAPE_Y0 + 0.03, 0.06]];
        const cpts = path.map(([d, y, r]) => onCape(d, y, r * 0.35));
        const rs = path.map(p => p[2]);
        const rAt = t => { const f = t * (rs.length - 1), i = Math.min(Math.floor(f), rs.length - 2); return lerp(rs[i], rs[i + 1], f - i); };
        const col = mesh(tube(cpts, t => rAt(t) * puffy(1, 16)(t), 240, 16), whiteM, capeG, null, null, CREAM_INK);
        K.addFur(col, { layers: 14, length: 0.06, gravity: 0.02, repeat: [20, 3] });
        // gold button where the inner collar crosses
        mesh(sphere(0.045, 20, 14), goldM, K.robeG, K.onRobe(0, 2.28, 0.03), null, GOLD_INK);
      }

      /* ======================= fur cuffs on both sleeves ======================= */
      {
        const trims = K.robeG.children.filter(o => o.isMesh && o.geometry && o.geometry.parameters && Math.abs((o.geometry.parameters.radius || 0) - 0.065) < 1e-6);
        // light-blue snowflake on the front of the image-right sleeve (a decal: the sleeve's u runs round the bent arm)
        {
          const tex = canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); flakeC(g, 128, 128, 100, SNOW, 12); });
          const dm = texMat(tex, { transparent: true, alphaTest: 0.35, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
          const hit = K.onSkin(1.0, 1.52, K.sleeveMeshes);
          if (hit.uv) { const d = mesh(new THREE.PlaneGeometry(0.3, 0.3), dm, K.robeG, hit.p.clone().addScaledVector(hit.n, 0.008)); d.lookAt(hit.p.clone().add(hit.n)); d.castShadow = false; }
        }
        // image-left cuff: white fur; image-right cuff: a plain blue band, as painted
        trims.forEach((m, i) => { if (i === 0) { m.material = whiteM; K.outline(m, CREAM_INK); K.addFur(m, furTrim); } else m.visible = false; });
        // toe creases on both front paws
        const cm = std('#CDB29C', { roughness: 0.8 });
        ['L', 'R'].forEach(k => {
          const p = K.hands[k].p, pr = 0.12 * K.cfg.arms[k].pawScale;
          [-0.055, 0.055].forEach(dx => mesh(tube([[p.x + dx, p.y + 0.02, p.z + pr * 0.9], [p.x + dx * 1.1, p.y - 0.06, p.z + pr * 0.86], [p.x + dx * 1.2, p.y - 0.12, p.z + pr * 0.66]], 0.008, 10, 5), cm, K.poseG));
        });
      }

      /* ======================= sash cords, gold snowflake knot and pendants ======================= */
      const beltG = K.beltG;
      {
        const ring = (y, r, tr, m) => { const t = mesh(new THREE.TorusGeometry(K.robeR(y) + r, tr, 8, 128), m, beltG, [0, y, 0]); t.rotation.x = Math.PI / 2; return t; };
        ring(1.86, 0.045, 0.022, std('#C9705D', { roughness: 0.7 }));
        ring(1.72, 0.04, 0.02, std('#F4EBDA', { roughness: 0.8 }));
        const kz = K.robeR(1.8) + 0.075;
        // six-lobed gold knot with a white snowflake
        const fl = new THREE.Shape();
        for (let i = 0; i <= 72; i++) { const a = i / 72 * Math.PI * 2, r = 0.138 * (0.84 + 0.16 * Math.abs(Math.cos(a * 3))); const px = Math.sin(a) * r, py = Math.cos(a) * r; i ? fl.lineTo(px, py) : fl.moveTo(px, py); }
        const kg = group(beltG, [-0.03, 1.8, kz]);
        mesh(extrude(fl, 0.04, 0.012, 3, 4), goldLtM, kg, [0, 0, -0.02], null, GOLD_INK);
        const ft = canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); flakeC(g, 128, 128, 92, '#FFFFFF', 13); });
        const fp = mesh(new THREE.PlaneGeometry(0.23, 0.23), texMat(ft, { transparent: true, alphaTest: 0.4 }), kg, [0, 0, 0.034]); fp.castShadow = false;
        // cream cord loops and pendants: gold bead + red tassel (right), jade + gold bead + red tassel (left)
        const cz = y => K.robeR(y) + 0.19;
        const cordM = std('#F2E4C8', { roughness: 0.7 });
        mesh(tube([[-0.06, 1.74, kz], [-0.12, 1.62, cz(1.62)], [-0.2, 1.5, cz(1.5)], [-0.22, 1.56, cz(1.56)], [-0.12, 1.72, kz - 0.01]], 0.013, 30, 6), cordM, beltG, null, null, CREAM_INK);
        mesh(tube([[-0.07, 1.73, kz], [-0.11, 1.55, cz(1.55)], [-0.13, 1.42, cz(1.42)]], 0.013, 20, 6), cordM, beltG, null, null, CREAM_INK);
        mesh(sphere(0.07, 28, 20), std(JADE, { roughness: 0.3 }), beltG, [-0.13, 1.37, cz(1.37)], null, JADE_INK);
        mesh(sphere(0.018, 10, 8), K.M.shine, beltG, [-0.155, 1.4, cz(1.37) + 0.065]).castShadow = false;
        mesh(sphere(0.035, 16, 12), goldM, beltG, [-0.14, 1.27, cz(1.27)], null, GOLD_INK);
        K.tassel(beltG, [-0.145, 1.23, cz(1.23)], RED, 0.22, 0.055, RED_INK);
        mesh(tube([[0.0, 1.72, kz], [0.01, 1.64, cz(1.64)]], 0.012, 6, 5), cordM, beltG);
        mesh(sphere(0.034, 16, 12), goldM, beltG, [0.01, 1.63, cz(1.63)], null, GOLD_INK);
        const rt = group(beltG, [0.02, 1.6, cz(1.6) + 0.01], [0, 0, 0.35]);
        K.tassel(rt, [0, 0, 0], RED, 0.22, 0.05, RED_INK);
        K.onTick((t, k) => { rt.rotation.z = 0.35 + 0.06 * Math.sin(t * 1.6) * k; });
      }

      /* ======================= apron (蔽膝) ======================= */
      const apronG = part('apron', K.body);
      K.robePanel({ parent: apronG, y0: 0.52, y1: 1.74, center: 0, deg: 27, degB: 22, off: 0.1, bulge: 0.015, color: CREAM, texW: 256, texH: 512, ink: ROBE_INK,
        paint(g, w, h) {
          // gold frame, blue inner side strips
          g.fillStyle = '#FBF5EA'; g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h); g.fillRect(0, h - 12, w, 12);
          g.fillStyle = GOLD; g.fillRect(12, 0, 9, h - 12); g.fillRect(w - 21, 0, 9, h - 12); g.fillRect(12, h - 21, w - 24, 9);
          g.fillStyle = BLUE_LT; g.fillRect(21, 0, 24, h - 21); g.fillRect(w - 45, 0, 24, h - 21);
          // big blue snowflake, cloud waves bottom-left, red-berry sprig bottom-right
          flakeC(g, 150, 322, 54, SNOW, 10);
          g.save(); g.beginPath(); g.rect(45, 0, w - 90, h - 21); g.clip();
          g.fillStyle = '#A7B8C7'; g.beginPath(); g.moveTo(45, h - 21); g.lineTo(45, 392); g.quadraticCurveTo(125, 372, 172, 426); g.quadraticCurveTo(192, 468, 150, h - 21); g.closePath(); g.fill();
          cloudC(g, 98, 440, 42, '#FFFFFF', 9);
          g.restore();
          g.strokeStyle = TWIG; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(170, 480); g.quadraticCurveTo(185, 450, 200, 430); g.stroke();
          [[196, 426, 9], [206, 440, 9], [184, 452, 8]].forEach(([x, y, r]) => { g.fillStyle = BERRY; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
          g.fillStyle = SNOW; g.beginPath(); g.ellipse(160, 478, 12, 8, 0, 0, Math.PI * 2); g.fill();
        } });

      /* ======================= hem: lifted at the sides and back (the picture's hem curves up away from the front) ======================= */
      const hemLift = deg => 0.2 * Math.min(1, Math.abs(Math.sin(rad(deg))) * 1.25 + (Math.cos(rad(deg)) < 0 ? 1 : 0));
      {
        const pa = K.robeMesh.geometry.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
          if (y > 1.3) continue;
          const w = 1 - sst(0.72, 1.3, y), deg = Math.atan2(x, z) * 180 / Math.PI;
          pa.setY(i, y + hemLift(deg) * w);
        }
        pa.needsUpdate = true; K.robeMesh.geometry.computeVertexNormals();
        if (K.robeMesh.geometry.userData.inkGeo) K.robeMesh.geometry.userData.inkGeo = null;
      }
      {
        const hem = []; for (let i = 0; i <= 90; i++) { const d = 26 + 308 * i / 90, p = K.onRobe(d, 0.68, 0.05); p.y += hemLift(d); hem.push(p); }
        const hm = mesh(tube(hem, puffy(0.078, 30), 260, 12), whiteM, K.robeG, null, null, CREAM_INK);
        K.addFur(hm, furTrim);
      }

      /* ======================= legs and blue fur boots ======================= */
      const boots = part('boots', K.poseG);
      {
        const legM = std(LEG, { roughness: 0.9 }), bootM = std(BOOT, { roughness: 0.7 });
        // hips / underside of the body inside the hollow robe: a closed shell hugging the robe from the inside
        // (0.012 in), so the legs grow out of the body and the view from below is not an empty bell
        {
          const y0 = 0.84, yc = 1.08, y1 = 1.6, Rc = K.robeR(yc) - 0.012, prof = [];
          for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; prof.push([Math.max(0.001, Rc * Math.sin(a)), yc - (yc - y0) * Math.cos(a)]); }
          for (let i = 1; i <= 10; i++) { const y = lerp(yc, y1, i / 10); prof.push([K.robeR(y) - 0.012, y]); }
          prof.push([0.001, y1]);
          mesh(K.lathe(prof, 64).geo, std(LEG_DK, { roughness: 0.95, side: THREE.DoubleSide }), boots);
        }
        [[-0.37, 0.24], [0.48, 0.24]].forEach(([fx, fz], i) => {
          const bg = group(boots, [fx, 0, fz], [0, (i ? 1 : -1) * 0.08, 0]);
          // grey leg from inside the boot shaft up into the hips under the robe
          mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.78, 28), legM, bg, [0, 0.84, -0.06], null, INK);
          const band = mesh(new THREE.TorusGeometry(0.195, 0.025, 8, 32), std(LEG_DK, { roughness: 0.9 }), bg, [0, 0.62, -0.02]); band.rotation.x = Math.PI / 2;
          mesh(new THREE.CylinderGeometry(0.235, 0.245, 0.3, 36), bootM, bg, [0, 0.29, -0.02], null, BOOT_INK);
          mesh(sphere(0.24, 32, 20), bootM, bg, [0, 0.2, 0.05], [1.0, 0.8, 1.05], BOOT_INK);
          mesh(sphere(0.24, 32, 20), whiteM, bg, [0, 0.09, 0.09], [1.02, 0.45, 1.05], CREAM_INK);
          const cuff = mesh(new THREE.TorusGeometry(0.23, 0.075, 14, 40), whiteM, bg, [0, 0.46, -0.02], null, CREAM_INK); cuff.rotation.x = Math.PI / 2;
          K.addFur(cuff, furTrim);
          mesh(sphere(0.04, 16, 12), goldM, bg, [0, 0.33, 0.235], null, GOLD_INK);
        });
      }

      /* ======================= tasselled spear with hanging snowflake banner ======================= */
      const spear = part('spear', K.body);
      {
        const HL = V(HAND_L[0], HAND_L[1], HAND_L[2]);
        spear.position.copy(HL);
        const P = (py) => { const p = spearAt(Y(py)); return V(p[0], p[1], p[2]).sub(HL); };
        const dir = V(SPT[0] - SPB[0], SPT[1] - SPB[1], SPT[2] - SPB[2]).normalize();
        const shaftM = std(SHAFT, { roughness: 0.7 });
        mesh(tube([P(446), P(104)], 0.042, 8, 14), shaftM, spear, null, null, SHAFT_INK);
        const cyl = (py, r0, r1, len, m) => orient(mesh(new THREE.CylinderGeometry(r0, r1, len, 24), m, spear, P(py), null, GOLD_INK), dir);
        cyl(225, 0.052, 0.052, 0.05, goldM);
        cyl(444, 0.056, 0.056, 0.06, goldM);
        cyl(459, 0.05, 0.012, 0.24, goldM);
        cyl(110, 0.05, 0.058, 0.1, goldM);
        orient(mesh(sphere(0.06, 20, 14), goldM, spear, P(101), [1, 0.7, 1], GOLD_INK), dir);
        // leaf blade with barbed lower edges, two-tone silver
        {
          const half = [[0.03, 0], [0.07, 0.025], [0.155, 0.09], [0.105, 0.125], [0.1, 0.18], [0.16, 0.29], [0.145, 0.42], [0.09, 0.57], [0, 0.79]];
          const shape = half.concat(half.slice(0, -1).reverse().map(([x, y]) => [-x, y]));
          const geo = extrude(shape, 0.03, 0.012, 3, 6);
          const bx0 = -0.17, bw = 0.34, by0 = -0.02, bh = 0.83;
          const btex = canvasTex(256, 512, (g, w, h) => {
            g.fillStyle = '#F3F4F2'; g.fillRect(0, 0, w, h);
            g.fillStyle = BLADE_DK; g.fillRect(0, 0, w / 2, h);
            g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(w / 2 - 3, 0, 6, h);
          });
          btex.repeat.set(1 / bw, 1 / bh); btex.offset.set(-bx0 / bw, -by0 / bh);
          const bg = group(spear, P(98)); bg.quaternion.setFromUnitVectors(UP, dir);
          mesh(geo, [texMat(btex, { roughness: 0.3, metalness: 0.25 }), std(BLADE, { roughness: 0.3, metalness: 0.3 })], bg, [0, 0, -0.015], null, BLADE_INK);
        }
        // red horsehair tassel (紅纓) under the blade, draping down the image-right side of the shaft
        {
          const top = P(122).add(V(0.05, 0, 0.02));
          mesh(sphere(0.09, 24, 18), redM, spear, top, [1, 1.15, 1], RED_INK);
          orient(mesh(new THREE.CylinderGeometry(0.035, 0.07, 0.07, 20), goldM, spear, top.clone().add(V(-0.01, 0.09, 0)), null, GOLD_INK), dir);
          const tm = std(RED, { roughness: 0.8, side: DS });
          for (let i = 0; i < 26; i++) {
            const a = i / 26 * Math.PI * 2, sp = 0.07 + 0.03 * Math.sin(i * 2.1);
            const end = top.clone().add(V(0.2 + Math.cos(a) * 0.1 + 0.02 * Math.sin(i), -0.6 - 0.05 * Math.sin(i * 1.3), Math.sin(a) * 0.08));
            const mid = top.clone().lerp(end, 0.45).add(V(0.02 + Math.cos(a) * sp, 0, Math.sin(a) * sp));
            mesh(tube([top.clone().add(V(Math.cos(a) * 0.05, -0.04, Math.sin(a) * 0.05)), mid, end], t => 0.036 * (1 - 0.75 * t) + 0.005, 16, 6), tm, spear, null, null, i % 3 ? null : RED_INK);
          }
          // dense core so the tassel reads as one full teardrop bundle
          const prof = []; for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push([Math.max(0.002, 0.13 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + 0.95 * t)), 0.9) * (1 - 0.55 * t)), -0.6 * t]); }
          const core = mesh(lathe(prof.reverse(), 24).geo, std('#CF5F47', { roughness: 0.85 }), spear, top, null, RED_INK);
          core.quaternion.setFromUnitVectors(V(0, -1, 0), V(0.2, -0.6, 0).normalize()); core.scale.set(1, 1, 0.7);
        }
        // gold ring with a jade centre, white pearl, red cords to the banner
        const ringP = V(X(100), Y(145), spearAt(Y(145))[2] + 0.04).sub(HL);
        mesh(new THREE.TorusGeometry(0.05, 0.016, 10, 28), goldM, spear, ringP, null, GOLD_INK);
        mesh(sphere(0.034, 16, 12), std('#8FA9A8', { roughness: 0.35 }), spear, ringP, [1, 1, 0.6]);
        mesh(tube([ringP.clone().add(V(0.04, 0.03, 0)), P(140)], 0.01, 6, 5), std(RED, { roughness: 0.7 }), spear);
        mesh(tube([ringP.clone().add(V(0.01, -0.05, 0)), V(X(107), Y(158), ringP.z + HL.z).sub(HL)], 0.006, 4, 4), std('#EDE6DA'), spear);
        mesh(sphere(0.036, 20, 14), std('#FBF8F2', { roughness: 0.3 }), spear, V(X(107), Y(161), ringP.z + HL.z).sub(HL), null, CREAM_INK);
        // banner: hangs from the ring on two red cords, tilted like the picture
        const bz = ringP.z + HL.z - 0.02;
        const C = { TL: V(X(68), Y(172), bz), TR: V(X(117), Y(185), bz), BL: V(X(48), Y(258), bz), BR: V(X(95), Y(272), bz) };
        const bannerG = group(spear, C.TL.clone().lerp(C.TR, 0.5).sub(HL));
        const org = C.TL.clone().lerp(C.TR, 0.5);
        const NU = 10, NV = 16, bp = [], buv = [], bidx = [];
        for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
          const s = i / NU, t = j / NV;
          const top = C.TL.clone().lerp(C.TR, s), bot = C.BL.clone().lerp(C.BR, s), q = top.lerp(bot, t);
          q.z += 0.03 * Math.sin(Math.PI * s) * t - 0.02 * t;
          q.sub(org); bp.push(q.x, q.y, q.z); buv.push(s, 1 - t);
        }
        for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; bidx.push(a, b, a + 1, b, b + 1, a + 1); }
        const bgeo = new THREE.BufferGeometry();
        bgeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); bgeo.setAttribute('uv', new THREE.Float32BufferAttribute(buv, 2));
        bgeo.setIndex(bidx); bgeo.computeVertexNormals();
        const btex = canvasTex(256, 512, (g, w, h) => {
          g.fillStyle = PANEL; g.fillRect(0, 0, w, h);
          g.fillStyle = '#F8F4EE'; g.fillRect(30, 26, w - 60, h - 52);
          g.strokeStyle = BLUE_INK; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6);
          flakeC(g, 128, 170, 70, SNOW, 12);
          g.save(); g.beginPath(); g.rect(30, 26, w - 60, h - 52); g.clip();
          cloudC(g, 110, 400, 46, BLUE_LT, 12); cloudC(g, 170, 450, 34, BLUE_LT, 10, true);
          g.restore();
        });
        mesh(bgeo, texMat(btex, { side: DS, roughness: 0.85 }), bannerG, null, null, BLUE_INK);
        [C.TL, C.TR, C.BL, C.BR].forEach(c => mesh(sphere(0.035, 16, 12), goldM, bannerG, c.clone().sub(org).add(V(0, 0, 0.01)), null, GOLD_INK));
        const cordM = std(RED, { roughness: 0.7 });
        [C.TL, C.TR].forEach(c => mesh(tube([ringP.clone().add(HL).sub(org).add(V(0, -0.04, 0)), c.clone().sub(org)], 0.01, 8, 5), cordM, bannerG));
        K.__banner = bannerG; K.__spear = spear;
        K.onTick((t, k) => { bannerG.rotation.x = 0.06 * Math.sin(t * 1.4) * k; bannerG.rotation.z = 0.03 * Math.sin(t * 1.1) * k; });
      }

      /* ======================= floating decorations ======================= */
      {
        const items = [];
        const flakeM = '#C9D8E6';
        [[1.27, 3.66, 0.1, 0.62], [-1.51, 1.08, 0.2, 0.52], [1.55, 0.35, 0.3, 0.4], [-2.2, 3.6, -0.1, 0.4]].forEach(([x, y, z, s], i) => {
          const g = K.snowflake(K.decor, [x, y, z], s, flakeM); g.rotation.z = i * 0.3; items.push(g);
        });
        const swirlM = std('#D2DCE4', { roughness: 0.7 });
        const swirl = (pos, s, flip) => {
          const g = group(K.decor, pos); g.scale.set(s * flip, s, s);
          const pts = [];
          for (let i = 0; i <= 44; i++) { const a = i / 44 * Math.PI * 2.4, r = 0.04 + 0.18 * (i / 44); pts.push([Math.cos(a + Math.PI) * r, Math.sin(a + Math.PI) * r, 0]); }
          pts.push([0.3, 0.05, 0], [0.62, 0.1, 0]);
          mesh(tube(pts, t => 0.045 * Math.sin(Math.PI * Math.min(1, 0.15 + 0.85 * t)) + 0.012, 90, 10), swirlM, g, null, null, '#9FB0BE');
          mesh(tube([[-0.45, -0.22, 0], [0, -0.28, 0], [0.55, -0.22, 0]], 0.025, 20, 8), swirlM, g, null, null, '#9FB0BE');
          items.push(g);
        };
        swirl([1.95, 3.02, -0.1], 1.0, -1);
        swirl([-2.05, 1.52, 0.25], 0.9, 1);
        items.push(pineSprig(K.decor, [1.42, 2.3, 0.3], [0, 0, -0.9], 1.1, [[0.12, 0.2, 0.03, 0.04], [0.16, 0.28, 0.02, 0.04], [0.08, 0.3, 0.05, 0.035]]));
        const dm = std('#DDE7F0', { roughness: 0.5 });
        [[1.36, 3.97, 0], [1.29, 3.24, 0.1], [-1.61, 1.9, 0.2], [1.29, 2.75, 0.2], [-2.3, 2.9, 0]].forEach(p => { const g = group(K.decor, p); mesh(sphere(0.045, 12, 10), dm, g, null, null, '#AFC0CE'); items.push(g); });
        items.forEach(g => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.1 * Math.sin(t * 0.8 + i) * k;
        }));
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '報來初雪的瑞雪巡使',
        text: '小雪時節天地閉塞、初雪將臨。這隻銀色虎斑美國短毛貓化身「瑞雪巡使」：戴著白絨藍暖帽、披白毛滾邊的雪花短披肩，扛著掛雪花幡的紅纓銀槍四處報雪，身上的松枝紅果與雲紋象徵歲寒與「天氣上升、地氣下降」。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '銀灰虎斑與白臉',
        text: '淺銀灰的頭上有美短招牌的深灰條紋：額頭三道直紋、兩道短紋，兩頰各三道橫紋往後掃。眼睛以下整片雪白一路連到胸口，深棕圓眼、粉色小鼻、「ω」形微笑，腮紅上點著兩顆小紅點，白鬍鬚落在灰色臉頰上。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '大尖耳',
        text: '一對寬大的尖耳立在頭頂兩角、微微外張，外側銀灰、耳內淡粉，並冒出一撮白色耳毛。' },
      hat: { chip: '暖帽', tag: '服飾', name: '雪花徽藍暖帽', dir: [0.35, 0.35, 1],
        text: '灰藍色圓頂小暖帽，下緣一圈蓬鬆白絨、頂上一顆白絨球。正面是金框雪花圓徽；一條金繩從絨球繞到畫面右側，串著兩顆紅果、插一小枝松針，末端垂著金珠與紅流蘇。' },
      spear: { chip: '紅纓槍', tag: '道具', name: '雪花幡紅纓槍', dir: [-0.5, 0.25, 1],
        text: '畫面左爪握著一桿比身體還高的木槍，槍頭是銀白葉形、兩側下緣帶倒鉤，金箍下垂著一大束紅纓。槍桿上掛著金環玉心與小白珠，兩條紅繩吊起一面藍邊雪花幡，幡面畫著藍色雪花與浪雲，四角各一顆金珠。' },
      capelet: { chip: '披肩', tag: '服飾', name: '白毛滾邊雪花披肩', dir: [0.3, 0.5, 1],
        text: '霜雪藍的圓弧短披肩蓋住兩肩，領口是一圈又厚又蓬的白毛領，順著前襟與下緣一路滾白毛。畫面左肩繡著白色雪花，畫面右肩則是一枝帶紅果的松枝。' },
      robe: { chip: '長袍', tag: '服飾', name: '米白長袍與大袖',
        text: '米白長袍配淡藍交領和一顆金鈕，外袍前襟鑲藍邊。寬大的袖子垂成大袋，畫面左袖口滾一圈白毛，畫面右袖口是藍色寬邊，袖面點綴淡藍雪花；袍子兩側與背後的下襬是藍底白雪花加金線，最下緣滾一圈白毛，前低後高。' },
      belt: { chip: '腰飾', tag: '服飾', name: '雪花金結與玉墜',
        text: '灰藍寬腰封上壓一道紅繩與米白絲絛，正中是六瓣金色雪花結。結下一顆金珠垂著紅流蘇，米白絲絛打成環、串起一顆青玉珠與金珠，底下再垂一束紅流蘇。' },
      apron: { chip: '蔽膝', tag: '服飾', name: '雪花浪雲蔽膝', dir: [0, 0.1, 1],
        text: '腰下垂一片米白蔽膝，外框金邊、內側兩道淺藍直條。中央一朵藍色大雪花，左下是藍底白色浪雲，右下點著紅果小枝。' },
      boots: { chip: '暖靴', tag: '服飾', name: '白絨藍短靴', dir: [0.2, 0.2, 1],
        text: '袍下露出一截銀灰虎斑腿，腳穿灰藍短靴，靴口一大圈白絨毛，正面一顆金扣，靴頭是圓圓的白色靴尖。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '環紋大尾巴', dir: [1, 0.25, -0.6],
        text: '又粗又蓬的銀灰大尾巴從右後方繞出、往上翹起，身上四五道深灰鋸齒環紋，尾端轉成近白色，末梢往外勾。' }
    },
    order: ['overview', 'face', 'ears', 'hat', 'spear', 'capelet', 'robe', 'belt', 'apron', 'boots', 'tail']
  });
})();
