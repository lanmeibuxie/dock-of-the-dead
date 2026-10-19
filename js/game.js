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
  var upgradeDebug = /[?&]debug=upgrade/.test(location.search);
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
  var booms = [];
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
  var hitCrit = false;
  var upgradeCards = [];
  var upgradeLevels = {};
  var upgradeHover = -1;
  var toastText = '';
  var toastT = 0;
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
    if (player.current === 'minigun') return 'ammo_minigun';
    if (player.current === 'pistol') return G.chance(0.5) ? 'ammo_pistol' : 'ammo_shotgun';
    return 'ammo_shotgun';
  }

  function spawnLoot(x) {
    var L = G.level.layout;
    pickups.push(new G.entities.Pickup(lootKind(), G.clamp(x, 30, L.length - 30)));
  }

  function openUpgrade() {
    upgradeCards = G.upgrades.roll(waveNo, Math.random, upgradeLevels);
    upgradeHover = -1;
    if (!upgradeCards.length) { waveState = 'breath'; breathT = 4; return; }
    setState('upgrade');
    waveState = 'upgrade';
    bannerT = 0;
    spawnLoot(player.x - 55);
    spawnLoot(player.x + 65);
    if (G.audio) G.audio.foghorn();
  }

  function pickUpgrade(i) {
    var card = upgradeCards[i];
    if (!card) return;
    if (!G.upgrades.apply(player, card, upgradeLevels)) return;
    upgradeCards = [];
    setState('playing');
    waveState = 'breath';
    breathT = 4;
    toastText = '获得：' + card.name;
    toastT = 1.8;
    if (G.audio) G.audio.pickup();
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
    var sc = G.waves.scale(waveNo);
    z.maxHp = Math.round(z.maxHp * sc.hp * (elite ? 1.25 : 1));
    z.hp = z.maxHp;
    z.damage *= sc.damage;
    z.speed *= sc.speed;
    zombies.push(z);
    spawned++;
    if (G.audio && G.chance(0.4)) G.audio.groan(G.clamp((x - player.x) / 220, -1, 1));
  }

  function kick() {
    G.melee.kick(player, zombies, {
      cam: G.gfx.cam, particles: G.particles, audio: G.audio, time: G.time,
      onHit: function () { hitMark = 0.1; hitKill = false; }
    });
  }

  function shoot() {
    if (state !== 'playing') return;
    var fired = player.fire();
    if (!fired) return;
    for (var i = 0; i < fired.angles.length; i++) {
      shots.push(new G.entities.Shot(fired.x, fired.y, fired.angles[i], fired.damage, fired.weapon, fired.knock, {
        crit: fired.crits[i], pierce: fired.pierce, knockScale: fired.knockScale
      }));
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
    var res = G.combat.resolve({ damage: shot.damage * (shot.crit ? player.mods.critMult : 1), zone: box.zone });
    var hx = shot.x, hy = shot.y;
    var out = z.hit(box.zone, res.amount, dir, shot.weapon, box.ref, shot.knockScale);
    var gy = G.level.layout.groundY;

    if (volleyLock <= 0) {
      G.time.hitstop(G.combat.hitstop(shot.weapon, res.headshot));
      volleyLock = 0.07;
    }
    G.gfx.cam.shake(G.combat.shake(shot.weapon, res.headshot));
    if (G.audio) G.audio.flesh(res.headshot, G.clamp((z.x - player.x) / 220, -1, 1));
    hitMark = 0.1;
    hitKill = out.killed;
    hitCrit = !!shot.crit;
    if (shot.crit) {
      G.particles.spawnSparks(hx, hy, dir, 5);
      G.gfx.cam.shake(1.2);
    }

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
      if (player.mods.lifesteal) player.heal(player.mods.lifesteal);
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

  function queueBoom(z) { G.boom.queue(booms, z); }

  function explodeBomber(z) {
    G.boom.explode(z, {
      player: player, zombies: zombies, particles: G.particles, cam: G.gfx.cam,
      time: G.time, level: G.level, audio: G.audio, queueBoom: queueBoom
    });
  }

  function resolveShot(shot) {
    var best = null;
    for (var i = 0; i < zombies.length; i++) {
      var z = zombies[i];
      if (z.dead || shot.hitList.indexOf(z) >= 0) continue;
      var boxes = z.hitBoxes();
      for (var b = 0; b < boxes.length; b++) {
        var t = G.combat.segBoxT(shot.px, shot.py, shot.x, shot.y, boxes[b]);
        if (t != null && (!best || t < best.t)) best = { z: z, box: boxes[b], t: t };
      }
    }
    if (!best) return;
    shot.x = shot.px + (shot.x - shot.px) * best.t;
    shot.y = shot.py + (shot.y - shot.py) * best.t;
    shot.hitList.push(best.z);
    if (shot.pierce > 0) shot.pierce--;
    else shot.dead = true;
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
        if (!alive && booms.length === 0) openUpgrade();
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
    if (state === 'dead') { deadT += realDt; toastT = Math.max(0, toastT - realDt); return; }
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
    G.boom.update(booms, dt, {
      player: player, zombies: zombies, particles: G.particles, cam: G.gfx.cam,
      time: G.time, level: G.level, audio: G.audio, queueBoom: queueBoom
    });
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
    toastT = Math.max(0, toastT - realDt);
    G.particles.update(realDt);
    hitMark = Math.max(0, hitMark - realDt);
    volleyLock = Math.max(0, volleyLock - realDt);
    updateWaves(dt);
    if (player.hp <= 0) die();
    bannerT = Math.max(0, bannerT - dt);
    G.gfx.cam.follow(player.x, G.H / 2, dt, { minX: 0, maxX: G.level.layout.length });
  }

  function drawWorld() {
    G.render.drawWorld(ctx, {
      state: state, player: player, zombies: zombies, shots: shots, limbs: limbs,
      pickups: pickups, cam: G.gfx.cam, particles: G.particles, debug: debug,
      titleT: titleT, deadT: deadT, stats: stats, waveNo: waveNo, elite: elite, score: score,
      waveState: waveState, breathT: breathT, bannerText: bannerText, bannerT: bannerT,
      hitMark: hitMark, hitKill: hitKill, hitCrit: hitCrit, toastText: toastText, toastT: toastT,
      upgradeCards: upgradeCards, upgradeLevels: upgradeLevels, upgradeHover: upgradeHover,
      mouse: G.input.mouse, muted: G.audio ? G.audio.muted : false
    });
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
    booms.length = 0;
    upgradeCards = [];
    upgradeLevels = {};
    upgradeHover = -1;
    toastText = '';
    toastT = 0;
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
    } else if (state === 'upgrade') {
      G.gfx.cam.update(dt);
      G.level.update(dt, G.gfx.cam.x);
      G.particles.update(dt);
      var rects = G.upgradeui.CARD_RECTS;
      upgradeHover = -1;
      for (var ui = 0; ui < rects.length; ui++) {
        var ur = rects[ui];
        if (G.input.mouse.x >= ur.x && G.input.mouse.x <= ur.x + ur.w &&
            G.input.mouse.y >= ur.y && G.input.mouse.y <= ur.y + ur.h) upgradeHover = ui;
      }
      if (G.input.mouse.clicked && upgradeHover >= 0) pickUpgrade(upgradeHover);
      if (G.input.pressed('Digit1')) pickUpgrade(0);
      if (G.input.pressed('Digit2')) pickUpgrade(1);
      if (G.input.pressed('Digit3')) pickUpgrade(2);
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
  G.game.queueBoom = queueBoom; G.game.explodeBomber = explodeBomber;
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
    G.game.zombies = zombies; G.game.shots = shots;
    G.game.limbs = limbs; G.game.pickups = pickups;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state === 'playing') setState('paused');
    });
    fit();
    window.addEventListener('resize', fit);
    if (waveParam) {
      resetGame(parseInt(waveParam[1], 10) || 1);
    }
    if (upgradeDebug) {
      resetGame(1);
      spawnQueue = [];
      zombies.length = 0;
      waveState = 'fight';
      bannerT = 0;
      openUpgrade();
    }
    if (hordeDebug) {
      resetGame();
      G.debug.horde(zombies, player);
      spawnQueue = [];
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
