import { createHash } from 'node:crypto';
import {
	OPENAI_API_KEY,
	OPENAI_MODEL,
	UPSTASH_REDIS_REST_URL,
	UPSTASH_REDIS_REST_TOKEN
} from '$app/env/private';
import chapter from '$lib/bible/genesis-1.json';
import { askChapterQuestion, consumeStudyLimit } from '$lib/server/study';
import type { RequestHandler } from './$types';

const configured = () =>
	Boolean(OPENAI_API_KEY && UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
const json = (data: unknown, status = 200) =>
	Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export const GET: RequestHandler = () => json({ available: configured() });

export const POST: RequestHandler = async ({ request, url, getClientAddress }) => {
	if (request.headers.get('origin') && request.headers.get('origin') !== url.origin)
		return json({ error: 'This request must come from the Bible reader.' }, 403);
	if (!request.headers.get('content-type')?.startsWith('application/json'))
		return json({ error: 'A JSON question is required.' }, 415);
	if (Number(request.headers.get('content-length')) > 8192)
		return json({ error: 'Please shorten your question.' }, 413);
	let input;
	try {
		const reader = request.body?.getReader();
		if (!reader) return json({ error: 'A question is required.' }, 400);
		const parts = [];
		let length = 0;
		while (true) {
			const part = await reader.read();
			if (part.done) break;
			length += part.value.length;
			if (length > 8192) {
				reader.releaseLock();
				return json({ error: 'Please shorten your question.' }, 413);
			}
			parts.push(part.value);
		}
		input = JSON.parse(Buffer.concat(parts).toString('utf8'));
	} catch {
		return json({ error: 'The question could not be read.' }, 400);
	}
	if (
		input?.chapterId !== 'GEN.1' ||
		typeof input.question !== 'string' ||
		!input.question.trim() ||
		input.question.length > 1000
	)
		return json({ error: 'Ask a question about Genesis 1, using 1–1,000 characters.' }, 400);
	if (!configured())
		return json(
			{
				error:
					'Live AI answers are not configured yet. The chapter study notes below are available now.'
			},
			503
		);
	try {
		const address = createHash('sha256')
			.update(`${OPENAI_API_KEY}:${getClientAddress()}`)
			.digest('hex');
		if (
			!(await consumeStudyLimit(address, {
				url: UPSTASH_REDIS_REST_URL,
				token: UPSTASH_REDIS_REST_TOKEN
			}))
		)
			return json(
				{ error: 'You have reached the question limit. Please try again in an hour.' },
				429
			);
		return json(
			await askChapterQuestion(input.question.trim(), chapter.verses, {
				apiKey: OPENAI_API_KEY,
				model: OPENAI_MODEL
			})
		);
	} catch {
		return json(
			{
				error:
					'The question service is unavailable right now. Your question is still in the text box; please try again later.'
			},
			503
		);
	}
};
