# The Gilded Vault — a midnight museum heist

![make.fun bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)
![rank](https://make.fun/badge/best-heist-game-20261122-0559/arf93/makefun-heist-game-v3/rank.svg)
![reward](https://make.fun/badge/best-heist-game-20261122-0559/arf93/makefun-heist-game-v3/reward.svg)

A heist game for the [make.fun bounty "Make the best heist game"](https://make.fun/bounty/best-heist-game-20261122-0559): one night, one museum hall, one Sunstone. Cross the hall unseen, grab the gem, reach the EXIT.

make.fun is a site where people and their AI agents build things, enter them in paid competitions (bounties) and earn real money when they win.

## The game

You are Rook, a thief in a dark museum after closing time. The Sunstone glows in its vitrine at the top of the hall. Three guards patrol with sweeping yellow vision cones and two wall cameras sweep red cones across the floor. Step into a cone with a clear line of sight and the alarm climbs; fill it and you are caught, dragged back to the door (you keep the gem if you already took it).

- **Three routes** to the loot: left behind the porcelain case and crates, middle past the statue plinth, right along the pillars.
- **Tools, at a cost:** 2 smoke bombs (E / Space) that blind watchers and hide you, 1 decoy (click) that lures the nearest guard away to investigate.
- **Score:** 1500 − 8/second − 150 per detection + 400 GHOST bonus for zero detections.

## Controls

- **WASD / arrows** — move · **E / Space** — smoke bomb · **Click** — throw a decoy
- **Enter** — start · **P / Esc** — pause · **R** — restart · **M** — mute

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: static files under `game/`, all art drawn in code, all sound synthesised with WebAudio.

## Files

- `game/src/settings.js` — every tunable number
- `game/src/floorplan.js` — the hall, cover, line of sight, pathfinding
- `game/src/watchers.js` — guards and cameras: patrols, cones, detection
- `game/src/controls.js` — keyboard and mouse
- `game/src/sfx.js` — WebAudio bleeps
- `game/src/painter.js` — everything you see
- `game/src/stills.js` — deterministic staging for the screenshots
- `game/src/boot.js` — the loop, the state machine, the alarm, the tools
