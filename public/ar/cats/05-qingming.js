// @file 05_清明_白貓
// @title 清明・七爺白貓 | 二十四節氣貓
(function () {
  // ---- picture palette (sampled from refs/05.png) ----
  const C = {
    fur: '#FBF7EE', furInk: '#BF9870', earIn: '#F6B4A2',
    tongue: '#FAB5A2', tongueDeep: '#E58A7B', tongueInk: '#C0563F',
    cream: '#FBF4DE', creamInk: '#C3A77E',
    leafGreen: '#B8C98F', paleGreen: '#C9D69E', midGreen: '#9DB36E', deepGreen: '#7E9656',
    olive: '#6F6E53', oliveInk: '#4E4D3A',
    gold: '#E6B64A', goldHi: '#F4D27A', goldInk: '#A87A26',
    hat: '#FAF5E6', hatSide: '#F5E8DC', plaque: '#FAF1D2', text: '#4A3526',
    cloud: '#A69DAE', cloudInk: '#7E7489',
    fanGreen: '#B8C873', fanVein: '#8FA150', ribbon: '#8FA563', jade: '#5FA657'
  };

  // a leafy sprig (stem + alternating leaves) for the sleeves / robe
  function sprig(g, D, x, y, s, ang, color, alpha) {
    g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = alpha === undefined ? 0.85 : alpha;
    g.strokeStyle = color; g.lineWidth = Math.max(2, s * 0.05); g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.08, -s * 0.5, 0, -s); g.stroke();
    for (let i = 0; i < 5; i++) {
      const t = 0.22 + i * 0.17, k = i % 2 ? 1 : -1;
      D.leaf(g, 0, -s * t, s * 0.34, k * 0.9, color);
    }
    D.leaf(g, 0, -s * 0.98, s * 0.3, 0, color);
    g.restore();
  }

  function sleevePaint(g, w, h, D) {
    D.fill(g, C.cream);
    // leafy sprigs on the sleeve body
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) {
      const x = 40 + i * 150 + (r % 2) * 75, y = 470 - r * 130;
      sprig(g, D, x, y, 125, ((i + r) % 2 ? 0.4 : -0.35), (i + r) % 2 ? C.midGreen : '#A8BE7A', 0.9);
    }
    // cuff: wide light-green lining band with an olive edge line
    // turned-back green lining along the opening: a narrow rim all round, a wide band on the side facing the viewer / body
    g.fillStyle = '#AFC283'; g.fillRect(0, 0, w, 26);
    g.fillStyle = C.deepGreen; g.fillRect(0, 26, w, 4);
    const x0 = w * 0.22, x1 = w * 0.8;
    g.fillStyle = '#AFC283'; g.fillRect(x0, 0, x1 - x0, 88);
    g.fillStyle = '#C3D29A'; g.fillRect(x0, 62, x1 - x0, 26);
    g.fillStyle = C.deepGreen; g.fillRect(x0, 88, x1 - x0, 6);
  }

  NEKO.run({
    meta: {
      id: '05', term: '清明', title: '清明・七爺白貓', seal: '明',
      eyebrow: '二〇二七節氣貓 · 05 清明 · 白貓',
      aria: '頭戴寫著「一見發財」的白色高帽、吐著長長粉紅舌頭、手拿綠色芭蕉扇、腳穿草鞋的七爺造型白貓 3D 模型'
    },
    theme: { accent: '#5E6B3E', accentDark: '#B8C98F', glow: 'rgba(184, 201, 143, 0.32)', glowColor: '#D6E6A8' },
    palette: [['#FBF7EE', '雪白'], ['#F4A594', '舌粉'], ['#B8C98F', '柳芽綠'], ['#6F6E53', '墨橄欖']],
    spec: [['品種', '白色長毛貓'], ['角色', '七爺謝必安'], ['頭身比', '1 : 1.4']],
    seed: 5,

    cat: {
      fur: {
        color: C.fur, top: '#FBF7F0', mid: '#FDFAF4', low: '#FCF8F1', deep: '#EFE2D2', cream: '#FDFAF4',
        ink: C.furInk, creamInk: '#D8C2AC', pattern: 'none', mask: false,
        noise: false
      },
      head: { y: 2.8, neck: 2.05, w: 1.0, h: 0.84, d: 0.9, cheek: 0.15, ruff: 0.06, ruffFreq: 14,
        fur: false },
      eyes: { x: 0.455, y: -0.05, r: 0.155, sx: 0.9, sy: 1.05, sz: 0.4, color: '#3A1E0A', iris: '#8C5626', pupil: '#2A1405', pupilR: 0.46, shine: 1.1 },
      nose: { y: -0.08, color: '#F59A86', size: 0.8 },
      muzzle: { y: -0.2, size: 0.85 },
      mouth: { type: 'w', color: '#9A5A48', y: -0.17, w: 0.22, depth: 0.08 },   // ω upper lip; the open mouth + tongue are built below
      blush: { color: 'rgba(248,158,140,0.62)', x: 0.72, y: -0.2, r: 34 },
      whiskers: null,
      ears: { x: 0.76, y: 0.16, z: 0.26, tilt: 0.46, yaw: 0.0, pitch: -0.14, size: [0.62, 0.72, 0.22], innerScale: 1.12, sharp: 0.86, inner: C.earIn, tuft: '#FFFFFF', tuftScale: 1.1, fur: false },
      bib: false,
      robe: {
        profile: [[0.88, 0.36], [0.91, 0.43], [0.87, 0.58], [0.78, 0.85], [0.68, 1.15], [0.59, 1.45], [0.58, 1.7], [0.58, 1.9], [0.51, 2.03], [0.33, 2.12], [0.12, 2.16]],
        paint: (g, w, h) => { g.fillStyle = C.cream; g.fillRect(0, 0, w, h); },
        color: '#FFFFFF', ink: C.creamInk, lining: C.paleGreen, hemY: 0.62
      },
      collar: false,
      sleeves: false,
      arms: {
        L: { path: [[-0.5, 1.93, 0], [-0.84, 1.66, -0.04], [-1.04, 1.47, 0.04], [-1.06, 1.5, 0.26], [-1.0, 1.58, 0.42]], hand: [-1.04, 1.67, 0.56], pawScale: 1.3 },
        R: { path: [[0.5, 1.93, 0], [0.92, 1.64, -0.02], [1.22, 1.46, 0.02], [1.18, 1.5, 0.2], [0.96, 1.6, 0.3]], hand: [0.81, 1.66, 0.4], pawScale: 1.3 }
      },
      paws: { color: C.fur, ink: C.furInk },
      belt: { yT: 1.56, yB: 1.22, color: C.olive, line: false, knot: false, tassel: false, ink: C.oliveInk },
      feet: false,
      tail: {
        // slim stem rising behind the image-right sleeve, a big round plume on top that curls back toward the head
        pts: [[0.3, 0.55, -0.58], [0.9, 0.45, -0.72], [1.3, 0.52, -0.66], [1.46, 0.85, -0.56], [1.49, 1.3, -0.48], [1.5, 1.62, -0.42], [1.51, 1.84, -0.38], [1.42, 1.95, -0.34], [1.28, 1.8, -0.3]],
        r: 0.3, shape: t => { const ss = (a, b, x) => { const k = Math.min(Math.max((x - a) / (b - a), 0), 1); return k * k * (3 - 2 * k); };
          return (0.44 + 0.62 * ss(0.6, 0.84, t)) * (1 - 0.4 * ss(0.93, 1, t)) * (0.6 + 0.4 * ss(0, 0.08, t)); },
        color: C.fur, deep: '#F4E6DA', tip: '#FFFFFF', bands: 0, ink: C.furInk,
        fur: { layers: 14, length: 0.055, gravity: 0.015, repeat: [18, 10] }
      }
    },

    build(K) {
      const { THREE, mesh, part, group, std, texMat, canvasTex, lathe, tube, extrude, sphere, medal, tassel, D, V } = K;
      const hy = K.cfg.head.y;
      const goldM = std(C.gold, { roughness: 0.45, metalness: 0.15 });

      // rope texture (twisted straw / gold cord)
      const ropeTex = (base, dark, hi, rep) => {
        const t = canvasTex(256, 64, (g, w, h) => {
          g.fillStyle = base; g.fillRect(0, 0, w, h);
          g.lineWidth = 9; g.strokeStyle = dark;
          for (let x = -64; x < w + 64; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, h); g.stroke(); }
          g.lineWidth = 4; g.strokeStyle = hi;
          for (let x = -64; x < w + 64; x += 32) { g.beginPath(); g.moveTo(x + 12, 0); g.lineTo(x + 52, h); g.stroke(); }
        });
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, 1); return t;
      };
      const sst = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

      // soft tan halo behind fluffy white parts (the picture's coloured outline, visible beyond the fur)
      const softInk = (m, color, w) => {
        const s = (Math.abs(m.scale.x) + Math.abs(m.scale.y) + Math.abs(m.scale.z)) / 3 || 1, ww = (w / s).toFixed(4);
        const mat = new THREE.MeshBasicMaterial({ color: K.C(color), side: THREE.BackSide });
        mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * ' + ww + ';'); };
        mat.customProgramCacheKey = () => 'soft' + ww;
        const o = new THREE.Mesh(K.smoothNormals(m.geometry.clone()), mat);
        o.raycast = () => {}; o.userData.aux = true; o.castShadow = false; m.add(o); return o;
      };
      /* eyes: dark-brown rim, iris lighter toward the bottom, big pupil, one highlight at the upper centre */
      {
        const er = K.cfg.eyes.r;
        const irisTex = canvasTex(256, 256, (g, w, h) => {
          g.fillStyle = '#3A1E0A'; g.fillRect(0, 0, w, h);
          const lg = g.createLinearGradient(0, 30, 0, 236);
          lg.addColorStop(0, '#4A2710'); lg.addColorStop(0.55, '#7A4418'); lg.addColorStop(1, '#B07332');
          g.fillStyle = lg; g.beginPath(); g.arc(128, 128, 106, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#2A1405'; g.beginPath(); g.arc(128, 116, 66, 0, Math.PI * 2); g.fill();
        });
        K.eyes.forEach(eg => eg.traverse(o => {
          if (!o.isMesh) return;
          if (o.geometry.type === 'CircleGeometry') o.material = texMat(irisTex, { roughness: 0.3 });
          if (o.material === K.M.shine) {
            if (o.position.x < 0) o.position.set(0.012 * er / 0.12, 0.052 * er / 0.12, o.position.z);
            else { o.position.set(-0.04 * er / 0.12, -0.05 * er / 0.12, o.position.z); o.scale.setScalar(0.7); }
          }
        }));
      }
      softInk(K.headMesh, '#BE9670', 0.045);
      if (K.tailMesh) softInk(K.tailMesh, '#BE9670', 0.07);
      // white fur reads grey under the fur shells' base darkening: lift the fur materials (shells clone them)
      [K.tailMesh].forEach(m => { if (m && m.material && m.material.color) m.material.color.multiplyScalar(1.3); });
      // the head has no shell fur (the picture's face is smooth): lift its shading a little so the white stays white
      [K.headMesh].concat(K.ears.map(e => e.g.children[0])).forEach(m => { if (m && m.material && m.material.emissive) { m.material.emissive.set('#FBF4EA').multiplyScalar(0.2); m.material.color.multiplyScalar(1.05); } });
      // the stock lighting clips these pale picture-book colours to white; tone the lights down for this page
      K.scene.traverse(o => { if (o.isLight) o.intensity *= 0.68; });

      /* ---------------- hanging wide sleeves 大袖 (opening drops from the paw to the sleeve bottom) ---------------- */
      {
        const sleeveTex = canvasTex(1024, 512, (g, w, h) => sleevePaint(g, w, h, D));
        const sm = texMat(sleeveTex, { roughness: 0.9 }), lm = std(C.paleGreen, { side: THREE.BackSide, roughness: 0.9 });
        const mk = (key, o) => {
          const path = K.hands[key].path, segT = 64, segA = 56, pos = [], uvs = [], idx = [], ring = [];
          for (let i = 0; i <= segT; i++) {
            const t = i / segT, Cp = path.getPointAt(t), Tt = path.getTangentAt(t);
            let side = Tt.clone().cross(K.UP); if (side.lengthSq() < 0.02) side = Tt.clone().cross(V(0, 0, 1)); side.normalize();
            const u = side.clone().cross(Tt).normalize();
            const sc = (0.35 + 0.65 * sst(0, 0.3, t)) * o.width;
            const rw = (0.13 + 0.06 * t) * sc, rt = (0.13 + 0.04 * t) * sc;
            const drop = 0.1 + o.drop * (sst(0.08, 0.62, t) - 0.18 * sst(0.8, 1, t));
            for (let j = 0; j <= segA; j++) {
              const a = j / segA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
              const y = sa >= 0 ? rt * sa : -drop * Math.pow(-sa, 0.65);
              const x = rw * ca * (sa < 0 ? (1 + 0.75 * Math.pow(-sa, 1.5) * sst(0.15, 0.55, t)) * (1 - o.slit * sst(0.72, 1, t) * Math.pow(-sa, 0.7)) : 1);
              const P = Cp.clone().addScaledVector(side, x).addScaledVector(u, y);
              pos.push(P.x, P.y, P.z); uvs.push(j / segA, t);
              if (i === segT) ring.push(P);
            }
          }
          for (let i = 0; i < segT; i++) for (let j = 0; j < segA; j++) { const a = i * (segA + 1) + j, b = a + segA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
          g.setIndex(idx); K.smoothNormals(g);
          const k = Math.floor(segT / 2) * (segA + 1) + Math.floor(segA / 4);
          const pv = V(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]), nv = V().fromBufferAttribute(g.attributes.normal, k);
          if (nv.dot(pv.sub(path.getPointAt(0.5))) < 0) { for (let i = 0; i < idx.length; i += 3) { const tt = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = tt; } g.setIndex(idx); K.smoothNormals(g); }
          mesh(g, sm, K.robeG, null, null, C.creamInk);
          const ln = new THREE.Mesh(g, lm); ln.receiveShadow = true; K.robeG.add(ln);
        };
        mk('L', { width: 0.92, drop: 0.74, slit: 0.55 });
        mk('R', { width: 1.1, drop: 0.74, slit: 0.3 });
      }

      /* ---------------- soft skirt folds: gentle radial ripples toward the hem ---------------- */
      {
        const geo = K.robeMesh.geometry, p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z);
          const k = 1 + 0.028 * Math.sin(a * 11 + 0.6) * sst(1.15, 0.45, y);
          p.setXYZ(i, x * k, y, z * k);
        }
        K.smoothNormals(geo);
      }

      /* ---------------- robe fabric: collar bands, front edge, hem hills ---------------- */
      {
        const cv = K.robeMesh.material.map.image, g = cv.getContext('2d');
        const uvF = (x, y) => { const r = K.robeR(y); const s = Math.max(-1, Math.min(1, x / r)); return K.robeUV(Math.asin(s) * 180 / Math.PI, y); };
        const band = (a, b, wA, wB, color) => { // quad strip between two centre points with widths (front-view units)
          const n = 14, L = [], R = [];
          for (let i = 0; i <= n; i++) {
            const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, hw = (wA + (wB - wA) * t) / 2;
            L.push(uvF(x - hw, y)); R.push(uvF(x + hw, y));
          }
          g.fillStyle = color; g.beginPath(); g.moveTo(L[0][0], L[0][1]);
          L.forEach(p => g.lineTo(p[0], p[1])); R.reverse().forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill();
        };
        // leafy sprigs over the skirt
        for (let i = 0; i < 12; i++) {
          const deg = -170 + i * 30 + (i % 2) * 8, y = 0.75 + (i % 3) * 0.18;
          const [x, yy] = K.robeUV(deg, y);
          if (Math.abs(deg) < 30) continue;
          sprig(g, D, x, yy, 70, (i % 2 ? 0.4 : -0.35), i % 2 ? C.midGreen : C.leafGreen, 0.6);
        }
        // hem: layered green hills with golden swirl lines (front-right, sides and back)
        const vHem = K.robeV(0.3), vTop = K.robeV(0.72);
        const hills = (deg) => {
          const [x] = K.robeUV(deg, 0.5), H = vHem - vTop;
          g.save();
          g.fillStyle = C.leafGreen; g.beginPath(); g.ellipse(x + 40, vHem, 80, H * 0.8, 0, Math.PI, 0); g.fill();
          g.fillStyle = C.midGreen; g.beginPath(); g.ellipse(x + 85, vHem, 50, H * 0.5, 0, Math.PI, 0); g.fill();
          g.fillStyle = '#CBD9A4'; g.beginPath(); g.ellipse(x - 10, vHem, 40, H * 0.38, 0, Math.PI, 0); g.fill();
          g.strokeStyle = '#E6C27A'; g.lineWidth = 6; g.lineCap = 'round';
          for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x - 70, vHem - H * 0.2 + k * 14, 40 - k * 8, Math.PI * 1.05, Math.PI * 1.85); g.stroke(); }
          g.strokeStyle = C.leafGreen; g.lineWidth = 7;
          g.beginPath(); g.arc(x - 60, vHem - H * 0.45, 46, Math.PI * 1.1, Math.PI * 1.8); g.stroke();
          g.restore();
          // clover flowers above the hills
          [[x + 20, vTop - 40, 16], [x + 58, vTop - 88, 13]].forEach(([cx, cy, s]) => {
            g.fillStyle = '#A9BE9A';
            for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.beginPath(); g.arc(cx + Math.cos(a) * s * 0.7, cy + Math.sin(a) * s * 0.7, s * 0.6, 0, Math.PI * 2); g.fill(); }
            g.fillStyle = '#F2EFD8'; g.beginPath(); g.arc(cx, cy, s * 0.25, 0, Math.PI * 2); g.fill();
          });
        };
        [30, 118, -150, -80].forEach(hills);
        // outer-panel front edge running down from the belt (light green strip + olive band)
        band([-0.2, 1.3], [-0.2, 0.28], 0.1, 0.1, C.paleGreen);
        band([-0.07, 1.3], [-0.07, 0.28], 0.16, 0.16, C.olive);
        // crossed collar: inner lapel (image-left, under), outer lapel from image-right neck to the belt
        band([-0.36, 2.08], [-0.06, 1.62], 0.15, 0.15, C.olive);
        band([0.36, 2.06], [-0.28, 1.56], 0.11, 0.11, C.paleGreen);
        band([0.52, 2.08], [-0.08, 1.56], 0.17, 0.17, C.olive);
        K.robeMesh.material.map.needsUpdate = true;
      }

      /* ---------------- belt: gold cord, bow, paw medallion, jade bead + tassel ---------------- */
      {
        const beltG = K.beltG, yK = 1.37;
        const cordM = texMat(ropeTex(C.gold, '#C0902E', C.goldHi, 40), { roughness: 0.5 });
        const cord = mesh(new THREE.TorusGeometry(K.robeR(yK) + 0.045, 0.024, 10, 160), cordM, beltG, [0, yK, 0]);
        cord.rotation.x = Math.PI / 2;
        [1.56, 1.22].forEach(y => { const r = mesh(new THREE.TorusGeometry(K.robeR(y) + 0.03, 0.01, 6, 128), std(C.oliveInk), beltG, [0, y, 0]); r.rotation.x = Math.PI / 2; });
        const deg = 30, a = deg * Math.PI / 180;
        const bow = group(beltG, K.onRobe(deg, yK, 0.08), [0, a, 0]);
        const bm = std(C.gold, { roughness: 0.45, metalness: 0.12 });
        [-1, 1].forEach(sx => {
          const l = mesh(new THREE.TorusGeometry(0.088, 0.024, 10, 32), bm, bow, [0.11 * sx, 0.01, 0], [1, 0.7, 1], C.goldInk);
          l.rotation.y = sx * 0.3;
          mesh(tube([[0.01 * sx, -0.02, 0.01], [0.05 * sx, -0.1, 0.02], [0.07 * sx, -0.17, 0.01]], 0.018, 12, 8), bm, bow, null, null, C.goldInk);
        });
        mesh(sphere(0.045, 20, 14), bm, bow, [0, 0, 0.01], null, C.goldInk);
        // cords down to the medallion and to the jade bead
        const knot = K.onRobe(deg, yK - 0.05, 0.09);
        const medP = K.onRobe(42, 1.04, 0.07), beadP = K.onRobe(17, 1.02, 0.08);
        mesh(tube([knot, K.onRobe(34, 1.3, 0.08), K.onRobe(40, 1.22, 0.075)], 0.012, 20, 6), bm, beltG);
        mesh(tube([knot, K.onRobe(22, 1.25, 0.085), K.onRobe(18, 1.07, 0.08)], 0.012, 20, 6), bm, beltG);
        const md = medal(beltG, medP, 0.19, (g) => {
          g.fillStyle = '#F4E3B2'; g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#D9A93A'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.stroke();
          g.fillStyle = '#5A4130';
          g.beginPath(); g.ellipse(128, 150, 40, 32, 0, 0, Math.PI * 2); g.fill();
          [[82, 108, -0.4], [110, 84, -0.15], [146, 84, 0.15], [174, 108, 0.4]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, 15, 19, r, 0, Math.PI * 2); g.fill(); });
        }, C.gold, C.goldInk, '#F4E3B2');
        md.rotation.y = 42 * Math.PI / 180;
        mesh(sphere(0.03, 12, 10), bm, beltG, K.onRobe(40, 1.24, 0.08));
        mesh(sphere(0.048, 20, 14), std(C.jade, { roughness: 0.25, metalness: 0.05 }), beltG, beadP, null, '#3F7A3A');
        tassel(beltG, [beadP.x, beadP.y - 0.06, beadP.z], '#F2BE2E', 0.24, 0.042, C.goldInk);
      }

      /* ---------------- tall white hat 高帽 (一見發財) ---------------- */
      {
        const hatG = part('hat', K.head);
        const zs = 0.92; hatG.scale.set(1, 1, zs); hatG.position.y = 0.045;
        const yB = 3.6, yC = 4.96, rB = 0.797, rC = 0.554;
        const rHat = y => rB + (rC - rB) * (y - yB) / (yC - yB);
        const prof = [[0.6, yB - 0.02], [rB, yB], [rHat(3.9), 3.9], [rHat(4.5), 4.5], [rC, yC], [rC - 0.05, yC + 0.075], [0.34, yC + 0.13], [0.0, yC + 0.145]];
        const hl = lathe(prof, 96);
        // arc-length v for a height on the cone
        const pts = hl.pts; let tot = 0; const acc = [0];
        for (let i = 1; i < pts.length; i++) { tot += pts[i].distanceTo(pts[i - 1]); acc.push(tot); }
        const vOf = y => { for (let i = 1; i < pts.length; i++) if (pts[i].y >= y) { const t = (y - pts[i - 1].y) / (pts[i].y - pts[i - 1].y || 1); return (acc[i - 1] + t * (acc[i] - acc[i - 1])) / tot; } return 1; };
        const hatTex = canvasTex(1024, 512, (g, w, h) => {
          const lg = g.createLinearGradient(0, 0, w, 0);
          lg.addColorStop(0, C.hatSide); lg.addColorStop(0.3, '#F2DACB'); lg.addColorStop(0.4, C.hat); lg.addColorStop(0.6, C.hat); lg.addColorStop(0.7, '#F2DACB'); lg.addColorStop(1, C.hatSide);
          g.fillStyle = lg; g.fillRect(0, 0, w, h);
          const row = y => (1 - vOf(y)) * h, col = deg => 512 + deg / 360 * 1024;
          // soft pink creases down the sides, like the picture's paper-hat panels
          [-1, 1].forEach(sx => { const x = col(sx * 64); const sg = g.createLinearGradient(x - 40, 0, x + 40, 0); sg.addColorStop(0, 'rgba(236,196,180,0)'); sg.addColorStop(0.5, 'rgba(236,196,180,0.75)'); sg.addColorStop(1, 'rgba(236,196,180,0)'); g.fillStyle = sg; g.fillRect(x - 40, 0, 80, h); });
          // grey-lavender auspicious clouds on both sides of the plaque, plus a little green leaf
          const cloud = (x, y, s) => {
            g.save(); g.translate(x, y); g.scale(1, 1.3); g.translate(-x, -y);
            const lobes = [[0, 0, 1], [-0.8, 0.35, 0.72], [0.8, 0.3, 0.75], [-0.3, 0.85, 0.7], [0.45, 0.9, 0.6]];
            g.strokeStyle = C.cloudInk; g.lineWidth = 6;
            lobes.forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.stroke(); });
            g.fillStyle = C.cloud;
            lobes.forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); });
            g.strokeStyle = '#F4F0F2'; g.lineWidth = 3;
            g.beginPath(); g.arc(x, y + 0.1 * s, 0.4 * s, Math.PI * 0.9, Math.PI * 2.3); g.stroke();
            g.fillStyle = '#F4F0F2'; g.beginPath(); g.arc(x - 0.8 * s, y + 0.35 * s, 0.18 * s, 0, Math.PI * 2); g.fill();
            g.restore();
          };
          [-1, 1].forEach(sx => cloud(col(sx * 47), row(4.05), 21));
          [-1, 1].forEach(sx => cloud(col(180 + sx * 55), row(4.3), 20));
          D.leaf(g, col(44), row(3.86), 34, 0.2, '#9DBA6A', '#6E8C4E');
        });
        mesh(hl.geo, texMat(hatTex, { roughness: 0.85 }), hatG, null, null, '#C7A274');
        // raised plaque with gold frame and the words 一見發財
        const y0 = 3.74, y1 = 4.95, half = 0.47;
        const rAt = y => { for (let i = 1; i < pts.length; i++) if (pts[i].y >= y) { const t = (y - pts[i - 1].y) / (pts[i].y - pts[i - 1].y || 1); return pts[i - 1].x + t * (pts[i].x - pts[i - 1].x); } return rC; };
        const pp = []; for (let i = 0; i <= 16; i++) { const y = y0 + (y1 - y0) * i / 16; pp.push(new THREE.Vector2(rAt(y) + 0.018, y)); }
        const plaqueGeo = new THREE.LatheGeometry(pp, 24, -half, half * 2);
        const plaqueTex = canvasTex(256, 560, (g, w, h) => {
          g.fillStyle = C.plaque; g.fillRect(0, 0, w, h);
          const notch = (inset, color, lw) => {
            const x0 = inset, y0_ = inset, x1 = w - inset, y1_ = h - inset, n = 22;
            g.strokeStyle = color; g.lineWidth = lw; g.beginPath();
            g.moveTo(x0 + n, y0_); g.lineTo(x1 - n, y0_); g.arc(x1, y0_, n, Math.PI, Math.PI * 0.5, true);
            g.lineTo(x1, y1_ - n); g.arc(x1, y1_, n, Math.PI * 1.5, Math.PI, true);
            g.lineTo(x0 + n, y1_); g.arc(x0, y1_, n, 0, Math.PI * 1.5, true);
            g.lineTo(x0, y0_ + n); g.arc(x0, y0_, n, Math.PI * 0.5, 0, true); g.closePath(); g.stroke();
          };
          notch(12, '#D9A83E', 20); notch(30, '#E8C36A', 4);
          g.fillStyle = C.text; g.strokeStyle = C.text; g.lineWidth = 6; g.lineJoin = 'round'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = '900 122px "DFKai-SB","BiauKai","KaiTi","Microsoft JhengHei","PMingLiU",serif';
          ['一', '見', '發', '財'].forEach((ch, i) => { g.save(); g.translate(w / 2, 92 + i * 125); g.scale(1.25, 1); g.strokeText(ch, 0, 0); g.fillText(ch, 0, 0); g.restore(); });
        });
        mesh(plaqueGeo, texMat(plaqueTex, { roughness: 0.7 }), hatG, null, null, '#B8862A');
        // dark olive band with gold trim, gold scrolls and the yin-yang emblem
        const bandTex = canvasTex(1024, 128, (g, w, h) => {
          g.fillStyle = '#5E5B47'; g.fillRect(0, 0, w, h);
          const col = deg => 512 + deg / 360 * 1024;
          g.strokeStyle = '#E2B43E'; g.lineWidth = 7; g.lineCap = 'round';
          // round gold scrolls (the canvas is ~1.9× stretched around the band, so squeeze x)
          [-30, 30, -95, 95, -155, 155].forEach(d => {
            const x = col(d), s = d < 0 ? -1 : 1;
            g.save(); g.translate(x, 50); g.scale(0.8 * s, 1); g.lineWidth = 7;
            g.beginPath();
            for (let a = 0; a <= Math.PI * 3.1; a += 0.08) { const r = 22 * (1 - a / (Math.PI * 3.7)), px = Math.cos(a + Math.PI) * r, py = Math.sin(a + Math.PI) * r; a ? g.lineTo(px, py) : g.moveTo(px, py); }
            g.stroke();
            g.beginPath(); g.moveTo(-22, 0); g.quadraticCurveTo(-26, 24, 0, 26); g.lineTo(30, 26); g.stroke();
            g.restore();
          });
        });
        const band = lathe([[0.66, 3.33], [0.79, 3.35], [0.82, 3.42], [0.82, 3.61], [0.79, 3.69], [0.7, 3.71]], 96);
        mesh(band.geo, texMat(bandTex, { roughness: 0.8 }), hatG, null, null, '#3F3D2E');
        [3.35, 3.685].forEach(y => { const r = mesh(new THREE.TorusGeometry(0.81, 0.03, 10, 120), goldM, hatG, [0, y, 0], null, C.goldInk); r.rotation.x = Math.PI / 2; });
        medal(hatG, [0, 3.63, 0.845], 0.225, (g) => {
          const c = 128, R = 118;
          g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#2A2622'; g.beginPath(); g.arc(c, c, R, -Math.PI / 2, Math.PI / 2); g.fill();
          g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(c, c - R / 2, R / 2, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#2A2622'; g.beginPath(); g.arc(c, c + R / 2, R / 2, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#2A2622'; g.beginPath(); g.arc(c, c - R / 2, R / 7, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(c, c + R / 2, R / 7, 0, Math.PI * 2); g.fill();
        }, C.gold, C.goldInk, '#FFFFFF');
        [-1, 1].forEach(sx => mesh(sphere(0.07, 20, 14), goldM, hatG, [0.28 * sx, 3.6, 0.81], [1, 0.8, 0.5], C.goldInk));
      }

      /* ---------------- open mouth + long pink tongue (七爺 motif) ----------------
         The ω upper lip stays; under it a small dark mouth opening is laid onto the muzzle, and the tongue
         comes out of that opening, lies on the chin, hangs over the chin edge onto the chest and hooks
         to image-right at the tip. Every vertex is projected onto the face / chest surface (front ray cast),
         then "draped": going down it may leave the surface but only sinks back at a limited slope, and
         across it stays fairly stiff, so it bridges the hollow under the chin instead of tucking in. */
      {
        const tg = part('tongue', K.faceG);
        const MO = K.cfg.mouth, my = hy + MO.y, mw = MO.w, dp = MO.depth;
        const surfT = K.muzzle.concat(K.headMesh, K.robeMesh);
        const surfZ = (x, y) => K.onSkin(x, y, surfT).p.z;
        const rootY = my - dp + 0.012;   // root top edge tucked just under the ω lobes
        const root = V(0, rootY, surfZ(0, rootY));
        tg.position.copy(root);   // pivot of the idle sway = where the tongue leaves the mouth

        // --- mouth opening: top edge runs just under the ω lip, sides drop to a U hidden by the tongue ---
        {
          const lip = new THREE.CatmullRomCurve3([[-mw, my], [-mw * 0.54, my - dp], [0, my - 0.005], [mw * 0.54, my - dp], [mw, my]].map(([x, y]) => V(x, y, 0)));
          const xo = 0.2, top = [];
          for (let i = 0; i <= 60; i++) { const q = lip.getPoint(i / 60); if (Math.abs(q.x) <= xo) top.push([q.x, q.y - 0.004]); }
          const yL = top[0][1], yR = top[top.length - 1][1], yB = my - 0.2;
          const sh = new THREE.Shape();
          sh.moveTo(top[0][0], top[0][1]); top.forEach(([x, y]) => sh.lineTo(x, y));
          sh.bezierCurveTo(xo + 0.005, yR - 0.08, 0.12, yB, 0, yB);
          sh.bezierCurveTo(-0.12, yB, -xo - 0.005, yL - 0.08, top[0][0], yL);
          const og = new THREE.ShapeGeometry(sh, 24), op = og.attributes.position, ouv = og.attributes.uv;
          const y1 = my + 0.01;
          for (let i = 0; i < op.count; i++) {
            const x = op.getX(i), y = op.getY(i);
            ouv.setXY(i, (x + xo) / (2 * xo), (y - yB) / (y1 - yB));
            op.setXYZ(i, x - root.x, y - root.y, surfZ(x, y) + 0.0025 - root.z);
          }
          K.smoothNormals(og);
          const mouthTex = canvasTex(128, 128, (g, w, h) => {
            g.fillStyle = '#A9482F'; g.fillRect(0, 0, w, h);                         // rust rim (picture #B75635)
            const rg = g.createRadialGradient(w / 2, h * 0.45, 4, w / 2, h * 0.45, w * 0.46);
            rg.addColorStop(0, '#E0705A'); rg.addColorStop(0.6, '#C85A43'); rg.addColorStop(1, 'rgba(169,72,47,0)');
            g.fillStyle = rg; g.fillRect(0, 0, w, h);
            const sg = g.createLinearGradient(0, 0, 0, h * 0.35);                     // shadow under the upper lip
            sg.addColorStop(0, 'rgba(120,40,28,0.85)'); sg.addColorStop(1, 'rgba(120,40,28,0)');
            g.fillStyle = sg; g.fillRect(0, 0, w, h * 0.35);
          });
          const om = mesh(og, texMat(mouthTex, { roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), tg);
          om.castShadow = false;
        }

        // --- tongue centre line in the front plane (measured on refs/05.png, ≈ 0.0111 units / px) ---
        const cl = new THREE.CatmullRomCurve3([[0, rootY], [0.004, 2.4], [0.008, 2.32], [0.04, 2.19], [0.09, 2.075], [0.18, 1.97], [0.29, 1.905], [0.345, 1.905]].map(([x, y]) => V(x, y, 0)));
        const L = cl.getLength(), capL = 0.13, Lt = L + capL, N = 72, M = 18;
        const endP = cl.getPointAt(1), endT = cl.getTangentAt(1);
        const hwOf = s => { const d = s * Lt, base = 0.118 + 0.037 * sst(0, 0.45, s);
          return d <= L ? base : base * Math.sqrt(Math.max(0, 1 - Math.pow((d - L) / capL, 2))); };
        const cen = [], nrm = [], hw = [];
        for (let i = 0; i <= N; i++) {
          const s = i / N, d = s * Lt;
          let c, t;
          if (d <= L) { c = cl.getPointAt(d / L); t = cl.getTangentAt(d / L); } else { c = endP.clone().addScaledVector(endT, d - L); t = endT.clone(); }
          cen.push(c); nrm.push(V(-t.y, t.x, 0).normalize()); hw.push(hwOf(s));
        }
        // surface depth under every grid point, then drape (across: stiff, down: limited sink back)
        const Z = [], X = [], Y = [];
        for (let i = 0; i <= N; i++) {
          Z.push([]); X.push([]); Y.push([]);
          for (let j = 0; j <= M; j++) {
            const u = -1 + 2 * j / M, x = cen[i].x + nrm[i].x * hw[i] * u, y = cen[i].y + nrm[i].y * hw[i] * u;
            X[i].push(x); Y[i].push(y); Z[i].push(surfZ(x, y));
          }
        }
        const Zs = Z.map(r => r.slice());
        for (let i = 0; i <= N; i++) for (let pass = 0; pass < 2; pass++) {
          for (let j = 1; j <= M; j++) Z[i][j] = Math.max(Z[i][j], Z[i][j - 1] - 0.8 * Math.abs(X[i][j] - X[i][j - 1]));
          for (let j = M - 1; j >= 0; j--) Z[i][j] = Math.max(Z[i][j], Z[i][j + 1] - 0.8 * Math.abs(X[i][j] - X[i][j + 1]));
        }
        for (let j = 0; j <= M; j++) for (let i = 1; i <= N; i++) Z[i][j] = Math.max(Z[i][j], Z[i - 1][j] - 0.7 * Math.max(0, Y[i - 1][j] - Y[i][j]));
        for (let it = 0; it < 3; it++) {   // smooth, never below the real surface
          const P = Z.map(r => r.slice());
          for (let i = 1; i < N; i++) for (let j = 0; j <= M; j++) Z[i][j] = Math.max(Zs[i][j], 0.25 * P[i - 1][j] + 0.5 * P[i][j] + 0.25 * P[i + 1][j]);
        }
        // lens-shaped cross-section: flat underside on the skin, plump rounded top; thin and flush at the root
        const offOf = s => 0.0015 + 0.0065 * sst(0, 0.12, s), thOf = s => 0.006 + 0.044 * sst(0.03, 0.2, s);
        const R = 2 * M, pos = [], col = [], idx = [];
        const cRoot = new THREE.Color('#E27A62'), cBody = new THREE.Color('#FDBDAC'), cEdge = new THREE.Color('#F4A08C'), cc = new THREE.Color();
        [cRoot, cBody, cEdge].forEach(c => c.convertSRGBToLinear());
        for (let i = 0; i <= N; i++) {
          const s = i / N, off = offOf(s), th = thOf(s);
          for (let k = 0; k < R; k++) {
            const top = k <= M, j = top ? k : R - k;
            const u = -1 + 2 * j / M, bulge = Math.pow(Math.max(0, 1 - u * u), 0.6);
            const z = Z[i][j] + off + (top ? th * bulge : -0.006 * bulge);
            pos.push(X[i][j] - root.x, Y[i][j] - root.y, z - root.z);
            cc.copy(cBody).lerp(cEdge, 0.55 * Math.pow(Math.abs(u), 3)).lerp(cRoot, 1 - sst(0.02, 0.2, s));
            if (!top) cc.lerp(cRoot, 0.5);
            col.push(cc.r, cc.g, cc.b);
          }
        }
        for (let i = 0; i < N; i++) for (let k = 0; k < R; k++) {
          const a = i * R + k, b = i * R + (k + 1) % R;
          idx.push(a, b, a + R, b, b + R, a + R);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        geo.setIndex(idx); K.smoothNormals(geo);
        { // make the top face point forward (+z)
          const n = V().fromBufferAttribute(geo.attributes.normal, Math.floor(N / 2) * R + M / 2);
          if (n.z < 0) { for (let q = 0; q < idx.length; q += 3) { const t = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = t; } geo.setIndex(idx); K.smoothNormals(geo); }
        }
        // the page's dimmed lights render pale pinks ~25 % too dark: a little emissive brings it back to the picture's #FAB5A2
        mesh(geo, std('#FFFFFF', { roughness: 0.5, vertexColors: true, emissive: new THREE.Color(C.tongue).convertSRGBToLinear(), emissiveIntensity: 0.3 }), tg, null, null, C.tongueInk);
        // central groove on the top surface, fading out two thirds down
        const groove = [];
        for (let i = Math.round(N * 0.1); i <= Math.round(N * 0.66); i += 3) { const s = i / N; groove.push([X[i][M / 2] - root.x, Y[i][M / 2] - root.y, Z[i][M / 2] + offOf(s) + thOf(s) - 0.003 - root.z]); }
        mesh(tube(groove, t => 0.0085 * Math.sin(Math.PI * (0.06 + 0.88 * t)), 32, 6), std(C.tongueDeep, { roughness: 0.6 }), tg);
      }

      /* ---------------- face paint: hatched blush + little brow tufts ---------------- */
      {
        const g = K.headTex.image.getContext('2d');
        const at = (x, y) => { const s = K.onSkin(x, y, [K.headMesh]); return s.uv ? [s.uv.x * 1024, (1 - s.uv.y) * 512] : null; };
        [-1, 1].forEach(sx => {
          const b = at(0.72 * sx, hy - 0.2);
          if (b) { g.strokeStyle = 'rgba(232,120,110,0.75)'; g.lineWidth = 2.2; g.lineCap = 'round'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(b[0] + i * 9 - 3, b[1] + 5); g.lineTo(b[0] + i * 9 + 3, b[1] - 5); g.stroke(); } }
          const br = at(0.42 * sx, hy + 0.42);
          if (br) { g.strokeStyle = 'rgba(214,160,140,0.8)'; g.lineWidth = 2.5; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(br[0] + i * 8 - 6, br[1] + 4); g.lineTo(br[0] + i * 8 - 1, br[1] - 4); g.stroke(); } }
        });
        K.headTex.needsUpdate = true;
      }

      /* ---------------- whiskers: two nearly parallel strands out of each cheek edge ---------------- */
      {
        const wm = std('#8F6A4E', { roughness: 0.8 });
        [-1, 1].forEach(sx => [[-0.12, 0.05], [-0.25, -0.1]].forEach(([dy, ang]) => {
          const a = K.onSkin(0.93 * sx, hy + dy, [K.headMesh]).p;
          const pts = [[a.x - 0.05 * sx, a.y, a.z - 0.02], [a.x + 0.18 * sx, a.y + ang * 0.5 + 0.01, a.z - 0.06], [a.x + 0.4 * sx, a.y + ang, a.z - 0.12]];
          mesh(tube(pts, t => 0.0078 * (1 - 0.6 * t), 16, 5), wm, K.faceG);
        }));
      }

      /* ---------------- paw toe lines ---------------- */
      const toeM = std('#DCC3AE', { roughness: 0.8 });
      ['L', 'R'].forEach(k => {
        const P = K.hands[k].p;
        [-1, 1].forEach(sx => mesh(tube([[P.x + 0.055 * sx, P.y + 0.13, P.z + 0.11], [P.x + 0.06 * sx, P.y + 0.07, P.z + 0.17], [P.x + 0.055 * sx, P.y + 0.0, P.z + 0.18]], 0.008, 10, 5), toeM, K.poseG));
      });

      /* ---------------- palm-leaf fan 芭蕉扇 in the image-left paw ---------------- */
      let fanG;
      {
        const P = K.hands.L.p;
        fanG = part('fan', K.body); fanG.position.copy(P); fanG.rotation.set(0, -0.3, 0); fanG.scale.setScalar(1.0);
        const f = group(fanG, [-0.19, 0.345, 0]); // ferrule
        const out = [[0, 0], [-0.23, -0.07], [-0.62, 0.0], [-0.83, 0.14], [-0.86, 0.3], [-0.76, 0.41], [-0.88, 0.57], [-0.84, 0.78], [-0.69, 0.94], [-0.51, 1.0], [-0.34, 0.96], [-0.25, 0.9], [-0.12, 0.99], [0.09, 0.99], [0.27, 0.86], [0.33, 0.6], [0.28, 0.28], [0.16, 0.09]];
        const shp = new THREE.Shape(); const cv = K.curve3(out.map(q => [q[0], q[1], 0]), true);
        const sp = cv.getPoints(120); shp.moveTo(sp[0].x, sp[0].y); sp.forEach(q => shp.lineTo(q.x, q.y));
        const rimM = std('#F2D58A', { roughness: 0.55 });
        mesh(extrude(shp, 0.05, 0.012), rimM, f, null, null, '#B08A3A');
        const cx = -0.28, cy = 0.52, k = 0.88;
        const inner = new THREE.Shape(); sp.forEach((q, i) => { const x = cx + (q.x - cx) * k, y = cy + (q.y - cy) * k; i ? inner.lineTo(x, y) : inner.moveTo(x, y); });
        const fg = new THREE.ShapeGeometry(inner, 24);
        const uv = fg.attributes.uv, pz = fg.attributes.position;
        for (let i = 0; i < pz.count; i++) uv.setXY(i, (pz.getX(i) + 0.9) / 1.25, (pz.getY(i) + 0.1) / 1.12);
        const faceTex = canvasTex(512, 512, (g, w, h) => {
          const rg = g.createRadialGradient(w * 0.72, h * 0.91, 20, w * 0.5, h * 0.5, 420);
          rg.addColorStop(0, '#9DB257'); rg.addColorStop(1, '#B6C977'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
          const ox = 0.9 / 1.25 * w, oy = h - 0.1 / 1.12 * h;
          g.strokeStyle = C.fanVein; g.lineWidth = 4; g.lineCap = 'round';
          for (let i = 0; i < 9; i++) {
            const a = Math.PI * (0.52 + i * 0.1);
            g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox + Math.cos(a) * 200, oy - Math.sin(a) * 260, ox + Math.cos(a) * 520, oy - Math.sin(a) * 560); g.stroke();
          }
        });
        const faceM = texMat(faceTex, { roughness: 0.8 });
        mesh(fg, faceM, f, [0, 0, 0.0265]);
        mesh(fg, texMat(faceTex, { roughness: 0.8, side: THREE.DoubleSide }), f, [0, 0, -0.0265]);
        // midrib + handle through the paw
        const handleM = std('#E6B24A', { roughness: 0.45, metalness: 0.1 });
        mesh(tube([[-0.5, 0.8, 0.03], [-0.25, 0.4, 0.032], [0, 0, 0.03]], 0.02, 20, 8), handleM, f, null, null, '#B08A3A');
        mesh(tube([[-0.5, 0.8, -0.03], [-0.25, 0.4, -0.032], [0, 0, -0.03]], 0.02, 20, 8), handleM, f);
        mesh(tube([[0, 0.02, 0], [0.18, -0.3, 0], [0.37, -0.62, 0]], 0.03, 20, 10), handleM, f, null, null, '#B08A3A');
        mesh(sphere(0.06, 20, 14), handleM, f, [0.01, -0.01, 0], [1, 1.1, 1], '#B08A3A');
        // green ribbon bow, cord, jade bead and golden tassel hanging from the ferrule
        const rm = std('#9CBC5E', { roughness: 0.75 });
        mesh(tube(K.curve3([[0.0, -0.05, 0.03], [-0.13, -0.12, 0.04], [-0.24, -0.26, 0.04], [-0.14, -0.3, 0.04], [-0.04, -0.14, 0.035]], true), 0.024, 40, 8, true), rm, f, null, null, '#5E7A3E');
        mesh(tube(K.curve3([[0.0, -0.05, 0.035], [-0.04, -0.22, 0.05], [-0.1, -0.42, 0.05], [-0.02, -0.4, 0.05], [0.02, -0.16, 0.04]], true), 0.024, 40, 8, true), rm, f, null, null, '#5E7A3E');
        mesh(tube([[0, -0.06, 0.03], [-0.05, -0.3, 0.04], [-0.1, -0.5, 0.04], [-0.13, -0.62, 0.03]], 0.016, 24, 6), rm, f, null, null, '#5E7A3E');
        mesh(sphere(0.05, 20, 14), std(C.jade, { roughness: 0.25 }), f, [-0.13, -0.66, 0.03], null, '#3F7A3A');
        tassel(f, [-0.135, -0.72, 0.03], '#F2BE2E', 0.22, 0.045, C.goldInk);
        K._fan = fanG;
      }

      /* ---------------- white paws in straw sandals 草鞋 ---------------- */
      {
        const sg = part('sandals', K.poseG);
        const furM = std(C.fur, { roughness: 0.95 });
        const ropeM = texMat(ropeTex('#E8B64A', '#C08A2E', '#F6D27A', 30), { roughness: 0.7 });
        const strapM = texMat(ropeTex('#E8B64A', '#C08A2E', '#F6D27A', 8), { roughness: 0.7 });
        [-1, 1].forEach(sx => {
          const fg = group(sg, [0.52 * sx, 0, 0.56]);
          const A = 0.255, B = 0.19, Cz = 0.33, cy = 0.15, cz = 0.06; // paw ellipsoid radii / centre
          mesh(sphere(1, 36, 26), furM, fg, [0, cy, cz], [A, B, Cz], C.furInk);
          // short white leg between the hem and the sandal
          mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.36, 24), furM, fg, [0, 0.36, -0.1], null, C.furInk);
          const surf = (x, z, off) => cy + (B + off) * Math.sqrt(Math.max(0, 1 - Math.pow(x / (A + off), 2) - Math.pow((z - cz) / (Cz + off), 2)));
          // toe grooves: three plump toes at the front
          [-1, 1].forEach(k => { const x = 0.07 * k, pts = []; for (let i = 0; i <= 4; i++) { const z = cz + 0.2 + i * 0.03; pts.push([x, surf(x, z, 0.004), z]); } mesh(tube(pts, 0.008, 10, 5), toeM, fg); });
          // flat straw sole with a thick twisted-rope rim (oval, longer than wide)
          mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 48), std('#E3B04A', { roughness: 0.8 }), fg, [0, 0.03, 0.03], [1, 1, 1.35], C.goldInk);
          const ring = []; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; ring.push([Math.sin(a) * 0.3, 0.06, 0.03 + Math.cos(a) * 0.42]); }
          mesh(tube(ring, 0.04, 128, 10, true), ropeM, fg, null, null, C.goldInk);
          // rope strap hugging the paw just behind the toes (ring side → over the paw → other ring side)
          const zs = cz + 0.1, strap = [[-0.3, 0.06, zs + 0.02]];
          for (let i = 0; i <= 10; i++) { const x = -0.235 + i * 0.047; strap.push([x, surf(x, zs, 0.022), zs]); }
          strap.push([0.3, 0.06, zs + 0.02]);
          mesh(tube(strap, 0.03, 60, 10), strapM, fg, null, null, C.goldInk);
          // heel loop behind the ankle
          const heel = []; for (let i = 0; i <= 12; i++) { const a = -1.9 + i * 3.8 / 12; heel.push([Math.sin(a) * 0.24, 0.26 - 0.12 * Math.pow(Math.abs(Math.sin(a)), 2), -0.1 - Math.cos(a) * 0.218]); }
          heel[0] = [-0.27, 0.07, 0.0]; heel[12] = [0.27, 0.07, 0.0];
          mesh(tube(heel, 0.026, 40, 8), strapM, fg, null, null, C.goldInk);
        });
      }

      /* ---------------- floating decorations: leaves, petal, plum-white flowers, grass ---------------- */
      {
        const dg = K.decor;
        const leafShape = (L, w) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(w, L * 0.45, 0, L); s.quadraticCurveTo(-w, L * 0.45, 0, 0); return s; };
        const leafM = std('#8DB255', { roughness: 0.7 }), veinM = std('#5E8A3A');
        const leaf = (pos, rz, s) => {
          const g = group(dg, pos, [0.2, 0.3, rz]); g.scale.setScalar(s);
          mesh(extrude(leafShape(0.5, 0.2), 0.03, 0.01), leafM, g, [0, -0.25, 0], null, '#4F7A2E');
          mesh(tube([[0, -0.22, 0.02], [0.01, 0, 0.022], [0, 0.2, 0.02]], 0.008, 8, 4), veinM, g);
          return g;
        };
        const items = [];
        items.push(leaf([-1.65, 3.37, 0.3], 0.7, 0.9));
        items.push(leaf([1.3, 3.95, 0.2], -0.5, 0.95));
        items.push(leaf([2.0, 2.75, 0.1], -0.9, 0.85));
        items.push(leaf([2.15, 1.5, 0.2], 1.2, 0.8));
        const petal = group(dg, [-1.95, 1.52, 0.3], [0.3, 0, 0.8]);
        mesh(sphere(0.12, 20, 14), std('#FBF1DE'), petal, null, [0.8, 1.1, 0.25], '#D8B48A');
        items.push(petal);
        const fl = K.flower(dg, [1.7, 3.8, 0.1], 0.5, '#FFFDF6', '#F5A623', 5);
        fl.traverse(o => { if (o.isMesh) K.outline(o, '#D9B48A'); });
        items.push(fl);
        const grassM = std('#79A847', { roughness: 0.8, side: THREE.DoubleSide }), grassM2 = std('#9CC25E', { roughness: 0.8, side: THREE.DoubleSide });
        const tuft = (x, z, fy) => {
          const g = group(dg, [x, 0, z]);
          for (let i = 0; i < 9; i++) {
            const a = -1.0 + i * 0.25, L = 0.45 + K.rand() * 0.35;
            const b = mesh(extrude(leafShape(L, 0.07), 0.015, 0.005), i % 2 ? grassM : grassM2, g, [a * 0.25, 0, (K.rand() - 0.5) * 0.2], null, '#4F7A2E');
            b.rotation.set(0, (K.rand() - 0.5) * 1.2, -a * 0.7);
          }
          mesh(tube([[0, 0, 0.05], [0.02, fy * 0.5, 0.06], [0, fy, 0.08]], 0.015, 10, 5), grassM, g);
          const f = K.flower(g, [0, fy, 0.1], 0.5, '#FFFDF6', '#F5A623', 5);
          f.traverse(o => { if (o.isMesh) K.outline(o, '#D9B48A'); });
          return g;
        };
        tuft(-1.75, 0.3, 0.85); tuft(1.75, 0.3, 0.55);
        items.forEach((o, i) => { o.userData.y0 = o.position.y; });
        K.onTick((t, k) => items.forEach((o, i) => { o.position.y = o.userData.y0 + 0.06 * Math.sin(t * 1.1 + i * 1.3) * k; }));
      }

      /* ---------------- idle: tongue sway ---------------- */
      const tongueG = K.faceG.children.find(o => o.userData.part === 'tongue');
      K.onTick((t, k) => { if (tongueG) tongueG.rotation.z = 0.035 * Math.sin(t * 1.6) * k; });
    },

    action: {
      label: '搖扇', dur: 1.8,
      run(s, p, K) { if (K._fan) K._fan.rotation.z = 0.35 * Math.sin(p * Math.PI * 6) * s; }
    },

    parts: {
      overview: { chip: '全貌', tag: '設計主題', name: '清明七爺・一見發財',
        text: '以台灣廟會裡的七爺謝必安為造型：寫著「一見發財」的白色高帽、垂到胸前的長舌、手中的芭蕉扇與腳上的草鞋。清明是祭祖掃墓、陰陽相通的節氣，帽上的太極徽點出陰陽；米白配柳芽綠的衣袍與身邊的綠葉、白花，則是清明踏青的春意。' },
      face: { chip: '臉部', tag: '貓咪本體', name: '白貓圓臉',
        text: '雪白的圓臉兩頰最寬、外緣帶著一撮撮毛尖，用暖咖啡色線條勾邊；一對深咖啡框的栗棕色大圓眼，瞳孔上方一點白色高光，眼睛上方各有兩撇淡淡的毛流。粉紅小鼻下是兩角上翹的「ω」嘴，雙頰的粉紅腮紅上畫著三條斜線，臉頰外伸出兩根咖啡色細鬍鬚。' },
      tongue: { chip: '長舌', tag: '貓咪本體', name: '七爺長舌', dir: [0.5, 0.1, 1],
        text: '七爺的招牌長舌：「ω」上唇下張開一個小小的紅色嘴巴，舌頭從裡面伸出來，貼著下巴一路垂到胸前的衣領上。舌根顏色較深，中間有一道淺舌溝，舌尖俏皮地勾向畫面右側。' },
      hat: { chip: '高帽', tag: '服飾', name: '一見發財高帽', dir: [0.25, 0.25, 1],
        text: '上窄下寬的米白高帽，高度幾乎和頭一樣，側邊帶著淡粉色陰影。正面金框直牌寫著「一見發財」，兩旁飄著灰紫祥雲與一片小綠葉；帽底是墨橄欖色帽箍，上下壓金邊、兩側金色捲雲紋，正中嵌著黑白太極圓徽。' },
      fan: { chip: '芭蕉扇', tag: '道具', name: '芭蕉扇', dir: [-0.3, 0.1, 1],
        text: '畫面左手斜舉一把綠色芭蕉扇，扇面是圓裂葉的形狀、葉脈呈放射狀，外圈鑲淡金寬邊，金色扇柄斜斜穿過整片扇面。柄頭下繫著綠緞帶結，再垂下一顆翠綠玉珠和金黃流蘇。' },
      robe: { chip: '長袍', tag: '服飾', name: '交領寬袖長袍',
        text: '米白長袍交領右衽，外襟從畫面右肩斜到腰帶左側，衣緣是墨橄欖寬邊加一道淺綠滾邊，腰下再化成一條垂直雙色直條。寬大的袖子垂到膝下，袖身印著柳葉小枝，開口露出淺綠內裡。' },
      belt: { chip: '腰帶', tag: '服飾', name: '腰帶與貓掌墜', dir: [0.5, 0, 1],
        text: '墨橄欖色寬腰帶中間繞一圈扭麻花的金繩，在畫面右前方打成蝴蝶結，垂下一枚印著咖啡色貓掌的圓形金牌，旁邊再掛一顆綠玉珠與金色流蘇。' },
      hem: { chip: '下擺', tag: '服飾', name: '青山雲紋下擺', cam: [0.9, 0.9, 4.2], target: [0.2, 0.5, 0.3],
        text: '下擺印著層層疊疊的淡綠山丘與金色流雲線條，上方點綴幾朵四瓣小綠花，裙襬帶著柔軟的波浪褶，呼應清明時節漫山的新綠。' },
      sandals: { chip: '草鞋', tag: '服飾', name: '金黃草鞋', dir: [0.3, 0.5, 1],
        text: '圓滾滾的白色貓腳踩在金黃草鞋上：鞋底是一圈扭成麻花的粗草繩，腳趾後方橫跨一條拱起的草繩，腳跟再繞一圈繩圈，三顆腳趾頭從鞋帶前圓圓地露出來。' },
      tail: { chip: '尾巴', tag: '貓咪本體', name: '蓬鬆白尾巴', dir: [1, 0.3, -0.8],
        text: '像松鼠一樣蓬鬆的大白尾巴，從畫面右側的袖子後方冒出：下段是細細的尾柄，往上長成一大團圓滾滾的毛球，尾尖再往頭的方向捲下來，像個問號。' },
      pose: { chip: '姿態', tag: '貓咪本體', name: '搖扇招手',
        text: '雙腳站立、身體正面朝前，畫面左手握扇、畫面右手舉在胸前露出白白的掌心，像在跟你打招呼。按下「搖扇」可以看牠搧風。' }
    },
    order: ['overview', 'face', 'tongue', 'hat', 'fan', 'robe', 'belt', 'hem', 'sandals', 'tail', 'pose']
  });
})();
