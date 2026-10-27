// Today's star: deterministic pick of the land Zoe should visit.
import { pickTodayStar } from '../js/ladder.js';
import { NPC_ORDER } from '../js/quests.js';
const bad = [];
const expect = (n, got, want) => { if (got !== want) bad.push(`${n}: got "${got}" want "${want}"`); };
const T = '2026-10-26';
const rev = { tier: 1, review: [{ round: { prompt: 'q', choices: ['a', 'b'], answer: 'a' }, wins: 0 }] };

expect('fresh', pickTodayStar({ done: [], lastPlay: {}, ladder: {} }, T), 'belle');
expect('empty save', pickTodayStar({}, T), 'belle');
expect('played today skipped', pickTodayStar({ done: ['belle'], lastPlay: { belle: T }, ladder: {} }, T), 'elsa');
expect('played yesterday ok', pickTodayStar({ done: [], lastPlay: { belle: '2026-10-25' }, ladder: {} }, T), 'belle');
expect('review preferred', pickTodayStar({ done: [], lastPlay: {}, ladder: { rapunzel: rev } }, T), 'rapunzel');
expect('belle today, elsa review', pickTodayStar({ done: ['belle'], lastPlay: { belle: T }, ladder: { elsa: rev } }, T), 'elsa');
expect('review but played today', pickTodayStar({ done: [], lastPlay: { rapunzel: T }, ladder: { rapunzel: rev } }, T), 'belle');
expect('new land before done land', pickTodayStar({ done: ['belle', 'elsa'], lastPlay: {}, ladder: {} }, T), 'rapunzel');
expect('stable', pickTodayStar({ done: ['belle'], lastPlay: {}, ladder: {} }, T), pickTodayStar({ done: ['belle'], lastPlay: {}, ladder: {} }, T));
const all = Object.fromEntries(NPC_ORDER.map((id) => [id, T]));
expect('all today', String(pickTodayStar({ done: [], lastPlay: all, ladder: { elsa: rev } }, T)), 'null');

if (bad.length) { console.error('FAIL\n' + bad.join('\n')); process.exit(1); }
console.log('todaystar_check: ok');
