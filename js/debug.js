/* 码头尸潮 — 调试场景辅助（仅在 debug 参数下调用） */
(function () {
  'use strict';
  var G = globalThis.G;

  G.debug = G.debug || {};
  G.debug.horde = function (zombies, player) {
    var types = ['walker', 'runner', 'crawler', 'walker', 'brute', 'bomber', 'walker', 'runner'];
    for (var i = 0; i < types.length; i++) {
      var x = G.clamp(player.x + (i % 2 === 0 ? 1 : -1) * G.rand(55, 205), 40, G.level.layout.length - 40);
      zombies.push(new G.entities.Zombie(types[i], x, false));
    }
  };
})();
