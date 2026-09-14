import { C, CANVAS_W, CANVAS_H, GRAVITY } from './constants.js';
import { aabb } from './collision.js';

/* ═══════════════════════════════════════════════════════════
   BASE TRAP CLASS
   ═══════════════════════════════════════════════════════════ */
export class Trap {
  constructor(config = {}) {
    this.id = config.id || `trap_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type;
    this.position = { x: config.x ?? 0, y: config.y ?? 0 };
    this.size = { width: config.width ?? 0, height: config.height ?? 0 };
    this.active = config.active ?? true;
    this.visible = config.visible ?? true;
    this.triggered = false;
    this.visualState = 'idle'; // 'idle' | 'warning' | 'triggered' | 'active' | 'cooldown'
    this.timer = 0;
    this.config = config;
  }

  get x() { return this.position.x; }
  set x(v) { this.position.x = v; }
  get y() { return this.position.y; }
  set y(v) { this.position.y = v; }
  get width() { return this.size.width; }
  set width(v) { this.size.width = v; }
  get height() { return this.size.height; }
  set height(v) { this.size.height = v; }
  get w() { return this.size.width; }
  get h() { return this.size.height; }

  /**
   * Called when level is initialized or reset.
   * Can create platforms or link to room objects.
   */
  init(_state) {}

  /**
   * Fixed-step update (60Hz).
   */
  update(_player, _state, _dt) {}

  /**
   * Explicitly trigger the trap.
   */
  trigger(_player, _state) {
    this.triggered = true;
  }

  /**
   * Reset the trap to its initial state upon player death or room reset.
   */
  reset() {
    this.triggered = false;
    this.active = this.config.active ?? true;
    this.visible = this.config.visible ?? true;
    this.visualState = 'idle';
    this.timer = 0;
    this.position.x = this.config.x ?? 0;
    this.position.y = this.config.y ?? 0;
    this.size.width = this.config.width ?? 0;
    this.size.height = this.config.height ?? 0;
  }

  /**
   * Custom rendering for visual cues and state feedback.
   */
  render(_ctx, _time) {}
}

/* ═══════════════════════════════════════════════════════════
   1. DELAYED PLATFORM
   A platform appears normal but changes state shortly after
   the player lands on it (vibration warning -> collapse).
   ═══════════════════════════════════════════════════════════ */
export class DelayedPlatformTrap extends Trap {
  constructor(config) {
    super(config);
    this.delay = config.delay ?? 550;
    this.platform = null;
    this.shakeX = 0;
  }

  init(state) {
    // Register solid platform into room
    this.platform = {
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height,
      visible: true,
      solid: true,
      type: 'delayed',
      trapRef: this,
    };
    state.platforms.push(this.platform);
  }

  update(player, state, dt) {
    if (!this.active || !this.platform) return;

    // Check if player is standing on this platform
    const standing = player.grounded &&
      player.x + player.w > this.x && player.x < this.x + this.width &&
      Math.abs((player.y + player.h) - this.y) < 4;

    if (standing && !this.triggered) {
      this.trigger(player, state);
    }

    if (this.triggered) {
      this.timer += dt;
      if (this.timer < this.delay) {
        this.visualState = 'warning';
        // Progressive shudder
        const intensity = (this.timer / this.delay) * 4.5;
        this.shakeX = (Math.random() - 0.5) * intensity;
        this.platform.shakeX = this.shakeX;
      } else {
        // Drop / collapse
        this.visualState = 'triggered';
        this.platform.solid = false;
        this.platform.visible = false;
        this.platform.shakeX = 0;
        this.active = false;
        spawnTileParticles(this.platform, state.particles, C.trapWarn);
      }
    }
  }

  reset() {
    super.reset();
    this.shakeX = 0;
    if (this.platform) {
      this.platform.x = this.x;
      this.platform.y = this.y;
      this.platform.visible = true;
      this.platform.solid = true;
      this.platform.shakeX = 0;
    }
  }

  render(ctx, time) {
    if (!this.visible || !this.platform || !this.platform.visible) return;
    const ox = this.shakeX;
    const px = this.x + ox;
    const py = this.y;

    // Drop shadow
    ctx.fillStyle = C.platformShadow;
    ctx.fillRect(px + 3, py + this.height, this.width - 6, 6);

    // Platform body
    ctx.fillStyle = C.platform;
    ctx.fillRect(px, py, this.width, this.height);

    // Beveled top surface
    ctx.fillStyle = C.platformTop;
    ctx.fillRect(px, py, this.width, 3);
    ctx.fillStyle = C.platformEdge;
    ctx.fillRect(px, py, this.width, 1);

    // Warning micro-vibration indicator (subtle glowing seam)
    if (this.visualState === 'warning') {
      const flash = Math.sin(time * 0.04) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 170, 0, ${flash})`;
      ctx.fillRect(px, py + this.height - 2, this.width, 2);

      // Clean indicator pips
      const dots = Math.floor(this.width / 24);
      for (let i = 0; i < dots; i++) {
        ctx.fillRect(px + 10 + i * 24, py + 7, 3, 3);
      }
    } else {
      // Subtle architectural seam tick
      ctx.fillStyle = C.platformSeam;
      ctx.fillRect(px + 16, py + 3, 1, 4);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   2. FALSE EXIT
   The visible exit is not the actual completion trigger.
   Approaching it causes an environmental hazard/reaction
   and illuminates the true exit.
   ═══════════════════════════════════════════════════════════ */
export class FalseExitTrap extends Trap {
  constructor(config) {
    super(config);
    this.triggerRadius = config.triggerRadius ?? 110;
    this.realExitX = config.realExitX ?? (CANVAS_W - 100);
    this.realExitY = config.realExitY ?? 200;
    this.hazardSpikes = [];
  }

  init(state) {
    // Create decorative false exit door
    this.falseDoor = {
      x: this.x,
      y: this.y,
      w: this.width || 36,
      h: this.height || 56,
    };
    // Hide real door initially
    if (state.door) {
      this.cachedRealDoor = { ...state.door };
      state.door.x = -999; // move offscreen until revealed
    }
    // Prepare pop-up hazard spikes
    const spikeW = 72;
    this.spikeDef = {
      x: this.x - 18,
      y: this.y + this.falseDoor.h - 24,
      w: spikeW,
      h: 24,
      dir: 'up',
      active: false,
    };
    state.spikes.push(this.spikeDef);
  }

  update(player, state, dt) {
    if (!this.active) return;

    // Detect proximity to false door
    const dx = (player.x + player.w / 2) - (this.falseDoor.x + this.falseDoor.w / 2);
    const dy = (player.y + player.h / 2) - (this.falseDoor.y + this.falseDoor.h / 2);
    const dist = Math.hypot(dx, dy);

    if (dist < this.triggerRadius && !this.triggered) {
      this.trigger(player, state);
    }

    if (this.triggered) {
      this.timer += dt;
      this.visualState = 'triggered';
      // Activate spikes under the false door
      this.spikeDef.active = true;
      // Reveal the true exit elsewhere in the room
      if (state.door && this.cachedRealDoor) {
        state.door.x = this.realExitX;
        state.door.y = this.realExitY;
        state.door.w = this.cachedRealDoor.w;
        state.door.h = this.cachedRealDoor.h;
      }
    }
  }

  reset() {
    super.reset();
    if (this.spikeDef) this.spikeDef.active = false;
    this.visualState = 'idle';
  }

  render(ctx, time) {
    if (!this.visible || !this.falseDoor) return;
    const d = this.falseDoor;

    if (this.visualState === 'triggered') {
      // Glitched / locked red door
      ctx.fillStyle = 'rgba(255, 23, 68, 0.2)';
      ctx.fillRect(d.x - 4, d.y - 4, d.w + 8, d.h + 8);
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      // Red skull or cross
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(d.x + 8, d.y + 12);
      ctx.lineTo(d.x + d.w - 8, d.y + d.h - 12);
      ctx.moveTo(d.x + d.w - 8, d.y + 12);
      ctx.lineTo(d.x + 8, d.y + d.h - 12);
      ctx.stroke();
    } else {
      // Deceptive golden portal
      const pulse = 4 + Math.sin(time * 0.005) * 3;
      ctx.fillStyle = C.doorGlow;
      ctx.fillRect(d.x - pulse, d.y - pulse, d.w + pulse * 2, d.h + pulse * 2);
      ctx.fillStyle = C.doorFrame;
      ctx.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
      ctx.fillStyle = C.door;
      ctx.fillRect(d.x, d.y, d.w, d.h);
      // Knob
      ctx.fillStyle = C.doorFrame;
      ctx.beginPath();
      ctx.arc(d.x + d.w * 0.72, d.y + d.h * 0.55, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   3. MEMORY TRAP
   A trap behaves one way during the first encounter and
   differently after the player thinks they understand it.
   Communicated via glowing rune polarity indicators.
   ═══════════════════════════════════════════════════════════ */
export class MemoryTrap extends Trap {
  constructor(config) {
    super(config);
    this.attemptPolarity = 0; // 0 = Left solid / Right collapses, 1 = Inverted
    this.platformA = null;
    this.platformB = null;
    this.collapseDelay = config.collapseDelay ?? 200;
  }

  init(state) {
    // Current attempt determines polarity (learnable & signaled by rune lights)
    this.attemptPolarity = (state.levelAttempts || 0) % 2;

    const gap = 30;
    const halfW = (this.width - gap) / 2;

    this.platformA = {
      x: this.x,
      y: this.y,
      w: halfW,
      h: this.height,
      visible: true,
      solid: true,
      type: 'memory_a',
      isTrap: this.attemptPolarity === 1, // Trapped on odd attempts
    };

    this.platformB = {
      x: this.x + halfW + gap,
      y: this.y,
      w: halfW,
      h: this.height,
      visible: true,
      solid: true,
      type: 'memory_b',
      isTrap: this.attemptPolarity === 0, // Trapped on even attempts
    };

    state.platforms.push(this.platformA, this.platformB);
  }

  update(player, state, dt) {
    if (!this.active) return;

    for (const plat of [this.platformA, this.platformB]) {
      if (!plat || !plat.solid || !plat.isTrap) continue;

      const standing = player.grounded &&
        player.x + player.w > plat.x && player.x < plat.x + plat.w &&
        Math.abs((player.y + player.h) - plat.y) < 4;

      if (standing && !plat.triggered) {
        plat.triggered = true;
        plat.timer = 0;
      }

      if (plat.triggered) {
        plat.timer = (plat.timer || 0) + dt;
        if (plat.timer < this.collapseDelay) {
          plat.shakeX = (Math.random() - 0.5) * 4;
        } else {
          plat.solid = false;
          plat.visible = false;
          plat.shakeX = 0;
          spawnTileParticles(plat, state.particles, C.runeActive);
        }
      }
    }
  }

  reset() {
    super.reset();
    // Memory trap updates polarity on each reset
    if (this.platformA) {
      this.platformA.visible = true;
      this.platformA.solid = true;
      this.platformA.triggered = false;
      this.platformA.timer = 0;
      this.platformA.shakeX = 0;
    }
    if (this.platformB) {
      this.platformB.visible = true;
      this.platformB.solid = true;
      this.platformB.triggered = false;
      this.platformB.timer = 0;
      this.platformB.shakeX = 0;
    }
  }

  render(ctx, time) {
    if (!this.visible) return;

    // Render Rune Glyph Bar indicating polarity
    const cx = this.x + this.width / 2;
    const cy = this.y - 18;

    // Glowing rune symbol
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = this.attemptPolarity === 0 ? C.runeActive : C.runeInactive;
    ctx.fillText('◄ RUNE I', cx - 40, cy);
    ctx.fillStyle = this.attemptPolarity === 1 ? C.runeActive : C.runeInactive;
    ctx.fillText('RUNE II ►', cx + 40, cy);

    // Subtle glow on safe platform
    const safePlat = this.attemptPolarity === 0 ? this.platformA : this.platformB;
    if (safePlat && safePlat.visible) {
      const pulse = Math.sin(time * 0.006) * 0.15 + 0.15;
      ctx.fillStyle = `rgba(179, 136, 255, ${pulse})`;
      ctx.fillRect(safePlat.x, safePlat.y, safePlat.w, safePlat.h);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   4. MOMENTUM TRAP
   An apparently normal surface changes the player's horizontal
   movement behavior (ice friction or kinetic conveyor force).
   ═══════════════════════════════════════════════════════════ */
export class MomentumTrap extends Trap {
  constructor(config) {
    super(config);
    this.mode = config.mode ?? 'frictionless'; // 'frictionless' | 'boost' | 'reverse'
    this.force = config.force ?? 0.85;
    this.platform = null;
  }

  init(state) {
    this.platform = {
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height,
      visible: true,
      solid: true,
      type: 'momentum',
    };
    state.platforms.push(this.platform);
  }

  update(player, _state, _dt) {
    if (!this.active || !this.platform) return;

    const standing = player.grounded &&
      player.x + player.w > this.x && player.x < this.x + this.width &&
      Math.abs((player.y + player.h) - this.y) < 4;

    if (standing) {
      this.visualState = 'active';
      if (this.mode === 'frictionless') {
        // Incur friction bypass: preserve velocity without braking
        if (Math.abs(player.vx) > 0.1) {
          player.vx *= 1.02; // slide acceleration
        }
      } else if (this.mode === 'boost') {
        player.vx += this.force;
      } else if (this.mode === 'reverse') {
        player.vx -= this.force;
      }
    } else {
      this.visualState = 'idle';
    }
  }

  reset() {
    super.reset();
  }

  render(ctx, time) {
    if (!this.visible || !this.platform) return;
    const px = this.x;
    const py = this.y;

    // Platform base
    ctx.fillStyle = '#182436';
    ctx.fillRect(px, py, this.width, this.height);

    // Glowing animated chevrons
    const scroll = (time * 0.08) % 24;
    ctx.fillStyle = C.momentumChevrons;
    ctx.beginPath();
    for (let x = px - 24 + scroll; x < px + this.width; x += 24) {
      if (x < px || x + 12 > px + this.width) continue;
      // Draw chevron arrow >
      ctx.moveTo(x, py + 3);
      ctx.lineTo(x + 8, py + this.height / 2);
      ctx.lineTo(x, py + this.height - 3);
      ctx.lineTo(x + 4, py + this.height - 3);
      ctx.lineTo(x + 12, py + this.height / 2);
      ctx.lineTo(x + 4, py + 3);
    }
    ctx.fill();

    // Border highlights
    ctx.fillStyle = '#00bcd4';
    ctx.fillRect(px, py, this.width, 2);
  }
}

/* ═══════════════════════════════════════════════════════════
   5. FAKE SAFE ZONE
   Visually communicates safety with a comforting shield canopy,
   but standing in it charges a deadly hazard.
   ═══════════════════════════════════════════════════════════ */
export class FakeSafeZoneTrap extends Trap {
  constructor(config) {
    super(config);
    this.chargeTime = config.chargeTime ?? 800; // ms to trigger
    this.charge = 0;
    this.spikeHazard = null;
  }

  init(state) {
    // Underlying platform
    this.platform = {
      x: this.x,
      y: this.y + this.height - 16,
      w: this.width,
      h: 16,
      visible: true,
      solid: true,
      type: 'solid',
    };
    state.platforms.push(this.platform);

    // Hidden spikes that engage when charge reaches max
    this.spikeHazard = {
      x: this.x + 8,
      y: this.y + this.height - 24,
      w: this.width - 16,
      h: 24,
      dir: 'up',
      active: false,
    };
    state.spikes.push(this.spikeHazard);
  }

  update(player, state, dt) {
    if (!this.active) return;

    // Check if player is inside the safe zone bounds
    const inside = aabb(player, {
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height,
    });

    if (inside) {
      this.charge += dt;
      this.visualState = 'warning';

      if (this.charge >= this.chargeTime) {
        this.trigger(player, state);
      }
    } else {
      // Safe decay when player leaves
      this.charge = Math.max(0, this.charge - dt * 1.5);
      if (this.charge === 0 && !this.triggered) {
        this.visualState = 'idle';
      }
    }

    if (this.triggered) {
      this.visualState = 'triggered';
      this.spikeHazard.active = true;
    }
  }

  trigger(player, state) {
    super.trigger(player, state);
    if (this.spikeHazard) this.spikeHazard.active = true;
  }

  reset() {
    super.reset();
    this.charge = 0;
    if (this.spikeHazard) this.spikeHazard.active = false;
  }

  render(ctx, time) {
    if (!this.visible) return;

    const ratio = Math.min(1, this.charge / this.chargeTime);

    // Zone background tint (transitions from calming green to hostile red)
    if (ratio > 0) {
      ctx.fillStyle = ratio > 0.65 ? 'rgba(255, 61, 0, 0.25)' : 'rgba(0, 230, 118, 0.15)';
    } else {
      const pulse = Math.sin(time * 0.004) * 0.05 + 0.12;
      ctx.fillStyle = `rgba(0, 230, 118, ${pulse})`;
    }
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Border canopy
    ctx.strokeStyle = ratio > 0.65 ? C.safeZoneWarn : C.safeZoneBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Charge bar above zone
    if (this.charge > 0) {
      const bw = this.width - 20;
      const bx = this.x + 10;
      const by = this.y - 12;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, bw, 6);

      ctx.fillStyle = ratio > 0.7 ? '#ff1744' : '#ffea00';
      ctx.fillRect(bx, by, bw * ratio, 6);
    }

    // Sign text
    ctx.textAlign = 'center';
    ctx.font = '10px monospace';
    ctx.fillStyle = ratio > 0.65 ? '#ff3d00' : '#00e676';
    ctx.fillText('REST ZONE', this.x + this.width / 2, this.y + 14);
  }
}

/* ═══════════════════════════════════════════════════════════
   6. REACTIVE WALL
   A wall changes position or collision state when the player
   approaches within trigger range.
   ═══════════════════════════════════════════════════════════ */
export class ReactiveWallTrap extends Trap {
  constructor(config) {
    super(config);
    this.targetY = config.targetY ?? (this.y - 80);
    this.speed = config.speed ?? 3.5;
    this.triggerDistance = config.triggerDistance ?? 140;
    this.initialY = this.y;
    this.platform = null;
  }

  init(state) {
    this.platform = {
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height,
      visible: true,
      solid: true,
      type: 'reactive_wall',
    };
    state.platforms.push(this.platform);
  }

  update(player, state, dt) {
    if (!this.active || !this.platform) return;

    const dist = Math.abs((player.x + player.w / 2) - (this.x + this.width / 2));
    if (dist < this.triggerDistance && !this.triggered) {
      this.trigger(player, state);
    }

    if (this.triggered) {
      this.visualState = 'warning';
      // Smooth movement towards target position
      if (Math.abs(this.y - this.targetY) > 2) {
        const dir = Math.sign(this.targetY - this.y);
        this.y += dir * this.speed;
        this.platform.y = this.y;

        // Visual spark particles
        if (Math.random() < 0.3) {
          state.particles.push({
            x: this.x + Math.random() * this.width,
            y: this.y + (dir > 0 ? this.height : 0),
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2,
            life: 0.8,
            decay: 0.04,
            size: 2,
            color: '#ffd700',
          });
        }
      } else {
        this.y = this.targetY;
        this.platform.y = this.y;
      }
    }
  }

  reset() {
    super.reset();
    this.y = this.initialY;
    if (this.platform) {
      this.platform.y = this.initialY;
    }
  }

  render(ctx, _time) {
    if (!this.visible || !this.platform) return;

    // Drop shadow
    ctx.fillStyle = C.platformShadow;
    ctx.fillRect(this.x + 3, this.y + this.height, this.width - 6, 6);

    // Architectural monolith body
    ctx.fillStyle = C.reactiveWall;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Beveled vertical edges
    ctx.fillStyle = C.reactiveEdge;
    ctx.fillRect(this.x, this.y, 2, this.height);
    ctx.fillRect(this.x + this.width - 2, this.y, 2, this.height);
    ctx.fillRect(this.x, this.y, this.width, 2);

    // Subtle recessed mechanical seam notches
    ctx.fillStyle = C.platformSeam;
    for (let sy = this.y + 16; sy < this.y + this.height - 12; sy += 24) {
      ctx.fillRect(this.x + 4, sy, this.width - 8, 1);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   7. TIMING SWITCH
   A harmless-looking switch object alters another part of the
   room for a predictable window of time.
   ═══════════════════════════════════════════════════════════ */
export class TimingSwitchTrap extends Trap {
  constructor(config) {
    super(config);
    this.duration = config.duration ?? 3000;
    this.targetGroupId = config.targetGroupId ?? 1;
    this.timeLeft = 0;
    this.linkedPlatforms = [];
  }

  init(state) {
    // Find all platforms belonging to this switch's group
    this.linkedPlatforms = state.platforms.filter(p => p.group === this.targetGroupId);
    // Initially collapse the linked bridge
    for (const p of this.linkedPlatforms) {
      p.solid = false;
      p.visible = false;
    }
  }

  update(player, state, dt) {
    if (!this.active) return;

    // Check if player touched the switch pedestal
    const touching = aabb(player, {
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height,
    });

    if (touching && !this.triggered) {
      this.trigger(player, state);
      this.timeLeft = this.duration;
      // Activate linked platforms
      for (const p of this.linkedPlatforms) {
        p.solid = true;
        p.visible = true;
        spawnTileParticles(p, state.particles, C.switchActive);
      }
    }

    if (this.triggered) {
      this.timeLeft -= dt;
      this.visualState = 'active';

      if (this.timeLeft <= 0) {
        // Time expired! Bridge collapses
        this.triggered = false;
        this.visualState = 'idle';
        for (const p of this.linkedPlatforms) {
          p.solid = false;
          p.visible = false;
          spawnTileParticles(p, state.particles, C.switchInactive);
        }
      }
    }
  }

  reset() {
    super.reset();
    this.timeLeft = 0;
    for (const p of this.linkedPlatforms) {
      p.solid = false;
      p.visible = false;
    }
  }

  render(ctx, time) {
    if (!this.visible) return;

    // Switch pedestal base
    ctx.fillStyle = C.platform;
    ctx.fillRect(this.x + this.width / 2 - 4, this.y + 12, 8, this.height - 12);
    ctx.fillStyle = C.platformEdge;
    ctx.fillRect(this.x + this.width / 2 - 4, this.y + 12, 8, 1);

    // Glowing switch orb
    const orbColor = this.triggered ? C.switchActive : C.switchInactive;
    ctx.fillStyle = orbColor;
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + 8, 7, 0, Math.PI * 2);
    ctx.fill();

    // Signal conduit beam emitting toward linked objects
    if (this.triggered && this.linkedPlatforms && this.linkedPlatforms.length > 0) {
      const target = this.linkedPlatforms[0];
      ctx.save();
      ctx.strokeStyle = C.switchLine;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -time * 0.04;
      ctx.beginPath();
      ctx.moveTo(this.x + this.width / 2, this.y + 8);
      ctx.lineTo(target.x, target.y + target.h / 2);
      ctx.stroke();
      ctx.restore();
    }

    // Countdown ring if active
    if (this.triggered && this.timeLeft > 0) {
      const ratio = this.timeLeft / this.duration;
      ctx.strokeStyle = C.player;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + 8, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   8. DECOY OBJECT
   An alluring golden collectible in an alcove that distracts
   the player. Collecting it triggers an alert and weighs down
   the player, while the true path was direct.
   ═══════════════════════════════════════════════════════════ */
export class DecoyObjectTrap extends Trap {
  constructor(config) {
    super(config);
    this.collected = false;
    this.curseDuration = config.curseDuration ?? 2500;
    this.curseTimer = 0;
  }

  init(_state) {}

  update(player, state, dt) {
    if (!this.active || this.collected) return;

    const touching = aabb(player, {
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height,
    });

    if (touching && !this.triggered) {
      this.trigger(player, state);
      this.collected = true;
      this.curseTimer = this.curseDuration;

      // Heavy gravity curse
      player.vy += 4;
      // Screen-shake warning
      state.shake = { x: 0, y: 0, intensity: 6, dur: 300, maxDur: 300 };
    }

    if (this.curseTimer > 0) {
      this.curseTimer -= dt;
      // Increase falling velocity slightly (heavy burden)
      player.vy += GRAVITY * 0.4;
    }
  }

  reset() {
    super.reset();
    this.collected = false;
    this.curseTimer = 0;
  }

  render(ctx, time) {
    if (!this.visible || this.collected) return;

    const floatY = Math.sin(time * 0.006) * 4;
    const cy = this.y + floatY;

    // Glowing halo
    ctx.fillStyle = C.decoyGlow;
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, cy + this.height / 2, 18, 0, Math.PI * 2);
    ctx.fill();

    // Rotating diamond / artifact
    ctx.save();
    ctx.translate(this.x + this.width / 2, cy + this.height / 2);
    ctx.rotate(time * 0.003);
    ctx.fillStyle = C.decoyGold;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
  }
}

/* ═══════════════════════════════════════════════════════════
   9. RETURN TRAP
   The route seems safe moving forward, but attempting to
   backtrack / return triggers upward barrier spikes.
   ═══════════════════════════════════════════════════════════ */
export class ReturnTrap extends Trap {
  constructor(config) {
    super(config);
    this.forwardBoundaryX = config.forwardBoundaryX ?? (this.x + this.width);
    this.spikes = null;
    this.hasCrossedForward = false;
  }

  init(state) {
    // Floor platform
    this.platform = {
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height,
      visible: true,
      solid: true,
      type: 'return_surface',
    };
    state.platforms.push(this.platform);

    // Retractable spikes that emerge on return
    this.spikes = {
      x: this.x + 4,
      y: this.y - 18,
      w: this.width - 8,
      h: 18,
      dir: 'up',
      active: false,
    };
    state.spikes.push(this.spikes);
  }

  update(player, state, _dt) {
    if (!this.active) return;

    // Check if player pushed past forward boundary
    if (player.x > this.forwardBoundaryX) {
      this.hasCrossedForward = true;
    }

    // If player crossed forward and is now moving backwards (vx < -0.2) or re-entering from the right
    if (this.hasCrossedForward && player.vx < -0.2 && player.x < this.forwardBoundaryX + 20) {
      this.trigger(player, state);
      if (this.spikes) this.spikes.active = true;
      this.visualState = 'triggered';
    }
  }

  reset() {
    super.reset();
    this.hasCrossedForward = false;
    if (this.spikes) this.spikes.active = false;
  }

  render(ctx, _time) {
    if (!this.visible || !this.platform) return;

    // Draw one-way directional teeth on the ground
    ctx.fillStyle = '#222238';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.fillStyle = this.hasCrossedForward ? '#ff1744' : '#4a4a70';
    const toothW = 12;
    for (let tx = this.x + 2; tx < this.x + this.width - toothW; tx += toothW + 4) {
      ctx.beginPath();
      // Angled rightward shark fin / ratchet tooth
      ctx.moveTo(tx, this.y);
      ctx.lineTo(tx + toothW, this.y - 4);
      ctx.lineTo(tx + toothW, this.y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   10. CONFIDENCE TRAP
   A previously dangerous mechanic appears disabled or covered
   with a dormant plank, lulling the player into false confidence.
   ═══════════════════════════════════════════════════════════ */
export class ConfidenceTrap extends Trap {
  constructor(config) {
    super(config);
    this.dormancyDelay = config.dormancyDelay ?? 260; // short reaction window
    this.dormantSpikes = null;
    this.coverPlatform = null;
  }

  init(state) {
    // Dormant cover platform that looks like a bridge plank
    this.coverPlatform = {
      x: this.x,
      y: this.y,
      w: this.width,
      h: 12,
      visible: true,
      solid: true,
      type: 'dormant_plank',
    };
    state.platforms.push(this.coverPlatform);

    // Spikes underneath that activate when trodden on
    this.dormantSpikes = {
      x: this.x + 4,
      y: this.y - 16,
      w: this.width - 8,
      h: 20,
      dir: 'up',
      active: false,
    };
    state.spikes.push(this.dormantSpikes);
  }

  update(player, state, dt) {
    if (!this.active) return;

    // Detect player stepping onto the dormant plank
    const standing = player.grounded &&
      player.x + player.w > this.x && player.x < this.x + this.width &&
      Math.abs((player.y + player.h) - this.y) < 4;

    if (standing && !this.triggered) {
      this.trigger(player, state);
    }

    if (this.triggered) {
      this.timer += dt;
      if (this.timer < this.dormancyDelay) {
        this.visualState = 'warning';
        // Plank shakes
        this.coverPlatform.shakeX = (Math.random() - 0.5) * 3;
      } else {
        // Dormancy breaks! Spikes spring up violently
        this.visualState = 'triggered';
        this.coverPlatform.visible = false;
        this.coverPlatform.solid = false;
        this.dormantSpikes.active = true;
        spawnTileParticles(this.coverPlatform, state.particles, '#ff1744');
      }
    }
  }

  reset() {
    super.reset();
    if (this.coverPlatform) {
      this.coverPlatform.visible = true;
      this.coverPlatform.solid = true;
      this.coverPlatform.shakeX = 0;
    }
    if (this.dormantSpikes) {
      this.dormantSpikes.active = false;
    }
  }

  render(ctx, time) {
    if (!this.visible || !this.coverPlatform || !this.coverPlatform.visible) return;

    const ox = this.coverPlatform.shakeX || 0;
    // Makeshift dormant cover
    ctx.fillStyle = this.visualState === 'warning' ? '#ff5722' : '#3d3d52';
    ctx.fillRect(this.x + ox, this.y, this.width, 12);

    // Warning crackle lines
    if (this.visualState === 'warning') {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x + ox + 10, this.y + 2);
      ctx.lineTo(this.x + ox + this.width / 2, this.y + 10);
      ctx.lineTo(this.x + ox + this.width - 10, this.y + 2);
      ctx.stroke();
    } else {
      // "OFF" / Inactive indicator
      ctx.fillStyle = '#00e676';
      ctx.beginPath();
      ctx.arc(this.x + ox + this.width / 2, this.y + 6, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   LEGACY ADAPTER TRAPS (Backwards compatibility)
   ═══════════════════════════════════════════════════════════ */
export class VanishOnEnterTrap extends Trap {
  init(state) {
    this.group = this.config.group;
    this.triggerX = this.config.triggerX;
    this.initialDelay = this.config.initialDelay || 180;
    this.stagger = this.config.stagger || 95;
    this.indices = [];
    this.vanishIndex = 0;
  }

  update(player, state, dt) {
    if (!this.triggered && player.x + player.w > this.triggerX) {
      this.trigger(player, state);
      this.timer = 0;
      this.vanishIndex = 0;
      this.indices = [];
      for (let i = 0; i < state.platforms.length; i++) {
        if (state.platforms[i].group === this.group) this.indices.push(i);
      }
      for (const idx of this.indices) state.platforms[idx].warning = true;
    }
    if (!this.triggered) return;

    this.timer += dt;
    const elapsed = this.timer - this.initialDelay;
    if (elapsed < 0) return;

    const target = Math.min(Math.floor(elapsed / this.stagger) + 1, this.indices.length);
    while (this.vanishIndex < target) {
      const p = state.platforms[this.indices[this.vanishIndex]];
      if (p) {
        p.visible = false;
        p.solid = false;
        p.warning = false;
        spawnTileParticles(p, state.particles, C.vanishPart);
      }
      this.vanishIndex++;
    }
  }

  reset() {
    super.reset();
    this.vanishIndex = 0;
  }
}

export class DropOnLandTrap extends Trap {
  init() {
    this.group = this.config.group;
    this.delay = this.config.delay || 340;
  }

  update(player, state, dt) {
    for (const p of state.platforms) {
      if (p.group !== this.group || !p.visible) continue;

      const standing = player.grounded &&
        player.x + player.w > p.x && player.x < p.x + p.w &&
        Math.abs((player.y + player.h) - p.y) < 4;

      if (standing && !this.triggered) {
        this.trigger(player, state);
        this.timer = 0;
      }
      if (!this.triggered) continue;

      this.timer += dt;
      if (this.timer < this.delay) {
        p.shakeX = (Math.random() - 0.5) * 3.5;
        p.warning = true;
      } else {
        p.visible = false;
        p.solid = false;
        p.shakeX = 0;
        p.warning = false;
        spawnTileParticles(p, state.particles, C.vanishPart);
      }
    }
  }
}

export class VanishOnJumpTrap extends Trap {
  init() {
    this.group = this.config.group;
    this.zone = this.config.triggerZone;
  }

  update(player, state, _dt) {
    if (this.triggered || !this.zone) return;

    const inZone =
      player.x + player.w > this.zone.x && player.x < this.zone.x + this.zone.w &&
      player.y + player.h > this.zone.y && player.y < this.zone.y + this.zone.h;

    if (inZone && !player.grounded && player.vy < 0) {
      this.trigger(player, state);
      for (const p of state.platforms) {
        if (p.group !== this.group) continue;
        p.visible = false;
        p.solid = false;
        spawnTileParticles(p, state.particles, C.vanishPart);
      }
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   TRAP REGISTRY
   ═══════════════════════════════════════════════════════════ */
export const TrapRegistry = {
  registry: new Map(),

  register(type, trapClass) {
    this.registry.set(type, trapClass);
  },

  create(config) {
    const TrapClass = this.registry.get(config.type);
    if (!TrapClass) {
      console.warn(`[TrapRegistry] Unknown trap type: "${config.type}"`);
      return null;
    }
    return new TrapClass(config);
  }
};

// Register all 10 original trap types
TrapRegistry.register('delayedPlatform', DelayedPlatformTrap);
TrapRegistry.register('falseExit',       FalseExitTrap);
TrapRegistry.register('memoryTrap',      MemoryTrap);
TrapRegistry.register('momentumTrap',    MomentumTrap);
TrapRegistry.register('fakeSafeZone',    FakeSafeZoneTrap);
TrapRegistry.register('reactiveWall',    ReactiveWallTrap);
TrapRegistry.register('timingSwitch',    TimingSwitchTrap);
TrapRegistry.register('decoyObject',     DecoyObjectTrap);
TrapRegistry.register('returnTrap',      ReturnTrap);
TrapRegistry.register('confidenceTrap',  ConfidenceTrap);

// Register legacy aliases for backwards compatibility
TrapRegistry.register('vanish_on_enter', VanishOnEnterTrap);
TrapRegistry.register('drop_on_land',    DropOnLandTrap);
TrapRegistry.register('vanish_on_jump',  VanishOnJumpTrap);

/* ─── Shared particle helper ────────────────────────────── */
export function spawnTileParticles(tile, particles, color = C.vanishPart) {
  for (let i = 0; i < 9; i++) {
    particles.push({
      x: tile.x + Math.random() * (tile.w || 20),
      y: tile.y + Math.random() * 12,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -Math.random() * 2.2,
      life: 1,
      decay: 0.024 + Math.random() * 0.015,
      size: 2 + Math.random() * 3,
      color: color,
    });
  }
}
