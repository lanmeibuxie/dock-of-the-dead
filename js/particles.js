/* 码头尸潮 — 血、骨屑、弹壳、火花、烟（池化粒子） */
(function () {
  'use strict';
  var G = globalThis.G;
  var cap = 600;
  var pool = null;

  function make() {
    return {
      kind: 'blood', x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1, size: 1, color: '#8e1420',
      rot: 0, spin: 0, rest: false, trail: 0, bounced: false, grav: 1
    };
  }

  function init() {
    if (pool) return;
    pool = G.pool(make, 320);
  }

  function get() {
    init();
    if (pool.live.length >= cap) return null;
    var p = pool.get();
    p.rest = false;
    p.bounced = false;
    p.trail = 0;
    p.rot = 0;
    p.spin = 0;
    p.grav = 1;
    return p;
  }

  function release(p) { pool.release(p); }

  function groundY() { return (G.level.layout || G.level.build()).groundY; }

  var bloodColors = ['#8e1420', '#a81a26', '#c5202e', '#5e0d14', '#7a1019'];

  var api = {
    init: init,
    setCap: function (n) { cap = n; },
    count: function () { init(); return pool.live.length; },
    clear: function () { if (pool) pool.clear(); },

    spawnBlood: function (x, y, dir, count) {
      dir = dir || 1;
      for (var i = 0; i < count; i++) {
        var p = get();
        if (!p) return;
        var base = dir > 0 ? 0 : Math.PI;
        var a = base + G.rand(-0.85, 0.85);
        var sp = G.rand(45, 220);
        p.kind = 'blood';
        p.x = x; p.y = y;
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp - G.rand(10, 80);
        p.size = G.randInt(1, 2);
        p.color = G.pick(bloodColors);
        p.life = p.maxLife = G.rand(0.35, 0.9);
      }
    },

    spawnBone: function (x, y, dir, count) {
      for (var i = 0; i < count; i++) {
        var p = get();
        if (!p) return;
        var a = (dir > 0 ? 0 : Math.PI) + G.rand(-1.1, 1.1);
        p.kind = 'bone';
        p.x = x; p.y = y;
        p.vx = Math.cos(a) * G.rand(40, 150);
        p.vy = Math.sin(a) * G.rand(40, 150) - 50;
        p.size = 2;
        p.color = '#d8cfb4';
        p.life = p.maxLife = G.rand(0.7, 1.4);
        p.spin = G.rand(-14, 14);
      }
    },

    spawnGib: function (x, y, dir, count) {
      for (var i = 0; i < count; i++) {
        var p = get();
        if (!p) return;
        var a = (dir > 0 ? 0 : Math.PI) + G.rand(-0.9, 0.9);
        var sp = G.rand(60, 210);
        p.kind = 'gib';
        p.x = x; p.y = y;
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp - G.rand(60, 180);
        p.size = G.randInt(2, 3);
        p.color = G.chance(0.55) ? G.pick(bloodColors) : '#7d8f6b';
        p.life = p.maxLife = G.rand(2.5, 5);
        p.spin = G.rand(-10, 10);
      }
    },

    spawnShell: function (x, y, dir) {
      var p = get();
      if (!p) return;
      p.kind = 'shell';
      p.x = x; p.y = y;
      p.vx = -dir * G.rand(30, 70);
      p.vy = -G.rand(60, 110);
      p.size = 2;
      p.color = '#c9a227';
      p.life = p.maxLife = 2.4;
      p.spin = G.rand(-20, 20);
      p.grav = 0.85;
    },

    spawnSparks: function (x, y, dir, count) {
      for (var i = 0; i < count; i++) {
        var p = get();
        if (!p) return;
        p.kind = 'spark';
        p.x = x; p.y = y;
        p.vx = G.rand(-160, 160) + dir * 40;
        p.vy = G.rand(-120, 80);
        p.size = 1;
        p.color = G.pick(['#ffd166', '#ff9e3d', '#fff2b0']);
        p.life = p.maxLife = G.rand(0.12, 0.3);
      }
    },

    spawnSmoke: function (x, y, count) {
      for (var i = 0; i < count; i++) {
        var p = get();
        if (!p) return;
        p.kind = 'smoke';
        p.x = x + G.rand(-3, 3); p.y = y + G.rand(-3, 3);
        p.vx = G.rand(-18, 18);
        p.vy = G.rand(-38, -12);
        p.size = G.randInt(2, 3);
        p.color = '#9aa5a0';
        p.life = p.maxLife = G.rand(0.35, 0.8);
        p.grav = 0;
      }
    },

    spawnFeather: function (x, y, dir, count) {
      for (var i = 0; i < count; i++) {
        var p = get();
        if (!p) return;
        p.kind = 'feather';
        p.x = x; p.y = y;
        p.vx = G.rand(-60, 60) + (dir || 0) * 30;
        p.vy = G.rand(-70, 20);
        p.size = 2;
        p.color = G.pick(['#5d6b5d', '#8a9782', '#c8bca0']);
        p.life = p.maxLife = G.rand(0.5, 1.2);
        p.spin = G.rand(-12, 12);
      }
    },

    spawnSplash: function (x, y, count) {
      for (var i = 0; i < count; i++) {
        var p = get();
        if (!p) return;
        p.kind = 'splash';
        p.x = x; p.y = y;
        p.vx = G.rand(-70, 70);
        p.vy = -G.rand(70, 190);
        p.size = 1;
        p.color = G.pick(['#7fb3b0', '#a8d6d0', '#4f7d7c']);
        p.life = p.maxLife = G.rand(0.4, 0.9);
        p.grav = 1;
      }
    },

    update: function (dt) {
      init();
      var gy = groundY();
      var list = pool.live;
      for (var i = list.length - 1; i >= 0; i--) {
        var p = list[i];
        p.life -= dt;
        if (p.life <= 0) { release(p); continue; }

        if (p.kind === 'smoke') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          continue;
        }
        if (p.kind === 'spark') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 500 * dt;
          continue;
        }

        p.vy += 520 * p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.kind === 'blood' || p.kind === 'gib') {
          if (p.y >= gy) {
            if (p.kind === 'gib' && !p.bounced) {
              p.y = gy;
              p.vy *= -0.32;
              p.vx *= 0.6;
              p.bounced = true;
            } else {
              if (G.chance(0.55)) G.level.addBlood(p.x, gy + G.rand(1, 7), p.size * 2, p.vx > 0 ? 1 : -1);
              release(p);
              continue;
            }
          }
          if (p.kind === 'gib') {
            p.trail -= dt;
            if (p.trail <= 0 && Math.abs(p.vx) + Math.abs(p.vy) > 40) {
              G.level.addBlood(p.x, Math.max(gy, p.y), 3, p.vx > 0 ? 1 : -1);
              p.trail = 0.1;
            }
          }
        } else if (p.kind === 'shell') {
          if (p.y >= gy) {
            p.y = gy;
            p.vy *= -0.35;
            p.vx *= 0.7;
            p.grav = 0;
            if (Math.abs(p.vy) < 20) p.vy = 0;
          }
        } else if (p.kind === 'bone') {
          if (p.y >= gy) {
            p.y = gy;
            p.vy *= -0.3;
            p.vx *= 0.5;
          }
        } else if (p.kind === 'splash') {
          if (p.y >= gy + 14) { release(p); continue; }
        } else if (p.kind === 'feather') {
          p.vy += 160 * dt;
          p.vy *= 0.995;
          if (p.y >= gy) { release(p); continue; }
        }
      }
    },

    draw: function (ctx) {
      if (!pool) return;
      var list = pool.live;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var a = 1;
        if (p.kind === 'smoke') a = Math.max(0, p.life / p.maxLife) * 0.3;
        else if (p.kind === 'shell' && p.life < 0.5) a = p.life / 0.5;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        var sx = Math.round(G.gfx.cam.toScreenX(p.x));
        var sy = Math.round(G.gfx.cam.toScreenY(p.y));
        if (p.kind === 'gib') {
          ctx.fillRect(sx, sy, p.size + 1, p.size);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(sx, sy + p.size - 1, p.size + 1, 1);
        } else if (p.kind === 'bone') {
          ctx.fillRect(sx, sy, 2, 1);
        } else if (p.kind === 'shell') {
          ctx.fillRect(sx, sy, 2, 1);
        } else if (p.kind === 'smoke') {
          ctx.fillRect(sx, sy, p.size, p.size);
        } else if (p.kind === 'spark') {
          ctx.fillRect(sx, sy, 1, 1);
        } else if (p.kind === 'splash') {
          ctx.fillRect(sx, sy, 1, 1);
        } else if (p.kind === 'feather') {
          ctx.fillRect(sx, sy, 2, 1);
        } else {
          ctx.fillRect(sx, sy, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;
    }
  };

  G.particles = api;
})();
