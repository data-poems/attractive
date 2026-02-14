# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

```bash
# Serve locally (static project, no build step)
python3 -m http.server 8000
# Open: http://localhost:8000/

# Production URL
https://dr.eamer.dev/datavis/attractive/

# This is a git submodule of ~/html/datavis/ — commit here independently,
# then update the parent pointer: cd ~/html/datavis && git add attractive
```

## Project Overview

**Attractive** (Attractor Playground) - Interactive 3D visualization of 26 chaotic strange attractors rendered on HTML5 Canvas. Users explore chaos theory by choosing from 17 data sources, 30+ color schemes, 7 visual styles, and 21 mathematical presets, all controllable in real time.

**Stack**: Vanilla JavaScript + HTML5 Canvas + Rough.js (hand-drawn styles) + CSS. No build step - served as static files by Caddy.

## Architecture

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~490 | Sidebar controls (dropdowns with optgroups), canvas, modal, floating toolbar. Semantic HTML with ARIA. |
| `main.js` | ~2530 | All application logic as top-level script (not an IIFE). See section breakdown below. |
| `style.css` | ~1850 | Dark theme, sidebar layout, responsive breakpoints (768px), floating controls, onboarding styles. |
| `onboarding.js` | ~165 | First-visit guided tour. Self-contained IIFE, persists completion to `localStorage`. |

### main.js Section Map

The file is a single top-level script with no modules. Key data structures and functions by approximate line range:

| Lines | Section | Key Identifiers |
|-------|---------|-----------------|
| 1-90 | Canvas setup, state variables, `announce()` | `canvas`, `ctx`, `rotationX/Y`, `zoom`, `speed`, `currentDataset/Attractor/ColorScheme/Style` |
| 87-220 | Undo/history system (Ctrl+Z) | `historyStack`, `pushState()`, `restoreState()`, `undo()` |
| 225-286 | `beautifulCombos[]` - 40+ curated attractor+dataset+color+style combos | Used by Random button |
| 289-377 | `datasets{}` - 17 data sources with display names, info text, param labels | `climate`, `economic`, `seismic`, `crypto`, `audio`, etc. |
| 378-870 | `attractors{}` - 26 attractor systems, each with `compute(x,y,z,params,dt)`, scale, initPos | `lorenz`, `rossler`, `chen`, `chua`, `fourwing`, `clifford`, etc. |
| 870-998 | `curatedDefaults{}` - per-attractor-per-dataset parameter overrides | Ensures good visuals for each combo |
| 948-997 | `colorSchemes{}` - 30+ palettes as `{start: [r,g,b], end: [r,g,b]}` gradients | Organized in optgroups: Vibrant, Warm, Cool, Cosmic, Neutral, Dark, Scientific |
| 1000-1085 | `VISUAL_STYLES{}` - 7 rendering styles (clean, davinci, blueprint, neon, chalk, oscilloscope, watercolor) | Each defines background type, line renderer (canvas/rough), glow settings, color transforms |
| 1088-1200 | `initParticles()`, `generateParameterControls()`, `loadCuratedDefaults()` | Particle initialization, dynamic slider generation |
| 1210-1500 | Rendering: `renderBackground()`, `getStyledColor()`, `drawStyledLine()` | Style-specific background rendering (grid, parchment, CRT, etc.) and line drawing |
| 1503-1700 | `render()` - main animation loop | Per-frame: compute attractor positions, project 3D→2D, draw trails with fade/depth |
| 1707-1940 | UI event handlers, `presets{}`, `applyCombo()` | Control bindings, famous bifurcation presets |
| 1940-2100 | `getNextCombo()`, modal, keyboard shortcuts | Random combo cycling, info dialog with focus trap |
| 2100-2533 | Mouse/touch input, sidebar toggle, collapsible sections, export, fullscreen | Drag-rotate, pinch-zoom, sidebar collapse, PNG export |

### Data Flow

```
User selects [Attractor] + [Dataset] + [Color Scheme] + [Visual Style]
    ↓
loadCuratedDefaults() → sets currentParams (p1, p2, p3) from curatedDefaults or attractor defaults
    ↓
initParticles() → creates N particles near attractor.initPos with spread
    ↓
render() loop (requestAnimationFrame):
  1. renderBackground() based on VISUAL_STYLES[currentStyle]
  2. For each particle: attractor.compute(x,y,z,params,dt) → new position
  3. 3D rotation (rotationX/Y) → 2D screen projection with scale + panX/panY
  4. drawStyledLine() per trail segment (handles canvas/rough rendering, glow, color transforms)
  5. Auto-animate sweeps a parameter if enabled
```

### Adding a New Attractor

Add an entry to the `attractors` object (~line 378):
```javascript
myattractor: {
  name: 'My Attractor',
  description: 'Brief description of the system.',
  params: [
    { name: 'a (Label)', min: 0, max: 10, step: 0.1, default: 5, tooltip: 'What this controls.' },
    // ... p2, p3
  ],
  compute: (x, y, z, params, dt) => {
    const dx = /* ... */;
    const dy = /* ... */;
    const dz = /* ... */;
    return [x + dx * dt, y + dy * dt, z + dz * dt];
  },
  scale: 10,          // Zoom multiplier so the attractor fills the canvas nicely
  initPos: [0.1, 0, 0], // Starting position for particles
  initSpread: 0.5     // Random spread around initPos
}
```
Then add a corresponding `<option>` in `index.html` under the appropriate `<optgroup>` in `#attractorSelect`, and optionally add curated defaults in `curatedDefaults` and combos in `beautifulCombos`.

### Adding a New Visual Style

Add an entry to `VISUAL_STYLES` (~line 1000). The rendering pipeline checks:
- `background.type` → dispatches in `renderBackground()` (solid, grid, parchment, blackboard, paper, crt)
- `line.renderer` → `'canvas'` (native) or `'rough'` (Rough.js hand-drawn)
- `glow` → shadowBlur settings
- `colorTransform` → `'sepia'`, `'saturate'`, `'pastel'`, `'watercolor'` in `getStyledColor()`
- `colorOverride` → forces all lines to a single color (used by blueprint, oscilloscope)

Also add an `<option>` in `index.html` under `#visualStyleSelect`.

## Interaction Model

- **Mouse drag**: Rotate 3D view (left button) or pan (right-click/shift+left)
- **Scroll wheel**: Zoom
- **Touch**: 1-finger rotate, 2-finger pan, pinch zoom
- **Keyboard**: Space (play/pause), R (random combo), Ctrl+Z/Cmd+Z (undo), F (fullscreen), arrows (rotate), Escape (close modal)
- **Floating toolbar** (bottom): Speed controls, random, export PNG, info modal
- **Sidebar**: Presets dropdown, Style section (color/visual style/particles/speed), Content section (dataset/attractor), Advanced section (chaos params, trail/glow/line width)

## Accessibility

- Skip link, ARIA landmarks, `role="status"` live region
- `announce()` function broadcasts state changes to assistive technology
- All controls keyboard-navigable, modal has focus trap
- Canvas has `role="img"` with descriptive `aria-label` but no live text alternative for the visualization itself (known gap)
- See `ACCESSIBILITY_SUMMARY.md` for full audit

## Important Notes

- `main.js.backup` is the pre-accessibility version. Keep for reference, do not modify.
- `prior.md` (~350K) is a conversation history artifact, not documentation.
- `CRITIC.md` documents known UX issues from a geepers audit.
- `onboarding.js` targets `.quick-start` and `.color-grid` selectors that no longer exist in the current HTML (onboarding steps reference old UI elements from pre-dropdown refactor).
- The auto-animate feature uses `prompt()` which blocks the browser thread - this is a known UX issue.
- Color schemes use simple 2-stop linear gradients (`start` → `end` RGB arrays); particles are colored by index interpolation between the two stops.
