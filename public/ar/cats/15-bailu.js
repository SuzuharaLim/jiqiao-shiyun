// @file 15_白露_銀色漸層美短
// @title 白露・蒹葭露仙 | 二十四節氣貓
// 白露：銀灰虎斑的長毛美短化身「蒹葭露仙」，戴金色珍珠露冠、垂著水晶露珠，雙爪斜握一柄白玉劍，
// 米白寬袖長袍繪著金色蘆葦與水滴，淡藍披帛與鼠尾草綠飄帶繞身，周圍有露珠、蘆葦、落葉、白花與霧氣。
// 比例取自 refs/15.png（100 px = 1 單位，x = (px-217)/100，y = (535-py)/100）。
(function () {
  // renderer lights brighten front faces ~1.45× (linear): M() maps a SAMPLED colour to the material colour
  // cool > 0 also pushes the colour toward blue (the warm key light turns greys and creams yellow)
  function M(hex, f, cool) {
    f = f || 1.45; cool = cool === undefined ? 0.06 : cool; const n = parseInt(hex.slice(1), 16);
    const k = [1 - cool, 1, 1 + cool * 1.3];
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f * k[i], 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  /* ---- colours sampled from refs/15.png (tools/colors.py) ---- */
  const S = {
    fur: '#E4DBD7', furTop: '#DCD3CF', furLow: '#E8E0DC', stripe: '#A39B9B', stripe2: '#B4ACAA', white: '#FBF7EF',
    furInk: '#978B86', creamInk: '#C8B9A8', eye: '#472A1D', nose: '#F0B4A6', earIn: '#FADDD2',
    robe: '#FAF3E5', robe2: '#F9EEDA', robeInk: '#B7A58A',
    blue: '#C6CDD0', blueD: '#A9B1B4', blueInk: '#8E989B',
    sage: '#A3A899', sageLt: '#C3C39E', sageD: '#9D9E84', sageInk: '#7E8270',
    gold: '#E7BD7A', goldLt: '#F4D599', goldD: '#C99D59', goldInk: '#A57C45', mustard: '#F4D490',
    pearl: '#F4F2EE', crystal: '#BCCADA', jade: '#E3E6D3', reed: '#EFD1A0', reedD: '#E0B978', leaf: '#B2AE89',
    leafY: '#F5C972', tail: '#E3DAD5', tailMid: '#CEC6C3', tailDark: '#958D8B'
  };
  const FUR = M('#DDD4D1', 1.5, 0.08), FUR_TOP = M('#D5CCC9', 1.5, 0.08), FUR_LOW = M('#E2DAD6', 1.5, 0.08), STRIPE = M('#9A9192', 1.3, 0.08), STRIPE2 = M(S.stripe2, 1.35, 0.08);
  const WHITE = M('#FDFBF6', 1.0, 0.12), ROBE = '#C8C6C2', ROBE2 = '#C6C2BA';   // neutral grey material → renders as the picture's warm cream (#F9F2E7) under the warm key light
  const BLUE = M(S.blue, 1.35, 0.05), BLUE_D = M(S.blueD, 1.35, 0.05), SAGE = M(S.sage, 1.35, 0.04), SAGE_LT = M(S.sageLt, 1.35, 0.04), SAGE_D = M(S.sageD, 1.35, 0.04);
  const GOLD = M('#EBC685', 1.3, 0), GOLD_LT = M('#F4D9A2', 1.25, 0), GOLD_D = M(S.goldD, 1.3, 0), MUSTARD = M(S.mustard, 1.35, 0);
  const REED = M(S.reed, 1.35, 0), REED_D = M(S.reedD, 1.35, 0), LEAF = M(S.leaf, 1.35, 0.04), LEAF_Y = M(S.leafY, 1.35, 0);

  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const REED_P = M('#E4C37F', 1.25, 0);                 // golden reed ears on the fabric
  const HY = 3.6;                                  // head centre
  const PROFILE = [[0.9, 0.24], [0.94, 0.33], [0.9, 0.62], [0.82, 1.0], [0.73, 1.45], [0.65, 1.9], [0.59, 2.3], [0.52, 2.58], [0.36, 2.76], [0.12, 2.86]];
  const TAIL = [[0.3, 0.64, -0.7], [0.95, 0.62, -0.78], [1.4, 0.84, -0.62], [1.56, 1.2, -0.5], [1.56, 1.56, -0.44], [1.63, 1.78, -0.4], [1.8, 1.8, -0.36], [1.86, 1.56, -0.32]];

  // golden reed (蘆葦) motif for the fabric: slender grass blades and a curved stalk with a feathery golden ear
  function reedMotif(g, x, y, s, plume, leaf, ang) {
    g.save(); g.translate(x, y); g.rotate(ang || 0); g.lineCap = 'round'; g.lineJoin = 'round';
    const blade = (x0, y0, x1, y1, bend, w) => {       // long pointed grass leaf
      const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2, nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
      const ox = nx / L * w, oy = ny / L * w;
      g.beginPath(); g.moveTo(x0 - ox * 0.4, y0 - oy * 0.4);
      g.quadraticCurveTo(mx - ox, my - oy, x1, y1); g.quadraticCurveTo(mx + ox, my + oy, x0 + ox * 0.4, y0 + oy * 0.4); g.closePath(); g.fill();
    };
    g.fillStyle = leaf;
    blade(0, 0, -s * 0.34, -s * 0.72, -s * 0.02, s * 0.045);
    blade(s * 0.04, 0, s * 0.5, -s * 0.62, s * 0.04, s * 0.045);
    blade(s * 0.02, 0, s * 0.62, -s * 0.28, -s * 0.06, s * 0.035);
    // stalk
    const stalk = t => [s * 0.42 * t * t, -s * 0.95 * t];
    g.strokeStyle = plume; g.lineWidth = Math.max(1.5, s * 0.025);
    g.beginPath(); for (let i = 0; i <= 20; i++) { const [px, py] = stalk(i / 20); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
    // ear: a row of slanted grains on both sides of the upper stalk, pointing toward the tip
    g.fillStyle = plume;
    for (let i = 0; i < 11; i++) {
      const t = 0.5 + i * 0.047, [px, py] = stalk(t), [qx, qy] = stalk(t + 0.02), tx = qx - px, ty = qy - py, tl = Math.hypot(tx, ty) || 1;
      const L = s * 0.1 * (1 - 0.45 * i / 10);
      [-1, 1].forEach(k => {
        const dx = tx / tl * 0.8 + k * (-ty / tl) * 0.6, dy = ty / tl * 0.8 + k * (tx / tl) * 0.6;
        g.save(); g.translate(px, py); g.rotate(Math.atan2(dy, dx));
        g.beginPath(); g.ellipse(L * 0.5, 0, L * 0.55, L * 0.2, 0, 0, Math.PI * 2); g.fill(); g.restore();
      });
    }
    g.restore();
  }
  function dropMotif(g, x, y, s, fill, rim) {
    g.save(); g.translate(x, y);
    g.beginPath(); g.moveTo(0, -s); g.bezierCurveTo(s * 0.2, -s * 0.5, s * 0.5, -s * 0.1, s * 0.5, s * 0.25);
    g.arc(0, s * 0.25, s * 0.5, 0, Math.PI); g.bezierCurveTo(-s * 0.5, -s * 0.1, -s * 0.2, -s * 0.5, 0, -s); g.closePath();
    g.fillStyle = fill; g.fill(); g.strokeStyle = rim; g.lineWidth = Math.max(1.5, s * 0.1); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(-s * 0.18, s * 0.18, s * 0.09, s * 0.16, 0.3, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function flowerMotif(g, x, y, s) {
    g.save(); g.translate(x, y); g.fillStyle = '#FFFDF8'; g.strokeStyle = '#D9CBB2'; g.lineWidth = Math.max(1, s * 0.06);
    for (let i = 0; i < 5; i++) { g.save(); g.rotate(i / 5 * Math.PI * 2); g.beginPath(); g.ellipse(0, -s * 0.5, s * 0.3, s * 0.4, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore(); }
    g.fillStyle = '#F2C35E'; g.beginPath(); g.arc(0, 0, s * 0.2, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  // silver tabby head: warm light grey, 5 forehead stripes, temple arcs, cheek bars, big white lower face
  function paintHead(g, P) {
    const W = 1024, H = 512;
    const lg = g.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, FUR_TOP); lg.addColorStop(0.5, FUR); lg.addColorStop(1, FUR_LOW);
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    const Sk = (pts, w, a, c) => P.stroke(g, pts.map(q => P.xy(q[0], q[1])), w, c || STRIPE, a);
    const both = (pts, w, a, c) => { Sk(pts, w, a, c); Sk(pts.map(([x, y]) => [-x, y]), w, a, c); };
    // white lower face with the grey wedge coming down between the eyes
    g.save(); g.filter = 'blur(5px)'; g.fillStyle = WHITE;
    const half = [[0, 3], [6, 8], [11, 13], [18, 15], [25, 11], [31, 3], [36, -5], [44, -15], [58, -24], [78, -32], [100, -42], [135, -54], [180, -62]];
    const L = half.map(q => P.xy(-q[0], q[1])), R = half.map(q => P.xy(q[0], q[1]));
    g.beginPath(); g.moveTo(L[0][0], L[0][1]);
    L.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(0, 512); g.lineTo(1024, 512);
    R.slice().reverse().forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); g.restore();
    g.filter = 'blur(1.8px)';
    // forehead: three long stripes and two short outer ones
    Sk([[0, 88], [0, 50], [0, 12]], 17, 1);
    both([[-12, 86], [-14, 52], [-11, 18]], 14, 0.95);
    both([[-25, 78], [-28, 52], [-25, 24]], 11, 0.85);
    both([[-36, 62], [-40, 48], [-38, 36]], 8, 0.6, STRIPE2);
    // temple arcs sweeping down toward the outer eye corner
    both([[-30, 22], [-46, 17], [-64, 8]], 13, 0.95);
    both([[-42, 36], [-58, 31], [-74, 22]], 9, 0.6, STRIPE2);
    // cheek bars (two per side, descending outward)
    both([[-44, 3], [-62, -1], [-84, -8]], 13, 0.95);
    both([[-52, -12], [-68, -17], [-88, -24]], 11, 0.85);
    // back of the head: soft tabby bands
    for (const lon of [-160, -135, -110, 110, 135, 160]) Sk([[lon, 82], [lon + (lon < 0 ? -6 : 6), 40], [lon, -8]], 18, 0.6);
    Sk([[180, 84], [180, 30], [180, -12]], 18, 0.6); Sk([[-180, 84], [-180, 30], [-180, -12]], 18, 0.6);
    for (const lon of [-80, -65, 65, 80]) Sk([[lon, 70], [lon + (lon < 0 ? -5 : 5), 52], [lon, 38]], 10, 0.55);
    g.filter = 'none';
  }

  // wide sleeve fabric: u around the arm (0.75 = bottom of the hanging drape), v shoulder (bottom) → cuff (top)
  function paintSleeve(g, w, h, D) {
    D.fill(g, ROBE);
    const lg = g.createLinearGradient(0, h, 0, 0);
    lg.addColorStop(0, 'rgba(236,226,206,0.35)'); lg.addColorStop(1, 'rgba(236,226,206,0)');
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    // reeds and drops on the drape (u 0.55..0.95) and the top (u 0.05..0.45)
    [[0.58, 330, 190, -0.1], [0.72, 400, 170, 0.1], [0.88, 340, 190, 0.15], [0.98, 420, 150, 0], [0.2, 330, 140, 0.1]].forEach(([u, y, s, a]) => reedMotif(g, u * w, y, s, REED_P, M('#A9B08C', 1.3, 0.02), a));
    [[0.7, 190], [0.9, 250], [0.55, 260], [0.35, 220]].forEach(([u, y]) => dropMotif(g, u * w, y, 16, '#DCE6EF', '#9FB3C8'));
    // cuff: cream rim + wide blue-grey band + thin gold line
    g.fillStyle = BLUE; g.fillRect(0, 0, w, 62);
    g.fillStyle = BLUE_D; g.fillRect(0, 62, w, 4);
    g.fillStyle = M('#F7F2E6', 1.3, 0.06); g.fillRect(0, 66, w, 6);
  }

  NEKO.run({
    meta: {
      id: '15', term: '白露', title: '白露・蒹葭露仙', seal: '露',
      eyebrow: '二〇二七節氣貓 · 15 白露 · 銀色漸層美短',
      aria: '頭戴金色珍珠露冠、垂著水晶露珠與金色蘆葦，雙爪斜握白玉劍，身穿米白蘆葦紋寬袖長袍、繞著淡藍披帛與鼠尾草綠飄帶的銀灰虎斑長毛美短貓 3D 模型'
    },
    theme: { accent: '#5E7480', accentDark: '#BCCBD4', glow: 'rgba(198,205,208,0.34)', glowColor: '#DCE4EA' },
    palette: [['#E6DEDA', '銀灰毛色'], ['#F9F2E7', '月白米'], ['#BBC0BE', '霧藍灰'], ['#ECCB95', '蘆葦金']],
    spec: [['品種', '銀色漸層美短（長毛）'], ['角色', '白露・蒹葭露仙'], ['頭身比', '約 1 : 1.75']],
    seed: 1515,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR, low: FUR_LOW, deep: STRIPE, cream: WHITE, ink: S.furInk, creamInk: S.creamInk,
        noise: { colors: [M('#F3EEEA', 1.2), M('#B9B0AD', 1.25)], alpha: 0.08, n: 1300 },
        paintBase: paintHead
      },
      head: { y: HY, neck: 2.86, w: 1.05, h: 0.8, d: 0.86, cheek: 0.1, ruff: 0.06, ruffFreq: 17, chinDrop: 0.03,
        // broad "mochi" head: wider and flatter toward the crown, like the picture
        deform: (p, o) => { if (o.y > 0) { p.x *= 1 + 0.04 * Math.pow(o.y, 0.8) * (1 - o.y * 0.5); p.y *= 1 - 0.06 * o.y * o.y; } else { p.x *= 1 + 0.05 * Math.sin(Math.PI * Math.min(1, -o.y / 0.75)) + 0.08 * sst(0.55, 1, -o.y); p.y *= 1 - 0.05 * sst(0.6, 1, -o.y); } },
        fur: { layers: 16, length: 0.075, gravity: 0.03, repeat: [9, 5] } },
      eyes: { x: 0.35, y: -0.12, r: 0.094, sx: 0.95, sy: 1.08, sz: 0.42, color: '#3A2219', shine: 0.55 },
      nose: { y: -0.205, color: M(S.nose, 1.25, 0), size: 0.95 },
      muzzle: false,
      mouth: { type: 'none' },
      blush: { color: 'rgba(246,166,158,0.62)', x: 0.5, y: -0.28, r: 26 },
      whiskers: { color: '#A99E9A', n: 2, len: 0.42, r: 0.0045, y: -0.31, x: 0.6, spread: 0.12, droop: 0.04, curve: 0.04 },
      ears: { x: 0.8, y: 0.4, z: -0.05, tilt: 0.4, yaw: 0.2, pitch: -0.08, size: [0.38, 0.58, 0.17], sharp: 0.9,
        color: FUR, inner: M('#F7C9C3', 1.25, 0.02), tuft: WHITE, tuftScale: 1.5 },
      bib: { color: WHITE, balls: [[0, 2.9, 0.22, 0.26], [0.28, 2.88, 0.16, 0.2], [-0.28, 2.88, 0.16, 0.2]],
        fur: { layers: 10, length: 0.05, gravity: 0.03, repeat: [3, 2] } },
      robe: { profile: PROFILE, color: '#FFFFFF', ink: S.robeInk, lining: M('#EDE6D6', 1.2), hemY: 0.5,
        paint: (g, w, h) => { g.fillStyle = ROBE; g.fillRect(0, 0, w, h); } },
      collar: false,
      arms: {
        L: { hand: [0.27, 2.16, 1.06], path: [[-0.55, 2.62, 0.05], [-0.58, 2.42, 0.5], [-0.3, 2.22, 0.88], [0.08, 2.15, 1.0]], pawScale: 1.7 },
        R: { hand: [0.55, 2.02, 0.97], path: [[0.55, 2.62, 0.05], [0.86, 2.28, 0.4], [0.76, 2.02, 0.78]], pawScale: 1.15 }
      },
      sleeves: false,
      paws: { color: WHITE, ink: S.creamInk },
      belt: false,
      feet: false,
      tail: {
        pts: TAIL, r: 0.28, ink: S.furInk,
        shape: t => t < 0.12 ? 0.55 + 0.25 * t / 0.12 : (t < 0.8 ? 0.8 + 0.35 * sst(0.2, 0.6, t) : 0.3 + 0.85 * Math.cos(Math.PI / 2 * (t - 0.8) / 0.2)),
        paint: (g, w, h) => {
          g.fillStyle = M('#D6CECB', 1.3, 0.1); g.fillRect(0, 0, w, h);
          // smoky darker patches (strongest on the inner side of the curl), pale tip
          g.filter = 'blur(16px)';
          [[0.14, 0.07, 0.7], [0.36, 0.09, 0.85], [0.56, 0.09, 0.8], [0.76, 0.07, 0.7]].forEach(([c, bw, a]) => {
            g.fillStyle = NEKO.rgba(M(S.tailDark, 1.35, 0.08), a); g.fillRect((c - bw / 2) * w, h * 0.1, bw * w, h * 0.8);
          });
          g.fillStyle = NEKO.rgba(M(S.tailMid, 1.4, 0.08), 0.8); g.fillRect(0.3 * w, h * 0.55, 0.45 * w, h * 0.4);
          g.filter = 'none';
          g.fillStyle = NEKO.rgba(M('#EFE9E5', 1.3, 0.08), 0.7); g.fillRect(w * 0.92, 0, w * 0.08, h);
        },
        fur: { layers: 14, length: 0.085, gravity: 0.02, repeat: [14, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, tube, lathe, extrude, D, onRobe, robeR, robeUV } = K;
      const DS = THREE.DoubleSide;
      const lerp = (a, b, t) => a + (b - a) * t;
      const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
      const Vn = a => (a.isVector3 ? a.clone() : V(a[0], a[1], a[2]));
      const mGold = std(GOLD, { roughness: 0.45, metalness: 0.15 });
      const mGoldLt = std(GOLD_LT, { roughness: 0.45, metalness: 0.1 });
      const mBlue = std(BLUE, { roughness: 0.8, side: DS });
      const mCrystal = std(M(S.crystal, 1.2), { roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.9 });
      const mPearl = std(M(S.pearl, 1.1), { roughness: 0.25, metalness: 0.05 });
      const mWhite = std(WHITE, { roughness: 0.95 });

      // flat ribbon whose face follows fn(p, t) (e.g. the outward direction from the body axis)
      function ribbonN(pts, width, faceFn, segs) {
        const cv = new THREE.CatmullRomCurve3(pts.map(Vn)), n = segs || 120, pos = [], uv = [], idx = [];
        for (let i = 0; i <= n; i++) {
          const t = i / n, P = cv.getPointAt(t), T = cv.getTangentAt(t), f = faceFn(P, t).normalize();
          let side = T.clone().cross(f); if (side.lengthSq() < 1e-6) side = T.clone().cross(V(0, 1, 0)); side.normalize();
          const w = (typeof width === 'function' ? width(t) : width) / 2;
          const a = P.clone().addScaledVector(side, -w), b = P.clone().addScaledVector(side, w);
          pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(0, t, 1, t);
          if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); geo.computeVertexNormals(); return geo;
      }
      // soft fabric band (披帛, streamers): thin lens cross-section with rounded edges (so the ink outline wraps it),
      // edges cupping alternately along the length (gentle folds), optional twist; material groups [front face, back face]
      function sash(pts, width, o) {
        o = o || {};
        const cv = new THREE.CatmullRomCurve3(pts.map(Vn), false, 'centripetal'), n = o.segs || 160, M = 16, th = o.th || 0.026;
        const pos = [], uv = [], i0 = [], i1 = [];
        for (let i = 0; i <= n; i++) {
          const t = i / n, P = cv.getPointAt(t), T = cv.getTangentAt(t);
          const f = (o.face ? o.face(P, t) : V(0, 0.15, 1)).clone();
          f.addScaledVector(T, -T.dot(f)); if (f.lengthSq() < 1e-6) f.copy(V(0, 1, 0).cross(T)); f.normalize();
          const side = T.clone().cross(f).normalize(), tw = o.twist ? o.twist(t) : 0;
          if (tw) { side.applyAxisAngle(T, tw); f.applyAxisAngle(T, tw); }
          const w = (typeof width === 'function' ? width(t) : width) / 2;
          const h = th / 2 * Math.max(0.06, Math.min(1, t / 0.02, (1 - t) / 0.02));
          const cup = (o.cup === undefined ? 0.16 : o.cup) * w * Math.sin(t * Math.PI * 2 * (o.folds || 2.5) + (o.phase || 0));
          for (let j = 0; j <= M; j++) {
            const a = j / M * Math.PI * 2, s = Math.cos(a), c = Math.sin(a);
            const Q = P.clone().addScaledVector(side, w * s).addScaledVector(f, h * c + cup * (s * s - 0.4));
            pos.push(Q.x, Q.y, Q.z); uv.push(j / M, t);
          }
        }
        for (let i = 0; i < n; i++) for (let j = 0; j < M; j++) {
          const a = i * (M + 1) + j, b = a + M + 1;
          (Math.sin((j + 0.5) / M * Math.PI * 2) > 0 ? i0 : i1).push(a, b, a + 1, b, b + 1, a + 1);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(i0.concat(i1)); geo.addGroup(0, i0.length, 0); geo.addGroup(i0.length, i1.length, 1);
        return K.smoothNormals(geo);
      }

      /* ---------------- flat picture-book lift: the head and chest fur glow a little with their own colour ---------------- */
      [K.headMesh].concat(K.bib || []).forEach(m => { const mt = m.material; mt.emissive = new THREE.Color(1, 1, 1); mt.emissiveMap = mt.map || null; mt.emissiveIntensity = 0.14; mt.needsUpdate = true; });

      /* ---------------- face: ω smile, blush freckles ---------------- */
      {
        const mm = std('#6A4436', { roughness: 0.6 }), faceParts = K.muzzle.concat(K.headMesh);
        const onF = (x, y) => K.onSkin(x, y, faceParts).p.add(V(0, 0, 0.008));
        const my = HY - 0.25;
        [-1, 1].forEach(sx => mesh(tube([[0.13 * sx, my + 0.02], [0.1 * sx, my - 0.03], [0.05 * sx, my - 0.04], [0.006 * sx, my - 0.005]].map(([x, y]) => onF(x, y)), 0.0105, 24, 8), mm, K.faceG));
        mesh(tube([onF(0, HY - 0.22), onF(0, my - 0.003)], 0.0105, 6, 8), mm, K.faceG);
        const g = K.headTex.image.getContext('2d');
        [-1, 1].forEach(sx => [-0.032, 0.032].forEach(dx => {
          const s = K.onSkin(sx * 0.5 + dx, HY - 0.27, [K.headMesh]);
          if (!s.uv) return;
          g.fillStyle = 'rgba(236,128,120,0.85)'; g.beginPath(); g.ellipse(s.uv.x * 1024, (1 - s.uv.y) * 512, 3.4, 2.2, 0, 0, Math.PI * 2); g.fill();
        }));
        K.headTex.needsUpdate = true;
      }

      /* ---------------- fluffy cheek tufts (jagged silhouette of the long-haired face) ---------------- */
      {
        const edgeX = (y) => { let lo = 0, hi = 1.6; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; } return lo; };
        const mF = std(FUR, { roughness: 0.95 }), mW = std(WHITE, { roughness: 0.95 });
        const lock = (root, dir, len, r0, mat, ink) => {
          const d = V(dir[0], dir[1], dir[2]).normalize(), a = V(root[0], root[1], root[2]);
          const b = a.clone().addScaledVector(d, len * 0.55).add(V(0, -0.12 * len, 0)), c = a.clone().addScaledVector(d, len);
          return mesh(tube([a, b, c], t => r0 * (1 - Math.pow(t, 1.2)) + 0.003, 16, 8), mat, K.faceG, null, null, ink);
        };
        [-1, 1].forEach(sx => {
          [[HY + 0.3, -10, 0.07, 0.05, 0], [HY + 0.14, 4, 0.1, 0.06, 0.06], [HY - 0.02, 16, 0.11, 0.07, -0.06], [HY - 0.18, 24, 0.14, 0.075, 0.08],
            [HY - 0.34, 40, 0.13, 0.07, -0.04], [HY - 0.5, 54, 0.12, 0.065, 0.05], [HY - 0.62, 66, 0.1, 0.06, 0.1]].forEach(([y, ang, len, r0, zz]) => {
            const ex = edgeX(y), a = ang * Math.PI / 180, white = y < HY - 0.42;
            lock([sx * (ex - 0.06), y, zz], [sx * Math.cos(a), -Math.sin(a), zz * 0.6], len, r0, white ? mW : mF, white ? S.creamInk : S.furInk);
          });
        });
      }

      /* ---------------- robe fabric: inner skirt panel with reeds, blue-grey hem band ---------------- */
      const rt = K.robeMesh.material.map, rg = rt.image.getContext('2d');
      {
        const vHem = K.robeV(0.38);
        rg.fillStyle = BLUE; rg.fillRect(0, vHem, 1024, 1024 - vHem);
        rg.fillStyle = BLUE_D; rg.fillRect(0, vHem - 5, 1024, 5);
        rg.fillStyle = M('#E9EEF0', 1.2); rg.fillRect(0, 1016, 1024, 8);
        // side edges of the front panel (blue-grey on the image-left, sage on the image-right)
        const vband = (d0, d1, yTop, color) => { const [x0] = robeUV(d0, 1), [x1] = robeUV(d1, 1); rg.fillStyle = color; rg.fillRect(x0, K.robeV(yTop), x1 - x0, vHem - K.robeV(yTop)); };
        // motifs drawn in world units (the robe map is stretched differently along u and v)
        const motif = (deg, y, size, fn) => {
          const [x, v] = robeUV(deg, y), vpx = (K.robeV(y - 0.05) - K.robeV(y + 0.05)) / 0.1, hpx = 1024 / (2 * Math.PI * robeR(y));
          rg.save(); rg.translate(x, v); rg.scale(hpx / vpx, 1); fn(rg, size * vpx); rg.restore();
        };
        const RP = REED_P, RL = M('#A5AC86', 1.3, 0.02);
        [[-14, 0.42, 0.64, 0.05], [10, 0.44, 0.72, 0.12], [2, 1.0, 0.5, -0.1], [150, 0.5, 0.7, 0.1], [-150, 0.5, 0.7, -0.1], [180, 0.9, 0.6, 0], [90, 0.5, 0.6, 0.1], [-90, 0.5, 0.6, -0.1]]
          .forEach(([d, y, sz, a]) => motif(d, y, sz, (g, S) => reedMotif(g, 0, 0, S, RP, RL, a)));
        [[-16, 1.3], [18, 0.9], [-4, 0.78], [120, 1.2], [-120, 1.1]].forEach(([d, y]) => motif(d, y, 0.06, (g, S) => dropMotif(g, 0, 0, S, '#DCE6EF', '#9FB3C8')));
        motif(-20, 0.55, 0.07, (g, S) => flowerMotif(g, 0, 0, S));
        rt.needsUpdate = true;
      }

      /* ---------------- open-front outer robe with blue-grey edges and a flared skirt ---------------- */
      const coatProf = new THREE.SplineCurve([[1.18, 0.31], [1.19, 0.42], [1.08, 0.8], [0.93, 1.2], [0.8, 1.6], [0.71, 2.0], [0.66, 2.3], [0.6, 2.56], [0.48, 2.72], [0.36, 2.8]]
        .map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(80);
      const coatR = (y) => { for (let i = 0; i < coatProf.length - 1; i++) { const a = coatProf[i], b = coatProf[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < 0.5 ? 1.18 : 0.36; };
      const gapW = (y) => y > 2.3 ? lerp(0.18, 0.3, sst(2.3, 2.8, y)) : lerp(0.53, 0.18, sst(0.38, 2.2, y));
      // the opening is off-centre toward the image-right (picture: left edge ≈ -10°, right edge ≈ +43° at the hem)
      const dlt = (y) => lerp(16.5, 10, sst(0.4, 2.6, y)) * Math.PI / 180;
      const phiH = (y) => Math.asin(Math.min(gapW(y) / coatR(y), 0.97));
      const coatG = part('robe', K.body);      // outer coat shares the robe chip
      let coatMesh = null;
      {
        const Y0 = 0.31, Y1 = 2.8, nu = 128, nv = 56, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv, y = lerp(Y0, Y1, t), r = coatR(y), ph = phiH(y), dl = dlt(y);
          const zs = 1 - 0.12 * sst(1.2, 0.5, y);
          for (let i = 0; i <= nu; i++) {
            const phi = dl + ph + (Math.PI * 2 - 2 * ph) * i / nu;
            const wav = 1 + 0.035 * Math.sin(phi * 7) * sst(1.3, 0.4, y);   // soft folds in the skirt
            pos.push(Math.sin(phi) * r * wav, y, Math.cos(phi) * r * zs * wav); uv.push(i / nu, t);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const tex = canvasTex(2048, 1024, (g, w, h) => {
          D.fill(g, ROBE);
          const rowY = (y) => (1 - (y - Y0) / (Y1 - Y0)) * h;
          // reeds + drops scattered over the coat (front flaps and back)
          [[0.07, 0.62, 230, 0.12], [0.93, 0.62, 230, -0.05], [0.2, 0.58, 240, 0.08], [0.8, 0.6, 240, 0.1], [0.36, 0.6, 250, -0.1], [0.5, 0.62, 260, 0.05], [0.64, 0.6, 250, 0.12],
            [0.12, 1.5, 200, 0.1], [0.88, 1.45, 200, -0.08], [0.5, 1.6, 200, 0]].forEach(([u, y, s, a]) => reedMotif(g, u * w, rowY(y), s, REED_P, M('#A9B08C', 1.3, 0.02), a));
          [[0.1, 1.05], [0.9, 1.1], [0.16, 1.8], [0.85, 1.9], [0.3, 1.2], [0.7, 1.25], [0.45, 1.4]].forEach(([u, y]) => dropMotif(g, u * w, rowY(y), 20, '#DCE6EF', '#9FB3C8'));
          [[0.05, 0.62], [0.96, 0.66]].forEach(([u, y]) => flowerMotif(g, u * w, rowY(y), 20));
          // hem band
          g.fillStyle = BLUE; g.fillRect(0, rowY(0.43), w, h - rowY(0.43));
          g.fillStyle = BLUE_D; g.fillRect(0, rowY(0.43) - 4, w, 4);
          // front edges: blue-grey band, sage band on the image-right lapel
          const edge = (width, color, inset, sides) => {
            g.fillStyle = color;
            for (const side of sides || [0, 1]) {
              g.beginPath();
              for (let k = 0; k <= 40; k++) { const y = lerp(Y0, Y1, k / 40), circ = coatR(y) * (Math.PI * 2 - 2 * phiH(y)), px = (inset + width) / circ * w, p0 = inset / circ * w; const x = side ? w - px : px; k ? g.lineTo(x, rowY(y)) : g.moveTo(x, rowY(y)); }
              for (let k = 40; k >= 0; k--) { const y = lerp(Y0, Y1, k / 40), circ = coatR(y) * (Math.PI * 2 - 2 * phiH(y)), p0 = inset / circ * w; g.lineTo(side ? w - p0 : p0, rowY(y)); }
              g.closePath(); g.fill();
            }
          };
          // u = 0 is the image-right edge (sage lapel band + thin blue), u = 1 the image-left edge (blue-grey)
          edge(0.11, BLUE, 0, [1]); edge(0.012, BLUE_D, 0.11, [1]);
          edge(0.035, BLUE, 0, [0]); edge(0.085, SAGE_LT, 0.035, [0]); edge(0.012, SAGE_D, 0.12, [0]);
        });
        coatMesh = mesh(geo, texMat(tex, { side: DS, roughness: 0.9 }), coatG, null, null, S.robeInk);
      }

      /* ---------------- cross collar (交領): white inner collar + blue-grey outer lapels ---------------- */
      {
        const neck = []; for (let i = 0; i <= 24; i++) { const d = -48 + 96 * i / 24; neck.push(onRobe(d, 2.6 - 0.1 * Math.cos(d / 48 * Math.PI / 2), 0.07)); }
        mesh(tube(neck, 0.009, 60, 6), mGold, K.robeG);
        const cm = std(M('#FCFAF4', 1.15), { roughness: 0.85 }), bm = std(BLUE, { roughness: 0.8 });
        const on = (d, y, o) => onRobe(d, y, o);
        mesh(tube([on(62, 2.66, 0.03), on(34, 2.56, 0.04), on(10, 2.38, 0.05), on(-8, 2.22, 0.05)], 0.04, 40, 10), cm, K.robeG, null, null, S.creamInk);
        mesh(tube([on(-62, 2.66, 0.04), on(-34, 2.56, 0.05), on(-8, 2.36, 0.06), on(16, 2.16, 0.06), on(26, 2.02, 0.06)], 0.042, 40, 10), cm, K.robeG, null, null, S.creamInk);
        // outer coat lapels
        const lap = (sx) => [0, 1, 2, 3, 4, 5].map(i => { const y = lerp(2.78, 2.0, i / 5), r = coatR(y) + 0.03, a = dlt(y) + sx * (phiH(y) + 0.05 / r); return V(Math.sin(a) * r, y, Math.cos(a) * r); });
        mesh(tube(lap(-1), 0.05, 40, 10), bm, K.robeG, null, null, S.blueInk);
        mesh(tube(lap(1), 0.05, 40, 10), std(SAGE_LT, { roughness: 0.8 }), K.robeG, null, null, S.sageInk);
      }

      /* ---------------- Hanfu wide sleeves: lower half of every ring pulled down by gravity ---------------- */
      const sleeveTex = canvasTex(1024, 512, (g, w, h) => paintSleeve(g, w, h, D));
      const DOWN = V(0, -1, 0);
      const sleevesG = part('sleeves', K.body);
      const buildSleeve = (hand, o) => {
        const path = hand.path, segT = 72, segA = 56, pos = [], uvs = [], idx = [], ring = [];
        const fb0 = V(o.fallback[0], o.fallback[1], o.fallback[2]), OUT = V(o.sx, 0, 0);
        for (let i = 0; i <= segT; i++) {
          const t = i / segT, C = path.getPointAt(t), T = path.getTangentAt(t);
          const g0 = DOWN.clone().addScaledVector(T, -T.dot(DOWN)), fb = fb0.clone().addScaledVector(T, -T.dot(fb0)).normalize();
          const wgt = Math.min(1, g0.length() / 0.6);
          const gdir = g0.normalize().multiplyScalar(wgt).addScaledVector(fb, 1 - wgt).normalize();
          const u = gdir.clone().negate(), side = T.clone().cross(u).normalize();
          const r = o.r ? o.r(t) : o.r0 + (o.r1 - o.r0) * sst(0, 0.5, t);
          // o.bottom(t): the lowest point of ring t is pulled onto this curve (soft bag hanging beside the body)
          const Dv = o.bottom ? o.bottom(t).sub(C.clone().addScaledVector(u, -r * 0.6)) : null;
          const drop = Dv ? 0 : o.drop(t);
          for (let j = 0; j <= segA; j++) {
            const a = j / segA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            const P = C.clone().addScaledVector(side, r * ca * (sa < 0 ? 1 + o.flare * (-sa) * Math.min(1, t * 2) : 1)).addScaledVector(u, r * sa * (sa < 0 ? 0.6 : o.top));
            if (sa < 0 && Dv) {
              // drop first, flare out lower down (bell-shaped outer edge near the shoulder, straight cuff edge near the paw)
              const kv = Math.pow(-sa, o.pk || 1.3), kh = Math.pow(-sa, lerp(o.ph || 2.4, o.pk || 1.3, sst(0.35, 0.85, t)));
              P.x += Dv.x * kh; P.z += Dv.z * kh; P.y += Dv.y * kv;
              P.addScaledVector(side, ca * o.belly * Math.sin(Math.PI * Math.min(1, kv * 1.15)) * sst(0.25, 0.7, t));   // fullness halfway down
            } else if (sa < 0) { const k = Math.pow(-sa, 0.85); P.addScaledVector(DOWN, drop * k); P.addScaledVector(OUT, o.swing * drop * k * k); }
            pos.push(P.x, P.y, P.z); uvs.push(j / segA, t);
            if (i === segT && j < segA) ring.push(P.clone());
          }
        }
        for (let i = 0; i < segT; i++) for (let j = 0; j < segA; j++) { const a = i * (segA + 1) + j, b = a + segA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const k = Math.floor(segT / 2) * (segA + 1) + Math.floor(segA / 4);
        const pv = V(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]), nv = V().fromBufferAttribute(geo.attributes.normal, k);
        if (nv.dot(pv.sub(path.getPointAt(0.5))) < 0) { for (let q = 0; q < idx.length; q += 3) { const tt = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tt; } geo.setIndex(idx); K.smoothNormals(geo); }
        const m = mesh(geo, texMat(sleeveTex, { roughness: 0.88 }), sleevesG, null, null, S.robeInk);
        const ln = new THREE.Mesh(geo, std(M('#EFE8D8', 1.3, 0.08), { roughness: 0.9, side: THREE.BackSide })); ln.receiveShadow = true; sleevesG.add(ln);
        mesh(tube(ring, 0.018, 160, 8, true), std(BLUE_D, { roughness: 0.75 }), sleevesG);
        return m;
      };
      // image-left sleeve: a big soft bag hanging DOWN beside the body — its lowest points follow a rounded curve at hip
      // height (picture: outer edge -0.7 at y 2.3 → -1.12 at y 1.2, bottom y ≈ 1.0), the cuff edge runs from the paw down to it
      const botL = new THREE.CatmullRomCurve3([V(-1.03, 1.2, 0.1), V(-1.04, 1.0, 0.4), V(-0.86, 1.02, 0.68)], false, 'centripetal');
      const slL = buildSleeve(K.hands.L, { sx: -1, r: t => 0.17 + 0.09 * sst(0, 0.5, t), top: 0.6, flare: 0.3, belly: 0.06, pk: 1.35, ph: 3.2, fallback: [-1, 0, 0.2],
        bottom: t => botL.getPointAt(t) });
      const slR = buildSleeve(K.hands.R, { sx: 1, r0: 0.2, r1: 0.32, top: 0.6, flare: 0.6, swing: 0.55, fallback: [1, 0, 0.2],
        drop: t => 1.0 * sst(0.0, 0.45, t) * (0.85 + 0.15 * (1 - sst(0.65, 1.0, t))) });
      // hide the engine's wrist balls: the paws come straight out of the cuffs
      K.poseG.children.filter(o => o.isMesh && o.geometry.parameters && [1.7, 1.15].some(ps => Math.abs(o.geometry.parameters.radius - 0.09 * ps) < 1e-6)).forEach(o => { o.visible = false; });

      // toe creases on the front paws (the image-left paw wraps the grip, the image-right paw props it from below)
      {
        const cm = std('#C9B7A8', { roughness: 0.8 });
        [['L', 0.2, 0.04], ['R', 0.14, 0.03]].forEach(([k, R, dx0]) => {
          const p = K.hands[k].p;
          [-dx0, dx0].forEach(dx => mesh(tube([[p.x + dx * 1.2, p.y - R * 0.05, p.z + R * 0.9], [p.x + dx * 1.3, p.y - R * 0.4, p.z + R * 0.82], [p.x + dx * 1.4, p.y - R * 0.68, p.z + R * 0.6]], 0.007, 8, 5), cm, K.poseG));
        });
      }

      /* ---------------- belt over the outer robe: sage sash, gold flower clasp, bars, jade pendant, gold tassel ---------------- */
      {
        const bg = K.beltG, yT = 1.96, yB = 1.74, yK = (yT + yB) / 2;
        const onCoat = (deg, y, off) => { const a = deg * Math.PI / 180, r = coatR(y) + off; return V(Math.sin(a) * r, y, Math.cos(a) * r); };
        mesh(new THREE.CylinderGeometry(coatR(yT) + 0.025, coatR(yB) + 0.025, yT - yB, 96, 1, true), std(M('#98A2A1', 1.3, 0.04), { roughness: 0.8, side: DS }), bg, [0, yK, 0], null, '#6F7978');
        [yT, yB].forEach(y => { const r = mesh(new THREE.TorusGeometry(coatR(y) + 0.028, 0.011, 8, 128), std(M('#7F8A8A', 1.3, 0.04), { roughness: 0.7 }), bg, [0, y, 0]); r.rotation.x = Math.PI / 2; });
        const deg = 28, c = onCoat(deg, yK - 0.03, 0.06);
        const fl = group(bg, c, [0, deg * Math.PI / 180, 0]);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; mesh(sphere(0.045, 16, 12), mGold, fl, [Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0], [1, 1, 0.55], S.goldInk); }
        mesh(sphere(0.048, 18, 14), mGoldLt, fl, [0, 0, 0.02], [1, 1, 0.7], S.goldInk);
        // two gold bars running toward the image-left
        [[0.035, 0.028], [-0.035, 0.024]].forEach(([dy, r]) => mesh(tube([onCoat(deg - 4, yK + dy, 0.05), onCoat(14, yK + dy, 0.055), onCoat(0, yK + dy, 0.055), onCoat(-6, yK + dy, 0.05)], r * 0.36, 20, 8), mGold, bg, null, null, S.goldInk));
        // pendant: pearl, blue crystal drop, long pale jade with a gold cap
        const pp = onCoat(2, yK - 0.08, 0.1);
        mesh(sphere(0.036, 16, 12), mPearl, bg, [pp.x, pp.y - 0.02, pp.z], null, '#B9B4AA');
        mesh(K.dropGeo(0.12, 0.05, 1.8), mCrystal, bg, [pp.x, pp.y - 0.13, pp.z], [1, -1, 1]);
        mesh(new THREE.CylinderGeometry(0.035, 0.046, 0.36, 20), std(M(S.jade, 1.25, 0.04), { roughness: 0.3 }), bg, [pp.x, pp.y - 0.43, pp.z - 0.01], null, '#A8AE96');
        mesh(new THREE.CylinderGeometry(0.048, 0.03, 0.05, 20), mGold, bg, [pp.x, pp.y - 0.63, pp.z - 0.01], null, S.goldInk);
        // dangle under the flower: gold bead, blue drop, gold beads, gold tassel
        const tg = group(bg, [c.x, c.y - 0.07, c.z + 0.03]);
        mesh(sphere(0.028, 12, 10), mGold, tg, [0, -0.05, 0], null, S.goldInk);
        mesh(tube([[0, -0.05, 0], [0, -0.44, 0]], 0.007, 8, 6), mGold, tg);
        mesh(K.dropGeo(0.13, 0.05, 1.8), mCrystal, tg, [0, -0.17, 0.01], [1, -1, 1], M('#8FA4BC', 1.1, 0));
        mesh(sphere(0.028, 12, 10), mGold, tg, [0, -0.33, 0], null, S.goldInk);
        mesh(sphere(0.034, 12, 10), mGold, tg, [0, -0.4, 0], null, S.goldInk);
        K.tassel(tg, [0, -0.46, 0], GOLD_LT, 0.4, 0.062, S.goldInk);
        K.onTick((t, k) => { tg.rotation.z = 0.07 * Math.sin(t * 1.6) * k; });
        // mustard sash end hanging on the image-left of the skirt
        const sashPts = [1.74, 1.5, 1.22, 0.98, 0.8].map((y, i) => onCoat(-17 - i * 0.6, y, 0.035 + 0.02 * i));
        mesh(sash(sashPts, 0.18, { face: () => V(-0.2, 0, 1), cup: 0.1, folds: 1.5, segs: 60 }), [std(MUSTARD, { roughness: 0.8 }), std(M('#E2BD72', 1.35, 0), { roughness: 0.8 })], bg, null, null, M('#C9A35A', 1.2, 0));
      }

      /* ---------------- 披帛: long blue-grey ribbon over both shoulders, image-left streamers, sage streamer ---------------- */
      const ribG = part('ribbon', K.body);
      {
        // drape: ribbon points in front (z > 0.2) are pushed just in front of the sleeves / coat / robe (raycast from the viewer),
        // points at the sides / back are pushed radially outside the coat
        const rc = new THREE.Raycaster(), drapeT = [slL, slR, coatMesh, K.robeMesh];
        K.character.updateMatrixWorld(true);
        const frontZ = (x, y) => { rc.set(V(x, y, 6), V(0, 0, -1)); const h = rc.intersectObjects(drapeT, false)[0]; return h ? h.point.z : -9; };
        const drape = (pts, clear, n) => {
          const cv = new THREE.CatmullRomCurve3(pts.map(Vn)), out = [];
          for (let i = 0; i <= n; i++) out.push(cv.getPointAt(i / n));
          const need = out.map(p => (p.z > 0.2 ? frontZ(p.x, p.y) + clear : -9));
          const around = (p) => { if (p.z > 0.2 || p.y < 0.35 || p.y > 2.78) return; const r = Math.hypot(p.x, p.z), m = coatR(p.y) + clear; if (r > 1e-3 && r < m) { p.x *= m / r; p.z *= m / r; } };
          for (let it = 0; it < 24; it++) {               // smooth envelope over the surface constraints (no kinks at sleeve edges)
            out.forEach((p, i) => { p.z = Math.max(p.z, need[i]); around(p); });
            const z = out.map(p => p.z);
            out.forEach((p, i) => { if (i > 1 && i < n - 1) p.z = (z[i - 2] + 2 * z[i - 1] + 3 * z[i] + 2 * z[i + 1] + z[i + 2]) / 9; });
          }
          out.forEach((p, i) => { p.z = Math.max(p.z, need[i]) + 0.03 * Math.sin(i / n * Math.PI * 5) * sst(0, 0.15, i / n) * sst(1, 0.85, i / n); around(p); });
          return out;
        };
        const face = (p) => {
          const o = V(p.x, 0, p.z); if (o.lengthSq() < 1e-4) o.set(0, 0, 1); o.normalize();
          const fr = V(0, 0, 1).addScaledVector(o, 0.35).normalize();
          o.lerp(fr, sst(-0.2, 0.2, p.z));
          if (p.y > 2.5) o.lerp(V(0, 1, 0), 0.65 * sst(2.5, 2.68, p.y) * sst(0.98, 0.78, Math.abs(p.x)));   // lies flat on the shoulders only
          return o.normalize();
        };
        const mBlueF = std(BLUE, { roughness: 0.8 }), mBlueB = std(BLUE_D, { roughness: 0.8 });
        // main 披帛: soft loop out of the image-left sleeve top → over the shoulder, behind the neck → down the image-right front
        const main = drape([[-0.62, 2.24, 0.15], [-0.95, 2.32, 0.62], [-1.3, 2.37, 0.52], [-1.45, 2.52, 0.46], [-1.33, 2.69, 0.42], [-1.0, 2.76, 0.4], [-0.74, 2.8, 0.28],
          [-0.64, 2.8, 0.0], [-0.46, 2.7, -0.46], [0, 2.64, -0.66], [0.46, 2.7, -0.46], [0.64, 2.74, 0.0],
          [0.78, 2.62, 0.28], [0.94, 2.4, 0.46], [1.08, 2.14, 0.5], [1.2, 1.82, 0.46], [1.3, 1.4, 0.46], [1.32, 1.08, 0.46], [1.26, 0.9, 0.5], [1.1, 0.88, 0.3]], 0.045, 260);
        mesh(sash(main, 0.2, { face, twist: t => 0.28 * Math.sin(t * Math.PI * 7) + 0.3 * sst(0.62, 0.72, t) * Math.sin(t * Math.PI * 9), segs: 280 }), [mBlueF, mBlueB], ribG, null, null, S.blueInk);
        // blue band hanging from the image-left paw down the front of the sleeve, U-turn at the sleeve bottom, back up under the sash end
        const uLoop = drape([[0.04, 2.2, 0.98], [-0.24, 1.9, 1.0], [-0.56, 1.56, 0.96], [-0.82, 1.3, 0.9], [-1.0, 1.14, 0.84], [-0.99, 1.04, 0.82], [-0.89, 1.0, 0.82],
          [-0.78, 1.08, 0.84], [-0.64, 1.26, 0.86], [-0.5, 1.42, 0.86], [-0.34, 1.53, 0.82]], 0.045, 170);
        mesh(sash(uLoop, t => 0.18 * (1 - 0.3 * sst(0.85, 1, t)), { twist: t => Math.PI * sst(0.56, 0.76, t), cup: 0.12, segs: 170 }), [mBlueF, mBlueB], ribG, null, null, S.blueInk);
        // sage-grey streamer (blue underside) from the sleeve front down to the far image-left, curling under and trailing toward the hem
        const st = drape([[-0.28, 2.06, 1.0], [-0.6, 1.87, 1.0], [-0.98, 1.69, 0.86], [-1.38, 1.53, 0.64], [-1.72, 1.41, 0.46], [-1.93, 1.3, 0.36], [-2.0, 1.17, 0.3],
          [-1.9, 1.06, 0.3], [-1.73, 0.99, 0.34], [-1.58, 0.88, 0.36], [-1.5, 0.74, 0.36]], 0.05, 190);
        mesh(sash(st, t => 0.18 * (1 - 0.35 * sst(0.75, 1, t)), { twist: t => -Math.PI * sst(0.56, 0.74, t) + 0.25 * Math.sin(t * Math.PI * 3), segs: 190 }), [std(M('#C6CDC5', 1.35, 0.04), { roughness: 0.82 }), mBlueF], ribG, null, null, S.sageInk);
        // pale cream gauze from the collar over the upper sleeve, riding on the upper edge of the sage-grey streamer
        const gz = drape([[-0.3, 2.64, 0.45], [-0.4, 2.46, 0.85], [-0.56, 2.22, 0.98], [-0.78, 1.98, 0.98], [-1.04, 1.8, 0.88], [-1.3, 1.67, 0.74], [-1.5, 1.58, 0.64]], 0.08, 150);
        const mGauze = std(M('#F8EBD0', 1.3, 0.04), { roughness: 0.85, transparent: true, opacity: 0.92 });
        mesh(sash(gz, t => 0.17 - 0.08 * t, { cup: 0.22, th: 0.018, twist: t => 0.3 * Math.sin(t * Math.PI * 2.5), segs: 150 }), [mGauze, mGauze], ribG, null, null, M('#D9BD87', 1.1, 0));
        // sage streamer from the belt down to the image-right
        const sg = [onRobe(30, 1.76, 0.08), onRobe(36, 1.4, 0.14), [0.95, 1.0, 0.72], [1.25, 0.62, 0.66], [1.55, 0.36, 0.5], [1.86, 0.28, 0.36], [2.0, 0.42, 0.28]];
        mesh(sash(sg, t => 0.15 * (1 - 0.3 * t), { face: () => V(0.25, 0.1, 1), twist: t => 0.45 * Math.sin(t * Math.PI * 2.2), segs: 150 }), [std(SAGE_LT, { roughness: 0.8 }), std(SAGE, { roughness: 0.8 })], ribG, null, null, S.sageInk);
      }

      /* ---------------- white jade sword held diagonally, tip toward the upper image-right ---------------- */
      const swordG = part('sword', K.body);
      {
        const Gp = V(0.29, 2.16, 1.03), dir = V(1.96, 1.42, -0.3).normalize();
        const sg = group(swordG, Gp);
        sg.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
        // grip + pommel
        mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.62, 20), mGold, sg, [0, 0.06, 0], null, S.goldInk);
        mesh(sphere(0.055, 20, 14), mGold, sg, [0, -0.26, 0], [1, 1.2, 1], S.goldInk);
        mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 20), mGoldLt, sg, [0, -0.2, 0], null, S.goldInk).rotation.x = Math.PI / 2;
        // quatrefoil gold guard with a blue gem
        const gy = 0.4;
        const qs = new THREE.Shape();
        for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, r = 0.15 * (0.62 + 0.38 * Math.pow(Math.abs(Math.cos(2 * a)), 0.6)); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? qs.lineTo(x, y) : qs.moveTo(x, y); }
        const guard = mesh(extrude(qs, 0.05, 0.015, 3, 12), mGold, sg, [0, gy, 0], null, S.goldInk);
        guard.rotation.set(0, 0, Math.PI / 4);
        const petals = new THREE.Shape(); for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, r = 0.09 + 0.1 * Math.pow(Math.abs(Math.cos(2 * a)), 8); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? petals.lineTo(x, y) : petals.moveTo(x, y); }
        mesh(extrude(petals, 0.03, 0.01, 2, 12), mGoldLt, sg, [0, gy, -0.012], null, S.goldInk);
        mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 24), mGoldLt, sg, [0, gy, 0.035]);
        mesh(sphere(0.045, 18, 14), std(M('#ACBED0', 1.2), { roughness: 0.2 }), sg, [0, gy, 0.035], [1, 1, 0.7]);
        // blade (白玉): flat rounded plank with gold outline, centre line and a painted flower spray
        const Lb = 1.82, Wb = 0.2;
        const bs = new THREE.Shape(); bs.moveTo(-Wb / 2, 0); bs.lineTo(Wb / 2, 0); bs.lineTo(Wb / 2, Lb - Wb / 2);
        bs.quadraticCurveTo(Wb / 2, Lb, 0, Lb); bs.quadraticCurveTo(-Wb / 2, Lb, -Wb / 2, Lb - Wb / 2); bs.lineTo(-Wb / 2, 0);
        const bgeo = extrude(bs, 0.045, 0.014, 3, 16);
        const btex = canvasTex(128, 1024, (g, w, h) => {
          const px = x => (x / Wb + 0.5) * w, py = y => (1 - y / Lb) * h;
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, M('#F3EEE3', 1.15)); lg.addColorStop(0.45, M('#FFFCF6', 1.1)); lg.addColorStop(1, M('#EEE9DD', 1.15));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.strokeStyle = M('#D8B77E', 1.2); g.lineWidth = 3; g.beginPath(); g.moveTo(px(0), py(0.05)); g.lineTo(px(0), py(Lb - 0.35)); g.stroke();
          g.fillStyle = M('#E7C98E', 1.2); g.beginPath(); g.arc(px(0), py(0.2), 7, 0, Math.PI * 2); g.fill();
          // white flower + two leaves near the tip
          g.save(); g.translate(px(0.01), py(Lb - 0.42));
          g.fillStyle = M('#9DAA7E', 1.2); D.leaf(g, 0, 0, 70, 0.35, M('#9DAA7E', 1.2)); D.leaf(g, 0, 10, 55, -0.25, M('#B2BC90', 1.2));
          flowerMotif(g, 0, 30, 16);
          g.restore();
        });
        btex.repeat.set(1 / Wb, 1 / Lb); btex.offset.set(0.5, 0);
        mesh(bgeo, [texMat(btex, { roughness: 0.35 }), std(M('#F1EBDD', 1.25, 0.05), { roughness: 0.35 })], sg, [0, gy + 0.05, 0], null, M('#C4A46C', 1.05, 0));
      }

      /* ---------------- feet: big white paws under the hem ---------------- */
      {
        const fm = std(WHITE, { roughness: 0.95 }), cm = std('#CDBEAF', { roughness: 0.8 });
        [-1, 1].forEach(sx => {
          const fg = group(K.poseG, [0.46 * sx, 0, 0.5]);
          mesh(sphere(0.25, 32, 24), fm, fg, [0, 0.16, 0], [1.1, 0.72, 1.25], S.creamInk);
          [-0.08, 0.08].forEach(dx => mesh(tube([[dx, 0.26, 0.26], [dx * 1.05, 0.17, 0.3], [dx * 1.1, 0.07, 0.28]], 0.007, 8, 5), cm, fg));
        });
        // white under-skirt peeking between hem and feet
        mesh(new THREE.CylinderGeometry(0.84, 0.86, 0.2, 64, 1, true), std(M('#F8F0E3', 1.2), { roughness: 0.9, side: DS }), K.robeG, [0, 0.2, 0], [1, 1, 0.9]);
      }

      /* ---------------- tail: white flower and a yellow leaf tucked on it ---------------- */
      {
        // tailG origin = tail root; the flower is pinned onto the front surface of the rising part of the tail
        // (found on the same arc-length curve the engine sweeps the tail tube along), facing outward
        const T0 = V(...TAIL[0]), cv = new THREE.CatmullRomCurve3(TAIL.map(p => V(...p).sub(T0)));
        const tShape = K.cfg.tail.shape;
        let tf = 0.5, best = 1e9;
        for (let i = 0; i <= 200; i++) { const t = 0.3 + 0.4 * i / 200, d = Math.abs(cv.getPointAt(t).y + T0.y - 1.5); if (d < best) { best = d; tf = t; } }
        const tp = cv.getPointAt(tf), tg = cv.getTangentAt(tf);
        const out = V(0.25, 0, 1).addScaledVector(tg, -V(0.25, 0, 1).dot(tg)).normalize();
        // it sits just above the fur shells (so it is not swallowed by them), on a short stem pushed into the tail
        const fp = tp.clone().addScaledVector(out, 0.28 * tShape(tf) + 0.07);
        mesh(tube([tp.clone().addScaledVector(out, 0.28 * tShape(tf) - 0.04), fp], 0.014, 6, 8), std(LEAF, { roughness: 0.8 }), K.tailG);
        const fl = K.flower(K.tailG, fp, 0.33, M('#FFFDF8', 1.1), GOLD_LT, 5);
        fl.lookAt(fl.getWorldPosition(V()).add(out));
        fl.children.forEach(m => m.isMesh && K.outline(m, '#BFAE90'));
      }

      /* ---------------- pearl tiara: blue band hugging the crown, gold scrolls, pearl, flowers, crystals, leaves, reeds ---------------- */
      const hatG = part('hat', K.head);
      {
        const FURL = 0.075;
        const onHead = (x, y, off) => { const h = K.onSkin(x, y, [K.headMesh]); return { p: h.p.clone().addScaledVector(h.n, off), n: h.n.clone() }; };
        const bandY = x => 4.31 - 0.05 * Math.pow(x / 0.5, 2);
        const bandAt = (x, off) => onHead(x, bandY(x), FURL + (off || 0));
        const xs = []; for (let i = 0; i <= 16; i++) xs.push(-0.5 + i / 16);
        // pale blue band
        const bandPts = xs.map(x => bandAt(x, 0.01).p);
        mesh(ribbonN(bandPts, 0.16, (p) => { const q = bandAt(Math.max(-0.5, Math.min(0.5, p.x)), 0); return q.n; }, 60), std(BLUE, { roughness: 0.7, side: DS }), hatG, null, null, S.blueInk);
        // gold lower rail
        mesh(tube(xs.map(x => { const q = bandAt(x, 0.03); return q.p.add(V(0, -0.055, 0)); }), 0.022, 80, 8), mGold, hatG, null, null, S.goldInk);
        // scroll ornament facing along the surface normal
        const scroll = (x, dy, r, turns, dir, w, off) => {
          const q = bandAt(x, 0.04 + (off || 0)), g = group(hatG, q.p.clone().add(V(0, dy, 0)));
          g.lookAt(q.p.clone().add(V(0, dy, 0)).addScaledVector(q.n, 0.5).add(V(0, 0, 1)));
          r *= 1.3; w *= 1.25;
          const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = Math.PI * 0.5 + t * turns * Math.PI * 2 * dir, rr = r * (1 - 0.72 * t); pts.push([Math.cos(a) * rr * -1, Math.sin(a) * rr, 0]); }
          mesh(tube(pts, t => w * (1 - 0.45 * t), 50, 8), mGold, g, null, null, S.goldInk);
          return g;
        };
        [-1, 1].forEach(sx => {
          scroll(0.44 * sx, 0.02, 0.08, 1.1, sx, 0.024);           // C-scrolls at the ends
          scroll(0.12 * sx, 0.01, 0.09, 1.05, -sx, 0.028, 0.02);   // ruyi cloud under the pearl
          scroll(0.28 * sx, -0.01, 0.05, 1.0, sx, 0.02);
          // arms curling up around the pearl
          const b0 = bandAt(0.05 * sx, 0.06).p, b1 = bandAt(0.2 * sx, 0.05).p;
          mesh(tube([b0.clone().add(V(0, 0.06, 0)), b1.clone().add(V(0, 0.08, -0.02)), V(0.25 * sx, 4.58, b1.z - 0.1), V(0.18 * sx, 4.72, b1.z - 0.16)], 0.02, 30, 8), mGold, hatG, null, null, S.goldInk);
          // gold chain + blue crystal drop hanging in front of the forehead
          const top = bandAt(0.42 * sx, 0.03).p.add(V(0, -0.07, 0)), cz = onHead(0.42 * sx, 4.1, FURL + 0.05).p;
          const dg = group(hatG, top);
          const rel = cz.clone().sub(top);
          mesh(sphere(0.024, 12, 10), mGold, dg, [0, 0, 0], null, S.goldInk);
          mesh(tube([[0, 0, 0], [rel.x * 0.5, rel.y * 0.5, rel.z * 0.5 + 0.01], [rel.x * 0.8, rel.y * 0.8 + 0.05, rel.z * 0.8]], 0.008, 8, 6), mGold, dg);
          mesh(sphere(0.02, 12, 10), mGold, dg, [rel.x * 0.8, rel.y * 0.8 + 0.06, rel.z * 0.8], null, S.goldInk);
          mesh(K.dropGeo(0.16, 0.06, 1.8), mCrystal, dg, [rel.x, rel.y - 0.02, rel.z], [1, -1, 1], M('#8FA4BC', 1.1, 0));
          K.onTick((t, k) => { dg.rotation.z = 0.06 * Math.sin(t * 1.8 + sx) * k; });
          // small white flowers beside the pearl
          const fq = bandAt(0.31 * sx, 0.02);
          const fg = K.flower(hatG, V(0.32 * sx, 4.55, fq.p.z + 0.02), 0.29, M('#FFFDF8', 1.2, 0.04), GOLD_LT, 5);
          fg.children.forEach(m => m.isMesh && K.outline(m, '#BFAE90'));
          fg.lookAt(fg.position.clone().add(V(0.2 * sx, 0.3, 1)));
        });
        const c0 = bandAt(0, 0.05).p;
        mesh(sphere(0.055, 16, 12), mGoldLt, hatG, c0.clone().add(V(0, -0.02, 0.01)), [1, 0.8, 0.6], S.goldInk);
        // the big white pearl in a gold cup
        mesh(sphere(0.08, 20, 14), mGold, hatG, V(0, 4.43, c0.z - 0.1), [1.7, 0.55, 1.3], S.goldInk);
        mesh(sphere(0.2, 40, 30), mPearl, hatG, V(0, 4.62, c0.z - 0.12), null, '#B8B2A8');
        // sage leaves behind the tiara
        const leafS = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.45, 0, L); s.quadraticCurveTo(-w, L * 0.45, 0, 0); return s; };
        // each leaf keeps its tip where it was, but its base is tucked just behind the upper edge of the band,
        // so the leaves visibly grow out of the tiara instead of hovering above it
        const mLeaf = std(LEAF, { roughness: 0.75 });
        [[0.22, 4.64, -0.02, -0.25], [0.32, 4.6, 0.0, -0.75], [0.42, 4.5, -0.02, -1.2], [-0.42, 4.44, 0.02, 1.45], [-0.36, 4.47, 0.0, 1.15]].forEach(([x, y, z, r]) => {
          const tip = V(x - Math.sin(r) * 0.38, y + Math.cos(r) * 0.38, z);
          const bx = Math.max(-0.44, Math.min(0.44, x * 0.9)), base = bandAt(bx, -0.016).p;   // centre line, just under the band
          tip.z = Math.max(tip.z, base.z - 0.25);
          const d = tip.clone().sub(base), L = d.length();
          const l = mesh(extrude(leafS(L, 0.075 * Math.min(1.25, L / 0.38)), 0.02, 0.006, 2, 12), mLeaf, hatG, base, null, S.sageInk);
          l.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
        });
        // two golden reed plumes rising behind the image-right side
        const plume = (L, W, bend) => {
          const s = new THREE.Shape(), n = 16, top = [], bot = [];
          for (let i = 0; i <= n; i++) {
            const t = i / n, x = bend * t * t * L, y = t * L, w = W * Math.sin(Math.PI * Math.min(1, t * 1.05)) * (1 - 0.25 * t);
            top.push([x + w * (i % 2 ? 1.0 : 0.62), y - (i % 2 ? 0.015 : 0)]); bot.push([x - w * 0.45, y]);
          }
          s.moveTo(0, 0); top.forEach(p => s.lineTo(p[0], p[1])); bot.reverse().forEach(p => s.lineTo(p[0], p[1])); s.lineTo(0, 0);
          return new THREE.ShapeGeometry(s, 4);
        };
        const mReed = std(M('#EFD29E', 1.2, 0), { roughness: 0.75, side: DS });
        [[0.3, 4.6, 0.0, 0.8, -0.55, 0.35, 0.16], [0.4, 4.6, -0.04, 0.62, -1.0, 0.3, 0.13]].forEach(([x, y, z, L, r, bend, W]) => {
          const pg = group(hatG, [x, y, z], [0, 0, r]);
          mesh(tube([[0, -0.12, 0], [0.02, L * 0.3, 0], [bend * L * 0.2, L * 0.55, 0]], 0.01, 16, 6), std(REED_D, { roughness: 0.8 }), pg);
          mesh(plume(L * 0.7, W, bend), mReed, pg, [0, L * 0.3, 0], null, M('#C79E5E', 1.2, 0));
        });
        // pale blue ribbon streaming to the image-right, behind the ear
        const rp = [[0.46, 4.38, 0.08], [0.72, 4.5, -0.24], [1.04, 4.36, -0.34], [1.26, 4.12, -0.26], [1.5, 4.0, -0.16], [1.78, 3.98, -0.08], [2.02, 3.86, 0.0]];
        mesh(ribbonN(rp, t => 0.2 - 0.05 * t, () => V(0, 0.2, 1), 80), mBlue, hatG, null, null, S.blueInk);
      }

      /* ---------------- floating decorations: dew drops, golden reeds, falling leaves, white flowers, mist ---------------- */
      {
        const items = [];
        const mLeafY = std(LEAF_Y, { roughness: 0.7, side: DS }), mStem = std(M('#B7B08A', 1.3), { roughness: 0.8 }), mGreen = std(LEAF, { roughness: 0.75, side: DS });
        const leafS = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.45, 0, L); s.quadraticCurveTo(-w, L * 0.45, 0, 0); return s; };
        const yLeaf = extrude(leafS(0.28, 0.12), 0.02, 0.008, 2, 12);
        // dew drops
        [[-1.24, 4.0, 0.2, 0.3], [-1.62, 1.9, 0.3, 0.3], [1.33, 3.3, 0.3, 0.28], [1.66, 2.3, 0.3, 0.26]].forEach(([x, y, z, s]) => {
          items.push(K.drop(K.decor, [x, y, z], s, M(S.crystal, 1.2)));
        });
        // falling yellow leaves
        [[-1.4, 3.75, 0.1, 0.9], [-1.42, 1.22, 0.4, -0.5], [1.9, 2.85, 0.2, 2.2], [1.36, 2.36, 0.4, -2.0]].forEach(([x, y, z, r], i) => {
          const g = group(K.decor, [x, y, z], [0.3, 0.4 * (i % 2 ? 1 : -1), r]);
          mesh(yLeaf, mLeafY, g, [0, -0.14, 0], null, M('#C99B45', 1.2)); items.push(g);
        });
        // golden reed sprig with leaves and a white flower (image-left)
        {
          const g = group(K.decor, [-1.55, 2.72, 0.0]);
          [[-0.08, 0.9, 0.38], [0.1, 0.8, 0.16]].forEach(([x, L, r]) => {
            const s = group(g, [x, 0, 0], [0, 0, r]);
            mesh(tube([[0, 0, 0], [0.03, L * 0.5, 0], [0.1, L, 0]], 0.012, 16, 6), mStem, s);
            const pl = new THREE.Shape(); const n = 12; pl.moveTo(0, 0);
            for (let i = 0; i <= n; i++) { const t = i / n; pl.lineTo(0.08 * Math.sin(Math.PI * t) * (i % 2 ? 1 : 0.55) + 0.05 * t, t * 0.42); }
            for (let i = n; i >= 0; i--) { const t = i / n; pl.lineTo(-0.03 * Math.sin(Math.PI * t) + 0.05 * t, t * 0.42); }
            mesh(new THREE.ShapeGeometry(pl, 4), std(REED, { roughness: 0.7, side: DS }), s, [0.08, L * 0.62, 0], null, M('#C79E5E', 1.2)).rotation.z = -0.2;
          });
          [[-0.1, 0.05, 1.0], [0.15, 0.1, -0.9]].forEach(([x, y, r]) => mesh(extrude(leafS(0.45, 0.07), 0.02, 0.006, 2, 12), mGreen, g, [x, y, 0], null, M('#8C8F6A', 1.2)).rotation.z = r);
          K.flower(g, [0.12, 0.2, 0.08], 0.32, M('#FFFDF8', 1.1), GOLD_LT, 5).children.forEach(m => m.isMesh && K.outline(m, '#BFAE90'));
          items.push(g);
        }
        // golden reed plume (image-right)
        {
          const g = group(K.decor, [1.6, 3.35, 0.0], [0, 0, -0.5]);
          const pl = new THREE.Shape(); const n = 14; pl.moveTo(0, 0);
          for (let i = 0; i <= n; i++) { const t = i / n; pl.lineTo(0.1 * Math.sin(Math.PI * t) * (i % 2 ? 1 : 0.55) + 0.1 * t * t, t * 0.5); }
          for (let i = n; i >= 0; i--) { const t = i / n; pl.lineTo(-0.03 * Math.sin(Math.PI * t) + 0.1 * t * t, t * 0.5); }
          mesh(new THREE.ShapeGeometry(pl, 4), std(REED, { roughness: 0.7, side: DS }), g, null, null, M('#C79E5E', 1.2));
          items.push(g);
        }
        // mist swirls
        {
          const mm = std(M('#EEF2F4', 1.1), { roughness: 0.6, transparent: true, opacity: 0.85 });
          const g = group(K.decor, [-1.9, 2.55, -0.3]);
          const pts = []; for (let i = 0; i <= 50; i++) { const t = i / 50, a = t * Math.PI * 2.4; pts.push([0.4 * t + Math.cos(a) * 0.14 * (1 - t), Math.sin(a) * 0.14 * (1 - t) - 0.1 * t, 0]); }
          mesh(tube(pts, 0.025, 80, 8), mm, g, null, null, M('#C9D3DA', 1.1));
          mesh(tube([[0.2, -0.3, 0], [0.5, -0.36, 0], [0.7, -0.26, 0], [0.9, -0.32, 0]], 0.02, 40, 8), mm, g, null, null, M('#C9D3DA', 1.1));
          items.push(g);
          const g2 = group(K.decor, [1.62, 2.62, -0.2]);
          mesh(tube([[-0.4, 0.1, 0], [-0.1, 0.18, 0], [0.15, 0.1, 0], [0.2, -0.08, 0], [0.05, -0.12, 0]], 0.022, 40, 8), mm, g2, null, null, M('#C9D3DA', 1.1));
          items.push(g2);
          const g3 = group(K.decor, [-1.15, 0.55, 0.1]);
          mesh(tube([[-0.45, 0.05, 0], [-0.15, 0.12, 0], [0.1, 0.02, 0], [0.05, -0.1, 0], [-0.1, -0.05, 0]], 0.02, 40, 8), mm, g3, null, null, M('#C9D3DA', 1.1));
          mesh(tube([[-0.6, -0.14, 0], [-0.3, -0.2, 0], [0.0, -0.18, 0]], 0.016, 30, 8), mm, g3, null, null, M('#C9D3DA', 1.1));
          items.push(g3);
        }
        items.forEach(g => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.1 * Math.sin(t * 0.8 + i) * k;
        }));
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '白露時節的蒹葭露仙',
        text: '白露是秋意漸濃、清晨草葉凝出露珠的時節，「蒹葭蒼蒼，白露為霜」。這隻銀灰虎斑長毛貓化身蒹葭露仙：戴珍珠露冠、斜握白玉劍，全身以月白、霧藍灰、鼠尾草綠與蘆葦金搭配，清冷又溫柔。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '銀灰虎斑與白口鼻',
        text: '大圓臉兩側長出一撮撮尖尖的蓬鬆長毛。額頭有五道深灰直紋，眼角上方有往外掃的條紋、兩頰各有兩道橫紋；眉心以下到下巴是一整片白毛，下巴平平一排白絨毛。深棕圓眼、粉紅小鼻與細細的「ω」嘴，腮紅上點著兩條小紅短線。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '直立大尖耳',
        text: '一對大尖耳幾乎直立在露冠兩側，外緣挺直，外側銀灰、耳內淡粉，耳根冒出一撮白色軟毛。' },
      hat: { chip: '露冠', tag: '服飾', name: '珍珠露冠',
        text: '淡藍冠帶上排著金色卷雲紋，正中的如意雲托起一顆大白珍珠，兩旁各有一朵黃心五瓣小白花；冠框兩端以金珠垂下水晶露珠。冠後左邊兩片綠葉往左平伸、右邊綠葉往右上展開，兩支金色蘆葦穗彎向右上，一條淡藍絲帶往畫面右側飄。' },
      sword: { chip: '玉劍', tag: '道具', name: '白玉劍',
        text: '雙爪在胸前斜握一柄白玉劍，劍尖指向右上方、從右頰下方斜斜越過。劍身圓頭、描金細邊，中線有淡金細紋，近劍尖畫著一朵小白花與兩片綠葉；金色四瓣花形劍格中央鑲著淡藍寶石。' },
      robe: { chip: '長袍', tag: '服飾', name: '蘆葦紋月白長袍',
        text: '米白外袍前襟敞開、開口偏向畫面右側：左衣緣滾霧藍灰寬邊，右衣襟是一道鼠尾草綠寬帶，下襬微微外張並滾藍灰邊。袍面畫著金色蘆葦穗、綠色長葉與淡藍水滴，裡層是白色交領、領前掛一圈細金項鍊，內裙前片也繡著蘆葦。' },
      sleeves: { chip: '寬袖', tag: '服飾', name: '垂墜大袖',
        text: '兩隻寬大的袖子從手臂下方長長垂到腰下，左袖像一只柔軟的大袋子貼著身側垂落；袖面同樣畫著蘆葦與水滴，袖口滾霧藍灰邊。前爪從袖口伸出，一上一下扶著劍柄。' },
      ribbon: { chip: '披帛', tag: '服飾', name: '霧藍披帛與飄帶',
        text: '霧藍灰長披帛從背後繞過雙肩，在左肩外打一個柔軟的圈；另一段霧藍帶從左爪垂下，沿著左袖前緣滑到袖底兜成 U 形再回到腰間。灰綠長飄帶（背面霧藍）和上方的淡黃紗帶從左袖前斜斜飄向左下，末端捲起再垂向裙襬；右側藍帶沿右袖垂下，腰右一條鼠尾草綠飄帶拖到腳邊，像晨霧裡被風吹動的草葉。' },
      belt: { chip: '腰飾', tag: '服飾', name: '腰帶與玉珮',
        text: '灰青色寬腰帶上，左邊一個金環、右邊一朵金色八瓣花扣，以兩道細金條相連；下方左垂珍珠、水晶露珠與淡綠長玉珮，右垂金珠、水晶露珠與長長的金色流蘇，腰左下還垂著一段芥末黃帶尾。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '蓬鬆松鼠尾', dir: [1, 0.3, -0.8],
        text: '又大又蓬的銀灰尾巴從右後方升起，上端鼓成一大團、尾尖往內勾回，尾上有煙灰色的深色斑紋，還別著一朵小白花。' },
      pose: { chip: '姿態', tag: '貓咪本體', name: '持劍站姿',
        text: '雙腳站穩，露出大大的白色腳掌；畫面左側前爪在劍格下握住劍柄，右側前爪從下方托著，整個身體微微朝劍的方向。按下「行禮」可以看牠鞠躬。' }
    },
    order: ['overview', 'face', 'ears', 'hat', 'sword', 'robe', 'sleeves', 'ribbon', 'belt', 'tail', 'pose']
  });
})();
