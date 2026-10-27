// ============================================================================
// Zoe's Starlight Quest — Wayfinder Isle (K6). An original small tropical island: a grassy rise with a palm, warm sand,
// palm trees, a plain little outrigger canoe on the shore, a lookout rock, stepping stones, a ring of stacked stones and
// a star-compass drawn on the sand. Six tap surprises and one secret (three shaped stones, fewest corners to most).
// Built by world.js ONLY when the isle slot is "open" (worldmap.js isIsleOpen): built for real (K7), or ?preview=isle.
//
// Draw-call budget (rest state), checked by tests/isle_check.mjs:
//   1 static scenery mesh (grass, sand, lagoon, compass, palms, rocks, stones, cairns, tufts: all merged, vertex colours)
//   2 tap palm (trunk + crown, falling coconut) · 1 canoe · 1 conch horn · 1 sea bird
//   1 shared glow Points (stepping-stone lights, compass twinkles, horn sound rings)
//   = 7 (limit 8). Tap hit-boxes use invisible materials; glow sprites only draw during a reaction.
// Geometry/materials come from world.js's G()/M() caches (same keys as the cove where the shape is the same).
// No lights, no shadow maps, no new assets. All motion is skipped under calmMotion (a tap then only glows).
// ============================================================================

import { makeMerger } from './cove.js?v=20261027e2';

const D2R = Math.PI / 180;

// Isle layout, in metres from the island centre (x east, z south). The entrance (branch path) is to the north, so the
// camera, which looks north from the south, sees the whole island opening out in front of the path.
export const ISLE_R = 8.4;   // dry land (grass and sand) ends here; the shallow lagoon ring runs from here to the rim
export const ISLE_SPOTS = {
  palm: [5.0, -5.8],                                   // tap: palm that sways and drops a coconut
  bird: [6.5, -3.5],                                   // tap: sea bird perched on the lookout rock
  canoe: [4.4, 5.2],                                   // tap: canoe that rocks
  conch: [-5.4, 4.6],                                  // tap: shell horn that toots
  steps: [-1.4, -2.7],                                 // tap: stepping stones that light up in turn
  compass: [0, 2.4],                                   // tap: star-compass stones that twinkle
  shape1: [3.8, 0.6], shape2: [5.8, 0.6], shape3: [7.8, 0.6],   // the secret: circle (0 corners), triangle (3), square (4)
};
export const ISLE_STATICS = {
  rock: [6.9, -3.5], hill: [-5.4, -0.6], cairn: [-4.4, -5.0],
};
export const STEP_STONES = [[-0.9, -4.4], [-1.8, -3.3], [-1.9, -2.0], [-1.1, -0.9]];
export const COMPASS_R = 2.8;
// The three secret stones and how many corners each has (a circle has none). Tap them in this order.
export const SHAPE_STONES = [
  { key: 'shape1', shape: 'circle', corners: 0 },
  { key: 'shape2', shape: 'triangle', corners: 3 },
  { key: 'shape3', shape: 'square', corners: 4 },
];

/** True when an isle-local spot is in the lagoon (or on the rim): treasures stay on dry land. */
export function isleWet(lx, lz) { return Math.hypot(lx, lz) > ISLE_R - 0.1; }

/**
 * Build the isle. env = { THREE, scene, center:{x,z}, G, M, addCollider, addTappable, starGeometry, softDot, calmMotion }.
 * Returns { update(t, dt), wet(worldX, worldZ) }.
 */
export function buildIsle(env) {
  const { THREE, scene, center, G, M, addCollider, addTappable, softDot, calmMotion } = env;
  const cx = center.x, cz = center.z;
  const vcMat = M('coveVC', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }));

  // Shared primitive geometries (same G() keys and shapes as the cove, so a world with both lands builds each once)
  const geoDisc = (n) => G('coveDisc' + n, () => new THREE.CircleGeometry(1, n));
  const geoBall = G('coveBall', () => new THREE.SphereGeometry(1, 8, 6));
  const geoRock = G('coveRock', () => new THREE.DodecahedronGeometry(1, 0));
  const geoPole = G('covePole', () => new THREE.CylinderGeometry(1, 1, 1, 7));
  const geoCone = G('coveCone', () => new THREE.ConeGeometry(1, 1, 8));
  const geoBox = G('coveBox', () => new THREE.BoxGeometry(1, 1, 1));
  const geoTrunk = G('isleTrunk', () => new THREE.CylinderGeometry(0.8, 1, 1, 6));      // tapered: a little thinner at the top
  const geoPrism = (n) => G('islePrism' + n, () => new THREE.CylinderGeometry(1, 1, 1, n));   // n sides: 3 triangle, 4 square, 24 round
  const geoRing = (a, b, n, start = 0, len = Math.PI * 2) => G(`isleRing${a}_${b}_${n}_${start.toFixed(2)}_${len.toFixed(2)}`, () => new THREE.RingGeometry(a, b, n, 1, start, len));
  const geoCompass = G('isleCompass', () => {   // 8-point compass star: long points N, E, S, W; short points between
    const sh = new THREE.Shape();
    for (let i = 0; i < 16; i++) {
      const a = Math.PI / 2 - (i * Math.PI) / 8;
      const r = i % 2 === 1 ? 0.52 : (i % 4 === 0 ? 2.5 : 1.6);
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
    }
    sh.closePath();
    return new THREE.ShapeGeometry(sh);
  });

  const items = {};
  const own = (m) => { const mesh = new THREE.Mesh(m.build(), vcMat); return mesh; };
  const wx = (k) => cx + ISLE_SPOTS[k][0], wz = (k) => cz + ISLE_SPOTS[k][1];

  // A palm tree into a merger: ringed bending trunk, a crown of drooping fronds and a few coconuts.
  // (x, y0, z) is the foot; s is the size; lean bends the trunk toward +x (before yaw); coconuts: leave them off for the tap palm's crown.
  const palm = (m, x, y0, z, s, lean, yaw, coconuts = true) => {
    const H = 3.3 * s, N = 6, cy = Math.cos(yaw), sy = Math.sin(yaw);
    const at = (t) => { const px = lean * H * t * t; return [x + px * cy, y0 + H * t, z - px * sy]; };
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N, tm = (t0 + t1) / 2, c = at(tm);
      const tilt = Math.atan2(lean * 2 * tm, 1), r = (0.22 - 0.1 * t0) * s;
      m.add(geoTrunk, i % 2 ? 0xa8794d : 0x91663f, c[0], c[1], c[2], 0, yaw, -tilt, r, (H / N) * 1.12, r);
    }
    const top = at(1);
    m.add(geoBall, 0x6b4a2b, top[0], top[1] + 0.05 * s, top[2], 0, 0, 0, 0.22 * s);
    for (let k = 0; k < 7; k++) {
      const a = k * Math.PI * 2 / 7 + 0.3, pitch = 0.42 + (k % 2) * 0.28, d = 1.0 * s;
      const dx = Math.sin(a) * Math.cos(pitch), dy = -Math.sin(pitch), dz = Math.cos(a) * Math.cos(pitch);
      m.add(geoBall, k % 2 ? 0x4fb35a : 0x3a9a4c, top[0] + dx * d, top[1] + 0.12 * s + dy * d, top[2] + dz * d, pitch, a, 0, 0.3 * s, 0.06 * s, 1.15 * s);
    }
    if (coconuts) for (const [ox, oz] of [[0.2, 0.08], [-0.16, 0.14], [0.02, -0.2]]) m.add(geoBall, 0x6b4a2b, top[0] + ox * s, top[1] - 0.16 * s, top[2] + oz * s, 0, 0, 0, 0.15 * s);
  };

  // ---------------------------------------------------------------- tap surprises (own meshes where the part moves)
  // 1. Palm that sways and drops a coconut (crown mesh + one coconut mesh)
  const PALM_LEAN = 0.22, PALM_TOP = [PALM_LEAN * 3.3, 3.3];
  items.palm = addTappable((g) => {
    const m = makeMerger(THREE);
    palm(m, 0, 0, 0, 1, PALM_LEAN, 0, false);
    for (const [ox, oz] of [[0.2, 0.08], [-0.16, 0.14]]) m.add(geoBall, 0x6b4a2b, PALM_TOP[0] + ox, PALM_TOP[1] - 0.16, oz, 0, 0, 0, 0.15);
    g.add(own(m));
    const nut = makeMerger(THREE);
    nut.add(geoBall, 0x6b4a2b, 0, 0, 0, 0, 0, 0, 0.17);
    nut.add(geoBall, 0x8a6a45, 0.05, 0.07, 0.1, 0, 0, 0, 0.07);
    const coco = own(nut); coco.position.set(PALM_TOP[0], PALM_TOP[1] - 0.22, 0.05); coco.visible = false; g.add(coco);
    g.userData.coco = coco;
    return { glowY: 3.0, hitR: 1.6 };
  }, wx('palm'), wz('palm'), 0, 0xfff1c8);
  items.palm.group.rotation.y = 0;
  items.palm.dur = 2.6;
  items.palm.react = (it, p) => {
    const coco = it.group.userData.coco;
    if (p >= 1) { coco.visible = false; it.group.rotation.x = 0; return; }
    const shake = p < 0.5 ? Math.sin(Math.PI * Math.min(1, p / 0.5)) : 0;   // sways hard for the first half, then settles
    it.group.rotation.z = Math.sin(p * Math.PI * 12) * 0.075 * shake + Math.sin(p * Math.PI * 4) * 0.02 * (1 - p);
    it.group.rotation.x = Math.sin(p * Math.PI * 9 + 1) * 0.03 * shake;
    // The coconut lets go at 25%, falls, bounces once and rests on the sand until the end
    const x0 = PALM_TOP[0], y0 = PALM_TOP[1] - 0.22, yEnd = 0.17;
    if (p < 0.25) { coco.visible = false; return; }
    coco.visible = true;
    const u = (p - 0.25) / 0.3, v = (p - 0.55) / 0.2;
    const k = Math.min(1, u);
    coco.position.set(x0 + 0.35 * k, u < 1 ? y0 + (yEnd - y0) * u * u : yEnd + (v >= 0 && v < 1 ? 0.45 * 4 * v * (1 - v) : 0), 0.05 + 0.6 * k);
    coco.rotation.x = u * 5;
  };

  // 2. Canoe that rocks: a plain wooden hull with an outrigger float (one mesh). Long axis is z; the float is on +x.
  items.canoe = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoBall, 0xc58a52, 0, 0.3, 0, 0, 0, 0, 0.5, 0.3, 1.7);                   // hull
    m.add(geoBall, 0x8b5a33, 0, 0.44, 0, 0, 0, 0, 0.37, 0.12, 1.5);                 // dark inside
    m.add(geoCone, 0xd9a066, 0, 0.5, -1.85, -Math.PI / 2, 0, 0, 0.2, 0.75, 0.16);   // bow
    m.add(geoCone, 0xd9a066, 0, 0.5, 1.85, Math.PI / 2, 0, 0, 0.2, 0.75, 0.16);     // stern
    for (const z of [-0.65, 0.65]) {
      m.add(geoPole, 0xb07a48, 0.55, 0.5, z, 0, 0, Math.PI / 2, 0.045, 1.2, 0.045);  // boom out to the float
      m.add(geoPole, 0xb07a48, 1.15, 0.33, z, 0, 0, 0, 0.04, 0.42, 0.04);
    }
    m.add(geoBall, 0xe3b883, 1.15, 0.17, 0, 0, 0, 0, 0.15, 0.13, 1.35);              // float
    m.add(geoBox, 0xb98657, -0.05, 0.47, 0.1, 0, 0, 0, 0.9, 0.04, 0.12);             // a seat plank
    g.add(own(m));
    return { glowY: 0.9, hitR: 1.5 };
  }, wx('canoe'), wz('canoe'), 0, 0xffe6b8);
  items.canoe.group.rotation.y = 1.2;   // lies along the shore
  items.canoe.dur = 2.0;
  items.canoe.react = (it, p) => {
    const f = p >= 1 ? 0 : (1 - p) * (1 - p);
    it.group.rotation.z = Math.sin(p * Math.PI * 7) * 0.2 * f;   // rolls about its long axis
    it.group.rotation.x = Math.sin(p * Math.PI * 5 + 1) * 0.05 * f;
  };

  // 3. Shell horn that toots: a cream-and-pink spiral shell with a flared mouth (one mesh) + sound rings in the shared Points.
  items.conch = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoBall, 0xfff0dc, 0, 0.46, 0, 0, 0, 0, 0.5, 0.42, 0.62);                          // body
    m.add(geoCone, 0xffe0c4, 0, 0.66, -0.88, -1.21, 0, 0, 0.32, 0.95, 0.32);                  // spire
    m.add(geoBall, 0xffd9bf, 0, 0.56, -0.36, 0, 0, 0, 0.3, 0.28, 0.34);                       // a second whorl
    m.add(geoBall, 0xffa98e, 0, 0.42, 0.52, 0, 0, 0, 0.42, 0.3, 0.2);                         // flared lip
    m.add(geoBall, 0xc2655a, 0, 0.42, 0.66, 0, 0, 0, 0.26, 0.18, 0.1);                        // inside the mouth
    for (const x of [-0.18, 0.18]) m.add(geoBall, 0xffc9a8, x, 0.74, 0.1, 0, 0, 0, 0.09);      // two little ridges
    g.add(own(m));
    return { glowY: 0.75, hitR: 1.1 };
  }, wx('conch'), wz('conch'), 0, 0xffd2c0);
  items.conch.group.rotation.y = 0;   // mouth faces the camera
  items.conch.dur = 1.6;
  items.conch.react = (it, p) => {
    const f = p >= 1 ? 0 : 1 - p;
    // three quick toots: the shell puffs up and wobbles
    const toot = Math.max(0, Math.sin(p * Math.PI * 3)) * f;
    it.group.scale.setScalar(1.25 * (1 + 0.16 * toot));
    it.group.rotation.z = Math.sin(p * Math.PI * 18) * 0.05 * f;
  };

  // 4. Stepping stones that light up in turn (stones are static scenery; the lights are the shared Points).
  items.steps = addTappable(() => ({ glowY: 0.3, hitR: 1.6 }), wx('steps'), wz('steps'), 0, 0xfff1b0);
  items.steps.dur = 1.6;

  // 5. Sea bird on the lookout rock: lifts off, circles the island once and lands again (one mesh; its wings beat by squashing).
  const ROCK_TOP = 3.25;
  items.bird = addTappable((g) => {
    const m = makeMerger(THREE);
    m.add(geoBall, 0xfdfdfd, 0, 0.3, 0, 0, 0, 0, 0.2, 0.17, 0.42);                   // body
    m.add(geoBall, 0xffffff, 0, 0.42, 0.38, 0, 0, 0, 0.13);                           // head
    m.add(geoCone, 0xffb03b, 0, 0.4, 0.58, Math.PI / 2, 0, 0, 0.045, 0.2, 0.045);    // beak
    for (const sx of [-1, 1]) {
      m.add(geoBall, 0xe3ebf2, sx * 0.42, 0.34, -0.02, 0, 0, sx * 0.12, 0.5, 0.035, 0.2);   // wings
      m.add(geoBall, 0x6e7b88, sx * 0.86, 0.36, -0.02, 0, 0, 0, 0.1, 0.03, 0.12);           // dark wing tips
      m.add(geoBall, 0x22303c, sx * 0.07, 0.46, 0.46, 0, 0, 0, 0.022);                        // eyes
    }
    m.add(geoCone, 0xd4dde5, 0, 0.3, -0.5, -Math.PI / 2, 0, 0, 0.12, 0.28, 0.03);     // tail
    g.add(own(m));
    return { glowY: 0.6, hitR: 0.95 };
  }, wx('bird'), wz('bird'), 0, 0xe6f4ff);
  items.bird.group.rotation.y = 0;   // perched, looking out to sea (toward the camera)
items.bird.group.position.y = ROCK_TOP;
  items.bird.baseY = ROCK_TOP;
  items.bird.dur = 3.4;
  items.bird.react = (it, p) => {
    const g = it.group, bx = ISLE_SPOTS.bird[0], bz = ISLE_SPOTS.bird[1];
    if (p >= 1) { g.position.set(cx + bx, ROCK_TOP, cz + bz); g.rotation.set(0, 0, 0); g.children[0].scale.set(1, 1, 1); return; }
    const q = Math.min(1, Math.max(0, (p - 0.08) / 0.84));          // flight time 0..1
    const r0 = Math.hypot(bx, bz), a = Math.atan2(bz, bx) + q * Math.PI * 2;
    const lift = Math.sin(Math.PI * q);
    g.position.set(cx + Math.cos(a) * r0, ROCK_TOP + (q > 0 && q < 1 ? 0.6 + 2.2 * lift : 0), cz + Math.sin(a) * r0);
    g.rotation.y = q > 0 && q < 1 ? Math.atan2(-Math.sin(a), Math.cos(a)) : 0;
    g.rotation.z = q > 0 && q < 1 ? -0.35 * lift : 0;                  // leans into the turn
    g.children[0].scale.x = q > 0 && q < 1 ? 0.7 + 0.35 * Math.abs(Math.sin(p * Math.PI * 16)) : 1;   // wing beat
  };

  // 6. Star-compass stones that twinkle (the compass is static scenery; the twinkles are the shared Points).
  items.compass = addTappable(() => ({ glowY: 0.3, hitR: 2.3 }), wx('compass'), wz('compass'), 0, 0xdff2ff);
  items.compass.dur = 2.4;

  // Secret: three stones shaped like a circle, a triangle and a square. Tap them from fewest corners to most (circle 0, triangle 3,
  // square 4). world.js calls onSecretTap('shape-N'); the stones themselves are static scenery.
  SHAPE_STONES.forEach((s, i) => {
    items[s.key] = addTappable(() => ({ glowY: 0.8, hitR: 0.75 }), wx(s.key), wz(s.key), 0, 0xfff1c8, 'shape-' + (i + 1));
  });
  for (const it of Object.values(items)) { it.baseYaw = it.group.rotation.y; }

  // ---------------------------------------------------------------- shared glow Points (21 dots)
  const STEP_DOTS = STEP_STONES.length, COMP_AT = STEP_DOTS, TOOT_AT = COMP_AT + 5, FX_N = TOOT_AT + 12; // 4 stones, 5 compass, 12 horn rings
  const fxPos = new Float32Array(FX_N * 3).fill(-50);
  const fxCol = new Float32Array(FX_N * 3);
  const fxGeo = new THREE.BufferGeometry();
  fxGeo.setAttribute('position', new THREE.BufferAttribute(fxPos, 3));
  fxGeo.setAttribute('color', new THREE.BufferAttribute(fxCol, 3));
  const fx = new THREE.Points(fxGeo, new THREE.PointsMaterial({
    map: softDot, size: 0.8, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  fx.frustumCulled = false; fx.visible = false;
  scene.add(fx);
  let stepsT = -1, compassT = -1, tootT = -1;
  items.steps.onTap = () => { stepsT = 0; fx.visible = true; };
  items.compass.onTap = () => { compassT = 0; fx.visible = true; };
  items.conch.onTap = () => { tootT = 0; fx.visible = true; };
  const park = (i) => { fxPos[i * 3 + 1] = -50; fxCol[i * 3] = fxCol[i * 3 + 1] = fxCol[i * 3 + 2] = 0; };
  const put = (i, x, y, z, k, r, g, b) => { fxPos[i * 3] = x; fxPos[i * 3 + 1] = y; fxPos[i * 3 + 2] = z; fxCol[i * 3] = r * k; fxCol[i * 3 + 1] = g * k; fxCol[i * 3 + 2] = b * k; };
  const compassX = wx('compass'), compassZ = wz('compass');
  const compassDots = [[0, -COMPASS_R], [COMPASS_R, 0], [0, COMPASS_R], [-COMPASS_R, 0], [0, 0]];   // N, E, S, W stones, then the middle
  const mouthX = wx('conch'), mouthZ = wz('conch') + 0.95;

  function update(t, dt) {
    if (calmMotion) return; // calm motion: taps glow only; nothing here moves
    // Gentle idle sway of the tap palm (only while it is not being tapped)
    if (items.palm.t < 0) items.palm.group.rotation.z = Math.sin(t * 0.9) * 0.02;
    if (!fx.visible) return;
    if (stepsT >= 0) {
      stepsT += dt;
      STEP_STONES.forEach(([sx, sz], i) => {
        const pt = (stepsT - i * 0.28) / 0.6;
        if (pt <= 0 || pt >= 1) { park(i); return; }
        put(i, cx + sx, 0.25, cz + sz, Math.sin(Math.PI * pt), 1, 0.88, 0.45);
      });
      if (stepsT > STEP_DOTS * 0.28 + 0.7) { stepsT = -1; for (let i = 0; i < STEP_DOTS; i++) park(i); }
    }
    if (compassT >= 0) {
      compassT += dt;
      compassDots.forEach(([dx, dz], i) => {
        const pt = (compassT - i * 0.3) / 0.7;
        if (pt <= 0 || pt >= 1) { park(COMP_AT + i); return; }
        const tw = Math.sin(Math.PI * pt);
        put(COMP_AT + i, compassX + dx, 0.45 + 0.5 * pt, compassZ + dz, tw * (0.7 + 0.3 * Math.sin(pt * 40)), 0.8, 0.93, 1);
      });
      if (compassT > 5 * 0.3 + 0.8) { compassT = -1; for (let i = 0; i < 5; i++) park(COMP_AT + i); }
    }
    if (tootT >= 0) {
      tootT += dt;
      for (let ring = 0; ring < 2; ring++) {
        const pt = (tootT - ring * 0.35) / 0.8;
        for (let d = 0; d < 6; d++) {
          const i = TOOT_AT + ring * 6 + d;
          if (pt <= 0 || pt >= 1) { park(i); continue; }
          const a = (d / 6) * Math.PI * 2 + ring * 0.5, r = 0.2 + 1.3 * pt;
          put(i, mouthX + Math.cos(a) * r, 0.7 + Math.sin(a) * r * 0.8, mouthZ + 0.2 + pt * 0.6, 1 - pt, 1, 0.85, 0.9);
        }
      }
      if (tootT > 1.3) { tootT = -1; for (let i = TOOT_AT; i < FX_N; i++) park(i); }
    }
    fxGeo.attributes.position.needsUpdate = true; fxGeo.attributes.color.needsUpdate = true;
    if (stepsT < 0 && compassT < 0 && tootT < 0) fx.visible = false;
  }

  // ---------------------------------------------------------------- static scenery (ONE merged mesh)
  const m = makeMerger(THREE);
  const flat = -Math.PI / 2;
  const gap = 0.55;   // half-width (radians) of the opening in the lagoon at the north, where the path comes in
  // Ground: grass disc over the path's end, a sand beach ring, the lagoon ring around it (open at the path), foam, a sand patch for the compass.
  m.add(geoDisc(48), 0x93d67b, 0, 0.03, 0, flat, 0, 0, 10.4);
  m.add(geoRing(6.6, 8.7, 56), 0xf6e2ab, 0, 0.035, 0, flat);
  m.add(geoRing(8.6, 10.5, 56, Math.PI / 2 + gap, Math.PI * 2 - 2 * gap), 0x86e0d6, 0, 0.05, 0, flat);       // shallow water
  m.add(geoRing(9.6, 10.5, 56, Math.PI / 2 + gap, Math.PI * 2 - 2 * gap), 0x4fc3d4, 0, 0.055, 0, flat);      // deeper water at the rim
  m.add(geoRing(8.45, 8.8, 56, Math.PI / 2 + gap, Math.PI * 2 - 2 * gap), 0xffffff, 0, 0.06, 0, flat);       // foam line
  m.add(geoDisc(40), 0xf9ebc2, ISLE_SPOTS.compass[0], 0.04, ISLE_SPOTS.compass[1], flat, 0, 0, COMPASS_R + 0.7);

  // The star-compass drawn on the sand: a ring, the 8-point star, a lighter inner star, and a stone at each of N, E, S, W.
  {
    const [kx, kz] = ISLE_SPOTS.compass;
    m.add(geoRing(COMPASS_R - 0.26, COMPASS_R, 48), 0xd5b678, kx, 0.05, kz, flat);
    m.add(geoRing(1.0, 1.14, 36), 0xd5b678, kx, 0.05, kz, flat);
    m.add(geoCompass, 0xc9a35f, kx, 0.058, kz, flat);
    m.add(geoCompass, 0xf3dca0, kx, 0.064, kz, flat, 0, 0, 0.45);
    [[0, -COMPASS_R], [COMPASS_R, 0], [0, COMPASS_R], [-COMPASS_R, 0]].forEach(([dx, dz], i) => {
      m.add(geoRock, i % 2 ? 0xe9e2d4 : 0xddd5c4, kx + dx, 0.2, kz + dz, 0, i, 0, 0.34, 0.26, 0.34);
      m.add(geoBall, 0xfff8e0, kx + dx, 0.38, kz + dz, 0, 0, 0, 0.08);    // a pale glint on top
    });
  }
  // Stepping stones: flat round stones from the entrance toward the compass.
  STEP_STONES.forEach(([x, z], i) => {
    m.add(geoPole, i % 2 ? 0xb4bbc4 : 0xc6ccd3, x, 0.07, z, 0, i, 0, 0.5 + (i % 2) * 0.07, 0.14, 0.46);
  });

  // Grassy rise with a palm on top (solid)
  {
    const [hx, hz] = ISLE_STATICS.hill;
    m.add(geoBall, 0x7cc566, hx, 0.0, hz, 0, 0, 0, 2.7, 1.35, 2.5);
    m.add(geoBall, 0x8fd672, hx + 0.3, 0.2, hz - 0.2, 0, 0, 0, 1.7, 1.2, 1.6);
    addCollider(cx + hx, cz + hz, 2.1);
    palm(m, hx + 0.1, 1.1, hz, 1.05, -0.2, 0.6);
  }
  // Lookout rock: three stacked boulders and a flat top (solid); the sea bird perches on it.
  {
    const [rx, rz] = ISLE_STATICS.rock;
    m.add(geoRock, 0xb3a99c, rx, 0.75, rz, 0, 0.4, 0, 1.9, 1.2, 1.7);
    m.add(geoRock, 0xc2b8a8, rx - 0.5, 1.9, rz + 0.1, 0, 1.1, 0, 1.25, 1.0, 1.1);
    m.add(geoRock, 0xd2c8b7, rx - 0.4, 2.8, rz, 0, 0.2, 0, 0.9, 0.45, 0.8);
    m.add(geoRock, 0xa59b8e, rx + 1.9, 0.35, rz + 1.0, 0, 0.7, 0, 0.6, 0.4, 0.55);
    addCollider(cx + rx, cz + rz, 1.8);
  }
  // Ring of stacked stones: seven little cairns in a circle (each solid)
  {
    const [rx, rz] = ISLE_STATICS.cairn;
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7 + 0.4, x = rx + Math.cos(a) * 1.3, z = rz + Math.sin(a) * 1.3;
      m.add(geoRock, i % 2 ? 0xa9a39a : 0xbdb6aa, x, 0.14, z, 0, i, 0, 0.32, 0.17, 0.3);
      m.add(geoRock, i % 2 ? 0xc4beb2 : 0xb2aca1, x + 0.02, 0.34, z, 0, i + 2, 0, 0.23, 0.14, 0.22);
      m.add(geoRock, 0xd3cdc1, x - 0.02, 0.5, z, 0, i + 4, 0, 0.15, 0.1, 0.14);
      addCollider(cx + x, cz + z, 0.32);
    }
  }
  // The three secret shape stones: upright slabs with a lighter top, so the shape shows from above.
  {
    const top = [0xa8e2f5, 0xffc4a6, 0xcdb9fa], side = [0x6ec1e4, 0xff9b71, 0xa98bf5];
    const sizes = [0.62, 0.74, 0.68], sides = [24, 3, 4], turn = [0, Math.PI, Math.PI / 4];
    SHAPE_STONES.forEach((s, i) => {
      const g = items[s.key].group.position, x = g.x - cx, z = g.z - cz;
      m.add(geoPrism(sides[i]), side[i], x, 0.37, z, 0, turn[i], 0, sizes[i], 0.74, sizes[i]);
      m.add(geoPrism(sides[i]), top[i], x, 0.76, z, 0, turn[i], 0, sizes[i] * 0.86, 0.06, sizes[i] * 0.86);
    });
  }
  // Palms: the tap palm's neighbours (solid trunks) and a coconut palm on the beach
  palm(m, ISLE_SPOTS.conch[0] - 2.6, 0, ISLE_SPOTS.conch[1] - 1.4, 1.1, 0.18, 2.2); addCollider(cx + ISLE_SPOTS.conch[0] - 2.6, cz + ISLE_SPOTS.conch[1] - 1.4, 0.45);
  palm(m, -3.9, 0, 6.8, 1.0, -0.2, -0.4); addCollider(cx - 3.9, cz + 6.8, 0.45);
  palm(m, 2.2, 0, 7.6, 1.15, 0.2, 0.9); addCollider(cx + 2.2, cz + 7.6, 0.45);
  addCollider(cx + ISLE_SPOTS.palm[0], cz + ISLE_SPOTS.palm[1], 0.45);
  // The canoe rests on the sand: solid at the hull.
  addCollider(cx + ISLE_SPOTS.canoe[0], cz + ISLE_SPOTS.canoe[1], 1.1);
  // Grass tufts, a few flowers and pebbles for texture (kept off the lagoon)
  for (let i = 0; i < 26; i++) {
    const a = i * 2.399 + 0.5, r = 2.0 + ((i * 53) % 52) / 10;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (isleWet(x, z) || Math.hypot(x, z) > 7.4 || Math.hypot(x - ISLE_SPOTS.compass[0], z - ISLE_SPOTS.compass[1]) < COMPASS_R + 0.9) continue;
    if (Math.hypot(x + 0.5, z + 6.5) < 3.2) continue;   // keep the pad (where the princess will stand) clear
    if (i % 3 === 0) {
      const c = [0xff8fb1, 0xffe27a, 0xffffff][(i / 3 | 0) % 3];
      m.add(geoPole, 0x4caf50, x, 0.12, z, 0, 0, 0, 0.015, 0.24, 0.015);
      m.add(geoBall, c, x, 0.26, z, 0, 0, 0, 0.09, 0.06, 0.09);
    } else {
      for (let k = 0; k < 3; k++) m.add(geoCone, k % 2 ? 0x5fb85a : 0x4aa84f, x + (k - 1) * 0.1, 0.17, z + (k % 2) * 0.06, 0, 0, (k - 1) * 0.3, 0.06, 0.34, 0.06);
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = i * 2.17 + 1.1, r = 6.7 + ((i * 29) % 15) / 10;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (isleWet(x, z) || Math.hypot(x + 0.5, z + 6.5) < 3.2) continue;
    const sz = 0.1 + (i % 3) * 0.05;
    m.add(geoRock, [0xe7d5c4, 0xd9c2b0, 0xfff0e0][i % 3], x, sz * 0.4, z, 0, i, 0, sz, sz * 0.6, sz);
  }
  const scenery = new THREE.Mesh(m.build(), vcMat);
  scenery.position.set(cx, 0, cz);
  scene.add(scenery);

  return { update, wet: (x, z) => isleWet(x - cx, z - cz) };
}
