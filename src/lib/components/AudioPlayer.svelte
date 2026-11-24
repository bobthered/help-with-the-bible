<script lang="ts">
	import { getContext, onMount, tick } from 'svelte';
	import { A, Button } from '$lib/components';
	import { AUDIO_CONTEXT, type AudioState, positionAt } from '$lib/audio/context';
	import original from '$lib/bible/genesis-1-audio.json';
	import genesis from '$lib/bible/genesis-1.json';
	import { chapterInfo, type Chapter } from '$lib/bible/catalog';
	import { narrationSegments, type SpokenSummary } from '$lib/audio/segments';
	import { createDeviceNarrator } from '$lib/audio/device';
	import { loadRecording, type Recording } from '$lib/audio/recordings';
	import { completeChapter, loadProgress, saveProgress } from '$lib/reading/progress';
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	const key = 'help-with-the-bible:audio:v2';
	let audio: HTMLAudioElement;
	let track = $state<Recording>({
		...original,
		voiceLabel: 'Kokoro Heart · synthetic voice',
		lastVerse: 31
	});
	let trackId = $state('GEN.1');
	const spokenChapter = $derived(chapterInfo(player.chapterId));
	const nativeChapter = $derived(chapterInfo(trackId));
	$effect(() => {
		if (audio) audio.playbackRate = player.rate;
	});

	onMount(() => {
		let generation = 0,
			lastSaved = -1,
			pendingSeek: number | null = null;
		let speechChapter: Chapter = genesis;
		let remembered: { chapterId: string; hash: string; time: number } | null = null;
		try {
			const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
			if (
				typeof saved?.chapterId === 'string' &&
				chapterInfo(saved.chapterId) &&
				typeof saved.hash === 'string' &&
				Number.isFinite(saved.time) &&
				saved.time >= 0
			)
				remembered = saved;
		} catch {}
		function savePosition(id: string, verse: number, phase: 'reading' | 'summary') {
			try {
				const current = loadProgress(localStorage);
				const position = { ...current, chapterId: id, verse, phase };
				saveProgress(localStorage, phase === 'summary' ? completeChapter(position) : position);
				player.storageError = false;
			} catch {
				player.storageError = true;
			}
			window.dispatchEvent(new Event('reading-progress'));
		}
		const device =
			'speechSynthesis' in window
				? createDeviceNarrator({
						engine: speechSynthesis,
						createUtterance: (text) => new SpeechSynthesisUtterance(text),
						voice: () => player.deviceVoice,
						rate: () => player.rate,
						onstate: (speaking) => (player.speaking = speaking),
						onerror: () =>
							(player.error = 'Device speech stopped. Try again, or select the recorded chapter.'),
						onposition: (verse, phase) => {
							player.verse = verse;
							player.phase = phase;
							savePosition(speechChapter.id, verse, phase);
						}
					})
				: null;
		player.stopSpeech = () => {
			device?.stop();
			player.speaking = false;
		};
		player.pause = () => {
			generation++;
			audio.pause();
			player.playing = false;
		};
		function readDevice(
			verse: number,
			summaryOnly = false,
			chapter: Chapter = genesis,
			summary?: SpokenSummary
		) {
			player.pause();
			player.stopSpeech();
			player.started = false;
			pendingSeek = null;
			speechChapter = chapter;
			player.chapterId = chapter.id;
			player.error = '';
			if (!device) {
				player.error =
					'Device speech is unavailable. Select the recorded chapter or continue reading.';
				return;
			}
			device.read(narrationSegments(chapter, verse, summaryOnly, summary));
		}
		player.readDevice = (verse, chapter, summary) => readDevice(verse, false, chapter, summary);
		player.readDeviceSummary = (chapter = genesis, summary) =>
			readDevice(chapter.verses.length, true, chapter, summary);
		function sync(force = false) {
			if (!player.started || pendingSeek !== null) return;
			player.currentTime = audio.currentTime;
			Object.assign(player, positionAt(audio.currentTime, track.cues, track.lastVerse));
			const second = Math.floor(audio.currentTime);
			if (force || second !== lastSaved) {
				lastSaved = second;
				savePosition(trackId, player.verse, player.phase);
				try {
					remembered = { chapterId: trackId, hash: track.audioSha256, time: audio.currentTime };
					localStorage.setItem(key, JSON.stringify(remembered));
				} catch {
					player.storageError = true;
				}
			}
			try {
				if ('mediaSession' in navigator && Number.isFinite(audio.duration) && audio.duration > 0)
					navigator.mediaSession.setPositionState({
						duration: audio.duration,
						position: Math.min(audio.currentTime, audio.duration),
						playbackRate: audio.playbackRate
					});
			} catch {}
			checkSleep();
		}
		player.seek = (time) => {
			if (!Number.isFinite(time)) return;
			const target = Math.max(0, Math.min(track.duration, time));
			if (!audio.readyState) {
				pendingSeek = target;
				return;
			}
			audio.currentTime = target;
			sync(true);
		};
		async function start(time?: number) {
			player.error = '';
			player.stopSpeech();
			player.chapterId = trackId;
			player.started = true;
			player.duration = track.duration;
			lastSaved = -1;
			const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
			try {
				if (session) session.type = 'playback';
			} catch {}
			if (time !== undefined) {
				pendingSeek = time;
				if (audio.readyState) {
					audio.currentTime = time;
					pendingSeek = null;
				}
			}
			audio.playbackRate = player.rate;
			try {
				await audio.play();
			} catch {
				player.playing = false;
				player.error =
					'Playback could not start. Reconnect or download this chapter, then tap Play to try again.';
			}
		}
		player.play = async (time) => {
			generation++;
			await start(time);
		};
		player.playChapter = async (chapter, verse = 1, summaryOnly = false) => {
			const request = ++generation;
			player.stopSpeech();
			audio.pause();
			player.started = false;
			player.playing = false;
			player.error = '';
			try {
				const selected = await loadRecording(chapter.id);
				if (request !== generation) return;
				const position =
					remembered?.chapterId === chapter.id && remembered.hash === selected.audioSha256
						? remembered.time
						: 0;
				const resumed = positionAt(position, selected.cues, chapter.verses.length);
				const target = summaryOnly
					? selected.summaryStart
					: position > 0 &&
						  position < selected.duration &&
						  resumed.verse === verse &&
						  resumed.phase === 'reading'
						? position
						: (selected.cues.find((cue) => cue.verse !== null && cue.verse >= verse)?.start ?? 0);
				pendingSeek = target;
				trackId = chapter.id;
				track = selected;
				player.chapterId = chapter.id;
				player.verse = verse;
				player.phase = summaryOnly ? 'summary' : 'reading';
				await tick();
				if (request !== generation) return;
				await start(target);
			} catch (error) {
				if (request === generation)
					player.error =
						error instanceof Error ? error.message : 'This chapter recording could not load.';
			}
		};
		function checkSleep() {
			if (player.sleepEndsAt !== null && Date.now() >= player.sleepEndsAt) {
				player.pause();
				player.stopSpeech();
				player.sleepEndsAt = null;
			}
		}
		player.setSleepTimer = (minutes) => {
			player.sleepEndsAt = minutes > 0 ? Date.now() + minutes * 60_000 : null;
		};
		const timer = setInterval(checkSleep, 1000);
		const metadata = () => {
			if (pendingSeek !== null) {
				audio.currentTime = Math.min(pendingSeek, audio.duration || track.duration);
				pendingSeek = null;
			}
			sync(true);
		};
		const timeupdate = () => sync();
		const played = () => {
			player.started = true;
			player.playing = true;
			player.chapterId = trackId;
			if ('mediaSession' in navigator) {
				navigator.mediaSession.playbackState = 'playing';
				if ('MediaMetadata' in window)
					navigator.mediaSession.metadata = new MediaMetadata({
						title: `${nativeChapter?.book} ${nativeChapter?.chapter} and chapter overview`,
						artist: 'Help with the Bible',
						album: `World English Bible · ${track.voiceLabel ?? 'Recorded narration'}`,
						artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }]
					});
			}
		};
		const paused = () => {
			player.playing = !audio.paused;
			sync();
			if ('mediaSession' in navigator)
				navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
		};
		const ended = () => {
			sync(true);
			paused();
		};
		const failed = () => {
			player.playing = false;
			if (player.started)
				player.error = 'The recording could not load. Reconnect or choose a downloaded chapter.';
		};
		const visibility = () => {
			sync();
			checkSleep();
		};
		const actions: MediaSessionAction[] = [];
		if ('mediaSession' in navigator)
			for (const [action, handler] of Object.entries({
				play: () => void player.play(),
				pause: player.pause,
				seekbackward: (detail: MediaSessionActionDetails) =>
					player.seek(audio.currentTime - (detail.seekOffset ?? 15)),
				seekforward: (detail: MediaSessionActionDetails) =>
					player.seek(audio.currentTime + (detail.seekOffset ?? 15)),
				seekto: (detail: MediaSessionActionDetails) => {
					if (detail.seekTime !== undefined) player.seek(detail.seekTime);
				}
			})) {
				try {
					navigator.mediaSession.setActionHandler(action as MediaSessionAction, handler);
					actions.push(action as MediaSessionAction);
				} catch {}
			}
		const events: { [key: string]: () => void } = {
			timeupdate,
			seeked: timeupdate,
			play: played,
			pause: paused,
			ended,
			error: failed,
			loadedmetadata: metadata
		};
		for (const [event, handler] of Object.entries(events)) audio.addEventListener(event, handler);
		document.addEventListener('visibilitychange', visibility);
		window.addEventListener('pagehide', timeupdate);
		return () => {
			generation++;
			audio.pause();
			player.stopSpeech();
			clearInterval(timer);
			for (const action of actions) navigator.mediaSession.setActionHandler(action, null);
			for (const [event, handler] of Object.entries(events))
				audio.removeEventListener(event, handler);
			document.removeEventListener('visibilitychange', visibility);
			window.removeEventListener('pagehide', timeupdate);
		};
	});
</script>

<div
	class="audio-dock hidden [&_audio]:block [&_audio]:h-11 [&_audio]:w-[min(100%,_480px)] mobile:[&_audio]:order-3 mobile:[&_audio]:w-full [&.audio-dock-active]:fixed [&.audio-dock-active]:inset-x-0 [&.audio-dock-active]:bottom-[var(--app-bar-height)] [&.audio-dock-active]:z-60 [&.audio-dock-active]:flex [&.audio-dock-active]:flex-wrap [&.audio-dock-active]:items-center [&.audio-dock-active]:justify-center [&.audio-dock-active]:gap-x-6 [&.audio-dock-active]:gap-y-3 [&.audio-dock-active]:border-t [&.audio-dock-active]:border-t-divider [&.audio-dock-active]:bg-surface [&.audio-dock-active]:px-[max(20px,env(safe-area-inset-left))] [&.audio-dock-active]:pt-3.5 [&.audio-dock-active]:pb-[calc(14px_+_env(safe-area-inset-bottom))] [&.audio-dock-active]:shadow-[0_-5px_20px_#00000008] app:[&.audio-dock-active]:pb-3.5 mobile:[&.audio-dock-active]:gap-x-3.5 mobile:[&.audio-dock-active]:gap-y-2"
	class:audio-dock-active={player.started || player.speaking}
>
	{#if player.speaking}<span>
			Device voice · {spokenChapter?.book}
			{spokenChapter?.chapter}
			{player.phase === 'summary' ? 'overview' : `verse ${player.verse}`}
		</span><Button variants={['secondary']} class="button-secondary" onclick={player.stopSpeech}>
			Stop device voice
		</Button>{/if}
	{#if player.started}<div
			class="audio-dock-label text-[0.8125rem] leading-[1.8] mobile:flex-1 [&_>_a]:block [&_>_a]:text-foreground [&_>_a]:no-underline [&_>_span]:block [&_>_span]:text-[0.6875rem] [&_>_span]:text-muted"
		>
			<A href="/read">
				{nativeChapter?.book}
				{nativeChapter?.chapter} · {player.phase === 'summary'
					? 'Chapter overview'
					: `Verse ${player.verse}`}
			</A><span>{track.voiceLabel ?? 'Recorded narration'}</span>
		</div>{/if}
	<audio
		bind:this={audio}
		src={track.src}
		controls
		preload="none"
		aria-label={`${nativeChapter?.book} ${nativeChapter?.chapter} and chapter overview narration`}
		hidden={!player.started}
	></audio>
	{#if player.sleepEndsAt}<span class="reader-smallprint mt-5.5 text-xs leading-[1.8] text-muted">
			Sleep timer ends at {new Date(player.sleepEndsAt).toLocaleTimeString([], {
				hour: 'numeric',
				minute: '2-digit'
			})}
		</span>{/if}
	{#if player.started}<Button
			variants={['audioClose']}
			class="audio-close"
			onclick={() => {
				player.pause();
				player.started = false;
				player.setSleepTimer(0);
			}}
		>
			Close player
		</Button>{/if}
</div>
{#if player.error}<p
		class="audio-error fixed right-5 bottom-[calc(110px_+_env(safe-area-inset-bottom)_+_var(--app-bar-height))] left-5 z-65 m-auto max-w-175 border border-divider bg-surface-soft px-5 py-3.5 text-sm text-foreground"
		role="status"
	>
		{player.error}
	</p>{/if}
