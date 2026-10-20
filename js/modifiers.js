/* 码头尸潮 — 波次词缀 */
(function () {
  'use strict';
  var G = globalThis.G;

  var LIST = [
    { id: 'tide', name: '涨潮', desc: '水中爬出的僵尸大幅增加', color: '#5ea9c9' },
    { id: 'blackout', name: '停电', desc: '路灯熄灭，视野变暗，鸟群增多', color: '#8f9d95' },
    { id: 'bloodMoon', name: '血月', desc: '僵尸更快更痛，补给与分数更好', color: '#c8393f' },
    { id: 'airdrop', name: '空投', desc: '战场出现额外补给，并多一次刷新', color: '#7fff9f' }
  ];

  function pick(wave, rng, prev) {
    if (wave < 8 || wave % 5 === 0) return null;
    rng = rng || Math.random;
    var pool = [];
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id !== prev) pool.push(LIST[i]);
    if (!pool.length) pool = LIST;
    return pool[Math.floor(rng() * pool.length)];
  }

  G.modifiers = { LIST: LIST, pick: pick };
})();
