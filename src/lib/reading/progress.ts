import { chapterInfo } from '../bible/catalog.ts';

export const PROGRESS_KEY = 'help-with-the-bible:progress:v1';

export type ReadingProgress = {
	version: 1;
	translationId: 'engwebp';
	chapterId: string;
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
		const chapter = typeof data?.chapterId === 'string' ? chapterInfo(data.chapterId) : undefined;
		if (
			data?.version !== 1 ||
			data.translationId !== 'engwebp' ||
			!chapter ||
			!Number.isInteger(data.verse) ||
			data.verse < 1 ||
			data.verse > chapter.verseCount ||
			!['reading', 'summary'].includes(data.phase) ||
			!Array.isArray(data.completedChapterIds) ||
			data.completedChapterIds.some((id: unknown) => typeof id !== 'string' || !chapterInfo(id)) ||
			(data.phase === 'summary' &&
				(data.verse !== chapter.verseCount || !data.completedChapterIds.includes(data.chapterId)))
		)
			return initialProgress();
		return {
			version: 1,
			translationId: 'engwebp',
			chapterId: data.chapterId,
			verse: data.verse,
			phase: data.phase,
			completedChapterIds: [...new Set<string>(data.completedChapterIds)]
		};
	} catch {
		return initialProgress();
	}
}

export function moveToChapter(progress: ReadingProgress, chapterId: string): ReadingProgress {
	if (!chapterInfo(chapterId)) throw new Error('Unknown Bible chapter.');
	return { ...progress, chapterId, verse: 1, phase: 'reading' };
}

export function completeChapter(progress: ReadingProgress): ReadingProgress {
	const chapter = chapterInfo(progress.chapterId);
	if (!chapter) throw new Error('Unknown Bible chapter.');
	return {
		...progress,
		verse: chapter.verseCount,
		phase: 'summary',
		completedChapterIds: [...new Set([...progress.completedChapterIds, progress.chapterId])]
	};
}

export function loadProgress(storage: Pick<Storage, 'getItem'>): ReadingProgress {
	return parseProgress(storage.getItem(PROGRESS_KEY));
}

export function saveProgress(storage: Pick<Storage, 'setItem'>, progress: ReadingProgress): void {
	storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}
