#!/usr/bin/env bash
# ============================================================
# tilt-lab launcher (claude-dotfiles)
# ============================================================
# Symlinked onto PATH at ~/.local/bin/tilt-lab by install.sh. Resolves its own
# real location (following the symlink) to find the tilt-lab app inside the
# dotfiles repo, ensures dependencies are present, then starts the Vite dev
# server. Forwards any extra args to `npm run dev` (e.g. `tilt-lab -- --host`).
#
#   tilt-lab            start the playground dev server (http://localhost:5180)
#   tilt-lab build      build the app bundle      (npm run build:app)
#   tilt-lab test       run the test suite        (npm test)
#   tilt-lab verify     run the behavioral verifier (npm run verify)
# ============================================================
set -euo pipefail

# Resolve the real path of this script even when invoked via the PATH symlink.
SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
# Launcher lives at <repo>/bin/, so tilt-lab is a sibling of bin/.
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TILT_DIR="$REPO_DIR/tilt-lab"

if [ ! -d "$TILT_DIR" ]; then
  printf 'tilt-lab: app directory not found at %s\n' "$TILT_DIR" >&2
  exit 1
fi

cd "$TILT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  printf 'tilt-lab: npm not found on PATH. Install Node, then re-run.\n' >&2
  exit 1
fi

# Ensure dependencies are present (idempotent; only installs on first run).
if [ ! -d node_modules ]; then
  printf 'tilt-lab: installing dependencies (first run)...\n' >&2
  npm install
fi

case "${1:-dev}" in
  dev|"")   shift || true; exec npm run dev -- "$@" ;;
  build)    shift; exec npm run build:app -- "$@" ;;
  test)     shift; exec npm test -- "$@" ;;
  verify)   shift; exec npm run verify -- "$@" ;;
  *)        exec npm run dev -- "$@" ;;
esac
