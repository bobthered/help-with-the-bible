import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { positionAt } from '../src/lib/audio/context.ts';
import { audioRangeResponse } from '../src/lib/pwa/range.ts';
import {
	askChapterQuestion,
	consumeStudyLimit,
	parseStudyAnswer
} from '../src/lib/server/study.ts';
import { revealOnScroll } from '../src/lib/attachments/reveal.ts';

const recording = JSON.parse(
	readFileSync(new URL('../src/lib/bible/genesis-1-audio.json', import.meta.url), 'utf8')
);
const chapter = JSON.parse(
	readFileSync(new URL('../src/lib/bible/genesis-1.json', import.meta.url), 'utf8')
);

test('one complete narration contains all verses and the summary with an intact asset checksum', () => {
	const audio = readFileSync(new URL(`../static${recording.src}`, import.meta.url));
	assert.equal(createHash('sha256').update(audio).digest('hex'), recording.audioSha256);
	assert.equal(audio[0], 0xff);
	assert.equal(audio[1] & 0xe0, 0xe0);
	assert.deepEqual(
		recording.cues
			.filter((cue: { kind: string }) => cue.kind === 'verse')
			.map((cue: { verse: number }) => cue.verse),
		Array.from({ length: 31 }, (_, i) => i + 1)
	);
	assert.ok(
		recording.duration > recording.summaryStart && recording.summaryStart > recording.cues[30].end
	);
	for (const cue of recording.cues)
		assert.ok(cue.start >= 0 && cue.end > cue.start && cue.end < recording.duration);
});

test('the foreground catches up to the native player after background playback', () => {
	for (const cue of recording.cues)
		assert.deepEqual(positionAt(cue.start + 0.01, recording.cues), {
			verse: cue.verse ?? 31,
			phase: cue.kind === 'summary' ? 'summary' : 'reading'
		});
	assert.deepEqual(positionAt(-10, recording.cues), { verse: 1, phase: 'reading' });
	assert.deepEqual(positionAt(recording.duration, recording.cues), { verse: 31, phase: 'summary' });
});

test('cached audio supports closed, open, and suffix ranges with correct response headers', async () => {
	for (const [range, expected, contentRange] of [
		['bytes=0-3', '0123', 'bytes 0-3/10'],
		['bytes=7-', '789', 'bytes 7-9/10'],
		['bytes=-4', '6789', 'bytes 6-9/10'],
		['bytes=8-100', '89', 'bytes 8-9/10']
	]) {
		const response = await audioRangeResponse(
			new Response('0123456789', { headers: { 'Content-Type': 'audio/mpeg' } }),
			range
		);
		assert.equal(response.status, 206);
		assert.equal(await response.text(), expected);
		assert.equal(response.headers.get('Content-Range'), contentRange);
		assert.equal(response.headers.get('Content-Type'), 'audio/mpeg');
		assert.equal(response.headers.get('Content-Length'), String(expected.length));
	}
});

test('invalid or unsatisfiable audio ranges return 416 rather than incorrect audio bytes', async () => {
	for (const range of [
		'bytes=99-',
		'bytes=7-2',
		'bytes=-0',
		'bytes=-',
		'bytes=0-1,3-4',
		'garbage'
	]) {
		const response = await audioRangeResponse(new Response('0123456789'), range);
		assert.equal(response.status, 416);
		assert.equal(response.headers.get('Content-Range'), 'bytes */10');
	}
});

test('AI requests use trusted chapter text, private credentials, structured output, and no stored conversation', async () => {
	const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
		assert.equal(url, 'https://api.openai.com/v1/responses');
		assert.equal((init!.headers as Record<string, string>).Authorization, 'Bearer test-only-key');
		const body = JSON.parse(init!.body as string);
		assert.equal(body.store, false);
		assert.equal(body.model, 'test-model');
		assert.ok(body.input.includes(chapter.verses[0].text));
		assert.ok(body.input.includes('Why is creation good?'));
		assert.equal(body.text.format.type, 'json_schema');
		assert.equal(body.text.format.strict, true);
		return Response.json({
			status: 'completed',
			output: [
				{
					content: [
						{
							type: 'output_text',
							text: JSON.stringify({
								answer: 'The chapter repeatedly calls creation good.',
								references: [4, 31, 31],
								uncertainty: 'It does not explain every later question about evil.'
							})
						}
					]
				}
			]
		});
	};
	const answer = await askChapterQuestion(
		'Why is creation good?',
		chapter.verses,
		{ apiKey: 'test-only-key', model: 'test-model' },
		mockFetch as typeof fetch
	);
	assert.deepEqual(answer.references, [4, 31]);
});

test('invalid citations and unfinished provider responses are not displayed as valid answers', async () => {
	for (const references of [[32], [0], [1.5], ['1']])
		assert.throws(
			() => parseStudyAnswer({ answer: 'Example', references, uncertainty: '' }),
			/Invalid/
		);
	await assert.rejects(
		askChapterQuestion('Why?', chapter.verses, { apiKey: 'test', model: 'test' }, (async () =>
			Response.json({ status: 'incomplete' })) as typeof fetch),
		/could not finish/
	);
	await assert.rejects(
		askChapterQuestion(
			'Why?',
			chapter.verses,
			{ apiKey: 'test', model: 'test' },
			(async () => new Response('secret upstream details', { status: 401 })) as typeof fetch
		),
		/temporarily unavailable/
	);
});

test('durable request limits stop requests beyond the hourly allowance and fail closed', async () => {
	for (const count of [1, 10, 11]) {
		const allowed = await consumeStudyLimit(
			'hashed-client',
			{ url: 'https://redis.example', token: 'test-token' },
			(async (_url, init) => {
				const command = JSON.parse(init!.body as string);
				assert.equal(command[0], 'EVAL');
				assert.equal(command[3], 'bible:study:hashed-client');
				return Response.json({ result: count });
			}) as typeof fetch
		);
		assert.equal(allowed, count <= 10);
	}
	await assert.rejects(
		consumeStudyLimit('client', { url: 'https://redis.example', token: 'test' }, (async () =>
			Response.json({ error: 'unavailable' })) as typeof fetch),
		/unavailable/
	);
});

test('the root reveal attachment discovers new blocks, preserves focus, and honors reduced motion', async () => {
	const original = new Map<string, PropertyDescriptor | undefined>();
	let intersection: any,
		mutation: any,
		preference: () => void = () => {},
		reduced = false,
		animations = 0;
	const frames: (() => void)[] = [],
		listeners = new Map();
	const nodes: any[] = [];
	class ElementMock {
		dataset: Record<string, string> = {};
		top: number;
		constructor(top: number) {
			this.top = top;
		}
		getBoundingClientRect() {
			return { top: this.top };
		}
		contains(target: unknown) {
			return this === target || (this === root && nodes.includes(target));
		}
		querySelectorAll() {
			return nodes;
		}
		animate() {
			animations++;
			return { finished: Promise.resolve(), cancel() {} };
		}
		addEventListener(name: string, handler: any) {
			listeners.set(name, handler);
		}
		removeEventListener(name: string) {
			listeners.delete(name);
		}
	}
	const root = new ElementMock(0),
		visible = new ElementMock(50),
		below = new ElementMock(1500);
	nodes.push(visible, below);
	const globals = {
		window: {},
		Element: ElementMock,
		document: { activeElement: null },
		innerHeight: 800,
		IntersectionObserver: class {
			constructor(callback: any) {
				intersection = { callback, disconnected: false };
			}
			observe() {}
			unobserve() {}
			disconnect() {
				intersection.disconnected = true;
			}
		},
		MutationObserver: class {
			constructor(callback: any) {
				mutation = { callback, disconnected: false };
			}
			observe() {}
			disconnect() {
				mutation.disconnected = true;
			}
		},
		matchMedia: () => ({
			get matches() {
				return reduced;
			},
			addEventListener(_name: string, callback: () => void) {
				preference = callback;
			},
			removeEventListener() {}
		}),
		requestAnimationFrame: (callback: () => void) => {
			frames.push(callback);
			return frames.length;
		},
		cancelAnimationFrame() {}
	};
	(globals.window as Record<string, unknown>).IntersectionObserver = globals.IntersectionObserver;
	try {
		for (const [key, value] of Object.entries(globals)) {
			original.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
			Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
		}
		const cleanup = revealOnScroll(root as unknown as HTMLElement)!;
		assert.equal(visible.dataset.revealPending, undefined);
		assert.equal(below.dataset.revealPending, 'true');
		intersection.callback([{ target: below, isIntersecting: true }]);
		assert.equal(animations, 1);
		assert.equal(below.dataset.revealPending, undefined);
		const added = new ElementMock(1600);
		nodes.push(added);
		mutation.callback();
		frames.shift()!();
		assert.equal(added.dataset.revealPending, 'true');
		listeners.get('focusin')({ target: added });
		assert.equal(added.dataset.revealPending, undefined);
		assert.equal(animations, 1);
		const other = new ElementMock(2000);
		nodes.push(other);
		mutation.callback();
		frames.shift()!();
		reduced = true;
		preference();
		assert.equal(other.dataset.revealPending, undefined);
		cleanup();
		assert.equal(intersection.disconnected, true);
		assert.equal(mutation.disconnected, true);
	} finally {
		for (const [key, descriptor] of original)
			if (descriptor) Object.defineProperty(globalThis, key, descriptor);
			else Reflect.deleteProperty(globalThis, key);
	}
});
