<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components';

	let isDark = $state(false);

	onMount(() => {
		isDark = document.documentElement.dataset.theme === 'dark';
	});

	function toggleTheme() {
		isDark = !isDark;
		const mode = isDark ? 'dark' : 'light';
		document.documentElement.dataset.theme = mode;
		try {
			localStorage.setItem('theme', mode);
		} catch {
			// The theme still works when browser storage is unavailable.
		}
	}
</script>

<Button onclick={toggleTheme} aria-label="Dark mode" aria-pressed={isDark}>
	{isDark ? 'Light mode' : 'Dark mode'}
</Button>
