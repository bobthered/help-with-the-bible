# Changes

- Initialize SvelteKit 3 with TypeScript, Tailwind CSS 4, Prettier, and the Vercel adapter.
- Install Sveltewind and its required Lucide icons; configure its stylesheet, source scanning, dark variant, and minimal theme preset.
- Re-export all Sveltewind components through `src/lib/components` and configure `$lib` imports for Vite and TypeScript.
- Add a gold primary palette with black/white light and dark surfaces, matching contrast colors, and neutral secondary shades.
- Add a starter page with palette swatches and a theme toggle that remembers the selected mode and defaults to the system preference.
- Replace the scaffold favicon with a gold book icon.
- Document development commands, theme configuration, and Vercel deployment; update project instructions for the initialized stack.
