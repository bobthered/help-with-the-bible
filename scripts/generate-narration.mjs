import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { KokoroTTS } from 'kokoro-js';
import { env } from '@huggingface/transformers';
import { Mp3Encoder } from '@breezystack/lamejs';

const chapter = JSON.parse(await readFile('src/lib/bible/genesis-1.json', 'utf8'));
const summary = JSON.parse(await readFile('src/lib/bible/genesis-1-summary.json', 'utf8'));
env.cacheDir = resolve('.cache/models');
const voice = 'af_heart',
	speed = 1,
	sampleRate = 24000;
const segments = [
	...chapter.verses.map((verse) => ({ kind: 'verse', verse: verse.number, text: verse.text })),
	{
		kind: 'summary',
		text: `Chapter complete. The following is a chapter summary, separate from Scripture. ${summary.title}`
	},
	...summary.paragraphs.map((text) => ({ kind: 'summary', text })),
	{ kind: 'summary', text: `A question to reflect on. ${summary.reflection}` }
];
await mkdir('.cache/narration', { recursive: true });
await mkdir('static/audio', { recursive: true });
let tts;
let samples = 0;
const chunks = [],
	cues = [];
for (const [index, segment] of segments.entries()) {
	const digest = createHash('sha256')
		.update(JSON.stringify({ voice, speed, text: segment.text }))
		.digest('hex');
	const file = `.cache/narration/${digest}.f32`;
	let audio;
	try {
		const data = await readFile(file);
		audio = new Float32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
	} catch {
		if (!tts) {
			console.log('Loading Kokoro. Model downloads are cached locally, never shipped to visitors.');
			tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
				dtype: 'q8',
				device: 'cpu'
			});
		}
		console.log(
			`Generating segment ${index + 1}/${segments.length}: ${segment.kind}${segment.verse ? ` ${segment.verse}` : ''}`
		);
		audio = (await tts.generate(segment.text, { voice, speed })).audio;
		if (!audio?.length) throw new Error('Empty narration');
		await writeFile(file, Buffer.from(audio.buffer, audio.byteOffset, audio.byteLength));
	}
	cues.push({
		kind: segment.kind,
		verse: segment.verse ?? null,
		start: samples / sampleRate,
		end: (samples + audio.length) / sampleRate
	});
	chunks.push(audio);
	samples += audio.length;
	const silence = new Float32Array(
		Math.round(sampleRate * (segment.kind === 'verse' && segment.verse === 31 ? 1.3 : 0.4))
	);
	chunks.push(silence);
	samples += silence.length;
}
const encoder = new Mp3Encoder(1, sampleRate, 64),
	encoded = [];
for (const audio of chunks) {
	for (let offset = 0; offset < audio.length; offset += 1152) {
		const slice = audio.subarray(offset, offset + 1152);
		const pcm = Int16Array.from(slice, (sample) =>
			Math.round(Math.max(-1, Math.min(1, sample)) * 32767)
		);
		const bytes = encoder.encodeBuffer(pcm);
		if (bytes.length) encoded.push(Buffer.from(bytes));
	}
}
encoded.push(Buffer.from(encoder.flush()));
const encodedAudio = Buffer.concat(encoded);
const audioSha256 = createHash('sha256').update(encodedAudio).digest('hex');
const src = `/audio/genesis-1-heart-${audioSha256.slice(0, 12)}.mp3`;
await writeFile(`static${src}`, encodedAudio);
await writeFile(
	'src/lib/bible/genesis-1-audio.json',
	JSON.stringify(
		{
			src,
			audioSha256,
			voice: 'Heart',
			model: 'Kokoro-82M',
			modelLicense: 'Apache-2.0',
			synthetic: true,
			duration: samples / sampleRate,
			summaryStart: cues.find((cue) => cue.kind === 'summary').start,
			textSha256: createHash('sha256').update(JSON.stringify(segments)).digest('hex'),
			cues
		},
		null,
		'\t'
	) + '\n'
);
await writeFile(
	'static/audio/NOTICE.txt',
	'Narration generated with Kokoro-82M (Apache-2.0), voice af_heart.\nModel: https://huggingface.co/hexgrad/Kokoro-82M\nRuntime: https://github.com/hexgrad/kokoro/tree/main/kokoro.js\nScripture: World English Bible (public domain), https://ebible.org/engwebp/GEN01.htm\nSummary: Help with the Bible editorial commentary. This is a synthetic voice, not a human recording.\n'
);
console.log(
	`Created continuous chapter + summary: ${(samples / sampleRate).toFixed(1)} seconds, ${(Buffer.concat(encoded).length / 1024 / 1024).toFixed(2)} MB.`
);
await tts?.model.dispose();
