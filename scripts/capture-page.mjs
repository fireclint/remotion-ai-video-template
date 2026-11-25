// Screenshots a web page (a news report, say) for on-screen receipts, with ads, trackers and consent
// pop-ups blocked so the capture doesn't stall, at 2x so the text stays crisp when zoomed.
//   node scripts/capture-page.mjs <url> <out.png> [height in CSS px, default 4000]
// Crop what you show to the text: leave out site logos and article photos (CLAUDE.md: no real logos).
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [url, out, heightArg] = process.argv.slice(2);
if (!url || !out) {
  console.error("Usage: node scripts/capture-page.mjs <url> <out.png> [height]");
  process.exit(1);
}
const WIDTH = 1000;
const HEIGHT = Number(heightArg ?? 4000);
const PORT = 9300 + Math.floor(Math.random() * 500);
const BLOCK = [
  "*doubleclick*", "*googlesyndication*", "*adservice*", "*adsystem*", "*taboola*", "*outbrain*", "*dianomi*",
  "*googletagmanager*", "*google-analytics*", "*consent*", "*cmp.*", "*quantserve*", "*scorecardresearch*",
  "*chartbeat*", "*pubmatic*", "*rubiconproject*", "*criteo*", "*prebid*", "*connatix*", "*primis*", "*ads.*",
];

const chrome = spawn(path.join(process.cwd(), "scripts/chrome.sh"), [
  "--headless", `--remote-debugging-port=${PORT}`, "--hide-scrollbars", "--mute-audio", `--window-size=${WIDTH},2000`, "about:blank",
], { stdio: "ignore" });
const done = (code) => {
  chrome.kill("SIGKILL");
  process.exit(code);
};
setTimeout(() => {
  console.error("Timed out");
  done(1);
}, 90000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === "page");
  } catch {
    // The browser isn't listening yet.
  }
}
if (!target) {
  console.error("The browser didn't start");
  done(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
const events = [];
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method) events.push(msg.method);
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const n = ++id;
    pending.set(n, resolve);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await send("Network.enable");
await send("Network.setBlockedURLs", { urls: BLOCK });
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 2000, deviceScaleFactor: 2, mobile: false });
await send("Page.navigate", { url });
for (let i = 0; i < 75 && !events.includes("Page.loadEventFired"); i++) await sleep(200);
await sleep(2500);
// Anything fixed or sticky (cookie bars, sticky headers, chat bubbles) would sit over the text.
await send("Runtime.evaluate", {
  expression: `for (const el of document.querySelectorAll("body *")) { const p = getComputedStyle(el).position; if (p === "fixed" || p === "sticky") el.remove(); } window.scrollTo(0, 0);`,
});
await sleep(500);
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 } });
if (!shot.result?.data) {
  console.error("No screenshot", JSON.stringify(shot.error ?? shot));
  done(1);
}
fs.writeFileSync(out, Buffer.from(shot.result.data, "base64"));
console.log(`Wrote ${out}`);
done(0);
