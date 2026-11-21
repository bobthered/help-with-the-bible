<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { Button, Select } from '$lib/components';
	import { AUDIO_CONTEXT, type AudioState } from '$lib/audio/context';
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	let voices = $state<SpeechSynthesisVoice[]>([]);
	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem('help-with-the-bible:interaction:v1') ?? '{}');
			if (['text', 'voice'].includes(saved.mode)) player.mode = saved.mode;
			if (typeof saved.deviceVoice === 'string') player.deviceVoice = saved.deviceVoice;
		} catch {}
		const refresh = () => {
			voices =
				'speechSynthesis' in window
					? speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith('en'))
					: [];
		};
		refresh();
		if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', refresh);
		return () => {
			if ('speechSynthesis' in window)
				speechSynthesis.removeEventListener('voiceschanged', refresh);
		};
	});
	function save() {
		try {
			localStorage.setItem(
				'help-with-the-bible:interaction:v1',
				JSON.stringify({ mode: player.mode, deviceVoice: player.deviceVoice })
			);
		} catch {}
	}
</script>

<div class="interaction-settings">
	<div class="interaction-switch" role="group" aria-label="Interaction mode">
		<Button
			variants={['ghost']}
			class={player.mode === 'text' ? 'mode-button mode-selected' : 'mode-button'}
			aria-pressed={player.mode === 'text'}
			onclick={() => {
				player.mode = 'text';
				player.pause();
				player.stopSpeech();
				save();
			}}
		>
			Read & type
		</Button><Button
			variants={['ghost']}
			class={player.mode === 'voice' ? 'mode-button mode-selected' : 'mode-button'}
			aria-pressed={player.mode === 'voice'}
			onclick={() => {
				player.mode = 'voice';
				save();
			}}
		>
			Listen & speak
		</Button>
	</div>
	<p>
		Chapter and summary: Kokoro Heart, an AI-generated voice. Spoken answers use a device voice.
	</p>
	{#if voices.length}<label for="answer-voice">Spoken answer voice</label><Select
			id="answer-voice"
			bind:value={player.deviceVoice}
			onchange={(event) => {
				player.deviceVoice = event.currentTarget.value;
				save();
			}}
		>
			<option value="">Best available English voice</option>{#each voices as voice}<option
					value={voice.voiceURI}
				>
					{voice.name}
				</option>{/each}
		</Select>{/if}
</div>
