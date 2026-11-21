# Help with the Bible

A SvelteKit 3 Bible reader using TypeScript, Tailwind CSS 4, Sveltewind, and the Vercel adapter. Everything deploys as one Vercel site. There is no chat, follow-up question service, model server, microphone input, or external AI API.

Genesis 1 is currently available: read all 31 verses, listen with a standard device voice, and finish with a written or spoken editorial summary. Progress is saved locally. The remaining Bible chapters are not included yet.

## Development

Use Node.js **22.x** (22.17 or newer within that major version) and npm.

```sh
npm ci
npm run dev
```

```sh
npm run check      # Svelte, TypeScript, and service-worker type checks
npm test           # Reading, narration, motion, and offline-cache tests
npm run lint       # Prettier formatting check
npm run format     # Apply formatting
npm run build      # Vercel production output
npm run verify:pwa # Verify the emitted worker with its simulated network disabled
npm run preview    # Serve the production build locally
npm run icons      # Regenerate app icons
```

## Environment variables

**None are required.** You do not need a `.env` file, OpenAI key, Hugging Face token, Groq account, or Upstash database. The former AI question endpoint and its environment configuration were removed. If you added those credentials to Vercel for this project, they are no longer used and can be removed.

Device speech uses the browser/operating system. Some voices may use the device vendor's network service; no voice credentials are needed by this app. The optional prerecorded MP3 is served directly by Vercel.

## Vercel deployment and install failure fix

Import this repository into Vercel using the SvelteKit framework preset, `npm run build`, and the framework-default output directory. `package.json` pins Node.js to `22.x`, avoiding automatic upgrades to a later major version. See [Vercel's Node version settings](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

The reported install failure came from `kokoro-js` pulling in `onnxruntime-node`, whose Linux installer attempted to download CUDA binaries. The site only needs the committed MP3, so all speech-generation dependencies and scripts have been removed from the project. Normal `npm ci` does not install ONNX, Transformers, Kokoro, or CUDA. No model download or synthesis occurs during deployment.

All current pages are prerendered. The Vercel adapter is configured in `vite.config.ts`; the app output is written to `.vercel/output`.

## Reading and voice

The reader begins at Genesis 1:1. Verse position, completed chapters, and reading preferences are stored in this browser. No account or device sync is used. Clearing browser data removes the saved place; different Vercel preview/custom domains have separate storage.

**Standard device voice** is the default. Select Read or Listen and choose an installed English voice when available. Device speech reads the stored verse text, then announces that the following summary is commentary and reads it. Stopping speech preserves the current verse; restarting begins that verse again. The summary also has its own Listen control.

Standard browser speech is not reliable with an iOS screen lock or background suspension. The optional **Bundled recording · background listening** setting uses one persistent native audio element for a continuous chapter-and-summary MP3. It supports Media Session play/pause/seek controls and survives navigation. The recording is already included with the site; a model server is not required. Real iPhone/Android background playback still needs device testing. A download link is also provided.

The prerecorded alternative uses Kokoro Heart, a synthetic voice generated previously from the [open Kokoro model](https://huggingface.co/hexgrad/Kokoro-82M). No voice is cloned. Source attribution is in `static/audio/NOTICE.txt`. Audio checksums and verse cues live in `src/lib/bible/genesis-1-audio.json`. The recording ends after the editorial summary, without a follow-up question.

## PWA and offline behavior

Open `/install` for platform instructions. Use Chrome/Edge's install option on desktop, Chrome's install menu on Android, or Safari's Share → Add to Home Screen on iPhone/iPad. Install from the production HTTPS domain before beginning a long reading journey: some platforms separate installed-app storage from browser-tab storage. [Installation guidance](https://web.dev/learn/pwa/installation).

The manifest includes desktop/Android icons, a separate maskable icon, and an Apple touch icon. Safe-area spacing supports devices with display cutouts. The native SvelteKit 3 worker precaches the three pages, JavaScript/CSS, icons, and bundled recording after the first online setup. Standard device voices may require internet; the downloaded recording works offline while browser storage is retained.

The worker serves byte ranges for known cached audio, including Safari's open and suffix ranges. Updates wait for the reader to choose Update app. A previous deployment cache is retained for other open tabs; failed new downloads do not replace the working cache. Local reading progress is preserved during updates.

Worker registration is disabled in development. Test a production build with `npm run preview`, then run `npm run verify:pwa`. Automated tests cover actual cached build resources, offline audio bytes, progress, and motion behavior. Physical-device installation and audio checks are still required before release.

## Scripture and components

The provisional translation is the public-domain World English Bible, updated 66-book edition. Genesis 1 comes from [eBible's chapter source](https://ebible.org/engwebp/GEN01.htm), with its source URL and checksum recorded in the dataset. Verse wording and punctuation are preserved; layout whitespace is normalized and separate publisher footnotes are excluded from narration. Commentary is labeled separately from Scripture.

`node scripts/import-genesis.mjs` deliberately refreshes the chapter source. Review text changes and update any affected recording/cues before releasing; do not use a model to reconstruct Bible text.

Import components through `$lib/components`. The barrel re-exports `sveltewind/components` plus project components. The explicit `$lib` alias is configured in Vite and TypeScript; SvelteKit 3's native `#lib` imports remain available. The root layout initializes Sveltewind's minimal theme. Gold and neutral light/dark tokens live in `src/app.css`.

One Svelte 5 root attachment discovers semantic blocks and applies subtle scroll fades/slides, without animation attributes on individual components. It honors reduced motion and keyboard focus. Zoom gestures are restricted where the browser permits; browser accessibility overrides remain outside the site's control.
