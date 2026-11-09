#!/usr/bin/env python3
"""Report this conversation's token spend, for the checkpoints in cptd/research/PLAN.md.

Usage:  python3 cptd/tools/spend.py            (finds the newest transcript)
        python3 cptd/tools/spend.py FILE.jsonl

Prints the session's own dollar meter (if recorded), then weighted usage for the main
conversation and for each helper agent. Weights: cache reads 0.1, cache writes 2,
output (including thinking) 5, plain input 1. "max ctx" is the largest history any
single step re-read; keep it under ~100k (see PLAN.md, rule 1). "re-cached" counts big
history reloads, which usually mean a pause longer than the 5-minute cache.
"""
import glob, json, os, sys

W = {'cr': 0.1, 'cw': 2, 'out': 5, 'inp': 1}


def load(p):
    out = []
    for line in open(p, encoding='utf-8'):
        try:
            out.append(json.loads(line))
        except ValueError:
            pass
    return out


def usage(rows):
    seen, t, mx, recache = set(), dict(cr=0, cw=0, out=0, inp=0), 0, 0
    for r in rows:
        if r.get('type') != 'assistant':
            continue
        m = r.get('message', {})
        if m.get('id') in seen:
            continue
        seen.add(m.get('id'))
        u = m.get('usage') or {}
        t['cr'] += u.get('cache_read_input_tokens', 0)
        t['cw'] += u.get('cache_creation_input_tokens', 0)
        t['out'] += u.get('output_tokens', 0)
        t['inp'] += u.get('input_tokens', 0)
        ctx = u.get('input_tokens', 0) + u.get('cache_creation_input_tokens', 0) + u.get('cache_read_input_tokens', 0)
        mx = max(mx, ctx)
        if u.get('cache_creation_input_tokens', 0) > 50_000 and u.get('cache_read_input_tokens', 0) < 20_000:
            recache += 1
    eff = sum(t[k] * W[k] for k in t)
    return len(seen), eff, t, mx, recache


def line(name, calls, eff, t, mx, recache):
    parts = f"reading {t['cr'] * W['cr'] / 1e6:.2f}M, adding {t['cw'] * W['cw'] / 1e6:.2f}M, writing {t['out'] * W['out'] / 1e6:.2f}M"
    return f"{name:<34} {eff / 1e6:6.2f}M weighted  steps {calls:4d}  max ctx {mx // 1000:4d}k  re-cached {recache:2d}  ({parts})"


def main():
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        base = os.environ.get('CLAUDE_CONFIG_DIR', os.path.expanduser('~/.claude'))
        files = glob.glob(os.path.join(base, 'projects', '*', '*.jsonl'))
        if not files:
            sys.exit('No transcript found; pass the path to one.')
        path = max(files, key=os.path.getmtime)
    rows = load(path)
    costs = [r for r in rows if r.get('type') == 'cost-state']
    if costs:
        print(f"Session meter: ${costs[-1].get('totalCostUSD', 0):.2f} (last recorded; may lag the current turn)")
    total = 0
    c, eff, t, mx, rc = usage(rows)
    total += eff
    print(line('main conversation', c, eff, t, mx, rc))
    sub = os.path.join(path[:-6], 'subagents')
    for p in sorted(glob.glob(os.path.join(sub, '**', '*.jsonl'), recursive=True)):
        rr = load(p)
        first = next((r for r in rr if r.get('type') == 'user'), {})
        msg = first.get('message', {}).get('content', '')
        label = (msg if isinstance(msg, str) else json.dumps(msg))[:30].replace('\n', ' ')
        c, eff, t, mx, rc = usage(rr)
        total += eff
        print(line('agent: ' + label, c, eff, t, mx, rc))
    print(f"{'total':<34} {total / 1e6:6.2f}M weighted")
    print('Transcript:', path, '(a resumed session only covers the part since the last compaction)')


if __name__ == '__main__':
    main()
