/*
 * attractive-inspect.js — Feature D: tap-to-inspect + long-press-to-relaunch
 *
 * A self-contained classic-script IIFE (no bundler, no modules). It mirrors the
 * proven pattern in attractive-equations.js: it reads main.js's top-level
 * lexical globals directly (those `let`/`const`/`function` bindings are shared
 * across classic scripts even though they are not properties of `window`),
 * injects its own <style>, and guards every external reference so it can never
 * throw on load.
 *
 * Behaviour is ported from the iOS app's PhaseSpaceCoordinator:
 *   - handleTap        → inspectAt(): nearest trail point → (x,y,z) readout + marker
 *   - handleLongPress  → relaunch: reseed the primary trajectory from that point
 *
 * Globals consumed from main.js (all by bare name, like equations.js does):
 *   canvas, ctx, particles, currentAttractor, attractors, zoom, isDragging,
 *   projectPoint(pt, centerX, centerY, scale), initParticles(), updateAttractor(),
 *   announce(msg). (rotationX/rotationY/panX/panY are read indirectly through
 *   projectPoint, so we never touch them ourselves.)
 *
 * Optional siblings, all guarded because they may still be stubs:
 *   AttractorApp.ThreeD   (3D pick / relaunch)
 *   AttractorApp.Lyapunov (reset on 2D relaunch)
 */
(function () {
  'use strict';

  window.AttractorApp = window.AttractorApp || {};

  // ---- Constants --------------------------------------------------------------
  var TAP_SLOP = 5;          // max px of movement for a click/tap (not a drag)
  var LONG_PRESS_MS = 500;   // hold duration to trigger relaunch

  // ---- Safe accessors for main.js globals -------------------------------------
  // Each is wrapped because the binding may not exist (script-order / future
  // refactors) and we must never throw at module scope or in a handler.
  function getCanvas() {
    try { return (typeof canvas !== 'undefined') ? canvas : document.getElementById('canvas'); }
    catch (e) { return document.getElementById('canvas'); }
  }
  function getParticles() {
    try { return (typeof particles !== 'undefined') ? particles : null; }
    catch (e) { return null; }
  }
  function getAttractors() {
    try { return (typeof attractors !== 'undefined') ? attractors : null; }
    catch (e) { return null; }
  }
  function getCurrentAttractor() {
    try { return (typeof currentAttractor !== 'undefined') ? currentAttractor : null; }
    catch (e) { return null; }
  }
  function getZoom() {
    try { return (typeof zoom !== 'undefined' && isFinite(zoom)) ? zoom : 1; }
    catch (e) { return 1; }
  }
  function getIsDragging() {
    try { return (typeof isDragging !== 'undefined') ? !!isDragging : false; }
    catch (e) { return false; }
  }
  function getProjectFn() {
    try { return (typeof projectPoint === 'function') ? projectPoint : null; }
    catch (e) { return null; }
  }
  function doAnnounce(msg) {
    try {
      if (typeof announce === 'function') { announce(msg); return; }
    } catch (e) { /* fall through */ }
    // Fallback live-region nudge so screen readers still hear it.
    try {
      var lr = document.getElementById('liveAnnouncement');
      if (lr) { lr.textContent = msg; setTimeout(function () { lr.textContent = ''; }, 1000); }
    } catch (e2) { /* ignore */ }
  }

  function threeD() {
    var t = window.AttractorApp && window.AttractorApp.ThreeD;
    return (t && typeof t.isActive === 'function' && t.isActive()) ? t : null;
  }
  function lyapunov() {
    return (window.AttractorApp && window.AttractorApp.Lyapunov) || null;
  }

  function el(id) { return document.getElementById(id); }

  // ---- Styles -----------------------------------------------------------------
  function injectStyles() {
    if (el('inspect-styles')) return;
    var s = document.createElement('style');
    s.id = 'inspect-styles';
    s.textContent = [
      // The readout card. index.html ships it with inline display:none and
      // aria-hidden; we toggle a class plus those attributes to show it.
      '.inspect-readout{position:fixed;top:16px;left:16px;z-index:240;',
      '  min-width:150px;padding:12px 32px 12px 14px;border-radius:6px;',
      '  background:rgba(12,12,16,0.92);backdrop-filter:blur(12px);',
      '  -webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.14);',
      '  box-shadow:0 10px 32px rgba(0,0,0,0.5);color:#f2f2f5;',
      '  font-family:Inter,system-ui,sans-serif;font-size:13px;line-height:1.5;',
      '  font-variant-numeric:tabular-nums;pointer-events:auto;}',
      '.inspect-readout.inspect-open{display:block !important;}',
      '.inspect-readout .inspect-title{font-size:11px;text-transform:uppercase;',
      '  letter-spacing:1.2px;color:#8ab4ff;font-weight:600;margin-bottom:6px;}',
      '.inspect-readout > div span{color:#fff;font-weight:600;}',
      '.inspect-readout #inspectCloseBtn{position:absolute;top:6px;right:6px;',
      '  width:24px;height:24px;display:flex;align-items:center;justify-content:center;',
      '  background:none;border:none;color:#aaa;font-size:20px;line-height:1;',
      '  cursor:pointer;border-radius:5px;padding:0;}',
      '.inspect-readout #inspectCloseBtn:hover{color:#fff;background:rgba(255,255,255,0.1);}',
      // The DOM overlay marker dot. Sits above the canvas, ignores pointer
      // events so it never blocks rotate/pan/relaunch on the canvas beneath it.
      '.inspect-marker{position:fixed;z-index:230;width:14px;height:14px;',
      '  margin:-7px 0 0 -7px;border-radius:50%;pointer-events:none;',
      '  background:rgba(255,214,10,0.95);border:2px solid rgba(255,255,255,0.92);',
      '  box-shadow:0 0 10px 3px rgba(255,214,10,0.7);',
      '  transition:opacity .15s ease;opacity:0;}',
      '.inspect-marker.inspect-marker-on{opacity:1;}',
      '@media (prefers-reduced-motion: reduce){',
      '  .inspect-marker{transition:none;}}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  // ---- Marker overlay ---------------------------------------------------------
  var markerEl = null;

  function ensureMarker() {
    if (markerEl && document.body.contains(markerEl)) return markerEl;
    markerEl = document.createElement('div');
    markerEl.className = 'inspect-marker';
    markerEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(markerEl);
    return markerEl;
  }

  // Position the marker at a CANVAS-LOCAL (projected) coordinate, mapped into
  // viewport space via the canvas's bounding rect. The canvas carries no CSS
  // scaling and no devicePixelRatio backing-store multiplier (main.js sizes the
  // backing store to CSS pixels), so canvas pixels == CSS pixels and a single
  // rect offset is exact.
  function showMarkerAtCanvasXY(cx, cy) {
    var cnv = getCanvas();
    if (!cnv || cx == null || cy == null || !isFinite(cx) || !isFinite(cy)) { hideMarker(); return; }
    var m = ensureMarker();
    var rect = cnv.getBoundingClientRect();
    var sx = rect.width / (cnv.width || rect.width || 1);
    var sy = rect.height / (cnv.height || rect.height || 1);
    m.style.left = (rect.left + cx * sx) + 'px';
    m.style.top = (rect.top + cy * sy) + 'px';
    m.classList.add('inspect-marker-on');
  }

  // Position the marker directly at a viewport (client) coordinate — used for
  // the 3D path where we don't compute a 2D projection ourselves.
  function showMarkerAtClient(clientX, clientY) {
    if (clientX == null || clientY == null || !isFinite(clientX) || !isFinite(clientY)) { hideMarker(); return; }
    var m = ensureMarker();
    m.style.left = clientX + 'px';
    m.style.top = clientY + 'px';
    m.classList.add('inspect-marker-on');
  }

  function hideMarker() {
    if (markerEl) markerEl.classList.remove('inspect-marker-on');
  }

  // ---- Readout ----------------------------------------------------------------
  function fmt3(v) {
    return (typeof v === 'number' && isFinite(v)) ? v.toFixed(3) : '—';
  }

  function showReadout(pt) {
    var box = el('inspectReadout');
    if (!box) return;
    var xs = el('inspectX'), ys = el('inspectY'), zs = el('inspectZ');
    if (xs) xs.textContent = fmt3(pt.x);
    if (ys) ys.textContent = fmt3(pt.y);
    if (zs) zs.textContent = fmt3(pt.z);
    box.style.display = 'block';
    box.classList.add('inspect-open');
    box.setAttribute('aria-hidden', 'false');
  }

  function clearReadout() {
    var box = el('inspectReadout');
    if (!box) return;
    box.classList.remove('inspect-open');
    box.style.display = 'none';
    box.setAttribute('aria-hidden', 'true');
    var xs = el('inspectX'), ys = el('inspectY'), zs = el('inspectZ');
    if (xs) xs.textContent = '—';
    if (ys) ys.textContent = '—';
    if (zs) zs.textContent = '—';
  }

  // Public clear: wipe marker + readout. Safe to call any time.
  function clear() {
    hideMarker();
    clearReadout();
  }

  // ---- Geometry: nearest trail point in 2D ------------------------------------
  // Mirrors PhaseSpaceCoordinator.nearestTrailPoint, but in screen space: the
  // 2D renderer has no camera ray, so we project every stored trail point with
  // main.js's own projectPoint() (same centerX/centerY/scale the render loop
  // uses) and pick the model point whose projected position is nearest the tap.
  // Returns { x, y, z } in model space, plus the projected { sx, sy } that won
  // (canvas-local) so the marker can sit exactly on it.
  function nearestTrailPoint2D(canvasX, canvasY) {
    var cnv = getCanvas();
    var ps = getParticles();
    var atlas = getAttractors();
    var key = getCurrentAttractor();
    var project = getProjectFn();
    if (!cnv || !ps || !ps.length || !atlas || !key || !atlas[key] || !project) return null;

    var centerX = cnv.width / 2;
    var centerY = cnv.height / 2;
    var attractor = atlas[key];
    var baseScale = (typeof attractor.scale === 'number') ? attractor.scale : 1;
    var scale = baseScale * getZoom();

    var best = null;
    var bestDist = Infinity;

    for (var pi = 0; pi < ps.length; pi++) {
      var p = ps[pi];
      var trail = p && p.trail;
      if (!trail || !trail.length) continue;
      for (var ti = 0; ti < trail.length; ti++) {
        var tp = trail[ti];
        if (!tp) continue;
        var proj;
        try { proj = project(tp, centerX, centerY, scale); }
        catch (e) { proj = null; }
        if (!proj || !isFinite(proj.x) || !isFinite(proj.y)) continue;
        var dx = proj.x - canvasX;
        var dy = proj.y - canvasY;
        var d2 = dx * dx + dy * dy;
        if (d2 < bestDist) {
          bestDist = d2;
          best = { x: tp.x, y: tp.y, z: tp.z, sx: proj.x, sy: proj.y, particle: p };
        }
      }
    }
    return best;
  }

  // Convert a viewport (client) coordinate into a canvas-local pixel coordinate.
  function clientToCanvas(clientX, clientY) {
    var cnv = getCanvas();
    if (!cnv) return null;
    var rect = cnv.getBoundingClientRect();
    var sx = (cnv.width || rect.width || 1) / (rect.width || 1);
    var sy = (cnv.height || rect.height || 1) / (rect.height || 1);
    return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
  }

  // ---- Public: inspectAt ------------------------------------------------------
  // Resolves the model point under (clientX, clientY), shows the readout + a
  // marker, announces it, and returns the picked { x, y, z } (or null).
  function inspectAt(clientX, clientY) {
    var td = threeD();
    if (td && typeof td.pickNearest === 'function') {
      var pick = null;
      try { pick = td.pickNearest(clientX, clientY); } catch (e) { pick = null; }
      if (pick && isFinite(pick.x) && isFinite(pick.y) && isFinite(pick.z)) {
        showReadout(pick);
        // In 3D we don't own the projection; place the marker at the tap.
        showMarkerAtClient(clientX, clientY);
        doAnnounce('Point inspected at x ' + fmt3(pick.x) + ', y ' + fmt3(pick.y) + ', z ' + fmt3(pick.z));
        return { x: pick.x, y: pick.y, z: pick.z };
      }
      return null;
    }

    // 2D path.
    var c = clientToCanvas(clientX, clientY);
    if (!c) return null;
    var hit = nearestTrailPoint2D(c.x, c.y);
    if (!hit) return null;
    var pt = { x: hit.x, y: hit.y, z: hit.z };
    showReadout(pt);
    showMarkerAtCanvasXY(hit.sx, hit.sy);
    doAnnounce('Point inspected at x ' + fmt3(pt.x) + ', y ' + fmt3(pt.y) + ', z ' + fmt3(pt.z));
    return pt;
  }

  // ---- Relaunch ---------------------------------------------------------------
  function relaunchAt(clientX, clientY) {
    var td = threeD();
    if (td && typeof td.pickNearest === 'function' && typeof td.relaunchFrom === 'function') {
      var pick = null;
      try { pick = td.pickNearest(clientX, clientY); } catch (e) { pick = null; }
      if (!pick || !isFinite(pick.x)) return;
      try { td.relaunchFrom({ x: pick.x, y: pick.y, z: pick.z }); } catch (e) { /* ignore */ }
      clear();
      doAnnounce('Relaunching from selected point');
      return;
    }

    // 2D: reseed the primary trajectory (particles[0]) at the nearest point,
    // clear its trail, and reset the Lyapunov estimator if present.
    var c = clientToCanvas(clientX, clientY);
    if (!c) return;
    var hit = nearestTrailPoint2D(c.x, c.y);
    var ps = getParticles();
    if (!hit || !ps || !ps.length) return;
    var primary = ps[0];
    if (!primary) return;
    primary.x = hit.x;
    primary.y = hit.y;
    primary.z = hit.z;
    primary.trail = [];
    var lyap = lyapunov();
    if (lyap && typeof lyap.reset === 'function') {
      try { lyap.reset(); } catch (e) { /* ignore */ }
    }
    clear();
    doAnnounce('Relaunching from selected point');
  }

  // ---- Pointer gesture state machine ------------------------------------------
  // We are a passive observer on the canvas: we never call preventDefault, so
  // main.js's own rotate / pan / pinch handlers keep working. We only fire on a
  // clean tap (press + release, < TAP_SLOP movement, not a drag) or a long
  // press (held LONG_PRESS_MS, < TAP_SLOP movement, single pointer).
  var g = {
    active: false,
    id: null,
    startX: 0,
    startY: 0,
    moved: false,
    pointers: 0,
    longTimer: null,
    fired: false   // a long-press already relaunched; suppress the tap on release
  };

  function cancelLongTimer() {
    if (g.longTimer != null) { clearTimeout(g.longTimer); g.longTimer = null; }
  }

  function resetGesture() {
    cancelLongTimer();
    g.active = false;
    g.id = null;
    g.moved = false;
    g.fired = false;
  }

  function onPointerDown(e) {
    // Track concurrent pointers so a second finger cancels the long press.
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    g.pointers++;
    if (g.pointers > 1) {
      // Second finger arrived — this is a pinch/multi-touch gesture, not a tap.
      cancelLongTimer();
      g.active = false;
      return;
    }
    g.active = true;
    g.id = e.pointerId;
    g.startX = e.clientX;
    g.startY = e.clientY;
    g.moved = false;
    g.fired = false;

    var cx = e.clientX, cy = e.clientY;
    cancelLongTimer();
    g.longTimer = setTimeout(function () {
      g.longTimer = null;
      if (!g.active || g.moved || g.pointers !== 1) return;
      g.fired = true;
      relaunchAt(cx, cy);
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e) {
    if (!g.active || e.pointerId !== g.id) return;
    var dx = e.clientX - g.startX;
    var dy = e.clientY - g.startY;
    if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) {
      g.moved = true;
      cancelLongTimer(); // movement => it's a drag/rotate, not a tap/long-press
    }
  }

  function onPointerUp(e) {
    if (g.pointers > 0) g.pointers--;
    if (!g.active || e.pointerId !== g.id) {
      if (g.pointers === 0) resetGesture();
      return;
    }
    cancelLongTimer();

    var dx = e.clientX - g.startX;
    var dy = e.clientY - g.startY;
    var withinSlop = Math.abs(dx) <= TAP_SLOP && Math.abs(dy) <= TAP_SLOP;

    // A clean tap: no long-press already fired, didn't move, isn't a drag.
    if (!g.fired && withinSlop && !g.moved) {
      inspectAt(e.clientX, e.clientY);
    }
    resetGesture();
  }

  function onPointerCancel(e) {
    if (g.pointers > 0) g.pointers--;
    if (g.pointers === 0) resetGesture();
    else { cancelLongTimer(); g.active = false; }
  }

  // ---- Wrap initParticles / updateAttractor to clear on attractor change ------
  // Done at module scope (like equations.js wraps updateAttractor) so the
  // wrappers are installed before init() first runs. Both are function
  // declarations in main.js, hence reassignable from this classic script.
  function installWrappers() {
    try {
      if (typeof initParticles === 'function') {
        var _origInit = initParticles;
        // eslint-disable-next-line no-global-assign
        initParticles = function () {
          var r = _origInit.apply(this, arguments);
          clear();
          return r;
        };
      }
    } catch (e) { /* binding not reassignable here — fall through */ }

    try {
      if (typeof updateAttractor === 'function') {
        var _origUpdate = updateAttractor;
        // eslint-disable-next-line no-global-assign
        updateAttractor = function () {
          var r = _origUpdate.apply(this, arguments);
          clear();
          return r;
        };
      }
    } catch (e) { /* binding not reassignable here — fall through */ }
  }

  installWrappers();

  // ---- Wiring -----------------------------------------------------------------
  function setup() {
    injectStyles();

    var cnv = getCanvas();
    if (cnv) {
      // Pointer events coexist with main.js's mouse/touch handlers; we never
      // preventDefault, so we don't disturb rotate/pan/zoom.
      [cnv, el('canvas3d')].filter(Boolean).forEach(function(surface) {
      surface.addEventListener('pointerdown', onPointerDown, { passive: true });
      surface.addEventListener('pointermove', onPointerMove, { passive: true });
      surface.addEventListener('keydown', function(e) { if (e.key === 'Enter') { var r=surface.getBoundingClientRect(); inspectAt(r.left+r.width/2,r.top+r.height/2); e.preventDefault(); } });
      });
      cnv.addEventListener('pointermove', onPointerMove, { passive: true });
      // up/cancel/leave on window so we still settle if the pointer exits canvas.
      window.addEventListener('pointerup', onPointerUp, { passive: true });
      window.addEventListener('pointercancel', onPointerCancel, { passive: true });
    }

    var closeBtn = el('inspectCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        clear();
        if (cnv && typeof cnv.focus === 'function') {
          // keep focus sensible without forcing it onto the canvas if not focusable
          try { cnv.focus({ preventScroll: true }); } catch (e2) { /* ignore */ }
        }
      });
    }

    // Escape closes the readout too.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var box = el('inspectReadout');
        if (box && box.classList.contains('inspect-open')) {
          e.stopPropagation();
          clear();
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

  // ---- Public API -------------------------------------------------------------
  window.AttractorApp.Inspect = { inspectAt: inspectAt, clear: clear };
})();
