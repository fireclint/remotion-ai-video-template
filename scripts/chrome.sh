#!/usr/bin/env bash
# Starts Remotion's headless browser with its GPU work inside the main process. render.sh uses this.
# On some Macs the browser's separate GPU process can stall, and then every render dies after 30 seconds
# with: A delayRender() "Waiting for root component to load" was called but not cleared.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
browser="$(find "$root/node_modules/.remotion/chrome-headless-shell" -type f -name chrome-headless-shell -perm +111 2>/dev/null | head -1)"
if [[ -z "$browser" ]]; then
  echo "Remotion's browser isn't installed. Run: npx remotion browser ensure" >&2
  exit 1
fi
exec "$browser" "$@" --in-process-gpu
