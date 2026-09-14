// ─── Canvas ───────────────────────────────────────────────
export const CANVAS_W = 960;
export const CANVAS_H = 540;

// ─── Player dimensions ───────────────────────────────────
export const PLAYER_W = 22;
export const PLAYER_H = 26;

// ─── Physics (tuned for 60 fps fixed-step) ───────────────
export const GRAVITY        = 0.55;
export const PLAYER_ACCEL   = 0.65;
export const MAX_SPEED      = 4.5;
export const FRICTION       = 0.78;
export const JUMP_VEL       = -10.8;
export const COYOTE_FRAMES  = 6;
export const JUMP_BUFFER    = 6;

// ─── Timing (tight, responsive, indie feel) ──────────────
export const DEATH_FREEZE   = 80;    // 80ms crisp freeze before immediate reset
export const TRANSITION_MS  = 200;   // 200ms fast aperture transition

// ─── Rendering / ground ──────────────────────────────────
export const GROUND_Y = 448;
export const FLOOR_H  = CANVAS_H - GROUND_Y;  // 92

// ─── Restrained Indie Color Palette ──────────────────────
export const C = {
  // Background & Depth
  bg0:            '#07080d',
  bg1:            '#0b0e15',
  bg2:            '#121622',
  bgGrid:         'rgba(255,255,255,0.018)',
  bgMonolith:     '#0d1018',
  bgMonolithEdge: 'rgba(255,255,255,0.035)',

  // Platforms & Environment
  platform:       '#161a25',
  platformTop:    '#2c3447',
  platformEdge:   '#3e4a64',
  platformSeam:   'rgba(255,255,255,0.04)',
  platformShadow: 'rgba(0,0,0,0.48)',
  vanish:         '#1b1f2e',
  vanishEdge:     '#3a4663',
  vanishGlow:     'rgba(100,160,255,0.12)',

  // Player (Luminescent Geometric Cyan)
  player:         '#00f0ff',
  playerDark:     '#009bb3',
  playerCore:     '#ffffff',
  playerGlow:     'rgba(0,240,255,0.22)',
  playerShadow:   'rgba(0,0,0,0.45)',
  playerEye:      '#ffffff',
  playerPupil:    '#07080d',

  // Hazards & Danger
  spike:          '#13161f',
  spikeCore:      '#ff2d55',
  spikeTip:       '#ff5c7c',
  spikeGlow:      'rgba(255,45,85,0.18)',

  // Goals & Exits
  door:           '#ffb700',
  doorInner:      '#ffe066',
  doorFrame:      '#232014',
  doorEdge:       '#ffd000',
  doorGlow:       'rgba(255,183,0,0.22)',

  // Traps (Organic, communicates state)
  trapWarn:       '#ffaa00',
  trapWarnGlow:   'rgba(255,170,0,0.16)',
  trapActive:     '#ff2d55',
  momentumChevrons: '#00f0ff',
  safeZoneAura:   'rgba(0,240,255,0.07)',
  safeZoneBorder: '#00f0ff',
  safeZoneWarn:   '#ff2d55',
  decoyGold:      '#ffd000',
  decoyGlow:      'rgba(255,208,0,0.20)',
  reactiveWall:   '#1b202d',
  reactiveEdge:   '#38435c',
  switchInactive: '#475069',
  switchActive:   '#00f0ff',
  switchLine:     'rgba(0,240,255,0.40)',

  // UI & Typography
  text:           '#f0f4fc',
  textMuted:      'rgba(240,244,252,0.50)',
  textDim:        'rgba(240,244,252,0.25)',
  textHint:       'rgba(240,244,252,0.70)',
  uiBorder:       'rgba(255,255,255,0.08)',
  uiBg:           'rgba(11,14,21,0.85)',

  // Collectibles & VFX
  secretStar:     '#00f0ff',
  secretGlow:     'rgba(0,240,255,0.32)',
  deathCols:      ['#00f0ff','#ffffff','#00b4cc','#ff2d55'],
  doorCols:       ['#ffb700','#ffd000','#ffffff'],
  vanishPart:     '#3e4a64',
};
