<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Sun, Moon } from '$lib/components';

	let { appBar = false }: { appBar?: boolean } = $props();
	let isDark = $state(false);

	onMount(() => {
		const root = document.documentElement;
		const syncTheme = () => {
			isDark = root.dataset.theme === 'dark';
		};
		syncTheme();
		const observer = new MutationObserver(syncTheme);
		observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
		return () => observer.disconnect();
	});

	function toggleTheme() {
		isDark = !isDark;
		const mode = isDark ? 'dark' : 'light';
		document.documentElement.dataset.theme = mode;
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute('content', isDark ? '#0a0a0a' : '#ffffff');
		try {
			localStorage.setItem('theme', mode);
		} catch {
			// The theme still works when browser storage is unavailable.
		}
	}
</script>

<Button
	variants={[appBar ? 'appBar' : 'themeToggle']}
	class="theme-toggle"
	onclick={toggleTheme}
	aria-label="Dark mode"
	aria-pressed={isDark}
	title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if isDark}<Sun size={appBar ? 21 : 19} />{:else}<Moon size={appBar ? 21 : 19} />{/if}
	{#if appBar}<span>Theme</span>{/if}
</Button>
