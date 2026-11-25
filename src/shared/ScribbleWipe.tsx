import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { clamp } from "./anim";
import { Pt, polyline } from "./ink";
import { Stage, bgSchema } from "./Stage";

export const scribbleWipeSchema = z.object({
  bg: bgSchema,
  color: z.string(),
});

// One huge marker going back and forth down the frame. The passes overlap, so the frame is solid
// at the halfway point; a cut hidden there can't be seen.
const PASSES = 10;
const pts: Pt[] = Array.from({ length: PASSES + 1 }, (_, i) => [i % 2 === 0 ? -240 : 1320, -130 + i * 225]);
const PATH = polyline(pts);
const WIDTH = 440;
const EASE = Easing.inOut(Easing.quad);

// Scribbles the frame shut in the first half of the clip, then un-draws from where it started,
// showing whatever is underneath by then.
export const ScribbleWipe: React.FC<z.infer<typeof scribbleWipeSchema>> = ({ bg, color }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const mid = (durationInFrames - 1) / 2;
  const head = interpolate(frame, [0, mid], [0, 1], { ...clamp, easing: EASE });
  const tail = interpolate(frame, [mid, durationInFrames - 1], [0, 1], { ...clamp, easing: EASE });
  const solid = frame === Math.floor(mid) || frame === Math.ceil(mid);
  return (
    <Stage bg={bg}>
      <AbsoluteFill>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <filter id="wipe-edge" filterUnits="userSpaceOnUse" x={-100} y={-100} width={1280} height={2120}>
              <feTurbulence type="fractalNoise" baseFrequency={0.05} numOctaves={2} seed={frame % 5} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={26} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
          {solid ? (
            <rect x={0} y={0} width={1080} height={1920} fill={color} />
          ) : (
            <path
              d={PATH}
              pathLength={1}
              fill="none"
              stroke={color}
              strokeWidth={WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${Math.max(0.0001, head - tail)} 2`}
              strokeDashoffset={-tail}
              filter="url(#wipe-edge)"
            />
          )}
        </svg>
      </AbsoluteFill>
    </Stage>
  );
};
