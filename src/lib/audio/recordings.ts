import { chapterInfo } from '../bible/catalog.ts';
import type { AudioCue } from './context.ts';
export { DOWNLOAD_CACHE } from './cache.ts';
import { DOWNLOAD_CACHE } from './cache.ts';
export type Recording = {
	src: string;
	duration: number;
	summaryStart: number;
	cues: AudioCue[];
	textSha256: string;
	audioSha256: string;
	voiceLabel?: string;
	lastVerse?: number;
};
const metadata = new Map<string, Promise<Record<string, Recording>>>();
export async function loadRecording(id: string): Promise<Recording> {
	const info = chapterInfo(id);
	if (!info) throw new Error('Unknown chapter.');
	let request = metadata.get(info.bookId);
	if (!request) {
		request = fetch(`/audio/metadata/${info.bookId}.json`).then((response) => {
			if (!response.ok)
				throw new Error('The recording details could not load. Reconnect and try again.');
			return response.json();
		});
		metadata.set(info.bookId, request);
	}
	try {
		const data = await request;
		const item = data[id];
		if (!item?.src.startsWith('/audio/') || !item.duration || !item.cues?.length)
			throw new Error('This recording is unavailable.');
		return { ...item, lastVerse: info.verseCount };
	} catch (error) {
		metadata.delete(info.bookId);
		throw error;
	}
}
export async function isDownloaded(recording: Recording) {
	return !!(await (await caches.open(DOWNLOAD_CACHE)).match(recording.src));
}
export async function downloadRecording(recording: Recording, signal?: AbortSignal) {
	const response = await fetch(recording.src, { signal });
	if (!response.ok || response.status === 206)
		throw new Error('The complete recording could not be downloaded.');
	const data = await response.arrayBuffer();
	const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), (byte) =>
		byte.toString(16).padStart(2, '0')
	).join('');
	if (digest !== recording.audioSha256)
		throw new Error('The audio download was incomplete. Please try again.');
	if (signal?.aborted) throw new DOMException('Download cancelled', 'AbortError');
	await (
		await caches.open(DOWNLOAD_CACHE)
	).put(
		recording.src,
		new Response(data, {
			headers: {
				'Content-Type': recording.src.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg',
				'Content-Length': String(data.byteLength),
				'Accept-Ranges': 'bytes'
			}
		})
	);
}
export async function removeDownload(recording: Recording) {
	await (await caches.open(DOWNLOAD_CACHE)).delete(recording.src);
}
