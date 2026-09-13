/* ── AABB helpers ─────────────────────────────────────── */
export function aabb(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

/**
 * Resolve player vs every visible & solid platform.
 * Uses minimum-overlap axis separation.
 */
export function resolveCollisions(player, platforms) {
  const wasGrounded = player.grounded;
  player.grounded = false;

  for (const p of platforms) {
    if (!p.visible || !p.solid) continue;

    // Platform may have a shakeX offset for visual only — collision uses base pos
    if (!aabb(player, p)) continue;

    const oL = (player.x + player.w) - p.x;
    const oR = (p.x + p.w) - player.x;
    const oT = (player.y + player.h) - p.y;
    const oB = (p.y + p.h) - player.y;
    const min = Math.min(oL, oR, oT, oB);

    if (min === oT && player.vy >= 0) {
      // Landing on top
      if (!wasGrounded && player.vy > 2) player.squish = 0.35;
      player.y  = p.y - player.h;
      player.vy = 0;
      player.grounded = true;
    } else if (min === oB && player.vy <= 0) {
      // Bumping ceiling
      player.y  = p.y + p.h;
      player.vy = 0;
    } else if (min === oL) {
      player.x  = p.x - player.w;
      player.vx = 0;
    } else if (min === oR) {
      player.x  = p.x + p.w;
      player.vx = 0;
    }
  }
}

/**
 * Check player vs spike collision (uses a slightly forgiving hitbox).
 */
export function checkSpikeCollision(player, spikes) {
  for (const s of spikes) {
    if (!s.active) continue;
    const box = { x: s.x + 4, y: s.y + 4, w: s.w - 8, h: s.h - 8 };
    if (aabb(player, box)) return true;
  }
  return false;
}

/**
 * Check player vs door overlap.
 */
export function checkDoorCollision(player, door) {
  return door && aabb(player, door);
}
