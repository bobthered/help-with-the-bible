<script lang="ts">
	import { getContext } from 'svelte';
	import { A, Button, BrandMark, Check } from '$lib/components';
	import { PWA_CONTEXT, type PwaState } from '$lib/pwa/context';
	const pwa = getContext<PwaState>(PWA_CONTEXT);
</script>

<section
	class="install-page shell mx-auto w-[min(1200px,_calc(100%_-_96px))] max-w-250 pt-17.5 pb-22.5 tablet:w-[calc(100%_-_64px)] mobile:w-[calc(100%_-_40px)] mobile:pt-11.25 mobile:pb-15"
	aria-labelledby="install-heading"
>
	<div
		class="install-heading m-auto max-w-160 text-center [&_>_p:last-child]:mt-6 [&_>_p:last-child]:text-[1.0625rem] [&_>_p:last-child]:leading-[1.85] [&_>_p:last-child]:text-muted [&_h1]:mt-4.5 [&_h1]:font-serif [&_h1]:text-[length:clamp(2.5rem,_5vw,_3.75rem)] [&_h1]:leading-[1.1] [&_h1]:font-normal [&_h1]:tracking-[-0.035em]"
	>
		<div
			class="install-mark mb-6.25 inline-flex h-18 w-18 items-center justify-center rounded-2xl bg-gray-950 text-[#c9a227] [&_svg]:h-10.5 [&_svg]:w-10.5"
		>
			<BrandMark />
		</div>
		<p class="section-label text-[0.8125rem] font-medium text-accent">Keep Scripture close</p>
		<h1 id="install-heading">A place on your home screen.</h1>
		<p>
			Install Help with the Bible on your computer, phone, or tablet. Open it like an app and return
			to your reading, even without a connection.
		</p>
	</div>
	<div class="install-action mt-7.5 mb-13.75 text-center text-[0.9375rem]">
		{#if pwa.installed}<p
				class="install-confirmation flex items-center justify-center gap-2 text-accent"
			>
				<Check size={18} />You’re using the installed app.
			</p>{:else if pwa.canInstall}<Button
				variants={['primary']}
				class="button-primary"
				onclick={pwa.install}
			>
				Install Help with the Bible
			</Button>{:else}<p>Use your browser’s install option, or follow the steps below.</p>{/if}
		<p class="install-offline-state mt-4 text-[0.8125rem] leading-[1.7] text-muted" role="status">
			{pwa.offlineReady
				? 'Ready for offline reading: all 66 books and 1,189 chapters.'
				: 'Connect once and keep the app open while offline reading is prepared.'}
		</p>
	</div>
	<div
		class="install-platforms grid grid-cols-[repeat(3,_1fr)] gap-7.5 border-y border-y-divider py-7.5 mobile:grid-cols-[1fr] mobile:gap-7 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-normal [&_li]:mt-3 [&_li]:pl-1 [&_li]:text-sm [&_li]:leading-[1.8] [&_li]:text-muted [&_li::marker]:text-accent [&_ol]:mt-4.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-medium [&_strong]:text-foreground"
	>
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
	<div
		class="install-details mx-auto mt-10 mb-0 max-w-170 [&_.button-primary]:mt-6.25 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-normal [&_p]:mt-3.75 [&_p]:text-[0.9375rem] [&_p]:leading-[1.8] [&_p]:text-muted"
	>
		<h2>Your place stays with you on this device.</h2>
		<p>
			Offline reading includes the entire 66-book Bible and chapter overviews. For background audio,
			download the chapters you want from the reader before disconnecting. The Genesis 1 recording
			is included in initial setup. Standard device voices may need internet, depending on the
			voice.
		</p>
		<p>
			Reading progress is stored locally, without an account or device sync. Some platforms keep the
			installed app’s storage separate from browser tabs, so install before beginning a long reading
			journey. Clearing the app’s data can remove your place.
		</p>
		<A variants={['primary']} href="/read" class="button-primary">Continue reading</A>
	</div>
</section>
