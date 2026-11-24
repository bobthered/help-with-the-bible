<script lang="ts">
	import { A, Button } from '$lib/components';
	import {
		loadRecording,
		downloadRecording,
		removeDownload,
		isDownloaded,
		type Recording
	} from '$lib/audio/recordings';
	let { chapterId }: { chapterId: string } = $props();
	let recording = $state<Recording | undefined>(),
		busy = $state(false),
		downloaded = $state(false),
		error = $state('');
	let controller: AbortController | undefined;
	$effect(() => {
		const id = chapterId;
		let disposed = false;
		recording = undefined;
		error = '';
		downloaded = false;
		loadRecording(id)
			.then(async (item) => {
				if (disposed) return;
				recording = item;
				try {
					const exists = await isDownloaded(item);
					if (!disposed) downloaded = exists;
				} catch {}
			})
			.catch(() => {
				if (!disposed)
					error = 'Recording details are unavailable. Reconnect and reopen this chapter.';
			});
		return () => {
			disposed = true;
			controller?.abort();
			busy = false;
		};
	});
	async function download() {
		if (!recording) return;
		const selected = recording;
		const active = new AbortController();
		controller = active;
		busy = true;
		error = '';
		try {
			await downloadRecording(selected, active.signal);
			if (!active.signal.aborted) downloaded = true;
		} catch (reason) {
			if (!active.signal.aborted)
				error =
					reason instanceof Error ? reason.message : 'Download failed. Check available storage.';
		} finally {
			if (controller === active) busy = false;
		}
	}
	async function remove() {
		if (!recording) return;
		try {
			await removeDownload(recording);
			downloaded = false;
		} catch {
			error = 'This download could not be removed.';
		}
	}
</script>

<div
	class="audio-download-panel mt-9 border-t border-t-divider pt-6 [&_h3]:mt-5 [&_h3]:mb-3 [&_h3]:font-serif [&_h3]:text-[length:1.4rem]"
>
	<h3>Recorded chapter & overview</h3>
	<p class="reader-smallprint mt-5.5 text-xs leading-[1.8] text-muted">
		{recording?.voiceLabel ?? 'Recorded synthetic voice'} · One continuous track for background listening.
		Download this chapter before going offline.
	</p>
	{#if recording}<div class="audio-download-actions flex flex-wrap items-center gap-2.5">
			{#if downloaded}<span role="status">Downloaded on this device</span><Button
					variants={['secondary']}
					class="button-secondary"
					onclick={remove}
				>
					Remove offline download
				</Button>
			{:else}<Button
					variants={['secondary']}
					class="button-secondary"
					onclick={download}
					disabled={busy}
				>
					{busy ? 'Downloading chapter…' : 'Download chapter for offline listening'}
				</Button>{/if}
			{#if busy}<Button
					variants={['secondary']}
					class="button-secondary"
					onclick={() => controller?.abort()}
				>
					Cancel download
				</Button>{/if}
			<A variants={['textLink']} href={recording.src} download>Save audio file</A>
		</div>{/if}
	{#if error}<p
			role="alert"
			class="storage-warning mt-6 border border-primary-600 p-4 text-sm leading-[1.7]"
		>
			{error}
		</p>{/if}
</div>
