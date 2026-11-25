// Finds the cuts between takes in a video's A-roll, so wipes, punch-ins and layout switches can land on them
// (and track-scene.mjs gets its shot cuts).
//   node scripts/find-cuts.mjs <video> [sensitivity, default 4]
// Prints each cut as seconds, at the first frame of the new take. A jump cut in a talking-head shot moves
// only part of the picture, so this looks for a frame that changes far more than the frames around it.
// Lower the sensitivity to catch subtler cuts; check what it finds on a contact sheet.
import { spawn } from "node:child_process";

const video = process.argv[2];
if (!video) {
  console.error("Usage: node scripts/find-cuts.mjs <video> [sensitivity]");
  process.exit(1);
}
const K = Number(process.argv[3] ?? 4);
const FPS = 30;
const W = 108;
const H = 192;
const SIZE = W * H;

const diffs = [];
let prev = null;
let carry = Buffer.alloc(0);
const ff = spawn("ffmpeg", ["-v", "error", "-i", `public/${video}/aroll.mp4`, "-vf", `scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"], {
  stdio: ["ignore", "pipe", "inherit"],
});
ff.stdout.on("data", (chunk) => {
  const buf = carry.length ? Buffer.concat([carry, chunk]) : chunk;
  let o = 0;
  while (o + SIZE <= buf.length) {
    const cur = buf.subarray(o, o + SIZE);
    let d = 0;
    if (prev) for (let i = 0; i < SIZE; i++) d += Math.abs(cur[i] - prev[i]);
    diffs.push(d / SIZE);
    prev = Buffer.from(cur);
    o += SIZE;
  }
  carry = buf.subarray(o);
});
ff.on("close", () => {
  const cuts = [];
  for (let i = 1; i < diffs.length; i++) {
    const around = [...diffs.slice(Math.max(1, i - 10), i), ...diffs.slice(i + 1, i + 11)].sort((a, b) => a - b);
    const median = around[around.length >> 1] ?? 0;
    const peak = diffs[i] >= diffs[i - 1] && diffs[i] >= (diffs[i + 1] ?? 0);
    if (peak && diffs[i] > 0.4 && diffs[i] > K * median + 0.25) cuts.push({ frame: i, strength: diffs[i] / Math.max(median, 0.05) });
  }
  console.log(cuts.map((c) => (c.frame / FPS).toFixed(3)).join(" ") || "No cuts found");
  for (const c of cuts) console.log(`  frame ${c.frame}  ${(c.frame / FPS).toFixed(3)}s  ${c.strength.toFixed(0)}x the frames around it`);
});
