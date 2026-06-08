#!/bin/bash
# grounding-guard.sh
#
# PreToolUse hook (the teeth for grounding-gate.sh). When a build-behavior
# diagnostic question armed ~/.claude/.grounding-armed, this DENIES the
# app-probing tools (chrome/computer-use screenshots & clicks, cmux browser
# screenshots) until the agent has actually read code or beats THIS turn -
# i.e. until a Read / Grep / Glob / grep-family Bash tool_use appears in the
# transcript after the arm timestamp. The first such grounding action disarms
# the flag (and starts the cooldown), after which probing is free.
#
# Fail-open by design: any parse error, missing transcript, or subagent context
# -> ALLOW. The gate must never brick the browser tools the verification
# protocol depends on; it only bites in the clear case (armed + readable
# transcript + no grounding yet). Mirrors validation-guard.sh's deny mechanism.

INPUT="$(cat)"

PROMPT_RAW="$INPUT" python3 <<'PYEOF'
import json, os, re, sys
from datetime import datetime, timezone

try:
    data = json.loads(os.environ.get("PROMPT_RAW", "") or "{}")
except Exception:
    print("{}"); sys.exit(0)

tool = data.get("tool_name", "")
tinput = data.get("tool_input", {}) if isinstance(data.get("tool_input"), dict) else {}
transcript_path = data.get("transcript_path", "")

arm_file = os.environ.get("GROUNDING_ARM_FILE") or os.path.expanduser("~/.claude/.grounding-armed")
cooldown_file = os.environ.get("GROUNDING_COOLDOWN_FILE") or os.path.expanduser("~/.claude/.grounding-cooldown")

def allow():
    print("{}"); sys.exit(0)

# Not armed -> nothing to enforce.
try:
    with open(arm_file) as fh:
        arm_ts = int((fh.read() or "0").strip() or "0")
except (FileNotFoundError, OSError, ValueError):
    allow()
if arm_ts <= 0:
    allow()

# Is THIS call an app-probe we should gate?
def is_probe(tool, tinput):
    if tool.startswith("mcp__claude-in-chrome__") or tool.startswith("mcp__computer-use__"):
        # the read-only context fetch is itself fine; gate the visual/interactive probes
        probe_suffixes = ("computer", "navigate", "screenshot", "read_page", "get_page_text",
                          "left_click", "scroll", "find", "read_console_messages")
        return any(tool.endswith(s) for s in probe_suffixes)
    if tool == "Bash":
        cmd = tinput.get("command", "") or ""
        return bool(re.search(r"cmux\s+browser\b[\s\S]*\b(screenshot|snapshot|navigate)\b", cmd))
    return False

if not is_probe(tool, tinput):
    allow()

# Subagent / teammate sessions are not gated (the lead owns grounding discipline).
def is_subagent(path):
    if not path:
        return False
    try:
        with open(path) as fh:
            for i, line in enumerate(fh):
                if i > 20:
                    break
                try:
                    d = json.loads(line)
                except Exception:
                    continue
                if d.get("isSidechain") is True or d.get("teamName"):
                    return True
    except (FileNotFoundError, OSError):
        return False
    return False

if is_subagent(transcript_path):
    allow()

def iso_to_epoch(ts):
    if not isinstance(ts, str):
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
    except Exception:
        return None

def iter_tool_uses(d):
    # tolerant: handle {message:{content:[{type:tool_use,name,input}]}} and flat shapes
    msg = d.get("message")
    if isinstance(msg, dict) and isinstance(msg.get("content"), list):
        for b in msg["content"]:
            if isinstance(b, dict) and b.get("type") == "tool_use":
                yield b
    if d.get("type") == "tool_use" and d.get("name"):
        yield d

GROUND_TOOLS = {"Read", "Grep", "Glob"}
BASH_GROUND = re.compile(r"\b(grep|rg|ag|sed\s+-n|cat|head|tail|awk)\b")

def grounded_since(path, arm_ts):
    if not path:
        return False  # can't read -> fail open happens below
    try:
        with open(path) as fh:
            lines = fh.readlines()
    except (FileNotFoundError, OSError):
        return None  # signal "unknown" -> fail open
    grace = arm_ts - 3
    for line in lines:
        try:
            d = json.loads(line)
        except Exception:
            continue
        ep = iso_to_epoch(d.get("timestamp"))
        if ep is None or ep < grace:
            continue
        for tu in iter_tool_uses(d):
            name = tu.get("name", "")
            if name in GROUND_TOOLS:
                return True
            if name == "Bash":
                cmd = (tu.get("input", {}) or {}).get("command", "")
                if BASH_GROUND.search(cmd or ""):
                    return True
    return False

result = grounded_since(transcript_path, arm_ts)

# Unknown (couldn't read transcript) -> fail open.
if result is None:
    allow()

if result is True:
    # Grounding happened this turn: disarm + start cooldown, then allow.
    try:
        os.remove(arm_file)
    except OSError:
        pass
    try:
        import time
        with open(cooldown_file, "w") as fh:
            fh.write(str(int(time.time())))
    except Exception:
        pass
    allow()

# Armed, readable transcript, NO grounding yet -> DENY.
reason = (
    "Ground before you probe. This is a build-behavior question and you haven't read the "
    "code or beats yet this turn. The answer to how the build behaves lives in the source and "
    "the beats, usually one grep away - NOT in a screenshot. Do this first: grep the relevant "
    "code path (e.g. the component/panel/handler that renders or fires the thing in question) "
    "and open the related beats named in MEMORY.md. Then this probe unlocks automatically and "
    "you verify your understanding against the running app."
)
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason,
    }
}))
PYEOF
