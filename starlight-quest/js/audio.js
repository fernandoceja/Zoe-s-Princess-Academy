/* Zoe's Starlight Quest — audio systems
 * SoundFX: gentle WebAudio oscillator chimes (never harsh, no buzzers).
 * Narrator: tries ElevenLabs MP3s first, gracefully falls back to
 * speechSynthesis with per-princess pitch/rate when files are absent.
 * ES module, zero network requests on its own.
 */

import { PRINCESSES } from './quests.js?v=20261026t1';

export let LANG = 'EN';
export function setLang(l) {
  LANG = (l === 'ES') ? 'ES' : 'EN';
}

/* ------------------------------ SoundFX ------------------------------ */

let _ctx = null;

function _master(ctx) {
  const g = ctx.createGain();
  g.gain.value = 0.22; // keep everything soft for little ears
  g.connect(ctx.destination);
  return g;
}

/** Soft plink of a single note. freq in Hz, delay in seconds. */
function _plink(ctx, master, freq, delay = 0, dur = 0.45) {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Gentle bell-ish envelope: quick soft attack, long warm decay.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.9, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
  // Add a whisper of a harmonic shimmer on top.
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2;
  g2.gain.setValueAtTime(0.0001, t0);
  g2.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.7);
  osc2.connect(g2);
  g2.connect(master);
  osc2.start(t0);
  osc2.stop(t0 + dur);
}

// C-major pentatonic neighborhood — always sweet, never dissonant.
const NOTES = {
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98
};

export const SoundFX = {
  /** Create/resume the AudioContext. Call on first user gesture (Start button). */
  ensure() {
    try {
      if (!_ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        _ctx = new AC();
      }
      if (_ctx.state === 'suspended') {
        _ctx.resume().catch(() => {});
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  _ready() {
    return this.ensure() && !!_ctx;
  },

  /** One soft chime. */
  chime() {
    if (!this._ready()) return;
    _plink(_ctx, _master(_ctx), NOTES.E5);
  },

  /** Little rising major arpeggio for big wins. */
  fanfare() {
    if (!this._ready()) return;
    const m = _master(_ctx);
    [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) =>
      _plink(_ctx, m, f, i * 0.11, 0.6)
    );
  },

  /** Short friendly blip for taps / button presses. */
  pop() {
    if (!this._ready()) return;
    _plink(_ctx, _master(_ctx), NOTES.G5, 0, 0.22);
  },

  /** Twinkly sparkle sweep for star rewards. */
  sparkle() {
    if (!this._ready()) return;
    const m = _master(_ctx);
    [NOTES.E5, NOTES.G5, NOTES.A5, NOTES.C6, NOTES.E6].forEach((f, i) =>
      _plink(_ctx, m, f, i * 0.06, 0.5)
    );
  }
};

/* ------------------------------ Narrator ----------------------------- */

let _muted = false;
let _currentAudio = null;   // in-flight MP3 element
let _speaking = false;      // true while an MP3 or TTS utterance is playing

function _stopTTS() {
  try {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch (e) {}
}

function _stopMP3() {
  try {
    if (_currentAudio) {
      _currentAudio.onended = _currentAudio.onerror = null;
      _currentAudio.pause();
      _currentAudio = null;
    }
  } catch (e) {}
}

// Chosen voice per language prefix; cleared when the voice list changes.
const _voiceCache = {};
try {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      for (const k of Object.keys(_voiceCache)) delete _voiceCache[k];
    });
  }
} catch (e) {}

/** Pick a warm young-female-ish voice for the given language, if one exists.
 *  Any Enhanced/Premium voice in the language wins (preferred names first among
 *  them); otherwise the original logic over all in-language voices. */
function _pickVoice(langPrefix) {
  try {
    if (_voiceCache[langPrefix]) return _voiceCache[langPrefix];
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;
    const inLang = voices.filter(v => (v.lang || '').toLowerCase().startsWith(langPrefix));
    const pool = inLang.length ? inLang : voices;
    // Prefer commonly-available warm female voices; else the first in-language voice.
    const preferred = [
      /samantha/i, /zira/i, /karen/i, /moira/i, /tessa/i, /veena/i,
      /google us english/i, /google español/i, /female/i, /mujer/i, /niña/i
    ];
    const pickFrom = (list) => {
      for (const rx of preferred) {
        const hit = list.find(v => rx.test(v.name || ''));
        if (hit) return hit;
      }
      return null;
    };
    const enhanced = pool.filter(v => /enhanced|premium/i.test(v.name || ''));
    const chosen = (enhanced.length && (pickFrom(enhanced) || enhanced[0])) || pickFrom(pool) || pool[0];
    if (chosen) _voiceCache[langPrefix] = chosen;
    return chosen;
  } catch (e) {
    return null;
  }
}

function _voiceParams(princessId) {
  const p = (typeof PRINCESSES !== 'undefined' && PRINCESSES && PRINCESSES[princessId]) || null;
  const v = (p && p.voice) || {};
  return {
    pitch: (typeof v.pitch === 'number') ? v.pitch : 1.15,
    rate: (typeof v.rate === 'number') ? v.rate : 0.95
  };
}

// Each new speak bumps _seq; an onDone callback only fires if nothing newer
// has started (so a cancelled line never triggers its follow-up).
let _seq = 0;
function _once(onDone) {
  const my = _seq;
  let fired = false;
  return () => {
    if (fired || my !== _seq || typeof onDone !== 'function') return;
    fired = true;
    onDone();
  };
}

function _speakTTS(text, { pitch = 1.15, rate = 0.95 } = {}, onDone) {
  if (_muted || !text) { if (onDone) onDone(); return; }
  try {
    if (!('speechSynthesis' in window)) return;
    _stopTTS();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = LANG === 'ES' ? 'es-US' : 'en-US';
    u.pitch = pitch;
    u.rate = rate;
    u.volume = 1;
    const voice = _pickVoice(LANG === 'ES' ? 'es' : 'en');
    if (voice) u.voice = voice;
    _speaking = true;
    u.onend = u.onerror = () => { _speaking = false; if (onDone) onDone(); };
    window.speechSynthesis.speak(u);
  } catch (e) { if (onDone) onDone(); }
}

/**
 * Speak one princess line. Tries the ElevenLabs MP3 first; on any load
 * error (missing file, 404, decode failure) falls back to speechSynthesis
 * with that princess's pitch/rate. Cancels anything in flight first.
 */
function _speakPrincess(princessId, kind, text, onDone) {
  _stopTTS();
  _stopMP3();
  _speaking = false;
  _seq++;
  const done = _once(onDone);
  if (_muted) return;
  const textStr = String(text || '');

  // NOTE: when deployed as starlight-quest/ inside Zoe's Princess Academy repo,
  // the voice MP3s live in the repo-root assets/audio/ folder (shared with the Academy).
  const url = '../assets/audio/' + LANG + '/princess_' + princessId + '_' + kind + '_01.mp3';
  let mp3Ok = false;

  try {
    if (typeof Audio === 'undefined') {
      const vp = _voiceParams(princessId);
      _speakTTS(textStr, vp, done);
      return;
    }
    const a = new Audio();
    _currentAudio = a;
    let fellBack = false;

    const fallback = () => {
      if (fellBack) return;
      fellBack = true;
      _stopMP3();
      const vp = _voiceParams(princessId);
      _speakTTS(textStr, vp, done);
    };

    a.onerror = fallback;
    a.onstalled = () => setTimeout(() => { if (!mp3Ok) fallback(); }, 2500);
    a.onended = () => { if (!fellBack) { _speaking = false; _currentAudio = null; done(); } };
    a.oncanplaythrough = () => {
      mp3Ok = true;
      _speaking = true;
      a.play().catch(fallback);
    };
    // If canplaythrough never fires (file missing → error), the timeout
    // below is our last-resort net so the child never waits in silence.
    setTimeout(() => { if (!mp3Ok && !fellBack) fallback(); }, 3000);
    a.src = url;
    a.load();
  } catch (e) {
    const vp = _voiceParams(princessId);
    _speakTTS(textStr, vp, done);
  }
}

export const Narrator = {
  get muted() { return _muted; },

  /** Mute or unmute narration. Muting also stops anything playing. */
  setMuted(m) {
    _muted = !!m;
    if (_muted) this.stop();
  },

  /** Stop any in-flight MP3 or TTS. */
  stop() {
    _stopTTS();
    _stopMP3();
    _speaking = false;
  },

  /**
   * Speak a princess line: speak(princessId, kind, text).
   * kind is 'greeting' | 'praise' | 'encourage'.
   */
  speak(princessId, kind, text, onDone) {
    _speakPrincess(princessId, kind, text, onDone);
  },

  /**
   * Speak a princess line as exact text via TTS with her voice shaping,
   * skipping the MP3. Use for quest-specific lines (story, questions,
   * hints) where the spoken words must match the on-screen text.
   */
  speakExact(princessId, text, onDone) {
    _stopTTS();
    _stopMP3();
    _speaking = false;
    _seq++;
    _speakTTS(text, _voiceParams(princessId), _once(onDone));
  },

  /**
   * Play one recorded clip by URL, then call onDone. Respects mute and cancels
   * anything in flight. If the clip is missing or fails, it is skipped silently
   * (no TTS fallback) and onDone still fires, unless something newer started.
   */
  playClip(url, onDone) {
    _stopTTS();
    _stopMP3();
    _speaking = false;
    _seq++;
    const done = _once(onDone);
    if (_muted) return;
    try {
      if (typeof Audio === 'undefined') { done(); return; }
      const a = new Audio();
      _currentAudio = a;
      let over = false;
      const finish = () => {
        if (over) return;
        over = true;
        if (_currentAudio === a) { _stopMP3(); _speaking = false; }
        done();
      };
      a.onerror = finish;
      a.onended = finish;
      a.oncanplaythrough = () => {
        _speaking = true;
        a.play().catch(finish);
      };
      setTimeout(() => { if (!_speaking) finish(); }, 3000);
      a.src = url;
      a.load();
    } catch (e) { done(); }
  },

  /** Speak a non-princess line with explicit voice shaping. */
  speakText(text, { pitch = 1.1, rate = 0.95 } = {}) {
    _stopTTS();
    _stopMP3();
    _speaking = false;
    _seq++;
    _speakTTS(text, { pitch, rate });
  }
};

/* --------------------------- iOS audio care --------------------------- */
// 1) Ask iOS (Safari 16.4+/17) to treat this as media playback, so voice clips
//    and chimes keep playing when the ring/silent switch is on silent.
// 2) After the app is hidden (lock screen, app switch) iOS suspends audio:
//    resume the AudioContext, paused clips and speech on return, and again on
//    the very next touch/click/key (iOS only allows resume inside a gesture).

/** True when the browser lets us opt out of the silent switch. */
export function canBypassSilentSwitch() {
  try { return !!(navigator.audioSession && 'type' in navigator.audioSession); } catch (e) { return false; }
}

export function isIOS() {
  try {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  } catch (e) { return false; }
}

function _setPlaybackSession() {
  try { if (canBypassSilentSwitch()) navigator.audioSession.type = 'playback'; } catch (e) {}
}

function _resumeAll() {
  _setPlaybackSession();
  try { if (_ctx && _ctx.state !== 'running') _ctx.resume().catch(() => {}); } catch (e) {}
  try {
    if (_currentAudio && _currentAudio.paused && !_currentAudio.ended && _currentAudio.currentTime > 0) {
      _currentAudio.play().catch(() => {});
    }
  } catch (e) {}
  try { if ('speechSynthesis' in window && window.speechSynthesis.paused) window.speechSynthesis.resume(); } catch (e) {}
}

let _audioCareOn = false;
export function installAudioCare() {
  if (_audioCareOn || typeof window === 'undefined') return;
  _audioCareOn = true;
  _setPlaybackSession();
  const onGesture = () => _resumeAll();
  // Every gesture is cheap to handle and keeps audio unlocked after a lock/unlock.
  ['touchend', 'pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, onGesture, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) _resumeAll(); });
  window.addEventListener('pageshow', _resumeAll);
  window.addEventListener('focus', _resumeAll);
}
