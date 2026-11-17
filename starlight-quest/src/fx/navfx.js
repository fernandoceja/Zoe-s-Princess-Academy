/* Zoe's Starlight Quest — navigation layer (Nov 17): makes the world easier to get around.
 *   Item 1: a soft glowing sparkle trail on the ground from Zoe to today's princess (src/flow/guide.js).
 *   Item 2: fly to a land from the Kingdom Map: a 1.5 s sparkle flight (src/flow/flight.js).
 *   Item 3: gems on the paths between lands, picked up by walking over them (src/flow/pathgems.js).
 *   Item 4: little friends in the open grass that react to a tap or to Zoe walking up (src/flow/critters.js).
 * The 3D world (js/world.js) is hash-locked, so this file never edits it: it runs on each drawn world frame
 * through worldfx.js onWorldFrame, which hands it the scene and Zoe.
 * Pause: while the pause menu is up nothing here moves (the world keeps drawing under the translucent menu,
 * so every animation reads isPaused() and stands still). One pooled Points object, a 64px procedural texture,
 * no new files to download.
 */
import * as THREE from 'three';
import { onWorldFrame } from './worldfx.js';
import { GEM_PICKUP_R } from '../flow/pathgems.js';
import { grassSpots, placeCritters, reactPose, nearReacts, CRITTER_REACT, CRITTER_HIT_R } from '../flow/critters.js';
import { FLIGHT, flightFrame, landingSpot } from '../flow/flight.js';
import { GUIDE, guidePad, guidePlan, firstAhead, isLost, guideArrived, guideState, stepGuide, sparkleGlow } from '../flow/guide.js';

const reduceQuery = (() => { try { return window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null; } catch (e) { return null; } })();
const calm = () => !!(reduceQuery && reduceQuery.matches);

let softDot = null;
function dotTexture() {
  if (softDot) return softDot;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  softDot = new THREE.CanvasTexture(c);
  return softDot;
}

function makeGuide(scene) {
  const N = GUIDE.max;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    map: dotTexture(), size: 1.05, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false; points.visible = false; points.raycast = () => {};
  points.name = 'zsq-guide-trail';
  scene.add(points);
  const gold = new THREE.Color(0xffd36b), pink = new THREE.Color(0xff9fd0);
  return { points, geo, pos, col, gold, pink, plan: null, planFor: null, check: 0 };
}

// Sparkle bursts (lift-off, landing; later the gem pickups): one pooled Points, a few bursts at a time.
const BURST_N = 4, BURST_P = 22, BURST_LIFE = 0.8;
function makeBursts(scene) {
  const N = BURST_N * BURST_P;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    map: dotTexture(), size: 0.7, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false; points.visible = false; points.raycast = () => {};
  points.name = 'zsq-nav-bursts';
  scene.add(points);
  const ages = new Float32Array(BURST_N).fill(BURST_LIFE), base = [];
  for (let b = 0; b < BURST_N; b++) base.push(new THREE.Color());
  let next = 0;
  function fire(x, y, z, hex, spread = 1) {
    const b = next; next = (next + 1) % BURST_N;
    ages[b] = 0; base[b].setHex(hex);
    for (let j = 0; j < BURST_P; j++) {
      const i = (b * BURST_P + j) * 3, a = (j / BURST_P) * Math.PI * 2 + Math.random() * 0.4, sp = (1.4 + Math.random() * 1.6) * spread;
      pos[i] = x; pos[i + 1] = y; pos[i + 2] = z;
      vel[i] = Math.cos(a) * sp; vel[i + 1] = 2 + Math.random() * 2.4; vel[i + 2] = Math.sin(a) * sp;
    }
    points.visible = true;
  }
  function update(dt) {
    let alive = false;
    for (let b = 0; b < BURST_N; b++) {
      if (ages[b] >= BURST_LIFE) { for (let j = 0; j < BURST_P; j++) { const i = (b * BURST_P + j) * 3; col[i] = col[i + 1] = col[i + 2] = 0; } continue; }
      ages[b] += dt;
      const k = Math.max(0, 1 - ages[b] / BURST_LIFE);
      for (let j = 0; j < BURST_P; j++) {
        const i = (b * BURST_P + j) * 3;
        vel[i + 1] -= 5 * dt;
        pos[i] += vel[i] * dt; pos[i + 1] = Math.max(0.05, pos[i + 1] + vel[i + 1] * dt); pos[i + 2] += vel[i + 2] * dt;
        col[i] = base[b].r * k; col[i + 1] = base[b].g * k; col[i + 2] = base[b].b * k;
      }
      alive = true;
    }
    points.visible = alive;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }
  return { fire, update };
}

// The sparkle veil over the world while she flies (pointer-events none, under the HUD, not a "cover": the world keeps drawing).
let veil = null;
function veilEl() {
  if (veil || typeof document === 'undefined') return veil;
  veil = document.createElement('div');
  veil.className = 'zsq-fly-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.style.cssText = 'position:fixed;inset:0;z-index:15;pointer-events:none;opacity:0;display:none;'
    + 'background:radial-gradient(circle at 50% 55%, rgba(255,255,255,.98) 0%, rgba(255,240,190,.95) 35%, rgba(255,190,225,.9) 70%, rgba(201,179,242,.9) 100%);';
  const stars = document.createElement('div');
  stars.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:64px;letter-spacing:18px;';
  stars.textContent = '✨🌟✨';
  veil.appendChild(stars);
  document.body.appendChild(veil);
  return veil;
}
function setVeil(k) {
  const v = veilEl();
  if (!v) return;
  if (k <= 0.001) { if (v.style.display !== 'none') { v.style.display = 'none'; v.style.opacity = '0'; } return; }
  v.style.display = 'block';
  v.style.opacity = String(Math.min(1, k).toFixed(3));
}

// Path gems: one InstancedMesh (one draw call) of small faceted gems that spin and bob; walking over one picks it up
// (a short rise-spin-shrink, a sparkle burst, and the App's chime and counter).
const GEM_MAX = 64, GEM_LIFT = 0.55, GEM_PICK = 0.5;
const GEM_COLORS = [0x7fe3ff, 0xff8fd0, 0xc9a2ff, 0x8ff0c8];
function makeGems(scene) {
  const geo = new THREE.OctahedronGeometry(0.42, 0);
  geo.scale(1, 1.35, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9a6cc0, emissiveIntensity: 0.75, roughness: 0.25, metalness: 0.15, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, GEM_MAX);
  mesh.count = 0; mesh.frustumCulled = false; mesh.raycast = () => {};
  mesh.name = 'zsq-path-gems'; mesh.userData.zsqNav = true;
  const c = new THREE.Color();
  for (let i = 0; i < GEM_MAX; i++) mesh.setColorAt(i, c.setHex(GEM_COLORS[i % GEM_COLORS.length]));
  scene.add(mesh);
  return { mesh, list: [], m4: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), sc: new THREE.Vector3() };
}

// Grass friends: small low-poly bunnies, bouncy flowers and butterflies with shared geometry and materials.
// They are built once the scene is complete (so their homes can skip the world's own trees and props).
const CSCALE = { bunny: 1.9, flower: 2.0, butterfly: 2.2 };   // big enough to see and tap from the follow camera
const FLOWER_COLORS = [0xff8fb8, 0xffd36b, 0xc9a2ff, 0x8fd6ff, 0xff9f7a, 0xf7f0ff];
const WING_COLORS = [0xffb3e0, 0xa8e6ff, 0xffe27a, 0xcdb4ff];
function propBlocks(scene) {
  const out = [];
  const box = new THREE.Box3(), v = new THREE.Vector3(), size = new THREE.Vector3(), m = new THREE.Matrix4();
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!o.isMesh || (o.userData && o.userData.zsqNav) || !o.geometry) return;
    const g = o.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const add = (mw) => {
      box.copy(g.boundingBox).applyMatrix4(mw); box.getSize(size);
      if (size.y < 0.35) return;                       // grass tufts, path stones, flat ground
      const r = Math.max(size.x, size.z) / 2;
      if (r > 6) return;                               // ground discs, sky, walls
      box.getCenter(v); out.push({ x: v.x, z: v.z, r });
    };
    if (o.isInstancedMesh) { for (let i = 0; i < Math.min(o.count, 4000); i++) { o.getMatrixAt(i, m); m.premultiply(o.matrixWorld); add(m); } }
    else add(o.matrixWorld);
  });
  return out;
}
function makeCritters(scene) {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...extra });
  const geo = {
    body: new THREE.SphereGeometry(0.32, 10, 8), head: new THREE.SphereGeometry(0.22, 10, 8), ear: new THREE.CylinderGeometry(0.045, 0.07, 0.4, 6),
    tail: new THREE.SphereGeometry(0.11, 8, 6), stem: new THREE.CylinderGeometry(0.04, 0.05, 0.7, 6), petals: new THREE.CylinderGeometry(0.32, 0.26, 0.08, 10),
    middle: new THREE.SphereGeometry(0.12, 8, 6), wing: new THREE.CircleGeometry(0.28, 10), hit: new THREE.SphereGeometry(1, 8, 6),
  };
  geo.wing.translate(0.24, 0, 0);
  const mat = {
    fur: std(0xf4ebe1), tail: std(0xffffff), ear: std(0xffc9dc), stem: std(0x4caf6d), middle: std(0xffc24d, { emissive: 0x553300, emissiveIntensity: 0.3 }),
    hit: (() => { const h = new THREE.MeshBasicMaterial(); h.visible = false; return h; })(),
  };
  const petalMats = FLOWER_COLORS.map((c) => std(c));
  const wingMats = WING_COLORS.map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
  const part = (g, gm, mm, x, y, z) => { const p = new THREE.Mesh(gm, mm); p.position.set(x, y, z); p.userData.zsqNav = true; p.raycast = () => {}; g.add(p); return p; };
  const homes = placeCritters(grassSpots(), propBlocks(scene));
  const list = [];
  const hits = [];
  homes.forEach((h, n) => {
    const g = new THREE.Group(); g.userData.zsqNav = true;
    const c = { kind: h.kind, x: h.x, z: h.z, g, t: -1, since: 99, phase: n * 1.37, parts: {} };
    if (h.kind === 'bunny') {
      const b = part(g, geo.body, mat.fur, 0, 0.3, 0); b.scale.set(1, 0.85, 1.25);
      c.parts.head = part(g, geo.head, mat.fur, 0, 0.55, 0.32);
      c.parts.earL = part(g, geo.ear, mat.ear, -0.08, 0.86, 0.28); c.parts.earR = part(g, geo.ear, mat.ear, 0.08, 0.86, 0.28);
      c.parts.earL.rotation.z = 0.15; c.parts.earR.rotation.z = -0.15;
      part(g, geo.tail, mat.tail, 0, 0.36, -0.4);
      g.rotation.y = (n * 2.1) % 6.28;
      g.scale.setScalar(CSCALE.bunny);
    } else if (h.kind === 'flower') {
      part(g, geo.stem, mat.stem, 0, 0.35, 0);
      const head = new THREE.Group(); head.position.y = 0.72; head.rotation.x = 0.3; g.add(head);
      part(head, geo.petals, petalMats[h.i % petalMats.length], 0, 0, 0);
      part(head, geo.middle, mat.middle, 0, 0.05, 0);
      c.parts.head = head;
      g.rotation.y = n * 1.3;
      g.scale.setScalar(CSCALE.flower);
    } else {
      const wm = wingMats[h.i % wingMats.length];
      const wl = new THREE.Group(), wr = new THREE.Group();
      const ml = part(wl, geo.wing, wm, 0, 0, 0); ml.rotation.x = -Math.PI / 2;
      const mr = part(wr, geo.wing, wm, 0, 0, 0); mr.rotation.x = -Math.PI / 2; wr.scale.x = -1;
      g.add(wl, wr);
      c.parts.wl = wl; c.parts.wr = wr;
      g.scale.setScalar(CSCALE.butterfly);
    }
    const hit = new THREE.Mesh(geo.hit, mat.hit);
    hit.scale.setScalar(CRITTER_HIT_R / CSCALE[h.kind]); hit.position.y = h.kind === 'butterfly' ? 0 : 0.5; hit.userData.zsqNav = true; hit.userData.critter = c;
    g.add(hit); hits.push(hit);
    g.position.set(h.x, 0, h.z);
    scene.add(g);
    list.push(c);
  });
  return { list, hits };
}

function startReact(c) {
  if (c.t >= 0) return false;
  c.t = 0; c.since = 0;
  try { if (nav.opts.onCritter) nav.opts.onCritter(c.kind); } catch (e) { /* sound is the App's */ }
  return true;
}

function updateCritters(p, dt) {
  const C = nav.critters;
  if (!C) return;
  const still = calm();
  const roam = nav.opts.getPhase() === 'roam' && !nav.flight;
  for (const c of C.list) {
    const far = Math.hypot(p.x - c.x, p.z - c.z);
    c.g.visible = far < 48;
    c.since += dt;
    if (!c.g.visible) continue;
    if (roam && nearReacts(far, c.t >= 0, c.since)) startReact(c);
    const t = nav.t + c.phase;
    let pose = { dx: 0, dy: 0, dz: 0, sy: 1, spin: 0 };
    if (c.t >= 0) {
      c.t += dt;
      const dur = CRITTER_REACT[c.kind];
      pose = reactPose(c.kind, c.t / dur, still);
      if (c.t >= dur) c.t = -1;
    }
    const base = c.kind === 'butterfly' ? 1.15 + (still ? 0 : Math.sin(t * 1.3) * 0.18) : 0;
    const idleX = c.kind === 'butterfly' && !still ? Math.cos(t * 0.6) * 0.6 : 0, idleZ = c.kind === 'butterfly' && !still ? Math.sin(t * 0.6) * 0.6 : 0;
    c.g.position.set(c.x + idleX + pose.dx, base + pose.dy, c.z + idleZ + pose.dz);
    if (c.kind === 'bunny') {
      if (pose.spin) c.g.rotation.y = c.phase * 2 + pose.spin; else c.g.rotation.y = c.phase * 2;
      c.g.scale.set(CSCALE.bunny, CSCALE.bunny * pose.sy, CSCALE.bunny);
      if (!still) { c.parts.head.position.y = 0.55 + Math.max(0, Math.sin(t * 3)) * 0.04; c.parts.earL.rotation.x = Math.sin(t * 5) * 0.08; }
    } else if (c.kind === 'flower') {
      c.g.scale.set(CSCALE.flower, CSCALE.flower * pose.sy, CSCALE.flower);
      c.parts.head.rotation.z = (still ? 0 : Math.sin(t * 1.4) * 0.08) + pose.spin;
    } else {
      const flap = still ? 0.5 : 0.25 + Math.abs(Math.sin(t * (c.t >= 0 ? 16 : 9))) * 0.9;
      c.parts.wl.rotation.z = flap; c.parts.wr.rotation.z = -flap;
      c.g.rotation.y = (still ? 0 : -t * 0.6) + pose.spin;
    }
  }
}

let tapBound = null;
function bindTaps(renderer, camera) {
  if (tapBound === renderer.domElement) return;
  tapBound = renderer.domElement;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  tapBound.addEventListener('pointerdown', (e) => {
    const C = nav.critters;
    if (!C || nav.opts.isPaused() || nav.flight || nav.opts.getPhase() !== 'roam') return;
    const rect = tapBound.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, nav.camera || camera);
    const hit = ray.intersectObjects(C.hits.filter((h) => h.parent && h.parent.visible), false)[0];
    if (hit && hit.object.userData.critter) startReact(hit.object.userData.critter);
  });
}

const nav = {
  installed: false,
  scene: null,
  g: null,
  bursts: null,
  gems: null,
  critters: null,
  frames: 0,
  camera: null,
  gemSpots: [],      // [{ id, x, z }] not yet picked up today (from the App)
  gemsDirty: false,
  flight: null,      // { npc, spot, t, moved, onLand } while she flies
  state: guideState(),
  today: null,
  hideGuide: false,     // the map's firefly trail is leading her somewhere: one trail at a time
  t: 0,
  lastNow: 0,
  opts: { getPhase: () => 'roam', isPaused: () => false },
};

function frame({ scene, camera, renderer, player, now }) {
  if (!player) return;
  nav.camera = camera;
  if (nav.scene !== scene) { nav.scene = scene; nav.g = makeGuide(scene); nav.state = guideState(); nav.bursts = makeBursts(scene); nav.gems = makeGems(scene); nav.gemsDirty = true; nav.critters = null; nav.frames = 0; }
  const paused = !!nav.opts.isPaused();
  const raw = nav.lastNow ? Math.min(0.05, Math.max(0, (now - nav.lastNow) / 1000)) : 0;
  nav.lastNow = now;
  const dt = paused ? 0 : raw;          // a paused frame is a still frame
  if (paused) return;
  if (!nav.critters && ++nav.frames > 20) { nav.critters = makeCritters(scene); if (renderer) bindTaps(renderer, camera); }
  nav.t += dt;
  updateFlight(player, dt);
  updateGuide(player.position, dt);
  updateGems(player.position, dt);
  updateCritters(player.position, dt);
  nav.bursts.update(dt);
}

function updateGems(p, dt) {
  const G = nav.gems;
  if (nav.gemsDirty) {
    nav.gemsDirty = false;
    G.list = nav.gemSpots.slice(0, GEM_MAX).map((s, i) => ({ id: s.id, x: s.x, z: s.z, phase: i * 1.7, pick: -1 }));
    G.mesh.count = G.list.length;
    if (G.mesh.instanceColor) G.mesh.instanceColor.needsUpdate = true;
  }
  if (!G.list.length) return;
  const still = calm();
  const canPick = nav.opts.getPhase() === 'roam' && !nav.flight;
  for (let i = 0; i < G.list.length; i++) {
    const g = G.list[i];
    let y = GEM_LIFT + (still ? 0 : Math.sin(nav.t * 2.2 + g.phase) * 0.12), s = 1, spin = still ? g.phase : nav.t * 1.6 + g.phase;
    if (g.pick < 0 && canPick && Math.hypot(p.x - g.x, p.z - g.z) < GEM_PICKUP_R) {
      g.pick = 0;
      nav.bursts.fire(g.x, GEM_LIFT, g.z, GEM_COLORS[i % GEM_COLORS.length], 0.6);
      try { if (nav.opts.onGem) nav.opts.onGem(g.id); } catch (e) { /* the chime and counter are the App's */ }
    }
    if (g.pick >= 0) {
      if (g.pick < GEM_PICK) g.pick += dt;
      const k = Math.min(1, g.pick / GEM_PICK);
      y += k * 1.3;
      s = k < 0.35 ? 1 + k * 1.6 : Math.max(0, 1.56 * (1 - (k - 0.35) / 0.65));
      if (!still) spin += k * 9;
    }
    G.e.set(0, spin, 0); G.q.setFromEuler(G.e);
    G.v.set(g.x, y, g.z); G.sc.setScalar(s);
    G.m4.compose(G.v, G.q, G.sc);
    G.mesh.setMatrixAt(i, G.m4);
  }
  G.mesh.instanceMatrix.needsUpdate = true;
}

function updateFlight(player, dt) {
  const f = nav.flight;
  if (!f) return;
  const p = player.position;
  if (f.t === 0) nav.bursts.fire(p.x, 0.6, p.z, 0xffd36b, 0.8);
  f.t += dt;
  const k = flightFrame(f.t, calm());
  setVeil(k.cover * 0.95);
  if (k.moved && !f.moved) { f.moved = true; p.x = f.spot.x; p.z = f.spot.z; }
  p.y = k.lift;
  if (k.done) {
    nav.flight = null;
    p.y = 0;
    setVeil(0);
    nav.bursts.fire(p.x, 0.4, p.z, 0xff9fd0, 1.1);
    try { if (f.onLand) f.onLand(); } catch (e) { /* the landing words are extra */ }
  }
}

function updateGuide(p, dt) {
  const g = nav.g, s = nav.state;
  const pad = guidePad(nav.today);
  const show = nav.opts.getPhase() === 'roam' && !nav.hideGuide && !nav.flight && !!pad;
  stepGuide(s, { target: pad ? nav.today : null, arrived: !!pad && guideArrived(p.x, p.z, pad), show, dt });
  if (s.alpha <= 0.001 || !s.target) { g.points.visible = false; if (!s.target || s.reached) g.plan = null; return; }
  // Route: worked out for a new target, and again when she wanders off it.
  g.check += dt;
  if (!g.plan || g.planFor !== s.target || (g.check >= GUIDE.recheck && isLost(g.plan, p.x, p.z))) {
    g.plan = guidePlan({ x: p.x, z: p.z }, s.target); g.planFor = s.target; g.check = 0;
  } else if (g.check >= GUIDE.recheck) g.check = 0;
  const first = firstAhead(g.plan, p.x, p.z);
  const dots = g.plan.dots, n = Math.min(GUIDE.max, dots.length - first);
  const still = calm();
  for (let i = 0; i < GUIDE.max; i++) {
    const d = i < n ? dots[first + i] : null;
    if (!d) { g.col[i * 3] = g.col[i * 3 + 1] = g.col[i * 3 + 2] = 0; g.pos[i * 3 + 1] = -50; continue; }
    const k = sparkleGlow(i, n, nav.t, still) * s.alpha;
    const mix = (first + i) % 3 === 0 ? 0.65 : 0.15;
    g.pos[i * 3] = d.x; g.pos[i * 3 + 1] = GUIDE.y + (still ? 0 : Math.max(0, Math.sin(nav.t * 3 + (first + i) * 1.7)) * 0.08); g.pos[i * 3 + 2] = d.z;
    g.col[i * 3] = (g.gold.r + (g.pink.r - g.gold.r) * mix) * k;
    g.col[i * 3 + 1] = (g.gold.g + (g.pink.g - g.gold.g) * mix) * k;
    g.col[i * 3 + 2] = (g.gold.b + (g.pink.b - g.gold.b) * mix) * k;
  }
  g.points.visible = n > 0;
  g.geo.attributes.position.needsUpdate = true;
  g.geo.attributes.color.needsUpdate = true;
}

/** Install once (after installWorldFx, before or after createWorld). opts: { getPhase(), isPaused(), onGem(id), onCritter(kind) }. */
export function installNav(opts = {}) {
  nav.opts = { ...nav.opts, ...opts };
  if (nav.installed) return navApi;
  nav.installed = true;
  onWorldFrame(frame);
  try {
    if (/[?&]fxdebug\b/.test(window.location.search)) window.__zsqNav = {
      status: navStatus,
      // Where friend i is on screen (client px), for the browser checks' taps.
      screenOf(i) {
        const c = nav.critters && nav.critters.list[i];
        if (!c || !nav.camera || !tapBound) return null;
        const v = new THREE.Vector3(); c.g.getWorldPosition(v); v.y += 0.5; v.project(nav.camera);
        const r = tapBound.getBoundingClientRect();
        return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
      },
    };
  } catch (e) { /* no window */ }
  return navApi;
}

/** For tests and ?fxdebug: what the trail is doing. */
export function navStatus() {
  const g = nav.g;
  let lit = 0;
  if (g && g.points.visible) for (let i = 0; i < GUIDE.max; i++) if (g.pos[i * 3 + 1] > -1) lit++;
  return { today: nav.today, target: nav.state.target, reached: nav.state.reached, alpha: nav.state.alpha, lit, t: nav.t,
    critters: nav.critters ? nav.critters.list.map((c) => ({ kind: c.kind, x: c.x, z: c.z, playing: c.t >= 0, t: c.t })) : [],
    gems: nav.gems ? nav.gems.list.filter((g) => g.pick < 0).map((g) => ({ id: g.id, x: g.x, z: g.z })) : [],
    flying: nav.flight ? { npc: nav.flight.npc, t: nav.flight.t, moved: nav.flight.moved } : null };
}

export const navApi = {
  /** Today's princess (the "Today: X" chip), or null when there is none. A new one starts a new trail. */
  setToday(npcId) { nav.today = npcId || null; },
  /** True while the Kingdom Map's firefly trail is leading her (the guide waits). */
  setFirefliesActive(on) { nav.hideGuide = !!on; },
  /** Fly Zoe to a princess's land (1.5 s). onLand runs once she is down. Returns false for an unknown land or while already flying. */
  flyTo(npcId, onLand) {
    const spot = landingSpot(npcId);
    if (!spot || nav.flight || !nav.scene) return false;
    nav.flight = { npc: npcId, spot, t: 0, moved: false, onLand };
    return true;
  },
  isFlying() { return !!nav.flight; },
  /** Today's path gems still to find: [{ id, x, z }] (src/flow/pathgems.js pathGemSpots minus the ones picked up). */
  setGems(spots) { nav.gemSpots = Array.isArray(spots) ? spots : []; nav.gemsDirty = true; },
};
export { FLIGHT };
