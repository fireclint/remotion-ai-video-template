# Remotion AI Video Template

Make short vertical videos with Claude Code. You film yourself talking and cut out the mistakes in any editor. Claude Code takes it from there: it transcribes your words, then builds the graphics, captions, sound effects and transitions on top as code with [Remotion](https://www.remotion.dev), each one timed to the exact word you say it on.

What's included:

- **Word-level transcription** with Whisper, run locally. Every graphic hangs off a spoken phrase, so when you re-cut a video, everything re-syncs itself.
- **Three layouts** a video switches between: you full-frame, a split screen with a graphic panel above you, and full-screen inserts such as screen recordings.
- **A kit of animated pieces:** huge hook words, number counters, fact cards, source lines, an end card, screen-recording inserts, captions that highlight the word being spoken, and paint-pen drawings that sit *behind* you.
- **Scripts** that find the cuts between your takes, cut you out of the background, track your face and the background, and pick the sharpest frames for thumbnails.
- **A starter video** that shows every piece, using a generated silhouette instead of real footage.
- **`CLAUDE.md`**, the instructions Claude Code follows: the workflow, the style rules and the checks to run before a video is done.

## Requirements

- **macOS.** Cutting you out of the background and tracking your face use Apple's Vision framework, and the starter's demo voice uses macOS's `say`.
- **Node.js** 20.19 or later (or 22.13+, or 24+).
- **ffmpeg:** `brew install ffmpeg`
- **Xcode Command Line Tools:** `xcode-select --install` (for the Swift scripts, and to build Whisper)
- **[Claude Code](https://claude.com/claude-code)**
- About **2 GB of free disk** for Whisper's model, which downloads the first time you transcribe a video.

## Install

```bash
git clone <this repo's URL> my-videos
cd my-videos
npm install
npm run starter   # builds the starter's demo footage and five sound effects (local only, never committed)
npm run dev       # opens Remotion Studio in your browser
```

In Studio, open the `starter` folder and play `Starter-Final`. To render it to a file:

```bash
./render.sh starter final   # → out/starter/
```

## One-time setup: your look

The template ships with placeholder colors, fonts and channel name, all in `src/shared/theme.ts`. Open Claude Code in this folder and paste this:

```text
Set up this template with my channel's look. Ask me these one at a time, and wait for each answer:

1. My channel name, for the end card.
2. My colors, as hex codes (or describe them and suggest hex codes):
   - background (panels and cards)
   - text on that background
   - accent: the word being spoken and anything emphasized. White text sits on it, so it must be dark enough for that.
   - a lighter accent for small labels on the background
   - a highlight color I'll use rarely, for wins
3. My fonts, both from Google Fonts: one for headlines and captions, and a monospace one for numbers and labels. If I'm not sure, suggest three pairs.

Then update src/shared/theme.ts: replace every PLACEHOLDER, swap the two font imports for mine with
weights each font actually has, and remove the PLACEHOLDER markers. Warn me if any text won't be
readable on its background. Run npm run lint, render the starter with ./render.sh starter final, and
show me the thumbnail so I can see the new look.
```

## Make a video

1. Film vertical (9:16). Cut out mistakes and long pauses in any editor, then export one file at the frame rate you filmed (usually 30 fps).
2. Put it in `inbox/`, for example `inbox/my-first-video.mp4`. If you have a screen recording for it, put it beside it as `inbox/my-first-video-screen.mov`.
3. Open Claude Code in this folder and paste the prompt below, filled in.

```text
New video: <short name, e.g. my-first-video>
Footage: inbox/<file>
Screen recording: inbox/<file> (or: none)
What it's about: <one or two sentences>
What I want on screen: <the moments that need a graphic: a number, a list, a quote, the screen recording…>
End card call to action: <one line, e.g. "Follow for more">
Thumbnail text: <two or three words, or "suggest some">

Follow CLAUDE.md. Load the footage with ./sync.sh, read the transcript, look at the footage,
and pitch me the concept before you build anything. Once I approve it, build it from src/starter,
hide every cut between takes, run the checks, render it, and tell me what to watch and listen for.
```

Re-cut a video later? Export it again to `inbox/` and tell Claude Code: `I re-cut <name>: inbox/<file>. Re-sync it and fix anything that moved.`

## Render

```bash
./render.sh <video>              # the finished video, a version without captions, the thumbnail, and every graphic on its own
./render.sh <video> final        # just the finished video, the version without captions, and the thumbnail
./render.sh <video> <GraphicId>  # one graphic, by its id in Studio
```

Everything lands in `out/<video>/`:

- `<Name>-FINAL.mp4` and `<Name>-thumbnail.png`: ready to post.
- `overlays-alpha/`: each graphic as ProRes 4444 with transparency, to stack on your footage in an editor.
- `overlays-greenscreen/`: the same graphics on green, for editors that can't read transparency.
- `inserts/`: full-screen cutaways.

## What stays on your machine

`.gitignore` keeps your footage, audio, transcripts, renders, each video's folder and any `.env` file out of git. Only the shared kit (`src/shared/`), the starter (`src/starter/`) and the tooling are versioned, so you can push your copy without publishing your videos.

## Licenses

The code in this repository is MIT licensed: see [LICENSE](LICENSE).

Remotion has its own license. It's free for individuals and for companies of up to 3 people; larger companies need a Remotion company license. Read the [Remotion license FAQ](https://www.remotion.dev/docs/license/faq) before you use this for a business.

Whisper and its model are downloaded the first time you transcribe a video, under their own licenses. Fonts come from Google Fonts. The starter's sound effects are synthesized on your machine by `npm run starter`. If you add your own sounds, check each one's license before you publish.

---

Made by Clint · CodeCommerce

YouTube: [`YOUR_YOUTUBE_LINK`](https://www.youtube.com/channel/UCmT9TwcIb_yAe7-Uqhn3fBA) · Skool: [`YOUR_SKOOL_LINK`](https://www.skool.com/codecommerce-builders-7248)
