/* Zoe's Starlight Quest — what the princess reads aloud (R4 P3.2).
 * Ported verbatim from js/main.js startRound (lines 487-495). Pure: the caller passes the choices
 * that are on screen (after any narrowing and shuffle), so the spoken list matches the buttons.
 * Imports nothing: no DOM, no audio.
 */

/** The question she reads aloud, plus "Is it A, or B?" for the land/quest types that read their choices. */
export function voiceText(npcId, round, choices) {
  let text = round.say || round.prompt;
  if ((npcId === 'cinderella' || npcId === 'rapunzel' || ((npcId === 'ariel' || npcId === 'moana' || npcId === 'jasmine' || npcId === 'anna' || npcId === 'tiana' || npcId === 'aurora') && !round.noChoiceSay)) && !round.sort) {
    // Read the words only, not the picture emoji in front of them.
    const labels = choices.map((c) => (round.choiceSay && round.choiceSay[c.label]) || c.label.replace(/[\p{Extended_Pictographic}️‍]/gu, '').trim());
    text += ' Is it ' + labels.slice(0, -1).join(', ') + ', or ' + labels[labels.length - 1] + '?';
  }
  return text;
}
