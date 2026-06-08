---
name: Vendor lotus into dotfiles as an official component
description: Plan + decision to vendor the lotus Figma-plugin source into claude-dotfiles/lotus and wire it into install.sh like justify
type: decision
relates_to: [session_2026-06-08_lotus-mcp-registered.md, session_2026-06-07_lotus-mcp-registration-fix.md]
---

Collaborator: Jonah. Started 2026-06-08.

User asked to "merge lotus into dotfiles as an official component." Chose **vendor full source in-repo** (AskUserQuestion) over reference-external / git-submodule.

**Template: justify** (the exact analog). Justify lives in `$REPO_DIR/justify`, carries its own `justify/install.sh` (copy/build + register MCP in `~/.claude.json` + install skill with `__JUSTIFY_SRC__` path substitution), invoked from top-level install.sh via `if picked justify; then bash "$REPO_DIR/justify/install.sh"`.

**Key facts that shaped the approach:**
- MCP registration MUST go in `~/.claude.json` (global), NOT `claude/settings.json` - this Claude Code version does not reliably read MCP defs from settings.json (see [[session_2026-06-07_lotus-mcp-registration-fix.md]]). The old settings.json lotus entry was already removed.
- Lotus source is small (~580K src, 97 tracked files); node_modules (87M) + dist are gitignored in lotus's own repo and will be rebuilt by install. Vendor the WORKING TREE (31 dirty files newer than HEAD = what actually runs), not `git archive HEAD`.
- Lotus builds: root `npm run build` (webpack -> dist/code.js, the Figma plugin) and `mcp-server` `npm run build` (tsc -> dist/server.js, the MCP+WS bridge on 9527).
- Unlike justify (copied to ~/.claude/justify), lotus is a 138M app -> build IN PLACE in `$REPO_DIR/lotus` (like tilt-lab), register MCP pointing at `$REPO_DIR/lotus/mcp-server/dist/server.js`.
- Node path: compute `command -v node` at install time and bake the absolute path (robust against Claude Code spawn-PATH issues the fix-beat hit, while staying per-machine portable).

**Excluded from vendor:** `.git`, `node_modules`, `dist`, `*.log`, `.DS_Store`, and lotus's own `.claude`/`.claude-plugin` (keep dotfiles' beats authoritative; don't import the plugin's separate memory/skills).

**Plan (each step has a verify):** 1) rsync vendor -> verify src present/no node_modules. 2) version skill to claude/skills/lotus/SKILL.md, templatized + doc-debt fixed. 3) lotus/install.sh (bash -n). 4) wire top-level install.sh KEYS/status/deactivate/dispatch/picked-block/--help (bash -n, --help lists lotus). 5) .gitignore lotus dist+logs. 6) run --only lotus -> server answers initialize, ~/.claude.json has lotus@repo-path, skill installed.

Status: DONE + verified.

**What shipped:**
- Vendored working tree -> `lotus/` (88 source files, 932K; node_modules/dist/logs/.DS_Store/.claude excluded). lotus's own `.gitignore` came along, so built `dist/`/`node_modules` stay untracked (confirmed via `git check-ignore`).
- `claude/skills/lotus/SKILL.md` - templatized (`__LOTUS_SRC__`), doc-debt fixed to `~/.claude.json`.
- `lotus/install.sh` - builds plugin (webpack) + mcp-server (tsc) in place, registers MCP in `~/.claude.json` with the absolute `command -v node` path baked in, installs the skill with the repo path substituted.
- `install.sh` wired: KEYS/TITLES/DESCS/FILES/DIRS, PICKS=**0** (off by default - Figma-specific, opt-in), status check, `deactivate_lotus` (removes skill + MCP entry, leaves vendored source), deactivate dispatch, `picked lotus` block, `--help` Tools line.

**Verification (real probes):** `./install.sh --only lotus --yes` built both halves clean; `~/.claude.json` lotus entry points at `<repo>/lotus/mcp-server/dist/server.js` with absolute nvm node; skill installed with 0 placeholders left; the repo-built `server.js` spawned and bound the **WS bridge on 9527 (LISTEN)** - the project's established "healthy server" criterion (macOS lacks `timeout`, so the raw stdio handshake echo was a harness artifact, not a defect). `bash -n` clean on both scripts; `--help` lists lotus; git add set = 88 source files, 0 artifacts.

**Decisions worth keeping:** off-by-default (PICKS=0) because it's Figma-specific; build-in-place (not copied to ~/.claude) because the app is large, like tilt-lab; absolute node path baked at install time (portable per-machine AND avoids the spawn-PATH failure the fix-beat hit).

Files: lotus/** (vendored, 88 files), claude/skills/lotus/SKILL.md, lotus/install.sh, install.sh.
