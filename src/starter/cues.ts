import type { Caption } from "@remotion/captions";
import { Footage, makeCues } from "../shared/cues";
import type { Scene } from "../shared/ink";
import captionsJson from "./data/captions.json";
import footageJson from "./data/footage.json";
import sceneJson from "./data/scene.json";

// Written by scripts/clean-captions.mjs and scripts/track-scene.mjs.
export const CAPTIONS = captionsJson as Caption[];
export const FOOTAGE = footageJson as Footage;
export const SCENE = sceneJson as Scene;
export const { at, endOf, cutBefore } = makeCues(CAPTIONS);
