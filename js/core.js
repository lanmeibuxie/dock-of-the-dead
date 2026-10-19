/* 码头尸潮 — 核心工具：数学、随机、对象池、输入、时间缩放 */
(function () {
  'use strict';
  var G = (globalThis.G = globalThis.G || {});

  G.W = 480;
  G.H = 270;
  G.GRAVITY = 900;

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
    mouse: { x: G.W / 2, y: G.H / 2, down: false, clicked: false, wheel: 0 },
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
