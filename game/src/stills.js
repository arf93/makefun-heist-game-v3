// stills.js — deterministic staging for the `?shot=` screenshots.
// Each shot name sets the game to a fixed, readable moment so the four
// screenshots are reproducible: cover (the whole room at its best), play
// (mid-heist, smoke out), caught (the SPOTTED freeze), win (the getaway).
// The seed only jitters the camera phase, so repeated renders agree.

import { ENTER } from './settings.js';

// Apply a shot to the game object `g` (the same shape boot.js builds).
// Returns true when the name is a known shot.
export function stageShot(g, name, seed) {
  const jitter = (seed % 7) * 0.13;
  for (const cam of g.cameras) cam.t = jitter + 1.1;
  if (name === 'cover') {
    g.state = 'play';
    g.thief.x = 470;
    g.thief.y = 430;
    g.guards[0].x = 620; g.guards[0].y = 290; g.guards[0].facing = -0.5;
    g.guards[1].x = 700; g.guards[1].y = 480; g.guards[1].facing = 2.6;
    g.guards[2].x = 760; g.guards[2].y = 320; g.guards[2].facing = -1.2;
    g.alarm = 38;
    g.time = 42;
    g.score = 1500 - 8 * 42;
    g.seenNow = false;
    return true;
  }
  if (name === 'play') {
    g.state = 'play';
    g.thief.x = 545;
    g.thief.y = 380;
    g.guards[0].x = 700; g.guards[0].y = 290; g.guards[0].facing = 0.4;
    g.guards[1].x = 520; g.guards[1].y = 480; g.guards[1].facing = -2.4;
    g.guards[2].x = 760; g.guards[2].y = 260; g.guards[2].facing = 1.4;
    g.smokes = [{ x: 545, y: 380, t: 2.6 }];
    g.alarm = 55;
    g.time = 68;
    g.score = 1500 - 8 * 68;
    g.seenNow = false;
    return true;
  }
  if (name === 'caught') {
    g.state = 'caught';
    g.caughtT = 10; // hold the freeze long past the screenshot (the loop
    // would otherwise reset to the door on the first step: caughtT starts 0)
    g.thief.x = 640;
    g.thief.y = 300;
    g.guards[0].x = 700; g.guards[0].y = 290; g.guards[0].facing = 0.1;
    g.guards[1].x = 620; g.guards[1].y = 480; g.guards[1].facing = -1.8;
    g.guards[2].x = 760; g.guards[2].y = 380; g.guards[2].facing = -1.5;
    g.alarm = 100;
    g.time = 95;
    g.score = 1500 - 8 * 95 - 150;
    g.detections = 1;
    g.seenNow = true;
    return true;
  }
  if (name === 'win') {
    g.state = 'win';
    g.thief.x = 1180;
    g.thief.y = 640;
    g.hasGem = true;
    g.alarm = 0;
    g.time = 132;
    g.detections = 0;
    g.score = 1500 - 8 * 132 + 400;
    g.seenNow = false;
    return true;
  }
  return false;
}

// Where the thief starts a fresh run.
export function freshThief() {
  return { x: ENTER.x, y: ENTER.y };
}
