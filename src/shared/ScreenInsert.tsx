import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { EASE_OUT, ramp } from "./anim";
import { Cover } from "./cover";
import { C, MONO, SAFE_BOTTOM, SAFE_TOP, fontFamily } from "./theme";

export const screenInsertSchema = z.object({
  // A screen recording converted to H.264 in public/, such as "my-video/screen.mp4".
  // Leave it empty until the recording is in: a placeholder shows instead.
  src: z.string(),
  // The recording's size in pixels and how many seconds of it to play (from `trimStart`). It's sped
  // up or slowed down to fill the insert exactly.
  sourceSize: z.tuple([z.number(), z.number()]),
  sourceSeconds: z.number(),
  trimStart: z.number().optional(),
  // The part of the recording to show, [x, y, width, height] in its own pixels. It fills the frame's
  // width, so a narrow crop makes small text readable.
  crop: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  // A chip naming what's on screen. Leave it out for none, and the recording moves up into its space.
  label: z.string().optional(),
  // Tallest the recording may be, in frame pixels. Raise it to fill the frame's width with a tall crop.
  maxHeight: z.number().optional(),
  // Fill the whole frame edge to edge, for a recording that's already 9:16 and should show uncropped.
  fill: z.boolean().optional(),
});

const MAX_H = SAFE_BOTTOM - SAFE_TOP - 140;

// A full-screen screen recording, muted and sped up to fit, while the speaker's voice carries on.
export const ScreenInsert: React.FC<z.infer<typeof screenInsertSchema>> = ({ src, sourceSize, sourceSeconds, trimStart = 0, crop, label, maxHeight = MAX_H, fill = false }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [sw, sh] = sourceSize;
  const [cx, cy, cw, ch] = crop ?? [0, 0, sw, sh];
  // Filling covers the frame and centres the recording in it; otherwise it fits inside the safe area.
  const scale = fill ? Math.max(1080 / cw, 1920 / ch) : Math.min(1080 / cw, maxHeight / ch);
  const boxW = fill ? 1080 : cw * scale;
  const boxH = fill ? 1920 : ch * scale;
  const boxTop = fill ? 0 : SAFE_TOP + (label ? 110 : 0) + (maxHeight - boxH) / 2;
  const offX = (boxW - cw * scale) / 2;
  const offY = (boxH - ch * scale) / 2;
  const tag = ramp(frame, 5, 7, EASE_OUT);

  return (
    <Cover wipe="slide" background={C.bg}>
      <div style={{ position: "absolute", left: (1080 - boxW) / 2, top: boxTop, width: boxW, height: boxH, overflow: "hidden", borderRadius: fill ? 0 : 14, background: C.card }}>
        {src ? (
          <OffthreadVideo
            src={staticFile(src)}
            muted
            trimBefore={Math.round(trimStart * fps)}
            playbackRate={sourceSeconds / (durationInFrames / fps)}
            style={{ position: "absolute", left: offX - cx * scale, top: offY - cy * scale, width: sw * scale, height: sh * scale }}
          />
        ) : (
          <AbsoluteFill style={{ border: `4px dashed ${C.line}`, borderRadius: 14, justifyContent: "center", alignItems: "center", gap: 18, color: C.muted, textAlign: "center" }}>
            <div style={{ fontFamily, fontSize: 52, fontWeight: 700 }}>Screen recording goes here</div>
            <div style={{ fontFamily: MONO, fontSize: 28 }}>placeholder until the real clip is in</div>
          </AbsoluteFill>
        )}
      </div>
      {label ? (
        <div
          style={{
            position: "absolute",
            left: 54,
            top: SAFE_TOP + 20,
            padding: "12px 22px",
            borderRadius: 10,
            background: C.accent,
            fontFamily: MONO,
            fontSize: 30,
            fontWeight: 600,
            color: C.text,
            opacity: tag,
            transform: `translateX(${(1 - tag) * -24}px)`,
          }}
        >
          {label}
        </div>
      ) : null}
    </Cover>
  );
};
