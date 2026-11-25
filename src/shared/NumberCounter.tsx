import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp } from "./anim";
import { C, MONO } from "./theme";

// A number counting from one value to the next with an ease-out, in the mono font with
// thousands separators. `keys` are [seconds into the clip, value]: [[0, 0], [1.2, 320000000]] counts
// up once; add more keys to count on, or back down ($300 → $200 → $100).
export const counterValue = (keys: [number, number][], t: number) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t0, v0] = keys[i - 1];
    const [t1, v1] = keys[i];
    if (t < t1) return interpolate(t, [t0, t1], [v0, v1], { ...clamp, easing: Easing.out(Easing.cubic) });
  }
  return keys[keys.length - 1][1];
};

export const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const NumberCounter: React.FC<{
  keys: [number, number][];
  prefix?: string;
  suffix?: string;
  decimals?: number;
  fontSize?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ keys, prefix = "", suffix = "", decimals = 0, fontSize = 96, color = C.text, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const value = counterValue(keys, frame / fps);
  // Round toward the target so the count lands exactly on it.
  const shown = decimals ? value : Math.round(value);
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize,
        fontWeight: 800,
        letterSpacing: -fontSize * 0.02,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
        color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {prefix}
      {formatNumber(shown, decimals)}
      {suffix}
    </div>
  );
};
