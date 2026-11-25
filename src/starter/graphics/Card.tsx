import React from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { Kinetic } from "../../shared/Kinetic";
import { Stage } from "../../shared/Stage";
import { C } from "../../shared/theme";

export const cardSchema = z.object({
  // Markup: *accent box*  !red box!  +green box+
  headline: z.string(),
});

// A full-screen (FULL) insert. It appears while a scribble wipe has the frame covered.
export const Card: React.FC<z.infer<typeof cardSchema>> = ({ headline }) => (
  <Stage>
    <AbsoluteFill style={{ background: C.bg, justifyContent: "center", alignItems: "center", padding: 70 }}>
      <Kinetic text={headline} fontSize={124} delay={6} />
    </AbsoluteFill>
  </Stage>
);
