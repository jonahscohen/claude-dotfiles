---
name: Sprint 7 T4 execution - PolishStandardValidator.toValidationResult adapter
description: Adapter method converts PolishValidationReport to ValidationResult shape for orchestrator
type: project
relates_to: [session_2026-05-24_sprint7_design.md]
---

Human collaborator: Jonah.

## What T4 does

Adds static `toValidationResult(report: PolishValidationReport): ValidationResult` method to PolishStandardValidator that converts polish validation results into the standard ValidationResult shape used by the orchestrator's validation framework.

## Implementation

**File:** `sidecoach/src/polish-standard-validator.ts`

Added import:
```typescript
import type { ValidationResult } from './flow-composition';
```

Added static method after existing `getSummary`:
```typescript
static toValidationResult(report: PolishValidationReport): ValidationResult {
  const failed = report.results.filter(r => !r.passed);
  const status: 'pass' | 'fail' | 'partial' =
    report.criticalViolations > 0 ? 'fail' :
    report.violations > 0 ? 'partial' :
    'pass';
  return {
    domain: 'polish-standard',
    status,
    passedRules: report.results.filter(r => r.passed).map(r => `rule-${r.ruleId}`),
    failedRules: failed.map(r => `rule-${r.ruleId}`),
    message: report.summary,
  };
}
```

## Severity mapping

- critical violations (criticalViolations count > 0) → status 'fail'
- violations without critical (violations > 0 but criticalViolations = 0) → status 'partial'
- no violations → status 'pass'

All passed rules formatted as `rule-{ruleId}`. All failed rules formatted as `rule-{ruleId}`. Message is the report summary.

## Test file

Created: `sidecoach/src/__tests__/sprint7-polish-validator-result.test.ts`

9 assertions across 4 scenarios:
- T1: real validateAll with minimal context → domain=polish-standard, status in [pass/partial/fail], message non-empty
- T2: synthetic clean report (22/22 passed) → status=pass, failedRules=[], passedRules.length=22
- T3: synthetic critical report (1 critical violation) → status=fail, failedRules.length=1
- T4: synthetic warning-only report (1 non-critical violation) → status=partial

All assertions PASS.

## Test results

```
PASS T1: real validateAll -> domain === polish-standard
PASS T1: real validateAll -> status is valid
PASS T1: real validateAll -> message non-empty
PASS T2: synthetic clean -> status === pass
PASS T2: synthetic clean -> failedRules empty
PASS T2: synthetic clean -> passedRules length 22
PASS T3: synthetic critical -> status === fail
PASS T3: synthetic critical -> failedRules length 1
PASS T4: synthetic warning-only -> status === partial
sprint7-polish-validator-result PASS
```

TypeScript compilation: zero errors.

## Files modified

- `sidecoach/src/polish-standard-validator.ts` (import + adapter method)
- `sidecoach/src/__tests__/sprint7-polish-validator-result.test.ts` (new test file)

## Task status

DONE. Ready for commit.
