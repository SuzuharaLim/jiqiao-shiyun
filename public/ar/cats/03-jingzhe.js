// @file 03_驚蟄_金吉拉貓
// @title 驚蟄・擊鼓小雷公 | 二十四節氣貓
(function () {
  /* Colours are SAMPLED from refs/03.png (tools/colors.py); def.exposure dims the lights so they
   * render close to the picture. M(hex, f) = optional per-colour correction (f > 1 darkens).
   * Layout: 1 world unit ≈ 100 px of the 480×525 picture; x = (px − 226.5) / 100, y = (495 − py) / 100. */
  const EXPOSURE = 0.76;
  function M(hex, f) {
    f = f || 1; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f, 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  // ---- fur ----
  const FUR_TOP = '#BDB6B7', FUR_MID = '#D2CBCA', FUR_LOW = M('#F2ECE8', 0.85);
  const STRIPE = '#A59C9B', CREAM = M('#FFFAF4', 0.8), FUR_INK = '#A8968C', CREAM_INK = '#CDB9A8';
  const TAIL = '#EAE3E2', TAIL_DEEP = '#DCD4D3';
  // ---- face ----
  const EAR_IN = M('#F7CDBE'), NOSE = M('#F2B3A4'), BLUSH = 'rgba(248,170,152,0.62)';
  // ---- clothes ----
  const ROBE = M('#FBF1D9', 1.25), SKIRT = M('#F7EEDD', 1.25), UNDER = M('#B6B6C4', 1.15);
  const LAV = M('#B7AAC2'), LAV_DRUM = M('#A597B7'), LAV_CLOUD = M('#C8B7D3'), LAV_INK = '#8C7CA2', LAV_PALE = M('#E4DCEA');
  const GOLD = M('#F6D68E', 1.25), GOLD_PALE = M('#FBE7B0', 1.25), GOLD_D = M('#E2B45E', 1.2), GOLD_INK = '#C09A55';
  const GREEN = M('#BFCC84'), GREEN_D = M('#A3B46A'), GREEN_INK = '#8C9E57';
  const WOOD = M('#B98F5E'), MEDAL = M('#AD9DBD');
  const ROBE_INK = '#C3A472';

  // wide zig-zag lightning like the picture's emblem (s = half height)
  function zap(g, x, y, s, fill, edge) {
    const pts = [[0.22, -1], [-0.46, 0.12], [-0.04, 0.12], [-0.22, 1], [0.48, -0.18], [0.06, -0.18]];
    g.save(); g.translate(x, y); g.lineJoin = 'round';
    g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px * s, py * s) : g.moveTo(px * s, py * s)); g.closePath();
    g.fillStyle = fill; g.fill();
    if (edge) { g.strokeStyle = edge; g.lineWidth = Math.max(2, s * 0.07); g.stroke(); }
    g.restore();
  }
  // lavender 祥雲 lump with a pale spiral (drawn around 0,0 with radius r in canvas px)
  function curl(g, r, col, line) {
    g.fillStyle = col;
    g.beginPath(); g.ellipse(0, 0, r * 1.15, r, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(r * 1.05, r * 0.28, r * 0.72, r * 0.62, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(-r * 0.95, r * 0.35, r * 0.55, r * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = line; g.lineWidth = r * 0.17; g.lineCap = 'round'; g.beginPath();
    for (let a = 0; a <= Math.PI * 3.1; a += 0.12) {
      const rr = r * 0.72 * (1 - a / (Math.PI * 3.5)), px = Math.cos(a + Math.PI) * rr * 1.1, py = Math.sin(a + Math.PI) * rr;
      a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.stroke();
  }
  function sprout2(g, x, y, s, col) {     // two round leaves on a short stem (s in the current canvas units)
    g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round';
    g.lineWidth = s * 0.1;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.05, -s * 0.3, 0, -s * 0.55); g.stroke();
    [-1, 1].forEach(k => { g.save(); g.translate(0, -s * 0.55); g.rotate(k * 0.45); g.beginPath(); g.ellipse(k * s * 0.3, -s * 0.08, s * 0.3, s * 0.16, 0, 0, Math.PI * 2); g.fill(); g.restore(); });
    g.restore();
  }

  NEKO.run({
    meta: {
      id: '03', term: '驚蟄', title: '驚蟄・擊鼓小雷公', seal: '蟄',
      eyebrow: '二〇二七節氣貓 · 03 驚蟄 · 金吉拉貓',
      aria: '頭戴紫底金閃電徽章小金冠、冠頂冒嫩芽，背後有白紫小翅膀，身穿米白薰衣草紫寬袖袍、披嫩綠披帛，胸前掛著紫色雷鼓，左爪高舉鼓槌、張嘴歡笑的銀灰金吉拉貓 3D 模型'
    },
    theme: { accent: '#6C5A8A', accentDark: '#C7B9DE', glow: 'rgba(183, 170, 194, 0.34)', glowColor: '#D9CCF2' },
    palette: [['#E6DBD3', '銀灰長毛'], ['#B7AAC2', '薰衣草紫'], ['#F6D68E', '雷光金'], ['#BFCC84', '嫩芽綠']],
    spec: [['品種', '金吉拉貓'], ['角色', '雷公（擊鼓）'], ['頭身比', '約 1 : 1.5']],
    seed: 303,
    exposure: EXPOSURE,

    cat: {
      fur: {
        color: FUR_MID, top: FUR_TOP, mid: FUR_MID, low: FUR_LOW, deep: STRIPE, cream: CREAM,
        ink: FUR_INK, creamInk: CREAM_INK, pattern: 'none',
        noise: { colors: [M('#FFFFFF'), M('#C4B6AE')], alpha: 0.09, n: 1600 },
        paintBase(g, P) {
          const L = (lon, lat) => P.xy(lon, lat);
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.45, FUR_MID); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // cream face: from between the eyes down over muzzle, lower cheeks, chin and throat
          const half = [[0, 20], [7, 22], [15, 16], [24, 10], [31, 3], [37, -5], [46, -13], [56, -23], [66, -35], [76, -52], [86, -72], [90, -90]];
          const poly = half.concat(half.slice().reverse().map(([lo, la]) => [-lo, la]));
          g.filter = 'blur(9px)'; g.fillStyle = CREAM; g.beginPath();
          poly.forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill();
          // soft grey forehead streaks radiating from the crown
          g.filter = 'blur(3px)';
          const wedge = (lonT, lonB, latB, wT, a) => {
            const [x0, y0] = L(lonT - wT, 86), [x1, y1] = L(lonT + wT, 86), [xb, yb] = L(lonB, latB);
            g.fillStyle = NEKO.rgba(STRIPE, a); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
            g.quadraticCurveTo((x1 + xb) / 2 + 3, (y1 + yb) / 2, xb, yb); g.quadraticCurveTo((x0 + xb) / 2 - 3, (y0 + yb) / 2, x0, y0); g.fill();
          };
          wedge(0, 0, 22, 7, 0.6); wedge(-8, -6, 26, 5, 0.55); wedge(8, 6, 26, 5, 0.55);
          wedge(-17, -14, 28, 5, 0.5); wedge(17, 14, 28, 5, 0.5); wedge(-27, -26, 20, 5, 0.45); wedge(27, 26, 20, 5, 0.45);
          wedge(-38, -40, 12, 5, 0.4); wedge(38, 40, 12, 5, 0.4);
          // streaks down the head sides and back
          g.filter = 'blur(4px)';
          [-165, -140, -115, -92, -70, 70, 92, 115, 140, 165, 180].forEach(lon => {
            P.stroke(g, [L(lon, 72), L(lon + (lon > 0 ? 6 : -6), 35), L(lon + (lon > 0 ? 3 : -3), -8)], 13, STRIPE, 0.4);
          });
          // grey outer cheek fluff (the ruff stays silver, only the inner face is cream)
          g.filter = 'blur(10px)';
          [-1, 1].forEach(k => { const [x, y] = L(k * 88, -10); g.fillStyle = NEKO.rgba(FUR_TOP, 0.8); g.beginPath(); g.ellipse(x, y, 40, 70, 0, 0, Math.PI * 2); g.fill(); });
          g.filter = 'none';
        }
      },
      head: {
        y: 3.25, neck: 2.55, roll: -0.1, w: 1.0, h: 0.72, d: 0.84, cheek: 0.16, ruff: 0.085, ruffFreq: 13, chinDrop: 0.03,
        // broad, square-ish crown of the head: widen the upper half so the ears sit on the top corners
        deform(p, o) { if (o.y > 0) p.x *= 1 + 0.15 * Math.sin(Math.PI * Math.min(1, o.y * 1.15)); },
        fur: { layers: 22, length: 0.12, gravity: 0.03, repeat: [10, 6] }
      },
      eyes: { x: 0.38, y: 0.05, r: 0.13, sx: 0.95, sy: 1.06, sz: 0.4, color: '#3E2A1E', shine: 0 },
      nose: { y: -0.02, color: NOSE, size: 0.95 },
      muzzle: { y: -0.12, size: 0.6, color: CREAM },
      mouth: { type: 'open', color: '#6E4B3B', y: -0.095, w: 0.15, depth: 0.045, open: 1.45, inner: M('#DE8E84'), tongue: M('#F5B0A2') },
      blush: { color: BLUSH, x: 0.57, y: -0.13, r: 24 },
      whiskers: { color: '#B09C8E', n: 3, len: 0.42, r: 0.0045, y: -0.05, x: 0.5, spread: 0.07, droop: 0.06, curve: 0.03 },
      ears: {
        x: 0.72, y: 0.38, z: -0.06, tilt: 0.49, yaw: 0.2, pitch: -0.08, size: [0.47, 0.68, 0.2], sharp: 0.86,
        color: FUR_MID, inner: EAR_IN, tuft: '#FFFFFF', tuftScale: 1.45
      },
      bib: {
        color: CREAM,
        balls: [[0, 2.47, 0.4, 0.32], [0.3, 2.42, 0.33, 0.24], [-0.3, 2.42, 0.33, 0.24], [0, 2.3, 0.52, 0.22]],
        fur: { layers: 14, length: 0.09, gravity: 0.03, repeat: [3, 2] }
      },
      robe: {
        profile: [[1.2, 0.5], [1.27, 0.58], [1.25, 0.75], [1.13, 1.02], [0.99, 1.3], [0.85, 1.6], [0.75, 1.9], [0.67, 2.15], [0.53, 2.38], [0.3, 2.5], [0.1, 2.57]],
        color: '#FFFFFF', ink: ROBE_INK, lining: M('#EDE3CC'), hemY: 0.95,
        paint(g, w, h, D, R) {
          const X = deg => 512 + deg / 360 * 1024;
          const dg = (x, y) => Math.asin(Math.max(-0.995, Math.min(0.995, x / R.robeR(y)))) * 180 / Math.PI;
          const pxH = y => 1024 / (2 * Math.PI * R.robeR(y));
          const pxV = y => Math.abs(R.robeV(y - 0.03) - R.robeV(y + 0.03)) / R.onRobe(0, y - 0.03).distanceTo(R.onRobe(0, y + 0.03));
          // fill between two world-x functions, rows y0..y1 (world)
          const strip = (y0, y1, fx0, fx1, col) => {
            g.fillStyle = col;
            for (let y = y0; y < y1; y += 0.01) {
              const a = X(dg(fx0(y), y)), b = X(dg(fx1(y), y)), c0 = R.robeV(y + 0.011), c1 = R.robeV(y);
              g.fillRect(Math.min(a, b), c0, Math.abs(b - a), c1 - c0 + 1.5);
            }
          };
          const K_ = v => () => v;
          g.fillStyle = ROBE; g.fillRect(0, 0, w, h);
          // outer lavender hem border with a gold line on top
          const vHem = R.robeV(0.76);
          g.fillStyle = LAV; g.fillRect(0, vHem, w, h - vHem);
          g.fillStyle = GOLD; g.fillRect(0, R.robeV(0.785), w, R.robeV(0.755) - R.robeV(0.785));
          // front opening: inner wrap skirt (cream, gold diagonal hem, pale under-layer below it)
          const xL = -0.6, xR = 0.44;
          strip(0.4, 1.9, K_(xL), K_(xR), SKIRT);
          // the front flap: its thick gold border curves from the bottom-left up toward the right tassel;
          // under it on the right a blue-grey under-layer, at the bottom the lower skirt's gold hem line
          const yFlap = x => 0.56 + 0.46 * Math.pow(Math.max(0, (x - xL) / 0.86), 2.2);
          for (let x = xL; x < xR; x += 0.01) {
            const y0 = Math.min(yFlap(x), 1.2);
            if (x > -0.05) strip(0.56, y0, K_(x), K_(x + 0.011), UNDER);
            if (x < 0.3) strip(y0 - 0.035, y0 + 0.035, K_(x), K_(x + 0.011), GOLD);
          }
          strip(0.5, 0.53, K_(xL), K_(xR), GOLD);
          // faint lavender cloud lines on the skirt
          g.strokeStyle = NEKO.rgba(LAV, 0.45); g.lineWidth = 5; g.lineCap = 'round';
          [[-0.35, 0.98, 0.12], [-0.05, 0.8, 0.1], [0.2, 1.12, 0.09]].forEach(([x, y, r]) => {
            g.save(); g.translate(X(dg(x, y)), R.robeV(y)); g.scale(pxH(y), pxV(y));
            g.lineWidth = 0.02; g.beginPath(); g.arc(0, 0, r, Math.PI * 1.0, Math.PI * 2.05); g.stroke();
            g.beginPath(); g.arc(r * 0.9, 0, r * 0.55, Math.PI * 1.1, Math.PI * 2.2); g.stroke(); g.restore();
          });
          // facings of the opening: left lavender band with gold edges; right gold tie + lavender strip
          strip(0.42, 1.9, K_(-0.87), K_(xL), GOLD);
          strip(0.42, 1.9, K_(-0.845), K_(xL - 0.025), LAV);
          strip(0.42, 1.9, K_(xR), K_(0.64), LAV);
          strip(0.38, 1.9, K_(xR), K_(0.56), GOLD);
          strip(0.38, 1.9, K_(xR + 0.012), K_(0.548), GOLD_PALE);
          // lavender cloud curls + sprouts on the outer robe (front panels, sides, back)
          const cloudAt = (x, y, r, deg) => {
            const dd = deg === undefined ? dg(x, y) : deg;
            g.save(); g.translate(X(dd), R.robeV(y)); g.scale(pxH(y), pxV(y));
            curl(g, r, LAV_CLOUD, '#F6F0F5'); g.restore();
          };
          const sproutAt = (x, y, s, deg) => {
            const dd = deg === undefined ? dg(x, y) : deg;
            g.save(); g.translate(X(dd), R.robeV(y)); g.scale(pxH(y), pxV(y));
            sprout2(g, 0, 0, s, GREEN_D); g.restore();
          };
          cloudAt(-0.9, 0.84, 0.15); cloudAt(0.86, 0.74, 0.19);
          sproutAt(-1.02, 1.08, 0.2); sproutAt(0.74, 1.0, 0.2);
          [[-120, 0.8, 0.17], [120, 0.82, 0.17], [-165, 0.78, 0.16], [165, 0.8, 0.16], [-80, 1.28, 0.12], [80, 1.3, 0.12], [150, 1.35, 0.12], [-150, 1.32, 0.12]]
            .forEach(([deg, y, r]) => cloudAt(0, y, r, deg));
          [[-120, 1.1, 0.18], [120, 1.1, 0.18], [-160, 1.08, 0.17], [165, 1.1, 0.17], [180, 1.5, 0.14], [-60, 1.55, 0.14], [60, 1.5, 0.14]]
            .forEach(([deg, y, s]) => sproutAt(0, y, s, deg));
        }
      },
      collar: { color: LAV, r: 0.042, over: -1, y0: 2.36, style: 'cross' },
      arms: {
        L: { hand: [-1.135, 2.86, 0.48], path: [[-0.6, 2.35, 0.0], [-1.15, 2.3, 0.3], [-1.14, 2.7, 0.44]], pawScale: 1.8, wrist: false },
        R: { hand: [0.69, 1.99, 1.05], path: [[0.6, 2.35, 0.0], [0.8, 2.06, 0.5], [0.72, 2.0, 0.93]], pawScale: 1.65, wrist: false }
      },
      sleeves: false,
      paws: { color: M('#FBF6EE'), ink: CREAM_INK },
      belt: { yT: 1.84, yB: 1.68, color: LAV, line: GOLD, knot: false, ink: LAV_INK, tassel: false },
      feet: false,
      tail: {
        pts: [[0.45, 0.64, -0.75], [1.2, 0.52, -0.62], [1.88, 0.84, -0.45], [2.02, 1.4, -0.4], [1.74, 1.66, -0.42], [1.42, 1.6, -0.46]],
        r: 0.38,
        shape: t => (0.86 + 0.3 * Math.min(1, t / 0.55)) * (t < 0.84 ? 1 : Math.sqrt(Math.max(0.03, 1 - Math.pow((t - 0.84) / 0.16, 2)))),
        color: TAIL, deep: TAIL_DEEP, tip: M('#EEE6E0', 1.08), tipStart: 0.85, bands: 3, bandAlpha: 0.3, ink: FUR_INK,
        fur: { layers: 20, length: 0.13, gravity: 0.035, repeat: [14, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, tube, ribbon, lathe, extrude, D, body, head, decor } = K;
      const UP = V(0, 1, 0);
      const goldM = std(GOLD, { roughness: 0.45, metalness: 0.12 });
      const goldPM = std(GOLD_PALE, { roughness: 0.5, metalness: 0.08 });
      const goldDM = std(GOLD_D, { roughness: 0.5, metalness: 0.1 });
      const lavM = std(LAV, { roughness: 0.8 });
      const lavSM = std(LAV, { roughness: 0.8, side: THREE.DoubleSide });
      const greenSM = std(GREEN, { roughness: 0.8, side: THREE.DoubleSide });
      const leafM = std(M('#B7C878'), { roughness: 0.7, side: THREE.DoubleSide });
      const stemM = std(GREEN_D, { roughness: 0.8 });
      const creamM = std(ROBE, { roughness: 0.85 });
      const pawM = std(M('#FBF6EE'), { roughness: 0.9, emissive: new THREE.Color(M('#FBF6EE')).convertSRGBToLinear(), emissiveIntensity: 0.14 });

      // the head is centred on the body in the picture: undo the sideways shift of the roll pivot
      K.headG.position.x = -0.015;
      // lift the shaded lower face a little (picture-book flat shading); fur shells clone this material
      K.headMesh.material.emissiveMap = K.headMesh.material.map; K.headMesh.material.emissive = new THREE.Color('#FFFFFF'); K.headMesh.material.emissiveIntensity = 0.16;

      // ---------- eyes: dark-brown discs, lighter at the bottom, one big highlight upper-right ----------
      const eyeTex = canvasTex(256, 256, (g) => {
        const lg = g.createLinearGradient(0, 0, 0, 256);
        lg.addColorStop(0, '#3A271C'); lg.addColorStop(0.5, '#4E3526'); lg.addColorStop(1, '#8A664C');
        g.fillStyle = lg; g.beginPath(); g.arc(128, 128, 127, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#2E1F16'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2); g.stroke();
      });
      K.eyes.forEach((eg, i) => {
        const sx = i === 0 ? -1 : 1, R0 = 0.13;
        const disc = mesh(new THREE.CircleGeometry(R0 * 0.97, 40), texMat(eyeTex, { roughness: 0.3 }), eg, [0, 0, R0 * 0.4 + 0.002], [0.95, 1.06, 1]);
        disc.castShadow = false;
        mesh(sphere(0.036, 20, 14), K.M.shine, eg, [sx < 0 ? 0.035 : 0.02, 0.045, R0 * 0.4 + 0.006], [1, 1, 0.35]).castShadow = false;
        mesh(sphere(0.012, 12, 10), K.M.shine, eg, [-0.035, -0.05, R0 * 0.4 + 0.005], [1, 1, 0.35]).castShadow = false;
      });

      // ---------- feet: big round white stubby feet with two toe grooves ----------
      const feetG = part('pose', body);
      const toeM = std(M('#D9C6B6'), { roughness: 0.9 });
      [[-0.56, 0.3], [0.57, 0.34]].forEach(([x, hw]) => {
        const f = mesh(sphere(1, 40, 30), pawM, feetG, [x, 0.3, 0.62], [hw, 0.32, 0.36], CREAM_INK);
        K.addFur(f, { layers: 6, length: 0.035, gravity: 0.01, repeat: [5, 5] });
        mesh(sphere(1, 28, 20), pawM, feetG, [x, 0.52, 0.5], [hw * 0.9, 0.2, 0.3]);
        [-0.33, 0.33].forEach(k => mesh(tube([[x + k * hw, 0.2, 0.93], [x + k * hw * 1.05, 0.1, 0.96], [x + k * hw * 1.08, 0.03, 0.9]], 0.011, 12, 6), toeM, feetG));
        // short furry leg rising from the foot up under the robe (into the hem cap below)
        mesh(new THREE.CylinderGeometry(hw * 0.78, hw * 0.86, 0.34, 28), pawM, feetG, [x, 0.62, 0.42]);
      });
      // underside of the robe: a lining-coloured cap just above the hem so the legs visibly go up into the robe
      {
        const yC = 0.7, cap = mesh(new THREE.CircleGeometry(K.robeR(yC) + 0.004, 128), std(M('#E2D6BD'), { roughness: 0.95, side: THREE.DoubleSide }), part('robe', body), [0, yC, 0]);
        cap.rotation.x = Math.PI / 2; cap.castShadow = false;
      }

      /* ---------- sleeves: open "bag" sleeves (custom sweep with a slanted mouth) ----------
       * o.B bottom, o.T top of the axis; o.prof [[s, r]] radius along the axis; o.az depth factor;
       * o.cut(θ) → s of the rim at angle θ (0 = image-right, π/2 = front); paint(g, w, h) outer fabric
       * (u = θ / 2π → canvas x, s → canvas y from the bottom). */
      const sleevesG = part('robe', body);
      function bag(o) {
        const B = V(...o.B), T = V(...o.T), Y = T.clone().sub(B), H = Y.length(); Y.normalize();
        const Xa = V(1, 0, 0).addScaledVector(Y, -Y.x).normalize(), Z = Xa.clone().cross(Y).normalize();
        const spl = new THREE.SplineCurve(o.prof.map(([s, r]) => new THREE.Vector2(s, r))).getPoints(240);
        const rAt = s => { for (let i = 1; i < spl.length; i++) if (spl[i].x >= s) { const a = spl[i - 1], b = spl[i]; return a.y + (b.y - a.y) * (s - a.x) / (b.x - a.x || 1); } return spl[spl.length - 1].y; };
        const NA = 96, NS = 40, pos = [], uv = [], idx = [], rim = [];
        const P = (th, s) => { const r = Math.max(rAt(s), 0.0005); return B.clone().addScaledVector(Y, s * H).addScaledVector(Xa, r * Math.cos(th)).addScaledVector(Z, r * Math.sin(th) * o.az); };
        for (let i = 0; i <= NA; i++) {
          const th = i / NA * Math.PI * 2, sc = o.cut ? o.cut(th) : 1;
          for (let j = 0; j <= NS; j++) {
            const s = sc * Math.pow(j / NS, 0.85), p = P(th, s);
            pos.push(p.x, p.y, p.z); uv.push(i / NA, s);
          }
          if (i < NA) rim.push(P(th, sc));
        }
        for (let i = 0; i < NA; i++) for (let j = 0; j < NS; j++) {
          const a = i * (NS + 1) + j, b = a + NS + 1;
          idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        // make sure normals point outward
        const k0 = Math.floor(NA / 4) * (NS + 1) + Math.floor(NS / 2), pv = V(pos[k0 * 3], pos[k0 * 3 + 1], pos[k0 * 3 + 2]);
        const nv = V().fromBufferAttribute(geo.attributes.normal, k0), ax = B.clone().addScaledVector(Y, Y.dot(pv.clone().sub(B)));
        if (nv.dot(pv.clone().sub(ax)) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } geo.setIndex(idx); K.smoothNormals(geo); }
        const tex = canvasTex(1024, 512, (g, w, h) => o.paint(g, w, h));
        // an open bag gets no outline hull (it would show through the mouth instead of the green lining)
        const m = mesh(geo, texMat(tex, { roughness: 0.85 }), sleevesG, null, null, o.cut ? null : ROBE_INK);
        const lin = new THREE.Mesh(geo, std(o.lining || GREEN, { roughness: 0.9, side: THREE.BackSide })); lin.receiveShadow = true; sleevesG.add(lin);
        if (o.cut) mesh(tube(new THREE.CatmullRomCurve3(rim, true), 0.022, 160, 8, true), goldM, sleevesG, null, null, GOLD_INK);
        return { m, P, rAt, H, B, Y, Xa, Z };
      }
      // shared fabric painter: cream, gold lightning + lavender cloud at given u, lavender cuff band along the rim
      function fabric(o) {
        return (g, w, h) => {
          g.fillStyle = ROBE; g.fillRect(0, 0, w, h);
          const Y = s => (1 - s) * h;
          if (o.cut) {         // band just under the rim: gold line, lavender, gold line
            for (let i = 0; i < w; i += 2) {
              const sc = o.cut(i / w * Math.PI * 2);
              g.fillStyle = GOLD; g.fillRect(i, Y(sc) - 1, 2, o.band * h + 8);
              g.fillStyle = LAV; g.fillRect(i, Y(sc) + 2, 2, o.band * h);
            }
          }
          if (o.stripe) {      // painted vertical cuff band (closed bag): [u0, u1] at the top, [u0b, u1b] at the bottom
            const [ut0, ut1, ub0, ub1, s0, s1] = o.stripe;
            for (let y = 0; y < h; y += 2) {
              const s = 1 - y / h; if (s < s0 || s > s1) continue;
              const q = (s - s0) / (s1 - s0), u0 = ub0 + (ut0 - ub0) * q, u1 = ub1 + (ut1 - ub1) * q;
              g.fillStyle = GOLD; g.fillRect(u0 * w - 7, y, (u1 - u0) * w + 14, 2);
              g.fillStyle = LAV; g.fillRect(u0 * w, y, (u1 - u0) * w, 2);
            }
            if (o.greenPatch) { const [gu0, gu1, gs0, gs1] = o.greenPatch; g.fillStyle = GREEN; g.fillRect(gu0 * w, Y(gs1), (gu1 - gu0) * w, (gs1 - gs0) * h); }
          }
          // lightning (upright on the front) and a cloud near the bottom
          const bx = o.bolt[0] * w, by = Y(o.bolt[1]);
          g.save(); g.translate(bx, by); g.scale(1, o.boltSY || 1); zap(g, 0, 0, o.bolt[2] * h, GOLD, GOLD_D); g.restore();
          g.save(); g.translate(o.cloud[0] * w, Y(o.cloud[1])); g.scale(o.cloudSX || 1, 1); curl(g, o.cloud[2] * h, LAV_CLOUD, '#F6F0F5'); g.restore();
          // lavender bottom cap
          g.fillStyle = LAV_CLOUD; g.fillRect(0, h - o.cap * h, w, o.cap * h);
        };
      }
      // image-left: raised arm, the wide sleeve falls from the wrist; the mouth faces up-left (green lining inside)
      const cutL = th => 0.24 + 0.76 * Math.pow((1 + Math.cos(th + 0.12)) / 2, 1.3);
      const sleeveL = bag({
        B: [-0.97, 1.64, 0.18], T: [-1.24, 2.8, 0.28], az: 0.72,
        prof: [[0, 0], [0.05, 0.32], [0.15, 0.45], [0.35, 0.5], [0.6, 0.48], [0.8, 0.41], [0.93, 0.31], [1, 0.22]],
        cut: cutL,
        paint: fabric({ cut: cutL, band: 0.1, bolt: [0.17, 0.36, 0.12], boltSY: 1, cloud: [0.29, 0.14, 0.1], cloudSX: 0.5, cap: 0.0 })
      });
      // image-right: sleeve hangs from the shoulder; painted cuff band down its inner front edge
      const sleeveR = bag({
        B: [1.13, 0.98, 0.1], T: [0.64, 2.42, 0.02], az: 0.78,
        prof: [[0, 0], [0.03, 0.26], [0.1, 0.36], [0.3, 0.4], [0.55, 0.35], [0.8, 0.27], [1, 0.2]],
        paint: fabric({ stripe: [0.235, 0.29, 0.2, 0.255, 0.03, 0.8], greenPatch: [0.29, 0.34, 0.5, 0.78], bolt: [0.15, 0.4, 0.1], cloud: [0.12, 0.15, 0.08], cloudSX: 0.55, cap: 0.0 })
      });
      // upper arms (hidden mostly) and forearms reaching the paws
      mesh(tube([[-0.48, 2.38, 0.0], [-0.62, 2.34, 0.06], [-0.76, 2.3, 0.12]], 0.2, 12, 16), creamM, sleevesG, null, null, ROBE_INK);
      // raised image-left forearm: the sleeve fabric continues from the elbow (inside the big sleeve) up to a
      // lavender cuff at the wrist, and the paw comes out of that cuff
      {
        const pw = K.hands.L.p, E0 = V(-0.74, 2.3, 0.12), E1 = V(-1.0, 2.36, 0.26), E2 = V(-1.1, 2.52, 0.38);
        const dir = pw.clone().sub(E2).normalize(), W = pw.clone().addScaledVector(dir, -0.17);
        const fc = new THREE.CatmullRomCurve3([E0, E1, E2, W]);
        mesh(tube(fc, t => 0.19 - 0.035 * t, 40, 20), creamM, sleevesG, null, null, ROBE_INK);
        const cg = group(sleevesG, W); cg.quaternion.setFromUnitVectors(V(0, 0, 1), fc.getTangentAt(1));
        mesh(new THREE.CylinderGeometry(0.172, 0.172, 0.1, 40, 1, true), std(LAV, { roughness: 0.8, side: THREE.DoubleSide }), cg, [0, 0, -0.03], null, LAV_INK).rotation.x = Math.PI / 2;
        [0.02, -0.08].forEach(z => mesh(new THREE.TorusGeometry(0.174, 0.016, 8, 40), goldM, cg, [0, 0, z]));
        mesh(sphere(0.15, 24, 18), pawM, cg, [0, 0, 0.04], [1, 1, 0.8]);          // wrist fur filling the cuff
      }
      {
        const a = sleeveR.P(2.0, 0.66), w = K.hands.R.p.clone().add(V(0.05, 0.02, -0.14));
        mesh(tube([a.toArray(), a.clone().lerp(w, 0.5).add(V(0.02, 0.0, 0)).toArray(), w.toArray()], 0.14, 16, 16), creamM, sleevesG, null, null, ROBE_INK);
      }

      // ---------- lightning drum hung in front of the belly ----------
      const drumG = part('drum', body);
      const TILT = 0.55, DR = 0.53, DH = 0.44;
      const drum = group(drumG, [0.0, 1.66, 1.38], [TILT, 0, 0]);
      mesh(new THREE.CylinderGeometry(DR, DR, DH, 72, 1, false), std(LAV_DRUM, { roughness: 0.75 }), drum, null, null, LAV_INK);
      const faceTex = canvasTex(512, 512, (g) => {
        g.fillStyle = M('#F8E6BB', 1.2); g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
        g.fillStyle = LAV_CLOUD;
        [[140, 400, 64], [84, 350, 46], [214, 440, 50], [360, 412, 62], [428, 350, 48], [292, 446, 44]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
        g.strokeStyle = '#F4EEF4'; g.lineWidth = 9; g.lineCap = 'round';
        [[140, 400, 30], [360, 414, 28]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, Math.PI * 0.8, Math.PI * 2.3); g.stroke(); });
        zap(g, 262, 205, 175, GOLD, GOLD_D);
      });
      const dface = mesh(new THREE.CircleGeometry(DR * 0.95, 64), texMat(faceTex, { roughness: 0.7 }), drum, [0, DH / 2 + 0.004, 0]);
      dface.rotation.x = -Math.PI / 2; dface.castShadow = false;
      const ring = (y, r, tb) => { const o = mesh(new THREE.TorusGeometry(r, tb, 12, 96), goldM, drum, [0, y, 0], null, GOLD_INK); o.rotation.x = Math.PI / 2; return o; };
      ring(DH / 2, DR * 0.975, 0.042); ring(-DH / 2, DR * 1.0, 0.04); ring(-DH * 0.12, DR * 1.005, 0.022);
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2;
        mesh(sphere(0.045, 16, 12), goldM, drum, [Math.sin(a) * DR * 1.01, DH * 0.14, Math.cos(a) * DR * 1.01], null, GOLD_INK);
      }
      // strap rings at the back corners of the top rim
      const ringPos = sx => V(0.4 * sx, DH / 2 + 0.03, -0.33);
      [-1, 1].forEach(sx => { const r = mesh(new THREE.TorusGeometry(0.06, 0.02, 8, 24), goldM, drum, ringPos(sx), null, GOLD_INK); r.rotation.y = sx * 0.8; });
      // quatrefoil knots with lavender tassels (front-left and front-right of the lower drum)
      body.updateMatrixWorld(true);
      [[-0.95, -0.3], [0.45, -0.34]].forEach(([a, yy]) => {
        const p = V(Math.sin(a) * (DR + 0.045), DH * yy, Math.cos(a) * (DR + 0.045));
        const kg = group(drum, p); kg.rotation.set(-TILT * 0.6, a, 0);
        for (let i = 0; i < 4; i++) { const b = i / 4 * Math.PI * 2 + Math.PI / 4; mesh(sphere(0.078, 18, 12), goldM, kg, [Math.cos(b) * 0.088, Math.sin(b) * 0.088, 0], [1, 1, 0.5], GOLD_INK); }
        mesh(sphere(0.048, 14, 10), goldDM, kg, [0, 0, 0.03]);
        const wp = drum.localToWorld(p.clone());
        K.tassel(drumG, wp.clone().add(V(0, -0.1, 0.02)), LAV, 0.26, 0.058, LAV_INK);
      });
      // shoulder straps (over the shoulders, down the back)
      const strapM = std(LAV, { roughness: 0.8, side: THREE.DoubleSide });
      [-1, 1].forEach(sx => {
        const r0 = drum.localToWorld(ringPos(sx));
        const pts = [[r0.x, r0.y + 0.03, r0.z], [0.46 * sx, 2.22, 0.86], [0.5 * sx, 2.42, 0.58], [0.54 * sx, 2.52, 0.2], [0.54 * sx, 2.48, -0.28], [0.46 * sx, 2.1, -0.66], [0.4 * sx, 1.85, -0.78]];
        mesh(ribbon(pts, 0.13, { face: [0, 0.3, 1], segs: 60 }), strapM, drumG, null, null, LAV_INK);
      });

      // ---------- drumsticks (each pivots at its paw) ----------
      const sticksG = part('sticks', body);
      function stick(hand, tipPos, below) {
        const d = V(...tipPos).sub(hand), len = d.length(); d.normalize();
        const g = group(sticksG, hand);
        const a = d.clone().multiplyScalar(-below), b = d.clone().multiplyScalar(len - 0.1);
        mesh(tube([a, b], 0.03, 8, 10), std(WOOD, { roughness: 0.7 }), g, null, null, '#8A6440');
        mesh(sphere(0.12, 28, 20), goldM, g, d.clone().multiplyScalar(len), null, GOLD_INK);
        mesh(sphere(0.032, 12, 10), std(WOOD), g, a);
        return g;
      }
      const stickL = stick(K.hands.L.p, [-0.785, 3.37, 0.95], 0.28);
      const stickR = stick(K.hands.R.p, [0.265, 2.3, 1.3], 0.26);

      // ---------- wings: three tiers of scalloped feathers, white → lavender, gold rim ----------
      const wingsG = part('wings', body);
      const LE = { p0: [0, 0.02], c: [0.78, 0.62], p1: [1.95, 0.84] };
      const bez = (t) => [0, 1].map(i => (1 - t) * (1 - t) * LE.p0[i] + 2 * (1 - t) * t * LE.c[i] + t * t * LE.p1[i]);
      function wingShape(tEnd, anchors, sx) {
        const s = new THREE.Shape(), P = (x, y) => [x * sx, y];
        const tip = bez(tEnd), ctrl = [0, 1].map(i => (1 - tEnd) * LE.p0[i] + tEnd * LE.c[i]);
        const cx = anchors.reduce((q, p) => q + p[0], tip[0]) / (anchors.length + 1), cy = anchors.reduce((q, p) => q + p[1], tip[1]) / (anchors.length + 1);
        s.moveTo(...P(LE.p0[0], LE.p0[1]));
        s.quadraticCurveTo(...P(ctrl[0], ctrl[1]), ...P(tip[0], tip[1]));
        let prev = tip;
        anchors.forEach(p1 => {
          const mx = (prev[0] + p1[0]) / 2, my = (prev[1] + p1[1]) / 2, dx = p1[0] - prev[0], dy = p1[1] - prev[1], L = Math.hypot(dx, dy);
          let nx = dy / L, ny = -dx / L;
          if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
          s.quadraticCurveTo(...P(mx + nx * L * 0.42, my + ny * L * 0.42), ...P(p1[0], p1[1]));
          prev = p1;
        });
        s.lineTo(...P(LE.p0[0], LE.p0[1]));
        return s;
      }
      const tiers = [
        { t: 1, anchors: [[1.86, 0.5], [1.66, 0.14], [1.42, -0.22], [1.12, -0.5], [0.76, -0.6], [0.4, -0.5], [0.1, -0.3], [0.0, -0.08]], col: M('#CFC6DD'), z: 0 },
        { t: 0.84, anchors: [[1.5, 0.36], [1.24, 0.06], [0.94, -0.16], [0.6, -0.26], [0.28, -0.22], [0.04, -0.08]], col: M('#E9E4F1'), z: 0.045 },
        { t: 0.62, anchors: [[1.08, 0.28], [0.84, 0.08], [0.54, -0.02], [0.24, -0.02], [0.03, 0.02]], col: M('#FCF9F6'), z: 0.09 }
      ];
      const wings = [];
      // image-left wing is lifted (its tip reaches up behind the cloud), image-right wing droops a little
      // wing roots sit inside the upper back of the robe (below the shawl) so they grow out of the shoulders
      [[-1, [-0.3, 2.42, -0.38], -0.12, 0.8], [1, [0.3, 2.28, -0.42], 0.0, 0.96]].forEach(([sx, wp, rz, sc]) => {
        const wg = group(wingsG, wp, [0, 0.36 * sx, rz]);
        wg.scale.set(sc, sc, 1);
        tiers.forEach((T, i) => {
          const geo = extrude(wingShape(T.t, T.anchors, sx), 0.035, 0.012);
          mesh(geo, std(T.col, { roughness: 0.85 }), wg, [0, 0, T.z], null, '#D2B175');
          if (i === 0) {
            mesh(geo, std(M('#EFD394'), { roughness: 0.6 }), wg, [0, 0, -0.03], [1.035, 1.05, 1]);
            mesh(geo, std(M('#D6CCE4'), { roughness: 0.85 }), wg, [0, 0, -0.065], null, '#D2B175');
          }
        });
        wings.push({ g: wg, sx, ry: 0.36 * sx });
      });
      K.onTick((t, k) => wings.forEach(({ g, sx, ry }) => { g.rotation.y = ry + 0.07 * sx * Math.sin(t * 1.8) * k; }));

      // ---------- green 披帛: over both shoulders, ends flowing out left and right ----------
      const shawlG = part('shawl', body);
      const shawlTex = canvasTex(64, 512, (g, w, h) => {
        g.fillStyle = GREEN; g.fillRect(0, 0, w, h);
        g.fillStyle = GREEN_D; g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h);
        g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(16, 0, 9, h);
      });
      const shawlM = texMat(shawlTex, { side: THREE.DoubleSide, roughness: 0.8 });
      const shawlPts = [
        [-1.95, 1.08, 0.08], [-1.88, 1.24, 0.1], [-1.7, 1.46, 0.08], [-1.84, 1.78, 0.02], [-1.56, 2.12, -0.14], [-1.1, 2.1, -0.3],
        [-0.78, 1.96, -0.05], [-0.66, 2.12, 0.34], [-0.66, 2.36, 0.36], [-0.68, 2.5, 0.0], [-0.46, 2.52, -0.5], [0, 2.52, -0.66],
        [0.46, 2.52, -0.5], [0.7, 2.5, -0.05], [0.8, 2.42, 0.32], [1.08, 2.36, 0.32], [1.36, 2.2, 0.22], [1.58, 1.96, 0.18], [1.74, 1.66, 0.2]
      ];
      mesh(ribbon(shawlPts, t => (t < 0.3 ? 0.26 + 0.1 * t / 0.3 : 0.36) + 0.03 * Math.sin(t * 11), { face: [0, 0.3, 1], segs: 260 }), shawlM, shawlG);

      // ---------- lavender belt ties flowing out on the image-left ----------
      const beltG = part('belt', body);
      const kp = K.onRobe(-58, 1.76, 0.05);
      mesh(sphere(0.085, 20, 14), lavM, beltG, kp, [1, 0.85, 0.7], LAV_INK);
      mesh(ribbon([[kp.x, kp.y, kp.z], [kp.x - 0.22, kp.y - 0.14, kp.z + 0.12], [-1.1, 1.5, 0.5], [-1.38, 1.42, 0.42], [-1.48, 1.2, 0.38], [-1.32, 1.08, 0.42]], 0.15, { face: [0, 0.3, 1], segs: 80 }), lavSM, beltG, null, null, GOLD_INK);
      mesh(ribbon([[kp.x, kp.y - 0.02, kp.z], [kp.x - 0.12, kp.y - 0.3, kp.z + 0.12], [-0.98, 1.2, 0.62], [-1.08, 1.0, 0.64]], 0.13, { face: [0, 0.3, 1], segs: 60 }), lavSM, beltG, null, null, GOLD_INK);

      // ---------- crown: gold circlet, thunder medallion, cloud scrolls, sprouts, lavender ribbons ----------
      const crownG = part('crown', head);
      crownG.position.set(0.04, 4.16, 0.3); crownG.rotation.x = -0.28;
      const bandPts = []; for (let i = 0; i <= 24; i++) { const a = -1.2 + 2.4 * i / 24; bandPts.push([Math.sin(a) * 0.6, -0.15 + 0.1 * Math.abs(Math.sin(a)), Math.cos(a) * 0.6 - 0.57]); }
      mesh(ribbon(bandPts.reverse(), 0.13, { face: [0, 0, 1], segs: 60 }), std(GOLD, { roughness: 0.45, metalness: 0.12, side: THREE.DoubleSide }), crownG, null, null, GOLD_INK);
      const scroll = (p, r, mat) => {
        const sg = group(crownG, p);
        mesh(sphere(r, 28, 20), mat, sg, null, [1, 1, 0.5], GOLD_INK);
        const pts = []; for (let a = 0; a <= Math.PI * 3.2; a += 0.2) { const rr = r * 0.78 * (1 - a / (Math.PI * 3.6)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr, r * 0.5]); }
        mesh(tube(pts, 0.011, 40, 6), goldDM, sg);
        return sg;
      };
      const scrollM = std(M('#F8E2A2', 1.2), { roughness: 0.5, metalness: 0.08 });
      scroll([-0.5, 0.15, -0.2], 0.17, goldPM); scroll([0.5, 0.08, -0.2], 0.13, goldPM); scroll([0.06, 0.2, -0.06], 0.15, goldPM);
      scroll([-0.33, 0.03, -0.02], 0.125, scrollM); scroll([0.35, 0.0, -0.02], 0.125, scrollM);
      K.medal(crownG, [0, 0.0, 0.04], 0.23, (g) => {
        g.fillStyle = MEDAL; g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.fill();
        zap(g, 128, 130, 78, GOLD, GOLD_D);
      }, GOLD, GOLD_INK, GOLD);
      const sprout = (parent, p, h, s, rot) => {
        const sg = group(parent, p, rot || [0, 0, 0]);
        mesh(tube([[0, 0, 0], [0.012, h * 0.5, 0], [0, h, 0]], 0.022 * s, 12, 8), stemM, sg);
        const lf = K.leafGeo(0.26 * s, 0.13 * s);
        mesh(lf, leafM, sg, [0, h, 0], null, GREEN_INK).rotation.set(0, 0, -1.05);
        mesh(lf, leafM, sg, [0, h, 0], null, GREEN_INK).rotation.set(0, 0, 1.05);
        return sg;
      };
      sprout(crownG, [0.05, 0.22, -0.12], 0.34, 1.2);
      sprout(crownG, [-0.24, 0.12, -0.05], 0.12, 0.7, [0, 0, 0.25]);
      sprout(crownG, [0.34, 0.1, -0.05], 0.1, 0.72, [0, 0, -0.25]);
      const crRibM = std(LAV, { roughness: 0.8, side: THREE.DoubleSide });
      mesh(ribbon([[-0.5, 0.08, -0.34], [-0.68, 0.2, -0.3], [-0.8, 0.3, -0.24], [-0.74, 0.37, -0.18]], 0.14, { face: [0, 0, 1] }), crRibM, crownG, null, null, LAV_INK).castShadow = false;
      mesh(ribbon([[0.5, 0.05, -0.4], [0.76, 0.2, -0.46], [0.96, 0.08, -0.6], [1.14, -0.24, -0.66], [1.3, -0.5, -0.56], [1.52, -0.36, -0.46]], t => 0.19 - 0.03 * t, { face: [0, 0, 1], segs: 80 }), crRibM, crownG, null, null, LAV_INK).castShadow = false;

      // ---------- tail ribbon: green band, gold ring knot, two leaves, streamers ----------
      // the core's root ball sits hidden inside the robe touching nothing: drop it (the tail tube itself enters the robe)
      K.tailG.children.filter(o => o.isMesh && o.geometry.type === 'SphereGeometry' && o.position.lengthSq() < 1e-8).forEach(o => K.tailG.remove(o));
      {
        const T = K.cfg.tail, base = V(...T.pts[0]);
        const cv = new THREE.CatmullRomCurve3(T.pts.map(p => V(...p).sub(base)));
        const t0 = 0.4, c = cv.getPointAt(t0), tn = cv.getTangentAt(t0), rr = T.r * T.shape(t0) + 0.13;
        const tg = group(K.tailG, c); tg.quaternion.setFromUnitVectors(V(0, 0, 1), tn);
        // a wide green band hugging the fur, with a thin gold edge
        const band = mesh(new THREE.CylinderGeometry(rr, rr, 0.2, 56, 1, true), greenSM, tg, null, null, GREEN_INK); band.rotation.x = Math.PI / 2;
        mesh(new THREE.TorusGeometry(rr + 0.005, 0.018, 8, 56), goldM, tg, [0, 0, 0.1]);
        const kn = group(K.tailG, c.clone().add(V(-rr * 0.2, rr * 0.6, rr * 0.78)));
        mesh(new THREE.TorusGeometry(0.1, 0.042, 10, 28), goldM, kn, null, null, GOLD_INK);
        const lf = K.leafGeo(0.42, 0.24);
        mesh(lf, leafM, kn, [0.05, 0.03, -0.02], null, GREEN_INK).rotation.set(0, 0, -1.15);
        mesh(lf, leafM, kn, [-0.05, 0.03, -0.02], null, GREEN_INK).rotation.set(0, 0, 1.2);
        mesh(ribbon([[0, -0.05, 0], [-0.14, -0.26, 0.08], [-0.4, -0.38, 0.1], [-0.5, -0.5, 0.12]], 0.15, { face: [0, 0, 1] }), greenSM, kn, null, null, GREEN_INK);
        mesh(ribbon([[0, -0.05, 0], [0.1, -0.32, 0.08], [0.22, -0.58, 0.06]], 0.15, { face: [0, 0, 1] }), greenSM, kn, null, null, GREEN_INK);
      }

      // ---------- floating decorations (clouds, lightning, drum sound, sprouts, caterpillar) ----------
      const cloudDeco = (p, s, col, swirl) => {
        const g = K.puff(decor, p, s, col, '#DCBD85');
        if (swirl) {
          const pts = []; for (let a = 0; a <= Math.PI * 3.2; a += 0.2) { const rr = 0.3 * (1 - a / (Math.PI * 3.6)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr, 0.27]); }
          mesh(tube(pts, 0.03, 40, 6), std(M('#E4C27F'), { roughness: 0.6 }), g);
        }
        return g;
      };
      const deco = [];
      deco.push(cloudDeco([1.62, 4.2, 0.0], 0.5, LAV_CLOUD, false));
      deco.push(cloudDeco([1.98, 3.96, 0.3], 0.46, M('#FBF0D8'), true));
      deco.push(cloudDeco([-2.0, 3.2, 0.3], 0.44, LAV_CLOUD, false));
      deco.push(cloudDeco([-1.58, 3.1, 0.6], 0.42, M('#FBF0D8'), true));
      deco.push(K.bolt(decor, [-1.35, 3.92, 0.3], 0.9, M('#F3CC5A')));
      deco.push(K.bolt(decor, [1.98, 3.4, 0.3], 0.8, M('#F3CC5A')));
      deco.push(K.bolt(decor, [2.2, 0.35, 0.7], 0.75, M('#F3CC5A')));
      deco.push(sprout(decor, [-1.62, 3.5, 0.2], 0.16, 1.0));
      deco.push(sprout(decor, [2.28, 2.1, 0.2], 0.2, 1.0));
      deco.push(sprout(decor, [1.5, 0.02, 0.9], 0.18, 1.0));
      // caterpillar on a big leaf (bottom-left)
      {
        const cg = group(decor, [-1.75, 0.55, 0.85]);
        mesh(K.leafGeo(1.05, 0.62), leafM, cg, [-0.66, -0.16, 0], null, GREEN_INK).rotation.set(0, 0, -1.35);
        mesh(tube([[0.36, -0.1, 0], [0.46, -0.3, 0.02], [0.44, -0.55, 0.04]], 0.022, 12, 6), stemM, cg);
        mesh(K.leafGeo(0.36, 0.16), leafM, cg, [0.45, -0.4, 0.04], null, GREEN_INK).rotation.set(0, 0, -0.6);
        const bodyM = std(M('#EDE38A'), { roughness: 0.8 }), bandM = std(M('#B9CC73'), { roughness: 0.8 });
        [[-0.3, 0.02, 0.1], [-0.18, 0.06, 0.1], [-0.05, 0.1, 0.1], [0.08, 0.18, 0.1]].forEach(([x, y, r], i) => mesh(sphere(r, 20, 14), i % 2 ? bandM : bodyM, cg, [x, y, 0.05], null, '#A7A45C'));
        mesh(sphere(0.12, 24, 18), bodyM, cg, [0.18, 0.32, 0.06], null, '#A7A45C');
        [-1, 1].forEach(s => {
          mesh(sphere(0.018, 10, 8), std('#3E2E24'), cg, [0.18 + s * 0.045, 0.34, 0.17]);
          mesh(tube([[0.18 + s * 0.04, 0.42, 0.06], [0.18 + s * 0.07, 0.55, 0.06]], 0.008, 8, 5), std('#C9A25A'), cg);
          mesh(sphere(0.022, 10, 8), goldM, cg, [0.18 + s * 0.07, 0.56, 0.06]);
        });
        deco.push(cg);
      }
      // drum-sound arcs
      const arcM = std(M('#F4CF6A'), { roughness: 0.6 });
      [[-1.98, 1.9, 0.4, 1], [1.6, 3.1, 0.5, -1]].forEach(([x, y, z, s]) => {
        const ag = group(decor, [x, y, z]);
        [0.13, 0.25].forEach(r => { const a = mesh(new THREE.TorusGeometry(r, 0.024, 8, 24, 1.6), arcM, ag); a.rotation.z = s > 0 ? Math.PI * 0.62 : -Math.PI * 0.12; });
        deco.push(ag);
      });
      deco.forEach(d => { d.userData.y0 = d.position.y; });
      K.onTick((t, k) => deco.forEach((d, i) => { d.position.y = d.userData.y0 + 0.06 * Math.sin(t * 1.1 + i * 0.9) * k; }));

      // picture-book look: the hanging drum and the sticks cast no dark shadow on the robe
      [drumG, sticksG].forEach(gr => gr.traverse(o => { if (o.isMesh) o.castShadow = false; }));
      crownG.traverse(o => { if (o.isMesh) o.castShadow = false; });
      K.drumParts = { drum, stickL, stickR };
    },

    action: {
      label: '擊鼓', dur: 1.8,
      run(s, p, K) {
        const beat = Math.max(0, Math.sin(p * Math.PI * 8));
        K.drumParts.stickR.rotation.z = 0.5 * beat * s;
        K.drumParts.stickL.rotation.z = -0.25 * Math.sin(p * Math.PI * 4) * s;
        const q = 1 + 0.03 * beat * s;
        K.drumParts.drum.scale.set(q, 2 - q, q);
        K.headG.rotation.x = -0.06 * s;
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '驚蟄擊鼓的小雷公',
        text: '驚蟄春雷乍響、喚醒蟄伏的蟲兒。這隻銀灰金吉拉貓扮成雷公：頭戴閃電徽章小金冠、背後長著白紫小翅膀、胸前掛著紫色雷鼓，高舉鼓槌張嘴歡笑，身邊飄著雷電、祥雲、嫩芽與剛醒來的毛毛蟲。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '開心張嘴的圓臉',
        text: '寬圓的大臉被蓬鬆銀灰長毛包圍，額頭有幾道放射狀的淡灰紋，眼下到下巴是奶白色。深棕色圓眼右上角點著白色高光，粉鼻下是「ω」嘴、張開露出粉紅小舌，雙頰淡淡腮紅，頭微微向畫面右側歪。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '銀灰大耳',
        text: '一對寬大的三角耳斜斜立在小冠兩側，外側銀灰、內側淡粉，耳窩冒出一撮白色耳毛。' },
      crown: { chip: '雷冠', tag: '服飾', name: '雷紋祥雲小金冠',
        text: '金色弧形冠座正中是紫底金閃電的圓徽章，兩旁排著帶螺旋紋的金色捲雲球；冠頂冒出一高兩矮三株嫩芽，兩側飄出薰衣草紫緞帶，右邊那條繞到右耳後方。' },
      drum: { chip: '雷鼓', tag: '道具', name: '薰衣草紫雷鼓',
        text: '兩條紫色背帶從肩上垂下，把扁鼓掛在肚子前，鼓面朝前上方，畫著金色閃電和紫色雲朵。鼓身有金邊、一圈金鉚釘和金色腰帶，前方兩個金色四瓣花結垂著紫色流蘇。' },
      sticks: { chip: '鼓槌', tag: '道具', name: '金頭鼓槌',
        text: '畫面左邊的爪子把鼓槌高舉到臉旁，右邊的爪子握著另一支、金色圓頭懸在鼓面上方，準備敲響春天第一聲雷。按「擊鼓」可以看牠敲鼓。' },
      wings: { chip: '翅膀', tag: '服飾', name: '白紫小翅膀', dir: [0.6, 0.3, -1],
        text: '肩膀後方伸出一對小翅膀，三層扇貝形羽毛由白色漸變到淡薰衣草紫，外緣描金，像雷公乘雲而來。' },
      robe: { chip: '雷公袍', tag: '服飾', name: '米白薰紫寬袖袍',
        text: '米白交領長袍配紫色衣襟，前襟敞開露出金邊內裙，下擺是寬寬的薰衣草紫滾邊。兩隻大寬袖像布袋一樣垂下，袖口紫邊鑲金、內襯嫩綠，袖面有金色閃電與紫色捲雲，袍身也點綴著捲雲和嫩芽。' },
      shawl: { chip: '披帛', tag: '服飾', name: '嫩綠披帛與紫腰帶',
        text: '嫩綠色長披帛從頸後繞過雙肩，右端越過翅膀往右下垂，左端從袖子後方以 S 形飄到最左邊，像春風吹動的新葉；左腰還垂著鑲金邊的紫色腰帶。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '蓬鬆大尾巴', dir: [1, 0.3, -0.6],
        text: '金吉拉招牌的大蓬尾從袍子右後方繞出來再往上翹，幾乎和袖子一樣寬；尾巴上繫著嫩綠緞帶，打了金色圓環結並插著兩片小葉。' },
      pose: { chip: '姿態', tag: '貓咪本體', name: '擊鼓姿態',
        text: '兩隻圓滾滾的白色短腳站穩，畫面左邊的爪子高舉鼓槌、右邊的爪子在鼓面上方蓄勢待發，一副要把大地敲醒的得意模樣。' }
    },
    order: ['overview', 'face', 'ears', 'crown', 'drum', 'sticks', 'wings', 'robe', 'shawl', 'tail', 'pose']
  });
})();
