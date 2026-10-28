// ============================================================================
// Zoe's Starlight Quest — Moonlit Palace Garden (K8). An original night garden: a deep teal-and-indigo lawn, a reflecting
// pool with stepping tiles and a moon on the water, a small fountain, a vine arch and a pergola with a little bench, glowing
// lanterns, night-blooming flowers, low patterned hedges and a moon-gazing platform with a crescent-moon sculpture.
// Six tap surprises and one secret (three story lanterns: a seed, a sprout, a flower: first, next, last).
// Built by world.js ONLY when the garden slot is "open" (worldmap.js isGardenOpen): built for real (K9), or ?preview=garden.
//
// The scene lighting is shared daylight, so "night" is done with colour: indigo/teal ground, pale moon-white flowers and warm,
// glowing (unlit) lanterns with soft halos. No lights, no shadow maps, no new assets.
//
// Draw-call budget (rest state), checked by tests/garden_check.mjs:
//   1 static scenery mesh (ground, paving, pool, fountain basin, arch, pergola, bench, hedges, platform, lantern posts, flowers: merged)
//   1 glowing parts mesh (lantern bulbs, story pictures, crescent moon: unlit vertex colours, so they glow)
//   1 fountain jet · 1 night-flower bed (blooms open) · 1 wind chime · 1 moon reflection on the pool
//   1 shared glow Points (lantern halos, fireflies, fountain bubbles, flower sparkles, pool ripples, chime notes)
//   = 7 (limit 8). Tap hit-boxes use invisible materials; glow sprites only draw during a reaction.
// Geometry/materials come from world.js's G()/M() caches (same keys as the cove where the shape is the same).
// All motion is skipped under calmMotion (a tap then only glows; the halos stay still).
// ============================================================================

import { makeMerger } from './cove.js?v=20261028r3';

// Garden layout, in metres from the garden centre (x east, z south). The entrance (branch path) is to the south, so the
// camera, which looks north, sees the pool and fountain open out in front of the path.
export const GARDEN_R = 9.3;   // the outer low hedge runs round at this radius (open at the south entrance)
export const GARDEN_SPOTS = {
  lanterns: [-3.9, 1.9],   // tap: the tall star lantern; every lantern glows in a wave
  fountain: [0, -5.3],     // tap: the fountain bubbles up
  flowers: [6.2, -1.3],    // tap: night flowers open
  chime: [-5.3, -1.8],     // tap: wind chime under the pergola
  pool: [0, -0.2],         // tap: the pool ripples and the moon wobbles
  hedge: [-5.6, 4.2],      // tap: the patterned hedge lets fireflies out
  story1: [3.3, 4.4], story2: [5.2, 3.9], story3: [7.0, 3.1],   // the secret: seed, sprout, flower (first, next, last)
};
export const GARDEN_STATICS = {
  pergola: [-6.0, -1.8], platform: [4.3, -5.6], moon: [4.3, -6.5], archL: [-1.4, 9.3], archR: [3.0, 9.3],
};
export const POOL = { x: 0, z: -0.2, rx: 3.0, rz: 2.3 };
export const FOUNTAIN_R = 1.4;
// Stepping tiles across the pool, from the south bank to the north bank.
export const POOL_TILES = [[0.1, 1.45], [-0.25, 0.45], [0.2, -0.55], [-0.1, -1.6]];
// The three secret lanterns. Tap them in this order: a seed, then a sprout, then a flower (first, next, last).
export const STORY_LANTERNS = [
  { key: 'story1', thing: 'seed', word: 'first' },
  { key: 'story2', thing: 'sprout', word: 'next' },
  { key: 'story3', thing: 'flower', word: 'last' },
];
// Lantern posts (local x, z, bulb height). They glow with a soft halo; the tall star lantern is the tap one.
export const LANTERN_POSTS = [
  { x: -5.6, z: 4.2, h: 1.1 }, { x: -3.9, z: 1.9, h: 2.1, tall: true }, { x: -3.5, z: -2.3, h: 1.4 },
  { x: 3.5, z: 1.9, h: 1.4 }, { x: 3.5, z: -2.3, h: 1.4 }, { x: -2.0, z: -7.4, h: 1.4 }, { x: 2.0, z: -7.4, h: 1.4 },
];

/** True when a garden-local spot is in the reflecting pool or the fountain basin: treasures stay on dry ground. */
export function gardenWet(lx, lz) {
  if (((lx - POOL.x) / (POOL.rx + 0.4)) ** 2 + ((lz - POOL.z) / (POOL.rz + 0.4)) ** 2 < 1) return true;
  return Math.hypot(lx - GARDEN_SPOTS.fountain[0], lz - GARDEN_SPOTS.fountain[1]) < FOUNTAIN_R + 0.5;
}

/**
 * Build the garden. env = { THREE, scene, center:{x,z}, pad?:{x,z}, G, M, addCollider, addTappable, starGeometry, softDot, calmMotion }.
 * Returns { update(t, dt), wet(worldX, worldZ), dry(worldX, worldZ) }.
 */
export function buildGarden(env) {
  const { THREE, scene, center, G, M, addCollider, addTappable, softDot, calmMotion } = env;
  const cx = center.x, cz = center.z;
  const padL = env.pad ? { x: env.pad.x - cx, z: env.pad.z - cz } : { x: 0.54, z: 6.48 };   // the princess's pad, garden-local
  const axis = Math.atan2(padL.x, padL.z);   // the entrance path runs from the garden centre toward the pad (nearly due south)
  const vcMat = M('coveVC', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }));
  // Unlit vertex-colour material: lantern glass, story pictures, crescent moon and night blooms keep their colour in the shared daylight.
  const glowMat = M('gardenGlow', () => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));

  const geoDisc = (n) => G('coveDisc' + n, () => new THREE.CircleGeometry(1, n));
  const geoBall = G('coveBall', () => new THREE.SphereGeometry(1, 8, 6));
  const geoPole = G('covePole', () => new THREE.CylinderGeometry(1, 1, 1, 7));
  const geoCone = G('coveCone', () => new THREE.ConeGeometry(1, 1, 8));
  const geoBox = G('coveBox', () => new THREE.BoxGeometry(1, 1, 1));
  const geoRing = (a, b, n) => G(`gardenRing${a}_${b}_${n}`, () => new THREE.RingGeometry(a, b, n));
  const geoArc = G('gardenArc', () => new THREE.TorusGeometry(1, 0.07, 5, 16, Math.PI));   // half ring for the vine arch
  const geoCrescent = G('gardenCrescent', () => {   // ☾ : an outer circle with a bite taken out of it (horns open toward +x)
    const R = 1, d = 0.45, r = 0.82;
    const px = (R * R - r * r + d * d) / (2 * d), py = Math.sqrt(R * R - px * px);
    const a1 = Math.atan2(py, px), a2 = Math.atan2(py, px - d);
    const sh = new THREE.Shape();
    sh.absarc(0, 0, R, a1, Math.PI * 2 - a1, false);
    sh.absarc(d, 0, r, -a2, a2 - Math.PI * 2, true);
    return new THREE.ShapeGeometry(sh, 20);
  });

  const items = {};
  const own = (m, mat) => new THREE.Mesh(m.build(), mat || vcMat);
  const wx = (k) => cx + GARDEN_SPOTS[k][0], wz = (k) => cz + GARDEN_SPOTS[k][1];
  const TG = 1.25;   // addTappable scales every tappable group by 1.25: own meshes are drawn a little smaller to land at the intended size

  const COL = {
    ground: 0x3d6a9c, groundEdge: 0x30598a, paving: 0x9fb0e6, paving2: 0x8c9fdc, stone: 0xc9d0f2, stoneDark: 0x7f8fcf,
    water: 0x2c55b8, waterLight: 0x4a78d8, hedgeA: 0x2a9a82, hedgeB: 0x36b08f, pearl: 0xe9eeff, vine: 0x2f9d6a, vine2: 0x45b87c,
    post: 0x5a67b3, moonWhite: 0xf4f2ff, lilac: 0xd3c8ff, soil: 0x3a3170, light: 0x6f9bd0,
  };

  // ---------------------------------------------------------------- shared glow Points
  // Slots: lantern halos (always on, soft), then the effects (parked off-screen until a tap starts them).
  const HALOS = [];   // { x, y, z, base, tint }
  LANTERN_POSTS.forEach((l) => HALOS.push({ x: cx + l.x, y: l.h + 0.1, z: cz + l.z, base: l.tall ? 0.7 : 0.5, tint: [1, 0.78, 0.4] }));
  HALOS.push({ x: cx + 0.8, y: 1.95, z: cz + 9.3, base: 0.5, tint: [1, 0.78, 0.4] });   // the lantern hanging in the vine arch
  const STORY_AT = HALOS.length;
  STORY_LANTERNS.forEach((s) => HALOS.push({ x: wx(s.key), y: 1.45, z: wz(s.key), base: 0.5, tint: [1, 0.85, 0.5] }));
  const N_H = HALOS.length;
  const FLY_AT = N_H, N_FLY = 8, BUB_AT = FLY_AT + N_FLY, N_BUB = 8, SPK_AT = BUB_AT + N_BUB, N_SPK = 6;
  const RIP_AT = SPK_AT + N_SPK, N_RIP = 16, NOTE_AT = RIP_AT + N_RIP, N_NOTE = 4, FX_N = NOTE_AT + N_NOTE;
  const fxPos = new Float32Array(FX_N * 3).fill(-50);
  const fxCol = new Float32Array(FX_N * 3);
  const fxGeo = new THREE.BufferGeometry();
  fxGeo.setAttribute('position', new THREE.BufferAttribute(fxPos, 3));
  fxGeo.setAttribute('color', new THREE.BufferAttribute(fxCol, 3));
  const fx = new THREE.Points(fxGeo, new THREE.PointsMaterial({
    map: softDot, size: 1.5, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  fx.frustumCulled = false;
  scene.add(fx);
  const park = (i) => { fxPos[i * 3 + 1] = -50; fxCol[i * 3] = fxCol[i * 3 + 1] = fxCol[i * 3 + 2] = 0; };
  const put = (i, x, y, z, k, r, g, b) => { fxPos[i * 3] = x; fxPos[i * 3 + 1] = y; fxPos[i * 3 + 2] = z; fxCol[i * 3] = r * k; fxCol[i * 3 + 1] = g * k; fxCol[i * 3 + 2] = b * k; };
  HALOS.forEach((h, i) => put(i, h.x, h.y, h.z, h.base, h.tint[0], h.tint[1], h.tint[2]));   // soft halos at rest (still under calm motion)
  for (let i = FLY_AT; i < FX_N; i++) park(i);
  const bump = (x) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x));
  let wave = -1, flyT = -1, bubT = -1, spkT = -1, ripT = -1, noteT = -1;
  const storyGlow = [0, 0, 0];   // seconds of extra glow left on each story lantern (they light up when tapped)

  // ---------------------------------------------------------------- tap surprises
  // 1. Lantern wave: the tall star lantern is tapped; every lantern glows brighter in a wave from the gate to the far end.
  items.lanterns = addTappable(() => ({ glowY: 2.0, hitR: 1.15 }), wx('lanterns'), wz('lanterns'), 0, 0xffe2a0);
  items.lanterns.dur = 2.6;
  items.lanterns.onTap = () => { wave = 0; };

  // 2. Fountain that bubbles up: a jet of water (one mesh, grows tall) + bubbles in the shared Points.
  items.fountain = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoPole, 0xbfe0ff, 0, 0.3, 0, 0, 0, 0, 0.1, 0.6, 0.1);               // thin water column (grows)
    m.add(geoBall, 0xe6f4ff, 0, 0.66, 0, 0, 0, 0, 0.19, 0.16, 0.19);           // splash on top
    for (let k = 0; k < 6; k++) {                                              // little arcs falling back
      const a = k * Math.PI / 3;
      m.add(geoBall, 0xcfe9ff, Math.cos(a) * 0.3, 0.5, Math.sin(a) * 0.3, 0, 0, 0, 0.06, 0.09, 0.06);
    }
    const jet = own(m); jet.position.y = 0.95 / TG; g.add(jet);   // base of the jet sits on the upper bowl
    return { glowY: 1.4, hitR: 1.25 };
  }, wx('fountain'), wz('fountain'), 0, 0xbfe3ff);
  items.fountain.group.rotation.y = 0;
  items.fountain.dur = 2.2;
  items.fountain.react = (it, p) => {
    const jet = it.group.children[0];
    if (p >= 1) { jet.scale.set(1, 1, 1); return; }
    const up = bump(Math.min(1, p / 0.9));
    jet.scale.set(1 + 0.25 * up, 1 + 1.6 * up + 0.12 * Math.sin(p * Math.PI * 14) * up, 1 + 0.25 * up);
  };
  items.fountain.onTap = () => { bubT = 0; };

  // 3. Night flowers that open: five moon-white blooms on stems (one mesh, glowing). They swell open wide and glitter.
  items.flowers = addTappable((g) => {
    const m = makeMerger(THREE);
    [[0, 0, 0.95], [0.55, 0.3, 0.7], [-0.5, 0.35, 0.78], [0.3, -0.55, 0.85], [-0.35, -0.5, 0.65]].forEach(([ox, oz, h], f) => {
      m.add(geoPole, 0x2c8c63, ox, h / 2, oz, 0, 0, 0, 0.03, h, 0.03);                      // stem
      m.add(geoBall, 0x3fae7a, ox + 0.1, h * 0.45, oz, 0, 0, 0.6, 0.12, 0.035, 0.05);       // leaf
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3 + f;
        m.add(geoBall, k % 2 ? COL.moonWhite : COL.lilac, ox + Math.cos(a) * 0.14, h + 0.05, oz + Math.sin(a) * 0.14, 0.5, -a, 0, 0.17, 0.045, 0.085);
      }
      m.add(geoBall, 0xffe27a, ox, h + 0.08, oz, 0, 0, 0, 0.065);
    });
    g.add(own(m, glowMat));
    return { glowY: 0.9, hitR: 1.2 };
  }, wx('flowers'), wz('flowers'), 0, 0xe6dcff);
  items.flowers.group.rotation.y = 0;
  items.flowers.dur = 2.4;
  items.flowers.react = (it, p) => {
    const bed = it.group.children[0];
    if (p >= 1) { bed.scale.set(1, 1, 1); return; }
    const open = bump(Math.min(1, p / 0.85));
    bed.scale.set(1 + 0.4 * open, 1 - 0.1 * open + 0.1 * open * Math.sin(p * Math.PI * 6), 1 + 0.4 * open);
    bed.rotation.y = Math.sin(p * Math.PI * 2) * 0.25 * open;
  };
  items.flowers.onTap = () => { spkT = 0; };

  // 4. Wind chime under the pergola: five tubes that swing and ring (one mesh hung from a rafter; it swings about the top).
  items.chime = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoPole, 0xf1dca0, 0, 0, 0, 0, 0, 0, 0.16, 0.035, 0.16);                          // top plate
    [[-0.12, 0.7], [0.0, 0.52], [0.12, 0.78], [0.0, 0.6]].forEach(([ox, len], i) => {
      const oz = i === 3 ? 0.12 : (i === 1 ? -0.1 : 0);
      m.add(geoPole, i % 2 ? 0xdcd7ff : 0xf4e4b0, ox, -0.04 - len / 2, oz, 0, 0, 0, 0.032, len, 0.032);   // tubes
      m.add(geoPole, 0xb9b4e8, ox, -0.02, oz, 0, 0, 0, 0.007, 0.07, 0.007);
    });
    m.add(geoBall, 0xf1dca0, 0, -0.5, 0, 0, 0, 0, 0.055);                                    // clapper
    m.add(geoCone, 0xcfc5ff, 0, -0.9, 0, Math.PI, 0, 0, 0.1, 0.12, 0.1);                     // wind catcher
    const chime = own(m); chime.position.y = 2.35 / TG; g.add(chime);
    return { glowY: 1.6, hitR: 0.95 };
  }, wx('chime'), wz('chime'), 0, 0xfff0c0);
  items.chime.group.rotation.y = 0;
  items.chime.dur = 2.4;
  items.chime.react = (it, p) => {
    const c = it.group.children[0], f = p >= 1 ? 0 : (1 - p) * (1 - p);
    c.rotation.z = Math.sin(p * Math.PI * 9) * 0.34 * f;
    c.rotation.x = Math.sin(p * Math.PI * 7 + 1) * 0.18 * f;
  };
  items.chime.onTap = () => { noteT = 0; };

  // 5. Reflecting pool: ripples spread over the water and the moon's reflection wobbles (reflection = one mesh).
  items.pool = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoDisc(20), 0xaec4f5, -0.5, 0.09, -0.3, -Math.PI / 2, 0, 0, 1.0, 1.0, 1);            // a soft halo round the moon (drawn under)
    m.add(geoDisc(24), 0xfff6d8, -0.5, 0.095, -0.3, -Math.PI / 2, 0, 0, 0.7, 0.7, 1);           // the moon on the water
    for (const [ox, oz, s] of [[1.2, 0.5, 0.07], [0.6, -0.7, 0.05], [-1.5, 0.4, 0.06], [1.8, -0.4, 0.045]]) m.add(geoDisc(8), 0xffffff, ox, 0.1, oz, -Math.PI / 2, 0, 0, s, s, 1);   // star glints
    const refl = own(m, glowMat); g.add(refl);
    return { glowY: 0.3, hitR: 2.1 };
  }, wx('pool'), wz('pool'), 0, 0xdce8ff);
  items.pool.group.rotation.y = 0;
  items.pool.dur = 2.2;
  items.pool.react = (it, p) => {
    const refl = it.group.children[0];
    if (p >= 1) { refl.scale.set(1, 1, 1); refl.position.set(0, 0, 0); return; }
    const f = 1 - p;
    refl.scale.set(1 + 0.18 * Math.sin(p * Math.PI * 11) * f, 1, 1 + 0.18 * Math.sin(p * Math.PI * 9 + 1) * f);   // the reflection wobbles
    refl.position.x = Math.sin(p * Math.PI * 13) * 0.05 * f;
  };
  items.pool.onTap = () => { ripT = 0; };

  // 6. Patterned hedge: fireflies drift out of the leaves (shared Points only; the hedge itself is static scenery).
  items.hedge = addTappable(() => ({ glowY: 0.8, hitR: 1.6 }), wx('hedge'), wz('hedge'), 0, 0xe8ffb0);
  items.hedge.dur = 3.4;
  items.hedge.onTap = () => { flyT = 0; };

  // Secret: three story lanterns with pictures (seed, sprout, flower). world.js calls onSecretTap('story-N'); each lantern
  // also lights up when tapped, so the little story shines in order.
  STORY_LANTERNS.forEach((s, i) => {
    items[s.key] = addTappable(() => ({ glowY: 1.25, hitR: 0.8 }), wx(s.key), wz(s.key), 0, 0xfff1c8, 'story-' + (i + 1));
    items[s.key].onTap = () => { storyGlow[i] = 1.4; };
  });
  for (const it of Object.values(items)) { it.baseYaw = it.group.rotation.y; }

  const fountainX = wx('fountain'), fountainZ = wz('fountain'), flowerX = wx('flowers'), flowerZ = wz('flowers');
  const poolX = wx('pool'), poolZ = wz('pool'), chimeX = wx('chime'), chimeZ = wz('chime'), hedgeX = wx('hedge'), hedgeZ = wz('hedge');
  const waveOrder = HALOS.map((h, i) => i).sort((a, b) => HALOS[b].z - HALOS[a].z);   // gate first, far end last
  const waveRank = []; waveOrder.forEach((hi, r) => { waveRank[hi] = r; });

  function update(t, dt) {
    if (calmMotion) return; // calm motion: taps glow only; nothing here moves
    // Halos: a very slow, gentle flicker; the lantern wave and the story-lantern lights ride on top.
    let pulse = 0;
    if (wave >= 0) { wave += dt; if (wave > N_H * 0.1 + 0.9) wave = -1; }
    for (let i = 0; i < N_H; i++) {
      const h = HALOS[i];
      let k = h.base * (1 + 0.1 * Math.sin(t * 1.3 + i * 1.7));
      if (wave >= 0) { const w = bump((wave - waveRank[i] * 0.1) / 0.7); k += 0.75 * w; pulse = Math.max(pulse, w); }
      if (i >= STORY_AT) { const s = storyGlow[i - STORY_AT]; if (s > 0) k += 0.8 * Math.min(1, s); }
      put(i, h.x, h.y, h.z, k, h.tint[0], h.tint[1], h.tint[2]);
    }
    for (let s = 0; s < 3; s++) if (storyGlow[s] > 0) storyGlow[s] = Math.max(0, storyGlow[s] - dt);
    glowMat.color.setScalar(0.88 + 0.12 * pulse + 0.04 * Math.sin(t * 1.3));
    if (flyT >= 0) {
      flyT += dt;
      for (let i = 0; i < N_FLY; i++) {
        const pt = (flyT - i * 0.22) / 1.7;
        if (pt <= 0 || pt >= 1) { park(FLY_AT + i); continue; }
        const a = i * 0.9 + pt * 2.2, r = 1.2 + pt * 1.6 + 0.3 * Math.sin(pt * 9 + i);
        put(FLY_AT + i, hedgeX + Math.cos(a) * r, 0.5 + pt * 1.1 + 0.15 * Math.sin(pt * 12 + i), hedgeZ + Math.sin(a) * r,
          bump(pt) * (0.6 + 0.4 * Math.sin(pt * 30 + i * 2)), 0.85, 1, 0.4);
      }
      if (flyT > N_FLY * 0.22 + 1.8) { flyT = -1; for (let i = 0; i < N_FLY; i++) park(FLY_AT + i); }
    }
    if (bubT >= 0) {
      bubT += dt;
      for (let i = 0; i < N_BUB; i++) {
        const pt = (bubT - i * 0.15) / 1.0;
        if (pt <= 0 || pt >= 1) { park(BUB_AT + i); continue; }
        const a = i * 2.4, r = 0.2 + 0.7 * pt;
        put(BUB_AT + i, fountainX + Math.cos(a) * r, 0.9 + Math.sin(Math.min(1, pt * 1.3) * Math.PI * 0.6) * 1.5, fountainZ + Math.sin(a) * r, bump(pt), 0.7, 0.9, 1);
      }
      if (bubT > N_BUB * 0.15 + 1.1) { bubT = -1; for (let i = 0; i < N_BUB; i++) park(BUB_AT + i); }
    }
    if (spkT >= 0) {
      spkT += dt;
      for (let i = 0; i < N_SPK; i++) {
        const pt = (spkT - i * 0.2) / 1.0;
        if (pt <= 0 || pt >= 1) { park(SPK_AT + i); continue; }
        const a = i * 1.05, r = 0.3 + 0.55 * (i % 3) / 2;
        put(SPK_AT + i, flowerX + Math.cos(a) * r, 0.9 + pt * 0.9, flowerZ + Math.sin(a) * r, bump(pt) * (0.7 + 0.3 * Math.sin(pt * 40)), 0.9, 0.85, 1);
      }
      if (spkT > N_SPK * 0.2 + 1.1) { spkT = -1; for (let i = 0; i < N_SPK; i++) park(SPK_AT + i); }
    }
    if (ripT >= 0) {
      ripT += dt;
      for (let ring = 0; ring < 2; ring++) {
        const pt = (ripT - ring * 0.45) / 1.3;
        for (let d = 0; d < 8; d++) {
          const i = RIP_AT + ring * 8 + d;
          if (pt <= 0 || pt >= 1) { park(i); continue; }
          const a = (d / 8) * Math.PI * 2 + ring * 0.4, e = 0.4 + pt * 0.95;
          put(i, poolX + Math.cos(a) * POOL.rx * e, 0.12, poolZ + Math.sin(a) * POOL.rz * e, (1 - pt) * 0.9, 0.8, 0.92, 1);
        }
      }
      if (ripT > 0.45 + 1.4) { ripT = -1; for (let i = RIP_AT; i < NOTE_AT; i++) park(i); }
    }
    if (noteT >= 0) {
      noteT += dt;
      for (let i = 0; i < N_NOTE; i++) {
        const pt = (noteT - i * 0.3) / 1.1;
        if (pt <= 0 || pt >= 1) { park(NOTE_AT + i); continue; }
        put(NOTE_AT + i, chimeX + (i - 1.5) * 0.35 + Math.sin(pt * 6 + i) * 0.15, 1.5 + pt * 1.1, chimeZ + 0.3, bump(pt), 1, 0.92, 0.6);
      }
      if (noteT > N_NOTE * 0.3 + 1.2) { noteT = -1; for (let i = NOTE_AT; i < FX_N; i++) park(i); }
    }
    fxGeo.attributes.position.needsUpdate = true; fxGeo.attributes.color.needsUpdate = true;
  }

  // ---------------------------------------------------------------- static scenery (ONE merged mesh) + glowing parts (ONE mesh)
  const m = makeMerger(THREE), gm = makeMerger(THREE);
  const flat = -Math.PI / 2;
  const obst = [];   // [x, z, r] things the scattered flowers must stay away from
  const solid = (x, z, r, keep = true) => { addCollider(cx + x, cz + z, r); if (keep) obst.push([x, z, r]); };

  // Ground: indigo-teal lawn, a darker edge, pools of lantern light on the grass.
  m.add(geoDisc(48), COL.ground, 0, 0.03, 0, flat, 0, 0, 10.4);
  m.add(geoRing(9.4, 10.4, 56), COL.groundEdge, 0, 0.034, 0, flat);
  // Paving from the gate to the pool: two columns of flat stones, turned to match the path that comes in from the south.
  {
    const ca = Math.cos(axis), sa = Math.sin(axis);
    for (let i = 0; i < 9; i++) for (const off of [-0.62, 0.62]) {
      const d = 3.1 + i * 0.82 - (off > 0 ? 0.3 : 0);
      m.add(geoBox, (i + (off > 0)) % 2 ? COL.paving : COL.paving2, sa * d + ca * off, 0.06, ca * d - sa * off, 0, axis, 0, 1.1, 0.06, 0.64);
    }
    // a few slabs between the pool and the fountain
    for (const [x, z] of [[0.05, -3.15], [-0.15, -3.8]]) m.add(geoBox, COL.paving, x, 0.06, z, 0, 0.2, 0, 0.9, 0.06, 0.55);
  }
  // Pools of lantern light on the lawn (a lighter, warmer patch under each lantern)
  const lightPool = (x, z, r) => m.add(geoDisc(20), COL.light, x, 0.04, z, flat, 0, 0, r);
  LANTERN_POSTS.forEach((l) => lightPool(l.x, l.z, l.tall ? 1.5 : 1.15));
  STORY_LANTERNS.forEach((s) => lightPool(...GARDEN_SPOTS[s.key], 1.1));
  lightPool(0.8, 9.3, 1.3);

  // Reflecting pool: stone rim, deep water, a lighter middle and stepping tiles.
  m.add(geoRing(1.0, 1.1, 48), COL.stone, POOL.x, 0.07, POOL.z, flat, 0, 0, POOL.rx + 0.3, POOL.rz + 0.3, 1);
  m.add(geoDisc(40), COL.water, POOL.x, 0.055, POOL.z, flat, 0, 0, POOL.rx, POOL.rz, 1);
  m.add(geoDisc(40), COL.waterLight, POOL.x, 0.058, POOL.z, flat, 0, 0, POOL.rx * 0.62, POOL.rz * 0.62, 1);
  POOL_TILES.forEach(([x, z], i) => m.add(geoBox, i % 2 ? COL.stone : 0xdfe3fa, x, 0.1, z, 0, 0.3 * i, 0, 0.82, 0.09, 0.72));

  // Fountain: stone basin, water, pedestal and an upper bowl (the jet is the tap mesh above it). Solid.
  {
    const [fx0, fz0] = GARDEN_SPOTS.fountain;
    m.add(geoPole, COL.stone, fx0, 0.2, fz0, 0, 0, 0, FOUNTAIN_R, 0.4, FOUNTAIN_R);
    m.add(geoDisc(32), COL.water, fx0, 0.41, fz0, flat, 0, 0, FOUNTAIN_R - 0.18);
    m.add(geoPole, COL.stoneDark, fx0, 0.4, fz0, 0, 0, 0, 0.22, 0.9, 0.22);
    m.add(geoPole, COL.stone, fx0, 0.88, fz0, 0, 0, 0, 0.62, 0.1, 0.62);
    m.add(geoDisc(24), COL.waterLight, fx0, 0.94, fz0, flat, 0, 0, 0.5);
    solid(fx0, fz0, FOUNTAIN_R + 0.05);
  }

  // Vine arch over the entrance path (solid posts), with a lantern hanging in it.
  {
    const [lx, lz] = GARDEN_STATICS.archL, [rx] = GARDEN_STATICS.archR, mid = (lx + rx) / 2, half = (rx - lx) / 2;
    for (const x of [lx, rx]) {
      m.add(geoPole, COL.stone, x, 1.2, lz, 0, 0, 0, 0.15, 2.4, 0.15);
      m.add(geoPole, COL.stoneDark, x, 0.08, lz, 0, 0, 0, 0.24, 0.16, 0.24);
      m.add(geoBall, COL.pearl, x, 2.5, lz, 0, 0, 0, 0.19);
      solid(x, lz, 0.25, false);
    }
    m.add(geoArc, COL.stone, mid, 2.4, lz, 0, 0, 0, half, half, half);
    for (let k = 0; k < 11; k++) {   // vines wound over the arch, with pale night blooms
      const a = (k + 0.5) * Math.PI / 11, x = mid - Math.cos(a) * half, y = 2.4 + Math.sin(a) * half;
      m.add(geoBall, k % 2 ? COL.vine : COL.vine2, x, y, lz + (k % 3 - 1) * 0.06, 0, 0, 0, 0.2, 0.15, 0.17);
      if (k % 3 === 1) m.add(geoBall, COL.moonWhite, x, y + 0.13, lz + 0.1, 0, 0, 0, 0.07);
    }
    for (const x of [lx, rx]) for (let k = 0; k < 4; k++) m.add(geoBall, k % 2 ? COL.vine : COL.vine2, x + (k % 2 - 0.5) * 0.14, 0.5 + k * 0.5, lz, 0, 0, 0, 0.14, 0.2, 0.14);
    m.add(geoPole, COL.post, mid, 2.15, lz, 0, 0, 0, 0.012, 0.5, 0.012);   // chain
    gm.add(geoBall, 0xffd679, mid, 1.9, lz, 0, 0, 0, 0.17, 0.24, 0.17);       // bulb
    m.add(geoCone, COL.post, mid, 2.2, lz, 0, 0, 0, 0.14, 0.14, 0.14);
  }

  // Pergola with vines, a little bench under it and (hung from a rafter) the wind chime.
  {
    const [px, pz] = GARDEN_STATICS.pergola, W = 1.3, Dz = 0.9, H = 2.4;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      m.add(geoPole, COL.stone, px + sx * W, H / 2, pz + sz * Dz, 0, 0, 0, 0.1, H, 0.1);
      m.add(geoBall, COL.pearl, px + sx * W, H + 0.06, pz + sz * Dz, 0, 0, 0, 0.13);
      solid(px + sx * W, pz + sz * Dz, 0.22, false);
    }
    for (const sx of [-1, 1]) m.add(geoBox, COL.stone, px + sx * W, H, pz, 0, 0, 0, 0.16, 0.14, Dz * 2 + 0.5);   // long beams
    for (let k = 0; k < 5; k++) m.add(geoBox, COL.stoneDark, px, H + 0.12, pz - Dz - 0.2 + k * ((Dz * 2 + 0.4) / 4), 0, 0, 0, W * 2 + 0.7, 0.09, 0.12);   // cross rafters
    for (let k = 0; k < 14; k++) {    // vines over the roof, hanging down a little, with pale blooms
      const x = px - W + (k % 7) * (W / 3), z = pz - Dz + (k < 7 ? 0 : Dz * 2) * 0.9 + (k % 3) * 0.12;
      m.add(geoBall, k % 2 ? COL.vine : COL.vine2, x, H + 0.2, z, 0, 0, 0, 0.26, 0.13, 0.2);
      if (k % 2 === 0) { m.add(geoBall, COL.vine, x, H - 0.22, z, 0, 0, 0, 0.1, 0.32, 0.1); m.add(geoBall, COL.moonWhite, x, H - 0.55, z, 0, 0, 0, 0.07); }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let k = 0; k < 3; k++) m.add(geoBall, k % 2 ? COL.vine : COL.vine2, px + sx * W, 0.55 + k * 0.6, pz + sz * Dz, 0, 0, 0, 0.13, 0.22, 0.13);
    // Bench against the west beam, facing the pool
    const bx = px - 0.62;
    m.add(geoBox, 0x9a7fc9, bx, 0.45, pz, 0, 0, 0, 0.55, 0.09, 1.5);                    // seat
    m.add(geoBox, 0x8a6fb9, bx - 0.28, 0.82, pz, 0, 0, 0, 0.09, 0.62, 1.5);              // back
    for (const dz of [-0.62, 0.62]) m.add(geoBox, 0x6d5aa6, bx, 0.22, pz + dz, 0, 0, 0, 0.45, 0.44, 0.1);   // legs
    m.add(geoBall, COL.lilac, bx, 0.56, pz + 0.4, 0, 0, 0, 0.19, 0.08, 0.17);              // a cushion
    solid(bx, pz, 0.85, false);
    obst.push([px, pz, 2.1]);
  }

  // Moon-gazing platform: two round steps of pale stone, a ring of pearls and the crescent-moon sculpture on a post.
  {
    const [px, pz] = GARDEN_STATICS.platform;
    m.add(geoPole, COL.stoneDark, px, 0.06, pz, 0, 0, 0, 1.85, 0.12, 1.85);
    m.add(geoPole, COL.stone, px, 0.15, pz, 0, 0, 0, 1.45, 0.14, 1.45);
    m.add(geoDisc(24), 0xaab7ee, px, 0.23, pz, flat, 0, 0, 1.1);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; m.add(geoBall, COL.pearl, px + Math.cos(a) * 1.65, 0.16, pz + Math.sin(a) * 1.65, 0, 0, 0, 0.1); }
    const [mx, mz] = GARDEN_STATICS.moon;
    m.add(geoPole, COL.stoneDark, mx, 0.95, mz, 0, 0, 0, 0.09, 1.7, 0.09);
    m.add(geoPole, COL.stone, mx, 0.2, mz, 0, 0, 0, 0.3, 0.3, 0.3);
    gm.add(geoCrescent, 0xfff3c4, mx, 2.35, mz + 0.02, 0, 0, 0.55, 0.78, 0.78, 1);       // the crescent moon (glows)
    gm.add(geoCrescent, 0xfffbe4, mx, 2.35, mz - 0.02, 0, 0, 0.55, 0.7, 0.7, 1);
    gm.add(geoBall, 0xfff3c4, mx + 0.5, 2.9, mz, 0, 0, 0, 0.07);                           // a little star beside it
    solid(mx, mz, 0.3);
    obst.push([px, pz, 2.0]);
  }

  // Lantern posts: a slim dark post, a cap and a cage; the glass (bulb) is the unlit glowing mesh.
  LANTERN_POSTS.forEach((l) => {
    const s = l.tall ? 1.4 : 1;
    m.add(geoPole, COL.post, l.x, (l.h - 0.3) / 2, l.z, 0, 0, 0, 0.05 * s, l.h - 0.3, 0.05 * s);
    m.add(geoPole, COL.post, l.x, 0.06, l.z, 0, 0, 0, 0.14 * s, 0.12, 0.14 * s);
    m.add(geoCone, COL.post, l.x, l.h + 0.34 * s, l.z, 0, 0, 0, 0.2 * s, 0.22 * s, 0.2 * s);
    m.add(geoBox, COL.post, l.x, l.h - 0.22 * s, l.z, 0, 0, 0, 0.3 * s, 0.05, 0.3 * s);
    gm.add(geoBall, l.tall ? 0xffe39a : 0xffd679, l.x, l.h + 0.04 * s, l.z, 0, 0, 0, 0.2 * s, 0.27 * s, 0.2 * s);
    if (l.tall) {   // the tall one wears a little star halo ring
      m.add(geoRing(0.34, 0.4, 20), COL.post, l.x, l.h + 0.04, l.z, 0, 0, 0, 1, 1, 1);
      gm.add(geoBall, 0xfff8d8, l.x, l.h + 0.04, l.z, 0, 0, 0, 0.1, 0.14, 0.1);
    }
    solid(l.x, l.z, 0.22, false);
  });

  // The three story lanterns: bigger glowing lanterns, each with a picture on its front. Seed, sprout, flower.
  STORY_LANTERNS.forEach((s, i) => {
    const [x, z] = GARDEN_SPOTS[s.key], sc = 0.9 + i * 0.1;
    m.add(geoPole, COL.post, x, 0.4, z, 0, 0, 0, 0.07, 0.8, 0.07);
    m.add(geoPole, COL.post, x, 0.06, z, 0, 0, 0, 0.2, 0.12, 0.2);
    m.add(geoBox, COL.post, x, 0.84, z, 0, 0, 0, 0.62 * sc, 0.06, 0.62 * sc);                // lantern floor
    m.add(geoCone, COL.post, x, 1.9 * sc + 0.0 + (1 - sc) * 0.2, z, 0, Math.PI / 4, 0, 0.5 * sc, 0.28, 0.5 * sc);   // cap
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.add(geoPole, COL.post, x + dx * 0.29 * sc, 0.84 + 0.5 * sc, z + dz * 0.29 * sc, 0, 0, 0, 0.025, 1.0 * sc, 0.025);   // frame
    gm.add(geoBox, 0xfff1bd, x, 0.84 + 0.5 * sc, z, 0, 0, 0, 0.54 * sc, 0.98 * sc, 0.54 * sc);   // the glowing glass
    const py = 1.34 * sc - 0.06 * (sc - 1), pz = z + 0.29 * sc;                                  // the picture sits on the south face
    gm.add(geoDisc(20), 0xfff9e6, x, py, pz + 0.01, 0, 0, 0, 0.23 * sc, 0.23 * sc, 1);          // pale round panel
    if (i === 0) {   // a seed: a small brown teardrop
      gm.add(geoBall, 0x7a4a24, x, py - 0.02, pz + 0.04, 0, 0, 0.5, 0.075, 0.12, 0.03);
      gm.add(geoBall, 0xb27a45, x - 0.02, py + 0.02, pz + 0.07, 0, 0, 0.5, 0.025, 0.04, 0.01);
    } else if (i === 1) {   // a sprout: a stem with two leaves
      gm.add(geoPole, 0x3f9d4f, x, py - 0.07, pz + 0.04, Math.PI / 2, 0, 0, 0.02, 0.2, 0.02);
      gm.add(geoBall, 0x58d36b, x - 0.075, py + 0.06, pz + 0.05, 0, 0, 0.6, 0.085, 0.04, 0.02);
      gm.add(geoBall, 0x3fbf5c, x + 0.075, py + 0.07, pz + 0.05, 0, 0, -0.6, 0.085, 0.04, 0.02);
    } else {   // a flower: pink petals round a golden middle on a stem
      gm.add(geoPole, 0x3f9d4f, x, py - 0.12, pz + 0.04, Math.PI / 2, 0, 0, 0.018, 0.2, 0.018);
      for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 + 0.3; gm.add(geoBall, 0xff7fb8, x + Math.cos(a) * 0.075, py + 0.07 + Math.sin(a) * 0.075, pz + 0.05, 0, 0, 0, 0.055, 0.055, 0.02); }
      gm.add(geoBall, 0xffd84d, x, py + 0.07, pz + 0.07, 0, 0, 0, 0.045, 0.045, 0.02);
    }
    solid(x, z, 0.3, false);
  });

  // Low patterned hedges (about knee high): a scalloped outer hedge round the back and sides (open at the south gate), a round
  // hedge with a gap round the west lantern, and a ring round the night-flower bed. Two greens alternate; a pale pearl tops every 4th bush.
  const bush = (x, z, i, s) => {
    m.add(geoBall, i % 2 ? COL.hedgeA : COL.hedgeB, x, 0.28 * s, z, 0, i, 0, 0.9 * s, 0.55 * s, 0.9 * s);
    if (i % 4 === 0) m.add(geoBall, COL.pearl, x, 0.78 * s, z, 0, 0, 0, 0.09 * s);
  };
  {
    const n = 32;
    for (let k = 0; k < n; k++) {
      const th = (k + 0.5) * Math.PI * 2 / n;
      if (Math.abs(th - Math.PI / 2) < 0.3) continue;   // the south gate
      const x = Math.cos(th) * GARDEN_R, z = Math.sin(th) * GARDEN_R;
      bush(x, z, k, 1);
      addCollider(cx + x, cz + z, 0.85);
    }
    const ring = (rx, rz, r, count, gapAt, gapHalf, collR) => {
      for (let k = 0; k < count; k++) {
        const th = k * Math.PI * 2 / count;
        if (Math.abs(Math.atan2(Math.sin(th - gapAt), Math.cos(th - gapAt))) < gapHalf) continue;
        const x = rx + Math.cos(th) * r, z = rz + Math.sin(th) * r;
        bush(x, z, k + 1, 0.75);
        addCollider(cx + x, cz + z, collR);
      }
      obst.push([rx, rz, r + 0.5]);
    };
    ring(GARDEN_SPOTS.hedge[0], GARDEN_SPOTS.hedge[1], 1.5, 11, 0, 0.7, 0.5);                   // round hedge, gap toward the pool
    ring(GARDEN_SPOTS.flowers[0], GARDEN_SPOTS.flowers[1], 1.8, 14, Math.PI, 0.75, 0.55);        // flower-bed ring, gap toward the pool
    m.add(geoDisc(24), COL.soil, GARDEN_SPOTS.flowers[0], 0.04, GARDEN_SPOTS.flowers[1], flat, 0, 0, 1.55);   // dark soil in the bed
    m.add(geoDisc(24), COL.soil, GARDEN_SPOTS.hedge[0], 0.04, GARDEN_SPOTS.hedge[1], flat, 0, 0, 1.2);
  }

  // Night-blooming flowers scattered on the lawn (kept off the pool, paving, benches and beds): pale moon-white blooms on short stems.
  {
    let placed = 0;
    for (let i = 0; i < 90 && placed < 34; i++) {
      const a = i * 2.399 + 0.7, r = 2.4 + ((i * 47) % 64) / 10;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (r > 8.2 || gardenWet(x, z) || Math.hypot(x - padL.x, z - padL.z) < 3.0) continue;
      if (z > 2.0 && Math.abs(x - Math.sin(axis) * z) < 1.9) continue;   // keep the paving clear
      if (obst.some(([ox, oz, or]) => Math.hypot(x - ox, z - oz) < or + 0.35)) continue;
      if (LANTERN_POSTS.some((l) => Math.hypot(x - l.x, z - l.z) < 0.7) || Object.values(GARDEN_SPOTS).some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 0.9)) continue;
      placed++;
      m.add(geoCone, 0x2f8f66, x, 0.14, z, 0, 0, 0, 0.1, 0.28, 0.1);
      m.add(geoPole, 0x2c8c63, x, 0.2, z, 0, 0, 0, 0.012, 0.4, 0.012);
      gm.add(geoBall, placed % 3 ? COL.moonWhite : COL.lilac, x, 0.42, z, 0, 0, 0, 0.1, 0.07, 0.1);
      if (placed % 5 === 0) gm.add(geoBall, 0xffe27a, x, 0.47, z, 0, 0, 0, 0.035);
    }
  }

  const scenery = new THREE.Mesh(m.build(), vcMat);
  scenery.position.set(cx, 0, cz);
  scene.add(scenery);
  const glowParts = new THREE.Mesh(gm.build(), glowMat);
  glowParts.position.set(cx, 0, cz);
  scene.add(glowParts);

  return {
    update,
    wet: (x, z) => gardenWet(x - cx, z - cz),
    dry: (x, z) => !gardenWet(x - cx, z - cz) && Math.hypot(x - cx, z - cz) < GARDEN_R - 0.6,
  };
}
