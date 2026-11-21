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
		{ chapterId: 'GEN.2' },
		{ completedChapterIds: ['fake'] }
	]) {
		assert.deepEqual(
			parseProgress(JSON.stringify({ ...initialProgress(), ...override })),
			initialProgress()
		);
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
