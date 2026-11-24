<script lang="ts">
	import { Button, BookOpen, Play } from '$lib/components';
	import { getContext } from 'svelte';
	import { AUDIO_CONTEXT, type AudioState } from '$lib/audio/context';
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	import chapter from '$lib/bible/genesis-1.json';
	const verses = chapter.verses.slice(0, 3);
</script>

<aside class="scripture-preview" aria-label="A preview of Genesis chapter 1">
	<div class="preview-overline"><BookOpen size={16} /><span>Open to the beginning</span></div>
	<div class="preview-title"><span>Genesis</span><span class="chapter-number">1</span></div>
	<div class="preview-verses">
		{#each verses as verse}
			<p><sup>{verse.number}</sup>{verse.text}</p>
		{/each}
	</div>
	<div class="preview-footer">
		<Button
			variants={['ghost']}
			class="audio-button"
			onclick={() => {
				if (player.playing || player.speaking) {
					player.pause();
					player.stopSpeech();
				} else if (player.narrator === 'device') player.readDevice(1);
				else void player.playChapter(chapter, 1);
			}}
		>
			<Play size={15} />{player.playing || player.speaking
				? 'Stop narration'
				: 'Listen to Genesis 1'}
		</Button><span>
			World English Bible · {player.narrator === 'device' ? 'Device voice' : 'Recorded narration'}
		</span>
	</div>
</aside>
