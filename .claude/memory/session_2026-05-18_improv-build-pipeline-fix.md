---
name: session-2026-05-18-improv-build-pipeline-fix
description: Audited improv source/dist drift (found zero), added npm run deploy + deploy.sh to sync built bundle to install dir AND every project with an .improv marker, retired the misleading never-build memory
type: project
relates_to: [session_2026-05-18_queued-tasks-live-add.md]
---

## 2026-05-18 Improv build pipeline reconciliation

### Context
A `feedback_improv_dist_is_source_of_truth.md` memory from 2026-05-07 forbid running `node build.js` on improv, claiming dist had hand-patches not present in TS source. That rule meant edits to TS source never went live, and added a `_buildQueueRow` change earlier today couldn't be verified visually.

User reaction was correct: forbidding the build is a workaround, not a fix. The right answer is to fix the pipeline so building from source is always safe and produces the expected dist.

### What we found

Audit steps:
1. Backed up both dist directories (claude-dotfiles/improv/dist and ~/.claude/improv/dist) to `.backups/improv-dist-20260518-080711/`.
2. Built source to a scratch path with esbuild, unminified for readability, then minified for size-comparison.
3. Compared the scratch (minified) bundle against the live `~/.claude/improv/dist/improv-core.js`:
   - Size delta: +1738 bytes (+0.63%), accounted for by today's `_buildQueueRow` + `_appendQueueRowAnimated` additions.
   - All sampled feature strings matched (`shadowRoot`, `claudebar-glow`, `screen-glow`, `data-improv`, `Mark Done`, `watch improv`, etc.).
   - No string appeared in live that didn't also appear in scratch (modulo dedup artifacts).
4. dist mtimes confirmed both dist files had been rebuilt today at 04:54 - the user has actually been running build.js recently. The memory was describing a 2026-05-07 moment, not the current state.

**Conclusion:** zero drift. The pipeline is healthy. The forbidden-build rule was a phantom.

### What changed

1. **New `deploy.sh`** at `improv/deploy.sh`. After `node build.js`, syncs `dist/improv-core.js` (+ adapter bundles) to:
   - `~/.claude/improv/dist/` (what the WS server serves at http://localhost:9223/improv-core.js for fresh injections)
   - Every project under `~/Documents/Github/*` with an `.improv` marker file (their locally-installed copy, e.g. `dishplayscapes/improv-core.js`, `blueprint-tracker/public/improv-core.js`)
   
   Reads the marker JSON's `dir` field to find the project's install location. Skip-syncs adapters with `--core-only`.

2. **New npm scripts** in `improv/package.json`:
   - `npm run deploy` -> `node build.js && bash deploy.sh`
   - `npm run deploy:core` -> `node build.js --core-only && bash deploy.sh --core-only`

3. **Smoke-tested the deploy:**
   ```
   synced -> /Users/spare3/.claude/improv/dist/improv-core.js
   synced -> /Users/spare3/.claude/improv/dist/improv-react.js
   synced -> /Users/spare3/.claude/improv/dist/improv-vue.js
   synced -> /Users/spare3/.claude/improv/dist/improv-svelte.js
   synced -> /Users/spare3/Documents/Github/blueprint-tracker/public/improv-core.js
   synced -> /Users/spare3/Documents/Github/dishplayscapes/./improv-core.js
   synced -> /Users/spare3/Documents/Github/claude-dotfiles/public/improv-core.js
   synced -> /Users/spare3/Documents/Github/glass-test/docroot/improv-core.js
   ```
   Four projects + install dir, single command. Earlier today this was a manual `cp` to each.

4. **Memory updates:**
   - New: `~/.claude/projects/.../memory/feedback_improv_source_canonical.md` - canonical rule: source is source of truth, run `npm run deploy`, never hand-patch dist.
   - Old: `feedback_improv_dist_is_source_of_truth.md` rewritten to a single-line "SUPERSEDED, see [[feedback_improv_source_canonical.md]]" pointer with `superseded_by` frontmatter.
   - MEMORY.md index updated to point at the new file.

5. **Today's queued-tasks rise-in animation** (from earlier session memory `session_2026-05-18_queued-tasks-live-add.md`) is now live in all four project bundles. Browser reload picks it up.

### Guardrail (deferred)

Considered adding a stale-bundle warning: when the WS server hands out `/improv-core.js`, compare `dist/improv-core.js` mtime against `core/*.ts` mtimes and prepend `console.warn("improv bundle is older than source - run npm run deploy")` if dist is older.

Not building it now. The deploy command is one-liner muscle memory; if we catch this failing again, that's when the guardrail earns its complexity.

### Files changed
- `improv/package.json` (added `deploy` and `deploy:core` scripts)
- `improv/deploy.sh` (new - sync bundle to install + project copies)
- `improv/dist/improv-core.js` (rebuilt from source; includes today's `_buildQueueRow` and `_appendQueueRowAnimated`)
- `improv/dist/improv-{react,vue,svelte}.js` (rebuilt from source, no behavioral change expected)
- `~/.claude/improv/dist/` (synced from rebuilt dist)
- Four `.improv` marker project copies (synced from rebuilt dist)
- `~/.claude/projects/.../memory/feedback_improv_source_canonical.md` (new)
- `~/.claude/projects/.../memory/feedback_improv_dist_is_source_of_truth.md` (rewritten as SUPERSEDED pointer)
- `~/.claude/projects/.../memory/MEMORY.md` (index updated)

### Backup
`~/Documents/Github/claude-dotfiles/.backups/improv-dist-20260518-080711/` holds the pre-rebuild snapshot of both dist directories (claude-dotfiles + ~/.claude/improv) in case the rebuild lost anything subtle. Audit found nothing missing, so the backup is just insurance.

Collaborator: Jonah Cohen
