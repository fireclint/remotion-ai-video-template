import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { z } from "zod";
import { C, fontFamily } from "../shared/theme";
import { outline } from "../shared/ui";
import { FOOTAGE } from "./cues";

export const starterThumbnailSchema = z.object({
  // Which frame of the footage to use for the face. Find sharp ones with scripts/sharpest-frames.mjs,
  // then look at them: a relaxed or closed mouth, eyes on the lens, no "oo" shapes.
  frame: z.number(),
});

const fill: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };

// The hook as one picture. The background is dimmed and the speaker's cutout isn't, so they stand out.
// The face sits in the top third, so the type goes below the chin: a huge accent-colored hook and a
// short question on a dark band. Lettering stays between y 285 and 1635, which is what a 4:5 feed crop keeps.
export const StarterThumbnail: React.FC<z.infer<typeof starterThumbnailSchema>> = ({ frame }) => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill style={{ filter: "brightness(0.5) saturate(0.85)" }}>
      <OffthreadVideo src={staticFile(FOOTAGE.src)} muted trimBefore={frame} style={fill} />
    </AbsoluteFill>
    <AbsoluteFill>
      <OffthreadVideo src={staticFile("starter/cutout.webm")} transparent muted trimBefore={frame} style={fill} />
    </AbsoluteFill>

    <div
      style={{
        position: "absolute",
        top: 900,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily,
        fontSize: 230,
        fontWeight: 900,
        lineHeight: 0.92,
        letterSpacing: -7,
        color: C.accent,
        textShadow: outline(8),
      }}
    >
      BIG HOOK
    </div>

    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1420,
        padding: "30px 36px",
        borderRadius: 22,
        background: C.bg,
        borderBottom: `10px solid ${C.accent}`,
        textAlign: "center",
        fontFamily,
        fontSize: 96,
        fontWeight: 800,
        letterSpacing: -2,
        color: C.text,
      }}
    >
      Short question?
    </div>
  </AbsoluteFill>
);
