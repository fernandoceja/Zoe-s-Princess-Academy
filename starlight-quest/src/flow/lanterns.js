/* Zoe's Starlight Quest: the lantern scoot in Jasmine's Palace Garden (B4). Pure logic: no DOM, no world, no audio.
 * Each lantern is one answer. She walks to a lantern, answers one round, the lantern lights, then the fireflies lead to the next.
 * The graded quest is still exactly five rounds (js/ladder.js caps the results at five), so the ladder rules do not change:
 *   tier 1: 4 lanterns, then the fireflies lead back to Jasmine for the fifth round (5 rounds)
 *   tier 2: 6 lanterns (5 graded rounds + 1 extra)
 *   tier 3: 8 lanterns (5 graded rounds + 3 extra)
 * Extra rounds give a star each but are never filed in the ladder or the review queue. */
import { spoken } from './screens.js';

export const LANTERN_TOTAL = 8;
export const LANTERN_COUNT = { 1: 4, 2: 6, 3: 8 };
export const ARRIVE_R = 1.8;   // metres: how close counts as "at the lantern" (world.js uses the same number)
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

export const clampTier = (t) => (t >= 3 ? 3 : t >= 2 ? 2 : 1);

/** Visit the lanterns nearest-first from where she stands, so the walk never zig-zags. spots = [{x,z}] (any length); returns indices. */
export function walkOrder(start, spots) {
  const left = spots.map((s, i) => i), out = [];
  let at = { x: start.x, z: start.z };
  while (left.length) {
    let bi = 0;
    for (let k = 1; k < left.length; k++) if (Math.hypot(spots[left[k]].x - at.x, spots[left[k]].z - at.z) < Math.hypot(spots[left[bi]].x - at.x, spots[left[bi]].z - at.z)) bi = k;
    const idx = left.splice(bi, 1)[0];
    out.push(idx); at = spots[idx];
  }
  return out;
}

/** { n, total, steps }: n lanterns; total rounds in the quest; steps[i] = { num: 1..n (null for the walk back to Jasmine), lantern: index | null }. Step i is round i. */
export function scootPlan(tier, spots, start) {
  const t = clampTier(tier), n = LANTERN_COUNT[t];
  const order = walkOrder(start, spots).slice(0, n);
  const steps = order.map((lantern, i) => ({ num: i + 1, lantern }));
  if (steps.length < 5) steps.push({ num: null, lantern: null });   // tier 1: the fifth round is asked by Jasmine herself
  return { n: order.length, total: steps.length, steps };
}

/** Pad the five graded rounds out to `total` rounds with fresh ones from `more()` (a function that returns a list of rounds); repeats are skipped. */
export function withBonus(rounds, more, total, tries = 8) {
  const out = rounds.slice();
  const seen = new Set(out.map((r) => r.key || r.prompt));
  for (let i = 0; i < tries && out.length < total; i++) {
    for (const r of more() || []) {
      const k = r.key || r.prompt;
      if (out.length >= total) break;
      if (seen.has(k)) continue;
      seen.add(k); out.push({ ...r, extra: true });
    }
  }
  return out;
}

/** What the world reports when she reaches this step ('lantern-3', or 'jasmine' for the walk back). */
export const expectedArrival = (step) => (step && step.lantern != null ? `lantern-${step.lantern}` : 'jasmine');

export const legLine = (step) => (step.lantern != null ? `Follow the fireflies to lantern ${step.num}!` : 'Follow the fireflies back to Jasmine!');
export const legSay = (step) => spoken(step.lantern != null ? `Follow the fireflies to lantern ${WORDS[step.num] || ''}!` : legLine(step));
export const chipText = (step, n) => (step.lantern != null ? `Lantern ${step.num} of ${n}` : 'Back to Jasmine');
export const SCOOT_TEXT = { ask: 'Ask here', stop: 'Stop', stopSure: 'Really stop?', litSay: 'The lantern is lit!' };
