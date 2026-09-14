import {
  GRAVITY, PLAYER_ACCEL, MAX_SPEED, FRICTION,
  JUMP_VEL, COYOTE_FRAMES, JUMP_BUFFER,
  CANVAS_W, CANVAS_H,
} from './constants.js';

/**
 * Apply input, gravity and movement for one fixed-step tick.
 * Mutates `player` in place.
 */
export function updatePlayer(player, input) {
  /* ── horizontal ─────────────────────────────────────── */
  if (input.left)  { player.vx -= PLAYER_ACCEL; player.facingRight = false; }
  if (input.right) { player.vx += PLAYER_ACCEL; player.facingRight = true;  }

  if (!input.left && !input.right) {
    player.vx *= FRICTION;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;
  }
  player.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.vx));

  /* ── walk cycle & procedural lean ────────────────────── */
  if (player.grounded && Math.abs(player.vx) > 0.2) {
    player.walkCycle = (player.walkCycle || 0) + Math.abs(player.vx) * 0.14;
  } else if (player.grounded) {
    // Return gently to rest
    player.walkCycle = (player.walkCycle || 0) * 0.85;
  }

  // Smooth body tilt in movement direction
  const targetTilt = (player.vx / MAX_SPEED) * 0.14;
  player.tilt = (player.tilt || 0) + (targetTilt - (player.tilt || 0)) * 0.22;

  /* ── coyote time ────────────────────────────────────── */
  player.coyoteTimer = player.grounded ? COYOTE_FRAMES : Math.max(0, player.coyoteTimer - 1);

  /* ── jump buffer ────────────────────────────────────── */
  if (input.jumpPressed) player.jumpBuffer = JUMP_BUFFER;
  else                   player.jumpBuffer = Math.max(0, player.jumpBuffer - 1);

  /* ── jump ───────────────────────────────────────────── */
  player.jumped = false;
  if (player.jumpBuffer > 0 && player.coyoteTimer > 0) {
    player.vy         = JUMP_VEL;
    player.grounded   = false;
    player.coyoteTimer = 0;
    player.jumpBuffer  = 0;
    player.stretch     = 1.1;
    player.jumped      = true;
  }

  /* ── variable-height jump (release early ⇒ fall faster) */
  if (!input.jump && player.vy < 0) player.vy *= 0.85;

  /* ── gravity ────────────────────────────────────────── */
  player.vy += GRAVITY;
  if (player.vy > 13) player.vy = 13;          // terminal velocity

  // Airborne stretch / compression
  if (!player.grounded) {
    if (player.vy > 4) {
      // Falling: slight elongation
      player.stretch = Math.min(0.6, (player.vy - 4) * 0.08);
    }
  }

  /* ── integrate ──────────────────────────────────────── */
  player.x += player.vx;
  player.y += player.vy;

  /* ── squish / stretch decay ─────────────────────────── */
  if (player.squish  > 0) { player.squish  *= 0.80; if (player.squish  < 0.01) player.squish  = 0; }
  if (player.stretch > 0) { player.stretch *= 0.80; if (player.stretch < 0.01) player.stretch = 0; }

  /* ── eye gaze & blinking ────────────────────────────── */
  updatePlayerEyes(player);
}

function updatePlayerEyes(player) {
  // Gaze target
  const targetX = player.facingRight ? 2.5 : -2.5;
  let targetY = 0;
  if (!player.grounded) {
    if (player.vy < -1) targetY = -2.5; // looking up while jumping
    else if (player.vy > 1) targetY = 2.0;  // looking down while falling
  }

  player.eyeOffsetX = (player.eyeOffsetX || 0) + (targetX - (player.eyeOffsetX || 0)) * 0.25;
  player.eyeOffsetY = (player.eyeOffsetY || 0) + (targetY - (player.eyeOffsetY || 0)) * 0.25;

  // Blinking countdown
  player.blinkTimer = (player.blinkTimer || 180) - 1;
  if (player.blinkTimer <= 0) {
    player.blinkState = 1; // shut
    if (player.blinkTimer < -6) {
      player.blinkState = 0;
      player.blinkTimer = 160 + Math.floor(Math.random() * 160);
    }
  }
}

/**
 * Calculates vertical distance to solid floor underneath player for dynamic drop shadow.
 */
export function updatePlayerGroundDist(player, platforms) {
  let closestDist = 180;
  const px = player.x + player.w * 0.5;
  const py = player.y + player.h;

  for (const plat of platforms) {
    if (!plat.visible || plat.solid === false) continue;
    if (px >= plat.x && px <= plat.x + plat.w && plat.y >= py - 2) {
      const dist = plat.y - py;
      if (dist >= 0 && dist < closestDist) {
        closestDist = dist;
      }
    }
  }
  player.groundDist = closestDist;
}

/**
 * Clamp horizontal position and detect out-of-bounds death.
 * @returns {boolean} true if the player fell below the screen.
 */
export function checkBounds(player) {
  if (player.x < 0) { player.x = 0; player.vx = 0; }
  if (player.x + player.w > CANVAS_W) { player.x = CANVAS_W - player.w; player.vx = 0; }
  return player.y > CANVAS_H + 60;
}
