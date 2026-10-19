const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/sprites.js');
require('../js/level.js');
const G = globalThis.G;

test('player rig has all animated parts', () => {
  const names = G.sprites.playerRig.parts.map(p => p.name);
  for (const n of ['head', 'torso', 'armF', 'armB', 'legF', 'legB']) {
    assert.ok(names.includes(n), 'missing ' + n);
  }
});

test('level layout spans 2400px with reachable platforms', () => {
  const L = G.level.build();
  assert.strictEqual(L.length, 2400);
  assert.ok(L.groundY > 150 && L.groundY < 240);
  for (const p of L.platforms) {
    assert.ok(p.x > 0 && p.x < L.length);
    assert.ok(L.groundY - p.y < 90, 'platform too high');
  }
});

test('each weapon and zombie config is complete', () => {
  for (const id of ['pistol', 'shotgun', 'smg']) {
    const w = G.content.weapons[id];
    assert.ok(w.damage > 0 && w.rate > 0 && w.mag > 0);
  }
  for (const id of ['walker', 'crawler', 'brute']) {
    const z = G.content.zombies[id];
    assert.ok(z.hp > 0 && z.speed > 0 && z.damage > 0);
  }
});
