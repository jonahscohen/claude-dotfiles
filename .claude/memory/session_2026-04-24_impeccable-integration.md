---
name: Integrate Impeccable design plugin into claude-dotfiles workflow
description: Wired the impeccable@impeccable plugin into the dotfiles so it's enabled globally, documented in README, announced by install.sh, and made non-optional for design/QA work via CLAUDE.md.
type: project
---

Collaborator: Jonah Cohen

# What changed

- `claude/CLAUDE.md`: new `## Design Work and Impeccable (MANDATORY for UI tasks)` section, inserted between the existing Verification Protocol and Code Quality sections. Covers:
  - Project setup: PRODUCT.md required, DESIGN.md strongly recommended, `/impeccable teach` is the interactive setup command that writes them.
  - Entry-command routing table mapping intent ("net-new build", "tone down loud UI", "production-ready sweep") to the correct `/impeccable <command>`.
  - Mandatory QA triad before declaring UI work done: `/impeccable audit` -> `/impeccable critique` -> `/impeccable polish`, with a carve-out for trivial edits.
  - Scope carve-out: impeccable is not for backend/non-UI work.
- `README.md`: new `## Design skills: Impeccable` section after the contents table. Explains the plugin, points to the CLAUDE.md routing, and includes a first-run walkthrough (open project -> say "design me X" -> Claude notices missing PRODUCT.md -> runs `/impeccable teach` -> resumes with craft -> runs audit/critique/polish before reporting done).
- `install.sh`: summary block gained a "Design workflow (Impeccable)" section after the existing manual-steps list. Flags the plugin as enabled, points at `/impeccable teach` as the per-project first step, and mentions the bare `/impeccable` menu for discovery.
- `claude/settings.json`: no changes needed. `impeccable@impeccable` is already `true` in `enabledPlugins` and `extraKnownMarketplaces.impeccable.autoUpdate` is already `true` (set in commit bc1e4fd).

# Why

User wants anyone installing the dotfiles to learn how to use impeccable confidently AND to have Claude automatically leverage the skills whenever asked to design or QA its own work. The plugin was enabled but invisible in docs and not wired into Claude's operating rules, so in practice it only ran when the user typed `/impeccable` explicitly. CLAUDE.md was the leverage point: making the routing mandatory (PRODUCT.md check, entry-command selection, audit+critique+polish gate) turns impeccable into the default design/QA pipeline.

# How

- Plugin already loads via `~/.claude/settings.json` -> `enabledPlugins` + `extraKnownMarketplaces` (autoUpdate true). Cache has v1.2.0 (older split-skill layout) and v3.0.0 (consolidated single skill with 23 sub-commands). Docs reference the v3.0.0 shape `/impeccable <command>` because that's the canonical upstream and where autoUpdate lands. v1.2.0 users still get the same commands as individual skills - the trigger keywords overlap.
- CLAUDE.md is symlinked by install.sh to `~/.claude/CLAUDE.md`, so the routing applies globally across every project on every machine.
- Did NOT auto-run `/impeccable teach` from install.sh. teach is interactive (asks about register, users, brand, anti-references) and writes to the current project root. Running it from the installer would either hang on input or write PRODUCT.md into the dotfiles repo itself. Left it as a one-line pointer in the summary instead.

# Files touched

- `claude/CLAUDE.md`
- `README.md`
- `install.sh`
- `.claude/memory/MEMORY.md` (index entry)
