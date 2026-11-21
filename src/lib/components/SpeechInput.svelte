<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { Button, Mic } from '$lib/components';
	import { AUDIO_CONTEXT, type AudioState } from '$lib/audio/context';
	let {
		ontranscript,
		onfinished,
		disabled = false
	}: {
		ontranscript: (text: string) => void;
		onfinished?: (text: string) => void;
		disabled?: boolean;
	} = $props();
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	type Recognition = {
		lang: string;
		interimResults: boolean;
		continuous: boolean;
		start: () => void;
		stop: () => void;
		abort: () => void;
		onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
		onend: (() => void) | null;
		onerror: ((event: { error: string }) => void) | null;
	};
	let supported = $state(false),
		listening = $state(false),
		error = $state('');
	let recognition: Recognition | null = null;
	let constructor: (new () => Recognition) | undefined;
	let transcript = '',
		aborted = false;
	$effect(() => {
		if (disabled && recognition) {
			aborted = true;
			recognition.abort();
			listening = false;
		}
	});
	onMount(() => {
		const browser = window as unknown as {
			SpeechRecognition?: new () => Recognition;
			webkitSpeechRecognition?: new () => Recognition;
		};
		constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
		supported = Boolean(constructor);
		return () => {
			aborted = true;
			recognition?.abort();
		};
	});
	function toggle() {
		if (listening) {
			recognition?.stop();
			return;
		}
		if (!constructor) return;
		player.pause();
		player.stopSpeech();
		error = '';
		transcript = '';
		aborted = false;
		recognition = new constructor();
		recognition.lang = 'en-US';
		recognition.continuous = false;
		recognition.interimResults = false;
		recognition.onresult = (event) => {
			transcript = Array.from(event.results, (result) => result[0].transcript)
				.join(' ')
				.trim();
			ontranscript(transcript);
		};
		recognition.onerror = (event) => {
			aborted = true;
			listening = false;
			error =
				event.error === 'not-allowed'
					? 'Microphone access was denied. You can type your question instead.'
					: 'Dictation stopped. You can try again or type your question.';
		};
		recognition.onend = () => {
			listening = false;
			if (!aborted && transcript) onfinished?.(transcript);
		};
		try {
			recognition.start();
			listening = true;
		} catch {
			error = 'Dictation could not start. Please type your question.';
		}
	}
</script>

<div class="speech-input">
	<Button
		variants={['ghost']}
		class="button-secondary"
		onclick={toggle}
		disabled={!supported || disabled}
		aria-pressed={listening}
	>
		<Mic size={16} />{listening ? 'Finish question' : 'Speak a question'}
	</Button>
	<p>
		{supported
			? 'Dictation uses your browser’s speech service and may send audio to that service.'
			: 'Dictation is unavailable in this browser. Please type your question.'}
	</p>
	{#if error}<p role="status">{error}</p>{/if}
</div>
