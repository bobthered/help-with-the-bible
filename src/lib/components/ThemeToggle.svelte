<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Sun, Moon } from '$lib/components';

	let isDark = $state(false);

	onMount(() => {
		isDark = document.documentElement.dataset.theme === 'dark';
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
	variants={['ghost']}
	class="theme-toggle"
	onclick={toggleTheme}
	aria-label="Dark mode"
	aria-pressed={isDark}
	title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if isDark}<Sun size={19} />{:else}<Moon size={19} />{/if}
</Button>
