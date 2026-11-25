import type { Caption } from "@remotion/captions";

// A video's edited cut, as written by scripts/clean-captions.mjs into src/<video>/data/footage.json.
export type Footage = { src: string; still: string; durationSec: number };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");

// Phrase lookups into a word-level transcript. Everything in a video's plan hangs off these,
// so a new take re-syncs itself once the transcript is regenerated.
export const makeCues = (captions: Caption[]) => {
  const words = captions.map((c) => norm(c.text));

  const find = (phrase: string, nth: number) => {
    const target = phrase.split(/\s+/).map(norm).filter(Boolean);
    let seen = 0;
    for (let i = 0; i <= words.length - target.length; i++) {
      if (target.every((t, j) => words[i + j] === t)) {
        if (seen === nth) return { i, len: target.length };
        seen++;
      }
    }
    throw new Error(`Cue phrase not found in the transcript: "${phrase}"`);
  };

  // Seconds into the A-roll when `phrase` starts.
  const at = (phrase: string, nth = 0) => captions[find(phrase, nth).i].startMs / 1000;

  // Seconds when `phrase` finishes.
  const endOf = (phrase: string, nth = 0) => {
    const { i, len } = find(phrase, nth);
    return captions[i + len - 1].endMs / 1000;
  };

  // A cut between takes, measured with scripts/find-cuts.mjs, checked to sit just before the first words
  // of its take (Whisper can start a word a little early, hence the slack). If a re-edit moves the cut,
  // the render stops and says so: re-run find-cuts and update the number.
  const cutBefore = (seconds: number, firstWords: string, nth = 0) => {
    const gap = at(firstWords, nth) - seconds;
    if (gap < -0.25 || gap > 0.6) throw new Error(`The cut at ${seconds}s isn't just before "${firstWords}". Re-run scripts/find-cuts.mjs`);
    return seconds;
  };

  return { at, endOf, cutBefore };
};
