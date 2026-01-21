# Visual Selector Mockup — Compact Combined Design

## Before (Current)

```
┌───────────────────────────────────────┐
│ STYLE                                 │
├───────────────────────────────────────┤
│ Color Scheme                          │
│                                       │
│ [All] [🌈] [🔥] [❄️] [⚪] [🌑]        │ Mood filter: 36px
│                                       │
│ ┌─ Vibrant ─────────────────────┐    │
│ │ [■] [■] [■] [■]               │    │
│ └───────────────────────────────┘    │
│ ┌─ Warm ────────────────────────┐    │
│ │ [■] [■] [■] [■] [■]           │    │ Color grid: ~250px
│ └───────────────────────────────┘    │
│ ┌─ Cool ────────────────────────┐    │
│ │ [■] [■] [■] [■]               │    │
│ └───────────────────────────────┘    │
│ ┌─ Neutral ─────────────────────┐    │
│ │ [■] [■]                       │    │
│ └───────────────────────────────┘    │
│ ┌─ Dark ────────────────────────┐    │
│ │ [■] [■]                       │    │
│ └───────────────────────────────┘    │
│                                       │
│ Visual Style                          │
│                                       │
│ [All] [Modern] [Artistic] [Tech]     │ Style filter: 36px
│                                       │
│ [Clean]    [Pencil]  [Blueprint]     │
│ [Neon]     [Chalk]   [Technical]     │ Style grid: ~110px
│ [Watercolor]                          │
│                                       │
│ [Clean — Crisp lines with glow]      │ Info panel: 40px
└───────────────────────────────────────┘

Total: ~470px vertical space
```

## After (Recommended)

```
┌───────────────────────────────────────┐
│ STYLE                                 │
├───────────────────────────────────────┤
│ Color Palette                         │
│                                       │
│ ◀ [🦠] [🔥] [🌊] [⚪] [🌑] [🌃] ▶     │ Horizontal strip: 72px
│   Bio  Fire Ocean Mono Matrix Cyber  │ (scroll for more)
│   ●●●                                 │ Scroll indicators
│                                       │
│ Visual Style                          │
│                                       │
│ ┌──────┐ ┌──────┐ ┌──────┐          │
│ │      │ │      │ │      │          │
│ │Clean │ │Pencil│ │Print │          │
│ └──────┘ └──────┘ └──────┘          │
│ ┌──────┐ ┌──────┐ ┌──────┐          │
│ │      │ │      │ │      │          │ 3-col grid: ~200px
│ │ Neon │ │Chalk │ │ Tech │          │ (60px height)
│ └──────┘ └──────┘ └──────┘          │
│ ┌──────┐                              │
│ │Water │                              │
│ └──────┘                              │
└───────────────────────────────────────┘

Total: ~272px vertical space (42% reduction)
```

## Detailed Color Strip

```
Horizontal scrolling container:
┌────────────────────────────────────────────────────────┐
│ ◀ [72px × 56px color buttons with fade edges]        ▶│
└────────────────────────────────────────────────────────┘

Each color button:
┌─────────┐
│   🦠    │  ← Icon/emoji (20px)
│ ▓▓▓▓▓▓▓ │  ← Gradient background
│   BIO   │  ← Name (9px uppercase)
└─────────┘
72px × 56px

Selected state:
┌─────────┐
│░░░░░░░░░│  ← White 3px border
│░░ 🦠 ░░░│     + outer glow
│░░▓▓▓▓▓░░│
│░░ BIO ░░│
│░░░░░░░░░│
└─────────┘

Scroll indicator dots below:
●●○○○  (shows position in list)
```

## Detailed Style Grid (3 columns)

```
Each style card:
┌─────────┐
│  ╱╲╱    │  ← Actual preview
│ ╱  ╲    │     (mini rendering)
│╱    ╲   │
│  CLEAN  │  ← Label (hover)
└─────────┘
~100px × 60px

Selected state:
┌─────────┐
│░  ╱╲╱ ✓│  ← White border
│░ ╱  ╲ ░│     + checkmark
│░╱    ╲░│
│░ CLEAN░│
└─────────┘
```

## Mobile Adaptation

```
Portrait phone (375px wide):
┌─────────────────────┐
│ COLOR PALETTE       │
│                     │
│ ◀ [🦠] [🔥] [🌊] ▶ │ ← Swipe to scroll
│   ●●○○○            │
│                     │
│ VISUAL STYLE        │
│                     │
│ ┌────┐ ┌────┐     │
│ │    │ │    │     │ ← 2 columns
│ │Cln │ │Pen │     │   on small
│ └────┘ └────┘     │   screens
│ ┌────┐ ┌────┐     │
│ │Neon│ │Chk │     │
│ └────┘ └────┘     │
└─────────────────────┘
```

## Interaction States

### Color Strip

**Default**:
- Fade left/right edges (indicates scrollable)
- Snap to items on scroll
- Smooth scrolling with momentum

**Hover** (desktop):
```
┌─────────┐
│   🦠    │  ← Scale 1.05
│ ▓▓▓▓▓▓▓ │  ← Brighten 10%
│   BIO   │
└─────────┘
```

**Focus** (keyboard):
```
┌─────────┐
│▓▓▓▓▓▓▓▓▓│  ← Cyan outline
│▓  🦠  ▓│     2px offset
│▓▓▓▓▓▓▓▓▓│
│▓  BIO ▓│
└─────────┘
```

### Style Cards

**Default**:
```
┌─────────┐
│  ╱╲╱    │  ← Subtle border
│ ╱  ╲    │  ← No label
│╱    ╲   │
│         │
└─────────┘
```

**Hover**:
```
┌─────────┐
│  ╱╲╱    │  ← Lift 2px
│ ╱  ╲    │  ← Shadow
│╱    ╲   │  ← Label fades in
│  CLEAN  │
└─────────┘
```

**Active**:
```
┌─────────┐
│░  ╱╲╱ ✓│  ← White border
│░ ╱  ╲ ░│  ← Glow
│░╱    ╲░│  ← Always show label
│░ CLEAN░│
└─────────┘
```

## CSS Snippet Preview

```css
/* Color strip */
.color-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 8px 4px;
  position: relative;

  /* Fade edges */
  mask-image: linear-gradient(
    to right,
    transparent,
    black 32px,
    black calc(100% - 32px),
    transparent
  );
}

.color-option {
  flex-shrink: 0;
  width: 72px;
  height: 56px;
  border-radius: 8px;
  scroll-snap-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.color-option.active {
  border-color: #fff;
  box-shadow:
    0 0 0 4px rgba(255,255,255,0.15),
    0 4px 16px rgba(0,0,0,0.3);
}

/* Style grid */
.style-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.style-card {
  height: 60px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.style-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.style-card.active {
  border-color: #fff;
  box-shadow: 0 0 0 4px rgba(255,255,255,0.1);
}

.style-card.active::after {
  content: '✓';
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  background: #fff;
  color: var(--gray-900);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
```

## Accessibility Features

### Color Strip
- ✅ Keyboard navigation (left/right arrows)
- ✅ Screen reader: "Bioluminescent color scheme, button, 1 of 18"
- ✅ Focus visible: Cyan outline
- ✅ ARIA: `role="radiogroup"`, `aria-checked`

### Style Grid
- ✅ Keyboard navigation (arrow keys in grid)
- ✅ Screen reader: "Clean style, button, shows crisp lines with subtle glow"
- ✅ Focus visible: Magenta outline
- ✅ ARIA: `role="radiogroup"`, `aria-checked`

### Touch Targets
- ✅ 72×56px (color) = 4,032px² (exceeds 44×44 = 1,936px²)
- ✅ 100×60px (style) = 6,000px² (exceeds minimum)

## Implementation Notes

1. **No category filters needed** - scroll shows all colors naturally
2. **Remove mood buttons** - unnecessary with horizontal layout
3. **Remove style category filter** - only 7 items, shows all at once
4. **Add scroll indicators** - 5 dots showing position in color list
5. **Preserve keyboard nav** - arrow keys work with scroll position
6. **Add icons to colors** - visual differentiation without reading text
7. **Generate mini previews** - each style card renders actual example

## Space Breakdown

| Element | Current | Proposed | Savings |
|---------|---------|----------|---------|
| Color mood filter | 36px | 0px | 36px |
| Color grid | 250px | 72px | 178px |
| Style filter | 36px | 0px | 36px |
| Style grid | 110px | 200px | -90px |
| Style info | 40px | 0px | 40px |
| **TOTAL** | **472px** | **272px** | **200px (42%)** |

## Next Steps

1. Create prototype HTML/CSS
2. Test scroll behavior on mobile
3. Generate style preview renderings
4. Add scroll position indicators
5. Test keyboard navigation
6. Deploy and gather feedback

