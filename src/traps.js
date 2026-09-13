import { C } from './constants.js';

/* ─── initialise runtime state for each trap ──────────── */
export function initTrapStates(traps) {
  return traps.map(() => ({
    triggered: false,
    timer: 0,
    vanishIndex: 0,
    indices: [],        // filled lazily on first trigger
  }));
}

/* ─── tick every trap ─────────────────────────────────── */
export function updateTraps(traps, states, player, platforms, particles, dt) {
  for (let i = 0; i < traps.length; i++) {
    const trap = traps[i];
    const ts   = states[i];
    switch (trap.type) {
      case 'vanish_on_enter': vanishOnEnter(trap, ts, player, platforms, particles, dt); break;
      case 'drop_on_land':    dropOnLand   (trap, ts, player, platforms, particles, dt); break;
      case 'vanish_on_jump':  vanishOnJump (trap, ts, player, platforms, particles, dt); break;
    }
  }
}

/* ═════════════════════════════════════════════════════════
   TRAP: vanish_on_enter
   Tiles in a group vanish left-to-right after the player
   crosses `triggerX`.
   ═════════════════════════════════════════════════════════ */
function vanishOnEnter(trap, ts, player, platforms, particles, dt) {
  /* trigger ------------------------------------------------ */
  if (!ts.triggered && player.x + player.w > trap.triggerX) {
    ts.triggered = true;
    ts.timer = 0;
    ts.vanishIndex = 0;
    ts.indices = [];
    for (let i = 0; i < platforms.length; i++) {
      if (platforms[i].group === trap.group) ts.indices.push(i);
    }
    // set warning flag on all tiles
    for (const idx of ts.indices) platforms[idx].warning = true;
  }
  if (!ts.triggered) return;

  /* stagger ------------------------------------------------ */
  ts.timer += dt;
  const elapsed = ts.timer - (trap.initialDelay || 0);
  if (elapsed < 0) return;                          // still in warning phase

  const target = Math.min(
    Math.floor(elapsed / trap.stagger) + 1,
    ts.indices.length,
  );

  while (ts.vanishIndex < target) {
    const p = platforms[ts.indices[ts.vanishIndex]];
    p.visible = false;
    p.solid   = false;
    p.warning = false;
    spawnTileParticles(p, particles);
    ts.vanishIndex++;
  }
}

/* ═════════════════════════════════════════════════════════
   TRAP: drop_on_land
   Platform in `group` shakes then vanishes when the player
   stands on it.
   ═════════════════════════════════════════════════════════ */
function dropOnLand(trap, ts, player, platforms, particles, dt) {
  for (const p of platforms) {
    if (p.group !== trap.group || !p.visible) continue;

    const standing = player.grounded &&
      player.x + player.w > p.x && player.x < p.x + p.w &&
      Math.abs((player.y + player.h) - p.y) < 3;

    if (standing && !ts.triggered) {
      ts.triggered = true;
      ts.timer = 0;
    }
    if (!ts.triggered) continue;

    ts.timer += dt;

    if (ts.timer < trap.delay) {
      // shake warning
      p.shakeX = (Math.random() - 0.5) * 3.5;
      p.warning = true;
    } else {
      // drop
      p.visible = false;
      p.solid   = false;
      p.shakeX  = 0;
      p.warning = false;
      spawnTileParticles(p, particles);
    }
  }
}

/* ═════════════════════════════════════════════════════════
   TRAP: vanish_on_jump
   If the player is airborne (jumped) inside the trigger
   zone, ALL tiles in the group vanish instantly.
   Walking across is perfectly safe.
   ═════════════════════════════════════════════════════════ */
function vanishOnJump(trap, ts, player, platforms, particles, _dt) {
  if (ts.triggered) return;

  const z = trap.triggerZone;
  const inZone =
    player.x + player.w > z.x && player.x < z.x + z.w &&
    player.y + player.h > z.y && player.y < z.y + z.h;

  if (inZone && !player.grounded && player.vy < 0) {
    ts.triggered = true;
    for (const p of platforms) {
      if (p.group !== trap.group) continue;
      p.visible = false;
      p.solid   = false;
      spawnTileParticles(p, particles);
    }
  }
}

/* ─── shared particle helper ──────────────────────────── */
function spawnTileParticles(tile, particles) {
  for (let i = 0; i < 7; i++) {
    particles.push({
      x: tile.x + Math.random() * tile.w,
      y: tile.y + Math.random() * 12,
      vx: (Math.random() - 0.5) * 2.2,
      vy: -Math.random() * 1.8,
      life: 1,
      decay: 0.025 + Math.random() * 0.015,
      size: 2 + Math.random() * 2.5,
      color: C.vanishPart,
    });
  }
}
