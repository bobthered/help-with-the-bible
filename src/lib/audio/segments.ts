import type { Chapter } from '../bible/catalog.ts';
import summary from '../bible/genesis-1-summary.json' with { type: 'json' };

export function chapterSummary(id: string) {
	return id === 'GEN.1' ? summary : undefined;
}

export type SpokenSummary = { title: string; paragraphs: string[]; attribution?: string };
export function narrationSegments(
	chapter: Chapter,
	start: number,
	summaryOnly = false,
	overview?: SpokenSummary
) {
	const summary: SpokenSummary | undefined = overview ?? chapterSummary(chapter.id);
	const last = chapter.verses.length;
	return [
		...(summaryOnly
			? []
			: chapter.verses
					.filter((verse) => verse.number >= start && verse.text)
					.map((verse) => ({ text: verse.text, verse: verse.number, phase: 'reading' as const }))),
		{
			text: summary
				? `Chapter complete. The following is a chapter summary, separate from Scripture. ${summary.attribution ?? ''} ${summary.title}`
				: `${chapter.book} ${chapter.chapter} complete.`,
			verse: last,
			phase: 'summary' as const
		},
		...(summary?.paragraphs ?? []).map((text) => ({ text, verse: last, phase: 'summary' as const }))
	];
}
