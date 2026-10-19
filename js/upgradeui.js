/* 码头尸潮 — 波间强化卡界面（中文像素卡面） */
(function () {
  'use strict';
  var G = globalThis.G;

  var CARD_RECTS = [
    { x: 26, y: 60, w: 132, h: 152 },
    { x: 174, y: 60, w: 132, h: 152 },
    { x: 322, y: 60, w: 132, h: 152 }
  ];
  var RARITY_COLORS = ['#8f9d95', '#5ea9c9', '#d19a3c'];
  var RARITY_NAMES = ['普通', '稀有', '史诗'];

  function icon(ctx, id, x, y) {
    var s = 2;
    function r(gx, gy, gw, gh, col) {
      ctx.fillStyle = col;
      ctx.fillRect(x + gx * s, y + gy * s, gw * s, gh * s);
    }
    switch (id) {
      case 'damage':
        r(2, 0, 2, 1, '#c5202e'); r(5, 1, 2, 1, '#c5202e'); r(8, 2, 2, 1, '#c5202e');
        r(2, 1, 2, 8, '#d8cfb4'); r(5, 2, 2, 7, '#d8cfb4'); r(8, 3, 2, 6, '#d8cfb4');
        break;
      case 'rate':
        r(6, 0, 3, 4, '#ffd166'); r(4, 4, 3, 3, '#ffd166'); r(2, 7, 3, 3, '#ffd166'); r(7, 3, 2, 2, '#ff9e3d');
        break;
      case 'reload':
        r(2, 2, 8, 2, '#7fd0e8'); r(8, 2, 2, 8, '#7fd0e8'); r(2, 8, 8, 2, '#7fd0e8'); r(2, 4, 2, 4, '#7fd0e8');
        break;
      case 'mag':
        r(3, 2, 6, 9, '#5a6260'); r(4, 4, 1, 5, '#e6d18a'); r(6, 4, 1, 5, '#e6d18a'); r(8, 4, 1, 5, '#e6d18a');
        break;
      case 'hp':
        r(3, 3, 3, 3, '#c5202e'); r(7, 3, 3, 3, '#c5202e'); r(2, 5, 9, 3, '#c5202e');
        r(3, 8, 7, 2, '#c5202e'); r(5, 10, 3, 1, '#c5202e');
        break;
      case 'speed':
        r(3, 2, 4, 7, '#7fd0e8'); r(7, 8, 3, 2, '#7fd0e8'); r(2, 9, 8, 2, '#7fd0e8');
        break;
      case 'knock':
        r(3, 4, 6, 5, '#d8cfb4'); r(5, 2, 2, 2, '#d8cfb4'); r(10, 2, 1, 8, '#ffc46b');
        break;
      case 'pickup':
        r(2, 2, 2, 6, '#c5202e'); r(8, 2, 2, 6, '#c5202e'); r(4, 8, 5, 2, '#c5202e');
        r(2, 2, 2, 1, '#e8e3d0'); r(8, 2, 2, 1, '#e8e3d0');
        break;
      case 'ammo':
        r(2, 3, 2, 6, '#e6d18a'); r(5, 2, 2, 7, '#e6d18a'); r(8, 3, 2, 6, '#e6d18a');
        r(2, 1, 2, 2, '#c5202e'); r(5, 0, 2, 2, '#c5202e'); r(8, 1, 2, 2, '#c5202e');
        break;
      case 'crit':
        r(5, 0, 2, 12, '#ffc46b'); r(0, 5, 12, 2, '#ffc46b');
        r(2, 2, 3, 3, '#ff9e3d'); r(7, 2, 3, 3, '#ff9e3d');
        r(2, 7, 3, 3, '#ff9e3d'); r(7, 7, 3, 3, '#ff9e3d');
        break;
      case 'pierce':
        r(0, 5, 9, 2, '#7fd0e8'); r(2, 3, 2, 2, '#d8cfb4'); r(2, 8, 2, 2, '#d8cfb4'); r(8, 4, 3, 4, '#d8cfb4');
        break;
      case 'leech':
        r(6, 1, 1, 2, '#c5202e'); r(5, 3, 3, 2, '#c5202e'); r(4, 5, 5, 3, '#c5202e'); r(5, 8, 3, 2, '#c5202e');
        break;
      case 'steady':
        r(3, 2, 6, 2, '#9aa89f'); r(2, 4, 8, 3, '#9aa89f'); r(3, 7, 6, 2, '#9aa89f'); r(4, 9, 4, 2, '#9aa89f');
        break;
      case 'heal':
        r(2, 3, 8, 7, '#d8d4c4'); r(5, 4, 2, 5, '#c5202e'); r(4, 5, 4, 2, '#c5202e');
        break;
      case 'storm':
        r(1, 2, 2, 6, '#ffd166'); r(4, 1, 2, 6, '#ffd166'); r(7, 2, 2, 6, '#ffd166'); r(9, 6, 2, 2, '#fff2b0');
        break;
      case 'hunter':
        r(3, 2, 6, 5, '#d8cfb4'); r(4, 7, 5, 3, '#d8cfb4');
        r(4, 4, 2, 2, '#20282b'); r(7, 4, 2, 2, '#20282b'); r(5, 9, 1, 2, '#d8cfb4');
        break;
      case 'undying':
        r(3, 3, 3, 3, '#ffc46b'); r(7, 3, 3, 3, '#ffc46b'); r(2, 5, 9, 3, '#ffc46b');
        r(3, 8, 7, 2, '#ffc46b'); r(9, 8, 2, 2, '#c5202e');
        break;
      default:
        r(5, 2, 2, 6, '#e8e3d0'); r(5, 9, 2, 2, '#e8e3d0');
    }
  }

  function wrapText(text, maxW, scale) {
    var out = [], cur = '';
    var tokens = String(text).match(/[A-Za-z0-9+%.\-\/]+|[\s\S]/g) || [];
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      if (tok === '\n') { out.push(cur); cur = ''; continue; }
      var test = cur + tok;
      if (cur && G.cnfont.width(test, scale) > maxW) {
        out.push(cur);
        cur = tok;
      } else {
        cur = test;
      }
    }
    if (cur) out.push(cur);
    return out;
  }

  function cursor(ctx, m) {
    var x = Math.round(m.x), y = Math.round(m.y);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    for (var i = 0; i < 9; i++) ctx.fillRect(x + 1, y + i + 1, 1, 1);
    ctx.fillStyle = '#e8e3d0';
    ctx.fillRect(x, y, 1, 9);
    ctx.fillRect(x + 1, y + 1, 1, 7);
    ctx.fillRect(x + 2, y + 2, 1, 5);
    ctx.fillRect(x + 3, y + 3, 1, 4);
    ctx.fillRect(x + 4, y + 4, 1, 3);
    ctx.fillRect(x + 2, y + 6, 2, 1);
    ctx.fillRect(x + 1, y + 8, 2, 1);
  }

  function draw(ctx, s) {
    ctx.fillStyle = 'rgba(3,7,10,0.82)';
    ctx.fillRect(0, 0, G.W, G.H);
    G.cnfont.draw(ctx, '选择强化', G.W / 2, 10, '#e8e3d0', 2, 'center');
    G.cnfont.draw(ctx, '第 ' + s.wave + ' 波结束', G.W / 2, 44, '#8f9d95', 1, 'center');

    for (var i = 0; i < CARD_RECTS.length; i++) {
      var card = s.cards[i];
      if (!card) continue;
      var r = CARD_RECTS[i];
      var hover = s.hover === i;
      var y = r.y - (hover ? 2 : 0);
      ctx.fillStyle = hover ? '#162126' : '#10181c';
      ctx.fillRect(r.x, y, r.w, r.h);
      ctx.strokeStyle = RARITY_COLORS[card.rarity];
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, y + 1, r.w - 2, r.h - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(r.x + 4, y + 4, r.w - 8, 2);

      icon(ctx, card.icon, r.x + 54, y + 8);
      G.cnfont.draw(ctx, card.name, r.x + r.w / 2, y + 38, '#e8e3d0', 1, 'center');
      var lines = wrapText(card.desc, r.w - 16, 1);
      for (var li = 0; li < lines.length && li < 3; li++) {
        G.cnfont.draw(ctx, lines[li], r.x + 8, y + 58 + li * 16, '#9aa89f', 1);
      }
      G.cnfont.draw(ctx, RARITY_NAMES[card.rarity], r.x + 8, y + 122, RARITY_COLORS[card.rarity], 1);

      var lv = G.upgrades.levelOf(card.id, s.levels);
      for (var p = 0; p < card.max; p++) {
        ctx.fillStyle = p < lv ? RARITY_COLORS[card.rarity] : 'rgba(255,255,255,0.12)';
        ctx.fillRect(r.x + 8 + p * 6, y + 140, 4, 4);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, y + 0.5, r.w - 1, r.h - 1);
    }

    G.cnfont.draw(ctx, '点击或按 1 / 2 / 3 选择', G.W / 2, 228, '#7d8a80', 1, 'center');
    cursor(ctx, s.mouse);
  }

  G.upgradeui = {
    CARD_RECTS: CARD_RECTS,
    draw: draw,
    cursor: cursor
  };
})();
