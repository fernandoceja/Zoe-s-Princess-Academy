import React, { useEffect, useRef, useState } from 'react';
import { Input } from '../engine-dom.js';
import { dragVector, DRAG_START_PX, DRAG_RADIUS_PX } from '../flow/playfix.js';

// Drag anywhere on the open world to walk (play-test fix 1). A drag that starts on the 3D world (not on a button or
// the joystick) becomes a floating joystick at the spot where the finger went down. A quick tap is still a tap
// (tap a princess to talk): Zoe only walks once the finger has moved DRAG_START_PX. Mouse drags work the same.
interface DragWalkProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
}

export const DragWalk: React.FC<DragWalkProps> = ({ targetRef, enabled }) => {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const drag = useRef<{ id: number; x: number; y: number; walking: boolean } | null>(null);
  const [ring, setRing] = useState<{ x: number; y: number; kx: number; ky: number } | null>(null);

  const stop = () => {
    if (drag.current && drag.current.walking) Input.setJoystick(0, 0);
    drag.current = null;
    setRing(null);
  };

  // Leaving roam (a princess was tapped, pause, the map) stops Zoe at once.
  useEffect(() => { if (!enabled) stop(); }, [enabled]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const down = (e: PointerEvent) => {
      if (!enabledRef.current || drag.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, walking: false };
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      if (!enabledRef.current) { stop(); return; }
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      const v = dragVector(dx, dy);
      if (!d.walking && Math.hypot(dx, dy) < DRAG_START_PX) return;
      d.walking = true;
      Input.setJoystick(v.x, v.z);
      const k = Math.min(1, Math.hypot(dx, dy) / DRAG_RADIUS_PX) * DRAG_RADIUS_PX * 0.6;
      const a = Math.atan2(dy, dx);
      setRing({ x: d.x, y: d.y, kx: Math.cos(a) * k, ky: Math.sin(a) * k });
    };
    const up = (e: PointerEvent) => {
      if (drag.current && e.pointerId === drag.current.id) stop();
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', stop);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', stop);
      stop();
    };
  }, [targetRef]);

  if (!ring) return null;
  // A soft ring where the finger went down and a little crown that follows it: she can see the drag is walking Zoe.
  return (
    <div
      className="fixed z-10 pointer-events-none w-24 h-24 -ml-12 -mt-12 rounded-full border-4 border-white/70 bg-white/20 flex items-center justify-center"
      style={{ left: ring.x, top: ring.y }}
      aria-hidden="true"
    >
      <div
        className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border-2 border-white shadow-md flex items-center justify-center text-sm"
        style={{ transform: `translate(${ring.kx}px, ${ring.ky}px)` }}
      >
        👑
      </div>
    </div>
  );
};
