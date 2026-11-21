import type { Chapter } from '../bible/catalog.ts';
import type { SpokenSummary } from './segments.ts';

export const AUDIO_CONTEXT = Symbol('audio');
export type AudioState = {
	started: boolean;
	playing: boolean;
	currentTime: number;
	duration: number;
	verse: number;
	phase: 'reading' | 'summary';
	mode: 'text' | 'voice';
	narrator: 'device' | 'recorded';
	rate: number;
	deviceVoice: string;
	error: string;
	storageError: boolean;
	speaking: boolean;
	chapterId: string;
	sleepEndsAt: number | null;
	play: (time?: number) => Promise<void>;
	playChapter: (chapter: Chapter, verse?: number, summaryOnly?: boolean) => Promise<void>;
	pause: () => void;
	seek: (time: number) => void;
	readDevice: (verse: number, chapter?: Chapter, summary?: SpokenSummary) => void;
	readDeviceSummary: (chapter?: Chapter, summary?: SpokenSummary) => void;
	stopSpeech: () => void;
	setSleepTimer: (minutes: number) => void;
};
export function initialAudioState(): AudioState {
	return {
		started: false,
		playing: false,
		currentTime: 0,
		duration: 0,
		verse: 1,
		phase: 'reading',
		mode: 'text',
		narrator: 'device',
		rate: 1,
		deviceVoice: '',
		error: '',
		storageError: false,
		speaking: false,
		chapterId: 'GEN.1',
		sleepEndsAt: null,
		play: async () => {},
		playChapter: async () => {},
		pause: () => {},
		seek: () => {},
		readDevice: () => {},
		readDeviceSummary: () => {},
		stopSpeech: () => {},
		setSleepTimer: () => {}
	};
}

export type AudioCue = { kind: string; verse: number | null; start: number; end: number };
export function positionAt(
	time: number,
	cues: AudioCue[],
	lastVerse = 31
): { verse: number; phase: 'reading' | 'summary' } {
	const current = [...cues].reverse().find((cue) => cue.start <= Math.max(0, time)) ?? cues[0];
	return current?.kind === 'summary'
		? { verse: lastVerse, phase: 'summary' }
		: { verse: current?.verse ?? 1, phase: 'reading' };
}
