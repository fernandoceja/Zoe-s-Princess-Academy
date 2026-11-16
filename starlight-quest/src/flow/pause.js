/* Zoe's Starlight Quest — Pause anytime (Nov 16).
 * Pause works while she walks, talks, answers a question and on a card. Pausing never touches the quest:
 * the talk or question stays where it is (only covered and made inert), the narrator stops, and on Resume
 * the question or line is read again. Imports nothing.
 */

/** Pause is open everywhere except the title and the first-time tutorial (they have no HUD). */
export function canPauseIn(phase) {
  return phase !== 'title' && phase !== 'tutorial';
}

/** After Resume, the world takes walking input again only where she walks (not under a talk or a question). */
export function walksAfterResume(phase) {
  return phase === 'roam' || phase === 'scoot';
}

/** Everything about a quest that counts as progress (for tests: a pause must leave it byte-equal). */
export function questSnapshot(qb, save) {
  return JSON.stringify({
    npcId: qb && qb.npcId,
    roundIdx: qb && qb.roundIdx,
    misses: qb && qb.misses,
    results: qb && qb.results,
    rounds: qb && qb.rounds && qb.rounds.length,
    stars: save && save.stars,
    done: save && save.done,
    shards: save && save.shards,
  });
}
