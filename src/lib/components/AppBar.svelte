<script lang="ts">
	import { page } from '$app/state';
	import { A, House, BookOpen, Bookmark, ThemeToggle } from '$lib/components';

	const journey = $derived(page.url.pathname === '/' && page.url.hash === '#your-place');
</script>

<nav
	class="app-bar fixed inset-x-0 bottom-0 z-50 hidden border-t border-divider bg-surface pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] app:block"
	aria-label="App navigation"
>
	<div class="mx-auto grid max-w-120 grid-cols-4 gap-1 px-3 py-2">
		<A
			href="/"
			variants={['appBar']}
			aria-current={page.url.pathname === '/' && !journey ? 'page' : undefined}
		>
			<House size={21} aria-hidden="true" /><span>Home</span>
		</A>
		<A
			href="/read"
			variants={['appBar']}
			aria-current={page.url.pathname === '/read' ? 'page' : undefined}
		>
			<BookOpen size={21} aria-hidden="true" /><span>Read</span>
		</A>
		<A href="/#your-place" variants={['appBar']} aria-current={journey ? 'location' : undefined}>
			<Bookmark size={21} aria-hidden="true" /><span>Journey</span>
		</A>
		<ThemeToggle appBar />
	</div>
</nav>
