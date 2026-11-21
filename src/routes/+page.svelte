<script lang="ts">
	import {
		A,
		SiteHeader,
		SiteFooter,
		ScripturePreview,
		ReadingJourney,
		BookOpen,
		Headphones,
		Bookmark,
		Check,
		Details,
		Summary
	} from '$lib/components';
</script>

<svelte:head>
	<title>Help with the Bible — One chapter at a time</title>
	<meta
		name="description"
		content="Find your way through the Bible, one verse at a time. Read or listen to Genesis, reflect on the chapter, and come back to your saved place."
	/>
</svelte:head>

<SiteHeader />
<main id="main">
	<section class="hero shell" aria-labelledby="hero-heading">
		<div class="hero-copy">
			<p class="eyebrow"><span></span>A quieter way to understand Scripture</p>
			<h1 id="hero-heading">One chapter.<br />A little more<br /><em>understanding.</em></h1>
			<p class="hero-description">
				You don’t have to understand the whole Bible today. Begin at the beginning. Read a verse,
				take your time, and reflect on each chapter.
			</p>
			<div class="hero-actions">
				<A href="/read" class="button-primary"><BookOpen size={18} />Begin with Genesis</A><A
					href="#experience"
					class="text-link"
				>
					How it works
				</A>
			</div>
			<p class="hero-note">
				<Check size={14} />No account needed<span>·</span>Your place, remembered
			</p>
		</div>
		<div class="hero-reading">
			<ScripturePreview />
			<div class="preview-caption">
				<span class="caption-rule"></span>The first words. Your own pace.
			</div>
		</div>
	</section>

	<section class="experience-section" id="experience" aria-labelledby="experience-heading">
		<div class="shell experience-layout">
			<div class="experience-intro">
				<p class="section-label">A simple rhythm</p>
				<h2 id="experience-heading">Read slowly.<br />Leave with more.</h2>
				<p>A path through Scripture with space to pause, reflect, and ask why.</p>
			</div>
			<div class="experience-steps">
				<article>
					<div class="step-icon"><BookOpen size={22} /></div>
					<div>
						<h3>Let the words come first.</h3>
						<p>
							Move through each chapter, verse by verse. The Bible text stays exactly as written in
							the selected translation.
						</p>
						<span class="feature-note">Try the complete first chapter</span>
					</div>
				</article>
				<article>
					<div class="step-icon"><Headphones size={22} /></div>
					<div>
						<h3>Read it. Or hear it.</h3>
						<p>
							Follow on screen or listen with your device’s standard voice. Your place is saved as
							you go, so you can return when you’re ready.
						</p>
						<span class="feature-note">Reading and audio available now</span>
					</div>
				</article>
				<article>
					<div class="step-icon"><Bookmark size={22} /></div>
					<div>
						<h3>Make room for understanding.</h3>
						<p>
							Finish Genesis 1 with a short overview, clearly separated from Scripture. Read it at
							your own pace or have the summary spoken to you.
						</p>
						<span class="feature-note"> Written and spoken chapter overview </span>
					</div>
				</article>
			</div>
		</div>
	</section>

	<ReadingJourney />

	<section class="questions-section shell" aria-labelledby="questions-heading">
		<div>
			<p class="section-label">Before you begin</p>
			<h2 id="questions-heading">A few things<br />worth knowing.</h2>
		</div>
		<div class="faq-list">
			<Details>
				<Summary>Which Bible will I be reading?</Summary>
				<p>
					The first chapter uses the World English Bible, a public-domain English translation. The
					translation is always named beside the text. More translation options can be added as the
					reader grows.
				</p>
			</Details>
			<Details>
				<Summary>How is my progress saved?</Summary>
				<p>
					Your current verse and completed chapters are kept in this browser using local storage.
					There’s no account and no automatic sync between devices. Clearing your browser’s site
					data clears your place.
				</p>
			</Details>
			<Details>
				<Summary>Can I listen with the screen locked?</Summary>
				<p>
					Standard device speech works best with the app open. For background listening, select the
					bundled chapter-and-summary recording. It is hosted with this site and needs no AI
					account. Playback behavior can vary with your device and interruptions.
				</p>
			</Details>
			<Details>
				<Summary>Is the entire Bible available yet?</Summary>
				<p>
					This first release includes Genesis 1 and its chapter overview. The full journey will
					follow the Bible in order, from Genesis to Revelation. The remaining chapters are the next
					stage.
				</p>
			</Details>
		</div>
	</section>
</main>
<SiteFooter />
