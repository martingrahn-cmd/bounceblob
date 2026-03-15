import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ─── Constants ───
const PLAYER_RADIUS = 0.35;
const COIN_RADIUS = 0.2;
const STAR_RADIUS = 0.3;
const Y_MIN = -4.5;
const Y_MAX = 4.5;
const DEATH_Y_MIN = -5.5;
const DEATH_Y_MAX = 5.5;
const LEVEL_GAP = 8; // breathing room between levels

// ─── Cheerful Color Palette ───
// 6 world themes: 0=Forest, 1=Desert, 2=Night, 3=Winter, 4=Volcano, 5=Space
const PAL = {
  sky:    [0x87CEEB, 0xFFD180, 0x1A1A3E, 0xC5E8F7, 0x2D1B00, 0x0A0A2E],
  player: 0xFF6B8A,
  playerCheek: 0xFF4081,
  eye: 0xFFFFFF,
  pupil: 0x2C2C2C,
  coin: 0xFFD700,
  coinGlow: 0xFFF176,
  star: 0xFFAB00,
  finish: 0x69F0AE,
  ground: [0x5A8C3C, 0xD2A860, 0x2A2A5E, 0xB0D4E8, 0x4A2A10, 0x1A1A3E],
  obstacle: [0xFF8A65, 0xF06292, 0x7986CB, 0x4DB6AC],
  wall:   [0xFFAB91, 0xCE93D8, 0x80DEEA, 0xB0BEC5, 0xFF8A65, 0x7986CB],
  cloud:  0xFFFFFF,
  bg:     [0xC8E6C9, 0xFFE0B2, 0xD1C4E9, 0xE0F0FF, 0x3D2010, 0x151535],
  // Parallax layer colors per world [far, mid, near]
  parallax: [
    // 0: Forest - blue sky, green hills, darker trees
    { sky1: 0x87CEEB, sky2: 0xC8E6C9, far: 0x6B9B4A, mid: 0x4A7A2E, near: 0x3A6620 },
    // 1: Desert - warm sky, sandy dunes, mesa
    { sky1: 0xFFD180, sky2: 0xFFAB40, far: 0xD4A04A, mid: 0xC48830, near: 0xA06820 },
    // 2: Night - dark sky, purple hills, dark silhouettes
    { sky1: 0x1A1A4E, sky2: 0x0A0A2E, far: 0x2A2060, mid: 0x1A1040, near: 0x100A30 },
    // 3: Winter - pale sky, snowy mountains, icy pines
    { sky1: 0xC5E8F7, sky2: 0xE8F4FD, far: 0xA8C8D8, mid: 0x88AAC0, near: 0x607890 },
    // 4: Volcano - fiery sky, dark mountains, lava glow
    { sky1: 0x2D1B00, sky2: 0x4A1A00, far: 0x3A2010, mid: 0x2A1508, near: 0x1A0A00 },
    // 5: Space - deep space, nebula, asteroid field
    { sky1: 0x0A0A2E, sky2: 0x050520, far: 0x151540, mid: 0x0D0D30, near: 0x080820 },
  ],
};

// ─── Level Definitions ───
const LEVELS = [
  // ── Level 1: Tutorial ──
  {
    name: "Sunny Meadow",
    speed: 4.5,
    bgIdx: 0,
    elements: [
      { t: 'coin', x: 6, y: 0 }, { t: 'coin', x: 7, y: 0.5 }, { t: 'coin', x: 8, y: 1 },
      { t: 'coin', x: 9, y: 0.5 }, { t: 'coin', x: 10, y: 0 },
      { t: 'wall', x: 16, gapY: 0, gapH: 4 },
      { t: 'coin', x: 20, y: 1 }, { t: 'coin', x: 21, y: 1.5 }, { t: 'coin', x: 22, y: 1 },
      { t: 'wall', x: 28, gapY: 1, gapH: 3.5 },
      { t: 'wall', x: 34, gapY: -1, gapH: 3.5 },
      { t: 'star', x: 31, y: 0 },
      { t: 'coin', x: 38, y: 0 }, { t: 'coin', x: 39, y: 0 }, { t: 'coin', x: 40, y: 0 },
      { t: 'wall', x: 46, gapY: 0, gapH: 3 },
      { t: 'coin', x: 50, y: -1 }, { t: 'coin', x: 51, y: 0 }, { t: 'coin', x: 52, y: 1 },
      { t: 'star', x: 55, y: 3 },
      { t: 'coin', x: 58, y: 0 }, { t: 'coin', x: 59, y: 0 },
      { t: 'finish', x: 65 },
    ]
  },
  // ── Level 2: First Spinner ──
  {
    name: "Windy Hills",
    speed: 4.8,
    bgIdx: 0,
    elements: [
      { t: 'coin', x: 6, y: 0 }, { t: 'coin', x: 7, y: 0 }, { t: 'coin', x: 8, y: 0 },
      { t: 'wall', x: 14, gapY: 0.5, gapH: 3.5 },
      { t: 'spinner', x: 20, y: 0, len: 2, spd: 1.5 },
      { t: 'star', x: 20, y: 3.5 },
      { t: 'coin', x: 25, y: 1 }, { t: 'coin', x: 26, y: 1 },
      { t: 'wall', x: 32, gapY: -1, gapH: 3 },
      { t: 'wall', x: 37, gapY: 1, gapH: 3 },
      { t: 'coin', x: 34, y: -1 }, { t: 'coin', x: 35, y: -1 },
      { t: 'spinner', x: 43, y: 0, len: 2.5, spd: -1.8 },
      { t: 'coin', x: 48, y: 0 }, { t: 'coin', x: 49, y: 0.5 }, { t: 'coin', x: 50, y: 1 },
      { t: 'star', x: 55, y: -2 },
      { t: 'wall', x: 58, gapY: 0, gapH: 3 },
      { t: 'coin', x: 62, y: 0 }, { t: 'coin', x: 63, y: 0 },
      { t: 'finish', x: 70 },
    ]
  },
  // ── Level 3: Walls & Spinners ──
  {
    name: "Candy Canyon",
    speed: 5,
    bgIdx: 0,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'wall', x: 12, gapY: 1.5, gapH: 3 },
      { t: 'spinner', x: 18, y: 0, len: 2.5, spd: 2 },
      { t: 'coin', x: 18, y: 3.5 },
      { t: 'wall', x: 24, gapY: -1.5, gapH: 2.8 },
      { t: 'wall', x: 29, gapY: 1.5, gapH: 2.8 },
      { t: 'star', x: 26, y: 0 },
      { t: 'coin', x: 33, y: -1 }, { t: 'coin', x: 34, y: 0 }, { t: 'coin', x: 35, y: 1 },
      { t: 'spinner', x: 40, y: 0, len: 2, spd: -2 },
      { t: 'spinner', x: 44, y: 0, len: 2, spd: 2 },
      { t: 'wall', x: 50, gapY: 0, gapH: 2.5 },
      { t: 'star', x: 48, y: 3.5 },
      { t: 'coin', x: 54, y: 0 }, { t: 'coin', x: 55, y: 0 }, { t: 'coin', x: 56, y: 0 },
      { t: 'wall', x: 62, gapY: -0.5, gapH: 2.5 },
      { t: 'coin', x: 66, y: 0 }, { t: 'coin', x: 67, y: 0 },
      { t: 'finish', x: 74 },
    ]
  },
  // ── Level 4: Movers ──
  {
    name: "Shifting Sands",
    speed: 5,
    bgIdx: 0,
    elements: [
      { t: 'coin', x: 5, y: 0.5 }, { t: 'coin', x: 6, y: 1 }, { t: 'coin', x: 7, y: 0.5 },
      { t: 'mover', x: 14, y: 0, range: 2, spd: 1.5, w: 1, h: 5 },
      { t: 'coin', x: 18, y: 2 }, { t: 'coin', x: 19, y: 2 },
      { t: 'wall', x: 24, gapY: 1, gapH: 2.8 },
      { t: 'spinner', x: 30, y: 0, len: 2.5, spd: 2 },
      { t: 'star', x: 30, y: 3.5 },
      { t: 'mover', x: 36, y: 0, range: 2.5, spd: -1.8, w: 1, h: 5 },
      { t: 'mover', x: 40, y: 0, range: 2.5, spd: 1.8, w: 1, h: 5 },
      { t: 'coin', x: 38, y: 0 },
      { t: 'wall', x: 46, gapY: -1, gapH: 2.5 },
      { t: 'coin', x: 50, y: -1 }, { t: 'coin', x: 51, y: 0 }, { t: 'coin', x: 52, y: 1 },
      { t: 'spinner', x: 57, y: 0, len: 2.5, spd: -2.2 },
      { t: 'star', x: 62, y: -2.5 },
      { t: 'coin', x: 65, y: 0 }, { t: 'coin', x: 66, y: 0 },
      { t: 'finish', x: 73 },
    ]
  },
  // ── Level 5: Sawblades Intro ──
  {
    name: "Sawmill Valley",
    speed: 5.2,
    bgIdx: 0,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0.5 }, { t: 'coin', x: 7, y: 1 },
      { t: 'sawblade', x: 14, y: 0, range: 0, spd: 2 },
      { t: 'coin', x: 18, y: 2 }, { t: 'coin', x: 19, y: 2 },
      { t: 'wall', x: 24, gapY: 1, gapH: 2.8 },
      { t: 'sawblade', x: 30, y: 2, range: 3, spd: 1.5 },
      { t: 'star', x: 28, y: -2.5 },
      { t: 'coin', x: 34, y: -1 }, { t: 'coin', x: 35, y: 0 }, { t: 'coin', x: 36, y: 1 },
      { t: 'spinner', x: 42, y: 0, len: 2.5, spd: 2 },
      { t: 'sawblade', x: 48, y: -1, range: 2, spd: 2 },
      { t: 'wall', x: 54, gapY: 1, gapH: 2.5 },
      { t: 'star', x: 52, y: 3.5 },
      { t: 'coin', x: 58, y: 0 }, { t: 'coin', x: 59, y: 0 }, { t: 'coin', x: 60, y: 0 },
      { t: 'sawblade', x: 66, y: 1, range: 2.5, spd: 1.8 },
      { t: 'coin', x: 70, y: 0 }, { t: 'coin', x: 71, y: 0 },
      { t: 'finish', x: 78 },
    ]
  },
  // ── Level 6: Spikeballs ──
  {
    name: "Spike Cavern",
    speed: 5.3,
    bgIdx: 1,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'spikeball', x: 12, y: 2, range: 2.5, spd: 1.5 },
      { t: 'wall', x: 18, gapY: -1, gapH: 2.5 },
      { t: 'coin', x: 22, y: -1 }, { t: 'coin', x: 23, y: 0 }, { t: 'coin', x: 24, y: 1 },
      { t: 'sawblade', x: 30, y: 0, range: 2, spd: 2 },
      { t: 'spikeball', x: 36, y: -2, range: 3, spd: 1.8 },
      { t: 'star', x: 33, y: 3.5 },
      { t: 'wall', x: 42, gapY: 1, gapH: 2.5 },
      { t: 'spinner', x: 48, y: 0, len: 2.5, spd: -2.5 },
      { t: 'spikeball', x: 54, y: 1, range: 2, spd: 2 },
      { t: 'coin', x: 58, y: 0 }, { t: 'coin', x: 59, y: 0 },
      { t: 'star', x: 62, y: -3 },
      { t: 'wall', x: 66, gapY: 0, gapH: 2.5 },
      { t: 'coin', x: 70, y: 0 }, { t: 'coin', x: 71, y: 0 },
      { t: 'finish', x: 78 },
    ]
  },
  // ── Level 7: Mixed Basics ──
  {
    name: "Cloud Kingdom",
    speed: 5.5,
    bgIdx: 1,
    elements: [
      { t: 'coin', x: 5, y: 1 }, { t: 'coin', x: 6, y: 1.5 },
      { t: 'spinner', x: 12, y: 0, len: 2.5, spd: 2.5 },
      { t: 'wall', x: 18, gapY: 2, gapH: 2.2 },
      { t: 'wall', x: 22, gapY: -1.5, gapH: 2.2 },
      { t: 'star', x: 20, y: 0 },
      { t: 'sawblade', x: 28, y: 0, range: 2.5, spd: 2 },
      { t: 'mover', x: 34, y: 0, range: 3, spd: 2, w: 0.8, h: 6 },
      { t: 'coin', x: 38, y: 0 }, { t: 'coin', x: 39, y: 0.5 }, { t: 'coin', x: 40, y: 1 },
      { t: 'spikeball', x: 46, y: 1, range: 2, spd: 2 },
      { t: 'wall', x: 52, gapY: -1, gapH: 2.2 },
      { t: 'spinner', x: 58, y: 0, len: 2.5, spd: -2.5 },
      { t: 'star', x: 56, y: -3 },
      { t: 'sawblade', x: 64, y: 2, range: 2, spd: 2.5 },
      { t: 'coin', x: 68, y: 0 }, { t: 'coin', x: 69, y: 0 }, { t: 'coin', x: 70, y: 0 },
      { t: 'wall', x: 76, gapY: 0.5, gapH: 2.5 },
      { t: 'coin', x: 80, y: 0 },
      { t: 'finish', x: 85 },
    ]
  },
  // ── Level 8: Crates & Pipes ──
  {
    name: "Pipe Works",
    speed: 5.5,
    bgIdx: 1,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'crate', x: 13, y: -2.5, scale: 1.6 },
      { t: 'pipe_straight', x: 13, y: 0 },
      { t: 'pipe_end', x: 13, y: 1.5 },
      { t: 'coin', x: 17, y: 2 }, { t: 'coin', x: 18, y: 2 },
      { t: 'spinner', x: 24, y: 0, len: 2.5, spd: 2 },
      { t: 'star', x: 24, y: 3.5 },
      { t: 'crate', x: 30, y: -1, scale: 1.4 },
      { t: 'crate', x: 32, y: 1.5, scale: 1.4 },
      { t: 'coin', x: 35, y: 0 }, { t: 'coin', x: 36, y: 0 },
      { t: 'sawblade', x: 42, y: 0, range: 2, spd: 2 },
      { t: 'pipe_straight', x: 48, y: -1 },
      { t: 'pipe_end', x: 48, y: 0.5 },
      { t: 'wall', x: 54, gapY: 1, gapH: 2.5 },
      { t: 'star', x: 52, y: -2.5 },
      { t: 'crate', x: 58, y: 0, scale: 1.6 },
      { t: 'spinner', x: 64, y: 0, len: 2, spd: -2.5 },
      { t: 'coin', x: 68, y: 0 }, { t: 'coin', x: 69, y: 0 },
      { t: 'finish', x: 76 },
    ]
  },
  // ── Level 9: Hammer Time ──
  {
    name: "Hammer Heights",
    speed: 5.8,
    bgIdx: 1,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0.5 },
      { t: 'hammer', x: 12, y: 2, len: 2.5, spd: 2 },
      { t: 'wall', x: 18, gapY: 0, gapH: 2.5 },
      { t: 'coin', x: 22, y: 1 }, { t: 'coin', x: 23, y: 1 },
      { t: 'sawblade', x: 28, y: -1, range: 2.5, spd: 2 },
      { t: 'hammer', x: 34, y: -2, len: 2, spd: 2.5 },
      { t: 'star', x: 31, y: 3.5 },
      { t: 'spinner', x: 40, y: 0, len: 2.5, spd: -2.5 },
      { t: 'coin', x: 44, y: -1 }, { t: 'coin', x: 45, y: 0 }, { t: 'coin', x: 46, y: 1 },
      { t: 'wall', x: 52, gapY: 1.5, gapH: 2.2 },
      { t: 'hammer', x: 58, y: 0, len: 3, spd: 1.8 },
      { t: 'star', x: 56, y: -3.5 },
      { t: 'wall', x: 64, gapY: -1, gapH: 2.2 },
      { t: 'coin', x: 68, y: 0 }, { t: 'coin', x: 69, y: 0 }, { t: 'coin', x: 70, y: 0 },
      { t: 'hammer', x: 76, y: 2, len: 2.5, spd: 2.5 },
      { t: 'coin', x: 80, y: 0 },
      { t: 'finish', x: 86 },
    ]
  },
  // ── Level 10: Saw Traps ──
  {
    name: "Buzz Factory",
    speed: 5.8,
    bgIdx: 1,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'saw_trap', x: 12, y: 0, rangeX: 0, rangeY: 0, spd: 2 },
      { t: 'coin', x: 16, y: 2 }, { t: 'coin', x: 17, y: 2 },
      { t: 'wall', x: 22, gapY: 1, gapH: 2.5 },
      { t: 'saw_trap', x: 28, y: 0, rangeX: 2, rangeY: 0, spd: 1.5 },
      { t: 'star', x: 26, y: 3.5 },
      { t: 'spinner', x: 34, y: 0, len: 2.5, spd: 2.5 },
      { t: 'coin', x: 38, y: 0 }, { t: 'coin', x: 39, y: 0 },
      { t: 'saw_trap_double', x: 44, y: -1, rangeX: 0, rangeY: 2, spd: 1.5 },
      { t: 'wall', x: 50, gapY: 0, gapH: 2.5 },
      { t: 'star', x: 54, y: -2.5 },
      { t: 'sawblade', x: 58, y: 1, range: 2, spd: 2 },
      { t: 'saw_trap', x: 64, y: 0, rangeX: 2, rangeY: 0, spd: 2 },
      { t: 'coin', x: 68, y: 0 }, { t: 'coin', x: 69, y: 0 },
      { t: 'finish', x: 76 },
    ]
  },
  // ── Level 11: Pendulums ──
  {
    name: "Pendulum Pit",
    speed: 5.8,
    bgIdx: 2,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'pendulum', x: 12, y: 3, len: 3, spd: 1.5, swing: 0.7 },
      { t: 'coin', x: 17, y: 1 }, { t: 'coin', x: 18, y: 1 },
      { t: 'wall', x: 24, gapY: 0, gapH: 2.5 },
      { t: 'star', x: 22, y: 3 },
      { t: 'pendulum', x: 30, y: 3.5, len: 3.5, spd: 1.2, swing: 0.8 },
      { t: 'sawblade', x: 36, y: 0, range: 2, spd: 2 },
      { t: 'coin', x: 40, y: -1 }, { t: 'coin', x: 41, y: 0 }, { t: 'coin', x: 42, y: 1 },
      { t: 'pendulum', x: 48, y: 3, len: 2.5, spd: 1.8, swing: 0.7 },
      { t: 'wall', x: 54, gapY: -1, gapH: 2.5 },
      { t: 'star', x: 58, y: -2.5 },
      { t: 'spinner', x: 62, y: 0, len: 2.5, spd: 2 },
      { t: 'pendulum', x: 68, y: 3, len: 3, spd: 1.5, swing: 0.9 },
      { t: 'coin', x: 72, y: 0 }, { t: 'coin', x: 73, y: 0 },
      { t: 'finish', x: 80 },
    ]
  },
  // ── Level 12: Spikerollers ──
  {
    name: "Roller Coaster",
    speed: 6,
    bgIdx: 2,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'spikeroller', x: 12, y: 0, range: 0, spd: 2 },
      { t: 'coin', x: 16, y: 2 }, { t: 'coin', x: 17, y: 2 },
      { t: 'wall', x: 22, gapY: 1.5, gapH: 2.5 },
      { t: 'spikeroller', x: 28, y: 2, range: 2.5, spd: 1.5 },
      { t: 'star', x: 26, y: -2 },
      { t: 'sawblade', x: 34, y: -1, range: 2, spd: 2 },
      { t: 'coin', x: 38, y: 0 }, { t: 'coin', x: 39, y: 0 },
      { t: 'spikeroller', x: 44, y: -1, range: 3, spd: 1.8 },
      { t: 'hammer', x: 50, y: 2, len: 2.5, spd: 2 },
      { t: 'wall', x: 56, gapY: 0, gapH: 2.2 },
      { t: 'star', x: 54, y: 3 },
      { t: 'spikeroller', x: 62, y: 1, range: 2, spd: 2 },
      { t: 'coin', x: 66, y: 0 }, { t: 'coin', x: 67, y: 0 },
      { t: 'spinner', x: 72, y: 0, len: 2.5, spd: -2.5 },
      { t: 'coin', x: 76, y: 0 },
      { t: 'finish', x: 82 },
    ]
  },
  // ── Level 13: Spikewalls ──
  {
    name: "Spike Corridor",
    speed: 6,
    bgIdx: 2,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'spikewall', x: 12, y: 0, scale: 1, rangeX: 0, rangeY: 2, spd: 1.5 },
      { t: 'coin', x: 16, y: 2 }, { t: 'coin', x: 17, y: 2 },
      { t: 'wall', x: 22, gapY: 1, gapH: 2.5 },
      { t: 'star', x: 20, y: -2.5 },
      { t: 'spikewall', x: 28, y: 1, scale: 1, rangeX: 2, rangeY: 0, spd: 1.5 },
      { t: 'sawblade', x: 34, y: -1, range: 2, spd: 2 },
      { t: 'coin', x: 38, y: 0 }, { t: 'coin', x: 39, y: 0 },
      { t: 'spikewall', x: 44, y: -1, scale: 1, rangeX: 0, rangeY: 2.5, spd: 1.8 },
      { t: 'spinner', x: 50, y: 0, len: 2.5, spd: 2.5 },
      { t: 'wall', x: 56, gapY: -1, gapH: 2.2 },
      { t: 'star', x: 60, y: 3.5 },
      { t: 'hammer', x: 64, y: 2, len: 2.5, spd: 2 },
      { t: 'spikewall', x: 70, y: 0, scale: 1, rangeX: 2, rangeY: 0, spd: 2 },
      { t: 'coin', x: 74, y: 0 }, { t: 'coin', x: 75, y: 0 },
      { t: 'finish', x: 82 },
    ]
  },
  // ── Level 14: Getting Harder ──
  {
    name: "Twisted Tunnels",
    speed: 6.2,
    bgIdx: 2,
    elements: [
      { t: 'coin', x: 5, y: 1 }, { t: 'coin', x: 6, y: 0 }, { t: 'coin', x: 7, y: -1 },
      { t: 'wall', x: 12, gapY: 2, gapH: 2.2 },
      { t: 'wall', x: 16, gapY: -2, gapH: 2.2 },
      { t: 'wall', x: 20, gapY: 1, gapH: 2 },
      { t: 'star', x: 16, y: 2 },
      { t: 'sawblade', x: 26, y: 0, range: 3, spd: 2 },
      { t: 'spinner', x: 32, y: 1, len: 2, spd: 3 },
      { t: 'spinner', x: 36, y: -1, len: 2, spd: -3 },
      { t: 'coin', x: 34, y: 3 }, { t: 'coin', x: 35, y: 3 },
      { t: 'mover', x: 42, y: 0, range: 3, spd: 2.5, w: 1, h: 5 },
      { t: 'mover', x: 46, y: 0, range: 3, spd: -2.5, w: 1, h: 5 },
      { t: 'star', x: 44, y: 0 },
      { t: 'pendulum', x: 52, y: 3, len: 3, spd: 1.5, swing: 0.8 },
      { t: 'wall', x: 58, gapY: 0, gapH: 2 },
      { t: 'saw_trap', x: 64, y: 0, rangeX: 2, rangeY: 0, spd: 2 },
      { t: 'coin', x: 68, y: 0 }, { t: 'coin', x: 69, y: 0 },
      { t: 'spikeball', x: 74, y: 0, range: 2.5, spd: 2 },
      { t: 'star', x: 78, y: -3 },
      { t: 'coin', x: 82, y: 0 },
      { t: 'finish', x: 88 },
    ]
  },
  // ── Level 15: Danger Zone ──
  {
    name: "Danger Zone",
    speed: 6.2,
    bgIdx: 2,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'hammer', x: 12, y: 2, len: 2.5, spd: 2.5 },
      { t: 'sawblade', x: 18, y: -1, range: 2.5, spd: 2 },
      { t: 'wall', x: 24, gapY: 0, gapH: 2.2 },
      { t: 'star', x: 22, y: 3 },
      { t: 'pendulum', x: 30, y: 3, len: 3, spd: 1.5, swing: 0.8 },
      { t: 'spikewall', x: 36, y: 0, scale: 1, rangeX: 0, rangeY: 2, spd: 2 },
      { t: 'coin', x: 40, y: 1 }, { t: 'coin', x: 41, y: 1 },
      { t: 'saw_trap_double', x: 46, y: 0, rangeX: 2, rangeY: 0, spd: 1.5 },
      { t: 'spikeball', x: 52, y: 2, range: 2.5, spd: 2 },
      { t: 'wall', x: 58, gapY: -1, gapH: 2 },
      { t: 'spinner', x: 64, y: 0, len: 3, spd: -2.5 },
      { t: 'star', x: 62, y: -3.5 },
      { t: 'hammer', x: 70, y: -2, len: 2, spd: 2.5 },
      { t: 'saw_trap', x: 76, y: 1, rangeX: 0, rangeY: 2, spd: 2 },
      { t: 'coin', x: 80, y: 0 }, { t: 'coin', x: 81, y: 0 },
      { t: 'finish', x: 88 },
    ]
  },
  // ── Level 16: Spinning Saws ──
  {
    name: "Inferno Forge",
    speed: 6.5,
    bgIdx: 3,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'saw_trap', x: 12, y: 0, rangeX: 0, rangeY: 0, spd: 2, spin: 2 },
      { t: 'wall', x: 18, gapY: 1, gapH: 2 },
      { t: 'saw_trap_long', x: 24, y: 0, rangeX: 2, rangeY: 0, spd: 1.5, w: 1.2 },
      { t: 'star', x: 22, y: 3.5 },
      { t: 'hammer', x: 30, y: 2, len: 2.5, spd: 2.5 },
      { t: 'hammer', x: 34, y: -2, len: 2.5, spd: -2.5 },
      { t: 'coin', x: 32, y: 0 }, { t: 'coin', x: 33, y: 0 },
      { t: 'pendulum', x: 40, y: 3.5, len: 3, spd: 1.5, swing: 0.9 },
      { t: 'sawblade', x: 46, y: 0, range: 3, spd: 2.5 },
      { t: 'wall', x: 52, gapY: -1, gapH: 2 },
      { t: 'saw_trap_double', x: 58, y: 0, rangeX: 0, rangeY: 2, spd: 2, spin: 1.5 },
      { t: 'star', x: 56, y: -3 },
      { t: 'spikeball', x: 64, y: 1, range: 2.5, spd: 2.5 },
      { t: 'saw_trap', x: 70, y: -1, rangeX: 2, rangeY: 0, spd: 2 },
      { t: 'coin', x: 74, y: 0 }, { t: 'coin', x: 75, y: 0 },
      { t: 'finish', x: 82 },
    ]
  },
  // ── Level 17: Pipe Maze ──
  {
    name: "Pipe Maze",
    speed: 6.5,
    bgIdx: 3,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'pipe_straight', x: 12, y: -2 },
      { t: 'pipe_end', x: 12, y: -0.5 },
      { t: 'sawblade', x: 16, y: 1, range: 2, spd: 2 },
      { t: 'pipe_straight', x: 22, y: 1.5 },
      { t: 'pipe_end', x: 22, y: 3 },
      { t: 'star', x: 20, y: -2 },
      { t: 'crate', x: 28, y: 0, scale: 1.5 },
      { t: 'crate', x: 28, y: 2, scale: 1.5 },
      { t: 'spinner', x: 34, y: 0, len: 2.5, spd: 2.5 },
      { t: 'coin', x: 38, y: 0 }, { t: 'coin', x: 39, y: 0 },
      { t: 'pipe_straight', x: 44, y: -1.5 },
      { t: 'pipe_end', x: 44, y: 0 },
      { t: 'pendulum', x: 50, y: 3.5, len: 3, spd: 1.5, swing: 0.8 },
      { t: 'wall', x: 56, gapY: 0, gapH: 2 },
      { t: 'star', x: 60, y: 3 },
      { t: 'crate', x: 64, y: -1, scale: 1.4 },
      { t: 'pipe_straight', x: 64, y: 1 },
      { t: 'pipe_end', x: 64, y: 2.5 },
      { t: 'hammer', x: 70, y: 2, len: 2.5, spd: 2.5 },
      { t: 'coin', x: 74, y: 0 }, { t: 'coin', x: 75, y: 0 },
      { t: 'finish', x: 82 },
    ]
  },
  // ── Level 18: Double Trouble ──
  {
    name: "Double Trouble",
    speed: 6.5,
    bgIdx: 3,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'spinner', x: 10, y: 1, len: 2, spd: 2.5 },
      { t: 'spinner', x: 14, y: -1, len: 2, spd: -2.5 },
      { t: 'wall', x: 20, gapY: 0, gapH: 2 },
      { t: 'star', x: 18, y: 3 },
      { t: 'saw_trap_double', x: 26, y: 1, rangeX: 0, rangeY: 2, spd: 2 },
      { t: 'saw_trap_double', x: 30, y: -1, rangeX: 0, rangeY: 2, spd: -2 },
      { t: 'coin', x: 34, y: 0 }, { t: 'coin', x: 35, y: 0 },
      { t: 'pendulum', x: 40, y: 3, len: 3, spd: 1.8, swing: 0.8 },
      { t: 'pendulum', x: 46, y: 3, len: 2.5, spd: 1.5, swing: 0.9 },
      { t: 'hammer', x: 52, y: 2, len: 2.5, spd: 2.5 },
      { t: 'hammer', x: 56, y: -2, len: 2.5, spd: -2.5 },
      { t: 'star', x: 54, y: 0 },
      { t: 'wall', x: 62, gapY: 1, gapH: 2 },
      { t: 'wall', x: 66, gapY: -1.5, gapH: 2 },
      { t: 'spikewall', x: 72, y: 0, scale: 1, rangeX: 0, rangeY: 2.5, spd: 2 },
      { t: 'coin', x: 76, y: 0 }, { t: 'coin', x: 77, y: 0 },
      { t: 'spikeball', x: 82, y: 0, range: 3, spd: 2 },
      { t: 'coin', x: 86, y: 0 },
      { t: 'finish', x: 92 },
    ]
  },
  // ── Level 19: Precision Required ──
  {
    name: "Razor Pass",
    speed: 6.8,
    bgIdx: 3,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'wall', x: 10, gapY: 2, gapH: 2 },
      { t: 'wall', x: 14, gapY: -2, gapH: 2 },
      { t: 'wall', x: 18, gapY: 0.5, gapH: 2 },
      { t: 'star', x: 14, y: 2 },
      { t: 'sawblade', x: 24, y: 0, range: 3, spd: 2.5 },
      { t: 'spikeroller', x: 30, y: 2, range: 2.5, spd: 2 },
      { t: 'coin', x: 34, y: -1 }, { t: 'coin', x: 35, y: 0 },
      { t: 'mover', x: 40, y: 0, range: 3, spd: 2.5, w: 0.6, h: 7 },
      { t: 'mover', x: 44, y: 0, range: 3, spd: -2.5, w: 0.6, h: 7 },
      { t: 'pendulum', x: 50, y: 3.5, len: 3.5, spd: 1.5, swing: 0.9 },
      { t: 'star', x: 48, y: -3 },
      { t: 'saw_trap', x: 56, y: 0, rangeX: 2, rangeY: 0, spd: 2, spin: 1.5 },
      { t: 'wall', x: 62, gapY: -0.5, gapH: 2 },
      { t: 'hammer', x: 68, y: 0, len: 3, spd: 2.5 },
      { t: 'spikeball', x: 74, y: 1, range: 2.5, spd: 2.5 },
      { t: 'coin', x: 78, y: 0 }, { t: 'coin', x: 79, y: 0 },
      { t: 'finish', x: 86 },
    ]
  },
  // ── Level 20: Everything Goes ──
  {
    name: "Kitchen Sink",
    speed: 6.8,
    bgIdx: 3,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'saw_trap', x: 10, y: 0, rangeX: 0, rangeY: 0, spd: 2, spin: 2 },
      { t: 'pendulum', x: 16, y: 3, len: 2.5, spd: 1.8, swing: 0.8 },
      { t: 'wall', x: 22, gapY: 1, gapH: 2 },
      { t: 'star', x: 20, y: -2.5 },
      { t: 'crate', x: 28, y: -1, scale: 1.5 },
      { t: 'pipe_straight', x: 28, y: 1 },
      { t: 'pipe_end', x: 28, y: 2.5 },
      { t: 'hammer', x: 34, y: 2, len: 2.5, spd: 2.5 },
      { t: 'spikeroller', x: 40, y: 0, range: 2, spd: 2 },
      { t: 'coin', x: 44, y: 0 }, { t: 'coin', x: 45, y: 0 },
      { t: 'spikewall', x: 50, y: 0, scale: 1, rangeX: 2, rangeY: 0, spd: 2 },
      { t: 'sawblade', x: 56, y: 2, range: 2.5, spd: 2.5 },
      { t: 'star', x: 54, y: -3 },
      { t: 'spinner', x: 62, y: 0, len: 3, spd: -2.5 },
      { t: 'mover', x: 68, y: 0, range: 3, spd: 2.5, w: 0.6, h: 7 },
      { t: 'saw_trap_long', x: 74, y: 0, rangeX: 0, rangeY: 2, spd: 2, w: 1.3 },
      { t: 'coin', x: 78, y: 0 },
      { t: 'pendulum', x: 84, y: 3.5, len: 3, spd: 1.5, swing: 0.9 },
      { t: 'coin', x: 88, y: 0 },
      { t: 'finish', x: 95 },
    ]
  },
  // ── Level 21: Speed Demon ──
  {
    name: "Speed Demon",
    speed: 7,
    bgIdx: 4,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'spinner', x: 10, y: 0, len: 3, spd: 3 },
      { t: 'sawblade', x: 16, y: 1, range: 2.5, spd: 3 },
      { t: 'sawblade', x: 20, y: -1, range: 2.5, spd: -3 },
      { t: 'wall', x: 24, gapY: 0, gapH: 2 },
      { t: 'star', x: 22, y: 3 },
      { t: 'hammer', x: 30, y: 2, len: 3, spd: 2.5 },
      { t: 'pendulum', x: 36, y: 3.5, len: 3, spd: 2, swing: 0.9 },
      { t: 'coin', x: 40, y: 0 }, { t: 'coin', x: 41, y: 0 },
      { t: 'saw_trap_double', x: 46, y: 0, rangeX: 2, rangeY: 0, spd: 2.5, spin: 1.5 },
      { t: 'spikeball', x: 52, y: 0, range: 3, spd: 2.5 },
      { t: 'wall', x: 58, gapY: -1, gapH: 1.8 },
      { t: 'wall', x: 62, gapY: 1.5, gapH: 1.8 },
      { t: 'star', x: 60, y: 0 },
      { t: 'spikewall', x: 68, y: 0, scale: 1, rangeX: 2, rangeY: 0, spd: 2.5 },
      { t: 'hammer', x: 74, y: -2, len: 2.5, spd: 3 },
      { t: 'sawblade', x: 80, y: 1, range: 2, spd: 3 },
      { t: 'coin', x: 84, y: 0 },
      { t: 'spinner', x: 90, y: 0, len: 3, spd: -3 },
      { t: 'coin', x: 94, y: 0 },
      { t: 'finish', x: 100 },
    ]
  },
  // ── Level 22: Chain Gang ──
  {
    name: "Chain Gang",
    speed: 7,
    bgIdx: 4,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'pendulum', x: 10, y: 3, len: 3, spd: 1.8, swing: 0.9 },
      { t: 'pendulum', x: 16, y: 3.5, len: 3.5, spd: 1.5, swing: 0.8 },
      { t: 'pendulum', x: 22, y: 3, len: 2.5, spd: 2, swing: 0.7 },
      { t: 'star', x: 16, y: -2 },
      { t: 'wall', x: 28, gapY: 0, gapH: 2 },
      { t: 'saw_trap', x: 34, y: 0, rangeX: 0, rangeY: 2, spd: 2 },
      { t: 'coin', x: 38, y: 0 }, { t: 'coin', x: 39, y: 0 },
      { t: 'pendulum', x: 44, y: 3, len: 3, spd: 2, swing: 1 },
      { t: 'hammer', x: 50, y: 2, len: 2.5, spd: 2.5 },
      { t: 'pendulum', x: 56, y: 3.5, len: 3.5, spd: 1.5, swing: 0.9 },
      { t: 'star', x: 53, y: -3 },
      { t: 'spikeball', x: 62, y: 0, range: 3, spd: 2 },
      { t: 'wall', x: 68, gapY: -1, gapH: 2 },
      { t: 'pendulum', x: 74, y: 3, len: 3, spd: 1.8, swing: 0.9 },
      { t: 'sawblade', x: 80, y: -1, range: 2, spd: 2.5 },
      { t: 'coin', x: 84, y: 0 },
      { t: 'finish', x: 90 },
    ]
  },
  // ── Level 23: Narrow Escape ──
  {
    name: "Narrow Escape",
    speed: 7,
    bgIdx: 4,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'wall', x: 10, gapY: 2.5, gapH: 1.8 },
      { t: 'wall', x: 13, gapY: -2, gapH: 1.8 },
      { t: 'wall', x: 16, gapY: 0, gapH: 1.8 },
      { t: 'wall', x: 19, gapY: 2, gapH: 1.8 },
      { t: 'star', x: 14.5, y: 2.5 },
      { t: 'spinner', x: 25, y: 0, len: 3, spd: 3 },
      { t: 'mover', x: 31, y: 0, range: 3.5, spd: 3, w: 0.6, h: 7 },
      { t: 'coin', x: 35, y: 2 }, { t: 'coin', x: 36, y: 2 },
      { t: 'saw_trap', x: 42, y: 0, rangeX: 2, rangeY: 0, spd: 2.5, spin: 2 },
      { t: 'pendulum', x: 48, y: 3, len: 3, spd: 2, swing: 1 },
      { t: 'wall', x: 54, gapY: -1.5, gapH: 1.8 },
      { t: 'star', x: 58, y: 3 },
      { t: 'spikewall', x: 62, y: 0, scale: 1, rangeX: 0, rangeY: 2.5, spd: 2.5 },
      { t: 'hammer', x: 68, y: 2, len: 3, spd: 2.5 },
      { t: 'hammer', x: 72, y: -2, len: 3, spd: -2.5 },
      { t: 'coin', x: 76, y: 0 },
      { t: 'sawblade', x: 82, y: 0, range: 3, spd: 3 },
      { t: 'coin', x: 86, y: 0 },
      { t: 'finish', x: 92 },
    ]
  },
  // ── Level 24: Storm Citadel ──
  {
    name: "Storm Citadel",
    speed: 7.2,
    bgIdx: 4,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'saw_trap_long', x: 10, y: 1, rangeX: 2, rangeY: 0, spd: 2, w: 1.5 },
      { t: 'saw_trap_long', x: 16, y: -1, rangeX: 2, rangeY: 0, spd: -2, w: 1.5 },
      { t: 'wall', x: 22, gapY: 0, gapH: 1.8 },
      { t: 'star', x: 20, y: 3.5 },
      { t: 'pendulum', x: 28, y: 3.5, len: 3.5, spd: 2, swing: 0.9 },
      { t: 'hammer', x: 34, y: 2, len: 2.5, spd: 3 },
      { t: 'spikeball', x: 38, y: -1, range: 3, spd: 2 },
      { t: 'coin', x: 42, y: 0 },
      { t: 'spinner', x: 48, y: 0, len: 3, spd: -3 },
      { t: 'spikewall', x: 54, y: 0, scale: 1, rangeX: 2, rangeY: 0, spd: 2.5 },
      { t: 'wall', x: 60, gapY: 1.5, gapH: 1.8 },
      { t: 'wall', x: 64, gapY: -1, gapH: 1.8 },
      { t: 'star', x: 62, y: 0 },
      { t: 'sawblade', x: 70, y: 2, range: 2, spd: 3 },
      { t: 'sawblade', x: 74, y: -2, range: 2, spd: -3 },
      { t: 'saw_trap_double', x: 80, y: 0, rangeX: 0, rangeY: 2, spd: 2, spin: 2 },
      { t: 'coin', x: 84, y: 0 },
      { t: 'pendulum', x: 90, y: 3, len: 3, spd: 1.8, swing: 1 },
      { t: 'coin', x: 94, y: 0 },
      { t: 'finish', x: 100 },
    ]
  },
  // ── Level 25: Wrecking Yard ──
  {
    name: "Wrecking Yard",
    speed: 7.2,
    bgIdx: 4,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'hammer', x: 10, y: 2, len: 3, spd: 2.5, swing: 1.3 },
      { t: 'hammer', x: 14, y: -2, len: 3, spd: -2.5, swing: 1.3 },
      { t: 'hammer', x: 18, y: 2, len: 2.5, spd: 3, swing: 1 },
      { t: 'star', x: 14, y: 0 },
      { t: 'wall', x: 24, gapY: 0, gapH: 1.8 },
      { t: 'pendulum', x: 30, y: 3.5, len: 3, spd: 2, swing: 1 },
      { t: 'saw_trap', x: 36, y: 0, rangeX: 2.5, rangeY: 0, spd: 2, spin: 2 },
      { t: 'coin', x: 40, y: 0 },
      { t: 'crate', x: 46, y: -2, scale: 1.5 },
      { t: 'crate', x: 46, y: 0, scale: 1.5 },
      { t: 'crate', x: 46, y: 2, scale: 1.5 },
      { t: 'sawblade', x: 52, y: 0, range: 3, spd: 3 },
      { t: 'spikeroller', x: 58, y: 2, range: 2.5, spd: 2.5 },
      { t: 'star', x: 56, y: -3 },
      { t: 'spinner', x: 64, y: 0, len: 3, spd: 3.5 },
      { t: 'mover', x: 70, y: 0, range: 3, spd: 3, w: 0.6, h: 7 },
      { t: 'hammer', x: 76, y: 0, len: 3, spd: 3 },
      { t: 'coin', x: 80, y: 0 },
      { t: 'pendulum', x: 86, y: 3, len: 3, spd: 2, swing: 1 },
      { t: 'coin', x: 90, y: 0 },
      { t: 'finish', x: 96 },
    ]
  },
  // ── Level 26: Death March ──
  {
    name: "Death March",
    speed: 7.5,
    bgIdx: 5,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'sawblade', x: 10, y: 1, range: 3, spd: 3 },
      { t: 'sawblade', x: 14, y: -1, range: 3, spd: -3 },
      { t: 'wall', x: 18, gapY: 0, gapH: 1.8 },
      { t: 'pendulum', x: 24, y: 3.5, len: 3, spd: 2, swing: 1 },
      { t: 'saw_trap_double', x: 30, y: 0, rangeX: 2, rangeY: 0, spd: 2.5, spin: 2 },
      { t: 'star', x: 28, y: -3 },
      { t: 'hammer', x: 36, y: 2, len: 3, spd: 3 },
      { t: 'spikewall', x: 42, y: 0, scale: 1, rangeX: 0, rangeY: 3, spd: 2 },
      { t: 'coin', x: 46, y: 0 },
      { t: 'spinner', x: 52, y: 0, len: 3.5, spd: -3 },
      { t: 'spikeball', x: 58, y: 2, range: 3, spd: 3 },
      { t: 'spikeball', x: 62, y: -2, range: 3, spd: -3 },
      { t: 'wall', x: 66, gapY: 1, gapH: 1.6 },
      { t: 'star', x: 64, y: 0 },
      { t: 'pendulum', x: 72, y: 3.5, len: 3.5, spd: 2, swing: 1 },
      { t: 'sawblade', x: 78, y: 0, range: 3, spd: 3 },
      { t: 'saw_trap', x: 84, y: 1, rangeX: 0, rangeY: 2, spd: 2.5 },
      { t: 'coin', x: 88, y: 0 },
      { t: 'hammer', x: 94, y: -2, len: 3, spd: 3, swing: 1.3 },
      { t: 'coin', x: 98, y: 0 },
      { t: 'finish', x: 105 },
    ]
  },
  // ── Level 27: Chaos Engine ──
  {
    name: "Chaos Engine",
    speed: 7.5,
    bgIdx: 5,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'saw_trap_long', x: 10, y: 0, rangeX: 3, rangeY: 0, spd: 2, w: 1.5, spin: 2 },
      { t: 'wall', x: 16, gapY: 2, gapH: 1.6 },
      { t: 'wall', x: 19, gapY: -2, gapH: 1.6 },
      { t: 'star', x: 17, y: 0 },
      { t: 'pendulum', x: 25, y: 3.5, len: 3.5, spd: 2, swing: 1 },
      { t: 'spinner', x: 31, y: 1, len: 2.5, spd: 3.5 },
      { t: 'spinner', x: 35, y: -1, len: 2.5, spd: -3.5 },
      { t: 'coin', x: 33, y: 3.5 },
      { t: 'saw_trap_double', x: 41, y: 1, rangeX: 0, rangeY: 2, spd: 2.5, spin: 1.5 },
      { t: 'hammer', x: 47, y: 2, len: 3, spd: 3 },
      { t: 'hammer', x: 51, y: -2, len: 3, spd: -3 },
      { t: 'spikeroller', x: 57, y: 0, range: 3, spd: 2.5 },
      { t: 'star', x: 55, y: -3.5 },
      { t: 'mover', x: 63, y: 0, range: 3.5, spd: 3, w: 0.6, h: 7 },
      { t: 'pendulum', x: 69, y: 3, len: 3, spd: 2, swing: 1 },
      { t: 'spikewall', x: 75, y: 0, scale: 1, rangeX: 2, rangeY: 0, spd: 2.5 },
      { t: 'wall', x: 81, gapY: 0, gapH: 1.6 },
      { t: 'sawblade', x: 87, y: 0, range: 3, spd: 3 },
      { t: 'coin', x: 91, y: 0 },
      { t: 'saw_trap', x: 96, y: 0, rangeX: 2, rangeY: 0, spd: 3, spin: 2.5 },
      { t: 'coin', x: 100, y: 0 },
      { t: 'finish', x: 108 },
    ]
  },
  // ── Level 28: Iron Maiden ──
  {
    name: "Iron Maiden",
    speed: 7.8,
    bgIdx: 5,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'spikewall', x: 10, y: 1, scale: 1.2, rangeX: 0, rangeY: 2, spd: 2.5 },
      { t: 'spikewall', x: 14, y: -1, scale: 1.2, rangeX: 0, rangeY: 2, spd: -2.5 },
      { t: 'wall', x: 18, gapY: 0, gapH: 1.6 },
      { t: 'star', x: 16, y: 3 },
      { t: 'pendulum', x: 24, y: 3.5, len: 3.5, spd: 2, swing: 1.1 },
      { t: 'saw_trap', x: 30, y: 0, rangeX: 2, rangeY: 2, spd: 2.5 },
      { t: 'spinner', x: 36, y: 0, len: 3, spd: 3.5 },
      { t: 'coin', x: 40, y: 0 },
      { t: 'hammer', x: 46, y: 2, len: 3, spd: 3, swing: 1.3 },
      { t: 'sawblade', x: 52, y: -1, range: 3, spd: 3 },
      { t: 'wall', x: 56, gapY: 1.5, gapH: 1.6 },
      { t: 'wall', x: 60, gapY: -1.5, gapH: 1.6 },
      { t: 'star', x: 58, y: 0 },
      { t: 'pendulum', x: 66, y: 3, len: 3, spd: 2, swing: 1 },
      { t: 'saw_trap_double', x: 72, y: 0, rangeX: 0, rangeY: 2.5, spd: 2.5, spin: 2 },
      { t: 'spikeball', x: 78, y: 1, range: 3, spd: 3 },
      { t: 'spikeball', x: 82, y: -1, range: 3, spd: -3 },
      { t: 'coin', x: 86, y: 0 },
      { t: 'spikewall', x: 92, y: 0, scale: 1.2, rangeX: 2.5, rangeY: 0, spd: 3 },
      { t: 'hammer', x: 98, y: -2, len: 3, spd: 3 },
      { t: 'coin', x: 102, y: 0 },
      { t: 'finish', x: 110 },
    ]
  },
  // ── Level 29: Final Countdown ──
  {
    name: "Final Countdown",
    speed: 8,
    bgIdx: 5,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'spinner', x: 10, y: 0, len: 3.5, spd: 3.5 },
      { t: 'wall', x: 15, gapY: 2, gapH: 1.5 },
      { t: 'wall', x: 18, gapY: -2, gapH: 1.5 },
      { t: 'wall', x: 21, gapY: 0.5, gapH: 1.5 },
      { t: 'star', x: 18, y: 2 },
      { t: 'pendulum', x: 27, y: 3.5, len: 3.5, spd: 2, swing: 1.1 },
      { t: 'saw_trap_long', x: 33, y: 0, rangeX: 2.5, rangeY: 0, spd: 2.5, w: 1.5, spin: 2.5 },
      { t: 'hammer', x: 39, y: 2, len: 3, spd: 3 },
      { t: 'hammer', x: 43, y: -2, len: 3, spd: -3 },
      { t: 'coin', x: 41, y: 0 },
      { t: 'sawblade', x: 49, y: 2, range: 2.5, spd: 3.5 },
      { t: 'sawblade', x: 53, y: -2, range: 2.5, spd: -3.5 },
      { t: 'spikewall', x: 58, y: 0, scale: 1.2, rangeX: 0, rangeY: 3, spd: 2.5 },
      { t: 'star', x: 56, y: 0 },
      { t: 'pendulum', x: 64, y: 3, len: 3, spd: 2, swing: 1 },
      { t: 'mover', x: 70, y: 0, range: 3.5, spd: 3, w: 0.5, h: 8 },
      { t: 'saw_trap_double', x: 76, y: 1, rangeX: 0, rangeY: 2, spd: 3, spin: 2 },
      { t: 'spinner', x: 82, y: 0, len: 3, spd: -3.5 },
      { t: 'spikeball', x: 88, y: 0, range: 3, spd: 3 },
      { t: 'coin', x: 92, y: 0 },
      { t: 'wall', x: 96, gapY: 0, gapH: 1.5 },
      { t: 'pendulum', x: 102, y: 3.5, len: 3.5, spd: 2, swing: 1.1 },
      { t: 'hammer', x: 108, y: 0, len: 3, spd: 3, swing: 1.3 },
      { t: 'coin', x: 112, y: 0 },
      { t: 'finish', x: 120 },
    ]
  },
  // ── Level 30: The Gauntlet ──
  {
    name: "The Gauntlet",
    speed: 8.5,
    bgIdx: 5,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'saw_trap', x: 10, y: 0, rangeX: 2, rangeY: 2, spd: 2, spin: 3 },
      { t: 'pendulum', x: 16, y: 3.5, len: 3.5, spd: 2, swing: 1.2 },
      { t: 'wall', x: 21, gapY: 2, gapH: 1.5 },
      { t: 'wall', x: 24, gapY: -2, gapH: 1.5 },
      { t: 'wall', x: 27, gapY: 0, gapH: 1.5 },
      { t: 'star', x: 24, y: 2 },
      { t: 'hammer', x: 33, y: 2, len: 3, spd: 3, swing: 1.3 },
      { t: 'hammer', x: 37, y: -2, len: 3, spd: -3, swing: 1.3 },
      { t: 'spinner', x: 43, y: 0, len: 3.5, spd: 3.5 },
      { t: 'sawblade', x: 49, y: 2, range: 3, spd: 3.5 },
      { t: 'sawblade', x: 53, y: -2, range: 3, spd: -3.5 },
      { t: 'coin', x: 51, y: 0 },
      { t: 'saw_trap_long', x: 59, y: 0, rangeX: 2.5, rangeY: 0, spd: 2.5, w: 1.5, spin: 2.5 },
      { t: 'pendulum', x: 65, y: 3.5, len: 3, spd: 2, swing: 1.1 },
      { t: 'spikewall', x: 71, y: 0, scale: 1.3, rangeX: 0, rangeY: 3, spd: 3 },
      { t: 'star', x: 69, y: -3.5 },
      { t: 'mover', x: 77, y: 0, range: 3.5, spd: 3.5, w: 0.5, h: 8 },
      { t: 'spikeball', x: 83, y: 1, range: 3, spd: 3 },
      { t: 'spikeball', x: 87, y: -1, range: 3, spd: -3 },
      { t: 'wall', x: 91, gapY: 0, gapH: 1.5 },
      { t: 'saw_trap_double', x: 97, y: 0, rangeX: 2, rangeY: 2, spd: 3, spin: 2 },
      { t: 'pendulum', x: 103, y: 3.5, len: 3.5, spd: 2, swing: 1.2 },
      { t: 'spinner', x: 109, y: 0, len: 3.5, spd: -4 },
      { t: 'hammer', x: 115, y: 2, len: 3, spd: 3.5, swing: 1.3 },
      { t: 'hammer', x: 119, y: -2, len: 3, spd: -3.5, swing: 1.3 },
      { t: 'star', x: 117, y: 0 },
      { t: 'coin', x: 123, y: 0 },
      { t: 'finish', x: 130 },
    ]
  },
];

// ─── Pre-compute level offsets for continuous world ───
const LEVEL_OFFSETS = [];
let runningOffset = 0;
LEVELS.forEach((lvl, i) => {
  LEVEL_OFFSETS.push(runningOffset);
  const finishX = lvl.elements.find(e => e.t === 'finish')?.x || 80;
  runningOffset += finishX + LEVEL_GAP;
});
const TOTAL_WORLD_LENGTH = runningOffset;

// ─── Helper: Create rounded material ───
function mat(color, emissive = 0x000000) {
  return new THREE.MeshPhongMaterial({
    color, emissive, shininess: 60, flatShading: false,
  });
}

// ─── GLTF Asset Loading ───
const gltfLoader = new GLTFLoader();
const assetCache = {};

function loadAsset(name, color = 'neutral') {
  const key = `${color}/${name}`;
  if (assetCache[key]) return Promise.resolve(assetCache[key]);
  const suffix = color === 'neutral' ? '' : `_${color}`;
  const path = `assets/kaykit/${color}/${name}${suffix}.gltf`;
  return new Promise((resolve) => {
    gltfLoader.load(path, (gltf) => {
      assetCache[key] = gltf.scene;
      resolve(gltf.scene);
    }, undefined, () => { resolve(null); });
  });
}

function cloneAsset(cached) {
  if (!cached) return null;
  const clone = cached.clone();
  clone.traverse(c => {
    if (c.isMesh) {
      c.material = c.material.clone();
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return clone;
}

function getAsset(name, color = 'neutral') {
  const key = `${color}/${name}`;
  return cloneAsset(assetCache[key]);
}

// Fit a GLTF model into a target box (width, height, depth) centered at (cx, cy, cz)
function fitAsset(asset, targetW, targetH, targetD, cx, cy, cz) {
  if (!asset) return null;
  const box = new THREE.Box3().setFromObject(asset);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  // Scale uniformly to fill target box
  const sx = targetW / Math.max(size.x, 0.01);
  const sy = targetH / Math.max(size.y, 0.01);
  const sz = targetD / Math.max(size.z, 0.01);
  asset.scale.set(sx, sy, sz);
  // Offset so model center ends up at (cx, cy, cz)
  asset.position.set(
    cx - center.x * sx,
    cy - center.y * sy,
    cz - center.z * sz
  );
  return asset;
}

const GAME_ASSETS = {
  wall: { name: 'barrier_4x1x4', color: 'red' },
  spinner: { name: 'swiper_double', color: 'red' },
  spinner_single: { name: 'swiper', color: 'blue' },
  mover: { name: 'barrier_2x1x2', color: 'blue' },
  coin: { name: 'diamond', color: 'blue' },
  star: { name: 'star', color: 'yellow' },
  finish: { name: 'signage_finish_wide', color: 'neutral' },
  cannon: { name: 'cannon_base', color: 'blue' },
  sawblade: { name: 'sawblade', color: 'neutral' },
  spikeball: { name: 'spikeball', color: 'neutral' },
  spring: { name: 'spring_pad', color: 'blue' },
  hammer: { name: 'hammer_spikes', color: 'red' },
  hoop: { name: 'hoop', color: 'blue' },
  bomb: { name: 'bomb_A', color: 'red' },
  spikeroller: { name: 'spikeroller_horizontal', color: 'neutral' },
  cone: { name: 'cone', color: 'red' },
  chest: { name: 'chest', color: 'blue' },
  heart: { name: 'heart', color: 'red' },
  arch: { name: 'arch', color: 'blue' },
  flag: { name: 'flag_A', color: 'red' },
  crate: { name: 'platform_wood_1x1x1', color: 'neutral' },
  pipe_straight: { name: 'pipe_straight_A', color: 'green' },
  pipe_end: { name: 'pipe_end', color: 'green' },
  pendulum_top: { name: 'chain_link_end_top', color: 'neutral' },
  pendulum_link: { name: 'chain_link', color: 'neutral' },
  pendulum_ball: { name: 'spikeball_hanger', color: 'neutral' },
  spikewall: { name: 'spikeblock_double_horizontal', color: 'blue' },
  arrow_sign: { name: 'signage_arrow_stand', color: 'blue' },
  saw_trap: { name: 'saw_trap', color: 'red' },
  saw_trap_double: { name: 'saw_trap_double', color: 'red' },
  saw_trap_long: { name: 'saw_trap_long', color: 'red' },
};

async function preloadGameAssets() {
  const promises = Object.values(GAME_ASSETS).map(a => loadAsset(a.name, a.color));
  // Preload swiper_double in all colors for spinner color support
  ['red', 'blue', 'green', 'yellow'].forEach(c => {
    promises.push(loadAsset('swiper_double', c));
    promises.push(loadAsset('swiper', c));
    promises.push(loadAsset('saw_trap', c));
    promises.push(loadAsset('saw_trap_double', c));
    promises.push(loadAsset('saw_trap_long', c));
    promises.push(loadAsset('pipe_straight_A', c));
    promises.push(loadAsset('pipe_end', c));
  });
  await Promise.all(promises);
}

// ─── Build the Player (cute blob) ───
function createPlayer() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(PLAYER_RADIUS, 24, 24), mat(PAL.player));
  group.add(body);
  const eyeGeo = new THREE.SphereGeometry(0.1, 12, 12);
  const pupilGeo = new THREE.SphereGeometry(0.055, 10, 10);
  [-1, 1].forEach(side => {
    const eye = new THREE.Mesh(eyeGeo, mat(PAL.eye));
    eye.position.set(side * 0.13, 0.08, PLAYER_RADIUS * 0.85);
    group.add(eye);
    const pupil = new THREE.Mesh(pupilGeo, mat(PAL.pupil));
    pupil.position.set(side * 0.13, 0.06, PLAYER_RADIUS * 0.92);
    group.add(pupil);
  });
  const cheekGeo = new THREE.SphereGeometry(0.06, 10, 10);
  const cheekMat = mat(PAL.playerCheek, 0x330000);
  [-1, 1].forEach(side => {
    const cheek = new THREE.Mesh(cheekGeo, cheekMat);
    cheek.position.set(side * 0.22, -0.05, PLAYER_RADIUS * 0.8);
    group.add(cheek);
  });
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat(PAL.pupil));
  mouth.scale.set(1.5, 0.6, 1);
  mouth.position.set(0, -0.1, PLAYER_RADIUS * 0.88);
  group.add(mouth);
  return group;
}

// ─── Background image cache ───
const bgImageCache = {};
const WORLD_NAMES = ['forest', 'desert', 'night', 'winter', 'volcano', 'space'];

function preloadBackgroundImages() {
  const layers = ['sky', 'far', 'mid', 'near'];
  const promises = [];
  WORLD_NAMES.forEach(worldName => {
    layers.forEach(layer => {
      const key = `${worldName}_${layer}`;
      promises.push(new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const tex = new THREE.Texture(img);
          tex.needsUpdate = true;
          bgImageCache[key] = tex;
          resolve();
        };
        img.onerror = () => { bgImageCache[key] = null; resolve(); };
        img.src = `/assets/backgrounds/${worldName}_${layer}.webp`;
      }));
    });
  });
  return Promise.all(promises);
}

function getBgImage(worldName, layer) {
  const key = `${worldName}_${layer}`;
  return bgImageCache[key] || null;
}

// ─── Procedural canvas background generator ───
function generateProceduralLayer(width, height, bgI, layer, seed) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  const W = width, H = height;

  // Seeded random for consistent results
  let s = seed;
  const rng = () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };

  const themes = {
    // 0: Forest
    0: () => {
      if (layer === 'sky') {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#5BA3D9'); g.addColorStop(0.5, '#87CEEB'); g.addColorStop(1, '#B8E6B8');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // Fluffy clouds
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for (let i = 0; i < 8; i++) {
          const cx = rng() * W, cy = H * 0.15 + rng() * H * 0.3;
          for (let j = 0; j < 5; j++) {
            ctx.beginPath();
            ctx.arc(cx + (rng() - 0.5) * 60, cy + (rng() - 0.5) * 15, 15 + rng() * 20, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (layer === 'far') {
        // Rolling green hills with trees
        ctx.fillStyle = '#4A8B3A';
        drawHills(ctx, W, H, 0.4, 0.6, rng);
        // Distant trees on hills
        ctx.fillStyle = '#3A7A2A';
        for (let i = 0; i < 30; i++) {
          const tx = rng() * W, ty = H * 0.35 + rng() * H * 0.25;
          drawPineTree(ctx, tx, ty, 8 + rng() * 12, '#3A7A2A');
        }
      } else if (layer === 'mid') {
        ctx.fillStyle = '#3D7A28';
        drawHills(ctx, W, H, 0.5, 0.5, rng);
        // Bigger trees
        for (let i = 0; i < 20; i++) {
          const tx = rng() * W, ty = H * 0.45 + rng() * H * 0.2;
          drawPineTree(ctx, tx, ty, 14 + rng() * 18, '#2D6A18');
        }
      } else { // near
        ctx.fillStyle = '#2D5A15';
        drawHills(ctx, W, H, 0.7, 0.35, rng);
        // Large foreground trees
        for (let i = 0; i < 12; i++) {
          const tx = rng() * W, ty = H * 0.6 + rng() * H * 0.15;
          drawRoundTree(ctx, tx, ty, 18 + rng() * 22, '#1D4A08');
        }
        // Grass tufts
        ctx.strokeStyle = '#3A8020';
        ctx.lineWidth = 2;
        for (let i = 0; i < 40; i++) {
          const gx = rng() * W, gy = H * 0.85 + rng() * H * 0.15;
          for (let j = 0; j < 3; j++) {
            ctx.beginPath(); ctx.moveTo(gx + j * 3, gy);
            ctx.quadraticCurveTo(gx + j * 3 + (rng() - 0.5) * 6, gy - 8 - rng() * 6, gx + j * 3 + (rng() - 0.5) * 4, gy - 12 - rng() * 8);
            ctx.stroke();
          }
        }
      }
    },
    // 1: Desert
    1: () => {
      if (layer === 'sky') {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#FF9E40'); g.addColorStop(0.4, '#FFD180'); g.addColorStop(1, '#FFE8B0');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // Hot sun
        ctx.fillStyle = '#FFF5CC';
        ctx.beginPath(); ctx.arc(W * 0.75, H * 0.2, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,245,200,0.3)';
        ctx.beginPath(); ctx.arc(W * 0.75, H * 0.2, 50, 0, Math.PI * 2); ctx.fill();
      } else if (layer === 'far') {
        // Mesa/butte shapes
        ctx.fillStyle = '#C4884A';
        drawMesa(ctx, W, H, 0.4, rng);
      } else if (layer === 'mid') {
        // Sand dunes
        ctx.fillStyle = '#D4984A';
        drawDunes(ctx, W, H, 0.55, rng);
        // Cacti
        for (let i = 0; i < 10; i++) {
          drawCactus(ctx, rng() * W, H * 0.5 + rng() * H * 0.15, 15 + rng() * 20, rng);
        }
      } else {
        ctx.fillStyle = '#B88040';
        drawDunes(ctx, W, H, 0.7, rng);
        // Foreground cacti larger
        for (let i = 0; i < 6; i++) {
          drawCactus(ctx, rng() * W, H * 0.65 + rng() * H * 0.1, 25 + rng() * 30, rng);
        }
        // Sand ripples
        ctx.strokeStyle = 'rgba(160,100,40,0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 15; i++) {
          const ry = H * 0.8 + rng() * H * 0.2;
          ctx.beginPath();
          ctx.moveTo(rng() * W * 0.3, ry);
          ctx.quadraticCurveTo(W * 0.5, ry - 3 + rng() * 6, W * 0.7 + rng() * W * 0.3, ry);
          ctx.stroke();
        }
      }
    },
    // 2: Night
    2: () => {
      if (layer === 'sky') {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0A0A30'); g.addColorStop(0.5, '#1A1A50'); g.addColorStop(1, '#2A2060');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // Stars
        for (let i = 0; i < 120; i++) {
          const sx = rng() * W, sy = rng() * H * 0.8;
          const sr = 0.5 + rng() * 2;
          ctx.fillStyle = `rgba(255,255,${200 + Math.floor(rng() * 55)},${0.3 + rng() * 0.7})`;
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
        }
        // Moon
        ctx.fillStyle = '#EEEEDD';
        ctx.beginPath(); ctx.arc(W * 0.8, H * 0.15, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFF0';
        ctx.beginPath(); ctx.arc(W * 0.8, H * 0.15, 18, 0, Math.PI * 2); ctx.fill();
        // Moon glow
        ctx.fillStyle = 'rgba(200,200,180,0.1)';
        ctx.beginPath(); ctx.arc(W * 0.8, H * 0.15, 45, 0, Math.PI * 2); ctx.fill();
      } else if (layer === 'far') {
        ctx.fillStyle = '#1A1040';
        drawHills(ctx, W, H, 0.35, 0.65, rng);
        // Distant city lights
        for (let i = 0; i < 15; i++) {
          ctx.fillStyle = `rgba(255,${200 + Math.floor(rng() * 55)},100,${0.5 + rng() * 0.5})`;
          ctx.fillRect(rng() * W, H * 0.45 + rng() * H * 0.1, 2, 2 + rng() * 4);
        }
      } else if (layer === 'mid') {
        ctx.fillStyle = '#120A30';
        drawHills(ctx, W, H, 0.5, 0.5, rng);
        // Silhouette trees
        for (let i = 0; i < 15; i++) {
          drawPineTree(ctx, rng() * W, H * 0.45 + rng() * H * 0.15, 12 + rng() * 16, '#0A0520');
        }
      } else {
        ctx.fillStyle = '#0A0520';
        drawHills(ctx, W, H, 0.65, 0.4, rng);
        // Dark tree silhouettes
        for (let i = 0; i < 10; i++) {
          drawPineTree(ctx, rng() * W, H * 0.6 + rng() * H * 0.1, 20 + rng() * 25, '#050210');
        }
        // Fireflies
        for (let i = 0; i < 20; i++) {
          ctx.fillStyle = `rgba(180,255,100,${0.3 + rng() * 0.5})`;
          ctx.beginPath();
          ctx.arc(rng() * W, H * 0.5 + rng() * H * 0.4, 1.5 + rng() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    // 3: Winter
    3: () => {
      if (layer === 'sky') {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#8AAFC4'); g.addColorStop(0.5, '#B0D0E0'); g.addColorStop(1, '#D8E8F0');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // Light snow clouds
        ctx.fillStyle = 'rgba(220,230,240,0.5)';
        for (let i = 0; i < 6; i++) {
          const cx = rng() * W, cy = H * 0.1 + rng() * H * 0.2;
          for (let j = 0; j < 4; j++) {
            ctx.beginPath();
            ctx.arc(cx + (rng() - 0.5) * 50, cy + (rng() - 0.5) * 10, 18 + rng() * 25, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (layer === 'far') {
        // Snowy mountains - jagged peaks
        ctx.fillStyle = '#8098B0';
        drawMountains(ctx, W, H, 0.3, 0.7, rng);
        // Snow caps
        ctx.fillStyle = '#E8F0F8';
        drawMountainCaps(ctx, W, H, 0.3, 0.7, rng);
      } else if (layer === 'mid') {
        ctx.fillStyle = '#607890';
        drawMountains(ctx, W, H, 0.45, 0.55, rng);
        ctx.fillStyle = '#D8E4F0';
        drawMountainCaps(ctx, W, H, 0.45, 0.55, rng);
        // Snowy pines
        for (let i = 0; i < 15; i++) {
          drawSnowPine(ctx, rng() * W, H * 0.45 + rng() * H * 0.15, 14 + rng() * 16, rng);
        }
      } else {
        ctx.fillStyle = '#4A6078';
        drawHills(ctx, W, H, 0.65, 0.4, rng);
        // Snow cover
        ctx.fillStyle = 'rgba(230,240,250,0.6)';
        drawHills(ctx, W, H, 0.67, 0.36, rng);
        // Snow pines foreground
        for (let i = 0; i < 10; i++) {
          drawSnowPine(ctx, rng() * W, H * 0.6 + rng() * H * 0.1, 22 + rng() * 25, rng);
        }
      }
    },
    // 4: Volcano
    4: () => {
      if (layer === 'sky') {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#1A0800'); g.addColorStop(0.3, '#3A1500'); g.addColorStop(0.7, '#5A2000');
        g.addColorStop(1, '#8A3000');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // Smoke/ash clouds
        ctx.fillStyle = 'rgba(60,40,30,0.4)';
        for (let i = 0; i < 10; i++) {
          const cx = rng() * W, cy = H * 0.1 + rng() * H * 0.3;
          for (let j = 0; j < 4; j++) {
            ctx.beginPath();
            ctx.arc(cx + (rng() - 0.5) * 50, cy + (rng() - 0.5) * 15, 20 + rng() * 30, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Embers in sky
        for (let i = 0; i < 30; i++) {
          ctx.fillStyle = `rgba(255,${100 + Math.floor(rng() * 100)},0,${0.3 + rng() * 0.5})`;
          ctx.beginPath();
          ctx.arc(rng() * W, rng() * H, 1 + rng() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (layer === 'far') {
        // Dark volcanic mountains
        ctx.fillStyle = '#2A1208';
        drawMountains(ctx, W, H, 0.3, 0.7, rng);
        // Lava rivers in distance
        ctx.strokeStyle = '#FF4400';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          const sx = rng() * W;
          ctx.moveTo(sx, H * 0.5 + rng() * H * 0.1);
          ctx.quadraticCurveTo(sx + rng() * 30, H * 0.6, sx + (rng() - 0.5) * 20, H * 0.7);
          ctx.stroke();
        }
      } else if (layer === 'mid') {
        ctx.fillStyle = '#1A0A04';
        drawMountains(ctx, W, H, 0.45, 0.6, rng);
        // Lava pools
        for (let i = 0; i < 5; i++) {
          const lx = rng() * W, ly = H * 0.65 + rng() * H * 0.1;
          ctx.fillStyle = '#FF4400';
          ctx.beginPath();
          ctx.ellipse(lx, ly, 8 + rng() * 15, 3 + rng() * 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FF8800';
          ctx.beginPath();
          ctx.ellipse(lx, ly, 4 + rng() * 8, 1.5 + rng() * 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#100600';
        drawHills(ctx, W, H, 0.65, 0.4, rng);
        // Lava glow from below
        const lg = ctx.createLinearGradient(0, H * 0.7, 0, H);
        lg.addColorStop(0, 'rgba(255,68,0,0)');
        lg.addColorStop(0.5, 'rgba(255,68,0,0.15)');
        lg.addColorStop(1, 'rgba(255,100,0,0.3)');
        ctx.fillStyle = lg; ctx.fillRect(0, H * 0.7, W, H * 0.3);
        // Dead trees
        for (let i = 0; i < 8; i++) {
          drawDeadTree(ctx, rng() * W, H * 0.6 + rng() * H * 0.1, 15 + rng() * 20, rng);
        }
      }
    },
    // 5: Space
    5: () => {
      if (layer === 'sky') {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#050515'); g.addColorStop(0.5, '#0A0A2E'); g.addColorStop(1, '#101040');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // Dense star field
        for (let i = 0; i < 200; i++) {
          const sx = rng() * W, sy = rng() * H;
          const sr = 0.3 + rng() * 2;
          const colors = ['255,255,255', '200,220,255', '255,200,200', '200,255,200'];
          ctx.fillStyle = `rgba(${colors[Math.floor(rng() * colors.length)]},${0.2 + rng() * 0.8})`;
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
        }
        // Nebula
        for (let i = 0; i < 3; i++) {
          const nx = rng() * W, ny = rng() * H;
          const nebColors = ['rgba(80,20,120,0.08)', 'rgba(20,60,120,0.08)', 'rgba(120,20,60,0.08)'];
          ctx.fillStyle = nebColors[i % 3];
          ctx.beginPath();
          ctx.ellipse(nx, ny, 60 + rng() * 80, 30 + rng() * 50, rng() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (layer === 'far') {
        // Distant planet
        const px = W * 0.3 + rng() * W * 0.4, py = H * 0.35;
        ctx.fillStyle = '#2A2060';
        ctx.beginPath(); ctx.arc(px, py, 35 + rng() * 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3A3080';
        ctx.beginPath(); ctx.arc(px - 5, py - 5, 30 + rng() * 15, 0, Math.PI * 2); ctx.fill();
        // Planet ring
        ctx.strokeStyle = 'rgba(150,130,200,0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(px, py, 55 + rng() * 20, 10, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (layer === 'mid') {
        // Asteroid field
        for (let i = 0; i < 12; i++) {
          const ax = rng() * W, ay = H * 0.3 + rng() * H * 0.4;
          const ar = 5 + rng() * 15;
          ctx.fillStyle = `rgb(${40 + Math.floor(rng() * 30)},${35 + Math.floor(rng() * 25)},${50 + Math.floor(rng() * 30)})`;
          drawAsteroid(ctx, ax, ay, ar, rng);
        }
      } else {
        // Large foreground asteroids
        for (let i = 0; i < 6; i++) {
          const ax = rng() * W, ay = H * 0.5 + rng() * H * 0.3;
          const ar = 12 + rng() * 25;
          ctx.fillStyle = `rgb(${30 + Math.floor(rng() * 25)},${25 + Math.floor(rng() * 20)},${40 + Math.floor(rng() * 25)})`;
          drawAsteroid(ctx, ax, ay, ar, rng);
        }
        // Space dust
        for (let i = 0; i < 15; i++) {
          ctx.fillStyle = `rgba(100,80,160,${0.1 + rng() * 0.15})`;
          ctx.beginPath();
          ctx.ellipse(rng() * W, H * 0.7 + rng() * H * 0.3, 20 + rng() * 40, 5 + rng() * 10, rng() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  };

  themes[bgI]();
  return new THREE.CanvasTexture(c);
}

// ─── Drawing helpers ───
function drawHills(ctx, W, H, startY, amplitude, rng) {
  ctx.beginPath();
  ctx.moveTo(0, H);
  const segments = 60;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * W;
    const y = H * startY + Math.sin(t * Math.PI * 2 + rng() * 0.5) * H * amplitude * 0.15
      + Math.sin(t * Math.PI * 5 + rng()) * H * amplitude * 0.08
      + Math.sin(t * Math.PI * 0.7) * H * amplitude * 0.2;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

function drawMountains(ctx, W, H, startY, amplitude, rng) {
  ctx.beginPath(); ctx.moveTo(0, H);
  const peaks = 5 + Math.floor(rng() * 4);
  for (let i = 0; i <= peaks * 2; i++) {
    const t = i / (peaks * 2);
    const x = t * W;
    const isPeak = i % 2 === 1;
    const y = isPeak
      ? H * startY - H * amplitude * (0.15 + rng() * 0.2)
      : H * startY + H * amplitude * 0.05 * rng();
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

function drawMountainCaps(ctx, W, H, startY, amplitude, rng) {
  const peaks = 5 + Math.floor(rng() * 4);
  for (let i = 0; i <= peaks * 2; i++) {
    if (i % 2 !== 1) continue;
    const t = i / (peaks * 2);
    const x = t * W;
    const peakY = H * startY - H * amplitude * (0.15 + rng() * 0.2);
    // Small snow triangle on peak
    ctx.beginPath();
    ctx.moveTo(x, peakY);
    ctx.lineTo(x - 10 - rng() * 8, peakY + 10 + rng() * 8);
    ctx.lineTo(x + 10 + rng() * 8, peakY + 10 + rng() * 8);
    ctx.closePath(); ctx.fill();
  }
}

function drawMesa(ctx, W, H, startY, rng) {
  ctx.beginPath(); ctx.moveTo(0, H);
  let x = 0;
  while (x < W) {
    const isFlat = rng() > 0.5;
    const w = 30 + rng() * 60;
    if (isFlat) {
      const y = H * startY + rng() * H * 0.1;
      ctx.lineTo(x, y); ctx.lineTo(x + w, y);
    } else {
      const top = H * startY - H * (0.05 + rng() * 0.2);
      const bot = H * startY + rng() * H * 0.05;
      ctx.lineTo(x, bot); ctx.lineTo(x + 5, top);
      ctx.lineTo(x + w - 5, top); ctx.lineTo(x + w, bot);
    }
    x += w;
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

function drawDunes(ctx, W, H, startY, rng) {
  ctx.beginPath(); ctx.moveTo(0, H);
  const segs = 40;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * W;
    const y = H * startY + Math.sin(t * Math.PI * 3 + rng()) * H * 0.08
      + Math.sin(t * Math.PI * 7 + rng() * 3) * H * 0.03;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

function drawPineTree(ctx, x, y, h, color) {
  ctx.fillStyle = color;
  // Trunk
  ctx.fillRect(x - 1, y, 2, h * 0.3);
  // Triangular layers
  for (let i = 0; i < 3; i++) {
    const ty = y - h * (i * 0.25);
    const tw = h * 0.35 * (1 - i * 0.2);
    ctx.beginPath();
    ctx.moveTo(x, ty - h * 0.3);
    ctx.lineTo(x - tw, ty);
    ctx.lineTo(x + tw, ty);
    ctx.closePath(); ctx.fill();
  }
}

function drawRoundTree(ctx, x, y, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 2, y, 4, h * 0.4);
  ctx.beginPath();
  ctx.arc(x, y - h * 0.1, h * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnowPine(ctx, x, y, h, rng) {
  // Dark trunk
  ctx.fillStyle = '#3A3020';
  ctx.fillRect(x - 1.5, y, 3, h * 0.3);
  // Green layers with snow
  for (let i = 0; i < 3; i++) {
    const ty = y - h * (i * 0.25);
    const tw = h * 0.35 * (1 - i * 0.15);
    ctx.fillStyle = '#2A4A28';
    ctx.beginPath();
    ctx.moveTo(x, ty - h * 0.3); ctx.lineTo(x - tw, ty); ctx.lineTo(x + tw, ty);
    ctx.closePath(); ctx.fill();
    // Snow on top
    ctx.fillStyle = '#E8F0F8';
    ctx.beginPath();
    ctx.moveTo(x, ty - h * 0.3); ctx.lineTo(x - tw * 0.8, ty - h * 0.08); ctx.lineTo(x + tw * 0.8, ty - h * 0.08);
    ctx.closePath(); ctx.fill();
  }
}

function drawCactus(ctx, x, y, h, rng) {
  ctx.fillStyle = '#2D6B30';
  // Main body
  ctx.beginPath();
  ctx.roundRect(x - 4, y - h, 8, h, 4);
  ctx.fill();
  // Arms
  if (rng() > 0.3) {
    const armY = y - h * 0.6;
    const armH = h * 0.3;
    ctx.beginPath();
    ctx.roundRect(x + 4, armY, armH, 6, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + 4 + armH - 3, armY - armH * 0.6, 6, armH * 0.6, 3);
    ctx.fill();
  }
  if (rng() > 0.4) {
    const armY = y - h * 0.4;
    const armH = h * 0.25;
    ctx.beginPath();
    ctx.roundRect(x - 4 - armH, armY, armH, 6, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x - 4 - armH, armY - armH * 0.5, 6, armH * 0.5, 3);
    ctx.fill();
  }
}

function drawDeadTree(ctx, x, y, h, rng) {
  ctx.strokeStyle = '#1A0A00';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rng() - 0.5) * 4, y - h); ctx.stroke();
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const by = y - h * (0.4 + i * 0.2);
    const dir = rng() > 0.5 ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(x, by);
    ctx.lineTo(x + dir * (8 + rng() * 12), by - 5 - rng() * 8);
    ctx.stroke();
  }
}

function drawAsteroid(ctx, x, y, r, rng) {
  ctx.beginPath();
  const pts = 8;
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rr = r * (0.7 + rng() * 0.3);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  // Craters
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(x + (rng() - 0.5) * r, y + (rng() - 0.5) * r, r * 0.15 + rng() * r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Build parallax for a segment ───
function buildParallaxSegment(group, offsetX, segLen, theme, bgI) {
  const worldName = WORLD_NAMES[bgI] || 'forest';
  const layers = ['sky', 'far', 'mid', 'near'];
  const zPositions = [-18, -14, -10, -6];
  const heights = [30, 15, 12, 10];

  layers.forEach((layer, i) => {
    // Try loading an image first
    const imgTex = getBgImage(worldName, layer);

    let material;
    if (imgTex) {
      material = new THREE.MeshBasicMaterial({
        map: imgTex, transparent: layer !== 'sky', depthWrite: false
      });
    } else {
      // Generate procedural canvas texture
      const canvasTex = generateProceduralLayer(512, 256, bgI, layer, offsetX * 0.1 + i * 100);
      material = new THREE.MeshBasicMaterial({
        map: canvasTex, transparent: layer !== 'sky', depthWrite: false
      });
    }

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(segLen + 2, heights[i]),
      material
    );
    plane.position.set(offsetX + segLen / 2, layer === 'sky' ? 2 : Y_MIN + heights[i] * 0.35, zPositions[i]);
    group.add(plane);
  });

  // Atmospheric particles
  const particleCount = 25;
  const particleColors = [0x88CC66, 0xDDCC88, 0x9999DD, 0xFFFFFF, 0xFF6633, 0x8888FF];
  const pColor = particleColors[bgI] || 0xFFFFFF;
  for (let i = 0; i < particleCount; i++) {
    const size = bgI === 3 ? 0.08 : 0.04 + Math.random() * 0.06;
    const pGeo = new THREE.SphereGeometry(size, 4, 4);
    const pMat = new THREE.MeshBasicMaterial({
      color: pColor, transparent: true, opacity: 0.3 + Math.random() * 0.4
    });
    const particle = new THREE.Mesh(pGeo, pMat);
    particle.position.set(
      offsetX + Math.random() * segLen,
      Y_MIN + Math.random() * (Y_MAX - Y_MIN),
      -2 - Math.random() * 4
    );
    particle.userData.particle = {
      baseX: particle.position.x,
      baseY: particle.position.y,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: bgI === 3 ? -0.3 - Math.random() * 0.2 : (Math.random() - 0.5) * 0.2,
      phase: Math.random() * Math.PI * 2,
    };
    group.add(particle);
  }
}

// ─── Build ALL levels as one continuous world ───
function buildWorld(scene, existingGroup) {
  if (existingGroup) scene.remove(existingGroup);
  const group = new THREE.Group();
  const colliders = [];
  const collectibles = [];
  const obstColors = PAL.obstacle;
  const wallColors = PAL.wall;

  // Ground and ceiling spanning entire world
  const worldLen = TOTAL_WORLD_LENGTH + 40;
  const groundGeo = new THREE.BoxGeometry(worldLen, 0.4, 8);

  // Build each level's ground/ceiling/clouds with its own color
  LEVELS.forEach((levelData, lvlIdx) => {
    const offset = LEVEL_OFFSETS[lvlIdx];
    const finishX = levelData.elements.find(e => e.t === 'finish')?.x || 80;
    const segLen = finishX + LEVEL_GAP;
    const bgI = levelData.bgIdx;

    // Ground segment
    const segGround = new THREE.Mesh(
      new THREE.BoxGeometry(segLen, 0.4, 8),
      mat(PAL.ground[bgI], 0x111111)
    );
    segGround.position.set(offset + segLen / 2, Y_MIN - 0.5, 0);
    group.add(segGround);

    // Parallax background layers for this segment
    const theme = PAL.parallax[bgI] || PAL.parallax[0];
    buildParallaxSegment(group, offset, segLen, theme, bgI);

    // Level name sign (floating text marker for debug)
    const signGeo = new THREE.BoxGeometry(4, 0.8, 0.1);
    const signColors = [0x81C784, 0xFFCC80, 0xB39DDB, 0xB0BEC5, 0xFF8A65, 0x7986CB];
    const sign = new THREE.Mesh(signGeo, mat(signColors[bgI] || signColors[0], 0x222222));
    sign.position.set(offset + 2, 3.5, 1);
    group.add(sign);

    // Cannon at level start
    const cannonAsset = getAsset(GAME_ASSETS.cannon.name, GAME_ASSETS.cannon.color);
    if (cannonAsset) {
      cannonAsset.scale.setScalar(0.35);
      cannonAsset.position.set(offset - 1, Y_MIN, 0);
      cannonAsset.rotation.set(0.01, 1.56, 0.01);
      cannonAsset.traverse(child => {
        if (child.name && child.name.includes('barrel')) {
          child.rotation.set(-0.64, 0.01, 0.01);
        }
      });
      group.add(cannonAsset);
    }

    // Build level elements with offset
    levelData.elements.forEach((el, idx) => {
      const ex = el.x + offset; // offset all X positions

      if (el.t === 'wall') {
        const halfGap = el.gapH / 2;
        const topH = Y_MAX - (el.gapY + halfGap);
        const botH = (el.gapY - halfGap) - Y_MIN;
        const wallDepth = 3;
        const wallWidth = el.w || 0.6;
        const wColor = wallColors[idx % wallColors.length];

        if (topH > 0) {
          const asset = getAsset(GAME_ASSETS.wall.name, GAME_ASSETS.wall.color);
          const yC = Y_MAX - topH / 2;
          if (fitAsset(asset, wallWidth, topH, wallDepth, ex, yC, 0)) {
            group.add(asset);
          } else {
            const w = new THREE.Mesh(new THREE.BoxGeometry(wallWidth, topH, wallDepth), mat(wColor));
            w.position.set(ex, yC, 0);
            group.add(w);
          }
          colliders.push({ type: 'box', x: ex, y: yC, hw: wallWidth / 2, hh: topH / 2 });
        }
        if (botH > 0) {
          const asset = getAsset(GAME_ASSETS.wall.name, GAME_ASSETS.wall.color);
          const yC = Y_MIN + botH / 2;
          if (fitAsset(asset, wallWidth, botH, wallDepth, ex, yC, 0)) {
            group.add(asset);
          } else {
            const w = new THREE.Mesh(new THREE.BoxGeometry(wallWidth, botH, wallDepth), mat(wColor));
            w.position.set(ex, yC, 0);
            group.add(w);
          }
          colliders.push({ type: 'box', x: ex, y: yC, hw: wallWidth / 2, hh: botH / 2 });
        }
      }
      else if (el.t === 'spinner') {
        const swiperColor = el.color || 'red';
        const scale = (el.len * 2) / 5.5;

        // Rotating arms pivot
        const pivot = new THREE.Group();
        pivot.position.set(ex, el.y, 0);
        const swiperAsset = getAsset(GAME_ASSETS.spinner.name, swiperColor);
        if (swiperAsset) {
          const center = new THREE.Group();
          swiperAsset.scale.setScalar(scale);
          swiperAsset.position.set(0, -0.75 * scale, 0);
          center.add(swiperAsset);
          // Tilt so post points toward camera, arms stay in XY plane
          center.rotation.x = Math.PI / 2;
          pivot.add(center);
        } else {
          const barGeo = new THREE.CylinderGeometry(0.12, 0.12, el.len * 2, 8);
          barGeo.rotateZ(Math.PI / 2);
          pivot.add(new THREE.Mesh(barGeo, mat(obstColors[idx % obstColors.length])));
          [-1, 1].forEach(side => {
            const t = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), mat(0xff4444));
            t.position.set(side * el.len, 0, 0); pivot.add(t);
          });
        }
        group.add(pivot);
        colliders.push({ mesh: pivot, type: 'spinner', x: ex, y: el.y, len: el.len, spd: el.spd, angle: 0 });
      }
      else if (el.t === 'mover') {
        const asset = getAsset(GAME_ASSETS.mover.name, GAME_ASSETS.mover.color);
        let moverMesh;
        let meshOffsetY = 0;
        if (fitAsset(asset, el.w, el.h, 0.3, ex, el.y, 0)) {
          moverMesh = asset;
          meshOffsetY = moverMesh.position.y - el.y;
        } else {
          moverMesh = new THREE.Mesh(new THREE.BoxGeometry(el.w, el.h, 0.3), mat(obstColors[idx % obstColors.length]));
          moverMesh.position.set(ex, el.y, 0);
        }
        group.add(moverMesh);
        colliders.push({
          mesh: moverMesh, type: 'mover', x: ex, baseY: el.y,
          range: el.range, spd: el.spd, hw: el.w / 2, hh: el.h / 2, time: 0,
          meshOffsetY
        });
      }
      else if (el.t === 'coin') {
        let coinMesh;
        const asset = getAsset(GAME_ASSETS.coin.name, GAME_ASSETS.coin.color);
        if (fitAsset(asset, 0.5, 0.5, 0.5, ex, el.y, 0)) {
          coinMesh = asset;
        } else {
          coinMesh = new THREE.Group();
          coinMesh.add(new THREE.Mesh(new THREE.SphereGeometry(COIN_RADIUS, 12, 12), mat(PAL.coin, 0x332200)));
          coinMesh.position.set(ex, el.y, 0);
        }
        group.add(coinMesh);
        collectibles.push({ mesh: coinMesh, type: 'coin', x: ex, y: el.y, collected: false, levelIdx: lvlIdx });
      }
      else if (el.t === 'star') {
        let starMesh;
        const asset = getAsset(GAME_ASSETS.star.name, GAME_ASSETS.star.color);
        if (fitAsset(asset, 0.7, 0.7, 0.7, ex, el.y, 0)) {
          starMesh = asset;
        } else {
          starMesh = new THREE.Group();
          starMesh.add(new THREE.Mesh(new THREE.SphereGeometry(STAR_RADIUS, 6, 6), mat(PAL.star, 0x442200)));
          starMesh.position.set(ex, el.y, 0);
        }
        group.add(starMesh);
        collectibles.push({ mesh: starMesh, type: 'star', x: ex, y: el.y, collected: false, levelIdx: lvlIdx });
      }
      else if (el.t === 'finish') {
        const isLast = lvlIdx === LEVELS.length - 1;

        if (isLast) {
          const asset = getAsset(GAME_ASSETS.finish.name, GAME_ASSETS.finish.color);
          if (fitAsset(asset, 3, 9, 1, ex, 0, 0)) {
            group.add(asset);
          } else {
            const archLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 10, 8), mat(PAL.finish, 0x004D40));
            archLeft.position.set(ex - 1.2, 0, 0);
            group.add(archLeft);
            const archRight = archLeft.clone();
            archRight.position.set(ex + 1.2, 0, 0);
            group.add(archRight);
            const archTop = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 0.5), mat(PAL.finish, 0x004D40));
            archTop.position.set(ex, 4.5, 0);
            group.add(archTop);
          }
          colliders.push({ type: 'finish', x: ex });
        }
        if (!isLast) {
          const cpAsset = getAsset(GAME_ASSETS.finish.name, GAME_ASSETS.finish.color);
          if (fitAsset(cpAsset, 2, 6, 0.5, ex, 0, 0)) {
            cpAsset.traverse(c => { if (c.isMesh) { c.material.transparent = true; c.material.opacity = 0.5; } });
            group.add(cpAsset);
          } else {
            const cpLeft = new THREE.Mesh(
              new THREE.CylinderGeometry(0.08, 0.08, 10, 6),
              new THREE.MeshPhongMaterial({ color: PAL.finish, transparent: true, opacity: 0.4 })
            );
            cpLeft.position.set(ex - 0.8, 0, 0);
            group.add(cpLeft);
            const cpRight = cpLeft.clone();
            cpRight.position.set(ex + 0.8, 0, 0);
            group.add(cpRight);
          }
        }
      }
      else if (el.t === 'cannon') {
        const ca = getAsset(GAME_ASSETS.cannon.name, GAME_ASSETS.cannon.color);
        if (ca) {
          ca.scale.setScalar(0.35);
          ca.position.set(ex, Y_MIN, 0);
          ca.rotation.set(0.01, 1.56, 0.01);
          ca.traverse(child => {
            if (child.name && child.name.includes('barrel')) child.rotation.set(-0.64, 0.01, 0.01);
          });
          group.add(ca);
        }
      }
      else if (el.t === 'sawblade') {
        const saw = getAsset(GAME_ASSETS.sawblade.name, GAME_ASSETS.sawblade.color);
        let sawMesh;
        if (fitAsset(saw, 1.2, 1.2, 1.2, ex, el.y, 0)) {
          sawMesh = saw;
        } else {
          sawMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16), mat(0x888888));
          sawMesh.position.set(ex, el.y, 0);
        }
        group.add(sawMesh);
        colliders.push({
          mesh: sawMesh, type: 'sawblade', x: ex, baseY: el.y,
          range: el.range || 0, spd: el.spd || 2, time: 0, radius: 0.55
        });
      }
      else if (el.t === 'spikeball') {
        const spike = getAsset(GAME_ASSETS.spikeball.name, GAME_ASSETS.spikeball.color);
        let spikeMesh;
        if (fitAsset(spike, 0.8, 0.8, 0.8, ex, el.y, 0)) {
          spikeMesh = spike;
        } else {
          spikeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), mat(0x555555));
          spikeMesh.position.set(ex, el.y, 0);
        }
        group.add(spikeMesh);
        colliders.push({
          mesh: spikeMesh, type: 'spikeball', x: ex, baseY: el.y,
          range: el.range || 0, spd: el.spd || 1.5, time: 0, radius: 0.35
        });
      }
      else if (el.t === 'pendulum') {
        const sz = el.scale || 1;
        const chainLen = el.len || 3;
        const linkVisual = 0.55 * sz;  // visual size of each link
        const linkSpace = 0.35 * sz;   // spacing between link centers (overlap)
        const ballR = 0.7 * sz;
        // Hook height for positioning pivot at hook bottom
        const hookH = 0.4 * sz;
        // Top mount stays fixed (not in pivot)
        const topMount = getAsset(GAME_ASSETS.pendulum_top.name, GAME_ASSETS.pendulum_top.color);
        if (fitAsset(topMount, 0.25 * sz, hookH, 0.08 * sz, ex, el.y - hookH * 0.5, 0)) {
          topMount.rotation.y = Math.PI / 2;
          group.add(topMount);
        }
        // Pivot at bottom of hook — chain swings from here
        const pivotY = el.y - hookH;
        const pivot = new THREE.Group();
        pivot.position.set(ex, pivotY, 0);
        // Chain links hanging down - shift up so first link hooks onto mount
        const chainUp = 0.15 * sz;
        const numLinks = Math.max(1, Math.round(chainLen / linkSpace));
        for (let i = 0; i < numLinks; i++) {
          const link = getAsset(GAME_ASSETS.pendulum_link.name, GAME_ASSETS.pendulum_link.color);
          if (fitAsset(link, 0.25 * sz, linkVisual, 0.08 * sz, 0, chainUp - (i + 0.5) * linkSpace, 0)) {
            pivot.add(link);
          }
        }
        // Spikeball at bottom
        const ball = getAsset(GAME_ASSETS.pendulum_ball.name, GAME_ASSETS.pendulum_ball.color);
        const chainBottom = chainUp - numLinks * linkSpace;
        const ballSize = ballR * 1.4;
        if (fitAsset(ball, ballSize, ballSize, ballSize, 0, chainBottom - ballSize * 0.3, 0)) {
          pivot.add(ball);
        } else {
          const fb = new THREE.Mesh(new THREE.SphereGeometry(ballR * 0.5, 8, 8), mat(0x555555));
          fb.position.set(0, chainBottom - ballR * 0.5, 0);
          pivot.add(fb);
        }
        group.add(pivot);
        const totalLen = numLinks * linkSpace + ballSize * 0.3;
        colliders.push({
          mesh: pivot, type: 'pendulum', anchorX: ex, anchorY: pivotY,
          totalLen, ballR: ballR * 0.5, spd: el.spd || 1.5, swing: el.swing || 0.8, time: 0
        });
      }
      else if (el.t === 'hammer') {
        const ham = getAsset(GAME_ASSETS.hammer.name, GAME_ASSETS.hammer.color);
        let hamMesh;
        const hamLen = el.len || 2;
        if (fitAsset(ham, 0.8, hamLen, 0.8, ex, el.y, 0)) {
          hamMesh = ham;
        } else {
          hamMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, hamLen, 0.6), mat(0xCC4444));
          hamMesh.position.set(ex, el.y, 0);
        }
        group.add(hamMesh);
        colliders.push({
          mesh: hamMesh, type: 'hammer', x: ex, y: el.y,
          len: hamLen, spd: el.spd || 2, swing: el.swing || 1.2, time: 0
        });
      }
      else if (el.t === 'hoop') {
        const hoop = getAsset(GAME_ASSETS.hoop.name, el.color || GAME_ASSETS.hoop.color);
        if (fitAsset(hoop, 2, 2, 0.5, ex, el.y, 0)) {
          group.add(hoop);
        } else {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.1, 8, 24), mat(0x2196F3));
          ring.position.set(ex, el.y, 0); group.add(ring);
        }
        collectibles.push({ mesh: hoop || group.children[group.children.length-1], type: 'hoop', x: ex, y: el.y, collected: false, levelIdx: lvlIdx, anim: !!el.anim });
      }
      else if (el.t === 'bomb') {
        const bomb = getAsset(GAME_ASSETS.bomb.name, el.color || GAME_ASSETS.bomb.color);
        let bMesh;
        if (fitAsset(bomb, 0.8, 0.8, 0.8, ex, el.y, 0)) { bMesh = bomb; }
        else { bMesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), mat(0x333333)); bMesh.position.set(ex, el.y, 0); }
        group.add(bMesh);
        colliders.push({ mesh: bMesh, type: 'bomb', x: ex, y: el.y, radius: 0.4 });
      }
      else if (el.t === 'spikeroller') {
        const roller = getAsset(GAME_ASSETS.spikeroller.name, GAME_ASSETS.spikeroller.color);
        const wrapper = new THREE.Group();
        wrapper.position.set(ex, el.y, 0);
        let inner;
        if (fitAsset(roller, 2, 0.6, 0.6, 0, 0, 0)) { inner = roller; }
        else { inner = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2, 12), mat(0x666666)); inner.rotation.z = Math.PI/2; }
        wrapper.add(inner);
        // Apply editor rotation on wrapper so animation (on inner) doesn't conflict
        if (el.rotX || el.rotY || el.rotZ) {
          const deg = Math.PI / 180;
          if (el.rotX) wrapper.rotation.x = el.rotX * deg;
          if (el.rotY) wrapper.rotation.y = el.rotY * deg;
          if (el.rotZ) wrapper.rotation.z = el.rotZ * deg;
        }
        group.add(wrapper);
        colliders.push({ mesh: wrapper, inner, type: 'spikeroller', x: ex, y: el.y, hw: 1, hh: 0.3, spd: el.spd || 2, time: 0, range: el.range || 0, baseY: el.y, angle: (el.rotZ || 0) * Math.PI / 180 });
      }
      else if (el.t === 'cone') {
        const c = getAsset(GAME_ASSETS.cone.name, el.color || GAME_ASSETS.cone.color);
        if (fitAsset(c, 0.6, 0.8, 0.6, ex, el.y, 0)) { group.add(c); }
        else { group.add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), mat(0xFF6600)).translateX(ex).translateY(el.y)); }
      }
      else if (el.t === 'chest') {
        const ch = getAsset(GAME_ASSETS.chest.name, el.color || GAME_ASSETS.chest.color);
        if (fitAsset(ch, 0.8, 0.6, 0.6, ex, el.y, 0)) { group.add(ch); }
        else { group.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.6), mat(0x8B4513)).translateX(ex).translateY(el.y)); }
        collectibles.push({ mesh: ch || group.children[group.children.length-1], type: 'chest', x: ex, y: el.y, collected: false, levelIdx: lvlIdx });
      }
      else if (el.t === 'heart') {
        const h = getAsset(GAME_ASSETS.heart.name, GAME_ASSETS.heart.color);
        if (fitAsset(h, 0.6, 0.6, 0.6, ex, el.y, 0)) { group.add(h); }
        else { group.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), mat(0xFF1744)).translateX(ex).translateY(el.y)); }
        collectibles.push({ mesh: h || group.children[group.children.length-1], type: 'heart', x: ex, y: el.y, collected: false, levelIdx: lvlIdx });
      }
      else if (el.t === 'arch') {
        const a = getAsset(GAME_ASSETS.arch.name, el.color || GAME_ASSETS.arch.color);
        if (fitAsset(a, 3, 4, 1, ex, el.y, 0)) { group.add(a); }
      }
      else if (el.t === 'flag') {
        const f = getAsset(GAME_ASSETS.flag.name, el.color || GAME_ASSETS.flag.color);
        if (fitAsset(f, 0.5, 2, 0.5, ex, el.y, 0)) { group.add(f); }
      }
      else if (el.t === 'spikewall') {
        const sz = el.scale || 1;
        const sw = getAsset(GAME_ASSETS.spikewall.name, el.color || GAME_ASSETS.spikewall.color);
        let swMesh;
        if (fitAsset(sw, 2 * sz, 1 * sz, 1 * sz, ex, el.y, 0)) { swMesh = sw; }
        else { swMesh = new THREE.Mesh(new THREE.BoxGeometry(2 * sz, 1 * sz, 1 * sz), mat(0x4444aa)); swMesh.position.set(ex, el.y, 0); }
        group.add(swMesh);
        colliders.push({ mesh: swMesh, type: 'spikewall', x: ex, y: el.y, hw: 1 * sz, hh: 0.5 * sz, rangeX: el.rangeX || 0, rangeY: el.rangeY || 0, spd: el.spd || 1, time: 0, baseX: ex, baseY: el.y, angle: (el.rotZ || 0) * Math.PI / 180 });
      }
      else if (el.t === 'arrow_sign') {
        const sz = el.scale || 1;
        const as = getAsset(GAME_ASSETS.arrow_sign.name, el.color || GAME_ASSETS.arrow_sign.color);
        if (fitAsset(as, 1 * sz, 2 * sz, 0.5 * sz, ex, el.y, 0)) { group.add(as); }
      }
      else if (el.t === 'spinner_single') {
        const swiperColor = el.color || 'blue';
        const scale = (el.len * 2) / 3.12;
        const pivot = new THREE.Group();
        pivot.position.set(ex, el.y, 0);
        const swiperAsset = getAsset(GAME_ASSETS.spinner_single.name, swiperColor);
        if (swiperAsset) {
          const center = new THREE.Group();
          swiperAsset.scale.setScalar(scale);
          swiperAsset.position.set(0, -0.75 * scale, 0);
          center.add(swiperAsset);
          center.rotation.x = Math.PI / 2;
          pivot.add(center);
        } else {
          const barGeo = new THREE.CylinderGeometry(0.12, 0.12, el.len, 8);
          barGeo.rotateZ(Math.PI / 2);
          pivot.add(new THREE.Mesh(barGeo, mat(0x4444ff)));
        }
        group.add(pivot);
        colliders.push({ mesh: pivot, type: 'spinner', x: ex, y: el.y, len: el.len, spd: el.spd, angle: 0 });
      }
      else if (el.t === 'saw_trap') {
        const sz = el.scale || 1;
        const w = el.w || 1;
        const st = getAsset(GAME_ASSETS.saw_trap.name, el.color || GAME_ASSETS.saw_trap.color);
        let stMesh;
        if (fitAsset(st, 1.5 * sz * w, 1.5 * sz, 1.5 * sz, ex, el.y, 0)) { stMesh = st; }
        else { stMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * sz, 0.5 * sz, 0.15, 16), mat(0xCC4444)); stMesh.position.set(ex, el.y, 0); }
        group.add(stMesh);
        colliders.push({ mesh: stMesh, type: 'saw_trap', x: ex, baseX: ex, baseY: el.y, rangeX: el.rangeX || 0, rangeY: el.rangeY || 0, spd: el.spd || 2, spin: el.spin || 0, time: 0, hw: 0.6 * sz * w, hh: 0.6 * sz, angle: (el.rotZ || 0) * Math.PI / 180 });
      }
      else if (el.t === 'saw_trap_double') {
        const sz = el.scale || 1;
        const w = el.w || 1;
        const st = getAsset(GAME_ASSETS.saw_trap_double.name, el.color || GAME_ASSETS.saw_trap_double.color);
        let stMesh;
        if (fitAsset(st, 2 * sz * w, 1.5 * sz, 1.5 * sz, ex, el.y, 0)) { stMesh = st; }
        else { stMesh = new THREE.Mesh(new THREE.BoxGeometry(2 * sz, 0.8 * sz, 0.8 * sz), mat(0xCC4444)); stMesh.position.set(ex, el.y, 0); }
        group.add(stMesh);
        colliders.push({ mesh: stMesh, type: 'saw_trap', x: ex, baseX: ex, baseY: el.y, rangeX: el.rangeX || 0, rangeY: el.rangeY || 0, spd: el.spd || 2, spin: el.spin || 0, time: 0, hw: 1.0 * sz * w, hh: 0.5 * sz, angle: (el.rotZ || 0) * Math.PI / 180 });
      }
      else if (el.t === 'saw_trap_long') {
        const sz = el.scale || 1;
        const w = el.w || 1;
        const st = getAsset(GAME_ASSETS.saw_trap_long.name, el.color || GAME_ASSETS.saw_trap_long.color);
        let stMesh;
        if (fitAsset(st, 3 * sz * w, 1.5 * sz, 1.5 * sz, ex, el.y, 0)) { stMesh = st; }
        else { stMesh = new THREE.Mesh(new THREE.BoxGeometry(3 * sz, 0.8 * sz, 0.8 * sz), mat(0xCC4444)); stMesh.position.set(ex, el.y, 0); }
        group.add(stMesh);
        colliders.push({ mesh: stMesh, type: 'saw_trap', x: ex, baseX: ex, baseY: el.y, rangeX: el.rangeX || 0, rangeY: el.rangeY || 0, spd: el.spd || 2, spin: el.spin || 0, time: 0, hw: 1.5 * sz * w, hh: 0.5 * sz, angle: (el.rotZ || 0) * Math.PI / 180 });
      }
      else if (el.t === 'crate') {
        const sz = el.scale || 1;
        const cr = getAsset(GAME_ASSETS.crate.name, GAME_ASSETS.crate.color);
        if (fitAsset(cr, sz, sz, sz, ex, el.y, 0)) { group.add(cr); }
        else { group.add(new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), mat(0x8B6914))); group.children[group.children.length-1].position.set(ex, el.y, 0); }
        colliders.push({ type: 'box', x: ex, y: el.y, hw: sz / 2, hh: sz / 2 });
      }
      else if (el.t === 'pipe_straight') {
        const sz = el.scale || 1;
        const pipe = getAsset(GAME_ASSETS.pipe_straight.name, el.color || GAME_ASSETS.pipe_straight.color);
        if (fitAsset(pipe, sz, 2 * sz, sz, ex, el.y, 0)) { group.add(pipe); }
        else { group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5 * sz, 0.5 * sz, 2 * sz, 16), mat(0x4CAF50))); group.children[group.children.length-1].position.set(ex, el.y, 0); }
        colliders.push({ type: 'box', x: ex, y: el.y, hw: 0.5 * sz, hh: sz, angle: (el.rotZ || 0) * Math.PI / 180 });
      }
      else if (el.t === 'pipe_end') {
        const sz = el.scale || 1;
        const pipe = getAsset(GAME_ASSETS.pipe_end.name, el.color || GAME_ASSETS.pipe_end.color);
        if (fitAsset(pipe, 1.2 * sz, sz, 1.2 * sz, ex, el.y, 0)) { group.add(pipe); }
        else { group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6 * sz, 0.6 * sz, sz, 16), mat(0x4CAF50))); group.children[group.children.length-1].position.set(ex, el.y, 0); }
        colliders.push({ type: 'box', x: ex, y: el.y, hw: 0.6 * sz, hh: 0.5 * sz, angle: (el.rotZ || 0) * Math.PI / 180 });
      }

      // Apply editor rotation to last added child (skip types that handle their own rotation)
      if ((el.rotX || el.rotY || el.rotZ) && el.t !== 'spinner' && el.t !== 'spinner_single' && el.t !== 'spikeroller') {
        const lastChild = group.children[group.children.length - 1];
        if (lastChild) {
          const deg = Math.PI / 180;
          if (el.rotX) lastChild.rotation.x = el.rotX * deg;
          if (el.rotY) lastChild.rotation.y = el.rotY * deg;
          if (el.rotZ) lastChild.rotation.z = el.rotZ * deg;
        }
      }
    });
  });

  scene.add(group);
  return { group, colliders, collectibles };
}

// ─── Particle System ───
function createParticles() {
  const particles = [];
  return {
    particles,
    emit(scene, x, y, color, count = 8) {
      for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 6, 6);
        const m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
          color, emissive: color, transparent: true, opacity: 1,
        }));
        m.position.set(x, y, 0.5);
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        m.userData = {
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 0.6 + Math.random() * 0.4, maxLife: 0.6 + Math.random() * 0.4,
        };
        scene.add(m);
        particles.push(m);
      }
    },
    update(scene, dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.userData.life -= dt;
        if (p.userData.life <= 0) {
          scene.remove(p); p.geometry.dispose(); p.material.dispose();
          particles.splice(i, 1);
        } else {
          p.position.x += p.userData.vx * dt;
          p.position.y += p.userData.vy * dt;
          p.userData.vy -= 8 * dt;
          p.material.opacity = p.userData.life / p.userData.maxLife;
          const s = 0.5 + (p.userData.life / p.userData.maxLife) * 0.5;
          p.scale.set(s, s, s);
        }
      }
    }
  };
}

// ─── Helper: which level is player in? ───
function getLevelAtX(px) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (px >= LEVEL_OFFSETS[i]) return i;
  }
  return 0;
}

// ═══════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════
// ─── Level Card with mini preview ───
function LevelCard({ level, index, onSelect, font }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Background gradient based on bgIdx (6 world themes)
    const bgColors = [
      ['#C8E6C9', '#81C784'], // Forest
      ['#FFE0B2', '#FFCC80'], // Desert
      ['#1A1A4E', '#0A0A2E'], // Night
      ['#C5E8F7', '#E8F4FD'], // Winter
      ['#3D2010', '#2D1B00'], // Volcano
      ['#151535', '#0A0A2E'], // Space
    ];
    const [c1, c2] = bgColors[level.bgIdx % 6];
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Ground line
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    const groundY = H * 0.55;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();

    // Scale: map level X range to canvas width
    const finishX = level.elements.find(e => e.t === 'finish')?.x || 80;
    const scaleX = (W - 10) / finishX;
    const scaleY = H / 10; // -5 to 5 mapped to canvas height
    const mapX = x => 5 + x * scaleX;
    const mapY = y => H * 0.5 - y * scaleY * 0.8;

    // Draw elements
    level.elements.forEach(el => {
      const ex = mapX(el.x);
      const ey = mapY(el.y || 0);

      switch (el.t) {
        case 'wall': {
          ctx.fillStyle = 'rgba(255,171,145,0.8)';
          // Draw wall with gap
          const gapTop = mapY((el.gapY || 0) + (el.gapH || 3) / 2);
          const gapBot = mapY((el.gapY || 0) - (el.gapH || 3) / 2);
          ctx.fillRect(ex - 2, 0, 4, gapTop);
          ctx.fillRect(ex - 2, gapBot, 4, H - gapBot);
          break;
        }
        case 'coin':
          ctx.fillStyle = '#FFD700';
          ctx.beginPath(); ctx.arc(ex, ey, 2, 0, Math.PI * 2); ctx.fill();
          break;
        case 'star':
          ctx.fillStyle = '#FFB300';
          ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
          break;
        case 'spinner':
        case 'spinner_single':
          ctx.strokeStyle = '#FF8A65';
          ctx.lineWidth = 2;
          const len = (el.len || 2) * scaleX * 0.3;
          ctx.beginPath(); ctx.moveTo(ex - len, ey); ctx.lineTo(ex + len, ey); ctx.stroke();
          ctx.fillStyle = '#FF8A65';
          ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
          break;
        case 'mover':
          ctx.fillStyle = 'rgba(100,100,255,0.6)';
          ctx.fillRect(ex - 3, ey - 8, 6, 16);
          break;
        case 'sawblade':
          ctx.fillStyle = '#888';
          ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#555';
          ctx.beginPath(); ctx.arc(ex, ey, 2, 0, Math.PI * 2); ctx.fill();
          break;
        case 'spikeball':
          ctx.fillStyle = '#666';
          ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
          break;
        case 'hammer':
          ctx.fillStyle = '#CC4444';
          ctx.fillRect(ex - 2, ey - 6, 4, 12);
          break;
        case 'pendulum':
          ctx.strokeStyle = '#666';
          ctx.lineWidth = 1.5;
          const pLen = (el.len || 3) * scaleY * 0.5;
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, ey + pLen); ctx.stroke();
          ctx.fillStyle = '#555';
          ctx.beginPath(); ctx.arc(ex, ey + pLen, 4, 0, Math.PI * 2); ctx.fill();
          break;
        case 'saw_trap': case 'saw_trap_double': case 'saw_trap_long':
          ctx.fillStyle = '#CC4444';
          const sw = el.t === 'saw_trap_long' ? 8 : el.t === 'saw_trap_double' ? 6 : 4;
          ctx.fillRect(ex - sw, ey - 3, sw * 2, 6);
          break;
        case 'spikewall':
          ctx.fillStyle = 'rgba(68,68,170,0.7)';
          ctx.fillRect(ex - 5, ey - 3, 10, 6);
          break;
        case 'spikeroller':
          ctx.fillStyle = '#777';
          ctx.fillRect(ex - 5, ey - 2, 10, 4);
          break;
        case 'crate':
          ctx.fillStyle = '#8B6914';
          ctx.fillRect(ex - 3, ey - 3, 6, 6);
          break;
        case 'pipe_straight':
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(ex - 2, ey - 6, 4, 12);
          break;
        case 'pipe_end':
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(ex - 3, ey - 3, 6, 6);
          break;
        case 'finish':
          ctx.fillStyle = '#69F0AE';
          ctx.fillRect(ex - 2, 0, 4, H);
          break;
      }
    });
  }, [level]);

  const starCount = level.elements.filter(e => e.t === 'star').length;
  const coinCount = level.elements.filter(e => e.t === 'coin').length;

  return (
    <div
      onClick={onSelect}
      style={{
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.15s, background 0.15s',
        border: '2px solid rgba(255,255,255,0.1)',
      }}
      onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
      onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
    >
      <canvas ref={canvasRef} width={250} height={80} style={{ width: '100%', height: '80px', display: 'block' }} />
      <div style={{ padding: '10px 12px', fontFamily: font }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
            {index + 1}. {level.name}
          </span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            spd {level.speed}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', display: 'flex', gap: '10px' }}>
          <span style={{ color: '#FFD700' }}>{coinCount} coins</span>
          <span style={{ color: '#FFB300' }}>{starCount} stars</span>
        </div>
      </div>
    </div>
  );
}

export default function BounceBlob() {
  const containerRef = useRef(null);
  const gameRef = useRef({
    state: 'menu',
    holding: false,
    playerVelY: 0,
    playerX: 0,
    playerY: 0,
    coins: 0,
    stars: 0,
    totalStars: 0,
    currentLevel: 0,
    time: 0,
    deathTimer: 0,
    winTimer: 0,
    deathX: 0,
    deaths: 0,
    worldBuilt: false,
  });
  const [uiState, setUiState] = useState('menu');
  const [coins, setCoins] = useState(0);
  const [stars, setStars] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [progress, setProgress] = useState(0);
  const [deathInfo, setDeathInfo] = useState('');
  const [deathLog, setDeathLog] = useState([]);
  const [levelStars, setLevelStars] = useState(Array(LEVELS.length).fill(0));

  // Count all stars across all levels
  const allStarCount = LEVELS.reduce((sum, lvl) => sum + lvl.elements.filter(e => e.t === 'star').length, 0);

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.state = 'launching';
    g.launchTimer = 0;
    g.currentLevel = 0;
    g.playerX = LEVEL_OFFSETS[0]; // Will be positioned by launch animation
    g.playerY = Y_MIN + 1.8;
    g.playerVelY = 0;
    g.coins = 0;
    g.stars = 0;
    g.time = 0;
    g.deathTimer = 0;
    g.winTimer = 0;
    g.deaths = 0;
    g.worldBuilt = true;
    g.needsWorldBuild = true;
    g.needsCollectibleReset = true;
    setUiState('playing');
    setCoins(0);
    setStars(0);
    setCurrentLevel(0);
    setProgress(0);
    setTotalStars(allStarCount);
    g.totalStars = allStarCount;
  }, [allStarCount]);

  // Restart from beginning of current level
  const restartFromLevel = useCallback((lvlIdx) => {
    const g = gameRef.current;
    g.state = 'launching';
    g.launchTimer = 0;
    g.currentLevel = lvlIdx;
    g.playerX = LEVEL_OFFSETS[lvlIdx];
    g.playerY = Y_MIN + 1.8;
    g.playerVelY = 0;
    g.deathTimer = 0;
    // Reset collectibles for this level (handled in game loop)
    g.needsCollectibleReset = true;
    g.resetFromLevel = lvlIdx;
    setUiState('playing');
    setCurrentLevel(lvlIdx);
  }, []);

  // Start game from a specific level (level select)
  const startFromLevel = useCallback((lvlIdx) => {
    const g = gameRef.current;
    g.state = 'launching';
    g.launchTimer = 0;
    g.currentLevel = lvlIdx;
    g.playerX = LEVEL_OFFSETS[lvlIdx];
    g.playerY = Y_MIN + 1.8;
    g.playerVelY = 0;
    g.coins = 0;
    g.stars = 0;
    g.time = 0;
    g.deathTimer = 0;
    g.winTimer = 0;
    g.deaths = 0;
    g.worldBuilt = true;
    g.needsWorldBuild = true;
    g.needsCollectibleReset = true;
    g.resetFromLevel = lvlIdx;
    setUiState('playing');
    setCoins(0);
    setStars(0);
    setCurrentLevel(lvlIdx);
    setProgress(0);
    setTotalStars(allStarCount);
    g.totalStars = allStarCount;
  }, [allStarCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(0, 3, 14);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(PAL.sky[0]);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xFFE0B2, 0.3);
    fillLight.position.set(-5, -3, 5);
    scene.add(fillLight);

    scene.fog = new THREE.Fog(PAL.sky[0], 20, 50);

    const player = createPlayer();
    scene.add(player);
    const particleSys = createParticles();

    let worldGroup = null;
    let colliders = [];
    let collectibles = [];

    // Preload KayKit assets, then rebuild world with real models
    Promise.all([preloadGameAssets(), preloadBackgroundImages()]).then(() => {
      const g = gameRef.current;
      g.needsWorldBuild = true;
    });

    // ─── Input ───
    const g = gameRef.current;
    const onDown = (e) => {
      e.preventDefault();
      g.holding = true;
      if (g.state === 'dead' && g.deathTimer > 0.3) {
        restartFromLevel(g.currentLevel);
      }
    };
    const onUp = (e) => { e.preventDefault(); g.holding = false; };
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (g.state === 'dead' && g.deathTimer > 0.3) {
          restartFromLevel(g.currentLevel);
        } else {
          g.holding = true;
        }
      }
      if (e.code === 'KeyR' && g.state !== 'menu') {
        restartFromLevel(g.currentLevel);
      }
      if (e.code === 'KeyD') {
        debugMode = !debugMode;
        if (!debugMode) clearDebug();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        g.holding = false;
      }
    };
    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('mouseup', onUp);
    renderer.domElement.addEventListener('touchstart', onDown, { passive: false });
    renderer.domElement.addEventListener('touchend', onUp, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    // ─── Debug hitbox visualization ───
    let debugMode = false;
    const debugGroup = new THREE.Group();
    debugGroup.name = 'debug';
    scene.add(debugGroup);

    function clearDebug() {
      while (debugGroup.children.length) {
        const c = debugGroup.children[0];
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
        debugGroup.remove(c);
      }
    }

    function drawDebugHitboxes(px, py) {
      clearDebug();
      if (!debugMode) return;

      const pr = PLAYER_RADIUS * 0.8;
      const lineMat = (color) => new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.8 });
      const greenMat = lineMat(0x00ff00);
      const yellowMat = lineMat(0xffff00);
      const redMat = lineMat(0xff4444);
      const cyanMat = lineMat(0x00ffff);

      // Player collision circle
      const playerCircle = new THREE.BufferGeometry();
      const pPts = [];
      for (let i = 0; i <= 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        pPts.push(px + Math.cos(a) * pr, py + Math.sin(a) * pr, 0.5);
      }
      playerCircle.setAttribute('position', new THREE.Float32BufferAttribute(pPts, 3));
      debugGroup.add(new THREE.Line(playerCircle, yellowMat));

      for (const c of colliders) {
        if (c.type === 'box' || c.type === 'mover' || c.type === 'spikeroller' || c.type === 'spikewall' || c.type === 'saw_trap') {
          // Box hitbox
          let bx = c.x, by = c.y || 0, hw = c.hw, hh = c.hh, angle = c.angle || 0;
          if (c.type === 'mover') { by = c.mesh.position.y - (c.meshOffsetY || 0); }
          if (c.type === 'spikewall') { bx = c.currentX || c.x; by = c.currentY || c.y; }
          if (c.type === 'saw_trap') { bx = c.currentX || c.x; by = c.currentY || c.y; }
          if (c.type === 'spikeroller') { by = c.baseY + (c.range > 0 ? Math.sin(c.time * c.spd) * c.range : 0); }

          const cos = Math.cos(angle), sin = Math.sin(angle);
          const corners = [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh],[-hw,-hh]];
          const pts = [];
          corners.forEach(([lx, ly]) => {
            pts.push(bx + lx * cos - ly * sin, by + lx * sin + ly * cos, 0.5);
          });
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
          debugGroup.add(new THREE.Line(geo, greenMat));
        }
        else if (c.type === 'spinner') {
          // Spinner arm with collision radius
          const cos = Math.cos(c.angle), sin = Math.sin(c.angle);
          const pts = [];
          for (let i = 0; i <= 8; i++) {
            const t = (i / 8) * 2 - 1;
            const sx = c.x + cos * c.len * t;
            const sy = c.y + sin * c.len * t;
            const r = pr + 0.15;
            for (let j = 0; j <= 12; j++) {
              const a = (j / 12) * Math.PI * 2;
              pts.push(sx + Math.cos(a) * r, sy + Math.sin(a) * r, 0.5);
            }
          }
          // Just draw the line along the arm
          const armPts = [
            c.x + cos * c.len * -1, c.y + sin * c.len * -1, 0.5,
            c.x + cos * c.len * 1, c.y + sin * c.len * 1, 0.5,
          ];
          const armGeo = new THREE.BufferGeometry();
          armGeo.setAttribute('position', new THREE.Float32BufferAttribute(armPts, 3));
          debugGroup.add(new THREE.Line(armGeo, redMat));
          // Draw collision radius at endpoints and center
          [0, 0.5, 1].forEach(t2 => {
            const tt = t2 * 2 - 1;
            const sx = c.x + cos * c.len * tt;
            const sy = c.y + sin * c.len * tt;
            const cPts = [];
            const r = pr + 0.15;
            for (let j = 0; j <= 16; j++) {
              const a = (j / 16) * Math.PI * 2;
              cPts.push(sx + Math.cos(a) * r, sy + Math.sin(a) * r, 0.5);
            }
            const cGeo = new THREE.BufferGeometry();
            cGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPts, 3));
            debugGroup.add(new THREE.Line(cGeo, redMat));
          });
        }
        else if (c.type === 'sawblade' || c.type === 'spikeball' || c.type === 'bomb') {
          // Circle hitbox
          const sy = (c.type === 'bomb') ? c.y : (c.range > 0 ? c.mesh.position.y : c.baseY);
          const r = (c.type === 'bomb') ? c.radius : c.radius;
          const cPts = [];
          for (let j = 0; j <= 24; j++) {
            const a = (j / 24) * Math.PI * 2;
            cPts.push(c.x + Math.cos(a) * r, sy + Math.sin(a) * r, 0.5);
          }
          const cGeo = new THREE.BufferGeometry();
          cGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPts, 3));
          debugGroup.add(new THREE.Line(cGeo, cyanMat));
        }
        else if (c.type === 'pendulum') {
          const bx = c.currentX || c.anchorX;
          const by = c.currentY || (c.anchorY - c.totalLen);
          const r = c.ballR;
          const cPts = [];
          for (let j = 0; j <= 24; j++) {
            const a = (j / 24) * Math.PI * 2;
            cPts.push(bx + Math.cos(a) * r, by + Math.sin(a) * r, 0.5);
          }
          const cGeo = new THREE.BufferGeometry();
          cGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPts, 3));
          debugGroup.add(new THREE.Line(cGeo, cyanMat));
        }
        else if (c.type === 'hammer') {
          const hx = c.currentX || c.x;
          const hy = c.currentY || c.y;
          const r = 0.5;
          const cPts = [];
          for (let j = 0; j <= 24; j++) {
            const a = (j / 24) * Math.PI * 2;
            cPts.push(hx + Math.cos(a) * r, hy + Math.sin(a) * r, 0.5);
          }
          const cGeo = new THREE.BufferGeometry();
          cGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPts, 3));
          debugGroup.add(new THREE.Line(cGeo, cyanMat));
        }
      }
    }

    // ─── Collision helpers ───
    // Circle vs oriented box: transform circle into box's local space
    function circleVsRotatedBox(px, py, bx, by, hw, hh, angle) {
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      const dx = px - bx;
      const dy = py - by;
      // Rotate player position into box's local space
      const lx = Math.abs(dx * cos - dy * sin);
      const ly = Math.abs(dx * sin + dy * cos);
      return lx < hw && ly < hh;
    }

    // Circle vs oriented box with circle radius
    function circleVsRotatedBoxR(px, py, pr, bx, by, hw, hh, angle) {
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      const dx = px - bx;
      const dy = py - by;
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      // Closest point on box to circle center
      const cx = Math.max(-hw, Math.min(hw, lx));
      const cy = Math.max(-hh, Math.min(hh, ly));
      const distX = lx - cx;
      const distY = ly - cy;
      return (distX * distX + distY * distY) < pr * pr;
    }

    function checkCollision(px, py) {
      const pr = PLAYER_RADIUS * 0.8;
      for (const c of colliders) {
        if (c.type === 'box') {
          if (c.angle) {
            if (circleVsRotatedBoxR(px, py, pr, c.x, c.y, c.hw, c.hh, c.angle)) return 'die';
          } else {
            if (px + pr > c.x - c.hw && px - pr < c.x + c.hw &&
                py + pr > c.y - c.hh && py - pr < c.y + c.hh) return 'die';
          }
        }
        else if (c.type === 'spinner') {
          // Arms rotate around Z-axis, sweeping in XY plane (visible in 2.5D)
          const cos = Math.cos(c.angle);
          const sin = Math.sin(c.angle);
          for (let i = 0; i <= 8; i++) {
            const t = (i / 8) * 2 - 1;
            const dx = px - (c.x + cos * c.len * t);
            const dy = py - (c.y + sin * c.len * t);
            if (Math.sqrt(dx * dx + dy * dy) < pr + 0.15) return 'die';
          }
        }
        else if (c.type === 'mover') {
          const cy = c.mesh.position.y - (c.meshOffsetY || 0);
          if (circleVsRotatedBoxR(px, py, pr, c.x, cy, c.hw, c.hh, 0)) return 'die';
        }
        else if (c.type === 'finish') {
          if (px > c.x - 0.5) return 'win';
        }
        else if (c.type === 'sawblade') {
          const sy = c.range > 0 ? c.mesh.position.y : c.baseY;
          const dx = px - c.x;
          const dy = py - sy;
          if (Math.sqrt(dx * dx + dy * dy) < pr + c.radius) return 'die';
        }
        else if (c.type === 'spikeball') {
          const sy = c.range > 0 ? c.mesh.position.y : c.baseY;
          const dx = px - c.x;
          const dy = py - sy;
          if (Math.sqrt(dx * dx + dy * dy) < pr + c.radius) return 'die';
        }
        else if (c.type === 'pendulum') {
          const bx = c.currentX || c.anchorX;
          const by = c.currentY || (c.anchorY - c.totalLen);
          const dx = px - bx;
          const dy = py - by;
          if (Math.sqrt(dx * dx + dy * dy) < pr + c.ballR) return 'die';
        }
        else if (c.type === 'hammer') {
          const hx = c.currentX || c.x;
          const hy = c.currentY || c.y;
          const dx = px - hx;
          const dy = py - hy;
          if (Math.sqrt(dx * dx + dy * dy) < pr + 0.5) return 'die';
        }
        else if (c.type === 'bomb') {
          const dx = px - c.x, dy = py - c.y;
          if (Math.sqrt(dx * dx + dy * dy) < pr + c.radius) return 'die';
        }
        else if (c.type === 'spikeroller') {
          const ry = c.baseY + (c.range > 0 ? Math.sin(c.time * c.spd) * c.range : 0);
          if (circleVsRotatedBoxR(px, py, pr, c.x, ry, c.hw, c.hh, c.angle)) return 'die';
        }
        else if (c.type === 'spikewall') {
          const cx = c.currentX || c.x;
          const cy = c.currentY || c.y;
          if (circleVsRotatedBoxR(px, py, pr, cx, cy, c.hw, c.hh, c.angle)) return 'die';
        }
        else if (c.type === 'saw_trap') {
          const cx = c.currentX || c.x;
          const cy = c.currentY || c.y;
          if (circleVsRotatedBoxR(px, py, pr, cx, cy, c.hw, c.hh, c.angle)) return 'die';
        }
      }
      return null;
    }

    // ─── Game Loop ───
    let lastTime = performance.now();
    let animId;

    function gameLoop(now) {
      animId = requestAnimationFrame(gameLoop);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const g = gameRef.current;

      // Build world if needed
      if (g.needsWorldBuild) {
        g.needsWorldBuild = false;
        const result = buildWorld(scene, worldGroup);
        worldGroup = result.group;
        colliders = result.colliders;
        collectibles = result.collectibles;
      }

      // Reset collectibles from a specific level onward
      if (g.needsCollectibleReset) {
        g.needsCollectibleReset = false;
        const fromLevel = g.resetFromLevel || 0;
        collectibles.forEach(col => {
          if (col.levelIdx >= fromLevel) {
            col.collected = false;
            col.mesh.visible = true;
          }
        });
        // Recount coins/stars from uncollected
        g.coins = 0;
        g.stars = 0;
        collectibles.forEach(col => {
          if (col.collected && col.type === 'coin') g.coins++;
          if (col.collected && col.type === 'star') g.stars++;
        });
        setCoins(g.coins);
        setStars(g.stars);
      }

      // Launch animation — blob shoots out of cannon
      if (g.state === 'launching') {
        g.launchTimer += dt;
        const lvlIdx = g.currentLevel;
        const cannonX = LEVEL_OFFSETS[lvlIdx] - 1;
        const cannonTipX = cannonX + 1;
        const cannonTipY = Y_MIN + 1.8;
        // Emit smoke from cannon barrel at start
        if (g.launchTimer < 0.15) {
          particleSys.emit(scene, cannonTipX, cannonTipY, 0x888888, 4);
          particleSys.emit(scene, cannonTipX, cannonTipY, 0xFFAA44, 3);
        }
        const LAUNCH_DUR = 0.4;
        const t = Math.min(g.launchTimer / LAUNCH_DUR, 1);
        // Ease out cubic — fast start, smooth end
        const ease = 1 - Math.pow(1 - t, 3);
        const startX = cannonTipX;
        const startY = cannonTipY;
        const endX = LEVEL_OFFSETS[lvlIdx] + 2;
        const endY = 0;
        g.playerX = startX + (endX - startX) * ease;
        g.playerY = startY + (endY - startY) * ease;

        player.position.set(g.playerX, g.playerY, 0);
        player.visible = true;
        // Spin during launch
        player.rotation.z = t * Math.PI * 2;
        player.scale.set(0.5 + t * 0.5, 0.5 + t * 0.5, 0.5 + t * 0.5);

        // Camera follows
        camera.position.x += (g.playerX + 3 - camera.position.x) * 6 * dt;
        camera.position.y += (g.playerY * 0.3 + 2.5 - camera.position.y) * 6 * dt;

        if (t >= 1) {
          g.state = 'playing';
          g.playerX = endX;
          g.playerY = endY;
          player.scale.set(1, 1, 1);
          player.rotation.z = 0;
        }

        particleSys.update(scene, dt);
        renderer.render(scene, camera);
        return;
      }

      if (g.state === 'playing') {
        g.time += dt;

        // Determine which level segment we're in
        const lvlIdx = getLevelAtX(g.playerX);
        if (lvlIdx !== g.currentLevel) {
          g.currentLevel = lvlIdx;
          g.deaths = 0;
          setCurrentLevel(lvlIdx);
        }
        const lvl = LEVELS[lvlIdx];

        // Update sky color smoothly based on level
        const targetSky = PAL.sky[lvl.bgIdx];
        renderer.setClearColor(targetSky);
        scene.fog.color.setHex(targetSky);

        // Physics: 45-degree diagonal movement
        g.playerVelY = g.holding ? lvl.speed : -lvl.speed;
        g.playerY += g.playerVelY * dt;
        g.playerX += lvl.speed * dt;

        // Clamp to ceiling/floor (safe boundaries)
        if (g.playerY > Y_MAX) g.playerY = Y_MAX;
        if (g.playerY < Y_MIN) g.playerY = Y_MIN;

        // Boundary death only if somehow way outside (shouldn't happen now)
        if (g.playerY < DEATH_Y_MIN || g.playerY > DEATH_Y_MAX) {
          g.state = 'dead';
          g.deathTimer = 0;
          g.deathX = g.playerX;
          g.deaths++;
          particleSys.emit(scene, g.playerX, g.playerY, PAL.player, 15);
          const localX = Math.round(g.playerX - LEVEL_OFFSETS[lvlIdx]);
          const info = `Lv${lvlIdx + 1} "${lvl.name}" X=${localX} (world:${Math.round(g.playerX)}) death#${g.deaths}`;
          setDeathInfo(info);
          setDeathLog(prev => [...prev.slice(-19), info]);
          setUiState('dead');
        }

        // Update animated obstacles
        colliders.forEach(c => {
          if (c.type === 'spinner') { c.angle += c.spd * dt; c.mesh.rotation.z = c.angle; }
          if (c.type === 'mover') { c.time += dt; c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range + (c.meshOffsetY || 0); }
          if (c.type === 'sawblade') {
            c.time += dt;
            c.mesh.rotation.y += dt * 8; // spin
            if (c.range > 0) c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range;
          }
          if (c.type === 'spikeball') {
            c.time += dt;
            if (c.range > 0) c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range;
          }
          if (c.type === 'pendulum') {
            c.time += dt;
            const angle = Math.sin(c.time * c.spd) * c.swing;
            c.mesh.rotation.z = angle;
            c.currentX = c.anchorX + Math.sin(angle) * c.totalLen;
            c.currentY = c.anchorY - Math.cos(angle) * c.totalLen;
          }
          if (c.type === 'hammer') {
            c.time += dt;
            const cycle = (c.time * c.spd) % (Math.PI * 2);
            const swing = Math.sin(cycle);
            c.mesh.rotation.z = swing * c.swing;
            c.currentX = c.x + Math.sin(c.mesh.rotation.z) * c.len * 0.5;
            c.currentY = c.y - Math.cos(c.mesh.rotation.z) * c.len * 0.5;
          }
          if (c.type === 'spikeroller') {
            c.time += dt;
            if (c.inner) c.inner.rotation.x += dt * 4;
            if (c.range > 0) c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range;
          }
          if (c.type === 'spikewall') {
            c.time += dt;
            const osc = Math.sin(c.time * c.spd);
            if (c.rangeX) c.mesh.position.x = c.baseX + osc * c.rangeX;
            if (c.rangeY) c.mesh.position.y = c.baseY + osc * c.rangeY;
            c.currentX = c.mesh.position.x;
            c.currentY = c.mesh.position.y;
          }
          if (c.type === 'saw_trap') {
            c.time += dt;
            // Spin only sawblade children
            c.mesh.traverse(child => {
              if (child.name && child.name.includes('sawblade')) {
                child.rotation.y += dt * c.spd * 4;
              }
            });
            // Rotate whole trap if spin set
            if (c.spin) {
              c.angle += c.spin * dt;
              c.mesh.rotation.y = c.angle;
            }
            // Move if range set
            const osc = Math.sin(c.time * c.spd);
            if (c.rangeX) c.mesh.position.x = c.baseX + osc * c.rangeX;
            if (c.rangeY) c.mesh.position.y = c.baseY + osc * c.rangeY;
            c.currentX = c.mesh.position.x;
            c.currentY = c.mesh.position.y;
          }
        });

        // Collision
        const result = checkCollision(g.playerX, g.playerY);
        if (result === 'die') {
          g.state = 'dead';
          g.deathTimer = 0;
          g.deathX = g.playerX;
          g.deaths++;
          particleSys.emit(scene, g.playerX, g.playerY, PAL.player, 15);
          const localX = Math.round(g.playerX - LEVEL_OFFSETS[lvlIdx]);
          const info = `Lv${lvlIdx + 1} "${lvl.name}" X=${localX} (world:${Math.round(g.playerX)}) death#${g.deaths}`;
          setDeathInfo(info);
          setDeathLog(prev => [...prev.slice(-19), info]);
          setUiState('dead');
        } else if (result === 'win') {
          // Beat the entire game!
          g.state = 'win';
          g.winTimer = 0;
          particleSys.emit(scene, g.playerX, g.playerY, PAL.finish, 20);
          particleSys.emit(scene, g.playerX, g.playerY, PAL.coin, 15);
          setUiState('win');
        }

        // Collectibles
        collectibles.forEach(col => {
          if (col.collected) return;
          const dx = g.playerX - col.x;
          const dy = g.playerY - col.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pickupDist = (col.type === 'hoop' ? 1.0 : col.type === 'chest' ? 0.8 : col.type === 'coin' ? 0.6 : 0.7);
          if (dist < pickupDist) {
            col.collected = true;
            col.mesh.visible = false;
            if (col.type === 'coin') { g.coins++; setCoins(g.coins); particleSys.emit(scene, col.x, col.y, PAL.coin, 6); }
            else if (col.type === 'hoop') { g.coins += 3; setCoins(g.coins); particleSys.emit(scene, col.x, col.y, 0x2196F3, 10); }
            else if (col.type === 'chest') { g.coins += 5; setCoins(g.coins); particleSys.emit(scene, col.x, col.y, PAL.coin, 15); }
            else if (col.type === 'heart') { g.coins += 2; setCoins(g.coins); particleSys.emit(scene, col.x, col.y, 0xFF1744, 8); }
            else { g.stars++; setStars(g.stars); particleSys.emit(scene, col.x, col.y, PAL.star, 10); }
          }
          if (!col.collected) {
            if (col.type !== 'hoop' || col.anim) {
              col.mesh.rotation.y += dt * 2;
              col.mesh.position.y = col.y + Math.sin(g.time * 3 + col.x) * 0.1;
            }
          }
        });

        // Progress (overall through entire world)
        setProgress(Math.min(1, g.playerX / TOTAL_WORLD_LENGTH));

        // Player visuals
        player.position.set(g.playerX, g.playerY, 0);
        player.visible = true;
        player.rotation.z = g.holding ? Math.PI / 4 : -Math.PI / 4;
        player.scale.set(0.9, 1.1, 1);

        // Camera follow
        camera.position.x += (g.playerX + 3 - camera.position.x) * 4 * dt;
        camera.position.y += (g.playerY * 0.3 + 2.5 - camera.position.y) * 3 * dt;
        camera.lookAt(camera.position.x - 1, 0, 0);
      }
      else if (g.state === 'dead') {
        g.deathTimer += dt;
        player.visible = false;
        colliders.forEach(c => {
          if (c.type === 'spinner') { c.angle += c.spd * dt; c.mesh.rotation.z = c.angle; }
          if (c.type === 'mover') { c.time += dt; c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range + (c.meshOffsetY || 0); }
          if (c.type === 'sawblade') { c.time += dt; c.mesh.rotation.y += dt * 8; if (c.range > 0) c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range; }
          if (c.type === 'spikeball') { c.time += dt; if (c.range > 0) c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range; }
          if (c.type === 'pendulum') { c.time += dt; c.mesh.rotation.z = Math.sin(c.time * c.spd) * c.swing; }
          if (c.type === 'hammer') { c.time += dt; const cycle = (c.time * c.spd) % (Math.PI * 2); c.mesh.rotation.z = Math.sin(cycle) * c.swing; }
          if (c.type === 'spikewall') { c.time += dt; const osc = Math.sin(c.time * c.spd); if (c.rangeX) c.mesh.position.x = c.baseX + osc * c.rangeX; if (c.rangeY) c.mesh.position.y = c.baseY + osc * c.rangeY; c.currentX = c.mesh.position.x; c.currentY = c.mesh.position.y; }
          if (c.type === 'saw_trap') { c.time += dt; c.mesh.traverse(ch => { if (ch.name && ch.name.includes('sawblade')) ch.rotation.y += dt * c.spd * 4; }); if (c.spin) { c.angle += c.spin * dt; c.mesh.rotation.y = c.angle; } const osc = Math.sin(c.time * c.spd); if (c.rangeX) c.mesh.position.x = c.baseX + osc * c.rangeX; if (c.rangeY) c.mesh.position.y = c.baseY + osc * c.rangeY; c.currentX = c.mesh.position.x; c.currentY = c.mesh.position.y; }
        });
        // Manual restart: click, tap, space or R to continue
      }
      else if (g.state === 'win') {
        g.winTimer += dt;
        player.visible = true;
        player.rotation.y += dt * 5;
        player.position.y += Math.sin(g.winTimer * 5) * 0.01;
      }
      else {
        player.position.set(0, Math.sin(performance.now() / 800) * 0.5, 0);
        player.rotation.y += dt * 0.5;
        player.visible = true;
        camera.position.set(0, 3, 14);
        camera.lookAt(0, 0, 0);
      }

      particleSys.update(scene, dt);

      // Animate atmospheric particles
      if (worldGroup) {
        worldGroup.traverse(obj => {
          if (obj.userData.particle) {
            const p = obj.userData.particle;
            p.phase += dt;
            obj.position.x = p.baseX + Math.sin(p.phase * p.speedX * 5) * 1.5;
            obj.position.y = p.baseY + p.speedY * (p.phase % 20);
            obj.material.opacity = 0.3 + 0.3 * Math.sin(p.phase * 2);
          }
        });
      }

      if (g.state === 'playing' || g.state === 'dead') {
        drawDebugHitboxes(g.playerX, g.playerY);
      }
      renderer.render(scene, camera);
    }

    animId = requestAnimationFrame(gameLoop);

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('mousedown', onDown);
      renderer.domElement.removeEventListener('mouseup', onUp);
      renderer.domElement.removeEventListener('touchstart', onDown);
      renderer.domElement.removeEventListener('touchend', onUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [startGame, restartFromLevel]);

  // ─── UI ───
  const font = "'Fredoka', 'Nunito', 'Quicksand', sans-serif";

  const btnStyle = (bg = '#FF6B8A') => ({
    padding: '14px 36px', fontSize: '18px', fontWeight: 700,
    fontFamily: font, border: 'none', borderRadius: '50px',
    background: bg, color: '#fff', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15), inset 0 2px 0 rgba(255,255,255,0.3)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    letterSpacing: '0.5px',
  });

  const overlayBase = {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontFamily: font, pointerEvents: 'auto', zIndex: 10,
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', background: '#87CEEB' }}>
      <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* HUD */}
      {uiState === 'playing' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: font, zIndex: 5, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.3)', fontWeight: 700 }}>
              Lv.{currentLevel + 1} {LEVELS[currentLevel]?.name}
            </span>
            <span style={{ fontSize: '20px', color: '#FFD700', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              {coins}
            </span>
            <span style={{ fontSize: '20px', color: '#FFB300', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              {stars}/{totalStars}
            </span>
          </div>
          <div style={{ flex: 1, maxWidth: '300px', margin: '0 20px', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
            <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, #69F0AE, #00E676)', transition: 'width 0.1s' }} />
          </div>
          <span style={{ fontSize: '14px', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.3)', opacity: 0.7 }}>
            R = restart level
          </span>
        </div>
      )}

      {/* MENU */}
      {uiState === 'menu' && (
        <div style={{ ...overlayBase, background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.3), transparent 70%)' }}>
          <div style={{ fontSize: '64px', fontWeight: 700, color: '#FF6B8A', textShadow: '0 4px 20px rgba(255,107,138,0.4), 0 2px 0 #E55A7B', marginBottom: '8px', letterSpacing: '-1px' }}>
            BounceBlob
          </div>
          <div style={{ fontSize: '18px', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.2)', marginBottom: '40px', fontWeight: 400 }}>
            Hold to rise · Release to fall · Navigate obstacles
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={startGame}
              style={btnStyle('#FF6B8A')}
              onMouseOver={e => { e.target.style.transform = 'scale(1.05)'; }}
              onMouseOut={e => { e.target.style.transform = 'scale(1)'; }}
            >
              Play
            </button>
            <button
              onClick={() => setUiState('levelselect')}
              style={btnStyle('#7E57C2')}
              onMouseOver={e => { e.target.style.transform = 'scale(1.05)'; }}
              onMouseOut={e => { e.target.style.transform = 'scale(1)'; }}
            >
              Select Level
            </button>
          </div>
          <div style={{ marginTop: '20px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            {LEVELS.length} levels · {allStarCount} stars · Continuous run
          </div>
          <div style={{ marginTop: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            Space / Click / Tap to control
          </div>
        </div>
      )}

      {/* DEATH */}
      {uiState === 'dead' && (
        <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: '48px', fontWeight: 700, color: '#FF6B8A', textShadow: '0 3px 10px rgba(0,0,0,0.3)', marginBottom: '8px' }}>
            Oops!
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', marginBottom: '6px', fontFamily: 'monospace', background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: '8px' }}>
            {deathInfo}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
            Click / Space / R to restart from Lv.{currentLevel + 1}
          </div>
        </div>
      )}

      {/* Death log */}
      {deathLog.length > 0 && uiState !== 'menu' && (
        <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 20, fontFamily: 'monospace', fontSize: '11px', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '8px 10px', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto', pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '12px' }}>Death Log</span>
            <button
              onClick={() => { navigator.clipboard.writeText(deathLog.join('\n')); }}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Copy
            </button>
          </div>
          {deathLog.map((entry, i) => (
            <div key={i} style={{ opacity: i === deathLog.length - 1 ? 1 : 0.6 }}>{entry}</div>
          ))}
        </div>
      )}

      {/* WIN (entire game) */}
      {uiState === 'win' && (
        <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: '52px', fontWeight: 700, color: '#69F0AE', textShadow: '0 4px 15px rgba(105,240,174,0.5), 0 2px 0 #4CAF50', marginBottom: '12px' }}>
            You Win!
          </div>
          <div style={{ fontSize: '22px', color: '#FFD700', marginBottom: '6px' }}>
            {coins} coins
          </div>
          <div style={{ fontSize: '22px', color: '#FFB300', marginBottom: '30px' }}>
            {stars}/{totalStars} stars
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={startGame} style={btnStyle('#FFB74D')}
              onMouseOver={e => { e.target.style.transform = 'scale(1.05)'; }}
              onMouseOut={e => { e.target.style.transform = 'scale(1)'; }}>
              Play Again
            </button>
            <button onClick={() => { gameRef.current.state = 'menu'; setUiState('menu'); }} style={btnStyle('#7E57C2')}
              onMouseOver={e => { e.target.style.transform = 'scale(1.05)'; }}
              onMouseOut={e => { e.target.style.transform = 'scale(1)'; }}>
              Menu
            </button>
          </div>
        </div>
      )}
      {/* LEVEL SELECT */}
      {uiState === 'levelselect' && (
        <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.85)', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '900px', padding: '30px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#FF6B8A', textShadow: '0 3px 10px rgba(255,107,138,0.4)' }}>
                Select Level
              </div>
              <button
                onClick={() => setUiState('menu')}
                style={{ ...btnStyle('#555'), padding: '10px 24px', fontSize: '14px' }}
                onMouseOver={e => { e.target.style.transform = 'scale(1.05)'; }}
                onMouseOut={e => { e.target.style.transform = 'scale(1)'; }}
              >
                Back
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              {LEVELS.map((lvl, i) => (
                <LevelCard key={i} level={lvl} index={i} onSelect={() => startFromLevel(i)} font={font} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
