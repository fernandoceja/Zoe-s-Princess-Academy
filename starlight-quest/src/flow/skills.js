/* Zoe's Starlight Quest: the parent's skill view (M5). Pure helpers, no DOM.
 * Every finished quest files each round's first-try result under a school skill (recordSkillResults, called from questComplete);
 * the Parent Corner shows one row per skill: Mastered, Practicing or Not started.
 * Mastered = 8 of her last 10 first-try answers right, across at least 2 different days. A Thursday test never counts here. */
import { BLEND_WORDS, DIGRAPH_WORDS, SKILL_IDS } from '../engine-core.js';

export const SKILLS = [
  { id: 'doubles', label: 'Doubles (5 + 5, 8 + 8)' },
  { id: 'neardoubles', label: 'Doubles plus one (5 + 6)' },
  { id: 'maketen', label: 'Make 10 (firefly jars)' },
  { id: 'chart120', label: '120 chart' },
  { id: 'cvc', label: 'CVC sounding out' },
  { id: 'blends', label: 'Blends (fr, st, cl)' },
  { id: 'sight', label: 'Sight words' },
  { id: 'dictation', label: 'Dictation sentences' },
];

export const MASTER_OF = 10;
export const MASTER_OK = 8;
export const MASTER_DAYS = 2;

/** Which school skill a round practices, or null for rounds the view does not track. */
export function skillOf(npcId, round) {
  if (!round || typeof round !== 'object') return null;
  const prompt = typeof round.prompt === 'string' ? round.prompt : '';
  if (npcId === 'elsa') {
    if (round.kind === 'maketen') return 'maketen';
    // "What is 6 + 6?" is a double, "What is 6 + 7?" or "7 + 6?" is a double plus one (read from the sum itself, at every level).
    const m = /(\d+) \+ (\d+)\?$/.exec(prompt);
    if (m && Number(round.answer) === Number(m[1]) + Number(m[2])) {
      const d = Math.abs(Number(m[1]) - Number(m[2]));
      if (d === 0) return 'doubles';
      if (d === 1) return 'neardoubles';
    }
    return null;
  }
  if (npcId === 'moana') return typeof round.kind === 'string' && round.kind.startsWith('chart') ? 'chart120' : null;
  if (npcId === 'tiana') return round.kind === 'maketen' ? 'maketen' : null;
  if (npcId === 'belle') {
    if (round.test) return null;
    if (prompt.startsWith('Sound it out')) return 'cvc';
    if ((round.build && round.build.sentence) || prompt === 'Which sentence did you hear?') return 'dictation';
    if (prompt.startsWith('Which word says')) {
      const a = round.answer;
      if (BLEND_WORDS.includes(a)) return 'blends';
      if (DIGRAPH_WORDS.includes(a)) return null;
      return 'sight';
    }
  }
  return null;
}

/** File one finished quest's first-try results under their skills (keeps the last 10 per skill). The caller saves. */
export function recordSkillResults(saveData, npcId, results, day) {
  if (!saveData.skills || typeof saveData.skills !== 'object') saveData.skills = {};
  for (const r of results || []) {
    const id = skillOf(npcId, r && r.round);
    if (!id || !SKILL_IDS.includes(id)) continue;
    const list = Array.isArray(saveData.skills[id]) ? saveData.skills[id] : [];
    list.push({ ok: !!r.firstTry, day });
    saveData.skills[id] = list.slice(-MASTER_OF);
  }
}

/** Status for one skill's result list: 'mastered' | 'practicing' | 'notstarted'. */
export function skillStatus(list) {
  const l = Array.isArray(list) ? list.slice(-MASTER_OF) : [];
  if (!l.length) return 'notstarted';
  const ok = l.filter((e) => e.ok).length;
  const days = new Set(l.map((e) => e.day)).size;
  return l.length >= MASTER_OF && ok >= MASTER_OK && days >= MASTER_DAYS ? 'mastered' : 'practicing';
}

/** One row per school skill for Parent Corner: { id, label, status, detail }. */
export function skillRows(saveData) {
  const skills = (saveData && saveData.skills) || {};
  return SKILLS.map((s) => {
    const l = Array.isArray(skills[s.id]) ? skills[s.id].slice(-MASTER_OF) : [];
    const status = skillStatus(l);
    const detail = status === 'notstarted' ? 'Not started yet'
      : `${l.filter((e) => e.ok).length} of her last ${l.length} first-try answers right`;
    return { id: s.id, label: s.label, status, detail };
  });
}
