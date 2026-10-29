import React, { useRef, useState, useEffect } from 'react';
import { Input } from '../engine-dom.js';

export const VirtualJoystick: React.FC = () => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [touching, setTouching] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const radius = 48; // Max radius in px

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setTouching(true);
    updateKnob(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touching || touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        updateKnob(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setTouching(false);
        setKnobPos({ x: 0, y: 0 });
        Input.setJoystick(0, 0);
        break;
      }
    }
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    let kx = dx;
    let ky = dy;

    if (dist > radius) {
      kx = (dx / dist) * radius;
      ky = (dy / dist) * radius;
    }

    setKnobPos({ x: kx, y: ky });

    // Normalize -1 to 1 for 3D world (screen up = -Z)
    const normX = kx / radius;
    const normZ = ky / radius;
    Input.setJoystick(normX, normZ);
  };

  return (
    <div className="fixed bottom-6 left-6 z-20 pointer-events-auto touch-none select-none sm:block">
      <div
        ref={baseRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="w-28 h-28 rounded-full bg-white/70 backdrop-blur-md border-4 border-[#ebd373] shadow-lg flex items-center justify-center relative active:scale-95 transition-transform"
      >
        {/* Joystick Center Indicator */}
        <div className="w-4 h-4 rounded-full bg-amber-200/80 pointer-events-none" />

        {/* Joystick Movable Knob */}
        <div
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
          className="absolute w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border-2 border-white shadow-md pointer-events-none flex items-center justify-center text-sm font-black text-amber-950"
        >
          👑
        </div>
      </div>
    </div>
  );
};
