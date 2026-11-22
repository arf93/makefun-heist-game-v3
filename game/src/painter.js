// painter.js — draws the whole heist on a 2D canvas: the museum hall,
// the cover, the glowing Sunstone, the watchers and their cones, the thief,
// the smoke and decoys, the HUD, and the title / pause / caught / win
// screens. All art is canvas shapes in code; no images are loaded.
//
// Readability rules (from the Supervisor's review of the first build):
// - Map labels (IN, EXIT, THE SUNSTONE, guard names) are only drawn when
//   the room is shown near full size; at a small scale they clip and smear,
//   so they are hidden below LABEL_MIN_SCALE and the room still reads.
// - Overlay screens get a darker panel (scrim) behind the text, so the
//   words stand off the busy room behind them.
// - The floor and walls are a touch brighter than a first draft, so cover,
//   cones and the thief separate at a glance in a small screenshot.

import {
  ROOM_W, ROOM_H, WALL, THIEF_R, ENTER, LEAVE, GEM, LABEL_MIN_SCALE,
  ALARM_MAX,
} from './settings.js';
import { COVER, GEM_CASE } from './floorplan.js';

// --- palette (bright enough to read at a glance) ---
const FLOOR_A = '#1d212b';
const FLOOR_B = '#232835';
const WALL_C = '#333947';
const WALL_LINE = '#454c5e';
const CASE_GLASS = '#2c4a6e';
const CASE_FRAME = '#5d7ea6';
const PLINTH_C = '#3a3f4d';
const CRATE_C = '#27405f';
const CRATE_LINE = '#3d5f8f';
const PILLAR_C = '#39404f';
const BENCH_C = '#2e3442';
const GOLD = '#f5c542';
const GOLD_GLOW = 'rgba(245, 197, 66, 0.35)';
const CONE_GUARD = 'rgba(245, 197, 66, 0.20)';
const CONE_GUARD_EDGE = 'rgba(245, 197, 66, 0.55)';
const CONE_CAM = 'rgba(230, 70, 70, 0.20)';
const CONE_CAM_EDGE = 'rgba(230, 70, 70, 0.55)';
const THIEF_C = '#f2ead8';
const GUARD_C = '#c96a3b';
const EXIT_C = '#2fae5f';
const ENTER_C = '#8a6d2f';

export class Painter {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // Scale of the room on this canvas (1.0 at the native 1280x720).
    this.scale = canvas.width / ROOM_W;
    this.t = 0; // animation clock, for the gem's pulse
  }

  get showLabels() {
    return this.scale >= LABEL_MIN_SCALE;
  }

  // Draw one frame of the game state `g`.
  draw(g) {
    const c = this.ctx;
    this.t += 1 / 60;
    c.save();
    c.clearRect(0, 0, ROOM_W, ROOM_H);
    this.drawFloor(c);
    this.drawDoors(c);
    this.drawCover(c);
    this.drawGem(c, g);
    this.drawCones(c, g);
    this.drawWatchers(c, g);
    this.drawDecoys(c, g);
    this.drawSmoke(c, g);
    this.drawThief(c, g);
    this.drawHud(c, g);
    if (g.state === 'title') this.drawTitle(c, g);
    if (g.state === 'paused') this.drawPaused(c);
    if (g.state === 'caught') this.drawCaught(c, g);
    if (g.state === 'win') this.drawWin(c, g);
    c.restore();
  }

  // --- room ---

  drawFloor(c) {
    // Checker floor, two close dark tones (bright enough to separate cover).
    const cell = 64;
    for (let y = 0; y < ROOM_H; y += cell) {
      for (let x = 0; x < ROOM_W; x += cell) {
        c.fillStyle = ((x / cell + y / cell) % 2 === 0) ? FLOOR_A : FLOOR_B;
        c.fillRect(x, y, cell, cell);
      }
    }
    // Walls: a bright border so the room's edge reads in a small shot.
    c.fillStyle = WALL_C;
    c.fillRect(0, 0, ROOM_W, WALL);
    c.fillRect(0, ROOM_H - WALL, ROOM_W, WALL);
    c.fillRect(0, 0, WALL, ROOM_H);
    c.fillRect(ROOM_W - WALL, 0, WALL, ROOM_H);
    c.strokeStyle = WALL_LINE;
    c.lineWidth = 2;
    c.strokeRect(WALL, WALL, ROOM_W - WALL * 2, ROOM_H - WALL * 2);
  }

  drawDoors(c) {
    // IN door, bottom-left (warm brown).
    c.fillStyle = ENTER_C;
    c.fillRect(ENTER.x - 34, ROOM_H - WALL - 6, 68, 8);
    if (this.showLabels) {
      c.fillStyle = '#e8d9a8';
      c.font = 'bold 15px sans-serif';
      c.textAlign = 'center';
      c.fillText('IN', ENTER.x, ROOM_H - WALL - 14);
    }
    // EXIT door, bottom-right (green, the getaway).
    c.fillStyle = EXIT_C;
    c.fillRect(LEAVE.x - 34, ROOM_H - WALL - 6, 68, 8);
    if (this.showLabels) {
      c.fillStyle = '#c8f5d6';
      c.font = 'bold 15px sans-serif';
      c.textAlign = 'center';
      c.fillText('EXIT', LEAVE.x, ROOM_H - WALL - 14);
    }
  }

  drawCover(c) {
    for (const rc of COVER) {
      if (rc.kind === 'case') {
        c.fillStyle = CASE_GLASS;
        c.fillRect(rc.x, rc.y, rc.w, rc.h);
        c.strokeStyle = CASE_FRAME;
        c.lineWidth = 3;
        c.strokeRect(rc.x, rc.y, rc.w, rc.h);
        // Glass glint.
        c.strokeStyle = 'rgba(255,255,255,0.35)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(rc.x + 14, rc.y + rc.h - 12);
        c.lineTo(rc.x + rc.w - 22, rc.y + 14);
        c.stroke();
      } else if (rc.kind === 'plinth') {
        c.fillStyle = PLINTH_C;
        c.fillRect(rc.x, rc.y, rc.w, rc.h);
        c.strokeStyle = '#565d6e';
        c.lineWidth = 2;
        c.strokeRect(rc.x, rc.y, rc.w, rc.h);
        // A little statue on top.
        c.fillStyle = '#c9c2b2';
        c.beginPath();
        c.arc(rc.x + rc.w / 2, rc.y + rc.h / 2 - 6, 12, 0, Math.PI * 2);
        c.fill();
        c.fillRect(rc.x + rc.w / 2 - 8, rc.y + rc.h / 2 + 4, 16, 14);
      } else if (rc.kind === 'crate') {
        c.fillStyle = CRATE_C;
        c.fillRect(rc.x, rc.y, rc.w, rc.h);
        c.strokeStyle = CRATE_LINE;
        c.lineWidth = 2;
        c.strokeRect(rc.x, rc.y, rc.w, rc.h);
        c.beginPath();
        c.moveTo(rc.x, rc.y);
        c.lineTo(rc.x + rc.w, rc.y + rc.h);
        c.moveTo(rc.x + rc.w, rc.y);
        c.lineTo(rc.x, rc.y + rc.h);
        c.stroke();
      } else if (rc.kind === 'pillar') {
        c.fillStyle = PILLAR_C;
        c.beginPath();
        c.arc(rc.x + rc.w / 2, rc.y + rc.h / 2, rc.w / 2, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#565d6e';
        c.lineWidth = 2;
        c.stroke();
      } else { // bench
        c.fillStyle = BENCH_C;
        c.fillRect(rc.x, rc.y, rc.w, rc.h);
        c.strokeStyle = '#4a5160';
        c.lineWidth = 2;
        c.strokeRect(rc.x, rc.y, rc.w, rc.h);
      }
      if (rc.label && this.showLabels) {
        c.fillStyle = 'rgba(220, 225, 235, 0.75)';
        c.font = '11px sans-serif';
        c.textAlign = 'center';
        c.fillText(rc.label, rc.x + rc.w / 2, rc.y + rc.h / 2 + 4);
      }
    }
  }

  drawGem(c, g) {
    // Vitrine.
    c.fillStyle = 'rgba(70, 110, 150, 0.5)';
    c.fillRect(GEM_CASE.x, GEM_CASE.y, GEM_CASE.w, GEM_CASE.h);
    c.strokeStyle = CASE_FRAME;
    c.lineWidth = 2;
    c.strokeRect(GEM_CASE.x, GEM_CASE.y, GEM_CASE.w, GEM_CASE.h);
    if (!g.hasGem) {
      // The Sunstone itself: a pulsing gold diamond with a glow.
      const pulse = 0.75 + 0.25 * Math.sin(this.t * 3);
      const glow = 34 + 8 * pulse;
      const grad = c.createRadialGradient(GEM.x, GEM.y, 4, GEM.x, GEM.y, glow);
      grad.addColorStop(0, GOLD_GLOW);
      grad.addColorStop(1, 'rgba(245, 197, 66, 0)');
      c.fillStyle = grad;
      c.beginPath();
      c.arc(GEM.x, GEM.y, glow, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = GOLD;
      c.beginPath();
      c.moveTo(GEM.x, GEM.y - 14);
      c.lineTo(GEM.x + 11, GEM.y);
      c.lineTo(GEM.x, GEM.y + 14);
      c.lineTo(GEM.x - 11, GEM.y);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath();
      c.moveTo(GEM.x, GEM.y - 14);
      c.lineTo(GEM.x + 11, GEM.y);
      c.lineTo(GEM.x, GEM.y);
      c.lineTo(GEM.x - 11, GEM.y);
      c.closePath();
      c.fill();
      if (this.showLabels) {
        c.fillStyle = '#ffe9a8';
        c.font = 'bold 14px sans-serif';
        c.textAlign = 'center';
        c.fillText('THE SUNSTONE', GEM.x, GEM_CASE.y - 10);
      }
    }
  }

  // --- watchers and their cones ---

  conePath(c, x, y, facing, half, range) {
    c.beginPath();
    c.moveTo(x, y);
    c.arc(x, y, range, facing - half, facing + half);
    c.closePath();
  }

  drawCones(c, g) {
    for (const cam of g.cameras) {
      this.conePath(c, cam.x, cam.y, cam.facing, 0.49, 260);
      c.fillStyle = CONE_CAM;
      c.fill();
      c.strokeStyle = CONE_CAM_EDGE;
      c.lineWidth = 1.5;
      c.stroke();
    }
    for (const gd of g.guards) {
      this.conePath(c, gd.x, gd.y, gd.facing, 0.56, 230);
      c.fillStyle = CONE_GUARD;
      c.fill();
      c.strokeStyle = CONE_GUARD_EDGE;
      c.lineWidth = 1.5;
      c.stroke();
    }
  }

  drawWatchers(c, g) {
    for (const cam of g.cameras) {
      // Wall mount: a small dark box with a red lens.
      c.fillStyle = '#22262f';
      c.fillRect(cam.x - 14, cam.y - 10, 28, 20);
      c.strokeStyle = '#4a5160';
      c.lineWidth = 2;
      c.strokeRect(cam.x - 14, cam.y - 10, 28, 20);
      c.fillStyle = '#e64646';
      c.beginPath();
      c.arc(cam.x, cam.y, 5, 0, Math.PI * 2);
      c.fill();
    }
    for (const gd of g.guards) {
      // Body.
      c.fillStyle = GUARD_C;
      c.beginPath();
      c.arc(gd.x, gd.y, 13, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#7a3d1e';
      c.lineWidth = 2;
      c.stroke();
      // Facing tick.
      c.strokeStyle = '#ffd9a8';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(gd.x, gd.y);
      c.lineTo(gd.x + Math.cos(gd.facing) * 18, gd.y + Math.sin(gd.facing) * 18);
      c.stroke();
      if (this.showLabels) {
        c.fillStyle = 'rgba(255, 220, 170, 0.9)';
        c.font = '12px sans-serif';
        c.textAlign = 'center';
        c.fillText(gd.name, gd.x, gd.y - 20);
      }
    }
  }

  // --- thief, tools, HUD ---

  drawThief(c, g) {
    const { x, y } = g.thief;
    // Soft shadow.
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.ellipse(x, y + 10, 12, 5, 0, 0, Math.PI * 2);
    c.fill();
    // Body: a cream figure with a flat-brim hat.
    c.fillStyle = THIEF_C;
    c.beginPath();
    c.arc(x, y, THIEF_R, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#8a8272';
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = '#3a3428';
    c.fillRect(x - 13, y - 6, 26, 4);
    c.beginPath();
    c.arc(x, y - 4, 7, Math.PI, 0);
    c.fill();
    // Facing tick: a short nose showing which way the thief is moving, so
    // the player can read their own direction at a glance (the guards have
    // one too, and it makes the thief's motion readable in stills).
    if (g.thiefDir) {
      c.strokeStyle = '#3a3428';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + g.thiefDir.x * 17, y + g.thiefDir.y * 17);
      c.stroke();
    }
    // Gem in hand.
    if (g.hasGem) {
      c.fillStyle = GOLD;
      c.beginPath();
      c.moveTo(x + 10, y + 12);
      c.lineTo(x + 16, y + 18);
      c.lineTo(x + 10, y + 24);
      c.lineTo(x + 4, y + 18);
      c.closePath();
      c.fill();
    }
  }

  drawDecoys(c, g) {
    for (const d of g.decoys) {
      const blink = 0.5 + 0.5 * Math.sin(this.t * 8);
      c.fillStyle = `rgba(120, 220, 255, ${0.4 + 0.5 * blink})`;
      c.beginPath();
      c.arc(d.x, d.y, 6, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(200, 240, 255, 0.9)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(d.x, d.y, 10, 0, Math.PI * 2);
      c.stroke();
    }
  }

  drawSmoke(c, g) {
    for (const s of g.smokes) {
      const fade = Math.max(0, Math.min(1, s.t / 1.2));
      c.fillStyle = `rgba(200, 205, 215, ${0.34 * fade})`;
      c.beginPath();
      c.arc(s.x, s.y, 150, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = `rgba(220, 225, 235, ${0.22 * fade})`;
      c.beginPath();
      c.arc(s.x - 40, s.y - 24, 70, 0, Math.PI * 2);
      c.arc(s.x + 46, s.y + 30, 60, 0, Math.PI * 2);
      c.fill();
    }
  }

  drawHud(c, g) {
    // Top bar.
    c.fillStyle = 'rgba(10, 12, 18, 0.88)';
    c.fillRect(0, 0, ROOM_W, 34);
    c.fillStyle = '#e8e4d8';
    c.font = 'bold 16px sans-serif';
    c.textAlign = 'left';
    c.fillText('THE GILDED VAULT', 14, 23);
    // Alarm bar (kept clear of the title: the title ends near x=185).
    const bx = 256;
    const bw = 190;
    c.fillStyle = '#3a2a22';
    c.fillRect(bx, 9, bw, 16);
    const frac = Math.max(0, Math.min(1, g.alarm / ALARM_MAX));
    c.fillStyle = frac > 0.66 ? '#e64646' : frac > 0.33 ? '#f5a542' : '#f5c542';
    c.fillRect(bx, 9, bw * frac, 16);
    c.strokeStyle = '#6b5a44';
    c.lineWidth = 1;
    c.strokeRect(bx, 9, bw, 16);
    c.fillStyle = '#e8e4d8';
    c.font = 'bold 13px sans-serif';
    c.fillText('ALARM', bx - 56, 22);
    // Sunstone indicator.
    c.fillStyle = g.hasGem ? GOLD : '#8a8272';
    c.font = 'bold 14px sans-serif';
    c.fillText(g.hasGem ? '◆ SUNSTONE ✓' : '◇ SUNSTONE', 476, 23);
    // Tools.
    c.fillStyle = '#e8e4d8';
    c.fillText(`SMOKE ×${g.smokesLeft} (E)`, 640, 23);
    c.fillText(`DECOY ×${g.decoysLeft} (click)`, 800, 23);
    // Time and score, right-aligned.
    const mins = Math.floor(g.time / 60);
    const secs = Math.floor(g.time % 60).toString().padStart(2, '0');
    c.textAlign = 'right';
    c.fillText(`TIME ${mins}:${secs}`, 1150, 23);
    c.fillText(`SCORE ${g.score}`, 1266, 23);
    // Alarm flash: a red vignette while a watcher sees the thief.
    if (g.seenNow && g.state === 'play') {
      c.strokeStyle = 'rgba(230, 70, 70, 0.55)';
      c.lineWidth = 6;
      c.strokeRect(3, 3, ROOM_W - 6, ROOM_H - 6);
    }
  }

  // --- overlays (each gets a dark scrim panel behind its text) ---

  scrim(c, x, y, w, h) {
    c.fillStyle = 'rgba(0, 0, 0, 0.62)';
    c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(245, 197, 66, 0.5)';
    c.lineWidth = 2;
    c.strokeRect(x, y, w, h);
  }

  drawTitle(c, g) {
    this.scrim(c, 340, 180, 600, 330);
    c.textAlign = 'center';
    c.fillStyle = GOLD;
    c.font = 'bold 54px sans-serif';
    c.fillText('THE GILDED VAULT', 640, 260);
    c.fillStyle = '#e8e4d8';
    c.font = '20px sans-serif';
    c.fillText('A midnight museum heist', 640, 300);
    c.font = '16px sans-serif';
    c.fillStyle = '#c9c2b2';
    c.fillText('Steal the Sunstone. Dodge the cones. Leave unseen.', 640, 340);
    c.fillText('WASD / arrows — move      E / Space — smoke bomb', 640, 378);
    c.fillText('Click — throw a decoy      P — pause      M — mute', 640, 406);
    c.fillStyle = '#ffe9a8';
    c.font = 'bold 20px sans-serif';
    c.fillText('Press ENTER to begin', 640, 460);
  }

  drawPaused(c) {
    this.scrim(c, 490, 300, 300, 110);
    c.textAlign = 'center';
    c.fillStyle = '#e8e4d8';
    c.font = 'bold 36px sans-serif';
    c.fillText('PAUSED', 640, 350);
    c.font = '16px sans-serif';
    c.fillStyle = '#c9c2b2';
    c.fillText('Press P to resume', 640, 382);
  }

  drawCaught(c, g) {
    this.scrim(c, 440, 280, 400, 150);
    c.textAlign = 'center';
    c.fillStyle = '#ff6b6b';
    c.font = 'bold 44px sans-serif';
    c.fillText('SPOTTED!', 640, 340);
    c.fillStyle = '#e8e4d8';
    c.font = '18px sans-serif';
    c.fillText('The alarm filled — back to the door.', 640, 380);
    if (g.hasGem) {
      c.fillStyle = GOLD;
      c.font = '16px sans-serif';
      c.fillText('You keep the Sunstone. Try again.', 640, 408);
    }
  }

  drawWin(c, g) {
    this.scrim(c, 380, 200, 520, 300);
    c.textAlign = 'center';
    c.fillStyle = GOLD;
    c.font = 'bold 44px sans-serif';
    c.fillText('CLEAN GETAWAY', 640, 270);
    c.fillStyle = '#e8e4d8';
    c.font = '20px sans-serif';
    const mins = Math.floor(g.time / 60);
    const secs = Math.floor(g.time % 60).toString().padStart(2, '0');
    c.fillText(`Time ${mins}:${secs}    Detections ${g.detections}`, 640, 320);
    c.fillText(`Score ${g.score}`, 640, 352);
    if (g.detections === 0) {
      c.fillStyle = GOLD;
      c.font = 'bold 20px sans-serif';
      c.fillText('GHOST — never seen once', 640, 390);
    }
    c.fillStyle = '#c9c2b2';
    c.font = '16px sans-serif';
    c.fillText('◆ SUNSTONE ✓', 640, 428);
    c.fillText('Press R to play again', 640, 462);
  }
}
