// @file 24_大寒_石虎
// @title 大寒・冰笛石虎 | 二十四節氣貓
(function () {
  /* ---------------------------------------------------------------------------
   * 24 大寒 — Taiwanese leopard cat (石虎) holding a faceted ice orb, a blue flute clenched
   * in the mouth, blue-gray cap with an ice-crystal crest, cream fur capelet, open cream coat
   * with gold edges, blue-gray inner robe with a cream apron, blue snowflake shoes.
   * Picture scale: 1 unit = 1 / 0.0086 px of refs/24.png, body axis at px x = 251, soles at px y = 487.
   * Colours are SAMPLED from the picture; def.exposure dims the lights so they render close to it.
   * ------------------------------------------------------------------------- */
  const PX = 0.0086, X = px => (px - 251) * PX, Y = py => (487 - py) * PX;
  const HY = 2.935, NECK = 2.3, HW = 0.87, HH = 0.6, HD = 0.74, CHK = 0.15;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const rad = d => d * Math.PI / 180;

  // ---- colours sampled from refs/24.png ----
  const FUR = '#DFB582', FUR_TOP = '#D8AB77', FUR_LOW = '#E6C194', FUR_EDGE = '#CFA374', SPOT = '#9E7151', SPOT_LT = '#A97C58';
  const CREAM = '#FBF4E9', WHITE = '#FFFAF3', INK = '#A77A55', CREAM_INK = '#D3C0AA';
  const EYE = '#5A3B29', NOSE = '#F4AE9B', EAR_IN = '#F4C1AE';
  const BLUE = '#95A6C0', BLUE_DK = '#8394AE', BELT = '#7A8AA2', BLUE_INK = '#5C6B82', BLUE_LT = '#B6C4D6', BLUE_PALE = '#D9E2EE';
  const ICE = '#D5E3EE', ICE_MID = '#B7CBDF', ICE_DK = '#9DB4CB', ICE_INK = '#7F97B3';
  const GOLD = '#EFCB8E', GOLD_DK = '#D8B175', GOLD_INK = '#AF8A55';
  const ROBE = '#EBE9E7', ROBE_INK = '#B5AA9C', LINE_BLUE = '#A9B9CE';
  const PINE = '#8595A5', PINE_DK = '#6D7D8E', TWIG = '#7A5A48', CATKIN = '#F7F3EC', PLUM = '#FFF8EE', PLUM_C = '#EFC76A';
  const TAIL = '#F1D6B6', TAIL_DK = '#A07556', SOLE = '#EFE3D0', SOLE_INK = '#A38C72';
  const PAW = '#FAF1E3', PAW_INK = '#C9A47E';   // cream mittens with a warm tan outline, as drawn

  // the picture's head stays broad down to the chin (fluffy lower cheeks hang to y ≈ 212 px): below the
  // cheek bulge the half-width follows a squarish super-ellipse instead of the default round sphere
  const WIDEN = (oy) => {
    if (oy >= -0.35) return 1;
    const dflt = HW * (1 + CHK * Math.exp(-Math.pow((oy + 0.25) / 0.62, 2))) * Math.sqrt(Math.max(1 - oy * oy, 1e-6));
    const top = HW * (1 + CHK * Math.exp(-Math.pow(0.1 / 0.62, 2))) * Math.sqrt(1 - 0.35 * 0.35);
    const u = Math.min(1, (-oy - 0.35) / 0.65), want = top * Math.pow(Math.max(1 - Math.pow(u, 5), 0), 0.2);
    return Math.min(4, Math.max(1, want / dflt));
  };
  // picture px → head-map (lon, lat) on the (widened) head deformation (front hemisphere)
  function LL(px, py) {
    const x = X(px), y = Y(py) - HY;
    const oy = Math.max(-0.99, Math.min(0.99, y / HH)), lat = Math.asin(oy);
    const cf = (1 + CHK * Math.exp(-Math.pow((oy + 0.25) / 0.62, 2))) * WIDEN(oy);
    const ox = Math.max(-0.99, Math.min(0.99, x / (HW * cf) / Math.cos(lat)));
    return [Math.asin(ox) * 180 / Math.PI, lat * 180 / Math.PI];
  }

  // ---------- canvas motifs ----------
  function flakeC(g, x, y, s, color, lw, rot) { // six-armed snowflake with two branch pairs
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.strokeStyle = color; g.lineWidth = lw || Math.max(2, s * 0.1); g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate(i * Math.PI / 3);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s);
      [[0.42, 0.22], [0.68, 0.17]].forEach(([k, b]) => { g.moveTo(0, -s * k); g.lineTo(s * b, -s * (k + b)); g.moveTo(0, -s * k); g.lineTo(-s * b, -s * (k + b)); });
      g.stroke(); g.restore();
    }
    g.restore();
  }
  function pineC(g, x, y, s, rot, needle, stem) { // pine sprig: twig with fanned needle clusters
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.lineCap = 'round';
    g.strokeStyle = stem || TWIG; g.lineWidth = Math.max(2, s * 0.05);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.05, -s * 0.5, 0, -s); g.stroke();
    g.strokeStyle = needle || PINE; g.lineWidth = Math.max(1.5, s * 0.028);
    [[0.35, 1], [0.35, -1], [0.62, 1], [0.62, -1], [0.95, 0]].forEach(([t, k]) => {
      const cx = s * 0.02, cy = -s * t;
      for (let i = 0; i < 9; i++) {
        const a = (k === 0 ? -Math.PI / 2 : (k > 0 ? -0.2 : Math.PI + 0.2)) + (i - 4) * 0.16 * (k === 0 ? 1.4 : 1) - (k === 0 ? 0 : k * 0.35);
        const L = s * (0.28 + 0.06 * Math.sin(i * 1.7));
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); g.stroke();
      }
    });
    g.restore();
  }
  function willowC(g, x, y, s, rot, withPlum) { // pussy-willow twig with fuzzy buds (+ optional plum blossom)
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.lineCap = 'round';
    g.strokeStyle = TWIG; g.lineWidth = Math.max(2, s * 0.05);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.12, -s * 0.5, s * 0.05, -s); g.stroke();
    g.beginPath(); g.moveTo(s * 0.06, -s * 0.45); g.quadraticCurveTo(s * 0.25, -s * 0.6, s * 0.34, -s * 0.78); g.stroke();
    const bud = (bx, by, r, a) => {
      g.save(); g.translate(bx, by); g.rotate(a);
      g.fillStyle = CATKIN; g.strokeStyle = '#B9A99A'; g.lineWidth = Math.max(1, s * 0.012);
      g.beginPath(); g.ellipse(0, -r * 0.6, r * 0.62, r, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#8A6450'; g.beginPath(); g.ellipse(0, r * 0.3, r * 0.35, r * 0.3, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    };
    bud(s * 0.05, -s * 1.02, s * 0.1, 0.05); bud(s * 0.35, -s * 0.8, s * 0.09, 0.5); bud(s * 0.1, -s * 0.72, s * 0.08, 0.7);
    bud(s * 0.07, -s * 0.3, s * 0.075, -0.7); bud(s * 0.2, -s * 0.55, s * 0.07, 0.9);
    if (withPlum) { g.save(); g.translate(-s * 0.08, -s * 0.52); flowerC(g, 0, 0, s * 0.14); g.restore(); }
    g.restore();
  }
  function flowerC(g, x, y, s) { // five-petal plum blossom
    g.save(); g.translate(x, y); g.fillStyle = PLUM; g.strokeStyle = '#D8C5B3'; g.lineWidth = Math.max(1, s * 0.08);
    for (let i = 0; i < 5; i++) { g.save(); g.rotate(i / 5 * Math.PI * 2); g.beginPath(); g.ellipse(0, -s * 0.55, s * 0.36, s * 0.45, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore(); }
    g.fillStyle = PLUM_C; g.beginPath(); g.arc(0, 0, s * 0.24, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function cloudBlob(g, x, y, s, fill, line) { // soft filled cloud with white inner curls
    g.save(); g.translate(x, y); g.fillStyle = fill;
    [[0, 0, 0.5], [-0.55, 0.12, 0.38], [0.55, 0.1, 0.42], [-0.2, -0.3, 0.36], [0.3, -0.28, 0.33], [1.0, 0.2, 0.26], [-0.95, 0.22, 0.24]]
      .forEach(([cx, cy, r]) => { g.beginPath(); g.arc(cx * s, cy * s, r * s, 0, Math.PI * 2); g.fill(); });
    g.fillRect(-1.2 * s, 0.1 * s, 2.4 * s, 0.36 * s);
    if (line) {
      g.strokeStyle = line; g.lineWidth = Math.max(2, s * 0.07); g.lineCap = 'round';
      g.beginPath(); g.arc(-0.2 * s, -0.05 * s, 0.22 * s, Math.PI * 0.9, Math.PI * 2.1); g.stroke();
      g.beginPath(); g.arc(0.45 * s, 0.05 * s, 0.2 * s, Math.PI * 1.0, Math.PI * 2.2); g.stroke();
    }
    g.restore();
  }
  function crystalC(g, x, y, s, rot, fill, line) { // long diamond ice shard
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.fillStyle = fill || ICE_MID; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.32, -s * 0.1); g.lineTo(0, s * 0.55); g.lineTo(-s * 0.32, -s * 0.1); g.closePath(); g.fill();
    g.strokeStyle = line || '#FFFFFF'; g.lineWidth = Math.max(1.5, s * 0.06);
    g.beginPath(); g.moveTo(0, -s * 0.85); g.lineTo(0, s * 0.45); g.moveTo(-s * 0.25, -s * 0.1); g.lineTo(s * 0.25, -s * 0.1); g.stroke();
    g.restore();
  }
  function wavesC(g, x0, x1, y, amp, n, fill, line) { // stacked rounded wave bands (海浪)
    g.save();
    for (let k = 0; k < n; k++) {
      const yy = y + k * amp * 0.9;
      g.fillStyle = k % 2 ? BLUE_PALE : fill;
      g.beginPath(); g.moveTo(x0, yy + amp * 3);
      for (let x = x0; x <= x1; x += 4) g.lineTo(x, yy - amp * Math.pow(Math.sin((x - x0) / (x1 - x0) * Math.PI * (1.2 + k * 0.3) + k), 2));
      g.lineTo(x1, yy + amp * 3); g.closePath(); g.fill();
      g.strokeStyle = line; g.lineWidth = Math.max(2, amp * 0.18); g.beginPath();
      for (let x = x0; x <= x1; x += 4) { const yv = yy - amp * Math.pow(Math.sin((x - x0) / (x1 - x0) * Math.PI * (1.2 + k * 0.3) + k), 2) + amp * 0.35; x === x0 ? g.moveTo(x, yv) : g.lineTo(x, yv); }
      g.stroke();
    }
    g.restore();
  }

  NEKO.run({
    meta: {
      id: '24', term: '大寒', title: '大寒・冰笛石虎', seal: '寒',
      eyebrow: '二〇二七節氣貓 · 24 大寒 · 石虎',
      aria: '頭戴灰藍冰晶小冠、嘴裡橫咬一支金頭藍笛，雙手在胸前捧著多面冰晶球，披白毛披肩、穿米白雪花外袍與灰藍內袍、腳踩雪花藍鞋，身後捲著環紋大尾巴的石虎 3D 模型'
    },
    theme: { accent: '#5A6778', accentDark: '#BCC6D3', glow: 'rgba(188, 204, 222, 0.34)', glowColor: '#CFE0F2' },
    palette: [['#EBBD88', '石虎黃褐'], ['#99A4B2', '霜藍灰'], ['#D5E3EE', '冰晶藍'], ['#EFCB8E', '淡金']],
    spec: [['品種', '石虎（臺灣豹貓）'], ['角色', '大寒冰笛使'], ['頭身比', '約 1 : 2']],
    seed: 2427,
    exposure: 0.74,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR, low: FUR_LOW, deep: SPOT, cream: CREAM,
        ink: INK, creamInk: CREAM_INK, noise: { colors: ['#F6DDB8', '#C99A6C'], alpha: 0.05, n: 1100 },
        paintBase(g, P) {
          const map = (px, py) => { const [lo, la] = LL(px, py); return P.xy(lo, la); };
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.45, FUR); vg.addColorStop(0.75, FUR_LOW); vg.addColorStop(1, '#F3DDC0');
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // darker fur toward the sides / back of the head
          const side = g.createLinearGradient(0, 0, 1024, 0);
          side.addColorStop(0, 'rgba(200,150,105,0.35)'); side.addColorStop(0.3, 'rgba(200,150,105,0)'); side.addColorStop(0.7, 'rgba(200,150,105,0)'); side.addColorStop(1, 'rgba(200,150,105,0.35)');
          g.fillStyle = side; g.fillRect(0, 0, 1024, 512);
          const poly = (pts, color, blur, alpha) => {
            g.save(); g.filter = 'blur(' + blur + 'px)'; g.globalAlpha = alpha || 1; g.fillStyle = color; g.beginPath();
            pts.forEach(([x, y], i) => { const [u, v] = map(x, y); i ? g.lineTo(u, v) : g.moveTo(u, v); }); g.closePath(); g.fill(); g.restore();
          };
          const ell = (cx, cy, rx, ry, rot, color, alpha, blur) => {
            const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, c = Math.cos(rot || 0), s = Math.sin(rot || 0); const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry; pts.push([cx + ex * c - ey * s, cy + ex * s + ey * c]); }
            poly(pts, color, blur === undefined ? 1.2 : blur, alpha);
          };
          // cream lower face (muzzle, cheeks under the eyes, chin) — as drawn
          const half = [[251, 149], [242, 150], [236, 157], [226, 163], [214, 165], [203, 163], [192, 159], [180, 165], [171, 180], [168, 197], [178, 212], [205, 224], [251, 230]];
          poly(half.concat(half.slice().reverse().map(([x, y]) => [502 - x, y])), CREAM, 5);
          poly([[251, 186], [200, 186], [165, 196], [140, 212], [140, 240], [251, 240]].concat([[251, 240], [362, 240], [362, 212], [337, 196], [302, 186]]), CREAM, 7);
          // chin / throat and the whole underside stay cream
          g.save(); g.filter = 'blur(8px)'; g.fillStyle = CREAM; g.fillRect(0, P.xy(0, -62)[1], 1024, 512); g.restore();
          // pale "white stripes" above the inner eye corners
          ell(230, 141, 9.5, 7, 0.45, CREAM, 0.95, 3.5); ell(272, 141, 9.5, 7, -0.45, CREAM, 0.95, 3.5);
          ell(236, 133, 5, 4, 0.3, CREAM, 0.7, 3); ell(266, 133, 5, 4, -0.3, CREAM, 0.7, 3);
          ell(251, 146, 9, 5, 0, '#F6E3C8', 0.8, 4);
          // central forehead stripe tapering to a point above the nose bridge
          poly([[244, 60], [254, 60], [254, 90], [253, 112], [250, 127], [247, 112], [245, 90]], SPOT, 1.2, 0.95);
          // short crown stripes either side
          poly([[224, 62], [231, 62], [231, 80], [229, 97], [226, 97], [224, 80]], SPOT, 1.2, 0.92);
          poly([[271, 62], [278, 62], [276, 80], [276, 97], [273, 97], [271, 80]], SPOT, 1.2, 0.92);
          // spots: [x, y, rx, ry, rot]
          [[230, 113, 4.2, 8, 0.1], [272, 113, 4.2, 8, -0.1], [205, 104, 6, 5, 0.3], [204, 123, 5.5, 4.5, 0.2], [294, 103, 6, 5, -0.3], [307, 118, 7, 5, -0.4],
            [177, 128, 8, 5, 0.5], [187, 142, 6, 4.5, 0.3], [163, 158, 7, 5, 0.3], [164, 180, 9, 4, 0.5],
            [327, 131, 8, 5, -0.5], [322, 147, 6, 4.5, -0.3], [338, 164, 7, 5, -0.3], [338, 182, 9, 4, -0.5],
            [190, 90, 6, 5, 0.6], [312, 90, 6, 5, -0.6], [176, 108, 6, 4.5, 0.6], [326, 108, 6, 4.5, -0.6], [150, 140, 5, 4, 0.4], [352, 140, 5, 4, -0.4]]
            .forEach(([x, y, rx, ry, r]) => ell(x, y, rx * 1.2, ry * 1.2, r, SPOT, 0.95));
          // back of the head: rows of spots and two long stripes down the nape
          g.save(); g.filter = 'blur(1.5px)';
          for (let row = 0; row < 4; row++) for (let k = 0; k < 9; k++) {
            const lon = 95 + k * 21 + (row % 2) * 10, lat = 62 - row * 22;
            [lon, -lon].forEach(lo => { if (Math.abs(lo) > 180) return; const [x, y] = P.xy(lo, lat); P.blob(g, x, y, 13 - row, 9 - row * 0.8, SPOT, 0.85, 0.3); });
          }
          [[-172, 1], [172, 1], [-150, 1], [150, 1]].forEach(([lo]) => P.stroke(g, [P.xy(lo, 85), P.xy(lo, 55), P.xy(lo * 0.99, 25)], 16, SPOT, 0.85));
          g.restore();
          // dark ear-base fur on the crown (the backs of the ears show here in the picture)
          ell(196, 80, 9, 7, 0.6, SPOT_LT, 0.6, 4); ell(306, 80, 9, 7, -0.6, SPOT_LT, 0.6, 4);
        }
      },
      head: { y: HY, neck: NECK, w: HW, h: HH, d: HD, cheek: CHK, ruff: 0.08, ruffFreq: 15, chinDrop: 0.03,
        deform(p, o) { p.x *= WIDEN(o.y); },
        fur: { layers: 18, length: 0.06, gravity: 0.025, repeat: [10, 6] } },
      eyes: { x: X(287), y: Y(153) - HY, r: 0.094, sx: 1.0, sy: 1.1, sz: 0.5, color: EYE, shine: 0.95 },
      nose: { y: Y(161) - HY, color: NOSE, size: 0.95 },
      muzzle: { y: -0.2, size: 0.5, color: CREAM },
      mouth: { type: 'w', color: '#7A5040', y: Y(172) - HY, w: 0.12, depth: 0.035 },
      blush: { color: 'rgba(245,160,140,0.75)', x: 0.5, y: Y(167) - HY, r: 22, after: true },
      ears: { x: 0.64, y: 0.31, z: -0.08, tilt: 0.33, yaw: 0.28, pitch: -0.08, size: [0.38, 0.5, 0.15], sharp: 0.88,
        color: FUR, inner: EAR_IN, tuft: CREAM, tuftScale: 1.1, innerScale: 1.12, fur: { layers: 8, length: 0.03, gravity: 0.008, repeat: [3, 3] } },
      bib: { color: CREAM, balls: [[0, 2.27, 0.26, 0.3], [0.3, 2.24, 0.2, 0.22], [-0.3, 2.24, 0.2, 0.22]],
        fur: { layers: 12, length: 0.06, gravity: 0.02, repeat: [3, 2] } },
      robe: {
        profile: [[0.8, 0.36], [0.82, 0.46], [0.8, 0.7], [0.76, 1.0], [0.71, 1.3], [0.66, 1.6], [0.6, 1.85], [0.52, 2.08], [0.36, 2.26], [0.12, 2.34]],
        color: '#FFFFFF', ink: BLUE_INK, lining: BLUE_DK, hemY: 0.42,
        paint(g, w, h, D) {
          D.fill(g, BLUE);
          g.fillStyle = BLUE_DK; g.fillRect(0, h - 22, w, 22);
          g.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 3, h);
        }
      },
      collar: false,
      arms: {
        L: { hand: [X(223), Y(281), 1.22], path: [[-0.6, 2.05, 0.05], [-0.74, 1.75, 0.45], [-0.36, 1.77, 1.0]], wrist: false, pawScale: 1.2 },
        R: { hand: [X(279), Y(281), 1.22], path: [[0.6, 2.05, 0.05], [0.74, 1.75, 0.45], [0.36, 1.77, 1.0]], wrist: false, pawScale: 1.2 }
      },
      sleeves: false,
      paws: { color: PAW, ink: PAW_INK },
      belt: false,
      legs: { color: CREAM, r: 0.26, top: 0.6, x: 0.45, z: 0.2, ink: CREAM_INK },
      feet: false,
      tail: {
        pts: [[0.3, 0.5, -0.5], [0.8, 0.38, -0.6], [1.25, 0.42, -0.5], [1.5, 0.72, -0.4], [1.48, 1.06, -0.32], [1.3, 1.22, -0.26], [1.1, 1.12, -0.2]],
        r: 0.22, color: TAIL, deep: TAIL_DK, tip: TAIL_DK,
        shape: t => t < 0.08 ? 0.7 + 3.75 * t : (t > 0.9 ? 0.55 + 0.45 * Math.cos((t - 0.9) / 0.1 * Math.PI / 2) : 1),
        paint(g, w, h) {
          g.fillStyle = TAIL; g.fillRect(0, 0, w, h);
          const lg = g.createLinearGradient(0, 0, w * 0.3, 0); lg.addColorStop(0, '#E4BE91'); lg.addColorStop(1, 'rgba(237,206,172,0)');
          g.fillStyle = lg; g.fillRect(0, 0, w * 0.3, h);
          // spots near the root
          [[0.14, 0.2], [0.2, 0.7], [0.27, 0.35], [0.33, 0.85], [0.36, 0.1]].forEach(([t, v]) => { g.fillStyle = TAIL_DK; g.beginPath(); g.ellipse(t * w, v * h, 22, 11, 0, 0, Math.PI * 2); g.fill(); });
          // jagged dark rings
          g.fillStyle = TAIL_DK;
          [[0.5, 0.065], [0.62, 0.07], [0.74, 0.07], [0.855, 0.06]].forEach(([c, bw]) => {
            const x0 = (c - bw / 2) * w, x1 = (c + bw / 2) * w, n = 10;
            g.beginPath(); g.moveTo(x0, 0);
            for (let i = 0; i <= n; i++) g.lineTo(x0 + (i % 2 ? -9 : 7), i / n * h);
            for (let i = n; i >= 0; i--) g.lineTo(x1 + (i % 2 ? 9 : -7), i / n * h);
            g.closePath(); g.fill();
          });
          g.fillRect(0.94 * w, 0, 0.06 * w, h);
        },
        fur: { layers: 14, length: 0.06, gravity: 0.015, repeat: [16, 6] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, lathe, D } = K;
      const dbl = THREE.DoubleSide;

      /* ---------------- face: cheek fur tufts (石虎 fluffy cheeks) ---------------- */
      const edgeX = (y) => { let lo = 0, hi = 1.4; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; } return lo; };
      const lock = (parent, root, dir, len, r0, mat, ink, bend) => {
        const d = V(dir[0], dir[1], dir[2]).normalize(), a = V(root[0], root[1], root[2]);
        const b = a.clone().addScaledVector(d, len * 0.55).add(V(0, bend * len, 0)), c = a.clone().addScaledVector(d, len);
        return mesh(tube([a, b, c], t => r0 * (1 - Math.pow(t, 1.3)) + 0.004, 16, 8), mat, parent, null, null, ink);
      };
      {
        const furMat = std(FUR, { roughness: 0.95 }), edgeMat = std(FUR_EDGE, { roughness: 0.95 }), creamMat = std(CREAM, { roughness: 0.95 });
        [-1, 1].forEach(sx => {
          [[Y(118), -12, 0.1, 0.07, 0], [Y(135), 6, 0.09, 0.07, 1], [Y(152), 20, 0.1, 0.075, 0], [Y(168), 32, 0.17, 0.085, 1], [Y(184), 42, 0.17, 0.085, 0], [Y(198), 50, 0.17, 0.08, 1], [Y(207), 38, 0.18, 0.08, 0]]
            .forEach(([y, ang, len, r0, alt], i) => {
              const ex = edgeX(y), a = rad(ang), zz = [0.1, -0.05, 0.08, -0.06, 0.06, -0.08, 0.02][i];
              lock(K.faceG, [sx * (ex - 0.07), y, zz], [sx * Math.cos(a), -Math.sin(a), zz * 0.6], len, r0, alt ? edgeMat : furMat, INK, -0.1);
            });
          // cream chin tufts under the flute
          [[0.18, Y(208), 0.36], [0.36, Y(203), 0.26]].forEach(([x, y, z]) => lock(K.faceG, [sx * x, y + 0.05, z], [sx * 0.35, -1, 0.3], 0.12, 0.06, creamMat, CREAM_INK, 0));
        });
      }
      // two freckle dots in each blush
      {
        const g = K.headTex.image.getContext('2d');
        [-1, 1].forEach(sx => [-0.035, 0.035].forEach(dx => {
          const s = K.onSkin(sx * 0.5 + dx, Y(168), [K.headMesh]); if (!s.uv) return;
          g.fillStyle = 'rgba(236,128,112,0.9)'; g.beginPath(); g.arc(s.uv.x * 1024, (1 - s.uv.y) * 512, 2.4, 0, Math.PI * 2); g.fill();
        }));
        K.headTex.needsUpdate = true;
      }

      /* ---------------- cap: blue-gray crown, gold wings, ice-crystal crest ---------------- */
      const hatG = part('hat', K.head);
      hatG.position.set(0, 3.49, 0.02);
      {
        const blueM = std(BLUE, { roughness: 0.8 }), rimM = std(BLUE_LT, { roughness: 0.8 }), goldM = std(GOLD, { roughness: 0.45, metalness: 0.15 });
        const zs = 0.86;
        mesh(new THREE.CylinderGeometry(0.385, 0.39, 0.06, 64), rimM, hatG, [0, 0.05, 0], [1, 1, zs], BLUE_INK);
        mesh(new THREE.CylinderGeometry(0.37, 0.36, 0.2, 64), blueM, hatG, [0, 0.18, 0], [1, 1, zs], BLUE_INK);
        mesh(new THREE.CylinderGeometry(0.33, 0.37, 0.02, 64), blueM, hatG, [0, 0.285, 0], [1, 1, zs]);
        // peaked crown plate (rounded pentagon), extruded
        const pk = new THREE.Shape();
        pk.moveTo(-0.24, 0.0); pk.lineTo(-0.24, 0.2); pk.quadraticCurveTo(-0.24, 0.26, -0.19, 0.3); pk.lineTo(-0.05, 0.37);
        pk.quadraticCurveTo(0, 0.4, 0.05, 0.37); pk.lineTo(0.19, 0.3); pk.quadraticCurveTo(0.24, 0.26, 0.24, 0.2); pk.lineTo(0.24, 0.0); pk.lineTo(-0.24, 0.0);
        mesh(extrude(pk, 0.17, 0.03, 4, 16), blueM, hatG, [0, 0.24, 0.1], null, BLUE_INK);
        // gold side plates behind the peak
        [-1, 1].forEach(sx => {
          const gp = mesh(K.roundBox(0.12, 0.22, 0.035, 0.015, 0.01), goldM, hatG, [0.26 * sx, 0.37, 0.05], null, GOLD_INK);
          gp.rotation.z = -0.42 * sx;
        });
        // ice-crystal crest: five shards fanned from the badge
        const shardGeo = (L, W) => { const g = new THREE.OctahedronGeometry(1, 0); g.scale(W, L / 2, W * 0.55); g.translate(0, L / 2, 0); return g; };
        const iceM = std('#C3D6EC', { roughness: 0.25, metalness: 0.05, flatShading: true, emissive: new THREE.Color('#B5CCE6'), emissiveIntensity: 0.12 });
        const crest = group(hatG, [0, 0.15, 0.3], [-0.12, 0, 0]);
        [[0, 0.42, 0.065], [0.8, 0.36, 0.055], [-0.8, 0.36, 0.055], [1.25, 0.2, 0.045], [-1.25, 0.2, 0.045]].forEach(([a, L, W]) => {
          const s = mesh(shardGeo(L, W), iceM, crest, [0, 0.02, 0], null, ICE_INK); s.rotation.z = -a;
        });
        // gold rhombus badge with a pale-blue gem
        const bd = mesh(K.roundBox(0.1, 0.1, 0.035, 0.012, 0.01), goldM, hatG, [0, 0.14, 0.33], null, GOLD_INK); bd.rotation.z = Math.PI / 4;
        const gem = mesh(K.roundBox(0.06, 0.06, 0.03, 0.01, 0.008), std('#A9C6E6', { roughness: 0.2 }), hatG, [0, 0.14, 0.35]); gem.rotation.z = Math.PI / 4;
        // white pompoms at the band ends
        const pomM = std(WHITE, { roughness: 1 });
        [-1, 1].forEach(sx => { const p = mesh(sphere(0.08, 24, 18), pomM, hatG, [0.41 * sx, 0.12, 0.06], null, CREAM_INK); K.addFur(p, { layers: 8, length: 0.025, gravity: 0.005, repeat: [3, 3] }); });
        // pine sprig (image-left) and pussy-willow twig (image-right) tucked behind the pompoms
        const stemM = std(TWIG, { roughness: 0.8 }), needleM = std(PINE, { roughness: 0.8 }), budM = std(CATKIN, { roughness: 1 }), capM = std('#8A6450', { roughness: 0.8 });
        const pg = group(hatG, [-0.42, 0.15, -0.02], [0, 0, 0.75]);
        mesh(tube([[0, 0, 0], [0.0, 0.14, 0], [0.02, 0.28, 0]], 0.012, 12, 6), stemM, pg);
        for (let i = 0; i < 26; i++) {
          const t = 0.25 + (i % 13) / 13 * 0.8, k = i < 13 ? 1 : -1, y = t * 0.28;
          const a = k * (0.5 + 0.5 * (1 - t)) + (i % 3 - 1) * 0.12, L = 0.1 + 0.03 * ((i * 7) % 3);
          const n = mesh(new THREE.CylinderGeometry(0.004, 0.007, L, 4), needleM, pg, [Math.sin(a) * L / 2, y + Math.cos(a) * L / 2, ((i % 2) - 0.5) * 0.03]);
          n.rotation.z = -a;
        }
        const wg = group(hatG, [0.42, 0.13, -0.02], [0, 0, -0.35]);
        mesh(tube([[0, 0, 0], [0.03, 0.18, 0], [0.02, 0.38, 0]], 0.013, 12, 6), stemM, wg);
        mesh(tube([[0.03, 0.16, 0], [0.1, 0.22, 0], [0.16, 0.26, 0]], 0.01, 10, 6), stemM, wg);
        [[0.02, 0.39, 0.0, 0.045], [0.16, 0.27, -0.9, 0.04], [-0.03, 0.26, 0.6, 0.038], [0.07, 0.12, -0.8, 0.035], [0.035, 0.31, -0.5, 0.034]].forEach(([x, y, r, s]) => {
          const b = mesh(sphere(s, 16, 12), budM, wg, [x, y, 0], [0.75, 1.15, 0.75], '#BCAE9F'); b.rotation.z = r;
          mesh(sphere(s * 0.45, 10, 8), capM, wg, [x + Math.sin(r) * s * 0.9, y - Math.cos(r) * s * 0.9, 0]);
        });
      }

      /* ---------------- flute clenched in the mouth ---------------- */
      const fluteG = part('flute', K.faceG);
      {
        const fy = Y(186), fz = Math.max(K.zAt(0, fy + 0.02), 0.62) + 0.07;
        fluteG.position.set(0.0, fy, fz);
        const fl = group(fluteG, null, [0, 0, Math.PI / 2]);
        const blueM = std(BLUE, { roughness: 0.6 }), goldM = std(GOLD, { roughness: 0.4, metalness: 0.2 }), goldDk = std(GOLD_DK, { roughness: 0.4, metalness: 0.2 });
        mesh(new THREE.CylinderGeometry(0.094, 0.094, 0.72, 32), blueM, fl, [0, 0, 0], null, BLUE_INK);
        [-1, 1].forEach(sx => {
          mesh(new THREE.CylinderGeometry(0.106, 0.106, 0.2, 32), goldM, fl, [0, -sx * 0.46, 0], null, GOLD_INK);
          mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.03, 32), goldDk, fl, [0, -sx * 0.4, 0]);
          mesh(sphere(0.106, 24, 12), goldM, fl, [0, -sx * 0.56, 0], [1, 0.22, 1]);
        });
        // small cream four-petal emblem on the front
        const em = group(fluteG, [0, 0, 0.094]);
        const pm = std(WHITE, { roughness: 0.6 });
        for (let i = 0; i < 4; i++) { const p = mesh(sphere(0.022, 12, 8), pm, em, [Math.sin(i * Math.PI / 2) * 0.024, Math.cos(i * Math.PI / 2) * 0.024, 0], [0.7, 1.2, 0.4]); p.rotation.z = -i * Math.PI / 2; }
        mesh(sphere(0.012, 10, 8), std(GOLD, { roughness: 0.5 }), em, [0, 0, 0.006]);
        // blue ring + cord with a bead and tassel near the image-right end
        const rx = X(298);
        const ring = mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 32), goldM, fluteG, [rx, 0, 0]); ring.rotation.y = Math.PI / 2;
        mesh(sphere(0.03, 16, 12), std('#8FA8C8', { roughness: 0.3 }), fluteG, [rx, 0, 0.1], null, BLUE_INK);
        const tg = group(fluteG, [rx + 0.02, -0.07, 0.07]);
        mesh(tube([[0, 0, 0], [0.005, -0.08, 0.01], [0.01, -0.16, 0.0]], 0.007, 10, 6), goldM, tg);
        mesh(sphere(0.028, 16, 12), std(WHITE, { roughness: 0.4 }), tg, [0.01, -0.18, 0], null, CREAM_INK);
        K.tassel(tg, [0.01, -0.23, 0], BLUE_DK, 0.12, 0.028, BLUE_INK);
        K.onTick((t, k) => { tg.rotation.z = 0.08 * Math.sin(t * 1.6) * k; });
      }

      /* ---------------- faceted ice orb held in both paws ---------------- */
      const orbG = part('orb', K.body);
      const ORB = { y: Y(250), z: 0.97, r: 0.41 };
      orbG.position.set(0, ORB.y, ORB.z);
      {
        // brilliant-cut ice gem: a flat 12-sided table facing the viewer, ringed by crown / girdle / pavilion facets
        const prof = [[0.0005, 0.33], [0.2, 0.33], [0.315, 0.22], [0.37, 0.05], [0.37, -0.07], [0.31, -0.22], [0.18, -0.32], [0.0005, -0.34]];
        let geo = new THREE.LatheGeometry(prof.slice().reverse().map(([r, h]) => new THREE.Vector2(r, h)), 12).toNonIndexed();
        geo.rotateX(Math.PI / 2); geo.rotateZ(Math.PI / 12); geo.scale(1.0, 1.08, 0.9);
        const pos = geo.attributes.position, cols = [], nrm = V(), a = V(), b = V(), c = V();
        const pal = ['#C8DAEE', '#BAD0E8', '#A8C1DF', '#9AB6D8', '#8FAED3', '#819FC8', '#7493BF'].map(h => new THREE.Color(h).convertSRGBToLinear());
        const byFace = {};
        for (let f = 0; f < pos.count / 3; f++) {
          a.fromBufferAttribute(pos, f * 3); b.fromBufferAttribute(pos, f * 3 + 1); c.fromBufferAttribute(pos, f * 3 + 2);
          nrm.subVectors(c, b).cross(a.clone().sub(b)); if (nrm.lengthSq() < 1e-12) { for (let q = 0; q < 3; q++) cols.push(1, 1, 1); continue; }
          nrm.normalize(); if (nrm.dot(a.clone().add(b).add(c)) < 0) nrm.negate();
          const key = [nrm.x, nrm.y, nrm.z].map(v => Math.round(v * 12)).join(',');
          if (!byFace[key]) {
            // lighter toward the upper left, deeper blue toward the lower right, as painted
            const k = Math.max(0, Math.min(pal.length - 1, Math.round(2.4 + (nrm.x - nrm.y) * 2.4 + (K.rand() - 0.5) * 1.6)));
            byFace[key] = nrm.z > 0.97 ? new THREE.Color('#D3E2F2').convertSRGBToLinear() : pal[k];
          }
          const col = byFace[key]; for (let q = 0; q < 3; q++) cols.push(col.r, col.g, col.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        const orbMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.25, metalness: 0.05, emissive: new THREE.Color('#9FB9D6'), emissiveIntensity: 0.06 });
        mesh(geo, orbMat, orbG, null, null, ICE_INK);
        // white facet edges
        const ea = new THREE.EdgesGeometry(geo, 8).attributes.position;
        const edgeMat = std('#EEF4FA', { roughness: 0.5, emissive: new THREE.Color('#FFFFFF'), emissiveIntensity: 0.12 });
        for (let i = 0; i < ea.count; i += 2) {
          const p0 = V().fromBufferAttribute(ea, i).multiplyScalar(1.004), p1 = V().fromBufferAttribute(ea, i + 1).multiplyScalar(1.004);
          const e = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, p0.distanceTo(p1), 5, 1, true), edgeMat);
          e.position.copy(p0).add(p1).multiplyScalar(0.5); e.quaternion.setFromUnitVectors(V(0, 1, 0), p1.clone().sub(p0).normalize());
          orbG.add(e);
        }
        // frosty specks and the white snowflake on the front facet
        const inR = 0.33 * 0.9;
        for (let i = 0; i < 26; i++) {
          const u = K.rand() * 2 - 1, v = K.rand() * 2 - 1; if (u * u + v * v > 0.8) continue;
          const d = mesh(sphere(0.008 + K.rand() * 0.008, 8, 6), edgeMat, orbG, [u * 0.2, v * 0.2, inR + 0.004], [1, 1, 0.3]); d.castShadow = false;
        }
        const sf = K.snowflake(orbG, [0, 0, inR + 0.012], 0.32, '#FFFFFF');
        sf.children.forEach(o => { if (o.isMesh) o.castShadow = false; });
        K.onTick((t, k) => { orbG.rotation.y = 0.05 * Math.sin(t * 0.7) * k; });
        orbG.userData.orbMat = orbMat;
      }
      // cream mitten paws cupping the lower front of the orb; short cream forearms tucked into the cuffs
      {
        // rounded-box mitten (superellipsoid): straight sides, soft round top, a slightly flatter base
        const mit = new THREE.SphereGeometry(1, 40, 30), mp = mit.attributes.position;
        const se = v => Math.sign(v) * Math.pow(Math.abs(v), 0.72);
        for (let i = 0; i < mp.count; i++) {
          const x = mp.getX(i), y = mp.getY(i), z = mp.getZ(i);
          mp.setXYZ(i, se(x) * 0.11, (y < 0 ? se(y) * 0.92 : y) * 0.172, se(z) * 0.095);
        }
        K.smoothNormals(mit);
        K.poseG.children.filter(o => o.isMesh && o.geometry.parameters && Math.abs(o.geometry.parameters.radius - 0.12 * 1.2) < 1e-6)
          .forEach(o => { const sx = o.position.x < 0 ? -1 : 1; o.geometry = mit; o.scale.set(1, 1, 1); o.rotation.set(0.04, 0.28 * sx, -0.04 * sx); });
        const am = std(PAW, { roughness: 0.95 });
        ['L', 'R'].forEach(s => {
          const h = K.hands[s], sx = s === 'L' ? -1 : 1;
          mesh(tube([[0.35 * sx, 1.79, 0.96], [0.3 * sx, 1.78, 1.08], h.p.clone().add(V(0.02 * sx, 0.0, -0.06))], 0.065, 12, 10), am, K.poseG, null, null, PAW_INK);
        });
      }

      /* ---------------- open cream coat (外袍) with gold front edges ---------------- */
      const TOP = 2.24;
      // A-line: flares to the hem like the picture, stays slim above the waist where the sleeves hang in front of it
      const coatPts = new THREE.SplineCurve([[1.16, 0.36], [1.13, 0.55], [1.07, 0.8], [0.99, 1.05], [0.89, 1.28], [0.78, 1.5], [0.7, 1.72], [0.64, 1.9], [0.58, 2.08], [0.52, TOP]]
        .map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(80);
      const coatR = (y) => { for (let i = 0; i < coatPts.length - 1; i++) { const a = coatPts[i], b = coatPts[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < 0.36 ? 1.16 : 0.52; };
      const phi0 = (y) => rad(lerp(30.5, 23.5, sst(0.4, 0.95, y)) + 11 * sst(1.12, 1.45, y));
      const hemY = (ph) => 0.4 + 0.17 * sst(0.55, 1.65, ph);
      const coatUV = (x, y, W, H) => {   // world point on the coat front → canvas px
        const r = coatR(y); let phi = Math.asin(Math.max(-1, Math.min(1, x / r))); if (phi < 0) phi += Math.PI * 2;
        const ph = Math.min(phi, Math.PI * 2 - phi), hm = hemY(ph), t = (y - hm) / (TOP - hm);
        const p0 = phi0(lerp(0.4, TOP, t)), s = (phi - p0) / (Math.PI * 2 - 2 * p0);
        return [s * W, (1 - t) * H];
      };
      {
        const nu = 160, nv = 60, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, p0 = phi0(lerp(0.4, TOP, t));
          for (let i = 0; i <= nu; i++) {
            const phi = p0 + (Math.PI * 2 - 2 * p0) * i / nu, ph = Math.min(phi, Math.PI * 2 - phi);
            const y = lerp(hemY(ph), TOP, t), r = coatR(y);
            pos.push(Math.sin(phi) * r, y, Math.cos(phi) * r); uv.push(i / nu, t);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const W = 2048, H = 1024;
        const tex = canvasTex(W, H, (g) => {
          D.fill(g, ROBE);
          const at = (px, py) => coatUV(X(px), Y(py), W, H);
          // image-left panel: pine sprig, clouds, a small crystal
          { const [x, y] = at(172, 400); pineC(g, x, y, 240, -1.05, PINE, TWIG); }
          { const [x, y] = at(150, 414); cloudBlob(g, x, y, 105, BLUE_LT, '#FFFFFF'); }
          { const [x, y] = at(186, 384); crystalC(g, x, y, 34, 0.1, ICE_MID); }
          // image-right panel: layered waves and a cloud
          { const [x0, y0] = at(318, 392), [x1] = at(385, 392); wavesC(g, x0 - 10, x1 + 80, y0, 40, 4, BLUE_LT, '#FFFFFF'); }
          { const [x, y] = at(352, 378); cloudBlob(g, x, y, 60, BLUE_PALE, '#FFFFFF'); }
          // back: snowflakes, pines and clouds so the coat reads all round
          [[0.3, 700, 70], [0.5, 560, 90], [0.7, 700, 70]].forEach(([s, y, r]) => flakeC(g, s * W, y, r, LINE_BLUE));
          [[0.4, 860], [0.6, 860]].forEach(([s, y]) => cloudBlob(g, s * W, y, 70, BLUE_LT, '#FFFFFF'));
          pineC(g, 0.5 * W, 820, 200, 0.2, PINE, TWIG);
          // wave band along the hem all round
          g.fillStyle = BLUE_PALE; g.fillRect(0, H - 34, W, 34);
          g.fillStyle = LINE_BLUE; g.fillRect(0, H - 12, W, 12);
          // gold front edges: constant 0.075 world width
          const edge = (flip) => {
            g.fillStyle = GOLD; g.beginPath();
            const L = [], R = [];
            for (let k = 0; k <= 40; k++) {
              const t = k / 40, y = lerp(0.4, TOP, t), p0 = phi0(y), circ = coatR(y) * (Math.PI * 2 - 2 * p0), px = 0.09 / circ * W;
              L.push([0, (1 - t) * H]); R.push([px, (1 - t) * H]);
            }
            const pts = L.concat(R.reverse()).map(([x, y]) => [flip ? W - x : x, y]);
            pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
            g.strokeStyle = GOLD_DK; g.lineWidth = 4; g.beginPath();
            R.slice().reverse().forEach(([x, y], i) => { const xx = flip ? W - x : x; i ? g.lineTo(xx, y) : g.moveTo(xx, y); }); g.stroke();
          };
          edge(false); edge(true);
        });
        const coat = mesh(geo, texMat(tex, { side: dbl, roughness: 0.9 }), K.robeG, null, null, ROBE_INK);
        coat.userData.isCoat = true;
      }

      /* ---------------- big hanging sleeves (custom sacks, cuffs open toward the orb) ---------------- */
      const sleeveTex = canvasTex(1024, 1024, (g, w, h) => {
        D.fill(g, ROBE);
        g.fillStyle = BLUE_DK; g.fillRect(0.9 * w, 0, 0.1 * w, h);
        g.fillStyle = BLUE_INK; g.fillRect(0.9 * w - 5, 0, 5, h);
        g.fillStyle = BLUE_LT; g.fillRect(0.975 * w, 0, 0.025 * w, h);
      });
      const sleeveMat = texMat(sleeveTex, { roughness: 0.9 });
      const liningMat = std(BLUE_DK, { side: THREE.BackSide, roughness: 0.9 });
      const sleeveMeshes = [];
      const buildSleeve = (sx) => {
        // the pouch hangs IN FRONT of the body's sides (arms reach forward to the orb): in the picture its outer
        // edge stays at ~x 0.87 (about the head width), the cuff band runs down from the paw to y ≈ 1.05
        const spine = new THREE.CatmullRomCurve3([[0.44, -0.04], [0.66, 0.1], [0.79, 0.39], [0.76, 0.62], [0.6, 0.84], [0.36, 1.0]].map(([x, z]) => V(x * sx, 0, z)));
        const NT = 64, NA = 56, pos = [], uv = [], idx = [], ring = [];
        for (let i = 0; i <= NT; i++) {
          const t = i / NT, C = spine.getPointAt(t), T = spine.getTangentAt(t);
          T.y = 0; T.normalize();
          const n = V(T.z, 0, -T.x).multiplyScalar(sx);
          const yT = lerp(2.08, 1.84, sst(0.05, 0.42, t)) + 0.08 * sst(0.6, 1, t), yB = lerp(1.92, 1.22, sst(0.1, 0.46, t)) - 0.19 * sst(0.6, 1, t);
          const Wd = lerp(0.07, 0.1, sst(0, 0.3, t)) * (1 - 0.35 * sst(0.75, 1, t));
          const mid = (yT + yB) / 2, half = (yT - yB) / 2, sh = 0.08 * sst(0.6, 1, t);
          for (let j = 0; j <= NA; j++) {
            const a = j / NA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            const y = mid + half * Math.sign(ca) * Math.pow(Math.abs(ca), 0.85);
            const hgt = (y - yB) / (yT - yB);
            const s = Wd * Math.sign(sa) * Math.pow(Math.abs(sa), 0.7) * (1 + 0.15 * (1 - hgt));
            const p = C.clone().addScaledVector(n, s).addScaledVector(T, sh * Math.max(0, y - 1.4));
            p.y = y;
            pos.push(p.x, p.y, p.z); uv.push(t, (y - 0.9) / 1.3);
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
        sleeveMeshes.push(mesh(geo, sleeveMat, K.robeG, null, null, BLUE_INK));
        const lin = new THREE.Mesh(geo, liningMat); lin.receiveShadow = true; K.robeG.add(lin);
        mesh(tube(ring.slice(0, -1), 0.018, 120, 8, true), std(BLUE, { roughness: 0.8 }), K.robeG);
      };
      buildSleeve(-1); buildSleeve(1);
      // motif decals on the sleeve fronts (snowflake + willow on the image-left, pine + crystal on the image-right)
      {
        const decal = (paint, x, y, size) => {
          const tex = canvasTex(256, 256, paint);
          const dm = texMat(tex, { transparent: true, alphaTest: 0.3, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
          const hit = K.onSkin(x, y, sleeveMeshes);
          const d = mesh(new THREE.PlaneGeometry(size, size), dm, K.robeG, hit.p.clone().addScaledVector(hit.n, 0.006));
          d.lookAt(hit.p.clone().add(hit.n)); d.castShadow = false;
        };
        decal(g => flakeC(g, 128, 128, 105, LINE_BLUE, 11), X(176), Y(309), 0.22);
        decal(g => willowC(g, 110, 230, 190, 0.35, false), X(170), Y(333), 0.24);
        decal(g => pineC(g, 150, 235, 200, -0.6, PINE, TWIG), X(333), Y(333), 0.27);
        decal(g => crystalC(g, 128, 128, 100, 0.25, ICE_MID), X(328), Y(306), 0.13);
      }

      /* ---------------- white fur capelet with blue-gray lining ---------------- */
      const capeG = part('cape', K.body);
      {
        const prof = new THREE.SplineCurve([[1.0, 1.6], [1.02, 1.76], [0.98, 1.92], [0.87, 2.07], [0.69, 2.2], [0.47, 2.3], [0.28, 2.37]].map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(60);
        const capR = (y) => { for (let i = 0; i < prof.length - 1; i++) { const a = prof[i], b = prof[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < 1.6 ? 1.0 : 0.28; };
        const open = rad(34), capHem = (ph) => lerp(1.88, 1.62, sst(rad(38), rad(95), ph)) + 0.1 * sst(rad(110), rad(180), ph);
        const nu = 120, nv = 30, pos = [], uv = [], idx = [], hem = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv;
          for (let i = 0; i <= nu; i++) {
            const phi = open + (Math.PI * 2 - 2 * open) * i / nu, ph = Math.min(phi, Math.PI * 2 - phi);
            const y = lerp(capHem(ph), 2.37, Math.pow(t, 0.9)), r = capR(y) + 0.02 * Math.sin(phi * 9) * (1 - t);
            const p = V(Math.sin(phi) * r, y, Math.cos(phi) * r);
            pos.push(p.x, p.y, p.z); uv.push(i / nu, t);
            if (j === 0) hem.push(p);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const tex = canvasTex(1024, 256, (g, w, h) => {
          D.fill(g, '#F4F0EA');
          // blue-gray lining showing where the lower edge rolls outward at the shoulders / back
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, 'rgba(132,145,159,0)'); lg.addColorStop(0.12, 'rgba(132,145,159,0.95)'); lg.addColorStop(0.88, 'rgba(132,145,159,0.95)'); lg.addColorStop(1, 'rgba(132,145,159,0)');
          g.fillStyle = lg; g.fillRect(0, h - 34, w, 34);
        });
        const cape = mesh(geo, texMat(tex, { side: dbl, roughness: 1 }), capeG, null, null, CREAM_INK);
        const lin = new THREE.Mesh(geo, std(BLUE_DK, { side: THREE.BackSide, roughness: 0.9 })); lin.receiveShadow = true; cape.add(lin);
        K.addFur(cape, { layers: 12, length: 0.045, gravity: 0.012, repeat: [22, 5] });
        // thick rolled blue-gray lining along the lower edge and up both front edges
        const rollM = std(BLUE, { roughness: 0.8 });
        const out = (p, d) => { const q = p.clone(); const r = Math.hypot(q.x, q.z); q.x *= (r + d) / r; q.z *= (r + d) / r; return q; };
        const fL = [], fR = [];
        for (let k = 8; k >= 0; k--) { const y = lerp(1.9, 2.3, k / 8), r = capR(y) + 0.03; fR.push(V(Math.sin(open) * r, y, Math.cos(open) * r)); }
        fR.forEach(p => fL.push(V(-p.x, p.y, p.z)));
        const roll = fR.concat(hem.slice(1, -1).filter((_, i) => i % 2 === 0).map(p => out(p, 0.03).add(V(0, 0.01, 0)))).concat(fL.slice().reverse());
        mesh(tube(roll, t => 0.06 - 0.025 * Math.pow(Math.abs(2 * t - 1), 12), 360, 10), rollM, capeG, null, null, BLUE_INK);
        const fm = std(WHITE, { roughness: 1 });
        // pompom pairs and pine sprigs at the front
        [-1, 1].forEach(sx => {
          [[X(251 + 53), Y(242), 0.075], [X(251 + 57), Y(256), 0.072]].forEach(([x, y, r]) => {
            const xx = Math.abs(x) * sx, rr = capR(y), z = Math.sqrt(Math.max(rr * rr - xx * xx, 0.01)) + 0.07;
            const p = mesh(sphere(r, 24, 18), fm, capeG, [xx, y, z], null, CREAM_INK);
            K.addFur(p, { layers: 8, length: 0.025, gravity: 0.005, repeat: [3, 3] });
          });
          const pg = group(capeG, [sx * 0.58, Y(245), 0.68], [0.3, 0.35 * sx, -sx * 1.25]);
          const stemM = std(TWIG, { roughness: 0.8 }), needleM = std('#8FA2B2', { roughness: 0.8 });
          mesh(tube([[0, 0, 0], [0, 0.16, 0.01], [0.01, 0.32, 0]], 0.011, 10, 6), stemM, pg);
          for (let i = 0; i < 30; i++) {
            const t = 0.2 + (i % 15) / 15 * 0.85, k = i < 15 ? 1 : -1, y = t * 0.32;
            const a = k * (0.5 + 0.5 * (1 - t)), L = 0.12 + 0.03 * ((i * 5) % 3);
            const n = mesh(new THREE.CylinderGeometry(0.004, 0.006, L, 4), needleM, pg, [Math.sin(a) * L / 2, y + Math.cos(a) * L / 2, 0.01]);
            n.rotation.z = -a;
          }
        });
      }

      /* ---------------- sash belt with a quatrefoil snowflake badge, bows and tassel ---------------- */
      {
        const yT = Y(305), yB = Y(332), yK = (yT + yB) / 2;
        const btex = canvasTex(1024, 128, (g, w, h) => {
          D.fill(g, BELT);
          g.strokeStyle = 'rgba(160,172,186,0.7)'; g.lineWidth = 5;
          for (let x = -40; x < w + 40; x += 22) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 22, h / 2); g.lineTo(x, h - 8); g.stroke(); }
          g.fillStyle = BLUE_INK; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
        });
        btex.wrapS = THREE.RepeatWrapping; btex.repeat.set(3, 1);
        mesh(new THREE.CylinderGeometry(K.robeR(yT) + 0.035, K.robeR(yB) + 0.035, yT - yB, 96, 1, true), texMat(btex, { side: dbl, roughness: 0.85 }), K.beltG, [0, yK, 0]);
        const goldM = std(GOLD, { roughness: 0.45, metalness: 0.15 });
        const cord = mesh(new THREE.TorusGeometry(K.robeR(yB) + 0.045, 0.014, 8, 128), goldM, K.beltG, [0, yB - 0.01, 0]); cord.rotation.x = Math.PI / 2;
        const zK = K.robeR(yK) + 0.07;
        // quatrefoil badge
        const qf = new THREE.Shape();
        for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, r = 0.12 * (1 + 0.16 * Math.cos(4 * a)); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? qf.lineTo(x, y) : qf.moveTo(x, y); }
        const bG = group(K.beltG, [0, yK + 0.01, zK]);
        mesh(extrude(qf, 0.04, 0.012, 3, 64), goldM, bG, null, null, GOLD_INK);
        const ftex = canvasTex(256, 256, (g) => { D.fill(g, '#BFD1E4'); flakeC(g, 128, 128, 100, '#FFFFFF', 18); });
        const face = mesh(new THREE.CircleGeometry(0.095, 48), texMat(ftex, { roughness: 0.5 }), bG, [0, 0, 0.022]); face.castShadow = false;
        // blue bow loops hanging below
        const bowM = std(BLUE, { roughness: 0.8, side: dbl });
        [-1, 1].forEach(sx => {
          const l = mesh(new THREE.TorusGeometry(0.06, 0.022, 10, 28), bowM, K.beltG, [0.1 * sx, yB - 0.04, zK - 0.01], [1, 0.75, 0.6], BLUE_INK);
          l.rotation.set(0, 0, sx * 0.9);
        });
        // gold bead and blue tassel
        const tg = group(K.beltG, [0, yB - 0.08, zK]);
        mesh(sphere(0.035, 16, 12), goldM, tg, [0, 0, 0], null, GOLD_INK);
        const tas = K.tassel(tg, [0, -0.05, 0], BLUE_DK, 0.16, 0.035, BLUE_INK);
        K.onTick((t, k) => { tg.rotation.z = 0.07 * Math.sin(t * 1.7) * k; });
      }

      /* ---------------- apron (蔽膝): blue-gray frame, snowflake, willow & plum, waves ---------------- */
      K.robePanel({
        y0: Y(445), y1: Y(336), deg: 30, degB: 31, off: 0.035, color: ROBE, ink: BLUE_INK, parent: part('apron', K.body),
        paint(g, w, h) {
          const k = w / (294 - 208), u = px => (px - 208) * k, v = py => (py - 336) * k;
          D.fill(g, ROBE);
          g.save(); g.scale(1, h / ((445 - 336) * k));
          flakeC(g, u(238), v(370), 40, LINE_BLUE, 7);
          willowC(g, u(270), v(422), 200, 0.22, true);
          wavesC(g, 20, w - 20, v(414), 22, 3, BLUE_LT, '#FFFFFF');
          g.restore();
          const bw = 28;
          g.fillStyle = BLUE_DK; g.fillRect(0, 0, bw, h); g.fillRect(w - bw, 0, bw, h); g.fillRect(0, h - bw, w, bw);
          g.strokeStyle = BLUE_INK; g.lineWidth = 4; g.strokeRect(bw, -10, w - bw * 2, h - bw + 10);
          g.fillStyle = BLUE_LT; g.fillRect(bw + 2, h - bw - 8, w - bw * 2 - 4, 5);
        }
      });

      /* ---------------- fur-cuffed trousers and blue snowflake shoes ---------------- */
      const shoeG = part('shoes', K.poseG);
      {
        const shoeTex = texMat(canvasTex(512, 256, (g, w, h) => {
          D.fill(g, '#A0AFC6');
          g.save(); g.translate(0.25 * w, 0.4 * h); g.scale(1, 1.76); flakeC(g, 0, 0, 27, '#FFFFFF', 5); g.restore();
        }), { roughness: 0.75 }), soleM = std(SOLE, { roughness: 0.8 }), furM = std(WHITE, { roughness: 1 });
        [-1, 1].forEach(sx => {
          const sg = group(shoeG, [sx * 0.47, 0, 0.2]);
          mesh(sphere(1, 48, 28), shoeTex, sg, [0, 0.13, 0.02], [0.3, 0.17, 0.37], BLUE_INK);
          mesh(new THREE.CylinderGeometry(1, 1, 0.05, 40), soleM, sg, [0, 0.03, 0.02], [0.31, 1, 0.385], SOLE_INK);
          const cuff = mesh(new THREE.TorusGeometry(0.25, 0.07, 12, 40), furM, sg, [0, 0.3, 0], null, CREAM_INK); cuff.rotation.x = Math.PI / 2;
          K.addFur(cuff, { layers: 8, length: 0.035, gravity: 0.01, repeat: [8, 2] });
        });
      }

      /* ---------------- floating 大寒 decorations ---------------- */
      {
        const items = [];
        const iceM = std(ICE, { roughness: 0.25, flatShading: true, emissive: new THREE.Color('#C9DCEF'), emissiveIntensity: 0.2 });
        const shard = (pos, L, rot) => {
          const g = group(K.decor, pos, [0, 0.3, rot]);
          const geo = new THREE.OctahedronGeometry(1, 0); geo.scale(L * 0.28, L / 2, L * 0.16);
          mesh(geo, iceM, g, null, null, ICE_INK); items.push(g);
        };
        shard([X(100), Y(120), 0.1], 0.36, 0.25); shard([X(123), Y(228), 0.25], 0.3, -0.2); shard([X(381), Y(242), 0.2], 0.3, 0.2);
        const flake = (pos, s) => { const g = K.snowflake(K.decor, pos, s, '#B9CDE3'); items.push(g); };
        flake([X(85), Y(190), 0.1], 0.55); flake([X(390), Y(110), 0.0], 0.55);
        // pussy-willow + plum branches
        const branch = (pos, rot, s) => {
          const g = group(K.decor, pos, [0, 0, rot]); g.scale.setScalar(s);
          const stemM = std(TWIG, { roughness: 0.8 }), budM = std(CATKIN, { roughness: 1 }), capM = std('#8A6450', { roughness: 0.8 });
          mesh(tube([[0, 0, 0], [0.08, 0.35, 0], [0.04, 0.72, 0]], 0.02, 16, 6), stemM, g);
          mesh(tube([[0.07, 0.3, 0], [0.22, 0.42, 0], [0.32, 0.55, 0]], 0.015, 12, 6), stemM, g);
          [[0.04, 0.74, 0.0], [0.32, 0.57, -0.6], [0.0, 0.5, 0.7], [0.14, 0.2, -0.9], [0.2, 0.44, -0.5]].forEach(([x, y, r]) => {
            const b = mesh(sphere(0.055, 16, 12), budM, g, [x, y, 0], [0.75, 1.2, 0.75], '#BCAE9F'); b.rotation.z = r;
            mesh(sphere(0.026, 10, 8), capM, g, [x + Math.sin(r) * 0.05, y - Math.cos(r) * 0.05, 0]);
          });
          K.flower(g, [0.12, 0.3, 0.05], 0.32, PLUM, PLUM_C, 5);
          items.push(g);
        };
        branch([X(422), Y(262), 0.1], -0.55, 0.95); branch([-1.35, 1.26, 0.35], 0.8, 0.85);
        // wind swirl
        const sw = group(K.decor, [X(418), Y(170), 0.0]);
        const pts = []; for (let i = 0; i <= 40; i++) { const a = -0.6 + i / 40 * Math.PI * 1.9, r = 0.3 - 0.2 * i / 40; pts.push([Math.cos(a) * r, Math.sin(a) * r - 0.05 * i / 40, 0]); }
        mesh(tube(pts, t => 0.012 + 0.04 * Math.sin(Math.PI * Math.min(1, t * 1.2)), 80, 10), std('#CBD9E8', { roughness: 0.7 }), sw, null, null, LINE_BLUE);
        items.push(sw);
        // frosted leaf
        const lf = group(K.decor, [-1.5, 0.9, 0.25], [0.2, 0.3, -0.5]);
        const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.quadraticCurveTo(0.14, 0.18, 0, 0.42); ls.quadraticCurveTo(-0.14, 0.18, 0, 0);
        mesh(extrude(ls, 0.025, 0.008, 2, 12), std(PINE, { roughness: 0.8 }), lf, null, null, PINE_DK);
        items.push(lf);
        items.forEach((g) => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.0 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.1 * Math.sin(t * 0.7 + i) * k;
        }));
      }
    },

    action: {
      label: '吹笛', dur: 2.2,
      run(s, p, K) {
        K.headG.rotation.x = -0.08 * s;
        K.headG.rotation.z = 0.05 * Math.sin(p * Math.PI * 4) * s;
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '吹響寒冬尾聲的冰笛石虎',
        text: '大寒是二十四節氣的最後一個、一年中最冷的時候。這隻臺灣石虎嘴裡橫咬著藍色玉笛、雙手捧著冰晶球，一身霜藍、米白與淡金，配上松枝、柳芽和梅花，把「冬去春來」的期待穿在身上。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '石虎的斑點臉',
        text: '黃褐色的毛上散佈深褐斑點，額頭正中一道長縱紋、兩側各有短紋；眼睛上方的兩塊白斑與奶白色口鼻是石虎的招牌特徵。深棕圓眼、粉色小鼻、淡淡腮紅上點著兩顆小點，兩頰長出一撮撮蓬鬆的長毛。' },
      hat: { chip: '冰晶冠', tag: '服飾', name: '灰藍冰晶小冠',
        text: '灰藍色的小冠帽頂呈圓角五角形，後方斜插兩片金色冠翅。正前方五根冰晶呈扇形展開，底下嵌一枚金框菱形藍寶石；帽圈兩端各綴一顆白毛球，左邊插松枝、右邊插柳芽。' },
      flute: { chip: '玉笛', tag: '道具', name: '橫咬的藍玉笛',
        text: '一支灰藍色的笛子橫咬在嘴裡，兩端包著金色笛頭，中央飾一朵白色小花；右側繫著藍珠、白珠與藍色流蘇，像要吹出送走寒冬的曲子。' },
      orb: { chip: '冰晶球', tag: '道具', name: '多面冰晶球',
        text: '雙手從寬袖裡伸出，在胸前捧著一顆切割成多面的淡藍冰晶球，每個切面都泛著白色霜光，正中央浮著一朵白色雪花，象徵大寒的冰天雪地。' },
      cape: { chip: '毛披肩', tag: '服飾', name: '白毛短披肩',
        text: '肩上圍著一圈蓬鬆的白色毛披肩，下緣捲出灰藍色裡布。前襟兩側各垂一對白毛球，並插著一小枝松針，保暖又帶著冬日山林的氣息。' },
      robe: { chip: '外袍', tag: '服飾', name: '雪花松枝外袍',
        text: '米白色的外袍前襟敞開，兩道淡金色衣緣從腰間斜斜垂到下襬。寬大的袖子下垂到膝邊，袖口是灰藍寬邊；袍上繡著雪花、松枝、柳芽、冰晶，右下擺是層層淡藍浪花，左下擺是祥雲。' },
      belt: { chip: '腰帶', tag: '服飾', name: '編織腰帶與雪花扣',
        text: '灰藍色的編織寬腰帶，正中央是一枚金框四葉形徽章，裡頭畫著白色雪花；下方繫著兩個藍色蝴蝶結圈、一顆金珠與一束藍流蘇，腰帶下緣還壓一道金繩。' },
      apron: { chip: '蔽膝', tag: '服飾', name: '冰雪蔽膝',
        text: '灰藍內袍前垂著一片米白蔽膝，三邊鑲灰藍寬框。上面畫著一朵淡藍雪花、一枝開著梅花的柳芽，底下是起伏的藍色浪紋，寓意寒冬裡已藏著春意。' },
      shoes: { chip: '雪花鞋', tag: '服飾', name: '毛邊褲腳與雪花鞋',
        text: '米白褲腳收著一圈白色毛邊，底下是圓頭的灰藍布鞋，鞋頭各繡一朵白雪花，鞋底是奶白色厚底。' },
      tail: { chip: '環紋尾', tag: '貓咪本體', name: '粗大的環紋尾巴', dir: [1, 0.25, -0.6],
        text: '又粗又長的尾巴從身後向右繞出、再向上捲成大大的弧形。尾根帶著深褐斑點，往尾端變成一圈圈深褐環紋，尾尖是深褐色，正是石虎的特徵。' }
    },
    order: ['overview', 'face', 'hat', 'flute', 'orb', 'cape', 'robe', 'belt', 'apron', 'shoes', 'tail']
  });
})();
