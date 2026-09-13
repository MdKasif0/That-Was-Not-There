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
    player.stretch     = 1;
    player.jumped      = true;
  }

  /* ── variable-height jump (release early ⇒ fall faster) */
  if (!input.jump && player.vy < 0) player.vy *= 0.85;

  /* ── gravity ────────────────────────────────────────── */
  player.vy += GRAVITY;
  if (player.vy > 13) player.vy = 13;          // terminal velocity

  /* ── integrate ──────────────────────────────────────── */
  player.x += player.vx;
  player.y += player.vy;

  /* ── squish / stretch decay ─────────────────────────── */
  if (player.squish  > 0) { player.squish  *= 0.82; if (player.squish  < 0.01) player.squish  = 0; }
  if (player.stretch > 0) { player.stretch *= 0.82; if (player.stretch < 0.01) player.stretch = 0; }
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
