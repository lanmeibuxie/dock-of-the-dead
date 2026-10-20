const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/waves.js');
const W = globalThis.G.waves;

test('budget grows by 3.5 per wave', () => {
  assert.strictEqual(W.budget(1), 12);
  assert.strictEqual(W.budget(5), 28);
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
  assert.ok(W.compose(2, () => 0.99).includes('brute'));
});

test('horde caps and spawn pacing scale', () => {
  assert.strictEqual(W.aliveCap(1), 22);
  assert.strictEqual(W.aliveCap(20), 98);
  assert.strictEqual(W.aliveCap(40), 120);
  assert.ok(W.spawnInterval(1) > W.spawnInterval(20));
  assert.strictEqual(W.spawnInterval(60), 0.12);
  assert.strictEqual(W.spawnBatch(24), 3);
});

test('birds unlock at wave 4', () => {
  assert.ok(!W.compose(3, () => 0.99).includes('bird'));
  assert.ok(W.compose(4, () => 0.99).includes('bird'));
});

test('every 5th wave is elite and breath is 8s', () => {
  assert.strictEqual(W.isElite(5), true);
  assert.strictEqual(W.isElite(6), false);
  assert.strictEqual(W.breath(3), 8);
});

test('zombies scale every wave with speed cap', () => {
  assert.deepStrictEqual(W.scale(1), { hp: 1, damage: 1, speed: 1 });
  assert.ok(Math.abs(W.scale(11).hp - 2) < 1e-9);
  assert.ok(W.scale(11).damage > 1.3);
  assert.ok(W.scale(60).speed <= 1.35 + 1e-9);
});

test('runner unlocks at wave 3, bomber at wave 5', () => {
  assert.ok(!W.compose(2, () => 0.99).includes('runner'));
  assert.ok(W.compose(3, () => 0.99).includes('runner'));
  assert.ok(!W.compose(4, () => 0.99).includes('bomber'));
  assert.ok(W.compose(5, () => 0.85).includes('bomber'));
});
