export const PROGRESS_KEY = 'help-with-the-bible:progress:v1';

export type ReadingProgress = {
	version: 1;
	translationId: 'engwebp';
	chapterId: 'GEN.1';
	verse: number;
	phase: 'reading' | 'summary';
	completedChapterIds: string[];
};

export function initialProgress(): ReadingProgress {
	return {
		version: 1,
		translationId: 'engwebp',
		chapterId: 'GEN.1',
		verse: 1,
		phase: 'reading',
		completedChapterIds: []
	};
}

export function parseProgress(raw: string | null): ReadingProgress {
	if (!raw) return initialProgress();
	try {
		const data = JSON.parse(raw);
		if (
			data?.version !== 1 ||
			data.translationId !== 'engwebp' ||
			data.chapterId !== 'GEN.1' ||
			!Number.isInteger(data.verse) ||
			data.verse < 1 ||
			data.verse > 31 ||
			!['reading', 'summary'].includes(data.phase) ||
			!Array.isArray(data.completedChapterIds) ||
			data.completedChapterIds.some((id: unknown) => id !== 'GEN.1') ||
			(data.phase === 'summary' &&
				(data.verse !== 31 || !data.completedChapterIds.includes('GEN.1')))
		)
			return initialProgress();
		return {
			version: 1,
			translationId: 'engwebp',
			chapterId: 'GEN.1',
			verse: data.verse,
			phase: data.phase,
			completedChapterIds: [...new Set<string>(data.completedChapterIds)]
		};
	} catch {
		return initialProgress();
	}
}

export function loadProgress(storage: Pick<Storage, 'getItem'>): ReadingProgress {
	return parseProgress(storage.getItem(PROGRESS_KEY));
}

export function saveProgress(storage: Pick<Storage, 'setItem'>, progress: ReadingProgress): void {
	storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}
