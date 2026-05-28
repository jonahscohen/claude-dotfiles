---
name: T-0023 deep-interview enhancement for /sidecoach teach
description: --deep flag adds 4-extended-field taxonomy, vague-answer detection, OMC-style ambiguity scoring, and PRODUCT.md validation to TeachCommandHandlerV2 (closes OMC gap #5)
type: project
relates_to: [session_2026-05-28_omc-research-synthesis.md, session_2026-05-28_t0011_modes.md]
---

# T-0023 deep-interview enhancement

Closes OMC gap #5. OMC's `deep-interview` mode asks ONE question per round with weakest-dimension targeting, mathematical ambiguity scoring, and 4 challenge agent modes (contrarian/simplifier/ontologist). Current sidecoach teach batched 5 gap questions into a single pass with zero follow-up. The --deep flag closes the gap without changing the standard surface.

## Gap matrix - OMC deep-interview vs sidecoach teach (pre-T-0023)

| Dimension | OMC deep-interview | Sidecoach teach (pre) | Gap closed by T-0023 |
|---|---|---|---|
| Questioning depth | ONE question per round, up to 20 rounds | 5 gap questions batched in a single list | Vague-answer demotion + follow-up logic surfaces sharper questions for low-confidence fields. Still batched, but each question is targeted to the field's specific weakness |
| Ambiguity scoring | Weighted 4-dimension math (goal/constraints/criteria/context), threshold gate at 20% | Boolean confidence per field (high/low/absent) | `ambiguityScore()` computes 1 - weighted_clarity across 4 dimensions, reports weakest dimension to user |
| Question taxonomy | Goal/Constraints/Criteria/Context (+ ontology) - generic | 5 design-domain fields (register/users/brandPersonality/antiReferences/strategicPrinciples) | Extended to 9 fields with the 4 OMC-style dimensions: register/users/problem (goal), antiRefs/businessModel/technicalConstraints (constraints), strategicPrinciples/successMetrics (criteria), brandPersonality/brandVoice (context) |
| Follow-up logic | Weakest-dimension targeting + 3 challenge modes | None - vague answer like "developers" passes as high confidence | `VAGUE_PATTERNS` regex per field + `isVagueAnswer()` + `generateFollowUpQuestion()` produces design-domain analog of challenge agents |
| Validation | Mathematical threshold gate before crystallization | None - PRODUCT.md written unconditionally once gaps filled | `validateProductMd()` checks for missing sections, stub sections (< 8 chars body), TODO markers, attribution lines |
| Output structure | `.omc/specs/deep-interview-{slug}.md` with metadata/clarity/topology/goal/constraints/non-goals/criteria/assumptions/ontology/transcript | PRODUCT.md with 5 sections | 9 sections in --deep mode: Register, Primary Users, Problem (new), Brand Personality + Brand Voice (new, brand only), Anti-References, Strategic Principles, Success Metrics (new), Business Model (new), Technical Constraints (new) |
| Downstream handoff | Pipeline: deep-interview spec -> omc-plan -> approval -> autopilot/ralph/team | None - PRODUCT.md feeds all flows but no explicit handoff verb | --deep mode emits `Next step: ...run /sidecoach document...` when DESIGN.md is missing |

## Architecture decision: Option A (enhance in place)

Picked Option A over Option B (separate flow). Reasoning:

- **Single setup entrypoint stays coherent.** `/sidecoach teach` is the documented project-setup gate in CLAUDE.md, SKILL.md, and the marketing site. Splitting it into two flows would force every reference to qualify which one to run.
- **Regression-safe.** Vague-answer detection is gated by `if (isDeep)` in `demoteVagueAnswers` so sprint8-teach-rebuild's existing "developers" fixture still passes. The 5-field taxonomy and PRODUCT.md format are unchanged in standard mode.
- **No FlowId churn.** Teach was never a FlowId (it's a dedicated handler in the orchestrator's slash-command branch, not in the chain registry). Option B would have meant registering a new FlowId, adding it to model-routing, modes, intent-detection, all the indices. Wrong abstraction.
- **Flag parsing is cheap.** `parseDeepFlag()` handles --deep/--quick/--standard as utterance prefixes or `metadata.depth` keys. Three lines in `execute()` route to deep-aware paths.

**Alternatives considered:**
- Option B (separate flow_deep_interview FlowId): rejected - duplicates handler code, fragments docs, churns FlowId registry, no functional gain.
- Always-on deep mode: rejected - breaks sprint8 regression where "developers" is a valid answer for established projects.

**Revisit when:** the --deep path grows beyond a flag and we genuinely need round-by-round state (currently we just emit the ambiguity score once when surfacing pending; OMC's multi-round resume model isn't ported because sidecoach teach already gathers all gaps in one prompt cycle via the orchestrator's pending-status loop).

## What shipped

Files:
- `sidecoach/src/teach-deep-interview.ts` (NEW, 320+ lines) - pure helpers: CORE_FIELDS/EXTENDED_FIELDS/DEEP_FIELDS arrays, FIELD_DIMENSION map, VAGUE_PATTERNS regex catalog, `isVagueAnswer()`, `ambiguityScore()`, `generateFollowUpQuestion()`, `validateProductMd()`, `parseDeepFlag()`
- `sidecoach/src/teach-command-handler-v2.ts` (MODIFIED) - parseBrief/identifyGaps/mergeFromBriefAndAnswers/summarizeExtracted/generateProductMd accept `deep` opt; execute() detects --deep via `parseDeepFlag(brief)` or `metadata.depth`; demoteVagueAnswers runs in deep mode only; checklist + guidance include extended fields, ambiguity score, validation warnings, and DESIGN.md handoff in deep mode
- `sidecoach/src/__tests__/t23-deep-interview.test.ts` (NEW) - 49/49 assertions across 12 scenarios

Docs:
- `claude/skills/sidecoach/SKILL.md` - new row in Setup and Strategy table documenting --deep mode
- `claude/skills/sidecoach/CHEATSHEET.md` - new "Setup commands (teach + document)" subsection in Section 3 documenting all three setup commands including --deep

## Sample output (synthetic deep interview, intentionally vague answers)

Utterance: `--deep Register: brand. Users: developers. Brand personality: modern.`

```
STATUS: pending
MESSAGE: Brief partially parsed. 9 field(s) need answers. (deep interview mode)
GUIDANCE:
  Deep interview mode: extracting 9 fields (5 core + 4 extended).
  Current ambiguity: 81% (target: <=20%).
  Weakest dimension: constraints (clarity: 0%).
  
  Brief extracted these fields:
  - register: brand
  - users: developers
  - brand personality: modern
  
  Missing or low-confidence fields - awaiting answers:
  - users: You said "developers" - which is too broad. Name the one role whose
    problem you most need to solve first. What's their job title, what tool are
    they coming from, and what specific frustration drives them to try this?
  - brandPersonality: "modern" is the AI-slop default - it describes 90% of SaaS.
    What three brands or products do you want this to feel like? What ONE brand
    do you want it to never feel like?
  - problem: Problem - what specific pain are we solving? (write in "users have
    to do X, costs them Y" form)
  - successMetrics: Success metrics - 1-3 measurable numbers (count, %, ratio)
    you would check in 30 days?
  - businessModel: Business model - free? paid (one-time / subscription)? B2B /
    B2C / internal? who pays?
  - technicalConstraints: Technical constraints - browsers, accessibility tier,
    framework lock-in, performance budget?
  - brandVoice: Brand voice - 3 example sentences, most-used word, forbidden word?
  ...
```

## Test results

- `t23-deep-interview.test.ts`: 49/49 PASS - covers standard regression (S1), --deep activation (S2), vague-answer detection (S3, S5), parseDeepFlag (S4), follow-up question generation (S6), ambiguityScore math (S7), validateProductMd (S8), DESIGN.md handoff (S9), metadata.depth equivalence (S10), --deep + teachAnswers merge (S11), taxonomy shape constants (S12)
- `sprint8-teach-rebuild.test.ts`: 17/17 PASS (regression - existing teach behavior unchanged)
- `npx tsc --noEmit`: clean (only pre-existing T-0016 rootDir warnings from benchmarks/runner)

## Why this matters

OMC's deep-interview is a generic Socratic flow. Sidecoach's --deep mode is a design-domain analog - it asks for the things a designer actually needs to know (Brand voice, anti-references, technical constraints) and rejects the AI-slop defaults ("modern", "developers", "professional") that 90% of greenfield briefs default to. The follow-up questions are specifically tuned to design decisions: "what three brands do you want this to feel like" beats "what's your brand personality" for surfacing actual design intent.

The standard `/sidecoach teach` path is unchanged - existing projects with a known shape don't need the deeper interview. --deep is opt-in for new brand/product setup where the brief is more than a sentence or two.

## Files touched

- `sidecoach/src/teach-deep-interview.ts` (new)
- `sidecoach/src/teach-command-handler-v2.ts`
- `sidecoach/src/__tests__/t23-deep-interview.test.ts` (new)
- `claude/skills/sidecoach/SKILL.md`
- `claude/skills/sidecoach/CHEATSHEET.md`
- `TASKS.md` (T-0023 entry filed and marked done)
