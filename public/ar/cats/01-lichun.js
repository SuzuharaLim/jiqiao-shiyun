// @file 01_立春_橘色緬因貓
// @title 立春・萌芽神農官 | 二十四節氣貓
(function () {
  // Colours are SAMPLED from refs/01.png (tools/colors.py). def.exposure (linear tone mapping) dims the
  // lights so they render close to the picture; M(hex, f) applies an optional per-colour correction
  // (f > 1 darkens, f < 1 brightens) on top of that.
  const EXPOSURE = 0.76;
  // pale lower face (lon, lat on the head map): cream only under the eyes and around the muzzle, the orange
  // forehead reaches down between the eyes, the cream widens into the chest ruff below the cheeks
  const MASK_HALF = [[0, 3], [6, 5], [9, 12], [13, 17], [18, 17], [22, 12], [25, 4], [26, -5], [28, -12], [36, -20], [52, -30], [72, -44], [86, -65], [88, -90]];
  const MASK = MASK_HALF.concat(MASK_HALF.slice().reverse().map(([lo, la]) => [-lo, la]));
  const SST = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  function M(hex, f) {
    f = f || 1; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f, 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  // ---- colours sampled from refs/01.png (then compensated) ----
  const FUR = M('#FABE6F'), FUR_TOP = M('#F7A854'), FUR_MID = M('#FAB965'), FUR_LOW = M('#FBC479');
  const STRIPE = M('#F2923C'), CREAM = M('#FCF4E6'), INK = '#C97C3E', CREAM_INK = '#D9AE88';
  const ROBE = M('#F8EFDC'), SAGE = M('#B3B578'), SAGE_LT = M('#C4C78F'), SAGE_DK = M('#9C9B5C'), SAGE_INK = '#7E8045';
  const COLLAR = M('#E1D89B'), LEAF = M('#A7AE67'), GOLD_DK = M('#D9A441'), GOLD_INK = '#B08A3A';

  // 3-leaf sprig as drawn on the sleeves, crown and tablet: curved stem, a left leaf, a higher right leaf, a tip leaf
  function sprig(D, g, x, y, s, color, ang) {
    g.save(); g.translate(x, y); g.rotate(ang || 0);
    g.strokeStyle = color; g.lineCap = 'round'; g.lineWidth = Math.max(2, s * 0.075);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.08, -s * 0.45, s * 0.02, -s * 0.8); g.stroke();
    const leaf = (lx, ly, L, a) => {   // plump rounded leaf
      g.save(); g.translate(lx, ly); g.rotate(a); g.fillStyle = color; g.beginPath(); g.moveTo(0, 0);
      g.bezierCurveTo(L * 0.44, -L * 0.18, L * 0.38, -L * 0.86, 0, -L); g.bezierCurveTo(-L * 0.38, -L * 0.86, -L * 0.44, -L * 0.18, 0, 0); g.fill(); g.restore();
    };
    void D;
    leaf(s * 0.03, -s * 0.36, s * 0.34, -1.1);
    leaf(s * 0.06, -s * 0.56, s * 0.34, 1.15);
    leaf(s * 0.02, -s * 0.76, s * 0.28, -0.3);
    g.restore();
  }
  // two-leaf seedling with round leaves (apron, robe skirt, medallion)
  function seedling(g, x, y, s, color) {
    g.save(); g.translate(x, y); g.fillStyle = color; g.strokeStyle = color; g.lineCap = 'round';
    g.lineWidth = Math.max(2, s * 0.09);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.04, -s * 0.35, 0, -s * 0.6); g.stroke();
    [-1, 1].forEach(k => {
      g.save(); g.translate(0, -s * 0.6); g.rotate(-k * 0.5);
      g.beginPath(); g.moveTo(0, 0);
      g.bezierCurveTo(k * s * 0.12, -s * 0.28, k * s * 0.5, -s * 0.34, k * s * 0.5, -s * 0.12);
      g.bezierCurveTo(k * s * 0.5, s * 0.02, k * s * 0.2, s * 0.04, 0, 0); g.fill();
      g.restore();
    });
    g.restore();
  }

  NEKO.run({
    meta: {
      id: '01', term: '立春', title: '立春・萌芽神農官', seal: '春',
      eyebrow: '二〇二七節氣貓 · 01 立春 · 橘色緬因貓',
      aria: '戴淡綠方形官帽、帽前有嫩芽圓徽，身穿米白氣球大袖官袍、淡綠衣襟與田畦蔽膝，雙手在胸前直立捧著淡金笏板的橘色長毛緬因貓 3D 模型'
    },
    theme: { accent: '#66773A', accentDark: '#C5C98F', glow: 'rgba(197, 199, 143, 0.32)', glowColor: '#D6DC9A' },
    palette: [['#FABD6E', '暖橘'], ['#FAF0D8', '奶油白'], ['#B3B67A', '鼠尾草綠'], ['#F2D087', '淡金黃']],
    spec: [['品種', '橘色緬因貓'], ['角色', '立春神農官'], ['頭身比', '約 1 : 1.3']],
    seed: 104,
    exposure: EXPOSURE,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR_MID, low: FUR_LOW, deep: STRIPE, cream: CREAM,
        ink: INK, creamInk: CREAM_INK, noise: { colors: [M('#FFE3BE'), M('#EE9C4C')], alpha: 0.08, n: 1100 },
        paintBase(g, P) {
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.5, FUR_MID); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          const L = (lon, lat) => P.xy(lon, lat);
          // back-of-head tabby stripes
          g.filter = 'blur(4px)';
          [-165, -140, -115, 115, 140, 165].forEach(lon => {
            const a = L(lon, 80), b = L(lon + (lon > 0 ? 4 : -4), 30), c = L(lon, -20);
            P.stroke(g, [a, b, c], 24, STRIPE, 0.55);
          });
          // cream lower face / chest ruff with the forehead notch between the eyes
          const poly = MASK;
          g.filter = 'blur(7px)'; g.fillStyle = CREAM; g.beginPath();
          poly.forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill();
          // three forehead stripes, tapering down between the ears
          g.filter = 'blur(2.5px)';
          const wedge = (lonT, lonB, latB, wT) => {
            const [x0, y0] = L(lonT - wT, 74), [x1, y1] = L(lonT + wT, 74), [xb, yb] = L(lonB, latB);
            g.fillStyle = NEKO.rgba(STRIPE, 0.95); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
            g.quadraticCurveTo((x1 + xb) / 2 + 4, (y1 + yb) / 2, xb, yb); g.quadraticCurveTo((x0 + xb) / 2 - 4, (y0 + yb) / 2, x0, y0); g.fill();
          };
          wedge(0, 0, 6, 6); wedge(-12, -9, 24, 5.5); wedge(12, 9, 24, 5.5); wedge(-25, -21, 32, 5); wedge(25, 21, 32, 5);
          // cheek stripes sweeping out toward the ruff
          g.filter = 'blur(3px)';
          [[[40, 12], [58, 9], [80, 5]], [[46, -4], [66, -8], [92, -8]], [[50, -18], [66, -22], [86, -26]]].forEach(s => {
            const p = s.map(([lo, la]) => L(lo, la));
            P.stroke(g, p, 16, STRIPE, 0.9);
            P.stroke(g, p.map(q => [1024 - q[0], q[1]]), 16, STRIPE, 0.9);
          });
          g.filter = 'none';
        }
      },
      head: { y: 2.35, w: 0.88, h: 0.7, d: 0.8, cheek: 0.11, ruff: 0.06, ruffFreq: 14, chinDrop: 0.02,
        // pear-shaped: the crown between the ears is narrower than the fluffy cheeks (picture: ±0.62 at y 2.8)
        deform(p, o) { p.x *= 1 - 0.12 * SST(0.2, 0.85, o.y); },
        fur: { layers: 18, length: 0.085, gravity: 0.03, repeat: [9, 5] } },
      eyes: { x: 0.285, y: 0.02, r: 0.077, sx: 0.95, sy: 1.08, sz: 0.45, color: '#4E2F1A', shine: 0.75 },
      nose: { y: -0.06, color: M('#F4A696'), size: 0.88 },
      muzzle: { y: -0.14, size: 0.5, color: CREAM },
      mouth: { type: 'none' },
      blush: { color: 'rgba(244,150,140,0.55)', x: 0.47, y: -0.11, r: 26 },
      ears: { x: 0.55, y: 0.3, z: -0.05, tilt: 0.24, yaw: 0.24, pitch: -0.06, size: [0.43, 0.6, 0.17], sharp: 0.95,
        color: FUR, inner: M('#F8CDB6'), tuft: M('#FFF8EE') },
      bib: { color: M('#FFFBF2'), balls: [[0, 1.74, 0.36, 0.27], [0.16, 1.72, 0.34, 0.16], [-0.16, 1.72, 0.34, 0.16], [0, 1.55, 0.42, 0.17]],
        fur: { layers: 14, length: 0.07, gravity: 0.03, repeat: [3, 2] } },
      robe: {
        profile: [[0.56, 0.42], [0.58, 0.5], [0.59, 0.62], [0.575, 0.9], [0.56, 1.12], [0.55, 1.35], [0.5, 1.55], [0.38, 1.72], [0.12, 1.84]],
        color: '#FFFFFF', ink: SAGE_INK, lining: M('#EDE3C4'), hemY: 0.5,
        paint(g, w, h, D) { D.fill(g, ROBE); }
      },
      collar: false,
      arms: {
        L: { hand: [-0.195, 1.31, 0.88], path: [[-0.5, 1.45, 0.3], [-0.45, 1.37, 0.56], [-0.33, 1.32, 0.74]], pawScale: 1.28, wrist: false },
        R: { hand: [0.195, 1.31, 0.88], path: [[0.5, 1.45, 0.3], [0.45, 1.37, 0.56], [0.33, 1.32, 0.74]], pawScale: 1.28, wrist: false }
      },
      sleeves: false,
      paws: { color: M('#F6ECDD'), ink: CREAM_INK },
      belt: { yT: 1.17, yB: 1.02, color: M('#9C9B5C'), line: false, knot: false, tassel: false },
      legs: false,
      feet: false,
      tail: {
        pts: [[0.3, 0.46, -0.5], [0.7, 0.42, -0.64], [1.0, 0.46, -0.56], [1.1, 0.66, -0.46], [1.1, 0.94, -0.4], [1.14, 1.13, -0.35], [1.27, 1.24, -0.3], [1.41, 1.2, -0.28], [1.48, 1.04, -0.26], [1.45, 0.88, -0.25]],
        r: 0.21, color: M('#FAC074'), deep: M('#F5A04E'), tip: M('#FCDDB0'), tipStart: 0.7, bands: 4, bandAlpha: 0.9,
        // jagged darker bands on the lower-middle tail and a pale curled tip, as painted
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, M('#F9B868')); lg.addColorStop(0.62, M('#FAC074')); lg.addColorStop(0.74, M('#FBD39C')); lg.addColorStop(1, M('#FCE2BA'));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.fillStyle = M('#F4A552');
          [[0.12, 0.07], [0.3, 0.08], [0.46, 0.075], [0.6, 0.05]].forEach(([c, bw]) => {
            const x0 = (c - bw / 2) * w, x1 = (c + bw / 2) * w, n = 8;
            g.beginPath(); g.moveTo(x0, 0);
            for (let i = 0; i <= n; i++) g.lineTo(x0 + (i % 2 ? -14 : 10), i / n * h);
            for (let i = n; i >= 0; i--) g.lineTo(x1 + (i % 2 ? 14 : -10), i / n * h);
            g.closePath(); g.fill();
          });
        },
        shape: t => t < 0.55 ? 0.62 + 0.38 * Math.sin(Math.PI / 2 * t / 0.55) : 0.12 + 0.88 * Math.cos(Math.PI / 2 * (t - 0.55) / 0.45),
        fur: { layers: 18, length: 0.075, gravity: 0.02, repeat: [14, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, roundBox, extrude, tube, lathe, medal, D } = K;
      const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
      const lerp = (a, b, t) => a + (b - a) * t;
      const HY = K.cfg.head.y;

      /* ---------------- face: shallow ω mouth ---------------- */
      {
        const mm = std('#7A4B2E', { roughness: 0.6 }), faceParts = K.muzzle.concat(K.headMesh);
        const onF = (x, y) => K.onSkin(x, y, faceParts).p.add(V(0, 0, 0.008));
        const my = HY - 0.15;
        [-1, 1].forEach(sx => mesh(tube([[0.135 * sx, my + 0.02], [0.068 * sx, my - 0.03], [0.004 * sx, my]].map(([x, y]) => onF(x, y)), 0.0095, 24, 8), mm, K.faceG));
        mesh(tube([onF(0, HY - 0.085), onF(0, my + 0.004)], 0.0105, 6, 8), mm, K.faceG);
      }

      /* ---------------- head: long Maine-coon cheek tufts & chest ruff ---------------- */
      const edgeX = (y) => { // silhouette half-width of the head at height y
        let lo = 0, hi = 1.4;
        for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; }
        return lo;
      };
      const furMat = std(FUR_MID, { roughness: 0.95 }), creamMat = std(CREAM, { roughness: 0.95 });
      // merge many tube geometries into one mesh (one outline, one fur shell stack)
      const merge = (geos) => {
        const pos = [], nor = [], uv = [], idx = []; let off = 0;
        geos.forEach(g => {
          const gi = g.index ? g.index : null, n = g.attributes.position.count;
          pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array);
          if (gi) for (let i = 0; i < gi.count; i++) idx.push(gi.getX(i) + off); else for (let i = 0; i < n; i++) idx.push(i + off);
          off += n;
        });
        const m = new THREE.BufferGeometry();
        m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        m.setIndex(idx); return m;
      };
      const lockGeo = (root, dir, len, r0, bend) => {
        const d = V(dir[0], dir[1], dir[2]).normalize();
        const a = V(root[0], root[1], root[2]);
        const b = a.clone().addScaledVector(d, len * 0.55).add(V(0, bend * len, 0));
        const c = a.clone().addScaledVector(d, len);
        return tube([a, b, c], t => r0 * Math.pow(1 - t, 0.8) + 0.006, 20, 12);
      };
      const orangeLocks = [];
      [-1, 1].forEach(sx => {
        // [height, angle below horizontal (deg), length, root radius] — chunky flame-shaped cheek locks
        [[2.64, -8, 0.13, 0.09], [2.5, 6, 0.19, 0.12], [2.35, 16, 0.2, 0.13], [2.2, 26, 0.27, 0.13], [2.05, 38, 0.22, 0.12], [1.92, 50, 0.25, 0.11], [1.8, 58, 0.25, 0.1]]
          .forEach(([y, ang, len, r0], i) => {
            const ex = edgeX(y), a = ang * Math.PI / 180;
            const zz = [-0.02, 0.14, -0.06, 0.12, -0.08, 0.08, 0.02][i];
            orangeLocks.push(lockGeo([sx * (ex - 0.1), y, zz], [sx * Math.cos(a), -Math.sin(a), zz * 0.6 - 0.42], len * 1.15, r0, -0.14));
          });
        // mane continuing behind the cheeks (reads from the side and back)
        [[2.45, -0.3, 0.2], [2.25, -0.38, 0.22], [2.05, -0.36, 0.22], [1.88, -0.28, 0.2], [2.6, -0.2, 0.16]].forEach(([y, z, len]) => {
          const ex = edgeX(y) * 0.92;
          orangeLocks.push(lockGeo([sx * (ex - 0.1), y, z], [sx * 0.4, -0.9, -0.28], len, 0.1, -0.03));
        });
      });
      const lockMesh = mesh(merge(orangeLocks), furMat, K.faceG, null, null, INK);
      K.addFur(lockMesh, { layers: 12, length: 0.04, gravity: 0.02, repeat: [2, 6] });
      // soft white fur tufts inside the ears
      {
        const tm = std(M('#FFF8EE'), { roughness: 0.95 });
        K.ears.forEach(({ g, sx }) => {
          // fluffy white fur spilling from the lower inner ear toward the forehead
          const gs = [[-0.06, 0.12, 0.17, 0.055, 0.5], [-0.04, 0.2, 0.15, 0.05, 0.8], [0.0, 0.08, 0.14, 0.05, 0.3]].map(([x, y, len, r0, up]) =>
            lockGeo([x * sx, y, 0.13], [-0.8 * sx, up, 0.55], len, r0, 0));
          const m = mesh(merge(gs), tm, g);
          K.addFur(m, { layers: 8, length: 0.035, gravity: 0.01, repeat: [2, 4] });
        });
      }
      // cream ruff tips over the collar
      {
        const gs = [[-0.52, 1.8, 0.28, -0.4], [-0.34, 1.73, 0.44, -0.22], [-0.13, 1.69, 0.53, -0.06], [0.13, 1.69, 0.53, 0.06], [0.34, 1.73, 0.44, 0.22], [0.52, 1.8, 0.28, 0.4]]
          .map(([x, y, z, dx]) => lockGeo([x, y + 0.08, z], [dx, -1, 0.35], 0.18, 0.08, 0));
        const m = mesh(merge(gs), creamMat, K.faceG, null, null, CREAM_INK);
        K.addFur(m, { layers: 10, length: 0.045, gravity: 0.02, repeat: [2, 4] });
      }

      // blush freckles (two tiny dots in each blush, as drawn)
      {
        const g = K.headTex.image.getContext('2d');
        [-1, 1].forEach(sx => [-0.035, 0.035].forEach(dx => {
          const s = K.onSkin(sx * 0.47 + dx, HY - 0.115, [K.headMesh]);
          if (!s.uv) return;
          g.fillStyle = 'rgba(232,120,110,0.9)'; g.beginPath(); g.arc(s.uv.x * 1024, (1 - s.uv.y) * 512, 2.6, 0, Math.PI * 2); g.fill();
        }));
        K.headTex.needsUpdate = true;
      }

      K.bib.forEach(b => { b.material.emissive = new THREE.Color('#5a554c'); });
      {
        // the downward-facing cream chin/ruff renders grey; lift only the cream area with an emissive mask
        const em = canvasTex(1024, 512, (g) => {
          g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 512);
          g.filter = 'blur(8px)'; g.fillStyle = '#fff'; g.beginPath();
          MASK.forEach(([lo, la], i) => { const [x, y] = K.P.xy(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill(); g.filter = 'none';
        });
        const hm = K.headMesh.material;
        hm.emissiveMap = em; hm.emissive = new THREE.Color('#2c2a26'); hm.needsUpdate = true;
      }

      /* ---------------- official hat ---------------- */
      const hatG = part('hat', K.head);
      hatG.position.set(0, 2.95, 0.0);
      // measured on the picture: band ≈ 0.77 wide × 0.2 tall, crown ≈ 0.74 wide × 0.4 tall (crown taller than the band)
      const bandMat = std(M('#A2A668'), { roughness: 0.85 }), crownMat = std(M('#B3B67A'), { roughness: 0.85 });
      mesh(roundBox(0.71, 0.15, 0.64, 0.05, 0.03), bandMat, hatG, [0, 0.105, 0], null, SAGE_INK);
      mesh(roundBox(0.74, 0.03, 0.67, 0.015, 0.008), std(M('#E6DEA6'), { roughness: 0.7 }), hatG, [0, 0.21, 0]);
      mesh(roundBox(0.665, 0.33, 0.59, 0.09, 0.035), crownMat, hatG, [0, 0.415, -0.01], null, SAGE_INK);
      // faint sprig embroidered on the crown front
      {
        const tex = canvasTex(256, 256, (g) => { sprig(D, g, 128, 236, 200, M('#8E985A'), 0); });
        const m = mesh(new THREE.PlaneGeometry(0.2, 0.2), texMat(tex, { transparent: true, alphaTest: 0.4, roughness: 0.85 }), hatG, [0, 0.43, 0.296]);
        m.castShadow = false;
      }
      medal(hatG, [0, 0.22, 0.37], 0.155, (g) => {
        g.strokeStyle = M('#D9B461'); g.lineWidth = 7; g.beginPath(); g.arc(128, 128, 100, 0, Math.PI * 2); g.stroke();
        seedling(g, 128, 196, 150, M('#8F9A52'));
      }, M('#E7C069'), GOLD_INK, M('#F8E2A6'));
      // leafy sprigs at both sides of the band (instead of an official's wings)
      const leafShape = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.45, 0, L); s.quadraticCurveTo(-w, L * 0.45, 0, 0); return s; };
      const leafBig = extrude(leafShape(0.115, 0.062), 0.02, 0.007, 2, 10), leafSm = extrude(leafShape(0.095, 0.05), 0.018, 0.006, 2, 10);
      const leafMat = std(M('#B8C07C'), { roughness: 0.75 }), stemMat = std(M('#8E9A55'), { roughness: 0.8 });
      [-1, 1].forEach(sx => {
        const sp = group(hatG, [0.4 * sx, 0.02, 0.14], [0, 0, -0.42 * sx]);
        mesh(tube([[0, 0, 0], [0.01 * sx, 0.14, 0], [0.0, 0.3, 0]], 0.013, 16, 8), stemMat, sp);
        [[0.09, 1], [0.09, -1], [0.2, 1], [0.2, -1]].forEach(([y, k]) => {
          const l = mesh(y > 0.1 ? leafSm : leafBig, leafMat, sp, [0, y, 0], null, SAGE_INK);
          l.rotation.set(0, 0, -k * 1.0);
        });
        mesh(leafSm, leafMat, sp, [0, 0.29, 0], null, SAGE_INK).rotation.z = 0.08 * sx;
      });

      /* ---------------- open-front outer robe (外袍): lapels above the belt, flared A-line skirt ----------------
         Measured on the picture: the skirt comes out from under the upper sleeve at (±0.88, 1.06), flares to
         x ≈ ±1.02 at y 0.5; its front edges sit at x ≈ ±0.52 beside the apron; the green hem band slants from
         y ≈ 0.52 at the sides down to 0.36 at the front edges (the picture's slightly-from-above view of a round hem). */
      const coatProf = new THREE.SplineCurve([[1.0, 0.34], [1.02, 0.46], [1.0, 0.6], [0.95, 0.78], [0.86, 0.95], [0.74, 1.08], [0.64, 1.22], [0.58, 1.42], [0.49, 1.6], [0.37, 1.76]]
        .map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(90);
      const coatR = (y) => { for (let i = 0; i < coatProf.length - 1; i++) { const a = coatProf[i], b = coatProf[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < 0.35 ? 1.0 : 0.37; };
      const gapW = (y) => y < 1.05 ? lerp(0.52, 0.35, sst(0.36, 1.05, y)) : lerp(0.35, 0.32, sst(1.05, 1.6, y));
      const phiH = (y) => Math.asin(Math.min(gapW(y) / coatR(y), 0.97));
      const coatZs = (y) => 1 - 0.22 * sst(1.15, 0.5, y);
      const hemY = (u) => { const m = Math.min(u, 1 - u); return 0.36 + 0.1 * sst(0, 0.2, m) - 0.01 * sst(0.2, 0.5, m); };
      let coatMesh;
      {
        const Y1 = 1.76, nu = 144, nv = 56, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv;
          for (let i = 0; i <= nu; i++) {
            const u = i / nu, y = lerp(hemY(u), Y1, t), r = coatR(y), ph = phiH(y), zs = coatZs(y);
            const phi = ph + (Math.PI * 2 - 2 * ph) * u;
            pos.push(Math.sin(phi) * r, y, Math.cos(phi) * r * zs); uv.push(u, t);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const H0 = hemY(0);
        const tex = canvasTex(2048, 512, (g, w, h) => {
          D.fill(g, ROBE);
          const rowY = (y) => (1 - (y - H0) / (Y1 - H0)) * h;   // exact near the front edges (u ≈ 0 / 1)
          const rowT = (t) => (1 - t) * h;
          // front-edge trims (lapels) only above the belt: constant 0.1 world width → varying u width
          const trim = (col, dark) => {
            [[0, col], [1, dark]].forEach(([inset, c]) => {
              g.fillStyle = c; g.beginPath();
              const L = [], R = [];
              for (let k = 0; k <= 30; k++) {
                const y = lerp(1.0, Y1, k / 30), circ = coatR(y) * (Math.PI * 2 - 2 * phiH(y)), px = 0.1 / circ * w;
                L.push([inset ? px : 0, rowY(y)]); R.push([inset ? px + 5 : px, rowY(y)]);
              }
              L.concat(R.reverse()).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
              g.beginPath(); L.concat(R).forEach(([x, y], i) => i ? g.lineTo(w - x, y) : g.moveTo(w - x, y)); g.fill();
            });
          };
          // skirt hem band (≈ 0.1 world tall) with a dark top line
          const tb = 0.1 / (Y1 - 0.45);
          g.fillStyle = M('#C4C790', 0.92); g.fillRect(0, rowT(tb), w, h);
          g.fillStyle = M('#B5B77A'); g.fillRect(0, h - 10, w, 10);
          g.fillStyle = SAGE_INK; g.fillRect(0, rowT(tb) - 6, w, 6);
          // two-leaf seedlings: one on each front panel (as drawn), three more around the back
          [[0.075, 0.1, 84], [0.925, 0.1, 84], [0.3, 0.12, 64], [0.5, 0.12, 64], [0.7, 0.12, 64]].forEach(([u, t, s]) => seedling(g, u * w, rowT(t), s, M('#A3AB68')));
          [0.38, 0.5, 0.62].forEach((u, i) => sprig(D, g, u * w, rowT(i === 1 ? 0.5 : 0.4), 110, LEAF, 0));
          trim(SAGE, SAGE_INK);
        });
        coatMesh = mesh(geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.9 }), K.robeG, null, null, SAGE_INK);
        // the skirt sits in the shadow of the big sleeves; lift it back toward the picture's cream
        coatMesh.material.emissiveMap = coatMesh.material.map; coatMesh.material.emissive = new THREE.Color('#2e2c28');
        const hem = []; for (let k = 0; k <= nu; k++) hem.push(V(pos[k * 3] * 1.004, pos[k * 3 + 1] + 0.004, pos[k * 3 + 2] * 1.004));
        mesh(tube(hem, 0.012, 240, 6), std(SAGE_INK, { roughness: 0.8 }), K.robeG);
      }

      /* ---------------- pale-green shoulder collar (披領) with the sage lapel edges ---------------- */
      let collarMesh;
      {
        const gap = 42 * Math.PI / 180;
        const prof = [[0.95, 1.5], [0.88, 1.59], [0.72, 1.7], [0.55, 1.79], [0.38, 1.86]];
        const tex = canvasTex(1024, 256, (g, w, h) => {
          D.fill(g, COLLAR); g.fillStyle = 'rgba(160,160,90,0.25)'; g.fillRect(0, h - 22, w, 22);
          // sage lapel bands (≈ 0.13 wide) along both front edges: the top of the V that runs down behind the paws
          const phiLen = Math.PI * 2 - gap * 2;
          [[0.15, M('#9C9B5C')], [0.13, M('#C4C58E')]].forEach(([ww, col]) => {
            g.fillStyle = col;
            [0, 1].forEach(side => {
              g.beginPath();
              for (let k = 0; k <= 20; k++) {
                const v = k / 20, r = 0.95 - 0.57 * Math.pow(v, 1.1), du = ww / (r * phiLen * 0.85) * w, y = (1 - v) * h;
                const x = side ? w - du : du;
                k ? g.lineTo(x, y) : g.moveTo(x, y);
              }
              g.lineTo(side ? w : 0, 0); g.lineTo(side ? w : 0, h); g.closePath(); g.fill();
            });
          });
        });
        const cl = lathe(prof, 96, gap, Math.PI * 2 - gap * 2, 24);
        const zc = 0.8;
        collarMesh = mesh(cl.geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.9 }), K.robeG, null, [1, 1, zc], SAGE_INK);
        const hem = [];
        for (let i = 0; i <= 60; i++) { const a = gap + (Math.PI * 2 - gap * 2) * i / 60; hem.push(V(Math.sin(a) * 0.955, 1.498, Math.cos(a) * 0.955 * zc)); }
        mesh(tube(hem, 0.016, 160, 8), std(M('#A6A866'), { roughness: 0.8 }), K.robeG);
      }

      /* ---------------- long hanging sleeves (袂): custom sack geometry ----------------
         Measured on the picture: a rounded balloon from the shoulder (±0.9, 1.6), outer edge x ≈ ±0.95,
         its lower edge rising from y ≈ 0.72 at the cuff to ≈ 1.05 at the outer side (the flared coat
         skirt comes out from under it); the wide green cuff runs from the paw down to y ≈ 0.7. */
      const yBot = (t) => t < 0.45 ? lerp(1.3, 1.02, sst(0, 0.45, t)) : lerp(1.02, 0.7, sst(0.45, 1, t));
      const CUFF_Y = 0.5, CUFF_T = 0.88;
      const sleeveTex = canvasTex(1024, 1024, (g, w, h) => {
        const row = y => (1 - (y - 0.3) / 1.5) * h;
        D.fill(g, ROBE);
        // soft fold lines under the shoulder
        g.strokeStyle = 'rgba(210,175,125,0.4)'; g.lineWidth = 7; g.lineCap = 'round';
        [[360, row(1.45), 520, row(1.4)], [430, row(1.38), 600, row(1.33)], [640, row(1.42), 780, row(1.36)], [520, row(0.78), 700, row(0.62)]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2, Math.min(b, d) - 18, c, d); g.stroke(); });
        // green cuff facing on the upper part of the sleeve end (rounded lower corner)
        const x0 = CUFF_T * w, rr = 60;
        g.fillStyle = SAGE_INK;
        g.beginPath(); g.moveTo(x0 - 9, 0); g.lineTo(x0 - 9, row(CUFF_Y) - rr); g.quadraticCurveTo(x0 - 9, row(CUFF_Y) + 9, x0 + rr, row(CUFF_Y) + 9); g.lineTo(w, row(CUFF_Y) + 9); g.lineTo(w, 0); g.fill();
        g.fillStyle = M('#B5B87C');
        g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0, row(CUFF_Y) - rr); g.quadraticCurveTo(x0, row(CUFF_Y), x0 + rr, row(CUFF_Y)); g.lineTo(w, row(CUFF_Y)); g.lineTo(w, 0); g.fill();
        g.fillStyle = M('#A9AC6C', 0.8); g.fillRect(w - 26, 0, 26, row(CUFF_Y));
      });
      const sleeveMat = texMat(sleeveTex, { roughness: 0.9 });
      const capMat = texMat(sleeveTex, { roughness: 0.9, side: THREE.DoubleSide });
      const liningMat = std(M('#9FA062'), { side: THREE.BackSide, roughness: 0.9 });
      const sleevesG = part('sleeves', K.body);
      const sleeveFront = [];
      const buildSleeve = (sx) => {
        const spine = new THREE.CatmullRomCurve3([V(0.3 * sx, 0, -0.26), V(0.58 * sx, 0, -0.14), V(0.71 * sx, 0, 0.12), V(0.72 * sx, 0, 0.44), V(0.64 * sx, 0, 0.64), V(0.4 * sx, 0, 0.72)]);
        const NT = 72, NA = 64, pos = [], uv = [], idx = [], ring = [];
        for (let i = 0; i <= NT; i++) {
          const t = i / NT, C = spine.getPointAt(t), T = spine.getTangentAt(t);
          T.y = 0; T.normalize();
          const n = V(T.z, 0, -T.x).multiplyScalar(sx);
          const yT = lerp(1.62, 1.5, sst(0.25, 1, t)), yB = yBot(t);
          const W = lerp(0.1, 0.2, sst(0, 0.3, t)) * (1 - 0.2 * sst(0.7, 1, t));
          const mid = (yT + yB) / 2, half = (yT - yB) / 2, sh = 0.2 * sst(0.55, 1, t);
          for (let j = 0; j <= NA; j++) {
            const a = j / NA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            const y = mid + half * Math.sign(ca) * Math.pow(Math.abs(ca), 0.85);
            const hgt = (y - yB) / (yT - yB);
            const s = W * Math.sign(sa) * Math.pow(Math.abs(sa), 0.7) * (1 + 0.25 * (1 - hgt));
            const p = C.clone().addScaledVector(n, s).addScaledVector(T, sh * Math.max(0, y - 1.0));
            p.y = y;
            pos.push(p.x, p.y, p.z); uv.push(t, (y - 0.3) / 1.5);
            if (i === NT) ring.push(p);
          }
        }
        for (let i = 0; i < NT; i++) for (let j = 0; j < NA; j++) {
          const a = i * (NA + 1) + j, b = a + NA + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const k = Math.floor(NT / 2) * (NA + 1) + Math.floor(NA / 4);   // make normals point outward
        const pv = V().fromBufferAttribute(geo.attributes.position, k), nv = V().fromBufferAttribute(geo.attributes.normal, k);
        const c0 = spine.getPointAt(0.5); c0.y = pv.y;
        if (nv.dot(pv.clone().sub(c0)) < 0) {
          for (let q = 0; q < idx.length; q += 3) { const tt = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tt; }
          geo.setIndex(idx); K.smoothNormals(geo);
        }
        sleeveFront.push(mesh(geo, sleeveMat, sleevesG, null, null, SAGE_INK));
        const lin = new THREE.Mesh(geo, liningMat); lin.receiveShadow = true; sleevesG.add(lin);
        // ring[j]: j = 0 top, NA/2 bottom. Walk it from the bottom up one side, over the top and down the other.
        const loop = [];
        for (let j = NA / 2; j < NA; j++) loop.push(ring[j]);
        for (let j = 0; j <= NA / 2; j++) loop.push(ring[j]);
        // sew the lower part of the sleeve end shut: fan from the centroid of the lower ring
        if (ring.filter(p => p.y < CUFF_Y + 0.02).length > 3) {
          const bnd = ring.slice(0, NA).filter(p => p.y < CUFF_Y + 0.02);
          const cen = bnd.reduce((a, p) => a.add(p), V()).multiplyScalar(1 / bnd.length);
          // bnd is contiguous in ring order (around j = NA/2), so a simple fan closes it
          const cp = [cen.x, cen.y, cen.z], cu = [0.998, (cen.y - 0.3) / 1.5], ci = [];
          bnd.forEach(p => { cp.push(p.x, p.y, p.z); cu.push(0.998, (p.y - 0.3) / 1.5); });
          for (let q = 1; q < bnd.length; q++) ci.push(0, q, q + 1);
          const cg = new THREE.BufferGeometry();
          cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
          cg.setAttribute('uv', new THREE.Float32BufferAttribute(cu, 2));
          cg.setIndex(ci); cg.computeVertexNormals();
          mesh(cg, capMat, sleevesG);
        }
        // green piping along the open part of the cuff
        mesh(tube(loop.filter(p => p.y >= CUFF_Y), 0.018, 120, 8), std(M('#A9AC6C'), { roughness: 0.8 }), sleevesG);
      };
      buildSleeve(-1); buildSleeve(1);
      // motifs on the sleeve fronts as decals: a four-leaf sprig high up and a two-leaf seedling near the hem
      {
        const tex = canvasTex(256, 256, (g) => sprig(D, g, 128, 246, 232, M('#9CA65E'), 0.04));
        const tex2 = canvasTex(256, 256, (g) => seedling(g, 128, 240, 230, M('#9CA65E')));
        const mk = (t) => texMat(t, { transparent: true, alphaTest: 0.35, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
        const dm = mk(tex), dm2 = mk(tex2);
        [-1, 1].forEach(sx => {
          void dm2;
          [[0.68, 1.1, 0.34, dm]].forEach(([x, y, sz, mat]) => {
            const hit = K.onSkin(x * sx, y, sleeveFront);
            const d = mesh(new THREE.PlaneGeometry(sz, sz), mat, sleevesG, hit.p.clone().addScaledVector(hit.n, 0.006));
            d.lookAt(hit.p.clone().add(hit.n)); d.castShadow = false;
          });
        });
      }

      /* ---------------- apron (蔽膝) with rolling fields and a sprout ---------------- */
      const apronG = part('apron', K.body);
      {
        const y0 = 0.2, y1 = 1.04, nu = 24, nv = 30, R = 1.1, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, y = lerp(y0, y1, t), hw = lerp(0.4, 0.37, t), zf = lerp(0.68, 0.6, t);
          for (let i = 0; i <= nu; i++) {
            const s = i / nu, x = lerp(-hw, hw, s);
            let z = zf - (R - Math.sqrt(R * R - x * x));
            z = Math.max(z, Math.sqrt(Math.max(K.robeR(y) ** 2 - x * x, 0)) + 0.025);
            pos.push(x, y, z); uv.push(s, t);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); geo.computeVertexNormals();
        const tex = canvasTex(512, 536, (g, w, h) => {
          D.fill(g, ROBE);
          const bw = 60;
          g.fillStyle = M('#ACB16F', 0.8); g.fillRect(0, 0, bw, h); g.fillRect(w - bw, 0, bw, h); g.fillRect(0, h - bw - 6, w, bw + 6);
          g.strokeStyle = SAGE_INK; g.lineWidth = 5; g.strokeRect(bw, -10, w - bw * 2, h - bw - 6 + 10);
          g.strokeRect(2, -10, w - 4, h + 8);
          // rolling hills (田畦)
          g.lineCap = 'round';
          const arc = (cx, cy, r, a0, a1, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke(); };
          g.save(); g.beginPath(); g.rect(bw + 4, 0, w - bw * 2 - 8, h - bw - 10); g.clip();
          const gr = M('#A3AB68'), au = M('#EBC56A');
          // hills traced from the picture (start, crest, end in canvas px): a small pair on the left, a big pair on the right
          const hill = (a, c, b, col, lw) => {
            g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(a[0], a[1]);
            g.quadraticCurveTo(2 * c[0] - (a[0] + b[0]) / 2, 2 * c[1] - (a[1] + b[1]) / 2, b[0], b[1]); g.stroke();
          };
          hill([64, 345], [160, 316], [250, 382], gr, 17);
          hill([57, 397], [119, 376], [194, 405], au, 13);
          hill([153, 472], [297, 392], [441, 437], gr, 18);
          hill([222, 482], [325, 444], [420, 466], au, 13);
          hill([98, 466], [112, 446], [139, 436], gr, 12);
          g.restore();
          seedling(g, 330, 378, 128, M('#A3AB68'));
        });
        mesh(geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.9 }), apronG);
        const edge = (s) => { const pts = []; for (let j = 0; j <= 12; j++) { const jj = Math.round(j / 12 * nv), k = (jj * (nu + 1) + s) * 3; pts.push(V(pos[k], pos[k + 1], pos[k + 2] + 0.004)); } return pts; };
        const pm = std(SAGE_INK, { roughness: 0.8 });
        mesh(tube(edge(0), 0.009, 32, 6), pm, apronG); mesh(tube(edge(nu), 0.009, 32, 6), pm, apronG);
        const bot = []; for (let i = 0; i <= nu; i++) bot.push(V(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2] + 0.004));
        mesh(tube(bot, 0.009, 32, 6), pm, apronG);
      }

      /* ---------------- belt: gold cord, bow knot and tassel (measured: belt y 1.02–1.17, knot 1.1, tassel tip 0.67) ---------------- */
      const beltG = K.beltG;
      const goldMat = std(M('#E9B659'), { roughness: 0.5, metalness: 0.1 });
      {
        const cord = mesh(new THREE.TorusGeometry(K.robeR(1.15) + 0.036, 0.015, 8, 128), std(M('#D4A84E'), { roughness: 0.5 }), beltG, [0, 1.15, 0]);
        cord.rotation.x = Math.PI / 2;
        const zK = K.robeR(1.1) + 0.06;
        mesh(sphere(0.036, 20, 14), goldMat, beltG, [0, 1.1, zK + 0.012], null, GOLD_INK);
        [-1, 1].forEach(sx => {
          // two loops drooping down and out, and two short cord ends
          const l = mesh(new THREE.TorusGeometry(0.062, 0.014, 10, 36), goldMat, beltG, [0.075 * sx, 1.03, zK], [1, 1.45, 1], GOLD_INK);
          l.rotation.set(0, 0.2 * sx, 0.62 * sx);
          mesh(tube([[0.015 * sx, 1.09, zK + 0.014], [0.04 * sx, 1.0, zK + 0.024], [0.06 * sx, 0.94, zK + 0.016], [0.085 * sx, 0.955, zK + 0.006]], 0.011, 20, 6), goldMat, beltG);
        });
      }
      const tasG = group(beltG, [0, 1.08, K.robeR(1.1) + 0.075]);
      {
        const tm = std(M('#EDB54E'), { roughness: 0.6 });
        mesh(tube([[0, 0, 0], [0, -0.08, 0.005], [0, -0.14, 0.0]], 0.009, 8, 6), goldMat, tasG);
        mesh(sphere(0.03, 16, 12), goldMat, tasG, [0, -0.16, 0], null, GOLD_INK);
        mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.06, 20), tm, tasG, [0, -0.21, 0], null, GOLD_INK);
        for (let i = 0; i < 9; i++) {
          const s = mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.19, 6), tm, tasG, [(i - 4) * 0.009, -0.33, (i % 2) * 0.008]);
          s.rotation.z = (i - 4) * 0.03;
        }
      }
      K.onTick((t, k) => { tasG.rotation.z = 0.08 * Math.sin(t * 1.7) * k; });

      /* ---------------- 笏板 held upright in both paws (measured: 0.3 wide, top at y 2.04) ---------------- */
      const boardG = part('board', K.body);
      {
        const Wt = 0.3, Ht = 0.84;
        const shape = [[-0.13, 0], [0.13, 0], [0.15, 0.725], [0.075, Ht], [-0.075, Ht], [-0.15, 0.725]];
        const geo = extrude(shape, 0.04, 0.012, 3, 8);
        const tex = canvasTex(256, 640, (g, w, h) => {
          const px = x => (x / Wt + 0.5) * w, py = y => (1 - y / Ht) * h;
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, M('#E9C574')); lg.addColorStop(0.5, M('#F4D58E')); lg.addColorStop(1, M('#E9C574'));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          const inset = [[-0.105, 0.04], [0.105, 0.04], [0.118, 0.705], [0.062, 0.8], [-0.062, 0.8], [-0.118, 0.705]];
          g.strokeStyle = M('#FBE7B4'); g.lineWidth = 7; g.beginPath(); inset.forEach(([x, y], i) => i ? g.lineTo(px(x), py(y)) : g.moveTo(px(x), py(y))); g.closePath(); g.stroke();
          g.strokeStyle = M('#CFA24C'); g.lineWidth = 3; g.stroke();
          sprig(D, g, px(0), py(0.5), 168, M('#9CA459'), 0);
        });
        tex.repeat.set(1 / Wt, 1 / Ht); tex.offset.set(0.5, 0);
        const bg = group(boardG, [0, 1.22, 0.86]);
        mesh(geo, [texMat(tex, { roughness: 0.6 }), std(GOLD_DK, { roughness: 0.5 })], bg, null, null, GOLD_INK);
      }
      // toe creases on the front paws
      {
        const cm = std('#C99A7C', { roughness: 0.8 });
        ['L', 'R'].forEach(s => {
          const p = K.hands[s].p;
          [-0.045, 0.045].forEach(dx => mesh(tube([[p.x + dx, p.y - 0.03, p.z + 0.14], [p.x + dx * 1.1, p.y - 0.08, p.z + 0.125], [p.x + dx * 1.2, p.y - 0.115, p.z + 0.085]], 0.006, 8, 5), cm, K.poseG));
        });
      }

      /* ---------------- legs and feet: orange fur legs, orange feet with big cream toes ----------------
         measured: legs visible x ±(0.33–0.7), y 0.2–0.45; toes x ±(0.33–0.68), y 0–0.22 */
      {
        const fm = std(FUR, { roughness: 0.95 }), tm = std(CREAM, { roughness: 0.95 }), cm = std('#C99A7C', { roughness: 0.8 });
        [-1, 1].forEach(sx => {
          const leg = mesh(new THREE.CylinderGeometry(0.2, 0.235, 0.5, 28, 1, true), fm, K.poseG, [0.47 * sx, 0.4, 0.2], null, INK);
          K.addFur(leg, { layers: 10, length: 0.04, gravity: 0.015, repeat: [6, 3] });
          const fg = group(K.poseG, [0.48 * sx, 0, 0.36]);
          const top = mesh(sphere(1, 36, 24), fm, fg, [0, 0.16, 0], [0.27, 0.16, 0.28], INK);
          K.addFur(top, { layers: 10, length: 0.035, gravity: 0.015, repeat: [6, 3] });
          mesh(sphere(1, 36, 24), tm, fg, [0, 0.1, 0.19], [0.22, 0.115, 0.16], CREAM_INK);
          [-0.07, 0.07].forEach(dx => mesh(tube([[dx, 0.17, 0.31], [dx * 1.05, 0.1, 0.35], [dx * 1.1, 0.03, 0.325]], 0.007, 8, 5), cm, fg));
        });
      }

      /* ---------------- floating spring decorations ---------------- */
      {
        const lm = std(M('#B8C07C'), { roughness: 0.75 }), lm2 = std(M('#9FB06A'), { roughness: 0.75 }), sm = std(M('#8E9A55'), { roughness: 0.8 });
        const leafD = extrude(leafShape(0.26, 0.13), 0.03, 0.01, 2, 12);
        const items = [];
        const seedlingG = (pos, s) => {
          const g = group(K.decor, pos); g.scale.setScalar(s);
          mesh(tube([[0, 0, 0], [0.02, 0.18, 0], [0, 0.34, 0]], 0.022, 16, 8), sm, g);
          mesh(leafD, lm, g, [0, 0.33, 0], null, SAGE_INK).rotation.z = -0.95;
          mesh(leafD, lm2, g, [0, 0.33, 0], null, SAGE_INK).rotation.z = 0.95;
          mesh(sphere(0.12, 20, 12), std(M('#C9A77A'), { roughness: 1 }), g, [0, -0.02, 0], [1.3, 0.45, 1.3], '#9C7D57');
          return g;
        };
        items.push(seedlingG([-1.95, 2.75, 0.1], 1));
        items.push(seedlingG([2.05, 2.35, 0.2], 0.85));
        [[-1.75, 1.15, 0.4, 0.6], [-2.2, 3.55, -0.1, -0.4], [2.25, 3.35, 0.1, 2.3], [2.0, 0.55, 0.5, -2.2]].forEach(([x, y, z, r], i) => {
          const g = group(K.decor, [x, y, z], [0.3, 0.4 * (i % 2 ? 1 : -1), r]);
          mesh(leafD, i % 2 ? lm : lm2, g, [0, -0.13, 0], null, SAGE_INK);
          items.push(g);
        });
        // spring breeze swirl (東風解凍)
        const sw = group(K.decor, [-2.0, 0.35, 0.2]);
        const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 3.2, r = 0.05 + 0.2 * (1 - i / 40); pts.push([Math.cos(a) * r + i * 0.012, Math.sin(a) * r, 0]); }
        mesh(tube(pts.reverse(), 0.022, 80, 8), std(M('#CFE0B0'), { roughness: 0.7 }), sw, null, null, '#9FB06A');
        items.push(sw);
        items.forEach((g) => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.08 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.12 * Math.sin(t * 0.8 + i) * k;
        }));
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '掌管春耕萌芽的神農官',
        text: '立春是二十四節氣之首，這隻橘色緬因貓化身迎春的「神農官」：戴嫩芽官帽、雙手捧笏上朝。帽徽、笏板、袖子、下襬和蔽膝全是嫩芽圖案，配色只用暖橘、奶油白、鼠尾草綠與淡金黃。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '蓬鬆大臉與虎斑',
        text: '寬圓的大臉兩側長出一撮撮往外下方翹的長毛，是緬因貓的招牌鬃毛。額頭五道深橘虎斑，中間一道一路延伸到兩眼之間；眼睛以下到胸口全是奶白，配深棕圓眼、粉色小鼻和淺淺的「ω」嘴，腮紅上點著兩顆小紅點。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '大尖耳與耳毛',
        text: '一對寬底大尖耳立在官帽兩側，耳內淡粉，耳根冒出一大把往內翻的白色耳毛，是長毛貓的特徵。' },
      hat: { chip: '官帽', tag: '服飾', name: '萌芽官帽',
        text: '方正的淡綠文官帽，上半帽身比下半帽圈高、顏色也較淺，帽圈上緣壓一道米黃細線。圓心落在帽線上的淡金圓徽畫著雙葉嫩芽，帽身再繡一枝小芽；兩側各斜插一小枝綠葉，取代傳統官帽的帽翅。' },
      board: { chip: '笏板', tag: '道具', name: '淡金笏板',
        text: '兩隻前爪一起在胸前把笏板捧得直直的。笏板是淡金黃色，板頂削成六角尖形，內圈有細框，上方畫著綠色三葉小芽，和帽徽互相呼應。' },
      robe: { chip: '官袍', tag: '服飾', name: '披領、衣襟與外袍下襬',
        text: '肩上是淡黃綠披領，前緣接一道鼠尾草綠衣襟，斜斜收進白色胸毛底下形成 V 字。外袍下襬從大袖下方張開成 A 字，收一圈寬綠邊，兩側各繡一株雙葉嫩芽；圖上略微俯視，所以綠邊是外高內低的斜線。' },
      sleeves: { chip: '大袖', tag: '服飾', name: '氣球大袖與寬袖口',
        text: '米白大袖像兩顆圓鼓鼓的氣球從肩頭垂下，袖身各繡一枝三葉小芽。淡綠寬袖口從爪子旁一路垂到大腿，上窄下寬、內側露出深綠袖裡，前爪就從袖口伸出來。' },
      apron: { chip: '蔽膝', tag: '服飾', name: '田畦嫩芽蔽膝',
        text: '腰帶下垂著一片米白蔽膝，三邊鑲寬綠框。下方用綠色與金黃的弧線畫出左小右大兩組田畦山丘，右上冒出一株雙葉嫩芽，象徵春耕與大地回暖。' },
      belt: { chip: '腰帶', tag: '服飾', name: '腰帶與金穗',
        text: '深橄欖綠腰帶上緣壓一道金繩，正中打一個金色蝴蝶結，兩個圈往外下方垂，底下掛一串金黃流蘇，身體一動就輕輕擺動。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '蓬鬆捲尾', dir: [1, 0.25, -0.7],
        text: '又粗又蓬的橘色大尾巴從袍子右後方豎起，尾端向右捲成往下勾的鉤；下段有幾道鋸齒深橘環紋，捲起的尾端轉成淡杏色。' },
      pose: { chip: '姿態', tag: '貓咪本體', name: '上朝站姿',
        text: '雙腳站得端正，下襬底下露出一小段橘色腿毛和大大的奶白肉墊；兩隻前爪從袖口伸出、併攏捧笏，一副認真上朝的模樣。按下「行禮」可以看牠鞠躬。' }
    },
    order: ['overview', 'face', 'ears', 'hat', 'board', 'robe', 'sleeves', 'apron', 'belt', 'tail', 'pose']
  });
})();
