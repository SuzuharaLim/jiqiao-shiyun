// @file 02_雨水_英國短毛貓
// @title 雨水・龍王雨水神 | 二十四節氣貓
// 雨水：灰色英國短毛貓化身溫和的小龍王（雨水神），雙爪捧著魚鱗紋寶瓶，把清水倒向大地。
(function () {
  /* Scale: 1 world unit ≈ 100 px of refs/02.png (ground y = 0 ↔ px 452, x = 0 ↔ px 250 = head centre).
   * Measured: head x 129–372 / y 68–228 (w 2.43, h 1.60), eyes y 2.79, crown top 4.45 (water-drop tip),
   * vase centre (-0.6, 1.76), paws (-1.24, 1.9) and (0.1, 1.54), robe hem y 0.3, feet at px 189 / 276.
   * Colours are SAMPLED from the picture (tools/colors.py); def.exposure + Lc() bring the lit render
   * back close to the sampled values (the lights add ≈ R 1.16, G 1.1, B 1.0 on front faces). */
  function Lc(hex, k) {
    k = k || 1; const n = parseInt(hex.slice(1), 16), f = [1.16 * k, 1.1 * k, 1.0 * k];
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f[i], 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  const S = {   // sampled picture colours
    fur: '#CCC6C5', furTop: '#C6C0C0', furLow: '#D1CCCA', stripe: '#9499A8', dot: '#848A99', cheek: '#A4AAB6',
    cream: '#FBF7EA', earIn: '#F9C9BA', blush: '#F6B4A6', eye: '#321F0C', iris: '#5E3D22', nose: '#817978', mouth: '#5A4A48',
    teal: '#8CC3B6', tealDk: '#7DB2AC', tealLt: '#B5DCD0', band: '#F8DE9E', drop: '#8AD3FB', antler: '#FADA8D',
    vase: '#BCD6C2', vaseLt: '#DAE6D1', vaseDk: '#9FC3B2', rim: '#F6DD9A', wave: '#7ED0ED',
    water: '#92D9FA', waterLt: '#E4F5F8', waterDk: '#65BDF8',
    robe: '#F9F3E2', inner: '#D5E1CF', innerDk: '#B5CFC5', lining: '#7DB2D6', trim: '#7FB2D4', capelet: '#A6D0C8',
    scallop: '#EFD99A', belt: '#9EC9C0', apronGold: '#EFDA9E', pants: '#87B1CC', feet: '#F7F1E8',
    tail: '#CEC9CA', tailScale: '#A9AFBE', finTeal: '#A7CFC6', finBlue: '#8EC4DB', bolt: '#EFCC7A', sprout: '#A4C575', sproutDk: '#7FA552'
  };
  const COL = {};
  Object.keys(S).forEach(k => { COL[k] = Lc(S[k]); });
  const INK = {
    fur: '#766D68', cream: '#BDB3A5', robe: '#86958C', teal: '#4F867C', blue: '#4C88B0', gold: '#AE8A45',
    pants: '#557F9E', water: '#4FA3D2', antler: '#B38A45', vase: '#5E8D80', fin: '#4E8A80', finBlue: '#4C8DB5'
  };

  // fish-scale rows (魚鱗紋): lower half-circles, row by row from the top
  function scales(g, x0, y0, x1, y1, R, fill, line, lw, fill2) {
    let row = 0;
    for (let y = y0; y <= y1; y += R * 0.95, row++) {
      for (let x = x0 - R + (row % 2) * R; x <= x1 + R; x += R * 2) {
        if (fill) {
          g.beginPath(); g.moveTo(x - R, y); g.arc(x, y, R, Math.PI, 0, true); g.closePath();
          g.fillStyle = (fill2 && (row + Math.round(x / R)) % 3 === 0) ? fill2 : fill; g.fill();
        }
        g.beginPath(); g.arc(x, y, R, Math.PI, 0, true);
        g.strokeStyle = line; g.lineWidth = lw; g.stroke();
      }
    }
  }
  // curling wave swirl (水紋漩渦) with a trailing stroke
  function swirl(g, x, y, s, color, lw, flip) {
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
    g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * Math.PI * 3.2, r = s * (0.08 + 0.5 * t); const px = Math.cos(a) * r, py = -Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke();
    g.beginPath(); g.moveTo(-s * 0.55, s * 0.1); g.quadraticCurveTo(-s * 1.1, s * 0.35, -s * 1.6, s * 0.2); g.stroke();
    g.restore();
  }
  // layered sea waves (海水紋): stacked arcs with a curl on top
  function seaWaves(g, x, y, s, c1, c2, lw) {
    g.save(); g.translate(x, y); g.lineCap = 'round';
    [[0, 0, 1, c1], [-s * 0.55, s * 0.28, 0.8, c2], [s * 0.55, s * 0.3, 0.8, c2]].forEach(([dx, dy, k, c]) => {
      g.strokeStyle = c; g.lineWidth = lw;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(dx, dy + s * 0.2, s * k * (0.55 - i * 0.16), Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
    });
    g.strokeStyle = c1; g.lineWidth = lw; g.beginPath();
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = Math.PI * (0.5 + 2.4 * t), r = s * 0.3 * (1 - 0.8 * t); const px = Math.cos(a) * r, py = -s * 0.25 - Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke(); g.restore();
  }

  const REF = {};
  // The picture is a slight three-quarter view: the body is turned ≈15° toward the image-left, the face ≈6°.
  // Held props and arms are measured in WORLD coordinates from the picture and converted to body-local ones.
  const YAW = -0.26, HEAD_YAW = -0.1, CY = Math.cos(YAW), SY = Math.sin(YAW);
  const W2L = (p) => [p[0] * CY - p[2] * SY, p[1], p[0] * SY + p[2] * CY];

  NEKO.run({
    meta: {
      id: '02', term: '雨水', title: '雨水・龍王雨水神', seal: '雨',
      eyebrow: '二〇二七節氣貓 · 02 雨水 · 英國短毛貓',
      aria: '頭戴金色小龍角與青綠水滴冠、身穿米白寬袖外袍與魚鱗雲肩，雙手捧著魚鱗紋寶瓶把清水倒向地面水窪、身後拖著魚鱗龍尾的灰色英國短毛貓 3D 模型'
    },
    theme: { accent: '#3F7E96', accentDark: '#9FD3E6', glow: 'rgba(141,212,250,0.30)', glowColor: '#A9E0F8' },
    palette: [['#CCC6C5', '霧灰毛色'], ['#F9F3E2', '淡米白'], ['#A6D0C8', '淡青綠'], ['#87BBDB', '霧水藍']],
    spec: [['品種', '英國短毛貓'], ['角色', '龍王・雨水神'], ['頭身比', '約 1 : 1.4']],
    seed: 2,
    exposure: 0.8,

    cat: {
      neck: { r: 0.5, into: 0.3, below: 0.25, color: COL.furLow },
      fur: {
        color: COL.fur, top: COL.furTop, mid: COL.fur, low: COL.furLow, deep: COL.stripe,
        cream: COL.cream, ink: INK.fur, creamInk: INK.cream,
        pattern: 'none', mask: false,
        noise: { colors: [Lc('#DAD5D3'), Lc('#BDB7B8')], alpha: 0.03, n: 600 },
        paint(g, P) {
          // faint tabby bars on the back of the head (the face markings are painted in build() with onSkin anchors)
          g.filter = 'blur(6px)';
          [-150, -125, -100, 100, 125, 150, 180].forEach(lon => {
            const a = P.xy(lon, 82), b = P.xy(lon + (lon > 0 ? 4 : -4), 45), c = P.xy(lon, 10);
            P.stroke(g, [a, b, c], 26, COL.stripe, 0.4);
          });
          g.filter = 'none';
        }
      },
      // picture head: 243 px wide, 160 px tall, flat top, near-vertical sides, broad rounded lower corners
      head: {
        y: 3.04, neck: 2.3, lift: -0.2, w: 1.16, h: 0.8, d: 0.9, cheek: 0.05, ruff: 0, ruffFreq: 12, chinDrop: 0.0,
        deform(p, o) {
          // squircle front silhouette (flatter top than bottom); side and top views stay round
          const n = o.y > 0 ? 3.1 : 2.12, ax = Math.abs(o.x), ay = Math.abs(o.y);
          const r2 = Math.hypot(ax, ay), rn = Math.pow(Math.pow(ax, n) + Math.pow(ay, n), 1 / n);
          const k = rn > 1e-6 ? r2 / rn : 1;
          p.x *= k; p.y *= k;
          // slightly receding chin and a fuller, rounder brow
          if (o.y < 0) p.z *= 1 - 0.12 * o.y * o.y;
        },
        fur: { layers: 6, length: 0.016, gravity: 0.003, repeat: [14, 7] }
      },
      eyes: { x: 0.4, y: -0.25, r: 0.158, sx: 0.95, sy: 1.06, sz: 0.34, color: COL.eye, iris: Lc('#5A3A1F'), pupil: '#1E1208', pupilR: 0.56, shine: 1.25 },
      nose: { y: -0.34, color: Lc('#8A8282'), size: 0.95 },
      mouth: { type: 'w', color: COL.mouth, y: -0.44, w: 0.145, depth: 0.06 },
      muzzle: { color: '#FFFFFA', y: -0.43, size: 0.42 },
      blush: false,   // painted in build() together with the pale mask
      brows: null, whiskers: null,
      ears: {
        x: 0.78, y: 0.38, z: -0.06, tilt: 0.52, yaw: 0.2, pitch: -0.06, size: [0.47, 0.57, 0.15], sharp: 0.97,
        color: COL.fur, inner: COL.earIn, tuft: false, innerScale: 1.18,
        fur: { layers: 6, length: 0.018, gravity: 0.004, repeat: [3, 3] }
      },
      bib: false,
      robe: {
        profile: [[0.88, 0.3], [0.9, 0.4], [0.88, 0.7], [0.84, 1.1], [0.79, 1.5], [0.7, 1.78], [0.54, 1.98], [0.3, 2.12], [0.1, 2.18]],
        color: '#FFFFFF', ink: INK.robe, lining: COL.inner, hemY: 0.6,
        paint(g, w, h, D) {
          // pale green inner robe (seen between the outer robe and the apron), darker hem band
          D.fill(g, COL.inner);
          for (let x = 20; x < w; x += 58) D.stroke(g, [[x, 200], [x + 5, 600], [x - 3, h - 80]], 5, Lc('#E3ECDD'), 0.6);
          g.fillStyle = COL.innerDk; g.fillRect(0, h - 60, w, 60);
          g.fillStyle = Lc('#EAF1E6'); g.fillRect(0, h - 66, w, 6);
        }
      },
      collar: { color: COL.trim, r: 0.062, over: 1, y0: 2.1, style: 'cross' },
      cape: {
        part: 'cape', color: COL.robe, y0: 2.08, y1: 0.26, off: 0.06, open: 78, flare: 0.07,
        lining: COL.inner, trim: COL.innerDk, trimR: 0.03, ink: INK.robe,
        paint(g, w, h, D) {
          // x 0 = image-right front edge, 512 = back, 1024 = image-left front edge; bottom = hem
          D.fill(g, COL.robe);
          D.tile(g, (x, y, row) => D.sprout(g, x, y, 30, row % 2 ? Lc('#B6D4A2') : Lc('#A8CC98')), { y0: 200, y1: 380, step: 120, x0: 70, x1: 960 });
          [[150, 430], [880, 430], [512, 440], [340, 420], [690, 420]].forEach(([x, y], i) => swirl(g, x, y, 30, i % 2 ? Lc('#8CC7D9') : Lc('#9FD0C6'), 6, i % 2));
          // pale green hem band with a blue line
          g.fillStyle = COL.inner; g.fillRect(0, h - 36, w, 36);
          g.fillStyle = COL.trim; g.fillRect(0, h - 42, w, 6);
          // front edges: blue trim + pale green facing
          g.fillStyle = COL.trim; g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);
          g.fillStyle = COL.inner; g.fillRect(26, 0, 14, h); g.fillRect(w - 40, 0, 14, h);
        }
      },
      apron: null,   // built in build() as its own clickable part (圍裳)
      arms: {
        L: { hand: W2L([-1.24, 1.9, 1.24]), path: [[-0.62, 1.95, 0.0], W2L([-1.42, 1.52, 0.2]), W2L([-1.26, 1.84, 0.96])], pawScale: 1.4, wrist: false },
        R: { hand: W2L([0.1, 1.54, 1.38]), path: [[0.62, 1.95, 0.0], W2L([1.02, 1.72, 0.5]), W2L([0.3, 1.48, 1.18])], pawScale: 1.4, wrist: false }
      },
      // 'custom' → the engine builds no sleeves; the two hanging drapes are lofted in build()
      sleeves: { style: 'custom', color: '#FFFFFF', lining: COL.lining, trim: COL.trim, trimR: 0.022, ink: INK.robe },
      paws: { color: COL.feet, ink: INK.cream },
      belt: { yT: 1.26, yB: 1.14, color: COL.belt, line: false, knot: false, ink: INK.teal, tassel: false },
      legs: { color: COL.pants, r: 0.24, top: 0.55, x: 0.42, z: 0.32, ink: INK.pants },
      feet: { color: COL.feet, toe: false, x: 0.42, y: 0.1, z: 0.74, type: 'paw' },
      tail: {
        pts: [[0.4, 0.62, -0.62], [0.85, 0.55, -0.82], [1.22, 0.78, -0.72], [1.5, 1.08, -0.58], [1.7, 1.34, -0.48], [1.84, 1.56, -0.42]],
        r: 0.25, shape: t => Math.pow(1 - t, 0.75) * (0.8 + 0.35 * Math.sin(Math.PI * t)) + 0.02,
        ink: INK.fur, fur: false,
        paint(g, w, h) {
          g.fillStyle = COL.tail; g.fillRect(0, 0, w, h);
          // the tail map is ~8× stretched around the tube, so draw the scales as wide ellipses (round on the model)
          g.save(); g.scale(8, 1); scales(g, 200 / 8, -4, w / 8, h + 8, 8, COL.tailScale, Lc('#EEF0EE'), 2, Lc('#B8BDC9')); g.restore();
          const lg = g.createLinearGradient(0, 0, 280, 0);
          lg.addColorStop(0, COL.tail); lg.addColorStop(1, NEKO.rgba(COL.tail, 0));
          g.fillStyle = lg; g.fillRect(0, 0, 280, h);
        }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, lathe, tube, extrude, sphere, dropGeo, D, body, head } = K;
      const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

      /* ---------- wide Hanfu sleeves as hanging drapes, lofted in picture (world) coordinates:
                    ring s = 0 is the open cuff (the paw comes out of its top), s = 1 is pinched shut at the
                    outer fold; around each ring a = 0 top, π/2 front, π bottom. Cream outside, misty-blue lining. ---------- */
      const SLc = K.cfg.sleeves;
      const lerp = (a, b, t) => a + (b - a) * t;
      const L3 = (a, b, t) => V(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
      const sleeveW = group(K.robeG); sleeveW.rotation.y = -YAW;   // children use world (picture) coordinates at rest
      const liningMat = std(SLc.lining, { side: THREE.BackSide, roughness: 0.85 }), trimMat = std(SLc.trim, { roughness: 0.75 });
      function drape(o) {
        const NS = 40, NA = 64, pos = [], uvs = [], idx = [], ring = [], e = 0.01;
        const C = (s, v) => o.C(Math.min(Math.max(s, 0), 1), Math.min(Math.max(v, 0), 1));
        for (let i = 0; i <= NS; i++) {
          const s = i / NS;
          for (let j = 0; j <= NA; j++) {
            const a = j / NA * Math.PI * 2, v = (1 - Math.cos(a)) / 2, sd = Math.sin(a);
            const c = C(s, v), cs = C(s + e, v).sub(C(s - e, v)), cv = C(s, v + e).sub(C(s, v - e));
            const n = cs.clone().cross(cv).normalize(); if (n.dot(o.front) < 0) n.negate();
            const P = c.addScaledVector(n, o.th(s, v) * sd);
            pos.push(P.x, P.y, P.z); uvs.push(j / NA, s);
            if (i === 0 && j < NA) ring.push(P.clone());
          }
        }
        for (let i = 0; i < NS; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        // front faces outward: test a point on the front of the middle ring
        const k0 = (NS >> 1) * (NA + 1) + (NA >> 2), mid = C(0.5, 0.5);
        const pv = V(pos[k0 * 3], pos[k0 * 3 + 1], pos[k0 * 3 + 2]), nv = V().fromBufferAttribute(geo.attributes.normal, k0);
        if (nv.dot(pv.sub(mid)) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } geo.setIndex(idx); K.smoothNormals(geo); }
        const tex = canvasTex(1024, 512, (g, w, h) => o.paint(g, w, h));
        const m = mesh(geo, texMat(tex, { side: THREE.FrontSide }), sleeveW, null, null, SLc.ink);
        const ln = new THREE.Mesh(geo, liningMat); ln.receiveShadow = true; m.add(ln);
        mesh(tube(K.curve3(ring, true), o.trimR || SLc.trimR, 140, 8, true), o.trim ? std(o.trim, { roughness: 0.8 }) : trimMat, sleeveW, null, null, o.trim ? INK.robe : null);
        K.sleeveMeshes.push(m);
        return m;
      }
      const pinch = (s, s0) => Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (s - s0) / (1 - s0)), 2)));
      // canvas: x = around (0 top, 256 front, 512 bottom, 768 back), y = (1 - s) · 512 (cuff at the bottom)
      const sleevePaint = (motifs, cuff) => (g, w, h) => {
        cuff = cuff || 44;
        g.fillStyle = COL.robe; g.fillRect(0, 0, w, h);
        // watercolour shading: pale green toward the bottom fold, soft fold lines running down the drape
        const lg = g.createLinearGradient(0, 0, 512, 0);
        lg.addColorStop(0, NEKO.rgba(COL.robe, 0)); lg.addColorStop(0.6, NEKO.rgba(COL.robe, 0)); lg.addColorStop(1, NEKO.rgba(Lc('#D6E6D6'), 0.9));
        g.fillStyle = lg; g.fillRect(0, 0, 512, h);
        g.save(); g.scale(-1, 1); g.fillStyle = lg; g.fillRect(-1024, 0, 512, h); g.restore();
        g.filter = 'blur(6px)';
        [0.2, 0.38, 0.56, 0.72].forEach((sv, i) => D.stroke(g, [[40, (1 - sv) * h], [300, (1 - sv) * h + 8], [500, (1 - sv) * h - 6]], 10, i % 2 ? Lc('#CFE0DA') : Lc('#E3D9C2'), 0.7));
        g.filter = 'none';
        motifs(g, w, h);
        g.fillStyle = COL.trim; g.fillRect(0, h - cuff, w, cuff);             // cuff band
        g.fillStyle = Lc('#A9CCE0'); g.fillRect(0, h - cuff - 6, w, 6);
        g.fillStyle = COL.trim; g.fillRect(492, 0, 40, h);                    // lining peeking along the bottom fold
      };
      // image-right sleeve: forearm runs to the image-left, the long drape hangs down its outer side to y ≈ 0.45
      drape({
        front: V(0, 0, 1),
        C: (s, v) => {
          const top = L3([0.24, 1.66, 1.18], [0.86, 1.86, 0.3], s), bot = L3([0.5, 0.62, 1.12], [1.38, 0.47, 0.7], s);
          bot.y -= 0.07 * Math.sin(Math.PI * s);
          const c = top.lerp(bot, Math.pow(v, 0.95));
          c.z += 0.14 * Math.sin(Math.PI * Math.min(1, s * 1.15)) * Math.sin(Math.PI * Math.min(v * 1.2, 1));   // fabric bellies forward
          return c;
        },
        th: (s, v) => lerp(0.26, 0.07, Math.pow(v, 0.6)) * (1 + 0.3 * Math.sin(s * Math.PI * 6.5) * v) * pinch(s, 0.72),
        paint: sleevePaint((g) => {
          [[300, 330, 40], [255, 380, 34], [330, 395, 30]].forEach(([x, y, sz]) => { g.save(); g.translate(x, y); g.rotate(-Math.PI / 2); D.sprout(g, 0, 0, sz, Lc('#A8CC98')); g.restore(); });
          // big layered sea waves on the lower part of the drape (as in the picture)
          [[400, 190, 150], [440, 80, 90]].forEach(([x, y, sz]) => { g.save(); g.translate(x, y); g.rotate(-Math.PI / 2); seaWaves(g, 0, 0, sz, Lc('#7DBFD6'), Lc('#9FD0C6'), 9); g.restore(); });
        }, 72)
      });
      // image-left sleeve: raised forearm points at the viewer, so we look into the cuff and see the lining
      drape({
        front: V(-1, 0, 0), trim: COL.robe, trimR: 0.04,
        C: (s, v) => {
          const top = L3([-1.26, 1.98, 0.96], [-0.92, 2.04, -0.05], s), bot = L3([-1.44, 0.86, 0.76], [-1.0, 1.1, -0.1], s);
          return top.lerp(bot, Math.pow(v, 0.9));
        },
        th: (s, v) => lerp(0.2, 0.44, Math.pow(v, 0.75)) * (1 + 0.1 * Math.sin(s * Math.PI * 5) * v) * pinch(s, 0.75),
        paint: sleevePaint((g) => {
          [[256, 250, 30], [300, 120, 26]].forEach(([x, y, sz]) => { g.save(); g.translate(x, y); g.rotate(Math.PI / 2); D.sprout(g, 0, 0, sz, Lc('#A8CC98')); g.restore(); });
        })
      });

      /* ---------- short furry wrists joining each paw to the inside of its cuff ---------- */
      ['L', 'R'].forEach(k => {
        const H = K.hands[k], a = H.wrist.clone().addScaledVector(H.dir, -0.12);
        mesh(tube([a, H.wrist, H.p], t => 0.1 + 0.02 * t, 16, 14), std(COL.feet, { roughness: 0.9 }), K.poseG, null, null, INK.cream);
      });

      /* ---------- face: pale cream lower face & eye rings, three forehead stripes, brow dots,
                    blue-grey cheek patches, pink blush (all anchored with onSkin) ---------- */
      K.eyes.forEach(eg => eg.children[0].children.forEach(m => { if (m.material === K.M.shine) m.position.x *= -1; }));
      const hg = K.headTex.image.getContext('2d'), hy = K.HC.y;
      const uvPx = (x, y) => { for (let k = 1; k > 0.3; k -= 0.02) { const s = K.onSkin(x * k, hy + y * k); if (s.uv) return [s.uv.x * 1024, (1 - s.uv.y) * 512]; } return [512, 256]; };
      const dx = (a, b) => Math.abs(a[0] - b[0]), dy = (a, b) => Math.abs(a[1] - b[1]);
      const blobAt = (x, y, rx, ry, color, alpha) => {
        const c = uvPx(x, y), cx = uvPx(x + rx, y), cy = uvPx(x, y + ry);
        D.blob(hg, c[0], c[1], Math.max(dx(cx, c), 4), Math.max(dy(cy, c), 4), color, alpha);
      };
      hg.save();
      const mc = '#FBFCFF';
      hg.filter = 'blur(8px)';
      blobAt(0, -0.66, 1.0, 0.28, mc, 1);                 // chin & lower face
      D.blob(hg, 512, 505, 520, 60, mc, 1);               // underside of the head
      [-1, 1].forEach(sx => {
        blobAt(0.62 * sx, -0.5, 0.36, 0.14, mc, 1);       // lower cheeks
        blobAt(0.4 * sx, -0.26, 0.21, 0.2, mc, 1);        // ring around each eye
      });
      blobAt(0, -0.34, 0.2, 0.16, mc, 1);                 // bridge / muzzle between the eyes
      // three blue-grey forehead stripes, the middle one longest
      hg.filter = 'blur(3px)';
      const line = (x0, y0, x1, y1) => [uvPx(x0, y0), uvPx((x0 + x1) / 2, (y0 + y1) / 2), uvPx(x1, y1)];
      const taper = (x, yT, yB, w0) => { for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6; D.stroke(hg, line(x, yT + (yB - yT) * t0, x * 0.96, yT + (yB - yT) * t1), w0 * (1 - 0.13 * i), COL.stripe, 0.9); } };
      taper(0, 0.74, 0.2, 52);
      taper(-0.29, 0.72, 0.28, 44); taper(0.29, 0.72, 0.28, 44);
      hg.filter = 'blur(2px)';
      [-1, 1].forEach(sx => {
        blobAt(0.33 * sx, 0.08, 0.075, 0.042, Lc('#7A8090'), 1);                // brow dots
      });
      hg.filter = 'blur(5px)';
      [-1, 1].forEach(sx => {
        const c = uvPx(0.94 * sx, -0.23), cR = uvPx(1.08 * sx, -0.23);
        D.blob(hg, c[0], c[1], Math.max(dx(cR, c), 20) * 1.15, 14, COL.cheek, 0.95);   // cheek patches
        const bl = uvPx(0.64 * sx, -0.42), blR = uvPx(0.8 * sx, -0.42);
        D.soft(hg, bl[0], bl[1], dx(blR, bl) * 1.1, dx(blR, bl) * 0.75, COL.blush, 0.85); // blush
      });
      hg.restore(); K.headTex.needsUpdate = true;
      // the lower face points away from the key light: lift it with an emissive copy of the head map that fades in below the eyes
      const emTex = canvasTex(1024, 512, (g, w, h) => {
        g.drawImage(K.headTex.image, 0, 0);
        g.globalCompositeOperation = 'destination-in';
        const lg = g.createLinearGradient(0, 0, 0, h);
        lg.addColorStop(0, 'rgba(0,0,0,0.25)'); lg.addColorStop(0.5, 'rgba(0,0,0,0.3)'); lg.addColorStop(0.72, 'rgba(0,0,0,1)'); lg.addColorStop(1, 'rgba(0,0,0,1)');
        g.fillStyle = lg; g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      });
      Object.assign(K.headMesh.material, { emissive: new THREE.Color('#FFFFFF'), emissiveMap: emTex, emissiveIntensity: 0.4 });
      K.headMesh.material.needsUpdate = true;

      /* ---------- dragon-king crown: teal roll brim, pale-gold band, ribbed teal dome, big water drop,
                    cream cloud badge and two chunky golden antlers ---------- */
      const hatG = part('hat', head);
      hatG.position.set(0, 3.72, 0.03);
      const tealMat = std(COL.teal, { roughness: 0.7 });
      const ribTex = canvasTex(512, 128, (g, w, h) => {
        g.fillStyle = COL.teal; g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 32) {
          const lg = g.createLinearGradient(x, 0, x + 32, 0);
          lg.addColorStop(0, COL.tealDk); lg.addColorStop(0.45, COL.tealLt); lg.addColorStop(1, COL.tealDk);
          g.fillStyle = lg; g.fillRect(x, 0, 32, h);
        }
      });
      const brim = mesh(new THREE.TorusGeometry(0.375, 0.085, 20, 72), tealMat, hatG, [0, 0.085, 0], null, INK.teal);
      brim.rotation.x = Math.PI / 2;
      mesh(new THREE.CylinderGeometry(0.345, 0.35, 0.11, 64), std(COL.band, { roughness: 0.6 }), hatG, [0, 0.19, 0], null, INK.gold);
      mesh(lathe([[0.33, 0.22], [0.35, 0.3], [0.33, 0.39], [0.27, 0.46], [0.16, 0.51], [0.001, 0.53]], 64).geo, texMat(ribTex, { roughness: 0.7 }), hatG, null, null, INK.teal);
      const jewel = group(hatG, [0, 0.345, 0.3]);
      mesh(dropGeo(0.55, 0.19, 1.6), std(COL.drop, { roughness: 0.18, metalness: 0.05, emissive: new THREE.Color(COL.drop).convertSRGBToLinear(), emissiveIntensity: 0.15 }), jewel, null, null, INK.blue);
      mesh(sphere(0.04, 16, 12), K.M.shine, jewel, [-0.07, 0.02, 0.16], [0.8, 1.8, 0.5]);
      mesh(sphere(0.022, 12, 10), K.M.shine, jewel, [0.075, -0.07, 0.15]);
      K.puff(hatG, [0, 0.07, 0.44], 0.17, COL.cream, INK.cream);
      const antlerMat = std(Lc('#F4CB76'), { roughness: 0.6 });
      [-1, 1].forEach(sx => {
        const P = (x, y, z) => [x * sx, y, z || 0];
        // main beam: base at the brim side, curving up and out to the top tip
        mesh(tube([P(0.4, 0.06, -0.02), P(0.5, 0.2, -0.02), P(0.6, 0.38, -0.02), P(0.69, 0.56, -0.02)], t => 0.1 - 0.02 * t, 28, 16), antlerMat, hatG, null, null, INK.antler);
        mesh(sphere(0.08, 18, 14), antlerMat, hatG, P(0.69, 0.56, -0.02), null, INK.antler);
        // outer prong
        mesh(tube([P(0.52, 0.2, -0.02), P(0.66, 0.22, -0.02), P(0.8, 0.28, -0.02)], t => 0.085 - 0.008 * t, 18, 12), antlerMat, hatG, null, null, INK.antler);
        mesh(sphere(0.077, 16, 12), antlerMat, hatG, P(0.8, 0.28, -0.02), null, INK.antler);
        // small inner prong
        mesh(tube([P(0.59, 0.34, -0.02), P(0.55, 0.39, -0.02), P(0.53, 0.43, -0.02)], 0.064, 10, 10), antlerMat, hatG, null, null, INK.antler);
        mesh(sphere(0.064, 14, 10), antlerMat, hatG, P(0.53, 0.43, -0.02), null, INK.antler);
      });

      /* ---------- 雲肩: fish-scale shoulder mantle with a scalloped pale-gold edge, open at the front ---------- */
      {
        const yokeG = part('yoke', body);
        const prof = [[1.08, 1.6], [1.04, 1.74], [0.94, 1.88], [0.78, 2.01], [0.58, 2.1], [0.38, 2.16]];
        const half = 44 * Math.PI / 180;
        const NS = 9;   // scallops per half
        const tex = canvasTex(1024, 256, (g, w, h) => {
          g.fillStyle = COL.capelet; g.fillRect(0, 0, w, h);
          scales(g, 0, 18, w, h, 22, null, Lc('#E9F4EE'), 4);
          scales(g, 11, 30, w, h, 22, null, Lc('#78B9C6'), 2.5);
          // scalloped lower edge: pale-gold band, transparent below
          const sw = w / (NS * 2), yE = h - 70;
          g.globalCompositeOperation = 'destination-out';
          g.fillStyle = '#000'; g.beginPath(); g.moveTo(0, h);
          for (let i = 0; i < NS * 2; i++) { const x = i * sw; g.lineTo(x, yE); g.quadraticCurveTo(x + sw / 2, yE + 95, x + sw, yE); }
          g.lineTo(w, h); g.closePath(); g.fill();
          g.globalCompositeOperation = 'source-over';
          g.strokeStyle = COL.scallop; g.lineWidth = 16; g.lineJoin = 'round';
          g.beginPath();
          for (let i = 0; i < NS * 2; i++) { const x = i * sw; if (!i) g.moveTo(x, yE); g.quadraticCurveTo(x + sw / 2, yE + 95, x + sw, yE); }
          g.stroke();
          // blue trim along the two front edges
          g.fillStyle = COL.trim; g.fillRect(0, 0, 16, h); g.fillRect(w - 16, 0, 16, h);
        });
        const yl = lathe(prof, 96, half, Math.PI * 2 - half * 2, 32);
        mesh(yl.geo, texMat(tex, { side: THREE.DoubleSide, alphaTest: 0.5, roughness: 0.8 }), yokeG, null, null, null);
      }

      /* ---------- 圍裳: cream front panel, pale-gold frame with round lower corners, splash puddle ---------- */
      K.robePanel({
        y0: 0.33, y1: 1.18, deg: 25, degB: 27, off: 0.035, color: COL.robe, ink: INK.robe, parent: part('apron', body),
        paint(g, w, h) {
          g.fillStyle = COL.robe; g.fillRect(0, 0, w, h);
          const fr = (inset, lw, color) => {
            g.strokeStyle = color; g.lineWidth = lw; const x = inset, y = -40, W = w - inset * 2, H = h - inset + 40, r = 40;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + H - r); g.quadraticCurveTo(x, y + H, x + r, y + H);
            g.lineTo(x + W - r, y + H); g.quadraticCurveTo(x + W, y + H, x + W, y + H - r); g.lineTo(x + W, y); g.stroke();
          };
          fr(16, 22, COL.apronGold); fr(30, 4, Lc('#D9C284'));
          // puddle with a little splash at the bottom
          D.blob(g, 128, 420, 88, 22, Lc('#CDEEFB'), 1);
          D.blob(g, 128, 420, 66, 15, COL.water, 1);
          D.blob(g, 128, 420, 34, 8, COL.waterDk, 1);
          g.strokeStyle = COL.waterDk; g.lineWidth = 7; g.lineCap = 'round';
          g.beginPath(); g.arc(142, 398, 15, Math.PI * 1.05, Math.PI * 2.1); g.stroke();
          D.blob(g, 96, 362, 8, 8, COL.water, 1);
        }
      });

      /* ---------- gold hook, bead and water-drop pendant on the sash ---------- */
      const zb = K.robeR(1.2) + 0.07;
      const gold = std(COL.rim, { roughness: 0.45 });
      const hook = mesh(new THREE.TorusGeometry(0.04, 0.013, 8, 20), gold, K.beltG, [0, 1.1, zb + 0.02], null, INK.gold);
      mesh(sphere(0.03, 14, 10), gold, K.beltG, [0, 1.03, zb + 0.03], null, INK.gold);
      mesh(tube([[0, 1.0, zb + 0.03], [0, 0.94, zb + 0.035], [0, 0.88, zb + 0.035]], 0.008, 8, 6), gold, K.beltG);
      mesh(sphere(0.026, 14, 10), gold, K.beltG, [0, 0.87, zb + 0.035], null, INK.gold);
      K.drop(K.beltG, [0, 0.75, zb + 0.04], 0.19, COL.drop);
      hook.rotation.y = 0;

      /* ---------- 寶瓶: celadon jar with fish scales, gold lip, lying tilted so the mouth pours to the image-left ---------- */
      const vaseG = part('vase', body);
      const VC = V(...W2L([-0.6, 1.76, 1.18])), JS = 1.18;
      vaseG.position.copy(VC); REF.vase = vaseG;
      const dir = V(...W2L([-0.6, -0.5, 0.55])).normalize();
      const jar = group(vaseG); jar.scale.setScalar(JS);
      jar.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      const jarTex = canvasTex(1024, 512, (g, w, h) => {
        const lg = g.createLinearGradient(0, h, 0, 0);
        lg.addColorStop(0, COL.vaseDk); lg.addColorStop(0.5, COL.vase); lg.addColorStop(0.9, COL.vaseLt); lg.addColorStop(1, COL.vaseLt);
        g.fillStyle = lg; g.fillRect(0, 0, w, h);
        scales(g, 0, 70, w, h - 110, 34, null, Lc('#F3F3DC'), 5);
        g.fillStyle = COL.vaseDk; g.fillRect(0, 40, w, 14);
        // plain foot ring around the base (keeps the scale rows from converging into a star at the pole)
        g.fillStyle = COL.vaseDk; g.fillRect(0, h - 96, w, h);
        g.fillStyle = Lc('#E9EFD9'); g.fillRect(0, h - 104, w, 8);
      });
      mesh(lathe([[0.001, -0.53], [0.22, -0.52], [0.4, -0.43], [0.51, -0.26], [0.55, -0.04], [0.52, 0.16], [0.42, 0.31], [0.3, 0.41], [0.26, 0.46], [0.27, 0.5]], 72).geo,
        texMat(jarTex, { roughness: 0.45, side: THREE.DoubleSide }), jar, null, null, INK.vase);
      const lip = mesh(new THREE.TorusGeometry(0.29, 0.06, 14, 56), std(COL.rim, { roughness: 0.45, metalness: 0.1 }), jar, [0, 0.5, 0], null, INK.gold);
      lip.rotation.x = Math.PI / 2;
      const inside = mesh(new THREE.CircleGeometry(0.26, 40), std(COL.waterDk, { roughness: 0.2 }), jar, [0, 0.47, 0]);
      inside.rotation.x = -Math.PI / 2;
      // cream cloud lug riding on the top of the jar
      const lug = K.puff(vaseG, [0.12, 0.6, 0.2], 0.3, COL.cream, INK.cream);
      lug.rotation.set(-0.45, 0.35, -0.12); lug.scale.set(0.36, 0.25, 0.34);
      // blue curling-wave handle on the image-right side, where the right paw grips it
      const waveMat = std('#96D6F2', { roughness: 0.4 }), waveLite = std(Lc('#E9F6FA'), { roughness: 0.5 });
      const wv = group(vaseG, [0.58, 0.0, 0.3], [0, 0.75, 0]); wv.scale.setScalar(1.3);
      const spiral = (s, turns, n) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, a = Math.PI * 0.5 + t * Math.PI * 2 * turns; const r = s * (1 - 0.8 * t); pts.push([Math.cos(a) * r, Math.sin(a) * r, 0.02 * t]); } return pts; };
      mesh(tube([[-0.24, -0.22, -0.02], [-0.1, -0.14, 0.02], [0.02, 0.02, 0.03]].concat(spiral(0.14, 1.1, 12).map(p => [p[0] + 0.02, p[1] + 0.15, p[2] + 0.03])), t => 0.09 * (1 - 0.55 * t) + 0.015, 64, 14), waveMat, wv, null, null, INK.gold);
      mesh(tube(spiral(0.085, 1.0, 10).map(p => [p[0] + 0.03, p[1] + 0.14, p[2] + 0.1]), t => 0.03 * (1 - 0.5 * t) + 0.008, 32, 8), waveLite, wv);
      mesh(tube([[-0.02, -0.1, 0.03], [0.12, -0.22, 0.05], [0.26, -0.24, 0.05]], t => 0.045 * (1 - t) + 0.012, 20, 8), waveMat, wv, null, null, INK.gold);

      /* ---------- clear water pouring from the jar mouth down to a splash puddle ---------- */
      const waterG = part('water', body); REF.water = waterG;
      const mouth = VC.clone().addScaledVector(dir, 0.5 * JS);
      const streamTex = canvasTex(512, 64, (g, w, h) => {
        g.fillStyle = '#A4DEF8'; g.fillRect(0, 0, w, h);
        g.filter = 'blur(1.5px)';
        for (let i = 0; i < 9; i++) {
          const y0 = (i + 0.5) / 9 * h, amp = 2 + K.rand() * 3, ph = K.rand() * 6, lw = 2 + K.rand() * 4;
          g.strokeStyle = i % 3 === 0 ? NEKO.rgba(COL.waterDk, 0.55) : 'rgba(246,252,255,0.9)'; g.lineWidth = lw; g.lineCap = 'round';
          g.beginPath(); for (let x = -10; x <= w + 10; x += 8) { const y = y0 + Math.sin(x / w * Math.PI * 4 + ph) * amp; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
        }
        g.filter = 'none';
      });
      streamTex.wrapS = streamTex.wrapT = THREE.RepeatWrapping; streamTex.repeat.set(2, 1);
      const waterMat = texMat(streamTex, { roughness: 0.15, transparent: true, opacity: 0.9, emissive: new THREE.Color(COL.water).convertSRGBToLinear(), emissiveIntensity: 0.12 });
      const toW = (v) => V(v.x * CY + v.z * SY, v.y, -v.x * SY + v.z * CY);
      const mW = toW(mouth);                                   // mouth in world coords
      const WL = (x, y, z) => V(...W2L([x, y, z]));
      const sp = [mouth.clone().addScaledVector(dir, -0.1), mouth.clone().addScaledVector(dir, 0.08),
        WL(mW.x - 0.1, 1.2, mW.z + 0.12), WL(mW.x - 0.22, 0.7, mW.z + 0.12), WL(mW.x - 0.33, 0.05, mW.z + 0.12)];
      const gP = WL(mW.x - 0.33, 0, mW.z + 0.12), gx = gP.x, gz = gP.z;
      mesh(tube(sp, t => 0.2 - 0.06 * Math.pow(t, 0.6) + 0.014 * Math.sin(t * 22), 80, 20), waterMat, waterG, null, null, INK.water);
      const splash = group(waterG, [gx, 0, gz]); REF.splash = splash;
      const puddle = (parent, r, flat) => {
        const rings = [[1, Lc('#D4F0FB')], [0.72, COL.water], [0.42, COL.waterDk], [0.2, Lc('#CDEEFB')]];
        rings.forEach(([k, c], i) => { const m = mesh(new THREE.CylinderGeometry(r * k, r * k * 1.02, 0.012, 48), std(c, { roughness: 0.2 }), parent, [0, 0.006 + i * 0.006, 0], [1, 1, flat || 0.55], i === 0 ? INK.water : null); m.castShadow = false; });
        [0.86, 0.58].forEach((k, i) => { const m = mesh(new THREE.TorusGeometry(r * k, 0.018, 8, 64), std(i ? COL.waterDk : Lc('#BDE6F8'), { roughness: 0.2 }), parent, [0, 0.02, 0], [1, flat || 0.55, 1]); m.rotation.x = Math.PI / 2; m.castShadow = false; });
      };
      puddle(splash, 0.85);
      const splMat = std(COL.water, { roughness: 0.15, transparent: true, opacity: 0.92 });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.3, r = 0.2;
        const d = mesh(dropGeo(0.3, 0.075, 2), splMat, splash, [Math.cos(a) * r, 0.16, Math.sin(a) * r * 0.6], null, INK.water);
        d.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      }
      [[-0.45, 0.45, 0.1, 0.05], [0.4, 0.38, 0.15, 0.045], [-0.3, 0.7, -0.1, 0.035], [0.3, 0.62, 0.05, 0.04], [-0.55, 0.2, 0.2, 0.04], [0.52, 0.18, 0.2, 0.035]]
        .forEach(([x, y, z, r]) => mesh(sphere(r, 16, 12), splMat, splash, [x, y, z], [1, 1.3, 1], INK.water));

      /* ---------- rounder white feet with toe grooves ---------- */
      K.feet.forEach(f => { f.scale.set(1.08, 0.68, 1.3); f.position.y = 0.12; f.updateMatrixWorld(); });
      K.feet.forEach(f => {
        [-0.06, 0.06].forEach(ddx => {
          const x = f.position.x + ddx, a = K.onSkin(x, 0.17, [f]).p, b = K.onSkin(x, 0.06, [f]).p;
          mesh(tube([a, a.clone().lerp(b, 0.5).add(V(0, 0, 0.012)), b], 0.012, 8, 6), std('#A89C8E', { roughness: 0.8 }), K.poseG);
        });
      });

      /* ---------- dragon / fish tail fins: pale teal leaf fan behind, two misty-blue fins ---------- */
      const root = V(...K.cfg.tail.pts[0]);
      const finShape = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.42, 0, L); s.quadraticCurveTo(-w * 0.9, L * 0.45, 0, 0); return s; };
      const finTeal = std(COL.finTeal, { roughness: 0.7 }), finBlue = std(COL.finBlue, { roughness: 0.6 });
      const fin = (x, y, z, L, w, ang, mat, ink) => { const m = mesh(extrude(finShape(L, w), 0.035, 0.012), mat, K.tailG, V(x, y, z).sub(root), null, ink); m.rotation.set(0, 0.35, ang); return m; };
      [[1.6, 1.3, -0.56, 0.56, 0.3, -0.18], [1.68, 1.27, -0.58, 0.72, 0.36, -0.69], [1.72, 1.2, -0.58, 0.52, 0.28, -1.1]]
        .forEach(f => fin(f[0], f[1], f[2], f[3], f[4], f[5], finTeal, INK.fin));
      [[1.4, 1.14, -0.52, 0.42, 0.2, 0.13], [1.64, 1.1, -0.5, 0.38, 0.2, -2.05]].forEach(f => fin(f[0], f[1], f[2], f[3], f[4], f[5], finBlue, INK.finBlue));

      /* ---------- 8 decorations as in the picture: two rain clusters (drops + bubbles), two lightning bolts,
                    two curling water swirls, and two patches of sprouts in ripple puddles ---------- */
      const boltShape = [[0.1, 0.5], [-0.2, -0.02], [0.0, -0.02], [-0.12, -0.5], [0.22, 0.08], [0.02, 0.08]];
      const boltMat = std(COL.bolt, { roughness: 0.5, emissive: new THREE.Color(COL.bolt).convertSRGBToLinear(), emissiveIntensity: 0.25 });
      const bubbleMat = std(COL.water, { roughness: 0.2, transparent: true, opacity: 0.85 });
      const bobbers = [];
      const rain = (drops, bubbles) => {
        const g = group(K.decor);
        drops.forEach(([x, y, z, sc]) => bobbers.push(K.drop(g, [x, y, z], sc, COL.drop)));
        bubbles.forEach(([x, y, z, r]) => bobbers.push(mesh(sphere(r, 16, 12), bubbleMat, g, [x, y, z], null, INK.water)));
      };
      rain([[-1.5, 3.55, 0.3, 0.5], [-1.62, 2.67, 0.4, 0.34], [-1.8, 1.78, 0.5, 0.22], [-1.85, 1.3, 0.6, 0.3]], [[-1.4, 3.08, 0.4, 0.07], [-2.0, 2.3, 0.2, 0.055]]);
      rain([[1.6, 3.64, 0.2, 0.32], [1.92, 2.52, 0.3, 0.32], [2.05, 0.92, 0.5, 0.28]], [[1.55, 3.3, 0.3, 0.06], [1.5, 2.3, 0.4, 0.06], [2.2, 1.5, 0.5, 0.055]]);
      [[-1.85, 3.12, 0.2, 0.72, 0.1], [1.8, 3.02, 0.2, 0.72, -0.05]].forEach(([x, y, z, sc, r]) => {
        const g = group(K.decor, [x, y, z], [0, 0, r]); g.scale.setScalar(sc);
        mesh(extrude(boltShape, 0.08, 0.02), boltMat, g, null, null, INK.antler); bobbers.push(g);
      });
      [[-1.5, 2.1, 0.3, 1.15], [1.8, 2.08, 0.2, -1.15]].forEach(([x, y, z, fl]) => {
        const g = group(K.decor, [x, y, z]); g.scale.set(fl, Math.abs(fl), Math.abs(fl));
        const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 2.6, r = 0.05 + 0.2 * t; pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.8, 0]); }
        pts.push([-0.3, -0.18, 0], [-0.62, -0.08, 0]);
        mesh(tube(pts, t => 0.04 * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, t * 1.1))) + 0.008, 90, 10), std(COL.drop, { roughness: 0.35 }), g, null, null, INK.blue);
        mesh(tube([[0.1, -0.2, 0.02], [0.35, -0.28, 0.02], [0.62, -0.2, 0.02]], t => 0.03 * (1 - t) + 0.008, 20, 8), std(Lc('#BFE7FA'), { roughness: 0.4 }), g);
        bobbers.push(g);
      });
      const leafMat = std(COL.sprout, { roughness: 0.7, side: THREE.DoubleSide }), stemMat = std(COL.sproutDk, { roughness: 0.7 });
      const leaf = K.leafGeo(0.36, 0.2);
      const sprouts = (list) => {
        const patch = group(K.decor);
        list.forEach(([x, z, sc]) => {
          const g = group(patch, [x, 0, z]); g.scale.setScalar(sc);
          mesh(tube([[0, 0, 0], [0.02, 0.25, 0], [0, 0.5, 0]], 0.026, 12, 8), stemMat, g, null, null, '#5C7E3C');
          [-1, 1].forEach(k => { const l = mesh(leaf, leafMat, g, [0, 0.48, 0]); l.rotation.set(0, 0, -k * 1.15); });
          puddle(g, 0.55);
        });
      };
      sprouts([[-2.0, 0.5, 1.0]]);
      sprouts([[2.0, 0.2, 0.95], [1.55, 1.3, 0.75], [0.95, 1.75, 0.62]]);
      bobbers.forEach(o => { o.userData.y0 = o.position.y; });

      /* ---------- soft vertical folds in the outer robe and inner robe, stronger toward the hem ---------- */
      const foldMesh = (m, amp, n, yTop, yHem) => {
        const pa = m.geometry.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), ph = Math.atan2(x, z);
          const f = 1 + amp * sst(yTop, yHem, y) * Math.sin(ph * n + 0.6);
          pa.setXYZ(i, x * f, y, z * f);
        }
        pa.needsUpdate = true; K.smoothNormals(m.geometry);
      };
      K.body.traverse(o => { if (o.isMesh && o.parent && o.parent.userData.part === 'cape' && o.geometry.type === 'LatheGeometry') foldMesh(o, 0.035, 13, 1.7, 0.3); });
      if (K.robeMesh) foldMesh(K.robeMesh, 0.02, 15, 1.2, 0.3);

      /* ---------- three-quarter stance (after all surface ray casts) ---------- */
      K.body.rotation.y = YAW;
      K.headG.rotation.y = HEAD_YAW;

      /* ---------- gentle motion: bobbing decor, flowing water, splash pulsing ---------- */
      K.onTick((t, k) => {
        bobbers.forEach((o, i) => { o.position.y = o.userData.y0 + 0.05 * Math.sin(t * 1.3 + i * 1.1) * k; });
        streamTex.offset.x = k > 0 ? -((t * 0.9) % 1) : 0;
        splash.scale.set(1, 1 + 0.06 * Math.sin(t * 6) * k, 1);
      });
    },

    action: {
      label: '倒水', dur: 2.2,
      run(s, p, K) {
        // nod toward the sprouts and tip the jar a little further
        K.headG.rotation.x = 0.12 * s;
        if (REF.vase) REF.vase.rotation.z = 0.08 * s;
        if (REF.splash) REF.splash.scale.x = REF.splash.scale.z = 1 + 0.25 * s;
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '倒出春雨的小龍王',
        text: '雨水時節，灰色英國短毛貓化身溫和的龍王（雨水神）：頭戴金色小龍角與水滴冠，雙爪捧著魚鱗紋寶瓶緩緩倒出清水，腳邊水窪冒出新芽，身旁飄著雨滴、閃電與水紋，象徵春雨潤物、萬物萌發。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '圓臉與藍灰虎斑',
        text: '頭頂平、兩側直、下巴圓的大圓臉是英國短毛貓的招牌。霧灰色毛皮上，額頭有三道藍灰虎斑（中間最長），眼睛上方各一顆深色小圓點，兩頰最外側各一抹藍灰斑。眼周到下巴轉為奶白色，深棕大圓眼、灰色小鼻、ω 形微笑，眼下泛著粉色腮紅。' },
      hat: { chip: '龍角冠', tag: '服飾', name: '龍角水滴冠',
        text: '頭頂一頂小巧的青綠圓冠：外捲的冠圈、淡金冠帶與有直條紋的圓頂，正前方綴著奶白祥雲。冠前立著一顆比冠還高的晶亮水藍大水滴，兩側長出粗短圓潤的金黃小龍角，每支有向上、朝外與內側三個分叉。' },
      vase: { chip: '寶瓶', tag: '道具', name: '魚鱗紋寶瓶',
        text: '青瓷色的圓肚寶瓶側躺著，布滿奶白魚鱗紋，金色瓶口朝畫面左下方傾倒。畫面左側的爪子抬高扶住瓶身左側，右側的爪子握著瓶上的藍色浪花把手；瓶頂趴著一朵奶白祥雲。' },
      water: { chip: '清水', tag: '道具', name: '緩緩倒出的清水',
        text: '一道帶白色亮紋的淺水藍水柱從瓶口流下，落地濺起一圈水花，在地上形成層層漣漪的水窪，代表雨水節氣降下滋潤大地的春雨。' },
      cape: { chip: '外袍', tag: '服飾', name: '米白開襟外袍',
        text: '最外層是淡米白色的開襟長袍，前襟以霧水藍滾邊、內側露出淡青綠貼邊，袍面點綴小嫩芽與漩渦水紋，下襬收一道淡青綠邊，布面有自然垂下的直褶。' },
      yoke: { chip: '雲肩', tag: '服飾', name: '魚鱗紋雲肩', dir: [0.5, 0.5, 1],
        text: '肩頭披著淡青綠的魚鱗紋雲肩，一片片鱗紋像龍身的鱗甲，下緣是一圈淡金色的波浪滾邊，在畫面右肩看得最清楚。' },
      robe: { chip: '大袖', tag: '服飾', name: '垂墜大袖與交領',
        text: '畫面右側的袖子從前臂長長垂到膝下，米白袖面繡著嫩芽與層層海水紋，袖口內緣露出一道霧水藍；畫面左側手臂抬起，袖口正對前方，看得見整片霧水藍內裡與一圈米白鑲邊。頸口是水藍滾邊的交領，外袍下露出淡青綠內袍。' },
      apron: { chip: '圍裳', tag: '服飾', name: '水窪紋圍裳與水滴墜', dir: [0.3, 0.1, 1],
        text: '身前垂著一片米白色圍裳，四周鑲淡金寬邊、下角圓潤，底部畫著一圈濺起水花的小水窪；上方青綠腰帶掛著金色小鉤、金珠與藍色水滴墜，和冠頂的大水滴互相呼應。袍襬下露出霧藍色褲管與一雙白色圓腳掌。' },
      tail: { chip: '龍魚尾', tag: '貓咪本體', name: '魚鱗龍尾', dir: [1, 0.25, -0.7],
        text: '尾巴從袍子右後方向畫面右上翹起，中段最粗、尾端尖尖的，灰色尾身覆著一片片藍灰魚鱗；後方張開三片淡青綠葉狀鰭與兩片水藍小鰭，像小龍又像魚尾。' },
      pose: { chip: '姿態', tag: '貓咪本體', name: '捧瓶倒水',
        text: '雙腳站穩、身體微微轉向畫面左方，兩隻前爪一高一低抱住寶瓶：左爪抬高扶著瓶身，右爪握住浪花把手，專心把清水倒給地上的新芽。按下「倒水」可以看牠點頭、把寶瓶再傾斜一點。' }
    },
    order: ['overview', 'face', 'hat', 'vase', 'water', 'cape', 'yoke', 'robe', 'apron', 'tail', 'pose']
  });
})();
