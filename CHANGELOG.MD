# Changes

- Replace the top header with a fixed bottom app bar in standalone PWA mode, with Home, Read, Journey, and Theme controls and current-location highlighting.
- Preserve the sticky, full-width browser header and app notices in normal browser tabs.
- Detect standalone mode before paint, including iOS home-screen launches, and update navigation when display mode changes.
- Verify initial browser, standalone, and iOS display detection even when browser storage is unavailable.
- Keep content, audio controls, and playback notices above the app bar and device safe areas.
- Share app bar item styles through Sveltewind theme variants and keep theme controls synchronized.
- Document the installed-app navigation convention in AGENTS.md.
