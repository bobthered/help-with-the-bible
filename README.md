# Help with the Bible

SvelteKit 3 project using Svelte 5, TypeScript 6, Tailwind CSS 4, and Sveltewind.

The landing page introduces a sequential Scripture-reading experience. `/read` currently includes all 31 verses of Genesis 1, optional browser narration, versioned local progress, and a chapter overview. Full-Bible coverage, AI questions, and microphone input are planned; they are not connected in this release.

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

The landing, reader, and installation pages are prerendered for reliable offline caching. The Vercel adapter remains configured for future server-side question and voice endpoints. The complete production build has been verified, including Vercel packaging.

## Installable app and offline reading

The app is a PWA for desktop, iOS/iPadOS, and Android. Open `/install` for instructions and a native install button when the browser offers one. Serve it over HTTPS on the Vercel production domain; `localhost` is also accepted for local testing. Native service-worker registration is disabled in development, so test offline behavior using a production build and `npm run preview`.

- **PC/desktop:** use the install icon or menu in Chrome or Microsoft Edge.
- **iPhone/iPad:** open in Safari, choose Share, then Add to Home Screen. Enable Open as Web App if offered.
- **Android:** use Chrome's install prompt or menu option for Install app/Add to Home screen.

Browser installation behavior varies; the app keeps manual guidance available even without a native prompt. Some platforms isolate installed-app storage from browser tabs, so install before starting a long reading journey. Progress remains local, with no automatic sync between PC and mobile devices. [PWA installation guidance](https://web.dev/learn/pwa/installation).

`static/manifest.webmanifest` declares the standalone app, stable identity, reading shortcut, and 192/512px PNG icons. It includes a separate maskable Android icon; Apple devices use the 180px touch icon. Regenerate the icons with `npm run icons`. The page metadata and safe-area spacing support home-screen launches and devices with display cutouts. [Manifest icon formats](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons).

The native worker in `src/service-worker/index.ts` precaches the production JavaScript/CSS, icons, manifest, offline fallback, and the three prerendered pages. The bundled Genesis text and overview therefore work offline after the first successful setup, even if the reader was not opened beforehand. `/install` shows when offline setup is ready. Initial installation needs a connection, and browser storage can later be cleared or evicted.

Only known public build resources are cached. APIs, POST requests, authenticated requests, byte ranges, and external resources bypass the worker. Unknown pages get a dedicated fallback when offline. Browser narration may need a network-backed device voice, and future AI questions/transcription will require a connection. Background or lock-screen narration is not guaranteed across mobile platforms.

The worker uses versioned caches and does not force a reload while reading. When a new worker is waiting, the app offers Update app. Accepting it activates the update and reloads the app; local reading progress is preserved. The previous deployment cache remains available for other open tabs. A failed precache download discards the incomplete new cache and leaves the working version intact. Vercel headers ensure browsers revalidate the worker and manifest. [SvelteKit service-worker support](https://svelte.dev/docs/kit/service-workers).

PWA checks:

```sh
npm run check
npm test
npm run build
npm run verify:pwa
npm run preview
```

The unit tests simulate installation, offline navigation, failed downloads, API bypass, and update activation. `verify:pwa` executes the emitted production worker against the actual output files, disables its simulated network, and checks offline pages, icons, and Scripture inclusion. These checks do not replace device testing.

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

The next server endpoint should accept `{ chapterId, translationId, question, recentTurns }` with bounded lengths, then resolve trusted chapter text on the server. Never trust chapter content supplied by the browser. Provide that chapter and limited conversation context to the model, asking it to distinguish textual observation from interpretation, cite book/chapter/verse, acknowledge meaningful differences among traditions, and say when the supplied text does not establish an answer.

Use structured output such as `{ answer, references, uncertainty }`. Validate referenced verse IDs against the corpus, and render any Scripture quotes from the canonical dataset rather than the model's spelling. Schema validation checks shape and references, not theological correctness; evaluate answers against reviewed examples and review summaries editorially. Cross-chapter questions can use a constrained passage lookup tool over the canonical dataset. A vector database is unnecessary for the initial chapter-scoped flow. [Structured output support](https://developers.openai.com/api/docs/guides/structured-outputs).

Keep `OPENAI_API_KEY` in private Vercel environment variables and server-only modules. Do not place keys in public environment variables or local storage. Before exposing a paid anonymous endpoint, add durable rate limits, bounded context/output, request cancellation/timeouts, and project spending controls; in-memory counters on serverless functions are insufficient. Tell readers when their question/context is sent to the AI provider. Do not send their entire reading history by default. [Production API guidance](https://developers.openai.com/api/docs/guides/production-best-practices).

Prefer prewritten or generated-and-reviewed chapter overviews served with the corpus. They are stable, fast, and do not require a fresh AI call after every chapter. Label all analysis separately from Scripture, as the current Genesis 1 overview does. Questions remain dynamic.

## Voice roadmap

Browser `speechSynthesis` is the first narration option and is already connected. It starts only after a click, reads one stored verse per utterance, updates the highlighted verse, and cancels on unmount. A stopped or failed utterance does not finish the chapter. Users can always navigate the written text. Voice availability and quality depend on the device; some operating-system voices may use network services. [Speech synthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).

For spoken questions, first add push-to-talk recording, a server-side transcription request, an editable transcript, and the same question endpoint used for typing. Explicitly request microphone access, stop tracks after recording, limit recording size/duration, and disclose the destination before uploading audio. Avoid depending solely on browser `SpeechRecognition`: support is limited and some implementations send audio to a recognition service. [Browser recognition limits](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

For natural spoken conversations and spoken answers, add OpenAI Realtime over WebRTC after the text Q&A has passed evaluation. The Vercel backend creates short-lived session credentials; the permanent key stays private. Pause Scripture narration when a question begins, ground answers through the same passage lookup, and resume the bookmarked verse only on the reader's instruction. Keep verbatim Scripture playback separate from the conversational model. [Realtime browser architecture](https://developers.openai.com/api/docs/guides/realtime).

## Delivery sequence

1. Confirm translation/canon; import and validate the full corpus, then add sequential chapter navigation and progress export/import.
2. Connect the grounded text-question endpoint with rate limiting and evaluation fixtures. Publish reviewed chapter overviews alongside the corpus.
3. Add push-to-talk transcription and optional spoken answers, followed by Realtime if conversational turn-taking is needed.
4. Verify mobile layouts, keyboard/screen-reader navigation, blocked storage, narration interruption, and microphone permissions in actual browsers before public launch.
