// Grown-up gate (R4 T9): gateQuestion() makes sums of two numbers from 6 to 9 with three distinct
// answer buttons that include the sum, and ParentCorner.tsx has no hint text and no fixed answer.
// Plain Node, no browser.
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateQuestion } from '../src/flow/parent.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');   // starlight-quest/
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// 1. Operands and options over 1,000 seeds.
const seen = new Set();
for (let seed = 1; seed <= 1000; seed++) {
  let s = (seed * 2654435761) >>> 0;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const q = gateQuestion(rng);
  check(q.a >= 6 && q.a <= 9, `seed ${seed}: a=${q.a} outside 6-9`);
  check(q.b >= 6 && q.b <= 9, `seed ${seed}: b=${q.b} outside 6-9`);
  check(q.sum === q.a + q.b, `seed ${seed}: sum ${q.sum} != ${q.a} + ${q.b}`);
  check(q.options.length === 3, `seed ${seed}: ${q.options.length} options, expected 3`);
  check(new Set(q.options).size === 3, `seed ${seed}: options not distinct ${q.options}`);
  check(q.options.includes(q.sum), `seed ${seed}: options ${q.options} miss the sum ${q.sum}`);
  seen.add(q.sum);
}
check(seen.size > 1, 'gate sums never vary');

// 2. The screen source: no hint line, no fixed answer, no R4-FIX comments.
const src = readFileSync(join(root, 'src', 'components', 'ParentCorner.tsx'), 'utf8');
check(!/Hint:/.test(src), 'ParentCorner.tsx still prints a hint');
check(!/['"]14['"]/.test(src), 'ParentCorner.tsx still has the literal answer 14');
check(!/R4-FIX/.test(src), 'ParentCorner.tsx still has an R4-FIX comment');
check(/Oops, try again!/.test(src), 'ParentCorner.tsx lacks the "Oops, try again!" message');
check(/gateQuestion\(/.test(src), 'ParentCorner.tsx does not use gateQuestion()');

if (problems.length) { console.error('FAIL gate_check:', problems.slice(0, 5).join(' | ')); process.exit(1); }
console.log('gate_check ok (1000 seeds, sums 6-9 with 3 options, no hint)');
