import assert from 'node:assert/strict';
import { buildRounds, NPC_ORDER, WORD_GARDEN_NAMES, WORD_GARDEN_ACTIONS } from '../js/quests.js';
import { builtSlotIds, isGlenOpen, shouldRunFinale } from '../js/worldmap.js';
import { findsTotal } from '../js/treasures.js';
assert.equal(NPC_ORDER.at(-1), 'aurora');
assert.equal(isGlenOpen(''), true);
assert.equal(findsTotal(['cove', 'isle', 'garden', 'harbor', 'bayou', 'glen']), 50);
assert.equal(shouldRunFinale(NPC_ORDER, NPC_ORDER, builtSlotIds().length), true);
assert.equal(shouldRunFinale(NPC_ORDER.slice(0, -1), NPC_ORDER, builtSlotIds().length), false);
for (let tier = 1; tier <= 3; tier++) for (let seed = 1; seed <= 500; seed++) {
  let state = seed;
  const rng = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
  const rounds = buildRounds('aurora', rng, { tier, review: [] });
  assert.equal(rounds.length, 5);
  for (const round of rounds) {
    assert.ok(round.choices.includes(round.answer));
    if (round.kind === 'naming') { assert.ok(WORD_GARDEN_NAMES.includes(round.answer)); assert.equal(round.choices.filter(w => WORD_GARDEN_NAMES.includes(w)).length, 1); }
    if (round.kind === 'action') { assert.ok(WORD_GARDEN_ACTIONS.includes(round.answer)); assert.equal(round.choices.filter(w => WORD_GARDEN_ACTIONS.includes(w)).length, 1); }
    if (round.kind === 'wordsort') {
      assert.equal(round.sort.items.length, 4);
      assert.equal(round.sort.items.filter(i => i.naming).length, 2);
      assert.equal(new Set(round.sort.items.map(i => i.name)).size, 4);
      for (const item of round.sort.items) assert.equal(WORD_GARDEN_NAMES.includes(item.name), item.naming);
    }
  }
}
console.log('aurora_check ok');
