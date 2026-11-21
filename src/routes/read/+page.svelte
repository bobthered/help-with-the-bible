<script lang="ts">
	import { SiteHeader, SiteFooter, ChapterReader } from '$lib/components';
</script>

<svelte:head>
	<meta
		name="description"
		content="Read or listen to all 66 books of the World English Bible, one verse at a time. Your reading place is saved in this browser."
	/>
</svelte:head>

<SiteHeader />
<main id="main"><ChapterReader /></main>
<SiteFooter />
