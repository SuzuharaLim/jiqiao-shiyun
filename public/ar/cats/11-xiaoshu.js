// @file 11_小暑_豹貓
// @title 小暑・火神將軍 | 二十四節氣貓
(function () {
  // The renderer's lights brighten front-facing surfaces by roughly 1.45x (linear). M() turns a colour
  // SAMPLED from refs/11.png into the material colour that renders back to about that value.
  function M(hex, f) {
    f = f || 1.45; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f, 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  // picture px (refs/11.png, 435 × 580) → model units: 0.0075 per px, feet on y = 0, body axis at x = 226
  const PX = 0.0075, CX = 226, FY = 518;
  // in the picture the lower body is turned slightly toward the image-left (belt medallion ≈ 0.08 left of the face)
  const TURN = -0.12, TURN_DEG = TURN * 180 / Math.PI;
  const W = (px, py) => [(px - CX) * PX, (FY - py) * PX];

  // ---- colours sampled from refs/11.png ----
  const FUR = '#F3C886', FUR_TOP = '#ECBD7B', FUR_LOW = '#F5CF94', SPOT = '#B68D5E', SPOT_DK = '#A17548';
  const CREAM = '#FEF3E2', CREAM_W = '#FCE7C6', EAR_OUT = '#DDB080', EAR_IN = '#FCCAAE';
  const INK = '#A97A4A', CREAM_INK = '#D6B089';
  const RED = '#F07A53', RED_DK = '#DE6445', RED_INK = '#B0553A';
  const YEL = '#FCD984', GOLD = '#FBD27A', GOLD_INK = '#A8843E';
  const GREEN = '#BCC474', GREEN_DK = '#97A968', GREEN_INK = '#768548';
  const TUNIC = '#FEF1DC', FL_O = '#F9AE6A', FL_R = '#EE8454', FL_Y = '#FBD9A5';
  const HEM_R = '#EF8552', HEM_Y = '#FDE29E';
  const CAPE_R = '#E36F4B', CAPE_O = '#F1A55E', CAPE_Y = '#F6C373';
  const LEAF = '#AEC171', LEAF_LT = '#C4CD7C', LEAF_DK = '#97A962', VEIN = '#E7DF97', LEAF_INK = '#6F8A45';
  const WOOD = '#C38A53', WOOD_INK = '#86542F', CUP = '#DDA665', CUP_DK = '#C28549', STEM = '#999A50';
  const TAIL = '#ECB86F', TAIL_BAND = '#A57A4D';

  // stylised three-tongue flame (canvas units: base centre at 0,0, tip at 0,-s)
  function tear(g, x, y, s, sx, rot, curl) {
    const c = (curl || 0) * s;
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(sx || 1, 1);
    g.beginPath(); g.moveTo(c, -s);
    g.bezierCurveTo(s * 0.3 + c * 0.2, -s * 0.6, s * 0.58, -s * 0.2, s * 0.45, s * 0.2);
    g.arc(0, s * 0.2, s * 0.45, 0, Math.PI);
    g.bezierCurveTo(-s * 0.58, -s * 0.2, -s * 0.2 + c * 0.6, -s * 0.5, c, -s);
    g.fill(); g.restore();
  }
  // picture-book flame: a tall curling central tongue, two side tongues and two small outer wisps
  function flameMotif(g, x, y, s, outer, mid, inner) {
    g.fillStyle = outer;
    tear(g, x, y, s, 1.05, 0.05, -0.18);
    tear(g, x - s * 0.4, y + s * 0.2, s * 0.7, 0.95, -0.4, 0.2); tear(g, x + s * 0.42, y + s * 0.18, s * 0.76, 0.95, 0.38, -0.2);
    tear(g, x - s * 0.72, y + s * 0.34, s * 0.42, 0.9, -0.75, 0.25); tear(g, x + s * 0.74, y + s * 0.32, s * 0.44, 0.9, 0.75, -0.25);
    g.fillStyle = mid;
    tear(g, x, y + s * 0.14, s * 0.7, 1, 0.04, -0.15); tear(g, x - s * 0.34, y + s * 0.27, s * 0.42, 0.9, -0.4, 0.2); tear(g, x + s * 0.36, y + s * 0.26, s * 0.46, 0.9, 0.36, -0.2);
    if (inner) { g.fillStyle = inner; tear(g, x, y + s * 0.26, s * 0.4, 1, 0, -0.1); }
  }
  // softer, wider skirt flame: a big curling tongue, a left tongue and a small right one on a round base
  function softFlame(g, x, y, s, outer, mid) {
    g.fillStyle = outer;
    tear(g, x + s * 0.08, y, s, 1.15, 0.12, -0.3); tear(g, x - s * 0.42, y + s * 0.14, s * 0.72, 1.05, -0.32, 0.3); tear(g, x + s * 0.5, y + s * 0.22, s * 0.5, 1, 0.45, -0.25);
    g.fillStyle = mid;
    tear(g, x + s * 0.06, y + s * 0.2, s * 0.6, 1.1, 0.1, -0.3); tear(g, x - s * 0.36, y + s * 0.28, s * 0.4, 1, -0.3, 0.3);
  }

  NEKO.run({
    meta: {
      id: '11', term: '小暑', title: '小暑・火神將軍', seal: '暑',
      eyebrow: '二〇二七節氣貓 · 11 小暑 · 豹貓',
      aria: '頭綁紅色頭巾、額前一朵金花與三片綠葉，披著紅色短披肩與長披風，身穿繡火焰紋的米白戰袍、腰繫日輪金章，左手拿大片蓮葉扇、右手高舉火炬的黃褐色斑點豹貓 3D 模型'
    },
    theme: { accent: '#B5452A', accentDark: '#F2A27E', glow: 'rgba(240, 122, 83, 0.30)', glowColor: '#FFB48A' },
    palette: [['#F3C886', '豹紋黃褐'], ['#F47D53', '火焰紅'], ['#BEC272', '蓮葉綠'], ['#FBD07A', '日輪金']],
    spec: [['品種', '豹貓'], ['角色', '小暑火神將軍'], ['頭身比', '約 1 : 1.4']],
    seed: 1107,

    cat: {
      fur: {
        color: M(FUR), top: M(FUR_TOP), mid: M(FUR), low: M(FUR_LOW), deep: M(SPOT), cream: M(CREAM, 1.15),
        ink: INK, creamInk: CREAM_INK, pattern: 'none', mask: false,
        noise: { colors: [M('#FFE8C4'), M('#D9A866')], alpha: 0.06, n: 900 },
        paintBase(g, P) {
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, M(FUR_TOP)); vg.addColorStop(0.45, M(FUR)); vg.addColorStop(0.78, M(FUR_LOW)); vg.addColorStop(1, M(CREAM, 1.2));
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // leopard spots on the crown, the sides and the back (front spots are copied from the picture in build)
          g.filter = 'blur(1.2px)';
          for (let i = 0; i < 150; i++) {
            const lon = (P.rand() * 2 - 1) * 180, lat = -40 + P.rand() * 122;
            if (Math.abs(lon) < 72 && lat < 64) continue;
            const [x, y] = P.xy(lon, lat), s = 5 + P.rand() * 6;
            P.blob(g, x, y, s * 0.6, s * (lat > 25 ? 1.6 : 1.05), M(SPOT), 0.92, (P.rand() - 0.5) * 0.4);
          }
          g.filter = 'none';
        }
      },
      head: { y: 2.35, neck: 1.62, w: 0.585, h: 0.63, d: 0.58, cheek: 0.12, ruff: 0.02, ruffFreq: 16, chinDrop: 0.02,
        // round "mochi" face: the lower half stays wide almost down to the chin, which is broad and flat
        deform(p, o) {
          const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
          const lo = sst(-0.05, -0.7, o.y), bot = sst(-0.5, -0.95, o.y);
          p.x *= (1 + 0.2 * lo) * (1 + 0.26 * bot); p.z *= 1 + 0.05 * lo;
          p.y -= 0.025 * sst(-0.55, -1, o.y);
        },
        fur: { layers: 12, length: 0.035, gravity: 0.008, repeat: [12, 6] } },
      eyes: { x: 0.285, y: -0.19, r: 0.135, sx: 0.87, sy: 1.04, sz: 0.42, color: '#4A3120', iris: '#7B7644', pupil: '#3A2618', pupilR: 0.5, shine: 0.9 },
      nose: { y: -0.285, color: M('#EE9A8C', 1.2), size: 0.75 },
      muzzle: false,
      mouth: { type: 'open', color: '#B45E48', y: -0.345, w: 0.125, open: 1.32, inner: M('#EC8C78', 1.2), tongue: M('#FAB8A4', 1.3) },
      blush: false,
      whiskers: { color: '#FFFBF4', n: 3, len: 0.44, r: 0.006, y: -0.33, x: 0.19, spread: 0.08, droop: 0.02, curve: 0.04 },
      ears: { x: 0.46, y: 0.22, z: -0.06, tilt: 0.31, yaw: 0.15, pitch: -0.06, size: [0.45, 0.71, 0.15], sharp: 0.92,
        color: M('#D6A874'), inner: M('#FBBBA0', 1.35), tuft: false, fur: { layers: 8, length: 0.025, gravity: 0.005, repeat: [3, 3] } },
      bib: false,
      robe: {
        profile: [[0.66, 0.2], [0.63, 0.3], [0.565, 0.5], [0.5, 0.72], [0.46, 0.92], [0.435, 1.1], [0.41, 1.3], [0.375, 1.52], [0.17, 1.74]],
        color: '#FFFFFF', ink: '#CF7A4E', hemY: 0.34, segs: 128,
        paint(g) { g.fillStyle = M(TUNIC, 1.2); g.fillRect(0, 0, 1024, 1024); }
      },
      collar: false,
      arms: {
        L: { hand: [-0.79, 1.25, 0.34], path: [[-0.34, 1.56, 0.02], [-0.52, 1.38, 0.14], [-0.66, 1.27, 0.28]], pawScale: 1.35 },
        R: { hand: [0.92, 1.58, 0.3], path: [[0.34, 1.56, 0.02], [0.56, 1.4, 0.13], [0.78, 1.49, 0.26]], pawScale: 1.35 }
      },
      sleeves: false,
      paws: { color: M(CREAM, 1.3), ink: CREAM_INK },
      belt: false,
      feet: false,
      tail: {
        pts: [[0.24, 0.4, -0.34], [0.52, 0.27, -0.5], [0.8, 0.29, -0.47], [1.03, 0.43, -0.39], [1.2, 0.65, -0.31], [1.25, 0.86, -0.25], [1.18, 1.01, -0.21], [1.04, 1.05, -0.18], [0.94, 0.96, -0.16]],
        r: 0.112,
        shape: t => { const b = 0.72 + 0.28 * Math.min(t / 0.3, 1) + 0.1 * Math.max(0, t - 0.55); return t > 0.86 ? b * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.86) / 0.14, 2))) : b; },
        ink: INK,
        paint(g, w, h) {
          g.fillStyle = M(TAIL); g.fillRect(0, 0, w, h);
          g.fillStyle = M(TAIL_BAND);
          // dark rings with ragged, furry edges, then the dark tip
          [[0.44, 0.055], [0.565, 0.065], [0.69, 0.065]].forEach(([c, bw]) => {
            const x0 = (c - bw / 2) * w, x1 = (c + bw / 2) * w, n = 8;
            g.beginPath(); g.moveTo(x0, 0);
            for (let i = 0; i <= n; i++) g.lineTo(x0 + (i % 2 ? -9 : 7), i / n * h);
            for (let i = n; i >= 0; i--) g.lineTo(x1 + (i % 2 ? 9 : -7), i / n * h);
            g.closePath(); g.fill();
          });
          g.beginPath(); g.moveTo(0.8 * w, 0);
          for (let i = 0; i <= 8; i++) g.lineTo(0.8 * w + (i % 2 ? -12 : 8), i / 8 * h);
          g.lineTo(w, h); g.lineTo(w, 0); g.closePath(); g.fill();
          // small spots near the root
          for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse((0.12 + i * 0.024) * w, (i * 0.37 % 1) * h, 10, 6, 0, 0, Math.PI * 2); g.fill(); }
        },
        fur: { layers: 12, length: 0.035, gravity: 0.01, repeat: [16, 6] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, lathe, ribbon, medal, D } = K;
      const HY = K.cfg.head.y;
      const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
      const lerp = (a, b, t) => a + (b - a) * t;
      const DS = THREE.DoubleSide;
      const goldM = std(M(GOLD), { roughness: 0.42, metalness: 0.15 });
      const redM = std(M(RED), { roughness: 0.8 }), redDS = std(M(RED), { roughness: 0.8, side: DS });
      const greenDS = std(M(GREEN), { roughness: 0.8, side: DS });
      const creamM = std(M(CREAM, 1.3), { roughness: 0.95 });
      const bead = (parent, pos, r) => {
        const b = mesh(sphere(r, 24, 18), goldM, parent, pos, null, GOLD_INK);
        const hi = mesh(sphere(r * 0.28, 10, 8), K.M.shine, parent, [pos[0] - r * 0.3, pos[1] + r * 0.35, pos[2] + r * 0.8]); hi.castShadow = false;
        return b;
      };
      // tube flattened along a normal direction (bands, straps)
      const flatTube = (curve, r, flat, normalAt, segs, radial, closed) => {
        const geo = new THREE.TubeGeometry(curve, segs, r, radial, closed), p = geo.attributes.position;
        for (let i = 0; i <= segs; i++) {
          const C = curve.getPointAt(Math.min(i / segs, 1)), N = normalAt(C);
          for (let j = 0; j <= radial; j++) {
            const k = i * (radial + 1) + j, v = V(p.getX(k), p.getY(k), p.getZ(k)).sub(C);
            v.addScaledVector(N, -v.dot(N) * (1 - flat)); p.setXYZ(k, C.x + v.x, C.y + v.y, C.z + v.z);
          }
        }
        return K.smoothNormals(geo);
      };
      // flame tongue: nested emissive teardrops (rim → amber → yellow → pale core), tips bent sideways
      const fireMat = (hex, e) => { const m = std(hex, { emissive: new THREE.Color(hex).convertSRGBToLinear(), emissiveIntensity: e, roughness: 0.6 }); return m; };
      const tongue = (parent, pos, h, r, bend, rot, layers) => {
        const tg = group(parent, pos, [0, 0, rot]); tg.userData.flicker = true;
        layers.forEach(([k, hex, e, dz], i) => {
          const geo = K.dropGeo(h * k, r * k, 2.1, 32), p = geo.attributes.position;
          for (let j = 0; j < p.count; j++) { const t = Math.max(0, (p.getY(j) + 0.3 * h * k) / (h * k)); p.setX(j, p.getX(j) + bend * k * t * t); }
          geo.computeVertexNormals();
          const m = mesh(geo, fireMat(hex, e), tg, [0, -h * (1 - k) * 0.12, dz * r / 0.3]); m.castShadow = false;
          if (i === 0) K.outline(m, '#D9663A');
        });
        return tg;
      };
      const L4 = [[1, M('#F0823F', 1.05), 0.45, 0], [0.78, '#F8A24B', 0.5, 0.075], [0.56, '#FDCB6E', 0.55, 0.14], [0.32, '#FFEBB8', 0.6, 0.19]];
      const rc = new THREE.Raycaster();
      const hitHead = (lonDeg, y) => {
        const a = lonDeg * Math.PI / 180;
        K.character.updateMatrixWorld(true);
        rc.set(V(Math.sin(a) * 3, y, Math.cos(a) * 3), V(-Math.sin(a), 0, -Math.cos(a)));
        const h = rc.intersectObject(K.headMesh, false)[0];
        return h ? { p: h.point.clone(), n: h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize() } : { p: V(Math.sin(a) * 0.5, y, Math.cos(a) * 0.5), n: V(Math.sin(a), 0, Math.cos(a)) };
      };

      // flat notched strip lying on the robe: shape drawn in world x/y, bent onto the robe surface
      const onRobeFlat = (pts, off, depth, mat, ink, parent) => {
        const geo = extrude(pts, depth, depth * 0.3, 1, 1), q = geo.attributes.position;
        for (let i = 0; i < q.count; i++) {
          const x = q.getX(i), y = q.getY(i), R = K.robeR(Math.min(Math.max(y, 0.2), 1.6)) + off;
          q.setZ(i, Math.sqrt(Math.max(R * R - x * x, 0.0001)) + q.getZ(i));
        }
        geo.computeVertexNormals();
        return mesh(geo, mat, parent, null, null, ink);
      };
      // strip outline around a centreline: widths w0 → w1, V-notched end
      const notched = (c0, c1, bend, w0, w1, notch) => {
        const P = t => [lerp(c0[0], c1[0], t) + bend * Math.sin(Math.PI * t), lerp(c0[1], c1[1], t)];
        const d = [c1[0] - c0[0], c1[1] - c0[1]], L = Math.hypot(d[0], d[1]), n = [-d[1] / L, d[0] / L];
        const Ls = [], Rs = [];
        for (let i = 0; i <= 12; i++) { const t = i / 12, p = P(t), w = lerp(w0, w1, t) / 2; Ls.push([p[0] + n[0] * w, p[1] + n[1] * w]); Rs.push([p[0] - n[0] * w, p[1] - n[1] * w]); }
        const e = P(1), back = [e[0] - d[0] / L * notch, e[1] - d[1] / L * notch];
        return Ls.concat([back], Rs.reverse());
      };
            /* ================= face: copy the picture's cream patches and spots onto the head map ================= */
      {
        const g = K.headTex.image.getContext('2d'), hm = [K.headMesh];
        const uvAt = (px, py) => { const [x, y] = W(px, py); const s = K.onSkin(x, y, hm); return s.uv ? [s.uv.x * 1024, (1 - s.uv.y) * 512] : null; };
        const ell = (cx, cy, a, b, ang, color, alpha) => {
          const c = uvAt(cx, cy), ex = uvAt(cx + 3, cy), ey = uvAt(cx, cy + 3);
          if (!c || !ex || !ey) return;
          g.save(); g.globalAlpha = alpha === undefined ? 1 : alpha;
          g.transform((ex[0] - c[0]) / 3, (ex[1] - c[1]) / 3, (ey[0] - c[0]) / 3, (ey[1] - c[1]) / 3, c[0], c[1]);
          g.fillStyle = color; g.beginPath(); g.ellipse(0, 0, a, b, ang, 0, Math.PI * 2); g.fill(); g.restore();
        };
        const poly = (pts, color) => {
          const q = pts.map(p => uvAt(p[0], p[1])).filter(Boolean);
          g.fillStyle = color; g.beginPath(); q.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
        };
        const cr = M(CREAM, 1.05), crW = M(CREAM_W, 1.12);
        g.filter = 'blur(3px)';
        ell(189, 219, 33, 27, 0, crW); ell(267, 220, 33, 27, 0, crW);          // pale rims around the eyes
        ell(228, 268, 70, 30, 0, cr); ell(196, 250, 30, 20, 0.3, cr); ell(260, 250, 30, 20, -0.3, cr);  // pale muzzle & chin
        g.filter = 'blur(2px)';
        poly([[207, 192], [247, 192], [239, 220], [231, 240], [223, 240], [215, 220]], M(FUR));   // tawny wedge between the eyes
        // spots measured on the picture: [x, y, semi-axis a, b, angle]
        g.filter = 'blur(0.8px)';
        [[160, 171, 3.1, 2.6, -0.3], [185, 174, 5.7, 4.5, 0.73], [242, 178, 7.4, 4.1, -1.25], [277, 177, 5.3, 4.3, -0.69], [302, 176, 4.4, 2.8, -0.37],
          [206, 185, 10.2, 5.2, 1.19], [256, 189, 10.6, 5, -1.04], [173, 188, 4, 3.1, 0.52], [229, 197, 9.8, 4.7, 1.56], [194, 191, 3.6, 1.6, 0.86],
          [282, 192, 6.4, 2.2, -0.06], [159, 206, 3.5, 2.6, -0.47], [301, 216, 3.8, 2.8, 0.82], [150, 222, 7.8, 5.5, -0.73], [308, 238, 11, 4.9, 0.61],
          [152, 239, 10.2, 4.7, -0.32], [320, 244, 5.7, 1.9, 1.24], [298, 250, 6.9, 2.6, 0.15], [143, 260, 9.4, 3.9, -1.16], [158, 251, 3.8, 2.3, -0.68],
          [303, 257, 7.3, 3.8, 0.32], [313, 268, 8, 3.6, -0.8], [149, 267, 5.2, 2.8, 0.27], [226, 166, 8, 3.6, 1.5], [194, 164, 3.2, 2.4, 0], [266, 167, 3.2, 2.2, -0.9],
          [140, 190, 5, 3, 1.2], [312, 196, 5, 3, -1.2], [133, 232, 4, 2.6, 1.3], [322, 226, 4, 2.6, -1.3]]
          .forEach(([x, y, a, b, ang]) => ell(x, y, a * 0.9, b * 0.95, ang, M(SPOT), 0.95));
        // soft pink blush under the outer eye corners
        g.filter = 'blur(5px)';
        ell(170, 250, 17, 11, 0, 'rgba(247,160,140,0.55)'); ell(285, 252, 17, 11, 0, 'rgba(247,160,140,0.55)');
        g.filter = 'none';
        K.headTex.needsUpdate = true;
      }

      /* ================= short, smooth fur on the muzzle so the open mouth and nose stay visible ================= */
      {
        const ga = K.headMesh.geometry, pa = ga.attributes.position, fl = ga.attributes.furLen, HD = K.cfg.head;
        for (let i = 0; i < pa.count; i++) {
          const ux = pa.getX(i) / HD.w, uy = pa.getY(i) / HD.h, uz = pa.getZ(i) / HD.d;
          const wgt = sst(0.45, 0.72, uz) * sst(-1.0, -0.78, uy) * (1 - sst(-0.12, 0.05, uy)) * (1 - sst(0.45, 0.7, Math.abs(ux)));
          fl.setX(i, lerp(fl.getX(i), 0.05, wgt));
        }
        fl.needsUpdate = true;
      }

      /* ================= eyes: brown with an olive-green lower half, one highlight toward the face centre ================= */
      {
        const itex = canvasTex(256, 256, (g) => {
          const lg = g.createLinearGradient(0, 0, 0, 256);
          lg.addColorStop(0, '#3E2818'); lg.addColorStop(0.4, '#4F3522'); lg.addColorStop(0.58, '#5E4A2E'); lg.addColorStop(0.72, '#7A7842'); lg.addColorStop(0.88, '#8E8D50'); lg.addColorStop(1, '#A2A064');
          g.fillStyle = lg; g.fillRect(0, 0, 256, 256);
          g.fillStyle = 'rgba(40,24,14,0.5)'; g.beginPath(); g.ellipse(128, 104, 58, 62, 0, 0, Math.PI * 2); g.fill();
          const rg = g.createRadialGradient(128, 128, 96, 128, 128, 128); rg.addColorStop(0, 'rgba(50,30,18,0)'); rg.addColorStop(1, 'rgba(50,30,18,0.85)');
          g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
        });
        K.eyes.forEach((eg, i) => {
          const inner = eg.children[0], sx = i === 0 ? -1 : 1;
          const shines = inner.children.filter(o => o.isMesh && o.material === K.M.shine)
            .sort((a, b) => b.geometry.parameters.radius - a.geometry.parameters.radius);
          inner.children.forEach(o => { if (o.isMesh && o.geometry.type === 'CircleGeometry') o.material = texMat(itex, { roughness: 0.3 }); });
          // one highlight only, in the upper half toward the face centre (as drawn)
          shines.forEach((o, j) => {
            if (j > 0) { o.visible = false; return; }
            o.position.x = Math.abs(o.position.x) * (sx < 0 ? 1 : -1) * 1.25; o.position.y *= 1.05;
          });
        });
      }

      /* ================= mouth: the open part is a narrow, deep rounded "U" under the w-shaped lip ================= */
      K.faceG.children.forEach(o => {
        if (o.isGroup && o.children.some(c => c.isMesh && c.geometry.type === 'ExtrudeGeometry')) o.scale.set(0.76, 1.12, 1);
      });

      /* ================= ears: pink inside with white feathery tufts ================= */
      {
        const tm = std(M('#FFF6EA', 1.05), { roughness: 0.95 });
        K.ears.forEach(({ g, sx }) => {
          // bigger pink inner ear, as drawn
          g.children.forEach((o, i) => { if (i === 1 && o.isMesh) { o.scale.x *= 1.3; o.scale.y *= 1.1; o.position.y -= 0.035; o.position.z += 0.022; } });
          // darker brown rim around the ear, as outlined in the picture
          const [ex, ey, ez] = K.cfg.ears.size;
          mesh(K.earGeo(K.cfg.ears.sharp), std(M('#B98A58'), { roughness: 0.9 }), g, [0, -0.01, -0.012], [ex * 1.08, ey * 1.04, ez * 0.9]);
          // feathery white tuft: rooted at the inner (face-side) base of the ear, fanning up and outward
          [[0.06, 0.06, 0.22, 0.06, -0.75], [0.03, 0.05, 0.27, 0.06, -0.5], [0.0, 0.05, 0.28, 0.055, -0.28], [-0.04, 0.06, 0.22, 0.05, -0.08], [0.08, 0.13, 0.16, 0.045, -1.0]].forEach(([x, y, len, r0, lean]) => {
            const a = V(-0.06 * sx + x * 0.5 * sx, y + 0.02, 0.085), d = V(-lean * sx * 0.8, 1, 0.22).normalize();
            const b = a.clone().addScaledVector(d, len * 0.55), c = a.clone().addScaledVector(d, len).add(V(lean * 0.06 * sx, 0, 0));
            mesh(tube([a, b, c], t => r0 * (1 - Math.pow(t, 1.1)) + 0.003, 16, 8), tm, g, null, null, CREAM_INK);
          });
        });
      }

      /* ================= red headband, gold flower with three leaves, ribbon ends ================= */
      const bandG = part('headband', K.head);
      {
        const bandY = lon => HY + 0.1 + 0.345 * Math.pow(Math.cos(lon * Math.PI / 360), 7);
        const pts = [];
        for (let lon = -180; lon < 180; lon += 6) { const h = hitHead(lon, bandY(lon)); pts.push(h.p.addScaledVector(h.n, 0.03)); }
        const cv = new THREE.CatmullRomCurve3(pts, true);
        const nAt = C => V(C.x, (C.y - HY) * 1.4, C.z).normalize();
        mesh(flatTube(cv, 0.058, 0.4, nAt, 160, 12, true), redM, bandG, null, null, RED_INK);
        // gold beads where the band crosses the ear bases
        [-58, 58].forEach(lon => { const h = hitHead(lon, bandY(lon)); const p = h.p.addScaledVector(h.n, 0.06); bead(bandG, [p.x, p.y, p.z], 0.062); });
        // ribbon ends: a short one on the image-left, a long wavy one on the image-right
        const rb = (p, w, tw) => mesh(ribbon(p, w, { face: [0.2, 0, 1], twist: tw, segs: 60 }), redDS, bandG, null, null, RED_INK);
        const pl = hitHead(-58, bandY(-58)).p, pr = hitHead(58, bandY(58)).p;
        rb([[pl.x - 0.02, pl.y - 0.03, pl.z + 0.02], [pl.x - 0.08, pl.y - 0.13, pl.z + 0.0], [pl.x - 0.12, pl.y - 0.26, pl.z - 0.03]], t => 0.12 * (1 - 0.3 * t), t => 0.3 * t);
        rb([[pr.x + 0.03, pr.y - 0.03, pr.z + 0.02], [0.72, 2.46, 0.24], [0.84, 2.28, 0.2], [0.74, 2.1, 0.22], [0.86, 1.94, 0.17], [0.9, 1.84, 0.13]], t => 0.18 * (1 - 0.2 * t), t => 0.5 * Math.sin(t * Math.PI * 1.6));
        // gold flower with a red jewel, three green leaves standing behind it
        const fh = hitHead(0, 2.86);
        const fg = group(bandG, [0, 2.86, fh.p.z + 0.06], [-0.3, 0, 0]);
        const lm = std(M('#93AC55'), { roughness: 0.75 });
        const leafShape = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.42, 0, L); s.quadraticCurveTo(-w, L * 0.42, 0, 0); return s; };
        [[0, 0.4, 0.19], [0.78, 0.37, 0.19], [-0.78, 0.37, 0.19]].forEach(([rz, L, w]) => {
          const lg = group(fg, [0, 0.02, -0.07], [0, 0, rz]);
          mesh(extrude(leafShape(L, w), 0.025, 0.008, 2, 12), lm, lg, null, null, GREEN_INK);
          mesh(tube([[0, 0.05, 0.014], [0, L * 0.5, 0.016], [0, L * 0.85, 0.014]], 0.006, 12, 5), std(M('#9EAE5C'), { roughness: 0.8 }), lg);
        });
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2;
          mesh(sphere(0.062, 20, 14), goldM, fg, [Math.sin(a) * 0.104, Math.cos(a) * 0.104, 0], [1, 1, 0.5], GOLD_INK);
        }
        mesh(sphere(0.058, 24, 16), std(M('#E0604A'), { roughness: 0.3 }), fg, [0, 0, 0.035], [1, 1, 0.8], RED_INK);
        const hi = mesh(sphere(0.016, 10, 8), K.M.shine, fg, [-0.018, 0.022, 0.08]); hi.castShadow = false;
      }

      /* ================= tunic painting: chest flame, skirt flames, hem bands, straps, front slit ================= */
      {
        const tex = K.robeMesh.material.map, g = tex.image.getContext('2d');
        const U = deg => 512 + deg / 360 * 1024, Vy = y => K.robeV(y);
        const pxu = y => 1024 / (2 * Math.PI * K.robeR(y)), pxv = (Vy(0.5) - Vy(0.6)) / 0.1;
        const at = (deg, y, fn) => { g.save(); g.translate(U(deg), Vy(y)); g.scale(pxu(y), pxv); fn(g); g.restore(); };
        const fo = M(FL_O, 1.35), fr = M(FL_R), fy = M(FL_Y, 1.25);
        // chest flame above the belt
        at(-3 + TURN_DEG * 0.8, 1.2, g => flameMotif(g, 0, 0, 0.19, fr, fo, fy));
        // skirt flames on both front panels (and on the back)
        [-40, 40, 140, -140, 180].forEach(d => at(d + TURN_DEG, 0.44, g => softFlame(g, 0, 0, 0.235, M('#F8A762', 1.3), M('#FBD3A8', 1.25))));
        // straps on the chest: red sash from the collar bead to the image-left hip, green strap on the image-right
        const line = (pts, wpx, color) => { g.strokeStyle = color; g.lineWidth = wpx; g.lineCap = 'butt'; g.beginPath(); pts.forEach(([d, y], i) => i ? g.lineTo(U(d), Vy(y)) : g.moveTo(U(d), Vy(y))); g.stroke(); };
        line([[4, 1.56], [-30, 1.37], [-58, 1.2], [-90, 1.08]], 52, M(RED_INK));
        line([[4, 1.56], [-30, 1.37], [-58, 1.2], [-90, 1.08]], 42, M(RED));
        line([[16, 1.56], [36, 1.34], [58, 1.12]], 32, M(GREEN_INK));
        line([[16, 1.56], [36, 1.34], [58, 1.12]], 24, M(GREEN));
        // hem: orange-red edge band and a yellow band above it (all the way round)
        g.fillStyle = M(HEM_Y, 1.5); g.fillRect(0, Vy(0.335), 1024, 1024 - Vy(0.335));
        g.fillStyle = M(HEM_R); g.fillRect(0, Vy(0.255), 1024, 1024 - Vy(0.255));
        g.fillStyle = M('#F6A060'); g.fillRect(0, Vy(0.345), 1024, 8); g.fillRect(0, Vy(0.26) - 3, 1024, 6);
        // front opening between the two skirt panels: orange-red panel borders with the spotted leg between them
        // the skirt is two front panels: between them a gap (widening toward the hem) shows the spotted legs,
        // each panel's inner edge is bordered in orange-red
        const gapHalf = y => lerp(11, 1.2, Math.min(Math.max((y - 0.2) / 0.45, 0), 1));
        const gapPoly = (extra, color) => {
          g.fillStyle = color; g.beginPath();
          for (let k = 0; k <= 12; k++) { const y = lerp(0.19, 0.66, k / 12); const d = -gapHalf(y) - extra + TURN_DEG; k ? g.lineTo(U(d), Vy(y)) : g.moveTo(U(d), Vy(y)); }
          for (let k = 12; k >= 0; k--) { const y = lerp(0.19, 0.66, k / 12); g.lineTo(U(gapHalf(y) + extra + TURN_DEG), Vy(y)); }
          g.closePath(); g.fill();
        };
        gapPoly(4.2, M(HEM_R));
        gapPoly(0, M(FUR));
        g.fillStyle = M(SPOT); [[-2.5, 0.3, 7, 9], [3, 0.42, 6, 8], [-0.6, 0.52, 4, 6], [6, 0.24, 5, 6]].forEach(([d, y, a, b]) => { g.beginPath(); g.ellipse(U(d + TURN_DEG), Vy(y), a, b, 0, 0, Math.PI * 2); g.fill(); });
        tex.needsUpdate = true;
      }

      /* ================= shoulder capelet (short red cape with yellow trim) + green collar + gold bead ================= */
      const capeG = part('cape', K.body);
      {
        const prof = new THREE.SplineCurve([[0.62, 1.42], [0.6, 1.45], [0.555, 1.52], [0.47, 1.6], [0.38, 1.665], [0.29, 1.72], [0.22, 1.765]].map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(80);
        const profR = (y) => { for (let k = 0; k < prof.length - 1; k++) { const a = prof[k], b = prof[k + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < 1.5 ? 0.62 : 0.22; };
        // lower edge: each front flap sags between the bead and the shoulder tip, the tips curl up
        const edgeY = (a) => 1.5 - 0.055 * Math.exp(-Math.pow((a - 0.55) / 0.3, 2)) + 0.03 * Math.exp(-Math.pow((a - 1.25) / 0.2, 2)) - 0.03 * sst(1.5, 2.2, a);
        const nu = 120, nv = 40, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, gap = 52 * Math.PI / 180 * sst(1.53, 1.77, lerp(1.47, 1.765, t));
          for (let i = 0; i <= nu; i++) {
            const phi = gap + (Math.PI * 2 - gap * 2) * i / nu, a = Math.min(phi, Math.PI * 2 - phi);
            const y = lerp(edgeY(a), 1.765, t), r = profR(y), wob = 1 + 0.03 * Math.pow(Math.abs(Math.sin(phi * 2)), 2) * (1 - t);
            pos.push(Math.sin(phi) * r * wob, y, Math.cos(phi) * r * wob); uv.push(i / nu, t);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const tex = canvasTex(1024, 256, (g, w, h) => {
          g.fillStyle = M(RED); g.fillRect(0, 0, w, h);
          g.globalAlpha = 0.5; g.fillStyle = M(RED_DK); for (let i = 0; i < 12; i++) g.fillRect(i * w / 12 + 20, 0, 18, h * 0.86); g.globalAlpha = 1;
          g.fillStyle = M(YEL, 1.3); g.fillRect(0, h * 0.87, w, h * 0.13);
          g.fillStyle = M('#F6B45E'); g.fillRect(0, h * 0.87, w, 4); g.fillStyle = M(RED_INK); g.fillRect(0, h - 4, w, 4);
        });
        mesh(geo, texMat(tex, { side: DS, roughness: 0.85 }), capeG, null, null, RED_INK);
        const hem = []; for (let i = 0; i <= nu; i += 2) hem.push(V(pos[i * 3] * 1.004, pos[i * 3 + 1] + 0.004, pos[i * 3 + 2] * 1.004));
        mesh(tube(hem, 0.014, 120, 6, true), std(M(YEL, 1.3), { roughness: 0.7 }), capeG);
        // green neck band seen in the V of the capelet
        const col = mesh(new THREE.TorusGeometry(0.235, 0.045, 12, 64), std(M(GREEN), { roughness: 0.8 }), capeG, [0, 1.72, 0.01], [1, 1, 1], GREEN_INK);
        col.rotation.x = Math.PI / 2 - 0.12;
        // green crossed-collar edges lining the V down to the bead
        [-1, 1].forEach(sx => {
          const pts = [];
          for (let k = 0; k <= 10; k++) {
            const y = lerp(1.55, 1.75, k / 10), j = prof.findIndex(q => q.y >= y), r = (j > 0 ? prof[j].x : prof[0].x) + 0.012;
            const gap = 52 * Math.PI / 180 * sst(1.53, 1.77, y) + 0.02;
            pts.push(V(Math.sin(gap) * r * sx, y, Math.cos(gap) * r));
          }
          mesh(tube(pts, 0.03, 24, 8), std(M(GREEN), { roughness: 0.8 }), capeG, null, null, GREEN_INK);
        });
        bead(capeG, [0.02, 1.545, 0.63], 0.066);
        // short red ribbon tail hanging from the bead over the chest
        onRobeFlat(notched([0.05, 1.52], [0.21, 1.25], -0.02, 0.1, 0.105, 0.045), 0.05, 0.022, redM, RED_INK, capeG);
      }

      /* ================= long flowing cape (red → orange, yellow lining) ================= */
      {
        // billowing cape: widest around the knees, hem lifted toward the front edges (it flares out at the sides)
        const prof = new THREE.SplineCurve([[0.8, 0.37], [0.88, 0.5], [0.9, 0.7], [0.85, 0.93], [0.74, 1.13], [0.63, 1.3], [0.56, 1.46]].map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(80);
        const capeR = (y) => { for (let k = 0; k < prof.length - 1; k++) { const a = prof[k], b = prof[k + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < 0.4 ? 0.8 : 0.56; };
        const nu = 140, nv = 44, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, gap = lerp(62, 92, t) * Math.PI / 180;
          for (let i = 0; i <= nu; i++) {
            const phi = gap + (Math.PI * 2 - gap * 2) * i / nu, side = Math.pow(Math.abs(Math.cos(phi / 2)), 1.5);   // 1 at the front edges, 0 at the back
            const y = lerp(0.37 + 0.2 * side, 1.46, t), r = capeR(y) + 0.04 * side * (1 - t);
            const fold = 1 + 0.035 * Math.sin(phi * 9) * (1 - t);
            pos.push(Math.sin(phi) * r * fold, y, Math.cos(phi) * r * fold); uv.push(i / nu, t);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const tex = canvasTex(1024, 512, (g, w, h) => {
          const lg = g.createLinearGradient(0, 0, 0, h);
          lg.addColorStop(0, M(CAPE_R, 1.3)); lg.addColorStop(0.3, M('#EC8452', 1.25)); lg.addColorStop(0.62, M(CAPE_O, 1.2)); lg.addColorStop(0.92, M(CAPE_Y, 1.15)); lg.addColorStop(1, M(CAPE_Y, 1.1));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.globalAlpha = 0.45; g.fillStyle = M(CAPE_R, 1.3);
          for (let i = 0; i < 18; i++) { const x = (i + 0.5) * w / 18; g.beginPath(); g.ellipse(x, h * 0.55, 14, h * 0.5, 0, 0, Math.PI * 2); g.fill(); }
          g.globalAlpha = 1; g.fillStyle = M(HEM_Y, 1.3); g.fillRect(0, h - 22, w, 22);
        });
        const cm = mesh(geo, texMat(tex, { roughness: 0.85 }), capeG, null, null, RED_INK);
        const ln = new THREE.Mesh(geo, std(M(CAPE_Y, 1.15), { side: THREE.BackSide, roughness: 0.9 })); ln.receiveShadow = true; cm.add(ln);
      }

      /* ================= belt: green sash, red belt, sun medallion, gold balls, red bow ================= */
      {
        const B = K.beltG; B.rotation.y = TURN;
        const Bd = group(B, [0, 0, 0], [0, -TURN, 0]);   // un-turned frame for the flying sash ends
        const rotY = (q, a) => [q[0] * Math.cos(a) + q[2] * Math.sin(a), q[1], -q[0] * Math.sin(a) + q[2] * Math.cos(a)];
        // green waist cloth: a thin edge shows above the red belt, a wide band below it
        const gs = mesh(new THREE.CylinderGeometry(K.robeR(1.1) + 0.025, K.robeR(0.77) + 0.036, 0.33, 96, 1, true), greenDS, B, [0, 0.935, 0]);
        const rb = mesh(new THREE.CylinderGeometry(K.robeR(1.06) + 0.045, K.robeR(0.92) + 0.05, 0.14, 96, 1, true), redDS, B, [0, 0.99, 0]);
        gs.castShadow = rb.castShadow = false;
        [[1.1, 0.028, GREEN_INK], [0.77, 0.038, GREEN_INK], [1.06, 0.05, RED_INK], [0.92, 0.055, RED_INK]].forEach(([y, o, c]) => {
          const t = mesh(new THREE.TorusGeometry(K.robeR(y) + o, 0.008, 6, 96), std(M(c), { roughness: 0.8 }), B, [0, y, 0]); t.rotation.x = Math.PI / 2;
        });
        // soft fold lines on the lower green band
        {
          const fm = std(M(GREEN_DK), { roughness: 0.85 });
          [-150, -110, -70, -40, 35, 68, 105, 145, 180].forEach(dg => {
            const pts = []; for (let k = 0; k <= 6; k++) { const y = lerp(0.79, 0.91, k / 6); pts.push(K.onRobe(dg + 4 * Math.sin(k), y, 0.042)); }
            mesh(tube(pts, 0.006, 12, 5), fm, B);
          });
        }
        const zF = K.robeR(0.97) + 0.07;
        medal(B, [-0.02, 0.965, zF], 0.175, (g) => {
          g.fillStyle = M(GOLD, 1.3); g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
          g.strokeStyle = M('#FCE7A8', 1.3); g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 96, 0, Math.PI * 2); g.stroke();
          g.fillStyle = M('#E0673F'); g.beginPath(); g.arc(128, 128, 88, 0, Math.PI * 2); g.fill();
          g.strokeStyle = M('#C9963E'); g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 89, 0, Math.PI * 2); g.stroke();
          flameMotif(g, 128, 160, 72, M('#F59A55', 1.3), M('#FBC66E', 1.3), M('#FDE3A6', 1.3));
        }, M(GOLD), GOLD_INK, M(GOLD, 1.3));
        [-1, 1].forEach(sx => {
          bead(B, [-0.02 + 0.2 * sx, 0.975, K.robeR(0.975) + 0.07], 0.035);
          bead(B, [-0.02 + 0.235 * sx, 0.865, K.robeR(0.865) + 0.09], 0.062);
          // bow loops, spreading sideways from the knot
          const l = mesh(new THREE.TorusGeometry(0.075, 0.03, 10, 28), redM, B, [-0.02 + 0.105 * sx, 0.765, zF - 0.005], [1.35, 0.78, 0.7], RED_INK);
          l.rotation.z = 0.35 * sx;
          // two long notched tails diverging down over the skirt
          onRobeFlat(notched([-0.02 + 0.03 * sx, 0.75], [-0.02 + 0.17 * sx, 0.49], 0.02 * sx, 0.075, 0.1, 0.04), 0.055, 0.02, redM, RED_INK, B);
        });
        mesh(sphere(0.048, 16, 12), redM, B, [-0.02, 0.765, zF + 0.01], [1.05, 1, 0.8], RED_INK);
        // green sash ends flowing out over the skirt: a folded cloth (dark fold, pale crest), a gold ball and a red tassel
        const drapeTex = canvasTex(128, 256, (g, w, h) => {
          g.fillStyle = M(GREEN, 1.25); g.fillRect(0, 0, w, h);
          // soft folds running along the cloth: two shaded valleys and pale crests
          [[0.2, M(GREEN_DK, 1.1), 0.7], [0.55, M(GREEN_DK, 1.1), 0.45], [0.36, M('#D4D98F', 1.1), 0.7], [0.75, M('#CDD48A', 1.1), 0.6]].forEach(([u, c, a]) => {
            const lg = g.createLinearGradient((u - 0.12) * w, 0, (u + 0.12) * w, 0);
            lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.5, c); lg.addColorStop(1, 'rgba(0,0,0,0)');
            g.globalAlpha = a; g.fillStyle = lg; g.fillRect(0, 0, w, h);
          });
          g.globalAlpha = 1;
        });
        const drapeM = texMat(drapeTex, { roughness: 0.85, side: DS });
        const greenDk = std(M(GREEN_DK), { roughness: 0.85, side: DS });
        [-1, 1].forEach(sx => {
          const endX = sx < 0 ? -0.81 : 0.76;
          const p = [[0.3, 0.85, 0.47], [0.47, 0.75, 0.46], [0.63, 0.61, 0.42], [0.78, 0.48, 0.37]].map(([x, y, z], i) => {
            const q = rotY([x * sx, y, z], TURN * (1 - i / 3));
            if (i === 3) q[0] = endX; else if (i === 2) q[0] += (endX - 0.78 * sx) * 0.5;
            return q;
          });
          mesh(ribbon(p, t => 0.2 + 0.07 * Math.sin(Math.PI * Math.pow(t, 0.8)) - 0.13 * t, { face: [0.35 * sx, 0.25, 1], twist: t => 0.35 * sx * Math.sin(t * Math.PI), segs: 40 }), drapeM, Bd, null, null, GREEN_INK);
          const q = p.map(([x, y, z], i) => [x + 0.05 * sx, y - 0.07 + i * 0.014, z - 0.03]);
          mesh(ribbon(q, t => 0.14 + 0.07 * Math.sin(Math.PI * Math.pow(t, 0.8)) - 0.08 * t, { face: [0.35 * sx, 0.25, 1], twist: t => -0.2 * sx * t, segs: 30 }), greenDk, Bd, null, null, GREEN_INK);
          bead(Bd, [endX + 0.01 * sx, 0.45, 0.37], 0.058);
          K.tassel(Bd, [endX + 0.01 * sx, 0.39, 0.37], M(RED), 0.17, 0.05, RED_INK);
        });
      }

      /* ================= spotted fur arms with gold-and-red cuffs, fists ================= */
      {
        const armTex = canvasTex(512, 256, (g, w, h) => {
          g.fillStyle = M(FUR); g.fillRect(0, 0, w, h);
          g.fillStyle = M(SPOT);
          for (let i = 0; i < 26; i++) { const x = K.rand() * w, y = K.rand() * h, s = 0.6 + K.rand() * 0.6; g.beginPath(); g.ellipse(x, y, 30 * s, 11 * s, 0, 0, Math.PI * 2); g.fill(); }
        });
        const armM = texMat(armTex, { roughness: 0.95 });
        // hide the engine's wrist balls: the fists come straight out of the cuffs
        K.poseG.children.filter(o => o.isMesh && o.geometry.parameters && Math.abs(o.geometry.parameters.radius - 0.09 * 1.35) < 1e-6).forEach(o => { o.visible = false; });
        ['L', 'R'].forEach(s => {
          const H = K.hands[s];
          mesh(tube(H.path, t => 0.13 - 0.025 * t, 40, 20), armM, K.poseG, null, null, INK);
          mesh(sphere(0.13, 20, 14), armM, K.poseG, H.path.getPointAt(0));
          const cg = group(K.poseG, H.wrist.clone().addScaledVector(H.dir, -0.02));
          cg.quaternion.setFromUnitVectors(V(0, 1, 0), H.dir.clone().normalize());
          mesh(new THREE.CylinderGeometry(0.128, 0.13, 0.07, 28), goldM, cg, [0, -0.035, 0], null, GOLD_INK);
          mesh(new THREE.CylinderGeometry(0.12, 0.124, 0.045, 28), std(M('#D9704A'), { roughness: 0.8 }), cg, [0, 0.02, 0], null, RED_INK);
          // curled fingers wrapped round the handle (three rolls stacked along the grip) and a thumb on top
          const pm = std(M(CREAM, 1.3), { roughness: 0.95 });
          const fg = group(K.poseG, H.p, [0, 0, s === 'L' ? 0.36 : -0.38]);
          const sx = s === 'L' ? 1 : -1;   // fingers curl toward the body side
          [-0.065, -0.005, 0.055].forEach((dy, i) => mesh(sphere(0.062, 20, 14), pm, fg, [0.045 * sx, dy, 0.095], [1.25, 0.72, 0.85], CREAM_INK));
          mesh(sphere(0.05, 16, 12), pm, fg, [-0.04 * sx, 0.1, 0.07], [1.2, 0.8, 0.9], CREAM_INK);
        });
      }

      /* ================= legs & cream feet ================= */
      {
        const legTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = M(FUR); g.fillRect(0, 0, w, h); g.fillStyle = M(SPOT); for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse(K.rand() * w, K.rand() * h, 14, 10, 0, 0, Math.PI * 2); g.fill(); } });
        const cm = std('#C99A7C', { roughness: 0.8 });
        [-1, 1].forEach(sx => {
          const lp = [0.32 * sx * Math.cos(TURN) + 0.18 * Math.sin(TURN), 0.42, -0.32 * sx * Math.sin(TURN) + 0.18 * Math.cos(TURN)];
          mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.55, 20), texMat(legTex, { roughness: 0.95 }), K.poseG, lp, null, INK);
          const fg = group(K.poseG, [0.34 * sx * Math.cos(TURN) + 0.3 * Math.sin(TURN), 0, -0.34 * sx * Math.sin(TURN) + 0.3 * Math.cos(TURN)], [0, TURN, 0]);
          mesh(sphere(0.2, 32, 22), creamM, fg, [0, 0.13, 0], [1.12, 0.66, 1.22], CREAM_INK);
          [-0.075, 0.075].forEach(dx => mesh(tube([[dx, 0.21, 0.19], [dx * 1.05, 0.14, 0.235], [dx * 1.1, 0.06, 0.225]], 0.007, 8, 5), cm, fg));
        });
      }

      /* ================= lotus-leaf fan in the image-left paw ================= */
      {
        const fanG = part('fan', K.body);
        fanG.position.copy(K.hands.L.p); fanG.rotation.set(0, 0.18, 0.36);
        const stemM = std(M(STEM), { roughness: 0.75 });
        mesh(tube([[0, -0.3, 0], [0, 0.0, 0], [0, 0.36, 0]], 0.036, 16, 12), stemM, fanG, null, null, LEAF_INK);
        mesh(sphere(0.052, 20, 14), std(M('#A28D4E'), { roughness: 0.6 }), fanG, [0, -0.33, 0], [1, 1.1, 1], GOLD_INK);
        mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.032, 20), goldM, fanG, [0, -0.265, 0], null, GOLD_INK);
        // leaf blade: obovate with scalloped edge, gently cupped
        // round fan-shaped blade: tapered base, half-ellipse top, scalloped rim
        const L = 1.19, HW = 0.55, YC = 0.5 * L, outline = [];
        const hw = y => y < YC ? HW * Math.pow(Math.sin(Math.PI / 2 * y / YC), 0.62) : HW * Math.sqrt(Math.max(0, 1 - Math.pow((y - YC) / (L - YC), 2)));
        for (let i = 0; i <= 40; i++) { const y = YC * i / 40; outline.push([hw(y), y]); }
        for (let i = 1; i <= 50; i++) { const a = i / 50 * Math.PI / 2; outline.push([HW * Math.cos(a), YC + (L - YC) * Math.sin(a)]); }
        const right = outline, left = outline.slice().reverse().map(([x, y]) => [-x, y]);
        const pts = right.concat(left.slice(1));
        const cx = 0, cy = L * 0.52, sc = [];
        let arc = [0]; for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        pts.forEach(([x, y], i) => {
          const s = arc[i] / arc[arc.length - 1], dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
          const k = 0.085 * (Math.pow(Math.abs(Math.sin(s * Math.PI * 13)), 0.4) - 0.6) * sst(0.12, 0.3, y);
          sc.push([x + dx / d * k, y + dy / d * k]);
        });
        const geo = extrude(sc, 0.024, 0.008, 2, 1);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) + 0.07 * Math.pow(x / HW, 2) - 0.05 * Math.pow(y / L, 2)); }
        geo.computeVertexNormals();
        const tex = canvasTex(512, 576, (g, w, h) => {
          const X = x => (x / (2 * 0.6) + 0.5) * w, Y = y => (1 - y / L) * h;
          const rg = g.createRadialGradient(X(0), Y(L * 0.45), 20, X(0), Y(L * 0.5), w * 0.55);
          rg.addColorStop(0, M('#92AC5C', 1.6)); rg.addColorStop(0.55, M('#A6BC68', 1.6)); rg.addColorStop(1, M('#BDCB76', 1.45));
          g.fillStyle = rg; g.fillRect(0, 0, w, h);
          g.strokeStyle = M(VEIN, 1.4); g.lineCap = 'round';
          g.lineWidth = 11; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(0), Y(L * 0.93)); g.stroke();
          g.lineWidth = 5;
          [0.2, 0.33, 0.46, 0.59, 0.72, 0.84].forEach((t, i) => [-1, 1].forEach(sx => {
            const y0 = L * t, ex = sx * hw(Math.min(L * (t + 0.14), L * 0.97)) * 0.93, ey = L * Math.min(t + 0.14, 0.97);
            g.beginPath(); g.moveTo(X(0), Y(y0)); g.quadraticCurveTo(X(ex * 0.45), Y(y0 + 0.02), X(ex), Y(ey)); g.stroke();
          }));
        });
        tex.repeat.set(1 / 1.2, 1 / L); tex.offset.set(0.5, 0);
        const leafG = group(fanG, [0, 0.37, 0]);
        mesh(geo, [texMat(tex, { side: DS, roughness: 0.7 }), std(M(LEAF_DK), { roughness: 0.7 })], leafG, null, null, LEAF_INK);
        // gold flower collar where the blade meets the handle
        const fl = group(fanG, [0, 0.36, 0.03]);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(sphere(0.052, 16, 12), goldM, fl, [Math.sin(a) * 0.066, Math.cos(a) * 0.066, 0], [1, 1, 0.55], GOLD_INK); }
        mesh(sphere(0.04, 16, 12), std(M('#F0A044'), { roughness: 0.5 }), fl, [0, 0, 0.03], [1, 1, 0.8], GOLD_INK);
        // cord from the flower to a gold ball and a red tassel (hangs straight down, so it is not rotated with the fan)
        const tg = part('fan', K.body);
        const fw = V(0, 0.36, 0.03).applyEuler(fanG.rotation).add(fanG.position);
        const ball = V(-0.98, 1.36, K.hands.L.p.z + 0.02);
        mesh(tube([fw, fw.clone().lerp(ball, 0.5).add(V(0, -0.03, 0.02)), ball], 0.009, 12, 6), goldM, tg);
        bead(tg, [ball.x, ball.y, ball.z], 0.05);
        K.tassel(tg, [ball.x, ball.y - 0.045, ball.z], M(RED), 0.2, 0.048, RED_INK);
        K.__fan = fanG;
      }

      /* ================= flaming torch in the image-right paw ================= */
      {
        const torchG = part('torch', K.body);
        torchG.position.copy(K.hands.R.p); torchG.rotation.set(0, -0.12, -0.38);
        const wood = std(M(WOOD), { roughness: 0.7 });
        mesh(tube([[0, -0.33, 0], [0, 0.1, 0], [0, 0.52, 0]], t => 0.041 + 0.008 * t, 20, 14), wood, torchG, null, null, WOOD_INK);
        bead(torchG, [0, -0.37, 0], 0.062);
        mesh(sphere(0.018, 10, 8), std(M('#8E5A34'), { roughness: 0.6 }), torchG, [0, -0.37, 0.058]);
        mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.035, 20), goldM, torchG, [0, -0.27, 0], null, GOLD_INK);
        mesh(lathe([[0.001, 0.49], [0.06, 0.49], [0.075, 0.52], [0.078, 0.57], [0.07, 0.585], [0.09, 0.6], [0.108, 0.66], [0.118, 0.72], [0.105, 0.735], [0.001, 0.73]], 40).geo, std(M(CUP_DK), { roughness: 0.6 }), torchG, null, null, WOOD_INK);
        const rim = mesh(new THREE.TorusGeometry(0.113, 0.016, 8, 40), std(M(CUP, 1.3), { roughness: 0.5, metalness: 0.1 }), torchG, [0, 0.725, 0]); rim.rotation.x = Math.PI / 2;
        // red bow tied below the cup (kept level with the world, tails hang down)
        const bow = group(torchG, [0, 0.45, 0.05], [0, 0, 0.38]);
        [-1, 1].forEach(sx => {
          const l = mesh(new THREE.TorusGeometry(0.064, 0.023, 10, 28), redM, bow, [0.085 * sx, 0.01, 0], [1.3, 0.8, 0.6], RED_INK); l.rotation.z = -0.25 * sx;
        });
        mesh(ribbon([[0.02, -0.02, 0.01], [0.08, -0.15, 0.03], [0.13, -0.29, 0.01], [0.18, -0.38, 0.0]], t => 0.075 * (1 + 0.3 * t), { face: [0, 0, 1], twist: t => 0.4 * t, segs: 24 }), redDS, bow, null, null, RED_INK);
        mesh(ribbon([[-0.01, -0.02, 0.01], [0.0, -0.12, 0.03], [0.03, -0.2, 0.02]], t => 0.06, { face: [0, 0, 1], segs: 16 }), redDS, bow, null, null, RED_INK);
        const md = medal(bow, [0, 0, 0.045], 0.045, (g) => { g.fillStyle = M('#E0604A'); g.beginPath(); g.arc(128, 128, 70, 0, Math.PI * 2); g.fill(); }, M(GOLD), GOLD_INK, M(GOLD, 1.3));
        md.children.forEach(o => { o.castShadow = false; });
        bead(bow, [0.0, -0.075, 0.04], 0.022);
        const lf = mesh(K.leafGeo(0.09, 0.05), std(M(GREEN), { side: DS }), bow, [-0.05, -0.02, 0.05]); lf.rotation.z = 2.2;
        // the fire: nested curling tongues (orange rim → amber → yellow → pale core), kept upright
        const fireG = group(torchG, [0, 0.68, 0], [0, 0, 0.38]);
        tongue(fireG, [-0.02, 0.1, 0], 0.54, 0.34, -0.13, 0.05, L4);
        tongue(fireG, [-0.12, 0.1, -0.02], 0.34, 0.17, 0.08, 0.35, L4.slice(0, 3));
        tongue(fireG, [0.13, 0.1, -0.02], 0.4, 0.19, -0.1, -0.3, L4.slice(0, 3));
        tongue(fireG, [0.19, 0.04, -0.03], 0.22, 0.11, -0.06, -0.75, L4.slice(0, 2));
        tongue(fireG, [-0.19, 0.03, -0.03], 0.18, 0.1, 0.05, 0.8, L4.slice(0, 2));
        K.__fire = fireG;
      }

      /* ================= floating decorations: a smiling flame sprite, embers, leaves, a gold bead ================= */
      {
        const items = [];
        // flame sprite with a face
        const sp = group(K.decor, [-1.24, 0.66, 0.4]);
        tongue(sp, [0, 0, 0], 0.4, 0.34, -0.05, 0, L4.slice(0, 3));
        tongue(sp, [-0.1, 0.02, -0.02], 0.26, 0.16, 0.05, 0.55, L4.slice(0, 2));
        tongue(sp, [0.1, 0.02, -0.02], 0.28, 0.16, -0.05, -0.5, L4.slice(0, 2));
        const em = std('#6B3A22', { roughness: 0.5 });
        [-1, 1].forEach(sx => mesh(sphere(0.019, 12, 10), em, sp, [0.05 * sx, 0.0, 0.29], [1, 1.2, 0.6]));
        mesh(tube([[-0.035, -0.045, 0.285], [0, -0.068, 0.293], [0.035, -0.045, 0.285]], 0.006, 10, 5), em, sp);
        items.push(sp);
        // embers above the torch
        items.push(tongue(K.decor, [1.02, 2.8, 0.4], 0.18, 0.1, -0.03, 0.15, L4.slice(0, 3)));
        items.push(tongue(K.decor, [0.94, 2.56, 0.42], 0.12, 0.07, 0.02, 0.1, L4.slice(0, 2)));
        // gold bead
        const gb = group(K.decor, [-1.08, 0.38, 0.35]); bead(gb, [0, 0, 0], 0.07); items.push(gb);
        // two green leaves
        const leafShape = (Lh, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, Lh * 0.45, 0, Lh); s.quadraticCurveTo(-w, Lh * 0.45, 0, 0); return s; };
        const ld = extrude(leafShape(0.3, 0.16), 0.025, 0.008, 2, 12), lm = std(M('#B4C47A'), { roughness: 0.75 });
        [[-1.35, 1.3, 0.3, 0.5], [1.32, 1.45, 0.15, -2.3]].forEach(([x, y, z, r]) => {
          const g = group(K.decor, [x, y, z], [0.2, 0.3, r]);
          mesh(ld, lm, g, [0, -0.15, 0], null, LEAF_INK);
          mesh(tube([[0, -0.15, 0.014], [0, 0, 0.016], [0, 0.1, 0.014]], 0.006, 10, 5), std(M('#93A962'), { roughness: 0.8 }), g);
          items.push(g);
        });
        items.forEach(g => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.2 + i * 1.4) * k;
          g.rotation.z = g.userData.r0 + 0.1 * Math.sin(t * 0.9 + i) * k;
        }));
      }
    },

    action: {
      label: '搧火', dur: 1.8,
      run(s, p, K) {
        if (K.__fan) K.__fan.rotation.z = 0.36 + 0.32 * Math.sin(p * Math.PI * 6) * s;
        if (K.__fire) K.__fire.scale.setScalar(1 + 0.35 * s);
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '驅暑送涼的火神將軍',
        text: '小暑是入伏前的第一個熱節氣，「溫風至」，天氣一天比一天炎熱。這隻豹貓化身火神將軍：右手高舉火炬象徵盛夏的陽火，左手卻拿著一大片蓮葉扇，一邊掌火、一邊替人搧來涼風。整體以豹紋黃褐、火焰紅、蓮葉綠與日輪金配色。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '豹紋小臉與開心大笑',
        text: '黃褐色的圓臉上散著深褐色斑點，額頭是一道道直立的長斑，兩頰是小圓點；眼睛周圍與口鼻一圈是奶白色。大大的圓眼上半深棕、下半透出橄欖綠，反光點朝向臉中央；粉色小鼻下張著嘴開心大笑，兩頰有淡粉腮紅與白色鬍鬚。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '大立耳與白耳毛',
        text: '一對又寬又高的大耳朵往外斜立，外緣是較深的黃褐色描邊，耳內淡粉，耳根冒出一叢像羽毛的白色長耳毛。' },
      headband: { chip: '頭巾', tag: '服飾', name: '紅頭巾與金花',
        text: '額前綁一條紅色頭巾，兩側耳根各壓一顆金珠；正中央是一朵六瓣金花，花心鑲紅寶石，後面立著三片綠葉。頭巾在畫面右側垂下一條長長飄動的紅緞帶，左側只露出一小截短帶尾。' },
      fan: { chip: '蓮葉扇', tag: '道具', name: '蓮葉大扇',
        text: '左手（畫面左）握著一把比頭還大的綠色蓮葉扇：扇面是邊緣呈波浪圓瓣的大葉片，淺黃綠的葉脈從中央主脈向外展開。葉柄與扇面交接處裝飾金色小花，旁邊用細繩掛一顆金珠與紅流蘇，綠色扇柄末端有金環與圓頭。按「搧火」可以看牠揮扇。' },
      torch: { chip: '火炬', tag: '道具', name: '高舉的火炬',
        text: '右手（畫面右）斜斜舉起一支木柄火炬，柄尾是金色圓珠與金環；頂端是棕金色的火盆，燃著一大團橘黃色火焰。火盆下方綁著紅色蝴蝶結，結心是鑲紅心的金釦，還垂著金珠與一片小綠葉。' },
      cape: { chip: '披風', tag: '服飾', name: '紅披肩與火焰長披風',
        text: '肩上是一件紅色短披肩，下緣滾一道鵝黃邊，胸前以一顆金珠扣住，領口露出綠色的領圈，扣下垂著一小段紅緞帶。背後拖著一件長披風，由上方的紅色漸層到下襬的橘黃色，像一團往下流動的火焰，兩側在身後張開。' },
      robe: { chip: '戰袍', tag: '服飾', name: '火焰紋米白戰袍',
        text: '裡面是一件米白色短戰袍：胸口繡一團橘紅火焰，一條紅帶從金扣斜斜繞到左腰，右胸則有一道綠色斜帶。下襬分成左右兩片，各繡一朵橘色火焰，底邊是鵝黃與橘紅兩道滾邊，中間開衩露出帶斑點的腿。' },
      belt: { chip: '日輪腰帶', tag: '服飾', name: '日輪金章與綠腰巾',
        text: '腰間先圍一條寬綠腰巾，再繫紅色腰帶；正中是一面圓形日輪金章，金框裡的紅底上燃著一朵火焰。金章兩側各有金珠，下方打一個紅色蝴蝶結。綠腰巾的兩端從腰側向外飄出，末端各掛金珠與紅流蘇。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '環紋勾尾', dir: [1, 0.3, -0.75],
        text: '粗粗的黃褐色尾巴從畫面右後方繞出，先向外再往上翹起，尾尖往內勾；尾巴上有三圈深褐色環紋，尾端整段是深褐色，是豹貓的招牌特徵。' },
      pose: { chip: '姿態', tag: '貓咪本體', name: '一手火、一手扇',
        text: '兩隻手臂露出帶斑點的豹紋毛，手腕戴著金色與紅色的護腕，奶白色的拳頭分別握著蓮葉扇與火炬；兩隻奶白色的腳掌穩穩站著，一副精神抖擻、準備出征的模樣。' }
    },
    order: ['overview', 'face', 'ears', 'headband', 'fan', 'torch', 'cape', 'robe', 'belt', 'tail', 'pose']
  });
})();
