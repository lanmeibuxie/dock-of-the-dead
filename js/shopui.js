/* 码头尸潮 — 商店界面 */
(function () {
  'use strict';
  var G = globalThis.G;

  var CARD_RECTS = [
    { x: 14, y: 68, w: 104, h: 132 },
    { x: 130, y: 68, w: 104, h: 132 },
    { x: 246, y: 68, w: 104, h: 132 },
    { x: 362, y: 68, w: 104, h: 132 }
  ];
  var REROLL_RECT = { x: 126, y: 226, w: 72, h: 20 };
  var LEAVE_RECT = { x: 204, y: 226, w: 72, h: 20 };

  function wrap(text, maxW) {
    var out = [], cur = '';
    var tokens = String(text).match(/[A-Za-z0-9+%.\-\/]+|[\s\S]/g) || [];
    for (var i = 0; i < tokens.length; i++) {
      var test = cur + tokens[i];
      if (cur && G.cnfont.width(test, 1) > maxW) { out.push(cur); cur = tokens[i]; }
      else cur = test;
    }
    if (cur) out.push(cur);
    return out;
  }

  function draw(ctx, s) {
    ctx.fillStyle = 'rgba(3,7,10,0.84)';
    ctx.fillRect(0, 0, G.W, G.H);
    G.cnfont.draw(ctx, '补给商店', G.W / 2, 10, '#e8e3d0', 2, 'center');
    G.cnfont.draw(ctx, '金币 ' + s.gold, G.W / 2, 44, '#ffc46b', 1, 'center');

    for (var i = 0; i < CARD_RECTS.length; i++) {
      var item = s.offers[i];
      if (!item) continue;
      var r = CARD_RECTS[i];
      var bought = !!s.bought[i];
      var hover = s.hover === i && !bought;
      var y = r.y - (hover ? 2 : 0);
      ctx.fillStyle = bought ? '#0d1214' : hover ? '#162126' : '#10181c';
      ctx.fillRect(r.x, y, r.w, r.h);
      ctx.strokeStyle = bought ? '#3a4442' : s.gold >= item.price ? '#ffc46b' : '#7a4a3a';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, y + 1, r.w - 2, r.h - 2);
      G.upgradeui.icon(ctx, item.icon, r.x + 40, y + 8);
      G.cnfont.draw(ctx, item.name, r.x + r.w / 2, y + 36, bought ? '#5a6660' : '#e8e3d0', 1, 'center');
      var lines = wrap(item.desc, r.w - 12);
      for (var li = 0; li < lines.length && li < 3; li++) {
        G.cnfont.draw(ctx, lines[li], r.x + 6, y + 56 + li * 16, '#9aa89f', 1);
      }
      G.cnfont.draw(ctx, bought ? '已售' : (s.gold >= item.price ? item.price + ' 金' : '金币不足'),
        r.x + r.w / 2, y + 112, bought ? '#5a6660' : s.gold >= item.price ? '#ffc46b' : '#c8393f', 1, 'center');
    }

    var rrOn = s.gold >= G.shop.REROLL_COST;
    ctx.fillStyle = rrOn ? '#1c2a22' : '#161c1e';
    ctx.fillRect(REROLL_RECT.x, REROLL_RECT.y, REROLL_RECT.w, REROLL_RECT.h);
    ctx.strokeStyle = rrOn ? '#7fff9f' : '#3a4442';
    ctx.lineWidth = 2;
    ctx.strokeRect(REROLL_RECT.x + 1, REROLL_RECT.y + 1, REROLL_RECT.w - 2, REROLL_RECT.h - 2);
    G.cnfont.draw(ctx, '刷新 ' + G.shop.REROLL_COST, REROLL_RECT.x + REROLL_RECT.w / 2, REROLL_RECT.y + 4, rrOn ? '#7fff9f' : '#5a6660', 1, 'center');

    ctx.fillStyle = '#3a2a16';
    ctx.fillRect(LEAVE_RECT.x, LEAVE_RECT.y, LEAVE_RECT.w, LEAVE_RECT.h);
    ctx.strokeStyle = '#ffc46b';
    ctx.strokeRect(LEAVE_RECT.x + 1, LEAVE_RECT.y + 1, LEAVE_RECT.w - 2, LEAVE_RECT.h - 2);
    G.cnfont.draw(ctx, '离开', LEAVE_RECT.x + LEAVE_RECT.w / 2, LEAVE_RECT.y + 4, '#ffc46b', 1, 'center');
    G.cnfont.draw(ctx, '点击购买 · R 刷新 · ENTER 离开', G.W / 2, 254, '#63706a', 1, 'center');
    G.upgradeui.cursor(ctx, s.mouse);
  }

  function input(s, clicked, pressed, onBuy, onReroll, onLeave) {
    var hover = -1;
    for (var i = 0; i < CARD_RECTS.length; i++) {
      var r = CARD_RECTS[i];
      if (s.offers[i] && s.mouse.x >= r.x && s.mouse.x <= r.x + r.w && s.mouse.y >= r.y && s.mouse.y <= r.y + r.h) hover = i;
    }
    var rr = REROLL_RECT, lr = LEAVE_RECT;
    function inR(r) { return s.mouse.x >= r.x && s.mouse.x <= r.x + r.w && s.mouse.y >= r.y && s.mouse.y <= r.y + r.h; }
    if (clicked) {
      if (inR(lr)) onLeave();
      else if (inR(rr)) onReroll();
      else if (hover >= 0 && !s.bought[hover]) onBuy(hover);
    }
    if (pressed('KeyR')) onReroll();
    if (pressed('Enter') || pressed('Escape')) onLeave();
    if (pressed('Digit1')) onBuy(0);
    if (pressed('Digit2')) onBuy(1);
    if (pressed('Digit3')) onBuy(2);
    if (pressed('Digit4')) onBuy(3);
    return hover;
  }

  G.shopui = { CARD_RECTS: CARD_RECTS, REROLL_RECT: REROLL_RECT, LEAVE_RECT: LEAVE_RECT, draw: draw, input: input };
})();
