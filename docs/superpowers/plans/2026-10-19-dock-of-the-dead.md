# 《码头尸潮》实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在浏览器中交付一款可玩的无尽波次横版像素僵尸射击游戏，核心是重口味命中反馈（定格、震屏、喷血、断肢、爆头慢动作）。

**Architecture:** 纯 Canvas 2D，内部分辨率 480×270，整数倍放大。经典 `<script>` 顺序加载，所有模块挂在全局 `G` 命名空间，双击 `index.html` 可玩。纯规则（数值、波次、伤害、时间缩放）拆成无 DOM 依赖的模块，用 Node 内置测试框架做 TDD；表现层用 Edge headless 截图做视觉验证。

**Tech Stack:** 原生 ES2017 JavaScript、Canvas 2D、WebAudio、`node --test`（仅开发期）、Edge headless（仅截图验证）。无运行时依赖。

**Spec:** `docs/superpowers/specs/2026-10-19-dock-zombie-survival-design.md`

## Global Constraints

- 内部分辨率固定 `480×270`；`ctx.imageSmoothingEnabled = false`；CSS 整数倍缩放，画面不糊。
- 零外部素材、零运行时依赖；所有像素图与音效程序化生成；`file://` 双击可运行。
- 语言 ES2017，无构建步骤；模块只用全局 `G`，不使用 ES module。
- 每个 `js/*.js` 文件 ≤ 500 行；模块加载时不得触碰 `document`/`window`（初始化函数里才允许）。
- 性能：60fps；粒子上限 600，血渍贴花上限 900，子弹/断肢/粒子全部池化。
- 所有游戏内画布文字为 ASCII 像素字体（自制 5×7）；中文只出现在文档与 README。
- 所有随机使用 `G.rand`/`G.chance`，便于调试时替换种子。
- 伤害区域倍率：头 2.5x、躯干 1.0x、四肢 0.7x；单肢累计 30 触发断肢。
- 武器数值：手枪 24 伤 / 0.22s / 12 发 ∞备弹；霰弹 12×8 / 0.75s / 6 发 36 备弹；冲锋枪 14 / 0.075s / 30 发 120 备弹。
- 僵尸数值：Walker 60hp/34px·s⁻¹/12 伤；Crawler 28/78/8；Brute 260/24/26，击退减半，第 2 波起出现。

---

## 文件结构

```
index.html            页面骨架、画布、错误覆盖层、脚本顺序
style.css             居中、黑边、像素化、禁滚动
package.json          仅 "test": "node --test tests/"
README.md             中文玩法说明与运行方式
js/core.js            G 命名空间、数学、随机、对象池、输入、时间（hitstop/slowmo）
js/gfx.js             画布初始化、相机、震屏、调色板、像素绘制、旋转缓存、贴花层
js/sprites.js         部件骨架数据、角色/武器像素图、5×7 字体
js/level.js           码头布局（纯数据）、视差背景、灯光、雨雾、血渍层
js/particles.js       血雾、血滴、骨屑、弹壳、火花、烟（池化）
js/combat.js          纯规则：伤害结算、定格/震屏分级、断肢判定
js/entities.js        玩家、武器、僵尸、子弹、拾取物、断肢物理
js/waves.js           纯规则：波次预算、僵尸组成、精英潮、喘息时间
js/audio.js           程序化音效与环境声
js/hud.js             HUD、标题、暂停、结算、最高分
js/game.js            状态机、波次导演、碰撞、实体管理、主循环
tests/core.test.js    数学/池/时间缩放
tests/combat.test.js  伤害倍率、断肢、反馈分级
tests/waves.test.js   预算与组成
tests/content.test.js 武器/僵尸配置一致性
```

---

### Task 1: 启动骨架与核心工具

**Files:**
- Create: `index.html`, `style.css`, `package.json`, `.gitignore`
- Create: `js/core.js`, `js/game.js`
- Test: `tests/core.test.js`

**Interfaces:**
- Produces: `G.W=480`, `G.H=270`；`G.clamp(v,lo,hi)`, `G.lerp(a,b,t)`, `G.rand(lo,hi)`, `G.randInt(lo,hi)`, `G.chance(p)`, `G.dist(x1,y1,x2,y2)`
- Produces: `G.pool(factory, initial)` → `{ get(), release(obj), live, forEach(fn), clear() }`
- Produces: `G.time = { worldDt, realDt, hitstopT, slowT, slowScale, hitstop(s), slowmo(duration, scale), update(realDt) }`
- Produces: `G.game.boot()` 启动主循环；`G.game.loop(ts)`；`G.game.state`

- [ ] **Step 1: 写失败测试**

```js
// tests/core.test.js
const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
const G = globalThis.G;

test('clamp/lerp/dist', () => {
  assert.strictEqual(G.clamp(5, 0, 3), 3);
  assert.strictEqual(G.clamp(-1, 0, 3), 0);
  assert.strictEqual(G.lerp(0, 10, 0.5), 5);
  assert.strictEqual(G.dist(0, 0, 3, 4), 5);
});

test('pool reuses released objects', () => {
  let made = 0;
  const p = G.pool(() => ({ id: ++made }), 1);
  const a = p.get();
  p.release(a);
  assert.strictEqual(p.get(), a);
  assert.strictEqual(made, 1);
  assert.strictEqual(p.live.length, 1);
});

test('hitstop freezes world time while real time advances', () => {
  G.time.reset();
  G.time.hitstop(0.05);
  G.time.update(0.016);
  assert.strictEqual(G.time.worldDt, 0);
  assert.ok(Math.abs(G.time.hitstopT - 0.034) < 1e-9);
});

test('slowmo scales world time and expires', () => {
  G.time.reset();
  G.time.slowmo(0.1, 0.35);
  G.time.update(0.05);
  assert.ok(Math.abs(G.time.worldDt - 0.0175) < 1e-9);
  G.time.update(0.06);
  G.time.update(0.01);
  assert.ok(Math.abs(G.time.worldDt - 0.01) < 1e-9);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/core.test.js`
Expected: FAIL，`Cannot read properties of undefined (reading 'clamp')`

- [ ] **Step 3: 实现 core.js 与页面骨架**

`js/core.js` 关键实现：

```js
(function () {
  'use strict';
  var G = (globalThis.G = globalThis.G || {});
  G.W = 480; G.H = 270;
  G.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  G.lerp = function (a, b, t) { return a + (b - a) * t; };
  G.rand = function (lo, hi) { return lo + Math.random() * (hi - lo); };
  G.randInt = function (lo, hi) { return Math.floor(G.rand(lo, hi + 1)); };
  G.chance = function (p) { return Math.random() < p; };
  G.dist = function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); };
  G.angle = function (x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); };

  G.pool = function (factory, initial) {
    var free = [], live = [];
    for (var i = 0; i < (initial || 0); i++) free.push(factory());
    return {
      live: live,
      get: function () { var o = free.pop() || factory(); live.push(o); return o; },
      release: function (o) { var i = live.indexOf(o); if (i >= 0) live.splice(i, 1); free.push(o); },
      forEach: function (fn) { for (var i = 0; i < live.length; i++) fn(live[i], i); },
      clear: function () { while (live.length) free.push(live.pop()); }
    };
  };

  G.time = {
    worldDt: 0.016, realDt: 0.016, hitstopT: 0, slowT: 0, slowScale: 1,
    reset: function () { this.hitstopT = 0; this.slowT = 0; this.slowScale = 1; this.worldDt = 0.016; },
    hitstop: function (s) { this.hitstopT = Math.max(this.hitstopT, s); },
    slowmo: function (duration, scale) { this.slowT = Math.max(this.slowT, duration); this.slowScale = scale; },
    update: function (realDt) {
      this.realDt = realDt;
      if (this.hitstopT > 0) { this.hitstopT -= realDt; this.worldDt = 0; return; }
      if (this.slowT > 0) { this.slowT -= realDt; this.worldDt = realDt * this.slowScale; return; }
      this.worldDt = realDt;
    }
  };
})();
```

`index.html` 顺序加载 `core.js` → `game.js`；`#game` 画布 `480×270`；`#err` 固定覆盖层显示 `window.onerror` 文本；`?debug=1` 时在右上角画 FPS。

`style.css`：`body` 黑底、`display:grid; place-items:center; height:100vh; overflow:hidden`；画布 `image-rendering: pixelated`，宽度用 JS 计算为 `floor(min(vw/480, vh/270)) * 480 + 'px'`。

`js/game.js` 最小循环：`boot()` 取画布、缩放、`requestAnimationFrame(loop)`；`loop` 计算 `dt = min((ts-last)/1000, 0.05)`，`G.time.update(dt)`，清屏为夜色 `#0b1418`，`?debug=1` 显示 FPS；`window.onerror` 写 `#err`。

- [ ] **Step 4: 运行测试与截图验证**

Run: `node --test tests/core.test.js`
Expected: 4 tests PASS。

Run:
```bash
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --virtual-time-budget=1500 --window-size=960,540 --screenshot="C:/Users/31028/Documents/Projects/dock/shot.png" "file:///C:/Users/31028/Documents/Projects/dock/index.html?debug=1"
```
然后用 read 工具查看 `shot.png`：应为深青色画布、无错误覆盖层、右上角有 FPS。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 启动骨架、核心数学/对象池/时间缩放"
```

---

### Task 2: 输入、相机与像素绘制基础

**Files:**
- Modify: `js/core.js`（输入）
- Create: `js/gfx.js`
- Modify: `js/game.js`
- Test: `tests/core.test.js`（追加相机测试，相机在 gfx.js）

**Interfaces:**
- Produces: `G.input.init(canvas)`, `G.input.keys`, `G.input.mouse {x,y,down,clicked}`, `G.input.pressed(code)`, `G.input.endFrame()`
- Produces: `G.gfx.init(canvas)`, `G.gfx.ctx`, `G.gfx.scale`
- Produces: `G.gfx.cam = { x, y, shakeX, shakeY, trauma, follow(tx, ty, dt, bounds), shake(mag), update(dt), toScreenX(wx), toScreenY(wy), reset() }`
- Produces: `G.gfx.rect(x,y,w,h,color)`, `G.gfx.sprite(img,x,y,flip)`, `G.gfx.rotCache`（旋转缓存）
- Consumes: `G.W`, `G.H`, `G.clamp`

- [ ] **Step 1: 写失败测试（追加到 tests/core.test.js）**

```js
require('../js/gfx.js');

test('camera clamps to level bounds', () => {
  const cam = G.gfx.cam;
  cam.reset();
  cam.follow(0, 100, 1, { minX: 0, maxX: 2400 });
  assert.ok(cam.x >= 0);
  cam.follow(2400, 100, 1, { minX: 0, maxX: 2400 });
  assert.ok(cam.x <= 2400 - G.W);
});

test('camera shake decays to zero', () => {
  const cam = G.gfx.cam;
  cam.reset();
  cam.shake(6);
  assert.ok(cam.trauma > 0);
  for (let i = 0; i < 120; i++) cam.update(0.016);
  assert.strictEqual(cam.trauma, 0);
  assert.strictEqual(cam.shakeX, 0);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/core.test.js`
Expected: FAIL，`Cannot read properties of undefined (reading 'cam')`

- [ ] **Step 3: 实现输入与 gfx.js 基础**

输入：`keydown/keyup` 记录 `keys[e.code]`，`mousedown/mouseup` 记录 `mouse.down`，`mousemove` 用 `canvas.getBoundingClientRect()` 把坐标换算到 480×270 虚拟坐标；`pressed(code)` 返回本帧按下集合；`endFrame()` 清空 `clicked`/`pressed` 集合。阻止空格与方向键滚动。

相机：`follow` 目标为玩家中心减去半屏，平滑系数 `1 - Math.pow(0.001, dt)`；钳制 `minX..maxX-G.W`；`shake(mag)` 累加 `trauma = clamp(trauma + mag/10, 0, 1)`；`update` 中 `shakeX = (Math.random()*2-1) * trauma * 8`，`trauma = max(0, trauma - dt*2.2)`，归零时 shakeX/Y = 0（满足测试）。`toScreenX = wx - Math.round(x + shakeX)`。

`gfx.init` 设置 `imageSmoothingEnabled=false` 并保存 `scale`（仅用于调试绘制），不得在模块加载时访问 DOM。

- [ ] **Step 4: 测试通过 + 调试场景截图**

Run: `node --test tests/core.test.js`
Expected: 6 tests PASS。

在 `game.js` 加 `?debug=scene` 临时测试场景：画一个随相机偏移的方块与十字准星（准星跟随鼠标虚拟坐标）。截图确认无报错。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 输入映射、相机跟随与震屏、像素画布"
```

---

### Task 3: 部件骨架、像素素材与码头场景

**Files:**
- Create: `js/sprites.js`, `js/level.js`
- Modify: `js/game.js`
- Test: `tests/content.test.js`

**Interfaces:**
- Produces: `G.sprites.playerRig`, `G.sprites.zombieRig(type)`, 每个 rig `{ parts:[{name,w,h,pivot:[px,py],px:[[...colorIndex]], palette:[...]}] }`
- Produces: `G.sprites.makePart(px, palette)` → offscreen canvas
- Produces: `G.sprites.rot(img, deg)` → 缓存后的旋转画布（1° 粒度）
- Produces: `G.sprites.drawRig(ctx, rig, pose, x, y, flip)`；`pose` 含 `head/armL/armR/legL/legR` 角度与 `bob`
- Produces: `G.sprites.font(text, x, y, color, scale)`（5×7 ASCII）
- Produces: `G.level.layout`（纯数据）、`G.level.build()`、`G.level.drawBg(ctx, camX)`、`G.level.drawFg(ctx, camX)`、`G.level.addBlood(x, y, size, dir)`、`G.level.drawDecals(ctx, camX)`
- Consumes: `G.gfx`, `G.W`, `G.H`, `G.rand`

- [ ] **Step 1: 写失败测试**

```js
// tests/content.test.js
const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/sprites.js');
require('../js/level.js');
require('../js/entities.js');
const G = globalThis.G;

test('player rig has all animated parts', () => {
  const names = G.sprites.playerRig.parts.map(p => p.name);
  for (const n of ['head', 'torso', 'armF', 'armB', 'legF', 'legB']) {
    assert.ok(names.includes(n), 'missing ' + n);
  }
});

test('level layout spans 2400px with reachable platforms', () => {
  const L = G.level.build();
  assert.strictEqual(L.length, 2400);
  assert.ok(L.groundY > 150 && L.groundY < 240);
  for (const p of L.platforms) {
    assert.ok(p.x > 0 && p.x < L.length);
    assert.ok(L.groundY - p.y < 90, 'platform too high');
  }
});

test('each weapon and zombie config is complete', () => {
  for (const id of ['pistol', 'shotgun', 'smg']) {
    const w = G.content.weapons[id];
    assert.ok(w.damage > 0 && w.rate > 0 && w.mag > 0);
  }
  for (const id of ['walker', 'crawler', 'brute']) {
    const z = G.content.zombies[id];
    assert.ok(z.hp > 0 && z.speed > 0 && z.damage > 0);
  }
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/content.test.js`
Expected: FAIL，`G.sprites`/`G.level` undefined。

- [ ] **Step 3: 实现 sprites.js / level.js**

`sprites.js`：用字符串像素图 + 调色板定义部件（如头部 14×14、躯干 12×16、四肢 4×12），`makePart` 在首次调用时创建离屏画布（模块加载时不创建）。`rot` 使用 `key = img.dataset ? ... ` 的 WeakMap 缓存：`Map<img, Map<deg, canvas>>`，旋转时画布尺寸取对角线并居中，`imageSmoothingEnabled=false`。绘制时坐标取整，`flip` 用 `ctx.scale(-1,1)`。

`level.js`：`build()` 返回 `{ length:2400, groundY:196, platforms:[{x,y,w}], props:[{type,x,scale}], lamps:[{x,y,r}] }`，随机布置木箱、缆绳、集装箱与钠灯；背景层预渲染到离屏画布（天空渐变、吊车剪影、雾带、集装箱堆），每次 `drawBg` 按 `camX*0.35`、`camX*0.6` 平铺两层。前景画木栈道、栏杆、水洼。血渍层：独立 2400×270 离屏画布，`addBlood` 用暗红/亮红叠加不规则像素块，超过 900 次时整体淡化后再画。

`content` 配置放进 `js/core.js` 顶部：`G.content = { weapons: {...}, zombies: {...} }`，数值与 Global Constraints 完全一致（伤害、射速、弹匣、备弹、生命、速度、伤害）。

- [ ] **Step 4: 测试通过 + 场景截图**

Run: `node --test tests/content.test.js`
Expected: 3 tests PASS。

`?debug=scene` 中绘制：背景视差、栈道、一个待机玩家骨架、一盏灯的光锥。Edge 截图检查像素清晰、玩家部件无错位、无报错覆盖层。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 部件骨架、像素素材、码头场景与视差背景"
```

---

### Task 4: 玩家移动、瞄准与武器射击

**Files:**
- Create: `js/entities.js`
- Modify: `js/game.js`, `js/core.js`
- Test: `tests/content.test.js`（追加武器逻辑测试）

**Interfaces:**
- Produces: `G.entities.Player`；字段 `x,y,vx,vy,onGround,hp,aim,face,facing,recoil,reloadT`
- Produces: `G.entities.Weapon(id)`；`tryFire(now)` → `bool`；`startReload()`；`finishReload()`；`ammo`、`reserve`、`reloading`、`cooldown`
- Produces: `G.entities.Player.prototype.update(dt)`、`.draw(ctx)`、`.takeDamage(n, dirX)`、`.shoot()`
- Consumes: `G.content.weapons`, `G.input`, `G.gfx.cam`, `G.particles`（Task 5 前用空桩）

- [ ] **Step 1: 写失败测试**

```js
test('pistol respects fire rate and magazine, reserve is infinite', () => {
  const w = new G.entities.Weapon('pistol');
  assert.strictEqual(w.ammo, 12);
  assert.strictEqual(w.tryFire(0), true);
  assert.strictEqual(w.ammo, 11);
  assert.strictEqual(w.tryFire(0.01), false, 'rate limit');
  assert.strictEqual(w.tryFire(0.3), true);
  w.ammo = 0;
  assert.strictEqual(w.tryFire(1), false, 'empty');
  w.startReload();
  assert.strictEqual(w.reloading, true);
  w.finishReload();
  assert.strictEqual(w.ammo, 12);
  assert.strictEqual(w.reserve, Infinity);
});

test('shotgun has 8 pellets and longer cooldown than smg', () => {
  const sg = new G.entities.Weapon('shotgun');
  const smg = new G.entities.Weapon('smg');
  assert.strictEqual(sg.def.pellets, 8);
  assert.ok(sg.def.rate > smg.def.rate);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/content.test.js`
Expected: FAIL，`G.entities` undefined。

- [ ] **Step 3: 实现玩家与武器**

物理：水平速度 110，按住方向加速到目标速度（`lerp`，地面 0.0001^dt 平滑），跳跃 -220，重力 900，落地钳制 `y = groundY`。AABB 约 `14×30`。

瞄准：`aim = atan2(mouseWy - centerY, mouseWx - centerX)`；`facing = cos(aim) >= 0 ? 1 : -1`。绘制时骨架角度来自 `aim`（手臂指向鼠标），头部随朝向微倾。

射击：左键按下 → `weapon.tryFire(now)`；成功则计算枪口世界坐标（手部位置沿 aim 偏移 12px），生成子弹（本任务先画一条 1px 曳光并立即判定命中调试靶），产生后坐 `recoil += 1` 并以 `recoil *= 0.86^dt` 衰减，镜头 `cam.shake(1.5)`，枪口闪光计时 0.05s。

换弹：`R` 或 `Shift` 触发；`reloadT` 走完调用 `finishReload`；受击时取消。手枪备弹 `Infinity` 且 HUD 显示 `∞`。

- [ ] **Step 4: 测试通过 + 操作验证**

Run: `node --test tests/content.test.js`
Expected: 5 tests PASS。

游戏内截图 `?debug=scene`：玩家持枪指向鼠标、枪口闪光、曳光可见。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 玩家移动、自由瞄准、手枪射击与换弹"
```

---

### Task 5: 僵尸、AI 与波次导演

**Files:**
- Create: `js/waves.js`
- Modify: `js/entities.js`, `js/game.js`
- Test: `tests/waves.test.js`

**Interfaces:**
- Produces: `G.waves.budget(n)`, `G.waves.cost(type)`, `G.waves.compose(n, rng)`, `G.waves.isElite(n)`, `G.waves.breath(n)`
- Produces: `G.entities.Zombie(type, x, fromWater)`；`update(dt, player)`、`hit(zone, damage, dirX)`、`parts`（供命中检测）、`state`（`walk|climb|attack|stagger|dead`）
- Produces: `G.entities.spawnZombie(type, side)`、`G.game.spawnWave(n)`
- Consumes: `G.content.zombies`, `G.level.layout`

- [ ] **Step 1: 写失败测试**

```js
// tests/waves.test.js
const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/waves.js');
const W = globalThis.G.waves;

test('budget grows by 3.5 per wave', () => {
  assert.strictEqual(W.budget(1), 9.5);
  assert.strictEqual(W.budget(5), 23.5);
});

test('compose never overspends and always spawns something', () => {
  for (let n = 1; n <= 20; n++) {
    const list = W.compose(n, () => 0.5);
    const spent = list.reduce((s, t) => s + W.cost(t), 0);
    assert.ok(spent <= W.budget(n) + 1e-9, `wave ${n} overspent ${spent}`);
    assert.ok(list.length > 0, `wave ${n} empty`);
  }
});

test('brutes appear from wave 2, never wave 1', () => {
  assert.ok(!W.compose(1, () => 0.99).includes('brute'));
  assert.ok(W.compose(6, () => 0.99).includes('brute'));
});

test('every 5th wave is elite and breath is 8s', () => {
  assert.strictEqual(W.isElite(5), true);
  assert.strictEqual(W.isElite(6), false);
  assert.strictEqual(W.breath(3), 8);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/waves.test.js`
Expected: FAIL，`G.waves` undefined。

- [ ] **Step 3: 实现 waves.js 与僵尸**

`cost = { walker:1, crawler:1.5, brute:5 }`；`compose` 循环：预算内按波次权重随机选类型，选中的开销超出剩余预算时尝试更便宜的类型，最后剩余 ≥1 补 walker；第 1 波禁用 brute；精英波（`n%5===0`）所有僵尸 hp ×1.25（由 game 应用）。

僵尸：Walker 慢速走向玩家，进入 20px 攻击范围后 `attack`，前摇 0.35s 后造成伤害；Crawler 低姿态、速度 78、距离 <40 时扑咬（冲刺 0.3s）；Brute 移速 24、受击击退 ×0.5、攻击前摇 0.6s、伤害 26。所有僵尸有 `stagger` 计时，受击时 AI 暂停。从水里生成的僵尸先 `climb`：在栈桥边缘停留 0.7s 播放攀爬动画并滴落水花，然后进入 walk。玩家落水（掉出栈桥两端）扣 20 血并复位到最近安全点。

生成：`spawnWave(n)` 读取 `compose`，从左右两端交替入场；每 3 只中 1 只从水中生成，位置在镜头外 ±80px 的水面。波清空后进入 8s 喘息，显示 `WAVE CLEAR`，掉落补给（Task 7 接入）。

- [ ] **Step 4: 测试通过 + 战斗截图**

Run: `node --test tests/waves.test.js`
Expected: 4 tests PASS。

`?debug=horde`：生成 8 只僵尸走向玩家，截图检查骨架朝向、攀爬动画、无报错。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 三类僵尸 AI、攀爬入场与波次预算导演"
```

---

### Task 6: 命中检测、伤害区域与血腥反馈

**Files:**
- Create: `js/combat.js`, `js/particles.js`
- Modify: `js/entities.js`, `js/game.js`, `js/level.js`, `js/sprites.js`
- Test: `tests/combat.test.js`, `tests/content.test.js`

**Interfaces:**
- Produces: `G.combat.mult(zone)`、`G.combat.resolve({damage, zone, pellets})` → `{amount, headshot}`、`G.combat.hitstop(weaponId, headshot)`、`G.combat.shake(weaponId, headshot)`、`G.combat.severApplied(limbDamage, amount)` → `bool`
- Produces: `G.particles.spawnBlood(x, y, dir, count)`、`.spawnGib(x, y, vx, vy, kind)`、`.spawnShell(x, y, dir)`、`.spawnSparks(x, y, n)`、`.spawnSmoke(x, y)`、`.update(dt)`、`.draw(ctx)`、`.clear()`
- Produces: `G.entities.Zombie.prototype.hit(zone, damage, dirX)` → `{killed, headshot, severed}`
- Consumes: `G.gfx.cam`, `G.time`, `G.level.addBlood`

- [ ] **Step 1: 写失败测试**

```js
// tests/combat.test.js
const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/combat.js');
const C = globalThis.G.combat;

test('zone multipliers', () => {
  assert.strictEqual(C.mult('head'), 2.5);
  assert.strictEqual(C.mult('torso'), 1);
  assert.strictEqual(C.mult('limb'), 0.7);
});

test('headshot doubles as flag and multiplies damage', () => {
  const r = C.resolve({ damage: 24, zone: 'head' });
  assert.strictEqual(r.amount, 60);
  assert.strictEqual(r.headshot, true);
});

test('shotgun pellets combine into one damage event', () => {
  const r = C.resolve({ damage: 12, zone: 'torso', pellets: 8 });
  assert.strictEqual(r.amount, 96);
  assert.strictEqual(r.headshot, false);
});

test('hitstop and shake are graded, headshot wins', () => {
  assert.ok(C.hitstop('shotgun', false) > C.hitstop('pistol', false));
  assert.ok(C.hitstop('pistol', true) > C.hitstop('pistol', false));
  assert.ok(C.shake('shotgun', false) > C.shake('smg', false));
  assert.ok(C.shake('pistol', true) >= C.shake('pistol', false));
});

test('limb severs only when accumulated damage crosses 30', () => {
  assert.strictEqual(C.severApplied(10, 15), false);
  assert.strictEqual(C.severApplied(25, 10), true);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/combat.test.js`
Expected: FAIL，`G.combat` undefined。

- [ ] **Step 3: 实现规则与血腥表现**

`combat.js`：

```js
G.combat.mult = function (zone) { return zone === 'head' ? 2.5 : zone === 'limb' ? 0.7 : 1; };
G.combat.resolve = function (o) {
  var pellets = o.pellets || 1;
  return { amount: o.damage * pellets * G.combat.mult(o.zone), headshot: o.zone === 'head' };
};
G.combat.hitstop = function (w, head) {
  var base = w === 'shotgun' ? 0.07 : w === 'smg' ? 0.04 : 0.045;
  return head ? base + 0.03 : base;
};
G.combat.shake = function (w, head) {
  var base = w === 'shotgun' ? 4 : w === 'smg' ? 1.2 : 1.5;
  return head ? base + 1.5 : base;
};
G.combat.severApplied = function (limbDamage, amount) { return limbDamage + amount >= 30; };
```

命中检测：僵尸按 rig 部件生成世界坐标包围盒（头 10×10、躯干 14×24、四肢 8×14），子弹用线段与盒相交，取最近命中；记录 `zone` 与命中点。命中后：

1. `G.time.hitstop(C.hitstop(w, headshot))`；`cam.shake(C.shake(w, headshot))`。
2. 僵尸 `flash = 0.06`，`stagger` 按武器（霰弹 0.28、其他 0.12），击退速度沿子弹方向（brute ×0.5）。
3. `G.particles.spawnBlood(hitX, hitY, dir, headshot ? 26 : 12)`；地面 `G.level.addBlood`。
4. 命中标记 `hitmark = 0.08`，HUD 准星画白色 X。
5. 伤害累计到肢体，`severApplied` 为真时隐藏该肢体并生成断肢实体（翻滚 + 拖血，3 秒淡出，不消失前留在地上）。
6. `headshot` 且致死：`G.time.slowmo(0.25, 0.35)`，头颅被替换为飞出的 gib，额外喷血 40 颗，播放特殊音效。
7. 击杀：尸体保留，`alpha` 在 12 秒内降到 0.55；累计断肢 ≥2 时躯干裂开。

粒子：固定池 600。血为 1–2px 暗红/亮红方块，带重力、空气阻力、碰到 groundY 生成小血渍并消失；骨屑为米白 1px；弹壳为黄铜 2×1px，抛出后落地弹跳一次；火花 1px 橙黄，0.2s 生命；烟为半透明灰圆，向上飘散。

- [ ] **Step 4: 测试通过 + 暴力截图**

Run: `node --test tests/combat.test.js tests/content.test.js`
Expected: 全部 PASS。

`?debug=gore`：生成一只僵尸，1 秒后对其头部开一枪（脚本化），截图应看到血雾、断头、地面血渍、屏幕震动偏移。若过糊则调整粒子尺寸为 1px 整数。

`tests/combat.test.js` 顶部加载顺序为 `core.js` → `combat.js`；`particles.js`/`entities.js` 加载时不得触碰 DOM。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 命中区域、定格震屏、喷血断肢与爆头慢动作"
```

---

### Task 7: 三武器、拾取物与弹药经济

**Files:**
- Modify: `js/entities.js`, `js/game.js`, `js/hud.js`
- Test: `tests/content.test.js`

**Interfaces:**
- Produces: `G.entities.Pickup(kind, x)`；`kind ∈ {ammo_pistol, ammo_shotgun, ammo_smg, medkit}`
- Produces: `G.game.player.weapons`（3 把）、`switchWeapon(i)`、`dropPickup(kind, x)`、`G.entities.applyPickup(player, pickup)`
- Consumes: `G.combat`, `G.waves`

- [ ] **Step 1: 写失败测试**

```js
test('shotgun spread and smg spread are distinct', () => {
  const sg = G.content.weapons.shotgun;
  const smg = G.content.weapons.smg;
  assert.strictEqual(sg.pellets, 8);
  assert.ok(sg.spread > smg.spread);
});

test('pickup restores ammo and medkit heals', () => {
  const pl = { hp: 40, weapons: {} };
  pl.weapons.shotgun = new G.entities.Weapon('shotgun');
  pl.weapons.shotgun.reserve = 0;
  G.entities.applyPickup(pl, { kind: 'ammo_shotgun', amount: 12 });
  assert.strictEqual(pl.weapons.shotgun.reserve, 12);
  G.entities.applyPickup(pl, { kind: 'medkit', amount: 30 });
  assert.strictEqual(pl.hp, 70);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/content.test.js`
Expected: FAIL，`applyPickup is not a function`。

- [ ] **Step 3: 实现武器差异、拾取与弹药**

霰弹：8 弹丸，每颗独立射线，总散布 ±9°；每颗伤害 12，命中同一僵尸的弹丸合并伤害但只触发一次定格；强击退 180。冲锋枪：±5° 连发扩散，射速 0.075，后坐抖动使准星扩散，连发 8 发后扩散 +80%。手枪：无扩散、伤害 24、换弹 1.0s。

切换：`1/2/3` 与滚轮；切枪 0.25s 不可射击。每把枪保留独立弹药状态。

掉落：波次清空时在玩家附近生成 2 个拾取（60% 弹药、40% 医疗），弹药种类按当前武器权重；击杀有 6% 概率掉小弹药。拾取物上下浮动、有微光，接触即生效并播放音效。

初始：玩家拥有手枪（12/∞）、霰弹枪（6/36）、冲锋枪（30/120）；霰弹与冲锋枪备弹为 0 时仍可用完弹匣，之后只能靠拾取。

- [ ] **Step 4: 测试通过 + 试玩验证**

Run: `node --test tests/content.test.js`
Expected: 全部 PASS。

手动用 Edge 打开游戏，确认切枪、换弹、拾取生效。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 霰弹/冲锋枪差异、切枪、弹药掉落与医疗包"
```

---

### Task 8: 程序化音频与氛围

**Files:**
- Create: `js/audio.js`
- Modify: `index.html`（脚本顺序）, `js/game.js`, `js/entities.js`, `js/level.js`
- Test: `tests/core.test.js`

**Interfaces:**
- Produces: `G.audio.init()`（首次用户手势后调用）、`G.audio.shot(weaponId)`、`.flesh(headshot)`、`.groan(pan)`、`.reload()`、`.shell()`、`.kick()`、`.pickup()`、`.thunder()`、`.foghorn()`、`.heartbeat()`、`.setMuted(bool)`、`.muted`
- Consumes: 无

- [ ] **Step 1: 写失败测试**

```js
test('audio API is safe before init', () => {
  assert.doesNotThrow(() => {
    G.audio.shot('shotgun');
    G.audio.flesh(true);
    G.audio.setMuted(true);
  });
  assert.strictEqual(G.audio.muted, true);
});
```

该测试追加到 `tests/core.test.js` 前，需在文件顶部添加 `require('../js/audio.js');`。

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/core.test.js`
Expected: FAIL，`G.audio` undefined。

- [ ] **Step 3: 实现 WebAudio 合成**

初始化：`new (window.AudioContext || window.webkitAudioContext)()`，主总线 `GainNode → DynamicsCompressor → destination`，主音量 0.7；`?muted=1` 或 `M` 切换。

音源（全部实时合成，时长 ≤1s）：

- `shot('shotgun')`：噪声 buffer 0.25s → lowpass 1200Hz → 增益包络（5ms 起音，180ms 衰减）+ 60Hz 正弦砰击；
- `shot('pistol')`：0.09s 噪声 → highpass 400Hz，音高随机 ±8%；
- `shot('smg')`：0.06s 噪声，更薄，音高随机 ±12%；
- `flesh(head)`：短噪声 → bandpass 300Hz，`head` 追加 80Hz 冲击与更长尾音；
- `groan(pan)`：锯齿 70–110Hz + LFO 6Hz 颤音 → lowpass 500Hz，`StereoPanner` 按 pan；
- `reload`：两声短促金属 click（方波 1kHz，5ms）；`shell`：高频短促 ping；`kick`：低频 thump；
- 环境：持续滤波噪声做风与雨，低频正弦脉冲做水拍，每 25–40 秒随机雾笛/雷声；
- 低血量：`heartbeat` 每 0.9s 双脉冲，音量随血量降低增强。

`init` 前所有方法直接返回，`setMuted` 仍记录状态。模块加载时不创建 AudioContext。

- [ ] **Step 4: 测试通过 + 听感检查**

Run: `node --test tests/core.test.js`
Expected: 全部 PASS。

手动试玩：开枪、爆头、换弹、受击、低血量，确认无爆音、无静音失败。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: WebAudio 程序化枪声、血肉、环境音与心跳"
```

---

### Task 9: HUD、标题、暂停与结算

**Files:**
- Create: `js/hud.js`
- Modify: `js/game.js`, `index.html`, `js/audio.js`
- Test: `tests/core.test.js`, `tests/content.test.js`

**Interfaces:**
- Produces: `G.hud.draw(ctx, state)`、`G.hud.title(ctx, t)`、`G.hud.pause(ctx)`、`G.hud.gameover(ctx, stats)`、`G.hud.banner(text, sub)`、`G.hud.best()`、`G.hud.saveBest(score)`
- Produces: 状态机 `G.game.state ∈ {'title','playing','paused','dead'}`；`G.game.stats {kills, headshots, shots, hits, wave, time}`
- Consumes: `G.sprites.font`, `G.game.*`

- [ ] **Step 1: 写失败测试**

```js
test('score and best score formatting', () => {
  assert.strictEqual(G.hud.formatScore(12345), '12,345');
  assert.strictEqual(G.hud.formatTime(65), '01:05');
});

test('best score persists via injected storage', () => {
  const mem = {};
  G.hud.useStorage({ getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = String(v); } });
  assert.strictEqual(G.hud.best(), 0);
  G.hud.saveBest(4200);
  assert.strictEqual(G.hud.best(), 4200);
});
```

该组测试追加到 `tests/core.test.js` 前，需在文件顶部添加 `require('../js/hud.js');`。

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/core.test.js`
Expected: FAIL，`G.hud` undefined。

- [ ] **Step 3: 实现 UI 与状态机**

标题：`DOCK OF THE DEAD` 大号像素字 + 红色血滴装饰，下面按顺序显示 `WASD MOVE / MOUSE AIM / LMB FIRE / R RELOAD / Q KICK / 1-3 WEAPON`，底部 `CLICK TO START` 呼吸闪烁；背景为雨夜码头空镜 + 缓慢视差。

HUD：左下生命条（宽度按 hp，低于 30 时红色脉动 + 屏幕边缘血渍 vignette）；右下弹药大号数字 `12 / ∞`，换弹时显示进度条与 `RELOADING`；顶部左 `WAVE 3`，顶部右 `SCORE 1,240`；命中时准星白 X 0.08s，击杀时准星短暂变红。

横幅：波次开始 `WAVE N` 从上方落下，精英波 `ELITE WAVE`；波清空 `WAVE CLEAR` + 8 秒倒计时。

暂停：`Esc` 切换，半透明黑遮罩 + `PAUSED` + 操作说明 + `M MUTE`；暂停时世界不更新但画面继续绘制。

结算：死亡后 1.2s 慢动作结束显示；统计存活波次、击杀、爆头、命中率、最高分；`R RESTART`。最高分用 `localStorage`，不可用时静默降级到内存。`useStorage` 允许测试注入内存实现。

- [ ] **Step 4: 测试通过 + 截图检查**

Run: `node --test tests/core.test.js tests/content.test.js`
Expected: 全部 PASS。

分别截图 `?screen=title`、游戏内 HUD、`?debug=dead`：确认居中、无溢出、像素字清晰。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: HUD、标题/暂停/结算界面与最高分"
```

---

### Task 10: 调优、性能、调试参数与交付

**Files:**
- Modify: 所有模块（调参为主）、`README.md`
- Test: 全量测试 + 手动验收

**Interfaces:**
- Produces: `?debug=1`（FPS/碰撞盒/实体数）、`?god=1`（无敌）、`?wave=N`（起始波）、`?muted=1`、`?seed=N`（可选）
- Produces: `README.md` 中文说明：玩法、操作、运行方式、调试参数、已知限制

- [ ] **Step 1: 全量测试**

Run: `node --test tests/`
Expected: 全部 PASS，无 skip。

- [ ] **Step 2: 加入调试与降级**

- `?wave=N`：启动时直接跳到第 N 波。
- `?god=1`：玩家不扣血。
- `?debug=1`：FPS、实体/粒子计数、僵尸/子弹碰撞盒描边（红色）。
- 掉帧降级：连续 2 秒平均帧时间 > 22ms 时，粒子上限降到 300、关闭雨丝；恢复后不自动升回。
- 暂停时 `visibilitychange` 自动暂停，避免切页后暴毙。

- [ ] **Step 3: 平衡与手感终调**

按以下目标调参：第 1 波 30 秒内清完；霰弹 3 米内一枪打残 Walker；Brute 需要约 12 发手枪或 3 发霰弹；玩家连续被围 3 秒内应感到危险但可通过踹击脱身；波间喘息足够换弹与捡补给。逐项手动验证并记录改动。

- [ ] **Step 4: 手动验收清单**

在 Edge/Chrome 中逐项确认：

- [ ] 双击 `index.html` 直接进入标题，无需服务器。
- [ ] 鼠标瞄准跟手，左右移动与跳跃正常，踹击能击退僵尸。
- [ ] 三种武器射速、伤害、弹药、后坐手感可区分。
- [ ] 每次命中都有定格/震屏/白闪/喷血/命中标记；爆头有慢动作与头颅爆裂。
- [ ] 持续攻击可打断肢，断肢落地翻滚并留血，尸体残留。
- [ ] 僵尸从两端与水中入场，波次递增，精英波有提示。
- [ ] 换弹、拾取、低血量心跳、死亡结算、重开、最高分全部正常。
- [ ] 按 `M` 静音；切到其他标签页再回来游戏处于暂停。
- [ ] 无控制台报错，1080p 下稳定 60fps。

- [ ] **Step 5: 清理与提交**

删除调试残留代码（保留 debug 参数）、确认每个 js 文件 ≤500 行、更新 README，最后：

```bash
git add -A && git commit -m "chore: 调优、性能降级、调试参数与中文说明"
```

---

## 自检记录

- **Spec 覆盖**：技术方案（Task 1/2）、世界与场景（Task 3）、玩家（Task 4）、武器（Task 4/7）、僵尸（Task 5）、打击感（Task 6）、音频（Task 8）、UI（Task 9）、性能与调试（Task 10）均有对应任务。
- **接口一致性**：`G.combat.resolve` 返回 `{amount, headshot}`，Task 6/7 均按此使用；`G.entities.applyPickup(player, pickup)` 在 Task 7 定义并使用；`G.hud.useStorage` 只为测试注入，生产默认 `localStorage`。
- **无占位符**：所有步骤均给出具体文件、命令或代码。
- **补充说明**：Task 5 的僵尸 AI 与 Task 6 的命中共用受击入口，统一为 `hit(zone, damage, dirX)`，Task 5/6 均按此签名实现；玩家的受击方法名为 `takeDamage(n, dirX)`。
