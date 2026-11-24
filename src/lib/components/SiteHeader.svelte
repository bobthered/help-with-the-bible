<script lang="ts">
	import { A, BrandMark, ThemeToggle } from '$lib/components';
</script>

<A
	href="#main"
	class="skip-link fixed top-3 left-4 z-100 -translate-y-[180%] bg-surface px-5 py-3 text-foreground focus:translate-y-0"
>
	Skip to content
</A>
<header
	class="site-header shell mx-auto flex min-h-28 w-[min(1200px,_calc(100%_-_96px))] items-center justify-between gap-8 border-b border-b-divider tablet:w-[calc(100%_-_64px)] mobile:min-h-21 mobile:w-[calc(100%_-_40px)] mobile:gap-3.75 [&_nav]:flex [&_nav]:items-center [&_nav]:gap-8 mobile:[&_nav]:gap-2.5"
>
	<A
		href="/"
		class="brand inline-flex items-center gap-3.5 font-serif text-lg leading-[1.35] text-foreground no-underline mobile:gap-2.5 mobile:text-base [&_>_svg]:shrink-0 [&_>_svg]:text-accent"
	>
		<BrandMark /><span>
			Help with the Bible<span
				class="brand-subtitle mt-1.25 block font-sans text-xs text-muted tablet:hidden mobile:block mobile:text-[0.625rem]"
			>
				A little understanding, every day.
			</span>
		</span>
	</A>
	<nav aria-label="Main navigation">
		<A
			href="/install"
			class="nav-link text-sm text-muted no-underline hover:text-accent mobile:hidden"
		>
			Install app
		</A>
		<A
			href="/#experience"
			class="nav-link text-sm text-muted no-underline hover:text-accent mobile:hidden"
		>
			The experience
		</A>
		<A
			href="/#your-place"
			class="nav-link text-sm text-muted no-underline hover:text-accent mobile:hidden"
		>
			Your place
		</A>
		<ThemeToggle />
	</nav>
</header>
