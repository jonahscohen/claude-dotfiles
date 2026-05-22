# Sidecoach v2: Invisible Flow Orchestration

## What Is Sidecoach?

Sidecoach is invisible infrastructure inside the intent detector. It runs automatically without you doing anything.

When you say "Help me design a button," Sidecoach:
1. Detects intent (design from scratch)
2. Checks history (no flows run yet = research phase)
3. Chains flows automatically (A -> B -> C -> D -> F -> G -> H -> I -> J)
4. Feeds each result to the next flow
5. Claude guides you conversationally through each step

You never invoke Sidecoach. You never run commands. It just orchestrates in the background.

## Status: Implementation Complete

All 4 phases of Sidecoach v2 are built and verified:

| Phase | What | Status |
|-------|------|--------|
| **1** | 10-flow architecture + 17 tactical rules | Complete |
| **2** | Reference data service (components, fonts, motion) | Complete |
| **2c** | Design references + DESIGN.md parsing | Complete |
| **3** | Intelligent lookups in all flows | Complete |
| **4** | Orchestrator (phase detection, chaining, validation) | Complete |

Code status: TypeScript compiles cleanly. Ready for integration.

## Current State

**Ready:**
- Orchestrator logic: Phase detection, flow chaining, prerequisite validation
- Reference data: 40+ components, tokens, motion patterns, design references
- All 10 flows: Wired with intelligent guidance

**Missing:**
- Integration into IntentDetector (move orchestrator source into intent detector codebase)
- Invisible wiring (hook orchestrator into intent detection, no user-facing commands)
- Session persistence (wire FlowHistory to actual session store)

## How It Works

```typescript
// Inside IntentDetector.detectIntent()
const orchestrator = new SidecoachOrchestrator(flowHistory);

// User: "Help me design a button"
// -> detectIntent() extracts: intent='design-from-scratch'
const phase = orchestrator.detectPhase(context);      // 'research'
const flowChain = orchestrator.recommendFlowSequence(phase);
// -> ['flowA_brand_verify', 'flowB_component_research', 'flowC_font_research', ...]

// Run flows in sequence, pass results forward
for (const flowId of flowChain) {
  orchestrator.validatePrerequisites(flowId);
  result = await runFlow(flowId, context);
  orchestrator.recordFlowExecution(result);
  // -> Next iteration gets updated history automatically
}
```

User never sees the orchestration. They just have a conversation.

## Flow Dependency Graph (10 Flows)

```
flowA (brand verify) <- foundation
  |-> flowB (components)
  |-> flowC (fonts)
  |-> flowD (references)
  |-> flowE (motion)
      |
    flowF (design tokens) <- gating point
      |-> flowG (implement)
      |-> flowH (motion integration)
      |-> flowI (accessibility)
            |
          flowJ (polish)
```

Each arrow is automatic. No user action required.

## Architecture

SidecoachOrchestrator provides 5 core methods:

| Method | Purpose |
|--------|---------|
| `detectPhase(context)` | Analyzes FlowHistory -> 'research' or 'execution' or 'polish' |
| `recommendFlowSequence(phase)` | Returns ideal flow chain for current phase |
| `validatePrerequisites(flowId)` | Checks if flow can run (dependencies met? artifacts exist?) |
| `getNextRecommendedFlow(current, result)` | Chains to next flow automatically on success/incomplete |
| `recordFlowExecution(result)` | Records completion in FlowHistory |

## Integration Path

1. Move source: Copy `sidecoach/src/orchestrator.ts`, `flow-history.ts`, `reference-data.ts` into intent detector codebase
2. Wire into intent detection: When IntentDetector detects a flow intent, instantiate orchestrator and chain flows
3. Remove separate build: No more `npm run build` for Sidecoach. Just source code imported by intent detector.
4. Test: Run integration tests with real flow chains

## Key Files (For Integration)

| File | Purpose |
|------|---------|
| `sidecoach/src/orchestrator.ts` | Core orchestrator (343 lines) |
| `sidecoach/src/flow-history.ts` | Session persistence (220 lines) |
| `sidecoach/src/reference-data.ts` | Design system indexing (960+ lines) |

Copy these into intent detector. Remove the `sidecoach/` folder from separate builds.

---

Status: Implementation complete. Ready for integration into intent detector. No user-facing commands needed. Orchestration is invisible.
