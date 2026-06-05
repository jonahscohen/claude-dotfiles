---
name: sidecoach intent tier + cooldown + tilt-lab as sidecoach dependent
description: Jonah (2026-06-05) wanted sidecoach ingrained into Claude's default thinking for front-end work, and tilt-lab made a dependent of sidecoach. Built a third detection tier in sidecoach-keyword.sh - on NATURAL front-end/design intent (no explicit verb) it injects a light ADVISORY self-question ("would sidecoach help?"), gated by a trivial-tweak exemption + a cooldown so it never nags on small edits or mid-build. Lexicon lives in new tunable sidecoach-intent.json. Plus CLAUDE.md evaluation-gate + tilt-lab dependency wiring (pending in this same task).
type: project
relates_to: [session_2026-06-04_tilt-lab-embed-export.md, decision_hook_layer_as_enforcement.md]
---

Collaborator: Jonah. 2026-06-05.

## Goal (Jonah's ask, calibration = "Advisory + cooldown")
Make sidecoach part of the DEFAULT evaluation for front-end/design tasks - Claude should self-question "would sidecoach help here?" on natural requests, not just explicit verbs - WITHOUT bogging things down. And make tilt-lab a dependent capability sidecoach reaches for (shader/effect backgrounds). He explicitly asked which language triggers should be "failproof / common sense."

## The bog-down analysis (why advisory + cooldown, not a mandate)
Latency is negligible (the hook already runs one Python pass per prompt). The real risk is NOISE / over-routing trivial work + banner-blindness - a failure mode this repo has already hit (multiple-choice-enforce over-fires on binaries). So: tier the detection, make it a self-question not a route, exempt trivial tweaks, and cooldown so an active build is not re-nagged. The naive "remind on every front-end prompt" WOULD bog down; this design does not.

## What shipped - tier 3 in sidecoach-keyword.sh (UserPromptSubmit)
Existing tiers unchanged: explicit MODE match -> hard route (chain); explicit VERB match -> hard route. NEW third tier runs ONLY when neither matched:
- Loads new claude/hooks/sidecoach-intent.json (lexicon + config).
- FIRE rule: (a build/design ACTION co-occurs with a SUBSTANTIVE target) OR (a STANDALONE design signal). Substantive targets exclude minor ones (button/icon/color/font/label) so "make the button blue" does NOT fire; "build a pricing page" does.
- EXEMPT rule: a trivial-modify framing (tweak/adjust/fix the padding/change the color/...) with no NEW_BUILD word and no STANDALONE signal stays silent.
- Informational suppression reused from the verb tier (is_informational): "what is a design system" does not fire.
- On fire: injects an ADVISORY additionalContext self-question (NOT a route), which also names tilt-lab as the shader-background capability.
- COOLDOWN: any sidecoach engagement (verb route, mode route, OR intent nudge) touches ~/.claude/.sidecoach-intent-cooldown; intent nudges are suppressed while it is younger than config.cooldown_seconds (default 1800s). Explicit verb/mode routes are NEVER cooldown-suppressed. Env overrides: SIDECOACH_INTENT_COOLDOWN (secs), SIDECOACH_INTENT_COOLDOWN_FILE (path, used by tests).

## Trigger lexicon (sidecoach-intent.json - the "failproof" set, fully tunable)
- actions: build, create, design, redesign, restyle, revamp, rework, lay out, mock up, wireframe, prototype, scaffold, implement, style, theme, make
- substantive_targets: page/landing page/hero/section/nav/header/footer/sidebar/layout/dashboard/form/modal/drawer/component/ui/interface/front-end/website/site/screen/view/design system/style guide/component library/pricing page/gallery/carousel/table/grid/banner (NOT button/icon/color/font - those are minor, never fire alone)
- standalone: front-end, ui/ux, design system, responsive, typography, color palette, dark mode, animation/transition/hover/micro-interaction, accessibility/a11y/wcag, redesign, and aesthetic complaints (looks off/dated/generic/cheap, feels clunky, make it look/feel/pop, more modern/cleaner/prettier)
- new_build (overrides exemption): build/create/design/redesign/from scratch/lay out/mock up/wireframe/prototype/scaffold/net-new/brand new
- exempt (trivial): tweak/adjust/nudge/bump/tidy/shift/rename/fix the (padding|margin|spacing|color|typo|...)/change the (color|text|label|...)/resize/move the/a bit/slightly/just .../bigger/smaller

## Verified (inline behavioral tests, all pass)
bash -n OK. 1) "build me a pricing page" -> FIRES. 2) "make the button blue" -> silent. 3) "fix the padding on the header" -> silent. 4) "polish the checkout flow" -> still routes <verb>polish</verb>. 5) "this dashboard looks dated and generic" -> FIRES (full nudge incl. tilt-lab). 6) second intent prompt within window -> silent (cooldown). 7) "what is a design system" -> silent (informational). Tests run with an isolated SIDECOACH_INTENT_COOLDOWN_FILE per case.

## All four parts DONE + verified
1. Intent tier + trivial-tweak exemption + cooldown in sidecoach-keyword.sh (+ sidecoach-intent.json lexicon). VERIFIED.
2. Cooldown (integrated into 1). VERIFIED.
3. CLAUDE.md "Design Work and Sidecoach" section: added the **Default evaluation gate** paragraph (sidecoach is part of the default eval for ALL front-end work; treat the hook's injected self-question as a real prompt; keep the question live even when the hook stays quiet) + a **Sidecoach dependents** line naming tilt-lab as the shader/background capability.
4. tilt-lab as a dependent of sidecoach: sidecoach SKILL.md gained a "## Dependent capabilities" section (tilt-lab owns generative/shader backgrounds; craft/bloom/animate/overdrive reach for it; mount via mountStack); tilt-lab SKILL.md gained a "dependent capability of sidecoach" note (keep the flow's tokens, return the mounted bg to the flow).

## Wiring notes (symlink vs copy)
- ~/.claude/CLAUDE.md and ~/.claude/hooks/sidecoach-keyword.sh are SYMLINKS to the repo -> edits live immediately.
- ~/.claude/skills/sidecoach is also symlinked (cp reported "identical"); ~/.claude/skills/tilt-lab is a COPY (mirrored via cp after editing the repo canonical).
- sidecoach-intent.json is read by the hook from the same dir; no separate wiring.

## Final verification
- bash -n clean. Full harness `bash claude/hooks/test-sidecoach-keyword.sh` = **102 passed, 0 failed** (89 prior verb/mode cases unchanged + 13 new: 5 intent-fires, 5 intent-silent incl. backend/informational/trivial, 1 verb-still-routes, 1 cooldown-suppresses, plus the existing). New tests isolate the cooldown via SIDECOACH_INTENT_COOLDOWN_FILE=mktemp per case.

## Files
- claude/hooks/sidecoach-intent.json (new - lexicon + config + nudge text)
- claude/hooks/sidecoach-keyword.sh (intent tier + cooldown; symlinked, live)
- claude/hooks/test-sidecoach-keyword.sh (13 new intent/cooldown regression cases)
- claude/CLAUDE.md (default evaluation gate + tilt-lab dependent line)
- claude/skills/sidecoach/SKILL.md (Dependent capabilities section)
- claude/skills/tilt-lab/SKILL.md (dependent-of-sidecoach note) + mirrored to ~/.claude/skills/tilt-lab/
