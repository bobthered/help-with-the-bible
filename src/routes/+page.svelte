<script lang="ts">
	import { H1, H2, P, ThemeToggle } from '$lib/components';

	const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
</script>

<svelte:head>
	<title>Help with the Bible</title>
	<meta name="description" content="A place to grow in your understanding of the Bible." />
</svelte:head>

<main class="mx-auto max-w-5xl px-6 py-8 sm:px-10">
	<header class="flex flex-wrap items-center justify-between gap-4 border-b border-(--border) pb-6">
		<span class="font-semibold">Help with the Bible</span>
		<ThemeToggle />
	</header>

	<section class="max-w-2xl py-20 sm:py-28">
		<P class="mb-4 text-(--accent)">A foundation for understanding.</P>
		<H1 class="font-serif text-5xl leading-tight sm:text-6xl">Help with the Bible</H1>
		<P class="mt-6 max-w-lg text-lg text-(--muted)">
			A place to explore Scripture, ask questions, and grow in understanding. We're just getting
			started.
		</P>
	</section>

	<section aria-labelledby="palette-heading" class="border-t border-(--border) py-8">
		<H2 id="palette-heading" class="font-serif">The site palette</H2>
		<P class="mt-3 text-(--muted)">Black and white foundations, with gold for emphasis.</P>
		<div class="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-11">
			{#each shades as shade}
				<div>
					<div class="h-16 rounded-sm" style:background={`var(--color-primary-${shade})`}></div>
					<P class="mt-2 text-sm text-(--muted)">{shade}</P>
				</div>
			{/each}
		</div>
	</section>
</main>
