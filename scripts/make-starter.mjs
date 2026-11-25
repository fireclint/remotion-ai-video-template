// Builds the starter's stand-in footage and the five sound effects it uses, so the template renders
// without anyone's real video. Everything it writes is gitignored.
//   npm run starter
// Writes public/starter/aroll.mp4, aroll-last.png and cutout.webm: a flat silhouette that jump-cuts
// three times, reading the starter's script aloud with macOS's `say`. Each sentence is stretched to the
// word timings in src/starter/data/captions.json, so the starter's captions and cues line up without
// running Whisper. Without `say` (not on a Mac) the footage is silent.
// Also writes public/sfx/{marker,whip,whoosh,scribble,ding}.wav, synthesized with ffmpeg, so they carry
// no license. Swap in your own sounds whenever you like.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const W = 1080;
const H = 1920;
const FPS = 30;
const root = process.cwd();
const pub = path.join(root, "public", "starter");
const sfxDir = path.join(root, "public", "sfx");
const work = path.join(root, ".cache", "make-starter");

const has = (cmd) => {
  try {
    execFileSync("which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
if (!has("ffmpeg") || !has("ffprobe")) {
  console.error("ffmpeg isn't installed. On a Mac: brew install ffmpeg");
  process.exit(1);
}
const ff = (args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: ["ignore", "inherit", "inherit"] });
const durationOf = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());

fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(pub, { recursive: true });
fs.mkdirSync(sfxDir, { recursive: true });

const footage = JSON.parse(fs.readFileSync("src/starter/data/footage.json", "utf8"));
const captions = JSON.parse(fs.readFileSync("src/starter/data/captions.json", "utf8"));
const TOTAL = Math.round(footage.durationSec * FPS);

// ---- Picture

// The takes: the frame each starts on (the cuts in src/starter/plan.ts) and how far the person sits
// from centre in it, so each cut shows as a small jump, like a real cut between takes.
const TAKES = [
  { from: 0, dx: 2, dy: 0 },
  { from: 61, dx: 10, dy: -8 },
  { from: 147, dx: -10, dy: 4 },
  { from: 229, dx: 6, dy: -4 },
];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const SKIN = hex("#606877");
const BODY = hex("#29313E");
// A plain wall, a little darker to the right.
const wall = (x, y) => {
  const fx = x / W;
  const fy = y / H;
  return [232 - 17 * fx - 6 * fy, 230 - 18 * fx - 6 * fy, 221 - 18 * fx - 6 * fy];
};

// 0 = wall, 1 = head or neck, 2 = shoulders. The head's centre is (cx, cy).
const region = (x, y, cx, cy) => {
  if (y >= cy + 953 || ((x - cx) / 708) ** 2 + ((y - cy - 953) / 600) ** 2 <= 1) return 2;
  if (((x - cx) / 183) ** 2 + ((y - cy) / 232) ** 2 <= 1) return 1;
  if (Math.abs(x - cx) <= 75 && y >= cy + 150 && y <= cy + 420) return 1;
  return 0;
};

// One take as a frame (PPM) and as the person alone on transparent (PAM), 4x supersampled.
const SAMPLES = [
  [0.25, 0.25],
  [0.75, 0.25],
  [0.25, 0.75],
  [0.75, 0.75],
];
const drawTake = ({ dx, dy }, i) => {
  const cx = 540 + dx;
  const cy = 565 + dy;
  const frame = Buffer.alloc(W * H * 3);
  const cutout = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const bg = wall(x, y);
      let [r, g, b, pr, pg, pb, n] = [0, 0, 0, 0, 0, 0, 0];
      for (const [sx, sy] of SAMPLES) {
        const k = region(x + sx, y + sy, cx, cy);
        const c = k === 2 ? BODY : k === 1 ? SKIN : bg;
        r += c[0];
        g += c[1];
        b += c[2];
        if (k) {
          pr += c[0];
          pg += c[1];
          pb += c[2];
          n++;
        }
      }
      const p = y * W + x;
      frame[p * 3] = Math.round(r / 4);
      frame[p * 3 + 1] = Math.round(g / 4);
      frame[p * 3 + 2] = Math.round(b / 4);
      cutout[p * 4] = n ? Math.round(pr / n) : 0;
      cutout[p * 4 + 1] = n ? Math.round(pg / n) : 0;
      cutout[p * 4 + 2] = n ? Math.round(pb / n) : 0;
      cutout[p * 4 + 3] = Math.round((255 * n) / 4);
    }
  }
  const ppm = path.join(work, `take${i}.ppm`);
  const pam = path.join(work, `take${i}.pam`);
  fs.writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), frame]));
  fs.writeFileSync(pam, Buffer.concat([Buffer.from(`P7\nWIDTH ${W}\nHEIGHT ${H}\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n`), cutout]));
  return { ppm, pam, frames: (TAKES[i + 1]?.from ?? TOTAL) - TAKES[i].from };
};
const takes = TAKES.map(drawTake);

// Each take's still, held for its frames, then all of them in a row.
const sequence = (key, format) => {
  const inputs = takes.flatMap((t) => ["-loop", "1", "-framerate", String(FPS), "-i", t[key]]);
  const trims = takes.map((t, i) => `[${i}:v]trim=end_frame=${t.frames},setpts=PTS-STARTPTS[v${i}]`);
  const joined = `${takes.map((_, i) => `[v${i}]`).join("")}concat=n=${takes.length}:v=1:a=0,format=${format}[v]`;
  return { inputs, filter: [...trims, joined].join(";") };
};

// ---- Voice

// The script, one sentence per take, each with the span its words take in captions.json.
const sentences = [];
let words = [];
for (const c of captions) {
  words.push(c);
  if (/[.?!]$/.test(c.text.trim())) {
    sentences.push(words);
    words = [];
  }
}
if (words.length) sentences.push(words);

// atempo takes factors between 0.5 and 2, so bigger changes are chained.
const atempo = (factor) => {
  const parts = [];
  let f = factor;
  while (f > 2) {
    parts.push(2);
    f /= 2;
  }
  while (f < 0.5) {
    parts.push(0.5);
    f /= 0.5;
  }
  parts.push(f);
  return parts.map((p) => `atempo=${p.toFixed(4)}`).join(",");
};

const voice = path.join(work, "voice.wav");
const trimSilence = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse";
if (has("say")) {
  const parts = sentences.map((ws, i) => {
    const text = ws.map((w) => w.text.trim()).join(" ");
    const said = path.join(work, `line${i}.aiff`);
    const trimmed = path.join(work, `line${i}.wav`);
    execFileSync("say", ["-o", said, text]);
    ff(["-i", said, "-af", trimSilence, "-ac", "1", "-ar", "48000", trimmed]);
    const start = ws[0].startMs;
    const span = (ws[ws.length - 1].endMs - start) / 1000;
    return { file: trimmed, start, tempo: durationOf(trimmed) / span };
  });
  const chains = parts.map((p, i) => `[${i}:a]${atempo(p.tempo)},adelay=delays=${p.start}:all=1[a${i}]`);
  const mix = `${parts.map((_, i) => `[a${i}]`).join("")}amix=inputs=${parts.length}:normalize=0,apad,atrim=0:${footage.durationSec},loudnorm=I=-14:TP=-1.5:LRA=11[a]`;
  ff([...parts.flatMap((p) => ["-i", p.file]), "-filter_complex", [...chains, mix].join(";"), "-map", "[a]", "-ac", "1", "-ar", "48000", voice]);
} else {
  console.warn("No `say` here (it's macOS only), so the starter's footage will be silent.");
  ff(["-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", String(footage.durationSec), voice]);
}

// ---- Files

const video = sequence("ppm", "yuv420p");
ff([
  ...video.inputs,
  "-i", voice,
  "-filter_complex", video.filter,
  "-map", "[v]", "-map", `${takes.length}:a`,
  "-r", String(FPS), "-t", String(footage.durationSec),
  "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
  "-movflags", "+faststart",
  path.join(pub, "aroll.mp4"),
]);

const person = sequence("pam", "yuva420p");
ff([
  ...person.inputs,
  "-filter_complex", person.filter,
  "-map", "[v]",
  "-r", String(FPS), "-t", String(footage.durationSec),
  "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-crf", "24", "-b:v", "0", "-row-mt", "1", "-cpu-used", "4", "-an",
  path.join(pub, "cutout.webm"),
]);

ff(["-i", takes[takes.length - 1].ppm, "-frames:v", "1", path.join(pub, "aroll-last.png")]);

// ---- Sound effects

// Each one is made, then set so its loudest moment sits at -3 dBFS.
const SFX = {
  // A marker pen squeaking on.
  marker: ["anoisesrc=c=white:r=48000:a=0.8:d=0.16:seed=3", "bandpass=f=2800:width_type=q:w=2.5,tremolo=f=30:d=0.5,afade=t=in:d=0.02,afade=t=out:st=0.09:d=0.07"],
  // A quick swish for a hook landing.
  whip: ["anoisesrc=c=white:r=48000:a=0.9:d=0.18:seed=5", "highpass=f=1500,afade=t=in:d=0.015,afade=t=out:st=0.03:d=0.15:curve=exp"],
  // Air moving, for a panel sliding in.
  whoosh: ["anoisesrc=c=pink:r=48000:a=0.9:d=0.35:seed=7", "highpass=f=300,lowpass=f=3500,afade=t=in:d=0.16:curve=qsin,afade=t=out:st=0.16:d=0.19:curve=qsin"],
  // Fast back-and-forth strokes, for a scribble wipe.
  scribble: ["anoisesrc=c=white:r=48000:a=0.8:d=0.42:seed=9", "bandpass=f=1800:width_type=q:w=1.2,tremolo=f=13:d=0.85,afade=t=in:d=0.03,afade=t=out:st=0.32:d=0.1"],
  // A bell, for the sign-off.
  ding: [
    "aevalsrc=exprs='0.5*sin(2*PI*1318.5*t)*exp(-5*t)+0.2*sin(2*PI*2637*t)*exp(-9*t)+0.1*sin(2*PI*3955.5*t)*exp(-13*t)':s=48000:d=1.2",
    "afade=t=in:d=0.004",
  ],
};
for (const [name, [source, filter]] of Object.entries(SFX)) {
  const raw = path.join(work, `${name}.wav`);
  ff(["-f", "lavfi", "-i", source, "-af", filter, "-ac", "1", "-ar", "48000", raw]);
  const { stderr } = spawnSync("ffmpeg", ["-hide_banner", "-i", raw, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const peak = Number(stderr.match(/max_volume: (-?[\d.]+) dB/)?.[1] ?? 0);
  ff(["-i", raw, "-af", `volume=${(-3 - peak).toFixed(2)}dB`, "-c:a", "pcm_s16le", path.join(sfxDir, `${name}.wav`)]);
}

fs.rmSync(work, { recursive: true, force: true });
console.log("Wrote public/starter/aroll.mp4, aroll-last.png, cutout.webm");
console.log(`Wrote public/sfx/${Object.keys(SFX).join(".wav, ")}.wav`);
console.log("Next: npm run dev to open the Studio, or ./render.sh starter final");
