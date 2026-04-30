#!/usr/bin/env bash
# transcribe - audio file to text via whisper.cpp
#
# Usage:   transcribe <audio-file>
# Output:  transcript on stdout, diagnostics on stderr
# Exit:    0 = ok, 2 = bad args / missing file, 3 = missing deps / model
#
# Pipeline:
#   1) ffmpeg converts the input to 16 kHz mono PCM WAV (whisper.cpp's required
#      format; covers OGG/Opus from Discord, m4a from iOS, mp3, flac, etc.)
#   2) whisper-cli runs the ggml-base.en model on the WAV and prints the
#      transcript with -nt (no timestamps) so callers can pipe it cleanly.
#
# Override the model with WHISPER_MODEL=/path/to/other.bin. Default lives at
# ~/.cache/whisper/ggml-base.en.bin (pulled by the dotfiles `voice` installer).

set -euo pipefail

MODEL="${WHISPER_MODEL:-$HOME/.cache/whisper/ggml-base.en.bin}"

if [ $# -lt 1 ]; then
  echo "usage: transcribe <audio-file>" >&2
  exit 2
fi

AUDIO="$1"
if [ ! -f "$AUDIO" ]; then
  echo "transcribe: file not found: $AUDIO" >&2
  exit 2
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "transcribe: ffmpeg not found. Install via 'brew install ffmpeg' or rerun the dotfiles 'voice' component." >&2
  exit 3
fi
if ! command -v whisper-cli >/dev/null 2>&1; then
  echo "transcribe: whisper-cli not found. Install via 'brew install whisper-cpp' or rerun the dotfiles 'voice' component." >&2
  exit 3
fi
if [ ! -f "$MODEL" ]; then
  echo "transcribe: model missing at $MODEL. Rerun the dotfiles 'voice' component to download it." >&2
  exit 3
fi

TMP="$(mktemp -t transcribe.XXXXXX).wav"
trap 'rm -f "$TMP"' EXIT

ffmpeg -y -loglevel error -i "$AUDIO" -ar 16000 -ac 1 -c:a pcm_s16le "$TMP" >&2

whisper-cli -m "$MODEL" -f "$TMP" -nt -np 2>/dev/null | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
