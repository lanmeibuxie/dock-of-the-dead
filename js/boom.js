/* 码头尸潮 — 自爆种爆炸与连锁（由 game 提供上下文） */
(function () {
  'use strict';
  var G = globalThis.G;

  function queue(booms, z) {
    if (!z || z.boomQueued || z.exploded) return;
    z.boomQueued = true;
    booms.push({ z: z, t: 0.06 });
  }

  function explode(z, ctx) {
    if (!z || z.exploded) return;
    z.exploded = true;
    z.dead = true;
    z.deathT = 0;
    z.hide = { torso: true, head: true, armF: true, armB: true, legF: true, legB: true };
    var player = ctx.player, zombies = ctx.zombies;
    var bx = z.x, by = z.y + z.yOff - 18;
    var radius = z.def.bombRadius;
    var dist = Math.abs(player.x - z.x);
    var dir = z.x < player.x ? 1 : -1;

    if (dist < radius && player.hp > 0) {
      var dmg = Math.round(z.damage * (1 - dist / radius * 0.55));
      if (player.takeDamage(dmg, dir)) {
        ctx.particles.spawnBlood(player.x, player.y - 22, dir, 12);
        ctx.cam.shake(G.combat.hurtShake(dmg) + 3);
      }
    }

    for (var i = 0; i < zombies.length; i++) {
      var o = zombies[i];
      if (o === z || o.dead) continue;
      if (Math.abs(o.x - bx) < z.def.chainRadius && Math.abs(o.y + o.yOff - z.y) < 60) {
        var out = o.hit('torso', z.def.chainDamage, o.x < bx ? 1 : -1, 'explosion', null, 1.2);
        if (out.killed && o.type === 'bomber') ctx.queueBoom(o);
      }
    }

    ctx.particles.spawnBlood(bx, by, 1, 24);
    ctx.particles.spawnBlood(bx, by, -1, 24);
    ctx.particles.spawnGib(bx, by, 1, 6);
    ctx.particles.spawnGib(bx, by, -1, 6);
    ctx.particles.spawnSmoke(bx, by, 10);
    ctx.particles.spawnSparks(bx, by, 1, 10);
    ctx.level.addBlood(bx, ctx.level.layout.groundY + G.rand(1, 8), 22, dir);
    ctx.cam.shake(7);
    ctx.time.hitstop(0.05);
    if (ctx.audio) { ctx.audio.explosion(); ctx.audio.flesh(true); }
  }

  function update(booms, dt, ctx) {
    for (var i = booms.length - 1; i >= 0; i--) {
      booms[i].t -= dt;
      if (booms[i].t <= 0) {
        explode(booms[i].z, ctx);
        booms.splice(i, 1);
      }
    }
  }

  G.boom = { queue: queue, explode: explode, update: update };
})();
