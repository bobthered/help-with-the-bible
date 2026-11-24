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
		content="Find your way through all 66 books of the Bible, one verse at a time. Read or listen with your device voice and come back to your saved place."
	/>
</svelte:head>

<SiteHeader />
<main id="main">
	<section
		class="hero shell mx-auto grid w-[min(1200px,_calc(100%_-_96px))] grid-cols-[1.15fr_1fr] items-center gap-20 pt-22 pb-25 min-[1500px]:pt-27.5 min-[1500px]:pb-30 tablet:w-[calc(100%_-_64px)] tablet:gap-11.25 tablet:pt-16.25 tablet:pb-20 mobile:w-[calc(100%_-_40px)] mobile:grid-cols-[1fr] mobile:gap-13.75 mobile:pt-11.25 mobile:pb-16.25 [&_h1]:font-serif [&_h1]:text-[length:clamp(3.25rem,_4.8vw,_4.5rem)] [&_h1]:leading-[1.06] [&_h1]:font-normal [&_h1]:tracking-[-0.045em] tablet:[&_h1]:text-[3.5rem] mobile:[&_h1]:text-[length:clamp(3rem,_11vw,_4.5rem)] [&_h1_em]:font-normal [&_h1_em]:text-accent"
		aria-labelledby="hero-heading"
	>
		<div class="hero-copy">
			<p
				class="eyebrow mb-7 flex items-center gap-2.5 text-[0.8125rem] font-medium text-accent mobile:mb-6 mobile:text-xs [&_>_span]:h-px [&_>_span]:w-5 [&_>_span]:bg-accent"
			>
				<span></span>A quieter way to understand Scripture
			</p>
			<h1 id="hero-heading">One chapter.<br />A little more<br /><em>understanding.</em></h1>
			<p
				class="hero-description mt-7 max-w-106.25 text-[1.0625rem] leading-[1.85] text-muted mobile:text-base"
			>
				You don’t have to understand the whole Bible today. Begin at the beginning. Read a verse,
				take your time, and reflect on each chapter.
			</p>
			<div class="hero-actions mt-8 flex flex-wrap items-center gap-6.5">
				<A variants={['primary']} href="/read" class="button-primary">
					<BookOpen size={18} />Begin with Genesis
				</A><A variants={['textLink']} href="#experience">How it works</A>
			</div>
			<p
				class="hero-note mt-4.75 flex items-center gap-1.75 text-xs text-muted [&_>_span]:px-1.25 [&_svg]:text-accent"
			>
				<Check size={14} />No account needed<span>·</span>Your place, remembered
			</p>
		</div>
		<div
			class="hero-reading pt-2.5 pr-0 pb-0 pl-2.25 mobile:w-[calc(100%_-_9px)] mobile:max-w-120 mobile:pl-0"
		>
			<ScripturePreview />
			<div
				class="preview-caption mt-6.25 flex items-center justify-center gap-3 font-serif text-sm text-muted italic"
			>
				<span class="caption-rule h-px w-6 bg-primary-500"></span>The first words. Your own pace.
			</div>
		</div>
	</section>

	<section
		class="experience-section border-y border-y-divider bg-surface-raised"
		id="experience"
		aria-labelledby="experience-heading"
	>
		<div
			class="shell experience-layout mx-auto grid w-[min(1200px,_calc(100%_-_96px))] grid-cols-[1fr_1.3fr] gap-27.5 py-18.75 tablet:w-[calc(100%_-_64px)] tablet:gap-13.75 mobile:w-[calc(100%_-_40px)] mobile:grid-cols-[1fr] mobile:gap-8.75 mobile:py-13.75"
		>
			<div
				class="experience-intro [&_>_p:last-child]:mt-5.5 [&_>_p:last-child]:max-w-75 [&_>_p:last-child]:text-[0.9375rem] [&_>_p:last-child]:leading-[1.8] [&_>_p:last-child]:text-muted mobile:[&_>_p:last-child]:max-w-full [&_h2]:mt-5 [&_h2]:font-serif [&_h2]:text-[length:clamp(2rem,_3vw,_2.75rem)] [&_h2]:leading-[1.18] [&_h2]:font-normal [&_h2]:tracking-[-0.03em] mobile:[&_h2_br]:hidden"
			>
				<p class="section-label text-[0.8125rem] font-medium text-accent">A simple rhythm</p>
				<h2 id="experience-heading">Read slowly.<br />Leave with more.</h2>
				<p>A path through Scripture with space to pause, reflect, and ask why.</p>
			</div>
			<div
				class="experience-steps [&_article]:flex [&_article]:gap-5.5 [&_article]:border-b [&_article]:border-b-divider [&_article]:py-6 [&_article:first-child]:pt-0 [&_article:last-child]:border-b-0 [&_article:last-child]:pb-0 [&_h3]:font-serif [&_h3]:text-[length:1.3125rem] [&_h3]:font-normal [&_p]:mt-2.25 [&_p]:text-sm [&_p]:leading-[1.8] [&_p]:text-muted"
			>
				<article>
					<div class="step-icon mt-0.75 text-accent"><BookOpen size={22} /></div>
					<div>
						<h3>Let the words come first.</h3>
						<p>
							Move through each chapter, verse by verse. The Bible text stays exactly as written in
							the selected translation.
						</p>
						<span class="feature-note mt-3 block text-xs text-accent">
							All 66 books, 1,189 chapters
						</span>
					</div>
				</article>
				<article>
					<div class="step-icon mt-0.75 text-accent"><Headphones size={22} /></div>
					<div>
						<h3>Read it. Or hear it.</h3>
						<p>
							Follow on screen or listen with your device’s standard voice. Your place is saved as
							you go, so you can return when you’re ready.
						</p>
						<span class="feature-note mt-3 block text-xs text-accent">
							Reading and audio available now
						</span>
					</div>
				</article>
				<article>
					<div class="step-icon mt-0.75 text-accent"><Bookmark size={22} /></div>
					<div>
						<h3>Make room for understanding.</h3>
						<p>
							Finish each chapter with an attributed outline, book context, and passages to revisit,
							clearly separated from Scripture. Read the overview or hear it spoken.
						</p>
						<span class="feature-note mt-3 block text-xs text-accent">
							Written and spoken chapter overview
						</span>
					</div>
				</article>
			</div>
		</div>
	</section>

	<ReadingJourney />

	<section
		class="questions-section shell mx-auto grid w-[min(1200px,_calc(100%_-_96px))] grid-cols-[1fr_1.3fr] gap-27.5 border-t border-t-divider pt-16.25 pb-21.25 tablet:w-[calc(100%_-_64px)] tablet:gap-13.75 mobile:w-[calc(100%_-_40px)] mobile:grid-cols-[1fr] mobile:gap-8.75 mobile:py-13.75 [&_h2]:mt-5 [&_h2]:font-serif [&_h2]:text-[length:2.25rem] [&_h2]:leading-[1.18] [&_h2]:font-normal [&_h2]:tracking-[-0.03em] mobile:[&_h2_br]:hidden"
		aria-labelledby="questions-heading"
	>
		<div>
			<p class="section-label text-[0.8125rem] font-medium text-accent">Before you begin</p>
			<h2 id="questions-heading">A few things<br />worth knowing.</h2>
		</div>
		<div
			class="faq-list [&_details]:border-b [&_details]:border-b-divider [&_details]:py-4.5 [&_details_p]:mt-3.5 [&_details_p]:text-sm [&_details_p]:leading-[1.8] [&_details_p]:text-muted [&_details:first-child]:pt-0 [&_summary]:ml-4.5 [&_summary]:cursor-pointer [&_summary]:list-outside [&_summary]:pl-1.75 [&_summary]:text-[0.9375rem] [&_summary::marker]:text-xs [&_summary::marker]:text-accent"
		>
			<Details>
				<Summary>Which Bible will I be reading?</Summary>
				<p>
					All 66 books use the World English Bible, a public-domain English translation. The
					translation is always named beside the text. This edition includes the Old and New
					Testaments, without the Deuterocanon/Apocrypha.
				</p>
			</Details>
			<Details>
				<Summary>How is my progress saved?</Summary>
				<p>
					Your current verse and completed chapters are kept in this browser using local storage.
					There’s no account and no automatic sync between devices. Clearing your browser’s site
					data clears your place. Export a backup from the reader to keep your progress, bookmarks,
					highlights, notes, and preferences or move them to another device.
				</p>
			</Details>
			<Details>
				<Summary>Can I listen with the screen locked?</Summary>
				<p>
					Standard device speech works best with the app open. For background listening, select the
					recorded chapter-and-overview option, available for every chapter. Download a track in the
					reader before going offline. Playback behavior can vary with your device and
					interruptions.
				</p>
			</Details>
			<Details>
				<Summary>Is the entire Bible available yet?</Summary>
				<p>
					Yes. Read or listen with the standard device voice through all 1,189 chapters, from
					Genesis to Revelation. Choose any book and chapter, read a whole chapter or one verse at a
					time, search Scripture, and continue in order. Every chapter includes an overview and an
					optional recording with spoken commentary clearly separated from Scripture.
				</p>
			</Details>
		</div>
	</section>
</main>
<SiteFooter />
