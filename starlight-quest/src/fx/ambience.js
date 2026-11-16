/* Zoe's Starlight Quest — gentle background sound per land, made in code with WebAudio (Nov 16).
 * No audio files: a soft held chord per land, an occasional pentatonic plink, and a breath of filtered noise
 * (waves, wind or leaves) where it fits. Lands fade into each other as Zoe walks (same weights as the sky colours).
 * It ducks while anyone speaks, sits a little lower during questions, stops when the app is hidden, follows the HUD
 * sound button, and is lighter under Reduce Motion (no plinks or swells) and Low picture quality (chord only).
 * The rules live in src/flow/ambience.js.
 */
import { Narrator } from '../engine-dom.js';
import { moodWeights } from '../flow/quality.js';
import { getFxStatus } from './worldfx.js';
import { ambiencePlan, landGains, nextPlink, readAmbience, writeAmbience, LAND_SOUNDS } from '../flow/ambience.js';

const TICK_MS = 250;
const store = () => { try { return window.localStorage; } catch (e) { return null; } };
const reduceQuery = (() => { try { return window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null; } catch (e) { return null; } })();

let ctx = null, master = null, echo = null, noiseBuf = null;
let choice = readAmbience(store());
let hooks = { getXZ: () => null, getPhase: () => 'title' };
const lands = {};        // id -> { gain, nodes: [], lite, noise }
let plinkAt = 0;
let timer = 0;
let started = false;

function makeNoise() {
  const len = ctx.sampleRate * 2;
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = 0.97 * last + 0.03 * (Math.random() * 2 - 1); d[i] = last * 4; }   // soft brown-ish noise
  return b;
}

function lfo(rate, depth, target) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = rate;
  g.gain.value = depth;
  o.connect(g); g.connect(target);
  o.start();
  return [o, g];
}

function buildLand(id, lite, withNoise, calm) {
  const s = LAND_SOUNDS[id];
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(master);
  const nodes = [];
  const chord = lite ? s.chord.slice(0, 2) : s.chord;
  chord.forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? 'sine' : 'triangle';
    o.frequency.value = f;
    o.detune.value = (i - 1) * 4;
    const g = ctx.createGain();
    g.gain.value = 0.22 / chord.length;
    o.connect(g); g.connect(gain);
    o.start();
    nodes.push(o, g);
    if (!calm) nodes.push(...lfo(0.05 + i * 0.023, 0.06 / chord.length, g.gain));   // a slow, quiet breathing
  });
  if (withNoise && s.noise) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = s.noise.kind === 'leaves' ? 'bandpass' : 'lowpass';
    f.frequency.value = s.noise.cutoff;
    f.Q.value = s.noise.kind === 'leaves' ? 0.7 : 0.3;
    const g = ctx.createGain();
    g.gain.value = 0.12 * s.noise.level;
    src.connect(f); f.connect(g); g.connect(gain);
    src.start();
    nodes.push(src, f, g);
    if (!calm) nodes.push(...lfo(s.noise.kind === 'waves' ? 0.11 : 0.045, 0.1 * s.noise.level, g.gain));   // waves roll, wind sighs
  }
  return { gain, nodes, lite, noise: withNoise, calm };
}

function dropLand(id) {
  const L = lands[id];
  if (!L) return;
  delete lands[id];
  try { L.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2); } catch (e) { /* closing */ }
  setTimeout(() => {
    for (const n of L.nodes) { try { if (n.stop) n.stop(); } catch (e) { /* already stopped */ } try { n.disconnect(); } catch (e) { /* gone */ } }
    try { L.gain.disconnect(); } catch (e) { /* gone */ }
  }, 1500);
}

function plink(freq) {
  const t = ctx.currentTime + 0.02;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  o.connect(g); g.connect(master); g.connect(echo);
  o.start(t); o.stop(t + 1.7);
}

function ensureCtx() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    // A soft echo for the plinks only (a little sparkle, never loud).
    echo = ctx.createDelay(1.0);
    echo.delayTime.value = 0.38;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(master);
    noiseBuf = makeNoise();
    return true;
  } catch (e) { ctx = null; return false; }
}

function tick() {
  if (!ctx) return;
  const hidden = typeof document !== 'undefined' && document.hidden;
  const phase = hooks.getPhase();
  const plan = ambiencePlan({
    choice,
    muted: Narrator.muted,
    speaking: !!Narrator.speaking || (typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking),
    question: phase === 'challenge',
    calm: !!(reduceQuery && reduceQuery.matches),
    lite: getFxStatus().level === 'low',
    hidden: hidden || phase === 'title' || phase === 'tutorial',
  });
  const now = ctx.currentTime;
  const goingDown = plan.master < master.gain.value;
  master.gain.setTargetAtTime(plan.master, now, goingDown ? 0.12 : 0.6);   // duck fast, come back slowly
  if (!plan.master) {
    // Silent: let the graph rest (fewer voices running on the phone).
    if (master.gain.value < 0.0005) for (const id of Object.keys(lands)) dropLand(id);
    return;
  }
  const xz = hooks.getXZ() || { x: 0, z: 0 };
  const gains = landGains(moodWeights(xz.x, xz.z));
  const calm = !!(reduceQuery && reduceQuery.matches);
  for (const id of Object.keys(lands)) {
    const L = lands[id];
    if (!gains[id] || L.lite !== plan.lite || L.noise !== plan.noise || L.calm !== calm) dropLand(id);
  }
  let top = 'hub', topW = -1;
  for (const [id, w] of Object.entries(gains)) {
    if (!lands[id]) lands[id] = buildLand(id, plan.lite, plan.noise, calm);
    lands[id].gain.gain.setTargetAtTime(w, now, 0.8);
    if (w > topW) { top = id; topW = w; }
  }
  if (plan.plinks && now >= plinkAt) {
    const p = nextPlink(top);
    if (plinkAt) plink(p.freq);
    plinkAt = now + p.wait;
  }
}

function resume() {
  if (!ctx || !started) return;
  try { if (ctx.state !== 'running' && !document.hidden) ctx.resume().catch(() => {}); } catch (e) { /* not yet allowed */ }
}

/** For tests (?fxdebug only): is it running, how loud, which lands have a voice. */
export function ambienceStatus() {
  return { started, state: ctx ? ctx.state : 'none', master: master ? master.gain.value : 0, lands: Object.keys(lands), choice };
}

/** Boot once. getXZ: Zoe's place on the map; getPhase: the App phase ('challenge' plays a little quieter). */
export function installAmbience(h) {
  hooks = { ...hooks, ...h };
  if (typeof window === 'undefined') return;
  try { if (/[?&]fxdebug\b/.test(window.location.search)) window.__zsqAmb = { status: ambienceStatus, set: setAmbience }; } catch (e) { /* debug only */ }
  ['touchend', 'pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, resume, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { try { ctx.suspend(); } catch (e) { /* fine */ } } else resume();
  });
}

/** Start the sound (call inside the Start tap, so iOS allows audio). Safe to call again. */
export function startAmbience() {
  if (!ensureCtx()) return;
  started = true;
  resume();
  if (!timer) timer = window.setInterval(tick, TICK_MS);
}

/** Parent Corner choice: 'off' | 'soft' | 'medium'. */
export function getAmbience() { return choice; }
export function setAmbience(c) {
  choice = writeAmbience(store(), c);
  if (!ctx && choice !== 'off') startAmbience();   // the Parent Corner tap is a gesture, so iOS allows it
  if (ctx) tick();
  return choice;
}
