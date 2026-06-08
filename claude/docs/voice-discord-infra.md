# Voice + Discord Infrastructure (setup / reference)

This is setup and pipeline detail moved out of CLAUDE.md to keep the always-loaded
instructions under the harness size limit. The BEHAVIORAL RULES stay in CLAUDE.md
(voice gating via the `voice-mandate` hook; transcribe audio before responding; the
Discord launcher/repair nubs). This file is the how-it-works reference - read it on
demand when doing voice / Discord / transcription work. Nothing here changes how
Claude behaves; it is the lookup detail behind rules that are enforced by hooks.

## Voice output infrastructure

Claude can speak short verbal summaries aloud via OpenAI TTS API. Requires an OpenAI API key stored in macOS Keychain (`security add-generic-password -a 'claude-voice' -s 'openai-tts-api-key' -w 'YOUR_KEY'`). No key = feature unavailable, no fallback.

Three mute controls (all toggle the same `~/.claude/.voice-enabled` file):
- In-session: "mute yourself" / "unmute" / `voice on` / `voice off`
- Terminal: `voice-on` / `voice-off`
- Manual: `touch ~/.claude/.voice-enabled` / `rm ~/.claude/.voice-enabled`

Starts muted. Preferences in `~/.claude/.voice-config`:
```json
{"voice": "onyx", "verbosity": "short", "speed": 1.25}
```

13 voices: alloy, ash, ballad, cedar, coral, echo, fable, marin, nova, onyx, sage, shimmer, verse.

Verbosity controls how much Claude says when speaking:
- `"short"` (default) - 1-2 sentences. Status, confirmations, brief answers.
- `"normal"` - 3-4 sentences. Includes brief context or reasoning.
- `"verbose"` - Full spoken paragraph. What changed, why, what's next. Still conversational.

**Speed**: `0.25` to `4.0`, default `1.0`. Values above 1.0 speed up speech.

Never speak code, diffs, file paths, or structured output at any verbosity level.

## Discord voice replies

When voice is active and responding to a Discord message, generate a TTS audio file and attach it as an OGG alongside the text reply. This gives the user both a written and spoken response in-chat, mirroring how they send voice messages.

Pipeline:
1. Compose the reply text.
2. Run `~/.claude/tts-generate "reply text" /tmp/discord-reply-<timestamp>.ogg` via Bash. It reads voice/model/speed from `~/.claude/.voice-config` and the API key from Keychain. Prints the output path on stdout.
3. Attach the OGG to the Discord reply via the `files` parameter on `mcp__plugin_discord_discord__reply`.
4. Also speak the reply locally via `mcp__voice-output__speak` as usual.

The spoken content should be the conversational reply itself, not a meta-summary ("Jonah said X, I replied Y"). Match or closely mirror the Discord reply text so it sounds like a real back-and-forth.

If `~/.claude/tts-generate` is missing, run `ampersand --only voice-output` to install it.

## Voice transcription pipeline

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
- **Warm** (token + at least one paired user): `Connect to Discord Chat Agent? (y/n)` prompt, waits indefinitely for an answer, default Yes.

`~/.claude/discord-onboard.sh` is the interactive walkthrough. It runs `--status` to print state and exits, or interactively dispatches to one of two paths:

1. "I already have a Discord bot": prompts for the bot token (hidden input), pipes it into `discord-setup.sh` to land in macOS Keychain.
2. "Walk me through making a new one": numbered Developer Portal steps (create application, enable Message Content Intent, reset token, generate OAuth URL, authorize), with `Press enter when done` between each, then prompts for the token.

Both paths end with the same pairing instructions: start a Claude session with the Discord channel attached, DM the bot to receive a 6-character pairing code, then run `/discord:access pair <code>` in a Claude terminal session.

If a colleague asks how to set up Discord on their machine, point them at `bash ~/.claude/discord-onboard.sh` (after they've installed at least the `claude` component of the dotfiles).

**Reply tool fails with "channel ... is not allowlisted" but you're already paired.** This is a recoverable failure mode caused by the bot's in-memory channel-allowlist dropping out of sync with `access.json`. The pairing flow writes a one-shot signal file at `~/.claude/channels/discord/approved/<userId>` containing the DM `chat_id`, the bot polls the directory, picks up the file, adds the chat to its in-memory allowlist, then deletes the file. If the bot restarts without re-pairing, the in-memory list is empty and the marker is gone, so DMs silently fail even though `access.json` still lists the user. Recovery: `bash ~/.claude/discord-onboard.sh --repair` walks the allowFrom list, prompts for the chat_id of any user missing a marker, and writes the file. The bot then re-arms in-memory state on its next poll.
