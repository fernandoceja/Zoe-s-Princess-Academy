/* Zoe's Starlight Quest — navigation layer (Nov 17): makes the world easier to get around.
 *   Item 1: a soft glowing sparkle trail on the ground from Zoe to today's princess (src/flow/guide.js).
 * The 3D world (js/world.js) is hash-locked, so this file never edits it: it runs on each drawn world frame
 * through worldfx.js onWorldFrame, which hands it the scene and Zoe.
 * Pause: while the pause menu is up nothing here moves (the world keeps drawing under the translucent menu,
 * so every animation reads isPaused() and stands still). One pooled Points object, a 64px procedural texture,
 * no new files to download.
 */
import * as THREE from 'three';
import { onWorldFrame } from './worldfx.js';
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

const nav = {
  installed: false,
  scene: null,
  g: null,
  state: guideState(),
  today: null,
  hideGuide: false,     // the map's firefly trail is leading her somewhere: one trail at a time
  t: 0,
  lastNow: 0,
  opts: { getPhase: () => 'roam', isPaused: () => false },
};

function frame({ scene, player, now }) {
  if (!player) return;
  if (nav.scene !== scene) { nav.scene = scene; nav.g = makeGuide(scene); nav.state = guideState(); }
  const paused = !!nav.opts.isPaused();
  const raw = nav.lastNow ? Math.min(0.05, Math.max(0, (now - nav.lastNow) / 1000)) : 0;
  nav.lastNow = now;
  const dt = paused ? 0 : raw;          // a paused frame is a still frame
  if (paused) return;
  nav.t += dt;
  updateGuide(player.position, dt);
}

function updateGuide(p, dt) {
  const g = nav.g, s = nav.state;
  const pad = guidePad(nav.today);
  const show = nav.opts.getPhase() === 'roam' && !nav.hideGuide && !!pad;
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

/** Install once (after installWorldFx, before or after createWorld). opts: { getPhase(), isPaused() }. */
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
  return { today: nav.today, target: nav.state.target, reached: nav.state.reached, alpha: nav.state.alpha, lit, t: nav.t };
}

export const navApi = {
  /** Today's princess (the "Today: X" chip), or null when there is none. A new one starts a new trail. */
  setToday(npcId) { nav.today = npcId || null; },
  /** True while the Kingdom Map's firefly trail is leading her (the guide waits). */
  setFirefliesActive(on) { nav.hideGuide = !!on; },
};
