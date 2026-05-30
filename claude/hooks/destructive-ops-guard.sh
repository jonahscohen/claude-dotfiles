#!/bin/bash
# PreToolUse hook for Bash. Blocks destructive infrastructure commands that an
# AI should never run without explicit human consent:
#   Tier 1 - production / destructive environment deploys (Pantheon terminus)
#   Tier 2 - cross-environment database pulls / clobbers (terminus, acli, wp, drush, mysql)
#   Tier 3 - pull-request merges (gh pr merge)
#
# Reads hook input JSON from stdin, emits permissionDecision JSON to stdout
# (same contract as bash-guard.sh: '{}' allows, permissionDecision 'deny' blocks).
#
# Override model (see destructive-confirm-detect.sh):
#   On a match the guard writes ~/.claude/.destructive-op-pending (epoch + base64
#   of the exact command) and DENIES, with a message telling Claude to ask the
#   user to confirm. The user's typed "confirm" is detected by the
#   UserPromptSubmit hook destructive-confirm-detect.sh, which promotes pending
#   -> ~/.claude/.destructive-op-approved. The next IDENTICAL command is then
#   allowed exactly once and both flags are consumed. Claude cannot self-approve:
#   only the UserPromptSubmit hook (reacting to real human input) writes the
#   approved flag.
#
# False-positive defense: command VERBS are matched against a quote-stripped
# copy of the command, so `git commit -m "... terminus env:deploy x.live ..."`
# or `echo "wp db import"` do NOT trip the guard. SQL keywords (DROP/TRUNCATE),
# which legitimately live inside quotes, are only honored when a real DB-client
# invocation is present OUTSIDE quotes.

INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)

# Fail open on empty / unparseable command - never lock the session out.
if [ -z "$CMD" ]; then echo '{}'; exit 0; fi

# Sanitized copy used for VERB detection: strip heredoc bodies and quoted spans
# so prose mentions of dangerous commands (inside -m "...", echo "...", or a
# cat <<EOF ... EOF beat/doc body) don't match. Command verbs only ever appear
# in a heredoc body or a quoted string as documented text, never as an executed
# command, so this is safe. SQL keywords (which legitimately live inside quotes/
# heredocs as real statements) are still matched against the RAW command, gated
# on a real DB-client verb being present in SANITIZED.
SANITIZED=$(printf '%s' "$CMD" | python3 -c '
import sys, re
s = sys.stdin.read()
# 1) strip heredoc bodies (data passed to another program, not executed verbs)
lines = s.split("\n")
kept = []
in_hd = False
delim = ""
dash = False
for line in lines:
    if in_hd:
        chk = line.lstrip() if dash else line
        if chk == delim:
            in_hd = False
        continue
    m = re.search(r"<<(-?)\s*([\x27\"]?)([A-Za-z_][A-Za-z0-9_]*)\2", line)
    if m:
        dash = (m.group(1) == "-")
        delim = m.group(3)
        in_hd = True
    kept.append(line)
s = "\n".join(kept)
# 2) strip quoted spans
s = re.sub(r"\x27[^\x27]*\x27", " ", s)        # single-quoted spans
s = re.sub(r"\"(?:\\.|[^\"\\])*\"", " ", s)    # double-quoted spans
sys.stdout.write(s)
' 2>/dev/null)

PENDING="$HOME/.claude/.destructive-op-pending"
APPROVED="$HOME/.claude/.destructive-op-approved"
WINDOW=600   # approval / pending validity window, in seconds

REASON=""
CATEGORY=""

# match against the quote-stripped command (verb detection)
ms()  { echo "$SANITIZED" | grep -qE  "$1"; }   # case-sensitive
msi() { echo "$SANITIZED" | grep -qiE "$1"; }   # case-insensitive
# match a SQL keyword against the RAW command (keyword may be quoted)
ddl() { echo "$CMD" | grep -qiE "$1"; }

# ---------- TIER 1: production / destructive environment deploys ----------
if [ -z "$REASON" ] && ms 'terminus[[:space:]]+env:deploy[[:space:]]+[^[:space:]]+\.live(\b|$)'; then
  CATEGORY="production deploy"
  REASON="this promotes code to the Pantheon LIVE (production) environment."
elif [ -z "$REASON" ] && ms 'terminus[[:space:]]+env:deploy[[:space:]].*--sync-content'; then
  CATEGORY="production deploy"
  REASON="this deploy uses --sync-content, which clones the upstream environment's database and files down over the target."
elif [ -z "$REASON" ] && ms 'terminus[[:space:]]+(env:wipe|site:delete|backup:restore)\b'; then
  CATEGORY="destructive environment op"
  REASON="this terminus command wipes, deletes, or restores-over an environment."
fi

# ---------- TIER 2: cross-environment database pulls / clobbers ----------
if [ -z "$REASON" ] && ms 'terminus[[:space:]]+env:clone-content[[:space:]]+[^[:space:]]+\.(live|test)[[:space:]]'; then
  CATEGORY="cross-env DB clone"
  REASON="this clones content (database + files) from a higher environment down over the target, overwriting it. A subsite missing from the source is erased in the target."
elif [ -z "$REASON" ] && ms 'acli[[:space:]]+(pull|push):(database|db)\b'; then
  CATEGORY="cross-env DB sync"
  REASON="this Acquia (acli) command syncs a database between environments, overwriting the destination."
elif [ -z "$REASON" ] && ms 'wp[[:space:]]+db[[:space:]]+(import|reset|drop|clean)\b'; then
  CATEGORY="database overwrite"
  REASON="wp db import/reset/drop/clean overwrites or destroys the current database. On multisite this can zero out subsites missing from the dump."
elif [ -z "$REASON" ] && ms 'terminus[[:space:]]+wp[[:space:]]+[^[:space:]]+[[:space:]]+--[[:space:]]+db[[:space:]]+(import|reset|drop|clean)\b'; then
  CATEGORY="database overwrite"
  REASON="this runs a destructive wp db command remotely on a Pantheon environment via terminus."
elif [ -z "$REASON" ] && ms 'wp[[:space:]]+site[[:space:]]+(delete|empty)\b'; then
  CATEGORY="subsite destruction"
  REASON="wp site delete/empty removes or empties a multisite subsite."
elif [ -z "$REASON" ] && ms 'drush[[:space:]].*sql[:-](sync|drop)\b'; then
  CATEGORY="cross-env DB sync"
  REASON="drush sql:sync/sql:drop copies a source database over a target or drops all tables."
elif [ -z "$REASON" ] && ms 'drush[[:space:]].*sql[:-]cli[^>]*<'; then
  CATEGORY="database overwrite"
  REASON="drush sql:cli is piping a dump file into the database, overwriting it."
elif [ -z "$REASON" ] && ms 'mysql[[:space:]][^>|]*<[[:space:]]*[^[:space:]]+\.sql'; then
  CATEGORY="database overwrite"
  REASON="this imports a .sql dump into a MySQL database, overwriting existing data."
elif [ -z "$REASON" ] && ms 'cat[[:space:]]+[^|]*\.sql[[:space:]]*\|[[:space:]]*mysql\b'; then
  CATEGORY="database overwrite"
  REASON="this pipes a .sql dump into mysql, overwriting existing data."
elif [ -z "$REASON" ] && ms 'mysqladmin[[:space:]].*[[:space:]]drop\b'; then
  CATEGORY="database drop"
  REASON="mysqladmin drop deletes an entire database."
fi

# ---------- TIER 2b: destructive SQL keywords, only inside a real DB client ----------
if [ -z "$REASON" ] && ms 'wp[[:space:]]+db[[:space:]]+query\b' && ddl '\b(DROP|TRUNCATE|DELETE)\b'; then
  CATEGORY="destructive SQL"
  REASON="wp db query is running a DROP/TRUNCATE/DELETE statement."
elif [ -z "$REASON" ] && ms 'drush[[:space:]].*sql[:-]query\b' && ddl '\b(DROP|TRUNCATE)\b'; then
  CATEGORY="destructive SQL"
  REASON="drush sql:query is running a DROP/TRUNCATE statement."
elif [ -z "$REASON" ] && ms '(mysql|mariadb|psql)\b' && ddl '\b(DROP[[:space:]]+(DATABASE|TABLE|SCHEMA)|TRUNCATE([[:space:]]+TABLE)?)\b'; then
  CATEGORY="destructive SQL"
  REASON="this runs a DROP DATABASE/TABLE or TRUNCATE against a SQL database."
fi

# ---------- TIER 3: pull-request merges ----------
if [ -z "$REASON" ] && ms 'gh[[:space:]]+pr[[:space:]]+merge(\b|$)'; then
  # --disable-auto only turns OFF auto-merge; it is non-destructive.
  if ! ms 'gh[[:space:]]+pr[[:space:]]+merge[[:space:]].*--disable-auto\b'; then
    CATEGORY="PR merge"
    if ms 'gh[[:space:]]+pr[[:space:]]+merge[[:space:]].*--admin\b'; then
      REASON="this merges a pull request with --admin, bypassing branch protection (required reviews and checks). Merging requires human approval."
    else
      REASON="this merges a pull request. Merging requires human approval."
    fi
  fi
fi

# ---------- not dangerous: allow ----------
if [ -z "$REASON" ]; then echo '{}'; exit 0; fi

# ---------- dangerous: honor a fresh one-shot approval for this EXACT command ----------
NOW=$(date +%s)
CMD_B64=$(printf '%s' "$CMD" | base64 | tr -d '\n')
if [ -f "$APPROVED" ]; then
  A_EPOCH=$(sed -n '1p' "$APPROVED" 2>/dev/null)
  A_B64=$(sed -n '2p' "$APPROVED" 2>/dev/null)
  if [ -n "$A_EPOCH" ] && [ "$A_B64" = "$CMD_B64" ] && [ $((NOW - A_EPOCH)) -lt $WINDOW ] 2>/dev/null; then
    rm -f "$APPROVED" "$PENDING"   # consume the one-shot approval
    echo '{}'
    exit 0
  fi
fi

# ---------- no valid approval: record the pending op and deny ----------
{ printf '%s\n' "$NOW"; printf '%s\n' "$CMD_B64"; } > "$PENDING"

FULL_REASON="BLOCKED ($CATEGORY): $REASON  To proceed, ask the user to confirm in their own words and have them reply with one word: confirm. Their typed confirmation arms a one-shot approval for THIS EXACT command, after which you may re-run it once. Alternatively hand the command to the user to run themselves. Do not attempt to bypass this guard."

python3 -c "import json,sys; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','permissionDecision':'deny','permissionDecisionReason':sys.argv[1]}}))" "$FULL_REASON"
exit 0
