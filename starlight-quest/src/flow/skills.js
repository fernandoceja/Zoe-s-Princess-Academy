/* Zoe's Starlight Quest: the parent's skill view (M5). Pure helpers, no DOM.
 * Every finished quest files each round's first-try result under a school skill (recordSkillResults, called from questComplete);
 * the Parent Corner shows one row per skill: Mastered, Practicing or Not started.
 * Mastered = 8 of her last 10 first-try answers right, across at least 2 different days. A Thursday test never counts here. */
import { SKILL_IDS } from '../engine-core.js';

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

/** Which school skill a round practices, or null for rounds the view does not track.
 * The generators tag the math and word rounds (round.skill); a round with no tag (an older saved review round) is not counted,
 * except Sound-it-out and dictation rounds, which read unambiguously from their own shape. */
export function skillOf(npcId, round) {
  if (!round || typeof round !== 'object') return null;
  if (round.test) return null; // a Thursday test never counts
  const prompt = typeof round.prompt === 'string' ? round.prompt : '';
  const tag = typeof round.skill === 'string' ? round.skill : '';
  if (npcId === 'elsa') return tag === 'doubles' || tag === 'neardoubles' || tag === 'maketen' ? tag : null;
  if (npcId === 'tiana') return tag === 'maketen' ? 'maketen' : null;
  if (npcId === 'moana') return typeof round.kind === 'string' && round.kind.startsWith('chart') ? 'chart120' : null;
  if (npcId === 'belle') {
    if (prompt.startsWith('Sound it out')) return 'cvc';
    if ((round.build && round.build.sentence) || prompt === 'Which sentence did you hear?') return 'dictation';
    return tag === 'blends' || tag === 'sight' ? tag : null;
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
    const detail = status === 'notstarted' ? (s.soon ? 'Not in the game yet' : 'Not started yet')
      : `${l.filter((e) => e.ok).length} of her last ${l.length} first-try answers right`;
    return { id: s.id, label: s.label, status, detail };
  });
}
