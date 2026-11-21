# Changes

- Make the site installable on desktop, iOS, and Android with a standalone web manifest, PNG app icons, Android maskable icon, and Apple touch metadata.
- Add a native SvelteKit service worker to cache the landing page, Genesis reader, installation guidance, and bundled Scripture for offline use.
- Prerender the three public pages and provide an offline fallback without caching question APIs, uploads, authenticated requests, or external resources.
- Add connection notices and an explicit app-update flow that preserves reading progress and retains the previous deployment for open tabs.
- Add an installation page with native prompts where supported and manual instructions for iPhone, iPad, Android, and desktop browsers.
- Add safe-area spacing, theme-aware browser chrome, and Vercel cache headers for worker and manifest updates.
- Add reproducible app-icon generation, service-worker type checks, PWA lifecycle tests, and verification of the emitted offline build.
- Document installation, offline limits, device storage behavior, and platform verification steps; update project PWA instructions.
