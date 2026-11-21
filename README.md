# Help with the Bible

A SvelteKit 3 Bible reader using TypeScript, Tailwind CSS 4, Sveltewind, and the Vercel adapter. Everything deploys as one Vercel site. There is no chat, follow-up question service, model server, microphone input, or external AI API.

All **66 books and 1,189 chapters** of the World English Bible are available to read or hear with a standard device voice. Choose a book and chapter, or continue in order across books. Progress is saved locally. Written/spoken editorial summaries and the optional background recording currently cover **Genesis 1 only**; other chapters show a completion screen and let you continue without inventing commentary.

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

The reader begins at Genesis 1:1 and continues through Revelation 22. Book/chapter selectors and previous/next controls allow direct navigation. Verse position, completed chapters, and reading preferences are stored in this browser. Existing Genesis 1 saves remain valid. No account or device sync is used. Clearing browser data removes the saved place; different Vercel preview/custom domains have separate storage.

**Standard device voice** is the default and supports every chapter. Select Read or Listen and choose an installed English voice when available. Device speech reads the selected stored verses and announces completion. For Genesis 1 it also labels and reads the editorial summary. Stopping speech preserves the current verse; restarting begins that verse again. Narration stops after the selected chapter; use Continue to start the next one.

Standard browser speech is not reliable with an iOS screen lock or background suspension. The optional **Bundled recording · Genesis 1 only** setting uses one persistent native audio element for its continuous chapter-and-summary MP3. It supports Media Session play/pause/seek controls and survives navigation. Other chapters use device speech; no full-Bible background audio is bundled. Real iPhone/Android background playback still needs device testing. A download link is provided for the Genesis 1 recording.

The prerecorded alternative uses Kokoro Heart, a synthetic voice generated previously from the [open Kokoro model](https://huggingface.co/hexgrad/Kokoro-82M). No voice is cloned. Source attribution is in `static/audio/NOTICE.txt`. Audio checksums and verse cues live in `src/lib/bible/genesis-1-audio.json`. The recording ends after the editorial summary, without a follow-up question.

## PWA and offline behavior

Open `/install` for platform instructions. Use Chrome/Edge's install option on desktop, Chrome's install menu on Android, or Safari's Share → Add to Home Screen on iPhone/iPad. Install from the production HTTPS domain before beginning a long reading journey: some platforms separate installed-app storage from browser-tab storage. [Installation guidance](https://web.dev/learn/pwa/installation).

The manifest includes desktop/Android icons, a separate maskable icon, and an Apple touch icon. Safe-area spacing supports devices with display cutouts. The native SvelteKit 3 worker precaches the three pages, JavaScript/CSS, icons, **all 66 Scripture book files**, and the Genesis 1 recording after the first online setup. Wait for the app to report offline readiness before disconnecting. The roughly 5 MB of Scripture is stored in separate content-hashed book files; opening a chapter loads just its book rather than a full-Bible JavaScript bundle. Standard device voices may require internet; downloaded text and the recording work offline while browser storage is retained.

The worker serves byte ranges for known cached audio, including Safari's open and suffix ranges. Updates wait for the reader to choose Update app. A previous deployment cache is retained for other open tabs; failed new downloads do not replace the working cache. Local reading progress is preserved during updates.

Worker registration is disabled in development. Test a production build with `npm run preview`, then run `npm run verify:pwa`. Automated tests cover actual cached build resources, offline audio bytes, progress, and motion behavior. Physical-device installation and audio checks are still required before release.

## Scripture and components

The translation is the public-domain World English Bible, updated 66-book edition (without the Deuterocanon/Apocrypha), imported from the publisher's [verse-per-line archive](https://ebible.org/details.php?id=engwebp). Archive/text hashes and per-book file hashes are recorded in `src/lib/bible/catalog.json`. The dataset has 31,103 numbered entries, including empty verse slots supplied by the publisher. Words and punctuation are preserved; no Scripture is generated. Empty slots are labeled separately in the reader and skipped during speech. Publisher notes are not part of the verse text. The publisher's public-domain notice is included in `static/bible/engwebp/NOTICE.html`.

To deliberately refresh the complete dataset, run `python scripts/import-bible.py` (Python 3, standard library only), or pass a local `engwebp_vpl.zip` as its argument. The importer checks all book/chapter sequences and refuses to import if Genesis 1 differs from the existing recorded text. Review text changes and run formatting, tests, the production build, and PWA verification before releasing. Source retrieval is a maintenance task; builds and Vercel deployment use committed files and make no publisher/API requests.

Import components through `$lib/components`. The barrel re-exports `sveltewind/components` plus project components. The explicit `$lib` alias is configured in Vite and TypeScript; SvelteKit 3's native `#lib` imports remain available. The root layout initializes Sveltewind's minimal theme. Gold and neutral light/dark tokens live in `src/app.css`.

One Svelte 5 root attachment discovers semantic blocks and applies subtle scroll fades/slides, without animation attributes on individual components. It honors reduced motion and keyboard focus. Zoom gestures are restricted where the browser permits; browser accessibility overrides remain outside the site's control.
