/* Zoe's Starlight Quest — fly to a land from the Kingdom Map (Nov 17, item 2).
 * Pick a land on the map, then Fly (a short sparkle flight, 1.5 s) or Walk (the firefly trail, as before).
 * Pure: no three.js, no DOM. src/fx/navfx.js plays it; tests/flight_check.mjs checks it.
 */
import { kingdomLands } from '../engine-core.js';
import { spoken } from './screens.js';

export const FLIGHT = {
  total: 1.5,     // seconds, start to landed (under the 2 s asked for)
  peak: 0.55,     // the sparkle cover is full here; she is moved to the land at this moment
  height: 2.6,    // how high she floats up (none under Reduce Motion)
  land: 3,        // she lands this far in front of the princess (towards the hub), inside her talk ring (3.5)
};

/** Where she lands for a princess: on the hub side of her pad, so the princess is right there. null for unknown or closed lands. */
export function landingSpot(npcId, search) {
  const l = kingdomLands(search).find((k) => k.npc === npcId);
  if (!l || !l.open) return null;
  const r = Math.hypot(l.pad.x, l.pad.z) || 1;
  return { x: l.pad.x - (l.pad.x / r) * FLIGHT.land, z: l.pad.z - (l.pad.z / r) * FLIGHT.land };
}

const ease = (k) => k * k * (3 - 2 * k);

/** The flight at time t (seconds since it started):
 * { cover 0..1 (sparkle veil over the world), lift (height above the ground), moved (she is at the land now), done } */
export function flightFrame(t, calm = false) {
  const tt = Math.max(0, t);
  const done = tt >= FLIGHT.total;
  const up = Math.min(1, tt / FLIGHT.peak);
  const down = Math.min(1, Math.max(0, (tt - FLIGHT.peak) / (FLIGHT.total - FLIGHT.peak)));
  const cover = done ? 0 : tt < FLIGHT.peak ? ease(up) : 1 - ease(down);
  const lift = calm || done ? 0 : (tt < FLIGHT.peak ? ease(up) : 1 - ease(down)) * FLIGHT.height;
  return { cover, lift, moved: tt >= FLIGHT.peak, done };
}

/** Words. */
export const FLY_TEXT = {
  fly: 'Fly',
  walk: 'Walk',
  choose: 'Fly or walk?',
};
export const flyAskSay = (landName) => spoken(landName + '.', FLY_TEXT.choose);
export const flewLine = (landName) => `You flew to ${landName}!`;
export const flewSay = (landName) => spoken(flewLine(landName));
