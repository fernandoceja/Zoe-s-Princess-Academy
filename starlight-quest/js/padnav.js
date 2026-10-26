/* Zoe's Starlight Quest — controller & keyboard menu navigation.
 * When a menu, dialogue or challenge is open, the d-pad / left stick (or the
 * arrow keys) moves a visible focus ring between its buttons, and A / Cross
 * (or Enter) presses the focused one. In the 3D world this does nothing, so
 * walking and talking stay exactly as before (input.js).
 * ES module.
 */

import { Input } from './input.js?v=20261025s9';

// Topmost first: the first visible root wins.
const ROOTS = ['.zsq-tutorial', '.zsq-pause-wrap', '.zsq-parent-wrap', '.zsq-finale',
  '.zsq-celebrate', '.zsq-modal-wrap', '.zsq-sheet', '.zsq-title'];
const FOCUS_CLASS = 'zsq-padfocus';
const STICK = 0.5;
const REPEAT_MS = 260;

function visible(node) {
  if (!node || node.classList.contains('zsq-hidden') || node.classList.contains('zsq-leaving')) return false;
  const cs = getComputedStyle(node);
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  return node.getClientRects().length > 0;
}

function activeRoot() {
  for (const sel of ROOTS) {
    const n = document.querySelector(sel);
    if (visible(n) && n.querySelector('button')) return n;
  }
  return null;
}

function buttons(root) {
  return Array.from(root.querySelectorAll('button')).filter((b) => !b.disabled && visible(b));
}

let _focused = null;
let _prevBtns = [];
let _lastMove = 0;
let _lastDir = null;
let _usingPad = false;

function setFocus(b) {
  if (_focused && _focused !== b) _focused.classList.remove(FOCUS_CLASS);
  _focused = b;
  if (b) {
    b.classList.add(FOCUS_CLASS);
    try { b.focus({ preventScroll: false }); } catch (e) { b.focus(); }
  }
}

/** Pick the nearest button in direction dir ('up'|'down'|'left'|'right'). */
function move(dir) {
  const root = activeRoot();
  if (!root) return;
  const list = buttons(root);
  if (!list.length) return;
  if (!_focused || !list.includes(_focused)) { setFocus(primary(list)); return; }
  const r0 = _focused.getBoundingClientRect();
  const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = null, bestScore = Infinity;
  for (const b of list) {
    if (b === _focused) continue;
    const r = b.getBoundingClientRect();
    const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
    const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    const across = (dir === 'left' || dir === 'right') ? Math.abs(dy) : Math.abs(dx);
    if (along <= 1) continue;
    const score = along + across * 2;
    if (score < bestScore) { bestScore = score; best = b; }
  }
  if (!best) {
    // Wrap around in reading order so a child never gets stuck.
    const i = list.indexOf(_focused);
    const step = (dir === 'left' || dir === 'up') ? -1 : 1;
    best = list[(i + step + list.length) % list.length];
  }
  setFocus(best);
}

/** The button a child most likely wants: an answer, else Next/Continue/Start. */
function primary(list) {
  return list.find((b) => b.classList.contains('zsq-choice')) ||
    list.find((b) => b.classList.contains('zsq-next') || b.classList.contains('zsq-bigbtn')) ||
    list[0] || null;
}

function press() {
  const root = activeRoot();
  if (!root) return false;
  const list = buttons(root);
  if (!list.length) return false;
  const b = (_focused && list.includes(_focused)) ? _focused : primary(list);
  Input.clearInteract();
  b.click();
  Input.clearInteract();
  return true;
}

/** Keep focus valid when menus open, close or change buttons. */
let _hadRoot = false;
function syncFocus() {
  const root = activeRoot();
  if (!root) {
    // A menu/dialogue just closed: swallow the press that closed it.
    if (_hadRoot) Input.clearInteract();
    _hadRoot = false;
    if (_focused) setFocus(null); _prevBtns = []; return;
  }
  _hadRoot = true;
  const list = buttons(root);
  const changed = list.length !== _prevBtns.length || list.some((b, i) => b !== _prevBtns[i]);
  _prevBtns = list;
  if (!_usingPad) return;
  if (changed || !_focused || !list.includes(_focused)) {
    // Prefer an answer choice, else the first button (Next / Continue / Start).
    setFocus(primary(list));
  }
}

let _padPrev = [];
function pollPad() {
  let pad = null;
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) { if (p && p.connected !== false) { pad = p; break; } }
  } catch (e) { pad = null; }
  if (!pad) { _padPrev = []; return; }
  const btn = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
  const edge = (i) => btn(i) && !_padPrev[i];
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  let dir = null;
  if (btn(12) || ay < -STICK) dir = 'up';
  else if (btn(13) || ay > STICK) dir = 'down';
  else if (btn(14) || ax < -STICK) dir = 'left';
  else if (btn(15) || ax > STICK) dir = 'right';
  const root = activeRoot();
  if (root) {
    if (dir || edge(0)) _usingPad = true;
    if (dir) {
      const now = performance.now();
      if (dir !== _lastDir || now - _lastMove > REPEAT_MS) {
        if (!_focused) syncFocus();
        if (_focused || dir !== _lastDir) move(dir);
        _lastMove = now;
      }
    }
    if (edge(0)) press();
  }
  _lastDir = dir;
  _padPrev = pad.buttons.map((b) => !!b.pressed);
}

function loop() {
  pollPad();
  syncFocus();
  requestAnimationFrame(loop);
}

let _started = false;
export function startPadNav() {
  if (_started || typeof window === 'undefined') return;
  _started = true;
  const css = document.createElement('style');
  css.textContent = `
    button.${FOCUS_CLASS}, button.${FOCUS_CLASS}:focus-visible {
      outline: 5px solid #0ea5e9 !important; outline-offset: 4px !important;
      box-shadow: 0 0 0 9px rgba(255,255,255,.85), 0 0 22px 10px rgba(14,165,233,.55) !important;
    }`;
  document.head.appendChild(css);
  // Keyboard: arrows move between buttons only while a menu is open.
  window.addEventListener('keydown', (e) => {
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (!activeRoot()) return;
    // Space / Enter press the focused (or main) button while a menu is open.
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') {
      if (e.repeat) return;
      e.preventDefault();
      _usingPad = true;
      press();
      return;
    }
    if (!map[e.code]) return;
    _usingPad = true;
    move(map[e.code]);
  });
  // Tapping or clicking hides the ring again.
  window.addEventListener('pointerdown', () => {
    _usingPad = false;
    if (_focused) _focused.classList.remove(FOCUS_CLASS);
    _focused = null;
  }, true);
  requestAnimationFrame(loop);
}
