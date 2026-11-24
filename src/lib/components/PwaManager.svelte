<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { dev } from '$app/env';
	import { Button } from '$lib/components';
	import { PWA_CONTEXT, type PwaState } from '$lib/pwa/context';

	const pwa = getContext<PwaState>(PWA_CONTEXT);
	type InstallEvent = Event & {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	};

	onMount(() => {
		let prompt: InstallEvent | null = null;
		let registration: ServiceWorkerRegistration | undefined;
		let disposed = false;
		const display = matchMedia('(display-mode: standalone)');
		const syncDisplay = () => {
			pwa.installed =
				display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
			document.documentElement.toggleAttribute('data-app-mode', pwa.installed);
		};
		const syncOnline = () => {
			pwa.online = navigator.onLine;
		};
		const installable = (event: Event) => {
			event.preventDefault();
			prompt = event as InstallEvent;
			pwa.canInstall = true;
		};
		const installed = () => {
			pwa.installed = true;
			pwa.canInstall = false;
			prompt = null;
		};
		const changed = () => {
			if (pwa.updating) window.location.reload();
		};
		const checkUpdate = () => {
			if (document.visibilityState === 'visible' && navigator.onLine)
				void registration?.update().catch(() => {});
		};
		const watchInstalling = () => {
			const worker = registration?.installing;
			worker?.addEventListener('statechange', () => {
				if (!disposed && worker.state === 'installed' && registration?.active)
					pwa.updateReady = Boolean(registration.waiting);
			});
		};

		syncDisplay();
		syncOnline();
		window.addEventListener('beforeinstallprompt', installable);
		window.addEventListener('appinstalled', installed);
		window.addEventListener('online', syncOnline);
		window.addEventListener('offline', syncOnline);
		display.addEventListener('change', syncDisplay);
		document.addEventListener('visibilitychange', checkUpdate);
		pwa.install = async () => {
			if (!prompt) return;
			const event = prompt;
			prompt = null;
			pwa.canInstall = false;
			try {
				await event.prompt();
				await event.userChoice;
			} catch {
				pwa.error = 'Installation couldn’t start. You can use your browser’s install menu instead.';
			}
		};
		pwa.update = () => {
			if (!registration?.waiting || pwa.updating) return;
			pwa.updating = true;
			registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
		};
		if (!dev && 'serviceWorker' in navigator && window.isSecureContext) {
			navigator.serviceWorker.addEventListener('controllerchange', changed);
			void (async () => {
				try {
					registration = await navigator.serviceWorker.register('/service-worker.js', {
						type: 'module',
						updateViaCache: 'none'
					});
					if (disposed) return;
					pwa.updateReady = Boolean(registration.waiting);
					registration.addEventListener('updatefound', watchInstalling);
					watchInstalling();
					await navigator.serviceWorker.ready;
					if (!disposed) pwa.offlineReady = true;
				} catch {
					if (!disposed)
						pwa.error = 'Offline setup couldn’t finish. Reconnect and reopen the app to try again.';
				}
			})();
		}
		return () => {
			disposed = true;
			window.removeEventListener('beforeinstallprompt', installable);
			window.removeEventListener('appinstalled', installed);
			window.removeEventListener('online', syncOnline);
			window.removeEventListener('offline', syncOnline);
			display.removeEventListener('change', syncDisplay);
			document.removeEventListener('visibilitychange', checkUpdate);
			registration?.removeEventListener('updatefound', watchInstalling);
			if ('serviceWorker' in navigator)
				navigator.serviceWorker.removeEventListener('controllerchange', changed);
		};
	});
</script>

{#if !pwa.online || pwa.updateReady || pwa.error}
	<div
		class="pwa-notice flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-b border-b-divider bg-surface-soft px-5 py-3 text-[0.8125rem] leading-[1.6] text-foreground [&_.button-primary]:min-h-11 [&_.button-primary]:px-4.5 [&_.button-primary]:py-2.25"
		role="status"
	>
		<p>
			{!pwa.online
				? pwa.offlineReady
					? 'You’re offline. All Scripture and chapter overviews are available, along with audio you downloaded.'
					: 'You’re offline. Reconnect to finish preparing offline reading.'
				: pwa.error || 'An app update is ready. Your reading place will be kept.'}
		</p>
		{#if pwa.updateReady && pwa.online}<Button
				variants={['primary']}
				class="button-primary"
				onclick={pwa.update}
				disabled={pwa.updating}
			>
				{pwa.updating ? 'Updating…' : 'Update app'}
			</Button>{/if}
	</div>
{/if}
