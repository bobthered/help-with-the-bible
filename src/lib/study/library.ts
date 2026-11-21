import { chapterInfo } from '../bible/catalog.ts';
import {
	initialProgress,
	parseProgress,
	PROGRESS_KEY,
	type ReadingProgress
} from '../reading/progress.ts';

export const LIBRARY_KEY = 'help-with-the-bible:library:v1';
export const READER_KEY = 'help-with-the-bible:reader:v1';
export const INTERACTION_KEY = 'help-with-the-bible:interaction:v1';
export type Annotation = {
	chapterId: string;
	verse: number;
	bookmarked: boolean;
	highlight: 'none' | 'gold' | 'blue';
	note: string;
	updatedAt: string;
};
export type Library = { version: 1; annotations: Record<string, Annotation> };
export type ReaderPreferences = { view: 'verse' | 'chapter'; fontSize: number; lineHeight: number };
export const defaultPreferences = (): ReaderPreferences => ({
	view: 'verse',
	fontSize: 24,
	lineHeight: 1.9
});
export const emptyLibrary = (): Library => ({ version: 1, annotations: {} });
export const annotationKey = (chapterId: string, verse: number) => `${chapterId}:${verse}`;

export function validateLibrary(value: unknown): Library {
	const data = value as Library;
	if (
		!data ||
		data.version !== 1 ||
		!data.annotations ||
		typeof data.annotations !== 'object' ||
		Array.isArray(data.annotations)
	)
		throw new Error('Invalid saved notes.');
	const annotations: Record<string, Annotation> = {};
	for (const [key, item] of Object.entries(data.annotations)) {
		const chapter = typeof item?.chapterId === 'string' ? chapterInfo(item.chapterId) : undefined;
		if (
			!chapter ||
			!Number.isInteger(item.verse) ||
			item.verse < 1 ||
			item.verse > chapter.verseCount ||
			key !== annotationKey(item.chapterId, item.verse) ||
			typeof item.bookmarked !== 'boolean' ||
			!['none', 'gold', 'blue'].includes(item.highlight) ||
			typeof item.note !== 'string' ||
			item.note.length > 12000 ||
			typeof item.updatedAt !== 'string' ||
			!Number.isFinite(Date.parse(item.updatedAt))
		)
			throw new Error('The backup contains invalid notes or verse references.');
		annotations[key] = {
			chapterId: item.chapterId,
			verse: item.verse,
			bookmarked: item.bookmarked,
			highlight: item.highlight,
			note: item.note,
			updatedAt: item.updatedAt
		};
	}
	return { version: 1, annotations };
}
export function validatePreferences(value: unknown): ReaderPreferences {
	const p = value as ReaderPreferences;
	if (
		!p ||
		!['verse', 'chapter'].includes(p.view) ||
		!Number.isFinite(p.fontSize) ||
		p.fontSize < 16 ||
		p.fontSize > 36 ||
		!Number.isFinite(p.lineHeight) ||
		p.lineHeight < 1.4 ||
		p.lineHeight > 2.6
	)
		throw new Error('Invalid reading preferences.');
	return { view: p.view, fontSize: p.fontSize, lineHeight: p.lineHeight };
}
export function loadLibrary(storage: Pick<Storage, 'getItem'>): Library {
	const raw = storage.getItem(LIBRARY_KEY);
	return raw ? validateLibrary(JSON.parse(raw)) : emptyLibrary();
}
export function loadPreferences(storage: Pick<Storage, 'getItem'>): ReaderPreferences {
	const raw = storage.getItem(READER_KEY);
	return raw ? validatePreferences(JSON.parse(raw)) : defaultPreferences();
}
export function setAnnotation(library: Library, annotation: Annotation): Library {
	const annotations = { ...library.annotations };
	const key = annotationKey(annotation.chapterId, annotation.verse);
	if (!annotation.bookmarked && annotation.highlight === 'none' && !annotation.note.trim())
		delete annotations[key];
	else annotations[key] = annotation;
	return validateLibrary({ version: 1, annotations });
}
export type Backup = {
	format: 'help-with-the-bible';
	version: 1;
	exportedAt: string;
	progress: ReadingProgress;
	library: Library;
	reader: ReaderPreferences;
	interaction: {
		mode: 'text' | 'voice';
		narrator: 'device' | 'recorded';
		deviceVoice: string;
		rate: number;
	};
	theme: 'light' | 'dark' | null;
};
function validateInteraction(value: unknown): Backup['interaction'] {
	const p = value as Backup['interaction'];
	if (
		!p ||
		!['text', 'voice'].includes(p.mode) ||
		!['device', 'recorded'].includes(p.narrator) ||
		typeof p.deviceVoice !== 'string' ||
		p.deviceVoice.length > 1000 ||
		!Number.isFinite(p.rate) ||
		p.rate < 0.5 ||
		p.rate > 2
	)
		throw new Error('Invalid narration preferences.');
	return { mode: p.mode, narrator: p.narrator, deviceVoice: p.deviceVoice, rate: p.rate };
}
export function createBackup(storage: Pick<Storage, 'getItem'>): Backup {
	const interaction = JSON.parse(storage.getItem(INTERACTION_KEY) ?? '{}');
	return parseBackup(
		JSON.stringify({
			format: 'help-with-the-bible',
			version: 1,
			exportedAt: new Date().toISOString(),
			progress: JSON.parse(storage.getItem(PROGRESS_KEY) ?? JSON.stringify(initialProgress())),
			library: loadLibrary(storage),
			reader: loadPreferences(storage),
			interaction: {
				mode: interaction.mode ?? 'text',
				narrator: interaction.narrator ?? 'device',
				deviceVoice: interaction.deviceVoice ?? '',
				rate: interaction.rate ?? 1
			},
			theme: storage.getItem('theme')
		})
	);
}
export function parseBackup(raw: string): Backup {
	if (raw.length > 20_000_000) throw new Error('This backup is too large (maximum 20 MB).');
	const data = JSON.parse(raw);
	if (
		!data ||
		data.format !== 'help-with-the-bible' ||
		data.version !== 1 ||
		typeof data.exportedAt !== 'string' ||
		!Number.isFinite(Date.parse(data.exportedAt))
	)
		throw new Error('This is not a supported Bible reader backup.');
	const progress = parseProgress(JSON.stringify(data.progress));
	if (
		!data.progress ||
		progress.version !== data.progress.version ||
		progress.translationId !== data.progress.translationId ||
		progress.chapterId !== data.progress.chapterId ||
		progress.verse !== data.progress.verse ||
		progress.phase !== data.progress.phase ||
		!Array.isArray(data.progress.completedChapterIds) ||
		data.progress.completedChapterIds.some(
			(id: string) => !progress.completedChapterIds.includes(id)
		)
	)
		throw new Error('The backup contains invalid reading progress.');
	if (data.theme !== null && !['light', 'dark'].includes(data.theme))
		throw new Error('Invalid theme preference.');
	return {
		format: 'help-with-the-bible',
		version: 1,
		exportedAt: data.exportedAt,
		progress,
		library: validateLibrary(data.library),
		reader: validatePreferences(data.reader),
		interaction: validateInteraction(data.interaction),
		theme: data.theme
	};
}
export function restoreBackup(
	storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
	backup: Backup
) {
	const checked = parseBackup(JSON.stringify(backup));
	const values: Record<string, string | null> = {
		[PROGRESS_KEY]: JSON.stringify(checked.progress),
		[LIBRARY_KEY]: JSON.stringify(checked.library),
		[READER_KEY]: JSON.stringify(checked.reader),
		[INTERACTION_KEY]: JSON.stringify(checked.interaction),
		theme: checked.theme
	};
	const before = new Map(Object.keys(values).map((key) => [key, storage.getItem(key)]));
	try {
		for (const [key, value] of Object.entries(values)) {
			if (value === null) storage.removeItem(key);
			else storage.setItem(key, value);
		}
	} catch (error) {
		for (const [key, value] of before) {
			if (value === null) storage.removeItem(key);
			else storage.setItem(key, value);
		}
		throw error;
	}
}
