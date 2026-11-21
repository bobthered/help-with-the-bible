export const CACHE_PREFIX = 'help-with-the-bible:offline:';

/** Cache only build-known public resources; never cache questions, audio uploads, or APIs. */
export function canHandleRequest(
	request: Pick<Request, 'method' | 'url' | 'headers'>,
	origin: string
): boolean {
	const url = new URL(request.url);
	return (
		request.method === 'GET' &&
		url.origin === origin &&
		!request.headers.has('range') &&
		!request.headers.has('authorization') &&
		url.pathname !== '/api' &&
		!url.pathname.startsWith('/api/')
	);
}

/** Preserve the previous deployment for tabs that have not chosen to update yet. */
export function obsoleteCaches(names: string[], current: string): string[] {
	const previous = names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== current).at(-1);
	return names.filter(
		(name) => name.startsWith(CACHE_PREFIX) && name !== current && name !== previous
	);
}
