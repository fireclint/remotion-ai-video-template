import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { EASE_OUT, clamp, ramp } from "./anim";
import { Stage, bgSchema } from "./Stage";
import { C } from "./theme";

const box = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });

export const receiptsSchema = z.object({
  bg: bgSchema,
  // Two real article screenshots, already cropped to text only (no logos, no article photos), and their
  // sizes in pixels. The first is shown big; the second slides in under it, smaller.
  main: z.object({ src: z.string(), w: z.number(), h: z.number() }),
  second: z.object({ src: z.string(), w: z.number(), h: z.number() }),
  // In each image's own pixels: an accent underline under the headline words, and highlights over the
  // second's key phrase (one box per line).
  underline: box,
  highlights: z.array(box),
  // Seconds into the clip: the underline, the second clipping arriving, and its highlight.
  underlineAt: z.number(),
  secondAt: z.number(),
  highlightAt: z.number(),
});

const TOP = 346;
const BOTTOM = 878;
const GAP = 16;

const sweep = (t: number, at: number, dur: number) => interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });

// Receipts on the split panel: the headline of a real report, big, with its key words underlined, then a
// second outlet's clipping sliding in under it, smaller, its key phrase highlighted as it's said. The
// first shrinks to make room, keeping its headline readable. It changes over to the next graphic on a
// cut, so it has no exit of its own.
export const Receipts: React.FC<z.infer<typeof receiptsSchema>> = ({ bg, main, second, underline, highlights, underlineAt, secondAt, highlightAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const mainIn = ramp(frame, 0, 9, EASE_OUT);
  const secondIn = ramp(frame, secondAt * fps, 10, EASE_OUT);
  // The first clipping fills the panel (or sits in its middle, if it's short), then shrinks and moves up
  // to leave room for the second. The pair stays centred in the panel when it doesn't fill it.
  const area = BOTTOM - TOP;
  const roomFor = second.h + GAP;
  const fullScale = Math.min(1, area / main.h, 940 / main.w);
  const smallScale = Math.min(fullScale, (area - roomFor) / main.h);
  const scale = interpolate(secondIn, [0, 1], [fullScale, smallScale]);
  const mainW = main.w * scale;
  const mainH = main.h * scale;
  const aloneTop = TOP + (area - main.h * fullScale) / 2;
  const pairTop = TOP + (area - (main.h * smallScale + roomFor)) / 2;
  const mainTop = interpolate(secondIn, [0, 1], [aloneTop, pairTop]);
  const secondTop = pairTop + main.h * smallScale + GAP;
  const u = sweep(t, underlineAt, 0.3);

  return (
    <Stage bg={bg}>
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: (1080 - mainW) / 2,
            top: mainTop + (1 - mainIn) * 40,
            width: mainW,
            height: mainH,
            borderRadius: 16,
            overflow: "hidden",
            border: `3px solid ${C.line}`,
            boxSizing: "content-box",
            opacity: mainIn,
          }}
        >
          <Img src={staticFile(main.src)} style={{ width: "100%", height: "100%", display: "block" }} />
          <div
            style={{
              position: "absolute",
              left: underline.x * scale,
              top: underline.y * scale,
              width: underline.w * scale * u,
              height: Math.max(6, underline.h * scale),
              borderRadius: 4,
              background: C.accent,
            }}
          />
        </div>

        {secondIn > 0 ? (
          <div
            style={{
              position: "absolute",
              left: (1080 - second.w) / 2,
              top: secondTop + (1 - secondIn) * 80,
              width: second.w,
              height: second.h,
              borderRadius: 14,
              overflow: "hidden",
              border: `4px solid ${C.bg}`,
              outline: `3px solid ${C.line}`,
              // White under the screenshot, so the multiplied highlight reads like a highlighter pen.
              background: "#FFFFFF",
              isolation: "isolate",
              opacity: Math.min(1, secondIn * 2),
            }}
          >
            {highlights.map((h, i) => {
              const p = sweep(t, highlightAt + i * 0.25, 0.28);
              return p > 0 ? <div key={i} style={{ position: "absolute", left: h.x, top: h.y, width: h.w * p, height: h.h, background: C.accentLight, opacity: 0.45, borderRadius: 4 }} /> : null;
            })}
            <Img src={staticFile(second.src)} style={{ position: "relative", width: "100%", height: "100%", display: "block", mixBlendMode: "multiply" }} />
          </div>
        ) : null}
      </AbsoluteFill>
    </Stage>
  );
};
