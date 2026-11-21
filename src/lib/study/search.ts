import { books, chapterInfo, loadChapter } from '../bible/catalog.ts';

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases: Record<string, string> = {
	psalm: 'PSA',
	ps: 'PSA',
	psalms: 'PSA',
	songofsongs: 'SOL',
	song: 'SOL',
	jn: 'JOH',
	jhn: 'JOH',
	mt: 'MAT',
	mk: 'MAR',
	lk: 'LUK',
	phil: 'PHI',
	jas: 'JAM',
	james: 'JAM',
	rev: 'REV',
	revelations: 'REV'
};
for (const book of books) {
	aliases[normalize(book.name)] = book.id;
	aliases[normalize(book.id)] = book.id;
}
export function resolveReference(value: string) {
	const match = /^(.+?)\s*(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/.exec(value.trim());
	if (!match) return undefined;
	const id = aliases[normalize(match[1])];
	const chapter = chapterInfo(`${id}.${Number(match[2])}`);
	const start = Number(match[3] ?? 1),
		end = Number(match[4] ?? match[3] ?? chapter?.verseCount);
	return chapter &&
		Number.isInteger(start) &&
		start >= 1 &&
		end >= start &&
		end <= chapter.verseCount
		? { chapterId: chapter.id, start, end }
		: undefined;
}
export type SearchResult = {
	chapterId: string;
	book: string;
	chapter: number;
	verse: number;
	text: string;
};
export async function searchScripture(
	query: string,
	options: {
		bookId?: string;
		signal?: AbortSignal;
		onprogress?: (finished: number, total: number) => void;
	} = {}
) {
	const selected = books.filter((book) => !options.bookId || book.id === options.bookId);
	const reference = resolveReference(query);
	const phrase = query.trim().replace(/^"|"$/g, '').toLocaleLowerCase();
	if (phrase.length < 2)
		throw new Error('Enter at least two characters or a reference such as John 3:16.');
	const tokens = phrase.split(/\s+/);
	const results: SearchResult[] = [];
	let total = 0;
	for (const [index, book] of selected.entries()) {
		if (options.signal?.aborted) throw new DOMException('Search cancelled', 'AbortError');
		if (reference && !reference.chapterId.startsWith(`${book.id}.`)) continue;
		for (let chapterNumber = 1; chapterNumber <= book.verses.length; chapterNumber++) {
			const id = `${book.id}.${chapterNumber}`;
			if (reference && id !== reference.chapterId) continue;
			const chapter = await loadChapter(id);
			for (const verse of chapter.verses) {
				const lower = verse.text.toLocaleLowerCase();
				const found = reference
					? verse.number >= reference.start && verse.number <= reference.end
					: query.trim().startsWith('"')
						? lower.includes(phrase)
						: tokens.every((token) => lower.includes(token));
				if (found && verse.text) {
					total++;
					if (results.length < 200)
						results.push({
							chapterId: id,
							book: book.name,
							chapter: chapterNumber,
							verse: verse.number,
							text: verse.text
						});
				}
			}
		}
		options.onprogress?.(index + 1, selected.length);
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
	return { results, total };
}
