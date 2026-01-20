# CRITIC.md - Attractor Playground

> Honest critique of UX, design, architecture, and technical debt.
> Generated: 2026-01-20 by geepers_critic
>
> This isn't about code quality - it's about "does this feel right?"

## The Vibe Check

**First Impression**: Overwhelmed by options. Beautiful visualization, but I have NO IDEA where to start exploring.

**Would I use this?**: Yes, IF someone told me what to do first. Otherwise I'd fiddle with sliders aimlessly for 30 seconds and leave.

**Biggest Annoyance**: The presets that would help me understand this complex system are BURIED at the bottom, below a wall of parameter sliders I don't understand yet.

---

## 🎯 UX Friction Points

### UX-001: Inverted Learning Curve (Critical)
**Where**: Entire sidebar flow (Data Source → Attractor → Parameters → Visualization → Presets)
**The Problem**: New users see advanced controls FIRST (chaos parameters, particle count, trail length) before they see PRESETS that would teach them what good settings look like. It's like giving someone a professional camera and hiding the "Auto" mode at the bottom.
**Why It Matters**: First-time users have no mental model for what "sigma=10, rho=28" means. They need to see "Lorenz Classic" FIRST, play with it, THEN dive into parameters.
**Suggested Fix**:
1. Move "Famous Bifurcations" (Presets) to the TOP, right after Attractor selection
2. Rename to "Quick Start Presets" or "Example Configurations"
3. Add a "Custom" preset option that reveals the parameter sliders

### UX-002: Parameter Overload Without Context
**Where**: Chaos Parameters section (lines 142-147)
**The Problem**: I see sliders with Greek letters (σ, ρ, β) with NO explanation of what they do. Do higher numbers = more chaos? More beauty? More... what?
**Why It Matters**: Users will randomly fiddle and either get garbage or miss the interesting stuff
**Suggested Fix**:
- Add micro-tooltips: "σ (Prandtl number): Controls spiral tightness"
- Show a "Reset to Default" icon per parameter
- Add a "What do these mean?" expandable explainer

### UX-003: Color Scheme Cognitive Load
**Where**: Color grid with 17 swatches (lines 173-192)
**The Problem**: 17 color options is TOO MANY to evaluate at once. I'm scanning back and forth trying to remember which one I liked. Also, the swatches are tiny visual samples - I can't tell how "Ember" will look on my specific attractor without clicking it.
**Why It Matters**: Choice paralysis. Users waste mental energy on color when they should be exploring data/attractors.
**Suggested Fix**:
- Show 8 "Featured" schemes by default
- Add a "Show More Colors (9 more)" toggle button
- Or: Group into categories (Bright/Dark/Neon/Natural) with 4-5 per category
- Consider live preview: hovering a color briefly flashes it on the visualization

### UX-004: Export Hidden as Secondary Action
**Where**: "Export PNG" button is styled `secondary` (line 286, gray instead of cyan)
**The Problem**: Exporting a beautiful visualization is probably the MAIN user goal after creating something cool. But it's visually de-emphasized below "Random Combination" and "Auto-Animate".
**Why It Matters**: Users who want to share their creation have to hunt for the export button. It should be PRIMARY, not secondary.
**Suggested Fix**:
- Make Export PNG a PRIMARY button (cyan, prominent)
- Move it UP in the button order, right after Play/Pause
- Consider a floating "Share" button near the canvas (top-right corner?) for discoverability

### UX-005: Buried Toggles (Trail Fade, Depth Brightness)
**Where**: Bottom of Visualization section (lines 219-231), AFTER 4 sliders and 17 color swatches
**The Problem**: These are binary quality settings that drastically affect the visual output. They're hidden at the bottom where users have to scroll to find them. "Depth-Based Brightness" sounds important but feels like an afterthought.
**Why It Matters**: Users might never discover these options, missing out on better-looking visualizations
**Suggested Fix**:
- Move toggles to TOP of Visualization section, right after the section title
- Or: Group them into a "Visual Effects" subsection above color scheme

### UX-006: Data Source Disconnect
**Where**: Dataset info box (lines 86-89)
**The Problem**: The description says "Temperature anomalies and CO₂ levels drive the chaos parameters" but I have NO IDEA which parameters are being driven, or by how much. Is σ tied to temperature? Is ρ tied to CO₂? This is a black box.
**Why It Matters**: The whole premise is "real-world data modulates chaos" but the connection feels fake because I can't see it happening
**Suggested Fix**:
- Add LIVE indicators: "σ = 10.2 (↑ Climate anomaly: +1.2°C)"
- Show a small sparkline of the data being used
- Add a "Show Data Mapping" toggle that explains which dataset values map to which parameters

### UX-007: First-Click Confusion
**Where**: Initial page load
**The Problem**: When I first land, I see a beautiful animation already running. Cool. But what should I DO? There's no onboarding, no "Try This" prompt, no suggested first action.
**Why It Matters**: Users bounce when they don't know what to do within 5 seconds
**Suggested Fix**:
- Add a dismissible tooltip on first visit: "👋 New here? Try a preset from the bottom of the sidebar!"
- Or: Auto-open the info modal on first visit
- Or: Add a "Give me a tour" button that cycles through 3 interesting preset combinations with text overlays

### UX-008: Speed Slider Mystery
**Where**: Animation Speed (lines 163-167)
**The Problem**: The slider goes from 0.1× to 5×, but I don't know what NORMAL is. Is 3× fast? Slow? Is 1× "real-time"?
**Why It Matters**: No reference point means users don't know if they're looking at the "correct" speed for the system
**Suggested Fix**:
- Add tick marks at 1× with a label "Normal"
- Or rename to "Animation Speed (1× = Standard)"

---

## 😤 Design Annoyances

### DES-001: Visual Hierarchy Inversion
**Where**: Button styling at bottom of sidebar
**The Problem**: Primary actions (Play/Pause, Auto-Rotate) have CYAN styling, but Export PNG (a key user goal) is GRAY. The visual hierarchy suggests exporting is less important than auto-rotation, which is backwards.
**Fix**: Swap the styling - Export should be cyan/prominent

### DES-002: Color Grid Dominance
**Where**: 4×4 color grid (really 17 items, so 4×5 with one empty slot)
**The Problem**: The color grid takes up MASSIVE vertical space (5 rows × 40px + gaps = ~240px). It dominates the viewport, pushing critical controls below the fold.
**Fix**:
- Collapse to 2 rows by default (8 colors) with "Show 9 more" button
- Or use a horizontal scrolling carousel for mobile

### DES-003: Section Visual Weight
**Where**: Section titles (lines 152-158)
**The Problem**: All section titles look identical (gray, uppercase, 11px). There's no way to visually distinguish "Critical controls I need" from "Nice-to-have tweaks".
**Fix**: Add visual weight to important sections:
- "Data Source" + "Attractor System" = Larger title, cyan accent
- "Chaos Parameters" = Same treatment
- "Visualization" = Slightly smaller
- "Famous Bifurcations" = LARGER if moved to top

### DES-004: Scroll Ambiguity
**Where**: Sidebar scroll behavior
**The Problem**: On desktop, the sidebar scrolls but there's no visual indicator that content continues below. Users might not realize there are buttons at the bottom.
**Fix**:
- Add a fade-out gradient at bottom of visible area when scrolled
- Or: Add a subtle "Scroll for more" hint with down arrow
- Or: Use a sticky button bar at bottom (Play/Pause always visible)

---

## 🏗️ Architecture Concerns

### ARCH-001: Control Order Reflects Code Structure, Not User Flow
**What**: The sidebar order is clearly structured for developer convenience (select data → select system → configure system → visualize → presets), but users don't think linearly like this. They want to explore immediately, THEN customize.
**Why It's Bad**: Forces a waterfall workflow when users want to iterate quickly
**Better Approach**:
- Support both "Quick Start" (preset-first) and "Expert Mode" (parameters-first) paths
- Use tabbed interface or collapsible sections
- Consider a "Simple/Advanced" toggle at the top
**Effort to Fix**: 4-6 hours (restructure HTML, add state management for view modes)

### ARCH-002: Color Scheme as Radiogroup Without Keyboard Shortcuts
**What**: 17 color options navigable by keyboard (good!) but with no quick-switch mechanism. Arrow keys move focus but require Enter to activate. No number keys 1-9 for quick switching.
**Why It's Bad**: Slows down exploration. Users who want to rapidly A/B test colors face friction.
**Better Approach**:
- Add keyboard shortcuts: 1-9 for first 9 schemes, Shift+1-8 for others
- Or: Left/Right arrows cycle through schemes without requiring Enter
- Show keyboard hint: "Keys 1-9 to switch"
**Effort to Fix**: 2 hours

### ARCH-003: No Undo/History
**What**: If I stumble upon a cool configuration by accident (random button + manual tweaks), there's NO WAY to go back after I change something
**Why It's Bad**: Exploration is destructive. Users fear experimenting because they can't backtrack.
**Better Approach**:
- Add "Undo" button (stores last 5 states)
- Or: "Save This Configuration" button that copies settings to clipboard or localStorage
- Or: URL state - all parameters in URL hash for sharing
**Effort to Fix**: 3-4 hours for simple undo, 8+ hours for URL state

### ARCH-004: Preset Selection Doesn't Show Current Match
**What**: If I manually set parameters to match "Lorenz Classic" values, the preset dropdown still says "Select a preset..." It doesn't auto-detect that I'm viewing a famous bifurcation.
**Why It's Bad**: Missed educational opportunity. Users don't learn the mapping between presets and parameter values.
**Better Approach**:
- Auto-highlight preset when parameters match
- Show "You're viewing: Lorenz Classic" banner when matched
- Or: "Save as Custom Preset" option
**Effort to Fix**: 2-3 hours

---

## 💸 Technical Debt Ledger

| ID | Type | Description | Pain Level | Fix Effort |
|----|------|-------------|------------|------------|
| TD-001 | UX Debt | Preset dropdown should be at TOP of sidebar | 🔥🔥🔥 | 30 min |
| TD-002 | Discoverability | No first-time user onboarding/hints | 🔥🔥🔥 | 2 hours |
| TD-003 | Visual Hierarchy | Export PNG is secondary when it's primary user goal | 🔥🔥 | 5 min |
| TD-004 | Cognitive Load | 17 color swatches without grouping/preview | 🔥🔥 | 1-2 hours |
| TD-005 | Missing Context | Parameter tooltips/explanations absent | 🔥🔥🔥 | 1 hour |
| TD-006 | Exploration Friction | No undo/history for accidental discoveries | 🔥🔥 | 3 hours |
| TD-007 | Data Connection | Dataset-to-parameter mapping invisible to user | 🔥🔥🔥 | 4 hours |
| TD-008 | Visual Feedback | No scroll indicators for sidebar content | 🔥 | 30 min |
| TD-009 | Keyboard UX | Color schemes lack quick-switch shortcuts | 🔥 | 2 hours |
| TD-010 | Toggles Placement | Trail Fade/Depth Brightness buried at bottom | 🔥 | 15 min |

**Total Debt Estimate**: ~15 hours to pay down critical UX debt

---

## The Honest Summary

### What's Working
- The visualization itself is GORGEOUS - chaotic attractors are mesmerizing
- Dark theme with cyan accents is visually striking
- Accessibility: Semantic HTML, ARIA labels, keyboard navigation all present (rare!)
- Mobile-responsive sidebar with hamburger menu
- The controls themselves work perfectly (no bugs detected)

### What's Not
- **Discovery problem**: Cool features (presets, export) are HIDDEN
- **Learning curve inversion**: Advanced controls come before simple ones
- **Choice paralysis**: 17 colors + dynamic parameters = overwhelming
- **Black box syndrome**: Dataset → parameter mapping is invisible
- **No safety net**: Can't undo, can't save configurations, can't go back

### If I Had to Fix One Thing
**Move "Famous Bifurcations" presets to the TOP of the sidebar, right after Attractor selection.**

This single change would transform the UX from "intimidating lab equipment" to "interactive art gallery." New users would immediately see:
1. Data Source (what drives the chaos)
2. Attractor System (what shape)
3. **Quick Start Presets** ← "Oh! Let me try Lorenz Classic!"
4. (Collapsed by default) Advanced parameters for tweaking

Then they explore presets, build intuition, and THEN dive into custom parameters. Current flow is backwards.

---

## Priority Actions

1. **Quick Win (30 min)**: Move presets to top + rename to "Quick Start". Instant UX improvement.
2. **Important (2 hours)**: Add first-time user tooltip/tour. Reduces bounce rate.
3. **Important (1 hour)**: Add parameter tooltips (σ = "Controls spiral tightness"). Builds understanding.
4. **Nice-to-have (1 hour)**: Collapse color grid to 8 colors + "Show more". Reduces overwhelm.
5. **When You Have Time (3 hours)**: Add undo/history. Makes exploration feel safe.
6. **When You Have Time (4 hours)**: Show dataset-to-parameter mapping visually. Fulfills core premise.

---

*This critique is meant to make things better, not to discourage.*
*Good products come from honest feedback.*
*The visualization is beautiful - the controls just need to match that elegance.*
