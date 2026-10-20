const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/gfx.js');
require('../js/level.js');
require('../js/player.js');
require('../js/upgrades.js');
const G = globalThis.G;

test('roll returns three distinct available cards', () => {
  const cards = G.upgrades.roll(6, () => 0.42, {});
  assert.strictEqual(cards.length, 3);
  assert.strictEqual(new Set(cards.map(c => c.id)).size, 3);
});

test('maxed cards are excluded', () => {
  const levels = {};
  for (const c of G.upgrades.POOL) if (c.rarity === 2) levels[c.id] = c.max;
  for (let i = 0; i < 30; i++) {
    const cards = G.upgrades.roll(9, Math.random, levels);
    assert.ok(cards.every(c => c.rarity !== 2));
  }
});

test('rarity weights shift with wave', () => {
  assert.deepStrictEqual(G.upgrades.weights(1), [0.75, 0.25, 0]);
  assert.deepStrictEqual(G.upgrades.weights(4), [0.6, 0.32, 0.08]);
  assert.deepStrictEqual(G.upgrades.weights(9), [0.45, 0.4, 0.15]);
});

test('damage cards stack additively', () => {
  const p = new G.entities.Player(300);
  const dmg = G.upgrades.POOL.find(c => c.id === 'damage');
  assert.strictEqual(G.upgrades.apply(p, dmg, {}), true);
  assert.strictEqual(G.upgrades.apply(p, dmg, {}), true);
  assert.ok(Math.abs(p.mods.damage - 0.2) < 1e-9);
});

test('hp card raises max hp and heals', () => {
  const p = new G.entities.Player(300);
  p.hp = 50;
  const hp = G.upgrades.POOL.find(c => c.id === 'hp');
  G.upgrades.apply(p, hp, {});
  assert.strictEqual(p.maxHp, 115);
  assert.strictEqual(p.hp, 65);
});

test('mag card updates every weapon magazine size', () => {
  const p = new G.entities.Player(300);
  const mag = G.upgrades.POOL.find(c => c.id === 'mag');
  G.upgrades.apply(p, mag, {});
  assert.strictEqual(p.weapons.pistol.magSize, 14);
  assert.strictEqual(p.weapons.minigun.magSize, 173);
});

test('crit/steady cards change combat stats', () => {
  const p = new G.entities.Player(300);
  const crit = G.upgrades.POOL.find(c => c.id === 'crit');
  const steady = G.upgrades.POOL.find(c => c.id === 'steady');
  G.upgrades.apply(p, crit, {});
  G.upgrades.apply(p, steady, {});
  assert.ok(Math.abs(p.mods.crit - 0.08) < 1e-9);
  assert.ok(Math.abs(p.mods.recoil + 0.25) < 1e-9);
  assert.ok(Math.abs(p.mods.fireRate - 0.05) < 1e-9);
});

test('jetpack cards raise fuel, thrust and armor caps', () => {
  const p = new G.entities.Player(300);
  const fuel = G.upgrades.POOL.find(c => c.id === 'fuelTank');
  const turbo = G.upgrades.POOL.find(c => c.id === 'jetTurbo');
  const armor = G.upgrades.POOL.find(c => c.id === 'blastArmor');
  G.upgrades.apply(p, fuel, {});
  assert.strictEqual(p.maxFuel, 125);
  assert.strictEqual(p.fuel, 125);
  G.upgrades.apply(p, turbo, {});
  assert.ok(p.jetThrust > G.JET.thrust);
  for (let i = 0; i < 5; i++) G.upgrades.apply(p, armor, {});
  assert.ok(p.blastResist <= 0.7 + 1e-9);
});
