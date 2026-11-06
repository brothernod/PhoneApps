// Self-test for verify.mjs: node tools/verify.test.mjs
import assert from 'node:assert/strict';
import { checkEntry, solve, verifyData } from './verify.mjs';

// Hand-built unique 5x5. Corgis at (0,1) (1,3) (2,0) (3,2) (4,4); region 'e' is the single cell (4,4).
const good = { n: 5, r: 'aabbb' + 'aabbb' + 'cabbd' + 'cdddd' + 'cddde', s: '13024' };
// Two solutions (03142 vs 13042-style ambiguity): same shape of data, regions all connected.
const twoSol = { n: 5, r: 'aabbb' + 'abbbc' + 'dddcc' + 'deccc' + 'deeec', s: '03142' };
// Disconnected region 'a' (cells (0,0) and (4,4) are not linked); solution is otherwise valid.
const split = { n: 5, r: 'abbbb' + 'bbbbb' + 'cbbdd' + 'cccdd' + 'cceea', s: '13024' };

// Independent naive cross-check: enumerate all column permutations.
const brute = ({ n, r }) => {
  const out = [];
  const perm = (p) => {
    if (p.length === n) {
      const regs = new Set(p.map((c, i) => r[i * n + c]));
      if (regs.size === n && p.every((c, i) => i === 0 || Math.abs(c - p[i - 1]) > 1)) out.push(p.join(''));
      return;
    }
    for (let c = 0; c < n; c++) if (!p.includes(c)) perm([...p, c]);
  };
  perm([]);
  return out;
};

assert.deepEqual(solve(5, good.r), ['13024'], 'solver finds the one solution');
assert.deepEqual(brute(good), ['13024'], 'brute force agrees (good is unique)');
assert.equal(solve(5, twoSol.r).length, 2, 'solver finds 2 solutions in ambiguous puzzle');
assert.ok(brute(twoSol).length >= 2, 'brute force agrees (ambiguous)');

assert.deepEqual(checkEntry(good), [], 'valid puzzle passes');
assert.ok(checkEntry(twoSol).some((m) => /not unique/.test(m)), 'ambiguous puzzle flagged');
assert.ok(checkEntry(split).some((m) => /not connected/.test(m)), 'disconnected region flagged');

const res = verifyData({
  daily: [{ date: '2026-11-06', ...good }, { date: '2026-11-07', ...twoSol }, { date: '2026-11-08', ...good }],
  campaign: [{ id: 1, ...good }, { id: 2, ...split }],
});
assert.deepEqual(res.daily.failures.map((f) => f.key), ['2026-11-07']);
assert.deepEqual(res.campaign.failures.map((f) => f.key), ['id 2']);

const seq = verifyData({ daily: [{ date: '2026-11-06', ...good }, { date: '2026-11-08', ...good }], campaign: [{ id: 2, ...good }] });
assert.equal(seq.daily.failures.length, 1, 'date gap flagged');
assert.equal(seq.campaign.failures.length, 1, 'bad campaign id flagged');

console.log('verify self-test passed');
