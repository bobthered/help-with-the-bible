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
			if (['device', 'recorded'].includes(saved.narrator)) player.narrator = saved.narrator;
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
				JSON.stringify({
					mode: player.mode,
					narrator: player.narrator,
					deviceVoice: player.deviceVoice
				})
			);
		} catch {}
	}
</script>

<div class="interaction-settings">
	<div class="interaction-switch" role="group" aria-label="Reading mode">
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
			Read
		</Button><Button
			variants={['ghost']}
			class={player.mode === 'voice' ? 'mode-button mode-selected' : 'mode-button'}
			aria-pressed={player.mode === 'voice'}
			onclick={() => {
				player.mode = 'voice';
				save();
			}}
		>
			Listen
		</Button>
	</div>
	<label for="narrator">Narration</label><Select
		id="narrator"
		bind:value={player.narrator}
		onchange={(event) => {
			player.narrator = event.currentTarget.value as 'device' | 'recorded';
			player.pause();
			player.stopSpeech();
			player.currentTime = 0;
			save();
		}}
	>
		<option value="device">Standard device voice</option><option value="recorded">
			Bundled recording · background listening
		</option>
	</Select>
	<p>
		{player.narrator === 'device'
			? 'Uses your device’s standard voice. Keep the app open while listening.'
			: 'A prerecorded chapter and summary, hosted entirely with this site. No model server or API key is needed.'}
	</p>
	{#if player.narrator === 'device' && voices.length}<label for="device-voice">
			Device voice
		</label><Select
			id="device-voice"
			bind:value={player.deviceVoice}
			onchange={(event) => {
				player.deviceVoice = event.currentTarget.value;
				save();
			}}
		>
			<option value="">Default English voice</option>{#each voices as voice}<option
					value={voice.voiceURI}
				>
					{voice.name}
				</option>{/each}
		</Select>{/if}
</div>
