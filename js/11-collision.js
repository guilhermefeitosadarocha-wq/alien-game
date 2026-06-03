// ═══════════════════════════════════════════════════════════
//  COLLISION
// ═══════════════════════════════════════════════════════════
const Collision = {
  check() {
    const enemies = Enemies.pool;
    const bullets  = Bullets.pool;

    // ── Bullet vs Boss ──────────────────────────────────────
    // Guard: check boss exists AND stays alive after each hit
    if (BossSystem.boss && BossSystem._introTimer <= 0) {
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        if (!BossSystem.boss) break;            // boss died mid-loop
        const b = bullets[bi];
        if (!b) continue;                       // already removed
        if (Util.dist(b, BossSystem.boss) < BossSystem.boss.size * 0.9 + CONFIG.BULLET_RADIUS) {
          // Snapshot position BEFORE any splice/mutation
          const bx = BossSystem.boss.x, by = BossSystem.boss.y, bs = BossSystem.boss.size;
          bullets.splice(bi, 1);
          BossSystem.takeDamage(1);
          // Use snapshot — boss may be null now
          FloatText.spawn(bx + Util.rand(-20, 20), by - bs - 10, '-1', '#ff4488', 13, 0.6);
        }
      }
    }

    // ── Bullet vs Enemy — HP system ─────────────────────────
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (!e) continue;
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (!b) continue;
        if (Util.dist(e, b) < e.size * 0.85 + CONFIG.BULLET_RADIUS) {
          // Snapshot bullet position BEFORE splice (prevents undefined.x)
          const impactX = b.x, impactY = b.y;
          bullets.splice(bi, 1);
          e.hp--;
          Particles.burst(impactX, impactY, 4, 'rgba(0,220,255,', 0.8);
          SFX.play('hit_enemy');

          if (e.hp <= 0) {
            // Snapshot enemy position before splice
            const ex = e.x, ey = e.y, eSize = e.size;
            const scoreGain = (CONFIG.SCORE_PER_KILL + (e.scoreBonus || 0)) * (CONFIG._scoreBoost || 1);
            Game.score += scoreGain;
            DifficultySystem.kills++;
            // ComboSystem.onKill called below after splice

            const particleColor = CONFIG._rainbowParticles
              ? 'rgba(' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ',255,'
              : 'rgba(0,200,255,';
            Particles.burst(ex, ey, CONFIG.PARTICLE_COUNT, particleColor, 1);
            if ((e.maxHp || 1) > 1 && e.glow) {
              // Safe glow color for extra burst
              Particles.burst(ex, ey, 10, 'rgba(150,80,255,', 1.3);
            }
            if ((e.coinBonus || 0) > 0) CoinSystem.add(e.coinBonus);
            FloatText.spawn(Player.x, Player.y - 30, '+' + scoreGain, '#00c8ff', 14, 0.9);
            ScreenFX.shake(eSize > 25 ? 5 : 2, 0.12);
            // SFX diferenciado por tipo de inimigo
            if (e.type === 'tank')          SFX.play('kill_tank');
            else if (e.type === 'electric') SFX.play('kill_electric');
            else                            SFX.play('kill_enemy');

            // Critical system
            const critBonus = CriticalSystem.roll(ex, ey, 0);
            if (critBonus > 0) Game.score += critBonus;

            // Chain lightning
            ElectricSystem.chainFrom(ex, ey, ei);

            // Chain explosion
            if (ExplosionSystem.active) ExplosionSystem.triggerAt(ex, ey, 55, 'rgba(255,120,0,');

            // Overdrive + Combo (única chamada)
            OverdriveSystem.onKill();
            ComboSystem.onKill(ex, ey);

            enemies.splice(ei, 1);
          }
          break;  // one bullet per enemy per frame
        }
      }
    }

    // ── Enemy vs Player ─────────────────────────────────────
    if (!Player._dead && Player.invincible <= 0) {
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (!e) continue;
        if (Util.dist(e, Player) < e.size * 0.72 + CONFIG.PLAYER_SIZE * 0.8) {
          enemies.splice(ei, 1);
          Player.hit();
          ScreenFX.shake(6, 0.25);
          ScreenFX.flash('rgba(255,0,0,0.20)', 0.3);
        }
      }
    }

    // ── Power-up magnet attraction ───────────────────────────
    if ((CONFIG._magnetRadius || 0) > 0) {
      for (const p of PowerUps.pool) {
        if (!p) continue;
        const dx = Player.x - p.x, dy = Player.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < CONFIG._magnetRadius && d > 1) {
          p.x += (dx / d) * 120 * 0.016;
          p.y += (dy / d) * 120 * 0.016;
        }
      }
    }
  },
};

