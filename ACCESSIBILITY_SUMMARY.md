# Accessibility Summary: Selector Redesign

**Quick Reference for /home/coolhand/html/datavis/attractive/**

---

## Current Status

✅ **Good Foundation**: Radiogroup pattern, ARIA labels, arrow key navigation
⚠️ **Needs Improvement**: Touch targets, live regions, text labels

---

## Immediate Action Items (60 minutes total)

### 1. Increase Touch Targets (10 minutes)

**File**: `style.css`

```css
/* Line ~511 - Update .color-option */
.color-option {
  height: 48px; /* was 40px */
  min-width: 48px;
}

/* Line ~254 - Update .mood-btn */
.mood-btn {
  min-width: 48px; /* was 44px */
}

/* Add mobile increases */
@media (max-width: 768px) {
  .color-option { min-height: 56px; }
}

@media (max-width: 480px) {
  .color-option { min-height: 64px; }
}
```

### 2. Add Live Region Announcements (20 minutes)

**File**: `index.html`

Add after line 162 (after `.color-grid`):
```html
<!-- Selection announcement -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only" id="colorChangeAnnouncement"></div>
```

Add after line 118 (after `.mood-filter`):
```html
<!-- Filter announcement -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only" id="filterAnnouncement"></div>
```

Add screen-reader-only utility class in `style.css`:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**File**: `main.js`

Add at top of file:
```javascript
const colorAnnouncement = document.getElementById('colorChangeAnnouncement');
const filterAnnouncement = document.getElementById('filterAnnouncement');
```

In color selection logic (~line 1740), add:
```javascript
function selectColorScheme(schemeName) {
  // ... existing selection logic ...

  // Announce change
  const schemeLabel = document.querySelector(`[data-scheme="${schemeName}"]`).getAttribute('aria-label');
  colorAnnouncement.textContent = `Color scheme changed to ${schemeLabel}`;
}
```

In mood filter click handler (~line 158), add:
```javascript
moodButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // ... existing filter logic ...

    // Count visible options
    const visibleCount = document.querySelectorAll('.color-option:not(.hidden)').length;
    const moodLabel = btn.textContent.trim();
    filterAnnouncement.textContent = `Showing ${visibleCount} ${moodLabel} color schemes`;
  });
});
```

### 3. Add Text Labels on Hover (30 minutes)

**File**: `index.html`

Wrap each color option with text label (example for line 124):
```html
<button type="button" class="color-option active" data-scheme="bioluminescent" ...>
  <span class="color-option-label">Bioluminescent</span>
</button>
```

Repeat for all 16 color options (lines 124-160).

**File**: `style.css`

Add after `.color-option` styles (~line 540):
```css
.color-option-label {
  position: absolute;
  bottom: 4px;
  left: 4px;
  right: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  text-align: center;
  line-height: 1.2;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.color-option:hover .color-option-label,
.color-option:focus-visible .color-option-label {
  opacity: 1;
}
```

---

## Testing After Changes

### Keyboard Test (2 minutes)
1. Tab to color selector
2. Use arrow keys to navigate options
3. **Verify**: Focus indicator visible on all options
4. **Verify**: Only one color option is tabbable at a time

### Screen Reader Test (5 minutes)
1. Enable NVDA (Windows) or VoiceOver (Mac)
2. Navigate to color selector
3. Select a color option
4. **Verify**: Hears "Color scheme changed to [name]"
5. Click a mood filter button
6. **Verify**: Hears "Showing X [mood] color schemes"

### Color-Blind Test (2 minutes)
1. Hover over any color swatch
2. **Verify**: Text label appears (e.g., "Bioluminescent")
3. Enable Windows High Contrast Mode
4. **Verify**: Text labels still visible

### Touch Test (2 minutes)
1. Open on mobile device
2. Tap color swatches
3. **Verify**: No accidental double-taps
4. **Verify**: Easy to hit intended target

---

## Full Documentation

**Comprehensive Guide**: `/home/coolhand/geepers/reports/by-date/2026-01-20/a11y-attractive-selector-redesign.md`

Includes:
- 4 alternative selector patterns (dropdown, scroll, carousel, grid)
- Complete ARIA requirements for each
- Full keyboard interaction models
- Copy-paste code examples
- Testing checklists

**HTML Report**: `/home/coolhand/docs/geepers/a11y-attractive-selector-redesign.html`
(Accessible, self-documenting HTML version)

**Project Recommendations**: `/home/coolhand/geepers/recommendations/by-project/attractive.md`

---

## Pattern Comparison

| Pattern | Best For | Complexity | WCAG Compliance |
|---------|----------|------------|-----------------|
| **Grid (current)** | Desktop, all visible | ⭐⭐ Low | ✅ With fixes above |
| **Dropdown** | Mobile, 20+ options | ⭐ Lowest | ✅ Native support |
| **Horizontal scroll** | Tablet, visual browsing | ⭐⭐⭐ Medium | ✅ With custom JS |
| **Carousel** | Feature highlights | ⭐⭐⭐⭐⭐ High | ✅ With custom JS |

**Recommendation**: Keep grid for desktop, add dropdown fallback for mobile (<768px).

---

## Questions?

See full report or contact Accessibility Guardian via geepers system.
