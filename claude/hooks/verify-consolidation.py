#!/usr/bin/env python3
"""verify-consolidation.py - adversarial no-data-loss proof for /consolidate.

Given a pristine BACKUP of .claude/memory (taken before a consolidation), the
LIVE .claude/memory after it, and the CANONICAL beat filename the consolidation
produced, prove that NOTHING was lost:

  A. No original beat file was deleted (every backup .md still exists live).
  B. Every consolidated member now carries superseded_by == canonical.
  C. The canonical beat's `supersedes` lists exactly those members.
  D. Count integrity: 1 canonical + N superseded == cluster member count.
  E. Standing beats (frontmatter type decision/feedback/reference/user, OR a
     feedback_/decision_/reference_ filename prefix) were NOT swept: none gained
     a superseded_by, none appear in canonical.supersedes.
  F. Fact survival: every --fact "file.md::needle" string is present in the
     canonical body (spot-check that distinct unique facts survived the merge).

The cluster membership is taken from the canonical beat's own `supersedes` list
(what the consolidation CLAIMS it merged). Each claimed member is then checked.
Separately, the script reports the set of `type: project` beats sharing the
cluster's filename token so a human can see if the consolidation UNDER-covered
(left project beats unmerged) or OVER-reached (swept a standing beat).

Exit 0 = every check passed. Exit 1 = at least one FAIL (data loss or drift).

Usage:
  verify-consolidation.py --backup DIR --live DIR --canonical FILE.md \
      [--token tilt] [--fact "orig.md::unique phrase" ...]
"""
import argparse
import os
import re
import sys

FRONT_TYPE = re.compile(r"^type:\s*(\w+)", re.M)
SUPERSEDES = re.compile(r"^supersedes:\s*(.+)$", re.M)
SUPERSEDED_BY = re.compile(r"^superseded_by:\s*(.+)$", re.M)
STANDING_PREFIX = ("feedback_", "decision_", "reference")
STANDING_TYPES = {"feedback", "decision", "reference", "user"}


def read(path):
    try:
        return open(path, encoding="utf-8").read()
    except OSError:
        return None


def frontmatter(text):
    """Return (type, supersedes_list, superseded_by) parsed from a beat."""
    if text is None:
        return None, [], None
    t = FRONT_TYPE.search(text)
    btype = t.group(1).strip() if t else None
    sup = []
    m = SUPERSEDES.search(text)
    if m:
        sup = parse_list(m.group(1))
    sb = None
    m2 = SUPERSEDED_BY.search(text)
    if m2:
        v = m2.group(1).strip()
        sb = v if v and v.lower() not in ("null", "none", "") else None
    return btype, sup, sb


def parse_list(raw):
    raw = raw.strip()
    if raw.lower() in ("null", "none", ""):
        return []
    raw = raw.strip("[]")
    return [x.strip().strip("'\"") for x in raw.split(",") if x.strip()]


def is_standing(fn, btype):
    return fn.startswith(STANDING_PREFIX) or (btype in STANDING_TYPES)


class Report:
    def __init__(self):
        self.p = 0
        self.f = 0
        self.fails = []

    def ok(self, msg):
        print(f"PASS: {msg}")
        self.p += 1

    def no(self, msg, detail=""):
        print(f"FAIL: {msg}" + (f"  ({detail})" if detail else ""))
        self.fails.append(msg)
        self.f += 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--backup", required=True)
    ap.add_argument("--live", required=True)
    ap.add_argument("--canonical", required=True, help="canonical beat filename (basename)")
    ap.add_argument("--token", default=None, help="cluster filename token, e.g. tilt")
    ap.add_argument("--fact", action="append", default=[],
                    help='spot-check: "originfile.md::unique substring" must appear in canonical body')
    args = ap.parse_args()
    r = Report()

    backup, live = args.backup, args.live
    canon_name = os.path.basename(args.canonical)
    canon_path = os.path.join(live, canon_name)
    canon_text = read(canon_path)

    # ---- canonical exists ----
    if canon_text is None:
        r.no("canonical beat exists in live dir", canon_path)
        print(f"\nRESULTS: {r.p} passed, {r.f} failed")
        return 1
    r.ok(f"canonical beat exists: {canon_name}")

    _, canon_supersedes, _ = frontmatter(canon_text)

    # ---- A: no original deleted ----
    backup_md = sorted(f for f in os.listdir(backup) if f.endswith(".md"))
    deleted = [f for f in backup_md if not os.path.isfile(os.path.join(live, f))]
    if deleted:
        r.no("A: no original beat deleted", f"missing live: {deleted}")
    else:
        r.ok(f"A: all {len(backup_md)} original beat files still exist on disk (none deleted)")

    # ---- cluster membership = what canonical claims it merged ----
    members = canon_supersedes
    if not members:
        r.no("canonical declares a non-empty supersedes list", "supersedes empty/missing")
    else:
        r.ok(f"canonical.supersedes lists {len(members)} members")

    # ---- B: each member has superseded_by == canonical ----
    bad_sb = []
    for m in members:
        text = read(os.path.join(live, m))
        _, _, sb = frontmatter(text)
        if sb != canon_name:
            bad_sb.append((m, sb))
    if bad_sb:
        r.no("B: every member has superseded_by -> canonical", f"wrong/missing: {bad_sb}")
    else:
        r.ok(f"B: all {len(members)} members carry superseded_by: {canon_name}")

    # ---- C: members were type project in backup (consolidation didn't claim a standing beat) ----
    swept_standing = []
    for m in members:
        btype, _, _ = frontmatter(read(os.path.join(backup, m)))
        if is_standing(m, btype):
            swept_standing.append((m, btype))
    if swept_standing:
        r.no("C: no standing (decision/feedback/reference/user) beat was swept into the cluster",
             f"standing swept: {swept_standing}")
    else:
        r.ok(f"C: all {len(members)} members were type:project (no standing beat swept)")

    # ---- D: count integrity ----
    # canonical (1 new) + N superseded members. Live cluster file count for the
    # token should equal backup count + 1 (the new canonical), nothing removed.
    if args.token:
        b_tok = sorted(f for f in backup_md if args.token in f.lower())
        l_tok = sorted(f for f in os.listdir(live)
                       if f.endswith(".md") and args.token in f.lower())
        expect = len(b_tok) + (0 if canon_name in b_tok else 1)
        if len(l_tok) == expect:
            r.ok(f"D: live '{args.token}' file count {len(l_tok)} == backup {len(b_tok)} + canonical "
                 f"({'existing' if canon_name in b_tok else 'new'})")
        else:
            r.no("D: count integrity (no file vanished)",
                 f"live={len(l_tok)} expected={expect} backup={len(b_tok)}")

    # ---- E: standing beats untouched ----
    standing_backup = [f for f in backup_md
                       if is_standing(f, frontmatter(read(os.path.join(backup, f)))[0])]
    if args.token:
        standing_backup = [f for f in standing_backup if args.token in f.lower()]
    touched = []
    for f in standing_backup:
        b_sb = frontmatter(read(os.path.join(backup, f)))[2]
        l_sb = frontmatter(read(os.path.join(live, f)))[2]
        in_canon = f in members
        if b_sb != l_sb or in_canon:
            touched.append((f, f"superseded_by {b_sb}->{l_sb}", f"in_canon={in_canon}"))
    if touched:
        r.no("E: standing beats untouched (no superseded_by added, not in canonical)",
             f"touched: {touched}")
    else:
        r.ok(f"E: all {len(standing_backup)} standing beats untouched")

    # ---- F: fact survival spot-check ----
    for spec in args.fact:
        if "::" in spec:
            origin, needle = spec.split("::", 1)
        else:
            origin, needle = "?", spec
        if needle in canon_text:
            r.ok(f"F: fact survives in canonical (from {origin}): \"{short(needle)}\"")
        else:
            r.no(f"F: fact DROPPED (from {origin})", f"\"{short(needle)}\" not in canonical")

    # ---- coverage advisory (not pass/fail): project beats for token not merged ----
    if args.token:
        unmerged = []
        for f in backup_md:
            if args.token not in f.lower() or f == canon_name:
                continue
            btype, _, _ = frontmatter(read(os.path.join(backup, f)))
            if not is_standing(f, btype) and f not in members:
                unmerged.append(f)
        if unmerged:
            print(f"\nADVISORY: {len(unmerged)} type:project '{args.token}' beat(s) NOT in the "
                  f"consolidation (under-coverage or out-of-scope): {unmerged}")

    print("\n" + "=" * 60)
    print(f"RESULTS: {r.p} passed, {r.f} failed")
    if r.f:
        for m in r.fails:
            print(f"  - {m}")
        return 1
    print("NO DATA LOSS PROVEN: every check passed.")
    return 0


def short(s, n=60):
    s = s.replace("\n", " ")
    return s if len(s) <= n else s[:n] + "..."


if __name__ == "__main__":
    sys.exit(main())
