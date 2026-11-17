/* Zoe's Starlight Quest — the guiding sparkle trail (Nov 17, item 1).
 * A soft glowing trail on the ground from Zoe to today's princess (the "Today: X" chip). It follows the paths
 * (worldmap.js trailRoute), shows only the part still ahead of her, is worked out again when she wanders off,
 * moves to the new princess when today's princess changes, and fades out once she gets there.
 * Pure: no three.js, no DOM. src/fx/navfx.js draws it; tests/guide_check.mjs checks it.
 */
import { kingdomLands, trailRoute, sampleTrail, progressAlong, trailArrived, CASTLE_POS, CASTLE_R } from '../engine-core.js';

export const GUIDE = {
  spacing: 1.25,   // world units between two sparkles
  max: 96,         // pooled sparkles (one draw call)
  lost: 5,         // she is this far off the trail: lead her from where she is now
  recheck: 0.5,    // seconds between "is she still on it?" checks
  arriveR: 4.5,    // this close to the princess counts as reached (a bit wider than her talk ring)
  fadeIn: 0.6,     // seconds
  fadeOut: 0.9,    // seconds
  ahead: 0.6,      // sparkles she has passed (and this much in front of her feet) are gone
  y: 0.1,          // just above the grass
};

/** Things the trail steps around: the castle and the other princesses (not the one it leads to). */
export function guideColliders(targetNpc, search) {
  const cols = [{ x: CASTLE_POS.x, z: CASTLE_POS.z, r: CASTLE_R }];
  for (const l of kingdomLands(search)) if (l.npc !== targetNpc) cols.push({ x: l.pad.x, z: l.pad.z, r: 1 });
  return cols;
}

/** Where today's princess stands, or null (unknown or closed land). */
export function guidePad(npcId, search) {
  const l = kingdomLands(search).find((k) => k.npc === npcId);
  return l && l.open ? { x: l.pad.x, z: l.pad.z } : null;
}

/** The route and its sparkles from `from` to `npcId`: { route, dots }. Empty when there is nowhere to go. */
export function guidePlan(from, npcId, search) {
  const route = trailRoute(from, npcId, guideColliders(npcId, search), search);
  return { route, dots: sampleTrail(route, GUIDE.spacing, GUIDE.max * 3) };
}

/** Index of the first sparkle still ahead of her (the trail "eats" behind her). */
export function firstAhead(plan, x, z) {
  if (!plan || !plan.dots.length) return 0;
  const here = progressAlong(plan.route, x, z).arc;
  let i = 0;
  while (i < plan.dots.length && plan.dots[i].arc < here + GUIDE.ahead) i++;
  return i;
}

/** Should the route be worked out again? (she is more than GUIDE.lost off it) */
export function isLost(plan, x, z) {
  if (!plan || plan.route.length < 2) return true;
  return progressAlong(plan.route, x, z).dist > GUIDE.lost;
}

/** Has she reached today's princess? */
export const guideArrived = (x, z, pad) => trailArrived(x, z, pad, GUIDE.arriveR);

/** A fresh trail state. */
export function guideState() { return { target: null, reached: false, alpha: 0 }; }

/** One step of the trail's life. Returns the same object, changed.
 * in: { target (npc id or null), arrived (bool), show (bool: roaming, not paused, no firefly trail), dt (seconds; 0 while paused) }
 * - A new target starts a new trail (not reached, fades in from nothing).
 * - Reaching her marks it reached: it fades out and stays out until the target changes.
 * - dt = 0 changes nothing but the target (a paused trail stays exactly as it is). */
export function stepGuide(s, { target = null, arrived = false, show = true, dt = 0 } = {}) {
  const t = target || null;
  if (t !== s.target) { s.target = t; s.reached = false; s.alpha = 0; }
  if (!(dt > 0)) return s;
  if (s.target && arrived && show) s.reached = true;
  const goal = s.target && show && !s.reached ? 1 : 0;
  if (goal > s.alpha) s.alpha = Math.min(goal, s.alpha + dt / GUIDE.fadeIn);
  else if (goal < s.alpha) s.alpha = Math.max(goal, s.alpha - dt / GUIDE.fadeOut);
  return s;
}

/** Brightness of sparkle i (0..1): a soft wave runs ahead of her; the last few dim so the trail ends gently.
 * Calm motion (Reduce Motion): no wave. */
export function sparkleGlow(i, n, t, calm) {
  const wave = calm ? 0.75 : 0.6 + 0.4 * Math.sin(t * 2.6 - i * 0.55);
  const tail = n > 0 ? Math.min(1, (n - i) / 4) : 0;
  const head = Math.min(1, (i + 1) / 3);
  return Math.max(0, Math.min(1, wave * tail * head));
}
