/* 码头尸潮 — 状态机、波次导演、实体管理、主循环 */
(function () {
  'use strict';
  var G = globalThis.G;
  var canvas = null;
  var ctx = null;
  var last = 0;
  var fps = 60, frames = 0, fpsAcc = 0;
  var debug = /[?&]debug=1/.test(location.search);
  var hordeDebug = /[?&]debug=horde/.test(location.search);
  var goreDebug = /[?&]debug=gore/.test(location.search);
  var god = /[?&]god=1/.test(location.search);
  var waveParam = /[?&]wave=(\d+)/.exec(location.search);
  var slowAcc = 0;
  var lowFx = false;

  var state = 'title';
  var titleT = 0;
  var deadT = 0;
  var player = null;
  var shots = [];
  var zombies = [];
  var limbs = [];
  var pickups = [];
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
  var hitMark = 0;
  var hitKill = false;
  var volleyLock = 0;
  var stats = { kills: 0, headshots: 0, shots: 0, hits: 0 };

  function setState(s) {
    state = s;
    G.game.state = s;
  }

  function fit() {
    var s = Math.max(1, Math.floor(Math.min(window.innerWidth / G.W, window.innerHeight / G.H)));
    canvas.style.width = (G.W * s) + 'px';
    canvas.style.height = (G.H * s) + 'px';
  }

  function lootKind() {
    var r = Math.random();
    if (r < 0.4) return 'medkit';
    if (player.current === 'smg') return 'ammo_smg';
    if (player.current === 'pistol') return G.chance(0.5) ? 'ammo_pistol' : 'ammo_shotgun';
    return 'ammo_shotgun';
  }

  function spawnLoot(x) {
    var L = G.level.layout;
    pickups.push(new G.entities.Pickup(lootKind(), G.clamp(x, 30, L.length - 30)));
  }

  function startWave(n) {
    waveNo = n;
    G.game.wave = n;
    elite = G.waves.isElite(n);
    spawnQueue = G.waves.compose(n);
    spawned = 0;
    spawnTimer = 0.6;
    waveState = 'fight';
    bannerT = 2.2;
    bannerText = elite ? 'ELITE WAVE ' + n : 'WAVE ' + n;
    if (G.audio) { if (elite) G.audio.thunder(); else G.audio.foghorn(); }
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
    if (!water && Math.abs(x - player.x) < 90) x = player.x + (player.x < L.length / 2 ? 1 : -1) * G.W * 0.55;
    x = G.clamp(x, 30, L.length - 30);
    var z = new G.entities.Zombie(type, x, water);
    if (elite) { z.hp *= 1.25; z.maxHp *= 1.25; }
    zombies.push(z);
    spawned++;
    if (G.audio && G.chance(0.4)) G.audio.groan(G.clamp((x - player.x) / 220, -1, 1));
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
        G.particles.spawnBlood(z.x, G.level.layout.groundY - 18, dir, 9);
        if (G.audio) G.audio.kick();
        G.time.hitstop(0.04);
        hitMark = 0.1;
        hitKill = false;
      }
    }
  }

  function shoot() {
    if (state !== 'playing') return;
    var fired = player.fire();
    if (!fired) return;
    for (var i = 0; i < fired.angles.length; i++) {
      shots.push(new G.entities.Shot(fired.x, fired.y, fired.angles[i], fired.damage, fired.weapon, fired.knock));
    }
    stats.shots += fired.angles.length;
    G.gfx.cam.shake(fired.weapon === 'shotgun' ? 2.6 : fired.weapon === 'smg' ? 0.8 : 1.1);
    if (G.audio) { G.audio.shot(fired.weapon); G.audio.shell(); }
    var pp = player.points();
    G.particles.spawnShell(pp.handX, pp.handY - 2, player.facing);
    G.particles.spawnSparks(pp.muzzleX, pp.muzzleY, player.facing, fired.weapon === 'shotgun' ? 5 : 2);
    if (fired.weapon === 'shotgun') G.particles.spawnSmoke(pp.muzzleX, pp.muzzleY, 4);
  }

  function applyHit(z, box, shot) {
    var dir = Math.cos(shot.angle) >= 0 ? 1 : -1;
    var res = G.combat.resolve({ damage: shot.damage, zone: box.zone });
    var hx = shot.x, hy = shot.y;
    var out = z.hit(box.zone, res.amount, dir, shot.weapon, box.ref);
    var gy = G.level.layout.groundY;

    if (volleyLock <= 0) {
      G.time.hitstop(G.combat.hitstop(shot.weapon, res.headshot));
      volleyLock = 0.07;
    }
    G.gfx.cam.shake(G.combat.shake(shot.weapon, res.headshot));
    if (G.audio) G.audio.flesh(res.headshot, G.clamp((z.x - player.x) / 220, -1, 1));
    hitMark = 0.1;
    hitKill = out.killed;

    G.particles.spawnBlood(hx, hy, dir, res.headshot ? 34 : 14);
    G.level.addBlood(hx, gy + G.rand(1, 8), res.headshot ? 9 : 5, dir);
    if (res.headshot) G.particles.spawnBone(hx, hy, dir, 7);

    stats.hits++;
    if (res.headshot) stats.headshots++;

    if (out.severed) {
      G.entities.spawnLimb(limbs, z, box.ref, hx, hy, dir, 'limb');
      G.particles.spawnBlood(hx, hy, dir, 18);
    }
    if (out.killed) {
      stats.kills++;
      score += (z.def.score || 10) * (elite ? 2 : 1);
      if (G.chance(0.06)) spawnLoot(z.x);
      if (res.headshot) {
        z.hide.head = true;
        G.entities.spawnLimb(limbs, z, 'head', hx, hy, dir, 'head');
        G.particles.spawnBlood(hx, hy, dir, 46);
        G.particles.spawnBone(hx, hy, dir, 12);
        G.time.slowmo(0.32, 0.35);
        G.gfx.cam.shake(4);
      } else {
        G.particles.spawnGib(hx, hy, dir, 4);
        G.particles.spawnBlood(hx, hy, dir, 26);
        G.level.addBlood(hx, gy + G.rand(1, 8), 12, dir);
      }
    }
  }

  function resolveShot(shot) {
    var best = null;
    for (var i = 0; i < zombies.length; i++) {
      var z = zombies[i];
      if (z.dead) continue;
      var boxes = z.hitBoxes();
      for (var b = 0; b < boxes.length; b++) {
        var t = G.combat.segBoxT(shot.px, shot.py, shot.x, shot.y, boxes[b]);
        if (t != null && (!best || t < best.t)) best = { z: z, box: boxes[b], t: t };
      }
    }
    if (!best) return;
    shot.x = shot.px + (shot.x - shot.px) * best.t;
    shot.y = shot.py + (shot.y - shot.py) * best.t;
    shot.dead = true;
    applyHit(best.z, best.box, shot);
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
          if (G.audio) G.audio.foghorn();
          spawnLoot(player.x - 55);
          spawnLoot(player.x + 65);
        }
      }
    } else {
      breathT -= dt;
      if (breathT <= 0) startWave(waveNo + 1);
    }
  }

  function die() {
    if (state === 'dead') return;
    setState('dead');
    deadT = 0;
    G.hud.saveBest(score);
    player.hp = 0;
    G.time.slowmo(0.9, 0.3);
    G.particles.spawnBlood(player.x, player.y - 22, player.facing, 30);
    G.gfx.cam.shake(5);
    if (G.audio) G.audio.thunder();
  }

  function updateWorld(dt, realDt) {
    if (state === 'dead') { deadT += realDt; return; }
    player.update(dt);
    if (player.kickRequested) {
      player.kickRequested = false;
      kick();
    }
    if (G.input.mouse.down || G.input.mouse.clicked) shoot();

    for (var s = shots.length - 1; s >= 0; s--) {
      shots[s].update(dt);
      if (!shots[s].dead) resolveShot(shots[s]);
      if (shots[s].dead) shots.splice(s, 1);
    }
    for (var z = zombies.length - 1; z >= 0; z--) {
      zombies[z].update(dt, player);
      if (zombies[z].dead && zombies[z].deathT > 22) zombies.splice(z, 1);
    }
    for (var zc = 0; zc < zombies.length; zc++) zombies[zc].x = G.clamp(zombies[zc].x, 20, G.level.layout.length - 20);
    for (var a = 0; a < zombies.length; a++) {
      if (zombies[a].dead) continue;
      for (var b = a + 1; b < zombies.length; b++) {
        if (zombies[b].dead) continue;
        var sep = zombies[b].x - zombies[a].x;
        if (Math.abs(sep) < 12 && Math.abs(zombies[a].yOff - zombies[b].yOff) < 8) {
          var push = (12 - Math.abs(sep)) * 0.5 * (sep >= 0 ? 1 : -1);
          zombies[a].x -= push;
          zombies[b].x += push;
        }
      }
    }
    for (var li = limbs.length - 1; li >= 0; li--) {
      limbs[li].update(dt);
      if (limbs[li].dead) limbs.splice(li, 1);
    }
    for (var pi = pickups.length - 1; pi >= 0; pi--) {
      pickups[pi].update(dt, player);
      if (pickups[pi].dead) pickups.splice(pi, 1);
    }
    G.particles.update(realDt);
    hitMark = Math.max(0, hitMark - realDt);
    volleyLock = Math.max(0, volleyLock - realDt);
    updateWaves(dt);
    if (player.hp <= 0) die();
    bannerT = Math.max(0, bannerT - dt);
    G.gfx.cam.follow(player.x, G.H / 2, dt, { minX: 0, maxX: G.level.layout.length });
  }

  function drawWorld() {
    var cam = G.gfx.cam;
    G.level.drawBg(ctx, cam.x);
    G.level.drawDeck(ctx, cam.x);

    if (state !== 'title') {
      for (var pk = 0; pk < pickups.length; pk++) pickups[pk].draw(ctx);
      for (var li = 0; li < limbs.length; li++) limbs[li].draw(ctx);
      for (var z = 0; z < zombies.length; z++) zombies[z].draw(ctx);
      for (var i = 0; i < shots.length; i++) shots[i].draw(ctx);
      if (state === 'dead') {
        G.sprites.drawRig(ctx, G.sprites.playerRig, {
          aim: player.aim, facing: player.facing, armF: player.aim, armB: player.aim + 0.2,
          legF: 1.1, legB: 0.6, gun: player.current, torsoAngle: player.facing * 1.4
        }, cam.toScreenX(player.x), cam.toScreenY(player.y));
      } else {
        player.draw(ctx);
      }
    }

    var lights = [];
    if (player && state !== 'title') {
      lights.push({ x: player.x, y: player.y - 20, r: 95 });
      if (player.flash > 0) {
        var p = player.points();
        lights.push({ x: p.muzzleX, y: p.muzzleY, r: 85 });
      }
    }
    if (debug) G.hud.hitboxes(ctx, cam, zombies, player, state);
    G.level.drawLighting(ctx, cam.x, lights);
    if (state !== 'title') G.particles.draw(ctx);
    G.level.drawWeather(ctx, cam.x);

    if (state === 'title') {
      G.hud.title(ctx, titleT, G.hud.best());
      return;
    }

    G.hud.draw(ctx, {
      player: player, wave: waveNo, elite: elite, score: score,
      waveState: waveState, breathT: breathT,
      bannerText: (state === 'paused' || state === 'dead') ? '' : bannerText,
      bannerT: (state === 'paused' || state === 'dead') ? 0 : bannerT,
      muted: G.audio ? G.audio.muted : false, t: G.level.time
    });
    if (state === 'playing') {
      var spread = 4 + (player.switchT > 0 ? 2 : 0) + player.recoil * 1.6;
      G.hud.crosshair(ctx, G.input.mouse, hitMark, hitKill, spread);
    }
    if (state === 'paused') G.hud.pause(ctx);
    if (state === 'dead' && deadT > 0.7) {
      var acc = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0;
      G.hud.gameover(ctx, {
        wave: waveNo, score: score, kills: stats.kills, headshots: stats.headshots,
        accuracy: acc, best: G.hud.best()
      });
    }
  }

  function startGame() {
    if (G.audio) G.audio.init();
    resetGame();
  }

  function resetGame(startWaveAt) {
    setState('playing');
    titleT = 0;
    deadT = 0;
    score = 0;
    hitMark = 0;
    hitKill = false;
    volleyLock = 0;
    stats = { kills: 0, headshots: 0, shots: 0, hits: 0 };
    G.game.stats = stats;
    shots.length = 0;
    zombies.length = 0;
    limbs.length = 0;
    pickups.length = 0;
    G.time.reset();
    G.gfx.cam.reset();
    G.level.reset();
    if (G.particles) G.particles.clear();
    player = new G.entities.Player(300);
    G.game.player = player;
    G.input.mouse.down = false;
    G.input.mouse.clicked = false;
    startWave(startWaveAt || 1);
  }

  function loop(ts) {
    var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0.016;
    last = ts;
    G.time.update(dt);
    if (debug) {
      frames++;
      fpsAcc += dt;
      if (fpsAcc >= 0.5) { fps = Math.round(frames / fpsAcc); frames = 0; fpsAcc = 0; G.game.fps = fps; }
    }

    if (G.input.pressed('KeyM') && G.audio) G.audio.toggleMute();

    if (state === 'title') {
      titleT += dt;
      G.gfx.cam.x = 80 + Math.sin(titleT * 0.12) * 60;
      G.level.update(dt, G.gfx.cam.x);
      if (G.input.mouse.clicked || G.input.pressed('Space') || G.input.pressed('Enter')) startGame();
    } else if (state === 'playing') {
      if (G.input.pressed('Escape')) setState('paused');
      else {
        G.gfx.cam.update(dt);
        G.level.update(G.time.worldDt, G.gfx.cam.x);
        updateWorld(G.time.worldDt, dt);
      }
    } else if (state === 'paused') {
      if (G.input.pressed('Escape')) setState('playing');
    } else if (state === 'dead') {
      deadT += dt;
      G.gfx.cam.update(dt);
      G.level.update(dt, G.gfx.cam.x);
      G.particles.update(dt);
      if (G.input.pressed('KeyR')) resetGame();
      else if (G.input.pressed('Escape')) { setState('title'); titleT = 0; G.gfx.cam.reset(); }
    }

    if (G.audio && player && state !== 'title') G.audio.update(dt, player.hp);

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b1418';
    ctx.fillRect(0, 0, G.W, G.H);
    drawWorld();

    if (dt > 0.026) slowAcc += dt; else slowAcc = Math.max(0, slowAcc - dt * 0.6);
    if (!lowFx && slowAcc > 1.6) {
      lowFx = true;
      G.game.lowFx = true;
      G.particles.setCap(280);
    }

    if (debug) {
      G.sprites.font(fps + ' FPS' + (lowFx ? ' LOWFX' : ''), G.W / 2, 4, '#7fff9f', 1, 'center');
      G.sprites.font('Z ' + zombies.length + ' SHOTS ' + shots.length, G.W / 2, G.H - 8, '#7fff9f', 1, 'center');
    }

    G.input.endFrame();
    requestAnimationFrame(loop);
  }

  G.game = G.game || {};
  G.game.state = 'title';
  G.game.debug = debug;
  G.game.god = god;
  G.game.lowFx = false;

  G.game.boot = function () {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    G.gfx.init(canvas);
    G.input.init(canvas);
    G.level.reset();
    var unlock = function () { if (G.audio) G.audio.init(); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    G.game.zombies = zombies;
    G.game.shots = shots;
    G.game.limbs = limbs;
    G.game.pickups = pickups;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state === 'playing') setState('paused');
    });
    fit();
    window.addEventListener('resize', fit);
    if (waveParam) {
      resetGame(parseInt(waveParam[1], 10) || 1);
    }
    if (hordeDebug || goreDebug) {
      resetGame();
      if (goreDebug) {
        spawnQueue = [];
        waveState = 'fight';
        bannerT = 0;
        var gz = new G.entities.Zombie('walker', player.x + 105, false);
        zombies.push(gz);
        gz.hit('limb', 40, 1, 'shotgun', 'legF');
        G.entities.spawnLimb(limbs, gz, 'legF', gz.x - 3, G.level.layout.groundY - 12, 1, 'limb');
        applyHit(gz, { zone: 'head', ref: 'head' }, {
          x: gz.x, y: G.level.layout.groundY - 34, px: gz.x - 30, py: G.level.layout.groundY - 34,
          angle: 0, damage: 24, weapon: 'shotgun'
        });
        for (var gi = 0; gi < 45; gi++) {
          G.particles.update(1 / 60);
          for (var gl = 0; gl < limbs.length; gl++) limbs[gl].update(1 / 60);
          gz.deathT += 1 / 60;
        }
        gz.flash = 0;
        hitMark = 0;
      } else {
        var types = ['walker', 'walker', 'crawler', 'walker', 'brute', 'crawler', 'walker', 'walker'];
        for (var i = 0; i < types.length; i++) {
          var hx = G.clamp(player.x + (i % 2 === 0 ? 1 : -1) * G.rand(55, 205), 40, G.level.layout.length - 40);
          zombies.push(new G.entities.Zombie(types[i], hx, false));
        }
        spawnQueue = [];
        bannerT = 0;
      }
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
