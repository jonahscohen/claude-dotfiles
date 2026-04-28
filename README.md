<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/yes-and-logo-dark.webp">
    <source media="(prefers-color-scheme: light)" srcset="assets/yes-and-logo-light.webp">
    <img alt="Yes&" src="assets/yes-and-logo-light.webp" width="320">
  </picture>
</p>

<h1 align="center">claude-dotfiles</h1>

<p align="center"><i>The Yes& Claude Code stack. One curl, ten components, the way we think about agentic coding.</i></p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#high-level">High level</a> ·
  <a href="#deep-dive">Deep dive</a> ·
  <a href="#troubleshooting">Troubleshooting</a> ·
  <a href="#license--footer">License</a>
</p>

---

We start with yes, and build what's next. These dotfiles are the "&." Confident defaults. Real discipline. The Yes& development stack distilled into one curl, deployed in seconds, opinionated by design. If you ship things and care how they feel, you'll feel right at home.

Three tiers. Stop at any point and still know what you need:

- **[Quick start](#quick-start)** - the curl one-liner. Done.
- **[High level](#high-level)** - the 60-second tour of what's in the box and why it's there.
- **[Deep dive](#deep-dive)** - thirteen chapters. Every choice, the rationale, every gotcha.

<a id="quick-start"></a>

## Quick start

```bash
curl -fsSL https://raw.githubusercontent.com/jonahscohen/claude-dotfiles/main/bootstrap.sh | bash
```

One curl. One shortcut installed: `ampersand`. Type it from any terminal to launch the component picker. Type `ampersand --pull` to pull the latest from GitHub first.

The shortcut is the "&" - it's how you keep saying yes to what's next without leaving the terminal.

Already cloned? `cd` into the repo:

```bash
./install.sh                    # interactive TUI
./install.sh --preset minimal   # claude + memory + skills + nvm
./install.sh --only memory      # just one component
```

That's it for quick start. Everything below is the why and the how.

---

<a id="high-level"></a>

## High level

### What this is

The version-controlled answer to "how is Yes& running Claude Code right now." When a Yes& developer learns something durable - a CSS-detail rule, an icon-sourcing discipline, a way to make Claude remember yesterday - it lands in `claude/CLAUDE.md` or in the memory system. Next `ampersand --pull` and it's on every other Yes& dev's machine. These dotfiles aren't a config. They're the engineering team's earned practice, made portable.

### What it does for you

1. **A reproducible baseline.** New Yes& developer, fresh Mac, one curl. Indistinguishable from the rest of the engineering team by lunch.
2. **A discipline carrier.** Hooks block legacy model IDs, AI-attribution lines, and emoji before they land. CLAUDE.md mandates verification before "done." None of it is optional once installed.
3. **A design system in shell form.** Three layers of design rules (Impeccable for strategy, DESIGN.md for tokens, make-interfaces-feel-better for tactical CSS) auto-wire on install. Generated UI lands on-brand by default, not by accident.
4. **Memory across machines, across Yes& devs.** The memory subsystem makes Claude take notes after every task. Notes commit, notes pull, everyone knows what was decided and why.
5. **Additive-where-possible for everyone else.** Already love your Claude Code config? Don't throw it away. Pick `memory` and `skills` only - we append to your CLAUDE.md and JSON-merge our hooks into your settings.json. Your content stays. Ours layers on.

### What's in the box (the ten components)

Ten components. Pick any combination. Defaults are all on, so most Yes& devs just hit enter.

| Component | One-line | Touches |
|---|---|---|
| `claude` | Claude Code config: instructions, settings, plugins, hooks, memory | Replaces `~/.claude/` files (backs up first) |
| `memory` | Memory rules + 3 lifecycle hooks + loader script (additive) | Appends to your CLAUDE.md, JSON-merges into settings.json |
| `skills` | Anthropic Skills (currently: make-interfaces-feel-better) | Adds to `~/.claude/skills/` only |
| `statusline` | Custom prompt-bar render | Symlinks `~/.claude/statusline-command.sh` |
| `ghostty` | Ghostty terminal look (font, palette, transparency, blur) | Renders config into Application Support |
| `shaders` | CRT curvature, TFT pixel grid, blazing cursor trail + community library | In-repo `shaders/*.glsl` + clones ghostty-shaders |
| `cmux` | Split-pane terminal config (powers in-app browser preview) | Symlinks `~/.config/cmux/settings.json` |
| `discord` | Optional Discord channel attach when launching `claude` | Marker-guarded line in `~/.zshrc` |
| `nvm` | Optional fix for "claude: command not found" in fresh terminals | Marker-guarded line in `~/.zshrc` |
| `ampersand` | The `ampersand` zsh shortcut (`ampersand` to re-run, `ampersand --pull` to sync first). `yesplease` aliased for back-compat | Marker-guarded block in `~/.zshrc` |

### The three-layer design stack

Most AI-generated UI looks the same because most prompts ask for the same vague thing. Yes& devs stack three tools, each handling a different layer:

- **Strategy / brand:** [Impeccable](https://impeccable.style) plugin (PRODUCT.md + 23 commands). Decides who this is for and what's NOT us.
- **Token values:** [google-labs-code/design.md](https://github.com/google-labs-code/design.md) spec. Canonical source of truth for colors, type, spacing, components.
- **Tactical CSS / motion:** [make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) skill. Sixteen specific rules with exact values (scale 0.96 on press, blur 4px to 0 on icon swaps, image outlines never tinted).

Each fires at the right beat. Strategy at brief time. Tokens at write time. Tactics at implementation time. All three at QA time. Generated UI lands seen, felt, and on-brand.

### How memory works (in 30 seconds)

1. You ask Claude to do something.
2. Claude does it. Verifies. Confirms.
3. Before responding, Claude writes a memory entry to `<project>/.claude/memory/session_YYYY-MM-DD_<topic>.md` with frontmatter, a `Collaborator: <your name>` line, a `Why:`, a `How:`, and files touched.
4. Claude updates `MEMORY.md` to index the new entry.
5. THEN Claude responds.

Memory commits to your project's git like any source file. Your teammate pulls, their Claude reads it at session start. The next Yes& dev starts where you left off, with `Collaborator:` attribution baked in.

### What's NOT here

- **Claude Desktop config** is mostly the same runtime as Claude Code now (Desktop bundles Claude Code), so most dotfiles benefits apply automatically. The Discord launcher is the exception - it's a shell wrapper, and Desktop doesn't go through your shell.
- **Claude.ai connectors** (ClickUp, Google Drive, etc.) are account-bound, not machine-bound. Authorize once at claude.ai, propagates to every signed-in device.
- **MCP servers** (Claude in Chrome, etc.) need OAuth or per-machine credentials. Configure per-app, not via dotfiles.

If those distinctions blurred, the [deep-dive plugins/connectors/MCP section](#deep-plugins) breaks them down.

---

<a id="deep-dive"></a>

## Deep dive

Thirteen collapsible chapters. Open the one you need, ignore the rest.

<a id="deep-opinion"></a>

<details>
<summary><b>1. The opinion (the long version of why this exists)</b></summary>

### Why we built this

Every Yes& developer runs Claude Code. Each of us figured out the same lessons one fix at a time: how to make Claude remember yesterday, how to keep it from inventing icons, how to stop it from writing 800 lines when 80 was the brief, how to get the design output to actually feel on-brand. Those lessons used to live in scattered private CLAUDE.md files, half-remembered Teams threads, and the sediment of pull-request comments.

We pulled them into one place, made them installable, and made them yours by typing `ampersand`.

This repo is the version-controlled answer to "how is Yes& running Claude Code right now."

### The opinion in five sentences

1. **Discipline beats cleverness.** Hooks that mechanically refuse certain patterns (legacy model IDs, AI-attribution lines, emoji, force-push to main) are more reliable than hoping the model behaves.
2. **Memory beats context.** A version-controlled record of what we decided yesterday is more useful than re-explaining the project to Claude every session.
3. **Three-layer design beats one-layer prompting.** Impeccable handles strategy, DESIGN.md handles tokens, make-interfaces-feel-better handles tactics. Stack them.
4. **Verification beats vibes.** UI work isn't done until it's screenshotted and checked. Non-UI work isn't done until each step has a runnable verify clause.
5. **Additive-where-possible beats wholesale.** Other devs and teams should be able to take what they want and leave the rest. The `memory` component appends to your existing CLAUDE.md and JSON-merges into your existing settings.json (your other content stays); the `skills` component writes only to `~/.claude/skills/` and never touches your config files.

### What this isn't

It isn't a Claude Code tutorial - we assume you've got `claude` working. It isn't a productivity-hack collection - the opinions here are constraints, not optimizations. It isn't a Yes& proprietary - the additive components are safe outside our team, by design.

</details>

<a id="deep-components"></a>

<details>
<summary><b>2. The components (full table with what they do)</b></summary>

When the installer launches you get a checkbox TUI listing ten components. Each is independently togglable. Defaults are all on, but every component is honest about whether it overwrites your existing config.

| Component | Plain-English | What changes on disk |
|-----------|---------------|----------------------|
| `claude`  | Your Claude Code brain. **REPLACES** `~/.claude/CLAUDE.md`, `settings.json` (with our plugin list - 14 plugins enabled, 4 explicitly disabled), hooks, memory. Existing files get backed up to `.backups/`. Skip if you have your own setup you want to keep | Symlinks the canonical files into `~/.claude/` |
| `memory`  | **Additive.** Bolts our memory subsystem onto an existing Claude Code: appends Memory Discipline rules to your `CLAUDE.md` between marker comments, JSON-merges three lifecycle hooks into your `settings.json`, symlinks the loader script. Marker-guarded - re-runs are no-ops, removable cleanly | Symlinks `startup-check.sh`; appends to `CLAUDE.md`; merges into `settings.json` |
| `skills`  | **Additive.** Installs Anthropic Skills via `npx skills add`. Currently bundles `make-interfaces-feel-better` (tactical UI polish that auto-triggers on UI keywords). Touches nothing else | Adds to `~/.claude/skills/` only |
| `statusline` | Custom prompt-bar render. The `statusLine` command in `settings.json` is tolerant of a missing script - unticking falls back cleanly to Claude Code's default | Symlinks `~/.claude/statusline-command.sh` |
| `ghostty` | The Ghostty terminal look: PolySans Neutral Mono, custom 256-color palette, transparency, blur | Renders `config.ghostty` into `~/Library/Application Support/com.mitchellh.ghostty/` with `__DOTFILES_DIR__` substituted |
| `shaders` | Cinematic Ghostty effects: CRT curvature, TFT pixel grid, blazing cursor trail. Plus the wider community shader library | In-repo `shaders/*.glsl` referenced by Ghostty config, plus clones [ghostty-shaders](https://github.com/0xhckr/ghostty-shaders) |
| `cmux`    | cmux split-pane terminal config. Powers the in-app browser preview Claude uses to verify UI work | Symlinks `~/.config/cmux/settings.json` |
| `discord` | One-line wrapper added to your zsh config so when you run `claude`, it asks if you want to connect this session to your Discord channel | Marker-guarded source line in `~/.zshrc` |
| `nvm`     | Optional fix for "claude not found in PATH" in fresh terminals on machines where Homebrew's nvm doesn't auto-activate. Harmless no-op on machines that don't use nvm | Appends `nvm use default --silent` to `~/.zshrc` (only if `nvm.sh` is already sourced) |
| `ampersand` | The `ampersand` zsh shortcut. `ampersand` re-launches the installer from any directory; `ampersand --pull` pulls latest from GitHub first. Forwards every other flag. `yesplease` is kept as a back-compat alias mapping to `ampersand --pull`. Auto-migrates older installs (yesplease-only or yesplease+ampersand combined blocks) | Marker-guarded shortcuts block in `~/.zshrc` |

The TUI also lets you pre-select via flags: `--yes` for everything, `--preset minimal` for `claude+memory+skills+nvm`, `--preset all`, `--preset none`, `--only csv` for an explicit subset, `--dry-run` to preview without writing.

</details>

<a id="deep-brain"></a>

<details>
<summary><b>3. The Claude Code brain (CLAUDE.md walkthrough)</b></summary>

`~/.claude/CLAUDE.md` is the global instruction file Claude reads at the start of every session in every project on this machine. Picking the `claude` component symlinks our canonical version into place. Picking `memory` instead appends just the Memory Discipline section between markers without touching the rest. Here's what's in our canonical file, section by section.

### Memory Discipline (mandatory, no exceptions)

Three sub-rules, all enforceable.

**Session Startup.** At the start of every session, Claude must load memory in this order: project root memory (`<project>/.claude/memory/MEMORY.md` and every file it references) first, global project memory (`~/.claude/projects/<path>/memory/`) second, git history third, anything else fourth. When you ask "what did we work on last?", the answer comes from the memory files, not git log, not guessing.

**Per-Task Updates.** Every discrete change writes a memory entry before Claude responds to you. Not per-feature. Not per-session. Per-task. A CSS fix, a copy change, a refactor decision - each lands in `<project>/.claude/memory/session_YYYY-MM-DD_<topic>.md` immediately. Batching is a failure mode.

**File Format.** One session file per day per topic. Frontmatter (`name`, `description`, `type: project`). One line per change. Decisions get a "Why:" rationale and a "How:" approach. Files touched at the bottom. Update `MEMORY.md` index on file creation.

### Verification Protocol (mandatory, no exceptions)

Seven numbered rules that gate task completion.

1. **Visual verification.** UI changes must be screenshotted and described. "It renders" is not verification.
2. **Interactive verification.** Buttons, dropdowns, toggles must be clicked/typed into and re-screenshotted.
3. **Side-by-side verification.** Building from a Figma reference means comparing implementation against source.
4. **Completeness check.** Re-read the original request, list every item, confirm each one exists.
5. **No lazy questions.** If the user asked for 5 things and Claude built 3, build the other 2 instead of asking "should I continue?"
6. **No false positives.** A passing type check is not a passing feature. Verify with eyes.
7. **For non-UI tasks, state a verifiable plan first.** Refactors, CLI changes, scripts: write `<step> -> verify: <check>` before implementing. Verify clauses must be runnable, not "looks right."

### Design Work and Impeccable (mandatory for UI tasks)

Routes every design and UI-QA task through the `/impeccable` plugin. Before any UI work: check that `PRODUCT.md` exists at project root with real content (not placeholders). If missing, run `/impeccable teach` first - it asks about register, users, brand personality, anti-references, and writes the file.

Includes an entry-command routing table mapping intent to command:

| User's intent | Command |
|---|---|
| Net-new feature, build from scratch | `/impeccable craft <feature>` |
| Plan only, no code yet | `/impeccable shape <feature>` |
| Add motion, color, personality | `/impeccable animate`, `colorize`, `delight`, `bolder`, `overdrive` |
| Tone down a loud UI | `/impeccable quieter` or `distill` |
| Fix typography, spacing, layout, copy, perf | `/impeccable typeset`, `layout`, `adapt`, `clarify`, `optimize` |
| Production-ready sweep | `/impeccable harden` |
| First-run flows, empty states | `/impeccable onboard` |
| Pull tokens into the design system | `/impeccable extract` |

Plus a tactical implementation layer (the `make-interfaces-feel-better` skill) that auto-triggers on UI keywords with sixteen specific rules and exact values.

### QA gate for UI work

Five steps that must pass before UI work is reported done:

1. `/impeccable audit <target>` - 5-dimension technical scan (a11y, perf, theming, responsive, anti-patterns) plus the `npx impeccable detect` CLI
2. `/impeccable critique <target>` - design review via independent sub-agents (AI-slop detection, Nielsen heuristics, cognitive load, emotional journey)
3. `/impeccable polish <target>` - final design-system alignment pass
4. `make-interfaces-feel-better` 14-point checklist - concentric radius, optical alignment, shadows over borders, split/staggered enters, subtle exits, tabular nums, font smoothing, balanced text wrap, image outlines (always pure-tone, never tinted), scale-on-press at exactly 0.96, `initial={false}` on AnimatePresence, no `transition: all`, sparse `will-change`, 40x40 hit areas
5. `npx @google/design.md lint DESIGN.md` if a DESIGN.md exists - resolve every error and warning before reporting done

### Code Quality

A growing list of bullets. The non-obvious ones:

- When a request has multiple plausible interpretations, name them and ask. Don't silently pick one.
- Never use emdashes. Hyphens or rewrite.
- Never use emojis.
- Never take credit. No AI-coauthor attribution lines, no auto-generated credit comments. The assistant is invisible in the output.
- Project updates record the human collaborator's name (derived from `git config user.name`). The human is named, the assistant isn't.
- Never fabricate SVG icons. Source verbatim from Heroicons, Lucide, Tabler, Bootstrap Icons, Phosphor, Feather, or Material Symbols. Path data must match library source byte-for-byte.
- Never use legacy model versions. Always the newest available (gpt-5.4, latest Claude, latest Gemini).
- Style guides and component libraries must be fully isolated from the app's global styles.
- Each design-system component must be verified in browser against the design source before moving to the next. One at a time.

### cmux Browser Pane

Documents `cmux browser screenshot`, `navigate`, `snapshot --interactive` commands and their use as the primary preview method on this machine. Each project records its surface ID as a `reference_cmux_browser.md` memory.

</details>

<a id="deep-design-stack"></a>

<details>
<summary><b>4. The three-layer design stack (in detail)</b></summary>

Most "AI-generated UI" looks the same because most prompts ask for the same vague thing. Yes& uses three stacked tools that each address a different layer of the design problem:

| Layer | Owner | Answers |
|---|---|---|
| Strategy / brand | **[Impeccable](https://impeccable.style)** plugin (PRODUCT.md + 23 commands) | Who is this for, what's the personality, what are we NOT? |
| Token values | **[google-labs-code/design.md](https://github.com/google-labs-code/design.md)** spec | What's primary, what's body-md, what's spacing.md? |
| Tactical CSS / motion | **[make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better)** skill (16 rules) | When you write the button, scale to exactly 0.96 on press |

Each layer is enforced at the right moment in the workflow. Strategy at brief time. Tokens at write time. Tactics at implementation time. All three at QA time.

### Impeccable: the strategy brain

A plugin (`impeccable@impeccable`) auto-installed via your `enabledPlugins`. Twenty-three commands ranging from `teach` (interactive PRODUCT.md authoring) to `craft` (build from scratch) to `audit/critique/polish` (the QA triad). Reads `PRODUCT.md` and `DESIGN.md` at project root before every command, so output is always informed by the project's own register and anti-references.

The CLAUDE.md hard rule: before any UI work begins, Claude checks for `PRODUCT.md`. Missing or stub triggers `/impeccable teach`. Missing `DESIGN.md` plus existing code triggers a one-time-per-session nudge to run `/impeccable document`.

### DESIGN.md: the token contract

Google's spec for representing a visual identity to coding agents. YAML frontmatter for tokens (colors, typography, rounded, spacing, components with `{path.to.token}` references), markdown body for rationale. Comes with `npx @google/design.md lint` for schema validation, WCAG contrast checks, broken-ref detection, and `npx @google/design.md diff` for change tracking.

CLAUDE.md mandates: when writing or updating a project's DESIGN.md (via `/impeccable document`, `/impeccable extract`, or by hand), conform to the Google spec. Run lint after every write and resolve every error or warning. Generated UI references tokens via `{path.to.token}`, not hex literals, so the file stays the source of truth.

### make-interfaces-feel-better: the tactical layer

An Anthropic Skill auto-installed via `npx skills add jakubkrehel/make-interfaces-feel-better`. Auto-triggers on UI keywords: border radius, animation, optical alignment, hover state, tabular numbers, "feel better." Sixteen specific rules with exact values:

- Concentric border radius (`outer = inner + padding`)
- Optical centering (icons need manual nudge past geometric)
- Shadows over borders (layered transparent `box-shadow` for depth)
- Interruptible animations (CSS transitions for state, keyframes only for staged sequences)
- Split and stagger enter animations (semantic chunks, ~100ms delay each)
- Subtle exit animations (small fixed `translateY`, never full height)
- Contextual icon swaps via `opacity 0->1, scale 0.25->1, blur 4px->0` and `transition: { type: spring, duration: 0.3, bounce: 0 }` if `motion`/`framer-motion` is available, else cross-fade with `cubic-bezier(0.2, 0, 0, 1)`
- Font smoothing (`-webkit-font-smoothing: antialiased` on root)
- Tabular nums on dynamic counters
- `text-wrap: balance` on headings, `pretty` on body
- Image outlines `rgba(0,0,0,0.1)` light or `rgba(255,255,255,0.1)` dark, never tinted neutrals
- `scale(0.96)` on press (always 0.96, never below 0.95)
- `initial={false}` on AnimatePresence to skip first-load animations
- Never `transition: all`; specify exact properties
- `will-change` only on transform/opacity/filter, sparingly
- Minimum 40x40px hit area, never let two hit areas overlap

The skill's review-output-format (before/after tables grouped by principle) is the canonical UI-change summary across all Yes& work.

</details>

<a id="deep-memory"></a>

<details>
<summary><b>5. Memory: how Claude remembers (in detail)</b></summary>

Memory turns Claude Code from a stateless code generator into a colleague who remembers what we decided last week and why. It's the most important thing in this repo.

### Three layers of memory

**Project root memory** (`<project>/.claude/memory/`) is the canonical record for that specific project. Session files (`session_YYYY-MM-DD_<topic>.md`), feedback files (`feedback_<topic>.md`), reference files (`reference_<topic>.md`). Indexed by `MEMORY.md`. Committed to the project's git repo. Pulled and read by every collaborator's Claude.

**Global cross-project memory** (`~/.claude/memory/`) is per-machine, durable across all projects you open with Claude Code. Things like the attribution policy, Yes&-wide feedback, hook verification discipline. Symlinked from the dotfiles repo when you tick the `claude` component, so every Yes& dev's machine has the same baseline.

**Per-project global memory** (`~/.claude/projects/<project-path>/memory/`) is automatically written by Claude Code itself for telemetry-style state. Secondary context, read at session start.

### How a memory entry happens

Claude is mandated by CLAUDE.md to write a memory entry after every discrete change. The flow:

1. You ask Claude to do something.
2. Claude does the thing. Verifies it. Confirms it works.
3. Before responding to you, Claude writes a memory file in `<project>/.claude/memory/` with frontmatter, a Collaborator line (your name from `git config user.name`), a Why, a How, and a list of files touched.
4. Claude updates `MEMORY.md` to index the new entry.
5. THEN Claude responds.

Three lifecycle hooks make this concrete:

- **`SessionStart`** runs `~/.claude/startup-check.sh` which loads project memory + global memory + relevant feedback files into the model's session context. The status line "Loading memory..." is the visible signal.
- **`PreCompact`** fires when Claude's context window is about to be compressed. The hook emits a system reminder telling Claude to flush any pending memory entries to disk before context is lost. Status: "Flushing memory before compact..."
- **`PostCompact`** re-runs the startup loader after compaction, so post-compaction Claude has fresh memory loaded again. Status: "Reloading memory after compaction..."

### Why this works across machines and developers

Memory files are markdown in your project's `.claude/memory/` directory. They get committed and pushed like any other source file. When a teammate pulls, their Claude reads the same memory at session start. The `Collaborator:` line baked into every entry by CLAUDE.md's rule lets you see who did what at a glance, layered on top of `git log` / `git blame` for ironclad attribution.

For ironclad team-wide enforcement, drop a project-root `CLAUDE.md` that re-states the memory + collaborator rules. Project-level CLAUDE.md is read by Claude Code regardless of whether the teammate has the dotfiles installed, so even teammates without Yes&-dotfiles get the discipline applied in that repo.

### What memory is NOT for

- Code patterns, conventions, file paths, project structure - all derivable from reading the current state.
- Git history, who-changed-what - `git log` is authoritative.
- Debugging solutions or fix recipes - the fix is in the code; the commit message has context.
- Anything already in CLAUDE.md.
- Ephemeral task state, in-progress work, current conversation context.

These exclusions apply even when a user explicitly asks Claude to "save this." Memory is for what's surprising, durable, and not derivable.

</details>

<a id="deep-workflows"></a>

<details>
<summary><b>6. Day-to-day workflows</b></summary>

The shortcuts you'll actually type once the dotfiles are installed.

### `ampersand` - re-launch the installer (no pull)

```bash
ampersand                      # interactive TUI from any directory
ampersand --yes                # full non-interactive install
ampersand --preset minimal     # claude + memory + skills + nvm
ampersand --only memory        # just one component
ampersand --only memory,skills # multiple components
ampersand --dry-run            # preview without writing
```

Used when you're iterating on the dotfiles locally, or you want to re-pick components without waiting on the network.

### `ampersand --pull` - pull latest from GitHub then re-launch

```bash
ampersand --pull                # most common use: sync + run TUI
ampersand --pull --preset all   # full sync + non-interactive
ampersand --pull --only memory  # sync + just memory
```

Used when you want to pick up changes another teammate pushed. Pulls via `git pull --ff-only` so it never silently merges divergent local changes. The legacy `yesplease` command is kept as an alias for `ampersand --pull` so anyone with muscle memory for it still works.

### Direct `./install.sh`

Still works if you prefer to be explicit, or if you're scripting against the installer in CI:

```bash
cd /path/to/claude-dotfiles
./install.sh --preset minimal
```

### `bootstrap.sh`: the curl-friendly entrypoint

This is what the curl one-liner runs. By default (no args) it clones the repo, installs ONLY the `ampersand` shell shortcut, prints "Unpacking installer...complete." and then `exec`s a fresh login zsh so `ampersand` is immediately available. The TUI does NOT auto-launch in this mode - the user types `ampersand` themselves to pick components.

If you pass installer args through the curl|bash, bootstrap installs the shortcut, then re-execs `install.sh` with those args (and a TTY restored from `/dev/tty` so the TUI works through the pipe). Same flag set passes through:

```bash
curl -fsSL https://raw.githubusercontent.com/jonahscohen/claude-dotfiles/main/bootstrap.sh | bash -s -- --preset minimal
curl -fsSL .../bootstrap.sh | bash -s -- --dir ~/code/dots --yes
```

### Custom clone location (three ways)

The dotfiles can live anywhere on disk. The Ghostty config uses a `__DOTFILES_DIR__` placeholder that the installer replaces with the actual repo path at install time, so cloning to `~/code/dots`, `/opt/dots`, or anywhere else works.

```bash
# Env var (works for both bootstrap and direct install.sh)
CLAUDE_DOTFILES_DIR=~/code/dots curl -fsSL .../bootstrap.sh | bash

# Bootstrap flag
curl -fsSL .../bootstrap.sh | bash -s -- --dir ~/code/dots

# Default (no flags): ~/Documents/Github/claude-dotfiles
curl -fsSL .../bootstrap.sh | bash
```

If you re-run `install.sh` from a different clone location later, the `ampersand` function in your `~/.zshrc` is automatically refreshed to point at the new path. Path drift is detected by comparing the baked `cd "$REPO_DIR"` against the current run's `$REPO_DIR`.

</details>

<a id="deep-teams"></a>

<details>
<summary><b>7. For Yes& teams (collaboration & attribution)</b></summary>

The collaboration story for two or more humans working on the same codebase with Claude Code on both sides.

### Attribution

Every memory entry Claude writes gets a `Collaborator:` line baked in. The rule lives in CLAUDE.md's Code Quality section: "Project updates must record the human collaborator's name, derived from `git config user.name`." So when you work, your Claude tags your name. When your teammate works, theirs tags their name. Memory files commit and push like any source file, so attribution flows through git.

You end up with three layers of authorship:

- **Per memory entry:** `Collaborator: <name>` line at the top
- **Per memory file:** `git log` / `git blame` (which is identical, but ironclad)
- **Per task:** the `Why:` and `How:` fields explain reasoning so reading a session memory tells you "Alice fixed the auth bug because legal flagged session-token storage, here's how she approached it"

### Project-level CLAUDE.md

For ironclad team-wide enforcement of memory discipline (especially if a teammate hasn't installed the dotfiles), drop a `CLAUDE.md` at the project root that re-states the rules. Claude Code always reads project-root CLAUDE.md regardless of dotfiles state, so it propagates to anyone who clones.

A minimal project-root CLAUDE.md template:

```markdown
## Memory Discipline (project-level)

After every discrete change in this project, write a memory entry to
`.claude/memory/session_YYYY-MM-DD_<topic>.md` before responding to the user.

Include:
- Frontmatter (name, description, type: project)
- A `Collaborator:` line with the human's name from `git config user.name`
- A `Why:` rationale and `How:` approach for non-trivial decisions
- A list of files touched

Update `.claude/memory/MEMORY.md` to index the new file.

This applies regardless of whether the developer has Yes&-dotfiles installed.
```

### Merge conflict patterns to expect

The most contention-prone file is `MEMORY.md` (the index). Two devs working on the same day both want to add an index line. The convention "append at the bottom, one line per entry" makes most of these auto-merge cleanly. Session files themselves rarely conflict because the file naming includes the topic, so two devs working on different topics never touch the same file.

### Onboarding a new Yes& dev

1. They run `curl -fsSL https://raw.githubusercontent.com/jonahscohen/claude-dotfiles/main/bootstrap.sh | bash`.
2. They take TUI defaults or pick `--preset all`.
3. New terminal or `source ~/.zshrc`.
4. They open any Yes& project. Claude reads its own `~/.claude/CLAUDE.md`, plus the project's root `CLAUDE.md`, plus the project's `.claude/memory/` files. They have full context the moment they start.

That's the entire onboarding. Same machine state as everyone else, same disciplines applied, same memory loaded.

</details>

<a id="deep-additive"></a>

<details>
<summary><b>8. Boost an existing Claude Code (no overwrites)</b></summary>

For developers who already have a Claude Code setup they like and want to layer in specific Yes& capabilities without losing their config.

### The additive-where-possible components

Three components are designed to NOT replace your existing config. The `memory` component does mutate your CLAUDE.md and settings.json (it has to - that's where the rules and hooks live), but it appends and JSON-merges, never overwrites. `skills` and `ampersand` only write to namespaces we control:

| Component | Touches | What it adds |
|---|---|---|
| `memory`   | Appends to `~/.claude/CLAUDE.md` between markers; JSON-merges hooks into `~/.claude/settings.json`; symlinks `~/.claude/startup-check.sh` | The full memory subsystem (rules + 3 hooks + loader) |
| `skills`   | Adds to `~/.claude/skills/` only | The `make-interfaces-feel-better` skill |
| `ampersand`| Marker-guarded block in `~/.zshrc` | The `ampersand` shortcut (and `yesplease` alias for back-compat) |

### Common patterns

```bash
# Just the memory subsystem - your CLAUDE.md and settings.json get appended/merged, never replaced
ampersand --only memory

# Memory + UI-polish skill
ampersand --only memory,skills

# Everything additive (memory + skills + the shortcut block), zero overwrites
ampersand --only memory,skills,ampersand
```

### Marker-guarded means undoable

The `memory` component appends inside HTML comment markers in your `CLAUDE.md`:

```markdown
<!-- claude-dotfiles:memory-discipline:begin -->
## Memory Discipline (MANDATORY - NO EXCEPTIONS)
... (Memory Discipline content) ...
<!-- claude-dotfiles:memory-discipline:end -->
```

To undo, delete from one marker to the other. Same idea for the JSON merge in settings.json (markers are the command paths `~/.claude/startup-check.sh` and the string `PreCompact: flushing pending memory`). To undo: delete the three hook entries from `settings.json`.

The shortcuts block in `~/.zshrc` uses `# === claude-dotfiles:shortcuts:begin ===` / `:end` markers and is sed-deletable as a range.

### What's NOT additive (yet)

The plugin list. `enabledPlugins` and `extraKnownMarketplaces` live inside `claude/settings.json`, so picking the `claude` component means accepting our settings.json wholesale. To layer just our plugin list onto your existing settings, manually copy the `enabledPlugins` and `extraKnownMarketplaces` blocks from `claude/settings.json` into yours. A real plugin-merge implementation is a TODO.

</details>

<a id="deep-plugins"></a>

<details>
<summary><b>9. Plugins, connectors, MCP servers, Skills (the four-tier explanation)</b></summary>

People conflate these. They're four different mechanisms with four different config surfaces.

### 1. Plugins (Claude Code)

Declared in `~/.claude/settings.json` under `enabledPlugins`. Auto-installed by Claude Code on first launch from the official marketplace (or extra marketplaces declared in `extraKnownMarketplaces`). Live in `~/.claude/plugins/`. Sync across machines via the dotfiles symlink to settings.json.

The `claude` component enables 14 plugins:

| Plugin | What it does |
|---|---|
| `claude-md-management` | Tools for managing CLAUDE.md files |
| `figma` | Design context and screenshots from Figma URLs |
| `firebase` | Firebase project tools |
| `hookify` | Helps you build Claude Code hooks |
| `skill-creator` | Helps you build Anthropic Skills |
| `sentry` | Error tracking and Seer-based issue analysis |
| `supabase` | Supabase project tools |
| `swift-lsp` | Swift Language Server integration |
| `superpowers` | Agentic skill bundle (brainstorming, debugging, etc.) |
| `agent-sdk-dev` | Tools for building Agent SDK applications |
| `typescript-lsp` | TypeScript Language Server integration |
| `security-guidance` | Defensive security context |
| `discord` | Discord channel integration for chat sessions |
| `impeccable` | The Yes& design brain (PRODUCT.md, /impeccable commands) |

And explicitly disables 4: `github`, `learning-output-style`, `semgrep`, `vercel`. (Disabled means "the marketplace knows about it, but don't enable it on this machine.")

### 2. Connectors (Claude.ai account-level)

OAuth integrations configured at [claude.ai](https://claude.ai) -> Settings -> Connectors. **Not** in your dotfiles. They're tied to your Anthropic account, not your machine, and propagate automatically when you sign in to Claude on any device.

ClickUp is a connector. So is Google Drive. So are most of the "work-app integrations" Claude offers. Authorize once per account.

### 3. MCP servers (per-app, per-machine)

Stand-alone servers exposing tools via the Model Context Protocol. Configured per Claude Code session via `claude mcp add`, or globally for Claude Desktop in `~/Library/Application Support/Claude/claude_desktop_config.json`.

Claude in Chrome is an MCP server (with a Chrome extension as the bridge). cmux can also expose its browser as an MCP server. **Not** in your dotfiles, because most MCP server configs need OAuth or per-machine credentials.

### 4. Skills (Anthropic Skills, in `~/.claude/skills/`)

Reusable prompt and behavior modules that auto-trigger on keyword matches. Installed via `npx skills add <github-repo>`. Live in `~/.claude/skills/`.

The `skills` component installs `make-interfaces-feel-better`. The dotfiles' skills component is fully additive - skills don't depend on your CLAUDE.md or settings.json structure, so they're safe to install alongside any existing Claude Code config.

### Quick decision table

| If you want... | You configure... |
|---|---|
| The Yes& design brain on Claude Code | Plugin (settings.json - `claude` component) |
| Drag-drop Figma URLs into a chat | Plugin (`figma`) |
| ClickUp tasks accessible to Claude.ai | Connector (claude.ai UI, account-bound) |
| Local browser automation in a chat | MCP server (per-app config) |
| Tactical UI polish rules that auto-fire | Skill (npx skills add - `skills` component) |

</details>

<a id="deep-customization"></a>

<details>
<summary><b>10. Customization (env vars, flags, deep config)</b></summary>

### Bootstrap-time flags

```bash
curl -fsSL .../bootstrap.sh | bash                    # default - clones to ~/Documents/Github/claude-dotfiles
curl -fsSL .../bootstrap.sh | bash -s -- --dir PATH   # custom clone location
curl -fsSL .../bootstrap.sh | bash -s -- --yes        # full non-interactive install after clone
curl -fsSL .../bootstrap.sh | bash -s -- --preset minimal  # specific preset
```

Or with env vars:

```bash
CLAUDE_DOTFILES_DIR=~/code/dots CLAUDE_DOTFILES_REPO=https://github.com/your-fork/claude-dotfiles.git curl -fsSL .../bootstrap.sh | bash
```

### Installer flags

```bash
./install.sh                    # interactive TUI (default)
./install.sh --yes              # install everything non-interactively
./install.sh --preset NAME      # all | minimal | none
./install.sh --only KEYS        # comma-separated subset, e.g. claude,memory,nvm
./install.sh --dry-run          # show resolved picks, touch no files
./install.sh --help             # full usage
```

Valid component keys: `claude`, `memory`, `skills`, `statusline`, `ghostty`, `shaders`, `cmux`, `discord`, `nvm`, `ampersand`.

### Presets

| Preset | Components |
|---|---|
| `all` | Everything (same as `--yes`) |
| `minimal` | `claude` + `memory` + `skills` + `nvm` |
| `none` | Nothing (useful with `--dry-run`) |

### Settings.json customization

`claude/settings.json` is symlinked when you pick the `claude` component, so changes to the canonical file in the repo propagate to every machine on next pull. Common customizations:

- **Adding a plugin**: edit `enabledPlugins` and add `"<plugin>@<marketplace>": true`. Commit, push, `ampersand --pull` on other machines, restart Claude Code.
- **Tightening permissions**: edit `permissions.allow` to revoke a Bash pattern. Or change `defaultMode` from `bypassPermissions` to `default` to require approval on tool calls.
- **Adding a hook**: append to the appropriate `hooks.<event>` array. Commit, push, restart.

### CLAUDE.md customization

Edit `claude/CLAUDE.md` in the repo. It's the source of truth. Changes propagate to every machine on next pull. The `memory` component's appended block is bracketed by markers, so if you ever restructure your own CLAUDE.md and regret it, you can sed-delete from `<!-- claude-dotfiles:memory-discipline:begin -->` to `:end` and re-run `install.sh --only memory` to re-append fresh.

</details>

<a id="deep-architecture"></a>

<details>
<summary><b>11. Architecture (under the hood)</b></summary>

### Symlink-vs-copy strategy

| Target | Strategy | Why |
|---|---|---|
| `~/.claude/CLAUDE.md` | Symlink to repo | Edits in either direction sync; `git pull` updates the live config instantly |
| `~/.claude/settings.json` | Symlink to repo | Same |
| `~/.claude/hooks/*.sh` | Symlink to repo | Same |
| `~/.claude/memory/*.md` | Symlink to repo | Memory edits via Claude write directly into the repo working tree, ready to commit |
| `~/.claude/skills/<skill>/` | npx-installed (not symlinked) | Skills are versioned by their own repo, not ours |
| `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty` | sed-rendered copy (not symlink) | Ghostty silently ignores symlinks in its Application Support directory; `__DOTFILES_DIR__` placeholder gets substituted to the actual repo path at install time |
| `~/.config/cmux/settings.json` | Symlink to repo | Same as Claude Code config |
| `~/.zshrc` | Marker-guarded append (never overwrite) | Your shell config is yours; we add labeled blocks that can be sed-deleted cleanly |

### Hook lifecycle

Five hooks fire automatically once `claude/settings.json` is symlinked into `~/.claude/`:

| Event | Hook | Purpose |
|---|---|---|
| `PreToolUse(Bash)` | `~/.claude/hooks/bash-guard.sh` (5s) | Blocks AI-coauthor attribution lines in commands, force-push to main/master, `rm` against `.claude/memory`, legacy model IDs |
| `PreToolUse(Write\|Edit)` | `~/.claude/hooks/content-guard.sh` (5s) | Blocks the same patterns inside file content being written, plus emdashes/endashes and emoji unicode ranges |
| `SessionStart` | `~/.claude/startup-check.sh` (10s, "Loading memory...") | Loads memory at session start |
| `PreCompact` | inline command (5s, "Flushing memory before compact...") | Reminds Claude to flush pending memory before context compresses |
| `PostCompact` | `~/.claude/startup-check.sh` (10s, "Reloading memory after compaction...") | Re-loads memory after compression |

All hooks are pipe-tested before they ship - the bash-guard hook discipline (verified-via-stdin-test) is itself a feedback memory: `feedback_hook_verification_discipline.md`.

### Idempotency model

Every section of `install.sh` is idempotent:

- **Symlinks**: `make_symlink` checks if the target already points where we want; if so, no-op. Otherwise backs up any pre-existing real file, removes stale symlinks, creates fresh.
- **Ghostty config**: always re-rendered from the repo template via `sed`. The deployed file gets overwritten, but the repo template is the canonical source so this is intentional.
- **`.zshrc` appends** (discord, nvm, shortcuts): marker-guarded with grep checks. If the marker is present, no-op. The shortcuts block (ampersand) also self-heals: if the marker is present but the baked `cd "$REPO_DIR"` doesn't match the current `$REPO_DIR`, the entire block is sed-deleted and re-appended at the new path. Lets you move the repo on a machine and have shortcuts auto-refresh. Same self-heal also handles legacy formats (yesplease-only, or yesplease+ampersand combined) and migrates them to the current format.
- **Memory hooks JSON-merge**: marker-based detection on substrings (`startup-check.sh`, `PreCompact: flushing pending memory`). If detected, no-op. Otherwise python3 reads the existing settings.json, adds the missing hook entries, writes back.
- **CLAUDE.md memory-discipline append**: marker-guarded on `<!-- claude-dotfiles:memory-discipline:begin -->`. If present, no-op. Otherwise awk-extract the block from our CLAUDE.md and append.
- **npx skills add**: idempotent via the skills CLI's own logic.

### Backup discipline

Any pre-existing real (non-symlink) file at a target path gets copied to `.backups/<timestamp>/<original-path>` before the installer overwrites it. Backups are gitignored so they don't pollute the repo. To recover from a bad install, walk `.backups/` and copy back what you want.

### Multi-location support

The Ghostty config uses a `__DOTFILES_DIR__` placeholder that gets substituted with the actual repo path on this machine at install time. This means the dotfiles can be cloned to any path - `~/code/dots`, `/opt/dots`, `~/dotfiles/yes-and` - and the deployed Ghostty config gets absolute paths baked in correctly.

The `ampersand` shortcut also bakes in the install-time `$REPO_DIR`. If you move the repo, re-running `install.sh` from the new location triggers the path-drift self-heal that rewrites the shortcut block.

</details>

<a id="troubleshooting"></a>

<details>
<summary><b>12. Troubleshooting</b></summary>

### "claude: command not found" in fresh terminals

Cause: Homebrew's nvm sources `nvm.sh` (making the `nvm` command available) but doesn't activate a default Node version. The cmux claude wrapper is first in PATH, runs when you type `claude`, looks for the real claude binary elsewhere in PATH, finds nothing because nvm hasn't activated.

Fix: tick the `nvm` component in the installer. It appends `nvm use default --silent` to your `.zshrc`. Open a new terminal (or `source ~/.zshrc`) and `claude` should resolve.

### `ampersand: command not found` immediately after install

Cause: shell functions defined inside install.sh's child process don't escape into the parent shell. Your current zsh hasn't read the updated `.zshrc` yet.

Fix: `source ~/.zshrc` once, or open a new terminal window. Subsequent shells read `.zshrc` at startup so this only happens once per machine.

### Ghostty shaders don't render

Cause: the Ghostty config references `__DOTFILES_DIR__/shaders/*.glsl`. If the installer didn't run with the `ghostty` component picked, the placeholder might not have been substituted, or the path baked in might point at a clone that no longer exists at that location.

Fix: `ampersand --only ghostty` to re-render the config with the current `$REPO_DIR`. Restart Ghostty.

### Permissions prompts on every markdown write

Cause: should not happen with `defaultMode: bypassPermissions` set, but Claude Code or its harness sometimes escalates anyway.

Fix: `claude/settings.json` already includes explicit `Write(**/*.md)`, `Edit(**/*.md)`, `MultiEdit(**/*.md)` allow rules. If you're still seeing prompts, restart your Claude Code session - permissions are loaded at session start. If they persist, broaden the allow list.

### Discord wrapper doesn't fire when launching from Claude Desktop

Cause: the Discord launcher is a zsh function that shadows the `claude` shell command. Claude Desktop launches Claude Code via the app, not via your shell, so the wrapper never gets a chance to run.

Fix: launch Claude Code from a terminal (`claude`) when you want the Discord prompt. The Desktop app's Claude Code panel will get every other dotfiles benefit (CLAUDE.md, plugins, hooks, skills, memory) - just not the Discord auto-attach.

### gum not installed and I don't want to install it

The TUI degrades gracefully to a numbered text menu if gum isn't available and you decline to brew-install it. Same components, same flags, less polish. Pick numbers to toggle off, press enter to confirm.

### Memory entries from a teammate on a different machine

Pull the project: `git pull` in the project repo. The memory files are in `<project>/.claude/memory/` like any other source. Claude reads them at session start.

### Fresh install on a new Mac, where do I start

```bash
curl -fsSL https://raw.githubusercontent.com/jonahscohen/claude-dotfiles/main/bootstrap.sh | bash
```

Take TUI defaults. New terminal. Done.

### I want to install without pulling first

Use `ampersand` (no `--pull`). Same install process, no `git pull` step. Useful when you're iterating on the dotfiles locally and don't want to pull until you've finished a series of edits.

### My team has its own Claude Code config and I don't want to overwrite it

```bash
ampersand --pull --only memory,skills
```

That installs the memory subsystem (additive markers in your CLAUDE.md, JSON-merged hooks in your settings.json) and the make-interfaces-feel-better skill. Doesn't touch anything else.

### How do I undo the dotfiles entirely

For symlinked files (CLAUDE.md, settings.json, hooks, statusline, memory): `rm` them and copy back from `.backups/<some-timestamp>/`. For appended `.zshrc` blocks: sed-delete the marker-guarded ranges. For the Ghostty config: copy back from `.backups/`.

We don't ship an automated uninstaller because it would require us to know which timestamp's backups to use. Manual is safer.

</details>

<a id="deep-contributing"></a>

<details>
<summary><b>13. Contributing (for Yes& devs)</b></summary>

### Adding a new component

1. Add the key to `KEYS=(...)` in `install.sh` and add a TITLE + DESC in the same arrays. Bump the PICKS array length.
2. Add an apply block (`if picked <key>; then ... fi`) in the appropriate numbered section. Renumber subsequent sections to stay sequential.
3. If the component modifies `~/.zshrc`, use a marker-guarded append pattern (see the `discord`, `nvm`, or `ampersand` blocks for examples). Always include path-drift self-heal logic if the block bakes in `$REPO_DIR`.
4. If the component modifies `~/.claude/settings.json` JSON-style, use the python3 stdlib merge pattern from the `memory` component. Marker-detection is mandatory.
5. Update `--help` valid keys list and the post-install summary's `picked <key> && echo "..."` line.
6. Update the README component table.
7. Write a session memory entry: `.claude/memory/session_YYYY-MM-DD_<topic>.md`. Index in `MEMORY.md`.
8. Commit, push, `ampersand --pull` on a different machine to verify.

### Adding a new skill to the `skills` component

Edit the apply block in install.sh's section 3. Add another `npx --yes skills add <github-repo>` invocation alongside the existing `make-interfaces-feel-better` line. Wrap in a non-fatal warn pattern so a failed skill install doesn't abort the run. Update the component description and post-install summary.

### Adding a new plugin to the `claude` component

Edit `claude/settings.json`. Add `"<plugin>@<marketplace>": true` to `enabledPlugins`. If the marketplace isn't already known, add it to `extraKnownMarketplaces` with `source` and `autoUpdate`. Restart Claude Code to install.

For Yes& devs: bias toward enabling plugins the whole engineering team benefits from. Plugins that only one developer needs should live in their personal Claude Code config, not the shared dotfiles.

### Adding a new CLAUDE.md rule

Edit `claude/CLAUDE.md`. Decide which existing section the rule belongs to (Memory Discipline, Verification Protocol, Design Work and Impeccable, Code Quality, etc.) - rules under the wrong heading get ignored. If the rule needs cross-team enforcement on projects where the dotfiles aren't installed, also drop it into a project-root CLAUDE.md template that we ship to the team.

### Memory entry conventions

Every change to the dotfiles repo writes a session memory entry. Format:

```markdown
---
name: <one-line title>
description: <one-line summary used by future Claude to decide relevance>
type: project
---

Collaborator: <your name from git config user.name>

# What changed

[bullet list of concrete changes]

# Why

[motivation]

# How to apply

[is it live immediately, do other machines need to pull, etc.]

# Files touched

- file1.ext
- file2.ext
```

Index it in `.claude/memory/MEMORY.md` as a one-line entry.

### Pull request hygiene

Branch from `main`. Squash-merge with a clear title. Don't take credit in commit messages, the dotfiles enforce that for code, and we extend the convention to repo work.

</details>

---

<a id="license--footer"></a>

## License & footer

The dotfiles are MIT licensed. Bundled tools (Impeccable, make-interfaces-feel-better, ghostty-shaders, gum, etc.) are licensed by their respective authors - see each repository for terms.

The Yes& brand mark and logo are property of Yes&.

If you found this useful and you're not at Yes&, good - the additive components are built to layer onto your own setup. Issues and PRs welcome at [github.com/jonahscohen/claude-dotfiles](https://github.com/jonahscohen/claude-dotfiles).

We start with yes. You build what's next.
