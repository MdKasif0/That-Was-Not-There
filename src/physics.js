import {
  GRAVITY, FALL_GRAVITY_MULT, GROUND_ACCEL, GROUND_DECEL,
  AIR_ACCEL, AIR_DECEL, MAX_SPEED, JUMP_VEL, JUMP_CUT_MULT,
  TERMINAL_VEL, COYOTE_FRAMES, JUMP_BUFFER,
  CANVAS_W, CANVAS_H,
} from './constants.js';
import { resolveHorizontalCollisions, resolveVerticalCollisions } from './collision.js';

/**
 * Apply input, deterministic movement, and axis-separated collisions for one fixed-step tick.
 * Mutates `player` in place.
 */
export function updatePlayer(player, input, platforms) {
  /* ── 1. Horizontal acceleration / deceleration ─────── */
  const accel = player.grounded ? GROUND_ACCEL : AIR_ACCEL;
  const decel = player.grounded ? GROUND_DECEL : AIR_DECEL;

  if (input.left && !input.right) {
    player.vx -= accel;
    player.facingRight = false;
  } else if (input.right && !input.left) {
    player.vx += accel;
    player.facingRight = true;
  } else {
    player.vx *= decel;
    if (Math.abs(player.vx) < 0.08) player.vx = 0;
  }
  player.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.vx));

  /* ── 2. Integrate X & resolve horizontal collisions ── */
  player.x += player.vx;
  if (player.x < 0) { player.x = 0; player.vx = 0; }
  if (player.x + player.w > CANVAS_W) { player.x = CANVAS_W - player.w; player.vx = 0; }

  if (platforms) {
    resolveHorizontalCollisions(player, platforms);
  }

  /* ── 3. Coyote time & jump buffer ──────────────────── */
  player.coyoteTimer = player.grounded ? COYOTE_FRAMES : Math.max(0, (player.coyoteTimer || 0) - 1);

  if (input.jumpPressed) {
    player.jumpBuffer = JUMP_BUFFER;
  } else {
    player.jumpBuffer = Math.max(0, (player.jumpBuffer || 0) - 1);
  }

  /* ── 4. Jump impulse ───────────────────────────────── */
  player.jumped = false;
  if (player.jumpBuffer > 0 && player.coyoteTimer > 0) {
    player.vy          = JUMP_VEL;
    player.grounded    = false;
    player.coyoteTimer = 0;
    player.jumpBuffer  = 0;
    player.stretch     = 1.15;
    player.jumped      = true;
  }

  /* ── 5. Variable-height jump (early release cut) ───── */
  if (!input.jump && player.vy < 0) {
    player.vy *= JUMP_CUT_MULT;
  }

  /* ── 6. Gravity & terminal velocity ────────────────── */
  const grav = player.vy > 0 ? GRAVITY * FALL_GRAVITY_MULT : GRAVITY;
  player.vy += grav;
  if (player.vy > TERMINAL_VEL) player.vy = TERMINAL_VEL;

  /* ── 7. Integrate Y & resolve vertical collisions ──── */
  player.y += player.vy;
  if (platforms) {
    resolveVerticalCollisions(player, platforms);
  }

  /* ── 8. Procedural animation states ────────────────── */
  // Walk cycle stride
  if (player.grounded && Math.abs(player.vx) > 0.2) {
    player.walkCycle = (player.walkCycle || 0) + Math.abs(player.vx) * 0.14;
  } else if (player.grounded) {
    player.walkCycle = (player.walkCycle || 0) * 0.85;
  }

  // Smooth body lean tilt
  const targetTilt = (player.vx / MAX_SPEED) * 0.14;
  player.tilt = (player.tilt || 0) + (targetTilt - (player.tilt || 0)) * 0.22;

  // Airborne stretch
  if (!player.grounded) {
    if (player.vy > 4) {
      player.stretch = Math.min(0.6, (player.vy - 4) * 0.08);
    }
  }

  // Squish / stretch decay
  if (player.squish  > 0) { player.squish  *= 0.80; if (player.squish  < 0.01) player.squish  = 0; }
  if (player.stretch > 0) { player.stretch *= 0.80; if (player.stretch < 0.01) player.stretch = 0; }

  // Directional gaze and blinking
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
