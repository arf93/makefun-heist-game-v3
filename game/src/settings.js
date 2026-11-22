// settings.js — every tunable number for The Gilded Vault, in one place.
// No DOM, no imports: pure constants so the logic tests can load this file
// in plain Node without a browser.

// --- room ---
export const ROOM_W = 1280;
export const ROOM_H = 720;
export const WALL = 24; // thickness of the outer walls

// --- thief ---
export const THIEF_R = 13;
export const THIEF_SPEED = 215; // px per second
export const ENTER = { x: 80, y: 660 }; // IN door (bottom-left)
export const LEAVE = { x: 1200, y: 660 }; // EXIT door (bottom-right)
export const LEAVE_R = 42; // how close to the EXIT counts as escaping

// --- loot ---
export const GEM = { x: 640, y: 95 }; // the Sunstone, top-centre
export const GEM_R = 30; // pickup radius

// --- alarm ---
export const ALARM_RISE = 30; // per second while any watcher sees the thief
export const ALARM_FALL = 20; // per second while hidden
export const ALARM_MAX = 100;
export const CAUGHT_FREEZE = 1.4; // seconds the SPOTTED screen holds

// --- tools ---
export const SMOKES = 2;
export const SMOKE_R = 150;
export const SMOKE_T = 4; // seconds a smoke cloud lasts
export const DECOYS = 1;
export const DECOY_THROW_R = 280; // how far a click may land from the thief
export const DECOY_LURE_T = 4; // seconds a guard investigates a decoy

// --- watchers ---
export const GUARD_R = 13;
export const GUARD_SPEED = 78; // patrol walk speed, px per second
export const GUARD_LURE_SPEED = 130; // speed while walking to a decoy
export const GUARD_CONE_R = 230; // vision range
export const GUARD_CONE_HALF = 0.56; // half-angle in radians (~32 deg)
export const GUARD_SWEEP = 0.96; // how far a paused guard sweeps, radians (~55 deg)
export const GUARD_PAUSE = 2.0; // seconds a guard waits at each waypoint
export const CAM_CONE_R = 260;
export const CAM_CONE_HALF = 0.49; // half-angle in radians (~28 deg)
export const CAM_SWEEP = 0.96; // camera sweep amplitude, radians
export const CAM_PERIOD = 5.2; // seconds for one full camera sweep

// --- scoring ---
export const SCORE_BASE = 1500;
export const SCORE_PER_SEC = 8;
export const SCORE_PER_SPOT = 150;
export const SCORE_GHOST = 400; // bonus for zero detections

// --- loop ---
export const STEP = 1 / 60; // fixed simulation step

// --- screenshot labels ---
// Map labels (IN, EXIT, THE SUNSTONE, guard names) are only drawn when the
// room is shown near full size; below this scale they clip and smear, so the
// painter hides them. The cover screenshot is taken at full size, so its
// labels stay visible.
export const LABEL_MIN_SCALE = 0.8;
