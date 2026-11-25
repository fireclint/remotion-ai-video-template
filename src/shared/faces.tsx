import React from "react";
import { OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { OVERSHOOT, ramp } from "./anim";
import type { Footage } from "./cues";

// Written by scripts/track-face.mjs: the face box ([cx, cy, w, h] in 1080×1920 pixels) sampled `fps` times a second.
export type FaceData = { fps: number; boxes: ([number, number, number, number] | null)[] };
export type Face = { cx: number; cy: number; h: number };

// Face position at `t` seconds, smoothed over ±0.3s but never across a cut,
// so a bubble doesn't drift between shots.
export const makeFaceTrack =
  (data: FaceData, cuts: number[]) =>
  (t: number): Face | null => {
    const shotStart = Math.max(0, ...cuts.filter((c) => c <= t));
    const later = cuts.filter((c) => c > t);
    const shotEnd = later.length ? Math.min(...later) : Infinity;
    const center = t * data.fps;
    let x = 0;
    let y = 0;
    let h = 0;
    let weight = 0;
    for (let k = Math.floor(center) - 3; k <= Math.ceil(center) + 3; k++) {
      const b = data.boxes[k];
      const tk = k / data.fps;
      // Samples right at a cut can land on either shot, so they're skipped.
      if (!b || tk < shotStart + 0.05 || tk > shotEnd - 0.05) continue;
      const w = 1 / (1 + Math.abs(k - center));
      x += b[0] * w;
      y += b[1] * w;
      h += b[3] * w;
      weight += w;
    }
    return weight ? { cx: x / weight, cy: y / weight, h: h / weight } : null;
  };

type BubbleProps = {
  footage: Footage;
  // The person cut out of the footage (scripts/cutout.mjs). With it, nothing that was behind
  // them shows, and their head breaks out over the top of the ring.
  cutout?: string;
  track: (t: number) => Face | null;
  x: number;
  y: number;
  size: number;
  // How many face-heights fit across the circle.
  span: number;
  // Shows through the feathered rim.
  background: string;
  ring: string;
};

// Circle-cropped copy of the footage that follows the face, for full-screen covers.
// Without a cutout, the rim fades out so little of what's behind the head shows.
export const TrackedBubble: React.FC<BubbleProps & { from: number; to: number }> = ({ from, to, ...props }) => {
  const { fps } = useVideoConfig();
  const start = Math.round(from * fps);
  return (
    <Sequence from={start} durationInFrames={Math.round(to * fps) - start} name="FaceBubble">
      <Bubble {...props} trimBefore={start} />
    </Sequence>
  );
};

const Bubble: React.FC<BubbleProps & { trimBefore: number }> = ({
  footage,
  cutout,
  track,
  x,
  y,
  size,
  span,
  background,
  ring,
  trimBefore,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const face = track((trimBefore + frame) / fps) ?? { cx: 540, cy: 700, h: 500 };
  const s = size / (span * face.h);
  const pop = ramp(frame, 0, 10, OVERSHOOT) * (1 - ramp(frame, durationInFrames - 6, 6));
  const r = size / 2;

  const video = (
    // Face center sits at the middle (a little lower without a cutout, so the forehead isn't cut off).
    <div style={{ position: "absolute", left: r - face.cx * s, top: size * (cutout ? 0.5 : 0.53) - face.cy * s, width: 1080 * s, height: 1920 * s }}>
      <OffthreadVideo
        src={staticFile(cutout ?? footage.src)}
        transparent={Boolean(cutout)}
        trimBefore={trimBefore}
        muted
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );

  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size, transform: `scale(${pop})` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background, boxShadow: ring }} />
      {cutout ? (
        // Bottom half follows the circle; the top half is open, so the head pokes out over the ring.
        <div style={{ position: "absolute", inset: 0, clipPath: `path('M 0 ${r} L 0 ${-size} L ${size} ${-size} L ${size} ${r} A ${r} ${r} 0 0 1 0 ${r} Z')` }}>
          {video}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            overflow: "hidden",
            WebkitMaskImage: "radial-gradient(circle closest-side, #000 72%, transparent 100%)",
            maskImage: "radial-gradient(circle closest-side, #000 72%, transparent 100%)",
          }}
        >
          {video}
        </div>
      )}
    </div>
  );
};
