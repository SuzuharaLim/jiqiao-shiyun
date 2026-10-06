// @file 09_芒種_英短橘貓
// @title 芒種・插秧芒神 | 二十四節氣貓
(function () {
  // Colours are SAMPLED from refs/09.png (tools/colors.py). def.exposure (0.8, linear tone mapping) dims
  // the lights; they still warm front-facing surfaces (linear gain ≈ R 1.18, G 1.12, B 1.0), so M(hex, k)
  // divides a sampled colour by that gain (k > 1 darkens further, k < 1 brightens).
  const EXPOSURE = 0.8;
  function M(hex, k) {
    k = k || 1; const n = parseInt(hex.slice(1), 16), f = [1.18 * k, 1.12 * k, 1.0 * k];
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f[i], 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- colours sampled from refs/09.png (tools/colors.py) ---------------- */
  const FUR = M('#F6BE78'), FUR_TOP = M('#F3B46A'), FUR_MID = M('#F7C07A'), FUR_LOW = M('#F9C888');
  const STRIPE = M('#E99C4F'), CREAM = M('#FBF2E4'), FACE_CR = '#FFF6E8', INK = '#C4864A', CREAM_INK = '#D2B08A';
  const ROBE = M('#FAEED7'), ROBE_SH = M('#E9D7BA'), ROBE_INK = '#B9A27E';
  const SCARF = M('#A9BC98'), SCARF_DK = M('#8FA284'), SAGE = M('#9BAA82'), SAGE_DK = M('#7E8B6C'), OLIVE = M('#8E9160');
  const LIME = M('#B8BD72'), SAGE_INK = '#66735A';
  const GOLD = M('#F4CB7B'), GOLD_DK = M('#DAB261'), GOLD_INK = '#B58641', BELL = M('#F1C46B');
  const BASKET = M('#DCBA87'), BASKET_DK = M('#BD9A6B'), BASKET_INK = '#8C6C45';
  const BLADE = M('#A8B454'), BLADE_DK = M('#909C48'), BLADE_LT = M('#BCC060'), BLADE_INK = '#6C7834';
  const ROOT = M('#78603C'), ROOT_LT = M('#9C7854'), STICK = M('#B48448'), STICK_INK = '#7A552C';
  const RIBBON = M('#F0D080'), WATER = M('#A9CADB'), RICE = M('#F0C060'), RICE_DK = M('#D89C3C'), RICE_INK = '#B9843A';
  const CAP = M('#86946A'), CAP_DK = M('#737F5A'), CAP_RIB = M('#F3E6CF');
  const TAIL_OR = M('#F0AE62'), TAIL_DK = M('#E49F58'), TAIL_CR = M('#FBE3C0'), WRAP = M('#7D8968'), CORD = M('#E9BB63');
  const ANKLE = M('#EEBA76');
  const HEAD_Y = 3.3, NECK = 2.6;
  // outline of the cream lower face on the head map (lon, lat), image-right half; mirrored for the left
  const MASK_HALF = [[0, 15], [3, 10], [6, 3], [9, -3], [14, -6], [22, -8.5], [32, -12], [44, -18], [56, -26], [68, -34], [80, -45], [90, -58], [92, -90]];
  const ROLL = -0.12, YAW = -0.1, HEAD_DX = -0.12;     // the head leans a little toward image-right and turns toward image-left, as drawn

  // grain-and-leaf sprig (the tunic / sleeve / trouser motif): two gold rice ears and two green leaves
  function grainSprig(D, g, x, y, s, gold, leaf) {
    g.save(); g.translate(x, y);
    g.strokeStyle = leaf; g.lineCap = 'round'; g.lineWidth = Math.max(2, s * 0.045);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.03, -s * 0.3, 0, -s * 0.55); g.stroke();
    // three slim golden ears fanning up the stem
    D.leaf(g, 0, -s * 0.4, s * 0.48, -0.05, gold);
    D.leaf(g, -s * 0.02, -s * 0.3, s * 0.4, -0.6, gold);
    D.leaf(g, s * 0.02, -s * 0.24, s * 0.38, 0.62, gold);
    // two green leaves spreading from the base
    D.leaf(g, 0, -s * 0.03, s * 0.46, -1.05, leaf);
    D.leaf(g, 0, -s * 0.05, s * 0.5, 1.1, leaf);
    g.restore();
  }
  function leafPair(D, g, x, y, s, leaf, vein) {
    g.save(); g.translate(x, y);
    D.leaf(g, 0, 0, s * 0.62, -0.5, leaf, vein);
    D.leaf(g, s * 0.04, 0, s * 0.72, 0.45, leaf, vein);
    D.leaf(g, 0, 0, s * 0.4, -1.25, leaf, vein);
    g.restore();
  }

  NEKO.run({
    meta: {
      id: '09', term: '芒種', title: '芒種・插秧芒神', seal: '芒',
      eyebrow: '二〇二七節氣貓 · 09 芒種 · 英短橘貓',
      aria: '戴綠色小帽、帽頂插著嫩葉與金色稻穗，繫綠領巾與金鈴鐺，穿米白短衣、綠腰帶與燈籠褲，左手抱著帶根秧苗、右手高舉綁黃絲帶柳鞭的橘色英短虎斑貓 3D 模型'
    },
    theme: { accent: '#5E6E45', accentDark: '#B9C99F', glow: 'rgba(176, 195, 160, 0.32)', glowColor: '#C8DDB0' },
    palette: [['#FAC580', '暖橘虎斑'], ['#FBEFD8', '米白短衣'], ['#9BAA82', '秧苗綠'], ['#F4CB7B', '稻穗金']],
    spec: [['品種', '英國短毛貓（橘虎斑）'], ['角色', '芒神・插秧牧童'], ['頭身比', '約 1 : 1.8']],
    seed: 909,
    exposure: EXPOSURE,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR_MID, low: FUR_LOW, deep: STRIPE, cream: CREAM,
        ink: INK, creamInk: CREAM_INK, noise: { colors: [M('#FFE2B8'), M('#EFA85A')], alpha: 0.07, n: 900 },
        paintBase(g, P) {
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.45, FUR_MID); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          const L = (lon, lat) => P.xy(lon, lat);
          const S = (pts, w, a) => P.stroke(g, pts.map(q => L(q[0], q[1])), w, STRIPE, a);
          const both = (pts, w, a) => { S(pts, w, a); S(pts.map(([x, y]) => [-x, y]), w, a); };
          // broad soft tabby stripes (as drawn: three down the forehead, an arc over each eye, two cheek bars)
          g.filter = 'blur(6px)';
          S([[2, 66], [2, 44], [1, 22]], 21, 0.85);
          both([[-12, 64], [-12, 46], [-9, 27]], 18, 0.78);
          both([[-24, 54], [-27, 38], [-35, 25]], 16, 0.66);
          both([[-42, 62], [-49, 48], [-58, 38]], 15, 0.45);
          both([[-97, 3], [-76, -1], [-54, -5]], 18, 0.8);
          both([[-97, -13], [-78, -16], [-60, -20]], 15, 0.68);
          // back of the head: bold tabby bands
          for (const lon of [-160, -130, -100, 100, 130, 160]) S([[lon, 86], [lon + (lon < 0 ? -6 : 6), 45], [lon + (lon < 0 ? -2 : 2), -10]], 24, 0.45);
          g.filter = 'none';
          // cream lower face: a narrow notch between the eyes, cream right under the eyes, widening over the
          // whisker pads to the whole chin; the orange only reaches down the outer cheeks
          const poly = MASK_HALF.concat(MASK_HALF.slice().reverse().map(([lo, la]) => [-lo, la]));
          g.filter = 'blur(6px)'; g.fillStyle = FACE_CR; g.beginPath();
          poly.forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill();
          g.filter = 'none';
        }
      },
      head: { y: HEAD_Y, neck: NECK, w: 0.82, h: 0.78, d: 0.8, cheek: 0.14, ruff: 0.012, ruffFreq: 14, chinDrop: 0.02,
        deform(p, o) {
          const jowl = Math.exp(-Math.pow((o.y + 0.42) / 0.34, 2)), crown = sst(0.25, 0.95, o.y);
          p.x *= 1 + 0.085 * jowl - 0.05 * crown;
          if (o.y < -0.55) p.y += 0.07 * sst(-0.55, -1, o.y);      // flatter, broader chin line
          p.y -= 0.1 * sst(0.3, 1, o.y);                            // lower, rounder crown under the cap
        },
        fur: { layers: 8, length: 0.02, gravity: 0.006, repeat: [16, 8] } },
      eyes: { x: 0.345, y: 0.01, r: 0.165, sx: 1.0, sy: 1.0, sz: 0.4, color: '#3A2412', iris: '#9A6A2E', pupil: '#2A170B', pupilR: 0.52, shine: 1.15 },
      nose: { y: -0.05, color: M('#F2A994'), size: 0.72 },
      muzzle: false,
      mouth: { type: 'open', color: '#A0644A', y: -0.17, w: 0.13, depth: 0.04, open: 1.5, inner: M('#DA7C6C'), tongue: M('#F7A898') },
      blush: false,
      brows: null,
      whiskers: { color: M('#FBF2E6'), n: 3, len: 0.42, r: 0.0055, y: -0.17, x: 0.24, spread: 0.07, droop: 0.05, curve: 0.04 },
      ears: { x: 0.58, y: 0.25, z: -0.1, tilt: 0.4, yaw: 0.22, pitch: -0.08, size: [0.5, 0.62, 0.17], sharp: 0.86,
        color: FUR, inner: M('#F6BBA2'), tuft: false },
      bib: false,
      robe: {
        profile: [[0.9, 1.0], [0.92, 1.08], [0.89, 1.22], [0.78, 1.4], [0.68, 1.56], [0.65, 1.85], [0.63, 2.15], [0.55, 2.42], [0.24, 2.7]],
        color: '#FFFFFF', ink: ROBE_INK, lining: ROBE_SH, hemY: 0,
        paint(g, w, h, D) { D.fill(g, ROBE); }
      },
      collar: false,
      arms: {
        L: { hand: [-0.68, 2.08, 0.74], path: [[-0.46, 2.45, 0.0], [-0.86, 2.22, 0.05], [-1.0, 1.99, 0.22], [-0.96, 1.96, 0.46]], paw: false, drop: 0.85, width: 1.45 },
        R: { hand: [1.17, 2.8, 0.34], path: [[0.46, 2.45, 0.0], [0.82, 2.36, 0.06], [1.05, 2.5, 0.22]], paw: false, drop: 0.55, width: 1.35 }
      },
      sleeves: {
        style: 'wide', color: '#FFFFFF', lining: M('#E6D6BC'), trim: SAGE_DK, trimR: 0.022, ink: ROBE_INK,
        paint(g, w, h, D) {
          D.fill(g, ROBE);
          g.fillStyle = SAGE_DK; g.fillRect(0, 0, w, 30);
          g.fillStyle = LIME; g.fillRect(0, 30, w, 34);
          g.fillStyle = SAGE_DK; g.fillRect(0, 64, w, 5);
          [[0.62, 250], [0.88, 250]].forEach(([u, y]) => grainSprig(D, g, u * w, y, 150, GOLD, SAGE));
        }
      },
      paws: { color: CREAM, ink: CREAM_INK },
      belt: { yT: 1.69, yB: 1.48, color: SAGE_DK, line: false, knot: false, tassel: false },
      legs: false,
      feet: false,
      tail: {
        pts: [[0.35, 0.95, -0.52], [0.78, 0.8, -0.58], [1.16, 0.84, -0.52], [1.34, 1.1, -0.44], [1.33, 1.42, -0.37], [1.22, 1.62, -0.32], [1.08, 1.68, -0.3]],
        r: 0.31, color: TAIL_OR,
        shape: t => (0.62 + 0.38 * sst(0, 0.55, t)) * (t > 0.9 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.9) / 0.1, 2))) : 1),
        paint(g, w, h) {
          g.fillStyle = TAIL_OR; g.fillRect(0, 0, w, h);
          // soft pale bands (cream at their centre) with a deeper orange ring between them; the tip stays orange
          const band = (c, hw, col, a) => {
            const lg = g.createLinearGradient((c - hw) * w, 0, (c + hw) * w, 0);
            lg.addColorStop(0, NEKO.rgba(col, 0)); lg.addColorStop(0.4, NEKO.rgba(col, a)); lg.addColorStop(0.6, NEKO.rgba(col, a)); lg.addColorStop(1, NEKO.rgba(col, 0));
            g.fillStyle = lg; g.fillRect((c - hw) * w, 0, 2 * hw * w, h);
          };
          [0.14, 0.34, 0.53, 0.71].forEach(c => band(c + 0.1, 0.05, TAIL_DK, 0.7));
          [0.14, 0.34, 0.53, 0.71].forEach(c => band(c, 0.065, TAIL_CR, 0.95));
        },
        fur: { layers: 8, length: 0.025, gravity: 0.008, repeat: [18, 10] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, lathe, D } = K;
      const HY = K.cfg.head.y;

      /* ---------- helpers ---------- */
      // closed flat blade swept along a curve (grass, leaves, ribbons) — closed so it takes an outline
      function bladeGeo(pts, wFn, thick, face) {
        const cv = Array.isArray(pts) ? K.curve3(pts) : pts;
        const nT = 36, nA = 10, pos = [], uv = [], idx = [];
        const F = V(face[0], face[1], face[2]).normalize();
        for (let i = 0; i <= nT; i++) {
          const t = i / nT, C = cv.getPointAt(t), T = cv.getTangentAt(t);
          let side = T.clone().cross(F); if (side.lengthSq() < 1e-6) side = T.clone().cross(V(1, 0, 0)); side.normalize();
          const nr = side.clone().cross(T).normalize();
          const w = Math.max(wFn(t), 0.0015) / 2, th = Math.min(thick / 2, w * 0.9);
          for (let j = 0; j <= nA; j++) {
            const a = j / nA * Math.PI * 2;
            const p = C.clone().addScaledVector(side, Math.cos(a) * w).addScaledVector(nr, Math.sin(a) * th);
            pos.push(p.x, p.y, p.z); uv.push(j / nA, t);
          }
        }
        for (let i = 0; i < nT; i++) for (let j = 0; j < nA; j++) { const a = i * (nA + 1) + j, b = a + nA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); return K.smoothNormals(geo);
      }
      const leafW = (w0, p) => t => w0 * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * t)), p || 0.6);
      // a blade from origin o along direction angle (deg from vertical, + = image-right), length L, drooping tip
      function bladePts(o, deg, L, droop, fwd) {
        const a = deg * Math.PI / 180, dx = Math.sin(a), dy = Math.cos(a);
        const pts = [];
        for (let i = 0; i <= 4; i++) {
          const t = i / 4;
          pts.push([o[0] + dx * L * t, o[1] + dy * L * t - droop * t * t, o[2] + (fwd || 0) * t]);
        }
        return pts;
      }
      // rice ear: thin stem + paired golden grains along a curve
      function riceEar(parent, pts, n, gs, grainMat, stemMat) {
        const cv = K.curve3(pts);
        mesh(tube(cv, t => 0.016 * (1 - 0.5 * t), 30, 6), stemMat, parent);
        for (let i = 0; i < n; i++) {
          const t = 0.3 + 0.68 * i / (n - 1), p = cv.getPointAt(t), T = cv.getTangentAt(t);
          const side = T.clone().cross(V(0, 0, 1)).normalize();
          const s = gs * (1 - 0.3 * (i / (n - 1)));
          [-1, 1].forEach(k => {
            const dir = T.clone().addScaledVector(side, k * 0.75).normalize();
            const m = mesh(sphere(1, 14, 10), grainMat, parent, p.clone().addScaledVector(side, k * s * 0.42).addScaledVector(T, k * s * 0.15), [s * 0.36, s * 0.62, s * 0.36], RICE_INK);
            m.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
          });
        }
        const tip = cv.getPointAt(1), T1 = cv.getTangentAt(1);
        const m = mesh(sphere(1, 14, 10), grainMat, parent, tip.clone().addScaledVector(T1, gs * 0.3), [gs * 0.3, gs * 0.5, gs * 0.3], RICE_INK);
        m.quaternion.setFromUnitVectors(V(0, 1, 0), T1);
        return cv;
      }
      const bladeMats = [std(BLADE, { roughness: 0.75 }), std(BLADE_DK, { roughness: 0.75 }), std(BLADE_LT, { roughness: 0.75 })];
      const riceMat = std(RICE, { roughness: 0.6 }), riceStem = std(RICE_DK, { roughness: 0.7 });

      /* ---------- eyes: amber iris (dark top, golden bottom), highlight at the upper right ---------- */
      {
        const tex = canvasTex(256, 256, (g) => {
          const lg = g.createLinearGradient(0, 0, 0, 256);
          lg.addColorStop(0, '#4A2C12'); lg.addColorStop(0.45, '#7E5222'); lg.addColorStop(1, '#D1A04A');
          g.fillStyle = lg; g.fillRect(0, 0, 256, 256);
          const rg = g.createRadialGradient(128, 128, 90, 128, 128, 130);
          rg.addColorStop(0, 'rgba(58,36,18,0)'); rg.addColorStop(1, 'rgba(58,36,18,1)');
          g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
          g.fillStyle = '#2A170B'; g.beginPath(); g.arc(128, 118, 64, 0, Math.PI * 2); g.fill();
        });
        K.eyes.forEach(eg => {
          const inner = eg.children[0];
          const ms = inner.children.filter(o => o.isMesh);
          const iris = ms.find(o => o.geometry.type === 'CircleGeometry');
          if (iris) { iris.material = texMat(tex, { roughness: 0.3 }); }
          const shines = ms.filter(o => o.material === K.M.shine);
          if (shines[0]) { shines[0].position.x = Math.abs(shines[0].position.x) * 1.3; shines[0].position.y *= 1.15; }
          if (shines[1]) { shines[1].visible = false; }
        });
      }

      /* ---------- the cream lower face sits in shade: lift it with an emissive mask of the same shape ---------- */
      {
        const P = K.P, poly = MASK_HALF.concat(MASK_HALF.slice().reverse().map(([lo, la]) => [-lo, la]));
        const em = canvasTex(1024, 512, (g) => {
          g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 512);
          g.filter = 'blur(12px)'; g.fillStyle = '#fff'; g.beginPath();
          poly.forEach(([lo, la], i) => { const [x, y] = P.xy(lo, la - 4); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill(); g.filter = 'none';
        });
        const hm = K.headMesh.material;
        hm.emissive = new THREE.Color(0.3, 0.32, 0.36); hm.emissiveMap = em; hm.needsUpdate = true;
      }

      /* ---------- cap: small green dome, cream ribbon & bow, gold bead, leaves and rice ears ---------- */
      const hat = part('hat', K.head);
      hat.position.set(0.0, HY + 0.46, -0.03); hat.rotation.set(-0.1, 0, 0);
      {
        const capMat = texMat(canvasTex(512, 256, (g, w, h) => {
          const lg = g.createLinearGradient(0, h, 0, 0); lg.addColorStop(0, CAP_DK); lg.addColorStop(0.5, CAP); lg.addColorStop(1, M('#9CA878'));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.strokeStyle = NEKO.rgba(CAP_DK, 0.6); g.lineWidth = 4;
          for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i / 8 * w, h); g.lineTo(i / 8 * w, 0); g.stroke(); }
        }), { side: THREE.DoubleSide, roughness: 0.85 });
        const prof = [[0.355, 0.0], [0.37, 0.07], [0.368, 0.19], [0.345, 0.29], [0.285, 0.37], [0.16, 0.425], [0.001, 0.44]];
        const cap = lathe(prof, 64);
        mesh(cap.geo, capMat, hat, null, null, SAGE_INK);
        const r = (y) => { for (let i = 0; i < cap.pts.length - 1; i++) { const a = cap.pts[i], b = cap.pts[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y); } return 0.35; };
        const ribM = std(CAP_RIB, { roughness: 0.8 });
        // a point on the cap surface (front), lifted a little
        const onCap = (x, y, lift) => [x, y, Math.sqrt(Math.max(r(y) * r(y) - x * x, 0.0004)) + (lift || 0.015)];
        // cream bow tied at the top-front: two loops along the crown, two ties running down to the brim
        const kY = 0.35, bow = group(hat, onCap(0, kY, 0.02), [-0.62, 0, 0]);
        [-1, 1].forEach(sx => {
          const l = mesh(new THREE.TorusGeometry(0.068, 0.042, 10, 24), ribM, bow, [0.1 * sx, 0.01, -0.02], [1.25, 0.72, 0.6], ROBE_INK);
          l.rotation.set(0, 0.35 * sx, 0.18 * sx);
          const tp = [onCap(0.03 * sx, kY - 0.03), onCap(0.12 * sx, kY - 0.13), onCap(0.21 * sx, kY - 0.24), onCap(0.27 * sx, 0.03)];
          mesh(bladeGeo(tp, t => 0.058 * (1 - 0.15 * t), 0.016, [0, 0.3, 1]), ribM, hat, null, null, ROBE_INK);
        });
        mesh(sphere(0.058, 20, 16), std(GOLD, { roughness: 0.4, metalness: 0.15 }), bow, [0, 0.01, 0.035], null, GOLD_INK);
        // leaves fanning out of the top
        const top = [0, 0.4, 0.02];
        [[-80, 0.62, 0.12, 0], [-40, 0.66, 0.08, 1], [-10, 0.62, 0.05, 2], [20, 0.56, 0.06, 0], [68, 0.74, 0.14, 1], [-58, 0.5, 0.08, 2]].forEach(([deg, L, dr, mi]) => {
          mesh(bladeGeo(bladePts(top, deg, L, dr, -0.04), leafW(0.1, 0.55), 0.018, [0, 0, 1]), bladeMats[mi], hat, null, null, BLADE_INK);
        });
        // two golden rice ears arching toward image-right
        riceEar(hat, [[0.02, 0.4, 0.02], [0.12, 0.6, 0.0], [0.3, 0.84, -0.02], [0.5, 0.96, -0.04]], 6, 0.14, riceMat, riceStem);
        riceEar(hat, [[0.04, 0.39, 0.03], [0.3, 0.52, 0.02], [0.62, 0.55, 0.0], [0.9, 0.4, -0.02], [1.06, 0.2, -0.04]], 8, 0.14, riceMat, riceStem);
      }

      /* ---------- green scarf collar with a gold bell tied at the front-left ---------- */
      const collarG = part('collar', K.body);
      {
        const tex = canvasTex(1024, 256, (g, w, h) => {
          D.fill(g, SCARF);
          const lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, NEKO.rgba(SCARF_DK, 0.55)); lg.addColorStop(0.35, NEKO.rgba(SCARF_DK, 0.12)); lg.addColorStop(1, NEKO.rgba(SCARF_DK, 0));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.strokeStyle = NEKO.rgba(SCARF_DK, 0.45); g.lineWidth = 4;
          [0.35, 0.62].forEach(v => { g.beginPath(); g.moveTo(0, v * h); for (let x = 0; x <= w; x += 16) g.lineTo(x, v * h + 8 * Math.sin(x / w * Math.PI * 10)); g.stroke(); });
        });
        // kerchief ring around the neck: narrow at the back, a triangular flap drooping over the image-left
        // chest, a pointed end lying on the image-right shoulder; the knot sits just left of centre
        const KA = -17;                                            // knot direction (deg, 0 = front)
        const bump = (a, c, w) => Math.exp(-Math.pow((a - c) / w, 2));
        const yBot = a => 2.36 - 0.13 * bump(a, -48, 26) - 0.06 * bump(a, KA, 10) - 0.04 * bump(a, 62, 20);
        const yTop = 2.56, nA = 144, nV = 8, pos = [], uv = [], idx = [];
        const rAt = (y, v) => K.robeR(Math.min(y, 2.6)) + 0.05 + 0.05 * (1 - v) * (1 - v);
        for (let i = 0; i <= nA; i++) {
          const a = -180 + 360 * i / nA, ar = a * Math.PI / 180;
          for (let j = 0; j <= nV; j++) {
            const v = j / nV, y = lerp(yBot(a), yTop, Math.pow(v, 0.8)), r = rAt(y, v);
            pos.push(Math.sin(ar) * r, y, Math.cos(ar) * r); uv.push(i / nA, v);
          }
        }
        for (let i = 0; i < nA; i++) for (let j = 0; j < nV; j++) { const q = i * (nV + 1) + j, w = q + nV + 1; idx.push(q, w, q + 1, w, w + 1, q + 1); }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        sg.setIndex(idx); sg.computeVertexNormals();
        mesh(sg, texMat(tex, { side: THREE.DoubleSide, roughness: 0.85 }), collarG, null, null, SAGE_INK);
        const hem = []; for (let i = 0; i < 96; i++) { const a = -180 + 360 * i / 96, ar = a * Math.PI / 180, y = yBot(a), r = rAt(y, 0) + 0.005; hem.push(V(Math.sin(ar) * r, y, Math.cos(ar) * r)); }
        mesh(tube(hem, 0.018, 192, 8, true), std(SCARF_DK, { roughness: 0.8 }), collarG);
        // knot, tails and the bell
        const kar = KA * Math.PI / 180, ky = 2.31, kr = rAt(ky, 0) + 0.02;
        const kx = Math.sin(kar) * kr, kz = Math.cos(kar) * kr;
        const scarfM = std(SCARF, { roughness: 0.85 });
        mesh(sphere(0.08, 20, 16), scarfM, collarG, [kx, ky + 0.02, kz], [1.25, 0.95, 0.7], SAGE_INK);
        mesh(bladeGeo([[kx - 0.03, ky - 0.03, kz + 0.02], [kx - 0.05, ky - 0.2, kz - 0.0], [kx - 0.06, ky - 0.4, kz - 0.02]], t => 0.11 * (1 - 0.1 * t), 0.02, [0, 0, 1]), scarfM, collarG, null, null, SAGE_INK);
        mesh(bladeGeo([[kx + 0.04, ky - 0.03, kz + 0.02], [kx + 0.1, ky - 0.16, kz - 0.0], [kx + 0.16, ky - 0.31, kz - 0.03]], t => 0.1 * (1 - 0.1 * t), 0.02, [0, 0, 1]), std(SCARF_DK, { roughness: 0.85 }), collarG, null, null, SAGE_INK);
        const bellG = group(collarG, [kx + 0.01, ky - 0.03, kz + 0.1]);
        const bm = std(BELL, { roughness: 0.35, metalness: 0.2 });
        mesh(sphere(0.095, 28, 20), bm, bellG, null, null, GOLD_INK);
        const band = mesh(new THREE.TorusGeometry(0.094, 0.009, 8, 40), std(GOLD_DK, { roughness: 0.4 }), bellG, [0, 0.005, 0]); band.rotation.x = Math.PI / 2;
        mesh(sphere(0.02, 12, 10), std('#5A3A1A', { roughness: 0.6 }), bellG, [0, -0.035, 0.085], [1, 0.8, 0.5]);
        mesh(new THREE.BoxGeometry(0.012, 0.05, 0.02), std('#5A3A1A', { roughness: 0.6 }), bellG, [0, -0.075, 0.07]);
        const ring = mesh(new THREE.TorusGeometry(0.025, 0.008, 8, 20), bm, bellG, [0, 0.1, 0]);
      }

      /* ---------- tunic painting (needs robeV): chest motif, wrap line, green pleated skirt below the belt ---------- */
      {
        const cv = K.robeMesh.material.map.image, g = cv.getContext('2d');
        const W = 1024, x = deg => 512 + deg / 360 * W, y = yy => K.robeV(yy);
        const vpw = (y(1.9) - y(2.2)) / 0.3;                     // canvas px per world unit (vertical, chest)
        const sprigAt = (deg, yy, s) => {
          const hpw = W / (2 * Math.PI * K.robeR(yy));
          g.save(); g.translate(x(deg), y(yy)); g.scale(hpw / vpw, 1); grainSprig(D, g, 0, 0, s * vpw, GOLD, SAGE); g.restore();
        };
        D.fill(g, ROBE);
        // pleated sage skirt below the belt
        const yb = y(1.49);
        g.fillStyle = SAGE; g.fillRect(0, yb, W, 1024 - yb);
        for (let i = 0; i < 48; i++) {
          const x0 = i / 48 * W;
          const lg = g.createLinearGradient(x0, 0, x0 + W / 48, 0);
          lg.addColorStop(0, NEKO.rgba(OLIVE, 0.0)); lg.addColorStop(0.8, NEKO.rgba(OLIVE, 0.55)); lg.addColorStop(1, NEKO.rgba(SAGE_INK, 0.6));
          g.fillStyle = lg; g.fillRect(x0, yb, W / 48, 1024 - yb);
        }
        g.fillStyle = LIME; g.fillRect(0, 1024 - 22, W, 22);
        g.fillStyle = SAGE_INK; g.fillRect(0, 1024 - 26, W, 4);
        // wrap edge on the image-left of the chest (thin sage line)
        g.strokeStyle = SAGE; g.lineWidth = 6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x(-30), y(2.36)); g.quadraticCurveTo(x(-31), y(2.0), x(-29), y(1.69)); g.stroke();
        sprigAt(24, 1.7, 0.42);
        sprigAt(180, 1.9, 0.4);
        K.robeMesh.material.map.needsUpdate = true;
      }

      /* ---------- skirt panels: cream front-left flap with a lime edge, sage centre panel ---------- */
      function hugPanel(o) {
        const nu = 28, nv = 20, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv;
          for (let i = 0; i <= nu; i++) {
            const s = i / nu;
            const degL = lerp(o.degLB, o.degLT, t), degR = lerp(o.degRB, o.degRT, t), deg = lerp(degL, degR, s);
            const yy = lerp(o.y0(s), o.y1, t), r = K.robeR(Math.max(yy, 1.0)) + o.off + (o.flare || 0) * (1 - t);
            const a = deg * Math.PI / 180;
            pos.push(Math.sin(a) * r, yy, Math.cos(a) * r); uv.push(s, t);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); geo.computeVertexNormals();
        const tex = canvasTex(256, 512, (g, w, h) => o.paint(g, w, h));
        const m = mesh(geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.9 }), o.parent, null, null, null);
        // outline along the free edges
        const edge = (list) => mesh(tube(list, 0.011, 48, 6), std(o.edge, { roughness: 0.8 }), o.parent);
        const P = (i, j) => { const k = (j * (nu + 1) + i) * 3; return V(pos[k], pos[k + 1], pos[k + 2]); };
        const bot = []; for (let i = 0; i <= nu; i++) bot.push(P(i, 0)); edge(bot);
        const lft = []; for (let j = 0; j <= nv; j++) lft.push(P(0, j)); edge(lft);
        const rgt = []; for (let j = 0; j <= nv; j++) rgt.push(P(nu, j)); edge(rgt);
        return m;
      }
      const skirtG = part('robe', K.body);
      hugPanel({
        parent: skirtG, degLT: 2, degRT: 27, degLB: 4, degRB: 25, y1: 1.5, off: 0.03, flare: 0.02,
        y0: () => 0.97, edge: SAGE_INK,
        paint(g, w, h) {
          g.fillStyle = SAGE; g.fillRect(0, 0, w, h);
          g.fillStyle = M('#A9B78F'); g.fillRect(w * 0.22, 0, w * 0.56, h * 0.93);
          g.fillStyle = SAGE_DK; g.fillRect(0, 0, w * 0.1, h); g.fillRect(w * 0.9, 0, w * 0.1, h);
        }
      });
      hugPanel({
        parent: skirtG, degLT: -86, degRT: 5, degLB: -80, degRB: -22, y1: 1.5, off: 0.06, flare: 0.04,
        y0: s => lerp(0.97, 0.64, Math.sin(Math.PI / 2 * Math.min(s / 0.82, 1))) + 0.07 * sst(0.84, 1, s), edge: SAGE_INK,
        paint(g, w, h) {
          g.fillStyle = ROBE; g.fillRect(0, 0, w, h);
          // lime diagonal edge band along the right edge
          g.fillStyle = LIME; g.fillRect(w * 0.8, 0, w * 0.2, h);
          g.fillStyle = SAGE_DK; g.fillRect(w * 0.78, 0, w * 0.025, h);
          g.fillStyle = SAGE; g.fillRect(0, h * 0.965, w, h * 0.035);
          g.save(); g.translate(w * 0.5, h * 0.88); g.scale(0.45, 1); grainSprig(D, g, 0, 0, 210, GOLD, SAGE); g.restore();
        }
      });

      /* ---------- belt: yellow middle stripe, big yellow bow, green bead and tassel ---------- */
      {
        const bG = K.beltG;
        const yS = 1.585;
        const cone = y => lerp(K.robeR(1.48), K.robeR(1.69), (y - 1.48) / 0.21) + 0.03;   // the engine belt is a straight frustum
        mesh(new THREE.CylinderGeometry(cone(yS + 0.03) + 0.012, cone(yS - 0.03) + 0.012, 0.06, 96, 1, true), std(M('#E2BC6E'), { roughness: 0.6, side: THREE.DoubleSide }), bG, [0, yS, 0]);
                const deg = 21, a = deg * Math.PI / 180, rr = K.robeR(1.59) + 0.07;
        const bow = group(bG, [Math.sin(a) * rr, 1.59, Math.cos(a) * rr], [0, a, 0]);
        bow.scale.setScalar(0.8);
        const gm = std(GOLD, { roughness: 0.6 });
        [-1, 1].forEach(sx => {
          const l = mesh(new THREE.TorusGeometry(0.1, 0.036, 10, 28), gm, bow, [0.13 * sx, 0.03, -0.03], [1.3, 0.85, 0.55], GOLD_INK);
          l.rotation.set(0, 0.3 * sx, 0.28 * sx);
        });
        mesh(sphere(0.06, 20, 16), gm, bow, [0, 0.0, 0.02], [1, 0.9, 0.8], GOLD_INK);
        // tails, cord, bead and tassel follow the flared skirt outward (the skirt widens fast below the belt)
        mesh(bladeGeo([[-0.02, -0.03, 0.02], [-0.06, -0.16, 0.1], [-0.09, -0.36, 0.22]], t => 0.09 * (1 - 0.2 * t), 0.022, [0, 0.4, 1]), gm, bow, null, null, GOLD_INK);
        mesh(bladeGeo([[0.02, -0.03, 0.02], [0.06, -0.14, 0.09], [0.07, -0.28, 0.18]], t => 0.085 * (1 - 0.2 * t), 0.022, [0, 0.4, 1]), gm, bow, null, null, GOLD_INK);
        mesh(tube([[0.03, -0.04, 0.03], [0.09, -0.14, 0.1], [0.12, -0.25, 0.17]], 0.01, 16, 6), std(GOLD_DK, { roughness: 0.6 }), bow);
        mesh(sphere(0.05, 20, 16), std(M('#A5B57A'), { roughness: 0.45 }), bow, [0.125, -0.29, 0.2], null, SAGE_INK);
        const tg = K.tassel(bow, [0.13, -0.35, 0.24], GOLD, 0.26, 0.05, GOLD_INK);
        tg.rotation.x = -0.5;
        K.onTick((t, k) => { tg.rotation.z = 0.08 * Math.sin(t * 1.6) * k; });
      }

      /* ---------- woven seed basket at the image-right hip, sprouts growing out of it ---------- */
      const pouchG = part('pouch', K.body);
      {
        const deg = 40, a = deg * Math.PI / 180, rr = K.robeR(1.45) + 0.2;
        const pg = group(pouchG, [Math.sin(a) * rr, 1.45, Math.cos(a) * rr], [0, a, 0]);
        const tex = canvasTex(256, 128, (g, w, h) => {
          D.fill(g, BASKET);
          g.strokeStyle = BASKET_DK; g.lineWidth = 3;
          for (let i = -8; i < 16; i++) { g.beginPath(); g.moveTo(i * 20, 0); g.lineTo(i * 20 + 64, h); g.stroke(); g.beginPath(); g.moveTo(i * 20 + 64, 0); g.lineTo(i * 20, h); g.stroke(); }
        });
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 2);
        const prof = [[0.001, -0.17], [0.1, -0.165], [0.17, -0.1], [0.19, -0.01], [0.17, 0.07], [0.12, 0.12], [0.09, 0.15], [0.1, 0.18]];
        mesh(lathe(prof, 40).geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.95 }), pg, null, null, BASKET_INK);
        const rim = mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 28), std(BASKET_DK, { roughness: 0.9 }), pg, [0, 0.18, 0]); rim.rotation.x = Math.PI / 2;
        // strap to the belt
        mesh(tube([[-0.08, 0.16, -0.02], [-0.12, 0.26, -0.1], [-0.14, 0.24, -0.2]], 0.014, 16, 6), std(BASKET_DK, { roughness: 0.9 }), pg);
        [[-40, 0.26], [-15, 0.34], [8, 0.36], [30, 0.3], [55, 0.24], [-60, 0.2]].forEach(([d, L], i) => {
          mesh(bladeGeo(bladePts([0, 0.14, 0], d, L, 0.05, 0.02), leafW(0.06, 0.5), 0.014, [0, 0, 1]), bladeMats[i % 3], pg, null, null, BLADE_INK);
        });
      }

      /* ---------- forearms and paws (the sleeves end at the elbow; orange fur between cuff and paw) ---------- */
      const pawM = std(M('#F6E6CC'), { roughness: 0.9 }), armM = std(FUR, { roughness: 0.9 });
      const pawG = K.poseG;
      const forearm = (side, pawR) => {
        const h = K.hands[side], W = h.wrist, T = h.dir;
        const a = W.clone().addScaledVector(T, -0.12), b = h.p.clone();
        mesh(tube([a, a.clone().lerp(b, 0.5), b], t => lerp(0.17, 0.15, t), 16, 14), armM, pawG, null, null, INK);
        const pm = mesh(sphere(pawR, 28, 20), pawM, pawG, h.p, [1, 0.92, 0.95], CREAM_INK);
        // two soft toe creases on the knuckles facing the viewer
        const on = (x, y) => V(x, y, Math.sqrt(Math.max(pawR * pawR - x * x - y * y, 0)) + 0.004);
        // two short toe creases low on the front of the mitten
        [-0.26, 0.26].forEach(k => mesh(tube([-0.12, -0.3, -0.5].map(f => on(k * pawR * (1 + 0.25 * f), f * pawR)), 0.0065, 10, 5), creaseM, pm));
        return pm;
      };
      const creaseM = std('#DDBE9C', { roughness: 0.8 });
      forearm('L', 0.21);
      const pawR = forearm('R', 0.18);

      /* ---------- bundle of rice seedlings with muddy roots in the image-left paw ---------- */
      const seedG = part('seedling', K.body);
      {
        const hp = K.hands.L.p;
        const bg = group(seedG, [hp.x + 0.02, hp.y, hp.z - 0.08], [0.1, 0, 0.38]);
        const stemM = [std(M('#9DAA52'), { roughness: 0.8 }), std(M('#B4BC62'), { roughness: 0.8 })];
        for (let i = 0; i < 20; i++) {
          const a = i / 20 * Math.PI * 2, rr = 0.05 + 0.045 * K.rand();
          const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
          mesh(tube([[x * 0.85, -0.34, z * 0.85], [x, 0, z], [x * 0.9, 0.3, z * 0.9]], 0.016, 10, 5), stemM[i % 2], bg);
        }
        // tie band above the paw
        const tie = mesh(new THREE.TorusGeometry(0.1, 0.028, 8, 24), std(CORD, { roughness: 0.6 }), bg, [0, 0.27, 0], null, GOLD_INK); tie.rotation.x = Math.PI / 2;
        // roots and a clump of mud right under the paw: a bushy tangle of brown strands
        mesh(sphere(0.075, 16, 12), std(M('#8A6A44'), { roughness: 1 }), bg, [0, -0.33, 0], [1.2, 0.8, 1.1]);
        const rootM = [std(ROOT_LT, { roughness: 1 }), std(ROOT, { roughness: 1 }), std(M('#8A6A44'), { roughness: 1 })];
        for (let i = 0; i < 30; i++) {
          const a = i / 30 * Math.PI * 2 + K.rand() * 0.3, L = 0.14 + 0.18 * K.rand(), sp = 0.06 + 0.1 * K.rand(), wv = (K.rand() - 0.5) * 0.06;
          const x = Math.cos(a), z = Math.sin(a);
          mesh(tube([[x * 0.06, -0.33, z * 0.06], [x * sp + wv, -0.4 - L * 0.35, z * sp], [x * (sp + 0.02) - wv, -0.4 - L * 0.7, z * sp], [x * (sp + 0.03), -0.4 - L, z * (sp + 0.02)]],
            t => 0.016 * (1 - 0.75 * t), 12, 5), rootM[i % 3], bg);
        }
        // blades fanning up and out toward image-left: each bends further outward toward its tip
        const fan = group(seedG, [hp.x - 0.08, hp.y + 0.3, hp.z - 0.03]);
        const curvedBlade = (o, deg, L, bend, fwd) => {
          const pts = []; let x = o[0], y = o[1], z = o[2];
          pts.push([x, y, z]);
          for (let i = 1; i <= 6; i++) {
            const t = i / 6, a = (deg + bend * t * t) * Math.PI / 180, step = L / 6;
            x += Math.sin(a) * step; y += Math.cos(a) * step; z += fwd / 6;
            pts.push([x, y, z]);
          }
          return pts;
        };
        const blades = [
          [-88, 0.8, -30], [-78, 0.95, -35], [-66, 0.9, -30], [-56, 1.0, -30], [-46, 0.92, -28], [-36, 1.08, -25], [-27, 1.12, -22],
          [-18, 0.98, -20], [-10, 1.05, -18], [-2, 0.88, -15], [6, 0.92, 15], [14, 0.78, 20], [22, 0.98, 25], [32, 0.72, 30],
          [44, 0.62, 30], [56, 0.5, 30], [-30, 0.72, -20], [-50, 0.66, -25], [-70, 0.62, -30], [2, 0.62, 10], [-14, 0.75, -15], [-60, 1.05, -35]
        ];
        blades.forEach(([deg, L, bend], i) => {
          const fwd = -0.12 + 0.4 * K.rand(), ring = i * 2.4;
          const o = [0.08 * Math.cos(ring), -0.06 * K.rand(), 0.07 * Math.sin(ring)];
          const d = deg + (K.rand() - 0.5) * 10, b = bend * (0.6 + 0.8 * K.rand());
          mesh(bladeGeo(curvedBlade(o, d, L * (0.9 + 0.2 * K.rand()), b, fwd), leafW(0.06 + 0.03 * K.rand(), 0.3), 0.016, [0, 0, 1]), bladeMats[i % 3], fan, null, null, BLADE_INK);
        });
        // water dripping from the roots
        [[0.05, -0.64, 0.06, 0.09], [-0.07, -0.76, 0.02, 0.07], [0.13, -0.86, 0.04, 0.08]].forEach(([x, y, z, s]) => K.drop(bg, [x, y, z], s, WATER));
        seedG.userData.fan = fan;
      }

      /* ---------- willow whip with two leaves and a yellow ribbon, raised in the image-right paw ---------- */
      const whipG = part('whip', K.body);
      const whipPivot = group(whipG, K.hands.R.p.toArray());
      {
        const hp = K.hands.R.p;
        const w = [[1.02, 2.63, 0.4], [1.17, 2.8, 0.34], [1.38, 3.33, 0.26], [1.56, 3.85, 0.18], [1.58, 4.17, 0.14], [1.49, 4.4, 0.12]].map(p => [p[0] - hp.x, p[1] - hp.y, p[2] - hp.z]);
        const cv = K.curve3(w);
        const sm = std(STICK, { roughness: 0.8 });
        mesh(tube(cv, t => 0.03 * (1 - 0.35 * t), 80, 10), sm, whipPivot, null, null, STICK_INK);
        [0.28, 0.5, 0.72].forEach(t => { const p = cv.getPointAt(t); mesh(sphere(0.034, 12, 10), sm, whipPivot, p, [1, 0.6, 1], STICK_INK); });
        // ribbon knot near the top, two leaves, hanging ribbon tails
        const kp = cv.getPointAt(0.8);
        const rm = std(RIBBON, { roughness: 0.7 });
        mesh(sphere(0.045, 16, 12), rm, whipPivot, kp, [1.2, 0.8, 1.2], GOLD_INK);
        const lm = bladeMats[0];
        mesh(bladeGeo([kp.toArray(), [kp.x + 0.12, kp.y + 0.2, kp.z], [kp.x + 0.26, kp.y + 0.4, kp.z - 0.02]], leafW(0.13, 0.7), 0.02, [0, 0, 1]), lm, whipPivot, null, null, BLADE_INK);
        mesh(bladeGeo([kp.toArray(), [kp.x - 0.14, kp.y - 0.12, kp.z + 0.02], [kp.x - 0.3, kp.y - 0.28, kp.z + 0.02]], leafW(0.12, 0.7), 0.02, [0, 0, 1]), bladeMats[2], whipPivot, null, null, BLADE_INK);
        const tail1 = group(whipPivot, kp.toArray());
        mesh(bladeGeo([[0, 0, 0.02], [0.06, -0.2, 0.03], [0.1, -0.45, 0.02], [0.12, -0.72, 0.0]], t => 0.1 * (1 - 0.3 * t * t), 0.018, [0, 0, 1]), rm, tail1, null, null, GOLD_INK);
        mesh(bladeGeo([[0, 0, 0.0], [0.05, -0.12, -0.02], [0.06, -0.26, -0.03]], t => 0.09, 0.016, [0, 0, 1]), rm, tail1, null, null, GOLD_INK);
        K.onTick((t, k) => { tail1.rotation.z = 0.12 * Math.sin(t * 2.1) * k; });
        // the paw sits in front of the handle
        whipG.userData.pivot = whipPivot;
      }
      // move the image-right paw into the pivot so it swings with the whip in the action
      K.poseG.remove(pawR); whipPivot.add(pawR); pawR.position.set(0, 0, 0.04);

      /* ---------- bloomers, orange ankles, green leg wraps with yellow cords, cream paws ---------- */
      const legsG = part('legs', K.body);
      {
        const tex = canvasTex(512, 256, (g, w, h) => {
          D.fill(g, ROBE);
          const lg = g.createLinearGradient(0, h, 0, 0); lg.addColorStop(0, NEKO.rgba(ROBE_SH, 0.9)); lg.addColorStop(0.25, NEKO.rgba(ROBE_SH, 0)); lg.addColorStop(1, NEKO.rgba(ROBE_SH, 0));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.strokeStyle = NEKO.rgba(ROBE_INK, 0.35); g.lineWidth = 3;
          for (let i = 0; i < 12; i++) { const x = i / 12 * w; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + 10, h * 0.8, x + 4, h * 0.62); g.stroke(); }
        });
        const pm = texMat(tex, { roughness: 0.9, side: THREE.DoubleSide });
        const prof = [[0.265, 0.53], [0.3, 0.56], [0.37, 0.64], [0.415, 0.76], [0.425, 0.9], [0.395, 1.02], [0.32, 1.12], [0.2, 1.2]];
        const leafTex = canvasTex(256, 256, (g) => leafPair(D, g, 128, 226, 250, SAGE, M('#8A9A74')));
        [-1, 1].forEach(sx => {
          const lg = group(legsG, [0.42 * sx, 0, 0.04], [0, 0, -0.04 * sx]);
          mesh(lathe(prof, 48).geo, pm, lg, null, null, ROBE_INK);
          if (sx > 0) {
            const d = mesh(new THREE.PlaneGeometry(0.26, 0.26), texMat(leafTex, { transparent: true, alphaTest: 0.35, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }), lg, [0.02, 0.8, 0.43]);
            d.rotation.x = -0.05; d.castShadow = false;
          }
          // orange ankle, green wrap, yellow cords, cream paw
          const fg = group(legsG, [0.5 * sx, 0, 0.06], [0, 0.18 * sx, 0]);
          const ank = mesh(lathe([[0.25, 0.34], [0.262, 0.44], [0.262, 0.52], [0.248, 0.6], [0.2, 0.68]], 32).geo, std(ANKLE, { roughness: 0.9 }), fg, [0, 0, -0.03], null, INK);
          mesh(sphere(0.2), std(FUR, { roughness: 0.9 }), fg, [0, 0.18, -0.1], [1.3, 0.9, 1.15], INK);
          mesh(sphere(0.2), pawM, fg, [0, 0.15, 0.1], [1.5, 0.8, 1.35], CREAM_INK);
          // green wrap (綁腿) around the ankle, a bit taller at the back
          const wrapProf = [[0.28, 0.24], [0.285, 0.3], [0.279, 0.37], [0.268, 0.44], [0.262, 0.45]];
          mesh(lathe(wrapProf, 40).geo, std(WRAP, { roughness: 0.85, side: THREE.DoubleSide }), fg, [0, 0, -0.03], [1, 1, 1.1], SAGE_INK);
          const cm = std(CORD, { roughness: 0.6 });
          // yellow sandal cord along the lower edge of the wrap, and a small bow at the front top
          const ring = mesh(new THREE.TorusGeometry(0.286, 0.018, 8, 48), cm, fg, [0, 0.26, -0.03], [1, 1, 1.1]); ring.rotation.x = Math.PI / 2;
          // cords crossing over the front of the wrap up to the bow
          const onW = (deg, y) => { const a = deg * Math.PI / 180, R = 0.29; return [Math.sin(a) * R, y, -0.03 + Math.cos(a) * R * 1.1]; };
          [-1, 1].forEach(k => mesh(tube([onW(-48 * k, 0.26), onW(-22 * k, 0.33), onW(6 * k, 0.4)], 0.013, 12, 5), cm, fg));
          const bk = group(fg, [0, 0.41, 0.285], [-0.2, 0, 0]);
          [-1, 1].forEach(k => {
            const l = mesh(sphere(1, 14, 10), cm, bk, [0.055 * k, 0.012, -0.005], [0.055, 0.03, 0.02], GOLD_INK); l.rotation.z = 0.25 * k;
            mesh(tube([[0.01 * k, -0.01, 0.005], [0.04 * k, -0.06, 0.005], [0.06 * k, -0.11, -0.01]], 0.011, 10, 5), cm, bk);
          });
          mesh(sphere(0.022, 10, 8), cm, bk, [0, 0, 0.01], null, GOLD_INK);
          // toe creases
          const tm = std('#C9A07C', { roughness: 0.8 });
          [-0.09, 0.09].forEach(dx => mesh(tube([[dx, 0.2, 0.31], [dx * 1.05, 0.13, 0.36], [dx * 1.1, 0.05, 0.34]], 0.009, 8, 5), tm, fg));
        });
      }

      /* ---------- floating decorations: rice ears, leaves, water drops, grains ---------- */
      {
        const items = [];
        const leafShape = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.45, 0, L); s.quadraticCurveTo(-w, L * 0.45, 0, 0); return s; };
        const leafD = extrude(leafShape(0.42, 0.11), 0.03, 0.01, 2, 12);
        const addLeaf = (pos, rz, mi) => { const g = group(K.decor, pos, [0.2, 0.3, rz]); mesh(leafD, bladeMats[mi], g, [0, -0.2, 0], null, BLADE_INK); items.push(g); return g; };
        const addRice = (pos, pts, n, rz) => { const g = group(K.decor, pos, [0, 0, rz]); riceEar(g, pts, n, 0.11, riceMat, riceStem); items.push(g); return g; };
        const grain = (parent, p, rz) => { const m = mesh(sphere(1, 14, 10), riceMat, parent, p, [0.06, 0.1, 0.05], RICE_INK); m.rotation.z = rz; return m; };
        addRice([-1.72, 2.86, 0.2], [[0.4, 0.05, 0], [0.2, 0.2, 0], [0.0, 0.26, 0], [-0.2, 0.2, 0]], 7, 0.1);
        const rr = addRice([1.62, 1.72, 0.2], [[0, -0.3, 0], [0.02, 0.0, 0], [-0.04, 0.3, 0], [-0.14, 0.52, 0]], 7, -0.25);
        grain(rr, [0.24, 0.55, 0], -0.3); grain(rr, [0.3, 0.3, 0.02], 0.2);
        addLeaf([-1.64, 3.35, 0.0], 0.45, 1);
        const lb = addLeaf([-1.38, 1.3, 0.3], 0.6, 0);
        mesh(sphere(0.05, 14, 10), bladeMats[2], lb, [-0.12, 0.35, 0], null, BLADE_INK);
        addLeaf([1.72, 2.55, 0.1], -0.7, 2);
        const dL = K.drop(K.decor, [-1.55, 2.08, 0.3], 0.26, WATER); items.push(dL);
        const dR = K.drop(K.decor, [1.26, 3.36, 0.35], 0.24, WATER); items.push(dR);
        const gl = group(K.decor, [-1.3, 3.75, 0.1]);
        grain(gl, [0.05, 0.15, 0], -0.4); grain(gl, [-0.12, -0.15, 0], 0.3);
        items.push(gl);
        items.forEach(g => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.1 * Math.sin(t * 0.8 + i) * k;
        }));
      }

      /* ---------- idle: seedlings sway a little ---------- */
      {
        const fan = seedG.userData.fan;
        K.onTick((t, k) => { fan.rotation.z = 0.03 * Math.sin(t * 1.4) * k; });
      }

      /* ---------- head pose: tilt toward image-right, turn a little toward image-left (as drawn) ---------- */
      // ears as drawn: the image-left ear stands almost upright, the image-right one leans out
      K.ears.forEach(e => {
        if (e.sx < 0) { e.base = 0.26; e.g.position.x = -0.58; }
        else { e.base = -0.36; e.g.position.x = 0.55; e.g.position.y -= 0.03; }
        e.g.rotation.z = e.base;
        // white wisps of ear fur fanning up from the inner-lower corner
        const tm = std('#FFF9F0', { roughness: 0.9 }), sx = e.sx;
        for (let i = 0; i < 6; i++) {
          const f = i / 5;
          const b = [-sx * (0.19 - 0.1 * f), 0.03 + 0.03 * f, 0.12];
          const m = [-sx * (0.15 - 0.13 * f), 0.13 + 0.05 * f, 0.14];
          const t = [-sx * (0.07 - 0.2 * f), 0.22 + 0.07 * (1 - Math.abs(f - 0.5) * 2), 0.13];
          mesh(tube([b, m, t], tt => 0.024 * (1 - tt) + 0.003, 10, 6), tm, e.g);
        }
      });
      K.headG.rotation.y = YAW; K.headG.position.x = HEAD_DX;
      K.onTick((t, k, KK) => { KK.headG.rotation.z += ROLL; });
    },

    action: {
      label: '揮鞭', dur: 1.8,
      run(s, p, K) {
        const wp = K.body.children.find(o => o.userData.part === 'whip');
        if (wp && wp.userData.pivot) wp.userData.pivot.rotation.z = -0.45 * s * Math.sin(p * Math.PI * 4);
        const sd = K.body.children.find(o => o.userData.part === 'seedling');
        if (sd) sd.position.y = 0.06 * s;
        K.headG.rotation.x = -0.06 * s;
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '手持秧苗與柳鞭的芒神',
        text: '芒種是「有芒的麥子可收、有芒的稻子可種」的時節。這隻橘色英短化身芒神小牧童：帽頂冒出嫩葉與稻穗，左手抱一束剛拔起、根上還滴著水的秧苗，右手高舉綁著黃絲帶的柳鞭，笑咪咪地準備下田插秧。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '圓臉虎斑與琥珀大眼',
        text: '英短招牌的寬圓大臉，額頭有三道深橘虎斑、兩頰各三道橫紋；奶白色從下巴一路延伸到兩眼之間。琥珀棕色的大圓眼帶著白色亮點，粉色小鼻下張著大大的嘴、露出粉紅舌頭，一臉開心。' },
      hat: { chip: '小帽', tag: '服飾', name: '嫩葉稻穗小綠帽', dir: [0.3, 0.5, 1],
        text: '頭頂一頂圓圓的綠色小帽，繫著米白緞帶、正面打蝴蝶結並扣上金色圓珠。帽頂插著一叢嫩綠長葉，兩支金黃稻穗往畫面右側彎垂，點出「芒種」的芒。' },
      seedling: { chip: '秧苗', tag: '道具', name: '帶根秧苗束', dir: [-0.5, 0.2, 1],
        text: '左手（畫面左）抱著一大把秧苗，細長的葉片向左上方散開，中段用淡綠草繩束起；下方是帶泥的褐色根鬚，還滴著水珠，像剛從秧田拔起、正要插下。' },
      whip: { chip: '柳鞭', tag: '道具', name: '黃絲帶柳鞭', dir: [0.6, 0.1, 1],
        text: '右手（畫面右）高高舉起一根細長柳枝，上有幾個竹節般的枝節；靠近頂端長著兩片綠葉，並繫著一條長長的黃絲帶，是芒神驅牛催耕的柳鞭。' },
      collar: { chip: '領巾', tag: '服飾', name: '綠領巾與金鈴鐺',
        text: '肩上圍著一條淺鼠尾草綠領巾，在胸前偏左的地方打結，結上掛著一顆金色小鈴鐺，下方垂著兩條短短的綠色巾尾。' },
      robe: { chip: '短衣', tag: '服飾', name: '米白短衣與寬袖',
        text: '米白色及膝短衣，胸前繡著金色稻穗配綠葉。袖子到手肘就結束，袖口鑲深綠與黃綠兩道邊，露出橘色前臂。腰下是綠色百褶下襬，畫面左側覆著一片斜邊的米白前襟，中間垂一片綠色小裙片。' },
      belt: { chip: '腰帶', tag: '服飾', name: '綠腰帶與黃蝴蝶結',
        text: '深綠腰帶中間夾一道黃線，偏右繫著一個大大的黃色蝴蝶結，結下垂著一顆綠色圓珠和一串金黃流蘇。' },
      pouch: { chip: '種子簍', tag: '道具', name: '竹編種子簍', dir: [0.7, 0.1, 1],
        text: '右腰掛著一個圓鼓鼓的竹編小簍，編紋交錯，口沿收得小小的，裡頭冒出一小叢嫩芽，裝的是要播下的種子與秧苗。' },
      legs: { chip: '綁腿', tag: '服飾', name: '燈籠褲與綠綁腿', dir: [0.2, -0.1, 1],
        text: '米白燈籠褲在小腿處收口，右褲管繡著稻葉；褲腳下露出一截橘色腳踝，再纏上綠色綁腿，用黃繩交叉繫住並打小蝴蝶結，底下是奶白色的大肉掌，一副下田裝束。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '粗短環紋尾', dir: [1, 0.25, -0.6],
        text: '粗粗的橘色尾巴從右後方繞出，向上彎成一個大大的鉤，尾端圓鈍；上面有五道奶白色環紋，是橘虎斑的特徵。' }
    },
    order: ['overview', 'face', 'hat', 'seedling', 'whip', 'collar', 'robe', 'belt', 'pouch', 'legs', 'tail']
  });
})();
