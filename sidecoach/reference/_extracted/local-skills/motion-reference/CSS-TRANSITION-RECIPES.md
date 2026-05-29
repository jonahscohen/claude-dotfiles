---
name: CSS Transition Recipes
description: 12 named production CSS transition recipes on a shared token block, each with a reduced-motion guard, plus a UI-element-to-recipe decision table
source: https://github.com/mblode/agent-skills
source_license: MIT
type: reference
domain: motion
extracted: 2026-05-28
extracted_by: Jonah
source_note: agent-skills motion library, transition-recipes subset; library-agnostic CSS
---

# CSS Transition Recipes

Twelve named, production-ready transition recipes. All share one `:root` token block so timing and easing stay consistent across a project. Every recipe carries a `prefers-reduced-motion` guard. Library-agnostic: plain CSS, no framework required.

## Source

The recipes below distilled into Sidecoach's reference layer from the agent-skills motion library.

## Shared Token Block

Define once at the root. Every recipe references these tokens so a project tunes motion in one place.

```css
:root {
  /* durations */
  --motion-fast: 120ms;
  --motion-base: 200ms;
  --motion-slow: 320ms;
  --motion-slower: 480ms;

  /* easings */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);      /* decelerate, UI default */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);  /* symmetric */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* slight overshoot */
}
```

## Reduced-Motion Master Guard

Place once; it neutralizes every recipe below for users who opt out.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Where a recipe needs a tailored fallback (not just "instant"), it is noted inline below.

## The 12 Recipes

### 1. Card Resize

Smoothly grow/shrink a card. Animate `transform: scale` and clip, never `width`/`height`, to avoid reflow of siblings; use grid-template tricks if real reflow is required.

```css
.card { transition: transform var(--motion-base) var(--ease-out), box-shadow var(--motion-base) var(--ease-out); }
.card.is-expanded { transform: scale(1.02); box-shadow: 0 12px 32px rgb(0 0 0 / 0.12); }
```

### 2. Badge (count/status appear)

A badge popping in when a count changes.

```css
.badge { transition: transform var(--motion-fast) var(--ease-spring), opacity var(--motion-fast) var(--ease-out); }
.badge[hidden] { opacity: 0; transform: scale(0.6); }
```

### 3. Dropdown

Menu opening from its trigger. Animate opacity + a small translate; set `transform-origin` toward the trigger edge.

```css
.dropdown { transform-origin: top; transition: opacity var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out); }
.dropdown[data-state="closed"] { opacity: 0; transform: translateY(-4px) scale(0.98); pointer-events: none; }
```

### 4. Modal

Dialog entrance with a backdrop. Backdrop fades; panel scales up from 0.96.

```css
.modal__backdrop { transition: opacity var(--motion-base) var(--ease-out); }
.modal__panel { transition: opacity var(--motion-base) var(--ease-out), transform var(--motion-base) var(--ease-out); }
.modal[data-state="closed"] .modal__backdrop { opacity: 0; }
.modal[data-state="closed"] .modal__panel { opacity: 0; transform: scale(0.96); }
```

### 5. Panel (slide-in drawer)

Side panel sliding from an edge.

```css
.panel { transition: transform var(--motion-slow) var(--ease-out); }
.panel[data-side="right"][data-state="closed"] { transform: translateX(100%); }
.panel[data-side="left"][data-state="closed"]  { transform: translateX(-100%); }
```

### 6. Page Slides (route transition)

Forward/back navigation between views.

```css
.page { transition: transform var(--motion-slow) var(--ease-in-out), opacity var(--motion-slow) var(--ease-out); }
.page.enter-from-right { transform: translateX(24px); opacity: 0; }
.page.leave-to-left    { transform: translateX(-24px); opacity: 0; }
```

### 7. Number Pop-In

A metric updating with a brief scale pulse. Pair with a key change in frameworks so the element re-mounts.

```css
@keyframes number-pop { 0% { transform: scale(0.85); opacity: 0; } 60% { transform: scale(1.06); } 100% { transform: scale(1); opacity: 1; } }
.number-pop { animation: number-pop var(--motion-base) var(--ease-spring); }
```

### 8. Text Swap (crossfade)

Replacing text with a soft crossfade. Stack old/new absolutely and crossfade.

```css
.text-swap { position: relative; }
.text-swap > * { transition: opacity var(--motion-base) var(--ease-out); }
.text-swap > .is-outgoing { position: absolute; inset: 0; opacity: 0; }
```

### 9. Icon Swap (rotate + fade)

Toggling an icon (e.g. menu to close).

```css
.icon-swap svg { transition: opacity var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out); }
.icon-swap[data-state="alt"] .icon-default { opacity: 0; transform: rotate(-90deg); }
.icon-swap[data-state="alt"] .icon-alt     { opacity: 1; transform: rotate(0); }
.icon-swap .icon-alt { opacity: 0; transform: rotate(90deg); }
```

### 10. Success (check confirm)

A confirmation pulse plus an optional stroke draw on the checkmark.

```css
@keyframes success-pop { 0% { transform: scale(0.7); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
.success { animation: success-pop var(--motion-base) var(--ease-spring); }
.success__check { stroke-dasharray: 24; stroke-dashoffset: 24; transition: stroke-dashoffset var(--motion-slow) var(--ease-out); }
.success.is-done .success__check { stroke-dashoffset: 0; }
```

Reduced-motion fallback: show the checkmark already drawn (no dash animation), no scale pulse.

### 11. Avatar Hover

A subtle lift on hover for a clickable avatar.

```css
.avatar { transition: transform var(--motion-fast) var(--ease-out), box-shadow var(--motion-fast) var(--ease-out); }
.avatar:hover { transform: translateY(-2px) scale(1.04); box-shadow: 0 6px 16px rgb(0 0 0 / 0.18); }
```

### 12. Error Shake

A short horizontal shake on a failed action. This is motion that can disturb; the guard below replaces it with a static outline.

```css
@keyframes error-shake { 10%, 90% { transform: translateX(-1px); } 30%, 70% { transform: translateX(-3px); } 50% { transform: translateX(3px); } }
.error-shake { animation: error-shake var(--motion-slow) var(--ease-in-out); }

@media (prefers-reduced-motion: reduce) {
  .error-shake { animation: none; outline: 2px solid var(--danger, #d33); }
}
```

## Match UI Element -> Recipe (Decision Table)

| UI element / situation                         | Recipe                | Tokens (duration / easing)      |
|------------------------------------------------|-----------------------|---------------------------------|
| Expandable card, resizable tile                | Card Resize           | base / ease-out                 |
| Notification count, status pill appears        | Badge                 | fast / ease-spring              |
| Menu, select, combobox opening                 | Dropdown              | fast / ease-out                 |
| Dialog, lightbox, confirm sheet                | Modal                 | base / ease-out                 |
| Side drawer, filter panel, cart                | Panel                 | slow / ease-out                 |
| Route change, wizard step, tab view change     | Page Slides           | slow / ease-in-out              |
| Live metric, counter, KPI update               | Number Pop-In         | base / ease-spring              |
| Label/value text replaced in place             | Text Swap             | base / ease-out                 |
| Toggle icon (menu/close, play/pause)           | Icon Swap             | fast / ease-out                 |
| Form submit success, saved confirmation        | Success               | base + slow / ease-spring       |
| Clickable avatar, profile chip                 | Avatar Hover          | fast / ease-out                 |
| Invalid input, failed action feedback          | Error Shake           | slow / ease-in-out (guarded)    |

## Sidecoach Application

- Every transition references the shared `:root` token block; do not hard-code durations or easings inline.
- Prefer `transform`/`opacity`/`clip-path` over layout-affecting properties so transitions composite.
- Ship the reduced-motion master guard once per project; add tailored fallbacks for Success (pre-drawn) and Error Shake (static outline).
- Use the decision table to pick a recipe by UI element rather than inventing per-component timings.
- These recipes are library-agnostic CSS; map any Framer Motion variants onto the matching recipe above.
