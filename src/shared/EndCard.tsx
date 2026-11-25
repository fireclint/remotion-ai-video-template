import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { z } from "zod";
import { EASE_OUT, OVERSHOOT, ramp } from "./anim";
import { Stage, bgSchema } from "./Stage";
import { C, CHANNEL_NAME, fontFamily } from "./theme";

export const endCardSchema = z.object({
  bg: bgSchema,
  // One line, such as "Follow for agents that actually work".
  cta: z.string(),
  // Top of the card. The default sits on the chest, below the face, inside the safe area.
  y: z.number().optional(),
});

// The channel's sign-off: the channel's wordmark (CHANNEL_NAME in theme.ts) and a one-line call to
// action. It holds through the last frame, so the video can end on it.
export const EndCard: React.FC<z.infer<typeof endCardSchema>> = ({ bg, cta, y = 940 }) => {
  const frame = useCurrentFrame();
  const card = ramp(frame, 0, 9, OVERSHOOT);
  const rule = ramp(frame, 6, 8, EASE_OUT);
  const line = ramp(frame, 8, 7, EASE_OUT);
  return (
    <Stage bg={bg}>
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            top: y,
            padding: "38px 48px 42px",
            background: C.bg,
            borderRadius: 22,
            opacity: ramp(frame, 0, 3),
            transform: `translateY(${(1 - card) * 46}px)`,
          }}
        >
          <div style={{ fontFamily, fontSize: 96, fontWeight: 800, letterSpacing: -96 * 0.035, lineHeight: 1, color: C.text }}>{CHANNEL_NAME}</div>
          <div style={{ width: 150 * rule, height: 9, marginTop: 18, background: C.accent }} />
          <div
            style={{
              marginTop: 24,
              fontFamily,
              fontSize: 46,
              fontWeight: 700,
              lineHeight: 1.18,
              color: C.text,
              opacity: line,
              transform: `translateY(${(1 - line) * 12}px)`,
            }}
          >
            {cta}
          </div>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
