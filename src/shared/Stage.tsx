import React, { createContext, useContext } from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { C, fontFamily } from "./theme";

// "transparent" → ProRes 4444 with alpha (DaVinci, newer CapCut).
// "green" → solid #00FF00 behind everything, for CapCut's Chroma Key.
export const bgSchema = z.enum(["transparent", "green"]);
export type BgMode = z.infer<typeof bgSchema>;

const BgContext = createContext<BgMode>("transparent");

// Soft glows and blurred shadows smear into a chroma key, so they are dropped on green.
// Components that render <Stage> themselves pass their `bg`, since they sit outside the provider.
export const useSoftShadow = (bg?: BgMode) => {
  const fromContext = useContext(BgContext);
  const green = (bg ?? fromContext) === "green";
  return (css: string) => (green ? undefined : css);
};

export const joinShadows = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(", ") || "none";

export const Stage: React.FC<{ bg?: BgMode; children: React.ReactNode }> = ({
  bg = "transparent",
  children,
}) => (
  <BgContext.Provider value={bg}>
    <AbsoluteFill
      style={{
        backgroundColor: bg === "green" ? C.chroma : "transparent",
        fontFamily,
        color: C.text,
      }}
    >
      {children}
    </AbsoluteFill>
  </BgContext.Provider>
);
