/* Zoe's Starlight Quest — UI layer
 * Builds all DOM + CSS for: title screen, top bar, dialogue sheet,
 * challenge modal, interact prompt, toasts, celebration, finale,
 * parent corner, touch joystick, mute wiring.
 * ES module, no external assets (fonts loaded by the integrator).
 */

import { Narrator, SoundFX } from './audio.js';
import { PORTRAIT_ZOE } from './portrait-zoe.js';
import { PARENT_CORNER_HTML } from './quests.js';

const GOLD = '#ebd373';
const ZOE_PORTRAIT = PORTRAIT_ZOE;

let _root = null;
let _els = {};
let _hooks = {};
let _joyHandlers = null;

const PARENT_HTML = (typeof PARENT_CORNER_HTML === 'string' && PARENT_CORNER_HTML)
  ? PARENT_CORNER_HTML
  : '<div class="zsq-parent-fallback"><h2>Parent Corner</h2><p>No parent content is available right now.</p></div>';

function el(tag, cls, html) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html != null) d.innerHTML = html;
  return d;
}

function hide(node) { if (node) node.classList.add('zsq-hidden'); }
function show(node) { if (node) node.classList.remove('zsq-hidden'); }

function injectCSS() {
  if (document.getElementById('zsq-style')) return;
  const s = document.createElement('style');
  s.id = 'zsq-style';
  s.textContent = `
  .zsq-hidden { display: none !important; }
  #zsq-ui, #zsq-ui * { box-sizing: border-box; font-family: 'Nunito', 'Comic Sans MS', system-ui, sans-serif; }
  #zsq-ui { position: fixed; inset: 0; pointer-events: none; z-index: 50; }

  /* ---------- top bar ---------- */
  .zsq-topbar { position: absolute; top: 0; left: 0; right: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; pointer-events: none; }
  .zsq-pill { pointer-events: auto; background: rgba(255,255,255,.92);
    border: 3px solid ${GOLD}; border-radius: 999px; padding: 10px 20px;
    font-weight: 800; font-size: 20px; color: #475569;
    box-shadow: 0 4px 14px rgba(31,41,55,.12); min-height: 56px;
    display: flex; align-items: center; }
  .zsq-topright { display: flex; gap: 10px; align-items: center; pointer-events: auto; }
  .zsq-stars { background: rgba(255,255,255,.92); border: 3px solid ${GOLD};
    border-radius: 999px; padding: 10px 18px; font-weight: 900; font-size: 22px;
    color: #b45309; min-height: 56px; display: flex; align-items: center; gap: 6px;
    box-shadow: 0 4px 14px rgba(31,41,55,.12); transition: transform .25s ease; }
  .zsq-stars.zsq-bump { transform: scale(1.18); }
  .zsq-iconbtn { width: 56px; height: 56px; border-radius: 50%; border: 3px solid ${GOLD};
    background: rgba(255,255,255,.94); font-size: 26px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 14px rgba(31,41,55,.12); transition: transform .12s ease; }
  .zsq-iconbtn:active { transform: scale(.92); }

  /* ---------- dialogue sheet ---------- */
  .zsq-sheet { position: absolute; left: 16px; right: 16px; bottom: 16px;
    pointer-events: auto; background: linear-gradient(135deg, #fdfcfe 0%, #f4faeb 60%, #e6f7ff 100%);
    border: 4px solid ${GOLD}; border-radius: 24px; padding: 20px;
    box-shadow: 0 14px 40px rgba(31,41,55,.22); display: flex; gap: 16px; align-items: flex-start;
    animation: zsq-pop .3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  .zsq-portrait { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; flex: none;
    border: 4px solid rgba(255,255,255,.9); outline: 3px solid ${GOLD};
    box-shadow: 0 8px 18px rgba(31,41,55,.2); background: #fff; }
  .zsq-portrait-fallback { width: 96px; height: 96px; border-radius: 50%; flex: none;
    border: 4px solid rgba(255,255,255,.9); outline: 3px solid ${GOLD};
    background: linear-gradient(135deg, #fde68a, #f9a8d4); font-size: 52px;
    display: flex; align-items: center; justify-content: center; }
  .zsq-dbody { flex: 1; min-width: 0; }
  .zsq-dname { font-weight: 900; font-size: 24px; margin-bottom: 6px; }
  .zsq-dtext { font-size: 22px; line-height: 1.5; color: #334155; font-weight: 600; }
  .zsq-drow { display: flex; gap: 12px; margin-top: 14px; align-items: center; }
  .zsq-next { min-height: 64px; padding: 12px 36px; border-radius: 20px; border: none;
    font-size: 22px; font-weight: 900; color: #fff; cursor: pointer;
    background: linear-gradient(135deg, #f472b6, #db4f9c);
    box-shadow: 0 6px 0 rgba(0,0,0,.12); transition: transform .12s ease; }
  .zsq-next:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,.12); }
  .zsq-replay { width: 64px; height: 64px; border-radius: 50%; border: 3px solid ${GOLD};
    background: #fff; font-size: 28px; cursor: pointer; flex: none; }

  /* ---------- challenge modal ---------- */
  .zsq-modal-wrap { position: absolute; inset: 0; pointer-events: auto;
    display: flex; align-items: center; justify-content: center;
    background: rgba(31,41,55,.35); padding: 20px; animation: zsq-pop .3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  .zsq-modal { background: linear-gradient(135deg, #fdfcfe 0%, #f4faeb 60%, #e6f7ff 100%);
    border: 4px solid ${GOLD}; border-radius: 24px; padding: 28px;
    max-width: 640px; width: 100%; box-shadow: 0 18px 50px rgba(31,41,55,.3);
    text-align: center; max-height: 92vh; overflow-y: auto; }
  .zsq-kicker { font-size: 18px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
    color: #b45309; margin-bottom: 8px; }
  .zsq-prompt { font-size: 30px; font-weight: 900; color: #334155; margin-bottom: 8px; line-height: 1.3; }
  .zsq-visual { margin: 12px 0; display: flex; justify-content: center; }
  .zsq-choices { display: flex; flex-direction: column; gap: 14px; margin-top: 18px; }
  .zsq-choice { min-height: 72px; border-radius: 20px; border: 4px solid ${GOLD};
    background: #fff; font-size: 30px; font-weight: 900; color: #475569; cursor: pointer;
    padding: 14px 20px; box-shadow: 0 6px 0 rgba(0,0,0,.08); transition: transform .12s ease; }
  .zsq-choice:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,.08); }
  .zsq-choice.zsq-correct { background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    border-color: #34c779; color: #065f46; animation: zsq-pop .35s cubic-bezier(0.175,0.885,0.32,1.275); }
  .zsq-choice.zsq-wrong-pick { border-color: #f9a8d4; background: #fdf2f8; color: #9d174d;
    animation: zsq-wiggle .4s ease; }
  .zsq-answer-msg { font-size: 22px; font-weight: 700; color: #475569; margin: 16px 0 4px; line-height: 1.45; }

  /* ---------- interact prompt ---------- */
  .zsq-interact { position: absolute; left: 50%; bottom: 38%; transform: translateX(-50%);
    pointer-events: none; background: rgba(255,255,255,.96); border: 3px solid ${GOLD};
    border-radius: 999px; padding: 14px 28px; font-size: 22px; font-weight: 900; color: #b45309;
    box-shadow: 0 8px 24px rgba(31,41,55,.2); animation: zsq-bob 1.6s ease-in-out infinite; white-space: nowrap; }

  /* ---------- toast ---------- */
  .zsq-toasts { position: absolute; top: 84px; left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; width: max-content; max-width: 92vw; }
  .zsq-toast { background: #0f172a; color: #fff; border-radius: 999px; padding: 12px 26px;
    font-size: 20px; font-weight: 700; box-shadow: 0 8px 24px rgba(15,23,42,.3);
    animation: zsq-pop .3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

  /* ---------- celebration ---------- */
  .zsq-celebrate { position: absolute; inset: 0; pointer-events: auto;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
    background: linear-gradient(135deg, #fdf4ff 0%, #fef9c3 55%, #e0f2fe 100%);
    border-radius: 0; text-align: center; padding: 32px; animation: zsq-pop .4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  .zsq-bigstars { font-size: 84px; animation: zsq-bob 1.4s ease-in-out infinite; letter-spacing: 8px; }
  .zsq-cel-title { font-size: 44px; font-weight: 900; color: #92400e; line-height: 1.15; }
  .zsq-cel-sub { font-size: 24px; font-weight: 700; color: #475569; max-width: 560px; line-height: 1.5; }
  .zsq-bigbtn { min-height: 72px; padding: 16px 56px; border-radius: 24px; border: none;
    font-size: 28px; font-weight: 900; color: #fff; cursor: pointer;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    box-shadow: 0 8px 0 rgba(0,0,0,.12); transition: transform .12s ease; }
  .zsq-bigbtn:active { transform: translateY(6px); box-shadow: 0 2px 0 rgba(0,0,0,.12); }

  /* ---------- finale ---------- */
  .zsq-finale { position: absolute; inset: 0; pointer-events: auto;
    background: linear-gradient(160deg, #1e1b4b 0%, #4c1d95 45%, #831843 100%);
    display: flex; align-items: center; justify-content: center; padding: 24px; }
  .zsq-finale-card { background: rgba(255,255,255,.97); border: 5px solid ${GOLD};
    border-radius: 28px; padding: 36px; max-width: 680px; width: 100%; text-align: center;
    box-shadow: 0 24px 70px rgba(0,0,0,.45); animation: zsq-pop .4s cubic-bezier(0.175,0.885,0.32,1.275); }
  .zsq-finale h2 { font-size: 38px; font-weight: 900; color: #92400e; margin: 0 0 12px; }
  .zsq-finale-line { font-size: 24px; font-weight: 700; color: #475569; line-height: 1.55; margin: 10px 0; }

  /* ---------- parent corner ---------- */
  .zsq-parent-wrap { position: absolute; inset: 0; pointer-events: auto;
    display: flex; align-items: center; justify-content: center;
    background: rgba(15,23,42,.5); padding: 20px; }
  .zsq-parent { background: rgba(255,255,255,.98); border: 3px solid rgba(148,163,184,.5);
    border-radius: 20px; max-width: 720px; width: 100%; max-height: 88vh;
    display: flex; flex-direction: column; box-shadow: 0 18px 50px rgba(15,23,42,.35); }
  .zsq-parent-head { display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-bottom: 1px solid rgba(148,163,184,.35); }
  .zsq-parent-head h2 { margin: 0; font-size: 24px; color: #0f172a; }
  .zsq-parent-body { overflow-y: auto; padding: 20px; color: #334155; font-size: 17px; line-height: 1.6; }
  .zsq-parent-body h2, .zsq-parent-body h3 { color: #0f172a; }
  .zsq-close { min-width: 64px; min-height: 56px; border-radius: 14px; border: none;
    background: #0f172a; color: #fff; font-size: 20px; font-weight: 800; cursor: pointer; padding: 10px 22px; }

  /* ---------- title screen ---------- */
  .zsq-title { position: absolute; inset: 0; pointer-events: auto;
    background: linear-gradient(160deg, #fdf4ff 0%, #fef3c7 40%, #e0f2fe 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 22px; padding: 32px; text-align: center; }
  .zsq-logo { font-size: clamp(44px, 9vw, 96px); font-weight: 900; line-height: 1.05;
    color: #92400e; text-shadow: 3px 3px 0 ${GOLD}, 8px 8px 24px rgba(180,83,9,.25);
    animation: zsq-bob 2.4s ease-in-out infinite; }
  .zsq-logo .zsq-sparkle { display: inline-block; animation: zsq-twinkle 1.6s ease-in-out infinite; }
  .zsq-tagline { font-size: clamp(20px, 3.5vw, 30px); font-weight: 700; color: #475569; max-width: 600px; line-height: 1.5; }
  .zsq-zoe-hero { width: 150px; height: 150px; border-radius: 32px; object-fit: cover;
    border: 5px solid #fff; outline: 4px solid ${GOLD};
    box-shadow: 0 14px 34px rgba(31,41,55,.25); }

  /* ---------- joystick ---------- */
  .zsq-joy { position: absolute; left: 24px; bottom: 24px; width: 148px; height: 148px;
    border-radius: 50%; background: rgba(255,255,255,.35); border: 3px solid rgba(255,255,255,.7);
    box-shadow: 0 8px 24px rgba(31,41,55,.18); pointer-events: auto; touch-action: none; }
  .zsq-joy-knob { position: absolute; left: 50%; top: 50%; width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg, #fde68a, #fbbf24); border: 3px solid ${GOLD};
    transform: translate(-50%, -50%); box-shadow: 0 4px 12px rgba(31,41,55,.25); }
  @media (pointer: fine) { .zsq-joy { display: none; } }

  button:focus-visible { outline: 4px solid rgba(14, 165, 233, 0.55); outline-offset: 3px; }

  @keyframes zsq-pop { from { transform: scale(.88); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes zsq-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes zsq-wiggle { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
  @keyframes zsq-twinkle { 0%,100% { transform: scale(1) rotate(0deg); opacity: 1; } 50% { transform: scale(1.35) rotate(18deg); opacity: .75; } }
  .zsq-interact { animation: zsq-bob 1.6s ease-in-out infinite; }
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
    parentBtn.onclick = () => { SoundFX.pop(); this.showParentCorner(() => {}); };
    pauseBtn.onclick = () => { SoundFX.pop(); if (typeof _hooks.onPause === 'function') _hooks.onPause(); };
    right.append(stars, muteBtn, parentBtn, pauseBtn);
    topbar.append(pill, right);
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

    _els = { topbar, pill, stars, muteBtn, sheet, challengeWrap, interact, toasts, celebrate, finale, parentWrap, title };
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
    if (color) dname.style.color = color;
    const dtext = el('div', 'zsq-dtext');
    const row = el('div', 'zsq-drow');
    const replay = el('button', 'zsq-replay', '🔊');
    replay.setAttribute('aria-label', 'Hear that again');
    const next = el('button', 'zsq-next', i === arr.length - 1 ? 'Done ✓' : 'Next ➜');
    row.append(replay, next);
    body.append(dname, dtext, row);
    sheet.append(img, body);

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
   * Challenge modal. data: {kicker, prompt, choices:[{id,label}], visualHtml, princessId, voiceText}
   * onChoose(choiceId)
   */
  showChallenge(data, onChoose) {
    hide(_els.sheet);
    const wrap = _els.challengeWrap;
    wrap.innerHTML = '';
    const modal = el('div', 'zsq-modal');
    const kicker = el('div', 'zsq-kicker', data.kicker || '✨ Challenge ✨');
    const prompt = el('div', 'zsq-prompt', data.prompt || '');
    modal.append(kicker, prompt);
    if (data.visualHtml) {
      const vis = el('div', 'zsq-visual');
      vis.innerHTML = data.visualHtml;
      modal.appendChild(vis);
    }
    const box = el('div', 'zsq-choices');
    const btns = {};
    for (const c of (data.choices || [])) {
      const b = el('button', 'zsq-choice', c.label || '');
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
      else b.style.opacity = '0.55';
    });
    if (message) modal.appendChild(el('div', 'zsq-answer-msg', message));
    const next = el('button', 'zsq-next', 'Next ➜');
    next.style.marginTop = '16px';
    next.onclick = () => {
      SoundFX.pop();
      hide(wrap);
      Narrator.stop();
      if (typeof onNext === 'function') onNext();
    };
    modal.appendChild(next);
  },

  /** Update the ⭐ counter with a little bump. */
  updateStars(n) {
    const s = _els.stars;
    s.innerHTML = '⭐ ' + Number(n || 0);
    s.classList.remove('zsq-bump');
    void s.offsetWidth; // restart the animation
    s.classList.add('zsq-bump');
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
    const body = el('div', 'zsq-parent-body', PARENT_HTML);
    panel.append(head, body);
    wrap.appendChild(panel);
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

    let active = false;
    const R = 46; // max knob travel in px
    const setKnob = (dx, dy) => {
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    const release = () => {
      active = false;
      setKnob(0, 0);
      joy.releasePointerCapture && joy.releasePointerCapture;
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
