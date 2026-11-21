<script lang="ts">
	import { getContext, onMount, tick } from 'svelte';
	import {
		A,
		Button,
		Select,
		Check,
		InteractionSettings,
		StudyPanel,
		AudioDownload
	} from '$lib/components';
	import genesis from '$lib/bible/genesis-1.json';
	import {
		books,
		chapterInfo,
		adjacentChapter,
		loadChapter,
		type Chapter
	} from '$lib/bible/catalog';
	import { loadSummary, type ChapterSummary } from '$lib/bible/summaries';
	import {
		READER_KEY,
		annotationKey,
		emptyLibrary,
		loadLibrary,
		loadPreferences,
		defaultPreferences
	} from '$lib/study/library';
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
	let preferences = $state(defaultPreferences()),
		library = $state(emptyLibrary());
	let jumpVerse = $state(1);
	let summary = $state<ChapterSummary | undefined>();
	let summaryError = $state('');
	const verse = $derived(chapter.verses[progress.verse - 1]);
	const info = $derived(chapterInfo(chapter.id)!);
	const book = $derived(books.find((book) => book.id === info.bookId)!);
	const previous = $derived(adjacentChapter(chapter.id, -1));
	const next = $derived(adjacentChapter(chapter.id, 1));
	const active = $derived(player.playing || player.speaking);
	const recordedAvailable = true;
	const usesDevice = $derived(player.narrator === 'device' || !recordedAvailable);

	async function open(position: ReadingProgress, save = true) {
		const current = ++request;
		loadError = '';
		loading = true;
		try {
			const [selected, overview] = await Promise.all([
				position.chapterId === chapter.id
					? Promise.resolve(chapter)
					: loadChapter(position.chapterId),
				loadSummary(position.chapterId).catch(() => undefined)
			]);
			if (current !== request) return;
			chapter = selected;
			summary = overview;
			summaryError = overview
				? ''
				: 'The chapter overview could not load. Reconnect and reopen this chapter to try again.';
			selectedBook = chapterInfo(selected.id)!.bookId;
			selectedNumber = String(selected.chapter);
			progress = position;
			jumpVerse = position.verse;
			ready = true;
			if (save) {
				persist();
				void tick().then(() => {
					const target =
						preferences.view === 'chapter'
							? document.getElementById(`verse-${position.verse}`)
							: document.querySelector('.verse-sheet');
					target?.scrollIntoView({ block: preferences.view === 'chapter' ? 'center' : 'start' });
				});
			}
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
		try {
			preferences = loadPreferences(localStorage);
			library = loadLibrary(localStorage);
		} catch {
			storageError = true;
		}
		const refreshLibrary = () => {
			try {
				library = loadLibrary(localStorage);
			} catch {
				storageError = true;
			}
		};
		window.addEventListener('library-change', refreshLibrary);
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
			if (ready && saved.chapterId === chapter.id) {
				progress = saved;
				jumpVerse = saved.verse;
				return;
			}
			void open(saved, false);
		}
		restore();
		window.addEventListener('reading-progress', restore);
		return () => {
			request++;
			window.removeEventListener('reading-progress', restore);
			window.removeEventListener('library-change', refreshLibrary);
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
	function selectChapter(id: string, verse = 1) {
		stop();
		void open({ ...moveToChapter(progress, id), verse });
	}
	function goTo(number: number) {
		stop();
		progress = {
			...progress,
			verse: Math.max(1, Math.min(chapter.verses.length, number)),
			phase: 'reading'
		};
		persist();
		jumpVerse = progress.verse;
		if (preferences.view === 'chapter') {
			const selected = progress.verse;
			void tick().then(() =>
				document.getElementById(`verse-${selected}`)?.scrollIntoView({ block: 'center' })
			);
		}
	}
	function savePreferences() {
		try {
			localStorage.setItem(READER_KEY, JSON.stringify(preferences));
		} catch {
			storageError = true;
		}
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
		if (usesDevice) player.readDeviceSummary(chapter, summary);
		else void player.playChapter(chapter, chapter.verses.length, true);
	}
	function listen() {
		if (active) {
			stop();
			return;
		}
		if (usesDevice) {
			player.readDevice(progress.verse, chapter, summary);
			return;
		}
		void player.playChapter(chapter, progress.verse);
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
	<div class="reading-preferences">
		<div role="group" aria-label="Reading view">
			<Button
				variants={['ghost']}
				class="button-secondary"
				aria-pressed={preferences.view === 'verse'}
				onclick={() => {
					preferences.view = 'verse';
					savePreferences();
				}}
			>
				One verse
			</Button><Button
				variants={['ghost']}
				class="button-secondary"
				aria-pressed={preferences.view === 'chapter'}
				onclick={() => {
					preferences.view = 'chapter';
					savePreferences();
				}}
			>
				Whole chapter
			</Button>
		</div>
		<label for="reader-size">
			Text size: {preferences.fontSize}px<input
				id="reader-size"
				type="range"
				min="16"
				max="36"
				step="1"
				bind:value={preferences.fontSize}
				onchange={savePreferences}
			/>
		</label>
		<label for="reader-spacing">
			Line spacing<Select
				id="reader-spacing"
				bind:value={preferences.lineHeight}
				onchange={(event) => {
					preferences.lineHeight = Number(event.currentTarget.value);
					savePreferences();
				}}
			>
				<option value={1.6}>Compact</option><option value={1.9}>Comfortable</option><option
					value={2.3}
				>
					Spacious
				</option>
			</Select>
		</label>
		<form
			class="verse-jump"
			onsubmit={(event) => {
				event.preventDefault();
				if (Number.isInteger(jumpVerse) && jumpVerse >= 1 && jumpVerse <= chapter.verses.length)
					goTo(jumpVerse);
			}}
		>
			<label for="jump-verse">
				Verse<input
					id="jump-verse"
					type="number"
					min="1"
					max={chapter.verses.length}
					bind:value={jumpVerse}
					required
				/>
			</label><Button class="button-secondary" type="submit" disabled={active || !ready || loading}>
				Go to verse
			</Button>
		</form>
	</div>
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
		{#if preferences.view === 'chapter'}
			<div
				class="chapter-sheet"
				style:font-size={`${preferences.fontSize}px`}
				style:line-height={preferences.lineHeight}
				aria-label={`${chapter.book} ${chapter.chapter}, full chapter`}
			>
				{#each chapter.verses as item}<article
						id={`verse-${item.number}`}
						class:current-verse={item.number === progress.verse}
						data-highlight={library.annotations[annotationKey(chapter.id, item.number)]
							?.highlight ?? 'none'}
					>
						<Button
							variants={['ghost']}
							class="verse-anchor"
							disabled={active}
							aria-label={`Read from verse ${item.number}`}
							aria-pressed={item.number === progress.verse}
							onclick={() => goTo(item.number)}
						>
							{item.number}
						</Button>{#if item.text}<p>{item.text}</p>{:else}<p class="reader-smallprint">
								This verse number has no text in this edition.
							</p>{/if}{#if library.annotations[annotationKey(chapter.id, item.number)]?.bookmarked}<span
								class="reader-smallprint"
							>
								Bookmarked
							</span>{/if}
					</article>{/each}
			</div>
		{:else}<div
				class="verse-sheet"
				style:font-size={`${preferences.fontSize}px`}
				style:line-height={preferences.lineHeight}
				data-highlight={library.annotations[annotationKey(chapter.id, progress.verse)]?.highlight ??
					'none'}
				aria-live={active ? 'off' : 'polite'}
				aria-atomic="true"
			>
				<span class="verse-number">{verse.number}</span>
				{#if verse.text}<p>{verse.text}</p>{:else}<p class="reader-smallprint">
						This verse number has no text in this edition. Continue to the next verse.
					</p>{/if}
			</div>{/if}
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
				: 'One recorded track contains this chapter and its spoken overview. Download it for offline listening. Lock-screen playback depends on your device and interruptions.'}
		</p>
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
				<p class="reader-smallprint">
					{summary.kind} · {summary.attribution}
					<A href={summary.source}>Read the source commentary</A>
				</p>
				{#if summary.context.length}<h3>Book context</h3>
					{#each summary.context as paragraph}<p>{paragraph}</p>{/each}{/if}
				<h3>Passages to revisit</h3>
				<ul>
					{#each summary.outline as passage}<li>
							<Button
								variants={['ghost']}
								class="text-link"
								onclick={() => selectChapter(chapter.id, passage.start)}
							>
								{chapter.book}
								{chapter.chapter}:{passage.start}{passage.end !== passage.start
									? `–${passage.end}`
									: ''}
							</Button> — {passage.text}
						</li>{/each}
				</ul>
			{:else}
				<h2>{chapter.book} {chapter.chapter}, read.</h2>
				<p>
					{summaryError}
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
	{#if ready && !loading}<AudioDownload chapterId={chapter.id} />{/if}
	{#if ready && !loading}<StudyPanel
			chapterId={chapter.id}
			verse={progress.verse}
			onopen={selectChapter}
		/>{/if}
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
