# Help with the Bible

SvelteKit 3 project using Svelte 5, TypeScript 6, Tailwind CSS 4, and Sveltewind.

## Development

Requires Node.js 22.17 or newer and npm.

```sh
npm install
npm run dev
```

```sh
npm run check   # Svelte and TypeScript diagnostics
npm run lint    # Prettier formatting check
npm run format  # Apply formatting
npm run build   # Production build for Vercel
npm run preview # Preview the production build locally
```

## Components and themes

Import UI components through the project barrel:

```ts
import { Button, H1, P, ThemeToggle } from '$lib/components';
```

`src/lib/components/index.ts` re-exports every component from `sveltewind/components` alongside project components. Vite and TypeScript explicitly configure `$lib`; SvelteKit 3's standard `#lib` subpath imports remain available for other modules.

The root layout imports `src/app.css` and initializes a cloned Sveltewind `minimal` preset. The stylesheet imports Tailwind and Sveltewind palettes, scans the library's distributed source, and enables dark variants using `data-theme`.

`@lucide/svelte` is installed explicitly because Sveltewind components import it without declaring it as a runtime dependency.

`src/app.html` sets `data-color="gold"`. The custom 50-950 gold scale, neutral secondary colors, contrast foregrounds, and semantic surface tokens live in `src/app.css`.

- Light: white background, near-black text, dark gold text accents.
- Dark: near-black background, white text, light gold text accents.
- Primary: gold `#c9a227` with near-black text.

The theme toggle saves an explicit preference in browser storage. On first visit, the theme follows the system preference. The initial theme is applied before rendering to avoid a light/dark flash.

Sveltewind setup references: [installation and configuration](https://github.com/sveltewind/sveltewind#installation), [themes and palettes](https://github.com/sveltewind/sveltewind#styles-colors-and-dark-mode). The requested documentation website, https://www.sveltewind.com, returned a site-not-found response during initialization, so configuration was verified against the official repository and installed package.

## Vercel

Import this repository into Vercel and select the SvelteKit framework preset. Use `npm run build` and leave the output directory at the framework default. The Vercel adapter is configured in `vite.config.ts` and produces `.vercel/output` during the build. Use a supported Node.js version satisfying the package's `engines` requirement.

Local Windows builds require permission to create symbolic links for Vercel's function output. During initialization, application compilation succeeded, but adapter packaging failed with `EPERM` at symlink creation. Run the full deployment build on Vercel or in an environment with symlink support.
