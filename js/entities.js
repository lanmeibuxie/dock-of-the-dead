/* 码头尸潮 — 僵尸、断肢与受击白闪 */
(function () {
  'use strict';
  var G = globalThis.G;

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
    if (this.dead) { this.deathT += dt; this.flash = Math.max(0, this.flash - dt); return; }
    this.flash = Math.max(0, this.flash - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.lungeCd = Math.max(0, this.lungeCd - dt);

    if (this.state === 'climb') {
      this.climbT -= dt;
      this.yOff = Math.max(0, this.climbT / 0.8 * 24);
      if (this.climbT <= 0) {
        this.state = 'walk';
        this.yOff = 0;
        if (G.particles) G.particles.spawnSplash(this.x, this.y + 3, 9);
      }
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
        if (Math.abs(player.x - this.x) < this.def.reach + 12 && player.takeDamage(this.def.damage, this.facing)) {
          G.gfx.cam.shake(G.combat.hurtShake(this.def.damage));
          if (G.particles) G.particles.spawnBlood(player.x, player.y - 22, this.facing, 7);
        }
      }
      if (this.recoverT <= 0) { this.state = 'walk'; this.attackCd = this.def.attackRate; }
      return;
    }

    if (this.state === 'lunge') {
      this.lungeT -= dt;
      this.x += this.facing * 230 * dt;
      if (!this.hitDone && Math.abs(player.x - this.x) < 18) {
        this.hitDone = true;
        if (player.takeDamage(this.def.damage, this.facing)) {
          G.gfx.cam.shake(G.combat.hurtShake(this.def.damage));
          if (G.particles) G.particles.spawnBlood(player.x, player.y - 22, this.facing, 5);
        }
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

    if (this.flash > 0) drawZombieFlash(ctx, this, sx, sy);
  };

  var flashCanvas = null, flashCtx = null;

  function drawZombieFlash(ctx, z, sx, sy) {
    if (!flashCanvas) {
      flashCanvas = document.createElement('canvas');
      flashCanvas.width = 200;
      flashCanvas.height = 180;
      flashCtx = flashCanvas.getContext('2d');
      flashCtx.imageSmoothingEnabled = false;
    }
    flashCtx.clearRect(0, 0, 200, 180);
    G.sprites.drawRig(flashCtx, z.rig, z.pose(), 100, 140);
    flashCtx.globalCompositeOperation = 'source-in';
    flashCtx.fillStyle = '#ffffff';
    flashCtx.fillRect(0, 0, 200, 180);
    flashCtx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.9, z.flash / 0.06 * 0.8);
    ctx.drawImage(flashCanvas, Math.round(sx - 100), Math.round(sy - 140));
    ctx.globalAlpha = 1;
  }

  function applyPickup(player, p) {
    if (p.kind === 'medkit') {
      player.hp = Math.min(player.maxHp, player.hp + (p.amount || 30));
      return true;
    }
    var map = { ammo_pistol: 'pistol', ammo_shotgun: 'shotgun', ammo_smg: 'smg' };
    var w = player.weapons[map[p.kind]];
    if (!w) return false;
    if (w.reserve !== Infinity) w.reserve += (p.amount || 10);
    return true;
  }

  function Pickup(kind, x) {
    this.kind = kind;
    this.x = x;
    this.y = (G.level.layout || G.level.build()).groundY;
    this.t = G.rand(0, 6);
    this.life = 22;
    this.amount = kind === 'medkit' ? 30 : kind === 'ammo_shotgun' ? 6 : kind === 'ammo_smg' ? 24 : 18;
    this.dead = false;
  }

  Pickup.prototype.update = function (dt, player) {
    if (this.dead) return;
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (Math.abs(player.x - this.x) < 17 && Math.abs(player.y - this.y) < 32) {
      if (applyPickup(player, this)) {
        this.dead = true;
        if (G.audio) G.audio.pickup();
        if (G.particles) {
          G.particles.spawnSparks(this.x, this.y - 10, 1, 6);
          G.particles.spawnSparks(this.x, this.y - 10, -1, 6);
        }
      }
    }
  };

  Pickup.prototype.draw = function (ctx) {
    var bob = Math.sin(this.t * 3) * 1;
    var sx = Math.round(G.gfx.cam.toScreenX(this.x));
    var sy = Math.round(G.gfx.cam.toScreenY(this.y) - 6 + bob);
    if (this.life < 4 && Math.floor(this.life * 8) % 2 === 0) return;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(sx - 6, Math.round(G.gfx.cam.toScreenY(this.y) - 1), 12, 2);
    if (this.kind === 'medkit') {
      ctx.fillStyle = '#d8d4c4';
      ctx.fillRect(sx - 5, sy - 5, 10, 8);
      ctx.fillStyle = '#b8242e';
      ctx.fillRect(sx - 1, sy - 4, 2, 6);
      ctx.fillRect(sx - 3, sy - 2, 6, 2);
      ctx.fillStyle = '#8f8a7a';
      ctx.fillRect(sx - 5, sy + 1, 10, 1);
    } else {
      var col = this.kind === 'ammo_shotgun' ? '#8e3a2a' : this.kind === 'ammo_smg' ? '#a8862c' : '#5a6260';
      ctx.fillStyle = col;
      ctx.fillRect(sx - 5, sy - 5, 10, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(sx - 5, sy - 5, 10, 1);
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(sx - 3, sy - 3, 6, 1);
      ctx.fillStyle = '#e6d18a';
      ctx.fillRect(sx - 3, sy - 1, 1, 3);
      ctx.fillRect(sx - 1, sy - 1, 1, 3);
      ctx.fillRect(sx + 1, sy - 1, 1, 3);
    }
  };

  function partDef(z, name) {
    for (var i = 0; i < z.rig.parts.length; i++) if (z.rig.parts[i].name === name) return z.rig.parts[i];
    return z.rig.parts[0];
  }

  function spawnLimb(list, z, ref, x, y, dir, kind) {
    var vx = dir * G.rand(70, 190) + (kind === 'head' ? dir * 90 : 0);
    var vy = -G.rand(70, 190);
    list.push(new Limb(partDef(z, ref), x, y, vx, vy, G.rand(-2, 2), kind || 'limb'));
    if (list.length > 40) list.shift();
  }

  function Limb(def, x, y, vx, vy, angle, kind) {
    this.def = def;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.angle = angle || 0;
    this.spin = G.rand(-7, 7);
    this.life = G.rand(14, 18);
    this.rest = false;
    this.trail = 0;
    this.kind = kind || 'limb';
    this.dead = false;
  }

  Limb.prototype.update = function (dt) {
    if (this.dead) return;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.rest) return;
    var L = G.level.layout;
    this.vy += 620 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.spin * dt;
    this.trail -= dt;
    if (this.trail <= 0) {
      G.level.addBlood(this.x, Math.max(L.groundY + 1, this.y), 3, this.vx > 0 ? 1 : -1);
      this.trail = 0.09;
    }
    if (this.y >= L.groundY - 2) {
      this.y = L.groundY - 2;
      this.vy *= -0.34;
      this.vx *= 0.62;
      this.spin *= 0.5;
      if (Math.abs(this.vy) < 26) {
        this.rest = true;
        this.angle = Math.PI / 2 * (this.spin >= 0 ? 1 : -1);
        G.level.addBlood(this.x, L.groundY + G.rand(1, 6), 5, this.vx > 0 ? 1 : -1);
      }
    }
  };

  Limb.prototype.draw = function (ctx) {
    var img = G.sprites.makePart(this.def);
    var r = G.gfx.rotate(img, this.angle * 180 / Math.PI);
    var sx = G.gfx.cam.toScreenX(this.x);
    var sy = G.gfx.cam.toScreenY(this.y);
    var alpha = this.life < 2 ? this.life / 2 : 1;
    ctx.globalAlpha = alpha;
    ctx.drawImage(r, Math.round(sx - r.width / 2), Math.round(sy - r.height / 2));
    ctx.globalAlpha = 1;
  };

  G.entities = G.entities || {};
  G.entities.Zombie = Zombie;
  G.entities.Limb = Limb;
  G.entities.spawnLimb = spawnLimb;
  G.entities.Pickup = Pickup;
  G.entities.applyPickup = applyPickup;
})();
