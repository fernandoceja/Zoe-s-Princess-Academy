/* Zoe's Starlight Quest: the Kingdom Map screen (B2). Words, what she hears, and where things sit on the map.
 * Pure: no DOM, no audio. KingdomMap.tsx renders these; tests/kingdommap_check.mjs checks them.
 * World coordinates: x east, z south (north is up on the map), the world is a disc of radius 60 around the hub. */
import { spoken } from './screens.js';

export const MAP_HALF = 64;   // the map shows -64..64 on both axes, so the outer ring (radius 50) and its lands fit with a margin
export const MIN_TARGET_PX = 60;

export const KINGDOM_MAP = {
  heading: 'Kingdom Map',
  sub: 'Tap a kingdom. Fireflies will show you the way!',
  today: "Today's star",
  close: 'Close',
  closed: 'Not open yet',
};

/** A picture for each land (plain emoji: nothing to download, works offline). */
export const LAND_ICON = {
  library: '📚', frostfall: '❄️', meadow: '🌻', village: '👠', cove: '🐚', isle: '🌴', garden: '🌙', harbor: '⚓', bayou: '🪷', glen: '🌹',
};

/** Where a world point sits on the map, in percent of the map's width and height (0..100). */
export function mapPercent(x, z) {
  const k = (v) => Math.max(0, Math.min(100, ((Number(v) || 0) + MAP_HALF) / (2 * MAP_HALF) * 100));
  return { left: k(x), top: k(z) };
}

/** What the screen says when it opens. */
export const mapSay = (todayLand) => spoken(KINGDOM_MAP.heading + '.', KINGDOM_MAP.sub, todayLand ? `Today's star is over ${todayLand}.` : '');

/** What a tap on a land says (the land name; "finished" if its star shard is won). */
export const landSay = (landName, done) => spoken(landName + '.', done ? 'This kingdom is glowing!' : '');

/** The toast and words when the fireflies light up. */
export const followLine = (landName) => `Follow the fireflies to ${landName}!`;
export const followSay = (landName) => spoken(followLine(landName));
export const arrivedLine = (landName) => `You made it to ${landName}!`;

/** Each land's look on the map: 'today' (gold star badge), 'glow' (finished), 'new' (not yet) or 'closed'. */
export function landLook(land, doneIds, todayNpc) {
  if (!land.open) return 'closed';
  if (land.npc === todayNpc) return 'today';
  return (doneIds || []).includes(land.npc) ? 'glow' : 'new';
}

/** The words a screen reader (and Zoe's tap) uses for a land: name, then how it looks. */
export function landLabel(landName, look) {
  const tail = { today: "Today's star.", glow: 'Glowing.', new: '', closed: KINGDOM_MAP.closed + '.' }[look] || '';
  return `${landName}. ${tail}`.trim();
}

/** Tap targets on a map `sizePx` wide: [{ npc, x, y }] centres in pixels. The tests use it to be sure no two 60px targets overlap. */
export function mapLayout(lands, sizePx) {
  return (lands || []).map((l) => {
    const p = mapPercent(l.center.x, l.center.z);
    return { npc: l.npc, x: (p.left / 100) * sizePx, y: (p.top / 100) * sizePx };
  });
}
