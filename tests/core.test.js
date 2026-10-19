const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
const G = globalThis.G;

test('clamp/lerp/dist', () => {
  assert.strictEqual(G.clamp(5, 0, 3), 3);
  assert.strictEqual(G.clamp(-1, 0, 3), 0);
  assert.strictEqual(G.lerp(0, 10, 0.5), 5);
  assert.strictEqual(G.dist(0, 0, 3, 4), 5);
});

test('pool reuses released objects', () => {
  let made = 0;
  const p = G.pool(() => ({ id: ++made }), 1);
  const a = p.get();
  p.release(a);
  assert.strictEqual(p.get(), a);
  assert.strictEqual(made, 1);
  assert.strictEqual(p.live.length, 1);
});

test('hitstop freezes world time while real time advances', () => {
  G.time.reset();
  G.time.hitstop(0.05);
  G.time.update(0.016);
  assert.strictEqual(G.time.worldDt, 0);
  assert.ok(Math.abs(G.time.hitstopT - 0.034) < 1e-9);
});

test('slowmo scales world time and expires', () => {
  G.time.reset();
  G.time.slowmo(0.1, 0.35);
  G.time.update(0.05);
  assert.ok(Math.abs(G.time.worldDt - 0.0175) < 1e-9);
  G.time.update(0.06);
  G.time.update(0.01);
  assert.ok(Math.abs(G.time.worldDt - 0.01) < 1e-9);
});

require('../js/gfx.js');

test('camera clamps to level bounds', () => {
  const cam = G.gfx.cam;
  cam.reset();
  cam.follow(0, 100, 1, { minX: 0, maxX: 2400 });
  assert.ok(cam.x >= 0);
  cam.follow(2400, 100, 1, { minX: 0, maxX: 2400 });
  assert.ok(cam.x <= 2400 - G.W);
});

test('camera shake decays to zero', () => {
  const cam = G.gfx.cam;
  cam.reset();
  cam.shake(6);
  assert.ok(cam.trauma > 0);
  for (let i = 0; i < 120; i++) cam.update(0.016);
  assert.strictEqual(cam.trauma, 0);
  assert.strictEqual(cam.shakeX, 0);
});
