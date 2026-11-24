import { minimal } from 'sveltewind/themes';
import type { ThemeObject } from 'sveltewind/theme';

/** Shared appearances resolve through Sveltewind before per-instance class overrides. */
const buttonVariants = {
	primary:
		'inline-flex items-center justify-center gap-2.5 min-h-12 py-3.25 px-5.75 rounded bg-primary-500 text-gray-950 text-sm font-semibold leading-[1.5] no-underline border border-transparent hover:text-gray-950 hover:bg-primary-400 focus-visible:text-gray-950 focus-visible:bg-primary-400 disabled:opacity-45 disabled:cursor-not-allowed',
	secondary:
		'disabled:opacity-45 disabled:cursor-not-allowed inline-flex justify-center items-center min-h-12 py-3 px-4.5 border border-divider rounded text-foreground bg-transparent text-sm hover:bg-surface-soft hover:text-foreground',
	audio:
		'inline-flex items-center gap-2.25 py-1.75 px-0 bg-transparent text-foreground text-[0.8125rem] font-medium hover:text-accent hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50 [&_>_svg:first-child]:text-accent',
	textLink:
		'text-foreground text-sm underline decoration-divider underline-offset-[5px] hover:text-accent',
	mode: 'min-h-11 py-2.5 px-4.5 text-sm text-muted bg-transparent aria-pressed:bg-surface-soft aria-pressed:text-foreground aria-pressed:hover:bg-surface-soft',
	themeToggle:
		'inline-flex justify-center items-center w-11 h-11 p-0 border border-divider rounded-full text-foreground',
	verseAnchor:
		'self-start text-accent font-[family-name:inherit] text-sm leading-[inherit] min-h-11',
	searchResult:
		'grid gap-2 p-4 text-left whitespace-normal border border-divider rounded [&_strong]:text-accent [&_strong]:font-medium [&_span]:font-serif [&_span]:text-[1.0625rem] [&_span]:leading-[1.8]',
	audioClose: 'min-h-11 py-2 px-3 text-muted text-xs bg-transparent'
};

export const siteTheme: ThemeObject = {
	...structuredClone(minimal),
	button: {
		base: 'cursor-pointer transition-colors motion-reduce:transition-none disabled:cursor-not-allowed',
		variants: buttonVariants
	},
	a: {
		base: 'text-foreground underline decoration-primary-500 underline-offset-4 transition-colors hover:text-accent motion-reduce:transition-none',
		variants: { primary: buttonVariants.primary, textLink: buttonVariants.textLink }
	}
};
