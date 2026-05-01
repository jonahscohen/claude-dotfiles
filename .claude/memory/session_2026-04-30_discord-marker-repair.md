---
name: Discord approved-channel marker repair fallback
description: When the Discord reply tool fails with "channel not allowlisted" despite the user being in access.json's allowFrom, the bot's in-memory channel cache has dropped out of sync. Added `discord-onboard.sh --repair` as the official fallback to rebuild the one-shot marker files in `~/.claude/channels/discord/approved/<userId>` so the bot re-arms its in-memory state on next poll.
type: project
---

Collaborator: Jonah Cohen

# What

Mid-session, Discord replies started failing with `reply failed: channel 1484477050038521989 is not allowlisted - add via /discord:access`. Earlier replies in the same conversation had succeeded, so something dropped out from under us.

Diagnosis (after reading the access skill spec): the pairing flow's step 7 writes `~/.claude/channels/discord/approved/<senderId>` with the chat_id as contents. The bot polls that directory, reads the file, adds the (user, chat) tuple to its in-memory allowlist, and DELETES the file. The marker is a one-shot signal, not a persistent record. `access.json` is the persistent record, and the bot's in-memory cache is the live runtime state.

If the bot restarts, crashes, or is otherwise re-spawned without re-pairing, its in-memory cache is empty. `access.json` still lists the user, so they think they're set up, but the bot has no idea what chat to talk to. DMs silently fail.

# Manual fix that proved the diagnosis

Wrote `~/.claude/channels/discord/approved/740463860175077388` containing `1484477050038521989` (the DM chat snowflake). Bot picked it up, reply tool started working again. File was then consumed (deleted) by the bot.

# Official fallback added to the discord component

`claude/discord-onboard.sh` gains `--repair` mode (and `--help` is updated). It:

1. Reads `access.json`, errors out cleanly if missing or if `allowFrom` is empty.
2. Requires `jq` for safe JSON parsing.
3. For each user in `allowFrom`, checks `approved/<userId>`:
   - If present and non-empty, reports `[ok]` with the mapped chat_id.
   - If missing, prompts the user to paste the DM chat snowflake (validates 15-20 digits), writes the marker, reports `[ok]`.
   - On empty input or invalid input, skips with a clear message.
4. Prints `Repaired: N. Skipped: M.` summary.

CLAUDE.md's Discord section gains a paragraph explaining the failure mode and the recovery command, so future-Claude on any team machine can route a colleague to the fix without re-deriving the diagnosis.

# Why

The user's framing: "my team needs to be able to move quickly and asking for permission every single time they run a task is going to slow them down." That applies to the memory-write prompts AND to silent Discord failures. A colleague hitting this issue without docs would be stuck. The repair command is one line, runs in a few seconds, and the CLAUDE.md note tells them when to use it.

# How

`--repair` lives next to `--status` in the dispatcher. Reuses existing constants (`STATE_DIR`, `ACCESS_FILE`). The function is fully self-contained: no new dependencies, fails closed when prerequisites are missing, never touches `access.json` (the skill owns that), only writes to `approved/`.

The chat_id has to come from the user because we can't reliably derive it from the bot side - the only way to know which DM channel maps to which user is to have the bot tell us, and that signal got lost along with the in-memory cache. Users find it in their Claude session's `<channel chat_id="...">` tag from any recent Discord message.

# Verification

- `zsh -n claude/discord-onboard.sh` -> syntax OK
- `bash claude/discord-onboard.sh --help` -> shows new `--repair` line
- `bash claude/discord-onboard.sh --status` -> reports state correctly
- `bash claude/discord-onboard.sh --repair < /dev/null` (non-tty) -> detects missing marker, prompts (read fails on no tty), skips cleanly. Output: `Repaired: 0. Skipped: 1.`
- Manual marker write earlier in session -> reply tool succeeded immediately after
- Subsequent reply (after marker was consumed) -> still succeeded, confirming the bot's in-memory state persists across marker consumption

# Files touched

- `claude/discord-onboard.sh` (+74 lines: `repair_approved_markers` function, `--repair` dispatch, `--help` block expanded, troubleshooting block in warm-state output)
- `claude/CLAUDE.md` (Discord Chat Agent section gets a "Reply tool fails with 'channel not allowlisted'" paragraph pointing at `--repair`)
- `.claude/memory/session_2026-04-30_discord-marker-repair.md` (this file)
- `.claude/memory/MEMORY.md` (index entry, next)

# Open knowns

- A future improvement would be auto-detecting chat_id by scanning `~/.claude/channels/discord/inbox/` for recently-received messages with matching senderId. Not done because inbox filenames don't include chat_id today and the user-paste path works. If it becomes a real friction, revisit.

# Deeper diagnosis after testing

After shipping `--repair`, replies kept failing intermittently. Read the plugin source at `~/.claude/plugins/cache/claude-plugins-official/discord/0.0.4/server.ts`. Two findings:

1. **The real outbound gate is at line 403** (`fetchAllowedChannel`). It does `client.channels.fetch(id)` then checks `access.allowFrom.includes(ch.recipientId)`. The `approved/` marker file is NOT what the gate reads - the gate hits `access.json`'s allowFrom directly. The marker is a one-shot signal for the pairing flow, not a runtime credential.

2. **Multiple bot instances share state via filesystem but not memory.** `ps aux | grep discord` showed 4 separate `bun run` processes (PIDs 19630, 23638, 23639, 23640) all running the same server.ts. They share `access.json` and the `approved/` directory on disk, but each has its own Discord.js client and its own channel cache. When I write a marker, only ONE bot consumes it and only that bot's channel cache gets warmed. MCP reply tool calls appear to load-balance across instances (or Claude Code routes per-session), so a marker write may warm a bot that doesn't get the next reply call.

This explains why `--repair` works sometimes and not others. It's still a useful workaround (it raises the odds of a successful reply for some window) but the underlying bug is in the plugin and needs upstream attention:

- The gate should fall back to a force-refetch (`client.channels.fetch(id, { force: true })`) when `ch.recipientId` is undefined, OR look up the User by ID and resolve their DM channel that way.
- OR the plugin should run as a single per-machine daemon, not per-session, so all sessions share the same channel cache.

# Status as of session end

- Memory permission fix: shipped, verified, working.
- `--repair` mode: shipped, structurally verified, useful as a workaround but not a clean fix.
- Reply tool: still flaky during this session due to the multi-instance / cache-eviction issue. Not blocking the user's ability to keep working in their terminal Claude session - they can just chat there.
- Upstream PR territory: the gate logic in the discord plugin needs hardening. Ticket-worthy.

# Retraced diagnosis (corrected, the user pushed for it)

After looping on failed replies I lost sight of the obvious debugging step: trace what changed between when replies worked and when they didn't. Doing that:

- Replies 1-5 in this session worked with no special handling. They all happened during active back-and-forth chat, never more than ~30s between user inbound and my outbound.
- Reply 6 failed. It came after a 3-4 minute window of file editing (settings.json edits, test memory write, verification commands) where no Discord traffic flowed in either direction.
- After that, marker writes restored replies briefly, then they failed again on idle.
- A fresh inbound voice message from the user immediately re-enabled both `download_attachment` and `reply`.

**Pattern: time since last inbound message from the user.** Discord.js's channel cache warms on the bot's `messageCreate` handler. While chat is active, every inbound refreshes the cache and `ch.recipientId` is populated. After several idle minutes, the cache evicts; the next `client.channels.fetch(id)` returns a partial channel without `recipientId`, the gate throws.

**Marker workaround helps because** the marker watcher's `fetchTextChannel(dmChannelId)` warms the cache as a side effect. But that warmth is short-lived too. With 4 bot processes sharing the disk state but not the in-memory cache, marker writes only warm one bot's cache, so the help is intermittent.

**Real upstream fix:** patch `fetchAllowedChannel` (server.ts:403) to retry with `client.channels.fetch(id, { force: true })` when `ch.recipientId` is undefined, OR resolve via User lookup, OR run a single per-machine bot daemon so all sessions share one cache.

**Operational workaround until upstream lands:** stay in regular Discord cadence, or write a marker right before a reply that follows a long idle period. `--repair` is the user-facing version of the marker write.

# Lesson for next time

When something stops working, the FIRST debug step is "what changed between the last working state and now?" I jumped straight into source diving and theorizing about multiple processes when the answer was sitting right there in the chat history: replies worked during active chat, failed after a long quiet window. The user had to redirect me back to the basic protocol. That's worth remembering.
