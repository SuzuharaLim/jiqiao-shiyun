// @file 23_小寒_黑貓
// @title 小寒・八爺黑貓 | 二十四節氣貓
// 小寒：黑色長毛貓化身「八爺」范無救。頭戴金邊烏紗高帽（正面梅花徽、兩側金如意），帽側垂紅流蘇；
// 白毛領、黑色雪花披肩、米白梅花大袖、黑袍配藍色雲紋前襟與紅腰帶金牌，雙爪握著一條沉重的灰色鎖鏈。
(function () {
  /* ---------------------------------------------------------------------------
   * Picture scale: 1 unit = 100 px of refs/23.png, body axis at px x = 247, shoe soles at py = 492.
   * Colours are SAMPLED from the picture; def.exposure dims the lights so they render close to it.
   * ------------------------------------------------------------------------- */
  const X = px => (px - 247) / 100, Y = py => (492 - py) / 100;
  const HY = 3.36, NECK = 2.62;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const spow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);
  const tab = T => y => { if (y <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (y <= T[i][0]) return lerp(T[i - 1][1], T[i][1], (y - T[i - 1][0]) / (T[i][0] - T[i - 1][0])); return T[T.length - 1][1]; };

  // ---- colours sampled from refs/23.png ----
  const FUR = '#585151', FUR_TOP = '#4E4848', FUR_MID = '#575050', FUR_LOW = '#5D5656', FUR_DK = '#423C3D', INK = '#2B2526';
  const PAW = '#504A4B';
  const EAR_IN = '#F8C6BC', EAR_TUFT = '#FBF3EA', NOSE = '#F7B3AB';
  const EYE = '#2E211A', IRIS = '#DDB86F';
  const GOLD = '#F0CD95', GOLD_DK = '#D9A769', GOLD_INK = '#A57D51';
  const HAT = '#4C4748', HAT_DOME = '#555051', HAT_INK = '#2A2526';
  const CREAM = '#FAF3E8', CREAM_SH = '#E8DCCB', CREAM_INK = '#C2AD93', FURC = '#FBF6EC', FURC_INK = '#CDBBA6';
  const ROBE = '#4E4A4E', PANEL = '#433E41', YOKE = '#433F42', ROBE_INK = '#2A2627';
  const BLUE = '#A7B1BE', BLUE_LT = '#C3CDD7', BLUE_PALE = '#E4E9EE', BLUE_INK = '#7D8A9C';
  const RED = '#CC5752', RED_DK = '#A4403B', RED_INK = '#7A2C29';
  const PLUM = '#D9564C', PLUM_C = '#F2C46A', BRANCH = '#86594A';
  const PINE = '#526A58', PINE_LT = '#6F8872', PINE_INK = '#34463A';
  const CHAIN = '#8E8988', CHAIN_INK = '#2F2B2C';
  const SHOE = '#474344', SOLE = '#F6EEE2', SOLE_INK = '#A8998A';
  const SNOW = '#FFFFFF';

  /* ---------------- canvas motifs ---------------- */
  function flake(g, x, y, s, color, lw) { // six-armed snowflake with forked tips
    g.save(); g.translate(x, y); g.strokeStyle = color; g.lineWidth = lw || Math.max(2, s * 0.1); g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate(i * Math.PI / 3);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s);
      [0.5, 0.75].forEach(k => { g.moveTo(0, -s * k); g.lineTo(s * 0.2, -s * (k + 0.17)); g.moveTo(0, -s * k); g.lineTo(-s * 0.2, -s * (k + 0.17)); });
      g.stroke(); g.restore();
    }
    g.restore();
  }
  function blossom(g, x, y, s, petal, center, rot) { // five round plum petals
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.fillStyle = petal;
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.beginPath(); g.arc(Math.sin(a) * s * 0.5, -Math.cos(a) * s * 0.5, s * 0.42, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = center; g.beginPath(); g.arc(0, 0, s * 0.24, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function plumSprig(g, x, y, s, rot, flip) { // brown twig with three red blossoms and buds
    g.save(); g.translate(x, y); g.rotate(rot || 0); if (flip) g.scale(-1, 1);
    g.strokeStyle = BRANCH; g.lineCap = 'round'; g.lineWidth = s * 0.05;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.12, -s * 0.45, s * 0.02, -s); g.stroke();
    g.lineWidth = s * 0.035;
    g.beginPath(); g.moveTo(s * 0.07, -s * 0.42); g.quadraticCurveTo(s * 0.25, -s * 0.52, s * 0.34, -s * 0.72); g.stroke();
    g.beginPath(); g.moveTo(s * 0.05, -s * 0.7); g.lineTo(-s * 0.14, -s * 0.84); g.stroke();
    blossom(g, s * 0.34, -s * 0.74, s * 0.2, PLUM, PLUM_C, 0.3);
    blossom(g, s * 0.08, -s * 0.36, s * 0.2, PLUM, PLUM_C, 0.9);
    blossom(g, -s * 0.13, -s * 0.84, s * 0.17, PLUM, PLUM_C, 0.1);
    g.fillStyle = PLUM; [[0.02, -1.0, 0.06], [0.22, -0.55, 0.05], [-0.05, -0.18, 0.05]].forEach(([bx, by, r]) => { g.beginPath(); g.arc(bx * s, by * s, r * s, 0, Math.PI * 2); g.fill(); });
    g.restore();
  }
  function pineSprig(g, x, y, s, rot) { // pine twig with fanned needle clusters
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.lineCap = 'round';
    g.strokeStyle = '#6D5245'; g.lineWidth = s * 0.04;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 0.9, -s * 0.55); g.stroke();
    [[0.25, -0.15], [0.55, -0.34], [0.85, -0.52]].forEach(([cx, cy], k) => {
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * 0.85 + i / 8 * Math.PI * 0.9;
        g.strokeStyle = i % 2 ? PINE : PINE_LT; g.lineWidth = s * 0.022;
        g.beginPath(); g.moveTo(cx * s, cy * s); g.lineTo(cx * s + Math.cos(a) * s * 0.26, cy * s + Math.sin(a) * s * 0.26); g.stroke();
      }
    });
    g.restore();
  }
  function windSwirl(g, x, y, s, rot, fill, line) { // pale-blue wind streak ending in a curl (風紋)
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.fillStyle = fill; g.beginPath();
    g.moveTo(-s, s * 0.18);
    g.bezierCurveTo(-s * 0.4, s * 0.3, s * 0.35, s * 0.05, s * 0.62, -s * 0.28);
    g.bezierCurveTo(s * 0.78, -s * 0.48, s * 0.55, -s * 0.62, s * 0.35, -s * 0.45);
    g.bezierCurveTo(s * 0.12, -s * 0.25, -s * 0.5, s * 0.02, -s, s * 0.18);
    g.fill();
    g.strokeStyle = line; g.lineCap = 'round'; g.lineWidth = s * 0.05;
    [[0.0, 0.0], [0.09, 0.08]].forEach(([dy, dx]) => {
      g.beginPath(); g.moveTo(-s * 0.72 + dx * s, s * 0.14 - dy * s);
      g.bezierCurveTo(-s * 0.2, s * 0.12 - dy * s, s * 0.3, -s * 0.05 - dy * s, s * 0.48 - dx * s, -s * 0.3 + dy * s); g.stroke();
    });
    g.restore();
  }
  function cloudBank(g, x0, x1, yb, r, kx, fill, fill2, line) { // layered round cloud mounds along a baseline
    g.save();
    const step = r * 1.5 * kx;
    for (let row = 0; row < 2; row++) {
      for (let x = x0 - (row ? step / 2 : 0); x <= x1 + step; x += step) {
        const rr = r * (row ? 0.75 : 1), cy = yb - (row ? r * 0.9 : 0);
        g.fillStyle = row ? fill2 : fill; g.beginPath(); g.ellipse(x, cy, rr * kx, rr, 0, Math.PI, 0); g.fill();
        g.strokeStyle = line; g.lineWidth = Math.max(2, r * 0.12); g.beginPath(); g.ellipse(x, cy, rr * kx * 0.7, rr * 0.7, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      }
    }
    g.restore();
  }

  function lineCurl(g, x, y, s, color, lw) { // thin wave line ending in a spiral (雲水紋)
    g.save(); g.translate(x, y); g.strokeStyle = color; g.lineWidth = lw || s * 0.07; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-s, s * 0.25);
    g.bezierCurveTo(-s * 0.55, s * 0.35, -s * 0.2, -s * 0.1, s * 0.2, -s * 0.12);
    g.bezierCurveTo(s * 0.55, -s * 0.14, s * 0.62, s * 0.22, s * 0.35, s * 0.25);
    g.bezierCurveTo(s * 0.15, s * 0.27, s * 0.12, s * 0.02, s * 0.3, s * 0.02);
    g.stroke();
    g.beginPath(); g.moveTo(-s * 0.7, s * 0.45); g.bezierCurveTo(-s * 0.3, s * 0.5, s * 0.1, s * 0.3, s * 0.45, s * 0.48); g.stroke();
    g.restore();
  }

  NEKO.run({
    meta: {
      id: '23', term: '小寒', title: '小寒・八爺黑貓', seal: '寒',
      eyebrow: '二〇二七節氣貓 · 23 小寒 · 黑貓',
      aria: '頭戴金邊黑色烏紗高帽、帽前梅花徽、兩側金如意與紅流蘇，圍白毛領、披黑色雪花肩披，穿米白梅花大袖與黑色雲紋長袍、繫紅腰帶金牌，雙爪握著一條灰色粗鎖鏈、身後翹著蓬鬆黑尾巴的琥珀眼黑色長毛貓 3D 模型'
    },
    theme: { accent: '#4A4447', accentDark: '#D8CFCB', glow: 'rgba(196, 206, 220, 0.34)', glowColor: '#C8D4E4' },
    palette: [['#585151', '墨黑'], ['#FAF3E8', '雪白'], ['#F0CD95', '淡金'], ['#CC5752', '梅紅']],
    spec: [['品種', '黑色長毛貓'], ['角色', '八爺范無救'], ['頭身比', '約 1 : 1.8']],
    seed: 2023,
    exposure: 0.8,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR_MID, low: FUR_LOW, deep: FUR_DK, cream: CREAM,
        ink: INK, creamInk: CREAM_INK, pattern: 'none', mask: false,
        noise: { colors: ['#6E6666', '#3E393A'], alpha: 0.08, n: 1400 },
        paintBase(g, P) {
          const L = (lon, lat) => P.xy(lon, lat);
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.45, FUR_MID); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // faint darker tabby streaks on the forehead, fanning down from under the hat
          g.filter = 'blur(3px)';
          g.filter = 'blur(6px)';
          [[-26, 14], [-13, 20], [0, 24], [13, 20], [26, 14]].forEach(([lon, latB]) => {
            P.stroke(g, [L(lon * 1.3, 70), L(lon * 1.12, 48), L(lon, latB)], 16, FUR_DK, 0.32);
          });
          g.filter = 'blur(3px)';
          // soft streaks sweeping back over the cheeks and on the back of the head
          [[[48, 18], [66, 12], [86, 6]], [[52, 2], [72, -4], [92, -10]]].forEach(s => {
            const p = s.map(([lo, la]) => L(lo, la)); P.stroke(g, p, 10, FUR_DK, 0.45); P.stroke(g, P.mirror(p), 10, FUR_DK, 0.45);
          });
          [-160, -130, -100, 100, 130, 160, 180].forEach(lon => P.stroke(g, [L(lon, 70), L(lon + 4, 35), L(lon, 0)], 14, FUR_DK, 0.4));
          g.filter = 'none';
        }
      },
      head: { y: HY, neck: NECK, w: 0.88, h: 0.7, d: 0.84, cheek: 0.12, ruff: 0.07, ruffFreq: 16, chinDrop: 0.02,
        // the picture's head stays wide right down to the collar: widen and lower the lower half
        deform(p, o) { if (o.y < 0) { p.x *= 1 + 0.26 * sst(-0.25, -0.9, o.y); p.y *= 1 + 0.08 * sst(-0.4, -1, o.y); } },
        fur: { layers: 20, length: 0.12, gravity: 0.03, repeat: [10, 6] } },
      eyes: { x: 0.345, y: -0.04, r: 0.152, sx: 1.0, sy: 1.04, sz: 0.42, color: EYE, iris: IRIS, pupil: EYE, pupilR: 0.78, shine: 0.9 },
      nose: { y: -0.11, color: NOSE, size: 0.8 },
      muzzle: { y: -0.19, size: 0.42, color: '#5B5454' },
      mouth: { type: 'w', color: '#231C1D', y: -0.2, w: 0.1 },
      blush: { color: 'rgba(226,128,120,0.6)', x: 0.56, y: -0.12, r: 30 },
      whiskers: { color: '#EEE9E5', n: 2, len: 0.42, r: 0.0075, y: -0.2, x: 0.62, spread: 0.2, droop: 0.02, curve: 0.02 },
      ears: { x: 0.79, y: 0.33, z: -0.04, tilt: 0.5, yaw: 0.18, pitch: -0.08, size: [0.41, 0.6, 0.16], sharp: 0.94,
        color: FUR, inner: EAR_IN, tuft: EAR_TUFT, tuftScale: 1.0, fur: { layers: 8, length: 0.04, gravity: 0.01, repeat: [3, 3] } },
      bib: false,
      robe: {
        profile: [[1.08, 0.42], [1.1, 0.5], [1.03, 0.7], [0.92, 1.0], [0.84, 1.3], [0.77, 1.6], [0.73, 1.9], [0.67, 2.15], [0.56, 2.35], [0.36, 2.5], [0.14, 2.6]],
        color: '#FFFFFF', ink: ROBE_INK, lining: '#3A3638', hemY: 0.62,
        paint(g, w, h, D, R) {
          const Yr = y => R.robeV(y);
          const degAt = (x, y) => Math.asin(Math.max(-0.99, Math.min(0.99, x / R.robeR(y)))) * 180 / Math.PI;
          const Xc = deg => 512 + deg / 360 * 1024;
          // canvas position + horizontal/vertical px ratio for a FRONT-view point (x, y)
          const at = (x, y) => {
            const d = degAt(x, y), r = R.robeR(y), vpx = (Yr(y - 0.05) - Yr(y + 0.05)) / 0.1;
            const hpx = 1024 / (2 * Math.PI * r * Math.max(0.3, Math.cos(d * Math.PI / 180)));
            return [Xc(d), Yr(y), hpx / vpx, vpx];
          };
          D.fill(g, ROBE);
          // centre panel between the gold front edges (x = ±0.53 in front view)
          const TX = 0.53;
          g.fillStyle = PANEL; g.beginPath();
          for (let y = 0.4; y <= 2.5; y += 0.02) g.lineTo(Xc(-degAt(TX, y)), Yr(y));
          for (let y = 2.5; y >= 0.4; y -= 0.02) g.lineTo(Xc(degAt(TX, y)), Yr(y));
          g.closePath(); g.fill();
          // pale-blue cloud bank along the bottom of the panel
          g.save(); g.beginPath();
          for (let y = 0.4; y <= 1.0; y += 0.02) g.lineTo(Xc(-degAt(TX - 0.04, y)), Yr(y));
          for (let y = 1.0; y >= 0.4; y -= 0.02) g.lineTo(Xc(degAt(TX - 0.04, y)), Yr(y));
          g.closePath(); g.clip();
          {
            const [cx, cy, kx, vpx] = at(0, 0.5);
            cloudBank(g, Xc(-degAt(0.6, 0.5)), Xc(degAt(0.6, 0.5)), cy, 0.14 * vpx, kx * 1.0, '#A2AEBC', '#8894A4', '#DCE3EA');
          }
          g.restore();
          // white snowflake, blue wind swirl and snow dots on the lower panel
          { const [cx, cy, kx, vpx] = at(-0.28, 0.86); g.save(); g.translate(cx, cy); g.scale(kx, 1); flake(g, 0, 0, 0.12 * vpx, '#F4F6F8', 0.022 * vpx); g.restore(); }
          { const [cx, cy, kx, vpx] = at(0.16, 0.84); g.save(); g.translate(cx, cy); g.scale(kx, 1); lineCurl(g, 0, 0, 0.28 * vpx, '#D5DDE5', 0.028 * vpx); g.restore(); }
          [[-0.2, 1.22], [0.3, 1.3], [-0.36, 1.05], [0.3, 1.04], [-0.02, 1.1], [0.36, 0.64], [-0.4, 0.72], [0.1, 1.28]].forEach(([x, y]) => {
            const [cx, cy, kx, vpx] = at(x, y); g.fillStyle = '#F2F4F6'; g.beginPath(); g.ellipse(cx, cy, 0.02 * vpx * kx, 0.02 * vpx, 0, 0, Math.PI * 2); g.fill();
          });
          // chest: pale-blue swirl and a snow dot above it
          { const [cx, cy, kx, vpx] = at(0.05, 2.14); g.save(); g.translate(cx, cy); g.scale(kx, 1); windSwirl(g, 0, 0, 0.3 * vpx, -0.35, '#98A5B5', '#E4EAF0'); g.restore(); }
          { const [cx, cy, kx, vpx] = at(-0.2, 2.26); g.fillStyle = '#F2F4F6'; g.beginPath(); g.ellipse(cx, cy, 0.022 * vpx * kx, 0.022 * vpx, 0, 0, Math.PI * 2); g.fill(); }
          // back: big snowflake, wind swirls and a cloud bank along the hem
          {
            const vpx = (Yr(1.3) - Yr(1.4)) / 0.1, kx = (1024 / (2 * Math.PI * R.robeR(1.35))) / vpx;
            [0, w].forEach(x0 => { g.save(); g.translate(x0, Yr(1.3)); g.scale(kx, 1); flake(g, 0, 0, 0.2 * vpx, 'rgba(240,243,247,0.9)', 0.03 * vpx); g.restore(); });
            g.save(); g.translate(Xc(145), Yr(0.95)); g.scale(kx, 1); lineCurl(g, 0, 0, 0.3 * vpx, '#D5DDE5', 0.028 * vpx); g.restore();
            g.save(); g.translate(Xc(-140), Yr(1.9)); g.scale(-kx, 1); windSwirl(g, 0, 0, 0.28 * vpx, -0.2, '#98A5B5', '#E4EAF0'); g.restore();
            cloudBank(g, Xc(95), Xc(185), Yr(0.46), 0.1 * vpx, kx, '#A2AEBC', '#8894A4', '#DCE3EA');
            cloudBank(g, Xc(-185), Xc(-95), Yr(0.46), 0.1 * vpx, kx, '#A2AEBC', '#8894A4', '#DCE3EA');
          }
          // dark hem edge
          g.fillStyle = ROBE_INK; g.fillRect(0, h - 8, w, 8);
        }
      },
      collar: false,
      arms: {
        L: { hand: [-0.47, 2.07, 0.86], path: [[-0.72, 2.2, 0.25], [-0.68, 2.12, 0.55], [-0.58, 2.08, 0.74]], pawScale: 1.45, wrist: false },
        R: { hand: [0.48, 2.03, 0.86], path: [[0.72, 2.2, 0.25], [0.68, 2.08, 0.55], [0.59, 2.04, 0.74]], pawScale: 1.45, wrist: false }
      },
      sleeves: false,               // big bell sleeves are built in build()
      paws: { color: PAW, ink: INK },
      belt: { yT: 1.8, yB: 1.66, color: RED, line: false, knot: false, ink: RED_INK, tassel: false },
      legs: null,
      feet: false,
      tail: {
        pts: [[0.45, 0.72, -0.85], [1.05, 0.6, -0.82], [1.45, 0.78, -0.72], [1.6, 1.18, -0.62], [1.5, 1.5, -0.64], [1.28, 1.6, -0.72], [1.1, 1.5, -0.82]],
        r: 0.31, color: '#4A4445', deep: FUR_DK, tip: '#4A4445', bands: 0, bandAlpha: 0, ink: INK,
        shape: t => (0.72 + 0.28 * Math.sin(Math.PI * Math.min(1, t * 1.3))) * (t > 0.82 ? Math.pow(Math.cos((t - 0.82) / 0.18 * Math.PI / 2), 0.6) : 1) * (0.55 + 0.45 * sst(0, 0.18, t)),
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, '#454041'); lg.addColorStop(0.5, '#514B4B'); lg.addColorStop(1, '#4A4445');
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.strokeStyle = 'rgba(40,35,36,0.18)'; g.lineWidth = 6;
          for (let i = 0; i < 30; i++) { const x = (i / 30) * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 30, h); g.stroke(); }
        },
        fur: { layers: 18, length: 0.13, gravity: 0.03, repeat: [16, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, lathe, ribbon, D } = K;
      const gold = std(GOLD, { roughness: 0.45, metalness: 0.15 });
      const goldDk = std(GOLD_DK, { roughness: 0.5, metalness: 0.1 });
      const redM = std(RED, { roughness: 0.7 });

      /* ======================= face details ======================= */
      // amber-gold eyes: big dark pupil pushed toward the upper-inner side, gold crescent thicker at the lower-outer side
      K.eyes.forEach((eg, i) => {
        const sx = i === 0 ? -1 : 1, inward = -sx;
        const tex = canvasTex(256, 256, (g) => {
          g.fillStyle = '#6E4F2A'; g.fillRect(0, 0, 256, 256);
          const rg = g.createRadialGradient(128 - inward * 8, 140, 30, 128, 128, 128);
          rg.addColorStop(0, '#F5D48E'); rg.addColorStop(0.8, IRIS); rg.addColorStop(1, '#B98A45');
          g.fillStyle = rg; g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2); g.fill();
          g.fillStyle = EYE; g.beginPath(); g.arc(128 + inward * 9, 120, 103, 0, Math.PI * 2); g.fill();
          const pg = g.createRadialGradient(128 + inward * 9, 150, 10, 128 + inward * 9, 120, 103);
          pg.addColorStop(0, 'rgba(90,60,40,0.55)'); pg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = pg; g.beginPath(); g.arc(128 + inward * 9, 120, 103, 0, Math.PI * 2); g.fill();
        });
        eg.traverse(o => {
          if (!o.isMesh) return;
          if (o.geometry.type === 'CircleGeometry') { o.material = texMat(tex, { roughness: 0.3 }); }
          if (o.material === K.M.shine) o.position.x = Math.abs(o.position.x) * (o.position.y > 0 ? inward : -inward);
        });
      });
      // tiny dark lash flick at the upper-outer corner of each eye
      {
        const lm = std('#1F1819', { roughness: 0.6 });
        const onH = (x, y) => K.onSkin(x, y, [K.headMesh]).p.add(V(0, 0, 0.012));
        [-1, 1].forEach(sx => mesh(tube([onH(0.445 * sx, HY + 0.045), onH(0.47 * sx, HY + 0.06), onH(0.49 * sx, HY + 0.083)], t => 0.009 * (1 - 0.7 * t), 10, 6), lm, K.faceG));
      }

      /* ======================= fist creases & tail fur locks ======================= */
      {
        const cm = std('#2E2829', { roughness: 0.8 });
        ['L', 'R'].forEach(k => {
          const p = K.hands[k].p;
          [-0.05, 0.05].forEach(dx => mesh(tube([[p.x + dx, p.y + 0.02, p.z + 0.16], [p.x + dx * 1.1, p.y - 0.04, p.z + 0.162], [p.x + dx * 1.15, p.y - 0.1, p.z + 0.135]], 0.007, 8, 5), cm, K.poseG));
        });
        // white fur tufts filling the lower inner ear
        const tm = std(EAR_TUFT, { roughness: 0.95 });
        K.ears.forEach(({ g, sx }) => {
          [[-0.08, 0.1, 0.11, 0.05, -0.8], [-0.02, 0.08, 0.15, 0.055, -0.4], [0.04, 0.09, 0.14, 0.055, -0.05], [0.09, 0.11, 0.1, 0.045, 0.3]].forEach(([x, y, len, r0, ang]) => {
            const a = V(x * sx, y, 0.085), d = V(Math.sin(ang) * sx, Math.cos(ang), 0.3).normalize();
            const c = a.clone().addScaledVector(d, len), b = a.clone().lerp(c, 0.5).add(V(0.015 * sx, 0, 0.01));
            mesh(tube([a, b, c], q => r0 * (1 - Math.pow(q, 1.6)) + 0.006, 12, 8), tm, g);
          });
        });
        // spiky locks along the outside of the tail (the picture's tail is a fluffy, jagged S-curl)
        const T = K.cfg.tail, base = V(T.pts[0][0], T.pts[0][1], T.pts[0][2]);
        const cv = new THREE.CatmullRomCurve3(T.pts.map(q => V(q[0], q[1], q[2]).sub(base)));
        const ctr = V(1.3, 1.1, -0.72).sub(base);
        const lm = std('#4A4445', { roughness: 0.95 });
        for (let i = 0; i < 26; i++) {
          const t = 0.18 + 0.8 * i / 25, p = cv.getPointAt(t), tg = cv.getTangentAt(t);
          const out = p.clone().sub(ctr); out.z = 0; out.normalize();
          const rr = T.r * T.shape(t);
          const root = p.clone().addScaledVector(out, rr * 0.7).add(V(0, 0, (i % 3 - 1) * 0.1));
          const tip = root.clone().addScaledVector(out, 0.13 + 0.05 * (i % 2)).addScaledVector(tg, 0.12);
          const m = mesh(tube([root, root.clone().lerp(tip, 0.5).addScaledVector(out, 0.02), tip], q => 0.075 * (1 - q) + 0.004, 10, 8), lm, K.tailG, null, null, INK);
        }
      }

      /* ======================= 烏紗帽 (official hat) ======================= */
      const hat = part('hat', K.head);
      {
        const hatM = std(HAT, { roughness: 0.8 }), domeM = std(HAT_DOME, { roughness: 0.8 });
        // tall back plate: wider at the top, rounded top corners, with a gold centre stripe
        const bp = [];
        const addArc = (cx, cy, r, a0, a1) => { for (let i = 0; i <= 8; i++) { const a = lerp(a0, a1, i / 8); bp.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
        bp.push([-0.54, 3.98]); bp.push([0.54, 3.98]);
        addArc(0.45, 4.69, 0.18, 0, Math.PI / 2); addArc(-0.45, 4.69, 0.18, Math.PI / 2, Math.PI);
        const plate = mesh(extrude(bp.map(([x, y]) => [x * (0.9 + 0.1 * sst(4.0, 4.8, y)), y]), 0.36, 0.035), hatM, hat, [0, 0, -0.33], null, HAT_INK);
        mesh(K.roundBox(0.06, 0.34, 0.03, 0.02, 0.008), gold, hat, [0, 4.68, -0.33 + 0.185], null, GOLD_INK);
        // rounded front crown (dome)
        const domeProf = [[0.56, 3.93], [0.56, 4.06], [0.54, 4.2], [0.5, 4.32], [0.43, 4.43], [0.31, 4.5], [0.16, 4.535], [0.0, 4.545]];
        const dome = mesh(lathe(domeProf, 64, 0, Math.PI * 2, 40).geo, domeM, hat, [0, 0, 0.0], [1, 1, 0.9], HAT_INK);
        // gold rim band
        mesh(new THREE.CylinderGeometry(0.578, 0.572, 0.085, 72, 1, true), std(GOLD, { roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide }), hat, [0, 3.975, 0], [1, 1, 0.9], GOLD_INK);
        // two gold arches over the dome front, ending at the medallion
        const onDome = (x, y) => { const s = K.onSkin(x, y, [dome]); return s.p ? s.p.clone().add(V(0, 0, 0.012)) : V(x, y, 0.45); };
        [-1, 1].forEach(sx => {
          const pts = [[0.42, 4.0], [0.4, 4.16], [0.35, 4.33], [0.27, 4.42], [0.2, 4.4], [0.15, 4.33]].map(([x, y]) => onDome(x * sx, y));
          mesh(tube(pts, 0.017, 40, 8), gold, hat, null, null, GOLD_INK);
        });
        // plum-blossom medallion: gold five-lobed rim, cream face, red plum flower
        {
          const lobe = (R, n) => { const pts = []; for (let i = 0; i < 90; i++) { const a = i / 90 * Math.PI * 2; const r = R * (0.8 + 0.2 * Math.pow(Math.abs(Math.cos(a * n / 2)), 0.6)); pts.push([Math.sin(a) * r, Math.cos(a) * r]); } return pts; };
          const md = group(hat, [0, 4.27, onDome(0, 4.27).z + 0.005]);
          mesh(extrude(lobe(0.155, 5), 0.045, 0.012), gold, md, null, null, GOLD_INK);
          const face = new THREE.ShapeGeometry(K.shapeFrom(lobe(0.122, 5)), 24);
          const ftex = canvasTex(256, 256, (g) => {
            g.fillStyle = '#FCF6EB'; g.fillRect(0, 0, 256, 256);
            blossom(g, 128, 128, 120, PLUM, '#F7D58A', 0);
            g.fillStyle = '#A83F37'; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.6; g.beginPath(); g.arc(128 + Math.sin(a) * 20, 128 - Math.cos(a) * 20, 4, 0, Math.PI * 2); g.fill(); }
          });
          ftex.repeat.set(1 / 0.244, 1 / 0.244); ftex.offset.set(0.5, 0.5);
          const f = mesh(face, texMat(ftex, { roughness: 0.6 }), md, [0, 0, 0.024]); f.castShadow = false;
        }
        // side rod with gold ruyi-cloud finials
        const rod = mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.5, 12), gold, hat, [0, 4.3, -0.04], null, GOLD_INK); rod.rotation.z = Math.PI / 2;
        const cloudShape = (() => { // three-lobed ruyi head
          const s = new THREE.Shape();
          s.moveTo(0, -0.1);
          s.bezierCurveTo(-0.06, -0.1, -0.1, -0.09, -0.12, -0.05);
          s.absarc(-0.1, 0.0, 0.06, -Math.PI * 0.6, Math.PI * 0.62, false);
          s.absarc(0.0, 0.05, 0.075, Math.PI * 0.95, Math.PI * 0.05, true);
          s.absarc(0.1, 0.0, 0.06, Math.PI * 0.38, -Math.PI * 0.4, true);
          s.bezierCurveTo(0.1, -0.09, 0.06, -0.1, 0, -0.1);
          return s;
        })();
        const cloudGeo = extrude(cloudShape, 0.06, 0.018, 3, 16);
        [-1, 1].forEach(sx => {
          const fg = group(hat, [0.8 * sx, 4.27, -0.03]);
          fg.scale.set(1.0, 1.0, 1);
          mesh(cloudGeo, gold, fg, null, null, GOLD_INK);
          // engraved spiral on the finial face
          const sp = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI * 3.2, r = 0.05 * (1 - i / 36); sp.push([Math.cos(a) * r * sx + 0.005 * sx, Math.sin(a) * r + 0.01, 0.052]); }
          mesh(tube(sp, 0.007, 40, 5), std('#C99A5B', { roughness: 0.5 }), fg);
        });
        // red cords from the finials, round behind the ears, to the tassels beside the cheeks
        const cordM = std(RED_DK, { roughness: 0.7 });
        [-1, 1].forEach(sx => {
          mesh(tube([[0.8 * sx, 4.2, -0.08], [1.0 * sx, 3.98, -0.2], [1.13 * sx, 3.75, -0.12], [1.15 * sx, 3.56, -0.02]], 0.011, 30, 6), cordM, hat);
          mesh(sphere(0.038, 16, 12), redM, hat, [1.15 * sx, 3.53, 0.0], [1, 1.2, 1], RED_INK);
          mesh(sphere(0.036, 16, 12), gold, hat, [1.15 * sx, 3.44, 0.0], null, GOLD_INK);
          const t = K.tassel(hat, [1.15 * sx, 3.37, 0.0], RED, 0.26, 0.05, RED_INK);
          t.userData.sx = sx; hat.userData['tassel' + sx] = t;
        });
        K.onTick((t, k) => [-1, 1].forEach(sx => { const tg = hat.userData['tassel' + sx]; tg.rotation.z = 0.06 * Math.sin(t * 1.4 + sx) * k; }));
      }

      /* ======================= fluffy white fur collar ======================= */
      const fcG = part('furCollar', K.body);
      {
        // two fluffy lobes over the shoulders, open at the front where the blue cross collar shows
        const A0 = 13 * Math.PI / 180, ring = [];
        const at = a => { const front = Math.pow(Math.max(0, Math.cos(a)), 2); return V(Math.sin(a) * 0.73, 2.66 - 0.2 * front, Math.cos(a) * 0.57); };
        for (let i = 0; i <= 60; i++) ring.push(at(lerp(A0, Math.PI * 2 - A0, i / 60)));
        const rEnd = 0.085, rf = t => 0.175 * (0.5 + 0.5 * sst(0, 0.16, t) * sst(1, 0.84, t));
        const cm = std(FURC, { roughness: 0.95 });
        const fc = mesh(tube(ring, rf, 160, 20, false), cm, fcG, null, null, FURC_INK);
        K.addFur(fc, { layers: 16, length: 0.08, gravity: 0.03, repeat: [18, 3] });
        [ring[0], ring[ring.length - 1]].forEach(p => { const c = mesh(sphere(rEnd, 20, 14), cm, fcG, p, null, FURC_INK); K.addFur(c, { layers: 12, length: 0.06, gravity: 0.03, repeat: [3, 2] }); });
      }

      /* ======================= V collar + gold front edges ======================= */
      {
        const blueM = std(BLUE_LT, { roughness: 0.8, side: THREE.DoubleSide });
        [-1, 1].forEach(sx => {
          const pts = [K.onRobe(42 * sx, 2.52, 0.03), K.onRobe(22 * sx, 2.45, 0.03), K.onRobe(5 * sx, 2.36, 0.03)];
          mesh(ribbon(pts, 0.12, { face: [0, 0.3, 1] }), blueM, K.robeG, null, null, BLUE_INK);
          const pts2 = [K.onRobe(32 * sx, 2.5, 0.045), K.onRobe(16 * sx, 2.43, 0.045), K.onRobe(3 * sx, 2.36, 0.045)];
          mesh(ribbon(pts2, 0.04, { face: [0, 0.3, 1] }), std(GOLD, { roughness: 0.6, side: THREE.DoubleSide }), K.robeG);
        });
        // gold front edges running from the collar to the hem at x = ±0.53
        const gm = std(GOLD, { roughness: 0.55, side: THREE.DoubleSide });
        [-1, 1].forEach(sx => {
          const pts = [];
          for (let y = 0.43; y <= 2.36; y += 0.08) { const r = K.robeR(y) + 0.012, x = Math.min(0.53, r * 0.97); pts.push(V(x * sx, y, Math.sqrt(Math.max(r * r - x * x, 0)))); }
          mesh(ribbon(pts, 0.075, { face: [0, 0, 1], segs: 80 }), gm, K.robeG, null, null, GOLD_INK);
        });
        // gold band along the bottom of the centre panel
        const hb = []; for (let x = -0.53; x <= 0.531; x += 0.05) { const r = K.robeR(0.46) + 0.012; hb.push(V(x, 0.465, Math.sqrt(r * r - x * x))); }
        mesh(ribbon(hb, 0.06, { face: [0, 0, 1] }), gm, K.robeG, null, null, GOLD_INK);
      }

      /* ======================= black shoulder cape (披肩) with snowflakes ======================= */
      {
        const gap = 34 * Math.PI / 180, zs = 0.86;
        const prof = [[1.2, 2.02], [1.17, 2.1], [1.06, 2.22], [0.9, 2.34], [0.72, 2.44], [0.52, 2.53]];
        const tex = canvasTex(1024, 512, (g, w, h) => {
          D.fill(g, YOKE);
          g.fillStyle = GOLD; g.fillRect(0, h - 44, w, 34); g.fillStyle = GOLD_INK; g.fillRect(0, h - 12, w, 12); g.fillRect(0, h - 47, w, 4);
          g.fillStyle = GOLD; g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h);
          // snowflakes + dots (u = 0.5 is the back; the front sides are near u = 0.1 / 0.9)
          [[0.05, 0.66, 32, 0.42], [0.95, 0.66, 32, 0.42], [0.33, 0.55, 40, 0.55], [0.67, 0.55, 40, 0.55], [0.5, 0.55, 44, 0.55]].forEach(([u, v, s, k]) => { g.save(); g.translate(u * w, v * h); g.scale(k, 1); flake(g, 0, 0, s * 1.6, '#F4F6F8', 7); g.restore(); });
          [[0.03, 0.45], [0.1, 0.78], [0.97, 0.45], [0.9, 0.78], [0.25, 0.3], [0.75, 0.3]].forEach(([u, v]) => { g.fillStyle = '#F2F4F6'; g.beginPath(); g.arc(u * w, v * h, 7, 0, Math.PI * 2); g.fill(); });
        });
        const cl = lathe(prof, 96, gap, Math.PI * 2 - gap * 2, 28);
        // the outer corners over the shoulders droop a little lower than the front and back
        const droop = (a, y) => 0.08 * Math.pow(Math.sin(a), 2) * Math.pow(1 - Math.min(1, Math.max(0, (y - 2.02) / 0.32)), 2);
        { const pa = cl.geo.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); pa.setY(i, y - droop(Math.atan2(x, z), y)); } K.smoothNormals(cl.geo); }
        const ym = mesh(cl.geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.85 }), K.robeG, null, [1, 1, zs], ROBE_INK);
        const edge = [];
        for (let i = 0; i <= 64; i++) { const a = gap + (Math.PI * 2 - gap * 2) * i / 64; edge.push(V(Math.sin(a) * 1.205, 2.02 - droop(a, 2.02), Math.cos(a) * 1.205 * zs)); }
        mesh(tube(edge, 0.02, 160, 8), std(GOLD_DK, { roughness: 0.6 }), K.robeG);
      }

      /* ======================= big bell sleeves ======================= */
      // front-view outline of the IMAGE-RIGHT sleeve (mirrored for the left one)
      const xIn = tab([[0.5, 0.8], [0.8, 0.76], [1.2, 0.72], [1.6, 0.69], [2.0, 0.66], [2.4, 0.6]]);
      const xOut = tab([[0.5, 1.42], [0.95, 1.48], [1.2, 1.43], [1.6, 1.33], [2.0, 1.2], [2.2, 1.1], [2.4, 0.95]]);
      const zF = tab([[0.5, 0.72], [1.0, 0.72], [1.5, 0.66], [2.0, 0.5], [2.3, 0.35]]);
      const zB = tab([[0.5, -0.52], [1.0, -0.52], [1.5, -0.5], [2.0, -0.42], [2.3, -0.25]]);
      const YS = 1.95, YTOP = 2.28, SY0 = 0.45, SY1 = 2.3;
      const yBot = phi => 0.67 + 0.17 * Math.cos(phi) - 0.03 * Math.sin(phi);
      const ringPt = (phi, y, o) => {
        const w = (o && o.w) || 1;
        const k = y > YS ? Math.sqrt(Math.max(0, 1 - Math.pow((y - YS) / (YTOP - YS), 2))) : 1;
        const xi = xIn(y), xo = xOut(y), xc = (xi + xo) / 2, ax = (xo - xi) / 2 * w;
        const zc = (zF(y) + zB(y)) / 2, az = (zF(y) - zB(y)) / 2 * w;
        return [xc + ax * k * spow(Math.cos(phi), 0.72), zc + az * k * spow(Math.sin(phi), 0.72)];
      };
      const bellGeo = (sx, o) => {
        const NA = 110, NV = 64, pos = [], uv = [], idx = [];
        for (let j = 0; j <= NV; j++) {
          const v = j / NV;
          for (let i = 0; i <= NA; i++) {
            const phi = i / NA * Math.PI * 2;
            const yb = yBot(phi) - ((o && o.dB) || 0), y = lerp(yb, YTOP, Math.pow(v, 0.9));
            const [x, z] = ringPt(phi, y, o);
            pos.push(x * sx, y, z); uv.push(i / NA, (y - SY0) / (SY1 - SY0));
          }
        }
        for (let j = 0; j < NV; j++) for (let i = 0; i < NA; i++) {
          const a0 = j * (NA + 1) + i, b0 = a0 + NA + 1;
          if (sx > 0) idx.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0); else idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const kk = Math.floor(NV / 2) * (NA + 1);
        const nv = V().fromBufferAttribute(geo.attributes.normal, kk);
        if (nv.x * sx < 0) { for (let q = 0; q < idx.length; q += 3) { const tt = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tt; } geo.setIndex(idx); K.smoothNormals(geo); }
        const hem = []; for (let i = 0; i < NA; i++) hem.push(V(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
        return { geo, hem };
      };
      // canvas helpers for the sleeve map: u = phi / 2π (0 = outer side, 0.25 = front, 0.5 = inner side), v = height
      const SW = 2048, SH = 1024;
      const sRow = y => (1 - (y - SY0) / (SY1 - SY0)) * SH, sCol = phi => phi / (Math.PI * 2) * SW;
      const phiAtX = (x, y) => { // front-half phi whose front-view x equals x (image-right sleeve coords)
        let best = Math.PI / 2, bd = 1e9;
        for (let i = 0; i <= 200; i++) { const p = i / 200 * Math.PI; const d = Math.abs(ringPt(p, y)[0] - x); if (d < bd) { bd = d; best = p; } }
        return best;
      };
      const sAt = (x, y) => { // canvas pos + x-stretch so a motif reads round from the front
        const p = phiAtX(x, y), dx = Math.abs(ringPt(p + 0.01, y)[0] - ringPt(p - 0.01, y)[0]) / 0.02;
        const hpx = (SW / (Math.PI * 2)) / Math.max(dx, 0.05), vpx = SH / (SY1 - SY0);
        return [sCol(p), sRow(y), Math.min(hpx / vpx, 3), vpx];
      };
      const SLEEVE = '#EEE5D7';   // #FAF3E8 in the picture; the front light would blow it out to pure white
      const sleevePaint = (side) => (g, w, h) => {
        D.fill(g, SLEEVE);
        // soft fold shading on the outer side and back
        const sh = g.createLinearGradient(0, 0, w, 0);
        sh.addColorStop(0, 'rgba(210,195,175,0.35)'); sh.addColorStop(0.18, 'rgba(210,195,175,0)'); sh.addColorStop(0.62, 'rgba(210,195,175,0)'); sh.addColorStop(0.8, 'rgba(200,185,165,0.3)'); sh.addColorStop(1, 'rgba(210,195,175,0.35)');
        g.fillStyle = sh; g.fillRect(0, 0, w, h);
        // opening on the front-inner side: gold edge + pale-blue lining
        const band = [];
        for (let y = SY1; y >= SY0 - 0.05; y -= 0.02) { const yy = Math.max(y, 0.5); band.push([sCol(phiAtX(lerp(0.99, 1.02, sst(1.8, 0.8, yy)), yy)), sCol(phiAtX(0.74, yy)), sRow(y)]); }
        g.fillStyle = BLUE; g.beginPath(); band.forEach(([a, b, r], i) => i ? g.lineTo(a, r) : g.moveTo(a, r)); band.slice().reverse().forEach(([a, b, r]) => g.lineTo(b + 40, r)); g.closePath(); g.fill();
        g.fillStyle = '#95A1B0'; band.forEach(([a, b, r]) => g.fillRect(a, r, 10, 12));
        g.fillStyle = GOLD; band.forEach(([a, b, r]) => g.fillRect(a - 26, r, 26, 12));
        g.fillStyle = GOLD_INK; band.forEach(([a, b, r]) => g.fillRect(a - 30, r, 4, 12));
        // plum branch on the upper front
        { const [cx, cy, kx, vpx] = sAt(1.08, side < 0 ? 1.68 : 1.5); g.save(); g.translate(cx, cy); g.scale(kx, 1); plumSprig(g, 0, 0, 0.62 * vpx, side < 0 ? 0.35 : 0.2, side < 0); g.restore(); }
        // lower front: pine sprig + waves (image-left) / waves + little snowflakes (image-right)
        if (side < 0) {
          const [cx, cy, kx, vpx] = sAt(1.28, 0.92); g.save(); g.translate(cx, cy); g.scale(kx, 1); pineSprig(g, -0.2 * vpx, 0.12 * vpx, 0.55 * vpx, -0.35); g.restore();
        } else {
          [[1.05, 1.22, 0.05], [1.15, 1.12, 0.035]].forEach(([x, y, s]) => { const [cx, cy, kx, vpx] = sAt(x, y); g.save(); g.translate(cx, cy); g.scale(kx, 1); flake(g, 0, 0, s * vpx, '#9FB3CB', 0.012 * vpx); g.restore(); });
        }
        // wave mounds (海浪) along the hem, all the way round (two rows on the image-right sleeve)
        {
          const vpx = SH / (SY1 - SY0), rows = side < 0 ? 1 : 2;
          for (let row = rows - 1; row >= 0; row--) {
            for (let x = -40 + (row ? 55 : 0); x <= w + 60; x += 110) {
              const phi = x / w * Math.PI * 2, yb = yBot(phi) + 0.07 + row * 0.1, cy = sRow(yb);
              g.fillStyle = row ? '#B7C2CF' : '#CBD4DE'; g.beginPath(); g.ellipse(x, cy, 62, 0.09 * vpx, 0, Math.PI, 0); g.fill();
              g.strokeStyle = '#F4F7FA'; g.lineWidth = 6; g.beginPath(); g.ellipse(x, cy, 40, 0.06 * vpx, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
              g.strokeStyle = '#8E9CAE'; g.lineWidth = 4; g.beginPath(); g.ellipse(x, cy, 62, 0.09 * vpx, 0, Math.PI, 0); g.stroke();
            }
          }
        }
        // gold hem band following the slanted bottom edge
        for (let x = 0; x < w; x += 2) {
          const phi = x / w * Math.PI * 2, yb = yBot(phi);
          g.fillStyle = GOLD; g.fillRect(x, sRow(yb + 0.08), 3, sRow(yb - 0.05) - sRow(yb + 0.08));
          g.fillStyle = GOLD_INK; g.fillRect(x, sRow(yb + 0.08) - 4, 3, 4);
        }
      };
      const sleevesG = part('sleeves', K.body);
      const bells = [];
      [-1, 1].forEach(sx => {
        const tex = canvasTex(SW, SH, sleevePaint(sx));
        const b = bellGeo(sx, {});
        const bm = mesh(b.geo, texMat(tex, { roughness: 0.9 }), sleevesG, null, null, CREAM_INK);
        const lin = new THREE.Mesh(b.geo, std(BLUE, { side: THREE.BackSide, roughness: 0.9 })); lin.receiveShadow = true; sleevesG.add(lin);
        mesh(tube(b.hem, 0.014, 200, 6, true), std(GOLD_DK, { roughness: 0.6 }), sleevesG);
        bells.push(bm);
        // short cuff carrying the forearm from the bell to the paw, lined in pale blue
        const H = K.hands[sx < 0 ? 'L' : 'R'].p;
        const c0 = V(0.76 * sx, 2.08, 0.25), c1 = V(H.x + 0.08 * sx, H.y + 0.0, H.z - 0.11);
        const cuff = mesh(tube([c0, c0.clone().lerp(c1, 0.5).add(V(0.03 * sx, 0.01, 0)), c1], t => 0.13 + 0.02 * t, 24, 24), std(SLEEVE, { roughness: 0.9 }), sleevesG, null, null, CREAM_INK);
        const dir = c1.clone().sub(c0).normalize();
        const ringG = group(sleevesG, c1.clone().add(V(0.02 * sx, -0.01, 0))); ringG.quaternion.setFromUnitVectors(V(0, 0, 1), dir);
        mesh(new THREE.TorusGeometry(0.145, 0.026, 10, 40), std(BLUE, { roughness: 0.8 }), ringG, null, null, BLUE_INK);
        mesh(new THREE.CircleGeometry(0.145, 32), std('#2E2A2C', { roughness: 1 }), ringG, [0, 0, -0.01]);
        cuff.userData.sx = sx;
      });

      /* ======================= red sash bow, gold medallion, pearls & tassels ======================= */
      {
        const bG = K.beltG, zf = y => K.robeR(y) + 0.04;
        const yK = 1.73;
        // bow: two flattened loops, a knot, two short tails
        [-1, 1].forEach(sx => {
          const l = mesh(new THREE.TorusGeometry(0.075, 0.028, 12, 32), redM, bG, [0.1 * sx, yK + 0.005, zf(yK) + 0.03], [1.25, 0.62, 1], RED_INK);
          l.rotation.y = sx * 0.3;
          mesh(ribbon([[0.02 * sx, yK - 0.02, zf(yK) + 0.05], [0.09 * sx, yK - 0.08, zf(yK - 0.08) + 0.05], [0.15 * sx, yK - 0.13, zf(yK - 0.13) + 0.04]], 0.06), std(RED, { roughness: 0.7, side: THREE.DoubleSide }), bG, null, null, RED_INK);
        });
        mesh(sphere(0.042, 20, 14), redM, bG, [0, yK, zf(yK) + 0.05], [1.1, 1, 0.8], RED_INK);
        // gold bead, snowflake medallion, two pearls, two red tassels
        mesh(tube([[0, yK - 0.03, zf(yK) + 0.05], [0, 1.5, zf(1.5) + 0.05]], 0.009, 6, 6), goldDk, bG);
        mesh(sphere(0.04, 16, 12), gold, bG, [0, 1.6, zf(1.6) + 0.055], null, GOLD_INK);
        const md = K.medal(bG, [0, 1.45, zf(1.45) + 0.06], 0.12, (g) => { g.strokeStyle = '#E2B878'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.stroke(); flake(g, 128, 128, 72, '#FFFFFF', 12); }, GOLD, GOLD_INK, '#F2C98F');
        md.rotation.x = -0.12;
        const tassels = [];
        [-1, 1].forEach(sx => {
          mesh(tube([[0.02 * sx, 1.34, zf(1.34) + 0.06], [0.06 * sx, 1.26, zf(1.26) + 0.07]], 0.008, 6, 6), redM, bG);
          mesh(sphere(0.038, 16, 12), std('#F7EFE2', { roughness: 0.35 }), bG, [0.06 * sx, 1.24, zf(1.24) + 0.075], null, '#B9A48D');
          const t = K.tassel(bG, [0.06 * sx, 1.18, zf(1.18) + 0.075], RED, 0.2, 0.045, RED_INK);
          t.rotation.x = -0.1; tassels.push(t);
        });
        K.onTick((t, k) => tassels.forEach((tg, i) => { tg.rotation.z = 0.05 * Math.sin(t * 1.5 + i) * k; }));
      }

      /* ======================= the iron chain (鎖鏈) ======================= */
      const chainG = part('chain', K.body);
      {
        const HL = K.hands.L.p, HR = K.hands.R.p;
        const Lk = 0.21, Wk = 0.12, rk = 0.021, a = (Lk - 2 * rk) / 2, b = (Wk - 2 * rk) / 2;
        const lp = [];
        for (let i = 0; i <= 12; i++) { const t = i / 12 * Math.PI; lp.push([Math.cos(t) * b, (a - b) + Math.sin(t) * b, 0]); }
        for (let i = 0; i <= 12; i++) { const t = Math.PI + i / 12 * Math.PI; lp.push([Math.cos(t) * b, -(a - b) + Math.sin(t) * b, 0]); }
        lp.pop();
        const linkGeo = tube(lp, rk, 64, 8, true);
        const cm = std('#9B9695', { roughness: 0.42, metalness: 0.1 });
        const pitch = Lk - 4 * rk + 0.004;
        const placeLinks = (pts, parent, phase) => {
          const cv = new THREE.CatmullRomCurve3(pts.map(p => V(p[0], p[1], p[2])));
          const n = Math.max(2, Math.round(cv.getLength() / pitch));
          for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n, p = cv.getPointAt(t), T = cv.getTangentAt(t).normalize();
            let N = V(0, 0, 1).addScaledVector(T, -T.z); if (N.lengthSq() < 1e-4) N = V(1, 0, 0).addScaledVector(T, -T.x); N.normalize();
            const B = T.clone().cross(N).normalize();
            const face = (i + phase) % 2 === 0;
            const xA = face ? B : N, zA = face ? N : B.clone().negate();
            const m = mesh(linkGeo, cm, parent, p, null, CHAIN_INK);
            m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, T, zA));
          }
          return cv;
        };
        // sagging span: over the top of the image-left fist, across the chest, into the image-right fist
        placeLinks([[HL.x - 0.02, HL.y + 0.02, HL.z - 0.12], [HL.x + 0.02, HL.y + 0.19, HL.z + 0.02], [HL.x + 0.15, HL.y + 0.12, HL.z + 0.12], [HL.x + 0.27, HL.y - 0.08, HL.z + 0.13],
          [-0.1, 1.83, 0.96], [0.06, 1.77, 0.95], [0.22, 1.82, 0.96], [HR.x - 0.1, HR.y - 0.08, HR.z + 0.1], [HR.x + 0.02, HR.y + 0.02, HR.z + 0.02]], chainG, 0);
        // hanging ends pivot at the paws so they can swing
        const hangL = group(chainG, [HL.x, HL.y - 0.05, HL.z]), hangR = group(chainG, [HR.x, HR.y - 0.05, HR.z]);
        const rel = (G, pts) => pts.map(([x, y, z]) => [x - G.position.x, y - G.position.y, z - G.position.z]);
        placeLinks(rel(hangL, [[HL.x - 0.01, HL.y - 0.02, HL.z], [HL.x + 0.01, HL.y - 0.3, HL.z + 0.0], [HL.x + 0.02, 1.62, 0.88], [HL.x + 0.03, 1.38, 0.9]]), hangL, 1);
        placeLinks(rel(hangR, [[HR.x + 0.01, HR.y - 0.02, HR.z], [HR.x + 0.02, HR.y - 0.35, HR.z - 0.01], [HR.x - 0.0, 1.45, 0.86], [HR.x - 0.02, 1.1, 0.87]]), hangR, 1);
        // pendant on the image-left end: red cord, gold bead, gold ruyi plaque, gold bead, long red tassel
        {
          const pg = group(hangL, rel(hangL, [[HL.x + 0.03, 1.3, 0.92]])[0]);
          mesh(tube([[0, 0.05, 0], [0, -0.03, 0.01]], 0.01, 6, 6), redM, pg);
          mesh(sphere(0.04, 16, 12), gold, pg, [0, -0.04, 0.02], null, GOLD_INK);
          const qShape = []; for (let i = 0; i < 96; i++) { const t = i / 96 * Math.PI * 2; const r = 0.095 * (0.78 + 0.22 * Math.pow(Math.abs(Math.cos(2 * t)), 0.5)); qShape.push([Math.sin(t) * r, Math.cos(t) * r]); }
          const q = mesh(extrude(qShape, 0.04, 0.012), gold, pg, [0, -0.18, 0.04], null, GOLD_INK);
          const sp = []; for (let i = 0; i <= 26; i++) { const a2 = i / 26 * Math.PI * 3, r = 0.045 * (1 - i / 32); sp.push([Math.cos(a2) * r, Math.sin(a2) * r - 0.18, 0.066]); }
          mesh(tube(sp, 0.006, 40, 5), std('#C99A5B', { roughness: 0.5 }), pg);
          mesh(sphere(0.036, 16, 12), gold, pg, [0, -0.33, 0.05], null, GOLD_INK);
          const tt = K.tassel(pg, [0, -0.39, 0.06], RED, 0.3, 0.055, RED_INK);
          tt.rotation.x = -0.12;
        }
        chainG.userData.hang = [hangL, hangR];
        K.onTick((t, k) => { hangL.rotation.z = 0.03 * Math.sin(t * 1.3) * k; hangR.rotation.z = 0.03 * Math.sin(t * 1.3 + 1.2) * k; });
        K._chain = chainG;
      }

      /* ======================= cream trouser cuffs & black cloud-toe shoes ======================= */
      const shoesG = part('shoes', K.body);
      {
        const sm = std(SHOE, { roughness: 0.75 }), solem = std(SOLE, { roughness: 0.8 }), pm = std(CREAM, { roughness: 0.9 });
        [-1, 1].forEach(sx => {
          mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.2, 32, 1, true), std(CREAM, { roughness: 0.9, side: THREE.DoubleSide }), shoesG, [0.52 * sx, 0.42, 0.28], [1, 1, 0.9], CREAM_INK);
          const shoe = mesh(sphere(0.3, 40, 28), sm, shoesG, [0.54 * sx, 0.2, 0.42], [1.07, 0.62, 1.32], INK);
          mesh(new THREE.CylinderGeometry(0.31, 0.3, 0.07, 40), solem, shoesG, [0.54 * sx, 0.035, 0.42], [1.07, 1, 1.32], SOLE_INK);
          // gold double-curl (雲頭) motif on the toe
          const curl = [];
          for (let i = 0; i <= 14; i++) { const a2 = Math.PI * 1.1 - i / 14 * Math.PI * 1.7, r = 0.045 * (1 - i / 22); curl.push([-0.07 + Math.cos(a2) * r, 0.03 + Math.sin(a2) * r]); }
          curl.reverse();
          curl.push([-0.02, -0.02], [0.03, -0.02]);
          for (let i = 0; i <= 14; i++) { const a2 = -Math.PI * 0.1 + i / 14 * Math.PI * 1.7, r = 0.045 * (1 - i / 22); curl.push([0.07 + Math.cos(a2 + Math.PI) * -r, 0.03 + Math.sin(a2 + Math.PI) * -r]); }
          const cx = 0.54 * sx + 0.04 * sx, cy = 0.2;
          const pts = curl.map(([u, v]) => { const s = K.onSkin(cx + u, cy + v, [shoe]); return s.p ? s.p.clone().addScaledVector(s.n, 0.008) : null; }).filter(Boolean);
          if (pts.length > 4) mesh(tube(pts, 0.011, 80, 6), gold, shoesG);
        });
      }

      /* ======================= floating decorations ======================= */
      {
        const items = [];
        const snowM = std('#F7F9FB', { roughness: 0.9 });
        // plum branch with red blossoms and snow (小寒一候・梅花)
        {
          const g = group(K.decor, [X(105), Y(222), 0.2], [0, 0, 0.15]); g.scale.setScalar(1.35);
          const bm = std(BRANCH, { roughness: 0.85 });
          mesh(tube([[-0.28, -0.3, 0], [-0.12, -0.05, 0], [-0.02, 0.2, 0], [0.05, 0.42, 0]], t => 0.03 * (1 - 0.5 * t), 24, 8), bm, g, null, null, '#5E3D31');
          mesh(tube([[-0.12, -0.05, 0], [-0.3, 0.08, 0], [-0.42, 0.1, 0]], 0.018, 12, 6), bm, g, null, null, '#5E3D31');
          mesh(tube([[-0.04, 0.15, 0], [0.12, 0.2, 0.02]], 0.014, 8, 6), bm, g, null, null, '#5E3D31');
          [[0.02, 0.3, 0.72], [-0.4, 0.13, 0.6], [0.14, 0.2, 0.5], [-0.15, -0.14, 0.52]].forEach(([x, y, s]) => {
            const f = K.flower(g, [x, y, 0.04], s * 0.4, PLUM, PLUM_C, 5);
            f.children.forEach(m => m.isMesh && K.outline(m, '#9E3A33'));
          });
          [[0.05, 0.43, 0.05], [-0.42, 0.13, 0.05]].forEach(([x, y, r]) => mesh(sphere(r, 12, 10), std('#E4675C'), g, [x, y + 0.02, 0.02]));
          [[-0.02, 0.24, 0.07], [-0.3, 0.12, 0.06]].forEach(([x, y, r]) => mesh(sphere(r, 16, 10), snowM, g, [x, y + 0.03, 0], [1.5, 0.6, 0.9], '#BFCBD8'));
          items.push(g);
        }
        // pine sprigs with snow caps (歲寒三友)
        const pineD = (pos, s, rz) => {
          const g = group(K.decor, pos, [0, 0, rz]); g.scale.setScalar(s);
          const stem = std('#6D5245', { roughness: 0.85 }), nm = std(PINE, { roughness: 0.8 }), nm2 = std(PINE_LT, { roughness: 0.8 });
          mesh(tube([[-0.45, 0, 0], [0, 0.03, 0], [0.45, 0.02, 0]], 0.02, 16, 6), stem, g);
          for (let c = 0; c < 4; c++) {
            const cx = -0.3 + c * 0.22;
            for (let i = 0; i < 9; i++) {
              const a2 = Math.PI * 0.15 + i / 8 * Math.PI * 0.7, L2 = 0.2;
              mesh(tube([[cx, 0.02, 0], [cx + Math.cos(a2) * L2 * 0.5 + 0.03, 0.02 + Math.sin(a2) * L2 * 0.5, 0.01], [cx + Math.cos(a2) * L2 + 0.06, 0.02 + Math.sin(a2) * L2, 0]], 0.009, 8, 4), i % 2 ? nm : nm2, g);
              mesh(tube([[cx, 0.02, 0], [cx + Math.cos(-a2) * L2 * 0.5 + 0.03, 0.02 + Math.sin(-a2) * L2 * 0.4, 0.01], [cx + Math.cos(-a2) * L2 * 0.8 + 0.06, 0.02 + Math.sin(-a2) * L2 * 0.7, 0]], 0.009, 8, 4), i % 2 ? nm2 : nm, g);
            }
          }
          mesh(sphere(0.14, 16, 10), snowM, g, [0.15, 0.2, 0], [1.6, 0.45, 0.8], '#BFCBD8');
          items.push(g); return g;
        };
        pineD([X(408), Y(275), -0.1], 0.95, 0.5);
        pineD([X(80), Y(352), 0.1], 0.8, -0.3);
        // snowflakes
        [[X(100), Y(142), 0.1, 0.34], [X(395), Y(228), 0.0, 0.3], [X(362), Y(418), 0.3, 0.14]].forEach(([x, y, z, s]) => {
          const sf = K.snowflake(K.decor, [x, y, z], s, '#B9CBE0');
          sf.children.forEach(o => o.children.forEach(m => m.isMesh && K.outline(m, '#8FA3BE')));
          items.push(sf);
        });
        // wind swirls (寒風): pale-blue S-shaped streams
        const windD = (pos, s, flip) => {
          const g = group(K.decor, pos); g.scale.set(s * (flip ? -1 : 1), s, s);
          const pts = [];
          for (let i = 0; i <= 50; i++) { const t = i / 50; pts.push([lerp(-0.5, 0.45, t), 0.18 * Math.sin(t * Math.PI * 1.6 + 0.3) - 0.05 * t, 0]); }
          const sp = []; for (let i = 0; i <= 20; i++) { const a2 = i / 20 * Math.PI * 1.5, r = 0.1 * (1 - i / 30); sp.push([0.45 + Math.sin(a2) * r, -0.14 + 0.1 - Math.cos(a2) * r, 0]); }
          const wm = std('#D3DEEA', { roughness: 0.7 });
          mesh(tube(pts.concat(sp.slice(1)), 0.03, 120, 8), wm, g, null, null, '#9FB2C8');
          mesh(tube(pts.map(([x, y]) => [x - 0.05, y - 0.09, 0]).slice(0, 38), 0.02, 60, 6), wm, g, null, null, '#9FB2C8');
          items.push(g); return g;
        };
        windD([X(408), Y(170), -0.2], 0.62, false);
        windD([X(95), Y(290), -0.1], 0.62, true);
        // snow puffs (the small circles floating around the picture)
        [[X(122), Y(120), 0.05], [X(388), Y(92), 0.0], [X(88), Y(182), 0.1], [X(372), Y(248), 0.2], [X(120), Y(330), 0.3], [X(134), Y(226), 0.3], [X(392), Y(363), 0.2]].forEach(([x, y, z], i) => {
          const s = mesh(sphere(0.055 + 0.01 * (i % 2), 16, 12), std('#EEF3F8', { roughness: 0.6 }), K.decor, [x, y, z], null, '#AFBFD2');
          items.push(s);
        });
        items.forEach(g => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.06 * Math.sin(t * 1.0 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.06 * Math.sin(t * 0.7 + i) * k;
        }));
      }
    },

    action: {
      label: '甩鎖鏈', dur: 1.8,
      run(s, p, K) {
        const hang = K._chain && K._chain.userData.hang;
        // the idle ticks set these every frame first, so the swing is added on top (s = 0 → rest pose)
        if (hang) { hang[0].rotation.z += 0.35 * Math.sin(p * Math.PI * 4) * s; hang[1].rotation.z += -0.35 * Math.sin(p * Math.PI * 4 + 0.5) * s; }
        K.headG.rotation.z += 0.06 * Math.sin(p * Math.PI * 2) * s;
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '小寒・八爺范無救',
        text: '以廟會裡的「八爺」范無救為造型：黑臉、黑袍、手持鎖鏈，和清明的白色七爺是一對。小寒天寒地凍，黑白分明的毛領與黑袍像雪夜，袖上的紅梅、衣上的雪花與松枝，則是「小寒一候梅花開」的寒冬意象。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '黑色長毛圓臉',
        text: '墨黑色的蓬鬆長毛大圓臉，額頭有幾道若隱若現的深色虎斑。一對大圓眼是深棕瞳孔配琥珀金色眼圈，高光點在內上方；粉紅小鼻、「ω」小嘴，兩頰淡淡的粉色腮紅，還有兩根細白鬍鬚。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '尖耳與白絨毛',
        text: '一對大而尖的黑耳朵從帽子兩旁斜斜冒出，耳內是淡粉色，下半部塞滿一撮白色蓬鬆絨毛。' },
      hat: { chip: '烏紗帽', tag: '服飾', name: '金邊烏紗高帽', dir: [0.2, 0.25, 1],
        text: '黑色烏紗帽：後方高聳的方形帽翅頂端微寬、正中一道金線，前方是圓頂帽身，底緣一圈金邊、兩道金色拱線；正中嵌著米白梅花形帽徽，裡面開著一朵紅梅。兩側金桿末端是捲雲狀的金如意，紅繩繞過耳後，在臉頰兩旁各垂一串金珠紅流蘇。' },
      furCollar: { chip: '毛領', tag: '服飾', name: '雪白毛領',
        text: '脖子一圈厚厚的雪白蓬鬆毛領，正好襯出黑色的臉，前方露出一小段淡藍交領與金邊。' },
      robe: { chip: '黑袍', tag: '服飾', name: '雪花披肩與雲紋黑袍', dir: [0, 0.1, 1],
        text: '肩上是一片黑色短披肩，兩肩各繡一朵白雪花、下緣滾金邊。黑色長袍前襟兩道金邊直直垂到下襬，中間的前片繡著淡藍風紋、白雪花與點點飛雪，下襬是一排淡藍色祥雲。' },
      sleeves: { chip: '梅花大袖', tag: '服飾', name: '米白梅花大袖', dir: [0.6, 0, 1],
        text: '兩隻米白色大袖從肩膀一路寬寬地垂到膝蓋，袖口內側露出淡藍色襯裡與金色滾邊。袖面上畫著一枝枝紅梅，畫面左袖下方還有一枝松針，右袖是淡藍小雪花，袖襬都是淡藍色海浪紋與金色寬邊。' },
      chain: { chip: '鎖鏈', tag: '道具', name: '勾魂鎖鏈', dir: [0, 0, 1],
        text: '八爺的招牌道具：一條沉甸甸的灰色鐵鎖鏈，一環橫、一環直地扣在一起。兩隻黑色小拳頭一左一右握著，中段在胸前垂成一道弧，兩端再從拳下垂落；畫面左邊的鏈尾掛著金珠、金如意牌和一串長長的紅流蘇。按「甩鎖鏈」可以看牠把鏈子甩起來。' },
      belt: { chip: '腰帶', tag: '服飾', name: '紅腰帶與雪花金牌',
        text: '腰間繫一條紅色腰帶，正中打一個小蝴蝶結，下面垂著金珠和刻白雪花的圓形金牌，再往下是兩顆白珍珠與兩串紅流蘇。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '蓬鬆黑尾巴', dir: [1, 0.25, -0.7],
        text: '又粗又蓬的黑色大尾巴從右後方繞出，向上翹起再往內捲，末端的毛一撮撮地捲成小鉤。' },
      shoes: { chip: '雲頭鞋', tag: '服飾', name: '黑色雲頭鞋', dir: [0.2, 0.3, 1],
        text: '長袍下露出一截米白色褲腳，腳上是圓頭黑布鞋，鞋頭繡著金色雙捲雲紋，底下是一層厚厚的米白鞋底。' }
    },
    order: ['overview', 'face', 'ears', 'hat', 'furCollar', 'robe', 'sleeves', 'chain', 'belt', 'tail', 'shoes']
  });
})();
