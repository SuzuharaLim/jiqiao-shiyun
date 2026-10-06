// @file 19_立冬_獰貓
// @title 立冬・玄冥迎冬官 | 二十四節氣貓
(function () {
  /* ---------------------------------------------------------------------------
   * 19 立冬 — caracal (獰貓) winter official holding an upright blue tablet.
   * Picture scale: 1 unit = 100 px of refs/19.png, feet at y = 0 (px 497), body axis at px x = 251.
   * Colours are SAMPLED from the picture; def.exposure dims the lights so they render close to it.
   * ------------------------------------------------------------------------- */
  const HY = 3.17, NECK = 2.45;
  const X = px => (px - 251) / 100, Y = py => (497 - py) / 100;   // picture px → world units
  const HW = 0.86, HH = 0.72, HCHEEK = 0.14;                         // head shape (kept in sync with cat.head)
  const JOWL = 0.4;                                                 // extra width of the lower face (broad cheek ruff)

  const FUR = '#EAB27E', FUR_TOP = '#E3A672', FUR_LOW = '#EDBA88', STRIPE = '#B87A4F', CREAM = '#FAF0E2', WHITE = '#FCF6EE';
  const INK = '#B27646', CREAM_INK = '#D3B697', EAR_DK = '#5F493C', EAR_IN = '#F2B09B';
  const HAT = '#7F8899', HAT_INK = '#565C6A', GOLD = '#F2CD8E', GOLD_DK = '#DDAE6C', GOLD_INK = '#B08650', JADE = '#BFCBB9', JADE_INK = '#7F9180';
  const CAPE = '#9DA3B1', CAPE_INK = '#676C7A', SNOW = '#F6F3F0';
  const TAB = '#929AA9', TAB_INK = '#5F6573', TAB_CREAM = '#F8EAD7', FLAKE_BLUE = '#9EB2CB';
  const PAW = '#E9B282', PAW_INK = '#C3875A';
  const SLEEVE = '#F3E8E1', CUFF = '#A0A4B1', CUFF_LT = '#B8BEC8', LAV = '#C3BDCA', LAV_INK = '#8A8494';
  const ROBE = '#F3EAE3', ROBE_INK = '#A5968A', HEM = '#A0A9B5', HEM_INK = '#6E7480', MTN = '#BEC6D0', MTN_DK = '#A5B0BF', WAVE = '#B9C3CD';
  const BOW = '#A7AD9A', BOW_DK = '#8F977F', BOW_INK = '#6D7463';
  const PINE = '#6C7D70', PINE_DK = '#5F6F63', TWIG = '#8B6B57', PLUM = '#FBF3E6', PLUM_C = '#EFC46A', BUD = '#D27F6D';
  const TAIL_DK = '#735848', FEET = '#F2C9A2', FEET_INK = '#BD8262';
  const WIND = '#C9D4E6', WIND_INK = '#9FAECA';

  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rad = d => d * Math.PI / 180;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  // canvas motifs -----------------------------------------------------------
  function pineC(g, x, y, s, col, rot, stem) {   // fan of pine needles on a short stem (canvas, pointing up)
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.strokeStyle = col; g.lineCap = 'round';
    if (stem) { g.strokeStyle = stem; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(0, s * 0.35); g.lineTo(0, -s * 0.2); g.stroke(); g.strokeStyle = col; }
    g.lineWidth = Math.max(2, s * 0.032);
    for (let i = 0; i < 11; i++) {
      const a = rad(-66 + i * 13.2), L = s * (0.62 - 0.12 * Math.abs(i - 5) / 5);
      g.beginPath(); g.moveTo(0, -s * 0.18); g.quadraticCurveTo(Math.sin(a) * L * 0.5, -s * 0.18 - Math.cos(a) * L * 0.55, Math.sin(a) * L, -s * 0.18 - Math.cos(a) * L); g.stroke();
    }
    g.restore();
  }
  function plumC(g, x, y, s, petal, center, ink) {   // five round petals, gold stamen dot
    g.save(); g.translate(x, y);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      g.fillStyle = petal; g.strokeStyle = ink; g.lineWidth = Math.max(1.5, s * 0.05);
      g.beginPath(); g.arc(Math.sin(a) * s * 0.42, -Math.cos(a) * s * 0.42, s * 0.34, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.fillStyle = petal; g.beginPath(); g.arc(0, 0, s * 0.34, 0, Math.PI * 2); g.fill();
    g.fillStyle = center; g.beginPath(); g.arc(0, 0, s * 0.16, 0, Math.PI * 2); g.fill();
    g.strokeStyle = center; g.lineWidth = Math.max(1, s * 0.035);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * s * 0.26, Math.sin(a) * s * 0.26); g.stroke(); }
    g.restore();
  }
  function twigC(g, pts, lw, col, buds) {   // plum twig with round red buds
    g.save(); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    (buds || []).forEach(([x, y, r]) => { g.fillStyle = BUD; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
    g.restore();
  }
  function flakeC(g, x, y, s, color, lw, sy) {   // six-armed snowflake (sy = vertical stretch for distorted maps)
    g.save(); g.translate(x, y); g.scale(1, sy || 1); g.strokeStyle = color; g.lineWidth = lw || Math.max(2, s * 0.1); g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate(i * Math.PI / 3);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s);
      g.moveTo(0, -s * 0.5); g.lineTo(s * 0.26, -s * 0.74); g.moveTo(0, -s * 0.5); g.lineTo(-s * 0.26, -s * 0.74);
      g.stroke(); g.restore();
    }
    g.restore();
  }
  function hillsC(g, x, y, s, sx) {   // two layered pale mountains with a wave line and a gold curve (skirt motif)
    g.save(); g.translate(x, y); g.scale(sx || 1, 1);
    const hill = (cx, w, h, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(cx - w, 0); g.bezierCurveTo(cx - w * 0.45, -h * 0.2, cx - w * 0.35, -h, cx, -h); g.bezierCurveTo(cx + w * 0.35, -h, cx + w * 0.45, -h * 0.2, cx + w, 0); g.closePath(); g.fill(); };
    hill(-s * 0.35, s * 0.75, s * 0.55, MTN);
    hill(s * 0.4, s * 0.6, s * 0.38, MTN_DK);
    hill(s * 0.05, s * 0.5, s * 0.26, MTN);
    g.strokeStyle = '#FFFFFF'; g.lineWidth = s * 0.05; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-s * 0.9, s * 0.12); g.bezierCurveTo(-s * 0.5, -s * 0.05, -s * 0.1, s * 0.25, s * 0.35, s * 0.08); g.stroke();
    g.strokeStyle = WAVE; g.lineWidth = s * 0.06;
    g.beginPath(); g.moveTo(-s * 0.8, s * 0.26); g.bezierCurveTo(-s * 0.3, s * 0.12, s * 0.1, s * 0.4, s * 0.8, s * 0.2); g.stroke();
    g.strokeStyle = GOLD_DK; g.lineWidth = s * 0.045;
    g.beginPath(); g.moveTo(-s * 1.1, s * 0.5); g.bezierCurveTo(-s * 0.6, s * 0.28, -s * 0.2, s * 0.62, s * 0.3, s * 0.42); g.bezierCurveTo(s * 0.6, s * 0.3, s * 0.9, s * 0.5, s * 1.1, s * 0.45); g.stroke();
    g.restore();
  }

  // front-view picture point → head map lon / lat (inverse of the head deformation, ignoring the ruff)
  function LL(xw, yw) {
    const yu = clamp((yw - HY) / HH, -0.995, 0.995);
    const lat = Math.asin(yu), cg = Math.exp(-Math.pow((yu + 0.25) / 0.62, 2));
    const rx = HW * (1 + HCHEEK * cg) * Math.cos(lat) * (1 + JOWL * sst(-0.1, -0.75, yu));
    return [Math.asin(clamp(xw / rx, -0.999, 0.999)) * 180 / Math.PI, lat * 180 / Math.PI];
  }

  NEKO.run({
    meta: {
      id: '19', term: '立冬', title: '立冬・玄冥迎冬官', seal: '冬',
      eyebrow: '二〇二七節氣貓 · 19 立冬 · 獰貓',
      aria: '頭戴深藍小官帽、帽前嵌玉扣並插白梅與松枝，豎著一對頂端長黑簇毛的高尖耳，圍白毛領、披雪花灰藍短披肩，身穿繡松梅與遠山的米白寬袖袍，雙手在胸前直直捧著藍色雪花笏板的茶橘色獰貓 3D 模型'
    },
    theme: { accent: '#5A6376', accentDark: '#B9C0D0', glow: 'rgba(185, 192, 208, 0.32)', glowColor: '#C9D2E4' },
    palette: [['#EAB27E', '獰貓茶橘'], ['#A2A5AE', '霜藍灰'], ['#F7ECDD', '雪米白'], ['#A7AD9A', '松霜綠']],
    spec: [['品種', '獰貓（狩貓）'], ['角色', '玄冥迎冬官'], ['頭身比', '約 1 : 1.7']],
    seed: 1019,
    exposure: 0.74,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR, low: FUR_LOW, deep: STRIPE, cream: CREAM,
        ink: INK, creamInk: CREAM_INK, noise: { colors: ['#F6D2A8', '#D89A62'], alpha: 0.07, n: 1200 },
        paintBase(g, P) {
          const pic = (px, py) => P.xy(...LL(X(px), Y(py)));
          const picM = (px, py) => pic(502 - px, py);
          const poly = (pts, color, blur) => {
            g.filter = blur ? 'blur(' + blur + 'px)' : 'none'; g.fillStyle = color; g.beginPath();
            pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); g.filter = 'none';
          };
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.45, FUR); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // cream under the chin all round (hidden by the fur collar, reads from the side)
          const lg = g.createLinearGradient(0, P.xy(0, -58)[1], 0, 512);
          lg.addColorStop(0, 'rgba(250,240,226,0)'); lg.addColorStop(0.35, CREAM); lg.addColorStop(1, CREAM);
          g.fillStyle = lg; g.fillRect(0, P.xy(0, -58)[1], 1024, 512);
          // cream lower face + white brow patches (the orange bridge narrows down to the nose)
          const half = [[251, 199], [246, 196], [241, 190], [236, 180], [233, 169], [231, 161], [227, 157], [220, 157], [214, 161], [212, 168], [211, 177], [206, 184],
            [206, 193], [209, 200], [202, 204], [193, 208], [185, 214], [179, 224], [177, 236], [172, 250], [165, 275], [251, 290]];
          const full = half.map(([x, y]) => pic(x, y)).concat(half.slice().reverse().map(([x, y]) => picM(x, y)));
          poly(full, '#FFF7EC', 3.5);
          // back-of-head: two faint darker bands continuing the forehead stripes over the crown
          g.filter = 'blur(4px)';
          [-1, 1].forEach(k => P.stroke(g, [P.xy(14 * k, 70), P.xy(40 * k, 86), P.xy(170 * k, 60)], 16, STRIPE, 0.35));
          g.filter = 'none';
          // two forehead stripes from under the hat down between the eyes (tapered wedges)
          const wedge = (xt, yt, xb, yb, wt, col, a) => {
            const pts = [pic(xt - wt, yt), pic(xt + wt, yt), pic((xt + xb) / 2 + wt * 0.55, (yt + yb) / 2), pic(xb, yb), pic((xt + xb) / 2 - wt * 0.55, (yt + yb) / 2)];
            g.globalAlpha = a || 1; poly(pts, col, 1.5); g.globalAlpha = 1;
          };
          wedge(228, 100, 233, 153, 5.5, STRIPE, 0.95); wedge(274, 100, 269, 153, 5.5, STRIPE, 0.95);
          // curved brow strokes above the white patches
          g.filter = 'blur(1px)';
          P.stroke(g, [pic(216, 144), pic(225, 146), pic(231, 155)], 5.5, STRIPE, 0.85);
          P.stroke(g, [picM(216, 144), picM(225, 146), picM(231, 155)], 5.5, STRIPE, 0.85);
          // cheek stripes: an upper one sweeping out from the eye and a lower one following the cheek
          g.filter = 'blur(1.5px)';
          [[[201, 166], [177, 174], [150, 192]], [[196, 195], [178, 206], [165, 232]]].forEach((s, i) => {
            const w = i ? 11 : 13;
            P.stroke(g, s.map(([x, y]) => pic(x, y)), w, STRIPE, 0.95);
            P.stroke(g, s.map(([x, y]) => picM(x, y)), w, STRIPE, 0.95);
          });
          // short dark whiskers drawn on the cheeks
          g.filter = 'none';
          [[[191, 207], [177, 208], [162, 212]], [[193, 212], [180, 216], [166, 223]]].forEach(s => {
            P.stroke(g, s.map(([x, y]) => pic(x, y)), 2.6, '#6A4A38', 0.9);
            P.stroke(g, s.map(([x, y]) => picM(x, y)), 2.6, '#6A4A38', 0.9);
          });
          // freckle dots inside the blush
          [[200, 212], [207, 213]].forEach(([x, y]) => {
            [pic(x, y), picM(x, y)].forEach(([cx, cy]) => { g.fillStyle = 'rgba(226,120,112,0.85)'; g.beginPath(); g.arc(cx, cy, 2.4, 0, Math.PI * 2); g.fill(); });
          });
        }
      },
      head: { y: HY, neck: NECK, w: HW, h: HH, d: 0.82, cheek: HCHEEK, ruff: 0.07, ruffFreq: 14, chinDrop: 0.03,
        deform(p, o) { p.x *= 1 + JOWL * sst(-0.1, -0.75, o.y); },
        fur: { layers: 14, length: 0.045, gravity: 0.02, repeat: [10, 6] } },
      eyes: { x: 0.335, y: -0.1, r: 0.09, sx: 0.95, sy: 1.08, sz: 0.42, color: '#4A2E20', shine: 1.0 },
      nose: { y: -0.195, color: '#F09C8A', size: 0.95 },
      muzzle: { y: -0.27, size: 0.42, color: '#FFF7EC' },
      mouth: { type: 'w', color: '#7A4B32', y: -0.285, w: 0.14, depth: 0.05 },
      blush: { color: 'rgba(244,140,132,0.75)', x: 0.46, y: -0.33, r: 26, after: true },
      whiskers: null,
      ears: { x: 0.68, y: 0.27, z: -0.1, tilt: 0.34, yaw: 0.2, pitch: -0.06, size: [0.45, 1.3, 0.16], sharp: 0.97,
        color: FUR, inner: EAR_IN, innerScale: 1.12, tuft: WHITE, tuftScale: 1.0, fur: { layers: 8, length: 0.03, gravity: 0.01, repeat: [3, 4] } },
      bib: false,
      robe: {
        profile: [[1.07, 0.24], [1.06, 0.4], [0.98, 0.75], [0.88, 1.1], [0.8, 1.45], [0.74, 1.8], [0.68, 2.1], [0.56, 2.36], [0.2, 2.52]],
        color: '#FFFFFF', ink: LAV_INK, lining: LAV, hemY: 0.5,
        paint(g, w, h, D) { D.fill(g, LAV); g.fillStyle = 'rgba(120,112,140,0.35)'; g.fillRect(0, h - 10, w, 10); }
      },
      collar: false,
      furCollar: null,
      arms: {
        L: { hand: [-0.165, 1.86, 1.0], path: [[-0.55, 2.2, 0.1], [-0.62, 1.95, 0.55], [-0.3, 1.88, 0.92]], pawScale: 1.3, wrist: false },
        R: { hand: [0.165, 1.86, 1.0], path: [[0.55, 2.2, 0.1], [0.62, 1.95, 0.55], [0.3, 1.88, 0.92]], pawScale: 1.3, wrist: false }
      },
      sleeves: false,
      paws: { color: PAW, ink: PAW_INK },
      belt: false,
      feet: false,
      tail: {
        pts: [[0.3, 0.45, -0.7], [0.85, 0.3, -0.7], [1.22, 0.34, -0.55], [1.42, 0.56, -0.45], [1.42, 0.86, -0.4], [1.38, 1.1, -0.38], [1.42, 1.32, -0.36], [1.53, 1.44, -0.34], [1.66, 1.39, -0.32], [1.71, 1.25, -0.3], [1.68, 1.1, -0.28]],
        r: 0.23, color: FUR, deep: TAIL_DK, tip: TAIL_DK, tipStart: 0.7, bands: 0, ink: INK,
        shape: t => (0.65 + 0.35 * sst(0, 0.4, t)) * (1 - 0.15 * Math.exp(-Math.pow((t - 0.7) / 0.06, 2))) * (1 - 0.8 * sst(0.84, 1, t)),
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, '#E4A873'); lg.addColorStop(0.4, FUR); lg.addColorStop(0.62, '#E9AC76'); lg.addColorStop(1, '#D9985F');
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          // dark brown upper tail with a jagged, flame-like border (as painted)
          g.fillStyle = TAIL_DK; g.beginPath(); g.moveTo(w, 0); g.lineTo(0.76 * w, 0);
          const n = 8;
          for (let i = 0; i <= n; i++) g.lineTo((0.7 + (i % 2 ? 0.0 : 0.05) + 0.008 * Math.sin(i * 2.3)) * w, i / n * h);
          g.lineTo(w, h); g.closePath(); g.fill();
        },
        fur: { layers: 12, length: 0.05, gravity: 0.015, repeat: [16, 6] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, roundBox, extrude, tube, lathe, ribbon, D } = K;
      const M = (c, o) => std(c, Object.assign({ roughness: 0.85 }, o || {}));
      // flatter, picture-book shading on the head: part of the colour comes from an emissive copy of the fur map
      // (the fur shells clone this material after build, so they get it too)
      { const hm = K.headMesh.material; hm.color.multiplyScalar(0.62); hm.emissive = new THREE.Color(0.44, 0.44, 0.44); hm.emissiveMap = K.headTex; hm.needsUpdate = true; }

      /* ---------------- ears: dark medial edge + back, black lynx tufts, white inner fluff ---------------- */
      // caracal ears are straight-sided triangles: rebuild the ear shell (sphere UVs kept for the painted map)
      const triEar = (() => {
        const geo = new THREE.SphereGeometry(1, 40, 32), p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = (y + 1) / 2, rs = Math.max(Math.sqrt(Math.max(1 - y * y, 0)), 1e-6);
          const wf = Math.pow(Math.sin(Math.min(t / 0.14, 1) * Math.PI / 2), 0.55) * Math.pow(1 - t, 0.72);
          p.setXYZ(i, x / rs * wf, t, z / rs * wf);
        }
        return K.smoothNormals(geo);
      })();
      K.ears.forEach(({ g, sx }) => {
        g.children.slice(0, 3).forEach(m => { m.geometry = triEar; });
        const outer = g.children[0];
        const tex = canvasTex(256, 256, (c, w, h) => {
          // sphere u: 0 = local −x, 0.25 front, 0.5 = +x, 0.75 back. Medial edge = toward the head centre.
          const med = sx < 0 ? 0.5 : 0.0;
          for (let x = 0; x < w; x++) {
            const u = x / w;
            const dm = Math.min(Math.abs(u - med), 1 - Math.abs(u - med));          // distance to the medial edge
            const db = Math.min(Math.abs(u - 0.75), 1 - Math.abs(u - 0.75));       // distance to the back
            const dark = Math.max(1 - sst(0.13, 0.21, dm), 1 - sst(0.2, 0.3, db));
            const col = new THREE.Color(FUR).lerp(new THREE.Color(EAR_DK), dark);
            c.fillStyle = '#' + col.getHexString(); c.fillRect(x, 0, 1, h);
          }
          const tg = c.createLinearGradient(0, 0, 0, h);
          tg.addColorStop(0, EAR_DK); tg.addColorStop(0.2, EAR_DK); tg.addColorStop(0.3, 'rgba(95,73,60,0)');
          c.fillStyle = tg; c.fillRect(0, 0, w, h);
        });
        outer.material = texMat(tex, { roughness: 0.9 });
        g.children[1].position.x += 0.03 * sx;
        // white fluff: a soft pointed patch over the lower half of the pink inner ear
        { const tf = g.children[2], [ex, ey, ez] = [0.45, 1.3, 0.16]; tf.scale.set(ex * 0.5, ey * 0.42, ez * 0.22); tf.position.set(0.0, ey * 0.12, 0.12); tf.rotation.z = -0.08 * sx; K.addFur(tf, { layers: 8, length: 0.035, gravity: 0.0, repeat: [3, 6] }); }
        // lynx tufts: a fan of long dark strands leaning outward
        const tm = M(EAR_DK, { roughness: 0.95 });
        [[0, 0.42, 0.04], [14, 0.42, 0.036], [28, 0.38, 0.034], [44, 0.32, 0.03], [60, 0.24, 0.026], [-14, 0.3, 0.028]].forEach(([deg, len, r0]) => {
          const dx = Math.sin(rad(deg)) * sx, dy = Math.cos(rad(deg));
          const b = [dx * len * 0.5, 1.29 + dy * len * 0.5, 0], c = [dx * len + sx * 0.08 * len, 1.29 + dy * len - 0.04, -0.01];
          mesh(tube([[0, 1.24, 0], b, c], t => r0 * (1 - 0.92 * t) + 0.002, 20, 8), tm, g);
        });
      });

      /* ---------------- pointed cheek-fur tufts (the fluffy side outline of the face) ---------------- */
      {
        const edgeX = (y) => { let lo = 0, hi = 1.5; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; } return lo; };
        const fm = M(FUR, { roughness: 0.95 }), cm = M(CREAM, { roughness: 0.95 });
        [-1, 1].forEach(sx => {
          [[3.34, -18, 0.13, 0.07, fm, INK], [3.2, -4, 0.16, 0.08, fm, INK], [3.05, 8, 0.17, 0.085, fm, INK], [2.9, 22, 0.16, 0.08, fm, INK], [2.75, 38, 0.14, 0.075, fm, INK], [2.62, 52, 0.12, 0.07, cm, CREAM_INK]]
            .forEach(([y, ang, len, r0, mat, ink], i) => {
              const ex = edgeX(y), a = rad(ang), z = [0.05, -0.1, 0.06, -0.08, 0.04, -0.02][i];
              const p0 = V(sx * (ex - 0.08), y, z), p2 = p0.clone().add(V(sx * Math.cos(a) * len, -Math.sin(a) * len, z * 0.4));
              const p1 = p0.clone().lerp(p2, 0.5).add(V(0, -0.02, 0));
              mesh(tube([p0, p1, p2], t => r0 * (1 - Math.pow(t, 1.2)) + 0.004, 16, 8), mat, K.faceG, null, null, i < 5 ? null : ink);
            });
        });
      }

      /* ---------------- small dark-blue cap with jade button, gold pin, plum & pine ---------------- */
      const hat = part('hat', K.head);
      hat.position.set(0, 3.8, 0.0);
      {
        const hatMat = M(HAT), goldMat = M(GOLD, { roughness: 0.5, metalness: 0.1 });
        mesh(new THREE.CylinderGeometry(0.378, 0.382, 0.04, 72), goldMat, hat, [0, 0.02, 0], null, GOLD_INK);
        mesh(new THREE.CylinderGeometry(0.366, 0.372, 0.13, 72), hatMat, hat, [0, 0.105, 0], null, HAT_INK);
        mesh(new THREE.TorusGeometry(0.368, 0.008, 6, 72), M(HAT_INK), hat, [0, 0.17, 0]).rotation.x = Math.PI / 2;
        const crownTex = canvasTex(1024, 256, (c, w, h) => {
          c.fillStyle = HAT; c.fillRect(0, 0, w, h);
          // gold ribs (lathe u: 0 = back, 0.5 = front)
          [-40, 40, -112, 112, 180].forEach(d => { const u = 0.5 + d / 360; c.fillStyle = GOLD; c.fillRect(u * w - 9, h * 0.16, 18, h * 0.84); c.fillStyle = GOLD_INK; c.fillRect(u * w - 11, h * 0.16, 2, h * 0.84); c.fillRect(u * w + 9, h * 0.16, 2, h * 0.84); });
          const rg = c.createLinearGradient(0, 0, 0, h); rg.addColorStop(0, 'rgba(255,255,255,0.12)'); rg.addColorStop(1, 'rgba(0,0,0,0.06)');
          c.fillStyle = rg; c.fillRect(0, 0, w, h);
        });
        const cr = lathe([[0.332, 0.16], [0.338, 0.28], [0.326, 0.42], [0.285, 0.53], [0.18, 0.605], [0.0, 0.625]], 72);
        mesh(cr.geo, texMat(crownTex, { roughness: 0.85 }), hat, null, null, HAT_INK);
        // jade button in a gold bezel on the front of the band
        const jb = group(hat, [0, 0.19, 0.37]);
        mesh(new THREE.TorusGeometry(0.092, 0.03, 14, 40), goldMat, jb, null, null, GOLD_INK);
        mesh(new THREE.CircleGeometry(0.1, 40), goldMat, jb, [0, 0, -0.012]);
        mesh(sphere(0.078, 32, 24), M(JADE, { roughness: 0.35 }), jb, [0, 0, 0.01], [1, 1, 0.62], JADE_INK);
        mesh(sphere(0.02, 12, 10), K.M.shine, jb, [-0.03, 0.032, 0.055]).castShadow = false;
        // gold hairpin through the image-left side
        mesh(tube([[-0.28, 0.24, 0.16], [-0.36, 0.25, 0.17], [-0.45, 0.255, 0.17]], 0.018, 12, 8), goldMat, hat, null, null, GOLD_INK);
        mesh(sphere(0.048, 24, 18), goldMat, hat, [-0.47, 0.255, 0.17], null, GOLD_INK);
        // pine needles fanning out behind a white plum blossom on the image-right
        const pm = M(PINE_DK, { roughness: 0.8 });
        const pg = group(hat, [0.27, 0.2, 0.26], [0, 0.5, -0.5]);
        for (let i = 0; i < 9; i++) {
          const a = rad(-50 + i * 14), L = 0.32 - 0.07 * Math.abs(i - 4) / 4;
          mesh(tube([[0, 0, 0], [Math.sin(a) * L * 0.5, Math.cos(a) * L * 0.5, -0.01], [Math.sin(a) * L, Math.cos(a) * L, -0.03]], t => 0.017 * (1 - 0.6 * t), 10, 6), pm, pg);
        }
        const fl = K.flower(hat, [0.2, 0.27, 0.33], 0.25, PLUM, PLUM_C, 5); fl.rotation.y = 0.45;
        fl.children.forEach(m => { if (m.isMesh) K.outline(m, '#CDBBA6'); });
        // plum buds (the lower one sits on the band, so it does not float beside the hat)
        [[0.1, 0.37, 0.31, 0.034], [0.34, 0.13, 0.19, 0.03], [0.4, 0.4, 0.2, 0.028]].forEach(([x, y, z, r]) => mesh(sphere(r, 16, 12), M(PLUM), hat, [x, y, z], null, '#CDBBA6'));
      }

      /* ---------------- open-front outer robe (cream skirt with mountains, blue-gray hem band) ---------------- */
      const coatPts = new THREE.SplineCurve([[1.41, 0.3], [1.33, 0.55], [1.17, 0.85], [1.0, 1.15], [0.9, 1.45], [0.82, 1.75], [0.75, 2.05], [0.64, 2.3], [0.48, 2.46]]
        .map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(90);
      const coatR = (y) => { for (let i = 0; i < coatPts.length - 1; i++) { const a = coatPts[i], b = coatPts[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); } return y < 0.3 ? 1.41 : 0.48; };
      const gapW = (y) => lerp(0.64, 0.3, sst(0.4, 1.4, y));
      const phiH = (y) => Math.asin(Math.min(gapW(y) / coatR(y), 0.97));
      const coatHem = (phi) => { const d = Math.abs(phi > Math.PI ? phi - 2 * Math.PI : phi); return 0.37 + 0.38 * sst(0.4, 1.5, d); };
      {
        const Y1 = 2.46, nu = 140, nv = 56, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv;
          for (let i = 0; i <= nu; i++) {
            const s = i / nu;
            let y = lerp(0.37, Y1, t), ph = phiH(y), phi = ph + (Math.PI * 2 - 2 * ph) * s;
            y = lerp(coatHem(phi), Y1, t); ph = phiH(y); phi = ph + (Math.PI * 2 - 2 * ph) * s;
            const r = coatR(y) + 0.02 * (1 - t);
            pos.push(Math.sin(phi) * r, y, Math.cos(phi) * r); uv.push(s, t);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const tex = canvasTex(2048, 640, (g, w, h) => {
          D.fill(g, ROBE);
          const band = h * 0.085;
          // mountains + waves on the visible fronts and on the back
          [[0.08, 1], [0.92, -1], [0.4, 1], [0.6, -1]].forEach(([u, k]) => hillsC(g, u * w, h - band - h * 0.075, 150, k));
          // gold line + blue-gray hem band
          g.fillStyle = GOLD_DK; g.fillRect(0, h - band - 12, w, 6);
          g.fillStyle = HEM; g.fillRect(0, h - band, w, band);
          g.fillStyle = HEM_INK; g.fillRect(0, h - band - 3, w, 3); g.fillRect(0, h - 5, w, 5);
          // front-edge bands (constant ~0.09 world width)
          [0, 1].forEach(side => {
            g.fillStyle = HEM; g.beginPath();
            const L = [];
            for (let k = 0; k <= 30; k++) {
              const t = k / 30, y = lerp(0.4, Y1, t), circ = coatR(y) * (Math.PI * 2 - 2 * phiH(y)), px = 0.09 / circ * w;
              L.push([px, (1 - t) * h]);
            }
            const pts = [[0, h]].concat(L).concat([[0, 0]]).map(([x, y]) => [side ? w - x : x, y]);
            pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
            g.strokeStyle = HEM_INK; g.lineWidth = 3; g.beginPath(); L.forEach(([x, y], i) => { const xx = side ? w - x : x; i ? g.lineTo(xx, y) : g.moveTo(xx, y); }); g.stroke();
          });
        });
        mesh(geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.9 }), K.robeG, null, null, ROBE_INK);
      }

      /* ---------------- front panel (蔽膝-like) with mountains and a plum twig ---------------- */
      K.robePanel({
        y0: 0.28, y1: 1.56, deg: 33, degB: 27, off: 0.035, color: '#EEE5DA', ink: HEM_INK, texW: 256, texH: 640,
        paint(g, w, h) {
          const b = 22;
          g.fillStyle = HEM; g.fillRect(0, 0, b, h); g.fillRect(w - b, 0, b, h); g.fillRect(0, h - b, w, b);
          g.fillStyle = HEM_INK; g.fillRect(b, 0, 3, h - b); g.fillRect(w - b - 3, 0, 3, h - b); g.fillRect(b, h - b - 3, w - 2 * b, 3);
          g.save(); g.beginPath(); g.rect(b + 3, 0, w - 2 * b - 6, h - b - 3); g.clip();
          const hill = (cx, cy, rw, rh, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, rw, rh, 0, Math.PI, 0); g.fill(); };
          hill(80, h - b - 2, 110, 105, MTN); hill(200, h - b - 2, 80, 62, MTN_DK);
          g.strokeStyle = '#FFFFFF'; g.lineWidth = 5;
          [0, 1, 2].forEach(i => { g.beginPath(); g.arc(128, h - b + 60, 70 + i * 24, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); });
          g.restore();
          twigC(g, [[120, h - 70], [165, h - 120], [200, h - 190], [216, h - 225]], 5, TWIG, [[217, h - 228, 7], [190, h - 175, 6], [200, h - 160, 5]]);
          twigC(g, [[165, h - 120], [195, h - 132]], 4, TWIG, [[198, h - 134, 6]]);
          plumC(g, 132, h - 82, 34, PLUM, PLUM_C, '#C8B49C');
        }
      });

      /* ---------------- waistband, sage-green bow, ribbon tails, jade bead, gold tassel ---------------- */
      {
        const bg = K.beltG;
        const rz = (y, off) => K.robeR(y) + off;
        mesh(new THREE.CylinderGeometry(K.robeR(1.66) + 0.045, K.robeR(1.52) + 0.045, 0.14, 72, 1, true), M(HEM, { side: THREE.DoubleSide }), bg, [0, 1.59, 0], null, HEM_INK);
        const bm = M(BOW, { side: THREE.DoubleSide }), bdk = M(BOW_DK, { side: THREE.DoubleSide });
        const yK = 1.62, zK = rz(1.62, 0.17);
        // drooping loops (petal shapes) with a darker inner fold
        const petal = (L, W, k) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(k * W * 0.6, L * 0.15, k * W, L * 0.7, k * W * 0.35, L); s.bezierCurveTo(-k * W * 0.2, L * 1.05, -k * W * 0.55, L * 0.6, 0, 0); return s; };
        [-1, 1].forEach(sx => {
          const lg = group(bg, [0.02 * sx, yK, zK], [0, 0.2 * sx, sx * rad(-104)]);
          mesh(extrude(petal(0.28, 0.2, -sx), 0.06, 0.018, 3, 16), bm, lg, null, null, BOW_INK);
          mesh(extrude(petal(0.15, 0.09, -sx), 0.02, 0.006, 2, 12), bdk, lg, [-0.022 * sx, 0.045, 0.035]);
        });
        mesh(roundBox(0.085, 0.1, 0.07, 0.025, 0.012), bm, bg, [0, yK - 0.005, zK + 0.012], null, BOW_INK);
        // two long ribbon tails
        [-1, 1].forEach(sx => {
          const pts = [[0.03 * sx, yK - 0.04, 0.15], [0.08 * sx, 1.35, 0.09], [0.12 * sx, 1.1, 0.075], [0.135 * sx, 0.84, 0.075]].map(([x, y, o]) => V(x, y, rz(y, o)));
          mesh(ribbon(pts, t => 0.1 + 0.025 * t, { segs: 40 }), bm, bg, null, null, BOW_INK);
        });
        // gold cord, jade bead and tassel down the centre
        const gm = M(GOLD, { roughness: 0.5, metalness: 0.1 });
        mesh(tube([V(0, yK - 0.05, zK), V(0, 1.4, rz(1.4, 0.12)), V(0, 1.28, rz(1.28, 0.11))], 0.012, 12, 6), gm, bg);
        mesh(sphere(0.07, 32, 24), M(JADE, { roughness: 0.35 }), bg, [0, 1.2, rz(1.2, 0.12)], null, JADE_INK);
        mesh(sphere(0.018, 12, 10), K.M.shine, bg, [-0.025, 1.23, rz(1.2, 0.185)]).castShadow = false;
        const ts = K.tassel(bg, [0, 1.11, rz(1.11, 0.1)], GOLD, 0.2, 0.04, GOLD_INK);
        K.onTick((t, k) => { ts.rotation.z = 0.07 * Math.sin(t * 1.6) * k; });
      }

      /* ---------------- huge wide sleeves (custom sacks; blue-gray cuff band at the inner end) ---------------- */
      const sleevesG = part('sleeves', K.body);
      const sleeveTex = canvasTex(1024, 768, (g, w, h) => {
        D.fill(g, SLEEVE);
        // cuff: lavender strip then the wide blue-gray band on the last part of the sack
        g.fillStyle = LAV; g.fillRect(w * 0.82, 0, w * 0.18, h);
        g.fillStyle = CUFF; g.fillRect(w * 0.85, 0, w * 0.15, h);
        g.fillStyle = CUFF_LT; g.fillRect(w * 0.85, 0, w * 0.025, h);
        g.fillStyle = LAV_INK; g.fillRect(w * 0.82 - 4, 0, 4, h); g.fillRect(w * 0.85 - 3, 0, 3, h);
      });
      const sleeveMat = texMat(sleeveTex, { roughness: 0.9 });
      const liningMat = std(LAV, { side: THREE.BackSide, roughness: 0.9 });
      const sleeveMeshes = [];
      const buildSleeve = (sx) => {
        const spine = new THREE.CatmullRomCurve3([V(0.42 * sx, 0, -0.22), V(0.78 * sx, 0, -0.1), V(0.93 * sx, 0, 0.2), V(0.88 * sx, 0, 0.52), V(0.6 * sx, 0, 0.72), V(0.28 * sx, 0, 0.8)]);
        const NT = 72, NA = 56, pos = [], uv = [], idx = [], ring = [];
        for (let i = 0; i <= NT; i++) {
          const t = i / NT, C = spine.getPointAt(t), T = spine.getTangentAt(t);
          T.y = 0; T.normalize();
          const n = V(T.z, 0, -T.x).multiplyScalar(sx);
          const yT = t < 0.5 ? lerp(2.25, 1.93, sst(0.05, 0.45, t)) : lerp(1.93, 2.02, sst(0.6, 1, t)), yB = t < 0.4 ? lerp(1.95, 1.24, sst(0, 0.32, t)) : lerp(1.24, 1.0, sst(0.4, 0.85, t));
          const W = lerp(0.1, 0.19, sst(0, 0.3, t)) * (1 - 0.25 * sst(0.75, 1, t));
          const mid = (yT + yB) / 2, half = (yT - yB) / 2;
          for (let j = 0; j <= NA; j++) {
            const a = j / NA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            const y = mid + half * Math.sign(ca) * Math.pow(Math.abs(ca), 0.8);
            const hgt = (y - yB) / (yT - yB);
            const s = W * Math.sign(sa) * Math.pow(Math.abs(sa), 0.7) * (1 + 0.45 * (1 - hgt));
            const p = C.clone().addScaledVector(n, s); p.y = y;
            pos.push(p.x, p.y, p.z); uv.push(t, (y - 0.95) / 1.4);
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
        const c0 = spine.getPointAt(0.5); c0.y = pv.y;
        if (nv.dot(pv.clone().sub(c0)) < 0) { for (let q = 0; q < idx.length; q += 3) { const tt = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tt; } geo.setIndex(idx); K.smoothNormals(geo); }
        sleeveMeshes.push(mesh(geo, sleeveMat, sleevesG, null, null, ROBE_INK));
        const lin = new THREE.Mesh(geo, liningMat); lin.receiveShadow = true; sleevesG.add(lin);
        mesh(tube(ring.slice(0, -1), 0.018, 120, 8, true), M(CUFF), sleevesG);
      };
      buildSleeve(-1); buildSleeve(1);
      // pine sprig + plum motifs on the sleeve fronts as decals
      {
        const pineTex = canvasTex(256, 256, (g) => { twigC(g, [[128, 250], [124, 200], [128, 150]], 7, TWIG, []); pineC(g, 128, 160, 190, PINE, 0); });
        const plumTex = canvasTex(256, 256, (g) => {
          twigC(g, [[40, 240], [90, 180], [140, 120], [190, 60]], 7, TWIG, [[192, 56, 10], [150, 150, 9], [110, 205, 8]]);
          twigC(g, [[140, 120], [175, 118]], 5, TWIG, [[178, 117, 8]]);
          plumC(g, 105, 150, 62, PLUM, PLUM_C, '#C8B49C');
        });
        const dm = (tex) => texMat(tex, { transparent: true, alphaTest: 0.35, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
        const decal = (tex, x, y, s, rot) => {
          const hit = K.onSkin(x, y, sleeveMeshes);
          const d = mesh(new THREE.PlaneGeometry(s, s), dm(tex), sleevesG, hit.p.clone().addScaledVector(hit.n, 0.006));
          d.lookAt(hit.p.clone().add(hit.n)); d.rotateZ(rot || 0); d.castShadow = false;
        };
        decal(pineTex, X(172), Y(345), 0.52, 0.12); decal(pineTex, X(336), Y(338), 0.52, -0.1);
        decal(plumTex, X(168), Y(380), 0.34, 0.9); decal(plumTex, X(322), Y(365), 0.42, 0);
      }

      /* ---------------- blue-gray capelet with snowflakes (hem high in front, long at the sides) ---------------- */
      const capeG = part('cape', K.body);
      const capePts = new THREE.SplineCurve([[1.2, 1.62], [1.15, 1.84], [1.05, 2.04], [0.9, 2.24], [0.72, 2.41], [0.5, 2.55]].map(p => new THREE.Vector2(p[1], p[0]))).getSpacedPoints(80);
      const capeR = (y) => { for (let i = 0; i < capePts.length - 1; i++) { const a = capePts[i], b = capePts[i + 1]; if (y >= a.x && y <= b.x) return a.y + (b.y - a.y) * (y - a.x) / (b.x - a.x || 1); } return y < 1.62 ? 1.2 : 0.5; };
      const capeHem = (deg) => 1.66 + 0.62 * (1 - sst(10, 85, deg));
      const CAPE_OPEN = 8, CY1 = 2.55;
      {
        const nu = 160, nv = 40, pos = [], uv = [], idx = [], hem = [];
        for (let j = 0; j <= nv; j++) {
          const t = j / nv;
          for (let i = 0; i <= nu; i++) {
            const a = CAPE_OPEN + (360 - 2 * CAPE_OPEN) * i / nu, d = Math.min(a, 360 - a);
            const y = lerp(capeHem(d), CY1, Math.pow(t, 1.15)), r = capeR(y) + 0.05 * (1 - t) * (1 - t);
            const p = [Math.sin(rad(a)) * r, y, Math.cos(rad(a)) * r];
            pos.push(...p); uv.push(i / nu, t);
            if (j === 0) hem.push(V(p[0] * 1.004, p[1] + 0.004, p[2] * 1.004));
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        // map a world point on the cape to canvas coords + the local vertical stretch
        const W2 = 2048, H2 = 512;
        const capeXY = (a, y) => { const d = Math.min(a, 360 - a), hy = capeHem(d), t = Math.pow(clamp((y - hy) / (CY1 - hy), 0, 1), 1 / 1.15); return [(a - CAPE_OPEN) / (360 - 2 * CAPE_OPEN) * W2, (1 - t) * H2, (H2 / (CY1 - hy)) / (W2 / (capeR(y) * rad(360 - 2 * CAPE_OPEN)))]; };
        const tex = canvasTex(W2, H2, (g, w, h) => {
          D.fill(g, CAPE);
          const flake = (a, y, s) => { const [x, yy, sy] = capeXY(a, y); flakeC(g, x, yy, s, SNOW, Math.max(3, s * 0.13), sy); };
          [[46, 2.14, 30], [314, 2.14, 30], [66, 1.95, 16], [294, 1.95, 16], [30, 2.3, 12], [330, 2.3, 12],
            [100, 2.05, 26], [260, 2.05, 26], [130, 1.85, 18], [230, 1.85, 18], [150, 2.2, 22], [210, 2.2, 22], [180, 1.9, 28], [118, 2.3, 14], [242, 2.3, 14]].forEach(([a, y, s]) => flake(a, y, s));
          // cream + gold trim along the hem
          g.fillStyle = '#F4E9D6'; g.fillRect(0, h - 22, w, 22);
          g.fillStyle = GOLD_DK; g.fillRect(0, h - 12, w, 6);
          g.fillStyle = CAPE_INK; g.fillRect(0, h - 25, w, 3);
        });
        mesh(geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.9 }), capeG, null, null, CAPE_INK);
        mesh(tube(hem, 0.013, 240, 6), M(GOLD_DK), capeG);
      }
      // gold flower knots on the capelet edges with cords hanging down beside the tablet
      {
        const gm = M(GOLD, { roughness: 0.5, metalness: 0.1 });
        [-1, 1].forEach(sx => {
          const a = rad(15), y = 2.27, r = capeR(y) + 0.04;
          const c = V(Math.sin(a) * r * sx, y, Math.cos(a) * r);
          const kg = group(capeG, c);
          [[0, 0.04], [0.04, 0], [-0.04, 0], [0, -0.035]].forEach(([dx, dy]) => mesh(sphere(0.034, 16, 12), gm, kg, [dx, dy, 0], null, GOLD_INK));
          mesh(sphere(0.03, 16, 12), gm, kg, [0, 0, 0.025], null, GOLD_INK);
          mesh(tube([c.clone().add(V(0, -0.05, 0.01)), V(0.25 * sx, 2.0, 0.9), V(0.24 * sx, 1.72, 0.88)], 0.011, 24, 6), gm, capeG);
        });
      }

      /* ---------------- fluffy white fur collar (ellipse ring at the capelet neckline) ---------------- */
      {
        const fc = part('furCollar', K.body);
        const ring = [];
        for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, front = Math.pow(Math.max(0, Math.cos(a)), 2); ring.push(V(Math.sin(a) * 0.71, 2.45 - 0.05 * front, Math.cos(a) * 0.6)); }
        const wt = canvasTex(8, 8, (c) => { c.fillStyle = WHITE; c.fillRect(0, 0, 8, 8); });
        const m = mesh(tube(ring, 0.15, 160, 20, true), texMat(wt, { roughness: 0.95 }), fc, null, null, CREAM_INK);
        K.addFur(m, { layers: 14, length: 0.06, gravity: 0.02, repeat: [18, 2] });
      }
      // paws: slightly taller than wide, as drawn gripping the tablet edges
      ['L', 'R'].forEach(k => { const p = K.hands[k].p; K.poseG.children.forEach(o => { if (o.isMesh && o.position.distanceTo(p) < 1e-4) o.scale.set(0.95, 1.15, 0.92); }); });
      // eye highlights sit at the upper-RIGHT of each eye in the picture
      K.eyes.forEach(eg => eg.traverse(o => { if (o.isMesh && o.material === K.M.shine) o.position.x *= -1; }));

      /* ---------------- blue tablet with a cream snowflake label, held upright in both paws ---------------- */
      const tabG = part('tablet', K.body);
      {
        const tg = group(tabG, [0.01, 0, 0.93]);
        const tm = M(TAB), gm = M(GOLD, { roughness: 0.5, metalness: 0.1 });
        mesh(roundBox(0.3, 0.92, 0.1, 0.035, 0.018), tm, tg, [0, 2.12, 0], null, TAB_INK);
        const lab = canvasTex(128, 320, (g, w, h) => {
          g.fillStyle = TAB_CREAM; g.fillRect(0, 0, w, h);
          g.strokeStyle = '#E0CFB7'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
          flakeC(g, w / 2, h * 0.42, 30, FLAKE_BLUE, 5);
        });
        lab.repeat.set(1 / 0.18, 1 / 0.46); lab.offset.set(0.5, 0.5);   // extrude UVs are in shape units, centred on 0
        mesh(roundBox(0.18, 0.46, 0.02, 0.02, 0.008), [texMat(lab, { roughness: 0.7 }), M(TAB_CREAM)], tg, [0, 2.2, 0.052], null, TAB_INK);
        mesh(roundBox(0.34, 0.08, 0.13, 0.025, 0.012), gm, tg, [0, 2.61, 0], null, GOLD_INK);
        mesh(roundBox(0.32, 0.035, 0.115, 0.012, 0.008), gm, tg, [0, 1.75, 0], null, GOLD_INK);
      }

      /* ---------------- feet: big round tawny paws under the hem ---------------- */
      {
        const fm = M(FEET, { roughness: 0.95 }), cm = M('#C9936C');
        [-1, 1].forEach(sx => {
          const fg = group(K.poseG, [0.53 * sx, 0, 0.66]);
          mesh(sphere(0.3, 40, 30), fm, fg, [0, 0.15, 0], [1.08, 0.62, 1.1], FEET_INK);
          [-0.1, 0.1].forEach(dx => mesh(tube([[dx, 0.22, 0.3], [dx * 1.05, 0.13, 0.33], [dx * 1.1, 0.05, 0.31]], 0.008, 8, 5), cm, fg));
        });
      }

      /* ---------------- floating decorations: snowflake, wind swirls, plum branch, snowy pine, snow dots ---------------- */
      {
        const items = [];
        const swirl = (pos, s, flip) => {
          const g = group(K.decor, pos); g.scale.set(flip ? -s : s, s, s);
          const curl = [];
          for (let i = 0; i <= 40; i++) { const t = i / 40, a = -Math.PI * 0.5 + Math.PI * 2.2 * t, r = 0.26 * (1 - 0.7 * t); curl.push([-0.35 + Math.cos(a) * r, 0.12 + Math.sin(a) * r, 0]); }
          const tail = [[0.75, -0.18, 0], [0.35, -0.2, 0], [0.0, -0.1, 0], [-0.3, -0.14, 0]];
          const sm = mesh(tube(tail.concat(curl), t => 0.07 * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(t * 1.2, 1))) + 0.01, 120, 10), M(WIND, { roughness: 0.7 }), g, null, null, WIND_INK);
          sm.scale.z = 0.45;
          return g;
        };
        items.push(swirl([-1.38, 2.42, 0.2], 0.62, false));
        items.push(swirl([1.62, 1.86, 0.25], 0.55, true));
        { // pale-blue six-armed snowflake with little side branches
          const g = group(K.decor, [-1.36, 3.07, 0.3]), fm = M('#E2E9F3', { roughness: 0.6 });
          for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3, d = V(Math.sin(a), Math.cos(a), 0), n = V(Math.cos(a), -Math.sin(a), 0);
            mesh(tube([V(0, 0, 0), d.clone().multiplyScalar(0.17)], 0.014, 4, 6), fm, g, null, null, '#A7B6CD');
            [0.08, 0.12].forEach(k => [-1, 1].forEach(sd => {
              const p0 = d.clone().multiplyScalar(k), p1 = p0.clone().addScaledVector(d, 0.045).addScaledVector(n, 0.045 * sd);
              mesh(tube([p0, p1], 0.01, 3, 6), fm, g, null, null, '#A7B6CD');
            }));
          }
          mesh(sphere(0.025, 12, 10), fm, g, null, null, '#A7B6CD');
          items.push(g);
        }
        // plum branch (image-left)
        {
          const g = group(K.decor, [-1.55, 1.75, 0.3]);
          const tm = M(TWIG, { roughness: 0.9 });
          mesh(tube([[0.3, -0.36, 0], [0.12, -0.1, 0], [-0.02, 0.12, 0], [-0.08, 0.36, 0]], 0.022, 30, 6), tm, g);
          mesh(tube([[0.12, -0.1, 0], [0.24, 0.05, 0], [0.26, 0.2, 0]], 0.016, 20, 6), tm, g);
          [[-0.08, 0.38], [0.26, 0.22], [0.2, -0.26], [0.04, 0.22]].forEach(([x, y]) => mesh(sphere(0.045, 16, 12), M(BUD), g, [x, y, 0.01], [1, 1.2, 1], '#A85C4C'));
          const f = K.flower(g, [-0.02, 0.02, 0.05], 0.3, PLUM, PLUM_C, 5);
          f.children.forEach(m => { if (m.isMesh) K.outline(m, '#CDBBA6'); });
          items.push(g);
        }
        // snowy pine sprig (image-right)
        {
          const g = group(K.decor, [1.52, 2.46, 0.2], [0, 0, 0.35]);
          mesh(tube([[-0.34, -0.2, 0], [0, 0, 0], [0.32, 0.14, 0]], 0.02, 24, 6), M(TWIG, { roughness: 0.9 }), g);
          const pm = M(PINE_DK, { roughness: 0.8 });
          [[-0.12, -0.07, 0.3, 90], [0.14, 0.06, 0.26, 70], [0.3, 0.13, 0.22, 20]].forEach(([x, y, L, dir]) => {
            for (let i = 0; i < 9; i++) {
              const a = rad(dir - 55 + i * 13.75);
              mesh(tube([[x, y, 0], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5, 0.01], [x + Math.cos(a) * L, y + Math.sin(a) * L, 0]], t => 0.011 * (1 - 0.7 * t), 8, 5), pm, g);
            }
          });
          mesh(sphere(0.07, 20, 14), M('#FBFBFB'), g, [0.24, 0.24, 0.02], [1.3, 0.7, 1], '#C9D2DE');
          items.push(g);
        }
        // snow dots
        [[-1.43, 3.52, 0.1, 0.05], [1.39, 3.19, 0.1, 0.045], [1.26, 3.03, 0.2, 0.03], [1.11, 2.37, 0.5, 0.035], [-1.51, 1.19, 0.4, 0.045], [-1.33, 1.1, 0.4, 0.03], [1.92, 1.02, 0.3, 0.035]].forEach(([x, y, z, r]) => {
          items.push(group(K.decor, [x, y, z]));
          mesh(sphere(r, 16, 12), M('#FFFFFF'), items[items.length - 1], null, null, '#D5DCE6');
        });
        items.forEach(g => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.08 * Math.sin(t * 0.8 + i) * k;
        }));
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '迎接冬天的玄冥使者',
        text: '立冬是冬季的開始，古時天子要率百官到北郊「迎冬」。這隻獰貓化身替冬神玄冥傳令的迎冬官：戴小官帽、雙手捧著雪花笏板，披上雪花披肩與白毛領，把松、梅與初雪一起穿在身上。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '獰貓的臉紋',
        text: '茶橘色的寬臉兩側炸出尖尖的毛，額頭有兩道深褐直紋延伸到帽下，眼睛上方各有一塊白斑和一道彎彎的褐色眉紋；兩頰各兩道深色條紋與短鬍鬚，圓圓的深棕眼睛、粉紅小鼻和「ω」嘴，腮紅上還點著小點點。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '長簇毛高尖耳', dir: [0.2, 0.3, 1],
        text: '獰貓最醒目的特徵：一對又高又尖、向外斜開的大耳朵，耳內淡粉並長著白色絨毛，靠內側的耳緣與耳背是深褐色，耳尖再冒出一撮長長的黑色簇毛向外飛翹。' },
      hat: { chip: '官帽', tag: '服飾', name: '玉扣小官帽',
        text: '深灰藍的圓頂小帽只蓋住頭頂，帽身有幾道金色直稜、帽緣壓金邊；正前方嵌一顆金框青玉扣，左側橫插金簪，右側簪著一朵白梅和一把松針，是「歲寒」的象徵。' },
      tablet: { chip: '笏板', tag: '道具', name: '雪花笏板',
        text: '雙爪在胸前一左一右扶住一塊直立的灰藍笏板，頂端套著金色板頭、底部有金箍，中央的米白籤面上畫著一朵淡藍雪花，代表奉命迎接初雪。' },
      cape: { chip: '披肩', tag: '服飾', name: '雪花披肩與白毛領',
        text: '脖子圍一圈蓬鬆的白毛領，底下是灰藍色短披肩：前短後長、從領口斜斜向兩側垂下，邊緣收一道米白與淡金細邊，上面散落白色雪花；領口兩側各有一顆金色盤花結，垂下細金繩。' },
      sleeves: { chip: '寬袖', tag: '服飾', name: '松梅大袖',
        text: '米白大袖垂到腰下，袖面繡著墨綠松針與白梅、紅花苞的枝條；袖口是寬寬的灰藍鑲邊，內襯淡紫灰，從手腕一路直垂到袖底。' },
      robe: { chip: '袍服', tag: '服飾', name: '遠山外袍與前擋',
        text: '外層是對襟米白長袍，下襬繡淡藍遠山、白色水紋與一道金線，收一圈灰藍寬邊；中間露出淡紫灰內袍，正前方垂一片米白前擋，灰藍框內畫著山巒與一枝梅花。' },
      belt: { chip: '腰結', tag: '服飾', name: '松綠蝴蝶結與玉墜',
        text: '笏板下方的腰間繫著鼠尾草綠的大蝴蝶結，兩條長長的緞帶垂到膝前；中間的金繩串著一顆青玉珠，下面再垂一撮金色流蘇。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '深色尾尖', dir: [1, 0.3, -0.7],
        text: '蓬鬆的茶橘色尾巴從右後方繞出、向上豎起，上段三分之一轉成深褐色，交界像火焰般參差，尾尖再向外捲成一個小勾。' },
      pose: { chip: '姿態', tag: '貓咪本體', name: '捧笏站姿',
        text: '雙腳併攏站得端正，圓圓的茶橘腳掌從袍底露出；兩隻前爪從大袖裡伸出、扶穩笏板，一臉溫和地準備上朝迎冬。按下「行禮」可以看牠鞠躬。' }
    },
    order: ['overview', 'face', 'ears', 'hat', 'tablet', 'cape', 'sleeves', 'robe', 'belt', 'tail', 'pose']
  });
})();
