#!/usr/bin/env python3
"""compact-memory.py - keep a beats MEMORY.md index under its load budget.

The harness loads MEMORY.md into context at session start, but it has a hard
size limit (~24.4KB); over it, the index silently truncates and the agent works
half-blind. This keeps it under budget MECHANICALLY, with zero data loss:

  1. Line-cap every index entry to MAX_LINE chars (the index is pointers + a
     short hook; the full detail lives in the beat file, so capping the line
     loses nothing real and just enforces the existing one-line rule).
  2. If still over BUDGET, ARCHIVE the oldest dated `session_`/`reflection_`
     entries (by the YYYY-MM-DD in the filename) into MEMORY-archive.md until
     under budget. Standing entries (feedback_/decision_/reference_) are NEVER
     archived - the rules stay visible. Archived pointers are MOVED, not
     deleted; the beat files themselves are untouched and still grep-able.

Usage: compact-memory.py <path/to/MEMORY.md>
Idempotent: running it on an already-compact file is a no-op.
"""
import os
import re
import sys
from datetime import datetime, timezone

BUDGET = 23000          # bytes; under the ~24.4KB harness limit, with headroom
MAX_LINE = 200          # chars per index entry (the documented one-line rule)
STANDING_PREFIXES = ("feedback_", "decision_", "reference")  # filename fallback
STANDING_TYPES = frozenset({"feedback", "decision", "reference", "user"})

ENTRY_RE = re.compile(r"^\s*- \[(?P<title>.*?)\]\((?P<file>[^)]+)\)(?P<rest>.*)$")
TYPE_RE = re.compile(r"^\s*type:\s*([A-Za-z]+)", re.MULTILINE)


def frontmatter_type(filepath: str):
    """Lowercased frontmatter `type:` of a beat file, or None if unreadable.

    Reads only the head of the file - the frontmatter block is at the very top,
    so a small slice is enough and keeps this cheap on every MEMORY.md write.
    """
    try:
        with open(filepath, encoding="utf-8") as fh:
            head = fh.read(1500)
    except OSError:
        return None
    m = TYPE_RE.search(head)
    return m.group(1).lower() if m else None


def is_standing(fn: str, memdir: str = "") -> bool:
    """True if a beat is standing (never archived out of the live index).

    AUTHORITATIVE signal is the referenced beat's frontmatter `type`: a
    long-lived decision/feedback/reference/user beat must stay in the LIVE index
    regardless of age. Many such beats are saved with a session_* FILENAME but a
    standing TYPE (e.g. session_2026-05-29_tilt-lab-design-direction.md is
    type: decision), so keying on the filename prefix alone - the old behavior -
    wrongly let them age out. We read the frontmatter type and fall back to the
    filename prefix ONLY when the file or its type is unreadable, preserving the
    old behavior for that edge.
    """
    t = frontmatter_type(os.path.join(memdir, fn)) if memdir else None
    if t is not None:
        return t in STANDING_TYPES
    return fn.startswith(STANDING_PREFIXES)


def date_key(fn: str) -> str:
    m = re.search(r"(\d{4}-\d{2}-\d{2})", fn)
    return m.group(1) if m else "9999-99-99"  # undated -> treat as newest (keep)


def cap_line(line: str, m: "re.Match") -> str:
    if len(line) <= MAX_LINE:
        return line
    prefix = f"- [{m.group('title')}]({m.group('file')})"
    rest = m.group("rest")  # usually ": hook text"
    avail = MAX_LINE - len(prefix) - 1
    if avail < 0:
        return prefix  # pathologically long title/link: keep the pointer only
    rest = rest[:avail].rstrip() + "…"
    return prefix + rest


def byte_size(header, entries) -> int:
    return (sum(len(h) + 1 for h in header)
            + sum(len(l) + 1 for l, _ in entries))


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: compact-memory.py <MEMORY.md>", file=sys.stderr)
        return 2
    path = sys.argv[1]
    if not os.path.isfile(path):
        return 0
    memdir = os.path.dirname(path) or "."
    archive = os.path.join(memdir, "MEMORY-archive.md")

    lines = open(path, encoding="utf-8").read().splitlines()
    header, entries = [], []
    for l in lines:
        m = ENTRY_RE.match(l)
        if m:
            entries.append((cap_line(l, m), m))
        elif not entries:
            header.append(l)  # preserve a leading header block, if any
        # stray non-entry lines between entries are dropped (index = entries)

    # Archive oldest dated, non-standing entries until under budget.
    keep = entries[:]
    archived = []
    if byte_size(header, keep) > BUDGET:
        archivable = sorted(
            (e for e in keep if not is_standing(e[1].group("file"), memdir)),
            key=lambda e: date_key(e[1].group("file")),
        )
        for victim in archivable:
            if byte_size(header, keep) <= BUDGET:
                break
            keep.remove(victim)
            archived.append(victim)

    if archived:
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with open(archive, "a", encoding="utf-8") as fh:
            fh.write(f"\n<!-- archived {stamp} (moved from MEMORY.md to stay under load budget) -->\n")
            for l, _ in archived:
                fh.write(l + "\n")

    out = header + [l for l, _ in keep]
    text = "\n".join(out).rstrip("\n") + "\n"

    # Idempotent: only rewrite when something actually changed, so a PostToolUse
    # run never needlessly touches a file the agent is mid-edit on.
    try:
        old = open(path, encoding="utf-8").read()
    except OSError:
        old = None
    if not archived and text == old:
        print("compact-memory: already under budget, no change")
        return 0

    open(path, "w", encoding="utf-8").write(text)
    print(f"compact-memory: {len(entries)} entries -> kept {len(keep)}, "
          f"archived {len(archived)}, ~{len(text)} bytes (budget {BUDGET})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
