#!/usr/bin/env bash
set -euo pipefail

echo "Building Lotus plugin..."
npm run build

echo "Packaging dist/ into lotus-plugin.zip..."
cd dist
zip -r ../lotus-plugin.zip code.js ui.html
cd ..

echo "Done. Created lotus-plugin.zip ($(du -h lotus-plugin.zip | cut -f1))"
