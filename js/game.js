/* 码头尸潮 — 主循环与状态 */
(function () {
  'use strict';
  var G = globalThis.G;
  var canvas = null;
  var ctx = null;
  var last = 0;
  var fps = 60, frames = 0, fpsAcc = 0;
  var debug = /[?&]debug=1/.test(location.search);
  var debugScene = /[?&]debug=scene/.test(location.search);
  var sceneX = 300;
  var walkPhase = 0;

  function drawDebugScene(ctx, dt) {
    var pal = G.gfx.palette;
    var cam = G.gfx.cam;
    G.level.update(G.time.worldDt, cam.x);
    ctx.fillStyle = pal.night;
    ctx.fillRect(0, 0, G.W, G.H);
    G.level.drawBg(ctx, cam.x);
    G.level.drawDeck(ctx, cam.x);

    var gy = G.level.layout.groundY;
    var mx = (G.input.down('KeyD') ? 1 : 0) - (G.input.down('KeyA') ? 1 : 0);
    if (mx !== 0) walkPhase += G.time.worldDt * 11;
    var px = Math.round(G.gfx.cam.toScreenX(sceneX));
    var py = gy;
    var m = G.input.mouse;
    var aim = Math.atan2(m.y - (py - 24), m.x - px);
    var swing = mx !== 0 ? Math.sin(walkPhase) * 0.55 : 0;
    var pose = {
      aim: aim, facing: Math.cos(aim) >= 0 ? 1 : -1,
      armF: aim, armB: aim + 0.22,
      legF: swing + 0.05, legB: -swing + 0.05,
      gun: 'pistol', flash: 0,
      bob: mx !== 0 ? Math.round(Math.abs(Math.sin(walkPhase)) * -1) : 0
    };
    G.sprites.drawRig(ctx, G.sprites.playerRig, pose, px, py);

    G.level.drawLighting(ctx, cam.x, [{ x: px, y: py - 18, r: 95 }]);
    G.level.drawWeather(ctx, cam.x);

    G.sprites.font('DEBUG SCENE  A/D MOVE', 6, 8, pal.green, 1);
  }

  function fit() {
    var s = Math.max(1, Math.floor(Math.min(window.innerWidth / G.W, window.innerHeight / G.H)));
    canvas.style.width = (G.W * s) + 'px';
    canvas.style.height = (G.H * s) + 'px';
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

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b1418';
    ctx.fillRect(0, 0, G.W, G.H);

    G.gfx.cam.update(dt);
    if (debugScene) {
      sceneX += ((G.input.down('KeyD') ? 1 : 0) - (G.input.down('KeyA') ? 1 : 0)) * 90 * G.time.worldDt;
      G.gfx.cam.follow(sceneX, 100, dt, { minX: 0, maxX: 2400 });
      drawDebugScene(ctx, dt);
    }

    if (G.game.update) G.game.update(G.time.worldDt, dt);
    if (G.game.draw) G.game.draw(ctx);

    if (debug) {
      ctx.fillStyle = '#7fff9f';
      ctx.font = '8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(fps + ' FPS', G.W - 4, 10);
      ctx.textAlign = 'left';
    }

    G.input.endFrame();
    requestAnimationFrame(loop);
  }

  G.game = G.game || {};
  G.game.state = 'title';
  G.game.debug = debug;

  G.game.boot = function () {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    G.gfx.init(canvas);
    G.input.init(canvas);
    G.level.reset();
    if (debugScene) { G.gfx.cam.x = 60; }
    fit();
    window.addEventListener('resize', fit);
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
