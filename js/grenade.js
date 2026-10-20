/* 码头尸潮 — 榴弹实体 */
(function () {
  'use strict';
  var G = globalThis.G;

  function Grenade(x, y, angle, damage, radius) {
    var def = G.content.weapons.launcher;
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.vx = Math.cos(angle) * def.projectileSpeed;
    this.vy = Math.sin(angle) * def.projectileSpeed;
    this.damage = damage;
    this.radius = radius || def.blastRadius;
    this.life = def.fuse;
    this.dead = false;
    this.smoke = 0;
  }

  Grenade.prototype.update = function (dt) {
    var L = G.level.layout;
    this.px = this.x;
    this.py = this.y;
    this.vy += G.content.weapons.launcher.projectileGravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.smoke -= dt;
    if (this.smoke <= 0) {
      G.particles.spawnSmoke(this.x, this.y, 1);
      this.smoke = 0.05;
    }
    if (this.y >= L.groundY - 2 || this.x < 8 || this.x > L.length - 8 || this.life <= 0) return true;
    return false;
  };

  Grenade.prototype.hits = function (zombies, birds) {
    var i, boxes, b, t;
    for (i = 0; i < zombies.length; i++) {
      var z = zombies[i];
      if (z.dead) continue;
      boxes = z.hitBoxes();
      for (b = 0; b < boxes.length; b++) {
        t = G.combat.segBoxT(this.px, this.py, this.x, this.y, boxes[b]);
        if (t != null) return true;
      }
    }
    if (birds) {
      for (i = 0; i < birds.length; i++) {
        var bird = birds[i];
        if (bird.dead) continue;
        if (G.combat.segBoxT(this.px, this.py, this.x, this.y, bird.hitBoxes()[0]) != null) return true;
      }
    }
    return false;
  };

  Grenade.prototype.draw = function (ctx) {
    var sx = Math.round(G.gfx.cam.toScreenX(this.x));
    var sy = Math.round(G.gfx.cam.toScreenY(this.y));
    ctx.fillStyle = '#2a2e22';
    ctx.fillRect(sx - 2, sy - 2, 4, 4);
    ctx.fillStyle = '#8a7a3a';
    ctx.fillRect(sx - 2, sy - 2, 4, 1);
    ctx.fillStyle = G.level.time % 0.2 < 0.1 ? '#c5202e' : '#5a1a1a';
    ctx.fillRect(sx - 1, sy - 3, 2, 1);
  };

  G.grenade = { Grenade: Grenade };
})();
