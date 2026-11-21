<script lang="ts">
	import '../app.css';
	import { theme } from 'sveltewind/theme';
	import { minimal } from 'sveltewind/themes';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { setContext } from 'svelte';
	import { PwaManager } from '$lib/components';
	import { PWA_CONTEXT, initialPwaState } from '$lib/pwa/context';

	let { children }: LayoutProps = $props();
	const pwa = $state(initialPwaState());
	setContext(PWA_CONTEXT, pwa);

	theme.set.theme(structuredClone(minimal));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<PwaManager />
{@render children()}
