/* 码头尸潮 — 世界绘制（读取状态快照，不修改逻辑） */
(function () {
  'use strict';
  var G = globalThis.G;

  function drawWorld(ctx, s) {
    var cam = s.cam;
    G.level.drawBg(ctx, cam.x);
    G.level.drawDeck(ctx, cam.x);

    if (s.state !== 'title') {
      var minX = cam.x - 70, maxX = cam.x + G.W + 70;
      for (var pk = 0; pk < s.pickups.length; pk++) s.pickups[pk].draw(ctx);
      for (var li = 0; li < s.limbs.length; li++) {
        if (s.limbs[li].x >= minX && s.limbs[li].x <= maxX) s.limbs[li].draw(ctx);
      }
      for (var z = 0; z < s.zombies.length; z++) {
        var zb = s.zombies[z];
        if (zb.x >= minX && zb.x <= maxX) zb.draw(ctx);
      }
      if (s.birds) {
        for (var bi = 0; bi < s.birds.length; bi++) {
          var bd = s.birds[bi];
          if (bd.x >= minX - 40 && bd.x <= maxX + 40) bd.draw(ctx);
        }
      }
      G.hazards.draw(ctx);
      for (var i = 0; i < s.shots.length; i++) s.shots[i].draw(ctx);
      if (s.grenades) {
        for (var gi = 0; gi < s.grenades.length; gi++) s.grenades[gi].draw(ctx);
      }
      if (s.state === 'dead') {
        G.sprites.drawRig(ctx, G.sprites.playerRig, {
          aim: s.player.aim, facing: s.player.facing, armF: s.player.aim, armB: s.player.aim + 0.2,
          legF: 1.1, legB: 0.6, gun: s.player.current, torsoAngle: s.player.facing * 1.4
        }, cam.toScreenX(s.player.x), cam.toScreenY(s.player.y));
      } else {
        s.player.draw(ctx);
      }
    }

    var lights = [];
    if (s.player && s.state !== 'title') {
      lights.push({ x: s.player.x, y: s.player.y - 20, r: 95 });
      if (s.player.flash > 0) {
        var p = s.player.points();
        lights.push({ x: p.muzzleX, y: p.muzzleY, r: 85 });
      }
    }
    if (s.debug) G.hud.hitboxes(ctx, cam, s.zombies, s.player, s.state);
    G.level.drawLighting(ctx, cam.x, lights);
    if (s.state !== 'title') G.particles.draw(ctx);
    G.level.drawWeather(ctx, cam.x);

    if (s.state === 'title') {
      G.hud.title(ctx, s.titleT, G.hud.best());
      G.upgradeui.cursor(ctx, s.mouse);
      return;
    }

    G.hud.draw(ctx, {
      player: s.player, wave: s.waveNo, elite: s.elite, score: s.score,
      waveState: s.waveState, breathT: s.breathT,
      bannerText: (s.state === 'paused' || s.state === 'dead') ? '' : s.bannerText,
      bannerT: (s.state === 'paused' || s.state === 'dead') ? 0 : s.bannerT,
      muted: s.muted, t: G.level.time, toastText: s.toastText, toastT: s.toastT, boss: s.boss, modifier: s.modifier
    });

    if (s.state === 'playing') {
      var spread = 4 + (s.player.switchT > 0 ? 2 : 0) + s.player.recoil * 1.6;
      G.hud.crosshair(ctx, s.mouse, s.hitMark, s.hitKill, s.hitCrit, spread, s.player.spin);
    }
    if (s.state === 'upgrade') {
      G.upgradeui.draw(ctx, {
        cards: s.upgradeCards, levels: s.upgradeLevels, wave: s.waveNo,
        hover: s.upgradeHover, selected: s.upgradeSelected, rerolls: s.upgradeRerolls, mouse: s.mouse
      });
    }
    if (s.state === 'paused') G.hud.pause(ctx);
    if (s.state === 'dead' && s.deadT > 0.7) {
      var acc = s.stats.shots ? Math.round(s.stats.hits / s.stats.shots * 100) : 0;
      G.hud.gameover(ctx, {
        wave: s.waveNo, score: s.score, kills: s.stats.kills, headshots: s.stats.headshots,
        accuracy: acc, best: G.hud.best()
      });
    }
  }

  G.render = { drawWorld: drawWorld };
})();
