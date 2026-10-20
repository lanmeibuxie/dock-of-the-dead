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
require('../js/birds.js');
require('../js/grenade.js');
require('../js/themes.js');
const G = globalThis.G;

test('launcher pickup fills reserve', () => {
  const p = new G.entities.Player(300);
  p.weapons.launcher.reserve = 0;
  G.entities.applyPickup(p, { kind: 'ammo_launcher', amount: 4 });
  assert.strictEqual(p.weapons.launcher.reserve, 4);
});

test('bird stays airborne and can be killed', () => {
  const b = new G.birds.Bird(300, 80, 1);
  const fake = { x: 300, y: 196, takeDamage: () => false };
  for (let i = 0; i < 30; i++) b.update(0.1, fake);
  assert.ok(b.y >= 22 && b.y <= 178);
  const out = b.hit(99, 1);
  assert.strictEqual(out.killed, true);
  assert.strictEqual(b.dead, true);
});

test('upgrade input selects then confirms', () => {
  const cards = G.upgrades.roll(1, () => 0.1, {});
  let confirmed = -1;
  const noKeys = () => false;
  const first = G.upgradeui.input(cards, -1, { x: 92, y: 136 }, true, noKeys, i => { confirmed = i; });
  assert.strictEqual(first.selected, 0);
  const second = G.upgradeui.input(cards, 0, { x: 240, y: 244 }, true, noKeys, i => { confirmed = i; });
  assert.strictEqual(second.selected, 0);
  assert.strictEqual(confirmed, 0);
});

test('clicking a selected card does not confirm', () => {
  const cards = G.upgrades.roll(1, () => 0.1, {});
  let confirmed = -1;
  const noKeys = () => false;
  const r = G.upgradeui.input(cards, 0, { x: 92, y: 136 }, true, noKeys, i => { confirmed = i; });
  assert.strictEqual(r.selected, 0);
  assert.strictEqual(confirmed, -1);
});

test('upgrade keyboard selects and enter confirms', () => {
  const cards = G.upgrades.roll(3, () => 0.6, {});
  let confirmed = -1;
  let pressed = code => code === 'Digit2';
  const a = G.upgradeui.input(cards, -1, { x: 0, y: 0 }, false, pressed, i => { confirmed = i; });
  assert.strictEqual(a.selected, 1);
  pressed = code => code === 'Enter';
  const b = G.upgradeui.input(cards, a.selected, { x: 0, y: 0 }, false, pressed, i => { confirmed = i; });
  assert.strictEqual(b.selected, 1);
  assert.strictEqual(confirmed, 1);
});

test('day theme transitions over time', () => {
  G.level.reset();
  assert.strictEqual(G.level.setTheme(true), true);
  G.level.update(0.75, 0);
  assert.ok(G.level.themeMix > 0.4 && G.level.themeMix < 0.6);
  G.level.update(0.8, 0);
  assert.strictEqual(G.level.themeMix, 1);
  assert.notStrictEqual(G.themes.get(0).skyTop, G.themes.get(1).skyTop);
});

test('ammo_all restores launcher and minigun reserves', () => {
  const p = new G.entities.Player(300);
  p.weapons.launcher.reserve = 0;
  p.weapons.minigun.reserve = 0;
  G.entities.applyPickup(p, { kind: 'ammo_all' });
  assert.ok(p.weapons.launcher.reserve >= 4);
  assert.ok(p.weapons.minigun.reserve >= 60);
});
