---
name: Phase 6 DesignDebtTracker implementation
description: Auto-log warning violations as formal design debt, track across sessions
type: project
---

## Phase 6: DesignDebtTracker - IN PROGRESS

### New file created
- `src/design-debt-tracker.ts` - 180 lines

### Implementation: Project-keyed debt storage

**Storage:**
- File: `~/.claude/sidecoach-design-debt.json`
- Keyed by: projectPath (same as FlowHistory v2)
- Format: `{ projectPath: [debt1, debt2, ...] }`
- Persistence: survives sessions, per-project isolation

**Core operations:**

1. **addDebt(debtItem)** - Create debt entry
   - Auto-generates unique ID: `debt_${timestamp}_${random}`
   - Sets createdAt timestamp
   - Appends to project debt array
   - Saves to disk

2. **resolveDebt(id)** - Mark as complete
   - Sets resolvedAt timestamp
   - Keeps entry in history (not deleted)

3. **getOpenDebt()** - Unresolved only
   - Filters by missing resolvedAt
   - Used for session-start surfacing

4. **getSummary()** - One-liner for output
   - Returns empty string if no open debt
   - Format: "⚠️ 3 open design debt items: item1, item2, item3, +1 more"
   - Max 3 items shown (abbreviated if >3)

5. **getAllDebt()** - Full history
   - Open and resolved entries

6. **removeDebt(id)** - Delete entry
   - Removes from array completely

### Data contract: ValidationViolation → DesignDebt

From DeterministicValidator, violation with debtCandidate:
```typescript
interface ValidationViolation {
  rule: string;
  severity: 'blocking' | 'warning';  // Only warnings auto-logged
  message: string;
  fix?: string;
  debtCandidate?: {
    description: string;
    justification: string;
    dueWhen: string;
    estimatedCost: 'low' | 'medium' | 'high';
  };
}
```

Maps to DesignDebt entry auto-logged in sidecoach-orchestrator.

### Next: Wire into sidecoach-orchestrator.ts

Post-validation, pre-execution:
1. For each warning violation, call `tracker.addDebt(violation.debtCandidate)`
2. Session start: call `tracker.getSummary()` and prepend to output message

### Verification: TypeScript compilation
