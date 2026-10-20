/* 码头尸潮 — 玩家、武器、子弹 */
(function () {
  'use strict';
  var G = globalThis.G;

  var Weapon = G.weapons.Weapon;
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
      jetFuel: 0, jetThrust: 0, jetRegen: 0, jetAir: 0, blastResist: 0,
      blastDamage: 0, blastRadius: 0, ammoRecycle: 0, airDamage: 0, airSpeed: 0
    };
    this.fuel = G.JET.maxFuel;
    this.maxFuel = G.JET.maxFuel;
    this.jetThrust = G.JET.thrust;
    this.jetRegen = G.JET.regen;
    this.jetAir = 0;
    this.blastResist = 0;
    this.thrusting = false;
    this.wasThrusting = false;
    this.reloadFx = { out: false, in: false, slam: false };
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
    m.blastDamage = Math.min(1, m.blastDamage);
    m.blastRadius = Math.min(0.8, m.blastRadius);
    m.ammoRecycle = Math.min(0.6, m.ammoRecycle);
    m.airDamage = Math.min(0.6, m.airDamage);
    m.airSpeed = Math.min(0.4, m.airSpeed);
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
    if (!this.onGround) s *= 1 + this.mods.airSpeed;
    if (this.current === 'minigun') s *= 1 - 0.35 * this.spin;
    return s;
  };

  Player.prototype.recycleAmmo = function () {
    var w = this.weapon();
    if (w.ammo < w.magSize) w.ammo++;
    else if (w.reserve !== Infinity) w.reserve++;
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
    var w = this.weapon();
    var reloading = w.reloading;
    var rp = reloading ? 1 - w.reloadT / w.def.reload : 0;
    var dip = reloading ? Math.sin(Math.min(1, rp) * Math.PI) * 0.62 : 0;
    var swing = this.moving && this.onGround ? Math.sin(this.walkPhase) * 0.55 : 0.05;
    var bob = this.moving && this.onGround ? Math.round(Math.abs(Math.sin(this.walkPhase)) * -1) : 0;
    var legF = swing + 0.05;
    var legB = -swing + 0.05;
    if (!this.onGround) { legF = -0.45; legB = 0.35; }
    if (this.kickT > 0) legF = -1.15;
    return {
      aim: this.aim,
      facing: this.facing,
      armF: this.aim + dip,
      armB: reloading ? this.aim + dip - 0.55 + 1.2 * Math.sin(Math.min(1, rp) * Math.PI) : this.aim + 0.22,
      legF: legF,
      legB: legB,
      gun: this.current,
      flash: reloading ? 0 : (this.flash > 0 ? 1 : 0),
      recoil: this.recoil,
      spin: this.spin,
      gunSpin: reloading ? rp * Math.PI * 2 : 0,
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
      this.reloadFx = { out: false, in: false, slam: false };
      if (G.audio) G.audio.reload();
    }
    if (w.reloading) {
      var rp = 1 - w.reloadT / w.def.reload;
      if (rp >= 0.24 && !this.reloadFx.out) {
        this.reloadFx.out = true;
        var po = this.points();
        if (G.particles) {
          G.particles.spawnMag(po.handX, po.handY, this.facing);
          G.particles.spawnSparks(po.handX, po.handY, this.facing, 2);
        }
        if (G.audio) G.audio.magOut();
      }
      if (rp >= 0.62 && !this.reloadFx.in) {
        this.reloadFx.in = true;
        if (G.audio) G.audio.magIn();
      }
      if (rp >= 0.88 && !this.reloadFx.slam) {
        this.reloadFx.slam = true;
        var ps = this.points();
        if (G.particles) G.particles.spawnSparks(ps.handX, ps.handY, this.facing, 4);
        if (G.audio) G.audio.magIn();
        G.gfx.cam.shake(0.35);
      }
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
    var airBoost = this.onGround ? 0 : this.mods.airDamage;
    if (this.current === 'launcher') {
      var gx = this.x + Math.cos(this.aim) * 10;
      var gy = this.y - 23 + Math.sin(this.aim) * 10;
      this.flash = 0.06;
      this.recoil = Math.min(10, this.recoil + def.recoil * (1 + this.mods.recoil));
      return {
        weapon: 'launcher', grenade: true, x: gx, y: gy, angle: this.aim,
        damage: def.damage * (1 + this.mods.damage + airBoost + this.mods.blastDamage),
        radius: def.blastRadius * (1 + this.mods.blastRadius),
        angles: [this.aim], crits: [false], pierce: 0, knockScale: 1 + this.mods.knock
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
    var amount = def.damage * (1 + this.mods.damage + airBoost);
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
    var w = this.weapon();
    if (w.reloading) {
      var rp = 1 - w.reloadT / w.def.reload;
      var pp = G.sprites.rigPoints(G.sprites.playerRig, pose, sx, sy);
      if (rp > 0.42 && rp < 0.94) {
        var t = (rp - 0.42) / 0.52;
        var mx = Math.round(pp.handX);
        var my = Math.round(pp.handY + (1 - t) * 11);
        ctx.fillStyle = '#2a3020';
        ctx.fillRect(mx - 3, my - 2, 6, 7);
        ctx.fillStyle = '#b08a3a';
        ctx.fillRect(mx - 3, my - 2, 6, 2);
        ctx.fillStyle = '#6a5a2a';
        ctx.fillRect(mx - 1, my + 1, 2, 3);
      }
      var orbA = Math.min(1, Math.max(0, (rp - 0.18) / 0.7));
      if (orbA > 0) {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(rp * 20);
        for (var oi = 0; oi < 6; oi++) {
          var oa = oi / 6 * Math.PI * 2 + rp * 5;
          var orad = 14 - orbA * 9;
          ctx.fillStyle = oi % 2 ? '#e6d18a' : '#ffc46b';
          ctx.fillRect(Math.round(pp.handX + Math.cos(oa) * orad), Math.round(pp.handY + Math.sin(oa) * orad), 1, 1);
        }
        ctx.globalAlpha = 1;
      }
      if (rp > 0.86) {
        ctx.fillStyle = 'rgba(255,240,190,0.9)';
        ctx.fillRect(Math.round(pp.handX) - 7, Math.round(pp.handY), 15, 1);
        ctx.fillRect(Math.round(pp.handX), Math.round(pp.handY) - 7, 1, 15);
        ctx.fillStyle = 'rgba(255,196,107,0.7)';
        ctx.fillRect(Math.round(pp.handX) - 3, Math.round(pp.handY) - 3, 7, 7);
      }
    }
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

  G.entities = G.entities || {};
  G.entities.Player = Player;
})();
