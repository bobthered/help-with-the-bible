<script lang="ts">
	import { ReadAloud, BookOpen } from '$lib/components';
	import chapter from '$lib/bible/genesis-1.json';
	const verses = chapter.verses.slice(0, 3);
</script>

<aside class="scripture-preview" aria-label="A preview of Genesis chapter 1">
	<div class="preview-overline"><BookOpen size={16} /><span>Open to the beginning</span></div>
	<div class="preview-title"><span>Genesis</span><span class="chapter-number">1</span></div>
	<div class="preview-verses">
		{#each verses as verse}
			<p><sup>{verse.number}</sup>{verse.text}</p>
		{/each}
	</div>
	<div class="preview-footer">
		<ReadAloud {verses} label="Listen to these verses" /><span>World English Bible</span>
	</div>
</aside>
