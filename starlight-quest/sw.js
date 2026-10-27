/* Zoe's Starlight Quest — offline service worker. No analytics, no network calls
 * beyond this site. Bump CACHE_VERSION whenever game files change. */
const CACHE_VERSION = 'v17-20261027';
const CACHE_NAME = 'starlight-quest-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './vendor/three.module.js',
  './vendor/fonts/nunito.css?v=20261027p1',
  './vendor/fonts/nunito-latin-var.woff2',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './js/audio.js?v=20261027p1',
  './js/input.js?v=20261027p1',
  './js/ladder.js?v=20261027p1',
  './js/main.js?v=20261027p1',
  './js/padnav.js?v=20261027p1',
  './js/portrait-belle.js?v=20261027p1',
  './js/portrait-cinderella.js?v=20261027p1',
  './js/portrait-elsa.js?v=20261027p1',
  './js/portrait-rapunzel.js?v=20261027p1',
  './js/portrait-zoe.js?v=20261027p1',
  './js/quests.js?v=20261027p1',
  './js/save.js?v=20261027p1',
  './js/ui.js?v=20261027p1',
  './js/world.js?v=20261027p1',
  // Princess voice clips (shared with the Academy in the repo-root assets/).
  '../assets/audio/EN/princess_belle_greeting_01.mp3',
  '../assets/audio/EN/princess_belle_praise_01.mp3',
  '../assets/audio/EN/princess_belle_encourage_01.mp3',
  '../assets/audio/EN/princess_elsa_greeting_01.mp3',
  '../assets/audio/EN/princess_elsa_praise_01.mp3',
  '../assets/audio/EN/princess_elsa_encourage_01.mp3',
  '../assets/audio/EN/princess_rapunzel_greeting_01.mp3',
  '../assets/audio/EN/princess_rapunzel_praise_01.mp3',
  '../assets/audio/EN/princess_rapunzel_encourage_01.mp3',
  '../assets/audio/EN/princess_cinderella_greeting_01.mp3',
  '../assets/audio/EN/princess_cinderella_praise_01.mp3',
  '../assets/audio/EN/princess_cinderella_encourage_01.mp3',
  '../assets/audio/EN/princess_zoe_greeting_01.mp3',
  '../assets/audio/EN/princess_zoe_praise_01.mp3',
  '../assets/audio/EN/princess_zoe_encourage_01.mp3',
  '../assets/audio/ES/princess_belle_greeting_01.mp3',
  '../assets/audio/ES/princess_belle_praise_01.mp3',
  '../assets/audio/ES/princess_belle_encourage_01.mp3',
  '../assets/audio/ES/princess_elsa_greeting_01.mp3',
  '../assets/audio/ES/princess_elsa_praise_01.mp3',
  '../assets/audio/ES/princess_elsa_encourage_01.mp3',
  '../assets/audio/ES/princess_rapunzel_greeting_01.mp3',
  '../assets/audio/ES/princess_rapunzel_praise_01.mp3',
  '../assets/audio/ES/princess_rapunzel_encourage_01.mp3',
  '../assets/audio/ES/princess_cinderella_greeting_01.mp3',
  '../assets/audio/ES/princess_zoe_greeting_01.mp3',
  '../assets/audio/ES/princess_zoe_praise_01.mp3',
  '../assets/audio/ES/princess_zoe_encourage_01.mp3',
  // Belle phonics sound clips (wrong-answer hint plays the letter's sound)
  '../assets/audio/EN/curriculum/belle/a_says_ah_apple.mp3',
  '../assets/audio/EN/curriculum/belle/b_says_buh_ball.mp3',
  '../assets/audio/EN/curriculum/belle/c_says_kuh_cat.mp3',
  '../assets/audio/EN/curriculum/belle/d_says_duh_dog.mp3',
  '../assets/audio/EN/curriculum/belle/e_says_eh_egg.mp3',
  '../assets/audio/EN/curriculum/belle/f_says_fuh_fish.mp3',
  '../assets/audio/EN/curriculum/belle/g_says_guh_goat.mp3',
  '../assets/audio/EN/curriculum/belle/h_says_huh_hat.mp3',
  '../assets/audio/EN/curriculum/belle/i_says_ih_igloo.mp3',
  '../assets/audio/EN/curriculum/belle/j_says_juh_jar.mp3',
  '../assets/audio/EN/curriculum/belle/k_says_kuh_kite.mp3',
  '../assets/audio/EN/curriculum/belle/l_says_luh_lion.mp3',
  '../assets/audio/EN/curriculum/belle/m_says_mmm_moon.mp3',
  '../assets/audio/EN/curriculum/belle/n_says_nuh_nest.mp3',
  '../assets/audio/EN/curriculum/belle/p_says_puh_pig.mp3',
  '../assets/audio/EN/curriculum/belle/r_says_ruh_rainbow.mp3',
  '../assets/audio/EN/curriculum/belle/s_says_sss_sun.mp3',
  '../assets/audio/EN/curriculum/belle/t_says_tuh_turtle.mp3',
  '../assets/audio/EN/curriculum/belle/u_says_uh_umbrella.mp3',
  '../assets/audio/EN/curriculum/belle/v_says_vuh_van.mp3',
  '../assets/audio/EN/curriculum/belle/w_says_wuh_wagon.mp3',
  '../assets/audio/EN/curriculum/belle/y_says_yuh_yarn.mp3',
  '../assets/audio/EN/curriculum/belle/z_says_zzz_zebra.mp3',
  '../assets/audio/EN/curriculum/belle/s_h_says_shh_ship.mp3',
  '../assets/audio/EN/curriculum/belle/c_h_says_chh_chair.mp3',
  '../assets/audio/EN/curriculum/belle/t_h_says_thh_three.mp3',
  '../assets/audio/EN/curriculum/belle/w_h_says_wuh_wheel.mp3',
  '../assets/audio/EN/curriculum/belle/c_k_says_kuh_clock.mp3',
  '../assets/audio/EN/curriculum/belle/n_g_says_ing_ring.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache each file on its own so one missing clip can't break install.
    await Promise.all(PRECACHE_URLS.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res.ok) await cache.put(url, res);
      } catch (e) { /* offline during install: runtime cache will fill it */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k.startsWith('starlight-quest-') && k !== CACHE_NAME)
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/** Serve a byte range from a cached full response (Safari asks for ranges on audio). */
async function rangeResponse(full, rangeHeader) {
  const buf = await full.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader || '');
  const size = buf.byteLength;
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  end = Math.min(end, size - 1);
  if (start > end || start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  const isAudio = /\.mp3$/i.test(url.pathname);
  const range = request.headers.get('range');
  // Exact URL match only, so a new ?v= stamp always fetches the new file.
  // Only the main page ignores its query string (e.g. a ?source= link).
  let cached = await cache.match(request.url);
  if (!cached && request.mode === 'navigate') {
    cached = await cache.match(request.url, { ignoreSearch: true }) || await cache.match('./index.html');
  }
  if (cached) return (isAudio && range) ? rangeResponse(cached, range) : cached;

  try {
    // Always fetch the full file so the cached copy is complete.
    const fresh = await fetch(isAudio ? new Request(request.url) : request);
    if (fresh && fresh.ok && fresh.status === 200) {
      await cache.put(request.url, fresh.clone());
      if (isAudio && range) return rangeResponse(fresh, range);
    }
    return fresh;
  } catch (err) {
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // nothing external is used
  event.respondWith(cacheFirst(request));
});
