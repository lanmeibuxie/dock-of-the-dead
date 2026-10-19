/* 码头尸潮 — 主循环与状态 */
(function () {
  'use strict';
  var G = globalThis.G;
  var canvas = null;
  var ctx = null;
  var last = 0;
  var fps = 60, frames = 0, fpsAcc = 0;
  var debug = /[?&]debug=1/.test(location.search);

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
    G.input.init(canvas);
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
