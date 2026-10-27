/* Zoe's Starlight Quest — UI layer
 * Builds all DOM + CSS for: title screen, top bar, dialogue sheet,
 * challenge modal, interact prompt, toasts, celebration, finale,
 * parent corner, touch joystick, mute wiring.
 * ES module, no external assets (fonts loaded by the integrator).
 */

import { Narrator, SoundFX } from './audio.js?v=20261027e2';
import { PORTRAIT_ZOE } from './portrait-zoe.js?v=20261027e2';
import { PARENT_CORNER_HTML, PRINCESSES, NPC_ORDER, SCHOOL_WORDS, cleanWordList, setSchoolWords, WEEK, WEEK_DEFAULT, cleanWeek, setWeek, tileSound } from './quests.js?v=20261027e2';
import { Save, MILESTONES, OUTFIT, BUDDY_NEED, sanitizeOutfit } from './save.js?v=20261027e2';
import { landState, today } from './ladder.js?v=20261027e2';
import { Input } from './input.js?v=20261027e2';
import { todayKey, treasureBookModel } from './treasures.js?v=20261027e2';

const GOLD = '#ebd373';

// Tap-to-blend (Belle CVC): a tile says its letter's SOUND; Blend says all, then the word.
// _blendTok cancels an older sequence when anything new is tapped (any other modal button too).
let _blendTok = 0;
function _blendTiles(letters, pid) {
  const voice = pid || 'belle';
  const box = el('div', 'zsq-tiles');
  const tiles = letters.map((l) => el('button', 'zsq-tile', l));
  const lit = (i) => tiles.forEach((t, k) => t.classList.toggle('zsq-on', k === i));
  const play = (l, done) => {
    const s = tileSound(l);
    if (!s) { done(); return; }
    if (s.tts) Narrator.speakExact(voice, s.tts, done);
    else Narrator.playClip(s.url, done, s.stopAt);
  };
  tiles.forEach((t, i) => {
    t.setAttribute('aria-label', `Sound of ${letters[i]}`);
    t.onclick = () => {
      const my = ++_blendTok;
      lit(i);
      play(letters[i], () => { if (my === _blendTok) lit(-1); });
    };
  });
  const blend = el('button', 'zsq-blend', '🔊 Blend it!');
  blend.onclick = () => {
    const my = ++_blendTok;
    const step = (i) => {
      if (my !== _blendTok || !box.isConnected) return;
      if (i >= letters.length) { lit(-1); Narrator.speakExact(voice, letters.join('')); return; }
      lit(i);
      play(letters[i], () => setTimeout(() => step(i + 1), 150));
    };
    step(0);
  };
  box.append(...tiles);
  const wrap = el('div', '');
  wrap.append(box, blend);
  return wrap;
}
/**
 * Reusable tap-to-build tiles (S2 spelling; S3 reuses it for sentence word tiles).
 *   tileBuilder({ tiles, target, pid, onWrong, onDone, speak })
 *     tiles   array of strings, the tiles on offer (letters or words). Duplicates are fine.
 *     target  array of strings, the sequence to build, in order. Each must appear in `tiles`.
 *     onWrong({ tile, index, wrongs }) a tile that is not the next one wiggles and is NOT placed.
 *     onDone(placed) every slot filled correctly; placed = array of strings (= target).
 *     speak   optional (label) => say the tile when it is placed (default: no sound).
 *   Returns a DOM element (slot row, tile bank, Undo and Clear buttons) with .undo(), .clear(),
 *   .placed() and .wrongs(). After two wrong taps in a row on the same slot the right tile glows.
 */
export function tileBuilder({ tiles, target, onWrong, onDone, speak }) {
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const box = el('div', 'zsq-build');
  const slotRow = el('div', 'zsq-slots');
  const bank = el('div', 'zsq-bank');
  const slots = target.map(() => el('div', 'zsq-slot'));
  slots.forEach((sl, i) => sl.setAttribute('aria-label', `Slot ${i + 1} of ${target.length}`));
  slotRow.append(...slots);
  const btns = tiles.map((label) => {
    const b = el('button', 'zsq-btile', label);
    b.dataset.label = label;
    b.addEventListener('animationend', () => b.classList.remove('zsq-wiggle'));
    return b;
  });
  bank.append(...btns);
  const undoBtn = el('button', 'zsq-bundo', '↶ Undo');
  const clearBtn = el('button', 'zsq-bundo', '✖ Clear');
  const ctl = el('div', 'zsq-bctl');
  ctl.append(undoBtn, clearBtn);
  box.append(slotRow, bank, ctl);
  const placed = []; // { label, btn }
  let wrongs = 0, streak = 0, finished = false;
  const glow = () => {
    btns.forEach((b) => b.classList.remove('zsq-hintglow'));
    if (streak < 2 || finished) return;
    const want = target[placed.length];
    const b = btns.find((x) => !x.disabled && x.dataset.label === want);
    if (b) b.classList.add('zsq-hintglow');
  };
  const paint = () => {
    slots.forEach((sl, i) => {
      sl.textContent = placed[i] ? placed[i].label : '';
      sl.classList.toggle('zsq-filled', !!placed[i]);
      sl.classList.toggle('zsq-next', !finished && i === placed.length);
    });
    undoBtn.disabled = clearBtn.disabled = finished || !placed.length;
    glow();
  };
  btns.forEach((b) => {
    b.onclick = () => {
      if (finished || b.disabled) return;
      const label = b.dataset.label;
      if (label !== target[placed.length]) {
        wrongs++; streak++;
        SoundFX.pop();
        if (!calm) { b.classList.remove('zsq-wiggle'); void b.offsetWidth; b.classList.add('zsq-wiggle'); }
        glow();
        if (typeof onWrong === 'function') onWrong({ tile: label, index: placed.length, wrongs });
        return;
      }
      streak = 0;
      b.disabled = true;
      placed.push({ label, btn: b });
      if (typeof speak === 'function') speak(label);
      else SoundFX.pop();
      if (placed.length === target.length) {
        finished = true;
        btns.forEach((x) => { x.disabled = true; x.classList.remove('zsq-hintglow'); });
        paint();
        if (typeof onDone === 'function') onDone(placed.map((p) => p.label));
        return;
      }
      paint();
    };
  });
  const undo = () => {
    if (finished || !placed.length) return;
    placed.pop().btn.disabled = false;
    streak = 0;
    paint();
  };
  const clear = () => {
    if (finished) return;
    while (placed.length) placed.pop().btn.disabled = false;
    streak = 0;
    paint();
  };
  undoBtn.onclick = () => { SoundFX.pop(); undo(); };
  clearBtn.onclick = () => { SoundFX.pop(); clear(); };
  box.undo = undo; box.clear = clear;
  box.placed = () => placed.map((p) => p.label);
  box.wrongs = () => wrongs;
  paint();
  return box;
}
// Sorting bins (Rapunzel): one picture at a time into Living / Not living. Wrong bin = gentle hint,
// the item stays; onEvent('__sortwrong', hint) per wrong tap, '__sortdone' when all are sorted.
const _an = (n) => (/^[aeiou]/.test(n) ? 'an' : 'a');
const _itemLine = (i) => `${_an(i.name) === 'an' ? 'An' : 'A'} ${i.name}.`;
function _sortBins(items, pid, prompt, onEvent) {
  const wrap = el('div', 'zsq-sort');
  const card = el('div', 'zsq-sort-card');
  const pic = el('div', 'zsq-sort-pic');
  const nm = el('div', 'zsq-sort-name');
  const cnt = el('div', 'zsq-sort-count');
  card.append(pic, nm, cnt);
  const bins = el('div', 'zsq-bins');
  const mk = (living, label, cls) => {
    const b = el('button', `zsq-bin ${cls}`);
    b.append(el('div', 'zsq-bin-label', label));
    const tally = el('div', 'zsq-bin-tally');
    b.append(tally);
    b.dataset.living = living ? '1' : '0';
    return { b, tally };
  };
  const L = mk(true, '🌱 Living', 'zsq-bin-yes'), N = mk(false, '🪨 Not living', 'zsq-bin-no');
  bins.append(L.b, N.b);
  const hint = el('div', 'zsq-sort-hint');
  hint.setAttribute('aria-live', 'polite');
  wrap.append(card, bins, hint);
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let idx = 0, busy = false;
  const say = (t) => { _els._lastLine = { princessId: pid || null, text: `${prompt} ${t}` }; };
  const show1 = (speak) => {
    const it = items[idx];
    pic.textContent = it.pic;
    nm.textContent = it.name;
    cnt.textContent = `${idx + 1} of ${items.length}`;
    card.className = 'zsq-sort-card';
    card.style.transform = '';
    card.style.opacity = '';
    hint.textContent = '';
    say(_itemLine(it));
    if (speak) Narrator.speakExact(pid || 'rapunzel', _itemLine(it));
  };
  [L, N].forEach(({ b }) => {
    b.onclick = () => {
      if (busy || idx >= items.length) return;
      const it = items[idx];
      const living = b.dataset.living === '1';
      if (living !== it.living) {
        SoundFX.pop();
        const h = it.living ? `Good try! ${_an(it.name) === 'an' ? 'An' : 'A'} ${it.name} needs water to grow. Is it living?`
          : `Good try! Does ${_an(it.name)} ${it.name} need water to grow?`;
        hint.textContent = h;
        say(h);
        onEvent('__sortwrong', h);
        return;
      }
      busy = true;
      SoundFX.pop();
      hint.textContent = '';
      const side = living ? L : N;
      if (!calm) {
        card.style.transform = `translate(${living ? '-26vw' : '26vw'}, 110px) scale(.3)`;
        card.style.opacity = '0';
      }
      setTimeout(() => {
        side.tally.textContent += it.pic;
        idx++;
        busy = false;
        if (idx >= items.length) {
          L.b.disabled = N.b.disabled = true;
          card.style.visibility = 'hidden';
          onEvent('__sortdone');
        } else show1(true);
      }, calm ? 150 : 380);
    };
  });
  show1(false);
  wrap.firstItemLine = _itemLine(items[0]);
  return wrap;
}
const ZOE_PORTRAIT = PORTRAIT_ZOE;

let _root = null;
let _els = {};
let _hooks = {};
let _joyHandlers = null;
let _roamUI = false; // true while freely roaming (joystick visible on touch)

const PARENT_HTML = (typeof PARENT_CORNER_HTML === 'string' && PARENT_CORNER_HTML)
  ? PARENT_CORNER_HTML
  : '<div class="zsq-parent-fallback"><h2>Parent Corner</h2><p>No parent content is available right now.</p></div>';

function el(tag, cls, html) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html != null) d.innerHTML = html;
  return d;
}

// hide() fades the node out (pointer-events off) before display:none; show() cancels a pending hide.
const _hideTimers = new WeakMap();
function hide(node) {
  if (!node || node.classList.contains('zsq-hidden') || _hideTimers.has(node)) return;
  node.classList.add('zsq-leaving');
  node.inert = true; // no taps, keys or focus while it fades
  _hideTimers.set(node, setTimeout(() => {
    _hideTimers.delete(node);
    node.inert = false;
    node.classList.remove('zsq-leaving');
    node.classList.add('zsq-hidden');
  }, 180));
}
function show(node) {
  if (!node) return;
  clearTimeout(_hideTimers.get(node));
  _hideTimers.delete(node);
  node.inert = false;
  node.classList.remove('zsq-leaving', 'zsq-hidden');
}

function injectCSS() {
  if (document.getElementById('zsq-style')) return;
  const s = document.createElement('style');
  s.id = 'zsq-style';
  s.textContent = `
  .zsq-hidden { display: none !important; }
  .zsq-leaving { pointer-events: none !important; animation: zsq-fade-out .18s ease-in forwards !important; }
  #zsq-ui, #zsq-ui * { box-sizing: border-box; font-family: 'Nunito', 'Comic Sans MS', system-ui, sans-serif; }
  #zsq-ui { position: fixed; inset: 0; pointer-events: none; z-index: 50; }
  #zsq-ui button { touch-action: manipulation; }

  /* ---------- top bar ---------- */
  .zsq-topbar { position: absolute; top: 0; left: 0; right: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; padding-top: calc(12px + env(safe-area-inset-top, 0px));
    pointer-events: none; }
  .zsq-pill { pointer-events: auto; background: rgba(255,255,255,.92);
    border: 3px solid ${GOLD}; border-radius: 999px; padding: 10px 20px;
    font-weight: 800; font-size: 20px; color: #475569;
    box-shadow: 0 4px 14px rgba(31,41,55,.12); min-height: 56px;
    display: flex; align-items: center; white-space: nowrap; }
  /* Land shards: filled gems for restored lands, faded outlines for the rest. */
  .zsq-shards { display: inline-flex; gap: 6px; align-items: center; }
  .zsq-shard { font-size: 22px; line-height: 1; color: #d9a400; }
  .zsq-shard.zsq-off { color: #94a3b8; opacity: .5; }
  .zsq-topright { display: flex; gap: 10px; align-items: center; pointer-events: auto; align-self: flex-start; }
  .zsq-stars { background: rgba(255,255,255,.92); border: 3px solid ${GOLD};
    border-radius: 999px; padding: 10px 18px; font-weight: 900; font-size: 22px;
    color: #92400e; min-height: 56px; display: flex; align-items: center; gap: 6px;
    white-space: nowrap; box-shadow: 0 4px 14px rgba(31,41,55,.12); transition: transform .25s ease; }
  .zsq-stars.zsq-bump { transform: scale(1.18); }
  .zsq-topleft { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; align-self: flex-start; }
  .zsq-finds { pointer-events: none; background: rgba(255,255,255,.92); border: 3px solid ${GOLD}; border-radius: 999px;
    padding: 2px 10px; font-weight: 800; font-size: 15px; color: #92400e; white-space: nowrap; min-height: 30px;
    display: flex; align-items: center; box-shadow: 0 4px 14px rgba(31,41,55,.12); box-sizing: border-box; }
  .zsq-iconbtn { width: 56px; height: 56px; border-radius: 50%; border: 3px solid ${GOLD};
    background: rgba(255,255,255,.94); font-size: 26px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 14px rgba(31,41,55,.12); transition: transform .12s ease; }
  .zsq-iconbtn:active { transform: scale(.92); }

  /* ---------- dialogue sheet ---------- */
  .zsq-sheet { position: absolute; left: max(16px, env(safe-area-inset-left, 0px)); right: max(16px, env(safe-area-inset-right, 0px));
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    pointer-events: auto; background: linear-gradient(135deg, #fdfcfe 0%, #f4faeb 60%, #e6f7ff 100%);
    border: 4px solid ${GOLD}; border-radius: 24px; padding: 20px;
    box-shadow: 0 14px 40px rgba(31,41,55,.22); display: flex; gap: 16px; align-items: flex-start;
    max-height: 70vh; max-height: 70dvh; overflow-y: auto;
    animation: zsq-rise .25s ease-out; }
  .zsq-portrait { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; flex: none;
    border: 4px solid rgba(255,255,255,.9); outline: 3px solid ${GOLD};
    box-shadow: 0 8px 18px rgba(31,41,55,.2); background: #fff; }
  .zsq-portrait-fallback { width: 96px; height: 96px; border-radius: 50%; flex: none;
    border: 4px solid rgba(255,255,255,.9); outline: 3px solid ${GOLD};
    background: linear-gradient(135deg, #fde68a, #f9a8d4); font-size: 52px;
    display: flex; align-items: center; justify-content: center; }
  /* Zoe, on the right edge of the sheet: same portrait styling, smaller and dimmed so the princess keeps the focus. */
  .zsq-sheet .zsq-portrait-zoe { width: 52px; height: 52px; opacity: .75; box-shadow: none; }
  .zsq-sheet .zsq-portrait-zoe.zsq-portrait-fallback { font-size: 26px; }
  .zsq-dbody { flex: 1; min-width: 0; }
  .zsq-dname { font-weight: 900; font-size: 24px; margin-bottom: 6px; }
  .zsq-dtext { font-size: 24px; line-height: 1.5; color: #334155; font-weight: 600; }
  .zsq-drow { display: flex; gap: 12px; margin-top: 14px; align-items: center; }
  .zsq-next { min-height: 64px; padding: 12px 36px; border-radius: 20px; border: none;
    font-size: 22px; font-weight: 900; color: #fff; cursor: pointer;
    background: linear-gradient(135deg, #be185d, #9d174d);
    box-shadow: 0 6px 0 rgba(0,0,0,.12); transition: transform .12s ease; }
  .zsq-next:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,.12); }
  .zsq-replay { width: 64px; height: 64px; border-radius: 50%; border: 3px solid ${GOLD};
    background: #fff; font-size: 28px; cursor: pointer; flex: none; }

  /* ---------- challenge modal ---------- */
  .zsq-modal-wrap { position: absolute; inset: 0; pointer-events: auto;
    display: flex; align-items: center; justify-content: center;
    background: rgba(31,41,55,.35); padding: 20px;
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    padding-left: max(20px, env(safe-area-inset-left, 0px)); padding-right: max(20px, env(safe-area-inset-right, 0px));
    animation: zsq-rise .25s ease-out; }
  .zsq-modal { background: linear-gradient(135deg, #fdfcfe 0%, #f4faeb 60%, #e6f7ff 100%);
    border: 4px solid ${GOLD}; border-radius: 24px; padding: 28px;
    max-width: 640px; width: 100%; box-shadow: 0 18px 50px rgba(31,41,55,.3);
    text-align: center; max-height: 92vh; max-height: 92dvh; overflow-y: auto; position: relative; }
  .zsq-chead { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .zsq-chead .zsq-portrait, .zsq-chead .zsq-portrait-fallback { width: 60px; height: 60px; font-size: 30px; border-width: 3px; }
  .zsq-kicker { flex: 1; min-width: 0; font-size: 18px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
    color: #92400e; }
  .zsq-dots { display: flex; justify-content: center; gap: 6px; margin-top: 6px; }
  .zsq-dots span { width: 10px; height: 10px; border-radius: 50%; border: 2px solid ${GOLD}; background: #fff; }
  .zsq-dots span.zsq-on { background: ${GOLD}; }
  .zsq-prompt { font-size: 30px; font-weight: 900; color: #334155; margin-bottom: 8px; line-height: 1.3; }
  .zsq-visual { margin: 12px 0; display: flex; justify-content: center; }
  .zsq-choices { display: flex; flex-direction: column; gap: 14px; margin-top: 18px; }
  .zsq-choice { min-height: 72px; border-radius: 20px; border: 4px solid ${GOLD};
    background: #fff; font-size: 30px; font-weight: 900; color: #334155; cursor: pointer;
    padding: 14px 20px; box-shadow: 0 6px 0 rgba(0,0,0,.08); transition: transform .12s ease; }
  .zsq-choice:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,.08); }
  .zsq-choice.zsq-correct { background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    border-color: #34c779; color: #065f46; animation: zsq-rise .25s ease-out; }
  .zsq-choice.zsq-wrong-pick { border-color: #f9a8d4; background: #fdf2f8; color: #9d174d;
    animation: zsq-soft-miss .3s ease-out forwards; }
  .zsq-bigword { font-size: 56px; font-weight: 900; color: #5b21b6; letter-spacing: 6px; margin: 6px 0 2px; line-height: 1.1; }
  .zsq-build { margin-top: 10px; }
  .zsq-slots { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .zsq-slot { min-width: 52px; height: 64px; padding: 0 6px; box-sizing: border-box; border-radius: 16px; border: 4px dashed #c4b5fd;
    background: #faf8ff; font-size: 40px; font-weight: 900; color: #5b21b6; display: flex; align-items: center; justify-content: center; }
  .zsq-slot.zsq-next { border-color: ${GOLD}; background: #fffbea; }
  .zsq-slot.zsq-filled { border-style: solid; border-color: #34c779; background: #ecfdf5; color: #065f46; }
  .zsq-bank { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; }
  .zsq-btile { min-width: 64px; min-height: 68px; padding: 0 10px; border-radius: 20px; border: 4px solid #c4b5fd; background: #f5f3ff;
    font-size: 40px; font-weight: 900; color: #5b21b6; cursor: pointer; box-shadow: 0 6px 0 rgba(0,0,0,.08); }
  .zsq-btile:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,.08); }
  .zsq-btile:disabled { opacity: .25; cursor: default; box-shadow: none; }
  .zsq-btile.zsq-hintglow { border-color: ${GOLD}; background: #fde68a; animation: zsq-glow 1s ease-in-out infinite; }
  .zsq-btile.zsq-wiggle { animation: zsq-wiggle .4s ease-in-out; border-color: #f9a8d4; background: #fdf2f8; }
  .zsq-words .zsq-slots { gap: 6px; align-items: center; }
  .zsq-words .zsq-slot { min-width: 44px; height: 58px; font-size: 26px; padding: 0 8px; border-width: 3px; }
  .zsq-words .zsq-bank { gap: 10px; }
  .zsq-words .zsq-btile { min-width: 56px; min-height: 60px; font-size: 28px; padding: 0 12px; }
  .zsq-slotpair { display: flex; align-items: center; gap: 4px; }
  .zsq-endmark { font-size: 34px; font-weight: 900; color: #5b21b6; padding: 0 2px; }
  .zsq-choice.zsq-long { font-size: 24px; line-height: 1.25; }
  .zsq-bctl { display: flex; justify-content: center; gap: 12px; margin-top: 16px; }
  .zsq-bundo { min-height: 56px; min-width: 110px; padding: 8px 18px; border-radius: 20px; border: 4px solid #f9a8d4; background: #fdf2f8;
    font-size: 22px; font-weight: 900; color: #9d174d; cursor: pointer; }
  .zsq-bundo:disabled { opacity: .4; cursor: default; }
  @keyframes zsq-wiggle { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-9px); } 40% { transform: translateX(9px); }
    60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
  @keyframes zsq-glow { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
  .zsq-tiles { display: flex; justify-content: center; gap: 14px; margin-top: 12px; }
  .zsq-tile { width: 76px; min-height: 76px; border-radius: 20px; border: 4px solid #c4b5fd; background: #f5f3ff;
    font-size: 44px; font-weight: 900; color: #5b21b6; cursor: pointer; padding: 0;
    box-shadow: 0 6px 0 rgba(0,0,0,.08); transition: transform .12s ease, background .12s ease; }
  .zsq-tile.zsq-on { background: #fde68a; border-color: ${GOLD}; transform: scale(1.12); }
  .zsq-blend { display: block; min-height: 56px; margin: 12px auto 0; padding: 8px 28px; border-radius: 20px;
    border: 4px solid #f9a8d4; background: #fdf2f8; font-size: 24px; font-weight: 900; color: #9d174d;
    cursor: pointer; box-shadow: 0 6px 0 rgba(0,0,0,.08); }
  .zsq-sort-card { text-align: center; margin-top: 8px; transition: transform .35s ease, opacity .35s ease; }
  .zsq-sort-pic { font-size: 72px; line-height: 1.1; }
  .zsq-sort-name { font-size: 28px; font-weight: 900; color: #3b1f04; }
  .zsq-sort-count { font-size: 16px; font-weight: 700; color: #64748b; }
  .zsq-bins { display: flex; gap: 12px; margin-top: 12px; }
  .zsq-bin { flex: 1 1 0; min-width: 0; min-height: 96px; border-radius: 20px; border: 4px solid; padding: 8px 6px;
    font-family: inherit; cursor: pointer; box-shadow: 0 6px 0 rgba(0,0,0,.08); }
  .zsq-bin-yes { background: #d1fae5; border-color: #34c779; color: #065f46; }
  .zsq-bin-no { background: #f1f5f9; border-color: #94a3b8; color: #334155; }
  .zsq-bin:disabled { opacity: .85; cursor: default; }
  .zsq-bin-label { font-size: 22px; font-weight: 900; }
  .zsq-bin-tally { font-size: 20px; line-height: 1.2; min-height: 24px; word-break: break-all; }
  .zsq-sort-hint { font-size: 20px; font-weight: 700; color: #9d174d; margin-top: 12px; text-align: center; min-height: 28px; }
  @media (prefers-reduced-motion: reduce) { .zsq-sort-card { transition: none; } }
  .zsq-answer-msg { font-size: 24px; font-weight: 700; color: #475569; margin: 16px 0 4px; line-height: 1.45; }
  .zsq-modal-replay { width: 56px; height: 56px; flex: none; }

  /* ---------- interact prompt ---------- */
  /* Docked bottom-centre. Centred with auto margins, not transform, so the bob keyframes don't cancel it. */
  .zsq-interact { position: absolute; left: 0; right: 0; margin: 0 auto; width: max-content; bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    pointer-events: none; background: rgba(255,255,255,.96); border: 3px solid ${GOLD};
    border-radius: 999px; padding: 14px 28px; font-size: 22px; font-weight: 900; color: #92400e;
    box-shadow: 0 8px 24px rgba(31,41,55,.2); animation: zsq-bob 3s ease-in-out 3; white-space: nowrap; }

  /* ---------- toast ---------- */
  .zsq-toasts { position: absolute; top: 84px; left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; width: max-content; max-width: 92vw; }
  .zsq-toast { background: #fffbeb; color: #3b1f04; border: 3px solid #f5c542; border-radius: 24px; padding: 12px 26px;
    font-size: 24px; font-weight: 700; white-space: normal; text-align: center;
    box-shadow: 0 8px 24px rgba(146,64,14,.2);
    animation: zsq-rise .25s ease-out; }

  /* ---------- celebration ---------- */
  .zsq-celebrate { position: absolute; inset: 0; pointer-events: auto;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
    background: linear-gradient(135deg, #fdf4ff 0%, #fef9c3 55%, #e0f2fe 100%);
    border-radius: 0; text-align: center; padding: 32px;
    padding-bottom: max(32px, env(safe-area-inset-bottom, 0px));
    padding-left: max(32px, env(safe-area-inset-left, 0px)); padding-right: max(32px, env(safe-area-inset-right, 0px));
    animation: zsq-rise .25s ease-out; }
  .zsq-bigstars { font-size: 84px; animation: zsq-bob 3s ease-in-out 3; letter-spacing: 8px; }
  .zsq-cel-title { font-size: 44px; font-weight: 900; color: #92400e; line-height: 1.15; }
  .zsq-cel-sub { font-size: 24px; font-weight: 700; color: #475569; max-width: 560px; line-height: 1.5; }
  .zsq-bigbtn { min-height: 72px; padding: 16px 56px; border-radius: 24px; border: none;
    font-size: 28px; font-weight: 900; color: #3b1f04; cursor: pointer;
    background: linear-gradient(135deg, #fcd34d, #fbbf24);
    box-shadow: 0 8px 0 rgba(0,0,0,.12); transition: transform .12s ease; }
  .zsq-bigbtn:active { transform: translateY(6px); box-shadow: 0 2px 0 rgba(0,0,0,.12); }

  /* ---------- finale ---------- */
  .zsq-finale { position: absolute; inset: 0; pointer-events: auto;
    background: linear-gradient(160deg, #1e1b4b 0%, #4c1d95 45%, #831843 100%);
    display: flex; align-items: center; justify-content: center; padding: 24px;
    padding-bottom: max(24px, env(safe-area-inset-bottom, 0px));
    padding-left: max(24px, env(safe-area-inset-left, 0px)); padding-right: max(24px, env(safe-area-inset-right, 0px)); }
  .zsq-finale-card { background: rgba(255,255,255,.97); border: 5px solid ${GOLD};
    border-radius: 28px; padding: 36px; max-width: 680px; width: 100%; text-align: center;
    box-shadow: 0 24px 70px rgba(0,0,0,.45); animation: zsq-rise .25s ease-out; }
  .zsq-finale h2 { font-size: 38px; font-weight: 900; color: #92400e; margin: 0 0 12px; }
  .zsq-finale-line { font-size: 24px; font-weight: 700; color: #475569; line-height: 1.55; margin: 10px 0; }

  /* ---------- parent corner ---------- */
  .zsq-parent-wrap { position: absolute; inset: 0; pointer-events: auto;
    display: flex; align-items: center; justify-content: center;
    background: rgba(15,23,42,.5); padding: 20px; }
  .zsq-parent { background: rgba(255,255,255,.98); border: 3px solid rgba(148,163,184,.5);
    border-radius: 20px; max-width: 720px; width: 100%; max-height: 88vh; max-height: 88dvh;
    display: flex; flex-direction: column; box-shadow: 0 18px 50px rgba(15,23,42,.35); }
  .zsq-parent-head { display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-bottom: 1px solid rgba(148,163,184,.35); }
  .zsq-parent-head h2 { margin: 0; font-size: 24px; color: #0f172a; }
  .zsq-parent-body { overflow-y: auto; padding: 20px; color: #334155; font-size: 17px; line-height: 1.6; }
  .zsq-parent-body h2, .zsq-parent-body h3 { color: #0f172a; }
  .zsq-prog { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid rgba(148,163,184,.4); }
  .zsq-prog h3 { margin: 0 0 6px; }
  .zsq-prog table { width: 100%; border-collapse: collapse; font-size: 15px; line-height: 1.3; }
  .zsq-prog th { text-align: left; color: #64748b; font-weight: 600; padding: 4px 4px; }
  .zsq-prog td { padding: 6px 4px; border-top: 1px solid rgba(148,163,184,.3); vertical-align: top; }
  .zsq-prog small { display: block; color: #64748b; }
  .zsq-words { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid rgba(148,163,184,.4); }
  .zsq-words h3 { margin: 0 0 6px; }
  .zsq-words input { width: 100%; box-sizing: border-box; min-height: 56px; font-size: 18px; padding: 10px 14px;
    border-radius: 14px; border: 2px solid #94a3b8; color: #0f172a; background: #fff; }
  .zsq-words .zsq-wrow { display: flex; gap: 12px; margin: 10px 0; }
  .zsq-words .zsq-wrow button { flex: 1; min-height: 56px; border-radius: 14px; border: none; font-size: 20px;
    font-weight: 800; cursor: pointer; background: #0f172a; color: #fff; }
  .zsq-words .zsq-wrow button.zsq-wsave { background: #16a34a; }
  .zsq-words .zsq-wlab { display: block; margin: 10px 0 4px; font-size: 15px; font-weight: 700; }
  .zsq-words .zsq-wstat { margin: 0; font-size: 15px; line-height: 1.4; }
  .zsq-close { min-width: 64px; min-height: 56px; border-radius: 14px; border: none;
    background: #0f172a; color: #fff; font-size: 20px; font-weight: 800; cursor: pointer; padding: 10px 22px; }

  /* ---------- title screen ---------- */
  .zsq-title { position: absolute; inset: 0; pointer-events: auto;
    background: linear-gradient(160deg, #fdf4ff 0%, #fef3c7 40%, #e0f2fe 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 22px; padding: 32px; text-align: center; }
  .zsq-logo { font-size: clamp(44px, 9vw, 96px); font-weight: 900; line-height: 1.05;
    color: #92400e; text-shadow: 3px 3px 0 ${GOLD}, 8px 8px 24px rgba(180,83,9,.25);
    animation: zsq-bob 3s ease-in-out infinite; }
  .zsq-logo .zsq-sparkle { display: inline-block; animation: zsq-twinkle 1.6s ease-in-out infinite; }
  .zsq-tagline { font-size: clamp(20px, 3.5vw, 30px); font-weight: 700; color: #475569; max-width: 600px; line-height: 1.5; }
  .zsq-zoe-hero { width: 150px; height: 150px; border-radius: 32px; object-fit: cover;
    border: 5px solid #fff; outline: 4px solid ${GOLD};
    box-shadow: 0 14px 34px rgba(31,41,55,.25); }

  /* ---------- joystick ---------- */
  .zsq-joy { position: absolute; left: max(24px, env(safe-area-inset-left, 0px)); bottom: calc(24px + env(safe-area-inset-bottom, 0px)); width: 148px; height: 148px;
    border-radius: 50%; background: rgba(255,255,255,.35); border: 3px solid rgba(255,255,255,.7);
    box-shadow: 0 8px 24px rgba(31,41,55,.18); pointer-events: auto; touch-action: none; }
  .zsq-joy-knob { position: absolute; left: 50%; top: 50%; width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg, #fde68a, #fbbf24); border: 3px solid ${GOLD};
    transform: translate(-50%, -50%); box-shadow: 0 4px 12px rgba(31,41,55,.25); }
  @media (pointer: fine) { .zsq-joy { display: none; } }

  /* ---------- tutorial ---------- */
  .zsq-tutorial { position: absolute; inset: 0; pointer-events: auto;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    padding-left: max(20px, env(safe-area-inset-left, 0px)); padding-right: max(20px, env(safe-area-inset-right, 0px));
    background: linear-gradient(160deg, #fdf4ff 0%, #fef3c7 45%, #e0f2fe 100%);
    animation: zsq-rise .25s ease-out; }
  .zsq-tut-card { background: rgba(255,255,255,.97); border: 4px solid ${GOLD};
    border-radius: 28px; padding: 36px 32px; max-width: 620px; width: 100%;
    text-align: center; box-shadow: 0 18px 50px rgba(31,41,55,.25);
    max-height: 92vh; max-height: 92dvh; overflow-y: auto; }
  .zsq-tut-emoji { font-size: 76px; margin-bottom: 10px; animation: zsq-bob 3s ease-in-out 3; }
  .zsq-tut-title { font-size: 36px; font-weight: 900; color: #92400e; margin-bottom: 12px; line-height: 1.15; }
  .zsq-tut-text { font-size: 24px; font-weight: 700; color: #475569; line-height: 1.5; margin-bottom: 8px; }
  .zsq-tut-row { display: flex; gap: 14px; justify-content: center; align-items: center;
    margin-top: 22px; flex-wrap: wrap; }
  .zsq-skip { min-height: 44px; padding: 8px 16px; border-radius: 24px; cursor: pointer;
    font-size: 18px; font-weight: 700; color: #475569; background: transparent;
    border: none; box-shadow: none; text-decoration: underline; text-underline-offset: 4px;
    transition: transform .12s ease; }
  .zsq-skip:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,.08); }

  /* ---------- pause menu ---------- */
  .zsq-pause-wrap { position: absolute; inset: 0; pointer-events: auto;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    padding-left: max(20px, env(safe-area-inset-left, 0px)); padding-right: max(20px, env(safe-area-inset-right, 0px));
    background: rgba(31,41,55,.45); animation: zsq-rise .25s ease-out; }
  .zsq-pause-card { background: rgba(255,255,255,.98); border: 4px solid ${GOLD};
    border-radius: 28px; padding: 36px 32px; max-width: 560px; width: 100%;
    text-align: center; box-shadow: 0 18px 50px rgba(31,41,55,.4);
    max-height: 92vh; max-height: 92dvh; overflow-y: auto; }
  .zsq-howto { color: #fff; background: linear-gradient(135deg, #1d4ed8, #1e40af); }

  /* ---------- treasure book ---------- */
  .zsq-pause-card.zsq-tb-card { padding: 18px 16px; }
  .zsq-tb-card .zsq-tut-emoji { font-size: 44px; margin-bottom: 0; }
  .zsq-tb-card .zsq-tut-title { font-size: 30px; margin-bottom: 4px; }
  .zsq-tb-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin: 8px 0 0; }
  .zsq-tb-tile { grid-column: span 2; background: #fff7e0; border: 3px solid ${GOLD}; border-radius: 20px; padding: 8px 2px; min-height: 92px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; }
  .zsq-tb-tile:nth-child(4) { grid-column: 2 / span 2; }
  .zsq-tb-emoji { font-size: 40px; line-height: 1.1; }
  .zsq-tb-name { font-size: 17px; font-weight: 900; color: #92400e; }
  .zsq-tb-unfound { background: #f1f5f9; border-color: #cbd5e1; }
  .zsq-tb-unfound .zsq-tb-emoji { filter: grayscale(1) brightness(0) opacity(.22); }
  .zsq-tb-unfound .zsq-tb-name { color: #64748b; font-size: 22px; }
  .zsq-tb-h { font-size: 22px; font-weight: 900; color: #92400e; margin: 12px 0 2px; }
  .zsq-tb-land { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 40px; text-align: left;
    font-size: 16px; font-weight: 800; color: #334155; }
  .zsq-tb-dots { display: flex; gap: 5px; flex-shrink: 0; }
  .zsq-tb-dot { width: 18px; height: 18px; border-radius: 50%; border: 3px solid ${GOLD}; background: #fff; box-sizing: border-box; }
  .zsq-tb-dot.zsq-on { background: ${GOLD}; }
  .zsq-tb-stickers { display: flex; gap: 8px; justify-content: center; margin-top: 4px; }
  .zsq-tb-sticker { width: 56px; height: 56px; border-radius: 16px; border: 3px solid ${GOLD}; background: #fff7e0; display: flex;
    align-items: center; justify-content: center; font-size: 30px; font-weight: 900; box-sizing: border-box; }
  .zsq-tb-sticker.zsq-tb-unfound { background: #f1f5f9; border-color: #cbd5e1; color: #64748b; font-size: 26px; }
  .zsq-tb-total { font-size: 22px; font-weight: 900; color: #1e40af; margin-top: 10px; }
  .zsq-tb-card .zsq-tut-row { margin-top: 12px; }

  /* ---------- wardrobe ---------- */
  .zsq-wd-row { margin: 14px 0 0; text-align: left; }
  .zsq-wd-name { font-size: 22px; font-weight: 900; color: #92400e; margin-bottom: 8px; }
  .zsq-wd-swatches { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .zsq-swatch { width: 64px; height: 64px; border-radius: 50%; border: 4px solid #fff; cursor: pointer;
    box-shadow: 0 0 0 3px #cbd5e1, 0 4px 0 rgba(0,0,0,.12); font-size: 26px; line-height: 1; padding: 0;
    display: flex; align-items: center; justify-content: center; }
  .zsq-swatch.zsq-on { box-shadow: 0 0 0 5px ${GOLD}, 0 4px 0 rgba(0,0,0,.12); }
  .zsq-swatch-txt { background: #f1f5f9; color: #334155; font-size: 16px; font-weight: 800; }
  .zsq-wd-locked { opacity: .55; filter: grayscale(1); }
  .zsq-wd-locked .zsq-wd-need { font-size: 18px; font-weight: 800; color: #475569; }

  /* ---------- responsive: phones ---------- */
  @media (max-width: 480px) {
    .zsq-topbar { padding: 8px 10px; }
    /* Quest label wraps to two lines instead of being cut off. */
    .zsq-pill { min-height: 48px; max-width: calc(100vw - 222px); overflow: visible;
      text-overflow: clip; white-space: normal; line-height: 1.15; font-size: 14px; padding: 6px 8px; }
    .zsq-shards { gap: 2px; }
    .zsq-shard { font-size: 14px; }
    .zsq-stars { font-size: 17px; padding: 6px 8px; min-height: 48px; }
    .zsq-finds { font-size: 13px; padding: 1px 8px; border-width: 2px; min-height: 26px; }
    .zsq-iconbtn { width: 44px; height: 44px; font-size: 21px; }
    .zsq-toasts { top: 70px; }
    .zsq-toast { padding: 10px 20px; }
    /* Sits just above the 124px joystick (top at 140px). */
    .zsq-interact { font-size: 18px; padding: 10px 20px; bottom: calc(148px + env(safe-area-inset-bottom, 0px)); max-width: 92vw; white-space: normal; text-align: center; }
    .zsq-sheet { left: max(10px, env(safe-area-inset-left, 0px)); right: max(10px, env(safe-area-inset-right, 0px));
      bottom: calc(10px + env(safe-area-inset-bottom, 0px)); padding: 12px; gap: 10px;
      max-height: 64vh; max-height: 64dvh; overflow-y: auto; }
    .zsq-portrait, .zsq-portrait-fallback { width: 64px; height: 64px; }
    .zsq-portrait-fallback { font-size: 34px; }
    .zsq-sheet .zsq-portrait-zoe { width: 48px; height: 48px; }
    .zsq-sheet .zsq-portrait-zoe.zsq-portrait-fallback { font-size: 25px; }
    .zsq-dname { font-size: 20px; }
    .zsq-next { min-height: 60px; font-size: 19px; padding: 10px 26px; }
    .zsq-replay { width: 56px; height: 56px; font-size: 24px; }
    .zsq-modal { padding: 18px; }
    .zsq-prompt { font-size: 26px; }
    .zsq-choice { min-height: 64px; font-size: 26px; padding: 12px 14px; }
    .zsq-joy { width: 124px; height: 124px; left: max(16px, env(safe-area-inset-left, 0px)); bottom: calc(16px + env(safe-area-inset-bottom, 0px)); }
    .zsq-cel-title { font-size: 32px; }
    .zsq-bigstars { font-size: 64px; }
    .zsq-bigbtn { font-size: 23px; padding: 14px 40px; }
    .zsq-tut-card, .zsq-pause-card { padding: 24px 20px; }
    .zsq-tut-emoji { font-size: 60px; }
    .zsq-tut-title { font-size: 28px; }
    .zsq-skip { font-size: 17px; padding: 8px 12px; }
    .zsq-finale-card { padding: 24px 20px; }
    .zsq-finale h2 { font-size: 30px; }
    .zsq-modal-replay { width: 48px; height: 48px; font-size: 22px; }
    .zsq-chead { gap: 8px; }
    .zsq-chead .zsq-portrait, .zsq-chead .zsq-portrait-fallback { width: 56px; height: 56px; font-size: 28px; }
    .zsq-kicker { font-size: 14px; letter-spacing: 1px; }
    .zsq-topright { gap: 6px; }
  }

  /* Narrowest phones (320px): both portraits still leave the text column at 60% of the sheet or more. */
  @media (max-width: 360px) {
    .zsq-sheet { padding: 10px; gap: 8px; }
    .zsq-sheet > :first-child { width: 52px; height: 52px; }
    .zsq-sheet > :first-child.zsq-portrait-fallback { font-size: 28px; }
    .zsq-sheet .zsq-portrait-zoe { width: 40px; height: 40px; }
    .zsq-sheet .zsq-portrait-zoe.zsq-portrait-fallback { font-size: 21px; }
    .zsq-drow { gap: 8px; }
    .zsq-next { padding: 10px 14px; white-space: nowrap; }
  }

  /* Taller touch screens wider than phones: the 148px joystick reaches 172px up, so lift the bubble above it. */
  @media (pointer: coarse) and (min-width: 481px) and (min-height: 501px) {
    .zsq-interact { bottom: calc(196px + env(safe-area-inset-bottom, 0px)); }
  }
  /* Landscape phones: too short to lift the bubble, so centre it in the space right of the joystick. */
  @media (pointer: coarse) and (min-width: 481px) and (max-height: 500px) {
    .zsq-interact { left: calc(max(24px, env(safe-area-inset-left, 0px)) + 160px); right: max(16px, env(safe-area-inset-right, 0px));
      width: fit-content; font-size: 20px; padding: 10px 22px; white-space: normal; text-align: center; }
  }

  /* ---------- responsive: short screens (landscape phones) ---------- */
  @media (max-height: 500px) {
    .zsq-title { gap: 10px; padding: 16px; overflow-y: auto; justify-content: flex-start; }
    .zsq-zoe-hero { width: 96px; height: 96px; }
    .zsq-tut-card, .zsq-pause-card { max-height: 94vh; max-height: 94dvh; padding: 20px; }
    .zsq-tut-emoji { font-size: 52px; margin-bottom: 4px; }
  }

  /* Short screens: phones in landscape, small laptop windows. */
  @media (max-height: 560px) {
    .zsq-sheet { max-height: 78vh; max-height: 78dvh; padding: 12px 16px; }
    .zsq-portrait, .zsq-portrait-fallback { width: 64px; height: 64px; }
    .zsq-sheet .zsq-portrait-zoe { width: 40px; height: 40px; }
    .zsq-sheet .zsq-portrait-zoe.zsq-portrait-fallback { font-size: 21px; }
    .zsq-modal { max-height: 96vh; max-height: 96dvh; padding: 12px 16px; }
    .zsq-chead { margin-bottom: 2px; }
    .zsq-chead .zsq-portrait, .zsq-chead .zsq-portrait-fallback { width: 48px; height: 48px; font-size: 24px; }
    .zsq-modal-replay { width: 48px; height: 48px; font-size: 22px; }
    .zsq-kicker { font-size: 15px; }
    .zsq-dots { margin-top: 2px; }
    .zsq-prompt { font-size: 24px; margin-bottom: 2px; }
    .zsq-visual { margin: 4px 0; }
    .zsq-choices { flex-direction: row; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
    .zsq-choice { flex: 1 1 0; min-width: 120px; min-height: 60px; font-size: 24px; padding: 8px 10px; }
    .zsq-answer-msg { margin: 8px 0 2px; }
    .zsq-finale { align-items: flex-start; overflow-y: auto; padding: 10px;
      padding-bottom: max(10px, env(safe-area-inset-bottom, 0px));
      padding-left: max(10px, env(safe-area-inset-left, 0px)); padding-right: max(10px, env(safe-area-inset-right, 0px)); }
    .zsq-finale-card { max-height: none; padding: 14px 20px; }
    .zsq-finale h2 { font-size: 26px; margin-bottom: 4px; }
    .zsq-finale-line { margin: 4px 0; line-height: 1.3; }
    .zsq-celebrate { gap: 8px; padding: 12px; overflow-y: auto; justify-content: flex-start;
      padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
      padding-left: max(12px, env(safe-area-inset-left, 0px)); padding-right: max(12px, env(safe-area-inset-right, 0px)); }
    .zsq-bigstars { font-size: 48px; }
    .zsq-cel-title { font-size: 30px; }
    .zsq-bigbtn { min-height: 60px; padding: 10px 36px; font-size: 24px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #zsq-ui, #zsq-ui * { animation: none !important; transition: none !important; }
  }
  button:focus-visible { outline: 4px solid rgba(14, 165, 233, 0.55); outline-offset: 3px; }

  @keyframes zsq-rise { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes zsq-fade-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes zsq-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  /* A wrong pick settles down a little with a soft pink glow instead of shaking. */
  @keyframes zsq-soft-miss { from { transform: translateY(0); box-shadow: 0 6px 0 rgba(0,0,0,.08), 0 0 0 0 rgba(244,114,182,0); }
    to { transform: translateY(2px); box-shadow: 0 4px 0 rgba(0,0,0,.08), 0 0 0 4px rgba(244,114,182,.35); } }
  @keyframes zsq-twinkle { 0%,100% { transform: scale(1) rotate(0deg); opacity: 1; } 50% { transform: scale(1.35) rotate(18deg); opacity: .75; } }
  `;
  document.head.appendChild(s);
}

/* Speak a dialogue line entry (object or plain string). */
function _speakLine(entry, fallbackPrincess) {
  if (Narrator.muted) return;
  if (entry == null) return;
  if (typeof entry === 'string') {
    if (fallbackPrincess) Narrator.speak(fallbackPrincess, 'greeting', entry);
    else Narrator.speakText(entry);
    return;
  }
  const id = entry.princess || entry.princessId || fallbackPrincess;
  const kind = entry.kind || 'greeting';
  // exact: quest-specific text — TTS the words so audio always matches text.
  if (entry.exact && id) { Narrator.speakExact(id, entry.text || ''); return; }
  if (id) Narrator.speak(id, kind, entry.text || '');
  else Narrator.speakText(entry.text || '');
}

/* Circular portrait with graceful fallback to a crown emoji. */
function _makePortrait(src) {
  const holder = el('div');
  if (src) {
    const img = document.createElement('img');
    img.className = 'zsq-portrait';
    img.alt = '';
    img.onerror = () => {
      img.remove();
      holder.appendChild(el('div', 'zsq-portrait-fallback', '👑'));
    };
    img.src = src;
    holder.appendChild(img);
  } else {
    holder.appendChild(el('div', 'zsq-portrait-fallback', '👑'));
  }
  return holder.firstChild;
}

/* Tutorial steps, rebuilt on every render so the wording adapts live to the
 * currently connected controls (keyboard / touch / Bluetooth controller). */
function _tutorialSteps() {
  const c = Input.describeControls();
  let moveText, talkText;
  if (c.gamepad) {
    moveText = 'Push the LEFT STICK to walk Princess Zoe around the kingdom!';
    talkText = 'Walk up to a princess, then press ✕ (the Cross button) to say hello!';
  } else if (c.touch) {
    moveText = 'Drag the JOYSTICK to walk Princess Zoe around the kingdom!';
    talkText = 'Walk up to a princess and TAP her to say hello!';
  } else {
    moveText = 'Use WASD or the ARROW KEYS to walk Princess Zoe around the kingdom!';
    talkText = 'Walk up to a princess and CLICK her — or press E — to say hello!';
  }
  return [
    { emoji: '👑', title: 'Hi Princess Zoe!',
      text: 'Welcome to Starlight Quest! Let us take a quick tour first!' },
    { emoji: '🚶‍♀️', title: 'Walking', text: moveText },
    { emoji: '💬', title: 'Say hello', text: talkText },
    { emoji: '⭐', title: 'Win star shards',
      text: 'Answer the princesses\u2019 questions to win STAR SHARDS! Every right answer earns a star!' },
    { emoji: '💖', title: 'No wrong answers',
      text: 'There are no wrong answers here. If you miss one, just try again!' },
  ];
}

const NAME_COLORS = {
  '#3b82f6': '#1d4ed8', '#38bdf8': '#0369a1', '#34c779': '#166534',
  '#f59e0b': '#92400e', '#fbbf24': '#7c2d12',
};

export const UI = {
  /**
   * Build all DOM + CSS once.
   * hooks: { onMuteToggle(muted), onPause(), onParentCorner(), onStart() }
   */
  init(hooks = {}) {
    if (_root) { _hooks = { ..._hooks, ...hooks }; return; }
    _hooks = hooks || {};
    injectCSS();

    _root = el('div');
    _root.id = 'zsq-ui';
    document.body.appendChild(_root);

    // ---- top bar ----
    const topbar = el('div', 'zsq-topbar');
    const pill = el('div', 'zsq-pill', '✨ Starlight Quest');
    const right = el('div', 'zsq-topright');
    const stars = el('div', 'zsq-stars', '⭐ 0');
    const muteBtn = el('button', 'zsq-iconbtn', '🔊');
    muteBtn.setAttribute('aria-label', 'Mute or unmute voices');
    const parentBtn = el('button', 'zsq-iconbtn', '📊');
    parentBtn.setAttribute('aria-label', 'Open parent corner');
    const pauseBtn = el('button', 'zsq-iconbtn', '⏸️');
    pauseBtn.setAttribute('aria-label', 'Pause the game');
    muteBtn.onclick = () => {
      SoundFX.pop();
      if (typeof _hooks.onMuteToggle === 'function') _hooks.onMuteToggle();
    };
    parentBtn.onclick = () => { SoundFX.pop(); this.showParentGate(); };
    pauseBtn.onclick = () => { SoundFX.pop(); if (typeof _hooks.onPause === 'function') _hooks.onPause(); };
    right.append(stars, muteBtn, parentBtn, pauseBtn);
    const finds = el('div', 'zsq-finds', '🧺 0/20');
    finds.setAttribute('aria-label', 'Treasures found today');
    const left = el('div', 'zsq-topleft');
    left.append(pill, finds);
    topbar.append(left, right);
    _root.appendChild(topbar);

    // ---- dialogue sheet ----
    const sheet = el('div', 'zsq-sheet zsq-hidden');
    _root.appendChild(sheet);

    // ---- challenge ----
    const challengeWrap = el('div', 'zsq-modal-wrap zsq-hidden');
    _root.appendChild(challengeWrap);

    // ---- interact prompt ----
    const interact = el('div', 'zsq-interact zsq-hidden', 'Tap to talk ✨');
    _root.appendChild(interact);

    // ---- toasts ----
    const toasts = el('div', 'zsq-toasts');
    _root.appendChild(toasts);

    // ---- overlays ----
    const celebrate = el('div', 'zsq-celebrate zsq-hidden');
    _root.appendChild(celebrate);
    const finale = el('div', 'zsq-finale zsq-hidden');
    _root.appendChild(finale);
    const parentWrap = el('div', 'zsq-parent-wrap zsq-hidden');
    _root.appendChild(parentWrap);
    const title = el('div', 'zsq-title zsq-hidden');
    _root.appendChild(title);
    const tutorial = el('div', 'zsq-tutorial zsq-hidden');
    _root.appendChild(tutorial);
    const pauseWrap = el('div', 'zsq-pause-wrap zsq-hidden');
    _root.appendChild(pauseWrap);

    _els = { topbar, pill, finds, stars, muteBtn, sheet, challengeWrap, interact, toasts, celebrate, finale, parentWrap, title, tutorial, pauseWrap };
    this.setMuteUI(Narrator.muted, null);
  },

  /** Title screen with the big Start button. Start also unlocks audio. */
  showTitle(onStart) {
    const t = _els.title;
    t.innerHTML = '';
    const hero = document.createElement('img');
    hero.className = 'zsq-zoe-hero';
    hero.alt = 'Princess Zoe';
    hero.onerror = () => hero.remove();
    hero.src = ZOE_PORTRAIT;
    const logo = el('div', 'zsq-logo', '<span class="zsq-sparkle">✨</span> Zoe&rsquo;s Starlight Quest <span class="zsq-sparkle">✨</span>');
    const tag = el('div', 'zsq-tagline', 'Help the princesses find their lost starlight shards across four magical lands!');
    const start = el('button', 'zsq-bigbtn', '▶ Start Adventure');
    start.onclick = () => {
      SoundFX.ensure();
      SoundFX.fanfare();
      hide(t);
      if (typeof onStart === 'function') onStart();
      if (typeof _hooks.onStart === 'function') _hooks.onStart();
    };
    t.append(hero, logo, tag, start);
    show(t);
  },

  hideTitle() { hide(_els.title); },

  /**
   * 5-step intro tutorial. Shown on first launch and replayable from the
   * pause menu. Wording adapts to keyboard / touch / connected controller,
   * and swaps live if a gamepad connects mid-tutorial. Every step is also
   * read aloud (slow, kid-friendly). Big touch targets throughout.
   */
  showTutorial({ onDone } = {}) {
    const wrap = _els.tutorial;
    wrap.innerHTML = '';
    const card = el('div', 'zsq-tut-card');
    wrap.appendChild(card);
    let i = 0;

    // Temporarily watch for controller changes so the wording swaps live;
    // the integrator's own handler is restored afterwards.
    const prevHandler = Input.onGamepadChange;
    Input.onGamepadChange = (connected, id) => {
      render(i);
      if (typeof prevHandler === 'function') prevHandler(connected, id);
    };
    const cleanup = () => {
      Input.onGamepadChange = prevHandler;
      Narrator.stop();
      hide(wrap);
    };

    const render = (idx) => {
      const steps = _tutorialSteps();
      const s = steps[Math.min(idx, steps.length - 1)];
      card.innerHTML = '';
      card.append(
        el('div', 'zsq-tut-emoji', s.emoji),
        el('div', 'zsq-tut-title', s.title),
        el('div', 'zsq-tut-text', s.text),
      );
      const row = el('div', 'zsq-tut-row');
      const last = idx >= steps.length - 1;
      const next = el('button', 'zsq-bigbtn', last ? 'Have fun! 💫' : 'Next ➜');
      next.onclick = () => {
        SoundFX.pop();
        if (last) {
          cleanup();
          if (typeof onDone === 'function') onDone();
        } else {
          i++;
          render(i);
        }
      };
      row.appendChild(next);
      if (!last) {
        const skip = el('button', 'zsq-skip', 'Skip ⏭');
        skip.onclick = () => {
          SoundFX.pop();
          cleanup();
          if (typeof onDone === 'function') onDone();
        };
        row.appendChild(skip);
      }
      card.appendChild(row);
      show(wrap);
      Narrator.speakText(s.title + '. ' + s.text, { pitch: 1.2, rate: 0.85 });
    };

    render(0);
  },

  /** Pause menu: resume or replay the how-to-play tutorial. */
  showPauseMenu({ onResume, onHowTo, onOutfit } = {}) {
    const wrap = _els.pauseWrap;
    wrap.innerHTML = '';
    const card = el('div', 'zsq-pause-card');
    card.append(
      el('div', 'zsq-tut-emoji', '⏸️'),
      el('div', 'zsq-tut-title', 'Paused'),
      el('div', 'zsq-tut-text', 'Take a breather, superstar! ⭐'),
    );
    const row = el('div', 'zsq-tut-row');
    const resume = el('button', 'zsq-bigbtn', '▶️ Keep Playing');
    resume.onclick = () => {
      SoundFX.pop();
      if (typeof onResume === 'function') onResume();
    };
    const howto = el('button', 'zsq-bigbtn zsq-howto', '📖 How to Play');
    howto.onclick = () => {
      SoundFX.pop();
      hide(wrap);
      if (typeof onHowTo === 'function') onHowTo();
    };
    const wardrobe = el('button', 'zsq-bigbtn zsq-howto', '👗 Wardrobe');
    wardrobe.onclick = () => {
      SoundFX.pop();
      this.showWardrobe({ onOutfit, onClose: () => this.showPauseMenu({ onResume, onHowTo, onOutfit }) });
    };
    const book = el('button', 'zsq-bigbtn zsq-howto', '🧺 Treasure Book');
    book.onclick = () => {
      SoundFX.pop();
      this.showTreasureBook({ onClose: () => this.showPauseMenu({ onResume, onHowTo, onOutfit }) });
    };
    row.append(resume, howto, wardrobe, book);
    card.appendChild(row);
    wrap.appendChild(card);
    show(wrap);
  },

  /** Treasure Book card (inside the pause overlay): lifetime finds per kind, today's finds per land. */
  showTreasureBook({ onClose } = {}) {
    const wrap = _els.pauseWrap;
    wrap.innerHTML = '';
    const card = el('div', 'zsq-pause-card zsq-tb-card');
    const m = treasureBookModel(Save.data, todayKey());
    card.append(el('div', 'zsq-tut-emoji', '🧺'), el('div', 'zsq-tut-title', 'Treasure Book'));
    const grid = el('div', 'zsq-tb-grid');
    for (const k of m.kinds) {
      const tile = el('div', 'zsq-tb-tile' + (k.found ? '' : ' zsq-tb-unfound'));
      tile.append(el('div', 'zsq-tb-emoji', k.emoji), el('div', 'zsq-tb-name', k.found ? `${k.label}: ${k.count}` : '?'));
      tile.setAttribute('aria-label', k.found ? `${k.label}: ${k.count}` : 'Not found yet');
      grid.appendChild(tile);
    }
    card.appendChild(grid);
    card.appendChild(el('div', 'zsq-tb-h', 'Found today'));
    for (const l of m.lands) {
      const r = el('div', 'zsq-tb-land');
      r.setAttribute('aria-label', `${l.name}: ${l.count} of ${l.of} today`);
      const dots = el('div', 'zsq-tb-dots');
      for (let i = 0; i < l.of; i++) dots.appendChild(el('span', 'zsq-tb-dot' + (i < l.count ? ' zsq-on' : '')));
      r.append(el('span', '', l.count >= l.of ? `${l.name} ⭐` : l.name), dots);
      card.appendChild(r);
    }
    card.appendChild(el('div', 'zsq-tb-h', 'Stickers'));
    const srow = el('div', 'zsq-tb-stickers');
    for (const st of m.stickers) {
      const slot = el('div', 'zsq-tb-sticker' + (st.found ? '' : ' zsq-tb-unfound'), st.found ? st.emoji : '?');
      slot.setAttribute('aria-label', st.found ? st.label : 'Secret sticker, not found yet');
      slot.title = st.found ? st.label : '';
      srow.appendChild(slot);
    }
    card.appendChild(srow);
    const line = m.total === 1 ? 'You have found 1 treasure!' : `You have found ${m.total} treasures!`;
    card.appendChild(el('div', 'zsq-tb-total', line));
    const crow = el('div', 'zsq-tut-row');
    const close = el('button', 'zsq-bigbtn', '✔ Close');
    close.onclick = () => { SoundFX.pop(); Narrator.stop(); if (typeof onClose === 'function') onClose(); };
    crow.appendChild(close);
    card.appendChild(crow);
    wrap.appendChild(card);
    show(wrap);
    Narrator.speakText('Treasure Book. ' + line, { pitch: 1.2, rate: 0.85 });
  },

  /** Wardrobe card (inside the pause overlay): wear unlocked star rewards. onOutfit(outfit) applies + saves. */
  showWardrobe({ onOutfit, onClose } = {}) {
    const wrap = _els.pauseWrap;
    wrap.innerHTML = '';
    const card = el('div', 'zsq-pause-card');
    card.append(el('div', 'zsq-tut-emoji', '👗'), el('div', 'zsq-tut-title', 'Wardrobe'));
    const unlocked = Save.data.milestones || [];
    const outfit = Save.data.outfit || (Save.data.outfit = {});
    const earn = (id) => {
      const m = MILESTONES.find((x) => x.id === id);
      return m ? `Earn ${m.stars} stars ⭐` : '';
    };
    const apply = () => {
      Save.data.outfit = sanitizeOutfit(Save.data.outfit, Save.data.milestones);
      Save.save();
      if (typeof onOutfit === 'function') onOutfit(Save.data.outfit);
      SoundFX.pop();
    };
    const mkRow = (title, need, icon) => {
      const open = unlocked.includes(need);
      const row = el('div', 'zsq-wd-row' + (open ? '' : ' zsq-wd-locked'));
      row.appendChild(el('div', 'zsq-wd-name', `${icon} ${title}`));
      if (!open) row.appendChild(el('div', 'zsq-wd-need', '🔒 ' + earn(need)));
      return { row, open };
    };
    const sw = el('div', 'zsq-wd-swatches');
    for (const slot of Object.keys(OUTFIT)) {
      const def = OUTFIT[slot];
      const { row, open } = mkRow(def.name, def.need, MILESTONES.find((m) => m.id === def.need).emoji);
      if (open) {
        const box = el('div', 'zsq-wd-swatches');
        const btns = [];
        def.choices.forEach((c, i) => {
          const b = el('button', 'zsq-swatch', '');
          b.style.background = c.rainbow // show the rainbow choice as a rainbow, not one color
            ? 'conic-gradient(#ff9cc4, #ffd36e, #9be7a6, #8fd3ff, #c9a8ff, #ff9cc4)'
            : '#' + c.color.toString(16).padStart(6, '0');
          b.setAttribute('aria-label', i === 0 ? `${def.name}: Default` : `${def.name}: ${c.label}`);
          b.setAttribute('aria-pressed', 'false');
          b.onclick = () => {
            if (i === 0) delete Save.data.outfit[slot]; else Save.data.outfit[slot] = c.id;
            apply(); sync();
          };
          btns.push(b); box.appendChild(b);
        });
        const sync = () => btns.forEach((b, i) => {
          const on = (Save.data.outfit[slot] || def.choices[0].id) === def.choices[i].id;
          b.classList.toggle('zsq-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.textContent = on ? '✓' : '';
        });
        sync();
        row.appendChild(box);
      }
      card.appendChild(row);
    }
    {
      const { row, open } = mkRow('Butterfly friend', BUDDY_NEED, '🦋');
      if (open) {
        const box = el('div', 'zsq-wd-swatches');
        const on = el('button', 'zsq-swatch zsq-swatch-txt', 'On');
        const off = el('button', 'zsq-swatch zsq-swatch-txt', 'Off');
        const sync = () => {
          const v = !!Save.data.outfit.buddy;
          on.classList.toggle('zsq-on', v); off.classList.toggle('zsq-on', !v);
          on.setAttribute('aria-pressed', v ? 'true' : 'false'); off.setAttribute('aria-pressed', v ? 'false' : 'true');
        };
        on.setAttribute('aria-label', 'Butterfly friend: On'); off.setAttribute('aria-label', 'Butterfly friend: Off');
        on.onclick = () => { Save.data.outfit.buddy = true; apply(); sync(); };
        off.onclick = () => { delete Save.data.outfit.buddy; apply(); sync(); };
        sync();
        box.append(on, off);
        row.appendChild(box);
      }
      card.appendChild(row);
    }
    const crow = el('div', 'zsq-tut-row');
    const close = el('button', 'zsq-bigbtn', '✔ Done');
    close.onclick = () => { SoundFX.pop(); if (typeof onClose === 'function') onClose(); };
    crow.appendChild(close);
    card.appendChild(crow);
    wrap.appendChild(card);
    show(wrap);
  },

  hidePauseMenu() { hide(_els.pauseWrap); },

  /**
   * Show/hide roam-only touch UI (the joystick). Called by the game flow:
   * visible while freely roaming, hidden on title / dialogue / challenges /
   * celebrations / pause. CSS still hides it on fine-pointer (mouse) devices.
   */
  setRoamUI(roaming) {
    _roamUI = !!roaming;
    if (_els.joy) _els.joy.style.display = _roamUI ? '' : 'none';
  },

  /**
   * Bottom dialogue sheet. lines: array of strings or
   * {princess|princessId, kind, text}. portrait: {src}, name, color.
   */
  showDialogue({ portrait, name, color }, lines, onDone) {
    const sheet = _els.sheet;
    sheet.innerHTML = '';
    hide(_els.challengeWrap);
    const arr = Array.isArray(lines) ? lines : [lines];
    let i = 0;

    const img = _makePortrait(portrait && portrait.src);
    const body = el('div', 'zsq-dbody');
    const dname = el('div', 'zsq-dname', name || '');
    // Darker shade of each princess color so her name reads at 4.5:1 or more.
    if (color) dname.style.color = NAME_COLORS[String(color).toLowerCase()] || '#3b1f04';
    const dtext = el('div', 'zsq-dtext');
    const row = el('div', 'zsq-drow');
    const replay = el('button', 'zsq-replay', '🔊');
    replay.setAttribute('aria-label', 'Hear that again');
    const next = el('button', 'zsq-next', i === arr.length - 1 ? 'Done ✓' : 'Next ➜');
    row.append(replay, next);
    body.append(dname, dtext, row);
    // Zoe on the right edge, dimmed: the princess is the one speaking on this sheet.
    const zoe = _makePortrait(ZOE_PORTRAIT);
    zoe.classList.add('zsq-portrait-zoe');
    zoe.alt = 'Zoe';
    sheet.append(img, body, zoe);

    const render = () => {
      const entry = arr[i];
      const text = (typeof entry === 'string') ? entry : (entry && entry.text) || '';
      dtext.textContent = text;
      _speakLine(entry, (portrait && portrait.princessId) || null);
      next.textContent = (i === arr.length - 1) ? 'Done ✓' : 'Next ➜';
      SoundFX.pop();
    };
    replay.onclick = () => _speakLine(arr[i], (portrait && portrait.princessId) || null);
    next.onclick = () => {
      i++;
      if (i >= arr.length) {
        hide(sheet);
        Narrator.stop();
        if (typeof onDone === 'function') onDone();
      } else {
        render();
      }
    };
    show(sheet);
    render();
  },

  /**
   * Challenge modal. data: {kicker, prompt, choices:[{id,label}], visualHtml, princessId, voiceText,
   * portrait: {src}, progress: {current, total}}
   * onChoose(choiceId)
   */
  showChallenge(data, onChoose) {
    hide(_els.sheet);
    const wrap = _els.challengeWrap;
    wrap.innerHTML = '';
    const modal = el('div', 'zsq-modal');
    // Header row: princess portrait (top-left), quest title with progress dots, 🔊 (top-right).
    const head = el('div', 'zsq-chead');
    const port = _makePortrait(data.portrait && data.portrait.src);
    const kicker = el('div', 'zsq-kicker', data.kicker || '✨ Challenge ✨');
    if (data.progress) {
      const dots = el('div', 'zsq-dots');
      dots.setAttribute('role', 'img');
      dots.setAttribute('aria-label', `Question ${data.progress.current} of ${data.progress.total}`);
      for (let k = 1; k <= data.progress.total; k++) {
        dots.appendChild(el('span', k <= data.progress.current ? 'zsq-on' : ''));
      }
      kicker.appendChild(dots);
    }
    const prompt = el('div', 'zsq-prompt', data.prompt || '');
    _els._lastLine = { princessId: data.princessId || null, text: data.replayText || data.voiceText || data.prompt || '' };
    const replay = el('button', 'zsq-replay zsq-modal-replay', '🔊');
    replay.setAttribute('aria-label', 'Hear that again');
    replay.onclick = () => {
      const L = _els._lastLine || {};
      if (L.princessId) Narrator.speakExact(L.princessId, L.text);
      else Narrator.speakText(L.text);
    };
    head.append(port, kicker, replay);
    modal.append(head, prompt);
    if (data.visualHtml) {
      const vis = el('div', 'zsq-visual');
      vis.innerHTML = data.visualHtml;
      modal.appendChild(vis);
    }
    if (data.bigWord) modal.appendChild(el('div', 'zsq-bigword', data.bigWord));
    if (data.spell && data.spell.tiles && data.spell.tiles.length) {
      const word = data.spell.word;
      const sh = el('div', 'zsq-sort-hint');
      sh.setAttribute('aria-live', 'polite');
      modal.appendChild(tileBuilder({
        tiles: data.spell.tiles, target: word.split(''),
        speak: (l) => { SoundFX.pop(); const s = tileSound(l); if (!s) return; if (s.tts) Narrator.speakExact(data.princessId, s.tts); else if (s.url) Narrator.playClip(s.url, undefined, s.stopAt); },
        onWrong: (info) => { sh.textContent = data.spell.hint || ''; if (typeof onChoose === 'function') onChoose('__spellwrong', info); },
        onDone: () => { sh.textContent = ''; if (typeof onChoose === 'function') onChoose('__spelldone'); },
      }));
      modal.appendChild(sh);
    }
    // Dictation (S3): word tiles build a sentence; the end mark is fixed after the last slot (tier 2) or a tile (tier 3).
    if (data.build && data.build.tiles && data.build.tiles.length) {
      const b = data.build;
      const sh = el('div', 'zsq-sort-hint');
      sh.setAttribute('aria-live', 'polite');
      const say = { '?': 'question mark', '.': 'period', '!': 'exclamation mark' };
      const tb = tileBuilder({
        tiles: b.tiles, target: b.target,
        speak: (l) => { SoundFX.pop(); Narrator.speakExact(data.princessId, say[l] || l); },
        onWrong: (info) => {
          const last = info.index === b.target.length - 1;
          const h = (b.hints && (info.index === 0 ? b.hints.first : last ? b.hints.last : null)) || b.hint || '';
          sh.textContent = h;
          if (typeof onChoose === 'function') onChoose('__spellwrong', { ...info, say: h });
        },
        onDone: () => { sh.textContent = ''; if (typeof onChoose === 'function') onChoose('__spelldone'); },
      });
      tb.classList.add('zsq-words');
      if (b.end) {
        // The end mark sits right after the last slot and wraps together with it.
        const row = tb.querySelector('.zsq-slots');
        const lastSlot = row.lastElementChild;
        const pair = el('div', 'zsq-slotpair');
        row.appendChild(pair);
        pair.append(lastSlot, el('div', 'zsq-endmark', b.end));
      }
      modal.appendChild(tb);
      modal.appendChild(sh);
    }
    if (data.tiles && data.tiles.length) {
      modal.appendChild(_blendTiles(data.tiles, data.princessId));
      modal.addEventListener('click', (e) => { if (!e.target.closest('.zsq-tile, .zsq-blend')) _blendTok++; }, true);
    }
    if (data.sort && data.sort.items && data.sort.items.length) {
      const sb = _sortBins(data.sort.items, data.princessId, data.prompt || '', (id, h) => {
        if (typeof onChoose === 'function') onChoose(id, h);
      });
      modal.appendChild(sb);
      if (data.voiceText) data = { ...data, voiceText: `${data.voiceText} ${sb.firstItemLine}` };
    }
    const box = el('div', 'zsq-choices');
    const btns = {};
    for (const c of (data.choices || [])) {
      const b = el('button', 'zsq-choice' + ((c.label || '').length > 16 ? ' zsq-long' : ''), c.label || '');
      b.onclick = () => {
        SoundFX.pop();
        if (typeof onChoose === 'function') onChoose(c.id);
      };
      btns[c.id] = b;
      box.appendChild(b);
    }
    modal.appendChild(box);
    wrap.appendChild(modal);
    _els._choiceBtns = btns;
    show(wrap);
    if (data.voiceText) {
      // exactVoice: the question text itself must be read aloud (TTS with the
      // princess's voice). Otherwise a generic MP3 greeting is fine.
      if (data.exactVoice && data.princessId) Narrator.speakExact(data.princessId, data.voiceText);
      else if (data.princessId) Narrator.speak(data.princessId, 'greeting', data.voiceText);
      else Narrator.speakText(data.voiceText);
    }
  },

  /**
   * Reveal the answer in the open challenge modal.
   * {correctId, pickedId, message}, onNext()
   */
  revealAnswer({ correctId, pickedId, message }, onNext) {
    const wrap = _els.challengeWrap;
    const modal = wrap.querySelector('.zsq-modal');
    if (!modal) { if (typeof onNext === 'function') onNext(); return; }
    const btns = _els._choiceBtns || {};
    Object.entries(btns).forEach(([id, b]) => {
      b.disabled = true;
      b.style.cursor = 'default';
      if (id === correctId) b.classList.add('zsq-correct');
      else if (id === pickedId) b.classList.add('zsq-wrong-pick');
      // Only a real reveal (correctId known) dims the rest; a gentle retry keeps them bright.
      else if (correctId) b.style.opacity = '0.55';
    });
    if (message) modal.appendChild(el('div', 'zsq-answer-msg', message));
    if (message && _els._lastLine) _els._lastLine = { princessId: _els._lastLine.princessId, text: message };
    const next = el('button', 'zsq-next', 'Next ➜');
    next.style.marginTop = '16px';
    next.onclick = () => {
      SoundFX.pop();
      hide(wrap);
      Narrator.stop();
      if (typeof onNext === 'function') onNext();
    };
    modal.appendChild(next);
    // On short screens the message and Next land below the fold; bring them into view for a child who won't scroll.
    const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { next.scrollIntoView({ block: 'end', behavior: calm ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
  },

  /** Update the ⭐ counter with a little bump. */
  updateStars(n) {
    const s = _els.stars;
    s.innerHTML = '⭐ ' + Number(n || 0);
    s.classList.remove('zsq-bump');
    void s.offsetWidth; // restart the animation
    s.classList.add('zsq-bump');
  },

  /** Update the 🧺 today's-finds pill (found of total). */
  updateFinds(n, total) {
    if (!_els.finds) return;
    _els.finds.textContent = `🧺 ${Number(n || 0)}/${Number(total || 20)}`;
    _els.finds.setAttribute('aria-label', `Treasures found today: ${Number(n || 0)} of ${Number(total || 20)}`);
  },

  /** Set the quest-pill HTML on the left of the top bar. */
  setQuestPill(html) {
    _els.pill.innerHTML = html || '✨ Starlight Quest';
  },

  /** Small floating toast that fades away. */
  toast(msg) {
    const t = el('div', 'zsq-toast', msg || '');
    _els.toasts.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .4s ease';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 420);
    }, 2200);
  },

  /** Interact bubble; pass null to hide. */
  promptInteract(label) {
    if (label == null) { hide(_els.interact); return; }
    _els.interact.textContent = label;
    show(_els.interact);
  },

  /** Zoe's progress block for the top of Parent Corner (built fresh each open). */
  _progressHtml() {
    const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const d = Save.data || {};
    const done = Array.isArray(d.done) ? d.done : [];
    const tiers = { 1: 'Easy', 2: 'Core', 3: 'Stretch' };
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = (iso) => {
      if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'Not yet';
      const t = new Date();
      if (iso === today(t)) return 'Today';
      t.setDate(t.getDate() - 1);
      if (iso === today(t)) return 'Yesterday';
      return `${MON[+iso.slice(5, 7) - 1] || '?'} ${+iso.slice(8, 10)}`;
    };
    const rows = NPC_ORDER.map((id) => {
      const p = PRINCESSES[id] || { name: id, landName: '' };
      const st = landState(d.ladder && d.ladder[id]);
      return `<tr><td><b>${esc(p.name)}</b>${done.includes(id) ? ' ✓' : ''}<small>${esc(p.landName)}</small></td>`
        + `<td>${tiers[st.tier]}</td><td>${st.review.length}</td><td>${esc(day(d.lastPlay && d.lastPlay[id]))}</td></tr>`;
    }).join('');
    return '<div class="zsq-prog"><h3>Zoe\'s progress</h3>'
      + `<p>⭐ ${(d.stars | 0)} stars &nbsp;·&nbsp; 🏰 ${done.length} of ${NPC_ORDER.length} lands restored</p>`
      + '<table><tr><th>Land</th><th>Level</th><th>Review</th><th>Last played</th></tr>'
      + `${rows}</table></div>`;
  },

  /** Teacher's word list editor for Parent Corner (saved on this device). */
  _wordsBlock() {
    const box = el('div', 'zsq-words');
    box.innerHTML = '<h3>This week\'s class words</h3>'
      + '<p style="margin:0 0 8px;font-size:15px">Type the sight words from school, separated by commas. Belle\'s Core level will use them (3 or more).</p>';
    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('aria-label', 'Class sight words, separated by commas');
    input.placeholder = 'jump, look, play';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.value = SCHOOL_WORDS.join(', ');
    const row = el('div', 'zsq-wrow');
    const save = el('button', 'zsq-wsave', 'Save');
    const clear = el('button', '', 'Clear');
    row.append(save, clear);
    const stat = el('p', 'zsq-wstat', '');
    const note = (extra) => {
      stat.textContent = (SCHOOL_WORDS.length >= 3
        ? `Using your ${SCHOOL_WORDS.length} words: ${SCHOOL_WORDS.join(', ')}.`
        : 'Using the built-in list.') + (extra ? ` ${extra}` : '');
    };
    note('');
    save.onclick = () => {
      SoundFX.pop();
      const words = cleanWordList(input.value);
      Save.data.schoolWords = words;
      Save.save();
      setSchoolWords(words);
      input.value = words.join(', ');
      note(words.length >= 3 ? `Saved ${words.length} words.`
        : words.length ? `Saved ${words.length}, but 3 or more are needed.` : 'No valid words found.');
    };
    clear.onclick = () => {
      SoundFX.pop();
      Save.data.schoolWords = [];
      Save.save();
      setSchoolWords([]);
      input.value = '';
      note('Cleared.');
    };
    // Typing must never reach the game's key controls.
    // Keys typed here don't reach the game; releases still do, so a key held before typing can't stick.
    input.addEventListener('keydown', (e) => e.stopPropagation());
    box.append(input, row, stat);
    return box;
  },

  /** "This week" school pack editor for Parent Corner (saved on this device). */
  _weekBlock() {
    const box = el('div', 'zsq-words');
    box.innerHTML = '<h3>This week</h3>'
      + '<p style="margin:0 0 4px;font-size:15px">This week\'s school list. Separate words with commas.</p>';
    const fields = [
      ['spelling', 'Spelling words', 'lend, send, fast'],
      ['sight', 'Sight words', 'of, he'],
      ['dictation', 'Dictation sentence', 'Can he run past the tent?'],
      ['vowels', 'Short-vowel words', 'sat, hip, pen']
    ];
    const inputs = {};
    for (const [key, label, ph] of fields) {
      const lab = el('label', 'zsq-wlab', label);
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = ph;
      input.autocomplete = 'off';
      input.autocapitalize = key === 'dictation' ? 'sentences' : 'off';
      input.spellcheck = false;
      // Typing must never reach the game's key controls; releases still do.
      input.addEventListener('keydown', (e) => e.stopPropagation());
      lab.append(input);
      inputs[key] = input;
      box.append(lab);
    }
    const fill = () => {
      for (const k of ['spelling', 'sight', 'vowels']) inputs[k].value = WEEK[k].join(', ');
      inputs.dictation.value = WEEK.dictation;
    };
    fill();
    const row = el('div', 'zsq-wrow');
    const save = el('button', 'zsq-wsave', 'Save');
    const reset = el('button', '', 'Back to defaults');
    row.append(save, reset);
    const stat = el('p', 'zsq-wstat', '');
    save.onclick = () => {
      SoundFX.pop();
      const c = cleanWeek({
        spelling: inputs.spelling.value, sight: inputs.sight.value,
        dictation: inputs.dictation.value, vowels: inputs.vowels.value
      });
      Save.data.week = c;
      Save.save();
      setWeek(c);
      fill();
      stat.textContent = 'Saved. Anything left blank or not valid uses the default.';
    };
    reset.onclick = () => {
      SoundFX.pop();
      Save.data.week = null;
      Save.save();
      setWeek(null);
      fill();
      stat.textContent = 'Back to the default list.';
    };
    box.append(row, stat);
    return box;
  },

  /** Parent corner overlay (scrollable, with close button). */
  showParentCorner(onClose) {
    const wrap = _els.parentWrap;
    wrap.innerHTML = '';
    const panel = el('div', 'zsq-parent');
    const head = el('div', 'zsq-parent-head', '<h2>👨‍👩‍👧 Parent Corner</h2>');
    const close = el('button', 'zsq-close', 'Close ✕');
    close.onclick = () => {
      SoundFX.pop();
      hide(wrap);
      if (typeof onClose === 'function') onClose();
    };
    head.appendChild(close);
    const body = el('div', 'zsq-parent-body', this._progressHtml());
    body.appendChild(this._weekBlock());
    body.appendChild(this._wordsBlock());
    body.insertAdjacentHTML('beforeend', PARENT_HTML);
    panel.append(head, body);
    wrap.appendChild(panel);
    show(wrap);
  },

  /**
   * Grown-up check in front of Parent Corner, so Zoe can't wander in.
   * Silent: the question is not spoken. Right answer opens Parent Corner;
   * a wrong answer or Close just closes the card with no sound or message.
   */
  showParentGate() {
    // Its own overlay (the Parent Corner one), never the challenge card: 📊 can be
    // tapped mid-question. padnav already gives .zsq-parent-wrap the d-pad / ✕ focus.
    const wrap = _els.parentWrap;
    wrap.innerHTML = '';
    const a = 6 + Math.floor(Math.random() * 4);
    const b = 6 + Math.floor(Math.random() * 4);
    const sum = a + b;
    const offsets = [-2, -1, 1, 2];
    for (let i = offsets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }
    const opts = [sum, sum + offsets[0], sum + offsets[1]];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    const modal = el('div', 'zsq-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'For grown-ups');
    const head = el('div', 'zsq-chead');
    head.appendChild(el('div', 'zsq-kicker', 'For grown-ups'));
    const close = el('button', 'zsq-close', 'Close ✕');
    close.onclick = () => { hide(wrap); };
    head.appendChild(close);
    modal.append(head, el('div', 'zsq-prompt', `Tap the answer to ${a} + ${b}`));
    const box = el('div', 'zsq-choices');
    for (const n of opts) {
      const btn = el('button', 'zsq-choice', String(n));
      btn.onclick = () => {
        hide(wrap);
        if (n === sum) {
          SoundFX.pop();
          this.showParentCorner(() => {});
        }
      };
      box.appendChild(btn);
    }
    modal.appendChild(box);
    wrap.appendChild(modal);
    show(wrap);
  },

  /** Big celebration overlay with twinkling stars. */
  showCelebration(title, subtitle, onDone) {
    const c = _els.celebrate;
    c.innerHTML = '';
    c.append(
      el('div', 'zsq-bigstars', '⭐🌟⭐'),
      el('div', 'zsq-cel-title', title || 'Amazing!'),
      el('div', 'zsq-cel-sub', subtitle || ''),
    );
    const btn = el('button', 'zsq-bigbtn', 'Continue ➜');
    btn.onclick = () => {
      SoundFX.pop();
      hide(c);
      if (typeof onDone === 'function') onDone();
    };
    c.appendChild(btn);
    show(c);
    SoundFX.fanfare();
  },

  /** Milestone card: one happy card naming the unlocked reward(s). */
  showMilestone({ title, sub, emoji }, onDone) {
    const c = _els.celebrate;
    c.innerHTML = '';
    c.append(
      el('div', 'zsq-bigstars', emoji || '🌟'),
      el('div', 'zsq-cel-title', title || ''),
      el('div', 'zsq-cel-sub', sub || ''),
    );
    const btn = el('button', 'zsq-bigbtn', 'Yay! ➜');
    btn.onclick = () => { SoundFX.pop(); hide(c); if (typeof onDone === 'function') onDone(); };
    c.appendChild(btn);
    show(c);
    SoundFX.fanfare();
  },

  /** One-time card for when the first new kingdoms open (main.js only calls it with at least one built slot). */
  showNewKingdoms(onDone) {
    UI.showMilestone({ title: 'New kingdoms appeared beyond the Starlight Hub!', sub: 'Follow the sparkly paths to find them.', emoji: '🌟🏰🌟' }, onDone);
  },

  /** Soft stop card: Rest (default) or One more. */
  showRest({ title, sub }, onRest, onMore) {
    const c = _els.celebrate;
    c.innerHTML = '';
    c.append(el('div', 'zsq-bigstars', '🌙✨'), el('div', 'zsq-cel-title', title || ''), el('div', 'zsq-cel-sub', sub || ''));
    const rest = el('button', 'zsq-bigbtn', 'Rest 💤');
    rest.onclick = () => { SoundFX.pop(); hide(c); if (typeof onRest === 'function') onRest(); };
    const more = el('button', 'zsq-bigbtn zsq-more', 'One more? ✨');
    more.style.marginTop = '12px';
    more.onclick = () => { SoundFX.pop(); hide(c); if (typeof onMore === 'function') onMore(); };
    c.append(rest, more);
    show(c);
  },

  /** Finale overlay. lines: array of strings (or dialogue entries). */
  showFinale(lines, onDone) {
    const f = _els.finale;
    f.innerHTML = '';
    const card = el('div', 'zsq-finale-card');
    card.appendChild(el('h2', null, '🌟 The Starlight Is Restored! 🌟'));
    const arr = Array.isArray(lines) ? lines : [lines];
    for (const ln of arr) {
      card.appendChild(el('div', 'zsq-finale-line', (typeof ln === 'string') ? ln : (ln && ln.text) || ''));
    }
    const first = arr[0];
    const firstText = (typeof first === 'string') ? first : (first && first.text) || '';
    if (firstText) Narrator.speakText(firstText, { pitch: 1.2, rate: 0.92 });
    const btn = el('button', 'zsq-bigbtn', 'Play Again 💫');
    btn.style.marginTop = '18px';
    btn.onclick = () => {
      SoundFX.fanfare();
      hide(f);
      Narrator.stop();
      if (typeof onDone === 'function') onDone();
    };
    card.appendChild(btn);
    f.appendChild(card);
    show(f);
    SoundFX.fanfare();
  },

  /**
   * Bottom-left touch joystick. Calls onVector(x, z) with a normalized
   * 2D vector (magnitude ≤ 1). Hidden automatically on fine-pointer devices.
   */
  joystick(onVector) {
    if (_els.joy) { _els.joy.remove(); _els.joy = null; }
    const joy = el('div', 'zsq-joy');
    const knob = el('div', 'zsq-joy-knob');
    joy.appendChild(knob);
    _root.appendChild(joy);
    _els.joy = joy;
    // Only visible while roaming; hidden on title / dialogue / overlays.
    if (!_roamUI) joy.style.display = 'none';

    let active = false;
    const R = 46; // max knob travel in px
    const setKnob = (dx, dy) => {
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    const release = () => {
      active = false;
      setKnob(0, 0);
      if (typeof onVector === 'function') onVector(0, 0);
    };
    const move = (e) => {
      if (!active) return;
      const r = joy.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = dx / len * R; dy = dy / len * R; }
      setKnob(dx, dy);
      if (typeof onVector === 'function') onVector(dx / R, dy / R);
    };
    joy.addEventListener('pointerdown', (e) => {
      active = true;
      try { joy.setPointerCapture(e.pointerId); } catch (_) {}
      move(e);
      e.preventDefault();
    });
    joy.addEventListener('pointermove', move);
    joy.addEventListener('pointerup', release);
    joy.addEventListener('pointercancel', release);
    _joyHandlers = { release };
  },

  /** Reflect mute state on the mute button and (optionally) wire toggles. */
  setMuteUI(muted, onToggle) {
    if (!_els.muteBtn) return;
    _els.muteBtn.textContent = muted ? '🔇' : '🔊';
    if (typeof onToggle === 'function') {
      _hooks.onMuteToggle = onToggle;
    }
  }
};
