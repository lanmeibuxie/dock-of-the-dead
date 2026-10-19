/* 码头尸潮 — 像素部件骨架、武器、字体 */
(function () {
  'use strict';
  var G = globalThis.G;

  var PP = { h: '#241f1d', s: '#c49a74', d: '#96704f', e: '#141414', j: '#37434f', c: '#4d5e6c', p: '#2b323a', b: '#191d21' };
  var ZP = { z: '#7d8f6b', d: '#5c6b4c', t: '#464b3f', e: '#e6e0c8', b: '#38302a', r: '#6f1a22', w: '#c8c2a8' };
  var BP = { z: '#6f7b63', d: '#4e5847', t: '#3a3c35', e: '#e6e0c8', b: '#2e2822', r: '#701c22', w: '#b8b294' };
  var GP = { m: '#3a4448', d: '#20282b', g: '#2a2420', w: '#6b4a2e' };

  function part(name, art, pal, pivot, scale) {
    return { name: name, art: art, pal: pal, pivot: pivot, scale: scale || 1, img: null };
  }

  function makePart(def) {
    if (def.img) return def.img;
    var s = def.scale;
    var w = def.art[0].length, h = def.art.length;
    var cnv = document.createElement('canvas');
    cnv.width = w * s;
    cnv.height = h * s;
    var c = cnv.getContext('2d');
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var ch = def.art[y].charAt(x);
        var col = def.pal[ch];
        if (!col) continue;
        c.fillStyle = col;
        c.fillRect(x * s, y * s, s, s);
      }
    }
    def.img = cnv;
    def.w = cnv.width;
    def.h = cnv.height;
    def.pivotX = def.pivot[0] * s;
    def.pivotY = def.pivot[1] * s;
    return cnv;
  }

  var playerTorso = [
    '..jjjjjjjj..',
    '.jjjjjjjjjj.',
    '.jjccccccjj.',
    '.jjccccccjj.',
    '.jccccccccj.',
    '.jccddddccj.',
    '.jccddddccj.',
    '.jccccccccj.',
    '..cccccccc..',
    '..pppppppp..',
    '..pppppppp..',
    '..pppppppp..',
    '..pppppppp..'
  ];
  var playerHead = [
    '..hhhhhh..',
    '.hhhhhhhh.',
    '.hssssssh.',
    '.hssssssh.',
    '.hsessesh.',
    '.hssssssh.',
    '.hssssssh.',
    '..sdssds..',
    '..dddddd..',
    '...dddd...'
  ];
  var playerArm = [
    'cccc', 'cccc', 'cccc', 'cccc', 'cccc', '.cc.',
    '.ss.', '.ss.', '.ss.'
  ];
  var playerLeg = [
    'ppppp', 'ppppp', 'ppppp', 'ppppp', 'ppppp', 'ppppp', 'ppppp',
    '.ppp.', '.ppp.', 'bbbbb', 'bbbbb', 'bbbbb'
  ];

  var zTorso = [
    '..tttttttt..',
    '.tttttttttt.',
    '.ttzzzzzztt.',
    '.tzzzrzzzzt.',
    '.zzzzzzzzzz.',
    '.zzrrzzzzzz.',
    '.zzzzzzzzzz.',
    '..zzzzzzzz..',
    '..tttttttt..',
    '..tttttttt..',
    '..bbbbbbbb..',
    '..bbbbbbbb..',
    '..bbbbbbbb..'
  ];
  var zHead = [
    '..zzzzzz..',
    '.zzzzzzzz.',
    '.zzzzzzzz.',
    '.zzzzzzzz.',
    '.zwezzzwz.',
    '.zzzzzzzz.',
    '..zdzdz...',
    '..zzzzz...',
    '...zzz....'
  ];
  var zArm = [
    'tttt', 'tttt', 'ttt.', 'zzz.', 'zzz.', 'zzz.', 'zzz.', 'zz..', 'zz..', 'dd..'
  ];
  var zLeg = [
    'bbbbb', 'bbbbb', 'bbbbb', 'bbbbb', 'bbbbb', 'bbbbb', 'bbbbb',
    '.bbb.', '.bbb.', '.ddd.', 'ddddd'
  ];

  var guns = {
    pistol: part('gun', [
      '............',
      '..mmmmmmmmm.',
      '.mmmmmmmmmm.',
      '.mmgmmm.....',
      '.ggg........',
      '.gg.........'
    ], GP, [2, 6]),
    shotgun: part('gun', [
      '........................',
      '..mmmmmmmmmmmmmmmmmmmm..',
      '.mwwwwwwwwwwmmmmmmmmmmm.',
      '.mwwwwwwwwwm............',
      '.mwww...................',
      '.ggg....................',
      '.gg.....................'
    ], GP, [2, 6]),
    smg: part('gun', [
      '..................',
      '..mmmmmmmmmmmmmm..',
      '.mmmmmmmmmmmmmmm..',
      '.mmgmmmmm.........',
      '.ggg..gg..........',
      '.gg...gg..........',
      '.gg...............'
    ], GP, [2, 6])
  };

  function buildRig(opts) {
    return {
      legLen: opts.legLen,
      torsoH: opts.torsoH,
      shoulderH: opts.shoulderH,
      armLen: opts.armLen,
      headH: opts.headH,
      parts: opts.parts
    };
  }

  var playerRig = buildRig({
    legLen: 12, torsoH: 13, shoulderH: 11, armLen: 10, headH: 10,
    parts: [
      part('legB', playerLeg, PP, [2, 1]),
      part('legF', playerLeg, PP, [2, 1]),
      part('armB', playerArm, PP, [2, 1]),
      part('torso', playerTorso, PP, [6, 13]),
      part('armF', playerArm, PP, [2, 1]),
      part('head', playerHead, PP, [5, 10])
    ]
  });

  function zombieRig(pal, scale) {
    return buildRig({
      legLen: 12 * scale, torsoH: 13 * scale, shoulderH: 11 * scale,
      armLen: 12 * scale, headH: 9 * scale,
      parts: [
        part('legB', zLeg, pal, [2, 1], scale),
        part('legF', zLeg, pal, [2, 1], scale),
        part('armB', zArm, pal, [2, 1], scale),
        part('torso', zTorso, pal, [6, 13], scale),
        part('armF', zArm, pal, [2, 1], scale),
        part('head', zHead, pal, [5, 9], scale)
      ]
    });
  }

  function drawPivot(ctx, def, px, py, angle, arm) {
    var img = makePart(def);
    var r = G.gfx.rotate(img, angle * 180 / Math.PI);
    var cxp = def.pivotX, cyp = def.pivotY;
    var cx = img.width / 2, cy = img.height / 2;
    var dx = cxp - cx, dy = cyp - cy;
    var ca = Math.cos(angle), sa = Math.sin(angle);
    var ox = dx * ca - dy * sa, oy = dx * sa + dy * ca;
    ctx.drawImage(r, Math.round(px - r.width / 2 - ox), Math.round(py - r.height / 2 - oy));
  }

  function drawFlat(ctx, def, x, y, flip) {
    var img = makePart(def);
    if (flip) {
      ctx.save();
      ctx.translate(Math.round(x), 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -Math.round(def.pivotX), Math.round(y - def.pivotY));
      ctx.restore();
    } else {
      ctx.drawImage(img, Math.round(x - def.pivotX), Math.round(y - def.pivotY));
    }
  }

  function rot(x, y, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: x * c - y * s, y: x * s + y * c };
  }

  function rigPoints(rig, pose, x, y) {
    var facing = pose.facing || 1;
    var aim = pose.aim == null ? (facing > 0 ? 0 : Math.PI) : pose.aim;
    var ta = pose.torsoAngle || 0;
    var hipY = y - rig.legLen;
    var torsoVec = rot(0, -rig.torsoH, ta);
    var shoulderVec = rot(0, -rig.shoulderH, ta);
    var torsoTopX = x + torsoVec.x, torsoTopY = hipY + torsoVec.y;
    var shoulderX = x + shoulderVec.x, shoulderY = hipY + shoulderVec.y;
    var bob = pose.bob || 0;
    var headX = torsoTopX + (pose.headOffX || 0) * facing;
    var headY = torsoTopY + (pose.headOffY || 0) + bob;
    var armF = pose.armF == null ? aim : pose.armF;
    var armB = pose.armB == null ? aim + 0.18 : pose.armB;
    var handX = shoulderX + Math.cos(armF) * rig.armLen;
    var handY = shoulderY + Math.sin(armF) * rig.armLen;
    var wdef = pose.gun ? G.content.weapons[pose.gun] : null;
    var muzzle = wdef ? wdef.muzzle : 8;
    return {
      facing: facing, aim: aim, ta: ta, hipX: x, hipY: hipY + bob,
      torsoTopX: torsoTopX, torsoTopY: torsoTopY + bob,
      shoulderX: shoulderX, shoulderY: shoulderY + bob,
      headX: headX, headY: headY,
      handX: handX, handY: handY + bob,
      armF: armF, armB: armB,
      muzzleX: handX + Math.cos(armF) * muzzle,
      muzzleY: handY + bob + Math.sin(armF) * muzzle
    };
  }

  function drawGun(ctx, id, hx, hy, aim) {
    var def = guns[id];
    if (!def) return;
    var img = makePart(def);
    var flipY = Math.cos(aim) < 0;
    ctx.save();
    ctx.translate(Math.round(hx), Math.round(hy));
    ctx.rotate(aim);
    if (flipY) ctx.scale(1, -1);
    ctx.drawImage(img, -def.pivotX, -def.pivotY);
    ctx.restore();
  }

  var flash = part('flash', [
    '....o....',
    '...ooo...',
    '..oyyyo..',
    '.oyywyyo.',
    'oyywwwyyo',
    '.oyywyyo.',
    '..oyyyo..',
    '...ooo...',
    '....o....'
  ], { o: '#e8892b', y: '#ffd166', w: '#fff6c9' }, [4, 4]);

  var sprite = {
    playerRig: playerRig,
    rigs: {},
    zombieRig: function (type) {
      if (type === 'brute') return this.rigs.brute || (this.rigs.brute = zombieRig(BP, 2));
      return this.rigs.walker || (this.rigs.walker = zombieRig(ZP, 1));
    },
    makePart: makePart,
    rot: function (img, deg) { return G.gfx.rotate(img, deg); },
    rigPoints: rigPoints,
    gunArt: guns,
    flashArt: flash,
    drawPivot: drawPivot,
    drawFlat: drawFlat,
    drawGun: drawGun,
    drawRig: function (ctx, rig, pose, x, y) {
      var p = rigPoints(rig, pose, x, y);
      var flip = p.facing < 0;
      var hide = pose.hide || {};
      var byName = {};
      for (var i = 0; i < rig.parts.length; i++) byName[rig.parts[i].name] = rig.parts[i];
      if (!hide.legB) drawPivot(ctx, byName.legB, p.hipX, p.hipY, pose.legB || 0);
      if (!hide.legF) drawPivot(ctx, byName.legF, p.hipX, p.hipY, pose.legF == null ? 0 : pose.legF);
      if (!hide.armB) drawPivot(ctx, byName.armB, p.shoulderX, p.shoulderY, (p.armB) - Math.PI / 2);
      if (!hide.torso) {
        if (Math.abs(p.ta) > 0.02) drawPivot(ctx, byName.torso, p.hipX, p.hipY, p.ta);
        else drawFlat(ctx, byName.torso, x, p.hipY, flip);
      }
      if (!hide.armF) drawPivot(ctx, byName.armF, p.shoulderX, p.shoulderY, p.armF - Math.PI / 2);
      if (!hide.head) drawFlat(ctx, byName.head, p.headX, p.headY, flip);
      if (pose.gun) {
        drawGun(ctx, pose.gun, p.handX, p.handY, p.armF);
        if (pose.flash > 0) {
          var f = makePart(flash);
          ctx.save();
          ctx.translate(Math.round(p.muzzleX), Math.round(p.muzzleY));
          ctx.rotate(p.armF);
          ctx.drawImage(f, -f.width / 2, -f.height / 2);
          ctx.restore();
        }
      }
      return p;
    },
    hitBoxes: function (rig, pose, x, y) {
      var p = rigPoints(rig, pose, x, y);
      var scale = rig.headH / 9;
      var boxes = [];
      boxes.push({ zone: 'head', x: p.headX - 5 * scale, y: p.headY - rig.headH, w: 10 * scale, h: rig.headH, ref: 'head' });
      var tx = (p.hipX + p.torsoTopX) / 2, ty = (p.hipY + p.torsoTopY) / 2;
      boxes.push({ zone: 'torso', x: tx - 7 * scale, y: ty - rig.torsoH / 2, w: 14 * scale, h: rig.torsoH, ref: 'torso' });
      var mx = (p.shoulderX + p.handX) / 2, my = (p.shoulderY + p.handY) / 2;
      boxes.push({ zone: 'limb', x: mx - 4 * scale, y: my - rig.armLen / 2, w: 8 * scale, h: rig.armLen, ref: 'armF' });
      boxes.push({ zone: 'limb', x: p.hipX - 4 * scale, y: p.hipY + rig.legLen / 2 - 2, w: 8 * scale, h: rig.legLen, ref: 'legF' });
      return boxes;
    }
  };

  /* 3x5 像素字体 */
  var FONT = {
    A: '010/101/111/101/101', B: '110/101/110/101/110', C: '011/100/100/100/011',
    D: '110/101/101/101/110', E: '111/100/110/100/111', F: '111/100/110/100/100',
    G: '011/100/101/101/011', H: '101/101/111/101/101', I: '111/010/010/010/111',
    J: '001/001/001/101/010', K: '101/101/110/101/101', L: '100/100/100/100/111',
    M: '101/111/111/101/101', N: '101/111/111/111/101', O: '010/101/101/101/010',
    P: '110/101/110/100/100', Q: '010/101/101/111/011', R: '110/101/110/101/101',
    S: '011/100/010/001/110', T: '111/010/010/010/010', U: '101/101/101/101/111',
    V: '101/101/101/101/010', W: '101/101/111/111/101', X: '101/101/010/101/101',
    Y: '101/101/010/010/010', Z: '111/001/010/100/111',
    0: '111/101/101/101/111', 1: '010/110/010/010/111', 2: '110/001/010/100/111',
    3: '110/001/010/001/110', 4: '101/101/111/001/001', 5: '111/100/110/001/110',
    6: '011/100/110/101/010', 7: '111/001/010/010/010', 8: '010/101/010/101/010',
    9: '010/101/011/001/110', ' ': '000/000/000/000/000', '.': '000/000/000/000/010',
    ',': '000/000/000/010/100', ':': '000/010/000/010/000', '/': '001/001/010/100/100',
    '-': '000/000/111/000/000', '+': '000/010/111/010/000', '!': '010/010/010/000/010',
    '?': '110/001/010/000/010', "'": '010/010/000/000/000', '%': '101/001/010/100/101',
    '(': '001/010/010/010/001', ')': '100/010/010/010/100', '<': '001/010/100/010/001',
    '>': '100/010/001/010/100', '=': '000/111/000/111/000', '*': '101/010/111/010/101',
    '_': '000/000/000/000/111', '\u221e': '000/101/111/101/000'
  };
  var fontCache = {};

  function glyph(ch) {
    var g = FONT[ch] || FONT['?'];
    if (fontCache[ch]) return fontCache[ch];
    fontCache[ch] = g.split('/');
    return fontCache[ch];
  }

  function textWidth(text, scale) {
    scale = scale || 1;
    return String(text).length * 4 * scale - scale;
  }

  function drawFont(ctx, text, x, y, color, scale, align) {
    text = String(text).toUpperCase();
    scale = scale || 1;
    if (align === 'center') x -= Math.floor(textWidth(text, scale) / 2);
    else if (align === 'right') x -= textWidth(text, scale);
    ctx.fillStyle = color || '#e8e3d0';
    for (var i = 0; i < text.length; i++) {
      var rows = glyph(text.charAt(i));
      for (var ry = 0; ry < 5; ry++) {
        for (var rx = 0; rx < 3; rx++) {
          if (rows[ry].charAt(rx) === '1') ctx.fillRect(x + i * 4 * scale + rx * scale, y + ry * scale, scale, scale);
        }
      }
    }
  }

  sprite.font = function (text, x, y, color, scale, align) {
    drawFont(G.gfx.ctx, text, x, y, color, scale, align);
  };
  sprite.textWidth = textWidth;

  G.sprites = sprite;
})();
