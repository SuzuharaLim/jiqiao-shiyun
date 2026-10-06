// @file 12_大暑_俄羅斯藍貓
// @title 大暑・水神將軍 | 二十四節氣貓
// 大暑：灰色的俄羅斯藍貓化身「水神將軍」，戴水滴小冠、雙爪抱著青花蓮紋寶瓶往畫面左下倒出一大股清水，
// 身邊繞著淡藍披帛，周圍有粉蓮、荷葉與水珠，替最炎熱的時節送來清涼。
// 比例取自 refs/12.png（約 92 px = 1 單位：x = (px-250)/92，y = (482-py)/92，見 U()）。
(function () {
  // renderer lights brighten front faces ~1.45× (linear): M() maps a SAMPLED colour to the material colour
  function M(hex, f) {
    f = f || 1.45; const n = parseInt(hex.slice(1), 16);
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
      const c = Math.round(255 * Math.pow(Math.pow(v / 255, 2.2) / f, 1 / 2.2));
      return Math.min(255, c).toString(16).padStart(2, '0');
    }).join('');
  }
  // picture pixel → model units
  const U = (px, py) => [(px - 250) / 92, (482 - py) / 92];
  // ---- colours sampled from refs/12.png ----
  const S = {
    fur: '#ADA6AA', furTop: '#AAA3A7', furLow: '#B1AAAE', furInk: '#7F787D',
    earIn: '#F8D1C6', earTuft: '#F7EBE5', iris: '#3F5535', eyeRim: '#2F3321', nose: '#D0938B', mouth: '#5E4642',
    cream: '#F7F2E5', creamInk: '#B9B39F',
    blue: '#82A4BC', blueDeep: '#7395B2', cuff: '#7C9FC4', blueLite: '#B8D3E4', blueInk: '#5E7F9C',
    green: '#9DBB8F', greenDeep: '#89AE8D', greenInk: '#6F8E62',
    gold: '#F5DEA0', goldDeep: '#E6C173', goldInk: '#B6934A', panelGold: '#F8E9BB',
    teal: '#6A8B99', tealTop: '#A6BFBA', tealLow: '#658795', tealInk: '#4C6874', hatCream: '#E4D6A8',
    leaf: '#A9C08D', leafDeep: '#8FAE7C', jewel: '#8CB6DE',
    porcelain: '#F2F2EA', lotusBlue: '#8DB9DE', lotusDeep: '#6E9CC8',
    water: '#AED4EE', waterLite: '#D8EAF5', waterInk: '#6FA6D2',
    ribBlue: '#9BBCDA', ribPale: '#D2E4DD', ribEdge: '#86B0D8',
    lotus: '#F7C9BF', lotusPink: '#EFA7A0', pad: '#8DB28A', padLite: '#A9C79E', padInk: '#5F8B5A', cloud: '#E3EDF2'
  };
  // the key light is warm: shift the greys toward blue so they render back to the picture's cool grey
  const FUR = M('#A5A1AE'), FUR_TOP = M('#A29EAB'), FUR_LOW = M('#B0ACB8'), CHEEK = M('#B3AFBA');
  const CREAM = M('#F3F1EA', 1.5);
  const REF = {};

  // stylised lotus (蓮花): five petals fanning up from a base point
  function lotusMotif(g, x, y, s, color, core) {
    g.save(); g.translate(x, y); g.fillStyle = color;
    [[0, 1], [-0.52, 0.82], [0.52, 0.82], [-1.0, 0.6], [1.0, 0.6]].forEach(([a, k]) => {
      g.save(); g.rotate(a * 0.85);
      g.beginPath(); g.moveTo(0, 0);
      g.bezierCurveTo(s * 0.28 * k, -s * 0.3 * k, s * 0.22 * k, -s * 0.72 * k, 0, -s * 0.92 * k);
      g.bezierCurveTo(-s * 0.22 * k, -s * 0.72 * k, -s * 0.28 * k, -s * 0.3 * k, 0, 0); g.fill();
      g.restore();
    });
    if (core) { g.fillStyle = core; g.beginPath(); g.ellipse(0, -s * 0.02, s * 0.22, s * 0.1, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  // 水渦 / 祥雲 curl used on sleeves and skirt flaps
  function curl(g, x, y, s, color, lw) {
    g.save(); g.translate(x, y); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, s * 0.32, Math.PI * 0.2, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(s * 0.06, s * 0.02, s * 0.14, Math.PI * 1.1, Math.PI * 2.6); g.stroke();
    g.beginPath(); g.arc(s * 0.62, s * 0.08, s * 0.24, Math.PI * 1.0, Math.PI * 2.2); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.7, s * 0.34); g.quadraticCurveTo(0, s * 0.42, s * 0.95, s * 0.3); g.stroke();
    g.restore();
  }
  // 海浪 scallops (three nested arcs per wave)
  function waves(g, x0, x1, y, r, color, lw) {
    g.save(); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
    for (let x = x0; x <= x1; x += r * 2) [1, 0.66, 0.33].forEach(k => { g.beginPath(); g.arc(x, y, r * k, Math.PI, 0); g.stroke(); });
    g.restore();
  }
  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

  NEKO.run({
    meta: {
      id: '12', term: '大暑', title: '大暑・水神將軍', seal: '暑',
      eyebrow: '二〇二七節氣貓 · 12 大暑 · 俄羅斯藍貓',
      aria: '戴青藍水滴小冠、穿米白青花短袍與藍色腰帶，雙爪抱著青花蓮紋寶瓶往左下倒出一大股清水，身邊繞著淡藍披帛的灰色俄羅斯藍貓 3D 模型'
    },
    theme: { accent: '#4E7496', accentDark: '#A9C9E4', glow: 'rgba(174,212,238,0.34)', glowColor: '#BFE0F4' },
    palette: [['#ADA6AA', '藍灰毛色'], ['#F7F2E5', '米白'], ['#82A4BC', '青花藍'], ['#9DBB8F', '荷葉綠']],
    spec: [['品種', '俄羅斯藍貓'], ['角色', '水神將軍'], ['頭身比', '約 1 : 1.9']],
    seed: 12,

    cat: {
      fur: {
        color: FUR, top: FUR_TOP, mid: FUR, low: FUR_LOW, deep: M('#9A9397'), cream: CHEEK,
        ink: S.furInk, creamInk: S.furInk, pattern: 'none', mask: false,
        noise: { colors: [M('#C9C3C6'), M('#968F93')], alpha: 0.09, n: 1400 }
      },
      // picture head: ~198 px wide at the cheeks, ~138 px crown→chin, broad forehead, square jowls, flat chin
      head: { y: 3.5, neck: 2.78, w: 0.965, h: 0.76, d: 0.84, cheek: 0.07, ruff: 0.04, ruffFreq: 13, chinDrop: 0.0,
        deform(p, o) {
          const th = Math.atan2(o.y, Math.hypot(o.x, o.z) || 1e-6), n = o.y < 0 ? 3.5 : 2.1;
          const c = Math.abs(Math.cos(th)), sn = Math.abs(Math.sin(th));
          const rho = Math.pow(Math.pow(c, n) + Math.pow(sn, n), -1 / n);
          p.x *= rho; p.z *= Math.min(rho, 1.12); p.y *= rho;
        },
        fur: { layers: 8, length: 0.022, gravity: 0.006, repeat: [12, 6] } },
      eyes: { x: 0.415, y: -0.11, r: 0.158, sx: 0.9, sy: 1.06, sz: 0.4, color: S.eyeRim, iris: M('#4A6A3F', 1.2), pupil: '#1E2517', pupilR: 0.42, shine: 1.05 },
      nose: { y: -0.22, color: M(S.nose, 1.2), size: 0.8 },
      muzzle: false,
      mouth: { type: 'w', color: S.mouth, y: -0.3, w: 0.16 },
      blush: { color: 'rgba(236,158,156,0.55)', x: 0.57, y: -0.31, r: 30 },
      whiskers: { color: '#F7F4F2', n: 2, len: 0.62, r: 0.009, y: -0.27, x: 0.4, spread: 0.1, droop: 0.02, curve: 0.02 },
      // tall ears whose outer edges run straight down into the cheeks (picture: outer edge vertical at x≈155 / 352 px)
      ears: { x: 0.5, y: 0.27, z: -0.04, tilt: 0.46, yaw: 0.16, pitch: -0.05, size: [0.68, 1.02, 0.2], sharp: 0.93,
        color: FUR, inner: M('#F2BDB8', 1.25), tuft: M(S.earTuft, 1.15), innerScale: 1.08,
        R: { x: 0.56 },
        fur: { layers: 8, length: 0.03, gravity: 0.008, repeat: [3, 3] } },
      bib: false,
      robe: {
        // blue under-skirt hem at y ≈ 0.52 (picture: peeks out under the side flaps at 410–430 px)
        profile: [[0.8, 0.5], [0.8, 0.58], [0.73, 0.9], [0.65, 1.25], [0.59, 1.6], [0.56, 2.0], [0.55, 2.3], [0.45, 2.6], [0.14, 2.76]],
        color: '#FFFFFF', ink: S.creamInk, lining: M(S.blue), hemY: 0.66,
        paint(g, w, h, D) { D.fill(g, CREAM); }
      },
      collar: { color: M(S.blue), r: 0.065, over: 1, y0: 2.66, style: 'cross' },
      // outer skirt: cream flaps with green edges, open at the front for the panel (renamed to 'robe' in build)
      cape: {
        color: CREAM, y0: 1.56, y1: 0.56, off: 0.035, open: 56, flare: 0.14, lining: M(S.blue), ink: S.creamInk,
        paint(g, w, h, D) {
          // x 0 = image-right front edge, 512 = back, 1024 = image-left front edge; bottom = hem
          D.fill(g, CREAM);
          curl(g, 150, 290, 125, M(S.lotusBlue, 1.2), 16);
          curl(g, 870, 280, 140, M(S.lotusBlue, 1.2), 16);
          curl(g, 512, 300, 130, M(S.lotusBlue, 1.2), 15);
          D.wave(g, 150, 10, 200, M(S.green, 1.2), 10);
          // green hem band and green front edges
          g.fillStyle = M(S.green, 1.25); g.fillRect(0, h - 46, w, 46);
          g.fillStyle = M(S.greenInk); g.fillRect(0, h - 50, w, 5);
          g.fillStyle = M(S.green, 1.25); g.fillRect(0, 0, 34, h); g.fillRect(w - 34, 0, 34, h);
          // side slits: a blue under-layer strip where the side flaps part (image-right & image-left sides)
          [256, 768].forEach(x => { g.fillStyle = M(S.green, 1.25); g.fillRect(x - 22, 200, 44, h); g.fillStyle = M(S.cuff); g.fillRect(x - 8, 260, 16, h); });
        }
      },
      arms: {
        // image-left paw pressed on top of the vase belly (picture 150,245 px)
        L: { hand: [-1.08, 2.6, 1.0], path: [[-0.5, 2.56, 0.05], [-0.95, 2.38, 0.35], [-1.04, 2.48, 0.8]], drop: 0.7, width: 1.02, pawScale: 1.9 },
        // image-right paw out of the wide sleeve, in front of the chest gripping the big gold ring (242,305 px)
        R: { hand: [-0.1, 1.95, 1.04], path: [[0.5, 2.56, 0.05], [0.9, 2.14, 0.42], [0.16, 1.98, 0.96]], drop: 1.08, width: 1.06, pawScale: 1.9 }
      },
      sleeves: {
        style: 'wide', color: '#FFFFFF', lining: M(S.blueLite), trim: M(S.cuff), trimR: 0.035, ink: S.creamInk,
        paint(g, w, h, D) {
          D.fill(g, CREAM);
          // on the pouch's front face (u 0.5–0.75) canvas +x runs DOWN the sleeve and canvas −y toward the cuff,
          // so the motifs are drawn turned by −90° to read upright on screen
          const rc = (x, y, sz, lw) => { g.save(); g.translate(x, y); g.rotate(-Math.PI / 2); curl(g, 0, 0, sz, M(S.lotusBlue, 1.2), lw); g.restore(); };
          g.strokeStyle = M(S.green, 1.2); g.lineWidth = 12; g.lineCap = 'round';
          [572, 948].forEach(x0 => { g.beginPath(); for (let y = 0; y <= h; y += 6) { const x = x0 + Math.sin(y / h * Math.PI * 2.2) * 16; y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); });
          rc(648, 190, 120, 13); rc(652, 360, 90, 11); rc(890, 200, 110, 12);
          [[300, 330], [140, 360], [200, 180]].forEach(([x, y]) => curl(g, x, y, 90, M(S.lotusBlue, 1.2), 11));
          // blue hem along the bottom of the hanging pouch (u = 0.75) and a wide two-tone cuff band at the top rows
          g.fillStyle = M(S.cuff); g.fillRect(700, 0, 136, h * 0.62);
          // the wide sleeve opening runs diagonally from the paw down to the bottom of the pouch (blue lining shows)
          g.beginPath(); g.moveTo(500, 0); g.lineTo(660, 0); g.lineTo(840, h * 0.55); g.lineTo(700, h * 0.62); g.closePath(); g.fill();
          g.strokeStyle = M(S.blueLite, 1.2); g.lineWidth = 12; g.beginPath(); g.moveTo(660, 0); g.lineTo(840, h * 0.55); g.stroke();
          g.fillStyle = M(S.blueLite, 1.2); g.fillRect(688, 0, 12, h * 0.62); g.fillRect(836, 0, 12, h * 0.62);
          g.fillStyle = M(S.cuff); g.fillRect(0, 0, w, 64);
          g.fillStyle = M(S.blueLite, 1.2); g.fillRect(0, 64, w, 16);
          g.fillStyle = M(S.green, 1.2); g.fillRect(0, 80, w, 8);
        }
      },
      paws: { color: FUR, ink: S.furInk },
      belt: { yT: 1.67, yB: 1.52, color: M(S.blueDeep), line: false, knot: false, tassel: false },
      legs: false,
      feet: false,
      tail: {
        pts: [[0.42, 0.78, -0.45], [0.98, 0.68, -0.55], [1.5, 0.78, -0.45], [1.78, 1.08, -0.36], [1.84, 1.5, -0.3], [1.68, 1.84, -0.26], [1.42, 1.93, -0.22]],
        r: 0.23, color: FUR, deep: FUR, tip: FUR, tipStart: 1, bands: 0,
        shape: t => t < 0.88 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.88) / 0.12, 2))) * 0.9 + 0.1,
        fur: { layers: 10, length: 0.035, gravity: 0.01, repeat: [14, 6] }
      }
    },

    build(K) {
      const { THREE, V, mesh, part, group, std, texMat, canvasTex, sphere, extrude, tube, lathe, ribbon, D } = K;
      const goldMat = std(M(S.gold, 1.3), { roughness: 0.45, metalness: 0.1 });
      const goldDk = std(M(S.goldDeep), { roughness: 0.5, metalness: 0.1 });

      // the picture's eye highlights sit toward the nose: mirror them on the image-left eye
      K.eyes[0].children[0].children.forEach(m => { if (m.material === K.M.shine) m.position.x *= -1; });
      // chips: the ears belong to the face card, the outer skirt to the robe card
      K.earsG.userData.part = 'face';
      const capeGroup = K.body.children.find(o => o.userData.part === 'cape');
      if (capeGroup) capeGroup.userData.part = 'robe';

      /* ---------------- robe painting: cream jacket, blue under-skirt below the sash ---------------- */
      {
        const tex = K.robeMesh.material.map, g = tex.image.getContext('2d'), W = 1024;
        D.fill(g, CREAM);
        g.fillStyle = M(S.cuff); g.fillRect(0, K.robeV(1.55), W, 1024);
        g.fillStyle = M(S.blueLite, 1.2); g.fillRect(0, K.robeV(0.56), W, K.robeV(0.52) - K.robeV(0.56));
        tex.needsUpdate = true;
      }

      /* ---------------- side flaps: the image-left flap's outer corner rides higher (slanted hem, picture 163,410 → 213,430 px) ---------------- */
      {
        const cm = capeGroup && capeGroup.children.find(m => m.isMesh);
        if (cm) {
          const p = cm.geometry.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
            if (y > 1.2) continue;
            const a = Math.atan2(x, z) * 180 / Math.PI;           // 0 = front, −90 = image-left
            const lift = (a < 0 ? 0.2 * sst(30, 85, -a) * (1 - 0.5 * sst(110, 170, -a)) : 0.06 * sst(60, 120, a)) * sst(1.2, 0.56, y);
            p.setY(i, y + lift);
          }
          p.needsUpdate = true; cm.geometry.computeVertexNormals();
        }
      }

      /* ---------------- center panel (蔽膝): gold frame, blue top, lotus over waves ---------------- */
      K.robePanel({
        parent: part('panel', K.body), y0: 0.45, y1: 1.53, deg: 28, degB: 26, off: 0.07, color: CREAM, ink: M(S.goldDeep),
        paint(g, w, h) {
          const lg = g.createLinearGradient(0, 0, 0, h);
          lg.addColorStop(0, M(S.blue)); lg.addColorStop(0.36, M(S.blue)); lg.addColorStop(0.44, CREAM); lg.addColorStop(1, CREAM);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          lotusMotif(g, w / 2, h * 0.8, 130, M(S.lotusBlue, 1.2));
          g.save(); g.beginPath(); g.rect(26, 0, w - 52, h - 26); g.clip();
          waves(g, 0, w + 60, h * 0.94, 38, M(S.lotusBlue, 1.2), 9);
          g.restore();
          g.fillStyle = M(S.panelGold, 1.3); g.fillRect(0, 0, 24, h); g.fillRect(w - 24, 0, 24, h); g.fillRect(0, h - 26, w, 26);
          g.strokeStyle = M(S.goldDeep); g.lineWidth = 4; g.strokeRect(24, -10, w - 48, h - 26 + 10);
        }
      });

      /* ---------------- belt medallion: gold ring + blue gem, bead and long blue tassel ---------------- */
      {
        const zb = K.robeR(1.52) + 0.1;
        const med = group(K.beltG, [-0.04, 1.52, zb]);
        mesh(new THREE.TorusGeometry(0.095, 0.03, 12, 40), goldMat, med, null, null, S.goldInk);
        mesh(sphere(0.072, 24, 16), std(M(S.jewel, 1.2), { roughness: 0.25 }), med, [0, 0, 0.01], [1, 1, 0.6], S.blueInk);
        mesh(sphere(0.022, 10, 8), K.M.shine, med, [-0.025, 0.025, 0.05]);
        mesh(tube([[-0.04, 1.42, zb + 0.01], [-0.04, 1.3, zb + 0.02]], 0.012, 4, 6), goldDk, K.beltG);
        mesh(sphere(0.05, 16, 12), goldMat, K.beltG, [-0.04, 1.27, zb + 0.02], null, S.goldInk);
        REF.tassel = K.tassel(K.beltG, [-0.04, 1.2, zb + 0.03], M(S.blueDeep), 0.22, 0.06, S.blueInk);
      }

      /* ---------------- neckline: gold beads, blue shoulder tassel & bow, green lapels ---------------- */
      {
        [[-0.4, 2.63, 0.36], [-0.04, 2.36, 0.58], [0.37, 2.55, 0.43]].forEach(([x, y, z]) => mesh(sphere(0.075, 20, 14), goldMat, K.robeG, [x, y, z], null, S.goldInk));
        K.tassel(K.robeG, [0.4, 2.47, 0.45], M(S.blueDeep), 0.14, 0.04, S.blueInk);
        const bm = std(M(S.blueLite, 1.2), { roughness: 0.7 });
        [-1, 1].forEach(k => { const l = mesh(sphere(0.07, 16, 12), bm, K.robeG, [0.47 + 0.07 * k, 2.66 + 0.02 * k, 0.28], [1.2, 0.6, 0.5], S.blueInk); l.rotation.z = 0.4 * k; });
        // green lapels folded over the shoulders
        const lapMat = std(M('#AEB887', 1.1), { roughness: 0.8, side: THREE.DoubleSide });
        [-1, 1].forEach(sx => {
          const pts = [[0.5 * sx, 2.66, 0.36], [0.72 * sx, 2.58, 0.3], [0.9 * sx, 2.44, 0.2], [0.98 * sx, 2.3, 0.1]];
          mesh(ribbon(pts, t => 0.05 + 0.22 * Math.sin(Math.PI * Math.min(1, t * 1.15)), { segs: 40, face: [0, 0.35, 1] }), lapMat, K.robeG, null, null, S.greenInk);
        });
      }

      /* ---------------- hat: small blue-teal cap, gold ball, water-drop jewel, leaves ---------------- */
      {
        const hat = part('hat', K.head);
        hat.position.set(0, 4.2, 0.02);
        const tl = std(M(S.teal), { roughness: 0.7 }), tt = std(M(S.tealTop, 1.3), { roughness: 0.7 }), tb = std(M(S.tealLow), { roughness: 0.7 });
        mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.1, 48), tb, hat, [0, 0.05, 0], null, S.tealInk);
        mesh(new THREE.CylinderGeometry(0.295, 0.295, 0.06, 48), std(M(S.hatCream, 1.3), { roughness: 0.6 }), hat, [0, 0.13, 0], null, S.goldInk);
        mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.4, 48), tl, hat, [0, 0.36, 0], null, S.tealInk);
        mesh(new THREE.CylinderGeometry(0.275, 0.265, 0.1, 48), tt, hat, [0, 0.6, 0], null, S.tealInk);
        mesh(lathe([[0.27, 0], [0.24, 0.04], [0.14, 0.07], [0.001, 0.075]], 48).geo, tl, hat, [0, 0.65, 0], null, S.tealInk);
        mesh(sphere(0.09, 24, 16), goldMat, hat, [0, 0.8, 0], null, S.goldInk);
        mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.06, 16), goldMat, hat, [0, 0.72, 0]);
        // gold teardrop frame (tip up) with a cream rim and a blue water drop
        const dropShape = (h, r) => { const s = new THREE.Shape(); s.moveTo(0, h); s.bezierCurveTo(r * 0.3, h * 0.72, r, h * 0.5, r, h * 0.28); s.absarc(0, h * 0.28, r, 0, -Math.PI, true); s.bezierCurveTo(-r, h * 0.5, -r * 0.3, h * 0.72, 0, h); return s; };
        const jg = group(hat, [0, 0.08, 0.28]);
        mesh(extrude(dropShape(0.46, 0.2), 0.05, 0.02), goldMat, jg, [0, -0.02, 0], null, S.goldInk);
        mesh(extrude(dropShape(0.33, 0.14), 0.05, 0.012), std(M('#FBF3D6', 1.2), { roughness: 0.6 }), jg, [0, 0.03, 0.03]);
        mesh(extrude(dropShape(0.25, 0.1), 0.06, 0.015), std(M(S.jewel, 1.2), { roughness: 0.2, emissive: new THREE.Color(S.jewel).convertSRGBToLinear(), emissiveIntensity: 0.12 }), jg, [0, 0.06, 0.05], null, S.blueInk);
        mesh(sphere(0.022, 10, 8), K.M.shine, jg, [-0.035, 0.14, 0.086], [1, 1.6, 0.6]);   // glint resting on the jewel's front face
        // three green leaves fanning up-and-out on each side of the jewel, with little gold balls at their bases
        const leafShape = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.45, 0, L); s.quadraticCurveTo(-w, L * 0.45, 0, 0); return s; };
        const leafG = extrude(leafShape(0.32, 0.11), 0.02, 0.008);
        const lm1 = std(M(S.leaf, 1.3), { roughness: 0.75 }), lm2 = std(M(S.leafDeep, 1.3), { roughness: 0.75 });
        [-1, 1].forEach(sx => {
          const lg = group(hat, [0.2 * sx, 0.14, 0.22], [0, 0.35 * sx, 0]);
          [[-0.2, 0], [-0.62, 1], [-1.05, 0]].forEach(([a, m], i) => {
            const l = mesh(leafG, m ? lm2 : lm1, lg, [0, 0, -0.01 * i], null, S.greenInk);
            l.rotation.z = a * sx;
          });
          mesh(sphere(0.045, 14, 10), goldMat, hat, [0.19 * sx, 0.14, 0.28], null, S.goldInk);
        });
      }

      /* ---------------- vase: round blue-and-white lotus belly; wide gold-lipped foot toward the chest, mouth down-left-back ---------------- */
      const vaseG = part('vase', K.body); REF.vase = vaseG;
      const VC = V(-0.95, 2.1, 0.86);           // belly centre (picture 162,288 px)
      vaseG.position.copy(VC);
      const dir = V(-0.9, -0.02, -0.43).normalize();   // toward the (hidden) mouth
      const jar = group(vaseG);
      {
        // basis: local +y = pour direction, local +z (u = 0.5, the lotus) as close to the viewer as possible
        const zc = V(0, 0, 1).addScaledVector(dir, -dir.z).normalize(), xc = new THREE.Vector3().crossVectors(dir, zc);
        jar.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xc, dir, zc));
        const lotusRot = Math.atan2(V(0, 1, 0).dot(xc), V(0, 1, 0).dot(dir));
        // profile (local y: −0.62 foot → +0.56 mouth), near-spherical belly r 0.42
        const prof = [[0.001, -0.66], [0.35, -0.66], [0.38, -0.64], [0.33, -0.6], [0.27, -0.54], [0.24, -0.47], [0.27, -0.37], [0.35, -0.27], [0.405, -0.13], [0.42, 0.0], [0.405, 0.13], [0.35, 0.25], [0.26, 0.34], [0.17, 0.41], [0.14, 0.47], [0.16, 0.53], [0.2, 0.56]];
        // arc-length v of a profile height (texture rows are laid out by arc length)
        const cum = [0]; for (let i = 1; i < prof.length; i++) cum.push(cum[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
        const vOf = y => { for (let i = 1; i < prof.length; i++) if (prof[i][1] >= y) { const f = (y - prof[i - 1][1]) / (prof[i][1] - prof[i - 1][1] || 1); return (cum[i - 1] + f * (cum[i] - cum[i - 1])) / cum[cum.length - 1]; } return 1; };
        const tex = canvasTex(1024, 512, (g, w, h) => {
          g.fillStyle = M(S.porcelain, 1.25); g.fillRect(0, 0, w, h);
          const vy = v => (1 - v) * h;
          // foot: blue waist with a pale line, blue band under the belly
          // trumpet foot: blue / pale / blue bands that read as arcs beside the belly, blue band under the belly
          const band = (y0, y1, c) => { g.fillStyle = c; g.fillRect(0, vy(vOf(y1)), w, vy(vOf(y0)) - vy(vOf(y1))); };
          band(-0.67, -0.6, M(S.blue)); band(-0.6, -0.56, M(S.blueLite, 1.2)); band(-0.56, -0.5, M(S.cuff));
          band(-0.5, -0.47, M(S.blueLite, 1.2)); band(-0.47, -0.36, M(S.blue)); band(-0.36, -0.33, M(S.blueLite, 1.2));
          // neck band
          g.fillStyle = M(S.blue); g.fillRect(0, vy(1), w, vy(vOf(0.4)) - vy(1));
          g.fillStyle = M(S.blueLite, 1.2); g.fillRect(0, vy(vOf(0.4)), w, 8);
          // big lotus facing the viewer (u = 0.5)
          g.save(); g.translate(0.5 * w, vy(vOf(0.0))); g.rotate(lotusRot);
          lotusMotif(g, 0, 70, 160, M(S.lotusBlue, 1.2), M('#FBF6E6', 1.2));
          D.blob(g, 0, 92, 120, 22, M(S.lotusDeep), 0.9);
          D.blob(g, 0, 118, 90, 14, M(S.lotusBlue, 1.2), 0.9);
          g.restore();
          [0.0, 0.25, 0.75, 1.0].forEach(u => { g.save(); g.translate(u * w - 50, vy(vOf(0.0))); g.rotate(Math.PI / 2); lotusMotif(g, 0, 0, 100, M(S.lotusBlue, 1.2)); g.restore(); });
        });
        mesh(lathe(prof, 64).geo, texMat(tex, { roughness: 0.35, side: THREE.DoubleSide }), jar, null, null, S.blueInk);
        // gold lip on the mouth (peeks out on the belly's image-left edge like the picture's left gold ring)
        const lip = mesh(new THREE.TorusGeometry(0.19, 0.035, 12, 40), goldMat, jar, [0, 0.555, 0], null, S.goldInk); lip.rotation.x = Math.PI / 2;
        // wide gold foot rim and a blue base disc with concentric rings (the big gold arc + blue bands beside the chest)
        const foot = mesh(new THREE.TorusGeometry(0.37, 0.045, 12, 56), goldMat, jar, [0, -0.645, 0], null, S.goldInk); foot.rotation.x = Math.PI / 2;
        const baseTex = canvasTex(256, 256, (g) => {
          g.fillStyle = M(S.blue); g.fillRect(0, 0, 256, 256);
          [[112, M(S.blueLite, 1.2)], [96, M(S.cuff)], [70, M(S.blueLite, 1.2)]].forEach(([r, c]) => { g.fillStyle = c; g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.fill(); });
        });
        const base = mesh(new THREE.CircleGeometry(0.355, 48), texMat(baseTex, { roughness: 0.4 }), jar, [0, -0.665, 0]); base.rotation.x = Math.PI / 2;
        const inner = mesh(new THREE.CircleGeometry(0.17, 32), std(M(S.water, 1.2), { roughness: 0.2 }), jar, [0, 0.55, 0]); inner.rotation.x = -Math.PI / 2;
        REF.jar = jar;
      }
      // gold ring handles (鋪首銜環), placed in screen terms around the belly
      {
        const ring = (pos, r, tr, rot, knob) => {
          const rg = group(vaseG, pos, rot);
          mesh(new THREE.TorusGeometry(r, tr, 14, 48), goldMat, rg, null, null, S.goldInk);
          if (knob) mesh(sphere(tr * 1.5, 12, 10), goldMat, vaseG, knob, null, S.goldInk);
          return rg;
        };
        // big ring hanging at the lower right, its right side gripped by the image-right paw (picture 203,320 px)
        REF.bigRing = ring([0.46, -0.33, 0.3], 0.21, 0.052, [0.25, 0.42, 0.55], [0.32, -0.16, 0.32]);
        // small ring on the belly's top-right shoulder, under the image-left paw (182,248 px)
        ring([0.24, 0.42, 0.12], 0.13, 0.034, [0.1, 1.15, 0.25], [0.2, 0.33, 0.2]);
      }

      /* ---------------- water: from the hidden mouth, a wide stream falls to a splayed splash (traced from the picture) ---------------- */
      const waterG = part('water', K.body); REF.water = waterG;
      {
        const wm = std(M('#9DCDEE', 1.2), { roughness: 0.15, transparent: true, opacity: 0.97 });
        // outline of stream + splash in picture px
        const outline = [[140, 322], [133, 335], [126, 352], [120, 372], [116, 390], [104, 402], [82, 399], [64, 397], [55, 406], [56, 417], [66, 422], [80, 424], [83, 434], [86, 447], [98, 454], [113, 452], [121, 443], [133, 447], [144, 442], [151, 431], [153, 412], [153, 398], [152, 382], [154, 366], [158, 343], [161, 322]];
        const s = new THREE.Shape(); const P0 = U(...outline[0]); s.moveTo(P0[0], P0[1]);
        const up = outline.map(p => U(...p));
        s.splineThru(up.slice(1).concat([P0]).map(p => new THREE.Vector2(p[0], p[1])));
        const ZW = 0.86;
        const wtex = canvasTex(256, 256, (g, w, h) => {
          g.fillStyle = M('#9DCDEE', 1.2); g.fillRect(0, 0, w, h);
          // soft lighter streaks running down the stream, darker toward the right edge
          g.filter = 'blur(3px)';
          g.strokeStyle = M('#D6ECF8', 1.3); g.lineWidth = 7; g.lineCap = 'round';
          [[118, 18, 96, 150], [140, 24, 128, 170], [104, 60, 84, 180]].forEach(([x0, y0, x1, y1]) => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 - 6, (y0 + y1) / 2, x1, y1); g.stroke(); });
          g.filter = 'none';
        });
        // extrude UVs are shape coordinates: map x ∈ [−2.3, −0.9], y ∈ [0.2, 1.8] onto the canvas
        wtex.repeat.set(1 / 1.4, 1 / 1.6); wtex.offset.set(2.3 / 1.4, -0.2 / 1.6);
        const wtm = texMat(wtex, { roughness: 0.15, transparent: true, opacity: 0.97 });
        const slab = mesh(extrude(s, 0.12, 0.04, 4, 64), [wtm, wm], waterG, [0, 0, ZW], null, S.waterInk);
        REF.splash = slab;
        // a round stream from the hidden mouth, falling behind the belly into the top of the slab
        const mouth = VC.clone().addScaledVector(dir, 0.56);
        mesh(tube([mouth, mouth.clone().add(V(0.04, -0.14, -0.06)), V(-1.3, 1.8, 0.62), V(-1.16, 1.66, 0.8), V(-1.12, 1.6, ZW)], t => 0.14 + 0.02 * t, 30, 14), wm, waterG);
        // white highlights on the splash, as in the picture
        const hl = (p, sc) => { const u = U(...p); mesh(sphere(0.05, 12, 10), K.M.shine, waterG, [u[0], u[1], ZW + 0.1], sc); };
        hl([104, 423], [1.4, 0.8, 0.4]); hl([72, 411], [0.9, 0.6, 0.4]); hl([142, 395], [0.5, 1.4, 0.4]);
        // droplets flung from the splash
        [[[62, 380], 0.05], [[85, 385], 0.035], [[160, 450], 0.045], [[126, 468], 0.04]].forEach(([p, r]) => { const u = U(...p); mesh(sphere(r, 12, 10), wm, waterG, [u[0], u[1], ZW], null, S.waterInk); });
      }

      /* ---------------- 披帛: translucent pale-blue ribbons (blue face above, aqua-white where they turn) ---------------- */
      {
        const rg = part('ribbon', K.body); REF.ribbon = rg;
        const ribMat = (stops) => {
          const t = canvasTex(64, 512, (g, w, h) => {
            const lg = g.createLinearGradient(0, h, 0, 0);     // canvas bottom = start of the ribbon (t = 0)
            stops.forEach(([s, c]) => lg.addColorStop(s, M(c, 1.35)));
            g.fillStyle = lg; g.fillRect(0, 0, w, h);
            g.fillStyle = M(S.ribEdge, 1.3); g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h);
          });
          return texMat(t, { side: THREE.DoubleSide, roughness: 0.7, transparent: true, opacity: 0.93, depthWrite: false });
        };
        const band = (pts, wd, stops, segs) => { const m = mesh(ribbon(pts, wd, { segs: segs || 120, face: [0, 0, 1] }), ribMat(stops), rg); m.castShadow = false; m.renderOrder = 2; return m; };
        const BL = S.ribBlue, PA = S.ribPale;
        // image-right: rises hidden behind the head, comes out beside the ear, S-curves down behind the shoulder,
        // swings out to the right and tucks back behind the tail tip
        band([[0.3, 2.62, -0.42], [0.6, 3.05, -0.64], [0.86, 3.5, -0.62], [1.1, 3.76, -0.4], [1.38, 3.56, -0.14], [1.5, 3.26, -0.02], [1.4, 2.96, 0.06], [1.18, 2.74, 0.02], [1.02, 2.52, -0.34], [1.18, 2.32, -0.12], [1.5, 2.18, 0.04], [1.74, 2.04, -0.08], [1.62, 1.9, -0.28], [1.4, 1.82, -0.42], [1.12, 1.74, -0.52]],
          t => 0.27 - 0.04 * t, [[0, BL], [0.3, BL], [0.4, PA], [0.62, PA], [0.72, '#C4DEE1'], [1, PA]], 220);
        // image-right free end: hangs from under the sleeve in front of the tail, ending in a point
        band([[0.95, 1.38, 0.34], [1.14, 1.12, 0.36], [1.32, 0.86, 0.34], [1.44, 0.62, 0.3], [1.54, 0.42, 0.26]], t => 0.32 * (1 - Math.pow(t, 3)) + 0.02, [[0, '#B3D3E1'], [0.6, '#B3D3E1'], [1, '#CCE1E0']], 60);
        // image-left: a folded loop beside the head (blue on top, aqua-white below), tucked behind the cheek and
        // running on down behind the head to the shoulder (mirror of the image-right band's start), so it is tied on
        band([[-0.6, 3.82, -0.55], [-0.86, 3.98, -0.34], [-1.1, 3.95, -0.14], [-1.27, 3.72, -0.02], [-1.29, 3.42, 0.02], [-1.2, 3.14, -0.02], [-1.02, 3.0, -0.2], [-0.8, 3.03, -0.46], [-0.56, 2.84, -0.5], [-0.3, 2.6, -0.36]],
          t => 0.3 - 0.05 * t, [[0, BL], [0.36, BL], [0.47, PA], [1, PA]], 150);
        // lower-left streamer from behind the belly, ending in a gold bead and a blue tassel
        band([[-0.98, 2.02, 0.5], [-1.3, 1.98, 0.6], [-1.6, 1.9, 0.64], [-1.85, 1.8, 0.66]], t => 0.27 - 0.13 * t, [[0, '#B1D1E4'], [1, '#9CC3E6']], 60);
        mesh(sphere(0.06, 14, 10), goldMat, rg, [-1.88, 1.77, 0.66], null, S.goldInk);
        const ts = K.tassel(rg, [-1.9, 1.72, 0.66], M(S.blueDeep), 0.3, 0.06, S.blueInk); ts.rotation.z = -0.3;
        // lower-left hook-shaped streamer (aqua-white), curling left and back
        const hook = [[130, 328], [103, 330], [90, 343], [87, 360], [93, 375], [107, 381]].map(p => { const u = U(...p); return [u[0], u[1], 0.68]; });
        hook.unshift([-1.12, 1.7, 0.58]);
        band(hook, t => 0.24 * (1 - Math.pow(t, 2.5)) + 0.02, [[0, '#C7E2E6'], [1, '#D7E7E0']], 80);
      }

      /* ---------------- short cheek tufts (the picture's jagged cheek fur) ---------------- */
      {
        const HY = K.cfg.head.y;
        const edgeX = (y) => { let lo = 0, hi = 1.6; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (K.onSkin(m, y, [K.headMesh]).uv) lo = m; else hi = m; } return lo; };
        const fm = std(FUR, { roughness: 0.95 });
        [-1, 1].forEach(sx => [[-0.12, 10, 0.12], [-0.24, 25, 0.14], [-0.36, 40, 0.12], [-0.47, 58, 0.1]].forEach(([dy, ang, len]) => {
          const y = HY + dy, ex = edgeX(y), a = ang * Math.PI / 180;
          const r0 = V(sx * (ex - 0.07), y, -0.02), d = V(sx * Math.cos(a), -Math.sin(a), -0.1);
          mesh(tube([r0, r0.clone().addScaledVector(d, len * 0.6).add(V(0, 0.01, 0)), r0.clone().addScaledVector(d, len)], t => 0.07 * (1 - Math.pow(t, 1.2)) + 0.003, 16, 10), fm, K.faceG);
        }));
      }

      /* ---------------- white ear fluff, toe lines on the front paws, green flap under the right sleeve ---------------- */
      {
        const tm = std(M(S.earTuft, 1.15), { roughness: 0.95 });
        K.ears.forEach(({ g, sx }) => {
          [[0.1, 0.12, 0.32, 0.055], [0.02, 0.16, 0.28, 0.05], [0.17, 0.1, 0.22, 0.045]].forEach(([x, y, len, r0]) => {
            const a = V(x * sx, y, 0.1), d = V(-0.35 * sx, 1, 0.25).normalize();
            mesh(tube([a, a.clone().addScaledVector(d, len * 0.55).add(V(0.02 * sx, 0, 0)), a.clone().addScaledVector(d, len)], t => r0 * (1 - Math.pow(t, 1.2)) + 0.003, 16, 8), tm, g);
          });
        });
        const cm = std(M('#8C8791'), { roughness: 0.8 });
        ['L', 'R'].forEach(k => {
          const p = K.hands[k].p;
          const paw = K.poseG.children.find(o => o.isMesh && o.position.distanceTo(p) < 1e-4);
          if (!paw) return;
          [-0.075, 0.075].forEach(dx => {
            const pts = [0.06, -0.03, -0.12].map((dy, i) => { const h = K.onSkin(p.x + dx * (1 + 0.1 * i), p.y + dy, [paw]); return h.p ? h.p.addScaledVector(h.n, 0.004) : null; }).filter(Boolean);
            if (pts.length === 3) mesh(tube(pts, 0.008, 8, 5), cm, K.poseG);
          });
        });
        const flapMat = std(M(S.greenDeep, 1.3), { roughness: 0.8, side: THREE.DoubleSide });
        const fs = new THREE.Shape(); fs.moveTo(0, 0.1); fs.bezierCurveTo(0.2, 0.2, 0.5, 0.12, 0.6, -0.02); fs.bezierCurveTo(0.42, -0.14, 0.15, -0.18, 0, -0.1); fs.lineTo(0, 0.1);
        const fl = group(K.robeG, [0.74, 1.3, 0.3], [0.1, -0.2, -0.22]); fl.scale.set(1.25, 1.3, 1);
        mesh(extrude(fs, 0.03, 0.012), flapMat, fl, null, null, S.greenInk);
        mesh(sphere(0.05, 12, 10), goldMat, fl, [0.55, -0.1, 0.03], [1, 1.3, 0.8], S.goldInk);
      }

      /* ---------------- legs & feet: chunky grey legs, the image-right foot set wider (picture feet at 216 / 307 px) ---------------- */
      {
        const lm = std(FUR, { roughness: 0.95 }), cm = std(M('#8E878B'), { roughness: 0.8 });
        const legs = part('pose', K.poseG);
        [[-1, [-0.16, 1.0, 0.0], [-0.33, 0.3, 0.16], 0.26, -0.37], [1, [0.22, 1.0, 0.0], [0.54, 0.3, 0.16], 0.27, 0.6]].forEach(([sx, hip, ank, r, fx]) => {
          const leg = mesh(tube([hip, [(hip[0] + ank[0]) / 2, 0.66, 0.1], ank], t => r * (1 - 0.1 * t), 24, 20), lm, legs, null, null, S.furInk);
          mesh(sphere(r * 0.98, 24, 16), lm, legs, ank);
          K.addFur(leg, { layers: 6, length: 0.025, gravity: 0.006, repeat: [4, 4] });
          const fg = group(legs, [fx, 0, 0.3]);
          const f = mesh(sphere(0.2, 32, 20), lm, fg, [0, 0.17, 0], [1.45, 0.9, 1.55], S.furInk);
          K.feet.push(f);
          [-0.1, 0.1].forEach(dx => mesh(tube([[dx, 0.3, 0.26], [dx * 1.05, 0.2, 0.3], [dx * 1.1, 0.09, 0.3]], 0.009, 8, 5), cm, fg));
        });
      }

      /* ---------------- floating decorations: lotus, lily pads, cloud, water drops ---------------- */
      {
        const items = [];
        const stemMat = std(M(S.padInk), { roughness: 0.8 });
        const padTex = canvasTex(256, 256, (g) => {
          g.fillStyle = M(S.pad, 1.3); g.fillRect(0, 0, 256, 256);
          D.soft(g, 128, 128, 110, 110, M(S.padLite, 1.3), 0.6);
          g.strokeStyle = M(S.padLite, 1.35); g.lineWidth = 5;
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 120, 128 + Math.sin(a) * 120); g.stroke(); }
        });
        const padMat = texMat(padTex, { side: THREE.DoubleSide, roughness: 0.8 });
        const pad = (pos, r, rot) => {
          const g = group(K.decor, pos, rot);
          const s = new THREE.Shape(); s.moveTo(0, 0); s.absarc(0, 0, r, -1.3, Math.PI * 2 - 1.6, false); s.lineTo(0, 0);
          const geo = extrude(s, 0.03, 0.012);
          const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) / r + 1) / 2, (uv.getY(i) / r + 1) / 2);
          mesh(geo, padMat, g, null, null, M(S.padInk));
          items.push(g); return g;
        };
        // lily pads seen at an angle (oval, notched), with their stems
        const pL = pad([-2.08, 2.28, 0.15], 0.46, [-0.5, 0.3, 0.35]);
        pL.children[0].scale.set(1, 0.72, 1);
        mesh(tube([[0.12, 0.06, -0.02], [0.2, 0.3, -0.06], [0.25, 0.62, -0.08]], 0.022, 12, 6), stemMat, pL);
        const pR = pad([1.85, 2.68, 0.0], 0.44, [-0.45, -0.3, 2.2]);
        pR.children[0].scale.set(1, 0.62, 1);
        mesh(tube([[0, 0, -0.03], [0.1, 0.25, -0.06], [0.08, 0.55, -0.08]], 0.022, 12, 6), stemMat, pR);
        // pink lotus flower (cup of petals) above the left pad
        const lotusG = group(K.decor, [-1.96, 2.95, 0.3]); lotusG.scale.setScalar(1.35);
        const pm = std(M(S.lotus, 1.25), { roughness: 0.8, side: THREE.DoubleSide }), pm2 = std(M('#F4B8B0', 1.25), { roughness: 0.8, side: THREE.DoubleSide });
        const petalShape = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.15, 0.06, 0.15, 0.24, 0, 0.36); s.bezierCurveTo(-0.15, 0.24, -0.15, 0.06, 0, 0); return s; })();
        const petal = extrude(petalShape, 0.02, 0.01);
        [[0, 0, 0.12], [-0.45, 0.3, 0.06], [0.45, -0.3, 0.06], [-0.95, 0.5, 0], [0.95, -0.5, 0], [-1.35, 0.6, -0.04], [1.35, -0.6, -0.04]].forEach(([a, ry, z], i) => {
          const p = mesh(petal, i < 3 ? pm : pm2, lotusG, [0, 0, z], i < 5 ? 1 : 0.9, M(S.lotusPink)); p.rotation.set(0.1, ry, a);
        });
        mesh(tube([[0, 0, 0], [0.05, -0.3, 0], [-0.08, -0.62, -0.1]], 0.022, 12, 6), stemMat, lotusG);
        const leafD = extrude((() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.1, 0.12, 0, 0.3); s.quadraticCurveTo(-0.1, 0.12, 0, 0); return s; })(), 0.015, 0.006);
        const lfm = std(M(S.pad, 1.3), { roughness: 0.8 });
        [-1, 1].forEach(k => { const l = mesh(leafD, lfm, lotusG, [0.02 * k, -0.06, 0.02], null, M(S.padInk)); l.rotation.z = -k * 1.35; });
        items.push(lotusG);
        // cloud (upper right)
        {
          const cg = K.puff(K.decor, [1.8, 3.5, -0.1], 0.46, M(S.cloud, 1.15), M(S.ribEdge));
          const sm = std(M('#B9D4E4', 1.15), { roughness: 0.7 });
          const spiral = (cx, cy, r0, turns, flip) => { const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * Math.PI * 2 * turns; const r = r0 * (1 - 0.75 * t); pts.push([cx + flip * Math.cos(a) * r, cy + Math.sin(a) * r, 0.28]); } return pts; };
          mesh(tube(spiral(-0.2, 0.05, 0.22, 1.1, 1), 0.035, 60, 8), sm, cg);
          mesh(tube(spiral(0.35, -0.02, 0.18, 1.1, -1), 0.032, 60, 8), sm, cg);
          items.push(cg);
        }
        // water drops & bubbles
        [[-1.58, 3.5, 0.2, 0.3], [-1.45, 2.5, 0.5, 0.2], [2.02, 2.05, 0.2, 0.28], [-0.95, 0.42, 1.0, 0.22], [-0.9, 1.38, 1.0, 0.18]].forEach(([x, y, z, s]) => items.push(K.drop(K.decor, [x, y, z], s, M(S.water, 1.2))));
        [[1.74, 3.02, 0.3, 0.055], [1.14, 1.98, 0.6, 0.05], [-1.95, 1.1, 0.6, 0.045]].forEach(([x, y, z, r]) => {
          items.push(mesh(sphere(r, 14, 10), std(M(S.water, 1.2), { roughness: 0.2, transparent: true, opacity: 0.85 }), K.decor, [x, y, z], null, S.waterInk));
        });
        items.forEach(o => { o.userData.y0 = o.position.y; });
        K.onTick((t, k) => items.forEach((o, i) => { o.position.y = o.userData.y0 + 0.06 * Math.sin(t * 1.2 + i * 1.3) * k; }));
      }

      K.onTick((t, k) => {
        if (REF.splash) REF.splash.scale.set(1 + 0.015 * Math.sin(t * 5) * k, 1 + 0.02 * Math.sin(t * 5 + 1) * k, 1);
        if (REF.tassel) REF.tassel.rotation.z = 0.08 * Math.sin(t * 1.7) * k;
        if (REF.ribbon) REF.ribbon.rotation.y = 0.04 * Math.sin(t * 0.9) * k;
        if (REF.bigRing) REF.bigRing.rotation.z = 0.55 + 0.06 * Math.sin(t * 2.1) * k;
      });
    },

    action: {
      label: '倒水', dur: 2.2,
      run(s, p, K) {
        K.headG.rotation.x = 0.1 * s;
        if (REF.vase) REF.vase.rotation.z = 0.1 * s;
        if (REF.water) REF.water.scale.set(1 + 0.06 * s, 1 + 0.04 * s, 1);
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '倒水消暑的水神將軍',
        text: '大暑是一年最熱的時節，灰色的俄羅斯藍貓化身「水神將軍」：頭戴水滴小冠，雙爪抱著青花蓮紋寶瓶往畫面左下倒出一大股清水，身邊繞著淡藍披帛，周圍有粉蓮、荷葉與水珠，替酷暑送上一身清涼。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '灰色圓臉與綠眼',
        text: '全身是均勻的冷灰色短毛，是俄羅斯藍貓的招牌；寬圓的臉頰兩側翹著幾撮短毛。一對深綠色圓眼、高光都朝鼻子那側，粉色小鼻、ω 形微笑，眼下淡淡的粉色腮紅與白色鬍鬚。高大的三角耳外緣直直連到臉頰，耳內淡粉、耳根冒出白色耳毛。' },
      hat: { chip: '水滴冠', tag: '服飾', name: '青藍水滴小冠',
        text: '小小的青藍色圓筒冠，冠頂淺青一圈、正中立著金色圓珠。冠前鑲著金框米白邊的水藍水滴寶石，兩側各伸出三片綠葉，底部繞一圈米金與青藍的冠圈。' },
      vase: { chip: '寶瓶', tag: '道具', name: '青花蓮紋寶瓶',
        text: '白底青花的圓肚寶瓶，瓶腹畫著淡藍蓮花；靠胸口那端是一圈圈藍色同心紋與寬大的金色圈足，瓶上掛著金色圓環。畫面左側的爪子按在瓶肚上，右側的爪子握住下方的大金環，瓶口朝畫面左下後方傾倒。' },
      water: { chip: '清水', tag: '道具', name: '傾瀉而下的清水',
        text: '一大股淺水藍色的清水從瓶肚下方傾瀉而下，落地前向左、向下濺開成手指般的水花，帶著白色亮點與飛散的小水珠，是大暑時節最消暑的畫面。' },
      robe: { chip: '短袍', tag: '服飾', name: '米白青花短袍',
        text: '米白色的交領短袍，領口是青花藍的交疊領，肩上翻著淡綠披領；腰下分成左右兩片綠邊衣片，繡著藍色水渦紋，底下露出一圈藍色內裙。寬大的袖子袖口是深淺兩段藍色，袖面有綠色水波紋。' },
      panel: { chip: '蔽膝', tag: '服飾', name: '蓮花海浪蔽膝', dir: [0.2, 0.1, 1],
        text: '身前垂著一片淡金色鑲框的蔽膝：上半是青花藍，下半是米白底，畫著藍色蓮花浮在層層海浪上。' },
      belt: { chip: '腰飾', tag: '服飾', name: '藍腰帶與寶石墜',
        text: '腰間繫一條藍色腰帶，正中鑲著金框藍寶石圓扣，下方垂著金珠與長長的藍色流蘇；領口與肩上也綴著三顆金珠，右肩垂一串小藍穗。' },
      ribbon: { chip: '披帛', tag: '服飾', name: '淡藍披帛',
        text: '一條半透明的淡藍披帛從肩後繞出：畫面左邊在頭旁折成一個圈，右邊從耳後飄出、沿臉側蜿蜒成 S 形再甩向右方；寶瓶下方另有兩段短飄帶，一段繫著金珠與藍色流蘇，一段捲成小勾。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '灰色勾尾', dir: [1, 0.25, -0.6],
        text: '粗粗的灰色尾巴從身後往畫面右側伸出，再向上彎成大大的 C 字，圓圓的尾尖勾回身體這一側。' },
      pose: { chip: '姿態', tag: '貓咪本體', name: '抱瓶站姿',
        text: '短袍下露出兩條圓滾滾的灰色腿和大腳掌，畫面右腳站得稍微外開。左側前爪高高按住瓶肚，右側前爪從寬袖裡伸出握住大金環，把寶瓶斜抱在胸前。按下「倒水」可以看牠把瓶子再傾斜一點。' }
    },
    order: ['overview', 'face', 'hat', 'vase', 'water', 'robe', 'panel', 'belt', 'ribbon', 'tail', 'pose']
  });
})();
