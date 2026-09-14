/*
 * attractive-3d.js — Feature A: real WebGL 3D
 *
 * A self-contained classic-script IIFE (no bundler, no modules), mirroring the
 * proven pattern in attractive-equations.js: it reads main.js's top-level
 * globals directly from the shared global lexical scope (`attractors`,
 * `currentAttractor`, `currentParams`, `particles`, `speed`, `zoom`,
 * `currentColorScheme`, `colorSchemes`, `glowIntensity`, `animationId`), wraps
 * the global `render` and `updateAttractor` functions, injects its own
 * <style>, and guards every cross-feature call defensively.
 *
 * It renders the current attractor as a glowing 3D trail with three.js
 * (loaded as the `THREE` UMD global). A custom arcball replaces OrbitControls,
 * and additive overlay lines fake the EffectComposer bloom. Camera framing,
 * the arcball feel, the faked bloom, and ray-picking are ported from the iOS
 * app's PhaseSpaceCoordinator.swift / AttractiveEngine.swift.
 *
 * Integration facts confirmed by reading main.js (a bare classic script whose
 * top-level bindings are shared with this file):
 *   - rAF handle for the 2D loop:   `animationId`           (top-level let)
 *   - 2D render fn (reassignable):  function render()
 *   - attractor-change hook:        function updateAttractor()
 *   - glow level:                   `glowIntensity` (mirrors #glowSlider value)
 *   - color scheme:                 `currentColorScheme` + `colorSchemes` map
 *                                   (each entry has .start/.end RGB arrays)
 *   - 2D timestep convention:       dt = 0.005 * speed
 */
(function () {
  'use strict';

  window.AttractorApp = window.AttractorApp || {};

  // ---- Hard guard: no THREE => disable the feature and bail cleanly ----------
  if (typeof THREE === 'undefined') {
    var disable3DButton = function () {
      var b = document.getElementById('view3dBtn');
      if (b) { b.style.display = 'none'; b.setAttribute('aria-hidden', 'true'); }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', disable3DButton);
    } else {
      disable3DButton();
    }
    // Expose an inert API so callers (inspect/lessons) never throw.
    window.AttractorApp.ThreeD = {
      enable: function () {}, disable: function () {}, isActive: function () { return false; },
      pickNearest: function () { return null; }, relaunchFrom: function () {},
      setParticleMode: function () {}
    };
    return;
  }

  // ---- Module state ----------------------------------------------------------
  var THREE_ACTIVE = false;        // true while the 3D view owns the screen
  var renderer = null;
  var scene = null;
  var camera = null;
  var raf3d = null;                // our own requestAnimationFrame handle
  var displayFrames = 0;
  var displayTime = performance.now();
  var lastFrameTime = 0;

  var particleMode = 'single';     // 'single' (default) | 'multi'
  var TRAIL_LEN = 6000;            // rolling points per trajectory
  var MAX_MULTI = 80;              // cap on multi-trajectory count
  var BLOOM_PASSES = 3;            // overlay lines that fake the bloom

  // Arcball camera (spherical coords about the attractor pivot).
  var cam = { theta: 0.9, phi: 0.5, radius: 60 };
  var pivot = new THREE.Vector3(0, 0, 0);
  var baseRadius = 60;             // framed radius before zoom; set on auto-fit

  // Trajectories: each has integration head + a THREE buffer-geometry trail
  // plus its additive bloom overlay lines. trails[0] is the primary trajectory.
  var trails = [];

  // ---- DOM helpers ------------------------------------------------------------
  function el(id) { return document.getElementById(id); }

  // ---- Safe reads of main.js globals (shared lexical scope) -------------------
  function getAttractors() {
    try { return (typeof attractors !== 'undefined') ? attractors : null; } catch (e) { return null; }
  }
  function getCurrentKey() {
    try { return (typeof currentAttractor !== 'undefined') ? currentAttractor : 'lorenz'; } catch (e) { return 'lorenz'; }
  }
  function getCurrentAttractor() {
    var a = getAttractors();
    return a ? a[getCurrentKey()] : null;
  }
  function getCurrentParams() {
    try { return (typeof currentParams !== 'undefined') ? currentParams : {}; } catch (e) { return {}; }
  }
  function getSpeed() {
    try { return (typeof speed !== 'undefined' && isFinite(speed)) ? speed : 3; } catch (e) { return 3; }
  }
  function getZoom() {
    try { return (typeof zoom !== 'undefined' && isFinite(zoom)) ? zoom : 1; } catch (e) { return 1; }
  }
  // Glow gate. Prefer the live slider value; fall back to the global. 0 => off.
  function getGlow() {
    var slider = el('glowSlider');
    if (slider) { var v = parseFloat(slider.value); if (isFinite(v)) return v; }
    try { return (typeof glowIntensity !== 'undefined' && isFinite(glowIntensity)) ? glowIntensity : 0; }
    catch (e) { return 0; }
  }
  // Multi-trajectory count from the particle slider, capped.
  function getMultiCount() {
    var slider = el('particleSlider');
    var n = slider ? parseInt(slider.value, 10) : 24;
    if (!isFinite(n) || n < 1) n = 24;
    return Math.min(MAX_MULTI, n);
  }
  // Current color scheme's start/end RGB (0..255), else a pleasing cyan→magenta.
  function getScheme() {
    try {
      if (typeof colorSchemes !== 'undefined' && typeof currentColorScheme !== 'undefined' &&
          colorSchemes[currentColorScheme]) {
        var c = colorSchemes[currentColorScheme];
        if (c && c.start && c.end) return { start: c.start, end: c.end };
      }
    } catch (e) { /* fall through */ }
    return { start: [0, 255, 255], end: [255, 0, 255] };
  }

  // ---- Math: integration & sanitizing ----------------------------------------
  // One Euler step using the same compute() the 2D path uses, with the same
  // dt = 0.005 * speed convention so 3D and 2D evolve at matching rates.
  function integrationDt() { return 0.005 * getSpeed(); }

  function step(pos) {
    var a = getCurrentAttractor();
    if (!a || typeof a.compute !== 'function') return pos;
    var next = a.compute(pos[0], pos[1], pos[2], getCurrentParams(), integrationDt());
    if (!next || !isFinite(next[0]) || !isFinite(next[1]) || !isFinite(next[2])) {
      // Diverged — reseed at initPos with a tiny offset (mirrors main.js).
      var ip = (a.initPos && a.initPos.length === 3) ? a.initPos : [0.1, 0, 0];
      var spread = a.initSpread || 0.1;
      return [
        ip[0] + (Math.random() - 0.5) * spread,
        ip[1] + (Math.random() - 0.5) * spread,
        ip[2] + (Math.random() - 0.5) * spread
      ];
    }
    return next;
  }

  // ---- Auto-fit framing (port of AttractiveEngine.estimateBounds) -------------
  // Pre-integrate from initPos, discard ~20% transient, accumulate min/max over
  // the steady state, then center the pivot and set radius = diagonal * 1.2.
  function estimateBounds(seed) {
    var a = getCurrentAttractor();
    if (!a) return null;
    var ip = seed || ((a.initPos && a.initPos.length === 3) ? a.initPos : [0.1, 0, 0]);
    var pos = [ip[0], ip[1], ip[2]];

    var total = 4000;
    var warmup = Math.floor(total * 0.2);  // discard ~20% startup transient
    var i;
    for (i = 0; i < warmup; i++) pos = step(pos);

    var lo = [Infinity, Infinity, Infinity];
    var hi = [-Infinity, -Infinity, -Infinity];
    var sampled = false;
    for (i = warmup; i < total; i++) {
      pos = step(pos);
      if (!isFinite(pos[0]) || !isFinite(pos[1]) || !isFinite(pos[2])) continue;
      if (pos[0] < lo[0]) lo[0] = pos[0]; if (pos[0] > hi[0]) hi[0] = pos[0];
      if (pos[1] < lo[1]) lo[1] = pos[1]; if (pos[1] > hi[1]) hi[1] = pos[1];
      if (pos[2] < lo[2]) lo[2] = pos[2]; if (pos[2] > hi[2]) hi[2] = pos[2];
      sampled = true;
    }
    if (!sampled) {
      var c0 = [isFinite(pos[0]) ? pos[0] : 0, isFinite(pos[1]) ? pos[1] : 0, isFinite(pos[2]) ? pos[2] : 0];
      return { center: c0, diagonal: 1 };
    }
    var center = [(lo[0] + hi[0]) * 0.5, (lo[1] + hi[1]) * 0.5, (lo[2] + hi[2]) * 0.5];
    var dx = hi[0] - lo[0], dy = hi[1] - lo[1], dz = hi[2] - lo[2];
    var diagonal = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!isFinite(diagonal) || diagonal <= 0) diagonal = 1;
    return { center: center, diagonal: diagonal };
  }

  function frameToBounds(seed) {
    var b = estimateBounds(seed);
    if (!b) return;
    pivot.set(b.center[0], b.center[1], b.center[2]);
    baseRadius = Math.max(b.diagonal, 1) * 1.2;
    cam.radius = baseRadius / Math.max(0.2, getZoom());
  }

  // ---- Camera positioning (arcball spherical → cartesian) ---------------------
  function updateCamera() {
    if (!camera) return;
    // phi is pitch from the equator; clamp to ±1.5 rad (≈ ±86°).
    cam.phi = Math.max(-1.5, Math.min(1.5, cam.phi));
    var r = Math.max(0.5, cam.radius);
    var cosP = Math.cos(cam.phi);
    var x = pivot.x + r * cosP * Math.sin(cam.theta);
    var y = pivot.y + r * Math.sin(cam.phi);
    var z = pivot.z + r * cosP * Math.cos(cam.theta);
    camera.position.set(x, y, z);
    camera.up.set(0, 1, 0);
    camera.lookAt(pivot);
    if (renderer && scene && THREE_ACTIVE) renderer.render(scene, camera);
  }

  // ---- Hue helper (port of PhaseSpaceCoordinator.rgb) -------------------------
  function hsvToRgb(h, s, v) {
    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
    var r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = q; break;
    }
    return [r, g, b];
  }

  // ---- Trail construction -----------------------------------------------------
  // Each trail owns a single BufferGeometry (position + color attributes) that
  // is updated in place via setDrawRange — no per-frame reallocation.
  function makeTrail(seed) {
    var positions = new Float32Array(TRAIL_LEN * 3);
    var colors = new Float32Array(TRAIL_LEN * 3);

    var geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setIndex(Array.from({length: (TRAIL_LEN - 1) * 2}, function(_, i) { return Math.floor(i / 2) + i % 2; }));
    geom.setDrawRange(0, 0);

    // Crisp base line.
    var baseMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 });
    var baseLine = new THREE.LineSegments(geom, baseMat);
    baseLine.frustumCulled = false;
    scene.add(baseLine);

    // Additive overlay lines that fake bloom (slightly larger feel via reduced
    // opacity stacking; line width itself is 1px on WebGL but additive stacking
    // produces the glow). All share the geometry, drawn extra times.
    var overlays = [];
    var p;
    for (p = 0; p < BLOOM_PASSES; p++) {
      var mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.5
      });
      var line = new THREE.LineSegments(geom, mat);
      line.frustumCulled = false;
      line.visible = false;
      scene.add(line);
      overlays.push({ line: line, mat: mat });
    }

    var ip = seed || (function () {
      var a = getCurrentAttractor();
      return (a && a.initPos && a.initPos.length === 3) ? a.initPos : [0.1, 0, 0];
    })();

    return {
      head: [ip[0], ip[1], ip[2]],
      positions: positions,
      colors: colors,
      geom: geom,
      baseLine: baseLine,
      baseMat: baseMat,
      overlays: overlays,
      count: 0,        // points currently stored
      write: 0,        // ring-buffer write cursor
      points: []       // parallel JS copy for picking (rolling, ordered)
    };
  }

  function disposeTrail(t) {
    if (!t) return;
    if (t.baseLine) scene.remove(t.baseLine);
    t.overlays.forEach(function (o) { scene.remove(o.line); o.mat.dispose(); });
    if (t.baseMat) t.baseMat.dispose();
    if (t.geom) t.geom.dispose();
  }

  function clearAllTrails() {
    trails.forEach(disposeTrail);
    trails = [];
  }

  // Rebuild trajectories for the current attractor / mode and reframe.
  function rebuildTrails(reframe) {
    clearAllTrails();
    if (reframe !== false) frameToBounds();

    var a = getCurrentAttractor();
    var ip = (a && a.initPos && a.initPos.length === 3) ? a.initPos : [0.1, 0, 0];
    var spread = (a && a.initSpread) ? a.initSpread : 0.1;

    if (particleMode === 'multi') {
      var n = getMultiCount();
      for (var i = 0; i < n; i++) {
        var seed = (i === 0) ? [ip[0], ip[1], ip[2]] : [
          ip[0] + (Math.random() - 0.5) * spread,
          ip[1] + (Math.random() - 0.5) * spread,
          ip[2] + (Math.random() - 0.5) * spread
        ];
        trails.push(makeTrail(seed));
      }
    } else {
      trails.push(makeTrail([ip[0], ip[1], ip[2]]));
    }
    updateCamera();
  }

  // ---- Per-frame integration & buffer update ----------------------------------
  // Steps each trajectory a few sub-steps per frame for a fuller trail, writes
  // into the ring buffer, recolors along the trail length (hue gradient from the
  // app's scheme), and updates draw range + bloom visibility.
  function advanceTrails() {
    var scheme = getScheme();
    var s0 = scheme.start, s1 = scheme.end;
    var glow = getGlow();
    var glowOn = glow > 0;
    var stepsPerFrame = 6;

    for (var ti = 0; ti < trails.length; ti++) {
      var t = trails[ti];
      // Per-trajectory base hue offset so multi trajectories read distinctly.
      var hueShift = (trails.length > 1) ? (ti / trails.length) : 0;

      for (var s = 0; s < stepsPerFrame; s++) {
        t.head = step(t.head);
        var wi = t.write * 3;
        t.positions[wi] = t.head[0];
        t.positions[wi + 1] = t.head[1];
        t.positions[wi + 2] = t.head[2];

        // Hue gradient: blend scheme start→end along a moving phase, nudged per
        // trajectory. Kept in 0..1 for the additive lines.
        var phase = ((t.count + s) % 512) / 512;
        var mix = 0.5 + 0.5 * Math.sin((phase + hueShift) * Math.PI * 2);
        var r = (s0[0] + (s1[0] - s0[0]) * mix) / 255;
        var g = (s0[1] + (s1[1] - s0[1]) * mix) / 255;
        var b = (s0[2] + (s1[2] - s0[2]) * mix) / 255;
        if (hueShift > 0) {
          // Rotate hue slightly per trajectory for separation in multi mode.
          var hsv = hsvToRgb((mix + hueShift) % 1, 0.85, 1.0);
          r = hsv[0]; g = hsv[1]; b = hsv[2];
        }
        t.colors[wi] = r;
        t.colors[wi + 1] = g;
        t.colors[wi + 2] = b;

        // Parallel ordered copy for picking (primary trajectory is enough, but
        // keep all for completeness; bounded to TRAIL_LEN).
        t.points.push([t.head[0], t.head[1], t.head[2]]);
        if (t.points.length > TRAIL_LEN) t.points.shift();

        t.write = (t.write + 1) % TRAIL_LEN;
        if (t.count < TRAIL_LEN) t.count++;
      }

      // Each segment joins consecutive samples. After wrapping, omit the
      // stale newest-to-oldest bridge and retain the legitimate array-end edge.
      var indices = t.geom.index.array;
      var n = 0;
      for (var j = 1; j < t.count; j++) {
        if (t.count === TRAIL_LEN && j === t.write) continue;
        indices[n++] = j - 1; indices[n++] = j;
      }
      if (t.count === TRAIL_LEN && t.write > 0) { indices[n++] = TRAIL_LEN - 1; indices[n++] = 0; }
      t.geom.index.needsUpdate = true;
      t.geom.attributes.position.needsUpdate = true;
      t.geom.attributes.color.needsUpdate = true;
      t.geom.setDrawRange(0, n);

      // Bloom passes: visible only when glow > 0. Opacity scales with the glow
      // slider (0..20 in the app) so the slider gates intensity, 0 => no glow.
      var g01 = Math.min(1, glow / 20);
      for (var p = 0; p < t.overlays.length; p++) {
        var ov = t.overlays[p];
        if (glowOn) {
          ov.line.visible = true;
          // Each successive pass fainter — stacked additive => soft halo.
          ov.mat.opacity = g01 * (0.55 - p * 0.13);
          if (ov.mat.opacity < 0) ov.mat.opacity = 0;
        } else {
          ov.line.visible = false;
        }
      }
      // Brighten the base line a touch with glow (HDR-ish feel).
      t.baseMat.opacity = 0.85 + 0.15 * (glowOn ? g01 : 0);
    }
  }

  // ---- Render loop ------------------------------------------------------------
  function frame(now) {
    if (!THREE_ACTIVE) return;
    raf3d = null;
    var animate = isPlaying && !reducedMotionQuery.matches;
    if (animate) {
      if (isAutoAnimating) {
        var index = Number(autoAnimateParam.slice(1)) - 1;
        var parameter = getCurrentAttractor().params[index];
        if (parameter) {
          var next = currentParams[autoAnimateParam] + autoAnimateDirection * autoAnimateSpeed * (parameter.max - parameter.min);
          if (next >= parameter.max || next <= parameter.min) autoAnimateDirection *= -1;
          currentParams[autoAnimateParam] = Math.max(parameter.min, Math.min(parameter.max, next));
          var slider = el('param' + (index + 1) + 'Slider');
          var value = el('param' + (index + 1) + 'Value');
          if (slider) slider.value = currentParams[autoAnimateParam];
          if (value) value.textContent = currentParams[autoAnimateParam].toFixed(3);
        }
      }
      advanceTrails();
      if (autoRotate) { cam.theta += 0.005; updateCamera(); }
      raf3d = requestAnimationFrame(frame);
    }
    renderer.render(scene, camera);
    if (el('particleCount')) el('particleCount').textContent = trails.length;
    displayFrames++;
    if (!animate || now - displayTime >= 1000) {
      if (el('fpsCount')) el('fpsCount').textContent = animate ? Math.round(displayFrames * 1000 / (now - displayTime)) : '0';
      displayFrames = 0; displayTime = now;
    }

    // Feed the live largest-Lyapunov estimator with the primary head + dt.
    try {
      if (window.AttractorApp.Lyapunov &&
          typeof window.AttractorApp.Lyapunov.isActive === 'function' &&
          window.AttractorApp.Lyapunov.isActive() &&
          typeof window.AttractorApp.Lyapunov.afterFrame === 'function' &&
          trails.length && animate) {
        var h = trails[0].head;
        window.AttractorApp.Lyapunov.afterFrame({ x: h[0], y: h[1], z: h[2] }, integrationDt());
      }
    } catch (e) { /* never let the estimator break the render loop */ }

    lastFrameTime = now;
  }

  // ---- Renderer / scene setup -------------------------------------------------
  function ensureRenderer() {
    if (renderer) return true;
    var c = el('canvas3d');
    if (!c) return false;

    renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 1);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);

    sizeRenderer();
    return true;
  }

  function sizeRenderer() {
    if (!renderer || !camera) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  function onResize() {
    if (!THREE_ACTIVE) return;
    sizeRenderer();
    updateCamera();
  }

  // ---- Input: arcball orbit (mouse + touch) -----------------------------------
  var dragging = false;
  var lastX = 0, lastY = 0;
  var pinchDist = 0;

  function attachInput() {
    var c = el('canvas3d');
    if (!c || c._a3dWired) return;
    c._a3dWired = true;

    c.addEventListener('mousedown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('mousemove', function (e) {
      if (!THREE_ACTIVE || !dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      // Yaw about world-up, pitch about camera-right (matches the iOS arcball).
      cam.theta -= dx * 0.005;
      cam.phi += dy * 0.005;
      updateCamera();
    });
    window.addEventListener('mouseup', function () { dragging = false; });

    c.addEventListener('wheel', function (e) {
      if (!THREE_ACTIVE) return;
      e.preventDefault();
      cam.radius *= (e.deltaY > 0 ? 1.08 : 0.926);
      cam.radius = Math.max(0.5, Math.min(baseRadius * 20, cam.radius));
      updateCamera();
    }, { passive: false });

    c.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        dragging = true;
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        dragging = false;
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: false });

    c.addEventListener('touchmove', function (e) {
      if (!THREE_ACTIVE) return;
      e.preventDefault();
      if (e.touches.length === 1 && dragging) {
        var dx = e.touches[0].clientX - lastX;
        var dy = e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        cam.theta -= dx * 0.005;
        cam.phi += dy * 0.005;
        updateCamera();
      } else if (e.touches.length === 2) {
        var ex = e.touches[0].clientX - e.touches[1].clientX;
        var ey = e.touches[0].clientY - e.touches[1].clientY;
        var d = Math.sqrt(ex * ex + ey * ey);
        if (pinchDist > 0) {
          cam.radius *= (pinchDist / Math.max(1, d));
          cam.radius = Math.max(0.5, Math.min(baseRadius * 20, cam.radius));
          updateCamera();
        }
        pinchDist = d;
      }
    }, { passive: false });

    c.addEventListener('touchend', function () { dragging = false; pinchDist = 0; });
  }

  // ---- Ray pick (port of nearestTrailPoint) -----------------------------------
  // Unproject a near/far pair through the screen point, build the camera ray,
  // and return the nearest stored 3D point in front of the camera (t > 0).
  function pickNearest(clientX, clientY) {
    if (!THREE_ACTIVE || !renderer || !camera || !trails.length) return null;
    var rect = el('canvas3d').getBoundingClientRect();
    var ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    var ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

    var near = new THREE.Vector3(ndcX, ndcY, -1).unproject(camera);
    var far = new THREE.Vector3(ndcX, ndcY, 1).unproject(camera);
    var origin = near.clone();
    var dir = far.sub(near).normalize();

    var best = null;
    var bestDist = Infinity;
    var v = new THREE.Vector3();
    var closest = new THREE.Vector3();
    var pt = new THREE.Vector3();

    for (var ti = 0; ti < trails.length; ti++) {
      var pts = trails[ti].points;
      for (var i = 0; i < pts.length; i++) {
        pt.set(pts[i][0], pts[i][1], pts[i][2]);
        v.subVectors(pt, origin);
        var t = v.dot(dir);
        if (t <= 0) continue;                 // skip points behind the camera
        closest.copy(dir).multiplyScalar(t).add(origin);
        var d = pt.distanceTo(closest);
        if (d < bestDist) { bestDist = d; best = { x: pts[i][0], y: pts[i][1], z: pts[i][2] }; }
      }
    }
    return best;
  }

  // ---- Relaunch the primary trajectory ----------------------------------------
  function relaunchFrom(p) {
    if (!p || !isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) return;
    if (!THREE_ACTIVE) return;
    if (!trails.length) rebuildTrails(false);
    var t = trails[0];
    t.head = [p.x, p.y, p.z];
    t.count = 0; t.write = 0; t.points = [];
    t.positions.fill(0);
    t.colors.fill(0);
    t.geom.setDrawRange(0, 0);
    t.geom.attributes.position.needsUpdate = true;
    t.geom.attributes.color.needsUpdate = true;
    try {
      if (window.AttractorApp.Lyapunov && typeof window.AttractorApp.Lyapunov.reset === 'function') {
        window.AttractorApp.Lyapunov.reset();
      }
    } catch (e) { /* ignore */ }
  }

  // ---- Particle mode ----------------------------------------------------------
  function setParticleMode(mode) {
    particleMode = (mode === 'multi') ? 'multi' : 'single';
    var btn = el('particleModeBtn');
    if (btn) btn.setAttribute('aria-pressed', particleMode === 'multi' ? 'true' : 'false');
    if (THREE_ACTIVE) rebuildTrails(false);  // keep current framing
  }

  // ---- Enable / disable (2D ⇄ 3D switch) --------------------------------------
  function enable() {
    if (THREE_ACTIVE) return;
    try { if (!ensureRenderer()) return; }
    catch (error) {
      renderer = null;
      if (typeof announce === 'function') announce('3D is unavailable in this browser. The canvas view remains available.');
      return;
    }
    THREE_ACTIVE = true;

    // Hide the 2D canvas, show the 3D canvas. main.js's render() is wrapped to
    // early-return while THREE_ACTIVE, so its rAF loop stops rescheduling. Also
    // cancel any in-flight 2D frame so nothing draws over us.
    var c2d = el('canvas');
    if (c2d) c2d.style.visibility = 'hidden';
    var c3d = el('canvas3d');
    if (c3d) { c3d.style.display = 'block'; c3d.setAttribute('aria-hidden', 'false'); }
    try { if (typeof animationId !== 'undefined' && animationId) cancelAnimationFrame(animationId); } catch (e) {}

    sizeRenderer();
    rebuildTrails(true);    // auto-fit framing so the attractor fills the view

    var view3d = el('view3dBtn');
    if (view3d) view3d.setAttribute('aria-pressed', 'true');
    var modeBtn = el('particleModeBtn');
    if (modeBtn) {
      modeBtn.style.display = '';
      modeBtn.setAttribute('aria-pressed', particleMode === 'multi' ? 'true' : 'false');
    }

    lastFrameTime = performance.now();
    refresh();
  }

  function refresh() {
    if (!THREE_ACTIVE) return;
    if (raf3d) cancelAnimationFrame(raf3d);
    if (!isPlaying || reducedMotionQuery.matches) {
      if (trails.length && !trails[0].count) {
        for (var i = 0; i < 200; i++) advanceTrails();
      }
    }
    frame(performance.now());
  }

  function disable() {
    if (!THREE_ACTIVE) return;
    THREE_ACTIVE = false;
    if (el('particleCount')) el('particleCount').textContent = particles.length;
    if (raf3d) { cancelAnimationFrame(raf3d); raf3d = null; }

    var c3d = el('canvas3d');
    if (c3d) { c3d.style.display = 'none'; c3d.setAttribute('aria-hidden', 'true'); }
    var c2d = el('canvas');
    if (c2d) c2d.style.visibility = '';

    var view3d = el('view3dBtn');
    if (view3d) view3d.setAttribute('aria-pressed', 'false');
    var modeBtn = el('particleModeBtn');
    if (modeBtn) modeBtn.style.display = 'none';

    // Resume main.js's 2D loop. render() now passes through (THREE_ACTIVE false)
    // and reschedules its own rAF.
    try { if (typeof render === 'function') render(); } catch (e) {}
  }

  function isActive() { return THREE_ACTIVE; }

  function toggle() { THREE_ACTIVE ? disable() : enable(); }

  // ---- Wrap the global render & updateAttractor (done at top level) -----------
  // render: early-return while 3D owns the screen so the 2D loop neither draws
  // nor reschedules. Resumed by calling render() once on disable().
  try {
    if (typeof render === 'function') {
      var _origRender = render;
      // eslint-disable-next-line no-global-assign
      render = function () {
        if (THREE_ACTIVE) return;
        return _origRender.apply(this, arguments);
      };
    }
  } catch (e) { /* binding not reassignable here — toggling still cancels rAF */ }

  // updateAttractor: when 3D is active, re-estimate bounds and reseed the trail
  // on any attractor change (dropdown, presets, random, reset).
  try {
    if (typeof updateAttractor === 'function') {
      var _origUpdate = updateAttractor;
      // eslint-disable-next-line no-global-assign
      updateAttractor = function () {
        var r = _origUpdate.apply(this, arguments);
        if (THREE_ACTIVE) {
          rebuildTrails(true);   // reframe + reseed for the new system
          try {
            if (window.AttractorApp.Lyapunov && typeof window.AttractorApp.Lyapunov.reset === 'function') {
              window.AttractorApp.Lyapunov.reset();
            }
          } catch (e2) { /* ignore */ }
        }
        return r;
      };
    }
  } catch (e) { /* not reassignable — enable() still reframes on entry */ }

  if (typeof initParticles === 'function') {
    var originalInit = initParticles;
    initParticles = function() {
      var result = originalInit.apply(this, arguments);
      if (THREE_ACTIVE) { rebuildTrails(true); refresh(); }
      if (window.AttractorApp.Lyapunov) window.AttractorApp.Lyapunov.reset();
      if (window.AttractorApp.Equations) window.AttractorApp.Equations.refresh();
      return result;
    };
  }

  // ---- Styles -----------------------------------------------------------------
  function injectStyles() {
    if (el('a3d-styles')) return;
    var s = document.createElement('style');
    s.id = 'a3d-styles';
    s.textContent = [
      '#canvas3d{touch-action:none;background:#000;}',
      '#view3dBtn[aria-pressed="true"]{background:rgba(0,200,255,0.22);box-shadow:0 0 0 1px rgba(0,200,255,0.5);}',
      '#particleModeBtn[aria-pressed="true"]{background:rgba(180,0,255,0.22);box-shadow:0 0 0 1px rgba(180,0,255,0.5);}'
    ].join('');
    document.head.appendChild(s);
  }

  // ---- Wiring -----------------------------------------------------------------
  function setup() {
    injectStyles();
    attachInput();
    window.addEventListener('resize', onResize);

    var view3d = el('view3dBtn');
    if (view3d) view3d.addEventListener('click', toggle);

    var modeBtn = el('particleModeBtn');
    if (modeBtn) {
      modeBtn.addEventListener('click', function () {
        setParticleMode(particleMode === 'multi' ? 'single' : 'multi');
      });
    }

    // Existing playback handlers update the shared state before these listeners.
    ['playPauseBtn', 'floatingPlayPauseBtn'].forEach(function(id) { el(id).addEventListener('click', refresh); });
    reducedMotionQuery.addEventListener('change', refresh);
    document.addEventListener('input', function(e) { if (THREE_ACTIVE && e.target.matches('input[type=range]')) refresh(); });
    document.addEventListener('keydown', function(e) {
      if (e.key === ' ') queueMicrotask(refresh);
    });
    el('canvas3d').addEventListener('keydown', function(e) {
      var actions = { ArrowLeft: function(){cam.theta -= .1;}, ArrowRight: function(){cam.theta += .1;}, ArrowUp: function(){cam.phi += .1;}, ArrowDown: function(){cam.phi -= .1;}, '+': function(){cam.radius /= 1.1;}, '-': function(){cam.radius *= 1.1;} };
      if (actions[e.key]) { actions[e.key](); updateCamera(); e.preventDefault(); }
    });
    el('exportBtn').addEventListener('click', function(e) {
      if (!THREE_ACTIVE) return;
      e.stopImmediatePropagation();
      renderer.render(scene, camera);
      var link = document.createElement('a');
      link.download = 'attractor-' + getCurrentKey() + '-3d.png';
      link.href = el('canvas3d').toDataURL('image/png');
      link.click();
    }, true);
    // Esc leaves 3D only when no analysis panel owns Escape.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && THREE_ACTIVE && !document.querySelector('.equations-panel.open,.lessons-panel.open')) { e.stopPropagation(); disable(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

  // ---- Public API -------------------------------------------------------------
  window.AttractorApp.ThreeD = {
    enable: enable,
    disable: disable,
    isActive: isActive,
    pickNearest: pickNearest,
    relaunchFrom: relaunchFrom,
    setParticleMode: setParticleMode,
    refresh: refresh,
    snapshot: function() { return { points: trails.length ? trails[0].points.length : 0, head: trails.length ? trails[0].head.slice() : null, trajectories: trails.length, framePending: raf3d !== null }; }
  };
})();
