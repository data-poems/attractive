/* Copyright (c) 2026 Luke Steuber. MIT license; see LICENSE.
 * Guided lessons with standard model parameters and local completion tracking.
 * Shares classic-script state with main.js and the optional 3D/math tools.
 */
(function () {
  'use strict';

  window.AttractorApp = window.AttractorApp || {};

  // ---- Lesson data -----------------------------------------------------------
  var LESSONS = [
    {
      id: 'dynamical-systems',
      title: 'What is a dynamical system?',
      subtitle: 'State, rules, and trajectories',
      steps: [
        {
          title: 'A point with a rule',
          body: "A dynamical system is just a point moving through space by a fixed rule. Its position is the state: here, three numbers, x, y, and z. The rule sets how fast each one is changing right now.",
          latex: ['\\dot{x} = f(x, y, z)'],
          preset: { attractor: 'lorenz', mode3d: true, showLyapunov: false }
        },
        {
          title: 'Following the flow',
          body: 'Apply the rule over and over and the point traces a path, called a trajectory. The curve on screen is the whole history of one point following one rule. Drag to rotate it and you’ll see the structure is genuinely three-dimensional.',
          latex: [],
          preset: { attractor: 'lorenz', mode3d: true }
        },
        {
          title: 'The attractor',
          body: 'Start almost anywhere and the trajectory gets pulled onto the same shape: the attractor. It’s where the system ends up in the long run, and for these equations that shape is strange. Bounded, but never repeating.',
          latex: [],
          preset: { attractor: 'lorenz', mode3d: true }
        }
      ]
    },
    {
      id: 'fixed-points',
      title: 'Fixed points & stability',
      subtitle: 'Where motion stops, and whether it stays',
      steps: [
        {
          title: 'A point at rest',
          body: 'A fixed point is a state where the rule says nothing changes: every derivative is zero. The system can sit there forever. The question is whether it wants to.',
          latex: ['\\dot{x} = \\dot{y} = \\dot{z} = 0'],
          preset: { attractor: 'lorenz', mode3d: true }
        },
        {
          title: 'Calm convection',
          body: 'Turn the Rayleigh number ρ down low. With little heat driving it, the Lorenz system has a single stable fixed point at the origin and no convection at all. Nearby states fall into it and stay put. That’s stability.',
          latex: [],
          preset: { attractor: 'lorenz', mode3d: true, params: { p2: 0.8 } }
        },
        {
          title: 'Losing stability',
          body: 'Raise ρ past 1 and the origin gives way to two new fixed points, the steady convection rolls. Push ρ higher and those go unstable too. Open Advanced Controls and sweep ρ to feel the handoff.',
          latex: [],
          preset: { attractor: 'lorenz', mode3d: true, params: { p2: 14 } }
        }
      ]
    },
    {
      id: 'limit-cycles',
      title: 'Limit cycles',
      subtitle: 'When the system settles into a loop',
      steps: [
        {
          title: 'A repeating orbit',
          body: 'Between rest and chaos lies the limit cycle: the trajectory settles onto a closed loop and repeats forever, like a clock. The Rössler system at a low fold threshold does exactly this.',
          latex: [],
          preset: { attractor: 'rossler', mode3d: true, params: { p3: 3.5 } }
        },
        {
          title: 'Stretch and reinject',
          body: 'Rössler spirals slowly outward in a plane, then a fast pulse lifts the point and folds it back toward the centre. At this setting the fold is gentle and the loop stays simple, one trip per cycle.',
          latex: ['\\dot{z} = b + z\\,(x - c)'],
          preset: { attractor: 'rossler', mode3d: true, params: { p3: 3.5 } }
        }
      ]
    },
    {
      id: 'route-to-chaos',
      title: 'The route to chaos',
      subtitle: 'Period doubling in Rössler',
      steps: [
        {
          title: 'One loop',
          body: 'Start with a single clean loop. I’ll raise the fold threshold c a step at a time so you can watch the orbit get more tangled.',
          latex: [],
          preset: { attractor: 'rossler', mode3d: true, params: { p3: 4.0 } }
        },
        {
          title: 'The loop doubles',
          body: 'Near c ≈ 4.2 the orbit splits: now it takes two trips to close. This is a period-doubling bifurcation. Keep raising c and it doubles again, and again, faster each time.',
          latex: [],
          preset: { attractor: 'rossler', mode3d: true, params: { p3: 4.3 } }
        },
        {
          title: 'Into the band',
          body: 'By c ≈ 5.7 the doublings have piled up without limit and the orbit never closes. What’s left is a chaotic band. A cascade of plain doublings has turned into real chaos. Sweep c in Advanced Controls to retrace the route.',
          latex: [],
          preset: { attractor: 'rossler', mode3d: true, params: { p3: 5.7 } }
        }
      ]
    },
    {
      id: 'measuring-chaos',
      title: 'Measuring chaos',
      subtitle: 'Lyapunov exponent & fractal dimension',
      steps: [
        {
          title: 'How fast do they diverge?',
          body: 'That rate of separation has a number: the largest Lyapunov exponent, λ₁. When it’s positive, nearby states pull apart exponentially, which is the fingerprint of chaos. Watch the live estimate climb toward its known value.',
          latex: ['\\delta(t) \\approx \\delta_0\\, e^{\\lambda_1 t}'],
          preset: { attractor: 'lorenz', mode3d: true, showLyapunov: true }
        },
        {
          title: 'A shape between dimensions',
          body: 'The Lorenz attractor isn’t a surface and isn’t a solid. Its fractal dimension is about 2.06, wedged between two and three. It’s an infinitely layered sheet, which is how trajectories manage to never cross and never repeat.',
          latex: [],
          preset: { attractor: 'lorenz', mode3d: true, showLyapunov: true }
        },
        {
          title: 'Compare two attractors',
          body: 'Switch to Chen, a close cousin of Lorenz with a larger λ₁. It pulls apart faster, a fiercer kind of chaos. Open Equations to read the system and its parameters.',
          latex: [],
          preset: { attractor: 'chen', mode3d: true, showLyapunov: true }
        }
      ]
    }
  ];

  // ---- DOM helpers ------------------------------------------------------------
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }

  // ---- Completion tracking (localStorage) -------------------------------------
  function completeKey(id) { return 'lesson-complete-' + id; }
  function isComplete(id) {
    try { return window.localStorage.getItem(completeKey(id)) === '1'; }
    catch (e) { return false; }
  }
  function markComplete(id) {
    try { window.localStorage.setItem(completeKey(id), '1'); }
    catch (e) { /* storage unavailable — completion just won't persist */ }
  }
  function completedCount() {
    var n = 0;
    for (var i = 0; i < LESSONS.length; i++) { if (isComplete(LESSONS[i].id)) n++; }
    return n;
  }

  // ---- Styles -----------------------------------------------------------------
  function injectStyles() {
    if (el('lesson-styles')) return;
    var s = document.createElement('style');
    s.id = 'lesson-styles';
    s.textContent = [
      '.lessons-panel{position:fixed;top:0;right:0;height:100%;width:min(400px,94vw);',
      '  background:rgba(12,12,16,0.95);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);',
      '  border-left:1px solid rgba(255,255,255,0.12);box-shadow:-12px 0 40px rgba(0,0,0,0.5);',
      '  transform:translateX(102%);transition:transform .28s cubic-bezier(.4,0,.2,1);',
      '  z-index:200;display:flex;flex-direction:column;color:#f2f2f5;font-family:Inter,system-ui,sans-serif;}',
      '.lessons-panel.open{transform:translateX(0);}',
      '.lessons-header{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 10px;flex:none;}',
      '.lessons-header h2{margin:0;font-size:18px;font-weight:600;letter-spacing:.2px;}',
      '.lessons-close{background:none;border:none;color:#aaa;font-size:28px;line-height:1;cursor:pointer;padding:0 6px;border-radius:5px;}',
      '.lessons-close:hover{color:#fff;background:rgba(255,255,255,0.08);}',
      '.lessons-body{overflow-y:auto;padding:4px 18px 28px;flex:1 1 auto;}',
      // Browser (list of lessons)
      '.lesson-list{list-style:none;margin:0;padding:0;}',
      '.lesson-item{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:left;',
      '  background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:6px;',
      '  padding:12px 14px;margin:0 0 10px;cursor:pointer;color:inherit;font:inherit;transition:background .15s;}',
      '.lesson-item:hover{background:rgba(255,255,255,0.09);}',
      '.lesson-item:focus-visible{outline:2px solid #8ab4ff;outline-offset:2px;}',
      '.lesson-badge{flex:none;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;',
      '  background:rgba(138,180,255,0.15);color:#8ab4ff;font-size:14px;font-weight:700;',
      '  font-family:ui-monospace,Menlo,monospace;}',
      '.lesson-badge.done{background:rgba(120,220,150,0.18);color:#7adc96;}',
      '.lesson-meta{display:flex;flex-direction:column;gap:2px;min-width:0;}',
      '.lesson-meta .lt{font-size:15px;font-weight:500;color:#fff;}',
      '.lesson-meta .ls{font-size:12px;color:rgba(255,255,255,0.55);}',
      '.lessons-progress-summary{font-size:11px;text-transform:uppercase;letter-spacing:1.2px;',
      '  color:#8ab4ff;font-weight:600;margin:6px 0 14px;}',
      // Player
      '.lesson-player{display:flex;flex-direction:column;gap:16px;}',
      '.lesson-back{align-self:flex-start;background:none;border:none;color:rgba(255,255,255,0.7);',
      '  font:inherit;font-size:13px;cursor:pointer;padding:4px 0;display:flex;align-items:center;gap:4px;}',
      '.lesson-back:hover{color:#fff;}',
      '.lesson-pills{display:flex;gap:6px;align-items:center;}',
      '.lesson-pill{height:7px;width:7px;border-radius:4px;background:rgba(255,255,255,0.2);transition:width .2s,background .2s;}',
      '.lesson-pill.active{width:22px;background:#8ab4ff;}',
      '.lesson-step-title{margin:0;font-size:18px;font-weight:600;color:#fff;}',
      '.lesson-eq{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);',
      '  border-radius:6px;padding:12px 14px;overflow-x:auto;}',
      '.lesson-eq .katex{font-size:1.15em;color:#fff;}',
      '.lesson-eq-line{margin:6px 0;}',
      '.lesson-eq-line.fallback{font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#ddd;}',
      '.lesson-prose{color:rgba(255,255,255,0.85);font-size:14px;line-height:1.6;margin:0;}',
      '.lesson-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px;}',
      '.lesson-nav-back{background:none;border:none;color:rgba(255,255,255,0.8);font:inherit;font-size:14px;',
      '  cursor:pointer;padding:6px 4px;border-radius:5px;}',
      '.lesson-nav-back:hover{color:#fff;}',
      '.lesson-nav-back[hidden]{display:none;}',
      '.lesson-nav-next{margin-left:auto;background:#8ab4ff;color:#0a0a0e;border:none;font:inherit;',
      '  font-weight:600;font-size:14px;cursor:pointer;padding:10px 20px;border-radius:6px;}',
      '.lesson-nav-next:hover{background:#a5c4ff;}',
      '.lesson-nav-next:focus-visible,.lesson-nav-back:focus-visible{outline:2px solid #8ab4ff;outline-offset:2px;}',
      '@media (max-width:480px){.lessons-panel{width:100vw;}}'
    ].join('');
    document.head.appendChild(s);
  }

  // ---- Live-view access (main.js globals) -------------------------------------
  // main.js is a bare classic script (no IIFE), so its top-level `let`/`function`
  // declarations are reachable by name from this script, which loads afterwards.
  // currentParams / currentAttractor are reassignable, so we mutate/replace them
  // through their own bindings (bare assignment), exactly like attractive-3d.js
  // would. Everything is wrapped so a missing binding can never throw on load.

  function safeSetAttractor(key) {
    // Set the dropdown then call updateAttractor() so main.js picks up the change
    // and reloads curated defaults / parameter controls. updateAttractor() also
    // resets currentParams, so any param overrides must be applied *after* this.
    try {
      var sel = el('attractorSelect');
      if (sel) sel.value = key;
      if (typeof currentAttractor !== 'undefined') {
        // eslint-disable-next-line no-undef
        currentAttractor = key;
      }
    } catch (e) { /* binding not present */ }
    try {
      if (typeof updateAttractor === 'function') updateAttractor();
    } catch (e) { /* not present */ }
  }

  function safeMergeParams(params) {
    if (!params) return;
    try {
      if (typeof currentParams === 'undefined') return;
      var merged = {};
      for (var k in currentParams) {
        if (Object.prototype.hasOwnProperty.call(currentParams, k)) merged[k] = currentParams[k];
      }
      for (var p in params) {
        if (Object.prototype.hasOwnProperty.call(params, p)) merged[p] = params[p];
      }
      // eslint-disable-next-line no-undef
      currentParams = merged;
    } catch (e) { /* binding not reassignable here */ }
  }

  function safeInitParticles() {
    try { if (typeof initParticles === 'function') initParticles(); }
    catch (e) { /* not present */ }
  }

  function safeAnnounce(msg) {
    try { if (typeof announce === 'function') announce(msg); }
    catch (e) { /* not present */ }
  }

  function applyPreset(preset) {
    if (!preset) return;

    // 1. Attractor (resets currentParams inside main.js, so do this first).
    if (preset.attractor) {
      safeSetAttractor(preset.attractor);
    }

    // Lessons describe standard systems independently of the dataset defaults.
    if (typeof attractors !== 'undefined' && attractors[currentAttractor]) {
      currentParams = {};
      attractors[currentAttractor].params.forEach(function (p, i) { currentParams['p' + (i + 1)] = p.default; });
    }
    // 2. Parameter overrides.
    if (preset.params) {
      safeMergeParams(preset.params);
    }

    if (typeof generateParameterControls === 'function') generateParameterControls();
    if (typeof updateMappingDisplay === 'function') updateMappingDisplay();
    if (window.AttractorApp.Equations) window.AttractorApp.Equations.refresh();
    // 3. 3D view mode — guarded; the feature may not be present yet.
    if (preset.mode3d === true) {
      if (window.AttractorApp.ThreeD && typeof window.AttractorApp.ThreeD.enable === 'function') {
        try { window.AttractorApp.ThreeD.enable(); } catch (e) { /* no-op */ }
      }
    } else if (preset.mode3d === false) {
      if (window.AttractorApp.ThreeD && typeof window.AttractorApp.ThreeD.disable === 'function') {
        try { window.AttractorApp.ThreeD.disable(); } catch (e) { /* no-op */ }
      }
    }

    // 4. Lyapunov readout visibility — guarded.
    if (preset.showLyapunov != null) {
      if (window.AttractorApp.Lyapunov && typeof window.AttractorApp.Lyapunov.setVisible === 'function') {
        try { window.AttractorApp.Lyapunov.setVisible(!!preset.showLyapunov); } catch (e) { /* no-op */ }
      }
    }

    // 5. Rebuild particles so param/attractor changes take visible effect.
    safeInitParticles();
    if (window.AttractorApp.Lyapunov) window.AttractorApp.Lyapunov.reset();
    if (window.AttractorApp.ThreeD && window.AttractorApp.ThreeD.refresh) window.AttractorApp.ThreeD.refresh();
  }

  // ---- KaTeX rendering --------------------------------------------------------
  function renderLatexInto(container, latex) {
    var line = document.createElement('div');
    line.className = 'lesson-eq-line';
    if (typeof window.katex !== 'undefined') {
      try {
        window.katex.render(latex, line, { displayMode: true, throwOnError: false });
      } catch (e) {
        line.className = 'lesson-eq-line fallback';
        line.textContent = latex;
      }
    } else {
      line.className = 'lesson-eq-line fallback';
      line.textContent = latex;
    }
    container.appendChild(line);
  }

  // ---- View state -------------------------------------------------------------
  var isOpen = false;
  var view = 'list';       // 'list' | 'player'
  var activeLessonIndex = -1;
  var stepIndex = 0;

  function lessonAt(i) { return LESSONS[i]; }

  // ---- Browser (lesson list) --------------------------------------------------
  function renderList() {
    view = 'list';
    var titleEl = el('lessonsTitle');
    if (titleEl) titleEl.textContent = 'Guided Lessons';
    var body = el('lessonsBody');
    if (!body) return;
    body.innerHTML = '';

    var summary = document.createElement('div');
    summary.className = 'lessons-progress-summary';
    summary.textContent = completedCount() + ' of ' + LESSONS.length + ' complete';
    body.appendChild(summary);

    var ul = document.createElement('ul');
    ul.className = 'lesson-list';

    LESSONS.forEach(function (lesson, i) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lesson-item';
      btn.setAttribute('aria-label', 'Start lesson: ' + lesson.title);

      var done = isComplete(lesson.id);
      var badge = document.createElement('span');
      badge.className = 'lesson-badge' + (done ? ' done' : '');
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = done ? '✓' : String(i + 1);

      var meta = document.createElement('span');
      meta.className = 'lesson-meta';
      meta.innerHTML =
        '<span class="lt">' + esc(lesson.title) + '</span>' +
        '<span class="ls">' + esc(lesson.subtitle) + '</span>';

      btn.appendChild(badge);
      btn.appendChild(meta);
      btn.addEventListener('click', function () { enterPlayer(i); });
      li.appendChild(btn);
      ul.appendChild(li);
    });

    body.appendChild(ul);
  }

  // ---- Player -----------------------------------------------------------------
  function enterPlayer(i) {
    activeLessonIndex = i;
    stepIndex = 0;
    renderPlayer();
    applyPreset(lessonAt(i).steps[0].preset);
    safeAnnounce('Lesson: ' + lessonAt(i).title + '. Step 1 of ' + lessonAt(i).steps.length + '.');
  }

  function goToStep(newIndex) {
    var lesson = lessonAt(activeLessonIndex);
    if (!lesson) return;
    if (newIndex < 0 || newIndex >= lesson.steps.length) return;
    stepIndex = newIndex;
    renderPlayer();
    applyPreset(lesson.steps[stepIndex].preset);
    safeAnnounce(lesson.steps[stepIndex].title + '. Step ' + (stepIndex + 1) + ' of ' + lesson.steps.length + '.');
  }

  function finishLesson() {
    var lesson = lessonAt(activeLessonIndex);
    if (lesson) {
      markComplete(lesson.id);
      safeAnnounce('Lesson complete: ' + lesson.title + '.');
    }
    backToList();
  }

  function backToList() {
    activeLessonIndex = -1;
    stepIndex = 0;
    renderList();
    var focusTarget = el('lessonsBody') && el('lessonsBody').querySelector('.lesson-item');
    if (focusTarget) focusTarget.focus();
  }

  function renderPlayer() {
    view = 'player';
    var lesson = lessonAt(activeLessonIndex);
    if (!lesson) { renderList(); return; }
    var step = lesson.steps[stepIndex];
    var isLast = stepIndex === lesson.steps.length - 1;

    var titleEl = el('lessonsTitle');
    if (titleEl) titleEl.textContent = lesson.title;

    var body = el('lessonsBody');
    if (!body) return;
    body.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'lesson-player';

    // Back-to-list affordance
    var backLink = document.createElement('button');
    backLink.type = 'button';
    backLink.className = 'lesson-back';
    backLink.innerHTML = '‹ All lessons';
    backLink.addEventListener('click', backToList);
    wrap.appendChild(backLink);

    // Progress pills (one per step; active is wider + accent)
    var pills = document.createElement('div');
    pills.className = 'lesson-pills';
    pills.setAttribute('role', 'progressbar');
    pills.setAttribute('aria-valuemin', '1');
    pills.setAttribute('aria-valuemax', String(lesson.steps.length));
    pills.setAttribute('aria-valuenow', String(stepIndex + 1));
    pills.setAttribute('aria-label', 'Step ' + (stepIndex + 1) + ' of ' + lesson.steps.length);
    lesson.steps.forEach(function (_, i) {
      var pill = document.createElement('span');
      pill.className = 'lesson-pill' + (i === stepIndex ? ' active' : '');
      pills.appendChild(pill);
    });
    wrap.appendChild(pills);

    // Step title
    var stepTitle = document.createElement('h3');
    stepTitle.className = 'lesson-step-title';
    stepTitle.textContent = step.title;
    wrap.appendChild(stepTitle);

    // Equation block(s)
    if (step.latex && step.latex.length) {
      var eq = document.createElement('div');
      eq.className = 'lesson-eq';
      step.latex.forEach(function (l) { renderLatexInto(eq, l); });
      wrap.appendChild(eq);
    }

    // Body prose
    var prose = document.createElement('p');
    prose.className = 'lesson-prose';
    prose.textContent = step.body;
    wrap.appendChild(prose);

    // Controls: Back / Next-or-Finish
    var controls = document.createElement('div');
    controls.className = 'lesson-controls';

    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'lesson-nav-back';
    backBtn.textContent = '‹ Back';
    if (stepIndex === 0) backBtn.hidden = true;
    backBtn.addEventListener('click', function () { goToStep(stepIndex - 1); });
    controls.appendChild(backBtn);

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'lesson-nav-next';
    nextBtn.textContent = isLast ? 'Finish' : 'Next';
    nextBtn.addEventListener('click', function () {
      if (isLast) finishLesson();
      else goToStep(stepIndex + 1);
    });
    controls.appendChild(nextBtn);

    wrap.appendChild(controls);
    body.appendChild(wrap);

    // Keep keyboard focus useful: land on the primary action.
    nextBtn.focus();
  }

  // ---- Open / close -----------------------------------------------------------
  function open() {
    var panel = el('lessonsPanel');
    if (!panel) return;
    if (window.AttractorApp.Equations) window.AttractorApp.Equations.close(false);
    panel.inert = false;
    isOpen = true;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    var btn = el('lessonsBtn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    // Always (re)enter through the browser so completion checks refresh.
    if (view === 'player' && activeLessonIndex >= 0) {
      renderPlayer();
    } else {
      renderList();
    }
    var closeBtn = el('lessonsCloseBtn');
    if (closeBtn) closeBtn.focus();
  }

  function close(restoreFocus) {
    var panel = el('lessonsPanel');
    if (!panel) return;
    isOpen = false;
    panel.inert = true;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    var btn = el('lessonsBtn');
    if (btn) { btn.setAttribute('aria-expanded', 'false'); if (restoreFocus !== false) btn.focus(); }
  }

  function toggle() { isOpen ? close() : open(); }

  // ---- Wiring -----------------------------------------------------------------
  function setup() {
    injectStyles();
    var btn = el('lessonsBtn');
    if (btn) btn.addEventListener('click', toggle);
    var closeBtn = el('lessonsCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) { e.stopPropagation(); close(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

  window.AttractorApp.Lessons = { open: open, close: close, toggle: toggle };
})();
