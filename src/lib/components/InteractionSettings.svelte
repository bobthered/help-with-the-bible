<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { Button, Select } from '$lib/components';
	import { AUDIO_CONTEXT, type AudioState } from '$lib/audio/context';
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	let { recordedAvailable = true }: { recordedAvailable?: boolean } = $props();
	$effect(() => {
		if (!recordedAvailable && player.narrator === 'recorded') player.narrator = 'device';
	});
	let voices = $state<SpeechSynthesisVoice[]>([]);
	let sleepMinutes = $state('0');
	$effect(() => {
		if (player.sleepEndsAt === null) sleepMinutes = '0';
	});
	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem('help-with-the-bible:interaction:v1') ?? '{}');
			if (['text', 'voice'].includes(saved.mode)) player.mode = saved.mode;
			if (['device', 'recorded'].includes(saved.narrator)) player.narrator = saved.narrator;
			if (typeof saved.deviceVoice === 'string') player.deviceVoice = saved.deviceVoice;
			if (Number.isFinite(saved.rate) && saved.rate >= 0.5 && saved.rate <= 2)
				player.rate = saved.rate;
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
					deviceVoice: player.deviceVoice,
					rate: player.rate
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
		<option value="device">Standard device voice</option><option
			value="recorded"
			disabled={!recordedAvailable}
		>
			Recorded chapter & overview · all chapters
		</option>
	</Select>
	<p>
		{!recordedAvailable
			? 'Standard device voice is available while this chapter recording is unavailable.'
			: player.narrator === 'device'
				? 'Uses your device’s standard voice with the app open. For lock-screen listening, choose the recorded option, available for every chapter.'
				: 'Available for every chapter: one recorded track contains the Scripture and overview. Playback can continue when the screen locks, subject to your device and interruptions.'}
	</p>
	<label for="playback-rate">
		Playback speed<Select
			id="playback-rate"
			bind:value={player.rate}
			onchange={(event) => {
				player.rate = Number(event.currentTarget.value);
				save();
			}}
		>
			<option value={0.5}>0.5×</option><option value={0.75}>0.75×</option><option value={1}>
				1×
			</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option
				value={2}
			>
				2×
			</option>
		</Select>
	</label>
	<label for="sleep-timer">
		Sleep timer<Select
			id="sleep-timer"
			bind:value={sleepMinutes}
			onchange={(event) => player.setSleepTimer(Number(event.currentTarget.value))}
		>
			<option value="0">Off</option><option value="5">5 minutes</option><option value="15">
				15 minutes
			</option><option value="30">30 minutes</option><option value="60">60 minutes</option>
		</Select>
	</label>
	{#if player.sleepEndsAt}<p role="status">
			Playback will stop around {new Date(player.sleepEndsAt).toLocaleTimeString([], {
				hour: 'numeric',
				minute: '2-digit'
			})}. Device suspension may delay the timer.
		</p>{/if}
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
