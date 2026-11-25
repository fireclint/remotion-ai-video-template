import React from "react";
import { Composition, Folder } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./theme";

// The shape every video's graphics list (GFX, GAPS_GFX, …) shares.
type GraphicEntry = {
  kind: "overlay" | "insert";
  component: unknown;
  schema: unknown;
  defaultProps: unknown;
  seconds: number;
};

const register = (id: string, def: GraphicEntry) => (
  <Composition
    key={id}
    id={id}
    component={def.component as React.FC<Record<string, unknown>>}
    schema={def.schema as never}
    defaultProps={def.defaultProps as never}
    durationInFrames={Math.round(def.seconds * FPS)}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);

// A video's graphics in the Studio sidebar, split into overlay and insert folders.
// Folder names must be unique, so each video passes its own name.
export const GraphicFolders: React.FC<{ video: string; gfx: Record<string, GraphicEntry> }> = ({ video, gfx }) => {
  const ids = Object.keys(gfx);
  return (
    <>
      <Folder name={`${video}-Overlays`}>{ids.filter((id) => gfx[id].kind === "overlay").map((id) => register(id, gfx[id]))}</Folder>
      <Folder name={`${video}-Inserts`}>{ids.filter((id) => gfx[id].kind === "insert").map((id) => register(id, gfx[id]))}</Folder>
    </>
  );
};
