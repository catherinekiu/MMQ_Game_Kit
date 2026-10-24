const assert = require('assert');
const M = require('../shared/mmq-math.js');

// Metrics: 8 correct from 10 attempts in 30 seconds => 20 attempts/min, 80%, 16 correct/min.
let x = M.metrics(8, 10, 30);
assert.strictEqual(x.attemptRate, 20);
assert.strictEqual(x.accuracyPercent, 80);
assert.strictEqual(x.fluency, 16);

// Zero attempts should remain finite and safe.
x = M.metrics(0, 0, 0);
assert.strictEqual(x.attemptRate, 0);
assert.strictEqual(x.accuracy, 0);
assert.strictEqual(x.fluency, 0);

// One full row and one full column on a 5x5 board.
const selected = new Set([0,1,2,3,4,5,10,15,20]);
const lines = M.completedLines(selected, 5).sort();
assert.deepStrictEqual(lines, ['col-0','row-0']);

// Three completed rows should be detected exactly.
const threeRows = new Set();
for (let i = 0; i < 15; i++) threeRows.add(i);
assert.strictEqual(M.completedLines(threeRows, 5).length, 3);

// Distractors must be unique, positive and exclude the answer.
const ds = M.productDistractors(24, 6, 3, () => 0.37);
assert.strictEqual(ds.length, 3);
assert.strictEqual(new Set(ds).size, 3);
assert.ok(ds.every(v => v > 0 && v !== 24));

// Table facts must stay within the requested tables/multipliers.
const facts = M.tableFacts([3,7], 9);
assert.strictEqual(facts.length, 18);
assert.ok(facts.every(f => [3,7].includes(f.b) && f.a >= 1 && f.a <= 9 && f.product === f.a * f.b));

console.log('MMQ core logic tests: PASS');

// Near-fact distractors should be plausible, unique, positive, and never equal the product.
const md = M.multiplicationDistractors(7, 4, 3, () => 0.41);
assert.strictEqual(md.length, 3);
assert.strictEqual(new Set(md).size, 3);
assert.ok(md.every(v => v > 0 && v !== 28));
