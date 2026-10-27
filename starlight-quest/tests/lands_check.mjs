// Lands and princess list: one source of truth (NPC_ORDER), no hard-coded four-land lists, save merge keeps progress.
import { readFileSync } from 'node:fs';
// Same ?v= stamp as the app's import graph, so this is the same module instance save.js reads.
import { NPC_ORDER, PRINCESSES } from '../js/quests.js?v=20261027e2';
import { LAND_ORDER } from '../js/ladder.js?v=20261027e2';
import { merge } from '../js/save.js?v=20261027e2';

const bad = [];
const expect = (n, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${n}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };

expect('canonical list', NPC_ORDER, ['belle', 'elsa', 'rapunzel', 'cinderella']);
expect('LAND_ORDER reads the list', LAND_ORDER, NPC_ORDER);
expect('every land has a princess entry', NPC_ORDER.filter((id) => !PRINCESSES[id]), []);
expect('zoe is not a land', NPC_ORDER.includes('zoe'), false);

const LITERAL = "'belle', 'elsa', 'rapunzel', 'cinderella'";
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
expect('old shards kept', old.shards, { belle: 2, elsa: 1, rapunzel: 0, cinderella: 3 });
expect('old done kept', old.done, ['belle']);
expect('old ladder kept', old.ladder.belle, { tier: 2, review: [] });
expect('old lastPlay kept', old.lastPlay, { belle: '2026-10-20' });
expect('fresh save shards', merge(null).shards, { belle: 0, elsa: 0, rapunzel: 0, cinderella: 0 });

// A future princess: added to the list, she starts fresh and nothing else moves.
NPC_ORDER.push('olaf'); // test-only: this process exits after the checks
const future = merge({ stars: 3, shards: { belle: 1, olaf: 4 }, ladder: { belle: { tier: 1, review: [] } } });
expect('future id keeps its saved shard', future.shards.olaf, 4);
expect('future id without saved shard starts at 0', merge({ stars: 1 }).shards.olaf, 0);
expect('future id has no ladder yet', merge({}).ladder.olaf, undefined);
expect('existing progress intact with new id', future.shards.belle, 1);
expect('existing ladder intact with new id', future.ladder.belle, { tier: 1, review: [] });

if (bad.length) { console.error('FAIL\n' + bad.join('\n')); process.exit(1); }
console.log('lands_check: ok');
