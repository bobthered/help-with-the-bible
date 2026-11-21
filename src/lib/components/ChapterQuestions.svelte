<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { Button, Textarea, SpeechInput } from '$lib/components';
	import { AUDIO_CONTEXT, type AudioState } from '$lib/audio/context';
	import notes from '$lib/bible/genesis-1-notes.json';
	import chapter from '$lib/bible/genesis-1.json';
	type Answer = { answer: string; references: number[]; uncertainty: string };
	const player = getContext<AudioState>(AUDIO_CONTEXT);
	let question = $state(''),
		busy = $state(false),
		error = $state(''),
		available = $state(false),
		checked = $state(false);
	let answer = $state<Answer | null>(null),
		answerType = $state('');
	let controller: AbortController | null = null;
	onMount(() => {
		const status = new AbortController();
		void fetch('/api/study', { signal: status.signal })
			.then((response) => (response.ok ? response.json() : { available: false }))
			.then((data) => {
				available = data.available === true;
				checked = true;
			})
			.catch(() => {
				checked = true;
			});
		return () => {
			status.abort();
			controller?.abort();
			player.stopSpeech();
		};
	});
	function showNote(index: number) {
		player.pause();
		player.stopSpeech();
		question = notes[index].question;
		answer = notes[index];
		answerType = 'Editorial study note';
		error = '';
		if (player.mode === 'voice') player.speak(notes[index].answer + ' ' + notes[index].uncertainty);
	}
	async function ask(text = question) {
		if (!text.trim() || busy) return;
		question = text;
		busy = true;
		error = '';
		answer = null;
		player.pause();
		player.stopSpeech();
		controller = new AbortController();
		try {
			const response = await fetch('/api/study', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chapterId: 'GEN.1', question: text }),
				signal: controller.signal
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'An answer could not be loaded.');
			answer = data;
			answerType = 'AI-generated commentary';
			if (player.mode === 'voice') player.speak(data.answer + ' ' + data.uncertainty);
		} catch (failure) {
			if (!controller.signal.aborted)
				error =
					failure instanceof Error
						? failure.message
						: 'You may be offline. Your question is still here; try again when connected.';
			if (error && player.mode === 'voice') player.speak(error);
		} finally {
			busy = false;
		}
	}
</script>

<section class="chapter-questions" aria-labelledby="questions-heading">
	<p class="section-label">Stay with the chapter</p>
	<h2 id="questions-heading">What would you like to understand?</h2>
	<p class="reader-smallprint">
		{checked && !available
			? 'Live AI answers need server configuration or a connection. The editorial study notes below work offline.'
			: 'Ask about Genesis 1. AI answers are commentary and can be mistaken; check the cited verses.'}
	</p>
	<div class="study-notes">
		{#each notes as note, index}<Button
				variants={['ghost']}
				class="study-note-button"
				onclick={() => showNote(index)}
				disabled={busy}
			>
				{note.question}
			</Button>{/each}
	</div>
	<form
		onsubmit={(event) => {
			event.preventDefault();
			void ask();
		}}
	>
		<label for="chapter-question">Your question</label><Textarea
			id="chapter-question"
			bind:value={question}
			maxlength={1000}
			rows={3}
			placeholder="Ask about Genesis 1…"
			required
			disabled={busy}
		/>
		<p class="question-disclosure">
			Submitting sends your question and this chapter’s text to OpenAI. Reading progress is not
			sent.{player.mode === 'voice'
				? ' In voice mode, a finished spoken question is submitted automatically and the answer is read aloud.'
				: ''}
		</p>
		<div class="question-actions">
			<SpeechInput
				disabled={busy}
				ontranscript={(text) => (question = text)}
				onfinished={(text) => {
					if (player.mode === 'voice') void ask(text);
				}}
			/><Button class="button-primary" type="submit" disabled={busy || !question.trim()}>
				{busy ? 'Considering your question…' : 'Ask about this chapter'}
			</Button>
		</div>
	</form>
	{#if error}<p role="status" class="question-error">{error}</p>{/if}
	{#if answer}<article class="study-answer" aria-live={player.mode === 'voice' ? 'off' : 'polite'}>
			<p class="summary-label">{answerType} · Separate from Scripture</p>
			<p>{answer.answer}</p>
			{#if answer.uncertainty}<p class="answer-uncertainty">{answer.uncertainty}</p>{/if}
			<div class="answer-controls">
				<Button
					variants={['ghost']}
					class="button-secondary"
					onclick={() =>
						player.speaking
							? player.stopSpeech()
							: player.speak(answer!.answer + ' ' + answer!.uncertainty)}
				>
					{player.speaking ? 'Stop spoken answer' : 'Read answer aloud'}
				</Button>
			</div>
			{#if answer.references.length}<h3>Read the supporting verses</h3>
				{#each answer.references as reference}<blockquote>
						<cite>Genesis 1:{reference}</cite>
						<p>{chapter.verses[reference - 1].text}</p>
					</blockquote>{/each}{/if}
		</article>{/if}
</section>
