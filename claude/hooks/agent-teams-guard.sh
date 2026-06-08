#!/bin/bash
# PreToolUse hook for Agent. When running inside cmux with the agent-teams
# shim active, require Agent calls to spawn as named teammates so each agent
# appears as its own cmux split (with sidebar metadata and notifications)
# rather than as an in-process subagent that runs silently inside this pane.
#
# Detection: CMUX_SOCKET_PATH set AND CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1.
# Outside that combination (e.g. regular shell, claude run without the cmux
# claude-teams wrapper), the hook is a no-op.
#
# Block condition: Agent call missing team_name or name.
# Pass condition: both team_name and name present in tool_input.
#
# Per CLAUDE.md user preference (2026-05-27): hard block with no exemptions.
# Every Agent dispatch inside cmux-teams must go through the team flow so
# the user can see the work happening in real cmux splits.

set -euo pipefail

# Skip when not in cmux-teams mode. Empty stdout signals no decision -> allow.
if [ -z "${CMUX_SOCKET_PATH:-}" ] || [ "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-0}" != "1" ]; then
  echo '{}'
  exit 0
fi

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c 'import json,sys
d=json.load(sys.stdin)
print(d.get("tool_name","") or "")' 2>/dev/null)

# Workflow spawns silent in-process subagents that can never appear as cmux
# splits. In cmux-teams mode that defeats the team flow, so it is hard-blocked
# with no pass form. Only reached when the env gate above confirmed cmux-teams.
if [ "$TOOL_NAME" = "Workflow" ]; then
  WF_REASON="BLOCKED: the Workflow tool spawns silent in-process subagents that cannot appear as cmux splits. This session is inside cmux with agent-teams enabled (CMUX_SOCKET_PATH set, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1), where every agent must be a visible named teammate. Do NOT use Workflow here. Use the team flow instead: 1) TeamCreate({team_name, description}) if no team exists yet, 2) Agent({subagent_type, team_name, name, prompt}) for each teammate (the name is what makes it a visible split), 3) coordinate via SendMessage and a shared TaskList, 4) TeamDelete once teammates have shut down."
  python3 -c "import json,sys; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','permissionDecision':'deny','permissionDecisionReason':sys.argv[1]}}))" "$WF_REASON"
  exit 0
fi

TEAM_NAME=$(echo "$INPUT" | python3 -c 'import json,sys
d=json.load(sys.stdin)
print((d.get("tool_input") or {}).get("team_name","") or "")' 2>/dev/null)

NAME=$(echo "$INPUT" | python3 -c 'import json,sys
d=json.load(sys.stdin)
print((d.get("tool_input") or {}).get("name","") or "")' 2>/dev/null)

if [ -n "$TEAM_NAME" ] && [ -n "$NAME" ]; then
  echo '{}'
  exit 0
fi

REASON="BLOCKED: this session is inside cmux with agent-teams enabled (CMUX_SOCKET_PATH set, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1). In this mode, Agent calls must spawn as named teammates so each agent gets its own cmux split with sidebar metadata - not as a silent in-process subagent. Required flow: 1) TeamCreate({team_name: \"...\", description: \"...\"}) if no team exists yet for this work, 2) Agent({subagent_type: \"...\", team_name: \"...\", name: \"...\", prompt: \"...\"}) for each teammate (name is what makes it a visible split), 3) coordinate via SendMessage and shared TaskList, 4) TeamDelete after teammates shut down. Re-issue this Agent call with both team_name and name set. No exemptions - even single Explore or Plan agents go through the team flow when running inside cmux."

python3 -c "import json,sys; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','permissionDecision':'deny','permissionDecisionReason':sys.argv[1]}}))" "$REASON"
