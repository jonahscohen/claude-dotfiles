#!/bin/bash
set -euo pipefail

PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"

if [ ! -f ".justify" ]; then
  echo "No .justify marker found in this directory."
  exit 0
fi

# Read the public dir from marker
PUBLIC_DIR=$(python3 -c "import json; print(json.load(open('.justify')).get('dir','public'))" 2>/dev/null || echo "public")

# Remove the script
if [ -f "$PUBLIC_DIR/justify-core.js" ]; then
  rm "$PUBLIC_DIR/justify-core.js"
  echo "Removed $PUBLIC_DIR/justify-core.js"
fi

# Remove Drupal library entry
for f in *.libraries.yml; do
  if [ -f "$f" ] && grep -q "justify-dev" "$f"; then
    sed -i.bak '/# justify:dev/,/justify-core\.js/d' "$f"
    rm -f "${f}.bak"
    echo "Removed justify-dev from $f"
  fi
done

# Remove marker
rm -f .justify
echo "Removed .justify marker"
echo "Justify removed from project."
