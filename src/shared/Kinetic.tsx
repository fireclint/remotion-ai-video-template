import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { OVERSHOOT, ramp } from "./anim";
import { C } from "./theme";
import { joinShadows } from "./Stage";
import { outline } from "./ui";

type Tone = "plain" | "accent" | "red" | "green";
type Token = { text: string; tone: Tone };

const MARKS: Record<string, Tone> = { "*": "accent", "!": "red", "+": "green" };
const BOX: Record<Exclude<Tone, "plain">, { bg: string; fg: string }> = {
  accent: { bg: C.accent, fg: C.text },
  red: { bg: C.red, fg: C.text },
  green: { bg: C.green, fg: C.bg },
};

// Markup: *accent box*  !red box!  +green box+ . A boxed phrase stays on one line.
export const parseMarkup = (src: string): Token[] => {
  const tokens: Token[] = [];
  for (const part of src.split(/(\*[^*]+\*|![^!]+!|\+[^+]+\+)/g)) {
    const tone = part.length > 2 ? MARKS[part[0]] : undefined;
    if (tone && part.endsWith(part[0])) {
      tokens.push({ text: part.slice(1, -1), tone });
      continue;
    }
    for (const word of part.split(/\s+/).filter(Boolean)) {
      tokens.push({ text: word, tone: "plain" });
    }
  }
  return tokens;
};

// Word-by-word pop-in text, the house style for headlines.
export const Kinetic: React.FC<{
  text: string;
  fontSize: number;
  delay?: number;
  stagger?: number;
  stroke?: number;
  color?: string;
  uppercase?: boolean;
  style?: React.CSSProperties;
}> = ({ text, fontSize, delay = 0, stagger = 3, stroke = 0, color = C.text, uppercase = false, style }) => {
  const frame = useCurrentFrame();
  const tokens = parseMarkup(text);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        alignContent: "center",
        columnGap: fontSize * 0.24,
        rowGap: fontSize * 0.14,
        textAlign: "center",
        ...style,
      }}
    >
      {tokens.map((t, i) => {
        const start = delay + i * stagger;
        const pop = ramp(frame, start, 8, OVERSHOOT);
        const opacity = ramp(frame, start, 3);
        const wipe = ramp(frame, start + 2, 6);
        const box = t.tone === "plain" ? null : BOX[t.tone];
        return (
          <span
            key={i}
            style={{
              position: "relative",
              display: "inline-block",
              opacity,
              transform: `translateY(${(1 - pop) * 22}px) scale(${interpolate(pop, [0, 1], [0.6, 1])})`,
              fontSize,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -fontSize * 0.015,
              textTransform: uppercase ? "uppercase" : "none",
              whiteSpace: "nowrap",
              padding: box ? `0 ${fontSize * 0.16}px` : 0,
              color: box ? box.fg : color,
              // Over footage, pass a stroke: a dark outline and a hard shadow keep the words readable.
              textShadow: box || stroke <= 0 ? "none" : joinShadows(outline(stroke), `0 ${stroke}px 0 ${C.bg}`),
            }}
          >
            {box ? (
              <span
                style={{
                  position: "absolute",
                  inset: `${-fontSize * 0.02}px 0 ${-fontSize * 0.04}px`,
                  background: box.bg,
                  borderRadius: fontSize * 0.1,
                  transform: `scaleX(${wipe})`,
                  transformOrigin: "left center",
                  zIndex: -1,
                }}
              />
            ) : null}
            <span style={{ position: "relative" }}>{t.text}</span>
          </span>
        );
      })}
    </div>
  );
};
