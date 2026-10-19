const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/sprites.js');
require('../js/level.js');
require('../js/player.js');
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

test('pickup restores ammo and medkit heals', () => {
  const pl = { hp: 40, maxHp: 100, weapons: {} };
  pl.weapons.shotgun = new G.entities.Weapon('shotgun');
  pl.weapons.shotgun.reserve = 0;
  G.entities.applyPickup(pl, { kind: 'ammo_shotgun', amount: 12 });
  assert.strictEqual(pl.weapons.shotgun.reserve, 12);
  G.entities.applyPickup(pl, { kind: 'medkit', amount: 30 });
  assert.strictEqual(pl.hp, 70);
});

test('switch weapon changes fire interval and cancels reload', () => {
  const pl = new G.entities.Player(300);
  const sg = pl.weapons.shotgun;
  sg.ammo = 3;
  sg.startReload();
  assert.strictEqual(pl.switchTo('shotgun'), true);
  assert.strictEqual(pl.current, 'shotgun');
  assert.strictEqual(sg.reloading, false);
  assert.strictEqual(pl.switchTo('shotgun'), false);
});

test('minigun and new zombies are configured', () => {
  const m = G.content.weapons.minigun;
  assert.strictEqual(m.mag, 150);
  assert.strictEqual(m.rate, 0.03);
  assert.strictEqual(m.reserve, 150);
  assert.strictEqual(G.content.zombies.runner.damage, 9);
  assert.strictEqual(G.content.zombies.bomber.fuse, 0.7);
});
