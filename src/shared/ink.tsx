import { loadFont } from "@remotion/google-fonts/PermanentMarker";
import React, { createContext, useContext, useId } from "react";
import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, ramp } from "./anim";
import { C } from "./theme";

// A paint-pen look: lines and lettering drawn with a shaky hand, on whatever is behind the speaker,
// that stick to the background as the phone moves. Stack the speaker's cutout on top (PersonOnTop in
// fx.tsx) and the drawing goes behind their head.
// Use it as an accent only: scribble wipes to hide cuts, and the occasional hand-drawn circle
// (sketchRing) or underline (shaky + curve). Most graphics are flat cards and type.

export const { fontFamily: MARKER } = loadFont();

export const INK = {
  text: C.text,
  accent: C.accent,
  accentLight: C.accentLight,
  highlight: C.highlight,
  green: C.green,
  red: C.red,
  // On a light page: dark pen on light paper.
  pen: C.bg,
  paper: C.text,
};

export type Pt = [number, number];

export const useSeconds = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

// 0→1 while a stroke is drawn.
export const drawn = (t: number, at: number, dur = 0.25) => interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });

// 0→1 while lettering is written, faster than anyone could really write.
export const written = (t: number, at: number, text: string, perChar = 0.028) => interpolate(t, [at, at + text.length * perChar], [0, 1], clamp);

// 0→1 over a clip's last frames: everything on the sheet un-draws itself.
export const useErase = (frames = 6) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return ramp(frame, durationInFrames - frames, frames, Easing.in(Easing.quad));
};

// What scripts/track-scene.mjs writes: how far the background has moved, per frame.
export type Scene = { fps: number; offsets: [number, number][] };

// How far the background has moved since the middle of this clip, so a drawing moves with it.
// `start` and `end` are the clip's place in the footage, in seconds. A clip must stay inside one shot.
export const useSticky = (scene: Scene, start: number, end: number): Pt => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = (t: number) => scene.offsets[Math.max(0, Math.min(scene.offsets.length - 1, Math.round(t * fps)))];
  const here = at(start + frame / fps);
  const mid = at((start + end) / 2);
  return [here[0] - mid[0], here[1] - mid[1]];
};

// ---- Lines

export const polyline = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

// A smooth curve through every point (Catmull-Rom).
export const curve = (pts: Pt[]) => {
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

// Straight segments the way a hand draws them: a point every so often, each a little off.
export const shaky = (pts: Pt[], seed: string, amp = 3, every = 90): Pt[] => {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / every));
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      out.push([x0 + (x1 - x0) * f + (random(`${seed}x${i}.${k}`) - 0.5) * 2 * amp, y0 + (y1 - y0) * f + (random(`${seed}y${i}.${k}`) - 0.5) * 2 * amp]);
    }
  }
  return out;
};

// A line drawn in one go that overshoots a little where it closes.
export const sketchBox = (x: number, y: number, w: number, h: number, seed: string, r = 20) =>
  curve(
    shaky(
      [
        [x + r, y],
        [x + w - r, y],
        [x + w, y + r],
        [x + w, y + h - r],
        [x + w - r, y + h],
        [x + r, y + h],
        [x, y + h - r],
        [x, y + r],
        [x + r + 6, y - 3],
        [x + r + 60, y + 2],
      ],
      seed,
      3,
      120,
    ),
  );

// A ring going around a bit more than once, like circling something on a test.
export const sketchRing = (cx: number, cy: number, rx: number, ry: number, seed: string, turns = 1.14, startDeg = -150) => {
  const pts: Pt[] = [];
  const n = Math.round(24 * turns);
  for (let i = 0; i <= n; i++) {
    const a = ((startDeg + (360 * turns * i) / n) * Math.PI) / 180;
    const drift = 1 + (i / n - 0.5) * 0.06 + (random(`${seed}r${i}`) - 0.5) * 0.025;
    pts.push([cx + Math.cos(a) * rx * drift, cy + Math.sin(a) * ry * drift]);
  }
  return curve(pts);
};

// A curve from `a` to `b`, bowed sideways by `bow` pixels.
export const sketchArc = (a: Pt, b: Pt, bow: number): Pt[] => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const f = i / 10;
    const s = Math.sin(f * Math.PI) * bow;
    pts.push([a[0] + dx * f + (-dy / Math.hypot(dx, dy)) * s, a[1] + dy * f + (dx / Math.hypot(dx, dy)) * s]);
  }
  return pts;
};

// The two barbs of an arrowhead at the end of a line arriving from `from`.
export const barbs = (tip: Pt, from: Pt, size = 40, spread = 30) => {
  const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const side = (d: number): Pt => [tip[0] - Math.cos(ang + d) * size, tip[1] - Math.sin(ang + d) * size];
  const s = (spread * Math.PI) / 180;
  return `M ${side(s).join(" ")} L ${tip.join(" ")} L ${side(-s).join(" ")}`;
};

export const checkMark = (x: number, y: number, s: number) => polyline([[x - s * 0.5, y], [x - s * 0.1, y + s * 0.42], [x + s * 0.6, y - s * 0.55]]);
export const crossMark = (x: number, y: number, s: number) => `M ${x - s / 2} ${y - s / 2} L ${x + s / 2} ${y + s / 2} M ${x + s / 2} ${y - s / 2} L ${x - s / 2} ${y + s / 2}`;

// ---- Drawing

const EraseContext = createContext(0);

export const Stroke: React.FC<{ d: string; p?: number; color?: string; width?: number; opacity?: number }> = ({ d, p = 1, color = INK.text, width = 12, opacity }) => {
  const erase = useContext(EraseContext);
  const visible = p * (1 - erase);
  if (visible <= 0) return null;
  return <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - visible} opacity={opacity} />;
};

// Lettering that writes itself on, one letter at a time, with every letter already holding its place.
export const Scrawl: React.FC<{
  x: number;
  y: number;
  size: number;
  text: string;
  p?: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
  rotate?: number;
  opacity?: number;
  // A dark edge, for lettering that crosses something light or busy.
  edge?: string;
}> = ({ x, y, size, text, p = 1, color = INK.text, anchor = "start", rotate, opacity, edge }) => {
  const erase = useContext(EraseContext);
  const n = Math.ceil(p * (1 - erase) * text.length);
  if (n <= 0) return null;
  const letters = (show: { fillOpacity?: number; strokeOpacity?: number }, hide: { fillOpacity?: number; strokeOpacity?: number }) =>
    [...text].map((ch, i) => (
      <tspan key={i} {...(i < n ? show : hide)}>
        {ch}
      </tspan>
    ));
  const shared = {
    x,
    y,
    fontFamily: MARKER,
    fontSize: size,
    textAnchor: anchor,
    transform: rotate ? `rotate(${rotate} ${x} ${y})` : undefined,
    style: { whiteSpace: "pre" as const },
  };
  return (
    <g opacity={opacity}>
      {/* The edge is its own layer under the letters, so overlapping letters don't leave seams. */}
      {edge ? (
        <text {...shared} fill="none" stroke={edge} strokeWidth={size * 0.09} strokeLinejoin="round">
          {letters({ strokeOpacity: 1 }, { strokeOpacity: 0 })}
        </text>
      ) : null}
      <text {...shared} fill={color}>
        {letters({ fillOpacity: 1 }, { fillOpacity: 0 })}
      </text>
    </g>
  );
};

// The sheet everything is drawn on. A shaky-line filter redraws it every third frame, which is
// what makes hand-drawn animation feel alive. `band` limits the filter to part of the frame,
// because it's the slowest thing in the render.
export const Sheet: React.FC<{ offset?: Pt; erase?: number; band?: [number, number]; wobble?: number; rough?: number; children: React.ReactNode }> = ({
  offset = [0, 0],
  erase = 0,
  band = [90, 860],
  wobble = 7,
  rough = 3.5,
  children,
}) => {
  const frame = useCurrentFrame();
  const id = `ink${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const seed = 2 + (Math.floor(frame / 3) % 7) * 13;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      <defs>
        <filter id={id} filterUnits="userSpaceOnUse" x={-80} y={band[0]} width={1240} height={band[1] - band[0]} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={0.014} numOctaves={2} seed={seed} result="wander" />
          <feDisplacementMap in="SourceGraphic" in2="wander" scale={wobble} xChannelSelector="R" yChannelSelector="G" result="shaky" />
          <feTurbulence type="fractalNoise" baseFrequency={0.4} numOctaves={1} seed={seed + 3} result="grain" />
          <feDisplacementMap in="shaky" in2="grain" scale={rough} xChannelSelector="G" yChannelSelector="R" />
        </filter>
      </defs>
      <EraseContext.Provider value={erase}>
        <g transform={`translate(${offset[0].toFixed(1)} ${offset[1].toFixed(1)})`} filter={`url(#${id})`}>
          {children}
        </g>
      </EraseContext.Provider>
    </svg>
  );
};
