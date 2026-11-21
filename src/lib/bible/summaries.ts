import manifest from './summary-catalog.json' with { type: 'json' };
import original from './genesis-1-summary.json' with { type: 'json' };
import { chapterInfo } from './catalog.ts';

export type ChapterSummary = {
	id: string;
	title: string;
	paragraphs: string[];
	outline: { text: string; start: number; end: number }[];
	context: string[];
	source: string;
	kind: string;
	attribution: string;
};
const sources: Record<string, { src: string; sha256: string }> = manifest.books;
const cache = new Map<string, Promise<ChapterSummary[]>>();
export async function loadSummary(id: string): Promise<ChapterSummary> {
	const info = chapterInfo(id);
	if (!info) throw new Error('Unknown chapter.');
	const source = sources[info.bookId];
	let request = cache.get(info.bookId);
	if (!request) {
		request = fetch(source.src).then((response) => {
			if (!response.ok)
				throw new Error('The chapter overview could not load. Reconnect and try again.');
			return response.json();
		});
		cache.set(info.bookId, request);
	}
	try {
		const data = await request;
		const summary = data[info.chapter - 1];
		if (summary?.id !== id || !summary.paragraphs?.length)
			throw new Error('This chapter overview is incomplete.');
		return id === 'GEN.1'
			? {
					...summary,
					...original,
					attribution:
						'Editorial overview, separate from Scripture. Book context and passage outlines: Matthew Henry, Concise Commentary (public domain).'
				}
			: summary;
	} catch (error) {
		cache.delete(info.bookId);
		throw error;
	}
}
