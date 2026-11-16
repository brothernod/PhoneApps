#!/usr/bin/env bash
# Stamp a new revision: updates version.js and the ?v= cache-busters in index.html.
# Usage: NalaGolf/tools/bump.sh   (run before each commit)
set -euo pipefail
cd "$(dirname "$0")/.."
stamp=$(TZ=America/New_York date '+%Y-%m-%d %H:%M')
v=$(TZ=America/New_York date '+%Y%m%d%H%M')
sed -i "s/^const REV=.*/const REV='${stamp} ET';/" version.js
sed -i -E "s/\.js\?v=[0-9a-z]+/.js?v=${v}/g" index.html
echo "REV ${stamp} ET (v=${v})"
