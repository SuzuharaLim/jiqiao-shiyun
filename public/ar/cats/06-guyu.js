// @file 06_穀雨_梨花貓
// @title 穀雨・潤穀雨仙貓 | 二十四節氣貓
(function () {
  /* Colours are SAMPLED from refs/06.png (tools/colors.py). def.exposure (linear tone mapping) dims the
     lights so they render close to the picture; M(hex, f) applies an optional per-colour correction
     (f > 1 darkens, f < 1 brightens). Scale: 1 unit ≈ 89 px of the 492 × 512 picture, x = (px − 237) / 89,
     y = (487 − py) / 89. */
  const EXPOSURE = 0.76;
  function M(hex, f) {
    f = f || 1; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f, 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  // ---- coat (brown tabby 梨花) ----
  const FUR = M('#C0AB91'), FUR_TOP = M('#AA957D'), FUR_MID = M('#B29E86'), FUR_LOW = M('#BAA790');
  const DEEP = M('#8E7560', 1.1), CREAM = M('#FBF5EB'), INK = '#A1876F', CINK = '#CDB8A0';
  // ---- clothing ----
  const ROBE = M('#F8F3E9', 1.3), SAGE = M('#B0C69E', 1.3), SAGE_D = M('#9DB27E'), SAGE_INK = '#86A06C', PALE_G = M('#CCDDC6');
  const TEAL = M('#A3C3B3'), TEAL_D = '#7FA595';
  const BLUE = M('#B5C5DC'), BLUE_D = '#8499BA', BELT = M('#9DB6C6', 1.35), BELT_D = '#7892A4';
  const HEM = M('#C6D8DE', 1.25), HEM_D = M('#A9C2CB', 1.2), HEM_INK = '#8EAAB5';
  const GOLD = M('#F0D18D'), GOLD_D = '#C49A50';
  const LEAF = M('#AFC380', 1.3), LEAF_D = '#86A060', SPROUT = M('#9DBB78');
  const RICE = M('#F9E0A6'), RICE_D = '#C4944A', STEM = M('#B8C77E');
  const CELADON = M('#E2ECDD'), CELADON_D = '#8DB09F', WATER = M('#BCDCE4');

  // robe profile [r, y] hem → neck. Belt y 1.97–2.21 (r ≈ 0.7), hem r ≈ 1.5 at y ≈ 0.4
  const PROFILE = [[1.48, 0.3], [1.52, 0.4], [1.45, 0.68], [1.27, 1.04], [1.05, 1.42], [0.84, 1.78], [0.72, 2.06],
    [0.7, 2.34], [0.67, 2.6], [0.55, 2.8], [0.3, 2.95], [0.08, 3.0]];
  const HY = 3.65, CROWN = 0.15;   // head centre; the upper half of the head is stretched by CROWN (taller crown as drawn)
  const TAIL = [[0.62, 0.62, -0.82], [1.38, 0.66, -0.62], [1.98, 1.02, -0.48], [2.3, 1.6, -0.4], [2.16, 2.08, -0.35], [1.7, 2.1, -0.3]];
  let bowlG = null, riceG = null;  // for the action

  /* ---------------- head map: warm grey-brown tabby, cream lower face with a forehead wedge ---------------- */
  function paintHead(g, P) {
    const W = 1024, H = 512;
    const lg = g.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, FUR_TOP); lg.addColorStop(0.45, FUR_MID); lg.addColorStop(1, FUR_LOW);
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    g.filter = 'blur(2.5px)';
    const S = (pts, w, a, c) => P.stroke(g, pts.map(q => P.xy(q[0], q[1])), w, c || DEEP, a);
    const both = (pts, w, a) => { S(pts, w, a); S(pts.map(([x, y]) => [-x, y]), w, a); };
    // forehead: five stripes running down from the crown toward the cream wedge
    S([[0, 88], [0, 64], [1, 42]], 24, 0.9);
    both([[-13, 86], [-14, 60], [-16, 26]], 20, 0.85);
    both([[-28, 80], [-31, 60], [-35, 42]], 15, 0.6);
    // sides: horizontal bars pointing at the eyes (3 on the image-left side, 4 on the image-right side as drawn)
    [[24, 20, 16], [11, 7, 3], [-2, -6, -10]].forEach(([y0, y1, y2]) => S([[-100, y0], [-80, y1], [-58, y2]], 12, 0.85));
    [[30, 26, 22], [17, 13, 9], [4, 0, -4], [-9, -13, -17]].forEach(([y0, y1, y2]) => S([[100, y0], [80, y1], [58, y2]], 12, 0.85));
    // back of the head: mackerel bands
    for (const lon of [-165, -140, -115, 115, 140, 165]) S([[lon, 86], [lon + (lon < 0 ? -8 : 8), 40], [lon, -20]], 22, 0.65);
    S([[180, 86], [180, 30], [180, -30]], 20, 0.65); S([[-180, 86], [-180, 30], [-180, -30]], 20, 0.65);
    g.filter = 'none';
    // cream lower face + forehead wedge (soft edge)
    g.save(); g.filter = 'blur(6px)'; g.fillStyle = '#FFFDF9';
    const half = [[0, 42], [-4, 33], [-8, 24], [-12, 17], [-18, 13], [-26, 11], [-34, 7], [-43, 1], [-53, -7], [-64, -16], [-78, -27], [-98, -40], [-128, -52], [-180, -60]];
    const left = half.map(q => P.xy(q[0], q[1])), right = half.slice().reverse().map(q => P.xy(-q[0], q[1]));
    g.beginPath(); g.moveTo(left[0][0], left[0][1]);
    left.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(0, 512); g.lineTo(1024, 512);
    right.forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); g.restore();
  }

  /* ---------------- Hanfu wide sleeve: u around the arm (0.75 = bottom of the drape), v shoulder (bottom) → cuff (top) ---------------- */
  function sprig(D, g, x, y, s, color) {        // 一心二葉 tea sprout
    g.save(); g.translate(x, y);
    g.strokeStyle = color; g.lineWidth = Math.max(2, s * 0.07); g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.06, -s * 0.5, 0, -s); g.stroke();
    D.leaf(g, 0, -s * 0.36, s * 0.44, -1.05, color);
    D.leaf(g, 0, -s * 0.5, s * 0.4, 1.05, color);
    D.leaf(g, 0, -s * 0.95, s * 0.36, 0.1, color);
    g.restore();
  }
  // Hanfu wide sleeve (u around the arm, 0.75 = bottom of the hanging belly; v shoulder = canvas bottom → cuff = canvas top).
  // As drawn: the OUTSIDE is pale green with cloud-water swirls, the LINING (seen through the opening) is cream with tea sprouts,
  // and the opening is bound with a gold · rain-blue · gold border.
  function paintSleeve(g, w, h, D) {
    const lg = g.createLinearGradient(0, h, 0, 0);
    lg.addColorStop(0, PALE_G); lg.addColorStop(1, M('#CFDFC0'));
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    // white cloud-water swirls with a blue outline
    [[M('#A9C9CF'), 15], [M('#F2F6EE'), 8]].forEach(([c, lw]) => {
      g.save(); g.strokeStyle = c; g.lineWidth = lw; g.lineCap = 'round';
      for (let y = 150; y < 480; y += 100) for (let x = ((y / 100) % 2) * 50; x < w + 60; x += 115) {
        g.beginPath(); g.arc(x, y, 24, Math.PI * 0.2, Math.PI * 1.9); g.stroke();
        g.beginPath(); g.arc(x, y, 10, Math.PI * 1.2, Math.PI * 2.6); g.stroke();
        g.beginPath(); g.moveTo(x + 22, y + 8); g.quadraticCurveTo(x + 46, y + 22, x + 66, y + 4); g.stroke();
      }
      g.restore();
    });
    // wide cuff border round the opening: gold · rain-blue · gold
    g.fillStyle = GOLD; g.fillRect(0, 0, w, 12);
    g.fillStyle = BLUE; g.fillRect(0, 12, w, 40);
    g.fillStyle = M('#9AAECB'); g.fillRect(0, 50, w, 2);
    g.fillStyle = GOLD; g.fillRect(0, 52, w, 10);
  }
  function paintLining(g, w, h, D) {
    g.fillStyle = ROBE; g.fillRect(0, 0, w, h);
    const lg = g.createLinearGradient(0, h, 0, 0);
    lg.addColorStop(0, M('#86AE9C')); lg.addColorStop(0.35, 'rgba(160,196,178,0.6)'); lg.addColorStop(0.62, 'rgba(196,210,170,0)');
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    // sprouts drawn rotated so they read upright on the hanging belly
    for (let u = 0.52; u < 1.0; u += 0.12) { g.save(); g.translate(u * w, 170); g.rotate(-Math.PI / 2); sprig(D, g, -40, 0, 90, SPROUT); g.restore(); }
    g.fillStyle = GOLD; g.fillRect(0, 0, w, 8); g.fillStyle = BLUE; g.fillRect(0, 8, w, 22); g.fillStyle = GOLD; g.fillRect(0, 30, w, 7);
  }

  /* ---------------- robe fabric (R = { robeV, robeUV, robeR, onRobe }) ---------------- */
  function paintRobe(g, w, h, D, R) {
    g.fillStyle = ROBE; g.fillRect(0, 0, w, h);
    const sp = new THREE.SplineCurve(PROFILE.map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(48);
    let ARC = 0; for (let i = 0; i < sp.length - 1; i++) ARC += sp[i].distanceTo(sp[i + 1]);
    const kst = y => 2 * Math.PI * R.robeR(y) / ARC;        // vertical stretch that keeps motifs round
    const pxU = y => 1024 / (2 * Math.PI * R.robeR(y));     // canvas px per unit (horizontal)
    const degX = (x, y) => Math.asin(Math.max(-1, Math.min(1, x / R.robeR(y)))) * 180 / Math.PI;
    const motif = (deg, y, size, fn) => {
      const [x, v] = R.robeUV(deg, y);
      [x, x - 1024, x + 1024].forEach(xx => {
        if (xx < -200 || xx > 1224) return;
        g.save(); g.translate(xx, v); g.scale(1, kst(y)); fn(g, size * pxU(y)); g.restore();
      });
    };
    // filled region between two edge functions deg0(y) … deg1(y), y from ya (top) to yb (bottom)
    const region = (deg0, deg1, ya, yb, color, edge) => {
      const N = 30, L = [], Rr = [];
      for (let i = 0; i <= N; i++) { const y = ya + (yb - ya) * i / N; L.push(R.robeUV(deg0(y), y)); Rr.push(R.robeUV(deg1(y), y)); }
      g.fillStyle = color; g.beginPath(); g.moveTo(L[0][0], L[0][1]);
      L.forEach(p => g.lineTo(p[0], p[1])); Rr.slice().reverse().forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill();
      if (edge) {
        g.strokeStyle = edge; g.lineWidth = 3;
        [L, Rr].forEach(E => { g.beginPath(); g.moveTo(E[0][0], E[0][1]); E.forEach(p => g.lineTo(p[0], p[1])); g.stroke(); });
      }
    };
    const lerp = (a, b, t) => a + (b - a) * t;
    const tY = y => (1.92 - y) / (1.92 - 0.3);   // 0 at the belt → 1 at the hem
    // image-left: narrow green over-robe edge, an almost vertical band at x ≈ −0.62 … −0.4
    region(y => degX(-0.64 - 0.04 * tY(y), y), y => degX(-0.4 - 0.02 * tY(y), y), 1.92, 0.24, SAGE, SAGE_INK);
    // image-right: wide green front of the over-robe, from x 0.12 … at the belt to 0.52 … at the hem, wrapping round the side
    region(y => degX(lerp(0.28, 0.45, tY(y)), y), y => degX(lerp(0.62, 0.84, tY(y)), y), 1.92, 0.24, SAGE, SAGE_INK);
    // lighter inner fold along the green front edge
    region(y => degX(lerp(0.28, 0.45, tY(y)), y), y => degX(lerp(0.36, 0.56, tY(y)), y), 1.92, 0.24, M('#C8D9B4', 1.2));
    // back: the green over-robe's two long panels
    region(y => 132, y => 158, 1.92, 0.24, SAGE, SAGE_INK);
    region(y => -158, y => -132, 1.92, 0.24, SAGE, SAGE_INK);
    // hem: rain-blue band with a scalloped crest and cream cloud-water curls, all the way round
    {
      const vTop = R.robeV(0.8), vBot = 1024, per = 64, k = kst(0.6), A = 10 * k;
      const crest = x => vTop + A * (1 - Math.abs(Math.sin(Math.PI * x / per)));
      g.fillStyle = HEM; g.beginPath(); g.moveTo(0, vBot);
      for (let x = 0; x <= 1024; x += 2) g.lineTo(x, crest(x));
      g.lineTo(1024, vBot); g.closePath(); g.fill();
      g.strokeStyle = HEM_INK; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x <= 1024; x += 2) x ? g.lineTo(x, crest(x)) : g.moveTo(x, crest(x));
      g.stroke();
      g.strokeStyle = M('#F7F4EA'); g.lineCap = 'round';
      const curl = (cx, cy, r, lw) => {
        g.save(); g.translate(cx, cy); g.scale(1, k); g.lineWidth = lw;
        g.beginPath(); g.arc(0, 0, r, Math.PI * 0.95, Math.PI * 2.55); g.stroke();
        g.beginPath(); g.arc(0, 0, r * 0.45, Math.PI * 1.1, Math.PI * 2.5); g.stroke();
        g.beginPath(); g.moveTo(r, r * 0.1); g.quadraticCurveTo(r * 2.2, r * 0.9, r * 3.2, r * 0.2); g.stroke();
        g.restore();
      };
      for (let x = 0; x < 1024 + per; x += per) { curl(x + per / 2 - 8, vTop + A + 16 * k, 13, 5); curl(x + 4, vTop + A + 38 * k, 9, 4); }
      g.fillStyle = HEM_D; g.fillRect(0, vBot - 12, 1024, 12);
      g.fillStyle = M('#E9F1F2'); g.fillRect(0, vBot - 15, 1024, 3);
    }
    // tea sprouts standing on the wave crest, raindrops above (front and back)
    [[-50, 0.86, 0.46], [-30, 1.4, 0.36], [10, 0.86, 0.44], [150, 0.9, 0.44], [-150, 0.9, 0.44], [180, 0.88, 0.42], [-95, 0.95, 0.4]]
      .forEach(([d, y, s]) => motif(d, y, s, (gg, S) => sprig(D, gg, 0, 0, S, SPROUT)));
    [[-44, 1.25, 0.11], [-8, 1.55, 0.09], [165, 1.4, 0.1], [-165, 1.5, 0.1]]
      .forEach(([d, y, s]) => motif(d, y, s, (gg, S) => D.drop(gg, 0, 0, S, M('#B8D4E2'), '#F4FAFB')));
  }

  NEKO.run({
    meta: {
      id: '06', term: '穀雨', title: '穀雨・潤穀雨仙貓', seal: '穀',
      eyebrow: '二〇二七節氣貓 · 06 穀雨 · 梨花貓',
      aria: '頭戴水滴晶石髮箍、畫面左手高舉一束稻禾、右手托著溢水的青瓷碗，身穿米白、淡綠與雨藍層疊漢服的梨花虎斑貓 3D 模型'
    },
    theme: { accent: '#4D7A6B', accentDark: '#A8D2C2', glow: 'rgba(160, 205, 196, 0.30)', glowColor: '#BFE3DA' },
    palette: [['#D3B898', '梨花棕'], ['#FAF3E6', '米白'], ['#BACB98', '新芽綠'], ['#B5C5DC', '雨霧藍']],
    spec: [['品種', '梨花貓（棕色虎斑）'], ['角色', '雨生百穀的潤穀雨仙'], ['頭身比', '約 1 : 1.7']],
    seed: 606,
    exposure: EXPOSURE,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR_MID, low: FUR_LOW, deep: DEEP, cream: CREAM, ink: INK, creamInk: CINK,
        noise: { colors: ['#F4E8D8', '#9C8166'], alpha: 0.05, n: 900 },
        paintBase: paintHead
      },
      head: { y: HY, neck: 2.95, w: 1.0, h: 0.87, d: 0.9, cheek: 0.19, ruff: 0.035, chinDrop: 0.04, roll: -0.06,
        deform: (p, o) => { const t = Math.min(Math.max((o.y - 0.1) / 0.7, 0), 1); p.x *= 1 + 0.07 * t * t * (3 - 2 * t); p.y *= 1 + CROWN * Math.max(0, o.y); },
        fur: { layers: 18, length: 0.055, gravity: 0.03, repeat: [9, 5] } },
      eyes: { x: 0.43, y: -0.06, r: 0.16, sx: 0.95, sy: 1.06, sz: 0.4, color: '#3E2A1E', iris: '#6E4F39', pupil: '#2A1A11', pupilR: 0.46, shine: 0 },
      nose: { y: -0.115, color: '#F4B3A7', size: 0.85 },
      muzzle: { y: -0.24, size: 0.74 },
      mouth: { type: 'open', color: '#7C5646', y: -0.2, w: 0.14, open: 1.65, depth: 0.05, inner: '#EC9896', tongue: '#F8BCB3' },
      blush: { color: 'rgba(246,165,155,0.55)', x: 0.66, y: -0.18, r: 30 },
      whiskers: { color: '#B5A594', n: 2, len: 0.42, r: 0.005, y: -0.2, x: 0.5, spread: 0.12, droop: 0.03, curve: 0.04 },
      ears: { x: 0.8, y: 0.56, z: -0.08, tilt: 0.5, yaw: 0.22, pitch: -0.08, size: [0.58, 0.68, 0.19], sharp: 0.97, fur: false, innerScale: 1.08, tuft: false,
        color: M('#C2A688'), inner: M('#F5CDBF'), tuft: CREAM },
      bib: false,
      robe: { profile: PROFILE, color: '#FFFFFF', ink: '#9DB4A6', lining: PALE_G, hemY: 0.9, paint: paintRobe },
      collar: false,                // flat lapel bands are built in build()
      arms: {
        L: { hand: [-1.24, 3.0, 0.64], path: [[-0.5, 2.62, 0.0], [-1.68, 2.22, 0.12], [-1.36, 2.74, 0.5]], pawScale: 2.1, wrist: false },
        R: { hand: [1.22, 2.26, 1.28], path: [[0.5, 2.68, 0.0], [1.36, 2.2, 0.36], [1.16, 2.22, 1.08]], pawScale: 1.85, wrist: false }
      },
      sleeves: false,              // custom gravity-draped Hanfu sleeves are built in build()
      belt: { yT: 2.16, yB: 1.92, color: BELT, line: GOLD, knot: false, tassel: false, ink: BELT_D },
      feet: false,
      tail: {
        pts: TAIL, r: 0.26, ink: INK,
        shape: t => t < 0.86 ? 0.86 + 0.14 * Math.sin(Math.PI * Math.min(1, t / 0.8)) : 0.92 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.86) / 0.14, 2))) + 0.04,
        paint: (g, w, h) => {
          g.fillStyle = M('#D2BCA4'); g.fillRect(0, 0, w, h);
          // cream underside near the root
          const cg = g.createLinearGradient(0, 0, w * 0.4, 0);
          cg.addColorStop(0, 'rgba(250,242,230,1)'); cg.addColorStop(0.7, 'rgba(250,242,230,0.85)'); cg.addColorStop(1, 'rgba(250,242,230,0)');
          g.fillStyle = cg; g.fillRect(0, h * 0.5, w * 0.4, h * 0.5);
          // dark rings
          g.filter = 'blur(6px)';
          for (let i = 0; i < 8; i++) { const x = 80 + i * 112; g.fillStyle = 'rgba(122,100,82,0.9)'; g.fillRect(x, -4, 48 + i * 2, h + 8); }
          g.filter = 'none';
        },
        fur: { layers: 14, length: 0.09, gravity: 0.02, repeat: [12, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, sphere, tube, ribbon, lathe, extrude, leafGeo, dropGeo, medal, tassel, D,
        head, body, decor, onRobe, robeR, curve3 } = K;
      const DS = THREE.DoubleSide;
      const mGold = std(GOLD, { roughness: 0.5, metalness: 0.12 });
      const mCream = std(CREAM, { roughness: 0.95 });
      const mLeaf = std(LEAF, { roughness: 0.75, side: DS });
      const mLeafD = std(M('#9DB570'), { roughness: 0.75, side: DS });
      const mBlue = std(BLUE, { roughness: 0.8, side: DS });
      const mRice = std(RICE, { roughness: 0.6 });
      const mStem = std(STEM, { roughness: 0.8 });
      const Vn = (a) => V(a[0], a[1], a[2]);

      K.headG.rotation.y = -0.09;      // face turned a little toward image-left, as drawn
      // flat picture-book light on the head: a little self-illumination from its own map lifts the shaded cream chin
      { const hm = K.headMesh.material.clone(); hm.emissive = new THREE.Color('#FFFFFF'); hm.emissiveMap = hm.map; hm.emissiveIntensity = 0.28; K.headMesh.material = hm; }

      /* ---------------- hem: long in front, lifted at the sides and back (as the picture's curved hem) ---------------- */
      {
        const pa = K.robeMesh.geometry.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
          const c = Math.max(0, z / (Math.hypot(x, z) || 1)), w = 1 - Math.min(Math.max((y - 0.3) / 1.0, 0), 1);
          pa.setY(i, y + 0.3 * Math.pow(1 - c, 1.3) * w * w);
        }
        pa.needsUpdate = true; K.robeMesh.geometry.computeVertexNormals();
      }

      /* ---------------- finger grooves on the two front paws ---------------- */
      [['L', 2.1, [1, 0.88, 0.95]], ['R', 1.85, [1, 0.88, 0.95]]].forEach(([k, ps, sc]) => {
        const c = K.hands[k].p, r = 0.12 * ps, mG = std(CINK, { roughness: 0.9 });
        [-0.3, 0.3].forEach(f => {
          const pts = [];
          for (let i = 0; i <= 8; i++) {
            const a = -0.25 + 0.95 * i / 8, x = f * r * sc[0], y = r * sc[1] * Math.sin(a), zz = Math.sqrt(Math.max(r * r - x * x - (y / sc[1]) * (y / sc[1]) * 0, 0));
            pts.push([c.x + x, c.y + y * 0.9, c.z + Math.cos(a) * Math.sqrt(Math.max(r * r - x * x, 0)) * sc[2] + 0.006]);
          }
          mesh(tube(pts, t => 0.011 * Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.9)), 16, 6), mG, K.poseG);
        });
      });

      /* ---------------- white ear tufts at the inner base of each ear ---------------- */
      K.ears.forEach(({ g: eg, sx }) => {
        const ey = 0.68, ez = 0.19, tm = std(M('#FFFBF4'), { roughness: 0.95 });
        [[-0.17, 0.16, 0.42, 0.95], [-0.13, 0.18, 0.48, 0.65], [-0.09, 0.19, 0.44, 0.38], [-0.05, 0.18, 0.34, 0.12], [-0.2, 0.14, 0.32, 1.25]].forEach(([dx, y, L, rot]) => {
          const m = mesh(K.earGeo(0.98), tm, eg, [dx * sx, ey * y, ez * 0.78], [0.06, L * 0.62, 0.035]);
          m.rotation.z = -rot * sx;
        });
      });

      /* ---------------- eye highlights: one big glint each, upper-inner ---------------- */
      K.eyes.forEach((eg, i) => {
        const sx = i === 0 ? -1 : 1;
        const inner = eg.children[0];
        const a = mesh(sphere(0.05, 20, 14), K.M.shine, inner, [-sx * 0.035 + 0.012, 0.055, 0.058], [1, 1, 0.45]); a.castShadow = false;
        const b = mesh(sphere(0.02, 12, 10), K.M.shine, inner, [sx * 0.05, -0.06, 0.06], [1, 1, 0.45]); b.castShadow = false;
      });

      /* ---------------- Hanfu wide sleeves: the lower half of every ring is pulled straight down (gravity) ---------------- */
      const sleeveTex = K.canvasTex(1024, 512, (g, w, h) => paintSleeve(g, w, h, D));
      const liningTex = K.canvasTex(1024, 512, (g, w, h) => paintLining(g, w, h, D));
      const DOWN = V(0, -1, 0);
      const buildSleeve = (hand, o) => {
        const path = hand.path, segT = 72, segA = 56, pos = [], uvs = [], idx = [], ring = [];
        const fb0 = V(o.fallback[0], o.fallback[1], o.fallback[2]);
        for (let i = 0; i <= segT; i++) {
          const t = i / segT, C = path.getPointAt(t), T = path.getTangentAt(t);
          const g0 = DOWN.clone().addScaledVector(T, -T.dot(DOWN)), fb = fb0.clone().addScaledVector(T, -T.dot(fb0)).normalize();
          const wgt = Math.min(1, g0.length() / 0.6);
          const gdir = g0.normalize().multiplyScalar(wgt).addScaledVector(fb, 1 - wgt).normalize();
          const u = gdir.clone().negate(), side = T.clone().cross(u).normalize();
          const r = o.r0 + (o.r1 - o.r0) * THREE.MathUtils.smoothstep(t, 0, 0.5);
          const drop = o.drop * THREE.MathUtils.smoothstep(t, 0.02, 0.55) * (o.keep + (1 - o.keep) * (1 - THREE.MathUtils.smoothstep(t, 0.8, 1)));
          for (let j = 0; j <= segA; j++) {
            const a = j / segA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            const P = C.clone().addScaledVector(side, r * ca * (sa < 0 ? 1 + o.flare * (-sa) * t : 1)).addScaledVector(u, r * sa * (sa < 0 ? 0.6 : 1));
            if (sa < 0) P.addScaledVector(DOWN, drop * Math.pow(-sa, 0.85));
            // rest on the robe: push anything inside the skirt back out to its surface
            const rr = Math.hypot(P.x, P.z), lim = robeR(P.y) + 0.05;
            if (o.rest && P.y < 2.3 && rr < lim) { P.x *= lim / rr; P.z *= lim / rr; }
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
        const m = mesh(geo, K.texMat(sleeveTex, { roughness: 0.85 }), K.robeG, null, null, SAGE_INK);
        const ln = new THREE.Mesh(geo, K.texMat(liningTex, { roughness: 0.9, side: THREE.BackSide })); ln.receiveShadow = true; K.robeG.add(ln);
        // opening border: gold · rain-blue · gold
        const cen = ring.reduce((a, p) => a.add(p), V()).multiplyScalar(1 / ring.length);
        mesh(tube(ring, 0.026, 160, 8, true), mGold, K.robeG, null, null, GOLD_D);
        mesh(tube(ring.map(p => p.clone().lerp(cen, 0.045)), 0.034, 160, 8, true), std(BLUE, { roughness: 0.75 }), K.robeG, null, null, BLUE_D);
        mesh(tube(ring.map(p => p.clone().lerp(cen, 0.1)), 0.02, 160, 6, true), mGold, K.robeG);
        return m;
      };
      buildSleeve(K.hands.L, { r0: 0.2, r1: 0.33, drop: 0.8, keep: 0.85, flare: 0.35, fallback: [-1, 0, 0.1] });
      buildSleeve(K.hands.R, { r0: 0.2, r1: 0.34, drop: 1.25, keep: 1.0, flare: 0.3, fallback: [1, 0, 0], rest: true });

      /* ---------------- cross collar: cream under-collar + green lapels with gold piping (右衽) ---------------- */
      const lapelBand = (list, w, off, color) => {
        const pts = list.map(([d, y]) => onRobe(d, y, off));
        const face = V(0, 0.25, 1);
        mesh(ribbon(pts, w, { face: [face.x, face.y, face.z], segs: 40 }), std(color, { roughness: 0.8, side: DS }), K.robeG);
        const cv = curve3(pts), eL = [], eR = [];
        for (let i = 0; i <= 30; i++) {
          const t = i / 30, p = cv.getPointAt(t), T = cv.getTangentAt(t), sd = T.clone().cross(face).normalize();
          eL.push(p.clone().addScaledVector(sd, -w / 2)); eR.push(p.clone().addScaledVector(sd, w / 2));
        }
        mesh(tube(eL, 0.012, 40, 6), mGold, K.robeG); mesh(tube(eR, 0.012, 40, 6), mGold, K.robeG);
      };
      lapelBand([[-62, 2.86], [-40, 2.78], [-18, 2.6], [-2, 2.44]], 0.15, 0.03, M('#BACB98', 1.2));
      lapelBand([[62, 2.86], [40, 2.78], [14, 2.58], [-12, 2.38], [-26, 2.28]], 0.17, 0.05, M('#BACB98', 1.2));

      /* ---------------- belt: gold stripe, flower clasp, beads, tassel ---------------- */
      const beltG = K.beltG;
      { const r = mesh(new THREE.TorusGeometry(robeR(2.04) + 0.036, 0.018, 8, 128), mGold, beltG, [0, 2.04, 0]); r.rotation.x = Math.PI / 2; }
      medal(beltG, [0, 2.04, robeR(2.04) + 0.08], 0.17, (g) => {
        g.fillStyle = '#E8C97F'; g.strokeStyle = GOLD_D; g.lineWidth = 7;
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.beginPath(); g.arc(128 + Math.cos(a) * 42, 128 + Math.sin(a) * 42, 40, 0, Math.PI * 2); g.fill(); g.stroke(); }
        g.beginPath(); g.arc(128, 128, 18, 0, Math.PI * 2); g.fillStyle = '#F4DCA0'; g.fill(); g.stroke();
      }, GOLD, GOLD_D, M('#F2D696'));
      const cordPts = [onRobe(0, 1.9, 0.05), onRobe(0, 1.7, 0.06), onRobe(0, 1.5, 0.07), onRobe(0, 1.36, 0.07)];
      mesh(tube(cordPts, 0.014, 20, 6), mGold, beltG);
      mesh(sphere(0.07, 24, 16), mGold, beltG, onRobe(0, 1.68, 0.1), null, GOLD_D);
      mesh(sphere(0.085, 24, 16), mGold, beltG, onRobe(0, 1.47, 0.11), null, GOLD_D);
      const ts = tassel(beltG, onRobe(0, 1.35, 0.11), TEAL, 0.3, 0.06, TEAL_D);
      ts.rotation.x = -0.4;
      K.onTick((t, k) => { ts.rotation.z = 0.08 * Math.sin(t * 1.7) * k; });

      // flat fabric bow loop: rounded petal pointing along angle a (in the parent's xy plane)
      const petalGeo = (L, W) => {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0); sh.bezierCurveTo(L * 0.25, W * 1.1, L * 1.02, W * 1.25, L, 0); sh.bezierCurveTo(L * 1.02, -W * 1.25, L * 0.25, -W * 1.1, 0, 0);
        return extrude(sh, 0.035, 0.012, 3, 24);
      };
      const bowLoop = (parent, a, L, W, mat) => { const m = mesh(petalGeo(L, W), mat || mBlue, parent, null, null, BLUE_D); m.rotation.z = a; return m; };

      /* ---------------- rain-blue shoulder sashes ending in bows on two gold balls ---------------- */
      const sash = part('sash', body);
      [-1, 1].forEach(sx => {
        const ball = onRobe(34 * sx, 2.2, 0.07);
        const pts = [[0.4 * sx, 2.3, -0.62], [0.56 * sx, 2.64, -0.42], [0.66 * sx, 2.8, 0.0], [0.64 * sx, 2.66, 0.38], [ball.x * 1.12, 2.44, 0.6], [ball.x, ball.y + 0.04, ball.z]].map(Vn);
        mesh(ribbon(pts, t => 0.25 - 0.05 * t, { face: [0, 1, 1], segs: 60 }), mBlue, sash, null, null, BLUE_D);
        mesh(sphere(0.085, 24, 16), mGold, sash, ball, null, GOLD_D);
        const bw = group(sash, ball.clone().add(V(0, 0, -0.02)), [0, 0.5 * sx, 0]);
        bowLoop(bw, sx > 0 ? -0.75 : Math.PI + 0.75, 0.25, 0.085);
        bowLoop(bw, sx > 0 ? -1.45 : Math.PI + 1.45, 0.22, 0.07);
        // hanging tails hugging the skirt (the image-right one is long)
        const d0 = 34 * sx;
        const tail1 = sx < 0
          ? [onRobe(d0, 2.2, 0.07), onRobe(d0 - 6, 1.95, 0.07), onRobe(d0 - 12, 1.62, 0.07)]
          : [onRobe(d0, 2.2, 0.07), onRobe(d0 + 4, 1.85, 0.07), onRobe(d0 + 4, 1.4, 0.07), onRobe(d0 + 2, 0.95, 0.07)];
        const tail2 = [onRobe(d0 + 3 * sx, 2.2, 0.08), onRobe(d0 + 8 * sx, 1.98, 0.08), onRobe(d0 + 14 * sx, 1.74, 0.08)];
        [tail1, tail2].forEach(tp => mesh(ribbon(tp, t => 0.13 * (1 - 0.25 * t), { face: [Math.sin(d0 * Math.PI / 180), 0.3, Math.cos(d0 * Math.PI / 180)], segs: 30 }), mBlue, sash, null, null, BLUE_D));
      });
      // gold ribbon hanging left of the tassel, pointed end + little diamond
      {
        const x = -0.42, dAt = y => Math.asin(x / robeR(y)) * 180 / Math.PI;
        const pts = [1.96, 1.7, 1.4, 1.02].map(y => onRobe(dAt(y), y, 0.06));
        mesh(ribbon(pts, t => 0.2 * (t < 0.86 ? 1 : Math.max(0.02, (1 - t) / 0.14)), { face: [-0.3, 0.3, 1], segs: 40 }), std(M('#F8DFA1'), { roughness: 0.7, side: DS }), sash, null, null, GOLD_D);
        const dp = onRobe(dAt(1.2), 1.2, 0.075);
        const dm = mesh(extrude([[0, 0.06], [0.035, 0], [0, -0.06], [-0.035, 0]], 0.01, 0.003), std(M('#FFF4D6'), { roughness: 0.6 }), sash, dp);
        dm.rotation.y = dAt(1.2) * Math.PI / 180; dm.rotation.x = -0.45;
      }

      /* ---------------- headgear: band, gold scroll crown, water-drop crystal, leaves, rice ear, streamers ---------------- */
      const hat = part('hat', head);
      const HR = [1.0, 0.87, 0.9];
      const onHead = (latDeg, phiDeg, off) => {   // same shape as head.deform (upper half stretched)
        const L = latDeg * Math.PI / 180, F = phiDeg * Math.PI / 180, ox = Math.cos(L) * Math.sin(F), oy = Math.sin(L), oz = Math.cos(L) * Math.cos(F);
        const t = Math.min(Math.max((oy - 0.1) / 0.7, 0), 1), kx = 1 + 0.07 * t * t * (3 - 2 * t), ky = 1 + CROWN * Math.max(0, oy);
        return V(ox * (HR[0] * kx + off), HY + oy * (HR[1] * ky + off), oz * (HR[2] + off));
      };
      const lat0 = ph => 50 + 14 * (1 - Math.cos(ph * Math.PI / 180)) / 2, BW = 9;
      {
        const n = 120, pos = [], uv = [], idx = [];
        for (let i = 0; i <= n; i++) {
          const ph = -180 + 360 * i / n;
          [0, BW].forEach((dl, j) => { const p = onHead(lat0(ph) + dl, ph, j ? 0.1 : 0.07); pos.push(p.x, p.y, p.z); uv.push(i / n, j); });
          if (i < n) { const q = i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
        }
        const bg = new THREE.BufferGeometry();
        bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        bg.setIndex(idx); bg.computeVertexNormals();
        mesh(bg, std(M('#A9BC8E'), { roughness: 0.75, side: DS }), hat);
        const edge = (dl, off, r, c) => { const pts = []; for (let i = 0; i < 90; i++) { const ph = i * 4; pts.push(onHead(lat0(ph) + dl, ph, off)); } mesh(tube(pts, r, 180, 6, true), std(c, { roughness: 0.7 }), hat); };
        edge(0, 0.075, 0.022, SAGE_INK); edge(BW, 0.105, 0.02, SAGE_INK);
        edge(BW + 3, 0.06, 0.035, TEAL);   // teal under-band peeking above
      }
      const front = group(hat, onHead(lat0(0) + 3, 0, 0.12));
      front.rotation.x = -0.35;
      // central plaque + blue gem
      mesh(extrude(K.roundRectShape(0.44, 0.15, 0.07), 0.06, 0.02), mGold, front, [0, 0.05, 0.03], null, GOLD_D);
      mesh(new THREE.TorusGeometry(0.085, 0.024, 10, 28), mGold, front, [0, 0.0, 0.08], null, GOLD_D);
      mesh(sphere(0.07, 24, 16), std(M('#AFC8DC'), { roughness: 0.2, metalness: 0.1 }), front, [0, 0.0, 0.08], [1, 1, 0.7], '#7FA3BF');
      // gold scroll curls (two per side)
      const spiral = (cx, cy, cz, r0, turns, dir) => {
        const pts = [];
        for (let i = 0; i <= 44; i++) { const t = i / 44, a = dir * (Math.PI * 0.55 + t * turns * Math.PI * 2), r = r0 * (1 - 0.8 * t); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz]); }
        mesh(tube(pts, t => 0.027 * (1 - 0.35 * t), 64, 8), mGold, front, null, null, GOLD_D);
      };
      [-1, 1].forEach(sx => {
        spiral(0.27 * sx, 0.15, 0.0, 0.12, 1.35, sx);
        spiral(0.48 * sx, 0.07, -0.13, 0.105, 1.3, sx);
        mesh(sphere(0.12, 22, 16), mGold, front, [0.27 * sx, 0.15, -0.05], [1, 1, 0.45], GOLD_D);
        mesh(sphere(0.105, 22, 16), mGold, front, [0.48 * sx, 0.07, -0.18], [1, 1, 0.45], GOLD_D);
      });
      // leaves either side of the crystal
      const bigLeaf = leafGeo(0.7, 0.3);
      const lfL = mesh(bigLeaf, mLeaf, front, [-0.12, 0.16, -0.08], null, LEAF_D); lfL.rotation.set(0, 0.2, 0.95);
      const lfR = mesh(bigLeaf, mLeaf, front, [0.14, 0.14, -0.08], null, LEAF_D); lfR.rotation.set(0, -0.2, -1.15);
      [lfL, lfR].forEach(l => mesh(tube([[0, 0.02, 0.003], [0, 0.28, 0.006], [0, 0.5, 0.003]], 0.006, 12, 4), std(LEAF_D), l));
      // water-drop crystal
      const dropM = std(M('#CFE8EF'), { roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.93, emissive: new THREE.Color('#9FC9DA'), emissiveIntensity: 0.15 });
      const dropG = group(front, [0, 0.42, -0.02]);
      mesh(dropGeo(0.66, 0.3, 1.9, 48), dropM, dropG, null, [1, 1, 0.8], '#86B3C8');
      mesh(sphere(0.06, 16, 12), K.M.shine, dropG, [-0.1, -0.02, 0.2], [0.7, 1.5, 0.4]).castShadow = false;
      mesh(sphere(0.03, 12, 10), K.M.shine, dropG, [0.09, -0.12, 0.2], [1, 1, 0.4]).castShadow = false;
      // golden rice ear rising behind the right scrolls
      const gGeoBase = new THREE.SphereGeometry(1, 10, 8);
      const riceEar = (parent, pts, n, s, from) => {
        const cv = curve3(pts);
        mesh(tube(cv, 0.013 * Math.max(1, s * 0.8), 40, 6), mStem, parent);
        const gGeo = gGeoBase.clone(); gGeo.scale(0.03 * s, 0.066 * s, 0.027 * s);
        for (let i = 0; i < n; i++) {
          const t = Math.min(from + (1 - from) * i / (n - 1), 0.97), p = cv.getPointAt(t), T = cv.getTangentAt(t);
          const side = T.clone().cross(V(0, 0, 1)).normalize();
          [-1, 1].forEach(k => {
            const dir = T.clone().addScaledVector(side, k * 0.62).normalize();
            const gm = mesh(gGeo, mRice, parent, p.clone().addScaledVector(side, k * 0.03 * s).addScaledVector(dir, 0.045 * s), null, RICE_D);
            gm.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
          });
        }
        const tip = mesh(gGeo, mRice, parent, cv.getPointAt(1), null, RICE_D);
        tip.quaternion.setFromUnitVectors(V(0, 1, 0), cv.getTangentAt(1));
      };
      const nFront = front.children.length;
      riceEar(front, [[0.22, 0.1, -0.12], [0.3, 0.36, -0.12], [0.4, 0.6, -0.12], [0.54, 0.74, -0.1], [0.7, 0.7, -0.08], [0.8, 0.54, -0.07]], 7, 0.95, 0.4);
      front.children.slice(nFront).forEach(m => { m.castShadow = false; });   // no grain-shadow blotches on the right ear
      [lfL, lfR].forEach(m => { m.castShadow = false; });
      // teal streamers flowing from the back-right of the band, behind the image-right ear
      const strG = group(hat, onHead(62, 112, 0.06));
      mesh(ribbon([[0, 0, 0], [0.36, -0.1, -0.12], [0.66, -0.3, -0.04], [0.92, -0.52, 0.06], [1.12, -0.74, 0.14]], t => 0.22 * (1 - 0.2 * t), { face: [0, 0.3, 1], twist: t => 0.45 * t, segs: 48 }),
        std(TEAL, { roughness: 0.75, side: DS }), strG, null, null, TEAL_D);
      mesh(ribbon([[0, -0.02, -0.02], [0.3, -0.24, -0.16], [0.52, -0.56, -0.1], [0.66, -0.84, 0.0], [0.76, -1.02, 0.06]], t => 0.17 * (1 - 0.3 * t), { face: [0, 0.2, 1], twist: t => -0.35 * t, segs: 48 }),
        std(M('#CFE0C4'), { roughness: 0.75, side: DS }), strG, null, null, TEAL_D);
      K.onTick((t, k) => { strG.rotation.z = 0.06 * Math.sin(t * 1.4) * k; strG.rotation.y = 0.08 * Math.sin(t * 1.1 + 1) * k; });

      /* ---------------- raised image-left arm: a cream forearm from inside the sleeve up through the cuff into the paw ---------------- */
      {
        const hL = K.hands.L, pts = [];
        for (let i = 0; i <= 6; i++) pts.push(hL.path.getPointAt(i / 6));
        pts.push(hL.p.clone().add(V(0, -0.04, -0.02)));
        mesh(tube(pts, t => 0.1 + 0.075 * THREE.MathUtils.smoothstep(t, 0.55, 0.9), 64, 20), std(CREAM, { roughness: 0.95 }), K.poseG, null, null, CINK);
      }

      /* ---------------- tail root: the engine's small root ball sits hollow inside the tube; widen it into an end cap ---------------- */
      K.tailG.children.forEach(m => { if (m.isMesh && m.geometry.type === 'SphereGeometry' && m.position.lengthSq() < 1e-8) m.scale.setScalar(0.224 / (0.26 * 0.53)); });

      /* ---------------- rice sheaf in the image-left paw ---------------- */
      riceG = part('rice', body);
      riceG.position.copy(K.hands.L.p);
      const sheaf = group(riceG, [0, 0, 0.05]);
      // stems gathered in the paw, cut ends below
      for (let i = 0; i < 7; i++) {
        const dx = (i - 3) * 0.02, dz = ((i % 3) - 1) * 0.02;
        mesh(tube([[0.3 + dx, -0.78, dz], [0.14 + dx * 0.6, -0.36, dz], [dx * 0.3, 0.05, dz * 0.5], [-0.02 + dx, 0.3, dz]], 0.02, 24, 6), mStem, sheaf);
      }
      const bladeMat = K.texMat(K.canvasTex(64, 16, (g, w, h) => {
        const lg = g.createLinearGradient(0, 0, w, 0);
        lg.addColorStop(0, M('#9CBE7C')); lg.addColorStop(0.45, M('#B2CF91')); lg.addColorStop(0.5, M('#86A868')); lg.addColorStop(0.55, M('#B2CF91')); lg.addColorStop(1, M('#9CBE7C'));
        g.fillStyle = lg; g.fillRect(0, 0, w, h);
      }), { roughness: 0.75, side: DS });
      const blade = (pts, W, twist) => mesh(ribbon(pts, t => W * Math.min(1, 0.45 + t * 2.4) * Math.pow(1 - t, 0.7) + 0.004, { face: [0, 0, 1], twist: twist ? (t => twist * t) : null, segs: 40 }), bladeMat, sheaf, null, null, LEAF_D);
      blade([[0, 0.1, 0.02], [0.03, 0.6, 0.05], [0.05, 1.12, 0.02]], 0.2, 0.25);
      blade([[0.02, 0.1, 0.03], [0.22, 0.56, 0.07], [0.5, 1.02, 0.03]], 0.2, -0.35);
      blade([[0.03, 0.08, 0.06], [0.24, 0.34, 0.1], [0.44, 0.56, 0.08]], 0.15, 0.2);
      blade([[-0.02, 0.12, 0.02], [-0.5, 0.42, 0.06], [-0.94, 0.3, 0.06], [-1.22, 0.1, 0.04]], 0.2, 0.45);
      blade([[-0.02, 0.06, 0.05], [-0.38, 0.06, 0.1], [-0.76, -0.16, 0.1]], 0.18, -0.3);
      blade([[-0.02, 0.12, -0.05], [-0.16, 0.62, -0.07], [-0.3, 1.0, -0.07]], 0.18, 0.3);
      // three drooping golden panicles
      const stalk = (pts) => mesh(tube(pts, 0.016, 30, 6), mStem, sheaf);
      stalk([[-0.01, 0.15, 0], [-0.12, 0.72, 0], [-0.3, 1.02, -0.02]]);
      riceEar(sheaf, [[-0.3, 1.02, -0.02], [-0.62, 1.08, 0.0], [-0.94, 0.92, 0.02], [-1.16, 0.56, 0.04]], 10, 1.1, 0.14);
      stalk([[0, 0.15, 0.04], [-0.14, 0.52, 0.06], [-0.32, 0.74, 0.08]]);
      riceEar(sheaf, [[-0.32, 0.74, 0.08], [-0.56, 0.78, 0.1], [-0.8, 0.64, 0.12], [-0.92, 0.44, 0.12]], 8, 1.05, 0.14);
      stalk([[0.01, 0.12, 0.08], [-0.16, 0.36, 0.12], [-0.36, 0.42, 0.15]]);
      riceEar(sheaf, [[-0.36, 0.42, 0.15], [-0.58, 0.42, 0.16], [-0.8, 0.3, 0.17], [-0.9, 0.16, 0.17]], 7, 1.0, 0.14);

      /* ---------------- celadon bowl of rain water in the image-right paw ---------------- */
      bowlG = part('bowl', body);
      bowlG.position.set(0.94, 2.16, 0.92);
      bowlG.rotation.set(0.22, 0, -0.1);
      const bowlTex = K.canvasTex(512, 128, (g, w, h) => {
        g.fillStyle = CELADON; g.fillRect(0, 0, w, h);
        g.fillStyle = M('#EFECDA'); g.fillRect(0, h * 0.34, w, h * 0.36);
        g.strokeStyle = M('#8DB5A4'); g.lineWidth = 4;
        for (let x = 0; x < w; x += 64) {
          g.beginPath(); g.ellipse(x + 32, h * 0.52, 14, 9, 0, 0, Math.PI * 2); g.stroke();
          g.beginPath(); g.arc(x + 32, h * 0.52, 3, 0, Math.PI * 2); g.fillStyle = M('#9DC0B1'); g.fill();
          g.beginPath(); g.moveTo(x + 46, h * 0.52); g.bezierCurveTo(x + 56, h * 0.36, x + 64, h * 0.68, x + 82, h * 0.52); g.stroke();
        }
        g.fillStyle = M('#A6C8B9'); g.fillRect(0, h * 0.34, w, 3); g.fillRect(0, h * 0.7, w, 3);
      });
      bowlTex.wrapS = THREE.RepeatWrapping;
      const outer = lathe([[0.24, 0.0], [0.3, 0.04], [0.43, 0.12], [0.53, 0.24], [0.58, 0.37], [0.6, 0.5]], 72);
      mesh(outer.geo, K.texMat(bowlTex, { roughness: 0.45, side: DS }), bowlG, null, null, CELADON_D);
      mesh(lathe([[0.565, 0.5], [0.54, 0.38], [0.47, 0.25], [0.34, 0.14], [0.02, 0.09]], 72).geo, std(M('#C6DED3'), { roughness: 0.4, side: DS }), bowlG);
      const rim = mesh(new THREE.TorusGeometry(0.585, 0.036, 12, 96), mGold, bowlG, [0, 0.5, 0], null, GOLD_D); rim.rotation.x = Math.PI / 2;
      const foot = mesh(new THREE.TorusGeometry(0.24, 0.025, 10, 48), mGold, bowlG, [0, 0.02, 0], null, GOLD_D); foot.rotation.x = Math.PI / 2;
      mesh(sphere(0.06, 20, 14), mGold, bowlG, [-0.52, 0.56, -0.26], null, GOLD_D);
      const waterTex = K.canvasTex(256, 256, (g) => {
        g.fillStyle = WATER; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 5; g.lineCap = 'round';
        [[128, 128, 40], [120, 132, 78], [140, 120, 108]].forEach(([x, y, r], i) => { g.beginPath(); g.arc(x, y, r, 0.3 + i, 2.2 + i); g.stroke(); });
      });
      const water = mesh(new THREE.CircleGeometry(0.54, 48), K.texMat(waterTex, { roughness: 0.15, transparent: true, opacity: 0.92 }), bowlG, [0, 0.45, 0]);
      water.rotation.x = -Math.PI / 2;
      // spilling stream over the image-right rim + drops (authored in body coordinates)
      bowlG.updateMatrixWorld(true); body.updateMatrixWorld(true);
      const lip = bowlG.localToWorld(V(0.56, 0.5, 0.14)).sub(body.getWorldPosition(V()));
      const mWater = std(M('#B4D9E6'), { roughness: 0.12, transparent: true, opacity: 0.88, emissive: new THREE.Color('#A8D2E0'), emissiveIntensity: 0.15 });
      const streamPts = [lip.clone().add(V(-0.14, -0.02, 0)), lip.clone().add(V(0.05, 0.03, 0.02)), lip.clone().add(V(0.13, -0.2, 0.05)), lip.clone().add(V(0.16, -0.5, 0.07)), lip.clone().add(V(0.17, -0.66, 0.07))];
      const spillG = group(bowlG); spillG.applyMatrix4(bowlG.matrix.clone().invert());
      mesh(tube(streamPts, t => 0.075 * (1 - 0.5 * t), 40, 10), mWater, spillG, [0, 0, 0], [1, 1, 1], '#8FBFD1');
      mesh(tube(streamPts.map(p => p.clone().add(V(-0.03, 0, 0.05))), t => 0.018 * (1 - 0.6 * t), 40, 6), K.M.shine, spillG);
      // a drip forming at the end of the stream (tip merges into the stream, so it reads as part of the pour)
      const dG = group(spillG, lip.clone().add(V(0.17, -0.755, 0.07)), [0, 0, 0]);
      mesh(dropGeo(0.16, 0.05, 1.6, 24), mWater, dG, null, null, '#8FBFD1');

      /* ---------------- feet: stubby cream legs peeking out under the hem ---------------- */
      const PAW = [[0.001, 0], [0.28, 0], [0.36, 0.04], [0.4, 0.14], [0.39, 0.28], [0.33, 0.44], [0.2, 0.56], [0.001, 0.6]];
      const pawR = y => { for (let i = 0; i < PAW.length - 1; i++) { const [r0, y0] = PAW[i], [r1, y1] = PAW[i + 1]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0 || 1); } return 0; };
      const pawGeo = lathe(PAW, 48).geo;
      const mToe = std(CINK, { roughness: 0.9 });
      [-1, 1].forEach(sx => {
        const x = 0.56 * sx, zc = 1.24, ZS = 1.1;
        mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.9, 24), mCream, K.poseG, [x, 0.7, 0.8]);
        mesh(pawGeo, mCream, K.poseG, [x, 0, zc], [0.92, 0.9, ZS * 0.92], CINK);
        [-0.11, 0.11].forEach(dx => {
          const pts = [];
          for (let i = 0; i <= 8; i++) {
            const y = 0.34 - i * 0.035, r = pawR(y), xx = dx * (1 + 0.15 * i / 8);
            pts.push([x + xx, y, zc + ZS * Math.sqrt(Math.max(r * r - xx * xx, 0)) + 0.004]);
          }
          mesh(tube(pts, t => 0.012 * Math.sin(Math.PI * Math.min(1, 0.15 + t)), 16, 6), mToe, K.poseG);
        });
      });

      /* ---------------- tail ornament: gold bell, blue bow and leaves ---------------- */
      const bellG = part('tail', K.tailG);   // same chip as the tail
      const root = Vn(TAIL[0]);
      const bellPos = V(1.86, 1.12, -0.16).sub(root);     // on the front of the tail's lower bend
      const bell = group(bellG, bellPos); bell.scale.setScalar(1.35);
      mesh(sphere(0.13, 28, 20), mGold, bell, null, null, GOLD_D);
      const groove = mesh(new THREE.TorusGeometry(0.128, 0.012, 8, 40), std(GOLD_D, { roughness: 0.5 }), bell, [0, -0.01, 0]); groove.rotation.x = Math.PI / 2;
      medal(bell, [0, 0.0, 0.11], 0.075, (g) => {
        g.fillStyle = '#C99B45';
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.arc(128 + Math.cos(a) * 44, 128 + Math.sin(a) * 44, 38, 0, Math.PI * 2); g.fill(); }
      }, GOLD, GOLD_D, GOLD);
      bowLoop(bell, Math.PI - 0.55, 0.3, 0.1);
      bowLoop(bell, Math.PI + 0.5, 0.24, 0.085);
      mesh(ribbon([[-0.04, -0.08, 0.02], [-0.06, -0.3, 0.06], [-0.02, -0.56, 0.08]], 0.12, { face: [0, 0, 1] }), mBlue, bell, null, null, BLUE_D);
      mesh(ribbon([[0.05, -0.08, 0.02], [0.14, -0.3, 0.04], [0.22, -0.54, 0.05]], 0.11, { face: [0, 0, 1] }), mBlue, bell, null, null, BLUE_D);
      const tl1 = mesh(leafGeo(0.34, 0.13), mLeaf, bell, [0.06, 0.06, 0.02], null, LEAF_D); tl1.rotation.z = -0.7;
      const tl2 = mesh(leafGeo(0.3, 0.12), mLeafD, bell, [0.08, 0.02, 0.03], null, LEAF_D); tl2.rotation.z = -1.45;
      const tl3 = mesh(leafGeo(0.36, 0.09), mLeafD, bell, [-0.02, -0.08, 0.05], null, LEAF_D); tl3.rotation.z = Math.PI - 0.15;

      /* ---------------- decorations (雨滴、水紋、花瓣、新芽、浮萍) ---------------- */
      const items = [];
      const dropC = M('#A9D3EA');
      items.push(K.drop(decor, [1.75, 4.65, 0.3], 0.55, dropC));
      items.push(K.drop(decor, [2.55, 3.55, 0.3], 0.44, dropC));
      items.push(K.drop(decor, [-2.2, 2.4, 0.55], 0.38, dropC));
      items.push(K.drop(decor, [2.95, 0.85, 0.5], 0.4, dropC));
      items.push(K.drop(decor, [-2.55, 1.55, 0.3], 0.3, dropC));
      const mSwirl = std(M('#B7DBEC'), { roughness: 0.25, side: DS, transparent: true, opacity: 0.88, emissive: new THREE.Color('#9CCBE0'), emissiveIntensity: 0.12 });
      const swirl = (pos, pts, w) => { const g = group(decor, pos); mesh(ribbon(pts, t => w * (0.3 + 0.7 * Math.sin(Math.PI * t)), { face: [0, 0, 1], segs: 72 }), mSwirl, g); return g; };
      items.push(swirl([2.3, 3.95, 0.1], [[-0.45, -0.62, 0], [-0.2, -0.2, 0], [0.25, 0.18, 0], [0.7, 0.2, 0], [0.82, -0.12, 0], [0.55, -0.38, 0], [0.25, -0.3, 0]], 0.2));
      items.push(swirl([-2.4, 1.05, 0.4], [[0.55, 0.62, 0], [0.12, 0.6, 0], [-0.12, 0.3, 0], [0.2, -0.05, 0], [0.2, -0.45, 0], [-0.25, -0.6, 0], [-0.6, -0.45, 0]], 0.18));
      items.push(K.flower(decor, [2.05, 3.0, 0.5], 0.55, M('#F4B9B4'), M('#F2C94C')));
      {
        const g = group(decor, [2.75, 3.0, 0.45], [0, 0, -0.35]);
        mesh(tube([[0, -0.35, 0], [0.03, 0, 0], [0, 0.3, 0]], 0.02, 12, 6), std(SPROUT), g);
        const a = mesh(leafGeo(0.36, 0.16), mLeaf, g, [0, 0.05, 0.01], null, LEAF_D); a.rotation.z = 1.0;
        const b = mesh(leafGeo(0.4, 0.17), mLeaf, g, [0, 0.2, 0.01], null, LEAF_D); b.rotation.z = -0.9;
        items.push(g);
      }
      {
        const g = group(decor, [-2.15, 0.2, 0.75]);
        const pad = (r, x, z, rot) => {
          const s = new THREE.Shape(); s.moveTo(0, 0); s.absarc(0, 0, r, 0.25, Math.PI * 2 - 0.05, false); s.lineTo(0, 0);
          const m = mesh(extrude(s, 0.04, 0.012), std(M('#A7C68C'), { roughness: 0.8 }), g, [x, 0, z], null, LEAF_D);
          m.rotation.set(-Math.PI / 2 + 0.3, 0, rot);
        };
        pad(0.56, 0, 0, 0.3); pad(0.4, 0.75, -0.35, 2.2);
        const fl = K.flower(g, [0.15, 0.14, 0.12], 0.4, M('#F4B9B4'), M('#F2C94C')); fl.rotation.x = -0.6;
        const sp2 = group(g, [-0.32, 0.05, -0.12]);
        mesh(tube([[0, 0, 0], [0.02, 0.3, 0], [0, 0.6, 0]], 0.022, 12, 6), std(SPROUT), sp2);
        const a = mesh(leafGeo(0.32, 0.14), mLeaf, sp2, [0, 0.58, 0], null, LEAF_D); a.rotation.z = 0.9;
        const b = mesh(leafGeo(0.32, 0.14), mLeaf, sp2, [0, 0.58, 0], null, LEAF_D); b.rotation.z = -0.9;
        items.push(g);
      }
      {
        const g = group(decor, [2.6, 0.05, 0.6]);
        mesh(tube([[0, 0, 0], [0.03, 0.35, 0], [0, 0.65, 0]], 0.024, 12, 6), std(SPROUT), g);
        const a = mesh(leafGeo(0.34, 0.14), mLeaf, g, [0, 0.62, 0], null, LEAF_D); a.rotation.z = 1.0;
        const b = mesh(leafGeo(0.34, 0.14), mLeaf, g, [0, 0.62, 0], null, LEAF_D); b.rotation.z = -1.0;
        items.push(g);
      }
      [[-2.6, 3.65, 0.2, 0.4, '#F4C2BC'], [2.95, 2.1, 0.4, -0.6, '#EFD69A'], [-1.95, 4.35, 0.1, 1.2, '#F4C2BC'], [-2.8, 0.85, 0.5, 2.0, '#F4C2BC'], [2.9, 1.3, 0.5, 0.8, '#F4C2BC'], [-2.7, 2.8, 0.4, -0.4, '#EFD69A']].forEach(([x, y, z, r, c]) => {
        const g = group(decor, [x, y, z], [0.3, 0.2, r]);
        mesh(sphere(0.13, 16, 12), std(M(c), { roughness: 0.8 }), g, null, [0.72, 1.1, 0.25]);
        items.push(g);
      });
      items.forEach(it => { it.userData.y0 = it.position.y; });
      K.onTick((t, k) => items.forEach((it, i) => { it.position.y = it.userData.y0 + 0.06 * Math.sin(t * 1.1 + i * 1.3) * k; }));
    },

    action: {
      label: '灑水', dur: 1.8,
      run(s, p, K) {
        if (bowlG) bowlG.rotation.z = -0.1 - 0.35 * s;
        if (riceG) riceG.rotation.z = 0.12 * Math.sin(p * Math.PI * 4) * s;
        K.headG.rotation.x = 0.1 * s;
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '雨生百穀的潤穀雨仙',
        text: '穀雨取「雨生百穀」之意。梨花貓頭戴水滴晶石髮箍，畫面左手高舉一束金黃稻禾，右手托著盛滿雨水的青瓷碗，碗緣的水正往下灑，象徵春雨滋潤稻禾、百穀得以生長。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '開心張嘴的梨花臉',
        text: '頭頂與兩側是暖灰棕虎斑，額頭五道深棕直紋、兩頰外側有橫紋；眼睛以下和額心一道尖形區塊是奶油白。圓亮的深棕大眼帶著白色高光，粉鼻下是「ω」形笑嘴，張開露出粉紅舌頭，兩頰淡淡腮紅。' },
      hat: { chip: '頭飾', tag: '服飾', name: '水滴晶石髮箍',
        text: '淡綠髮帶上鑲著金色捲雲飾與一顆圓形藍寶石，正中央立著一大顆透亮的水滴晶石，兩側各插一片綠葉，右邊斜插一枝金黃稻穗，右後方還飄著兩條青綠絲帶。' },
      rice: { chip: '稻禾', tag: '道具', name: '一束稻禾',
        text: '畫面左側的前爪高舉到臉頰旁，握著一束帶寬長葉片的稻禾，三串飽滿的淺金稻穗沉甸甸地往外垂，莖梗從爪下露出斜切口，代表穀物即將豐收。' },
      bowl: { chip: '水碗', tag: '道具', name: '青瓷雨水碗',
        text: '畫面右側的前爪從下方托著一只青瓷大碗，碗口鑲金邊、左後方有顆金色小鈕，碗身繞一圈米白環紋帶。碗裡的雨水泛著漣漪，從右側碗緣溢出成一道細流與水珠，像替田間降下及時雨。' },
      robe: { chip: '漢服', tag: '服飾', name: '米白交領與層疊大袖',
        text: '米白交領長袍，右衽，綠色寬領緣鑲金線。高舉與托碗的兩隻大袖都自然垂墜：靠手腕的袖身米白、繡著一心二葉嫩芽，袖口依序鑲金、雨藍、金三道邊，往外翻出淡綠的袖身與雲水紋。' },
      sash: { chip: '披帛', tag: '服飾', name: '雨藍披帛與飄帶',
        text: '淺藍披帛從兩肩斜掛到胸前，在腰帶上緣的兩顆金珠處打成蝴蝶結後垂下，畫面右側那條特別長。圓扣左邊還垂著一條尖角金色飄帶，上面有菱形小紋。' },
      belt: { chip: '腰帶', tag: '服飾', name: '雨藍腰帶與流蘇',
        text: '寬版淺藍腰帶中間夾一道金色細線，正中扣著四瓣花紋的金色圓扣，下方串兩顆金珠、垂一束青綠流蘇，走動時會輕輕搖晃。' },
      hem: { chip: '下擺', tag: '服飾', name: '雲水紋衣襬', cam: [0.6, 1.0, 6.2], target: [0, 0.8, 0.4],
        text: '長袍下擺是一圈雨藍色水浪帶，浪頂起伏，裡面是米白捲渦，像雲又像水。上方散落一心二葉的嫩芽與小雨滴；外罩的綠色衣片左窄右寬，一路垂到衣襬。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '虎斑長尾與金鈴', dir: [1, 0.25, -0.6],
        text: '粗長的虎斑尾巴從右後方衣襬下繞出，往上捲起、尾尖向內回勾，淺棕底上一圈圈深棕環紋，根部下緣偏奶白。尾巴下段繫著藍色蝴蝶結、綠葉與一顆四瓣花紋的金鈴。' },
      pose: { chip: '姿態', tag: '貓咪本體', name: '一手稻禾一手水',
        text: '雙腳站立、身體朝前，臉微微轉向左、頭往右歪。左爪舉稻、右爪托碗，兩隻奶油白的圓胖腳掌從衣襬下露出來。按下「灑水」可以看牠把碗傾向一旁。' }
    },
    order: ['overview', 'face', 'hat', 'rice', 'bowl', 'robe', 'sash', 'belt', 'hem', 'tail', 'pose']
  });
})();
