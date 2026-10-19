/* 码头尸潮 — 强化卡池、稀有度抽取与属性应用（纯逻辑） */
(function () {
  'use strict';
  var G = globalThis.G;

  var POOL = [
    { id: 'damage', name: '伤害强化', desc: '所有武器伤害 +10%', rarity: 0, max: 8, icon: 'damage', stats: { damage: 0.10 } },
    { id: 'fireRate', name: '射速强化', desc: '射击速度 +8%', rarity: 0, max: 8, icon: 'rate', stats: { fireRate: 0.08 } },
    { id: 'reload', name: '快速换弹', desc: '换弹速度 +12%', rarity: 0, max: 8, icon: 'reload', stats: { reload: 0.12 } },
    { id: 'mag', name: '扩容弹匣', desc: '弹匣容量 +15%', rarity: 0, max: 8, icon: 'mag', stats: { mag: 0.15 } },
    { id: 'hp', name: '生命强化', desc: '生命上限 +15，回复 15', rarity: 0, max: 8, icon: 'hp', stats: { maxHp: 15, heal: 15 } },
    { id: 'speed', name: '移动强化', desc: '移动速度 +6%', rarity: 0, max: 8, icon: 'speed', stats: { speed: 0.06 } },
    { id: 'knock', name: '强力击退', desc: '击退力 +20%', rarity: 0, max: 8, icon: 'knock', stats: { knock: 0.20 } },
    { id: 'pickup', name: '磁力拾取', desc: '拾取范围 +40%', rarity: 0, max: 8, icon: 'pickup', stats: { pickup: 0.40 } },
    { id: 'ammo', name: '弹药专精', desc: '弹药拾取量 +25%', rarity: 0, max: 8, icon: 'ammo', stats: { ammo: 0.25 } },

    { id: 'crit', name: '暴击强化', desc: '暴击率 +8%，暴击 2 倍', rarity: 1, max: 5, icon: 'crit', stats: { crit: 0.08 } },
    { id: 'pierce', name: '穿透弹头', desc: '子弹额外穿透 1 个敌人', rarity: 1, max: 4, icon: 'pierce', stats: { pierce: 1 } },
    { id: 'leech', name: '嗜血', desc: '每次击杀回复 2 点生命', rarity: 1, max: 5, icon: 'leech', stats: { lifesteal: 2 } },
    { id: 'steady', name: '稳固枪身', desc: '后坐力 -25%，射速 +5%', rarity: 1, max: 5, icon: 'steady', stats: { recoil: -0.25, fireRate: 0.05 } },
    { id: 'medic', name: '战地急救', desc: '回复 40 生命，上限 +10', rarity: 1, max: 5, icon: 'heal', stats: { heal: 40, maxHp: 10 } },

    { id: 'critEye', name: '死神之眼', desc: '暴击率 +15%，暴击伤害 +0.5 倍', rarity: 2, max: 3, icon: 'crit', stats: { crit: 0.15, critMult: 0.5 } },
    { id: 'bulletStorm', name: '弹幕风暴', desc: '射速 +15%，弹匣 +20%', rarity: 2, max: 3, icon: 'storm', stats: { fireRate: 0.15, mag: 0.20 } },
    { id: 'hunter', name: '尸潮猎手', desc: '伤害 +20%，换弹 +10%', rarity: 2, max: 3, icon: 'hunter', stats: { damage: 0.20, reload: 0.10 } },
    { id: 'undying', name: '不灭意志', desc: '生命上限 +30，击杀回复 1', rarity: 2, max: 3, icon: 'undying', stats: { maxHp: 30, lifesteal: 1 } }
  ];

  var RARITY = ['普通', '稀有', '史诗'];

  function weights(wave) {
    if (wave <= 2) return [0.75, 0.25, 0];
    if (wave <= 5) return [0.6, 0.32, 0.08];
    return [0.45, 0.4, 0.15];
  }

  function levelOf(id, levels) {
    return (levels && levels[id]) || 0;
  }

  function maxed(card, levels) {
    return levelOf(card.id, levels) >= card.max;
  }

  function pickRarity(w, rng) {
    var r = rng(), acc = 0;
    for (var i = 0; i < 3; i++) {
      acc += w[i];
      if (r < acc) return i;
    }
    return 2;
  }

  function roll(wave, rng, levels) {
    rng = rng || Math.random;
    levels = levels || {};
    var out = [];
    var picked = Object.create(null);
    var w = weights(wave);

    for (var k = 0; k < 3; k++) {
      var rarity = pickRarity(w, rng);
      var pool = [];
      for (var i = 0; i < POOL.length; i++) {
        var c = POOL[i];
        if (c.rarity === rarity && !picked[c.id] && !maxed(c, levels)) pool.push(c);
      }
      if (!pool.length) {
        for (var j = 0; j < POOL.length; j++) {
          var c2 = POOL[j];
          if (!picked[c2.id] && !maxed(c2, levels)) pool.push(c2);
        }
      }
      if (!pool.length) break;
      var card = pool[Math.floor(rng() * pool.length)];
      picked[card.id] = true;
      out.push(card);
    }
    return out;
  }

  function apply(player, card, levels) {
    levels = levels || {};
    var lv = levelOf(card.id, levels);
    if (lv >= card.max) return false;
    levels[card.id] = lv + 1;
    var s = card.stats;
    if (s.maxHp) player.maxHp += s.maxHp;
    if (s.heal) player.heal(s.heal);
    for (var k in s) {
      if (k === 'maxHp' || k === 'heal') continue;
      player.mods[k] = (player.mods[k] || 0) + s[k];
    }
    if (player.hp > player.maxHp) player.hp = player.maxHp;
    player.syncMods();
    return true;
  }

  G.upgrades = {
    POOL: POOL,
    RARITY: RARITY,
    weights: weights,
    levelOf: levelOf,
    roll: roll,
    apply: apply
  };
})();
