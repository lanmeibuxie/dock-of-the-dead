/* 码头尸潮 — 调试场景辅助（仅在 debug 参数下调用） */
(function () {
  'use strict';
  var G = globalThis.G;

  G.debug = G.debug || {};
  G.debug.horde = function (zombies, player, count) {
    var types = ['walker', 'runner', 'crawler', 'walker', 'brute', 'bomber', 'walker', 'runner'];
    var total = count > 0 ? count : types.length;
    for (var i = 0; i < total; i++) {
      var type = i < types.length ? types[i] : G.pick(['walker', 'walker', 'crawler', 'runner']);
      var x = G.clamp(player.x + (i % 2 === 0 ? 1 : -1) * G.rand(55, 320), 40, G.level.layout.length - 40);
      zombies.push(new G.entities.Zombie(type, x, false));
    }
  };
})();
