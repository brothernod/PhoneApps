#!/usr/bin/env bash
# Runs every CPTD test against a local server. Usage, from the repo root:
#   python3 -m http.server 8765 --bind 127.0.0.1 &   then   bash cptd/tools/tests/run_all.sh
# Prints only pass/fail lines so the output stays short.
cd "$(dirname "$0")"
node ../check-content.mjs | tail -1
for t in bar_test.py clock_test.py pass_test.py exam_test.py gen_test.py kin_test.py domain_test.py e2e.py; do
  printf '== %s: ' "$t"
  timeout 300 python3 "$t" 2>&1 | grep -E 'FAIL|ALL PASS|SOME FAILED|PASS busy|problems|ERRORS|errors:|Error' | head -6 | tr '\n' ' '
  echo
done
