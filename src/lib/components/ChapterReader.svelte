<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { A, Button, Select, Check, InteractionSettings } from '$lib/components';
	import genesis from '$lib/bible/genesis-1.json';
	import recording from '$lib/bible/genesis-1-audio.json';
	import {
		books,
		chapterInfo,
		adjacentChapter,
		loadChapter,
		type Chapter
	} from '$lib/bible/catalog';
	import { chapterSummary } from '$lib/audio/segments';
	import { AUDIO_CONTEXT, type AudioState } from '$lib/audio/context';
	import {
		initialProgress,
		loadProgress,
		saveProgress,
		moveToChapter,
		completeChapter,
		type ReadingProgress
	} from '$lib/reading/progress';
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	let progress = $state(initialProgress());
	let chapter = $state<Chapter>(genesis);
	let ready = $state(false),
		loading = $state(false),
		storageError = $state(false),
		loadError = $state('');
	let request = 0;
	let selectedBook = $state('GEN');
	let selectedNumber = $state('1');
	const verse = $derived(chapter.verses[progress.verse - 1]);
	const summary = $derived(chapterSummary(chapter.id));
	const info = $derived(chapterInfo(chapter.id)!);
	const book = $derived(books.find((book) => book.id === info.bookId)!);
	const previous = $derived(adjacentChapter(chapter.id, -1));
	const next = $derived(adjacentChapter(chapter.id, 1));
	const active = $derived(player.playing || player.speaking);
	const recordedAvailable = $derived(chapter.id === 'GEN.1');
	const usesDevice = $derived(player.narrator === 'device' || !recordedAvailable);
	const verseStart = (number: number) =>
		recording.cues.find((cue) => cue.verse === number)?.start ?? 0;

	async function open(position: ReadingProgress, save = true) {
		const current = ++request;
		loadError = '';
		loading = true;
		try {
			const selected =
				position.chapterId === chapter.id ? chapter : await loadChapter(position.chapterId);
			if (current !== request) return;
			chapter = selected;
			selectedBook = chapterInfo(selected.id)!.bookId;
			selectedNumber = String(selected.chapter);
			progress = position;
			ready = true;
			if (save) persist();
		} catch (error) {
			if (current === request) {
				selectedBook = info.bookId;
				selectedNumber = String(chapter.chapter);
				loadError =
					error instanceof Error
						? error.message
						: 'Scripture could not be loaded. Please try again.';
			}
		} finally {
			if (current === request) loading = false;
		}
	}
	onMount(() => {
		function restore() {
			let saved = progress;
			try {
				saved = loadProgress(localStorage);
				storageError = false;
			} catch {
				storageError = true;
			}
			if (active) {
				saved = { ...saved, chapterId: player.chapterId, verse: player.verse, phase: player.phase };
				if (saved.phase === 'summary') saved = completeChapter(saved);
			}
			void open(saved, false);
		}
		restore();
		window.addEventListener('reading-progress', restore);
		return () => {
			request++;
			window.removeEventListener('reading-progress', restore);
		};
	});
	function persist() {
		try {
			saveProgress(localStorage, progress);
			storageError = false;
		} catch {
			storageError = true;
		}
	}
	function stop() {
		player.pause();
		player.stopSpeech();
		player.started = false;
	}
	function selectChapter(id: string) {
		stop();
		void open(moveToChapter(progress, id));
	}
	function goTo(number: number) {
		stop();
		progress = {
			...progress,
			verse: Math.max(1, Math.min(chapter.verses.length, number)),
			phase: 'reading'
		};
		persist();
	}
	function complete() {
		stop();
		progress = completeChapter(progress);
		persist();
		if (player.mode === 'voice' && summary) listenSummary();
	}
	function listenSummary() {
		if (active) {
			stop();
			return;
		}
		if (!summary) return;
		if (usesDevice) player.readDeviceSummary();
		else
			void player.play(
				player.started && player.phase === 'summary' ? undefined : recording.summaryStart
			);
	}
	function listen() {
		if (active) {
			stop();
			return;
		}
		if (usesDevice) {
			player.readDevice(progress.verse, chapter);
			return;
		}
		void player.play(
			player.started && player.currentTime > 0 && player.verse === progress.verse
				? undefined
				: verseStart(progress.verse)
		);
	}
</script>

<svelte:head><title>{chapter.book} {chapter.chapter} — Help with the Bible</title></svelte:head>

<section class="reader shell" aria-labelledby="reader-heading">
	<div class="reader-topline">
		<A href="/" class="text-link">Back to your journey</A><span>World English Bible</span>
	</div>
	<header class="reader-heading">
		<p class="section-label">{books.indexOf(book) < 39 ? 'Old Testament' : 'New Testament'}</p>
		<h1 id="reader-heading">{chapter.book} <span>{chapter.chapter}</span></h1>
		<p>One chapter at a time. All 66 books, from Genesis to Revelation.</p>
	</header>
	<nav class="chapter-navigation" aria-label="Bible chapters">
		<label>
			Book<Select
				bind:value={selectedBook}
				disabled={loading || !ready}
				onchange={(event) => selectChapter(`${event.currentTarget.value}.1`)}
			>
				{#each books as book}<option value={book.id}>{book.name}</option>{/each}
			</Select>
		</label>
		<label>
			Chapter<Select
				bind:value={selectedNumber}
				disabled={loading || !ready}
				onchange={(event) => selectChapter(`${info.bookId}.${event.currentTarget.value}`)}
			>
				{#each book.verses as _, index}<option value={String(index + 1)}>{index + 1}</option>{/each}
			</Select>
		</label>
		<div class="chapter-navigation-buttons">
			<Button
				variants={['ghost']}
				class="button-secondary"
				disabled={!previous || loading || !ready}
				onclick={() => previous && selectChapter(previous)}
			>
				Previous chapter
			</Button>
			<Button
				variants={['ghost']}
				class="button-secondary"
				disabled={!next || loading || !ready}
				onclick={() => next && selectChapter(next)}
			>
				Next chapter
			</Button>
		</div>
	</nav>
	<InteractionSettings {recordedAvailable} />
	{#if loadError}
		<div class="storage-warning" role="alert">
			<p>{loadError} Your saved place has not changed.</p>
			<Button class="button-secondary" onclick={() => window.location.reload()}>
				Reload reader
			</Button>
		</div>
	{/if}
	{#if loading || !ready}
		<p class="reader-loading" role="status">
			{loading ? 'Loading your chapter…' : 'Finding your place…'}
		</p>
	{:else if progress.phase === 'reading'}
		<div class="reader-status">
			<span>Verse {progress.verse} of {chapter.verses.length}</span><span>
				{storageError || player.storageError ? 'Reading in this session' : 'Your place is saved'}
			</span>
		</div>
		<progress
			class="reader-progress"
			max={chapter.verses.length}
			value={progress.verse - 1}
			aria-label="Verses read"
		></progress>
		<div class="verse-sheet" aria-live={active ? 'off' : 'polite'} aria-atomic="true">
			<span class="verse-number">{verse.number}</span>
			{#if verse.text}<p>{verse.text}</p>{:else}<p class="reader-smallprint">
					This verse number has no text in this edition. Continue to the next verse.
				</p>{/if}
		</div>
		<div class="reader-toolbar">
			<Button variants={['ghost']} class="audio-button" onclick={listen}>
				{active ? 'Stop narration' : summary ? 'Listen to chapter & summary' : 'Listen to chapter'}
			</Button>
			<div class="verse-navigation">
				<Button
					variants={['ghost']}
					class="button-secondary"
					disabled={progress.verse === 1 || active}
					onclick={() => goTo(progress.verse - 1)}
				>
					Previous verse
				</Button>
				<Button
					class="button-primary"
					disabled={active}
					onclick={() =>
						progress.verse === chapter.verses.length ? complete() : goTo(progress.verse + 1)}
				>
					{progress.verse === chapter.verses.length ? 'Finish chapter' : 'Next verse'}
				</Button>
			</div>
		</div>
		<p class="reader-smallprint">
			{usesDevice
				? 'Standard device speech reads the stored Scripture. Keep the app open; iOS may stop device speech when the screen locks.'
				: 'A bundled recording plays Genesis 1 and its summary continuously. Lock-screen behavior depends on your device.'}
		</p>
		{#if recordedAvailable}<A href={recording.src} download class="text-link audio-download">
				Download chapter & summary audio
			</A>{/if}
	{:else}
		<div class="chapter-summary">
			<div class="summary-complete"><Check size={18} />Chapter complete</div>
			{#if summary}
				<h2>{summary.title}</h2>
				<p class="summary-label">
					Chapter overview · Editorial commentary, separate from Scripture
				</p>
				<Button
					variants={['ghost']}
					class="button-secondary summary-listen"
					onclick={listenSummary}
				>
					{active ? 'Stop narration' : 'Listen to the summary'}
				</Button>
				{#each summary.paragraphs as paragraph}<p>{paragraph}</p>{/each}
			{:else}
				<h2>{chapter.book} {chapter.chapter}, read.</h2>
				<p>
					A written chapter overview is not available for this chapter yet. You can reread the
					Scripture or continue your journey.
				</p>
			{/if}
			{#if !next}<p>
					You have reached the final chapter of Revelation. Your completed chapters remain saved on
					this device.
				</p>{/if}
			<div class="summary-actions">
				<Button variants={['ghost']} class="button-secondary" onclick={() => goTo(1)}>
					Read chapter again
				</Button>
				{#if next}<Button
						class="button-primary"
						disabled={active}
						onclick={() => selectChapter(next!)}
					>
						Continue to {chapterInfo(next)?.book}
						{chapterInfo(next)?.chapter}
					</Button>{:else}<A href="/#your-place" class="button-primary">
						Return to your journey
					</A>{/if}
			</div>
		</div>
	{/if}
	{#if storageError || player.storageError}<p class="storage-warning" role="status">
			Your browser couldn’t save your place. Reading still works, but progress may be lost when you
			leave.
		</p>{/if}
	<p class="reader-source">
		Scripture: <A href={chapter.source}>World English Bible, {chapter.book} {chapter.chapter}</A> · Public
		domain. Verse words and punctuation are preserved; publisher footnotes are excluded from narration.
		Missing verse numbers are identified separately from Scripture.
	</p>
</section>
