#!/usr/bin/env bash
# Generates TTS audio as OGG (Opus) from text using the OpenAI speech API.
# Reads voice/model/speed from ~/.claude/.voice-config and API key from Keychain.
#
# Usage: tts-generate "Text to speak" [/optional/output.ogg]
# Prints the output file path on stdout.

set -euo pipefail

TEXT="${1:-}"
if [ -z "$TEXT" ]; then
  echo "Usage: tts-generate \"Text to speak\" [output.ogg]" >&2
  exit 1
fi

CLAUDE_DIR="$HOME/.claude"
CONFIG_FILE="$CLAUDE_DIR/.voice-config"

# Read config
if [ -f "$CONFIG_FILE" ]; then
  TTS_MODEL=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE')).get('model', ''))" 2>/dev/null || true)
  TTS_VOICE=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE')).get('voice', 'onyx'))" 2>/dev/null || true)
  TTS_SPEED=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE')).get('speed', 1.0))" 2>/dev/null || true)
else
  echo "No voice config at $CONFIG_FILE" >&2
  exit 1
fi

if [ -z "$TTS_MODEL" ]; then
  echo "No TTS model configured in $CONFIG_FILE" >&2
  exit 1
fi

# API key from Keychain
API_KEY=$(security find-generic-password -a 'claude-voice' -s 'openai-tts-api-key' -w 2>/dev/null || true)
if [ -z "$API_KEY" ]; then
  echo "No OpenAI API key in Keychain. Add one with:" >&2
  echo "  security add-generic-password -a 'claude-voice' -s 'openai-tts-api-key' -w 'sk-YOUR-KEY'" >&2
  exit 1
fi

# Output path
OUT_OGG="${2:-/tmp/claude-tts-$(date +%s).ogg}"
TMP_MP3="/tmp/claude-tts-$$.mp3"

# Generate audio via Python (avoids shell-quoting issues with arbitrary text)
python3 -c "
import json, urllib.request, sys

req = urllib.request.Request(
    'https://api.openai.com/v1/audio/speech',
    data=json.dumps({
        'model': sys.argv[1],
        'input': sys.argv[2],
        'voice': sys.argv[3],
        'speed': float(sys.argv[4]),
    }).encode(),
    headers={
        'Authorization': 'Bearer ' + sys.argv[5],
        'Content-Type': 'application/json',
    },
)
with urllib.request.urlopen(req) as resp:
    with open(sys.argv[6], 'wb') as f:
        f.write(resp.read())
" "$TTS_MODEL" "$TEXT" "$TTS_VOICE" "$TTS_SPEED" "$API_KEY" "$TMP_MP3"

# Convert to OGG Opus
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found - install with: brew install ffmpeg" >&2
  rm -f "$TMP_MP3"
  exit 1
fi

ffmpeg -y -i "$TMP_MP3" -c:a libopus "$OUT_OGG" 2>/dev/null
rm -f "$TMP_MP3"

echo "$OUT_OGG"
