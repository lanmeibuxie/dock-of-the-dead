/* 码头尸潮 — 昼夜主题配色与插值 */
(function () {
  'use strict';
  var G = globalThis.G;

  var NIGHT = {
    skyTop: '#0a121a', skyMid: '#10242e', skyBot: '#214650',
    sun: '#b9c6b8', seaTop: '#1a3a42', seaBot: '#0c222a',
    waterTop: '#0d2830', waterBot: '#061318',
    container: ['#1d3138', '#22383a', '#192c31'],
    crane: '#122630',
    plank: ['#4a3628', '#3f2e22', '#37281e'],
    woodDark: '#241a14', woodLight: '#6a4e38',
    fog: '58,84,88', ambient: 0.23, vignette: 0.24, lamp: 1, rain: 0.20
  };

  var DAY = {
    skyTop: '#4a7d90', skyMid: '#7fa8b2', skyBot: '#b8d0cb',
    sun: '#ffe6a8', seaTop: '#4d7f86', seaBot: '#2a5860',
    waterTop: '#3f7a80', waterBot: '#20505a',
    container: ['#4a6064', '#526a6c', '#3d5559'],
    crane: '#2e4a52',
    plank: ['#8a6a4a', '#7a5c40', '#6e5238'],
    woodDark: '#3a2a1e', woodLight: '#b08a62',
    fog: '190,210,206', ambient: 0.07, vignette: 0.15, lamp: 0, rain: 0.05
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
