/* 码头尸潮 — 子弹命中结算、穿透、暴击与爆头反馈 */
(function () {
  'use strict';
  var G = globalThis.G;

  var volleyLock = 0;
  var shakeLock = 0;
  var slowLock = 0;

  function reset() {
    volleyLock = 0;
    shakeLock = 0;
    slowLock = 0;
  }

  function update(dt) {
    volleyLock = Math.max(0, volleyLock - dt);
    shakeLock = Math.max(0, shakeLock - dt);
    slowLock = Math.max(0, slowLock - dt);
  }

  function coarseBox(z) {
    var h = z.rig ? z.rig.legLen + z.rig.torsoH + z.rig.headH + 14 : 48;
    return { x: z.x - 18, y: z.y - h, w: 36, h: h + 10 };
  }

  function applyZombie(z, box, shot, ctx) {
    var dir = Math.cos(shot.angle) >= 0 ? 1 : -1;
    var res = G.combat.resolve({
      damage: shot.damage * (shot.crit ? ctx.player.mods.critMult : 1),
      zone: box.zone
    });
    var hx = shot.x, hy = shot.y;
    var out = z.hit(box.zone, res.amount, dir, shot.weapon, box.ref, shot.knockScale);
    var gy = ctx.level.layout.groundY;

    if (!shot.fxDone) {
      shot.fxDone = true;
      if (volleyLock <= 0) {
        ctx.time.hitstop(G.combat.hitstop(shot.weapon, res.headshot));
        volleyLock = 0.11;
      }
      if (shakeLock <= 0) {
        ctx.cam.shake(G.combat.shake(shot.weapon, res.headshot) + (shot.crit ? 0.25 : 0));
        shakeLock = 0.08;
      }
    }
    if (ctx.audio) ctx.audio.flesh(res.headshot, G.clamp((z.x - ctx.player.x) / 220, -1, 1));
    ctx.onHit(out.killed, !!shot.crit, res.headshot);

    if (shot.crit) ctx.particles.spawnSparks(hx, hy, dir, 5);
    if (ctx.player.mods.volatile && G.chance(ctx.player.mods.volatile)) {
      G.boom.queueBlast(ctx, hx, hy, 26, 12);
    }
    ctx.particles.spawnBlood(hx, hy, dir, res.headshot ? 34 : 14);
    ctx.level.addBlood(hx, gy + G.rand(1, 8), res.headshot ? 9 : 5, dir);
    if (res.headshot) ctx.particles.spawnBone(hx, hy, dir, 7);

    ctx.stats.hits++;
    if (res.headshot) ctx.stats.headshots++;

    if (out.severed) {
      G.entities.spawnLimb(ctx.limbs, z, box.ref, hx, hy, dir, 'limb');
      ctx.particles.spawnBlood(hx, hy, dir, 18);
    }
    if (out.killed) {
      ctx.stats.kills++;
      if (ctx.addGold) ctx.addGold(z.def.boss ? 20 : (z.affix ? 3 : 1));
      if (ctx.player.mods.lifesteal) ctx.player.heal(ctx.player.mods.lifesteal);
      if (ctx.player.mods.ammoRecycle && G.chance(ctx.player.mods.ammoRecycle)) ctx.player.recycleAmmo();
      if (ctx.player.mods.leechPct) ctx.player.heal(Math.max(1, Math.round(ctx.player.maxHp * ctx.player.mods.leechPct)));
      if (z.affix === 'explosive') G.boom.queueBlast(ctx, z.x, z.y - 20, 46, 24, { self: true, chain: false });
      ctx.addScore((z.def.score || 10) * (ctx.elite ? 2 : 1) * (ctx.scoreMult || 1) * (z.affix ? 1.5 : 1));
      if (G.chance(0.06)) ctx.spawnLoot(z.x);
      if (res.headshot) {
        z.hide.head = true;
        G.entities.spawnLimb(ctx.limbs, z, 'head', hx, hy, dir, 'head');
        ctx.particles.spawnBlood(hx, hy, dir, 46);
        ctx.particles.spawnBone(hx, hy, dir, 12);
        if (!shot.slowDone && slowLock <= 0) {
          shot.slowDone = true;
          ctx.time.slowmo(0.2, 0.4);
          slowLock = 0.5;
        }
      } else {
        ctx.particles.spawnGib(hx, hy, dir, 4);
        ctx.particles.spawnBlood(hx, hy, dir, 26);
        ctx.level.addBlood(hx, gy + G.rand(1, 8), 12, dir);
      }
    }
  }

  function applyBird(bird, shot, ctx) {
    var dir = Math.cos(shot.angle) >= 0 ? 1 : -1;
    var dmg = shot.damage * (shot.crit ? ctx.player.mods.critMult : 1);
    var out = bird.hit(dmg, dir, shot.weapon);
    if (!shot.fxDone) {
      shot.fxDone = true;
      if (volleyLock <= 0) { ctx.time.hitstop(0.01); volleyLock = 0.1; }
      if (shakeLock <= 0) { ctx.cam.shake(0.25); shakeLock = 0.08; }
    }
    ctx.onHit(out.killed, !!shot.crit, false);
    ctx.stats.hits++;
    if (ctx.audio) ctx.audio.flesh(false, G.clamp((bird.x - ctx.player.x) / 220, -1, 1));
    ctx.particles.spawnBlood(bird.x, bird.y, dir, 10);
    if (ctx.particles.spawnFeather) ctx.particles.spawnFeather(bird.x, bird.y, dir, 5);
    if (out.killed) {
      ctx.stats.kills++;
      if (ctx.addGold) ctx.addGold(1);
      ctx.addScore((bird.def.score || 12) * (ctx.elite ? 2 : 1) * (ctx.scoreMult || 1));
      if (ctx.player.mods.lifesteal) ctx.player.heal(ctx.player.mods.lifesteal);
    }
  }

  function resolve(shot, ctx) {
    var best = null;
    var i;
    for (i = 0; i < ctx.zombies.length; i++) {
      var z = ctx.zombies[i];
      if (z.dead || shot.hitList.indexOf(z) >= 0) continue;
      if (G.combat.segBoxT(shot.px, shot.py, shot.x, shot.y, coarseBox(z)) == null) continue;
      var boxes = z.hitBoxes();
      for (var b = 0; b < boxes.length; b++) {
        var t = G.combat.segBoxT(shot.px, shot.py, shot.x, shot.y, boxes[b]);
        if (t != null && (!best || t < best.t)) best = { z: z, box: boxes[b], t: t, bird: false };
      }
    }
    if (ctx.birds) {
      for (i = 0; i < ctx.birds.length; i++) {
        var bird = ctx.birds[i];
        if (bird.dead || shot.hitList.indexOf(bird) >= 0) continue;
        var hb = bird.hitBoxes()[0];
        var bt = G.combat.segBoxT(shot.px, shot.py, shot.x, shot.y, hb);
        if (bt != null && (!best || bt < best.t)) best = { bird: bird, box: hb, t: bt };
      }
    }
    if (!best) return;
    shot.x = shot.px + (shot.x - shot.px) * best.t;
    shot.y = shot.py + (shot.y - shot.py) * best.t;
    shot.hitList.push(best.bird || best.z);
    if (shot.pierce > 0) shot.pierce--;
    else shot.dead = true;
    if (best.bird) applyBird(best.bird, shot, ctx);
    else applyZombie(best.z, best.box, shot, ctx);
  }

  G.hits = { reset: reset, update: update, resolve: resolve };
})();
