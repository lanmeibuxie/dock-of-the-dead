const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/sprites.js');
require('../js/level.js');
require('../js/entities.js');
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

test('pistol respects fire rate and magazine, reserve is infinite', () => {
  const w = new G.entities.Weapon('pistol');
  assert.strictEqual(w.ammo, 12);
  assert.strictEqual(w.tryFire(0), true);
  assert.strictEqual(w.ammo, 11);
  assert.strictEqual(w.tryFire(0.01), false, 'rate limit');
  assert.strictEqual(w.tryFire(0.3), true);
  w.ammo = 0;
  assert.strictEqual(w.tryFire(1), false, 'empty');
  w.startReload();
  assert.strictEqual(w.reloading, true);
  w.finishReload();
  assert.strictEqual(w.ammo, 12);
  assert.strictEqual(w.reserve, Infinity);
});

test('shotgun has 8 pellets and longer cooldown than smg', () => {
  const sg = new G.entities.Weapon('shotgun');
  const smg = new G.entities.Weapon('smg');
  assert.strictEqual(sg.def.pellets, 8);
  assert.ok(sg.def.rate > smg.def.rate);
});
