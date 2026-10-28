// Rosewood Glen (K14): original rose arches, berry bushes and woodland friends.
// Dry ground throughout. Six surprises + three readable word signs. Eight rest
// draw calls: merged scenery, unlit lettering, six moving props. No lights/shadows.
import { makeMerger } from './cove.js?v=20261028r3';
import { WORD_SIGNS } from './treasures.js?v=20261028r3';

export const GLEN_R = 9.6;
export const GLEN_SPOTS = {
  rose: [0, -5.8], berries: [5.4, -4.6], bird: [-3.0, -5.4],
  rabbit: [4.6, 2.4], squirrel: [-0.8, 5.6], chime: [-4.1, 4.0],
  'word-bird': [-1.8, -1.5], 'word-run': [1.0, -1.5], 'word-rose': [3.8, -1.5],
};
export const GLEN_TREES = [[-6.5, -5.3], [5.4, -7.2], [8, 0.2], [5.6, 6.4], [-4.4, 7.2]];
// Small lowercase block alphabet, drawn in the shared unlit mesh; no font/assets.
const GLYPHS = {
  b: ['100','100','110','101','110'], i: ['010','000','010','010','010'],
  r: ['000','000','110','100','100'], d: ['001','001','011','101','011'],
  u: ['000','000','101','101','111'], n: ['000','000','110','101','101'],
  o: ['000','000','111','101','111'], s: ['000','000','011','010','110'],
  e: ['000','000','111','110','111'],
};

/** env follows buildBayou; returns update and a bounded dry treasure settler. */
export function buildGlen(env) {
  const { THREE, scene, center, G, M, addCollider, addTappable, calmMotion } = env;
  const cx = center.x, cz = center.z;
  const material = M('coveVC', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }));
  const glowMaterial = M('glenGlow', () => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const ball = G('coveBall', () => new THREE.SphereGeometry(1, 8, 6));
  const pole = G('covePole', () => new THREE.CylinderGeometry(1, 1, 1, 7));
  const box = G('coveBox', () => new THREE.BoxGeometry(1, 1, 1));
  const disc = G('coveDisc48', () => new THREE.CircleGeometry(1, 48));
  const arch = G('glenArch', () => new THREE.TorusGeometry(1.5, 0.12, 5, 16, Math.PI));
  const m = makeMerger(THREE), ink = makeMerger(THREE);
  const addBall = (merge, color, x, y, z, sx, sy = sx, sz = sx) => merge.add(ball, color, x, y, z, 0, 0, 0, sx, sy, sz);
  const flower = (merge, x, y, z, s) => {
    for (let j = 0; j < 6; j++) {
      const a = j * Math.PI / 3;
      addBall(merge, j % 2 ? 0xff91b2 : 0xd34d79, x + Math.cos(a) * s * 0.2, y, z + Math.sin(a) * s * 0.2, s * 0.24, s * 0.16, s * 0.24);
    }
    addBall(merge, 0xffdf8c, x, y + s * 0.08, z, s * 0.12);
  };
  const bush = (merge, x, z, s, berries = false) => {
    addBall(merge, 0x669753, x, s * 0.45, z, s, s * 0.65, s * 0.8);
    addBall(merge, 0x8db86b, x - s * 0.3, s * 0.85, z, s * 0.65);
    for (let j = 0; j < 7; j++) {
      const a = j * 2.4, xx = x + Math.cos(a) * s * 0.65, zz = z + Math.sin(a) * s * 0.6;
      if (berries) addBall(merge, 0x9c3e6e, xx, s * (0.8 + j % 2 * 0.2), zz, s * 0.14);
      else flower(merge, xx, s * 0.95, zz, s * 0.5);
    }
  };
  m.add(disc, 0x9cbd75, 0, 0.035, 0, -Math.PI / 2, 0, 0, 10.5);
  m.add(disc, 0xc5cf94, 0, 0.045, 0.5, -Math.PI / 2, 0, 0, 4.8, 5.7, 1);
  // Two rose arches facing south, with a walkable opening between their posts.
  for (const [x, z] of [[0, -7.4], [3.2, 6.3]]) {
    for (const dx of [-1.5, 1.5]) m.add(pole, 0x917253, x + dx, 1.1, z, 0, 0, 0, 0.12, 2.2, 0.12);
    m.add(arch, 0x6e985d, x, 2.15, z);
    for (let j = 0; j < 9; j++) {
      const a = j * Math.PI / 8;
      flower(m, x + Math.cos(a) * 1.5, 2.15 + Math.sin(a) * 1.5, z + 0.08, 0.75);
    }
  }
  for (const [x, z] of [[7, -3], [1.3, 8.1], [-6.1, 2]]) bush(m, x, z, 0.75, true);
  // Tappable props are built before trunk colliders, as in the other kingdoms.
  const prop = (key, build, react) => {
    const [x, z] = GLEN_SPOTS[key];
    const it = addTappable((g) => {
      const p = makeMerger(THREE); build(p);
      const mesh = new THREE.Mesh(p.build(), material); mesh.scale.setScalar(1 / 1.25); g.add(mesh);
      return { glowY: 1.1, hitR: 1.0 };
    }, cx + x, cz + z, 0, 0xffd5df);
    it.group.rotation.y = 0; it.dur = 2.1;
    it.react = (item, p) => {
      const mesh = item.group.children[0];
      mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); mesh.scale.setScalar(1 / 1.25);
      if (!calmMotion && p > 0 && p < 1) react(mesh, Math.sin(Math.PI * p), p);
    };
  };
  prop('rose', (p) => {
    p.add(pole, 0x50814b, 0, 0.5, 0, 0, 0, 0, 0.05, 1, 0.05);
    flower(p, 0, 1.1, 0, 1.5);
    addBall(p, 0x6e9f55, 0.25, 0.5, 0, 0.3, 0.08, 0.15);
  }, (b, f) => b.scale.set((1 + f * 0.6) / 1.25, (1 - f * 0.15) / 1.25, (1 + f * 0.6) / 1.25));
  prop('berries', (p) => bush(p, 0, 0, 0.9, true), (b, f, p) => { b.rotation.z = Math.sin(p * Math.PI * 8) * 0.14 * f; });
  const eyes = (p, x, y, z) => {
    for (const dx of [-0.15, 0.15]) addBall(p, 0x302a38, x + dx, y, z, 0.055);
  };
  prop('bird', (p) => {
    p.add(pole, 0x977150, 0, 0.5, 0, 0, 0, 0, 0.16, 1, 0.16);
    addBall(p, 0x83b9c9, 0, 1.3, 0, 0.48, 0.4, 0.38);
    addBall(p, 0xb7dae1, 0, 1.63, 0.12, 0.28);
    addBall(p, 0xf1b862, 0, 1.57, 0.42, 0.12, 0.08, 0.15); eyes(p, 0, 1.7, 0.32);
    for (const dx of [-0.45, 0.45]) addBall(p, 0x518aab, dx, 1.3, 0, 0.22, 0.12, 0.3);
  }, (b, f, p) => { b.position.y = f * 0.25; b.rotation.y = Math.sin(p * 12) * f * 0.4; });
  prop('rabbit', (p) => {
    addBall(p, 0xe5d2bd, 0, 0.4, 0, 0.5, 0.4, 0.6);
    addBall(p, 0xf6e7d3, 0, 0.85, 0.2, 0.34);
    for (const dx of [-0.18, 0.18]) { addBall(p, 0xe5d2bd, dx, 1.35, 0.15, 0.13, 0.45, 0.14); addBall(p, 0xebb0b7, dx, 1.37, 0.27, 0.06, 0.3, 0.04); }
    addBall(p, 0xffffff, 0.4, 0.45, -0.3, 0.2); eyes(p, 0, 0.95, 0.48);
  }, (b, f, p) => { b.position.y = Math.abs(Math.sin(p * Math.PI * 3)) * f * 0.5; });
  prop('squirrel', (p) => {
    addBall(p, 0xba7950, 0, 0.45, 0, 0.32, 0.45, 0.32);
    addBall(p, 0xd69962, 0, 0.95, 0.1, 0.3);
    addBall(p, 0xae6e42, 0.35, 0.75, -0.3, 0.35, 0.7, 0.3);
    for (const dx of [-0.18, 0.18]) addBall(p, 0xba7950, dx, 1.23, 0.08, 0.12, 0.2, 0.12);
    addBall(p, 0x795333, 0, 0.6, 0.37, 0.18); eyes(p, 0, 1.02, 0.35);
  }, (b, f, p) => { b.rotation.y = Math.sin(p * Math.PI * 5) * f * 0.5; });
  prop('chime', (p) => {
    p.add(box, 0xc1a27c, 0, 2.1, 0, 0, 0, 0, 1.4, 0.12, 0.15);
    for (let i = 0; i < 5; i++) {
      const x = -0.5 + i * 0.25, len = 0.5 + i % 3 * 0.18;
      p.add(pole, 0xd3bfa5, x, 2.05 - len / 2, 0, 0, 0, 0, 0.015, len, 0.015);
      flower(p, x, 2.05 - len, 0, 0.45);
    }
  }, (b, f, p) => { b.rotation.z = Math.sin(p * Math.PI * 7) * f * 0.18; });
  m.add(pole, 0x977150, GLEN_SPOTS.chime[0] - 1.1, 1.3, GLEN_SPOTS.chime[1], 0, 0, 0, 0.1, 2.6, 0.1);
  m.add(box, 0x977150, GLEN_SPOTS.chime[0] - 0.2, 2.6, GLEN_SPOTS.chime[1], 0, 0, 0, 2, 0.12, 0.14);
  // Sign faces/letters stay merged and still; taps get the shared glow response.
  for (const word of WORD_SIGNS) {
    const [x, z] = GLEN_SPOTS['word-' + word];
    const it = addTappable(() => ({ glowY: 1.7, hitR: 1.0 }), cx + x, cz + z, 0, 0xffefbb, 'word-' + word);
    it.group.rotation.y = 0;
    m.add(pole, 0x977150, x, 0.8, z, 0, 0, 0, 0.07, 1.6, 0.07);
    ink.add(box, 0xfff3d7, x, 1.7, z, 0, 0, 0, 2.2, 0.95, 0.14);
    const unit = 0.12, left = x - (word.length * 4 - 1) * unit / 2;
    [...word].forEach((c, j) => GLYPHS[c].forEach((row, r) => [...row].forEach((bit, col) => {
      if (bit === '1') ink.add(box, 0x41313e, left + (j * 4 + col + 0.5) * unit, 2.0 - (r + 0.5) * unit, z + 0.081, 0, 0, 0, unit, unit, 0.025);
    })));
    // Small flower beds at the feet leave the sign labels unobstructed.
    flower(m, x, 0.18, z + 0.15, 0.8);
  }
  for (const [x, z] of GLEN_TREES) {
    m.add(pole, 0x987452, x, 1.6, z, 0, 0, 0, 0.25, 3.2, 0.25);
    addBall(m, 0x729e61, x, 3.5, z, 1.25, 1.5, 1.2);
    addBall(m, 0x92b879, x - 0.5, 3.8, z + 0.2, 0.9);
    addCollider(cx + x, cz + z, 0.4);
  }
  const scenery = new THREE.Mesh(m.build(), material); scenery.position.set(cx, 0, cz); scene.add(scenery);
  const lettering = new THREE.Mesh(ink.build(), glowMaterial); lettering.position.set(cx, 0, cz); scene.add(lettering);
  // Bounded search prevents a crowded day's treasures wandering beyond the clearing.
  const settle = (x, z, free) => {
    const valid = (px, pz) => Math.hypot(px - cx, pz - cz) < GLEN_R && free(px, pz);
    if (valid(x, z)) return [x, z];
    for (let i = 1; i <= 800; i++) {
      const r = 0.32 * Math.sqrt(i), a = i * 2.399963;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (valid(px, pz)) return [px, pz];
    }
    throw new Error('No free Rosewood Glen treasure spot');
  };
  return { update() {}, settle };
}
