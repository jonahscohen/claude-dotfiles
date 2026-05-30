#!/usr/bin/env bash
# Regression tests for destructive-ops-guard.sh and the confirm-detect approval
# path. Calls the hook scripts directly (not via the Claude Code hook layer), so
# nothing dangerous is ever executed - only the JSON allow/deny decision is checked.
#
# Run:  bash ~/.claude/hooks/test-destructive-ops-guard.sh
# Exit code 0 = all pass, 1 = at least one failure.

HERE="$(cd "$(dirname "$0")" && pwd)"
GUARD="$HERE/destructive-ops-guard.sh"
CONFIRM="$HERE/destructive-confirm-detect.sh"
PENDING="$HOME/.claude/.destructive-op-pending"
APPROVED="$HOME/.claude/.destructive-op-approved"

pass=0
fail=0

# Returns 0 (true) if the guard BLOCKED the given command, 1 if it ALLOWED it.
runguard() {
  local out
  out=$(python3 -c "import json,sys; print(json.dumps({'tool_name':'Bash','tool_input':{'command':sys.argv[1]}}))" "$1" | bash "$GUARD")
  echo "$out" | grep -q '"permissionDecision": "deny"'
}

expect_block() {
  rm -f "$PENDING" "$APPROVED"
  if runguard "$1"; then
    pass=$((pass+1))
  else
    fail=$((fail+1)); echo "FAIL (expected BLOCK, got ALLOW): $1"
  fi
}

expect_allow() {
  rm -f "$PENDING" "$APPROVED"
  if runguard "$1"; then
    fail=$((fail+1)); echo "FAIL (expected ALLOW, got BLOCK): $1"
  else
    pass=$((pass+1))
  fi
}

echo "== Tier 1: production / destructive deploys =="
expect_block 'terminus env:deploy mysite.live'
expect_block 'terminus env:deploy mysite.live --updatedb --cc --note="release"'
expect_block 'terminus env:deploy mysite.test --sync-content'
expect_block 'terminus env:wipe mysite.dev'
expect_block 'terminus site:delete mysite'
expect_block 'terminus backup:restore mysite.live'

echo "== Tier 2: cross-env DB pulls / clobbers =="
expect_block 'terminus env:clone-content mysite.live test'
expect_block 'terminus env:clone-content mysite.live dev --db-only'
expect_block 'terminus env:clone-content mysite.test dev'
expect_block 'acli pull:database myapp.prod'
expect_block 'acli push:db myapp.dev'
expect_block 'wp db import prod-dump.sql'
expect_block 'wp db import prod.sql --url=sub.site.com'
expect_block 'wp db reset --yes'
expect_block 'wp db drop --yes'
expect_block 'wp db clean --yes'
expect_block 'wp site delete 5 --yes'
expect_block 'wp site empty --yes'
expect_block 'terminus wp mysite.live -- db import prod.sql'
expect_block 'drush sql:sync @prod @staging'
expect_block 'drush sql-sync @prod @self'
expect_block 'drush @staging sql:drop -y'
expect_block 'drush sql-drop -y'
expect_block 'drush @staging sql:cli < prod.sql'
expect_block 'mysql -u u -ppass dbname < prod-dump.sql'
expect_block 'cat dump.sql | mysql dbname'
expect_block 'mysqladmin -u root drop dbname'
expect_block 'wp db query "DROP TABLE wp_2_posts;"'
expect_block 'wp db query "TRUNCATE wp_options;"'
expect_block 'drush sql:query "DROP TABLE users;"'
expect_block 'mysql -e "DROP DATABASE foo;"'
expect_block 'mysql dbname -e "TRUNCATE TABLE sessions"'

echo "== Tier 3: PR merges =="
expect_block 'gh pr merge 327'
expect_block 'gh pr merge 327 --squash'
expect_block 'gh pr merge --merge'
expect_block 'gh pr merge 1 --rebase --delete-branch'
expect_block 'gh pr merge 1 --admin --squash'
expect_block 'gh pr merge --auto --squash'
expect_block 'gh pr merge'

echo "== Safe / read-only: must ALLOW =="
expect_allow 'terminus env:deploy mysite.test'
expect_allow 'terminus env:deploy mysite.dev'
expect_allow 'terminus env:info mysite.live'
expect_allow 'terminus backup:create mysite.live --element=database'
expect_allow 'terminus env:clear-cache mysite.live'
expect_allow 'terminus env:list mysite'
expect_allow 'git push pantheon master'
expect_allow 'wp db export backup.sql'
expect_allow 'wp db tables'
expect_allow 'wp db size'
expect_allow 'wp db query "SELECT * FROM wp_options LIMIT 5"'
expect_allow 'wp site list'
expect_allow 'mysqldump dbname > backup.sql'
expect_allow 'drush sql:dump --result-file=backup.sql'
expect_allow 'drush sql:query "SELECT name FROM users"'
expect_allow 'drush sql:connect'
expect_allow 'gh pr view 327'
expect_allow 'gh pr list'
expect_allow 'gh pr create --fill'
expect_allow 'gh pr merge 1 --disable-auto'

echo "== False-positive defense: mentions inside quotes/commit messages must ALLOW =="
expect_allow 'git commit -m "feat: add terminus env:deploy mysite.live guard"'
expect_allow 'git commit -m "block wp db import and gh pr merge"'
expect_allow 'echo "do not run terminus env:clone-content mysite.live test"'
expect_allow 'echo "DROP TABLE is dangerous"'
expect_allow 'git commit -m "fix DROP DATABASE handling in docs"'
expect_allow 'printf "%s" "gh pr merge 5"'
# heredoc body mentioning dangerous commands (e.g. writing a beat/doc) must ALLOW
expect_allow "$(printf 'cat >> MEMORY.md <<%sEOF%s\n- guard blocks terminus env:deploy site.live and gh pr merge\nEOF' "'" "'")"
expect_allow "$(printf 'cat <<EOF\nwp db import dump.sql is now blocked\nEOF')"
# but a REAL heredoc piping SQL into a db client must still BLOCK
expect_block "$(printf 'mysql dbname <<EOF\nDROP TABLE wp_posts;\nEOF')"

echo "== Approval path: confirm arms a one-shot, consumed after one use =="
CMD='terminus env:deploy mysite.live'
rm -f "$PENDING" "$APPROVED"
# 1. first attempt blocks and records a pending op
if runguard "$CMD" && [ -f "$PENDING" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: first attempt did not block + write pending"; fi
# 2. user types "confirm" -> pending promoted to approved
echo '{"prompt":"confirm"}' | bash "$CONFIRM" >/dev/null 2>&1
if [ -f "$APPROVED" ] && [ ! -f "$PENDING" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: confirm did not promote pending->approved"; fi
# 3. same command now allowed exactly once (do NOT clear flags here)
if runguard "$CMD"; then fail=$((fail+1)); echo "FAIL: approved command was still blocked"; else pass=$((pass+1)); fi
# 4. approval consumed: a second run blocks again
if runguard "$CMD"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: approval was not consumed (one-shot leaked)"; fi

echo "== Approval is command-specific and human-gated =="
rm -f "$PENDING" "$APPROVED"
# confirm with no pending op does nothing
echo '{"prompt":"confirm"}' | bash "$CONFIRM" >/dev/null 2>&1
if [ ! -f "$APPROVED" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: confirm armed approval with no pending op"; fi
# approval for command A must not allow command B
rm -f "$PENDING" "$APPROVED"
runguard 'gh pr merge 1' >/dev/null    # pending = 'gh pr merge 1'
echo '{"prompt":"confirm"}' | bash "$CONFIRM" >/dev/null 2>&1   # approved = 'gh pr merge 1'
if runguard 'gh pr merge 2'; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: approval for one command leaked to another"; fi

rm -f "$PENDING" "$APPROVED"

echo "----------------------------------------"
echo "PASS: $pass   FAIL: $fail"
[ "$fail" -eq 0 ]
