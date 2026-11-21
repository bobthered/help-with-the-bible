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
	play: (time?: number) => Promise<void>;
	pause: () => void;
	seek: (time: number) => void;
	readDevice: (verse: number) => void;
	readDeviceSummary: () => void;
	stopSpeech: () => void;
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
		play: async () => {},
		pause: () => {},
		seek: () => {},
		readDevice: () => {},
		readDeviceSummary: () => {},
		stopSpeech: () => {}
	};
}

export type AudioCue = { kind: string; verse: number | null; start: number; end: number };
export function positionAt(
	time: number,
	cues: AudioCue[]
): { verse: number; phase: 'reading' | 'summary' } {
	const current = [...cues].reverse().find((cue) => cue.start <= Math.max(0, time)) ?? cues[0];
	return current?.kind === 'summary'
		? { verse: 31, phase: 'summary' }
		: { verse: current?.verse ?? 1, phase: 'reading' };
}
