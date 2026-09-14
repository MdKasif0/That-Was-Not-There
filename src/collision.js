/* ── AABB helpers ─────────────────────────────────────── */
export function aabb(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

/**
 * Resolve horizontal collisions against all solid platforms.
 * Snaps player to left/right wall, zeroes horizontal velocity,
 * and sets wall contact flags.
 */
export function resolveHorizontalCollisions(player, platforms) {
  player.isWalledLeft = false;
  player.isWalledRight = false;

  for (const p of platforms) {
    if (!p.visible || p.solid === false || p.active === false) continue;
    if (!aabb(player, p)) continue;

    if (player.vx > 0) {
      player.x = p.x - player.w;
      player.vx = 0;
      player.isWalledRight = true;
    } else if (player.vx < 0) {
      player.x = p.x + p.w;
      player.vx = 0;
      player.isWalledLeft = true;
    }
  }
}

/**
 * Resolve vertical collisions against all solid platforms.
 * Snaps player Y to platform top (ground) or bottom (ceiling).
 */
export function resolveVerticalCollisions(player, platforms) {
  const wasGrounded = player.grounded;
  player.grounded = false;
  player.hitCeiling = false;
  player.slippery = false;

  for (const p of platforms) {
    if (!p.visible || p.solid === false || p.active === false) continue;
    if (!aabb(player, p)) continue;

    if (player.vy >= 0) {
      // Landing on top of platform
      if (!wasGrounded && player.vy > 2.5) {
        player.squish = Math.min(0.50, player.vy * 0.05);
      }
      player.y = p.y - player.h;
      player.vy = 0;
      player.grounded = true;
      if (p.slippery) player.slippery = true;
    } else if (player.vy < 0) {
      // Hitting ceiling: zero upward velocity immediately
      player.y = p.y + p.h;
      player.vy = 0;
      player.hitCeiling = true;
    }
  }
}

/**
 * Legacy combined resolver for full-pass resolution.
 */
export function resolveCollisions(player, platforms) {
  resolveHorizontalCollisions(player, platforms);
  resolveVerticalCollisions(player, platforms);
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
