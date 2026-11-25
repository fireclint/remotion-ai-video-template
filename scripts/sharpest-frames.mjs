// Finds the crispest frames in a video's A-roll, for thumbnails. Blur shows far more in a still than in video.
//   node scripts/sharpest-frames.mjs <video> [frames per window, default 15]
// Prints the sharpest frame of each window as frame:score (higher is crisper). Then look at them:
// sharpness says nothing about the expression.
import { spawn } from "node:child_process";

const video = process.argv[2];
if (!video) {
  console.error("Usage: node scripts/sharpest-frames.mjs <video> [frames per window]");
  process.exit(1);
}
const windowFrames = Number(process.argv[3] ?? 15);

// Where a selfie's face usually sits. Only this area is scored, so a sharp background doesn't count.
const W = 540;
const H = 800;
const SIZE = W * H;

// Variance of the Laplacian, sampling every other pixel.
const score = (buf, o) => {
  let sum = 0;
  let sq = 0;
  let n = 0;
  for (let y = 1; y < H - 1; y += 2) {
    for (let x = 1; x < W - 1; x += 2) {
      const i = o + y * W + x;
      const l = buf[i - 1] + buf[i + 1] + buf[i - W] + buf[i + W] - 4 * buf[i];
      sum += l;
      sq += l * l;
      n++;
    }
  }
  return sq / n - (sum / n) ** 2;
};

const scores = [];
let carry = Buffer.alloc(0);
const ff = spawn("ffmpeg", ["-v", "error", "-i", `public/${video}/aroll.mp4`, "-vf", `crop=${W}:${H}:270:650`, "-f", "rawvideo", "-pix_fmt", "gray", "-"], {
  stdio: ["ignore", "pipe", "inherit"],
});
ff.stdout.on("data", (chunk) => {
  const buf = carry.length ? Buffer.concat([carry, chunk]) : chunk;
  let o = 0;
  while (o + SIZE <= buf.length) {
    scores.push(score(buf, o));
    o += SIZE;
  }
  carry = buf.subarray(o);
});
ff.on("close", () => {
  const best = [];
  for (let s = 0; s < scores.length; s += windowFrames) {
    let top = s;
    for (let f = s; f < Math.min(s + windowFrames, scores.length); f++) if (scores[f] > scores[top]) top = f;
    best.push(`${top}:${scores[top].toFixed(0)}`);
  }
  console.log(best.join(" "));
  const sorted = [...scores].sort((a, b) => a - b);
  console.log(`${scores.length} frames, median ${sorted[sorted.length >> 1].toFixed(0)}, top tenth starts at ${sorted[Math.floor(sorted.length * 0.9)].toFixed(0)}`);
});
