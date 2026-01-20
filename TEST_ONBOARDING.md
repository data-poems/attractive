# Testing the Onboarding System

## Quick Test Instructions

### 1. Clear localStorage (First-time user simulation)
Open browser console on https://dr.eamer.dev/datavis/attractive/ and run:
```javascript
localStorage.removeItem('attractorPlaygroundOnboardingCompleted');
location.reload();
```

### 2. What You Should See

**Step 1 - Quick Start Section (appears after 500ms)**
- Quick Start section has pulsing cyan glow
- Tooltip appears to the right with:
  - "Welcome to Attractor Playground!"
  - "Start here! Click Random to explore..."
  - Progress: ● ○ ○ (first dot cyan/glowing, others gray)
  - Buttons: "Skip Tour" | "Next"

**Step 2 - Color Scheme (after clicking Next)**
- Quick Start glow disappears
- Color grid gets pulsing cyan glow
- Tooltip shows:
  - "Choose Your Colors"
  - "Pick your favorite color scheme..."
  - Progress: ◉ ● ○ (first magenta/completed, second cyan, third gray)
  - Buttons: "Skip Tour" | "Next"

**Step 3 - Presets Dropdown (after clicking Next)**
- Color grid glow disappears
- Preset dropdown gets pulsing cyan glow
- Tooltip shows:
  - "Famous Configurations"
  - "Try famous mathematical presets..."
  - Progress: ◉ ◉ ● (first two magenta, third cyan)
  - Buttons: "Skip Tour" | "Got it!"

**Completion (after clicking "Got it!" or "Skip Tour")**
- Tooltip fades out
- Glow disappears
- localStorage set to 'true'
- Onboarding won't show again

### 3. Visual Verification Checklist

- [ ] Tooltip appears with 2px cyan border
- [ ] Background is gradient (#1a1a1a to #0f0f0f)
- [ ] Target elements have pulsing glow animation
- [ ] Progress dots update correctly
- [ ] Buttons are styled consistently with app
- [ ] Tooltip doesn't go off-screen
- [ ] Mobile: tooltip centers horizontally
- [ ] Animation is smooth (300ms transitions)
- [ ] localStorage prevents re-showing

### 4. Browser Testing

Test in:
- [ ] Chrome/Edge (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Chrome/Safari (mobile)

### 5. Interaction Testing

- [ ] Click "Next" advances to next step
- [ ] Click "Skip Tour" dismisses immediately
- [ ] Click "Got it!" completes tour
- [ ] localStorage persists after refresh
- [ ] No errors in console
- [ ] Tooltip positions correctly if sidebar collapsed

### 6. Manual localStorage Testing

```javascript
// Check if onboarding completed
localStorage.getItem('attractorPlaygroundOnboardingCompleted')
// Returns: "true" if completed, null if not

// Force show again
localStorage.removeItem('attractorPlaygroundOnboardingCompleted')
location.reload()

// Complete programmatically
completeOnboarding()

// Show specific step
showOnboardingStep(0)  // Quick Start
showOnboardingStep(1)  // Color Scheme
showOnboardingStep(2)  // Presets
```

## Expected Behavior Summary

| Action | Result |
|--------|--------|
| First visit | Onboarding shows after 500ms |
| Click "Next" (step 1) | Advances to step 2 |
| Click "Next" (step 2) | Advances to step 3 |
| Click "Got it!" (step 3) | Completes, sets localStorage |
| Click "Skip Tour" (any step) | Completes immediately |
| Subsequent visits | No onboarding shown |
| Clear localStorage | Onboarding shows again |

## Troubleshooting

### Tooltip doesn't appear
1. Check console for errors
2. Verify onboarding.js is loaded: `typeof checkOnboarding`
3. Check localStorage: `localStorage.getItem('attractorPlaygroundOnboardingCompleted')`
4. Clear localStorage and refresh

### Tooltip positioned incorrectly
- Check viewport size
- Verify target element exists: `document.querySelector('.quick-start')`
- Test with sidebar open/closed

### Styles not applied
- Verify style.css loaded
- Check for CSS conflicts
- Inspect element: should have `.onboarding-tooltip.active`

### localStorage not persisting
- Check browser privacy mode (incognito/private)
- Verify localStorage is enabled
- Check domain/protocol matches

## Success Criteria

✅ All first-time users see helpful tooltips
✅ Tooltips guide to key features (Random, Colors, Presets)
✅ Tour can be skipped at any time
✅ Tooltips never show again after completion
✅ No external dependencies required
✅ Mobile-responsive positioning
✅ Smooth animations and transitions
✅ Accessible button controls
✅ Zero console errors
