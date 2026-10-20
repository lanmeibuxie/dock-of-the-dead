/* 码头尸潮 — 码头风僵尸部件与调色板 */
(function () {
  'use strict';
  var G = globalThis.G;

  var FW = { h: '#c9a23a', s: '#7d8f6b', d: '#5c6b4c', e: '#f2e9b0', y: '#b8892f', k: '#7d5a1a', b: '#2e2a24', m: '#8a7a55', w: '#3f5a34', r: '#7a1a22', g: '#9acb5a' };
  var DW = { z: '#7f9ba4', d: '#5d747c', e: '#d8f0e0', n: '#223a44', m: '#8a7a55', w: '#3f5a34', b: '#1a262c', r: '#6f1a22', h: '#c9a23a', y: '#b8892f', k: '#7d5a1a', g: '#9acb5a' };
  var ST = { h: '#c9b23a', s: '#7c8a72', d: '#5a6653', e: '#f2e9b0', v: '#b05a1e', a: '#3a2e24', b: '#241e18', m: '#9aa8a0', r: '#7a1a22', z: '#7c8a72', g: '#9acb5a' };
  var SV = { r: '#a8242e', s: '#8a9782', d: '#646f5c', e: '#f2e9b0', c: '#2a3a56', v: '#c96a1e', b: '#1e2228', h: '#c9a23a', y: '#b8892f', k: '#7d5a1a', m: '#8a7a55', w: '#3f5a34', g: '#9acb5a' };
  var OB = { o: '#5a5a2a', z: '#a8b06a', d: '#7d844e', e: '#e8ffb0', g: '#9acb5a', r: '#7a3a1e', b: '#2e2a24', m: '#7d844e', h: '#c9a23a', y: '#b8892f', k: '#7d5a1a', w: '#3f5a34' };

  function P(name, art, pal, pivot, scale) {
    return { name: name, art: art, pal: pal, pivot: pivot, scale: scale || 1, img: null };
  }

  var fisherHead = [
    '...hhhhhh...',
    '..hhhhhhhh..',
    '.hhhhhhhhhh.',
    'hhhhhhhhhhhh',
    '..hssssssh..',
    '..hsessesh..',
    '..hssssssh..',
    '..hssssssh..',
    '...sdssds...',
    '...dddddd...',
    '....dddd....'
  ];
  var fisherTorso = [
    '..yyyyyyyy..',
    '.yyyyyyyyyy.',
    '.yykkkkyyyy.',
    '.ykkkkkkyyy.',
    '.yyykkkkyyy.',
    '.yyyyyyyyyy.',
    '.yykkkkyyyy.',
    '.ykkkkkkyyy.',
    '..yyyyyyyy..',
    '..yyyyyyyy..',
    '..yyyyyyyy..',
    '..bbbbbbbb..',
    '..bbbbbbbb..'
  ];
  var drownedHead = [
    '..zzzzzz..',
    '.zzzzzzzz.',
    '.zwwzzzzz.',
    '.zzzzzzzz.',
    '.zwezzzwz.',
    '.zzzzzzzz.',
    '..zdzdz...',
    '..zzzzz...',
    '...zzz....',
    '..........'
  ];
  var drownedTorso = [
    '..nnnnnnnn..',
    '.nnnnnnnnnn.',
    '.nnzzzzzznn.',
    '.nzzzzzzzzn.',
    '.nzzmzzmzzn.',
    '.nzzzzzzzzn.',
    '.nzmmzzmmzn.',
    '.nzzzzzzzzn.',
    '..nnnnnnnn..',
    '..nnnnnnnn..',
    '..wwwwwwww..',
    '..bbbbbbbb..',
    '..bbbbbbbb..'
  ];
  var steveHead = [
    '...hhhhhh...',
    '..hhhhhhhh..',
    '.hhhhhhhhhh.',
    'hhhhhhhhhhhh',
    '..hssssssh..',
    '..hsessesh..',
    '..hssssssh..',
    '...sdssds...',
    '...dddddd...',
    '....dddd....'
  ];
  var steveTorso = [
    '..vvvvvvvv..',
    '.vvvvvvvvvv.',
    '.vvaaaaaavv.',
    '.vvaaaaaavv.',
    '.vvaaaaaavv.',
    '.vvaaaaaavv.',
    '.vvaaaaaavv.',
    '.vvaaaaaavv.',
    '..aaaaaaaa..',
    '..aaaaaaaa..',
    '..aaaaaaaa..',
    '..aaaaaaaa..',
    '..bbbbbbbb..',
    '..bbbbbbbb..'
  ];
  var sailorHead = [
    '..rrrrrr..',
    '.rrrrrrrr.',
    '.rssssssr.',
    '.hssssssh.',
    '.hsessesh.',
    '.hssssssh.',
    '..sdssds..',
    '..dddddd..',
    '...dddd...',
    '..........'
  ];
  var sailorTorso = [
    '..cccccccc..',
    '.cccccccccc.',
    '.ccvvvvvvcc.',
    '.ccvvvvvvcc.',
    '.ccvvvvvvcc.',
    '.ccvvvvvvcc.',
    '.cccccccccc.',
    '.cccccccccc.',
    '..cccccccc..',
    '..cccccccc..',
    '..cccccccc..',
    '..bbbbbbbb..',
    '..bbbbbbbb..'
  ];
  var oilHead = [
    '..oooooooo..',
    '.oooooooooo.',
    'oooooooooooo',
    '..ozzzzzzo..',
    '..ozezzezo..',
    '..ozzzzzzo..',
    '..ozggggzo..',
    '..ozzzzzzo..',
    '...dzzzzd...',
    '...dddddd...',
    '....dddd....'
  ];
  var oilTorso = [
    '..oooooooo..',
    '.oooooooooo.',
    '.oozzzzzzoo.',
    '.ozzzzzzzzo.',
    '.ozzggzzzzo.',
    '.ozzzzzzzzo.',
    '.oozzzzzzoo.',
    '.oooooooooo.',
    '.oorrrrrooo.',
    '..oooooooo..',
    '..oooooooo..',
    '..bbbbbbbb..',
    '..bbbbbbbb..',
    '..bbbbbbbb..'
  ];
  var oilTank = [
    '..dddd..',
    '.dddddd.',
    '.drrrrd.',
    '.drrrrd.',
    '.dddddd.',
    '.drrrrd.',
    '.drrrrd.',
    '.dddddd.',
    '.dgddgd.',
    '.dddddd.',
    '.dddddd.',
    '.dddddd.'
  ];

  var arm = {
    fisher: ['yyyy', 'yyyy', 'yyyy', 'yyyy', 'yyyy', 'yyyy', 'yyy.', 'zzz.', 'zzz.', 'zz..', 'zz..', 'zz..'],
    drowned: ['nnnn', 'nnnn', 'nnnn', 'nnnn', 'nnnn', 'nnn.', 'zzz.', 'zzz.', 'zmm.', 'zz..', 'zz..', 'zz..'],
    steve: ['vvvvv', 'vvvvv', 'vvvvv', 'vvvvv', 'vvvvv', '.vvv.', '.zzz.', '.zzz.', '.zzz.', '.mmm.', '.m.m.', 'm...m', 'mmmm.'],
    sailor: ['cccc', 'cccc', 'cccc', 'cccc', 'cccc', 'ccc.', 'zzz.', 'zzz.', 'zz..', 'zz..', 'zz..', 'zz..'],
    oil: ['oooo', 'oooo', 'oooo', 'oooo', 'oooo', 'ooo.', 'zzz.', 'zzz.', 'zgg.', 'zz..', 'zz..', 'zz..']
  };
  var leg = {
    fisher: ['bbbbb', 'bbbbb', 'bbbbb', 'bbbbb', 'bbbbb', '.bbb.', '.bbb.', '.bbb.', 'bbbbb', 'bbbbb', 'bbbbb', 'bbbbb'],
    drowned: ['bbbbb', 'bbbbb', 'bbbbb', 'bbbbb', 'nnnnn', 'nnnnn', '.nnn.', '.nnn.', '.bbb.', 'bbbbb', 'bbbbb', 'bbbbb'],
    steve: ['aaaaa', 'aaaaa', 'aaaaa', 'aaaaa', 'bbbbb', 'bbbbb', '.bbb.', '.bbb.', '.bbb.', 'bbbbb', 'bbbbb', 'bbbbb'],
    sailor: ['ccccc', 'ccccc', 'ccccc', 'ccccc', 'ccccc', '.ccc.', '.bbb.', '.bbb.', '.bbb.', 'bbbbb', 'bbbbb', 'bbbbb'],
    oil: ['ooooo', 'ooooo', 'ooooo', 'ooooo', 'ooooo', '.ooo.', '.ooo.', '.bbb.', '.bbb.', 'bbbbb', 'bbbbb', 'bbbbb']
  };

  var rigs = {
    walker: { pal: FW, torso: fisherTorso, head: fisherHead, headPivot: [6, 10], torsoPivot: [6, 13], arm: 'fisher', leg: 'fisher', scale: 1 },
    crawler: { pal: DW, torso: drownedTorso, head: drownedHead, headPivot: [5, 9], torsoPivot: [6, 13], arm: 'drowned', leg: 'drowned', scale: 1 },
    brute: { pal: ST, torso: steveTorso, head: steveHead, headPivot: [6, 9], torsoPivot: [6, 14], arm: 'steve', leg: 'steve', scale: 2 },
    runner: { pal: SV, torso: sailorTorso, head: sailorHead, headPivot: [5, 9], torsoPivot: [6, 13], arm: 'sailor', leg: 'sailor', scale: 1 },
    bomber: { pal: OB, torso: oilTorso, head: oilHead, headPivot: [6, 10], torsoPivot: [6, 14], arm: 'oil', leg: 'oil', scale: 1, tank: oilTank }
  };

  var cache = {};

  function rig(type) {
    if (cache[type]) return cache[type];
    var d = rigs[type] || rigs.walker;
    var s = d.scale;
    var parts = [
      P('legB', leg[d.leg], d.pal, [2, 1], s),
      P('legF', leg[d.leg], d.pal, [2, 1], s),
      P('armB', arm[d.arm], d.pal, [2, 1], s),
      P('torso', d.torso, d.pal, d.torsoPivot, s),
      P('armF', arm[d.arm], d.pal, [2, 1], s),
      P('head', d.head, d.pal, d.headPivot, s)
    ];
    if (d.tank) parts.push(P('tank', d.tank, d.pal, [4, 11], s));
    var out = {
      legLen: 12 * s,
      torsoH: d.torso.length * s,
      shoulderH: (d.torso.length - 2) * s,
      armLen: arm[d.arm].length * s,
      headH: d.head.length * s,
      parts: parts
    };
    cache[type] = out;
    return out;
  }

  G.zombieart = { PAL: { FW: FW, DW: DW, ST: ST, SV: SV, OB: OB }, rigs: rigs, rig: rig };
})();
