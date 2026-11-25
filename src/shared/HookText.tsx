import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { EASE_IN, EASE_OUT, EXIT, clamp, ramp, shake } from "./anim";
import { Stage, bgSchema, joinShadows } from "./Stage";
import { C, MONO, fontFamily } from "./theme";
import { outline } from "./ui";

export const hookTextSchema = z.object({
  bg: bgSchema,
  // One to three huge words; longer text shrinks to fit. "\n" forces a line break.
  text: z.string(),
  color: z.string().optional(),
  // A small mono line under it, such as "1 day left".
  sub: z.string().optional(),
  // Where the middle of the words sits, in frame pixels. The default is below a speaker's chin.
  y: z.number().optional(),
  // Largest font size to use.
  maxSize: z.number().optional(),
});

// Rough advance widths of a heavy (900) sans-serif, in ems, so text can be sized without measuring it.
// If your headline font runs much wider or narrower, scale these.
const charWidth = (ch: string) => {
  if (ch === " ") return 0.24;
  if (/[0-9]/.test(ch)) return 0.62;
  if (/[MW]/.test(ch)) return 0.9;
  if (/[A-Z]/.test(ch)) return 0.68;
  if (/[mw]/.test(ch)) return 0.84;
  if (/[iljtf'.,!:;|]/.test(ch)) return 0.32;
  if (/[a-z]/.test(ch)) return 0.56;
  return 0.62;
};
const widthEm = (s: string) => [...s].reduce((a, ch) => a + charWidth(ch), 0);

const MAX_WIDTH = 940;
const MAX_HEIGHT = 660;
const LINE = 0.98;

// The split into one to three lines that allows the biggest type.
export const fitHook = (text: string, maxSize: number) => {
  const sizeFor = (lines: string[]) =>
    Math.min(maxSize, MAX_WIDTH / Math.max(...lines.map(widthEm)), MAX_HEIGHT / (lines.length * LINE));
  if (text.includes("\n")) {
    const lines = text.split("\n");
    return { lines, size: sizeFor(lines) };
  }
  const words = text.split(/\s+/).filter(Boolean);
  const options: string[][] = [[words.join(" ")]];
  for (let i = 1; i < words.length; i++) {
    options.push([words.slice(0, i).join(" "), words.slice(i).join(" ")]);
    for (let j = i + 1; j < words.length; j++) {
      options.push([words.slice(0, i).join(" "), words.slice(i, j).join(" "), words.slice(j).join(" ")]);
    }
  }
  // Another line only wins if it makes the type clearly bigger.
  return options.reduce(
    (best, lines) => {
      const size = sizeFor(lines);
      return size > best.size * (1 + 0.12 * (lines.length - best.lines.length)) ? { lines, size } : best;
    },
    { lines: options[0], size: sizeFor(options[0]) },
  );
};

// One to three huge words that slam in on a cue and hold until the clip ends.
export const HookText: React.FC<z.infer<typeof hookTextSchema>> = ({ bg, text, color = C.accent, sub, y = 1030, maxSize = 560 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { lines, size } = fitHook(text, maxSize);

  // Falls onto the frame, lands with a small squash and a jolt, then holds still.
  const fall = interpolate(frame, [0, 4], [1.75, 1], { ...clamp, easing: EASE_IN });
  const squash = frame >= 4 ? 1 - 0.05 * Math.sin(interpolate(frame, [4, 9], [0, 1], clamp) * Math.PI) : 1;
  const jolt = shake(frame, 4, 9, 8);
  const exit = ramp(frame, durationInFrames - EXIT, EXIT, EASE_IN);
  const opacity = ramp(frame, 0, 2) * (1 - exit);
  const subIn = ramp(frame, 8, 6, EASE_OUT) * (1 - exit);

  return (
    <Stage bg={bg}>
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: y,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transform: `translate(${jolt}px, -50%) scale(${fall * squash * (1 - 0.08 * exit)})`,
            opacity,
          }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily,
                fontSize: size,
                fontWeight: 900,
                lineHeight: LINE,
                letterSpacing: -size * 0.03,
                color,
                whiteSpace: "pre",
                textShadow: joinShadows(outline(Math.max(4, size * 0.03)), `0 ${Math.max(5, size * 0.04)}px 0 ${C.bg}`),
              }}
            >
              {line}
            </div>
          ))}
          {sub ? (
            <div
              style={{
                marginTop: 28,
                fontFamily: MONO,
                fontSize: 50,
                fontWeight: 600,
                color: C.text,
                background: C.bg,
                padding: "10px 26px",
                borderRadius: 12,
                opacity: subIn,
                transform: `translateY(${(1 - subIn) * 18}px)`,
              }}
            >
              {sub}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
