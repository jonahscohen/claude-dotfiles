# Dotfiles tasks

<!-- Managed by /task-list skill. Hand-edits welcome; preserve the structure. -->
<!-- Last ID: T-0004 -->

## dotfiles
### Active
- [ ] T-0001 [P2] 2026-05-25 research QuiverAI implementation methods
- [ ] T-0002 [P2] 2026-05-25 Investigate subagent-aware nudge scoping for memory-nudge.sh and verify-before-done.sh. Parent agents can dispatch subagents with explicit "do not write memory" instructions, but the hooks still nudge the subagent ~9 times per task. Subagent correctly ignores, just wastes tokens. Approaches: (a) detect Agent-tool context via env var if Claude Code sets one (CLAUDE_AGENT_ID, SUBAGENT_TYPE, parent PID inspection) - cleanest if it exists; (b) TTL flag file the parent touches before dispatch (~/.claude/.subagent-no-memory-nudges with 60-120s mtime check) - simpler but fragile across concurrent agents. Start by reading Claude Code's process/env model to see what's exposed to hooks. Origin: Agent B's run during dark-mode hook-tightening on 2026-05-25.
- [ ] T-0003 [P2] 2026-05-25 bash-guard.sh cmux-eval gate matches on substrings ANYWHERE in the command, including commit message bodies. Self-blocked a git commit today because the body text described "cmux eval" patterns and referenced `.style` literally - the gate matched the descriptive text as if it were live JS. Fix: anchor the cmux-eval detection to actual command structure (e.g. cmux as the first executable, eval as a subcommand token before the script arg), not loose substring match. Verify the unified blocklist patterns also use command-structure context where applicable. Origin: self-block during commit 50fc1b0 today.
- [ ] T-0004 [P2] 2026-05-25 second-fix-gate.sh EXEMPT list misses global project memory. The exempt check is `if any(e in file_path for e in EXEMPT)` with `EXEMPT = [".claude/memory/", ...]`. The global memory dir at `~/.claude/projects/<project>/memory/` doesn't contain the substring `.claude/memory/` (it has `.claude/projects/.../memory/`), so memory writes there are treated as project file fixes by the gate. Add `/projects/` paths to EXEMPT or use a regex check. Origin: self-fire of second-fix-gate on a memory write today.
