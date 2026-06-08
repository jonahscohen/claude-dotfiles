#!/bin/bash
# consolidate-nudge.sh
#
# SessionStart hook. A sibling to reflect-nudge.sh: reflect-nudge nags on
# reflection CADENCE (new beats since the last reflection); this nags on cluster
# SIZE (how many beats have piled up under one topic). When a single filename
# token appears in >= threshold consolidatable beats, it emits an advisory
# additionalContext nudging the human to run `/consolidate <topic>`.
#
# Advisory only. It NEVER blocks and NEVER edits beats - it just surfaces the
# biggest redundant cluster so the human can decide. Consolidation itself is the
# human-gated /consolidate skill.
#
# Grounding:
#   - Cluster = filename token frequency (see consolidate-intent.json count_rule).
#   - Standing beats (feedback_/decision_/reference) are NEVER counted and NEVER
#     consolidatable, matching the STANDING tuple in compact-memory.py. So
#     feedback_tilt_lab_fidelity_mandate.md does not inflate the `tilt` cluster.
#   - MEMORY.md / MEMORY-archive.md are never counted.
#   - Cooldown is file-based like grounding-gate.sh so the same standing cluster
#     is not re-nagged every session.
#
# Output contract (matches reflect-nudge.sh, the SessionStart sibling):
#   - fires : prints {"additionalContext": "..."} to stdout, exit 0
#   - silent: prints {} to stdout, exit 0
# All env overrides (for the test harness) live in the python block below.

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
INTENT_FILE="$HOOK_DIR/consolidate-intent.json"

CWD="${SESSION_CWD:-$(pwd)}"
MEMORY_DIR="${CONSOLIDATE_MEMORY_DIR:-$CWD/.claude/memory}"

# No memory directory = nothing to cluster.
if [ ! -d "$MEMORY_DIR" ]; then
  echo '{}'
  exit 0
fi

INTENT_FILE_PATH="$INTENT_FILE" MEMORY_DIR_PATH="$MEMORY_DIR" python3 <<'PYEOF'
import json, os, re, sys, time

intent_file = os.environ.get("INTENT_FILE_PATH", "")
memory_dir = os.environ.get("MEMORY_DIR_PATH", "")

# Load the tunable config. Missing/garbled file -> fall back to safe defaults so
# the hook stays silent-safe rather than crashing the session start.
intent = {}
if intent_file and os.path.isfile(intent_file):
    try:
        with open(intent_file, "r", encoding="utf-8") as fh:
            loaded = json.load(fh)
        if isinstance(loaded, dict):
            intent = loaded
    except Exception:
        intent = {}

cfg = intent.get("config", {}) if isinstance(intent.get("config"), dict) else {}


def cfg_int(env_key, cfg_key, default):
    raw = os.environ.get(env_key, cfg.get(cfg_key, default))
    try:
        return int(raw)
    except Exception:
        return default


threshold = cfg_int("CONSOLIDATE_THRESHOLD", "threshold", 12)
# min_token_len has no env override; read straight from config with a default.
try:
    min_token_len = int(cfg.get("min_token_len", 3))
except Exception:
    min_token_len = 3
try:
    max_report = int(cfg.get("max_clusters_reported", 3))
except Exception:
    max_report = 3

cooldown_seconds = cfg_int("CONSOLIDATE_COOLDOWN", "cooldown_seconds", 86400)
cooldown_file = os.environ.get("CONSOLIDATE_COOLDOWN_FILE") or os.path.expanduser(
    cfg.get("cooldown_state_file", "~/.claude/.consolidate-cooldown")
)

consolidatable_types = cfg.get("consolidatable_types", ["project"])
if not isinstance(consolidatable_types, list) or not consolidatable_types:
    consolidatable_types = ["project"]
consolidatable_types = set(
    t.lower() for t in consolidatable_types if isinstance(t, str) and t
)

stopwords = intent.get("stopwords", [])
stopwords = set(s.lower() for s in stopwords if isinstance(s, str)) if isinstance(stopwords, list) else set()

SKIP_FILES = {"MEMORY.md", "MEMORY-archive.md"}
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}_?")
PREFIX_RE = re.compile(r"^(?:session|reflection)_")
TYPE_RE = re.compile(r"^\s*type:\s*([A-Za-z]+)", re.M)
SUPERSEDED_RE = re.compile(r"^\s*superseded_by:\s*(\S.*)$", re.M)
# Empty/placeholder values that do NOT count as actually superseded.
_NULLISH = {"", "~", "null", "none", "''", '""', "[]", "{}"}


def frontmatter_fields(path):
    """Return (type, is_superseded) from a beat's frontmatter head.

    One small read serves both signals - the frontmatter block is at the very
    top, so a head slice is enough and keeps the SessionStart scan fast across a
    few hundred beats. `type` is lowercased or None; `is_superseded` is True only
    when `superseded_by:` carries a real (non-null, non-placeholder) value.
    """
    try:
        with open(path, "r", encoding="utf-8") as fh:
            head = fh.read(1500)
    except Exception:
        return None, False
    tm = TYPE_RE.search(head)
    btype = tm.group(1).lower() if tm else None
    sm = SUPERSEDED_RE.search(head)
    superseded = bool(sm) and sm.group(1).strip().lower() not in _NULLISH
    return btype, superseded


def in_cooldown():
    if cooldown_seconds <= 0:
        return False
    try:
        with open(cooldown_file) as fh:
            ts = int((fh.read() or "0").strip() or "0")
        return (time.time() - ts) < cooldown_seconds
    except Exception:
        return False


def touch_cooldown():
    try:
        with open(cooldown_file, "w", encoding="utf-8") as fh:
            fh.write(str(int(time.time())))
    except Exception:
        pass


# Tally cluster counts: number of consolidatable files containing each token.
counts = {}
try:
    entries = os.listdir(memory_dir)
except Exception:
    print("{}")
    sys.exit(0)

for fn in entries:
    if not fn.endswith(".md"):
        continue
    if fn in SKIP_FILES:
        continue
    btype, superseded = frontmatter_fields(os.path.join(memory_dir, fn))
    # AUTHORITATIVE filter: count only beats whose frontmatter `type` is
    # consolidatable (default: project). This is filename-agnostic on purpose -
    # standing decision/feedback beats are often saved with a session_ filename
    # but a standing TYPE, and excluding by filename alone would sweep their
    # long-lived reasoning into a merge (data loss). A file with no parseable
    # type is excluded (safe under-count).
    if btype not in consolidatable_types:
        continue
    # IDEMPOTENCE: skip beats already consolidated (carry superseded_by). Without
    # this, a finished cluster keeps counting its already-merged beats and would
    # re-nudge once the cooldown lapses, even though a real /consolidate re-run
    # finds only the few NEW candidates. The count must reflect LIVE, not-yet-
    # consolidated beats so the nudge does not re-flag an already-merged cluster.
    if superseded:
        continue
    base = fn[:-3]  # strip .md
    base = PREFIX_RE.sub("", base)
    base = DATE_RE.sub("", base)
    seen = set()
    for tok in re.split(r"[_\-]+", base):
        tok = tok.lower()
        if len(tok) < min_token_len or tok.isdigit() or tok in stopwords:
            continue
        if tok in seen:
            continue
        seen.add(tok)
        counts[tok] = counts.get(tok, 0) + 1

if not counts:
    print("{}")
    sys.exit(0)

ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
top_tok, top_count = ranked[0]

if top_count < threshold:
    print("{}")
    sys.exit(0)

# Respect the cooldown only AFTER confirming there is something to report, so a
# silent session never burns the cooldown window.
if in_cooldown():
    print("{}")
    sys.exit(0)

over = [(t, c) for t, c in ranked if c >= threshold][:max_report]
lead_t, lead_c = over[0]
msg = (
    f"Beats cluster `{lead_t}` has {lead_c} consolidatable entries "
    f"(threshold {threshold}). Consider `/consolidate {lead_t}` to merge them "
    f"into one canonical beat (originals are kept and superseded, never deleted)."
)
if len(over) > 1:
    extras = ", ".join(f"`{t}` ({c})" for t, c in over[1:])
    msg += f" Other large clusters: {extras}."

touch_cooldown()
print(json.dumps({"additionalContext": msg}))
PYEOF

exit 0
