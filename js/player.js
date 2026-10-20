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
    this.rateMult = 1;
    this.reloadMult = 1;
    this.magSize = def.mag;
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
    this.nextFire = now + this.def.rate / this.rateMult;
    return true;
  };

  Weapon.prototype.startReload = function () {
    if (this.reloading) return false;
    if (this.ammo >= this.magSize) return false;
    if (this.reserve <= 0) return false;
    this.reloading = true;
    this.reloadT = this.def.reload / this.reloadMult;
    return true;
  };

  Weapon.prototype.finishReload = function () {
    var need = Math.max(0, this.magSize - this.ammo);
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
      smg: new Weapon('smg'),
      minigun: new Weapon('minigun'),
      launcher: new Weapon('launcher')
    };
    this.order = ['pistol', 'shotgun', 'smg', 'minigun', 'launcher'];
    this.current = 'pistol';
    this.moving = false;
    this.spin = 0;
    this.mods = {
      damage: 0, fireRate: 0, reload: 0, mag: 0, speed: 0, crit: 0, critMult: 2,
      pierce: 0, knock: 0, lifesteal: 0, pickup: 0, ammo: 0, recoil: 0,
      jetFuel: 0, jetThrust: 0, jetRegen: 0, jetAir: 0, blastResist: 0
    };
    this.fuel = G.JET.maxFuel;
    this.maxFuel = G.JET.maxFuel;
    this.jetThrust = G.JET.thrust;
    this.jetRegen = G.JET.regen;
    this.jetAir = 0;
    this.blastResist = 0;
    this.thrusting = false;
    this.wasThrusting = false;
    this.syncMods();
  }

  Player.prototype.weapon = function () { return this.weapons[this.current]; };

  Player.prototype.syncMods = function () {
    var m = this.mods;
    m.damage = Math.min(3, m.damage);
    m.fireRate = Math.min(2, m.fireRate);
    m.reload = Math.min(2, m.reload);
    m.mag = Math.min(3, m.mag);
    m.speed = Math.min(0.6, m.speed);
    m.crit = Math.min(0.6, m.crit);
    m.critMult = Math.min(4, m.critMult);
    m.knock = Math.min(1.5, m.knock);
    m.pickup = Math.min(3, m.pickup);
    m.ammo = Math.min(3, m.ammo);
    m.recoil = Math.max(-0.7, m.recoil);
    m.jetFuel = Math.min(3, m.jetFuel);
    m.jetThrust = Math.min(2, m.jetThrust);
    m.jetRegen = Math.min(3, m.jetRegen);
    m.jetAir = Math.min(30, m.jetAir);
    m.blastResist = Math.min(0.7, m.blastResist);
    var newMax = G.JET.maxFuel * (1 + m.jetFuel);
    if (newMax > this.maxFuel) this.fuel = Math.min(newMax, this.fuel + (newMax - this.maxFuel));
    this.maxFuel = newMax;
    this.jetThrust = G.JET.thrust * (1 + m.jetThrust);
    this.jetRegen = G.JET.regen * (1 + m.jetRegen);
    this.jetAir = m.jetAir;
    this.blastResist = m.blastResist;
    this.fuel = Math.min(this.fuel, this.maxFuel);
    for (var i = 0; i < this.order.length; i++) {
      var w = this.weapons[this.order[i]];
      w.rateMult = 1 + m.fireRate;
      w.reloadMult = 1 + m.reload;
      w.magSize = Math.max(1, Math.round(w.def.mag * (1 + m.mag)));
      if (w.ammo > w.magSize) w.ammo = w.magSize;
    }
  };

  Player.prototype.speedScale = function () {
    var s = 1 + this.mods.speed;
    if (this.current === 'minigun') s *= 1 - 0.35 * this.spin;
    return s;
  };

  Player.prototype.stepSpin = function (dt, holding) {
    var def = G.content.weapons.minigun;
    if (holding) this.spin = Math.min(1, this.spin + dt / def.spinUp);
    else this.spin = Math.max(0, this.spin - dt / def.spinDown);
  };

  Player.prototype.heal = function (n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  };

  Player.prototype.switchTo = function (id) {
    if (!this.weapons[id] || this.current === id) return false;
    this.current = id;
    var w = this.weapons[id];
    w.reloading = false;
    w.reloadT = 0;
    w.nextFire = this.clock + 0.25;
    this.recoil = 0;
    this.spin = 0;
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
      spin: this.spin,
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
    var target = move * 110 * this.speedScale() * (this.onGround ? 1 : G.JET.airControl);
    var accel = this.onGround ? 1 - Math.pow(0.00005, dt) : 1 - Math.pow(0.03, dt);
    this.vx += (target - this.vx) * accel;
    if (Math.abs(this.vx) < 2 && move === 0) this.vx = 0;
    this.moving = Math.abs(this.vx) > 12;
    if (this.moving && this.onGround) this.walkPhase += dt * (Math.abs(this.vx) / 110) * 12;

    if ((G.input.pressed('Space') || G.input.pressed('KeyW') || G.input.pressed('ArrowUp')) && this.onGround) {
      this.vy = -220;
      this.onGround = false;
    }

    var holdThrust = (G.input.down('Space') || G.input.down('KeyW') || G.input.down('ArrowUp')) && !this.onGround;
    this.thrusting = holdThrust && this.fuel > 0;
    if (this.thrusting) {
      this.vy -= (this.jetThrust + G.GRAVITY) * dt;
      this.vy = Math.max(this.vy, -170);
      this.fuel = Math.max(0, this.fuel - G.JET.cost * dt);
      if (G.particles && Math.random() < 0.7) {
        G.particles.spawnSparks(this.x - this.facing * 4, this.y - 12, -this.facing, 1);
        G.particles.spawnSmoke(this.x - this.facing * 4, this.y - 8, 1);
      }
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

    var sx = this.x - G.gfx.cam.x;
    var sy = this.y - G.gfx.cam.y;
    var m = G.input.mouse;
    this.aim = Math.atan2(m.y - (sy - 23), m.x - sx);
    this.facing = Math.cos(this.aim) >= 0 ? 1 : -1;

    if (G.input.pressed('Digit1')) this.switchTo('pistol');
    if (G.input.pressed('Digit2')) this.switchTo('shotgun');
    if (G.input.pressed('Digit3')) this.switchTo('smg');
    if (G.input.pressed('Digit4')) this.switchTo('minigun');
    if (G.input.pressed('Digit5')) this.switchTo('launcher');
    if (G.input.mouse.wheel !== 0) {
      var idx = this.order.indexOf(this.current);
      idx = (idx + (G.input.mouse.wheel > 0 ? 1 : -1) + 5) % 5;
      this.switchTo(this.order[idx]);
    }

    if (this.onGround) this.fuel = Math.min(this.maxFuel, this.fuel + this.jetRegen * dt);
    else if (this.jetAir) this.fuel = Math.min(this.maxFuel, this.fuel + this.jetAir * dt);
    if (this.thrusting !== this.wasThrusting) {
      this.wasThrusting = this.thrusting;
      if (G.audio) G.audio.jetpack(this.thrusting);
    }
    if (this.y < G.JET.ceiling) { this.y = G.JET.ceiling; if (this.vy < 0) this.vy = 0; }

    var w = this.weapon();
    w.update(dt);
    var holding = this.current === 'minigun' && !w.reloading &&
      (G.input.mouse.down || G.input.mouse.clicked) && w.ammo > 0;
    var spinBefore = this.spin;
    this.stepSpin(dt, holding);
    if (holding && spinBefore < 0.02 && this.spin > 0 && G.audio) G.audio.minigunSpin();
    if ((G.input.pressed('KeyR') || G.input.pressed('ShiftLeft') || G.input.pressed('ShiftRight')) && w.startReload()) {
      this.reloadRequested = true;
      this.spin = 0;
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
    if (this.current === 'minigun' && this.spin < 0.999) return null;
    if (!w.tryFire(this.clock)) return null;
    var def = w.def;
    var pellets = def.pellets;
    var angles = [];
    var crits = [];
    if (this.current === 'launcher') {
      var gx = this.x + Math.cos(this.aim) * 10;
      var gy = this.y - 23 + Math.sin(this.aim) * 10;
      this.flash = 0.06;
      this.recoil = Math.min(10, this.recoil + def.recoil * (1 + this.mods.recoil));
      return {
        weapon: 'launcher', grenade: true, x: gx, y: gy, angle: this.aim,
        damage: def.damage * (1 + this.mods.damage), angles: [this.aim], crits: [false],
        pierce: 0, knockScale: 1 + this.mods.knock
      };
    }
    if (pellets === 1) {
      angles.push(this.aim + G.rand(-def.spread, def.spread) * 0.5);
    } else {
      for (var i = 0; i < pellets; i++) {
        var base = pellets === 1 ? 0 : (i / (pellets - 1) - 0.5) * def.spread;
        angles.push(this.aim + base + G.rand(-0.018, 0.018));
      }
    }
    for (var c = 0; c < pellets; c++) crits.push(G.chance(this.mods.crit));
    var p = this.points();
    this.flash = 0.06;
    this.recoil = Math.min(10, this.recoil + def.recoil * (1 + this.mods.recoil));
    this.hurtT = Math.max(this.hurtT, 0);
    var amount = def.damage * (1 + this.mods.damage);
    return {
      weapon: this.current,
      angles: angles,
      crits: crits,
      crit: crits[0],
      x: this.x + Math.cos(this.aim) * 8,
      y: this.y - 23 + Math.sin(this.aim) * 8,
      damage: amount,
      amount: amount,
      knock: def.knock,
      knockScale: 1 + this.mods.knock,
      pierce: this.mods.pierce
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
    var bx = Math.round(sx - this.facing * 5);
    ctx.fillStyle = '#2a3236';
    ctx.fillRect(bx - 4, Math.round(sy - 33), 8, 14);
    ctx.fillStyle = '#4a5a5e';
    ctx.fillRect(bx - 4, Math.round(sy - 33), 2, 14);
    ctx.fillStyle = '#c9a23a';
    ctx.fillRect(bx + 1, Math.round(sy - 30), 3, 6);
    ctx.fillStyle = '#7d5a1a';
    ctx.fillRect(bx + 1, Math.round(sy - 30), 3, 1);
    var pose = this.pose();
    G.sprites.drawRig(ctx, G.sprites.playerRig, pose, sx, sy);
    if (this.thrusting) {
      var fl = 4 + Math.floor(Math.random() * 5);
      ctx.fillStyle = '#ff9e3d';
      ctx.fillRect(bx - 1, Math.round(sy - 20), 3, fl);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(bx, Math.round(sy - 20), 1, Math.max(2, fl - 1));
      ctx.fillStyle = '#fff2b0';
      ctx.fillRect(bx, Math.round(sy - 20), 1, 2);
    }
    if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(Math.round(sx - 9), Math.round(sy - 38), 18, 38);
    }
  };

  function Shot(x, y, angle, damage, weapon, knock, opts) {
    opts = opts || {};
    this.crit = !!opts.crit;
    this.pierce = opts.pierce || 0;
    this.knockScale = opts.knockScale || 1;
    this.hitList = [];
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
