/* 码头尸潮 — 波次导演、刷怪、Boss 与波间强化流程 */
(function () {
  'use strict';
  var G = globalThis.G;

  var D = {
    waveNo: 1, elite: false, waveState: 'fight', spawnQueue: [], spawnTimer: 0, spawned: 0,
    breathT: 0, bannerT: 0, bannerText: '', bossWave: false, bossRef: null,
    cards: [], levels: {}, selected: -1, hover: -1, rerolls: 1,
    toastText: '', toastT: 0, modifier: null, prevModifier: null,

    reset: function (startAt) {
      this.waveNo = 1;
      this.elite = false;
      this.waveState = 'fight';
      this.spawnQueue = [];
      this.spawnTimer = 0;
      this.spawned = 0;
      this.breathT = 0;
      this.bannerT = 0;
      this.bannerText = '';
      this.bossWave = false;
      this.bossRef = null;
      this.cards = [];
      this.levels = {};
      this.selected = -1;
      this.hover = -1;
      this.rerolls = 1;
      this.toastText = '';
      this.toastT = 0;
      this.modifier = null;
      this.prevModifier = null;
      this.start(startAt || 1);
    },

    start: function (n) {
      var p = G.game.player;
      this.waveNo = n;
      this.elite = G.waves.isElite(n);
      this.bossWave = n >= 10 && n % 5 === 0;
      var bossType = Math.floor(n / 5) % 2 === 0 ? 'crane' : 'drownedBoss';
      this.spawnQueue = this.bossWave
        ? ['boss:' + bossType].concat(G.waves.compose(Math.max(1, n - 3)))
        : G.waves.compose(n);
      this.spawned = 0;
      this.spawnTimer = 0.6;
      this.waveState = 'fight';
      this.bannerT = 2.2;
      var day = Math.floor((n - 1) / 3) % 2 === 1;
      var changed = G.level.setTheme(day);
      if (this.bossWave) this.bannerText = 'BOSS WAVE';
      else if (changed) this.bannerText = day ? 'DAYBREAK' : 'NIGHTFALL';
      else this.bannerText = this.elite ? 'ELITE WAVE ' + n : 'WAVE ' + n;
      if (G.audio) { if (this.elite || this.bossWave) G.audio.thunder(); else G.audio.foghorn(); }
      if (day && !this.bossWave) {
        for (var eb = 0; eb < Math.max(1, Math.floor(n / 3)); eb++) this.spawnQueue.push('bird');
      }
      this.modifier = this.bossWave ? null : G.modifiers.pick(n, Math.random, this.prevModifier);
      var forced = /[?&]mod=(\w+)/.exec(location.search);
      if (forced && !this.bossWave) {
        for (var fi = 0; fi < G.modifiers.LIST.length; fi++) {
          if (G.modifiers.LIST[fi].id === forced[1]) this.modifier = G.modifiers.LIST[fi];
        }
      }
      this.prevModifier = this.modifier ? this.modifier.id : this.prevModifier;
      G.level.setModifier(this.modifier ? this.modifier.id : null);
      if (this.modifier && (this.modifier.id === 'blackout' || this.modifier.id === 'bloodMoon')) {
        for (var mb = 0; mb < 2; mb++) this.spawnQueue.push('bird');
      }
      if (this.modifier && this.modifier.id === 'airdrop') {
        this.spawnLoot(G.game.player.x - 180, 'ammo_all');
        this.spawnLoot(G.game.player.x + 120, 'medkit');
        this.spawnLoot(G.game.player.x + 220, null);
      }
      if (p) p.syncMods();
    },

    spawnLoot: function (x, kind) {
      var L = G.level.layout;
      var pickups = G.game.pickups;
      pickups.push(new G.entities.Pickup(kind || this.lootKind(), G.clamp(x, 30, L.length - 30)));
    },

    lootKind: function () {
      var p = G.game.player;
      var r = Math.random();
      if (r < 0.4) return 'medkit';
      if (p.current === 'smg') return 'ammo_smg';
      if (p.current === 'minigun') return 'ammo_minigun';
      if (p.current === 'launcher') return 'ammo_launcher';
      if (p.current === 'pistol') return G.chance(0.5) ? 'ammo_pistol' : 'ammo_shotgun';
      return 'ammo_shotgun';
    },

    spawnBird: function () {
      var birds = G.game.birds;
      if (birds.length >= 15) return;
      var L = G.level.layout;
      var sc = G.waves.scale(this.waveNo);
      var x = G.clamp(G.game.player.x + (G.chance(0.5) ? 1 : -1) * G.rand(170, 320), 20, L.length - 20);
      birds.push(new G.birds.Bird(x, G.rand(50, 115), sc.damage));
    },

    spawnBoss: function (type) {
      var L = G.level.layout;
      var player = G.game.player;
      var x = G.clamp(player.x + (player.x < L.length / 2 ? 1 : -1) * 270, 40, L.length - 40);
      var z = new G.entities.Zombie(type, x, false);
      var sc = G.waves.scale(this.waveNo);
      z.maxHp = Math.round(z.maxHp * sc.hp);
      z.hp = z.maxHp;
      z.damage *= sc.damage;
      z.speed *= sc.speed;
      G.game.zombies.push(z);
      this.bossRef = z;
      G.gfx.cam.shake(2.2);
      if (G.audio) G.audio.thunder();
    },

    summonCrawlers: function (n) {
      var zombies = G.game.zombies;
      var player = G.game.player;
      var cap = G.waves.aliveCap(this.waveNo);
      var alive = 0;
      for (var i = 0; i < zombies.length; i++) if (!zombies[i].dead) alive++;
      for (var k = 0; k < n && alive < cap; k++) {
        var x = G.clamp(player.x + (G.chance(0.5) ? 1 : -1) * G.rand(100, 220), 30, G.level.layout.length - 30);
        var z = new G.entities.Zombie('crawler', x, false);
        var sc = G.waves.scale(this.waveNo);
        z.maxHp = Math.round(z.maxHp * sc.hp);
        z.hp = z.maxHp;
        z.damage *= sc.damage;
        z.speed *= sc.speed;
        zombies.push(z);
        alive++;
      }
    },

    spawnOne: function () {
      var type = this.spawnQueue.shift();
      if (!type) return;
      if (type.indexOf('boss:') === 0) { this.spawnBoss(type.slice(5)); this.spawned++; return; }
      if (type === 'bird') { this.spawnBird(); this.spawned++; return; }
      var L = G.level.layout;
      var player = G.game.player;
      var side = this.spawned % 2 === 0 ? 1 : -1;
      var water = (this.modifier && this.modifier.id === 'tide') ? G.chance(0.62) : this.spawned % 3 === 2;
      var x;
      if (water) x = player.x + (G.chance(0.5) ? 1 : -1) * G.rand(90, 180);
      else x = player.x + side * (G.W * 0.55 + G.rand(0, 50));
      if (type === 'brute') x = player.x + side * (G.W * 0.62 + G.rand(0, 30));
      if (!water && Math.abs(x - player.x) < 90) x = player.x + (player.x < L.length / 2 ? 1 : -1) * G.W * 0.55;
      x = G.clamp(x, 30, L.length - 30);
      var z = new G.entities.Zombie(type, x, water);
      var sc = G.waves.scale(this.waveNo);
      z.maxHp = Math.round(z.maxHp * sc.hp * (this.elite ? 1.25 : 1));
      z.hp = z.maxHp;
      var bm = this.modifier && this.modifier.id === 'bloodMoon' ? 1.2 : 1;
      z.damage *= sc.damage * bm;
      z.speed *= sc.speed * bm;
      if (this.waveNo >= 6 && G.chance(0.12)) {
        z.affix = G.pick(['armored', 'swift', 'explosive']);
        if (z.affix === 'armored') { z.maxHp = Math.round(z.maxHp * 1.6); z.hp = z.maxHp; z.speed *= 0.8; z.damage *= 1.1; }
        else if (z.affix === 'swift') { z.maxHp = Math.round(z.maxHp * 0.8); z.hp = z.maxHp; z.speed *= 1.6; }
        else { z.maxHp = Math.round(z.maxHp * 1.1); z.hp = z.maxHp; }
      }
      G.game.zombies.push(z);
      this.spawned++;
      if (G.audio && G.chance(0.4)) G.audio.groan(G.clamp((x - player.x) / 220, -1, 1));
    },

    update: function (dt, boomCount) {
      this.bannerT = Math.max(0, this.bannerT - dt);
      this.toastT = Math.max(0, this.toastT - dt);
      if (this.bossRef && this.bossRef.dead) this.bossRef = null;
      if (this.waveState === 'fight') {
        if (this.spawnQueue.length) {
          this.spawnTimer -= dt;
          if (this.spawnTimer <= 0) {
            var zombies = G.game.zombies;
            var alive = 0;
            for (var ac = 0; ac < zombies.length; ac++) if (!zombies[ac].dead) alive++;
            var cap = G.waves.aliveCap(this.waveNo);
            var batch = G.waves.spawnBatch(this.waveNo);
            for (var sb = 0; sb < batch && this.spawnQueue.length && alive < cap; sb++) {
              this.spawnOne();
              alive++;
            }
            this.spawnTimer = G.waves.spawnInterval(this.waveNo);
          }
        } else {
          var any = false;
          for (var i = 0; i < G.game.zombies.length; i++) if (!G.game.zombies[i].dead) { any = true; break; }
          if (!any) for (var bi = 0; bi < G.game.birds.length; bi++) if (!G.game.birds[bi].dead) { any = true; break; }
          if (!any && boomCount === 0) this.openUpgrade();
        }
      } else {
        this.breathT -= dt;
        if (this.breathT <= 0) this.start(this.waveNo + 1);
      }
    },

    openUpgrade: function () {
      if (G.game && G.game.addGold) G.game.addGold(5 + this.waveNo);
      this.cards = G.upgrades.roll(this.waveNo, Math.random, this.levels);
      if (this.bossWave) {
        var used = {};
        for (var ci = 0; ci < this.cards.length; ci++) used[this.cards[ci].id] = true;
        var epics = [];
        for (var pi = 0; pi < G.upgrades.POOL.length; pi++) {
          var pc = G.upgrades.POOL[pi];
          if (pc.rarity === 2 && !used[pc.id] && G.upgrades.levelOf(pc.id, this.levels) < pc.max) epics.push(pc);
        }
        if (epics.length) this.cards[0] = epics[Math.floor(Math.random() * epics.length)];
        this.bossWave = false;
      }
      this.hover = -1;
      this.selected = -1;
      this.rerolls = 1 + (this.modifier && this.modifier.id === 'airdrop' ? 1 : 0);
      if (!this.cards.length) { this.waveState = 'breath'; this.breathT = 4; return; }
      G.game.setState('upgrade');
      this.waveState = 'upgrade';
      this.bannerT = 0;
      this.spawnLoot(G.game.player.x - 55, 'ammo_all');
      this.spawnLoot(G.game.player.x + 65);
      if (this.modifier && this.modifier.id === 'bloodMoon') this.spawnLoot(G.game.player.x + 120, 'ammo_all');
      if (G.audio) G.audio.foghorn();
    },

    pick: function (i) {
      var card = this.cards[i];
      if (!card) return;
      if (!G.upgrades.apply(G.game.player, card, this.levels)) return;
      this.cards = [];
      this.waveState = 'shop';
      this.toastText = '获得：' + card.name;
      this.toastT = 1.8;
      if (G.game.player.setToast) {
        this.toastText = '套装：' + G.game.player.setToast;
        G.game.player.setToast = '';
      }
      if (G.audio) G.audio.pickup();
      G.game.openShop();
    },

    reroll: function () {
      if (this.rerolls <= 0) return;
      this.cards = G.upgrades.roll(this.waveNo, Math.random, this.levels);
      this.rerolls--;
      this.selected = -1;
      this.hover = -1;
    },

    inputUpgrade: function (input) {
      var ui = G.upgradeui.input(this.cards, this.selected, input.mouse,
        input.mouse.clicked, input.pressed.bind(input),
        function (i) { G.director.pick(i); },
        function () { G.director.reroll(); }, this.rerolls);
      this.hover = ui.hover;
      this.selected = ui.selected;
    }
  };

  G.director = D;
})();
