/* 码头尸潮 — 近战踹击 */
(function () {
  'use strict';
  var G = globalThis.G;

  function kick(player, zombies, fx) {
    var dir = player.facing;
    for (var i = 0; i < zombies.length; i++) {
      var z = zombies[i];
      if (z.dead) continue;
      var dx = z.x - player.x;
      if (Math.abs(dx) < 44 && Math.sign(dx || 1) === dir) {
        z.hit('torso', 8, dir, 'kick');
        z.stagger = Math.max(z.stagger, 0.45);
        z.knockVx = dir * 300 * (z.def.resist || 1);
        fx.cam.shake(2.2);
        fx.particles.spawnBlood(z.x, G.level.layout.groundY - 18, dir, 9);
        if (fx.audio) fx.audio.kick();
        fx.time.hitstop(0.04);
        fx.onHit();
      }
    }
  }

  G.melee = { kick: kick };
})();
