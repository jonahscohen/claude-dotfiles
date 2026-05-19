#!/bin/bash
# Sync built improv bundle to the live install and to every project that has an
# .improv marker file. Run from the improv/ directory after `node build.js`.
#
# Workflow:
#   1. Edit TS source under core/ (or server/).
#   2. Run `npm run deploy` (build + sync).
#   3. Reload the browser tab on whichever project you're working in.
#
# Source of truth is always the TS source. Never hand-patch dist/improv-core.js
# - regenerating it from source will silently drop the patch. If you find
# yourself wanting to hand-patch, port the change into source and rebuild instead.

set -euo pipefail

REPO_DIST="$(cd "$(dirname "$0")" && pwd)/dist"
INSTALL_DIST="${HOME}/.claude/improv/dist"
CORE_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --core-only) CORE_ONLY=1 ;;
    --help|-h)
      echo "Usage: deploy.sh [--core-only]"
      echo "  --core-only   only sync improv-core.js (skip adapters)"
      exit 0
      ;;
  esac
done

if [ ! -f "$REPO_DIST/improv-core.js" ]; then
  echo "ERROR: $REPO_DIST/improv-core.js not found. Did the build succeed?"
  exit 1
fi

# 1. Sync to the install dir (the WS server serves from here for fresh injections)
mkdir -p "$INSTALL_DIST"
cp "$REPO_DIST/improv-core.js" "$REPO_DIST/improv-core.js.map" "$INSTALL_DIST/"
echo "synced -> $INSTALL_DIST/improv-core.js"

if [ "$CORE_ONLY" -eq 0 ]; then
  for adapter in react vue svelte; do
    if [ -f "$REPO_DIST/improv-${adapter}.js" ]; then
      cp "$REPO_DIST/improv-${adapter}.js" "$REPO_DIST/improv-${adapter}.js.map" "$INSTALL_DIST/" 2>/dev/null || true
      echo "synced -> $INSTALL_DIST/improv-${adapter}.js"
    fi
  done

  # Sync compiled server JS if it exists. Changes here only take effect on the
  # next MCP server start (Node has the old code in memory), so the user needs
  # to restart Claude Code to pick up server-side updates.
  if [ -d "$REPO_DIST/server" ]; then
    mkdir -p "$INSTALL_DIST/server"
    cp -R "$REPO_DIST/server/." "$INSTALL_DIST/server/"
    echo "synced -> $INSTALL_DIST/server/ (active on next Claude Code restart)"
  fi
fi

# 2. Sync to every project that has an .improv marker. Each project keeps its
# own copy of improv-core.js (placed there by init.sh at install time). We walk
# every marker under ~/Documents/Github and refresh that copy.
PROJECTS_ROOT="${HOME}/Documents/Github"
if [ -d "$PROJECTS_ROOT" ]; then
  while IFS= read -r MARKER; do
    PROJECT="$(dirname "$MARKER")"
    DIR="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("dir","."))' "$MARKER" 2>/dev/null || echo ".")"
    TARGET="$PROJECT/$DIR/improv-core.js"
    if [ -f "$TARGET" ]; then
      cp "$REPO_DIST/improv-core.js" "$TARGET"
      echo "synced -> $TARGET"
    fi
  done < <(find "$PROJECTS_ROOT" -maxdepth 4 -name ".improv" -type f 2>/dev/null)
fi

echo ""
echo "Deploy complete. Reload the browser tab to pick up the new bundle."
