import { self } from '$app/service-worker';
import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { CACHE_PREFIX, canHandleRequest, obsoleteCaches } from '../lib/pwa/cache-policy';
import { audioRangeResponse } from '../lib/pwa/range';

const CACHE = `${CACHE_PREFIX}${version}`;
const resourcePath = (path: string) =>
	new URL(path.replace(/^\/+/, ''), self.registration.scope).pathname;
const paths = [
	...new Set([
		...immutable.map((file) => resourcePath(file.path)),
		...assets
			.filter(
				(file) =>
					file.path === 'manifest.webmanifest' ||
					file.path === 'offline.html' ||
					file.path.startsWith('icons/') ||
					file.path.startsWith('bible/engwebp/') ||
					file.path.startsWith('audio/')
			)
			.map((file) => resourcePath(file.path)),
		...prerendered.map((page) => resourcePath(page.path))
	])
];
const precached = new Set<string>(paths);
const offlinePage = resourcePath('offline.html');

self.addEventListener('install', (event) => {
	// An incomplete download must not replace a working offline deployment.
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			try {
				await cache.addAll(paths.map((path) => new Request(path, { cache: 'reload' })));
			} catch (error) {
				await caches.delete(CACHE);
				throw error;
			}
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			await Promise.all(
				obsoleteCaches(await caches.keys(), CACHE).map((name) => caches.delete(name))
			);
			await self.clients.claim();
		})()
	);
});

self.addEventListener('message', (event) => {
	// Updates activate only after the reader explicitly chooses Update app.
	if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);
	const known = precached.has(url.pathname);
	const rangedAudio =
		known &&
		url.pathname.startsWith(resourcePath('audio/')) &&
		request.headers.has('range') &&
		request.method === 'GET' &&
		url.origin === self.location.origin &&
		!request.headers.has('authorization');
	if (!canHandleRequest(request, self.location.origin) && !rangedAudio) return;
	const oldBuildAsset = url.pathname.startsWith(resourcePath('_app/immutable/'));
	if (!known && !oldBuildAsset && request.mode !== 'navigate') return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			if (known) {
				// Keep HTML and its matching JS from one deployment until an update is accepted.
				const cached = await cache.match(url.pathname);
				if (cached)
					return rangedAudio ? audioRangeResponse(cached, request.headers.get('range')!) : cached;
			} else if (oldBuildAsset) {
				for (const name of (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX))) {
					const cached = await (await caches.open(name)).match(url.pathname);
					if (cached) return cached;
				}
			}
			try {
				const response = await fetch(request);
				if (
					known &&
					!rangedAudio &&
					response.ok &&
					!response.redirected &&
					response.type === 'basic'
				) {
					await cache.put(url.pathname, response.clone()).catch(() => {});
				}
				return response;
			} catch {
				if (request.mode === 'navigate') {
					const fallback = await cache.match(offlinePage);
					if (fallback)
						return new Response(fallback.body, { status: 503, headers: fallback.headers });
				}
				return Response.error();
			}
		})()
	);
});
