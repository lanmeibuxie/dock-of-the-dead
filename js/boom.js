/* 码头尸潮 — 爆炸、自伤与连锁 */
(function () {
  'use strict';
  var G = globalThis.G;
  var queued = [];

  function queue(booms, z) {
    if (!z || z.boomQueued || z.exploded) return;
    z.boomQueued = true;
    booms.push({ z: z, t: 0.06 });
  }

  function blastAt(bx, by, ctx, opt) {
    var radius = opt.radius;
    var damage = opt.damage;
    var i;

    if (opt.self !== false) {
      var pd = G.dist(ctx.player.x, ctx.player.y - 20, bx, by);
      var self = G.combat.blastSelf(damage, pd, radius, ctx.player.blastResist);
      if (self > 0 && ctx.player.takeDamage(self, ctx.player.x < bx ? -1 : 1)) {
        ctx.particles.spawnBlood(ctx.player.x, ctx.player.y - 22, ctx.player.x < bx ? -1 : 1, 10);
        ctx.cam.shake(G.combat.hurtShake(self));
      }
    }

    for (i = 0; i < ctx.zombies.length; i++) {
      var z = ctx.zombies[i];
      if (z.dead) continue;
      var d = G.dist(z.x, z.y - 18, bx, by);
      if (d > radius + 12) continue;
      var dmg = Math.round(damage * (1 - 0.55 * Math.min(1, d / radius)));
      var out = z.hit('torso', dmg, z.x < bx ? -1 : 1, 'explosion', null, 1.2);
      if (out.killed) {
        if (ctx.stats) ctx.stats.kills++;
        if (ctx.addScore) ctx.addScore((z.def.score || 10) * (ctx.elite ? 2 : 1) * (ctx.scoreMult || 1));
        if (ctx.player.mods && ctx.player.mods.lifesteal) ctx.player.heal(ctx.player.mods.lifesteal);
        if (z.type === 'bomber' && ctx.queueBoom) ctx.queueBoom(z);
        if (ctx.player.mods && ctx.player.mods.blastChain && opt.chain !== false && G.chance(ctx.player.mods.blastChain)) {
          queueBlast(ctx, z.x, z.y - 20, 38, 18);
        }
        ctx.particles.spawnBlood(z.x, z.y - 20, 1, 12);
      }
    }

    if (ctx.birds) {
      for (i = 0; i < ctx.birds.length; i++) {
        var b = ctx.birds[i];
        if (b.dead || G.dist(b.x, b.y, bx, by) > radius + 10) continue;
        var bo = b.hit(Math.round(damage * 0.8), b.x < bx ? -1 : 1, 'explosion');
        if (bo.killed) {
          if (ctx.stats) ctx.stats.kills++;
          if (ctx.addScore) ctx.addScore((b.def.score || 12) * (ctx.elite ? 2 : 1));
          ctx.particles.spawnBlood(b.x, b.y, 1, 8);
          if (ctx.particles.spawnFeather) ctx.particles.spawnFeather(b.x, b.y, 1, 5);
        }
      }
    }

    ctx.particles.spawnBlood(bx, by, 1, 22);
    ctx.particles.spawnBlood(bx, by, -1, 22);
    ctx.particles.spawnGib(bx, by, 1, 5);
    ctx.particles.spawnGib(bx, by, -1, 5);
    ctx.particles.spawnSmoke(bx, by, 8);
    ctx.particles.spawnSparks(bx, by, 1, 8);
    ctx.level.addBlood(bx, ctx.level.layout.groundY + G.rand(1, 8), 20, 1);
    ctx.cam.shake(2.8);
    ctx.time.hitstop(0.05);
    if (ctx.audio) { ctx.audio.explosion(); ctx.audio.flesh(true); }
  }

  function explode(z, ctx) {
    if (!z || z.exploded) return;
    z.exploded = true;
    z.dead = true;
    z.deathT = 0;
    z.hide = { torso: true, head: true, armF: true, armB: true, legF: true, legB: true };
    blastAt(z.x, z.y + z.yOff - 18, ctx, {
      radius: z.def.bombRadius,
      damage: z.damage,
      self: true
    });
  }

  function queueBlast(ctx, x, y, radius, damage) {
    queued.push({ ctx: ctx, x: x, y: y, radius: radius, damage: damage, t: 0.12 });
  }

  function update(booms, dt, ctx) {
    for (var i = booms.length - 1; i >= 0; i--) {
      booms[i].t -= dt;
      if (booms[i].t <= 0) {
        explode(booms[i].z, ctx);
        booms.splice(i, 1);
      }
    }
    for (var q = queued.length - 1; q >= 0; q--) {
      queued[q].t -= dt;
      if (queued[q].t <= 0) {
        var b = queued[q];
        blastAt(b.x, b.y, b.ctx, { radius: b.radius, damage: b.damage, self: false, chain: false });
        queued.splice(q, 1);
      }
    }
  }

  function reset() { queued.length = 0; }

  G.boom = { queue: queue, explode: explode, blastAt: blastAt, update: update, queueBlast: queueBlast, reset: reset };
})();
