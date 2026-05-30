#!/usr/bin/env bash
# UserPromptSubmit hook. When a destructive op is pending (was blocked by
# destructive-ops-guard.sh) and the user types a confirmation word, promote the
# pending op to a one-shot approval. This script is the ONLY writer of the
# ~/.claude/.destructive-op-approved flag, and it fires only on real human
# input, so Claude cannot self-approve a blocked command.

PENDING="$HOME/.claude/.destructive-op-pending"
APPROVED="$HOME/.claude/.destructive-op-approved"
WINDOW=600   # pending validity window, in seconds

prompt="$(cat)"
msg="$(echo "$prompt" | python3 -c "import sys,json; print(json.load(sys.stdin).get('prompt','').strip().lower())" 2>/dev/null)"

emit() {
  python3 -c "import json,sys; m=sys.argv[1]; print(json.dumps({'systemMessage':m,'hookSpecificOutput':{'hookEventName':'UserPromptSubmit','additionalContext':m}}))" "$1"
}

# Only act on a deliberate confirmation phrase. Anything else: no-op.
case "$msg" in
  confirm|confirmed|"confirm deploy"|"confirm it"|"confirm this"|approve|approved|"yes confirm")
    ;;
  *)
    exit 0
    ;;
esac

# A confirmation only means something if a fresh pending op exists.
[ -f "$PENDING" ] || exit 0
P_EPOCH=$(sed -n '1p' "$PENDING" 2>/dev/null)
P_B64=$(sed -n '2p' "$PENDING" 2>/dev/null)
[ -n "$P_EPOCH" ] && [ -n "$P_B64" ] || exit 0

NOW=$(date +%s)
if [ $((NOW - P_EPOCH)) -ge $WINDOW ] 2>/dev/null; then
  rm -f "$PENDING"
  emit "The pending destructive command expired (older than 10 minutes), so the confirmation was not applied. Re-run the command to get a fresh confirmation prompt."
  exit 0
fi

# Promote pending -> approved with a fresh timestamp; consume the pending marker.
{ printf '%s\n' "$NOW"; printf '%s\n' "$P_B64"; } > "$APPROVED"
rm -f "$PENDING"

DECODED=$(printf '%s' "$P_B64" | base64 --decode 2>/dev/null | tr '\n' ' ')
emit "Destructive command approved by the user for ONE execution. You may now re-run exactly this command (it will be allowed once, then re-locked): ${DECODED}"
