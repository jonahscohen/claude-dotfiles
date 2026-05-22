---
name: Phase 2 FlowHistory v2 completion
description: Schema change from single-entry to multi-run array, keyed by projectPath, v1 migration
type: project
---

## Phase 2: FlowHistory v2 - COMPLETE

### Changes made

**Schema migration:** `flowOutputs` Record changed from `Record<string, FlowHistoryEntry>` to `Record<string, FlowHistoryEntry[]>` to enable cross-session regression detection and 20-run retention.

**Files modified:**
- `src/flow-history.ts`

### Fixes applied

**Line 162: getLastFlow() return type mismatch**
- Issue: Method returns `FlowHistoryEntry | null` but `session.flowOutputs[lastFlowId]` is now `FlowHistoryEntry[]`
- Fix: Extract latest run from array before returning
  ```typescript
  const runs = session.flowOutputs[lastFlowId];
  if (!runs || !Array.isArray(runs) || runs.length === 0) return null;
  return runs[runs.length - 1];
  ```

### Methods working v1→v2 compatibility
- `recordFlow()`: Migration layer converts v1 single-entry to v2 array on read, auto-caps at 20 runs
- `getFlowSequence()`: Returns latest run per flow (backward compat)
- `getFlowOutput()`: Delegates to `getLatestRun()` (backward compat)
- `getFlowRuns()`: New - returns full array of runs
- `getBaselineRun()`: New - returns first successful run
- `getLatestRun()`: New - returns most recent run
- `getFlowCount()`: Fixed - now counts array length instead of sequence dedup

### Verification: ✓ TypeScript compilation
`npm run build` succeeds with exit code 0, zero errors.

## Phase 2 Status: VERIFIED COMPLETE

Ready for Phase 3: DeterministicValidator (hard-gate prerequisite enforcement).
