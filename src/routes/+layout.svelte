<script lang="ts">
	import '../app.css';
	import { theme } from 'sveltewind/theme';
	import { minimal } from 'sveltewind/themes';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	theme.set.theme(structuredClone(minimal));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
