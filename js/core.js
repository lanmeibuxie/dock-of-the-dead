/* 码头尸潮 — 核心工具：数学、随机、对象池、输入、时间缩放 */
(function () {
  'use strict';
  var G = (globalThis.G = globalThis.G || {});

  G.W = 480;
  G.H = 270;
  G.GRAVITY = 900;
  G.JET = { maxFuel: 100, cost: 50, regen: 40, thrust: 600, ceiling: 56, airControl: 0.9 };

  G.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  G.lerp = function (a, b, t) { return a + (b - a) * t; };
  G.rand = function (lo, hi) { return lo + Math.random() * (hi - lo); };
  G.randInt = function (lo, hi) { return Math.floor(G.rand(lo, hi + 1)); };
  G.chance = function (p) { return Math.random() < p; };
  G.dist = function (x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  };
  G.angle = function (x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); };
  G.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  /* 内容配置：数值与设计文档保持一致 */
  G.content = {
    weapons: {
      pistol: { id: 'pistol', name: 'PISTOL', damage: 24, rate: 0.22, mag: 12, reserve: Infinity, pellets: 1, spread: 0, reload: 1.0, knock: 70, recoil: 1, muzzle: 10 },
      shotgun: { id: 'shotgun', name: 'SHOTGUN', damage: 12, rate: 0.75, mag: 6, reserve: 36, pellets: 8, spread: 0.16, reload: 1.4, knock: 180, recoil: 3, muzzle: 14 },
      smg: { id: 'smg', name: 'SMG', damage: 14, rate: 0.075, mag: 30, reserve: 120, pellets: 1, spread: 0.09, reload: 1.25, knock: 55, recoil: 1.2, muzzle: 13 },
      minigun: { id: 'minigun', name: 'MINIGUN', damage: 9, rate: 0.03, mag: 150, reserve: 150, pellets: 1, spread: 0.10, reload: 3.2, knock: 22, recoil: 0.35, muzzle: 26, spinUp: 0.55, spinDown: 0.5, moveSlow: 0.35 },
      launcher: { id: 'launcher', name: 'LAUNCHER', damage: 60, rate: 0.9, mag: 4, reserve: 12, pellets: 1, spread: 0, reload: 2.4, knock: 80, recoil: 2, muzzle: 18, blastRadius: 58, blastEdge: 25, projectileSpeed: 420, projectileGravity: 600, fuse: 1.4 }
    },
    birds: {
      bird: { id: 'bird', hp: 18, speed: 100, diveSpeed: 300, damage: 10, score: 12, radius: 9 }
    },
    zombies: {
      walker: { id: 'walker', hp: 60, speed: 34, damage: 12, reach: 20, attackRate: 1.15, windup: 0.35, width: 14, height: 38, score: 10 },
      crawler: { id: 'crawler', hp: 28, speed: 78, damage: 8, reach: 18, attackRate: 0.9, windup: 0.22, width: 16, height: 14, score: 12 },
      brute: { id: 'brute', hp: 260, speed: 24, damage: 26, reach: 26, attackRate: 1.6, windup: 0.6, width: 24, height: 58, resist: 0.5, score: 50 },
      runner: { id: 'runner', hp: 38, speed: 100, damage: 9, reach: 16, attackRate: 0.9, windup: 0.16, width: 12, height: 34, score: 15 },
      crane: { id: 'crane', boss: true, bossName: '吊机尸', hp: 900, speed: 18, damage: 28, reach: 34, attackRate: 2.5, windup: 0.8, width: 34, height: 76, resist: 1, score: 400 },
      drownedBoss: { id: 'drownedBoss', boss: true, bossName: '巨溺者', hp: 1000, speed: 22, damage: 24, reach: 30, attackRate: 2, windup: 0.6, width: 30, height: 70, resist: 1, score: 450 },
      bomber: { id: 'bomber', hp: 70, speed: 30, damage: 26, reach: 26, attackRate: 2, windup: 0.5, width: 18, height: 40, score: 25, fuse: 0.7, bombRadius: 60, chainRadius: 50, chainDamage: 45 }
    }
  };

  G.pool = function (factory, initial) {
    var free = [], live = [];
    for (var i = 0; i < (initial || 0); i++) free.push(factory());
    return {
      live: live,
      get: function () {
        var o = free.pop() || factory();
        live.push(o);
        return o;
      },
      release: function (o) {
        var i = live.indexOf(o);
        if (i >= 0) live.splice(i, 1);
        if (free.indexOf(o) < 0) free.push(o);
      },
      forEach: function (fn) {
        for (var i = 0; i < live.length; i++) fn(live[i], i);
      },
      clear: function () { while (live.length) free.push(live.pop()); }
    };
  };

  G.time = {
    worldDt: 0.016,
    realDt: 0.016,
    hitstopT: 0,
    slowT: 0,
    slowScale: 1,
    reset: function () {
      this.hitstopT = 0;
      this.slowT = 0;
      this.slowScale = 1;
      this.worldDt = 0.016;
      this.realDt = 0.016;
    },
    hitstop: function (s) { this.hitstopT = Math.max(this.hitstopT, s); },
    slowmo: function (duration, scale) {
      this.slowT = Math.max(this.slowT, duration);
      this.slowScale = scale;
    },
    update: function (realDt) {
      this.realDt = realDt;
      if (this.hitstopT > 0) {
        this.hitstopT -= realDt;
        if (this.hitstopT < 0) this.hitstopT = 0;
        this.worldDt = 0;
        return;
      }
      if (this.slowT > 0) {
        this.slowT -= realDt;
        this.worldDt = realDt * this.slowScale;
        return;
      }
      this.worldDt = realDt;
    }
  };

  G.input = {
    keys: Object.create(null),
    pressedSet: Object.create(null),
    mouse: { x: G.W * 0.72, y: G.H * 0.5, down: false, clicked: false, wheel: 0 },
    canvas: null,
    init: function (canvas) {
      this.canvas = canvas;
      var self = this;
      window.addEventListener('keydown', function (e) {
        if (!self.keys[e.code]) self.pressedSet[e.code] = true;
        self.keys[e.code] = true;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(e.code) >= 0) e.preventDefault();
      });
      window.addEventListener('keyup', function (e) { self.keys[e.code] = false; });
      window.addEventListener('blur', function () { self.keys = Object.create(null); self.mouse.down = false; });
      canvas.addEventListener('mousemove', function (e) {
        var r = canvas.getBoundingClientRect();
        self.mouse.x = (e.clientX - r.left) / r.width * G.W;
        self.mouse.y = (e.clientY - r.top) / r.height * G.H;
      });
      canvas.addEventListener('mousedown', function (e) {
        var r = canvas.getBoundingClientRect();
        self.mouse.x = (e.clientX - r.left) / r.width * G.W;
        self.mouse.y = (e.clientY - r.top) / r.height * G.H;
        if (e.button === 0) { self.mouse.down = true; self.mouse.clicked = true; }
        e.preventDefault();
      });
      window.addEventListener('mouseup', function (e) {
        if (e.button === 0) self.mouse.down = false;
      });
      canvas.addEventListener('wheel', function (e) {
        self.mouse.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      }, { passive: false });
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    },
    down: function (code) { return !!this.keys[code]; },
    pressed: function (code) { return !!this.pressedSet[code]; },
    endFrame: function () {
      this.pressedSet = Object.create(null);
      this.mouse.clicked = false;
      this.mouse.wheel = 0;
    }
  };
})();
