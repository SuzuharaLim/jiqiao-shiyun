// @file 10_夏至_阿比西尼亞貓
// @title 夏至・風火輪哪吒 | 二十四節氣貓
(function () {
  // Colours are SAMPLED from refs/10.png (tools/colors.py). def.exposure (linear tone mapping, 0.7 ≈ 1 / the
  // lights' front brightening) makes a material render close to the sampled value, so M() only applies an
  // optional extra correction: M(hex, f) with f > 1 darkens, f < 1 brightens (f = 1 / omitted = as sampled).
  const EXPOSURE = 0.7;
  function M(hex, f) {
    f = f || 1; if (f === 1) return hex; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f, 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  // ---- colours sampled from refs/10.png (then compensated) ----
  const FUR = M('#F8B862'), FUR_TOP = M('#F4B462'), FUR_MID = M('#FBCB80'), FUR_LOW = M('#FCD492');
  const FUR_LT = M('#FDD08A'), STRIPE = M('#F09C48'), CREAM = M('#FFFAF0');
  const INK = '#C9803E', CREAM_INK = '#D9B68E';
  const TUNIC = M('#FCEACB'), TUNIC_SH = M('#F0DAB0'), TUNIC_INK = '#D5B27E';
  const GREEN = M('#9DB266'), GREEN_LT = M('#B9C77E'), GREEN_DK = M('#86A052'), GREEN_INK = '#6E8A3C', VEIN = M('#E6ECC2');
  const ORANGE = M('#F08A38'), ORANGE_LT = M('#F8A85C'), RED_OR = M('#E3692C'), ORANGE_INK = '#B9531E';
  const GOLD = M('#EDC062'), GOLD_LT = M('#FCE7A6'), GOLD_INK = '#B08A3A';
  const SASH_CREAM = M('#FBE4BE'), FLAME_O = M('#F99A45'), FLAME_Y = M('#FDE283');
  const TILT = -0.25;   // head tilted toward image-right, as drawn

  // stylised three-tongue flame for fabric / panels (canvas)
  function flameMotif(g, x, y, s, outer, inner) {
    g.save(); g.translate(x, y);
    const f = (k, c, dx) => {
      g.fillStyle = c; g.beginPath();
      g.moveTo(dx * s, s * 0.05);
      g.bezierCurveTo(-s * 0.42 * k + dx * s, s * 0.02, -s * 0.46 * k + dx * s, -s * 0.36 * k, -s * 0.18 * k + dx * s, -s * 0.62 * k);
      g.bezierCurveTo(-s * 0.2 * k + dx * s, -s * 0.4 * k, -s * 0.05 * k + dx * s, -s * 0.36 * k, -s * 0.02 * k + dx * s, -s * 0.46 * k);
      g.bezierCurveTo(-s * 0.02 * k + dx * s, -s * 0.72 * k, s * 0.08 * k + dx * s, -s * 0.86 * k, s * 0.16 * k + dx * s, -s * 1.0 * k);
      g.bezierCurveTo(s * 0.18 * k + dx * s, -s * 0.76 * k, s * 0.3 * k + dx * s, -s * 0.62 * k, s * 0.34 * k + dx * s, -s * 0.5 * k);
      g.bezierCurveTo(s * 0.36 * k + dx * s, -s * 0.42 * k, s * 0.34 * k + dx * s, -s * 0.36 * k, s * 0.3 * k + dx * s, -s * 0.3 * k);
      g.bezierCurveTo(s * 0.5 * k + dx * s, -s * 0.2 * k, s * 0.42 * k + dx * s, s * 0.02, dx * s, s * 0.05);
      g.fill();
    };
    f(1, outer, 0); f(0.55, inner, 0.02);
    g.restore();
  }
  // round sun emblem (gourd, medallion)
  function sunMotif(g, cx, cy, s, core, ray) {
    g.save(); g.translate(cx, cy);
    g.fillStyle = ray;
    for (let i = 0; i < 12; i++) {
      g.save(); g.rotate(i / 12 * Math.PI * 2);
      g.beginPath(); g.moveTo(-s * 0.08, -s * 0.52); g.lineTo(0, -s * 0.92); g.lineTo(s * 0.08, -s * 0.52); g.closePath(); g.fill();
      g.restore();
    }
    g.fillStyle = core; g.beginPath(); g.arc(0, 0, s * 0.44, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  NEKO.run({
    meta: {
      id: '10', term: '夏至', title: '夏至・風火輪哪吒', seal: '至',
      eyebrow: '二〇二七節氣貓 · 10 夏至 · 阿比西尼亞貓',
      aria: '頭戴金蓮冠與橘紅雙髻、額繫紅頭帶，身穿米白短衣、荷葉披領與荷葉裙，左手高舉燃火紅葫蘆、右手握大芭蕉葉扇，腳踏兩只風火輪、身繞橘紅混天綾的橘色虎斑阿比西尼亞貓 3D 模型'
    },
    theme: { accent: '#B24A1C', accentDark: '#F6AE72', glow: 'rgba(246, 150, 70, 0.28)', glowColor: '#FFC27A' },
    palette: [['#F6AE52', '暖橘虎斑'], ['#FCEFD2', '奶油米白'], ['#9DB266', '荷葉綠'], ['#F08A38', '混天綾橘紅']],
    spec: [['品種', '阿比西尼亞貓'], ['角色', '哪吒三太子'], ['頭身比', '約 1 : 1.3']],
    seed: 1021,
    exposure: EXPOSURE,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR_MID, low: FUR_LOW, deep: STRIPE, cream: CREAM,
        ink: INK, creamInk: CREAM_INK, noise: { colors: [M('#FFE6BE'), M('#EE9A48')], alpha: 0.07, n: 900 },
        paintBase(g, P) {
          const L = (lon, lat) => P.xy(lon, lat);
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.45, FUR_MID); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // lighter forehead between the ears
          g.filter = 'blur(16px)';
          { const [x, y] = L(0, 22); D_soft(g, x, y, 170, 80, FUR_LT, 0.95); }
          // back-of-head stripes
          g.filter = 'blur(4px)';
          [-160, -132, -104, 104, 132, 160].forEach(lon => P.stroke(g, [L(lon, 82), L(lon + (lon > 0 ? 5 : -5), 35), L(lon, -25)], 20, STRIPE, 0.6));
          // cream lower face: under the eyes, muzzle, chin (outer cheeks stay orange)
          g.filter = 'blur(8px)';
          const half = [[0, -9], [7, -15], [14, -21], [24, -23], [33, -21], [40, -25], [47, -35], [53, -50], [58, -68], [60, -90]];
          const poly = half.concat(half.slice().reverse().map(([lo, la]) => [-lo, la]));
          g.fillStyle = CREAM; g.beginPath();
          poly.forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill();
          // thin forehead stripes fanning up from between the eyes
          g.filter = 'blur(2px)';
          g.filter = 'blur(3px)';
          g.filter = 'blur(4px)';
          [[-28, -17, 30, 14], [-12, -7, 20, 18], [2, 1, 18, 18], [16, 9, 22, 17], [31, 21, 32, 13]].forEach(([lt, lb, end, wd]) => {
            P.stroke(g, [L(lt, 82), L((lt + lb) / 2 + (lt < 0 ? -3 : 3), 55), L(lb, end)], wd, STRIPE, 0.7);
          });
          // temple stripes beside the ears
          [[[36, 36], [50, 32], [64, 26]], [[40, 22], [54, 18], [68, 14]]].forEach(sp => {
            const p = sp.map(([lo, la]) => L(lo, la));
            P.stroke(g, p, 9, STRIPE, 0.7); P.stroke(g, P.mirror(p), 9, STRIPE, 0.7);
          });
          // cheek stripes on the outer cheeks
          g.filter = 'blur(2.5px)';
          [[[54, -6], [68, -8], [88, -9]], [[57, -19], [71, -22], [90, -24]], [[60, -32], [72, -35], [88, -38]]].forEach(s => {
            const p = s.map(([lo, la]) => L(lo, la));
            P.stroke(g, p, 15, STRIPE, 0.8);
            P.stroke(g, P.mirror(p), 15, STRIPE, 0.8);
          });
          g.filter = 'none';
          function D_soft(gg, x, y, rx, ry, c, a) { P.soft(gg, x, y, rx, ry, c, a); }
        }
      },
      head: { y: 4.47, neck: 3.72, w: 0.9, h: 0.86, d: 0.8, cheek: 0.14, ruff: 0.03, ruffFreq: 11, chinDrop: 0.06,
        // the skull narrows a little above the eyes (the picture's head is widest at the cheeks)
        deform(p, o) { if (o.y > 0.15) p.x *= 1 - 0.07 * Math.pow((o.y - 0.15) / 0.85, 1.4); },
        fur: { layers: 12, length: 0.04, gravity: 0.01, repeat: [10, 6] } },
      eyes: { x: 0.37, y: -0.02, r: 0.19, sx: 0.9, sy: 1.06, sz: 0.42, color: '#4A2F18', iris: '#9E7042', pupil: '#3B2414', pupilR: 0.52, shine: 0 },
      nose: { y: -0.1, color: '#F2A07C', size: 0.8 },
      muzzle: false,
      mouth: { type: 'open', y: -0.25, w: 0.16, open: 1.65, color: '#B8653E', inner: '#DB7458', tongue: '#F4A08A' },
      blush: { color: 'rgba(250,150,140,0.6)', x: 0.6, y: -0.2, r: 34 },
      whiskers: { color: '#E6D8C6', n: 3, len: 0.75, r: 0.006, y: -0.17, x: 0.36, spread: 0.1, droop: 0.02, curve: 0.04 },
      ears: { x: 0.6, y: 0.55, z: -0.04, tilt: 0.55, yaw: 0.2, pitch: -0.08, size: [0.5, 0.92, 0.2], sharp: 0.95,
        L: { size: [0.5, 0.8, 0.2] },
        color: FUR, inner: M('#F6B9A4'), tuft: M('#FFFFFF'), fur: { layers: 8, length: 0.025, gravity: 0.005, repeat: [3, 3] } },
      bib: false,
      robe: {
        profile: [[0.6, 2.2], [0.62, 2.4], [0.6, 2.62], [0.575, 2.85], [0.565, 3.1], [0.54, 3.3], [0.48, 3.48], [0.36, 3.64], [0.14, 3.8]],
        color: '#FFFFFF', ink: TUNIC_INK, hemY: -1,
        paint(g, w, h, D) {
          D.fill(g, TUNIC);
          const lg = g.createLinearGradient(0, 0, w, 0);
          [[0, 0.5], [0.22, 0.25], [0.5, 0], [0.78, 0.25], [1, 0.5]].forEach(([t, a]) => lg.addColorStop(t, NEKO.rgba(TUNIC_SH, a)));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
        }
      },
      collar: false,
      arms: {
        L: { hand: [-1.12, 4.14, 0.26], path: [[-0.4, 3.46, 0], [-0.74, 3.64, 0.12], [-1.02, 3.93, 0.22]], width: 1.6, pawScale: 1.75 },
        R: { hand: [1.42, 3.14, 0.28], path: [[0.4, 3.46, 0], [0.82, 3.28, 0.12], [1.2, 3.13, 0.24]], width: 1.5, pawScale: 1.5 }
      },
      sleeves: { style: 'narrow', color: TUNIC, ink: TUNIC_INK, trim: false,
        paint(g, w, h) {
          g.fillStyle = TUNIC; g.fillRect(0, 0, w, h);
          const lg = g.createLinearGradient(0, 0, 0, h);
          lg.addColorStop(0, NEKO.rgba(TUNIC_SH, 0)); lg.addColorStop(0.5, NEKO.rgba(TUNIC_SH, 0.6)); lg.addColorStop(1, NEKO.rgba(TUNIC_SH, 0));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
        } },
      paws: { color: CREAM, ink: CREAM_INK },
      belt: false,
      legs: null,
      feet: false,
      tail: {
        pts: [[0.22, 2.26, -0.36], [0.72, 1.72, -0.55], [1.2, 1.58, -0.45], [1.66, 1.6, -0.35], [1.9, 1.86, -0.28], [1.9, 2.15, -0.22], [1.72, 2.32, -0.18]],
        r: 0.17, color: '#F4B058', deep: '#DC9038', tip: '#E09A50', tipStart: 0.9, bands: 5, bandAlpha: 0.9, ink: INK,
        shape: t => t < 0.86 ? 0.9 + 0.1 * Math.sin(Math.PI * t / 0.86) : Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.86) / 0.14, 2))) * 0.92 + 0.02,
        fur: { layers: 10, length: 0.035, gravity: 0.01, repeat: [14, 5] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, tube, lathe, medal, D } = K;
      const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
      const lerp = (a, b, t) => a + (b - a) * t;
      // smooth closed outline through control points; points flagged [x, y, 1] stay sharp (flame tips)
      function flameShape(pts, sc) {
        const n = pts.length, P = i => pts[((i % n) + n) % n], mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const S = Math.max(0, pts.findIndex(p => p[2])), sh = new THREE.Shape();
        sh.moveTo(P(S)[0] * sc, P(S)[1] * sc);
        for (let k = 1; k <= n; k++) {
          const c = P(S + k), nx = P(S + k + 1);
          if (c[2]) { if (!P(S + k - 1)[2] ) continue; sh.lineTo(c[0] * sc, c[1] * sc); continue; }
          const e = nx[2] ? nx : mid(c, nx);
          sh.quadraticCurveTo(c[0] * sc, c[1] * sc, e[0] * sc, e[1] * sc);
        }
        return sh;
      }
      const HY = K.cfg.head.y, HC = K.HC;
      K.character.updateMatrixWorld(true);

      // head tilt toward image-right (added after the engine's idle sway every frame)
      K.onTick(() => { K.headG.rotation.z += TILT; });
      // picture-book look: lift the head's shading a little (its fur shells clone this material later)
      Object.assign(K.headMesh.material, { emissive: new THREE.Color(1, 1, 1), emissiveMap: K.headTex, emissiveIntensity: 0.16 });
      // the image-right ear sticks out further than the image-left one
      K.ears.forEach(e => { e.base = e.sx < 0 ? 0.42 : -0.72; e.g.rotation.z = e.base; });

      /* ---------------- generic helpers ---------------- */
      // flat strap with an elliptical cross-section: two-coloured (face side / back side), outlines work
      function strap(pts, o) {
        const curve = new THREE.CatmullRomCurve3(pts.map(K.toV), !!o.closed);
        const segs = o.segs || 90, rad = o.radial || 14;
        const pos = [], uv = [], idx = [];
        for (let i = 0; i <= segs; i++) {
          const t = i / segs, P = curve.getPointAt(t), T = curve.getTangentAt(t);
          const f = typeof o.face === 'function' ? o.face(t, P) : K.toV(o.face || [0, 0, 1]);
          let side = T.clone().cross(f); if (side.lengthSq() < 1e-6) side = T.clone().cross(V(1, 0, 0)); side.normalize();
          if (o.twist) side.applyAxisAngle(T, o.twist(t));
          const nrm = side.clone().cross(T).normalize();
          const w = (typeof o.w === 'function' ? o.w(t) : o.w) / 2, th = (o.th || 0.02) / 2;
          for (let j = 0; j <= rad; j++) {
            const a = j / rad * Math.PI * 2;
            const q = P.clone().addScaledVector(side, Math.cos(a) * w).addScaledVector(nrm, Math.sin(a) * th);
            pos.push(q.x, q.y, q.z); uv.push(t, j / rad);
          }
        }
        for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); geo.computeVertexNormals();
        return geo;
      }
      const twoTone = (face, back) => canvasTex(8, 64, (g, w, h) => { g.fillStyle = back; g.fillRect(0, 0, w, h / 2); g.fillStyle = face; g.fillRect(0, h / 2, w, h / 2); });

      // extruded, cupped leaf of unit length (base at origin, tip at +y, face +z); lobes = notches per side
      const leafGeoCache = {};
      function leafGeo(wr, curl, bend, lobes) {
        const key = [wr, curl, bend, lobes].join('|');
        if (leafGeoCache[key]) return leafGeoCache[key];
        const N = 60, R = [];
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          let hw = lobes ? wr / 2 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.6) : wr / 2 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.85);
          if (lobes) hw *= 1 - 0.13 * Math.pow(Math.abs(Math.sin(t * Math.PI * lobes)), 4) * sst(0.12, 0.3, t);
          R.push([hw, t]);
        }
        const s = new THREE.Shape(); s.moveTo(0, 0);
        R.forEach(([x, y]) => s.lineTo(x, y));
        for (let i = N - 1; i > 0; i--) s.lineTo(-R[i][0], R[i][1]);
        s.closePath();
        const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 6 });
        geo.translate(0, 0, -0.006);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i);
          p.setZ(i, p.getZ(i) - curl * Math.pow(x / (wr / 2), 2) * wr * 0.35 + bend * y * y);
        }
        geo.computeVertexNormals();
        return (leafGeoCache[key] = geo);
      }
      const leafTexCache = {};
      function leafMat(key, base, light, dark, vein, wr, n, steep) {
        if (leafTexCache[key]) return leafTexCache[key];
        const k = steep || 1;
        const tex = canvasTex(256, 512, (g, w, h) => {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, dark); lg.addColorStop(0.3, base); lg.addColorStop(0.5, light); lg.addColorStop(0.7, base); lg.addColorStop(1, dark);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.lineCap = 'round';
          // soft darker strokes between the veins
          for (let i = 1; i <= n; i++) {
            const y = h - i * h / (n + 1.2);
            [-1, 1].forEach(s => { g.strokeStyle = NEKO.rgba(dark, 0.4); g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2 + s * 14, y - 10); g.quadraticCurveTo(w / 2 + s * w * 0.16, y - 44 * k, w / 2 + s * w * 0.5, y - 90 * k); g.stroke(); });
          }
          g.strokeStyle = vein;
          for (let i = 1; i <= n; i++) {
            const y = h - i * h / (n + 1.2) + 26;
            [-1, 1].forEach(s => { g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * w * 0.14, y - 36 * k, w / 2 + s * w * 0.5, y - 80 * k); g.stroke(); });
          }
          g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, h * 0.03); g.stroke();
        });
        tex.repeat.set(1 / wr, 1); tex.offset.set(0.5, 0);
        return (leafTexCache[key] = texMat(tex, { roughness: 0.8, side: THREE.DoubleSide }));
      }
      const greenLeafMat = (wr) => leafMat('g' + wr, GREEN, GREEN_LT, GREEN_DK, VEIN, wr, 6);
      // place a leaf: base at pos, yaw about y, then pitch about local x, roll about local z (YXZ)
      function leaf(parent, L, wr, pos, yaw, pitch, roll, o = {}) {
        const g = new THREE.Group(); g.position.copy(K.toV(pos)); g.rotation.order = 'YXZ';
        g.rotation.set(pitch || 0, yaw || 0, roll || 0); parent.add(g);
        const m = mesh(leafGeo(wr, o.curl === undefined ? 0.5 : o.curl, o.bend || 0, o.lobes || 0), o.mat || greenLeafMat(wr), g, null, L, o.ink || GREEN_INK);
        return g;
      }
      const goldMat = std(GOLD, { roughness: 0.45, metalness: 0.05 }), goldLtMat = std(GOLD_LT, { roughness: 0.4, metalness: 0.05 });
      const goldBright = std(M('#F4CD6E'), { roughness: 0.4, metalness: 0.05 });
      const ring = (parent, center, axis, R, r, mat, ink) => {
        const m = mesh(new THREE.TorusGeometry(R, r, 14, 48), mat || goldMat, parent, center, null, ink === undefined ? GOLD_INK : ink);
        m.quaternion.setFromUnitVectors(V(0, 0, 1), K.toV(axis).normalize());
        return m;
      };

      // gold bangle (乾坤圈): a rounded band hugging a limb, axis along dir
      const bangle = (parent, center, axis, R, hgt) => {
        const pr = [[R, -hgt / 2], [R + 0.04, -hgt / 2], [R + 0.058, -hgt / 4], [R + 0.058, hgt / 4], [R + 0.04, hgt / 2], [R, hgt / 2]].map(q => new THREE.Vector2(q[0], q[1]));
        const g = new THREE.LatheGeometry(new THREE.SplineCurve(pr).getSpacedPoints(16), 48); K.smoothNormals(g);
        const m = mesh(g, goldBright, parent, center, null, GOLD_INK);
        m.quaternion.setFromUnitVectors(V(0, 1, 0), K.toV(axis).normalize());
        return m;
      };

      /* ---------------- white tufts inside the ears ---------------- */
      {
        const tm = std(M('#FFFFFF'), { roughness: 0.95 });
        K.ears.forEach(({ g, sx }) => {
          [[-0.08, 0.4, 0.065], [0.0, 0.44, 0.06], [0.08, 0.34, 0.055]].forEach(([x, len, r0]) => {
            const a = V(x * sx, 0.08, 0.1), b = V(x * sx * 0.6 - 0.04 * sx, 0.08 + len * 0.6, 0.13), c = V(-0.02 * sx + x * 0.3 * sx, 0.08 + len, 0.1);
            mesh(tube([a, b, c], t => r0 * (1 - Math.pow(t, 1.2)) + 0.004, 16, 8), tm, g, null, null, CREAM_INK);
          });
        });
      }

      /* ---------------- eye highlights: big one upper-right, small one lower-left (as painted) ---------------- */
      {
        const EY = K.cfg.eyes, r = EY.r;
        K.eyes.forEach(eg => {
          const inner = eg.children[0];
          const s1 = mesh(sphere(0.3 * r, 20, 14), K.M.shine, inner, [0.26 * r, 0.36 * r, r * EY.sz - 0.02], [1, 1.1, 0.5]); s1.castShadow = false;
          const s2 = mesh(sphere(0.13 * r, 14, 10), K.M.shine, inner, [-0.3 * r, -0.36 * r, r * EY.sz - 0.01], [1, 1, 0.5]); s2.castShadow = false;
        });
      }

      /* ---------------- face: blush freckles ---------------- */
      {
        const g = K.headTex.image.getContext('2d');
        [-1, 1].forEach(sx => [[-0.05, 0.01], [0, -0.025], [0.05, 0.01]].forEach(([dx, dy]) => {
          const s = K.onSkin(sx * 0.6 + dx, HY - 0.2 + dy, [K.headMesh]);
          if (!s.uv) return;
          g.fillStyle = 'rgba(226,110,100,0.9)'; g.beginPath(); g.arc(s.uv.x * 1024, (1 - s.uv.y) * 512, 2.4, 0, Math.PI * 2); g.fill();
        }));
        K.headTex.needsUpdate = true;
      }

      /* ---------------- headgear: gold lotus crown, twin buns, red headband ---------------- */
      const crownG = part('crown', K.head);
      const headRay = new THREE.Raycaster();
      const surf = (dir) => {
        const d = dir.clone().normalize();
        headRay.set(HC.clone().addScaledVector(d, 3), d.clone().negate());
        const h = headRay.intersectObject(K.headMesh, false)[0];
        return h ? h.point.clone() : HC.clone().addScaledVector(d, 0.9);
      };
      {
        // headband: a tilted ring, high over the brow at the front, passing in front of the ear bases, low at the back
        const hb = (psi) => { const c = Math.cos(psi); return V(Math.sin(psi), 0.72 + 0.35 * c + 1.73 * Math.pow(Math.max(c, 0), 2), c + 0.05).normalize(); };
        const pts = [];
        for (let i = 0; i < 48; i++) { const d = hb(i / 48 * Math.PI * 2); pts.push(surf(d).addScaledVector(d, 0.04)); }
        const bandMat = std(ORANGE, { roughness: 0.75 });
        mesh(strap(pts, { closed: true, segs: 160, w: 0.12, th: 0.028, face: (t, P) => P.clone().sub(HC).normalize() }), bandMat, crownG, null, null, ORANGE_INK);
        // streamer from beside the crown, over the image-right ear base, down the cheek
        const st = [[0.28, 0.78, 0.36], [0.6, 0.58, 0.26], [0.84, 0.36, 0.18], [0.97, 0.12, 0.1]].map((q, i) => { const d = V(q[0], q[1], q[2]).normalize(); return surf(d).addScaledVector(d, 0.05 + 0.04 * i); });
        mesh(strap(st, { w: t => 0.115 * (1 - 0.25 * sst(0.6, 1, t)), th: 0.022, face: (t, P) => P.clone().sub(HC).normalize() }), bandMat, crownG, null, null, ORANGE_INK);
      }
      {
        // twin orange-red buns (哪吒 雙髻)
        const bm = std(M('#EC7A35'), { roughness: 0.6 });
        [[-0.45, 1.08, -0.04], [0.48, 1.04, -0.06]].forEach(([x, y, z]) => {
          mesh(sphere(0.16, 32, 24), bm, crownG, [x, HY + y, z], null, ORANGE_INK);
          mesh(sphere(0.04, 12, 10), std('#FFF4E6', { roughness: 0.4 }), crownG, [x - 0.05, HY + y + 0.06, z + 0.12], [1, 0.8, 0.5]).castShadow = false;
        });
      }
      {
        // gold lotus crown: round gem in a petal halo, scroll wings, flames behind
        const d0 = V(0.02, 2.35, 1.3).normalize(), top = surf(d0).addScaledVector(d0, 0.02);
        const cg = group(crownG, [top.x, top.y, top.z], [-0.28, 0, 0]);
        cg.scale.setScalar(1.2);
        // crescent base (curving up at both ends, like the picture's boat-shaped gold band)
        { const cr = []; for (let k = 0; k <= 24; k++) { const a = -1 + 2 * k / 24; cr.push([0.21 * a, 0.02 + 0.1 * a * a]); }
          for (let k = 24; k >= 0; k--) { const a = -1 + 2 * k / 24; cr.push([0.17 * a, 0.085 + 0.07 * a * a]); }
          mesh(K.extrude(cr, 0.07, 0.016, 2, 8), goldMat, cg, [0, 0, 0], null, GOLD_INK); }
        const petals = new THREE.Shape();
        for (let k = 0; k <= 96; k++) { const a = k / 96 * Math.PI * 2, r = 0.13 + 0.03 * Math.pow(Math.abs(Math.cos(a * 4)), 0.6); const x = Math.sin(a) * r, y = Math.cos(a) * r; k ? petals.lineTo(x, y) : petals.moveTo(x, y); }
        mesh(K.extrude(petals, 0.04, 0.012, 2, 8), goldMat, cg, [0, 0.2, -0.01], null, GOLD_INK);
        ring(cg, [0, 0.2, 0.025], [0, 0, 1], 0.09, 0.022, goldLtMat);
        mesh(sphere(0.078, 28, 20), goldLtMat, cg, [0, 0.2, 0.03], [1, 1, 0.6], GOLD_INK);
        mesh(sphere(0.03, 16, 12), std('#FFF8E0', { roughness: 0.3 }), cg, [-0.025, 0.225, 0.07], [1, 1, 0.4]).castShadow = false;
        mesh(K.dropGeo(0.12, 0.045, 1.8), goldMat, cg, [0, 0.39, 0], null, GOLD_INK);
        [-1, 1].forEach(sx => {
          const w = group(cg, [0.17 * sx, 0.06, 0], [0, 0, -0.35 * sx]);
          mesh(K.extrude([[0, 0], [0.1 * sx, 0.0], [0.16 * sx, 0.07], [0.14 * sx, 0.16], [0.07 * sx, 0.12], [0.02 * sx, 0.07]], 0.04, 0.012, 3, 10), goldMat, w, null, null, GOLD_INK);
          const c = mesh(new THREE.TorusGeometry(0.045, 0.018, 10, 24, Math.PI * 1.5), goldMat, w, [0.15 * sx, 0.16, 0], null, GOLD_INK);
          c.rotation.z = sx > 0 ? -0.6 : Math.PI + 0.6;
          c.scale.x = sx;
        });
        // red-orange flame tuft behind the crown (smaller and redder than the torch fire)
        const CF_O = M('#EA7E3E'), CF_I = M('#F7A457');
        [[0.0, 0.3, -0.1, 0.36, 0], [-0.12, 0.25, -0.08, 0.24, 0.6], [0.12, 0.25, -0.08, 0.24, -0.6], [-0.2, 0.17, -0.06, 0.18, 1.0], [0.2, 0.17, -0.06, 0.18, -1.0]]
          .forEach(([x, y, z, sc, rz]) => { K.flame(cg, [x, y, z], sc, CF_O, CF_I).rotation.z = rz; });
      }

      /* ---------------- tunic: flame motifs, leaf collar, scarf and sun medallion ---------------- */
      {
        const rt = K.robeMesh.material.map, g = rt.image.getContext('2d');
        [[-40, 2.95, 170], [150, 2.95, 130], [-150, 2.9, 110]].forEach(([deg, y, s]) => {
          const [x, yy] = K.robeUV(deg, y);
          flameMotif(g, x, yy + s * 0.35, s, FLAME_O, FLAME_Y);
        });
        rt.needsUpdate = true;
      }
      const robeG = K.robeG;
      {
        // leaf collar radiating over the shoulders
        const n = 14;
        for (let i = 0; i < n; i++) {
          const deg = -180 + (i + 0.5) * 360 / n, a = deg * Math.PI / 180;
          if (Math.abs(deg) < 14) continue;
          const r0 = K.robeR(3.6) + 0.02;
          const big = deg > 20 && deg < 100 ? 1.25 : 1;
          leaf(robeG, 0.46 * big, 0.55, [Math.sin(a) * r0, 3.62 + 0.02 * (i % 2), Math.cos(a) * r0], a, -0.95 - 0.12 * (i % 2), Math.PI + 0.3 * (i % 2 ? 1 : -1), { curl: 0.35, bend: -0.25 });
        }
        // orange scarf dipping to the medallion
        const sc = [];
        for (let i = 0; i < 48; i++) {
          const deg = i / 48 * 360, a = deg * Math.PI / 180, fr = Math.pow(Math.max(0, Math.cos(a)), 3);
          const y = 3.64 - 0.18 * fr;
          const r = K.robeR(y) + 0.06;
          sc.push(V(Math.sin(a) * r, y, Math.cos(a) * r));
        }
        mesh(tube(sc, 0.048, 120, 10, true), std(M('#DD6E2A'), { roughness: 0.7 }), robeG, null, null, ORANGE_INK);
        // sun medallion with two tassels
        const zf = K.robeR(3.38) + 0.08;
        medal(robeG, [0, 3.38, zf], 0.185, (g) => sunMotif(g, 128, 128, 200, M('#FDD36E'), M('#F2A43E')), GOLD, GOLD_INK, GOLD_LT);
        for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; mesh(sphere(0.03, 12, 8), goldBright, robeG, [Math.cos(a) * 0.19, 3.38 + Math.sin(a) * 0.19, zf - 0.005], null, GOLD_INK); }
        [-1, 1].forEach(sx => {
          mesh(sphere(0.04, 14, 10), std(M('#A3BC7B'), { roughness: 0.6 }), robeG, [0.075 * sx, 3.17, zf + 0.01], null, GREEN_INK);
          K.tassel(robeG, [0.075 * sx, 3.12, zf + 0.01], ORANGE, 0.17, 0.05, ORANGE_INK);
        });
      }

      /* ---------------- belt of leaves, orange cord and bow; leaf skirt ---------------- */
      const skirtG = part('skirt', K.body);
      const YB = 2.64;
      {
        const rB = K.robeR(YB);
        // skirt surface: bell-shaped, petal hem, lifted at the front-right by the raised knee
        const lift = phi => Math.exp(-Math.pow((phi - 0.85) / 0.55, 2));
        const hemY = phi => 1.6 + 0.72 * lift(phi) + 0.07 * Math.abs(Math.sin(3.5 * phi));
        const rHem = phi => 0.92 + 0.3 * lift(phi) - 0.04 * Math.abs(Math.sin(3.5 * phi));
        const NU = 140, NV = 30, pos = [], uv = [], idx = [];
        for (let j = 0; j <= NV; j++) {
          const t = j / NV;
          for (let i = 0; i <= NU; i++) {
            const phi = -Math.PI + i / NU * Math.PI * 2;
            const y = lerp(YB, hemY(phi), t);
            const r = rB + 0.02 + (rHem(phi) - rB - 0.02) * (1 - Math.pow(1 - t, 1.7)) + 0.045 * Math.pow(t, 1.5) * Math.sin(phi * 11);
            pos.push(Math.sin(phi) * r, y, Math.cos(phi) * r); uv.push(i / NU, 1 - t);
          }
        }
        for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const tex = canvasTex(1024, 256, (g, w, h) => {
          g.fillStyle = TUNIC; g.fillRect(0, 0, w, h);
          for (let k = 0; k < 9; k++) { const x = (k + 0.5) / 9 * w; D.soft(g, x, h * 0.7, 30, 90, TUNIC_SH, 0.7); }
          g.fillStyle = NEKO.rgba(TUNIC_SH, 0.9); g.fillRect(0, h - 10, w, 10);
        });
        const sm = mesh(geo, texMat(tex, { side: THREE.FrontSide, roughness: 0.9 }), skirtG, null, null, TUNIC_INK);
        const lin = new THREE.Mesh(geo, std(TUNIC_SH, { side: THREE.BackSide })); lin.receiveShadow = true; skirtG.add(lin);
        K.skirtR = (phi, y) => { // radius of the skirt at angle phi and height y (for placing leaves)
          const t = Math.min(Math.max((YB - y) / (YB - hemY(phi)), 0), 1);
          return rB + 0.02 + (rHem(phi) - rB - 0.02) * (1 - Math.pow(1 - t, 1.7));
        };
      }
      {
        // big hanging leaves over the skirt (front-left, front-centre, sides, back)
        [[-68, 0.8, 0.52, 0.5], [-44, 0.7, 0.5, 0.7], [8, 0.66, 0.46, -0.3], [112, 0.74, 0.5, 0.2], [165, 0.74, 0.5, -0.2], [-118, 0.74, 0.5, 0.3], [-165, 0.68, 0.5, 0]].forEach(([deg, L, wr, roll]) => {
          const a = deg * Math.PI / 180, r = K.skirtR(a, YB - 0.05) + 0.07;
          leaf(skirtG, L, wr, [Math.sin(a) * r, YB - 0.03, Math.cos(a) * r], a, -0.72, Math.PI + roll, { curl: 0.4, bend: -0.25 });
        });
        // gold flame panel at the front-left (a broad rounded tongue hanging from the bow)
        const pg = new THREE.Group(); pg.rotation.order = 'YXZ';
        const a = -16 * Math.PI / 180, r = K.skirtR(a, 2.45) + 0.1;
        pg.position.set(Math.sin(a) * r, 2.52, Math.cos(a) * r); pg.rotation.set(-0.46, a, Math.PI - 0.6); skirtG.add(pg);
        const PW = 0.46, PL = 0.86;
        const shp = []; for (let i = 0; i <= 30; i++) { const th = i / 30 * Math.PI; shp.push([PW / 2 * Math.sin(th), PL * Math.pow((1 - Math.cos(th)) / 2, 0.55)]); }
        const outline = shp.concat(shp.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
        const geo = K.extrude(outline, 0.03, 0.01, 2, 8);
        const tex = canvasTex(256, 512, (g, w, h) => {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, M('#F5BE45')); lg.addColorStop(0.5, M('#FEE27C')); lg.addColorStop(1, M('#F5BE45'));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.save(); g.translate(w / 2, h * 0.1); g.rotate(Math.PI); flameMotif(g, 0, 0, 250, M('#F28A3A'), FLAME_Y); g.restore();
        });
        tex.repeat.set(1 / PW, 1 / PL); tex.offset.set(0.5, 0);
        mesh(geo, [texMat(tex, { roughness: 0.6 }), std(GOLD, { roughness: 0.5 })], pg, null, null, GOLD_INK);
      }
      {
        // leaf wreath around the waist
        const rB = K.robeR(YB) + 0.04;
        for (let i = 0; i < 14; i++) {
          const deg = -180 + (i + 0.5) * 360 / 14, a = deg * Math.PI / 180;
          const side = deg < 0 ? -1 : 1;
          leaf(skirtG, 0.52, 0.5, [Math.sin(a) * rB, YB + 0.03 * (i % 2), Math.cos(a) * rB], a, -0.25, -side * (1.3 + 0.35 * (i % 2)), { curl: 0.35 });
        }
        // orange cord, bow, gold ball and streamers
        const om = std(RED_OR, { roughness: 0.7 });
        const cord = mesh(new THREE.TorusGeometry(K.robeR(YB) + 0.09, 0.035, 10, 96), om, skirtG, [0, YB, 0], null, ORANGE_INK);
        cord.rotation.x = Math.PI / 2;
        const zK = K.robeR(YB) + 0.16;
        [-1, 1].forEach(sx => {
          const l = mesh(new THREE.TorusGeometry(0.13, 0.036, 12, 32), om, skirtG, [0.15 * sx, YB - 0.06, zK], [1.15, 0.8, 1], ORANGE_INK);
          l.rotation.set(0.1, 0.3 * sx, -0.55 * sx);
          mesh(strap([[0.03 * sx, YB - 0.05, zK + 0.03], [0.1 * sx, YB - 0.25, zK + 0.1], [0.07 * sx, YB - 0.46, zK + 0.12], [0.14 * sx, YB - 0.66, zK + 0.12]],
            { w: t => 0.11 * (1 - 0.45 * sst(0.7, 1, t)), th: 0.022 }), om, skirtG, null, null, ORANGE_INK);
        });
        mesh(sphere(0.11, 28, 20), goldMat, skirtG, [0, YB, zK + 0.04], null, GOLD_INK);
        mesh(sphere(0.035, 12, 10), std('#FFF6D8', { roughness: 0.3 }), skirtG, [-0.035, YB + 0.04, zK + 0.14], [1, 1, 0.5]).castShadow = false;
      }

      /* ---------------- 混天綾: long red-orange sash with a cream lining ---------------- */
      const sashG = part('sash', K.body);
      {
        const tex = twoTone(M('#F07A30'), SASH_CREAM);
        const sm = texMat(tex, { roughness: 0.75 });
        const faceFn = (t, P) => { const rad = V(P.x, 0, P.z).normalize(); return rad.lerp(V(0, 0, 1), sst(0.75, 1.25, Math.abs(P.x))).normalize(); };
        // hangs straight down beside the raised arm (tip at the lotus' height), passes behind the forearm and
        // the shoulders, comes out under the image-right arm and swings down past the tail
        const main = [[-1.0, 2.5, 0.25], [-1.08, 2.78, 0.22], [-0.97, 3.08, 0.22], [-1.1, 3.38, 0.2], [-1.24, 3.62, 0.1],
          [-1.04, 3.88, -0.14], [-0.72, 3.86, -0.32], [-0.4, 3.66, -0.52], [-0.05, 3.45, -0.64], [0.35, 3.16, -0.6], [0.74, 2.95, -0.38], [1.06, 2.78, -0.12], [1.42, 2.6, 0.02],
          [1.8, 2.52, 0.05], [2.14, 2.38, 0.05], [2.31, 2.05, 0.06], [2.25, 1.7, 0.08], [2.02, 1.46, 0.1], [1.86, 1.4, 0.1]];
        // t 0–0.18 hangs beside the raised arm, 0.25 behind the forearm, 0.3–0.62 across the back, 0.62–1 image-right side
        mesh(strap(main, { segs: 280, w: t => 0.31 * (0.15 + 0.85 * sst(0, 0.05, t)) * (1 - 0.3 * sst(0.22, 0.34, t)) * (1 + 0.3 * sst(0.58, 0.7, t)) * (1 - 0.35 * sst(0.9, 1, t)), th: 0.025, face: faceFn,
          twist: t => Math.PI * (sst(0.06, 0.13, t) * (1 - sst(0.2, 0.26, t)) + sst(0.72, 0.8, t) * (1 - sst(0.9, 0.96, t))) }), sm, sashG, null, null, ORANGE_INK);
        // the right end: gold bead and tassel
        mesh(sphere(0.075, 20, 14), goldMat, sashG, [1.84, 1.36, 0.1], null, GOLD_INK);
        K.tassel(sashG, [1.84, 1.28, 0.1], ORANGE, 0.26, 0.06, ORANGE_INK);
        // short streamer curling from the left hip
        mesh(strap([[-0.55, 2.45, 0.35], [-0.86, 2.2, 0.3], [-1.08, 1.9, 0.24], [-1.08, 1.62, 0.2], [-0.9, 1.46, 0.16]],
          { w: t => 0.16 * (1 - 0.8 * sst(0.7, 1, t)), th: 0.022, face: [0, 0.2, 1], twist: t => -0.8 * t }), sm, sashG, null, null, ORANGE_INK);
      }

      /* ---------------- 乾坤圈: gold bracelets ---------------- */
      ['L', 'R'].forEach(s => { const h = K.hands[s]; bangle(K.poseG, h.wrist.clone().addScaledVector(h.dir, -0.04), h.dir, s === 'L' ? 0.19 : 0.175, 0.1); });
      {
        const cm = std('#D6B08E', { roughness: 0.8 });
        ['L', 'R'].forEach(sd => {
          const h = K.hands[sd], ps = sd === 'L' ? 1.75 : 1.5, r = 0.12 * ps;
          [-0.3, 0.3].forEach(k => mesh(tube([[h.p.x + k * r, h.p.y + 0.25 * r, h.p.z + 0.93 * r], [h.p.x + k * r * 1.05, h.p.y - 0.25 * r, h.p.z + 0.9 * r], [h.p.x + k * r * 1.1, h.p.y - 0.6 * r, h.p.z + 0.7 * r]], 0.007, 8, 5), cm, K.poseG));
        });
      }
      // hide the engine's wrist balls: the paws come straight out of the cuffs
      K.poseG.children.filter(o => o.isMesh && o.geometry.parameters && [0.09 * 1.75, 0.09 * 1.5].some(r => Math.abs(o.geometry.parameters.radius - r) < 1e-6)).forEach(o => { o.visible = false; });

      /* ---------------- fire gourd in the raised image-left paw ---------------- */
      const torchG = part('torch', K.body);
      {
        const hp = K.hands.L.p;
        const gg = group(torchG, [hp.x - 0.04, hp.y + 0.05, hp.z - 0.27], [0, 0, 0.24]);
        gg.scale.set(1.04, 0.9, 1.04);   // the picture's gourd lobes are squat and round
        const prof = [[0.001, 0.0], [0.16, 0.02], [0.28, 0.08], [0.35, 0.2], [0.37, 0.34], [0.35, 0.48], [0.28, 0.6], [0.18, 0.69], [0.125, 0.74], [0.16, 0.79], [0.22, 0.86], [0.245, 0.96], [0.22, 1.06], [0.15, 1.13], [0.1, 1.17], [0.095, 1.21]];
        const gl = lathe(prof, 64);
        const gtex = canvasTex(512, 256, (g, w, h) => {
          g.fillStyle = RED_OR; g.fillRect(0, 0, w, h);
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, NEKO.rgba(M('#B94A18'), 0.6)); lg.addColorStop(0.38, NEKO.rgba(M('#F59A4A'), 0.3)); lg.addColorStop(0.5, NEKO.rgba(M('#F7A657'), 0.45)); lg.addColorStop(0.62, NEKO.rgba(M('#F59A4A'), 0.3)); lg.addColorStop(1, NEKO.rgba(M('#B94A18'), 0.6));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.strokeStyle = NEKO.rgba(M('#B5471B'), 0.55); g.lineWidth = 4;
          for (let k = 0; k < 10; k++) { const x = (k + 0.5) / 10 * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        });
        mesh(gl.geo, texMat(gtex, { roughness: 0.55 }), gg, null, null, ORANGE_INK);
        // sun emblem painted on the front of the lower lobe (arc-length aware, so it stays round)
        {
          const pts = gl.pts, arc = [0];
          for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + pts[i].distanceTo(pts[i - 1]));
          const L = arc[arc.length - 1];
          let vAt = 0; for (let i = 1; i < pts.length; i++) if (pts[i].y >= 0.34) { vAt = arc[i] / L; break; }
          const g = gtex.image.getContext('2d'), cx = 256, cy = (1 - vAt) * 256;
          const hs = 512 / (2 * Math.PI * 0.37), vs = 256 / L;   // px per world unit around / along
          g.save(); g.translate(cx, cy); g.scale(1, vs / hs); sunMotif(g, 0, 0, 0.21 * hs, M('#FDDC75'), M('#FBCB5E')); g.restore();
          gtex.needsUpdate = true;
        }
        // gold rope at the waist, neck ring
        ring(gg, [0, 0.72, 0], [0, 1, 0], 0.15, 0.028);
        ring(gg, [0, 0.67, 0], [0, 1, 0.1], 0.2, 0.022);
        mesh(sphere(0.045, 14, 10), goldMat, gg, [0.02, 0.69, 0.2], null, GOLD_INK);
        mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.09, 32), goldMat, gg, [0, 1.19, 0], null, GOLD_INK);
        ring(gg, [0, 1.24, 0], [0, 1, 0], 0.115, 0.024);
        // the fire: a thick, bevelled flame silhouette traced from the picture (main tongue curling to the
        // image-left, a second tongue to the right), painted orange outside -> light orange -> yellow core
        const fireG = group(gg, [0, 1.2, 0], [0, 0, -0.24]);   // upright in the picture (undo the gourd's lean)
        // outlines traced from the picture (unit = flame height, origin = centre of the flame base)
        const OUT = [[-0.1, 0.0, 1], [-0.3, 0.11], [-0.33, 0.24], [-0.28, 0.34], [-0.34, 0.5], [-0.3, 0.66], [-0.2, 0.8], [-0.25, 1.0, 1], [-0.12, 0.97], [-0.07, 0.86],
          [-0.09, 0.7], [-0.05, 0.58, 1], [-0.01, 0.7], [0.12, 0.8, 1], [0.06, 0.68], [0.15, 0.54], [0.27, 0.4], [0.29, 0.24], [0.21, 0.1], [0.1, 0.0, 1]];
        const MID = [[-0.15, 0.0, 1], [-0.24, 0.12], [-0.24, 0.27], [-0.19, 0.42], [-0.14, 0.55], [-0.13, 0.66, 1], [-0.06, 0.53], [0.0, 0.45], [0.09, 0.45], [0.18, 0.37],
          [0.21, 0.24], [0.16, 0.09], [0.1, 0.0, 1]];
        const CORE = [[-0.1, 0.01, 1], [-0.15, 0.15], [-0.1, 0.28], [-0.05, 0.37, 1], [0.0, 0.27], [0.07, 0.31, 1], [0.11, 0.18], [0.08, 0.05], [0.05, 0.01, 1]];
        const FH = 1.12;
        // one thick bevelled slab; its caps carry a painted gradient (orange rim -> light orange -> yellow core)
        // canvas <-> cap UVs: u = x + 0.5, v = y / 1.1 (x, y in world units of the slab)
        const shapePath = (g, pts, w, h) => {   // draw the same smooth outline on the canvas
          const sp = flameShape(pts, FH).getPoints(12);
          g.beginPath(); sp.forEach((q, i) => { const X = (q.x + 0.5) * w, Y = h * (1 - q.y / 1.1); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath();
        };
        const fireTex = canvasTex(256, 256, (g, w, h) => {
          g.fillStyle = '#EE8636'; g.fillRect(0, 0, w, h);
          g.filter = 'blur(5px)';
          g.fillStyle = '#F7A044'; shapePath(g, OUT.map(([x, y, k]) => [x * 0.84, y * 0.9 + 0.01, k]), w, h); g.fill();
          g.filter = 'blur(7px)';
          g.fillStyle = '#FCC458'; shapePath(g, MID, w, h); g.fill();
          g.fillStyle = '#FDE17E'; shapePath(g, CORE.map(([x, y, k]) => [x * 1.3, y * 1.35, k]), w, h); g.fill();
          g.filter = 'blur(6px)';
          g.fillStyle = '#FEF3BE'; shapePath(g, CORE, w, h); g.fill();
          g.filter = 'none';
        });
        fireTex.wrapS = fireTex.wrapT = THREE.ClampToEdgeWrapping;
        fireTex.repeat.set(1, 1 / 1.1); fireTex.offset.set(0.5, 0);
        const fireMat = texMat(fireTex, { emissive: K.C('#FFFFFF'), emissiveMap: fireTex, emissiveIntensity: 0.28, roughness: 0.8 });
        const slab = mesh(K.extrude(flameShape(OUT, FH), 0.2, 0.045, 4, 12), fireMat, fireG, null, null, '#E07A30'); slab.castShadow = false;
        fireG.userData.flicker = true;
        K.torchFire = fireG;
        // hanging tassel with a jade bead and a gold bead
        gg.updateMatrixWorld(true); torchG.updateMatrixWorld(true);
        const w0 = gg.localToWorld(V(-0.15, 0.72, 0.02));
        const inv = torchG.matrixWorld.clone().invert();
        const toT = (x, y, z) => V(x, y, z).applyMatrix4(inv);
        const b1 = V(w0.x - 0.14, w0.y - 0.2, w0.z + 0.06), b2 = V(w0.x - 0.2, w0.y - 0.35, w0.z + 0.06);
        mesh(tube([w0, V(w0.x - 0.09, w0.y - 0.1, w0.z + 0.05), b1].map(p => toT(p.x, p.y, p.z)), 0.014, 12, 6), goldMat, torchG);
        mesh(sphere(0.075, 18, 14), std(M('#A3BC7B'), { roughness: 0.5 }), torchG, toT(b1.x, b1.y, b1.z), null, GREEN_INK);
        mesh(sphere(0.06, 16, 12), goldMat, torchG, toT(b2.x, b2.y, b2.z), null, GOLD_INK);
        const tq = K.tassel(torchG, toT(b2.x, b2.y - 0.07, b2.z), RED_OR, 0.38, 0.09, ORANGE_INK);
        tq.rotation.z = -0.25;
      }

      /* ---------------- big banana-leaf fan in the image-right paw ---------------- */
      const fanG = part('fan', K.body);
      {
        const hp = K.hands.R.p;
        const fg = group(fanG, [hp.x, hp.y, hp.z], [0, -0.15, -0.5]);
        K.onTick((t, k) => { fg.rotation.z = -0.5 + 0.07 * Math.sin(t * 1.6) * k; });   // gentle fanning
        const stemMat = std(M('#98A652'), { roughness: 0.7 });
        mesh(tube([[0, -0.52, 0], [0, 0, 0], [0, 0.4, -0.01]], t => 0.042 - 0.012 * t, 24, 10), stemMat, fg, null, null, GREEN_INK);
        const wr = 0.58;
        const lm = leafMat('fan', M('#97AD60'), M('#AFC076'), M('#809A4C'), M('#DDE6B4'), wr, 9, 1.5);
        mesh(leafGeo(wr, 0.25, -0.04, 5), lm, fg, [0, 0.32, 0], 2.0, GREEN_INK);
        // bow, bead and tassel at the grip
        const om = std(RED_OR, { roughness: 0.7 });
        [-1, 1].forEach(sx => {
          const l = mesh(new THREE.TorusGeometry(0.075, 0.026, 10, 24), om, fg, [0.08 * sx, 0.2, 0.06], [1.3, 0.8, 1], ORANGE_INK);
          l.rotation.z = 0.5 * sx;
        });
        mesh(sphere(0.065, 16, 12), goldMat, fg, [0.1, 0.12, 0.1], null, GOLD_INK);
        fg.updateMatrixWorld(true); fanG.updateMatrixWorld(true);
        const tw = fg.localToWorld(V(0.1, 0.12, 0.1)).applyMatrix4(fanG.matrixWorld.clone().invert());
        K.tassel(fanG, [tw.x + 0.02, tw.y - 0.08, tw.z], RED_OR, 0.3, 0.065, ORANGE_INK);
      }

      /* ---------------- legs, gold anklets and cream feet ---------------- */
      {
        const legTex = canvasTex(512, 128, (g, w, h) => {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, '#F3B060'); lg.addColorStop(0.55, '#F6BC6E'); lg.addColorStop(1, '#FCD89E');
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.filter = 'blur(3px)';
          [0.18, 0.34, 0.5, 0.66].forEach(u => { g.fillStyle = NEKO.rgba('#E29A48', 0.55); g.fillRect(u * w - 10, 0, 20, h * 0.55); });
          g.filter = 'none';
        });
        const legMat = texMat(legTex, { roughness: 0.9, emissive: K.C('#F6B870'), emissiveIntensity: 0.1 });
        const legs = [
          { pts: [[-0.24, 2.2, -0.02], [-0.14, 1.66, 0.14], [0.0, 1.2, 0.32]], r0: 0.28, r1: 0.19, foot: [0.03, 1.0, 0.38] },
          { pts: [[0.28, 2.25, -0.02], [0.48, 1.98, 0.5], [0.6, 1.64, 0.34]], r0: 0.31, r1: 0.19, foot: [0.62, 1.49, 0.3] }
        ];
        const fm = std(CREAM, { roughness: 0.95 }), cm = std('#D6B08E', { roughness: 0.8 });
        legs.forEach(L => {
          const cv = new THREE.CatmullRomCurve3(L.pts.map(K.toV));
          mesh(tube(cv, t => lerp(L.r0, L.r1, Math.pow(t, 0.8)), 40, 18), legMat, K.poseG, null, null, INK);
          const at = cv.getPointAt(0.8), dir = cv.getTangentAt(0.8);
          bangle(K.poseG, at, dir, lerp(L.r0, L.r1, Math.pow(0.8, 0.8)) + 0.005, 0.1);
          // ankle: the leg continues into the foot (no gap between the leg's end and the paw)
          const ft = K.toV(L.foot).add(V(0, 0.04, 0));
          mesh(tube([cv.getPointAt(0.9), cv.getPointAt(1), ft], t => lerp(L.r1 * 0.98, L.r1 * 0.85, t), 12, 18), legMat, K.poseG);
          const fg = group(K.poseG, L.foot, [0.3, 0, 0]);
          mesh(sphere(0.2, 32, 24), fm, fg, [0, 0.02, 0], [1.0, 1.05, 1.0], CREAM_INK);
          [-0.1, 0, 0.1].forEach((dx, j) => mesh(sphere(0.085, 20, 14), fm, fg, [dx, -0.13, 0.1 - Math.abs(dx) * 0.4], [1, 0.9, 1], CREAM_INK));
          [-0.05, 0.05].forEach(dx => mesh(tube([[dx, -0.04, 0.2], [dx * 1.05, -0.12, 0.18], [dx * 1.1, -0.19, 0.12]], 0.007, 8, 5), cm, fg));
        });
      }

      /* ---------------- underside of the tunic: closes the tunic's open bottom so legs and tail visibly come
       * out of the body (seen from below, under the short skirt) ---------------- */
      {
        const yC = 2.23, cap = mesh(new THREE.CircleGeometry(K.robeR(yC) + 0.004, 96), std(TUNIC_SH, { roughness: 0.95, side: THREE.DoubleSide }), robeG, [0, yC, 0]);
        cap.rotation.x = Math.PI / 2; cap.castShadow = false;
        // the core's tail-root ball: make it fill the tail's open root end (inside the tunic, on the cap)
        K.tailG.children.filter(o => o.isMesh && o.geometry.type === 'SphereGeometry' && o.position.lengthSq() < 1e-8).forEach(o => o.scale.setScalar(0.155 / o.geometry.parameters.radius));
      }

      /* ---------------- 風火輪: two golden wheels wrapped in flames ---------------- */
      const wheelsG = part('wheels', K.character);
      const wheels = [];
      {
        // one flame tongue: base centred at the origin (width W), tip at (curl * L, L)
        const tongue = (L, W, curl) => {
          const t = new THREE.Shape();
          t.moveTo(-W / 2, 0);
          t.bezierCurveTo(-W * 0.62, L * 0.38, curl * L * 0.2 - W * 0.32, L * 0.7, curl * L, L);
          t.bezierCurveTo(curl * L * 0.45 + W * 0.18, L * 0.66, W * 0.62, L * 0.36, W / 2, 0);
          t.closePath(); return t;
        };
        const fo = std(M('#F9A24E'), { emissive: K.C(M('#F9A24E')), emissiveIntensity: 0.35, roughness: 0.7 });
        const fy = std(M('#FDD688'), { emissive: K.C(M('#FDD688')), emissiveIntensity: 0.4, roughness: 0.7 });
        const petal = std(M('#F7964A'), { roughness: 0.6 }), hubC = std(M('#FDE8A6'), { roughness: 0.5 });
        [[-0.26, 0.56, -0.12, -0.62, 0], [0.76, 0.92, -0.12, 0.62, 1]].forEach(([x, y, z, yaw, i]) => {
          const wg = group(wheelsG, [x, y, z], [0, yaw, 0]);
          const spin = group(wg);
          const rimP = [[0.44, -0.045], [0.545, -0.045], [0.565, -0.03], [0.565, 0.03], [0.545, 0.045], [0.44, 0.045], [0.425, 0.03], [0.425, -0.03], [0.44, -0.045]].map(q => new THREE.Vector2(q[0], q[1]));
          const rimGeo = new THREE.LatheGeometry(rimP, 80); rimGeo.rotateX(Math.PI / 2); K.smoothNormals(rimGeo);
          mesh(rimGeo, goldBright, spin, null, null, GOLD_INK);
          [-1, 1].forEach(sz => mesh(new THREE.TorusGeometry(0.495, 0.012, 8, 72), goldLtMat, spin, [0, 0, 0.046 * sz]));
          mesh(new THREE.TorusGeometry(0.41, 0.018, 10, 64), goldMat, spin, null, null, GOLD_INK);
          for (let k = 0; k < 8; k++) {
            const a = k / 8 * Math.PI * 2, sp = mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.3, 10), goldLtMat, spin, [Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0], null, GOLD_INK);
            sp.rotation.z = a - Math.PI / 2;
          }
          for (let k = 0; k < 8; k++) {
            const a = (k + 0.5) / 8 * Math.PI * 2;
            const p = mesh(sphere(0.06, 16, 12), petal, spin, [Math.cos(a) * 0.095, Math.sin(a) * 0.095, 0.035], [1, 1.45, 0.55], ORANGE_INK);
            p.rotation.z = a - Math.PI / 2;
          }
          mesh(sphere(0.07, 20, 14), hubC, spin, [0, 0, 0.055], [1, 1, 0.6], GOLD_INK);
          mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 16), goldMat, spin, [0, 0, 0], null, null).rotation.x = Math.PI / 2;
          // flames: flat, outlined tongues around the rim, rising and curling upward
          const fl = group(wg, [0, 0, -0.035]);
          const NT = 9;
          for (let k = 0; k < NT; k++) {
            const a = lerp(Math.PI * 0.78, Math.PI * 2.22, k / (NT - 1));
            const out = V(Math.cos(a), Math.sin(a), 0), axis = out.clone().add(V(0, 0.95, 0)).normalize();
            const Lk = 0.2 + 0.24 * Math.pow(Math.abs(Math.cos(a)), 0.8), curl = (out.x < 0 ? 1 : -1) * 0.35;
            const tg = group(fl, [out.x * 0.5, out.y * 0.5, 0], [0, 0, Math.atan2(axis.y, axis.x) - Math.PI / 2]);
            mesh(K.extrude(tongue(Lk + 0.1, 0.24, curl), 0.035, 0.01, 2, 12), fo, tg, [0, -0.08, 0], null, '#EA8436');
            mesh(K.extrude(tongue((Lk + 0.1) * 0.62, 0.14, curl * 0.8), 0.035, 0.008, 2, 10), fy, tg, [0, -0.06, 0.03]);
          }
          fl.userData.flicker = true;
          wheels.push(spin);
          K.wheelSpins = wheels;
        });
        K.onTick((t, k) => { wheels.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * t * 1.6 * k; }); });
      }

      /* ---------------- floating summer-solstice decorations ---------------- */
      {
        const items = [];
        // midsummer sun
        const sun = group(K.decor, [1.45, 6.0, -0.5]);
        mesh(sphere(0.34, 32, 24), std(M('#FDD24D'), { emissive: K.C(M('#FDD24D')), emissiveIntensity: 0.35, roughness: 0.6 }), sun, null, [1, 1, 0.45], '#E9B43C');
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, r = mesh(sphere(0.07, 12, 10), std(M('#FDDA6A'), { roughness: 0.6 }), sun, [Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0], [0.7, 1.4, 0.5]); r.rotation.z = a - Math.PI / 2; }
        items.push(sun);
        // lotus flower on a round lotus leaf, with a water splash
        const lotus = group(K.decor, [-2.25, 2.6, 0.2]);
        const petalTex = canvasTex(64, 128, (g, w, h) => { const lg = g.createLinearGradient(0, h, 0, 0); lg.addColorStop(0, M('#FFF1EC')); lg.addColorStop(0.55, M('#F8CFC6')); lg.addColorStop(1, M('#EE9C98')); g.fillStyle = lg; g.fillRect(0, 0, w, h); });
        const pm = texMat(petalTex, { roughness: 0.7 });
        const petalGeo = K.dropGeo(0.44, 0.15, 1.5), flowerG = group(lotus, [0, 0.05, 0], [0.3, 0, 0]);
        flowerG.scale.setScalar(1.45);
        [[7, 0.95, 1, 0], [6, 0.5, 0.85, 0.3], [4, 0.15, 0.7, 0.1]].forEach(([n, tilt, sc, off]) => {
          for (let k = 0; k < n; k++) {
            const a = (k + off) / n * Math.PI * 2, p = new THREE.Group(); p.rotation.order = 'YXZ'; p.rotation.set(tilt, a, 0); flowerG.add(p);
            mesh(petalGeo, pm, p, [0, 0.13 * sc, 0], [sc, sc, sc * 0.5], '#E39A92');
          }
        });
        mesh(sphere(0.07, 16, 12), std(M('#F6D36A'), { roughness: 0.6 }), flowerG, [0, 0.1, 0], [1, 0.6, 1], '#D9A441');
        const leafTex = canvasTex(256, 256, (g, w, h) => {
          g.fillStyle = M('#A9BC7F'); g.fillRect(0, 0, w, h);
          g.strokeStyle = M('#D5E0B0'); g.lineWidth = 3;
          for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124); g.stroke(); }
          g.fillStyle = M('#C9D69D'); g.beginPath(); g.arc(128, 128, 12, 0, Math.PI * 2); g.fill();
        });
        const lotLeaf = mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.035, 48), [std(M('#95AB68'), { roughness: 0.8 }), texMat(leafTex, { roughness: 0.8 }), std(M('#95AB68'), { roughness: 0.8 })], lotus, [0.06, -0.42, 0.12], null, GREEN_INK);
        lotLeaf.rotation.set(0.32, 0, -0.1);
        mesh(tube([[0, -0.02, 0], [0.04, -0.3, -0.05], [0.1, -0.7, -0.08], [0.16, -1.05, -0.05]], 0.028, 16, 8), stemMatDecor(), lotus, null, null, GREEN_INK);
        mesh(strap([[-0.55, -0.95, 0.15], [-0.15, -1.05, 0.25], [0.3, -1.0, 0.25], [0.62, -0.8, 0.2], [0.78, -0.62, 0.15]], { w: t => 0.13 * Math.pow(Math.sin(Math.PI * t), 0.7), th: 0.035, face: [0, 1, 0.4] }), std(M('#BCD9DE'), { roughness: 0.3 }), lotus, null, null, '#8DB8C2');
        items.push(lotus);
        // leaves
        [[0.5, 6.35, -0.2, 0.7], [2.6, 2.95, 0.2, -2.4], [-2.1, 3.85, 0.1, 0.5], [-1.8, 1.25, 0.3, -0.9]].forEach(([x, y, z, rz]) => {
          const g = group(K.decor, [x, y, z], [0.2, 0.3, rz]);
          mesh(leafGeo(0.45, 0.4, 0, 0), greenLeafMat(0.45), g, [0, -0.2, 0], 0.42, GREEN_INK);
          items.push(g);
        });
        // water drops and sparks
        [[-2.05, 3.5, 0.2], [2.3, 1.1, 0.2], [-1.45, 2.15, 0.4]].forEach(p => items.push(K.drop(K.decor, p, 0.3, M('#A9CFE0'))));
        [[-2.1, 5.7, 0.1, 0.3], [-1.0, 6.3, 0, 0.26], [-0.72, 5.55, 0.2, 0.24], [1.25, 3.9, 0.35, 0.26], [-1.3, 1.2, 0.4, 0.22]].forEach(([x, y, z, s]) => items.push(K.flame(K.decor, [x, y, z], s, FLAME_O, FLAME_Y)));
        items.forEach(g => { g.userData.y0 = g.position.y; });
        K.onTick((t, k) => items.forEach((g, i) => { g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k; }));
        function stemMatDecor() { return std(M('#98A652'), { roughness: 0.8 }); }
      }
    },

    action: {
      label: '踩風火輪', dur: 2.0,
      run(s, p, K) {
        // hop up on the wheels, spin them two extra turns and let the gourd fire flare
        K.character.position.y = 0.3 * s;
        K.character.rotation.z = 0.05 * Math.sin(p * Math.PI * 4) * s;
        const q = Math.min(p, 1), e = q * q * (3 - 2 * q);
        (K.wheelSpins || []).forEach((w, i) => { w.rotation.z += (i ? -1 : 1) * Math.PI * 4 * e; });
        if (K.torchFire) K.torchFire.scale.multiplyScalar(1 + 0.35 * s);
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '腳踏風火輪的夏至哪吒',
        text: '夏至是一年中白晝最長、陽氣最盛的一天。這隻橘色虎斑的阿比西尼亞貓化身神話裡的哪吒三太子：高舉燃火的紅葫蘆、握著大芭蕉葉扇、身繞混天綾、腳踩風火輪，用火與荷葉的配色把盛夏的熱力與清涼一起穿在身上。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '開心張嘴的虎斑臉',
        text: '暖橘色的圓臉微微歪向右邊，額頭有幾道細細的深橘虎斑，兩頰外側也各有三道橫紋；眼睛下方到下巴是奶油白。大大的深棕圓眼、粉色小鼻，嘴巴張得開開的露出粉紅舌頭，腮紅上還點著小紅點，一副興奮出發的表情。' },
      crown: { chip: '頭飾', tag: '服飾', name: '金蓮冠與雙髻',
        text: '頭頂正中戴一頂小小的金色蓮花冠，中央嵌著淡金圓珠、兩側捲起金色小翼，後方還冒出一簇小火苗。冠的左右各有一顆橘紅圓髻，是哪吒招牌的雙丫髻；一條橘紅頭帶從左耳前越過頭頂，右側垂下一段飄帶貼著臉頰。' },
      torch: { chip: '火葫蘆', tag: '道具', name: '燃火紅葫蘆',
        text: '左手（畫面左）高高舉起一只橘紅色葫蘆，下半顆圓肚上畫著金色太陽紋，腰間纏金繩、瓶口套金環，頂端燃著橘黃色的大火焰；側邊還垂著綠玉珠、金珠與橘紅流蘇，象徵夏至正午最旺的太陽火。' },
      fan: { chip: '葉扇', tag: '道具', name: '芭蕉葉扇',
        text: '右手（畫面右）握著一片比頭還大的綠色芭蕉葉，葉緣有淺淺的波浪缺口，淡色葉脈斜斜排開；握柄處綁著橘紅蝴蝶結、金珠與流蘇。一手火、一手涼風，正是盛夏的冷熱對比。' },
      robe: { chip: '短衣', tag: '服飾', name: '米白短衣與荷葉披領',
        text: '上身是米白色的短衣，胸口與背後印著橘黃火焰紋，窄袖在手腕處收進金色手環。領口圍一圈綠色荷葉披領，外面再繞一條橘紅領巾，正中掛著太陽紋金牌，下方垂兩束帶綠珠的橘紅小流蘇。' },
      skirt: { chip: '荷葉裙', tag: '服飾', name: '葉腰帶與花瓣短裙',
        text: '腰間一圈綠葉像花環般圍起，橘紅腰繩在正中打成蝴蝶結、扣上一顆金球，兩條緞帶垂下。下面是花瓣般層層散開的米白短裙，外罩幾片下垂的大荷葉；左前方掛著一片金黃色的葉形垂片，底部畫著橘紅火焰。右腳抬起，把裙襬頂高了一角。' },
      sash: { chip: '混天綾', tag: '道具', name: '混天綾',
        text: '一條外橘紅、內米白的長綾從左臂繞過背後，再從右腋下飄出，在身體兩側捲成大大的 S 形，右端綴著金珠與橘紅流蘇；左腰旁還有一小段綾帶向外捲起。' },
      wheels: { chip: '風火輪', tag: '道具', name: '風火輪',
        text: '兩隻腳各踩一只金色的風火輪：八根輪輻、中心是一朵橘色小花，外圈燃著一層層橘黃火舌。左輪較低、右輪較高，像正踏著火輪往前衝。按「踩風火輪」可以看牠躍起。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '虎斑長尾', dir: [1, 0.2, -0.6],
        text: '橘色長尾巴從右後方伸出，先向右平伸再往上勾起，尾身有五道深橘環紋，尾尖顏色略深。' },
      pose: { chip: '姿態', tag: '貓咪本體', name: '踏輪飛奔',
        text: '左腳伸直踩在低處的輪上，右腳抬膝踩上較高的輪；兩隻後腳是帶虎斑的橘色，腳踝套著金環，腳掌是奶白色的圓肉球。兩隻前爪也戴著金色手環，一上一下撐開，整個動作充滿衝勁。' }
    },
    order: ['overview', 'face', 'crown', 'torch', 'fan', 'robe', 'skirt', 'sash', 'wheels', 'tail', 'pose']
  });
})();
