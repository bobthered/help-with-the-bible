<script lang="ts">
	import { A, BrandMark } from '$lib/components';
</script>

<footer
	class="site-footer shell mx-auto flex w-[min(1200px,_calc(100%_-_96px))] flex-wrap items-center justify-between gap-4 border-t border-t-divider py-7 text-xs tablet:w-[calc(100%_-_64px)] mobile:w-[calc(100%_-_40px)] mobile:flex-col mobile:items-start mobile:gap-2.5 [&_p]:text-muted tablet:[&_p]:hidden"
>
	<A
		href="/"
		class="footer-brand inline-flex items-center gap-2.25 font-serif text-[0.9375rem] text-foreground no-underline [&_>_svg]:shrink-0 [&_>_svg]:text-accent [&_svg]:h-5.75 [&_svg]:w-5.75"
	>
		<BrandMark /><span>Help with the Bible</span>
	</A>
	<p>Scripture first. Understanding, one chapter at a time.</p>
	<A href="/install" class="footer-source text-[0.6875rem] text-muted no-underline">Install app</A>
	<A
		href="https://ebible.org/engwebp/"
		class="footer-source text-[0.6875rem] text-muted no-underline"
	>
		World English Bible · Public domain
	</A>
</footer>
