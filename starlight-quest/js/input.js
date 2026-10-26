/* Zoe's Starlight Quest — unified input
 * Merges three control sources, polled once per frame:
 *   - Keyboard (MacBook): WASD/arrows move; E or Space = interact (edge);
 *     P or Esc = pause (edge).
 *   - Touch (iPad/iPhone): the ui.js joystick feeds its vector here via
 *     setJoystick(x, z).
 *   - Bluetooth controllers (PS5 DualSense etc. via the Gamepad API):
 *     left stick (axes 0/1, deadzone 0.15) moves; Cross/A (button 0) =
 *     interact edge; Options/Start (button 9) = pause edge.
 * Move priority when several sources are active: gamepad > joystick > keys.
 * ES module, no dependencies. DOM access is guarded so the logic can be
 * unit-tested in node with stubbed globals.
 */

const DEADZONE = 0.15;

/** Deadzone + rescale so 0.15..1 maps to 0..1 smoothly. */
function applyDeadzone(x, y) {
  const len = Math.hypot(x, y);
  if (len < DEADZONE) return { x: 0, y: 0 };
  const mag = Math.min(1, (len - DEADZONE) / (1 - DEADZONE));
  return { x: (x / len) * mag, y: (y / len) * mag };
}

export const Input = {
  /** Merged move vector for this frame, magnitude <= 1. Screen-up is -z. */
  vector: { x: 0, z: 0 },

  /** Friendly name of the connected gamepad, or null. */
  gamepadName: null,

  /** Integrator hook: fn(connected:boolean, id:string). UI uses it for toasts. */
  onGamepadChange: null,

  _keys: Object.create(null),
  _joy: { x: 0, z: 0 },
  _pad: { x: 0, z: 0 },
  _padButtons: [],
  _interactEdge: false,
  _blockUntil: 0,
  _pauseEdge: false,
  _inited: false,
  _onKeyDown: null,
  _onKeyUp: null,
  _onPadConnected: null,
  _onPadDisconnected: null,

  get hasGamepad() { return this.gamepadName != null; },

  isTouchDevice() {
    if (typeof window === 'undefined') return false;
    return ('ontouchstart' in window) ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  },

  init() {
    if (this._inited || typeof window === 'undefined') return;
    this._inited = true;

    // Typing in a text box (Parent Corner word list) must not walk or talk.
    const typing = (e) => !!(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'));
    this._onKeyDown = (e) => {
      if (typing(e)) return;
      if (e.repeat) return;
      this._keys[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'Space') this._interactEdge = true;
      if (e.code === 'KeyP' || e.code === 'Escape') this._pauseEdge = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) &&
          typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
    };
    this._onKeyUp = (e) => { this._keys[e.code] = false; }; // always clear, even while typing
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    this._onPadConnected = (e) => {
      const id = (e && e.gamepad && e.gamepad.id) || 'controller';
      if (typeof this.onGamepadChange === 'function') this.onGamepadChange(true, id);
    };
    this._onPadDisconnected = (e) => {
      const id = (e && e.gamepad && e.gamepad.id) || 'controller';
      this.gamepadName = null;
      this._pad.x = 0; this._pad.z = 0;
      this._padButtons = [];
      if (typeof this.onGamepadChange === 'function') this.onGamepadChange(false, id);
    };
    window.addEventListener('gamepadconnected', this._onPadConnected);
    window.addEventListener('gamepaddisconnected', this._onPadDisconnected);
  },

  /** Touch joystick (ui.js) feeds its normalized vector here. */
  setJoystick(x, z) {
    this._joy.x = x || 0;
    this._joy.z = z || 0;
  },

  _readGamepad() {
    let pad = null;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
        const pads = navigator.getGamepads();
        for (const p of pads) {
          if (p && p.connected !== false) { pad = p; break; }
        }
      }
    } catch (e) { pad = null; }
    if (!pad) {
      this.gamepadName = null;
      this._pad.x = 0; this._pad.z = 0;
      this._padButtons = [];
      return;
    }
    this.gamepadName = pad.id || 'controller';
    // Standard mapping: axes[0] = left stick X, axes[1] = left stick Y
    // (positive Y is screen-down, matching keyboard S => +z).
    const dz = applyDeadzone(pad.axes[0] || 0, pad.axes[1] || 0);
    this._pad.x = dz.x;
    this._pad.z = dz.y;
    const btns = pad.buttons || [];
    const pressed = (i) => !!(btns[i] && btns[i].pressed);
    const prev = this._padButtons;
    if (pressed(0) && !prev[0]) this._interactEdge = true; // Cross / A
    if (pressed(9) && !prev[9]) this._pauseEdge = true;    // Options / Start
    this._padButtons = btns.map((b) => !!b.pressed);
  },

  _readKeys(out) {
    const k = this._keys;
    let x = 0, z = 0;
    if (k.KeyW || k.ArrowUp) z -= 1;
    if (k.KeyS || k.ArrowDown) z += 1;
    if (k.KeyA || k.ArrowLeft) x -= 1;
    if (k.KeyD || k.ArrowRight) x += 1;
    out.x = x; out.z = z;
  },

  /**
   * Poll once per frame. Merges sources by priority:
   * gamepad (when its stick is active) > touch joystick > keyboard.
   */
  poll() {
    this._readGamepad();
    const kb = { x: 0, z: 0 };
    this._readKeys(kb);
    const padMag = Math.hypot(this._pad.x, this._pad.z);
    const joyMag = Math.hypot(this._joy.x, this._joy.z);
    const src = padMag > 0.001 ? this._pad : (joyMag > 0.001 ? this._joy : kb);
    let x = src.x, z = src.z;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    this.vector.x = x;
    this.vector.z = z;
  },

  /** True once per press. Always consumes the edge so nothing goes stale. */
  consumeInteract() {
    const v = this._interactEdge;
    this._interactEdge = false;
    if (this._blockUntil && Date.now() < this._blockUntil) return false;
    return v;
  },

  /**
   * Drop any pending talk press and ignore new ones for a moment. Called when a
   * menu or dialogue closes, so the A / Space / Enter that pressed the last
   * Continue can't instantly re-open the princess's quest.
   */
  clearInteract(ms = 400) {
    this._interactEdge = false;
    this._blockUntil = Date.now() + ms;
  },

  /** True once per press. Always consumes the edge so nothing goes stale. */
  consumePause() {
    const v = this._pauseEdge;
    this._pauseEdge = false;
    return v;
  },

  /**
   * Device-appropriate control wording for tutorials and prompts.
   * { gamepad, touch, move, interact, pause }
   */
  describeControls() {
    const gamepad = this.hasGamepad;
    const touch = this.isTouchDevice();
    if (gamepad) {
      return {
        gamepad: true, touch,
        move: 'push the left stick',
        interact: 'press ✕',
        pause: 'press the Options button',
      };
    }
    if (touch) {
      return {
        gamepad: false, touch: true,
        move: 'drag the joystick',
        interact: 'tap the princess',
        pause: 'tap ⏸️',
      };
    }
    return {
      gamepad: false, touch: false,
      move: 'use WASD or the arrow keys',
      interact: 'click, or press E',
      pause: 'press P',
    };
  },

  dispose() {
    if (typeof window === 'undefined' || !this._inited) return;
    this._inited = false;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('gamepadconnected', this._onPadConnected);
    window.removeEventListener('gamepaddisconnected', this._onPadDisconnected);
    this._onKeyDown = this._onKeyUp = this._onPadConnected = this._onPadDisconnected = null;
  },
};
