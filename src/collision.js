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

  const prevBottom = (player.y - player.vy) + player.h;

  for (const p of platforms) {
    if (!p.visible || p.solid === false || p.active === false) continue;

    // Check horizontal overlap first
    const hOverlap = player.x < p.x + p.w && player.x + player.w > p.x;
    if (!hOverlap) continue;

    // Standard AABB overlap or swept vertical passage (anti-tunneling protection)
    const vOverlap = (player.y < p.y + p.h && player.y + player.h > p.y) ||
                     (player.vy > 0 && prevBottom <= p.y + 2 && player.y + player.h >= p.y);

    if (!vOverlap) continue;

    if (player.vy >= 0) {
      // Landing on top of platform
      if (!wasGrounded && player.vy > 1.8) {
        player.squish = Math.min(0.48, player.vy * 0.05);
        player.justLanded = true;
        player.landVelocity = player.vy;
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
 * Zero-allocation for high performance and minimal GC pressure.
 */
export function checkSpikeCollision(player, spikes) {
  return !!getCollidingSpike(player, spikes);
}

export function getCollidingSpike(player, spikes) {
  const px = player.x;
  const pw = player.w;
  const py = player.y;
  const ph = player.h;

  for (const s of spikes) {
    if (!s.active) continue;
    const sx = s.x + 4;
    const sy = s.y + 4;
    const sw = s.w - 8;
    const sh = s.h - 8;
    if (px < sx + sw && px + pw > sx && py < sy + sh && py + ph > sy) {
      return s;
    }
  }
  return null;
}

/**
 * Check player vs door overlap.
 */
export function checkDoorCollision(player, door) {
  return door && aabb(player, door);
}
