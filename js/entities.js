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

    var w = this.weapon();
    w.update(dt);
    if ((G.input.pressed('KeyR') || G.input.pressed('ShiftLeft') || G.input.pressed('ShiftRight')) && w.startReload()) {
      this.reloadRequested = true;
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

  function Zombie(type, x, fromWater) {
    var def = G.content.zombies[type];
    this.type = type;
    this.def = def;
    this.rig = G.sprites.zombieRig(type);
    this.x = x;
    this.y = G.level.layout.groundY;
    this.yOff = fromWater ? 24 : 0;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.state = fromWater ? 'climb' : 'walk';
    this.climbT = fromWater ? 0.8 : 0;
    this.stagger = 0;
    this.flash = 0;
    this.knockVx = 0;
    this.windupT = 0;
    this.recoverT = 0;
    this.hitDone = false;
    this.attackCd = 0;
    this.lungeCd = G.rand(0.5, 1.5);
    this.lungeT = 0;
    this.facing = x < G.game.player.x ? 1 : -1;
    this.walkPhase = G.rand(0, Math.PI * 2);
    this.hide = Object.create(null);
    this.limbDamage = { armF: 0, armB: 0, legF: 0, legB: 0 };
    this.dead = false;
    this.deathT = 0;
    this.severedCount = 0;
  }

  Zombie.prototype.hitBoxes = function () {
    return G.sprites.hitBoxes(this.rig, this.pose(), this.x, this.y + this.yOff);
  };

  Zombie.prototype.pose = function () {
    var f = this.facing;
    var w = Math.sin(this.walkPhase);
    var crawler = this.type === 'crawler';
    var brute = this.type === 'brute';
    var ta = crawler ? f * 1.18 : f * 0.10;
    var aim = crawler ? (f > 0 ? 0.9 : Math.PI - 0.9) : (f > 0 ? 0.3 : Math.PI - 0.3);
    var legF = 0.06 + w * 0.5;
    var legB = 0.06 - w * 0.5;
    var armF = aim + w * 0.12;
    var armB = aim + 0.34 - w * 0.12;
    if (this.state === 'attack' || this.state === 'lunge') {
      armF = f > 0 ? -0.7 : Math.PI + 0.7;
      armB = f > 0 ? -0.35 : Math.PI + 0.35;
    }
    if (this.state === 'climb') {
      armF = f > 0 ? -1.3 : Math.PI + 1.3;
      armB = f > 0 ? -1.0 : Math.PI + 1.0;
      legF = 0.8;
      legB = 0.4;
    }
    if (crawler) {
      legF = 1.2 + w * 0.2;
      legB = -1.2 - w * 0.2;
    }
    if (this.dead) {
      ta = f * 1.45;
      legF = 1.0;
      legB = 0.55;
      armF = f > 0 ? 1.6 : Math.PI - 1.6;
      armB = f > 0 ? 1.9 : Math.PI - 1.9;
    }
    return {
      facing: f,
      aim: aim,
      armF: armF,
      armB: armB,
      legF: legF,
      legB: legB,
      torsoAngle: ta,
      headOffX: crawler ? 0 : 1,
      headOffY: crawler ? 0 : 1,
      hide: this.hide,
      bob: brute ? 0 : 0
    };
  };

  Zombie.prototype.update = function (dt, player) {
    if (this.dead) { this.deathT += dt; return; }
    this.flash = Math.max(0, this.flash - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.lungeCd = Math.max(0, this.lungeCd - dt);

    if (this.state === 'climb') {
      this.climbT -= dt;
      this.yOff = Math.max(0, this.climbT / 0.8 * 24);
      if (this.climbT <= 0) { this.state = 'walk'; this.yOff = 0; }
      return;
    }

    if (this.stagger > 0) {
      this.stagger -= dt;
      this.x += this.knockVx * dt;
      this.knockVx *= Math.pow(0.0008, dt);
      return;
    }

    var dx = player.x - this.x;
    var dist = Math.abs(dx);
    this.facing = dx >= 0 ? 1 : -1;

    if (this.state === 'attack') {
      this.windupT -= dt;
      this.recoverT -= dt;
      if (this.windupT <= 0 && !this.hitDone) {
        this.hitDone = true;
        if (Math.abs(player.x - this.x) < this.def.reach + 12) player.takeDamage(this.def.damage, this.facing);
        G.gfx.cam.shake(this.type === 'brute' ? 3 : 1);
      }
      if (this.recoverT <= 0) { this.state = 'walk'; this.attackCd = this.def.attackRate; }
      return;
    }

    if (this.state === 'lunge') {
      this.lungeT -= dt;
      this.x += this.facing * 230 * dt;
      if (!this.hitDone && Math.abs(player.x - this.x) < 18) {
        this.hitDone = true;
        player.takeDamage(this.def.damage, this.facing);
      }
      if (this.lungeT <= 0) { this.state = 'walk'; this.attackCd = 0.5; }
      return;
    }

    if (this.type === 'crawler' && dist > 26 && dist < 76 && this.lungeCd <= 0) {
      this.state = 'lunge';
      this.lungeT = 0.3;
      this.hitDone = false;
      this.lungeCd = 2.2;
      return;
    }

    if (dist <= this.def.reach + 4 && this.attackCd <= 0) {
      this.state = 'attack';
      this.windupT = this.def.windup;
      this.recoverT = this.def.windup + 0.32;
      this.hitDone = false;
      return;
    }

    if (dist > this.def.reach - 2) {
      this.x += this.facing * this.def.speed * dt;
      this.walkPhase += dt * (this.type === 'crawler' ? 12 : this.type === 'brute' ? 4 : 6);
    }
  };

  Zombie.prototype.hit = function (zone, damage, dirX, weapon, ref) {
    if (this.dead) return { killed: false, headshot: zone === 'head', severed: false, damage: 0 };
    this.hp -= damage;
    this.flash = 0.06;
    this.stagger = Math.max(this.stagger, (weapon === 'shotgun' ? 0.26 : weapon === 'smg' ? 0.09 : 0.14) * (this.def.resist ? 0.7 : 1));
    this.knockVx = (dirX || 1) * (weapon === 'shotgun' ? 190 : weapon === 'pistol' ? 95 : 58) * (this.def.resist || 1);
    this.state = 'walk';
    this.windupT = 0;
    this.recoverT = 0;

    var severed = false;
    if (zone === 'limb' && ref) {
      this.limbDamage[ref] = (this.limbDamage[ref] || 0) + damage;
      if (!this.hide[ref] && this.limbDamage[ref] >= 30) {
        this.hide[ref] = true;
        this.severedCount++;
        severed = true;
      }
    }

    var killed = false;
    if (this.hp <= 0) {
      this.dead = true;
      this.deathT = 0;
      this.hp = 0;
      killed = true;
    }
    return { killed: killed, headshot: zone === 'head', severed: severed, damage: damage };
  };

  Zombie.prototype.draw = function (ctx) {
    var sx = G.gfx.cam.toScreenX(this.x);
    var sy = G.gfx.cam.toScreenY(this.y + this.yOff);
    var alpha = this.dead ? Math.max(0.55, 1 - this.deathT * 0.05) : 1;
    ctx.globalAlpha = alpha;
    if (!this.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(Math.round(sx - (this.type === 'brute' ? 14 : 8)), Math.round(sy - 2), this.type === 'brute' ? 28 : 16, 3);
    }
    G.sprites.drawRig(ctx, this.rig, this.pose(), sx, sy);
    ctx.globalAlpha = 1;

    if (this.flash > 0) {
      var boxes = this.hitBoxes();
      var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      for (var i = 0; i < boxes.length; i++) {
        var b = boxes[i];
        if (b.ref === 'head' && this.hide.head) continue;
        minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
      }
      ctx.fillStyle = 'rgba(255,255,255,' + (this.flash / 0.06 * 0.55) + ')';
      ctx.fillRect(Math.round(G.gfx.cam.toScreenX(minX)), Math.round(G.gfx.cam.toScreenY(minY)),
        Math.round(maxX - minX), Math.round(maxY - minY));
    }
  };

  G.entities = {
    Weapon: Weapon,
    Player: Player,
    Shot: Shot,
    Zombie: Zombie
  };
})();
