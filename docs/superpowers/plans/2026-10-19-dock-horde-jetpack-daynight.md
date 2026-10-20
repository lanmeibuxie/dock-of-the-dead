# 巨量尸潮、喷气背包与昼夜轮换 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有游戏上实现 120 同屏尸潮、喷气背包、榴弹发射器、鸟群、昼夜轮换、性能优化与平衡调整。

**Architecture:** 规则与配置放在无 DOM 模块；命中结算拆到 `hits.js`，鸟群/榴弹/僵尸美术各自独立文件；静态主题配色集中在 `themes.js`；游戏主循环只做状态与调度。

**Tech Stack:** 原生 ES2017、Canvas 2D、WebAudio、`node --test`、Playwright（开发期）。

**Spec:** `docs/superpowers/specs/2026-10-19-dock-horde-jetpack-daynight-design.md`

## Global Constraints

- 同屏僵尸上限 120；目标 60fps；鸟上限 15。
- 波次预算 `8 + 4n`；同屏上限 `min(120, 18 + 4n)`；刷怪间隔 `max(0.12, 0.5 - 0.012n)`。
- 僵尸成长与精英规则不变。
- 喷气：燃料 100、消耗 50/s、落地回充 40/s、推力 600、高度上限 y=56。
- 榴弹：4/12、爆炸半径 58、中心 60、边缘 25、自伤中心约 30（2D 距离、可减免、可致死）。
- 鸟：第 4 波起，hp 18、俯冲 260、伤害 8、上限 15；白天权重更高。
- 昼夜每 3 波轮换，1.5s 渐变。
- 震屏减半，穿透 60ms 内只震一次；瞄准使用无震屏坐标。
- 每张强化卡必须选中后确认（按钮/Enter/双击）。
- 每个 `js/*.js` ≤500 行；运行时零依赖。

---

### Task 1: 配置、波次与卡池规则

**Files:** `js/core.js`, `js/waves.js`, `js/upgrades.js`, `js/combat.js`, `tests/*`

- [ ] 测试：`budget(1)===12`、`budget(5)===28`；`aliveCap(20)===98`；`spawnInterval` 下限 0.12；bird 第 4 波解锁；launcher 配置；24 张卡；喷气卡叠加；`blastSelf` 中心/边缘/减免。
- [ ] `waves.js` 增加 `aliveCap/spawnInterval/spawnBatch`，compose 加入 bird。
- [ ] `core.js` 增加 launcher、`G.JET`、`G.content.birds`。
- [ ] `upgrades.js` 增加 6 张喷气/防爆卡。
- [ ] `combat.js` 调整 shake 数值，增加 `blastSelf`。
- [ ] `npm test` 通过并提交。

### Task 2: 码头风僵尸美术与飞行/榴弹美术

**Files:** 新增 `js/zombieart.js`；修改 `js/sprites.js`, `js/birds.js`（美术部分）, `js/player.js`（喷气背包外观）

- [ ] 5 种僵尸的部件美术：渔夫、落水者、装卸工、领航员、油桶怪。
- [ ] `G.sprites.zombieRig(type)` 委托 `G.zombieart.rig(type)`；移除旧通用美术。
- [ ] 支持可选的 `tank` 配件（绘制在躯干后方），随躯干隐藏。
- [ ] 玩家喷气背包像素图与推进火焰；鸟的 2 帧扇翅美术。
- [ ] 截图检查 5 种僵尸与鸟；提交。

### Task 3: 提亮、震屏、稳定瞄准与昼夜主题

**Files:** `js/gfx.js`, `js/level.js`, `js/themes.js`, `js/player.js`, `js/render.js`

- [ ] `themes.js`：夜/昼两套颜色，`mix` 插值。
- [ ] 夜晚遮罩 0.30、暗角 0.30、玩家光 120、灯光 +25%；白天更亮、无灯光锥、雨雾更少。
- [ ] `level.themeMix` 0..1，每 3 波切换，1.5s 渐变；`DAYBREAK/NIGHTFALL` 横幅。
- [ ] `gfx.cam.shake` 幅度/衰减/上限降低；玩家瞄准使用 `cam.x/y`（不含 shake）。
- [ ] `combat` shake 数值减半；命中/爆炸/开枪震屏降低。
- [ ] 命中结算加 60ms shake 锁；穿透后续命中不再震屏。
- [ ] 截图对比夜/昼与穿透场景；提交。

### Task 4: 性能与命中重构

**Files:** 新增 `js/hits.js`；修改 `js/game.js`, `js/entities.js`, `js/render.js`, `js/level.js`

- [ ] 把 `resolveShot/applyHit` 移到 `hits.js`，回调 `onHit` 更新 hitMark；支持鸟。
- [ ] 子弹粗筛：僵尸扩展 AABB，命中前过滤；鸟类小 AABB。
- [ ] 僵尸 AI LOD：离屏每 3 帧更新；绘制裁剪；尸体/断肢上限。
- [ ] 分离改为按 x 排序后邻域比较。
- [ ] 灯光/暗角/天空渐变缓存；粒子池上限；LOWFX 降级。
- [ ] `?debug=horde&horde=120` 压力测试，60fps；提交。

### Task 5: 喷气背包与燃料

**Files:** `js/player.js`, `js/hud.js`, `js/audio.js`, `js/game.js`

- [ ] 空中按住 Space 喷射；燃料消耗/落地回充/空中基础不回充；高度上限 56；空中移速 90%。
- [ ] 火焰/烟/噪音；燃料条 HUD；`jetFuel/jetThrust/jetRegen/jetAir` 卡生效。
- [ ] `syncMods` 计算上限并补足差额；防爆减免接入自伤。
- [ ] 自动化验证：按住 Space 燃料下降、高度上升、落地回充；提交。

### Task 6: 榴弹发射器、自伤与爆炸

**Files:** 新增 `js/grenade.js`；修改 `js/player.js`, `js/game.js`, `js/core.js`, `js/boom.js`, `js/hud.js`, `js/upgrades.js`

- [ ] 第 5 武器槽、键 5、滚轮 5 把；弹匣 4/备弹 12。
- [ ] 榴弹抛物线、命中/落地/引信爆炸；爆炸伤害半径、连锁、鸟。
- [ ] 自伤按 2D 距离、无敌帧、防爆护甲；可致死。
- [ ] `ammo_launcher` 拾取；HUD 5 槽；截图验证贴地自伤 vs 空中安全。
- [ ] 提交。

### Task 7: 鸟群与昼夜刷怪

**Files:** 新增 `js/birds.js`；修改 `js/game.js`, `js/waves.js`, `js/level.js`, `js/render.js`

- [ ] 鸟 AI：盘旋/俯冲/拉升；接触伤害；被击落尸体。
- [ ] 第 4 波起刷鸟，同屏上限 15；白天权重 ×2。
- [ ] 子弹/爆炸/命中特效支持鸟；得分。
- [ ] 白天场景鸟更多；夜间路灯开启。
- [ ] 提交。

### Task 8: 强化卡确认与 UI

**Files:** `js/upgradeui.js`, `js/game.js`, `tools/genfont.py`, `js/cnfont.js`

- [ ] 点击卡牌只选中；「确定」按钮；Enter 确认；**双击不再确认**。
- [ ] 选中态高亮、底部提示、按钮禁用态。
- [ ] 新增喷气/防爆卡中文文案并重新生成字体。
- [ ] 自动化：点击选中后状态仍 upgrade；确认后进入 playing；双击直接确认。
- [ ] 提交。

### Task 9: 平衡、性能验收与文档

**Files:** `README.md`, `tools/shot.js`, `tools/sim.js`, 截图

- [ ] `sim.js` 支持 120 尸潮与自动选卡；跑 60s，记录波次/帧率。
- [ ] 调整刷怪、卡牌、自伤、燃料数值，使合理 build 15–20 波。
- [ ] 截图：白天、夜晚、120 尸潮、喷气+榴弹、强化确认。
- [ ] 更新 README；全量测试；确认每个 js ≤500 行；提交。

## 自检

- 规格覆盖：性能（Task 4）、无尽（Task 1/7）、喷气（Task 5）、榴弹自伤（Task 6）、鸟（Task 7）、昼夜（Task 3）、震屏（Task 3）、码头美术（Task 2）、确认（Task 8）、平衡（Task 9）。
- 接口：`G.hits.resolve(shot, ctx)`、`G.birds.Bird`、`G.grenade.Grenade`、`G.themes`、`G.zombieart.rig(type)`。
- 无占位符；所有步骤有明确文件与验收。


## 追加：A+B 扩展

- [x] Boss 波（吊机尸/巨溺者）+ 血条 + 场地危险 + 史诗奖励。
- [x] 词缀 4 个 + HUD 标签 + `?mod=` 调试。
- [x] 8 张机制/代价卡 + 标签套装 + 每波免费刷新。
- [x] 弹药全补给、换弹动画、鸟群主动攻击、穿透定格防抖、确认误触修正。


## 追加：精英与商店

- [x] 精英词缀（装甲/迅捷/爆裂）+ 光环 + 额外金币。
- [x] 金币经济、清波奖励、HUD 金币。
- [x] 补给商店（8 商品、4 选、刷新、离开）与购买/属性应用。
- [x] 弹壳/弹匣落地物理修复。
