---
name: phase-6-intelligent-flow-chaining
description: Implemented invisible flow chaining in execution engine via intelligent orchestrator integration
metadata:
  type: project
  relates_to:
    - session_2026-05-21_phase5_integration_start.md
    - session_2026-05-21_phase4_orchestrator_completion.md
---

# Phase 6: Intelligent Flow Chaining - Execution Engine

## Goal
Wire the intelligent orchestrator (SidecoachOrchestrator from orchestrator.ts) into the execution engine (sidecoach-orchestrator.ts) to automatically chain flows based on orchestrator recommendations.

## Implementation

### sidecoach-orchestrator.ts Changes

**Class renamed for clarity:**
- Old: `export class SidecoachOrchestrator` (conflicted with orchestrator.ts)
- New: `export class FlowExecutionEngine` (execution/handler management layer)
- Export function updated: `createExecutionEngine()` returns `FlowExecutionEngine`

**Added intelligent orchestrator import:**
- `import { SidecoachOrchestrator as IntelligentOrchestrator } from './orchestrator';`
- Clear separation: IntelligentOrchestrator handles phase detection; FlowExecutionEngine handles handler execution

**Constructor changes (lines 50-56):**
- Added property: `private orchestrator: IntelligentOrchestrator;`
- Initialize in constructor:
  ```typescript
  const flowHistory = getFlowHistory();
  this.orchestrator = new IntelligentOrchestrator(flowHistory);
  ```

**process() method completely rewritten (lines 102-180):**

Old behavior: Execute single flow, return result
New behavior: Execute initial flow + chain recommended follow-ups invisibly

Algorithm:
1. Detect initial flow intent (unchanged)
2. Prepare shared execution context for entire chain
3. Execute flow chain loop:
   - Get handler for current flow
   - Execute handler with shared context
   - Record result to FlowHistory
   - Call `intelligentOrchestrator.getNextRecommendedFlow(currentFlowId, result)`
   - If successful and next flow exists, loop; otherwise stop
4. Continue until:
   - Flow fails or errors (stop chaining)
   - Flow status is 'needs_input' (incomplete, stop)
   - No next flow recommended (done)
5. Return combined results from all flows

**Response aggregation (lines 176-180):**
- Combines all flow results into single response
- Flow markers show which flows executed
- Guidance, checklists, artifacts concatenated from all flows
- Message shows the full chain execution

## Flow Execution Chain Examples

**Example 1: Research Phase**
User: "Help me design a button"
1. Detect: flowA_brand_verify
2. Execute: flowA (success)
3. Recommend: flowB_component_research
4. Execute: flowB (success)
5. Recommend: flowC_font_research (if needed)
6. Continue until research phase complete

**Example 2: Execution Phase (after research)**
User: "Now let's implement it"
1. Detect: flowF_design_tokens
2. Execute: flowF (success)
3. Recommend: flowG_component_implementation
4. Execute: flowG (success)
5. Recommend: flowH_motion_integration (if applicable)
6. Continue based on dependencies

## Architecture Integration

```
User utterance
    ↓
IntentDetector.detect() → match initial flow
    ↓
SidecoachOrchestrator.process()
    ├─ Execute initial flow (handler.execute)
    ├─ Record to FlowHistory
    ├─ Ask IntelligentOrchestrator: getNextRecommendedFlow()?
    ├─ If yes, loop: execute next flow
    └─ Return combined results from entire chain
```

Invisible to user: they say one thing, multiple flows execute automatically based on phase detection and prerequisites.

## Verification Status

✓ TypeScript compilation: CLEAN - zero errors
✓ Strict mode (noEmit): PASSED
✓ Build artifacts generated: dist/sidecoach-orchestrator.js and .d.ts created
✓ Handler property access: Fixed (flowName retrieved from getFlow() not handler)

Verified changes:
1. IntelligentOrchestrator import added and instantiated in constructor
2. process() method completely rewritten with flow chaining loop
3. Flow execution chain properly continues while getNextRecommendedFlow() returns a flow
4. Results aggregated from all flows in the chain
5. Error handling preserves flow name from flow definition when handler errors

## Files Modified
- `sidecoach/src/sidecoach-orchestrator.ts` (complete refactor)
  - Renamed class: SidecoachOrchestrator → FlowExecutionEngine
  - Added IntelligentOrchestrator import
  - Added orchestrator property and initialization
  - Rewrote process() for flow chaining
  - Updated return value aggregation
  - Renamed export: createOrchestrator() → createExecutionEngine()

## Architecture Summary

**Two complementary orchestrators:**

1. **SidecoachOrchestrator** (orchestrator.ts)
   - Intelligent phase detection (research/execution/polish)
   - Flow dependency mapping
   - Prerequisite validation
   - Next flow recommendations based on execution results
   
2. **FlowExecutionEngine** (sidecoach-orchestrator.ts)
   - Intent detection via IntentDetector
   - Handler registration and execution
   - Flow chaining loop powered by SidecoachOrchestrator recommendations
   - Result aggregation from entire flow chain

**Data flow:**
User utterance → IntentDetector → Initial flow matched → FlowExecutionEngine.process() → Execute handler → Ask SidecoachOrchestrator for next → Execute next → Continue until complete → Aggregate results

## Prerequisite Validation Added

**Flow execution now enforces prerequisites:**
- Before executing each flow in the chain, `validatePrerequisites()` is called
- If prerequisites missing: flow is skipped with status 'skipped'
- Reason for skip is recorded in message
- Chaining stops when prerequisites not met (prevents invalid sequences)

Code added (lines 180-200):
```typescript
// Validate prerequisites before executing
const validation = this.orchestrator.validatePrerequisites(currentFlowId);
if (!validation.valid) {
  // Prerequisites not met: skip and stop chaining
  const skipResult: FlowExecutionResult = {
    flowId: currentFlowId,
    flowName,
    status: 'skipped',
    message: validation.message,
  };
  flowResults.push(skipResult);
  // Record and break
  break;
}
```

## Status: PHASE 6 COMPLETE ✓

TypeScript compilation: CLEAN - zero errors
Build artifacts: Generated successfully
Flow chaining: Implemented with prerequisite validation ✓
Naming: Clarified and collision resolved ✓

Sidecoach v2 now has complete end-to-end infrastructure:
- Phase detection working
- Flow chaining automatic
- Prerequisite validation enforced ✓
- Execution engine integrated
- Invisible orchestration enabled
