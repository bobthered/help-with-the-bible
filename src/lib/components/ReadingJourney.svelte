<script lang="ts">
	import { onMount } from 'svelte';
	import { A, Bookmark, Check, BookOpen } from '$lib/components';
	import { initialProgress, loadProgress, PROGRESS_KEY } from '$lib/reading/progress';

	let progress = $state(initialProgress());
	let ready = $state(false);
	let storageAvailable = $state(true);
	let hasProgress = $state(false);

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
		return () => window.removeEventListener('storage', sync);
	});
</script>

<section class="journey-section shell" id="your-place" aria-labelledby="journey-heading">
	<div class="journey-intro">
		<Bookmark size={22} />
		<h2 id="journey-heading">There’s always a place<br />to come back to.</h2>
		<p>
			Your place is saved in this browser. No account. No pressure to keep a streak. Just pick up
			where you left off.
		</p>
	</div>
	<div class="journey-card">
		<p class="section-label">Your reading journey</p>
		<div class="journey-current">
			<BookOpen size={24} />
			<div>
				<h3>Genesis 1</h3>
				<p>
					{!ready
						? 'Finding your place…'
						: progress.phase === 'summary'
							? 'Chapter read · ready to reflect'
							: hasProgress
								? `Continue at verse ${progress.verse} of 31`
								: 'The beginning of something good.'}
				</p>
			</div>
		</div>
		<div class="journey-line"><span>Genesis</span><span>Revelation</span></div>
		<div class="journey-track">
			<span style:width={`${(progress.completedChapterIds.length / 1189) * 100}%`}></span>
		</div>
		<div class="journey-meta">
			<span>
				<Check size={14} />{progress.completedChapterIds.length} of 1,189 chapters read
			</span><span>At your pace</span>
		</div>
		<A href="/read" class="button-primary journey-link">
			{hasProgress ? 'Return to your reading' : 'Start with Genesis'}
		</A>
		<p class="journey-note">
			{storageAvailable
				? 'Saved on this device. Clearing browser data removes your progress.'
				: 'Browser storage is unavailable. You can still read in this session.'}
		</p>
	</div>
</section>
