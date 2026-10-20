const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/gfx.js');
require('../js/level.js');
require('../js/weapons.js');
require('../js/player.js');
require('../js/upgrades.js');
require('../js/cnfont.js');
const G = globalThis.G;

test('font covers every card and UI character', () => {
  const text = G.upgrades.POOL.map(c => c.name + c.desc).join('') + '选择强化第波结束点击或按获得普通稀有史诗';
  for (const ch of text) {
    if (/[\u4e00-\u9fff]/.test(ch)) assert.ok(G.cnfont.has(ch), 'missing glyph ' + ch);
  }
});

test('font width is proportional and positive', () => {
  assert.ok(G.cnfont.width('伤害') > G.cnfont.width('A'));
  assert.strictEqual(G.cnfont.width(''), 0);
});

test('font draw emits pixels', () => {
  let n = 0;
  const ctx = { fillStyle: '', fillRect: function () { n++; } };
  G.cnfont.draw(ctx, '伤害 A', 0, 0, '#fff', 1);
  assert.ok(n > 50);
});
