/* Zoe's Starlight Quest — world look layer (visual polish).
 *
 * The 3D world (js/world.js) is hash-locked, so this file never edits it. It wraps three.js's
 * WebGLRenderer.render once, before createWorld runs. On the world's own render call it:
 *   1. lights: ACES tone mapping (sRGB output stays on), a warm key light and a sky/ground fill;
 *   2. shadows: one shadow map that follows Zoe, cast only by Zoe, the princesses and big props;
 *   3. bloom: a small, quarter-size glow pass for sparkles, stars, crowns and magic (High only);
 *   4. sky and fog: each land's own mood colour, blended as Zoe walks between lands;
 *   5. idle motion: breathing for Zoe and the princesses, a gentle sway for Zoe at rest, shimmering water;
 *   6. touches: a soft rim light on the characters and a smooth extra camera ease.
 * Reduce Motion turns off the breathing, sway, water shimmer and camera ease.
 * Nothing here reads pixels back from the GPU (no readPixels, no getImageData, no preserveDrawingBuffer).
 * No network, no new assets: every effect is procedural.
 */
import * as THREE from 'three';
import { PRESETS, readQuality, writeQuality, effectiveLevel, makeFpsGuard, moodAt } from '../flow/quality.js';

const GLOW_LAYER = 5;
const EXPOSURE = 0.68;   // ACES pre-scales by 1/0.6, so this keeps the pastels close to the old look
const GLOW_MAX_R = 1.3; // only small things glow (stars, crowns, gems, sparkles), never a whole ring or wall

const state = {
  installed: false,
  choice: 'auto',
  autoDropped: false,
  level: 'high',
  listeners: new Set(),
  fx: null, // per-renderer effect state (one world at a time)
};

const reduceQuery = (() => { try { return window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null; } catch (e) { return null; } })();
const calm = () => !!(reduceQuery && reduceQuery.matches);
const store = () => { try { return window.localStorage; } catch (e) { return null; } };

function notify() {
  const s = getFxStatus();
  state.listeners.forEach((fn) => { try { fn(s); } catch (e) { /* a listener must not break the frame */ } });
}

/** {choice, level, autoDropped, fps} */
export function getFxStatus() {
  return { choice: state.choice, level: state.level, autoDropped: state.autoDropped, fps: state.fx ? Math.round(state.fx.guard.fps) : 0 };
}
export function onFxStatus(fn) { state.listeners.add(fn); return () => state.listeners.delete(fn); }

/** Parent Corner: save the choice and apply it right away. Choosing again clears an earlier Auto drop. */
export function setFxQuality(choice) {
  state.choice = writeQuality(store(), choice);
  state.autoDropped = false;
  if (state.fx) state.fx.rearm();
  setLevel(effectiveLevel(state.choice, state.autoDropped));
  notify();
}

function setLevel(level) {
  state.level = level;
  if (state.fx) state.fx.apply(level);
}

// ---------------------------------------------------------------------------------------------------
// Shader patches (installed once per material; strength lives in shared uniforms, so switching quality
// never recompiles them).
// ---------------------------------------------------------------------------------------------------
const U = {
  rim: { value: 0.3 },
  rimColor: { value: new THREE.Color(0xfff0dc) },
  water: { value: 1 },
  time: { value: 0 },
};

function patchRim(mat) {
  if (!mat || mat.userData.zsqRim || !mat.isMeshStandardMaterial) return;
  mat.userData.zsqRim = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.zsqRim = U.rim;
    sh.uniforms.zsqRimColor = U.rimColor;
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform float zsqRim;\nuniform vec3 zsqRimColor;\nvoid main() {')
      .replace('#include <opaque_fragment>',
        '{ float zsqF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);\n' +
        '  outgoingLight += zsqRimColor * (zsqF * zsqF * zsqF) * zsqRim; }\n#include <opaque_fragment>');
  };
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => prevKey() + '|zsqRim';
  mat.needsUpdate = true;
}

// Water shimmer: soft moving highlights on blue water. allBlue = the whole material is water (the meadow
// pond); otherwise only vertex colours that read as water/ice on a merged land mesh get it.
function patchWater(mat, allBlue) {
  if (!mat || mat.userData.zsqWater || !mat.isMeshStandardMaterial) return;
  mat.userData.zsqWater = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.zsqWater = U.water;
    sh.uniforms.zsqTime = U.time;
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'varying vec2 zsqXZ;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nzsqXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    const mask = allBlue ? '1.0' : 'smoothstep(0.16, 0.3, vColor.b - max(vColor.r, vColor.g * 0.85))';
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform float zsqWater;\nuniform float zsqTime;\nvarying vec2 zsqXZ;\nvoid main() {')
      .replace('#include <opaque_fragment>',
        '{ float zsqW = ' + mask + ';\n' +
        '  float zsqS = sin(zsqXZ.x * 1.7 + zsqTime * 1.3) * sin(zsqXZ.y * 1.35 - zsqTime * 1.05);\n' +
        '  zsqS = smoothstep(0.55, 1.0, zsqS);\n' +
        '  outgoingLight += vec3(0.85, 0.95, 1.0) * zsqS * 0.11 * zsqW * zsqWater; }\n#include <opaque_fragment>');
  };
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => prevKey() + '|zsqWater' + (allBlue ? 'A' : 'V');
  mat.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------------
// Bloom (quarter size): glow-layer objects -> blur -> added on top of the finished frame.
// ---------------------------------------------------------------------------------------------------
const QUAD_VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
function makeBloom(renderer) {
  const caps = renderer.capabilities;
  const ext = renderer.extensions;
  const half = caps.isWebGL2 && (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'));
  const opts = { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false };
  const rtA = new THREE.WebGLRenderTarget(4, 4, opts);
  const rtB = new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: false });
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geo = new THREE.PlaneGeometry(2, 2);
  const blur = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } },
    vertexShader: QUAD_VS,
    fragmentShader: `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tex, vUv).rgb * 0.2270;
        c += (texture2D(tex, vUv + dir * 1.3846).rgb + texture2D(tex, vUv - dir * 1.3846).rgb) * 0.3162;
        c += (texture2D(tex, vUv + dir * 3.2308).rgb + texture2D(tex, vUv - dir * 3.2308).rgb) * 0.0703;
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const comp = new THREE.ShaderMaterial({
    uniforms: { tex: { value: rtA.texture }, strength: { value: 0.85 } },
    vertexShader: QUAD_VS,
    fragmentShader: `uniform sampler2D tex; uniform float strength; varying vec2 vUv;
      void main() {
        vec3 b = 1.0 - exp(-texture2D(tex, vUv).rgb * strength);
        gl_FragColor = vec4(pow(b, vec3(0.4545)), 1.0);
      }`,
    blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  });
  // Depth-only stand-in for the occluder pass (pushed back a hair so the glow objects' own depth wins ties).
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const quad = new THREE.Mesh(geo, blur);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const size = new THREE.Vector2();
  const clear = new THREE.Color();
  return {
    resize(w, h) {
      const qw = Math.max(1, Math.round(w / 4)), qh = Math.max(1, Math.round(h / 4));
      if (rtA.width !== qw || rtA.height !== qh) { rtA.setSize(qw, qh); rtB.setSize(qw, qh); }
    },
    run(render, scene, camera, points, strength) {
      renderer.getDrawingBufferSize(size);
      this.resize(size.x, size.y);
      const prevTarget = renderer.getRenderTarget();
      const prevAuto = renderer.autoClear;
      const prevShadowAuto = renderer.shadowMap.autoUpdate;
      const prevAlpha = renderer.getClearAlpha();
      renderer.getClearColor(clear);
      const prevBg = scene.background;
      const prevMask = camera.layers.mask;
      // Points are sized in screen pixels: shrink them to match the quarter-size target.
      for (const m of points) { m.userData.zsqSize = m.size; m.size = m.size / 4; }
      scene.background = null;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(rtA);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, false);
      renderer.autoClear = false;
      // Depth first: every normal object writes depth only (no colour), so walls, bodies and towers hide
      // the glow behind them exactly as they hide it in the real frame. Then the glow layer draws on top.
      const prevOverride = scene.overrideMaterial;
      scene.overrideMaterial = depthOnly;
      render(scene, camera);
      scene.overrideMaterial = prevOverride;
      camera.layers.set(GLOW_LAYER);
      render(scene, camera);
      camera.layers.mask = prevMask;
      scene.background = prevBg;
      for (const m of points) m.size = m.userData.zsqSize;
      // Two blur passes (wide then wider).
      quad.material = blur;
      for (let i = 0; i < 2; i++) {
        const s = i + 1;
        blur.uniforms.tex.value = rtA.texture; blur.uniforms.dir.value.set(s / rtA.width, 0);
        renderer.setRenderTarget(rtB); render(quadScene, cam);
        blur.uniforms.tex.value = rtB.texture; blur.uniforms.dir.value.set(0, s / rtA.height);
        renderer.setRenderTarget(rtA); render(quadScene, cam);
      }
      // Add the glow onto the finished frame.
      quad.material = comp;
      comp.uniforms.strength.value = strength;
      renderer.setRenderTarget(prevTarget);
      render(quadScene, cam);
      renderer.autoClear = prevAuto;
      renderer.shadowMap.autoUpdate = prevShadowAuto;
      renderer.setClearColor(clear, prevAlpha);
    },
    dispose() { rtA.dispose(); rtB.dispose(); geo.dispose(); blur.dispose(); comp.dispose(); depthOnly.dispose(); },
  };
}

// ---------------------------------------------------------------------------------------------------
// Scene scan: find the characters, big props, glow objects, sky, water and blob shadows.
// ---------------------------------------------------------------------------------------------------
const isDressCone = (g) => g && g.type === 'ConeGeometry' && g.parameters &&
  g.parameters.radius === 0.55 && g.parameters.height === 1.3 && g.parameters.radialSegments === 12;
const box = new THREE.Box3();
const vSize = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const instM = new THREE.Matrix4();

const sph = new THREE.Sphere();
function small(o) {
  const g = o.geometry;
  if (!g) return false;
  if (!g.boundingSphere) g.computeBoundingSphere();
  o.updateWorldMatrix(true, false);
  sph.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
  return o.isInstancedMesh ? g.boundingSphere.radius < GLOW_MAX_R : sph.radius < GLOW_MAX_R;
}

function isGlowMaterial(m) {
  if (!m) return false;
  if (m.isPointsMaterial) return true;
  if (m.blending === THREE.AdditiveBlending) return true;
  // Gold and silver (stars, crowns, tiaras) and other clearly emissive bits (gems, magic).
  if (m.emissive && m.emissiveIntensity >= 0.35 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.06) return true;
  return false;
}

function makeFx(renderer, scene, camera, render) {
  const seen = new WeakSet();
  const characters = [];     // {group, base, phase, player, still}
  const points = new Set();  // PointsMaterials on the glow layer
  const blobs = new Set();   // the old blob-shadow material(s)
  const shadowMats = new Set();
  let sky = null, hemi = null, sun = null;
  let player = null;
  let lastChildCount = -1, nextScan = 0;
  let level = null;
  let bloom = null;
  let guard = makeFpsGuard();

  const original = {
    toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure,
  };

  function scanObject(o) {
    if (seen.has(o)) return;
    seen.add(o);
    if (o.isHemisphereLight && !hemi) { hemi = o; o.layers.enable(GLOW_LAYER); return; }
    if (o.isDirectionalLight && !sun) { sun = o; o.layers.enable(GLOW_LAYER); return; }
    if (o.isGroup && o.children.some((c) => c.isMesh && isDressCone(c.geometry))) {
      const isPlayer = !o.children.some((c) => c.userData && c.userData.npcId);
      const entry = { group: o, base: o.scale.y, phase: characters.length * 1.37, player: isPlayer, restT: 0, last: o.position.clone() };
      characters.push(entry);
      if (isPlayer) player = entry;
      o.traverse((c) => {
        if (!c.isMesh) return;
        seen.add(c);
        c.castShadow = true;
        c.receiveShadow = true;
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach((m) => { patchRim(m); shadowMats.add(m); if (isGlowMaterial(m)) c.layers.enable(GLOW_LAYER); });
      });
      return;
    }
    if (o.isPoints) {
      const m = o.material;
      // Sparkle sets glow; falling snow (it carries its drift centre) does not, or Frostfall would turn to haze.
      if (m && m.isPointsMaterial && !(o.userData && o.userData.center)) { o.layers.enable(GLOW_LAYER); points.add(m); }
      return;
    }
    if (o.isSprite) {
      if (o.material && o.material.blending === THREE.AdditiveBlending) o.layers.enable(GLOW_LAYER);
      return;
    }
    if (!o.isMesh) return;
    const m = o.material;
    if (!m || Array.isArray(m)) return;
    // Sky dome (vertex-coloured back-side sphere).
    if (!sky && m.isMeshBasicMaterial && m.side === THREE.BackSide && m.vertexColors && o.geometry.type === 'SphereGeometry') { sky = o; return; }
    if (m.isMeshBasicMaterial) {
      // The soft blob under each character: lighter once real shadows are on.
      if (m.transparent && !m.depthWrite && m.color && m.color.getHex() === 0x1a1030) { blobs.add(m); if (m.userData.zsqOpacity == null) m.userData.zsqOpacity = m.opacity; return; }
      // Additive glows, and the bright warm stars (talk stars, today's star) that are flat MeshBasic shapes.
      const warm = m.color && m.color.r > 0.6 && m.color.g > 0.45 && m.color.b < m.color.g;
      if ((m.blending === THREE.AdditiveBlending || (warm && !(m.transparent && m.opacity < 0.9) && o.geometry.type === 'ShapeGeometry')) && small(o)) o.layers.enable(GLOW_LAYER);
      return;
    }
    if (isGlowMaterial(m) && small(o)) o.layers.enable(GLOW_LAYER);
    if (m.transparent && m.opacity < 0.95) return;
    shadowMats.add(m);
    o.receiveShadow = true;
    // Big props cast: anything standing 1.2 units tall or more (trees, houses, the castle, merged land scenery).
    const g = o.geometry;
    if (g) {
      if (!g.boundingBox) g.computeBoundingBox();
      // World-space height (flat discs are built upright and turned to lie down, so local size lies).
      o.updateWorldMatrix(true, false);
      tmpM.copy(o.matrixWorld);
      if (o.isInstancedMesh && o.count > 0) { o.getMatrixAt(0, instM); tmpM.multiply(instM); }
      box.copy(g.boundingBox).applyMatrix4(tmpM).getSize(vSize);
      if (vSize.y >= 1.2) o.castShadow = true;
    }
    if (m.isMeshStandardMaterial) {
      if (m.vertexColors) patchWater(m, false);
      else if (m.color && m.color.getHex() === 0x8fd4f5 && o.geometry.type === 'CircleGeometry') patchWater(m, true);
    }
  }

  function scan() {
    scene.traverse(scanObject);
    lastChildCount = scene.children.length;
  }

  function apply(next) {
    const p = PRESETS[next] || PRESETS.high;
    const shadowsChanged = level === null || PRESETS[level].shadows !== p.shadows || PRESETS[level].softShadows !== p.softShadows;
    level = next;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = p.shadows;
    renderer.shadowMap.type = p.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    if (sun) {
      sun.castShadow = p.shadows;
      if (sun.shadow.mapSize.x !== p.shadowSize) {
        sun.shadow.mapSize.set(p.shadowSize, p.shadowSize);
        if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      }
    }
    blobs.forEach((m) => { m.opacity = p.shadows ? m.userData.zsqOpacity * 0.6 : m.userData.zsqOpacity; });
    U.rim.value = p.rim;
    if (shadowsChanged) shadowMats.forEach((m) => { m.needsUpdate = true; });
    if (p.bloom && !bloom) bloom = makeBloom(renderer);
  }

  function setupLights() {
    if (hemi) { hemi.color.set(0xeef0ff); hemi.groundColor.set(0xc9d9a8); hemi.intensity = 1.0; }
    if (sun) {
      sun.color.set(0xffdcae); sun.intensity = 1.9;
      const sc = sun.shadow.camera;
      sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 80;
      sc.updateProjectionMatrix();
      sun.shadow.bias = -0.0008;
      sun.shadow.normalBias = 0.035;
      sun.shadow.radius = 3;
      if (!sun.target.parent) scene.add(sun.target);
      sun.userData.zsqOffset = sun.position.clone().sub(sun.target.position).normalize().multiplyScalar(36);
    }
  }

  // Per-land mood, eased so walking from one land to the next fades the colours.
  const mood = { horizon: new THREE.Color(0xdff3ff), zenith: new THREE.Color(0xbcd0f7), fog: new THREE.Color(0xdff3ff) };
  const goal = { horizon: new THREE.Color(), zenith: new THREE.Color(), fog: new THREE.Color() };
  let moodReady = false;
  const tmpC = new THREE.Color();
  function updateMood(dt) {
    const px = player ? player.group.position.x : 0, pz = player ? player.group.position.z : 0;
    const m = moodAt(px, pz);
    goal.horizon.setHex(m.horizon); goal.zenith.setHex(m.zenith); goal.fog.setHex(m.fog);
    const k = moodReady ? 1 - Math.exp(-1.6 * dt) : 1;
    moodReady = true;
    mood.horizon.lerp(goal.horizon, k); mood.zenith.lerp(goal.zenith, k); mood.fog.lerp(goal.fog, k);
    if (scene.fog) { scene.fog.color.copy(mood.fog); scene.fog.near = 42; scene.fog.far = 100; }
    if (scene.background && scene.background.isColor) scene.background.copy(mood.fog);
    if (hemi) hemi.color.copy(tmpC.set(0xeef0ff).lerp(mood.zenith, 0.25));
    if (sky) {
      const geo = sky.geometry, pos = geo.attributes.position, col = geo.attributes.color;
      if (col && sky.userData.zsqKey !== mood.horizon.getHex() * 7 + mood.zenith.getHex()) {
        sky.userData.zsqKey = mood.horizon.getHex() * 7 + mood.zenith.getHex();
        const r = geo.parameters.radius || 250;
        for (let i = 0; i < pos.count; i++) {
          const h = Math.max(0, pos.getY(i) / r);
          tmpC.copy(mood.horizon).lerp(mood.zenith, Math.pow(h, 0.7));
          col.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
        }
        col.needsUpdate = true;
      }
    }
  }

  // Idle motion and the camera ease. Values are restored after the frame where the world owns them.
  const camPos = new THREE.Vector3(), camQuat = new THREE.Quaternion();
  const smPos = new THREE.Vector3(), smQuat = new THREE.Quaternion();
  let smReady = false;
  let lastNow = 0, t = 0;

  function before(now) {
    const dt = lastNow ? Math.min(0.05, Math.max(0, (now - lastNow) / 1000)) : 0;
    lastNow = now;
    if (scene.children.length !== lastChildCount || now > nextScan) { scan(); nextScan = now + 1500; }
    const still = calm();
    t += dt;
    U.time.value = still ? 0 : t;
    U.water.value = still ? 0 : PRESETS[level].water;
    updateMood(dt);

    for (const c of characters) {
      const g = c.group;
      const moved = Math.hypot(g.position.x - c.last.x, g.position.z - c.last.z);
      c.last.copy(g.position);
      c.restT = moved > 0.002 ? 0 : c.restT + dt;
      if (still) { g.scale.setScalar(c.base); if (c.player) g.rotation.z = 0; continue; }
      const s = Math.sin(t * 2.1 + c.phase);
      g.scale.set(c.base * (1 - 0.006 * s), c.base * (1 + 0.016 * s), c.base * (1 - 0.006 * s));
      if (c.player) {
        const rest = Math.min(1, Math.max(0, (c.restT - 0.4) / 0.8));
        g.rotation.z = Math.sin(t * 1.5) * 0.028 * rest;
      }
    }

    if (sun && sun.castShadow && player) {
      const p = player.group.position;
      sun.target.position.set(p.x, 0, p.z);
      sun.position.copy(sun.target.position).add(sun.userData.zsqOffset);
      sun.target.updateMatrixWorld();
    }

    // Smooth camera ease on top of the world's own follow (off under Reduce Motion).
    camPos.copy(camera.position); camQuat.copy(camera.quaternion);
    if (still || !smReady || smPos.distanceTo(camPos) > 6) { smPos.copy(camPos); smQuat.copy(camQuat); smReady = true; }
    else {
      const k = 1 - Math.exp(-9 * dt);
      smPos.lerp(camPos, k); smQuat.slerp(camQuat, k);
    }
    camera.position.copy(smPos); camera.quaternion.copy(smQuat);
  }

  function after(now) {
    const p = PRESETS[level];
    if (p.bloom && bloom) bloom.run(render, scene, camera, points, p.bloomStrength);
    // Hand the camera back to the world unchanged (its matrixWorld keeps the drawn view, so taps match the screen).
    camera.position.copy(camPos); camera.quaternion.copy(camQuat);
    if (state.choice === 'auto' && !state.autoDropped) {
      if (guard.frame(now, typeof document !== 'undefined' && document.hidden)) {
        state.autoDropped = true;
        setLevel('low');
        notify();
      }
    }
  }

  scan();
  setupLights();
  apply(effectiveLevel(state.choice, state.autoDropped));

  return {
    renderer, scene, camera, apply, before, after,
    get guard() { return guard; },
    // Parent Corner picked a level again: a fresh guard, so Auto can drop to Low again later.
    rearm() { guard = makeFpsGuard(); },
    get player() { return player; },
    get counts() { return { characters: characters.length, glowPoints: points.size }; },
    restore() {
      renderer.toneMapping = original.toneMapping; renderer.toneMappingExposure = original.exposure;
      if (bloom) bloom.dispose();
    },
  };
}

/** Install once, before createWorld. Safe to call more than once. */
export function installWorldFx() {
  if (state.installed) return;
  state.installed = true;
  state.choice = readQuality(store());
  state.level = effectiveLevel(state.choice, false);
  // three r160 builds render() inside the WebGLRenderer constructor (an own property, not on the prototype),
  // so the renderer is caught on its first frame through Scene.onBeforeRender and its render() wrapped then.
  const wrapped = new WeakSet();
  const sceneProto = THREE.Scene.prototype;
  const prevBefore = sceneProto.onBeforeRender;
  sceneProto.onBeforeRender = function (renderer, scene, camera, target) {
    if (renderer && !wrapped.has(renderer) && !target && camera && camera.isPerspectiveCamera) wrapRenderer(renderer);
    return prevBefore.call(this, renderer, scene, camera, target);
  };
  function wrapRenderer(renderer) {
    wrapped.add(renderer);
    const orig = renderer.render;
    let busy = false;
    renderer.render = function zsqRender(scene, camera) {
      if (busy || !scene || !scene.isScene || !camera || !camera.isPerspectiveCamera || renderer.getRenderTarget()) {
        return orig.call(renderer, scene, camera);
      }
      busy = true;
      try {
        let fx = state.fx;
        if (!fx || fx.renderer !== renderer || fx.scene !== scene) {
          if (fx) fx.restore();
          fx = state.fx = makeFx(renderer, scene, camera, (s, c) => orig.call(renderer, s, c));
          notify();
        }
        const now = performance.now();
        fx.before(now);
        orig.call(renderer, scene, camera);
        fx.calls = renderer.info.render.calls;
        fx.after(now);
      } finally {
        busy = false;
      }
    };
  }
  if (reduceQuery && reduceQuery.addEventListener) reduceQuery.addEventListener('change', notify);
  // Debug and test hook, only with ?fxdebug in the address (never in normal play).
  try {
    if (/[?&]fxdebug\b/.test(window.location.search)) {
      window.__zsqFx = {
        status: getFxStatus,
        set: setFxQuality,
        teleport(x, z) { const p = state.fx && state.fx.player; if (p) { p.group.position.x = x; p.group.position.z = z; } return !!p; },
        counts() { return state.fx ? state.fx.counts : null; },
        playerScale() { const p = state.fx && state.fx.player; return p ? p.group.scale.y : 0; },
        drawCalls() { return state.fx ? state.fx.calls : 0; },
      };
    }
  } catch (e) { /* no window */ }
}
