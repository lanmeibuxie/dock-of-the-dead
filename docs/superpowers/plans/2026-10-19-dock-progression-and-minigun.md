# 尸潮成长、波间强化与转轮机枪 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有码头僵尸生存游戏上加入逐波成长、新僵尸种类、波间三选一中文强化卡，以及可体验的转轮机枪。

**Architecture:** 纯规则（成长系数、卡池、属性叠加）拆成无 DOM 模块，用 Node 测试驱动；中文卡面使用宋体 12px 二值化后内嵌的位图字体，与像素画风一致；升级流程作为新的游戏状态 `upgrade` 接入现有状态机。

**Tech Stack:** 原生 ES2017、Canvas 2D、WebAudio、`node --test`、生成器使用 Python + Pillow（仅开发期）。运行时零依赖。

**Spec:** `docs/superpowers/specs/2026-10-19-dock-progression-and-minigun-design.md`

## Global Constraints

- 内部分辨率 480×270，`imageSmoothingEnabled = false`，整数倍缩放。
- 零外部运行时素材；中文位图字体生成后内嵌为 JS。
- 每个 `js/*.js` ≤ 500 行；模块加载不触碰 DOM。
- 僵尸成长：生命 `1+0.10*(n-1)`，伤害 `1+0.04*(n-1)`，移速 `min(1.35, 1+0.012*(n-1))`。
- 精英波：生命 ×1.25、分数 ×2（保留）。
- 新僵尸：Runner 第 3 波、Bomber 第 5 波解锁；预算消耗 2 / 3。
- 强化：每波清空三选一，卡可叠加，满级排除；选卡后喘息 4 秒。
- 稀有度权重：≤2 波 `[0.75,0.25,0]`；3–5 波 `[0.6,0.32,0.08]`；6+ `[0.45,0.4,0.15]`。
- 转轮机枪：伤害 9、射速 0.03s、弹匣 150、备弹 150、换弹 3.2s、扩散 0.10、击退 22、后坐 0.35、枪口 26、旋转 0.55s、松开回落 0.5s、旋转移速 -35%。
- 转轮机枪定格：普通 0.012s、爆头 0.025s；40ms 内只触发一次。
- 属性上限：暴击率 60%、移速加成 60%、击退加成 150%、后坐减免 70%；伤害/射速/换弹/弹匣/拾取/弹药加成各封顶 300%/200%/200%/300%/300%/300%。
- 波次组成与原测试保持兼容：第 1 波不得出现 Brute/Runner/Bomber。

---

## 文件结构

```
js/upgrades.js       卡池、稀有度抽取、属性应用（纯逻辑）
js/cnfont.js         生成的中文位图字体（不要手改）
tools/genfont.py     中文字体生成器
js/core.js           新增武器/僵尸配置
js/waves.js          成长系数、新品种权重
js/player.js         mods、syncMods、stepSpin、第 4 武器
js/entities.js       Runner/Bomber、爆炸触发、minigun 弹药拾取
js/combat.js         转轮机枪定格分级
js/hud.js            4 槽 HUD、升级卡界面、旋转条、中文提示、像素指针
js/game.js           upgrade 状态、爆炸队列、卡牌应用
js/audio.js          转轮旋转音、爆炸音
tests/upgrades.test.js
tests/font.test.js
tests/waves.test.js  追加成长/解锁测试
tests/content.test.js 追加 minigun/旋转/mod 测试
README.md
```

---

### Task 1: 内容配置、成长系数与波次组成

**Files:**
- Modify: `js/core.js`, `js/waves.js`
- Test: `tests/waves.test.js`, `tests/content.test.js`

**Interfaces:**
- Produces: `G.content.weapons.minigun`
- Produces: `G.content.zombies.runner`, `G.content.zombies.bomber`
- Produces: `G.waves.scale(n)` → `{ hp, damage, speed }`
- Produces: `G.waves.cost('runner') === 2`, `cost('bomber') === 3`

- [ ] **Step 1: 写失败测试**

```js
// tests/waves.test.js 追加
test('zombies scale every wave with speed cap', () => {
  assert.deepStrictEqual(W.scale(1), { hp: 1, damage: 1, speed: 1 });
  assert.ok(Math.abs(W.scale(11).hp - 2) < 1e-9);
  assert.ok(W.scale(11).damage > 1.3);
  assert.ok(W.scale(60).speed <= 1.35 + 1e-9);
});

test('runner unlocks at wave 3, bomber at wave 5', () => {
  assert.ok(!W.compose(2, () => 0.99).includes('runner'));
  assert.ok(W.compose(3, () => 0.99).includes('runner'));
  assert.ok(!W.compose(4, () => 0.99).includes('bomber'));
  assert.ok(W.compose(5, () => 0.99).includes('bomber'));
});
```

```js
// tests/content.test.js 追加
test('minigun and new zombies are configured', () => {
  const m = G.content.weapons.minigun;
  assert.strictEqual(m.mag, 150);
  assert.strictEqual(m.rate, 0.03);
  assert.strictEqual(m.reserve, 150);
  assert.strictEqual(G.content.zombies.runner.damage, 9);
  assert.strictEqual(G.content.zombies.bomber.fuse, 0.7);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/waves.test.js tests/content.test.js`
Expected: FAIL（`W.scale` 不存在 / 配置缺失）

- [ ] **Step 3: 实现配置与规则**

`core.js` 的 `G.content.weapons` 追加：

```js
minigun: {
  id: 'minigun', name: 'MINIGUN', damage: 9, rate: 0.03, mag: 150, reserve: 150,
  pellets: 1, spread: 0.10, reload: 3.2, knock: 22, recoil: 0.35, muzzle: 26,
  spinUp: 0.55, spinDown: 0.5, moveSlow: 0.35
}
```

`G.content.zombies` 追加：

```js
runner: { id: 'runner', hp: 38, speed: 100, damage: 9, reach: 16, attackRate: 0.9, windup: 0.16, width: 12, height: 34, score: 15 },
bomber: { id: 'bomber', hp: 70, speed: 30, damage: 26, reach: 26, attackRate: 2, windup: 0.5, width: 18, height: 40, score: 25, fuse: 0.7, bombRadius: 60, chainRadius: 50, chainDamage: 45 }
```

`waves.js`：

```js
var COST = { walker: 1, crawler: 1.5, brute: 5, runner: 2, bomber: 3 };

scale: function (n) {
  return {
    hp: 1 + 0.10 * (n - 1),
    damage: 1 + 0.04 * (n - 1),
    speed: Math.min(1.35, 1 + 0.012 * (n - 1))
  };
}
```

`pickType` 追加选项（保持 walker 第一、新类型在 brute 之后，保证 rng=0.99 时优先选中新类型）：

```js
if (n >= 3) opts.push({ t: 'runner', w: 0.45 + n * 0.01 });
if (n >= 5) opts.push({ t: 'bomber', w: 0.25 + n * 0.01 });
```

- [ ] **Step 4: 跑测试并截图确认场景无报错**

Run: `node --test`
Expected: 全部 PASS。

Run: `node tools/shot.js "http://localhost:8765/index.html?debug=horde" "check.png" 300 horde`
Expected: `NO PAGE ERRORS`。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 僵尸逐波成长、Runner/Bomber 与转轮机枪配置"
```

---

### Task 2: 强化卡池与属性叠加

**Files:**
- Create: `js/upgrades.js`
- Test: `tests/upgrades.test.js`

**Interfaces:**
- Produces: `G.upgrades.POOL`（18 张卡，字段 `id,name,desc,rarity,max,icon,stats`）
- Produces: `G.upgrades.weights(wave)` → `[c,r,e]`
- Produces: `G.upgrades.roll(wave, rng, levels)` → 3 张不重复且未满级的卡
- Produces: `G.upgrades.apply(player, card, levels)` → `bool`
- Produces: `G.upgrades.levelOf(id, levels)`

- [ ] **Step 1: 写失败测试**

```js
// tests/upgrades.test.js
const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/gfx.js');
require('../js/level.js');
require('../js/player.js');
require('../js/upgrades.js');
const G = globalThis.G;

test('roll returns three distinct available cards', () => {
  const cards = G.upgrades.roll(6, () => 0.42, {});
  assert.strictEqual(cards.length, 3);
  assert.strictEqual(new Set(cards.map(c => c.id)).size, 3);
});

test('maxed cards are excluded', () => {
  const levels = {};
  for (const c of G.upgrades.POOL) if (c.rarity === 2) levels[c.id] = c.max;
  for (let i = 0; i < 30; i++) {
    const cards = G.upgrades.roll(9, Math.random, levels);
    assert.ok(cards.every(c => c.rarity !== 2));
  }
});

test('rarity weights shift with wave', () => {
  assert.deepStrictEqual(G.upgrades.weights(1), [0.75, 0.25, 0]);
  assert.deepStrictEqual(G.upgrades.weights(4), [0.6, 0.32, 0.08]);
  assert.deepStrictEqual(G.upgrades.weights(9), [0.45, 0.4, 0.15]);
});

test('damage cards stack additively', () => {
  const p = new G.entities.Player(300);
  const dmg = G.upgrades.POOL.find(c => c.id === 'damage');
  assert.strictEqual(G.upgrades.apply(p, dmg, {}), true);
  assert.strictEqual(G.upgrades.apply(p, dmg, {}), true);
  assert.ok(Math.abs(p.mods.damage - 0.2) < 1e-9);
});

test('hp card raises max hp and heals', () => {
  const p = new G.entities.Player(300);
  p.hp = 50;
  const hp = G.upgrades.POOL.find(c => c.id === 'hp');
  G.upgrades.apply(p, hp, {});
  assert.strictEqual(p.maxHp, 115);
  assert.strictEqual(p.hp, 65);
});

test('mag card updates every weapon magazine size', () => {
  const p = new G.entities.Player(300);
  const mag = G.upgrades.POOL.find(c => c.id === 'mag');
  G.upgrades.apply(p, mag, {});
  assert.strictEqual(p.weapons.pistol.magSize, 14);
  assert.strictEqual(p.weapons.minigun.magSize, 173);
});

test('crit/steady cards change combat stats', () => {
  const p = new G.entities.Player(300);
  const crit = G.upgrades.POOL.find(c => c.id === 'crit');
  const steady = G.upgrades.POOL.find(c => c.id === 'steady');
  G.upgrades.apply(p, crit, {});
  G.upgrades.apply(p, steady, {});
  assert.ok(Math.abs(p.mods.crit - 0.08) < 1e-9);
  assert.ok(Math.abs(p.mods.recoil + 0.25) < 1e-9);
  assert.ok(Math.abs(p.mods.fireRate - 0.05) < 1e-9);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/upgrades.test.js`
Expected: FAIL，`G.upgrades` undefined。

- [ ] **Step 3: 实现 upgrades.js**

按 spec 第 4 节写入 18 张卡（名称/说明/稀有度/上限/`stats`）。`roll`：

1. `weights(wave)` 选出稀有度；该稀有度没有可用卡时回退到任意可用卡；
2. 每轮从未选中的可用卡里移除已选；
3. 最多返回 3 张，不足则返回实际数量。

`apply`：

```js
apply: function (player, card, levels) {
  levels = levels || {};
  var lv = levels[card.id] || 0;
  if (lv >= card.max) return false;
  levels[card.id] = lv + 1;
  var s = card.stats;
  for (var k in s) {
    if (k === 'maxHp') player.maxHp += s[k];
    else if (k === 'heal') player.heal(s[k]);
    else player.mods[k] = (player.mods[k] || 0) + s[k];
  }
  player.syncMods();
  return true;
}
```

- [ ] **Step 4: 运行测试**

Run: `node --test tests/upgrades.test.js`
Expected: 全部 PASS（此时 Player 已有 `mods/syncMods/heal/minigun`，由 Task 3 提供；若顺序执行，先完成 Task 3 的 Player 部分再回跑本测试）。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 18 张强化卡、稀有度抽取与属性叠加"
```

---

### Task 3: 玩家属性、转轮机枪与中文字体

**Files:**
- Modify: `js/player.js`, `js/sprites.js`, `js/core.js`
- Create: `tools/genfont.py`, `js/cnfont.js`
- Test: `tests/content.test.js`, `tests/font.test.js`

**Interfaces:**
- Produces: `Player.mods`，`Player.syncMods()`，`Player.stepSpin(dt, holding)`，`Player.spin`
- Produces: `Player.prototype.heal(n)`、`Player.prototype.speedScale()`
- Produces: `Weapon.magSize/rateMult/reloadMult`，`Weapon.tryFire` 使用射速倍率，`startReload` 使用换弹倍率
- Produces: `G.cnfont.draw(ctx,text,x,y,color,scale,align)`、`G.cnfont.width(text,scale)`、`G.cnfont.has(ch)`
- Produces: `G.sprites.gunArt.minigun`

- [ ] **Step 1: 写失败测试**

```js
// tests/content.test.js 追加
const assert2 = require('node:assert');

test('minigun has a large magazine and uses rate multiplier', () => {
  const w = new G.entities.Weapon('minigun');
  assert.strictEqual(w.ammo, 150);
  assert.strictEqual(w.magSize, 150);
  assert.strictEqual(w.def.rate, 0.03);
});

test('player spin reaches full and gates minigun fire', () => {
  const p = new G.entities.Player(300);
  p.current = 'minigun';
  p.weapon().ammo = 150;
  p.stepSpin(0.55, true);
  assert.ok(Math.abs(p.spin - 1) < 1e-9);
  assert.ok(p.fire() !== null);
  p.stepSpin(0.5, false);
  assert.ok(p.spin < 1);
});

test('player mods update weapon rate and magazine', () => {
  const p = new G.entities.Player(300);
  p.mods.fireRate = 0.5;
  p.mods.mag = 0.2;
  p.syncMods();
  assert.ok(Math.abs(p.weapons.pistol.rateMult - 1.5) < 1e-9);
  assert.strictEqual(p.weapons.pistol.magSize, 14);
});

test('damage and crit mods flow into fire()', () => {
  const p = new G.entities.Player(300);
  p.mods.damage = 0.5;
  p.mods.crit = 1;
  p.syncMods();
  const shot = p.fire();
  assert.ok(shot.amount > 0);
  assert.strictEqual(shot.crit, true);
});
```

```js
// tests/font.test.js
const test = require('node:test');
const assert = require('node:assert');
require('../js/core.js');
require('../js/upgrades.js');
require('../js/cnfont.js');
const G = globalThis.G;

test('font covers every card and UI character', () => {
  const text = G.upgrades.POOL.map(c => c.name + c.desc).join('') + '选择强化第波结束点击或按获得普通稀有史诗';
  for (const ch of text) {
    if (/[\u4e00-\u9fff]/.test(ch)) assert.ok(G.cnfont.has(ch), 'missing glyph ' + ch);
  }
});

test('font width is proportional and positive', () => {
  assert.ok(G.cnfont.width('伤害') > G.cnfont.width('A'));
  assert.ok(G.cnfont.width('') === 0);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/content.test.js tests/font.test.js`
Expected: FAIL（方法/字体不存在）。

- [ ] **Step 3: 实现 Player/Weapon 与字体生成器**

Player：

```js
this.mods = { damage:0, fireRate:0, reload:0, mag:0, speed:0, crit:0, critMult:2,
  pierce:0, knock:0, lifesteal:0, pickup:0, ammo:0, recoil:0 };
this.spin = 0;
this.order = ['pistol', 'shotgun', 'smg', 'minigun'];
this.weapons.minigun = new Weapon('minigun');
```

`syncMods()` 应用 Global Constraints 中的上限，然后对每把武器同步：

```js
w.rateMult = 1 + this.mods.fireRate;
w.reloadMult = 1 + this.mods.reload;
w.magSize = Math.max(1, Math.round(w.def.mag * (1 + this.mods.mag)));
```

`stepSpin(dt, holding)`：

```js
if (holding) this.spin = Math.min(1, this.spin + dt / 0.55);
else this.spin = Math.max(0, this.spin - dt / 0.5);
```

`update()`：

- 数字键 4 切枪；滚轮模 4；
- 旋转：`var holding = (G.input.mouse.down || G.input.mouse.clicked) && this.current === 'minigun' && !w.reloading; this.stepSpin(dt, holding);`
- 移速：`target = move * 110 * (1 + mods.speed) * (this.current === 'minigun' ? 1 - 0.35 * this.spin : 1)`；
- `fire()`：minigun 且 `spin < 1` 返回 null；返回 `{ amount, crit, pierce, knockScale }`；
  每发按 `def.damage * (1 + mods.damage)`、`crit = G.chance(mods.crit)`；
- 换弹/切枪把 `spin = 0`；
- `heal(n)` 与 `speedScale()`。

`sprites.js`：新增 `minigun` 枪械像素图（28×9，双排枪管 + 弹链箱，pivot `[3,7]`），
`drawRig` 在 `pose.spin > 0.6` 时给枪管加 1px 高光闪烁。

字体生成器 `tools/genfont.py`：

- 读取 `js/*.js` 中所有 `[\u4e00-\u9fff]` 字符 + ASCII 0x20–0x7E；
- 使用 `C:/Windows/Fonts/simsun.ttc` 12px，`ImageDraw.text` 渲染到 16×16，灰度阈值 100；
- 输出 `js/cnfont.js`：`G.cnfont.glyphs = { '伤': [w,h,advance,"hexrow",...] }`，
  中文 advance 13、ASCII 取字宽 +1；
- 渲染函数逐 bit `fillRect`，支持 scale/align，缺字用 `?`。

- [ ] **Step 4: 生成字体并跑测试**

Run: `python tools/genfont.py`
Run: `node --test`
Expected: 全部 PASS。

Run: `node tools/shot.js "http://localhost:8765/index.html?debug=upgrade" "fontcheck.png" 500 upgrade`
（Task 6 完成后可用；此前可用临时调试页确认字体截图，不得跳过字形检查）

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 玩家属性系统、转轮机枪与中文像素字体"
```

---

### Task 4: 新僵尸 AI、爆炸与弹药拾取

**Files:**
- Modify: `js/entities.js`, `js/game.js`, `js/sprites.js`, `js/core.js`
- Test: `tests/waves.test.js`, `tests/content.test.js`

**Interfaces:**
- Produces: `Zombie.damage`、`Zombie.speed`（由成长系数写入，AI 读取）
- Produces: `Zombie.exploded`、`Zombie.boomQueued`
- Produces: `G.game.queueBoom(z)`、`G.game.explodeBomber(z)`（内部接口）
- Produces: `Pickup` 支持 `ammo_minigun`，`applyPickup` 映射到 `minigun`

- [ ] **Step 1: 写失败测试**

```js
// tests/content.test.js 追加
test('runner and bomber have distinct combat profiles', () => {
  assert.ok(G.content.zombies.runner.speed > G.content.zombies.walker.speed * 2);
  assert.strictEqual(G.content.zombies.bomber.bombRadius, 60);
});

test('minigun ammo pickup fills reserve', () => {
  const p = new G.entities.Player(300);
  p.weapons.minigun.reserve = 0;
  G.entities.applyPickup(p, { kind: 'ammo_minigun', amount: 60 });
  assert.strictEqual(p.weapons.minigun.reserve, 60);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/content.test.js`
Expected: FAIL（映射不存在 / 配置缺失）。

- [ ] **Step 3: 实现**

- `spawnOne()`：生成后写入 `sc = G.waves.scale(waveNo)`：
  ```js
  z.maxHp = Math.round(def.hp * sc.hp * (elite ? 1.25 : 1));
  z.hp = z.maxHp; z.damage = def.damage * sc.damage; z.speed = def.speed * sc.speed;
  ```
- `Zombie.update` 中所有 `this.def.damage/speed` 改为 `this.damage/this.speed`。
- Runner：`walkPhase` 增量用 14，攻击前摇用 def.windup；不加远程。
- Bomber：
  - `walk` 中 `dist < 46` → `state='fuse'; fuseT=0.7; return;`
  - `update` 处理 `fuse`：`fuseT -= dt; if (<=0) G.game.explodeBomber(this);`
  - `hit()` 致死且 type==='bomber' 时 `G.game.queueBoom(this)`；
  - `draw()` 在引信期间绘制脉动绿色光晕。
- 调色板：`sprites.js` 增加 Runner（冷灰皮肤/暗红衣服）与 Bomber（病态黄绿）两套。
- 游戏爆炸队列：

```js
var booms = [];
function queueBoom(z) {
  if (z.boomQueued || z.exploded) return;
  z.boomQueued = true;
  booms.push({ z: z, t: 0.06 });
}
function explodeBomber(z) {
  if (z.exploded) return;
  z.exploded = true; z.dead = true; z.deathT = 0;
  z.hide = { torso:true, head:true, armF:true, armB:true, legF:true, legB:true };
  // 玩家、周围僵尸、粒子、震屏、音效、连锁 queueBoom
}
```

- 爆炸对玩家伤害按距离衰减，对半径 50 内僵尸造成 45；连锁引爆其他 Bomber。
- `ammo_minigun`：`Pickup.amount = 60`，`applyPickup` 映射、`lootKind`、拾取图标颜色。
- 波次清空时，先掉 2 个补给再进入升级状态（Task 5）。

- [ ] **Step 4: 运行测试 + 自动化验证**

Run: `node --test`
Expected: 全部 PASS。

Run: `node tools/shot.js "http://localhost:8765/index.html?debug=horde" "zombies.png" 300 horde`
Expected: `NO PAGE ERRORS`；截图可见新类型（调试生成列表追加 runner/bomber）。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: Runner/Bomber AI、连锁爆炸与转轮机枪弹药"
```

---

### Task 5: 升级界面与状态机

**Files:**
- Modify: `js/game.js`, `js/hud.js`, `index.html`
- Test: 手动截图 + `node --test`

**Interfaces:**
- Produces: `G.game.state === 'upgrade'`
- Produces: `G.hud.CARD_RECTS`（3 个 `{x,y,w,h}`）
- Produces: `G.hud.upgrade(ctx, { cards, levels, wave, hover })`
- Produces: `G.hud.cursor(ctx, mouse)`、中文提示 `toastText/toastT` 的绘制

- [ ] **Step 1: 实现状态与选卡流程**

- `openUpgrade()`：清空波次后调用：
  ```js
  setState('upgrade'); waveState = 'upgrade';
  upgradeCards = G.upgrades.roll(waveNo, Math.random, upgradeLevels);
  spawnLoot(player.x - 55); spawnLoot(player.x + 65);
  ```
- `applyUpgrade(i)`：调用 `G.upgrades.apply`，成功后：
  ```js
  setState('playing'); waveState = 'breath'; breathT = 4;
  toastText = '获得：' + card.name; toastT = 1.6;
  ```
- 循环中处理 `upgrade`：
  - `G.level.update(dt)` 与粒子更新；
  - 鼠标悬停按 `G.hud.CARD_RECTS` 命中；
  - `mouse.clicked` 选择悬停卡；`Digit1/2/3` 直接选择；
  - `Escape` 不响应（必须选卡）。
- 绘制：`drawWorld()` 末尾在 `upgrade` 状态调用 `G.hud.upgrade(...)`；
  升级界面不画准星，改画像素箭头指针。
- `?debug=upgrade`：启动后直接清空波次并打开三选一，便于截图/验证。

- [ ] **Step 2: 实现卡面绘制**

```
标题「选择强化」 scale 2，y=22
副标题「第 5 波结束」 scale 1，y=48
卡片：x=26/174/322，y=64，132×150
  1px 稀有度边框 + 2px 高亮（hover 上浮 2px）
  24×24 图标（程序化像素图，按 icon id 切换）
  名称（12px 中文）
  说明（12px，自动换行，最多 3 行）
  稀有度文字（普通/稀有/史诗）
  层数圆点：当前层/上限
底部「点击或按 1 / 2 / 3 选择」
```

- [ ] **Step 3: 截图验证**

Run: `node tools/shot.js "http://localhost:8765/index.html?debug=upgrade" "upgrade.png" 600 upgrade`
Expected：三张中文卡清晰、无报错；用 read 查看截图，确认字号、换行、边框与像素风格一致。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: 波间三选一升级界面与 upgrade 状态机"
```

---

### Task 6: HUD、转轮旋转条、音效与中文提示

**Files:**
- Modify: `js/hud.js`, `js/game.js`, `js/audio.js`, `js/player.js`
- Test: `node --test` + 交互脚本

**Interfaces:**
- Produces: HUD 4 个武器槽；准星下方旋转进度条
- Produces: `G.audio.minigunSpin()`、`G.audio.explosion()`
- Produces: 选卡后中文 toast

- [ ] **Step 1: HUD 与旋转条**

- `slots = ['pistol','shotgun','smg','minigun']`，起点左移至 `G.W - 122`。
- 当前为 minigun 且 `spin > 0` 时，在准星下方 8px 画 18×2 的旋转条：
  `spin >= 1` 时使用暖黄，未满使用灰白。
- 暂停/标题操作提示追加 `4 MINIGUN`。
- 选卡后中文提示：`G.cnfont.draw(ctx, toastText, G.W/2, 120, '#ffc46b', 2, 'center')`，按 `toastT` 淡出。

- [ ] **Step 2: 音效**

- `minigunSpin()`：噪声 + 低频锯齿，0.35s 上扬；`spin` 从 0 跨过 0.1 时调用一次。
- `explosion()`：低频 sine 60→24 + 长噪声 lowpass + 短促高频爆裂；Bomber 爆炸调用。
- 转轮机枪开火复用 `shot('minigun')` 分支（短促、明亮、随机 ±10%）。

- [ ] **Step 3: 交互验证**

Run:
```bash
node tools/shot.js "http://localhost:8765/index.html?debug=horde" "minigun.png" 1500 minigun
```
在 `tools/shot.js` 增加 `minigun` 场景：按 `4`，瞄准最近僵尸，按住左键 1.2s，断言：
`current === 'minigun'`、`spin === 1`、`ammo < 150`、`stats.hits > 0`、无报错。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: 四武器 HUD、转轮旋转条与旋转/爆炸音效"
```

---

### Task 7: 平衡、性能与验收

**Files:**
- Modify: 各模块调参、`README.md`
- Test: 全量测试 + 模拟 + 截图

**Interfaces:**
- Produces: `?debug=minigun`（可选）、README 更新

- [ ] **Step 1: 全量测试**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 2: 自动模拟 3–5 波**

Run: `node tools/sim.js "http://localhost:8765/index.html?god=1&debug=1" 60`
Expected：FPS 保持 60；波次推进；无报错。
再运行一次带升级选择的模拟：在 `sim.js` 的自动射击逻辑里，当 `state === 'upgrade'` 时按 `Digit1` 选第一张卡；检查 60 秒内至少完成 2 次升级。

- [ ] **Step 3: 平衡目标**

- 第 1 波清完约 15–25 秒；第 5 波明显吃紧但不至于无解。
- 转轮机枪 150 发可清 2 波左右，拾取 60 发可续航。
- Bomber 爆炸能炸死周围 Walker，但不秒杀 Brute。
- 每波 1 张卡后，玩家伤害/生存成长与僵尸 10% 生命成长大致同步。

- [ ] **Step 4: 文档与截图**

- README：新增“成长与强化”“转轮机枪”“中文卡面”“新僵尸”章节、按键 `4`、调试参数、字体生成命令。
- 截图：标题、升级界面、转轮扫射、Bomber 爆炸各一张（docs/）。
- 确认每个 js 文件 ≤500 行。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "chore: 成长/强化/转轮机枪平衡、文档与验收截图"
```

---

## 自检

- **Spec 覆盖**：成长系数（Task 1）、新僵尸（Task 1/4）、卡池与叠加（Task 2）、转轮机枪（Task 3/6）、中文字体（Task 3）、升级界面（Task 5）、HUD/音效（Task 6）、平衡验收（Task 7）。
- **接口一致性**：`G.upgrades.apply(player, card, levels)` 在 Task 2/5 一致；`Player.stepSpin` 在 Task 3/6 一致；`queueBoom/explodeBomber` 在 Task 4 定义并在 Task 5 的循环中更新。
- **占位符**：所有步骤均给出文件、命令或关键代码。
- **顺序说明**：Task 2 的测试依赖 Task 3 的 `Player.mods/syncMods/minigun`；执行时先完成 Task 3 的 Player 部分，或先实现这两个接口再回跑 Task 2 测试。
