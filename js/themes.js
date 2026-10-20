/* 码头尸潮 — 昼夜主题配色与插值 */
(function () {
  'use strict';
  var G = globalThis.G;

  var NIGHT = {
    skyTop: '#122636', skyMid: '#1b3d4e', skyBot: '#2f6470',
    sun: '#d8e4d0', seaTop: '#25515c', seaBot: '#143440',
    waterTop: '#17404c', waterBot: '#0b242e',
    container: ['#2b444c', '#324e50', '#264048'],
    crane: '#1c3540',
    plank: ['#5c4432', '#4e3a2a', '#443224'],
    woodDark: '#2e2018', woodLight: '#86664a',
    fog: '80,110,114', ambient: 0.14, vignette: 0.16, lamp: 1, rain: 0.17
  };

  var DAY = {
    skyTop: '#3f9fd8', skyMid: '#78c4ea', skyBot: '#c8e8f6',
    sun: '#fff4c4', seaTop: '#3f8fa8', seaBot: '#2a7088',
    waterTop: '#4a9eae', waterBot: '#2d7484',
    container: ['#6a8a90', '#7c9c9e', '#5c7c82'],
    crane: '#4a6a74',
    plank: ['#b08a62', '#9c7852', '#8a6844'],
    woodDark: '#4a3626', woodLight: '#d4b088',
    fog: '210,232,234', ambient: 0.03, vignette: 0.06, lamp: 0, rain: 0
  };

  function parse(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }

  function mix(a, b, t) {
    var A = parse(a), B = parse(b);
    var r = Math.round(A[0] + (B[0] - A[0]) * t);
    var g = Math.round(A[1] + (B[1] - A[1]) * t);
    var bl = Math.round(A[2] + (B[2] - A[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  G.themes = {
    NIGHT: NIGHT,
    DAY: DAY,
    mix: mix,
    get: function (t) {
      t = G.clamp(t || 0, 0, 1);
      return {
        skyTop: mix(NIGHT.skyTop, DAY.skyTop, t),
        skyMid: mix(NIGHT.skyMid, DAY.skyMid, t),
        skyBot: mix(NIGHT.skyBot, DAY.skyBot, t),
        sun: mix(NIGHT.sun, DAY.sun, t),
        seaTop: mix(NIGHT.seaTop, DAY.seaTop, t),
        seaBot: mix(NIGHT.seaBot, DAY.seaBot, t),
        waterTop: mix(NIGHT.waterTop, DAY.waterTop, t),
        waterBot: mix(NIGHT.waterBot, DAY.waterBot, t),
        container: [mix(NIGHT.container[0], DAY.container[0], t), mix(NIGHT.container[1], DAY.container[1], t), mix(NIGHT.container[2], DAY.container[2], t)],
        crane: mix(NIGHT.crane, DAY.crane, t),
        plank: [mix(NIGHT.plank[0], DAY.plank[0], t), mix(NIGHT.plank[1], DAY.plank[1], t), mix(NIGHT.plank[2], DAY.plank[2], t)],
        woodDark: mix(NIGHT.woodDark, DAY.woodDark, t),
        woodLight: mix(NIGHT.woodLight, DAY.woodLight, t),
        ambient: NIGHT.ambient + (DAY.ambient - NIGHT.ambient) * t,
        vignette: NIGHT.vignette + (DAY.vignette - NIGHT.vignette) * t,
        lamp: 1 - t,
        rain: NIGHT.rain + (DAY.rain - NIGHT.rain) * t
      };
    }
  };
})();
