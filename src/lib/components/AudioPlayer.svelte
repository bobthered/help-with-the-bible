<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { A, Button } from '$lib/components';
	import { AUDIO_CONTEXT, type AudioState, positionAt } from '$lib/audio/context';
	import recording from '$lib/bible/genesis-1-audio.json';
	import { loadProgress, saveProgress } from '$lib/reading/progress';
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	const key = 'help-with-the-bible:audio:v1';
	let audio: HTMLAudioElement;
	let lastSaved = -1;
	let resumedTime = 0;

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
		let speech: SpeechSynthesisUtterance | null = null;
		let speechGeneration = 0;
		let pendingSeek: number | null = null;
		player.stopSpeech = () => {
			speechGeneration++;
			if ('speechSynthesis' in window) speechSynthesis.cancel();
			speech = null;
			player.speaking = false;
		};
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
		player.speak = (text) => {
			player.error = '';
			player.pause();
			player.stopSpeech();
			if (!('speechSynthesis' in window)) {
				player.error =
					'Spoken answers are unavailable in this browser. The answer is still shown on screen.';
				return;
			}
			speech = new SpeechSynthesisUtterance(text);
			const generation = speechGeneration;
			speech.lang = 'en-US';
			speech.rate = 0.95;
			const voices = speechSynthesis.getVoices();
			speech.voice =
				voices.find((voice) => voice.voiceURI === player.deviceVoice) ??
				voices.find(
					(voice) => voice.lang.startsWith('en') && /natural|premium|enhanced/i.test(voice.name)
				) ??
				voices.find((voice) => voice.lang.startsWith('en')) ??
				null;
			speech.onend = () => {
				if (generation !== speechGeneration) return;
				player.speaking = false;
				speech = null;
			};
			speech.onerror = () => {
				if (generation !== speechGeneration) return;
				player.speaking = false;
				speech = null;
			};
			player.speaking = true;
			speechSynthesis.speak(speech);
		};
		function sync() {
			player.currentTime = audio.currentTime;
			Object.assign(player, positionAt(audio.currentTime, recording.cues));
			const second = Math.floor(audio.currentTime);
			if (!player.started || second === lastSaved) return;
			lastSaved = second;
			try {
				const current = loadProgress(localStorage);
				saveProgress(localStorage, {
					...current,
					verse: player.verse,
					phase: player.phase,
					completedChapterIds: player.phase === 'summary' ? ['GEN.1'] : current.completedChapterIds
				});
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

<div class="audio-dock" class:audio-dock-active={player.started}>
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
