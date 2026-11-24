<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { Button, Select } from '$lib/components';
	import { books, chapterInfo } from '$lib/bible/catalog';
	import { AUDIO_CONTEXT, type AudioState } from '$lib/audio/context';
	import { searchScripture, type SearchResult } from '$lib/study/search';
	import {
		LIBRARY_KEY,
		annotationKey,
		emptyLibrary,
		loadLibrary,
		setAnnotation,
		createBackup,
		parseBackup,
		restoreBackup,
		type Backup,
		type Annotation
	} from '$lib/study/library';
	let {
		chapterId,
		verse,
		onopen
	}: { chapterId: string; verse: number; onopen: (id: string, verse: number) => void } = $props();
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	let library = $state(emptyLibrary()),
		ready = $state(false),
		error = $state(''),
		notice = $state('');
	let note = $state(''),
		highlight = $state<Annotation['highlight']>('none');
	let query = $state(''),
		bookFilter = $state(''),
		searching = $state(false),
		searchProgress = $state(''),
		searchError = $state('');
	let results = $state<SearchResult[]>([]),
		total = $state<number | null>(null);
	let backup = $state<Backup | null>(null),
		backupError = $state('');
	let controller: AbortController | undefined;
	let fileInput: HTMLInputElement;
	const current = $derived(library.annotations[annotationKey(chapterId, verse)]);
	const saved = $derived(
		Object.values(library.annotations).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
	);
	const reference = $derived(
		`${chapterInfo(chapterId)?.book} ${chapterInfo(chapterId)?.chapter}:${verse}`
	);
	$effect(() => {
		chapterId;
		verse;
		note = current?.note ?? '';
		highlight = current?.highlight ?? 'none';
	});
	onMount(() => {
		const refresh = () => {
			try {
				library = loadLibrary(localStorage);
				ready = true;
			} catch {
				error = 'Saved notes could not be read. Export a backup before clearing browser storage.';
			}
		};
		refresh();
		window.addEventListener('library-change', refresh);
		window.addEventListener('storage', refresh);
		return () => {
			controller?.abort();
			window.removeEventListener('library-change', refresh);
			window.removeEventListener('storage', refresh);
		};
	});
	function save(bookmarked = current?.bookmarked ?? false) {
		try {
			const updated = setAnnotation(library, {
				chapterId,
				verse,
				bookmarked,
				highlight,
				note,
				updatedAt: new Date().toISOString()
			});
			localStorage.setItem(LIBRARY_KEY, JSON.stringify(updated));
			library = updated;
			error = '';
			window.dispatchEvent(new Event('library-change'));
			notice = `Saved ${reference} on this device.`;
		} catch {
			error = 'Your note could not be saved. Check available browser storage and try again.';
		}
	}
	async function search(event: SubmitEvent) {
		event.preventDefault();
		controller?.abort();
		const active = new AbortController();
		controller = active;
		searching = true;
		searchError = '';
		results = [];
		total = null;
		try {
			const found = await searchScripture(query, {
				bookId: bookFilter,
				signal: active.signal,
				onprogress: (done, all) => {
					if (controller === active) searchProgress = `Searching books ${done} of ${all}…`;
				}
			});
			if (controller === active) {
				results = found.results;
				total = found.total;
			}
		} catch (error) {
			if (controller === active && !active.signal.aborted)
				searchError = error instanceof Error ? error.message : 'Search could not finish.';
		} finally {
			if (controller === active) searching = false;
		}
	}
	function exportData() {
		try {
			const data = createBackup(localStorage);
			const url = URL.createObjectURL(
				new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
			);
			const link = document.createElement('a');
			link.href = url;
			link.download = `bible-backup-${new Date().toISOString().slice(0, 10)}.json`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			backupError = '';
		} catch (error) {
			backupError = error instanceof Error ? error.message : 'Backup could not be created.';
		}
	}
	async function chooseBackup() {
		backup = null;
		backupError = '';
		const file = fileInput.files?.[0];
		if (!file) return;
		if (file.size > 20_000_000) {
			backupError = 'Choose a backup smaller than 20 MB.';
			return;
		}
		try {
			backup = parseBackup(await file.text());
		} catch (error) {
			backupError = error instanceof Error ? error.message : 'This backup is invalid.';
		}
	}
	function restore() {
		if (!backup) return;
		try {
			player.pause();
			player.stopSpeech();
			player.started = false;
			restoreBackup(localStorage, backup);
			window.location.reload();
		} catch {
			backupError =
				'Restore failed. Check available browser storage before trying again. Your previous data was kept where possible.';
		}
	}
</script>

<section
	class="study-panel mt-9 border-t border-t-divider pt-6 [&_h3]:mt-5 [&_h3]:mb-3 [&_h3]:font-serif [&_h3]:text-[length:1.4rem] [&_input]:min-h-11 [&_input]:max-w-full [&_input]:rounded [&_input]:border [&_input]:border-divider [&_input]:bg-surface [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-foreground phone:[&_input[type='file']]:w-full [&_label]:grid [&_label]:gap-2 [&_label]:text-sm [&_select]:min-h-11 [&_select]:max-w-full [&_select]:rounded [&_select]:border [&_select]:border-divider [&_select]:bg-surface [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-foreground [&_textarea]:min-h-11 [&_textarea]:w-full [&_textarea]:max-w-full [&_textarea]:resize-y [&_textarea]:rounded [&_textarea]:border [&_textarea]:border-divider [&_textarea]:bg-surface [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-foreground"
	aria-label="Study tools"
>
	<div class="verse-tools flex flex-wrap items-center gap-2.5">
		<span>{reference}</span><Button
			variants={['secondary']}
			class="button-secondary"
			disabled={!ready}
			aria-pressed={current?.bookmarked ?? false}
			onclick={() => save(!(current?.bookmarked ?? false))}
		>
			{current?.bookmarked ? 'Remove bookmark' : 'Bookmark verse'}
		</Button>
	</div>
	<details
		class="study-disclosure border-b border-b-divider py-4.5 [&_>_.button-secondary]:my-3.5 [&_>_label]:my-3.5 [&_>_p]:my-3.5 [&_>_summary]:min-h-9 [&_>_summary]:cursor-pointer [&_>_summary]:text-foreground [&[open]_>_summary]:mb-4.5"
	>
		<summary>Notes & highlights for this verse</summary>
		<label for="highlight">
			Highlight<Select id="highlight" bind:value={highlight}>
				<option value="none">None</option><option value="gold">Gold</option><option value="blue">
					Blue
				</option>
			</Select>
		</label>
		<label for="verse-note">
			Your note<textarea
				id="verse-note"
				bind:value={note}
				maxlength="12000"
				rows="4"
				placeholder="What stands out to you?"></textarea>
		</label>
		<Button
			variants={['secondary']}
			class="button-secondary"
			disabled={!ready}
			onclick={() => save()}
		>
			Save note & highlight
		</Button>
		<p class="reader-smallprint mt-5.5 text-xs leading-[1.8] text-muted">
			Your notes stay on this device. They are separate from Scripture.
		</p>
	</details>
	{#if notice}<p role="status">{notice}</p>{/if}{#if error}<p
			class="storage-warning mt-6 border border-primary-600 p-4 text-sm leading-[1.7]"
			role="alert"
		>
			{error}
		</p>{/if}
	<details
		class="study-disclosure border-b border-b-divider py-4.5 [&_>_.button-secondary]:my-3.5 [&_>_label]:my-3.5 [&_>_p]:my-3.5 [&_>_summary]:min-h-9 [&_>_summary]:cursor-pointer [&_>_summary]:text-foreground [&[open]_>_summary]:mb-4.5"
	>
		<summary>Search Scripture</summary>
		<form
			onsubmit={search}
			class="scripture-search flex flex-wrap items-end gap-3.5 [&_input]:w-full [&_label]:min-w-0 [&_label]:flex-[1_1_180px]"
		>
			<label for="scripture-query">
				Words or reference<input
					id="scripture-query"
					bind:value={query}
					type="search"
					minlength="2"
					maxlength="160"
					required
					placeholder="John 3:16, love, or &quot;do not fear&quot;"
				/>
			</label>
			<label for="search-book">
				Search in<Select id="search-book" bind:value={bookFilter}>
					<option value="">All books</option>{#each books as book}<option value={book.id}>
							{book.name}
						</option>{/each}
				</Select>
			</label>
			<Button variants={['secondary']} class="button-secondary" type="submit">
				{searching ? 'Search again' : 'Search'}
			</Button>
		</form>
		{#if searching}<p role="status">{searchProgress || 'Searching Scripture…'}</p>{/if}
		{#if searchError}<p
				role="alert"
				class="storage-warning mt-6 border border-primary-600 p-4 text-sm leading-[1.7]"
			>
				{searchError}
			</p>{/if}
		{#if total !== null}<p role="status">
				{total === 0
					? 'No matching verses.'
					: `${total} matching verses${total > 200 ? ' · showing the first 200; narrow your search for more.' : '.'}`}
			</p>{/if}
		<div class="search-results mt-4 grid max-h-125 gap-3 overflow-auto">
			{#each results as result}<Button
					variants={['searchResult']}
					class="search-result"
					onclick={() => onopen(result.chapterId, result.verse)}
				>
					<strong>{result.book} {result.chapter}:{result.verse}</strong><span>{result.text}</span>
				</Button>{/each}
		</div>
		<p class="reader-smallprint mt-5.5 text-xs leading-[1.8] text-muted">
			Search works offline after initial setup. Use quotation marks for an exact phrase.
		</p>
	</details>
	<details
		class="study-disclosure border-b border-b-divider py-4.5 [&_>_.button-secondary]:my-3.5 [&_>_label]:my-3.5 [&_>_p]:my-3.5 [&_>_summary]:min-h-9 [&_>_summary]:cursor-pointer [&_>_summary]:text-foreground [&[open]_>_summary]:mb-4.5"
	>
		<summary>Saved passages ({saved.length})</summary>
		{#if !saved.length}<p>
				Bookmark a verse, add a highlight, or save a note to find it here.
			</p>{/if}
		{#each saved as item}<div
				class="saved-passage border-b border-b-divider py-3.5 [&_p]:mt-2 [&_p]:leading-[1.8] [&_p]:[overflow-wrap:anywhere] [&_p]:whitespace-pre-wrap [&_p]:text-muted"
			>
				<Button variants={['textLink']} onclick={() => onopen(item.chapterId, item.verse)}>
					{chapterInfo(item.chapterId)?.book}
					{chapterInfo(item.chapterId)?.chapter}:{item.verse}{item.bookmarked
						? ' · bookmarked'
						: ''}{item.highlight !== 'none' ? ` · ${item.highlight} highlight` : ''}
				</Button>{#if item.note}<p>{item.note}</p>{/if}
			</div>{/each}
	</details>
	<details
		class="study-disclosure border-b border-b-divider py-4.5 [&_>_.button-secondary]:my-3.5 [&_>_label]:my-3.5 [&_>_p]:my-3.5 [&_>_summary]:min-h-9 [&_>_summary]:cursor-pointer [&_>_summary]:text-foreground [&[open]_>_summary]:mb-4.5"
	>
		<summary>Backup & restore</summary>
		<p>
			Export your reading place, completed chapters, notes, highlights, bookmarks, and preferences.
			Import the file on another device to continue there.
		</p>
		<Button variants={['secondary']} class="button-secondary" onclick={exportData}>
			Download backup
		</Button>
		<label for="backup-file">
			Choose a backup to restore<input
				bind:this={fileInput}
				id="backup-file"
				type="file"
				accept="application/json,.json"
				onchange={chooseBackup}
			/>
		</label>
		{#if backup}<div
				class="backup-preview mt-4 border border-divider p-4.5 [&_p]:mb-3.5 [&_p]:leading-[1.8]"
			>
				<h3>Review this backup</h3>
				<p>
					Exported {new Date(backup.exportedAt).toLocaleString()}. Reading place: {chapterInfo(
						backup.progress.chapterId
					)?.book}
					{chapterInfo(backup.progress.chapterId)?.chapter}:{backup.progress.verse}. {backup
						.progress.completedChapterIds.length} completed chapters and {Object.keys(
						backup.library.annotations
					).length} saved passages.
				</p>
				<p>
					Restoring replaces the data on this device. Download your current backup first if you want
					to keep it. Recorded audio downloads are not included.
				</p>
				<Button variants={['primary']} class="button-primary" onclick={restore}>
					Replace local data with this backup
				</Button><Button
					variants={['secondary']}
					class="button-secondary"
					onclick={() => {
						backup = null;
						fileInput.value = '';
					}}
				>
					Cancel
				</Button>
			</div>{/if}
		{#if backupError}<p
				role="alert"
				class="storage-warning mt-6 border border-primary-600 p-4 text-sm leading-[1.7]"
			>
				{backupError}
			</p>{/if}
		<p class="reader-smallprint mt-5.5 text-xs leading-[1.8] text-muted">
			Backup files contain your personal notes. Keep them somewhere private. No account or upload is
			required.
		</p>
	</details>
</section>
