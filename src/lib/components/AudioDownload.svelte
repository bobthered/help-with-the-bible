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

<div class="audio-download-panel">
	<h3>Recorded chapter & overview</h3>
	<p class="reader-smallprint">
		{recording?.voiceLabel ?? 'Recorded synthetic voice'} · One continuous track for background listening.
		Download this chapter before going offline.
	</p>
	{#if recording}<div class="audio-download-actions">
			{#if downloaded}<span role="status">Downloaded on this device</span><Button
					variants={['ghost']}
					class="button-secondary"
					onclick={remove}
				>
					Remove offline download
				</Button>
			{:else}<Button class="button-secondary" onclick={download} disabled={busy}>
					{busy ? 'Downloading chapter…' : 'Download chapter for offline listening'}
				</Button>{/if}
			{#if busy}<Button
					variants={['ghost']}
					class="button-secondary"
					onclick={() => controller?.abort()}
				>
					Cancel download
				</Button>{/if}
			<A href={recording.src} download class="text-link">Save audio file</A>
		</div>{/if}
	{#if error}<p role="alert" class="storage-warning">{error}</p>{/if}
</div>
