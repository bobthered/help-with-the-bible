import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { positionAt } from '../src/lib/audio/context.ts';
import { audioRangeResponse } from '../src/lib/pwa/range.ts';
import { revealOnScroll } from '../src/lib/attachments/reveal.ts';
import { createDeviceNarrator } from '../src/lib/audio/device.ts';

const recording = JSON.parse(
	readFileSync(new URL('../src/lib/bible/genesis-1-audio.json', import.meta.url), 'utf8')
);
const chapter = JSON.parse(
	readFileSync(new URL('../src/lib/bible/genesis-1.json', import.meta.url), 'utf8')
);

test('standard device speech reads stored verses and then a labeled summary without a model service', () => {
	const spoken: SpeechSynthesisUtterance[] = [],
		positions: unknown[] = [];
	let speaking = false;
	const narrator = createDeviceNarrator({
		engine: {
			speak: (utterance) => {
				spoken.push(utterance);
			},
			cancel() {},
			getVoices: () => []
		},
		createUtterance: (text) => ({ text }) as SpeechSynthesisUtterance,
		voice: () => '',
		onposition: (verse, phase) => positions.push({ verse, phase }),
		onstate: (value) => {
			speaking = value;
		},
		onerror: () => assert.fail('Unexpected speech error')
	});
	narrator.read([
		...chapter.verses.map((verse: { number: number; text: string }) => ({
			text: verse.text,
			verse: verse.number,
			phase: 'reading' as const
		})),
		{ text: 'Chapter summary, separate from Scripture.', verse: 31, phase: 'summary' }
	]);
	for (let index = 0; index < 32; index++) {
		const utterance = spoken[index];
		assert.ok(utterance);
		utterance.onstart?.({} as SpeechSynthesisEvent);
		if (index < 31) assert.equal(utterance.text, chapter.verses[index].text);
		utterance.onend?.({} as SpeechSynthesisEvent);
	}
	assert.deepEqual(positions.at(-1), { verse: 31, phase: 'summary' });
	assert.equal(speaking, false);
});

test('stopping device narration prevents stale speech events from advancing to another verse', () => {
	const spoken: SpeechSynthesisUtterance[] = [];
	const narrator = createDeviceNarrator({
		engine: {
			speak: (utterance) => {
				spoken.push(utterance);
			},
			cancel() {},
			getVoices: () => []
		},
		createUtterance: (text) => ({ text }) as SpeechSynthesisUtterance,
		voice: () => '',
		onposition() {},
		onstate() {},
		onerror: () => assert.fail('Unexpected stale error')
	});
	narrator.read([
		{ text: chapter.verses[0].text, verse: 1, phase: 'reading' },
		{ text: chapter.verses[1].text, verse: 2, phase: 'reading' }
	]);
	narrator.stop();
	spoken[0].onend?.({} as SpeechSynthesisEvent);
	spoken[0].onerror?.({} as SpeechSynthesisErrorEvent);
	assert.equal(spoken.length, 1);
});

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

test('the root reveal attachment discovers new blocks, preserves focus, and honors reduced motion', async () => {
	const original = new Map<string, PropertyDescriptor | undefined>();
	let intersection: any,
		mutation: any,
		preference: () => void = () => {},
		reduced = false,
		animations = 0,
		scrollPosition = 0;
	const frames: (() => void)[] = [],
		animationOptions: KeyframeAnimationOptions[] = [],
		listeners = new Map(),
		windowListeners = new Map();
	const flushFrames = () => {
		while (frames.length) frames.shift()!();
	};
	const nodes: any[] = [];
	class ElementMock {
		dataset: Record<string, string> = {};
		top: number;
		constructor(top: number) {
			this.top = top;
		}
		getBoundingClientRect() {
			return { top: this.top, bottom: this.top + 100 };
		}
		contains(target: unknown) {
			return this === target || (this === root && nodes.includes(target));
		}
		querySelectorAll() {
			return nodes;
		}
		animate(_keyframes: Keyframe[], options: KeyframeAnimationOptions) {
			animations++;
			animationOptions.push(options);
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
		secondVisible = new ElementMock(250),
		below = new ElementMock(1500);
	nodes.push(visible, secondVisible, below);
	const globals = {
		window: {
			get scrollY() {
				return scrollPosition;
			},
			addEventListener(name: string, handler: () => void) {
				windowListeners.set(name, handler);
			},
			removeEventListener(name: string) {
				windowListeners.delete(name);
			}
		},
		Element: ElementMock,
		document: { activeElement: null, scrollingElement: { scrollHeight: 5000 } },
		innerHeight: 800,
		IntersectionObserver: class {
			constructor(callback: any, options: IntersectionObserverInit) {
				intersection = { callback, options, disconnected: false };
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
		assert.equal(animations, 0); // Wait for a painted starting state.
		assert.equal(visible.dataset.revealPending, 'true');
		flushFrames();
		assert.equal(intersection.options.rootMargin, '0px 0px -160px 0px');
		assert.equal(visible.dataset.revealPending, undefined);
		assert.equal(animations, 2); // Initial content enters as one staggered batch.
		assert.deepEqual(
			animationOptions.map(({ delay }) => delay),
			[120, 230]
		);
		assert.ok(
			animationOptions.every(({ duration, fill }) => duration === 760 && fill === 'backwards')
		);
		assert.equal(below.dataset.revealPending, 'true');
		intersection.callback([{ target: below, isIntersecting: false }]);
		assert.equal(animations, 2);
		intersection.callback([{ target: below, isIntersecting: true }]);
		flushFrames();
		assert.equal(animations, 3);
		assert.equal(animationOptions[2].delay, 120); // A later batch starts its own sequence.
		assert.equal(below.dataset.revealPending, undefined);
		const added = new ElementMock(1600);
		nodes.push(added);
		mutation.callback();
		flushFrames();
		assert.equal(added.dataset.revealPending, 'true');
		listeners.get('focusin')({ target: added });
		assert.equal(added.dataset.revealPending, undefined);
		assert.equal(animations, 3);
		const footer = new ElementMock(1500),
			other = new ElementMock(2000);
		nodes.push(footer, other);
		mutation.callback();
		flushFrames();
		footer.top = 750; // Visible, but below the regular 640px trigger line.
		scrollPosition = 4190;
		windowListeners.get('scroll')();
		flushFrames();
		assert.equal(footer.dataset.revealPending, 'true');
		scrollPosition = 4200;
		windowListeners.get('scroll')();
		flushFrames();
		assert.equal(footer.dataset.revealPending, undefined);
		assert.equal(animations, 4);
		assert.equal(other.dataset.revealPending, 'true'); // Do not reveal offscreen content.
		scrollPosition = 0;
		Reflect.set(globalThis, 'innerHeight', 1000);
		const previousObserver = intersection;
		windowListeners.get('resize')();
		flushFrames();
		assert.equal(previousObserver.disconnected, true);
		assert.equal(intersection.options.rootMargin, '0px 0px -200px 0px');
		reduced = true;
		preference();
		assert.equal(other.dataset.revealPending, undefined);
		nodes.push(new ElementMock(50));
		mutation.callback();
		flushFrames();
		assert.equal(animations, 4); // Reduced motion also prevents entrance animations.
		cleanup();
		assert.equal(intersection.disconnected, true);
		assert.equal(mutation.disconnected, true);
		assert.equal(windowListeners.size, 0);
	} finally {
		for (const [key, descriptor] of original)
			if (descriptor) Object.defineProperty(globalThis, key, descriptor);
			else Reflect.deleteProperty(globalThis, key);
	}
});
