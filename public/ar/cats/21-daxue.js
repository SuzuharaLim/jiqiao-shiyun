// @file 21_大雪_雲豹
// @title 大雪・雪神滕六 | 二十四節氣貓
(function () {
  /* ---------------------------------------------------------------------------
   * 21 大雪 — long-haired spotted big cat as the old snow god, snowflake banner in the image-left paw.
   * Picture scale: 1 unit = 100 px of refs/21.png, feet at y = 0 (px y 485), body axis at px x = 263.
   * Colours are SAMPLED from the picture; def.exposure dims the lights so they render close to it.
   * ------------------------------------------------------------------------- */
  const X = px => (px - 263) / 100, Y = py => (485 - py) / 100;
  const HY = 3.0, NECK = 2.36;
  // The lights brighten and warm the pale fur (~1.25x, red > blue); M() turns a SAMPLED colour into the
  // material colour that renders back close to it (f = linear gain to undo, cool = undo the warm tint).
  function M(hex, f, cool) {
    const n = parseInt(hex.slice(1), 16), tint = cool ? [1.06, 1.02, 0.92] : [1, 1, 1];
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / (f * tint[i]), 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  const FUR = M('#DCD5D2', 1.22, 1), FUR_TOP = M('#C9C2C0', 1.22, 1), FUR_LOW = M('#EFE9E5', 1.18, 1), WHITE = M('#FBF7F3', 1.18, 1);
  const SPOT = M('#A39C9D', 1.25, 1), SPOT_DK = M('#8E8A8E', 1.25, 1);
  const INK = '#948178', WHITE_INK = '#BDB0A6', EAR_IN = M('#F7D3C6', 1.15, 1);
  const NAVY = '#636C82', NAVY_LT = '#6E768B', NAVY_INK = '#434A58';
  const ICE = M('#A5B5C3', 1.1), ICE_DK = M('#8FA2B6', 1.05), FLAKE = M('#9BADBE', 1.05), SWIRL = M('#A9B7C7', 1.05);
  const GOLD = M('#D2A974', 1.15), GOLD_LT = M('#EFCF96', 1.15), GOLD_INK = '#9E7847';
  const CREAM = M('#FBF4E8', 1.18, 1), CREAM_INK = '#BBAE9E', SOLE = M('#F2E6D9', 1.15, 1);
  const BERRY = '#D97C78', TWIG = '#9C8070';
  const TAIL = M('#E0D9D7', 1.1, 1), TAIL_LT = M('#F3EEEA', 1.0, 1), TAIL_SPOT = M('#A39D9E', 1.0, 1);

  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // flag pole (world): bottom ball → top under the finial; the image-left paw sits on this line
  const PB = [X(207), Y(440), 0.98], PT = [X(131), Y(52), 0.3];
  const poleAt = y => { const t = (y - PB[1]) / (PT[1] - PB[1]); return [lerp(PB[0], PT[0], t), y, lerp(PB[2], PT[2], t)]; };
  const HAND_L = poleAt(2.0);
  const HAND_R = [0.55, 1.47, 0.97];
  // arm paths shoulder → elbow → wrist; the sleeve sacks hang below them (built in build())
  const ARM_L = [[-0.42, 2.12, 0.02], [-0.95, 1.9, 0.3], [-1.2, 1.84, 0.5], [-0.84, 1.93, 0.64]];
  const ARM_R = [[0.42, 2.12, 0.02], [0.95, 1.84, 0.3], [1.2, 1.6, 0.52], [0.63, 1.56, 0.84]];
  // forearm sacks (elbow → cuff), in front of the cloak
  const FORE_L = [[-1.3, 1.86, 0.48], [-1.12, 1.9, 0.58], [-0.84, 1.93, 0.64]];
  const FORE_R = [[1.3, 1.62, 0.5], [1.02, 1.59, 0.68], [0.63, 1.56, 0.84]];

  /* ---------------- canvas motifs ---------------- */
  // six-armed snowflake with leaf-like side branches and round tips (flag, medallions, boots)
  function flake(g, x, y, s, color, lw, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.strokeStyle = color; g.fillStyle = color; g.lineCap = 'round'; g.lineWidth = lw || Math.max(2, s * 0.12);
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate(i * Math.PI / 3);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s * 0.9); g.stroke();
      [[0.38, 0.3], [0.62, 0.24]].forEach(([k, l]) => {
        [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(0, -s * k); g.lineTo(sd * s * l * 0.8, -s * (k + l * 0.75)); g.stroke(); });
      });
      g.beginPath(); g.arc(0, -s * 0.93, g.lineWidth * 0.75, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.beginPath(); g.arc(0, 0, s * 0.14, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // wind / wave curl: a long tail sweeping into a spiral
  function swirl(g, x, y, s, color, lw, flip) {
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
    g.strokeStyle = color; g.lineWidth = lw || s * 0.14; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-s * 1.3, s * 0.3);
    g.bezierCurveTo(-s * 0.6, s * 0.45, s * 0.1, s * 0.4, s * 0.35, 0);
    for (let a = 0; a <= Math.PI * 2.4; a += 0.2) { const r = s * 0.38 * (1 - a / (Math.PI * 3)); g.lineTo(s * 0.0 + Math.cos(a) * r, -s * 0.05 - Math.sin(a) * r); }
    g.stroke(); g.restore();
  }
  // winter berry twig: brown stem, three red berries, a blue-grey bud
  function berries(g, x, y, s, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.strokeStyle = TWIG; g.lineCap = 'round'; g.lineWidth = Math.max(2, s * 0.06);
    g.beginPath(); g.moveTo(-s * 0.1, s * 0.5); g.quadraticCurveTo(0, 0, s * 0.05, -s * 0.45); g.stroke();
    g.beginPath(); g.moveTo(0, s * 0.05); g.lineTo(-s * 0.3, -s * 0.28); g.stroke();
    g.beginPath(); g.moveTo(s * 0.02, -s * 0.12); g.lineTo(s * 0.32, -s * 0.34); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.05, s * 0.28); g.lineTo(s * 0.26, s * 0.08); g.stroke();
    [[-0.32, -0.32], [0.05, -0.5], [0.34, -0.38]].forEach(([bx, by]) => {
      g.fillStyle = BERRY; g.beginPath(); g.arc(bx * s, by * s, s * 0.1, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(bx * s - s * 0.03, by * s - s * 0.03, s * 0.03, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = ICE_DK; g.beginPath(); g.ellipse(s * 0.3, s * 0.05, s * 0.05, s * 0.1, 0.9, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function diamond(g, x, y, s, color) {
    g.save(); g.translate(x, y); g.fillStyle = color;
    g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.45, 0); g.lineTo(0, s); g.lineTo(-s * 0.45, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(0, -s * 0.8); g.lineTo(s * 0.15, 0); g.lineTo(0, s * 0.3); g.closePath(); g.fill();
    g.restore();
  }
  const medalFace = (g) => { flake(g, 128, 128, 92, '#FFFFFF', 13); };

  let flagG = null;

  NEKO.run({
    meta: {
      id: '21', term: '大雪', title: '大雪・雪神滕六', seal: '雪',
      eyebrow: '二〇二七節氣貓 · 21 大雪 · 雲豹',
      aria: '頭戴深藍金邊圓頂帽、帽前有雪花圓徽與金流蘇，留著一大把白色長鬍鬚，身披白毛滾邊的深藍大氅、內穿米白雪花蔽膝與寬袖，畫面左爪握著掛有雪花大旗的金色長桿，身後拖著布滿灰色斑點的蓬鬆大尾巴的灰白斑紋大貓 3D 模型'
    },
    theme: { accent: '#4F5A70', accentDark: '#B9C4D6', glow: 'rgba(165, 181, 195, 0.32)', glowColor: '#C9D6E6' },
    palette: [['#DCD5D2', '雪豹灰'], ['#5F677A', '夜霧藍'], ['#A5B5C3', '冰晶藍'], ['#D8AC74', '暖金']],
    spec: [['品種', '雲豹（畫風近雪豹）'], ['角色', '雪神滕六'], ['頭身比', '約 1 : 1.6']],
    seed: 2107,
    exposure: 0.8,

    action: {
      label: '揮旗', dur: 2.2,
      run(s, p) { if (flagG) flagG.rotation.z = -0.22 * s * Math.sin(p * Math.PI * 4); }
    },

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR, low: FUR_LOW, deep: SPOT, cream: WHITE,
        ink: INK, creamInk: WHITE_INK, noise: { colors: ['#FFFFFF', '#B9B2B0'], alpha: 0.06, n: 1400 },
        paintBase(g, P) {
          const L = (lon, lat) => P.xy(lon, lat);
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.35, FUR); vg.addColorStop(0.7, FUR_LOW); vg.addColorStop(1, WHITE);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // back and sides of the head: scattered rosette spots (the front ones are painted in build with exact positions)
          g.filter = 'blur(1.4px)';
          for (let i = 0; i < 46; i++) {
            const lon = (i % 2 ? 1 : -1) * (72 + ((i * 37) % 108)), lat = -22 + ((i * 53) % 92);
            const [x, y] = L(lon, lat), s = 9 + (i * 7) % 7;
            P.blob(g, x, y, s * 1.2, s * 0.8, SPOT, 0.9, (i % 5) * 0.6);
            P.blob(g, x + s * 0.9, y + s * 0.5, s * 0.7, s * 0.5, SPOT, 0.85, 0.3);
          }
          g.filter = 'none';
        }
      },
      head: { y: HY, neck: NECK, w: 0.83, h: 0.74, d: 0.8, cheek: 0.13, ruff: 0.075, ruffFreq: 13, chinDrop: 0.03,
        fur: { layers: 20, length: 0.1, gravity: 0.03, repeat: [10, 6] } },
      eyes: { x: 0.3, y: 0.0, r: 0.08, sx: 0.9, sy: 1.08, sz: 0.42, color: '#553C2D', shine: 0.85 },
      nose: { y: -0.05, color: '#E8ADA3', size: 0.8 },
      muzzle: { y: -0.13, size: 0.42, color: WHITE },
      mouth: { type: 'w', color: '#4F3A2E', y: -0.14, w: 0.13, depth: 0.045 },
      blush: { color: 'rgba(244,160,150,0.6)', x: 0.5, y: -0.125, r: 26, after: true },
      whiskers: null,
      ears: { x: 0.66, y: 0.44, z: -0.1, tilt: 0.5, yaw: 0.25, pitch: -0.06, size: [0.35, 0.6, 0.15], sharp: 0.78, innerScale: 1.0, tuftScale: 1.6,
        color: FUR, inner: EAR_IN, tuft: WHITE, fur: { layers: 8, length: 0.03, gravity: 0.01, repeat: [3, 3] } },
      bib: false,
      robe: {
        profile: [[0.96, 0.4], [0.95, 0.5], [0.9, 0.75], [0.8, 1.05], [0.7, 1.35], [0.61, 1.7], [0.55, 1.95], [0.47, 2.18], [0.32, 2.34], [0.1, 2.42]],
        color: '#FFFFFF', ink: NAVY_INK, lining: NAVY, hemY: 0.5,
        paint(g, w, h, D, R) {
          D.fill(g, NAVY);
          const Yb = R.robeV(1.7), Yn = R.robeV(2.36), Xd = deg => 512 + deg / 360 * 1024;
          // cream inner robe in a V above the belt, with light-blue crossed-collar bands
          g.fillStyle = CREAM; g.beginPath(); g.moveTo(Xd(-44), Yn); g.lineTo(Xd(44), Yn); g.lineTo(Xd(0), Yb + 20); g.closePath(); g.fill();
          [-1, 1].forEach(k => {
            g.strokeStyle = ICE; g.lineWidth = 26; g.beginPath(); g.moveTo(Xd(40 * k), Yn); g.lineTo(Xd(2 * k), Yb + 10); g.stroke();
            g.strokeStyle = GOLD; g.lineWidth = 5; g.beginPath(); g.moveTo(Xd(31 * k), Yn); g.lineTo(Xd(-4 * k), Yb + 14); g.stroke();
          });
          // light-blue hem band
          const yh = R.robeV(0.5);
          g.fillStyle = ICE; g.fillRect(0, yh, w, h - yh);
        }
      },
      collar: false,
      arms: {
        L: { hand: HAND_L, path: ARM_L, wrist: false, pawScale: 1.42 },
        R: { hand: HAND_R, path: ARM_R, wrist: false, pawScale: 1.3 }
      },
      sleeves: false,
      paws: { color: WHITE, ink: WHITE_INK },
      belt: { yT: 1.7, yB: 1.42, color: NAVY, line: false, knot: false, tassel: false },
      legs: null,
      feet: false,
      tail: {
        pts: [[0.35, 0.55, -0.62], [0.95, 0.42, -0.85], [1.58, 0.5, -0.8], [1.9, 0.95, -0.7], [1.74, 1.5, -0.62], [1.66, 1.88, -0.56], [1.84, 2.07, -0.5], [2.08, 1.95, -0.46], [2.12, 1.66, -0.42], [1.97, 1.47, -0.4]],
        r: 0.42, ink: INK,
        shape: t => Math.pow(Math.sin(Math.PI * (0.06 + 0.94 * t)), 0.32) * (0.8 + 0.2 * sst(0, 0.25, t)) * (1 - 0.32 * sst(0.62, 0.95, t)),
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, TAIL); lg.addColorStop(0.72, TAIL); lg.addColorStop(0.86, TAIL_LT); lg.addColorStop(1, TAIL_LT);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          // light fur streaks
          g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
          for (let i = 0; i < 120; i++) { const x = (i * 97) % w, y = (i * 29) % h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y + 1); g.stroke(); }
          // open rosettes (C-shaped groups of blobs), stretched along the tail map
          g.filter = 'blur(0.5px)';
          for (let i = 0; i < 90; i++) {
            const x = 50 + (i * 131) % 820, y = (i * 23 + (i % 3) * 7) % h, s = 1 + (i % 4) * 0.15;
            [[0, 0, 18, 2.4], [14, 2.2, 9, 1.8], [-13, 2.6, 9, 1.7]].forEach(([dx, dy, rx, ry]) => {
              g.fillStyle = i % 5 ? TAIL_SPOT : SPOT_DK; g.beginPath(); g.ellipse(x + dx * s, (y + dy) % h, rx * s, ry * s, 0, 0, Math.PI * 2); g.fill();
            });
          }
          g.filter = 'none';
        },
        fur: { layers: 16, length: 0.075, gravity: 0.02, repeat: [16, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, lathe, ribbon, medal, D } = K;
      const DS = THREE.DoubleSide;
      const whiteM = std(WHITE, { roughness: 0.95 }), beardM = std(M('#FBF7F3', 1.02, 1), { roughness: 0.95 });
      const goldM = std(GOLD, { roughness: 0.45, metalness: 0.15 });
      const navyM = std(NAVY, { roughness: 0.8 });
      const orient = (m, dir) => { m.quaternion.setFromUnitVectors(V(0, 1, 0), dir); return m; };

      /* ======================= face: spots, pale mask, freckles ======================= */
      {
        const g = K.headTex.image.getContext('2d');
        const at = (x, y) => { const s = K.onSkin(x, y, [K.headMesh]); return s.uv ? [s.uv.x * 1024, (1 - s.uv.y) * 512] : null; };
        // white lower face with pale brow patches above the eyes
        const mask = [[0, 2.98], [-0.1, 3.08], [-0.2, 3.14], [-0.32, 3.16], [-0.43, 3.08], [-0.48, 2.95], [-0.62, 2.8], [-0.78, 2.6], [-0.8, 2.3],
          [0.8, 2.3], [0.78, 2.6], [0.62, 2.8], [0.48, 2.95], [0.43, 3.08], [0.32, 3.16], [0.2, 3.14], [0.1, 3.08]].map(([x, y]) => at(x, y)).filter(Boolean);
        g.save(); g.filter = 'blur(6px)'; g.fillStyle = WHITE; g.beginPath();
        mask.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
        // grey bridge running down between the eyes
        const b0 = at(0, 3.2), b1 = at(0, 3.02);
        if (b0 && b1) D.stroke(g, [b0, b1], 26, '#DAD3D0', 0.8);
        g.filter = 'blur(1.1px)';
        // rosette spots, positions read off the picture (px) — symmetric rows over the forehead and cheeks
        const spots = [[244, 121, 7], [285, 122, 7], [226, 130, 8], [305, 129, 8], [237, 141, 7], [295, 142, 7], [256, 156, 6], [275, 154, 6],
          [215, 146, 8], [316, 146, 8], [198, 159, 9], [328, 159, 9], [205, 170, 7], [322, 170, 7], [190, 184, 9], [336, 184, 9],
          [178, 201, 8], [346, 198, 8], [340, 170, 6], [187, 170, 6], [210, 118, 7], [318, 115, 7], [196, 134, 7], [333, 134, 7], [265, 140, 5]];
        spots.forEach(([px, py, r], i) => {
          const c = at(X(px), Y(py)); if (!c) return;
          const k = r * 1.9, rot = (i % 4) * 0.7;
          D.blob(g, c[0], c[1], k * 1.25, k * 0.8, i % 3 ? SPOT : SPOT_DK, 0.92, rot);
          D.blob(g, c[0] + k * 0.8, c[1] + k * 0.55, k * 0.6, k * 0.45, SPOT, 0.85, rot + 0.8);
        });
        g.filter = 'none';
        // two freckle dots in each blush
        [-1, 1].forEach(sx => [-0.035, 0.035].forEach(dx => {
          const c = at(sx * 0.5 + dx, HY - 0.125); if (!c) return;
          g.fillStyle = 'rgba(232,120,112,0.85)'; g.beginPath(); g.arc(c[0], c[1], 2.6, 0, Math.PI * 2); g.fill();
        }));
        g.restore();
        K.headTex.needsUpdate = true;
      }

      /* ======================= long white beard & mustache ======================= */
      const beardG = part('beard', K.faceG);
      {
        const T0 = 2.86, T1 = Y(306);
        const hw = t => t < 0.33 ? lerp(0.46, 0.61, sst(0, 0.33, t)) : 0.61 * Math.pow(Math.max(0, 1 - (t - 0.33) / 0.67), 0.9);
        const hd = t => t < 0.35 ? lerp(0.2, 0.24, t / 0.35) : 0.24 * Math.pow(Math.cos(Math.PI / 2 * (t - 0.35) / 0.65), 0.7);
        const zc = t => 0.5 + 0.18 * t;
        const geo = new THREE.SphereGeometry(1, 56, 44), p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rho = Math.sqrt(x * x + z * z);
          const t = (1 - y) / 2, yy = lerp(T0, T1, t);
          const nx = rho > 1e-5 ? x / rho : 0, nz = rho > 1e-5 ? z / rho : 0, rr = Math.pow(rho, 0.8);
          // wavy lower edge and a tip that swings a little to image-right
          const wav = 1 + 0.06 * Math.sin(nx * 9 + t * 4) * sst(0.4, 0.9, t);
          p.setXYZ(i, nx * rr * hw(t) * wav + 0.07 * sst(0.7, 1, t), yy, nz * rr * hd(t) + zc(t));
        }
        K.smoothNormals(geo);
        const bm = mesh(geo, beardM, beardG, null, null, WHITE_INK);
        K.addFur(bm, { layers: 14, length: 0.055, gravity: 0.02, repeat: [6, 9] });
        // hair strands flowing to the point
        const sm = std('#D9CEC4', { roughness: 0.9 });
        [[-0.4, -0.18], [-0.24, -0.1], [-0.08, -0.02], [0.1, 0.04], [0.26, 0.1], [0.42, 0.16]].forEach(([x0, x1], i) => {
          const pts = [];
          for (let k = 0; k <= 8; k++) {
            const tt = 0.12 + k / 8 * (0.72 + 0.08 * (i % 2)), yy = lerp(T0, T1, tt);
            const x = lerp(x0, x1 * 0.4 + 0.07, Math.pow(k / 8, 1.3)) + 0.035 * Math.sin(k * 1.4 + i);
            const hit = K.onSkin(x, yy, [bm]);
            if (hit.uv) pts.push(hit.p.clone().add(V(0, 0, 0.012)));
          }
          if (pts.length > 3) mesh(tube(pts, t => 0.0085 * Math.sin(Math.PI * (0.1 + 0.8 * t)), 40, 5), sm, beardG);
        });
        // handlebar mustache sweeping out from under the nose, the ends hooking up
        const faceParts = K.muzzle.concat(K.headMesh);
        [-1, 1].forEach(sx => {
          const ctrl = [[0.06, 2.78], [0.17, 2.71], [0.3, 2.655], [0.43, 2.65], [0.535, 2.685], [0.575, 2.745], [0.53, 2.775]];
          const pts = ctrl.map(([x, y], k) => {
            const zf = K.onSkin(x * sx, y, faceParts).p.z, zb = K.onSkin(x * sx, y, [bm]);
            return V(x * sx, y, Math.max(zf, zb.uv ? zb.p.z : 0) + 0.05 - 0.03 * k / 6);
          });
          const mu = mesh(tube(pts, t => 0.014 + 0.072 * Math.pow(Math.sin(Math.PI * (0.06 + 0.86 * t)), 0.7) * (1 - 0.5 * t), 48, 14), whiteM, beardG, null, null, WHITE_INK);
          K.addFur(mu, { layers: 6, length: 0.02, gravity: 0.005, repeat: [10, 2] });
          const low = [[0.08, 2.72], [0.2, 2.65], [0.32, 2.61], [0.42, 2.6]].map(([x, y]) => {
            const zb = K.onSkin(x * sx, y, [bm]);
            return V(x * sx, y, Math.max(K.onSkin(x * sx, y, faceParts).p.z, zb.uv ? zb.p.z : 0) + 0.025);
          });
          mesh(tube(low, t => 0.04 * Math.sin(Math.PI * (0.15 + 0.85 * t)), 24, 10), whiteM, beardG, null, null, WHITE_INK);
        });
      }

      /* ======================= long cheek tufts and ear fur ======================= */
      {
        const edgeX = (y) => { let lo = 0, hi = 1.5; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; } return lo; };
        const lock = (parent, root, dir, len, r0, mat, ink, bend) => {
          const d = V(dir[0], dir[1], dir[2]).normalize(), a0 = V(root[0], root[1], root[2]);
          const b0 = a0.clone().addScaledVector(d, len * 0.55).add(V(0, bend * len, 0)), c0 = a0.clone().addScaledVector(d, len);
          return mesh(tube([a0, b0, c0], t => r0 * (1 - Math.pow(t, 1.3)) + 0.004, 20, 10), mat, parent, null, null, ink);
        };
        const gm = std(FUR, { roughness: 0.95 }), lm = std(FUR_LOW, { roughness: 0.95 }), wm = std(WHITE, { roughness: 0.95 });
        [-1, 1].forEach(sx => {
          // [height, angle below horizontal (deg), length, root radius]
          [[3.2, -8, 0.12, 0.07], [3.06, 4, 0.15, 0.08], [2.92, 14, 0.19, 0.09], [2.78, 24, 0.22, 0.09], [2.64, 34, 0.2, 0.09], [2.52, 46, 0.17, 0.085]].forEach(([y, ang, len, r0], i) => {
            const ex = edgeX(y), a = ang * Math.PI / 180, zz = [0.1, -0.05, 0.1, -0.05, 0.08, -0.04][i];
            lock(K.faceG, [sx * (ex - 0.08), y, zz], [sx * Math.cos(a), -Math.sin(a), zz * 0.6], len, r0, i < 2 ? gm : lm, i < 2 ? INK : WHITE_INK, -0.1);
          });
        });
        K.ears.forEach(({ g, sx }) => {
          [[-0.05, 0.02, 0.2, 0.065], [0.05, 0.02, 0.15, 0.055]].forEach(([x, y, len, r0]) => {
            const l = lock(g, [x * sx, y + 0.03, 0.09], [-0.35 * sx - x * sx, 1, 0.3], len, r0, wm, null, 0);
            K.addFur(l, { layers: 6, length: 0.03, gravity: 0.01, repeat: [3, 3] });
          });
        });
      }

      /* ======================= domed snow cap ======================= */
      const hatG = part('hat', K.head);
      hatG.position.set(0, 3.66, 0.0);
      {
        const zs = 0.92;
        const prof = [[0.34, 0.0], [0.355, 0.07], [0.378, 0.2], [0.388, 0.33], [0.365, 0.43], [0.3, 0.51], [0.2, 0.565], [0.08, 0.59], [0.001, 0.595]];
        const tex = canvasTex(1024, 256, (g, w, h) => {
          D.fill(g, NAVY);
          const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(0,0,0,0.06)');
          g.fillStyle = sh; g.fillRect(0, 0, w, h);
          // curved gold ribs from the rim up to the crown ring (u = 0.5 front, 0.75 image-right)
          g.strokeStyle = GOLD; g.lineWidth = 9; g.lineCap = 'round';
          [-140, -48, 48, 140].forEach(d => {
            const x0 = (0.5 + d / 360) * w, x1 = (0.5 + (d * 0.6) / 360) * w;
            g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo(x0, h * 0.35, x1, h * 0.12); g.stroke();
          });
        });
        const hl = lathe(prof, 72, Math.PI, Math.PI * 2, 40);
        mesh(hl.geo, texMat(tex, { roughness: 0.75 }), hatG, null, [1, 1, zs], NAVY_INK);
        const rim = mesh(new THREE.TorusGeometry(0.352, 0.032, 12, 72), goldM, hatG, [0, 0.03, 0], [1, 1, 1], GOLD_INK);
        rim.rotation.x = Math.PI / 2; rim.scale.set(1, zs, 1);
        const top = mesh(new THREE.TorusGeometry(0.2, 0.022, 10, 56), goldM, hatG, [0, 0.555, 0], null, GOLD_INK);
        top.rotation.x = Math.PI / 2; top.scale.set(1, zs, 1);
        mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.08, 20), goldM, hatG, [0, 0.62, 0], null, GOLD_INK);
        mesh(sphere(0.07, 28, 20), std(GOLD_LT, { roughness: 0.4, metalness: 0.15 }), hatG, [0, 0.71, 0], null, GOLD_INK);
        // snowflake medallion on the front
        medal(hatG, [0, 0.28, 0.388 * zs + 0.02], 0.155, medalFace, GOLD, GOLD_INK, '#93A8BB');
        // forehead pendant: gold loop, pale-blue bead, gold tassel
        const zF = K.zAt(0, 3.56);
        mesh(new THREE.TorusGeometry(0.032, 0.012, 8, 20), goldM, hatG, [0, -0.035, zF + 0.08], null, GOLD_INK);
        mesh(sphere(0.05, 20, 14), std(M('#DDE7EF', 1.1), { roughness: 0.25 }), hatG, [0, -0.1, K.zAt(0, 3.56) + 0.1], null, '#8C9DB0');
        K.tassel(hatG, [0, -0.17, K.zAt(0, 3.5) + 0.1], GOLD_LT, 0.22, 0.058, GOLD_INK).rotation.x = -0.15;
        // frosted leaf sprigs at both sides
        const leafShape = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.45, 0, L); s.quadraticCurveTo(-w, L * 0.45, 0, 0); return s; };
        const lg = extrude(leafShape(0.18, 0.06), 0.016, 0.006, 2, 10), lgS = extrude(leafShape(0.14, 0.05), 0.014, 0.005, 2, 10);
        const lm = std('#E4EAF0', { roughness: 0.6 }), stm = std('#B8C3D0', { roughness: 0.7 });
        [-1, 1].forEach(sx => {
          const sp = group(hatG, [0.36 * sx, 0.1, 0.12], [0, 0.25 * sx, -0.55 * sx]);
          mesh(tube([[0, 0, 0], [0.01 * sx, 0.16, 0], [0, 0.34, 0]], 0.011, 12, 6), stm, sp);
          [[0.07, 1, lg], [0.09, -1, lg], [0.19, 1, lgS], [0.2, -1, lgS]].forEach(([y, k, geo]) => {
            mesh(geo, lm, sp, [0, y, 0], null, '#8E9CB0').rotation.z = -k * 0.75;
          });
          mesh(lgS, lm, sp, [0, 0.31, 0], null, '#8E9CB0');
        });
      }

      /* ======================= inner robe hem fur ======================= */
      {
        const ring = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; ring.push(V(Math.sin(a) * 0.96, 0.43, Math.cos(a) * 0.96)); }
        const hf = mesh(tube(ring, 0.1, 120, 12, true), whiteM, K.robeG, null, null, WHITE_INK);
        K.addFur(hf, { layers: 10, length: 0.06, gravity: 0.02, repeat: [24, 2] });
      }

      /* ======================= navy fur-trimmed outer robe (大氅) ======================= */
      const cloakG = part('cloak', K.body);
      const Y0 = 0.5, Y1 = 2.34, ZS = 0.72;
      const cProf = new THREE.SplineCurve([[1.42, 0.5], [1.38, 0.7], [1.3, 1.0], [1.24, 1.35], [1.19, 1.65], [1.1, 1.88], [0.93, 2.08], [0.72, 2.24], [0.52, 2.34]]
        .map(q => new THREE.Vector2(q[0], q[1]))).getSpacedPoints(80);
      const cR = (y) => { for (let i = 0; i < cProf.length - 1; i++) { const a = cProf[i], b = cProf[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < Y0 ? 1.42 : 0.52; };
      const gapW = (y) => lerp(0.5, 0.42, sst(0.5, 1.6, y));
      const phiH = (y) => Math.asin(Math.min(gapW(y) / cR(y), 0.97));
      const insideCloak = (p) => { if (p.y < Y0 || p.y > Y1) return false; const r = cR(p.y); return (p.x * p.x) / (r * r) + (p.z * p.z) / (r * r * ZS * ZS) < 1; };
      {
        const nu = 140, nv = 56, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, y = lerp(Y0, Y1, t), r = cR(y), ph = phiH(y);
          for (let i = 0; i <= nu; i++) { const phi = ph + (Math.PI * 2 - 2 * ph) * i / nu; pos.push(Math.sin(phi) * r, y, Math.cos(phi) * r * ZS); uv.push(i / nu, t); }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const W = 2048, H = 512;
        const tex = canvasTex(W, H, (g, w, h) => {
          D.fill(g, NAVY);
          const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,0.06)'); sh.addColorStop(1, 'rgba(20,24,40,0.08)');
          g.fillStyle = sh; g.fillRect(0, 0, w, h);
          const rowY = (y) => (1 - (y - Y0) / (Y1 - Y0)) * h;
          const colX = (deg, y) => { const ph = phiH(y), a = ((deg % 360) + 360) % 360 * Math.PI / 180; return (a - ph) / (Math.PI * 2 - 2 * ph) * w; };
          // light-blue bands with a gold line down both front edges (constant world width)
          const band = (wd, col, off) => {
            [0, 1].forEach(side => {
              g.fillStyle = col; g.beginPath();
              const A = [], B = [];
              for (let k = 0; k <= 30; k++) {
                const y = lerp(Y0, Y1, k / 30), circ = cR(y) * (Math.PI * 2 - 2 * phiH(y)) * 0.9, px = w / circ;
                const a = off * px, b = (off + wd) * px;
                A.push([side ? w - a : a, rowY(y)]); B.push([side ? w - b : b, rowY(y)]);
              }
              A.concat(B.reverse()).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
            });
          };
          band(0.12, ICE, 0); band(0.018, GOLD, 0.12);
          // pale wind curls on the shoulders and the lower skirt, snowflakes on the skirt and back
          [[40, 2.02, 1], [-40, 2.02, 0], [120, 1.9, 1], [-120, 1.9, 0], [180, 1.95, 1]].forEach(([d, y, f]) => swirl(g, colX(d, y), rowY(y), 34, SWIRL, 7, !f));
          [[-38, 0.8, 0], [-60, 0.62, 1], [150, 0.8, 0], [-150, 0.8, 1]].forEach(([d, y, f]) => swirl(g, colX(d, y), rowY(y), 40, SWIRL, 8, !f));
          [[42, 0.78], [180, 0.9], [110, 1.2], [-110, 1.2]].forEach(([d, y]) => flake(g, colX(d, y), rowY(y), 40, '#C9D3DE', 6));
          // light-blue band above the fur hem
          g.fillStyle = ICE; g.fillRect(0, rowY(0.64), w, rowY(0.58) - rowY(0.64));
        });
        const cm = mesh(geo, texMat(tex, { side: DS, roughness: 0.85 }), cloakG, null, null, NAVY_INK);
        cm.userData.cloak = true;
        // thick white fur hem
        const hem = []; for (let k = 0; k <= nu; k += 2) hem.push(V(pos[k * 3] * 1.0, Y0 + 0.02, pos[k * 3 + 2] * 1.0));
        const hf = mesh(tube(hem, 0.11, 160, 12), whiteM, cloakG, null, null, WHITE_INK);
        K.addFur(hf, { layers: 12, length: 0.075, gravity: 0.02, repeat: [40, 2] });
        // fluffy fur collar over the shoulders (dips at the front under the beard)
        const ring = [];
        for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, f = Math.pow(Math.max(0, Math.cos(a)), 2); ring.push(V(Math.sin(a) * 0.6, 2.3 - 0.1 * f, Math.cos(a) * 0.52)); }
        const fc = mesh(tube(ring, 0.17, 128, 16, true), whiteM, cloakG, null, null, WHITE_INK);
        K.addFur(fc, { layers: 14, length: 0.08, gravity: 0.03, repeat: [16, 3] });
      }

      /* ======================= sleeves: cream sacks hanging straight down under each forearm ======================= */
      const sleevesG = part('sleeves', K.body);
      const sleeveOf = {};
      {
        const UPV = V(0, 1, 0);
        const sack = (pts, o) => {
          const path = new THREE.CatmullRomCurve3(pts.map(q => V(q[0], q[1], q[2])));
          const NT = 64, NA = 56, pos = [], uv = [], idx = [], ring = [], sides = [];
          for (let i = 0; i <= NT; i++) {
            const T = path.getTangentAt(i / NT); let sd = T.clone().cross(UPV);
            if (sd.lengthSq() < 1e-4) sd = V(1, 0, 0); sides.push(sd.normalize());
          }
          if (sides[NT].z < 0) sides[NT].negate();
          for (let i = NT - 1; i >= 0; i--) if (sides[i].dot(sides[i + 1]) < 0) sides[i].negate();
          const secs = [];
          for (let i = 0; i <= NT; i++) {
            const t = i / NT, C = path.getPointAt(t), sd = sides[i];
            const rw = o.rw(t), rt = o.rt(t), dr = o.drop(t), sec = [];
            for (let j = 0; j <= NA; j++) {
              const a = j / NA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
              const up = ca >= 0 ? rt * ca : -dr * Math.pow(-ca, 0.72);
              const q = C.clone().addScaledVector(sd, rw * sa * (ca < 0 ? 1 + 0.3 * Math.pow(-ca, 1.5) : 1)).addScaledVector(UPV, up);
              pos.push(q.x, q.y, q.z); uv.push(j / NA, t); sec.push(q);
            }
            secs.push(sec);
            if (i === NT) ring.push(...sec.slice(0, -1));
          }
          for (let i = 0; i < NT; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
          geo.setIndex(idx); K.smoothNormals(geo);
          // make the normals point outward
          const k = (NT / 2) * (NA + 1) + NA / 4, pv = V().fromBufferAttribute(geo.attributes.position, k), nv = V().fromBufferAttribute(geo.attributes.normal, k);
          if (nv.dot(pv.clone().sub(path.getPointAt(0.5))) < 0) { for (let q = 0; q < idx.length; q += 3) { const tt = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tt; } geo.setIndex(idx); K.smoothNormals(geo); }
          return { geo, ring, path, secs, NT };
        };
        const lining = std(ICE, { side: THREE.BackSide, roughness: 0.9 });
        const trimM = std(ICE, { roughness: 0.8 });
        // each sleeve = a sack along the forearm (closed, rounded end at the elbow, open cuff at the wrist)
        // plus a plain upper-arm tube from the shoulder into it (mostly hidden under the cloak)
        const armM = std(CREAM, { roughness: 0.9 });
        [['L', FORE_L, 0.9, 0.29], ['R', FORE_R, 0.58, 0.28]].forEach(([s, pts, D0, W0]) => {
          const cap = t => Math.sqrt(sst(0, 0.32, t));
          const sk = sack(pts, {
            rw: t => W0 * (0.25 + 0.75 * cap(t)),
            rt: t => 0.15 * (0.3 + 0.7 * cap(t)),
            drop: t => D0 * (0.3 + 0.7 * cap(t)) * (0.9 + 0.1 * sst(0.3, 1, t))
          });
          const tex = canvasTex(1024, 512, (g, w, h) => sleeveFabric(g, w, h, s === 'R'));
          mesh(sk.geo, texMat(tex, { roughness: 0.9 }), sleevesG, null, null, CREAM_INK);
          const ln = new THREE.Mesh(sk.geo, lining); ln.receiveShadow = true; sleevesG.add(ln);
          mesh(tube(sk.ring, 0.026, 120, 8, true), trimM, sleevesG);
          sleeveOf[s] = sk;
          // navy outer sleeve of the cloak over the upper arm, ending in a thick white fur cuff around the sack's elbow end
          const i0 = Math.round(0.2 * sk.NT), sec = sk.secs[i0].slice(0, -1);
          const ctr = sec.reduce((acc, q) => acc.add(q), V()).multiplyScalar(1 / sec.length);
          const sx = s === 'L' ? -1 : 1, t0 = 0.2;
          const rwE = W0 * (0.25 + 0.75 * cap(t0)) * 1.12, rtE = 0.15 * (0.3 + 0.7 * cap(t0)) * 1.3, drE = D0 * (0.3 + 0.7 * cap(t0)) * 0.94;
          const osk = sack([[0.4 * sx, 2.14, 0.0], [0.85 * sx, 1.98, 0.22], [ctr.x - 0.02 * sx, ctr.y + 0.06, ctr.z - 0.02]], {
            rw: t => rwE * (0.7 + 0.3 * t), rt: t => rtE * (0.9 + 0.1 * t), drop: t => drE * (0.35 + 0.65 * sst(0, 0.9, t))
          });
          mesh(osk.geo, std(NAVY, { roughness: 0.8, side: DS }), cloakG, null, null, NAVY_INK);
          const rp = osk.ring.filter((q, j) => j % 2 === 0);
          const oc = rp.reduce((acc, q) => acc.add(q), V()).multiplyScalar(1 / rp.length);
          rp.forEach(q => q.sub(oc).multiplyScalar(1.04).add(oc));
          const cuff = mesh(tube(rp, 0.08, 120, 10, true), whiteM, cloakG, null, null, WHITE_INK);
          K.addFur(cuff, { layers: 10, length: 0.05, gravity: 0.015, repeat: [20, 2] });
        });
      }

      /* ======================= shoulder medallions with tassels ======================= */
      {
        [[-0.5, 1], [0.53, -1]].forEach(([x]) => {
          const y = 2.2, hit = K.onSkin(x, y, cloakG.children.filter(o => o.isMesh));
          const mg = group(cloakG, [x, y - 0.02, hit.p.z + 0.1], [0, x * 0.45, 0]);
          medal(mg, [0, 0, 0], 0.145, medalFace, NAVY_LT, NAVY_INK, '#8EA2B6');
          mesh(sphere(0.035, 16, 12), goldM, mg, [0, -0.185, 0.0], null, GOLD_INK);
          K.tassel(mg, [0, -0.225, 0.02], '#7A8DA6', 0.17, 0.042, NAVY_INK);
        });
      }

      /* ======================= belt: gold cord, coin knots, snowflake medallion, pendant ======================= */
      {
        const bG = K.beltG, zf = y => K.robeR(y) + 0.045;
        const cord = mesh(new THREE.TorusGeometry(K.robeR(1.56) + 0.04, 0.022, 10, 128), goldM, bG, [0, 1.56, 0]); cord.rotation.x = Math.PI / 2;
        [-1, 1].forEach(sx => {
          const kg = group(bG, [0.26 * sx, 1.56, 0], [0, 0.4 * sx, 0]);
          kg.position.z = Math.sqrt(Math.max(Math.pow(K.robeR(1.56) + 0.05, 2) - 0.26 * 0.26, 0));
          mesh(new THREE.TorusGeometry(0.065, 0.024, 10, 32), goldM, kg, null, null, GOLD_INK);
          mesh(sphere(0.045, 20, 14), goldM, kg, [0, 0, 0.01], [1, 1, 0.6], GOLD_INK);
        });
        medal(bG, [0, 1.56, zf(1.56) + 0.03], 0.16, medalFace, GOLD, GOLD_INK, '#93A8BB');
        mesh(sphere(0.035, 16, 12), goldM, bG, [0, 1.36, zf(1.36) + 0.06], null, GOLD_INK);
        mesh(sphere(0.07, 28, 20), std('#DDE7EF', { roughness: 0.25 }), bG, [0, 1.24, zf(1.24) + 0.08], null, '#8C9DB0');
        mesh(sphere(0.02, 10, 8), K.M.shine, bG, [-0.025, 1.27, zf(1.24) + 0.145]).castShadow = false;
        const bt = K.tassel(bG, [0, 1.14, zf(1.14) + 0.08], GOLD_LT, 0.2, 0.045, GOLD_INK);
        K.onTick((t, k) => { bt.rotation.z = 0.07 * Math.sin(t * 1.6) * k; });
      }

      /* ======================= apron (蔽膝) ======================= */
      const apronG = part('apron', K.body);
      K.robePanel({ parent: apronG, y0: 0.52, y1: 1.42, center: 0, deg: 38, degB: 28, off: 0.05, color: CREAM, ink: CREAM_INK, texW: 256, texH: 512,
        paint(g, w, h) {
          const bw = 22;
          g.fillStyle = ICE; g.fillRect(0, 0, bw, h); g.fillRect(w - bw, 0, bw, h); g.fillRect(0, h - 34, w, 34);
          g.fillStyle = GOLD; g.fillRect(bw, 0, 5, h - 34); g.fillRect(w - bw - 5, 0, 5, h - 34); g.fillRect(bw, h - 39, w - bw * 2, 5);
          flake(g, w * 0.7, h * 0.2, 40, FLAKE, 8);
          // rolling snow waves at the lower left, berry twig at the lower right
          swirl(g, w * 0.32, h * 0.78, 44, ICE, 13, false);
          swirl(g, w * 0.58, h * 0.86, 32, ICE, 11, false);
          g.strokeStyle = ICE; g.lineWidth = 11; g.lineCap = 'round';
          g.beginPath(); g.moveTo(w * 0.12, h * 0.9); g.quadraticCurveTo(w * 0.3, h * 0.84, w * 0.45, h * 0.9); g.stroke();
          berries(g, w * 0.72, h * 0.74, 90, 0.1);
        } });

      /* ======================= boots ======================= */
      const bootsG = part('boots', K.body);
      {
        const bm = std(NAVY_LT, { roughness: 0.75 }), sm = std(SOLE, { roughness: 0.8 });
        const decal = canvasTex(256, 256, (g) => { flake(g, 128, 128, 100, '#F4F6FA', 16); });
        const dm = texMat(decal, { transparent: true, alphaTest: 0.35, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
        [-1, 1].forEach(sx => {
          const b = group(bootsG, [0.55 * sx, 0, 0.6], [0, 0.2 * sx, 0]); b.scale.setScalar(1.08);
          const foot = mesh(sphere(0.25, 40, 28), bm, b, [0, 0.16, 0.05], [1.28, 0.7, 1.45], NAVY_INK);
          mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.16, 32), bm, b, [0, 0.27, -0.05], null, NAVY_INK);
          mesh(new THREE.CylinderGeometry(0.33, 0.34, 0.05, 40), sm, b, [0, 0.025, 0.05], [1, 1, 1.12], CREAM_INK);
          const gl = mesh(new THREE.TorusGeometry(0.325, 0.012, 8, 48), goldM, b, [0, 0.055, 0.05], [1, 1.12, 1]); gl.rotation.x = Math.PI / 2;
          // white fur cuff
          const cuff = mesh(new THREE.TorusGeometry(0.25, 0.085, 12, 40), whiteM, b, [0, 0.37, -0.05], null, WHITE_INK);
          cuff.rotation.x = Math.PI / 2;
          K.addFur(cuff, { layers: 10, length: 0.045, gravity: 0.015, repeat: [12, 2] });
          // snowflake on the outer front, gold curl near the toe
          const hit = K.onSkin(0.63 * sx, 0.19, [foot]);
          const d = mesh(new THREE.PlaneGeometry(0.2, 0.2), dm, bootsG, hit.p.clone().addScaledVector(hit.n, 0.006));
          d.lookAt(hit.p.clone().add(hit.n)); d.castShadow = false;
          const c0 = K.onSkin(0.42 * sx, 0.13, [foot]);
          const cc = c0.p.clone().addScaledVector(c0.n, 0.012), cp = [];
          for (let a = 0; a <= Math.PI * 1.7; a += 0.2) { const rr = 0.05 * (1 - a / (Math.PI * 2.4)); cp.push(cc.clone().add(V(Math.cos(a) * rr * sx, Math.sin(a) * rr, 0))); }
          cp.unshift(cc.clone().add(V(-0.1 * sx, -0.02, -0.01)));
          mesh(tube(cp, 0.011, 40, 6), goldM, bootsG);
        });
      }

      /* ======================= snowflake banner in the image-left paw ======================= */
      flagG = part('flag', K.body);
      {
        const HL = V(HAND_L[0], HAND_L[1], HAND_L[2]);
        flagG.position.copy(HL);
        const PL = (y) => { const q = poleAt(y); return V(q[0], q[1], q[2]).sub(HL); };
        const W2 = (x, y, z) => V(x, y, z).sub(HL);
        const dir = V(PT[0] - PB[0], PT[1] - PB[1], PT[2] - PB[2]).normalize();
        mesh(tube([PL(PB[1]), PL(PT[1])], 0.045, 8, 16), goldM, flagG, null, null, GOLD_INK);
        mesh(sphere(0.08, 24, 18), goldM, flagG, PL(PB[1] - 0.04), null, GOLD_INK);
        [[4.2, 0.058, 0.05], [4.27, 0.066, 0.05], [4.33, 0.058, 0.04]].forEach(([y, r, h]) => orient(mesh(new THREE.CylinderGeometry(r, r, h, 24), goldM, flagG, PL(y), null, GOLD_INK), dir));
        // ruyi-flame finial with two cloud scrolls
        {
          const fg = group(flagG, PL(4.36)); fg.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
          const half = [[0, 0.36], [0.05, 0.28], [0.085, 0.19], [0.08, 0.1], [0.05, 0.04], [0.0, 0.0]];
          const shp = half.concat(half.slice(0, -1).reverse().map(([x, y]) => [-x, y]));
          const fm = mesh(extrude(shp, 0.05, 0.022, 3, 12), std(GOLD_LT, { roughness: 0.4, metalness: 0.15 }), fg, [0, 0.03, -0.025], null, GOLD_INK);
          void fm;
          [-1, 1].forEach(sx => mesh(new THREE.TorusGeometry(0.045, 0.024, 10, 24, Math.PI * 1.6), goldM, fg, [0.075 * sx, 0.07, 0], null, GOLD_INK).rotation.z = sx > 0 ? -0.6 : Math.PI + 0.6);
          mesh(sphere(0.055, 20, 14), goldM, fg, [0, 0.02, 0], null, GOLD_INK);
        }
        // navy cord wrap, white pompom, pearl bead, navy tassel
        orient(mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.1, 24), navyM, flagG, PL(4.15), null, NAVY_INK), dir);
        const pom = mesh(sphere(0.095, 28, 20), whiteM, flagG, PL(4.28).add(V(0.125, 0, 0.02)), null, WHITE_INK);   // snug against the pole
        K.addFur(pom, { layers: 8, length: 0.035, gravity: 0.01, repeat: [4, 4] });
        mesh(sphere(0.055, 20, 14), std('#DDE7EF', { roughness: 0.25 }), flagG, PL(3.97).add(V(0.02, 0, 0.05)), null, '#8C9DB0');
        const nt = K.tassel(flagG, W2(X(150), Y(100), 0.36), NAVY_LT, 0.17, 0.04, NAVY_INK);
        // banner cloth: hoist along the pole, fly edge to image-left, gently rippled
        const NU = 26, NV = 22, fp = [], fuv = [], fidx = [];
        const hoist0 = 2.12, hoist1 = 3.98;
        const fly0 = [X(10), Y(265)], fly1 = [X(53), Y(137)];
        // world point of the cloth at (u = hoist → fly, v = bottom → top)
        const clothAt = (u, v) => {
          const hq = poleAt(lerp(hoist0, hoist1, v));
          const hx = hq[0] - 0.035, hy = hq[1], hz = hq[2] - 0.02;
          const fx = lerp(fly0[0], fly1[0], v) - 0.15 * Math.sin(Math.PI * Math.pow(v, 0.7)), fy = lerp(fly0[1], fly1[1], v);
          const x = lerp(hx, fx, u), y = lerp(hy, fy, Math.pow(u, 0.9)) + 0.05 * Math.sin(Math.PI * u) * (1 - v) - 0.07 * Math.sin(Math.PI * u) * v;
          const z = lerp(hz, 0.4, u) + 0.2 * Math.sin(Math.PI * 1.7 * u + 0.3) * u + 0.06 * Math.sin(Math.PI * 2 * v) + 0.3 * sst(0.72, 1, u) * sst(0.3, 0, v);
          return V(x, y, z);
        };
        for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
          const u = i / NU, v = j / NV, q = clothAt(u, v);
          fp.push(q.x - HL.x, q.y - HL.y, q.z - HL.z); fuv.push(1 - u, v);
        }
        for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; fidx.push(a, a + 1, b, a + 1, b + 1, b); }
        const fgeo = new THREE.BufferGeometry();
        fgeo.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
        fgeo.setAttribute('uv', new THREE.Float32BufferAttribute(fuv, 2));
        fgeo.setIndex(fidx); fgeo.computeVertexNormals();
        const ftex = canvasTex(512, 512, (g, w, h) => {
          D.fill(g, M('#FBF5EB', 0.92));
          // borders: blue band + gold line along the top, gold line + wide blue band along the bottom, hoist sleeve line
          g.fillStyle = ICE_DK; g.fillRect(0, 0, w, 30); g.fillStyle = GOLD; g.fillRect(0, 30, w, 6);
          g.fillStyle = GOLD; g.fillRect(0, h - 64, w, 6); g.fillStyle = ICE_DK; g.fillRect(0, h - 58, w, 58);
          g.fillStyle = GOLD; g.fillRect(w - 26, 0, 5, h);
          // big leafy snowflake, a small one, ice crystals, wind curls
          flake(g, w * 0.5, h * 0.47, 110, '#AEBFCD', 22);
          flake(g, w * 0.5, h * 0.47, 110, '#9DB0C2', 9);
          flake(g, w * 0.28, h * 0.3, 26, FLAKE, 5);
          diamond(g, w * 0.7, h * 0.2, 26, ICE); diamond(g, w * 0.14, h * 0.55, 16, ICE); diamond(g, w * 0.72, h * 0.75, 18, ICE);
          swirl(g, w * 0.2, h * 0.72, 40, ICE, 11, true);
          g.strokeStyle = ICE; g.lineWidth = 11; g.lineCap = 'round';
          g.beginPath(); g.moveTo(w * 0.28, h * 0.84); g.bezierCurveTo(w * 0.45, h * 0.78, w * 0.6, h * 0.86, w * 0.78, h * 0.8); g.stroke();
        });
        const cloth = mesh(fgeo, texMat(ftex, { side: DS, roughness: 0.85 }), flagG, null, null, CREAM_INK);
        // streamers: navy one blowing from the cord wrap, cream + navy ribbons hanging below the banner
        const rbN = std(NAVY_LT, { side: DS, roughness: 0.8 }), rbB = std(ICE_DK, { side: DS, roughness: 0.8 }), rbC = std(CREAM, { side: DS, roughness: 0.8 });
        const tie = PL(4.15);
        const s1 = [tie.clone().add(V(-0.03, 0, 0.04)), W2(-1.55, 4.08, 0.4), W2(-1.85, 3.9, 0.42), W2(-2.05, 3.72, 0.4), W2(X(50), Y(130), 0.38)];
        // the two hanging ribbons are sewn onto the banner's lower edge: they start just inside the hem band
        // (u = where the picture puts them), sit a hair in front of the cloth and hang down from there
        const hem = (u) => { const q = clothAt(u, 0.035); return W2(q.x, q.y, q.z + 0.012); };
        const s2 = [hem(0.66), W2(-2.07, 2.02, 0.56), W2(-2.12, 1.92, 0.54), W2(-2.3, 1.7, 0.5), W2(-2.36, 1.52, 0.46), W2(X(25), Y(345), 0.46)];
        const s3 = [hem(0.455), W2(-1.66, 2.06, 0.6), W2(-1.68, 1.9, 0.58), W2(-1.75, 1.66, 0.56), W2(X(82), Y(350), 0.53)];
        const streamers = [
          mesh(ribbon(s1, t => 0.22 * (1 - 0.35 * t) * Math.min(1, (1 - t) * 8 + 0.1), { face: [0, 0, 1], twist: t => 0.35 * Math.sin(t * 4) }), rbN, flagG, null, null, NAVY_INK),
          mesh(ribbon(s2, t => 0.13 * Math.min(1, (1 - t) * 10 + 0.15), { face: [0, 0, 1], twist: t => 0.9 * sst(0.5, 1, t) }), rbC, flagG, null, null, CREAM_INK),
          mesh(ribbon(s3, t => 0.13 * Math.min(1, (1 - t) * 10 + 0.15), { face: [0, 0, 1], twist: t => 0.3 * Math.sin(t * 3) }), rbB, flagG, null, null, NAVY_INK)
        ];
        const base = Float32Array.from(fp), pa = fgeo.attributes.position;
        K.onTick((t, k) => {
          for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
            const n = j * (NU + 1) + i, u = i / NU;
            pa.setXYZ(n, base[n * 3], base[n * 3 + 1] + 0.025 * u * Math.sin(t * 2.2 - u * 5) * k, base[n * 3 + 2] + 0.07 * u * Math.sin(t * 2.2 - u * 6 + j * 0.12) * k);
          }
          pa.needsUpdate = true; if (k) fgeo.computeVertexNormals();
          streamers.forEach((m, i) => { m.rotation.z = 0.04 * Math.sin(t * 1.7 + i) * k; });
          nt.rotation.z = 0.08 * Math.sin(t * 1.5) * k;
        });
        void cloth;
      }

      /* ======================= floating decorations ======================= */
      {
        const items = [];
        const ice = std('#C9D6E4', { roughness: 0.4, emissive: new THREE.Color('#C9D6E4'), emissiveIntensity: 0.1 });
        items.push(K.snowflake(K.decor, [1.6, 3.55, 0.2], 0.42, '#BFD0E2'));
        items.push(K.snowflake(K.decor, [-1.85, 1.0, 0.5], 0.36, '#C7D6E6'));
        // ice crystal
        {
          const g = group(K.decor, [1.4, 4.05, 0.0], [0, 0.3, -0.25]);
          const geo = new THREE.OctahedronGeometry(0.15, 0); geo.scale(0.6, 1.6, 0.4);
          mesh(geo, std('#D3DFEC', { roughness: 0.3, flatShading: true }), g, null, null, '#8EA2B8');
          items.push(g);
        }
        // pale feather
        {
          const g = group(K.decor, [1.72, 2.5, 0.35], [0, 0, -0.95]);
          const shp = [[0, 0], [0.09, 0.12], [0.11, 0.3], [0.07, 0.46], [0, 0.56], [-0.07, 0.46], [-0.11, 0.3], [-0.09, 0.12]];
          const tex = canvasTex(128, 256, (cg, w, h) => {
            cg.fillStyle = '#E2E9F0'; cg.fillRect(0, 0, w, h);
            cg.strokeStyle = '#9FB0C4'; cg.lineWidth = 3;
            for (let i = 0; i < 12; i++) { const y = h * (0.1 + i * 0.07); cg.beginPath(); cg.moveTo(w / 2, y + 12); cg.lineTo(8, y); cg.moveTo(w / 2, y + 12); cg.lineTo(w - 8, y); cg.stroke(); }
          });
          tex.repeat.set(1 / 0.24, 1 / 0.56); tex.offset.set(0.5, 0);
          mesh(extrude(shp, 0.012, 0.006, 2, 8), texMat(tex, { roughness: 0.7 }), g, null, null, '#8494AA');
          mesh(tube([[0, -0.12, 0.02], [0, 0.2, 0.025], [0, 0.52, 0.02]], 0.01, 12, 6), std('#8494AA', { roughness: 0.7 }), g);
          items.push(g);
        }
        // winter berry twigs
        const twig = (pos, rot, s) => {
          const g = group(K.decor, pos, [0, 0, rot]); g.scale.setScalar(s);
          const tm = std(TWIG, { roughness: 0.85 }), bm = std(BERRY, { roughness: 0.45 });
          mesh(tube([[0, -0.3, 0], [0.02, 0, 0], [0, 0.3, 0]], 0.018, 12, 6), tm, g);
          mesh(tube([[0.01, -0.05, 0], [-0.15, 0.15, 0]], 0.013, 6, 6), tm, g);
          mesh(tube([[0.015, 0.1, 0], [0.16, 0.24, 0]], 0.013, 6, 6), tm, g);
          [[0, 0.33], [-0.17, 0.18], [0.18, 0.27]].forEach(([x, y]) => {
            mesh(sphere(0.055, 20, 14), bm, g, [x, y, 0], null, '#A4514E');
            mesh(sphere(0.014, 8, 6), K.M.shine, g, [x - 0.018, y + 0.018, 0.05]).castShadow = false;
          });
          items.push(g);
          return g;
        };
        twig([1.45, 2.88, 0.15], -0.45, 0.85);
        twig([-1.62, 1.3, 0.6], 0.55, 0.7);
        // wind curl (巽二起風)
        {
          const g = group(K.decor, [2.2, 3.3, 0.05]);
          const pts = [];
          for (let i = 0; i <= 44; i++) { const a = i / 44 * Math.PI * 2.6, r = 0.05 + 0.18 * (1 - i / 44); pts.push([Math.cos(a) * r - i * 0.004, Math.sin(a) * r, 0]); }
          mesh(tube(pts.reverse(), 0.024, 90, 8), std('#D4DFEB', { roughness: 0.6 }), g, null, null, '#9FB2C6');
          mesh(tube([[-0.55, -0.26, 0], [-0.25, -0.2, 0], [0.05, -0.24, 0], [0.3, -0.34, 0]], t => 0.026 * Math.sin(Math.PI * t) + 0.004, 40, 8), std('#D4DFEB', { roughness: 0.6 }), g, null, null, '#9FB2C6');
          items.push(g);
        }
        // snow orbs
        [[1.3, 3.72, 0.25, 0.06], [-1.5, 0.75, 0.6, 0.06], [2.2, 2.3, 0.2, 0.07], [-0.7, 3.95, 0.3, 0.055], [-2.4, 0.85, 0.3, 0.05]].forEach(([x, y, z, r]) => {
          const g = group(K.decor, [x, y, z]);
          mesh(sphere(r, 20, 14), ice, g, null, null, '#A8BACB');
          items.push(g);
        });
        items.forEach(g => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.1 * Math.sin(t * 0.7 + i) * k;
        }));
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '報雪的白鬚雪神',
        text: '大雪時節「至此而雪盛」，這隻灰白斑紋的長毛大貓化身傳說中掌管降雪的雪神滕六：留著一大把白鬍鬚、戴深藍圓頂帽、披白毛滾邊的深藍大氅，高舉雪花大旗宣告大雪到來。配色是雪白、夜霧藍、冰晶藍與暖金。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '斑點圓臉',
        text: '灰白色的蓬鬆大臉，額頭與兩頰排著一顆顆灰色的豹紋斑點，眼周到下巴是雪白的長毛。深棕色圓眼、粉色小鼻、「ω」形微笑，腮紅上點著兩顆小點；兩隻大耳朵內側粉紅、冒出白色耳毛。' },
      beard: { chip: '白鬚', tag: '貓咪本體', name: '長者白鬍鬚',
        text: '鼻子下方先翹出兩撇向外彎的八字白鬍，再垂下一大把蓬鬆的白色長鬚，一路蓋住胸前領口，尾端收成尖尖一撮、微微偏向右邊，是一看就知道的老神仙模樣。' },
      hat: { chip: '雪帽', tag: '服飾', name: '深藍圓頂帽',
        text: '深藍色的圓頂帽，帽緣與帽頂各壓一道金邊，帽身有金色弧線分成數片，頂上一顆金珠。正前方嵌著金框藍底的白雪花圓徽，下方垂著淡藍珠與金流蘇；兩側各插一枝結霜的淡藍小葉。' },
      flag: { chip: '雪旗', tag: '道具', name: '雪花大旗', dir: [-0.55, 0.3, 1],
        text: '畫面左爪握著一根金色長旗桿，桿頂是如意火焰形金飾，綁著深藍繩結、白毛球、淡藍珠與深藍流蘇。米白旗面上下鑲冰藍邊，中央一朵大雪花，旁邊散著小雪花、冰晶與風紋，旗下還飄著米白與藍色長緞帶。' },
      cloak: { chip: '大氅', tag: '服飾', name: '白毛滾邊深藍大氅',
        text: '最外層是一件長及腳面的深藍大氅，肩上圍著一圈蓬鬆白毛領，袖口與下襬也滾著厚厚的白毛。前襟兩側鑲冰藍邊與金線，肩頭與下襬繡著淡藍風紋和雪花，肩前各別一枚雪花圓扣，垂著藍色流蘇。' },
      sleeves: { chip: '寬袖', tag: '服飾', name: '米白寬袖',
        text: '深藍大氅下露出米白色的寬大內袖，袖口鑲一道冰藍寬邊和金線。畫面左袖繡著藍雪花與雲紋，右袖則是紅果枝，兩隻雪白的大肉球手從袖口伸出來。' },
      belt: { chip: '腰帶', tag: '服飾', name: '雪花腰帶',
        text: '深藍腰帶中段繞著一圈金繩，兩側各打一個圓形金結，正中是金框藍底的雪花圓牌，下面串著金珠、淡藍大圓珠，再垂一串金色流蘇。' },
      apron: { chip: '蔽膝', tag: '服飾', name: '雪花蔽膝',
        text: '腰帶下垂著一片米白蔽膝，三邊鑲冰藍寬邊與金線。右上角繡一朵藍雪花，左下是捲起的淡藍雪浪，右下一枝結著紅果的冬枝，把大雪時節的景色縫在衣服上。' },
      boots: { chip: '雪靴', tag: '服飾', name: '白毛口雪靴',
        text: '一雙深藍色圓頭短靴，靴口圍著蓬鬆白毛，米白厚底上壓一道金線；靴面外側繡著白色雪花，鞋尖旁勾一道金色捲紋。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '蓬鬆斑點大尾', dir: [1, 0.25, -0.7],
        text: '從大氅後面甩出一條又粗又蓬的大尾巴，幾乎和身體一樣高，灰白長毛上散著深灰色的環狀斑點，尾尖在右上方向外捲成一個大勾，是雪豹般保暖的招牌大尾。' }
    },
    order: ['overview', 'face', 'beard', 'hat', 'flag', 'cloak', 'sleeves', 'belt', 'apron', 'boots', 'tail']
  });

  // sleeve sack fabric (1024 × 512): u around the sack (0 top of the arm, 0.25 outer front face, 0.5 bottom of the sack),
  // v along the arm (canvas top rows = cuff). Down the front face = canvas +x, so motifs are drawn rotated −90°.
  function sleeveFabric(g, w, h, right) {
    // forearm sack: the visible front is u 0.25–0.5 (x 256–512, going down the front = +x), rows = elbow (bottom) → cuff (top).
    // ~1024 rows per unit along the arm vs ~256 px per unit down the front, hence the 4 : 1 motif scaling.
    g.fillStyle = CREAM; g.fillRect(0, 0, w, h);
    g.fillStyle = ICE; g.fillRect(0, 0, w, 52);
    g.fillStyle = GOLD; g.fillRect(0, 52, w, 9);
    const at = (x, y, fn) => { g.save(); g.translate(x, y); g.rotate(-Math.PI / 2); g.scale(2, 0.5); fn(); g.restore(); };
    if (!right) {
      at(330, 300, () => flake(g, 0, 0, 44, FLAKE, 8));
      at(430, 330, () => swirl(g, 0, 0, 46, SWIRL, 12, false));
      at(470, 190, () => swirl(g, 0, 0, 30, SWIRL, 10, true));
    } else {
      at(330, 250, () => berries(g, 0, 0, 110, 0.2));
      at(440, 320, () => swirl(g, 0, 0, 40, SWIRL, 11, false));
    }
  }
})();
