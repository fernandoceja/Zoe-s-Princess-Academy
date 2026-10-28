// ============================================================================
// Zoe's Starlight Quest — Firefly Bayou (K12). An original, warm and friendly bayou at the golden hour: green-brown water channels
// with lily pads, tall cypress trees with hanging moss, a wooden boardwalk with a little arched bridge, a cozy cabin on stilts with a
// porch and a rocking chair, a vegetable garden, a mailbox, a vegetable stand with a tally board and three baskets, cattails and
// reeds, a small rowboat, and lots of glowing fireflies (plain glowing dots, no named characters).
// Six tap surprises and one secret (the tally board shows seven: four lines and a slash, then two more; tap the board, then the basket
// that holds seven vegetables). Built by world.js ONLY when the bayou slot is "open" (worldmap.js isBayouOpen): ?preview=bayou for now.
//
// The scene lighting is shared daylight: no lights, no shadow maps, no new assets. Glowing bits (cabin windows, porch lantern, boardwalk
// bulbs, the tally chalk marks) use an unlit vertex-colour material, like the harbor's lamp. The fireflies are shared glow Points.
//
// Draw-call budget (rest state), checked by tests/bayou_check.mjs:
//   1 static scenery mesh (ground, water, boardwalk, bridge, cabin, cypress trees, moss, garden, stand, baskets, reeds, lily pads: merged)
//   1 glowing parts mesh (cabin windows, boardwalk bulbs, tally chalk marks: unlit vertex colours)
//   1 lily flower (opens) · 1 rocking chair · 1 rowboat · 1 turtle · 1 porch lantern (swings)
//   1 shared glow Points (fireflies, lantern halo, firefly swirl, ripples, petals, sparks, splash, motes)
//   = 8 (limit 8). Tap hit-boxes use invisible materials; glow sprites only draw during a reaction.
// Geometry/materials come from world.js's G()/M() caches (same keys as the cove where the shape is the same).
// All motion is skipped under calmMotion (a tap then only glows; the fireflies and the lantern halo stay still).
// ============================================================================

import { makeMerger } from './cove.js?v=20261028r3';
import { TALLY_TARGET, TALLY_BASKETS, tallyMarks, tallyRows } from './treasures.js?v=20261028r3';

// Bayou layout, in metres from the bayou centre (x east, z south). The entrance (branch path) is to the EAST, where Tiana's pad is;
// the camera looks north, so the cabin's porch and the stand's board face south, toward the player.
export const BAYOU_R = 9.6;   // props and finds stay inside this radius (the grass disc is a little bigger)
export const BAYOU_SPOTS = {
  reeds: [-3.9, 3.0],       // tap: fireflies swirl up out of the reeds
  lily: [-0.9, -5.3],       // tap: the lily pads ripple and the flower opens
  chair: [-7.3, 0.3],       // tap: the rocking chair rocks
  lantern: [-5.4, 1.0],     // tap: the porch lantern swings and glows
  boat: [-4.1, 6.4],        // tap: the rowboat bobs
  turtle: [0.7, -7.6],      // tap: a turtle pops up and looks round
  board: [5.0, -5.7],       // the secret: the tally board (look at it first)
  basket9: [3.1, -3.2], basket5: [5.0, -3.2], basket7: [6.9, -3.2],   // the secret: baskets, left to right (named by how many vegetables)
};
export const BAYOU_STATICS = {
  cabin: [-6.4, -2.6], stand: [5.0, -5.4], garden: [5.2, 4.9], mailbox: [4.2, -1.5],
};
// The water: a winding channel (centre line, metres) with a wider pool where the lily pads grow. Width varies a little along the way.
export const CHANNEL = {
  pts: [[1.0, -8.3], [0.2, -6.5], [-0.8, -4.2], [-1.1, -1.5], [-1.0, 1.5], [-1.6, 4.0], [-3.0, 5.9], [-5.2, 6.9], [-6.4, 5.9]],
  r: 1.35,                         // widest water radius
  mud: 0.45,                       // muddy bank beyond the water
  pool: { x: -0.9, z: -5.0, r: 2.1 },
};
export const BOARDWALK = { z: 0.4, x0: 5.4, x1: -4.0, half: 0.6, bridge0: 1.5, bridge1: -3.3 };   // planks run west along z; the bridge crosses the channel
export const DECK = { x0: -8.0, x1: -4.8, z0: -3.7, z1: 1.1, y: 0.7 };                           // the cabin's floor and porch
export const GARDEN_PATCH = { x: 5.2, z: 4.9, hx: 2.5, hz: 1.5 };
export const BASKET_KEYS = TALLY_BASKETS.map((n) => 'basket' + n);
// Shared glow Points layout: 5 halos (lantern, board, three baskets) of 3 dots each, then 18 fireflies, then the tap effects.
export const BAYOU_FX = { halos: 2 + TALLY_BASKETS.length, haloDots: 3, fireflies: 18 };
// Cypress trees (local x, z): kept off the water, the boardwalk lane, the stand and the pad.
export const CYPRESS = [
  [-5.5, -7.2], [-2.4, -8.3], [3.6, -8.0], [8.7, -2.4], [8.5, 3.6], [2.6, 8.2, 0.72], [-8.9, -1.0], [-8.4, 3.4], [-0.4, 7.9, 0.7],   // (x, z, optional size: the two on the south edge are smaller so they never hide the garden)
];

function segDist(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len2 = dx * dx + dz * dz;
  const t = len2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / len2)) : 0;
  return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t));
}
/** Distance from a bayou-local spot to the channel's centre line. */
export function channelDist(lx, lz) {
  let d = Infinity;
  for (let i = 0; i + 1 < CHANNEL.pts.length; i++) d = Math.min(d, segDist(lx, lz, CHANNEL.pts[i], CHANNEL.pts[i + 1]));
  return d;
}
/** True when a bayou-local spot is in the water or on its muddy bank (or in the lily pool): treasures stay on dry ground. */
export function bayouWet(lx, lz) {
  if (channelDist(lx, lz) < CHANNEL.r + CHANNEL.mud + 0.1) return true;
  return Math.hypot(lx - CHANNEL.pool.x, lz - CHANNEL.pool.z) < CHANNEL.pool.r + CHANNEL.mud + 0.1;
}
/** True when a bayou-local spot is the vegetable patch (finds are not hidden among the plants). */
export function inGarden(lx, lz) {
  return Math.abs(lx - GARDEN_PATCH.x) < GARDEN_PATCH.hx + 0.3 && Math.abs(lz - GARDEN_PATCH.z) < GARDEN_PATCH.hz + 0.3;
}

/**
 * Build the bayou. env = { THREE, scene, center:{x,z}, pad?:{x,z}, G, M, addCollider, addTappable, starGeometry, softDot, calmMotion }.
 * Returns { update(t, dt), wet(worldX, worldZ), dry(worldX, worldZ), settle(x, z, free) }.
 */
export function buildBayou(env) {
  const { THREE, scene, center, G, M, addCollider, addTappable, softDot, calmMotion } = env;
  const cx = center.x, cz = center.z;
  const padL = env.pad ? { x: env.pad.x - cx, z: env.pad.z - cz } : { x: 6.48, z: 0.54 };   // Tiana's pad, bayou-local (stored, nobody stands on it yet)
  const padLen = Math.hypot(padL.x, padL.z) || 1, ux = padL.x / padLen, uz = padL.z / padLen;   // unit vector from the centre toward the entrance
  const vcMat = M('coveVC', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }));
  // Unlit vertex-colour material: windows, bulbs, the lantern and the chalk marks keep their colour in the shared daylight.
  const glowMat = M('bayouGlow', () => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));

  const geoDisc = (n) => G('coveDisc' + n, () => new THREE.CircleGeometry(1, n));
  const geoBall = G('coveBall', () => new THREE.SphereGeometry(1, 8, 6));
  const geoPole = G('covePole', () => new THREE.CylinderGeometry(1, 1, 1, 7));
  const geoCone = G('coveCone', () => new THREE.ConeGeometry(1, 1, 8));
  const geoBox = G('coveBox', () => new THREE.BoxGeometry(1, 1, 1));
  const geoRock = G('coveRock', () => new THREE.DodecahedronGeometry(1, 0));
  const geoBowl = G('harborBowl', () => new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));   // lower half of a ball: a hull
  const geoTriUp = G('harborTriUp', () => { const s = new THREE.Shape(); s.moveTo(-1, 0); s.lineTo(1, 0); s.lineTo(0, 1); return new THREE.ShapeGeometry(s); });
  const geoTriDown = G('harborTriDown', () => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, -1); return new THREE.ShapeGeometry(s); });
  const geoRocker = G('bayouRocker', () => new THREE.TorusGeometry(1, 0.065, 4, 14, 1.3));   // a curved chair rocker (an arc of a ring)
  const geoRing = (a, b, n) => G(`harborRing${a}_${b}_${n}`, () => new THREE.RingGeometry(a, b, n));

  const items = {};
  const own = (m, mat) => new THREE.Mesh(m.build(), mat || vcMat);
  const wx = (k) => cx + BAYOU_SPOTS[k][0], wz = (k) => cz + BAYOU_SPOTS[k][1];
  const TG = 1.25;   // addTappable scales every tappable group by 1.25: own meshes are drawn at 1/1.25 so they land at the intended size
  const SG = 1 / TG;
  const flat = -Math.PI / 2;

  const COL = {
    grass: 0x8dac52, grass2: 0xa2bf61, grass3: 0x789a48, mud: 0x7d6142, mud2: 0x937650, water: 0x4d7a5a, water2: 0x62906a, deep: 0x3d6650, glint: 0xf0d98a,
    wood: 0xb98a55, wood2: 0x9a6c3d, woodDark: 0x6e4a28, plank: 0xcf9f66, plank2: 0xc08f58, cabin: 0xdbb072, cabin2: 0xc29858, roof: 0x4f8078, roof2: 0x3e6b65,
    door: 0x3b7a57, trunk: 0x8a6c4e, trunk2: 0x7a5d41, leaf: 0x3f7a48, leaf2: 0x52905a, leaf3: 0x33683f, moss: 0xa9c08f, moss2: 0xbccfa3,
    reed: 0x8fb25a, reed2: 0x769f50, cattail: 0x6a3f24, pad: 0x4c9a52, pad2: 0x62ae5e, lotus: 0xf6a8c8, lotus2: 0xffd3e2, sun: 0xffd75e, stone: 0xb7b0a2, stone2: 0x9d978a,
    soil: 0x5c4129, cabbage: 0x7fc46a, cabbage2: 0x5fa955, tomato: 0xe5483c, carrot: 0xf08a3c, pumpkin: 0xf0a23a, squash: 0xf2cf4a, plum: 0x7a4a9a,
    white: 0xfff9ec, chalk: 0xfff6dc, board: 0x2f4a3c,
  };

  // ---------------------------------------------------------------- shared glow Points
  // Slots: soft halos (3 dots each, so a halo reads bigger than a firefly), then the fireflies, then the effects (parked off-screen until a tap).
  const LAMP = { x: cx + BAYOU_SPOTS.lantern[0], y: 1.9, z: cz + BAYOU_SPOTS.lantern[1] };   // the glass, 0.64 below the hook
  const HALOS = [
    { x: LAMP.x, y: LAMP.y, z: LAMP.z + 0.05, base: 0.8, tint: [1, 0.82, 0.45] },                                              // 0: porch lantern
    { x: wx('board'), y: 2.0, z: wz('board') + 0.3, base: 0.0, tint: [1, 0.96, 0.8] },                                          // 1: tally board (lights when tapped)
    ...TALLY_BASKETS.map((n) => ({ x: wx('basket' + n), y: 0.75, z: wz('basket' + n) + 0.1, base: 0.0, tint: [1, 0.96, 0.8] })),   // 2-4: baskets
  ];
  const HALO_K = BAYOU_FX.haloDots, HALO_OFF = [[0, 0, 0], [0.16, 0.1, 0.05], [-0.14, -0.08, 0.05]], HALO_MUL = [1, 0.6, 0.6];
  const N_H = HALOS.length, AMB_AT = N_H * HALO_K, N_AMB = BAYOU_FX.fireflies;
  const SWIRL_AT = AMB_AT + N_AMB, N_SWIRL = 10, RIP_AT = SWIRL_AT + N_SWIRL, N_RIP = 12, BUD_AT = RIP_AT + N_RIP, N_BUD = 6;
  const SPARK_AT = BUD_AT + N_BUD, N_SPARK = 6, SPL_AT = SPARK_AT + N_SPARK, N_SPL = 6, BRIP_AT = SPL_AT + N_SPL, N_BRIP = 6, MOTE_AT = BRIP_AT + N_BRIP, N_MOTE = 4, FX_N = MOTE_AT + N_MOTE;
  const fxPos = new Float32Array(FX_N * 3).fill(-50);
  const fxCol = new Float32Array(FX_N * 3);
  const fxGeo = new THREE.BufferGeometry();
  fxGeo.setAttribute('position', new THREE.BufferAttribute(fxPos, 3));
  fxGeo.setAttribute('color', new THREE.BufferAttribute(fxCol, 3));
  const fx = new THREE.Points(fxGeo, new THREE.PointsMaterial({
    map: softDot, size: 0.55, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  fx.frustumCulled = false;
  scene.add(fx);
  const park = (i) => { fxPos[i * 3 + 1] = -50; fxCol[i * 3] = fxCol[i * 3 + 1] = fxCol[i * 3 + 2] = 0; };
  const put = (i, x, y, z, k, r, g, b) => { fxPos[i * 3] = x; fxPos[i * 3 + 1] = y; fxPos[i * 3 + 2] = z; fxCol[i * 3] = r * k; fxCol[i * 3 + 1] = g * k; fxCol[i * 3 + 2] = b * k; };
  const putHalo = (h, i, k, dx = 0, dy = 0) => { for (let j = 0; j < HALO_K; j++) put(i * HALO_K + j, h.x + dx + HALO_OFF[j][0], h.y + dy + HALO_OFF[j][1], h.z + HALO_OFF[j][2], k * HALO_MUL[j], h.tint[0], h.tint[1], h.tint[2]); };
  // Fireflies: warm yellow-green dots that drift and glow slowly (still, and softly lit, under calm motion). Deterministic spots.
  const FLY = [];
  {
    let seed = 12345;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < N_AMB; i++) {
      let x = 0, z = 0;
      for (let tries = 0; tries < 20; tries++) { const a = rnd() * Math.PI * 2, r = 1.5 + rnd() * 7.6; x = Math.cos(a) * r; z = Math.sin(a) * r; if (Math.hypot(x - padL.x, z - padL.z) > 1.6) break; }
      FLY.push({ x: cx + x, y: 0.5 + rnd() * 2.1, z: cz + z, ph: rnd() * 6.28 });
    }
  }
  const FLY_TINT = [1, 0.95, 0.42];
  HALOS.forEach((h, i) => putHalo(h, i, h.base));   // soft halos at rest
  FLY.forEach((f, i) => put(AMB_AT + i, f.x, f.y, f.z, 0.62, FLY_TINT[0], FLY_TINT[1], FLY_TINT[2]));
  for (let i = AMB_AT + N_AMB; i < FX_N; i++) park(i);
  const bump = (x) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x));
  let swirlT = -1, ripT = -1, budT = -1, sparkT = -1, splT = -1, bripT = -1, moteT = -1;
  const glowT = [0, 0, 0, 0];   // seconds of extra glow left on the board and the three baskets (they light up when tapped)

  // ---------------------------------------------------------------- tap surprises
  // 1. Reeds: a tuft of tall reeds and cattails by the water. Tap it and the fireflies swirl up out of the reeds in a glowing spiral.
  items.reeds = addTappable(() => ({ glowY: 1.1, hitR: 1.1 }), wx('reeds'), wz('reeds'), 0, 0xf6f19a);
  items.reeds.dur = 3.0;
  items.reeds.onTap = () => { swirlT = 0; };

  // 2. Lily flower: a pink water lily on the pool. Its bud swells and opens wide while ripples spread out over the pads.
  const FL_REST = [0.55, 1.25, 0.55];
  items.lily = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoBall, COL.pad2, 0, 0.0, 0, 0, 0, 0, 0.7, 0.03, 0.7);                       // its own big pad
    m.add(geoPole, 0x4f8a4e, 0, 0.18, 0, 0, 0, 0, 0.03, 0.34, 0.03);                        // stem
    for (let i = 0; i < 8; i++) {                                                           // petals round a golden middle
      const a = (i / 8) * Math.PI * 2, c = i % 2 ? COL.lotus2 : COL.lotus;
      m.add(geoBall, c, Math.cos(a) * 0.16, 0.5, Math.sin(a) * 0.16, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35, 0.09, 0.28, 0.09);
    }
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; m.add(geoBall, COL.lotus, Math.cos(a) * 0.07, 0.42, Math.sin(a) * 0.07, 0, 0, 0, 0.07, 0.22, 0.07); }
    m.add(geoBall, COL.sun, 0, 0.48, 0, 0, 0, 0, 0.07, 0.07, 0.07);
    const mesh = own(m); mesh.scale.set(SG * FL_REST[0], SG * FL_REST[1], SG * FL_REST[2]); mesh.position.y = 0.05 * SG; g.add(mesh);
    return { glowY: 0.9, hitR: 0.95 };
  }, wx('lily'), wz('lily'), 0, 0xffc4dc);
  items.lily.group.rotation.y = 0;
  items.lily.dur = 2.6;
  items.lily.react = (it, p) => {
    const b = it.group.children[0];
    if (p >= 1) { b.scale.set(SG * FL_REST[0], SG * FL_REST[1], SG * FL_REST[2]); return; }
    const o = bump(Math.min(1, p / 0.85));   // swells open, then folds back
    b.scale.set(SG * (FL_REST[0] + 0.9 * o), SG * (FL_REST[1] - 0.5 * o), SG * (FL_REST[2] + 0.9 * o));
  };
  items.lily.onTap = () => { ripT = 0; budT = 0; };

  // 3. Rocking chair on the porch: a wooden chair with curved rockers and a cushion. It rocks back and forth, slowing down.
  const ROCK_R = 0.62;   // the rockers are arcs of a circle this big; the chair rocks about that circle's centre
  const DECK_Y = DECK.y;
  const chairAt = (th) => { const c = Math.cos(th), s = Math.sin(th); return { x: -ROCK_R * s, y: DECK_Y + ROCK_R * c }; };
  items.chair = addTappable((g) => {
    const m = makeMerger(THREE);
    const Y = -ROCK_R;   // the mesh origin is the centre of the rocker circles
    for (const z of [-0.27, 0.27]) {
      m.add(geoRocker, COL.woodDark, 0, 0, z, 0, 0, Math.PI * 1.5 - 0.65, ROCK_R, ROCK_R, 1);                       // rockers
      for (const x of [-0.26, 0.26]) m.add(geoPole, COL.wood2, x, Y + 0.3, z, 0, 0, 0, 0.026, 0.46, 0.026);        // legs
    }
    m.add(geoBox, COL.wood2, 0, Y + 0.52, 0, 0, 0, 0, 0.62, 0.05, 0.6);                                              // seat
    m.add(geoBox, 0x4fa0a0, 0, Y + 0.56, 0, 0, 0, 0, 0.5, 0.06, 0.48);                                              // teal cushion
    m.add(geoBox, COL.wood2, -0.3, Y + 0.98, 0, 0, 0, -0.12, 0.05, 0.9, 0.58);                                      // back (leans a little)
    for (let i = 0; i < 4; i++) m.add(geoPole, COL.wood, -0.3 - 0.015, Y + 0.98, -0.2 + i * 0.133, 0, 0, -0.12, 0.018, 0.85, 0.018);   // slats
    for (const z of [-0.3, 0.3]) {
      m.add(geoBox, COL.wood2, 0.02, Y + 0.76, z, 0, 0, 0, 0.5, 0.04, 0.05);                                        // arm rests
      m.add(geoPole, COL.wood2, 0.24, Y + 0.64, z, 0, 0, 0, 0.022, 0.26, 0.022);
    }
    const mesh = own(m); mesh.scale.setScalar(SG); const c0 = chairAt(0); mesh.position.set(0, c0.y * SG, 0); g.add(mesh);
    return { glowY: 1.0, hitR: 0.9 };
  }, wx('chair'), wz('chair'), 0, 0xffe0b0);
  items.chair.group.rotation.y = 0;   // the chair faces east, toward the boardwalk, so its rocking shows from the south
  items.chair.dur = 2.8;
  items.chair.react = (it, p) => {
    const b = it.group.children[0];
    if (p >= 1) { const c = chairAt(0); b.rotation.z = 0; b.position.set(0, c.y * SG, 0); return; }
    const f = (1 - p) * (1 - p), th = Math.sin(p * Math.PI * 7) * 0.2 * f, c = chairAt(th);
    b.rotation.z = th; b.position.set(c.x * SG, c.y * SG, 0);
  };
  items.chair.onTap = () => { moteT = 0; };

  // 4. Rowboat: a small wooden rowboat tied up in the channel. It bobs and sways, and ripples spread round it.
  const BOAT_Y = 0.1;
  items.boat = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoBowl, COL.wood2, 0, 0.3, 0, 0, 0, 0, 1.0, 0.42, 0.52);                                        // hull
    m.add(geoDisc(16), 0xe2c48e, 0, 0.29, 0, flat, 0, 0, 0.78, 0.37, 1);                                   // pale floor
    m.add(geoRing(0.86, 1.0, 20), COL.woodDark, 0, 0.31, 0, flat, 0, 0, 1.0, 0.52, 1);                      // rim
    m.add(geoBox, COL.wood, -0.1, 0.4, 0, 0, 0, 0, 0.14, 0.05, 0.9);                                       // seats
    m.add(geoBox, COL.wood, 0.4, 0.4, 0, 0, 0, 0, 0.14, 0.05, 0.7);
    m.add(geoPole, COL.woodDark, 0.0, 0.5, 0.36, Math.PI / 2 - 0.45, 0, 0, 0.02, 0.9, 0.02);               // two oars resting inside
    m.add(geoPole, COL.woodDark, 0.0, 0.5, -0.36, Math.PI / 2 + 0.45, 0, 0, 0.02, 0.9, 0.02);
    m.add(geoBall, 0x4f8a8a, 0.9, 0.42, 0, 0, 0, 0, 0.07, 0.07, 0.07);                                     // a teal bow knob
    const mesh = own(m); mesh.scale.setScalar(SG); mesh.position.y = BOAT_Y * SG; g.add(mesh);
    return { glowY: 1.0, hitR: 1.35 };
  }, wx('boat'), wz('boat'), 0, 0xd8f0e0);
  items.boat.group.rotation.y = 0.42;
  items.boat.dur = 2.4;
  items.boat.react = (it, p) => {
    const hull = it.group.children[0];
    if (p >= 1) { hull.position.y = BOAT_Y * SG; hull.rotation.set(0, 0, 0); return; }
    const f = (1 - p) * (1 - p);
    hull.position.y = (BOAT_Y + Math.sin(p * Math.PI * 7) * 0.09 * f) * SG;
    hull.rotation.z = Math.sin(p * Math.PI * 6) * 0.13 * f;
    hull.rotation.x = Math.sin(p * Math.PI * 5 + 1) * 0.07 * f;
  };
  items.boat.onTap = () => { bripT = 0; };

  // 5. Turtle: a friendly green turtle lies low in the water with just its shell showing. Tap it and it pops up, looks round, and sinks back.
  const TURT_LOW = -0.2, TURT_HIGH = 0.14;
  items.turtle = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoBall, 0x6f8a3c, 0, 0.16, 0, 0, 0, 0, 0.5, 0.3, 0.42);                                        // shell dome
    m.add(geoBall, 0x8aa84c, 0, 0.3, 0, 0, 0, 0, 0.3, 0.12, 0.25);                                        // lighter top
    for (const [x, z] of [[-0.2, -0.13], [0.2, -0.13], [-0.2, 0.13], [0.2, 0.13], [0, 0]]) m.add(geoBall, 0x5a722f, x, 0.36, z, 0, 0, 0, 0.1, 0.04, 0.1);   // shell plates
    m.add(geoBall, 0xa4b86a, 0.55, 0.1, 0, 0, 0, 0, 0.17, 0.15, 0.14);                                    // head
    m.add(geoPole, 0xa4b86a, 0.42, 0.08, 0, 0, 0, Math.PI / 2, 0.07, 0.2, 0.07);                          // neck
    m.add(geoBall, 0x1b2a3a, 0.64, 0.16, 0.07, 0, 0, 0, 0.026);                                           // eyes
    m.add(geoBall, 0x1b2a3a, 0.64, 0.16, -0.07, 0, 0, 0, 0.026);
    m.add(geoBall, 0xffffff, 0.65, 0.17, 0.075, 0, 0, 0, 0.01);
    m.add(geoBall, 0xa4b86a, 0.3, 0.0, 0.38, 0, 0, 0, 0.14, 0.07, 0.1);                                   // flippers
    m.add(geoBall, 0xa4b86a, 0.3, 0.0, -0.38, 0, 0, 0, 0.14, 0.07, 0.1);
    m.add(geoBall, 0xa4b86a, -0.3, 0.0, 0.36, 0, 0, 0, 0.14, 0.07, 0.1);
    m.add(geoBall, 0xa4b86a, -0.3, 0.0, -0.36, 0, 0, 0, 0.14, 0.07, 0.1);
    const mesh = own(m); mesh.scale.setScalar(SG); mesh.position.y = TURT_LOW * SG; g.add(mesh);
    return { glowY: 0.9, hitR: 0.9 };
  }, wx('turtle'), wz('turtle'), 0, 0xdff5b0);
  items.turtle.group.rotation.y = -0.5;
  items.turtle.dur = 2.6;
  items.turtle.react = (it, p) => {
    const b = it.group.children[0];
    if (p >= 1) { b.position.y = TURT_LOW * SG; b.rotation.set(0, 0, 0); return; }
    const up = bump(Math.min(1, p / 0.9));   // rises, stays up a moment, sinks back
    const lift = Math.min(1, up * 1.6);
    b.position.y = (TURT_LOW + (TURT_HIGH - TURT_LOW) * lift) * SG;
    b.rotation.y = Math.sin(p * Math.PI * 3) * 0.7 * lift;              // looks left and right
    b.rotation.z = Math.sin(p * Math.PI * 8) * 0.05 * lift;
  };
  items.turtle.onTap = () => { splT = 0; };

  // 6. Porch lantern: a little glass lantern hanging by the porch steps. It swings and glows brighter, and warm sparks drift up.
  const LAMP_HANG = 2.55;   // height of the hook (the arm's end)
  items.lantern = addTappable((g) => {
    const m = makeMerger(THREE);   // hangs from the origin (the hook) at the top
    m.add(geoPole, 0x4a3a2a, 0, -0.2, 0, 0, 0, 0, 0.012, 0.4, 0.012);                                      // chain
    m.add(geoCone, 0x3a2f26, 0, -0.45, 0, 0, 0, 0, 0.17, 0.12, 0.17);                                       // cap
    m.add(geoBox, 0xffd57a, 0, -0.64, 0, 0, 0, 0, 0.22, 0.28, 0.22);                                       // glass (glows)
    m.add(geoBall, 0xfff3c4, 0, -0.64, 0, 0, 0, 0, 0.07, 0.1, 0.07);                                        // the flame
    m.add(geoBox, 0x3a2f26, 0, -0.81, 0, 0, 0, 0, 0.26, 0.05, 0.26);                                        // base
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.add(geoPole, 0x3a2f26, x * 0.11, -0.64, z * 0.11, 0, 0, 0, 0.012, 0.3, 0.012);   // frame
    const mesh = own(m, glowMat); mesh.scale.setScalar(SG); mesh.position.y = LAMP_HANG * SG; g.add(mesh);
    return { glowY: 1.5, hitR: 0.85 };
  }, wx('lantern'), wz('lantern'), 0, 0xffe6a0);
  items.lantern.group.rotation.y = 0;
  items.lantern.dur = 2.6;
  items.lantern.react = (it, p) => {
    const b = it.group.children[0], f = p >= 1 ? 0 : (1 - p) * (1 - p);
    b.rotation.z = Math.sin(p * Math.PI * 8) * 0.38 * f;
    b.rotation.x = Math.sin(p * Math.PI * 6 + 1) * 0.12 * f;
  };
  items.lantern.onTap = () => { sparkT = 0; };

  // Secret: the tally board, then the baskets. world.js calls onSecretTap('tally-board') and ('tally-9' / 'tally-5' / 'tally-7');
  // each also glows when tapped, so the board and the basket light up.
  items.board = addTappable(() => ({ glowY: 1.7, hitR: 1.05 }), wx('board'), wz('board'), 0, 0xfff1c8, 'tally-board');
  items.board.onTap = () => { glowT[0] = 1.6; };
  TALLY_BASKETS.forEach((n, i) => {
    const k = 'basket' + n;
    items[k] = addTappable(() => ({ glowY: 0.7, hitR: 0.7 }), wx(k), wz(k), 0, 0xfff1c8, 'tally-' + n);
    items[k].onTap = () => { glowT[1 + i] = 1.4; };
  });
  for (const it of Object.values(items)) { it.baseYaw = it.group.rotation.y; }

  const reedX = wx('reeds'), reedZ = wz('reeds'), lilyX = wx('lily'), lilyZ = wz('lily'), boatX = wx('boat'), boatZ = wz('boat');
  const turtX = wx('turtle'), turtZ = wz('turtle'), chairX = wx('chair'), chairZ = wz('chair');
  const lampMesh = items.lantern.group.children[0];

  function update(t, dt) {
    if (calmMotion) return; // calm motion: taps glow only; nothing here moves
    // Fireflies drift in slow loops and glow gently (never a flash).
    for (let i = 0; i < N_AMB; i++) {
      const f = FLY[i], k = 0.55 + 0.45 * Math.sin(t * 0.8 + f.ph * 3);
      put(AMB_AT + i, f.x + Math.sin(t * 0.37 + f.ph) * 0.7, f.y + Math.sin(t * 0.6 + f.ph * 2) * 0.28, f.z + Math.cos(t * 0.31 + f.ph) * 0.7, k, FLY_TINT[0], FLY_TINT[1], FLY_TINT[2]);
    }
    // Lantern halo: it breathes slowly, flares when tapped, and swings with the lantern.
    let lamp = 1 + 0.15 * Math.sin(t * 1.1);
    if (sparkT >= 0) lamp += 0.6 * bump(sparkT / 1.4);
    putHalo(HALOS[0], 0, HALOS[0].base * lamp, Math.sin(lampMesh.rotation.z) * 0.64, 0);
    glowMat.color.setScalar(0.92 + 0.05 * Math.sin(t * 1.2) + (sparkT >= 0 ? 0.03 : 0));
    for (let s = 0; s < 4; s++) {   // board and baskets light up when tapped
      const h = HALOS[1 + s];
      putHalo(h, 1 + s, h.base + (glowT[s] > 0 ? 0.8 * Math.min(1, glowT[s]) : 0));
      if (glowT[s] > 0) glowT[s] = Math.max(0, glowT[s] - dt);
    }
    if (swirlT >= 0) {   // fireflies spiral up out of the reeds
      swirlT += dt;
      for (let i = 0; i < N_SWIRL; i++) {
        const pt = (swirlT - i * 0.12) / 1.7;
        if (pt <= 0 || pt >= 1) { park(SWIRL_AT + i); continue; }
        const a = i * 0.9 + pt * Math.PI * 5, r = 0.25 + pt * 0.9;
        put(SWIRL_AT + i, reedX + Math.cos(a) * r, 0.3 + pt * 2.4, reedZ + Math.sin(a) * r * 0.8, bump(pt) * 1.0, 1, 0.95, 0.42);
      }
      if (swirlT > N_SWIRL * 0.12 + 1.8) { swirlT = -1; for (let i = 0; i < N_SWIRL; i++) park(SWIRL_AT + i); }
    }
    if (ripT >= 0) {   // two rings of ripples spread over the pads
      ripT += dt;
      for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 6; k++) {
        const i = ring * 6 + k, pt = (ripT - ring * 0.5) / 1.5;
        if (pt <= 0 || pt >= 1) { park(RIP_AT + i); continue; }
        const a = (k / 6) * Math.PI * 2 + ring * 0.5, r = 0.5 + pt * 1.9;
        put(RIP_AT + i, lilyX + Math.cos(a) * r, 0.1, lilyZ + Math.sin(a) * r * 0.85, bump(pt) * 0.8, 0.7, 1, 0.9);
      }
      if (ripT > 2.2) { ripT = -1; for (let i = 0; i < N_RIP; i++) park(RIP_AT + i); }
    }
    if (budT >= 0) {   // pink sparkles lift from the opening flower
      budT += dt;
      for (let i = 0; i < N_BUD; i++) {
        const pt = (budT - 0.3 - i * 0.14) / 1.1;
        if (pt <= 0 || pt >= 1) { park(BUD_AT + i); continue; }
        const a = i * 1.1, r = 0.15 + 0.35 * (i % 3) / 2;
        put(BUD_AT + i, lilyX + Math.cos(a) * r, 0.7 + pt * 1.0, lilyZ + Math.sin(a) * r * 0.7, bump(pt) * (0.7 + 0.3 * Math.sin(pt * 40)), 1, 0.65, 0.82);
      }
      if (budT > N_BUD * 0.14 + 1.6) { budT = -1; for (let i = 0; i < N_BUD; i++) park(BUD_AT + i); }
    }
    if (sparkT >= 0) {   // warm sparks drift up from the lantern
      sparkT += dt;
      for (let i = 0; i < N_SPARK; i++) {
        const pt = (sparkT - i * 0.2) / 1.2;
        if (pt <= 0 || pt >= 1) { park(SPARK_AT + i); continue; }
        put(SPARK_AT + i, LAMP.x + Math.sin(pt * 6 + i * 1.7) * 0.35, LAMP.y + 0.1 + pt * 1.2, LAMP.z + 0.15 + Math.cos(pt * 5 + i) * 0.2, bump(pt) * 0.9, 1, 0.85, 0.4);
      }
      if (sparkT > N_SPARK * 0.2 + 1.4) { sparkT = -1; for (let i = 0; i < N_SPARK; i++) park(SPARK_AT + i); }
    }
    if (splT >= 0) {   // water drops arc up and out of the turtle's pool
      splT += dt;
      for (let i = 0; i < N_SPL; i++) {
        const pt = (splT - i * 0.05) / 1.0;
        if (pt <= 0 || pt >= 1) { park(SPL_AT + i); continue; }
        const a = i * 1.05, r = 0.25 + pt * 0.9;
        put(SPL_AT + i, turtX + Math.cos(a) * r, 0.2 + Math.sin(pt * Math.PI) * 0.9, turtZ + Math.sin(a) * r * 0.8, bump(pt), 0.75, 0.95, 1);
      }
      if (splT > N_SPL * 0.05 + 1.1) { splT = -1; for (let i = 0; i < N_SPL; i++) park(SPL_AT + i); }
    }
    if (bripT >= 0) {   // little rings spread round the rowboat
      bripT += dt;
      for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 3; k++) {
        const i = ring * 3 + k, pt = (bripT - ring * 0.5) / 1.4;
        if (pt <= 0 || pt >= 1) { park(BRIP_AT + i); continue; }
        const a = (k / 3) * Math.PI * 2 + ring, r = 0.9 + pt * 1.5;
        put(BRIP_AT + i, boatX + Math.cos(a) * r, 0.1, boatZ + Math.sin(a) * r * 0.8, bump(pt) * 0.75, 0.75, 1, 0.9);
      }
      if (bripT > 2.0) { bripT = -1; for (let i = 0; i < N_BRIP; i++) park(BRIP_AT + i); }
    }
    if (moteT >= 0) {   // warm motes float up from the rocking chair
      moteT += dt;
      for (let i = 0; i < N_MOTE; i++) {
        const pt = (moteT - i * 0.3) / 1.4;
        if (pt <= 0 || pt >= 1) { park(MOTE_AT + i); continue; }
        put(MOTE_AT + i, chairX + (i - 1.5) * 0.3 + Math.sin(pt * 5 + i) * 0.12, 1.2 + pt * 1.0, chairZ + 0.1, bump(pt) * 0.8, 1, 0.88, 0.5);
      }
      if (moteT > N_MOTE * 0.3 + 1.5) { moteT = -1; for (let i = 0; i < N_MOTE; i++) park(MOTE_AT + i); }
    }
    fxGeo.attributes.position.needsUpdate = true; fxGeo.attributes.color.needsUpdate = true;
  }

  // ---------------------------------------------------------------- static scenery (ONE merged mesh) + glowing parts (ONE mesh)
  const m = makeMerger(THREE), gm = makeMerger(THREE);
  const obst = [];   // [x, z, r] things the scattered reeds must stay away from
  const solid = (x, z, r, keep = true) => { addCollider(cx + x, cz + z, r); if (keep) obst.push([x, z, r]); };

  // Ground: golden-green grass with lighter and darker patches.
  m.add(geoDisc(48), COL.grass, 0, 0.03, 0, flat, 0, 0, 10.4);
  for (const [x, z, r] of [[-3, -2, 2.6], [7, 1, 2.0], [3, 7, 2.2], [-7, 4, 1.8], [8, -5, 1.5], [-2, 8, 1.4]]) m.add(geoDisc(20), COL.grass2, x, 0.032, z, flat, 0, 0, r);
  for (const [x, z, r] of [[-6.6, -5.2, 1.6], [2, -8, 1.5], [-5, 8, 1.3], [8, 5, 1.2]]) m.add(geoDisc(18), COL.grass3, x, 0.033, z, flat, 0, 0, r);

  // Water: a muddy bank, then green-brown water with a lighter middle, along the channel and the pool.
  {
    const water = [];   // [x, z, r]
    const pts = CHANNEL.pts;
    let s = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(len / 0.5));
      for (let k = 0; k < n; k++) {
        const u = k / n, r = CHANNEL.r - 0.2 + 0.2 * Math.sin((s + len * u) * 1.3);
        water.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, r]);
      }
      s += len;
    }
    const P = CHANNEL.pool;
    water.push([P.x, P.z, P.r], [P.x + 0.9, P.z - 0.6, P.r - 0.7], [P.x - 0.9, P.z + 0.5, P.r - 0.7]);
    for (const [x, z, r] of water) m.add(geoDisc(18), COL.mud, x, 0.034, z, flat, 0, 0, r + CHANNEL.mud);
    for (const [x, z, r] of water) m.add(geoDisc(18), COL.mud2, x, 0.036, z, flat, 0, 0, r + CHANNEL.mud * 0.45);
    for (const [x, z, r] of water) m.add(geoDisc(18), COL.water, x, 0.04, z, flat, 0, 0, r);
    for (const [x, z, r] of water) m.add(geoDisc(14), COL.water2, x, 0.044, z, flat, 0, 0, r * 0.55);
    for (const [x, z, sx] of [[-0.6, -6.6, 0.7], [-1.4, -3.3, 0.5], [-1.1, 0.0, 0.45], [-2.3, 5.2, 0.55], [0.6, -7.8, 0.45], [-4.4, 6.8, 0.5]]) {   // golden-hour glints
      m.add(geoDisc(10), COL.glint, x, 0.05, z, flat, 0, 0, sx, sx * 0.2, 1);
    }
  }

  // Lily pads (flat green discs, some with a tiny pink flower) on the pool and the channel. The tap flower is its own mesh.
  {
    const pads = [[-2.0, -5.6, 0.34], [-0.2, -6.2, 0.3], [0.3, -4.6, 0.36], [-1.6, -3.9, 0.3], [-1.2, -6.9, 0.26], [0.6, -5.7, 0.28], [-2.3, -4.7, 0.26],
      [-0.9, -2.8, 0.28], [-1.3, 2.9, 0.3], [-1.9, 4.6, 0.32], [-2.9, 5.6, 0.28], [-3.4, 6.4, 0.3], [-4.9, 6.2, 0.26], [0.2, -7.1, 0.28], [-0.3, 3.2, 0.26]];
    pads.forEach(([x, z, r], i) => {
      m.add(geoDisc(12), i % 2 ? COL.pad : COL.pad2, x, 0.052 + (i % 3) * 0.001, z, flat, 0, 0, r, r, 1);
      m.add(geoDisc(3), COL.water, x + r * 0.55, 0.054, z, flat, 0, i * 0.7, r * 0.5, r * 0.15, 1);   // the little notch
      if (i % 4 === 1) { m.add(geoBall, COL.lotus, x, 0.11, z, 0, 0, 0, 0.08, 0.06, 0.08); m.add(geoBall, COL.sun, x, 0.15, z, 0, 0, 0, 0.03); }
    });
  }

  // Boardwalk: planks across, side beams and posts, from the entrance to the cabin steps, with an arched bridge over the channel.
  {
    const z0 = BOARDWALK.z, hw = BOARDWALK.half;
    const archY = (x) => { const u = (BOARDWALK.bridge0 - x) / (BOARDWALK.bridge0 - BOARDWALK.bridge1); return u <= 0 || u >= 1 ? 0 : 0.5 * Math.sin(Math.PI * u); };
    const slopeAt = (x) => { const e = 0.05; return Math.atan2(archY(x - e) - archY(x + e), 2 * e); };
    let k = 0;
    for (let x = BOARDWALK.x0; x > BOARDWALK.x1; x -= 0.3, k++) {
      const y = 0.14 + archY(x);
      m.add(geoBox, k % 2 ? COL.plank : COL.plank2, x, y, z0, 0, 0, slopeAt(x), 0.27, 0.07, hw * 2);
    }
    for (const sz of [-1, 1]) {   // side beams (low), with a rail over the bridge
      m.add(geoBox, COL.woodDark, (BOARDWALK.x0 + BOARDWALK.x1) / 2, 0.1, z0 + sz * (hw - 0.04), 0, 0, 0, BOARDWALK.x0 - BOARDWALK.x1, 0.08, 0.08);
      const bridgeLen = BOARDWALK.bridge0 - BOARDWALK.bridge1;
      for (let i = 0; i <= 8; i++) {
        const x = BOARDWALK.bridge0 - bridgeLen * i / 8, y = 0.14 + archY(x);
        m.add(geoPole, COL.wood2, x, y + 0.45, z0 + sz * hw, 0, 0, 0, 0.04, 0.9, 0.04);                           // rail posts
      }
      for (let i = 0; i < 8; i++) {                                                                                  // handrail in short slanted pieces
        const xa = BOARDWALK.bridge0 - bridgeLen * i / 8, xb = BOARDWALK.bridge0 - bridgeLen * (i + 1) / 8;
        const ya = 0.14 + archY(xa) + 0.88, yb = 0.14 + archY(xb) + 0.88;
        m.add(geoBox, COL.wood, (xa + xb) / 2, (ya + yb) / 2, z0 + sz * hw, 0, 0, Math.atan2(yb - ya, xb - xa), Math.hypot(xb - xa, yb - ya) + 0.03, 0.06, 0.06);
      }
    }
    // string-light posts beside the dry stretch of boardwalk (the bulbs glow)
    for (const x of [4.4, 2.9, -3.7]) {
      m.add(geoPole, COL.wood2, x, 0.6, z0 - hw - 0.05, 0, 0, 0, 0.045, 1.2, 0.045);
      gm.add(geoBall, 0xffe7a0, x, 1.25, z0 - hw - 0.05, 0, 0, 0, 0.1);
    }
    for (let i = 0; i < 8; i++) {   // bulbs on the bridge posts
      const x = BOARDWALK.bridge0 - (BOARDWALK.bridge0 - BOARDWALK.bridge1) * i / 7, y = 0.14 + archY(x);
      gm.add(geoBall, 0xffe7a0, x, y + 0.98, z0 - hw, 0, 0, 0, 0.065);
    }
    // the steps up to the porch
    for (let i = 0; i < 3; i++) m.add(geoBox, COL.plank, BOARDWALK.x1 - 0.2 - i * 0.25, 0.2 + i * 0.17, z0 + 0.1, 0, 0, 0, 0.3, 0.07, hw * 2 - 0.2);
    // (the bridge itself is open: Zoe may cross it, or wade round)
  }

  // Cabin on stilts: a wooden floor and porch, tan board walls, a green door, glowing windows, a teal tin roof, a stone chimney, steps, rails.
  {
    const [cabX, cabZ] = BAYOU_STATICS.cabin, W = 3.0, Dp = 2.4, H = 1.75, y0 = DECK.y;
    const dx = (DECK.x0 + DECK.x1) / 2, dz = (DECK.z0 + DECK.z1) / 2, dw = DECK.x1 - DECK.x0, dd = DECK.z1 - DECK.z0;
    for (const x of [DECK.x0 + 0.2, DECK.x1 - 0.2, dx]) for (const z of [DECK.z0 + 0.2, dz, DECK.z1 - 0.2]) m.add(geoPole, COL.trunk2, x, y0 / 2, z, 0, 0, 0, 0.1, y0, 0.1);   // stilts
    m.add(geoBox, COL.woodDark, dx, y0 - 0.08, dz, 0, 0, 0, dw + 0.1, 0.16, dd + 0.1);                                     // frame
    let k = 0;
    for (let x = DECK.x0 + 0.1; x < DECK.x1; x += 0.3, k++) m.add(geoBox, k % 2 ? COL.plank : COL.plank2, x + 0.15, y0 + 0.02, dz, 0, 0, 0, 0.27, 0.06, dd);   // floor planks
    // walls (vertical boards) and the gable roof
    m.add(geoBox, COL.cabin, cabX, y0 + H / 2, cabZ, 0, 0, 0, W, H, Dp);
    for (let i = 0; i <= 8; i++) m.add(geoBox, COL.cabin2, cabX - W / 2 + i * W / 8, y0 + H / 2, cabZ + Dp / 2 + 0.01, 0, 0, 0, 0.04, H, 0.03);   // board lines on the front
    const hw2 = W / 2 + 0.25, a = 0.75, ridge = Math.tan(a) * hw2, baseY = y0 + H;
    for (const sx of [-1, 1]) m.add(geoBox, sx > 0 ? COL.roof : COL.roof2, cabX + sx * hw2 / 2, baseY + ridge / 2 + 0.04, cabZ, 0, 0, -sx * a, hw2 / Math.cos(a) + 0.1, 0.09, Dp + 0.5);
    m.add(geoBox, COL.woodDark, cabX, baseY + ridge + 0.06, cabZ, 0, 0, 0, 0.12, 0.1, Dp + 0.55);
    for (const sz of [-1, 1]) m.add(geoTriUp, COL.cabin, cabX, baseY, cabZ + sz * (Dp / 2 + 0.01), 0, 0, 0, W / 2, ridge, 1);
    // front door and windows (on the porch side, facing south)
    const fz = cabZ + Dp / 2;
    m.add(geoBox, COL.door, cabX, y0 + 0.5, fz + 0.03, 0, 0, 0, 0.62, 1.0, 0.06);
    m.add(geoBox, COL.white, cabX, y0 + 1.05, fz + 0.04, 0, 0, 0, 0.76, 0.07, 0.07);
    m.add(geoBall, COL.sun, cabX + 0.2, y0 + 0.5, fz + 0.08, 0, 0, 0, 0.04);
    for (const sx of [-1, 1]) {
      const wxp = cabX + sx * 1.0, wy = y0 + 1.0;
      m.add(geoBox, COL.white, wxp, wy, fz + 0.03, 0, 0, 0, 0.58, 0.52, 0.05);
      gm.add(geoBox, 0xffdc8a, wxp, wy, fz + 0.065, 0, 0, 0, 0.46, 0.4, 0.03);                                           // glowing window
      m.add(geoBox, COL.white, wxp, wy, fz + 0.085, 0, 0, 0, 0.04, 0.4, 0.03);
      m.add(geoBox, COL.white, wxp, wy, fz + 0.085, 0, 0, 0, 0.46, 0.04, 0.03);
      m.add(geoBox, COL.wood2, wxp, wy - 0.33, fz + 0.14, 0, 0, 0, 0.62, 0.14, 0.2);                                    // flower box
      [0xff8fb0, 0xffe27a, 0xffffff, 0xff8fb0].forEach((c, i) => m.add(geoBall, c, wxp - 0.21 + i * 0.14, wy - 0.22, fz + 0.15, 0, 0, 0, 0.06));
    }
    m.add(geoBox, COL.stone2, cabX + 1.05, baseY + ridge * 0.55, cabZ - 0.5, 0, 0, 0, 0.34, ridge * 0.9 + 0.4, 0.34);        // chimney
    // porch rails (low, so the chair stays in view) and the lantern post
    for (const [x, z] of [[DECK.x0 + 0.05, DECK.z1 - 0.05], [DECK.x0 + 0.05, -1.2]]) m.add(geoPole, COL.wood2, x, y0 + 0.3, z, 0, 0, 0, 0.04, 0.6, 0.04);
    m.add(geoBox, COL.wood, DECK.x0 + 0.05, y0 + 0.58, (DECK.z1 + -1.2) / 2, 0, 0, 0, 0.05, 0.05, DECK.z1 + 1.2);
    for (const x of [-7.4, -6.6, -5.8]) m.add(geoPole, COL.wood2, x, y0 + 0.2, DECK.z1 - 0.05, 0, 0, 0, 0.03, 0.4, 0.03);
    m.add(geoBox, COL.wood, (DECK.x0 + 0.05 + DECK.x1) / 2 - 0.2, y0 + 0.4, DECK.z1 - 0.05, 0, 0, 0, dw - 0.7, 0.04, 0.04);
    const lp = BAYOU_SPOTS.lantern;
    m.add(geoPole, COL.wood2, lp[0] + 0.5, y0 + 1.0, lp[1], 0, 0, 0, 0.05, 2.0, 0.05);                                     // lantern post
    m.add(geoBox, COL.wood2, lp[0] + 0.25, LAMP_HANG + 0.05, lp[1], 0, 0, 0, 0.58, 0.05, 0.05);                              // its arm (the lantern hangs from the far end)
    m.add(geoBall, COL.sun, lp[0] + 0.5, y0 + 2.05, lp[1], 0, 0, 0, 0.07);
    solid(cabX, cabZ, 1.45);
  }

  // Vegetable stand: a long counter with crates, two posts, a green tally board with chalk marks, and three baskets of vegetables in front.
  {
    const [sx, sz] = BAYOU_STATICS.stand;
    const x0 = 2.3, x1 = 7.7;
    m.add(geoBox, COL.wood2, (x0 + x1) / 2, 0.45, sz + 0.1, 0, 0, 0, x1 - x0, 0.9, 0.8);                              // counter
    m.add(geoBox, COL.wood, (x0 + x1) / 2, 0.93, sz + 0.1, 0, 0, 0, x1 - x0 + 0.15, 0.07, 0.9);                         // top
    for (const x of [3.7, 6.3]) {                                                                                        // posts for the board
      m.add(geoPole, COL.wood2, x, 1.35, sz - 0.35, 0, 0, 0, 0.06, 2.7, 0.06);
      m.add(geoBall, COL.sun, x, 2.75, sz - 0.35, 0, 0, 0, 0.08);
    }
    const bx = BAYOU_SPOTS.board[0], bz = BAYOU_SPOTS.board[1], by = 2.0;
    m.add(geoBox, COL.wood, bx, by, bz, 0, 0, 0, 2.6, 1.3, 0.07);                                                        // board frame
    m.add(geoBox, COL.board, bx, by, bz + 0.045, 0, 0, 0, 2.4, 1.1, 0.04);                                               // green slate
    // the chalk tally marks: the groups for TALLY_TARGET, drawn as simple boxes (four lines and a slash, then single lines)
    {
      const groups = tallyMarks(TALLY_TARGET), sp = 0.2, gap = 0.55, mh = 0.72, th = 0.075;
      const widths = groups.map((g) => (g.lines - 1) * sp);
      const total = widths.reduce((s, w) => s + w, 0) + gap * (groups.length - 1);
      let cur = bx - total / 2;
      groups.forEach((g, gi) => {
        for (let i = 0; i < g.lines; i++) gm.add(geoBox, COL.chalk, cur + i * sp, by, bz + 0.085, 0, 0, 0, th, mh, 0.03);
        if (g.slash) gm.add(geoBox, COL.chalk, cur + widths[gi] / 2, by, bz + 0.1, 0, 0, Math.atan2(mh * 0.8, widths[gi] + 0.2), Math.hypot(widths[gi] + 0.2, mh * 0.8), th * 0.9, 0.03);   // the slash across the four lines
        cur += widths[gi] + gap;
      });
    }
    // crates of vegetables on the counter
    [[3.2, COL.cabbage], [4.4, COL.tomato], [5.7, COL.carrot], [7.0, COL.squash]].forEach(([x, c], i) => {
      m.add(geoBox, COL.wood, x, 1.1, sz + 0.1, 0, 0, 0, 0.9, 0.22, 0.6);
      for (let k = 0; k < 4; k++) m.add(i === 2 ? geoCone : geoBall, c, x - 0.28 + k * 0.19, 1.28, sz + 0.1 + ((k % 2) - 0.5) * 0.15, i === 2 ? Math.PI : 0, 0, 0, 0.11, i === 2 ? 0.28 : 0.11, 0.11);
    });
    // a low plank bench in front, with the three baskets on it
    m.add(geoBox, COL.wood2, (x0 + x1) / 2, 0.17, BAYOU_SPOTS.basket5[1], 0, 0, 0, x1 - x0 - 0.2, 0.08, 0.95);
    for (const x of [x0 + 0.3, x1 - 0.3]) for (const dz of [-0.35, 0.35]) m.add(geoBox, COL.woodDark, x, 0.08, BAYOU_SPOTS.basket5[1] + dz, 0, 0, 0, 0.1, 0.16, 0.1);
    const itemCols = { 9: [COL.squash, 0xe9b93a], 5: [COL.tomato, 0xc93a30], 7: [COL.plum, 0x8a5aa8] };
    TALLY_BASKETS.forEach((n) => {
      const [bkx, bkz] = BAYOU_SPOTS['basket' + n];
      m.add(geoPole, 0xc99a58, bkx, 0.4, bkz, 0, 0, 0, 0.5, 0.3, 0.5);                                                  // basket
      m.add(geoPole, 0xa87a3e, bkx, 0.56, bkz, 0, 0, 0, 0.53, 0.05, 0.53);                                              // rim
      m.add(geoDisc(16), COL.soil, bkx, 0.575, bkz, flat, 0, 0, 0.47, 0.47, 1);                                           // dark inside
      const rows = tallyRows(n), cols = itemCols[n];
      rows.forEach((cnt, r) => {
        const z = bkz + (r - (rows.length - 1) / 2) * 0.27;
        for (let i = 0; i < cnt; i++) {
          const x = bkx + (i - (cnt - 1) / 2) * 0.25;
          m.add(geoBall, (i + r) % 2 ? cols[0] : cols[1], x, 0.7, z, 0, 0, 0, 0.115, 0.11, 0.115);
        }
      });
    });
    // the stand's two outer ends are solid
    solid(2.9, sz + 0.1, 0.7); solid(7.1, sz + 0.1, 0.7);
  }

  // Vegetable garden: a low fence round a raised bed with rows of cabbages, staked tomatoes, carrot tops and pumpkins.
  {
    const gx = GARDEN_PATCH.x, gz = GARDEN_PATCH.z, hx = GARDEN_PATCH.hx, hz = GARDEN_PATCH.hz;
    m.add(geoBox, COL.soil, gx, 0.08, gz, 0, 0, 0, hx * 2, 0.1, hz * 2);
    for (const sz of [-1, 1]) m.add(geoBox, COL.wood, gx, 0.2, gz + sz * hz, 0, 0, 0, hx * 2 + 0.1, 0.18, 0.08);
    for (const sx of [-1, 1]) m.add(geoBox, COL.wood, gx + sx * hx, 0.2, gz, 0, 0, 0, 0.08, 0.18, hz * 2);
    for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) { m.add(geoPole, COL.wood2, gx - hx + i * (hx * 2 / 5), 0.3, gz + sz * hz, 0, 0, 0, 0.04, 0.6, 0.04); }
    for (let i = 0; i < 5; i++) {                                                                                         // cabbages
      const x = gx - hx + 0.5 + i * 0.95;
      m.add(geoBall, i % 2 ? COL.cabbage : COL.cabbage2, x, 0.27, gz - 0.9, 0, 0, 0, 0.26, 0.2, 0.26);
      m.add(geoBall, COL.cabbage, x, 0.34, gz - 0.9, 0, 0, 0, 0.17, 0.12, 0.17);
    }
    for (let i = 0; i < 4; i++) {                                                                                         // staked tomatoes
      const x = gx - hx + 0.7 + i * 1.2;
      m.add(geoPole, COL.wood, x, 0.6, gz - 0.05, 0, 0, 0, 0.025, 1.1, 0.025);
      m.add(geoBall, 0x4f9a4f, x, 0.55, gz - 0.05, 0, 0, 0, 0.2, 0.34, 0.2);
      for (const [dx, dy] of [[0.12, 0.4], [-0.1, 0.65], [0.1, 0.85]]) m.add(geoBall, COL.tomato, x + dx, dy, gz + 0.05, 0, 0, 0, 0.08);
    }
    for (let i = 0; i < 4; i++) {                                                                                         // carrot tops and pumpkins
      const x = gx - hx + 0.6 + i * 0.7;
      for (const dx of [-0.08, 0, 0.08]) m.add(geoCone, 0x5fae4f, x + dx, 0.32, gz + 0.9, dx * 3, 0, -dx * 3, 0.05, 0.3, 0.05);
      m.add(geoBall, COL.carrot, x, 0.2, gz + 0.9, 0, 0, 0, 0.05, 0.03, 0.05);
    }
    for (const x of [gx + 1.6, gx + 2.0]) { m.add(geoBall, COL.pumpkin, x, 0.28, gz + 0.85, 0, 0, 0, 0.22, 0.17, 0.22); m.add(geoPole, 0x4f8a3e, x, 0.46, gz + 0.85, 0, 0, 0, 0.03, 0.1, 0.03); }
  }

  // A mailbox on a post beside the boardwalk (plain: a green box with a little red flag, no writing).
  {
    const [mx, mz] = BAYOU_STATICS.mailbox;
    m.add(geoPole, COL.wood2, mx, 0.55, mz, 0, 0, 0, 0.05, 1.1, 0.05);
    m.add(geoBox, 0x4d8a5a, mx, 1.18, mz, 0, 0, 0, 0.5, 0.26, 0.28);
    m.add(geoBall, 0x4d8a5a, mx, 1.31, mz, 0, 0, 0, 0.25, 0.1, 0.14);
    m.add(geoBox, 0xe5483c, mx + 0.28, 1.34, mz + 0.05, 0, 0, 0, 0.04, 0.2, 0.04);
    m.add(geoBox, 0xe5483c, mx + 0.34, 1.42, mz + 0.05, 0, 0, 0, 0.12, 0.07, 0.04);
    solid(mx, mz, 0.25, false);
  }

  // Cypress trees: a flared trunk, layered flat tops of feathery green, knees by the water, and long strands of hanging moss.
  CYPRESS.forEach(([x, z, size], i) => {
    const s = size || 0.95 + (i % 3) * 0.12, tall = 4.3 * s;
    m.add(geoCone, COL.trunk, x, 1.2 * s, z, 0, i, 0, 0.62 * s, 2.4 * s, 0.62 * s);                         // flared trunk
    m.add(geoCone, COL.trunk2, x, 2.6 * s, z, 0, i + 1, 0, 0.3 * s, 2.0 * s, 0.3 * s);                       // upper trunk
    const canopy = [[0, tall - 0.5, 0, 1.55, 0.5, COL.leaf], [0.35, tall + 0.1, -0.15, 1.15, 0.42, COL.leaf2], [-0.2, tall + 0.65, 0.2, 0.75, 0.38, COL.leaf3], [-0.9, tall - 0.9, 0.4, 0.8, 0.34, COL.leaf3], [0.95, tall - 0.8, -0.3, 0.85, 0.34, COL.leaf2]];
    for (const [dx, y, dz, r, sy, c] of canopy) m.add(geoBall, c, x + dx * s, y, z + dz * s, 0, 0, 0, r * s, sy * s, r * s);
    for (let k = 0; k < 6; k++) {                                                                            // moss strands
      const a = k * 1.05 + i, rr = (0.9 + (k % 2) * 0.4) * s, len = (0.7 + (k % 3) * 0.25) * s;
      m.add(geoCone, k % 2 ? COL.moss : COL.moss2, x + Math.cos(a) * rr, tall - 0.8 - len / 2, z + Math.sin(a) * rr, Math.PI, 0, 0, 0.09 * s, len, 0.09 * s);
    }
    for (let k = 0; k < 3; k++) {                                                                            // knees
      const a = i * 2.1 + k * 2.2, rr = (0.9 + k * 0.2) * s;
      m.add(geoCone, COL.trunk2, x + Math.cos(a) * rr, 0.2, z + Math.sin(a) * rr, 0, 0, 0, 0.1, 0.4 - 0.08 * k, 0.1);
    }
    solid(x, z, 0.5 * s + 0.1);
  });

  // Reeds and cattails along both banks of the channel and round the pool, kept off the boardwalk, the stand, the porch and the pad.
  {
    let placed = 0;
    const pts = CHANNEL.pts, near = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(len / 0.9);
      for (let k = 0; k < n; k++) near.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, (b[1] - a[1]) / len, -(b[0] - a[0]) / len]);   // point + unit normal
    }
    near.forEach(([x, z, nx, nz], i) => {
      for (const side of [-1, 1]) {
        const off = CHANNEL.r + 0.55 + ((i * 7 + (side > 0 ? 3 : 0)) % 5) * 0.12;
        const rx = x + nx * side * off, rz = z + nz * side * off;
        if (Math.hypot(rx, rz) > 9.2) continue;
        if (Math.abs(rz - BOARDWALK.z) < 1.4 && rx > BOARDWALK.x1 - 0.5 && rx < BOARDWALK.x0) continue;                       // the boardwalk and bridge
        if (rx > 1.5 && rx < 8.6 && rz < -2.4 && rz > -6.6) continue;                                                           // the stand
        if (rx < -4.3 && rx > -8.4 && rz < 1.5 && rz > -4.2) continue;                                                         // the cabin and porch
        if (Math.hypot(rx - padL.x, rz - padL.z) < 2.0) continue;
        if (obst.some(([ox, oz, or]) => Math.hypot(rx - ox, rz - oz) < or + 0.5)) continue;
        if (Object.values(BAYOU_SPOTS).some(([sx, sz]) => Math.hypot(rx - sx, rz - sz) < 1.1) && Math.hypot(rx - BAYOU_SPOTS.reeds[0], rz - BAYOU_SPOTS.reeds[1]) > 0.1) continue;
        placed++;
        const h = 0.9 + ((i + placed) % 4) * 0.2;
        for (let k = 0; k < 4; k++) {
          const a = k * 1.6 + placed, d = 0.12 + (k % 2) * 0.08;
          m.add(geoCone, k % 2 ? COL.reed : COL.reed2, rx + Math.cos(a) * d, h * 0.5, rz + Math.sin(a) * d, Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16, 0.035, h * (0.8 + 0.1 * k), 0.035);
        }
        if (placed % 2 === 0) {   // a cattail: a stem with a brown sausage-shaped head
          m.add(geoPole, COL.reed2, rx + 0.05, 0.65, rz - 0.05, 0, 0, 0.04, 0.012, 1.3, 0.012);
          m.add(geoPole, COL.cattail, rx + 0.07, 1.22, rz - 0.05, 0, 0, 0.04, 0.045, 0.3, 0.045);
        }
      }
    });
    // the tap reeds: a thick, tall tuft (the fireflies come out of it)
    const [tx, tz] = BAYOU_SPOTS.reeds;
    for (let k = 0; k < 14; k++) {
      const a = k * 0.9, d = 0.15 + (k % 4) * 0.12, h = 1.1 + (k % 5) * 0.14;
      m.add(geoCone, k % 2 ? COL.reed : COL.reed2, tx + Math.cos(a) * d, h * 0.5, tz + Math.sin(a) * d, Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2, 0.04, h, 0.04);
    }
    for (let k = 0; k < 3; k++) {
      m.add(geoPole, COL.reed2, tx + (k - 1) * 0.28, 0.75, tz + 0.2, 0, 0, (k - 1) * 0.05, 0.013, 1.5, 0.013);
      m.add(geoPole, COL.cattail, tx + (k - 1) * 0.28 + (k - 1) * 0.04, 1.42, tz + 0.2, 0, 0, (k - 1) * 0.05, 0.05, 0.34, 0.05);
    }
  }

  // Grass tufts, a few mossy stones and logs, and little flowers dotted in the grass.
  {
    let placed = 0;
    const cols = [0xfff2a0, 0xffffff, 0xf6a8c8, 0xffd36a];
    for (let i = 0; i < 200 && placed < 40; i++) {
      const a = i * 2.399 + 0.9, r = 1.5 + ((i * 53) % 74) / 10;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (r > 8.8 || bayouWet(x, z)) continue;
      if (Math.abs(z - BOARDWALK.z) < 1.2 && x > BOARDWALK.x1 - 0.5 && x < BOARDWALK.x0 + 1) continue;
      if (x > 1.5 && x < 8.6 && z < -2.2 && z > -6.6) continue;
      if (x < -4.3 && x > -8.4 && z < 1.5 && z > -4.2) continue;
      if (inGarden(x, z) || Math.hypot(x - padL.x, z - padL.z) < 1.6) continue;
      if (obst.some(([ox, oz, or]) => Math.hypot(x - ox, z - oz) < or + 0.6)) continue;
      if (Object.values(BAYOU_SPOTS).some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 1.0)) continue;
      placed++;
      if (placed % 3 === 0) {
        m.add(geoPole, 0x4f9a4f, x, 0.1, z, 0, 0, 0, 0.012, 0.2, 0.012);
        m.add(geoBall, cols[placed % 4], x, 0.22, z, 0, 0, 0, 0.07, 0.04, 0.07);
      } else {
        for (const d of [-0.07, 0, 0.07]) m.add(geoCone, d ? COL.reed : COL.grass2, x + d, 0.12, z, d * 3, 0, -d * 3, 0.03, 0.26, 0.03);
      }
    }
    for (const [x, z, s] of [[-3.4, -3.2, 0.5], [3.2, 2.6, 0.4], [7.6, -7.0, 0.5], [-7.4, 7.0, 0.45]]) {
      m.add(geoRock, COL.stone, x, 0.2 * s + 0.1, z, 0, x, 0, s, 0.6 * s, 0.8 * s);
      m.add(geoBall, COL.leaf2, x, 0.5 * s + 0.12, z, 0, 0, 0, s * 0.8, 0.12 * s, s * 0.7);   // a mossy cap
      if (Math.hypot(x, z) < 9) solid(x, z, s * 0.9);
    }
  }

  const scenery = new THREE.Mesh(m.build(), vcMat);
  scenery.position.set(cx, 0, cz);
  scene.add(scenery);
  const glowParts = new THREE.Mesh(gm.build(), glowMat);
  glowParts.position.set(cx, 0, cz);
  scene.add(glowParts);

  const dry = (x, z) => !bayouWet(x - cx, z - cz) && !inGarden(x - cx, z - cz) && Math.hypot(x - cx, z - cz) < BAYOU_R - 0.6;
  return {
    update,
    wet: (x, z) => bayouWet(x - cx, z - cz),
    dry,
    /** Where a find goes: the wished-for world spot if it is free and dry, else the nearest such spot on a fine grid (so it always lands
     * close by, inside the bayou). `free(x, z)` is world.js's clear-ground test. Never throws. */
    settle(x0, z0, free) {
      const good = (x, z) => dry(x, z) && free(x, z);
      if (good(x0, z0)) return [x0, z0];
      let best = null, bd = Infinity;
      for (let gx = -BAYOU_R; gx <= BAYOU_R; gx += 0.5) for (let gz = -BAYOU_R; gz <= BAYOU_R; gz += 0.5) {
        const x = cx + gx, z = cz + gz;
        if (!good(x, z)) continue;
        const d = Math.hypot(x - x0, z - z0);
        if (d < bd) { bd = d; best = [x, z]; }
      }
      return best || [cx + padL.x * 0.5, cz + padL.z * 0.5 + 2];
    },
  };
}
