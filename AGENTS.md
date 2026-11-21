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
- Spoken reading must narrate the stored Scripture text. Require an explicit user action to start audio or microphone capture, and preserve typed/read-only fallbacks.
- Clearly identify planned features. Do not simulate AI answers or imply unsupported chapters are available.
- Use the persistent root native audio player for recorded Scripture and summaries. Keep each chapter and its spoken summary in one track so background playback does not depend on JavaScript starting the next segment.
- Everything must deploy as one Vercel site, with no external LLM/model server, AI API, Redis service, or required environment credentials.
- Use the standard device voice by default. The existing bundled MP3 is an optional background-listening alternative, served by Vercel. Keep narration and timing metadata synchronized with Scripture and the separate chapter summary.
- Do not install Kokoro, Transformers, ONNX, CUDA, or other model-generation dependencies as part of this project. Deploy the committed audio directly.

## Progressive web app

- Keep the app installable on desktop, iOS, and Android with a web manifest, PNG and maskable icons, Apple touch metadata, and mobile safe-area spacing.
- Maintain the native SvelteKit 3 worker in `src/service-worker`, with its separate TypeScript project. Cache only build-known public resources and prerendered pages; never cache question APIs, uploads, or authenticated responses.
- Make updates opt-in during an active reading session and preserve local reading progress. Keep offline support limited to bundled or explicitly downloaded content; AI requests require a connection.
- Run `npm run check`, `npm test`, and `npm run verify:pwa` after a production build when changing PWA behavior. Actual-device installation and audio behavior still require browser/device QA.
- Support byte ranges only for known cached narration; never cache private AI responses.

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
