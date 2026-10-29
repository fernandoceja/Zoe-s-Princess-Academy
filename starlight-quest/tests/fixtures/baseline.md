# R4 baseline (recorded in P0.2)

- main SHA: `9af10dbb660a7610d65b291feb8eaf6abfe03c94` (main @ 9af10db, after plan PR #114; engine unchanged since 17186bf)
- Test pass count on main: 35 of 35 (`for t in starlight-quest/tests/*_check.mjs; do node $t >/dev/null 2>&1 && echo ok || echo FAIL $t; done` → 35 ok)
- CACHE_VERSION (starlight-quest/sw.js): `v19-20261028`
- Import stamp: `?v=20261028r3`
- Live sw.js line 3 (https://fernandoceja.github.io/Zoe-s-Princess-Academy/starlight-quest/sw.js):
  `const CACHE_VERSION = 'v19-20261028';`
