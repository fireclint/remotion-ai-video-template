import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_OUT, clamp } from "./anim";
import { C, SAFE_TOP } from "./theme";

// The three layouts a beat can switch between on a cue:
//   face  - the speaker full-frame.
//   split - a graphic in the top half; the footage slides down so the speaker stays visible below it.
//   full  - a full-screen insert (an "insert" graphic in the plan) while the speaker's audio keeps playing.
// A plan lists the switches in LAYOUT, each holding until the next. Times are seconds into the footage.
export type Mode = "face" | "split" | "full";
// `instant` makes a FACE <-> SPLIT switch happen on one frame, for one hidden at a scribble wipe's midpoint.
export type Layout = { at: number; mode: Mode; instant?: boolean }[];

// Where things go in SPLIT, in frame pixels.
export const SPLIT = {
  // The panel covers the frame from the top down to here.
  panel: 990,
  // A split graphic's content area: below the source line, above the captions.
  top: SAFE_TOP + 70,
  bottom: 880,
  // Captions sit inside the panel, under the graphic.
  captionTop: 896,
  // A SourceTag moves to the panel's top-left.
  sourceTop: SAFE_TOP + 14,
};

// How far the footage slides down in SPLIT. Tune it per video so the top of the head lands just
// under the panel: about SPLIT.panel + 40 minus where the head starts in the footage.
export const SPLIT_SHIFT = 680;

// Frames a FACE <-> SPLIT change takes.
export const LAYOUT_MOVE = 7;

export const modeAt = (layout: Layout, t: number): Mode => {
  let mode: Mode = "face";
  for (const k of layout) if (t >= k.at) mode = k.mode;
  return mode;
};

// Each run of one mode as { from, to } in seconds; the last one runs to `end`.
export const runs = (layout: Layout, mode: Mode, end = Infinity) =>
  layout.flatMap((k, i) => (k.mode === mode ? [{ from: k.at, to: layout[i + 1]?.at ?? end }] : []));

// Start and length of the `nth` run of a mode, to place a full-screen insert exactly over it.
export const span = (layout: Layout, mode: Mode, nth: number, end: number) => {
  const r = runs(layout, mode, end)[nth];
  if (!r) throw new Error(`The layout has no ${mode} run number ${nth}`);
  return { start: r.from, seconds: r.to - r.from };
};

// What the footage does at each switch. A full-screen insert hides everything under it, so the change
// to whatever follows it happens out of sight, halfway through the insert.
const moves = (layout: Layout) =>
  layout.map((k, i) => {
    if (k.mode !== "full") return { at: k.at, to: k.mode === "split" ? 1 : 0, instant: k.instant ?? false };
    const next = layout.slice(i + 1).find((n) => n.mode !== "full");
    const end = layout[i + 1]?.at;
    return { at: end === undefined ? k.at + 0.5 : (k.at + end) / 2, to: next?.mode === "split" ? 1 : 0, instant: true };
  });

// 0 in FACE, 1 in SPLIT, easing between them over LAYOUT_MOVE frames.
export const splitAmount = (layout: Layout, frame: number, fps: number) => {
  let v = 0;
  for (const m of moves(layout)) {
    const f = m.at * fps;
    if (frame < f) break;
    v = m.instant ? m.to : interpolate(frame, [f, f + LAYOUT_MOVE], [v, m.to], { ...clamp, easing: EASE_OUT });
  }
  return v;
};

// Caption position that follows the layout: on the chest in FACE, inside the panel in SPLIT.
export const captionTop = (layout: Layout, faceTop: number, fps: number) => (t: number) =>
  interpolate(splitAmount(layout, t * fps, fps), [0, 1], [faceTop, SPLIT.captionTop]);

const useSplit = (layout: Layout) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return splitAmount(layout, frame, fps);
};

// Wrap the footage and the speaker's cutout in this (both, or they come apart) to slide them down in SPLIT.
export const SplitShift: React.FC<{ layout: Layout; shift: number; children: React.ReactNode }> = ({ layout, shift, children }) => {
  const a = useSplit(layout);
  return <AbsoluteFill style={{ transform: a ? `translateY(${a * shift}px)` : undefined }}>{children}</AbsoluteFill>;
};

// The panel a split graphic sits on, in the background color, with an accent rule along its bottom edge.
export const SplitPanel: React.FC<{ layout: Layout }> = ({ layout }) => {
  const a = useSplit(layout);
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: SPLIT.panel, background: C.bg, transform: `translateY(${(a - 1) * SPLIT.panel}px)` }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: C.accent }} />
    </div>
  );
};

// Graphics drawn on the split panel go in this, so they slide in and out with it.
export const PanelSlide: React.FC<{ layout: Layout; children: React.ReactNode }> = ({ layout, children }) => {
  const a = useSplit(layout);
  return <AbsoluteFill style={{ transform: a < 1 ? `translateY(${(a - 1) * SPLIT.panel}px)` : undefined }}>{children}</AbsoluteFill>;
};
