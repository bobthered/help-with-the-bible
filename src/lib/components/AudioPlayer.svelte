<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { A, Button } from '$lib/components';
	import { AUDIO_CONTEXT, type AudioState, positionAt } from '$lib/audio/context';
	import recording from '$lib/bible/genesis-1-audio.json';
	import { completeChapter, loadProgress, saveProgress } from '$lib/reading/progress';
	import { createDeviceNarrator } from '$lib/audio/device';
	import chapter from '$lib/bible/genesis-1.json';
	import { chapterInfo, type Chapter } from '$lib/bible/catalog';
	import { narrationSegments } from '$lib/audio/segments';
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	const key = 'help-with-the-bible:audio:v1';
	let audio: HTMLAudioElement;
	let lastSaved = -1;
	let resumedTime = 0;
	const spokenChapter = $derived(chapterInfo(player.chapterId));

	onMount(() => {
		player.duration = recording.duration;
		try {
			const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
			if (
				saved?.revision === recording.audioSha256 &&
				Number.isFinite(saved.time) &&
				saved.time >= 0 &&
				saved.time < recording.duration
			)
				resumedTime = saved.time;
		} catch {}
		let pendingSeek: number | null = null;
		let speechChapter: Chapter = chapter;
		const device =
			'speechSynthesis' in window
				? createDeviceNarrator({
						engine: speechSynthesis,
						createUtterance: (text) => new SpeechSynthesisUtterance(text),
						voice: () => player.deviceVoice,
						onstate: (speaking) => {
							player.speaking = speaking;
						},
						onerror: () => {
							player.error =
								'Device speech stopped. Try again or use the recorded background audio.';
						},
						onposition: (verse, phase) => {
							player.verse = verse;
							player.phase = phase;
							try {
								const current = loadProgress(localStorage);
								const position = {
									...current,
									chapterId: speechChapter.id,
									verse,
									phase
								};
								saveProgress(
									localStorage,
									phase === 'summary' ? completeChapter(position) : position
								);
								player.storageError = false;
							} catch {
								player.storageError = true;
							}
							window.dispatchEvent(new Event('reading-progress'));
						}
					})
				: null;
		player.stopSpeech = () => {
			device?.stop();
			player.speaking = false;
		};
		function readDevice(verse: number, summaryOnly = false, selected: Chapter = chapter) {
			player.pause();
			player.stopSpeech();
			player.started = false;
			speechChapter = selected;
			player.chapterId = selected.id;
			player.error = '';
			if (!device) {
				player.error =
					'Device speech is unavailable. You can read the text or use the recorded background audio.';
				return;
			}
			device.read(narrationSegments(selected, verse, summaryOnly));
		}
		player.readDevice = (verse, selected) => readDevice(verse, false, selected);
		player.readDeviceSummary = () => readDevice(31, true);
		player.currentTime = resumedTime;
		Object.assign(player, positionAt(resumedTime, recording.cues));
		player.pause = () => audio.pause();
		player.seek = (time) => {
			if (!Number.isFinite(time)) return;
			const target = Math.max(0, Math.min(time, recording.duration));
			if (!audio.readyState) {
				pendingSeek = target;
				player.currentTime = target;
				Object.assign(player, positionAt(target, recording.cues));
				return;
			}
			audio.currentTime = target;
			sync();
		};
		player.play = async (time) => {
			player.error = '';
			player.stopSpeech();
			player.chapterId = 'GEN.1';
			lastSaved = -1;
			const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
			try {
				if (session) session.type = 'playback';
			} catch {}
			if (time !== undefined) player.seek(time);
			else if (!player.started && resumedTime) player.seek(resumedTime);
			player.started = true;
			try {
				await audio.play();
			} catch {
				player.error = 'Playback could not start. Tap Play in the audio controls to try again.';
			}
		};
		function sync() {
			// An idle Genesis recording must not overwrite another chapter's device narration.
			if (!player.started) return;
			player.currentTime = audio.currentTime;
			Object.assign(player, positionAt(audio.currentTime, recording.cues));
			const second = Math.floor(audio.currentTime);
			if (second === lastSaved) return;
			lastSaved = second;
			try {
				const current = loadProgress(localStorage);
				const position = {
					...current,
					chapterId: 'GEN.1',
					verse: player.verse,
					phase: player.phase
				};
				saveProgress(
					localStorage,
					player.phase === 'summary' ? completeChapter(position) : position
				);
				localStorage.setItem(
					key,
					JSON.stringify({ revision: recording.audioSha256, time: audio.currentTime })
				);
				window.dispatchEvent(new Event('reading-progress'));
				player.storageError = false;
			} catch {
				player.storageError = true;
			}
			try {
				if ('mediaSession' in navigator && audio.duration && Number.isFinite(audio.duration))
					navigator.mediaSession.setPositionState({
						duration: audio.duration,
						playbackRate: audio.playbackRate,
						position: Math.min(audio.currentTime, audio.duration)
					});
			} catch {}
		}
		const played = () => {
			player.started = true;
			player.playing = true;
			if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
		};
		const paused = () => {
			player.playing = false;
			sync();
			if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
		};
		const failed = () => {
			player.playing = false;
			player.error =
				'The narration could not load. Reconnect to download it, or continue reading the text.';
		};
		const metadata = () => {
			if (pendingSeek !== null) {
				audio.currentTime = pendingSeek;
				pendingSeek = null;
				sync();
			}
		};
		const actions: MediaSessionAction[] = [];
		if ('mediaSession' in navigator) {
			if ('MediaMetadata' in window)
				navigator.mediaSession.metadata = new MediaMetadata({
					title: 'Genesis 1 and chapter summary',
					artist: 'Help with the Bible',
					album: 'World English Bible · Kokoro Heart',
					artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }]
				});
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
		}
		audio.setAttribute('playsinline', '');
		audio.addEventListener('timeupdate', sync);
		audio.addEventListener('seeked', sync);
		audio.addEventListener('play', played);
		audio.addEventListener('pause', paused);
		audio.addEventListener('ended', paused);
		audio.addEventListener('error', failed);
		audio.addEventListener('loadedmetadata', metadata);
		document.addEventListener('visibilitychange', sync);
		window.addEventListener('pagehide', sync);
		return () => {
			audio.pause();
			player.stopSpeech();
			for (const action of actions) navigator.mediaSession.setActionHandler(action, null);
			audio.removeEventListener('timeupdate', sync);
			audio.removeEventListener('seeked', sync);
			audio.removeEventListener('play', played);
			audio.removeEventListener('pause', paused);
			audio.removeEventListener('ended', paused);
			audio.removeEventListener('error', failed);
			audio.removeEventListener('loadedmetadata', metadata);
			document.removeEventListener('visibilitychange', sync);
			window.removeEventListener('pagehide', sync);
		};
	});
</script>

<div class="audio-dock" class:audio-dock-active={player.started || player.speaking}>
	{#if player.speaking}<span>
			Device voice · {spokenChapter?.book}
			{spokenChapter?.chapter}
			{player.phase === 'summary' ? 'complete' : `verse ${player.verse}`}
		</span><Button variants={['ghost']} class="button-secondary" onclick={player.stopSpeech}>
			Stop device voice
		</Button>{/if}
	{#if player.started}<div class="audio-dock-label">
			<A href="/read">
				Genesis 1 · {player.phase === 'summary' ? 'Chapter summary' : `Verse ${player.verse}`}
			</A><span>Kokoro Heart · AI-generated voice</span>
		</div>{/if}
	<audio
		bind:this={audio}
		src={recording.src}
		controls
		preload="metadata"
		aria-label="Genesis 1 and chapter summary narration"
		hidden={!player.started}
	></audio>
	{#if player.started}<Button
			variants={['ghost']}
			class="audio-close"
			onclick={() => {
				player.pause();
				player.started = false;
			}}
		>
			Close player
		</Button>{/if}
</div>
{#if player.error}<p class="audio-error" role="status">{player.error}</p>{/if}
