<script lang="ts">
	import '../app.css';
	import Lenis from 'lenis';
	import { theme } from 'sveltewind/theme';
	import { siteTheme } from '$lib/theme';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { onMount, setContext } from 'svelte';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
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

	theme.set.theme(structuredClone(siteTheme));

	let scrolling: Lenis | undefined;
	onMount(() => {
		scrolling = new Lenis({
			autoRaf: true,
			smoothWheel: true,
			lerp: 0.085,
			syncTouch: false,
			anchors: true,
			allowNestedScroll: true,
			respectReducedMotion: true
		});
		return () => {
			scrolling?.destroy();
			scrolling = undefined;
		};
	});
	beforeNavigate(({ from, to }) => {
		// End the old page's momentum while SvelteKit handles the new scroll position.
		if (from?.url.pathname !== to?.url.pathname || from?.url.search !== to?.url.search) {
			if (scrolling) scrolling.scrollTo(scrolling.actualScroll, { immediate: true });
		}
	});
	afterNavigate(() => scrolling?.resize());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div
	class="site-root min-h-svh [&_[data-highlight='blue']]:bg-[color-mix(in_srgb,#5799d4_18%,var(--surface-raised))] [&_[data-highlight='gold']]:bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-raised))] [&_[data-reveal-pending]]:translate-y-5 [&_[data-reveal-pending]]:opacity-0 motion-reduce:[&_[data-reveal-pending]]:translate-y-0 motion-reduce:[&_[data-reveal-pending]]:opacity-100 [&:has(.audio-dock-active)]:pb-[calc(135px_+_env(safe-area-inset-bottom))] mobile:[&:has(.audio-dock-active)]:pb-[calc(190px_+_env(safe-area-inset-bottom))]"
	{@attach revealOnScroll}
	{@attach preventPageZoom}
>
	<PwaManager />
	{@render children()}
	<AudioPlayer />
</div>
