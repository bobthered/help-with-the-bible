# Changes

- Bundle the public-domain World English Bible: all 66 books and 1,189 chapters, with publisher attribution, source hashes, and a reproducible importer.
- Preserve generated Scripture file line endings across Windows and Linux so content checksums remain stable.
- Add book/chapter selection and sequential navigation from Genesis through Revelation, with chapter-specific verse counts and completion screens.
- Preserve existing saved progress and retain completed chapters across books; show the saved book/chapter on the landing page.
- Extend standard device narration to every chapter without changing Scripture. Preserve empty publisher verse slots and skip them during speech.
- Keep Genesis 1 editorial summaries and background recording available, while clearly identifying their current chapter coverage.
- Precache every Scripture book for offline reading and verify all book files against the emitted service worker with the network disabled.
- Update product copy, project guidance, and tests for full-Bible integrity, chapter boundaries, progress restoration, download recovery, narration, and offline access.
