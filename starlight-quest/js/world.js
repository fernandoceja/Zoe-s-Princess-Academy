// ============================================================================
// Zoe's Starlight Quest — 3D World Module
// Stylized pastel low-poly hub world with four lands, Princess Zoe player,
// four NPC princesses, interaction hooks, and celebration effects.
// Three.js as ES module: `import * as THREE from 'three';` (importmap 'three').
// ============================================================================

import * as THREE from 'three';
import { Input } from './input.js?v=20261023s8';

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
 * opts: { dress, accent, hair, hairStyle: 'wavy'|'long'|'bun'|'braid', tiara: bool }
 * Returns { group, hitMeshes } — hitMeshes tagged for raycasting.
 */
function buildPrincess(opts, tagId) {
  const group = new THREE.Group();
  const hitMeshes = [];
  const skin = M('skin', () => new THREE.MeshStandardMaterial({ color: 0xf6cfa8, roughness: 0.8 }));
  const dressMat = new THREE.MeshStandardMaterial({ color: opts.dress, roughness: 0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color: opts.accent, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: opts.hair, roughness: 0.85 });
  const goldMat = M('gold', () => new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.35, metalness: 0, emissive: 0x7a5a14, emissiveIntensity: 0.9 }));

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
    const fallGeo = G('hairFall', () => new THREE.SphereGeometry(0.16, 8, 8));
    const l = add(new THREE.Mesh(fallGeo, hairMat), -0.32, 1.35, 0.05); l.scale.set(1, 2.2, 1);
    const r = add(new THREE.Mesh(fallGeo, hairMat), 0.32, 1.35, 0.05); r.scale.set(1, 2.2, 1);
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

  // Tiny gold tiara
  if (opts.tiara !== false) {
    const tiara = add(new THREE.Mesh(G('tiara', () => new THREE.TorusGeometry(0.16, 0.035, 8, 16, Math.PI)), goldMat), 0, 2.12, 0.02);
    tiara.rotation.x = -0.15;
  }

  group.scale.setScalar(PRINCESS_SCALE);
  return { group, hitMeshes };
}

// ---------------------------------------------------------------------------
// createWorld
// ---------------------------------------------------------------------------

export function createWorld(container, hooks) {
  hooks = hooks || {};
  const onNearNPC = typeof hooks.onNearNPC === 'function' ? hooks.onNearNPC : () => {};
  const onInteractRequest = typeof hooks.onInteractRequest === 'function' ? hooks.onInteractRequest : () => {};
  const onPauseRequest = typeof hooks.onPauseRequest === 'function' ? hooks.onPauseRequest : () => {};

  // --- Renderer / scene / camera -------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

  // Lights: hemisphere + directional, no shadow maps (tablet perf)
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x9fd8b0, 1.2));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.35);
  sun.position.set(20, 30, 12);
  scene.add(sun);

  // --- Colliders ------------------------------------------------------------
  const colliders = []; // {x, z, r}
  const addCollider = (x, z, r) => colliders.push({ x, z, r });

  const pastel = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const goldMat = M('gold', () => new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.35, metalness: 0, emissive: 0x7a5a14, emissiveIntensity: 0.9 }));

  // --- Ground: big soft disc ------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD_RADIUS + 8, 48),
    pastel(0xbfe6b4)
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Gentle green tint patches (very cheap, 4 big flat discs)
  const patchGeo = new THREE.CircleGeometry(9, 24);
  const patchMat = pastel(0xb2deb0);
  [[-14, 8], [14, -6], [-6, -16], [10, 14]].forEach(([x, z]) => {
    const p = new THREE.Mesh(patchGeo, patchMat);
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.01, z);
    scene.add(p);
  });

  // --- Hub plaza ------------------------------------------------------------
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(8.5, 40), pastel(0xf6e7c8));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02;
  scene.add(plaza);
  // Gold ring around plaza
  const ring = new THREE.Mesh(new THREE.RingGeometry(8.5, 9.1, 48), goldMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  scene.add(ring);

  // Paths: 4 straight ribbons from plaza edge outward to each land
  const pathGeo = new THREE.PlaneGeometry(4.4, 16);
  const pathMat = pastel(0xead9b8);
  Object.values(LANDS).forEach((land) => {
    const dir = new THREE.Vector3(Math.cos(land.angle), 0, Math.sin(land.angle));
    const p = new THREE.Mesh(pathGeo, pathMat);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = -land.angle + Math.PI / 2;
    p.position.copy(dir.clone().multiplyScalar(16.5));
    p.position.y = 0.025;
    scene.add(p);
  });

  // --- Starlight Castle (hub, set back so the plaza stays walkable) ---------
  const castle = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xffe3ee, roughness: 0.85, emissive: 0xffc4dc, emissiveIntensity: 0.22 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xff9ec6, roughness: 0.6 });
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
  const landTint = { library: 0xcfe4ff, frostfall: 0xe8f4ff, meadow: 0xd8f5d8, village: 0xfbeed3 };
  Object.entries(LANDS).forEach(([id, land]) => {
    const cx = Math.cos(land.angle) * LAND_DIST;
    const cz = Math.sin(land.angle) * LAND_DIST;
    landCenters[id] = new THREE.Vector3(cx, 0, cz);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(10.5, 36), pastel(landTint[id]));
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
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, N);
    const books = new THREE.InstancedMesh(bookGeo, bookMat, N * 5);
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
      // 5 colorful "book" leaves around the treetop
      for (let b = 0; b < 5; b++) {
        const ba = (b / 5) * Math.PI * 2 + i;
        dummy.position.set(x + Math.cos(ba) * 1.1, 3.4 + (b % 2) * 0.8, z + Math.sin(ba) * 1.1);
        dummy.rotation.set(0.3 * (b % 3), ba, 0.2);
        dummy.updateMatrix();
        const idx = i * 5 + b;
        books.setMatrixAt(idx, dummy.matrix);
        books.setColorAt(idx, col.setHex(palette[(i + b) % palette.length]));
      }
    }
    trunks.instanceMatrix.needsUpdate = true;
    books.instanceMatrix.needsUpdate = true;
    if (books.instanceColor) books.instanceColor.needsUpdate = true;
    scene.add(trunks, books);
    // Cozy reading nook: a tiny round rug + story book prop at the center
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2, 24), pastel(0xffd9e8));
    rug.rotation.x = -Math.PI / 2; rug.position.set(c.x, 0.03, c.z);
    scene.add(rug);
    addCollider(c.x, c.z, 0.4);
  }

  // ---- (2) Frostfall Peaks: snowy cones + mounds + falling snow -------------
  let snowPoints = null;
  {
    const c = landCenters.frostfall;
    const coneGeo = new THREE.ConeGeometry(2.2, 6, 10);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf4faff, roughness: 0.9, emissive: 0xdcebff, emissiveIntensity: 0.28 });
    const capGeo = new THREE.ConeGeometry(1.1, 2.2, 10);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, roughness: 0.7, emissive: 0x9fcfff, emissiveIntensity: 0.25 });
    const N = 10;
    let placed = 0;
    const cones = new THREE.InstancedMesh(coneGeo, coneMat, N);
    const caps = new THREE.InstancedMesh(capGeo, capMat, N);
    const moundGeo = new THREE.SphereGeometry(1.4, 12, 8);
    const mounds = new THREE.InstancedMesh(moundGeo, coneMat, 8);
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
      addCollider(x, z, 1.8);
    }
    cones.count = caps.count = placed;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.6;
      const x = c.x + Math.cos(a) * 7.5, z = c.z + Math.sin(a) * 7.5;
      dummy.position.set(x, -0.5, z); dummy.scale.set(1.6, 0.7, 1.6);
      dummy.rotation.y = 0; dummy.updateMatrix();
      mounds.setMatrixAt(i, dummy.matrix);
    }
    cones.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    mounds.instanceMatrix.needsUpdate = true;
    scene.add(cones, caps, mounds);

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
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 2.5 + Math.random() * 6.5;
      const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
      const s = 0.8 + Math.random() * 0.7;
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
    const pondRim = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.1, 28), pastel(0xe8f7ff));
    pondRim.rotation.x = -Math.PI / 2; pondRim.position.set(c.x + 5.5, 0.03, c.z - 4.5);
    scene.add(pondRim);
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
    houseSpots.forEach((h, i) => {
      const g = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 3), pastel(wallColors[i]));
      walls.position.y = 1.3; g.add(walls);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.8, 4), pastel(roofColors[i]));
      roof.position.y = 3.5; roof.rotation.y = Math.PI / 4; g.add(roof);
      const doorM = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), pastel(0x8a5a3b));
      doorM.position.set(0, 0.8, 1.51); g.add(doorM);
      const winM = new THREE.MeshStandardMaterial({ color: 0xfffbe8, roughness: 0.3 });
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), winM);
      win.position.set(1.05, 1.6, 1.51); g.add(win);
      const win2 = win.clone(); win2.position.x = -1.05; g.add(win2);
      const wx = c.x + h.dx, wz = c.z + h.dz;
      g.position.set(wx, 0, wz); g.rotation.y = h.rot;
      scene.add(g);
      addCollider(wx, wz, 2.6);
    });

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

  // --- Player: Princess Zoe --------------------------------------------------
  const { group: player, hitMeshes: playerHit } = buildPrincess(
    { dress: 0xff8fb3, accent: 0xffc9da, hair: 0x3d2a1e, hairStyle: 'wavy', tiara: true },
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
  let disposed = false;

  function update(dt, t) {
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

  function loop() {
    if (disposed) return;
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt, clock.elapsedTime);
    renderer.render(scene, camera);
  }
  loop();

  // --- Dispose -----------------------------------------------------------------
  function dispose() {
    disposed = true;
    cancelAnimationFrame(rafId);
    Input.dispose();
    window.removeEventListener('resize', onResize);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
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
    dispose,
  };
}
