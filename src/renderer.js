import { CANVAS_W, CANVAS_H, C, DEATH_FREEZE, TRANSITION_MS } from './constants.js';

/* ═══════════════════════════════════════════════════════════
   MAIN ENTRY — called once per frame from game.js
   ═══════════════════════════════════════════════════════════ */
export function render(ctx, s) {
  ctx.save();
  ctx.translate(s.shake.x, s.shake.y);          // screen-shake offset

  drawBackground(ctx, s);
  drawBgParticles(ctx, s.bgParticles);

  if (s.phase !== 'title') {
    drawSpikes(ctx, s.spikes);
    drawPlatforms(ctx, s.platforms, s.time);
    drawDoor(ctx, s.door, s.time);

    if (s.player.alive && s.phase !== 'dying') {
      drawPlayer(ctx, s.player, s.time);
    }
    drawParticles(ctx, s.particles);
  }

  ctx.restore();                                  // remove shake

  /* overlays (shake-independent) */
  if (s.phase === 'dying' && s.deathTimer > DEATH_FREEZE - 80) {
    ctx.fillStyle = 'rgba(255,23,68,0.25)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  if (s.phase === 'transitioning') drawTransition(ctx, s);
  drawUI(ctx, s);
}

/* ═══════════════════════════════════════════════════════════
   BACKGROUND
   ═══════════════════════════════════════════════════════════ */
function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  g.addColorStop(0, C.bg1);
  g.addColorStop(1, C.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawBgParticles(ctx, list) {
  for (const p of list) {
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = '#fff';
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

/* ═══════════════════════════════════════════════════════════
   PLATFORMS
   ═══════════════════════════════════════════════════════════ */
function drawPlatforms(ctx, platforms, time) {
  for (const p of platforms) {
    if (!p.visible) continue;
    const ox = p.shakeX || 0;
    const isVanish = p.type === 'vanish' || p.type === 'vanish_on_jump';

    /* body */
    ctx.fillStyle = isVanish ? C.vanish : C.platform;
    ctx.fillRect(p.x + ox, p.y, p.w, p.h);

    /* top edge */
    ctx.fillStyle = isVanish ? C.vanishEdge : C.platformEdge;
    ctx.fillRect(p.x + ox, p.y, p.w, 2);

    /* grid lines */
    ctx.fillStyle = C.platformGrid;
    const gs = 16;
    for (let gx = Math.ceil(p.x / gs) * gs; gx < p.x + p.w; gx += gs) {
      ctx.fillRect(gx + ox, p.y, 1, p.h);
    }
    for (let gy = Math.ceil(p.y / gs) * gs; gy < p.y + p.h; gy += gs) {
      ctx.fillRect(p.x + ox, gy, p.w, 1);
    }

    /* vanish shimmer */
    if (isVanish) {
      const shimmer = Math.sin(time * 0.003 + p.x * 0.08) * 0.06 + 0.06;
      ctx.fillStyle = `rgba(100,100,210,${shimmer})`;
      ctx.fillRect(p.x + ox, p.y, p.w, p.h);
    }

    /* warning flash */
    if (p.warning) {
      const flash = Math.sin(time * 0.025) * 0.18 + 0.18;
      ctx.fillStyle = `rgba(255,40,40,${flash})`;
      ctx.fillRect(p.x + ox, p.y, p.w, p.h);
    }

    /* drop platform highlight */
    if (p.type === 'drop') {
      ctx.fillStyle = C.platformEdge;
      ctx.fillRect(p.x + ox, p.y, p.w, 2);
      ctx.fillRect(p.x + ox, p.y + p.h - 2, p.w, 2);
      ctx.fillRect(p.x + ox, p.y, 2, p.h);
      ctx.fillRect(p.x + ox + p.w - 2, p.y, 2, p.h);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   SPIKES
   ═══════════════════════════════════════════════════════════ */
function drawSpikes(ctx, spikes) {
  for (const s of spikes) {
    if (!s.active) continue;

    /* glow */
    ctx.fillStyle = C.spikeGlow;
    ctx.fillRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6);

    /* triangles */
    const tw = 16;
    const n = Math.floor(s.w / tw);
    ctx.fillStyle = C.spike;
    for (let i = 0; i < n; i++) {
      const sx = s.x + i * tw;
      ctx.beginPath();
      if (s.dir === 'up') {
        ctx.moveTo(sx, s.y + s.h);
        ctx.lineTo(sx + tw / 2, s.y);
        ctx.lineTo(sx + tw, s.y + s.h);
      } else {
        ctx.moveTo(sx, s.y);
        ctx.lineTo(sx + tw / 2, s.y + s.h);
        ctx.lineTo(sx + tw, s.y);
      }
      ctx.fill();
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   DOOR
   ═══════════════════════════════════════════════════════════ */
function drawDoor(ctx, door, time) {
  if (!door) return;
  const pulse = 5 + Math.sin(time * 0.005) * 3;

  /* glow */
  ctx.fillStyle = C.doorGlow;
  ctx.fillRect(door.x - pulse, door.y - pulse, door.w + pulse * 2, door.h + pulse * 2);

  /* frame */
  ctx.fillStyle = C.doorFrame;
  ctx.fillRect(door.x - 3, door.y - 3, door.w + 6, door.h + 6);

  /* body */
  ctx.fillStyle = C.door;
  ctx.fillRect(door.x, door.y, door.w, door.h);

  /* knob */
  ctx.fillStyle = C.doorFrame;
  ctx.beginPath();
  ctx.arc(door.x + door.w * 0.72, door.y + door.h * 0.55, 3, 0, Math.PI * 2);
  ctx.fill();

  /* highlight */
  const sh = Math.sin(time * 0.004) * 0.15 + 0.15;
  ctx.fillStyle = `rgba(255,255,255,${sh})`;
  ctx.fillRect(door.x + 3, door.y + 3, door.w * 0.3, door.h - 6);
}

/* ═══════════════════════════════════════════════════════════
   PLAYER  — geometric character with eyes + glow
   ═══════════════════════════════════════════════════════════ */
function drawPlayer(ctx, p, time) {
  const cx = p.x + p.w / 2;
  const bot = p.y + p.h;

  /* radial glow */
  const r = p.w + 10;
  const grad = ctx.createRadialGradient(cx, p.y + p.h * 0.5, 0, cx, p.y + p.h * 0.5, r);
  grad.addColorStop(0, 'rgba(0,229,255,0.18)');
  grad.addColorStop(1, 'rgba(0,229,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, p.y + p.h * 0.5 - r, r * 2, r * 2);

  /* squish / stretch transform */
  ctx.save();
  ctx.translate(cx, bot);
  const sx = (1 + p.squish * 0.3) * (1 - p.stretch * 0.15);
  const sy = (1 - p.squish * 0.2) * (1 + p.stretch * 0.2);
  ctx.scale(sx, sy);
  ctx.translate(-cx, -bot);

  /* body */
  roundRect(ctx, p.x, p.y, p.w, p.h, 3);
  ctx.fillStyle = C.player;
  ctx.fill();

  /* accent side */
  ctx.fillStyle = C.playerDark;
  if (p.facingRight) ctx.fillRect(p.x, p.y + 2, p.w * 0.28, p.h - 4);
  else               ctx.fillRect(p.x + p.w * 0.72, p.y + 2, p.w * 0.28, p.h - 4);

  /* eyes */
  const ey = p.y + p.h * 0.32;
  const ew = 4, eh = 5;
  const eo = p.facingRight ? 2 : -2;
  ctx.fillStyle = C.playerEye;
  ctx.fillRect(cx - 5 + eo, ey, ew, eh);
  ctx.fillRect(cx + 2 + eo, ey, ew, eh);

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════
   PARTICLES
   ═══════════════════════════════════════════════════════════ */
function drawParticles(ctx, list) {
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

/* ═══════════════════════════════════════════════════════════
   TRANSITION OVERLAY
   ═══════════════════════════════════════════════════════════ */
function drawTransition(ctx, s) {
  const half = TRANSITION_MS / 2;
  let a;
  if (s.transDir === 'out') a = 1 - s.transTimer / half;
  else                      a = s.transTimer / half;
  ctx.fillStyle = `rgba(8,8,15,${clamp01(a)})`;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

/* ═══════════════════════════════════════════════════════════
   HUD / UI
   ═══════════════════════════════════════════════════════════ */
function drawUI(ctx, s) {
  switch (s.phase) {
    case 'title':    return drawTitle(ctx, s);
    case 'complete': return drawComplete(ctx, s);
    default:         return drawHUD(ctx, s);
  }
}

/* — title screen ---------------------------------------- */
function drawTitle(ctx, s) {
  ctx.fillStyle = 'rgba(8,8,15,0.55)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  /* title */
  ctx.fillStyle = C.text;
  ctx.font = 'bold 46px "Courier New",monospace';
  ctx.fillText('THAT WAS NOT THERE', CANVAS_W / 2, CANVAS_H / 2 - 40);

  /* blink prompt */
  if (Math.sin(s.time * 0.005) > 0) {
    ctx.fillStyle = C.textDim;
    ctx.font = '17px "Courier New",monospace';
    ctx.fillText('Press any key to start', CANVAS_W / 2, CANVAS_H / 2 + 40);
  }
}

/* — in-game HUD ----------------------------------------- */
function drawHUD(ctx, s) {
  ctx.textBaseline = 'top';

  /* room label — top left */
  ctx.fillStyle = C.textDim;
  ctx.font      = '14px "Courier New",monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Room ${s.currentLevel + 1}`, 14, 14);

  /* deaths — top right */
  ctx.textAlign = 'right';
  ctx.fillStyle = C.text;
  ctx.font      = '15px "Courier New",monospace';
  ctx.fillText(`\u2620 ${s.deaths}`, CANVAS_W - 14, 14);

  /* restart hint — bottom centre */
  ctx.fillStyle = C.textDim;
  ctx.font      = '11px "Courier New",monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('R to restart', CANVAS_W / 2, CANVAS_H - 6);

  /* level intro overlay */
  if (s.levelNameTimer > 0 && s.levelDef) {
    const elapsed = 2500 - s.levelNameTimer;
    let a;
    if (elapsed < 300)       a = elapsed / 300;
    else if (elapsed < 2000) a = 1;
    else                     a = (2500 - elapsed) / 500;
    a = clamp01(a);

    ctx.globalAlpha  = a;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = C.text;
    ctx.font = 'bold 28px "Courier New",monospace';
    ctx.fillText(`ROOM ${s.currentLevel + 1}`, CANVAS_W / 2, CANVAS_H / 2 - 30);

    ctx.fillStyle = C.textDim;
    ctx.font = '17px "Courier New",monospace';
    ctx.fillText(`"${s.levelDef.name}"`, CANVAS_W / 2, CANVAS_H / 2 + 5);

    ctx.fillStyle = C.textHint;
    ctx.font = '13px "Courier New",monospace';
    ctx.fillText(s.levelDef.subtitle, CANVAS_W / 2, CANVAS_H / 2 + 35);

    ctx.globalAlpha = 1;
  }
}

/* — completion screen ----------------------------------- */
function drawComplete(ctx, s) {
  ctx.fillStyle = 'rgba(8,8,15,0.82)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = C.text;
  ctx.font = 'bold 42px "Courier New",monospace';
  ctx.fillText('You survived.', CANVAS_W / 2, CANVAS_H / 2 - 60);

  ctx.fillStyle = C.door;
  ctx.font = '24px "Courier New",monospace';
  ctx.fillText(`Deaths: ${s.deaths}`, CANVAS_W / 2, CANVAS_H / 2 + 10);

  ctx.fillStyle = C.textDim;
  ctx.font = '16px "Courier New",monospace';
  ctx.fillText('"Nothing was ever really there."', CANVAS_W / 2, CANVAS_H / 2 + 60);

  if (Math.sin(s.time * 0.005) > 0) {
    ctx.fillStyle = C.textHint;
    ctx.font = '14px "Courier New",monospace';
    ctx.fillText('Press R to play again', CANVAS_W / 2, CANVAS_H / 2 + 110);
  }
}

/* ═══════════════════════════════════════════════════════════
   UTIL
   ═══════════════════════════════════════════════════════════ */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
