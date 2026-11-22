// floorplan.js — the museum hall itself: walls, cover that blocks sight,
// the loot, the doors, and the geometry helpers (collision, line of sight,
// grid pathfinding). Pure logic, no DOM: the Node tests import this directly.
//
// Layout (my own floor plan, 1280x720, walls 24 thick):
//   IN door bottom-left, EXIT door bottom-right, the Sunstone top-centre.
//   Three ways up to the gem: left behind the case and crates, middle past
//   the statue plinth, right along the pillars. Every cover piece is a
//   rectangle that blocks a watcher's line of sight.

import {
  ROOM_W, ROOM_H, WALL, THIEF_R, ENTER, LEAVE, LEAVE_R, GEM, GEM_R,
} from './settings.js';

// Cover pieces. `kind` picks the drawing style; `label` is the map tag.
export const COVER = [
  { kind: 'case',   x: 170,  y: 170, w: 130, h: 90,  label: 'PORCELAIN' },
  { kind: 'case',   x: 980,  y: 170, w: 130, h: 90,  label: 'JADE' },
  { kind: 'plinth', x: 590,  y: 320, w: 100, h: 90,  label: 'STATUE' },
  { kind: 'crate',  x: 110,  y: 420, w: 110, h: 80,  label: 'CRATES' },
  { kind: 'crate',  x: 1060, y: 420, w: 110, h: 80,  label: 'CRATES' },
  { kind: 'pillar', x: 400,  y: 110, w: 50,  h: 60,  label: '' },
  { kind: 'pillar', x: 830,  y: 110, w: 50,  h: 60,  label: '' },
  { kind: 'bench',  x: 480,  y: 560, w: 320, h: 50,  label: 'BENCH' },
];

// The Sunstone's glass vitrine (drawn, and it blocks sight like cover).
export const GEM_CASE = { x: GEM.x - 42, y: GEM.y - 26, w: 84, h: 52 };

// Everything that blocks a line of sight: cover plus the gem's vitrine.
export const BLOCKERS = [...COVER, { kind: 'vitrine', ...GEM_CASE, label: '' }];

// --- basic geometry ---

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// Does a circle (centre px,py, radius r) overlap a rectangle?
export function circleHitsRect(px, py, r, rc) {
  const cx = clamp(px, rc.x, rc.x + rc.w);
  const cy = clamp(py, rc.y, rc.y + rc.h);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy < r * r;
}

// Does a point sit inside a rectangle (with a small margin)?
export function pointInRect(px, py, rc, pad = 0) {
  return px >= rc.x - pad && px <= rc.x + rc.w + pad &&
         py >= rc.y - pad && py <= rc.y + rc.h + pad;
}

// Segment (ax,ay)-(bx,by) against rectangle rc: true when they intersect.
// Uses the slab test, so a segment that just grazes a corner still counts.
export function segmentHitsRect(ax, ay, bx, by, rc) {
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;
  // X slab
  if (Math.abs(dx) < 1e-9) {
    if (ax < rc.x || ax > rc.x + rc.w) return false;
  } else {
    let u = (rc.x - ax) / dx;
    let v = (rc.x + rc.w - ax) / dx;
    if (u > v) { const t = u; u = v; v = t; }
    if (u > t0) t0 = u;
    if (v < t1) t1 = v;
    if (t0 > t1) return false;
  }
  // Y slab
  if (Math.abs(dy) < 1e-9) {
    if (ay < rc.y || ay > rc.y + rc.h) return false;
  } else {
    let u = (rc.y - ay) / dy;
    let v = (rc.y + rc.h - ay) / dy;
    if (u > v) { const t = u; u = v; v = t; }
    if (u > t0) t0 = u;
    if (v < t1) t1 = v;
    if (t0 > t1) return false;
  }
  return true;
}

// Line of sight: true when no blocker sits between (ax,ay) and (bx,by).
export function clearSight(ax, ay, bx, by) {
  for (const rc of BLOCKERS) {
    if (segmentHitsRect(ax, ay, bx, by, rc)) return false;
  }
  return true;
}

// --- movement / collision ---

// Keep a circle inside the hall and push it out of cover rectangles.
// Returns the corrected position {x, y}.
export function resolveMove(px, py, r) {
  let x = clamp(px, WALL + r, ROOM_W - WALL - r);
  let y = clamp(py, WALL + r, ROOM_H - WALL - r);
  for (const rc of COVER) {
    if (!circleHitsRect(x, y, r, rc)) continue;
    // Push out along the smallest penetration axis.
    const left = (x + r) - rc.x;
    const right = (rc.x + rc.w) - (x - r);
    const top = (y + r) - rc.y;
    const bottom = (rc.y + rc.h) - (y - r);
    const m = Math.min(left, right, top, bottom);
    if (m === left) x = rc.x - r;
    else if (m === right) x = rc.x + rc.w + r;
    else if (m === top) y = rc.y - r;
    else y = rc.y + rc.h + r;
  }
  return { x, y };
}

// Is a circle free to stand at (px,py)? Used by the pathfinder and tests.
export function freeAt(px, py, r) {
  if (px < WALL + r || px > ROOM_W - WALL - r) return false;
  if (py < WALL + r || py > ROOM_H - WALL - r) return false;
  for (const rc of COVER) {
    if (circleHitsRect(px, py, r, rc)) return false;
  }
  return true;
}

// --- doors and loot ---

export function atGem(px, py) {
  return dist(px, py, GEM.x, GEM.y) <= GEM_R + THIEF_R;
}

export function atExit(px, py) {
  return dist(px, py, LEAVE.x, LEAVE.y) <= LEAVE_R;
}

export function atEnter(px, py) {
  return dist(px, py, ENTER.x, ENTER.y) <= LEAVE_R;
}

// --- grid pathfinding (BFS) ---
// A coarse grid over the hall; a cell is open when its centre is free for
// the thief. findPath returns a list of waypoints from start to goal, or
// null when no route exists. The playtest autopilot and the tests use it.

const CELL = 20;

function cellKey(cx, cy) {
  return cx + ',' + cy;
}

export function findPath(sx, sy, gx, gy) {
  const cols = Math.floor(ROOM_W / CELL);
  const rows = Math.floor(ROOM_H / CELL);
  const open = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return false;
    return freeAt(cx * CELL + CELL / 2, cy * CELL + CELL / 2, THIEF_R);
  };
  // Snap a point to the nearest open cell (the thief's exact spot may sit
  // in a cell whose centre brushes a cover edge, which must not strand it).
  const nearestOpen = (px, py) => {
    const ocx = clamp(Math.floor(px / CELL), 0, cols - 1);
    const ocy = clamp(Math.floor(py / CELL), 0, rows - 1);
    if (open(ocx, ocy)) return [ocx, ocy];
    for (let r = 1; r <= 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = ocx + dx;
          const ny = ocy + dy;
          if (open(nx, ny)) return [nx, ny];
        }
      }
    }
    return null;
  };
  const s = nearestOpen(sx, sy);
  const gl = nearestOpen(gx, gy);
  if (!s || !gl) return null;
  const [scx, scy] = s;
  const [gcx, gcy] = gl;
  const prev = new Map();
  const seen = new Set([cellKey(scx, scy)]);
  const queue = [[scx, scy]];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    if (cx === gcx && cy === gcy) {
      // Walk back to the start, collecting waypoints.
      const path = [];
      let key = cellKey(gcx, gcy);
      let cur = [gcx, gcy];
      while (key !== cellKey(scx, scy)) {
        path.unshift({ x: cur[0] * CELL + CELL / 2, y: cur[1] * CELL + CELL / 2 });
        cur = prev.get(key);
        key = cellKey(cur[0], cur[1]);
      }
      path.unshift({ x: sx, y: sy });
      return path;
    }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = cellKey(nx, ny);
      if (seen.has(key) || !open(nx, ny)) continue;
      seen.add(key);
      prev.set(key, [cx, cy]);
      queue.push([nx, ny]);
    }
  }
  return null;
}
