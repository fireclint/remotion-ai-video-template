import type { Caption } from "@remotion/captions";
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp } from "./anim";
import { C, fontFamily } from "./theme";
import { joinShadows } from "./Stage";
import { outline } from "./ui";

type Word = { text: string; from: number; to: number };
type Page = { from: number; to: number; words: Word[] };
export type Window = { from: number; to: number };

// 2-4 words a page, on one line.
const MIN_WORDS = 2;
const MAX_WORDS = 4;
// About what fits on one line at FONT_SIZE inside the frame's side margins.
const MAX_CHARS = 21;
// A pause longer than this (seconds) ends a page.
const MAX_GAP = 0.45;
const FONT_SIZE = 74;
// A page shouldn't end on one of these if the next word can start the next page instead.
const WEAK = new Set(["a", "an", "the", "to", "of", "in", "on", "for", "and", "or", "if", "your", "you", "any", "it", "it's", "this", "that", "that's", "so", "is", "go", "my", "with", "at", "by", "but"]);

// Trailing punctuation goes; commas inside numbers ("1,500") and apostrophes stay.
const clean = (s: string) => s.trim().replace(/[.,:;]+$/, "");
const endsSentence = (s: string) => /[.?!]["”]?$/.test(s.trim());
const endsClause = (s: string) => /[,:;]$/.test(s.trim());

export const buildPages = (captions: Caption[]): Page[] => {
  const pages: Page[] = [];
  let line: Caption[] = [];
  const chars = (ws: Caption[]) => ws.reduce((a, w) => a + clean(w.text).length + 1, -1);
  const flush = () => {
    if (!line.length) return;
    pages.push({
      from: line[0].startMs / 1000,
      to: line[line.length - 1].endMs / 1000,
      words: line.map((w) => ({ text: clean(w.text), from: w.startMs / 1000, to: w.endMs / 1000 })),
    });
    line = [];
  };
  captions.forEach((word, i) => {
    const text = clean(word.text);
    const length = chars(line) + 1 + text.length;
    const gap = line.length ? word.startMs / 1000 - line[line.length - 1].endMs / 1000 : 0;
    if (line.length && (line.length >= MAX_WORDS || length > MAX_CHARS || gap > MAX_GAP)) {
      // A short word that ends the sentence is better squeezed on than left alone on its own page.
      const squeeze = gap <= MAX_GAP && endsSentence(word.text) && text.length <= 4 && line.length < MAX_WORDS && length <= MAX_CHARS + 3;
      if (squeeze) {
        line.push(word);
        flush();
        return;
      }
      const last = line[line.length - 1];
      if (line.length > MIN_WORDS && WEAK.has(clean(last.text).toLowerCase())) {
        // Hand a weak last word over to the new page.
        line.pop();
        flush();
        line = [last];
      } else {
        flush();
      }
    }
    line.push(word);
    const isLast = i === captions.length - 1;
    if (!isLast && (endsSentence(word.text) || (endsClause(word.text) && line.length >= MIN_WORDS))) flush();
  });
  flush();
  return pages;
};

// Captions: the headline font in bold, text color with a thin dark outline, the word being said in the accent.
// `top` can follow the layout (see captionTop in layout.tsx), so captions sit in the split panel during SPLIT.
export const MarkerCaptions: React.FC<{ captions: Caption[]; off: Window[]; top: number | ((t: number) => number) }> = ({
  captions,
  off,
  top,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = useMemo(() => buildPages(captions), [captions]);
  const t = frame / fps;
  if (off.some((w) => t >= w.from && t < w.to)) return null;

  const index = pages.filter((p) => t >= p.from).length - 1;
  if (index < 0) return null;
  const page = pages[index];
  const next = pages[index + 1];
  // A page stays up through a short pause, then gets out of the way.
  if (t > page.to + 0.4 && (!next || t < next.from)) return null;
  // A page that began while captions were off stays off, rather than flashing up at the end.
  if (off.some((w) => page.from >= w.from && page.from < w.to)) return null;

  const pop = interpolate(t, [page.from, page.from + 0.1], [0.92, 1], clamp);
  const y = typeof top === "function" ? top(t) : top;

  return (
    <div
      style={{
        position: "absolute",
        left: 30,
        right: 30,
        top: y,
        display: "flex",
        justifyContent: "center",
        columnGap: FONT_SIZE * 0.24,
        fontFamily,
        fontSize: FONT_SIZE,
        fontWeight: 700,
        letterSpacing: -FONT_SIZE * 0.01,
        lineHeight: 1.12,
        whiteSpace: "nowrap",
        transform: `scale(${pop})`,
      }}
    >
      {page.words.map((w, i) => {
        const on = t >= w.from && (t < w.to || (i === page.words.length - 1 && t < page.to + 0.25));
        return (
          <span key={i} style={{ color: on ? C.accent : C.text, textShadow: joinShadows(outline(4.5), `0 5px 0 ${C.bg}`) }}>
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
