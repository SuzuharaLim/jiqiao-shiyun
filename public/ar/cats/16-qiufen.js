// @file 16_秋分_波斯貓
// @title 秋分・秋分嫦娥 | 二十四節氣貓
(function () {
  // Colours are SAMPLED from refs/16.png; M() compensates for the renderer's front-light gain so the
  // rendered colour lands near the sampled one (f = compensation factor; pale pastels use a lighter one).
  // (the key/hemisphere lights are warm, so red is amplified most: per-channel gains measured on renders)
  const GAIN = [1.55, 1.45, 1.32];
  function M(hex, f) {
    f = f || 1; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / (GAIN[i] * f), 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  // picture scale used for all measurements: 130 px per world unit, feet at px 470, body axis at px 250

  // ---- palette (sampled) ----
  const MF = hex => M(hex, 0.93);
  const FUR_TOP = MF('#E3D4CB'), FUR_MID = MF('#FDE3CF'), FUR_LOW = M('#FEF8EE', 0.8);
  const FUR = MF('#FBE5D2'), CREAM = MF('#FCF6EC'), STRIPE = MF('#C9B3A6');
  const INK = '#CDA57C', CREAM_INK = '#D9B993';
  const ROBE = M('#FBF1DB'), LAV = M('#D5D0DD'), LAV_INK = '#9E97B6';
  const SAGE = M('#C6C9AA'), SAGE_DK = M('#AAAD86'), SAGE_INK = '#8E9368';
  const GOLD = M('#F6D182'), GOLD_DK = M('#EBB65E'), GOLD_INK = '#C8903A';
  const MOON = M('#FBF0CB'), MOON_DK = M('#F4DC9E');
  const SASH = M('#AEB1AC'), OSM = M('#F7CE78'), OSM_C = M('#E9A94A'), LEAF = M('#A9B58E');

  // ---- tail curve (shared by the cat config and the feather locks in build) ----
  const TAIL_PTS = [[0.3, 0.45, -0.55], [0.74, 0.34, -0.7], [1.1, 0.44, -0.64], [1.16, 0.78, -0.56], [1.1, 1.02, -0.5], [1.24, 1.16, -0.45], [1.44, 1.06, -0.4], [1.5, 0.84, -0.35]];
  const TAIL_R = 0.3;
  const TAIL_SHAPE = t => t < 0.3 ? 0.55 + 0.45 * Math.sin(Math.PI / 2 * t / 0.3) : t < 0.62 ? 1 : 0.2 + 0.8 * Math.cos(Math.PI / 2 * (t - 0.62) / 0.38);

  // ---- canvas motifs ----
  function osm(g, x, y, s, petal, center, rot) { // 桂花：四瓣圓花
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.fillStyle = petal;
    for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 2); g.beginPath(); g.ellipse(0, -s * 0.3, s * 0.24, s * 0.3, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.fillStyle = center; g.beginPath(); g.arc(0, 0, s * 0.12, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function osmSprig(g, x, y, s, D, stem, petal, center) { // stem + 2 leaves + 2 flowers
    g.save(); g.translate(x, y);
    g.strokeStyle = stem; g.lineWidth = Math.max(2, s * 0.05); g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.06, -s * 0.45, s * 0.02, -s * 0.8); g.stroke();
    D.leaf(g, s * 0.03, -s * 0.2, s * 0.34, -1.0, stem);
    D.leaf(g, s * 0.05, -s * 0.52, s * 0.3, 0.95, stem);
    osm(g, s * 0.02, -s * 0.84, s * 0.34, petal, center, 0.2);
    osm(g, s * 0.2, -s * 0.62, s * 0.26, petal, center, -0.3);
    g.restore();
  }
  function crescent(g, x, y, r, color, ang, k) { // 彎月：大圓減去偏移的小圓（用兩圓交點畫出真正的月牙）
    k = k || 0.62;
    const ox = r * 0.5, oy = -r * 0.36, r2 = r * 0.78 * (k / 0.62);
    const d = Math.hypot(ox, oy), ux = ox / d, uy = oy / d;
    const aa = (r * r - r2 * r2 + d * d) / (2 * d), del = Math.acos(Math.max(-1, Math.min(1, aa / r))), tu = Math.atan2(uy, ux);
    const P1 = [r * Math.cos(tu + del), r * Math.sin(tu + del)], P2 = [r * Math.cos(tu - del), r * Math.sin(tu - del)];
    const f1 = Math.atan2(P1[1] - oy, P1[0] - ox), f2 = Math.atan2(P2[1] - oy, P2[0] - ox);
    g.save(); g.translate(x, y); g.rotate(ang || 0); g.fillStyle = color;
    g.beginPath(); g.arc(0, 0, r, tu + del, tu - del + Math.PI * 2, false);
    // back along the small circle on the side facing the big circle's centre
    const mid = (a0, a1, acw) => { let dd = a1 - a0; if (acw) { if (dd > 0) dd -= Math.PI * 2; } else if (dd < 0) dd += Math.PI * 2; const m = a0 + dd / 2; return Math.hypot(ox + r2 * Math.cos(m), oy + r2 * Math.sin(m)); };
    g.arc(ox, oy, r2, f2, f1, mid(f2, f1, true) < mid(f2, f1, false));
    g.closePath(); g.fill();
    g.restore();
  }
  function grainEar(g, x, y, s, color, ang) { // 稻穗（彎垂）
    g.save(); g.translate(x, y); g.rotate(ang || 0); g.fillStyle = color; g.strokeStyle = color; g.lineCap = 'round';
    g.lineWidth = Math.max(1.5, s * 0.045);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.2, -s * 0.6, s * 0.55, -s * 0.8); g.stroke();
    for (let i = 0; i < 7; i++) {
      const t = 0.35 + i * 0.1, px = s * 0.55 * t * t * 1.4 * (t > 0.7 ? 1 : 1), py = -s * 0.8 * (2 * t - t * t) * 1.02;
      [-1, 1].forEach(k => { g.beginPath(); g.ellipse(px + k * s * 0.05, py - s * 0.02, s * 0.045, s * 0.085, 0.6 + k * 0.5, 0, Math.PI * 2); g.fill(); });
    }
    g.restore();
  }

  NEKO.run({
    meta: {
      id: '16', term: '秋分', title: '秋分・秋分嫦娥', seal: '秋',
      eyebrow: '二〇二七節氣貓 · 16 秋分 · 波斯貓',
      aria: '頭戴滿月桂花髮冠、雙手在胸前捧著畫有彎月與桂花的小掛軸，身穿奶油色寬袖襦裙、薰衣草紫與鼠尾草綠層疊衣緣、繡稻穗彎月的前裙，拖著蓬鬆大尾巴的奶油色長毛波斯貓 3D 模型'
    },
    theme: { accent: '#6C628C', accentDark: '#CFC8E4', glow: 'rgba(213, 208, 221, 0.38)', glowColor: '#E6DDF7' },
    palette: [['#FBF1DB', '月白奶油'], ['#D5D0DD', '薰衣草紫'], ['#C6C9AA', '鼠尾草綠'], ['#F6D182', '桂花金']],
    spec: [['品種', '波斯貓（長毛）'], ['角色', '秋分嫦娥'], ['頭身比', '頭 : 身 ≈ 1 : 1.4']],
    seed: 1616,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR_MID, low: FUR_LOW, deep: STRIPE, cream: CREAM,
        ink: INK, creamInk: CREAM_INK, noise: { colors: [M('#FFFBF4'), M('#D9C9BE')], alpha: 0.07, n: 1200 },
        paintBase(g, P) {
          const L = (lon, lat) => P.xy(lon, lat);
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.3, FUR_TOP); vg.addColorStop(0.45, FUR_MID); vg.addColorStop(0.62, FUR_MID); vg.addColorStop(0.8, FUR_LOW); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // cream face: around the eyes, the flat muzzle and the whole lower face
          const half = [[0, 26], [9, 27], [20, 22], [30, 14], [40, 4], [50, -6], [58, -16], [64, -30], [68, -48], [70, -90]];
          const poly = half.concat(half.slice().reverse().map(([lo, la]) => [-lo, la]));
          g.filter = 'blur(12px)'; g.fillStyle = M('#FFF9F0', 0.76); g.beginPath();
          poly.forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill();
          // soft tabby wedges on the forehead (centre + two pairs), pointing down between the eyes
          g.filter = 'blur(3px)';
          const wedge = (lonT, lonB, latT, latB, wT, a) => {
            const [x0, y0] = L(lonT - wT, latT), [x1, y1] = L(lonT + wT, latT), [xb, yb] = L(lonB, latB);
            g.fillStyle = NEKO.rgba(STRIPE, a); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
            g.quadraticCurveTo((x1 + xb) / 2 + 3, (y1 + yb) / 2, xb, yb); g.quadraticCurveTo((x0 + xb) / 2 - 3, (y0 + yb) / 2, x0, y0); g.fill();
          };
          wedge(0, 0, 80, 14, 6, 0.75);
          wedge(-11, -7, 76, 22, 8, 0.6); wedge(11, 7, 76, 22, 8, 0.6);
          wedge(-25, -19, 70, 26, 8, 0.45); wedge(25, 19, 70, 26, 8, 0.45);
          wedge(-40, -34, 62, 30, 5, 0.3); wedge(40, 34, 62, 30, 5, 0.3);
          // pale streaks between the wedges
          g.filter = 'blur(4px)';
          [[-5, 66, -4, 22], [5, 66, 4, 22], [-18, 66, -14, 28], [18, 66, 14, 28]].forEach(([a, b, c, d]) => P.stroke(g, [L(a, b), L((a + c) / 2, (b + d) / 2), L(c, d)], 6, FUR_MID, 0.7));
          // grey cheek streaks sweeping outward below the eye line
          g.filter = 'blur(4px)';
          [[[48, -2], [64, -5], [84, -8]], [[54, -16], [70, -20], [90, -24]], [[40, 14], [58, 12], [78, 10]]].forEach((s, i) => {
            const p = s.map(([lo, la]) => L(lo, la));
            P.stroke(g, p, 14, STRIPE, i === 2 ? 0.35 : 0.55);
            P.stroke(g, P.mirror(p), 14, STRIPE, i === 2 ? 0.35 : 0.55);
          });
          // faint stripes over the back of the head
          [-160, -130, -100, 100, 130, 160].forEach(lon => P.stroke(g, [L(lon, 80), L(lon + (lon > 0 ? 5 : -5), 40), L(lon, 0)], 22, STRIPE, 0.18));
          g.filter = 'none';
        }
      },
      head: { y: 2.35, w: 0.8, h: 0.6, d: 0.66, cheek: 0.12, ruff: 0.07, ruffFreq: 16, chinDrop: 0.0,
        fur: { layers: 20, length: 0.13, gravity: 0.035, repeat: [10, 6] } },
      eyes: { x: 0.262, y: 0.035, r: 0.084, sx: 0.95, sy: 1.06, sz: 0.42, color: '#3F2618', iris: '#6E4A30', pupil: '#3A2317', pupilR: 0.55, shine: 1.05 },
      nose: { y: 0.0, color: M('#F4A9A0'), size: 0.62 },
      muzzle: { y: -0.05, size: 0.28, color: M('#F8EEE2', 0.85) },
      mouth: { type: 'none' },
      blush: { color: 'rgba(244,160,150,0.72)', x: 0.39, y: -0.09, r: 25 },
      ears: { x: 0.52, y: 0.28, z: -0.06, tilt: 0.3, yaw: 0.24, pitch: -0.04, size: [0.41, 0.5, 0.16], sharp: 0.9,
        color: FUR, inner: MF('#F7D2C4'), tuft: false, fur: false },
      bib: { color: M('#FCEEDD', 0.78), balls: [[0, 1.86, 0.28, 0.4], [0.36, 1.83, 0.2, 0.32], [-0.36, 1.83, 0.2, 0.32], [0, 1.72, 0.4, 0.28], [0.24, 1.72, 0.34, 0.25], [-0.24, 1.72, 0.34, 0.25], [0.6, 1.9, 0.0, 0.3], [-0.6, 1.9, 0.0, 0.3]],
        fur: { layers: 14, length: 0.08, gravity: 0.03, repeat: [3, 2] } },
      robe: {
        profile: [[0.8, 0.26], [0.82, 0.33], [0.76, 0.52], [0.66, 0.82], [0.56, 1.1], [0.5, 1.3], [0.45, 1.5], [0.34, 1.68], [0.1, 1.76]],
        color: '#FFFFFF', ink: SAGE_INK, lining: LAV, hemY: 0.5,
        paint(g, w, h, D) {
          D.fill(g, ROBE);
          // lavender inner-robe bands on both sides of the front skirt, green hem band all round
          const u = deg => 512 + deg / 360 * 1024;
          // front bands beside the skirt panel: sage on the image-left, lavender on the image-right (as layered in the picture)
          g.fillStyle = SAGE; g.fillRect(u(-40), 380, u(-26) - u(-40), h - 380);
          g.fillStyle = LAV; g.fillRect(u(26), 380, u(40) - u(26), h - 380);
          g.fillStyle = SAGE_INK; [-40, -26].forEach(d => g.fillRect(u(d) - 2, 380, 4, h - 380));
          g.fillStyle = LAV_INK; [26, 40].forEach(d => g.fillRect(u(d) - 2, 380, 4, h - 380));
          g.fillStyle = SAGE; g.fillRect(0, h - 44, w, 44); g.fillStyle = SAGE_INK; g.fillRect(0, h - 48, w, 4);
        }
      },
      collar: false,
      arms: {
        L: { hand: [-0.145, 1.42, 0.92], path: [[-0.46, 1.62, 0.1], [-0.52, 1.5, 0.46], [-0.3, 1.44, 0.78]], pawScale: 1.22, wrist: false },
        R: { hand: [0.145, 1.42, 0.92], path: [[0.46, 1.62, 0.1], [0.52, 1.5, 0.46], [0.3, 1.44, 0.78]], pawScale: 1.22, wrist: false }
      },
      sleeves: false,
      paws: { color: M('#F3EADB', 1.12), ink: CREAM_INK },
      belt: { yT: 1.31, yB: 1.19, color: SASH, line: false, knot: false, tassel: false },
      feet: false,
      tail: {
        pts: TAIL_PTS,
        r: TAIL_R, color: M('#FBEBD9', 0.8), deep: M('#EEDDD6', 0.8), tip: M('#FDF3E6', 0.8), tipStart: 0.8, bands: 0,
        paint(g, w, h, D0) {
          let seed = 1616; const K_r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, M('#F8E8D8', 0.8)); lg.addColorStop(0.25, M('#FBEBD9', 0.8)); lg.addColorStop(1, M('#FDF3E6', 0.8));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          // faint grey-mauve feathered shading in the lower-middle of the plume (only on part of the circumference)
          const band = g.createLinearGradient(0, 0, w, 0), mc = M('#E2CFCB', 0.88);
          band.addColorStop(0.12, NEKO.rgba(mc, 0)); band.addColorStop(0.3, NEKO.rgba(mc, 0.4)); band.addColorStop(0.5, NEKO.rgba(mc, 0.35)); band.addColorStop(0.64, NEKO.rgba(mc, 0));
          g.fillStyle = band; g.fillRect(0, 0, w, h);
          // feathered strokes inside the band
          g.filter = 'blur(3px)';
          for (let i = 0; i < 40; i++) {
            const c = 0.2 + K_r() * 0.36, y = h * K_r();
            D0.blob(g, c * w, y, 20 + K_r() * 20, 3 + K_r() * 3, M('#D8C4C0', 0.88), 0.45, 0.15);
          }
          g.filter = 'none';
        },
        shape: TAIL_SHAPE,
        fur: { layers: 12, length: 0.045, gravity: 0.01, repeat: [16, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, ribbon, medal, D } = K;
      const HY = K.cfg.head.y;

      /* ---------------- face: thin ω mouth under the low-set nose ---------------- */
      {
        const mm = std('#9A6A4A', { roughness: 0.6 }), faceParts = K.muzzle.concat(K.headMesh);
        const onF = (x, y) => K.onSkin(x, y, faceParts).p.add(V(0, 0, 0.006));
        const my = HY - 0.045;
        [-1, 1].forEach(sx => mesh(tube([[0.0, my], [0.02 * sx, my - 0.03], [0.05 * sx, my - 0.034], [0.08 * sx, my - 0.012]].map(([x, y]) => onF(x, y)), 0.0075, 24, 6), mm, K.faceG));
        mesh(tube([onF(0, HY - 0.02), onF(0, my)], 0.0075, 6, 6), mm, K.faceG);
      }

      /* ---------------- face: blush freckles ---------------- */
      {
        const g = K.headTex.image.getContext('2d');
        [-1, 1].forEach(sx => [-0.03, 0.03].forEach(dx => {
          const s = K.onSkin(sx * 0.39 + dx, HY - 0.1, [K.headMesh]);
          if (!s.uv) return;
          g.fillStyle = 'rgba(236,128,118,0.85)'; g.beginPath(); g.arc(s.uv.x * 1024, (1 - s.uv.y) * 512, 2.4, 0, Math.PI * 2); g.fill();
        }));
        K.headTex.needsUpdate = true;
      }

      /* ---------------- Persian mane: long fur locks around the cheeks and the chest ruff ---------------- */
      const edgeX = (y) => {
        let lo = 0, hi = 1.4;
        for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; const h = K.onSkin(m, y, [K.headMesh].concat(K.bib)); if (h.uv || h.p.z !== 0.85) lo = m; else hi = m; }
        return lo;
      };
      // all locks of one colour are merged into ONE mesh and given shell fur, so they read as soft wisps
      const mergeGeos = (geos) => {
        const pos = [], nor = [], uv = [], idx = []; let off = 0;
        geos.forEach(g => {
          const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
          for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); }
          if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off);
          off += p.count;
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); return geo;
      };
      const lockGeo = (root, dir, len, r0, bend) => {
        const d = V(dir[0], dir[1], dir[2]).normalize();
        const a = V(root[0], root[1], root[2]);
        const b = a.clone().addScaledVector(d, len * 0.55).add(V(0, bend * len, 0));
        const c = a.clone().addScaledVector(d, len);
        return tube([a, b, c], t => r0 * Math.pow(1 - t, 0.8) + 0.006, 16, 10);
      };
      const maneFur = [], maneCream = [];
      [-1, 1].forEach(sx => {
        // [height, angle below horizontal (deg), length, root radius]
        [[2.62, -18, 0.1, 0.07], [2.5, -2, 0.12, 0.08], [2.38, 12, 0.14, 0.09], [2.26, 24, 0.16, 0.1], [2.14, 32, 0.18, 0.1], [2.02, 40, 0.19, 0.1], [1.9, 48, 0.18, 0.1], [1.8, 58, 0.16, 0.09]]
          .forEach(([y, ang, len, r0], i) => {
            const ex = edgeX(y), a = ang * Math.PI / 180;
            const zz = [0.08, -0.04, 0.1, -0.05, 0.08, -0.05, 0.08, 0.02][i];
            (y > 2.2 ? maneFur : maneCream).push(lockGeo([sx * (ex - 0.1), y, zz], [sx * Math.cos(a), -Math.sin(a), zz * 0.8], len, r0 * 1.15, -0.1));
          });
        // mane continuing behind the cheeks
        [[2.45, -0.26, 0.13], [2.25, -0.32, 0.15], [2.05, -0.3, 0.16], [1.88, -0.24, 0.15], [2.62, -0.18, 0.11]].forEach(([y, z, len]) => {
          const ex = edgeX(y) * 0.92;
          maneFur.push(lockGeo([sx * (ex - 0.12), y, z], [sx * 0.45, -0.65, -0.62], len, 0.11, -0.05));
        });
      });
      // ruff tips hanging over the collar
      [[-0.62, 1.8, 0.2, -0.5], [-0.46, 1.74, 0.36, -0.3], [-0.26, 1.68, 0.5, -0.12], [0, 1.66, 0.56, 0], [0.26, 1.68, 0.5, 0.12], [0.46, 1.74, 0.36, 0.3], [0.62, 1.8, 0.2, 0.5]]
        .forEach(([x, y, z, dx]) => maneCream.push(lockGeo([x, y + 0.1, z - 0.03], [dx, -1, 0.3], 0.15, 0.085, 0)));
      const maneF = mesh(mergeGeos(maneFur), std(FUR_MID, { roughness: 0.95 }), K.faceG, null, null, INK);
      const maneC = mesh(mergeGeos(maneCream), std(M('#FFEEDB', 0.76), { roughness: 0.95 }), K.faceG, null, null, CREAM_INK);
      K.addFur(maneF, { layers: 12, length: 0.06, gravity: 0.02, repeat: [3, 4] });
      K.addFur(maneC, { layers: 12, length: 0.06, gravity: 0.02, repeat: [3, 4] });
      // soft white tufts inside the ears (one furry mesh per ear)
      {
        const tm = std(M('#FFFDF8', 0.8), { roughness: 0.95 });
        K.ears.forEach(({ g, sx }) => {
          const gs = [[-0.07, 0.0, 0.17, 0.055], [0.0, 0.03, 0.15, 0.05], [0.07, 0.0, 0.12, 0.045]].map(([x, y, len, r0]) =>
            lockGeo([x * sx, y + 0.14, 0.13], [-0.45 * sx - x * sx, 1, 0.25], len, r0, 0));
          const tf = mesh(mergeGeos(gs), tm, g);
          K.addFur(tf, { layers: 8, length: 0.035, gravity: 0.01, repeat: [2, 3] });
        });
      }

      /* ---------------- crown: full moon, auspicious clouds, osmanthus, leaves and gold pendants ---------------- */
      const crown = part('crown', K.head);
      crown.position.set(0, 2.85, 0.19);
      crown.rotation.x = -0.15;
      const goldMat = std(GOLD, { roughness: 0.45, metalness: 0.12 }), goldDk = std(GOLD_DK, { roughness: 0.45, metalness: 0.12 });
      // moon disc (painted on both faces so it still reads as a moon from behind)
      const twoFaced = (mg, r) => { const f = mg.children[1]; const bk = new THREE.Mesh(f.geometry, f.material); bk.rotation.y = Math.PI; bk.position.z = -r * 0.115; mg.add(bk); return mg; };
      twoFaced(medal(crown, [0, 0.33, -0.1], 0.21, (g) => {
        const rg = g.createRadialGradient(118, 110, 10, 128, 128, 128);
        rg.addColorStop(0, M('#FFF6D8')); rg.addColorStop(1, MOON);
        g.fillStyle = rg; g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
        g.filter = 'blur(3px)';
        [[92, 88, 30, 20], [160, 150, 34, 24], [104, 170, 22, 16], [170, 84, 18, 14], [130, 124, 14, 12]].forEach(([x, y, a, b]) => D.blob(g, x, y, a, b, MOON_DK, 0.75, 0.4));
        g.filter = 'none';
      }, GOLD_DK, GOLD_INK, MOON), 0.21);
      // union-of-circles outline → cloud shape
      const unionShape = (circles, yBottom, n) => {
        const s = new THREE.Shape();
        for (let i = 0; i <= (n || 120); i++) {
          const th = i / (n || 120) * Math.PI * 2, dx = Math.cos(th), dy = Math.sin(th);
          let best = 0;
          circles.forEach(([cx, cy, r]) => { const b = dx * cx + dy * cy, disc = b * b - (cx * cx + cy * cy) + r * r; if (disc >= 0) best = Math.max(best, b + Math.sqrt(disc)); });
          if (dy < -1e-4 && yBottom !== null) best = Math.min(best, yBottom / dy);
          i ? s.lineTo(dx * best, dy * best) : s.moveTo(dx * best, dy * best);
        }
        return s;
      };
      const cloudCircles = [[-0.075, -0.005, 0.07], [0.0, 0.035, 0.085], [0.08, 0.0, 0.065]];
      const cloudGeo = extrude(unionShape(cloudCircles, -0.06), 0.05, 0.015, 3, 10);
      const cloudTex = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = M('#FCEBC4', 0.95); g.fillRect(0, 0, w, h);
        // map shape coords [-0.2, 0.2] → canvas
        const cx = x => (x / 0.4 + 0.5) * w, cy = y => (0.5 - y / 0.4) * h;
        g.strokeStyle = GOLD_INK; g.lineWidth = 6; g.lineCap = 'round';
        g.beginPath(); g.arc(cx(0.0), cy(0.02), 0.04 / 0.4 * w, Math.PI * 0.2, Math.PI * 1.7); g.stroke();
        g.beginPath(); g.arc(cx(0.015), cy(0.03), 0.018 / 0.4 * w, Math.PI * 1.1, Math.PI * 2.6); g.stroke();
      });
      cloudTex.repeat.set(1 / 0.4, 1 / 0.4); cloudTex.offset.set(0.5, 0.5);
      const cloudMat = [texMat(cloudTex, { roughness: 0.6 }), std(M('#F6DDA8', 0.95), { roughness: 0.6 })];
      [-1, 1].forEach(sx => {
        const c = mesh(cloudGeo, cloudMat, crown, [0.36 * sx, 0.2, -0.03], [1.25 * sx, 1.25, 1], GOLD_INK);
        c.rotation.y = -0.28 * sx;
      });
      // leaves (upper pair beside the moon, lower pair under the clouds)
      const leafShape = (Ln, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, Ln * 0.45, 0, Ln); s.quadraticCurveTo(-w, Ln * 0.45, 0, 0); return s; };
      const leafGeo = extrude(leafShape(0.2, 0.075), 0.022, 0.008, 2, 12);
      const leafMat = std(LEAF, { roughness: 0.7 });
      [-1, 1].forEach(sx => {
        mesh(leafGeo, leafMat, crown, [0.2 * sx, 0.28, -0.07], null, SAGE_INK).rotation.set(0, 0, -0.55 * sx);
        mesh(leafGeo, leafMat, crown, [0.28 * sx, 0.1, 0.03], null, SAGE_INK).rotation.set(0, 0, -2.3 * sx);
      });
      // osmanthus flowers (3D, four round petals)
      const petalMat = std(OSM, { roughness: 0.6 }), osmCMat = std(OSM_C, { roughness: 0.6 });
      const flower3 = (parent, pos, s, rot) => {
        const f = group(parent, pos, [0, 0, rot || 0]);
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2;
          mesh(sphere(0.05 * s, 18, 12), petalMat, f, [Math.sin(a) * 0.05 * s, Math.cos(a) * 0.05 * s, 0], [0.9, 1, 0.45], GOLD_INK);
        }
        mesh(sphere(0.022 * s, 12, 10), osmCMat, f, [0, 0, 0.018 * s]);
        return f;
      };
      flower3(crown, [-0.19, 0.14, 0.1], 1.0, 0.2);
      flower3(crown, [0.2, 0.16, 0.1], 1.0, -0.25);
      // gold swag chain over the forehead with a centre bead and three pendants; it hugs the head (z from the skin + fur)
      {
        const hg = part('crown', K.head);   // same chip as the crown (character coordinates, unlike the tilted crown group)
        const sk = (x, y) => { const h = K.onSkin(x, y, [K.headMesh]); return (h.uv ? h.p.z : 0.3) + 0.09; };
        [-1, 1].forEach(sx => mesh(tube([[0.19 * sx, 3.0], [0.13 * sx, 2.95], [0.06 * sx, 2.95], [0, 2.965]].map(([x, y]) => [x, y, sk(x, y)]), 0.009, 24, 6), goldMat, hg));
        mesh(sphere(0.034, 18, 14), goldMat, hg, [0, 2.965, sk(0, 2.965) + 0.01], null, GOLD_INK);
        const pend = (x, yTop, h) => {
          const z = sk(x, yTop - 0.5 * h) + 0.02;
          mesh(tube([[x, yTop + 0.03, z - 0.01], [x, yTop - 0.005, z]], 0.006, 4, 6), goldMat, hg);
          mesh(K.dropGeo(h, h * 0.38, 1.6), goldDk, hg, [x, yTop - 0.7 * h, z], null, GOLD_INK);
        };
        pend(0, 2.935, 0.11);
        pend(-0.13, 2.93, 0.07); pend(0.13, 2.93, 0.07);
      }

      /* ---------------- crossed collar: lavender band with a sage inner edge ---------------- */
      const robeG = K.robeG;
      {
        const lavMat = std(LAV, { roughness: 0.85, side: THREE.DoubleSide }), sageMat = std(SAGE, { roughness: 0.85, side: THREE.DoubleSide });
        [-1, 1].forEach(sx => {
          const pts = (off) => [K.onRobe(-70 * sx, 1.66, off), K.onRobe(-40 * sx, 1.6, off), K.onRobe(-20 * sx, 1.46, off), K.onRobe(-8 * sx, 1.32, off)];
          mesh(ribbon(pts(0.035).map(p => p.clone().add(V(0, 0, 0))), 0.1, { face: [0, 0, 1] }), lavMat, robeG, [0.035 * sx, 0, 0], null, LAV_INK);
          mesh(ribbon(pts(0.045), 0.05, { face: [0, 0, 1] }), sageMat, robeG, [0.075 * sx, 0, 0.004], null, SAGE_INK);
        });
      }

      /* ---------------- wide sleeves: bells hanging from the shoulders (front outline taken from the picture) ---------------- */
      // profile tables [y, value] for the IMAGE-RIGHT sleeve (mirrored for the left one)
      const tab = (T) => (y) => { if (y <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (y <= T[i][0]) return lerp(T[i - 1][1], T[i][1], (y - T[i - 1][0]) / (T[i][0] - T[i - 1][0])); return T[T.length - 1][1]; };
      const xIn = tab([[0.4, 0.5], [0.6, 0.44], [1.0, 0.31], [1.4, 0.23], [1.76, 0.3]]);
      const xOut = tab([[0.4, 1.03], [0.55, 1.02], [0.7, 0.94], [0.85, 0.86], [1.0, 0.8], [1.2, 0.8], [1.4, 0.9], [1.6, 0.93], [1.76, 0.88]]);
      const zF = tab([[0.4, 0.94], [0.8, 0.92], [1.2, 0.88], [1.5, 0.84], [1.76, 0.7]]);
      const zB = tab([[0.4, -0.44], [1.0, -0.36], [1.5, -0.3], [1.76, -0.2]]);
      const YS = 1.25, YTOP = 1.78, Y0 = 0.3, Y1 = 1.8;
      const yBot = (phi) => 0.49 - 0.09 * Math.cos(phi) - 0.02 * Math.sin(phi);   // outer 0.40, inner 0.58
      const spow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);
      const bellGeo = (sx, o) => {
        const NA = 96, NV = 60, pos = [], uv = [], idx = [];
        for (let j = 0; j <= NV; j++) {
          const v = j / NV;
          for (let i = 0; i <= NA; i++) {
            const phi = i / NA * Math.PI * 2;
            const yb = yBot(phi) - (o.dB || 0), y = lerp(yb, YTOP - (o.dT || 0), Math.pow(v, 0.9));
            const k = y > YS ? Math.sqrt(Math.max(0, 1 - Math.pow((y - YS) / (YTOP - (o.dT || 0) - YS), 2))) : 1;
            const xi = xIn(y), xo = xOut(y), xc = (xi + xo) / 2, ax = (xo - xi) / 2 * (o.w || 1);
            const zc = (zF(y) + zB(y)) / 2, az = (zF(y) - zB(y)) / 2 * (o.w || 1);
            const x = xc + ax * k * spow(Math.cos(phi), 0.72), z = zc + az * k * spow(Math.sin(phi), 0.72);
            // the top slopes down toward the wrist (front) like a real hanging sleeve
            const yS = y - 0.16 * Math.max(0, z - zc) / az * sst(1.0, 1.78, y);
            pos.push(x * sx, yS, z); uv.push(i / NA, (y - Y0) / (Y1 - Y0));
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
        // make sure normals point outward (test a vertex on the outer side)
        const kk = Math.floor(NV / 2) * (NA + 1);
        const pv = V().fromBufferAttribute(geo.attributes.position, kk), nv = V().fromBufferAttribute(geo.attributes.normal, kk);
        if (nv.x * sx < 0) { for (let q = 0; q < idx.length; q += 3) { const tt = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tt; } geo.setIndex(idx); K.smoothNormals(geo); }
        const hem = []; for (let i = 0; i < NA; i++) hem.push(V(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
        return { geo, hem, pv };
      };
      const ROBE_INK = '#C9A57C';
      const sleeveTex = canvasTex(1024, 1024, (g, w, h) => {
        const row = y => (1 - (y - Y0) / (Y1 - Y0)) * h, col = phi => phi / (Math.PI * 2) * w;
        D.fill(g, ROBE);
        // lavender shoulder cap over the outer top
        g.fillStyle = LAV; g.strokeStyle = LAV_INK; g.lineWidth = 4;
        const cap = (x0, x1) => { g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0, row(1.56)); g.quadraticCurveTo((x0 + x1) / 2, row(1.3), x1, row(1.56)); g.lineTo(x1, 0); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(x0, row(1.56)); g.quadraticCurveTo((x0 + x1) / 2, row(1.3), x1, row(1.56)); g.stroke(); };
        cap(col(-0.32 * Math.PI) + w, col(0.32 * Math.PI) + w); cap(col(-0.32 * Math.PI), col(0.32 * Math.PI));
        // osmanthus sprig on the front face (canvas is stretched ~1.85x horizontally there)
        g.save(); g.translate(col(0.5 * Math.PI), row(1.13)); g.scale(0.56, 1); osmSprig(g, 0, 0, 230, D, LEAF, OSM, OSM_C); g.restore();
        // hem band following the slanted bottom edge
        for (let x = 0; x < w; x += 2) {
          const phi = x / w * Math.PI * 2, yb = yBot(phi);
          g.fillStyle = SAGE; g.fillRect(x, row(yb + 0.075), 3, row(yb - 0.05) - row(yb + 0.075));
          g.fillStyle = SAGE_INK; g.fillRect(x, row(yb + 0.075) - 3, 3, 3);
        }
        // opening bands along the inner-front edge, slanting outward toward the hem:
        // lavender (outer) and sage (inner, ending in a round U), ink lines between
        const bandAt = (y) => { const t = sst(1.45, 0.55, y); return [lerp(0.67, 0.47, t), lerp(0.8, 0.62, t), lerp(0.9, 0.73, t)].map(f => col(f * Math.PI)); };
        const poly = (fa, fb, yTop, yBotm, color, stroke) => {
          const L = [], R = [];
          for (let y = yBotm; y <= yTop + 1e-6; y += 0.02) { const b2 = bandAt(y); L.push([b2[fa], row(y)]); R.push([b2[fb], row(y)]); }
          g.fillStyle = color; g.beginPath(); L.concat(R.reverse()).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
        };
        poly(0, 2, 1.8, 0.3, LAV);
        // sage inner band with a rounded lower end at y ≈ 0.78
        g.save(); g.beginPath();
        const U = []; for (let y = 1.8; y >= 0.86; y -= 0.02) U.push([bandAt(y)[1], row(y)]);
        const bL = bandAt(0.86), bR = bandAt(0.86);
        U.push([(bL[1] + bR[2]) / 2 - 10, row(0.78)]);
        for (let y = 0.86; y <= 1.8; y += 0.02) U.push([bandAt(y)[2], row(y)]);
        g.fillStyle = SAGE; g.beginPath(); U.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
        g.strokeStyle = SAGE_INK; g.lineWidth = 4; g.stroke(); g.restore();
        g.strokeStyle = LAV_INK; g.lineWidth = 4; g.beginPath();
        for (let y = 0.3; y <= 1.8; y += 0.02) { const b2 = bandAt(y); y === 0.3 ? g.moveTo(b2[0], row(y)) : g.lineTo(b2[0], row(y)); } g.stroke();
      });
      const sleeveMat = texMat(sleeveTex, { roughness: 0.9 });
      const liningMat = std(LAV, { side: THREE.BackSide, roughness: 0.9 });
      const underMat = std(LAV, { roughness: 0.9, side: THREE.DoubleSide });
      const sleevesG = part('sleeves', K.body);
      [-1, 1].forEach(sx => {
        const outer = bellGeo(sx, {});
        mesh(outer.geo, sleeveMat, sleevesG, null, null, ROBE_INK);
        const lin = new THREE.Mesh(outer.geo, liningMat); lin.receiveShadow = true; sleevesG.add(lin);
        mesh(tube(outer.hem, 0.012, 160, 6, true), std(SAGE_DK, { roughness: 0.8 }), sleevesG);
        const under = bellGeo(sx, { dB: 0.05, dT: 0.25, w: 0.965 });
        mesh(under.geo, underMat, sleevesG, null, null, LAV_INK);
      });

      /* ---------------- front skirt panel: rice ears, crescent, cloud, osmanthus ---------------- */
      const apronG = part('apron', K.body);
      {
        const y0 = 0.15, y1 = 1.2, nu = 24, nv = 30, R = 1.2, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, y = lerp(y0, y1, t), hw = lerp(0.41, 0.28, t), zf = lerp(0.86, 0.52, Math.pow(t, 0.9));
          for (let i = 0; i <= nu; i++) {
            const s = i / nu, x = lerp(-hw, hw, s);
            // curved lower edge: the centre hangs lower
            const yy = j === 0 ? y - 0.04 * Math.cos((s - 0.5) * Math.PI) : y;
            let z = zf - (R - Math.sqrt(R * R - x * x));
            z = Math.max(z, Math.sqrt(Math.max(K.robeR(yy) ** 2 - x * x, 0)) + 0.025);
            pos.push(x, yy, z); uv.push(s, t);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); geo.computeVertexNormals();
        const tex = canvasTex(384, 768, (g, w, h) => {
          D.fill(g, M('#F7EEDC'));
          const yy = y => (1 - (y - y0) / (y1 - y0)) * h;
          // borders: sage on the image-left and the bottom, lavender on the image-right
          g.fillStyle = SAGE; g.fillRect(0, 0, 40, h); g.fillRect(0, h - 44, w, 44);
          g.fillStyle = LAV; g.fillRect(w - 42, 0, 42, h - 44);
          g.fillStyle = SAGE_INK; g.fillRect(40, 0, 4, h - 44); g.fillRect(40, h - 48, w - 82, 4);
          g.fillStyle = LAV_INK; g.fillRect(w - 46, 0, 4, h - 44);
          // (the panel is ~1.4x wider than the canvas aspect, so round motifs are drawn with an x-scale of 0.72)
          const SXC = 0.86;
          const at = (x, y, fn) => { g.save(); g.translate(x, y); g.scale(SXC, 1); fn(); g.restore(); };
          // rice ears with long grass blades
          g.lineCap = 'round';
          const blade = (x0, y0_, cx, cy, x1, y1_, lw) => { g.strokeStyle = LEAF; g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0_); g.quadraticCurveTo(cx, cy, x1, y1_); g.stroke(); };
          blade(112, h - 58, 96, h - 160, 52, h - 250, 11);
          blade(120, h - 58, 180, h - 140, 280, h - 150, 11);
          blade(116, h - 58, 150, h - 180, 215, h - 270, 10);
          blade(118, h - 58, 200, h - 100, 300, h - 95, 9);
          g.strokeStyle = GOLD_DK; g.lineWidth = 6;
          [[116, 1.0, 0.0, 148], [120, 0.9, 0.3, 168], [124, 0.76, 0.6, 160]].forEach(([x, k, ang, s2]) => {
            g.save(); g.translate(x, h - 66); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-10 + ang * 30, -s2 * 0.6, ang * 70, -s2 * k * 1.6); g.stroke(); g.restore();
          });
          at(108, h - 312, () => grainEar(g, 0, 0, 175, GOLD_DK, -0.3));
          at(148, h - 290, () => grainEar(g, 0, 0, 155, GOLD_DK, 0.05));
          at(170, h - 240, () => grainEar(g, 0, 0, 125, GOLD_DK, 0.3));
          at(300, yy(0.7), () => crescent(g, 0, 0, 46, GOLD_DK, -0.15));
          // lavender cloud
          at(290, yy(0.5), () => {
            g.fillStyle = LAV; [[0, -6, 36], [-36, 8, 26], [36, 10, 24]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
            g.beginPath(); g.ellipse(0, 18, 60, 17, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = LAV_INK; g.lineWidth = 5; g.beginPath(); g.arc(-2, -6, 15, Math.PI * 0.2, Math.PI * 1.6); g.stroke();
          });
          at(290, yy(0.3), () => osm(g, 0, 0, 72, OSM, OSM_C, 0.2));
        });
        mesh(geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.9 }), apronG, null, null, SAGE_INK);
      }

      /* ---------------- belt: gold cord, bow knot and a double tassel ---------------- */
      {
        const beltG = K.beltG, yK = 1.245, zK = K.robeR(yK) + 0.07;
        const cord = mesh(new THREE.TorusGeometry(K.robeR(1.3) + 0.035, 0.014, 8, 128), goldMat, beltG, [0, 1.3, 0]); cord.rotation.x = Math.PI / 2;
        mesh(sphere(0.042, 20, 14), goldMat, beltG, [0, yK, zK + 0.03], [1, 1.15, 1], GOLD_INK);
        // two drooping bow loops pointing down-outward
        [-1, 1].forEach(sx => {
          const l = mesh(new THREE.TorusGeometry(0.068, 0.016, 10, 40), goldMat, beltG, [0.085 * sx, yK - 0.095, zK + 0.035], [0.6, 1.25, 1], GOLD_INK);
          l.rotation.set(0.15, 0.25 * sx, 0.95 * sx);
        });
        // two cords down to the tassels, which hang in front of the skirt panel
        const zT = 0.7, yT = 1.02;
        [-1, 1].forEach(sx => mesh(tube([[0.008 * sx, yK - 0.03, zK + 0.04], [0.02 * sx, yK - 0.12, (zK + zT) / 2 + 0.02], [0.03 * sx, yT + 0.02, zT]], 0.011, 20, 6), goldMat, beltG));
        const tasG = group(beltG, [0, yT, zT]);
        const tm = std(GOLD, { roughness: 0.6 }), tmD = std(GOLD_DK, { roughness: 0.6 });
        [-0.033, 0.033].forEach(dx => {
          mesh(sphere(0.026, 16, 12), goldMat, tasG, [dx, 0, 0], null, GOLD_INK);
          mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.035, 16), tmD, tasG, [dx, -0.035, 0], null, GOLD_INK);
          // tassel body: a flared bundle with strand grooves
          const body = K.lathe([[0.001, -0.05], [0.026, -0.052], [0.03, -0.1], [0.036, -0.17], [0.038, -0.2], [0.001, -0.205]], 24);
          mesh(body.geo, tm, tasG, [dx, 0, 0], null, GOLD_INK);
          for (let i = 0; i < 5; i++) {
            const a = -0.9 + i * 0.45;
            mesh(tube([[dx + Math.sin(a) * 0.028, -0.06, Math.cos(a) * 0.028], [dx + Math.sin(a) * 0.037, -0.19, Math.cos(a) * 0.037]], 0.003, 4, 4), tmD, tasG);
          }
        });
        K.onTick((t, k) => { tasG.rotation.z = 0.06 * Math.sin(t * 1.6) * k; });
      }

      /* ---------------- paws: bigger cream mittens with toe grooves ---------------- */
      {
        const PS = 1.22, rx = 0.12 * PS, ry = 0.12 * PS * 0.88, rz = 0.12 * PS * 0.95;
        const toeMat = std('#D2AE88', { roughness: 0.8 });
        ['L', 'R'].forEach(k2 => {
          const P0 = K.hands[k2].p, sx = k2 === 'L' ? -1 : 1;
          const on = (dx, dy) => V(P0.x + dx, P0.y + dy, P0.z + rz * Math.sqrt(Math.max(0, 1 - (dx / rx) ** 2 - (dy / ry) ** 2)) + 0.003);
          [-0.035, 0.03].forEach(dx => {
            const x0 = dx + 0.012 * sx;
            mesh(tube([on(x0, -0.035), on(x0 * 1.05, -0.075), on(x0 * 1.1, -0.11)], 0.0055, 10, 5), toeMat, K.poseG);
          });
        });
        // wrists: a lavender inner sleeve slides out of each big sleeve's inner-front face, ends in a sage cuff,
        // and a short cream wrist carries on into the paw, so the paws clearly belong to the arms
        const cuffMat = std(LAV, { roughness: 0.9, side: THREE.DoubleSide }), trimMat = std(SAGE_DK, { roughness: 0.8 });
        const wristMat = std(M('#F3EADB', 1.12), { roughness: 0.9 });
        ['L', 'R'].forEach(k2 => {
          const sx = k2 === 'L' ? -1 : 1, P0 = K.hands[k2].p;
          const a = V(0.5 * sx, 1.53, 0.42), c = P0.clone();
          const b = a.clone().lerp(c, 0.6), dir = c.clone().sub(a).normalize();
          mesh(tube([a, a.clone().lerp(b, 0.5).add(V(0, 0.012, 0)), b], t => 0.1 + 0.012 * t, 16, 20), cuffMat, K.poseG, null, null, LAV_INK);
          const ring = mesh(new THREE.TorusGeometry(0.108, 0.015, 10, 40), trimMat, K.poseG, b, null, SAGE_INK);
          ring.quaternion.setFromUnitVectors(V(0, 0, 1), dir);
          mesh(tube([b.clone().addScaledVector(dir, -0.08), c.clone().addScaledVector(dir, -0.04)], 0.078, 8, 18), wristMat, K.poseG, null, null, CREAM_INK);
        });
      }

      /* ---------------- moon scroll (掛軸) held upright in both paws ---------------- */
      const scrollG = part('scroll', K.body);
      {
        const W = 0.25, H = 0.64, sg = group(scrollG, [0, 1.34, 0.88]);
        const tex = canvasTex(256, 656, (g, w, h) => {
          g.fillStyle = M('#FBF2D8'); g.fillRect(0, 0, w, h);
          g.strokeStyle = GOLD_DK; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
          g.strokeStyle = M('#F2D9A0'); g.lineWidth = 4; g.strokeRect(28, 24, w - 56, h - 48);
          crescent(g, 128, 150, 52, GOLD_DK, -0.15);
          osmSprig(g, 118, 440, 210, D, LEAF, OSM, OSM_C);
        });
        tex.repeat.set(1 / W, 1 / H); tex.offset.set(0.5, 0.5);
        mesh(K.roundBox(W, H, 0.03, 0.01, 0.006), [texMat(tex, { roughness: 0.6 }), std(GOLD_DK, { roughness: 0.5 })], sg, [0, H / 2, 0], null, GOLD_INK);
        // top roller with knobs and the little finial
        const rod = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.3, 20), goldMat, sg, [0, H + 0.02, 0], null, GOLD_INK); rod.rotation.z = Math.PI / 2;
        [-1, 1].forEach(sx => mesh(sphere(0.036, 18, 14), goldMat, sg, [0.155 * sx, H + 0.02, 0], null, GOLD_INK));
        mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.03, 20), goldMat, sg, [0, H + 0.06, 0], null, GOLD_INK);
        mesh(sphere(0.03, 18, 14), goldMat, sg, [0, H + 0.09, 0], [1, 0.9, 1], GOLD_INK);
        const rod2 = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.27, 16), goldMat, sg, [0, -0.01, 0], null, GOLD_INK); rod2.rotation.z = Math.PI / 2;
      }

      /* ---------------- fluffy legs and big cream feet ---------------- */
      {
        const legMat = std(M('#FFFAF0', 0.6), { roughness: 0.95 });
        [-1, 1].forEach(sx => {
          const lg = mesh(sphere(0.3, 32, 24), legMat, K.poseG, [0.46 * sx, 0.3, 0.2], [1.15, 0.72, 1.1], CREAM_INK);
          K.addFur(lg, { layers: 14, length: 0.08, gravity: 0.03, repeat: [5, 4] });
          const fg = group(K.poseG, [0.4 * sx, 0, 0.5]);
          mesh(sphere(0.2, 32, 24), legMat, fg, [0, 0.12, 0], [1.25, 0.64, 1.25], CREAM_INK);
          const cm = std('#D2AE88', { roughness: 0.8 });
          [-0.055, 0.055].forEach(dx => mesh(tube([[dx, 0.2, 0.205], [dx * 1.05, 0.13, 0.25], [dx * 1.1, 0.05, 0.225]], 0.0065, 8, 5), cm, fg));
        });
      }

      /* ---------------- feathery plume: soft locks along both edges of the tail (front-view plane) ---------------- */
      {
        const base = V(...TAIL_PTS[0]);
        const cv = new THREE.CatmullRomCurve3(TAIL_PTS.map(p => V(...p).sub(base)));
        const geos = [];
        const N = 16;
        for (let i = 0; i < N; i++) {
          const t = 0.12 + 0.62 * i / (N - 1), side = i % 2 ? 1 : -1;
          const p = cv.getPointAt(t), tg = cv.getTangentAt(t);
          const perp = V(-tg.y, tg.x, 0).normalize().multiplyScalar(side);
          const r = TAIL_R * TAIL_SHAPE(t);
          const root = p.clone().addScaledVector(perp, r * 0.62).add(V(0, 0, 0.04 * (K.rand() - 0.5)));
          const dir = tg.clone().multiplyScalar(0.85).addScaledVector(perp, 0.55).normalize();
          const len = (0.13 + 0.07 * Math.sin(Math.PI * t)) * (t > 0.9 ? 0.8 : 1);
          geos.push(lockGeo([root.x, root.y, root.z], [dir.x, dir.y, dir.z], len, Math.max(0.05, r * 0.32), 0));
        }
        // the pointed, down-hooking tip lock
        {
          const p = cv.getPointAt(0.9), tg = cv.getTangentAt(0.9);
          geos.push(lockGeo([p.x, p.y, p.z], [tg.x, tg.y - 0.25, tg.z], 0.26, TAIL_R * TAIL_SHAPE(0.9) * 0.9, 0.05));
        }
        const plume = mesh(mergeGeos(geos), std(M('#FBEBD9', 0.8), { roughness: 0.95 }), K.tailG, null, null, INK);
        K.addFur(plume, { layers: 10, length: 0.04, gravity: 0.01, repeat: [3, 4] });
      }

      /* ---------------- floating mid-autumn decorations ---------------- */
      {
        const items = [];
        // full moon
        const moonG = group(K.decor, [1.75, 3.3, -0.3]);
        twoFaced(medal(moonG, [0, 0, 0], 0.3, (g) => {
          g.fillStyle = MOON; g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
          g.filter = 'blur(4px)';
          [[90, 90, 34, 24], [165, 150, 38, 26], [100, 175, 26, 18], [172, 82, 20, 16]].forEach(([x, y, a, b]) => D.blob(g, x, y, a, b, MOON_DK, 0.8, 0.5));
          g.filter = 'none';
        }, GOLD_DK, GOLD_INK, MOON), 0.3);
        items.push(moonG);
        // jade rabbit (leaping)
        const rab = group(K.decor, [-2.0, 2.55, 0.1]);
        {
          const wm = std(M('#FDF8EE'), { roughness: 0.9 }), pk = std(M('#F4B6AE'), { roughness: 0.8 });
          mesh(sphere(0.2, 24, 18), wm, rab, [0, 0, 0], [1.4, 0.85, 0.9], CREAM_INK);
          mesh(sphere(0.13, 24, 18), wm, rab, [0.26, 0.1, 0], null, CREAM_INK);
          [-0.03, 0.03].forEach((dz, i) => { const e = mesh(sphere(0.05, 16, 12), wm, rab, [0.2 - i * 0.04, 0.28, dz], [0.55, 1.9, 0.5], CREAM_INK); e.rotation.z = 0.5 + i * 0.25; });
          mesh(sphere(0.02, 10, 8), pk, rab, [0.34, 0.12, 0.08]);
          mesh(sphere(0.07, 14, 10), wm, rab, [-0.3, 0.02, 0], null, CREAM_INK);
          mesh(sphere(0.08, 16, 12), wm, rab, [-0.18, -0.12, 0.04], [1.6, 0.6, 0.8], CREAM_INK);
          mesh(sphere(0.06, 16, 12), wm, rab, [0.18, -0.12, 0.04], [1.4, 0.6, 0.8], CREAM_INK);
        }
        items.push(rab);
        // falling golden leaves
        const lg = extrude(leafShape(0.3, 0.12), 0.025, 0.008, 2, 12), lm = std(M('#F4C564'), { roughness: 0.7 });
        [[-1.9, 3.3, 0.0, 0.9], [-2.0, 0.9, 0.3, 0.7], [2.1, 1.25, 0.2, -2.6], [-1.6, 0.25, 0.4, 2.2]].forEach(([x, y, z, r], i) => {
          const gg = group(K.decor, [x, y, z], [0.2, 0.3 * (i % 2 ? 1 : -1), r]);
          mesh(lg, lm, gg, [0, -0.15, 0], null, GOLD_INK);
          mesh(tube([[0, -0.15, 0], [0.01, -0.22, 0]], 0.008, 4, 5), lm, gg);
          items.push(gg);
        });
        // osmanthus blossoms
        [[-1.5, 2.3, 0.2, 1.35], [-1.55, 1.3, 0.3, 1.5], [1.35, 2.95, 0.0, 1.3], [2.0, 0.55, 0.3, 1.4]].forEach(([x, y, z, s]) => items.push(flower3(K.decor, [x, y, z], s, K.rand())));
        // rice ears
        const rice = group(K.decor, [1.95, 1.55, 0.1]);
        {
          const stem = std(M('#AEB58C'), { roughness: 0.8 }), grain = std(GOLD, { roughness: 0.6 });
          mesh(tube([[0, -0.4, 0], [0.02, 0.1, 0], [0.12, 0.5, 0], [0.3, 0.62, 0]], 0.012, 30, 6), stem, rice);
          mesh(tube([[0.02, -0.3, 0], [0.1, 0.1, 0], [0.3, 0.35, 0], [0.45, 0.3, 0]], 0.011, 30, 6), stem, rice);
          const ear = (pts) => { const cv = K.curve3(pts); for (let i = 0; i < 9; i++) { const p = cv.getPointAt(0.2 + i * 0.1); [-1, 1].forEach(k => mesh(sphere(0.03, 10, 8), grain, rice, [p.x + k * 0.02, p.y + 0.005, p.z], [0.8, 1.3, 0.7], GOLD_INK)); } };
          ear([[0.12, 0.5, 0], [0.3, 0.62, 0], [0.42, 0.52, 0]]);
          ear([[0.3, 0.35, 0], [0.45, 0.3, 0], [0.52, 0.18, 0]]);
          const blade = (pts, w) => mesh(ribbon(pts, t => w * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.004, { face: [0, 0, 1] }), std(LEAF, { side: THREE.DoubleSide, roughness: 0.8 }), rice);
          blade([[0, -0.4, 0], [-0.08, 0.0, 0.01], [-0.12, 0.35, 0]], 0.06);
          blade([[0.01, -0.35, 0], [0.2, -0.05, 0.01], [0.42, 0.02, 0]], 0.06);
        }
        items.push(rice);
        // swirling clouds
        const swirl = (pos, s) => {
          const gg = group(K.decor, pos); gg.scale.setScalar(s);
          const cm = std(M('#FBEFC8'), { roughness: 0.8 });
          const pts = []; for (let i = 0; i <= 50; i++) { const a = i / 50 * Math.PI * 2.6, r = 0.05 + 0.16 * (i / 50); pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]); }
          mesh(tube(pts, 0.035, 80, 8), cm, gg, null, null, GOLD_INK);
          mesh(tube([[0.2, -0.02, 0], [0.5, -0.12, 0], [0.9, -0.08, 0]], t => 0.035 * (1 - 0.8 * t), 30, 8), cm, gg, null, null, GOLD_INK);
          return gg;
        };
        items.push(swirl([-2.0, 1.75, -0.1], 1));
        items.push(swirl([1.75, 2.45, -0.1], 0.9));
        items.forEach((g) => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.0 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.1 * Math.sin(t * 0.7 + i) * k;
        }));
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '秋分・捧月的嫦娥貓',
        text: '秋分晝夜等長、正逢中秋前後，這隻奶油色波斯貓化身月宮嫦娥：頭戴滿月桂花冠、雙手捧著畫有彎月的小掛軸，身上的稻穗與桂花訴說秋收。配色以月白奶油、薰衣草紫、鼠尾草綠與桂花金為主，溫柔得像一輪秋月。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '扁臉圓眼的波斯貓',
        text: '寬大的扁平臉、低低的小粉鼻就在兩眼之間，是波斯貓的招牌五官。深棕色的大圓眼配上「ω」小嘴與帶兩個小點的腮紅；額頭有淡灰褐的虎斑紋，兩頰外側也掃著幾道灰紋。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '大耳與白耳毛',
        text: '一對大三角耳斜斜張開在髮冠兩側，耳內淡粉，冒出一撮撮白色長耳毛，和蓬鬆的頭毛連成一片。' },
      crown: { chip: '月冠', tag: '服飾', name: '滿月桂花冠',
        text: '頭頂正中是一輪淡黃滿月，兩旁托著奶黃色祥雲與綠葉，前方簪著兩朵金黃桂花。一條金色瓔珞垂在額前，正中掛著水滴墜，兩側各一顆小墜子。' },
      scroll: { chip: '掛軸', tag: '道具', name: '彎月桂花小掛軸',
        text: '兩隻前爪併攏，在胸前直立捧著一幅奶油色小掛軸：上端是金色軸桿與圓頭，頂端有個小寶頂；軸面畫著金色彎月和一枝綠葉桂花。' },
      robe: { chip: '衣襟', tag: '服飾', name: '紫綠交領',
        text: '蓬鬆的白色胸毛下，露出薰衣草紫與鼠尾草綠兩層交領；前裙左側垂著一道鼠尾草綠長襟、右側是薰衣草紫長襟，一路垂到下襬，層層疊疊像月色下的霞光。' },
      sleeves: { chip: '大袖', tag: '服飾', name: '垂地大袖',
        text: '奶油色的大袖寬得像兩口鐘，一路垂到膝下；袖面繡著黃花綠葉的桂花枝，袖口是紫、綠兩道長長的衣緣，下襬收一圈綠邊，裡面還透出一層淡紫內袖，肩頭也露出紫色。' },
      apron: { chip: '前裙', tag: '服飾', name: '稻穗彎月前裙',
        text: '腰下垂著一片奶油色前裙，左緣與下緣鑲鼠尾草綠、右緣是薰衣草紫。裙面畫著金黃稻穗與長葉、一彎金月、一朵淡紫祥雲和一朵桂花，把秋收與賞月畫在身上。' },
      belt: { chip: '腰結', tag: '服飾', name: '灰綠腰帶與金穗',
        text: '灰綠色的腰帶上繞一圈金繩，正中打成雙耳金結，綴一顆金珠，下面垂著兩束並排的金色流蘇。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '羽毛般的大尾巴', dir: [1, 0.25, -0.75],
        text: '又大又蓬的奶油色尾巴從右後方揚起，像一根大羽毛，尾尖向外捲成小勾；中段有一抹淡灰紫的虎斑陰影。' },
      pose: { chip: '腳掌', tag: '貓咪本體', name: '毛茸茸的大腳',
        text: '裙襬下露出一圈蓬鬆的腿毛和兩隻圓滾滾的奶油色大腳掌，腳趾縫清楚可見，站得端端正正。' }
    },
    order: ['overview', 'face', 'ears', 'crown', 'scroll', 'robe', 'sleeves', 'apron', 'belt', 'tail', 'pose']
  });
})();
