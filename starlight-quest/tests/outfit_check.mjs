// Wardrobe: unknown values dropped, locked rewards ignored, valid ones kept.
import { OUTFIT, MILESTONES, sanitizeOutfit } from '../js/save.js';
const bad = [];
const expect = (name, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };
const all = MILESTONES.map((m) => m.id);

expect('milestones wired', Object.values(OUTFIT).every((d) => all.includes(d.need)), true);
expect('each slot 4 choices', Object.values(OUTFIT).map((d) => d.choices.length).join(','), '4,4,4');
expect('unique ids', Object.values(OUTFIT).every((d) => new Set(d.choices.map((c) => c.id)).size === d.choices.length), true);

expect('valid kept', sanitizeOutfit({ trail: 'rainbow', gem: 'blue', skirt: 'mint', buddy: true }, all),
  { trail: 'rainbow', gem: 'blue', skirt: 'mint', buddy: true });
expect('default dropped', sanitizeOutfit({ trail: 'pinkgold', gem: 'pink', skirt: 'rose' }, all), {});
expect('unknown value', sanitizeOutfit({ trail: 'neon', gem: 7, skirt: null, buddy: 'yes' }, all), {});
expect('unknown key', sanitizeOutfit({ hat: 'red', trail: 'icy' }, all), { trail: 'icy' });
expect('locked ignored', sanitizeOutfit({ trail: 'icy', gem: 'blue', skirt: 'mint', buddy: true }, []), {});
expect('partly locked', sanitizeOutfit({ trail: 'icy', gem: 'blue', skirt: 'mint', buddy: true }, ['trail-10', 'skirt-50']),
  { trail: 'icy', skirt: 'mint' });
expect('buddy needs 100', sanitizeOutfit({ buddy: true }, ['trail-10', 'tiara-25', 'skirt-50']), {});
expect('garbage', [sanitizeOutfit(null, all), sanitizeOutfit('x', all), sanitizeOutfit([], all), sanitizeOutfit({ trail: 'icy' }, null)], [{}, {}, {}, {}]);
expect('proto key', Object.keys(sanitizeOutfit(JSON.parse('{"__proto__":{"trail":"icy"}}'), all)).length, 0);

if (bad.length) { console.log('FAIL', bad); process.exit(1); }
console.log('outfit_check ok');
