## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: none

---

# Project instructions

- Build this project with SvelteKit 3.
- Target Vercel for deployment.
- Use the npm package `sveltewind` for UI components.
- Use TypeScript, Tailwind CSS 4, and Prettier.
- Keep SvelteKit configuration in `vite.config.ts`, using `@sveltejs/adapter-vercel`.
- Use black/white light and dark surfaces with gold as the primary color. Maintain the palette in `src/app.css`.

## Reading and analysis

- The product is a sequential Bible reader with chapter summaries, beginning at Genesis. Track verse position and completed chapters with versioned local storage. Do not add follow-up questions or chat.
- Scripture must come from a verified, named translation dataset. Preserve verse wording and punctuation; never generate or paraphrase Bible text with an LLM.
- Keep commentary, summaries, and AI interpretation visibly separate from Scripture. Cite passages and acknowledge differing interpretations when relevant.
- Use the public-domain World English Bible provisionally until the user chooses a translation.
- Bundle all 66 books and 1,189 chapters from the publisher's verse-per-line archive. Maintain the catalog and content hashes with `scripts/import-bible.py`; never reconstruct Scripture. Preserve empty publisher verse slots and identify them separately in the UI.
- Preserve existing v1 reading saves. Validate verse ranges against the selected chapter and retain completed chapters when moving across books. Every chapter has an attributed overview and a prerecorded chapter-and-overview track; the original Genesis 1 overview/recording is preserved.
- Import public-domain Matthew Henry chapter outlines and commentary excerpts with `scripts/import-summaries.py`. Label the source and historical Protestant perspective; keep book context and passage links separate from Scripture. Do not imply independent scholarly review or universal agreement.
- Support single-verse/full-chapter views, text size/spacing, offline reference/text search, local bookmarks/highlights/notes, and validated backup preview/restore. Never upload personal notes or restore arbitrary local-storage keys.
- Spoken reading must narrate the stored Scripture text. Require an explicit user action to start audio or microphone capture, and preserve typed/read-only fallbacks.
- Clearly identify planned features. Do not simulate AI answers or imply unsupported chapters are available.
- Use the persistent root native audio player for recorded Scripture and summaries. Keep each chapter and its spoken summary in one track so background playback does not depend on JavaScript starting the next segment.
- Everything must deploy as one Vercel site, with no external LLM/model server, AI API, Redis service, or required environment credentials.
- Use the standard device voice by default. All chapter recordings are served by Vercel. Generate them only as an explicit maintenance task with the installed Windows voice and FFmpeg (`scripts/prepare-recordings.py`, `scripts/render-recordings.ps1`); no speech generation runs during build/deployment. Verify every recording's text checksum, timing cues, and audio checksum. Audio URLs must contain the audio-content hash.
- Do not install Kokoro, Transformers, ONNX, CUDA, or other model-generation dependencies as part of this project. Deploy the committed audio directly.

## Progressive web app

- Keep the app installable on desktop, iOS, and Android with a web manifest, PNG and maskable icons, Apple touch metadata, and mobile safe-area spacing.
- Maintain the native SvelteKit 3 worker in `src/service-worker`, with its separate TypeScript project. Cache only build-known public resources and prerendered pages; never cache question APIs, uploads, or authenticated responses.
- Make updates opt-in during an active reading session and preserve local reading progress. Keep offline support limited to bundled or explicitly downloaded content; AI requests require a connection.
- Run `npm run check`, `npm test`, and `npm run verify:pwa` after a production build when changing PWA behavior. Actual-device installation and audio behavior still require browser/device QA.
- Support byte ranges only for known cached narration; never cache private AI responses.
- Precache all Scripture, summaries and recording metadata, plus the original Genesis 1 track. Keep the roughly 934 MB recording library opt-in per chapter. Verify downloads before saving them in the separate persistent audio cache, preserve downloads across updates, and support offline byte-range playback there. Sleep timers are best-effort when a mobile OS suspends JavaScript.

## Motion and touch behavior

- Apply scroll reveals from the single Svelte 5 root attachment in `+layout.svelte`. Discover descendants programmatically; do not add animation markup to individual components/tags.
- Respect reduced motion, keep keyboard-focused content visible, and clean up observers on teardown.
- Keep the requested application zoom restrictions and 16px minimum form-control text; browser accessibility settings may override viewport restrictions.

## Components

- Keep all project components in `src/lib/components` (the `/lib/components` component directory).
- Import components through `$lib/components` rather than directly from `sveltewind/components`.
- Preserve the explicit `$lib` alias in Vite and TypeScript; SvelteKit 3 uses `#lib` by default.
- Maintain `src/lib/components/index.ts` as the component barrel. It must expose all Sveltewind components with this exact export:

  ```ts
  export * from 'sveltewind/components';
  ```

- Export project-specific components from the same barrel so all components are available through `$lib/components`.

## Changelog and commit messages

- Create and maintain `CHANGELOG.MD` in the repository root.
- After every user prompt, update `CHANGELOG.MD` to summarize the current uncommitted Git changes, including staged, unstaged, and untracked files.
- Write the changelog as commit-ready documentation of the changes being delivered. Use the heading `Changes`; do not label the content as an uncommitted message or a draft.
- Keep the changelog aligned with the current uncommitted work rather than accumulating committed history. Remove entries for changes that have been committed or reverted.
- After updating the changelog, include a suggested Git commit message in the response.
- Every suggested Git commit message must begin with `fix: `, `feat: `, or `refactor: `.
