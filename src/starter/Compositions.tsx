import React from "react";
import { Composition, Folder } from "remotion";
import { GraphicFolders } from "../shared/register";
import { FPS, HEIGHT, WIDTH } from "../shared/theme";
import { STARTER_GFX, TOTAL } from "./plan";
import { StarterFinal, starterFinalSchema } from "./StarterFinal";
import { StarterThumbnail, starterThumbnailSchema } from "./Thumbnail";

export const StarterCompositions: React.FC = () => (
  <Folder name="starter">
    <Composition
      id="Starter-Final"
      component={StarterFinal}
      schema={starterFinalSchema}
      defaultProps={{ captions: true, sfx: true }}
      durationInFrames={Math.round(TOTAL * FPS)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    {/* One frame long, not a <Still>: a Still runs at 1fps, which would turn its frame number into seconds. */}
    <Composition
      id="Starter-Thumbnail"
      component={StarterThumbnail}
      schema={starterThumbnailSchema}
      defaultProps={{ frame: 30 }}
      durationInFrames={1}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <GraphicFolders video="starter" gfx={STARTER_GFX} />
  </Folder>
);
