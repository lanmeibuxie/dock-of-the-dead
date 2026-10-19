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
      var base = weapon === 'shotgun' ? 0.07 : weapon === 'smg' ? 0.04 : weapon === 'kick' ? 0.05 : 0.045;
      return headshot ? base + 0.03 : base;
    },
    shake: function (weapon, headshot) {
      var base = weapon === 'shotgun' ? 4 : weapon === 'smg' ? 1.2 : weapon === 'kick' ? 2 : 1.5;
      return headshot ? base + 1.5 : base;
    },
    hurtShake: function (damage) {
      return 1.5 + damage * 0.08;
    },
    severApplied: function (limbDamage, amount) {
      return limbDamage + amount >= SEVER;
    }
  };
})();
