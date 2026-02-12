# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

```bash
# Serve locally (static project, no build step)
python3 -m http.server 8000
# Open: http://localhost:8000/

# Production URL
https://dr.eamer.dev/datavis/attractive/
```

## Project Overview

**Attractive** (Attractor Playground) - Interactive 3D visualization of chaotic strange attractors (Lorenz, Rossler, Chen, and more) rendered on HTML5 Canvas. Users explore chaos theory by manipulating parameters, datasets, color schemes, and visual styles in real time.

**Stack**: Vanilla JavaScript + HTML5 Canvas + Rough.js (hand-drawn style) + CSS
**No build step** - served as static files by Caddy.

## Architecture

This is a **single-page application** with three files plus assets:

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | 491 | Layout, sidebar controls, semantic HTML, ARIA attributes |
| `main.js` | 2533 | All logic: attractor math, Canvas rendering, UI state, datasets, presets |
| `style.css` | 1854 | Dark theme, sidebar layout, responsive breakpoints, animations |
| `onboarding.js` | 166 | First-visit guided tour (localStorage-persisted) |

### main.js Structure

The file is one large IIFE. Key sections (by concept, not formal modules):

- **Attractor definitions** - Mathematical systems (Lorenz, Rossler, Chen, Aizawa, Thomas, Halvorsen, Dadras, Sprott, LuChen, RabinovichFabrikant)
- **Dataset mappings** - Real-world data mapped to attractor parameters (climate, population, economic, seismic, astronomy, weather)
- **Color schemes** - 17 palettes (bioluminescent, ember, arctic, neon, etc.)
- **Visual styles** - clean, sketch (Rough.js), neon, minimal
- **Curated combos** - 12 preset attractor+dataset+color+style combinations
- **Rendering loop** - `requestAnimationFrame` with particle trail drawing, depth sorting, 3D→2D projection
- **Controls** - Slider handlers, keyboard shortcuts, mouse/touch drag for rotation and pan
- **Export** - PNG screenshot export
- **Auto-animate** - Automatic parameter sweeping for bifurcation exploration

### Interaction Model

- **Mouse drag**: Rotate 3D view (left button) or pan (right/shift+left)
- **Scroll wheel**: Zoom
- **Touch**: Single-finger rotate, two-finger pan, pinch zoom
- **Keyboard**: Space (play/pause), R (random combo), arrows (rotate), +/- (zoom), S (screenshot)
- **Sidebar controls**: Attractor type, dataset, color scheme, chaos parameters (Greek letters), visual options

## Existing Critique

`CRITIC.md` documents known UX issues (from geepers_critic audit):
- Presets buried below advanced controls (inverted learning curve)
- Parameter overload without tooltips explaining sigma/rho/beta
- 17 color schemes causes choice paralysis
- Export button visually de-emphasized

`ONBOARDING_IMPLEMENTATION.md` and `onboarding.js` add a guided first-visit tour to address the learning curve.

## Accessibility

`ACCESSIBILITY_SUMMARY.md` documents current a11y features:
- Skip link, ARIA landmarks, `role="status"` live region for screen reader announcements
- Keyboard navigation for all controls
- `announce()` function broadcasts state changes to assistive technology

## Important Notes

- `main.js.backup` is the pre-accessibility version (66K). Keep for reference but do not modify.
- `prior.md` (350K) is a conversation history artifact, not project documentation.
- `social-card.png` is the Open Graph preview image.
- The Canvas element has no accessible text alternative for the visualization itself - this is a known gap.
