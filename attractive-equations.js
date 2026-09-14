/*
 * attractive-equations.js — Feature C: LaTeX equation display
 *
 * A self-contained classic-script IIFE (no bundler, no modules). Reads main.js's
 * top-level globals (`currentAttractor`, `currentParams`, `attractors`) directly
 * and wraps the global `updateAttractor` to keep the panel in sync. Equations are
 * rendered with KaTeX (loaded from CDN); everything degrades gracefully if KaTeX
 * is unavailable.
 *
 * Metadata for the six fully-documented systems is ported verbatim from the iOS
 * app's AttractorMetadataRegistry (AttractiveCore/AttractorMetadata.swift). The
 * other 19 attractors fall back to the description + parameter table already in
 * main.js's `attractors` map.
 */
(function () {
  'use strict';

  window.AttractorApp = window.AttractorApp || {};

  // ---- Ported metadata (the 6 systems shared with the iOS app) ----------------
  // slot keys (p1/p2/p3) match main.js's `currentParams` shape exactly.
  var META = {
    lorenz: {
      system: ['\\dot{x} = \\sigma\\,(y - x)',
               '\\dot{y} = x\\,(\\rho - z) - y',
               '\\dot{z} = x\\,y - \\beta\\,z'],
      params: [
        { slot: 'p1', symbol: 'σ', name: 'Prandtl number', meaning: 'Ratio of fluid viscosity to thermal diffusivity; sets how fast the convection rolls respond.' },
        { slot: 'p2', symbol: 'ρ', name: 'Rayleigh number', meaning: 'Temperature difference driving the convection; the primary knob for the route into chaos.' },
        { slot: 'p3', symbol: 'β', name: 'Geometric factor', meaning: 'Aspect ratio of the convection cell. Lorenz used 8/3 ≈ 2.667.' }
      ],
      origin: 'Edward Lorenz, 1963: a three-variable cut-down of Rayleigh–Bénard convection. It was the first system where he watched tiny differences in the starting point explode into completely different outcomes, which is how the butterfly effect got its name.',
      character: 'Volume shrinks everywhere, yet the path never settles. It just winds forever around two unstable spirals, the wings. Chaos arrives by a subcritical Hopf bifurcation. This is the strange attractor most people picture first.',
      lyapunov: 0.906, dimension: 2.06
    },
    rossler: {
      system: ['\\dot{x} = -y - z',
               '\\dot{y} = x + a\\,y',
               '\\dot{z} = b + z\\,(x - c)'],
      params: [
        { slot: 'p1', symbol: 'a', name: 'Spiral gain', meaning: 'Controls the slow outward spiral in the x–y plane.' },
        { slot: 'p2', symbol: 'b', name: 'Reinjection offset', meaning: 'Sets the baseline of the fast z reinjection that folds the spiral back.' },
        { slot: 'p3', symbol: 'c', name: 'Fold threshold', meaning: 'Height at which z fires; drives a period-doubling cascade into chaos.' }
      ],
      origin: 'Otto Rössler built this in 1976 to be the simplest continuous system that still goes chaotic. One quadratic term, one folded band.',
      character: 'Stretch and fold, by the book. The path spirals outward in a plane, then a fast z-pulse lifts it and folds it back over. It tips into chaos through a clean run of period doublings.',
      lyapunov: 0.0714, dimension: 2.01
    },
    aizawa: {
      system: ['\\dot{x} = (z - b)\\,x - d\\,y',
               '\\dot{y} = d\\,x + (z - b)\\,y',
               '\\dot{z} = c + a\\,z - \\tfrac{z^3}{3} - (x^2 + y^2)(1 + e\\,z) + f\\,z\\,x^3'],
      params: [
        { slot: 'p1', symbol: 'a', name: 'z feedback', meaning: 'Linear growth term on z; sustains the vertical drift.' },
        { slot: 'p2', symbol: 'b', name: 'Radial bias', meaning: 'Shifts where the in-plane rotation switches from expanding to contracting.' },
        { slot: 'p3', symbol: 'c', name: 'Drive', meaning: 'Constant forcing on z that pushes the trajectory through the central spike.' }
      ],
      origin: 'Credited to Aizawa, and a favorite of computer-graphics demos. The constants d=3.5, e=0.25, f=0.1 stay fixed.',
      character: 'It draws a sphere with a spike through it. The path orbits a round shell while a thin column threads the poles. Good proof that strange attractors don’t all look like the Lorenz wings.',
      lyapunov: 0.07, dimension: 2.1
    },
    thomas: {
      system: ['\\dot{x} = s(\\sin(ky) - bx)',
               '\\dot{y} = s(\\sin(kz) - by)',
               '\\dot{z} = s(\\sin(kx) - bz)'],
      params: [
        { slot: 'p1', symbol: 'b', name: 'Dissipation', meaning: 'Damping on every axis. As b falls, the system moves from a stable point through limit cycles into chaos.' },
        { slot: 'p2', symbol: 's', name: 'Speed multiplier', meaning: 'Display-only time scaling; does not change the attractor’s shape.' },
        { slot: 'p3', symbol: 'k', name: 'Frequency', meaning: 'Scales the argument of the sines, setting the spacing of the cubic lattice the path weaves through.' }
      ],
      origin: 'René Thomas, 1999. Three variables feed back on each other with the same rule, each one pushed by a sine of the next.',
      character: 'Three-fold symmetry: rotate x→y→z→x and the flow looks identical. Turn the damping down and it wanders through a lattice of unstable points, which makes it one of the clearest ways to watch a single knob tune order into chaos.',
      lyapunov: 0.035, dimension: 2.0
    },
    halvorsen: {
      system: ['\\dot{x} = sv(-ax - 4y - 4z - y^2)',
               '\\dot{y} = sv(-ay - 4z - 4x - z^2)',
               '\\dot{z} = sv(-az - 4x - 4y - x^2)'],
      params: [
        { slot: 'p1', symbol: 'a', name: 'Damping', meaning: 'Linear self-damping shared by all three (cyclically symmetric) axes.' },
        { slot: 'p2', symbol: 's', name: 'Scale', meaning: 'Display time scaling; folds into the integration step, not the shape.' },
        { slot: 'p3', symbol: 'v', name: 'Speed', meaning: 'Display time scaling; folds into the integration step, not the shape.' }
      ],
      origin: 'Credited to Arne Halvorsen. Another cyclically symmetric system, but the coupling is quadratic this time rather than sinusoidal.',
      character: 'Same cyclic symmetry as Thomas, but the quadratic term winds it into a tight three-lobed knot. Put the two side by side to see how the shape of the nonlinearity reshapes a nearly identical symmetry.',
      lyapunov: 0.69, dimension: 2.1
    },
    chen: {
      system: ['\\dot{x} = a\\,(y - x)',
               '\\dot{y} = (c - a)\\,x - x\\,z + c\\,y',
               '\\dot{z} = x\\,y - b\\,z'],
      params: [
        { slot: 'p1', symbol: 'a', name: 'Coupling', meaning: 'Plays the same role as σ in Lorenz: the x–y coupling rate.' },
        { slot: 'p2', symbol: 'b', name: 'Dissipation', meaning: 'Damping on z, analogous to Lorenz’s β.' },
        { slot: 'p3', symbol: 'c', name: 'Drive', meaning: 'Forcing analogous to Lorenz’s ρ; tunes the strength of the double-scroll.' }
      ],
      origin: 'Guanrong Chen and Tetsushi Ueta, 1999: a dual to the Lorenz system. The equations look similar, but topologically it’s a different beast.',
      character: 'A close cousin of Lorenz that isn’t actually equivalent to it, wound into a tighter double-scroll. Run it next to Lorenz to see how similar-looking equations can host genuinely different attractors.',
      lyapunov: 2.0, dimension: 2.13
    }
  };

  // ---- DOM helpers ------------------------------------------------------------
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }
  function fmt(v) {
    if (typeof v !== 'number' || !isFinite(v)) return '—';
    return (Math.abs(v) >= 100 || Number.isInteger(v)) ? String(v) : v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }

  function injectStyles() {
    if (el('eq-styles')) return;
    var s = document.createElement('style');
    s.id = 'eq-styles';
    s.textContent = [
      '.equations-panel{position:fixed;top:0;right:0;height:100%;width:min(380px,92vw);',
      '  background:rgba(12,12,16,0.94);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);',
      '  border-left:1px solid rgba(255,255,255,0.12);box-shadow:-12px 0 40px rgba(0,0,0,0.5);',
      '  transform:translateX(102%);transition:transform .28s cubic-bezier(.4,0,.2,1);',
      '  z-index:200;display:flex;flex-direction:column;color:#f2f2f5;font-family:Inter,system-ui,sans-serif;}',
      '.equations-panel.open{transform:translateX(0);}',
      '.eq-header{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 10px;}',
      '.eq-header h2{margin:0;font-size:18px;font-weight:600;letter-spacing:.2px;}',
      '.eq-close{background:none;border:none;color:#aaa;font-size:28px;line-height:1;cursor:pointer;padding:0 6px;border-radius:5px;}',
      '.eq-close:hover{color:#fff;background:rgba(255,255,255,0.08);}',
      '.eq-body{overflow-y:auto;padding:4px 18px 28px;}',
      '.eq-section{margin:18px 0 0;}',
      '.eq-section h3{margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8ab4ff;font-weight:600;}',
      '.eq-system{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:5px;padding:12px 14px;overflow-x:auto;}',
      '.eq-system .katex{font-size:1.05em;color:#fff;}',
      '.eq-line{margin:6px 0;}',
      '.eq-line.fallback{font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#ddd;}',
      '.eq-param{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);}',
      '.eq-param:last-child{border-bottom:none;}',
      '.eq-param .sym{font-style:italic;font-weight:600;color:#fff;min-width:34px;font-size:15px;}',
      '.eq-param .pv{color:#8ab4ff;font-variant-numeric:tabular-nums;min-width:54px;}',
      '.eq-param .pn{color:#cfcfd6;font-size:12px;}',
      '.eq-param .pm{display:block;color:#9a9aa3;font-size:11px;margin-top:2px;line-height:1.4;}',
      '.eq-prose{color:#c8c8cf;font-size:13px;line-height:1.55;margin:0;}',
      '.eq-invariants{display:flex;gap:18px;flex-wrap:wrap;}',
      '.eq-invariants div{font-size:13px;color:#c8c8cf;}',
      '.eq-invariants b{color:#fff;font-variant-numeric:tabular-nums;}',
      '@media (max-width:480px){.equations-panel{width:100vw;}}'
    ].join('');
    document.head.appendChild(s);
  }

  // ---- Rendering --------------------------------------------------------------
  var isOpen = false;

  function renderLatexInto(container, latex, displayMode) {
    var line = document.createElement('div');
    line.className = 'eq-line';
    if (typeof window.katex !== 'undefined') {
      try {
        window.katex.render(latex, line, { displayMode: !!displayMode, throwOnError: false });
      } catch (e) {
        line.className = 'eq-line fallback';
        line.textContent = latex;
      }
    } else {
      line.className = 'eq-line fallback';
      line.textContent = latex;
    }
    container.appendChild(line);
  }

  function currentKey() {
    try { return (typeof currentAttractor !== 'undefined') ? currentAttractor : 'lorenz'; }
    catch (e) { return 'lorenz'; }
  }
  function webAttractor(key) {
    try { return (typeof attractors !== 'undefined') ? attractors[key] : null; }
    catch (e) { return null; }
  }
  function paramValue(slot) {
    try { return (typeof currentParams !== 'undefined') ? currentParams[slot] : undefined; }
    catch (e) { return undefined; }
  }

  function refresh() {
    if (!isOpen) return;
    var key = currentKey();
    var meta = META[key];
    var web = webAttractor(key);
    var titleEl = el('eqTitle');
    var body = el('equationsBody');
    if (!body) return;
    var name = (web && web.name) || key;
    if (titleEl) titleEl.textContent = name + ' — equations';
    body.innerHTML = '';

    // System
    var sys = document.createElement('div');
    sys.className = 'eq-section';
    sys.innerHTML = '<h3>System</h3>';
    var sysBox = document.createElement('div');
    sysBox.className = 'eq-system';
    if (meta) {
      meta.system.forEach(function (l) { renderLatexInto(sysBox, l, true); });
    } else {
      // Fallback: 19 not-yet-documented systems show the prose description.
      var p = document.createElement('p');
      p.className = 'eq-prose';
      p.textContent = (web && web.description) ? web.description : 'Full equations for this system are coming soon.';
      sysBox.appendChild(p);
    }
    sys.appendChild(sysBox);
    body.appendChild(sys);

    // Parameters (live values from currentParams)
    var params = (meta && meta.params) || (web && web.params ? web.params.map(function (wp, i) {
      return { slot: 'p' + (i + 1), symbol: wp.name, name: '', meaning: wp.tooltip || '' };
    }) : []);
    if (params.length) {
      var ps = document.createElement('div');
      ps.className = 'eq-section';
      ps.innerHTML = '<h3>Parameters</h3>';
      params.forEach(function (pp) {
        var row = document.createElement('div');
        row.className = 'eq-param';
        var v = paramValue(pp.slot);
        row.innerHTML =
          '<span class="sym">' + esc(pp.symbol) + '</span>' +
          '<span class="pv">' + esc(fmt(v)) + '</span>' +
          '<span class="pn">' + esc(pp.name || '') +
          (pp.meaning ? '<span class="pm">' + esc(pp.meaning) + '</span>' : '') +
          '</span>';
        ps.appendChild(row);
      });
      body.appendChild(ps);
    }

    if (meta) {
      // Origin
      var o = document.createElement('div');
      o.className = 'eq-section';
      o.innerHTML = '<h3>Origin</h3><p class="eq-prose">' + esc(meta.origin) + '</p>';
      body.appendChild(o);

      // Dynamics
      var d = document.createElement('div');
      d.className = 'eq-section';
      d.innerHTML = '<h3>Dynamics</h3><p class="eq-prose">' + esc(meta.character) + '</p>';
      body.appendChild(d);
    }
  }

  function open() {
    var panel = el('equationsPanel');
    if (!panel) return;
    if (window.AttractorApp.Lessons) window.AttractorApp.Lessons.close(false);
    panel.inert = false;
    isOpen = true;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    var btn = el('equationsBtn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    refresh();
    var closeBtn = el('equationsCloseBtn');
    if (closeBtn) closeBtn.focus();
  }
  function close(restoreFocus) {
    var panel = el('equationsPanel');
    if (!panel) return;
    isOpen = false;
    panel.inert = true;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    var btn = el('equationsBtn');
    if (btn) { btn.setAttribute('aria-expanded', 'false'); if (restoreFocus !== false) btn.focus(); }
  }
  function toggle() { isOpen ? close() : open(); }

  // ---- Wiring -----------------------------------------------------------------
  // Wrap the global updateAttractor so the panel stays in sync (covers attractor
  // changes from the dropdown, presets, and random). Done at top level so the
  // wrapper is in place before init() first calls updateAttractor().
  try {
    if (typeof updateAttractor === 'function') {
      var _origUpdate = updateAttractor;
      updateAttractor = function () {
        _origUpdate.apply(this, arguments);
        refresh();
      };
    }
  } catch (e) { /* binding not reassignable in this context — refresh on open still works */ }

  function setup() {
    injectStyles();
    var btn = el('equationsBtn');
    if (btn) btn.addEventListener('click', toggle);
    var closeBtn = el('equationsCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) { e.stopPropagation(); close(); }
    });
    // Keep live parameter values fresh while the panel is open and sliders move.
    var pc = el('parametersContainer');
    if (pc) pc.addEventListener('input', function () { if (isOpen) refresh(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

  window.AttractorApp.Equations = { open: open, close: close, toggle: toggle, refresh: refresh };
})();
