// Star milestones: unlock once, never twice, never lose one.
import { MILESTONES, checkMilestones } from '../js/save.js';
const bad = [];
const ids = (a) => a.map((m) => m.id).join(',');
const expect = (name, got, want) => { if (got !== want) bad.push(`${name}: got "${got}" want "${want}"`); };

expect('list', MILESTONES.map((m) => m.stars).join(','), '10,25,50,100');
if (MILESTONES.some((m) => !m.id || !m.label || !m.emoji)) bad.push('milestone missing id/label/emoji');

let d = { stars: 9, milestones: [] };
expect('9 none', ids(checkMilestones(d)), '');
d.stars = 10;
expect('9->10', ids(checkMilestones(d)), 'trail-10');
expect('10 again', ids(checkMilestones(d)), '');

d = { stars: 9, milestones: [] };
d.stars = 30;
expect('9->30', ids(checkMilestones(d)), 'trail-10,tiara-25');
expect('30 again', ids(checkMilestones(d)), '');
d.stars = 49;
expect('49', ids(checkMilestones(d)), '');
d.stars = 50;
expect('->50', ids(checkMilestones(d)), 'skirt-50');

d = { stars: 140, milestones: [] };
expect('140 all', ids(checkMilestones(d)), 'trail-10,tiara-25,skirt-50,butterfly-100');
expect('140 again', ids(checkMilestones(d)), '');
expect('saved ids', d.milestones.length, 4);

d = { stars: 100 };  // old save without the field
expect('no field', checkMilestones(d).length, 4);

if (bad.length) { console.log('FAIL', bad); process.exit(1); }
console.log('milestone_check ok');
