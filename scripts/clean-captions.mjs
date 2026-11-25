// Whisper output → the word list a video's video reads (src/<video>/data/).
//   node scripts/clean-captions.mjs <video>
// Merges sub-word tokens ("Java"+"Script", "there"+"'s", trailing punctuation) into whole words,
// applies src/<video>/data/fixes.json so the captions match the script, and records the A-roll duration.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const video = process.argv[2];
if (!video) {
  console.error("Usage: node scripts/clean-captions.mjs <video>");
  process.exit(1);
}
const data = `src/${video}/data`;

// Spots where Whisper misheard and the script says otherwise, e.g.
//   [{ "from": ["You", "spend"], "to": ["You've", "spent"] }]
// `from` is matched against whole words (case-insensitive, punctuation ignored).
const FIXES = fs.existsSync(`${data}/fixes.json`) ? JSON.parse(fs.readFileSync(`${data}/fixes.json`, "utf8")) : [];

const raw = JSON.parse(fs.readFileSync(`${data}/captions.raw.json`, "utf8"));

const words = [];
for (const t of raw) {
  const startsWord = /^\s/.test(t.text) || words.length === 0;
  if (startsWord) {
    words.push({ ...t, text: t.text.trim() });
  } else {
    const prev = words[words.length - 1];
    prev.text += t.text;
    prev.endMs = Math.max(prev.endMs, t.endMs);
  }
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
for (const fix of FIXES) {
  const i = words.findIndex((_, k) => fix.from.every((f, j) => words[k + j] && norm(words[k + j].text) === norm(f)));
  if (i < 0) {
    console.warn(`Fix not applied, phrase not found: ${fix.from.join(" ")}`);
    continue;
  }
  const span = words.slice(i, i + fix.from.length);
  const start = span[0].startMs;
  const end = span[span.length - 1].endMs;
  // Keep the original word's punctuation on the last replacement word.
  const trailing = span[span.length - 1].text.match(/[^A-Za-z0-9']+$/)?.[0] ?? "";
  // Word for word, each word keeps its own timing; otherwise the new words share the span evenly.
  const sameLength = fix.to.length === span.length;
  const step = (end - start) / fix.to.length;
  const replaced = fix.to.map((text, j) => ({
    text: j === fix.to.length - 1 && !/[^A-Za-z0-9']$/.test(text) ? text + trailing : text,
    startMs: sameLength ? span[j].startMs : Math.round(start + step * j),
    endMs: sameLength ? span[j].endMs : Math.round(start + step * (j + 1)),
    timestampMs: null,
    confidence: null,
  }));
  words.splice(i, fix.from.length, ...replaced);
}

// @remotion/captions expects a leading space on every word after the first.
const captions = words.map((w, i) => ({ ...w, text: (i === 0 ? "" : " ") + w.text }));

const duration = Number(
  execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `public/${video}/aroll.mp4`]).toString(),
);

fs.writeFileSync(`${data}/captions.json`, JSON.stringify(captions, null, 2));
fs.writeFileSync(
  `${data}/footage.json`,
  JSON.stringify({ src: `${video}/aroll.mp4`, still: `${video}/aroll-last.png`, durationSec: duration }, null, 2),
);

console.log(captions.map((c) => c.text.trim()).join(" "));
console.log(`${captions.length} words, A-roll ${duration.toFixed(2)}s`);
