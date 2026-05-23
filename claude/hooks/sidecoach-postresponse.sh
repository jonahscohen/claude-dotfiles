#!/usr/bin/env bash
# Sidecoach Stop/PostResponse hook - injects daemon results into response

STATE_FILE="$HOME/.claude/.sidecoach-state"

if [[ ! -f "$STATE_FILE" ]]; then exit 0; fi
source "$STATE_FILE"
if [[ "$ACTIVE" != "1" ]]; then exit 0; fi

RESULTS_DIR="/tmp/sidecoach-results-$SESSION_ID"
if [[ ! -d "$RESULTS_DIR" ]]; then exit 0; fi

LATEST=$(ls -t "$RESULTS_DIR"/result-*.json 2>/dev/null | head -1)
if [[ -z "$LATEST" ]]; then exit 0; fi

LATEST_FILE="$LATEST" node -e "
  const fs = require('fs');
  const result = JSON.parse(fs.readFileSync(process.env.LATEST_FILE, 'utf8'));
  if (result.success && result.message) {
    const guidance = (result.guidance || []).map(g => '  - ' + g).join('\n');
    console.log('\n[Sidecoach: ' + (result.detectedFlow?.flowName || 'flow') + ']\n' + result.message + (guidance ? '\n' + guidance : ''));
  }
  fs.unlinkSync(process.env.LATEST_FILE);
" 2>/dev/null

exit 0
