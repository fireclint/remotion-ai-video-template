// Cuts the on-camera person out of a video's A-roll with Apple Vision person segmentation.
//   node scripts/cutout.mjs <video>
// Writes public/<video>/cutout.webm: the A-roll with everything but the person transparent
// (VP9 with alpha), frame for frame with aroll.mp4. A face bubble can then show the person
// without whatever was behind them.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const video = process.argv[2];
if (!video) {
  console.error("Usage: node scripts/cutout.mjs <video>");
  process.exit(1);
}
const work = path.join(process.cwd(), ".cache", `${video}-cutout`);
const frames = path.join(work, "frames");
const masks = path.join(work, "masks");
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(frames, { recursive: true });
fs.mkdirSync(masks, { recursive: true });

const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

ff(["-i", `public/${video}/aroll.mp4`, "-q:v", "2", path.join(frames, "%05d.jpg")]);
execFileSync("swift", ["scripts/segment.swift", frames, masks], { stdio: "inherit" });

// Mask cleanup: drop low-confidence pixels (at a looser threshold, faint text from the old
// background ghosted through above the hair), shrink the edge a touch, then soften it.
ff([
  "-framerate", "30", "-i", path.join(frames, "%05d.jpg"),
  "-framerate", "30", "-i", path.join(masks, "%05d.png"),
  "-filter_complex", "[1]format=gray,lut=y=clip((val-130)*2.5\\,0\\,255),erosion,erosion,gblur=sigma=1.2[m];[0][m]alphamerge,format=yuva420p",
  "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-crf", "24", "-b:v", "0", "-row-mt", "1", "-cpu-used", "4", "-an",
  `public/${video}/cutout.webm`,
]);

console.log(`Wrote public/${video}/cutout.webm`);
