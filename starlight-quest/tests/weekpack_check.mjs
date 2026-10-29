// This week's pack editor (R4 T4): applyWeek / applyWords / resetWeek save through Save.save() into the
// existing key and schema, the live engine pack changes, Belle's rounds use the typed content, and reset
// restores the defaults. Plain Node: a stub localStorage stands in for the browser. No browser needed.
import assert from 'node:assert/strict';
import { Save, WEEK, WEEK_DEFAULT, SCHOOL_WORDS, setWeek, buildRounds, merge } from '../src/engine-core.js';
import { applyWeek, resetWeek, applyWords } from '../src/flow/parent.js';

const KEY = 'zoe-starlight-quest-v1';
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
  },
};
const stored = () => JSON.parse(store.get(KEY));
const bad = [];
const eq = (a, b, m) => { try { assert.deepStrictEqual(a, b); } catch (e) { bad.push([m, a, b]); } };

// Start from a saved game with progress, so the other fields can be checked afterwards.
Save.load();
Save.data.stars = 7;
Save.data.done = ['belle'];
Save.data.shards.belle = 2;
Save.save();

// 1. A custom pack is cleaned, stored in saveData.week, and becomes the live pack.
const form = { spelling: 'Ship, boat, SAIL, a1', sight: 'zed, yak', dictation: 'We sit.', vowels: 'big, dig' };
const got = applyWeek(Save.data, form);
const want = { spelling: ['ship', 'boat', 'sail'], sight: ['zed', 'yak'], dictation: 'We sit.', vowels: ['big', 'dig'] };
eq(got, want, 'applyWeek returns the cleaned pack');
eq(Save.data.week, want, 'saveData.week holds the cleaned pack');
eq(WEEK, want, 'live WEEK updated');
eq(stored().week, want, 'stored week in the existing key');
eq([stored().stars, stored().done, stored().shards.belle], [7, ['belle'], 2], 'other saved fields intact');

// 2. Junk fields fall back to the defaults, field by field.
const junk = applyWeek(Save.data, { spelling: '', sight: 'x', dictation: 'no capital.', vowels: 42 });
eq(junk.spelling, WEEK_DEFAULT.spelling, 'blank spelling -> default');
eq(junk.dictation, WEEK_DEFAULT.dictation, 'bad dictation -> default');
eq(junk.vowels, WEEK_DEFAULT.vowels, 'junk vowels -> default');

// 3. Belle's rounds use the typed content (spelling, short vowels, dictation, sight words).
applyWeek(Save.data, { spelling: 'zebra, tulip, gorilla', sight: 'zed, yak', dictation: 'Quin ran.', vowels: 'bug, dig' });
const seenText = new Set();
for (let seed = 1; seed <= 600; seed++) {
  for (const tier of [1, 2, 3]) {
    let s = (seed * 2654435761 + tier) >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('belle', rng, { tier, review: [] })) seenText.add(JSON.stringify(r));
  }
}
const all = [...seenText].join('\n');
for (const w of ['zebra', 'tulip', 'gorilla', 'bug', 'dig']) {
  if (!all.includes(`"${w}"`) && !all.includes(w)) bad.push(['belle rounds never use custom word', w]);
}
if (!all.includes('Quin ran.')) bad.push(['belle rounds never use the custom dictation sentence', 'Quin ran.']);

// 4. Class sight words (applyWords): cleaned, stored, live list updated; an empty input clears.
eq(applyWords(Save.data, 'Jump, look, JUMP, a1, play'), ['jump', 'look', 'play'], 'applyWords cleans the list');
eq(Save.data.schoolWords, ['jump', 'look', 'play'], 'schoolWords stored');
eq(SCHOOL_WORDS, ['jump', 'look', 'play'], 'live SCHOOL_WORDS updated');
eq(stored().schoolWords, ['jump', 'look', 'play'], 'schoolWords in the existing key');
eq(applyWords(Save.data, ''), [], 'empty input clears');
eq(SCHOOL_WORDS, [], 'cleared live list');

// 5. Reset restores WEEK_DEFAULT and stores null (the save schema's "defaults" value).
applyWeek(Save.data, form);
const back = resetWeek(Save.data);
eq(back, WEEK_DEFAULT, 'resetWeek returns the defaults');
eq(WEEK, WEEK_DEFAULT, 'reset restores live WEEK');
eq(Save.data.week, null, 'reset stores null');
eq(stored().week, null, 'reset stored');

// 6. Reload: the saved pack comes back through merge() and boot's setWeek().
applyWeek(Save.data, form);
const reloaded = merge(stored());
eq(reloaded.week, want, 'merge keeps the saved pack');
setWeek(reloaded.week);
eq(WEEK, want, 'boot setWeek restores the pack');
setWeek(null);
eq([reloaded.stars, reloaded.done], [7, ['belle']], 'reload keeps progress');

if (bad.length) { console.error('FAIL weekpack_check:', JSON.stringify(bad.slice(0, 4), null, 1)); process.exit(1); }
console.log('weekpack_check ok');
