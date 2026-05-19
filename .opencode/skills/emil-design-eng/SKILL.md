---
name: emil-design-eng
description: Emil Kowalski's philosophy on UI polish, component design, animation decisions, and the invisible details that make software feel great. Use when building or reviewing UI components, animations, gestures, or micro-interactions.
---

# Design Engineering — Emil Kowalski

## Core Philosophy

### Taste is trained, not innate
Study why the best interfaces feel the way they do. Reverse engineer animations. Inspect interactions.

### Unseen details compound
When a feature functions exactly as someone assumes it should, they proceed without thinking. That is the goal.

### Beauty is leverage
People select tools based on overall experience, not just functionality.

## Animation Decision Framework

**1. Should this animate?** 100+/day = no animation. Tens/day = reduce. Occasional = standard. Rare = delight.

**2. What purpose?** Spatial consistency, state indication, explanation, feedback, preventing jarring changes.

**3. What easing?** Entering → ease-out. Moving/morphing → ease-in-out. Hover/color → ease. Constant → linear.

Custom curves (much stronger than built-in):
```
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Never use `ease-in` for UI — starts slow, feels sluggish.

**4. How fast?** Button press 100-160ms. Tooltips 125-200ms. Dropdowns 150-250ms. Modals/drawers 200-500ms. UI under 300ms.

## Component Rules

- Buttons: `scale(0.97)` on `:active`, 160ms ease-out transition
- Never `scale(0)` — start from `scale(0.95)` + `opacity: 0`
- Popovers: origin-aware via `var(--radix-popover-content-transform-origin)`. Modals: keep center.
- Tooltips: skip delay + animation on subsequent hovers
- Use CSS transitions (interruptible) over keyframes for dynamic UI
- Use blur to mask imperfect crossfade transitions
- Exit faster than enter (enter 250ms, exit 150ms)
- Stagger: 30-80ms between items, never block interaction
- Respect `prefers-reduced-motion`: keep opacity, remove movement

## CSS Transform

- `translateY(100%)` = own height (adapts to content)
- `scale()` scales children too
- 3D transforms with `transform-style: preserve-3d`
- `clip-path: inset(...)` for reveals, hold-to-delete, tab transitions, image overlays

## Gesture & Drag

- Velocity-based dismissal (threshold ~0.11)
- Damping at boundaries
- Pointer capture on drag start
- Multi-touch protection
- Friction instead of hard stops

## Performance

- Only animate `transform` and `opacity` (GPU)
- CSS variables on parent = recalc all children
- Framer Motion `x`/`y` shorthand = NOT hardware accelerated. Use full `transform` string.
- CSS animations beat JS under load (off main thread)
- WAAPI for programmatic CSS animations

## Debugging

- Slow motion: 2-5x duration
- Frame-by-frame in DevTools Animations panel
- Test touch on real devices
- Review work next day with fresh eyes

## Review Checklist

| Issue | Fix |
|---|---|
| `transition: all` | Specify exact properties |
| `scale(0)` entry | Start from `scale(0.95)` + `opacity: 0` |
| `ease-in` on UI | Switch to `ease-out` or custom curve |
| Wrong `transform-origin` on popover | Use Radix CSS variable (modals stay centered) |
| Animation on keyboard action | Remove entirely |
| Duration > 300ms on UI | Reduce to 150-250ms |
| Hover without `@media (hover: hover)` | Gate behind pointer:fine query |
| Keyframes on rapidly-triggered elements | Use CSS transitions |
| Same enter/exit speed | Make exit faster |
| No stagger on multi-element entry | Add 30-80ms delay |
