/* Zoe's Starlight Quest — Parent Corner rules (R4 P4).
 * gateQuestion ported from js/ui.js showParentGate (1596-1610): two sums from 6 to 9, three shuffled
 * answer buttons (the sum and two near misses). Framework-free. Imports engine-core.js only.
 */

/** A fresh grown-up gate question. rng injectable (default Math.random), same draw order as ui.js. */
export function gateQuestion(rng = Math.random) {
  const a = 6 + Math.floor(rng() * 4);
  const b = 6 + Math.floor(rng() * 4);
  const sum = a + b;
  const offsets = [-2, -1, 1, 2];
  for (let i = offsets.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
  }
  const options = [sum, sum + offsets[0], sum + offsets[1]];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { a, b, sum, options };
}
