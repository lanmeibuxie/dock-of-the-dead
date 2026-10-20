/* 码头尸潮 — Boss 场地危险：冲击波、落箱、酸液 */
(function () {
  'use strict';
  var G = globalThis.G;
  var list = [];

  function reset() { list.length = 0; }

  function spawnShockwave(x, dir) {
    list.push({ type: 'wave', x: x, y: 0, dir: dir, life: 1.3, hit: false, phase: 0 });
  }

  function spawnCrate(x) {
    list.push({ type: 'crate', x: x, y: 24, vy: 0, life: 2.4, hit: false });
  }

  function spawnAcid(x, y, angle) {
    list.push({
      type: 'acid', x: x, y: y,
      vx: Math.cos(angle) * 250, vy: Math.sin(angle) * 250 - 60,
      life: 2.5, hit: false
    });
  }

  function puddle(x) {
    list.push({ type: 'puddle', x: x, y: G.level.layout.groundY, life: 4.5, tick: 0, r: 20 });
  }

  function update(dt, ctx) {
    var gy = ctx.level.layout.groundY;
    var player = ctx.player;
    for (var i = list.length - 1; i >= 0; i--) {
      var h = list[i];
      h.life -= dt;
      if (h.life <= 0) { list.splice(i, 1); continue; }

      if (h.type === 'wave') {
        h.x += h.dir * 250 * dt;
        h.phase += dt * 14;
        if (!h.hit && Math.abs(player.x - h.x) < 15 && player.y > gy - 34) {
          h.hit = true;
          if (player.takeDamage(18, h.dir)) {
            ctx.cam.shake(1.2);
            ctx.particles.spawnBlood(player.x, player.y - 20, h.dir, 8);
          }
        }
        if (h.x < 0 || h.x > ctx.level.layout.length) list.splice(i, 1);
      } else if (h.type === 'crate') {
        h.vy += 620 * dt;
        h.y += h.vy * dt;
        if (h.y >= gy - 26) {
          G.boom.blastAt(h.x, gy - 20, ctx, { radius: 38, damage: 24, self: true, chain: false });
          list.splice(i, 1);
        }
      } else if (h.type === 'acid') {
        h.vy += 600 * dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (Math.abs(player.x - h.x) < 14 && Math.abs(player.y - 22 - h.y) < 18) {
          if (player.takeDamage(10, h.x < player.x ? 1 : -1)) {
            ctx.particles.spawnBlood(player.x, player.y - 20, 1, 5);
            ctx.cam.shake(0.6);
          }
          puddle(h.x);
          list.splice(i, 1);
        } else if (h.y >= gy - 2) {
          puddle(h.x);
          list.splice(i, 1);
        }
      } else if (h.type === 'puddle') {
        h.tick -= dt;
        if (h.tick <= 0 && Math.abs(player.x - h.x) < h.r && player.y > gy - 6) {
          h.tick = 0.5;
          if (player.takeDamage(6, player.x < h.x ? -1 : 1)) {
            ctx.particles.spawnBlood(player.x, player.y - 18, 1, 3);
            ctx.cam.shake(0.4);
          }
        }
      }
    }
  }

  function draw(ctx) {
    var cam = G.gfx.cam;
    var gy = G.level.layout.groundY;
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      var sx = Math.round(cam.toScreenX(h.x));
      if (h.type === 'wave') {
        var sy = cam.toScreenY(gy);
        ctx.fillStyle = 'rgba(200,190,150,0.25)';
        ctx.fillRect(sx - 8, sy - 18, 16, 18);
        ctx.fillStyle = 'rgba(230,220,180,0.35)';
        ctx.fillRect(sx - 2, sy - 22 - Math.sin(h.phase) * 3, 4, 10);
      } else if (h.type === 'crate') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(Math.round(cam.toScreenX(h.x)) - 9, cam.toScreenY(gy) - 3, 18, 3);
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(sx - 9, Math.round(cam.toScreenY(h.y)) - 9, 18, 18);
        ctx.strokeStyle = '#2e2018';
        ctx.strokeRect(sx - 9.5, Math.round(cam.toScreenY(h.y)) - 9.5, 19, 19);
      } else if (h.type === 'acid') {
        ctx.fillStyle = '#7acb4a';
        ctx.fillRect(sx - 2, Math.round(cam.toScreenY(h.y)) - 2, 4, 4);
      } else if (h.type === 'puddle') {
        ctx.fillStyle = 'rgba(90,190,70,' + (0.25 + 0.2 * Math.sin(G.level.time * 8)) + ')';
        ctx.beginPath();
        ctx.ellipse(sx, cam.toScreenY(gy) + 1, h.r, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  G.hazards = {
    reset: reset,
    update: update,
    draw: draw,
    spawnShockwave: spawnShockwave,
    spawnCrate: spawnCrate,
    spawnAcid: spawnAcid
  };
})();
