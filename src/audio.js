/**
 * ═══════════════════════════════════════════════════════════
 * Original Procedural Audio Engine — That Was Not There
 * ═══════════════════════════════════════════════════════════
 * 
 * Generates 100% original, copyright-free sound effects and atmospherics
 * via the browser Web Audio API:
 * - Jump, Landing, Trap Activation, Death Impact, Victory Chime, UI clicks
 * - Continuous minimal procedural ambient drone
 * - Full compliance with browser autoplay security policies
 * - Real-time decoupling from physics and levels
 */

import { getSettings, onSettingsChange } from './settings.js';

let audioCtx = null;
let masterGain = null;
let sfxGain = null;
let ambientGain = null;

// Ambient nodes
let ambientOsc1 = null;
let ambientOsc2 = null;
let ambientFilter = null;
let ambientLFO = null;
let isAmbientPlaying = false;

// Noise buffer cache for impact & mechanical textures
let noiseBuffer = null;

/* ── Audio Context Initialization (Autoplay safe) ──────── */
export function initAudio() {
  if (typeof window === 'undefined') return;

  const unlockAudio = () => {
    ensureContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };

  window.addEventListener('pointerdown', unlockAudio, { once: false, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: false, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: false, passive: true });

  onSettingsChange((settings) => {
    updateAudioSettings(settings);
  });
}

function ensureContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    audioCtx = new AudioContextClass();

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.75, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.setValueAtTime(getSettings().sound ? 0.85 : 0.0, audioCtx.currentTime);
    sfxGain.connect(masterGain);

    ambientGain = audioCtx.createGain();
    ambientGain.gain.setValueAtTime(getSettings().ambient ? 0.16 : 0.0, audioCtx.currentTime);
    ambientGain.connect(masterGain);

    // Create 1-second white noise buffer for crisp percussive synthesis
    const bufferSize = audioCtx.sampleRate;
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    if (getSettings().ambient) {
      startAmbient();
    }
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

function updateAudioSettings(settings) {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  if (sfxGain) {
    sfxGain.gain.cancelScheduledValues(now);
    sfxGain.gain.setValueAtTime(settings.sound ? 0.85 : 0.0, now);
  }

  if (ambientGain) {
    ambientGain.gain.cancelScheduledValues(now);
    ambientGain.gain.setTargetAtTime(settings.ambient ? 0.16 : 0.0, now, 0.2);
  }

  if (settings.ambient && !isAmbientPlaying) {
    startAmbient();
  }
}

/* ── 1. Jump Sound ─────────────────────────────────────── */
export function playJump() {
  if (!getSettings().sound) return;
  const ctx = ensureContext();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Snappy rising pitch chirp (140Hz -> 330Hz)
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(330, now + 0.07);

  gain.gain.setValueAtTime(0.28, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

  osc.connect(gain);
  gain.connect(sfxGain);

  osc.start(now);
  osc.stop(now + 0.08);
}

/* ── 2. Landing Sound ──────────────────────────────────── */
export function playLanding(velocity = 4) {
  if (!getSettings().sound) return;
  const ctx = ensureContext();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  const intensity = Math.min(1.0, Math.max(0.15, velocity / 9.0));

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(95, now);
  osc.frequency.exponentialRampToValueAtTime(42, now + 0.05);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(260, now);

  gain.gain.setValueAtTime(0.25 * intensity, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);

  osc.start(now);
  osc.stop(now + 0.06);
}

/* ── 3. Trap Activation Sound ──────────────────────────── */
export function playTrap(trapType = 'generic') {
  if (!getSettings().sound) return;
  const ctx = ensureContext();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;

  if (trapType.includes('polarity') || trapType.includes('field') || trapType.includes('inversion')) {
    // Shimmering harmonic pulse
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.12);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  } else if (trapType.includes('Platform') || trapType.includes('collapse') || trapType.includes('drop')) {
    // Mechanical latch / stone friction click
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain);

      noise.start(now);
      noise.stop(now + 0.075);
    }
  } else {
    // Crisp mechanical tick
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(310, now + 0.04);

    gain.gain.setValueAtTime(0.20, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

/* ── 4. Death Sound ────────────────────────────────────── */
export function playDeath() {
  if (!getSettings().sound) return;
  const ctx = ensureContext();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;

  // Punchy sub impact
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(36, now + 0.075);

  oscGain.gain.setValueAtTime(0.35, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(oscGain);
  oscGain.connect(sfxGain);
  osc.start(now);
  osc.stop(now + 0.085);

  // Subtle noise snap
  if (noiseBuffer) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(680, now);

    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(sfxGain);

    noise.start(now);
    noise.stop(now + 0.055);
  }
}

/* ── 5. Level Completion / Victory Sound ───────────────── */
export function playVictory() {
  if (!getSettings().sound) return;
  const ctx = ensureContext();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, time: 0.00 }, // C5
    { freq: 659.25, time: 0.06 }, // E5
    { freq: 783.99, time: 0.12 }, // G5
  ];

  for (const { freq, time } of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0.001, now + time);
    gain.gain.linearRampToValueAtTime(0.24, now + time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.22);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(now + time);
    osc.stop(now + time + 0.23);
  }
}

/* ── 6. UI Interaction Sound ───────────────────────────── */
export function playUI() {
  if (!getSettings().sound) return;
  const ctx = ensureContext();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1100, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.018);

  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

  osc.connect(gain);
  gain.connect(sfxGain);

  osc.start(now);
  osc.stop(now + 0.022);
}

/* ── 7. Subtle Ambient Atmospheric Drone ───────────────── */
export function startAmbient() {
  if (!getSettings().ambient) return;
  const ctx = ensureContext();
  if (!ctx || isAmbientPlaying) return;

  try {
    const now = ctx.currentTime;

    ambientOsc1 = ctx.createOscillator();
    ambientOsc2 = ctx.createOscillator();
    ambientFilter = ctx.createBiquadFilter();
    ambientLFO = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    // Deep harmonic dual tone (A1 at 55Hz & slightly detuned 55.4Hz)
    ambientOsc1.type = 'sine';
    ambientOsc1.frequency.setValueAtTime(55.0, now);

    ambientOsc2.type = 'triangle';
    ambientOsc2.frequency.setValueAtTime(55.4, now);

    // Warm, muted lowpass filter
    ambientFilter.type = 'lowpass';
    ambientFilter.frequency.setValueAtTime(190, now);
    ambientFilter.Q.setValueAtTime(1.8, now);

    // Ultra-slow LFO (0.07Hz) to gently breathe cutoff
    ambientLFO.type = 'sine';
    ambientLFO.frequency.setValueAtTime(0.07, now);
    lfoGain.gain.setValueAtTime(60, now);

    ambientLFO.connect(lfoGain);
    lfoGain.connect(ambientFilter.frequency);

    ambientOsc1.connect(ambientFilter);
    ambientOsc2.connect(ambientFilter);
    ambientFilter.connect(ambientGain);

    ambientOsc1.start(now);
    ambientOsc2.start(now);
    ambientLFO.start(now);

    isAmbientPlaying = true;
  } catch (_) {}
}

export function stopAmbient() {
  if (!isAmbientPlaying) return;
  try {
    if (ambientOsc1) { ambientOsc1.stop(); ambientOsc1.disconnect(); }
    if (ambientOsc2) { ambientOsc2.stop(); ambientOsc2.disconnect(); }
    if (ambientLFO)  { ambientLFO.stop();  ambientLFO.disconnect(); }
  } catch (_) {}
  isAmbientPlaying = false;
}
