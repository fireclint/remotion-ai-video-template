import React from "react";
import { C } from "./theme";

// Hard-edged text outline built from shadows, so it survives a chroma key.
export const outline = (r: number, color = C.bg) => {
  const steps = 16;
  const parts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    parts.push(
      `${(Math.cos(a) * r).toFixed(1)}px ${(Math.sin(a) * r).toFixed(1)}px 0 ${color}`,
    );
  }
  return parts.join(", ");
};

type IconProps = { size?: number; color?: string; stroke?: number };

export const CheckIcon: React.FC<IconProps> = ({
  size = 32,
  color = C.text,
  stroke = 3.4,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M4.5 12.5l4.8 4.8L19.5 7"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const XIcon: React.FC<IconProps> = ({
  size = 32,
  color = C.text,
  stroke = 3.4,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M6 6l12 12M18 6L6 18"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
    />
  </svg>
);

export const WarnIcon: React.FC<IconProps> = ({ size = 30, color = C.red }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2.8L22.5 21H1.5z" fill={color} />
    <path
      d="M12 9.2v5.4"
      stroke="#000"
      strokeWidth={2.6}
      strokeLinecap="round"
    />
    <circle cx="12" cy="17.6" r="1.4" fill="#000" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ size = 30, color = C.muted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" fill={color} />
    <path
      d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"
      stroke={color}
      strokeWidth={2.4}
    />
  </svg>
);

export const SparkleIcon: React.FC<IconProps> = ({
  size = 30,
  color = C.accentLight,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M12 1.5c.8 5.2 3.3 7.7 8.5 8.5-5.2.8-7.7 3.3-8.5 8.5-.8-5.2-3.3-7.7-8.5-8.5 5.2-.8 7.7-3.3 8.5-8.5z"
      fill={color}
    />
    <path
      d="M19.5 15.5c.3 2 1.2 2.9 3.2 3.2-2 .3-2.9 1.2-3.2 3.2-.3-2-1.2-2.9-3.2-3.2 2-.3 2.9-1.2 3.2-3.2z"
      fill={color}
    />
  </svg>
);

const STAR_PATH =
  "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z";

// `fill` 0..1 lets a row of stars fill in one after another.
export const Star: React.FC<{ size?: number; fill?: number; empty?: string }> = ({
  size = 32,
  fill = 1,
  empty = C.line,
}) => (
  <div style={{ position: "relative", width: size, height: size }}>
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute" }}>
      <path d={STAR_PATH} fill={empty} />
    </svg>
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: `${Math.max(0, Math.min(1, fill)) * 100}%`,
        overflow: "hidden",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d={STAR_PATH} fill={C.accent} />
      </svg>
    </div>
  </div>
);

export const Person: React.FC<{ height?: number; color?: string }> = ({
  height = 110,
  color = C.text,
}) => (
  <svg width={height * 0.6} height={height} viewBox="0 0 60 100">
    <circle cx="30" cy="20" r="16" fill={color} />
    <path d="M6 98V62c0-16 12-22 24-22s24 6 24 22v36z" fill={color} />
  </svg>
);

// A chip: flat accent by default.
export const Pill: React.FC<{
  children: React.ReactNode;
  bg?: string;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, bg = C.accent, color = C.text, size = 24, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.4,
      background: bg,
      color,
      fontSize: size,
      fontWeight: 700,
      padding: `${size * 0.42}px ${size * 0.8}px`,
      borderRadius: 999,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);
