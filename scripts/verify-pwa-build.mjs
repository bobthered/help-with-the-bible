// Execute the emitted worker against the actual build files, without a browser or network.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = resolve('.');
const origin = 'https://pwa.example';
const handlers = new Map();
const entries = new Map();
let online = true;
const urlFor = (input) => new URL(typeof input === 'string' ? input : input.url, origin);
const key = (input) => urlFor(input).href;

async function fetchFile(input) {
	if (!online) throw new Error('Offline');
	const pathname = decodeURIComponent(urlFor(input).pathname);
	const page = pathname === '/' ? 'index' : pathname.replace(/^\/+|\/+$/g, '');
	const candidates = [
		join(root, '.svelte-kit/output/client', pathname),
		join(root, 'static', pathname),
		join(root, '.svelte-kit/output/prerendered/pages', `${page}.html`),
		join(root, '.svelte-kit/output/prerendered/dependencies', pathname)
	];
	const file = candidates.find(
		(candidate) =>
			existsSync(candidate) &&
			!candidate.endsWith('/') &&
			(() => {
				try {
					readFileSync(candidate);
					return true;
				} catch {
					return false;
				}
			})()
	);
	assert.ok(file, `Missing precache resource: ${pathname}`);
	return new Response(readFileSync(file));
}
const cache = {
	addAll: async (requests) => {
		for (const request of requests) entries.set(key(request), await fetchFile(request));
	},
	match: async (request) => entries.get(key(request))?.clone(),
	put: async (request, response) => entries.set(key(request), response.clone())
};
const cacheNames = new Set();
const scope = {
	location: new URL(`${origin}/service-worker.js`),
	registration: { scope: `${origin}/` },
	addEventListener: (name, callback) => handlers.set(name, callback),
	clients: { claim: async () => {} },
	skipWaiting: async () => {}
};
class BrowserRequest extends Request {
	constructor(input, options) {
		super(typeof input === 'string' ? urlFor(input) : input, options);
	}
}
runInNewContext(readFileSync('.svelte-kit/output/client/service-worker.js', 'utf8'), {
	self: scope,
	location: scope.location,
	caches: {
		open: async (name) => {
			cacheNames.add(name);
			return cache;
		},
		keys: async () => [...cacheNames],
		delete: async (name) => cacheNames.delete(name)
	},
	fetch: fetchFile,
	Request: BrowserRequest,
	Response,
	Headers,
	URL,
	Set
});
for (const phase of ['install', 'activate']) {
	const pending = [];
	handlers.get(phase)({ waitUntil: (promise) => pending.push(promise) });
	await Promise.all(pending);
}
online = false;
const recording = JSON.parse(readFileSync('src/lib/bible/genesis-1-audio.json', 'utf8'));
const catalog = JSON.parse(readFileSync('src/lib/bible/catalog.json', 'utf8'));
for (const path of [
	'/',
	'/read',
	'/install',
	'/manifest.webmanifest',
	'/icons/icon-192.png',
	'/icons/icon-512.png',
	'/icons/maskable-512.png',
	'/icons/apple-touch-icon.png',
	recording.src,
	...catalog.books.map((book) => book.src)
]) {
	const request = new BrowserRequest(path);
	Object.defineProperty(request, 'mode', { value: path.includes('.') ? 'cors' : 'navigate' });
	let result;
	handlers.get('fetch')({
		request,
		respondWith: (response) => {
			result = response;
		}
	});
	const response = await result;
	assert.equal(response?.status, 200, `Unavailable offline: ${path}`);
	assert.ok((await response.arrayBuffer()).byteLength > 0, `Empty offline resource: ${path}`);
}
const rangedRequest = new BrowserRequest(recording.src, { headers: { Range: 'bytes=0-1023' } });
let rangedResult;
handlers.get('fetch')({
	request: rangedRequest,
	respondWith: (response) => {
		rangedResult = response;
	}
});
const rangedResponse = await rangedResult;
assert.equal(rangedResponse?.status, 206, 'Cached audio must support Safari byte-range requests');
assert.equal((await rangedResponse.arrayBuffer()).byteLength, 1024);
const scriptBodies = await Promise.all(
	[...entries.entries()]
		.filter(([path]) => path.endsWith('.js'))
		.map(async ([, response]) => response.clone().text())
);
assert.ok(
	scriptBodies.some((body) =>
		body.includes('In the beginning, God created the heavens and the earth.')
	),
	'Scripture was not included in the offline bundle'
);
console.log(
	`PWA build verified: ${entries.size} real resources precached; all 66 Bible books, pages, icons, and ranged narration available with the network disabled.`
);
