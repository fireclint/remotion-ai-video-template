import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { z } from "zod";
import { EASE_OUT, ramp } from "../../shared/anim";
import { SPLIT } from "../../shared/layout";
import { NumberCounter } from "../../shared/NumberCounter";
import { Stage, bgSchema } from "../../shared/Stage";
import { C, MONO } from "../../shared/theme";

export const countSchema = z.object({
  bg: bgSchema,
  words: z.number(),
  label: z.string(),
});

// A split-panel graphic: a number counting up, with a label under it.
export const Count: React.FC<z.infer<typeof countSchema>> = ({ bg, words, label }) => {
  const frame = useCurrentFrame();
  const labelIn = ramp(frame, 10, 8, EASE_OUT);
  return (
    <Stage bg={bg}>
      <AbsoluteFill style={{ top: SPLIT.top, height: SPLIT.bottom - SPLIT.top, justifyContent: "center", alignItems: "center", gap: 22 }}>
        <NumberCounter keys={[[0.2, 0], [1.1, words]]} fontSize={220} />
        <div style={{ fontFamily: MONO, fontSize: 36, fontWeight: 500, color: C.accentLight, opacity: labelIn, transform: `translateY(${(1 - labelIn) * 14}px)` }}>
          {label}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
