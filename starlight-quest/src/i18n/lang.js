/* Zoe's Starlight Quest — English / Español switch (Nov 16).
 * The engine and the screens stay written in English. When Spanish is on:
 *  - the words on screen are swapped for their Spanish (src/i18n/es.js) as they appear, whole lines only, and put
 *    back when English is chosen again;
 *  - every spoken line is the same Spanish, read by the Spanish voice (or the princess's Spanish clip when the
 *    words match it exactly, src/flow/say.js); a line with no Spanish stays English, shown and spoken.
 * Reading rounds (and Rapunzel's plant rounds) teach English words, so while one is on screen the question sheet
 * (marked data-zsq-en) and her voice stay English: the answers are the same cards in both languages.
 * Parent Corner is marked data-zsq-en too (it is for grown-ups).
 */
import { Narrator, setLang } from '../engine-dom.js';
import { Save } from '../engine-core.js';
import { toEs } from './es.js';

// Lands whose questions stay in English (reading, and Rapunzel's plants, not translated yet).
export const ENGLISH_ROUND_NPCS = ['belle', 'ariel', 'anna', 'jasmine', 'aurora', 'rapunzel'];

let mode = 'EN';
let englishRound = false;

// The engine's own voice calls, before Spanish is wired around them.
const raw = {
  speak: Narrator.speak.bind(Narrator),
  speakExact: Narrator.speakExact.bind(Narrator),
  speakText: Narrator.speakText.bind(Narrator),
};

export const langMode = () => mode;
/** True when lines should be Spanish right now (Spanish on, and not inside an English reading round). */
export const spanishNow = () => mode === 'ES' && !englishRound;
/** While a reading round is up, her voice stays English. */
export function setEnglishRound(on) { englishRound = !!on; }

/** The engine voice in one language: { speak, speakExact } (for say.js, which already chose the words). */
export function voiceIn(lang) {
  return {
    speak: (id, kind, text, done) => { setLang(lang); raw.speak(id, kind, text, done); },
    speakExact: (id, text, done) => { setLang(lang); raw.speakExact(id, text, done); },
  };
}

/** The words to speak for a shown English line, and set the voice language to match. */
export function spokenFor(text) {
  if (spanishNow()) {
    const es = toEs(text);
    if (es) { setLang('ES'); return es; }
  }
  setLang('EN');
  return text;
}

// Every other spoken line in the app goes through these.
Narrator.speakExact = (id, text, done) => raw.speakExact(id, spokenFor(text), done);
Narrator.speakText = (text, opts) => raw.speakText(spokenFor(text), opts);

// --- The words on screen ----------------------------------------------------------------------------------
const shown = new Map();   // Text node -> the English React (or the engine) last wrote there
const wrote = new WeakMap(); // Text node -> what we wrote, so our own writes are not taken for React's
let observer = null;

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT']);
function skipped(el) {
  if (!el || el.nodeType !== 1) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  return !!(el.closest && el.closest('[data-zsq-en],[contenteditable="true"]'));
}

/** What the node says in English: React's latest text, unless the text there now is ours. */
function englishOf(node) {
  const now = node.nodeValue;
  if (shown.has(node) && wrote.get(node) === now) return shown.get(node);
  shown.set(node, now);
  return now;
}

function put(node, text) {
  if (node.nodeValue !== text) node.nodeValue = text;
  wrote.set(node, text);
}

/** Translate one element's run of text: all its text children together when it holds only text, else node by node. */
function fixParent(el) {
  if (skipped(el)) return;
  const kids = Array.from(el.childNodes);
  const texts = kids.filter((n) => n.nodeType === 3);
  if (!texts.length) return;
  if (texts.length > 1 && texts.length === kids.length) {
    const en = texts.map(englishOf);
    const es = toEs(en.join(''));
    texts.forEach((n, i) => put(n, es ? (i === 0 ? es : '') : en[i]));
    return;
  }
  for (const n of texts) {
    const en = englishOf(n);
    const es = toEs(en);
    put(n, es || en);
  }
}

function walk(root) {
  if (!root) return;
  if (root.nodeType === 3) { fixParent(root.parentNode); return; }
  if (root.nodeType !== 1 || skipped(root)) return;
  const parents = new Set();
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = it.nextNode(); n; n = it.nextNode()) parents.add(n.parentNode);
  parents.forEach(fixParent);
  for (const el of root.querySelectorAll('[aria-label]')) fixLabel(el);
  if (root.hasAttribute && root.hasAttribute('aria-label')) fixLabel(root);
}

const labels = new Map(); // element -> English aria-label
function fixLabel(el) {
  if (skipped(el)) return;
  const now = el.getAttribute('aria-label');
  const mine = el.__zsqLabel;
  const en = mine !== undefined && mine === now ? labels.get(el) : now;
  labels.set(el, en);
  const es = toEs(en) || en;
  el.__zsqLabel = es;
  if (now !== es) el.setAttribute('aria-label', es);
}

function onMutations(list) {
  if (shown.size > 3000) for (const n of shown.keys()) if (!n.isConnected) shown.delete(n);
  if (labels.size > 500) for (const el of labels.keys()) if (!el.isConnected) labels.delete(el);
  const parents = new Set();
  for (const m of list) {
    if (m.type === 'characterData') { if (wrote.get(m.target) !== m.target.nodeValue) parents.add(m.target.parentNode); }
    else if (m.type === 'attributes') { if (m.target.__zsqLabel !== m.target.getAttribute('aria-label')) fixLabel(m.target); }
    else {
      parents.add(m.target);
      m.addedNodes.forEach((n) => { if (n.nodeType === 1) walk(n); });
    }
  }
  parents.forEach((p) => p && fixParent(p));
}

function startScreen() {
  if (observer || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(onMutations);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label'] });
  walk(document.body);
}

function stopScreen() {
  if (observer) { observer.disconnect(); observer = null; }
  for (const [n, en] of shown) { if (n.isConnected && wrote.get(n) === n.nodeValue) n.nodeValue = en; }
  shown.clear();
  for (const [el, en] of labels) { if (el.isConnected && el.__zsqLabel === el.getAttribute('aria-label')) el.setAttribute('aria-label', en); delete el.__zsqLabel; }
  labels.clear();
}

/** Turn Spanish on or off ('ES' | 'EN'): the screen, the voice and the page language follow. */
export function applyLang(l) {
  mode = l === 'ES' ? 'ES' : 'EN';
  setLang(mode);
  try { document.documentElement.lang = mode === 'ES' ? 'es' : 'en'; } catch (e) { /* no page */ }
  if (mode === 'ES') startScreen(); else stopScreen();
  return mode;
}

// Start in the saved language before the first screen speaks (the title talks before App's boot effect runs).
try {
  if (document.body && Save.load().lang === 'ES') applyLang('ES');
} catch (e) { /* no storage: App's boot applies it */ }
