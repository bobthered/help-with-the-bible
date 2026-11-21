# Help with the Bible

SvelteKit 3 project using Svelte 5, TypeScript 6, Tailwind CSS 4, and Sveltewind.

The landing page introduces a sequential Scripture-reading experience. `/read` includes all 31 verses of Genesis 1, a continuous Kokoro chapter-and-summary recording, local progress, editorial study notes, and typed/dictated questions. Live AI answers require the private server credentials below. The remaining Bible chapters are not included yet.

## Development

Requires Node.js 22.17 or newer and npm.

```sh
npm install
npm run dev
```

```sh
npm run check   # Svelte and TypeScript diagnostics
npm test        # Progress and Scripture integrity tests
npm run lint    # Prettier formatting check
npm run format  # Apply formatting
npm run build   # Production build for Vercel
npm run preview # Preview the production build locally
npm run verify:pwa # Verify the built worker with the network disabled in a test harness
npm run icons   # Regenerate PNG app icons from the project book mark
npm run narration # Regenerate the committed chapter/summary MP3 and verse cues locally
```

## Components and themes

Import UI components through the project barrel:

```ts
import { Button, H1, P, ThemeToggle } from '$lib/components';
```

`src/lib/components/index.ts` re-exports every component from `sveltewind/components` alongside project components. Vite and TypeScript explicitly configure `$lib`; SvelteKit 3's standard `#lib` subpath imports remain available for other modules.

The root layout imports `src/app.css` and initializes a cloned Sveltewind `minimal` preset. The stylesheet imports Tailwind and Sveltewind palettes, scans the library's distributed source, and enables dark variants using `data-theme`.

`@lucide/svelte` is installed explicitly because Sveltewind components import it without declaring it as a runtime dependency.

`src/app.html` sets `data-color="gold"`. The custom 50-950 gold scale, neutral secondary colors, contrast foregrounds, semantic surface tokens, and responsive editorial page styles live in `src/app.css`.

- Light: white background, near-black text, dark gold text accents.
- Dark: near-black background, white text, light gold text accents.
- Primary: gold `#c9a227` with near-black text.

The theme toggle saves an explicit preference in browser storage. On first visit, the theme follows the system preference. The initial theme is applied before rendering to avoid a light/dark flash.

Sveltewind setup references: [installation and configuration](https://github.com/sveltewind/sveltewind#installation), [themes and palettes](https://github.com/sveltewind/sveltewind#styles-colors-and-dark-mode). The requested documentation website, https://www.sveltewind.com, returned a site-not-found response during initialization, so configuration was verified against the official repository and installed package.

## Vercel

Import this repository into Vercel and select the SvelteKit framework preset. Use `npm run build` and leave the output directory at the framework default. The Vercel adapter is configured in `vite.config.ts` and produces `.vercel/output` during the build. Use a supported Node.js version satisfying the package's `engines` requirement.

The landing, reader, and installation pages are prerendered for reliable offline caching. `/api/study` runs on Vercel for live question answers; it is excluded from offline caching.

Application and worker compilation pass locally. On this Windows account, the adapter's final API-function packaging requires symlink permissions that are unavailable (`EPERM`); no OS settings were changed. The standard Vercel adapter remains configured for deployment on Vercel's build environment.

To enable live answers, copy `.env.example` to `.env` for local development, or configure private Vercel environment variables and redeploy:

- `OPENAI_API_KEY`: the application's API key, never a public/client variable.
- `OPENAI_MODEL`: defaults to `gpt-4.1-mini`; select and evaluate another supported text model if desired.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: a Redis REST endpoint and write token for a durable 10-question-per-IP hourly limit. The endpoint fails closed if the limiter is unavailable.

No credentials are committed. The interface reports when live answers are unavailable; the three editorial study notes still work offline. Set provider project spending limits before exposing the paid endpoint. Each question is independent; conversation history and reading progress are not sent to OpenAI. Model calls use `store: false`. [OpenAI text model](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [Redis REST setup](https://upstash.com/docs/redis/features/restapi).

## Installable app and offline reading

The app is a PWA for desktop, iOS/iPadOS, and Android. Open `/install` for instructions and a native install button when the browser offers one. Serve it over HTTPS on the Vercel production domain; `localhost` is also accepted for local testing. Native service-worker registration is disabled in development, so test offline behavior using a production build and `npm run preview`.

- **PC/desktop:** use the install icon or menu in Chrome or Microsoft Edge.
- **iPhone/iPad:** open in Safari, choose Share, then Add to Home Screen. Enable Open as Web App if offered.
- **Android:** use Chrome's install prompt or menu option for Install app/Add to Home screen.

Browser installation behavior varies; the app keeps manual guidance available even without a native prompt. Some platforms isolate installed-app storage from browser tabs, so install before starting a long reading journey. Progress remains local, with no automatic sync between PC and mobile devices. [PWA installation guidance](https://web.dev/learn/pwa/installation).

`static/manifest.webmanifest` declares the standalone app, stable identity, reading shortcut, and 192/512px PNG icons. It includes a separate maskable Android icon; Apple devices use the 180px touch icon. Regenerate the icons with `npm run icons`. The page metadata and safe-area spacing support home-screen launches and devices with display cutouts. [Manifest icon formats](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons).

The native worker in `src/service-worker/index.ts` precaches the production JavaScript/CSS, icons, manifest, chapter MP3, offline fallback, and the three prerendered pages. Genesis text, its recorded chapter/summary, and editorial study notes work offline after the first successful setup, even if the reader was not opened beforehand. `/install` shows when setup is ready. Initial installation needs a connection, and browser storage can later be cleared or evicted.

Only known public build resources are cached. APIs, POST requests, authenticated requests, non-audio byte ranges, and external resources bypass the worker. Cached narration supports single-range HTTP 206 responses, including Safari's open and suffix ranges; invalid ranges return 416. Unknown pages get a dedicated fallback when offline. Live AI answers and browser dictation need a connection. Device voices used for dynamic answers may also need network access.

The worker uses versioned caches and does not force a reload while reading. When a new worker is waiting, the app offers Update app. Accepting it activates the update and reloads the app; local reading progress is preserved. The previous deployment cache remains available for other open tabs. A failed precache download discards the incomplete new cache and leaves the working version intact. Vercel headers ensure browsers revalidate the worker and manifest. [SvelteKit service-worker support](https://svelte.dev/docs/kit/service-workers).

PWA checks:

```sh
npm run check
npm test
npm run build
npm run verify:pwa
npm run preview
```

The tests cover offline navigation, range responses, failed downloads, API bypass, update activation, narration checksums/cues, AI output validation, rate limits, and root-attachment motion behavior. `verify:pwa` executes the emitted production worker against the actual output files, disables its simulated network, and checks offline pages, icons, Scripture, and ranged MP3 playback data. These checks do not replace device testing.

Before public release, verify installation on Chrome/Edge desktop, Android Chrome, and iOS Safari; then launch the installed app offline, advance verses, close/reopen, and confirm progress resumes. Test portrait/landscape safe areas and narration on each device. For updates, keep one reading tab open while deploying a new version, accept Update app, and confirm the saved verse survives. Real-device installation and audio checks have not been performed in this development environment.

## Scripture source and exact text

The provisional translation is the World English Bible, updated 66-book edition (`engwebp`). The publisher dedicates the translation to the public domain and asks that changed text not be represented as the World English Bible. [Publisher and usage information](https://ebible.org/engwebp/).

`src/lib/bible/genesis-1.json` contains Genesis 1 from [eBible's chapter source](https://ebible.org/engwebp/GEN01.htm), including its source URL, edition, and source-file SHA-256. The importer preserves verse wording and punctuation, decodes HTML entities, normalizes layout whitespace, and excludes separate source footnotes and verse markers from the spoken text.

To refresh the chapter deliberately:

```sh
node scripts/import-genesis.mjs
npm test
```

Review the resulting text diff before accepting a source update. Future full-corpus imports should pin an official machine-readable source archive and checksum, preserve verse IDs and translation metadata, validate every book/chapter/verse count, and build a compact canon index plus per-chapter JSON. Load chapters independently rather than shipping the full Bible in the initial browser bundle. Never use an LLM to reconstruct, complete, or quote the reading text.

The 1,189-chapter journey follows the provisional 66-book canon. Confirm the translation and canon before expanding the import; different traditions and editions can require a different index. Narration receives the same stored text that is displayed. Device pronunciation and voice quality vary; if exact recorded delivery is essential, use audited recordings aligned to those verse IDs.

## Progress and reading flow

`src/lib/reading/progress.ts` validates a versioned record at `help-with-the-bible:progress:v1`. It records translation, chapter, current verse, reading/summary phase, and completed chapter IDs. Only client mount and user/audio events access storage, so server rendering never shares one reader's progress with another. Invalid data falls back to Genesis 1:1; denied storage produces a visible session-only notice.

Progress advances with the Next verse button or successful narration completion. Merely opening a chapter does not complete it. Finishing the last verse reveals the overview. In the full reader, a separate Continue button after the overview/questions should move to the next indexed chapter; the final chapter should end the journey without wrapping back to Genesis.

Local storage is scoped to the browser and site origin. Preview URLs, the Vercel production domain, and a later custom domain have separate progress. Clearing site data removes it, and it does not sync to other devices. Add validated JSON export/import before encouraging a long reading journey. See [localStorage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

## Recommended AI architecture

Use the OpenAI Responses API through a SvelteKit server endpoint on Vercel. This is an application API integration; visitors should not need to open ChatGPT or run an LLM. Keep the provider behind a small server-only interface so another hosted provider or a separately hosted model can be substituted. Start with a configurable text model and choose it using a set of Bible-study evaluation questions before fixing quality/cost targets. [OpenAI text generation](https://developers.openai.com/api/docs/guides/text), [API quickstart](https://developers.openai.com/api/docs/quickstart).

A local Ollama model is useful for private development but requires a running model server; its default local API is on the developer's machine. My recommendation for the public Vercel site is a hosted API, avoiding a separate always-on inference service or large model downloads on visitors' devices. Self-hosting remains an option if infrastructure and privacy requirements justify it. [Ollama deployment options](https://docs.ollama.com/api/introduction), [Vercel function constraints](https://vercel.com/docs/functions/limitations).

`/api/study` accepts `{ chapterId: "GEN.1", question }`, limits request size and question length, and resolves trusted chapter text on the server. It does not accept Bible text from the browser. The model is instructed to separate observation from interpretation, cite supporting verses, acknowledge differing readings, and identify uncertainty. Each request currently stands alone; bounded conversational context can be added later.

Use structured output such as `{ answer, references, uncertainty }`. Validate referenced verse IDs against the corpus, and render any Scripture quotes from the canonical dataset rather than the model's spelling. Schema validation checks shape and references, not theological correctness; evaluate answers against reviewed examples and review summaries editorially. Cross-chapter questions can use a constrained passage lookup tool over the canonical dataset. A vector database is unnecessary for the initial chapter-scoped flow. [Structured output support](https://developers.openai.com/api/docs/guides/structured-outputs).

Keep `OPENAI_API_KEY` in private Vercel environment variables and server-only modules. Do not place keys in public environment variables or local storage. Before exposing a paid anonymous endpoint, add durable rate limits, bounded context/output, request cancellation/timeouts, and project spending controls; in-memory counters on serverless functions are insufficient. Tell readers when their question/context is sent to the AI provider. Do not send their entire reading history by default. [Production API guidance](https://developers.openai.com/api/docs/guides/production-best-practices).

Prefer prewritten or generated-and-reviewed chapter overviews served with the corpus. They are stable, fast, and do not require a fresh AI call after every chapter. Label all analysis separately from Scripture, as the current Genesis 1 overview does. Questions remain dynamic.

## Narration and spoken interaction

The committed recording uses the open Kokoro-82M model and its stock `af_heart` voice, generated locally with `kokoro-js`. No voice was cloned. One MP3 contains all 31 verses, a pause, a spoken announcement separating commentary from Scripture, and the overview/reflection. It is about five minutes and 2.3 MB. Visitors download the recording, not the speech model, and listening requires no TTS API key. [Kokoro model and license](https://huggingface.co/hexgrad/Kokoro-82M).

`npm run narration` downloads/caches the model under ignored `.cache/`, synthesizes the exact stored verse strings, and writes a content-addressed MP3 plus timing cues and checksums. The generator reuses cached waveforms, so repeated encoding does not repeat inference. Narration tooling is development-only; it is not imported by Vercel request handlers. Regenerate after changing Scripture/summary text and review the audio before releasing it; automated checksum/timing checks do not prove spoken-word accuracy.

`AudioPlayer.svelte` owns a persistent native `<audio>` element at the root layout. It remains mounted during navigation and requests the playback audio-session type where supported. Media Session handlers provide lock-screen play/pause/seek controls. Verse position is derived from media time rather than JavaScript timers, and returning from the background catches up the reader and stored progress. The summary is part of the same media resource, so it does not need a new JavaScript-initiated track when iOS suspends the page. [Media Session controls](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API), [audio-session types](https://www.w3.org/TR/audio-session/).

The intended background case is locking the screen or switching to another app after starting playback. Playback begins with a user gesture. Operating-system interruptions, browser suspension, battery modes, and eviction still need real-device testing, especially on iOS; no iPhone background-playback test was possible here. The implementation does not promise continued playback after force-quitting. A download link also lets readers use their device's audio player.

Read & type and Listen & speak modes are saved locally. Finishing a chapter in voice mode starts the recorded summary; normal playback already flows into it. The summary also has a Listen button. Chapter study notes and live AI answers can be spoken using a selectable English device voice. These dynamic voices can sound different from the recorded Kokoro voice and are foreground-oriented.

Microphone dictation uses feature-detected browser `SpeechRecognition`/`webkitSpeechRecognition`, with permission/error handling and typing fallback. Audio is processed by the browser's recognition service, which can be remote. In text mode, review/edit the transcript before submitting; in voice mode, a completed spoken question is submitted automatically and its answer is read aloud. Starting a question pauses narration; it is not resumed automatically over the answer. Support depends on the browser; server-side recording/transcription or Realtime is a future option for broader voice support. [Recognition support](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

## Root motion and zoom behavior

`revealOnScroll` is attached once to the root wrapper in `+layout.svelte`. It uses intersection/mutation observers to discover semantic page blocks after navigation and reveal offscreen blocks with a 12px slide and 420ms fade. No animation attributes are added to individual component markup. It preserves initial-viewport visibility, reveals keyboard-focused content immediately, respects reduced motion, and cleans up observers/animations.

Viewport limits, root gesture handling, and touch-action prevent application pinch/double-tap zoom where permitted; form controls remain at least 16px to avoid iOS focus zoom. Browser/OS accessibility overrides and browser chrome zoom remain outside a site's complete control.

## Delivery sequence

1. Confirm translation/canon; import and validate the full corpus, then add sequential chapter navigation and progress export/import.
2. Configure private AI/rate-limit credentials and evaluate live chapter questions; publish reviewed overviews alongside the full corpus.
3. Consider server transcription and hosted natural answer speech/Realtime if device dictation/voices do not meet quality and browser-support needs.
4. Verify iOS locked-screen playback across the chapter-to-summary boundary, Android/desktop media controls, mobile layouts, reduced motion, blocked storage, and microphone permissions on actual devices before public launch.
