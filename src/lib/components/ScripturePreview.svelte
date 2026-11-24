<script lang="ts">
	import { Button, BookOpen, Play } from '$lib/components';
	import { getContext } from 'svelte';
	import { AUDIO_CONTEXT, type AudioState } from '$lib/audio/context';
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	import chapter from '$lib/bible/genesis-1.json';
	const verses = chapter.verses.slice(0, 3);
</script>

<aside
	class="scripture-preview relative border border-t-3 border-divider border-t-primary-500 bg-surface-raised px-9 pt-7.5 pb-5.75 shadow-[8px_8px_0_var(--surface),_9px_9px_0_var(--border)] tablet:px-6.25 mobile:px-6.25"
	aria-label="A preview of Genesis chapter 1"
>
	<div class="preview-overline flex items-center gap-2 text-xs text-muted [&_svg]:text-accent">
		<BookOpen size={16} /><span>Open to the beginning</span>
	</div>
	<div
		class="preview-title mt-7 flex items-center justify-between border-b border-b-divider pb-5.5 font-serif text-[2rem]"
	>
		<span>Genesis</span><span class="chapter-number text-6xl leading-[0.9] text-accent">1</span>
	</div>
	<div
		class="preview-verses mt-6.5 mb-7 [&_p]:mt-3.75 [&_p]:font-serif [&_p]:text-[1.0625rem] [&_p]:leading-[1.9] [&_sup]:mr-1.75 [&_sup]:font-sans [&_sup]:text-[0.625rem] [&_sup]:text-accent"
	>
		{#each verses as verse}
			<p><sup>{verse.number}</sup>{verse.text}</p>
		{/each}
	</div>
	<div
		class="preview-footer border-t border-t-divider pt-4.25 [&_>_span]:mt-2.5 [&_>_span]:block [&_>_span]:text-[0.6875rem] [&_>_span]:text-muted"
	>
		<Button
			variants={['audio']}
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
