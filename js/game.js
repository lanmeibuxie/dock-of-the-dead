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
  var hordeParam = /[?&]horde=(\d+)/.exec(location.search);
  var slowAcc = 0;
  var lowFx = false;

  var state = 'title', titleT = 0, deadT = 0;
  var player = null;
  var shots = [];
  var zombies = [];
  var limbs = [];
  var booms = [];
  var birds = [], grenades = [];
  var frameNo = 0;
  var pickups = [];
  var score = 0;
  var hitMark = 0;
  var hitKill = false;
  var hitCrit = false;
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
    if (fired.grenade) {
      grenades.push(new G.grenade.Grenade(fired.x, fired.y, fired.angle, fired.damage, fired.radius));
      stats.shots++;
      G.gfx.cam.shake(0.5);
      if (G.audio) { G.audio.shot('launcher'); G.audio.shell(); }
      player.flash = 0.08;
      return;
    }
    for (var i = 0; i < fired.angles.length; i++) {
      shots.push(new G.entities.Shot(fired.x, fired.y, fired.angles[i], fired.damage, fired.weapon, fired.knock, {
        crit: fired.crits[i], pierce: fired.pierce, knockScale: fired.knockScale
      }));
    }
    stats.shots += fired.angles.length;
    G.gfx.cam.shake(fired.weapon === 'shotgun' ? 1.2 : fired.weapon === 'smg' ? 0.4 : fired.weapon === 'minigun' ? 0.2 : 0.5);
    if (G.audio) { G.audio.shot(fired.weapon); G.audio.shell(); }
    var pp = player.points();
    G.particles.spawnShell(pp.handX, pp.handY - 2, player.facing);
    G.particles.spawnSparks(pp.muzzleX, pp.muzzleY, player.facing, fired.weapon === 'shotgun' ? 5 : 2);
    if (fired.weapon === 'shotgun') G.particles.spawnSmoke(pp.muzzleX, pp.muzzleY, 4);
  }

  function queueBoom(z) { G.boom.queue(booms, z); }

  var hitCtx = {
    player: null, zombies: zombies, birds: birds, particles: G.particles, level: G.level,
    limbs: limbs, cam: G.gfx.cam, time: G.time, audio: G.audio, stats: null, elite: false,
    onHit: function (kill, crit) { hitMark = 0.1; hitKill = kill; hitCrit = crit; },
    addScore: function (n) { score += n; },
    spawnLoot: function (x, kind) { G.director.spawnLoot(x, kind); }, queueBoom: queueBoom
  };

  var boomCtx = {
    player: null, zombies: zombies, birds: birds, particles: G.particles, cam: G.gfx.cam,
    time: G.time, level: G.level, audio: G.audio, stats: null, elite: false,
    addScore: function (n) { score += n; }, queueBoom: queueBoom
  };

  function explodeBomber(z) {
    G.boom.explode(z, {
      player: player, zombies: zombies, particles: G.particles, cam: G.gfx.cam,
      time: G.time, level: G.level, audio: G.audio, queueBoom: queueBoom
    });
  }

  function die() {
    if (state === 'dead') return;
    setState('dead');
    deadT = 0;
    G.hud.saveBest(score);
    player.hp = 0;
    G.time.slowmo(0.9, 0.3);
    G.particles.spawnBlood(player.x, player.y - 22, player.facing, 30);
    G.gfx.cam.shake(2.5);
    if (G.audio) { G.audio.jetpack(false); G.audio.thunder(); }
  }

  function updateWorld(dt, realDt) {
    hitCtx.elite = G.director.elite; boomCtx.elite = G.director.elite;
    var sm = G.director.modifier && G.director.modifier.id === 'bloodMoon' ? 1.5 : 1;
    hitCtx.scoreMult = sm; boomCtx.scoreMult = sm;
    if (state === 'dead') { deadT += realDt; return; }
    player.update(dt);
    if (player.kickRequested) {
      player.kickRequested = false;
      kick();
    }
    if (G.input.mouse.down || G.input.mouse.clicked) shoot();

    for (var s = shots.length - 1; s >= 0; s--) {
      shots[s].update(dt);
      if (!shots[s].dead) G.hits.resolve(shots[s], hitCtx);
      if (shots[s].dead) shots.splice(s, 1);
    }
    G.boom.update(booms, dt, boomCtx);
    G.hazards.update(dt, boomCtx);
    for (var g = grenades.length - 1; g >= 0; g--) {
      var gr = grenades[g];
      if (gr.update(dt) || gr.hits(zombies, birds)) {
        G.boom.blastAt(gr.x, gr.y, boomCtx, { radius: gr.radius, damage: gr.damage, self: true });
        grenades.splice(g, 1);
      }
    }
    for (var bd = birds.length - 1; bd >= 0; bd--) {
      birds[bd].update(dt, player);
      if (birds[bd].dead && birds[bd].deathT > 15) birds.splice(bd, 1);
    }
    frameNo++;
    for (var z = zombies.length - 1; z >= 0; z--) {
      var zz = zombies[z];
      var far = Math.abs(zz.x - player.x) > G.W * 0.45;
      if (!far || (frameNo + z) % 4 === 0) zz.update(far ? dt * 4 : dt, player);
      if (zz.dead && zz.deathT > 22) zombies.splice(z, 1);
    }
    for (var zc = 0; zc < zombies.length; zc++) zombies[zc].x = G.clamp(zombies[zc].x, 20, G.level.layout.length - 20);
    zombies.sort(function (a, b) { return a.x - b.x; });
    for (var a = 0; a < zombies.length; a++) {
      if (zombies[a].dead) continue;
      for (var b = a + 1; b < zombies.length; b++) {
        var sep = zombies[b].x - zombies[a].x;
        if (sep >= 12) break;
        if (zombies[b].dead || Math.abs(zombies[a].yOff - zombies[b].yOff) >= 8) continue;
        var push = (12 - Math.abs(sep)) * 0.5 * (sep >= 0 ? 1 : -1);
        zombies[a].x -= push;
        zombies[b].x += push;
      }
    }
    var deadCount = 0;
    for (var dc = 0; dc < zombies.length; dc++) if (zombies[dc].dead) deadCount++;
    if (deadCount > 30) {
      var old = [];
      for (var d2 = 0; d2 < zombies.length; d2++) if (zombies[d2].dead) old.push(zombies[d2]);
      old.sort(function (a, b) { return b.deathT - a.deathT; });
      for (var d3 = 30; d3 < old.length; d3++) {
        var idx = zombies.indexOf(old[d3]);
        if (idx >= 0) zombies.splice(idx, 1);
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
    G.hits.update(realDt);
    hitMark = Math.max(0, hitMark - realDt);
    G.director.update(dt, booms.length);
    if (player.hp <= 0) die();
    G.gfx.cam.follow(player.x, G.H / 2, dt, { minX: 0, maxX: G.level.layout.length });
  }

  function drawWorld() {
    G.render.drawWorld(ctx, {
      state: state, player: player, zombies: zombies, shots: shots, limbs: limbs,
      pickups: pickups, cam: G.gfx.cam, particles: G.particles, debug: debug,
      birds: birds, grenades: grenades,
      titleT: titleT, deadT: deadT, stats: stats, waveNo: G.director.waveNo, elite: G.director.elite, score: score,
      waveState: G.director.waveState, breathT: G.director.breathT, bannerText: G.director.bannerText, bannerT: G.director.bannerT,
      hitMark: hitMark, hitKill: hitKill, hitCrit: hitCrit, toastText: G.director.toastText, toastT: G.director.toastT,
      upgradeCards: G.director.cards, upgradeLevels: G.director.levels, upgradeHover: G.director.hover, upgradeSelected: G.director.selected, upgradeRerolls: G.director.rerolls, boss: G.director.bossRef, modifier: G.director.modifier,
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
    stats = { kills: 0, headshots: 0, shots: 0, hits: 0 };
    G.game.stats = stats;
    hitCtx.stats = stats;
    boomCtx.stats = stats;
    shots.length = 0;
    zombies.length = 0;
    limbs.length = 0;
    pickups.length = 0;
    booms.length = 0;
    G.hazards.reset();
    G.boom.reset();
    birds.length = 0;
    grenades.length = 0;
    G.time.reset();
    G.gfx.cam.reset();
    G.level.reset();
    if (G.particles) G.particles.clear();
    player = new G.entities.Player(300);
    G.game.player = player;
    hitCtx.player = player;
    boomCtx.player = player;
    G.input.mouse.down = false;
    G.input.mouse.clicked = false;
    G.director.reset(startWaveAt || 1);
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
      G.director.inputUpgrade(G.input);
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
  G.game.state = 'title'; G.game.debug = debug; G.game.setState = setState;
  G.game.upgradeState = function () { return { state: state, selected: G.director.selected, hover: G.director.hover, cards: G.director.cards.length }; };
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
    G.game.zombies = zombies; G.game.shots = shots; G.game.limbs = limbs; G.game.pickups = pickups;
    G.game.birds = birds; G.game.grenades = grenades;
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
      G.director.spawnQueue = [];
      zombies.length = 0;
      G.director.waveState = 'fight';
      G.director.bannerT = 0;
      G.director.openUpgrade();
    }
    if (hordeDebug) {
      if (!waveParam) resetGame();
      G.debug.horde(zombies, player, hordeParam ? parseInt(hordeParam[1], 10) : 0);
      for (var hb = 0; hb < 5; hb++) G.director.spawnBird();
      G.director.spawnQueue = [];
      G.director.waveState = 'fight';
      G.director.bannerT = 0;
      G.director.bossWave = false;
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
