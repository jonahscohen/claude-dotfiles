## Memory Discipline (MANDATORY - NO EXCEPTIONS)

### Session Startup - Memory Loading Order

At the start of every session, you MUST load and absorb project memory in this strict priority order before doing anything else:

1. **Project root memory** (`<project-root>/.claude/memory/`) - Read MEMORY.md index, then read every file referenced in it. This is the canonical source of truth for what has been done, what decisions were made, and what the current state of the project is. Absorb all of it. Do not skim. Do not summarize from the index alone. Read the actual files.
2. **Global project memory** (`~/.claude/projects/<project-path>/memory/`) - Secondary context. Read if present.
3. **Git history** - Tertiary. Use only to fill gaps not covered by memory files.
4. **Anything else** - Supportive only. Never prioritize over the above.

When a user asks "what did we work on last?" or any question about prior work, the answer comes from project root memory files first. Not git log. Not guessing. Not the startup script's git status. The memory files ARE the record.

This system exists so that Claude can be opened on multiple machines sharing the same repo and retain shared context. The memory files are the cross-session, cross-machine continuity layer. Treat them as such.

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
- Record key technical decisions with "Why:" rationale
- List files touched at the bottom
- Update `MEMORY.md` index when creating new session files

## Verification Protocol (MANDATORY - NO EXCEPTIONS)

You are BLOCKED from reporting task completion to the user until ALL of the following are true:

1. **Visual verification required.** If UI was created or modified, you MUST open it in a browser (Chrome MCP, Claude Preview, or curl) and take a screenshot. You must LOOK at the screenshot and describe what you see. "It renders" is not verification. You must confirm every element the user asked for is visually present and correct.

2. **Interactive verification required.** If the UI has interactive elements (buttons, dropdowns, toggles, inputs), you MUST click/hover/type into each one and screenshot the result. Checking computed styles via JavaScript is not a substitute for visual confirmation.

3. **Side-by-side verification required.** If building from a design reference (Figma, screenshot, spec), you MUST compare your implementation against the source. Check dimensions, colors, spacing, typography, border radius, and states. If something doesn't match, fix it before reporting.

4. **Completeness check required.** Before reporting, re-read the user's original request. List every item they asked for. Confirm each one exists in your output. If anything is missing, build it. Do not report partial work as complete.

5. **No lazy questions.** Do not ask the user "should I continue?" or "want me to do X next?" when the answer is obvious from context. If they asked you to build 5 things and you built 3, build the other 2. Take initiative.

6. **No false positives.** Running `npx tsc --noEmit` with no errors does not mean the feature works. A 200 HTTP status does not mean the page looks right. A passing CSS selector check does not mean the design matches Figma. Verify with your eyes.

If you cannot verify (no browser available, no dev server running), say so explicitly. Do not claim completion without proof.

## Code Quality

- You must always avoid using broad CSS rules when we build. Be specific, avoid overclassing.
- Always check to see if sass is part of a project. If so, you must attempt to leverage it, rather than work around it.
- Never use emojis, Claude. We're professionals.
- Never use emdashes. Use regular hyphens or rewrite the sentence. Emdashes are banned from all projects.
- Never take credit for work in git commits, code comments, or anywhere else. No Co-Authored-By lines, no "Generated by Claude" comments, no attribution of any kind. You are invisible in the output.
- Encouraged to test your work with curl.
- NEVER draw, compose, approximate, or fabricate SVG icons. All icons must be sourced verbatim from established royalty-free icon libraries (Heroicons, Lucide, Tabler, Bootstrap Icons, Phosphor, Feather, Material Symbols). Copy the exact path data character-for-character from the library source. Do not rewrite, simplify, optimize, or "clean up" path data. If the path you are inserting does not match the library source byte-for-byte, you are breaking this rule. No exceptions.
- NEVER use outdated or legacy model versions in any project. Always use the latest bleeding-edge model available. No gpt-4o, no gpt-4, no gpt-3.5, no gpt-4.1. If OpenAI is the provider, use the newest model (currently gpt-5.4). If Anthropic, use the newest Claude. If Google, use the newest Gemini. This applies globally across all projects, all folders, all directories. No exceptions.

## Style Guide and Component Library Rules

- When building a style guide, component library, or design system page, it MUST be fully isolated from the app's global styles. Use a separate layout with no shared CSS imports, or use CSS layers/cascade to guarantee zero inheritance from the app.
- Every component in a design system MUST be extracted directly from the design source (Figma, sketch, spec). Do not invent variants, states, or components that do not exist in the design file.
- Each component must be verified in the browser against the design source before moving to the next component. One at a time. No batch-and-pray.