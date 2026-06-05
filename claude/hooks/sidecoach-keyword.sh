#!/bin/bash
# sidecoach-keyword.sh
#
# UserPromptSubmit hook that intercepts user prompts BEFORE Claude sees them,
# regex-matches sidecoach verbs against a sanitized prompt body, and on hit
# injects an `additionalContext` block routing to the matched flow. This
# bypasses the skill-auto-trigger layer (which 2026-05-20 found unreliable in
# real builds) and forces verb-intent detection at the hook layer.
#
# Architecture ported (not copied) from yeachan-heo/oh-my-claudecode
# src/hooks/keyword-detector/index.ts. Verb registry lives at
# sidecoach-verbs.json next to this script; T-0010 will reuse it for the
# marketing-site cheatsheet.
#
# Behavior:
#   - Reads the UserPromptSubmit hook payload from stdin.
#   - Pulls the prompt text from `.prompt` (root) or `.tool_input.user_message`
#     or `.tool_input.prompt`.
#   - Sanitizes the prompt: strips fenced code blocks, inline backticks, URLs,
#     XML tag bodies, and transcript markers like [MAGIC KEYWORD:] / [TURN N:].
#   - Suppresses informational framings such as "what is X", "how to use X",
#     "how do I X", "X is a", "tell me about X", "explain X", "define X".
#   - Word-boundary matches each verb with (?<![\w-])PATTERN(?![\w-]) so
#     "polished" / "audit-trail" / "extraction" do NOT fire.
#   - On exactly one match: emits hookSpecificOutput.additionalContext.
#   - On multiple matches: picks the first verb in JSON list order, logs a
#     warning to stderr.
#   - On zero matches: emits {} so Claude sees the prompt as normal.

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
VERB_FILE="$HOOK_DIR/sidecoach-verbs.json"
MODE_FILE="$HOOK_DIR/sidecoach-modes.json"
INTENT_FILE="$HOOK_DIR/sidecoach-intent.json"

if [[ ! -f "$VERB_FILE" && ! -f "$MODE_FILE" && ! -f "$INTENT_FILE" ]]; then
  # No registries, nothing to do. Stay out of the prompt path.
  exit 0
fi

INPUT="$(cat)"

VERB_FILE_PATH="$VERB_FILE" MODE_FILE_PATH="$MODE_FILE" INTENT_FILE_PATH="$INTENT_FILE" PROMPT_RAW="$INPUT" python3 <<'PYEOF'
import json
import os
import re
import sys
import time

verb_file = os.environ.get("VERB_FILE_PATH", "")
mode_file = os.environ.get("MODE_FILE_PATH", "")
intent_file = os.environ.get("INTENT_FILE_PATH", "")
raw_input = os.environ.get("PROMPT_RAW", "")

try:
    payload = json.loads(raw_input) if raw_input else {}
except Exception:
    sys.exit(0)

# Extract the prompt text. UserPromptSubmit payloads typically place the user's
# message at .prompt, but some hook bridges nest it under .tool_input. Handle
# both shapes defensively.
prompt = ""
if isinstance(payload, dict):
    if isinstance(payload.get("prompt"), str):
        prompt = payload["prompt"]
    elif isinstance(payload.get("tool_input"), dict):
        ti = payload["tool_input"]
        for key in ("user_message", "prompt", "text", "message"):
            v = ti.get(key)
            if isinstance(v, str):
                prompt = v
                break

if not prompt.strip():
    sys.exit(0)

# Load verb registry. Tolerate a missing file - the hook can still match
# modes alone (and vice versa).
verbs = []
if verb_file:
    try:
        with open(verb_file, "r", encoding="utf-8") as fh:
            verb_registry = json.load(fh)
        v = verb_registry.get("verbs", [])
        if isinstance(v, list):
            verbs = v
    except Exception:
        verbs = []

# Load mode registry. Modes are higher-level than verbs - each mode names a
# curated chain of verbs (analog of oh-my-claudecode's autopilot/ralph/
# ultrawork) and on match the hook emits the chain so the receiving session
# knows what sequence of flows to run.
modes = []
if mode_file:
    try:
        with open(mode_file, "r", encoding="utf-8") as fh:
            mode_registry = json.load(fh)
        m = mode_registry.get("modes", [])
        if isinstance(m, list):
            modes = m
    except Exception:
        modes = []

# Load the intent registry (third tier). Fires a light, advisory self-question
# on NATURAL front-end/design requests that carry no explicit sidecoach verb.
intent = {}
if intent_file:
    try:
        with open(intent_file, "r", encoding="utf-8") as fh:
            loaded = json.load(fh)
        if isinstance(loaded, dict):
            intent = loaded
    except Exception:
        intent = {}

# Cooldown plumbing. Any sidecoach engagement (verb/mode route OR intent nudge)
# touches a state file; intent nudges are suppressed while that file is younger
# than the window, so an active build and its follow-up tweaks are not
# re-nagged. Explicit verb/mode routes are NEVER suppressed by the cooldown.
_cfg = intent.get("config", {}) if isinstance(intent.get("config"), dict) else {}
cooldown_file = os.environ.get("SIDECOACH_INTENT_COOLDOWN_FILE") or os.path.expanduser(
    _cfg.get("cooldown_state_file", "~/.claude/.sidecoach-intent-cooldown")
)
try:
    cooldown_seconds = int(
        os.environ.get("SIDECOACH_INTENT_COOLDOWN", _cfg.get("cooldown_seconds", 1800))
    )
except Exception:
    cooldown_seconds = 1800


def touch_cooldown():
    try:
        with open(cooldown_file, "w", encoding="utf-8") as fh:
            fh.write(str(int(time.time())))
    except Exception:
        pass


def in_cooldown():
    if cooldown_seconds <= 0:
        return False
    try:
        with open(cooldown_file, "r", encoding="utf-8") as fh:
            ts = int((fh.read() or "0").strip() or "0")
        return (time.time() - ts) < cooldown_seconds
    except Exception:
        return False


if not verbs and not modes and not intent:
    sys.exit(0)


def sanitize(text: str) -> str:
    """Strip non-intent regions from the prompt body before matching.

    This is the critical step. Without it, a code example containing
    `function polish() {}` would fire the polish verb. The order matters:
    fenced code blocks come before inline backticks (they overlap), URLs
    before XML (URLs can contain `<` in query strings), then transcript
    markers last.
    """
    # 1. Fenced code blocks: ```...```
    text = re.sub(r"```[\s\S]*?```", " ", text)
    # 2. Inline backticks: `code`
    text = re.sub(r"`[^`\n]*`", " ", text)
    # 3. URLs: http://, https://, file://, ftp://
    text = re.sub(r"\b(?:https?|file|ftp)://\S+", " ", text, flags=re.IGNORECASE)
    # 4. XML tag bodies: <tag>...</tag>
    text = re.sub(
        r"<([a-zA-Z][\w:-]*)[^>]*>[\s\S]*?</\1\s*>",
        " ",
        text,
    )
    # 5. Stray XML tags (open/self-closing)
    text = re.sub(r"<[a-zA-Z!/][^>]*>", " ", text)
    # 6. Transcript markers: [MAGIC KEYWORD: foo], [TURN 5: bar], [TURN N: ...]
    text = re.sub(
        r"\[(?:MAGIC KEYWORD|TURN\s+(?:\d+|N))[^\]]*\]",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    return text


def is_informational(text: str, pattern: str) -> bool:
    """Return True if the verb appears only inside an informational framing.

    These framings describe a verb rather than invoke it - the user is asking
    what something is, not asking us to run it. Block firing in those cases.
    """
    frames = [
        # "what is X", "what is the X", "what is a X"
        rf"\bwhat\s+(?:is|are|was|were|does|did)\s+(?:the\s+|a\s+|an\s+)?{pattern}(?![\w-])",
        # "what's X"
        rf"\bwhat['’]s\s+(?:the\s+|a\s+|an\s+)?{pattern}(?![\w-])",
        # "how to X", "how to use X"
        rf"\bhow\s+to\s+(?:use\s+)?(?:the\s+)?{pattern}(?![\w-])",
        # "how do I X", "how do you X"
        rf"\bhow\s+do\s+(?:i|you|we)\s+(?:use\s+)?(?:the\s+)?{pattern}(?![\w-])",
        # "tell me about X"
        rf"\btell\s+me\s+about\s+(?:the\s+|a\s+|an\s+)?{pattern}(?![\w-])",
        # "explain X", "explain the X", "explain how X"
        rf"\bexplain\s+(?:the\s+|how\s+|what\s+)?{pattern}(?![\w-])",
        # "define X"
        rf"\bdefine\s+{pattern}(?![\w-])",
        # "X is a", "X is an", "X is the"
        rf"(?<![\w-]){pattern}\s+is\s+(?:a|an|the)\b",
        # "the X flow", "the X command" - looking up what a thing is rather than running it
        rf"\bwhat\s+(?:the\s+)?{pattern}\s+(?:does|means|is)\b",
    ]
    for frame in frames:
        if re.search(frame, text, re.IGNORECASE):
            return True
    return False


sanitized = sanitize(prompt)


def match_entries(entries, key_name):
    """Word-boundary + informational-suppression match against a registry.

    `entries` is the list from verbs.json or modes.json; `key_name` is
    either "verb" or "mode" - the attribute that names the entry.
    Returns a list of matched entry dicts in registry order.
    """
    out = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        name = entry.get(key_name)
        pattern = entry.get("pattern", name)
        if not name or not pattern:
            continue
        word_boundary = re.compile(
            rf"(?<![\w-]){pattern}(?![\w-])",
            re.IGNORECASE,
        )
        if not word_boundary.search(sanitized):
            continue
        if is_informational(sanitized, pattern):
            continue
        out.append(entry)
    return out


# Modes are checked first because they carry the higher-level shape-of-work
# signal. If a prompt contains both a mode and a verb (e.g. "forge the
# homepage with polish"), the mode wins; its chain already names the verbs.
matched_modes = match_entries(modes, "mode")
matched_verbs = match_entries(verbs, "verb")

if matched_modes or matched_verbs:
    if matched_modes:
        if len(matched_modes) > 1:
            names = [m.get("mode") for m in matched_modes]
            print(
                f"sidecoach-keyword: multiple modes matched {names}; "
                f"tie-breaking to first in registry: {names[0]}",
                file=sys.stderr,
            )
        chosen = matched_modes[0]
        chosen_name = chosen.get("mode", "")
        chain = chosen.get("chain", []) or []
        chain_str = ",".join(str(c) for c in chain) if isinstance(chain, list) else ""
        one_line = chosen.get("oneLineExplanation") or chosen.get("description") or ""
        context = (
            f"User intends to invoke the sidecoach <mode>{chosen_name}</mode>. "
            f"This mode runs the curated chain <chain>{chain_str}</chain>. "
            f"{one_line} Execute the verbs in order; do not compress the chain."
        )
    else:
        if len(matched_verbs) > 1:
            names = [v.get("verb") for v in matched_verbs]
            print(
                f"sidecoach-keyword: multiple verbs matched {names}; "
                f"tie-breaking to first in registry: {names[0]}",
                file=sys.stderr,
            )
        chosen = matched_verbs[0]
        chosen_name = chosen.get("verb", "")
        context = (
            f"User intends to invoke the sidecoach <verb>{chosen_name}</verb> flow. "
            f"Route accordingly."
        )

    # Explicit sidecoach use quiets the intent nudge for the cooldown window.
    touch_cooldown()
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "UserPromptSubmit",
                    "additionalContext": context,
                }
            }
        )
    )
    sys.exit(0)

# ---------------------------------------------------------------------------
# Intent tier: no explicit verb/mode matched. Fire a light, ADVISORY
# self-question on natural front-end/design requests - unless we are inside the
# cooldown window (active build / recently engaged) or the prompt is a trivial
# tweak. Everything here is driven by sidecoach-intent.json (tune it freely).
# ---------------------------------------------------------------------------
if not intent or in_cooldown():
    sys.exit(0)

actions = intent.get("actions", []) or []
targets = intent.get("substantive_targets", []) or []
standalone = intent.get("standalone", []) or []
exempt = intent.get("exempt", []) or []
new_build = intent.get("new_build", []) or []


def matched_list(patterns):
    out = []
    for p in patterns:
        if not isinstance(p, str) or not p:
            continue
        try:
            rx = re.compile(rf"(?<![\w-]){p}(?![\w-])", re.IGNORECASE)
        except re.error:
            continue
        if rx.search(sanitized):
            out.append(p)
    return out


def any_match(patterns):
    return len(matched_list(patterns)) > 0


# Drop matches that only appear inside an informational framing (what is X /
# how to X / explain X / ...), reusing the verb tier's suppression logic.
def substantive_match(patterns):
    return [p for p in matched_list(patterns) if not is_informational(sanitized, p)]


has_action = any_match(actions)
has_target = len(substantive_match(targets)) > 0
has_standalone = len(substantive_match(standalone)) > 0
has_exempt = any_match(exempt)
has_new_build = any_match(new_build)

# Fire when a build/design ACTION co-occurs with a SUBSTANTIVE target, or when a
# STANDALONE design signal appears on its own.
intent_fires = has_standalone or (has_action and has_target)

# Trivial-tweak suppression: a small-modify framing, with no clear new-build
# signal and no standalone design signal, is a tweak - stay silent.
if has_exempt and not has_new_build and not has_standalone:
    intent_fires = False

if not intent_fires:
    sys.exit(0)

nudge = intent.get("nudge") or (
    "This prompt reads as front-end / design work. Before hand-coding, ask "
    "yourself whether a sidecoach flow or mode would help (see /sidecoach list). "
    "Use it for substantive UI work; skip trivial tweaks."
)
touch_cooldown()
print(
    json.dumps(
        {
            "hookSpecificOutput": {
                "hookEventName": "UserPromptSubmit",
                "additionalContext": nudge,
            }
        }
    )
)
PYEOF

exit 0
