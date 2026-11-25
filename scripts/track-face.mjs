// Tracks the on-camera face through a video's A-roll, 10 times a second.
//   node scripts/track-face.mjs <video>
// Writes src/<video>/data/faces.json: { fps, boxes: [[cx, cy, w, h] | null, …] } in 1080×1920 pixels.
// Face bubbles use it to stay on the face; plans use it to keep graphics off it.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const video = process.argv[2];
if (!video) {
  console.error("Usage: node scripts/track-face.mjs <video>");
  process.exit(1);
}
const FPS = 10;
const frames = path.join(process.cwd(), ".cache", `${video}-faces`);
fs.rmSync(frames, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });

execFileSync("ffmpeg", ["-loglevel", "error", "-i", `public/${video}/aroll.mp4`, "-vf", `fps=${FPS},scale=540:960`, "-q:v", "3", path.join(frames, "%05d.jpg")]);

const norm = JSON.parse(execFileSync("swift", ["scripts/face.swift", frames], { maxBuffer: 64 * 1024 * 1024 }).toString());
const boxes = norm.map((b) => (b ? [Math.round(b[0] * 1080), Math.round(b[1] * 1920), Math.round(b[2] * 1080), Math.round(b[3] * 1920)] : null));

fs.writeFileSync(`src/${video}/data/faces.json`, JSON.stringify({ fps: FPS, boxes }));
console.log(`${boxes.filter(Boolean).length}/${boxes.length} samples have a face → src/${video}/data/faces.json`);
