// Backup and restore (M8): the file round-trips, junk is refused without throwing, and hostile data is cleaned by merge.
import { makeBackup, readBackup, applyBackup, BACKUP_APP, BACKUP_VERSION, MAX_BACKUP_BYTES } from '../src/flow/backup.js';
import { merge } from '../src/engine-core.js';
import { readFileSync } from 'node:fs';

const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const fixture = JSON.parse(readFileSync(new URL('./fixtures/save-v1.json', import.meta.url), 'utf8'));
const save = merge(JSON.parse(JSON.stringify(fixture)));
save.stars = 42;

// 1. Round trip.
const b = makeBackup(save, '2026-11-13');
ok(b.filename === 'starlight-quest-backup-2026-11-13.json', 'filename ' + b.filename);
ok(!/[^a-z0-9.-]/.test(b.filename), 'filename has odd characters');
const r = readBackup(b.text);
ok(r.ok === true, 'round trip refused: ' + r.error);
ok(r.ok && same(r.data, save), 'round trip changed the save');
ok(r.ok && r.summary.stars === 42, 'summary stars');
ok(r.ok && r.summary.savedOn === '2026-11-13', 'summary date');
ok(makeBackup(save, 'not a date').filename === 'starlight-quest-backup-latest.json', 'bad day should give latest');
ok(makeBackup(null, '2026-11-13').text.length > 0, 'null save should still make a file');
ok(b.text.length < MAX_BACKUP_BYTES, 'a normal backup must fit under the size limit');

// 2. Junk is refused with a message, never thrown.
const wrap = (o) => JSON.stringify(o);
const junk = [
  ['empty', ''], ['spaces', '   '], ['null', null], ['number', 42], ['not json', 'hello {'],
  ['array', '[]'], ['null json', 'null'], ['wrong app', wrap({ app: 'other', version: 1, data: {} })],
  ['no app', wrap({ version: 1, data: {} })],
  ['newer version', wrap({ app: BACKUP_APP, version: BACKUP_VERSION + 1, data: {} })],
  ['string version', wrap({ app: BACKUP_APP, version: '1', data: {} })],
  ['missing data', wrap({ app: BACKUP_APP, version: 1 })],
  ['array data', wrap({ app: BACKUP_APP, version: 1, data: [] })],
  ['string data', wrap({ app: BACKUP_APP, version: 1, data: 'x' })],
  ['too big', 'x'.repeat(MAX_BACKUP_BYTES + 1)],
];
for (const [name, text] of junk) {
  let res;
  try { res = readBackup(text); } catch (e) { bad.push(`${name}: threw ${e.message}`); continue; }
  ok(res.ok === false && typeof res.error === 'string' && res.error.length > 0, `${name}: should be refused with a message`);
}

// 3. Hostile data inside a valid wrapper is cleaned, not trusted.
const hostile = readBackup(wrap({ app: BACKUP_APP, version: 1, savedOn: '<script>', data: {
  stars: 'lots', done: ['belle', '<img onerror=x>', 'belle'], ladder: 'x', lastPlay: [1], __proto__: { polluted: true },
  skills: { cvc: 'bad', nope: { recent: [1] } }, spellTests: 'x', weekMeta: 7,
} }));
ok(hostile.ok === true, 'hostile data in a valid wrapper should still load after cleaning');
if (hostile.ok) {
  ok(Number.isFinite(hostile.data.stars) && hostile.data.stars >= 0, 'stars not cleaned: ' + hostile.data.stars);
  ok(Array.isArray(hostile.data.done) && hostile.data.done.every((id) => typeof id === 'string'), 'done not cleaned');
  ok(hostile.summary.lands === 1, 'summary should count only real lands: ' + hostile.summary.lands);
  ok(hostile.summary.savedOn === '', 'savedOn should be dropped when not a date');
  ok(!({}).polluted, 'prototype polluted');
  ok(!('nope' in (hostile.data.skills || {})), 'unknown skill kept');
}

// 4. apply puts the cleaned data in as the save.
const fake = { data: { stars: 1 } };
if (r.ok) {
  applyBackup(fake, r.data);
  ok(fake.data.stars === 42, 'apply did not replace the save');
  ok(same(fake.data, merge(fake.data)), 'applied data should already be clean');
}

// 5. An older save (no newer fields) loads and gains defaults.
const old = readBackup(wrap({ app: BACKUP_APP, version: 1, data: { stars: 5, done: ['belle'] } }));
ok(old.ok && old.data.stars === 5 && old.data.done.includes('belle'), 'older save should load');
ok(old.ok && typeof old.data.ladder === 'object', 'older save should get defaults');

if (bad.length) { console.error('backup_check FAILED:\n - ' + bad.join('\n - ')); process.exit(1); }
console.log('backup_check passed');
