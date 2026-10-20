/* 码头尸潮 — 波次预算与僵尸组成（纯规则） */
(function () {
  'use strict';
  var G = globalThis.G;

  var COST = { walker: 1, crawler: 1.5, brute: 5, runner: 2, bomber: 3, bird: 1 };

  function budget(n) { return 8 + n * 4; }

  function pickType(n, rng) {
    var opts = [{ t: 'walker', w: 1 }];
    if (n >= 2) opts.push({ t: 'crawler', w: 0.55 + n * 0.015 });
    if (n >= 2) opts.push({ t: 'brute', w: n >= 4 ? 0.5 : 0.22 });
    if (n >= 3) opts.push({ t: 'runner', w: 0.45 + n * 0.01 });
    if (n >= 5) opts.push({ t: 'bomber', w: 0.25 + n * 0.01 });
    if (n >= 4) opts.push({ t: 'bird', w: 0.2 + n * 0.01 });
    var total = 0, i;
    for (i = 0; i < opts.length; i++) total += opts[i].w;
    var r = rng() * total;
    for (i = 0; i < opts.length; i++) {
      r -= opts[i].w;
      if (r <= 0) return opts[i].t;
    }
    return 'walker';
  }

  function compose(n, rng) {
    rng = rng || Math.random;
    var left = budget(n);
    var out = [];
    var guard = 0;
    while (left >= 1 && guard++ < 400) {
      var t = pickType(n, rng);
      if (COST[t] > left) t = 'walker';
      if (COST[t] > left) break;
      out.push(t);
      left -= COST[t];
    }
    if (!out.length) out.push('walker');
    return out;
  }

  G.waves = {
    cost: function (type) { return COST[type] || 1; },
    budget: budget,
    compose: compose,
    isElite: function (n) { return n % 5 === 0; },
    breath: function () { return 8; },
    aliveCap: function (n) { return Math.min(120, 18 + n * 4); },
    spawnInterval: function (n) { return Math.max(0.12, 0.5 - n * 0.012); },
    spawnBatch: function (n) { return Math.min(3, 1 + Math.floor(n / 8)); },
    scale: function (n) {
      return {
        hp: 1 + 0.10 * (n - 1),
        damage: 1 + 0.04 * (n - 1),
        speed: Math.min(1.35, 1 + 0.012 * (n - 1))
      };
    }
  };
})();
