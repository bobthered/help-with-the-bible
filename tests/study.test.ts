import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { books, chapterInfo, loadChapter } from '../src/lib/bible/catalog.ts';
import { resolveReference, searchScripture } from '../src/lib/study/search.ts';
import {
	emptyLibrary,
	setAnnotation,
	validateLibrary,
	defaultPreferences,
	validatePreferences,
	createBackup,
	parseBackup,
	restoreBackup,
	LIBRARY_KEY,
	READER_KEY
} from '../src/lib/study/library.ts';
import { PROGRESS_KEY, initialProgress } from '../src/lib/reading/progress.ts';
import { narrationSegments } from '../src/lib/audio/segments.ts';
import { positionAt } from '../src/lib/audio/context.ts';
import { loadSummary } from '../src/lib/bible/summaries.ts';
import summaries from '../src/lib/bible/summary-catalog.json' with { type: 'json' };

const file = (path: string) => readFileSync(new URL(`../static${path}`, import.meta.url));
test('offline Kokoro tooling is absent from application dependencies and deployment commands', () => {
	const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
	const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
	const generator = /kokoro|transformers|onnxruntime|cuda/i;
	assert.ok(
		!Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).some((name) =>
			generator.test(name)
		)
	);
	assert.ok(!Object.keys(lock.packages ?? {}).some((name) => generator.test(name)));
	assert.ok(
		!/render-heart|setup-heart|prepare-heart/.test(
			`${manifest.scripts.build} ${manifest.scripts.prepare}`
		)
	);
});
test('all 1,189 summaries contain attributed source text, book context and valid passage links', () => {
	let total = 0;
	for (const book of books) {
		const source = (summaries.books as Record<string, { src: string; sha256: string }>)[book.id];
		const raw = file(source.src);
		assert.equal(createHash('sha256').update(raw).digest('hex'), source.sha256);
		const chapters = JSON.parse(raw.toString('utf8'));
		assert.equal(chapters.length, book.verses.length);
		for (const [index, summary] of chapters.entries()) {
			assert.equal(summary.id, `${book.id}.${index + 1}`);
			assert.ok(summary.paragraphs.length);
			assert.ok(summary.context.length);
			assert.ok(summary.attribution.includes('Matthew Henry'));
			assert.ok(summary.source.startsWith('https://www.ccel.org/ccel/henry/'));
			for (const item of summary.outline) {
				assert.ok(item.text);
				assert.ok(item.start >= 1 && item.end >= item.start && item.end <= book.verses[index]);
			}
			total++;
		}
	}
	assert.equal(total, 1189);
});
test('reference search resolves numbered books and valid ranges without guessing invalid references', () => {
	assert.deepEqual(resolveReference('John 3:16'), { chapterId: 'JOH.3', start: 16, end: 16 });
	assert.deepEqual(resolveReference('1 John 2:1-3'), { chapterId: '1JO.2', start: 1, end: 3 });
	assert.deepEqual(resolveReference('Psalm 119'), { chapterId: 'PSA.119', start: 1, end: 176 });
	assert.equal(resolveReference('John 3:99'), undefined);
	assert.equal(resolveReference('John 99:1'), undefined);
	assert.equal(resolveReference('Genesis 1:4-2'), undefined);
});
test('book-filtered word/phrase/reference searches use stored Scripture and support cancellation', async () => {
	const original = globalThis.fetch;
	globalThis.fetch = async (input) => new Response(file(String(input)));
	try {
		const phrase = await searchScripture('"in the beginning"', { bookId: 'GEN' });
		assert.ok(phrase.results.some((result) => result.chapterId === 'GEN.1' && result.verse === 1));
		assert.ok(phrase.results.every((result) => result.book === 'Genesis'));
		const reference = await searchScripture('John 3:16');
		assert.equal(reference.total, 1);
		assert.equal(reference.results[0].verse, 16);
		const summary = await loadSummary('JOH.3');
		const chapter = await loadChapter('JOH.3');
		const spoken = narrationSegments(chapter, 36, false, summary);
		assert.equal(spoken[0].text, chapter.verses[35].text);
		assert.ok(spoken[1].text.includes('separate from Scripture'));
		assert.ok(spoken.slice(2).some((segment) => segment.text === summary.paragraphs[0]));
		const abort = new AbortController();
		abort.abort();
		await assert.rejects(searchScripture('love', { signal: abort.signal }), { name: 'AbortError' });
	} finally {
		globalThis.fetch = original;
	}
});
test('annotations validate verse boundaries, remove empty entries, and retain exact private note text', () => {
	const note = {
		chapterId: 'GEN.1',
		verse: 3,
		bookmarked: true,
		highlight: 'gold' as const,
		note: 'A thought <not HTML>\nwith a new line.',
		updatedAt: '2026-11-21T12:00:00Z'
	};
	const library = setAnnotation(emptyLibrary(), note);
	assert.equal(library.annotations['GEN.1:3'].note, note.note);
	assert.throws(() => setAnnotation(library, { ...note, verse: 99 }));
	assert.deepEqual(
		setAnnotation(library, { ...note, bookmarked: false, highlight: 'none', note: '' }),
		emptyLibrary()
	);
	assert.throws(() => validateLibrary({ version: 1, annotations: { wrong: note } }));
	assert.deepEqual(validatePreferences(defaultPreferences()), defaultPreferences());
	assert.throws(() => validatePreferences({ ...defaultPreferences(), fontSize: 100 }));
});
test('backups round-trip supported data, reject invalid content, and do not modify unrelated storage', () => {
	const values = new Map<string, string>();
	const storage = {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value);
		},
		removeItem: (key: string) => {
			values.delete(key);
		}
	};
	storage.setItem(
		PROGRESS_KEY,
		JSON.stringify({ ...initialProgress(), chapterId: 'REV.22', verse: 21 })
	);
	storage.setItem('unrelated', 'keep');
	const backup = createBackup(storage);
	assert.equal(backup.progress.chapterId, 'REV.22');
	assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
	storage.setItem(PROGRESS_KEY, JSON.stringify(initialProgress()));
	restoreBackup(storage, backup);
	assert.equal(JSON.parse(storage.getItem(PROGRESS_KEY)!).chapterId, 'REV.22');
	assert.equal(storage.getItem('unrelated'), 'keep');
	for (const bad of [
		{ ...backup, version: 2 },
		{ ...backup, progress: { ...backup.progress, chapterId: 'FAKE.1' } },
		{ ...backup, reader: { ...backup.reader, fontSize: -1 } },
		{ ...backup, interaction: { ...backup.interaction, rate: 99 } }
	])
		assert.throws(() => parseBackup(JSON.stringify(bad)));
});
test('failed multi-key restore rolls back previous progress and annotations', () => {
	const values = new Map<string, string>([
		[PROGRESS_KEY, JSON.stringify(initialProgress())],
		[LIBRARY_KEY, JSON.stringify(emptyLibrary())],
		[READER_KEY, JSON.stringify(defaultPreferences())]
	]);
	const original = new Map(values);
	let reject = false;
	const storage = {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			if (reject && key === LIBRARY_KEY) {
				reject = false;
				throw new Error('quota');
			}
			values.set(key, value);
		},
		removeItem: (key: string) => {
			values.delete(key);
		}
	};
	const backup = createBackup(storage);
	backup.progress = { ...backup.progress, chapterId: 'EXO.1', verse: 2 };
	reject = true;
	assert.throws(() => restoreBackup(storage, backup));
	assert.deepEqual(values, original);
});
test('recorded overview position follows the selected chapter rather than Genesis verse counts', () => {
	const cues = [
		{ kind: 'verse', verse: 1, start: 0, end: 10 },
		{ kind: 'summary', verse: null, start: 10, end: 20 }
	];
	assert.deepEqual(positionAt(11, cues, 21), { verse: 21, phase: 'summary' });
	assert.equal(chapterInfo('REV.22')?.verseCount, 21);
});

test('all recorded chapters match their Scripture/overview inputs, timing cues and audio checksums', () => {
	const policyFile = new URL('../static/audio/metadata/voice-policy.json', import.meta.url);
	const heartRequired = existsSync(policyFile);
	if (heartRequired) {
		const policy = JSON.parse(readFileSync(policyFile, 'utf8'));
		assert.equal(policy.voice, 'af_heart');
		assert.equal(policy.chapters, 1189);
	}
	let total = 0;
	for (const book of books) {
		const records = JSON.parse(file(`/audio/metadata/${book.id}.json`).toString('utf8'));
		const scripture = JSON.parse(file(book.src).toString('utf8'));
		const source = (summaries.books as Record<string, { src: string }>)[book.id];
		const outlines = JSON.parse(file(source.src).toString('utf8'));
		for (const [index, verses] of scripture.chapters.entries()) {
			const id = `${book.id}.${index + 1}`,
				record = records[id];
			assert.ok(record, id);
			if (heartRequired) {
				assert.equal(record.voice, 'af_heart', id);
				assert.equal(record.model, 'Kokoro-82M', id);
				assert.ok(record.voiceLabel.includes('Kokoro Heart'), id);
				if (id !== 'GEN.1') {
					assert.match(record.modelSha256, /^[a-f0-9]{64}$/);
					assert.match(record.voiceSha256, /^[a-f0-9]{64}$/);
					assert.match(record.tokenizerSha256, /^[a-f0-9]{64}$/);
					assert.equal(record.engine, 'kokoro-onnx');
				}
			}
			const audio = file(record.src);
			assert.equal(createHash('sha256').update(audio).digest('hex'), record.audioSha256, id);
			assert.ok(record.duration > record.summaryStart && record.summaryStart > 0, id);
			assert.deepEqual(
				record.cues.filter((cue: any) => cue.kind === 'verse').map((cue: any) => cue.verse),
				verses.filter((verse: any) => verse.text).map((verse: any) => verse.number),
				id
			);
			for (const [i, cue] of record.cues.entries()) {
				assert.ok(
					cue.start >= 0 && cue.end > cue.start && cue.end <= record.duration + 0.01,
					`${id} cue ${i}`
				);
				if (i > 0) assert.ok(cue.start >= record.cues[i - 1].start);
			}
			if (id !== 'GEN.1') {
				const segments = verses
					.filter((verse: any) => verse.text)
					.map((verse: any) => [`v${verse.number}`, verse.text]);
				segments.push([
					'summary',
					"Chapter complete. The following is commentary, separate from Scripture. Chapter outline and commentary excerpts from Matthew Henry's Concise Commentary, a historical Protestant interpretation. " +
						outlines[index].paragraphs.join(' ')
				]);
				assert.equal(
					createHash('sha256').update(JSON.stringify(segments)).digest('hex'),
					record.textSha256,
					id
				);
				assert.ok(record.src.includes(record.audioSha256.slice(0, 12)));
			}
			total++;
		}
	}
	assert.equal(total, 1189);
});
