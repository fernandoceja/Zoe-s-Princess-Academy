// ============================================================================
// Zoe's Starlight Quest — Seashell Cove (K4). An original beach cove: soft sand, a shallow sea with a little
// pier, a tide pool, coral clusters, big shells, six tap surprises and one secret (three shells, small to big).
// Built by world.js ONLY when the cove slot is "open" (worldmap.js isCoveOpen): built for real, or ?preview=cove.
//
// Draw-call budget (rest state), checked by tests/cove_check.mjs:
//   1 static scenery mesh (sand, sea, foam, pier, rocks, corals, shells, chime post: all merged, vertex colours)
//   2 clam (base + lid) · 1 starfish · 1 hermit shell · 1 wind-chime strands · 1 shared bubble/ripple Points
//   = 7 (limit 8). Tap hit-boxes use invisible materials; glow sprites only draw during a reaction.
// Geometry/materials come from world.js's G()/M() caches. No lights, no shadow maps, no new assets.
// All motion is skipped under calmMotion (a tap then only glows, as every other tappable does).
// ============================================================================

const D2R = Math.PI / 180;

// Cove layout, in metres from the cove centre (x east, z south = toward the sea). The entrance (branch path) is to the north.
export const COVE_SEA = { x: 0, z: 16, r: 11 };           // shallow-sea disc; its near edge cuts across the south of the sand
export const COVE_SPOTS = {
  clam: [-3.3, -3.0], pool: [-5.6, 1.6], starfish: [1.4, 2.6], coral: [-1.8, 7.0], hermit: [7.4, 1.8], chime: [-7.6, -4.2],
  shell1: [4.8, -5.2], shell2: [6.6, -3.6], shell3: [8.0, -1.5],   // the secret: tap small, middle, big
};
export const POOL_R = 2.0;

/** True when a cove-local spot is in the sea (or the tide pool): treasures stay on dry sand. */
export function coveWet(lx, lz) {
  if (Math.hypot(lx - COVE_SEA.x, lz - COVE_SEA.z) < COVE_SEA.r + 0.6) return true;
  return Math.hypot(lx - COVE_SPOTS.pool[0], lz - COVE_SPOTS.pool[1]) < POOL_R + 0.6;
}

/** Collects many coloured primitives into ONE BufferGeometry (vertex colours), so a whole prop is one draw call. */
export function makeMerger(THREE) {
  const pos = [], nor = [], col = [];
  const mat = new THREE.Matrix4(), nmat = new THREE.Matrix3(), q = new THREE.Quaternion();
  const e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Color();
  return {
    // add(geometry, colourHex, x, y, z, rotX, rotY, rotZ, scaleX, scaleY, scaleZ). Rotation order: spin about Z, tilt about X, then turn about Y.
    add(geo, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
      e.set(rx, ry, rz, 'YXZ'); q.setFromEuler(e); p.set(x, y, z); s.set(sx, sy, sz);
      mat.compose(p, q, s); nmat.getNormalMatrix(mat);
      const g = geo.index ? geo.toNonIndexed() : geo;
      const gp = g.attributes.position, gn = g.attributes.normal;
      c.setHex(hex);
      for (let i = 0; i < gp.count; i++) {
        v.fromBufferAttribute(gp, i).applyMatrix4(mat); pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(gn, i).applyMatrix3(nmat).normalize(); nor.push(v.x, v.y, v.z);
        col.push(c.r, c.g, c.b);
      }
      if (g !== geo) g.dispose();
    },
    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeBoundingSphere();
      return g;
    },
  };
}

/**
 * Build the cove. env = { THREE, scene, center:{x,z}, G, M, addCollider, addTappable, starGeometry, softDot, calmMotion }.
 * Returns { update(t, dt), wet(worldX, worldZ) }.
 */
export function buildCove(env) {
  const { THREE, scene, center, G, M, addCollider, addTappable, starGeometry, softDot, calmMotion } = env;
  const cx = center.x, cz = center.z;
  const vcMat = M('coveVC', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }));
  const smooth = (x) => x * x * (3 - 2 * x);

  // Shared primitive geometries (from the G() cache, so a reload of the world reuses them)
  const geoDisc = (n) => G('coveDisc' + n, () => new THREE.CircleGeometry(1, n));
  const geoBall = G('coveBall', () => new THREE.SphereGeometry(1, 8, 6));
  const geoRock = G('coveRock', () => new THREE.DodecahedronGeometry(1, 0));
  const geoStem = G('coveStem', () => new THREE.CylinderGeometry(0.55, 1, 1, 6));   // tapered: thin top, thick base
  const geoBox = G('coveBox', () => new THREE.BoxGeometry(1, 1, 1));
  const geoPole = G('covePole', () => new THREE.CylinderGeometry(1, 1, 1, 7));
  const geoCone = G('coveCone', () => new THREE.ConeGeometry(1, 1, 8));
  const geoWedge = (i) => G('coveWedge' + i, () => new THREE.CylinderGeometry(0.6, 0.6, 0.14, 2, 1, false, -0.95 + i * 0.38, 0.38));
  const geoHalfLow = G('coveHalfLow', () => new THREE.SphereGeometry(0.55, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
  const geoHalfTop = G('coveHalfTop', () => new THREE.SphereGeometry(0.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2));

  // A fan-shaped scallop shell standing on the sand: five wedges in two alternating tones give it ridges.
  const scallop = (m, x, z, yaw, s, a, b) => {
    // The fan leans back toward the north at 38 degrees, so the camera (looking north from the south) sees its face.
    for (let i = 0; i < 5; i++) m.add(geoWedge(i), i % 2 ? b : a, x, 0.1 * s, z, -38 * D2R, Math.PI + yaw * 0.4, 0, s, s, s);
    m.add(geoBall, b, x, 0.1 * s, z, 0, 0, 0, 0.12 * s);
  };
  // A pointed spiral conch lying on its side.
  const conch = (m, x, z, yaw, s, a, b) => {
    m.add(geoBall, a, x, 0.36 * s, z, 0, 0, 0, 0.42 * s, 0.38 * s, 0.46 * s);
    m.add(geoCone, b, x, 0.42 * s, z, -70 * D2R, yaw, 0, 0.3 * s, 0.9 * s, 0.3 * s);
    m.add(geoBall, b, x, 0.3 * s, z, 0, 0, 0, 0.2 * s);
  };

  // ---------------------------------------------------------------- tap surprises (own meshes where the part moves)
  const items = {};
  const own = (m) => { const mesh = new THREE.Mesh(m.build(), vcMat); return mesh; };
  const wx = (k) => cx + COVE_SPOTS[k][0], wz = (k) => cz + COVE_SPOTS[k][1];

  // 1. Clam shell that opens to show a pearl (base + lid: 2 meshes). The lid turns about a back hinge.
  const clamBuild = (g) => {
    const base = makeMerger(THREE);
    base.add(geoHalfLow, 0xffd9e6, 0, 0.45, 0, 0, 0, 0, 1.25, 0.9, 1);
    base.add(geoBall, 0xfffaf2, 0, 0.5, 0.02, 0, 0, 0, 0.22);          // the pearl, hidden while the lid is shut
    g.add(own(base));
    const hinge = new THREE.Group(); hinge.position.set(0, 0.45, -0.55); g.add(hinge);
    const lid = makeMerger(THREE);
    lid.add(geoHalfTop, 0xffb3cc, 0, 0, 0.55, 0, 0, 0, 1.25, 0.9, 1);
    hinge.add(own(lid));
    g.userData.hinge = hinge;
    return { glowY: 0.75, hitR: 1.0 };
  };
  items.clam = addTappable(clamBuild, wx('clam'), wz('clam'), 0, 0xfff1d6);
  items.clam.group.rotation.y = 0;   // hinge at the back (north), so the lid swings away from the camera and the pearl shows
  items.clam.dur = 1.8;
  items.clam.react = (it, p) => {
    const open = p >= 1 ? 0 : smooth(Math.min(1, p / 0.2)) * (1 - smooth(Math.max(0, (p - 0.78) / 0.22)));
    it.group.userData.hinge.rotation.x = -2.1 * open;   // swings right back so the pearl shows
    it.glow.position.y = 0.75 + 0.15 * open;
  };

  // 2. Tide pool that ripples (the pool is part of the static scenery; the ripples are the shared Points below).
  items.pool = addTappable(() => ({ glowY: 0.3, hitR: 1.7 }), wx('pool'), wz('pool'), 0, 0xcff7ff);
  items.pool.dur = 1.4;

  // 3. Starfish that wiggles (1 mesh).
  items.starfish = addTappable((g) => {
    const m = makeMerger(THREE);
    const star = G('coveStar', () => starGeometry(0.62, 0.27));
    m.add(star, 0xff9a52, 0, 0.05, 0, -Math.PI / 2);
    m.add(G('coveStarTop', () => starGeometry(0.44, 0.19)), 0xffc27a, 0, 0.1, 0, -Math.PI / 2);
    m.add(geoBall, 0xff8a3d, 0, 0.1, 0, 0, 0, 0, 0.17, 0.12, 0.17);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; m.add(geoBall, 0xfff1cf, Math.sin(a) * 0.36, 0.13, -Math.cos(a) * 0.36, 0, 0, 0, 0.05); }
    g.add(own(m));
    return { glowY: 0.35, hitR: 0.85 };
  }, wx('starfish'), wz('starfish'), 0, 0xffd2a0);
  items.starfish.dur = 1.2;
  items.starfish.react = (it, p) => {
    const f = p >= 1 ? 0 : 1 - p;
    it.group.rotation.y = it.baseYaw + Math.sin(p * Math.PI * 7) * 0.7 * f;
    it.group.position.y = it.baseY + Math.sin(Math.PI * Math.min(1, p * 1.6)) * 0.18 * f;
  };

  // 4. Coral that blows bubbles (coral is static scenery; bubbles are the shared Points).
  items.coral = addTappable(() => ({ glowY: 1.0, hitR: 1.3 }), wx('coral'), wz('coral'), 0, 0xcff7ff);
  items.coral.dur = 1.2;

  // 5. Hermit-crab shell, a little crab peeking out (1 mesh). It scoots with the normal hop and wiggle.
  items.hermit = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoBall, 0xfff0d8, 0, 0.4, -0.05, 0, 0, 0, 0.42, 0.38, 0.46);
    m.add(geoCone, 0xffc9a8, 0, 0.78, -0.14, -28 * D2R, 0, 0, 0.3, 0.56, 0.3);
    m.add(geoBall, 0xffc9a8, 0, 0.52, -0.3, 0, 0, 0, 0.24);
    m.add(geoBall, 0xf08a5d, 0, 0.18, 0.42, 0, 0, 0, 0.22, 0.17, 0.22);                 // the little crab's body
    for (const sx of [-1, 1]) {
      m.add(geoPole, 0xf08a5d, sx * 0.09, 0.36, 0.5, 0, 0, 0, 0.02, 0.2, 0.02);       // eye stalks
      m.add(geoBall, 0x2b2b3b, sx * 0.09, 0.47, 0.5, 0, 0, 0, 0.045);
      m.add(geoBall, 0xf5a07a, sx * 0.27, 0.14, 0.55, 0, 0, 0, 0.1);                    // claws
    }
    g.add(own(m));
    return { glowY: 0.65, hitR: 0.9 };
  }, wx('hermit'), wz('hermit'), 0, 0xffe0c8);

  // 6. Wind chime of shells (post is static scenery; the hanging strands are 1 mesh that swings from the bar).
  const CH = { arm: 0.9, top: 2.3 };   // group-local metres (group is scaled 1.25 like every tappable)
  items.chime = addTappable((g) => {
    const pivot = new THREE.Group(); pivot.position.set(0, CH.top, 0); g.add(pivot);
    const m = makeMerger(THREE);
    m.add(geoPole, 0xb98a5a, 0, 0, 0, 0, 0, Math.PI / 2, 0.035, 0.8, 0.035);         // hanging bar
    const charm = [0xffd0dc, 0xfff0d8, 0xe9d5ff, 0xffc9a8, 0xbfe9ff];
    for (let i = 0; i < 5; i++) {
      const x = -0.32 + i * 0.16, len = 0.5 + 0.16 * (i % 3);
      m.add(geoPole, 0xe8dccb, x, -len / 2, 0, 0, 0, 0, 0.008, len, 0.008);
      m.add(geoBall, charm[i], x, -len - 0.05, 0, 0, 0, 0, 0.1, 0.07, 0.04);
      m.add(geoCone, charm[(i + 2) % 5], x, -len - 0.17, 0, Math.PI, 0, 0, 0.06, 0.12, 0.03);
    }
    pivot.add(own(m));
    g.userData.pivot = pivot;
    return { glowY: 1.9, hitR: 1.0 };
  }, wx('chime'), wz('chime'), 0, 0xfff1d6);
  items.chime.group.rotation.y = 0;
  items.chime.dur = 2.0;
  items.chime.react = (it, p) => {
    const f = p >= 1 ? 0 : (1 - p) * (1 - p);
    it.group.userData.pivot.rotation.z = Math.sin(p * Math.PI * 9) * 0.5 * f;
    it.group.userData.pivot.rotation.x = Math.sin(p * Math.PI * 6 + 1) * 0.18 * f;
  };
  const idleChime = items.chime.group.userData.pivot;

  // Secret: three shells, small to big (world.js calls onSecretTap('shell-N'); the shells themselves are static scenery).
  const SHELL_SIZE = { shell1: 0.95, shell2: 1.4, shell3: 2.0 };
  ['shell1', 'shell2', 'shell3'].forEach((k, i) => {
    items[k] = addTappable(() => ({ glowY: 0.3 + 0.25 * SHELL_SIZE[k], hitR: 0.55 + 0.2 * SHELL_SIZE[k] }), wx(k), wz(k), 0, 0xffe3ef, 'shell-' + (i + 1));
  });
  for (const it of Object.values(items)) { it.baseYaw = it.group.rotation.y; }

  // ---------------------------------------------------------------- bubbles + ripples (one shared Points, 30 dots)
  const FX_N = 30, RIPPLE_DOTS = 10; // dots 0-19 = two ripple rings, 20-29 = bubbles
  const fxPos = new Float32Array(FX_N * 3).fill(-50);
  const fxCol = new Float32Array(FX_N * 3);
  const fxGeo = new THREE.BufferGeometry();
  fxGeo.setAttribute('position', new THREE.BufferAttribute(fxPos, 3));
  fxGeo.setAttribute('color', new THREE.BufferAttribute(fxCol, 3));
  const fx = new THREE.Points(fxGeo, new THREE.PointsMaterial({
    map: softDot, size: 0.34, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  fx.frustumCulled = false; fx.visible = false;
  scene.add(fx);
  let rippleT = -1, bubbleT = -1;
  items.pool.onTap = () => { rippleT = 0; fx.visible = true; };
  items.coral.onTap = () => { bubbleT = 0; fx.visible = true; };
  const park = (i) => { fxPos[i * 3 + 1] = -50; fxCol[i * 3] = fxCol[i * 3 + 1] = fxCol[i * 3 + 2] = 0; };
  const put = (i, x, y, z, k) => { fxPos[i * 3] = x; fxPos[i * 3 + 1] = y; fxPos[i * 3 + 2] = z; fxCol[i * 3] = 0.75 * k; fxCol[i * 3 + 1] = 0.97 * k; fxCol[i * 3 + 2] = k; };
  const poolX = wx('pool'), poolZ = wz('pool'), coralX = wx('coral'), coralZ = wz('coral');

  function update(t, dt) {
    if (calmMotion) return; // calm motion: taps glow only; nothing here moves
    // Gentle idle sway of the wind chime (only while it is not being tapped)
    if (items.chime.t < 0) idleChime.rotation.z = Math.sin(t * 1.3) * 0.05;
    if (!fx.visible) return;
    if (rippleT >= 0) {
      rippleT += dt;
      for (let ring = 0; ring < 2; ring++) {
        const pt = (rippleT - ring * 0.3) / 1.0;
        for (let d = 0; d < RIPPLE_DOTS; d++) {
          const i = ring * RIPPLE_DOTS + d;
          if (pt <= 0 || pt >= 1) { park(i); continue; }
          const a = (d / RIPPLE_DOTS) * Math.PI * 2, r = 0.35 + 1.5 * pt;
          put(i, poolX + Math.cos(a) * r, 0.14, poolZ + Math.sin(a) * r, 1 - pt);
        }
      }
      if (rippleT > 1.4) { rippleT = -1; for (let i = 0; i < 2 * RIPPLE_DOTS; i++) park(i); }
    }
    if (bubbleT >= 0) {
      bubbleT += dt;
      for (let b = 0; b < 10; b++) {
        const i = 2 * RIPPLE_DOTS + b, pt = (bubbleT - b * 0.09) / 1.2;
        if (pt <= 0 || pt >= 1) { park(i); continue; }
        put(i, coralX + Math.sin(b * 2.1 + pt * 5) * 0.35, 0.9 + pt * 2.4, coralZ + Math.cos(b * 1.7) * 0.3, 1 - pt * pt);
      }
      if (bubbleT > 2.2) { bubbleT = -1; for (let i = 2 * RIPPLE_DOTS; i < FX_N; i++) park(i); }
    }
    fxGeo.attributes.position.needsUpdate = true; fxGeo.attributes.color.needsUpdate = true;
    if (rippleT < 0 && bubbleT < 0) fx.visible = false;
  }

  // ---------------------------------------------------------------- static scenery (ONE merged mesh)
  const m = makeMerger(THREE);
  const L = (k) => COVE_SPOTS[k];
  const flat = -Math.PI / 2;
  // Ground: sand disc over the path's end, then the sea (shallow, deep), foam on the near shore, the tide pool.
  m.add(geoDisc(48), 0xf8e7c0, 0, 0.03, 0, flat, 0, 0, 10.5);
  m.add(G('coveDisc56', () => new THREE.CircleGeometry(1, 56)), 0x8fe0da, COVE_SEA.x, 0.04, COVE_SEA.z, flat, 0, 0, COVE_SEA.r);
  m.add(geoDisc(40), 0x5fc3d6, 0, 0.05, COVE_SEA.z + 1.5, flat, 0, 0, 7.5);
  m.add(G('coveFoam', () => new THREE.RingGeometry(10.5, 11.3, 40, 1, Math.PI / 2 - 0.85, 1.7)), 0xffffff, COVE_SEA.x, 0.045, COVE_SEA.z, flat);
  m.add(geoDisc(28), 0x7fd8e6, L('pool')[0], 0.05, L('pool')[1], flat, 0, 0, POOL_R);
  m.add(geoDisc(28), 0xc9f3f4, L('pool')[0] - 0.5, 0.06, L('pool')[1] - 0.4, flat, 0, 0, 0.8);   // a lighter shine on the water
  for (let i = 0; i < 9; i++) {                                                                   // rim rocks around the pool
    const a = i * Math.PI * 2 / 9 + 0.3, r = POOL_R + 0.15 + (i % 2) * 0.12, sz = 0.34 + (i % 3) * 0.08;
    m.add(geoRock, i % 2 ? 0xc9b8ae : 0xe3cfc4, L('pool')[0] + Math.cos(a) * r, sz * 0.5, L('pool')[1] + Math.sin(a) * r, 0, i, 0, sz, sz * 0.7, sz);
  }
  // Little pier: planks on posts, running out over the shallows.
  const PIER_X = 3.7, PIER_Z0 = 5.2, PIER_Z1 = 13.0;
  for (let z = PIER_Z0, i = 0; z < PIER_Z1; z += 0.72, i++) {
    m.add(geoBox, i % 2 ? 0xd8a874 : 0xc89a6a, PIER_X + (i % 3 - 1) * 0.02, 0.09, z, 0, (i % 3 - 1) * 0.02, 0, 2.1, 0.07, 0.62);
  }
  for (const pz of [PIER_Z0 + 0.2, PIER_Z0 + 3.2, PIER_Z0 + 6.2]) for (const sx of [-1, 1]) {
    const px = PIER_X + sx * 1.15;
    m.add(geoPole, 0x9b6f46, px, 0.4, pz, 0, 0, 0, 0.14, 0.8, 0.14);
    addCollider(cx + px, cz + pz, 0.3);
  }
  // Coral clusters (stems + knobs + a mound). Three decorative, plus the bubble coral at its tap spot.
  const coral = (x, z, s, pal, collide = true) => {
    m.add(geoBall, pal[3], x, 0.1 * s, z, 0, 0, 0, 0.9 * s, 0.35 * s, 0.9 * s);
    const arms = [[-0.45, 0, 0.9], [0.0, -0.3, 1.25], [0.4, 0.1, 1.0], [-0.1, 0.4, 0.75], [0.15, 0.05, 0.55]];
    arms.forEach(([ax, az, h], i) => {
      const hh = h * s * 1.3;
      m.add(geoStem, pal[i % 3], x + ax * s, hh / 2, z + az * s, az * 0.4, 0, -ax * 0.5, 0.2 * s, hh, 0.2 * s);
      m.add(geoBall, pal[(i + 1) % 3], x + ax * s - ax * 0.25 * s, hh + 0.04 * s, z + az * s, 0, 0, 0, 0.2 * s);
    });
    if (collide) addCollider(cx + x, cz + z, 1.0 * s);
  };
  const PAL_A = [0xff8fa3, 0xffa66b, 0xff6f91, 0xe9a0b4], PAL_B = [0xc89bf0, 0xff8fa3, 0xb084e0, 0xd2b3f2], PAL_C = [0xffa66b, 0xffd06b, 0xff8a5c, 0xf0b27a];
  coral(7.6, 8.4, 1.0, PAL_B);
  coral(-6.0, 7.8, 0.9, PAL_C);
  coral(-0.8, 10.0, 0.8, PAL_A);
  coral(L('coral')[0], L('coral')[1], 1.2, PAL_A);           // the bubble coral (tap it)
  // Big decorative shells (solid) and the three secret shells (small to big; tapping them in order is the secret).
  scallop(m, -9.0, -1.4, 0.6, 2.0, 0xffb3cc, 0xffd9e6); addCollider(cx - 9.0, cz - 1.4, 0.8);
  conch(m, 3.4, -3.0, 2.2, 1.6, 0xfff0d8, 0xffc9a8); addCollider(cx + 3.4, cz - 3.0, 0.7);
  scallop(m, -2.2, 4.4, -0.4, 1.7, 0xe9d5ff, 0xcdb4f0); addCollider(cx - 2.2, cz + 4.4, 0.7);
  conch(m, 8.8, 4.2, -0.9, 1.4, 0xffd9e6, 0xffb3cc); addCollider(cx + 8.8, cz + 4.2, 0.7);
  const tint = [[0xffd9e6, 0xffeef5], [0xffc9a8, 0xffe0cc], [0xe0c8ff, 0xf3e8ff]];
  ['shell1', 'shell2', 'shell3'].forEach((k, i) => {
    const g = items[k].group.position;
    scallop(m, g.x - cx, g.z - cz, 0.5 + i * 0.4, SHELL_SIZE[k], tint[i][0], tint[i][1]);
  });
  // Chime post and arm (driftwood), sized for the 1.25 group scale.
  {
    const g = items.chime.group.position, S = 1.25, ox = g.x - cx - CH.arm * S, oz = g.z - cz;
    m.add(geoPole, 0xa98a6b, ox, CH.top * S / 2 + 0.05, oz, 0, 0, 0.04, 0.1, CH.top * S + 0.1, 0.1);
    m.add(geoPole, 0xa98a6b, ox + CH.arm * S / 2, CH.top * S + 0.05, oz, 0, 0, Math.PI / 2, 0.06, CH.arm * S, 0.06);
    m.add(geoBall, 0x8f7356, ox, 0.12, oz, 0, 0, 0, 0.3, 0.2, 0.3);
    addCollider(cx + ox, cz + oz, 0.35);
  }
  // A few loose pebbles and tiny shells on the sand for texture.
  for (let i = 0; i < 14; i++) {
    const a = i * 2.399, r = 3.5 + ((i * 37) % 60) / 10;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9 - 1;
    if (coveWet(x, z) || Math.hypot(x, z) > 9.6) continue;
    const sz = 0.12 + (i % 3) * 0.05;
    m.add(geoRock, [0xe7d5c4, 0xd9c2b0, 0xfff0e0][i % 3], x, sz * 0.4, z, 0, i, 0, sz, sz * 0.6, sz);
  }
  const scenery = new THREE.Mesh(m.build(), vcMat);
  scenery.position.set(cx, 0, cz);
  scene.add(scenery);

  return { update, wet: (x, z) => coveWet(x - cx, z - cz) };
}
