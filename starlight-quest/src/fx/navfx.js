/* Zoe's Starlight Quest — navigation layer (Nov 17): makes the world easier to get around.
 *   Item 1: a soft glowing sparkle trail on the ground from Zoe to today's princess (src/flow/guide.js).
 *   Item 2: fly to a land from the Kingdom Map: a 1.5 s sparkle flight (src/flow/flight.js).
 *   Item 3: gems on the paths between lands, picked up by walking over them (src/flow/pathgems.js).
 * The 3D world (js/world.js) is hash-locked, so this file never edits it: it runs on each drawn world frame
 * through worldfx.js onWorldFrame, which hands it the scene and Zoe.
 * Pause: while the pause menu is up nothing here moves (the world keeps drawing under the translucent menu,
 * so every animation reads isPaused() and stands still). One pooled Points object, a 64px procedural texture,
 * no new files to download.
 */
import * as THREE from 'three';
import { onWorldFrame } from './worldfx.js';
import { GEM_PICKUP_R } from '../flow/pathgems.js';
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
  mesh.name = 'zsq-path-gems';
  const c = new THREE.Color();
  for (let i = 0; i < GEM_MAX; i++) mesh.setColorAt(i, c.setHex(GEM_COLORS[i % GEM_COLORS.length]));
  scene.add(mesh);
  return { mesh, list: [], m4: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), sc: new THREE.Vector3() };
}

const nav = {
  installed: false,
  scene: null,
  g: null,
  bursts: null,
  gems: null,
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

function frame({ scene, player, now }) {
  if (!player) return;
  if (nav.scene !== scene) { nav.scene = scene; nav.g = makeGuide(scene); nav.state = guideState(); nav.bursts = makeBursts(scene); nav.gems = makeGems(scene); nav.gemsDirty = true; }
  const paused = !!nav.opts.isPaused();
  const raw = nav.lastNow ? Math.min(0.05, Math.max(0, (now - nav.lastNow) / 1000)) : 0;
  nav.lastNow = now;
  const dt = paused ? 0 : raw;          // a paused frame is a still frame
  if (paused) return;
  nav.t += dt;
  updateFlight(player, dt);
  updateGuide(player.position, dt);
  updateGems(player.position, dt);
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

/** Install once (after installWorldFx, before or after createWorld). opts: { getPhase(), isPaused(), onGem(id) }. */
export function installNav(opts = {}) {
  nav.opts = { ...nav.opts, ...opts };
  if (nav.installed) return navApi;
  nav.installed = true;
  onWorldFrame(frame);
  try {
    if (/[?&]fxdebug\b/.test(window.location.search)) window.__zsqNav = { status: navStatus };
  } catch (e) { /* no window */ }
  return navApi;
}

/** For tests and ?fxdebug: what the trail is doing. */
export function navStatus() {
  const g = nav.g;
  let lit = 0;
  if (g && g.points.visible) for (let i = 0; i < GUIDE.max; i++) if (g.pos[i * 3 + 1] > -1) lit++;
  return { today: nav.today, target: nav.state.target, reached: nav.state.reached, alpha: nav.state.alpha, lit, t: nav.t,
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
