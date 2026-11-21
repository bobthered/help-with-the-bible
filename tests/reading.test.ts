import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
	initialProgress,
	parseProgress,
	loadProgress,
	saveProgress,
	PROGRESS_KEY
} from '../src/lib/reading/progress.ts';
import { moveToChapter, completeChapter } from '../src/lib/reading/progress.ts';
import {
	books,
	chapterIds,
	chapterInfo,
	adjacentChapter,
	loadChapter
} from '../src/lib/bible/catalog.ts';
import { narrationSegments, chapterSummary } from '../src/lib/audio/segments.ts';
import { createHash } from 'node:crypto';
import catalog from '../src/lib/bible/catalog.json' with { type: 'json' };

test('new and malformed progress starts at Genesis 1:1', () => {
	for (const value of [null, '{broken', 'null', '[]', '{}']) {
		assert.deepEqual(parseProgress(value), initialProgress());
	}
});

test('invalid verse, translation, version, and chapter do not corrupt the reading position', () => {
	for (const override of [
		{ verse: 0 },
		{ verse: 32 },
		{ verse: 1.5 },
		{ verse: '2' },
		{ translationId: 'other' },
		{ version: 2 },
		{ chapterId: 'GEN.51' },
		{ completedChapterIds: ['fake'] }
	]) {
		assert.deepEqual(
			parseProgress(JSON.stringify({ ...initialProgress(), ...override })),
			initialProgress()
		);
	}
});

test('all 66 books and 1,189 chapters have consecutive publisher verse entries and matching checksums', () => {
	assert.equal(books.length, 66);
	assert.equal(chapterIds.length, 1189);
	assert.equal(chapterIds[0], 'GEN.1');
	assert.equal(chapterIds.at(-1), 'REV.22');
	let entries = 0;
	for (const book of books) {
		const raw = readFileSync(new URL(`../static${book.src}`, import.meta.url));
		assert.equal(createHash('sha256').update(raw).digest('hex'), book.sha256);
		const data = JSON.parse(raw.toString('utf8'));
		assert.equal(data.id, book.id);
		assert.equal(data.chapters.length, book.verses.length);
		data.chapters.forEach((verses: { number: number; text: string }[], index: number) => {
			assert.equal(verses.length, book.verses[index]);
			for (const [index, verse] of verses.entries()) {
				assert.equal(verse.number, index + 1);
				assert.equal(typeof verse.text, 'string');
				assert.ok(!/[<>\uFFFD]/.test(verse.text));
			}
			entries += verses.length;
		});
	}
	assert.equal(entries, 31103);
	assert.equal(catalog.license, 'Public domain');
	const genesis = JSON.parse(
		readFileSync(new URL(`../static${books[0].src}`, import.meta.url), 'utf8')
	);
	const original = JSON.parse(
		readFileSync(new URL('../src/lib/bible/genesis-1.json', import.meta.url), 'utf8')
	);
	assert.deepEqual(genesis.chapters[0], original.verses);
});

test('chapter traversal crosses books and testament boundaries and stops at the ends', () => {
	assert.equal(adjacentChapter('GEN.50', 1), 'EXO.1');
	assert.equal(adjacentChapter('EXO.1', -1), 'GEN.50');
	assert.equal(adjacentChapter('MAL.4', 1), 'MAT.1');
	assert.equal(adjacentChapter('GEN.1', -1), undefined);
	assert.equal(adjacentChapter('REV.22', 1), undefined);
	assert.equal(chapterInfo('PSA.119')?.verseCount, 176);
	assert.equal(chapterInfo('REV.23'), undefined);
});

test('progress resumes any chapter, preserves earlier completions, and validates chapter-specific verse counts', () => {
	const genesis = completeChapter(initialProgress());
	const exodus = moveToChapter(genesis, 'EXO.1');
	assert.equal(exodus.verse, 1);
	assert.equal(exodus.phase, 'reading');
	assert.deepEqual(exodus.completedChapterIds, ['GEN.1']);
	const completed = completeChapter(exodus);
	assert.deepEqual(completed.completedChapterIds, ['GEN.1', 'EXO.1']);
	assert.deepEqual(parseProgress(JSON.stringify(completed)), completed);
	assert.deepEqual(parseProgress(JSON.stringify({ ...completed, verse: 23 })), initialProgress());
	const psalm = { ...moveToChapter(completed, 'PSA.119'), verse: 176 };
	assert.deepEqual(parseProgress(JSON.stringify(psalm)), psalm);
	assert.deepEqual(parseProgress(JSON.stringify({ ...psalm, verse: 177 })), initialProgress());
	assert.deepEqual(parseProgress(JSON.stringify(genesis)), genesis); // Existing v1 saves remain valid.
});

test('chapter loading retries failed downloads and device narration uses the selected stored Scripture', async () => {
	const originalFetch = globalThis.fetch;
	let requests = 0;
	globalThis.fetch = async (input) => {
		requests++;
		if (requests === 1) return new Response('', { status: 503 });
		const data = readFileSync(new URL(`../static${input}`, import.meta.url), 'utf8');
		return new Response(data);
	};
	try {
		await assert.rejects(loadChapter('REV.22'), /reconnect/);
		const revelation = await loadChapter('REV.22');
		assert.equal(revelation.verses.length, 21);
		const segments = narrationSegments(revelation, 20);
		assert.equal(segments[0].text, revelation.verses[19].text);
		assert.equal(segments[1].text, revelation.verses[20].text);
		assert.equal(segments[2].phase, 'summary');
		assert.equal(segments[2].verse, 21);
		assert.equal(chapterSummary('REV.22'), undefined);
		assert.ok(chapterSummary('GEN.1'));
		await loadChapter('REV.1');
		assert.equal(requests, 2); // Chapters in the same book reuse its successful download.
		const luke = await loadChapter('LUK.17');
		assert.equal(luke.verses[35].text, ''); // Preserve the publisher's empty verse slot.
		const spoken = narrationSegments(luke, 35);
		assert.ok(!spoken.some((segment) => segment.phase === 'reading' && segment.verse === 36));
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('summary requires the final verse and a completed chapter', () => {
	assert.deepEqual(
		parseProgress(JSON.stringify({ ...initialProgress(), phase: 'summary' })),
		initialProgress()
	);
	const completed = {
		...initialProgress(),
		phase: 'summary' as const,
		verse: 31,
		completedChapterIds: ['GEN.1']
	};
	assert.deepEqual(parseProgress(JSON.stringify(completed)), completed);
});

test('progress survives storage round trip without marking an unfinished chapter complete', () => {
	const values = new Map<string, string>();
	const storage = {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value);
		}
	};
	const progress = { ...initialProgress(), verse: 17 };
	saveProgress(storage, progress);
	assert.ok(values.has(PROGRESS_KEY));
	assert.deepEqual(loadProgress(storage), progress);
	assert.deepEqual(loadProgress(storage).completedChapterIds, []);
});

test('completion is deduplicated when restoring progress', () => {
	const progress = { ...initialProgress(), completedChapterIds: ['GEN.1', 'GEN.1'] };
	assert.deepEqual(parseProgress(JSON.stringify(progress)).completedChapterIds, ['GEN.1']);
});

test('storage failures reach the UI instead of pretending the place was saved', () => {
	assert.throws(
		() =>
			loadProgress({
				getItem() {
					throw new Error('blocked');
				}
			}),
		/blocked/
	);
	assert.throws(
		() =>
			saveProgress(
				{
					setItem() {
						throw new Error('quota');
					}
				},
				initialProgress()
			),
		/quota/
	);
});

test('the imported first chapter has all 31 verses, without injected footnotes', () => {
	const chapter = JSON.parse(
		readFileSync(new URL('../src/lib/bible/genesis-1.json', import.meta.url), 'utf8')
	);
	assert.equal(chapter.source, 'https://ebible.org/engwebp/GEN01.htm');
	assert.deepEqual(
		chapter.verses.map((verse: { number: number }) => verse.number),
		Array.from({ length: 31 }, (_, i) => i + 1)
	);
	assert.equal(chapter.verses[0].text, 'In the beginning, God created the heavens and the earth.');
	assert.equal(
		chapter.verses[30].text,
		'God saw everything that he had made, and, behold, it was very good. There was evening and there was morning, a sixth day.'
	);
	assert.ok(chapter.verses[27].text.includes('Have dominion over the fish of the sea'));
	assert.ok(!chapter.verses.some((verse: { text: string }) => /<|†|‡|Elohim/.test(verse.text)));
});
