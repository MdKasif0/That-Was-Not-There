import { CANVAS_W, CANVAS_H, C, DEATH_FREEZE, TRANSITION_MS } from './constants.js';
import { getLevelCount } from './levels.js';
import { getSettings } from './settings.js';

/* ═══════════════════════════════════════════════════════════
   MAIN ENTRY — called once per frame from game.js
   ═══════════════════════════════════════════════════════════ */
export function render(ctx, s) {
  ctx.save();
  const panX = s.camera ? s.camera.panX || 0 : 0;
  const panY = s.camera ? s.camera.panY || 0 : 0;
  const shakeX = getSettings().reducedMotion ? 0 : s.shake.x;
  const shakeY = getSettings().reducedMotion ? 0 : s.shake.y;
  ctx.translate(panX + shakeX, panY + shakeY); // camera + screen-shake offset

  drawBackground(ctx, s);
  drawBgParticles(ctx, s.bgParticles, s.time);

  if (s.phase !== 'title') {
    drawPlatforms(ctx, s.platforms, s.time);
    drawSpikes(ctx, s.spikes);

    if (s.traps) {
      for (const trap of s.traps) {
        if (trap.render) trap.render(ctx, s.time);
      }
    }
    drawDoor(ctx, s.door, s.time);

    if (s.secret && !s.secret.collected) {
      drawSecret(ctx, s.secret, s.time);
    }

    // Dynamic ground shadow & player
    if (s.player.alive && s.phase !== 'dying') {
      drawPlayerGroundShadow(ctx, s.player);
      drawPlayer(ctx, s.player, s.time);
    }

    // Death impact ring & geometric shards
    drawDeathRing(ctx, s);
    drawDeathShards(ctx, s.deathShards);
    drawParticles(ctx, s.particles);

    // Subtle post-death causal echo (realization feedback)
    drawCausalEcho(ctx, s.causalEcho);
  }

  ctx.restore(); // remove camera + shake

  /* Screen-space Overlays */
  if (s.phase === 'dying' && s.deathTimer > DEATH_FREEZE - 35) {
    // Ultra-brief 35ms subtle impact vignette
    ctx.fillStyle = 'rgba(255, 45, 85, 0.14)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  if (s.phase === 'transitioning') drawTransition(ctx, s);
  drawUI(ctx, s);

  if (s.paused) drawPauseBackdrop(ctx);
}

/* ═══════════════════════════════════════════════════════════
   BACKGROUND & DEPTH
   ═══════════════════════════════════════════════════════════ */
let bgGrad = null;

function drawBackground(ctx, s) {
  // Deep slate architectural neutral gradient (cached to eliminate per-frame GC)
  if (!bgGrad) {
    bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bgGrad.addColorStop(0, C.bg0);
    bgGrad.addColorStop(0.5, C.bg1);
    bgGrad.addColorStop(1, C.bg2);
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle architectural grid
  ctx.strokeStyle = C.bgGrid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const gridStep = 48;
  for (let x = 0; x <= CANVAS_W; x += gridStep) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
  }
  for (let y = 0; y <= CANVAS_H; y += gridStep) {
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
  }
  ctx.stroke();

  // Distant geometric monoliths (subtle parallax)
  if (s.monoliths) {
    const camX = s.camera ? s.camera.panX || 0 : 0;
    for (const m of s.monoliths) {
      const mx = m.x - camX * 0.12;
      ctx.fillStyle = C.bgMonolith;
      ctx.strokeStyle = C.bgMonolithEdge;
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (m.peakCut > 0) {
        ctx.moveTo(mx, m.y + m.h);
        ctx.lineTo(mx, m.y + m.peakCut);
        ctx.lineTo(mx + m.peakCut, m.y);
        ctx.lineTo(mx + m.w - m.peakCut, m.y);
        ctx.lineTo(mx + m.w, m.y + m.peakCut);
        ctx.lineTo(mx + m.w, m.y + m.h);
      } else {
        ctx.rect(mx, m.y, m.w, m.h);
      }
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawBgParticles(ctx, list, time) {
  if (getSettings().reducedMotion) return;
  for (const p of list) {
    const sway = Math.sin(time * p.swaySpeed + p.swayOffset) * 6;
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = '#a8c2e6';
    ctx.beginPath();
    ctx.arc(p.x + sway, p.y, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
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

    /* 1. Subtle drop shadow underneath platform */
    ctx.fillStyle = C.platformShadow;
    ctx.fillRect(p.x + ox + 3, p.y + p.h, p.w - 6, 6);

    /* 2. Platform body */
    ctx.fillStyle = isVanish ? C.vanish : C.platform;
    roundRect(ctx, p.x + ox, p.y, p.w, p.h, 2);
    ctx.fill();

    /* 3. Top walking highlight & edge */
    ctx.fillStyle = isVanish ? C.vanishEdge : C.platformTop;
    ctx.fillRect(p.x + ox, p.y, p.w, 3);

    // Razor-sharp 1px top edge
    ctx.fillStyle = C.platformEdge;
    ctx.fillRect(p.x + ox, p.y, p.w, 1);

    /* 4. Minimal architectural recessed seam notches (not a noisy grid) */
    ctx.fillStyle = C.platformSeam;
    const seamGap = 40;
    for (let sx = p.x + seamGap; sx < p.x + p.w - 8; sx += seamGap) {
      ctx.fillRect(sx + ox, p.y + 3, 1, Math.min(8, p.h - 4));
    }

    /* 5. Vanish platform subtle luminescent shimmer */
    if (isVanish) {
      const shimmer = Math.sin(time * 0.003 + p.x * 0.05) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(0, 240, 255, ${0.05 + shimmer * 0.08})`;
      ctx.fillRect(p.x + ox, p.y + 1, p.w, 2);
    }

    /* 6. Subtle warning micro-vibration indicator */
    if (p.warning || ox !== 0) {
      const pulse = Math.sin(time * 0.03) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 170, 0, ${0.25 + pulse * 0.35})`;
      ctx.fillRect(p.x + ox, p.y + p.h - 2, p.w, 2);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   SPIKES  —  razor obsidian prisms with crimson core
   ═══════════════════════════════════════════════════════════ */
function drawSpikes(ctx, spikes) {
  for (const s of spikes) {
    if (!s.active) continue;

    // Ambient hazard aura
    ctx.fillStyle = C.spikeGlow;
    ctx.fillRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4);

    const tw = 16;
    const count = Math.max(1, Math.floor(s.w / tw));
    const isUp = s.dir === 'up';

    for (let i = 0; i < count; i++) {
      const sx = s.x + i * tw;
      const midX = sx + tw / 2;
      const base = isUp ? s.y + s.h : s.y;
      const apex = isUp ? s.y : s.y + s.h;

      // Dark obsidian geometric body
      ctx.fillStyle = C.spike;
      ctx.beginPath();
      ctx.moveTo(sx, base);
      ctx.lineTo(midX, apex);
      ctx.lineTo(sx + tw, base);
      ctx.closePath();
      ctx.fill();

      // Sharp crimson hazard apex
      ctx.fillStyle = C.spikeCore;
      ctx.beginPath();
      ctx.moveTo(midX - 3, isUp ? apex + 7 : apex - 7);
      ctx.lineTo(midX, apex);
      ctx.lineTo(midX + 3, isUp ? apex + 7 : apex - 7);
      ctx.closePath();
      ctx.fill();

      // Thin razor tip highlight
      ctx.fillStyle = C.spikeTip;
      ctx.fillRect(midX - 0.75, isUp ? apex : apex - 2, 1.5, 2.5);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   DOOR  —  clean geometric portal
   ═══════════════════════════════════════════════════════════ */
function drawDoor(ctx, door, time) {
  if (!door) return;
  const pulse = Math.sin(time * 0.005) * 3 + 4;

  // Outer ambient glow
  ctx.fillStyle = C.doorGlow;
  ctx.fillRect(door.x - pulse, door.y - pulse, door.w + pulse * 2, door.h + pulse * 2);

  // Architectural frame
  ctx.fillStyle = C.doorFrame;
  ctx.fillRect(door.x - 2, door.y - 2, door.w + 4, door.h + 4);
  ctx.strokeStyle = C.doorEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(door.x - 2, door.y - 2, door.w + 4, door.h + 4);

  // Luminous inner portal
  const grad = ctx.createLinearGradient(door.x, door.y, door.x, door.y + door.h);
  grad.addColorStop(0, C.doorInner);
  grad.addColorStop(1, C.door);
  ctx.fillStyle = grad;
  ctx.fillRect(door.x, door.y, door.w, door.h);

  // Breathing vertical threshold lines
  const beamA = Math.sin(time * 0.004) * 0.15 + 0.25;
  ctx.fillStyle = `rgba(255, 255, 255, ${beamA})`;
  ctx.fillRect(door.x + 4, door.y + 4, 3, door.h - 8);
  ctx.fillRect(door.x + door.w - 7, door.y + 4, 2, door.h - 8);

  // Above door minimal diamond glyph
  ctx.save();
  ctx.translate(door.x + door.w / 2, door.y - 8);
  ctx.fillStyle = C.doorEdge;
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.lineTo(3.5, 0);
  ctx.lineTo(0, 3.5);
  ctx.lineTo(-3.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════
   PLAYER GROUND SHADOW  —  dynamic distance-scaled cast shadow
   ═══════════════════════════════════════════════════════════ */
function drawPlayerGroundShadow(ctx, p) {
  const groundDist = p.groundDist ?? 0;
  if (groundDist > 140) return;

  const shadowFactor = Math.max(0, 1 - groundDist / 130);
  const cx = p.x + p.w * 0.5;
  const cy = p.y + p.h + groundDist;
  const rx = Math.max(3, (p.w * 0.55) * shadowFactor);
  const ry = Math.max(1.5, 3.5 * shadowFactor);

  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${0.42 * shadowFactor})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════
   PLAYER  —  procedural geometric character with animations
   ═══════════════════════════════════════════════════════════ */
function drawPlayer(ctx, p, time) {
  const cx = p.x + p.w / 2;
  const bot = p.y + p.h;

  /* Radial ambient luminescent cyan glow */
  const r = p.w + 12;
  const grad = ctx.createRadialGradient(cx, p.y + p.h * 0.5, 0, cx, p.y + p.h * 0.5, r);
  grad.addColorStop(0, C.playerGlow);
  grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, p.y + p.h * 0.5 - r, r * 2, r * 2);

  ctx.save();
  ctx.translate(cx, bot);

  /* 1. Procedural walking bounce (corner hop) */
  const isMoving = p.grounded && Math.abs(p.vx) > 0.2;
  const hop = isMoving ? Math.abs(Math.sin(p.walkCycle || 0)) * 2.2 : 0;
  ctx.translate(0, -hop);

  /* 2. Procedural body lean tilt */
  ctx.rotate(p.tilt || 0);

  /* 3. Squish / Stretch & Idle Breathing */
  const isIdle = p.grounded && Math.abs(p.vx) < 0.2;
  const idleBreathe = isIdle ? Math.sin(time * 0.004) * 0.025 : 0;

  const sx = (1 + p.squish * 0.28) * (1 - p.stretch * 0.16) * (1 - idleBreathe);
  const sy = (1 - p.squish * 0.22) * (1 + p.stretch * 0.28) * (1 + idleBreathe);
  ctx.scale(sx, sy);
  ctx.translate(-cx, -bot);

  /* 4. Main geometric body (sleek rounded capsule) */
  roundRect(ctx, p.x, p.y, p.w, p.h, 4);
  const bodyGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  bodyGrad.addColorStop(0, C.player);
  bodyGrad.addColorStop(1, C.playerDark);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  /* 5. Razor top bevel highlight */
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillRect(p.x + 3, p.y + 1, p.w - 6, 1.5);

  /* 6. Dark contrast visor band */
  const visorY = p.y + 6;
  const visorH = 10;
  roundRect(ctx, p.x + 2, visorY, p.w - 4, visorH, 2.5);
  ctx.fillStyle = '#07090f';
  ctx.fill();

  /* 7. Expressive procedural eyes */
  const eyeBaseY = visorY + 5;
  const eyeL = cx - 5 + (p.eyeOffsetX || 0);
  const eyeR = cx + 5 + (p.eyeOffsetX || 0);
  const eyeY = eyeBaseY + (p.eyeOffsetY || 0);

  if (p.blinkState === 1) {
    // Blinking shut: razor horizontal slits
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(eyeL - 2, eyeY);
    ctx.lineTo(eyeL + 2, eyeY);
    ctx.moveTo(eyeR - 2, eyeY);
    ctx.lineTo(eyeR + 2, eyeY);
    ctx.stroke();
  } else {
    // Open eyes: crisp geometric rectangles with directional pupils
    ctx.fillStyle = C.playerEye;
    ctx.fillRect(eyeL - 2, eyeY - 2.5, 4, 5);
    ctx.fillRect(eyeR - 2, eyeY - 2.5, 4, 5);

    // Expressive dark pupils tracking gaze
    const pupilShift = p.facingRight ? 0.8 : -0.8;
    ctx.fillStyle = C.playerPupil;
    ctx.fillRect(eyeL - 1 + pupilShift, eyeY - 1, 2, 2.5);
    ctx.fillRect(eyeR - 1 + pupilShift, eyeY - 1, 2, 2.5);
  }

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════
   DEATH SHOCKWAVE & GEOMETRIC SHARDS
   ═══════════════════════════════════════════════════════════ */
function drawDeathRing(ctx, s) {
  if (!s.deathRing || s.deathRing.alpha <= 0) return;
  ctx.save();
  ctx.strokeStyle = C.player;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = Math.max(0, s.deathRing.alpha);
  ctx.beginPath();
  ctx.arc(s.deathRing.x, s.deathRing.y, s.deathRing.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDeathShards(ctx, shards) {
  if (!shards || shards.length === 0) return;
  for (const sh of shards) {
    if (sh.life <= 0) continue;
    ctx.save();
    ctx.translate(sh.x, sh.y);
    ctx.rotate(sh.rot);
    ctx.globalAlpha = Math.max(0, sh.life);
    ctx.fillStyle = sh.color;

    // Geometric shard polygon (rhombus / prism)
    ctx.beginPath();
    ctx.moveTo(0, -sh.size);
    ctx.lineTo(sh.size * 0.7, 0);
    ctx.lineTo(0, sh.size * 0.8);
    ctx.lineTo(-sh.size * 0.7, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.75;
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles(ctx, list) {
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

/* ═══════════════════════════════════════════════════════════
   TRANSITION OVERLAY  —  fast snappy 200ms dual shutter
   ═══════════════════════════════════════════════════════════ */
function drawTransition(ctx, s) {
  if (getSettings().reducedMotion) {
    ctx.fillStyle = 'rgba(7, 8, 13, 0.9)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    return;
  }
  const half = TRANSITION_MS / 2;
  let progress;
  if (s.transDir === 'out') {
    progress = 1 - Math.max(0, s.transTimer / half); // 0 -> 1
  } else {
    progress = Math.max(0, s.transTimer / half);     // 1 -> 0
  }
  progress = clamp01(progress);

  // Fast geometric horizontal dual shutter
  const w = (CANVAS_W / 2) * progress;
  ctx.fillStyle = C.bg0;
  ctx.fillRect(0, 0, w, CANVAS_H);
  ctx.fillRect(CANVAS_W - w, 0, w, CANVAS_H);

  // Thin cyan leading seam
  if (w > 2 && progress < 0.98) {
    ctx.fillStyle = C.player;
    ctx.fillRect(w - 2, 0, 2, CANVAS_H);
    ctx.fillRect(CANVAS_W - w, 0, 2, CANVAS_H);
  }
}

/* ═══════════════════════════════════════════════════════════
   UI & TYPOGRAPHY
   ═══════════════════════════════════════════════════════════ */
function drawUI(ctx, s) {
  switch (s.phase) {
    case 'title':    return drawTitle(ctx, s);
    case 'complete': return drawComplete(ctx, s);
    default:         return drawHUD(ctx, s);
  }
}

/* — in-game minimal HUD --------------------------------- */
function drawHUD(ctx, s) {
  const total = getLevelCount();
  const roomNum = s.currentLevel + 1;
  const roomIndex = String(roomNum).padStart(2, '0');

  /* 0. Top Progress Indicator Bar */
  const progressRatio = Math.min(1, Math.max(0, roomNum / total));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(0, 0, CANVAS_W, 2);
  ctx.fillStyle = C.player;
  ctx.fillRect(0, 0, CANVAS_W * progressRatio, 2);

  ctx.textBaseline = 'top';

  /* 1. Room label — top left */
  ctx.textAlign = 'left';
  ctx.fillStyle = C.text;
  ctx.font = '700 13px "JetBrains Mono", "SF Mono", monospace';
  ctx.fillText(`ROOM ${roomIndex} / ${String(total).padStart(2, '0')}`, 18, 14);

  /* 2. Deaths counter — unobstructed placement next to room */
  ctx.fillStyle = '#ff5c7c';
  ctx.font = '600 12px "JetBrains Mono", monospace';
  ctx.fillText(`☠ DEATHS: ${s.deaths}`, 155, 14);

  /* 3. Secret collectible diamond tally */
  const secretCount = s.secretsCollected ? s.secretsCollected.length : 0;
  if (secretCount > 0 || (s.secret && !s.secret.collected)) {
    ctx.fillStyle = secretCount > 0 ? C.secretStar : C.textDim;
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillText(`◆ ${secretCount}/15`, 275, 15);
  }

  /* 4. Room subtitle */
  if (s.levelDef) {
    ctx.fillStyle = C.textDim;
    ctx.font = '500 11px "JetBrains Mono", monospace';
    const title = s.levelDef.title || s.levelDef.name || '';
    ctx.fillText(title.toUpperCase(), 18, 32);
  }

  /* 5. Minimal restart hint & First-launch controls */
  if (s.currentLevel === 0) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = C.textHint;
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText('MOVE: [A / D] or [← / →]   •   JUMP: [SPACE / W] or [↑]', CANVAS_W / 2, CANVAS_H - 34);
    ctx.fillStyle = C.textDim;
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillText('[R] QUICK RESTART   •   [ESC / P] IN-GAME MENU & SETTINGS', CANVAS_W / 2, CANVAS_H - 16);
    ctx.restore();
  } else {
    ctx.fillStyle = C.textDim;
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('[R] RESTART', CANVAS_W / 2, CANVAS_H - 10);
  }

  /* 6. Level intro typography card */
  if (s.levelNameTimer > 0 && s.levelDef) {
    const elapsed = 2200 - s.levelNameTimer;
    let a;
    if (elapsed < 180)       a = elapsed / 180;
    else if (elapsed < 1600) a = 1;
    else                     a = (2200 - elapsed) / 600;
    a = clamp01(a);

    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = C.text;
    ctx.font = '700 24px "JetBrains Mono", "SF Mono", monospace';
    ctx.fillText(`ROOM ${roomIndex}`, CANVAS_W / 2, CANVAS_H / 2 - 32);

    ctx.fillStyle = C.textMuted;
    ctx.font = '500 15px "JetBrains Mono", monospace';
    const roomTitle = s.levelDef.title || s.levelDef.name;
    ctx.fillText(`${roomTitle}`, CANVAS_W / 2, CANVAS_H / 2);

    if (s.levelDef.subtitle) {
      ctx.fillStyle = C.textDim;
      ctx.font = '400 12px "JetBrains Mono", monospace';
      ctx.fillText(s.levelDef.subtitle, CANVAS_W / 2, CANVAS_H / 2 + 24);
    }

    // Thin elegant hairline accent
    ctx.fillStyle = C.player;
    ctx.fillRect(CANVAS_W / 2 - 24, CANVAS_H / 2 + 38, 48, 1.5);

    ctx.restore();
  }
}

/* — ambient pause backdrop wash ------------------------- */
function drawPauseBackdrop(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(7, 9, 14, 0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.restore();
}

/* — title screen ---------------------------------------- */
function drawTitle(ctx, s) {
  ctx.fillStyle = 'rgba(7, 8, 13, 0.65)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;

  // Sleek geometric diamond emblem
  ctx.save();
  ctx.translate(cx, cy - 70);
  ctx.fillStyle = C.player;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(18, 0);
  ctx.lineTo(0, 18);
  ctx.lineTo(-18, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = C.bg0;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, 8);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  /* Title */
  ctx.fillStyle = C.text;
  ctx.font = '700 36px "JetBrains Mono", "SF Mono", monospace';
  ctx.fillText('THAT WAS NOT THERE', cx, cy - 10);

  /* Subtitle */
  ctx.fillStyle = C.textDim;
  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillText('AN ORIGINAL PLATFORMER OF ENVIRONMENTAL DECEPTION', cx, cy + 26);

  /* Blink prompt */
  if (Math.sin(s.time * 0.005) > 0) {
    ctx.fillStyle = C.player;
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText('PRESS ANY KEY TO START', cx, cy + 72);
  }
}

/* — completion screen ----------------------------------- */
function drawComplete(ctx, s) {
  ctx.fillStyle = 'rgba(7, 9, 14, 0.92)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = C.player;
  ctx.font = '700 36px "JetBrains Mono", monospace';
  ctx.fillText('YOU SURVIVED.', cx, cy - 65);

  ctx.fillStyle = C.text;
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText(`TOTAL DEATHS: ${s.deaths}`, cx, cy - 10);

  const secrets = s.secretsCollected ? s.secretsCollected.length : 0;
  ctx.fillStyle = C.secretStar;
  ctx.font = '600 15px "JetBrains Mono", monospace';
  ctx.fillText(`◆ SECRETS FOUND: ${secrets} / ${total}`, cx, cy + 24);

  ctx.fillStyle = C.textDim;
  ctx.font = 'italic 500 13px "JetBrains Mono", monospace';
  ctx.fillText('"Nothing was ever really there."', cx, cy + 68);

  if (Math.sin(s.time * 0.005) > 0) {
    ctx.fillStyle = C.textHint;
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText('PRESS R TO PLAY AGAIN', cx, cy + 115);
  }
}

/* — secret collectible ---------------------------------- */
function drawSecret(ctx, secret, time) {
  const cx = secret.x + secret.w / 2;
  const cy = secret.y + secret.h / 2 + Math.sin(time * 0.007) * 4;

  ctx.fillStyle = C.secretGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.004);
  ctx.fillStyle = C.secretStar;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-6, -6, 12, 12);
  ctx.restore();
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

/* ── Post-death Causal Realization Feedback ─────────────── */
function drawCausalEcho(ctx, echo) {
  if (!echo || echo.alpha <= 0.01) return;
  ctx.save();
  // Faint dashed wireframe around the hazard/trigger area
  ctx.strokeStyle = `rgba(255, 60, 90, ${echo.alpha * 0.75})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(echo.x - 2, echo.y - 2, echo.w + 4, echo.h + 4);

  // Faint directional line from where the player died to the trigger
  if (echo.fromX != null && echo.fromY != null) {
    ctx.beginPath();
    ctx.moveTo(echo.fromX, echo.fromY);
    ctx.lineTo(echo.x + echo.w / 2, echo.y + echo.h / 2);
    ctx.strokeStyle = `rgba(255, 60, 90, ${echo.alpha * 0.4})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.stroke();

    // Small impact point circle at death origin
    ctx.beginPath();
    ctx.arc(echo.fromX, echo.fromY, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
