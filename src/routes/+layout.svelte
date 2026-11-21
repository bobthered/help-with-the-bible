<script lang="ts">
	import '../app.css';
	import { theme } from 'sveltewind/theme';
	import { minimal } from 'sveltewind/themes';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { setContext } from 'svelte';
	import { PwaManager, AudioPlayer } from '$lib/components';
	import { AUDIO_CONTEXT, initialAudioState } from '$lib/audio/context';
	import { revealOnScroll } from '$lib/attachments/reveal';
	import { preventPageZoom } from '$lib/attachments/zoom';
	import { PWA_CONTEXT, initialPwaState } from '$lib/pwa/context';

	let { children }: LayoutProps = $props();
	const pwa = $state(initialPwaState());
	setContext(PWA_CONTEXT, pwa);
	const audio = $state(initialAudioState());
	setContext(AUDIO_CONTEXT, audio);

	theme.set.theme(structuredClone(minimal));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="site-root" {@attach revealOnScroll} {@attach preventPageZoom}>
	<PwaManager />
	{@render children()}
	<AudioPlayer />
</div>
