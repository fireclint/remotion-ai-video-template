// A grid of frames from any video, for checking a cut or a render without watching it.
//   node scripts/contact-sheet.mjs <video file> <out.png> <columns> <tile width> <seconds> <seconds> …
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [video, out, cols, width, ...times] = process.argv.slice(2);
if (!video || !out || !cols || !width || !times.length) {
  console.error("Usage: node scripts/contact-sheet.mjs <video file> <out.png> <columns> <tile width> <seconds> <seconds> …");
  process.exit(1);
}
const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);

const dir = `${out}.frames`;
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir);
times.forEach((t, i) => ff(["-ss", t, "-i", video, "-frames:v", "1", "-vf", `scale=${width}:-1`, `${dir}/${String(i).padStart(3, "0")}.png`]));

const rows = Math.ceil(times.length / Number(cols));
ff(["-framerate", "1", "-i", `${dir}/%03d.png`, "-vf", `tile=${cols}x${rows}:padding=6:color=white`, "-frames:v", "1", out]);
fs.rmSync(dir, { recursive: true, force: true });
console.log(`Wrote ${out}`);
