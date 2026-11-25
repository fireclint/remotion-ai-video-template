// Word-level transcript of a video's A-roll, so graphics can sync to the exact words.
//   node scripts/transcribe.mjs <video>
// First run downloads whisper.cpp and the medium.en model (~1.5 GB) into ./whisper.cpp.
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from "@remotion/install-whisper-cpp";
import fs from "node:fs";
import path from "node:path";

const video = process.argv[2];
if (!video) {
  console.error("Usage: node scripts/transcribe.mjs <video>");
  process.exit(1);
}

const VERSION = "1.5.5";
const MODEL = "medium.en";
const whisperPath = path.join(process.cwd(), "whisper.cpp");

await installWhisperCpp({ to: whisperPath, version: VERSION });
await downloadWhisperModel({ model: MODEL, folder: whisperPath });

const whisperCppOutput = await transcribe({
  model: MODEL,
  whisperPath,
  whisperCppVersion: VERSION,
  inputPath: path.join(process.cwd(), `.cache/${video}-16k.wav`),
  tokenLevelTimestamps: true,
});

const { captions } = toCaptions({ whisperCppOutput });

// Raw output is kept separate: captions.json is the hand-checked copy the video reads.
fs.mkdirSync(`src/${video}/data`, { recursive: true });
fs.writeFileSync(`src/${video}/data/captions.raw.json`, JSON.stringify(captions, null, 2));
for (const c of captions) {
  console.log(`${(c.startMs / 1000).toFixed(2).padStart(6)}  ${c.text}`);
}
