/* Zoe's Starlight Quest — what happens after a quest (R4 P3.3).
 * Ported from js/main.js: the once-a-day check and quest intro (startQuest 269-304), the rest card
 * (showRest 583-595), the milestone card (afterQuest 597-610), refreshTodayStar (612-614),
 * completeQuest (616-654), runFinale (656-666) and the new-kingdom card (main.js 191-204).
 * Each function takes the save data object as an argument and mutates it exactly where main.js does.
 * Saving and every world/UI call stay in the App, at the same points main.js calls Save.save().
 * Imports engine-core.js only (plain Node).
 */
import {
  PRINCESSES, QUESTS, FINALE_LINES, buildRounds, landState, recordQuest, today,
  pickTodayStar, checkMilestones, unseenKingdomSlots, shouldRunFinale, builtSlotIds, BUILT_SLOTS,
} from '../engine-core.js';

// Land -> the world's land id used for the celebration (main.js NPC_TO_LAND).
export const NPC_TO_LAND = { belle: 'library', elsa: 'frostfall', rapunzel: 'meadow', cinderella: 'village', ariel: 'cove', moana: 'isle', jasmine: 'garden', anna: 'harbor', tiana: 'bayou', aurora: 'glen' };

/**
 * Decide what a tap on a princess does (main.js startQuest, 269-280 and the intro lines 293-304).
 * Returns { kind: 'rest' } once a land was played today (unless `again`), or
 * { kind: 'start', practice, again, dialogue: { kind, lines } } where dialogue is what she says first.
 */
export function questStart(saveData, npcId, opts = {}, day = today()) {
  // One quest per land per day, then a soft stop (no timers anywhere).
  if (!opts.again && saveData.lastPlay[npcId] === day) return { kind: 'rest' };
  const practice = saveData.done.includes(npcId);
  const quest = QUESTS[npcId];
  let dialogue;
  if (practice) {
    // Her land already glows: a practice quest at her current tier.
    dialogue = { kind: 'praise', lines: [opts.again ? 'Yay, one more! Here we go! ✨' : `Welcome back, Zoe! My land is glowing because of you! 💖 Want to play again?`] };
  } else {
    dialogue = { kind: 'greeting', lines: quest.intro };
  }
  return { kind: 'start', practice, again: !!opts.again, dialogue };
}

/** This play's round list for a land (main.js startQuest, 282-287). rng injectable for tests. */
export function roundsFor(saveData, npcId, rng = Math.random) {
  return buildRounds(npcId, rng, landState(saveData.ladder[npcId]));
}

/** The soft stop card (main.js showRest 583-595). */
export function restCard(npcId) {
  return {
    kind: 'rest',
    npcId,
    speak: 'The kingdom is resting. Come back tomorrow!',
    title: '🌙 The kingdom is resting.',
    sub: 'Come back tomorrow! 💤',
  };
}

/**
 * The star target for the world's today-star (main.js refreshTodayStar, 612-614).
 * Returns the land id, null when every land has rested today, or undefined when the pick throws
 * (main.js then makes no world call at all).
 */
export function todayStarTarget(saveData, day = today()) {
  try { return pickTodayStar(saveData, day); } catch (e) { return undefined; }
}

/**
 * A quest ended (main.js completeQuest, 616-654). Updates the ladder and lastPlay, and for the first
 * completion of a land adds it to done and +3 stars. Returns:
 *   { kind: 'practice', todayStar }     a replay of a glowing land (no shard, no stars)
 *   { kind: 'celebrate', todayStar }    the land's first completion (+3 stars, land restored)
 * todayStar is the value for world.setTodayStar, read before done changes, as main.js does.
 */
export function questComplete(saveData, npcId, results, day = today()) {
  saveData.ladder[npcId] = recordQuest(landState(saveData.ladder[npcId]), results);
  saveData.lastPlay[npcId] = day;
  const todayStar = todayStarTarget(saveData, day);
  if (saveData.done.includes(npcId)) return { kind: 'practice', todayStar };
  saveData.done.push(npcId);
  saveData.stars += 3;
  return { kind: 'celebrate', todayStar };
}

/**
 * Milestone check after a quest (main.js afterQuest, 597-610). Unlocks are written to saveData here.
 * Returns null when nothing new was reached (go straight on), or the card to show. The caller
 * saves before it shows the card, so an unlock is never celebrated twice.
 */
export function afterQuestCard(saveData, npcId) {
  const fresh = checkMilestones(saveData);
  if (!fresh.length) return null;
  const names = fresh.map((m) => m.label);
  const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
  const stars = fresh[fresh.length - 1].stars;
  const sub = `You unlocked ${list}!`;
  return {
    kind: 'milestone',
    npcId,
    say: `You earned ${stars} stars! ${sub}`,
    title: `You earned ${stars} stars!`,
    sub,
    emoji: fresh.map((m) => m.emoji).join(' '),
  };
}

/**
 * What comes after the quest's own end (main.js completeQuest 639-653 and afterQuest 'next').
 * A replay goes straight to the rest card. A first completion runs the finale once every kingdom
 * is open and restored, and otherwise rests.
 * Returns { kind: 'finale', lines } or { kind: 'rest', ...restCard }.
 */
export function nextAfterQuest(saveData, npcId, { practice, npcIds, builtCount }) {
  if (!practice && shouldRunFinale(saveData.done, npcIds, builtCount)) return { kind: 'finale', lines: finaleLines() };
  return restCard(npcId);
}

/** The finale's princess lines (main.js runFinale 656-666). */
export function finaleLines() {
  return FINALE_LINES.map((t) => ({ princessId: 'belle', kind: 'praise', text: t }));
}

/**
 * Kingdoms to announce when the title is left (main.js enterWorld, 191-204).
 * Returns null when there is nothing new, otherwise { first, names }: first = the big announcement
 * (names null), else the names of the new lands.
 */
export function kingdomsToAnnounce(saveData, builtIds = builtSlotIds()) {
  const newSlots = unseenKingdomSlots(builtIds, saveData.seenKingdoms);
  if (!newSlots.length) return null;
  const first = !saveData.seenNewKingdoms;
  return {
    first,
    names: first ? null : newSlots.map((s) => PRINCESSES[BUILT_SLOTS[s]] && PRINCESSES[BUILT_SLOTS[s]].landName).filter(Boolean),
  };
}

/** Called when the kingdom card is dismissed (main.js enterWorld onDone). The caller saves. */
export function markKingdomsSeen(saveData, builtIds = builtSlotIds()) {
  saveData.seenNewKingdoms = true;
  saveData.seenKingdoms = [...new Set([...(saveData.seenKingdoms || []), ...builtIds])];
}
