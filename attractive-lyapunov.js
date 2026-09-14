/* Copyright (c) 2026 Luke Steuber. MIT license; see LICENSE.
 * Largest Lyapunov exponent estimate using companion separation (Benettin).
 * Measurement uses its own fixed-step RK4 trajectory, independent of the
 * display's Euler step and speed. Discrete maps are not measured here.
 */
(function () {
  'use strict';

  window.AttractorApp = window.AttractorApp || {};

  // ---- Benettin estimator (pure math, no DOM) --------------------------------
  // Companion-separation defaults:
  // d0 ≈ 1e-8, warmupSteps = 1000, warmTime ≈ 8.
  function createEstimator(opts) {
    opts = opts || {};
    var d0 = (typeof opts.d0 === 'number') ? opts.d0 : 1e-8;
    var warmupSteps = (typeof opts.warmupSteps === 'number') ? opts.warmupSteps : 1000;
    var warmTime = (typeof opts.warmTime === 'number') ? opts.warmTime : 8;

    var _current = 0;
    var _warm = false;
    var logSum = 0;
    var elapsed = 0;
    var warmupRemaining = warmupSteps;

    // Initial companion offset for a given reference state: ref + (d0, 0, 0).
    function seed(ref) {
      return { x: ref.x + d0, y: ref.y, z: ref.z };
    }

    // One Benettin step. `ref` is the main trajectory's new state; `companion` is
    // the nearby trajectory's new state (already advanced one step with the same
    // integrator and dt). Returns the companion renormalized back to distance d0
    // along the current separation direction, to feed into the next step.
    function step(ref, companion, dt) {
      var dx = companion.x - ref.x;
      var dy = companion.y - ref.y;
      var dz = companion.z - ref.z;
      var d1 = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (!(d1 > 0) || !isFinite(d1)) {
        // Degenerate separation — re-seed along x at the base distance.
        return { x: ref.x + d0, y: ref.y, z: ref.z };
      }

      if (warmupRemaining > 0) {
        warmupRemaining -= 1;
      } else {
        logSum += Math.log(d1 / d0);
        elapsed += dt;
        if (elapsed > 0) _current = logSum / elapsed;
        if (elapsed >= warmTime) _warm = true;
      }

      // Renormalize back to d0, preserving direction.
      var k = d0 / d1;
      return { x: ref.x + dx * k, y: ref.y + dy * k, z: ref.z + dz * k };
    }

    function reset() {
      _current = 0;
      _warm = false;
      logSum = 0;
      elapsed = 0;
      warmupRemaining = warmupSteps;
    }

    return {
      seed: seed,
      step: step,
      reset: reset,
      get current() { return _current; },
      get warm() { return _warm; },
      get elapsed() { return elapsed; }
    };
  }

  // ---- Globals access (defensive — never throw if main.js shape changes) -----
  // main.js declares its state with `let`/`const`, so those globals are NOT on
  // `window` — they live in the shared global lexical scope and must be read by
  // bare name (the same mechanism attractive-equations.js relies on). Only
  // `function` declarations (render, updateAttractor) attach to `window`.
  function g(name) {
    try {
      switch (name) {
        case 'attractors':       return (typeof attractors !== 'undefined') ? attractors : undefined;
        case 'currentAttractor': return (typeof currentAttractor !== 'undefined') ? currentAttractor : undefined;
        case 'currentParams':    return (typeof currentParams !== 'undefined') ? currentParams : undefined;
        case 'particles':        return (typeof particles !== 'undefined') ? particles : undefined;
        case 'speed':            return (typeof speed !== 'undefined') ? speed : undefined;
        default:                 return (typeof window[name] !== 'undefined') ? window[name] : undefined;
      }
    } catch (e) { return undefined; }
  }
  function el(id) { return document.getElementById(id); }

  function threeDActive() {
    try {
      return !!(window.AttractorApp.ThreeD && window.AttractorApp.ThreeD.isActive());
    } catch (e) { return false; }
  }

  // ---- Measurement integrator (decoupled from the display) -------------------
  // λ₁ is a global property of the attractor, so the estimate runs on its OWN
  // fixed-dt RK4 trajectory rather than the on-screen one — whose coarse,
  // speed-scaled Euler step would inflate the exponent. This mirrors the iOS
  // app, where the Lyapunov companion is integrated for measurement only and
  // never rendered.
  var FIXED_DT = 0.005;          // fine, fixed step — independent of display speed
  var SUBSTEPS_PER_FRAME = 60;   // measurement steps advanced per afterFrame call
  var WARM_REF_STEPS = 4000;     // settle the reference onto the attractor first
  var ref = null;                // measurement reference {x,y,z} (never rendered)

  // The vector field, recovered from the attractor's Euler compute(): for a step
  // of the form s + f(s)*dt, (compute(s,h) - s)/h == f(s) exactly (here h = 1).
  function field(s) {
    var attractors = g('attractors');
    var key = g('currentAttractor');
    var params = g('currentParams');
    if (!attractors || !key || !attractors[key] || typeof attractors[key].compute !== 'function') return null;
    var o = attractors[key].compute(s.x, s.y, s.z, params, 1);
    if (!o || !isFinite(o[0]) || !isFinite(o[1]) || !isFinite(o[2])) return null;
    return { x: o[0] - s.x, y: o[1] - s.y, z: o[2] - s.z };
  }

  // One classical RK4 step of the recovered field.
  function rk4(s, h) {
    var k1 = field(s); if (!k1) return null;
    var k2 = field({ x: s.x + k1.x * h / 2, y: s.y + k1.y * h / 2, z: s.z + k1.z * h / 2 }); if (!k2) return null;
    var k3 = field({ x: s.x + k2.x * h / 2, y: s.y + k2.y * h / 2, z: s.z + k2.z * h / 2 }); if (!k3) return null;
    var k4 = field({ x: s.x + k3.x * h, y: s.y + k3.y * h, z: s.z + k3.z * h }); if (!k4) return null;
    return {
      x: s.x + h / 6 * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
      y: s.y + h / 6 * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
      z: s.z + h / 6 * (k1.z + 2 * k2.z + 2 * k3.z + k4.z)
    };
  }

  function initPos() {
    var attractors = g('attractors');
    var key = g('currentAttractor');
    var a = (attractors && key) ? attractors[key] : null;
    if (a && a.initPos && a.initPos.length === 3) return { x: a.initPos[0], y: a.initPos[1], z: a.initPos[2] };
    return { x: 0.1, y: 0, z: 0 };
  }

  // Seed the measurement reference from the attractor's initial position, settle
  // it onto the attractor, then seed the companion d0 away.
  function seedMeasurement() {
    var s = initPos();
    for (var i = 0; i < WARM_REF_STEPS; i++) {
      var n = rk4(s, FIXED_DT);
      if (!n) break;
      s = n;
    }
    ref = s;
    companion = estimator.seed(ref);
  }

  // ---- Feature state ---------------------------------------------------------
  var estimator = createEstimator({ d0: 1e-8, warmupSteps: 400, warmTime: 8 });
  var active = false;
  var companion = null;          // our own {x,y,z}, separate from particles
  var lastHudUpdate = 0;         // performance.now() throttle for the HUD (~10 Hz)
  var HUD_INTERVAL = 100;        // ms

  function injectStyles() {
    if (el('lyap-styles')) return;
    var s = document.createElement('style');
    s.id = 'lyap-styles';
    // The HUD rows live in the existing .stats panel; this only tunes the
    // numeric value spans for legibility (tabular figures, monospace digits).
    s.textContent = [
      '#lyapunovValue,#modelTime{font-variant-numeric:tabular-nums;font-family:ui-monospace,Menlo,monospace;}',
      '#lyapunovStatus{font-variant-numeric:tabular-nums;}',
      '#lyapunovRow.lyap-settled #lyapunovValue,',
      '.stats-row.lyap-settled #lyapunovValue{color:#8ab4ff;}'
    ].join('');
    document.head.appendChild(s);
  }

  // ---- The per-frame hook ----------------------------------------------------
  // Triggered once per frame (by the 2D render wrap, or by Feature A in 3D), but
  // it drives the decoupled fixed-dt measurement integration — any head/dt args
  // are ignored, so it behaves identically however it is called.
  var lastSignature = '';
  function supported() { return ['clifford', 'dejong', 'pickover'].indexOf(g('currentAttractor')) === -1; }
  function afterFrame() {
    if (!active || !supported()) { if (active) updateHud(); return; }
    var signature = g('currentAttractor') + JSON.stringify(g('currentParams'));
    if (signature !== lastSignature) { lastSignature = signature; reset(); }
    if (!ref || !companion) { seedMeasurement(); if (!ref) return; }

    for (var i = 0; i < SUBSTEPS_PER_FRAME; i++) {
      var nref = rk4(ref, FIXED_DT);
      var ncomp = rk4(companion, FIXED_DT);
      if (!nref || !ncomp) { seedMeasurement(); break; }
      ref = nref;
      companion = estimator.step(ref, ncomp, FIXED_DT);
    }
    maybeUpdateHud();
  }

  // ---- HUD -------------------------------------------------------------------
  function showRows(on) {
    var rows = [el('lyapunovRow'), el('lyapunovStatusRow'), el('modelTimeRow')];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i]) rows[i].style.display = on ? '' : 'none';
    }
  }

  function maybeUpdateHud() {
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (now - lastHudUpdate < HUD_INTERVAL) return;
    lastHudUpdate = now;
    updateHud();
  }

  function updateHud() {
    var valEl = el('lyapunovValue');
    var statusEl = el('lyapunovStatus');
    var timeEl = el('modelTime');
    var rowEl = el('lyapunovRow');

    var cur = estimator.current;
    var warm = estimator.warm;
    var elapsed = estimator.elapsed;

    if (valEl) valEl.textContent = (typeof cur === 'number' && isFinite(cur)) ? cur.toFixed(4) : '—';
    if (statusEl) statusEl.textContent = !supported() ? 'Unavailable for maps' : (warm ? 'estimating' : 'warming…');
    if (!supported() && valEl) valEl.textContent = '—';
    if (statusEl && supported() && reducedMotionQuery.matches) statusEl.textContent = 'Static view';
    else if (statusEl && supported() && !isPlaying) statusEl.textContent = 'Paused';
    if (timeEl) timeEl.textContent = (typeof elapsed === 'number' && isFinite(elapsed)) ? elapsed.toFixed(1) : '0.0';
    if (rowEl) {
      if (warm) rowEl.classList.add('lyap-settled');
      else rowEl.classList.remove('lyap-settled');
    }
  }

  // ---- Public API actions ----------------------------------------------------
  function reset() {
    estimator.reset();
    ref = null; companion = null;
    if (active && supported()) seedMeasurement();
    lastHudUpdate = 0;
    if (active) updateHud();
  }

  function setVisible(on) {
    on = !!on;
    active = on;
    showRows(on);

    var btn = el('lyapunovBtn');
    if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');

    if (on) {
      // Fresh start each time the feature is turned on.
      estimator.reset();
      ref = null; companion = null;
      if (supported()) seedMeasurement();
      lastSignature = g('currentAttractor') + JSON.stringify(g('currentParams'));
      lastHudUpdate = 0;
      updateHud();
    }
  }

  function isActive() { return active; }

  function toggle() { setVisible(!active); }

  // ---- Wiring ----------------------------------------------------------------
  // Wrap render() so that, in 2D mode, the Benettin step runs AFTER the inner
  // render has advanced particles[0] to its new state this frame. Skip when 3D is
  // active (Feature A drives afterFrame itself). Done at top level, mirroring the
  // equations.js updateAttractor wrap, so the wrapper is in place before the rAF
  // loop next references the global `render`.
  try {
    if (typeof window.render === 'function') {
      var _render = window.render;
      window.render = function () {
        var out = _render.apply(this, arguments);
        try {
          // In 2D, advance the measurement integration once per frame. In 3D,
          // Feature A calls afterFrame() itself, so skip to avoid double-stepping.
          if (active && !threeDActive() && typeof isPlaying !== 'undefined' && isPlaying && !reducedMotionQuery.matches) afterFrame();
        } catch (e) { /* never break the render loop */ }
        return out;
      };
    }
  } catch (e) { /* render not reassignable here — afterFrame still works via 3D/external */ }

  // Wrap updateAttractor so switching systems (dropdown, presets, random, undo)
  // resets the estimate and reseeds the companion from the fresh head.
  try {
    if (typeof window.updateAttractor === 'function') {
      var _updateAttractor = window.updateAttractor;
      window.updateAttractor = function () {
        var r = _updateAttractor.apply(this, arguments);
        try { reset(); } catch (e) { /* guard */ }
        return r;
      };
    }
  } catch (e) { /* binding not reassignable — reset still happens on toggle */ }

  function setup() {
    injectStyles();
    var btn = el('lyapunovBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', toggle);
    }
    var parameters = el('parametersContainer');
    if (parameters) parameters.addEventListener('input', reset);
    // Start hidden/inactive.
    active = false;
    showRows(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

  // ---- Public surface --------------------------------------------------------
  window.AttractorApp.Lyapunov = {
    setVisible: setVisible,
    isActive: isActive,
    reset: reset,
    afterFrame: afterFrame,
    createEstimator: createEstimator,
    snapshot: function () { return { current: estimator.current, elapsed: estimator.elapsed, warm: estimator.warm, supported: supported() }; }
  };
})();
