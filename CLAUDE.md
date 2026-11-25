# Short vertical videos

Talking-head videos (someone speaking to a phone camera) with animated graphics, for short vertical video. The footage is filmed and cut elsewhere. Everything on top of it (graphics, captions, sound effects, transitions) is code, built with Remotion.

## Before the first video

The channel name, colors and fonts live in `src/shared/theme.ts`. Out of the box they are placeholders, each marked `PLACEHOLDER`. If any are still there when a video is started, say so and offer the one-time setup in `README.md` first, so the video isn't built in the wrong look.

## Workflow

1. Film vertical (9:16), cut mistakes and pauses in any editor, and export one MP4 or MOV into `inbox/` (`inbox/my-video.mp4`), with any screen recording beside it (`inbox/my-video-screen.mov`). Export at the frame rate you filmed (usually 30 fps).
2. Load it with `./sync.sh <video> inbox/my-video.mp4`. This prepares the footage in `public/<video>/` and writes a word-level transcript to `src/<video>/data/`, so no script is needed. The first run downloads Whisper and its model (about 1.5 GB).
3. Read the transcript and look at the footage with `scripts/contact-sheet.mjs`. Pitch the concept before building it, unless the prompt says the concept is already approved.
4. Copy `src/starter/` to `src/<video>/`, leaving out `data/`. Rename the starter's ids (`Starter-…` compositions, `StarterFinal`, `StarterThumbnail`, `StarterCompositions`, `STARTER_GFX`, `StarterGfxId`, the `starter` folder names) and the `starter/cutout.webm` path, add a line to `src/Root.tsx`, and add a case to `render.sh`.
5. Find the cuts between takes with `node scripts/find-cuts.mjs <video>`. Land layout switches or scribble wipes on them so the jumps don't show.
6. If drawings go behind the speaker, run `node scripts/cutout.mjs <video>`, then `node scripts/track-scene.mjs <video> <bottom px> [shot cuts…]`.
7. Run the checks below, render with `./render.sh <video>`, and have the person watch and listen.

## Commands

```bash
npm run dev                                      # Remotion Studio: one sidebar folder per video
npm run lint                                     # eslint and tsc
npm run starter                                  # rebuild the starter's demo footage and sound effects
./sync.sh <video> inbox/my-video.mp4             # load a new or re-edited cut and transcribe it
./render.sh <video>                              # finished video, thumbnail and every separate graphic
./render.sh <video> final                        # just the finished video and thumbnail
./render.sh <video> <GraphicId>                  # one graphic
node scripts/find-cuts.mjs <video>               # where the cut jumps between takes
node scripts/cutout.mjs <video>                  # the person cut out of the background (Apple Vision)
node scripts/track-scene.mjs <video> <px> [cuts] # how the background moves. Keep the person below <px>
node scripts/track-face.mjs <video>              # where the face is, for bubbles and placing graphics
node scripts/sharpest-frames.mjs <video>         # crispest frames, for thumbnails
node scripts/contact-sheet.mjs <file> <out.png> <columns> <width> <seconds…>  # grid of frames
node scripts/capture-page.mjs <url> <out.png>    # screenshot a web page for on-screen sources
```

`cutout.mjs` and `track-face.mjs` use Apple's Vision framework through Swift, so they need macOS.

## Layout

The same name is used everywhere for one video:

- `inbox/`: raw exports and screen recordings, as they come in
- `public/<video>/`: footage (`aroll.mp4`, `aroll-last.png`, `cutout.webm`, a converted `screen.mp4`)
- `src/<video>/`: `plan.ts` (timing, layouts, graphics, camera, sound effects), `graphics/`, `data/` (generated)
- `out/<video>/`: finished files
- `public/sfx/`: sound effects
- `src/shared/`: `theme.ts`, `layout.tsx` (FACE/SPLIT/FULL), the pieces below, `fx.tsx` (camera moves, footage, cutout layer), `cues.ts`, `MarkerCaptions.tsx`, `Kinetic.tsx`, `cover.tsx`, `faces.tsx`, and the paint-pen kit in `ink.tsx` and `ScribbleWipe.tsx`

`src/starter/` is the template, and shows every piece and all three layouts. Its footage is a generated silhouette and synthetic speech (`npm run starter`), so it holds nothing real.

Only `src/shared/`, `src/starter/` and the tooling are in git. Each video's folder, all footage, audio, transcripts, renders and `.env` are gitignored, so a new video won't show up in `git status`. That is intended.

## The look

One consistent look on every video, set in `theme.ts`. These are the template's defaults; change any of them to suit the channel.

- **Colors:** always from `C` in `theme.ts`, never hard-coded in a graphic. `C.bg` for backgrounds and panels, `C.text` for text on it, `C.accent` for emphasis, highlights and the word being spoken, `C.accentLight` for small text on dark. `C.highlight` is rare: only "it worked" or money moments. Red, green and amber are for states such as errors and success.
- **Type:** `fontFamily` for headlines and captions, `MONO` for numbers, code and labels.
- **Style:** flat color only: no gradients, glows, or stock "AI" imagery such as robots, brains or circuit textures. Motion is fast and crisp: entrances settle with little overshoot, exits take 6-8 frames (`EXIT` in `anim.ts`), and nothing floats idly. Most graphics are flat cards and type.
- **Paint pen:** an accent only. Scribble wipes hide cuts, plus the occasional hand-drawn circle (`sketchRing`) or underline.
- **No real company logos.** Name companies in text.

The pieces, all in `src/shared/`:

- `HookText`: one to three huge words that slam in on a cue, with an optional mono line under them.
- `NumberCounter`: counts between values with an ease-out, with thousands separators and an optional prefix or suffix.
- `TextCard`: a short fact on a dark panel with an accent rule and an optional label or list. `TextCards` stacks several, one at a time.
- `SourceTag`: a small "Source: …" line at the bottom-left of the safe area. It moves to the panel's top-left during SPLIT.
- `EndCard`: the channel's wordmark (`CHANNEL_NAME`) plus a one-line call to action.
- `ScreenInsert`: a full-screen screen recording, muted and sped up to fit, with a label.
- `Receipts`: screenshots of a source (`capture-page.mjs`), its key words underlined and highlighted as they're said.

## How a video is put together

- **Timing hangs off spoken words.** Everything in `plan.ts` comes from `at("phrase")`, so a re-edited cut re-syncs itself. If a phrase goes missing, the render stops and names it. Cuts come from `find-cuts.mjs` and go through `cutBefore`, which stops the render if a re-edit has moved them.
- **Three layouts,** listed in a plan's `LAYOUT` and switched on a cue: FACE (the speaker full-frame), SPLIT (a panel over the top half while the footage slides down by `SPLIT_SHIFT`; tune that so the head sits just below the panel), and FULL (a full-screen insert while the speaker's audio keeps playing). Mark a graphic `split: true` to draw it on the panel.
- **Layers, bottom to top:** footage, "behind" drawings, the speaker's cutout, the SPLIT panel and its graphics, "front" overlays, captions, full-screen inserts, then the "top" layer: source lines, wipes, and any split graphic that must stay up while an insert comes in under it. See `StarterFinal.tsx`. The cutout takes the same camera moves and SPLIT slide as the footage, or the two come apart.
- **Hide every cut between takes.** Land a layout switch on it, start an insert just before it, or put a scribble wipe there. The frame is solid at a wipe's midpoint, so anything that changes there can't be seen. Trimmed pauses leave small jumps mid-sentence too; a wipe there would cover the face, so make those zoom cuts (a punch change on the cut frame). Punch in on alternate FACE beats. In SPLIT keep punches to about 4%, grown from the face, so the head stays below the panel.
- **Framing decides positions.** Measure each new cut with `track-face.mjs` and a contact sheet. For example, with the face centre at about 44% of the height (hair near y 500, chin near y 1100), captions sit at about y 1150, `SPLIT_SHIFT` is about 550 and the end card goes at y 1130.
- **Captions** sit on the chest in FACE and inside the panel in SPLIT. They step aside when the same words are already big on screen, during full-screen inserts and under the end card.
- **Drawings stick to the background** with `useSticky` and `scene.json`. A clip using it must stay inside one shot.

## Before calling a video done

- Look at contact sheets of every beat. Check nothing important is hidden by the head, especially during a zoom.
- Measure the audio with `ffmpeg -hide_banner -nostats -i <file> -af ebur128=peak=true -f null -`. Aim for about -14 LUFS with peaks under -1 dBFS. A sound effect over a loud word can clip, so check peaks after adding any.
- You can't hear audio. Say so, and ask the person to listen, especially to any new sound effect.
- Run `npm run lint`.

## Content rules

- **Thumbnails:** a relaxed or closed mouth with eyes on the lens; avoid mid-word frames ("oo", pursed lips), however expressive. Pauses between sentences give the best faces. Find sharp frames with `sharpest-frames.mjs`, then look at them, because sharpness says nothing about the expression. Save a couple of alternates. Render a thumbnail as a one-frame composition (see `src/starter/Compositions.tsx`). The face sits in the top third, so thumbnail type goes below the chin.
- **Plain words for anyone scrolling:** make sure short on-screen text can't be misread out of context. Check it against what's in the frame.
- **Accuracy:** tech claims go out of date quickly, so check facts before they go on screen. When a real product appears, use real screens or an accurate rebuild, and never imply features it doesn't have. A source line must only sit under the facts it's the source for.
- **No words beyond the script:** on-screen text comes from what's said in the video or from the prompt.
- **Keep it moving.** A static stretch loses viewers: a card alone on screen for several seconds feels long. Keep the speaker on screen (SPLIT, with the panel building word by word as it's said) and save FULL for inserts that move on their own, such as screen recordings. Something on screen should change every couple of seconds.

## Limits

- **Vertical only.** Everything is 1080×1920. `prep-footage.mjs` crops other shapes and warns. A 16:9 version would need `theme.ts` and the many layouts that assume 1080×1920 to change.

## Things to watch for

- **Whisper mishears names and jargon,** often turning a product name into a common word. Correct them in `src/<video>/data/fixes.json`, then rerun `node scripts/clean-captions.mjs <video>`. A fix with the same number of words keeps each word's timing. Ask when unsure of a name.
- **Whisper adds stray marks.** It can wrap words in quote marks or leave tokens like `[BLANK_AUDIO]`. Scan `captions.json` after each sync.
- **Exports that don't match the footage.** An export at 24 fps from 30 fps footage judders: ask for a re-export at the filmed frame rate. Some editors end on a black frame: check `aroll-last.png`, and if it's black, end the video a frame earlier than `FOOTAGE.durationSec`.
- **Soft screen recordings.** A recording that went through a mismatched editor canvas can arrive at a big size with little real detail. Before converting, look at a 1:1 crop of one frame. To find the real detail, downscale it, scale it back up, and compare with ffmpeg's `ssim`: detail holds until the downscale passes the real resolution. A soft recording can't be sharpened back, and cropping in only makes it look zoomed and blurrier. Show a vertical recording whole, edge to edge (`ScreenInsert`'s `fill`), with a light `unsharp`. Better still, ask for the original capture, or an export on a 9:16 canvas.
- **Secrets in screen recordings.** Watch for API keys, tokens, emails and private repos. The surest fix is to trim them away, or erase them in place with ffmpeg's `delogo` while converting to H.264 in `public/<video>/screen.mp4`, so they never enter the project. Check each spot stays put for the whole clip; otherwise hide them with a full-screen cover from `cover.tsx`, and use `assertCovered` so the render stops if the range isn't fully covered.
- **Renders that time out.** If you see `A delayRender() "Waiting for root component to load"`, the browser's separate GPU process has stalled, which happens on some Macs. `scripts/chrome.sh` works around it and `render.sh` already uses it. Direct `npx remotion render`, `still` or `compositions` commands need `--browser-executable=$PWD/scripts/chrome.sh`. A render that stops with `Timeout … Fetching … aroll.mp4` usually works when simply run again. Don't pipe `render.sh` through `tail`: that hides its exit code.
- **`<Still>` runs at 1 fps,** which turns `trimBefore` frame numbers into seconds. Use a one-frame `<Composition>` instead.
- **Footage must go through `OffthreadVideo`.** Chrome's hardware decoder fails on macOS during renders.
- **Sound effects.** `public/sfx/` is gitignored. `npm run starter` synthesizes the five the starter uses (`marker`, `whip`, `whoosh`, `scribble`, `ding`). Add your own there, and check every sound's license before a video goes public, especially meme or brand sounds.
