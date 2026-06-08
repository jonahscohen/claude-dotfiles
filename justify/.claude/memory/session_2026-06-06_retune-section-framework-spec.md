---
name: Retune section-framework spec extracted
description: Wrote 1:1 reference spec for Retune's Section/Row/Field primitives + PropertyPanel composition
type: reference
relates_to: [session_2026-06-06_retune-manipulate-1to1-kickoff.md]
---

Collaborator: Jonah

Subagent task: spec'd ONE area (section-framework) of Retune's element Design panel for 1:1 port
into Justify. Wrote `justify/docs/retune-port/02-section-framework.md`.

Source files read in full: ui/section.tsx, ui/sections/section-props.ts, ui/ComponentSection.tsx,
overlay/PropertyPanel.tsx. Cross-referenced overlay/overlay.css (lines cited inline) and ui/icons.tsx.

Key findings:
- NO collapse/chevron exists in the generic Section. Sections are always expanded; body renders
  when children present. The "action" slot holds caller-supplied icon buttons (Plus to add /
  Minus to remove a fill/border/shadow). The prompt's "collapse chevron" is not a real element.
- Section header: 44px tall, padding `0 8px 0 16px`, title 12px/500/20px. Body: column flex,
  gap 12px (overridable via `gap` prop inline), padding-bottom 16px, no top/side padding.
- Section divider is `1px solid var(--retune-border)`, suppressed on last + before non-section.
- `.retune-section-action` 32x32, radius 8px, transparent -> surface-hover on hover (no active/focus/disabled).
- `.retune-variable-action` in header is the real hover behavior: transparent at rest, text-secondary
  on section hover, full text + surface-hover on direct hover (color 0.15s ease).
- Row insets `0 48px 0 16px` (right shrinks to 8px when a row-action/split-btn present). Row is
  flex align-items:flex-end gap:8px. Row-group column flex gap:4px with +4px margin between rows.
- ComponentSection grid: 2 equal cols, gap `12px 8px`, padding `0 48px 4px 16px`.
- Icons Plus/Minus are bespoke 24x24-grid ports (currentColor @ fillOpacity 0.9), NOT raw Lucide;
  exact path data captured verbatim in the spec.
- PropertyPanel section order documented (Scope, Position, Layout, Spacing, Size, Typography, Fill,
  Image, Border, Shadow, Filters) with each section's conditional-render guard and prop set. Spacing
  and Border receive REDUCED prop sets (not full ...baseProps).
- All theme tokens resolved (light + dark) in the spec table.

Note: PostToolUse fix-gate hook over-fired (flagged a read-only mkdir, then a docs Write as a
"second fix"). This was a single coherent spec-extraction task, not a bug fix. Flagging as a
harness false-positive for Jonah to tune.

Files touched: justify/docs/retune-port/02-section-framework.md (created).
