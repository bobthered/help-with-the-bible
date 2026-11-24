<script lang="ts">
	import { onMount } from 'svelte';
	import { A, Bookmark, Check, BookOpen } from '$lib/components';
	import { initialProgress, loadProgress, PROGRESS_KEY } from '$lib/reading/progress';
	import { chapterInfo } from '$lib/bible/catalog';

	let progress = $state(initialProgress());
	let ready = $state(false);
	let storageAvailable = $state(true);
	let hasProgress = $state(false);
	const chapter = $derived(chapterInfo(progress.chapterId)!);

	onMount(() => {
		function refresh() {
			try {
				progress = loadProgress(localStorage);
				hasProgress = localStorage.getItem(PROGRESS_KEY) !== null;
			} catch {
				storageAvailable = false;
			}
			ready = true;
		}
		refresh();
		const sync = (event: StorageEvent) => {
			if (event.key === PROGRESS_KEY || event.key === null) refresh();
		};
		window.addEventListener('storage', sync);
		window.addEventListener('reading-progress', refresh);
		return () => {
			window.removeEventListener('storage', sync);
			window.removeEventListener('reading-progress', refresh);
		};
	});
</script>

<section
	class="journey-section shell mx-auto grid w-[min(1200px,_calc(100%_-_96px))] grid-cols-[1fr_1.05fr] items-center gap-30 py-24 tablet:w-[calc(100%_-_64px)] tablet:gap-13.75 mobile:w-[calc(100%_-_40px)] mobile:grid-cols-[1fr] mobile:gap-8.75 mobile:py-13.75"
	id="your-place"
	aria-labelledby="journey-heading"
>
	<div
		class="journey-intro [&_>_svg]:mb-5.5 [&_>_svg]:text-accent [&_h2]:font-serif [&_h2]:text-[length:clamp(2rem,_3vw,_2.75rem)] [&_h2]:leading-[1.18] [&_h2]:font-normal [&_h2]:tracking-[-0.03em] mobile:[&_h2_br]:hidden [&_p]:mt-5.5 [&_p]:max-w-87.5 [&_p]:text-[0.9375rem] [&_p]:leading-[1.8] [&_p]:text-muted mobile:[&_p]:max-w-full"
	>
		<Bookmark size={22} />
		<h2 id="journey-heading">There’s always a place<br />to come back to.</h2>
		<p>
			Your place is saved in this browser. No account. No pressure to keep a streak. Just pick up
			where you left off.
		</p>
	</div>
	<div
		class="journey-card rounded border border-divider p-7.5 mobile:p-6.25 [&_>_.section-label]:text-muted"
	>
		<p class="section-label text-[0.8125rem] font-medium text-accent">Your reading journey</p>
		<div
			class="journey-current mt-6.5 flex items-center gap-3.75 [&_>_svg]:text-accent [&_h3]:font-serif [&_h3]:text-2xl [&_p]:mt-1.25 [&_p]:text-[0.8125rem] [&_p]:text-muted"
		>
			<BookOpen size={24} />
			<div>
				<h3>{chapter.book} {chapter.chapter}</h3>
				<p>
					{!ready
						? 'Finding your place…'
						: progress.phase === 'summary'
							? 'Chapter complete · ready to continue'
							: hasProgress
								? `Continue at verse ${progress.verse} of ${chapter.verseCount}`
								: 'The beginning of something good.'}
				</p>
			</div>
		</div>
		<div class="journey-line mt-7.5 flex justify-between text-xs text-muted">
			<span>Genesis</span><span>Revelation</span>
		</div>
		<div
			class="journey-track mt-2.5 h-1 overflow-hidden rounded-xs bg-divider [&_>_span]:block [&_>_span]:h-full [&_>_span]:min-w-0 [&_>_span]:bg-primary-500"
		>
			<span
				class="w-[var(--journey-progress)]"
				style:--journey-progress={`${(progress.completedChapterIds.length / 1189) * 100}%`}
			></span>
		</div>
		<div
			class="journey-meta mt-3 flex justify-between gap-2.5 text-[0.6875rem] text-muted mobile:flex-wrap [&_>_span:first-child]:flex [&_>_span:first-child]:items-center [&_>_span:first-child]:gap-1.25"
		>
			<span>
				<Check size={14} />{progress.completedChapterIds.length} of 1,189 chapters read
			</span><span>At your pace</span>
		</div>
		<A variants={['primary']} href="/read" class="button-primary journey-link mt-6.5 w-full">
			{hasProgress ? 'Return to your reading' : 'Start with Genesis'}
		</A>
		<p class="journey-note mt-3.25 text-center text-[0.6875rem] leading-[1.7] text-muted">
			{storageAvailable
				? 'Saved on this device. Clearing browser data removes your progress.'
				: 'Browser storage is unavailable. You can still read in this session.'}
		</p>
	</div>
</section>
