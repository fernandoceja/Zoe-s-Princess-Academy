// Lands and princess list: one source of truth (NPC_ORDER), no hard-coded four-land lists, save merge keeps progress.
import { readFileSync } from 'node:fs';
// Same ?v= stamp as the app's import graph, so this is the same module instance save.js reads.
import { NPC_ORDER, PRINCESSES } from '../js/quests.js?v=20261027e2';
import { LAND_ORDER } from '../js/ladder.js?v=20261027e2';
import { merge } from '../js/save.js?v=20261027e2';
import { shouldRunFinale, shouldShowNewKingdoms, unseenKingdomSlots, builtSlotIds, NEW_LAND_SLOTS } from '../js/worldmap.js?v=20261027e2';

const bad = [];
const expect = (n, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${n}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };

expect('canonical list', NPC_ORDER, ['belle', 'elsa', 'rapunzel', 'cinderella', 'ariel', 'moana', 'jasmine', 'anna', 'tiana', 'aurora']);
expect('LAND_ORDER reads the list', LAND_ORDER, NPC_ORDER);
expect('every land has a princess entry', NPC_ORDER.filter((id) => !PRINCESSES[id]), []);
expect('zoe is not a land', NPC_ORDER.includes('zoe'), false);

const LITERAL = "'belle', 'elsa', 'rapunzel', 'cinderella'"; // any hard-coded copy of the list (four or five ids)
for (const f of ['ui.js', 'main.js', 'save.js']) {
  const src = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
  if (src.includes(LITERAL)) bad.push(`${f} still hard-codes the four land ids`);
  if (src.includes('of 4 lands')) bad.push(`${f} still says "of 4 lands"`);
}

// Save merge: an old save (only the four ids) keeps its progress.
const old = merge({
  stars: 12,
  shards: { belle: 2, elsa: 1, rapunzel: 0, cinderella: 3 },
  done: ['belle'],
  ladder: { belle: { tier: 2, review: [] } },
  lastPlay: { belle: '2026-10-20' },
});
expect('old stars kept', old.stars, 12);
expect('old shards kept, new lands start at 0', old.shards, { belle: 2, elsa: 1, rapunzel: 0, cinderella: 3, ariel: 0, moana: 0, jasmine: 0, anna: 0, tiana: 0, aurora: 0 });
expect('old done kept', old.done, ['belle']);
expect('old ladder kept', old.ladder.belle, { tier: 2, review: [] });
expect('old lastPlay kept', old.lastPlay, { belle: '2026-10-20' });
expect('fresh save shards', merge(null).shards, { belle: 0, elsa: 0, rapunzel: 0, cinderella: 0, ariel: 0, moana: 0, jasmine: 0, anna: 0, tiana: 0, aurora: 0 });
expect('old ladder has no ariel or moana entry yet', [old.ladder.ariel, old.ladder.moana], [undefined, undefined]);

// A future princess: added to the list, she starts fresh and nothing else moves.
NPC_ORDER.push('olaf'); // test-only: this process exits after the checks
const future = merge({ stars: 3, shards: { belle: 1, olaf: 4 }, ladder: { belle: { tier: 1, review: [] } } });
expect('future id keeps its saved shard', future.shards.olaf, 4);
expect('future id without saved shard starts at 0', merge({ stars: 1 }).shards.olaf, 0);
expect('future id has no ladder yet', merge({}).ladder.olaf, undefined);
expect('existing progress intact with new id', future.shards.belle, 1);
expect('existing ladder intact with new id', future.ladder.belle, { tier: 1, review: [] });

// Zoe finished the original four before Ariel's land opened: nothing is wiped, Ariel starts fresh, no finale on load.
const FOUR = ['belle', 'elsa', 'rapunzel', 'cinderella'];
const veteran = merge({ stars: 40, shards: { belle: 5, elsa: 5, rapunzel: 5, cinderella: 5 }, done: FOUR, seenNewKingdoms: false });
expect('veteran done list kept', veteran.done, FOUR);
expect('veteran: Ariel not done', veteran.done.includes('ariel'), false);
expect('veteran: Ariel shard starts at 0', veteran.shards.ariel, 0);
expect('veteran: new-kingdoms card is due once', shouldShowNewKingdoms(builtSlotIds().length, veteran.seenNewKingdoms), true);
expect('veteran: not due again after seen', shouldShowNewKingdoms(builtSlotIds().length, true), false);
// Finale gate: only when every list princess is done AND every kingdom slot is built.
expect('finale: four done + Ariel, Moana, Jasmine, Anna and Tiana pending -> no finale', shouldRunFinale(FOUR, NPC_ORDER, builtSlotIds().length), false);
expect('finale: Ariel done but other kingdoms closed -> land celebration only', shouldRunFinale([...FOUR, 'ariel'], NPC_ORDER, builtSlotIds().length), false);
expect('finale: Ariel, Moana, Jasmine, Anna and Tiana done but one kingdom still closed -> land celebration only', shouldRunFinale([...FOUR, 'ariel', 'moana', 'jasmine', 'anna', 'tiana'], NPC_ORDER, builtSlotIds().length), false);
expect('finale: everything open and done -> finale', shouldRunFinale(NPC_ORDER, NPC_ORDER, NEW_LAND_SLOTS.length), true);
expect('finale: everything open, one missing -> no finale', shouldRunFinale(FOUR, NPC_ORDER, NEW_LAND_SLOTS.length), false);

// K7: Moana's isle opened after Zoe had seen the first kingdoms card: she sees a short card again, once.
expect('legacy save (flag only) counts the cove as seen', merge({ seenNewKingdoms: true }).seenKingdoms, ['sse']);
expect('fresh save has seen no kingdom', merge(null).seenKingdoms, []);
expect('junk seenKingdoms is sanitized', merge({ seenKingdoms: ['sse', 5, 'x y', 'ssw', 'sse'] }).seenKingdoms, ['sse', 'ssw']);
const sawCove = merge({ done: [...FOUR, 'ariel'], seenNewKingdoms: true });
expect('saw cove card: the isle, the garden, the harbor and the bayou are new kingdoms', unseenKingdomSlots(builtSlotIds(), sawCove.seenKingdoms).sort(), ['ene', 'ese', 'nne', 'ssw', 'wsw']);
// K9: Jasmine's garden opened after she had seen the cove and the isle: one short card for the garden (and the harbor since K11), once.
expect('saw cove and isle: the garden, the harbor and the bayou are new', unseenKingdomSlots(builtSlotIds(), ['sse', 'ssw']).sort(), ['ene', 'ese', 'nne', 'wsw']);
// K11: Anna's harbor opened after she had seen the cove, the isle and the garden: one short card for the harbor only, once.
expect('saw cove, isle and garden: the harbor and the bayou are new', unseenKingdomSlots(builtSlotIds(), ['sse', 'ssw', 'nne']).sort(), ['ene', 'ese', 'wsw']);
// K13: Tiana's bayou opened after she had seen the cove, the isle, the garden and the harbor: one short card for the bayou only, once.
expect('saw cove, isle, garden and harbor: the bayou is the only new kingdom', unseenKingdomSlots(builtSlotIds(), ['sse', 'ssw', 'nne', 'ese']), ['wsw', 'ene']);
expect('saw all five: no card', unseenKingdomSlots(builtSlotIds(), ['sse', 'ssw', 'nne', 'ese', 'wsw', 'ene']), []);
expect('fresh save: all five kingdoms are new (big card the first time)', unseenKingdomSlots(builtSlotIds(), []).sort(), ['ene', 'ese', 'nne', 'sse', 'ssw', 'wsw']);
expect('saw cove and isle: Jasmine starts fresh, Moana progress kept', (() => { const m = merge({ done: [...FOUR, 'ariel', 'moana'], seenNewKingdoms: true, seenKingdoms: ['sse', 'ssw'], shards: { moana: 5 } }); return [m.done.includes('moana'), m.done.includes('jasmine'), m.shards.moana, m.shards.jasmine, m.seenKingdoms]; })(), [true, false, 5, 0, ['sse', 'ssw']]);
expect('saw cove, isle and garden: Anna starts fresh, Jasmine progress kept', (() => { const m = merge({ done: [...FOUR, 'ariel', 'moana', 'jasmine'], seenNewKingdoms: true, seenKingdoms: ['sse', 'ssw', 'nne'], shards: { jasmine: 5 } }); return [m.done.includes('jasmine'), m.done.includes('anna'), m.shards.jasmine, m.shards.anna, m.seenKingdoms]; })(), [true, false, 5, 0, ['sse', 'ssw', 'nne']]);
expect('saw cove, isle, garden and harbor: Tiana starts fresh, Anna progress kept', (() => { const m = merge({ done: [...FOUR, 'ariel', 'moana', 'jasmine', 'anna'], seenNewKingdoms: true, seenKingdoms: ['sse', 'ssw', 'nne', 'ese'], shards: { anna: 5 } }); return [m.done.includes('anna'), m.done.includes('tiana'), m.shards.anna, m.shards.tiana, m.seenKingdoms]; })(), [true, false, 5, 0, ['sse', 'ssw', 'nne', 'ese']]);
expect('unseenKingdomSlots never throws', unseenKingdomSlots(null, 'x'), []);
expect('saw cove card: Moana starts fresh, Ariel progress kept', [sawCove.done.includes('ariel'), sawCove.done.includes('moana'), sawCove.shards.moana], [true, false, 0]);

if (bad.length) { console.error('FAIL\n' + bad.join('\n')); process.exit(1); }
console.log('lands_check: ok');
