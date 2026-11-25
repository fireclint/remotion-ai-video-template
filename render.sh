#!/usr/bin/env bash
# Renders one video into out/<video>/.
#
#   ./render.sh starter               everything for that video
#   ./render.sh starter final         just the finished video and its thumbnail
#   ./render.sh starter Starter-Hook  one graphic (any id in that video's Studio folder)
#
# out/<video>/overlays-alpha/        .mov ProRes 4444 with transparency → track ABOVE your footage
# out/<video>/overlays-greenscreen/  same graphics on #00FF00 → if your editor shows a black box
# out/<video>/inserts/               full-screen cutaways (.mp4)
set -euo pipefail
cd "$(dirname "$0")"

VIDEO="${1:?Which video? starter}"
ONLY="${2:-}"
OUT="out/$VIDEO"

BROWSER="--browser-executable=$PWD/scripts/chrome.sh"
render() { echo "→ $2"; npx remotion render build "$@" "$BROWSER" --log=error; }
still() { echo "→ $2"; npx remotion still build "$@" "$BROWSER" --log=error; }

# A new video adds a case here.
case "$VIDEO" in
  starter)
    if [[ ! -f public/starter/aroll.mp4 ]]; then
      echo "The starter's footage isn't there yet. Run: npm run starter" >&2
      exit 1
    fi
    OVERLAYS=(Starter-Ring Starter-Hook Starter-Count Starter-Source Starter-WipeIn Starter-WipeOut Starter-End)
    INSERTS=(Starter-Card)
    finals() {
      render Starter-Final "$OUT/Starter-FINAL.mp4" --crf=16
      render Starter-Final "$OUT/Starter-FINAL-nocaptions.mp4" --props='{"captions":false}' --crf=16
      still Starter-Thumbnail "$OUT/Starter-thumbnail.png"
    }
    ;;
  *)
    echo "Unknown video: $VIDEO (expected starter)" >&2
    exit 1
    ;;
esac

npx remotion browser ensure --log=error >/dev/null

echo "Bundling…"
npx remotion bundle --log=error >/dev/null
mkdir -p "$OUT/overlays-alpha" "$OUT/overlays-greenscreen" "$OUT/inserts"

if [[ -z "$ONLY" || "$ONLY" == "final" ]]; then
  finals
fi

# The odd-looking expansions keep an empty list from stopping the script on macOS's older bash.
for id in ${OVERLAYS[@]+"${OVERLAYS[@]}"}; do
  [[ -n "$ONLY" && "$ONLY" != "$id" ]] && continue
  render "$id" "$OUT/overlays-alpha/$id.mov" --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png
  render "$id" "$OUT/overlays-greenscreen/$id-GREEN.mp4" --props='{"bg":"green"}' --crf=12
done

for id in ${INSERTS[@]+"${INSERTS[@]}"}; do
  [[ -n "$ONLY" && "$ONLY" != "$id" ]] && continue
  render "$id" "$OUT/inserts/$id.mp4" --crf=14
done

echo "Done. Files are in $OUT/"
