// @file 04_春分_金吉拉貓
// @title 春分・團扇仕女 | 二十四節氣貓
// 參考圖：refs/04.png（年曆標註「金吉拉貓 · 仕女」，但畫面是短毛三花貓，依畫面建模）
// 比例換算：畫面 95 px = 1 單位；身體中線 x ≈ 233 px（臉的中線 ≈ 237 px），地面 y ≈ 500 px。
(function () {
  const EXPOSURE = 0.75;
  const PX = (px, py) => [(px - 233) / 95, (500 - py) / 95];
  const HX = (px, py) => [(px - 237) / 95, (500 - py) / 95];   // 臉部用（臉的中線 237 px）
  const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---- 色票（皆以 tools/colors.py 取樣自參考圖） ----
  const C = {
    white: '#FBF6E9', cream: '#FCF8EF', orange: '#F9B35E', orangeDeep: '#EFA04C',
    gray: '#8F7B6F', grayDeep: '#6F5E54', earPink: '#F8C6BD', ink: '#C49176',
    ivory: '#FCF4E5', pink: '#E8C4CA', pink2: '#E4B9BF', pinkDeep: '#E9A39B', rose: '#E98A80',
    yellow: '#EDD190', yellowLight: '#F9E6B8', skirtYellow: '#F9DE9C', skirtGreen: '#DDE198',
    green: '#B4BB71', greenLine: '#DADDA3', greenDeep: '#97A05E', ribbon: '#CBD78F', ribbonInk: '#9DAA6A', leaf: '#AFC56F',
    gold: '#D6AC74', goldInk: '#A87A40', wood: '#BD7E4C', red: '#EF8074', redDeep: '#D0685C', bead: '#F2B56C',
    lining: '#FBE1D8', cuff: '#EEC6CB', cuffLight: '#F4DCDD'
  };

  // 裙子直幅（角度：0 = 正面，+ = 畫面右），依下襬處的直幅寬度量出
  const PANELS = [
    [-180, -150, 'skirtYellow'], [-150, -120, 'pink'], [-120, -96, 'ivory'], [-96, -74, 'pink2'],
    [-74, -54, 'ivory'], [-54, -38, 'pink'], [-38, -23, 'pink2'], [-23, -3, 'pink'],
    [-3, 15, 'ivory'], [15, 29, 'skirtYellow'], [29, 49, 'ivory'], [49, 72, 'pink'],
    [72, 96, 'ivory'], [96, 120, 'skirtYellow'], [120, 150, 'pink2'], [150, 180, 'ivory']
  ];
  const WAIST = 1.97, HEM = 0.42;
  const PROFILE = [[1.26, 0.42], [1.3, 0.49], [1.24, 0.72], [1.1, 1.05], [0.93, 1.42], [0.74, 1.85], [0.66, 2.1], [0.64, 2.4], [0.6, 2.68], [0.46, 2.9], [0.15, 3.04]];
  const degX = d => 512 + d / 360 * 1024;

  // 通過各點中點的平滑封閉曲線（斑塊邊緣不要有尖角）
  function smoothPath(g, q) {
    const n = q.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    g.beginPath(); const m0 = mid(q[n - 1], q[0]); g.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const m = mid(q[i], q[(i + 1) % n]); g.quadraticCurveTo(q[i][0], q[i][1], m[0], m[1]); }
    g.closePath();
  }
  function blossom(g, x, y, s, petal, center, rot, vein) { // 櫻花：五瓣、瓣尖有缺口
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    for (let i = 0; i < 5; i++) {
      g.save(); g.rotate(i / 5 * Math.PI * 2);
      g.fillStyle = petal; g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(-s * 0.42, -s * 0.25, -s * 0.4, -s * 0.9, -s * 0.13, -s * 0.96);
      g.lineTo(0, -s * 0.8); g.lineTo(s * 0.13, -s * 0.96);
      g.bezierCurveTo(s * 0.4, -s * 0.9, s * 0.42, -s * 0.25, 0, 0);
      g.fill();
      if (vein) { g.strokeStyle = vein; g.lineWidth = Math.max(1, s * 0.05); g.beginPath(); g.moveTo(0, -s * 0.2); g.lineTo(0, -s * 0.55); g.stroke(); }
      g.restore();
    }
    g.fillStyle = center || '#F2C45A'; g.beginPath(); g.arc(0, 0, s * 0.16, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function sprig(g, x, y, s, flowerC, D) { // 小花 + 綠莖雙葉
    g.save(); g.strokeStyle = '#9DB86A'; g.lineWidth = Math.max(2, s * 0.09); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y + s * 1.3); g.quadraticCurveTo(x + s * 0.1, y + s * 0.6, x, y); g.stroke(); g.restore();
    D.leaf(g, x, y + s * 1.05, s * 0.62, -1.0, C.leaf);
    D.leaf(g, x, y + s * 0.95, s * 0.62, 1.0, C.leaf);
    blossom(g, x, y, s * 0.58, flowerC, '#F2C45A', 0.2);
  }

  NEKO.run({
    meta: {
      id: '04', term: '春分', title: '春分・團扇仕女', seal: '分',
      eyebrow: '二〇二七節氣貓 · 04 春分 · 三花貓',
      aria: '穿粉黃綠三色襦裙、大袖垂到腰下、肩披鵝黃披帛、雙手在胸前捧著櫻花團扇、右耳前別櫻花髮簪的短毛三花貓 3D 模型'
    },
    theme: { accent: '#B0526A', accentDark: '#F4B9C4', glow: 'rgba(248, 198, 190, 0.34)', glowColor: '#F9D0CA' },
    palette: [['#FBF6E9', '奶油白'], ['#F9B35E', '三花橘'], ['#8F7B6F', '灰黑斑'], ['#F8CBC2', '櫻花粉']],
    spec: [['品種', '三花貓（年曆標註金吉拉）'], ['角色', '春分團扇仕女'], ['頭身比', '約 1 : 1.8']],
    seed: 4,
    exposure: EXPOSURE,

    cat: {
      fur: {
        color: C.white, top: C.white, mid: C.white, low: C.white, deep: C.gray, cream: C.cream,
        ink: C.ink, creamInk: C.ink, pattern: 'none', mask: false,
        noise: { colors: ['#FFFFFF', '#EDE3D2'], alpha: 0.05, n: 600 },
        paint(g, P) {
          // 後腦：左後方橘斑、右後方灰斑（正面的斑塊在 build 裡依畫面描點補上）
          g.filter = 'blur(4px)';
          const poly = (pts, c) => { g.fillStyle = c; smoothPath(g, pts.map(q => P.xy(q[0], q[1]))); g.fill(); };
          poly([[-72, 92], [-62, 70], [-64, 45], [-76, 20], [-88, -8], [-104, -22], [-126, -24], [-146, -12], [-160, 12], [-166, 40], [-158, 68], [-140, 92]], C.orange);
          poly([[66, 92], [66, 70], [72, 45], [84, 20], [92, -4], [104, -18], [124, -22], [144, -12], [156, 10], [160, 36], [152, 64], [130, 92]], C.gray);
          // 頭頂：左半橘、右半灰，中間留一道白（接到正面描的斑塊）
          poly([[-5, 92], [-5, 72], [-9, 58], [-30, 52], [-62, 58], [-76, 78], [-100, 92]], C.orange);
          poly([[5, 92], [5, 72], [7, 58], [30, 52], [62, 58], [76, 78], [100, 92]], C.gray);
          // 耳根：左耳根灰、右耳根橘
          poly([[-24, 64], [-40, 74], [-60, 70], [-66, 52], [-50, 42], [-30, 48]], C.gray);
          poly([[24, 64], [40, 74], [60, 70], [66, 52], [50, 42], [30, 48]], C.orange);
          g.filter = 'none';
        }
      },
      head: { y: 3.9, neck: 3.0, w: 1.04, h: 0.86, d: 0.9, cheek: 0.05, ruff: 0.03, ruffFreq: 16, chinDrop: 0,
              deform(p, o) { // 下半臉兩頰更寬、頭頂略收略平（畫面是寬圓的包子臉）
                const temple = sst(0.1, 0.55, o.y) * (1 - sst(0.6, 0.95, o.y));
                p.x *= 1 + 0.03 * temple;
                if (o.y < 0) { // 下半臉改成超橢圓：兩頰與下顎寬而飽滿
                  const ay = Math.min(-o.y, 0.985), c = Math.sqrt(1 - ay * ay), se = Math.pow(1 - ay * ay * ay, 1 / 3), k = Math.min(se / c, 1.6);
                  p.x *= (1 + (k - 1) * 0.95) * (1 + 0.05 * Math.exp(-Math.pow((ay - 0.55) / 0.25, 2))); p.z *= 1 + (k - 1) * 0.2;
                  p.y -= 0.08 * sst(0.45, 0.95, ay);
                }
              },
              fur: { layers: 12, length: 0.032, gravity: 0.008, repeat: [9, 5] } },
      eyes: { x: 0.41, y: -0.18, r: 0.145, sx: 0.95, sy: 1.02, sz: 0.4, color: '#3B2213', iris: '#7E4F2C', pupil: '#2E190C', pupilR: 0.5, shine: 1.3 },
      nose: { y: -0.27, color: '#F4A9A0', size: 0.8 },
      muzzle: { color: C.white, y: -0.38, size: 0.62 },
      mouth: { type: 'w', color: '#7A5040', y: -0.355, w: 0.12 },
      blush: { color: 'rgba(246,150,140,0.62)', x: 0.6, y: -0.34, r: 36 },
      whiskers: { color: '#B9A291', n: 3, len: 0.42, r: 0.0055, y: -0.35, x: 0.6, spread: 0.1, droop: 0.02, curve: 0.04 },
      ears: { x: 0.56, y: 0.32, z: 0.2, tilt: 0.44, yaw: 0.2, pitch: -0.14, size: [0.72, 0.8, 0.2], sharp: 0.8,
              colorL: C.gray, colorR: C.orange, inner: C.earPink, tuft: '#FFFFFF', innerScale: 1.02,
              R: { tuft: false },
              fur: false },
      bib: false,
      robe: {
        profile: PROFILE, color: '#FFFFFF', ink: '#D6A392', hemY: 0.9,
        paint(g, w, h, D, R) {
          const yW = R.robeV(WAIST), yH = h;
          // 上襦：米白底、零星小櫻花
          g.fillStyle = C.ivory; g.fillRect(0, 0, w, yW);
          D.tile(g, (x, y) => blossom(g, x, y, 12, '#F7C1B8', '#F2C45A', x * 0.01), { y0: 70, y1: yW - 50, step: 120 });
          // 裙子直幅
          PANELS.forEach(([a, b, k]) => {
            g.fillStyle = C[k]; g.fillRect(degX(a), yW, degX(b) - degX(a), yH - yW);
            const lg = g.createLinearGradient(degX(a), 0, degX(b), 0);   // 摺痕：幅邊略深
            lg.addColorStop(0, 'rgba(214,150,130,0.26)'); lg.addColorStop(0.14, 'rgba(214,150,130,0)');
            lg.addColorStop(0.86, 'rgba(214,150,130,0)'); lg.addColorStop(1, 'rgba(214,150,130,0.26)');
            g.fillStyle = lg; g.fillRect(degX(a), yW, degX(b) - degX(a), yH - yW);
            g.fillStyle = 'rgba(200,138,118,0.6)'; g.fillRect(degX(a) - 1, yW, 2.5, yH - yW);
          });
          // 碎花：粉幅上白色小花、米白幅上粉花綠葉、黃幅上白花
          PANELS.forEach(([a, b, k], i) => {
            const x0 = degX(a), x1 = degX(b), cx = (x0 + x1) / 2, pw = x1 - x0;
            for (let j = 0; j < 4; j++) {
              const yy = yW + (yH - yW) * (0.22 + j * 0.2 + ((i * 7 + j * 3) % 5) * 0.02);
              const xx = cx + ((i + j) % 2 ? 0.18 : -0.18) * pw;
              g.save(); g.translate(xx, yy); g.scale(1, 1.9);
              if (k === 'pink' || k === 'pink2') blossom(g, 0, 0, 11, '#FFFFFF', '#F2C45A', i + j);
              else if (k === 'skirtYellow') blossom(g, 0, 0, 9, '#FFFBEF', '#F2C45A', j);
              else if (j % 2 === 1) sprig(g, 0, -10, 12, C.pinkDeep, D);
              else blossom(g, 0, 0, 8, '#F4A99F', '#F2C45A', j);
              g.restore();
            }
          });
          g.fillStyle = 'rgba(226,150,138,0.85)'; g.fillRect(0, yH - 12, w, 5);   // 下襬細粉線
        }
      },
      collar: { color: C.cuff, r: 0.024, over: 1, y0: 2.94, style: 'cross' },
      arms: {
        L: { hand: [-0.54, 2.42, 1.1], path: [[-0.45, 2.85, 0.0], [-0.95, 2.5, 0.45], [-0.7, 2.38, 0.98]], pawScale: 1.7, wrist: false },
        R: { hand: [0.21, 2.37, 1.1], path: [[0.45, 2.85, 0.0], [0.9, 2.45, 0.45], [0.36, 2.32, 0.98]], pawScale: 1.7, wrist: false }
      },
      sleeves: false, // 大袖改在 build 裡自己做（袖口一路垂到袖底）
      paws: { color: C.white, ink: C.ink },
      belt: { yT: 2.21, yB: 1.95, color: C.green, line: C.greenLine, knot: false, tassel: false, ink: C.greenDeep },
      feet: { color: C.white, toe: false, x: 0.53, y: 0.22, z: 0.85 },
      tail: {
        pts: [[0.45, 0.7, -0.85], [1.1, 0.7, -0.9], [1.6, 0.85, -0.78], [1.86, 1.15, -0.62], [1.84, 1.45, -0.52], [1.64, 1.6, -0.46], [1.46, 1.46, -0.42]],
        r: 0.21, ink: C.ink,
        shape: t => Math.min(1, 0.7 + t * 2.5) * (t > 0.86 ? Math.sqrt(Math.max(0.0001, 1 - Math.pow((t - 0.86) / 0.14, 2))) : 1),
        paint(g, w, h) {
          g.fillStyle = C.white; g.fillRect(0, 0, w, h);
          g.filter = 'blur(7px)';
          // 下彎處：內側灰黑、外側橘色
          g.fillStyle = C.gray; g.fillRect(w * 0.44, h * 0.5, w * 0.12, h * 0.6);
          g.fillStyle = C.orange; g.fillRect(w * 0.47, -6, w * 0.13, h * 0.56);
          // 尾端約四成灰黑
          g.fillStyle = C.gray; g.fillRect(w * 0.68, -10, w * 0.4, h + 20);
          g.filter = 'none';
        },
        fur: { layers: 8, length: 0.025, gravity: 0.006, repeat: [12, 6] }
      }
    },

    build(K) {
      const { THREE, mesh, part, std, head, body, tube, group, sphere, onSkin, headTex, hands, D, canvasTex, texMat, onRobe, robeR } = K;
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const onRobeX = (x, y, off) => { const r = robeR(y) + off; return V(x, y, Math.sqrt(Math.max(r * r - x * x, 0.0004))); };

      // 自製雙面帶子：每個控制點給一個法線，寬度方向 = 切線 × 法線（披帛、飄帶用）
      function strip(pts, width, normals, segs) {
        const cv = new THREE.CatmullRomCurve3(pts.map(p => (p.isVector3 ? p.clone() : V(p[0], p[1], p[2]))));
        const N = (normals || [[0, 0, 1]]).map(n => V(n[0], n[1], n[2]).normalize());
        const nAt = t => { if (N.length === 1) return N[0].clone(); const f = t * (N.length - 1), i = Math.min(Math.floor(f), N.length - 2); return N[i].clone().lerp(N[i + 1], f - i).normalize(); };
        const S = segs || 90, pos = [], uv = [], idx = [];
        for (let i = 0; i <= S; i++) {
          const t = i / S, P = cv.getPointAt(t), T = cv.getTangentAt(t);
          let side = T.clone().cross(nAt(t)); if (side.lengthSq() < 1e-6) side = T.clone().cross(V(0, 1, 0)); side.normalize();
          const w = (typeof width === 'function' ? width(t) : width) / 2;
          const a = P.clone().addScaledVector(side, -w), b = P.clone().addScaledVector(side, w);
          pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(0, t, 1, t);
          if (i < S) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }   // 正面朝 +N
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); geo.computeVertexNormals(); return geo;
      }

      // 帶子正反兩面不同深淺（翻面時看得出來）
      const rib = (geo, front, back, parent, ink) => {
        const m = mesh(geo, front, parent, null, null, ink);
        const b = new THREE.Mesh(geo, back); b.castShadow = true; b.receiveShadow = true; parent.add(b);
        return m;
      };
      const ribMats = (a, b) => [std(a, { roughness: 0.8, side: THREE.FrontSide }), std(b, { roughness: 0.85, side: THREE.BackSide })];

      /* ---------- 三花斑：依參考圖描點，投影到頭部貼圖 ---------- */
      {
        const g = headTex.image.getContext('2d');
        const toUV = (px, py, shrink) => {
          let [x, y] = HX(px, py); x *= shrink || 1;
          for (let i = 0; i < 40; i++) {   // 超出頭部輪廓的點：往頭心收，直到落在頭上
            const s = onSkin(x, y);
            if (s.uv) return [s.uv.x * 1024, (1 - s.uv.y) * 512];
            x *= 0.985; y = 3.9 + (y - 3.9) * 0.985;
          }
          return null;
        };
        const poly = (pts, color, blur) => {
          const q = pts.map(p => toUV(p[0], p[1], p[2])).filter(Boolean);
          if (q.length < 3) return;
          g.save(); g.filter = 'blur(' + (blur || 3) + 'px)'; g.fillStyle = color; smoothPath(g, q); g.fill(); g.restore();
        };
        // 畫面左：橘斑（額頭左半到左頰外側，下緣停在左眼左上方）
        poly([[205, 51], [222, 53], [226, 58], [221, 80], [211, 98], [196, 112], [175, 124], [152, 136], [136, 146, 0.97], [127, 150, 0.95],
              [126, 128, 0.95], [130, 108, 0.97], [146, 96], [162, 90], [182, 78], [197, 62]], C.orange);
        // 左耳根的灰色楔形（耳朵的灰色延伸到頭上）
        poly([[146, 104], [162, 96], [182, 84], [197, 68], [206, 52], [190, 44], [166, 52], [146, 72], [134, 100, 0.96]], C.gray);
        // 畫面右：灰斑（額頭右半到右頰外側，下緣停在右眼右上方）
        poly([[262, 50], [248, 53], [241, 62], [239, 84], [244, 102], [258, 118], [282, 128], [315, 134], [338, 142], [350, 149, 0.95],
              [350, 128, 0.95], [343, 104, 0.97], [334, 92], [320, 82], [300, 68], [282, 57]], C.gray);
        // 右耳根的橘色
        poly([[266, 50], [284, 56], [304, 67], [322, 80], [336, 92], [345, 86, 0.95], [334, 60], [304, 45], [280, 43]], C.orange);
        // 斑塊上的毛流筆觸
        g.save(); g.globalAlpha = 0.16; g.lineCap = 'round';
        for (let i = 0; i < 260; i++) {
          const x = 250 + K.rand() * 520, y = 20 + K.rand() * 230;
          const c = g.getImageData(x | 0, y | 0, 1, 1).data;
          if (c[0] > 240 && c[1] > 235) continue;
          g.strokeStyle = c[0] > 200 ? C.orangeDeep : C.grayDeep; g.lineWidth = 2 + K.rand() * 2;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + (K.rand() - 0.5) * 6, y + 10 + K.rand() * 10); g.stroke();
        }
        g.restore();
        // 腮紅上的三顆小點
        [[178, 167], [294, 167]].forEach(([bx, by]) => [[-7, 1], [0, -2], [7, 1]].forEach(([dx, dy]) => {
          const q = toUV(bx + dx, by + dy); if (!q) return;
          g.fillStyle = 'rgba(232,120,110,0.75)'; g.beginPath(); g.arc(q[0], q[1], 2.6, 0, Math.PI * 2); g.fill();
        }));
        headTex.needsUpdate = true;
      }

      // 插畫的白毛是均勻的平塗：給頭部一點自發光，免得下半臉被打光壓成灰黃
      K.headMesh.material.color = new THREE.Color(0.55, 0.55, 0.55); K.headMesh.material.emissive = new THREE.Color('#FFFFFF'); K.headMesh.material.emissiveMap = headTex; K.headMesh.material.emissiveIntensity = 0.68;

      /* ---------- 裙子直幅的褶子：每一幅中間外鼓、幅邊內收；下襬兩側與後方上揚 ---------- */
      if (K.robeMesh) {
        const pa = K.robeMesh.geometry.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
          if (y > WAIST - 0.05) continue;
          const deg = Math.atan2(x, z) * 180 / Math.PI;
          const p = PANELS.find(q => deg >= q[0] && deg <= q[1]) || PANELS[0];
          const s = (deg - p[0]) / (p[1] - p[0]);
          const amp = 0.05 * Math.pow(Math.min(1, (WAIST - 0.05 - y) / 1.4), 1.2);
          const f = 1 + amp * (Math.pow(Math.sin(Math.PI * s), 0.6) - 0.55);
          const near = Math.max(0, 1 - (y - HEM) / 0.35);
          const lift = (0.2 * (1 - Math.cos(deg * Math.PI / 180)) / 2 + 0.07 * Math.abs(Math.sin(deg * Math.PI / 180))) * near
                     + 0.045 * (1 - Math.pow(Math.sin(Math.PI * s), 0.5)) * Math.pow(near, 2);   // 每一幅下緣中間低、幅邊略收：百褶的波浪下襬
          pa.setXYZ(i, x * f, y + lift, z * f);
        }
        pa.needsUpdate = true; K.smoothNormals(K.robeMesh.geometry);
      }

      /* ---------- 眼睫毛（外眼角兩小撇） ---------- */
      const lashM = std('#3B2415', { roughness: 0.7 });
      [-1, 1].forEach(sx => {
        const ex = 0.41 * sx, ey = 3.9 - 0.18;
        [[0.12, 0.11, 0.18, 0.16], [0.145, 0.06, 0.21, 0.09]].forEach(([ax, ay, bx, by]) => {
          const a = onSkin(ex + ax * sx, ey + ay).p.add(V(0, 0, 0.01)), b = onSkin(ex + bx * sx, ey + by).p.add(V(0, 0, 0.01));
          mesh(tube([a, a.clone().lerp(b, 0.5).add(V(0, 0.01, 0)), b], t => 0.011 * (1 - 0.7 * t), 8, 6), lashM, K.faceG);
        });
      });

      /* ---------- 畫面左耳內的一撮白毛 ---------- */
      {
        const eL = K.ears.find(e => e.sx < 0);
        if (eL) {
          const tuftM = std('#FFFFFF', { roughness: 0.95 });
          [[0.1, 0.14, -0.45, 1.25], [0.17, 0.16, -0.8, 1.0], [0.04, 0.2, -0.15, 1.05], [0.13, 0.24, -0.55, 0.8]].forEach(([x, y, r, k]) => {
            const m = mesh(sphere(0.06, 16, 12), tuftM, eL.g, [x, y, 0.2], [0.85 * k, 1.8 * k, 0.4]); m.rotation.z = r;
          });
        }
      }

      /* ---------- 立體櫻花（髮簪、腰結、點綴共用） ---------- */
      const petalShape = new THREE.Shape();
      petalShape.moveTo(0, 0);
      petalShape.bezierCurveTo(-0.075, 0.04, -0.08, 0.15, -0.027, 0.168);
      petalShape.lineTo(0, 0.142); petalShape.lineTo(0.027, 0.168);
      petalShape.bezierCurveTo(0.08, 0.15, 0.075, 0.04, 0, 0);
      const petalGeo = K.extrude(petalShape, 0.022, 0.009);
      const heartGeo = K.extrude(new THREE.Shape([V(-0.02, 0), V(0.02, 0), V(0, 0.075)].map(v => new THREE.Vector2(v.x, v.y))), 0.01, 0.004);
      const pinkM = std('#F9C4C0', { roughness: 0.7 }), pinkInner = std('#F09A98', { roughness: 0.7 }), stamenM = std('#F2C45A', { roughness: 0.6 });
      const makeBlossom = (parent, pos, s, rot) => {
        const bg = group(parent, pos, rot || [0, 0, 0]); bg.scale.setScalar(s);
        for (let i = 0; i < 5; i++) {
          const pg = group(bg, [0, 0, 0], [0, 0, i / 5 * Math.PI * 2]);
          mesh(petalGeo, pinkM, pg, [0, 0.012, 0], null, '#DF8B8C').rotation.x = -0.12;
          mesh(heartGeo, pinkInner, pg, [0, 0.03, 0.016]);
        }
        mesh(sphere(0.032, 16, 12), stamenM, bg, [0, 0, 0.022], [1, 1, 0.6]);
        return bg;
      };

      /* ---------- 櫻花髮簪（畫面右耳前） ---------- */
      const pin = part('hairpin', head);
      { const [hx, hy] = HX(295, 84); const s0 = onSkin(hx, hy); pin.position.copy(s0.p).addScaledVector(s0.n, 0.06);
        const d = s0.n.clone().add(V(0, 0, 1.2)).normalize(); pin.lookAt(pin.position.clone().add(d)); pin.rotateZ(-0.12); }
      makeBlossom(pin, [0, 0, 0], 1.75);
      const leafM = std('#B2C865', { roughness: 0.7, side: THREE.DoubleSide });
      [[0.2, -0.05, -1.3], [0.16, -0.14, -1.9]].forEach(([x, y, r]) => { const l = mesh(K.leafGeo(0.34, 0.14), leafM, pin, [x - 0.02, y, -0.01], null, C.greenDeep); l.rotation.set(0.2, 0, r); });
      const goldM = std('#E3B56E', { roughness: 0.45, metalness: 0.15 });
      mesh(tube([[0.12, -0.12, -0.02], [0.2, -0.24, -0.01], [0.26, -0.34, 0.0]], 0.008, 12, 6), goldM, pin);
      mesh(sphere(0.04, 14, 10), std('#CA6F5E', { roughness: 0.5 }), pin, [0.265, -0.37, 0.0], null, '#A9564A');
      K.tassel(pin, [0.27, -0.41, 0.0], '#EE8A80', 0.18, 0.034, '#C9675D');
      mesh(tube([[0.14, -0.1, -0.03], [0.3, -0.2, -0.04], [0.42, -0.3, -0.05]], 0.007, 12, 6), goldM, pin);
      K.tassel(pin, [0.43, -0.33, -0.05], '#E4E2CB', 0.1, 0.03, '#AFAE92');

      /* ---------- 團扇（畫面左爪握柄、右爪托住扇緣右下） ---------- */
      const fanG = part('fan', body);
      const [fcx, fcy] = PX(218, 230);
      const FAN_ROT = -0.44;
      fanG.position.set(fcx, fcy, 1.03); fanG.rotation.set(-0.06, 0, FAN_ROT);
      const R = 0.45;
      const fanTex = canvasTex(512, 512, (g, w) => {
        const rg = g.createRadialGradient(256, 256, 20, 256, 256, 256);
        rg.addColorStop(0, '#FCF6E2'); rg.addColorStop(1, '#F6ECCB');
        g.fillStyle = rg; g.fillRect(0, 0, w, w);
        g.save(); g.translate(256, 256); g.rotate(FAN_ROT); g.translate(-256, -256);   // 抵銷扇子傾斜，花枝保持直立
        g.strokeStyle = '#8FB35F'; g.lineWidth = 10; g.lineCap = 'round';
        g.beginPath(); g.moveTo(228, 470); g.quadraticCurveTo(240, 330, 262, 190); g.stroke();
        D.leaf(g, 236, 368, 115, -1.2, '#9FC06A', '#7F9E52');
        D.leaf(g, 244, 350, 110, 1.25, '#9FC06A', '#7F9E52');
        blossom(g, 262, 172, 80, '#F6B0AE', '#F3C75A', 0.1, '#E98C8C');
        g.lineWidth = 6; g.beginPath(); g.moveTo(330, 360); g.quadraticCurveTo(350, 290, 378, 238); g.stroke();
        D.leaf(g, 340, 330, 58, -1.2, '#9FC06A'); D.leaf(g, 346, 316, 58, 1.25, '#9FC06A');
        blossom(g, 382, 228, 36, '#F6B8B6', '#F3C75A', 0.4);
        g.globalAlpha = 0.4; blossom(g, 140, 196, 30, '#F3B9AE', '#F3D08A', 0.3); g.globalAlpha = 1;
        g.restore();
      });
      const faceM = texMat(fanTex, { roughness: 0.75, side: THREE.DoubleSide });
      const fanFace = mesh(new THREE.CircleGeometry(R * 0.95, 64), faceM, fanG, [0, 0, 0]); fanFace.castShadow = false;
      const rimM = std(C.gold, { roughness: 0.5, metalness: 0.1 });
      mesh(new THREE.TorusGeometry(R * 0.965, 0.03, 12, 96), rimM, fanG, [0, 0, 0], null, C.goldInk);
      mesh(new THREE.TorusGeometry(R * 0.9, 0.008, 8, 96), std('#C9985A', { roughness: 0.6 }), fanG, [0, 0, 0.012]);
      const woodM = std(C.wood, { roughness: 0.6 });
      const HL = 0.66;
      mesh(new THREE.CylinderGeometry(0.03, 0.036, HL, 16), woodM, fanG, [0, -R - HL / 2 + 0.02, 0], null, '#8E5E3C');
      const beadP = V(0, -R - HL - 0.02, 0);
      mesh(sphere(0.05, 16, 12), std(C.redDeep, { roughness: 0.5 }), fanG, beadP, null, '#A64B40');
      const ft = K.tassel(fanG, [0, -R - HL - 0.07, 0], C.red, 0.2, 0.045, C.redDeep);
      ft.rotation.z = -FAN_ROT;   // 流蘇垂直向下

      /* ---------- 前爪：直立的白色小拳頭，兩道趾縫 ---------- */
      const pawMeshes = [];
      K.poseG.children.forEach(m => { if (m.isMesh && ['L', 'R'].some(k => m.position.distanceTo(hands[k].p) < 1e-4)) pawMeshes.push(m); });
      pawMeshes.forEach(m => m.scale.set(1.0, 1.08, 0.95));
      const toeM = std('#D9BFAB', { roughness: 0.8 }), pawToeM = std('#E2CDBC', { roughness: 0.8 });
      const ellZ = (cz, rx, ry, rz, dx, dy) => cz + rz * Math.sqrt(Math.max(0.02, 1 - (dx / rx) * (dx / rx) - (dy / ry) * (dy / ry)));
      ['L', 'R'].forEach(k => {
        const h = hands[k].p;
        [-0.055, 0.055].forEach(dx => {
          const pts = [0.17, 0.13, 0.09].map(dy => [h.x + dx, h.y + dy, ellZ(h.z, 0.204, 0.22, 0.194, dx, dy) + 0.002]);
          mesh(tube(pts, t => 0.0065 * (1 - 0.5 * t), 8, 5), pawToeM, K.poseG);
        });
      });

      /* ---------- 腰間：櫻花結 + 金珠 + 綠流蘇 ---------- */
      const knotG = K.beltG;
      const [kx, ky] = PX(218, 300);
      makeBlossom(knotG, [kx, ky, robeR(ky) + 0.1], 1.25, [0, 0, 0.2]);
      const [bx, by] = PX(213, 333);
      const cord = [V(kx - 0.01, ky - 0.08, robeR(ky) + 0.1), V(kx - 0.03, ky - 0.18, robeR(ky - 0.18) + 0.1), V(bx, by + 0.06, robeR(by) + 0.1)];
      mesh(tube(cord, 0.013, 16, 6), std(C.greenDeep, { roughness: 0.7 }), knotG);
      mesh(sphere(0.066, 18, 14), std(C.bead, { roughness: 0.4, metalness: 0.15 }), knotG, [bx, by, robeR(by) + 0.1], null, '#C98B40');
      const gt = K.tassel(knotG, [bx, by - 0.08, robeR(by) + 0.1], '#CFDBA0', 0.34, 0.06, C.ribbonInk);
      gt.rotation.x = -0.1;

      /* ---------- 大袖：從肩膀繞到胸前的袖袋，袖口一路垂到袖底 ---------- */
      const sleevesG = part('sleeves', body);
      const CUFF_T = 0.855;
      const sleeveTex = canvasTex(1024, 1024, (g, w, h) => {
        g.fillStyle = C.ivory; g.fillRect(0, 0, w, h);
        // 袖面淡淡的摺痕
        g.strokeStyle = 'rgba(214,170,140,0.35)'; g.lineWidth = 6; g.lineCap = 'round';
        [[300, 380, 520, 420], [380, 600, 560, 660], [560, 480, 700, 560]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2, Math.min(b, d) - 20, c, d); g.stroke(); });
        // 袖口：外側粉色寬邊（內含綠色虛線）＋淺粉細邊
        const x0 = CUFF_T * w;
        g.fillStyle = C.pinkDeep; g.fillRect(x0 - 8, 0, 8, h);
        g.fillStyle = C.cuff; g.fillRect(x0, 0, w - x0, h);
        g.fillStyle = C.cuffLight; g.fillRect(x0 + (w - x0) * 0.52, 0, (w - x0) * 0.2, h);
        g.strokeStyle = '#A5BE72'; g.lineWidth = 5; g.setLineDash([18, 12]);
        g.beginPath(); g.moveTo(x0 + (w - x0) * 0.3, 0); g.lineTo(x0 + (w - x0) * 0.3, h); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.pinkDeep; g.fillRect(w - 10, 0, 10, h);
      });
      const sleeveMat = texMat(sleeveTex, { roughness: 0.9 });
      const liningMat = std(C.lining, { side: THREE.BackSide, roughness: 0.9 });
      const sleeveFront = [];
      // o: spine（水平 [x,z]）、yT/yB(t) 袖子上緣/下緣、W(t) 半厚、D 袖口上端相對下端的位移、out 外鼓
      function buildSleeve(o) {
        const spine = new THREE.CatmullRomCurve3(o.spine.map(([x, z]) => V(x, 0, z)));
        const NT = 72, NA = 64, pos = [], uv = [], idx = [], ring = [];
        for (let i = 0; i <= NT; i++) {
          const t = i / NT, Cp = spine.getPointAt(t), T = spine.getTangentAt(t);
          T.y = 0; T.normalize();
          let n = V(T.z, 0, -T.x);
          n.multiplyScalar(o.nSign);
          const yT = o.yT(t), yB = o.yB(t), Wd = o.W(t), ks = sst(0.45, 1, t);
          const midY = (yT + yB) / 2, half = (yT - yB) / 2;
          for (let j = 0; j <= NA; j++) {
            const a = j / NA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            const y = midY + half * Math.sign(ca) * Math.pow(Math.abs(ca), 0.8);
            const hgt = (y - yB) / Math.max(yT - yB, 0.01);
            const bul = sa > 0 ? 1 + o.out * Math.exp(-Math.pow((hgt - 0.35) / 0.32, 2)) * sst(0.1, 0.55, t) * (1 - 0.7 * sst(0.8, 1, t)) : 1 + 0.2 * (1 - hgt);
            const s = Wd * Math.sign(sa) * Math.pow(Math.abs(sa), 0.7) * bul;
            const p = Cp.clone().addScaledVector(n, s).addScaledVector(o.D, ks * hgt);
            p.y = y;
            pos.push(p.x, p.y, p.z); uv.push(t, (y - 1.0) / 2.2);
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
        const k = Math.floor(NT / 2) * (NA + 1) + Math.floor(NA / 4);   // 法線朝外
        const pv = V().fromBufferAttribute(geo.attributes.position, k), nv = V().fromBufferAttribute(geo.attributes.normal, k);
        const c0 = spine.getPointAt(0.5); c0.y = pv.y;
        if (nv.dot(pv.clone().sub(c0)) < 0) {
          for (let q = 0; q < idx.length; q += 3) { const tt = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tt; }
          geo.setIndex(idx); K.smoothNormals(geo);
        }
        const m = mesh(geo, sleeveMat, sleevesG, null, null, '#D6A392');
        sleeveFront.push(m);
        const lin = new THREE.Mesh(geo, liningMat); lin.receiveShadow = true; sleevesG.add(lin);
        mesh(tube(ring.slice(0, -1), 0.024, 140, 8, true), std(C.pinkDeep, { roughness: 0.8 }), sleevesG);
        return m;
      }
      const LS = {
        sx: -1, nSign: -1, out: 1.2,
        spine: [[-0.35, -0.1], [-0.7, -0.05], [-0.97, 0.2], [-1.05, 0.5], [-1.02, 0.76]],
        yT: t => lerp(2.95, 2.52, sst(0, 0.5, t)) - 0.1 * sst(0.5, 1, t),
        yB: t => lerp(2.5, 1.36, sst(0.0, 0.45, t)) + 0.04 * sst(0.8, 1, t),
        W: t => lerp(0.1, 0.2, sst(0, 0.35, t)) * (1 - 0.5 * sst(0.7, 1, t)),
        D: V(0.36, 0, 0.28)
      };
      const RS = {
        sx: 1, nSign: 1, out: 1.25,
        spine: [[0.35, -0.1], [0.7, -0.05], [0.96, 0.2], [1.05, 0.5], [0.98, 0.76]],
        yT: t => lerp(2.95, 2.48, sst(0, 0.5, t)) - 0.12 * sst(0.5, 1, t),
        yB: t => lerp(2.5, 1.18, sst(0.0, 0.45, t)) + 0.02 * sst(0.8, 1, t),
        W: t => lerp(0.1, 0.19, sst(0, 0.35, t)) * (1 - 0.5 * sst(0.7, 1, t)),
        D: V(-0.6, 0, 0.28)
      };
      buildSleeve(LS); buildSleeve(RS);
      // 袖面的小櫻花（貼花）
      {
        const tex = canvasTex(256, 256, (g) => sprig(g, 128, 70, 90, '#F4A99F', D));
        const tex2 = canvasTex(256, 256, (g) => blossom(g, 128, 128, 70, '#F6B7AE', '#F2C45A', 0.3));
        const mk = t => texMat(t, { transparent: true, alphaTest: 0.35, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });
        const dm = mk(tex), dm2 = mk(tex2);
        [[PX(128, 312), 0.36, dm], [PX(313, 322), 0.36, dm], [PX(325, 292), 0.14, dm2], [PX(328, 350), 0.12, dm2]].forEach(([[x, y], sz, mat]) => {
          const r = new THREE.Raycaster(V(x, y, 6), V(0, 0, -1)); K.character.updateMatrixWorld(true);
          const hit = r.intersectObjects(sleeveFront, false)[0]; if (!hit) return;
          const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
          const d = mesh(new THREE.PlaneGeometry(sz, sz), mat, sleevesG, hit.point.clone().addScaledVector(n, 0.006));
          d.lookAt(d.position.clone().add(n)); d.castShadow = false;
        });
      }

      /* ---------- 鵝黃披帛：背後繞過雙肩，在上臂外側捲成一圈；右胸前垂下一段 ---------- */
      const shawlG = part('shawl', body);
      const [yellowM, yellowB] = ribMats(C.yellow, C.yellowLight);
      const shawlInk = '#D9AE5E';
      // 披帛兩端：從肩上往外翻到上臂外側，再往內捲回，正面看是一個 C 形的寬帶圈
      const loopPts = sx => [[0.74 * sx, 2.62, 0.72], [0.9 * sx, 2.56, 0.66], [1.1 * sx, 2.62, 0.5], [1.18 * sx, 2.8, 0.3], [1.0 * sx, 2.97, 0.05], [0.7 * sx, 3.0, -0.3]];
      const loopN = sx => [[0.1 * sx, -0.1, 1], [0.2 * sx, 0, 1], [0.4 * sx, 0, 1], [0.5 * sx, 0.1, 0.9], [0.4 * sx, 0.6, 0.4], [0.3 * sx, 0.4, -0.8]];
      const Lp = loopPts(-1), Rp = loopPts(1);
      const shawlPts = Lp.concat([[0, 2.98, -0.64]]).concat(Rp.slice().reverse());
      const shawlN = loopN(-1).concat([[0, 0.3, -1]]).concat(loopN(1).slice().reverse());
      rib(strip(shawlPts, t => 0.22 * (0.8 + 0.2 * Math.sin(Math.PI * t)), shawlN, 240), yellowM, yellowB, shawlG, shawlInk);
      // 右胸前垂下的一段
      rib(strip([onRobeX(0.62, 2.96, 0.03), onRobeX(0.52, 2.72, 0.035), onRobeX(0.4, 2.46, 0.04), onRobeX(0.3, 2.22, 0.045)], 0.1, [[0.6, 0.3, 0.75], [0.5, 0.1, 0.85], [0.4, 0, 0.9]], 40), yellowM, yellowB, shawlG, shawlInk);

      /* ---------- 嫩綠飄帶：背後繞過手肘，兩端向外揚起再下捲；前面兩段斜垂到裙前 ---------- */
      const sashG = part('sash', body);
      const [greenM, greenB] = ribMats(C.ribbon, '#DDE6B4');
      const gInk = C.ribbonInk;
      // 背後一段貼著裙背與兩袖外側繞過（依實際表面投射，飄帶真的「搭」在身上），兩端才向外揚起再下捲
      const wrapY = 2.2, wrapOff = 0.035;
      K.character.updateMatrixWorld(true);
      const wrapTargets = [K.robeMesh].concat(sleeveFront);
      K.beltG.traverse(o => { if (o.isMesh) wrapTargets.push(o); });
      const wrapRay = new THREE.Raycaster();
      const wrapAt = deg => {
        const a = deg * Math.PI / 180, d = V(Math.sin(a), 0, Math.cos(a));
        wrapRay.set(d.clone().multiplyScalar(4).setY(wrapY), d.clone().negate());
        const hit = wrapRay.intersectObjects(wrapTargets, false)[0];
        const p = hit ? hit.point.clone() : d.clone().multiplyScalar(robeR(wrapY)).setY(wrapY);
        return [p.addScaledVector(d, wrapOff), [-d.x, 0, -d.z]];
      };
      const wrap = [];
      for (let i = 0; i <= 16; i++) wrap.push(wrapAt(-100 - 160 * i / 16));
      const sashPts = [[-1.78, 1.54, 0.18], [-1.95, 1.68, 0.16], [-1.98, 1.9, 0.12], [-1.72, 2.12, 0.06]]
        .concat(wrap.map(w => [w[0].x, w[0].y, w[0].z]))
        .concat([[1.72, 2.1, 0.05], [2.1, 1.94, 0.1], [2.3, 1.7, 0.13], [2.3, 1.48, 0.15], [2.18, 1.36, 0.17]]);
      const sashN = [[0.6, -0.6, 0.5], [1, 0, 0.3], [0.8, 0.4, 0.3], [0.2, 0.3, 1]]
        .concat(wrap.map(w => w[1]))
        .concat([[-0.2, 0.3, 1], [-0.8, 0.4, 0.3], [-1, 0, 0.3], [-1, -0.2, 0.3], [-0.6, -0.6, 0.5]]);
      rib(strip(sashPts, t => 0.2 * Math.min(1, t / 0.08, (1 - t) / 0.08) + 0.01, sashN, 320), greenM, greenB, sashG, gInk);
      // 垂在裙前的兩段（從袖下斜斜往外垂）
      const cutEnd = (w0, k) => t => w0 * (t < 0.9 ? 1 : 1 - (t - 0.9) / 0.1 * k);
      rib(strip([onRobeX(-0.7, 1.62, 0.06), onRobeX(-0.9, 1.32, 0.07), onRobeX(-1.06, 1.06, 0.08), V(-1.28, 0.9, 0.42), V(-1.5, 0.74, 0.34)], cutEnd(0.28, 0.55), [[-0.3, 0, 1], [-0.4, 0, 1], [-0.6, 0, 0.9], [-0.7, 0, 0.8], [-0.7, 0, 0.7]], 60), greenM, greenB, sashG, gInk);
      rib(strip([onRobeX(0.2, 1.92, 0.05), onRobeX(0.42, 1.55, 0.07), onRobeX(0.66, 1.15, 0.08), onRobeX(0.86, 0.82, 0.1), onRobeX(0.95, 0.66, 0.11)], cutEnd(0.28, 0.55), [[0.2, 0, 1], [0.4, 0, 1], [0.55, 0, 0.9], [0.65, 0, 0.8], [0.7, 0, 0.75]], 60), greenM, greenB, sashG, gInk);
      // 粉色飄帶：左袖下往左下飛出；右袖下垂一段
      const [pinkRM, pinkRB] = ribMats('#F0BCC0', '#F6D4D4');
      rib(strip([V(-1.0, 1.46, 0.42), V(-1.3, 1.34, 0.5), V(-1.62, 1.2, 0.5), V(-1.9, 1.02, 0.46), V(-2.06, 0.86, 0.42), V(-2.14, 0.74, 0.4)], cutEnd(0.26, 0.7), [[0, 0.3, 1], [0.1, 0.4, 1], [0.2, 0.5, 1], [0.1, 0.4, 1], [-0.3, 0.2, 1], [-0.5, 0, 1]], 70), pinkRM, pinkRB, sashG, '#E3A396');
      rib(strip([onRobeX(0.86, 1.3, 0.12), onRobeX(1.02, 1.05, 0.12), V(1.22, 0.82, 0.5), V(1.38, 0.64, 0.42)], cutEnd(0.22, 0.6), [[0.5, 0, 1], [0.6, 0, 0.9], [0.7, 0, 0.8], [0.7, 0, 0.7]], 50), pinkRM, pinkRB, sashG, '#E3A396');

      /* ---------- 裙內：襯裙頂從內側封住裙子，兩條白腿由此往下接到腳（低角度看得到腳是從裙裡伸出來） ---------- */
      {
        K.character.updateMatrixWorld(true);
        const rc = new THREE.Raycaster(), YC = 0.86, YTOP = 1.02, NS = 96, NR = 10, rim = [];
        for (let j = 0; j < NS; j++) {
          const a = j / NS * Math.PI * 2, d = V(Math.sin(a), 0, Math.cos(a));
          rc.set(d.clone().multiplyScalar(4).setY(YC), d.clone().negate());
          const hit = rc.intersectObject(K.robeMesh, false)[0];
          rim.push(hit ? Math.hypot(hit.point.x, hit.point.z) - 0.006 : robeR(YC) * 0.97);
        }
        const pos = [], idx = [];
        for (let i = 0; i <= NR; i++) for (let j = 0; j <= NS; j++) {
          const k = i / NR, a = j / NS * Math.PI * 2, r = k * rim[j % NS];
          pos.push(Math.sin(a) * r, YTOP - (YTOP - YC) * k * k, Math.cos(a) * r);
          if (i < NR && j < NS) { const q = i * (NS + 1) + j, w = q + NS + 1; idx.push(q, w, q + 1, w, w + 1, q + 1); }
        }
        const cg = new THREE.BufferGeometry();
        cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setIndex(idx); cg.computeVertexNormals();
        mesh(cg, std(C.lining, { roughness: 0.95, side: THREE.DoubleSide }), K.robeG).castShadow = false;
        const legM = std(C.white, { roughness: 0.95 });
        [-1, 1].forEach(sx => mesh(tube([[0.53 * sx, 0.21 * 1.18, 0.85], [0.5 * sx, 0.62, 0.64], [0.42 * sx, 1.08, 0.3]], 0.19, 24, 16), legM, K.poseG, null, null, C.ink));
      }

      /* ---------- 腳：白色大肉球腳、兩道趾縫 ---------- */
      const FY = 0.21 * 1.18;   // 腳的中心高度（腳底貼地）
      K.feet.forEach(f => { f.scale.set(1.5, 1.18, 1.35); f.position.y = FY; });
      [-1, 1].forEach(sx => {
        const fx = 0.53 * sx;
        [-0.08, 0.08].forEach(dx => mesh(tube([0.2, 0.13, 0.06].map(y => [fx + dx, y, ellZ(0.85, 0.315, FY, 0.2835, dx, y - FY) + 0.003]), 0.009, 8, 6), toeM, K.poseG));
      });

      /* ---------- 節氣點綴 ---------- */
      const dec = K.decor;
      // 微笑太陽（左上）＝晝
      const [sunX, sunY] = PX(80, 50);
      const sun = group(dec, [sunX, sunY, 0.2]);
      mesh(sphere(0.3, 32, 24), std('#FBC974', { roughness: 0.7, emissive: new THREE.Color('#F7B955'), emissiveIntensity: 0.25 }), sun, [0, 0, 0], [1, 1, 0.5], '#E6A445');
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + Math.PI / 8, r = mesh(sphere(0.07, 16, 12), std('#FBD27E', { roughness: 0.7 }), sun, [Math.cos(a) * 0.47, Math.sin(a) * 0.47, 0], [0.7, 1.4, 0.5]);
        r.rotation.z = a - Math.PI / 2;
      }
      const dFace = std('#6B4A3A');
      [-0.1, 0.1].forEach(x => mesh(sphere(0.025, 10, 8), dFace, sun, [x, 0.04, 0.15]));
      mesh(tube([[-0.07, -0.06, 0.15], [0, -0.11, 0.155], [0.07, -0.06, 0.15]], 0.012, 10, 6), dFace, sun);
      [-0.19, 0.19].forEach(x => mesh(sphere(0.05, 12, 10), std('#F6A58B', { roughness: 0.8 }), sun, [x, -0.05, 0.12], [1, 0.7, 0.3]));
      // 睡著的彎月（右上）＝夜
      const [mnX, mnY] = PX(400, 65);
      const moon = group(dec, [mnX, mnY, 0.2]);
      { // 新月：外圓減去往左上偏的內圓，厚的一側朝右下，兩個月角朝左
        const Rm = 0.46, b = -0.35, d = 0.2, rm = 0.39, cx = -d * Math.cos(b), cy = -d * Math.sin(b), n = 120;
        const inI = (x, y) => (x - cx) * (x - cx) + (y - cy) * (y - cy) < rm * rm, inO = (x, y) => x * x + y * y < Rm * Rm;
        const outer = [], inner = [];
        for (let i = 0; i <= n; i++) { const a = b - Math.PI + 2 * Math.PI * i / n, x = Rm * Math.cos(a), y = Rm * Math.sin(a); if (!inI(x, y)) outer.push(new THREE.Vector2(x, y)); }
        for (let i = 0; i <= n; i++) { const a = b + Math.PI - 2 * Math.PI * i / n, x = cx + rm * Math.cos(a), y = cy + rm * Math.sin(a); if (inO(x, y)) inner.push(new THREE.Vector2(x, y)); }
        mesh(K.extrude(new THREE.Shape(outer.concat(inner)), 0.12, 0.04), std('#FBE3A2', { roughness: 0.7, emissive: new THREE.Color('#F5D27A'), emissiveIntensity: 0.2 }), moon, [0, 0, 0], null, '#E1B55C');
        // 閉著的眼睛（下彎弧線＋睫毛）與腮紅
        const ex = 0.25, ey = 0.02;
        mesh(tube([[ex - 0.06, ey + 0.01, 0.075], [ex, ey - 0.025, 0.08], [ex + 0.06, ey + 0.01, 0.075]], 0.011, 10, 6), dFace, moon);
        [[-0.03, 0.0], [0.0, -0.01], [0.03, 0.0]].forEach(([dx]) => mesh(tube([[ex + dx * 1.6, ey - 0.02, 0.08], [ex + dx * 2.2, ey - 0.055, 0.08]], 0.006, 4, 5), dFace, moon));
        mesh(sphere(0.045, 12, 10), std('#F6B39A', { roughness: 0.8 }), moon, [ex + 0.03, ey - 0.12, 0.07], [1.1, 0.7, 0.3]);
      }
      // 蝴蝶（左、右各一）
      const wingShape = (rx, ry, rot) => { const sh = new THREE.Shape(); sh.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, rot); return K.extrude(sh, 0.02, 0.008); };
      const upperW = wingShape(0.17, 0.12, 0.5), lowerW = wingShape(0.11, 0.08, -0.5);
      const bfly = [[PX(92, 142), 0.35, '#F9C3B4', '#FBE0A0'], [PX(385, 135), -0.35, '#F9C6C8', '#DDE7B2']].map(([[x, y], r, c1, c2]) => {
        const b = group(dec, [x, y, 0.3], [0, 0, r]);
        const m1 = std(c1, { roughness: 0.7 }), m2 = std(c2, { roughness: 0.7 });
        [-1, 1].forEach(sx => {
          const wg = group(b, [0, 0, 0], [0, sx * 0.3, 0]);
          mesh(upperW, m1, wg, [sx * 0.15, 0.08, 0], [sx, 1, 1], '#E39A8E');
          mesh(lowerW, m2, wg, [sx * 0.1, -0.1, 0.005], [sx, 1, 1], '#D9A870');
          b.userData['w' + sx] = wg;
        });
        mesh(K.dropGeo(0.24, 0.035, 1.3), std('#C98F6B'), b, [0, -0.04, 0.02]);
        [-1, 1].forEach(sx => mesh(tube([[0, 0.14, 0.02], [0.04 * sx, 0.24, 0.02], [0.08 * sx, 0.28, 0.02]], 0.006, 8, 5), std('#B07A58'), b));
        b.userData.y0 = y;
        return b;
      });
      // 綠色風紋（左、右）＝春風
      const windM = std('#DDE6B0', { roughness: 0.8 });
      [[PX(110, 180), -1], [PX(405, 185), 1]].forEach(([[x, y], sx]) => {
        const pts = [];   // 一道橫向風線，末端捲成漩渦
        for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([sx * (-0.55 + 0.6 * t), -0.1 + 0.04 * Math.sin(Math.PI * t), 0]); }
        for (let i = 1; i <= 36; i++) { const t = i / 36, a = -Math.PI / 2 + t * Math.PI * 2.3, r = 0.17 * (1 - 0.72 * t); pts.push([sx * (0.05 + Math.cos(a) * r), 0.07 + Math.sin(a) * r, 0]); }
        mesh(tube(pts, t => 0.03 * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.9))), 120, 8), windM, group(dec, [x, y, 0.2]), null, null, '#B9C98A');
      });
      // 櫻花、花瓣與嫩芽
      [[PX(50, 265), 1.35], [PX(410, 238), 1.2], [PX(400, 462), 1.1]].forEach(([[x, y], s]) => makeBlossom(dec, [x, y, 0.3], s * 1.6, [0.15, 0.25, 0.4]));
      [PX(35, 135), PX(440, 120), PX(95, 215), PX(385, 285), PX(40, 355), PX(430, 410), PX(360, 20)].forEach(([x, y], i) => {
        const pm = mesh(K.extrude(petalShape, 0.015, 0.006), pinkM, dec, [x, y, 0.3], 1.4);
        pm.rotation.set(0.3, 0.2 * i, i * 1.3 + 0.6);
      });
      [[PX(445, 285), 1.0], [PX(368, 215), 0.6], [PX(75, 460), 0.9]].forEach(([[x, y], s]) => {
        const sg = group(dec, [x, y, 0.25]); sg.scale.setScalar(s);
        mesh(tube([[0, -0.3, 0], [0.02, -0.1, 0], [0, 0.1, 0]], 0.02, 10, 6), std('#8FB35F'), sg);
        [-1, 1].forEach(k => { const l = mesh(K.leafGeo(0.26, 0.09), leafM, sg, [0, 0.02 + (k > 0 ? 0.04 : 0), 0], null, C.greenDeep); l.rotation.z = -k * 0.9; });
      });

      K.onTick((t, k) => {
        sun.position.y = sunY + 0.06 * Math.sin(t * 0.8) * k; sun.rotation.z = 0.1 * Math.sin(t * 0.5) * k;
        moon.position.y = mnY + 0.06 * Math.sin(t * 0.8 + 1.5) * k;
        bfly.forEach((b, i) => {
          const f = Math.sin(t * 7 + i) * 0.6 * k;
          b.userData['w-1'].rotation.y = -0.3 - f; b.userData.w1.rotation.y = 0.3 + f;
          b.position.y = b.userData.y0 + 0.1 * Math.sin(t * 1.1 + i * 2) * k;
        });
        sashG.rotation.y = 0.02 * Math.sin(t * 1.2) * k;
        gt.rotation.z = 0.08 * Math.sin(t * 1.6) * k;
        ft.rotation.z = -FAN_ROT + 0.1 * Math.sin(t * 1.4) * k;
      });
      K.fanG = fanG; K.FAN_ROT = FAN_ROT;
    },

    action: {
      label: '搖扇', dur: 1.8,
      run(s, p, K) {
        const f = K.fanG; if (!f) return;
        f.rotation.z = K.FAN_ROT + 0.2 * Math.sin(p * Math.PI * 4) * s;
        K.headG.rotation.z = 0.08 * s;
      }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '晝夜平分的春分仕女',
        text: '春分晝夜等長，畫面左上是微笑的太陽、右上是閉眼的彎月。三花貓穿粉、黃、綠三色襦裙，雙手捧著櫻花團扇，身邊櫻花、蝴蝶與春風環繞，是一位溫柔的賞花仕女。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '三花臉與圓眼',
        text: '白底臉上，畫面左側額頭是一大片橘斑、右側額頭是灰黑斑，中間留一道白。大大的棕色圓眼帶白色高光與小睫毛，粉紅小鼻、ω 形微笑，腮紅上還點著三顆小點。' },
      ears: { chip: '耳朵', tag: '貓咪本體', name: '一灰一橘的耳朵',
        text: '畫面左耳外側是灰黑色、耳根連著一小塊灰斑，耳裡還冒出一撮白毛；右耳是橘色。兩耳內側都是淡粉色。' },
      hairpin: { chip: '髮簪', tag: '服飾', name: '櫻花髮簪',
        text: '畫面右耳前別著一朵粉色五瓣櫻花，旁邊襯兩片嫩葉，花下用金色細鍊垂著紅色與淺灰綠色兩條小流蘇。' },
      fan: { chip: '團扇', tag: '道具', name: '櫻花團扇',
        text: '圓形團扇有金棕色的扇框，米白扇面畫著一枝直立的粉櫻與綠葉。畫面左爪握住往左下斜出的木柄，右爪托住扇緣右下，柄尾垂著紅珠與紅流蘇。' },
      shawl: { chip: '披帛', tag: '服飾', name: '鵝黃披帛',
        text: '一條鵝黃色披帛從背後繞過雙肩，在兩邊上臂外側捲成一圈，右肩還有一段順著胸前垂到腰帶。' },
      sleeves: { chip: '大袖', tag: '服飾', name: '垂到腰下的大袖',
        text: '米白大袖從手臂一路垂成圓圓的袖袋，袖面繡著小櫻花。袖口是粉色寬邊夾一條綠色虛線，從前爪一路垂到袖底，正面看像兩條長長的粉帶。' },
      robe: { chip: '襦裙', tag: '服飾', name: '粉黃綠三色百褶裙',
        text: '高腰的長裙由粉色、米白、鵝黃直幅拼接成百褶，粉幅上散著白色小花，米白幅上是粉花綠葉，裙襬中間最低、兩側微微上揚。' },
      belt: { chip: '腰結', tag: '服飾', name: '櫻花腰結與流蘇',
        text: '高腰的淺綠腰帶正中偏左繫著一朵粉色櫻花結，下方串一顆金珠，再垂下一束淺綠流蘇。' },
      sash: { chip: '飄帶', tag: '服飾', name: '嫩綠與粉色飄帶',
        text: '嫩綠長飄帶從背後繞過手肘，兩端在身側揚起再向下捲；前面兩段從袖下斜斜垂到裙前。左袖下還飛出一條粉色飄帶，像春風吹過。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '三花尾巴', dir: [1, 0.3, -0.8],
        text: '白色尾巴從畫面右後方翹起再往內捲，下彎處有一塊橘斑與灰黑斑，尾端約四成是灰黑色。' }
    },
    order: ['overview', 'face', 'ears', 'hairpin', 'fan', 'shawl', 'sleeves', 'robe', 'belt', 'sash', 'tail']
  });
})();
