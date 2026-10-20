/* 码头尸潮 — 伤害结算与打击感分级（纯规则） */
(function () {
  'use strict';
  var G = globalThis.G;

  var SEVER = 30;

  G.combat = {
    SEVER: SEVER,
    mult: function (zone) {
      return zone === 'head' ? 2.5 : zone === 'limb' ? 0.7 : 1;
    },
    resolve: function (o) {
      var pellets = o.pellets || 1;
      return {
        amount: o.damage * pellets * G.combat.mult(o.zone),
        headshot: o.zone === 'head'
      };
    },
    hitstop: function (weapon, headshot) {
      var base = weapon === 'shotgun' ? 0.07 : weapon === 'smg' ? 0.04 : weapon === 'minigun' ? 0.012 : weapon === 'kick' ? 0.05 : 0.045;
      return headshot ? base + 0.03 : base;
    },
    shake: function (weapon, headshot) {
      var base = weapon === 'shotgun' ? 1.6 : weapon === 'smg' ? 0.5 : weapon === 'minigun' ? 0.06 : weapon === 'kick' ? 1.0 : 0.7;
      return headshot ? base + 0.7 : base;
    },
    hurtShake: function (damage) {
      return 1.5 + damage * 0.08;
    },
    severApplied: function (limbDamage, amount) {
      return limbDamage + amount >= SEVER;
    },
    blastSelf: function (damage, dist, radius, resist) {
      if (dist >= radius) return 0;
      return Math.round(damage * 0.5 * (1 - dist / radius) * (1 - G.clamp(resist || 0, 0, 0.7)));
    },
    segBoxT: function (x1, y1, x2, y2, b) {
      var dx = x2 - x1, dy = y2 - y1;
      var t0 = 0, t1 = 1;
      if (Math.abs(dx) < 1e-6) {
        if (x1 < b.x || x1 > b.x + b.w) return null;
      } else {
        var ax = (b.x - x1) / dx, bx = (b.x + b.w - x1) / dx;
        if (ax > bx) { var tx = ax; ax = bx; bx = tx; }
        t0 = Math.max(t0, ax); t1 = Math.min(t1, bx);
        if (t0 > t1) return null;
      }
      if (Math.abs(dy) < 1e-6) {
        if (y1 < b.y || y1 > b.y + b.h) return null;
      } else {
        var ay = (b.y - y1) / dy, by = (b.y + b.h - y1) / dy;
        if (ay > by) { var ty = ay; ay = by; by = ty; }
        t0 = Math.max(t0, ay); t1 = Math.min(t1, by);
        if (t0 > t1) return null;
      }
      return t0;
    }
  };
})();
