import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_OUT, OVERSHOOT, clamp, ramp, shake } from "./anim";
import { C } from "./theme";
import type { Footage } from "./cues";

// Effects applied to a video's footage. Every time is in seconds into the A-roll.
export type Camera = {
  // Snap zooms: each holds until the next one.
  punches: { at: number; scale: number }[];
  // Slow creep-ins.
  pushes: { from: number; to: number; amount: number }[];
  // Heartbeat bumps.
  thumps: number[];
  shakes: { at: number; amp: number }[];
  // Desaturated, darker "worry" grade.
  moods: { from: number; to: number }[];
  whips: number[];
  flashes: number[];
  // The point the zooms grow from. Defaults to about the middle of the frame.
  origin?: string;
};

// 0..1 "worry" amount: eases in at each mood window's start and out at its end.
const moodAt = (frame: number, fps: number, moods: Camera["moods"]) =>
  Math.max(0, ...moods.map((m) => Math.min(ramp(frame, m.from * fps, 12), 1 - ramp(frame, m.to * fps - 3, 6))));

// The camera's move at `frame`, as CSS, so a layer stacked over the footage (say, the person cut
// out of it) can move with it exactly.
export const cameraStyle = (frame: number, fps: number, camera: Camera): React.CSSProperties => {
  let punch = 1;
  camera.punches.forEach((p, i) => {
    const f = p.at * fps;
    if (frame >= f) {
      const prev = i > 0 ? camera.punches[i - 1].scale : 1;
      punch = interpolate(frame, [f, f + 3], [prev, p.scale], { ...clamp, easing: EASE_OUT });
    }
  });

  const push = camera.pushes.reduce((acc, p) => {
    const from = p.from * fps;
    const to = p.to * fps;
    if (frame < from) return acc;
    const grow = ramp(frame, from, to - from, Easing.inOut(Easing.quad));
    const release = ramp(frame, to, 6);
    return acc * (1 + p.amount * grow * (1 - release));
  }, 1);

  const thump = camera.thumps.reduce(
    (acc, t) => acc + 0.04 * Math.sin(interpolate(frame, [t * fps, t * fps + 6], [0, 1], clamp) * Math.PI),
    0,
  );

  const shakeX = camera.shakes.reduce((a, s) => a + shake(frame, s.at * fps, s.amp, 10), 0);
  const shakeY = camera.shakes.reduce((a, s) => a + shake(frame + 3, s.at * fps, s.amp * 0.6, 10), 0);

  let whipX = 0;
  let blur = 0;
  for (const w of camera.whips) {
    const d = frame - w * fps;
    if (d >= -5 && d < 0) {
      whipX = interpolate(d, [-5, 0], [0, -340], { easing: Easing.in(Easing.quad) });
      blur = interpolate(d, [-5, 0], [0, 30]);
    } else if (d >= 0 && d <= 6) {
      whipX = interpolate(d, [0, 6], [340, 0], { easing: Easing.out(Easing.quad) });
      blur = interpolate(d, [0, 6], [30, 0]);
    }
  }

  const mood = moodAt(frame, fps, camera.moods);

  return {
    transformOrigin: camera.origin ?? "50% 52%",
    transform: `translate(${shakeX + whipX}px, ${shakeY}px) scale(${punch * push + thump})`,
    filter: `saturate(${1 - 0.6 * mood}) contrast(${1 + 0.12 * mood}) brightness(${1 - 0.12 * mood}) blur(${blur}px)`,
  };
};

// Punch zooms, slow push-ins, heartbeat thumps, impact shakes, whip pans and the mood grade,
// all applied to whatever footage is passed in. The footage is otherwise left ungraded: the look is flat.
export const CameraFx: React.FC<{ camera: Camera; children: React.ReactNode }> = ({ camera, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mood = moodAt(frame, fps, camera.moods);

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={cameraStyle(frame, fps, camera)}>
        {children}
      </AbsoluteFill>
      {/* Cool tint and a closing vignette, only during a "worry" mood */}
      {mood > 0 ? (
        <>
          <AbsoluteFill style={{ background: "#1B2A6B", opacity: 0.16 * mood, mixBlendMode: "multiply" }} />
          <AbsoluteFill
            style={{ background: `radial-gradient(ellipse at 50% 48%, transparent ${55 - 18 * mood}%, rgba(0,0,0,${0.75 * mood}) 100%)` }}
          />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// Your footage. After it ends, holds on the last frame so an end screen can be read.
// OffthreadVideo decodes with ffmpeg outside the browser: Chrome's hardware decoder on macOS
// hands back frames it can't draw ("Unsupported VideoFrame NV12") when rendering.
export const ARoll: React.FC<{ footage: Footage }> = ({ footage }) => {
  const { fps } = useVideoConfig();
  const frames = Math.floor(footage.durationSec * fps);
  return (
    <>
      <Sequence durationInFrames={frames}>
        <OffthreadVideo src={staticFile(footage.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Sequence>
      <Sequence from={frames}>
        <Img src={staticFile(footage.still)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Sequence>
    </>
  );
};

// The person cut out of the footage (scripts/cutout.mjs), moving with the same camera. Stack it over
// a drawing and the drawing goes behind them.
export const PersonOnTop: React.FC<{ src: string; footage: Footage; camera: Camera }> = ({ src, footage, camera }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { transform, transformOrigin } = cameraStyle(frame, fps, camera);
  if (frame >= Math.floor(footage.durationSec * fps)) return null;
  return (
    <AbsoluteFill style={{ transform, transformOrigin }}>
      <OffthreadVideo src={staticFile(src)} transparent muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

export const Flashes: React.FC<{ times: number[] }> = ({ times }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = Math.max(0, ...times.map((t) => interpolate(frame, [t * fps, t * fps + 1, t * fps + 5], [0, 0.55, 0], clamp)));
  return <AbsoluteFill style={{ background: C.text, opacity: o, pointerEvents: "none" }} />;
};

// Circle-cropped copy of your footage, kept in sync, for full-screen inserts.
export const FaceBubble: React.FC<{ footage: Footage; start: number; end: number }> = ({ footage, start, end }) => {
  const { fps } = useVideoConfig();
  const from = Math.round(start * fps);
  return (
    <Sequence from={from} durationInFrames={Math.round((end - start) * fps)} name="FaceBubble">
      <Bubble src={footage.src} trimBefore={from} />
    </Sequence>
  );
};

const BUBBLE = 330;
const Bubble: React.FC<{ src: string; trimBefore: number }> = ({ src, trimBefore }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pop = ramp(frame, 0, 10, OVERSHOOT) * (1 - ramp(frame, durationInFrames - 6, 6));
  // Your face sits at about (50%, 52%) of the frame; scale so the head fills the circle.
  const scale = 0.42;
  const vw = 1080 * scale;
  const vh = 1920 * scale;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        top: 1150,
        width: BUBBLE,
        height: BUBBLE,
        borderRadius: BUBBLE / 2,
        overflow: "hidden",
        border: `8px solid ${C.text}`,
        boxShadow: `0 0 0 6px ${C.accent}`,
        transform: `scale(${pop})`,
        background: C.bg,
      }}
    >
      <div style={{ position: "absolute", left: BUBBLE / 2 - vw * 0.5, top: BUBBLE / 2 - vh * 0.52, width: vw, height: vh }}>
        <OffthreadVideo src={staticFile(src)} trimBefore={trimBefore} muted style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
};

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: "rgba(255,255,255,0.18)" }}>
      <div style={{ width: `${(frame / durationInFrames) * 100}%`, height: "100%", background: C.accent }} />
    </div>
  );
};
