/* 码头尸潮 — 武器与子弹 */
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

  function Shot(x, y, angle, damage, weapon, knock, opts) {
    opts = opts || {};
    this.crit = !!opts.crit;
    this.pierce = opts.pierce || 0;
    this.knockScale = opts.knockScale || 1;
    this.hitList = [];
    this.fxDone = false;
    this.slowDone = false;
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

  G.weapons = { Weapon: Weapon, Shot: Shot };
  G.entities = G.entities || {};
  G.entities.Weapon = Weapon;
  G.entities.Shot = Shot;
})();
