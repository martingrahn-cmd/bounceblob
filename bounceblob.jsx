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
const PAL = {
  sky: [0x87CEEB, 0xFFF9C4, 0xD1C4E9],
  player: 0xFF6B8A,
  playerCheek: 0xFF4081,
  eye: 0xFFFFFF,
  pupil: 0x2C2C2C,
  coin: 0xFFD700,
  coinGlow: 0xFFF176,
  star: 0xFFAB00,
  finish: 0x69F0AE,
  ground: [0x81C784, 0xFFCC80, 0xB39DDB],
  obstacle: [0xFF8A65, 0xF06292, 0x7986CB, 0x4DB6AC],
  wall: [0xFFAB91, 0xCE93D8, 0x80DEEA],
  cloud: 0xFFFFFF,
  bg: [0xC8E6C9, 0xFFE0B2, 0xD1C4E9],
};

// ─── Level Definitions ───
const LEVELS = [
  {
    name: "Sunny Meadow",
    speed: 5,
    bgIdx: 0,
    elements: [
      { t: 'coin', x: 6, y: 0 }, { t: 'coin', x: 7, y: 0.5 }, { t: 'coin', x: 8, y: 1 },
      { t: 'coin', x: 9, y: 0.5 }, { t: 'coin', x: 10, y: 0 },
      { t: 'wall', x: 16, gapY: 0, gapH: 3.5 },
      { t: 'coin', x: 20, y: 1 }, { t: 'coin', x: 21, y: 1.5 }, { t: 'coin', x: 22, y: 1 },
      { t: 'spinner', x: 28, y: 0, len: 2.5, spd: 1.5 },
      { t: 'star', x: 28, y: 3.5 },
      { t: 'wall', x: 35, gapY: 1.5, gapH: 3 },
      { t: 'wall', x: 40, gapY: -1, gapH: 3 },
      { t: 'coin', x: 37, y: 1.5 }, { t: 'coin', x: 38, y: 1.5 },
      { t: 'coin', x: 45, y: -1 }, { t: 'coin', x: 46, y: 0 }, { t: 'coin', x: 47, y: 1 },
      { t: 'coin', x: 48, y: 2 }, { t: 'coin', x: 49, y: 1 }, { t: 'coin', x: 50, y: 0 },
      { t: 'star', x: 47.5, y: 3.2 },
      { t: 'spinner', x: 55, y: 0, len: 3, spd: 2 },
      { t: 'coin', x: 60, y: 0 }, { t: 'coin', x: 61, y: 0 }, { t: 'coin', x: 62, y: 0 },
      { t: 'star', x: 60, y: -2.5 },
      { t: 'wall', x: 68, gapY: 0.5, gapH: 3 },
      { t: 'coin', x: 72, y: 0 }, { t: 'coin', x: 73, y: 0 },
      { t: 'finish', x: 80 },
    ]
  },
  {
    name: "Candy Canyon",
    speed: 5.2,
    bgIdx: 1,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 }, { t: 'coin', x: 7, y: 0 },
      { t: 'wall', x: 12, gapY: 1, gapH: 2.8 },
      { t: 'spinner', x: 18, y: 0, len: 2.5, spd: 2 },
      { t: 'coin', x: 18, y: 3 },
      { t: 'wall', x: 24, gapY: -1.5, gapH: 2.5 },
      { t: 'wall', x: 28, gapY: 1.5, gapH: 2.5 },
      { t: 'star', x: 26, y: 0 },
      { t: 'coin', x: 32, y: -1 }, { t: 'coin', x: 33, y: -0.5 }, { t: 'coin', x: 34, y: 0 },
      { t: 'spinner', x: 38, y: 1, len: 2, spd: -2.5 },
      { t: 'spinner', x: 42, y: -1, len: 2, spd: 2.5 },
      { t: 'star', x: 40, y: 3.8 },
      { t: 'mover', x: 48, y: 0, range: 2.5, spd: 1.5, w: 1.2, h: 5 },
      { t: 'coin', x: 52, y: 2 }, { t: 'coin', x: 53, y: 2 }, { t: 'coin', x: 54, y: 2 },
      { t: 'wall', x: 58, gapY: 0, gapH: 2.2 },
      { t: 'spinner', x: 63, y: 0, len: 3.5, spd: 2 },
      { t: 'coin', x: 67, y: -1 }, { t: 'coin', x: 68, y: 0 }, { t: 'coin', x: 69, y: 1 },
      { t: 'wall', x: 74, gapY: -0.5, gapH: 2.5 },
      { t: 'star', x: 72, y: -3 },
      { t: 'coin', x: 78, y: 0 }, { t: 'coin', x: 79, y: 0 },
      { t: 'finish', x: 85 },
    ]
  },
  {
    name: "Cloud Kingdom",
    speed: 5.5,
    bgIdx: 2,
    elements: [
      { t: 'coin', x: 5, y: 1 }, { t: 'coin', x: 6, y: 1.5 },
      { t: 'spinner', x: 10, y: 0, len: 2.5, spd: 2.5 },
      { t: 'wall', x: 16, gapY: 2, gapH: 2.2 },
      { t: 'wall', x: 19, gapY: -2, gapH: 2.2 },
      { t: 'wall', x: 22, gapY: 0.5, gapH: 2 },
      { t: 'star', x: 19, y: 2 },
      { t: 'spinner', x: 27, y: 1, len: 2.5, spd: -3 },
      { t: 'spinner', x: 30, y: -1, len: 2.5, spd: 3 },
      { t: 'coin', x: 28, y: -2 }, { t: 'coin', x: 29, y: -2 },
      { t: 'mover', x: 35, y: 0, range: 3, spd: 2, w: 0.8, h: 6 },
      { t: 'mover', x: 39, y: 0, range: 3, spd: -2, w: 0.8, h: 6 },
      { t: 'star', x: 37, y: 0 },
      { t: 'coin', x: 43, y: 0 }, { t: 'coin', x: 44, y: 0.5 }, { t: 'coin', x: 45, y: 1 },
      { t: 'spinner', x: 50, y: 0, len: 3, spd: 2 },
      { t: 'wall', x: 55, gapY: -1, gapH: 2 },
      { t: 'spinner', x: 59, y: 1, len: 2, spd: -3 },
      { t: 'wall', x: 63, gapY: 1.5, gapH: 2 },
      { t: 'star', x: 61, y: -3.5 },
      { t: 'coin', x: 67, y: 0 }, { t: 'coin', x: 68, y: 0 }, { t: 'coin', x: 69, y: 0 },
      { t: 'coin', x: 70, y: 0 }, { t: 'coin', x: 71, y: 0 },
      { t: 'wall', x: 76, gapY: 0, gapH: 2.5 },
      { t: 'coin', x: 80, y: 1 }, { t: 'coin', x: 81, y: 0 },
      { t: 'finish', x: 88 },
    ]
  },
  {
    name: "Sawmill Valley",
    speed: 5.5,
    bgIdx: 0,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0.5 }, { t: 'coin', x: 7, y: 1 },
      { t: 'sawblade', x: 14, y: 0, range: 0, spd: 2 },
      { t: 'coin', x: 18, y: 2 }, { t: 'coin', x: 19, y: 2 },
      { t: 'wall', x: 22, gapY: 1, gapH: 2.5 },
      { t: 'sawblade', x: 28, y: 2, range: 3, spd: 1.5 },
      { t: 'star', x: 26, y: -2.5 },
      { t: 'coin', x: 32, y: -1 }, { t: 'coin', x: 33, y: 0 }, { t: 'coin', x: 34, y: 1 },
      { t: 'spinner', x: 38, y: 0, len: 2.5, spd: 2 },
      { t: 'sawblade', x: 44, y: -1, range: 2, spd: 2 },
      { t: 'wall', x: 48, gapY: 1.5, gapH: 2.5 },
      { t: 'coin', x: 52, y: 1.5 }, { t: 'coin', x: 53, y: 1.5 },
      { t: 'star', x: 50, y: 3.5 },
      { t: 'sawblade', x: 58, y: 0, range: 3.5, spd: 1.8 },
      { t: 'wall', x: 62, gapY: -1, gapH: 2.5 },
      { t: 'coin', x: 66, y: -1 }, { t: 'coin', x: 67, y: 0 }, { t: 'coin', x: 68, y: 1 },
      { t: 'mover', x: 72, y: 0, range: 2.5, spd: 2, w: 1, h: 5 },
      { t: 'star', x: 76, y: -3 },
      { t: 'coin', x: 80, y: 0 }, { t: 'coin', x: 81, y: 0 },
      { t: 'finish', x: 88 },
    ]
  },
  {
    name: "Spike Cavern",
    speed: 5.8,
    bgIdx: 1,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'spikeball', x: 12, y: 2, range: 2.5, spd: 1.5 },
      { t: 'wall', x: 16, gapY: -1, gapH: 2.5 },
      { t: 'coin', x: 20, y: -1 }, { t: 'coin', x: 21, y: 0 }, { t: 'coin', x: 22, y: 1 },
      { t: 'sawblade', x: 26, y: 0, range: 2, spd: 2 },
      { t: 'spikeball', x: 30, y: -2, range: 3, spd: 1.8 },
      { t: 'star', x: 28, y: 3.5 },
      { t: 'wall', x: 34, gapY: 1, gapH: 2.2 },
      { t: 'wall', x: 38, gapY: -1.5, gapH: 2.2 },
      { t: 'coin', x: 36, y: 1 }, { t: 'coin', x: 36, y: 0 },
      { t: 'spinner', x: 44, y: 0, len: 3, spd: -2.5 },
      { t: 'spikeball', x: 50, y: 1, range: 2, spd: 2 },
      { t: 'spikeball', x: 54, y: -1, range: 2, spd: -2 },
      { t: 'star', x: 52, y: -3.5 },
      { t: 'coin', x: 58, y: 0 }, { t: 'coin', x: 59, y: 0 }, { t: 'coin', x: 60, y: 0 },
      { t: 'sawblade', x: 64, y: 2, range: 3, spd: 2.2 },
      { t: 'wall', x: 68, gapY: 0, gapH: 2 },
      { t: 'mover', x: 74, y: 0, range: 3, spd: 2, w: 0.8, h: 6 },
      { t: 'star', x: 78, y: 3 },
      { t: 'coin', x: 82, y: 0 }, { t: 'coin', x: 83, y: 0 },
      { t: 'finish', x: 90 },
    ]
  },
  {
    name: "Twisted Tunnels",
    speed: 6,
    bgIdx: 2,
    elements: [
      { t: 'coin', x: 5, y: 1 }, { t: 'coin', x: 6, y: 0 }, { t: 'coin', x: 7, y: -1 },
      { t: 'wall', x: 12, gapY: 2, gapH: 2 },
      { t: 'wall', x: 15, gapY: -2, gapH: 2 },
      { t: 'wall', x: 18, gapY: 1, gapH: 2 },
      { t: 'star', x: 15, y: 2 },
      { t: 'sawblade', x: 24, y: 0, range: 3, spd: 2 },
      { t: 'spinner', x: 30, y: 1, len: 2, spd: 3 },
      { t: 'spinner', x: 34, y: -1, len: 2, spd: -3 },
      { t: 'coin', x: 32, y: 3 }, { t: 'coin', x: 33, y: 3 },
      { t: 'spikeball', x: 40, y: 0, range: 3.5, spd: 1.5 },
      { t: 'mover', x: 44, y: 0, range: 3, spd: 2.5, w: 1, h: 5 },
      { t: 'mover', x: 48, y: 0, range: 3, spd: -2.5, w: 1, h: 5 },
      { t: 'star', x: 46, y: 0 },
      { t: 'coin', x: 52, y: -1 }, { t: 'coin', x: 53, y: 0 }, { t: 'coin', x: 54, y: 1 },
      { t: 'wall', x: 58, gapY: 0, gapH: 2 },
      { t: 'sawblade', x: 62, y: 2, range: 2, spd: 2.5 },
      { t: 'sawblade', x: 66, y: -2, range: 2, spd: -2.5 },
      { t: 'spikeball', x: 72, y: 0, range: 2.5, spd: 2 },
      { t: 'wall', x: 76, gapY: 1, gapH: 2 },
      { t: 'wall', x: 80, gapY: -1.5, gapH: 2 },
      { t: 'star', x: 78, y: -3 },
      { t: 'coin', x: 84, y: 0 }, { t: 'coin', x: 85, y: 0 },
      { t: 'spinner', x: 90, y: 0, len: 3, spd: 2.5 },
      { t: 'coin', x: 94, y: 0 }, { t: 'coin', x: 95, y: 0 },
      { t: 'finish', x: 100 },
    ]
  },
  {
    name: "Hammer Heights",
    speed: 6.2,
    bgIdx: 0,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0.5 },
      { t: 'hammer', x: 12, y: 2, len: 2.5, spd: 2 },
      { t: 'wall', x: 18, gapY: 0, gapH: 2.5 },
      { t: 'coin', x: 22, y: 1 }, { t: 'coin', x: 23, y: 1 },
      { t: 'sawblade', x: 28, y: -1, range: 2.5, spd: 2 },
      { t: 'hammer', x: 34, y: -2, len: 2, spd: 2.5 },
      { t: 'star', x: 31, y: 3.5 },
      { t: 'spinner', x: 40, y: 0, len: 3, spd: -2.5 },
      { t: 'coin', x: 44, y: -1 }, { t: 'coin', x: 45, y: 0 }, { t: 'coin', x: 46, y: 1 },
      { t: 'wall', x: 50, gapY: 1.5, gapH: 2 },
      { t: 'hammer', x: 54, y: 0, len: 3, spd: 1.8 },
      { t: 'spikeball', x: 58, y: 2, range: 3, spd: 2 },
      { t: 'star', x: 56, y: -3.5 },
      { t: 'wall', x: 64, gapY: -1, gapH: 2 },
      { t: 'sawblade', x: 68, y: 0, range: 3, spd: 2.5 },
      { t: 'coin', x: 72, y: 0 }, { t: 'coin', x: 73, y: 0 }, { t: 'coin', x: 74, y: 0 },
      { t: 'mover', x: 78, y: 0, range: 3, spd: 2, w: 0.8, h: 6 },
      { t: 'hammer', x: 84, y: 2, len: 2.5, spd: 2.5 },
      { t: 'star', x: 88, y: 0 },
      { t: 'coin', x: 92, y: 1 }, { t: 'coin', x: 93, y: 0 },
      { t: 'finish', x: 100 },
    ]
  },
  {
    name: "Inferno Forge",
    speed: 6.5,
    bgIdx: 1,
    elements: [
      { t: 'coin', x: 5, y: 0 }, { t: 'coin', x: 6, y: 0 },
      { t: 'sawblade', x: 10, y: 1, range: 2, spd: 2.5 },
      { t: 'sawblade', x: 14, y: -1, range: 2, spd: -2.5 },
      { t: 'wall', x: 18, gapY: 0, gapH: 2 },
      { t: 'star', x: 16, y: 3.5 },
      { t: 'hammer', x: 24, y: 2, len: 2.5, spd: 2.5 },
      { t: 'hammer', x: 28, y: -2, len: 2.5, spd: -2.5 },
      { t: 'coin', x: 26, y: 0 }, { t: 'coin', x: 27, y: 0 },
      { t: 'spinner', x: 34, y: 0, len: 3, spd: 3 },
      { t: 'spikeball', x: 38, y: 2, range: 3, spd: 2 },
      { t: 'spikeball', x: 42, y: -2, range: 3, spd: -2 },
      { t: 'coin', x: 40, y: 0 },
      { t: 'wall', x: 46, gapY: 1, gapH: 1.8 },
      { t: 'wall', x: 50, gapY: -1, gapH: 1.8 },
      { t: 'star', x: 48, y: 0 },
      { t: 'sawblade', x: 56, y: 0, range: 3.5, spd: 2 },
      { t: 'mover', x: 60, y: 0, range: 3, spd: 2.5, w: 0.6, h: 7 },
      { t: 'mover', x: 64, y: 0, range: 3, spd: -2.5, w: 0.6, h: 7 },
      { t: 'coin', x: 62, y: 3 }, { t: 'coin', x: 63, y: 3 },
      { t: 'hammer', x: 70, y: 0, len: 3, spd: 2 },
      { t: 'wall', x: 76, gapY: 0, gapH: 1.8 },
      { t: 'spikeball', x: 80, y: 0, range: 3, spd: 2.5 },
      { t: 'star', x: 84, y: -3.5 },
      { t: 'coin', x: 88, y: 0 }, { t: 'coin', x: 89, y: 0 },
      { t: 'sawblade', x: 94, y: 1, range: 2, spd: 3 },
      { t: 'coin', x: 98, y: 0 },
      { t: 'finish', x: 105 },
    ]
  },
  {
    name: "Storm Citadel",
    speed: 7,
    bgIdx: 2,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'wall', x: 10, gapY: 2, gapH: 1.8 },
      { t: 'wall', x: 13, gapY: -2, gapH: 1.8 },
      { t: 'wall', x: 16, gapY: 0, gapH: 1.8 },
      { t: 'star', x: 13, y: 2.5 },
      { t: 'sawblade', x: 22, y: 0, range: 3, spd: 2.5 },
      { t: 'hammer', x: 26, y: 2, len: 2.5, spd: 3 },
      { t: 'spikeball', x: 30, y: -1, range: 3, spd: 2 },
      { t: 'coin', x: 28, y: -3 }, { t: 'coin', x: 29, y: -3 },
      { t: 'spinner', x: 36, y: 0, len: 3.5, spd: -3 },
      { t: 'spinner', x: 40, y: 1, len: 2, spd: 3.5 },
      { t: 'spinner', x: 44, y: -1, len: 2, spd: -3.5 },
      { t: 'star', x: 42, y: 3.5 },
      { t: 'mover', x: 50, y: 0, range: 3.5, spd: 2.5, w: 0.6, h: 7 },
      { t: 'sawblade', x: 54, y: 2, range: 2, spd: 3 },
      { t: 'sawblade', x: 58, y: -2, range: 2, spd: -3 },
      { t: 'coin', x: 56, y: 0 },
      { t: 'hammer', x: 64, y: 0, len: 3, spd: 2.5 },
      { t: 'wall', x: 70, gapY: -0.5, gapH: 1.8 },
      { t: 'spikeball', x: 74, y: 1, range: 2.5, spd: 2.5 },
      { t: 'spikeball', x: 78, y: -1, range: 2.5, spd: -2.5 },
      { t: 'coin', x: 76, y: 3 }, { t: 'coin', x: 77, y: 3 },
      { t: 'wall', x: 84, gapY: 1, gapH: 1.8 },
      { t: 'sawblade', x: 88, y: 0, range: 3, spd: 3 },
      { t: 'hammer', x: 94, y: 2, len: 2.5, spd: 3 },
      { t: 'star', x: 96, y: -3 },
      { t: 'coin', x: 100, y: 0 }, { t: 'coin', x: 101, y: 0 },
      { t: 'finish', x: 110 },
    ]
  },
  {
    name: "The Gauntlet",
    speed: 7.5,
    bgIdx: 0,
    elements: [
      { t: 'coin', x: 5, y: 0 },
      { t: 'sawblade', x: 10, y: 1, range: 3, spd: 3 },
      { t: 'sawblade', x: 14, y: -1, range: 3, spd: -3 },
      { t: 'wall', x: 18, gapY: 0, gapH: 1.6 },
      { t: 'hammer', x: 22, y: 2, len: 3, spd: 3 },
      { t: 'hammer', x: 26, y: -2, len: 3, spd: -3 },
      { t: 'star', x: 24, y: 0 },
      { t: 'spikeball', x: 32, y: 0, range: 3.5, spd: 2.5 },
      { t: 'spinner', x: 36, y: 1, len: 3, spd: 3.5 },
      { t: 'spinner', x: 40, y: -1, len: 3, spd: -3.5 },
      { t: 'coin', x: 38, y: 3.5 }, { t: 'coin', x: 39, y: 3.5 },
      { t: 'wall', x: 44, gapY: 2, gapH: 1.5 },
      { t: 'wall', x: 47, gapY: -2, gapH: 1.5 },
      { t: 'wall', x: 50, gapY: 0.5, gapH: 1.5 },
      { t: 'sawblade', x: 54, y: 0, range: 3.5, spd: 3 },
      { t: 'mover', x: 60, y: 0, range: 3.5, spd: 3, w: 0.6, h: 7 },
      { t: 'mover', x: 64, y: 0, range: 3.5, spd: -3, w: 0.6, h: 7 },
      { t: 'star', x: 62, y: 0 },
      { t: 'hammer', x: 70, y: 0, len: 3, spd: 3 },
      { t: 'spikeball', x: 74, y: 2, range: 3, spd: 3 },
      { t: 'spikeball', x: 78, y: -2, range: 3, spd: -3 },
      { t: 'coin', x: 76, y: 0 },
      { t: 'wall', x: 82, gapY: 0, gapH: 1.5 },
      { t: 'sawblade', x: 86, y: 2, range: 2.5, spd: 3.5 },
      { t: 'sawblade', x: 90, y: -2, range: 2.5, spd: -3.5 },
      { t: 'spinner', x: 96, y: 0, len: 3.5, spd: 3.5 },
      { t: 'hammer', x: 102, y: 2, len: 3, spd: 3 },
      { t: 'hammer', x: 106, y: -2, len: 3, spd: -3 },
      { t: 'star', x: 104, y: 0 },
      { t: 'coin', x: 110, y: 0 }, { t: 'coin', x: 111, y: 0 },
      { t: 'finish', x: 120 },
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

    // Ceiling segment
    const segCeil = new THREE.Mesh(
      new THREE.BoxGeometry(segLen, 0.4, 8),
      mat(PAL.ground[bgI], 0x111111)
    );
    segCeil.position.set(offset + segLen / 2, Y_MAX + 0.5, 0);
    group.add(segCeil);

    // Clouds for this segment
    for (let i = 0; i < 15; i++) {
      const cloudGeo = new THREE.SphereGeometry(0.6 + Math.random() * 0.8, 12, 12);
      const cloudMat = new THREE.MeshPhongMaterial({
        color: PAL.cloud, transparent: true, opacity: 0.3 + Math.random() * 0.3,
      });
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(
        offset + Math.random() * segLen,
        (Math.random() - 0.5) * 8,
        -3 - Math.random() * 5
      );
      cloud.scale.set(1.5 + Math.random(), 0.6, 1);
      group.add(cloud);
    }

    // Level name sign (floating text marker for debug)
    const signGeo = new THREE.BoxGeometry(4, 0.8, 0.1);
    const signColors = [0x81C784, 0xFFCC80, 0xB39DDB];
    const sign = new THREE.Mesh(signGeo, mat(signColors[bgI], 0x222222));
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
        const wallWidth = 0.6;
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
        if (fitAsset(asset, el.w, el.h, 3, ex, el.y, 0)) {
          moverMesh = asset;
        } else {
          moverMesh = new THREE.Mesh(new THREE.BoxGeometry(el.w, el.h, 3), mat(obstColors[idx % obstColors.length]));
          moverMesh.position.set(ex, el.y, 0);
        }
        group.add(moverMesh);
        colliders.push({
          mesh: moverMesh, type: 'mover', x: ex, baseY: el.y,
          range: el.range, spd: el.spd, hw: el.w / 2, hh: el.h / 2, time: 0
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
          len: hamLen, spd: el.spd || 2, time: 0
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
        colliders.push({ mesh: wrapper, inner, type: 'spikeroller', x: ex, y: el.y, hw: 1, hh: 0.3, spd: el.spd || 2, time: 0, range: el.range || 0, baseY: el.y });
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
        colliders.push({ mesh: swMesh, type: 'spikewall', x: ex, y: el.y, hw: 1 * sz, hh: 0.5 * sz, rangeX: el.rangeX || 0, rangeY: el.rangeY || 0, spd: el.spd || 1, time: 0, baseX: ex, baseY: el.y });
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
        const st = getAsset(GAME_ASSETS.saw_trap.name, el.color || GAME_ASSETS.saw_trap.color);
        let stMesh;
        if (fitAsset(st, 1.5 * sz, 1.5 * sz, 1.5 * sz, ex, el.y, 0)) { stMesh = st; }
        else { stMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * sz, 0.5 * sz, 0.15, 16), mat(0xCC4444)); stMesh.position.set(ex, el.y, 0); }
        group.add(stMesh);
        colliders.push({ mesh: stMesh, type: 'saw_trap', x: ex, baseX: ex, baseY: el.y, rangeX: el.rangeX || 0, rangeY: el.rangeY || 0, spd: el.spd || 2, time: 0, radius: 0.5 * sz });
      }
      else if (el.t === 'saw_trap_double') {
        const sz = el.scale || 1;
        const st = getAsset(GAME_ASSETS.saw_trap_double.name, el.color || GAME_ASSETS.saw_trap_double.color);
        let stMesh;
        if (fitAsset(st, 2 * sz, 1.5 * sz, 1.5 * sz, ex, el.y, 0)) { stMesh = st; }
        else { stMesh = new THREE.Mesh(new THREE.BoxGeometry(2 * sz, 0.8 * sz, 0.8 * sz), mat(0xCC4444)); stMesh.position.set(ex, el.y, 0); }
        group.add(stMesh);
        colliders.push({ mesh: stMesh, type: 'saw_trap', x: ex, baseX: ex, baseY: el.y, rangeX: el.rangeX || 0, rangeY: el.rangeY || 0, spd: el.spd || 2, time: 0, radius: 0.7 * sz });
      }
      else if (el.t === 'saw_trap_long') {
        const sz = el.scale || 1;
        const st = getAsset(GAME_ASSETS.saw_trap_long.name, el.color || GAME_ASSETS.saw_trap_long.color);
        let stMesh;
        if (fitAsset(st, 3 * sz, 1.5 * sz, 1.5 * sz, ex, el.y, 0)) { stMesh = st; }
        else { stMesh = new THREE.Mesh(new THREE.BoxGeometry(3 * sz, 0.8 * sz, 0.8 * sz), mat(0xCC4444)); stMesh.position.set(ex, el.y, 0); }
        group.add(stMesh);
        colliders.push({ mesh: stMesh, type: 'saw_trap', x: ex, baseX: ex, baseY: el.y, rangeX: el.rangeX || 0, rangeY: el.rangeY || 0, spd: el.spd || 2, time: 0, radius: 1 * sz });
      }
      else if (el.t === 'crate') {
        const sz = el.scale || 1;
        const cr = getAsset(GAME_ASSETS.crate.name, GAME_ASSETS.crate.color);
        if (fitAsset(cr, sz, sz, sz, ex, el.y, 0)) { group.add(cr); }
        else { group.add(new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), mat(0x8B6914))); group.children[group.children.length-1].position.set(ex, el.y, 0); }
        colliders.push({ type: 'box', x: ex, y: el.y, hw: sz / 2, hh: sz / 2 });
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
  const [levelStars, setLevelStars] = useState(Array(10).fill(0));

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
    g.playerX = LEVEL_OFFSETS[lvlIdx];
    g.playerY = Y_MIN + 1.8;
    g.playerVelY = 0;
    g.deathTimer = 0;
    // Reset collectibles for this level (handled in game loop)
    g.needsCollectibleReset = true;
    g.resetFromLevel = lvlIdx;
    setUiState('playing');
  }, []);

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
    preloadGameAssets().then(() => {
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

    // ─── Collision ───
    function checkCollision(px, py) {
      const pr = PLAYER_RADIUS * 0.8;
      for (const c of colliders) {
        if (c.type === 'box') {
          if (px + pr > c.x - c.hw && px - pr < c.x + c.hw &&
              py + pr > c.y - c.hh && py - pr < c.y + c.hh) return 'die';
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
          const cy = c.mesh.position.y;
          if (px + pr > c.x - c.hw && px - pr < c.x + c.hw &&
              py + pr > cy - c.hh && py - pr < cy + c.hh) return 'die';
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
          if (Math.abs(px - c.x) < pr + c.hw && Math.abs(py - ry) < pr + c.hh) return 'die';
        }
        else if (c.type === 'spikewall') {
          const cx = c.currentX || c.x;
          const cy = c.currentY || c.y;
          if (Math.abs(px - cx) < pr + c.hw && Math.abs(py - cy) < pr + c.hh) return 'die';
        }
        else if (c.type === 'saw_trap') {
          const cx = c.currentX || c.x;
          const cy = c.currentY || c.y;
          const dx = px - cx, dy = py - cy;
          if (Math.sqrt(dx * dx + dy * dy) < pr + c.radius) return 'die';
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
          if (c.type === 'mover') { c.time += dt; c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range; }
          if (c.type === 'sawblade') {
            c.time += dt;
            c.mesh.rotation.y += dt * 8; // spin
            if (c.range > 0) c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range;
          }
          if (c.type === 'spikeball') {
            c.time += dt;
            if (c.range > 0) c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range;
          }
          if (c.type === 'hammer') {
            c.time += dt;
            const cycle = (c.time * c.spd) % (Math.PI * 2);
            const swing = Math.sin(cycle);
            c.mesh.rotation.z = swing * 1.2;
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
          if (c.type === 'mover') { c.time += dt; c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range; }
          if (c.type === 'sawblade') { c.time += dt; c.mesh.rotation.y += dt * 8; if (c.range > 0) c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range; }
          if (c.type === 'spikeball') { c.time += dt; if (c.range > 0) c.mesh.position.y = c.baseY + Math.sin(c.time * c.spd) * c.range; }
          if (c.type === 'hammer') { c.time += dt; const cycle = (c.time * c.spd) % (Math.PI * 2); c.mesh.rotation.z = Math.sin(cycle) * 1.2; }
          if (c.type === 'spikewall') { c.time += dt; const osc = Math.sin(c.time * c.spd); if (c.rangeX) c.mesh.position.x = c.baseX + osc * c.rangeX; if (c.rangeY) c.mesh.position.y = c.baseY + osc * c.rangeY; c.currentX = c.mesh.position.x; c.currentY = c.mesh.position.y; }
          if (c.type === 'saw_trap') { c.time += dt; c.mesh.traverse(ch => { if (ch.name && ch.name.includes('sawblade')) ch.rotation.y += dt * c.spd * 4; }); const osc = Math.sin(c.time * c.spd); if (c.rangeX) c.mesh.position.x = c.baseX + osc * c.rangeX; if (c.rangeY) c.mesh.position.y = c.baseY + osc * c.rangeY; c.currentX = c.mesh.position.x; c.currentY = c.mesh.position.y; }
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
          <button
            onClick={startGame}
            style={btnStyle('#FF6B8A')}
            onMouseOver={e => { e.target.style.transform = 'scale(1.05)'; }}
            onMouseOut={e => { e.target.style.transform = 'scale(1)'; }}
          >
            Play
          </button>
          <div style={{ marginTop: '20px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            10 levels · {allStarCount} stars · Continuous run
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
    </div>
  );
}
