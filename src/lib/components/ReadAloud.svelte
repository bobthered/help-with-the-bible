<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Play, Square, Volume2 } from '$lib/components';

	let {
		verses,
		startIndex = 0,
		onverse,
		oncomplete,
		onstate,
		label = 'Read aloud'
	}: {
		verses: { text: string }[];
		startIndex?: number;
		onverse?: (index: number) => void;
		oncomplete?: () => void;
		onstate?: (speaking: boolean) => void;
		label?: string;
	} = $props();
	let available = $state(false);
	let speaking = $state(false);
	let error = $state('');
	let generation = 0;
	let activeUtterance: SpeechSynthesisUtterance | null = null;

	function stop() {
		generation++;
		speaking = false;
		onstate?.(false);
		activeUtterance = null;
		if (available) speechSynthesis.cancel();
	}

	onMount(() => {
		available = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
		return stop;
	});

	function play() {
		if (speaking) {
			stop();
			return;
		}
		if (!available) return;
		error = '';
		speechSynthesis.cancel();
		speaking = true;
		onstate?.(true);
		const currentGeneration = ++generation;
		function read(index: number) {
			if (currentGeneration !== generation) return;
			const utterance = new SpeechSynthesisUtterance(verses[index].text);
			activeUtterance = utterance;
			utterance.lang = 'en-US';
			utterance.rate = 0.9;
			onverse?.(index);
			utterance.onend = () => {
				if (currentGeneration !== generation) return;
				if (index + 1 < verses.length) read(index + 1);
				else {
					speaking = false;
					onstate?.(false);
					activeUtterance = null;
					oncomplete?.();
				}
			};
			utterance.onerror = () => {
				if (currentGeneration !== generation) return;
				stop();
				error = 'Audio stopped. You can keep reading or try again.';
			};
			speechSynthesis.speak(activeUtterance);
		}
		read(Math.max(0, Math.min(startIndex, verses.length - 1)));
	}
</script>

<div class="audio-control">
	<Button
		class="audio-button"
		variants={['ghost']}
		onclick={play}
		disabled={!available || !verses.length}
		aria-pressed={speaking}
	>
		{#if speaking}<Square size={15} fill="currentColor" />{:else}<Play
				size={15}
				fill="currentColor"
			/>{/if}
		{speaking ? 'Stop reading' : label}
		<Volume2 size={16} class="audio-volume" />
	</Button>
	{#if !available}<span class="audio-note">Audio requires a supported browser.</span>{/if}
	{#if error}<span class="audio-note" role="status">{error}</span>{/if}
</div>
