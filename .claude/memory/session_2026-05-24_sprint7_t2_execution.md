---
name: Sprint 7 T2 execution - composite-parser regex accepts colon + space
description: Regex change + destructuring to support both /sidecoach composite:flowid and /sidecoach composite flowid forms
type: project
relates_to: [session_2026-05-24_sprint7_design.md]
---

Human collaborator: Jonah.

## What T2 does

Composite slash-command parser accepts both colon and space target forms:
- `/sidecoach composite:composite_qa_workflow` (canonical, advertised in help text)
- `/sidecoach composite composite_qa_workflow` (space form, also valid)
- `/sidecoach composite` (no target, returns help text)

## Implementation

**File:** `sidecoach/src/slash-command-router.ts`

Changed regex from:
```typescript
const match = trimmed.match(/^\/(?:sidecoach\s+)?(\w+)(?:\s+(.*))?$/i);
```

To:
```typescript
const match = trimmed.match(/^\/(?:sidecoach\s+)?(\w+)(?::([\w-]+)|\s+(.*))?$/i);
```

New regex captures:
- `match[1]`: command name
- `match[2]`: colon target (if `:flowid` present)
- `match[3]`: space target (if space + args present)

Updated destructuring:
```typescript
const colonTarget = match[2]?.trim() || '';
const spaceTarget = match[3]?.trim() || '';
const target = colonTarget || spaceTarget;
```

Changed composite check from `if (command === 'composite' && target)` to unconditional `if (command === 'composite')` so composite is recognized even without a target. The orchestrator already handles no-target case with help text at line 743-756 of `sidecoach-orchestrator.ts`.

## Test added

New file: `sidecoach/src/__tests__/sprint7-composite-parser-both-forms.test.ts`

4 assertions:
- T1: colon form does NOT return help-text (routes to flow)
- T2: space form does NOT return help-text (routes to flow)
- T3: no-target form DOES return help-text
- T4: unknown command does NOT return composite help-text

## Test results

All 4 PASS + final PASS line.

Regression tests:
- sprint4-build-report-composite: PASS
- sprint5-force-flowid-bypass: PASS
- sprint6-checkpoint-write-on-step: PASS
- sprint7-intent-detector-flowwx: PASS
- tsc --noEmit: zero errors

## Files modified

- `sidecoach/src/slash-command-router.ts` (regex + destructuring + composite check)
- `sidecoach/src/__tests__/sprint7-composite-parser-both-forms.test.ts` (new test file)

## Task status

DONE. Ready for commit.
