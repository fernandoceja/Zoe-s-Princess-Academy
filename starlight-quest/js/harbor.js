// ============================================================================
// Zoe's Starlight Quest — Sunny Fjord Harbor (K10). An original, sunny little harbor town on a fjord: a blue water inlet with a
// wooden dock and a few plain-coloured boats, bright cottages and a boathouse with steep roofs and flower boxes, a striped
// lighthouse on a rocky point, a market stall with fish and bread, bunting, rocks and pine trees. It sits right beside Frostfall
// Peaks, so it is made warm and summery on purpose: green grass, sand, golden light and warm colours.
// Six tap surprises and one secret (three harbor flags: a capital letter, some words, an end mark . ? !).
// Built by world.js ONLY when the harbor slot is "open" (worldmap.js isHarborOpen): built for real (K11), or ?preview=harbor.
//
// The scene lighting is shared daylight: no lights, no shadow maps, no new assets. Glowing bits (lighthouse lamp, flag cloth
// and signs, cottage windows) use an unlit vertex-colour material, like the garden's lanterns.
//
// Draw-call budget (rest state), checked by tests/harbor_check.mjs:
//   1 static scenery mesh (ground, sand, water, dock, boats, cottages, lighthouse, market, bunting, pines, rocks, flowers: merged)
//   1 glowing parts mesh (lamp, windows, the three flag signs: unlit vertex colours)
//   1 boat that bobs and toots · 1 bunting that flutters · 1 gull that hops · 1 flower box that blooms · 1 dock bell
//   1 shared glow Points (lamp halo, flag glows, lighthouse sweep, toot puffs, petals, bell notes, confetti, feathers)
//   = 8 (limit 8). Tap hit-boxes use invisible materials; glow sprites only draw during a reaction.
// Geometry/materials come from world.js's G()/M() caches (same keys as the cove where the shape is the same).
// All motion is skipped under calmMotion (a tap then only glows; the lamp halo stays still).
// ============================================================================

import { makeMerger } from './cove.js?v=20261027e2';

// Harbor layout, in metres from the harbor centre (x east, z south). The entrance (branch path) is to the WEST, where Anna's pad is;
// the camera looks north, so the fjord opens out beyond the dock at the top of the screen.
export const HARBOR_R = 9.6;   // props and finds stay inside this radius (the grass disc is a little bigger)
export const HARBOR_SPOTS = {
  lighthouse: [7.6, -1.6],   // tap: the lamp sweeps and blinks
  boat: [6.2, -6.2],         // tap: the red boat bobs and toots
  bunting: [-3.6, 3.4],      // tap: the flags flutter
  gull: [4.6, -8.2],         // tap: the gull hops on its post
  flowerbox: [5.8, 2.8],     // tap: the flower box blooms
  bell: [5.0, -2.1],         // tap: the dock bell rings
  flag1: [-3.6, -1.3], flag2: [-1.6, -1.3], flag3: [0.4, -1.3],   // the secret: a capital letter, then words, then an end mark
};
export const HARBOR_STATICS = {
  boathouse: [-5.6, -3.3], market: [1.4, 2.7], cottageA: [-2.8, 5.8], cottageB: [0.9, 6.6], cottageC: [4.6, 5.8], dock: [3.4, -2.3],
};
export const WATER = { x: 0.8, z: -6.6, rx: 7.0, rz: 4.3 };   // the fjord inlet (an ellipse)
export const DOCK = { x: 3.4, z0: -2.3, z1: -9.0, half: 1.0 };
// The three secret flags, left to right. Tap them in this order: a capital letter, some words, an end mark.
export const SENTENCE_FLAG_KEYS = [
  { key: 'flag1', show: 'capital letter' },
  { key: 'flag2', show: 'words' },
  { key: 'flag3', show: 'end mark' },
];
// Pine trees (local x, z), kept off the entrance path and the water.
export const PINES = [
  [-8.3, -4.4], [-7.4, -6.4], [-8.1, 5.0], [-6.6, 7.2], [-3.4, 8.4], [-0.4, 9.0], [3.2, 8.6], [6.6, 6.4], [9.0, 3.0], [9.0, -0.6], [8.6, -4.3]
];

/** True when a harbor-local spot is in the water (or on the dock end): treasures stay on dry land. */
export function harborWet(lx, lz) {
  return ((lx - WATER.x) / (WATER.rx + 0.5)) ** 2 + ((lz - WATER.z) / (WATER.rz + 0.5)) ** 2 < 1;
}

/**
 * Build the harbor. env = { THREE, scene, center:{x,z}, pad?:{x,z}, G, M, addCollider, addTappable, starGeometry, softDot, calmMotion }.
 * Returns { update(t, dt), wet(worldX, worldZ), dry(worldX, worldZ) }.
 */
export function buildHarbor(env) {
  const { THREE, scene, center, G, M, addCollider, addTappable, softDot, calmMotion } = env;
  const cx = center.x, cz = center.z;
  const padL = env.pad ? { x: env.pad.x - cx, z: env.pad.z - cz } : { x: -6.48, z: 0.54 };   // Anna's pad, harbor-local (stored, nobody stands on it yet)
  const padLen = Math.hypot(padL.x, padL.z) || 1, ux = padL.x / padLen, uz = padL.z / padLen;   // unit vector from the centre toward the entrance
  const vcMat = M('coveVC', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }));
  // Unlit vertex-colour material: lamp, windows and the flag signs keep their colour in the shared daylight.
  const glowMat = M('harborGlow', () => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));

  const geoDisc = (n) => G('coveDisc' + n, () => new THREE.CircleGeometry(1, n));
  const geoBall = G('coveBall', () => new THREE.SphereGeometry(1, 8, 6));
  const geoPole = G('covePole', () => new THREE.CylinderGeometry(1, 1, 1, 7));
  const geoCone = G('coveCone', () => new THREE.ConeGeometry(1, 1, 8));
  const geoBox = G('coveBox', () => new THREE.BoxGeometry(1, 1, 1));
  const geoRock = G('coveRock', () => new THREE.DodecahedronGeometry(1, 0));
  const geoRing = (a, b, n) => G(`harborRing${a}_${b}_${n}`, () => new THREE.RingGeometry(a, b, n));
  const geoBowl = G('harborBowl', () => new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));   // lower half of a ball: a boat hull
  const geoTower = G('harborTower', () => new THREE.CylinderGeometry(0.62, 1, 1, 12));                                      // tapered tower
  const geoTriUp = G('harborTriUp', () => { const s = new THREE.Shape(); s.moveTo(-1, 0); s.lineTo(1, 0); s.lineTo(0, 1); return new THREE.ShapeGeometry(s); });
  const geoTriDown = G('harborTriDown', () => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, -1); return new THREE.ShapeGeometry(s); });
  const geoHook = G('harborHook', () => new THREE.TorusGeometry(1, 0.26, 5, 14, Math.PI * 1.55));                           // the curl of a question mark

  const items = {};
  const own = (m, mat) => new THREE.Mesh(m.build(), mat || vcMat);
  const wx = (k) => cx + HARBOR_SPOTS[k][0], wz = (k) => cz + HARBOR_SPOTS[k][1];
  const TG = 1.25;   // addTappable scales every tappable group by 1.25: own meshes are drawn a little smaller to land at the intended size
  const flat = -Math.PI / 2;

  const COL = {
    grass: 0x93d96a, grass2: 0xa8e47e, sand: 0xf7e4a8, sand2: 0xefd08a, deep: 0x2f9be0, mid: 0x55b8f2, shine: 0x8fd6ff, foam: 0xeefaff,
    wood: 0xc08a4e, wood2: 0xa97238, woodDark: 0x7d4f27, stone: 0xcfd3d6, stone2: 0xb3b9be, white: 0xfff9ec, trunk: 0x8a5a2e,
    pine: 0x2f9a4a, pine2: 0x3fb35b, pine3: 0x278a3f, red: 0xe5483c, navy: 0x274d9c, sun: 0xffd75e,
  };

  // ---------------------------------------------------------------- shared glow Points
  // Slots: soft halos (lamp, flags), then the effects (parked off-screen until a tap starts them).
  const LAMP = { x: cx + HARBOR_SPOTS.lighthouse[0], y: 5.1, z: cz + HARBOR_SPOTS.lighthouse[1] };
  const HALOS = [{ x: LAMP.x, y: LAMP.y, z: LAMP.z + 0.1, base: 0.85, tint: [1, 0.9, 0.55] }];   // 0: the lighthouse lamp
  const FLAG_AT = HALOS.length;
  SENTENCE_FLAG_KEYS.forEach((f) => HALOS.push({ x: wx(f.key), y: 1.95, z: wz(f.key) + 0.45, base: 0.1, tint: [1, 0.9, 0.55] }));
  const N_H = HALOS.length;
  const BEAM_AT = N_H, N_BEAM = 9, PUFF_AT = BEAM_AT + N_BEAM, N_PUFF = 5, PET_AT = PUFF_AT + N_PUFF, N_PET = 7;
  const NOTE_AT = PET_AT + N_PET, N_NOTE = 4, CONF_AT = NOTE_AT + N_NOTE, N_CONF = 6, FEA_AT = CONF_AT + N_CONF, N_FEA = 3, FX_N = FEA_AT + N_FEA;
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
  for (let i = N_H; i < FX_N; i++) park(i);
  const bump = (x) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x));
  let beamT = -1, puffT = -1, petT = -1, noteT = -1, confT = -1, feaT = -1;
  const flagGlow = [0, 0, 0];   // seconds of extra glow left on each flag (they light up when tapped)

  // ---- boat parts (used by the tap boat and the still boats), in the merger's coordinates ----
  // kind: 'motor' (cabin + funnel), 'row' (seat + oars), 'sail' (mast + sail). Hull lies along x; the bow is at +x.
  const boatParts = (mg, x, y0, z, yaw, hull, trim, kind, L = 1.2, W = 0.55) => {
    const y = y0 + 0.18;   // the hull stands a little higher out of the water so its colour shows
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const at = (lx, ly, lz) => [x + c * lx + s * lz, y + ly, z - s * lx + c * lz];
    mg.add(geoBowl, hull, ...at(0, 0.22, 0), 0, yaw, 0, L, 0.42, W);                                  // hull
    mg.add(geoDisc(16), 0xf3e2b8, ...at(0, 0.2, 0), flat, yaw, 0, L * 0.76, W * 0.72, 1);              // pale wooden floor (the hull colour shows round it)
    mg.add(geoRing(0.86, 1.0, 20), trim, ...at(0, 0.23, 0), flat, yaw, 0, L, W, 1);                    // coloured rim
    mg.add(geoBox, COL.wood2, ...at(-0.15, 0.3, 0), 0, yaw, 0, 0.14, 0.05, W * 1.7);                   // a seat across
    if (kind === 'motor') {
      mg.add(geoBox, COL.white, ...at(-0.35, 0.55, 0), 0, yaw, 0, 0.62, 0.5, 0.5);                     // little cabin
      mg.add(geoBox, trim, ...at(-0.35, 0.83, 0), 0, yaw, 0, 0.72, 0.07, 0.6);                         // its roof
      mg.add(geoBox, 0x9fd8ff, ...at(-0.04, 0.58, 0), 0, yaw, 0, 0.03, 0.2, 0.36);                      // window glass
      mg.add(geoPole, COL.red, ...at(-0.5, 1.08, 0), 0, 0, 0, 0.08, 0.34, 0.08);                         // funnel
      mg.add(geoPole, COL.white, ...at(-0.5, 1.2, 0), 0, 0, 0, 0.085, 0.07, 0.085);
      mg.add(geoPole, COL.woodDark, ...at(0.55, 0.9, 0), 0, 0, 0, 0.018, 1.2, 0.018);                    // flag pole at the bow
      mg.add(geoBox, COL.sun, ...at(0.4, 1.45, 0), 0, yaw, 0, 0.3, 0.2, 0.02);                            // a little pennant
    } else if (kind === 'sail') {
      mg.add(geoPole, COL.woodDark, ...at(0.1, 1.2, 0), 0, 0, 0, 0.035, 2.0, 0.035);                      // mast
      mg.add(geoTriUp, 0xfff6e0, ...at(0.1, 0.4, 0), 0, yaw, 0, 0.62, 1.8, 1);                            // sail
      mg.add(geoTriUp, trim, ...at(0.1, 0.4, 0.01), 0, yaw, 0, 0.2, 0.6, 1);                              // a coloured patch on the sail
    } else {
      mg.add(geoPole, COL.woodDark, ...at(0, 0.45, 0.4), Math.PI / 2 - 0.4, yaw, 0, 0.02, 0.9, 0.02);   // oars
      mg.add(geoPole, COL.woodDark, ...at(0, 0.45, -0.4), Math.PI / 2 + 0.4, yaw, 0, 0.02, 0.9, 0.02);
    }
  };

  // ---------------------------------------------------------------- tap surprises
  // 1. Lighthouse: the lamp sweeps a bright beam round (shared Points) and blinks. The tower itself is static scenery below.
  items.lighthouse = addTappable(() => ({ glowY: 3.6, hitR: 1.85 }), wx('lighthouse'), wz('lighthouse'), 0, 0xfff0a8);
  items.lighthouse.dur = 3.2;
  items.lighthouse.onTap = () => { beamT = 0; };

  // 2. Boat that bobs and toots: a red boat with a cabin and a funnel. It rocks on the water and puffs white steam. (bob group > hull mesh)
  items.boat = addTappable((g) => {
    const m = makeMerger(THREE);
    boatParts(m, 0, 0, 0, 0, COL.red, COL.white, 'motor', 1.3, 0.64);
    const bob = new THREE.Group(); bob.add(own(m)); g.add(bob);
    return { glowY: 1.0, hitR: 1.6 };
  }, wx('boat'), wz('boat'), 0, 0xffd0c8);
  items.boat.group.rotation.y = 0.18;
  items.boat.dur = 2.4;
  items.boat.react = (it, p) => {
    const hull = it.group.children[0].children[0];
    if (p >= 1) { hull.position.y = 0; hull.rotation.set(0, 0, 0); return; }
    const f = (1 - p) * (1 - p);
    hull.position.y = Math.sin(p * Math.PI * 7) * 0.09 * f;
    hull.rotation.z = Math.sin(p * Math.PI * 6) * 0.13 * f;
    hull.rotation.x = Math.sin(p * Math.PI * 5 + 1) * 0.06 * f;
  };
  items.boat.onTap = () => { puffT = 0; };

  // 3. Bunting that flutters: a line of little coloured flags between two poles. The flags swing like they are in the sea breeze.
  items.bunting = addTappable((g) => {
    const m = makeMerger(THREE);
    const N = 9, hl = 1.45, cols = [0xff5d5d, 0xffd75e, 0x4fb3f0, 0xff9ec6, 0x7bd96a, 0xffa94d, 0xb48cf0, 0xff5d5d, 0xffd75e];
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1), x = -hl + 2 * hl * u, y = -0.28 * (1 - (2 * u - 1) ** 2);   // the string sags a little in the middle
      m.add(geoBall, 0xf4ead0, x, y, 0, 0, 0, 0, 0.1, 0.04, 0.04);                       // a bit of string
      m.add(geoTriDown, cols[i], x, y - 0.02, 0.02, 0, 0, 0, 0.26, 0.42, 1);             // the flag
    }
    const mesh = own(m); mesh.position.y = 2.1; g.add(mesh);
    return { glowY: 1.9, hitR: 1.5 };
  }, wx('bunting'), wz('bunting'), 0, 0xfff0b0);
  items.bunting.group.rotation.y = 0;
  items.bunting.dur = 2.6;
  items.bunting.react = (it, p) => {
    const b = it.group.children[0], f = p >= 1 ? 0 : (1 - p);
    b.rotation.x = Math.sin(p * Math.PI * 8) * 0.34 * f;
    b.rotation.z = Math.sin(p * Math.PI * 5 + 0.5) * 0.04 * f;
  };
  items.bunting.onTap = () => { confT = 0; };

  // 4. Gull on its post: a plain white sea bird with grey wings. It hops, turns round and flaps. (generic bird, not a film character)
  const GULL_Y = (0.95 + 0.14) / TG;
  items.gull = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoBall, 0xffffff, 0, 0, 0, 0, 0, 0, 0.23, 0.15, 0.13);                      // body
    m.add(geoBall, 0xffffff, 0.2, 0.13, 0, 0, 0, 0, 0.09, 0.09, 0.08);                 // head
    m.add(geoCone, 0xffb02e, 0.31, 0.12, 0, 0, 0, -Math.PI / 2, 0.035, 0.12, 0.035);    // beak
    m.add(geoBall, 0x1b2a3a, 0.25, 0.16, 0.05, 0, 0, 0, 0.018);                        // eyes
    m.add(geoBall, 0x1b2a3a, 0.25, 0.16, -0.05, 0, 0, 0, 0.018);
    m.add(geoBall, 0xc9d3de, -0.02, 0.06, 0.12, 0.3, 0, 0, 0.17, 0.035, 0.1);           // grey wings folded on the sides
    m.add(geoBall, 0xc9d3de, -0.02, 0.06, -0.12, -0.3, 0, 0, 0.17, 0.035, 0.1);
    m.add(geoCone, 0xe8eef4, -0.26, 0.0, 0, 0, 0, Math.PI / 2, 0.06, 0.16, 0.04);       // tail
    m.add(geoPole, 0xffb02e, 0.04, -0.14, 0.04, 0, 0, 0, 0.012, 0.12, 0.012);           // legs
    m.add(geoPole, 0xffb02e, 0.04, -0.14, -0.04, 0, 0, 0, 0.012, 0.12, 0.012);
    const mesh = own(m); mesh.position.y = GULL_Y; g.add(mesh);
    return { glowY: 1.1, hitR: 0.85 };
  }, wx('gull'), wz('gull'), 0, 0xffffff);
  items.gull.dur = 1.9;
  items.gull.react = (it, p) => {
    const b = it.group.children[0];
    if (p >= 1) { b.position.y = GULL_Y; b.rotation.set(0, 0, 0); return; }
    const hop = Math.abs(Math.sin(p * Math.PI * 3)) * 0.28 * (1 - p);
    b.position.y = GULL_Y + hop;
    b.rotation.y = Math.sin(p * Math.PI) * Math.PI * 0.9;
    b.rotation.z = Math.sin(p * Math.PI * 12) * 0.2 * (1 - p);
  };
  items.gull.onTap = () => { feaT = 0; };

  // 5. Flower box that blooms: a wooden planter full of buds that swell open into bright flowers and sparkle.
  items.flowerbox = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoBox, COL.wood2, 0, 0.22, 0, 0, 0, 0, 1.25, 0.34, 0.45);                    // planter
    m.add(geoBox, COL.wood, 0, 0.4, 0, 0, 0, 0, 1.3, 0.05, 0.5);                        // rim
    m.add(geoBox, 0x5a3b22, 0, 0.415, 0, 0, 0, 0, 1.15, 0.03, 0.38);                    // soil
    m.add(geoBox, COL.woodDark, 0, 0.04, 0.12, 0, 0, 0, 1.1, 0.08, 0.1);                // feet
    const cols = [0xff5d7a, 0xffd75e, 0xff9a3c, 0xffffff, 0xb48cf0, 0xff5d7a, 0xffd75e];
    for (let i = 0; i < 7; i++) {
      const x = -0.5 + i * (1.0 / 6), h = 0.32 + (i % 3) * 0.1, z = ((i * 5) % 3 - 1) * 0.08;
      m.add(geoPole, 0x3f9d4f, x, 0.42 + h / 2, z, 0, 0, 0, 0.018, h, 0.018);          // stem
      m.add(geoBall, 0x58c06b, x + 0.06, 0.5 + h * 0.3, z, 0, 0, 0.6, 0.08, 0.03, 0.04);   // leaf
      m.add(geoBall, cols[i], x, 0.44 + h, z, 0, 0, 0, 0.12, 0.05, 0.12);               // bloom
      m.add(geoBall, i % 2 ? 0xffffff : 0xffd75e, x, 0.47 + h, z, 0, 0, 0, 0.045);       // middle
    }
    const mesh = own(m); g.add(mesh);
    return { glowY: 0.9, hitR: 1.0 };
  }, wx('flowerbox'), wz('flowerbox'), 0, 0xffd0e0);
  items.flowerbox.group.rotation.y = 0;
  items.flowerbox.dur = 2.4;
  items.flowerbox.react = (it, p) => {
    const b = it.group.children[0];
    if (p >= 1) { b.scale.set(1, 1, 1); return; }
    const open = bump(Math.min(1, p / 0.8));
    b.scale.set(1 + 0.12 * open, 1 + 0.35 * open + 0.08 * open * Math.sin(p * Math.PI * 8), 1 + 0.12 * open);
  };
  items.flowerbox.onTap = () => { petT = 0; };

  // 6. Dock bell: a brass bell hung from an arm on a post. It swings and rings (little notes drift up).
  items.bell = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoBall, 0xf2c14e, 0, -0.2, 0, 0, 0, 0, 0.26, 0.3, 0.26);                     // dome
    m.add(geoPole, 0xf2c14e, 0, -0.42, 0, 0, 0, 0, 0.3, 0.05, 0.3);                     // lip
    m.add(geoBall, 0x7a5a1e, 0, -0.5, 0, 0, 0, 0, 0.07);                                // clapper
    m.add(geoBall, 0xb9892a, 0, 0.0, 0, 0, 0, 0, 0.08);                                 // top knob
    const bell = own(m); bell.position.y = 2.0 / TG; g.add(bell);
    return { glowY: 1.6, hitR: 0.85 };
  }, wx('bell'), wz('bell'), 0, 0xfff0b0);
  items.bell.group.rotation.y = 0;
  items.bell.dur = 2.4;
  items.bell.react = (it, p) => {
    const b = it.group.children[0], f = p >= 1 ? 0 : (1 - p) * (1 - p);
    b.rotation.z = Math.sin(p * Math.PI * 10) * 0.42 * f;
    b.rotation.x = Math.sin(p * Math.PI * 8 + 1) * 0.12 * f;
  };
  items.bell.onTap = () => { noteT = 0; };

  // Secret: three flags with a capital letter, some words and an end mark. world.js calls onSecretTap('flag-N'); each flag also
  // glows when tapped, so the little sentence lights up in order.
  SENTENCE_FLAG_KEYS.forEach((f, i) => {
    items[f.key] = addTappable(() => ({ glowY: 2.1, hitR: 0.85 }), wx(f.key), wz(f.key), 0, 0xfff1c8, 'flag-' + (i + 1));
    items[f.key].onTap = () => { flagGlow[i] = 1.4; };
  });
  for (const it of Object.values(items)) { it.baseYaw = it.group.rotation.y; }

  const boatX = wx('boat'), boatZ = wz('boat'), flowerX = wx('flowerbox'), flowerZ = wz('flowerbox'), bellX = wx('bell'), bellZ = wz('bell');
  const buntX = wx('bunting'), buntZ = wz('bunting'), gullX = wx('gull'), gullZ = wz('gull');
  const bobber = items.boat.group.children[0];

  function update(t, dt) {
    if (calmMotion) return; // calm motion: taps glow only; nothing here moves
    // The boat rocks gently on the water (the hull inside the bob group; a tap's own rocking rides on top).
    bobber.position.y = Math.sin(t * 1.1) * 0.03; bobber.rotation.z = Math.sin(t * 0.8) * 0.025;
    // Halos: the lamp breathes slowly (a gentle blink, never a flash); the flags light up when tapped.
    let lamp = 1 + 0.22 * Math.sin(t * 1.2);
    if (beamT >= 0) lamp += 0.6 * bump(beamT / 1.2);
    const h0 = HALOS[0];
    put(0, h0.x, h0.y, h0.z, h0.base * lamp, h0.tint[0], h0.tint[1], h0.tint[2]);
    for (let s = 0; s < 3; s++) {
      const h = HALOS[FLAG_AT + s];
      put(FLAG_AT + s, h.x, h.y, h.z, h.base + (flagGlow[s] > 0 ? 0.8 * Math.min(1, flagGlow[s]) : 0), h.tint[0], h.tint[1], h.tint[2]);
      if (flagGlow[s] > 0) flagGlow[s] = Math.max(0, flagGlow[s] - dt);
    }
    glowMat.color.setScalar(0.9 + 0.06 * Math.sin(t * 1.3) + (beamT >= 0 ? 0.04 : 0));
    if (beamT >= 0) {   // the lamp's beam sweeps round: a ray of soft dots turning about the lamp
      beamT += dt;
      const turn = beamT / 3.0, ang = turn * Math.PI * 2.4;
      for (let i = 0; i < N_BEAM; i++) {
        if (turn >= 1) { park(BEAM_AT + i); continue; }
        const d = 0.9 + i * 0.62;
        put(BEAM_AT + i, LAMP.x + Math.cos(ang) * d, LAMP.y - 0.1 - i * 0.04, LAMP.z + Math.sin(ang) * d * 0.6, bump(turn) * (1 - i * 0.07), 1, 0.92, 0.55);
      }
      if (turn >= 1) { beamT = -1; for (let i = 0; i < N_BEAM; i++) park(BEAM_AT + i); }
    }
    if (puffT >= 0) {   // steam puffs from the funnel
      puffT += dt;
      for (let i = 0; i < N_PUFF; i++) {
        const pt = (puffT - i * 0.28) / 1.2;
        if (pt <= 0 || pt >= 1) { park(PUFF_AT + i); continue; }
        put(PUFF_AT + i, boatX - 0.55 + pt * 0.35 + Math.sin(pt * 5 + i) * 0.1, 1.9 + pt * 1.5, boatZ, bump(pt) * 0.9, 0.95, 0.97, 1);
      }
      if (puffT > N_PUFF * 0.28 + 1.3) { puffT = -1; for (let i = 0; i < N_PUFF; i++) park(PUFF_AT + i); }
    }
    if (petT >= 0) {    // petals and sparkles lift out of the flower box
      petT += dt;
      const cols = [[1, 0.5, 0.65], [1, 0.9, 0.4], [1, 0.65, 0.3], [1, 1, 1]];
      for (let i = 0; i < N_PET; i++) {
        const pt = (petT - i * 0.15) / 1.1;
        if (pt <= 0 || pt >= 1) { park(PET_AT + i); continue; }
        const a = i * 0.9, r = 0.3 + 0.5 * (i % 3) / 2, c = cols[i % 4];
        put(PET_AT + i, flowerX + Math.cos(a) * r, 1.0 + pt * 1.1, flowerZ + Math.sin(a) * r * 0.6, bump(pt) * (0.7 + 0.3 * Math.sin(pt * 40)), c[0], c[1], c[2]);
      }
      if (petT > N_PET * 0.15 + 1.2) { petT = -1; for (let i = 0; i < N_PET; i++) park(PET_AT + i); }
    }
    if (noteT >= 0) {   // bell notes drift up
      noteT += dt;
      for (let i = 0; i < N_NOTE; i++) {
        const pt = (noteT - i * 0.3) / 1.1;
        if (pt <= 0 || pt >= 1) { park(NOTE_AT + i); continue; }
        put(NOTE_AT + i, bellX + (i - 1.5) * 0.3 + Math.sin(pt * 6 + i) * 0.15, 2.0 + pt * 1.1, bellZ + 0.3, bump(pt), 1, 0.92, 0.6);
      }
      if (noteT > N_NOTE * 0.3 + 1.2) { noteT = -1; for (let i = NOTE_AT; i < CONF_AT; i++) park(i); }
    }
    if (confT >= 0) {   // bright specks shake loose from the bunting
      confT += dt;
      const cols = [[1, 0.4, 0.4], [1, 0.9, 0.4], [0.4, 0.75, 1], [1, 0.6, 0.8], [0.5, 1, 0.5], [1, 0.7, 0.3]];
      for (let i = 0; i < N_CONF; i++) {
        const pt = (confT - i * 0.12) / 1.2;
        if (pt <= 0 || pt >= 1) { park(CONF_AT + i); continue; }
        const c = cols[i];
        put(CONF_AT + i, buntX + (i - 2.5) * 0.5, 2.5 - pt * 1.5, buntZ + 0.2 + Math.sin(pt * 7 + i) * 0.2, bump(pt) * 0.9, c[0], c[1], c[2]);
      }
      if (confT > N_CONF * 0.12 + 1.3) { confT = -1; for (let i = CONF_AT; i < FEA_AT; i++) park(i); }
    }
    if (feaT >= 0) {    // a few white feathers float down from the gull
      feaT += dt;
      for (let i = 0; i < N_FEA; i++) {
        const pt = (feaT - i * 0.2) / 1.2;
        if (pt <= 0 || pt >= 1) { park(FEA_AT + i); continue; }
        put(FEA_AT + i, gullX + (i - 1) * 0.35 + Math.sin(pt * 6 + i) * 0.2, 1.4 - pt * 0.8, gullZ + 0.25, bump(pt) * 0.8, 1, 1, 1);
      }
      if (feaT > N_FEA * 0.2 + 1.3) { feaT = -1; for (let i = FEA_AT; i < FX_N; i++) park(i); }
    }
    fxGeo.attributes.position.needsUpdate = true; fxGeo.attributes.color.needsUpdate = true;
  }

  // ---------------------------------------------------------------- static scenery (ONE merged mesh) + glowing parts (ONE mesh)
  const m = makeMerger(THREE), gm = makeMerger(THREE);
  const obst = [];   // [x, z, r] things the scattered flowers must stay away from
  const solid = (x, z, r, keep = true) => { addCollider(cx + x, cz + z, r); if (keep) obst.push([x, z, r]); };

  // Ground: bright summer grass with lighter patches, a sandy beach round the inlet, the water with a lighter middle and a foam edge.
  m.add(geoDisc(48), COL.grass, 0, 0.03, 0, flat, 0, 0, 10.4);
  for (const [x, z, r] of [[-3, 3, 2.4], [5, 4, 2.0], [-6, -1, 1.6], [2, 8, 1.8], [8, 0.5, 1.3]]) m.add(geoDisc(20), COL.grass2, x, 0.032, z, flat, 0, 0, r);
  m.add(geoDisc(44), COL.sand, WATER.x, 0.034, WATER.z, flat, 0, 0, WATER.rx + 0.75, WATER.rz + 0.7, 1);
  m.add(geoDisc(44), COL.sand2, WATER.x, 0.036, WATER.z, flat, 0, 0, WATER.rx + 0.38, WATER.rz + 0.36, 1);
  m.add(geoDisc(44), COL.foam, WATER.x, 0.038, WATER.z, flat, 0, 0, WATER.rx + 0.14, WATER.rz + 0.13, 1);
  m.add(geoDisc(44), COL.deep, WATER.x, 0.042, WATER.z, flat, 0, 0, WATER.rx, WATER.rz, 1);
  m.add(geoDisc(40), COL.mid, WATER.x - 0.3, 0.045, WATER.z - 0.4, flat, 0, 0, WATER.rx * 0.7, WATER.rz * 0.62, 1);
  for (const [x, z, s] of [[-3.6, -5.6, 0.7], [-1.4, -8.4, 0.5], [2.2, -4.6, 0.6], [5.2, -9.0, 0.5], [7.0, -7.2, 0.45]]) {   // sunny sparkles on the water
    m.add(geoDisc(10), COL.shine, x, 0.05, z, flat, 0, 0, s, s * 0.22, 1);
  }

  // Cobbled path from the entrance to the middle, and a few slabs on to the dock. (The real path ribbon lies under the grass disc.)
  {
    const nx = -uz, nz = ux;
    for (let d = 1.4, i = 0; d < 10.0; d += 0.85, i++) for (const off of [-0.6, 0.6]) {
      m.add(geoBox, (i + (off > 0)) % 2 ? 0xe9d6a4 : 0xdcc690, ux * d + nx * off, 0.06, uz * d + nz * off, 0, Math.atan2(ux, uz) + 0.12 * off, 0, 0.7, 0.06, 0.62);
    }
    for (const [x, z] of [[1.0, -0.2], [1.9, -0.8], [2.7, -1.4], [3.2, -2.0]]) m.add(geoBox, 0xe9d6a4, x, 0.06, z, 0, 0.3, 0, 0.7, 0.06, 0.6);
  }

  // Dock: planks over the water, piles at the sides, rails and bunting along the west edge, a post at the end.
  {
    const len = DOCK.z0 - DOCK.z1;
    for (let k = 0, z = DOCK.z0 - 0.15; z > DOCK.z1; k++, z -= 0.36) m.add(geoBox, k % 2 ? COL.wood : COL.wood2, DOCK.x, 0.36, z, 0, 0, 0, DOCK.half * 2, 0.08, 0.33);
    for (const sx of [-1, 1]) m.add(geoBox, COL.woodDark, DOCK.x + sx * (DOCK.half - 0.12), 0.27, (DOCK.z0 + DOCK.z1) / 2, 0, 0, 0, 0.14, 0.14, len);   // side beams
    for (let k = 0; k < 5; k++) for (const sx of [-1, 1]) {
      const z = DOCK.z0 - 0.5 - k * 1.5, x = DOCK.x + sx * DOCK.half;
      m.add(geoPole, COL.trunk, x, 0.45, z, 0, 0, 0, 0.1, 1.3, 0.1);                                   // pile
      m.add(geoBall, COL.woodDark, x, 1.1, z, 0, 0, 0, 0.12);
      if (sx < 0) m.add(geoPole, COL.wood2, x, 0.8, z, 0, 0, 0, 0.05, 0.9, 0.05);                       // rail post (west edge)
    }
    // west rail with a string of little flags
    const wxr = DOCK.x - DOCK.half;
    m.add(geoBox, COL.wood, wxr, 1.0, (DOCK.z0 + DOCK.z1) / 2, 0, 0, 0, 0.06, 0.06, len - 0.3);
    const cols = [0xff5d5d, 0xffd75e, 0x4fb3f0, 0xff9ec6, 0x7bd96a, 0xffa94d];
    for (let k = 0; k < 14; k++) m.add(geoTriDown, cols[k % 6], wxr - 0.02, 0.98, DOCK.z0 - 0.5 - k * 0.45, 0, Math.PI / 2, 0, 0.14, 0.26, 1);
    // gull post at the end (the gull itself is the tap prop), and a mooring post
    const [gx, gz] = HARBOR_SPOTS.gull;
    m.add(geoPole, COL.trunk, gx, 0.5, gz, 0, 0, 0, 0.13, 1.0, 0.13);
    m.add(geoBall, COL.woodDark, gx, 1.0, gz, 0, 0, 0, 0.15, 0.06, 0.15);
  }

  // Boats: a rowboat west of the dock, a sailboat further out (plain colours). The red motor boat is the tap prop.
  boatParts(m, 0.4, 0, -5.2, -0.15, 0xffc233, COL.red, 'row', 1.3, 0.6);
  boatParts(m, -0.5, 0, -8.5, 0.15, 0x2f6fd0, 0xff7a6b, 'sail', 1.25, 0.58);

  // Cottages and the boathouse: bright walls, steep roofs, a door, windows that glow, flower boxes under the windows.
  const cottage = (x, z, w, d, h, wall, roof, trim, doorHex) => {
    m.add(geoBox, COL.stone2, x, 0.1, z, 0, 0, 0, w + 0.14, 0.2, d + 0.14);                              // stone footing
    m.add(geoBox, wall, x, 0.2 + h / 2, z, 0, 0, 0, w, h, d);                                            // walls
    const hw = w / 2 + 0.2, a = 0.95, ridge = Math.tan(a) * hw, baseY = 0.2 + h;
    for (const sx of [-1, 1]) m.add(geoBox, roof, x + sx * hw / 2, baseY + ridge / 2 + 0.03, z, 0, 0, -sx * a, hw / Math.cos(a) + 0.12, 0.09, d + 0.5);   // two steep roof planes
    m.add(geoBox, trim, x, baseY + ridge + 0.05, z, 0, 0, 0, 0.1, 0.1, d + 0.55);                       // ridge
    for (const sz of [-1, 1]) m.add(geoTriUp, wall, x, baseY, z + sz * (d / 2 + 0.01), 0, 0, 0, w / 2, ridge, 1);   // gable ends
    m.add(geoBox, doorHex, x - w * 0.18, 0.2 + 0.43, z + d / 2 + 0.02, 0, 0, 0, 0.5, 0.86, 0.06);       // door
    m.add(geoBox, trim, x - w * 0.18, 0.2 + 0.9, z + d / 2 + 0.03, 0, 0, 0, 0.62, 0.07, 0.07);
    m.add(geoBall, 0xf2c14e, x - w * 0.18 + 0.16, 0.2 + 0.42, z + d / 2 + 0.06, 0, 0, 0, 0.04);
    const wxp = x + w * 0.22, wy = 0.2 + h * 0.6;
    m.add(geoBox, trim, wxp, wy, z + d / 2 + 0.02, 0, 0, 0, 0.56, 0.5, 0.05);                            // window frame
    gm.add(geoBox, 0xcdeeff, wxp, wy, z + d / 2 + 0.05, 0, 0, 0, 0.44, 0.38, 0.03);                      // window glass (glows)
    m.add(geoBox, trim, wxp, wy, z + d / 2 + 0.07, 0, 0, 0, 0.04, 0.38, 0.03);
    m.add(geoBox, COL.wood2, wxp, wy - 0.33, z + d / 2 + 0.14, 0, 0, 0, 0.62, 0.15, 0.2);                // flower box
    ['#ff5d7a', '#ffd75e', '#ff9a3c', '#ffffff', '#ff5d7a'].forEach((c, i) => {
      m.add(geoBall, parseInt(c.slice(1), 16), wxp - 0.24 + i * 0.12, wy - 0.2, z + d / 2 + 0.15, 0, 0, 0, 0.065, 0.06, 0.065);
    });
    m.add(geoBox, COL.stone2, x + w * 0.25, baseY + ridge * 0.55, z - d * 0.2, 0, 0, 0, 0.3, ridge * 0.9 + 0.3, 0.3);   // chimney
    solid(x, z, Math.hypot(w, d) * 0.5 * 0.9);
  };
  {
    const A = HARBOR_STATICS.cottageA, B = HARBOR_STATICS.cottageB, C = HARBOR_STATICS.cottageC, H = HARBOR_STATICS.boathouse;
    cottage(A[0], A[1], 2.2, 1.9, 1.5, 0xff7b6b, 0xd9473a, COL.white, 0x7d4f27);
    cottage(B[0], B[1], 2.4, 2.0, 1.7, 0xffd75e, 0x3e5fa8, COL.white, 0xd9473a);
    cottage(C[0], C[1], 2.2, 1.9, 1.5, 0x4fd1c5, 0xf08a3c, COL.white, 0x7d4f27);
    cottage(H[0], H[1], 2.6, 2.2, 1.4, 0x5aa9f0, 0x2c8c8c, COL.white, 0xd9473a);
    // the boathouse wears a red and white life ring
    m.add(geoRing(0.55, 1.0, 16), COL.red, H[0] + 0.05, 1.05, H[1] + 1.14, 0, 0, 0, 0.3, 0.3, 1);
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) m.add(geoBox, COL.white, H[0] + 0.05 + Math.cos(a) * 0.23, 1.05 + Math.sin(a) * 0.23, H[1] + 1.15, 0, 0, a, 0.1, 0.1, 0.02);
    // bunting between two cottage roofs
    const ax = A[0] + 1.0, bx = B[0] - 1.1, ay = 2.3, by = 2.55, az = A[1] + 1.05, bz = B[1] + 1.15;
    const cols = [0xff5d5d, 0xffd75e, 0x4fb3f0, 0xff9ec6, 0x7bd96a, 0xffa94d];
    for (let k = 0; k < 7; k++) {
      const u = (k + 0.5) / 7, x = ax + (bx - ax) * u, y = ay + (by - ay) * u - 0.22 * (1 - (2 * u - 1) ** 2), z = az + (bz - az) * u;
      m.add(geoBall, 0xf4ead0, x, y, z, 0, 0, 0, 0.08, 0.03, 0.03);
      m.add(geoTriDown, cols[k % 6], x, y - 0.02, z, 0, 0, 0, 0.22, 0.36, 1);
    }
  }

  // Market stall: four posts, a striped awning, a counter with a crate of fish and a basket of bread, a little blackboard.
  {
    const [sx, sz] = HARBOR_STATICS.market;
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) m.add(geoPole, COL.wood2, sx + dx * 1.0, 1.0, sz + dz * 0.55, 0, 0, 0, 0.06, 2.0, 0.06);
    for (let k = 0; k < 6; k++) m.add(geoBox, k % 2 ? COL.white : COL.red, sx - 1.1 + 0.44 * (k + 0.5), 2.08 - 0.0, sz + 0.1, 0.2, 0, 0, 0.44, 0.05, 1.5);   // striped awning, sloping to the front
    for (let k = 0; k < 6; k++) m.add(geoTriDown, k % 2 ? COL.white : COL.red, sx - 1.1 + 0.44 * (k + 0.5), 1.97, sz + 0.88, 0, 0, 0, 0.22, 0.2, 1);
    m.add(geoBox, COL.wood, sx, 0.85, sz + 0.25, 0, 0, 0, 2.1, 0.12, 0.7);                                 // counter top
    m.add(geoBox, COL.wood2, sx, 0.42, sz + 0.25, 0, 0, 0, 2.0, 0.85, 0.62);                                // counter front
    m.add(geoBox, 0xbfe3f5, sx - 0.55, 0.98, sz + 0.25, 0, 0, 0, 0.7, 0.14, 0.5);                           // fish crate
    for (let k = 0; k < 4; k++) m.add(geoBall, k % 2 ? 0x9ab6c8 : 0xb8cfdd, sx - 0.8 + k * 0.17, 1.1, sz + 0.25, 0, 0.2, 0, 0.12, 0.05, 0.05);   // little fish
    m.add(geoBall, 0xf2c14e, sx + 0.55, 1.05, sz + 0.25, 0, 0, 0, 0.3, 0.1, 0.26);                           // basket of bread
    for (let k = 0; k < 3; k++) m.add(geoBall, k % 2 ? 0xd9923f : 0xe8ab5a, sx + 0.35 + k * 0.2, 1.17, sz + 0.25, 0, 0.3 * k, 0, 0.14, 0.08, 0.08);   // loaves
    m.add(geoBox, 0x3b4a4f, sx + 0.05, 1.3, sz + 0.62, -0.2, 0, 0, 0.5, 0.35, 0.04);                        // blackboard
    solid(sx - 0.6, sz + 0.2, 0.85); solid(sx + 0.6, sz + 0.2, 0.85);
  }

  // Lighthouse on a rocky point: a tapered white tower with red bands, a gallery, a glowing lamp room and a red cap.
  {
    const [lx, lz] = HARBOR_SPOTS.lighthouse, R0 = 0.95, H = 4.4, rAt = (y) => R0 * (1 - 0.38 * Math.min(1, y / H));
    for (let k = 0; k < 8; k++) {   // the rocky base
      const a = k * 0.8 + 0.3, rr = 1.15 + (k % 3) * 0.2;
      m.add(geoRock, k % 2 ? COL.stone : COL.stone2, lx + Math.cos(a) * rr, 0.25, lz + Math.sin(a) * rr, 0, a, 0, 0.55 + (k % 3) * 0.12, 0.42, 0.5);
    }
    m.add(geoPole, COL.stone2, lx, 0.25, lz, 0, 0, 0, 1.25, 0.5, 1.25);
    m.add(geoTower, COL.white, lx, 0.5 + H / 2, lz, 0, 0, 0, R0, H, R0);
    for (const y of [1.2, 2.5, 3.8]) m.add(geoPole, COL.red, lx, 0.5 + y, lz, 0, 0, 0, rAt(y) * 1.02 + 0.045, 0.8, rAt(y) * 1.02 + 0.045);   // red bands
    m.add(geoBox, COL.woodDark, lx, 0.5 + 0.45, lz + R0 - 0.05, 0, 0, 0, 0.42, 0.8, 0.14);                                      // door
    m.add(geoPole, COL.navy, lx, 0.5 + H + 0.06, lz, 0, 0, 0, 0.88, 0.12, 0.88);                                                  // gallery floor
    m.add(geoRing(0.8, 0.88, 14), COL.navy, lx, 0.5 + H + 0.42, lz, flat, 0, 0, 1, 1, 1);                                          // gallery rail
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; m.add(geoPole, COL.navy, lx + Math.cos(a) * 0.82, 0.5 + H + 0.25, lz + Math.sin(a) * 0.82, 0, 0, 0, 0.025, 0.36, 0.025); }
    gm.add(geoPole, 0xfff0a8, lx, 0.5 + H + 0.52, lz, 0, 0, 0, 0.5, 0.7, 0.5);                                                    // the lamp room (glows)
    gm.add(geoBall, 0xffffff, lx, 0.5 + H + 0.52, lz, 0, 0, 0, 0.26);                                                              // the bright lamp itself
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) m.add(geoPole, COL.navy, lx + Math.cos(a) * 0.5, 0.5 + H + 0.52, lz + Math.sin(a) * 0.5, 0, 0, 0, 0.03, 0.74, 0.03);   // lamp frame
    m.add(geoCone, COL.red, lx, 0.5 + H + 1.2, lz, 0, 0, 0, 0.72, 0.6, 0.72);                                                     // cap
    m.add(geoBall, COL.sun, lx, 0.5 + H + 1.55, lz, 0, 0, 0, 0.09);
    m.add(geoBox, 0xcdeeff, lx, 0.5 + 2.2, lz + rAt(2.2) - 0.02, 0, 0, 0, 0.2, 0.3, 0.06);                                          // a small window
    solid(lx, lz, 1.55);
  }

  // The dock bell's post and arm (the bell itself is the tap prop), and the bunting's two poles.
  {
    const [bx, bz] = HARBOR_SPOTS.bell;
    m.add(geoPole, COL.wood2, bx + 0.6, 1.2, bz, 0, 0, 0, 0.07, 2.4, 0.07);
    m.add(geoBox, COL.wood2, bx + 0.3, 2.35, bz, 0, 0, 0, 0.7, 0.07, 0.07);
    m.add(geoBox, COL.wood, bx + 0.6, 0.1, bz, 0, 0, 0, 0.5, 0.2, 0.5);
    m.add(geoBall, 0xf2c14e, bx, 2.31, bz, 0, 0, 0, 0.05);
    solid(bx + 0.6, bz, 0.25, false);
    const [ux0, uz0] = HARBOR_SPOTS.bunting;
    for (const dx of [-1.9, 1.9]) {
      m.add(geoPole, COL.wood2, ux0 + dx, 1.4, uz0, 0, 0, 0, 0.06, 2.8, 0.06);
      m.add(geoBall, COL.sun, ux0 + dx, 2.82, uz0, 0, 0, 0, 0.09);
      solid(ux0 + dx, uz0, 0.22, false);
    }
    // the bunting's two ends are tied up to the poles
    for (const dx of [-1.9, 1.9]) m.add(geoBall, 0xf4ead0, ux0 + dx * 0.97, 2.65, uz0, 0, 0, 0, 0.08, 0.03, 0.03);
  }

  // The three sentence flags: a pole with a cross-arm and a cloth sign hanging from it. Signs face south, toward the camera.
  // 1: a capital letter A.  2: words (three bars).  3: end marks  .  ?  !
  SENTENCE_FLAG_KEYS.forEach((f, i) => {
    const [x, z] = HARBOR_SPOTS[f.key], cy = 1.95, ink = 0x1f3c7a;
    m.add(geoPole, COL.wood2, x, 1.3, z, 0, 0, 0, 0.05, 2.6, 0.05);
    m.add(geoBox, COL.wood, x, 0.08, z, 0, 0, 0, 0.4, 0.16, 0.4);
    m.add(geoBox, COL.wood, x, 2.52, z, 0, 0, 0, 1.7, 0.07, 0.07);
    m.add(geoBall, COL.sun, x, 2.66, z, 0, 0, 0, 0.09);
    const cloth = [0xffe27a, 0xa9ddff, 0xffc4d8][i];
    gm.add(geoBox, 0xffffff, x, cy, z + 0.02, 0, 0, 0, 1.52, 1.14, 0.03);                            // white border
    gm.add(geoBox, cloth, x, cy, z + 0.045, 0, 0, 0, 1.4, 1.02, 0.03);                                // cloth
    const zz = z + 0.08;
    if (i === 0) {          // a big capital A
      gm.add(geoBox, ink, x - 0.14, cy, zz, 0, 0, -0.33, 0.13, 0.78, 0.03);
      gm.add(geoBox, ink, x + 0.14, cy, zz, 0, 0, 0.33, 0.13, 0.78, 0.03);
      gm.add(geoBox, ink, x, cy - 0.12, zz, 0, 0, 0, 0.3, 0.09, 0.03);
    } else if (i === 1) {   // three word bars of different lengths
      [[-0.42, 0.34], [0.0, 0.26], [0.4, 0.38]].forEach(([ox, w]) => gm.add(geoBox, ink, x + ox * 0.9 + (w - 0.3) * 0, cy, zz, 0, 0, 0, w * 0.9, 0.17, 0.03));
    } else {                // . ? !
      gm.add(geoDisc(12), ink, x - 0.47, cy - 0.29, zz, 0, 0, 0, 0.085, 0.085, 1);                      // the period (a dot)
      gm.add(geoHook, ink, x + 0.0, cy + 0.18, zz, 0, 0, -1.55, 0.15, 0.15, 0.4);                      // the question mark's curl
      gm.add(geoBox, ink, x + 0.01, cy - 0.07, zz, 0, 0, 0, 0.075, 0.18, 0.03);                        // its stem
      gm.add(geoDisc(12), ink, x + 0.01, cy - 0.29, zz, 0, 0, 0, 0.07, 0.07, 1);                        // its dot
      gm.add(geoBox, ink, x + 0.47, cy + 0.05, zz, 0, 0, 0, 0.1, 0.46, 0.03);                            // the exclamation mark's bar
      gm.add(geoDisc(12), ink, x + 0.47, cy - 0.29, zz, 0, 0, 0, 0.07, 0.07, 1);                        // its dot
    }
    solid(x, z, 0.25, false);
  });

  // Pine trees (three layers of green) and rocks along the edges.
  PINES.forEach(([x, z], i) => {
    const s = 0.9 + (i % 3) * 0.15;
    m.add(geoPole, COL.trunk, x, 0.5 * s, z, 0, 0, 0, 0.14 * s, 1.0 * s, 0.14 * s);
    m.add(geoCone, i % 2 ? COL.pine : COL.pine3, x, 1.3 * s, z, 0, i, 0, 0.85 * s, 1.2 * s, 0.85 * s);
    m.add(geoCone, COL.pine2, x, 2.0 * s, z, 0, i + 1, 0, 0.68 * s, 1.1 * s, 0.68 * s);
    m.add(geoCone, i % 2 ? COL.pine3 : COL.pine, x, 2.65 * s, z, 0, i + 2, 0, 0.5 * s, 1.0 * s, 0.5 * s);
    solid(x, z, 0.5 * s + 0.1);
  });
  for (const [x, z, s, c] of [[-6.2, -5.3, 0.8, 0], [-5.4, -6.1, 0.55, 1], [7.9, -6.4, 0.7, 0], [6.9, -8.6, 0.45, 1], [-2.6, -2.2, 0.5, 1], [8.7, 1.8, 0.65, 0], [-0.4, -2.4, 0.4, 1]]) {
    m.add(geoRock, c ? COL.stone : COL.stone2, x, 0.28 * s, z, 0, x, 0, s, 0.7 * s, 0.85 * s);
    if (s >= 0.5) solid(x, z, s * 0.9);
  }

  // Summer flowers in the grass (daisies, buttercups, pink clover): small bright dots kept off the path, water and buildings.
  {
    let placed = 0;
    const cols = [0xffffff, 0xffe14d, 0xff7aa8, 0xffffff, 0xff9a3c];
    for (let i = 0; i < 160 && placed < 46; i++) {
      const a = i * 2.399 + 0.4, r = 1.5 + ((i * 53) % 74) / 10;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (r > 8.6 || harborWet(x, z)) continue;
      if (Math.abs(x * uz - z * ux) < 1.5 && x * ux + z * uz > -1) continue;   // keep the path clear
      if (Math.hypot(x - 2.4, z + 1.0) < 1.3) continue;                          // and the slabs to the dock
      if (Math.hypot(x - padL.x, z - padL.z) < 1.5) continue;
      if (obst.some(([ox, oz, or]) => Math.hypot(x - ox, z - oz) < or + 0.7)) continue;
      if (Object.values(HARBOR_SPOTS).some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 0.9)) continue;
      placed++;
      m.add(geoPole, 0x3f9d4f, x, 0.1, z, 0, 0, 0, 0.012, 0.2, 0.012);
      m.add(geoBall, cols[placed % 5], x, 0.22, z, 0, 0, 0, 0.07, 0.04, 0.07);
      m.add(geoBall, 0xffb300, x, 0.245, z, 0, 0, 0, 0.025);
    }
  }

  const scenery = new THREE.Mesh(m.build(), vcMat);
  scenery.position.set(cx, 0, cz);
  scene.add(scenery);
  const glowParts = new THREE.Mesh(gm.build(), glowMat);
  glowParts.position.set(cx, 0, cz);
  scene.add(glowParts);

  const dry = (x, z) => !harborWet(x - cx, z - cz) && Math.hypot(x - cx, z - cz) < HARBOR_R - 0.6;
  return {
    update,
    wet: (x, z) => harborWet(x - cx, z - cz),
    dry,
    /** Where a find goes: the wished-for world spot if it is free and dry, else the nearest such spot on a fine grid (so it always lands
     * close by, inside the harbor). `free(x, z)` is world.js's clear-ground test. Never throws. */
    settle(x0, z0, free) {
      const good = (x, z) => dry(x, z) && free(x, z);
      if (good(x0, z0)) return [x0, z0];
      let best = null, bd = Infinity;
      for (let gx = -HARBOR_R; gx <= HARBOR_R; gx += 0.5) for (let gz = -HARBOR_R; gz <= HARBOR_R; gz += 0.5) {
        const x = cx + gx, z = cz + gz;
        if (!good(x, z)) continue;
        const d = Math.hypot(x - x0, z - z0);
        if (d < bd) { bd = d; best = [x, z]; }
      }
      return best || [cx + padL.x * 0.5, cz + padL.z * 0.5 + 2];
    },
  };
}
