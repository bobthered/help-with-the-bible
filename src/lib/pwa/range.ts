/** Serve a single byte range from a fully cached audio file (Safari uses Range requests). */
export async function audioRangeResponse(response: Response, header: string): Promise<Response> {
	const body = await response.arrayBuffer(),
		size = body.byteLength;
	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	const invalid = () =>
		new Response(null, {
			status: 416,
			headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' }
		});
	if (!match || (!match[1] && !match[2])) return invalid();
	let start: number, end: number;
	if (!match[1]) {
		const suffix = Number(match[2]);
		if (!Number.isSafeInteger(suffix) || suffix <= 0) return invalid();
		start = Math.max(0, size - suffix);
		end = size - 1;
	} else {
		start = Number(match[1]);
		end = match[2] ? Number(match[2]) : size - 1;
	}
	if (
		!Number.isSafeInteger(start) ||
		!Number.isSafeInteger(end) ||
		start < 0 ||
		start >= size ||
		end < start
	)
		return invalid();
	end = Math.min(end, size - 1);
	const headers = new Headers(response.headers);
	headers.delete('Content-Encoding');
	headers.delete('Transfer-Encoding');
	headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
	headers.set('Accept-Ranges', 'bytes');
	headers.set('Content-Length', String(end - start + 1));
	return new Response(body.slice(start, end + 1), { status: 206, headers });
}
