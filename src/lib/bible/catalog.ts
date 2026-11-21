import catalog from './catalog.json' with { type: 'json' };

export const books = catalog.books;
export const chapterIds = books.flatMap((book) =>
	book.verses.map((_, index) => `${book.id}.${index + 1}`)
);
export type Chapter = {
	id: string;
	book: string;
	chapter: number;
	source: string;
	verses: { number: number; text: string }[];
};

export function chapterInfo(id: string) {
	const match = /^(\w+)\.([1-9]\d*)$/.exec(id);
	if (!match) return undefined;
	const book = books.find((book) => book.id === match[1]);
	const chapter = Number(match[2]);
	const verseCount = book?.verses[chapter - 1];
	return book && verseCount
		? { id, bookId: book.id, book: book.name, chapter, verseCount, src: book.src }
		: undefined;
}

export function adjacentChapter(id: string, direction: -1 | 1): string | undefined {
	const index = chapterIds.indexOf(id);
	return index < 0 ? undefined : chapterIds[index + direction];
}

const downloads = new Map<string, Promise<{ chapters: Chapter['verses'][] }>>();
export async function loadChapter(id: string): Promise<Chapter> {
	const info = chapterInfo(id);
	if (!info) throw new Error('Unknown Bible chapter.');
	let download = downloads.get(info.src);
	if (!download) {
		download = fetch(info.src).then(async (response) => {
			if (!response.ok)
				throw new Error('Scripture could not be loaded. Please reconnect and try again.');
			return response.json();
		});
		downloads.set(info.src, download);
	}
	try {
		const data = await download;
		const verses = data.chapters[info.chapter - 1];
		if (
			!Array.isArray(verses) ||
			verses.length !== info.verseCount ||
			verses.some((verse, index) => verse.number !== index + 1 || typeof verse.text !== 'string')
		)
			throw new Error('This Scripture file is incomplete. Please update the app and try again.');
		return {
			id,
			book: info.book,
			chapter: info.chapter,
			source: 'https://ebible.org/engwebp/',
			verses
		};
	} catch (error) {
		downloads.delete(info.src);
		throw error;
	}
}
