---
name: Destructive-ops guard hooks (deploy / DB-clobber / PR-merge)
description: New PreToolUse + UserPromptSubmit hooks block prod deploys, cross-env DB clobbers, and gh pr merge unless the user types a one-word confirmation
type: decision
relates_to: [session_2026-05-29_destructive-incidents.md]
---

Built a destructive-operations guard layer for the Bash tool, after Jonah reported two real-world near/actual disasters: (1) asked to deploy to DEV on Pantheon, the assistant promoted all the way to PROD; (2) the assistant copied a WordPress multisite DB from prod down to staging without checking a subsite existed on prod - it didn't, so the staging KRPE subsite was zeroed out. See [[session_2026-05-29_destructive-incidents.md]].

Three parallel review agents (cmux team `guardrails-review`) confirmed: the two incidents were never recorded in any beat; the existing guard layer (`bash-guard.sh`) had NO coverage for deploys, DB sync, or PR merges; and mapped the exact dangerous command shapes (terminus, acli, wp-cli, drush, mysql, gh).

**What shipped (collaborator: Jonah):**
- `claude/hooks/destructive-ops-guard.sh` - PreToolUse Bash hook, three tiers:
  - Tier 1 production/destructive deploys: `terminus env:deploy *.live`, `--sync-content`, `env:wipe|site:delete|backup:restore`
  - Tier 2 cross-env DB clobbers: `terminus env:clone-content *.live|*.test <lower>`, `acli (pull|push):(database|db)`, `wp db import|reset|drop|clean`, `wp site delete|empty`, `terminus wp *.* -- db import|...`, `drush sql:sync|sql-drop`, `drush sql:cli < dump`, `mysql ... < *.sql`, `cat *.sql | mysql`, `mysqladmin drop`, and DROP/TRUNCATE inside `wp db query` / `drush sql:query` / `mysql -e` (keyword honored only when a real DB client is invoked outside quotes)
  - Tier 3: `gh pr merge` (all variants; `--admin` called out; `--disable-auto` exempt)
- `claude/hooks/destructive-confirm-detect.sh` - UserPromptSubmit hook; the ONLY writer of the approval flag.
- `claude/hooks/test-destructive-ops-guard.sh` - 74 cases, all pass.
- Wired both into `claude/settings.json` (Bash matcher + UserPromptSubmit group); symlinked into `~/.claude/hooks/`; added to `install.sh` copy + deactivate lists.

**Override model (Jonah's choice - "ask for one word confirmation"):** Guard blocks and writes `~/.claude/.destructive-op-pending` (epoch + base64 of the exact command). Claude must stop and ask the user to confirm. The user's typed `confirm` is caught by the UserPromptSubmit hook, which promotes pending -> `~/.claude/.destructive-op-approved`. The next IDENTICAL command is allowed exactly once, then both flags are consumed. **Why this design:** Claude cannot self-arm - only the UserPromptSubmit hook (reacting to real human input) writes the approved flag - so the gate is mechanical, not dependent on Claude's good behavior. Approval is command-specific (base64 match) and expires in 10 minutes.

**Why a separate hook, not folded into bash-guard.sh:** independently testable, specific block messages, mirrors the existing one-concern-per-script + test-*.sh convention.

**Scope decision (Jonah's choice):** prod + destructive only. Routine `terminus env:deploy *.test/.dev` and `git push pantheon` are NOT gated. Enforcement surface: bash-guard-style hook only (not the PATH wrapper from the reference screenshot) - the hook covers the real AI threat (Bash tool) and matches the existing architecture; it does not constrain Jonah's own manual shell.

**Revisit when:** a needed deploy/DB workflow proves too noisy (tune patterns), or we want to also gate routine non-prod deploys, or add the `gh` PATH wrapper as belt-and-suspenders for the human shell.

**Heredoc false-positive caught live + fixed:** the first attempt to append the MEMORY.md index via `cat >> MEMORY.md <<'EOF' ... terminus env:deploy ... EOF` was blocked by the guard - the heredoc BODY mentioned a dangerous verb. Ported bash-guard.sh's heredoc-body stripping into the guard's SANITIZED step (verb matching ignores heredoc bodies; SQL keywords still matched against raw CMD so a real `mysql db <<EOF DROP... EOF` still blocks). This is the "hooks evolve" pattern - a documented limitation bit immediately and got hardened.

**Known limitation:** install.sh's settings merge dedups at the matcher-group level, so a re-install on a merged-settings machine (not symlinked) won't append the new guard if the Bash group already exists. This machine symlinks settings.json so it is unaffected; pre-existing limitation, not introduced here.

Verification: `bash ~/.claude/hooks/test-destructive-ops-guard.sh` -> PASS 71 FAIL 0; live hook blocks `terminus env:deploy acme.live`, allows `acme.test`; `bash -n install.sh` clean; settings.json parses.

Files touched:
- claude/hooks/destructive-ops-guard.sh (new)
- claude/hooks/destructive-confirm-detect.sh (new)
- claude/hooks/test-destructive-ops-guard.sh (new)
- claude/settings.json (PreToolUse Bash + UserPromptSubmit wiring)
- install.sh (copy list, deactivate file-removal list, PreToolUse marker list)
- ~/.claude/hooks/ (three symlinks)
