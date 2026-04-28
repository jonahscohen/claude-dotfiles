# claude-dotfiles

Portable configuration for Claude Code, Ghostty, and cmux. One script to replicate the full setup on a new Mac.

## What's included

| Directory | Contents |
|-----------|----------|
| `claude/` | Global `CLAUDE.md` instructions (including the Impeccable design/QA routing rules), `settings.json` (hooks, statusline, plugins, env), startup hook, statusline script, memory files |
| `ghostty/` | Ghostty terminal config (PolySans Neutral Mono, custom 256-color palette, transparency, blur, chained `bettercrt` + `tft` + `cursor_blaze` shaders) |
| `cmux/` | cmux settings |
| `shaders/` | In-repo copies of `bettercrt.glsl`, `tft.glsl`, and `cursor_blaze.glsl` - loaded directly by Ghostty so edits sync live |

## Design skills: Impeccable

`claude/settings.json` enables the [Impeccable](https://impeccable.style) plugin (`impeccable@impeccable`) with `autoUpdate: true`. Impeccable is a single `/impeccable` skill with 23 commands that cover the whole frontend design loop: context gathering, shaping, building, auditing, critiquing, polishing, and targeted fixes (typography, color, motion, copy, performance, responsive, accessibility).

`claude/CLAUDE.md` adds a "Design Work and Impeccable" section that makes the plugin non-optional:

- Before any design task, Claude checks for `PRODUCT.md` at the project root; if it's missing or a stub, it runs `/impeccable teach` first (interactive, writes `PRODUCT.md` and optionally `DESIGN.md`).
- For any UI task, Claude picks the right entry command (`craft`, `shape`, `polish`, `critique`, `audit`, `harden`, etc.) rather than improvising.
- Before reporting UI work complete, Claude runs the `audit` + `critique` + `polish` triad and addresses the findings. This sits on top of the existing visual-verification protocol, not in place of it.

### First-run walkthrough (per project)

1. Open a project in Claude Code.
2. Say "design me a settings page" (or anything UI-shaped). Claude notices there's no `PRODUCT.md` and runs `/impeccable teach`.
3. Answer its questions (register: brand vs product, users, brand personality, anti-references). `PRODUCT.md` and optionally `DESIGN.md` land at the project root.
4. Claude resumes the original task, usually via `/impeccable craft` for a net-new build.
5. After implementation, Claude runs `/impeccable audit`, `/impeccable critique`, `/impeccable polish`, the [`make-interfaces-feel-better`](https://github.com/jakubkrehel/make-interfaces-feel-better) 14-point checklist, and `npx @google/design.md lint` (if `DESIGN.md` exists) before declaring done.

The dotfiles installer auto-installs `make-interfaces-feel-better` via `npx skills add jakubkrehel/make-interfaces-feel-better` when the `claude` component runs. It's the tactical implementation layer (concentric border radius, `scale(0.96)` on press, tabular nums, optical alignment, etc.) that sits between Impeccable's brand strategy and DESIGN.md's tokens.

You can also invoke commands directly:

```
/impeccable                 Menu of all 23 commands (when you're not sure)
/impeccable teach           One-time project setup
/impeccable craft <thing>   Shape, build, iterate visually
/impeccable audit <thing>   Technical QA (a11y, perf, theming, responsive, anti-patterns)
/impeccable critique <thing> Design review (heuristics, cognitive load, AI-slop check)
/impeccable polish <thing>  Final design-system alignment pass
/impeccable pin <command>   Create a top-level shortcut (e.g. pin audit -> /audit)
```

The commands mentioned above that aren't in this short list (`bolder`, `quieter`, `distill`, `harden`, `colorize`, `typeset`, `layout`, `animate`, `delight`, `overdrive`, `clarify`, `adapt`, `optimize`, `onboard`, `extract`, `document`, `live`) follow the same pattern - `/impeccable <command> <target>`.



## Install

One-line install on a fresh Mac (clones into `~/Documents/Github/claude-dotfiles` by default, then launches the interactive TUI):

```bash
curl -fsSL https://raw.githubusercontent.com/jonahscohen/claude-dotfiles/main/bootstrap.sh | bash
```

Or if you've already cloned the repo (anywhere):

```bash
ampersand                  # re-launch the installer TUI from any directory (no pull)
ampersand --preset minimal # claude + memory + skills + nvm
ampersand --only memory    # just the memory subsystem
yesplease                  # same as ampersand but pulls latest from GitHub first
```

Both shortcuts are zsh functions added to your `~/.zshrc` by the `yesplease` component. `./install.sh` still works directly if you prefer.

### Cloning to a custom location

The dotfiles repo can live anywhere on disk. The Ghostty config uses a `__DOTFILES_DIR__` placeholder that the installer replaces with the actual repo path at install time, so cloning to `~/code/dots` or `/opt/dots` or anywhere else works. Three ways to set the location during a curl-bootstrap:

```bash
# 1. Environment variable
CLAUDE_DOTFILES_DIR=~/code/dots curl -fsSL .../bootstrap.sh | bash

# 2. --dir flag
curl -fsSL .../bootstrap.sh | bash -s -- --dir ~/code/dots

# 3. Default (no flags): ~/Documents/Github/claude-dotfiles
curl -fsSL .../bootstrap.sh | bash
```

If you re-run `install.sh` from a different clone location later, the `yesplease` function in your `~/.zshrc` is automatically refreshed to point at the new path.

### What you'll see

A checkbox TUI (rendered with [gum](https://github.com/charmbracelet/gum); installs it via Homebrew if missing, with your consent) lets you pick what lands on this machine:

| Component | Plain-English | What changes on disk |
|-----------|---------------|----------------------|
| `claude`  | Your Claude Code brain: **REPLACES** ~/.claude/CLAUDE.md, settings.json (with our plugin list - Impeccable, Figma, Sentry, Supabase, Discord, plus 9 more), hooks, statusline, memory. Existing files are backed up to `.backups/`. Skip if you already have your own Claude Code config you want to keep | Symlinks into `~/.claude/` |
| `memory`  | **Additive.** Bolts our memory subsystem onto an existing Claude Code: appends the Memory Discipline rules to your `CLAUDE.md` between marker comments, JSON-merges three hooks (SessionStart loader, PreCompact reminder, PostCompact reload) into your `settings.json`, and symlinks the `startup-check.sh` loader. Marker-guarded - re-runs are no-ops, and the markers can be removed cleanly to undo | Symlinks `startup-check.sh`; appends to `CLAUDE.md`; merges hooks into `settings.json` |
| `skills`  | **Additive.** Installs Anthropic Skills via `npx skills add` - currently bundles `make-interfaces-feel-better` (tactical UI polish, auto-triggers on UI keywords). Does NOT touch your CLAUDE.md, settings.json, hooks, or statusline. Safe to pick standalone if you have your own Claude Code config | Adds to `~/.claude/skills/` only |
| `statusline` | The custom prompt-bar renderer. Tick to use ours; untick to fall back to Claude Code's default. The statusLine command in `settings.json` is tolerant of a missing script, so unticking is clean - no errors, just default | Symlinks `~/.claude/statusline-command.sh` |
| `ghostty` | Your Ghostty terminal look: PolySans font, custom palette, transparency, blur | Copies `config.ghostty` into `~/Library/Application Support/com.mitchellh.ghostty/` |
| `shaders` | The cinematic Ghostty effects: CRT curvature, TFT pixel grid, blazing cursor trail | In-repo `shaders/*.glsl` + clones [ghostty-shaders](https://github.com/0xhckr/ghostty-shaders) |
| `cmux`    | cmux split-pane terminal config (powers the in-app browser preview Claude uses) | Symlinks `~/.config/cmux/settings.json` |
| `discord` | When you run `claude`, asks if you want to connect this session to your Discord channel | Appends one line to `~/.zshrc` (marker-guarded) |
| `nvm`     | Optional fix for a specific issue: if a new terminal greets you with "claude not found in PATH" even though Claude is installed, this resolves it. Harmless no-op on machines that don't use nvm. Skip if `claude` already works in fresh terminals on your machine | Appends `nvm use default --silent` to `~/.zshrc` (only fires if your zsh config already sources `nvm.sh`) |
| `yesplease` | Two one-word shortcuts: `yesplease` (pull latest from GitHub + re-launch installer) and `ampersand` (just re-launch installer, no pull). Both forward flags. Auto-migrates older installs that only had `yesplease` | Appends a marker-guarded shortcuts block to `~/.zshrc` |

### Boost an existing Claude Code setup without overwriting it

If your team already has their own `~/.claude/CLAUDE.md`, `settings.json`, hooks, etc. and you just want to bolt on specific capabilities, pick the additive components (`memory`, `skills`) and **uncheck** `claude`:

```bash
# Just the memory subsystem (rules, hooks, loader) - your CLAUDE.md and settings.json get appended/merged, never replaced
yesplease --only memory

# Memory + the UI-polish skill
yesplease --only memory,skills

# Everything additive (memory + skills + the yesplease shortcut), no overwrites
yesplease --only memory,skills,yesplease
```

What each additive component does to existing files:

- **`memory`** appends the Memory Discipline section to your `CLAUDE.md` between `<!-- claude-dotfiles:memory-discipline:begin -->` and `:end` marker comments, and JSON-merges three hooks (`SessionStart`, `PreCompact`, `PostCompact`) into your `settings.json`. Both ops are marker-guarded; re-running the installer is a no-op. To undo, delete between the markers and remove the three hook entries.
- **`skills`** writes only to `~/.claude/skills/` via `npx skills add`. Doesn't touch any other Claude Code file.

For our **plugin list** specifically (Impeccable, Figma, Sentry, etc.) into your existing `settings.json`: that's a TODO. Today the plugin list is bundled inside `claude/settings.json`, so picking `claude` means accepting that file wholesale. To layer just plugins onto your own settings, manually copy the `enabledPlugins` and `extraKnownMarketplaces` blocks from `claude/settings.json` into yours.

If `gum` is unavailable and you decline to install it, the installer falls back to a numbered text menu with the same choices.

### Plugins vs. connectors vs. extensions

The `claude` component declares which **plugins** are enabled (via `settings.json`). Two things you might expect aren't here, because they live elsewhere:

- **ClickUp** is a Claude.ai **connector** (OAuth). Authorize it once at [claude.ai](https://claude.ai) -> Settings -> Connectors and it works in every signed-in Claude session.
- **Claude in Chrome** is a **Chrome extension**. Install it from the Chrome Web Store and sign in. Per-browser, not portable through dotfiles.

The post-install summary reminds you about both.

### Non-interactive flags

```bash
./install.sh --yes                 # install everything, no prompts
./install.sh --preset minimal      # claude + nvm only
./install.sh --preset all          # same as --yes
./install.sh --preset none         # no components (useful with --dry-run)
./install.sh --only claude,nvm     # explicit subset
./install.sh --dry-run             # show resolved picks, touch no files
```

`bootstrap.sh` forwards these too: `curl -fsSL .../bootstrap.sh | bash -s -- --preset minimal`.

### Behaviors

- Symlinks for Claude Code and cmux config; existing files are backed up to `.backups/<timestamp>/` before overwriting
- Ghostty config is **copied** (not symlinked - Ghostty silently ignores symlinks in Application Support); re-run `install.sh` to sync edits
- Renders the Ghostty config from the repo with `__DOTFILES_DIR__` substituted to the actual repo location, so the dotfiles can be cloned anywhere
- `.zshrc` appends are marker-guarded - safe to re-run repeatedly

## Manual steps after install

1. **Install Claude Code** if not already present: `npm install -g @anthropic-ai/claude-code`
2. **Install plugins** from the Claude Code marketplace. The `settings.json` references several plugins that need to be installed separately via `claude /plugins`.
3. **Install the PolySans Neutral Mono font family** (used by the Ghostty config).
4. **Restart Ghostty and cmux** to pick up the new config.
5. **Open a new shell** (or `source ~/.zshrc`) so the discord-chat-launcher wrapper takes effect.

## How it works

**Claude Code, cmux:** symlinked. Editing `~/.claude/CLAUDE.md` on any machine edits the repo file directly. Commit and push to propagate changes across machines; a `git pull` is the sync step on other machines.

**Ghostty:** rendered from the repo with `__DOTFILES_DIR__` substituted to the actual install location (Ghostty silently ignores symlinks in its Application Support dir, so this is a `sed`-into-place copy, not a symlink). The dotfiles repo can live anywhere on disk; the deployed config gets absolute paths baked in at install time. To propagate Ghostty config edits: make the change in the repo, commit, push, pull on the other machine, then re-run `./install.sh` (or just type `yesplease`).

**Edits on a machine directly (not via the repo)** land in `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty` and will silently drift. Best practice: always edit `ghostty/config.ghostty` in the repo, then `./install.sh`.

**discord-chat-launcher.sh:** symlinked into `~/.claude/`, AND the installer wires a source line into `~/.zshrc` (marker-guarded). The file alone is inert until sourced; the wrapper needs to be loaded by your interactive shell.

## Requirements

- macOS (paths are macOS-specific)
- `git`, `bash`, `python3`
- Ghostty terminal (optional - skip if not using)
- cmux (optional - skip if not using)
