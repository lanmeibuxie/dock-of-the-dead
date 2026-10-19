/* 码头尸潮 — 画布、相机、震屏、像素绘制与旋转缓存 */
(function () {
  'use strict';
  var G = globalThis.G;

  var cam = {
    x: 0,
    y: 0,
    shakeX: 0,
    shakeY: 0,
    trauma: 0,
    reset: function () {
      this.x = 0;
      this.y = 0;
      this.shakeX = 0;
      this.shakeY = 0;
      this.trauma = 0;
    },
    follow: function (tx, ty, dt, bounds) {
      var b = bounds || { minX: 0, maxX: 2400 };
      var desired = tx - G.W / 2;
      var smooth = 1 - Math.pow(0.0004, Math.min(dt, 0.05));
      this.x += (desired - this.x) * smooth;
      this.x = G.clamp(this.x, b.minX, Math.max(b.minX, b.maxX - G.W));
      var desiredY = (ty || G.H / 2) - G.H / 2;
      this.y += (desiredY - this.y) * smooth;
    },
    shake: function (mag) {
      this.trauma = G.clamp(this.trauma + mag / 10, 0, 1);
    },
    update: function (dt) {
      if (this.trauma > 0) {
        var amp = this.trauma * this.trauma * 12;
        this.shakeX = (Math.random() * 2 - 1) * amp;
        this.shakeY = (Math.random() * 2 - 1) * amp * 0.6;
        this.trauma = Math.max(0, this.trauma - dt * 2.2);
        if (this.trauma === 0) { this.shakeX = 0; this.shakeY = 0; }
      } else {
        this.shakeX = 0;
        this.shakeY = 0;
      }
    },
    toScreenX: function (wx) { return wx - Math.round(this.x + this.shakeX); },
    toScreenY: function (wy) { return wy - Math.round(this.y + this.shakeY); }
  };

  var rotCache = new WeakMap();

  var gfx = {
    ctx: null,
    canvas: null,
    scale: 1,
    cam: cam,
    palette: {
      night: '#0b1418',
      deep: '#0a1a20',
      water: '#0d2830',
      waterLight: '#17414a',
      fog: '#20383d',
      wood: '#3a2a20',
      woodDark: '#241a14',
      woodLight: '#5a4232',
      metal: '#3c4a4c',
      metalDark: '#222c2e',
      lamp: '#ffc46b',
      blood: '#8e1420',
      bloodBright: '#c5202e',
      bone: '#d8cfb4',
      skin: '#8a9a7a',
      skinDark: '#5c6a50',
      cloth: '#39424a',
      clothDark: '#242b31',
      white: '#e8e3d0',
      green: '#7fff9f'
    },
    init: function (canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
    },
    rect: function (x, y, w, h, color) {
      var c = this.ctx;
      c.fillStyle = color;
      c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    },
    sprite: function (img, x, y, flip) {
      var c = this.ctx;
      if (!img) return;
      if (flip) {
        c.save();
        c.scale(-1, 1);
        c.drawImage(img, Math.round(-x - img.width), Math.round(y));
        c.restore();
      } else {
        c.drawImage(img, Math.round(x), Math.round(y));
      }
    },
    /* 以旋转后的中心绘制，deg 为角度，缓存 1° 粒度 */
    rotate: function (img, deg) {
      if (!img) return null;
      var a = ((Math.round(deg) % 360) + 360) % 360;
      var byImg = rotCache.get(img);
      if (!byImg) { byImg = new Map(); rotCache.set(img, byImg); }
      var out = byImg.get(a);
      if (out) return out;
      var diag = Math.ceil(Math.sqrt(img.width * img.width + img.height * img.height));
      var cnv = document.createElement('canvas');
      cnv.width = diag;
      cnv.height = diag;
      var c = cnv.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.translate(diag / 2, diag / 2);
      c.rotate(a * Math.PI / 180);
      c.drawImage(img, -img.width / 2, -img.height / 2);
      byImg.set(a, cnv);
      return cnv;
    },
    drawRotated: function (img, x, y, deg) {
      var r = this.rotate(img, deg);
      if (!r) return;
      this.ctx.drawImage(r, Math.round(x - r.width / 2), Math.round(y - r.height / 2));
    },
    clear: function (color) {
      this.ctx.fillStyle = color || this.palette.night;
      this.ctx.fillRect(0, 0, G.W, G.H);
    }
  };

  G.gfx = gfx;
})();
