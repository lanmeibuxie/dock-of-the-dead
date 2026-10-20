/* 码头尸潮 — 被感染的鸟群 */
(function () {
  'use strict';
  var G = globalThis.G;

  var PAL = { b: '#5d6b5d', w: '#43524a', e: '#c5202e', k: '#c9a23a', d: '#2e3a34', r: '#7a1a22' };
  var frameA = [
    '..bbbbbb..',
    '.bbbbbbbb.',
    'wbbebbbebb',
    'wbbbbbbbbw',
    '.wwbbbbww.',
    '...kkkk...',
    '....kk....',
    '..........'
  ];
  var frameB = [
    '..bbbbbb..',
    '.bbbbbbbb.',
    'wbbebbbebb',
    '.bbbbbbbb.',
    '..wwbbww..',
    '...kkkk...',
    '....kk....',
    '..........'
  ];
  function part(art) { return { art: art, pal: PAL, pivot: [5, 4], scale: 1, img: null }; }
  var frames = [part(frameA), part(frameB)];

  function Bird(x, y, damageScale) {
    var def = G.content.birds.bird;
    this.def = def;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = -10;
    this.hp = def.hp;
    this.damage = def.damage * (damageScale || 1);
    this.state = 'circle';
    this.t = G.rand(0, 6);
    this.diveCd = G.rand(0.6, 1.8);
    this.diveT = 0;
    this.climbT = 0;
    this.hitDone = false;
    this.dead = false;
    this.flash = 0;
    this.deathT = 0;
  }

  Bird.prototype.hitBoxes = function () {
    return [{ zone: 'torso', ref: 'torso', x: this.x - 8, y: this.y - 6, w: 16, h: 12 }];
  };

  Bird.prototype.hit = function (damage, dirX) {
    if (this.dead) return { killed: false };
    this.hp -= damage;
    this.flash = 0.06;
    if (this.hp <= 0) {
      this.dead = true;
      this.vx = (dirX || 1) * 40;
      this.vy = -60;
      this.deathT = 0;
      return { killed: true };
    }
    return { killed: false };
  };

  Bird.prototype.update = function (dt, player) {
    this.flash = Math.max(0, this.flash - dt);
    if (this.dead) {
      this.deathT += dt;
      this.vy += 620 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      var gy = G.level.layout.groundY;
      if (this.y >= gy - 3) { this.y = gy - 3; this.vy = 0; this.vx = 0; }
      return;
    }
    this.t += dt;
    this.diveCd = Math.max(0, this.diveCd - dt);
    var dx = player.x - this.x;
    var dy = (player.y - 22) - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (this.state === 'circle') {
      var tx = player.x + Math.sin(this.t * 1.6) * 38;
      var ty = Math.max(40, player.y - 62);
      var ax = tx - this.x, ay = ty - this.y;
      var ad = Math.sqrt(ax * ax + ay * ay) || 1;
      this.vx = ax / ad * 90;
      this.vy = ay / ad * 90 + Math.sin(this.t * 6) * 12;
      if (dist < 62 && this.diveCd <= 0) { this.state = 'aim'; this.diveT = 0.14; }
    } else if (this.state === 'aim') {
      this.diveT -= dt;
      this.vx *= 0.9;
      this.vy *= 0.9;
      if (this.diveT <= 0) { this.state = 'dive'; this.diveT = 0.6; this.hitDone = false; }
    } else if (this.state === 'dive') {
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      this.vx = dx / d * this.def.diveSpeed;
      this.vy = dy / d * this.def.diveSpeed;
      this.diveT -= dt;
      if (this.diveT <= 0) { this.state = 'climb'; this.climbT = 0.45; }
    } else if (this.state === 'climb') {
      this.vy -= 500 * dt;
      this.vx *= 0.96;
      this.climbT -= dt;
      if (this.climbT <= 0) { this.state = 'circle'; this.diveCd = 1.1; }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.y = G.clamp(this.y, 22, G.level.layout.groundY - 18);

    if (!this.hitDone && Math.abs(player.x - this.x) < 19 && Math.abs((player.y - 22) - this.y) < 24) {
      this.hitDone = true;
      if (player.takeDamage(this.damage, this.x < player.x ? 1 : -1)) {
        G.gfx.cam.shake(0.8);
        G.particles.spawnBlood(player.x, player.y - 22, 1, 5);
        this.state = 'climb';
        this.climbT = 0.5;
      }
    }
  };

  Bird.prototype.draw = function (ctx) {
    var sx = Math.round(G.gfx.cam.toScreenX(this.x));
    var sy = Math.round(G.gfx.cam.toScreenY(this.y));
    var f = frames[Math.floor(G.level.time * 16) % 2];
    var img = G.sprites.makePart(f);
    ctx.save();
    if (this.vx < 0) {
      ctx.translate(sx, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -img.width / 2, sy - img.height / 2);
    } else {
      ctx.drawImage(img, sx - img.width / 2, sy - img.height / 2);
    }
    ctx.restore();
    if (this.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (this.flash / 0.06 * 0.6) + ')';
      ctx.fillRect(sx - 8, sy - 6, 16, 12);
    }
  };

  G.birds = { Bird: Bird };
})();
