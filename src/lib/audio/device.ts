type Segment = { text: string; verse: number; phase: 'reading' | 'summary' };

export function createDeviceNarrator(options: {
	engine: Pick<SpeechSynthesis, 'speak' | 'cancel' | 'getVoices'>;
	createUtterance: (text: string) => SpeechSynthesisUtterance;
	voice: () => string;
	onposition: (verse: number, phase: 'reading' | 'summary') => void;
	onstate: (speaking: boolean) => void;
	onerror: () => void;
}) {
	let generation = 0;
	let active: SpeechSynthesisUtterance | null = null;
	function stop() {
		generation++;
		options.engine.cancel();
		active = null;
		options.onstate(false);
	}
	function read(segments: Segment[]) {
		stop();
		const current = generation;
		function next(index: number) {
			if (current !== generation) return;
			if (index >= segments.length) {
				active = null;
				options.onstate(false);
				return;
			}
			const segment = segments[index];
			active = options.createUtterance(segment.text);
			active.lang = 'en-US';
			active.rate = 0.95;
			const voices = options.engine.getVoices();
			active.voice =
				voices.find((voice) => voice.voiceURI === options.voice()) ??
				voices.find((voice) => voice.lang.startsWith('en')) ??
				null;
			active.onstart = () => {
				if (current === generation) options.onposition(segment.verse, segment.phase);
			};
			active.onend = () => next(index + 1);
			active.onerror = () => {
				if (current === generation) {
					stop();
					options.onerror();
				}
			};
			options.onstate(true);
			options.engine.speak(active);
		}
		next(0);
	}
	return { read, stop };
}
