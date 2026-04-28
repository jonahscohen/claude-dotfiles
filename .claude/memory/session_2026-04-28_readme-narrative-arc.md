---
name: README narrative-arc reorganization (Land / Orient / Believe / Practice / Reference)
description: Restructured the README into a five-act arc so the document has a plotline rather than reading like a brain-dump. Top-level acts are flat (no collapsibles); only Reference uses <details>. Bridge sentences between acts. Why-we-built-this moved to the bottom of Reference because the pitchy version of the story already lives in Orient and Believe; the long version is "scroll if you care" material.
type: project
---

Collaborator: Jonah Cohen

# What changed

## The arc

The README now runs in five named acts:

1. **Land** (existing Quick start). One curl, one verb. Reader has the thing installed.
2. **Orient** (new grouping). What this is, what it does, what's in the box, what's NOT here. Reader leaves knowing what they have.
3. **Believe** (new grouping). The 5-sentence opinion + brief teaser of each of the 5 disciplines (memory, design stack, verification protocol, hooks, permission posture), each linking to its detailed chapter. Reader leaves understanding why the dotfiles are shaped this way.
4. **Practice** (new grouping). Day-to-day workflows + For Yes& teams + Boost-existing. Reader leaves ready to use the thing.
5. **Reference** (existing collapsibles, reorganized). Components-detail / Brain-walkthrough / Design-stack-detail / Memory-detail / Plugins-vs-connectors / Customization / Architecture / Troubleshooting / Contributing / Why-we-built-this (long version).

## Bridge sentences between acts

Each act opens with a one-sentence bridge so the reader knows where they are in the story:

- After Quick start (Land): no bridge needed; one-line "That's the whole quick start. Read on for what you got and why."
- Orient: "You've got it installed. Here's what you actually have."
- Believe: "You've seen what's in the box. Here's why each piece is shaped the way it is."
- Practice: "Enough theory. Here's what you do with it."
- Reference: "The dense lookup material, in collapsible chapters. You won't read this end to end - you'll grep it when something breaks or you're extending."

## Major moves

- "How memory works (in 30 seconds)" lifted out of Orient into Believe as one of the disciplines, retitled "Memory: Claude as a colleague who remembers."
- "The three-layer design stack" stayed in Orient as a one-liner inside the 5-things bullets, and got a fuller teaser paragraph in Believe.
- Verification Protocol got a teaser paragraph in Believe (was previously buried in the deep-dive only).
- Hooks got a teaser paragraph in Believe (also previously buried).
- Permission Posture got a teaser paragraph in Believe (was an explanation in CLAUDE.md but no surfacing in README).
- "The opinion (the long version of why this exists)" moved from deep-dive #1 to the LAST collapsible in Reference, retitled "Why we built this (the long version)." Counterintuitive placement, but the pitchy version already lives in Believe; the long version is genuinely scroll-if-you-care material.
- The "Components" full table moved from deep-dive #2 to the FIRST collapsible in Reference. The compact version (3 columns: Component / One-line / Touches) stays in Orient as the at-a-glance.
- The deep-dive numbering ("1. The opinion", "2. The components", etc.) was removed from collapsible summaries because the order now follows the act-5 logic, not the original spec-bullet order.

## Anchors preserved

All existing anchor IDs kept (#deep-components, #deep-brain, #deep-design-stack, #deep-memory, #deep-plugins, #deep-customization, #deep-architecture, #troubleshooting, #deep-contributing, #deep-opinion) so any external inbound links still resolve. Three new anchors added: #orient, #believe, #practice. The top nav row updated to point at the five acts.

## Tone

Existing voice preserved (Yes&-coded couplet rhythm, action verbs, "We start with yes, and build what's next." opener, footer close). The new bridge sentences match that register. No marketing-y on-the-nose lines added (per earlier user feedback about "the shortcut is the &").

# Why

User flagged that the README was comprehensive but plot-less - "it feels all over the place and the robust nature of the documentation accentuates the lack of order/logical progression." The five-act arc gives the document a throughline (install → orient → understand → use → reference) without sacrificing the comprehensive depth.

Acts 1-4 are flat (no collapsibles) because they're meant to be read in sequence. Act 5 is collapsibles because that's where the dense lookup material lives - readers grep it, they don't read it.

# Files touched

- `README.md` (rewritten with new arc; same content, restructured)
- `.claude/memory/session_2026-04-28_readme-narrative-arc.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)
