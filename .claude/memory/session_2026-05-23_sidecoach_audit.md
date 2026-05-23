---
name: Sidecoach Audit Complete - Gap Analysis (2026-05-23)
description: Comprehensive audit reveals 85% backend complete, 0% accessible; primary gap is SKILL.md creation and entry-point wiring
type: project
relates_to: [session_2026_05_23_handoff_for_next_session.md]
supersedes: []
superseded_by: []
---

# Sidecoach Audit: Complete on Paper vs Deliverable

## Status Summary

**Codebase:** 85% infrastructure complete, all compiles with zero TypeScript errors
**Accessibility:** 0% - no SKILL.md, not registered in settings, no user-facing commands
**Overall:** Production-ready backend with zero frontend visibility

## What Exists (Fully Implemented)

### Code Complete
- **36 flow handlers** (A-V + legacy 1-14): 8.3MB, fully typed, compiled
- **159-rule validation framework**: extended-domain-validator.ts (77.7KB), 10 design domains
- **5 reference systems**: fontshare, component-gallery, design-references, category-reflex, motion-patterns
- **Complex orchestration**: sidecoach-orchestrator.ts (42.2KB) with intent detection, flow composition, conditional routing
- **Entry point system**: SidecoachEntryPoint (370+ lines) with NL routing, command parsing, caching
- **Session memory**: persistent context tracking with FlowMemoryBuilder
- **Background daemon**: sidecoach-daemon.sh + sidecoach-monitor.js for silent flow execution

### Build Artifacts
- `npm run build` → tsc → 0 errors
- 236 compiled files in dist/
- TypeScript strict mode enabled
- All types correct

### Infrastructure (Hooks Installed But Not Wired)
- `~/.claude/hooks/sidecoach-sessionstart.sh` - launches daemon, creates IPC pipe
- `~/.claude/hooks/sidecoach-postuserp.sh` - monitors user utterances
- `~/.claude/hooks/sidecoach-postresponse.sh` - injects results

## Critical Gap: SKILL.md Missing

**What's missing:** `~/.claude/skills/sidecoach/SKILL.md`

**Why it matters:**
- Skills are primary entry point for Claude to discover commands
- Without SKILL.md, `/sidecoach` command doesn't exist
- SkillSearch mechanism relies on SKILL.md to register
- Current architecture has entry point + orchestrator built but never invoked by user

**Current state:** Two parallel paths:
1. **Daemon path (implemented)**: Silent background execution, results injected invisibly
2. **User-facing path (built but not wired)**: SidecoachEntryPoint + SidecoachCommand + orchestrator ready to execute, no way to invoke

## What Must Be Created (4-hour task)

### Phase 1: SKILL.md Creation
- Command definitions: `/sidecoach list`, `/sidecoach shape`, `/sidecoach craft`, etc.
- Intent keywords for NL routing
- Phase grouping (Research A-E / Implement F-I / Review J-V / Special O-V)
- Example usage for each major flow
- Integration with PRODUCT.md + DESIGN.md

### Phase 2: Skill Handlers
- Wire SKILL.md commands → SidecoachEntryPoint.process()
- Handle discovery mode (/sidecoach list)
- Handle teach command (interactive onboarding)
- Call FlowExecutionEngine for flow execution

### Phase 3: Integration Testing
- Test `/sidecoach list` discovers flows
- Test `/sidecoach shape` runs Brand Verify + Component Research
- Test `/sidecoach craft button` runs Component Implementation
- Test free-form NL: "help me research components" → flow B

### Phase 4: Documentation
- Update README.md
- Add PRODUCT.md (register, users, brand)
- Add DESIGN.md (colors, typography, tokens)
- Create quick-start guide

## Files Affected

**Core (already built):**
- `/Users/spare3/Documents/Github/claude-dotfiles/sidecoach/src/` (87 files, 2.2MB)
- `/Users/spare3/Documents/Github/claude-dotfiles/sidecoach/dist/` (236 files, compiled)

**To create:**
- `~/.claude/skills/sidecoach/SKILL.md` (~500-700 lines)

**Optional polish:**
- `/Users/spare3/Documents/Github/claude-dotfiles/sidecoach/PRODUCT.md` (exists, may need expansion)
- `/Users/spare3/Documents/Github/claude-dotfiles/sidecoach/DESIGN.md` (doesn't exist)
- `/Users/spare3/Documents/Github/claude-dotfiles/sidecoach/README.md` (exists, outdated)

## Architectural Decision

**Daemon vs. User-Facing:**

Current implementation supports two modes:
1. **Background daemon** (hooks-based): Silent execution during conversation
   - Implemented: sidecoach-daemon.sh + hooks
   - Use case: Implicit flow suggestions (future feature)
   - Status: Installed but not yet active

2. **User-initiated** (skill-based): Explicit command execution
   - Code ready: SidecoachEntryPoint + SidecoachCommand + FlowExecutionEngine
   - Use case: "Coach me through a design audit"
   - Status: Built but not wired

**Recommendation:** Ship user-facing first (higher value, immediately usable). Daemon can activate later as enhancement.

## Next Steps

1. Create `~/.claude/skills/sidecoach/SKILL.md` with command definitions
2. Implement skill handler that routes commands to SidecoachEntryPoint
3. Test full command lifecycle: `/sidecoach list` → discover flows
4. Test flow execution: `/sidecoach shape` → Brand Verify + Component Research
5. Test NL routing: free-form text → intent detection → flow selection
6. Create PRODUCT.md and DESIGN.md
7. Update README.md and CLAUDE.md onboarding

## Completion Estimate

- SKILL.md creation: 2 hours
- Skill handler wiring: 1.5 hours
- Integration testing: 1 hour
- Documentation: 1.5 hours
- **Total: 6 hours to production-ready user interface**

## Audit Report

Full detailed audit with file inventories, compilation status, and technical path forward saved to:
`/Users/spare3/Documents/Github/claude-dotfiles/SIDECOACH_AUDIT_REPORT.md` (7000+ words)
