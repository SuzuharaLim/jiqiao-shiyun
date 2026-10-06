// @file 14_處暑_索馬利亞貓
// @title 處暑・張飛將軍 | 二十四節氣貓
(function () {
  // The renderer's lights brighten front-facing surfaces by roughly 1.45x (linear). M() turns a colour
  // SAMPLED from refs/14.png into the material colour that renders back to about that value.
  function M(hex, f) {
    f = f || 1.45; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f, 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const K_rand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---- colours sampled from refs/14.png (then compensated) ----
  const FUR = M('#E89557'), FUR_TOP = M('#D07C46'), FUR_MID = M('#E38F55'), FUR_LOW = M('#EDA063');
  const STRIPE = M('#B8653A'), CREAM = M('#FAECD5', 1.15), INK = '#A55A32', CREAM_INK = '#D2AE88';
  const RED = M('#D46C47'), RED_LT = M('#DF7A53'), RED_DK = M('#B85C3B'), RED_INK = '#93442B';
  const GREEN = M('#A5A464', 1.35), GREEN_DK = M('#8F8A52'), GREEN_INK = '#686736';
  const IVORY = M('#F8E4C4', 1.2), GOLD = M('#F3CA82', 1.3), GOLD_DK = M('#DDAB61'), GOLD_INK = '#A9803A';
  const BROWN = M('#8E5E3C'), BROWN_INK = '#56361F', BEARD = M('#B07748'), BEARD_DK = M('#8C5835');
  const BUN = M('#B46C41'), BUN_DK = M('#8F5534');
  const FAN = M('#A2A45F'), FAN_DK = M('#8C8E4E'), FAN_LT = M('#D7CD8D', 1.3);

  NEKO.run({
    meta: {
      id: '14', term: '處暑', title: '處暑・張飛將軍', seal: '暑',
      eyebrow: '二〇二七節氣貓 · 14 處暑 · 索馬利亞貓',
      aria: '頭頂棕色髮髻套綠金髮冠、繫紅緞帶，皺眉瞪眼、留著八字鬍與山羊鬍，身穿紅橘綠邊戰袍、肩披米白雲紋肩甲、腰繫綠腰封與紅腰帶，畫面左手握綠色芭蕉扇、右手握拳擱在腰側的赤橘色長毛索馬利亞貓 3D 模型'
    },
    theme: { accent: '#9A4A2E', accentDark: '#F0B48E', glow: 'rgba(223, 122, 83, 0.28)', glowColor: '#F3B27E' },
    palette: [['#E89557', '赤橘毛'], ['#D06A45', '朱紅袍'], ['#A1A060', '橄欖綠'], ['#F3CA82', '暖金']],
    spec: [['品種', '索馬利亞貓'], ['角色', '張飛將軍'], ['頭身比', '約 1 : 1.1']],
    seed: 1414,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR_MID, low: FUR_LOW, deep: STRIPE, cream: CREAM,
        ink: INK, creamInk: CREAM_INK, noise: { colors: [M('#F6BD86'), M('#C46E3E')], alpha: 0.09, n: 1300 },
        paintBase(g, P) {
          const L = (lo, la) => P.xy(lo, la);
          const vg = g.createLinearGradient(0, 0, 0, 512);
          vg.addColorStop(0, FUR_TOP); vg.addColorStop(0.45, FUR_MID); vg.addColorStop(1, FUR_LOW);
          g.fillStyle = vg; g.fillRect(0, 0, 1024, 512);
          // ticked long-coat streaks all around the back and sides
          g.filter = 'blur(4px)';
          for (let lon = -172; lon <= 172; lon += 19) {
            if (Math.abs(lon) < 44) continue;
            const s = lon > 0 ? 1 : -1;
            P.stroke(g, [L(lon, 84), L(lon + 7 * s, 40), L(lon + 3 * s, -10)], 16, STRIPE, 0.45);
          }
          // forehead: dark centre wedge from the crown down between the brows + two side streaks each side
          g.filter = 'blur(2.5px)';
          const wedge = (lonT, lonB, latB, wT, a) => {
            const [x0, y0] = L(lonT - wT, 86), [x1, y1] = L(lonT + wT, 86), [xb, yb] = L(lonB, latB);
            g.fillStyle = NEKO.rgba(STRIPE, a); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
            g.quadraticCurveTo((x1 + xb) / 2 + 3, (y1 + yb) / 2, xb, yb); g.quadraticCurveTo((x0 + xb) / 2 - 3, (y0 + yb) / 2, x0, y0); g.fill();
          };
          wedge(0, 0, 4, 12, 0.95);
          wedge(-16, -12, 38, 7, 0.95); wedge(16, 12, 38, 7, 0.95);
          wedge(-31, -27, 46, 6, 0.85); wedge(31, 27, 46, 6, 0.85);
          wedge(-46, -44, 40, 5, 0.6); wedge(46, 44, 40, 5, 0.6);
          // cheek streaks sweeping out to the ruff
          g.filter = 'blur(3px)';
          [[[44, 8], [62, 4], [86, 0]], [[48, -8], [66, -12], [90, -14]], [[52, -24], [70, -28], [92, -32]]].forEach(s => {
            const p = s.map(([lo, la]) => L(lo, la));
            P.stroke(g, p, 13, STRIPE, 0.7);
            P.stroke(g, P.mirror(p), 13, STRIPE, 0.7);
          });
          // cream mask: both eye areas up over the brows, orange V between them, whole lower face and chin
          const half = [[0, 9], [6, 17], [11, 26], [17, 34], [24, 34], [30, 25], [33, 14], [34, 3], [38, -7], [45, -18], [55, -30], [68, -45], [86, -62], [100, -90]];
          const poly = half.concat(half.slice().reverse().map(([lo, la]) => [-lo, la]));
          g.filter = 'blur(6px)'; g.fillStyle = CREAM; g.beginPath();
          poly.forEach(([lo, la], i) => { const [x, y] = L(lo, la); i ? g.lineTo(x, y) : g.moveTo(x, y); });
          g.closePath(); g.fill();
          g.filter = 'none';
        }
      },
      head: { y: 2.43, w: 0.8, h: 0.58, d: 0.74, cheek: 0.22, ruff: 0.08, ruffFreq: 14, chinDrop: 0.0,
        fur: { layers: 18, length: 0.1, gravity: 0.03, repeat: [9, 5] } },
      eyes: { x: 0.29, y: 0.035, r: 0.08, sx: 0.95, sy: 1.08, sz: 0.45, color: M('#4E3423', 1.2), iris: M('#6E4A31', 1.2), pupil: M('#3E2819', 1.2), pupilR: 0.62, shine: 0 },
      brows: { color: M('#5C3E29', 1.2), x: 0.28, y: 0.195, len: 0.18, angle: 0.52, r: 0.033 },
      nose: { y: -0.035, color: M('#F5AF96', 1.3), size: 0.75 },
      muzzle: false,
      mouth: { type: 'frown', color: '#6B4632', y: -0.11, w: 0.105 },
      blush: { color: 'rgba(246,140,124,0.9)', x: 0.49, y: -0.04, r: 36 },
      whiskers: null,
      ears: { x: 0.6, y: 0.24, z: -0.06, tilt: 0.3, yaw: 0.22, pitch: -0.05, size: [0.58, 0.86, 0.2], sharp: 0.95,
        color: FUR, inner: M('#F7B7A0', 1.3), tuft: false, innerScale: 1.05,
        R: { y: 0.17, tilt: 0.33, size: [0.56, 0.8, 0.2] } },
      bib: { color: CREAM, balls: [[0, 1.76, 0.3, 0.19], [0.13, 1.71, 0.29, 0.14], [-0.13, 1.71, 0.29, 0.14], [0, 1.6, 0.38, 0.13]],
        fur: { layers: 14, length: 0.06, gravity: 0.03, repeat: [3, 2] } },
      // inner layer: ivory under-robe with the green front panel (repainted in build)
      robe: {
        profile: [[0.5, 0.56], [0.52, 0.6], [0.52, 0.72], [0.5, 0.9], [0.45, 1.06], [0.44, 1.2], [0.46, 1.42], [0.42, 1.62], [0.2, 1.8]],
        color: '#FFFFFF', ink: CREAM_INK, lining: IVORY, hemY: 0.56,
        paint(g, w, h, D) { D.fill(g, IVORY); }
      },
      collar: false,
      arms: {
        L: { hand: [-0.37, 1.37, 0.72], path: [[-0.45, 1.64, 0.02], [-0.7, 1.43, 0.24], [-0.56, 1.36, 0.56]], drop: 0.45, width: 1.0, pawScale: 1.1 },
        R: { hand: [0.5, 1.13, 0.46], path: [[0.45, 1.64, 0.02], [0.77, 1.4, 0.06], [0.67, 1.2, 0.32]], drop: 0.45, width: 1.0, pawScale: 1.1 }
      },
      sleeves: {
        style: 'wide', color: '#FFFFFF', lining: IVORY, trim: IVORY, trimR: 0.045, ink: RED_INK,
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, h, 0, 0);
          lg.addColorStop(0, RED); lg.addColorStop(1, RED_LT);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          g.strokeStyle = NEKO.rgba(RED_DK, 0.5); g.lineWidth = 6; g.lineCap = 'round';
          [[640, 200, 700, 420], [820, 160, 860, 400], [300, 240, 340, 440]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2 + 20, (b + d) / 2, c, d); g.stroke(); });
        }
      },
      paws: { color: M('#F7E6CC', 1.3), ink: CREAM_INK },
      belt: false,
      legs: null,
      feet: false,
      tail: {
        pts: [[0.35, 0.6, -0.45], [0.72, 0.52, -0.55], [1.05, 0.58, -0.52], [1.25, 0.84, -0.46], [1.18, 1.14, -0.41], [1.1, 1.42, -0.37],
          [1.15, 1.66, -0.33], [1.3, 1.77, -0.3], [1.46, 1.7, -0.28], [1.53, 1.5, -0.27], [1.48, 1.32, -0.26], [1.38, 1.26, -0.25]],
        r: 0.3, tip: M('#F4C08C', 1.2), tipStart: 0.8,
        shape: t => {
          const a = 0.62 + 0.46 * sst(0, 0.14, t) - 0.36 * sst(0.26, 0.42, t) + 0.12 * sst(0.44, 0.58, t) - 0.3 * sst(0.66, 0.86, t);
          return a * (1 - 0.72 * sst(0.86, 1, t));
        },
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, M('#D9864E')); lg.addColorStop(0.35, M('#E6935A')); lg.addColorStop(0.72, M('#EB9C5E')); lg.addColorStop(0.86, M('#F2B67E', 1.2)); lg.addColorStop(1, M('#F6CDA2', 1.2));
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          // long thin darker and lighter strands running along the tail (Somali ticked coat)
          g.lineCap = 'round';
          for (let i = 0; i < 90; i++) {
            const x = K_rand(i) * 0.8 * w, y = K_rand(i + 300) * h, len = 110 + K_rand(i + 600) * 140;
            g.strokeStyle = i % 3 ? NEKO.rgba(M('#C06E3E'), 0.22) : NEKO.rgba(M('#F4B478', 1.2), 0.3); g.lineWidth = 1.6 + (i % 2);
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (K_rand(i + 900) - 0.5) * 4); g.stroke();
          }
        },
        fur: { layers: 14, length: 0.055, gravity: 0.008, repeat: [16, 8] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, lathe, ribbon, D } = K;
      const HY = K.cfg.head.y;
      const UP = V(0, 1, 0);
      const q = (from, to) => new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
      const redMat = std(RED, { roughness: 0.85 }), redMatD = std(RED, { roughness: 0.85, side: THREE.DoubleSide });
      const greenMat = std(GREEN, { roughness: 0.85 }), goldMat = std(GOLD, { roughness: 0.45, metalness: 0.1 });
      const ivoryMat = std(IVORY, { roughness: 0.9 }), brownMat = std(BROWN, { roughness: 0.75 });

      /* ================= inner under-robe: ivory with the green front panel ================= */
      {
        const tex = K.robeMesh.material.map, g = tex.image.getContext('2d');
        const W = 1024, Hh = 1024;
        g.fillStyle = IVORY; g.fillRect(0, 0, W, Hh);
        g.fillStyle = RED; g.fillRect(0, 0, W, K.robeV(1.08));
        // scalloped ivory hem line
        const yh = K.robeV(0.585);
        g.strokeStyle = CREAM_INK; g.lineWidth = 4;
        for (let x = 0; x < W; x += 40) { g.beginPath(); g.arc(x + 20, yh, 20, 0, Math.PI); g.stroke(); }
        // green front panel with a rounded bottom and an ivory border
        const panel = (inset, color) => {
          const x0 = 512 - 64 + inset, x1 = 512 + 64 - inset, yT = K.robeV(1.1), yB = K.robeV(0.66) - inset;
          g.fillStyle = color; g.beginPath(); g.moveTo(x0, yT); g.lineTo(x1, yT); g.lineTo(x1, yB - 40);
          g.quadraticCurveTo(x1, yB, 512, yB); g.quadraticCurveTo(x0, yB, x0, yB - 40); g.closePath(); g.fill();
        };
        panel(0, GREEN_INK); panel(4, IVORY); panel(14, GREEN_INK); panel(17, GREEN);
        tex.needsUpdate = true;
      }

      /* ================= outer red battle robe: closed bodice, open flared skirt ================= */
      const OY1 = 1.82;
      const oProf = new THREE.SplineCurve([[0.9, 0.36], [0.86, 0.46], [0.74, 0.66], [0.6, 0.86], [0.51, 1.04], [0.49, 1.2], [0.51, 1.4], [0.5, 1.58], [0.41, 1.72], [0.26, OY1]]
        .map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(120);
      const oR = (y) => {
        for (let i = 0; i < oProf.length - 1; i++) { const a = oProf[i], b = oProf[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y || 1); }
        return y < oProf[0].y ? oProf[0].x : oProf[oProf.length - 1].x;
      };
      const Y_OPEN = 1.06;
      const gapW = (y) => y >= Y_OPEN ? 0 : 0.03 + 0.3 * Math.pow((Y_OPEN - y) / (Y_OPEN - 0.38), 0.5);
      const gapA = (y) => { const w = gapW(y); return w ? Math.asin(Math.min(w / oR(y), 0.9)) : 0; };
      const hemY = (phi) => 0.47 + 0.06 * Math.cos(phi) - 0.05 * Math.pow(Math.sin(phi), 2);
      const onOuter = (deg, y, off) => { const a = deg * Math.PI / 180, r = oR(y) + (off || 0); return V(Math.sin(a) * r, y, Math.cos(a) * r); };
      {
        const nu = 160, nv = 70, pos = [], uv = [], idx = [];
        for (let j = 0; j <= nv; j++) {
          const v = j / nv;
          for (let i = 0; i <= nu; i++) {
            const u = i / nu;
            let y = lerp(0.42, OY1, v), ga = gapA(y), phi = ga + (Math.PI * 2 - 2 * ga) * u;
            y = lerp(hemY(phi), OY1, v); ga = gapA(y); phi = ga + (Math.PI * 2 - 2 * ga) * u;
            const r = oR(y);
            pos.push(Math.sin(phi) * r, y, Math.cos(phi) * r); uv.push(u, v);
          }
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); K.smoothNormals(geo);
        const TW = 2048, TH = 1024;
        const tex = canvasTex(TW, TH, (g, w, h) => {
          const lg = g.createLinearGradient(0, 0, 0, h);
          lg.addColorStop(0, RED_DK); lg.addColorStop(0.35, RED); lg.addColorStop(1, RED_LT);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          const rowY = (y) => (1 - (y - 0.4) / (OY1 - 0.4)) * h;
          // front-edge bands (constant world width) on the open skirt
          const edge = (wid, off, color) => {
            const Lp = [], Rp = [];
            for (let k = 0; k <= 40; k++) {
              const y = lerp(0.3, Y_OPEN, k / 40), circ = oR(y) * (Math.PI * 2 - 2 * gapA(y));
              const px0 = off / circ * w, px1 = (off + wid) / circ * w;
              Lp.push([px0, rowY(y)]); Rp.push([px1, rowY(y)]);
            }
            g.fillStyle = color; g.beginPath();
            Lp.concat(Rp.slice().reverse()).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
            g.beginPath(); Lp.concat(Rp.slice().reverse()).forEach(([x, y], i) => i ? g.lineTo(w - x, y) : g.moveTo(w - x, y)); g.closePath(); g.fill();
          };
          // cream inner collar showing inside the V of the crossed lapels
          {
            const rowV = (y) => (1 - (y - 0.37) / (OY1 - 0.37)) * h;
            const vpts = [[0, 1.37], [14, 1.48], [34, 1.6], [58, 1.7], [100, 1.77], [100, OY1 + 0.1], [0, OY1 + 0.1]];
            g.fillStyle = IVORY;
            [1, -1].forEach(sd => { g.beginPath(); vpts.forEach(([d, y], i) => { const x = sd > 0 ? d / 360 * w : w - d / 360 * w; i ? g.lineTo(x, rowV(y)) : g.moveTo(x, rowV(y)); }); g.closePath(); g.fill(); });
          }
          edge(0.012, 0.088, GOLD); edge(0.088, 0, GREEN); edge(0.01, 0.086, GREEN_INK);
          // hem band: green with a gold line above
          const hb = 0.1 / (OY1 - 0.4) * h;
          g.fillStyle = GOLD; g.fillRect(0, h - hb - 16, w, 12);
          g.fillStyle = GREEN; g.fillRect(0, h - hb, w, hb);
          g.fillStyle = GREEN_INK; g.fillRect(0, h - hb - 4, w, 4);
          // cream-gold 祥雲 at the lower outer corners of both front panels (and on the back)
          const cloudFill = (cx, cy, s) => {
            g.save(); g.translate(cx, cy);
            g.fillStyle = GOLD; g.strokeStyle = GOLD_DK; g.lineWidth = 5;
            g.beginPath();
            g.arc(-s * 0.55, s * 0.05, s * 0.32, Math.PI * 0.95, Math.PI * 1.95);
            g.arc(0, -s * 0.12, s * 0.42, Math.PI * 1.1, Math.PI * 1.95);
            g.arc(s * 0.6, 0.0, s * 0.34, Math.PI * 1.2, Math.PI * 2.1);
            g.lineTo(s * 0.95, s * 0.42); g.lineTo(-s * 0.9, s * 0.42); g.closePath(); g.fill(); g.stroke();
            g.strokeStyle = M('#E6AE5E'); g.lineWidth = 6; g.lineCap = 'round';
            g.beginPath(); g.arc(0, -s * 0.05, s * 0.18, Math.PI * 0.2, Math.PI * 1.7); g.stroke();
            g.beginPath(); g.arc(-s * 0.52, s * 0.14, s * 0.12, Math.PI * 0.9, Math.PI * 2.2); g.stroke();
            g.beginPath(); g.arc(s * 0.58, s * 0.12, s * 0.12, Math.PI * 1.0, Math.PI * 2.3); g.stroke();
            g.restore();
          };
          const cy = h - hb - 16 - 66;
          [[0.085, 150], [0.915, 150], [0.3, 120], [0.7, 120]].forEach(([u, sz]) => cloudFill(u * w, cy - (sz - 120) * 0.3, sz));
        });
        const robeO = mesh(geo, texMat(tex, { side: THREE.DoubleSide, roughness: 0.85 }), K.robeG, null, null, RED_INK);
        robeO.userData.outer = true;
      }

      /* ================= cross collar (green lapels with an ivory inner band) ================= */
      {
        const lapel = (sgn, off) => {
          // from behind the neck, over the shoulder, down to the V just above the sash
          const pts = [[-150 * sgn, 1.78], [-100 * sgn, 1.77], [-58 * sgn, 1.7], [-34 * sgn, 1.6], [-14 * sgn, 1.48], [4 * sgn, 1.36], [16 * sgn, 1.28]]
            .map(([d, y]) => onOuter(d, y, off));
          return pts;
        };
        const gm = std(GREEN, { roughness: 0.85, side: THREE.DoubleSide }), im = std(IVORY, { roughness: 0.9, side: THREE.DoubleSide });
        [-1, 1].forEach(sgn => {
          const P0 = lapel(sgn, 0.012);
          const face = V(0, 0.3, 1);
          mesh(ribbon(P0, 0.1, { face, segs: 60 }), gm, K.robeG, null, null, GREEN_INK);
          const P1 = lapel(sgn, 0.02).map((p, i) => p.clone().add(V(-sgn * 0.035 * (i > 1 ? 1 : 0.4), 0, 0)));
          mesh(ribbon(P1, 0.035, { face, segs: 60 }), im, K.robeG);
        });
      }

      /* ================= waist: green 腰封 with gold edges, red sash tied in front, hanging ends ================= */
      const beltG = K.beltG;
      {
        const RB = 0.535;
        const band = (r0, r1, y, h, mat, ink) => mesh(new THREE.CylinderGeometry(r0, r1, h, 96, 1, true), mat, beltG, [0, y, 0], null, ink);
        const gD = std(GREEN, { roughness: 0.85, side: THREE.DoubleSide }), goD = std(GOLD, { roughness: 0.6, side: THREE.DoubleSide });
        band(RB, RB, 1.21, 0.34, gD, GREEN_INK);
        band(RB + 0.012, RB + 0.012, 1.365, 0.045, goD, GOLD_INK);
        band(RB + 0.012, RB + 0.012, 1.06, 0.05, goD, GOLD_INK);
        band(RB + 0.025, RB + 0.025, 1.19, 0.13, std(M('#DB724A'), { roughness: 0.8, side: THREE.DoubleSide }), RED_INK);
        const zK = RB + 0.07;
        const km = std(M('#D0673F'), { roughness: 0.75 });
        // compact rounded knot with two soft ribbon loops
        mesh(sphere(1, 24, 18).scale(0.062, 0.068, 0.05), km, beltG, [0.0, 1.19, zK + 0.02], null, RED_INK);
        [-1, 1].forEach(sx => {
          const l = mesh(sphere(1, 24, 18).scale(0.085, 0.055, 0.035), km, beltG, [0.095 * sx, 1.205, zK - 0.005], null, RED_INK);
          l.rotation.set(0, -0.35 * sx, 0.3 * sx);
          const f = mesh(tube([[0.045 * sx, 1.2, zK + 0.03], [0.1 * sx, 1.215, zK + 0.03], [0.15 * sx, 1.2, zK + 0.02]], 0.006, 10, 5), std(M('#B65536'), { roughness: 0.8 }), beltG);
        });
        const rm = std(M('#D8653F'), { roughness: 0.8, side: THREE.DoubleSide }), rm2 = std(M('#C9593A'), { roughness: 0.8, side: THREE.DoubleSide });
        const km2 = std(M('#D2C480', 1.3), { roughness: 0.8, side: THREE.DoubleSide });
        // two red tails straight down, one pale khaki tail down the apron and one khaki end swinging out to the image-right
        mesh(ribbon([[-0.02, 1.15, zK], [-0.035, 0.98, zK + 0.01], [-0.03, 0.78, zK - 0.02]], 0.068, { segs: 30 }), rm, beltG, null, null, RED_INK);
        mesh(ribbon([[0.03, 1.15, zK - 0.005], [0.07, 0.99, zK], [0.12, 0.81, zK - 0.03]], 0.065, { segs: 30 }), rm2, beltG, null, null, RED_INK);
        mesh(ribbon([[-0.08, 1.13, zK - 0.03], [-0.1, 0.9, zK - 0.03], [-0.1, 0.6, 0.58]], 0.085, { segs: 30 }), km2, beltG, null, null, GREEN_INK);
        mesh(ribbon([[0.1, 1.13, zK - 0.03], [0.2, 1.0, zK - 0.03], [0.3, 0.86, zK - 0.06]], 0.08, { segs: 30 }), km2, beltG, null, null, GREEN_INK);
      }

      /* ================= cuffs & brown bracers ================= */
      const sleevesG = part('sleeves', K.body);
      ['L', 'R'].forEach(s => {
        const h = K.hands[s], d = h.dir.clone().normalize();
        // rolled ivory cuff at the end of the sleeve
        const cg = group(sleevesG, h.wrist.toArray());
        cg.quaternion.copy(q(UP, d));
        const cl = lathe([[0.16, -0.12], [0.21, -0.07], [0.26, 0.0], [0.25, 0.06], [0.18, 0.07], [0.13, 0.04]], 48);
        mesh(cl.geo, std(IVORY, { roughness: 0.9, side: THREE.DoubleSide }), cg, null, null, CREAM_INK);
        // bracer
        mesh(new THREE.CylinderGeometry(0.105, 0.11, 0.15, 32), brownMat, cg, [0, 0.07, 0], null, BROWN_INK);
        const t1 = mesh(new THREE.TorusGeometry(0.108, 0.012, 8, 32), std(M('#6E4529'), { roughness: 0.7 }), cg, [0, 0.14, 0]); t1.rotation.x = Math.PI / 2;
        // gold stud on the outer side
        const out = V(s === 'L' ? -1 : 1, 0.2, 0.5).normalize();
        const side = out.clone().sub(d.clone().multiplyScalar(out.dot(d))).normalize();
        const sp = h.wrist.clone().addScaledVector(d, 0.07).addScaledVector(side, 0.108);
        mesh(sphere(0.026, 16, 12), goldMat, sleevesG, sp.toArray(), null, GOLD_INK);
      });

      /* ================= cloud pauldrons (肩甲) ================= */
      const armorG = part('armor', K.body);
      {
        const cloudShape = (w, h) => {
          const s = new THREE.Shape(), n = 120;
          for (let i = 0; i <= n; i++) {
            const th = i / n * Math.PI * 2;
            // three round lobes on top (big centre), scalloped lower edge
            const top = th < Math.PI;
            const k = top ? 0.82 + 0.22 * Math.pow(Math.abs(Math.sin(3 * th)), 0.45) + 0.08 * Math.pow(Math.sin(th), 6)
                          : 0.9 + 0.1 * Math.pow(Math.abs(Math.sin(4 * th)), 0.5);
            const x = Math.cos(th) * w / 2 * k, y = Math.sin(th) * h / 2 * k * (top ? 1 : 0.7);
            i ? s.lineTo(x, y) : s.moveTo(x, y);
          }
          return s;
        };
        const wrap = (geo, C, dir, R0) => {
          const d = dir.clone().normalize(), e1 = UP.clone().cross(d).normalize(), e2 = d.clone().cross(e1).normalize();
          const p = geo.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
            const n = d.clone().addScaledVector(e1, x / R0).addScaledVector(e2, y / R0).normalize();
            const v = C.clone().addScaledVector(n, R0 + z);
            p.setXYZ(i, v.x, v.y, v.z);
          }
          return K.smoothNormals(geo);
        };
        const PW = 0.6, PH = 0.44;
        const tex = canvasTex(512, 400, (g, w, h) => {
          g.fillStyle = IVORY; g.fillRect(0, 0, w, h);
          g.lineCap = 'round';
          // big gold ruyi swirl in the centre lobe, smaller curls on the side lobes
          const spiral = (cx, cy, R, turns, lw) => {
            g.lineWidth = lw; g.beginPath();
            for (let i = 0; i <= 80; i++) { const t = i / 80, a = t * turns * Math.PI * 2, r = R * (1 - 0.85 * t); const x = cx + Math.cos(a) * r, y = cy - Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
            g.stroke();
          };
          g.fillStyle = GOLD;
          [[0.5, 0.46, 120], [0.19, 0.6, 70], [0.81, 0.6, 70]].forEach(([u, v, r]) => { g.beginPath(); g.arc(u * w, v * h, r, 0, Math.PI * 2); g.fill(); });
          g.strokeStyle = M('#D9A252');
          spiral(w * 0.5, h * 0.46, 95, 1.6, 15);
          spiral(w * 0.19, h * 0.6, 52, 1.3, 11); spiral(w * 0.81, h * 0.6, 52, 1.3, 11);
        });
        tex.repeat.set(1 / PW, 1 / PH); tex.offset.set(0.5, 0.5);
        [-1, 1].forEach(sx => {
          const C = V(0.44 * sx, 1.52, 0.02), dir = V(0.42 * sx, 0.46, 0.78);
          const base = wrap(extrude(cloudShape(PW * 1.12, PH * 1.18), 0.035, 0.012, 2, 60), C.clone().add(V(0, -0.02, -0.01)), dir.clone().add(V(0, -0.1, 0)), 0.34);
          mesh(base, greenMat, armorG, null, null, GREEN_INK);
          const plate = wrap(extrude(cloudShape(PW, PH), 0.04, 0.014, 2, 60), C, dir, 0.38);
          mesh(plate, [texMat(tex, { roughness: 0.7 }), std(GOLD, { roughness: 0.6 })], armorG, null, null, M('#C9A060'));
        });
      }

      /* ================= puffy trousers + boots ================= */
      const bootsG = part('boots', K.poseG);
      {
        const tm = std(M('#F8E0BE', 1.3), { roughness: 0.9 });
        const tl = lathe([[0.16, 0.37], [0.26, 0.39], [0.33, 0.45], [0.35, 0.52], [0.32, 0.6], [0.22, 0.67], [0.08, 0.72]], 40);
        [[-0.38, 0.06], [0.42, 0.06]].forEach(([x, z]) => mesh(tl.geo, tm, bootsG, [x, 0, z], null, CREAM_INK));
        // wavy trouser cuffs gathered over the boot shafts
        [[-0.4, 0.14], [0.43, 0.14]].forEach(([x, z]) => {
          const t = mesh(new THREE.TorusGeometry(0.22, 0.045, 10, 40), tm, bootsG, [x, 0.41, z], [1, 1, 0.8], CREAM_INK); t.rotation.x = Math.PI / 2;
        });
        const soleMat = std(GOLD_DK, { roughness: 0.6 });
        [[-0.4, 0.14, -1], [0.43, 0.14, 1]].forEach(([x, z, sx]) => {
          const bg = group(bootsG, [x, 0, z], [0, 0.3 * sx, 0]);
          // brown foot: a big rounded shoe, toe pointing forward-outward
          const SA = [0.24, 0.19, 0.31], SC = [0, 0.125, 0.07];
          mesh(sphere(1, 36, 24).scale(SA[0], SA[1], SA[2]), brownMat, bg, SC, null, BROWN_INK);
          // gold sole rim
          mesh(new THREE.CylinderGeometry(1, 1, 0.045, 44).scale(0.26, 1, 0.33), soleMat, bg, [0, 0.024, 0.07], null, GOLD_INK);
          // gold stripe from the shaft down the instep to the toe, lying on the shoe surface
          const sp = []; for (let i = 0; i <= 16; i++) { const th = 0.45 + 1.0 * i / 16; sp.push([0, SC[1] + (SA[1] + 0.006) * Math.cos(th), SC[2] + (SA[2] + 0.006) * Math.sin(th)]); }
          mesh(tube(sp, 0.019, 30, 8), goldMat, bg, null, null, GOLD_INK);
          // green shaft with a gold top band and a round gold button
          mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.17, 32), greenMat, bg, [0, 0.28, -0.02], null, GREEN_INK);
          const r = mesh(new THREE.TorusGeometry(0.205, 0.022, 8, 40), goldMat, bg, [0, 0.355, -0.02], null, GOLD_INK); r.rotation.x = Math.PI / 2;
          mesh(sphere(0.05, 16, 12), goldMat, bg, [0, 0.27, 0.19], [1, 1, 0.55], GOLD_INK);
        });
      }

      /* ================= face: eye glints, philtrum, mustache, goatee, freckles ================= */
      {
        const onF = (x, y, off) => K.onSkin(x, y, [K.headMesh]).p.add(V(0, 0, off || 0.01));
        // one small glint at the upper right of each eye, as drawn
        // matte eyeballs (the drawing has no sheen apart from the single glint)
        K.eyes.forEach(eg => eg.traverse(o => { if (o.isMesh && o.material !== K.M.shine) { o.material = o.material.clone(); o.material.roughness = 0.8; } }));
        K.eyes.forEach(eg => { const m = mesh(sphere(0.017, 14, 10), K.M.shine, eg.children[0], [0.03, 0.038, 0.03]); m.castShadow = false; });
        const mm = std('#6B4632', { roughness: 0.6 });
        mesh(tube([onF(0, HY - 0.058), onF(0, HY - 0.1)], 0.009, 6, 8), mm, K.faceG);
        // 八字鬍: two separate commas, thick beside the mouth, tapering out and down
        const mus = std(M('#B07A50', 1.2), { roughness: 0.85 });
        [-1, 1].forEach(sx => {
          const pts = [[0.1, -0.11], [0.155, -0.126], [0.205, -0.15], [0.25, -0.165], [0.285, -0.156]].map(([x, y]) => onF(x * sx - 0.006, HY + y, 0.016));
          mesh(tube(pts, t => 0.043 * (1 - Math.pow(t, 1.6)) * Math.min(1, 0.65 + t * 5) + 0.005, 30, 10), mus, K.faceG, null, null, '#7A4E30');
        });
        // goatee: a jagged ▼ tuft hanging from the chin over the chest ruff, strands running down to the point
        {
          const bmat = (c, e) => std(M(c, 1.15), { roughness: 0.95, emissive: new THREE.Color(M(c, 1.15)).convertSRGBToLinear(), emissiveIntensity: e || 0.3 });
          const bm = [bmat('#B27C50'), bmat('#9A6642'), bmat('#A87249')];
          const bx = -0.02, yT = HY - 0.29;
          const top = onF(bx, yT, 0.03);
          const bg = group(K.faceG, top.toArray(), [0.12, 0, 0]);
          const shape = [[-0.17, 0.0], [-0.12, 0.03], [-0.07, 0.005], [-0.03, 0.035], [0.02, 0.008], [0.07, 0.035], [0.11, 0.0], [0.16, 0.025],
            [0.15, -0.04], [0.115, -0.06], [0.11, -0.11], [0.07, -0.135], [0.06, -0.19], [0.025, -0.215], [-0.01, -0.285],
            [-0.04, -0.21], [-0.08, -0.19], [-0.09, -0.135], [-0.13, -0.11], [-0.14, -0.06], [-0.18, -0.04]];
          const geo = extrude(shape, 0.05, 0.02, 3, 4);
          { const pp = geo.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i); pp.setZ(i, pp.getZ(i) - 0.9 * x * x); } K.smoothNormals(geo); }
          const base = mesh(geo, bm[0], bg, null, null, '#7A4E30'); base.receiveShadow = false;
          K.addFur(base, { layers: 8, length: 0.035, gravity: 0.012, repeat: [34, 34] });
          // hair strands (no outline) converging towards the point
          for (let i = 0; i < 15; i++) {
            const f = i / 14 - 0.5, af = Math.abs(f);
            const x0 = f * 0.3 + (K.rand() - 0.5) * 0.02, y0 = 0.01 - af * 0.02;
            const xe = f * 0.16, ye = -0.25 + af * 0.24 + K.rand() * 0.03;
            const zf = (x) => 0.03 - 0.9 * x * x;
            const pts = [[x0, y0, zf(x0) + 0.005], [(x0 + xe) / 2 + f * 0.02, (y0 + ye) / 2, zf((x0 + xe) / 2) + 0.012], [xe, ye, zf(xe) + 0.004]];
            mesh(tube(pts, t => (0.014 - af * 0.005) * (1 - 0.85 * t) + 0.003, 16, 6), bm[1 + (i % 2)], bg).receiveShadow = false;
          }
        }
        // freckles in the blush
        const g = K.headTex.image.getContext('2d');
        [-1, 1].forEach(sx => [-0.03, 0.03].forEach(dx => {
          const s = K.onSkin(sx * 0.49 + dx, HY - 0.04, [K.headMesh]);
          if (!s.uv) return;
          g.fillStyle = 'rgba(228,112,104,0.9)'; g.beginPath(); g.arc(s.uv.x * 1024, (1 - s.uv.y) * 512, 2.6, 0, Math.PI * 2); g.fill();
        }));
        K.headTex.needsUpdate = true;
      }

      /* ================= long Somali cheek & ear fur ================= */
      {
        const edgeX = (y) => { let lo = 0, hi = 1.5; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; } return lo; };
        const furMat = std(FUR_MID, { roughness: 0.95 }), furMat2 = std(M('#D98347'), { roughness: 0.95 });
        const lock = (parent, a, dir, len, r0, mat, ink, bend) => {
          const d = V(dir[0], dir[1], dir[2]).normalize();
          const b = a.clone().addScaledVector(d, len * 0.55).add(V(0, bend * len, 0)), c = a.clone().addScaledVector(d, len);
          return mesh(tube([a, b, c], t => r0 * (1 - Math.pow(t, 1.3)) + 0.004, 20, 10), mat, parent, null, null, ink);
        };
        [-1, 1].forEach(sx => {
          [[2.77, -20, 0.14, 0.07], [2.64, -6, 0.17, 0.085], [2.5, 8, 0.22, 0.095], [2.36, 18, 0.27, 0.1], [2.22, 28, 0.28, 0.1], [2.09, 40, 0.26, 0.1], [1.97, 54, 0.22, 0.09]]
            .forEach(([y, ang, len, r0], i) => {
              const ex = edgeX(y), a = ang * Math.PI / 180, zz = [0.12, -0.05, 0.1, -0.06, 0.08, -0.06, 0.05][i];
              lock(K.faceG, V(sx * (ex - 0.08), y, zz), [sx * Math.cos(a), -Math.sin(a), zz * 0.8], len * (sx < 0 ? 1.18 : 0.88), r0, i % 2 ? furMat2 : furMat, INK, -0.12);
            });
          [[2.57, -0.3, 0.2], [2.37, -0.38, 0.22], [2.17, -0.34, 0.2], [2.77, -0.22, 0.16]].forEach(([y, z, len]) => {
            const ex = edgeX(y) * 0.9;
            lock(K.faceG, V(sx * (ex - 0.1), y, z), [sx * 0.45, -0.6, -0.62], len, 0.09, furMat, INK, -0.05);
          });
        });
        // white tufts in the ears
        const tm = std(M('#FFF6E8', 1.1), { roughness: 0.95 });
        K.ears.forEach(({ g, sx }) => {
          // feathery white tuft fanning up and inward from the lower inner ear
          mesh(sphere(1, 20, 14), tm, g, [0.0, 0.15, 0.1], [0.19, 0.18, 0.06]);
          [[-0.14, 0.06, 0.24, 0.05, -0.6], [-0.09, 0.03, 0.34, 0.055, -0.35], [-0.03, 0.04, 0.4, 0.055, -0.15], [0.03, 0.03, 0.38, 0.055, 0.05],
            [0.08, 0.04, 0.32, 0.05, 0.25], [0.13, 0.07, 0.24, 0.045, 0.45], [0.16, 0.1, 0.16, 0.04, 0.7], [-0.05, 0.16, 0.3, 0.045, -0.3], [0.05, 0.16, 0.28, 0.042, 0.15]]
            .forEach(([x, y, len, r0, ang]) => {
              lock(g, V(x * sx, y + 0.04, 0.1), [Math.sin(ang) * sx - 0.15 * sx, Math.cos(ang), 0.25], len, r0 * 1.3, tm, null, 0.04);
            });
        });
      }

      /* ================= hair crown (髮冠) + topknot + red ribbon ================= */
      const hatG = part('hat', K.head);
      hatG.position.set(0.0, 3.08, 0.0);
      {
        const cm = std(GREEN, { roughness: 0.8 }), gm2 = std(GOLD_DK, { roughness: 0.5, metalness: 0.1 });
        // flared base (wide at the bottom) + upright band
        const base = lathe([[0.3, 0.0], [0.3, 0.025], [0.26, 0.07], [0.215, 0.12], [0.2, 0.135]], 64);
        mesh(base.geo, cm, hatG, null, null, GREEN_INK);
        mesh(new THREE.CylinderGeometry(0.165, 0.182, 0.18, 48), cm, hatG, [0, 0.215, 0], null, GREEN_INK);
        [[0.012, 0.3, 0.018], [0.125, 0.205, 0.02], [0.305, 0.168, 0.024]].forEach(([y, r, tb]) => { const t = mesh(new THREE.TorusGeometry(r, tb, 10, 64), goldMat, hatG, [0, y, 0], null, GOLD_INK); t.rotation.x = Math.PI / 2; });
        // 如意 cloud curls on both front corners of the base
        [-1, 1].forEach(sx => {
          const cg = group(hatG, [0.255 * sx, 0.055, 0.14], [0, 0.95 * sx, 0]);
          mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.03, 24), cm, cg, null, null, GREEN_INK).rotation.x = Math.PI / 2;
          const sc = []; for (let i = 0; i <= 24; i++) { const t = i / 24, an = Math.PI * (0.4 + 1.6 * t) * -sx, r = 0.052 * (1 - 0.6 * t); sc.push([Math.cos(an) * r * sx, Math.sin(an) * r, 0.018]); }
          mesh(tube(sc, 0.011, 30, 6), goldMat, cg);
        });
        // big gold boss on the front, straddling band and base
        const boss = group(hatG, [0, 0.14, 0.2]);
        mesh(new THREE.TorusGeometry(0.075, 0.02, 10, 36), gm2, boss, null, null, GOLD_INK);
        mesh(sphere(0.068, 24, 16), std(M('#F8C874', 1.3), { roughness: 0.35, metalness: 0.15 }), boss, [0, 0, 0.008], [1, 1, 0.55], GOLD_INK);
        boss.rotation.x = -0.08;
        // brown topknot of fur: a flame-like tuft rising out of the band and flicking to the image-right
        const b1 = std(BUN, { roughness: 0.95 }), b2 = std(BUN_DK, { roughness: 0.95 }), b3 = std(M('#C47C4C'), { roughness: 0.95 });
        const bunG = group(hatG, [0.0, -0.03, -0.01]); bunG.scale.set(1.2, 1.08, 1.12);
        // one fat comma-shaped mass rising out of the band and flicking over to the image-right, plus a curl on the left
        mesh(tube([[0.0, 0.26, 0], [-0.02, 0.36, 0], [0.02, 0.44, 0], [0.12, 0.47, 0], [0.27, 0.43, -0.02], [0.38, 0.35, -0.04]],
          t => 0.155 * (1 - Math.pow(t, 1.5)) + 0.006, 40, 20), b1, bunG, null, null, INK);
        mesh(sphere(1, 28, 20), b1, bunG, [0.03, 0.4, 0], [0.16, 0.12, 0.14], INK);
        mesh(tube([[-0.05, 0.32, 0.02], [-0.15, 0.39, 0.02], [-0.18, 0.46, 0.0], [-0.12, 0.5, -0.01]], t => 0.07 * (1 - Math.pow(t, 1.2)) + 0.006, 24, 10), b2, bunG, null, null, INK);
        mesh(tube([[0.02, 0.42, 0.02], [0.08, 0.5, 0.0], [0.18, 0.53, -0.02], [0.28, 0.52, -0.04]], t => 0.075 * (1 - Math.pow(t, 1.1)) + 0.005, 24, 10), b3, bunG, null, null, INK);
        mesh(tube([[0.18, 0.4, 0.0], [0.3, 0.4, -0.02], [0.4, 0.36, -0.04]], t => 0.06 * (1 - t) + 0.005, 16, 8), b2, bunG, null, null, INK);
        // painted-looking strands on the front of the mass
        const sm = std(M('#CC8A58'), { roughness: 0.95 }), sd = std(BUN_DK, { roughness: 0.95 });
        [[[-0.06, 0.34, 0.14], [-0.04, 0.44, 0.11], [0.04, 0.5, 0.07], [0.16, 0.53, 0.02]], [[0.04, 0.34, 0.15], [0.08, 0.44, 0.12], [0.2, 0.49, 0.07], [0.32, 0.49, 0.02]],
          [[-0.1, 0.36, 0.1], [-0.13, 0.44, 0.07], [-0.1, 0.49, 0.04]]]
          .forEach((pts, i) => mesh(tube(pts, t => 0.018 * (1 - t) + 0.004, 20, 6), i === 1 ? sd : sm, bunG));
        // red ribbon tied behind the knot, streaming out to the image-right
        const rm = std(M('#DD7149'), { roughness: 0.8, side: THREE.DoubleSide });
        mesh(ribbon([[0.08, 0.27, -0.15], [0.28, 0.3, -0.08], [0.48, 0.36, -0.01], [0.68, 0.45, 0.04]], t => 0.085 * (1 - 0.6 * sst(0.8, 1, t)) + 0.012, { face: [0, 0.2, 1], segs: 40 }), rm, hatG, null, null, RED_INK);
        mesh(ribbon([[0.1, 0.23, -0.15], [0.28, 0.2, -0.08], [0.42, 0.17, -0.01], [0.54, 0.1, 0.04]], t => 0.07 * (1 - 0.6 * sst(0.8, 1, t)) + 0.012, { face: [0, 0.2, 1], segs: 40 }), rm, hatG, null, null, RED_INK);
      }

      /* ================= 芭蕉扇 in the image-left paw ================= */
      const fanG = part('fan', K.body);
      {
        const F = V(-0.47, 1.56, 0.78), B = V(-0.19, 1.04, 0.62);
        const hm = std(M('#EDB66B', 1.3), { roughness: 0.55 });
        mesh(tube([F, B], 0.03, 24, 10), hm, fanG, null, null, GOLD_INK);
        mesh(sphere(0.032, 14, 10), hm, fanG, B.toArray(), null, GOLD_INK);
        // ferrule cup
        const fg = group(fanG, F.toArray()); fg.quaternion.copy(q(UP, F.clone().sub(B)));
        mesh(new THREE.CylinderGeometry(0.065, 0.04, 0.07, 28), goldMat, fg, [0, 0.0, 0], null, GOLD_INK);
        const fr = mesh(new THREE.TorusGeometry(0.063, 0.014, 8, 28), goldMat, fg, [0, 0.035, 0]); fr.rotation.x = Math.PI / 2;
        // leaf: broad ovate banana/palm leaf with a pale midrib, pinnate side veins and a wavy pale-rimmed margin
        const LW = 0.96, LL = 0.88;
        const outline = [];
        for (let i = 0; i < 180; i++) {
          const th = i / 180 * Math.PI * 2;                // 0 at the stem, going round
          const k = 1 + 0.035 * (Math.pow(Math.abs(Math.sin(th * 6.5)), 0.5) - 0.6);
          const narrow = 1 - 0.12 * Math.pow(Math.max(0, Math.cos(th)), 2.5);
          outline.push([Math.sin(th) * LW / 2 * k * narrow, LL / 2 - Math.cos(th) * LL / 2 * k]);
        }
        const leafGeo = extrude(outline, 0.022, 0.008, 2, 4);
        { const p = leafGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) - 0.16 * x * x - 0.05 * Math.pow((y - LL * 0.5) / LL, 2)); } K.smoothNormals(leafGeo); }
        const lt = canvasTex(512, 512, (g, w, h) => {
          g.fillStyle = FAN; g.fillRect(0, 0, w, h);
          const px = (x, y) => [(x / LW + 0.5) * w, (1 - y / LL) * h];
          g.lineCap = 'round';
          // soft darker bands between the veins
          for (let i = 0; i < 8; i++) {
            const y = 0.1 + i * 0.11;
            [-1, 1].forEach(sd => {
              const [x0, y0] = px(0, y + 0.05), [x1, y1] = px(sd * 0.3, y + 0.2), [x2, y2] = px(sd * 0.46, y + 0.26);
              g.strokeStyle = NEKO.rgba(FAN_DK, 0.35); g.lineWidth = 16;
              g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
            });
          }
          // pinnate side veins curving out and up from the midrib
          for (let i = 0; i < 7; i++) {
            const y = 0.05 + i * 0.115;
            [-1, 1].forEach(sd => {
              const [x0, y0] = px(0, y), [x1, y1] = px(sd * 0.3, y + 0.07), [x2, y2] = px(sd * 0.5, y + 0.24);
              g.strokeStyle = NEKO.rgba(FAN_LT, 0.95); g.lineWidth = 5;
              g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
            });
          }
          // midrib
          { const [x0, y0] = px(0, 0), [x1, y1] = px(0, LL * 0.96); g.strokeStyle = FAN_LT; g.lineWidth = 11; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
          // pale rim just inside the edge
          g.strokeStyle = FAN_LT; g.lineWidth = 12; g.beginPath();
          outline.forEach(([x, y], i) => { const [a, b] = px(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.stroke();
        });
        lt.repeat.set(1 / LW, 1 / LL); lt.offset.set(0.5, 0);
        const leafG = group(fanG, F.clone().add(V(0.0, -0.035, 0.02)).toArray(), [-0.08, 0.12, 0.66]);
        mesh(leafGeo, [texMat(lt, { roughness: 0.8, side: THREE.DoubleSide }), std(FAN_DK, { roughness: 0.8 })], leafG, null, null, GREEN_INK);
        K._fanLeaf = leafG;
      }

      /* ================= floating 處暑 decorations ================= */
      {
        const items = [];
        const leafShape = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.45, 0, L); s.quadraticCurveTo(-w, L * 0.45, 0, 0); return s; };
        // sun (upper image-right)
        {
          const g = group(K.decor, [2.1, 3.45, -0.3]);
          const sm = std(M('#F6B45C', 1.2), { roughness: 0.6, emissive: new THREE.Color(M('#F6B45C')).convertSRGBToLinear(), emissiveIntensity: 0.25 });
          mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 48), sm, g, null, null, M('#E39A45')).rotation.x = Math.PI / 2;
          for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2;
            mesh(tube([[Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0], [Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0]], 0.045, 4, 10), sm, g);
            [0.46, 0.6].forEach(rr => mesh(sphere(0.045, 12, 8), sm, g, [Math.cos(a) * rr, Math.sin(a) * rr, 0]));
          }
          items.push(g);
        }
        // drooping rice panicle (image-right)
        {
          const g = group(K.decor, [1.9, 2.0, 0.15]);
          const st = std(M('#8F9A55'), { roughness: 0.8 }), gr = std(M('#F2C46A', 1.25), { roughness: 0.6 });
          const panicle = (pts, n, gs) => {
            const cv = K.curve3(pts);
            mesh(tube(cv, 0.014, 30, 6), std(M('#C9A052'), { roughness: 0.8 }), g);
            for (let i = 0; i < n; i++) {
              const t = 0.12 + 0.86 * i / (n - 1), p = cv.getPointAt(t), T = cv.getTangentAt(t);
              [-1, 1].forEach(k => {
                const side = T.clone().cross(V(0, 0, 1)).normalize();
                const m = mesh(sphere(1, 12, 8), gr, g, p.clone().addScaledVector(side, k * gs * 0.7).toArray(), [gs * 0.6, gs, gs * 0.55], M('#C99A45'));
                m.quaternion.copy(q(UP, T.clone().addScaledVector(side, k * 0.7)));
              });
            }
          };
          mesh(tube([[-0.15, -0.75, 0], [-0.08, -0.2, 0], [0.0, 0.3, 0], [0.12, 0.52, 0]], 0.02, 30, 6), st, g);
          panicle([[0.12, 0.52, 0], [0.3, 0.58, 0], [0.45, 0.48, 0], [0.52, 0.28, 0]], 8, 0.055);
          panicle([[0.05, 0.4, 0.02], [0.2, 0.36, 0.03], [0.3, 0.22, 0.03], [0.33, 0.06, 0.03]], 6, 0.048);
          const lm = std(M('#A7AE67'), { roughness: 0.8, side: THREE.DoubleSide });
          mesh(extrude(leafShape(0.75, 0.07), 0.015, 0.004, 1, 8), lm, g, [-0.12, -0.6, 0], null, GREEN_INK).rotation.z = 0.55;
          mesh(extrude(leafShape(0.6, 0.06), 0.015, 0.004, 1, 8), lm, g, [-0.1, -0.45, 0], null, GREEN_INK).rotation.z = -0.8;
          items.push(g);
        }
        // pampas grass (芒草) with feathery drooping plumes, lower image-left
        {
          const g = group(K.decor, [-1.55, 0.4, 0.25]);
          const st = std(M('#A7AE67'), { roughness: 0.8 }), pl = std(M('#EEDBBE', 1.25), { roughness: 1 }), pl2 = std(M('#E2C9A2', 1.2), { roughness: 1 });
          [[-0.15, 0.85, -0.22], [0.08, 1.0, 0.18], [0.25, 0.72, 0.4]].forEach(([x, hgt, lean], j) => {
            const top = V(x + lean * 0.3, hgt, 0);
            mesh(tube([[x, -0.4, 0], [x + lean * 0.08, hgt * 0.45, 0], top], 0.014, 20, 6), st, g);
            const dir = lean >= 0 ? 1 : -1;
            for (let i = 0; i < 9; i++) {
              const f = i / 8, sp = (f - 0.5) * 0.5;
              const a = top.clone().add(V(0, -0.02 * i, 0));
              const tip = a.clone().add(V(dir * (0.12 + 0.18 * f) + sp * 0.2, 0.22 - 0.3 * f, 0.02 * (i % 3 - 1)));
              const mid = a.clone().lerp(tip, 0.5).add(V(0, 0.06, 0));
              mesh(tube([a, mid, tip], t => 0.03 * (1 - t) + 0.005, 12, 6), (i + j) % 2 ? pl : pl2, g);
            }
          });
          const lm = std(M('#9FA55F'), { roughness: 0.8, side: THREE.DoubleSide });
          [[-0.1, 0.8, 0.45], [0.15, 0.7, -0.35], [0.3, 0.55, -0.8]].forEach(([x, L, r]) => mesh(extrude(leafShape(L, 0.05), 0.012, 0.004, 1, 8), lm, g, [x, -0.4, 0.02], null, GREEN_INK).rotation.z = r);
          items.push(g);
        }
        const nut = (parent, pos, rz, s) => {
          const n = group(parent, pos, [0.3, 0, rz]); n.scale.setScalar(s || 1);
          mesh(K.dropGeo(0.2, 0.11, 1.8), std(M('#8A5634'), { roughness: 0.5 }), n, null, [1, 1, 0.75], BROWN_INK);
          mesh(sphere(0.075, 12, 8), std(M('#E9C79C', 1.2), { roughness: 0.8 }), n, [0, -0.045, 0], [1.1, 0.4, 0.8]);
          return n;
        };
        // persimmon + chestnuts, image-left ground
        {
          const g = group(K.decor, [-1.4, 0.2, 0.55]);
          mesh(sphere(0.24, 32, 22), std(M('#F08A3C', 1.3), { roughness: 0.55 }), g, null, [1.1, 0.85, 1.1], M('#C9642A'));
          const cal = std(M('#8C9A4E'), { roughness: 0.8 });
          for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; const l = mesh(sphere(0.07, 12, 8), cal, g, [Math.cos(a) * 0.07, 0.2, Math.sin(a) * 0.07], [1.2, 0.3, 0.6]); l.rotation.y = -a; }
          mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.07, 8), cal, g, [0, 0.25, 0]);
          nut(g, [-0.42, -0.12, 0.1], 1.3); nut(g, [0.38, -0.13, 0.12], -1.4); nut(g, [0.12, -0.15, 0.36], -1.2, 0.85);
          items.push(g);
        }
        // chestnuts, seeds and a fallen leaf, image-right ground
        {
          const g = group(K.decor, [1.75, 0.15, 0.45]);
          nut(g, [0, 0, 0], 1.2); nut(g, [0.3, -0.02, 0.08], -1.1, 0.9);
          const sd = std(M('#F3E3C8', 1.2), { roughness: 0.8 });
          [[-0.45, -0.02, 0.1, 0.3], [-0.32, -0.05, 0.25, -0.4], [-0.6, -0.06, 0.3, 0.9]].forEach(([x, y, z, r]) => mesh(sphere(0.06, 14, 10), sd, g, [x, y, z], [1.5, 0.35, 0.8], M('#D6BE98')).rotation.y = r);
          const lf = group(g, [0.45, 0.18, -0.05], [0.2, 0.3, -0.5]);
          mesh(extrude(leafShape(0.32, 0.13), 0.02, 0.006, 1, 10), std(M('#F0B455', 1.2), { roughness: 0.75 }), lf, [0, -0.16, 0], null, M('#C98A3A'));
          items.push(g);
        }
        // falling golden leaves
        const lg = std(M('#F0B455', 1.2), { roughness: 0.75, side: THREE.DoubleSide }), lg2 = std(M('#E89B45', 1.2), { roughness: 0.75, side: THREE.DoubleSide });
        [[-1.75, 3.0, 0.0, 0.8, lg], [-2.0, 1.6, 0.2, -0.9, lg2]].forEach(([x, y, z, r, m]) => {
          const g = group(K.decor, [x, y, z], [0.3, 0.2, r]);
          mesh(extrude(leafShape(0.34, 0.14), 0.02, 0.006, 1, 10), m, g, [0, -0.17, 0], null, M('#C98A3A'));
          mesh(tube([[0, -0.17, 0.012], [0, 0.12, 0.012]], 0.007, 6, 5), std(M('#C98A3A'), { roughness: 0.8 }), g);
          items.push(g);
        });
        // late-summer breeze wisps (curl + trailing tail)
        const wisp = (pos, sx, s) => {
          const g = group(K.decor, pos); g.scale.set(sx * s, s, s);
          const pts = [];
          for (let i = 0; i <= 30; i++) { const a = Math.PI * 0.2 + i / 30 * Math.PI * 2.2, r = 0.2 * (1 - 0.75 * i / 30); pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]); }
          const tail = [[0.55, -0.1, 0], [0.35, -0.02, 0], [0.2 * Math.cos(Math.PI * 0.2) + 0.02, 0.2 * Math.sin(Math.PI * 0.2) - 0.03, 0]];
          const all = tail.concat(pts);
          mesh(tube(all, t => 0.012 + 0.03 * Math.sin(Math.PI * Math.min(1, t * 1.3)), 90, 8), std(M('#F4DDBA', 1.2), { roughness: 0.7 }), g, null, null, M('#E0BE8E'));
          items.push(g);
        };
        wisp([1.45, 2.7, 0.0], 1, 1.0);
        wisp([-1.85, 2.3, 0.0], -1, 0.9);
        items.forEach((g) => { g.userData.y0 = g.position.y; g.userData.r0 = g.rotation.z; });
        K.onTick((t, k) => items.forEach((g, i) => {
          g.position.y = g.userData.y0 + 0.07 * Math.sin(t * 1.1 + i * 1.3) * k;
          g.rotation.z = g.userData.r0 + 0.1 * Math.sin(t * 0.8 + i) * k;
        }));
      }
    },

    action: {
      label: '搧扇', dur: 1.8,
      run(s, p, K) { if (K._fanLeaf) K._fanLeaf.rotation.y = 0.12 + 0.45 * Math.sin(p * Math.PI * 6) * s; }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '處暑・猛張飛驅暑',
        text: '處暑是「暑氣至此而止」的節氣，這隻赤橘色長毛的索馬利亞貓化身三國猛將張飛：皺眉瞪眼、蓄著八字鬍與山羊鬍，畫面左手握芭蕉扇、右手握拳擱在腰側，要把最後的暑氣一搧而散。紅橘戰袍配橄欖綠滾邊與暖金雲紋，是夏末轉秋的熟成色調。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '怒目張飛臉',
        text: '額頭一道深色楔形紋往下尖到兩眼之間，眼睛上方各冒一團奶油白毛；兩道粗短的深棕眉毛內低外高、一臉怒相。圓圓的深棕眼睛只點一顆亮點，粉色小鼻下抿成「︿」的嘴，兩側各一撇內粗外尖的八字鬍，下巴垂一撮倒三角的棕色山羊鬍，腮紅上還點著兩顆小紅點。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '大耳與長毛',
        text: '索馬利亞貓招牌的大尖耳，耳內淡粉並冒出一叢白色長耳毛；臉頰兩側炸開一撮撮尖尖的長毛，讓頭比身體還寬。' },
      hat: { chip: '髮冠', tag: '服飾', name: '綠金髮冠與紅緞帶', dir: [0.3, 0.3, 1],
        text: '頭頂把毛紮成一撮棕色髮髻，先往上鼓起再像火焰般甩向畫面右側。髮髻套著橄欖綠髮冠：冠身上下鑲金邊、底座外擴並在兩角捲成如意雲頭，正面嵌一顆大金珠；冠後繫著紅緞帶，往右上飄。' },
      fan: { chip: '芭蕉扇', tag: '道具', name: '綠芭蕉扇', dir: [-0.25, 0.1, 1],
        text: '畫面左手握著一把比臉還大的綠色芭蕉扇，寬卵形的葉面斜向左上，米黃主脈兩側長出羽狀側脈，波浪葉緣描一圈淡黃邊；扇柄穿過拳頭，柄頭套著金色扇箍。按下「搧扇」可以看牠把暑氣搧走。' },
      armor: { chip: '肩甲', tag: '服飾', name: '雲紋肩甲', dir: [0.4, 0.4, 1],
        text: '兩肩各覆一片米白色的如意雲形肩甲，正中用暖金畫出一團捲雲，底下再墊一層橄欖綠甲片，是武將的標誌。' },
      robe: { chip: '戰袍', tag: '服飾', name: '朱紅交領戰袍',
        text: '朱紅色交領袍，領口是綠色寬領緣加一道米白內襟。腰下前襟敞開成兩片外擺，綠色滾邊的下角各繡一朵暖金祥雲；中間露出綠色前片與米白荷葉邊內裙。' },
      sleeves: { chip: '袖與護腕', tag: '服飾', name: '寬袖與皮護腕', dir: [0.5, 0, 1],
        text: '紅色寬袖在手肘處鼓起，袖口翻出一圈米白袖緣，前臂套著深棕色皮護腕、外側釘一顆金釘，拳頭則是奶白色的貓掌。' },
      belt: { chip: '腰帶', tag: '服飾', name: '紅腰帶與垂帶', dir: [0.3, 0, 1],
        text: '腰間是一條上下鑲金邊的綠色寬腰封，中段纏朱紅腰帶，在正前方打成方結、左右各一個帶耳；垂下兩條紅帶尾，另有兩條卡其色長帶，一條垂過蔽膝、一條往右斜飄。' },
      boots: { chip: '戰靴', tag: '服飾', name: '燈籠褲與戰靴', dir: [0.2, 0.2, 1],
        text: '米白燈籠褲在膝下鼓成圓圓一團、褲口皺摺蓋在靴口上；腳踩外八的深棕戰靴：綠色靴筒上緣一道金邊、正面一顆金扣，一條金線沿著腳背延伸到鞋尖，鞋底也包著金邊。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '松鼠般的大尾巴', dir: [1, 0.25, -0.7],
        text: '索馬利亞貓又被叫作「狐狸貓」，尾巴像狐狸一樣蓬鬆：從右後方甩出、在畫面右側繞成大大的 S 形，末端往內捲起，尾尖顏色較淡。' }
    },
    order: ['overview', 'face', 'ears', 'hat', 'fan', 'armor', 'robe', 'sleeves', 'belt', 'boots', 'tail']
  });
})();
