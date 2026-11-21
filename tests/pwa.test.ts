import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { CACHE_PREFIX, canHandleRequest, obsoleteCaches } from '../src/lib/pwa/cache-policy.ts';
import { audioRangeResponse } from '../src/lib/pwa/range.ts';
import { DOWNLOAD_CACHE } from '../src/lib/audio/cache.ts';

const origin = 'https://bible.example';
const workerSource = ts.transpileModule(
	readFileSync(new URL('../src/service-worker/index.ts', import.meta.url), 'utf8'),
	{ compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText;

function harness() {
	let online = true,
		failPath = '',
		claims = 0,
		skips = 0;
	const handlers = new Map<string, (event: any) => void>();
	const stores = new Map<string, Map<string, Response>>();
	const key = (input: string | Request) =>
		new URL(typeof input === 'string' ? input : input.url, origin).href;
	const transport = async (request: string | Request) => {
		const path = new URL(key(request)).pathname;
		if (!online || path === failPath) throw new Error('offline');
		return new Response(`Cached content for ${path}`, {
			headers: {
				'Content-Type':
					path.endsWith('.html') || !path.includes('.') ? 'text/html' : 'text/javascript'
			}
		});
	};
	const cacheStorage = {
		keys: async () => [...stores.keys()],
		delete: async (name: string) => stores.delete(name),
		open: async (name: string) => {
			if (!stores.has(name)) stores.set(name, new Map());
			const entries = stores.get(name)!;
			return {
				addAll: async (requests: Request[]) => {
					for (const request of requests) entries.set(key(request), await transport(request));
				},
				match: async (request: string | Request) => entries.get(key(request))?.clone(),
				put: async (request: string | Request, response: Response) => {
					entries.set(key(request), response.clone());
				}
			};
		}
	};
	const scope = {
		location: { origin },
		registration: { scope: `${origin}/` },
		addEventListener: (type: string, handler: (event: any) => void) => handlers.set(type, handler),
		clients: {
			claim: async () => {
				claims++;
			}
		},
		skipWaiting: async () => {
			skips++;
		}
	};
	class BrowserRequest extends Request {
		constructor(input: string | Request, options?: RequestInit) {
			super(typeof input === 'string' ? new URL(input, origin).href : input, options);
		}
	}
	const modules: Record<string, unknown> = {
		'$app/service-worker': { self: scope },
		'$app/env': { version: 'current' },
		'$app/manifest': {
			immutable: [{ path: '_app/immutable/chapter.js' }],
			assets: [
				{ path: 'offline.html' },
				{ path: 'manifest.webmanifest' },
				{ path: 'icons/icon-192.png' },
				{ path: 'audio/chapter.mp3' },
				{ path: 'audio/chapters/GEN.2.test.m4a' },
				{ path: 'audio/metadata/GEN.json' },
				{ path: 'summaries/GEN.test.json' },
				{ path: 'bible/engwebp/GEN.test.json' },
				{ path: 'bible/engwebp/REV.test.json' },
				{ path: 'unrelated.txt' }
			],
			prerendered: [{ path: '' }, { path: 'read' }, { path: 'install' }]
		},
		'../lib/pwa/cache-policy': { CACHE_PREFIX, canHandleRequest, obsoleteCaches },
		'../lib/pwa/range': { audioRangeResponse },
		'../lib/audio/cache': { DOWNLOAD_CACHE }
	};
	runInNewContext(workerSource, {
		require: (id: string) => {
			assert.ok(id in modules, `Unexpected module ${id}`);
			return modules[id];
		},
		exports: {},
		caches: cacheStorage,
		fetch: transport,
		URL,
		Request: BrowserRequest,
		Response,
		Set
	});
	return {
		stores,
		cacheStorage,
		current: `${CACHE_PREFIX}current`,
		setOnline: (value: boolean) => {
			online = value;
		},
		failAt: (path: string) => {
			failPath = path;
		},
		claims: () => claims,
		skips: () => skips,
		dispatch: async (type: string, data?: unknown) => {
			const pending: Promise<unknown>[] = [];
			handlers.get(type)?.({
				data,
				waitUntil: (promise: Promise<unknown>) => pending.push(promise)
			});
			await Promise.all(pending);
		},
		request: async (path: string, mode = 'navigate', init?: RequestInit) => {
			const request = new BrowserRequest(path, init);
			Object.defineProperty(request, 'mode', { value: mode });
			let response: Promise<Response> | undefined;
			handlers.get('fetch')?.({
				request,
				respondWith: (value: Promise<Response>) => {
					response = value;
				}
			});
			return response;
		}
	};
}

test('manifest provides standalone identity and real desktop, Android, and Apple PNG icons', () => {
	const manifest = JSON.parse(
		readFileSync(new URL('../static/manifest.webmanifest', import.meta.url), 'utf8')
	);
	assert.equal(manifest.id, '/');
	assert.equal(manifest.start_url, '/');
	assert.equal(manifest.scope, '/');
	assert.equal(manifest.display, 'standalone');
	assert.ok(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable'));
	for (const icon of [
		...manifest.icons,
		{ src: '/icons/apple-touch-icon.png', sizes: '180x180' }
	]) {
		const png = readFileSync(new URL(`../static${icon.src}`, import.meta.url));
		assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
		const [width, height] = icon.sizes.split('x').map(Number);
		assert.equal(png.readUInt32BE(16), width);
		assert.equal(png.readUInt32BE(20), height);
	}
});

test('the worker installs both reading pages, install guidance, and all bundled resources for offline use', async () => {
	const worker = harness();
	await worker.dispatch('install');
	await worker.dispatch('activate');
	assert.equal(worker.skips(), 0);
	assert.equal(worker.claims(), 1);
	worker.setOnline(false);
	for (const path of [
		'/',
		'/read',
		'/install',
		'/_app/immutable/chapter.js',
		'/bible/engwebp/GEN.test.json',
		'/bible/engwebp/REV.test.json',
		'/summaries/GEN.test.json',
		'/audio/metadata/GEN.json',
		'/icons/icon-192.png',
		'/manifest.webmanifest'
	]) {
		const response = await worker.request(path, path.includes('.') ? 'cors' : 'navigate');
		assert.equal(response?.status, 200, path);
		assert.equal(await response?.text(), `Cached content for ${path}`);
	}
});

test('unknown offline navigation gets a fallback without substituting the wrong Bible page', async () => {
	const worker = harness();
	await worker.dispatch('install');
	worker.setOnline(false);
	const response = await worker.request('/not-downloaded');
	assert.equal(response?.status, 503);
	assert.equal(await response?.text(), 'Cached content for /offline.html');
});

test('chapter recordings are opt-in and downloaded audio supports offline byte ranges', async () => {
	const worker = harness();
	await worker.dispatch('install');
	const path = '/audio/chapters/GEN.2.test.m4a';
	assert.ok(!worker.stores.get(worker.current)?.has(`${origin}${path}`));
	worker.setOnline(false);
	assert.equal((await worker.request(path, 'cors'))?.status, 0);
	const download = await worker.cacheStorage.open(DOWNLOAD_CACHE);
	await download.put(
		path,
		new Response('0123456789', { headers: { 'Content-Type': 'audio/mp4' } })
	);
	const response = await worker.request(path, 'cors', { headers: { Range: 'bytes=2-5' } });
	assert.equal(response?.status, 206);
	assert.equal(await response?.text(), '2345');
	assert.equal(response?.headers.get('Content-Type'), 'audio/mp4');
});

test('offline Safari byte-range requests are served only for known cached narration', async () => {
	const worker = harness();
	await worker.dispatch('install');
	worker.setOnline(false);
	const response = await worker.request('/audio/chapter.mp3', 'cors', {
		headers: { Range: 'bytes=0-5' }
	});
	assert.equal(response?.status, 206);
	assert.equal(await response?.text(), 'Cached');
	assert.equal(
		await worker.request('/audio/not-downloaded.mp3', 'cors', { headers: { Range: 'bytes=0-5' } }),
		undefined
	);
});

test('question APIs, uploads, authenticated requests, byte ranges, and other origins bypass the worker', async () => {
	const worker = harness();
	await worker.dispatch('install');
	for (const [path, init] of [
		['/api/study', undefined],
		['/api/transcribe', { method: 'POST' }],
		['/read', { headers: { authorization: 'Bearer test' } }],
		['/read', { headers: { range: 'bytes=0-10' } }],
		['https://other.example/read', undefined],
		['/read', { method: 'POST' }]
	] as [string, RequestInit | undefined][]) {
		assert.equal(await worker.request(path, 'cors', init), undefined, path);
	}
	assert.equal(await worker.request('/unrelated.txt', 'cors'), undefined);
});

test('a failed install removes incomplete downloads and preserves the existing offline version', async () => {
	const worker = harness();
	await worker.cacheStorage.open(`${CACHE_PREFIX}previous`);
	worker.failAt('/read');
	await assert.rejects(worker.dispatch('install'), /offline/);
	assert.equal(worker.stores.has(worker.current), false);
	assert.equal(worker.stores.has(`${CACHE_PREFIX}previous`), true);
});

test('updates wait for consent, retain the previous build for other tabs, and do not delete unrelated caches', async () => {
	const worker = harness();
	await worker.cacheStorage.open('another-app:cache');
	await worker.cacheStorage.open(`${CACHE_PREFIX}oldest`);
	const previous = await worker.cacheStorage.open(`${CACHE_PREFIX}previous`);
	await previous.put('/_app/immutable/old.js', new Response('previous script'));
	await worker.dispatch('install');
	assert.equal(worker.skips(), 0);
	await worker.dispatch('message', { type: 'ACTIVATE_UPDATE' });
	assert.equal(worker.skips(), 1);
	await worker.dispatch('activate');
	assert.deepEqual(await worker.cacheStorage.keys(), [
		'another-app:cache',
		`${CACHE_PREFIX}previous`,
		worker.current
	]);
	worker.setOnline(false);
	assert.equal(
		await (await worker.request('/_app/immutable/old.js', 'cors'))?.text(),
		'previous script'
	);
});
