/* 开发用：用系统 Edge 打开游戏、可交互、截图并报告控制台错误 */
const { chromium } = require('playwright-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const url = process.argv[2];
  const out = process.argv[3] || 'shot.png';
  const wait = Number(process.argv[4] || 1800);
  const scenario = process.argv[5] || '';
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGE: ' + e.message));
  await page.goto(url);
  await page.waitForTimeout(600);
  if (scenario && scenario !== 'title') {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(320);
  }

  if (scenario === 'fight') {
    await page.waitForTimeout(900);
    await page.keyboard.press('Digit2');
    let fired = 0;
    for (let i = 0; i < 8; i++) {
      const target = await page.evaluate(() => {
        const zs = G.game.zombies.filter(z => !z.dead);
        if (!zs.length) return null;
        zs.sort((a, b) => Math.abs(a.x - G.game.player.x) - Math.abs(b.x - G.game.player.x));
        const z = zs[0];
        const boxes = z.hitBoxes();
        const hb = boxes.find(b => b.zone === 'head') || boxes[0];
        return { sx: G.gfx.cam.toScreenX(hb.x + hb.w / 2), sy: G.gfx.cam.toScreenY(hb.y + hb.h / 2) };
      });
      if (!target) break;
      await page.mouse.move(target.sx * 2, target.sy * 2);
      await page.waitForTimeout(80);
      await page.mouse.down();
      await page.waitForTimeout(65);
      await page.mouse.up();
      fired++;
      await page.waitForTimeout(600);
    }
    const state = await page.evaluate(() => ({
      hp: G.game.player.hp,
      zombies: G.game.zombies.length,
      alive: G.game.zombies.filter(z => !z.dead).length,
      limbs: G.game.limbs.length,
      particles: G.particles.count(),
      score: G.game.zombies.filter(z => z.dead).reduce((s, z) => s + z.def.score, 0),
      stats: G.game.state
    }));
    console.log('FIRED', fired, 'STATE', JSON.stringify(state));
  }

  if (scenario === 'shotgun') {
    await page.keyboard.press('Digit2');
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      G.game.zombies.length = 0;
      G.game.player.hp = 100;
      const z = new G.entities.Zombie('walker', G.game.player.x + 78, false);
      z.stagger = 999;
      G.game.zombies.push(z);
    });
    const target = await page.evaluate(() => {
      const z = G.game.zombies[0];
      const hb = z.hitBoxes().find(b => b.zone === 'head');
      return { sx: G.gfx.cam.toScreenX(hb.x + hb.w / 2), sy: G.gfx.cam.toScreenY(hb.y + hb.h / 2) };
    });
    await page.mouse.move(target.sx * 2, target.sy * 2);
    await page.waitForTimeout(100);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.up();
    await page.waitForTimeout(120);
    const st = await page.evaluate(() => ({ dead: G.game.zombies[0].dead, hp: G.game.zombies[0].hp, limbs: G.game.limbs.length, particles: G.particles.count(), weapon: G.game.player.current, ammo: G.game.player.weapon().ammo }));
    console.log('SHOTGUN', JSON.stringify(st));
    await page.screenshot({ path: out });
    if (errors.length) console.log(errors.join(String.fromCharCode(10))); else console.log('NO PAGE ERRORS');
    await browser.close();
    return;
  }

  if (scenario === 'headshot') {
    await page.evaluate(() => {
      G.game.zombies.length = 0;
      G.game.player.hp = 100;
      const z = new G.entities.Zombie('walker', G.game.player.x + 95, false);
      G.game.zombies.push(z);
    });
    const target = await page.evaluate(() => {
      const z = G.game.zombies[0];
      const hb = z.hitBoxes().find(b => b.zone === 'head');
      return { sx: G.gfx.cam.toScreenX(hb.x + hb.w / 2), sy: G.gfx.cam.toScreenY(hb.y + hb.h / 2) };
    });
    await page.mouse.move(target.sx * 2, target.sy * 2);
    await page.waitForTimeout(100);
    await page.mouse.down();
    await page.waitForTimeout(55);
    await page.screenshot({ path: out });
    await page.mouse.up();
    const st = await page.evaluate(() => ({
      dead: G.game.zombies[0].dead, hp: G.game.zombies[0].hp,
      limbs: G.game.limbs.length, particles: G.particles.count(),
      hitstop: G.time.hitstopT, slow: G.time.slowT
    }));
    console.log('HEADSHOT', JSON.stringify(st));
    if (errors.length) console.log(errors.join('\n')); else console.log('NO PAGE ERRORS');
    await browser.close();
    return;
  }

  if (scenario === 'loot') {
    await page.evaluate(() => {
      G.game.zombies.length = 0;
      G.game.player.hp = 55;
      G.game.player.weapons.shotgun.reserve = 0;
      G.game.pickups.push(new G.entities.Pickup('ammo_shotgun', G.game.player.x + 24));
      G.game.pickups.push(new G.entities.Pickup('medkit', G.game.player.x + 58));
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: out });
    const st = await page.evaluate(() => ({ hp: G.game.player.hp, reserve: G.game.player.weapons.shotgun.reserve, pickups: G.game.pickups.length }));
    console.log('LOOT', JSON.stringify(st));
    if (errors.length) console.log(errors.join(String.fromCharCode(10))); else console.log('NO PAGE ERRORS');
    await browser.close();
    return;
  }

  if (scenario === 'pause') {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }

  if (scenario === 'gameover') {
    await page.evaluate(() => { G.game.player.hp = 0; });
    await page.waitForTimeout(1300);
    const st = await page.evaluate(() => ({ state: G.game.state, best: G.hud.best() }));
    console.log('GAMEOVER', JSON.stringify(st));
  }

  if (scenario === 'audio') {
    const st = await page.evaluate(() => ({ ready: G.audio.ready, muted: G.audio.muted, state: G.game.state }));
    console.log('AUDIO', JSON.stringify(st));
  }

  if (scenario === 'walk') {
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(100);
  }

  await page.waitForTimeout(wait);
  await page.screenshot({ path: out });
  if (errors.length) console.log(errors.join('\n'));
  else console.log('NO PAGE ERRORS');
  await browser.close();
})();
