// @file 17_寒露_暹羅貓
// @title 寒露・雁翎劍俠 | 二十四節氣貓
// 寒露：暹羅貓化身仗劍的白袍少俠。頭戴小金冠、插一根往右甩的淡紫灰雁翎，額前月光石額飾；
// 白毛圍領、金色雲紋肩甲、米白長袍配鼠尾草綠襟邊與綠玉璧腰帶，披藕紫灰長披風；左爪舉直劍，右爪搭在腰側。
(function () {
  // The renderer brightens front-facing surfaces by roughly 1.45x (linear). M() turns a colour SAMPLED
  // from refs/17.png into the material colour that renders back to about that value (creams: lighter f).
  function M(hex, f) {
    f = f || 1.45; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f, 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  // picture px → world units (x = 251 is the body axis, y = 490 is the boot soles)
  const S = 0.009, X = px => (px - 251) * S, Y = py => (490 - py) * S;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const pw = (arr, t) => { // piecewise-linear lookup of [[t, v], ...]
    for (let i = 0; i < arr.length - 1; i++) if (t <= arr[i + 1][0]) return lerp(arr[i][1], arr[i + 1][1], (t - arr[i][0]) / (arr[i + 1][0] - arr[i][0]));
    return arr[arr.length - 1][1];
  };

  // ---- colours sampled from refs/17.png (then compensated) ----
  const FUR_TOP = M('#F8E6D0', 1.2), FUR = M('#FAEAD6', 1.2), FUR_LOW = M('#F3DCC4', 1.2), INK = '#B99478';
  const MASK = M('#8C6552'), MASK_DK = M('#7A5443');
  const POINT = M('#845E49'), POINT_DK = M('#7B5643'), POINT_LT = M('#A88469'), POINT_INK = '#57392B';
  const EAR_IN = M('#F0CBB4', 1.3), TUFT = M('#F6E6D4', 1.15);
  const CREAM = M('#FBF1E3', 1.15), CREAM_SH = M('#EFE2CF', 1.15), CREAM_INK = '#BFA487';
  const SAGE = M('#A4A58F'), SAGE_LT = M('#B7B8A2'), SAGE_DK = M('#8C8E78'), SAGE_INK = '#6C705C';
  const GOLD = M('#F1CE9E', 1.3), GOLD_MID = M('#E6BD85'), GOLD_DK = M('#D6A96C'), GOLD_INK = '#A7814D';
  const SLATE = M('#A3A8B8'), SLATE_DK = M('#8B90A2'), SLATE_INK = '#676C80';
  const LAV = M('#A596AE'), LAV_LT = M('#BCAEBF'), LAV_INK = '#6C5F7E';
  const LINING = M('#ADA9B8');
  const CAPE = M('#AEADB8'), CAPE_DK = M('#9A97A6'), CAPE_LT = M('#D9D5DF', 1.3), CAPE_INK = '#77738A';
  const PLUME = M('#B4ACC3'), PLUME_LT = M('#D0CADA', 1.3), PLUME_DK = M('#9A92AE'), PLUME_INK = '#8A84A0';
  const BELT = M('#9A8175'), BELT_INK = '#6A5549', JADE = M('#B5B49A'), JADE_INK = '#7B7B60';
  const BOOT = M('#7A6254'), BOOT_INK = '#4B3A31', SOLE = M('#EFD5B3', 1.3);
  const BLADE = M('#E2E4E8', 1.2), RIDGE = M('#B7C1D1'), BLADE_INK = '#8C8790', GEM = M('#C4D0D8', 1.2);
  const PANTS = M('#FBF0E1', 1.15);
  const PINE = M('#AEB39B'), REED = M('#E6D3B4', 1.2), REED_DK = M('#CDB894');

  // image-left paw (sword) and image-right paw (resting on the sash by the belt)
  const HAND_L = [X(150), Y(281), 0.34], HAND_R = [X(295), Y(318), 0.5];
  const SWORD_ROT = Math.atan2(48, 102);   // blade leans ~25° with the tip toward image-left (guard 140,250 → tip 92,148)

  // ---- canvas helpers ----
  function pampas(g, x, y, s, ang, stem, plume) { // 芒草: curved stem with a feathery plume
    g.save(); g.translate(x, y); g.rotate(ang || 0); g.lineCap = 'round';
    g.strokeStyle = stem; g.lineWidth = Math.max(2, s * 0.035);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.05, -s * 0.5, s * 0.22, -s * 0.9); g.stroke();
    g.strokeStyle = plume;
    for (let i = 0; i < 9; i++) {
      const t = 0.55 + i * 0.05, px = s * (0.05 + 0.2 * (t - 0.5) / 0.45), py = -s * t;
      g.lineWidth = Math.max(1.5, s * 0.028);
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + s * 0.12, py - s * 0.02, px + s * 0.2, py + s * 0.06); g.stroke();
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px - s * 0.06, py - s * 0.07, px - s * 0.1, py - s * 0.02); g.stroke();
    }
    g.restore();
  }
  function cloudCurl(g, x, y, s, color, lw) { // 祥雲 swirl used on the shoulder plates and cape
    g.save(); g.translate(x, y); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
    g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 1.7, r = s * (0.12 + 0.3 * i / 40); const px = Math.cos(a + Math.PI) * r, py = Math.sin(a + Math.PI) * r * 0.8; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke(); g.restore();
  }

  NEKO.run({
    meta: {
      id: '17', term: '寒露', title: '寒露・雁翎劍俠', seal: '露',
      eyebrow: '二〇二七節氣貓 · 17 寒露 · 暹羅貓',
      aria: '戴小金冠、插淡紫灰長翎與月光石額飾，白毛圍領、金色雲紋肩甲、米白長袍配鼠尾草綠襟邊和綠玉璧腰帶，披藕紫灰長披風，左爪舉直劍、右爪搭在腰側的藍眼暹羅貓 3D 模型'
    },
    theme: { accent: '#6A6380', accentDark: '#C9C1D6', glow: 'rgba(174, 173, 184, 0.34)', glowColor: '#D6D0E2' },
    palette: [['#FAEAD6', '奶油米白'], ['#845E49', '巧克力棕'], ['#AEADB8', '藕紫灰'], ['#A4A58F', '鼠尾草綠']],
    spec: [['品種', '暹羅貓'], ['角色', '雁翎劍俠'], ['頭身比', '約 1 : 1.65']],
    seed: 1717,

    action: {
      label: '舉劍', dur: 1.8,
      run(s, p, K) {
        if (K.__sword) {
          const rot = SWORD_ROT - 0.35 * s; K.__sword.rotation.z = rot;
          // keep the sword tassel hanging from the pommel while the blade is raised
          if (K.__swordTassel) K.__swordTassel.position.copy(K.V(0, -0.27, 0).applyAxisAngle(K.V(0, 0, 1), rot).add(K.__sword.position));
        }
        if (K.__plume) K.__plume.rotation.z = 0.12 * s * Math.sin(p * Math.PI * 3);
        K.character.position.y = 0.03 * s;
      }
    },

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR, low: FUR_LOW, deep: POINT, cream: FUR,
        ink: INK, creamInk: INK, pattern: 'none', mask: false, noise: { colors: [M('#FFF6EA', 1.1), M('#EBD3B8', 1.2)], alpha: 0.08, n: 900 },
        paintBase(g, P) {
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.55, FUR); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
        }
      },
      // head: crown y≈60, chin y≈222 (centre y≈141), cheeks x 150–352 in the picture; the upper half is narrowed
      // (cream only x≈190–312 at y 100) so the big dark ears fill the head's upper corners like the drawing
      head: { y: 3.14, neck: 2.42, w: 0.8, h: 0.72, d: 0.78, cheek: 0.15, ruff: 0.04, ruffFreq: 14, chinDrop: 0.03,
        deform(p, o) { if (o.y > 0) p.x *= 1 - 0.34 * sst(0, 0.75, o.y); },
        fur: { layers: 10, length: 0.028, gravity: 0.012, repeat: [9, 5] } },
      eyes: { x: 0.34, y: -0.23, r: 0.16, sx: 1.0, sy: 1.0, sz: 0.4, color: '#262A3C', iris: '#4F5C85', pupil: '#1F2233', pupilR: 0.42, shine: 0 },
      nose: { y: -0.34, color: '#4A2F26', size: 0.78 },
      muzzle: false,
      mouth: { type: 'w', color: '#3E2A22', y: -0.38, w: 0.095 },
      blush: { color: 'rgba(246,160,138,0.55)', x: 0.55, y: -0.38, r: 24 },
      brows: null,
      whiskers: { color: M('#A38B7B'), n: 3, len: 0.42, r: 0.0055, y: -0.38, x: 0.5, spread: 0.07, droop: 0.03, curve: 0.04 },
      // big dark ears: tip (158,48), outer edge nearly vertical down to the cheek (152,140), inner base (222,80)
      ears: { x: 0.43, y: 0.16, z: -0.06, tilt: 0.45, yaw: 0.08, pitch: -0.05, size: [0.52, 0.8, 0.16], sharp: 0.95, innerScale: 0.95, tuftScale: 1.25,
        color: POINT, inner: EAR_IN, tuft: TUFT, fur: { layers: 8, length: 0.03, gravity: 0.008, repeat: [3, 3] } },
      bib: false,
      robe: {
        profile: [[0.88, 0.46], [0.88, 0.56], [0.78, 0.88], [0.6, 1.3], [0.4, 1.64], [0.36, 1.8], [0.43, 2.0], [0.45, 2.14], [0.36, 2.3], [0.12, 2.42]],
        color: '#FFFFFF', ink: CREAM_INK, lining: SAGE, hemY: 0.62,
        paint(g, w, h, D) { D.fill(g, CREAM); }
      },
      collar: false,
      arms: {
        L: { hand: HAND_L, path: [[-0.36, 2.12, -0.02], [-0.64, 1.64, 0.12], [-0.86, 1.82, 0.26]], pawScale: 1.3, wrist: false },
        R: { hand: HAND_R, path: [[0.36, 2.12, -0.02], [0.74, 1.58, 0.1], [0.55, 1.55, 0.32]], pawScale: 1.3, wrist: false }
      },
      sleeves: false,
      paws: { color: POINT, ink: POINT_INK },
      belt: { yT: 1.8, yB: 1.64, color: BELT, line: GOLD_DK, knot: false, tassel: false, ink: BELT_INK },
      legs: false,
      feet: false,
      tail: {
        // picture: x 355–440, y 273–390 — rises on the left, curls over to the image-right, fluffy tip pointing down
        pts: [[0.35, 1.02, -0.55], [0.85, 0.99, -0.32], [1.17, 1.08, -0.08], [1.22, 1.34, 0.0], [1.26, 1.6, 0.02], [1.42, 1.76, 0.02], [1.58, 1.7, 0.02], [1.63, 1.53, 0.02]],
        r: 0.22, color: POINT, ink: POINT_INK,
        shape: t => (0.6 + 0.4 * Math.sin(Math.min(t / 0.4, 1) * Math.PI / 2)) * (1 - 0.18 * sst(0.45, 0.8, t)) * (t > 0.84 ? 0.55 + 0.45 * Math.cos((t - 0.84) / 0.16 * Math.PI / 2) : 1),
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, POINT_LT); lg.addColorStop(0.28, M('#977159')); lg.addColorStop(0.5, POINT); lg.addColorStop(1, POINT_DK);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
        },
        fur: { layers: 14, length: 0.055, gravity: 0.02, repeat: [14, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, ribbon, lathe, D } = K;
      const DS = THREE.DoubleSide, UP = V(0, 1, 0);
      const HY = K.cfg.head.y;
      const goldM = std(GOLD, { roughness: 0.45, metalness: 0.15 }), goldDkM = std(GOLD_DK, { roughness: 0.5, metalness: 0.1 });
      const orient = (m, dir) => { m.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); return m; };
      const flipOut = (geo, inside) => { // make the normals of a generated sheet point away from `inside(p)`
        const n = geo.attributes.normal, p = geo.attributes.position, k = Math.floor(p.count / 2);
        const pv = V().fromBufferAttribute(p, k), nv = V().fromBufferAttribute(n, k);
        if (nv.dot(pv.clone().sub(inside(pv))) < 0) {
          const idx = geo.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
          geo.index.needsUpdate = true; K.smoothNormals(geo);
        }
      };

      /* ---------------- siamese face: brown mask, blue eyes, lashes, blush lines ---------------- */
      {
        const g = K.headTex.image.getContext('2d');
        const uvp = (px, py) => { const s = K.onSkin(X(px), Y(py), [K.headMesh]); return s.uv ? [s.uv.x * 1024, (1 - s.uv.y) * 512] : null; };
        const soft = (c, rx, ry, col, stops) => {
          g.save(); g.translate(c[0], c[1]); g.scale(1, ry / rx);
          const rg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
          stops.forEach(([t, a]) => rg.addColorStop(t, NEKO.rgba(col, a)));
          g.fillStyle = rg; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
        };
        // mask: vertical oval x 220–280, y 140–217, darkest around the nose and between the eyes
        const c = uvp(251, 174), cx = uvp(297, 174), cy = uvp(251, 130);
        if (c && cx && cy) {
          const rx = Math.abs(cx[0] - c[0]), ry = Math.abs(c[1] - cy[1]);
          soft(c, rx, ry, MASK, [[0, 0.95], [0.35, 0.9], [0.68, 0.5], [1, 0]]);
          const c2 = uvp(251, 178); if (c2) soft(c2, rx * 0.45, ry * 0.45, MASK_DK, [[0, 0.6], [1, 0]]);
        }
        const fh = uvp(251, 146), fx = uvp(268, 146); if (fh && fx) soft(fh, Math.abs(fx[0] - fh[0]), Math.abs(fx[0] - fh[0]) * 1.3, MASK, [[0, 0.45], [1, 0]]);
        // short blush hatch lines
        [-1, 1].forEach(sx => {
          const q = uvp(251 + sx * 62, 186); if (!q) return;
          g.strokeStyle = 'rgba(226,120,100,0.75)'; g.lineWidth = 2.2; g.lineCap = 'round';
          [-7, 0, 7].forEach(dx => { g.beginPath(); g.moveTo(q[0] + dx - 2, q[1] + 3); g.lineTo(q[0] + dx + 2, q[1] - 3); g.stroke(); });
        });
        K.headTex.needsUpdate = true;
      }
      // blue irises (dark rim, lighter lower half, big pupil) and highlights toward the face centre
      {
        const irisTex = canvasTex(256, 256, (g) => {
          const lg = g.createLinearGradient(0, 0, 0, 256);
          lg.addColorStop(0, '#2E3452'); lg.addColorStop(0.45, '#465377'); lg.addColorStop(1, '#7C8DB8');
          g.fillStyle = lg; g.fillRect(0, 0, 256, 256);
          const rg = g.createRadialGradient(128, 128, 90, 128, 128, 128);
          rg.addColorStop(0, 'rgba(30,33,52,0)'); rg.addColorStop(1, 'rgba(30,33,52,0.9)');
          g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
          g.fillStyle = '#1D2031'; g.beginPath(); g.arc(128, 122, 50, 0, Math.PI * 2); g.fill();
        });
        const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
        K.eyes.forEach((eg, i) => {
          const sx = i === 0 ? -1 : 1, r = K.cfg.eyes.r;
          eg.traverse(o => { if (o.isMesh && o.geometry.type === 'CircleGeometry') o.material = texMat(irisTex, { roughness: 0.3 }); });
          const s1 = mesh(sphere(r * 0.3, 20, 14), shine, eg, [-sx * r * 0.34, r * 0.36, r * 0.4 - 0.004], [1, 1, 0.5]); s1.castShadow = false;
          const s2 = mesh(sphere(r * 0.12, 12, 10), shine, eg, [sx * r * 0.36, -r * 0.4, r * 0.4 - 0.002], [1, 1, 0.5]); s2.castShadow = false;
          // outer-corner lash flick
          const lm = std('#2A2226', { roughness: 0.6 });
          mesh(tube([[sx * r * 0.82, r * 0.5, r * 0.18], [sx * r * 1.12, r * 0.72, r * 0.12], [sx * r * 1.32, r * 0.78, r * 0.02]], t => 0.014 * (1 - 0.7 * t), 12, 6), lm, eg);
        });
      }

      /* ---------------- fluffy cheek tufts (cream) ---------------- */
      const edgeX = (y) => { let lo = 0, hi = 1.6; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; } return lo; };
      const lock = (parent, root, dir, len, r0, mat, ink, bend) => {
        const d = V(dir[0], dir[1], dir[2]).normalize(), a = V(root[0], root[1], root[2]);
        const b = a.clone().addScaledVector(d, len * 0.55).add(V(0, bend * len, 0)), c = a.clone().addScaledVector(d, len);
        return mesh(tube([a, b, c], t => r0 * (1 - Math.pow(t, 1.25)) + 0.004, 18, 10), mat, parent, null, null, ink);
      };
      {
        const fm = std(FUR, { roughness: 0.95 }), bm = std(POINT, { roughness: 0.95 });
        [-1, 1].forEach(sx => {
          [[-0.2, 10, 0.1, 0.06], [-0.32, 24, 0.12, 0.065], [-0.44, 36, 0.12, 0.065], [-0.56, 52, 0.1, 0.06]].forEach(([yr, ang, len, r0], i) => {
            const y = HY + yr, ex = edgeX(y), a = ang * Math.PI / 180, zz = [0.04, -0.06, 0.05, -0.04][i];
            lock(K.faceG, [sx * (ex - 0.06), y, zz], [sx * Math.cos(a), -Math.sin(a), zz * 0.6], len, r0, fm, INK, -0.06);
          });
          // brown tufts at the ear roots
          [[0.1, 30, 0.1, 0.055], [0.0, 45, 0.09, 0.05]].forEach(([yr, ang, len, r0]) => {
            const y = HY + yr, ex = edgeX(y), a = ang * Math.PI / 180;
            lock(K.faceG, [sx * (ex - 0.05), y, -0.05], [sx * Math.cos(a), -Math.sin(a), 0], len, r0, bm, POINT_INK, -0.04);
          });
        });
      }

      /* ---------------- topknot crown + lavender goose-feather plume ---------------- */
      const crown = part('crown', K.head);
      crown.position.set(0, Y(66) - 0.02, -0.02);
      {
        const slM = std(SLATE, { roughness: 0.6 });
        mesh(new THREE.CylinderGeometry(0.13, 0.145, 0.1, 40), slM, crown, [0, 0.05, 0], null, SLATE_INK);
        [0.0, 0.1].forEach(y => { const t = mesh(new THREE.TorusGeometry(y ? 0.132 : 0.146, 0.016, 8, 48), goldM, crown, [0, y, 0]); t.rotation.x = Math.PI / 2; });
        mesh(sphere(0.03, 16, 12), goldM, crown, [0, 0.05, 0.15], null, GOLD_INK);
        // three lotus petals
        const petal = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(w, L * 0.25, w * 0.7, L * 0.75, 0, L); s.bezierCurveTo(-w * 0.7, L * 0.75, -w, L * 0.25, 0, 0); return s; };
        const pg = group(crown, [0, 0.1, 0.02]);
        mesh(extrude(petal(0.17, 0.085), 0.05, 0.015), goldM, pg, [0, -0.01, 0.04], null, GOLD_INK);
        [-1, 1].forEach(k => { const l = mesh(extrude(petal(0.13, 0.07), 0.045, 0.014), goldM, pg, [0.06 * k, -0.01, 0.02], null, GOLD_INK); l.rotation.z = -0.55 * k; });
        [-1, 1].forEach(k => { const l = mesh(extrude(petal(0.1, 0.06), 0.04, 0.012), goldDkM, pg, [0.05 * k, -0.01, -0.06], null, GOLD_INK); l.rotation.set(0, Math.PI, 0.6 * k); });
        mesh(sphere(0.022, 12, 10), std(GEM, { roughness: 0.2 }), pg, [0, 0.07, 0.07]);
      }
      const plume = group(crown, [0, 0.12, -0.08]);   // plume points below are built relative to `base`
      K.__plume = plume;
      {
        const tex = canvasTex(256, 16, (g, w, h) => { const lg = g.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, PLUME_DK); lg.addColorStop(0.3, PLUME); lg.addColorStop(0.8, PLUME_LT); lg.addColorStop(1, PLUME); g.fillStyle = lg; g.fillRect(0, 0, w, h); });
        const pm = texMat(tex, { roughness: 0.95 });
        const base = V(0, Y(66) - 0.02 + 0.12, -0.1);
        const P = (px, py, z) => V(X(px), Y(py), z).sub(base);
        const taper = (rr, t0) => t => rr * Math.pow(Math.sin(Math.PI * Math.min(t0 + t * (1 - t0), 1)), 0.55) * (1 - 0.3 * t) + 0.004;
        // main fan (x 225–340, y 8–57): strands between a lower and an upper edge, all sweeping to the image-right tip
        const up = [[251, 52], [245, 30], [258, 11], [292, 5], [322, 12], [338, 27]];
        const lo = [[257, 55], [268, 47], [290, 44], [314, 38], [332, 34], [341, 33]];
        for (let i = 0; i < 16; i++) {
          const f = i / 15, zz = -0.06 - 0.1 * Math.sin(Math.PI * f) + (K.rand() - 0.5) * 0.05;
          const pts = up.map((q, k) => P(lerp(lo[k][0], q[0], f), lerp(lo[k][1], q[1], f) + (k === 5 ? (f - 0.5) * 6 : 0), zz + 0.03 * k * (f - 0.5)));
          mesh(tube(pts, taper(0.055 - 0.012 * Math.abs(f - 0.5), 0.12), 48, 10), pm, plume, null, null, PLUME_INK);
        }
        // the feathered tip flicking up to the image-left (228,20)
        for (let i = 0; i < 5; i++) {
          const f = i / 4 - 0.5;
          const pts = [P(253, 52, -0.04), P(248 + f * 5, 40, -0.03), P(239 + f * 5, 30 + f * 3, -0.02), P(229 + f * 2, 21 + f * 4, -0.02)];
          mesh(tube(pts, taper(0.04, 0.15), 28, 8), pm, plume, null, null, PLUME_INK);
        }
        // the long lower strand: behind the image-right ear, out to (398,115) and curling down at (392,128)
        for (let i = 0; i < 5; i++) {
          const f = i / 4 - 0.5;
          const pts = [P(262, 56 + f * 4, -0.1), P(296, 62 + f * 8, -0.22), P(330, 70 + f * 9, -0.34), P(362, 82 + f * 9, -0.36), P(386, 98 + f * 7, -0.34), P(397 - f * 3, 114 + f * 3, -0.3), P(391 - f * 6, 127, -0.26)];
          mesh(tube(pts, taper(0.042 - 0.012 * Math.abs(f), 0.1), 56, 10), pm, plume, null, null, PLUME_INK);
        }
        K.onTick((t, k) => { plume.rotation.z = 0.05 * Math.sin(t * 1.3) * k; plume.rotation.x = 0.03 * Math.sin(t * 0.9 + 1) * k; });
      }

      /* ---------------- forehead jewel (moonstone circlet) ---------------- */
      const circ = part('circlet', K.head);
      {
        const on = (px, py, off) => { const s = K.onSkin(X(px), Y(py), [K.headMesh]); return { p: s.p.clone().addScaledVector(s.n, off), n: s.n.clone() }; };
        const faceTo = (m, n) => { m.lookAt(m.position.clone().add(n)); return m; };
        const slM = std(SLATE, { roughness: 0.55 }), gemM = std(GEM, { roughness: 0.15, metalness: 0.05 }), pearlM = std(M('#F4F1EE', 1.1), { roughness: 0.25 });
        const c0 = on(251, 96, 0.06);
        const bz = group(circ, c0.p); faceTo(bz, c0.n);
        mesh(new THREE.TorusGeometry(0.1, 0.024, 12, 40), goldM, bz, [0, 0, 0], null, GOLD_INK);
        mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 40), goldDkM, bz, [0, 0, -0.012]).rotation.x = Math.PI / 2;
        mesh(sphere(0.082, 32, 20), gemM, bz, [0, 0, 0.01], [1, 1, 0.55], '#8FA0AE');
        mesh(sphere(0.02, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), bz, [-0.03, 0.035, 0.052], [1, 1, 0.4]).castShadow = false;
        // small crest above the bezel and gold leaves at its sides
        const leafSh = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(w, L * 0.3, w * 0.6, L * 0.8, 0, L); s.bezierCurveTo(-w * 0.6, L * 0.8, -w, L * 0.3, 0, 0); return s; };
        mesh(extrude(leafSh(0.1, 0.05), 0.03, 0.01), goldM, bz, [0, 0.11, 0], null, GOLD_INK);
        [-1, 1].forEach(k => { const l = mesh(extrude(leafSh(0.08, 0.045), 0.028, 0.009), goldM, bz, [0.035 * k, 0.1, 0], null, GOLD_INK); l.rotation.z = -0.8 * k; });
        [-1, 1].forEach(k => { const l = mesh(extrude(leafSh(0.085, 0.045), 0.028, 0.009), goldM, bz, [0.11 * k, -0.01, 0], null, GOLD_INK); l.rotation.z = -k * 1.7; });
        // slate scroll arms along the forehead with gold leaves, pearls and slate drop leaves
        [-1, 1].forEach(k => {
          const xs = px => 251 + k * px;
          const arm = [on(xs(20), 96, 0.05), on(xs(32), 92, 0.05), on(xs(42), 96, 0.05), on(xs(46), 104, 0.05), on(xs(38), 106, 0.05)].map(q => q.p);
          mesh(tube(arm, 0.02, 36, 8), slM, circ, null, null, SLATE_INK);
          const arm2 = [on(xs(18), 104, 0.05), on(xs(28), 108, 0.05), on(xs(36), 106, 0.05)].map(q => q.p);
          mesh(tube(arm2, 0.014, 16, 6), goldM, circ);
          const lf = on(xs(50), 96, 0.055); const lg = group(circ, lf.p); faceTo(lg, lf.n);
          [0.5, -0.4].forEach(a => { const l = mesh(extrude(leafSh(0.07, 0.035), 0.024, 0.008), goldM, lg, [0, 0, 0], null, GOLD_INK); l.rotation.z = -k * (1.2 + a); });
          const pr = on(xs(38), 103, 0.07); mesh(sphere(0.022, 14, 10), pearlM, circ, pr.p);
          const dl = on(xs(44), 113, 0.05); const dg = group(circ, dl.p); faceTo(dg, dl.n);
          const d = mesh(K.dropGeo(0.1, 0.035, 1.6), slM, dg, [0, 0, 0], null, SLATE_INK); d.rotation.z = Math.PI - k * 0.35;
        });
        // pendant: gold bead + pale-blue drop between the eyes
        const pb = on(251, 116, 0.055); mesh(sphere(0.022, 14, 10), goldM, circ, pb.p, null, GOLD_INK);
        const pd = on(251, 127, 0.045); const pg = group(circ, pd.p); faceTo(pg, pd.n);
        const dr = mesh(K.dropGeo(0.12, 0.045, 1.7), gemM, pg, [0, 0, 0], [1, 1, 0.6], '#8FA0AE'); dr.rotation.z = Math.PI;
      }

      /* ---------------- white fur collar (open at the front), cross collar, lavender bow ---------------- */
      const armor = part('armor', K.body);
      {
        // fluffy ruff y 222–262, x 170–335 in the picture, open at the front between the two gold plum buttons
        const ringR = 0.54, yC = 2.23, pts = [];
        const fcG = group(armor, [0, yC, 0]); fcG.scale.set(1, 0.85, 0.84);
        for (let i = 0; i <= 44; i++) {
          const a = lerp(25, 335, i / 44) * Math.PI / 180, front = Math.pow(Math.max(0, Math.cos(a)), 2);
          pts.push(V(Math.sin(a) * ringR * (1 - 0.1 * front), -0.05 * front, Math.cos(a) * ringR * (1 + 0.06 * front)));
        }
        const fc = mesh(tube(pts, t => 0.215 * (0.42 + 0.58 * Math.pow(Math.sin(Math.PI * t), 0.5)), 120, 18), std(M('#FFF9F0', 1.1), { roughness: 0.95 }), fcG, null, null, CREAM_INK);
        K.addFur(fc, { layers: 12, length: 0.045, gravity: 0.02, repeat: [16, 2] });
        [pts[0], pts[pts.length - 1]].forEach(p => mesh(sphere(0.215 * 0.42, 20, 14), fc.material, fcG, p));   // close the open tube ends
        // gold plum buttons at the front ends (228,242) and (273,242)
        [-1, 1].forEach(sx => {
          const fl = K.flower(armor, V(sx * 0.2, 2.22, 0.53), 0.2, GOLD_MID, GOLD_DK, 5); fl.rotation.y = sx * 0.3;
        });
        // sage cross collar (交領) with a white inner edge
        const cm = std(SAGE, { roughness: 0.85, side: DS }), wm = std(CREAM, { roughness: 0.85, side: DS });
        [-1, 1].forEach(sx => {
          const pts = [], pw2 = [];
          for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(K.onRobe(sx * lerp(22, 3, t), lerp(2.38, 2.05, t), 0.04)); pw2.push(K.onRobe(sx * lerp(16, 1.5, t), lerp(2.4, 2.1, t), 0.05)); }
          mesh(ribbon(pts, 0.085, { face: [0, 0.3, 1] }), cm, armor, null, null, SAGE_INK);
          mesh(ribbon(pw2, 0.04, { face: [0, 0.3, 1] }), wm, armor);
        });
        // lavender bow + long tails
        const bz = K.robeR(2.14) + 0.07, lm = std(LAV, { roughness: 0.8 }), lmD = std(LAV, { roughness: 0.8, side: DS });
        [-1, 1].forEach(sx => { const l = mesh(new THREE.TorusGeometry(0.058, 0.02, 10, 28), lm, armor, [0.07 * sx, 2.15, bz - 0.01], [1.25, 0.8, 0.55], LAV_INK); l.rotation.z = 0.25 * sx; });
        mesh(sphere(0.03, 14, 10), lm, armor, [0, 2.14, bz + 0.01], [1.2, 1, 0.7], LAV_INK);
        [[-1, 0.09, 1.86], [1, 0.12, 1.88]].forEach(([sx, dx, yE]) => {
          const pts = [[0.01 * sx, 2.12, bz], [0.05 * sx, 2.0, K.robeR(2.0) + 0.04], [dx * sx, yE, K.robeR(yE) + 0.03]];
          mesh(ribbon(pts, t => 0.045 + 0.01 * t, { face: [0, 0, 1] }), lmD, armor, null, null, LAV_INK);
        });
      }

      /* ---------------- scalloped shoulder plates (gold cloud scales over a slate layer) ---------------- */
      // Two stacked capelet segments per shoulder (lathe around the body axis, 36°–128° from the front):
      // picture — gold layer scalloped edge at y≈267 out to x≈165, slate layer at y≈285 out to x≈157.
      {
        const scallopTex = (base, line, n, motif) => {
          const tex = canvasTex(512, 256, (g, w, h) => {
            g.fillStyle = base; g.fillRect(0, 0, w, h);
            if (motif) motif(g, w, h);
            const sw = w / n, yb = h - 40;
            g.strokeStyle = line; g.lineWidth = 14;
            for (let i = 0; i < n; i++) { g.beginPath(); g.arc(sw * (i + 0.5), yb, sw * 0.5 - 5, 0, Math.PI); g.stroke(); }
            g.globalCompositeOperation = 'destination-out';
            g.beginPath(); g.moveTo(0, h);
            for (let i = 0; i < n; i++) g.arc(sw * (i + 0.5), yb, sw * 0.5 + 2, Math.PI, 0, true);
            g.lineTo(w, h); g.closePath(); g.fill();
            g.fillRect(0, h - 4, w, 4);
            g.globalCompositeOperation = 'source-over';
            g.fillStyle = line; g.fillRect(0, 0, 8, h - 40); g.fillRect(w - 8, 0, 8, h - 40);
          });
          return texMat(tex, { side: DS, alphaTest: 0.5, roughness: 0.6, metalness: 0.08 });
        };
        const goldPlate = scallopTex(GOLD, GOLD_DK, 4, (g, w, h) => {
          for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) cloudCurl(g, (i + (r % 2) * 0.5) * w / 8, 24 + r * 44, 24, GOLD_INK, 6);
        });
        const slatePlate = scallopTex(SLATE, GOLD_MID, 4, (g, w, h) => { g.fillStyle = SLATE_DK; g.fillRect(0, h * 0.62, w, 6); });
        const a0 = 36 * Math.PI / 180, a1 = 128 * Math.PI / 180;
        [-1, 1].forEach(sx => {
          const st = sx > 0 ? a0 : -a1, len = a1 - a0;
          const sl = lathe([[0.9, 1.83], [0.8, 1.94], [0.64, 2.1], [0.5, 2.22], [0.44, 2.28]], 40, st, len, 24);
          mesh(sl.geo, slatePlate, armor);
          const gl = lathe([[0.82, 1.99], [0.72, 2.08], [0.58, 2.19], [0.47, 2.29]], 40, st, len, 24);
          mesh(gl.geo, goldPlate, armor);
        });
      }

      /* ---------------- robe fabric: sage hem band, green facings, gold lines ---------------- */
      {
        const tex = K.robeMesh.material.map, g = tex.image.getContext('2d'), rv = K.robeV;
        const dx = d => 512 + d / 360 * 1024;
        g.fillStyle = SAGE; g.fillRect(0, rv(0.62), 1024, 1024 - rv(0.62));
        g.fillStyle = SAGE_DK; g.fillRect(0, 1010, 1024, 14);
        [-1, 1].forEach(k => {
          // inner green panels flanking the front apron (below the belt)
          const a = dx(k * 19), b = dx(k * 46);
          g.fillStyle = SAGE; g.fillRect(Math.min(a, b), rv(1.66), Math.abs(b - a), rv(0.6) - rv(1.66));
          g.fillStyle = GOLD_DK; g.fillRect(k < 0 ? a - 8 : a, rv(1.66), 8, rv(0.6) - rv(1.66));
          // chest facings
          const c = dx(k * 30), d = dx(k * 58);
          g.fillStyle = SAGE; g.fillRect(Math.min(c, d), rv(2.34), Math.abs(d - c), rv(1.78) - rv(2.34));
          g.fillStyle = GOLD_DK; g.fillRect(k < 0 ? c - 7 : c, rv(2.34), 7, rv(1.78) - rv(2.34));
        });
        // faint reed sprays on the back of the skirt
        [150, 874].forEach(x => pampas(g, x, rv(0.66), 200, 0.1, SAGE_DK, REED_DK));
        tex.needsUpdate = true;
      }

      /* ---------------- skirt layers: landscape apron + reed side panels ---------------- */
      const skirt = part('skirt', K.body);
      {
        const cutAlpha = (m) => { m.material.alphaTest = 0.5; m.material.needsUpdate = true; return m; };
        // centre apron with a rounded bottom, sage pine & rock and pampas
        cutAlpha(K.robePanel({ parent: skirt, y0: 0.37, y1: 1.66, center: 0, deg: 21, degB: 23, off: 0.035, color: CREAM, texW: 256, texH: 768, ink: null,
          paint(g, w, h) {
            // landscape: soft hills, a little pine on a rock, pampas grass
            g.fillStyle = M('#DCDCCB', 1.2); g.beginPath(); g.moveTo(0, h - 130); g.quadraticCurveTo(w * 0.4, h - 210, w, h - 150); g.lineTo(w, h); g.lineTo(0, h); g.fill();
            g.fillStyle = PINE; g.beginPath(); g.moveTo(10, h - 90); g.quadraticCurveTo(w * 0.5, h - 170, w - 10, h - 110); g.lineTo(w, h); g.lineTo(0, h); g.fill();
            g.fillStyle = M('#98A088');
            [[80, h - 215, 34], [58, h - 190, 26], [104, h - 192, 28], [82, h - 170, 30]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2); g.fill(); });
            g.strokeStyle = M('#8C8F7A'); g.lineWidth = 6; g.beginPath(); g.moveTo(82, h - 160); g.lineTo(84, h - 120); g.stroke();
            pampas(g, 170, h - 90, 250, 0.12, M('#B9B08F'), REED);
            pampas(g, 140, h - 100, 200, -0.05, M('#B9B08F'), REED);
            // rounded bottom + gold border
            const r = 100;
            g.globalCompositeOperation = 'destination-out';
            g.beginPath(); g.moveTo(0, h); g.lineTo(0, h - r); g.quadraticCurveTo(0, h, r, h); g.closePath(); g.fill();
            g.beginPath(); g.moveTo(w, h); g.lineTo(w, h - r); g.quadraticCurveTo(w, h, w - r, h); g.closePath(); g.fill();
            g.globalCompositeOperation = 'source-over';
            g.strokeStyle = GOLD_DK; g.lineWidth = 16;
            g.beginPath(); g.moveTo(8, 0); g.lineTo(8, h - r); g.quadraticCurveTo(8, h - 8, r, h - 8); g.lineTo(w - r, h - 8); g.quadraticCurveTo(w - 8, h - 8, w - 8, h - r); g.lineTo(w - 8, 0); g.stroke();
            g.strokeStyle = GOLD; g.lineWidth = 6; g.stroke();
          } }));
        // outer reed panels (coat skirts), bottom slanting down toward the centre
        [-1, 1].forEach(k => {
          cutAlpha(K.robePanel({ parent: skirt, y0: 0.44, y1: 1.66, center: 62 * k, deg: 20, degB: 24, off: 0.06, color: CREAM, texW: 256, texH: 768, ink: null,
            paint(g, w, h) {
              pampas(g, k < 0 ? 150 : 100, h - 60, 280, k * -0.12, M('#B9B08F'), REED_DK);
              pampas(g, k < 0 ? 110 : 140, h - 40, 230, k * 0.1, M('#B9B08F'), REED);
              // slanted bottom edge: inner side (toward the apron) lower
              const inner = k < 0 ? w : 0, outer = w - inner, lift = 120;
              g.globalCompositeOperation = 'destination-out';
              g.beginPath(); g.moveTo(outer, h - lift); g.quadraticCurveTo((inner + outer) / 2, h - 20, inner, h); g.lineTo(outer, h); g.closePath(); g.fill();
              g.globalCompositeOperation = 'source-over';
              g.strokeStyle = GOLD_DK; g.lineWidth = 14;
              g.beginPath(); g.moveTo(inner + (k < 0 ? -7 : 7), 0); g.lineTo(inner + (k < 0 ? -7 : 7), h - 6); g.quadraticCurveTo((inner + outer) / 2, h - 24, outer, h - lift - 6); g.stroke();
              g.strokeStyle = GOLD; g.lineWidth = 5; g.stroke();
            } }));
        });
      }

      /* ---------------- wide hanging sleeves (cream outside, lavender-slate lining) ---------------- */
      // Each sleeve is a tube around the arm whose lower half is pulled straight DOWN (world −y) into a
      // hanging pouch, so it drapes correctly even on the raised sword arm. u = along the arm, v = around.
      {
        const sleeveTex = canvasTex(512, 256, (g, w, h) => {
          g.fillStyle = CREAM; g.fillRect(0, 0, w, h);
          g.strokeStyle = 'rgba(190,170,150,0.3)'; g.lineWidth = 5; g.lineCap = 'round';
          [[60, 150, 330, 170], [120, 200, 400, 212], [40, 230, 300, 238]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2, b - 12, c, d); g.stroke(); });
          g.fillStyle = SLATE; g.fillRect(w - 16, 0, 16, h);
          g.fillStyle = GOLD_DK; g.fillRect(w - 22, 0, 6, h);
        });
        const sm = texMat(sleeveTex, { roughness: 0.9 }), lin = std(LINING, { side: THREE.BackSide, roughness: 0.9 });
        const bag = (pts, o) => {
          const cv = new THREE.CatmullRomCurve3(pts.map(p => V(p[0], p[1], p[2])));
          const NT = 60, NA = 48, pos = [], uv = [], idx = [], ring = [];
          for (let i = 0; i <= NT; i++) {
            const t = i / NT, C = cv.getPointAt(t), T = cv.getTangentAt(t);
            let side = T.clone().cross(UP); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
            const up2 = side.clone().cross(T).normalize();
            const rw = o.rw(t), rt = o.rt(t), dr = o.drop(t);
            for (let j = 0; j <= NA; j++) {
              const a = j / NA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), low = Math.max(0, -sa);
              const p = C.clone().addScaledVector(side, rw * ca * (1 + o.flare * low)).addScaledVector(up2, rt * sa);
              p.y -= dr * Math.pow(low, 0.7);
              pos.push(p.x, p.y, p.z); uv.push(t, j / NA);
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
          if (nv.dot(pv.clone().sub(cv.getPointAt(0.5))) < 0) { for (let q = 0; q < idx.length; q += 3) { const tt = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tt; } geo.setIndex(idx); K.smoothNormals(geo); }
          const m = mesh(geo, sm, K.robeG, null, null, CREAM_INK);
          const l = new THREE.Mesh(geo, lin); l.receiveShadow = true; K.robeG.add(l);
          return m;
        };
        // image-left: forearm raised to the sword paw; the pouch hangs to y≈350 (x 133–200 in the picture)
        bag([[-0.36, 2.12, -0.02], [-0.52, 1.86, 0.04], [-0.64, 1.64, 0.12], [-0.76, 1.7, 0.2], [-0.86, 1.82, 0.26]],
          { rw: t => 0.14 + 0.1 * t, rt: t => 0.11 + 0.05 * t, drop: t => 0.46 * sst(0.05, 0.45, t) * (1 - 0.62 * sst(0.7, 1, t)), flare: 0.35 });
        // image-right: elbow out at x≈350, forearm bent in to the belt; pouch to y≈360
        bag([[0.36, 2.12, -0.02], [0.58, 1.86, 0.0], [0.74, 1.58, 0.1], [0.66, 1.54, 0.22], [0.55, 1.55, 0.32]],
          { rw: t => 0.15 + 0.1 * t, rt: t => 0.11 + 0.05 * t, drop: t => 0.3 * sst(0.1, 0.55, t) * (1 - 0.3 * sst(0.8, 1, t)), flare: 0.3 });
      }

      /* ---------------- belt: jade bi disc, gold crescent, lavender tassel and sash ---------------- */
      {
        const yK = 1.72, bz = K.robeR(yK) + 0.06;
        const cr = mesh(new THREE.TorusGeometry(0.13, 0.013, 8, 36, Math.PI), goldM, K.beltG, [0, yK, bz - 0.01], null, GOLD_INK);
        const disc = mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.03, 40), std(JADE, { roughness: 0.35 }), K.beltG, [0, yK, bz + 0.005], null, JADE_INK); disc.rotation.x = Math.PI / 2;
        const rim = mesh(new THREE.TorusGeometry(0.088, 0.012, 8, 40), goldM, K.beltG, [0, yK, bz + 0.012]);
        mesh(new THREE.TorusGeometry(0.022, 0.008, 8, 20), goldM, K.beltG, [0, yK, bz + 0.024]);
        mesh(new THREE.CircleGeometry(0.018, 20), std(CREAM, { roughness: 0.6 }), K.beltG, [0, yK, bz + 0.022]);
        // cord → gold bead (y≈327) → lavender tassel down to y≈377
        // (the skirt flares below the belt, so everything sits on the robe surface + a small gap and leans forward with it)
        const zr = y => K.robeR(y) + 0.075;
        mesh(tube([[0, yK - 0.09, bz + 0.01], [0, yK - 0.15, zr(yK - 0.15)], [0, yK - 0.2, zr(yK - 0.2)]], 0.009, 8, 6), std(LAV_INK, { roughness: 0.7 }), K.beltG);
        mesh(sphere(0.03, 14, 10), goldM, K.beltG, [0, yK - 0.22, zr(yK - 0.22)], null, GOLD_INK);
        const t1 = K.tassel(K.beltG, [0, yK - 0.26, zr(yK - 0.26)], LAV, 0.36, 0.05, LAV_INK);
        t1.rotation.x = -Math.atan2(zr(yK - 0.62) - zr(yK - 0.26), 0.36);
        const t1x = t1.rotation.x;
        // lavender sash hanging on the image-right, ending in a small gold tassel
        const zf = (x, y, o) => Math.sqrt(Math.max(K.robeR(y) ** 2 - x * x, 0)) + o;
        const sp = [[0.1, 1.7], [0.2, 1.55], [0.3, 1.36], [0.38, 1.18], [0.42, 1.1]].map(([x, y]) => V(x, y, zf(x, y, 0.085)));
        mesh(ribbon(sp, 0.085, { face: [0, 0, 1] }), std(LAV, { roughness: 0.8, side: DS }), K.beltG, null, null, LAV_INK);
        const t2 = K.tassel(K.beltG, [0.425, 1.08, zf(0.425, 1.08, 0.09)], GOLD_MID, 0.14, 0.034, GOLD_INK);
        K.onTick((t, k) => { t1.rotation.z = 0.06 * Math.sin(t * 1.6) * k; t1.rotation.x = t1x; t2.rotation.z = 0.08 * Math.sin(t * 1.4 + 1) * k; });
      }

      /* ---------------- lantern trousers and chunky boots ---------------- */
      {
        const pm = std(PANTS, { roughness: 0.9 }), bm = std(BOOT, { roughness: 0.75 }), soleM = std(SOLE, { roughness: 0.8 }), rimM = std(GOLD, { roughness: 0.55 });
        [-1, 1].forEach(sx => {
          const bg = group(K.poseG, [0.42 * sx, 0, 0.32]);
          const pl = lathe([[0.16, 0.3], [0.23, 0.36], [0.25, 0.46], [0.21, 0.58]], 36);
          mesh(pl.geo, pm, bg, [0, 0, -0.04], null, CREAM_INK);
          mesh(new THREE.CylinderGeometry(0.2, 0.215, 0.26, 36), bm, bg, [0, 0.24, -0.04], null, BOOT_INK);
          const r = mesh(new THREE.TorusGeometry(0.205, 0.028, 10, 44), rimM, bg, [0, 0.37, -0.04]); r.rotation.x = Math.PI / 2;
          mesh(sphere(0.2, 32, 20), bm, bg, [0, 0.13, 0.1], [1.22, 0.72, 1.45], BOOT_INK);
          mesh(sphere(0.2, 32, 16), soleM, bg, [0, 0.045, 0.09], [1.3, 0.28, 1.55], M('#B9986E'));
          // gold arc over the toe with a small cloud knot on top
          const arc = [];
          for (let i = 0; i <= 16; i++) { const a = lerp(-1.25, 1.25, i / 16); arc.push(V(Math.sin(a) * 0.235, 0.1 + 0.1 * Math.cos(a), 0.1 + Math.cos(a) * 0.235)); }
          mesh(tube(arc, 0.016, 40, 6), goldM, bg, null, null, GOLD_INK);
          mesh(sphere(0.028, 12, 10), goldM, bg, [0, 0.205, 0.34], [1.4, 0.8, 0.8], GOLD_INK);
          // cream trouser leg rising from the lantern cuff up under the robe into the hip block
          mesh(tube([[0.42 * sx, 0.42, 0.28], [0.39 * sx, 0.66, 0.24], [0.32 * sx, 0.86, 0.16], [0.27 * sx, 0.98, 0.1]], 0.2, 24, 24), pm, K.poseG, null, null, CREAM_INK);
        });
        // hip block filling the robe shell (touches its inside wall): the legs disappear into it
        const yH = 0.96, hh = 0.14;
        mesh(new THREE.CylinderGeometry(K.robeR(yH + hh / 2) - 0.012, K.robeR(yH - hh / 2) - 0.012, hh, 64), pm, K.poseG, [0, yH, 0]);
      }

      /* ---------------- straight sword in the image-left paw ---------------- */
      const swordG = part('sword', K.body);
      K.__sword = swordG;
      {
        swordG.position.copy(K.hands.L.p).add(V(0.06, 0, 0.02)); swordG.rotation.z = SWORD_ROT;
        const bw = 0.075, y0 = 0.33, yt = 1.36;
        const bladeShape = [[-bw, y0], [bw, y0], [bw * 0.98, yt - 0.14], [0, yt], [-bw * 0.98, yt - 0.14]];
        const bgeo = extrude(bladeShape, 0.034, 0.012, 3, 8);
        const btex = canvasTex(128, 512, (g, w, h) => {
          g.fillStyle = BLADE; g.fillRect(0, 0, w, h);
          g.fillStyle = RIDGE; g.fillRect(w * 0.43, 0, w * 0.14, h);
          g.fillStyle = M('#F4F4F6', 1.1); g.fillRect(w * 0.4, 0, w * 0.03, h);
        });
        btex.repeat.set(1 / (bw * 2), 1 / (yt - y0)); btex.offset.set(0.5, -y0 / (yt - y0));
        mesh(bgeo, [texMat(btex, { roughness: 0.35, metalness: 0.2 }), std(BLADE, { roughness: 0.4, metalness: 0.2 })], swordG, null, null, BLADE_INK);
        // grip, guard (four-petal gold flower with a moonstone), pommel
        mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.5, 16), std(SLATE_DK, { roughness: 0.7 }), swordG, [0, 0.03, 0], null, SLATE_INK);
        const gg = group(swordG, [0, 0.29, 0]);
        [[0.1, 0, 0.075], [-0.1, 0, 0.075], [0, 0.075, 0.062], [0, -0.07, 0.058]].forEach(([x, y, r]) => mesh(sphere(r, 24, 16), goldM, gg, [x, y, 0], [1, 0.82, 0.42], GOLD_INK));
        mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 32), goldDkM, gg, [0, 0, 0]).rotation.x = Math.PI / 2;
        mesh(sphere(0.05, 24, 16), std(GEM, { roughness: 0.15 }), gg, [0, 0, 0.028], [1, 1, 0.6], '#8FA0AE');
        mesh(sphere(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), gg, [-0.018, 0.02, 0.058]).castShadow = false;
        mesh(sphere(0.052, 20, 14), goldM, swordG, [0, -0.23, 0], [1, 1.1, 1], GOLD_INK);
        mesh(sphere(0.02, 12, 10), std(JADE, { roughness: 0.3 }), swordG, [0, -0.22, 0.05]);
      }
      // sword tassel hangs straight down from the pommel (world space, so it stays vertical)
      {
        const pom = V(0, -0.27, 0).applyAxisAngle(V(0, 0, 1), SWORD_ROT).add(swordG.position);
        const tg = group(swordG.parent, pom); K.__swordTassel = tg;
        mesh(tube([[0, 0, 0], [0.004, -0.08, 0.005], [0, -0.14, 0]], 0.008, 10, 6), std(LAV_INK, { roughness: 0.7 }), tg);
        mesh(sphere(0.026, 14, 10), std(M('#F4F1EE', 1.1), { roughness: 0.25 }), tg, [0, -0.15, 0]);
        const fl = K.flower(tg, [0, -0.23, 0.01], 0.16, GOLD_MID, GOLD_DK, 5);
        K.tassel(tg, [0, -0.29, 0], LAV, 0.3, 0.058, LAV_INK);
        K.onTick((t, k) => { tg.rotation.z = 0.07 * Math.sin(t * 1.5) * k; });
      }
      // toe creases on both front paws
      {
        const cm = std(POINT_INK, { roughness: 0.8 });
        ['L', 'R'].forEach(s => {
          const p = K.hands[s].p, r = 0.156;
          [-0.045, 0.045].forEach(dx => mesh(tube([[p.x + dx, p.y + 0.02, p.z + r * 0.9], [p.x + dx * 1.1, p.y - 0.05, p.z + r * 0.88], [p.x + dx * 1.2, p.y - 0.1, p.z + r * 0.7]], 0.007, 8, 5), cm, K.poseG));
        });
      }

      /* ---------------- long lavender-grey cape, wind-blown out to the image-right ---------------- */
      // s: image-left front edge → around the back → image-right front edge; t: shoulders → hem.
      // Picture: left edge reaches x≈123 at the hem (y≈455); the right part billows out to a tip at (467,383),
      // its lower corner at (410,455); the tail sits in front of it.
      const capeG = part('cape', K.body);
      {
        const NU = 120, NV = 48, pos = [], uv = [], idx = [];
        const yTop = 2.22;
        for (let j = 0; j <= NV; j++) {
          const t = j / NV;
          for (let i = 0; i <= NU; i++) {
            const s = i / NU, ph = (-107 - 146 * s) * Math.PI / 180;
            const right = sst(0.42, 0.92, s), left = sst(0.25, 0, s);
            const r = lerp(0.47, 1.1, Math.pow(t, 0.85)) + 0.03 * Math.sin(s * Math.PI * 11) * t + 0.08 * left * t;
            const x = Math.sin(ph) * r + 0.95 * right * t;
            const z = Math.cos(ph) * r - 0.16 * right * t;
            const hemY = 0.27 + 0.72 * sst(0.7, 1, s);
            const y = lerp(yTop, hemY, t) + 0.05 * right * Math.sin(Math.PI * t);
            pos.push(x, y, z); uv.push(s, 1 - t);
          }
        }
        for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        flipOut(geo, p => V(0, p.y, 0));
        const edges = (g, w, h, col) => { g.fillStyle = col; g.fillRect(0, h - 14, w, 14); g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h); };
        // outside: lavender-grey with soft folds and cream wave / cloud bands toward the hem
        const ctex = canvasTex(1024, 512, (g, w, h) => {
          const lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, CAPE_DK); lg.addColorStop(0.35, CAPE); lg.addColorStop(1, CAPE);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          for (let i = 0; i < 11; i++) { const x = (i + 0.5) / 11 * w; const sg = g.createLinearGradient(x - 40, 0, x + 40, 0); sg.addColorStop(0, 'rgba(120,115,140,0)'); sg.addColorStop(0.5, 'rgba(120,115,140,0.15)'); sg.addColorStop(1, 'rgba(120,115,140,0)'); g.fillStyle = sg; g.fillRect(x - 40, h * 0.2, 80, h * 0.8); }
          g.lineCap = 'round';
          [[h - 60, 14, 170, 18], [h - 125, 12, 210, 12]].forEach(([y, amp, per, lw]) => D.wave(g, y, amp, per, CAPE_LT, lw));
          for (let i = 0; i < 7; i++) cloudCurl(g, 80 + i * 150, h - 100 - (i % 2) * 40, 40, CAPE_LT, 10);
          edges(g, w, h, CAPE_LT);
        });
        // inside (shows where the right part billows toward the viewer): pale lavender-cream with lavender waves
        const ltex = canvasTex(1024, 512, (g, w, h) => {
          g.fillStyle = M('#E6E3EA', 1.2); g.fillRect(0, 0, w, h);
          const lg = g.createLinearGradient(0, 0, w * 0.4, 0); lg.addColorStop(0, CAPE); lg.addColorStop(0.55, CAPE); lg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = lg; g.fillRect(0, 0, w * 0.4, h);   // image-left side reads lavender like the outside
          const vg = g.createLinearGradient(0, 0, 0, h); vg.addColorStop(0, CAPE); vg.addColorStop(0.4, CAPE); vg.addColorStop(0.62, 'rgba(0,0,0,0)');
          g.fillStyle = vg; g.fillRect(0, 0, w, h);          // upper part behind the shoulder too; only the wind-blown flap is pale
          g.lineCap = 'round';
          [[h - 70, 14, 180, 14], [h - 150, 12, 220, 10], [h - 230, 10, 200, 8]].forEach(([y, amp, per, lw]) => D.wave(g, y, amp, per, M('#BDB9CB'), lw));
          edges(g, w, h, M('#F4F0EA', 1.15));
        });
        const cm = mesh(geo, texMat(ctex, { roughness: 0.9 }), capeG, null, null, CAPE_INK);
        const ln = new THREE.Mesh(geo, texMat(ltex, { side: THREE.BackSide, roughness: 0.9 })); ln.receiveShadow = true; cm.add(ln);
        K.onTick((t, k) => { capeG.rotation.y = 0.015 * Math.sin(t * 0.8) * k; });
      }

      /* ---------------- floating autumn decorations (寒露) ---------------- */
      {
        const items = [];
        // chrysanthemum (菊有黃華) with leaves, lower image-left
        {
          const cg = group(K.decor, [X(100) - 0.35, Y(392), 0.5], [0.25, 0.3, 0]);
          const pm1 = std(M('#F6D48E', 1.3), { roughness: 0.75 }), pm2 = std(M('#EDBF6E'), { roughness: 0.75 });
          const pet = extrude([[0, 0], [0.035, 0.08], [0.028, 0.2], [0, 0.23], [-0.028, 0.2], [-0.035, 0.08]], 0.02, 0.006, 2, 6);
          [[18, 0.0, 0.35, pm2, 1], [14, 0.04, 0.8, pm1, 0.82], [10, 0.08, 1.2, pm1, 0.6], [7, 0.11, 1.5, pm1, 0.38]].forEach(([n, z, tilt, m, sc]) => {
            for (let i = 0; i < n; i++) {
              const a = i / n * Math.PI * 2 + z * 7, pg = group(cg, [0, 0, z], [0, 0, a]);
              const p = mesh(pet, m, pg, [0, 0.02, 0], [sc, sc, 1], GOLD_INK); p.rotation.x = tilt * 0.4;
            }
          });
          mesh(sphere(0.05, 16, 12), std(GOLD_DK), cg, [0, 0, 0.13]);
          const lm = std(M('#A9AE78'), { roughness: 0.8 });
          [[-0.2, -0.1, 2.2], [0.2, -0.12, -2.2], [-0.02, -0.2, 3.1]].forEach(([x, y, r]) => {
            const lf = mesh(extrude([[0, 0], [0.08, 0.06], [0.12, 0.16], [0.07, 0.2], [0.09, 0.28], [0, 0.34], [-0.09, 0.28], [-0.07, 0.2], [-0.12, 0.16], [-0.08, 0.06]], 0.02, 0.006), lm, cg, [x, y, -0.05], null, SAGE_INK);
            lf.rotation.z = r;
          });
          items.push(cg);
        }
        // maple leaf, upper image-left
        {
          const pts = [];
          for (let i = 0; i < 5; i++) {
            const a = Math.PI / 2 + (i - 2) * 0.72, a2 = a + 0.36;
            pts.push([Math.cos(a) * (i === 2 ? 0.26 : 0.22), Math.sin(a) * (i === 2 ? 0.26 : 0.22)]);
            if (i < 4) pts.push([Math.cos(a2) * 0.09, Math.sin(a2) * 0.09]);
          }
          pts.push([0.03, -0.06], [-0.03, -0.06]);
          const mg = group(K.decor, [X(112) - 0.3, Y(115), 0.2], [0.3, -0.3, -0.35]);
          mesh(extrude(pts, 0.025, 0.008), std(M('#E59A5D'), { roughness: 0.75 }), mg, null, null, '#B4663A');
          mesh(tube([[0, -0.05, 0.015], [0.02, -0.17, 0.015], [0.05, -0.24, 0.01]], 0.01, 10, 6), std(M('#C77A45')), mg);
          items.push(mg);
        }
        // flying wild goose (鴻雁來賓), upper image-right, heading to the image-left
        {
          const gg = group(K.decor, [X(412) + 0.25, Y(150), 0.3], [0, 0.35, 0.1]);
          const wm = std(M('#FBF1E3', 1.15), { roughness: 0.85 }), dm = std(M('#6D5D55'), { roughness: 0.85 }), om = std(M('#EE9A5A'), { roughness: 0.7 });
          mesh(sphere(0.16, 24, 16), wm, gg, [0, 0, 0], [1.5, 0.72, 0.8], CREAM_INK);
          mesh(tube([[-0.18, 0.02, 0], [-0.3, 0.1, 0], [-0.38, 0.14, 0]], t => 0.055 - 0.02 * t, 16, 10), dm, gg, null, null, '#4A3D37');
          mesh(sphere(0.06, 16, 12), dm, gg, [-0.41, 0.15, 0], [1.2, 0.95, 0.9], '#4A3D37');
          mesh(new THREE.ConeGeometry(0.025, 0.1, 10), om, gg, [-0.5, 0.14, 0], null, '#B8693A').rotation.z = Math.PI / 2;
          [[0.02, 0.1, 0.02, 0.5], [0.02, 0.1, -0.05, -0.2]].forEach(([x, y, z, tw]) => {
            const wg = group(gg, [x, y, z], [tw, 0, 1.25]); wg.scale.setScalar(1.5);
            mesh(extrude([[0, 0], [0.34, 0.04], [0.46, 0.12], [0.3, 0.1], [0.12, 0.09], [-0.06, 0.06]], 0.025, 0.008), wm, wg, null, null, CREAM_INK);
            mesh(extrude([[0.28, 0.035], [0.47, 0.12], [0.36, 0.13], [0.24, 0.1]], 0.03, 0.006), dm, wg);
          });
          mesh(extrude([[0.2, 0], [0.34, 0.05], [0.34, -0.05]], 0.03, 0.006), dm, gg, [0.02, 0, 0]);
          [-0.02, 0.03].forEach(z => mesh(tube([[0.08, -0.08, z], [0.18, -0.12, z], [0.26, -0.13, z]], 0.012, 8, 6), om, gg));
          items.push(gg);
        }
        // cold dew drops
        [[X(115) - 0.25, Y(72), 0.1, 0.22], [X(80) - 0.1, Y(205), 0.3, 0.2], [X(432) + 0.2, Y(256), 0.2, 0.17]].forEach(([x, y, z, s]) => items.push(K.drop(K.decor, [x, y, z], s, M('#B9CBD6', 1.2))));
        // pampas grass clumps (蒹葭): behind the tail on the image-right, and low on the image-left
        const grass = (pos, s, lean) => {
          const gg = group(K.decor, pos, [0, 0, lean]); gg.scale.setScalar(s);
          const stemM = std(M('#B7AE7A'), { roughness: 0.8 }), plM = std(M('#F2D7A6', 1.25), { roughness: 0.9 });
          [[-0.08, 0.95, -0.15], [0.05, 1.1, 0.1], [0.14, 0.8, 0.35]].forEach(([x, h, bend]) => {
            const pts = [[x, 0, 0], [x + bend * 0.3, h * 0.5, 0], [x + bend, h, 0.02]];
            mesh(tube(pts, t => 0.014 * (1 - 0.5 * t), 16, 6), stemM, gg);
            const top = V(pts[2][0], pts[2][1], pts[2][2]);
            for (let i = 0; i < 7; i++) {
              const a = top.clone().add(V(0, -0.05 * i, 0)), dir = V(0.12 + 0.02 * i, 0.04, 0).applyAxisAngle(V(0, 0, 1), bend * 0.6);
              mesh(tube([a, a.clone().addScaledVector(dir, 0.6), a.clone().addScaledVector(dir, 1).add(V(0, -0.03, 0))], t => 0.022 * (1 - 0.8 * t), 10, 6), plM, gg);
            }
          });
          mesh(ribbon([[0, 0, 0], [0.2, 0.3, 0], [0.45, 0.42, 0]], t => 0.05 * (1 - t), { face: [0, 0, 1] }), std(M('#A4A58F'), { side: DS, roughness: 0.8 }), gg);
          return gg;
        };
        items.push(grass([1.62, 1.55, -0.55], 0.95, -0.12));
        items.push(grass([X(95) - 0.45, 0.95, -0.2], 0.8, 0.35));
        // cold wind swirl, image-left
        {
          const sw = group(K.decor, [X(80) - 0.25, Y(240), -0.1]);
          const pts = [];
          for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([t * 0.7 - 0.35, 0.1 * Math.sin(t * Math.PI * 2.2) - 0.02 * t, 0]); }
          mesh(tube(pts, t => 0.03 * Math.sin(Math.PI * Math.min(t * 1.1 + 0.05, 1)) + 0.004, 60, 8), std(M('#D3D8E0', 1.2), { roughness: 0.6 }), sw);
          items.push(sw);
        }
        items.forEach(g => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.06 * Math.sin(t * 0.8 + i) * k;
        }));
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '仗劍的雁翎少俠',
        text: '寒露時節露水轉寒、鴻雁南來、黃菊盛開。這隻藍眼暹羅貓化身白袍少俠：頭插淡紫灰雁翎，左爪舉著直劍，右爪輕搭腰側，身後披著被秋風吹起的藕紫灰長披風。整體以奶油白、藕紫灰、鼠尾草綠配淡金，清冷又秀氣。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '暹羅面罩與藍眼', dir: [0, 0, 1],
        text: '奶油米白的圓臉正中央暈開一團巧克力色面罩，從鼻口往外漸淡。大大的深藍眼睛帶著朝內的白色高光和小睫毛，配上深棕小鼻、「ω」嘴和帶斜線的淡橘腮紅，兩頰還有一撮撮蓬毛。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '深棕大尖耳',
        text: '一對大尖耳占滿頭頂兩角，外緣幾乎垂直一路延到臉頰。耳朵是暹羅貓的深巧克力色，耳內粉膚色，耳根冒出一撮奶白耳毛。' },
      crown: { chip: '雁翎', tag: '服飾', name: '小金冠與雁翎', dir: [0.5, 0.35, 1],
        text: '頭頂小髻束著灰藍冠箍和三瓣蓮花小金冠。冠後竄出一大束淡紫灰翎羽：左上翹起一撮羽尖，主體扇形甩向畫面右側；另一條長翎從右耳後穿出、垂到耳旁再往內勾，像南飛大雁的羽毛。' },
      circlet: { chip: '額飾', tag: '服飾', name: '月光石額飾', dir: [0, 0.2, 1],
        text: '額頭正中是一顆包金框的淡藍月光石，上有小金冠瓣、兩側金葉，往外延伸出灰藍捲草、珍珠和水滴葉墜，下方再垂一顆淡藍小水滴，像一滴寒露。' },
      sword: { chip: '直劍', tag: '道具', name: '銀白直劍與劍穗', dir: [-0.3, 0.1, 1],
        text: '左爪握著一把往左上斜舉的直劍：銀白劍身帶淡藍劍脊，護手是四瓣金花、中間鑲月光石，金色劍首下垂著珍珠、金梅結和一串藕紫長流蘇。' },
      armor: { chip: '肩甲', tag: '服飾', name: '白毛圍領與雲紋肩甲',
        text: '蓬鬆的白毛圍領包住肩頸，前端釘著兩朵金梅扣；中間露出鼠尾草綠交領和藕紫蝴蝶結。兩肩各有兩層扇貝邊肩甲：上層淡金魚鱗雲紋，下層灰藍，鑲金邊。' },
      robe: { chip: '長袍', tag: '服飾', name: '米白大袖長袍',
        text: '米白長袍的胸前兩側是鼠尾草綠直襟、內壓金邊。大袖外白內襯藕灰藍：舉劍的左袖從前臂垂成大袖袋，外緣露出一線藕紫裡襯；右袖從手肘垂下，袖口朝著搭在腰側的右爪。' },
      skirt: { chip: '前擋', tag: '服飾', name: '松石芒草前擋', dir: [0, -0.1, 1],
        text: '腰下正中一片圓底前擋，四周鑲金邊，畫著淡綠松石小景與米色芒草；兩側是繡芒草的米白外襬，斜斜垂下，最底露出一圈鼠尾草綠下襬，下面是白燈籠褲和金邊深棕短靴。' },
      belt: { chip: '玉璧', tag: '服飾', name: '綠玉璧腰帶',
        text: '灰褐腰帶上下壓金線，正中一片金框綠玉璧，上方襯著金色半月飾；璧下垂金珠與藕紫流蘇，右側再斜垂一條藕紫綬帶和金色小穗。' },
      cape: { chip: '披風', tag: '服飾', name: '藕紫灰長披風', dir: [0.6, 0.2, -0.8],
        text: '藕紫灰長披風從肩後一路垂到地面，下緣繡米白波浪雲紋；畫面右側被秋風吹成尖角、翻出淡紫白裡襯，襯在尾巴後面。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '巧克力色蓬尾', dir: [1, 0.2, 0.4],
        text: '又粗又蓬的深棕大尾巴從身體右後方翹起，往上捲成問號形、尾尖朝下；尾根顏色較淺，越往尾端越深。' }
    },
    order: ['overview', 'face', 'ears', 'crown', 'circlet', 'sword', 'armor', 'robe', 'belt', 'cape', 'tail']
  });
})();
