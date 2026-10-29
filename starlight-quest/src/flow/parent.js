/* Zoe's Starlight Quest — Parent Corner rules (R4 P4).
 * gateQuestion ported from js/ui.js showParentGate (1596-1610): two sums from 6 to 9, three shuffled
 * answer buttons (the sum and two near misses). Framework-free. Imports engine-core.js only.
 *
 * The editors (R4 P4.2) save the same fields as ui.js: applyWeek / resetWeek (ui.js _weekBlock, 1537-1561)
 * and applyWords (ui.js _wordsBlock, 1478-1495). `saveData` is the live Save.data object; Save.save() persists it.
 */
import { Save, WEEK, cleanWeek, setWeek, cleanWordList, setSchoolWords } from '../engine-core.js';

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

/** Save this week's pack from the four typed fields. Blank or invalid fields use the default (cleanWeek).
 * Returns the cleaned pack now in use. */
export function applyWeek(saveData, form) {
  const cleaned = cleanWeek(form);
  saveData.week = cleaned;
  setWeek(cleaned);
  Save.save();
  return cleanWeek(WEEK);
}

/** Back to the built-in pack (ui.js "Back to defaults"). Returns the pack now in use (WEEK_DEFAULT). */
export function resetWeek(saveData) {
  saveData.week = null;
  setWeek(null);
  Save.save();
  return cleanWeek(WEEK);
}

/** Save the class sight-word list typed as one comma-separated string (ui.js Save). An empty string clears it.
 * Returns the cleaned list now in use. */
export function applyWords(saveData, input) {
  const words = cleanWordList(input);
  saveData.schoolWords = words;
  Save.save();
  setSchoolWords(words);
  return words.slice();
}

/** The status line under the class-words editor (ui.js _wordsBlock note), with the result of the last save. */
export function wordsStatus(words, extra = '') {
  const base = words.length >= 3
    ? `Using your ${words.length} words: ${words.join(', ')}.`
    : 'Using the built-in list.';
  return base + (extra ? ` ${extra}` : '');
}

/** What the class-words editor says right after a save (ui.js _wordsBlock save). */
export function wordsSavedNote(words) {
  return words.length >= 3 ? `Saved ${words.length} words.`
    : words.length ? `Saved ${words.length}, but 3 or more are needed.` : 'No valid words found.';
}
