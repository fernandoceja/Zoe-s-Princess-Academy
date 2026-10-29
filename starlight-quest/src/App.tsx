import { useEffect, useRef } from 'react';
import { Save } from './engine-core.js';
import { Input, createWorld } from './engine-dom.js';

// P1 stub: boots the engine world once. Replaced by the real shell in P2/P3.
export default function App() {
  const ref = useRef<HTMLDivElement>(null);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current || !ref.current) return;
    booted.current = true;
    Save.load();
    Input.init();
    const world = createWorld(ref.current, {});
    world.setInputEnabled(true);
    return () => world.dispose();
  }, []);

  return <div ref={ref} style={{ position: 'fixed', inset: 0 }} />;
}
