// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// YOUR LOOK: PLACEHOLDERS. Replace everything marked PLACEHOLDER with your own channel name, colors
// and fonts. The README's "One-time setup" has a Claude Code prompt that asks for them and edits this
// file. Every graphic reads its colors and fonts from here, so this is the only file to change.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

// PLACEHOLDER fonts: any Google Font works. Swap the two import lines for your own
// (e.g. "@remotion/google-fonts/Montserrat") and keep the weights each font actually has.
import { loadFont as loadHeadline } from "@remotion/google-fonts/Inter"; // PLACEHOLDER: headlines and captions
import { loadFont as loadMono } from "@remotion/google-fonts/RobotoMono"; // PLACEHOLDER: numbers, code and labels

// PLACEHOLDER: the name on the end card's wordmark.
export const CHANNEL_NAME = "Your Channel";

// Headlines and captions. Hooks use weight 900, captions 700.
export const { fontFamily } = loadHeadline("normal", {
  weights: ["500", "600", "700", "800", "900"],
  subsets: ["latin"],
});
// Numbers, code and labels.
export const { fontFamily: MONO } = loadMono("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
});

export const C = {
  // PLACEHOLDER. Backgrounds, panels, cards, and the outline around text over footage.
  bg: "#111111",
  // PLACEHOLDER. Text on the background.
  text: "#FFFFFF",
  // PLACEHOLDER. The accent: emphasis, highlights, the word being spoken. White text sits on it, so
  // pick one dark enough for that.
  accent: "#FF5A36",
  // PLACEHOLDER. A lighter accent for small text on the background (labels, source lines).
  accentLight: "#FF9C85",
  // PLACEHOLDER. Rare: only "it worked" or money moments.
  highlight: "#FFD23F",
  // States such as errors, success and warnings.
  red: "#EF4444",
  green: "#22C55E",
  amber: "#F59E0B",
  // Neutrals for cards, borders and quiet text. Keep them close to `bg`.
  card: "#1C1C1C",
  cardRaised: "#262626",
  line: "#333333",
  muted: "#9A9A9A",
  // The green-screen background for graphics rendered on green. Leave it.
  chroma: "#00FF00",
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The frame. Everything is vertical: 1080×1920 at 30 fps.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

// Reels, TikTok and Shorts cover roughly the top 14% and bottom 35% with their own UI.
// Keep anything people must read between these two lines.
export const SAFE_TOP = 270;
export const SAFE_BOTTOM = 1250;
