/* 码头尸潮 — HUD、标题、暂停、结算与最高分 */
(function () {
  'use strict';
  var G = globalThis.G;
  var KEY = 'dock-of-the-dead.best';
  var mem = {};
  var injected = null;

  function storage() {
    if (injected) return injected;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('__dock_test', '1');
        localStorage.removeItem('__dock_test');
        return localStorage;
      }
    } catch (e) { /* 隐私模式降级到内存 */ }
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); }
    };
  }

  function formatScore(n) {
    return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function best() {
    var v = parseInt(storage().getItem(KEY), 10);
    return isNaN(v) ? 0 : v;
  }

  function saveBest(n) {
    if (n > best()) storage().setItem(KEY, String(Math.round(n)));
  }

  function font(text, x, y, color, scale, align) {
    G.sprites.font(text, x, y, color, scale, align);
  }

  function crosshair(ctx, m, hitMark, hitKill, hitCrit, spread, spin) {
    var x = Math.round(m.x), y = Math.round(m.y);
    var g = Math.max(3, Math.round(spread || 5));
    ctx.fillStyle = 'rgba(232,227,208,0.88)';
    ctx.fillRect(x - g - 4, y, 4, 1);
    ctx.fillRect(x + g + 1, y, 4, 1);
    ctx.fillRect(x, y - g - 4, 1, 4);
    ctx.fillRect(x, y + g + 1, 1, 4);
    ctx.fillStyle = 'rgba(232,227,208,0.55)';
    ctx.fillRect(x, y, 1, 1);
    if (spin > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 11, y + 10, 22, 4);
      ctx.fillStyle = spin >= 0.999 ? '#ffc46b' : '#8f9d95';
      ctx.fillRect(x - 10, y + 11, Math.round(20 * spin), 2);
    }
    if (hitMark > 0) {
      ctx.strokeStyle = hitKill ? '#ff5252' : hitCrit ? '#ffc46b' : '#fff6e0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 5); ctx.lineTo(x - 2, y - 2);
      ctx.moveTo(x + 5, y - 5); ctx.lineTo(x + 2, y - 2);
      ctx.moveTo(x - 5, y + 5); ctx.lineTo(x - 2, y + 2);
      ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + 2, y + 2);
      ctx.stroke();
    }
  }

  function hitboxes(ctx, cam, zombies, player, state) {
    ctx.strokeStyle = 'rgba(255,70,70,0.55)';
    ctx.lineWidth = 1;
    for (var i = 0; i < zombies.length; i++) {
      if (zombies[i].dead) continue;
      var boxes = zombies[i].hitBoxes();
      for (var b = 0; b < boxes.length; b++) {
        ctx.strokeRect(Math.round(cam.toScreenX(boxes[b].x)) + 0.5, Math.round(cam.toScreenY(boxes[b].y)) + 0.5,
          Math.round(boxes[b].w), Math.round(boxes[b].h));
      }
    }
    if (player && state !== 'title') {
      ctx.strokeRect(Math.round(cam.toScreenX(player.x - 7)) + 0.5, Math.round(cam.toScreenY(player.y - 36)) + 0.5, 14, 36);
    }
  }

  function banner(ctx, text, t) {
    if (t <= 0 || !text) return;
    var a = Math.min(1, t * 1.6);
    ctx.globalAlpha = a;
    var col = text === 'WAVE CLEAR' ? '#7fff9f' : '#e8e3d0';
    font(text, G.W / 2, 54, col, 3, 'center');
    ctx.globalAlpha = 1;
  }

  function draw(ctx, s) {
    var p = s.player;
    var P = G.gfx.palette;
    var lowHp = p.hp < 30 && p.hp > 0;

    if (lowHp || p.hurtT > 0) {
      var a = 0;
      if (lowHp) a = Math.max(a, (0.16 + 0.12 * Math.sin(s.t * 7)) * (1 - p.hp / 30));
      if (p.hurtT > 0) a = Math.max(a, p.hurtT * 0.55);
      ctx.fillStyle = 'rgba(150,12,22,' + a + ')';
      ctx.fillRect(0, 0, G.W, 10);
      ctx.fillRect(0, G.H - 10, G.W, 10);
      ctx.fillRect(0, 0, 8, G.H);
      ctx.fillRect(G.W - 8, 0, 8, G.H);
    }

    font('WAVE ' + s.wave, 6, 6, s.elite ? '#e06a5a' : P.white, 1);
    if (s.elite) font('ELITE WAVE', 6, 14, '#c8393f', 1);
    if (s.muted) font('MUTE', 6, s.elite ? 22 : 14, '#7d8478', 1);
    font('SCORE ' + formatScore(s.score), G.W - 6, 6, '#c9c2a8', 1, 'right');
    font('$ ' + (s.gold || 0), G.W - 6, 16, '#ffc46b', 1, 'right');

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(7, G.H - 18, 86, 9);
    ctx.fillStyle = '#3a1216';
    ctx.fillRect(8, G.H - 17, 84, 7);
    var hpw = Math.max(0, Math.round(84 * p.hp / p.maxHp));
    ctx.fillStyle = lowHp ? '#d33a3a' : '#a8242e';
    ctx.fillRect(8, G.H - 17, hpw, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(8, G.H - 17, hpw, 1);
    font('HP', 9, G.H - 27, '#a8b0a0', 1);

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(7, G.H - 8, 86, 5);
    ctx.fillStyle = '#2a2416';
    ctx.fillRect(8, G.H - 7, 84, 3);
    var fuelW = Math.max(0, Math.round(84 * p.fuel / p.maxFuel));
    ctx.fillStyle = p.fuel < p.maxFuel * 0.25 ? '#d33a3a' : '#e0b23a';
    ctx.fillRect(8, G.H - 7, fuelW, 3);
    font('JET', 95, G.H - 8, '#a8b0a0', 1);

    if (s.boss && !s.boss.dead) {
      G.cnfont.draw(ctx, s.boss.def.bossName, G.W / 2, 17, '#e06a5a', 1, 'center');
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(138, 34, 204, 7);
      ctx.fillStyle = '#3a1216';
      ctx.fillRect(140, 36, 200, 3);
      var bw = Math.max(0, Math.round(200 * s.boss.hp / s.boss.maxHp));
      ctx.fillStyle = '#c8393f';
      ctx.fillRect(140, 36, bw, 3);
    }
    if (s.modifier) {
      G.cnfont.draw(ctx, s.modifier.name, G.W - 6, 26, s.modifier.color, 1, 'right');
    }
    var w = p.weapon();
    font(w.def.name, G.W - 6, G.H - 27, '#a8b0a0', 1, 'right');
    font(w.ammo + ' / ' + (w.reserve === Infinity ? '\u221e' : w.reserve), G.W - 6, G.H - 17,
      w.ammo === 0 ? '#d33a3a' : P.white, 1, 'right');

    var slots = ['pistol', 'shotgun', 'smg', 'minigun', 'launcher'];
    for (var si = 0; si < slots.length; si++) {
      var bx = G.W - 138 + si * 16;
      var active = slots[si] === p.current;
      ctx.fillStyle = active ? 'rgba(120,84,38,0.75)' : 'rgba(0,0,0,0.35)';
      ctx.fillRect(bx, G.H - 40, 12, 9);
      font(String(si + 1), bx + 4, G.H - 38, active ? '#ffc46b' : '#7d8478', 1);
    }

    if (w.reloading) {
      ctx.fillStyle = '#e8e3d0';
      ctx.fillRect(G.W - 66, G.H - 7, 60, 2);
      ctx.fillStyle = '#ffc46b';
      var prog = 1 - w.reloadT / w.def.reload;
      ctx.fillRect(G.W - 66, G.H - 7, Math.round(60 * prog), 2);
    }

    banner(ctx, s.bannerText, s.bannerT);
    if (s.waveState === 'breath' && s.bannerT <= 0) {
      font('NEXT WAVE ' + Math.ceil(s.breathT), G.W / 2, 44, '#c9c2a8', 1, 'center');
    }
    if (s.toastT > 0 && s.toastText) {
      ctx.globalAlpha = Math.min(1, s.toastT);
      G.cnfont.draw(ctx, s.toastText, G.W / 2, 112, '#ffc46b', 2, 'center');
      ctx.globalAlpha = 1;
    }
  }

  function title(ctx, t, bestScore) {
    var P = G.gfx.palette;
    ctx.fillStyle = 'rgba(4,8,12,0.45)';
    ctx.fillRect(0, 0, G.W, G.H);
    var flick = 0.9 + 0.1 * Math.sin(t * 2.1) * Math.sin(t * 5.7);
    ctx.globalAlpha = flick;
    font('DOCK OF THE', G.W / 2, 46, '#cfc7ae', 4, 'center');
    font('DEAD', G.W / 2, 76, '#b8242e', 6, 'center');
    ctx.globalAlpha = 1;
    font('SURVIVE THE NIGHT', G.W / 2, 120, '#6f837d', 1, 'center');

    var cx = G.W / 2;
    ctx.fillStyle = 'rgba(120,10,18,0.5)';
    for (var i = 0; i < 9; i++) {
      var dx = cx - 52 + i * 13;
      var dh = 3 + ((i * 7) % 9);
      ctx.fillRect(dx, 106, 2, dh);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(92, 158, 296, 58);
    font('WASD MOVE    MOUSE AIM    LMB FIRE', G.W / 2, 166, '#9aa89f', 1, 'center');
    font('R RELOAD    Q KICK    1-5 WEAPON', G.W / 2, 180, '#9aa89f', 1, 'center');
    font('M MUTE     ESC PAUSE', G.W / 2, 194, '#9aa89f', 1, 'center');

    var blink = Math.floor(t * 2.2) % 2 === 0;
    if (blink) font('CLICK TO START', G.W / 2, 230, '#ffc46b', 2, 'center');
    if (bestScore > 0) font('BEST ' + formatScore(bestScore), G.W / 2, 252, '#6f7d72', 1, 'center');
  }

  function pause(ctx) {
    ctx.fillStyle = 'rgba(4,8,12,0.68)';
    ctx.fillRect(0, 0, G.W, G.H);
    font('PAUSED', G.W / 2, 88, '#e8e3d0', 4, 'center');
    font('ESC RESUME', G.W / 2, 132, '#ffc46b', 1, 'center');
    font('WASD MOVE   MOUSE AIM   LMB FIRE', G.W / 2, 156, '#8f9d95', 1, 'center');
    font('R RELOAD   Q KICK   1-5 WEAPON   M MUTE', G.W / 2, 170, '#8f9d95', 1, 'center');
  }

  function gameover(ctx, stats) {
    ctx.fillStyle = 'rgba(18,2,4,0.62)';
    ctx.fillRect(0, 0, G.W, G.H);
    font('YOU DIED', G.W / 2, 58, '#b8242e', 5, 'center');
    font('WAVE ' + stats.wave + '    SCORE ' + formatScore(stats.score), G.W / 2, 100, '#e8e3d0', 1, 'center');
    font('KILLS ' + stats.kills + '    HEADSHOTS ' + stats.headshots, G.W / 2, 118, '#c9c2a8', 1, 'center');
    font('ACCURACY ' + stats.accuracy + '%', G.W / 2, 132, '#c9c2a8', 1, 'center');
    font('BEST ' + formatScore(stats.best), G.W / 2, 152, '#ffc46b', 1, 'center');
    font('PRESS R TO RETRY', G.W / 2, 190, '#e8e3d0', 2, 'center');
    font('ESC FOR TITLE', G.W / 2, 214, '#7d8a80', 1, 'center');
  }

  G.hud = {
    formatScore: formatScore,
    formatTime: formatTime,
    best: best,
    saveBest: saveBest,
    useStorage: function (s) { injected = s; },
    crosshair: crosshair,
    hitboxes: hitboxes,
    banner: banner,
    draw: draw,
    title: title,
    pause: pause,
    gameover: gameover
  };
})();
