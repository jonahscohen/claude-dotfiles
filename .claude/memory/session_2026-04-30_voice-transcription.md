---
name: Voice transcription pipeline (whisper.cpp + ffmpeg + transcribe CLI)
description: New 'voice' installer component that wires local whisper.cpp + ffmpeg + a transcribe CLI so Claude can answer Discord voice messages and any other audio attachment without retyping. Installs default-on as part of the whole-package preset.
type: project
---

Collaborator: Jonah Cohen

# What changed

Eighth public installer component: `voice`. Adds three things to a fresh machine:

1. `whisper-cpp` and `ffmpeg` from Homebrew (idempotent; brew is a no-op when already installed).
2. The `ggml-base.en.bin` whisper model (~150 MB) downloaded into `~/.cache/whisper/`. Skipped if a >100 MB file already exists at that path.
3. `claude/transcribe.sh` in the repo, symlinked to `~/.claude/transcribe` so the canonical invocation `~/.claude/transcribe <file>` works from any cwd.

Plus a CLAUDE.md section ("Voice transcription (audio attachments)") that tells future-Claude to call the CLI whenever an audio attachment arrives, instead of asking the user to retype.

# Why

The user sent a Discord voice message ("Stage commit deploy.") earlier in this session, and we had no transcription tool wired up - I had to ask them to type it. They came back with "configure so that you can understand my voice messages and respond, then make that part of the default package in dotfiles." So this work is the durable fix: every machine that runs the whole-package install gets voice-message answering for free.

Local-only (no API key, no cloud) was an explicit design choice: privacy, cost, no rate limits, works offline. The dotfiles already lean on Homebrew for tooling, so brew-installed whisper.cpp + ffmpeg fits the existing posture.

# How

## transcribe.sh

`claude/transcribe.sh` is a small bash script: validate args, validate deps (ffmpeg, whisper-cli, model file), pre-convert the input via `ffmpeg -ar 16000 -ac 1 -c:a pcm_s16le` (whisper.cpp's required format - covers OGG/Opus from Discord, m4a from iOS, mp3, flac, wav), then run `whisper-cli -nt -np` with the model and trim leading/trailing whitespace. Transcript on stdout, diagnostics on stderr, exit codes 0/2/3 for ok/bad-args/missing-deps. `WHISPER_MODEL` env var overrides the default model path.

Why ffmpeg even though `whisper-cli --help` claims OGG support: whisper.cpp's OGG decoder handles OGG/Vorbis only, but Discord voice messages are OGG/Opus. Direct `whisper-cli -f voice.ogg` failed with "failed to read audio data as wav (Unknown error)". ffmpeg pre-conversion fixed it.

## Installer wiring

Added a new `voice` key to all four parallel arrays in `install.sh` (KEYS, TITLES, DESCS, PICKS), default-picked. New `if picked voice` block at the bottom of the install dispatch (numbered "11. Voice transcription"):

- Brew-install whisper-cpp and ffmpeg if missing, with idempotency checks (`command -v whisper-cli`, `command -v ffmpeg`).
- Download the model to `~/.cache/whisper/ggml-base.en.bin` if not already there. Uses `.partial` + `mv` for atomic completion so a partial download doesn't get treated as valid on re-run. The `>100000000` size check covers stat differences between macOS (`-f%z`) and Linux (`-c%s`).
- `mkdir -p ~/.claude` and `make_symlink` from `claude/transcribe.sh` to `~/.claude/transcribe`.

Help text, KEYS list comment header (now "eight components"), and the post-install summary line all updated.

Voice does NOT need a NEED_SHELL_RELOAD or NEED_GHOSTTY_RESTART, so the post-install bullets are unchanged.

## CLAUDE.md

New section "Voice transcription (audio attachments)" between the Code Quality and cmux sections. Three numbered steps (download attachment, run transcribe, use transcript), the supported formats list, the model-override env var, and the recovery path (`ampersand --only voice`) for fresh machines.

# Verification

- `bash -n install.sh` exits 0
- `./install.sh --dry-run --only voice` shows only `voice` ticked
- `./install.sh --only voice` (live) re-runs cleanly: deps already installed, model already present, symlink already linked - all "already" branches fire
- `~/.claude/transcribe` is a symlink to `claude/transcribe.sh` (verified via `ls -la`)
- `~/.claude/transcribe /path/to/Discord/voice.ogg` outputs `Stage commit deploy.` (the transcribed message) on stdout
- Error paths: no args -> exit 2 with usage, bad path -> exit 2 with "file not found"
- `whisper-cli` reads OGG/Opus only after ffmpeg pre-conversion; direct `whisper-cli -f voice.ogg` fails

# Files touched

- `claude/transcribe.sh` (new, 53 lines)
- `claude/CLAUDE.md` (new "Voice transcription (audio attachments)" section above cmux)
- `install.sh` (KEYS arrays, --help text, new install block, summary line)
- `.claude/memory/session_2026-04-30_voice-transcription.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)

External (not in repo) but seeded by the install:
- `~/.cache/whisper/ggml-base.en.bin` (~150 MB ggml model)
- `~/.claude/transcribe` (symlink)
- Homebrew formulae: `whisper-cpp`, `ffmpeg`

# Open knowns

- English-only model. If Jonah ever needs multilingual transcription, swap to `ggml-base.bin` (multilingual base) via `WHISPER_MODEL=/path/...` or change the URL in install.sh. The CLI honors `WHISPER_MODEL` so per-call overrides work without an installer rerun.
- Linux/WSL: install.sh's `if picked voice` block uses `brew install`. On Linux the user would need `apt install ffmpeg && pip install whisper-cpp` (or build whisper.cpp from source) - the brew-only branch warns and continues. Same shape as the existing macOS-first warning at the top of install.sh.
- Discord plugin's channel server still surfaces audio attachments through the inbox path. Auto-transcription on download (so the transcript lands in the channel block instead of needing a separate Bash call) would require modifying the plugin source, which we don't own. The current setup keeps that boundary clean.
