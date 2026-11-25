import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { z } from "zod";
import { ARoll, CameraFx, PersonOnTop } from "../shared/fx";
import { PanelSlide, SPLIT_SHIFT, SplitPanel, SplitShift, captionTop } from "../shared/layout";
import { MarkerCaptions } from "../shared/MarkerCaptions";
import { C, fontFamily } from "../shared/theme";
import { CAPTIONS, FOOTAGE } from "./cues";
import { CAMERA, CAPTIONS_OFF, CAPTION_TOP, Gfx, LAYOUT, SFX, STARTER_GFX, StarterGfxId } from "./plan";

export const starterFinalSchema = z.object({
  captions: z.boolean(),
  sfx: z.boolean(),
});

const ids = Object.keys(STARTER_GFX) as StarterGfxId[];

// The finished video, bottom to top: footage, drawings behind the speaker, the speaker's cutout, the
// SPLIT panel and what's on it, front overlays, captions, full-screen (FULL) inserts, then the "top"
// layer: source lines, wipes, and any split graphic that must stay up while an insert comes in under it.
// The footage and the cutout slide down together in SPLIT, and take the same camera moves.
export const StarterFinal: React.FC<z.infer<typeof starterFinalSchema>> = ({ captions, sfx }) => {
  const { fps } = useVideoConfig();

  const layer = (match: (g: Gfx) => boolean) =>
    ids
      .filter((id) => match(STARTER_GFX[id]))
      .map((id) => {
        const g: Gfx = STARTER_GFX[id];
        const Comp = g.component as React.FC<Record<string, unknown>>;
        return (
          <Sequence key={id} name={id} from={Math.round(g.start * fps)} durationInFrames={Math.round(g.seconds * fps)}>
            <Comp {...g.defaultProps} />
          </Sequence>
        );
      });

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily }}>
      <SplitShift layout={LAYOUT} shift={SPLIT_SHIFT}>
        <CameraFx camera={CAMERA}>
          <ARoll footage={FOOTAGE} />
        </CameraFx>
      </SplitShift>

      {layer((g) => g.layer === "behind")}
      <SplitShift layout={LAYOUT} shift={SPLIT_SHIFT}>
        <PersonOnTop src="starter/cutout.webm" footage={FOOTAGE} camera={CAMERA} />
      </SplitShift>

      <SplitPanel layout={LAYOUT} />
      <PanelSlide layout={LAYOUT}>{layer((g) => g.layer === "front" && g.kind === "overlay" && Boolean(g.split))}</PanelSlide>
      {layer((g) => g.layer === "front" && g.kind === "overlay" && !g.split)}

      {captions ? <MarkerCaptions captions={CAPTIONS} off={CAPTIONS_OFF} top={captionTop(LAYOUT, CAPTION_TOP, fps)} /> : null}

      {layer((g) => g.kind === "insert")}
      <PanelSlide layout={LAYOUT}>{layer((g) => g.layer === "top" && Boolean(g.split))}</PanelSlide>
      {layer((g) => g.layer === "top" && !g.split)}

      {sfx
        ? SFX.map((s, i) => (
            <Sequence key={i} name={`sfx ${s.file}`} from={Math.max(0, Math.round(s.at * fps))} layout="none">
              <Audio src={staticFile(`sfx/${s.file}.wav`)} volume={s.volume} />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};
