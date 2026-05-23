# Comprehensive Gap Analysis: Sidecoach vs. Impeccable

**Analysis Date:** 2026-05-22  
**Basis:** Actual codebase examination + 36 implemented Sidecoach flows + Impeccable skill architecture  
**Scope:** Design workflow orchestration for Claude-native design tool automation

---

## Executive Summary

Sidecoach and Impeccable serve overlapping but distinct purposes:

- **Impeccable:** User-facing, 23 discoverable slash commands, design expertise baked into reference files, assumes user learns command vocabulary
- **Sidecoach:** Infrastructure-focused, 36 structured flows organized in tiers, deterministic flow routing, designed to embed Impeccable's intelligence transparently (consolidation in progress)

**Key Finding:** Sidecoach is not yet a replacement for Impeccable; it is an **orchestration layer being built to consolidate Impeccable's intelligence** into flows. Current state: Sidecoach has the structure; Impeccable has the content. The consolidation (extracting Impeccable's 23 command logics into Sidecoach flows) is in progress.

---

## 1. Numeric Comparison Rubric

### Scoring Scale
| Score | Meaning |
|-------|---------|
| 0 | None / not addressed |
| 1-2 | Minimal / skeletal |
| 3-4 | Partial / basic |
| 5-6 | Moderate / functional |
| 7-8 | Strong / comprehensive |
| 9-10 | Complete / production-ready |

### Dimension Scorecard

| Dimension | Sidecoach | Impeccable | Notes |
|-----------|-----------|-----------|-------|
| **Coverage: Design workflow phases** | 8 | 9 | SC: all phases. IMP: same phases + refinement specificity. |
| **Determinism: Routing predictability** | 9 | 4 | SC: slash commands -> deterministic flow chains. IMP: NLU-based discovery (user must learn commands). |
| **Reference Integration: External design sources** | 7 | 8 | SC: 4 reference systems (component-gallery, fontshare, design-references, motion). IMP: embedded expertise + external reference files. |
| **Memory Persistence: Design decision tracking** | 8 | 2 | SC: FlowHistory + FlowMemoryBuilder with decision rationale. IMP: no built-in memory system. |
| **Flow Execution: Parallel/sequential operations** | 9 | 6 | SC: 36 flows, explicit choreography, sequential chains. IMP: 23 commands, user chains them. |
| **User Discovery: Command findability** | 7 | 6 | SC: /sidecoach list + in-flow guidance. IMP: must learn /impeccable prefix + 23 subcommands. |
| **Semantic Clarity: Naming intuitivness** | 8 | 7 | SC: flow names descriptive (Brand Verify, Component Research). IMP: command names clear but require learning. |
| **Accessibility (WCAG): A11y validation** | 8 | 7 | SC: Flow I dedicated; embedded WCAG rules in audit flows. IMP: audit command covers, but not centralized. |
| **Responsive Design: Breakpoint validation** | 8 | 7 | SC: Flow M + responsive-design domain embedded. IMP: adapt + audit commands touch responsive. |
| **Type Safety: Strictness of typing** | 10 | 5 | SC: FlowId union type, strict TS throughout, enum-like structure. IMP: reference files are .md (untyped), commands are strings. |

**Summary:** Sidecoach wins on determinism, memory, flow execution, and type safety. Impeccable wins on user-facing discovery and semantic naming (users already know /impeccable craft). The rubric shows Sidecoach is **infrastructure-superior** but lacks Impeccable's **deployed wisdom**.

---

## 2. Gap Analysis Matrix

### Sidecoach Gaps (What's Missing vs. Impeccable)

#### Critical Gaps

| Gap | Impact | Severity | Mitigation |
|-----|--------|----------|-----------|
| **No AI slop detection embedded** | Flows can generate generic/oversaturated designs; category-reflex checks not wired into execution | HIGH | Phase 2 consolidation: embed slop detection rules into Flows L, J, S, T (critique + refine). 2-3 days. |
| **No 7-domain design law embedding** | Flows exist but lack the "why" and "rules" of typography/color/spatial/motion/interaction/responsive/ux-writing domains | HIGH | Phase 2: extract domain content from Impeccable reference files into each flow's decision logic. 4-5 days. |
| **Reference systems not yet invoked** | component-gallery, fontshare, design-references, motion-reference interfaces exist but flows don't call them | MEDIUM | Phase 2 Task 1: wire reference invocation into B, C, D, E flows. 2-3 days. |
| **No PRODUCT.md/DESIGN.md parsing in core flows** | Context initialization missing; flows don't auto-load project context on startup | MEDIUM | Phase 1: context-loader integration (already extracted in early consolidation). 1-2 days. |
| **No user-facing slash command discovery** | Users can't discover Sidecoach like they discover Impeccable (/impeccable with no args shows menu) | LOW | Add interactive menu system (already in /sidecoach list); refinement needed. |

#### Moderate Gaps

| Gap | Impact | Severity | Mitigation |
|-----|--------|----------|-----------|
| **No "make-interfaces-feel-better" integration** | Tactical polish rules (scale-on-press, concentric radius, optical alignment) not embedded in Flow J | MEDIUM | Embed tactical rules from make-interfaces-feel-better 14-point checklist into Flow J execution. 1-2 days. |
| **No register system** | Flows don't distinguish brand vs. product design contexts; design laws not context-aware | MEDIUM | Flow A: add register detection logic from Impeccable brand.md/product.md. 1-2 days. |
| **Intent detection unreliable** | NLU-based fallback routing (Step 1 in orchestrator) has 62.5% accuracy; deterministic routing bypasses it | LOW | Flows still execute via slash commands; intent detection is fallback only, acceptable. |
| **No live browser iteration (Flow N)** | Impeccable's /live command maps to Flow N Rapid Iteration Refined, but live browser wiring missing | MEDIUM | Implement browser integration for visual iteration. 2-3 days. |

### Impeccable Gaps (What's Missing vs. Sidecoach)

#### Critical Gaps

| Gap | Impact | Severity | Mitigation |
|-----|--------|----------|-----------|
| **No decision memory system** | Design decisions not logged with rationale; no audit trail of "why" for future reviews | HIGH | Sidecoach's FlowHistory model should be ported back to Impeccable, or Impeccable should call Sidecoach for memory. 2-3 days. |
| **No deterministic routing** | User must remember 23 command names or discover them; no structured flow chains | HIGH | Sidecoach provides deterministic slash-command routing; Impeccable can't guarantee user lands on right command. Inherent to design. |
| **No structured flow execution** | Impeccable commands execute in isolation; no built-in chaining (user must invoke /impeccable craft -> manually run /impeccable audit after) | MEDIUM | Sidecoach wraps this; Impeccable doesn't enforce sequencing. |
| **No type-safe flow composition** | Reference files are .md (untyped); no compile-time validation of reference file structure | MEDIUM | Sidecoach's TS types ensure correctness; Impeccable relies on manual consistency. |

#### Moderate Gaps

| Gap | Impact | Severity | Mitigation |
|-----|--------|----------|-----------|
| **No responsive design tier** | adapt command covers responsive, but no dedicated flow-level module like Sidecoach Flow M | LOW | Minor; audit + adapt cover the domain. |
| **No structured pre-flight checks** | No equivalent to Sidecoach Flow A (Brand Verification) pre-flight validation | LOW | Impeccable assumes PRODUCT.md exists; no forced pre-flight. |
| **No design metrics tracking** | No capture of "did we meet the design goals?" | LOW | Impeccable is advice-giving, not outcome-tracking. Sidecoach adds metrics. |

---

## 3. Capability Overlap & Unique Strengths

### Overlapping Capabilities (Both Systems Address)

| Capability | Sidecoach Approach | Impeccable Approach | Winner |
|------------|-------------------|-------------------|--------|
| **Typography refinement** | Flow C (Font Research) + S (Typography Excellence) | /impeccable typeset command | Tie (both comprehensive) |
| **Accessibility validation** | Flow I + audit flows embedded | /impeccable audit + WCAG domain | Tie (both thorough) |
| **Motion integration** | Flow E + H + T with easing rules | /impeccable animate command | Tie (motion-reference in both) |
| **Component design** | Flow B (Component Research) + G | /impeccable craft scaffolding | Sidecoach (structured tier) |
| **Responsive validation** | Flow M dedicated module | /impeccable adapt + audit | Sidecoach (dedicated flow) |
| **Design critique** | Flow L (Design Critique) with 12-rule pass | /impeccable critique command | Tie (both AI-driven) |
| **Visual polish** | Flow J + make-interfaces-feel-better rules | /impeccable polish command | Sidecoach (14-point checklist embedded) |
| **Reference research** | 4 reference systems integrated | Reference files in /impeccable/reference/ | Tie (both access live/curated sources) |

### Unique Strengths: Sidecoach

1. **Deterministic flow routing** - slash commands map directly to flow chains (no ambiguity)
2. **Decision memory** - FlowHistory logs rationale, anti-patterns, metrics per flow
3. **Type safety** - FlowId union types, strict TS compilation
4. **Structured tier orchestration** - Tier 1-4 explicit, with prerequisite validation
5. **Flow-level metrics** - auditing, critique scoring, responsive breakpoint testing built-in
6. **Reference system abstraction** - 4 lean interfaces (FontshareReference, ComponentGalleryReference, DesignReferencesSystem, MotionReference) vs. embedded file knowledge

### Unique Strengths: Impeccable

1. **User discovery** - /impeccable with no args shows 23 commands clearly grouped by intent
2. **Deployed wisdom** - 35+ reference files with deep expertise (typography.md, color-and-contrast.md, etc.)
3. **Mature commands** - craft/shape/teach/document/extract are battle-tested in real projects
4. **Interactive setup** - /impeccable teach walks PRODUCT.md creation interactively
5. **Fast entry point** - users can start immediately with /impeccable craft <feature>
6. **Established naming** - 23 command names are now industry-learned (craft, audit, critique, polish)
7. **Live iteration** - /impeccable live enables in-browser visual exploration (Sidecoach equivalent not yet implemented)

---

## 4. Consolidation Opportunity Assessment

### Which Sidecoach Capabilities Could Replace Impeccable

| Sidecoach Capability | Replaces Impeccable | Gap to Close | Effort | Priority |
|---------------------|-------------------|--------------|--------|----------|
| **Flows A-I (Tier 1-2 research + execution)** | craft + shape + document + extract | Embed 7 domain rules, wire reference systems | Medium (2-3 days) | High |
| **Flow J (Tactical Polish)** | polish + make-interfaces-feel-better | Embed 14-point checklist rules | Low (1 day) | High |
| **Flow K (Multi-Lens Audit)** | audit command (5-dimension scan) | Wire impeccable-detect bridge, anti-pattern checks | Low (1 day) | High |
| **Flow L (Design Critique)** | critique command (12-rule pass) | Embed 12-rule framework + category-reflex | Medium (1-2 days) | High |
| **Flow M (Responsive Validation)** | adapt command (responsive fixes) | Breakpoint extraction from DESIGN.md | Low (1 day) | High |
| **Flow N (Rapid Iteration Refined)** | live command (visual iteration) | Browser iteration wiring (Improv integration) | Medium (2-3 days) | Medium |
| **Flows O-P (Special: Clone/Constraint)** | none (Impeccable doesn't have clone/constraint as explicit commands) | N/A | N/A | Low |

**Conclusion:** Sidecoach can **functionally replace Impeccable's command vocabulary** if the 7 domain reference files are embedded into flows A-M. The structure exists; the content transfer is the work.

### Which Impeccable Capabilities Should Sidecoach Adopt

| Impeccable Capability | Currently in Sidecoach | Should Add | Effort | Why |
|---------------------|----------------------|-----------|--------|-----|
| **teach command** (PRODUCT.md setup) | No equivalent flow | Flow (pre-flight PRODUCT.md builder) | Low (1 day) | Users need guided setup before designing |
| **live command** (browser iteration) | No equivalent in Flow N | Wire live browser interaction | Medium (2-3 days) | Enable visual exploration like Impeccable |
| **AI slop detection** (category-reflex) | Not wired into flows | Embed into L, J, S, T | Medium (1-2 days) | Prevent generic-looking output |
| **Copy workflows** (clarify command) | Implicit in J (Polish) | Dedicated copy review step | Low (1 day) | UX writing quality gate |
| **Interactive menu** | /sidecoach list (basic) | Expand to interactive prompt like /impeccable | Low (1 day) | Better discoverability |

**Conclusion:** Sidecoach should adopt **live iteration** (browser wiring) and **teach/copy workflows** to match Impeccable's completeness.

### Minimal Integration Surface for Coexistence

| Surface | Current State | How to Coexist |
|---------|---------------|----------------|
| **Command namespace** | Impeccable: /impeccable <cmd>, Sidecoach: /sidecoach <cmd> or / + cmd | Coexist by prefix; no conflict. Users can use either. |
| **Memory systems** | Impeccable: none, Sidecoach: FlowHistory + FlowMemoryBuilder | Sidecoach can log Impeccable command invocations via adapter pattern. |
| **Reference files** | Impeccable: /impeccable/reference/ (35 files), Sidecoach: 4 interfaces | Sidecoach flows read Impeccable's .md files directly (low coupling). |
| **PRODUCT.md/DESIGN.md** | Both load them | Shared, no conflict (both read, only one writes at a time). |
| **User discovery** | Impeccable: /impeccable, Sidecoach: /sidecoach list | Both discoverable; users pick by intent. |
| **Execution model** | Impeccable: command-driven, Sidecoach: flow-driven | Flows can invoke Impeccable commands as steps (via adapter). |

**Coexistence Strategy:**
- Impeccable remains the **command reference** (23 proven workflows)
- Sidecoach becomes the **flow orchestrator** (deterministic routing, memory tracking)
- Sidecoach flows call Impeccable's logic via reference files or command adapters (transparent to user)
- No breaking changes; both systems independent

---

## 5. Architectural Comparison

### Routing Mechanisms

#### Sidecoach: Deterministic + Fallback
```
User Input
  |
parseSlashCommand() -> Match? (YES, 100% certainty)
  |
  +- YES: Get flowIds from SLASH_COMMANDS map
  |   |
  |   v
  |   Execute flow chain (e.g., /research -> [flowA, flowB, flowC, flowD, flowE, flow4, flow7])
  |
  +- NO: Fall back to intentDetector.detect()
         |
         |- Detects intent (low-med confidence 62.5%)
         |
         v
         Route to most-likely flow

Certainty: Slash commands = 100%, intent detection = 62.5%
Speed: Slash command lookup O(1); intent detection O(n) + ML
User experience: Predictable when using slash commands; probabilistic fallback
```

**Architectural Strength:** Two-tier routing ensures deterministic primary path (slash commands) with fallback to NLU. Slash-command layer is fast and reliable.

#### Impeccable: Natural Language Discovery
```
User Input (or terminal history)
  |
User must type /impeccable <cmd>
User must know <cmd> is one of 23:
  craft, shape, teach, document, extract,
  critique, audit,
  polish, bolder, quieter, distill, harden, onboard,
  animate, colorize, typeset, layout, delight, overdrive,
  clarify, adapt, optimize,
  live
  |
  v
Impeccable skill loads PRODUCT.md/DESIGN.md
  |
  v
Execute command's logic
```

**Architectural Strength:** Single entry point (/impeccable), clear taxonomy (Build/Evaluate/Refine/Enhance/Fix/Iterate). User learns once, applies everywhere.

**Key Difference:** Sidecoach separates **routing** (slash command) from **execution** (flow handler). Impeccable combines them (command name IS the action). Sidecoach's approach is more testable and composable.

---

### State Management

#### Sidecoach: Explicit FlowHistory + Memory Store
```typescript
// Every flow execution recorded:
interface FlowExecutionResult {
  flowId: FlowId
  status: 'success' | 'needs_input' | 'error' | 'skipped'
  memory?: FlowMemoryEntry  // Decision rationale, rules applied, metrics
  checklist?: ChecklistItem[]
  artifacts?: FlowArtifact[]
}

// Memory persisted:
persistSessionMemory(results) -> ~/.claude/projects/<project>/memory/session_YYYY-MM-DD_<topic>.md
```

**Strength:** Every design decision is logged with rationale. Future sessions can see "why typography was Committed, why Restrained color". Audit trail is first-class.

#### Impeccable: No Built-in Memory
```
User runs: /impeccable craft <feature>
  |
  v
Executes workflow (craft.md reference file)
  |
  v
Returns results (text, code)
  |
  v
No log of:
  - What design laws were applied
  - What user decisions were made
  - What rules passed/failed

User must manually document in PR/git/confluence if they want to keep reasoning
```

**Weakness:** Impeccable is stateless. Multiple audit passes of the same design lose context ("was that Restrained or Committed palette?").

**Key Difference:** Sidecoach is **audit-trail first**; Impeccable is **advice-giving**. Sidecoach wins for design accountability.

---

### Extensibility Patterns

#### Sidecoach: Flow Handler Interface
```typescript
interface FlowHandler {
  flowId: FlowId
  canExecute(context: FlowExecutionContext): boolean
  execute(context: FlowExecutionContext): Promise<FlowExecutionResult>
}

// To add a new flow:
1. Define handler class: class FlowXNewHandler extends BaseFlowHandler
2. Register in orchestrator: handlerMap.set('flowX_new', () => new FlowXNewHandler())
3. Add FlowId to types.ts union
4. Add trigger patterns to flows.ts

// To wire a reference system:
handler uses: this.fontshareReference.getFontCandidates()
// Reference system swappable via interface (easy mocking, testing)
```

**Extensibility:** New flows = new handler classes. Reference systems = pluggable interfaces. Change is localized. Type-safe.

#### Impeccable: Command + Reference File
```
To add a new command (e.g., /impeccable hypercharge):

1. Add to CLAUDE.md entry table
2. Create reference/hypercharge.md with steps
3. Implement command logic in skill (if procedural step needed)
4. Update command taxonomy in UI

// No code change needed if command is pure reference file
// Code change needed if command has interactive steps (teach, shape, etc.)
```

**Extensibility:** Reference files are data; commands are code. Easier to add reference-only workflows; harder to add procedural ones. Less type-safe (files are untyped).

**Key Difference:** Sidecoach = "extend via code" (TS). Impeccable = "extend via data + code" (.md + SKILL.md). Sidecoach's approach scales better for complex flows; Impeccable's is faster for simple additions.

---

### Data Flow Comparison

#### Sidecoach
```
Input (utterance + context)
  |
  v
Step 0: Parse slash command (deterministic)
  |
  v
Step 1: Get flow chain from SLASH_COMMANDS map
  |
  v
Step 2: Load project context (PRODUCT.md, DESIGN.md)
  |
  v
Step 3-N: Execute flow handlers in sequence
  - Flow A: Brand Verification -> sets register, caches design laws
  - Flow B: Component Research -> invokes component-gallery-reference
  - ...
  - Flow J: Polish -> applies rules from cache
  |
  v
Output: Merged results from all flows + single FlowHistory entry
  |
  v
Persist: session memory written to .claude/projects/<project>/memory/
```

**Strength:** Linear flow with explicit prerequisites. Each flow produces outputs that become inputs for next. Memory tracks the entire chain.

#### Impeccable
```
Input: /impeccable <cmd> [target]
  |
  v
Load PRODUCT.md (if exists) + DESIGN.md (if exists)
  |
  v
Switch on cmd:
  - If 'craft': invoke craft.md workflow
  - If 'audit': run audit.md checklist
  - ...
  |
  v
Output: Advice/code/checklist from command
  |
  v
No built-in chaining; user must manually run next command
```

**Strength:** Simple, focused per-command execution. User controls sequence.
**Weakness:** User must remember chain order (craft before audit makes sense; audit before shape does not).

---

## 6. Production Readiness Assessment

### Sidecoach Maturity

| Dimension | Status | Evidence |
|-----------|--------|----------|
| **Code compilation** | READY | npm run build -> zero TypeScript errors on 36 flows |
| **Flow execution** | FUNCTIONAL (8/9 passing) | Flow A-I memory integration test 88.9% pass rate |
| **Intent detection** | ACCEPTABLE (62.5% accuracy) | Fallback only; primary path is slash commands (100% reliable) |
| **Reference systems** | PARTIAL (interfaces defined, not wired) | component-gallery, fontshare, design-references, motion-reference exist but flows don't invoke them yet |
| **Design law embedding** | NOT STARTED | 7 domains (typography, color, spatial, motion, interaction, responsive, ux-writing) need extraction from Impeccable |
| **Memory persistence** | IMPLEMENTED | FlowHistory + FlowMemoryBuilder + SessionMemoryWriter functional |
| **Type safety** | STRICT | FlowId union type, FlowHandler interface enforced, TS compilation strict |
| **User discovery** | MINIMAL | /sidecoach list works; interactive help not rich |

**Verdict:** Sidecoach is **infrastructure-complete, intelligence-pending**. Ready to execute flows (proven by tests); not ready to execute design tasks without Impeccable's domain knowledge embedded.

### Impeccable Maturity

| Dimension | Status | Evidence |
|-----------|--------|----------|
| **User discovery** | READY | /impeccable lists 23 commands clearly grouped |
| **Reference files** | READY | 35 reference files with deep expertise deployed |
| **Command logic** | READY | craft/shape/audit/critique/polish battle-tested in real projects |
| **Memory/audit trail** | NOT IMPLEMENTED | No decision logging; stateless execution |
| **Routing determinism** | PARTIAL | User must know 23 command names; discovery helps but not automation-friendly |
| **Type safety** | WEAK | Reference files are .md (untyped); SKILL.md is TS but commands are strings |

**Verdict:** Impeccable is **wisdom-complete, infrastructure-weak**. Ready to guide design; not ready for autonomous orchestration or decision tracking.

---

## 7. Consolidation Roadmap

### Phase 1 (In Progress): Infrastructure + Intelligence Extraction
**Effort:** 4-5 days  
**Goal:** Embed Impeccable's 7 domain reference files + 23 command logics into Sidecoach flows

**Tasks:**
1. Extract context loader (PRODUCT.md/DESIGN.md parsing) -> Flow A pre-flight
2. Extract register system (brand vs. product) -> Flow A detection
3. Extract 7 domain rules into flow decision logic:
   - Typography (Flow C, S)
   - Color & Contrast (Flow F, I, K, L)
   - Spatial (Flow F, J, R)
   - Motion (Flow E, H, T)
   - Interaction (Flow G, H, I, J)
   - Responsive (Flow M, N, R)
   - UX Writing (Flow J, L, N)
4. Wire 4 reference systems into flows (B, C, D, E)
5. Embed 27 anti-pattern rules into audit flows (K, M, N)
6. Embed 12-rule critique framework into Flow L
7. Embed AI slop detection (category-reflex) into refine flows (J, L, S, T)

**Deliverable:** Sidecoach flows contain all Impeccable knowledge; users trigger flows naturally without slash commands.

### Phase 2: User Discovery + Live Iteration
**Effort:** 2-3 days  
**Goal:** Match Impeccable's UX and add live browser capabilities

**Tasks:**
1. Enhance /sidecoach list to show rich taxonomy (Build/Execute/Refine/Validate/Iterate)
2. Implement /sidecoach teach (PRODUCT.md guided setup)
3. Implement Flow N live browser iteration (Improv integration)
4. Add interactive menu equivalent to /impeccable (no-arg help)

### Phase 3: Coexistence + Deprecation Path
**Effort:** 1 day  
**Goal:** Define how Sidecoach and Impeccable coexist

**Tasks:**
1. Document command -> flow mappings in public reference
2. Create adapter layer so Impeccable can call Sidecoach flows (or vice versa)
3. Optional: Soft-deprecate Impeccable command in favor of Sidecoach flows (users can still use /impeccable craft but it routes to Sidecoach internally)

---

## 8. Recommendations

### For Sidecoach
1. **Complete Phase 1** (4-5 days) to embed domain knowledge. This unlocks the most value: users can design naturally ("Design a button") without learning slash commands.
2. **Add Phase 2 UX enhancements** (2-3 days) to match Impeccable's discoverability.
3. **Implement live iteration** (Flow N wiring to browser) to close the last feature gap.

### For Impeccable
1. **Keep it as reference library** even after Sidecoach consolidation. The 35 reference files are valuable documentation.
2. **Add memory integration** (1-2 days) so /impeccable audit results flow into Sidecoach FlowHistory automatically.
3. **Optional deprecation** after Sidecoach Phase 1: soft-redirect /impeccable craft to Sidecoach's Flow 1 (Design Component) with note "This logic is now in Sidecoach; same behavior, better transparency."

### For Users
1. **After Sidecoach Phase 1:** Prefer Sidecoach for new design work (natural language + memory tracking).
2. **Keep Impeccable around** for reference during design (28+ reference files are invaluable learning material).
3. **Use /sidecoach list** to discover flows; use /sidecoach <cmd> to trigger them.

---

## 9. Summary Table: Consolidation Effort by Sidecoach Flow

| Flow | Consolidation Effort | Critical Gaps | Phase | Priority |
|------|-------------------|-----------------|-------|----------|
| A (Brand Verify) | 1-2 days | Context loader, register detection | Phase 1 | High |
| B (Component Research) | 1 day | Wire component-gallery-reference | Phase 1 | High |
| C (Font Research) | 1 day | Wire fontshare-reference + embed typography domain | Phase 1 | High |
| D (Design References) | 1 day | Wire design-references + AI slop detection | Phase 1 | High |
| E (Motion Patterns) | 1 day | Wire motion-reference + embed motion domain | Phase 1 | High |
| F (Design Tokens) | 1 day | Extract DESIGN.md parsing, token validation | Phase 1 | High |
| G (Component Implementation) | 1 day | Embed interaction domain, component semantics | Phase 1 | High |
| H (Motion Integration) | 1 day | Motion domain + easing rules | Phase 1 | High |
| I (Accessibility) | 1 day | WCAG 2.1 AA rules, 8 interactive states | Phase 1 | High |
| J (Tactical Polish) | 1 day | Embed 14-point make-interfaces-feel-better checklist | Phase 1 | High |
| K (Multi-Lens Audit) | 1 day | 27 anti-pattern rules, 5-dimension scan, impeccable-detect | Phase 1 | High |
| L (Design Critique) | 1 day | 12-rule LLM critique, category-reflex check | Phase 1 | High |
| M (Responsive) | 1 day | Breakpoint validation, responsive domain | Phase 1 | High |
| N (Rapid Iteration) | 2-3 days | Live browser wiring (new capability) | Phase 2 | Medium |
| O-P (Clone/Constraint) | 1-2 days | Impeccable has no equivalent; extend Sidecoach | Phase 1 | Low |
| Q (Migration) | 1 day | Dependency mapping, migration gates | Phase 1 | Low |
| R-T (Specialized) | 3-4 days | Layout, typography, motion domain focus | Phase 2 | Medium |
| U-V (Curate/All-Seven) | 2-3 days | Meta-flows combining others | Phase 2 | Low |
| Legacy 1-14 | 1-2 days | Deprecate or align with new tier system | Phase 3 | Low |

**Total Effort:** 26-32 days (4-5 weeks) to complete Phase 1 consolidation.

---

## 10. Conclusion

Sidecoach and Impeccable are complementary, not competitive:

- **Impeccable = Design wisdom deployed** (23 proven commands, 35 reference files)
- **Sidecoach = Design infrastructure emerging** (36 structured flows, deterministic routing, memory tracking)

The consolidation in progress will make **Sidecoach the primary orchestrator** while **Impeccable becomes the knowledge base**. Post-consolidation:

- Users trigger Sidecoach flows naturally (no slash commands needed)
- Flows silently invoke Impeccable's logic (reference files + domain rules)
- Every decision is logged with rationale (audit trail)
- Type safety is enforced end-to-end (TS compilation)

**Estimated timeline to production parity:** 4-5 weeks (Phase 1), then 2-3 weeks (Phase 2) = 6-8 weeks to full feature parity with richer UX.

---

**Compiled by:** Claude (Haiku 4.5)  
**Date:** 2026-05-22  
**Collaborator:** Jonah
