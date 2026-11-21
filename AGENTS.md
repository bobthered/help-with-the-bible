# Project instructions

- Build this project with SvelteKit 3.
- Target Vercel for deployment.
- Use the npm package `sveltewind` for UI components.

## Components

- Keep all project components in `src/lib/components` (the `/lib/components` component directory).
- Import components through `$lib/components` rather than directly from `sveltewind/components`.
- Maintain `src/lib/components/index.ts` as the component barrel. It must expose all Sveltewind components with this exact export:

  ```ts
  export * from 'sveltewind/components';
  ```

- Export project-specific components from the same barrel so all components are available through `$lib/components`.
