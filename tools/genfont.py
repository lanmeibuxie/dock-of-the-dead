#!/usr/bin/env python3
"""生成中文像素位图字体 js/cnfont.js。

使用 Windows 宋体 12px 渲染 -> 二值化，得到与像素画风一致的 12px 中文字形。
扫描 js/*.js 中出现的所有非 ASCII 字符，并加入 ASCII 0x20-0x7E。
需要 Pillow：pip install pillow
"""
import glob
import json
import os
import re

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_PATH = 'C:/Windows/Fonts/simsun.ttc'
SIZE = 12
CELL = 16
THRESHOLD = 100
EXTRA = '选择强化第波结束点击或按获得普通稀有史诗'

CJK_RE = re.compile(r'[^\x00-\x7F]')


def collect_chars():
    chars = set(EXTRA)
    for path in glob.glob(os.path.join(ROOT, 'js', '*.js')):
        if os.path.basename(path) == 'cnfont.js':
            continue
        with open(path, encoding='utf-8') as f:
            chars.update(CJK_RE.findall(f.read()))
    chars.update(chr(c) for c in range(0x20, 0x7F))
    chars.discard('\n')
    chars.discard('\r')
    chars.discard('\t')
    return sorted(chars)


def render_glyph(font, ch):
    img = Image.new('L', (CELL, CELL), 0)
    draw = ImageDraw.Draw(img)
    draw.text((0, 0), ch, font=font, fill=255)
    px = img.load()
    rows = []
    for y in range(CELL):
        value = 0
        for x in range(CELL):
            if px[x, y] > THRESHOLD:
                value |= 1 << (CELL - 1 - x)
        rows.append(value)
    advance = int(round(font.getlength(ch)))
    if ch == ' ':
        advance = 4
    return max(1, advance), rows


def main():
    font = ImageFont.truetype(FONT_PATH, SIZE)
    chars = collect_chars()
    out = []
    out.append('/* 由 tools/genfont.py 生成，请勿手改。 */')
    out.append("(function () {")
    out.append("  'use strict';")
    out.append("  var G = (globalThis.G = globalThis.G || {});")
    out.append("  var GLYPHS = {")
    items = []
    for ch in chars:
        advance, rows = render_glyph(font, ch)
        hexrows = ','.join('0x%04x' % r for r in rows)
        key = json.dumps(ch, ensure_ascii=False)
        items.append('    %s: [%d,%s]' % (key, advance, hexrows))
    out.append(','.join(items))
    out.append('  };')
    out.append('  function has(ch) { return !!GLYPHS[ch]; }')
    out.append('  function width(text, scale) {')
    out.append('    scale = scale || 1;')
    out.append('    text = String(text);')
    out.append('    var w = 0;')
    out.append('    for (var i = 0; i < text.length; i++) {')
    out.append('      var ch = text.charAt(i);')
    out.append("      if (ch === '\\n') continue;")
    out.append("      var g = GLYPHS[ch] || GLYPHS['?'];")
    out.append('      w += g[0] * scale;')
    out.append('    }')
    out.append('    return w;')
    out.append('  }')
    out.append('  function draw(ctx, text, x, y, color, scale, align) {')
    out.append('    scale = scale || 1;')
    out.append('    text = String(text);')
    out.append("    if (align === 'center') x -= Math.floor(width(text, scale) / 2);")
    out.append("    else if (align === 'right') x -= width(text, scale);")
    out.append('    ctx.fillStyle = color || "#e8e3d0";')
    out.append('    var sx = x;')
    out.append('    for (var i = 0; i < text.length; i++) {')
    out.append('      var ch = text.charAt(i);')
    out.append("      if (ch === '\\n') { x = sx; y += 16 * scale; continue; }")
    out.append("      var g = GLYPHS[ch] || GLYPHS['?'];")
    out.append('      for (var ry = 0; ry < 16; ry++) {')
    out.append('        var bits = g[1 + ry];')
    out.append('        if (!bits) continue;')
    out.append('        for (var rx = 0; rx < 16; rx++) {')
    out.append('          if (bits & (1 << (15 - rx))) ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);')
    out.append('        }')
    out.append('      }')
    out.append('      x += g[0] * scale;')
    out.append('    }')
    out.append('  }')
    out.append('  G.cnfont = { glyphs: GLYPHS, has: has, width: width, draw: draw };')
    out.append('})();')

    target = os.path.join(ROOT, 'js', 'cnfont.js')
    with open(target, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(out) + '\n')
    print('wrote', target, 'chars', len(chars))


if __name__ == '__main__':
    main()
