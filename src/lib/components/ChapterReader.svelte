<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { A, Button, Check, InteractionSettings } from '$lib/components';
	import chapter from '$lib/bible/genesis-1.json';
	import summary from '$lib/bible/genesis-1-summary.json';
	import recording from '$lib/bible/genesis-1-audio.json';
	import { AUDIO_CONTEXT, type AudioState } from '$lib/audio/context';
	import { initialProgress, loadProgress, saveProgress } from '$lib/reading/progress';
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	let progress = $state(initialProgress()),
		ready = $state(false),
		storageError = $state(false);
	const verse = $derived(chapter.verses[progress.verse - 1]);
	const active = $derived(player.playing || player.speaking);
	const verseStart = (number: number) =>
		recording.cues.find((cue) => cue.verse === number)?.start ?? 0;
	onMount(() => {
		function restore() {
			try {
				progress = loadProgress(localStorage);
				storageError = false;
			} catch {
				storageError = true;
			}
			if (player.playing || player.speaking)
				progress = {
					...progress,
					verse: player.verse,
					phase: player.phase,
					completedChapterIds: player.phase === 'summary' ? ['GEN.1'] : progress.completedChapterIds
				};
			ready = true;
		}
		restore();
		window.addEventListener('reading-progress', restore);
		return () => window.removeEventListener('reading-progress', restore);
	});
	function persist() {
		try {
			saveProgress(localStorage, progress);
			storageError = false;
		} catch {
			storageError = true;
		}
	}
	function goTo(number: number) {
		player.pause();
		player.stopSpeech();
		progress = { ...progress, verse: Math.max(1, Math.min(31, number)), phase: 'reading' };
		if (player.started) player.seek(verseStart(progress.verse));
		persist();
	}
	function complete() {
		player.pause();
		progress = { ...progress, verse: 31, phase: 'summary', completedChapterIds: ['GEN.1'] };
		persist();
		if (player.mode === 'voice') listenSummary();
	}
	function listenSummary() {
		if (active) {
			player.pause();
			player.stopSpeech();
			return;
		}
		if (player.narrator === 'device') player.readDeviceSummary();
		else
			void player.play(
				player.started && player.phase === 'summary' ? undefined : recording.summaryStart
			);
	}
	function listen() {
		if (active) {
			player.pause();
			player.stopSpeech();
			return;
		}
		if (player.narrator === 'device') {
			player.readDevice(progress.verse);
			return;
		}
		void player.play(
			player.currentTime > 0 && player.verse === progress.verse
				? undefined
				: verseStart(progress.verse)
		);
	}
</script>

<section class="reader shell" aria-labelledby="reader-heading">
	<div class="reader-topline">
		<A href="/" class="text-link">Back to your journey</A><span>World English Bible</span>
	</div>
	<header class="reader-heading">
		<p class="section-label">The first book of Moses</p>
		<h1 id="reader-heading">Genesis <span>1</span></h1>
		<p>The beginning</p>
	</header>
	<InteractionSettings />
	{#if !ready}<p class="reader-loading" role="status">Finding your place…</p>
	{:else if progress.phase === 'reading'}
		<div class="reader-status">
			<span>Verse {progress.verse} of 31</span><span>
				{storageError || player.storageError ? 'Reading in this session' : 'Your place is saved'}
			</span>
		</div>
		<progress class="reader-progress" max="31" value={progress.verse - 1} aria-label="Verses read"
		></progress>
		<div class="verse-sheet" aria-live={active ? 'off' : 'polite'} aria-atomic="true">
			<span class="verse-number">{verse.number}</span>
			<p>{verse.text}</p>
		</div>
		<div class="reader-toolbar">
			<Button variants={['ghost']} class="audio-button" onclick={listen}>
				{active ? 'Stop narration' : 'Listen to chapter & summary'}
			</Button>
			<div class="verse-navigation">
				<Button
					variants={['ghost']}
					class="button-secondary"
					disabled={progress.verse === 1 || active}
					onclick={() => goTo(progress.verse - 1)}
				>
					Previous verse
				</Button><Button
					class="button-primary"
					disabled={active}
					onclick={() => (progress.verse === 31 ? complete() : goTo(progress.verse + 1))}
				>
					{progress.verse === 31 ? 'Finish chapter' : 'Next verse'}
				</Button>
			</div>
		</div>
		<p class="reader-smallprint">
			{player.narrator === 'device'
				? 'Standard device speech reads the chapter and summary. Keep the app open; iOS may stop device speech when the screen locks.'
				: 'A bundled recording plays the chapter and summary continuously. It is served by this site and needs no external service. Lock-screen behavior still depends on your device.'}
		</p>
		<A href={recording.src} download class="text-link audio-download">
			Download chapter & summary audio
		</A>
	{:else}
		<div class="chapter-summary">
			<div class="summary-complete"><Check size={18} />Chapter complete</div>
			<h2>{summary.title}</h2>
			<p class="summary-label">Chapter overview · Editorial commentary, separate from Scripture</p>
			<Button variants={['ghost']} class="button-secondary summary-listen" onclick={listenSummary}>
				{active ? 'Stop narration' : 'Listen to the summary'}
			</Button>
			{#each summary.paragraphs as paragraph}<p>{paragraph}</p>{/each}
			<p class="reader-smallprint">
				Genesis 1 is the currently available chapter. Genesis 2 and the remaining Bible text will
				follow.
			</p>
			<div class="summary-actions">
				<Button variants={['ghost']} class="button-secondary" onclick={() => goTo(1)}>
					Read chapter again
				</Button><A href="/#your-place" class="button-primary">Return to your journey</A>
			</div>
		</div>
	{/if}
	{#if storageError || player.storageError}<p class="storage-warning" role="status">
			Your browser couldn’t save your place. Reading still works, but progress may be lost when you
			leave.
		</p>{/if}
	<p class="reader-source">
		Scripture: <A href={chapter.source}>World English Bible, Genesis 1</A> · Public domain. Verse words
		and punctuation are preserved; source footnotes are not included in narration. Kokoro Heart is an
		AI-generated voice.
	</p>
</section>
