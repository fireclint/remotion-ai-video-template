import { z } from "zod";
import { EndCard, endCardSchema } from "../shared/EndCard";
import type { Camera } from "../shared/fx";
import { HookText, hookTextSchema } from "../shared/HookText";
import { Layout, runs } from "../shared/layout";
import { ScribbleWipe, scribbleWipeSchema } from "../shared/ScribbleWipe";
import { SourceTag, sourceTagSchema } from "../shared/SourceTag";
import { C } from "../shared/theme";
import { CAPTIONS, FOOTAGE, at, cutBefore } from "./cues";
import { Card, cardSchema } from "./graphics/Card";
import { Count, countSchema } from "./graphics/Count";
import { Ring, ringSchema } from "./graphics/Ring";

// The template for a new video. Every moment hangs off a spoken word, so a new take re-syncs itself.

const T = {
  this: at("this is"),
  starter: at("starter"),
  take: at("take it over"),
  copy: at("copy this"),
};

// Where the cut jumps from one take to the next (node scripts/find-cuts.mjs <video>). Layout switches and
// wipes land on these so the jumps don't show.
const CUT = {
  split: cutBefore(2.033, "it can split"),
  every: cutBefore(4.9, "every graphic"),
  copy: cutBefore(7.633, "copy this"),
};

// The end card holds this long after the footage ends.
const END_HOLD = 1;
export const TOTAL = FOOTAGE.durationSec + END_HOLD;

// FACE, SPLIT or FULL from each moment until the next (see shared/layout.tsx).
export const LAYOUT: Layout = [
  { at: 0, mode: "face" },
  { at: CUT.split, mode: "split" },
  { at: T.take, mode: "full" },
  { at: CUT.copy, mode: "face" },
];

// Half a scribble wipe. The frame is solid at its midpoint, which is where anything gets swapped.
const WIPE = 0.3;

export type Gfx = {
  kind: "overlay" | "insert";
  // Behind the speaker, in front of the speaker, or over everything.
  layer: "behind" | "front" | "top";
  // Drawn on the SPLIT panel, so it slides in and out with it.
  split?: boolean;
  start: number;
  seconds: number;
  component: unknown;
  schema: z.ZodType;
  defaultProps: Record<string, unknown>;
};

const wipe = (at: number, color: string): Gfx => ({
  kind: "overlay",
  layer: "top",
  start: at - WIPE,
  seconds: WIPE * 2,
  component: ScribbleWipe,
  schema: scribbleWipeSchema,
  defaultProps: { bg: "transparent", color },
});

export const STARTER_GFX = {
  // A hand-drawn ring around the head, behind the speaker and stuck to the background.
  "Starter-Ring": {
    kind: "overlay",
    layer: "behind",
    start: 0,
    seconds: CUT.split,
    component: Ring,
    schema: ringSchema,
    defaultProps: { bg: "transparent", start: 0, end: CUT.split, drawAt: T.this, cx: 540, cy: 590, rx: 285, ry: 330 },
  },
  "Starter-Hook": {
    kind: "overlay",
    layer: "front",
    start: T.starter,
    seconds: CUT.split - T.starter,
    component: HookText,
    schema: hookTextSchema,
    defaultProps: { bg: "transparent", text: "STARTER" },
  },
  "Starter-Count": {
    kind: "overlay",
    layer: "front",
    split: true,
    start: CUT.split,
    seconds: T.take + WIPE - CUT.split,
    component: Count,
    schema: countSchema,
    defaultProps: { bg: "transparent", words: CAPTIONS.length, label: "spoken words, each one a cue" },
  },
  // Source lines go on the top layer, so they stay readable over a full-screen insert too.
  "Starter-Source": {
    kind: "overlay",
    layer: "top",
    start: CUT.split,
    seconds: T.take + WIPE - CUT.split,
    component: SourceTag,
    schema: sourceTagSchema,
    defaultProps: { bg: "transparent", text: "Source: this video's transcript", layout: LAYOUT, start: CUT.split },
  },
  "Starter-WipeIn": wipe(T.take, C.accent),
  "Starter-Card": {
    kind: "insert",
    layer: "front",
    start: T.take,
    seconds: CUT.copy - T.take,
    component: Card,
    schema: cardSchema,
    defaultProps: { headline: "Timed to a *spoken word*" },
  },
  "Starter-WipeOut": wipe(CUT.copy, C.accent),
  "Starter-End": {
    kind: "overlay",
    layer: "front",
    start: T.copy,
    seconds: TOTAL - T.copy,
    component: EndCard,
    schema: endCardSchema,
    defaultProps: { bg: "transparent", cta: "Copy this folder to start a real one" },
  },
} satisfies Record<string, Gfx>;

export type StarterGfxId = keyof typeof STARTER_GFX;

// Times are seconds into the footage. Zooms grow from chin level; the drawings don't zoom.
// Punch in on alternate FACE beats. Not during SPLIT: a punch there pushes the head up under the panel.
export const CAMERA: Camera = {
  origin: "50% 45%",
  punches: [
    { at: 0, scale: 1 },
    { at: CUT.copy, scale: 1.05 },
  ],
  pushes: [],
  thumps: [T.starter],
  shakes: [],
  moods: [],
  whips: [],
  flashes: [],
};

// Captions sit on the chest (inside the safe area) and step aside while the same words are big on
// screen, during full-screen inserts and under the end card.
export const CAPTION_TOP = 1080;
export const CAPTIONS_OFF = [
  { from: T.starter - 0.02, to: CUT.split },
  ...runs(LAYOUT, "full", TOTAL).map((r) => ({ from: r.from - 0.02, to: r.to })),
  { from: T.copy - 0.02, to: TOTAL },
];

export const SFX = [
  { file: "marker", at: T.this, volume: 0.35 },
  { file: "whip", at: T.starter - 0.08, volume: 0.35 },
  { file: "whoosh", at: CUT.split - 0.05, volume: 0.3 },
  { file: "scribble", at: T.take - WIPE, volume: 0.5 },
  { file: "scribble", at: CUT.copy - WIPE, volume: 0.5 },
  { file: "ding", at: T.copy + 0.15, volume: 0.3 },
];
