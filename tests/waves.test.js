const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/waves.js');
const W = globalThis.G.waves;

test('budget grows by 3.5 per wave', () => {
  assert.strictEqual(W.budget(1), 9.5);
  assert.strictEqual(W.budget(5), 23.5);
});

test('compose never overspends and always spawns something', () => {
  for (let n = 1; n <= 20; n++) {
    const list = W.compose(n, () => 0.5);
    const spent = list.reduce((s, t) => s + W.cost(t), 0);
    assert.ok(spent <= W.budget(n) + 1e-9, `wave ${n} overspent ${spent}`);
    assert.ok(list.length > 0, `wave ${n} empty`);
  }
});

test('brutes appear from wave 2, never wave 1', () => {
  assert.ok(!W.compose(1, () => 0.99).includes('brute'));
  assert.ok(W.compose(6, () => 0.99).includes('brute'));
});

test('every 5th wave is elite and breath is 8s', () => {
  assert.strictEqual(W.isElite(5), true);
  assert.strictEqual(W.isElite(6), false);
  assert.strictEqual(W.breath(3), 8);
});
