# Changes

- Generate natural Kokoro Heart narration locally, combining Genesis 1 and its clearly labeled chapter summary into one committed MP3 with verse cues and checksums.
- Replace queued browser chapter speech with a persistent root audio player, lock-screen media controls, playback-session support, seeking, and saved audio position for background listening.
- Cache recorded narration and serve Safari-compatible byte ranges offline.
- Add Read & type / Listen & speak modes, spoken summaries, selectable device voices for answers, and microphone dictation with a typing fallback.
- Add chapter questions, offline editorial study notes, cited canonical verses, and a server-only OpenAI endpoint with structured-output validation and durable hourly request limits. Live answers require private environment configuration.
- Add one root Svelte 5 attachment for automatic scroll fades/slides, dynamic content discovery, keyboard-focus handling, and reduced-motion support.
- Restrict application zoom gestures and retain 16px minimum form-control text to avoid iOS focus zoom.
- Add narration generation tooling, private environment examples, playback/range/question/motion tests, and offline audio build verification; update project documentation and instructions.
