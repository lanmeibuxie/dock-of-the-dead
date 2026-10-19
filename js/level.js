/* 码头尸潮 — 码头场景、视差、灯光、雨雾与血渍层 */
(function () {
  'use strict';
  var G = globalThis.G;

  var P = null; // 延迟到绘制时取调色板

  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  var level = {
    layout: null,
    time: 0,
    flash: 0,
    decalCanvas: null,
    decalCtx: null,
    decalCount: 0,
    lightCanvas: null,
    lightCtx: null,
    rain: [],

    build: function () {
      var L = {
        length: 2400,
        groundY: 196,
        deckH: 10,
        platforms: [
          { x: 420, y: 178, w: 44 },
          { x: 820, y: 170, w: 56 },
          { x: 1180, y: 180, w: 40 },
          { x: 1620, y: 172, w: 60 },
          { x: 2060, y: 180, w: 44 }
        ],
        lamps: [
          { x: 180, y: 38, r: 120 }, { x: 760, y: 34, r: 130 },
          { x: 1340, y: 40, r: 118 }, { x: 1900, y: 36, r: 130 },
          { x: 2290, y: 42, r: 108 }
        ],
        barrels: [
          { x: 250, y: 196 }, { x: 610, y: 196 }, { x: 1090, y: 196 },
          { x: 1420, y: 196 }, { x: 1870, y: 196 }, { x: 2130, y: 196 }
        ],
        containers: [
          { x: 60, y: 150, w: 120, h: 46, c: 0 },
          { x: 340, y: 142, w: 150, h: 54, c: 1 },
          { x: 620, y: 156, w: 90, h: 40, c: 2 },
          { x: 900, y: 138, w: 170, h: 58, c: 0 },
          { x: 1250, y: 152, w: 110, h: 44, c: 1 },
          { x: 1540, y: 144, w: 150, h: 52, c: 2 },
          { x: 1860, y: 154, w: 100, h: 42, c: 0 },
          { x: 2100, y: 140, w: 180, h: 56, c: 1 }
        ]
      };
      this.layout = L;
      return L;
    },

    reset: function () {
      this.build();
      this.time = 0;
      this.flash = 0;
      this.decalCount = 0;
      if (this.decalCtx) this.decalCtx.clearRect(0, 0, this.layout.length, G.H);
      this.rain.length = 0;
      for (var i = 0; i < 110; i++) {
        this.rain.push({ x: Math.random() * G.W, y: Math.random() * G.H, l: G.rand(2, 6), s: G.rand(90, 170) });
      }
    },

    ensureDecals: function () {
      if (this.decalCtx) return;
      var c = document.createElement('canvas');
      c.width = 2400;
      c.height = G.H;
      this.decalCanvas = c;
      this.decalCtx = c.getContext('2d');
    },

    addBlood: function (x, y, size, dir) {
      this.ensureDecals();
      var c = this.decalCtx;
      var n = Math.max(2, Math.round(size / 3));
      for (var i = 0; i < n; i++) {
        var bx = x + (dir || 0) * G.rand(-4, 22) + G.rand(-size, size);
        var by = y + G.rand(-3, 4);
        var s = G.randInt(1, 3);
        c.fillStyle = G.chance(0.35) ? G.gfx.palette.bloodBright : G.gfx.palette.blood;
        c.globalAlpha = G.rand(0.45, 0.9);
        c.fillRect(Math.round(bx), Math.round(by), s, Math.max(1, s - 1));
      }
      c.globalAlpha = 1;
      this.decalCount += n;
      if (this.decalCount > 900) {
        c.globalAlpha = 0.12;
        c.fillStyle = '#000';
        c.fillRect(0, 0, this.layout.length, G.H);
        c.globalAlpha = 1;
        this.decalCount = 0;
      }
    },

    drawDecals: function (ctx, camX) {
      if (!this.decalCtx) return;
      var cx = Math.round(camX);
      ctx.drawImage(this.decalCanvas, cx, 0, G.W, G.H, 0, 0, G.W, G.H);
    },

    drawBg: function (ctx, camX) {
      P = G.gfx.palette;
      var L = this.layout || this.build();
      var t = this.time;

      var sky = ctx.createLinearGradient(0, 0, 0, 160);
      sky.addColorStop(0, '#070d14');
      sky.addColorStop(0.55, '#0c1a24');
      sky.addColorStop(1, '#153038');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, G.W, 162);

      /* 月亮与光晕 */
      var mx = 386 - camX * 0.03;
      ctx.fillStyle = 'rgba(150,180,175,0.06)';
      ctx.beginPath();
      ctx.arc(mx, 46, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b9c6b8';
      ctx.beginPath();
      ctx.arc(mx, 46, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8fa296';
      ctx.fillRect(mx - 4, 43, 3, 2);
      ctx.fillRect(mx + 1, 48, 4, 2);

      /* 远景吊车 */
      ctx.fillStyle = '#0c1a20';
      for (var i = -1; i < 4; i++) {
        var cxp = i * 300 - (camX * 0.14) % 300 + 40;
        ctx.fillRect(cxp, 82, 5, 80);
        ctx.fillRect(cxp - 30, 78, 70, 5);
        ctx.fillRect(cxp + 30, 78, 4, 26);
        ctx.fillRect(cxp - 26, 83, 3, 18);
        ctx.fillRect(cxp - 60 + (i + 1) * 6, 118, 46, 34);
      }

      /* 雾带 */
      ctx.fillStyle = 'rgba(58,84,88,0.10)';
      ctx.fillRect(0, 118, G.W, 16);
      ctx.fillStyle = 'rgba(58,84,88,0.07)';
      ctx.fillRect((t * 4) % G.W - G.W, 132, G.W * 2, 22);

      /* 远处货柜（视差） */
      var off = camX * 0.62;
      for (var k = 0; k < L.containers.length; k++) {
        var b = L.containers[k];
        var sx = Math.round(b.x - off);
        if (sx < -220 || sx > G.W + 40) continue;
        var cols = ['#16272c', '#1b2b2c', '#132227'];
        ctx.fillStyle = cols[b.c];
        ctx.fillRect(sx, b.y, b.w, b.h);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (var r = 0; r < b.h; r += 6) ctx.fillRect(sx + 2, b.y + r, b.w - 4, 1);
        ctx.fillStyle = 'rgba(120,140,130,0.10)';
        ctx.fillRect(sx, b.y, b.w, 2);
      }

      /* 远海 */
      var sea = ctx.createLinearGradient(0, 162, 0, 196);
      sea.addColorStop(0, '#10262d');
      sea.addColorStop(1, '#081920');
      ctx.fillStyle = sea;
      ctx.fillRect(0, 162, G.W, 40);
      ctx.fillStyle = 'rgba(140,190,185,0.08)';
      for (var w = 0; w < 24; w++) {
        var wy = 166 + (w % 8) * 4;
        var wx = ((w * 73 + t * 6) % (G.W + 60)) - 30;
        ctx.fillRect(wx, wy, 12 + (w % 5) * 5, 1);
      }

      /* 灯柱与灯罩 */
      for (var li = 0; li < L.lamps.length; li++) {
        var lp = L.lamps[li];
        var lx = Math.round(lp.x - camX);
        if (lx < -40 || lx > G.W + 40) continue;
        var flick = 0.85 + 0.15 * Math.sin(t * 11 + li * 2.7) * Math.sin(t * 3.1 + li);
        ctx.fillStyle = '#101a1c';
        ctx.fillRect(lx - 1, lp.y - 14, 3, 60);
        ctx.fillRect(lx - 16, lp.y - 2, 32, 3);
        ctx.fillStyle = '#1b2729';
        ctx.fillRect(lx - 8, lp.y - 12, 16, 5);
        ctx.fillStyle = 'rgba(255,196,107,' + (0.55 * flick) + ')';
        ctx.fillRect(lx - 5, lp.y - 3, 10, 3);
      }
    },

    drawDeck: function (ctx, camX) {
      P = G.gfx.palette;
      var L = this.layout || this.build();
      var gy = L.groundY;
      var x0 = Math.round(camX);

      /* 水面（甲板下方） */
      var water = ctx.createLinearGradient(0, gy + L.deckH, 0, G.H);
      water.addColorStop(0, '#0d2830');
      water.addColorStop(1, '#061318');
      ctx.fillStyle = water;
      ctx.fillRect(0, gy + L.deckH, G.W, G.H - gy - L.deckH);

      ctx.fillStyle = 'rgba(120,180,175,0.10)';
      for (var w = 0; w < 16; w++) {
        var wy = gy + 16 + (w % 6) * 8;
        var wx = ((w * 37 + this.time * 9) % (G.W + 40)) - 20;
        ctx.fillRect(wx, wy, 10 + (w % 4) * 6, 1);
      }

      /* 支撑桩 */
      for (var px = 0; px < L.length; px += 96) {
        var sx = px - x0;
        if (sx < -20 || sx > G.W + 20) continue;
        ctx.fillStyle = '#1b130f';
        ctx.fillRect(sx, gy + L.deckH, 9, G.H - gy - L.deckH);
        ctx.fillStyle = '#2b1e16';
        ctx.fillRect(sx + 1, gy + L.deckH, 2, G.H - gy - L.deckH);
      }

      /* 甲板 */
      ctx.fillStyle = P.woodDark;
      ctx.fillRect(0, gy + L.deckH - 2, G.W, 4);
      for (var b = 0; b < L.length; b += 16) {
        var bx = b - x0;
        if (bx < -16 || bx > G.W) continue;
        var h = hash(b);
        ctx.fillStyle = h > 0.66 ? '#3b2b20' : h > 0.33 ? '#33251c' : '#2d2018';
        ctx.fillRect(bx, gy, 15, L.deckH);
        ctx.fillStyle = 'rgba(90,66,50,0.35)';
        ctx.fillRect(bx, gy, 15, 1);
        if (h > 0.8) ctx.fillRect(bx + 3, gy + 3, 1, 4);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, gy + L.deckH - 1, G.W, 1);

      /* 栈桥上的木箱平台 */
      for (var p = 0; p < L.platforms.length; p++) {
        var pl = L.platforms[p];
        var cx = Math.round(pl.x - x0);
        if (cx < -pl.w - 10 || cx > G.W + 10) continue;
        var ph = gy - pl.y;
        ctx.fillStyle = '#4a3527';
        ctx.fillRect(cx, pl.y, pl.w, ph);
        ctx.fillStyle = '#5f4632';
        ctx.fillRect(cx, pl.y, pl.w, 2);
        ctx.fillStyle = 'rgba(20,12,8,0.55)';
        ctx.fillRect(cx + 2, pl.y + (ph >> 1), pl.w - 4, 1);
        ctx.fillRect(cx + (pl.w >> 1), pl.y + 2, 1, ph - 3);
        ctx.fillStyle = '#231710';
        ctx.fillRect(cx, gy - 2, pl.w, 2);
      }

      /* 油桶 */
      for (var bi = 0; bi < L.barrels.length; bi++) {
        var br = L.barrels[bi];
        var bx2 = Math.round(br.x - x0);
        if (bx2 < -20 || bx2 > G.W + 20) continue;
        var hh = 22;
        ctx.fillStyle = '#3a3f36';
        ctx.fillRect(bx2 - 7, gy - hh, 14, hh);
        ctx.fillStyle = '#4b5145';
        ctx.fillRect(bx2 - 7, gy - hh, 3, hh);
        ctx.fillStyle = '#22261f';
        ctx.fillRect(bx2 - 7, gy - 15, 14, 2);
        ctx.fillRect(bx2 - 7, gy - 8, 14, 2);
        ctx.fillStyle = '#5a3420';
        ctx.fillRect(bx2 - 5, gy - 19, 10, 3);
      }

      /* 血渍 */
      this.drawDecals(ctx, camX);
    },

    drawLighting: function (ctx, camX, extra) {
      var L = this.layout || this.build();
      if (!this.lightCanvas) {
        this.lightCanvas = document.createElement('canvas');
        this.lightCanvas.width = G.W;
        this.lightCanvas.height = G.H;
        this.lightCtx = this.lightCanvas.getContext('2d');
      }
      var lc = this.lightCtx;
      lc.clearRect(0, 0, G.W, G.H);
      lc.globalCompositeOperation = 'source-over';
      lc.fillStyle = 'rgba(5,9,16,0.52)';
      lc.fillRect(0, 0, G.W, G.H);
      lc.globalCompositeOperation = 'destination-out';

      function punch(sx, sy, r) {
        if (sx < -r || sx > G.W + r) return;
        var g = lc.createRadialGradient(sx, sy, r * 0.08, sx, sy, r);
        g.addColorStop(0, 'rgba(0,0,0,0.95)');
        g.addColorStop(0.55, 'rgba(0,0,0,0.55)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = g;
        lc.beginPath();
        lc.arc(sx, sy, r, 0, Math.PI * 2);
        lc.fill();
      }

      for (var i = 0; i < L.lamps.length; i++) {
        var lp = L.lamps[i];
        var flick = 0.9 + 0.1 * Math.sin(this.time * 9 + i * 3.1);
        punch(lp.x - camX, lp.y + 6, lp.r * flick);
      }
      punch(G.W / 2, G.H - 60, 90);
      if (extra) {
        for (var e = 0; e < extra.length; e++) punch(extra[e].x - camX, extra[e].y, extra[e].r);
      }
      lc.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.lightCanvas, 0, 0);

      /* 暖色灯光叠加 */
      ctx.globalCompositeOperation = 'lighter';
      for (var j = 0; j < L.lamps.length; j++) {
        var lq = L.lamps[j];
        var sx = lq.x - camX;
        if (sx < -lq.r || sx > G.W + lq.r) continue;
        var g2 = ctx.createRadialGradient(sx, lq.y + 10, 2, sx, lq.y + 10, lq.r * 0.8);
        g2.addColorStop(0, 'rgba(255,190,110,0.13)');
        g2.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(sx - lq.r, lq.y - 10, lq.r * 2, lq.r * 1.4);
      }
      ctx.globalCompositeOperation = 'source-over';
    },

    drawWeather: function (ctx, camX) {
      var i;
      ctx.fillStyle = 'rgba(160,200,200,0.22)';
      var step = (G.game && G.game.lowFx) ? 2 : 1;
      for (i = 0; i < this.rain.length; i += step) {
        var d = this.rain[i];
        ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, d.l);
      }
      /* 雾 */
      ctx.fillStyle = 'rgba(70,100,102,0.055)';
      ctx.fillRect(0, 150, G.W, 46);
      ctx.fillStyle = 'rgba(70,100,102,0.04)';
      ctx.fillRect(((this.time * 5) % (G.W + 200)) - 200, 170, 260, 26);

      if (this.flash > 0) {
        ctx.fillStyle = 'rgba(210,235,240,' + Math.min(0.55, this.flash * 2.2) + ')';
        ctx.fillRect(0, 0, G.W, G.H);
      }

      /* 暗角 */
      var v = ctx.createRadialGradient(G.W / 2, G.H / 2, 100, G.W / 2, G.H / 2, 300);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, G.W, G.H);
    },

    update: function (dt, camX) {
      this.time += dt;
      this.flash = Math.max(0, this.flash - dt * 3);
      for (var i = 0; i < this.rain.length; i++) {
        var d = this.rain[i];
        d.y += d.s * dt;
        d.x -= d.s * 0.18 * dt;
        if (d.y > G.H) { d.y = -6; d.x = Math.random() * (G.W + 60); }
        if (d.x < -10) d.x = G.W + 10;
      }
    }
  };

  G.level = level;
})();
