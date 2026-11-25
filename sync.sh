#!/usr/bin/env bash
# Loads a new or re-edited cut into a video and re-syncs everything to its words.
#
#   ./sync.sh my-video inbox/my-video.mp4
#
# Then render with ./render.sh <video> final. If a cue phrase is missing from the new take,
# the render stops and names the phrase it couldn't find.
set -euo pipefail
cd "$(dirname "$0")"

VIDEO="${1:?Which video? e.g. ./sync.sh my-video inbox/my-video.mp4}"
CUT="${2:?Which video file? e.g. ./sync.sh my-video inbox/my-video.mp4}"

node scripts/prep-footage.mjs "$VIDEO" "$CUT"
node scripts/transcribe.mjs "$VIDEO"
node scripts/clean-captions.mjs "$VIDEO"
