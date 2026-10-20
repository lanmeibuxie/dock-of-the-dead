const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/gfx.js');
require('../js/level.js');
require('../js/weapons.js');
require('../js/player.js');
require('../js/entities.js');
require('../js/upgrades.js');
require('../js/upgradeui.js');
require('../js/modifiers.js');
const G = globalThis.G;

test('bosses are configured', () => {
  assert.strictEqual(G.content.zombies.crane.boss, true);
  assert.strictEqual(G.content.zombies.drownedBoss.boss, true);
  assert.strictEqual(G.content.zombies.crane.bossName, '吊机尸');
});

test('modifiers start at wave 8 and avoid repeats', () => {
  assert.strictEqual(G.modifiers.pick(7, () => 0.5, null), null);
  assert.strictEqual(G.modifiers.pick(10, () => 0.5, null), null);
  let prev = null;
  for (let i = 0; i < 30; i++) {
    const wave = 8 + i;
    if (wave % 5 === 0) continue;
    const m = G.modifiers.pick(wave, Math.random, prev);
    assert.ok(m);
    assert.notStrictEqual(m.id, prev);
    prev = m.id;
  }
});

test('new cost card lowers max hp but raises damage', () => {
  const p = new G.entities.Player(300);
  const card = G.upgrades.POOL.find(c => c.id === 'glassCannon');
  G.upgrades.apply(p, card, {});
  assert.strictEqual(p.maxHp, 80);
  assert.ok(p.mods.damage > 0.4);
});

test('tag sets grant a bonus at three picks', () => {
  const p = new G.entities.Player(300);
  const mag = G.upgrades.POOL.find(c => c.id === 'mag');
  const levels = {};
  G.upgrades.apply(p, mag, levels);
  G.upgrades.apply(p, mag, levels);
  G.upgrades.apply(p, mag, levels);
  assert.ok(p.mods.ammo >= 0.25 - 1e-9);
});

test('reroll callback fires and clears selection', () => {
  const cards = G.upgrades.roll(3, () => 0.4, {});
  let rolled = 0;
  const r = G.upgradeui.REROLL_RECT;
  const out = G.upgradeui.input(cards, 1, { x: r.x + 4, y: r.y + 4 }, true, () => false,
    () => {}, () => { rolled++; }, 1);
  assert.strictEqual(out.selected, -1);
  assert.strictEqual(rolled, 1);
});

test('taking damage does not interrupt reload', () => {
  const p = new G.entities.Player(300);
  p.hp = 100;
  const w = p.weapons.pistol;
  w.ammo = 3;
  w.startReload();
  const remain = w.reloadT;
  p.takeDamage(10, 1);
  assert.strictEqual(w.reloading, true);
  assert.strictEqual(w.reloadT, remain);
  assert.ok(p.hp < 100);
});
