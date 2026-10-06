// @file 08_小滿_梨花貓
// @title 小滿・穀穗官吏 | 二十四節氣貓
(function () {
  // The renderer's lights brighten front-facing surfaces by roughly 1.45x (linear). M() turns a colour
  // SAMPLED from refs/08.png into the material colour that renders back to about that value.
  function M(hex, f) {
    f = f || 1.45; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f, 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

  // ---- colours sampled from refs/08.png (tools/colors.py), then light-compensated ----
  const FUR = M('#F9BC6B'), FUR_TOP = M('#F5B263'), FUR_MID = M('#FAC174'), FUR_LOW = M('#FBC87C');
  const STRIPE = M('#EA9A4A'), CREAM = M('#FDF8ED', 1.15), INK = '#D08A48', CREAM_INK = '#E0C49C';
  const GREEN = M('#A2AA79'), GREEN_DK = M('#8F9A69'), GREEN_LT = M('#BFC08C'), GREEN_INK = '#727C50';
  const RED = M('#D97446', 1.3), RED_INK = '#B0552F';
  const GOLD = M('#F0C675'), GOLD_LT = M('#FBD48B', 1.3), GOLD_INK = '#C0914A';
  const BELT = M('#957350'), BOOT = M('#A98563'), BOOT_INK = '#735740';
  const STRAW = M('#F7D09C', 1.3), STRAW_DK = M('#D8A86C'), STRAW_INK = '#B8864E';
  const JADE = M('#AABC92'), IVORY = M('#FBF3E3', 1.2), ROBE_INK = '#CBA873';
  const RICE = M('#F5CE89'), RICE_DK = M('#E6AF5C'), RICE_INK = '#C98F3E';
  const POUCH = M('#E7B77B'), PAPER = M('#F5E2BF', 1.25);

  /* ---- straw hat placement (K.head coordinates) — shared by the hat build and the head deform ---- */
  const HEAD_Y = 2.38;
  const HAT = {
    pos: [0.0, 2.53, -0.05], rot: [-0.4, 0, 0],
    prof: [[1.2, -0.1], [1.05, -0.01], [0.85, 0.11], [0.64, 0.24], [0.44, 0.37]],
    crown: [[0.45, 0.33], [0.45, 0.47], [0.43, 0.57], [0.34, 0.64], [0.001, 0.67]]
  };
  function hatCeil(r) {            // height of the inside of the straw cone at radius r (hat-local)
    const p = HAT.prof;
    if (r >= p[0][0]) return p[0][1];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      if (r <= a[0] && r >= b[0]) return lerp(a[1], b[1], (a[0] - r) / (a[0] - b[0]));
    }
    return 0.6;                    // under the crown
  }
  let HM = null, HMi = null;
  function hatMats() {
    if (HM) return;
    HM = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(HAT.rot[0], HAT.rot[1], HAT.rot[2]));
    HM.setPosition(new THREE.Vector3(HAT.pos[0], HAT.pos[1], HAT.pos[2]));
    HMi = HM.clone().invert();
  }

  // 3-pair leaf sprig (robe / sleeve / pouch motif)
  function sprig(D, g, x, y, s, color, ang) {
    g.save(); g.translate(x, y); g.rotate(ang || 0);
    g.strokeStyle = color; g.lineCap = 'round'; g.lineWidth = Math.max(2, s * 0.06);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.04, -s * 0.5, -s * 0.02, -s * 0.92); g.stroke();
    [[0.3, 0.32], [0.52, 0.3], [0.72, 0.26]].forEach(([t, l]) => {
      D.leaf(g, 0, -s * t, s * l, 0.9, color); D.leaf(g, 0, -s * t, s * l, -0.9, color);
    });
    D.leaf(g, -s * 0.02, -s * 0.9, s * 0.2, 0.05, color);
    g.restore();
  }
  // two-leaf sprout (cream robe & sleeves)
  function twoLeaf(D, g, x, y, s, color, ang) {
    g.save(); g.translate(x, y); g.rotate(ang || 0);
    g.strokeStyle = color; g.lineWidth = Math.max(2, s * 0.08); g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s * 0.9); g.stroke();
    D.leaf(g, 0, -s * 0.25, s * 0.5, 0.75, color); D.leaf(g, 0, -s * 0.4, s * 0.5, -0.75, color);
    D.leaf(g, 0, -s * 0.8, s * 0.35, 0.1, color);
    g.restore();
  }

  let riceG = null;

  NEKO.run({
    meta: {
      id: '08', term: '小滿', title: '小滿・穀穗官吏', seal: '滿',
      eyebrow: '二〇二七節氣貓 · 08 小滿 · 梨花貓',
      aria: '戴著綴有玉珠與穀穗的寬邊草斗笠、披奶白雲肩、穿米白長袍與綠色對襟外袍，左手舉著紅繩綁的金黃穀穗束、右手握著卷軸的橘白長毛貓 3D 模型'
    },
    theme: { accent: '#5F6B3A', accentDark: '#C9CF98', glow: 'rgba(191, 192, 140, 0.32)', glowColor: '#DCDDA0' },
    palette: [['#F9BC6B', '杏橘'], ['#FDF8ED', '奶油白'], ['#A2AA79', '稻葉綠'], ['#D97446', '柿紅']],
    spec: [['品種', '橘白長毛貓（年曆標註梨花貓）'], ['角色', '小滿穀穗官吏'], ['頭身比', '約 1 : 1.2']],
    seed: 208,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR_MID, low: FUR_LOW, deep: STRIPE, cream: CREAM,
        ink: INK, creamInk: CREAM_INK, noise: { colors: [M('#FFE6C4'), M('#EE9F50')], alpha: 0.07, n: 1000 },
        paintBase(g, P) {
          const L = (lo, la) => P.xy(lo, la);
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.5, FUR_MID); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // tabby streaks around the crown and the back of the head
          g.filter = 'blur(4px)';
          for (let lon = -168; lon <= 170; lon += 24) {
            if (Math.abs(lon) < 56) continue;
            const s = lon > 0 ? 1 : -1;
            P.stroke(g, [L(lon, 86), L(lon + 6 * s, 40), L(lon + 2 * s, -30)], 20, STRIPE, 0.55);
          }
          // forehead streaks radiating from the crown toward the white blaze
          g.filter = 'blur(2.5px)';
          [[-44, -52, 14], [-31, -36, 20], [-18, -20, 28], [-6, -7, 34], [7, 8, 34], [19, 24, 26], [32, 40, 16], [45, 56, 8]].forEach(([lt, lb, latB]) => {
            P.stroke(g, [L(lt * 0.4, 88), L(lt, 60), L(lb, latB)], 13, STRIPE, 0.9);
          });
          // narrow white flame blaze up the forehead + white eye area, muzzle and chin;
          // the orange reaches lower on the image-right cheek than on the image-left one
          const poly = [[-3, 33], [2, 30], [6, 22], [11, 15], [17, 8], [24, 3], [31, -2], [36, -8], [40, -15], [48, -21], [62, -26], [90, -32], [130, -40], [180, -60], [180, -90],
            [-180, -90], [-180, -52], [-110, -40], [-78, -30], [-58, -18], [-44, -6], [-38, 2], [-30, 7], [-22, 9], [-14, 13], [-9, 20], [-5, 27]];
          g.filter = 'blur(6px)'; g.fillStyle = CREAM; g.beginPath();
          poly.forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill();
          // cheek stripes on the orange outer cheeks
          g.filter = 'blur(2.5px)';
          [[[44, 2], [60, -1], [82, -2]], [[48, -11], [64, -15], [86, -17]]].forEach(s => P.stroke(g, s.map(([a, b]) => L(a, b)), 10, STRIPE, 0.75));
          [[[54, -30], [68, -34], [86, -37]]].forEach(s => P.stroke(g, s.map(([a, b]) => L(a, b)), 9, M('#F6C07A'), 0.8));
          [[[-50, 12], [-64, 9], [-84, 8]], [[-54, 0], [-68, -3], [-88, -4]]].forEach(s => P.stroke(g, s.map(([a, b]) => L(a, b)), 10, STRIPE, 0.7));
          g.filter = 'none';
        }
      },
      head: { y: HEAD_Y, w: 0.7, h: 0.72, d: 0.8, cheek: 0.17, ruff: 0.06, ruffFreq: 13, chinDrop: 0.03,
        // wider forehead, and keep the whole crown tucked under the tipped-back straw hat
        deform(p, o) {
          p.x *= 1 + 0.12 * sst(-0.1, 0.6, o.y);
          hatMats();
          const v = new THREE.Vector3(p.x, p.y + HEAD_Y, p.z).applyMatrix4(HMi);
          const ceil = hatCeil(Math.hypot(v.x, v.z)) - 0.1;
          if (v.y > ceil - 0.08) {
            v.y = smin(v.y, ceil, 0.14); v.applyMatrix4(HM);
            p.x = v.x; p.y = v.y - HEAD_Y; p.z = v.z;
          }
        },
        fur: { layers: 18, length: 0.055, gravity: 0.025, repeat: [9, 5] } },
      eyes: { x: 0.27, y: -0.07, r: 0.072, sx: 0.95, sy: 1.04, sz: 0.45, color: '#4E3019', shine: 0.7 },
      nose: { y: -0.15, color: M('#FAB9A4'), size: 0.66 },
      muzzle: { y: -0.21, size: 0.34, color: CREAM },
      mouth: { type: 'w', color: '#6B4632', y: -0.225, w: 0.115, depth: 0.05 },
      blush: { color: 'rgba(246,156,146,0.7)', x: 0.4, y: -0.2, r: 34 },
      whiskers: { color: '#E6D8C4', n: 3, len: 0.4, r: 0.0045, y: -0.2, x: 0.16, spread: 0.07, droop: 0.05, curve: 0.04 },
      ears: { x: 0.58, y: 0.36, z: -0.04, tilt: 0.42, yaw: 0.2, pitch: -0.06, size: [0.44, 0.62, 0.16], sharp: 0.85,
        color: FUR, inner: M('#FAD6C4', 1.3), tuft: M('#FFF8EE', 1.15),
        R: { tilt: 0.5, y: 0.34 } },
      bib: { color: CREAM, balls: [[0, 1.77, 0.28, 0.16], [0.14, 1.74, 0.25, 0.11], [-0.14, 1.74, 0.25, 0.11]],
        fur: { layers: 14, length: 0.07, gravity: 0.03, repeat: [3, 2] } },
      robe: {
        profile: [[0.8, 0.1], [0.83, 0.18], [0.79, 0.4], [0.7, 0.7], [0.6, 1.0], [0.52, 1.25], [0.46, 1.48], [0.33, 1.66], [0.1, 1.76]],
        color: '#FFFFFF', ink: ROBE_INK, lining: IVORY, hemY: 0.34,
        paint(g, w, h, D) { D.fill(g, IVORY); }
      },
      collar: false,
      arms: {
        L: { hand: [-0.7, 1.55, 0.46], path: [[-0.42, 1.5, 0.0], [-0.66, 1.4, 0.2], [-0.74, 1.46, 0.38]], wrist: false, pawScale: 1.1 },
        R: { hand: [0.53, 1.29, 0.64], path: [[0.42, 1.5, 0.0], [0.6, 1.24, 0.3], [0.52, 1.22, 0.55]], wrist: false, pawScale: 1.1 }
      },
      sleeves: false,
      paws: { color: CREAM, ink: CREAM_INK },
      belt: false,
      feet: { type: 'boot', x: 0.38, z: 0.44, boot: { color: BOOT, trim: GOLD, sole: M('#E0AE68'), shaft: 0.1, ink: BOOT_INK } },
      tail: {
        pts: [[0.35, 0.42, -0.5], [0.75, 0.33, -0.52], [1.15, 0.41, -0.46], [1.36, 0.63, -0.4], [1.3, 0.88, -0.34], [1.2, 1.07, -0.3], [1.28, 1.2, -0.26], [1.45, 1.17, -0.22], [1.53, 0.97, -0.18]],
        r: 0.29, tip: CREAM, tipStart: 0.62,
        shape: t => t < 0.2 ? 0.55 + 0.45 * sst(0, 0.2, t) : t < 0.8 ? 1 - 0.14 * sst(0.45, 0.8, t) : 0.86 * (1 - 0.35 * sst(0.8, 0.93, t)) * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.8) / 0.2, 2.4))),
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, M('#F6B866')); lg.addColorStop(0.45, M('#F8C27A')); lg.addColorStop(0.55, M('#FCDDB0', 1.25)); lg.addColorStop(0.64, M('#FDF1DC', 1.3)); lg.addColorStop(1, M('#FDF4E2', 1.3));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.fillStyle = M('#EFA24E');
          [[0.1, 0.055], [0.21, 0.065], [0.32, 0.065], [0.43, 0.055], [0.52, 0.035]].forEach(([c, bw]) => {
            const x0 = (c - bw / 2) * w, x1 = (c + bw / 2) * w, n = 8;
            g.beginPath(); g.moveTo(x0, 0);
            for (let i = 0; i <= n; i++) g.lineTo(x0 + (i % 2 ? -14 : 10), i / n * h);
            for (let i = n; i >= 0; i--) g.lineTo(x1 + (i % 2 ? 14 : -10), i / n * h);
            g.closePath(); g.fill();
          });
        },
        fur: { layers: 16, length: 0.065, gravity: 0.015, repeat: [16, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, lathe, ribbon, D } = K;
      const HY = K.cfg.head.y;
      const q = (from, to) => new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
      const leafShape = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.45, 0, L); s.quadraticCurveTo(-w, L * 0.45, 0, 0); return s; };
      const goldMat = std(GOLD, { roughness: 0.45, metalness: 0.1 });
      const leafMat = std(GREEN_LT, { roughness: 0.75, side: THREE.DoubleSide }), leafMat2 = std(M('#A7B07A'), { roughness: 0.75, side: THREE.DoubleSide });
      const riceMat = std(RICE, { roughness: 0.6 }), riceMat2 = std(M('#F8D99B', 1.3), { roughness: 0.6 });
      const redMat = std(RED, { roughness: 0.7 }), redMatD = std(RED, { roughness: 0.7, side: THREE.DoubleSide });

      /* ---------------- grain ear helper (two rows of plump grains along a curve) ---------------- */
      const grainGeo = sphere(1, 14, 10);
      function ear(parent, pts, n, gs, face) {
        const cv = K.curve3(pts), fv = (face || V(0, 0, 1)).clone().normalize();
        mesh(tube(cv, t => 0.014 * (1 - 0.5 * t), 24, 6), std(RICE_DK, { roughness: 0.7 }), parent);
        for (let i = 0; i < n; i++) {
          [-1, 1].forEach(k => {
            const t = Math.min(0.08 + 0.86 * (i + (k > 0 ? 0.5 : 0)) / n, 1);
            const p = cv.getPointAt(t), T = cv.getTangentAt(t);
            let sv = T.clone().cross(fv); if (sv.lengthSq() < 1e-4) sv = T.clone().cross(V(1, 0, 0)); sv.normalize();
            const sz = gs * (1 - 0.45 * Math.pow(t, 2.5));
            const dir = T.clone().multiplyScalar(0.85).addScaledVector(sv, 0.55 * k).normalize();
            const m = mesh(grainGeo, (i + (k > 0 ? 1 : 0)) % 3 ? riceMat : riceMat2, parent, p.clone().addScaledVector(sv, k * sz * 0.42).addScaledVector(fv, 0.004 * k), [sz * 0.58, sz, sz * 0.5], RICE_INK);
            m.quaternion.copy(q(V(0, 1, 0), dir));
          });
        }
        const tip = cv.getPointAt(1), Tt = cv.getTangentAt(1);
        mesh(grainGeo, riceMat, parent, tip.clone().addScaledVector(Tt, gs * 0.3), [gs * 0.45, gs * 0.8, gs * 0.42], RICE_INK).quaternion.copy(q(V(0, 1, 0), Tt));
      }

      /* ---------------- face: freckles in the blush ---------------- */
      {
        const g = K.headTex.image.getContext('2d');
        [-1, 1].forEach(sx => [-0.03, 0.03].forEach(dx => {
          const s = K.onSkin(sx * 0.4 + dx, HY - 0.205, [K.headMesh]);
          if (!s.uv) return;
          g.fillStyle = 'rgba(232,120,110,0.85)'; g.beginPath(); g.arc(s.uv.x * 1024, (1 - s.uv.y) * 512, 2.4, 0, Math.PI * 2); g.fill();
        }));
        K.headTex.needsUpdate = true;
      }

      /* ---------------- pointed long-hair tufts along the lower cheeks ---------------- */
      {
        const edgeX = (y) => { let lo = 0, hi = 1.4; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; } return lo; };
        const wm = std(CREAM, { roughness: 0.95 }), om = std(M('#FBCB86'), { roughness: 0.95 });
        [-1, 1].forEach(sx => {
          [[0.0, 0, 0.1, 0.05], [-0.12, 14, 0.12, 0.055], [-0.24, 30, 0.12, 0.05], [-0.36, 48, 0.11, 0.045]].forEach(([dy, ang, len, r0], i) => {
            const y = HY + dy, ex = edgeX(y), a = ang * Math.PI / 180, z = [0.05, -0.05, 0.08, -0.03][i];
            const root = V(sx * (ex - 0.06), y, z), d = V(sx * Math.cos(a), -Math.sin(a), 0.1).normalize();
            const mid = root.clone().addScaledVector(d, len * 0.55).add(V(0, -0.02, 0)), tip = root.clone().addScaledVector(d, len);
            const orange = sx > 0 && i < 2;
            mesh(tube([root, mid, tip], t => r0 * (1 - Math.pow(t, 1.2)) + 0.003, 16, 8), orange ? om : wm, K.faceG, null, null, orange ? INK : CREAM_INK);
          });
        });
      }

      /* ---------------- white fur tufts inside the ears ---------------- */
      {
        const tm = std(M('#FFF8EE', 1.1), { roughness: 0.95 });
        K.ears.forEach(({ g, sx }) => {
          [[-0.08, 0.04, 0.2, 0.06], [0.0, 0.05, 0.18, 0.058], [0.08, 0.03, 0.14, 0.05]].forEach(([x, y, len, r0]) => {
            const a = V(x * sx, y, 0.1), d = V(-0.25 * sx - x * sx, 1, 0.35).normalize();
            const b = a.clone().addScaledVector(d, len * 0.55), c = a.clone().addScaledVector(d, len);
            mesh(tube([a, b, c], t => r0 * (1 - Math.pow(t, 1.3)) + 0.004, 16, 8), tm, g, null, null, CREAM_INK);
          });
        });
      }

      /* ---------------- inner cream robe: gold hem lines, green centre panel, sprouts, red under-flap ---------------- */
      {
        const tex = K.robeMesh.material.map, g = tex.image.getContext('2d');
        const pxW = (y, world) => world / (2 * Math.PI * K.robeR(y)) * 1024;
        const poly = (y0, y1, half, color) => {
          g.fillStyle = color; g.beginPath();
          const n = 20, pts = [];
          for (let i = 0; i <= n; i++) { const y = lerp(y0, y1, i / n); pts.push([512 - pxW(y, half), K.robeV(y)]); }
          for (let i = n; i >= 0; i--) { const y = lerp(y0, y1, i / n); pts.push([512 + pxW(y, half), K.robeV(y)]); }
          pts.forEach(([x, yy], i) => i ? g.lineTo(x, yy) : g.moveTo(x, yy)); g.closePath(); g.fill();
        };
        poly(0.1, 1.15, 0.085, GOLD);
        poly(0.1, 1.15, 0.07, GREEN);
        [0.21, 0.155].forEach(y => { g.fillStyle = GOLD; g.fillRect(0, K.robeV(y) - 3, 1024, 6); });
        const lf = M('#A5B07B');
        [[-24, 0.34, 70], [22, 0.32, 70], [-30, 0.62, 56], [27, 0.6, 56], [60, 0.4, 60], [-62, 0.42, 60], [110, 0.45, 60], [-110, 0.45, 60], [180, 0.45, 60]].forEach(([deg, y, s], i) => {
          const [x, yy] = K.robeUV(deg, y); twoLeaf(D, g, x, yy, s, lf, i % 2 ? 0.15 : -0.15);
        });
        [[16, 0.5], [-17, 0.47], [33, 0.26]].forEach(([deg, y]) => { const [x, yy] = K.robeUV(deg, y); D.blob(g, x, yy, 7, 10, M('#EFC27A'), 0.9, 0.5); });
        // orange-red under-layer peeking out beside the image-left coat edge
        { const a = K.robeUV(-44, 1.0), b = K.robeUV(-28, 1.0), c = K.robeUV(-25, 0.72), d = K.robeUV(-44, 0.78); g.fillStyle = RED; g.beginPath(); [a, b, c, d].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); }
        tex.needsUpdate = true;
      }

      /* ---------------- green open outer coat (對襟外袍) ---------------- */
      const coatPts = [[0.95, 0.33], [0.91, 0.45], [0.8, 0.7], [0.71, 0.95], [0.63, 1.15], [0.57, 1.35], [0.51, 1.52], [0.42, 1.66], [0.32, 1.75]];
      const coatProf = new THREE.SplineCurve(coatPts.map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(80);
      const coatR = (y) => { for (let i = 0; i < coatProf.length - 1; i++) { const a = coatProf[i], b = coatProf[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < 0.33 ? 0.95 : 0.32; };
      const gapW = (y) => lerp(lerp(0.52, 0.37, sst(0.33, 1.1, y)), lerp(0.03, 0.2, sst(1.25, 1.74, y)), sst(1.09, 1.25, y));
      const phiH = (y) => Math.asin(Math.min(gapW(y) / coatR(y), 0.97));
      {
        const Y0 = 0.33, Y1 = 1.75, nu = 140, nv = 56, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, y = lerp(Y0, Y1, t), r = coatR(y), ph = phiH(y);
          for (let i = 0; i <= nu; i++) { const phi = ph + (Math.PI * 2 - 2 * ph) * i / nu; pos.push(Math.sin(phi) * r, y, Math.cos(phi) * r); uv.push(i / nu, t); }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const tex = canvasTex(2048, 512, (g, w, h) => {
          D.fill(g, GREEN);
          const rowY = (y) => (1 - (y - Y0) / (Y1 - Y0)) * h;
          const uPx = (y, world) => world / (coatR(y) * (Math.PI * 2 - 2 * phiH(y))) * w;
          const edgeBand = (i0, i1, yA, yB, color) => {
            g.fillStyle = color;
            [0, 1].forEach(side => {
              const A = [], B = [];
              for (let k = 0; k <= 30; k++) { const y = lerp(yA, yB, k / 30); A.push([uPx(y, i0), rowY(y)]); B.push([uPx(y, i1), rowY(y)]); }
              g.beginPath(); A.concat(B.reverse()).forEach(([x, yy], i) => { const X = side ? w - x : x; i ? g.lineTo(X, yy) : g.moveTo(X, yy); }); g.closePath(); g.fill();
            });
          };
          // lapels above the belt: slightly deeper green with a fine dark edge
          edgeBand(0, 0.1, 1.15, Y1, GREEN_DK);
          edgeBand(0.1, 0.108, 1.15, Y1, M('#7F8A5A'));
          // gold borders on the skirt panels
          edgeBand(0, 0.02, Y0, 1.12, GOLD);
          edgeBand(0.07, 0.085, Y0 + 0.07, 1.12, GOLD);
          g.fillStyle = GOLD; g.fillRect(0, rowY(Y0 + 0.022), w, rowY(Y0) - rowY(Y0 + 0.022) + 2);
          g.fillRect(uPx(Y0, 0.07), rowY(Y0 + 0.085), w - 2 * uPx(Y0, 0.07), rowY(Y0 + 0.07) - rowY(Y0 + 0.085));
          // gold wheat sprigs on the skirt panels (front and all around)
          const gc = M('#E9C77C', 1.3);
          [[0.06, 0.6], [0.94, 0.6], [0.12, 0.72], [0.88, 0.72], [0.2, 0.6], [0.8, 0.6], [0.35, 0.62], [0.5, 0.62], [0.65, 0.62]].forEach(([u, y]) => sprig(D, g, u * w, rowY(y - 0.2), 150, gc, (u < 0.5 ? -0.12 : 0.12)));
        });
        const coat = mesh(geo, texMat(tex, { roughness: 0.9 }), K.robeG, null, null, GREEN_INK);
        const lin = new THREE.Mesh(geo, std(RED, { side: THREE.BackSide, roughness: 0.9 })); lin.receiveShadow = true; K.robeG.add(lin);
        const hem = []; for (let k = 0; k <= nu; k++) hem.push(V(pos[k * 3] * 1.004, Y0 + 0.004, pos[k * 3 + 2] * 1.004));
        mesh(tube(hem, 0.012, 200, 6), std(GOLD_INK, { roughness: 0.7 }), K.robeG);
        coat.userData.coat = true;
      }

      /* ---------------- belt: brown leather band, green top edge, gold flower medallion ---------------- */
      {
        const yT = 1.25, yB = 1.1, yK = (yT + yB) / 2;
        mesh(new THREE.CylinderGeometry(coatR(yT) + 0.035, coatR(yB) + 0.035, yT - yB, 96, 1, true), std(BELT, { roughness: 0.8, side: THREE.DoubleSide }), K.beltG, [0, yK, 0], null, BOOT_INK);
        mesh(new THREE.CylinderGeometry(coatR(yT + 0.05) + 0.03, coatR(yT) + 0.036, 0.05, 96, 1, true), std(GREEN, { roughness: 0.8, side: THREE.DoubleSide }), K.beltG, [0, yT + 0.025, 0], null, GREEN_INK);
        [yK + 0.035, yK - 0.035].forEach(y => { const r = mesh(new THREE.TorusGeometry(coatR(y) + 0.04, 0.006, 6, 128), std(M('#6F553B'), { roughness: 0.8 }), K.beltG, [0, y, 0]); r.rotation.x = Math.PI / 2; });
        const a = -16 * Math.PI / 180, rr = coatR(yK) + 0.06;
        const md = K.medal(K.beltG, [Math.sin(a) * rr, yK, Math.cos(a) * rr], 0.12, (g) => {
          g.fillStyle = M('#F7D08A', 1.3); g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
          g.strokeStyle = M('#D9A54E'); g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 100, 0, Math.PI * 2); g.stroke();
          g.fillStyle = M('#E2AE55');
          for (let i = 0; i < 4; i++) { const b = i * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.arc(128 + Math.cos(b) * 30, 128 + Math.sin(b) * 30, 26, 0, Math.PI * 2); g.fill(); }
          g.fillStyle = M('#F8DA9C', 1.3); g.beginPath(); g.arc(128, 128, 14, 0, Math.PI * 2); g.fill();
        }, GOLD, GOLD_INK, M('#F7D08A', 1.3));
        md.rotation.y = a;
      }

      /* ---------------- grain pouch (荷包) hanging from the belt ---------------- */
      {
        const pg = group(K.beltG);
        const x = 0.14, y = 0.86, z = Math.sqrt(Math.max(coatR(y) ** 2 - x * x, 0)) + 0.06;
        pg.position.set(x, y, z);
        const pm = std(POUCH, { roughness: 0.8 });
        const body = lathe([[0.001, -0.13], [0.09, -0.11], [0.13, -0.04], [0.115, 0.04], [0.06, 0.09], [0.035, 0.11], [0.05, 0.14]], 40, Math.PI, Math.PI * 2, 30);
        const tex = canvasTex(512, 256, (g, w, h) => {
          D.fill(g, POUCH);
          sprig(D, g, w * 0.5, h * 0.78, 110, M('#FBE7C0', 1.3), 0);
        });
        mesh(body.geo, texMat(tex, { roughness: 0.8 }), pg, null, null, M('#B08050'));
        [-1, 1].forEach(sx => {
          const l = mesh(extrude(leafShape(0.14, 0.07), 0.016, 0.006, 2, 10), std(GREEN, { roughness: 0.75 }), pg, [0.015 * sx, 0.125, 0.06], null, GREEN_INK);
          l.rotation.set(0.3, 0, -sx * 2.0);
        });
        mesh(sphere(0.03, 16, 12), redMat, pg, [0, 0.14, 0.04], null, RED_INK);
        mesh(new THREE.TorusGeometry(0.04, 0.012, 8, 24), redMat, pg, [0, 0.21, 0.02], null, RED_INK);
        mesh(tube([[0, 0.15, 0.01], [0.005, 0.24, -0.02], [0.0, 0.3, -0.06]], 0.01, 12, 6), redMat, pg);
        K.tassel(pg, [0, -0.15, 0], RED, 0.14, 0.022, RED_INK);
        mesh(sphere(0.022, 12, 10), goldMat, pg, [0, -0.135, 0], null, GOLD_INK);
      }

      /* ---------------- 雲肩: puffy cream shoulder cape with green cloud curls, lobed rim ---------------- */
      const capeG = part('cape', K.body);
      {
        const cPts = [[0.97, 1.42], [1.0, 1.5], [0.93, 1.6], [0.76, 1.7], [0.55, 1.78], [0.37, 1.83]];
        const cProf = new THREE.SplineCurve(cPts.map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(48);
        const nu = 140, nv = 30, ZS = 0.9, pos = [], uv = [], idx = [], grid = [];
        const gapAt = t => lerp(0.3, 0.17, sst(0, 1, t));
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, pp = cProf[Math.round(t * (cProf.length - 1))], r = pp.x;
          const ph = Math.asin(Math.min(gapAt(t) / r, 0.95)), row = [];
          for (let i = 0; i <= nu; i++) {
            const phi = ph + (Math.PI * 2 - 2 * ph) * i / nu;
            const lobe = 0.1 * Math.pow(1 - t, 2.2) * (0.5 - 0.5 * Math.cos(phi * 4)) - 0.03 * Math.pow(1 - t, 2);
            const v = V(Math.sin(phi) * r, pp.y - lobe, Math.cos(phi) * r * ZS);
            pos.push(v.x, v.y, v.z); uv.push(i / nu, t); row.push(v);
          }
          grid.push(row);
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const tex = canvasTex(2048, 256, (g, w, h) => {
          D.fill(g, CREAM);
          const cc = M('#B5BD8A');
          [0.06, 0.2, 0.35, 0.5, 0.65, 0.8, 0.94].forEach((u) => D.cloud(g, u * w, h * 0.42, 88, cc, 12));
          g.fillStyle = GOLD; g.fillRect(0, h - 16, w, 8); g.fillRect(4, 0, 8, h); g.fillRect(w - 12, 0, 8, h);
        });
        mesh(geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.95 }), capeG, null, null, ROBE_INK);
        const path = [];
        for (let j = nv; j > 0; j -= 3) path.push(grid[j][0]);
        for (let i = 0; i <= nu; i += 2) path.push(grid[0][i]);
        for (let j = 3; j <= nv; j += 3) path.push(grid[j][nu]);
        mesh(tube(path.map(v => V(v.x * 1.01, v.y, v.z * 1.01)), 0.026, 320, 10), std(CREAM, { roughness: 0.95 }), capeG, null, null, ROBE_INK);
      }

      /* ---------------- wide hanging sleeves (廣袖) ----------------
         Each sleeve is a bag lofted from a small ring at the shoulder (hidden under the 雲肩) to a tall,
         slanted cuff ellipse that starts just under the paw and runs down to the hanging corner. Looking
         into the open cuff shows the persimmon lining as the long diagonal red band of the picture.
         A shorter green coat sleeve hangs behind each cream one. */
      const sleevesG = group(K.robeG);
      // hanging sleeve bag: vertical cross-sections (yB(t)…yT(t), half-thickness W(t)) swept along a horizontal
      // spine from the shoulder to the cuff; slant(t) leans the cuff so its top sits under the paw.
      function sleeveBag(o) {
        const spine = new THREE.CatmullRomCurve3(o.spine.map(([x, z]) => V(x, 0, z)));
        const NT = 64, NA = 56, pos = [], uv = [], idx = [], ring = [];
        for (let i = 0; i <= NT; i++) {
          const t = i / NT, C = spine.getPointAt(t), T = spine.getTangentAt(t);
          T.y = 0; T.normalize();
          const n = V(T.z, 0, -T.x);
          const yT = o.yT(t), yB = o.yB(t), W = o.W(t), mid = (yT + yB) / 2, half = (yT - yB) / 2, sl = o.slant ? o.slant(t) : 0;
          for (let j = 0; j <= NA; j++) {
            const a = j / NA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            const y = mid + half * Math.sign(ca) * Math.pow(Math.abs(ca), 0.75);
            const hgt = (y - yB) / (yT - yB);
            const sw = W * Math.sign(sa) * Math.pow(Math.abs(sa), 0.7) * (0.85 + 0.35 * (1 - hgt));
            const p = C.clone().addScaledVector(n, sw).addScaledVector(T, sl * (hgt - 0.5)); p.y = y;
            pos.push(p.x, p.y, p.z); uv.push(t, (y - 0.4) / 1.3);
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
          for (let q2 = 0; q2 < idx.length; q2 += 3) { const tt = idx[q2 + 1]; idx[q2 + 1] = idx[q2 + 2]; idx[q2 + 2] = tt; }
          geo.setIndex(idx); K.smoothNormals(geo);
        }
        return { geo, ring };
      }
      {
        const sleeveTex = canvasTex(1024, 1024, (g, w, h) => {
          D.fill(g, IVORY);
          const lf = M('#A5B07B'), row = y => (1 - (y - 0.4) / 1.3) * h;
          [[0.3, 0.8], [0.52, 1.02], [0.7, 0.74], [0.86, 0.95], [0.44, 1.26], [0.62, 1.38], [0.22, 1.1], [0.8, 1.22], [0.92, 0.62]].forEach(([u, y], i) => twoLeaf(D, g, u * w, row(y), 95, lf, i % 2 ? 0.25 : -0.25));
          [[0.4, 0.66, 0], [0.58, 1.16, 1], [0.76, 1.46, 0], [0.34, 1.02, 1], [0.9, 0.84, 1]].forEach(([u, y, s]) => {
            if (s) sprig(D, g, u * w, row(y), 80, M('#EFCB85', 1.2), 0.2); else D.blob(g, u * w, row(y), 10, 14, M('#EFC27A'), 0.9, 0.4);
          });
          // cuff border: fine green line and a gold line just inside the rolled edge; gold line along the bottom
          g.fillStyle = M('#9DA873'); g.fillRect(w - 26, 0, 7, h);
          g.fillStyle = GOLD; g.fillRect(w - 44, 0, 5, h);
          g.fillStyle = GOLD; g.fillRect(0, row(0.47), w, 5);
        });
        const greenTex = canvasTex(1024, 512, (g, w, h) => {
          D.fill(g, GREEN);
          g.fillStyle = GOLD; g.fillRect(w - 30, 0, 8, h);
          g.fillStyle = GREEN_DK; g.fillRect(w - 14, 0, 14, h);
        });
        const sleeveMat = texMat(sleeveTex, { roughness: 0.9 }), greenMat = texMat(greenTex, { roughness: 0.9 });
        const liningMat = std(RED, { side: THREE.BackSide, roughness: 0.9 });
        const rimMat = std(CREAM, { roughness: 0.9 }), rimG = std(GREEN_DK, { roughness: 0.9 });
        const make = (o, mat, rim, ink, rimR) => {
          const b = sleeveBag(o);
          mesh(b.geo, mat, sleevesG, null, null, ink);
          const lin = new THREE.Mesh(b.geo, liningMat); lin.receiveShadow = true; sleevesG.add(lin);
          mesh(tube(b.ring.slice(0, -1), rimR, 160, 8, true), rim, sleevesG, null, null, ink);
        };
        const Wf = (a, b) => t => lerp(a, b, sst(0, 0.4, t)) * (1 - 0.3 * sst(0.8, 1, t));
        // green coat sleeves: behind, shorter
        make({ spine: [[-0.36, -0.14], [-0.64, -0.03], [-0.88, 0.14], [-1.02, 0.28]], yT: t => lerp(1.66, 1.62, t), yB: t => lerp(1.36, 0.96, sst(0, 0.8, t)), W: Wf(0.12, 0.16) }, greenMat, rimG, GREEN_INK, 0.016);
        make({ spine: [[0.36, -0.14], [0.72, -0.1], [1.02, 0.06], [1.08, 0.26]], yT: t => lerp(1.66, 1.5, t), yB: t => lerp(1.36, 0.98, sst(0, 0.8, t)), W: Wf(0.12, 0.16) }, greenMat, rimG, GREEN_INK, 0.016);
        // cream robe sleeves: long, hanging to below the knees
        make({ spine: [[-0.36, -0.08], [-0.58, 0.06], [-0.74, 0.26], [-0.94, 0.44]], yT: t => lerp(1.62, 1.6, t),
          yB: t => lerp(1.3, 0.62, sst(0, 0.65, t)) + 0.16 * sst(0.75, 1, t), W: Wf(0.1, 0.13), slant: t => -0.25 * sst(0.6, 1, t) }, sleeveMat, rimMat, ROBE_INK, 0.022);
        make({ spine: [[0.36, -0.08], [0.72, -0.02], [1.0, 0.2], [0.96, 0.44], [0.72, 0.58]], yT: t => lerp(1.62, 1.28, sst(0, 0.9, t)),
          yB: t => lerp(1.3, 0.52, sst(0, 0.75, t)), W: Wf(0.1, 0.14), slant: t => 0.3 * sst(0.6, 1, t) }, sleeveMat, rimMat, ROBE_INK, 0.022);
      }

      /* ---------------- necklace: brown cord, gold bead and red tassel; gold chain across the chest ---------------- */
      {
        const ring = [];
        for (let i = 0; i <= 24; i++) { const a = (-70 + 140 * i / 24) * Math.PI / 180; ring.push(V(Math.sin(a) * 0.4, 1.72 - 0.06 * Math.cos(a) ** 4, Math.cos(a) * 0.5)); }
        mesh(tube(ring, 0.011, 60, 6), std(M('#8E6A48'), { roughness: 0.8 }), capeG);
        const bp = V(-0.05, 1.62, 0.53);
        mesh(sphere(0.04, 18, 14), goldMat, capeG, bp, null, GOLD_INK);
        K.tassel(capeG, [bp.x, bp.y - 0.05, bp.z], RED, 0.16, 0.026, RED_INK);
        const onC = (x, y, o) => V(x, y, Math.sqrt(Math.max(coatR(y) ** 2 - x * x, 0)) + o);
        const ch = [onC(-0.36, 1.4, 0.06), onC(-0.18, 1.34, 0.06), onC(0.06, 1.325, 0.06), onC(0.27, 1.36, 0.06), onC(0.42, 1.45, 0.05)];
        mesh(tube(ch, 0.016, 60, 8), goldMat, capeG, null, null, GOLD_INK);
        const mp = onC(-0.37, 1.4, 0.08), md = K.medal(capeG, [mp.x, mp.y, mp.z], 0.08, (g) => {
          g.fillStyle = M('#F7D08A', 1.3); g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
          g.strokeStyle = M('#D9A54E'); g.lineWidth = 12; g.beginPath(); g.arc(128, 128, 80, 0, Math.PI * 2); g.stroke();
        }, GOLD, GOLD_INK, M('#F7D08A', 1.3));
        md.rotation.y = -0.4;
        K.tassel(capeG, [mp.x, mp.y - 0.08, mp.z], RED, 0.14, 0.024, RED_INK);
      }

      /* ---------------- straw hat (斗笠) with ivory crown, gold band, jade bead, leaves and a grain ear ---------------- */
      const hatG = part('hat', K.head);
      hatG.position.set(...HAT.pos);
      hatG.rotation.set(...HAT.rot);
      {
        const weave = (base, line, dark) => canvasTex(1024, 256, (g, w, h) => {
          D.fill(g, base);
          const cols = 64, rows = 6;
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            if ((r + c) % 2) { g.fillStyle = dark; g.fillRect(c * w / cols, r * h / rows, w / cols, h / rows); }
          }
          g.strokeStyle = line; g.lineWidth = 2;
          for (let c = 0; c <= cols; c++) { g.beginPath(); g.moveTo(c * w / cols, 0); g.lineTo(c * w / cols, h); g.stroke(); }
          for (let r = 0; r <= rows; r++) { g.beginPath(); g.moveTo(0, r * h / rows); g.lineTo(w, r * h / rows); g.stroke(); }
        });
        const top = lathe(HAT.prof, 96, 0, Math.PI * 2, 30);
        mesh(top.geo, texMat(weave(STRAW, M('#DDB47A'), M('#F2CC92', 1.3)), { roughness: 0.85 }), hatG, null, null, STRAW_INK);
        const under = mesh(top.geo, texMat(weave(STRAW_DK, M('#B98B55'), M('#CF9C60')), { roughness: 0.9, side: THREE.BackSide }), hatG, [0, -0.012, 0]);
        under.castShadow = false;
        const rim = mesh(new THREE.TorusGeometry(HAT.prof[0][0] - 0.002, 0.024, 8, 120), std(M('#D9AA6C'), { roughness: 0.8 }), hatG, [0, HAT.prof[0][1], 0], null, STRAW_INK);
        rim.rotation.x = Math.PI / 2;
        // ivory crown
        const crown = lathe(HAT.crown, 64, 0, Math.PI * 2, 24);
        mesh(crown.geo, std(IVORY, { roughness: 0.9 }), hatG, null, null, ROBE_INK);
        const band = mesh(new THREE.TorusGeometry(0.455, 0.024, 10, 96), goldMat, hatG, [0, 0.4, 0], null, GOLD_INK);
        band.rotation.x = Math.PI / 2;
        // jade bead in a gold bezel at the front
        const jg = group(hatG, [0, 0.44, 0.46]);
        mesh(new THREE.TorusGeometry(0.078, 0.024, 12, 40), goldMat, jg, null, null, GOLD_INK);
        mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 32), goldMat, jg, [0, 0, -0.012], null, GOLD_INK).rotation.x = Math.PI / 2;
        mesh(sphere(0.068, 24, 18), std(JADE, { roughness: 0.3 }), jg, [0, 0, 0.012], [1, 1, 0.7], M('#6F8A62'));
        // leaves standing up behind the crown
        const lgeo = extrude(leafShape(0.42, 0.15), 0.02, 0.008, 2, 12), lgeo2 = extrude(leafShape(0.32, 0.12), 0.02, 0.008, 2, 12);
        [[-0.16, 0.6, -0.12, 0.5, 0], [-0.03, 0.62, -0.2, 0.08, 1], [0.1, 0.6, -0.16, -0.3, 0], [-0.32, 0.52, -0.14, 1.0, 1], [0.36, 0.5, -0.12, -1.1, 1]].forEach(([x, y, z, rz, small]) => {
          const l = mesh(small ? lgeo2 : lgeo, small ? leafMat2 : leafMat, hatG, [x, y, z], null, GREEN_INK);
          l.rotation.set(-0.15, 0, rz);
        });
        // a grain ear arching over to the image-right
        const eg = group(hatG, [0.16, 0.58, -0.1]);
        ear(eg, [V(0.04, 0.12, 0), V(0.12, 0.26, 0), V(0.26, 0.37, 0.02), V(0.42, 0.4, 0.04)], 8, 0.08, V(0, 0, 1));
        mesh(tube([V(0, 0, 0), V(0.02, 0.07, 0), V(0.04, 0.12, 0)], 0.014, 8, 6), std(RICE_DK, { roughness: 0.7 }), eg);
      }
      hatG.traverse(o => { if (o.isMesh) o.castShadow = false; });

      /* ---------------- grain sheaf (穀穗束) in the image-left paw ---------------- */
      riceG = part('rice', K.body);
      {
        const H = K.hands.L.p;
        riceG.position.copy(H); riceG.scale.setScalar(1.08);
        const axis = V(-0.42, 0.9, 0.1).normalize();
        const tie = axis.clone().multiplyScalar(0.15);
        const stemMat = std(M('#B8B470'), { roughness: 0.8 }), stemMat2 = std(M('#D7B46A'), { roughness: 0.8 });
        for (let i = 0; i < 9; i++) {
          const a = (i - 4) * 0.035, off = V(Math.cos(i * 2.1) * 0.035, 0, Math.sin(i * 2.1) * 0.035);
          const bottom = axis.clone().multiplyScalar(-0.3).add(V(a * 0.7 - 0.03, 0, 0)).add(off);
          mesh(tube([bottom, off.clone().multiplyScalar(0.6), tie.clone().add(off.clone().multiplyScalar(0.5))], 0.014, 10, 6), i % 3 ? stemMat : stemMat2, riceG);
        }
        const tq = q(V(0, 1, 0), axis);
        const cord = mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 24), redMat, riceG, tie, null, RED_INK);
        cord.quaternion.copy(tq.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))));
        [-1, 1].forEach(sx => mesh(sphere(0.035, 12, 10), redMat, riceG, tie.clone().add(V(0.04 * sx, 0.01, 0.06)), [1.3, 0.8, 0.7], RED_INK));
        const ears = [
          [[-0.2, 0.42, 0.05], [-0.36, 0.6, 0.05], [-0.54, 0.72, 0.06], [-0.72, 0.72, 0.06]],
          [[-0.05, 0.48, 0.08], [-0.05, 0.7, 0.1], [-0.1, 0.88, 0.1], [-0.2, 1.0, 0.1]],
          [[-0.18, 0.26, 0.14], [-0.32, 0.36, 0.15], [-0.44, 0.34, 0.15], [-0.52, 0.2, 0.15]],
          [[-0.3, 0.3, -0.04], [-0.48, 0.42, -0.04], [-0.64, 0.42, -0.04], [-0.78, 0.3, -0.04]],
          [[-0.14, 0.5, -0.08], [-0.26, 0.7, -0.08], [-0.4, 0.84, -0.08], [-0.55, 0.9, -0.08]],
          [[0.03, 0.44, 0.0], [0.07, 0.64, 0.02], [0.05, 0.82, 0.02], [-0.02, 0.94, 0.02]],
          [[-0.12, 0.34, 0.2], [-0.24, 0.52, 0.22], [-0.36, 0.62, 0.22], [-0.48, 0.64, 0.22]]
        ];
        ears.forEach((pts) => {
          const P = pts.map(p => V(p[0], p[1], p[2]));
          mesh(tube([tie, tie.clone().lerp(P[0], 0.5).add(V(0.02, 0, 0)), P[0]], 0.013, 12, 6), stemMat, riceG);
          ear(riceG, P, 10, 0.066, V(0, 0, 1));
        });
        const blade = (pts, w, mat) => mesh(ribbon(pts.map(p => V(p[0], p[1], p[2])), t => w * Math.sin(Math.PI * (0.06 + 0.94 * t)) * (1 - 0.5 * t) + 0.004, { segs: 40, face: [0, 0, 1], twist: t => 0.25 * t }), mat || leafMat, riceG, null, null, GREEN_INK);
        blade([[-0.04, 0.12, 0.1], [-0.07, 0.5, 0.14], [-0.12, 0.85, 0.14], [-0.18, 1.1, 0.12]], 0.12);
        blade([[-0.02, 0.12, 0.14], [0.08, 0.36, 0.2], [0.17, 0.6, 0.22], [0.22, 0.8, 0.22]], 0.11, leafMat2);
        blade([[-0.06, 0.1, 0.02], [-0.3, 0.22, 0.02], [-0.56, 0.2, 0.04], [-0.8, 0.08, 0.04]], 0.12);
        blade([[-0.05, 0.12, 0.08], [-0.26, 0.3, 0.1], [-0.5, 0.33, 0.1], [-0.7, 0.24, 0.1]], 0.11, leafMat2);
        blade([[-0.04, 0.12, -0.06], [-0.12, 0.5, -0.1], [-0.28, 0.82, -0.12], [-0.36, 0.98, -0.12]], 0.1);
        blade([[0.0, 0.12, 0.04], [0.06, 0.4, 0.1], [0.1, 0.66, 0.12], [0.08, 0.86, 0.12]], 0.09, leafMat2);
      }

      /* ---------------- rolled scroll (卷軸) in the image-right paw ---------------- */
      const scrollG = part('scroll', K.body);
      {
        scrollG.position.copy(K.hands.R.p);
        scrollG.rotation.set(0.25, 0, -0.72);
        const len = 0.74, y0 = -0.32, r = 0.088;
        const ptex = canvasTex(256, 256, (g, w, h) => {
          D.fill(g, PAPER);
          g.fillStyle = M('#E6C48E'); g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
          g.strokeStyle = M('#E2BE88'); g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.7, 0); g.lineTo(w * 0.7, h); g.stroke();
        });
        mesh(new THREE.CylinderGeometry(r, r, len, 40, 1, true), texMat(ptex, { roughness: 0.8, side: THREE.DoubleSide }), scrollG, [0, y0 + len / 2, 0], null, M('#C99B5E'));
        const endTex = canvasTex(256, 256, (g) => {
          g.fillStyle = PAPER; g.fillRect(0, 0, 256, 256);
          g.strokeStyle = M('#D8B27A'); g.lineWidth = 7; g.beginPath();
          for (let a = 0; a < Math.PI * 7; a += 0.1) { const rr = 20 + a * 4.6; const x = 128 + Math.cos(a) * rr, y = 128 + Math.sin(a) * rr; a ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
          g.fillStyle = M('#8FA06A'); g.beginPath(); g.arc(128, 128, 22, 0, Math.PI * 2); g.fill();
        });
        [y0 + len, y0].forEach((y, i) => { const c = mesh(new THREE.CircleGeometry(r, 40), texMat(endTex, { roughness: 0.8 }), scrollG, [0, y + (i ? -0.001 : 0.001), 0]); c.rotation.x = i ? Math.PI / 2 : -Math.PI / 2; });
        const ringM = std(M('#D9B27A'), { roughness: 0.7 });
        [y0 + len - 0.01, y0 + 0.01].forEach(y => { const t = mesh(new THREE.TorusGeometry(r, 0.012, 8, 40), ringM, scrollG, [0, y, 0]); t.rotation.x = Math.PI / 2; });
        const cy = y0 + len - 0.26;
        const cr = mesh(new THREE.TorusGeometry(r + 0.012, 0.016, 8, 40), redMat, scrollG, [0, cy, 0], null, RED_INK); cr.rotation.x = Math.PI / 2;
        mesh(sphere(0.03, 14, 10), redMat, scrollG, [-r * 0.6, cy, r * 0.7], null, RED_INK);
      }
      {
        scrollG.updateMatrix();
        const knot = V(-0.088 * 0.6, -0.32 + 0.74 - 0.26, 0.088 * 0.7).applyMatrix4(scrollG.matrix);
        [[0.0, 0.01], [-0.04, 0.03]].forEach(([dx, dz], i) => mesh(ribbon([knot, knot.clone().add(V(dx - 0.02, -0.1, dz + 0.02)), knot.clone().add(V(dx - 0.03, -0.2 - i * 0.05, dz + 0.03))], 0.032, { segs: 16 }), redMatD, scrollG.parent, null, null, RED_INK));
      }

      /* ---------------- boots: gold strap over the toe ---------------- */
      K.feet.forEach((f, i) => {
        const sx = i ? 1 : -1, bg = f.parent, strap = [];
        bg.scale.set(1.2, 1.2, 1.2);
        for (let k = 0; k <= 16; k++) { const a = 1.45 * k / 16; strap.push(V(0.03 * sx, 0.11 + 0.123 * Math.cos(a), 0.05 + 0.29 * Math.sin(a))); }
        mesh(tube(strap, 0.02, 32, 8), goldMat, bg, null, null, GOLD_INK);
      });

      /* ---------------- floating decorations ---------------- */
      {
        const items = [];
        const plant = (pos, s, rz) => {
          const g = group(K.decor, pos, [0, 0, rz]); g.scale.setScalar(s);
          mesh(tube([[0, 0, 0], [0.02, 0.4, 0], [0.05, 0.8, 0]], 0.02, 16, 6), std(M('#A7B07A'), { roughness: 0.8 }), g);
          ear(g, [V(0.05, 0.8, 0), V(0.1, 1.0, 0), V(0.25, 1.1, 0), V(0.38, 1.02, 0)], 8, 0.1, V(0, 0, 1));
          const lg = extrude(leafShape(0.6, 0.1), 0.02, 0.008, 2, 12);
          mesh(lg, leafMat, g, [0, 0.1, 0], null, GREEN_INK).rotation.z = 0.7;
          mesh(lg, leafMat2, g, [0.02, 0.2, 0], null, GREEN_INK).rotation.z = -0.6;
          return g;
        };
        items.push(plant([-2.0, 0.05, 0.3], 0.8, 0.1));
        items.push(plant([2.1, 1.35, 0.2], 0.75, -0.1));
        const lf = extrude(leafShape(0.26, 0.11), 0.03, 0.01, 2, 12);
        [[-2.05, 3.0, 0.1, 0.5], [2.3, 2.6, 0.1, -0.6], [2.25, 0.3, 0.3, 0.9]].forEach(([x, y, z, r], i) => {
          const g = group(K.decor, [x, y, z], [0.3, 0.4 * (i % 2 ? 1 : -1), r]);
          mesh(lf, i % 2 ? leafMat : leafMat2, g, [0, -0.13, 0], null, GREEN_INK); items.push(g);
        });
        [[-2.35, 1.65, 0.2, 0.6], [1.8, 3.5, 0.0, -0.3], [-1.75, 1.05, 0.4, 1.2], [2.35, 0.95, 0.2, -0.8]].forEach(([x, y, z, r]) => {
          const g = group(K.decor, [x, y, z], [0, 0, r]);
          mesh(grainGeo, riceMat, g, null, [0.06, 0.1, 0.05], RICE_INK); items.push(g);
        });
        items.push(K.flower(K.decor, [-2.1, 2.05, 0.3], 0.35, M('#FFF6E6', 1.2), GOLD));
        items.push(K.flower(K.decor, [-1.3, 0.2, 0.6], 0.28, M('#FFF6E6', 1.2), GOLD));
        {
          const g = group(K.decor, [2.05, 2.95, 0.2], [0, 0, 0.5]);
          const bm = std(RED, { roughness: 0.6 });
          mesh(tube([[0, 0.2, 0], [0, 0, 0], [0, -0.3, 0]], t => 0.035 * (1 - 0.6 * t), 16, 8), bm, g, null, null, RED_INK);
          mesh(sphere(0.05, 14, 10), bm, g, [0, 0.23, 0], null, RED_INK);
          const wm = std(M('#FFF8EC', 1.2), { roughness: 0.5, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
          [[-1, 0.15, 0.3], [1, 0.15, -0.3], [-1, 0.08, 0.1], [1, 0.08, -0.1]].forEach(([sx, y, r]) => {
            const w = mesh(extrude(leafShape(0.32, 0.07), 0.008, 0.003, 1, 10), wm, g, [0, y, 0], null, M('#E0B98A'));
            w.rotation.set(0, 0, sx * (1.45 + r));
          });
          items.push(g);
        }
        [[-1.95, 2.55, 0.1, 1], [2.0, 2.2, 0.1, -1]].forEach(([x, y, z, s]) => {
          const sw = group(K.decor, [x, y, z]);
          const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([s * Math.cos(t * 2.4) * 0.35, Math.sin(t * 2.4) * 0.18, 0]); }
          mesh(tube(pts, t => 0.03 * Math.sin(Math.PI * t) + 0.004, 40, 6), std(M('#D5DCB2'), { roughness: 0.8 }), sw, null, null, GREEN_INK);
          items.push(sw);
        });
        items.forEach((g) => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.1 * Math.sin(t * 0.8 + i) * k;
        }));
      }

      /* ---------------- head: tilted toward image-right and turned slightly toward image-left, about the head centre ---------------- */
      {
        const n = K.cfg.head.neck;
        K.head.rotation.set(0, -0.08, -0.12);
        const v = V(0, HY, 0).applyEuler(K.head.rotation);
        K.head.position.set(-v.x, HY - n - v.y, -v.z);
      }
    },

    action: {
      label: '搖穀穗', dur: 1.8,
      run(s, p) { if (riceG) riceG.rotation.z = 0.22 * Math.sin(p * Math.PI * 4) * s; }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '報告穀粒飽滿的穀穗官吏',
        text: '小滿是夏季的第二個節氣，麥類的籽粒開始飽滿卻還未全熟。這隻橘白長毛貓化身巡田的小官吏：頭戴草斗笠、左手舉著一束金黃穀穗、右手握著記錄收成的卷軸，把「小得盈滿」的喜悅穿在身上。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '橘白長毛與歪頭笑臉',
        text: '額頭是放射狀的橘色虎斑，中央一道細細的白色火焰斑一路連到奶白的眼周、口鼻與下巴；右頰（畫面右）的橘毛比左頰垂得更低、還帶幾道細紋。深棕小圓眼、粉色小鼻、ω 形微笑，腮紅上各點兩顆小雀斑，頭微微往畫面右側歪。' },
      hat: { chip: '斗笠', tag: '服飾', name: '玉珠草編斗笠',
        text: '寬大的淺圓錐草笠編著細密格紋，往後斜戴、露出整個額頭，兩隻大耳朵從笠面穿出。笠頂是一圈奶白布冠，繫著金色細箍，正前方鑲一顆金框青玉珠；後方插著綠葉與一支垂向右側的金黃穀穗。' },
      rice: { chip: '穀穗', tag: '道具', name: '紅繩穀穗束',
        text: '左手（畫面左）舉在肩前，握著一大束金黃穀穗，穀粒兩排飽滿、穗頭沉甸甸地往外垂；束口用紅繩綁緊，手下方露出整齊的莖稈，旁邊夾著幾片長長的綠葉。' },
      scroll: { chip: '卷軸', tag: '道具', name: '記錄收成的卷軸',
        text: '右手（畫面右）在腰前握著一卷米黃色卷軸，斜斜指向右上方，卷頭可見一圈圈紙捲與綠色軸心，手上方綁著紅繩、繩尾垂下。' },
      cape: { chip: '雲肩', tag: '服飾', name: '奶白雲肩與金鍊',
        text: '肩上覆著蓬鬆的奶白雲肩，繡著淺綠祥雲紋，邊緣收一道金線。頸上一條棕色細繩掛著金珠與紅流蘇，胸前再斜掛一條金鍊，左肩端扣著金色圓扣並垂下紅穗。' },
      robe: { chip: '官袍', tag: '服飾', name: '米白長袍、綠外袍與廣袖',
        text: '內層是及地的米白長袍，正中一道綠色直條、下襬兩道金線，點綴綠色嫩葉；外層是對襟的稻葉綠外袍，交領在胸前形成 V 字，前襟與下襬鑲金邊並繡金色麥葉。米白廣袖從手腕垂到膝下，袖口斜開、露出長長一道柿紅裡子，後面還襯著較短的綠色外袍袖。' },
      belt: { chip: '腰帶', tag: '服飾', name: '皮腰帶與穀種荷包',
        text: '深棕色寬腰帶上緣壓一道綠邊，左前方扣著刻有四瓣花的金色圓牌；右前方垂著一只繡麥穗的土黃荷包，袋口繫綠色葉形結與紅繩，底下再垂一條紅流蘇。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '蓬鬆橘紋大尾', dir: [1, 0.25, -0.7],
        text: '又大又蓬的尾巴從畫面右後方翹起，下半段是一圈圈鋸齒狀的橘色環紋，上半段轉成奶白，尾端向右下捲成一個小勾。' },
      pose: { chip: '姿態', tag: '貓咪本體', name: '站姿與短靴',
        text: '雙腳穩穩站著，穿著深棕色圓頭短靴，靴面有一道金色直條、鞋底鑲金邊。左手舉穀穗、右手握卷軸，一副準備向大家報告好收成的模樣。按下「搖穀穗」可以看牠揮動穀穗。' }
    },
    order: ['overview', 'face', 'hat', 'rice', 'scroll', 'cape', 'robe', 'belt', 'tail', 'pose']
  });
})();
