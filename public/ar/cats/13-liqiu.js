// @file 13_立秋_賓士貓
// @title 立秋・立秋將軍 | 二十四節氣貓
(function () {
  // The renderer brightens front-facing surfaces by roughly 1.45x (linear). M() turns a colour SAMPLED
  // from refs/13.png into the material colour that renders back to about that value.
  function M(hex, f) {
    f = f || 1.45; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f, 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  // picture px → world units (x = 222 is the body axis, y = 525 is the boot soles)
  const S = 0.0105, X = px => (px - 222) * S, Y = py => (525 - py) * S;
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---- colours sampled from refs/13.png (then compensated) ----
  const FUR = M('#554943'), FUR_TOP = M('#5A4D46'), INK = '#2F2622';
  const WHITE = M('#FAF1E5', 1.32), WHITE_INK = '#C9B6A4';
  const EAR_PINK = M('#F2BAA0', 1.3), NOSE = M('#F4B7A1', 1.3);
  const HAT = M('#655246'), HAT_INK = '#2E231D';
  const GOLD = M('#EABC6A'), GOLD_LT = M('#F3CD87', 1.3), GOLD_DK = M('#C99443'), GOLD_INK = '#9A6D2C';
  const PLUME = M('#FAE8C8', 1.32), PLUME_GOLD = M('#EDC690', 1.35), PLUME_INK = '#C09252';
  const KNOT = M('#A5543B'), RED_INK = '#7E3A26';
  const CAPE = M('#D07752'), CAPE_DK = M('#9C4F36'), CAPE_INK = '#86432D';
  const BORDER = M('#C1764B'), BELT = M('#C8724C');
  const GREEN = M('#9A8F60'), GREEN_LT = M('#A89E6C'), GREEN_DK = M('#766D47'), GREEN_INK = '#5A5433';
  const CUFF = M('#88825B');
  const SCALE = M('#7A5B43'), SCALE_DK = M('#553D2D'), SCALE_LT = M('#98775A');
  const CREAM = M('#F9EAD2', 1.4), SKIRT = M('#F8E8CE', 1.72), CREAM_INK = '#BE956C';
  const PANTS = M('#6D5443'), BOOT = M('#7B5C46'), SOLE = M('#D4B488', 1.3), BROWN_INK = '#3E2C22';
  const POLE = M('#A57754'), POLE_INK = '#6A4630', FLAG = M('#F8E6C6', 1.62);
  const BLADE = M('#D8C8BA', 1.25), EDGE = M('#F6EDE2', 1.15), GRIP = M('#765540'), TASSEL = M('#BB6849');

  // flag pole (world): bottom end → spear tip. The image-left paw sits on this line.
  const POLE_B = [X(137), Y(372), 0.74], POLE_T = [X(62), Y(15), -0.3];
  const poleAt = y => { const t = (y - POLE_B[1]) / (POLE_T[1] - POLE_B[1]); return [lerp(POLE_B[0], POLE_T[0], t), y, lerp(POLE_B[2], POLE_T[2], t)]; };
  const HAND_L = poleAt(2.75);
  // sword: blade axis leans ~27° to image-right, the image-right paw grips it at HAND_R
  const HAND_R = [1.1, 1.88, 0.5], SWORD_ROT = -0.43;

  // ---- canvas helpers ----
  function scales(g, x0, y0, x1, y1, sw, sh, base, dark, light) { // fish-scale armour
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    g.fillStyle = base; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.lineCap = 'round';
    for (let row = 0, y = y0 - sh; y < y1 + sh; y += sh, row++) {
      for (let x = x0 - sw + (row % 2) * sw / 2; x < x1 + sw; x += sw) {
        g.strokeStyle = light; g.lineWidth = Math.max(1.5, sw * 0.07);
        g.beginPath(); g.arc(x, y - sh * 0.18, sw * 0.36, 0.35, Math.PI - 0.35); g.stroke();
        g.strokeStyle = dark; g.lineWidth = Math.max(2, sw * 0.11);
        g.beginPath(); g.arc(x, y, sw / 2, 0.1, Math.PI - 0.1); g.stroke();
      }
    }
    g.restore();
  }
  function grainSprig(g, x, y, s, color, ang, leaf) { // rice ear with a couple of long leaves
    g.save(); g.translate(x, y); g.rotate(ang || 0);
    if (leaf) {
      g.fillStyle = leaf;
      [[-1, 0.9], [1, 0.7]].forEach(([k, l]) => {
        g.beginPath(); g.moveTo(0, 0);
        g.quadraticCurveTo(k * s * 0.35, -s * 0.25 * l, k * s * 0.48, -s * 0.62 * l);
        g.quadraticCurveTo(k * s * 0.2, -s * 0.3 * l, 0, -s * 0.05); g.fill();
      });
    }
    g.strokeStyle = color; g.fillStyle = color; g.lineCap = 'round'; g.lineWidth = Math.max(2, s * 0.045);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.05, -s * 0.5, s * 0.2, -s * 0.98); g.stroke();
    for (let i = 0; i < 7; i++) {
      const t = 0.45 + i * 0.075, px = s * (0.05 + 0.15 * (t - 0.45) / 0.5), py = -s * t;
      [-1, 1].forEach(k => { g.beginPath(); g.ellipse(px + k * s * 0.055, py, s * 0.04, s * 0.075, k * 0.6 + 0.25, 0, Math.PI * 2); g.fill(); });
    }
    g.beginPath(); g.ellipse(s * 0.19, -s * 1.0, s * 0.035, s * 0.07, 0.3, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function goldLeaf(g, x, y, s, color, vein, ang) { // pointed leaf with side veins (skirt / boots)
    g.save(); g.translate(x, y); g.rotate(ang || 0); g.fillStyle = color;
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(s * 0.5, -s * 0.15, s * 0.45, -s * 0.7, 0, -s);
    g.bezierCurveTo(-s * 0.45, -s * 0.7, -s * 0.5, -s * 0.15, 0, 0); g.fill();
    g.strokeStyle = vein; g.lineWidth = Math.max(1.5, s * 0.05); g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -s * 0.05); g.lineTo(0, -s * 0.85); g.stroke();
    [0.3, 0.5, 0.7].forEach(t => [-1, 1].forEach(k => { g.beginPath(); g.moveTo(0, -s * t); g.lineTo(k * s * 0.22, -s * (t + 0.12)); g.stroke(); }));
    g.restore();
  }
  function swirl(g, x, y, s, color, lw) { // wind curl (風渦)
    g.save(); g.translate(x, y); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2.4, r = s * (0.08 + 0.32 * i / 60); const px = Math.cos(a + Math.PI) * r, py = Math.sin(a + Math.PI) * r * 0.75; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.lineTo(s * 1.3, s * 0.12); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.9, s * 0.42); g.quadraticCurveTo(0, s * 0.6, s * 1.1, s * 0.4); g.stroke();
    g.restore();
  }

  NEKO.run({
    meta: {
      id: '13', term: '立秋', title: '立秋・立秋將軍', seal: '秋',
      eyebrow: '二〇二七節氣貓 · 13 立秋 · 賓士貓',
      aria: '戴黑色圓盔、插米白盔纓，披紅披風、穿魚鱗甲與米白戰裙，畫面左爪高舉稻穗軍旗、畫面右爪握稻穗寬刃刀的黑白賓士貓將軍 3D 模型'
    },
    theme: { accent: '#A0482C', accentDark: '#E9B08F', glow: 'rgba(234, 188, 106, 0.32)', glowColor: '#F2CE86' },
    palette: [['#61554D', '炭黑'], ['#C9714D', '楓紅'], ['#88825B', '橄欖綠'], ['#ECC076', '稻穗金']],
    spec: [['品種', '賓士貓'], ['角色', '立秋將軍'], ['頭身比', '約 1 : 1.6']],
    seed: 1313,

    action: {
      label: '揮旗', dur: 2.2,
      run(s, p, K) {
        if (K.__flag) K.__flag.rotation.z = -0.3 * s * Math.sin(p * Math.PI * 4);
        if (K.__sword) K.__sword.rotation.z = SWORD_ROT + 0.18 * s;
        K.character.position.y = 0.04 * s;
      }
    },

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR, low: FUR, deep: M('#4E433C'), cream: WHITE,
        ink: INK, creamInk: WHITE_INK, pattern: 'none', mask: false, noise: false,
        paintBase(g, P) {
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.6, FUR); vg.addColorStop(1, FUR);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // soft long-hair streaks
          for (let i = 0; i < 700; i++) {
            const x = P.rand() * 1024, y = P.rand() * 512;
            g.strokeStyle = i % 2 ? 'rgba(130,116,106,0.18)' : 'rgba(40,32,28,0.18)'; g.lineWidth = 2 + (i % 3);
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + (i % 5 - 2) * 2, y + 14 + (i % 7) * 2); g.stroke();
          }
          // white jaw / throat underside (joins the white blaze painted in build)
          g.filter = 'blur(6px)'; g.fillStyle = WHITE; g.beginPath();
          [[-50, -90], [-55, -64], [-40, -58], [0, -56], [40, -58], [55, -64], [50, -90]]
            .forEach(([lo, la], i) => { const [x, y] = P.xy(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill(); g.filter = 'none';
        }
      },
      head: { y: 3.25, neck: 2.5, w: 0.87, h: 0.79, d: 0.8, cheek: 0.2, ruff: 0.05, ruffFreq: 15, chinDrop: 0.03,
        deform: (p, o) => { if (o.y > 0) { const k = 1 - 0.13 * Math.pow(o.y, 1.2); p.x *= k; p.z *= 1 - 0.05 * o.y; } },
        fur: { layers: 16, length: 0.038, gravity: 0.015, repeat: [9, 5] } },
      eyes: { x: 0.34, y: -0.1, r: 0.118, sx: 0.9, sy: 1.1, sz: 0.42, color: '#3E2A20', iris: '#4F3526', pupil: '#2A1B14', pupilR: 0.62, shine: 0.7 },
      nose: { y: -0.175, color: NOSE, size: 0.85 },
      muzzle: { y: -0.285, size: 0.5, color: WHITE },
      mouth: { type: 'w', color: '#4B3226', y: -0.245, w: 0.14, depth: 0.07 },
      blush: { color: 'rgba(242,150,142,0.9)', x: 0.49, y: -0.3, r: 30 },
      brows: { color: '#9A8F88', x: 0.33, y: 0.2, len: 0.15, angle: 0.3, r: 0.007 },
      whiskers: { color: '#F4EEE8', n: 3, len: 0.42, r: 0.006, y: -0.26, x: 0.42, spread: 0.075, droop: 0.02, curve: 0.04 },
      ears: { x: 0.7, y: 0.4, z: -0.04, tilt: 0.34, yaw: 0.22, pitch: -0.05, size: [0.54, 0.68, 0.18], sharp: 0.96, tuftScale: 1.5, L: { x: 0.68, tilt: 0.2 }, R: { x: 0.74, y: 0.3, tilt: 0.44 },
        color: FUR, inner: EAR_PINK, tuft: WHITE, fur: { layers: 10, length: 0.03, gravity: 0.008, repeat: [3, 3] } },
      bib: { color: WHITE, balls: [[0, 2.46, 0.32, 0.15], [0.13, 2.43, 0.3, 0.1], [-0.13, 2.43, 0.3, 0.1]],
        fur: { layers: 12, length: 0.04, gravity: 0.02, repeat: [3, 2] } },
      robe: {
        profile: [[1.08, 0.64], [1.05, 0.72], [0.94, 0.96], [0.79, 1.3], [0.66, 1.6], [0.6, 1.82], [0.56, 2.1], [0.47, 2.36], [0.14, 2.58]],
        color: '#FFFFFF', ink: BROWN_INK, lining: M('#E9D6B6', 1.2), hemY: 0.75,
        paint(g, w, h, D) { D.fill(g, SKIRT); }
      },
      collar: false,
      arms: {
        // path = shoulder → elbow → wrist (cuff opening); sleeves are built in build()
        L: { hand: HAND_L, path: [[-0.44, 2.28, 0.05], [-1.06, 1.98, 0.28], [HAND_L[0] - 0.02, 2.66, HAND_L[2] - 0.08]], pawScale: 1.75, wrist: false },
        R: { hand: HAND_R, path: [[0.44, 2.28, 0.05], [0.8, 1.54, 0.22], [1.04, 1.8, 0.4]], pawScale: 1.42, wrist: false }
      },
      sleeves: false,
      paws: { color: WHITE, ink: WHITE_INK },
      belt: { yT: 1.82, yB: 1.61, color: BELT, line: GOLD, knot: false, tassel: false, ink: GOLD_INK },
      legs: false,
      feet: false,
      cape: { color: CAPE, y0: 2.4, y1: 1.1, off: 0.1, open: 170, flare: 0.32, lining: CAPE_DK, trim: GOLD, trimR: 0.024, ink: CAPE_INK,
        paint(g, w, h) { const lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, M('#B8633F')); lg.addColorStop(1, CAPE); g.fillStyle = lg; g.fillRect(0, 0, w, h); } },
      tail: {
        pts: [[0.35, 0.8, -0.5], [0.85, 0.6, -0.55], [1.28, 0.57, -0.36], [1.62, 0.68, -0.18], [1.84, 0.93, -0.08], [1.82, 1.18, -0.04], [1.64, 1.34, -0.02]],
        r: 0.35, color: FUR, ink: INK,
        shape: t => (0.72 + 0.28 * Math.sin(Math.min(t / 0.5, 1) * Math.PI / 2)) * (t > 0.62 ? Math.pow(Math.cos((t - 0.62) / 0.38 * Math.PI / 2), 0.62) : 1),
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, FUR); lg.addColorStop(0.7, FUR); lg.addColorStop(0.76, WHITE); lg.addColorStop(1, WHITE);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
        },
        fur: { layers: 14, length: 0.045, gravity: 0.012, repeat: [14, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, roundBox, extrude, tube, ribbon, lathe, medal, D } = K;
      const DS = THREE.DoubleSide, UP = V(0, 1, 0);
      const HY = K.cfg.head.y;
      const goldM = std(GOLD, { roughness: 0.45, metalness: 0.15 }), goldDkM = std(GOLD_DK, { roughness: 0.5, metalness: 0.1 });
      const orient = (m, dir) => { m.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); return m; };

      /* ---------------- tuxedo face: white blaze + white lower face ---------------- */
      {
        const g = K.headTex.image.getContext('2d');
        const uvp = (px, py) => { const s = K.onSkin(X(px), Y(py), [K.headMesh]); return s.uv ? [s.uv.x * 1024, (1 - s.uv.y) * 512] : null; };
        // outline of the white area measured on the picture: blaze tip between the ears, widening between
        // the eyes, then the whole lower face below the eye line (cheek boundary at x ≈ 145 / 298)
        // boundary from the image-left cheek up to the blaze tip and down to the image-right cheek; the polygon is
        // closed straight down to the bottom of the map so the whole chin / throat underside stays white
        const blaze = [[147, 282], [145, 266], [147, 251], [155, 240], [166, 234], [181, 233], [192, 229], [198, 219], [204, 210], [210, 201], [216, 190], [221, 179],
          [224, 178], [228, 190], [234, 201], [240, 210], [246, 219], [252, 230], [262, 234], [276, 235], [289, 240], [296, 251], [298, 266], [296, 282]];
        const pts = blaze.map(([x, y]) => uvp(x, y)).filter(Boolean);
        g.save(); g.filter = 'blur(2.5px)'; g.fillStyle = WHITE; g.beginPath();
        pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
        const last = pts[pts.length - 1], first = pts[0];
        g.lineTo(last[0] + 6, 512); g.lineTo(first[0] - 6, 512); g.closePath(); g.fill();
        g.restore();
        K.headTex.needsUpdate = true;
        K.headMesh.material.emissive = new THREE.Color(0.28, 0.28, 0.28); K.headMesh.material.emissiveMap = K.headTex; K.headMesh.material.needsUpdate = true;
      }

      /* ---------------- long-hair tufts: black cheek spikes, white chin fluff ---------------- */
      const edgeX = (y) => { let lo = 0, hi = 1.6; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; } return lo; };
      const lock = (parent, root, dir, len, r0, mat, ink, bend) => {
        const d = V(dir[0], dir[1], dir[2]).normalize(), a = V(root[0], root[1], root[2]);
        const b = a.clone().addScaledVector(d, len * 0.55).add(V(0, bend * len, 0)), c = a.clone().addScaledVector(d, len);
        return mesh(tube([a, b, c], t => r0 * (1 - Math.pow(t, 1.25)) + 0.004, 18, 10), mat, parent, null, null, ink);
      };
      {
        const furM = std(FUR, { roughness: 0.95 }), whM = std(WHITE, { roughness: 0.95 });
        [-1, 1].forEach(sx => {
          [[0.36, -35, 0.1, 0.055], [0.2, -15, 0.13, 0.065], [0.04, 5, 0.15, 0.075], [-0.12, 18, 0.17, 0.08], [-0.28, 30, 0.17, 0.08], [-0.44, 45, 0.15, 0.075], [-0.58, 60, 0.12, 0.065]]
            .forEach(([yr, ang, len, r0], i) => {
              const y = HY + yr, ex = edgeX(y), a = ang * Math.PI / 180, zz = [0.05, -0.1, 0.08, -0.08, 0.06, -0.06, 0.04][i];
              lock(K.faceG, [sx * (ex - 0.07), y, zz], [sx * Math.cos(a), -Math.sin(a), zz * 0.6], len, r0, furM, INK, -0.08);
            });
          // chin fluff over the collar
          [[0.14, 0.0], [0.34, 0.12]].forEach(([x, dz]) => {
            const p = K.onSkin(sx * x, HY - 0.7, [K.headMesh]).p;
            lock(K.faceG, [p.x, p.y + 0.02, p.z - 0.06 - dz], [sx * 0.25, -1, 0.35], 0.14, 0.06, whM, WHITE_INK, 0);
          });
        });
        const p0 = K.onSkin(0, HY - 0.72, [K.headMesh]).p;
        lock(K.faceG, [0, p0.y + 0.02, p0.z - 0.06], [0, -1, 0.4], 0.13, 0.06, whM, WHITE_INK, 0);
      }

      /* ---------------- black round helmet with gold trims, leaf badge and plume ---------------- */
      const helm = part('helmet', K.head);
      helm.position.set(0, 3.9, -0.03);
      {
        const hatM = std(HAT, { roughness: 0.6 });
        mesh(new THREE.CylinderGeometry(0.41, 0.445, 0.27, 64), hatM, helm, [0, 0.135, 0], null, HAT_INK);
        mesh(new THREE.CylinderGeometry(0.34, 0.41, 0.02, 64), hatM, helm, [0, 0.278, 0]);
        const dome = new THREE.SphereGeometry(0.335, 56, 22, 0, Math.PI * 2, 0, Math.PI / 2);
        mesh(dome, hatM, helm, [0, 0.28, 0], [1, 0.9, 1], HAT_INK);
        [[0.448, 0.032, 0.02], [0.405, 0.024, 0.275]].forEach(([r, tr, y]) => { const t = mesh(new THREE.TorusGeometry(r, tr, 10, 72), goldM, helm, [0, y, 0]); t.rotation.x = Math.PI / 2; });
        mesh(new THREE.CylinderGeometry(0.08, 0.095, 0.07, 32), goldM, helm, [0.08, 0.585, 0], null, GOLD_INK);
        [-40, 40, -115, 115, 180].forEach(a => {
          const ar = a * Math.PI / 180, pts = [];
          for (let i = 0; i <= 10; i++) { const ph = lerp(0.3, 1.52, i / 10); pts.push(V(0.339 * Math.sin(ph) * Math.sin(ar), 0.28 + 0.305 * Math.cos(ph), 0.339 * Math.sin(ph) * Math.cos(ar))); }
          mesh(tube(pts, 0.017, 24, 6), goldM, helm);
        });
        // three-leaf gold badge on the front
        const leafSh = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(w * 0.95, L * 0.18, w * 0.8, L * 0.72, 0, L); s.bezierCurveTo(-w * 0.8, L * 0.72, -w * 0.95, L * 0.18, 0, 0); return s; };
        const em = group(helm, [0, 0.035, 0.44], [-0.14, 0, 0]);
        mesh(extrude(leafSh(0.34, 0.13), 0.05, 0.016), goldM, em, null, null, GOLD_INK);
        [-1, 1].forEach(k => { const l = mesh(extrude(leafSh(0.21, 0.1), 0.045, 0.014), goldM, em, [0.015 * k, 0.03, -0.012], null, GOLD_INK); l.rotation.z = -k * 1.0; });
        mesh(tube([[0, 0.05, 0.03], [0.004, 0.18, 0.034], [0, 0.29, 0.03]], 0.008, 12, 6), goldDkM, em);
        [0.1, 0.17].forEach(y => [-1, 1].forEach(k => mesh(tube([[0, y, 0.032], [0.035 * k, y + 0.04, 0.03]], 0.006, 4, 5), goldDkM, em)));
        // red knot + plume (a lofted brush: spine rises from the knot, bulges into a round lobe and sweeps to image-right)
        mesh(sphere(0.078, 24, 16), std(KNOT, { roughness: 0.7 }), helm, [0.18, 0.64, 0.07], null, RED_INK);
        // the plume: its outline traced from the picture (px → hat-local), extruded into a soft cushion
        const PX = (px, py) => [(px - 222) * S, (525 - py) * S - 3.9];
        const plumePx = [[241, 90], [228, 87], [217, 81], [212, 73], [214, 63], [222, 55], [232, 51], [243, 50], [252, 47], [259, 46], [258, 51], [266, 55], [276, 60],
          [286, 67], [296, 76], [304, 85], [309, 93], [301, 96], [297, 99], [300, 106], [301, 111], [292, 107], [283, 106], [276, 110], [268, 115], [264, 107], [256, 101], [248, 96]];
        const TIPS = [9, 16, 20, 24];   // indices of pointed feather tips (kept sharp)
        const cx = plumePx.reduce((a, [x]) => a + x, 0) / plumePx.length, cy = plumePx.reduce((a, [, y]) => a + y, 0) / plumePx.length;
        const pl2 = plumePx.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy); return PX(x - (x - cx) / d * 5.5, y - (y - cy) / d * 5.5); });
        const bb = pl2.reduce((m, [x, y]) => [Math.min(m[0], x), Math.min(m[1], y), Math.max(m[2], x), Math.max(m[3], y)], [9, 9, -9, -9]);
        const plShape = new THREE.Shape(); plShape.moveTo(pl2[0][0], pl2[0][1]);
        { let run = []; for (let i = 1; i <= pl2.length; i++) { const q = pl2[i % pl2.length]; run.push(new THREE.Vector2(q[0], q[1])); if (TIPS.includes(i) || i === pl2.length) { plShape.splineThru(run); run = []; } } }
        const plTex = canvasTex(512, 512, (g, w, h) => {
          const U = x => (x - bb[0]) / (bb[2] - bb[0]) * w, Vv = y => (1 - (y - bb[1]) / (bb[3] - bb[1])) * h;
          const rg = g.createRadialGradient(U(0.12), Vv(0.9), 10, U(0.3), Vv(0.8), w * 0.95);
          rg.addColorStop(0, M('#FFF6E6', 1.3)); rg.addColorStop(0.25, PLUME); rg.addColorStop(0.7, PLUME); rg.addColorStop(1, PLUME_GOLD);
          g.fillStyle = rg; g.fillRect(0, 0, w, h);
          g.lineCap = 'round';
          // strands fanning from the knot to every feather tip
          const K0 = [0.18, 0.66];
          [[[0.0, 0.98], [0.3, 1.1], [0.37, 1.12]], [[0.1, 0.95], [0.5, 1.0], [0.88, 0.66]], [[0.2, 0.86], [0.6, 0.85], [0.8, 0.5]], [[0.28, 0.76], [0.5, 0.62], [0.5, 0.44]],
           [[-0.04, 0.84], [0.1, 1.04], [0.24, 1.08]], [[0.3, 0.9], [0.62, 0.9], [0.84, 0.6]], [[0.34, 0.72], [0.62, 0.7], [0.66, 0.5]]].forEach(([c1, c2, e], i) => {
            g.strokeStyle = i < 4 ? 'rgba(208,160,92,0.55)' : 'rgba(255,255,255,0.55)'; g.lineWidth = i < 4 ? 7 : 6;
            g.beginPath(); g.moveTo(U(K0[0]), Vv(K0[1])); g.bezierCurveTo(U(c1[0]), Vv(c1[1]), U(c2[0]), Vv(c2[1]), U(e[0]), Vv(e[1])); g.stroke();
          });
        });
        plTex.repeat.set(1 / (bb[2] - bb[0]), 1 / (bb[3] - bb[1])); plTex.offset.set(-bb[0] / (bb[2] - bb[0]), -bb[1] / (bb[3] - bb[1]));
        const plGeo = extrude(plShape, 0.3, 0.06, 6, 24);
        mesh(plGeo, [texMat(plTex, { roughness: 0.95 }), std(PLUME, { roughness: 0.95 })], helm, [0, 0, -0.02], null, PLUME_INK);
        // red streamer from the knot, flowing behind the image-right ear
        mesh(ribbon([[0.18, 0.62, -0.02], [0.42, 0.52, -0.2], [0.75, 0.3, -0.3], [1.0, 0.05, -0.3], [1.18, -0.2, -0.24], [1.26, -0.42, -0.18]], t => 0.12 - 0.02 * t, { face: [0, 0.3, 1], twist: t => 0.3 * Math.sin(t * 3) }),
          std(KNOT, { side: DS, roughness: 0.8 }), helm);
      }

      /* ---------------- armour: pauldrons, studs, cape collar, green scarf ---------------- */
      const armor = part('armor', K.body);
      {
        const scaleTex = (motif) => canvasTex(1024, 512, (g, w, h) => {
          scales(g, 0, 0, w, h, 60, 40, SCALE, SCALE_DK, SCALE_LT);
          if (motif) grainSprig(g, 256, 330, 230, GOLD, 1.35, null);
        });
        const pad = (sx, motif) => {
          const pg = group(armor, [0.5 * sx, 2.17, 0.0]);
          pg.quaternion.setFromUnitVectors(UP, V(0.66 * sx, 0.7, 0.38).normalize());
          const th = 1.0, r = motif ? 0.44 : 0.39;
          mesh(new THREE.SphereGeometry(r, 48, 16, 0, Math.PI * 2, 0, th), texMat(scaleTex(motif), { side: DS, roughness: 0.75 }), pg, null, null, BROWN_INK);
          const rim = (tt, rr) => { const pts = []; for (let i = 0; i < 64; i++) { const ph = i / 64 * Math.PI * 2; pts.push(V(-rr * Math.cos(ph) * Math.sin(tt), rr * Math.cos(tt), rr * Math.sin(ph) * Math.sin(tt))); } return pts; };
          mesh(tube(rim(th, r + 0.01), 0.045, 128, 10, true), std(BORDER, { roughness: 0.75 }), pg, null, null, RED_INK);
          mesh(tube(rim(th - 0.13, r + 0.012), 0.016, 128, 6, true), goldM, pg);
        };
        pad(-1, false); pad(1, true);
        // sleeves: drooping cream upper sleeve + long olive cuff over the forearm
        const upTex = canvasTex(1024, 512, (g, w, h) => {
          g.fillStyle = CREAM; g.fillRect(0, 0, w, h);
          g.strokeStyle = 'rgba(200,160,115,0.35)'; g.lineWidth = 7; g.lineCap = 'round';
          [[560, 120, 700, 330], [640, 90, 820, 300], [760, 140, 900, 360]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2 + 30, (b + d) / 2, c, d); g.stroke(); });
        });
        // olive bell cuff: a rounded barrel around the forearm, its opening under the paw, two cream bands near the rim
        const bellProf = [[0.001, 0], [0.1, 0.012], [0.17, 0.05], [0.22, 0.13], [0.25, 0.26], [0.265, 0.4], [0.268, 0.52], [0.262, 0.6]];
        const bellL = (() => { let L = 0; for (let i = 1; i < bellProf.length; i++) L += Math.hypot(bellProf[i][0] - bellProf[i - 1][0], bellProf[i][1] - bellProf[i - 1][1]); return L; })();
        const cuffTex = canvasTex(256, 512, (g, w, h) => {
          g.fillStyle = CUFF; g.fillRect(0, 0, w, h);
          const row = d => d / bellL * h;           // distance below the rim → canvas row (top = rim)
          g.fillStyle = CREAM; g.fillRect(0, row(0.06), w, row(0.035)); g.fillRect(0, row(0.14), w, row(0.028));
          g.fillStyle = GREEN_LT; g.fillRect(0, 0, w, row(0.03));
          g.fillStyle = 'rgba(90,84,51,0.25)'; g.fillRect(0, row(0.4), w, h - row(0.4));
        });
        const cuffM = texMat(cuffTex, { roughness: 0.85 }), cuffIn = std(GREEN_DK, { side: THREE.BackSide, roughness: 0.9 });
        const cuffs = { L: { len: 0.6, s: 1 }, R: { len: 0.5, s: 0.95 } };
        [['L', -1], ['R', 1]].forEach(([k, sx]) => {
          const [Sp, Ep, Wp] = K.hands[k].path.points;
          const fore = Wp.clone().sub(Ep).normalize();
          const upPath = new THREE.CatmullRomCurve3([Sp, Sp.clone().lerp(Ep, 0.5).add(V(0.03 * sx, 0.02, 0.02)), Ep.clone().addScaledVector(fore, 0.1)]);
          const up = K.sleeveGeo(upPath, { drop: 0.45, width: 1.0 });
          mesh(up.geo, texMat(upTex, { side: DS, roughness: 0.9 }), armor, null, null, CREAM_INK);
          const cf = cuffs[k], L = Wp.distanceTo(Ep) + 0.08, sc = L / 0.6;
          const bg = group(armor, null); bg.position.copy(Wp).addScaledVector(fore, -L);
          bg.quaternion.setFromUnitVectors(UP, fore);
          const lg = K.lathe(bellProf.map(([r, y]) => [r * cf.s, y]), 48, 0, Math.PI * 2);
          const bell = mesh(lg.geo, cuffM, bg, null, [1, sc, 1], GREEN_INK);
          const inner = new THREE.Mesh(lg.geo, cuffIn); inner.scale.set(0.985, sc, 0.985); bg.add(inner);
          const rim = mesh(new THREE.TorusGeometry(0.262 * cf.s, 0.022, 8, 48), std(GREEN_DK, { roughness: 0.8 }), bg, [0, 0.6 * sc, 0]);
          rim.rotation.x = Math.PI / 2;
          // white forearm / wrist running from deep inside the bell out to the paw, so the paw grows out of the cuff
          const Hp = K.hands[k].p, root = bg.position.clone().addScaledVector(fore, 0.06 * sc);
          mesh(tube([root, root.clone().lerp(Wp, 0.6), Wp.clone().lerp(Hp, 0.55)], 0.1, 24, 16), std(WHITE, { roughness: 0.95 }), armor, null, null, WHITE_INK);
          void bell;
        });
        // gold studs at the shoulders
        [-1, 1].forEach(sx => mesh(sphere(0.065, 24, 16), goldM, armor, [0.33 * sx, 2.35, 0.4], null, GOLD_INK));
        // red stand-up cape collar behind the neck
        const cl = lathe([[0.42, 2.3], [0.44, 2.4], [0.41, 2.5]], 64, Math.PI * 0.28, Math.PI * 1.44, 12);
        mesh(cl.geo, std(CAPE, { side: DS, roughness: 0.8 }), armor, null, null, CAPE_INK);
        // green scarf: neck wrap, knot and two broad tails
        const scM = std(GREEN, { roughness: 0.85, side: DS });
        const wrap = [];
        for (let i = 0; i <= 40; i++) {
          const a = (i / 40) * Math.PI * 2, front = Math.pow(Math.max(0, Math.cos(a)), 3);
          const y = 2.46 - 0.18 * front, r = K.robeR(y) + 0.05;
          wrap.push(V(Math.sin(a) * r, y, Math.cos(a) * r));
        }
        mesh(tube(wrap.slice(0, -1), 0.055, 96, 10, true), scM, armor, null, null, GREEN_INK);
        const kz = K.robeR(2.27) + 0.1;
        mesh(sphere(0.1, 24, 16), scM, armor, [0, 2.26, kz], [1.35, 0.95, 0.75], GREEN_INK);
        [[-1, [[-0.04, 2.2], [-0.1, 2.04], [-0.17, 1.86]]], [1, [[0.04, 2.2], [0.11, 2.03], [0.19, 1.84]]]].forEach(([sx, pl]) => {
          const pts = pl.map(([x, y], i) => [x, y, Math.sqrt(Math.max(K.robeR(y) ** 2 - x * x, 0)) + (i ? 0.075 : 0.1)]);
          mesh(ribbon(pts, t => 0.19 + 0.07 * t, { face: [0, 0.2, 1] }), scM, armor, null, null, GREEN_INK);
        });
      }

      /* ---------------- cape wings: the red cape billows out behind both arms (image-left pushed out by the raised arm) ---------------- */
      {
        const capeG = K.part('cape', K.body);
        const capeM = std(CAPE, { side: DS, roughness: 0.85 }), liningM = std(M('#D1A170'), { roughness: 0.8 });
        const sheet = (A, B, n, m, bulge) => {
          const cA = K.curve3(A), cB = K.curve3(B), pos = [], uv = [], idx = [];
          for (let i = 0; i <= n; i++) {
            const t = i / n, a = cA.getPointAt(t), b = cB.getPointAt(t);
            for (let j = 0; j <= m; j++) { const u = j / m, q = a.clone().lerp(b, u); q.z -= bulge * Math.sin(Math.PI * u); pos.push(q.x, q.y, q.z); uv.push(u, 1 - t); }
          }
          for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const q = i * (m + 1) + j, r = q + m + 1; idx.push(q, r, q + 1, r, r + 1, q + 1); }
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
          g.setIndex(idx); g.computeVertexNormals();
          mesh(g, capeM, capeG);
          const outer = cA.getSpacedPoints(24).slice(5), bottom = [cA.getPointAt(1), cA.getPointAt(1).lerp(cB.getPointAt(1), 0.5).add(V(0, 0, -bulge)), cB.getPointAt(1)];
          mesh(tube(outer, 0.03, 48, 8), liningM, capeG, null, null, CAPE_INK);
          mesh(tube(bottom, 0.03, 16, 8), liningM, capeG, null, null, CAPE_INK);
        };
        sheet([[-0.46, 2.3, -0.12], [-0.95, 2.06, -0.12], [-1.28, 1.7, -0.14], [-1.43, 1.37, -0.12]],
              [[-0.4, 2.26, -0.22], [-0.62, 1.86, -0.38], [-0.84, 1.5, -0.44], [-1.0, 1.22, -0.42]], 20, 8, 0.13);
        sheet([[0.46, 2.3, -0.12], [0.88, 1.98, -0.12], [1.14, 1.45, -0.14], [1.29, 0.92, -0.12]],
              [[0.4, 2.26, -0.22], [0.62, 1.76, -0.4], [0.82, 1.26, -0.47], [0.95, 0.88, -0.47]], 24, 8, 0.13);
      }

      /* ---------------- chest armour and skirt painting on the robe ---------------- */
      {
        const tex = K.robeMesh.material.map, g = tex.image.getContext('2d'), rv = K.robeV;
        const yB = rv(1.84);
        scales(g, 0, 0, 1024, yB, 20, 14, SCALE, SCALE_DK, SCALE_LT);
        g.fillStyle = GOLD; g.fillRect(0, yB - 12, 1024, 12);
        [512 - 92, 512 + 92].forEach(x => g.fillRect(x - 6, rv(2.36), 12, yB - rv(2.36)));
        g.fillStyle = BORDER; g.fillRect(0, rv(0.73), 1024, 1024 - rv(0.73));
        g.fillStyle = GOLD; g.fillRect(0, rv(0.73) - 7, 1024, 7);
        tex.needsUpdate = true;
      }
      const skirt = part('skirt', K.body);
      {
        const border = (g, w, h, sides) => {
          const b = 66;
          g.fillStyle = BORDER;
          g.fillRect(0, h - b, w, b);
          if (sides.l) g.fillRect(0, 0, b, h);
          if (sides.r) g.fillRect(w - b, 0, b, h);
          g.fillStyle = GOLD; g.fillRect(sides.l ? b : 0, h - b - 10, w - (sides.l ? b : 0) - (sides.r ? b : 0), 10);
          if (sides.l) g.fillRect(b, 0, 10, h - b);
          if (sides.r) g.fillRect(w - b - 10, 0, 10, h - b);
        };
        const grass = M('#9EA36A');
        // image-left side panel: golden rice ear and green grass blades
        K.robePanel({ parent: skirt, y0: 0.68, y1: 1.62, center: -58, deg: 34, degB: 44, off: 0.07, bulge: 0.03, color: SKIRT, texW: 768, texH: 512, ink: BROWN_INK,
          paint(g, w, h) {
            g.strokeStyle = grass; g.lineCap = 'round';
            [[330, 440, 250, 290, 18], [380, 440, 400, 300, 15], [300, 440, 190, 350, 14], [420, 440, 500, 360, 12]].forEach(([x0, y0, x1, y1, lw]) => { g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 30, (y0 + y1) / 2, x1, y1); g.stroke(); });
            g.save(); g.scale(1, 0.8); grainSprig(g, 430, 300 / 0.8, 300, GOLD, 0.85, null); g.restore();
            goldLeaf(g, 600, 420, 80, GOLD, GOLD_DK, 0.6);
            border(g, w, h, { l: true, r: true });
          } });
        // image-right side panel: two gold leaves and green arcs
        K.robePanel({ parent: skirt, y0: 0.6, y1: 1.62, center: 58, deg: 34, degB: 44, off: 0.07, bulge: 0.03, color: SKIRT, texW: 768, texH: 512, ink: BROWN_INK,
          paint(g, w, h) {
            goldLeaf(g, 250, 300, 200, GOLD, GOLD_DK, 0.35);
            goldLeaf(g, 420, 190, 100, GOLD, GOLD_DK, -0.3);
            g.strokeStyle = grass; g.lineWidth = 15; g.lineCap = 'round';
            g.beginPath(); g.arc(360, 560, 200, Math.PI * 1.15, Math.PI * 1.55); g.stroke();
            g.beginPath(); g.arc(360, 580, 150, Math.PI * 1.15, Math.PI * 1.5); g.stroke();
            [[520, 330], [560, 250], [480, 260]].forEach(([x, y]) => { g.fillStyle = GOLD; g.beginPath(); g.ellipse(x, y, 10, 16, 0.4, 0, Math.PI * 2); g.fill(); });
            border(g, w, h, { l: true, r: true });
          } });
        // long centre front panel with a gold wind swirl
        K.robePanel({ parent: skirt, y0: 0.47, y1: 1.6, center: 0, deg: 20, degB: 22, off: 0.035, color: SKIRT, texW: 256, texH: 512, ink: CREAM_INK,
          paint(g, w, h) {
            swirl(g, 118, 420, 112, GOLD, 15);
            g.fillStyle = M('#E9D2B0', 1.2); g.fillRect(0, h - 10, w, 10);
          } });
      }

      /* ---------------- belt: gold grain medallion, red cord with beads and tassel, green sash ---------------- */
      {
        const bz = K.robeR(1.715) + 0.06;
        medal(K.beltG, [0, 1.715, bz], 0.185, (g) => {
          g.strokeStyle = GOLD_DK; g.lineWidth = 9; g.beginPath(); g.arc(128, 128, 100, 0, Math.PI * 2); g.stroke();
          [[128, 206, 146, 0], [120, 208, 92, -0.95], [136, 208, 92, 0.95]].forEach(([x, y, l, a]) => goldLeaf(g, x, y + 4, l + 10, GOLD_DK, GOLD_DK, a));
          [[122, 204, 80, -0.95], [134, 204, 80, 0.95], [128, 200, 130, 0]].forEach(([x, y, l, a]) => goldLeaf(g, x, y, l, GOLD_LT, GOLD_DK, a));
        }, GOLD, GOLD_INK, GOLD_LT);
        const rm = std(TASSEL, { roughness: 0.75 });
        const cz = (y) => K.robeR(y) + 0.15;
        // red cord: a loop under the medallion, two gold beads and a big red tassel over the green panel
        mesh(tube([[0.03, 1.6, bz + 0.03], [0.1, 1.54, cz(1.54) + 0.02], [0.17, 1.47, cz(1.47)], [0.15, 1.4, cz(1.4)], [0.15, 1.3, cz(1.3)]], 0.017, 32, 6), rm, K.beltG, null, null, RED_INK);
        mesh(tube([[0.03, 1.6, bz + 0.03], [0.1, 1.5, cz(1.5)], [0.15, 1.4, cz(1.4)]], 0.017, 16, 6), rm, K.beltG, null, null, RED_INK);
        mesh(sphere(0.05, 20, 14), goldM, K.beltG, [0.15, 1.32, cz(1.32)], null, GOLD_INK);
        mesh(sphere(0.045, 20, 14), goldM, K.beltG, [0.15, 1.21, cz(1.21)], null, GOLD_INK);
        mesh(tube([[0.15, 1.3, cz(1.3)], [0.15, 1.13, cz(1.13)]], 0.014, 6, 6), rm, K.beltG);
        K.tassel(K.beltG, [0.15, 1.13, cz(1.13)], TASSEL, 0.17, 0.06, RED_INK);
        // green sash: a draped band right under the belt and one broad panel hanging down the front centre
        K.robePanel({ parent: K.beltG, y0: 1.42, y1: 1.62, center: 0, deg: 58, degB: 52, off: 0.07, bulge: 0.02, color: GREEN, ink: GREEN_INK,
          paint(g, w, h) {
            g.fillStyle = GREEN_DK; g.fillRect(0, h - 40, w, 40);
            g.strokeStyle = GREEN_DK; g.lineWidth = 6; g.lineCap = 'round';
            [0.2, 0.36, 0.64, 0.8].forEach(f => { g.beginPath(); g.moveTo(w * f, 30); g.quadraticCurveTo(w * (f + 0.02), h * 0.5, w * (f - 0.01), h - 50); g.stroke(); });
          } });
        K.robePanel({ parent: K.beltG, y0: 0.95, y1: 1.5, center: 2, deg: 14, degB: 16, off: 0.1, bulge: 0.015, color: GREEN, ink: GREEN_INK,
          paint(g, w, h) {
            g.fillStyle = GREEN_DK; g.fillRect(0, h - 26, w, 26);
            g.fillStyle = GREEN_LT; g.fillRect(w * 0.06, 0, w * 0.1, h - 26);
            g.strokeStyle = GREEN_DK; g.lineWidth = 5; g.beginPath(); g.moveTo(w * 0.62, 0); g.lineTo(w * 0.6, h - 26); g.stroke();
          } });
      }

      /* ---------------- lantern trousers and boots ---------------- */
      const boots = part('boots', K.poseG);
      {
        const pantsM = std(PANTS, { roughness: 0.9 }), bootM = std(BOOT, { roughness: 0.75 }), soleM = std(SOLE, { roughness: 0.8 });
        const leafSh = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(w, L * 0.2, w * 0.8, L * 0.75, 0, L); s.bezierCurveTo(-w * 0.8, L * 0.75, -w, L * 0.2, 0, 0); return s; };
        [-1, 1].forEach(sx => {
          const bg = group(boots, [sx < 0 ? -0.55 : 0.6, 0, 0.12], [0, 0.14 * sx, 0]); bg.scale.setScalar(1.08);
          const pl = lathe([[0.2, 0.3], [0.29, 0.38], [0.33, 0.5], [0.31, 0.64], [0.24, 0.78]], 40);
          mesh(pl.geo, pantsM, bg, [0, 0, -0.05], null, BROWN_INK);
          mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.3, 40), bootM, bg, [0, 0.25, -0.03], null, BROWN_INK);
          const rim = mesh(new THREE.TorusGeometry(0.275, 0.035, 10, 48), std(GOLD_LT, { roughness: 0.55 }), bg, [0, 0.4, -0.03]); rim.rotation.x = Math.PI / 2;
          mesh(sphere(0.2, 32, 20), bootM, bg, [0, 0.15, 0.12], [1.5, 0.85, 1.45], BROWN_INK);
          mesh(sphere(0.2, 32, 16), soleM, bg, [0, 0.055, 0.1], [1.62, 0.32, 1.65], M('#9E8360'));
          mesh(roundBox(0.055, 0.2, 0.03, 0.02, 0.008), goldM, bg, [0, 0.3, 0.27], null, GOLD_INK);
          // gold leaf sprig lying on the toe cap (surface point at 35° up the ellipsoid, normal tilted 50°)
          const lfG = group(bg, [0, 0.245, 0.365], [-0.87, 0, 0]); lfG.scale.setScalar(1.35);
          mesh(extrude(leafSh(0.17, 0.075), 0.02, 0.007), goldM, lfG, [0, -0.02, 0], null, GOLD_INK);
          [-1, 1].forEach(k => { const s = mesh(extrude(leafSh(0.12, 0.05), 0.018, 0.006), goldM, lfG, [0.015 * k, -0.02, -0.004], null, GOLD_INK); s.rotation.set(0, 0, -0.95 * k); });
          // trouser leg: from inside the lantern cuff up under the skirt into the hip block
          const bx = sx < 0 ? -0.55 : 0.6;
          mesh(tube([[bx, 0.6, 0.07], [bx * 0.9, 0.86, 0.06], [bx * 0.72, 1.06, 0.03], [bx * 0.6, 1.16, 0.02]], 0.25, 24, 24), pantsM, boots, null, null, BROWN_INK);
        });
        // hip block filling the skirt shell (touches its inside wall): the legs disappear into it
        const yH = 1.12, hh = 0.16;
        mesh(new THREE.CylinderGeometry(K.robeR(yH + hh / 2) - 0.012, K.robeR(yH - hh / 2) - 0.012, hh, 64), pantsM, boots, [0, yH, 0]);
      }
      // the default tail-root ball sits deep inside the skirt touching nothing; the tail tube itself meets the robe
      {
        const tr = K.tailMesh.parent.children.find(c => c !== K.tailMesh && c.isMesh && c.geometry.type === 'SphereGeometry');
        if (tr) tr.parent.remove(tr);
      }

      /* ---------------- rice-ear war banner in the image-left paw ---------------- */
      const flagG = part('flag', K.body);
      {
        const HL = V(HAND_L[0], HAND_L[1], HAND_L[2]);
        flagG.position.copy(HL);
        const PL = (y) => { const p = poleAt(y); return V(p[0], p[1], p[2]).sub(HL); };
        const dir = V(POLE_T[0] - POLE_B[0], POLE_T[1] - POLE_B[1], POLE_T[2] - POLE_B[2]).normalize();
        const poleM = std(POLE, { roughness: 0.7 });
        mesh(tube([PL(Y(372)), PL(Y(60))], 0.05, 8, 14), poleM, flagG, null, null, POLE_INK);
        const band = (y, r, h) => orient(mesh(new THREE.CylinderGeometry(r, r, h, 24), goldM, flagG, PL(y), null, GOLD_INK), dir);
        band(Y(167), 0.062, 0.07); band(Y(372) + 0.03, 0.06, 0.07); band(Y(62), 0.07, 0.1);
        const tipGeo = new THREE.LatheGeometry([[0.0001, 0], [0.09, 0.05], [0.14, 0.16], [0.0001, 0.44]].map(p => new THREE.Vector2(p[0], p[1])), 4);
        orient(mesh(tipGeo, std(GOLD_LT, { roughness: 0.4, metalness: 0.2, flatShading: true }), flagG, PL(Y(55)), null, GOLD_INK), dir).rotateY(Math.PI / 4);
        orient(mesh(sphere(0.06, 16, 12), goldM, flagG, PL(Y(52)), null, GOLD_INK), dir);
        // cloth
        const NU = 24, NV = 12, fp = [], fuv = [], fidx = [];
        // pennant-like cloth: tall at the hoist (y 58–155 px), narrowing to the fly (y 96–128 px), the top edge bulging up
        const yH0 = Y(155), yH1 = Y(58), yF0 = Y(128), yF1 = Y(96);
        for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
          const s = i / NU, h = j / NV, yp = lerp(yH0, yH1, h), P = PL(yp).add(HL);
          const y = lerp(yp, lerp(yF0, yF1, h), Math.pow(s, 1.05)) + (0.02 + 0.03 * h) * Math.sin(Math.PI * s) + 0.04 * h * Math.sin(Math.PI * 2 * s) * (1 - s * 0.3);
          const x = P.x + 0.05 + s * 1.12;
          const z = P.z - 0.02 - s * 0.4 + 0.07 * Math.sin(Math.PI * 2 * s + 0.6) * s;
          fp.push(x - HL.x, y - HL.y, z - HL.z); fuv.push(s, h);
        }
        for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; fidx.push(a, a + 1, b, a + 1, b + 1, b); }
        const fgeo = new THREE.BufferGeometry();
        fgeo.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
        fgeo.setAttribute('uv', new THREE.Float32BufferAttribute(fuv, 2));
        fgeo.setIndex(fidx); fgeo.computeVertexNormals();
        const ftex = canvasTex(512, 256, (g, w, h) => {
          g.fillStyle = FLAG; g.fillRect(0, 0, w, h);
          // green grass blades rising from the lower hoist corner
          g.strokeStyle = M('#A7A673'); g.lineCap = 'round';
          [[70, 250, 250, 70, 18], [110, 250, 330, 120, 15], [90, 250, 200, 110, 12]].forEach(([x0, y0, x1, y1, lw]) => { g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 - 10, y1 + 60, x1, y1); g.stroke(); });
          // big golden rice ear
          g.save(); g.scale(1.8, 1); grainSprig(g, 34, 236, 200, M('#EBB957'), 0.3, null); g.restore();
          // red borders top / bottom / fly end, thin gold lines inside
          g.fillStyle = BORDER; g.fillRect(0, 0, w, 32); g.fillRect(0, h - 24, w, 24); g.fillRect(w - 30, 0, 30, h);
          g.fillStyle = GOLD; g.fillRect(0, 32, w - 30, 4); g.fillRect(0, h - 28, w - 30, 4);
          g.fillStyle = GOLD_LT; g.fillRect(w - 48, 36, 12, h - 62);
          g.strokeStyle = RED_INK; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
        });
        const cloth = mesh(fgeo, texMat(ftex, { side: DS, alphaTest: 0.5, roughness: 0.85 }), flagG);
        // red bow + streamers tied under the spear head
        const rbM = std(M('#C8704E'), { side: DS, roughness: 0.8 });
        const tie = PL(Y(76));
        [-1, 1].forEach(k => { const l = mesh(new THREE.TorusGeometry(0.07, 0.025, 8, 20), std(KNOT, { roughness: 0.8 }), flagG, tie.clone().add(V(-0.07 + k * 0.02, 0.04 * k, 0.03)), [1.3, 0.8, 0.5], RED_INK); l.rotation.z = 0.6 * k; });
        const w0 = V(X(30), Y(190), 0.1).sub(HL), w1 = V(X(65), Y(185), 0.22).sub(HL);
        const str1 = [tie, tie.clone().add(V(-0.3, -0.12, 0.02)), V(X(22), Y(112), 0.05).sub(HL), V(X(12), Y(150), 0.08).sub(HL), w0];
        const str2 = [tie, tie.clone().add(V(-0.14, -0.22, 0.08)), V(X(48), Y(125), 0.16).sub(HL), V(X(58), Y(160), 0.2).sub(HL), w1];
        const streamers = [str1, str2].map((pts, i) => mesh(ribbon(pts, t => ((i ? 0.19 : 0.22) - 0.03 * t) * Math.min(1, (1 - t) * 12), { face: [0, 0, 1], twist: t => 0.5 * Math.sin(t * 5 + i * 2) }), rbM, flagG));
        // gentle flutter
        const base = Float32Array.from(fp), pa = fgeo.attributes.position;
        K.onTick((t, k) => {
          for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
            const n = j * (NU + 1) + i, s = i / NU;
            pa.setXYZ(n, base[n * 3], base[n * 3 + 1] + 0.03 * s * Math.sin(t * 2.4 - s * 5) * k, base[n * 3 + 2] + 0.07 * s * Math.sin(t * 2.4 - s * 6 + j * 0.15) * k);
          }
          pa.needsUpdate = true; if (k) fgeo.computeVertexNormals();
          streamers.forEach((m, i) => { m.rotation.z = 0.05 * Math.sin(t * 1.7 + i) * k; });
        });
        K.__flag = flagG; void cloth;
      }

      /* ---------------- broad rice-ear sword in the image-right paw ---------------- */
      const sword = part('sword', K.body);
      {
        sword.position.set(HAND_R[0], HAND_R[1], HAND_R[2]);
        sword.rotation.set(0, 0, SWORD_ROT);
        const blade = [[-0.2, 0.52], [0.18, 0.52], [0.215, 1.2], [0.235, 1.75], [0.22, 1.94], [0.17, 2.07], [0.05, 2.04], [-0.08, 1.97], [-0.19, 1.85], [-0.235, 1.68], [-0.225, 1.2]];
        const bgeo = extrude(blade, 0.04, 0.014, 3, 8);
        const bx0 = -0.26, bw = 0.52, by0 = 0.5, bh = 1.66;
        const px = x => (x - bx0) / bw * 256, py = y => (1 - (y - by0) / bh) * 1024;
        const btex = canvasTex(256, 1024, (g, w, h) => {
          g.fillStyle = EDGE; g.fillRect(0, 0, w, h);
          const inner = blade.map(([x, y]) => [x * 0.74 + 0.01, 0.52 + (y - 0.52) * 0.965]);
          g.fillStyle = BLADE; g.beginPath(); inner.forEach(([x, y], i) => i ? g.lineTo(px(x), py(y)) : g.moveTo(px(x), py(y))); g.closePath(); g.fill();
          g.fillStyle = M('#C4B6AA', 1.25); g.beginPath(); g.moveTo(px(0.06), py(0.56)); g.lineTo(px(0.14), py(0.56)); g.lineTo(px(0.16), py(1.85)); g.lineTo(px(0.1), py(2.02)); g.lineTo(px(0.04), py(1.9)); g.closePath(); g.fill();
          g.strokeStyle = M('#A7773F'); g.lineWidth = 5; g.beginPath(); blade.forEach(([x, y], i) => i ? g.lineTo(px(x), py(y)) : g.moveTo(px(x), py(y))); g.closePath(); g.stroke();
          // green leaves + two golden rice ears along the blade
          g.fillStyle = M('#98A06A'); g.save(); g.translate(px(-0.02), py(0.62));
          [[-1, 1], [1, 0.8]].forEach(([k, l]) => { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(k * 50 * l, -130 * l, k * 30, -260 * l); g.quadraticCurveTo(k * 10, -120, 0, 0); g.fill(); });
          g.restore();
          g.save(); g.scale(1, 1.6); grainSprig(g, px(-0.03), py(0.66) / 1.6, 230, GOLD, 0.02, null); grainSprig(g, px(0.05), py(1.25) / 1.6, 150, GOLD, 0.18, null); g.restore();
        });
        btex.repeat.set(1 / bw, 1 / bh); btex.offset.set(-bx0 / bw, -by0 / bh);
        mesh(bgeo, [texMat(btex, { roughness: 0.35, metalness: 0.25 }), std(EDGE, { roughness: 0.3, metalness: 0.3 })], sword, [0, 0, 0.02], null, M('#8E7A68'));
        // gold cloud guard
        mesh(roundBox(0.3, 0.2, 0.13, 0.08, 0.03), goldM, sword, [0, 0.46, 0.02], null, GOLD_INK);
        [-1, 1].forEach(k => {
          const lobe = mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.12, 32), goldM, sword, [0.18 * k, 0.42, 0.02], null, GOLD_INK); lobe.rotation.x = Math.PI / 2;
          const sp = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI * 1.8, r = 0.085 * (1 - i / 36); sp.push(V(0.18 * k + Math.cos(a) * r * k, 0.42 + Math.sin(a) * r, 0.085)); }
          mesh(tube(sp, 0.011, 40, 6), goldDkM, sword);
        });
        mesh(roundBox(0.42, 0.07, 0.1, 0.03, 0.012), goldM, sword, [0, 0.56, 0.02], null, GOLD_INK);
        // grip + pommel
        mesh(tube([[0, 0.42, 0.02], [0, -0.22, 0.02]], 0.048, 6, 14), std(GRIP, { roughness: 0.8 }), sword, null, null, BROWN_INK);
        mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.04, 20), goldM, sword, [0, -0.225, 0.02], null, GOLD_INK);
        mesh(sphere(0.068, 24, 16), goldM, sword, [0, -0.29, 0.02], null, GOLD_INK);
        // red sword knot hanging from the guard
        sword.updateMatrix();
        const wp = V(0.2, 0.36, 0.05).applyMatrix4(sword.matrix);
        const rm = std(TASSEL, { roughness: 0.75 });
        const kn = group(K.body, [0, 0, 0]);
        mesh(tube([wp, V(1.41, 1.95, 0.56), V(X(352), Y(357) + 0.05, 0.56)], 0.015, 20, 6), rm, kn);
        mesh(sphere(0.05, 20, 14), goldM, kn, [X(352), Y(357), 0.56], null, GOLD_INK);
        mesh(sphere(0.045, 20, 14), goldM, kn, [X(355), Y(368), 0.56], null, GOLD_INK);
        mesh(tube([[X(352), Y(357), 0.56], [X(355), Y(368), 0.56], [X(358), Y(376), 0.56]], 0.014, 10, 6), rm, kn);
        K.tassel(kn, [X(358), Y(380), 0.56], TASSEL, 0.2, 0.05, RED_INK);
        K.__sword = sword;
        // the tassel belongs to the sword chip too
        sword.attach(kn);
      }

      /* ---------------- floating autumn decorations ---------------- */
      {
        const items = [];
        const ginkgo = (pos, s, color, rot) => {
          const g = group(K.decor, pos, [0.2, 0.3, rot]); g.scale.setScalar(s);
          const sh = new THREE.Shape(); sh.moveTo(0, 0);
          for (let i = 0; i <= 40; i++) {
            const a = (-62 + 124 * i / 40) * Math.PI / 180, notch = 1 - 0.28 * Math.exp(-Math.pow(a / 0.1, 2));
            const R = 0.3 * (1 + 0.05 * Math.sin(a * 22)) * notch;
            sh.lineTo(Math.sin(a) * R, 0.06 + Math.cos(a) * R);
          }
          sh.lineTo(0, 0);
          mesh(extrude(sh, 0.025, 0.008, 2, 8), std(color, { roughness: 0.7 }), g, null, null, GOLD_INK);
          mesh(tube([[0, 0.02, 0], [0.02, -0.12, 0], [0.06, -0.22, 0]], 0.012, 10, 5), std(GOLD_DK, { roughness: 0.7 }), g);
          items.push(g); return g;
        };
        ginkgo([-0.85, 5.15, 0.0], 0.9, M('#E9A04A'), -0.5);
        ginkgo([1.75, 4.1, 0.05], 0.85, M('#B7A04E'), 0.6);
        ginkgo([2.05, 2.05, 0.2], 1.0, M('#F0BD4E'), -0.3);
        // pointed orange leaf between the head and the blade
        {
          const g = group(K.decor, [1.3, 3.3, 0.15], [0.2, 0, -0.6]);
          const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.14, 0.05, 0.14, 0.24, 0, 0.36); sh.bezierCurveTo(-0.14, 0.24, -0.14, 0.05, 0, 0);
          mesh(extrude(sh, 0.025, 0.008, 2, 10), std(M('#E6A043'), { roughness: 0.7 }), g, null, null, GOLD_INK);
          items.push(g);
        }
        // rice sprig (left)
        {
          const g = group(K.decor, [-1.95, 2.45, -0.15], [0, 0.3, 0.25]);
          const stem = [[0, 0, 0], [0.05, 0.4, 0], [0.18, 0.75, 0], [0.38, 0.98, 0]];
          mesh(tube(stem, 0.018, 24, 6), std(M('#B2A461'), { roughness: 0.8 }), g);
          const cv = K.curve3(stem), gm = std(M('#EDBB55'), { roughness: 0.6 });
          for (let i = 0; i < 9; i++) {
            const t = 0.45 + i * 0.06, p = cv.getPointAt(t);
            [-1, 1].forEach(k => { const e = mesh(sphere(0.045, 12, 10), gm, g, [p.x + k * 0.05, p.y - 0.01, 0], [0.7, 1.3, 0.6], GOLD_INK); e.rotation.z = k * 0.6 - 0.4; });
          }
          [[-1, 0.2], [1, 0.3]].forEach(([k, y]) => mesh(ribbon([[0.03, y, 0], [0.18 * k, y + 0.2, 0.01], [0.3 * k, y + 0.46, 0]], t => 0.07 * (1 - t) + 0.01, { face: [0, 0, 1] }), std(M('#A6A76A'), { side: DS, roughness: 0.8 }), g));
          items.push(g);
        }
        // pampas grass clump (bottom left): feathery plumes painted on bent double-sided strips
        {
          const g = group(K.decor, [-0.3, 0, -0.35]);
          const featherTex = canvasTex(128, 512, (c, w, h) => {
            c.clearRect(0, 0, w, h); c.lineCap = 'round';
            const halfW = y => w * 0.46 * Math.sin(Math.PI * Math.min(0.98, (h - y) / h * 0.95 + 0.03));
            // soft body
            c.fillStyle = 'rgba(242,224,186,0.9)'; c.beginPath(); c.moveTo(w / 2, h);
            for (let y = h; y >= 0; y -= 8) c.lineTo(w / 2 + halfW(y) * 0.75, y);
            for (let y = 0; y <= h; y += 8) c.lineTo(w / 2 - halfW(y) * 0.75, y);
            c.fill();
            for (let i = 0; i < 320; i++) {
              const y = h * (0.03 + 0.95 * K.rand()), sd = i % 2 ? 1 : -1, lw = 3 + K.rand() * 3;
              const len = halfW(y) * (0.75 + 0.3 * K.rand());
              c.strokeStyle = i % 4 ? 'rgba(248,234,204,1)' : 'rgba(212,178,122,1)'; c.lineWidth = lw;
              c.beginPath(); c.moveTo(w / 2, y + 10); c.quadraticCurveTo(w / 2 + sd * len * 0.6, y - len * 0.15, w / 2 + sd * len, y - len * 0.6); c.stroke();
            }
            c.strokeStyle = 'rgba(196,160,104,1)'; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2, h); c.lineTo(w / 2, h * 0.03); c.stroke();
          });
          const fm = texMat(featherTex, { side: DS, alphaTest: 0.4, roughness: 1 }), sm = std(M('#C4B07A'), { roughness: 0.8 });
          [[[-1.1, 0.18], [-1.18, 0.85], [-1.45, 1.3], [-1.9, 1.48]], [[-1.02, 0.2], [-1.05, 0.7], [-1.3, 0.9], [-1.72, 0.78]], [[-1.2, 0.16], [-1.35, 0.6], [-1.62, 0.95], [-2.0, 1.02]]].forEach((pl, i) => {
            const pts = pl.map(([x, y], j) => V(x, y, 0.04 * i - 0.03 * j));
            mesh(tube(pts.slice(0, 2).concat([pts[1].clone().lerp(pts[2], 0.3)]), 0.014, 16, 6), sm, g);
            const cv = K.curve3([pts[1], pts[2], pts[3]]);
            mesh(ribbon(cv, t => 0.34 * Math.sin(Math.PI * Math.min(1, 0.12 + t)) + 0.02, { face: [0, 0, 1], segs: 32 }), fm, g);
          });
          [[-1.08, 1.05, 0.4], [-1.15, 0.8, -0.5], [-1.0, 0.7, 0.2]].forEach(([x, h, k]) => mesh(ribbon([[x, 0.1, 0.05], [x + k * 0.25, h * 0.6, 0.06], [x + k * 0.6, h, 0.05]], t => 0.06 * (1 - t) + 0.01, { face: [0, 0, 1] }), std(M('#A6A76A'), { side: DS, roughness: 0.8 }), g));
          items.push(g);
        }
        // cool-wind swirls (涼風至)
        const windM = std(M('#F2DBA8', 1.2), { roughness: 0.7 });
        const windSwirl = (pos, s, flip) => {
          const g = group(K.decor, pos); g.scale.set(s * flip, s, s);
          const pts = [];
          for (let i = 0; i <= 44; i++) { const a = i / 44 * Math.PI * 2.6, r = 0.04 + 0.2 * (i / 44); pts.push([Math.cos(a + Math.PI) * r, Math.sin(a + Math.PI) * r, 0]); }
          pts.push([0.35, 0.02, 0], [0.7, 0.12, 0]);
          mesh(tube(pts, t => 0.05 * Math.sin(Math.PI * Math.min(1, 0.15 + 0.85 * t)) + 0.012, 90, 10), windM, g, null, null, M('#D8B77A'));
          items.push(g);
        };
        windSwirl([-2.0, 1.6, 0.15], 1.0, 1);
        windSwirl([1.6, 4.45, -0.3], 0.9, -1);
        // scattered golden grains
        [[-1.7, 3.45, 0.2], [-1.55, 2.2, 0.35], [1.95, 2.7, 0.1], [1.7, 1.55, 0.25], [2.25, 3.2, -0.1], [-2.2, 1.0, 0.1]].forEach((p, i) => {
          const g = group(K.decor, p, [0, 0, i * 0.8]);
          mesh(sphere(0.06, 16, 12), std(M('#F0C25E'), { roughness: 0.6 }), g, null, [0.7, 1.2, 0.6], GOLD_INK);
          items.push(g);
        });
        items.forEach(g => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.1 * Math.sin(t * 0.8 + i) * k;
        }));
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '守護秋收的立秋將軍',
        text: '立秋是秋天的第一個節氣，古時要「迎秋於西郊」、整軍練兵。這隻黑白賓士貓化身立秋將軍：戴黑盔、披紅披風，一手高舉稻穗軍旗、一手握稻穗寬刃刀，守護的不是城池而是快成熟的稻田。配色是銀杏金、楓紅與橄欖綠的秋日色調。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '賓士貓的倒 V 白臉',
        text: '炭黑色的蓬鬆長毛，額頭正中一道倒 V 字白紋夾在兩眼之間，眼睛以下整片轉白一路連到胸口，兩頰外側還翹著一排黑色尖毛。深咖啡圓眼、淡灰細眉、粉色小鼻和上揚的「ω」嘴，一臉自信；白鬍鬚在黑臉頰上格外明顯。' },
      helmet: { chip: '頭盔', tag: '服飾', name: '麥葉圓盔與盔纓', dir: [0.25, 0.3, 1],
        text: '黑色圓盔分成外擴的帽圈與較窄的圓頂，帽圈上下壓金線、圓頂有金色肋條。正面是一枚金色三葉麥葉徽；頂上紅結插著一大團米白盔纓，先往左上鼓成毛球，再往右掃出幾道尖尖的羽梢，後面還飄出一條紅緞帶。' },
      flag: { chip: '軍旗', tag: '道具', name: '稻穗軍旗', dir: [-0.5, 0.35, 1],
        text: '畫面左爪高舉長長的木色旗桿，頂端是金色菱形槍尖，桿上有金箍。米白旗面靠旗桿處最高、往外漸窄，上緣帶著波浪，四周鑲紅邊，畫著一大枝金黃稻穗與綠葉；桿頂綁著紅色蝴蝶結，兩條寬紅緞帶隨風飄向左下。' },
      sword: { chip: '寬刀', tag: '道具', name: '稻穗寬刃刀', dir: [0.6, 0.2, 1],
        text: '畫面右爪在腰側握著一把刀身寬直、刀尖斜切的暖銀色短刀，刀面刻著金黃稻穗與綠葉。護手是金色雲紋，握柄深棕、尾端一顆金珠露在爪下，護手旁垂著串金珠的紅色刀穗。' },
      armor: { chip: '盔甲', tag: '服飾', name: '魚鱗甲、肩甲與綠領巾',
        text: '胸前是暖深棕的細魚鱗甲，左右各一道金線；兩肩的圓弧肩甲鑲紅橙寬邊與金線，畫面右的肩甲上還有一枝金色稻穗，靠領口各一顆金釘。橄欖綠領巾在胸口打結、垂下兩片布尾；米白寬袖的前臂套著鐘形綠袖口，開口處有兩道米白條紋。' },
      cape: { chip: '披風', tag: '服飾', name: '楓紅披風', dir: [0.4, 0.2, -1],
        text: '磚紅色的披風從兩肩往後垂，被舉旗的手臂撐得往外張開。從正面看得到兩側的紅色披風和黃褐色內裡滾邊，背後則整片蓋住，下緣收一道金邊。' },
      belt: { chip: '腰帶', tag: '服飾', name: '麥葉金扣腰帶',
        text: '紅色寬腰帶上下壓金線，正中一枚大金圓扣刻著三葉麥葉。腰帶下繫一圈橄欖綠腰巾，正中垂下一片寬綠布；金扣下吊著紅繩、兩顆金珠和一束紅流蘇。' },
      skirt: { chip: '戰裙', tag: '服飾', name: '三片式米白戰裙',
        text: '腰下分成三片米白戰裙：左右兩片鑲紅橙寬邊與金線，畫面左繡金色稻穗和綠色芒草，畫面右繡金葉、綠弧線和穀粒；中間最長的前片繡著一道金色風渦，象徵立秋的「涼風至」。' },
      boots: { chip: '戰靴', tag: '服飾', name: '燈籠褲與麥葉短靴', dir: [0.3, 0.1, 1],
        text: '戰裙下露出深棕燈籠褲，腳穿深棕短靴：靴口一圈淡金、正面一道金條，靴頭繡著金色麥葉，底下是米色厚底，站得又穩又帥氣。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '白尖蓬鬆大尾巴', dir: [1, 0.25, -0.6],
        text: '又粗又蓬的黑色長尾巴從右後方橫伸出來，末端約三成變成白色大毛球並往上捲起，和白色的前爪、白臉一起構成賓士貓的招牌配色。' }
    },
    order: ['overview', 'face', 'helmet', 'flag', 'sword', 'armor', 'cape', 'belt', 'skirt', 'boots', 'tail']
  });
})();
