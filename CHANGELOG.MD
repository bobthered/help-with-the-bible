# Changes

- Clarify that recorded chapter-and-overview narration is available for every chapter and is the option for lock-screen listening.
- Use consistent recorded-narration wording in the Genesis 1 landing-page preview.
- Correct the outdated offline notice to describe all Scripture, chapter overviews, and downloaded audio.
- Replace the Windows-voice generation tooling with an isolated Kokoro Heart (`af_heart`) renderer and pinned local setup, keeping synthesis dependencies out of the app and Vercel build.
- Add a GPU-compatible model export with unchanged weights, checksums, and numerical CPU reference checks.
- Stage and checkpoint chapter/verse audio with exact sample-based cues, voice/model/tokenizer provenance, and content-hashed audio URLs.
- Validate the entire replacement library before publishing; preserve Genesis 1, reject stale inputs or another voice, and run app checks automatically after publishing.
- Add renderer safety tests and a completed-migration policy that makes future asset tests require Heart for every chapter.
- Ignore Python bytecode caches created by the local maintenance tools.
- Start the resumable full-library conversion locally; existing deployed assets remain unchanged until the batch completes. Conversion is still in progress.
