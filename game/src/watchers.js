// watchers.js — the people and machines that can catch the thief: patrol
// guards with sweeping vision cones, and wall cameras with rotating cones.
// Pure logic, no DOM: the Node tests drive these classes directly.
//
// A guard walks between two waypoints, pauses at each end and sweeps its
// cone, and can be lured away by a decoy. A camera sits on the wall and
// sweeps its cone back and forth on a sine. Both answer one question:
// canSee(thiefX, thiefY, smokes) — true only when the thief is inside the
// cone AND the line of sight is clear AND no smoke hides them.

import {
  GUARD_R, GUARD_SPEED, GUARD_LURE_SPEED, GUARD_CONE_R, GUARD_CONE_HALF,
  GUARD_SWEEP, GUARD_PAUSE, CAM_CONE_R, CAM_CONE_HALF, CAM_SWEEP, CAM_PERIOD,
  DECOY_LURE_T, SMOKE_R,
} from './settings.js';
import { clearSight, dist, resolveMove } from './floorplan.js';

// Angle from (ax,ay) toward (bx,by).
export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// Smallest absolute difference between two angles, in radians.
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// Does the segment (ax,ay)-(bx,by) cross a smoke cloud?
function segmentCrossesSmoke(ax, ay, bx, by, smokes) {
  for (const s of smokes) {
    // Distance from the cloud centre to the segment.
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((s.x - ax) * dx + (s.y - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    if (dist(cx, cy, s.x, s.y) <= SMOKE_R) return true;
  }
  return false;
}

// Is the thief hidden from a watcher at (wx,wy)? True when the thief sits
// inside a smoke cloud, or a cloud sits between watcher and thief.
export function hiddenBySmoke(wx, wy, tx, ty, smokes) {
  for (const s of smokes) {
    if (dist(tx, ty, s.x, s.y) <= SMOKE_R) return true;
  }
  return segmentCrossesSmoke(wx, wy, tx, ty, smokes);
}

// A guard: walks a two-waypoint beat, pauses and sweeps at each end.
export class Guard {
  constructor(name, ax, ay, bx, by) {
    this.name = name;
    this.ax = ax; this.ay = ay; // waypoint A
    this.bx = bx; this.by = by; // waypoint B
    this.x = ax; this.y = ay;
    this.goingToB = true;
    this.facing = angleTo(ax, ay, bx, by);
    this.baseFacing = this.facing;
    this.pauseLeft = 0;
    this.sweepT = 0;
    this.lure = null; // {x, y, t} while investigating a decoy
    this.blinded = 0; // seconds left blinded by smoke
  }

  // Where the guard is heading right now (lure point, or its next waypoint).
  target() {
    if (this.lure) return { x: this.lure.x, y: this.lure.y };
    return this.goingToB ? { x: this.bx, y: this.by } : { x: this.ax, y: this.ay };
  }

  // Send this guard to investigate a decoy point.
  sendTo(x, y) {
    this.lure = { x, y, t: DECOY_LURE_T };
    this.pauseLeft = 0;
  }

  update(dt) {
    if (this.blinded > 0) this.blinded -= dt;
    if (this.lure) {
      this.lure.t -= dt;
      const d = dist(this.x, this.y, this.lure.x, this.lure.y);
      if (d < 6 || this.lure.t <= 0) {
        if (this.lure.t <= 0) {
          this.lure = null;
        } else {
          // Reached the decoy: look around briefly, then give up.
          this.lure.t = Math.min(this.lure.t, 0.8);
          this.facing += dt * 1.5;
        }
        return;
      }
      const a = angleTo(this.x, this.y, this.lure.x, this.lure.y);
      this.facing = a;
      const step = GUARD_LURE_SPEED * dt;
      const nx = this.x + Math.cos(a) * step;
      const ny = this.y + Math.sin(a) * step;
      const p = resolveMove(nx, ny, GUARD_R);
      this.x = p.x; this.y = p.y;
      return;
    }
    if (this.pauseLeft > 0) {
      // Paused at a waypoint: sweep the cone side to side.
      this.pauseLeft -= dt;
      this.sweepT += dt;
      this.facing = this.baseFacing + Math.sin(this.sweepT * 1.8) * GUARD_SWEEP;
      if (this.pauseLeft <= 0) {
        this.goingToB = !this.goingToB;
        this.baseFacing = angleTo(this.x, this.y, this.target().x, this.target().y);
        this.sweepT = 0;
      }
      return;
    }
    const t = this.target();
    const d = dist(this.x, this.y, t.x, t.y);
    if (d < 4) {
      this.pauseLeft = GUARD_PAUSE;
      return;
    }
    const a = angleTo(this.x, this.y, t.x, t.y);
    this.facing = a;
    const step = GUARD_SPEED * dt;
    const nx = this.x + Math.cos(a) * step;
    const ny = this.y + Math.sin(a) * step;
    const p = resolveMove(nx, ny, GUARD_R);
    this.x = p.x; this.y = p.y;
  }

  canSee(tx, ty, smokes) {
    if (this.blinded > 0) return false;
    if (dist(this.x, this.y, tx, ty) > GUARD_CONE_R) return false;
    const a = angleTo(this.x, this.y, tx, ty);
    if (angleDiff(a, this.facing) > GUARD_CONE_HALF) return false;
    if (!clearSight(this.x, this.y, tx, ty)) return false;
    if (hiddenBySmoke(this.x, this.y, tx, ty, smokes)) return false;
    return true;
  }
}

// A wall camera: fixed to its mount, its cone sweeping on a sine.
export class Camera {
  constructor(x, y, baseAngle) {
    this.x = x;
    this.y = y;
    this.baseAngle = baseAngle; // centre of the sweep
    this.t = Math.random() * CAM_PERIOD; // phase (seeded by stills when staged)
    this.facing = baseAngle;
    this.blinded = 0;
  }

  update(dt) {
    if (this.blinded > 0) this.blinded -= dt;
    this.t += dt;
    const phase = (this.t % CAM_PERIOD) / CAM_PERIOD;
    this.facing = this.baseAngle + Math.sin(phase * Math.PI * 2) * CAM_SWEEP;
  }

  canSee(tx, ty, smokes) {
    if (this.blinded > 0) return false;
    if (dist(this.x, this.y, tx, ty) > CAM_CONE_R) return false;
    const a = angleTo(this.x, this.y, tx, ty);
    if (angleDiff(a, this.facing) > CAM_CONE_HALF) return false;
    if (!clearSight(this.x, this.y, tx, ty)) return false;
    if (hiddenBySmoke(this.x, this.y, tx, ty, smokes)) return false;
    return true;
  }
}

// Build the night's watch: three guards on their beats, two wall cameras.
export function buildWatch() {
  return {
    guards: [
      new Guard('Vera', 280, 290, 1000, 290),
      new Guard('Otto', 240, 480, 1040, 480),
      new Guard('Nadia', 760, 170, 760, 530),
    ],
    cameras: [
      new Camera(320, 36, Math.PI / 2),
      new Camera(960, 36, Math.PI / 2),
    ],
  };
}
