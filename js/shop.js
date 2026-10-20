/* 码头尸潮 — 波间补给商店与金币消费（纯规则） */
(function () {
  'use strict';
  var G = globalThis.G;

  var POOL = [
    { id: 'badge', name: '猎手徽章', desc: '伤害 +15%', price: 6, icon: 'damage', stats: { damage: 0.15 } },
    { id: 'plate', name: '铁皮护甲', desc: '受到伤害 -10%', price: 6, icon: 'shield', stats: { armor: 0.10 } },
    { id: 'coolant', name: '冷却核心', desc: '换弹速度 +15%', price: 5, icon: 'reload', stats: { reload: 0.15 } },
    { id: 'warhead', name: '高爆核心', desc: '爆炸半径 +15%', price: 6, icon: 'blast', stats: { blastRadius: 0.15 } },
    { id: 'magnet', name: '磁力核心', desc: '拾取范围 +50%', price: 4, icon: 'pickup', stats: { pickup: 0.50 } },
    { id: 'fuelCell', name: '燃料电池', desc: '燃料上限 +40%，回满', price: 5, icon: 'fuel', stats: { jetFuel: 0.40 }, refuel: true },
    { id: 'medkit', name: '医疗包', desc: '立即回复 50 生命', price: 3, icon: 'heal', heal: 50 },
    { id: 'ammoBox', name: '全弹药补给', desc: '补充全部武器备弹', price: 4, icon: 'ammo', ammo: true }
  ];

  function roll(count, rng) {
    rng = rng || Math.random;
    var pool = POOL.slice();
    var out = [];
    for (var i = 0; i < count && pool.length; i++) {
      var idx = Math.floor(rng() * pool.length);
      out.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return out;
  }

  function apply(player, item) {
    if (item.heal) player.heal(item.heal);
    if (item.ammo) G.entities.applyPickup(player, { kind: 'ammo_all' });
    if (item.stats) {
      for (var k in item.stats) player.mods[k] = (player.mods[k] || 0) + item.stats[k];
    }
    if (item.refuel) {
      player.syncMods();
      player.fuel = player.maxFuel;
    }
    player.syncMods();
    return true;
  }

  G.shop = { POOL: POOL, roll: roll, apply: apply, REROLL_COST: 2 };
})();
