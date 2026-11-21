<script lang="ts">
	import { onMount } from 'svelte';
	import { A, Button, ReadAloud, BookOpen, Check } from '$lib/components';
	import chapter from '$lib/bible/genesis-1.json';
	import { initialProgress, loadProgress, saveProgress } from '$lib/reading/progress';

	let progress = $state(initialProgress());
	let ready = $state(false);
	let storageError = $state(false);
	let readingAloud = $state(false);
	const verse = $derived(chapter.verses[progress.verse - 1]);

	onMount(() => {
		try {
			progress = loadProgress(localStorage);
		} catch {
			storageError = true;
		}
		ready = true;
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
		progress = { ...progress, verse: Math.max(1, Math.min(31, number)), phase: 'reading' };
		persist();
	}

	function complete() {
		progress = { ...progress, verse: 31, phase: 'summary', completedChapterIds: ['GEN.1'] };
		persist();
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
	{#if !ready}
		<p class="reader-loading" role="status">Finding your place…</p>
	{:else if progress.phase === 'reading'}
		<div class="reader-status">
			<span>Verse {progress.verse} of 31</span><span>
				{storageError ? 'Reading in this session' : 'Your place is saved'}
			</span>
		</div>
		<progress class="reader-progress" max="31" value={progress.verse - 1} aria-label="Verses read"
		></progress>
		<div class="verse-sheet" aria-live="polite" aria-atomic="true">
			<span class="verse-number">{verse.number}</span>
			<p>{verse.text}</p>
		</div>
		<div class="reader-toolbar">
			<ReadAloud
				verses={chapter.verses}
				startIndex={progress.verse - 1}
				onverse={(index) => goTo(index + 1)}
				oncomplete={complete}
				onstate={(value) => (readingAloud = value)}
			/>
			<div class="verse-navigation">
				<Button
					variants={['ghost']}
					class="button-secondary"
					disabled={progress.verse === 1 || readingAloud}
					onclick={() => goTo(progress.verse - 1)}
				>
					Previous verse
				</Button><Button
					class="button-primary"
					disabled={readingAloud}
					onclick={() => (progress.verse === 31 ? complete() : goTo(progress.verse + 1))}
				>
					{progress.verse === 31 ? 'Finish chapter' : 'Next verse'}
				</Button>
			</div>
		</div>
		<p class="reader-smallprint">
			Narration uses your browser’s synthetic voice. Follow the written text for spelling and
			punctuation.
		</p>
	{:else}
		<div class="chapter-summary">
			<div class="summary-complete"><Check size={18} />Chapter complete</div>
			<h2>A world brought into order.</h2>
			<p class="summary-label">Chapter overview · Editorial commentary, separate from Scripture</p>
			<p>
				Genesis 1 describes God creating the heavens and the earth, bringing light, order, and life
				into a world described as formless and empty. Across six days, God separates and names,
				fills the sky, sea, and land, and repeatedly calls creation good.
			</p>
			<p>
				Humanity is created in God’s image, male and female, and given responsibility within
				creation (Genesis 1:26–28). The chapter closes with God seeing everything he has made as
				“very good” (Genesis 1:31).
			</p>
			<div class="reflection-prompt">
				<BookOpen size={20} />
				<div>
					<h3>A question to sit with</h3>
					<p>What do you notice about the repeated words “God said” and “God saw”?</p>
				</div>
			</div>
			<p class="reader-smallprint">
				You’ve reached the end of the first-chapter release. Genesis 2 and AI answers to your
				questions are coming in the next stage.
			</p>
			<div class="summary-actions">
				<Button variants={['ghost']} class="button-secondary" onclick={() => goTo(1)}>
					Read chapter again
				</Button><A href="/#your-place" class="button-primary">Return to your journey</A>
			</div>
		</div>
	{/if}
	{#if storageError}<p class="storage-warning" role="status">
			Your browser couldn’t save your place. Reading still works, but your progress may be lost when
			you leave.
		</p>{/if}
	<p class="reader-source">
		Scripture: <A href={chapter.source}>World English Bible, Genesis 1</A> · Public domain. Verse words
		and punctuation are preserved; source footnotes are not included in narration.
	</p>
</section>
