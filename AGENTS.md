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

## Changelog and commit messages

- Create and maintain `CHANGELOG.MD` in the repository root.
- After every user prompt, update `CHANGELOG.MD` to summarize the current uncommitted Git changes, including staged, unstaged, and untracked files.
- Write the changelog as commit-ready documentation of the changes being delivered. Use the heading `Changes`; do not label the content as an uncommitted message or a draft.
- Keep the changelog aligned with the current uncommitted work rather than accumulating committed history. Remove entries for changes that have been committed or reverted.
- After updating the changelog, include a suggested Git commit message in the response.
- Every suggested Git commit message must begin with `fix: `, `feat: `, or `refactor: `.
