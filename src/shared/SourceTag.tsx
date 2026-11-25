import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { EXIT, ramp } from "./anim";
import { SPLIT, splitAmount } from "./layout";
import { Stage, bgSchema } from "./Stage";
import { C, MONO, SAFE_BOTTOM } from "./theme";

export const sourceTagSchema = z.object({
  bg: bgSchema,
  text: z.string(),
  // The video's LAYOUT and this clip's start in the footage (seconds), so the line can step into the
  // split panel during SPLIT instead of sitting on the speaker's face.
  layout: z.array(z.object({ at: z.number(), mode: z.enum(["face", "split", "full"]) })),
  start: z.number(),
});

const HEIGHT = 54;

// A small "Source: ..." line in the light accent at the bottom-left of the safe area. During SPLIT the
// speaker's face is down there, so it moves to the panel's top-left.
export const SourceTag: React.FC<z.infer<typeof sourceTagSchema>> = ({ bg, text, layout, start }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const a = splitAmount(layout, start * fps + frame, fps);
  // Fades out and back in while the layout changes, then shows in its new spot.
  const swap = Math.abs(a * 2 - 1);
  const opacity = ramp(frame, 0, 6) * (1 - ramp(frame, durationInFrames - EXIT, EXIT)) * swap;
  const top = a > 0.5 ? SPLIT.sourceTop : SAFE_BOTTOM - 14 - HEIGHT;
  return (
    <Stage bg={bg}>
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 54,
            top,
            height: HEIGHT,
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            borderRadius: 8,
            background: C.bg,
            fontFamily: MONO,
            fontSize: 30,
            fontWeight: 500,
            color: C.accentLight,
            whiteSpace: "nowrap",
            opacity,
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
