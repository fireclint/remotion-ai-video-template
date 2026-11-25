import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { EASE_IN, EASE_OUT, EXIT, ramp } from "./anim";
import { SPLIT } from "./layout";
import { Stage, bgSchema } from "./Stage";
import { C, MONO, fontFamily } from "./theme";

// *word* inside a card's text is set in the light accent.
const emphasis = (text: string) =>
  text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
      <span key={i} style={{ color: C.accentLight }}>
        {part.slice(1, -1)}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );

// A short fact on a dark panel with an accent rule down its left edge and an optional label.
// `lines` lists items under (or instead of) the text. `enter` and `leave` are frames into the clip.
export const TextCard: React.FC<{
  label?: string;
  text?: string;
  lines?: string[];
  width?: number;
  fontSize?: number;
  enter?: number;
  leave?: number;
  dim?: number;
  style?: React.CSSProperties;
}> = ({ label, text, lines, width = 940, fontSize = 52, enter = 0, leave, dim = 1, style }) => {
  const frame = useCurrentFrame();
  const inP = ramp(frame, enter, 8, EASE_OUT);
  const outP = leave === undefined ? 0 : ramp(frame, leave, EXIT, EASE_IN);
  const rule = ramp(frame, enter + 2, 7, EASE_OUT);
  return (
    <div
      style={{
        position: "relative",
        width,
        boxSizing: "border-box",
        background: C.bg,
        border: `2px solid ${C.line}`,
        borderRadius: 18,
        padding: "30px 38px 32px 54px",
        overflow: "hidden",
        opacity: inP * (1 - outP) * dim,
        transform: `translateY(${(1 - inP) * 28 - outP * 16}px)`,
        ...style,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, background: C.accent, transform: `scaleY(${rule})`, transformOrigin: "top" }} />
      {label ? (
        <div style={{ fontFamily: MONO, fontSize: 27, fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase", color: C.accentLight, marginBottom: 12 }}>
          {label}
        </div>
      ) : null}
      {text ? <div style={{ fontFamily, fontSize, fontWeight: 700, lineHeight: 1.16, letterSpacing: -fontSize * 0.01, color: C.text }}>{emphasis(text)}</div> : null}
      {lines ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: text ? 20 : 2 }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, fontFamily, fontSize: fontSize * 0.94, fontWeight: 700, color: C.text }}>
              <span style={{ width: 14, height: 14, background: C.accent, flex: "none" }} />
              {emphasis(line)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const textCardsSchema = z.object({
  bg: bgSchema,
  // Each card arrives `at` seconds into the clip and stacks under the ones before it.
  cards: z.array(z.object({ at: z.number(), label: z.string().optional(), text: z.string().optional(), lines: z.array(z.string()).optional() })),
  // Top of the stack, the gap between cards and their width. The defaults fill the split panel.
  top: z.number().optional(),
  gap: z.number().optional(),
  width: z.number().optional(),
  fontSize: z.number().optional(),
});

// One or more TextCards stacking up one at a time, all leaving together when the clip ends.
export const TextCards: React.FC<z.infer<typeof textCardsSchema>> = ({ bg, cards, top = SPLIT.top, gap = 22, width = 940, fontSize = 52 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <Stage bg={bg}>
      <AbsoluteFill>
        <div style={{ position: "absolute", top, left: (1080 - width) / 2, width, display: "flex", flexDirection: "column", gap }}>
          {cards
            .filter((c) => frame >= Math.round(c.at * fps))
            .map((c, i) => (
              <TextCard
                key={i}
                label={c.label}
                text={c.text}
                lines={c.lines}
                width={width}
                fontSize={fontSize}
                enter={Math.round(c.at * fps)}
                leave={durationInFrames - EXIT}
              />
            ))}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
