// boot.js — the heist itself: boots the canvas, runs the fixed-step loop,
// owns the state machine (title / play / paused / caught / win), the alarm,
// the tools, and the debug handles the screenshots and tests use.
// This is the only module that touches the DOM at load time.

import {
  ROOM_W, ROOM_H, THIEF_R, THIEF_SPEED, ENTER, LEAVE, GEM, ALARM_RISE,
  ALARM_FALL, ALARM_MAX, CAUGHT_FREEZE, SMOKES, SMOKE_R, SMOKE_T, DECOYS,
  DECOY_THROW_R, SCORE_BASE, SCORE_PER_SEC, SCORE_PER_SPOT, SCORE_GHOST,
  STEP,
} from './settings.js';
import { resolveMove, atGem, atExit, freeAt } from './floorplan.js';
import { Guard, Camera, buildWatch } from './watchers.js';
import { Controls } from './controls.js';
import { Sfx } from './sfx.js';
import { Painter } from './painter.js';
import { stageShot, freshThief } from './stills.js';

const canvas = document.getElementById('stage');
const painter = new Painter(canvas);
const controls = new Controls();
const sfx = new Sfx();
controls.attach(canvas);

// --- game state ---
function newGame() {
  const watch = buildWatch();
  return {
    state: 'title',
    thief: freshThief(),
    thiefDir: null, // last movement direction, for the painter's facing tick
    guards: watch.guards,
    cameras: watch.cameras,
    smokes: [],
    decoys: [],
    alarm: 0,
    hasGem: false,
    smokesLeft: SMOKES,
    decoysLeft: DECOYS,
    time: 0,
    detections: 0,
    score: SCORE_BASE,
    caughtT: 0,
    seenNow: false,
    muted: false,
  };
}

let g = newGame();

// Live score while playing: the GHOST bonus is NOT counted yet — it is
// only earned at the getaway, so the number on screen never climbs above
// the 1500 the run started from.
function liveScore() {
  const s = SCORE_BASE - SCORE_PER_SEC * g.time - SCORE_PER_SPOT * g.detections;
  return Math.max(0, Math.round(s));
}

function resetToDoor() {
  g.thief = freshThief();
  g.alarm = 0;
  g.caughtT = 0;
  g.state = 'play';
}

// --- one fixed step ---

function step(dt) {
  // Watchers always patrol, even on the title screen (the room feels alive).
  for (const gd of g.guards) gd.update(dt);
  for (const cam of g.cameras) cam.update(dt);

  // Smoke clouds and decoys age out.
  for (const s of g.smokes) s.t -= dt;
  g.smokes = g.smokes.filter((s) => s.t > 0);
  for (const d of g.decoys) d.t -= dt;
  g.decoys = g.decoys.filter((d) => d.t > 0);

  if (g.state === 'caught') {
    g.caughtT -= dt;
    if (g.caughtT <= 0) resetToDoor();
    return;
  }
  if (g.state !== 'play') return;

  g.time += dt;

  // Move the thief.
  const mv = controls.moveVec();
  if (mv.x !== 0 || mv.y !== 0) {
    g.thiefDir = mv;
    const p = resolveMove(
      g.thief.x + mv.x * THIEF_SPEED * dt,
      g.thief.y + mv.y * THIEF_SPEED * dt,
      THIEF_R,
    );
    g.thief.x = p.x;
    g.thief.y = p.y;
  }

  // Smoke bomb (one press = one bomb).
  if (controls.smokePressed() && g.smokesLeft > 0) {
    g.smokes.push({ x: g.thief.x, y: g.thief.y, t: SMOKE_T });
    g.smokesLeft -= 1;
    sfx.puff();
    // A fresh cloud blinds any watcher standing in it.
    for (const w of [...g.guards, ...g.cameras]) {
      if (Math.hypot(w.x - g.thief.x, w.y - g.thief.y) <= SMOKE_R) w.blinded = SMOKE_T;
    }
  }

  // Decoy throws (mouse clicks).
  for (const click of controls.takeClicks()) {
    if (g.decoysLeft <= 0) continue;
    const d = Math.hypot(click.x - g.thief.x, click.y - g.thief.y);
    if (d > DECOY_THROW_R) continue;
    g.decoys.push({ x: click.x, y: click.y, t: 6 });
    g.decoysLeft -= 1;
    // The nearest guard walks over to investigate.
    let best = null;
    let bestD = Infinity;
    for (const gd of g.guards) {
      const dd = Math.hypot(gd.x - click.x, gd.y - click.y);
      if (dd < bestD) { bestD = dd; best = gd; }
    }
    if (best) best.sendTo(click.x, click.y);
    sfx.blip(440, 0.08, 'triangle', 0.06);
  }

  // Pick up the Sunstone.
  if (!g.hasGem && atGem(g.thief.x, g.thief.y)) {
    g.hasGem = true;
    sfx.pickup();
  }

  // Does anyone see the thief right now?
  const wasSeen = g.seenNow;
  g.seenNow = [...g.guards, ...g.cameras].some((w) => w.canSee(g.thief.x, g.thief.y, g.smokes));
  if (g.seenNow && !wasSeen) sfx.alert();
  g.alarm = Math.max(0, Math.min(ALARM_MAX, g.alarm + (g.seenNow ? ALARM_RISE : -ALARM_FALL) * dt));

  // Caught: the alarm filled.
  if (g.alarm >= ALARM_MAX) {
    g.detections += 1;
    g.state = 'caught';
    g.caughtT = CAUGHT_FREEZE;
    g.score = liveScore();
    sfx.caught();
    return;
  }

  // Win: reach the EXIT carrying the gem. The GHOST bonus is earned here,
  // at the getaway, for never being seen once.
  if (g.hasGem && atExit(g.thief.x, g.thief.y)) {
    g.state = 'win';
    g.score = liveScore() + (g.detections === 0 ? SCORE_GHOST : 0);
    sfx.win();
    return;
  }

  g.score = liveScore();
}

// --- menu keys ---

controls.onKey = (code) => {
  if (code === 'Enter' && g.state === 'title') {
    g.state = 'play';
    sfx.ensure();
    return;
  }
  if ((code === 'KeyP' || code === 'Escape') && (g.state === 'play' || g.state === 'paused')) {
    g.state = g.state === 'play' ? 'paused' : 'play';
    return;
  }
  if (code === 'KeyR' && g.state !== 'title') {
    g = newGame();
    g.state = 'play';
    return;
  }
  if (code === 'KeyM') {
    g.muted = sfx.toggleMute();
  }
};

// Pause when the tab hides (a fair game never runs while unseen).
document.addEventListener('visibilitychange', () => {
  if (document.hidden && g.state === 'play') g.state = 'paused';
});

// --- screenshot staging ---

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '7');
if (shotName) {
  // Stage the requested moment, then freeze on it.
  if (stageShot(g, shotName, seed)) {
    g.state = shotName === 'caught' || shotName === 'win' ? g.state : 'play';
  }
}

// --- main loop ---

let last = performance.now();
let acc = 0;
let frames = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= STEP) {
    step(STEP);
    acc -= STEP;
  }
  painter.draw(g);
  frames += 1;
  // The screenshot harness waits for this flag before capturing.
  if (frames === 3) window.__shotReady = true;
  requestAnimationFrame(frame);
}

// Debug handles: the playtest and the tests drive the game through these.
window.__heist = {
  game: () => g,
  reset: () => { g = newGame(); g.state = 'play'; },
  state: () => g.state,
  freeAt,
  Guard,
  Camera,
};

requestAnimationFrame(frame);
