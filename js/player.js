/* 码头尸潮 — 玩家、武器、子弹 */
(function () {
  'use strict';
  var G = globalThis.G;

  function Weapon(id) {
    var def = G.content.weapons[id];
    this.id = id;
    this.def = def;
    this.ammo = def.mag;
    this.reserve = def.reserve;
    this.reloading = false;
    this.reloadT = 0;
    this.nextFire = 0;
  }

  Weapon.prototype.update = function (dt) {
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.finishReload();
    }
  };

  Weapon.prototype.tryFire = function (now) {
    if (this.reloading || now < this.nextFire || this.ammo <= 0) return false;
    this.ammo--;
    this.nextFire = now + this.def.rate;
    return true;
  };

  Weapon.prototype.startReload = function () {
    if (this.reloading) return false;
    if (this.ammo >= this.def.mag) return false;
    if (this.reserve <= 0) return false;
    this.reloading = true;
    this.reloadT = this.def.reload;
    return true;
  };

  Weapon.prototype.finishReload = function () {
    var need = this.def.mag - this.ammo;
    var take = Math.min(need, this.reserve);
    this.ammo += take;
    if (this.reserve !== Infinity) this.reserve -= take;
    this.reloading = false;
    this.reloadT = 0;
  };

  function Player(x) {
    var L = G.level.layout || G.level.build();
    this.x = x;
    this.y = L.groundY;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.hp = 100;
    this.maxHp = 100;
    this.aim = 0;
    this.facing = 1;
    this.walkPhase = 0;
    this.clock = 0;
    this.recoil = 0;
    this.flash = 0;
    this.invuln = 0;
    this.hurtT = 0;
    this.kickT = 0;
    this.kickCd = 0;
    this.kickRequested = false;
    this.switchT = 0;
    this.reloadRequested = false;
    this.weapons = {
      pistol: new Weapon('pistol'),
      shotgun: new Weapon('shotgun'),
      smg: new Weapon('smg')
    };
    this.order = ['pistol', 'shotgun', 'smg'];
    this.current = 'pistol';
    this.moving = false;
  }

  Player.prototype.weapon = function () { return this.weapons[this.current]; };

  Player.prototype.switchTo = function (id) {
    if (!this.weapons[id] || this.current === id) return false;
    this.current = id;
    var w = this.weapons[id];
    w.reloading = false;
    w.reloadT = 0;
    w.nextFire = this.clock + 0.25;
    this.recoil = 0;
    this.switchT = 0.25;
    return true;
  };

  Player.prototype.pose = function () {
    var swing = this.moving && this.onGround ? Math.sin(this.walkPhase) * 0.55 : 0.05;
    var bob = this.moving && this.onGround ? Math.round(Math.abs(Math.sin(this.walkPhase)) * -1) : 0;
    var legF = swing + 0.05;
    var legB = -swing + 0.05;
    if (!this.onGround) { legF = -0.45; legB = 0.35; }
    if (this.kickT > 0) legF = -1.15;
    return {
      aim: this.aim,
      facing: this.facing,
      armF: this.aim,
      armB: this.aim + 0.22,
      legF: legF,
      legB: legB,
      gun: this.current,
      flash: this.flash > 0 ? 1 : 0,
      recoil: this.recoil,
      bob: bob,
      torsoAngle: 0
    };
  };

  Player.prototype.points = function () {
    return G.sprites.rigPoints(G.sprites.playerRig, this.pose(), this.x, this.y);
  };

  Player.prototype.update = function (dt) {
    this.clock += dt;
    var L = G.level.layout || G.level.build();

    var move = (G.input.down('KeyD') || G.input.down('ArrowRight') ? 1 : 0) -
      (G.input.down('KeyA') || G.input.down('ArrowLeft') ? 1 : 0);
    var target = move * 110;
    var accel = this.onGround ? 1 - Math.pow(0.00005, dt) : 1 - Math.pow(0.03, dt);
    this.vx += (target - this.vx) * accel;
    if (Math.abs(this.vx) < 2 && move === 0) this.vx = 0;
    this.moving = Math.abs(this.vx) > 12;
    if (this.moving && this.onGround) this.walkPhase += dt * (Math.abs(this.vx) / 110) * 12;

    if ((G.input.pressed('Space') || G.input.pressed('KeyW') || G.input.pressed('ArrowUp')) && this.onGround) {
      this.vy = -220;
      this.onGround = false;
    }

    var prevY = this.y;
    this.vy = Math.min(this.vy + G.GRAVITY * dt, 620);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = G.clamp(this.x, 12, L.length - 12);

    this.onGround = false;
    if (this.vy >= 0) {
      if (prevY <= L.groundY && this.y >= L.groundY) { this.y = L.groundY; this.vy = 0; this.onGround = true; }
      for (var i = 0; i < L.platforms.length; i++) {
        var p = L.platforms[i];
        if (this.x > p.x - 6 && this.x < p.x + p.w + 6 && prevY <= p.y && this.y >= p.y && this.y < L.groundY) {
          this.y = p.y; this.vy = 0; this.onGround = true;
        }
      }
    }

    var sx = G.gfx.cam.toScreenX(this.x);
    var sy = G.gfx.cam.toScreenY(this.y);
    var m = G.input.mouse;
    this.aim = Math.atan2(m.y - (sy - 23), m.x - sx);
    this.facing = Math.cos(this.aim) >= 0 ? 1 : -1;

    if (G.input.pressed('Digit1')) this.switchTo('pistol');
    if (G.input.pressed('Digit2')) this.switchTo('shotgun');
    if (G.input.pressed('Digit3')) this.switchTo('smg');
    if (G.input.mouse.wheel !== 0) {
      var idx = this.order.indexOf(this.current);
      idx = (idx + (G.input.mouse.wheel > 0 ? 1 : -1) + 3) % 3;
      this.switchTo(this.order[idx]);
    }

    var w = this.weapon();
    w.update(dt);
    if ((G.input.pressed('KeyR') || G.input.pressed('ShiftLeft') || G.input.pressed('ShiftRight')) && w.startReload()) {
      this.reloadRequested = true;
      if (G.audio) G.audio.reload();
    }

    this.recoil = Math.max(0, this.recoil - dt * 26);
    this.flash = Math.max(0, this.flash - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.kickT = Math.max(0, this.kickT - dt);
    this.kickCd = Math.max(0, this.kickCd - dt);
    if ((G.input.pressed('KeyQ') || G.input.pressed('KeyF')) && this.kickCd <= 0) {
      this.kickCd = 1.2;
      this.kickT = 0.18;
      this.kickRequested = true;
    }
  };

  Player.prototype.fire = function () {
    var w = this.weapon();
    if (!w.tryFire(this.clock)) return null;
    var def = w.def;
    var pellets = def.pellets;
    var angles = [];
    if (pellets === 1) {
      angles.push(this.aim + G.rand(-def.spread, def.spread) * 0.5);
    } else {
      for (var i = 0; i < pellets; i++) {
        var base = pellets === 1 ? 0 : (i / (pellets - 1) - 0.5) * def.spread;
        angles.push(this.aim + base + G.rand(-0.018, 0.018));
      }
    }
    var p = this.points();
    this.flash = 0.06;
    this.recoil = Math.min(7, this.recoil + def.recoil);
    this.hurtT = Math.max(this.hurtT, 0);
    return {
      weapon: this.current,
      angles: angles,
      x: p.muzzleX,
      y: p.muzzleY,
      damage: def.damage,
      knock: def.knock
    };
  };

  Player.prototype.takeDamage = function (n, dirX) {
    if (G.game && G.game.god) return false;
    if (this.invuln > 0 || this.hp <= 0) return false;
    this.hp -= n;
    this.invuln = 0.6;
    this.hurtT = 0.3;
    this.vx += (dirX || 1) * 60;
    this.weapon().reloading = false;
    this.weapon().reloadT = 0;
    return true;
  };

  Player.prototype.draw = function (ctx) {
    var sx = G.gfx.cam.toScreenX(this.x);
    var sy = G.gfx.cam.toScreenY(this.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(Math.round(sx - 8), Math.round(sy - 2), 16, 3);
    var pose = this.pose();
    G.sprites.drawRig(ctx, G.sprites.playerRig, pose, sx, sy);
    if (this.hurtT > 0) {
      ctx.fillStyle = 'rgba(190,30,40,' + (this.hurtT * 0.7) + ')';
      ctx.fillRect(Math.round(sx - 9), Math.round(sy - 38), 18, 38);
    }
    if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(Math.round(sx - 9), Math.round(sy - 38), 18, 38);
    }
  };

  function Shot(x, y, angle, damage, weapon, knock) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = weapon === 'shotgun' ? 1250 : weapon === 'smg' ? 1500 : 1600;
    this.damage = damage;
    this.weapon = weapon;
    this.knock = knock;
    this.life = 0.7;
    this.dead = false;
    this.px = x;
    this.py = y;
  }

  Shot.prototype.update = function (dt) {
    var L = G.level.layout;
    this.px = this.x;
    this.py = this.y;
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.life -= dt;
    if (this.life <= 0 || this.x < 0 || this.x > L.length || this.y > L.groundY + 2) this.dead = true;
  };

  Shot.prototype.draw = function (ctx) {
    var sx = G.gfx.cam.toScreenX(this.x);
    var sy = G.gfx.cam.toScreenY(this.y);
    var tx = this.x - Math.cos(this.angle) * 12;
    var ty = this.y - Math.sin(this.angle) * 12;
    ctx.strokeStyle = this.weapon === 'shotgun' ? 'rgba(255,205,130,0.85)' : 'rgba(255,228,160,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(G.gfx.cam.toScreenX(tx), G.gfx.cam.toScreenY(ty));
    ctx.lineTo(sx, sy);
    ctx.stroke();
  };

  G.entities = G.entities || {};
  G.entities.Weapon = Weapon;
  G.entities.Player = Player;
  G.entities.Shot = Shot;
})();
