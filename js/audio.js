/* 码头尸潮 — WebAudio 程序化音效与环境声 */
(function () {
  'use strict';
  var G = globalThis.G;
  var ctx = null;
  var master = null;
  var noiseBuf = null;
  var ambientT = 25;
  var heartT = 0;
  var ambientReady = false;

  function makeNoise(seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function out(node, pan) {
    if (pan != null && ctx.createStereoPanner) {
      var p = ctx.createStereoPanner();
      p.pan.value = G.clamp(pan, -1, 1);
      node.connect(p);
      p.connect(master);
    } else {
      node.connect(master);
    }
  }

  function burst(dur, type, freq, q, gain, pan, rate) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = rate || 1;
    var f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q || 1;
    var g = ctx.createGain();
    var t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    out(g, pan);
    src.start(t);
    src.stop(t + dur + 0.03);
  }

  function tone(type, f0, f1, dur, gain, pan, delay) {
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    out(g, pan);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function horn(freq, dur, gain, delay) {
    var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 320;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.22);
    g.gain.setValueAtTime(gain, t + dur - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f);
    f.connect(g);
    out(g, 0);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noiseLoop(type, freq, gain) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start();
    return src;
  }

  var audio = {
    muted: false,
    ready: false,

    init: function () {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.6;
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 18;
      comp.ratio.value = 8;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      master.connect(comp);
      comp.connect(ctx.destination);
      noiseBuf = makeNoise(1.2);
      if (!ambientReady) {
        ambientReady = true;
        noiseLoop('lowpass', 360, 0.028);
        noiseLoop('highpass', 1500, 0.018);
      }
      this.ready = true;
      if (ctx.state === 'suspended') ctx.resume();
    },

    setMuted: function (m) {
      this.muted = !!m;
      if (master) master.gain.value = this.muted ? 0 : 0.6;
    },

    toggleMute: function () { this.setMuted(!this.muted); },

    shot: function (weapon) {
      if (!ctx) return;
      if (weapon === 'shotgun') {
        burst(0.26, 'lowpass', 1100, 1, 0.7, 0, G.rand(0.92, 1.06));
        tone('sine', 72, 30, 0.28, 0.6);
        burst(0.08, 'highpass', 900, 0.6, 0.22, 0, 1);
      } else if (weapon === 'smg') {
        burst(0.06, 'highpass', 700, 0.8, 0.34, 0, G.rand(0.88, 1.12));
        tone('sine', 230, 80, 0.07, 0.2);
      } else {
        burst(0.1, 'highpass', 420, 0.7, 0.48, 0, G.rand(0.92, 1.08));
        tone('sine', 185, 58, 0.12, 0.34);
      }
    },

    flesh: function (headshot, pan) {
      if (!ctx) return;
      burst(0.13, 'bandpass', 320, 1.4, 0.5, pan || 0);
      tone('sine', 150, 44, 0.16, 0.38);
      if (headshot) {
        burst(0.22, 'lowpass', 620, 0.8, 0.4);
        tone('sine', 92, 34, 0.35, 0.5);
      }
    },

    groan: function (pan) {
      if (!ctx) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = G.rand(62, 96);
      var lfo = ctx.createOscillator();
      lfo.frequency.value = G.rand(4.5, 7.5);
      var lg = ctx.createGain();
      lg.gain.value = G.rand(5, 14);
      lfo.connect(lg);
      lg.connect(o.frequency);
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 430;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      o.connect(f);
      f.connect(g);
      out(g, pan || 0);
      o.start(t); lfo.start(t);
      o.stop(t + 1.05); lfo.stop(t + 1.05);
    },

    reload: function () {
      if (!ctx) return;
      tone('square', 900, 620, 0.05, 0.14);
      tone('square', 1100, 720, 0.05, 0.12, 0, 0.15);
    },

    shell: function () {
      if (!ctx) return;
      tone('triangle', 1750, 900, 0.05, 0.09);
    },

    kick: function () {
      if (!ctx) return;
      burst(0.14, 'lowpass', 280, 1, 0.5);
      tone('sine', 105, 44, 0.16, 0.42);
    },

    pickup: function () {
      if (!ctx) return;
      tone('sine', 660, 660, 0.07, 0.22);
      tone('sine', 990, 990, 0.09, 0.2, 0, 0.08);
    },

    thunder: function () {
      if (!ctx) return;
      burst(1.5, 'lowpass', 190, 0.9, 0.5, 0, 0.6);
      tone('sine', 50, 26, 1.4, 0.3);
    },

    foghorn: function () {
      if (!ctx) return;
      horn(92, 1.6, 0.14, 0);
      horn(97, 1.6, 0.1, 0.1);
    },

    heartbeat: function () {
      if (!ctx) return;
      tone('sine', 56, 36, 0.11, 0.4);
      tone('sine', 52, 34, 0.1, 0.3, 0, 0.18);
    },

    update: function (dt, hp) {
      if (!ctx) return;
      ambientT -= dt;
      if (ambientT <= 0) {
        ambientT = G.rand(22, 40);
        if (G.chance(0.55)) this.foghorn(); else this.thunder();
      }
      if (hp != null && hp <= 30 && hp > 0) {
        heartT -= dt;
        if (heartT <= 0) {
          this.heartbeat();
          heartT = 0.5 + hp / 30 * 0.45;
        }
      } else {
        heartT = 0;
      }
    }
  };

  try {
    if (typeof location !== 'undefined' && /[?&]muted=1/.test(location.search)) audio.muted = true;
  } catch (e) { /* Node 环境 */ }

  G.audio = audio;
})();
