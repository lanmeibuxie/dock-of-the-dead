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

  function drawDebugScene(ctx) {
    var pal = G.gfx.palette;
    var cam = G.gfx.cam;
    G.gfx.clear(pal.night);
    G.gfx.rect(0, 130, G.W, 66, pal.deep);
    G.gfx.rect(0, 196, G.W, G.H - 196, pal.wood);
    var off = -Math.round(cam.x) % 16;
    for (var x = off - 16; x < G.W + 16; x += 16) {
      G.gfx.rect(x, 196, 1, G.H - 196, pal.woodDark);
    }
    for (var wx = 0; wx < 2400; wx += 120) {
      var sx = G.gfx.cam.toScreenX(wx);
      if (sx > -20 && sx < G.W + 20) G.gfx.rect(sx, 150, 4, 46, pal.metalDark);
    }
    var px = G.gfx.cam.toScreenX(sceneX);
    G.gfx.rect(px - 6, 174, 12, 22, pal.cloth);
    G.gfx.rect(px - 5, 164, 10, 10, pal.skin);
    G.gfx.rect(px + 6, 176, 10, 3, pal.metal);
    G.gfx.rect(px + 4, 170, 8, 6, pal.metalDark);
    var m = G.input.mouse;
    G.gfx.rect(m.x - 5, m.y, 11, 1, pal.white);
    G.gfx.rect(m.x, m.y - 5, 1, 11, pal.white);
    ctx.fillStyle = pal.green;
    ctx.font = '8px monospace';
    ctx.fillText('DEBUG SCENE  A/D MOVE', 6, 12);
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
      drawDebugScene(ctx);
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
