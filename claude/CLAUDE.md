<!-- claude-dotfiles:memory-discipline:begin -->
## Memory Discipline (MANDATORY - NO EXCEPTIONS)

### Session Startup - Memory Loading Order

At the start of every session, you MUST load and absorb project memory in this strict priority order before doing anything else:

1. **Project root memory** (`<project-root>/.claude/memory/`) - Read MEMORY.md index, then read every file referenced in it. This is the canonical source of truth for what has been done, what decisions were made, and what the current state of the project is. Absorb all of it. Do not skim. Do not summarize from the index alone. Read the actual files.
2. **Global project memory** (`~/.claude/projects/<project-path>/memory/`) - Secondary context. Read if present.
3. **Git history** - Tertiary. Use only to fill gaps not covered by memory files.
4. **Anything else** - Supportive only. Never prioritize over the above.

When a user asks "what did we work on last?" or any question about prior work, the answer comes from project root memory files first. Not git log. Not guessing. Not the startup script's git status. The memory files ARE the record.

This system exists so that Claude can be opened on multiple machines sharing the same repo and retain shared context. The memory files are the cross-session, cross-machine continuity layer. Treat them as such.

### Memory Writes Are Pre-Approved (NEVER ASK PERMISSION)

You have full, standing, durable permission to write, edit, and delete files anywhere under any `.claude/memory/` directory and any `~/.claude/projects/<...>/memory/` directory. This permission is encoded in `~/.claude/settings.json` (twenty-plus explicit allow patterns plus `defaultMode: bypassPermissions`) AND restated here so there is no ambiguity.

You MUST NEVER:
- Ask "should I save this to memory?" or any variation. Memory updates are required, not optional.
- Pause to confirm before writing a session memory file. Just write it.
- Treat memory writes as a "risky action" or apply the confirmation-first rule from the system prompt to them. They are explicitly exempted.
- Phrase memory work as a question to the user.

If a permission prompt or confirmation step somehow surfaces during a memory write, treat that as a configuration bug, not a question to the user. Do the write anyway and flag the bug at the end of your response so the user can fix the harness.

### Per-Task Memory Updates - The Hard Rule

Memory updates are mandatory after every single discrete change. Not per-feature. Not per-session. Not "when I get around to it." Per-task. Every time.

The moment a fix is verified, a component is added, a bug is resolved, a style is tweaked, a copy change lands - before responding to the user, before moving to the next thing - update the relevant session memory file in `<project-root>/.claude/memory/` with what was just done.

One line per change is fine. The discipline is in the frequency. Batching is a failure mode. If a session ends unexpectedly, every completed task must already be recorded. There is no "I'll save it all at the end." There is no end - there is only now.

What counts as a task (non-exhaustive):
- A CSS fix (even a one-line specificity bump)
- A copy change
- A component created or modified
- A bug identified and resolved
- A refactor or approach change
- An architectural decision made
- A dependency added or removed

If you did something and it works, it goes in memory before anything else happens. This has been corrected multiple times. It is a hard rule, not a best practice. Violating it is a failure.

### Memory File Format

- One session file per day per topic: `session_YYYY-MM-DD_<topic>.md`
- Use the standard frontmatter format (name, description, type: project)
- List changes as they happen, one line each
- Record key technical decisions with "Why:" rationale and "How:" approach summary, so reviewers understand both the reasoning and the mechanics
- List files touched at the bottom
- Update `MEMORY.md` index when creating new session files
<!-- claude-dotfiles:memory-discipline:end -->

## Verification Protocol (MANDATORY - NO EXCEPTIONS)

You are BLOCKED from reporting task completion to the user until ALL of the following are true:

1. **Visual verification required.** If UI was created or modified, you MUST open it in a browser (Chrome MCP, Claude Preview, or curl) and take a screenshot. You must LOOK at the screenshot and describe what you see. "It renders" is not verification. You must confirm every element the user asked for is visually present and correct.

2. **Interactive verification required.** If the UI has interactive elements (buttons, dropdowns, toggles, inputs), you MUST click/hover/type into each one and screenshot the result. Checking computed styles via JavaScript is not a substitute for visual confirmation.

3. **Side-by-side verification required.** If building from a design reference (Figma, screenshot, spec), you MUST compare your implementation against the source. Check dimensions, colors, spacing, typography, border radius, and states. If something doesn't match, fix it before reporting.

4. **Completeness check required.** Before reporting, re-read the user's original request. List every item they asked for. Confirm each one exists in your output. If anything is missing, build it. Do not report partial work as complete.

5. **No lazy questions.** Do not ask the user "should I continue?" or "want me to do X next?" when the answer is obvious from context. If they asked you to build 5 things and you built 3, build the other 2. Take initiative.

6. **No false positives.** Running `npx tsc --noEmit` with no errors does not mean the feature works. A 200 HTTP status does not mean the page looks right. A passing CSS selector check does not mean the design matches Figma. Verify with your eyes.

7. **For non-UI tasks, state a verifiable plan first.** For refactors, CLI changes, scripts, build-tool work, or any multi-step non-UI task, write a brief plan as `<step> -> verify: <check>` lines before implementing. Each verify clause must be runnable (a command, a test, a grep, an expected exit code), not "looks right" or "should work." If you can't name the verify check, the goal isn't well-defined yet - clarify before coding.

If you cannot verify (no browser available, no dev server running), say so explicitly. Do not claim completion without proof.

## Design Work and Impeccable (MANDATORY for UI tasks)

The `impeccable` plugin is enabled in `~/.claude/settings.json` with `autoUpdate: true`. It ships one `/impeccable` skill with 23 commands that cover design briefs, implementation, and QA for frontend work. Use `/impeccable` as the front door for every design or QA task in every project, not as an optional tool.

### Project-level setup (do this first, once per project)

Every `/impeccable` command reads two files at the project root:

- `PRODUCT.md` - register (brand vs product), users, brand personality, anti-references, strategic principles. Required.
- `DESIGN.md` - colors, typography, components, layout. Optional, strongly recommended.

Before any design work, check whether PRODUCT.md exists at the project root and has real content (not `[TODO]` placeholders, not under 200 characters). If it is missing, empty, or a stub, run `/impeccable teach` first. It is interactive (asks about users, brand, anti-references) and writes PRODUCT.md. After it returns, resume the original task with the fresh context. Do not improvise a design on a project with no PRODUCT.md.

If DESIGN.md is missing and there is already code in the project, nudge the user once per session: "Run `/impeccable document` to capture the current visual system so variants stay on-brand." Proceed even if they skip.

### DESIGN.md format (Google spec)

When writing or updating a project's `DESIGN.md` (via `/impeccable document`, `/impeccable extract`, or by hand), conform to the [google-labs-code/design.md](https://github.com/google-labs-code/design.md) spec: YAML frontmatter for tokens (colors, typography, rounded, spacing, components with `{token.path}` references), markdown prose body for rationale, sections in canonical order (Overview, Colors, Typography, Layout, Elevation, Shapes, Components, Do's and Don'ts). After writing or modifying the file, run `npx @google/design.md lint DESIGN.md` and address every error or warning (broken token references, WCAG contrast failures, schema violations) before reporting done. Generated UI code must reference tokens via the `{path.to.token}` form rather than hard-coding hex values, so the design system stays the single source of truth.

### Entry-command routing (pick one before writing code)

| User's intent | Command |
|---|---|
| Net-new feature or page, build from scratch | `/impeccable craft <feature>` |
| Plan the design only, no code yet | `/impeccable shape <feature>` |
| Add motion, color, personality, or boldness | `/impeccable animate`, `colorize`, `delight`, `bolder`, `overdrive` |
| Tone down a loud or over-stimulated UI | `/impeccable quieter` or `distill` |
| Fix typography, spacing, layout, responsive, copy, perf | `/impeccable typeset`, `layout`, `adapt`, `clarify`, `optimize` |
| Production-ready sweep (errors, i18n, edge cases) | `/impeccable harden` |
| First-run flows, empty states, activation | `/impeccable onboard` |
| Pull reusable tokens and components into the design system | `/impeccable extract` |
| Iterate visually on elements in a live browser | `/impeccable live` |

When unsure, invoke `/impeccable` with no argument. It renders the full command menu grouped by category.

Once an entry command is loaded, let its reference file drive. Do not improvise around it.

### Tactical implementation layer (make-interfaces-feel-better)

Installed via `install.sh` as the `make-interfaces-feel-better` Anthropic Skill. It auto-triggers on UI keywords (border radius, animation, optical alignment, hover state, tabular numbers, "feel better," etc.) and supplies 16 specific tactical rules with exact values: `scale(0.96)` on press, concentric border radius (`outer = inner + padding`), icon swaps via opacity+scale+blur (`scale 0.25->1, opacity 0->1, blur 4px->0`), image outlines `rgba(0,0,0,0.1)` never tinted, hit areas at least 40x40px, `transition: all` banned, `font-variant-numeric: tabular-nums` on dynamic numbers, `text-wrap: balance` on headings, etc. Full reference at `~/.claude/skills/make-interfaces-feel-better/`.

This skill is the tactical layer that sits between Impeccable's strategy (PRODUCT.md, register, anti-references) and DESIGN.md's tokens (colors, typography, spacing). Apply it during implementation, not as a separate pass:

- If the skill auto-triggers, follow it. Address every applicable item from its 14-point checklist.
- If you are modifying UI but the skill did NOT auto-trigger, manually invoke `/make-interfaces-feel-better` before reporting done. The skill's `description` field is keyword-driven and may miss subtle UI work; an explicit invocation is the fallback.
- When summarizing UI changes (in PR descriptions, session memory, or to the user), use the skill's before/after table format. Group by principle, one row per diff. The free-form "I tightened up the button" summary is not acceptable.

### QA gate for UI work (before reporting done)

The existing Verification Protocol above (visual, interactive, side-by-side, completeness) still applies to UI work. In addition, any substantive UI change (new feature, redesign, significant component edit) must pass this triad before you report completion:

1. `/impeccable audit <target>` - runs the 5-dimension technical scan (a11y, performance, theming, responsive, anti-patterns) plus the `npx impeccable detect` CLI. Address all Critical and High findings.
2. `/impeccable critique <target>` - design review via independent sub-agents (AI-slop detection, Nielsen heuristics, cognitive load, emotional journey). Address anything above "minor".
3. `/impeccable polish <target>` - final alignment pass against the project's design system. Must run last.
4. `make-interfaces-feel-better` 14-point checklist - run through every item applicable to the change (concentric radius, optical alignment, shadows over borders, split/staggered enters, subtle exits, tabular nums, font smoothing, balanced text wrap, image outlines, scale-on-press, `initial={false}` on AnimatePresence, no `transition: all`, sparse `will-change`, 40x40 hit areas). The skill's review-output-format (before/after tables grouped by principle) is the canonical way to record what changed.
5. If the project has a `DESIGN.md` (per the Google spec): `npx @google/design.md lint DESIGN.md` and resolve every error/warning before reporting done.

Small, obviously-trivial edits (a one-line copy tweak, a named-token swap) can skip the gate. Anything where the aesthetic result is in question must run all five. "I'll skip polish because it probably looks fine" is not a valid judgment; run the commands.

### What impeccable is NOT for

Backend logic, non-UI refactors, build-tool work, infrastructure changes. Do not load `/impeccable` for those.

## Permission Posture (deliberate choice)

This machine ships with `defaultMode: bypassPermissions` and `skipDangerousModePermissionPrompt: true` in `~/.claude/settings.json`. That means every tool call - Bash, Write, Edit, MultiEdit, all of them - auto-approves without prompting, AND Claude Code's own "are you sure" warning on the bypass mode is suppressed.

This is intentional for a personal Yes& workstation. The team has decided the friction of every-tool-prompt outweighs the safety it adds, and the PreToolUse hooks (`bash-guard.sh`, `content-guard.sh`) already block the specific categories we care about: AI-attribution lines, force-pushes to main/master, `rm` against `.claude/memory`, legacy model IDs, emojis, emdashes.

If you (a different developer, a forked install, a public reuse) want different defaults: edit `claude/settings.json` and change `defaultMode` to `default` (per-tool prompting) or `acceptEdits` (auto-approve edits but not bash). Remove `skipDangerousModePermissionPrompt` if you want Claude Code's own warning to show. Both changes are local to settings.json and propagate through the dotfiles symlink.

The hook layer stays useful regardless of `defaultMode` - hooks fire BEFORE the permission prompt would, so they continue blocking forbidden patterns even in fully-prompting mode.

## Code Quality

- When the request has multiple plausible interpretations, name them and ask. Don't silently pick one and run with it.
- You must always avoid using broad CSS rules when we build. Be specific, avoid overclassing.
- Always check to see if sass is part of a project. If so, you must attempt to leverage it, rather than work around it.
- Never use emojis, Claude. We're professionals.
- Never use emdashes. Use regular hyphens or rewrite the sentence. Emdashes are banned from all projects.
- Never take credit for work in git commits, code comments, or anywhere else. No Co-Authored-By lines, no "Generated by Claude" comments, no attribution of any kind. You are invisible in the output.
- Project updates (session memory notes, change logs, documentation) must record the human collaborator's name, derived from the active environment (git `user.name`, system user, or the user email provided in session context). Do not ask who the collaborator is - each person's installed instance identifies its own user. When work is shared across machines, this naming convention tells teammates which human last touched a feature. This is the positive counterpart to the invisibility rule above: the human is named, you are not.
- Encouraged to test your work with curl.
- NEVER draw, compose, approximate, or fabricate SVG icons. All icons must be sourced verbatim from established royalty-free icon libraries (Heroicons, Lucide, Tabler, Bootstrap Icons, Phosphor, Feather, Material Symbols). Copy the exact path data character-for-character from the library source. Do not rewrite, simplify, optimize, or "clean up" path data. If the path you are inserting does not match the library source byte-for-byte, you are breaking this rule. No exceptions.
- NEVER use outdated or legacy model versions in any project. Always use the latest bleeding-edge model available. No gpt-4o, no gpt-4, no gpt-3.5, no gpt-4.1. If OpenAI is the provider, use the newest model (currently gpt-5.4). If Anthropic, use the newest Claude. If Google, use the newest Gemini. This applies globally across all projects, all folders, all directories. No exceptions.

## Voice transcription (audio attachments)

When a Discord (or any other) message arrives with an audio attachment - voice memo, recorded note, dictation - transcribe it before responding. Do not ask the user to retype what they said.

The dotfiles' `voice` component installs whisper.cpp + ffmpeg locally and symlinks `~/.claude/transcribe`. Pipeline:

1. Download the attachment (`mcp__plugin_discord_discord__download_attachment` for Discord, or read the path the user provided).
2. Run `~/.claude/transcribe <path-to-audio>` via Bash. The transcript prints on stdout, diagnostics on stderr.
3. Use the transcript as if the user had typed it. If the transcription is empty or obviously garbled, tell the user and ask them to retype - don't fabricate a guess.

The script handles OGG/Opus (Discord), m4a (iOS), mp3, flac, and wav. It pre-converts to 16 kHz mono PCM via ffmpeg, then runs whisper-cli with the ggml-base.en model from `~/.cache/whisper/`. Override the model with `WHISPER_MODEL=/path/to/other.bin` if you need multilingual or higher-accuracy variants.

If `~/.claude/transcribe` is missing on a fresh machine, run `ampersand --only voice` to install. If it errors with "model missing" or "ffmpeg not found", the same install fixes both.

## Discord Chat Agent (smart launcher + onboarding)

The `discord` component adds a state-aware wrapper around `claude` so opening a session prompts intelligently based on what's already configured on the machine. Three states:

- **Cold** (no bot token in macOS Keychain): the wrapper offers `[s] Set up now`, `[k] Skip this session`, `[n] Never ask again`. `s` runs `~/.claude/discord-onboard.sh`; `n` writes `~/.claude/channels/discord/.skip-launcher` so the prompt never reappears (delete the file to undo).
- **Mid** (token configured but no users paired in `access.json`): the wrapper offers `[p] Pair now` (launches Claude with the Discord channel attached so the user can DM the bot) or `[s] Skip`.
- **Warm** (token + at least one paired user): the familiar 5-second `Connect to Discord Chat Agent? (y/n)` prompt with default Yes.

`~/.claude/discord-onboard.sh` is the interactive walkthrough. It runs `--status` to print state and exits, or interactively dispatches to one of two paths:

1. "I already have a Discord bot": prompts for the bot token (hidden input), pipes it into `discord-setup.sh` to land in macOS Keychain.
2. "Walk me through making a new one": numbered Developer Portal steps (create application, enable Message Content Intent, reset token, generate OAuth URL, authorize), with `Press enter when done` between each, then prompts for the token.

Both paths end with the same pairing instructions: start a Claude session with the Discord channel attached, DM the bot to receive a 6-character pairing code, then run `/discord:access pair <code>` in a Claude terminal session.

If a colleague asks how to set up Discord on their machine, point them at `bash ~/.claude/discord-onboard.sh` (after they've installed at least the `claude` component of the dotfiles).

## cmux Browser Pane (visual verification tool)

`cmux` is the browser-surface CLI wired into this machine's Claude Code harness. Use it to take screenshots and drive a real browser pane for visual verification instead of (or in addition to) the `mcp__claude-in-chrome__*` tools. This is the preferred surface for verifying UI changes per the Verification Protocol above.

**Core commands** (run via Bash):
- Screenshot: `cmux browser --surface <surface-id> screenshot --out /tmp/<name>.png` then use the Read tool on the PNG to view it.
- Navigate: `cmux browser --surface <surface-id> navigate "<url>"`
- Interactive snapshot (DOM + refs for clicking): `cmux browser --surface <surface-id> snapshot --interactive`

**Surfaces are per-project.** Every project that uses cmux should record its surface id and dev-server URL as a `reference_cmux_browser.md` memory in that project's memory dir, e.g.:

```
---
name: cmux browser for <project>
description: How to use cmux browser to verify <project> UI at <url>
type: reference
---

<project> dev server runs at <url>.
cmux surface handle: surface:<NN>
```

If a project's memory does not yet declare a surface id, ask the user for it before running cmux commands - don't guess.

**When to use:**
- Any UI/CSS/layout change - take a cmux screenshot, Read the image, and describe what you see before reporting done.
- Interactive verification - use `snapshot --interactive` to get element refs, then drive clicks/hovers.
- When the user says "refresh the tab in cmux" or similar, this is the tool they mean.

## Style Guide and Component Library Rules

- When building a style guide, component library, or design system page, it MUST be fully isolated from the app's global styles. Use a separate layout with no shared CSS imports, or use CSS layers/cascade to guarantee zero inheritance from the app.
- Every component in a design system MUST be extracted directly from the design source (Figma, sketch, spec). Do not invent variants, states, or components that do not exist in the design file.
- Each component must be verified in the browser against the design source before moving to the next component. One at a time. No batch-and-pray.