// ============================================================================
// Zoe's Starlight Quest — 3D World Module
// Stylized pastel low-poly hub world with four lands, Princess Zoe player,
// four NPC princesses, interaction hooks, and celebration effects.
// Three.js as ES module: `import * as THREE from 'three';` (importmap 'three').
// ============================================================================

import * as THREE from 'three';
import { Input } from './input.js?v=20261027p1';
import { OUTFIT } from './save.js?v=20261027p1';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GOLD = 0xebd373;
const WORLD_RADIUS = 34;          // invisible wall radius
const PRINCESS_SCALE = 1.2;       // princesses and Zoe stand a little taller than the scenery props
const NPC_INTERACT_DIST = 3.5;    // proximity radius for onNearNPC
const PLAYER_SPEED = 7.5;         // units / second

// Land id -> compass direction (radians on XZ) + world slot.
const LANDS = {
  library:  { angle: -Math.PI / 2, label: 'Whispering Library' },   // north (-Z)
  frostfall: { angle: 0,            label: 'Frostfall Peaks' },      // east (+X)
  meadow:   { angle: Math.PI / 2,  label: 'Sunflower Meadows' },     // south (+Z)
  village:  { angle: Math.PI,       label: 'Glass Slipper Village' }, // west (-X)
};

const NPC_DEFS = {
  belle:     { land: 'library',   dress: 0x5b8def, accent: 0xffd76a, hair: 0x6b4226, hairStyle: 'bun',   name: 'Belle' },
  elsa:      { land: 'frostfall', dress: 0x9fd8f0, accent: 0xffffff, hair: 0xf5ecd7, hairStyle: 'braid', name: 'Elsa' },
  rapunzel:  { land: 'meadow',    dress: 0x9fe6a8, accent: 0xff9ec6, hair: 0xffd34d, hairStyle: 'long',  name: 'Rapunzel' },
  cinderella:{ land: 'village',   dress: 0xa9d3f5, accent: 0xfff2b0, hair: 0xd9a05b, hairStyle: 'bun',   name: 'Cinderella' },
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function makeCanvasSprite(draw, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Seeded RNG (mulberry32): same layout on every load. Use for any new scenery placement.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0x5741a11);

// 5-point star shape, reused for all star markers.
function starGeometry(outer = 0.45, inner = 0.19) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

// ---------------------------------------------------------------------------
// Princess figure builder (player + NPCs share this)
// ---------------------------------------------------------------------------

const _geo = {};
function G(key, make) {
  if (!_geo[key]) _geo[key] = make();
  return _geo[key];
}
const _mat = {};
function M(key, make) {
  if (!_mat[key]) _mat[key] = make();
  return _mat[key];
}

/**
 * Build a stylized low-poly princess.
 * opts: { dress, accent, hair, hairStyle: 'wavy'|'long'|'bun'|'braid', tiara: bool, tiaraColor?: 'silver', fancy?: bool (Zoe only: overskirt, hem trim, gem tiara, earrings, bodice gem) }
 * Returns { group, hitMeshes } — hitMeshes tagged for raycasting.
 */
function buildPrincess(opts, tagId) {
  const group = new THREE.Group();
  const hitMeshes = [];
  let tiaraGemMat = null;
  const skin = M('skin', () => new THREE.MeshStandardMaterial({ color: 0xf6cfa8, roughness: 0.8 }));
  const dressMat = new THREE.MeshStandardMaterial({ color: opts.dress, roughness: 0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color: opts.accent, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: opts.hair, roughness: 0.85 });
  const goldMat = M('gold', () => new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.35, metalness: 0, emissive: 0x7a5a14, emissiveIntensity: 0.9 }));
  const silverMat = M('silver', () => new THREE.MeshStandardMaterial({ color: 0xe9eef5, roughness: 0.25, metalness: 0, emissive: 0x9aa6b8, emissiveIntensity: 0.5 }));

  const add = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    group.add(mesh);
    mesh.userData.npcId = tagId || null;
    hitMeshes.push(mesh);
    return mesh;
  };

  // Dress: cone + puffy sleeves (two spheres)
  add(new THREE.Mesh(G('dressCone', () => new THREE.ConeGeometry(0.55, 1.3, 12)), dressMat), 0, 0.65, 0);
  const sleeveGeo = G('sleeve', () => new THREE.SphereGeometry(0.2, 10, 8));
  add(new THREE.Mesh(sleeveGeo, dressMat), -0.52, 1.28, 0);
  add(new THREE.Mesh(sleeveGeo, dressMat), 0.52, 1.28, 0);
  // Bodice
  add(new THREE.Mesh(G('bodice', () => new THREE.CylinderGeometry(0.24, 0.3, 0.45, 10)), accentMat), 0, 1.32, 0);
  if (opts.fancy) {
    // Short lilac overskirt (peplum) so the pink skirt still shows below, like her portrait;, white-gold hem trim, bodice star gem
    add(new THREE.Mesh(G('overskirt', () => new THREE.ConeGeometry(0.42, 0.5, 12, 1, true)), accentMat), 0, 1.0, 0).material.side = THREE.DoubleSide;
    const trimMat = M('hemTrim', () => new THREE.MeshStandardMaterial({ color: 0xfff6e6, roughness: 0.5, emissive: 0xc8a24a, emissiveIntensity: 0.25 }));
    add(new THREE.Mesh(G('hemTrim', () => new THREE.TorusGeometry(0.55, 0.035, 6, 24)), trimMat), 0, 0.04, 0).rotation.x = Math.PI / 2;
    const gemMat = M('pinkGem', () => new THREE.MeshStandardMaterial({ color: 0xff7fb0, roughness: 0.3, emissive: 0xff4f90, emissiveIntensity: 0.35 }));
    add(new THREE.Mesh(G('bodiceStar', () => starGeometry(0.075, 0.032)), gemMat), 0, 1.36, 0.285);
  }
  // Arms (skin capsules simplified as thin cylinders)
  const armGeo = G('arm', () => new THREE.CylinderGeometry(0.06, 0.05, 0.5, 8));
  add(new THREE.Mesh(armGeo, skin), -0.56, 1.05, 0).rotation.z = 0.25;
  add(new THREE.Mesh(armGeo, skin), 0.56, 1.05, 0).rotation.z = -0.25;
  // Head
  add(new THREE.Mesh(G('head', () => new THREE.SphereGeometry(0.32, 14, 12)), skin), 0, 1.86, 0);
  // Cheek blush: two tiny pink spheres
  const blushMat = M('blush', () => new THREE.MeshStandardMaterial({ color: 0xff9eb0, roughness: 1 }));
  const blushGeo = G('blush', () => new THREE.SphereGeometry(0.045, 8, 6));
  add(new THREE.Mesh(blushGeo, blushMat), -0.14, 1.8, 0.28);
  add(new THREE.Mesh(blushGeo, blushMat), 0.14, 1.8, 0.28);
  // Face: two small dark eyes with a white glint each, and a soft smile arc
  const eyeMat = M('eye', () => new THREE.MeshStandardMaterial({ color: 0x2a1f3d, roughness: 0.4 }));
  const glintMat = M('glint', () => new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const smileMat = M('smile', () => new THREE.MeshStandardMaterial({ color: 0xb04a6a, roughness: 0.6 }));
  const eyeGeo = G('eye', () => new THREE.SphereGeometry(0.045, 10, 8));
  const glintGeo = G('glint', () => new THREE.SphereGeometry(0.014, 6, 6));
  [-1, 1].forEach((s) => {
    add(new THREE.Mesh(eyeGeo, eyeMat), s * 0.1, 1.87, 0.29).scale.set(0.9, 1.2, 0.6);
    add(new THREE.Mesh(glintGeo, glintMat), s * 0.1 + 0.015, 1.895, 0.315);
  });
  // Lower half of a thin ring = smile
  add(new THREE.Mesh(G('smile', () => new THREE.TorusGeometry(0.07, 0.012, 6, 12, Math.PI)), smileMat), 0, 1.79, 0.3).rotation.z = Math.PI;

  // Hair by style
  if (opts.hairStyle === 'wavy') {
    // Long wavy dark-brown hair: flattened sphere mass behind head + side falls
    const mass = add(new THREE.Mesh(G('hairMass', () => new THREE.SphereGeometry(0.4, 12, 10)), hairMat), 0, 1.78, -0.18);
    mass.scale.set(1.05, 1.7, 0.8);
    const fz = opts.fancy ? 0.05 - 0.08 : 0.05; // fancy: side falls sit back so her face shows from above
    const fallGeo = G('hairFall', () => new THREE.SphereGeometry(0.16, 8, 8));
    const l = add(new THREE.Mesh(fallGeo, hairMat), -0.32, 1.35, fz); l.scale.set(1, 2.2, 1);
    const r = add(new THREE.Mesh(fallGeo, hairMat), 0.32, 1.35, fz); r.scale.set(1, 2.2, 1);
    // Cap over the top of the head
    add(new THREE.Mesh(G('hairCap', () => new THREE.SphereGeometry(0.335, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)), hairMat), 0, 1.88, -0.02);
  } else if (opts.hairStyle === 'long') {
    const mass = add(new THREE.Mesh(G('hairMass', () => new THREE.SphereGeometry(0.4, 12, 10)), hairMat), 0, 1.7, -0.2);
    mass.scale.set(1.0, 2.1, 0.75);
    add(new THREE.Mesh(G('hairCap', () => new THREE.SphereGeometry(0.335, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)), hairMat), 0, 1.88, -0.02);
  } else if (opts.hairStyle === 'braid') {
    add(new THREE.Mesh(G('hairCap', () => new THREE.SphereGeometry(0.335, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)), hairMat), 0, 1.88, -0.02);
    const braidGeo = G('braid', () => new THREE.SphereGeometry(0.11, 8, 8));
    for (let i = 0; i < 4; i++) {
      const b = add(new THREE.Mesh(braidGeo, hairMat), 0.22 - i * 0.02, 1.5 - i * 0.28, -0.32 - i * 0.03);
      b.scale.set(1, 1.4, 1);
    }
  } else { // 'bun'
    add(new THREE.Mesh(G('hairCap', () => new THREE.SphereGeometry(0.335, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)), hairMat), 0, 1.88, -0.02);
    add(new THREE.Mesh(G('bun', () => new THREE.SphereGeometry(0.18, 10, 8)), hairMat), 0, 2.22, -0.18);
  }

  // Tiny tiara: gold, or silver for Zoe (matches her portrait)
  if (opts.tiara !== false) {
    const tiara = add(new THREE.Mesh(G('tiara', () => new THREE.TorusGeometry(0.16, 0.035, 8, 16, Math.PI)), opts.tiaraColor === 'silver' ? silverMat : goldMat), 0, 2.12, 0.02);
    tiara.rotation.x = -0.15;
    if (opts.fancy) {
      // Bigger, more upright tiara with three pink gems along the top
      tiara.scale.setScalar(1.4);
      tiara.rotation.x = -1.0;
      // Zoe's own copy of the pink gem (the Wardrobe recolors it; the shared pinkGem stays pink)
      const gemMat = tiaraGemMat = M('pinkGem', () => new THREE.MeshStandardMaterial({ color: 0xff7fb0, roughness: 0.3, emissive: 0xff4f90, emissiveIntensity: 0.35 })).clone();
      const tGemGeo = G('tiaraGem', () => new THREE.SphereGeometry(0.045, 8, 6));
      [0.28, 0.5, 0.72].forEach((t) => {
        const a = Math.PI * t;
        add(new THREE.Mesh(tGemGeo, gemMat), Math.cos(a) * 0.16, Math.sin(a) * 0.16 + 0.03, 0);
        tiara.add(group.children[group.children.length - 1]); // reparent so gems follow the tiara tilt/scale
      });
    }
  }
  if (opts.fancy) {
    // Pink drop earrings just below the ears
    const earMat = M('pinkGem', () => new THREE.MeshStandardMaterial({ color: 0xff7fb0, roughness: 0.3, emissive: 0xff4f90, emissiveIntensity: 0.35 }));
    const earGeo = G('earring', () => new THREE.SphereGeometry(0.03, 8, 6));
    [-1, 1].forEach((sx) => add(new THREE.Mesh(earGeo, earMat), sx * 0.3, 1.72, 0.05));
  }

  group.scale.setScalar(PRINCESS_SCALE);
  return { group, hitMeshes, dressMat, tiaraGemMat };
}

// ---------------------------------------------------------------------------
// createWorld
// ---------------------------------------------------------------------------

export function createWorld(container, hooks) {
  hooks = hooks || {};
  const onNearNPC = typeof hooks.onNearNPC === 'function' ? hooks.onNearNPC : () => {};
  const onInteractRequest = typeof hooks.onInteractRequest === 'function' ? hooks.onInteractRequest : () => {};
  const onPauseRequest = typeof hooks.onPauseRequest === 'function' ? hooks.onPauseRequest : () => {};
  const onWorldTap = typeof hooks.onWorldTap === 'function' ? hooks.onWorldTap : () => {};

  // --- Renderer / scene / camera -------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // Lighter on phones/tablets (cooler device, longer battery): cap at 1.5 on touch or small screens, 2 on desktop.
  const isHandheld = (() => {
    try {
      if (window.matchMedia && matchMedia('(pointer: coarse)').matches) return true;
      if ((navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window) return true;
    } catch (e) { /* fall through to size check */ }
    return Math.min(window.innerWidth || 0, window.innerHeight || 0) <= 820;
  })();
  const deviceRatio = window.devicePixelRatio || 1;
  let worldPaused = false; // declared early: onResize reads it
  let pixelRatio = Math.min(deviceRatio, isHandheld ? 1.5 : 2);
  const MIN_PIXEL_RATIO = 1.25; // adaptive step-down floor (one step, once per session)
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdff3ff); // soft sky
  scene.fog = new THREE.Fog(0xdff3ff, 45, 95);

  // Sky dome: soft pastel at the horizon (matches the fog) to gentle lavender-blue overhead.
  // Vertex colours only, one draw call; it follows the camera so it never moves relative to the view.
  const skyMesh = (() => {
    const geo = new THREE.SphereGeometry(250, 24, 16);
    const horizon = new THREE.Color(0xdff3ff), zenith = new THREE.Color(0xbcd0f7), tmp = new THREE.Color();
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const h = Math.max(0, pos.getY(i) / 250); // 0 at/below horizon, 1 overhead
      tmp.copy(horizon).lerp(zenith, Math.pow(h, 0.7));
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
    }));
    m.renderOrder = -10;
    m.frustumCulled = false;
    return m;
  })();
  scene.add(skyMesh);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);

  // Lights: soft cool-lilac sky fill + warm low golden-afternoon sun for a lit side and a shade side; no shadow maps (tablet perf)
  scene.add(new THREE.HemisphereLight(0xf3f0ff, 0xb8dca0, 1.05));
  const sun = new THREE.DirectionalLight(0xffe0b5, 1.7);
  sun.position.set(18, 20, 14);
  scene.add(sun);

  // --- Colliders ------------------------------------------------------------
  let pondTwinkle = null; // per-frame pond twinkle fader (set in the meadow block, run in update)
  const colliders = []; // {x, z, r, shadowR?}
  // shadowR (optional): ground-shadow radius when the visible footprint is wider than the collider
  const addCollider = (x, z, r, shadowR) => colliders.push({ x, z, r, shadowR });

  // flatShading gives each low-poly facet its own shade (storybook look, no cost)
  const pastel = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true });
  const goldMat = M('gold', () => new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.35, metalness: 0, emissive: 0x7a5a14, emissiveIntensity: 0.9 }));

  // --- Ground: big soft disc, reaches past the fog so the far edge fades into the sky ---
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(160, 64),
    pastel(0xb3e29c)
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Gentle green tint patches (very cheap, flat discs; 4 deeper, 4 lighter)
  const patchGeo = new THREE.CircleGeometry(9, 24);
  const patchMat = pastel(0xa3d68a);
  [[-14, 8], [14, -6], [-6, -16], [10, 14]].forEach(([x, z]) => {
    const p = new THREE.Mesh(patchGeo, patchMat);
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.01, z);
    scene.add(p);
  });
  const patchMatLight = pastel(0xc9eeb0);
  [[-22, -2], [22, 8], [-4, 22], [6, -24]].forEach(([x, z]) => {
    const p = new THREE.Mesh(patchGeo, patchMatLight);
    // Slightly below the deeper patches so overlaps don't z-fight
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.005, z);
    scene.add(p);
  });

  // --- Hub plaza ------------------------------------------------------------
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(8.5, 40), pastel(0xfcefdc));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02;
  scene.add(plaza);
  // Gold ring around plaza
  const ring = new THREE.Mesh(new THREE.RingGeometry(8.5, 9.1, 48), goldMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  scene.add(ring);

  // Paths: 4 straight ribbons from plaza edge outward to each land
  const pathGeo = new THREE.PlaneGeometry(4.4, 16);
  const pathMat = pastel(0xf2deb6);
  Object.values(LANDS).forEach((land) => {
    const dir = new THREE.Vector3(Math.cos(land.angle), 0, Math.sin(land.angle));
    const p = new THREE.Mesh(pathGeo, pathMat);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = -land.angle + Math.PI / 2;
    p.position.copy(dir.clone().multiplyScalar(16.5));
    p.position.y = 0.025;
    scene.add(p);
  });

  // Path edge stones, path end caps and plaza star
  {
    const STONES_PER_EDGE = 10;
    const stoneMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.32, 0.38, 0.08, 7),
      new THREE.MeshStandardMaterial({ color: 0xfff4e2, roughness: 0.85, flatShading: true }),
      Object.keys(LANDS).length * 2 * STONES_PER_EDGE
    );
    const dummy = new THREE.Object3D();
    let si = 0;
    Object.values(LANDS).forEach((land) => {
      const dx = Math.cos(land.angle), dz = Math.sin(land.angle);
      for (const side of [-1, 1]) {
        for (let i = 0; i < STONES_PER_EDGE; i++, si++) {
          const t = 9.3 + i * 1.6;                       // distance along the path from the hub centre
          const off = side * 2.5;                        // just outside the 4.4-wide walking lane
          dummy.position.set(dx * t - dz * off, 0.06, dz * t + dx * off);
          dummy.rotation.set(0, ((si * 37) % 11) * 0.57, 0);
          const s = 0.88 + ((si * 7) % 5) * 0.06;        // tiny deterministic size variation
          dummy.scale.set(s, 1, s);
          dummy.updateMatrix();
          stoneMesh.setMatrixAt(si, dummy.matrix);
        }
      }
    });
    stoneMesh.instanceMatrix.needsUpdate = true;
    scene.add(stoneMesh);

    // Round cap at the outer end of each path (paths run 8.5 to 24.5 from the centre)
    const caps = new THREE.InstancedMesh(new THREE.CircleGeometry(2.2, 20), pathMat, Object.keys(LANDS).length);
    dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(1, 1, 1);
    Object.values(LANDS).forEach((land, ci) => {
      dummy.position.set(Math.cos(land.angle) * 24.5, 0.025, Math.sin(land.angle) * 24.5);
      dummy.updateMatrix();
      caps.setMatrixAt(ci, dummy.matrix);
    });
    caps.instanceMatrix.needsUpdate = true;
    scene.add(caps);

    // Pale-gold star inlay, centred in the plaza (sits under the castle/anything in the middle)
    const plazaStar = new THREE.Mesh(
      starGeometry(3.2, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xf7e3a1, roughness: 0.85, flatShading: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    );
    plazaStar.rotation.x = -Math.PI / 2; plazaStar.position.y = 0.028;
    scene.add(plazaStar);
  }

  // --- Starlight Castle (hub, set back so the plaza stays walkable) ---------
  const castle = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xffe3ee, roughness: 0.85, emissive: 0xffc4dc, emissiveIntensity: 0.22, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xff9ec6, roughness: 0.6, flatShading: true });
  const towerGeo = new THREE.CylinderGeometry(1.5, 1.7, 7, 12);
  const roofGeo = new THREE.ConeGeometry(2.1, 2.8, 12);
  const towerPos = [[-3.4, 0], [3.4, 0], [-1.7, -2.2], [1.7, -2.2]];
  towerPos.forEach(([x, z]) => {
    const t = new THREE.Mesh(towerGeo, wallMat); t.position.set(x, 3.5, z); castle.add(t);
    const r = new THREE.Mesh(roofGeo, roofMat); r.position.set(x, 8.4, z); castle.add(r);
  });
  const keep = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5, 3), wallMat);
  keep.position.set(0, 2.5, -1.2); castle.add(keep);
  const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.4, 4), roofMat);
  keepRoof.position.set(0, 6.2, -1.2); keepRoof.rotation.y = Math.PI / 4; castle.add(keepRoof);
  // Gold door
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.8), goldMat);
  door.position.set(0, 1.4, 0.32); castle.add(door);
  // Star on top
  const starGeo = starGeometry(0.9, 0.38);
  const castleStar = new THREE.Mesh(starGeo, new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide }));
  castleStar.position.set(0, 8.4, -1.2); castle.add(castleStar);
  // Off to the north-west so it never stands between the camera and Belle's path.
  castle.position.set(-11.5, 0, -8.5);
  scene.add(castle);
  addCollider(-11.5, -8.5, 5.2);

  // --- Lands ----------------------------------------------------------------
  const LAND_DIST = 27;         // land center distance from origin
  const PAD_DIST = 18.5;        // NPC pad distance (near land entrance)
  const landCenters = {};
  const landPads = {};

  // Soft tinted disc under each land
  const landTint = { library: 0xeadfff, frostfall: 0xf0f7ff, meadow: 0xd3f0b2, village: 0xffe8c6 };
  Object.entries(LANDS).forEach(([id, land]) => {
    const cx = Math.cos(land.angle) * LAND_DIST;
    const cz = Math.sin(land.angle) * LAND_DIST;
    landCenters[id] = new THREE.Vector3(cx, 0, cz);
    const discMat = pastel(landTint[id]);
    discMat.emissive.set(landTint[id]); discMat.emissiveIntensity = 0.15; // soft self-glow so tints read in shade
    const disc = new THREE.Mesh(new THREE.CircleGeometry(10.5, 36), discMat);
    disc.rotation.x = -Math.PI / 2; disc.position.set(cx, 0.015, cz);
    scene.add(disc);
    const px = Math.cos(land.angle) * PAD_DIST;
    const pz = Math.sin(land.angle) * PAD_DIST;
    landPads[id] = new THREE.Vector3(px, 0, pz);
  });

  // ---- (1) Whispering Library: book-tree woods -----------------------------
  {
    const c = landCenters.library;
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 3.2, 8);
    const trunkMat = pastel(0x8a5a3b);
    const bookGeo = new THREE.BoxGeometry(0.9, 1.2, 0.28);
    const bookMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    const N = 14;
    const LAMPS = 3, STACK_BOOKS = [3, 2, 3];
    // Lamp posts reuse the trunk mesh (thin + short), so they cost no extra draw call
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, N + LAMPS);
    const books = new THREE.InstancedMesh(bookGeo, bookMat, N * 2 + 8);
    const canopies = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5, 0), pastel(0xffffff), N);
    const dummy = new THREE.Object3D();
    const palette = [0xff6b8a, 0x60a5fa, 0xffd34d, 0x6ee7a8, 0xb982f4, 0xff9e57];
    const col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.3;
      const rr = 3.5 + (i % 3) * 2.2;
      const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
      dummy.position.set(x, 1.6, z);
      dummy.rotation.y = a; dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      addCollider(x, z, 0.7);
      // Round storybook canopy, alternating soft teal and lavender
      dummy.position.set(x, 4, z); dummy.rotation.set(0, i, 0); dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);
      canopies.setColorAt(i, col.setHex(i % 2 ? 0xc9b3f2 : 0x8fd6c4));
      // 2 tilted books tucked against the canopy
      for (let b = 0; b < 2; b++) {
        const ba = i * 1.3 + b * Math.PI;
        dummy.position.set(x + Math.cos(ba) * 1.35, 3.6 + b * 0.5, z + Math.sin(ba) * 1.35);
        dummy.rotation.set(0.35, ba, b ? -0.4 : 0.4);
        dummy.updateMatrix();
        books.setMatrixAt(i * 2 + b, dummy.matrix);
        books.setColorAt(i * 2 + b, col.setHex(palette[(i + b * 3) % palette.length]));
      }
    }
    // 3 small ground book stacks near trees (off the path and the rug)
    let bi = N * 2;
    [1, 5, 9].forEach((ti, s) => {
      const a = (ti / N) * Math.PI * 2 + 0.3;
      const rr = 3.5 + (ti % 3) * 2.2;
      const sx = c.x + Math.cos(a + 0.28) * (rr + 0.4), sz = c.z + Math.sin(a + 0.28) * (rr + 0.4);
      for (let b = 0; b < STACK_BOOKS[s]; b++, bi++) {
        dummy.position.set(sx, 0.14 + b * 0.28, sz);
        dummy.rotation.set(Math.PI / 2, 0, a + b * 0.5);   // lying flat, slightly turned
        dummy.updateMatrix();
        books.setMatrixAt(bi, dummy.matrix);
        books.setColorAt(bi, col.setHex(palette[(s * 2 + b) % palette.length]));
      }
    });
    // 3 lantern posts around the reading rug, clear of the hub-to-Belle path (+Z side)
    const globeMat = new THREE.MeshStandardMaterial({ color: 0xffe3a0, emissive: 0xffe3a0, emissiveIntensity: 0.8, roughness: 0.6 });
    const globes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 10, 8), globeMat, LAMPS);
    [-0.2, 3.4, 4.8].forEach((a, l) => {
      const lx = c.x + Math.cos(a) * 2.9, lz = c.z + Math.sin(a) * 2.9;
      dummy.position.set(lx, 0.96, lz); dummy.rotation.set(0, 0, 0); dummy.scale.set(0.3, 0.6, 0.3); dummy.updateMatrix();
      trunks.setMatrixAt(N + l, dummy.matrix);
      dummy.position.set(lx, 2.1, lz); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      globes.setMatrixAt(l, dummy.matrix);
      addCollider(lx, lz, 0.3);
    });
    trunks.instanceMatrix.needsUpdate = true;
    books.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    globes.instanceMatrix.needsUpdate = true;
    if (books.instanceColor) books.instanceColor.needsUpdate = true;
    if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
    scene.add(trunks, books, canopies, globes);
    // Cozy reading nook: a tiny round rug + story book prop at the center
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2, 24), pastel(0xffd9e8));
    rug.rotation.x = -Math.PI / 2; rug.position.set(c.x, 0.03, c.z);
    scene.add(rug);
    addCollider(c.x, c.z, 0.4);
  }

  // ---- (2) Frostfall Peaks: snowy cones + mounds + falling snow -------------
  let snowPoints = null;
  let iceCrystals = null; // 10 slowly turning crystals (animated in update unless calm motion)
  let meadowSway = null; // meadow flowers gently swaying (animated in update unless calm motion)
  {
    const c = landCenters.frostfall;
    const coneGeo = new THREE.ConeGeometry(2.2, 6, 10);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xd6ebff, roughness: 0.9, emissive: 0xdcebff, emissiveIntensity: 0.28, flatShading: true });
    const capGeo = new THREE.ConeGeometry(1.1, 2.2, 10);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0.25, flatShading: true });
    const N = 10;
    let placed = 0;
    const cones = new THREE.InstancedMesh(coneGeo, coneMat, N);
    const caps = new THREE.InstancedMesh(capGeo, capMat, N);
    const moundGeo = new THREE.SphereGeometry(1.4, 12, 8);
    const moundMat = new THREE.MeshStandardMaterial({ color: 0xf4faff, roughness: 0.9, emissive: 0xdcebff, emissiveIntensity: 0.28, flatShading: true });
    const mounds = new THREE.InstancedMesh(moundGeo, moundMat, 8);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.15;
      // Leave the hub side (west) open so Elsa's pad and path stay clear
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 1.2) continue;
      const rr = 4 + (i % 3) * 2;
      const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
      const h = 4.5 + (i % 4);
      dummy.position.set(x, h / 2, z); dummy.scale.set(1, h / 6, 1);
      dummy.rotation.y = a; dummy.updateMatrix();
      cones.setMatrixAt(placed, dummy.matrix);
      dummy.position.set(x, h + 0.9, z); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      caps.setMatrixAt(placed, dummy.matrix);
      placed++;
      addCollider(x, z, 1.8, 2.75); // cone base radius is 2.2, so the shadow must reach past it
    }
    cones.count = caps.count = placed;
    let moundN = 0;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.6;
      // Same hub-side test as the cones: keep the walk to Elsa's pad clear
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 1.2) continue;
      const x = c.x + Math.cos(a) * 7.5, z = c.z + Math.sin(a) * 7.5;
      dummy.position.set(x, -0.5, z); dummy.scale.set(1.6, 0.7, 1.6);
      dummy.rotation.y = 0; dummy.updateMatrix();
      mounds.setMatrixAt(moundN++, dummy.matrix);
    }
    mounds.count = moundN;
    cones.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    mounds.instanceMatrix.needsUpdate = true;
    scene.add(cones, caps, mounds);

    // Ice crystals: one InstancedMesh, spread around the far side of the peaks (clear of the hub path and pad)
    const crystals = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.45),
      new THREE.MeshStandardMaterial({ color: 0xbfe9ff, roughness: 0.4, emissive: 0x7fd3ff, emissiveIntensity: 0.6, flatShading: true }),
      10
    );
    const crystalBase = [];
    for (let i = 0; i < 10; i++) {
      const a = Math.PI + 1.45 + i * (Math.PI * 2 - 2.9) / 9; // sweeps the non-hub side
      const r = 10.4 + (i % 2) * 0.8;
      crystalBase.push({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r, y: 0.9 + (i % 3) * 0.25, phase: i * 1.7 });
    }
    const setCrystals = (t) => {
      for (let i = 0; i < 10; i++) {
        const b = crystalBase[i];
        dummy.position.set(b.x, b.y + Math.sin(t * 0.8 + b.phase) * 0.12, b.z);
        dummy.rotation.set(0, t * 0.4 + b.phase, 0);
        dummy.scale.set(1, 1.5, 1); dummy.updateMatrix();
        crystals.setMatrixAt(i, dummy.matrix);
      }
      crystals.instanceMatrix.needsUpdate = true;
    };
    setCrystals(0);
    crystals.userData.set = setCrystals;
    iceCrystals = crystals;
    scene.add(crystals);

    // Falling snow: cheap Points cloud drifting down, wraps around
    const COUNT = 260;
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = c.x + (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = Math.random() * 12;
      pos[i * 3 + 2] = c.z + (Math.random() - 0.5) * 24;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    snowPoints = new THREE.Points(snowGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.22, transparent: true, opacity: 0.9,
      map: makeCanvasSprite((ctx, s) => {
        const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      }),
      depthWrite: false,
    }));
    snowPoints.userData.center = c;
    scene.add(snowPoints);
  }

  // ---- (3) Sunflower Meadows: instanced flowers, fences, pond ----------------
  {
    const c = landCenters.meadow;
    // Flowers: instanced stems + instanced petal discs
    const stemGeo = new THREE.CylinderGeometry(0.05, 0.07, 1.1, 6);
    const stemMat = pastel(0x4caf6d);
    const petalGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 10);
    const petalMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    const centerGeo = new THREE.SphereGeometry(0.13, 8, 6);
    const centerMat = pastel(0x8a5a3b);
    const N = 42;
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, N);
    const petals = new THREE.InstancedMesh(petalGeo, petalMat, N);
    const centers = new THREE.InstancedMesh(centerGeo, centerMat, N);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const flowerColors = [0xffd34d, 0xff9ec6, 0xff8a7a, 0xfff3a0];
    const fx = new Float32Array(N), fz = new Float32Array(N), fs = new Float32Array(N), fph = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 2.5 + Math.random() * 6.5;
      const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
      const s = 0.8 + Math.random() * 0.7;
      fx[i] = x; fz[i] = z; fs[i] = s; fph[i] = i * 2.399; // golden-angle phase spread
      dummy.rotation.set(0, 0, 0); dummy.scale.set(s, s, s);
      dummy.position.set(x, 0.55 * s, z); dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, 1.12 * s, z); dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
      petals.setColorAt(i, col.setHex(flowerColors[i % flowerColors.length]));
      dummy.position.set(x, 1.18 * s, z); dummy.updateMatrix();
      centers.setMatrixAt(i, dummy.matrix);
    }
    stems.instanceMatrix.needsUpdate = true;
    petals.instanceMatrix.needsUpdate = true;
    centers.instanceMatrix.needsUpdate = true;
    if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
    scene.add(stems, petals, centers);

    // Gentle sway: rebuild matrices with a small tilt pivoting at each stem base (no allocations)
    const swayOff = new THREE.Vector3();
    const swayEuler = new THREE.Euler();
    const swayParts = [[stems, 0.55], [petals, 1.12], [centers, 1.18]];
    meadowSway = { userData: { set(t) {
      for (let i = 0; i < N; i++) {
        const s = fs[i];
        swayEuler.set(Math.sin(t * 1.3 + fph[i]) * 0.08, 0, Math.sin(t * 1.1 + fph[i] * 1.7) * 0.08);
        dummy.rotation.copy(swayEuler); dummy.scale.set(s, s, s);
        for (let k = 0; k < 3; k++) {
          swayOff.set(0, swayParts[k][1] * s, 0).applyEuler(swayEuler);
          dummy.position.set(fx[i] + swayOff.x, swayOff.y, fz[i] + swayOff.z); dummy.updateMatrix();
          swayParts[k][0].setMatrixAt(i, dummy.matrix);
        }
      }
      stems.instanceMatrix.needsUpdate = true;
      petals.instanceMatrix.needsUpdate = true;
      centers.instanceMatrix.needsUpdate = true;
    } } };

    // Fences: instanced posts + rails along two arcs
    const postGeo = new THREE.BoxGeometry(0.18, 1.1, 0.18);
    const postMat = pastel(0xfff6e8);
    const railGeo = new THREE.BoxGeometry(2.1, 0.14, 0.1);
    const POSTS = 14;
    const posts = new THREE.InstancedMesh(postGeo, postMat, POSTS);
    const rails = new THREE.InstancedMesh(railGeo, postMat, POSTS);
    for (let i = 0; i < POSTS; i++) {
      const a = Math.PI * 0.15 + (i / (POSTS - 1)) * Math.PI * 1.2;
      const x = c.x + Math.cos(a) * 8.6, z = c.z + Math.sin(a) * 8.6;
      dummy.position.set(x, 0.55, z); dummy.rotation.set(0, -a, 0); dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, 0.72, z); dummy.updateMatrix();
      rails.setMatrixAt(i, dummy.matrix);
      if (i % 3 === 0) addCollider(x, z, 0.3);
    }
    posts.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    scene.add(posts, rails);

    // Pond: blue disc with lighter rim
    const pond = new THREE.Mesh(new THREE.CircleGeometry(2.6, 28),
      new THREE.MeshStandardMaterial({ color: 0x8fd4f5, roughness: 0.35 }));
    pond.rotation.x = -Math.PI / 2; pond.position.set(c.x + 5.5, 0.035, c.z - 4.5);
    scene.add(pond);
    const pondRim = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.1, 28), pastel(0xf1e6d2));
    pondRim.rotation.x = -Math.PI / 2; pondRim.position.set(c.x + 5.5, 0.03, c.z - 4.5);
    scene.add(pondRim);
    // Pond dressing: 3 notched lily pads (one InstancedMesh), a tiny lotus, 6 soft twinkles (one Points)
    {
      const px = c.x + 5.5, pz = c.z - 4.5;
      const padMat = new THREE.MeshStandardMaterial({ color: 0x7cc98a, roughness: 0.85, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const pads = new THREE.InstancedMesh(new THREE.CircleGeometry(0.45, 12, 0.3, 5.7), padMat, 3);
      const padSpots = [[-0.9, 0.5, 0.4], [0.8, -0.9, 2.1], [0.9, 1.1, 4.0]];
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      padSpots.forEach(([dx, dz, yaw], i) => {
        e.set(-Math.PI / 2, 0, yaw); q.setFromEuler(e);
        m4.compose(new THREE.Vector3(px + dx, 0.06, pz + dz), q, new THREE.Vector3(1, 1, 1));
        pads.setMatrixAt(i, m4);
      });
      pads.instanceMatrix.needsUpdate = true;
      scene.add(pads);
      // Lotus on the first pad: 6 squashed pink petals around a pale center (one InstancedMesh)
      const lx = px + padSpots[0][0], lz = pz + padSpots[0][1];
      const lotus = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), pastel(0xffffff), 7);
      const lc = new THREE.Color(), lp = new THREE.Vector3(), ls = new THREE.Vector3();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        e.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); q.setFromEuler(e);
        m4.compose(lp.set(lx + Math.cos(a) * 0.09, 0.15, lz + Math.sin(a) * 0.09), q, ls.set(0.55, 1.2, 0.35));
        lotus.setMatrixAt(i, m4); lotus.setColorAt(i, lc.setHex(0xffb3d1));
      }
      q.identity();
      m4.compose(lp.set(lx, 0.15, lz), q, ls.setScalar(0.5));
      lotus.setMatrixAt(6, m4); lotus.setColorAt(6, lc.setHex(0xfff6d6));
      scene.add(lotus);
      // Twinkles: additive points, brightness via vertex colors (map = softDot is attached on the first frame)
      const tSpots = [[-1.6, -0.6], [-0.3, -1.7], [1.5, -0.2], [0.2, 0.4], [-0.5, 1.7], [1.7, 1.0]];
      const tPos = new Float32Array(tSpots.length * 3);
      tSpots.forEach(([dx, dz], i) => { tPos[i * 3] = px + dx; tPos[i * 3 + 1] = 0.09; tPos[i * 3 + 2] = pz + dz; });
      const tGeo = new THREE.BufferGeometry();
      tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
      tGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(tSpots.length * 3), 3));
      const tMat = new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
      const twinkles = new THREE.Points(tGeo, tMat);
      twinkles.frustumCulled = false;
      scene.add(twinkles);
      pondTwinkle = (t) => {
        if (!tMat.map) { tMat.map = softDot; tMat.needsUpdate = true; }
        const col = tGeo.attributes.color.array;
        for (let i = 0; i < tSpots.length; i++) {
          // slow staggered swell (about 5 s per cycle); calm motion holds a soft steady glow
          const k = calmMotion ? 0.45 : 0.1 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.25 + i * 1.9));
          col[i * 3] = k; col[i * 3 + 1] = k * 0.92; col[i * 3 + 2] = k * 0.6;
        }
        tGeo.attributes.color.needsUpdate = true;
      };
    }
    addCollider(c.x + 5.5, c.z - 4.5, 2.9);
  }

  // ---- (4) Glass Slipper Village: pastel houses + clock tower ----------------
  {
    const c = landCenters.village;
    const wallColors = [0xffd9e8, 0xd9ecff, 0xfff3c9, 0xe6ffd9];
    const roofColors = [0xff9ec6, 0x8fbdf5, 0xffc46b, 0x8fd9a8];
    const houseSpots = [
      { dx: -5, dz: -3.5, rot: 0.4 }, { dx: 4.5, dz: -4, rot: -0.5 },
      { dx: -4.5, dz: 4.5, rot: 0.9 }, { dx: 5, dz: 4, rot: -1.1 },
    ];
    const boxMats = [], bloomMats = [], doormats = []; // world matrices (+ bloom colors) for the instanced trim below
    const bloomCols = [0xffb3d1, 0xffffff, 0xffe27a];
    const loc = new THREE.Object3D(), wm = new THREE.Matrix4();
    houseSpots.forEach((h, i) => {
      const g = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 3), pastel(wallColors[i]));
      walls.position.y = 1.3; g.add(walls);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.8, 4), pastel(roofColors[i]));
      roof.position.y = 3.5; roof.rotation.y = Math.PI / 4; g.add(roof);
      const doorM = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), pastel(0x8a5a3b));
      doorM.position.set(0, 0.8, 1.51); g.add(doorM);
      const winM = new THREE.MeshStandardMaterial({ color: 0xfffbe8, roughness: 0.3, emissive: 0xffe2a0, emissiveIntensity: 0.5 }); // warm lit windows
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), winM);
      win.position.set(1.05, 1.6, 1.51); g.add(win);
      const win2 = win.clone(); win2.position.x = -1.05; g.add(win2);
      const wx = c.x + h.dx, wz = c.z + h.dz;
      g.position.set(wx, 0, wz); g.rotation.y = h.rot;
      scene.add(g);
      addCollider(wx, wz, 2.6);
      g.updateMatrixWorld(true);
      // Flower box hugging the wall under each window (wall face z=1.5, window bottom y=1.2), plus 3 blooms
      [1.05, -1.05].forEach((fx) => {
        loc.rotation.set(0, 0, 0); loc.scale.set(1, 1, 1);
        loc.position.set(fx, 1.11, 1.61); loc.updateMatrix();
        boxMats.push(wm.multiplyMatrices(g.matrixWorld, loc.matrix).clone());
        for (let b = 0; b < 3; b++) {
          loc.position.set(fx + (b - 1) * 0.28, 1.22, 1.62); loc.updateMatrix();
          bloomMats.push({ m: wm.multiplyMatrices(g.matrixWorld, loc.matrix).clone(), c: bloomCols[b] });
        }
      });
      // Round doormat just in front of the door
      loc.position.set(0, 0.04, 2.15); loc.updateMatrix();
      doormats.push(wm.multiplyMatrices(g.matrixWorld, loc.matrix).clone());
    });
    {
      // Flower boxes + 2 wooden lamp posts share one mesh (posts are the same box, scaled thin and tall)
      const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.18, 0.22), pastel(0x9a6a45), boxMats.length + 2);
      boxMats.forEach((m, i) => boxes.setMatrixAt(i, m));
      scene.add(boxes);
      const blooms = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.7 }), bloomMats.length);
      const bc = new THREE.Color();
      bloomMats.forEach((b, i) => { blooms.setMatrixAt(i, b.m); blooms.setColorAt(i, bc.set(b.c)); });
      scene.add(blooms);
      const matGeo = new THREE.CircleGeometry(0.55, 20); matGeo.rotateX(-Math.PI / 2);
      const matMat = pastel(0xf2c48a);
      matMat.polygonOffset = true; matMat.polygonOffsetFactor = -2; matMat.polygonOffsetUnits = -2;
      const mats = new THREE.InstancedMesh(matGeo, matMat, doormats.length);
      doormats.forEach((m, i) => mats.setMatrixAt(i, m));
      scene.add(mats);
      // Two lamp posts flanking Cinderella's pad, off the hub-to-pad path (pad sits on the z=0 line)
      const pad = landPads.village;
      const lampSpots = [[pad.x - 0.6, pad.z + 2.6], [pad.x - 0.6, pad.z - 2.6]];
      const topMat = new THREE.MeshStandardMaterial({ color: 0xffe3a0, emissive: 0xffe3a0, emissiveIntensity: 0.9, roughness: 0.4 });
      const tops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 8), topMat, 2);
      lampSpots.forEach(([lx, lz], i) => {
        loc.position.set(lx, 1.1, lz); loc.scale.set(0.17, 12.2, 0.68); loc.updateMatrix();
        boxes.setMatrixAt(boxMats.length + i, loc.matrix);
        loc.scale.set(1, 1, 1);
        loc.position.set(lx, 2.3, lz); loc.updateMatrix(); tops.setMatrixAt(i, loc.matrix);
        addCollider(lx, lz, 0.3);
      });
      scene.add(tops);
    }

    // Clock tower with readable clock face
    const t = new THREE.Group();
    const towerMat = pastel(0xfff3c9);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 8, 2.4), towerMat);
    body.position.y = 4; t.add(body);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2, 2, 4), pastel(0xff9ec6));
    cap.position.y = 9; cap.rotation.y = Math.PI / 4; t.add(cap);
    // Clock face: white disc + rim + hour/minute hands
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
    face.rotation.x = Math.PI / 2; face.position.set(0, 6.6, 1.22); t.add(face);
    const rimM = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 8, 24), goldMat);
    rimM.position.set(0, 6.6, 1.26); t.add(rimM);
    const handMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.05), handMat);
    hourHand.geometry.translate(0, 0.25, 0);
    hourHand.position.set(0, 6.6, 1.32); hourHand.rotation.z = -Math.PI / 3; t.add(hourHand);
    const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.05), handMat);
    minHand.geometry.translate(0, 0.4, 0);
    minHand.position.set(0, 6.6, 1.34); minHand.rotation.z = Math.PI / 6; t.add(minHand);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), goldMat);
    pin.position.set(0, 6.6, 1.36); t.add(pin);
    const tx = c.x + 0.5, tz = c.z - 6.5;
    t.position.set(tx, 0, tz); t.rotation.y = 0.3;
    scene.add(t);
    addCollider(tx, tz, 1.9);
  }

  // --- Grass tufts + bushes in the empty areas (seeded, instanced, static) ---
  {
    const bushGreens = [0x86c785, 0x78bd7c];
    const grassGreens = [0x8bd07f, 0x7cc476];
    const flowerColors = [0xffb3d1, 0xffffff, 0xffe27a];
    // Open ground only: outside the plaza, off the paths, away from lands, castle and NPC pads
    const openSpot = (x, z, pad) => {
      const r = Math.hypot(x, z);
      if (r < 10 + pad || r > 40) return false;
      for (const land of Object.values(LANDS)) {
        const dx = Math.cos(land.angle), dz = Math.sin(land.angle);
        const t = Math.max(0, Math.min(LAND_DIST, x * dx + z * dz));
        if (Math.hypot(x - dx * t, z - dz * t) < 3 + pad) return false; // path center line
      }
      for (const c of Object.values(landCenters)) if (Math.hypot(x - c.x, z - c.z) < 11.5 + pad) return false;
      if (Math.hypot(x + 11.5, z + 8.5) < 6.5 + pad) return false;
      for (const p of Object.values(landPads)) if (Math.hypot(x - p.x, z - p.z) < 2.5 + pad) return false;
      for (const c of colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return false;
      return true;
    };
    const pickSpot = (pad) => {
      for (let tries = 0; tries < 60; tries++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(100 + rand() * 1500); // uniform by area, 10..40
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (openSpot(x, z, pad)) return { x, z };
      }
      return null;
    };
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    // Bushes (picked first so grass can keep clear of them)
    const BUSHES = 18;
    const bushSpots = [];
    while (bushSpots.length < BUSHES) {
      const p = pickSpot(0.8);
      if (!p) break;
      if (bushSpots.some((b) => Math.hypot(p.x - b.x, p.z - b.z) < 3)) continue;
      bushSpots.push(p);
    }
    const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.85, 0), pastel(0xffffff), bushSpots.length);
    const blooms = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.7 }), bushSpots.length * 3);
    bushSpots.forEach((b, i) => {
      const s = 0.85 + rand() * 0.3;
      dummy.position.set(b.x, 0.5 * s, b.z);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.set(s, s * 0.85, s);
      dummy.updateMatrix();
      bushes.setMatrixAt(i, dummy.matrix);
      bushes.setColorAt(i, col.setHex(bushGreens[i % 2]));
      addCollider(b.x, b.z, 0.8);
      // 3 flowers sitting on the upper surface
      for (let f = 0; f < 3; f++) {
        const th = rand() * Math.PI * 2, el = 0.5 + rand() * 0.8;
        const R = 0.85 * s * 0.98;
        dummy.position.set(b.x + Math.cos(el) * Math.cos(th) * R, 0.5 * s + Math.sin(el) * R * 0.85, b.z + Math.cos(el) * Math.sin(th) * R);
        dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        blooms.setMatrixAt(i * 3 + f, dummy.matrix);
        blooms.setColorAt(i * 3 + f, col.setHex(flowerColors[(i + f) % 3]));
      }
    });
    bushes.instanceMatrix.needsUpdate = true;
    blooms.instanceMatrix.needsUpdate = true;
    if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
    if (blooms.instanceColor) blooms.instanceColor.needsUpdate = true;
    scene.add(bushes, blooms);

    // Grass: ~330 blades in clumps of 3 (sized to read from the phone camera)
    const CLUMPS = 110;
    const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.14, 0.65, 4), pastel(0xffffff), CLUMPS * 3);
    let g = 0;
    for (let k = 0; k < CLUMPS; k++) {
      const p = pickSpot(0.3);
      if (!p) break;
      for (let j = 0; j < 3; j++) {
        const s = 0.8 + rand() * 0.6;
        dummy.position.set(p.x + (rand() - 0.5) * 0.5, 0.225 * s, p.z + (rand() - 0.5) * 0.5);
        dummy.rotation.set((rand() - 0.5) * 0.3, rand() * Math.PI, (rand() - 0.5) * 0.3);
        dummy.scale.set(1, s, 1);
        dummy.updateMatrix();
        grass.setMatrixAt(g, dummy.matrix);
        grass.setColorAt(g, col.setHex(grassGreens[(k + j) % 2]));
        g++;
      }
    }
    grass.count = g;
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    scene.add(grass);
  }

  // --- Soft blob shadows under scenery (one instanced draw, no shadow maps) ---
  {
    const props = colliders.filter((c) => c.r >= 0.7);
    const propShadows = new THREE.InstancedMesh(
      new THREE.CircleGeometry(1, 24),
      new THREE.MeshBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0.18, depthWrite: false }),
      props.length
    );
    const dummy = new THREE.Object3D();
    props.forEach((c, i) => {
      dummy.position.set(c.x, 0.045, c.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(c.shadowR || c.r * 1.15);
      dummy.updateMatrix();
      propShadows.setMatrixAt(i, dummy.matrix);
    });
    propShadows.instanceMatrix.needsUpdate = true;
    propShadows.renderOrder = 1;
    scene.add(propShadows);
  }

  // --- Butterflies (W15) -----------------------------------------------------
  // 5 pastel butterflies (2 wing planes each, 3 shared materials). Decorative only:
  // not in npcHitMeshes and raycast is a no-op, so taps pass through; no colliders.
  // Calm motion: perched on meadow flowers with a tiny, slow flap and no drifting.
  const butterflies = [];
  let butterflyAssets = null; // wing geometry + material, reused by Zoe's butterfly friend
  const butterflyFlutter = (() => {
    const wingTex = makeCanvasSprite((ctx, s) => {
      // Wing hinged at the left edge, extending right: soft upper and lower lobes + a light spot.
      ctx.fillStyle = 'rgba(232,232,232,0.96)';
      ctx.beginPath();
      ctx.ellipse(s * 0.5, s * 0.34, s * 0.46, s * 0.3, -0.35, 0, Math.PI * 2);
      ctx.ellipse(s * 0.4, s * 0.68, s * 0.32, s * 0.24, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.beginPath(); ctx.arc(s * 0.6, s * 0.3, s * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.42, s * 0.7, s * 0.06, 0, Math.PI * 2); ctx.fill();
    }, 64);
    const wingMats = [0xffb3d1, 0xcdb4f6, 0xfff09a].map((hex) => new THREE.MeshBasicMaterial({
      map: wingTex, color: hex, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    }));
    // Flat in XZ, hinge at the origin, wing extends along +X.
    const wingGeo = new THREE.PlaneGeometry(0.35, 0.3);
    wingGeo.rotateX(-Math.PI / 2);
    wingGeo.translate(0.175, 0, 0);
    // Flower tops for perching (calm motion): read the meadow's petal discs, skip any near an NPC pad.
    const perch = [];
    scene.traverse((o) => {
      if (o.isInstancedMesh && o.count === 42 && o.geometry.parameters && o.geometry.parameters.radiusTop === 0.32) {
        const m = new THREE.Matrix4(), v = new THREE.Vector3();
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m); v.setFromMatrixPosition(m);
          let ok = true;
          for (const p of Object.values(landPads)) if (Math.hypot(v.x - p.x, v.z - p.z) < 3.5) ok = false;
          if (ok) perch.push(v.clone());
        }
      }
    });
    const mc = landCenters.meadow;
    // cx, cz, ax, az: loop center + radii on the ground; clear of the castle (-11.5,-8.5) and NPC pads.
    const routes = [
      [6, 25, 3.5, 2.5], [-6, 28, 3, 3], [1, 31, 4, 2], [6, 6, 3.5, 3], [-5, 5, 3, 3.5],
    ];
    routes.forEach((r, i) => {
      const group = new THREE.Group();
      const mat = wingMats[i % 3];
      const wl = new THREE.Group(), wr = new THREE.Group();
      const ml = new THREE.Mesh(wingGeo, mat), mr = new THREE.Mesh(wingGeo, mat);
      ml.scale.x = -1;
      ml.raycast = mr.raycast = () => {};
      wl.add(ml); wr.add(mr);
      group.add(wl, wr);
      group.scale.setScalar(2); // 0.35 x 0.3 wings were specks at phone camera distance
      const pk = perch.length ? perch[Math.floor((i + 0.5) * perch.length / 5) % perch.length] : null;
      butterflies.push({
        group, wl, wr, r,
        ph: i * 1.7, fx: 0.17 + i * 0.019, fz: 0.13 + i * 0.023, fy: 0.4 + i * 0.07,
        // Perch spot: just above a flower top (fallback: low over the meadow floor).
        px: pk ? pk.x : mc.x - 4 + i * 2, py: (pk ? pk.y + 0.16 : 1.3), pz: pk ? pk.z : mc.z + 2,
        pyaw: i * 1.3,
      });
      scene.add(group);
    });
    butterflyAssets = { wingGeo, wingMat: wingMats[2] };
    return (t) => {
      for (let i = 0; i < butterflies.length; i++) {
        const b = butterflies[i], r = b.r;
        let a;
        if (calmMotion) {
          b.group.position.set(b.px, b.py, b.pz);
          b.group.rotation.y = b.pyaw;
          a = 0.55 + Math.sin(t * 1.2 + b.ph) * 0.15;
        } else {
          const u = t * b.fx + b.ph, w = t * b.fz + b.ph * 1.3;
          b.group.position.set(
            r[0] + Math.sin(u) * r[2],
            1.8 + Math.sin(t * b.fy + b.ph) * 0.45,
            r[1] + Math.sin(w) * r[3]
          );
          b.group.rotation.y = Math.atan2(Math.cos(u) * r[2] * b.fx, Math.cos(w) * r[3] * b.fz);
          a = 0.35 + Math.sin(t * 9 + b.ph) * 0.8;
        }
        b.wl.rotation.z = a; b.wr.rotation.z = -a;
      }
    };
  })();

  // --- Sparkle sprites (shared texture for markers/effects) ------------------
  const softDot = makeCanvasSprite((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });

  // --- NPCs -----------------------------------------------------------------
  const npcs = {}; // id -> { group, star, pad, state, hopT, baseY, baseYaw, swayPhase }
  const calmMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Starlight motes: a few dozen pale-gold points drifting slowly around the hub (skipped for calm motion)
  let motePoints = null;
  if (!calmMotion) {
    const COUNT = 48;
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 1] = 0.8 + Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    motePoints = new THREE.Points(moteGeo, new THREE.PointsMaterial({
      color: 0xfff1b8, size: 0.35, transparent: true, opacity: 0.8,
      map: makeCanvasSprite((ctx, s) => {
        const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      }),
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    motePoints.frustumCulled = false;
    scene.add(motePoints);
  }
  // Soft round blob shadow so characters sit on the ground (no shadow maps).
  const addShadow = (radius) => {
    const sh = new THREE.Mesh(
      G('blobShadow', () => new THREE.CircleGeometry(1, 24)),
      M('blobShadow', () => new THREE.MeshBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0.25, depthWrite: false }))
    );
    sh.rotation.x = -Math.PI / 2;
    sh.scale.setScalar(radius);
    sh.renderOrder = 1;
    scene.add(sh);
    return sh;
  };
  const SHADOW_R = 0.75 * PRINCESS_SCALE;
  // Shortest signed angle from a to b, in (-PI, PI]
  const angleDelta = (a, b) => {
    const d = (b - a) % (Math.PI * 2);
    return d > Math.PI ? d - Math.PI * 2 : d < -Math.PI ? d + Math.PI * 2 : d;
  };
  const npcHitMeshes = [];
  const starGeoShared = starGeometry(0.5, 0.21);

  Object.entries(NPC_DEFS).forEach(([id, def], i) => {
    const padPos = landPads[def.land];
    const { group, hitMeshes } = buildPrincess(
      { dress: def.dress, accent: def.accent, hair: def.hair, hairStyle: def.hairStyle, tiara: true },
      id
    );
    // Stand on pad, facing the hub
    group.position.copy(padPos);
    group.rotation.y = Math.atan2(-padPos.x, -padPos.z);
    scene.add(group);
    const shadow = addShadow(SHADOW_R);
    shadow.position.set(padPos.x, 0.05, padPos.z);
    npcHitMeshes.push(...hitMeshes);
    addCollider(padPos.x, padPos.z, 0.8 * PRINCESS_SCALE);

    // Glowing circular pad
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(1.3, 28),
      new THREE.MeshBasicMaterial({ color: def.accent, transparent: true, opacity: 0.55 })
    );
    pad.rotation.x = -Math.PI / 2; pad.position.set(padPos.x, 0.04, padPos.z);
    scene.add(pad);

    // Bobbing gold star marker above
    const starMat = new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const star = new THREE.Mesh(starGeoShared, starMat);
    star.position.set(padPos.x, 3.1 * PRINCESS_SCALE, padPos.z);
    scene.add(star);
    star.userData.npcId = id;
    npcHitMeshes.push(star);

    npcs[id] = { id, def, group, star, starMat, pad, state: 'available', hopT: -1, baseY: 0, hue: i * 0.27, baseYaw: group.rotation.y, swayPhase: i * 1.7, padGlow: 0 };
  });

  // --- Today's star: one gentle marker over the land to visit (not raycast, so taps pass through) ---
  const todayStar = new THREE.Mesh(
    starGeometry(0.95, 0.4), // clearly bigger than the 0.5 talk-marker star below it
    new THREE.MeshBasicMaterial({ color: 0xfff3a8, side: THREE.DoubleSide })
  );
  todayStar.visible = false;
  todayStar.raycast = () => {};
  scene.add(todayStar);
  let todayTarget = null;
  function setTodayStar(npcId) {
    todayTarget = npcId && npcs[npcId] ? npcs[npcId] : null;
    todayStar.visible = !!todayTarget;
    if (todayTarget) {
      const g = todayTarget.group.position;
      todayStar.position.set(g.x, 3.1 * PRINCESS_SCALE + 1.5, g.z);
    }
  }

  // --- Player: Princess Zoe --------------------------------------------------
  const { group: player, hitMeshes: playerHit, dressMat: playerDressMat, tiaraGemMat: playerGemMat } = buildPrincess(
    { dress: 0xff9cc4, accent: 0xdcc6f7, hair: 0x6b4430, hairStyle: 'wavy', tiara: true, tiaraColor: 'silver', fancy: true },
    null
  );
  player.position.set(0, 0, 4);
  scene.add(player);
  const playerShadow = addShadow(SHADOW_R);
  const playerVel = new THREE.Vector3();
  const playerPos = player.position;
  let playerAngle = 0;
  let walkPhase = 0;

  // --- Input -----------------------------------------------------------------
  // All movement + button input flows through js/input.js (keyboard, touch
  // joystick fed in from ui.js, and Bluetooth controllers via Gamepad API).
  let inputEnabled = true;

  // --- Tap the world (E1): little scenery props that wiggle, glow and chime when tapped ---------
  // Taps never move Zoe or start quests. Princess taps are checked first (see onPointerDown).
  const tappables = [];   // invisible hit meshes (the second raycast list)
  const tapItems = [];    // { group, hit, glow, kind, baseY, t } t < 0 = resting, else seconds into the reaction
  const TAP_DUR = 0.9;    // seconds a reaction plays; re-taps are ignored until it ends
  const tapHitGeo = G('tapHit', () => new THREE.SphereGeometry(1, 8, 6));
  const tapHitMat = M('tapHit', () => { const m = new THREE.MeshBasicMaterial(); m.visible = false; return m; });
  const tapStd = (key, color, emissive) => M(key, () => new THREE.MeshStandardMaterial(
    emissive ? { color, roughness: 0.5, emissive, emissiveIntensity: 0.7, flatShading: true } : { color, roughness: 0.85, flatShading: true }));
  const tapPart = (group, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); group.add(m); return m;
  };
  // Each builder fills a group (origin on the ground) and returns the glow height + hit radius.
  const TAP_KINDS = {
    flower(g, petalHex) {
      tapPart(g, G('tapStem', () => new THREE.CylinderGeometry(0.05, 0.07, 1, 6)), tapStd('tapStem', 0x4caf6d), 0, 0.5, 0);
      const p = tapPart(g, G('tapPetal', () => new THREE.CylinderGeometry(0.4, 0.4, 0.1, 10)), tapStd('tapPetal' + petalHex, petalHex), 0, 1.05, 0);
      p.rotation.x = 0.35;
      tapPart(g, G('tapCenter', () => new THREE.SphereGeometry(0.16, 8, 6)), tapStd('tapCenter', 0x8a5a3b), 0, 1.12, 0.05);
      return { glowY: 1.1, hitR: 0.8 };
    },
    lantern(g) {
      tapPart(g, G('tapPost', () => new THREE.CylinderGeometry(0.07, 0.09, 1, 6)), tapStd('tapPost', 0x8a7a9a), 0, 0.5, 0);
      tapPart(g, G('tapGlobe', () => new THREE.SphereGeometry(0.3, 10, 8)), tapStd('tapGlobe', 0xffe3a0, 0xffe3a0), 0, 1.2, 0);
      return { glowY: 1.2, hitR: 0.85 };
    },
    crystal(g) {
      tapPart(g, G('tapRock', () => new THREE.SphereGeometry(0.4, 7, 5)), tapStd('tapRock', 0xe8f1fa), 0, 0.12, 0, 1.3, 0.45, 1.3);
      tapPart(g, G('tapGem', () => new THREE.OctahedronGeometry(0.4)), tapStd('tapGem', 0xbfe9ff, 0x7fd3ff), 0, 0.85, 0, 0.9, 1.9, 0.9);
      return { glowY: 0.85, hitR: 0.85 };
    },
    sapling(g, leafHex) {
      tapPart(g, G('tapTrunk', () => new THREE.CylinderGeometry(0.1, 0.14, 0.7, 6)), tapStd('tapTrunk', 0x8a6a4b), 0, 0.35, 0);
      tapPart(g, G('tapLeaf', () => new THREE.ConeGeometry(0.6, 1.3, 7)), tapStd('tapLeaf' + leafHex, leafHex), 0, 1.25, 0);
      return { glowY: 1.2, hitR: 0.95 };
    },
    snowman(g) {
      const snow = tapStd('tapSnow', 0xffffff);
      tapPart(g, G('tapBall', () => new THREE.SphereGeometry(0.5, 10, 8)), snow, 0, 0.45, 0);
      tapPart(g, G('tapBall', () => new THREE.SphereGeometry(0.5, 10, 8)), snow, 0, 1.15, 0, 0.7, 0.7, 0.7);
      tapPart(g, G('tapNose', () => new THREE.ConeGeometry(0.07, 0.3, 6)), tapStd('tapNose', 0xff9b4a), 0, 1.15, 0.3).rotation.x = Math.PI / 2;
      return { glowY: 1.1, hitR: 0.95 };
    },
    pot(g, petalHex) {
      tapPart(g, G('tapPot', () => new THREE.CylinderGeometry(0.4, 0.28, 0.5, 10)), tapStd('tapPot', 0xe39a78), 0, 0.25, 0);
      const f = new THREE.Group(); f.position.y = 0.45; f.scale.setScalar(0.7); g.add(f);
      TAP_KINDS.flower(f, petalHex);
      return { glowY: 1.0, hitR: 0.8 };
    },
    star(g) {
      tapPart(g, G('tapPedestal', () => new THREE.CylinderGeometry(0.22, 0.34, 0.8, 8)), tapStd('tapPedestal', 0xffe3ee), 0, 0.4, 0);
      const s = tapPart(g, G('tapStar', () => starGeometry(0.5, 0.21)), M('tapStar', () => new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide })), 0, 1.35, 0);
      s.rotation.y = 0.4;
      return { glowY: 1.35, hitR: 0.9 };
    },
  };
  // Nudge a wished-for spot to the nearest clear ground (not on a collider, pad, or another prop).
  const tapSpotFree = (x, z) => {
    for (const c of colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + 0.8) return false;
    for (const p of Object.values(landPads)) if (Math.hypot(x - p.x, z - p.z) < 3.2) return false;
    for (const it of tapItems) if (Math.hypot(x - it.group.position.x, z - it.group.position.z) < 1.8) return false;
    return Math.hypot(x, z) > 4; // keep the hub plaza clear
  };
  const addTappable = (kind, x, z, arg, colorHex) => {
    let px = x, pz = z;
    for (let k = 0; k < 60 && !tapSpotFree(px, pz); k++) { px = x + Math.cos(k * 2.4) * 0.4 * k; pz = z + Math.sin(k * 2.4) * 0.4 * k; }
    const group = new THREE.Group();
    group.position.set(px, 0, pz);
    group.rotation.y = (tapItems.length * 1.9) % 6.28;
    group.scale.setScalar(1.25);
    const info = TAP_KINDS[kind](group, arg);
    const hit = new THREE.Mesh(tapHitGeo, tapHitMat);
    hit.position.y = info.glowY * 0.8; hit.scale.setScalar(info.hitR);
    group.add(hit);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot, color: colorHex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.y = info.glowY; glow.visible = false; glow.raycast = () => {};
    group.add(glow);
    scene.add(group);
    const item = { group, hit, glow, kind, baseY: 0, t: -1 };
    hit.userData.tapItem = item;
    tappables.push(hit);
    tapItems.push(item);
  };
  {
    const L = landCenters;
    const castleX = -11.5, castleZ = -8.5;
    // Castle: a wishing star and flower pots on the front lawn, a lantern near the east tower
    addTappable('star', castleX + 1.0, castleZ + 7.5, 0, 0xfff3a8);
    addTappable('pot', castleX - 4.5, castleZ + 6.5, 0xff9ec6, 0xffc4dc);
    addTappable('pot', castleX + 6.5, castleZ + 5.5, 0xfff3a0, 0xfff3a8);
    addTappable('lantern', castleX + 7.5, castleZ + 1.5, 0, 0xffe3a0);
    // Whispering Library
    addTappable('lantern', L.library.x - 5.2, L.library.z + 2.2, 0, 0xffe3a0);
    addTappable('lantern', L.library.x + 5.4, L.library.z + 2.6, 0, 0xffe3a0);
    addTappable('flower', L.library.x - 3.2, L.library.z - 5.0, 0xb8a4ff, 0xdcd0ff);
    addTappable('sapling', L.library.x + 3.8, L.library.z - 4.6, 0x7fcf9a, 0xcff5dc);
    // Frostfall Peaks
    addTappable('crystal', L.frostfall.x + 4.0, L.frostfall.z + 3.0, 0, 0xbfe9ff);
    addTappable('crystal', L.frostfall.x + 2.5, L.frostfall.z - 4.5, 0, 0xbfe9ff);
    addTappable('snowman', L.frostfall.x - 2.0, L.frostfall.z + 5.0, 0, 0xffffff);
    addTappable('sapling', L.frostfall.x - 1.5, L.frostfall.z - 5.5, 0xcfe8f5, 0xeaf6ff);
    // Sunflower Meadows
    addTappable('flower', L.meadow.x - 4.0, L.meadow.z + 3.0, 0xffd34d, 0xfff3a0);
    addTappable('flower', L.meadow.x + 4.5, L.meadow.z + 2.0, 0xff9ec6, 0xffc4dc);
    addTappable('flower', L.meadow.x + 1.0, L.meadow.z + 6.0, 0xff8a7a, 0xffc4b8);
    addTappable('sapling', L.meadow.x - 5.5, L.meadow.z - 2.5, 0x8fd98f, 0xd3f5d3);
    // Glass Slipper Village
    addTappable('lantern', L.village.x + 3.5, L.village.z - 1.5, 0, 0xffe3a0);
    addTappable('pot', L.village.x - 1.5, L.village.z + 2.5, 0xffb3d1, 0xffd9e8);
    addTappable('pot', L.village.x + 2.0, L.village.z + 6.5, 0xffe27a, 0xfff3a8);
    addTappable('flower', L.village.x - 3.0, L.village.z - 3.0, 0xff9ec6, 0xffc4dc);
  }
  // One reaction frame. Pure on its inputs (no allocation): hop + wiggle + expanding sparkle glow,
  // or, under calm motion, only a soft scale pulse and a fixed-size glow fade (no bouncing or turning).
  const TAP_GROW = 1.25;
  function tapReact(it, dt) {
    it.t += dt;
    const p = it.t / TAP_DUR;
    if (p >= 1) {
      it.t = -1;
      it.group.position.y = it.baseY; it.group.rotation.z = 0;
      it.group.scale.setScalar(TAP_GROW);
      it.glow.visible = false; it.glow.material.opacity = 0;
      return;
    }
    const pulse = Math.sin(Math.PI * p);
    if (calmMotion) {
      it.group.scale.setScalar(TAP_GROW * (1 + 0.12 * pulse));
      it.glow.scale.setScalar(1.8);
      it.glow.material.opacity = 0.85 * pulse;
    } else {
      const fall = 1 - p;
      it.group.position.y = it.baseY + Math.abs(Math.sin(p * Math.PI * 2)) * 0.45 * fall;
      it.group.rotation.z = Math.sin(p * Math.PI * 6) * 0.28 * fall;
      it.group.scale.setScalar(TAP_GROW * (1 + 0.15 * pulse));
      it.glow.scale.setScalar(1.2 + 2.4 * p);
      it.glow.material.opacity = 0.9 * fall;
    }
  }
  function startTapReaction(it) {
    if (it.t >= 0) return false; // already playing: debounce
    it.t = 0;
    it.glow.visible = true;
    return true;
  }

  // --- Tap-to-interact (raycast against NPC meshes) --------------------------
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const onPointerDown = (e) => {
    if (!inputEnabled) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(npcHitMeshes, false);
    if (hits.length && hits[0].object.userData.npcId) {
      onInteractRequest(hits[0].object.userData.npcId);
      return; // princess taps always win
    }
    // No princess hit: see if a bit of scenery was tapped (reaction + chime only; never moves Zoe or starts a quest).
    const tapHits = raycaster.intersectObjects(tappables, false);
    if (tapHits.length) {
      const it = tapHits[0].object.userData.tapItem;
      if (it && startTapReaction(it)) onWorldTap(it.kind);
    }
    // Taps on empty ground are ignored.
  };
  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  // --- Camera ----------------------------------------------------------------
  const camBase = new THREE.Vector3(0, 13.5, 10.5); // ~52-55 deg pitch
  const camOffset = camBase.clone();

  // Portrait phones are narrow, so pull back and widen the lens as aspect drops
  // below 1. Same pitch, eased in, clamped at a ~390x844 phone; aspect >= 1
  // keeps the original framing exactly.
  function frameForAspect(aspect) {
    const k = Math.min(1, Math.max(0, (1 - aspect) / 0.54));
    const ease = k * k * (3 - 2 * k);
    camera.fov = 50 + 12 * ease;
    camOffset.copy(camBase).multiplyScalar(1 + 0.85 * ease);
  }
  const camTarget = new THREE.Vector3().copy(playerPos).add(camOffset);
  const lookTarget = new THREE.Vector3().copy(playerPos);
  const lookAhead = new THREE.Vector3();
  // Conversation framing: eased weight toward a closer, lower view of Zoe + the princess.
  let focusNpc = null;
  let focusW = 0;
  let camSnap = false;
  const FOCUS_DROP = 3.3; // ground units south of the pair, so they sit high on screen
  const FOCUS_ZOOM = 0.72; // fraction of the normal camera distance
  const lastFocusMid = new THREE.Vector3();
  const focusMid = new THREE.Vector3();
  camera.position.copy(camTarget);
  camera.lookAt(lookTarget);

  // --- Zoe's sparkle trail (W16) ---
  // One pooled Points (24 slots, +1 draw call). Color fades toward black (additive => invisible).
  const TRAIL_N = 24, TRAIL_LIFE = 0.8, TRAIL_EVERY = 0.05;
  const trailPos = new Float32Array(TRAIL_N * 3);
  const trailCol = new Float32Array(TRAIL_N * 3);
  const trailBase = new Float32Array(TRAIL_N * 3); // full-brightness color per slot
  const trailAge = new Float32Array(TRAIL_N).fill(TRAIL_LIFE);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  const sparkleTrailPoints = new THREE.Points(trailGeo, new THREE.PointsMaterial({
    map: softDot, size: 0.7, sizeAttenuation: true, vertexColors: true,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sparkleTrailPoints.frustumCulled = false;
  sparkleTrailPoints.visible = false;
  scene.add(sparkleTrailPoints);
  const trailPink = new THREE.Color(0xff6fb8), trailGold = new THREE.Color(0xffc24d);
  let trailNext = 0, trailTimer = 0;
  let trailRainbow = false;
  const trailTmp = new THREE.Color();
  function sparkleTrail(dt, speed) {
    if (calmMotion) return; // fully off: no emit, Points stay hidden
    if (speed > 0.6) {
      trailTimer += dt;
      while (trailTimer >= TRAIL_EVERY) {
        trailTimer -= TRAIL_EVERY;
        const i = trailNext; trailNext = (trailNext + 1) % TRAIL_N; // recycle oldest slot
        trailAge[i] = 0;
        trailPos[i * 3] = playerPos.x + (rand() - 0.5) * 0.45;
        trailPos[i * 3 + 1] = 0.15;
        trailPos[i * 3 + 2] = playerPos.z + (rand() - 0.5) * 0.45;
        const m = rand();
        if (trailRainbow) {
          trailTmp.setHSL(rand(), 0.85, 0.68);
          trailBase[i * 3] = trailTmp.r; trailBase[i * 3 + 1] = trailTmp.g; trailBase[i * 3 + 2] = trailTmp.b;
        } else {
          trailBase[i * 3] = trailPink.r + (trailGold.r - trailPink.r) * m;
          trailBase[i * 3 + 1] = trailPink.g + (trailGold.g - trailPink.g) * m;
          trailBase[i * 3 + 2] = trailPink.b + (trailGold.b - trailPink.b) * m;
        }
      }
    } else {
      trailTimer = 0;
    }
    let alive = false;
    for (let i = 0; i < TRAIL_N; i++) {
      if (trailAge[i] >= TRAIL_LIFE) { trailCol[i * 3] = trailCol[i * 3 + 1] = trailCol[i * 3 + 2] = 0; continue; }
      trailAge[i] += dt;
      const k = Math.max(0, 1 - trailAge[i] / TRAIL_LIFE) * 0.85; // soft, never blown out
      trailPos[i * 3 + 1] += dt * 0.25; // tiny upward drift
      trailCol[i * 3] = trailBase[i * 3] * k;
      trailCol[i * 3 + 1] = trailBase[i * 3 + 1] * k;
      trailCol[i * 3 + 2] = trailBase[i * 3 + 2] * k;
      alive = true;
    }
    sparkleTrailPoints.visible = alive;
    trailGeo.attributes.position.needsUpdate = true;
    trailGeo.attributes.color.needsUpdate = true;
  }

  // --- Wardrobe (N10): outfit recolors + butterfly friend -------------------------
  // Zoe's dress and tiara-gem materials are hers alone (buildPrincess makes the dress per princess and
  // clones the gem), so recoloring never touches the other princesses. Buddy = 2 wing meshes (+2 draws).
  const dressDefault = playerDressMat.color.getHex();
  const gemDefault = playerGemMat ? playerGemMat.color.getHex() : 0;
  let buddy = null;
  const buddyPos = new THREE.Vector3();
  const buddyTarget = new THREE.Vector3();
  function makeBuddy() {
    if (!butterflyAssets) return null;
    const g = new THREE.Group();
    const wl = new THREE.Group(), wr = new THREE.Group();
    // Same wing texture + color; a clone with forceSinglePass so the two-sided wings cost 1 draw each, not 2.
    const wm = butterflyAssets.wingMat.clone();
    wm.forceSinglePass = true;
    const ml = new THREE.Mesh(butterflyAssets.wingGeo, wm);
    const mr = new THREE.Mesh(butterflyAssets.wingGeo, wm);
    ml.scale.x = -1;
    ml.raycast = mr.raycast = () => {};
    wl.add(ml); wr.add(mr);
    g.add(wl, wr);
    g.scale.setScalar(1.4);
    g.visible = false;
    scene.add(g);
    return { g, wl, wr };
  }
  let buddySnap = true;
  function buddyUpdate(dt, t) {
    if (!buddy || !buddy.g.visible) return;
    const yaw = player.rotation.y, sy = Math.sin(yaw), cy = Math.cos(yaw);
    let a;
    if (calmMotion) {
      // Perched on her shoulder, wings still
      const k = PRINCESS_SCALE;
      buddyTarget.set(playerPos.x + (0.55 * cy) * k, 1.95 * k + player.position.y, playerPos.z - (0.55 * sy) * k);
      buddyPos.copy(buddyTarget);
      a = 0.55;
    } else {
      // Behind and a bit above, drifting; eased so it lags gently
      const bob = Math.sin(t * 2.3) * 0.18;
      buddyTarget.set(playerPos.x - sy * 1.6 + cy * 0.8, 2.9 + bob, playerPos.z - cy * 1.6 - sy * 0.8);
      if (buddySnap) buddyPos.copy(buddyTarget);
      else buddyPos.lerp(buddyTarget, 1 - Math.exp(-2.6 * dt));
      a = 0.35 + Math.sin(t * 9) * 0.8;
    }
    buddySnap = false;
    buddy.g.position.copy(buddyPos);
    buddy.g.rotation.y = yaw;
    buddy.wl.rotation.z = a; buddy.wr.rotation.z = -a;
  }
  function setOutfit(o) {
    o = o || {};
    const pick = (slot) => OUTFIT[slot].choices.find((c) => c.id === o[slot]) || OUTFIT[slot].choices[0];
    const tr = pick('trail');
    trailRainbow = !!tr.rainbow;
    if (tr.trail) { trailPink.set(tr.trail[0]); trailGold.set(tr.trail[1]); }
    if (playerGemMat) {
      const gm = o.gem ? pick('gem') : null;
      if (gm) { playerGemMat.color.setHex(gm.color); playerGemMat.emissive.setHex(gm.color).multiplyScalar(0.55); }
      else { playerGemMat.color.setHex(gemDefault); playerGemMat.emissive.setHex(0xff4f90); }
    }
    playerDressMat.color.setHex(o.skirt ? pick('skirt').color : dressDefault);
    if (o.buddy && !buddy) buddy = makeBuddy();
    if (buddy) {
      if (o.buddy && !buddy.g.visible) buddySnap = true;
      buddy.g.visible = !!o.buddy;
    }
  }

  // --- Celebration bursts ------------------------------------------------------
  const bursts = []; // { points, vel, life, maxLife }

  function celebrate(landId) {
    const def = Object.keys(NPC_DEFS).find((id) => NPC_DEFS[id].land === landId);
    if (!def) return;
    const npc = npcs[def];
    const origin = npc.star.position.clone();

    // Gold star-burst particles
    const COUNT = 90;
    const pos = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = origin.x; pos[i * 3 + 1] = origin.y; pos[i * 3 + 2] = origin.z;
      const a = Math.random() * Math.PI * 2;
      const sp = 2.5 + Math.random() * 4;
      vel[i * 3] = Math.cos(a) * sp;
      vel[i * 3 + 1] = 3 + Math.random() * 4;
      vel[i * 3 + 2] = Math.sin(a) * sp;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: GOLD, size: 0.35, transparent: true, opacity: 1,
      map: softDot, depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    bursts.push({ points, vel, life: 0, maxLife: 3 });

    // Happy hop for the NPC
    npc.hopT = 0;
  }

  // --- NPC state --------------------------------------------------------------
  // Done stars breathe gently unless the player asked for reduced motion.
  const stillStars = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const PULSE_WHITE = new THREE.Color(0xffffff);
  function setNPCState(npcId, state) {
    const npc = npcs[npcId];
    if (!npc) return;
    npc.state = state === 'done' ? 'done' : 'available';
    if (npc.state === 'done') {
      // Completed look: calm warm-gold star (breathes slowly) + steady white pad
      npc.starMat.color.set(GOLD);
      npc.pad.material.color.set(0xffffff);
      npc.pad.material.opacity = 0.75;
    } else {
      npc.starMat.color.set(GOLD);
      npc.pad.material.color.set(npc.def.accent);
      npc.pad.material.opacity = 0.55;
    }
  }

  // --- Proximity tracking ------------------------------------------------------
  let nearNPC = null;

  // --- Resize ------------------------------------------------------------------
  const onResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    frameForAspect(camera.aspect);
    camera.updateProjectionMatrix();
    if (worldPaused) renderer.render(scene, camera); // keep the frozen frame correct behind the card
  };
  window.addEventListener('resize', onResize);
  onResize();
  camTarget.copy(playerPos).add(camOffset); // start at the framed distance
  camera.position.copy(camTarget);
  camera.lookAt(lookTarget);

  // --- Main loop ----------------------------------------------------------------
  const clock = new THREE.Clock();
  const tmpMove = new THREE.Vector2();
  let rafId = 0;
  let padPollTimer = 0;
  let disposed = false;
  let simTime = 0; // seconds of un-paused play; replaces clock.elapsedTime so pauses never make time leap

  // Adaptive resolution: one step down to MIN_PIXEL_RATIO if play stays slow, never back up.
  const WARMUP_MS = 3000;      // ignore shader-compile spikes after load / resume / tab return
  const SLOW_WINDOW_MS = 2000; // continuous slow play needed to step down
  const SLOW_AVG_MS = 22;      // average frame time above this = under ~45 fps
  let steppedDown = pixelRatio <= MIN_PIXEL_RATIO;
  let warmupUntil = performance.now() + WARMUP_MS;
  let lastFrameTs = 0;
  let winMs = 0, winFrames = 0;
  function restartMeasure() {
    warmupUntil = performance.now() + WARMUP_MS;
    lastFrameTs = 0; winMs = 0; winFrames = 0;
  }
  function measureFrame(now) {
    if (steppedDown) return;
    const gap = lastFrameTs ? now - lastFrameTs : 0;
    lastFrameTs = now;
    if (now < warmupUntil || !gap) return;
    if (gap > 250 || document.hidden) { winMs = 0; winFrames = 0; return; } // stall, not steady slowness
    winMs += gap; winFrames++;
    if (winMs >= SLOW_WINDOW_MS) {
      if (winMs / winFrames > SLOW_AVG_MS) {
        steppedDown = true;
        pixelRatio = MIN_PIXEL_RATIO;
        renderer.setPixelRatio(pixelRatio);
        onResize();
      }
      winMs = 0; winFrames = 0;
    }
  }
  document.addEventListener('visibilitychange', restartMeasure);

  function update(dt, t) {
    if (pondTwinkle) pondTwinkle(t);
    // ---- Unified input (polled once per frame) ----
    Input.poll();
    const iv = Input.vector;
    tmpMove.set(iv.x, iv.z);
    if (tmpMove.lengthSq() > 1) tmpMove.normalize();
    const moving = inputEnabled && tmpMove.lengthSq() > 0.0004;
    const targetVel = moving
      ? new THREE.Vector3(tmpMove.x, 0, tmpMove.y).multiplyScalar(PLAYER_SPEED)
      : new THREE.Vector3();
    playerVel.lerp(targetVel, 1 - Math.pow(0.0001, dt)); // smooth accel/decel

    playerPos.x += playerVel.x * dt;
    playerPos.z += playerVel.z * dt;

    // Colliders: push-out (circle vs circle, player radius ~0.55)
    for (const col of colliders) {
      const dx = playerPos.x - col.x, dz = playerPos.z - col.z;
      const d = Math.hypot(dx, dz);
      const minD = col.r + 0.55;
      if (d < minD && d > 0.0001) {
        playerPos.x = col.x + (dx / d) * minD;
        playerPos.z = col.z + (dz / d) * minD;
      }
    }
    // Invisible world wall: slide along the boundary
    const r = Math.hypot(playerPos.x, playerPos.z);
    if (r > WORLD_RADIUS) {
      playerPos.x *= WORLD_RADIUS / r;
      playerPos.z *= WORLD_RADIUS / r;
    }

    // Face movement direction + gentle bob
    const speed = playerVel.length();
    if (speed > 0.6) {
      playerAngle = Math.atan2(playerVel.x, playerVel.z);
      walkPhase += dt * 11;
    }
    // Ease the turn (frame-rate independent), always the short way round
    if (focusNpc) {
      playerAngle = Math.atan2(focusNpc.group.position.x - playerPos.x, focusNpc.group.position.z - playerPos.z);
    }
    player.rotation.y += angleDelta(player.rotation.y, playerAngle) * (1 - Math.exp(-12 * dt));
    player.position.y = speed > 0.6 ? Math.abs(Math.sin(walkPhase)) * 0.09 : 0;
    playerShadow.position.set(playerPos.x, 0.05, playerPos.z);
    sparkleTrail(dt, speed);
    buddyUpdate(dt, t);

    // ---- Camera: smooth top-down follow with slight look-ahead ----
    lookAhead.set(playerVel.x * 0.35, 0, playerVel.z * 0.35);
    const desiredCam = new THREE.Vector3(
      playerPos.x + camOffset.x, camOffset.y, playerPos.z + camOffset.z
    );
    const desiredLook = new THREE.Vector3(
      playerPos.x + lookAhead.x, 1, playerPos.z + lookAhead.z
    );
    // Talking: blend toward a nearer view that keeps both of them in the upper
    // screen, above the dialogue sheet (aim a little south of their midpoint).
    const focusGoal = focusNpc ? 1 : 0;
    focusW = calmMotion ? focusGoal : focusW + (focusGoal - focusW) * (1 - Math.exp(-(focusNpc ? 4.5 : 8) * dt));
    if (focusNpc) {
      focusMid.set(
        (playerPos.x + focusNpc.group.position.x) / 2, 1,
        (playerPos.z + focusNpc.group.position.z) / 2 + FOCUS_DROP
      );
    }
    if (focusW > 0.001) {
      const e = focusW * focusW * (3 - 2 * focusW);
      const m = focusNpc ? focusMid : lastFocusMid;
      if (focusNpc) lastFocusMid.copy(focusMid);
      desiredLook.lerp(m, e);
      desiredCam.lerp(new THREE.Vector3(m.x + camOffset.x * FOCUS_ZOOM, camOffset.y * FOCUS_ZOOM, m.z + camOffset.z * FOCUS_ZOOM), e);
    }
    if (camSnap) {
      camSnap = false;
      camTarget.copy(desiredCam);
      lookTarget.copy(desiredLook);
    }
    camTarget.lerp(desiredCam, 1 - Math.pow(0.001, dt));
    lookTarget.lerp(desiredLook, 1 - Math.pow(0.0005, dt));
    camera.position.copy(camTarget);
    camera.lookAt(lookTarget);

    // ---- NPC stars: bob + spin; gold breath when done ----
    for (const npc of Object.values(npcs)) {
      npc.star.position.y = 3.1 * PRINCESS_SCALE + Math.sin(t * 2 + npc.hue * 6) * 0.22;
      npc.star.rotation.y = t * 1.2;
      if (npc.state === 'done' && !stillStars) {
        // Slow 4 s warm-gold breath: GOLD lightened by up to 18%
        const breath = 0.5 + 0.5 * Math.sin(t * Math.PI / 2);
        npc.starMat.color.set(GOLD).lerp(PULSE_WHITE, breath * 0.18);
      }
      // Idle sway; turn toward Zoe when she is in talk range, brighten the pad
      const near = Math.hypot(playerPos.x - npc.group.position.x, playerPos.z - npc.group.position.z) < NPC_INTERACT_DIST;
      const yaw = near || npc === focusNpc
        ? Math.atan2(playerPos.x - npc.group.position.x, playerPos.z - npc.group.position.z)
        : npc.baseYaw;
      npc.group.rotation.y += angleDelta(npc.group.rotation.y, yaw) * (calmMotion ? 1 : 1 - Math.exp(-5 * dt));
      npc.group.rotation.z = calmMotion ? 0 : Math.sin(t * 1.8 + npc.swayPhase) * 0.03;
      if (npc.state !== 'done') {
        npc.padGlow += ((near ? 1 : 0) - npc.padGlow) * (1 - Math.exp(-6 * dt));
        npc.pad.material.opacity = 0.55 + npc.padGlow * 0.25;
      }
      // Happy hop after celebrate()
      if (npc.hopT >= 0) {
        npc.hopT += dt;
        const k = npc.hopT;
        npc.group.position.y = k < 1.2 ? Math.abs(Math.sin(k * 8)) * 0.5 * (1 - k / 1.4) : 0;
        if (k >= 1.4) { npc.hopT = -1; npc.group.position.y = 0; }
      }
    }

    // ---- Today's star: slow bob + spin (still under calm motion) ----
    if (todayStar.visible && todayTarget) {
      const g = todayTarget.group.position;
      todayStar.position.set(g.x, 3.1 * PRINCESS_SCALE + 1.5 + (calmMotion ? 0 : Math.sin(t * 1.4) * 0.18), g.z);
      if (!calmMotion) todayStar.rotation.y = t * 0.8;
    }

    // ---- Castle star gentle spin ----
    castleStar.rotation.y = t * 0.6;

    // ---- Falling snow drift ----
    if (snowPoints) {
      const p = snowPoints.geometry.attributes.position;
      const c = snowPoints.userData.center;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * 1.6;
        let x = p.getX(i) + Math.sin(t * 1.5 + i) * dt * 0.6;
        if (y < 0) y = 12;
        if (x < c.x - 12) x = c.x + 12; else if (x > c.x + 12) x = c.x - 12;
        p.setY(i, y); p.setX(i, x);
      }
      p.needsUpdate = true;
    }

    // ---- Ice crystals turn and bob (still under calm motion) ----
    if (iceCrystals && !calmMotion) iceCrystals.userData.set(t);
    if (meadowSway && !calmMotion) meadowSway.userData.set(t);

    // ---- Tapped scenery reactions (only the few playing; nothing runs at rest) ----
    for (let i = 0; i < tapItems.length; i++) if (tapItems[i].t >= 0) tapReact(tapItems[i], dt);

    // ---- Sky dome follows the camera ----
    skyMesh.position.copy(camera.position);

    // ---- Starlight motes drift ----
    if (motePoints) {
      const p = motePoints.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.35;
        let z = p.getZ(i) + Math.cos(t * 0.25 + i * 1.7) * dt * 0.35;
        const y = 0.8 + ((p.getY(i) - 0.8 + dt * 0.18) % 5);
        if (x < -18) x = 18; else if (x > 18) x = -18;
        if (z < -18) z = 18; else if (z > 18) z = -18;
        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
    }

    // ---- Butterflies ----
    butterflyFlutter(t);

    // ---- Celebration bursts ----
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life += dt;
      const p = b.points.geometry.attributes.position;
      for (let j = 0; j < p.count; j++) {
        p.setX(j, p.getX(j) + b.vel[j * 3] * dt);
        p.setY(j, p.getY(j) + b.vel[j * 3 + 1] * dt);
        p.setZ(j, p.getZ(j) + b.vel[j * 3 + 2] * dt);
        b.vel[j * 3 + 1] -= 6 * dt; // gravity
      }
      p.needsUpdate = true;
      b.points.material.opacity = Math.max(0, 1 - b.life / b.maxLife);
      if (b.life >= b.maxLife) {
        scene.remove(b.points);
        b.points.geometry.dispose();
        b.points.material.dispose();
        bursts.splice(i, 1);
      }
    }

    // ---- Nearest-NPC proximity ----
    let nearest = null;
    let nearestD = NPC_INTERACT_DIST;
    for (const npc of Object.values(npcs)) {
      const d = Math.hypot(playerPos.x - npc.group.position.x, playerPos.z - npc.group.position.z);
      if (d < nearestD) { nearestD = d; nearest = npc.id; }
    }
    if (nearest !== nearNPC) {
      nearNPC = nearest;
      onNearNPC(nearNPC);
    }

    // ---- Button edges (always consumed so nothing goes stale) ----
    const didInteract = Input.consumeInteract();
    const didPause = Input.consumePause();
    if (inputEnabled && didInteract && nearNPC) onInteractRequest(nearNPC);
    if (didPause) onPauseRequest();
  }

  function loop(now) {
    if (disposed || worldPaused) return;
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    simTime += dt;
    update(dt, simTime);
    renderer.render(scene, camera);
    measureFrame(typeof now === 'number' ? now : performance.now());
  }
  loop();

  // Stop drawing while a full-screen card covers the world; resume with no time jump and one immediate frame.
  function pauseRendering() {
    if (disposed || worldPaused) return;
    worldPaused = true;
    cancelAnimationFrame(rafId);
    // Keep controller discovery alive (no drawing) so the tutorial can switch to pad wording.
    padPollTimer = setInterval(() => Input.poll(), 250);
  }
  function resumeRendering() {
    if (disposed || !worldPaused) return;
    worldPaused = false;
    clearInterval(padPollTimer);
    clock.getDelta(); // discard the time spent paused (simTime only advances in loop)
    Input.consumeInteract(); Input.consumePause(); // taps/keys made on the card must not fire in the world
    restartMeasure();
    update(0, simTime);
    renderer.render(scene, camera); // no blank/stale frame on the first paint back
    rafId = requestAnimationFrame(loop);
  }

  // --- Dispose -----------------------------------------------------------------
  function dispose() {
    disposed = true;
    cancelAnimationFrame(rafId);
    clearInterval(padPollTimer);
    document.removeEventListener('visibilitychange', restartMeasure);
    Input.dispose();
    window.removeEventListener('resize', onResize);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    tappables.length = 0; tapItems.length = 0; // sprite materials are freed by the scene traversal below
    scene.traverse((o) => {
      if (o.geometry && !Object.values(_geo).includes(o.geometry)) o.geometry.dispose();
      if (o.material && !Object.values(_mat).includes(o.material)) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  }

  // --- Public API ---------------------------------------------------------------
  return {
    setInputEnabled(bool) { inputEnabled = !!bool; },
    // Frame Zoe + one princess for a conversation; unfocus returns to the normal follow.
    focus(npcId) { if (npcs[npcId]) { focusNpc = npcs[npcId]; camSnap = calmMotion; } },
    unfocus() { if (focusNpc) { focusNpc = null; camSnap = calmMotion; } },
    celebrate,
    setNPCState,
    setOutfit,
    setTodayStar,
    pause: pauseRendering,
    resume: resumeRendering,
    isPaused() { return worldPaused; },
    getPixelRatio() { return renderer.getPixelRatio(); },
    dispose,
  };
}
