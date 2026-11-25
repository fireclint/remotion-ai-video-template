import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_IN, EASE_OUT, ramp } from "./anim";
import { C, FPS, fontFamily } from "./theme";

// Full-screen covers take over the frame, and can hide footage that must not show (say, an API key in a screen recording).
// They wipe in over their first COVER_ENTER frames and out over their last COVER_EXIT frames,
// and are fully opaque in between.
export const COVER_ENTER = 4;
export const COVER_EXIT = 6;

export type FrameRange = { from: number; to: number };
type Wipe = "iris" | "shutter" | "slide" | "rise" | "sweep";

export const Cover: React.FC<{
  wipe: Wipe;
  background: string;
  leave?: boolean;
  // "sweep" only: color of the line at the wipe's edge, like a monitor's sweep bar.
  edge?: string;
  children: React.ReactNode;
}> = ({ wipe, background, leave = true, edge, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const enter = ramp(frame, 0, COVER_ENTER, EASE_OUT);
  // The end card stays put through its last frame.
  const exit = leave ? ramp(frame, durationInFrames - COVER_EXIT, COVER_EXIT, EASE_IN) : 0;
  // Once fully in, nothing is clipped or moved, so no footage can show through.
  const settled = enter >= 1 && exit <= 0;

  let style: React.CSSProperties = {};
  if (!settled) {
    const open = enter * (1 - exit);
    if (wipe === "iris") {
      style = { clipPath: `circle(${open * 80}% at 50% 45%)` };
    } else if (wipe === "shutter") {
      style = { clipPath: `inset(${(1 - open) * 50}% 0 ${(1 - open) * 50}% 0)` };
    } else if (wipe === "slide") {
      // In from the right, out to the left.
      style = { transform: `translateX(${(1 - enter) * 100 - exit * 100}%)` };
    } else if (wipe === "sweep") {
      // Drawn in from the left and wiped away to the right.
      style = { clipPath: `inset(0 ${(1 - enter) * 100}% 0 ${exit * 100}%)` };
    } else {
      // Up from the bottom, out the top.
      style = { transform: `translateY(${(1 - enter) * 100 - exit * 100}%)` };
    }
  }

  const edgeAt = enter < 1 ? enter : exit;
  return (
    <>
      <AbsoluteFill style={{ background, fontFamily, color: C.text, overflow: "hidden", ...style }}>{children}</AbsoluteFill>
      {wipe === "sweep" && edge && !settled ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `calc(${edgeAt * 100}% - 4px)`,
            width: 8,
            background: edge,
          }}
        />
      ) : null}
    </>
  );
};

// A cover for a range of frames (`to` = first frame after it): starts a frame early and leaves
// a frame late, so its wipes never touch a frame in the range.
export const coverSpan = ({ from, to }: FrameRange) => {
  const s = from - COVER_ENTER - 1;
  const e = to + 1 + COVER_EXIT;
  return { start: s / FPS, seconds: (e - s) / FPS };
};

// Safety net, run when a video's plan loads: every range must sit inside some insert's fully
// opaque middle, or rendering stops.
export const assertCovered = (ranges: FrameRange[], gfx: Record<string, { kind: string; start: number; seconds: number }>) => {
  for (const r of ranges) {
    const covered = Object.values(gfx).some((g) => {
      if (g.kind !== "insert") return false;
      const s = Math.round(g.start * FPS);
      const e = s + Math.round(g.seconds * FPS);
      return s + COVER_ENTER <= r.from && e - COVER_EXIT >= r.to;
    });
    if (!covered) throw new Error(`Frames ${r.from}–${r.to - 1} must be covered but are not`);
  }
};
