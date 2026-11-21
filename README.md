# Help with the Bible

A SvelteKit 3 PWA using TypeScript, Tailwind CSS 4, Sveltewind and the Vercel adapter. The entire app and its content deploy to one Vercel site. No account, AI API, model server, database or environment credentials are required.

## Reading and study

- Read all 66 books and 1,189 chapters of the public-domain World English Bible, updated 66-book edition.
- Choose a book/chapter, continue sequentially, jump to a verse, or switch between one verse and a full chapter.
- Adjust text size and line spacing. Preferences and reading progress stay in this browser; existing v1 progress saves remain valid.
- Finish each chapter with an attributed overview, book context and linked passages to revisit. Genesis 1 retains its original editorial summary. Other overviews reproduce Matthew Henry chapter outlines or first-sentence commentary excerpts, labeled as historical Protestant interpretation. They are not Scripture, live AI answers or independently reviewed scholarly summaries.
- Search offline by reference (`John 3:16`, `1 John 2:1-3`), words, quoted phrase, or book. Searches show the first 200 matches and a total count.
- Bookmark verses, highlight them in gold or blue, and save personal notes. Open Saved passages to return to them. Notes are plain text and are never uploaded.
- Export a JSON backup of progress, completed chapters, bookmarks, highlights, notes, theme, and reading/narration preferences. Import previews its contents and requires a separate Restore click. Restoring replaces this device's data; export the current backup first if needed. Audio files are not part of a backup.

## Listening and screen lock

**Standard device voice** is the default. It reads the stored verse text and then explicitly labels and reads the chapter overview. Device speech generally needs the app open; iOS may suspend it when the screen locks. Some installed voices use the device vendor's network service.

For screen-lock/background listening, select **Recorded chapter & overview · background listening**. Every chapter has a native audio track containing its Scripture and spoken overview continuously. This avoids depending on JavaScript starting a separate summary after suspension. The persistent player includes native controls, verse cues, saved position, Media Session metadata and seek controls. Tracks stop at the end of the selected chapter; choose the next chapter explicitly.

Playback speed supports 0.5×–2×. Device-voice speed changes apply to subsequent utterances. Sleep timers support 5, 15, 30 or 60 minutes and use both a timer and playback/visibility events; a mobile OS suspending JavaScript can delay their stop. Real iOS/Android screen-lock playback, interruptions and sleep timers still require physical-device QA.

Use **Download chapter for offline listening** before disconnecting. Downloads are checked against their SHA-256 checksum and stored separately from app updates. Remove a chapter's download using the same panel, or save its audio file directly. Browser storage eviction or clearing site data can remove downloads and progress; keep personal notes backed up.

The complete additional recording library is approximately **934 MB**. It is hosted by Vercel but is not automatically downloaded by the PWA. Most tracks use the installed Windows Microsoft David synthetic voice; Genesis 1 preserves the existing Kokoro Heart recording. All voice identities and source credits appear in `static/audio/NOTICE.txt`. No voice is cloned and no model-generation dependencies are installed by npm.

## Development and deployment

Use Node.js **22.x** (22.17 or newer) and npm:

```sh
npm ci
npm run dev
npm run check
npm test
npm run lint
npm run build
npm run verify:pwa
npm run preview
```

Import the repository into Vercel using its SvelteKit preset and `npm run build`. All pages are prerendered; configuration is in `vite.config.ts`. Output is `.vercel/output`. **No `.env` variables are required.** Deployment uses committed content; it performs no speech synthesis or content-source downloads.

Deploy through the Git integration. The audio library makes this repository larger than Vercel's documented 100 MB Hobby CLI source-upload limit; see [Vercel limits](https://vercel.com/docs/limits). Committing audio also makes clones and initial deployments larger. Generated audio files are individually small and stored directly in Git; using LFS without configuring Vercel to retrieve the actual files would break playback.

The former `kokoro-js`/ONNX/CUDA dependency chain is absent, resolving the earlier Vercel install failure. Only the previously generated Genesis 1 MP3 remains from that toolchain.

## PWA and offline behavior

Open `/install` for desktop, iOS and Android installation instructions. Keep the app online until it reports offline readiness. The worker precaches the pages, JavaScript/CSS, icons, all Scripture, all overviews, all recording metadata and the original Genesis 1 MP3. Other audio tracks are opt-in downloads.

The worker serves byte ranges for known cached narration, including downloaded M4A tracks. Failed installs preserve the current deployment. Updates activate only when accepted and preserve local notes/progress and the separate audio-download cache. A previous app cache is retained for other open tabs. Unknown/private/API responses are never added to the offline cache.

`npm run verify:pwa` executes the actual emitted worker with a simulated disabled network, checks Scripture/summary/metadata availability, verifies that the full audio library is not precached, and verifies an opted-in chapter's byte-range response. Worker registration is disabled in development; use the production preview for browser checks.

## Content sources and maintenance

Scripture comes from the publisher's [World English Bible verse-per-line archive](https://ebible.org/details.php?id=engwebp), without the Deuterocanon/Apocrypha. The 31,103 numbered entries include publisher-supplied empty verse slots. Words and punctuation are preserved. Empty slots are labeled separately and skipped during narration; Scripture is never generated by a model. Source and per-book checksums are in `src/lib/bible/catalog.json`.

Overviews are imported from [CCEL's public-domain Matthew Henry concise commentary XML](https://www.ccel.org/ccel/henry/mhcc.xml). The importer excludes publisher descriptions and modern front matter, records its source hash, validates coverage, and preserves source attribution. When an outline is absent, excerpts are labeled as commentary excerpts. Two missing book introductions use brief editorial context for 2 Kings and 2 Chronicles. Passage links use valid WEB verse bounds. Historical interpretation can differ across traditions.

```sh
python scripts/import-bible.py [path/to/engwebp_vpl.zip]
python scripts/import-summaries.py [path/to/mhcc.xml]
```

Recording generation is a separate Windows maintenance task using Python 3, Windows PowerShell's installed `System.Speech` voices and a local FFmpeg executable. It never runs on Vercel:

```powershell
python scripts/prepare-recordings.py
powershell.exe -NoProfile -File scripts/render-recordings.ps1 -Ffmpeg PATH_TO_FFMPEG
python scripts/prepare-recordings.py --finalize --prune
```

Jobs/WAVs are temporary files in ignored `.cache`; final AAC/M4A files and per-book timing metadata are committed. The renderer can shard work with `-Shard 0 -Shards 4` through `-Shard 3 -Shards 4`. It resumes matching completed tracks and repairs incomplete cue sets. Regeneration requires source/text/cue/audio checksum tests, a production build, and PWA verification before release. Content-hashed audio URLs keep new metadata separate from old downloads. `--prune` removes only obsolete generated tracks in the designated audio directory after finalizing all chapters.

Import components through `$lib/components`, which re-exports Sveltewind and project components. The root attachment applies scroll reveals, and Lenis provides wheel momentum while preserving native touch and reduced motion. Gold/neutral themes live in `src/app.css`.
