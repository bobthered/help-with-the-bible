<script lang="ts">
	import { getContext } from 'svelte';
	import { A, Button, BrandMark, Check } from '$lib/components';
	import { PWA_CONTEXT, type PwaState } from '$lib/pwa/context';
	const pwa = getContext<PwaState>(PWA_CONTEXT);
</script>

<section class="install-page shell" aria-labelledby="install-heading">
	<div class="install-heading">
		<div class="install-mark"><BrandMark /></div>
		<p class="section-label">Keep Scripture close</p>
		<h1 id="install-heading">A place on your home screen.</h1>
		<p>
			Install Help with the Bible on your computer, phone, or tablet. Open it like an app and return
			to your reading, even without a connection.
		</p>
	</div>
	<div class="install-action">
		{#if pwa.installed}<p class="install-confirmation">
				<Check size={18} />You’re using the installed app.
			</p>{:else if pwa.canInstall}<Button class="button-primary" onclick={pwa.install}>
				Install Help with the Bible
			</Button>{:else}<p>Use your browser’s install option, or follow the steps below.</p>{/if}
		<p class="install-offline-state" role="status">
			{pwa.offlineReady
				? 'Ready for offline reading: all 66 books and 1,189 chapters.'
				: 'Connect once and keep the app open while offline reading is prepared.'}
		</p>
	</div>
	<div class="install-platforms">
		<section>
			<h2>iPhone & iPad</h2>
			<ol>
				<li>Open this site in Safari.</li>
				<li>
					Open the Share menu and choose <strong>Add to Home Screen</strong>. You may need to scroll
					through the options.
				</li>
				<li>If shown, enable <strong>Open as Web App</strong>, then tap <strong>Add</strong>.</li>
			</ol>
		</section>
		<section>
			<h2>Android</h2>
			<ol>
				<li>Open this site in Chrome.</li>
				<li>Tap the install button above when available, or open Chrome’s menu.</li>
				<li>
					Choose <strong>Install app</strong> or <strong>Add to Home screen</strong> and follow the prompts.
				</li>
			</ol>
		</section>
		<section>
			<h2>PC & desktop</h2>
			<ol>
				<li>Open this site in Chrome or Microsoft Edge.</li>
				<li>
					Choose the install icon in the address bar, or find the install option in the browser’s
					menu.
				</li>
				<li>Confirm installation, then open the app from your desktop or app launcher.</li>
			</ol>
		</section>
	</div>
	<div class="install-details">
		<h2>Your place stays with you on this device.</h2>
		<p>
			Offline reading includes the entire 66-book Bible, plus the Genesis 1 summary and recording.
			Standard device voices may need internet, depending on the voice. No external AI service is
			used.
		</p>
		<p>
			Reading progress is stored locally, without an account or device sync. Some platforms keep the
			installed app’s storage separate from browser tabs, so install before beginning a long reading
			journey. Clearing the app’s data can remove your place.
		</p>
		<A href="/read" class="button-primary">Continue reading</A>
	</div>
</section>
