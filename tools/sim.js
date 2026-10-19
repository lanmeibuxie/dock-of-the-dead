/* 开发用：自动瞄准射击的长时间模拟，观察波次推进、性能与稳定性 */
const { chromium } = require('playwright-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const url = process.argv[2] || 'http://localhost:8765/index.html?god=1&debug=1';
  const seconds = Number(process.argv[3] || 60);
  const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGE: ' + e.message));
  await page.goto(url);
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.__sim = setInterval(() => {
      if (G.game.state === 'upgrade') {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit1' }));
        return;
      }
      if (G.game.state !== 'playing') return;
      const wp = G.game.player.weapon();
      if (wp.ammo === 0 && !wp.reloading) wp.startReload();
      const zs = G.game.zombies.filter(z => !z.dead);
      if (!zs.length) { G.input.mouse.down = false; return; }
      zs.sort((a, b) => Math.abs(a.x - G.game.player.x) - Math.abs(b.x - G.game.player.x));
      const z = zs[0];
      const boxes = z.hitBoxes();
      const hb = boxes.find(b => b.zone === 'head') || boxes[0];
      G.input.mouse.x = G.gfx.cam.toScreenX(hb.x + hb.w / 2);
      G.input.mouse.y = G.gfx.cam.toScreenY(hb.y + hb.h / 2);
      G.input.mouse.down = true;
    }, 70);
  });
  for (let t = 5; t <= seconds; t += 5) {
    await page.waitForTimeout(5000);
    const s = await page.evaluate(() => ({
      t: Math.round(G.level.time),
      wave: G.game.wave,
      state: G.game.state,
      score: G.game.score || 0,
      levels: JSON.stringify(G.game.player ? {} : {}),
      fps: G.game.fps,
      hp: G.game.player ? G.game.player.hp : -1,
      alive: G.game.zombies ? G.game.zombies.filter(z => !z.dead).length : -1,
      corpses: G.game.zombies ? G.game.zombies.length : -1,
      limbs: G.game.limbs ? G.game.limbs.length : -1,
      parts: G.particles.count(),
      lowFx: !!G.game.lowFx
    }));
    console.log(JSON.stringify(s));
  }
  await page.screenshot({ path: 'sim.png' });
  if (errors.length) console.log(errors.join(String.fromCharCode(10)));
  else console.log('NO PAGE ERRORS');
  await browser.close();
})();
