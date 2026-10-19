/* 码头尸潮 — 主循环、波次导演、实体管理 */
(function () {
  'use strict';
  var G = globalThis.G;
  var canvas = null;
  var ctx = null;
  var last = 0;
  var fps = 60, frames = 0, fpsAcc = 0;
  var debug = /[?&]debug=1/.test(location.search);
  var hordeDebug = /[?&]debug=horde/.test(location.search);
  var player = null;
  var shots = [];
  var zombies = [];
  var waveNo = 0;
  var waveState = 'fight';
  var spawnQueue = [];
  var spawnTimer = 0;
  var spawned = 0;
  var elite = false;
  var breathT = 0;
  var bannerT = 0;
  var bannerText = '';
  var score = 0;
  var dead = false;
  var deadT = 0;

  function fit() {
    var s = Math.max(1, Math.floor(Math.min(window.innerWidth / G.W, window.innerHeight / G.H)));
    canvas.style.width = (G.W * s) + 'px';
    canvas.style.height = (G.H * s) + 'px';
  }

  function startWave(n) {
    waveNo = n;
    elite = G.waves.isElite(n);
    spawnQueue = G.waves.compose(n);
    spawned = 0;
    spawnTimer = 0.6;
    waveState = 'fight';
    bannerT = 2.2;
    bannerText = elite ? 'ELITE WAVE ' + n : 'WAVE ' + n;
  }

  function spawnOne() {
    var type = spawnQueue.shift();
    if (!type) return;
    var L = G.level.layout;
    var side = spawned % 2 === 0 ? 1 : -1;
    var water = spawned % 3 === 2;
    var x;
    if (water) {
      x = player.x + (G.chance(0.5) ? 1 : -1) * G.rand(90, 180);
    } else {
      x = player.x + side * (G.W * 0.55 + G.rand(0, 50));
    }
    if (type === 'brute') x = player.x + side * (G.W * 0.62 + G.rand(0, 30));
    x = G.clamp(x, 30, L.length - 30);
    var z = new G.entities.Zombie(type, x, water);
    if (elite) { z.hp *= 1.25; z.maxHp *= 1.25; }
    zombies.push(z);
    spawned++;
  }

  function kick() {
    var dir = player.facing;
    for (var i = 0; i < zombies.length; i++) {
      var z = zombies[i];
      if (z.dead) continue;
      var dx = z.x - player.x;
      if (Math.abs(dx) < 44 && Math.sign(dx || 1) === dir) {
        z.hit('torso', 8, dir, 'kick');
        z.stagger = Math.max(z.stagger, 0.45);
        z.knockVx = dir * 300 * (z.def.resist || 1);
        G.gfx.cam.shake(2.2);
      }
    }
  }

  function shoot() {
    if (dead) return;
    var fired = player.fire();
    if (!fired) return;
    for (var i = 0; i < fired.angles.length; i++) {
      shots.push(new G.entities.Shot(fired.x, fired.y, fired.angles[i], fired.damage, fired.weapon, fired.knock));
    }
    G.gfx.cam.shake(fired.weapon === 'shotgun' ? 2.6 : fired.weapon === 'smg' ? 0.8 : 1.1);
  }

  function updateWaves(dt) {
    if (waveState === 'fight') {
      if (spawnQueue.length) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnOne();
          spawnTimer = 0.42;
        }
      } else {
        var alive = false;
        for (var i = 0; i < zombies.length; i++) if (!zombies[i].dead) { alive = true; break; }
        if (!alive) {
          waveState = 'breath';
          breathT = G.waves.breath(waveNo);
          bannerT = 2.4;
          bannerText = 'WAVE CLEAR';
        }
      }
    } else {
      breathT -= dt;
      if (breathT <= 0) startWave(waveNo + 1);
    }
  }

  function updateWorld(dt) {
    if (dead) {
      deadT += dt;
      if (G.input.pressed('KeyR')) location.reload();
      return;
    }
    player.update(dt);
    if (player.kickRequested) {
      player.kickRequested = false;
      kick();
    }
    if (G.input.mouse.down || G.input.mouse.clicked) shoot();

    for (var s = shots.length - 1; s >= 0; s--) {
      shots[s].update(dt);
      if (shots[s].dead) shots.splice(s, 1);
    }
    for (var z = zombies.length - 1; z >= 0; z--) {
      zombies[z].update(dt, player);
      if (zombies[z].dead && zombies[z].deathT > 22) zombies.splice(z, 1);
    }
    updateWaves(dt);
    if (player.hp <= 0) { dead = true; deadT = 0; G.time.slowmo(0.9, 0.3); }

    bannerT = Math.max(0, bannerT - dt);
    G.gfx.cam.follow(player.x, G.H / 2, dt, { minX: 0, maxX: G.level.layout.length });
  }

  function drawCrosshair() {
    var m = G.input.mouse;
    var x = Math.round(m.x), y = Math.round(m.y);
    ctx.fillStyle = 'rgba(232,227,208,0.85)';
    ctx.fillRect(x - 6, y, 4, 1);
    ctx.fillRect(x + 3, y, 4, 1);
    ctx.fillRect(x, y - 6, 1, 4);
    ctx.fillRect(x, y + 3, 1, 4);
    ctx.fillStyle = 'rgba(232,227,208,0.55)';
    ctx.fillRect(x, y, 1, 1);
  }

  function drawHud() {
    var w = player.weapon();
    G.sprites.font('WAVE ' + waveNo, 6, 6, elite ? '#e06a5a' : '#e8e3d0', 1);
    if (elite) G.sprites.font('ELITE', 6, 14, '#c8393f', 1);
    G.sprites.font('SCORE ' + score, G.W - 6, 6, '#c9c2a8', 1, 'right');

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(7, G.H - 18, 86, 9);
    ctx.fillStyle = '#3a1216';
    ctx.fillRect(8, G.H - 17, 84, 7);
    var hpw = Math.max(0, Math.round(84 * player.hp / player.maxHp));
    ctx.fillStyle = player.hp < 30 ? '#d33a3a' : '#a8242e';
    ctx.fillRect(8, G.H - 17, hpw, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(8, G.H - 17, hpw, 1);
    G.sprites.font('HP', 9, G.H - 27, '#a8b0a0', 1);

    G.sprites.font(w.def.name, G.W - 6, G.H - 27, '#a8b0a0', 1, 'right');
    G.sprites.font(w.ammo + ' / ' + (w.reserve === Infinity ? '\u221e' : w.reserve), G.W - 6, G.H - 17, w.ammo === 0 ? '#d33a3a' : '#e8e3d0', 1, 'right');
    if (w.reloading) {
      ctx.fillStyle = '#e8e3d0';
      ctx.fillRect(G.W - 66, G.H - 7, 60, 2);
      ctx.fillStyle = '#ffc46b';
      var prog = 1 - w.reloadT / w.def.reload;
      ctx.fillRect(G.W - 66, G.H - 7, Math.round(60 * prog), 2);
    }

    if (bannerT > 0) {
      var a = Math.min(1, bannerT * 1.4);
      ctx.globalAlpha = a;
      G.sprites.font(bannerText, G.W / 2, 54, bannerText === 'WAVE CLEAR' ? '#7fff9f' : '#e8e3d0', 3, 'center');
      ctx.globalAlpha = 1;
    }
    if (waveState === 'breath' && bannerT <= 0) {
      G.sprites.font('NEXT WAVE ' + Math.ceil(breathT), G.W / 2, 44, '#c9c2a8', 1, 'center');
    }

    if (dead) {
      ctx.fillStyle = 'rgba(20,0,0,0.45)';
      ctx.fillRect(0, 0, G.W, G.H);
      G.sprites.font('YOU DIED', G.W / 2, 100, '#b8242e', 4, 'center');
      G.sprites.font('WAVE ' + waveNo + '   SCORE ' + score, G.W / 2, 132, '#c9c2a8', 1, 'center');
      G.sprites.font('PRESS R TO RESTART', G.W / 2, 150, '#e8e3d0', 1, 'center');
    }
  }

  function drawWorld() {
    var cam = G.gfx.cam;
    G.level.drawBg(ctx, cam.x);
    G.level.drawDeck(ctx, cam.x);

    for (var z = 0; z < zombies.length; z++) zombies[z].draw(ctx);
    for (var i = 0; i < shots.length; i++) shots[i].draw(ctx);
    if (!dead) player.draw(ctx);
    else G.sprites.drawRig(ctx, G.sprites.playerRig, {
      aim: player.aim, facing: player.facing, armF: player.aim, armB: player.aim + 0.2,
      legF: 1.1, legB: 0.6, gun: player.current, torsoAngle: player.facing * 1.4
    }, cam.toScreenX(player.x), cam.toScreenY(player.y));

    var lights = [{ x: player.x, y: player.y - 20, r: 95 }];
    if (player.flash > 0) {
      var p = player.points();
      lights.push({ x: p.muzzleX, y: p.muzzleY, r: 85 });
    }
    G.level.drawLighting(ctx, cam.x, lights);
    G.level.drawWeather(ctx, cam.x);
    drawCrosshair();
    drawHud();
  }

  function loop(ts) {
    var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0.016;
    last = ts;
    G.time.update(dt);
    if (debug) {
      frames++;
      fpsAcc += dt;
      if (fpsAcc >= 0.5) { fps = Math.round(frames / fpsAcc); frames = 0; fpsAcc = 0; }
    }

    G.gfx.cam.update(dt);
    G.level.update(G.time.worldDt, G.gfx.cam.x);
    updateWorld(G.time.worldDt);

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b1418';
    ctx.fillRect(0, 0, G.W, G.H);
    drawWorld();

    if (debug) {
      G.sprites.font(fps + ' FPS', G.W - 4, 4, '#7fff9f', 1, 'right');
      G.sprites.font('Z ' + zombies.length + ' SHOTS ' + shots.length, G.W / 2, G.H - 8, '#7fff9f', 1, 'center');
    }

    G.input.endFrame();
    requestAnimationFrame(loop);
  }

  G.game = G.game || {};
  G.game.state = 'playing';
  G.game.debug = debug;

  G.game.boot = function () {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    G.gfx.init(canvas);
    G.input.init(canvas);
    G.level.reset();
    player = new G.entities.Player(300);
    G.game.player = player;
    fit();
    window.addEventListener('resize', fit);
    startWave(1);
    if (hordeDebug) {
      var types = ['walker', 'walker', 'crawler', 'walker', 'brute', 'crawler', 'walker', 'walker'];
      for (var i = 0; i < types.length; i++) {
        var hx = G.clamp(player.x + (i % 2 === 0 ? 1 : -1) * G.rand(55, 205), 40, G.level.layout.length - 40);
        zombies.push(new G.entities.Zombie(types[i], hx, false));
      }
      spawnQueue = [];
      waveState = 'fight';
      bannerT = 0;
    }
    requestAnimationFrame(loop);
  };

  window.addEventListener('error', function (e) {
    var el = document.getElementById('err');
    if (!el) return;
    el.style.display = 'block';
    el.textContent = (e.message || 'Error') + '\n' + (e.filename || '') + ':' + (e.lineno || 0);
  });

  window.addEventListener('DOMContentLoaded', G.game.boot);
})();
