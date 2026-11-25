import { Easing, interpolate } from "remotion";

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// House motion: fast and crisp. Entrances settle with very little overshoot, exits take 6-8 frames
// (EXIT), and nothing drifts or floats while it waits.
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const OVERSHOOT = Easing.bezier(0.25, 1.2, 0.5, 1);
export const EASE_IN = Easing.in(Easing.cubic);
export const EXIT = 7;

// 0 → 1 over [start, start + dur] frames.
export const ramp = (
  frame: number,
  start: number,
  dur: number,
  easing: (t: number) => number = EASE_OUT,
) =>
  interpolate(frame, [start, start + Math.max(dur, 1)], [0, 1], {
    ...clamp,
    easing,
  });

// Decaying horizontal shake for impacts.
export const shake = (frame: number, start: number, amp = 14, dur = 12) => {
  const t = frame - start;
  if (t < 0 || t > dur) return 0;
  return Math.sin(t * 2.4) * amp * (1 - t / dur);
};

// 1 while on screen, falling to 0 over the last `dur` frames of the clip.
export const outro = (frame: number, total: number, dur = 7) =>
  1 -
  interpolate(frame, [total - dur, total], [0, 1], {
    ...clamp,
    easing: EASE_IN,
  });
