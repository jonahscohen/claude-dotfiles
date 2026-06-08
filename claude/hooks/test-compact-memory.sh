#!/bin/bash
# test-compact-memory.sh
#
# Regression coverage for compact-memory.py's standing-beat detection.
#
# The bug class (caught 2026-06-06): standing beats are identified by frontmatter
# `type`, NOT by filename prefix. A long-lived decision/feedback beat is often
# saved with a session_* FILENAME but a standing TYPE - the old prefix-only
# is_standing() let those age out of the live index. This test proves:
#   1. a session_-named type:decision beat is RETAINED in the live index even
#      when it is the OLDEST entry (the fix);
#   2. type:project session beats are still archived by date (behavior preserved);
#   3. when the referenced file is missing/unreadable, is_standing falls back to
#      the filename prefix (decision_ retained, session_ archived).
#
# It loads the real module via importlib and shrinks BUDGET to force archival, so
# the actual is_standing()/main() logic is exercised. Exits non-zero on any fail.

set -u
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"

python3 - "$HOOK_DIR/compact-memory.py" <<'PYEOF'
import importlib.util, os, sys, tempfile

mod_path = sys.argv[1]
spec = importlib.util.spec_from_file_location("compact_memory", mod_path)
cm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cm)

fails = []


def check(cond, msg):
    print(("PASS" if cond else "FAIL") + ": " + msg)
    if not cond:
        fails.append(msg)


tmp = tempfile.mkdtemp(prefix="compact-test-")


def beat(name, btype):
    with open(os.path.join(tmp, name), "w", encoding="utf-8") as fh:
        fh.write(f"---\nname: {name}\ntype: {btype}\n---\nbody\n")


# Real beat files on disk (frontmatter type is authoritative):
beat("session_2020-01-01_old-decision.md", "decision")   # oldest; MUST survive
beat("session_2021-01-01_old-project.md", "project")     # archivable by date
beat("session_2026-06-05_new-project.md", "project")     # archivable by date
beat("feedback_2020_rule.md", "feedback")                # standing (type+prefix)

# Index pointers, including two with NO file on disk to exercise the fallback:
#   decision_ghost.md  -> no file, no type -> fallback to filename prefix -> standing
#   session_2019_ghost.md -> no file, no type, no standing prefix -> archivable
mem = os.path.join(tmp, "MEMORY.md")
with open(mem, "w", encoding="utf-8") as fh:
    fh.write("\n".join([
        "- [Old decision](session_2020-01-01_old-decision.md): a long-lived decision saved with a session filename",
        "- [Old project](session_2021-01-01_old-project.md): a dated project beat that should archive by age",
        "- [New project](session_2026-06-05_new-project.md): a newer project beat",
        "- [Standing rule](feedback_2020_rule.md): a standing feedback rule",
        "- [Ghost decision](decision_ghost.md): pointer whose file is missing - fallback to prefix",
        "- [Ghost session](session_2019_ghost.md): missing file, no standing prefix - archivable",
    ]) + "\n")

# Force maximal archival so the only survivors are the standing entries.
cm.BUDGET = 1
argv = sys.argv
sys.argv = ["compact-memory.py", mem]
try:
    rc = cm.main()
finally:
    sys.argv = argv

check(rc == 0, "compactor returns 0")

live = open(mem, encoding="utf-8").read()
arch_path = os.path.join(tmp, "MEMORY-archive.md")
arch = open(arch_path, encoding="utf-8").read() if os.path.isfile(arch_path) else ""

# 1. THE FIX: session_-named type:decision retained in the LIVE index though oldest.
check("session_2020-01-01_old-decision.md" in live,
      "session_-named type:decision beat RETAINED in live index (the fix)")
check("session_2020-01-01_old-decision.md" not in arch,
      "session_-named type:decision beat NOT archived")

# 2. Behavior preserved: type:project session beats still archive by date.
check("session_2021-01-01_old-project.md" in arch,
      "type:project beat archived (behavior preserved)")
check("session_2021-01-01_old-project.md" not in live,
      "archived type:project beat removed from live index")
check("session_2026-06-05_new-project.md" in arch,
      "second type:project beat archived")

# 3. Standing feedback retained (type + prefix both standing).
check("feedback_2020_rule.md" in live, "type:feedback standing beat retained")

# 4. Fallback when file/type unreadable: prefix decides.
check("decision_ghost.md" in live,
      "missing-file decision_ pointer retained via filename fallback")
check("session_2019_ghost.md" in arch,
      "missing-file non-standing session_ pointer archived via fallback")

# Idempotence: a second run makes no further change.
before = open(mem, encoding="utf-8").read()
sys.argv = ["compact-memory.py", mem]
cm.main()
sys.argv = argv
check(open(mem, encoding="utf-8").read() == before, "second run is idempotent")

print()
if fails:
    print(f"{len(fails)} FAILURE(S)")
    sys.exit(1)
print("ALL PASS")
PYEOF
rc=$?
exit $rc
