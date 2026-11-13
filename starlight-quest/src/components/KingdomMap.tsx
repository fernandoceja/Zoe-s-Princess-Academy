import React, { useEffect, useRef, useState } from 'react';
import { Narrator } from '../engine-dom.js';
import { PRINCESSES, pathSegments, kingdomLands, CASTLE_POS, INNER_LAND_ANGLES, LAND_DIST, WORLD_RADIUS } from '../engine-core.js';
import { SPEAK_TAP_MS } from '../flow/screens.js';
import { KINGDOM_MAP, LAND_ICON, MAP_HALF, MIN_TARGET_PX, mapPercent, mapSay, landSay, landLook, landLabel } from '../flow/kingdommap.js';

interface KingdomMapProps {
  doneIds: string[];
  todayStar?: string;
  player: { x: number; z: number };
  onPick: (npc: string) => void;
  onClose: () => void;
}

type Land = { npc: string; land: string; center: { x: number; z: number }; pad: { x: number; z: number }; open: boolean };

// The painted map: one inline SVG (ground, paths, castle, Zoe) with a real <button> on every land. No images, nothing to download.
export const KingdomMap: React.FC<KingdomMapProps> = ({ doneIds, todayStar, player, onPick, onClose }) => {
  const lands: Land[] = kingdomLands();
  const name = (npc: string) => (PRINCESSES as any)[npc]?.landName || npc;
  // Like the pause menu: a tap says the name; a second tap goes at once, or it goes by itself after a moment. With sound off it just goes.
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const pickedRef = useRef(false);   // after a pick the next line ("Follow the fireflies") is already speaking: do not cut it off
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    Narrator.speakText(mapSay(todayStar && kingdomLands().some((l: Land) => l.npc === todayStar) ? name(todayStar) : ''), { pitch: 1.15, rate: 0.95 });
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(timer.current); window.removeEventListener('keydown', onKey); if (!pickedRef.current) Narrator.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pick = (l: Land) => {
    window.clearTimeout(timer.current);
    if (!l.open) { Narrator.speakText(landSay(name(l.npc), false) + ' ' + KINGDOM_MAP.closed + '.', { pitch: 1.15, rate: 0.95 }); return; }
    if (armed === l.npc || Narrator.muted) { setArmed(null); pickedRef.current = true; onPick(l.npc); return; }
    setArmed(l.npc);
    Narrator.speakText(landSay(name(l.npc), doneIds.includes(l.npc)), { pitch: 1.15, rate: 0.95 });
    timer.current = window.setTimeout(() => { setArmed(null); pickedRef.current = true; onPick(l.npc); }, SPEAK_TAP_MS);
  };
  const todayLand = lands.find((l) => l.npc === todayStar);
  const zoe = mapPercent(player.x, player.z);
  const innerCenters = Object.values(INNER_LAND_ANGLES as Record<string, number>).map((a) => ({ x: Math.cos(a) * LAND_DIST, z: Math.sin(a) * LAND_DIST }));

  return (
    <div className="zsq-modal-wrap fixed inset-0 z-40 flex items-center justify-center p-3 bg-night/80 backdrop-blur-xs animate-fade-in pointer-events-auto overflow-y-auto"
      role="dialog" aria-modal="true" aria-label={KINGDOM_MAP.heading}>
      <div className="zsq-map-card w-full max-w-xl my-auto bg-cream rounded-[28px] border-4 border-gold p-3 sm:p-4 shadow-2xl relative">
        <h2 className="text-center font-title font-extrabold text-xl text-night mb-2">{KINGDOM_MAP.heading}</h2>
        <div className="zsq-map-body flex flex-col items-center gap-3">
          <div className="relative" style={{ width: 'var(--zsq-map-size)', aspectRatio: '1 / 1' }}>
            <svg viewBox={`${-MAP_HALF} ${-MAP_HALF} ${MAP_HALF * 2} ${MAP_HALF * 2}`} className="absolute inset-0 w-full h-full" aria-hidden="true">
              <circle cx="0" cy="0" r={WORLD_RADIUS} fill="#C9B3F2" fillOpacity="0.55" stroke="#2B1E5C" strokeOpacity="0.35" strokeWidth="0.8" />
              {innerCenters.map((c, i) => <line key={'i' + i} x1="0" y1="0" x2={c.x} y2={c.z} stroke="#FFF8EC" strokeWidth="3.2" strokeLinecap="round" />)}
              {(pathSegments() as any[]).map((s, i) => <line key={'p' + i} x1={s.from.x} y1={s.from.z} x2={s.to.x} y2={s.to.z} stroke="#FFF8EC" strokeWidth="3.2" strokeLinecap="round" />)}
              <circle cx="0" cy="0" r="8" fill="#F6C945" fillOpacity="0.5" />
              <text x={CASTLE_POS.x} y={CASTLE_POS.z} fontSize="11" textAnchor="middle" dominantBaseline="central">🏰</text>
              {todayLand && <line x1={player.x} y1={player.z} x2={todayLand.pad.x} y2={todayLand.pad.z} stroke="#8FD6C4" strokeWidth="1" strokeDasharray="2 3" strokeLinecap="round" />}
            </svg>
            {/* Zoe */}
            <div aria-hidden="true" className="absolute pointer-events-none" style={{ left: `${zoe.left}%`, top: `${zoe.top}%`, transform: 'translate(-50%, -50%)' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#FF8FB8', border: '3px solid #fff', boxShadow: '0 0 0 2px #2B1E5C' }} />
            </div>
            {lands.map((l) => {
              const p = mapPercent(l.center.x, l.center.z);
              const look = landLook(l, doneIds, todayStar);
              const bg = look === 'glow' || look === 'today' ? '#F6C945' : look === 'closed' ? '#cbd5e1' : '#C9B3F2';
              return (
                <button
                  key={l.npc}
                  onClick={() => pick(l)}
                  aria-label={landLabel(name(l.npc), look)}
                  aria-disabled={!l.open}
                  className={`absolute flex items-center justify-center rounded-full border-[3px] text-2xl active:scale-95 transition-transform${armed === l.npc ? ' ring-4 ring-rose' : ''}${look === 'today' ? ' zsq-map-today' : ''}`}
                  style={{ left: `${p.left}%`, top: `${p.top}%`, transform: 'translate(-50%, -50%)', width: MIN_TARGET_PX, height: MIN_TARGET_PX, minWidth: MIN_TARGET_PX, minHeight: MIN_TARGET_PX,
                    background: bg, borderColor: look === 'new' ? '#2B1E5C' : '#fff', boxShadow: look === 'glow' || look === 'today' ? '0 0 14px 4px rgba(246,201,69,.85)' : '0 2px 4px rgba(42,33,64,.35)', opacity: look === 'closed' ? 0.6 : 1 }}
                >
                  <span aria-hidden="true">{(LAND_ICON as any)[l.land] || '⭐'}</span>
                  {look === 'today' && <span aria-hidden="true" className="absolute -top-3 -right-2 text-xl">⭐</span>}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {todayLand && (
              <button onClick={() => pick(todayLand)} className="min-h-[60px] px-5 rounded-full bg-gold text-ink font-read font-bold text-xl border-2 border-white shadow-md active:scale-95">
                ⭐ {KINGDOM_MAP.today}
              </button>
            )}
            <button ref={closeRef} onClick={onClose} className="min-h-[60px] min-w-[60px] px-5 rounded-full bg-night text-cream font-read font-bold text-xl border-2 border-white shadow-md active:scale-95" aria-label={KINGDOM_MAP.close}>
              ✖ {KINGDOM_MAP.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
