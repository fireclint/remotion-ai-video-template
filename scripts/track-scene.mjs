// Tracks how the background moves through a video's A-roll, so graphics can stick to it.
//   node scripts/track-scene.mjs <video> <bottom of the patch, px> [shot cuts in seconds…]
//   node scripts/track-scene.mjs my-video 540 17.667 20.733
// Writes src/<video>/data/scene.json: { fps, offsets: [[dx, dy], …] }, one per frame, in 1080×1920 pixels.
// Each frame is matched against the middle frame of its shot, so the track can't drift. Only the
// band of the frame above `bottom` is used: keep the person out of it.
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const [video, bottomArg, ...cutArgs] = process.argv.slice(2);
if (!video || !bottomArg) {
  console.error("Usage: node scripts/track-scene.mjs <video> <bottom of the patch, px> [shot cuts in seconds…]");
  process.exit(1);
}
const FPS = 30;
const SCALE = 3; // Work at a third of full size.
const W = Math.round(1080 / SCALE);
const H = Math.round(Number(bottomArg) / SCALE);
const SEARCH = 3; // How far one frame can move from the last, in working pixels.
// The reference patch stays this far from the band's edges, so it has room to move.
const MARGIN_X = 54;
const MARGIN_Y = 36;
const STEP = 2; // Compare every other pixel.

const raw = spawnSync(
  "ffmpeg",
  ["-loglevel", "error", "-i", `public/${video}/aroll.mp4`, "-vf", `scale=${W}:-1,crop=${W}:${H}:0:0,gblur=sigma=0.7,format=gray`, "-f", "rawvideo", "-"],
  { maxBuffer: 2 * 1024 * 1024 * 1024 },
).stdout;
const count = Math.floor(raw.length / (W * H));
const frame = (i) => raw.subarray(i * W * H, (i + 1) * W * H);

const refMean = (ref) => {
  let sum = 0;
  let n = 0;
  for (let y = MARGIN_Y; y < H - MARGIN_Y; y += STEP) for (let x = MARGIN_X; x < W - MARGIN_X; x += STEP) (sum += ref[y * W + x]), n++;
  return sum / n;
};

// Mean-removed difference, so auto-exposure drifting between frames doesn't look like motion.
const cost = (ref, mean, cur, dx, dy) => {
  let curSum = 0;
  let n = 0;
  for (let y = MARGIN_Y; y < H - MARGIN_Y; y += STEP) for (let x = MARGIN_X; x < W - MARGIN_X; x += STEP) (curSum += cur[(y + dy) * W + x + dx]), n++;
  const curMean = curSum / n;
  let c = 0;
  for (let y = MARGIN_Y; y < H - MARGIN_Y; y += STEP) {
    for (let x = MARGIN_X; x < W - MARGIN_X; x += STEP) {
      c += Math.abs(ref[y * W + x] - mean - (cur[(y + dy) * W + x + dx] - curMean));
    }
  }
  return c;
};

// The minimum of a parabola through three samples gives sub-pixel accuracy.
const refine = (a, b, c) => {
  const d = a - 2 * b + c;
  return d > 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / d)) : 0;
};

const limitX = MARGIN_X - SEARCH - 1;
const limitY = MARGIN_Y - SEARCH - 1;
const matchFrom = (ref, mean, cur, start) => {
  let best = { dx: start.dx, dy: start.dy, c: Infinity };
  for (let dy = Math.max(-limitY, start.dy - SEARCH); dy <= Math.min(limitY, start.dy + SEARCH); dy++) {
    for (let dx = Math.max(-limitX, start.dx - SEARCH); dx <= Math.min(limitX, start.dx + SEARCH); dx++) {
      const c = cost(ref, mean, cur, dx, dy);
      if (c < best.c) best = { dx, dy, c };
    }
  }
  const sx = refine(cost(ref, mean, cur, best.dx - 1, best.dy), best.c, cost(ref, mean, cur, best.dx + 1, best.dy));
  const sy = refine(cost(ref, mean, cur, best.dx, best.dy - 1), best.c, cost(ref, mean, cur, best.dx, best.dy + 1));
  return { dx: best.dx, dy: best.dy, x: best.dx + sx, y: best.dy + sy };
};

const shots = [0, ...cutArgs.map((c) => Math.round(Number(c) * FPS)), count];
const out = new Array(count);
for (let s = 0; s < shots.length - 1; s++) {
  const [from, to] = [shots[s], shots[s + 1]];
  const mid = Math.floor((from + to) / 2);
  const ref = frame(mid);
  const mean = refMean(ref);
  out[mid] = [0, 0];
  for (const [begin, end, dir] of [
    [mid + 1, to, 1],
    [mid - 1, from - 1, -1],
  ]) {
    let last = { dx: 0, dy: 0 };
    for (let i = begin; i !== end; i += dir) {
      const m = matchFrom(ref, mean, frame(i), last);
      last = m;
      out[i] = [m.x * SCALE, m.y * SCALE];
    }
  }
}

// A touch of smoothing hides the measuring noise, not the handheld motion. Never across a cut.
const smooth = out.map((_, i) => {
  const shot = shots.findLastIndex((c) => c <= i);
  let [x, y, w] = [0, 0, 0];
  for (let k = Math.max(shots[shot], i - 2); k <= Math.min(shots[shot + 1] - 1, i + 2); k++) {
    const weight = 3 - Math.abs(k - i);
    x += out[k][0] * weight;
    y += out[k][1] * weight;
    w += weight;
  }
  return [Math.round((x / w) * 10) / 10, Math.round((y / w) * 10) / 10];
});

fs.writeFileSync(`src/${video}/data/scene.json`, JSON.stringify({ fps: FPS, offsets: smooth }));
const xs = smooth.map((o) => o[0]);
const ys = smooth.map((o) => o[1]);
console.log(`${count} frames → src/${video}/data/scene.json (x ${Math.min(...xs)}…${Math.max(...xs)}, y ${Math.min(...ys)}…${Math.max(...ys)})`);
