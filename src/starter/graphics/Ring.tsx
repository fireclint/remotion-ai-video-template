import React from "react";
import { z } from "zod";
import { INK, Sheet, Stroke, drawn, sketchRing, useErase, useSeconds, useSticky } from "../../shared/ink";
import { Stage, bgSchema } from "../../shared/Stage";
import { SCENE } from "../cues";

export const ringSchema = z.object({
  bg: bgSchema,
  // This clip's place in the footage, in seconds, so the drawing can stick to the background.
  start: z.number(),
  end: z.number(),
  // Seconds into the footage when the pen starts.
  drawAt: z.number(),
  cx: z.number(),
  cy: z.number(),
  rx: z.number(),
  ry: z.number(),
});

// The paint-pen accent: a hand-drawn circle. Stacked under the speaker's cutout, it passes behind
// their shoulders, which shows how the layers work.
export const Ring: React.FC<z.infer<typeof ringSchema>> = ({ bg, start, end, drawAt, cx, cy, rx, ry }) => {
  const t = useSeconds();
  const offset = useSticky(SCENE, start, end);
  const erase = useErase(6);
  return (
    <Stage bg={bg}>
      <Sheet offset={offset} erase={erase} band={[cy - ry - 80, cy + ry + 80]}>
        <Stroke d={sketchRing(cx, cy, rx, ry, "head")} p={drawn(t, drawAt - start, 0.4)} color={INK.accent} width={15} />
      </Sheet>
    </Stage>
  );
};
