const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/combat.js');
const C = globalThis.G.combat;

test('zone multipliers', () => {
  assert.strictEqual(C.mult('head'), 2.5);
  assert.strictEqual(C.mult('torso'), 1);
  assert.strictEqual(C.mult('limb'), 0.7);
});

test('headshot doubles as flag and multiplies damage', () => {
  const r = C.resolve({ damage: 24, zone: 'head' });
  assert.strictEqual(r.amount, 60);
  assert.strictEqual(r.headshot, true);
});

test('shotgun pellets combine into one damage event', () => {
  const r = C.resolve({ damage: 12, zone: 'torso', pellets: 8 });
  assert.strictEqual(r.amount, 96);
  assert.strictEqual(r.headshot, false);
});

test('hitstop and shake are graded, headshot wins', () => {
  assert.ok(C.hitstop('shotgun', false) > C.hitstop('pistol', false));
  assert.ok(C.hitstop('pistol', true) > C.hitstop('pistol', false));
  assert.ok(C.shake('shotgun', false) > C.shake('smg', false));
  assert.ok(C.shake('pistol', true) >= C.shake('pistol', false));
});

test('limb severs only when accumulated damage crosses 30', () => {
  assert.strictEqual(C.severApplied(10, 15), false);
  assert.strictEqual(C.severApplied(25, 10), true);
});
