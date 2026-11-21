import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	OPENAI_API_KEY: { schema: (value) => value?.trim() ?? '' },
	OPENAI_MODEL: { schema: (value) => value?.trim() || 'gpt-4.1-mini' },
	UPSTASH_REDIS_REST_URL: { schema: (value) => value?.trim() ?? '' },
	UPSTASH_REDIS_REST_TOKEN: { schema: (value) => value?.trim() ?? '' }
});
