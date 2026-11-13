/* Zoe's Starlight Quest: backup and restore progress as a file (M8). Pure helpers, no DOM, no network.
 * The backup is one small JSON file the grown-up saves to their own device and can load on a new iPad or after Safari data was cleared.
 * Loading never trusts the file: the data goes through the same merge() every saved game goes through. */
import { merge, NPC_ORDER } from '../engine-core.js';

export const BACKUP_APP = 'zoe-starlight-quest';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 200000;

/** { text, filename } for a backup of this save (saveData is Save.data, day is today's local date). */
export function makeBackup(saveData, day) {
  const data = merge(JSON.parse(JSON.stringify(saveData || {})));
  const text = JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, savedOn: day, data }, null, 1);
  return { text, filename: `starlight-quest-backup-${/^\d{4}-\d{2}-\d{2}$/.test(day) ? day : 'latest'}.json` };
}

/** Read a backup file's text. Returns { ok: true, data, summary } (data is already cleaned by merge) or { ok: false, error }. Never throws. */
export function readBackup(text) {
  try {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'That file is empty.' };
    if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: 'That file is too big to be a Starlight Quest backup.' };
    let raw;
    try { raw = JSON.parse(text); } catch (e) { return { ok: false, error: 'That is not a Starlight Quest backup file.' }; }
    if (!raw || typeof raw !== 'object' || raw.app !== BACKUP_APP) return { ok: false, error: 'That is not a Starlight Quest backup file.' };
    if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) return { ok: false, error: 'That backup is from a newer version of the game.' };
    if (!raw.data || typeof raw.data !== 'object' || Array.isArray(raw.data)) return { ok: false, error: 'That backup has no saved game inside.' };
    const data = merge(raw.data);
    const savedOn = typeof raw.savedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.savedOn) ? raw.savedOn : '';
    return { ok: true, data, summary: { stars: data.stars, lands: new Set(data.done.filter((id) => NPC_ORDER.includes(id))).size, savedOn } };
  } catch (e) {
    return { ok: false, error: 'That file could not be read.' };
  }
}

/** Put the backup's data in as the current save (the caller saves to storage and reloads the page). Returns the cleaned data. */
export function applyBackup(Save, data) {
  Save.data = merge(data);
  return Save.data;
}
