// controls.js — keyboard and mouse input for the heist. Keeps its own
// state (which keys are down, where the mouse clicked) so the game loop can
// read it each step. Attaches listeners only when `attach()` is called, so
// importing this file in Node (for tests) touches no DOM.

export class Controls {
  constructor() {
    this.keys = new Set();
    this.clicks = []; // queued {x, y} canvas clicks, consumed by the loop
    this.onKey = null; // (code) => void, set by boot for menu keys
    this._down = (e) => this._key(e, true);
    this._up = (e) => this._key(e, false);
    this._click = (e) => {
      const r = e.target.getBoundingClientRect();
      const sx = e.target.width / r.width;
      const sy = e.target.height / r.height;
      this.clicks.push({ x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy });
    };
  }

  attach(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    canvas.addEventListener('mousedown', this._click);
  }

  detach() {
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
    if (this.canvas) this.canvas.removeEventListener('mousedown', this._click);
  }

  _key(e, down) {
    const c = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) {
      e.preventDefault();
    }
    if (down) {
      this.keys.add(c);
      if (this.onKey) this.onKey(c);
    } else {
      this.keys.delete(c);
    }
  }

  // Movement vector for this step, normalised (0,0) when no key is down.
  moveVec() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const s = Math.SQRT1_2;
      x *= s;
      y *= s;
    }
    return { x, y };
  }

  // True once per press of the smoke key (consumed by the loop).
  smokePressed() {
    if (this.keys.has('KeyE') || this.keys.has('Space')) {
      this.keys.delete('KeyE');
      this.keys.delete('Space');
      return true;
    }
    return false;
  }

  // Drain the queued clicks.
  takeClicks() {
    const out = this.clicks;
    this.clicks = [];
    return out;
  }
}
