/* Zoe's Starlight Quest — adaptive ladder (Step 5). Pure functions, no I/O.
 * Per land: { tier: 1|2|3, review: [{ round, wins }] }.
 * - Up: 4+ of the quest's first 5 rounds right on the first try -> next tier next play.
 * - Down: 3+ rounds that needed a hint -> one tier lower next play. Never announced.
 * - Review: a missed round comes back in later plays; it leaves the queue after
 *   it has been answered right on the first try twice.
 */
import { roundKey, NPC_ORDER } from './quests.js?v=20261028r3';

export const MAX_REVIEW = 6;

export function landState(raw) {
  const tier = raw && [1, 2, 3].includes(raw.tier) ? raw.tier : 1;
  const review = raw && Array.isArray(raw.review)
    ? raw.review.filter((x) => x && x.round && typeof x.round.prompt === 'string'
      && Array.isArray(x.round.choices) && x.round.choices.includes(x.round.answer))
      .map((x) => ({ round: x.round, wins: Math.max(0, Math.min(2, x.wins | 0)) }))
    : [];
  return { tier, review: review.slice(-MAX_REVIEW) };
}

/**
 * results: one entry per round as first asked (re-asks excluded):
 *   { round, firstTry: bool, hinted: bool }
 * Returns the new land state for the next play.
 */
export function recordQuest(state, results) {
  const s = landState(state);
  const firstTry = results.filter((r) => r.firstTry).length;
  const hinted = results.filter((r) => r.hinted).length;
  let tier = s.tier;
  if (firstTry >= 4) tier = Math.min(3, tier + 1);
  else if (hinted >= 3) tier = Math.max(1, tier - 1);

  const review = s.review.map((x) => ({ ...x }));
  const find = (k) => review.find((x) => roundKey(x.round) === k);
  for (const r of results) {
    const k = roundKey(r.round);
    const item = find(k);
    if (r.firstTry) {
      if (item) item.wins += 1;
    } else if (item) {
      item.wins = 0;
    } else {
      const { key, review: _rv, tier: _t, ...round } = r.round;
      review.push({ round, wins: 0 });
    }
  }
  return { tier, review: review.filter((x) => x.wins < 2).slice(-MAX_REVIEW) };
}

/** Local calendar day, e.g. '2026-10-23'. */
export function today(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const LAND_ORDER = NPC_ORDER;

/**
 * Which land should Zoe visit today? Pure and deterministic (land order breaks ties).
 * Candidates: lands not finished today. Preference: review rounds waiting, then a land
 * she has not restored yet. Returns an npc id, or null once every land has rested today.
 */
export function pickTodayStar(saveData, todayStr, order = LAND_ORDER) {
  const d = saveData || {};
  const lastPlay = d.lastPlay || {};
  const done = Array.isArray(d.done) ? d.done : [];
  const ladder = d.ladder || {};
  const rank = (id) => (landState(ladder[id]).review.length > 0 ? 0 : 2) + (done.includes(id) ? 1 : 0);
  const open = order.filter((id) => lastPlay[id] !== todayStr);
  if (!open.length) return null;
  return open.map((id, i) => ({ id, i, r: rank(id) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)[0].id;
}
