// Turns a video's CapCut export into a render-friendly A-roll, plus a 16 kHz wav for Whisper.
//   node scripts/prep-footage.mjs <video> path/to/cut.mp4
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [video, src] = process.argv.slice(2);
if (!video || !src) {
  console.error("Usage: node scripts/prep-footage.mjs <video> path/to/cut.mp4");
  process.exit(1);
}
const pub = path.join(process.cwd(), "public", video);
const cache = path.join(process.cwd(), ".cache");
fs.mkdirSync(pub, { recursive: true });
fs.mkdirSync(cache, { recursive: true });

const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

// This project is vertical. Other shapes fill the frame by cropping the sides or the top and bottom,
// never by stretching, and they get a warning because that loses part of the picture.
const probe = JSON.parse(
  execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_side_data=rotation", "-of", "json", src]).toString(),
).streams[0];
const turned = Math.abs(probe.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0) === 90;
const [w, h] = turned ? [probe.height, probe.width] : [probe.width, probe.height];
if (Math.abs(w / h - 9 / 16) > 0.01) {
  console.warn(`Warning: ${path.basename(src)} is ${w}x${h}, not 9:16, so it will be center-cropped to 1080x1920.`);
}

// Any size/codec → 1080x1920 H.264 (headless Chrome can't be trusted with HEVC).
// Audio: gentle denoise, then loudness to -14 LUFS, the social-video standard.
ff([
  "-i", src,
  "-vf", "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1,fps=30",
  "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
  "-af", "afftdn=nr=8:nf=-40,loudnorm=I=-14:TP=-1.5:LRA=11",
  "-ar", "48000", "-c:a", "aac", "-b:a", "192k",
  "-movflags", "+faststart",
  path.join(pub, "aroll.mp4"),
]);

// A second of silence on the end: Whisper drops the last words when speech runs right up to the last frame.
ff(["-i", path.join(pub, "aroll.mp4"), "-af", "apad=pad_dur=1", "-ac", "1", "-ar", "16000", path.join(cache, `${video}-16k.wav`)]);

// Held on screen after the footage ends. Taken 0.4s from the end to dodge a closing blink.
ff(["-sseof", "-0.4", "-i", path.join(pub, "aroll.mp4"), "-update", "1", "-frames:v", "1", path.join(pub, "aroll-last.png")]);

console.log(`Wrote public/${video}/aroll.mp4, aroll-last.png and .cache/${video}-16k.wav`);
