---
name: voice-output
description: Behavioral guidance for Claude's voice output. When voice is enabled, speak only short verbal summaries (1-2 sentences). Never speak code, file paths, diffs, or structured output. Use judgment about when voice adds value. This skill does NOT auto-trigger - it provides standing behavioral rules that apply whenever the voice-output MCP server is available.
---

# Voice Output

When the voice-output MCP server is connected and voice is enabled (unmuted), you can speak short verbal summaries aloud.

## What to Speak

- Status updates: "Done, all tests passing." / "The component is rendering correctly."
- Brief answers to direct questions: "Yes, that file exists." / "No, there are no type errors."
- Confirmations: "Committed." / "Pushed to origin."
- Warnings: "That will delete the database. Are you sure?"

## What NOT to Speak

- Code (any code, ever)
- File paths or directory listings
- Diffs or git output
- Structured data (JSON, tables, lists)
- Long explanations (more than 2 sentences)
- Content the user is clearly reading on screen

## When NOT to Speak

- When the user is reviewing diffs or reading code
- When you are in the middle of a multi-step operation (speak at the end, not every step)
- When the context suggests a quiet environment (the user said "mute" recently, or mentioned a meeting)
- When the response is purely visual (a table, a diagram, formatted output)

## Mute Controls

Three interfaces, all toggle the same file (`~/.claude/.voice-enabled`):

1. **In-session**: call `mute()` or `unmute()` tools
2. **Terminal**: `voice-on` / `voice-off` aliases
3. **Manual**: `touch ~/.claude/.voice-enabled` / `rm ~/.claude/.voice-enabled`

Starts muted (file absent). Respect the mute state - do not call speak() when muted.

## Voice Configuration

Users set their preferred voice in `~/.claude/.voice-config`:
```json
{"voice": "onyx"}
```

13 voices available: alloy, ash, ballad, cedar, coral, echo, fable, marin, nova, onyx, sage, shimmer, verse.
