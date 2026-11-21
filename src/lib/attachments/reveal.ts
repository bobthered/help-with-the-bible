import type { Attachment } from 'svelte/attachments';

/** One root attachment discovers semantic blocks, including those added by navigation. */
export const revealOnScroll: Attachment<HTMLElement> = (root) => {
	if (!('IntersectionObserver' in window) || !('animate' in Element.prototype)) return;
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');
	const pending = new Set<HTMLElement>();
	const seen = new WeakSet<Element>();
	const animations = new Map<HTMLElement, Animation>();
	const queued = new Set<HTMLElement>();
	let frame = 0;
	let endFrame = 0;
	let revealFrame = 0;
	const selector =
		'header.site-header, footer.site-footer, main > section:not(.hero), main .hero-copy > *, main .hero-reading, main .experience-steps > article, main .faq-list > details, main .journey-card, main .chapter-summary, main .verse-sheet, main .study-panel, main .audio-download-panel, main .install-platforms > section';
	function reveal(element: HTMLElement, animate = true, delay = 0) {
		queued.delete(element);
		pending.delete(element);
		delete element.dataset.revealPending;
		observer.unobserve(element);
		animations.get(element)?.cancel();
		animations.delete(element);
		if (animate && !reduced.matches) {
			const animation = element.animate(
				[
					{ opacity: 0, transform: 'translateY(20px)' },
					{ opacity: 1, transform: 'translateY(0)' }
				],
				{ duration: 760, delay, fill: 'backwards', easing: 'cubic-bezier(.2,.65,.3,1)' }
			);
			animations.set(element, animation);
			void animation.finished
				.catch(() => {})
				.finally(() => {
					if (animations.get(element) === animation) animations.delete(element);
				});
		}
	}
	function queueReveal(element: HTMLElement) {
		if (!pending.has(element)) return;
		queued.add(element);
		if (revealFrame) return;
		// Give newly discovered content a painted starting state before its entrance.
		revealFrame = requestAnimationFrame(() => {
			revealFrame = requestAnimationFrame(() => {
				revealFrame = 0;
				let index = 0;
				// DOM order keeps simultaneous observer entries in a predictable sequence.
				for (const element of root.querySelectorAll<HTMLElement>(selector)) {
					if (queued.has(element)) reveal(element, true, 120 + Math.min(index++, 5) * 110);
				}
			});
		});
	}
	function createObserver() {
		// Use viewport-height pixels: percentage root margins are based on root width.
		return new IntersectionObserver(
			(entries) => {
				for (const entry of entries)
					if (entry.isIntersecting) queueReveal(entry.target as HTMLElement);
			},
			{ threshold: 0, rootMargin: `0px 0px -${Math.round(innerHeight * 0.2)}px 0px` }
		);
	}
	let observer = createObserver();
	function revealAtPageEnd() {
		endFrame = 0;
		const height = (document.scrollingElement ?? document.documentElement).scrollHeight;
		if (window.scrollY + innerHeight < height - 2) return;
		// The last blocks may never reach the inset trigger line. Reveal only visible ones.
		for (const element of pending) {
			const rect = element.getBoundingClientRect();
			if (rect.top < innerHeight && rect.bottom > 0) queueReveal(element);
		}
	}
	function scheduleEndCheck() {
		if (!endFrame) endFrame = requestAnimationFrame(revealAtPageEnd);
	}
	function resize() {
		observer.disconnect();
		observer = createObserver();
		for (const element of pending) observer.observe(element);
		scheduleEndCheck();
	}
	function scan() {
		frame = 0;
		for (const element of root.querySelectorAll<HTMLElement>(selector)) {
			if (seen.has(element)) continue;
			seen.add(element);
			// Keep focused content visible and respect motion preferences on every scan.
			if (reduced.matches || element.contains(document.activeElement)) continue;
			const rect = element.getBoundingClientRect();
			if (rect.bottom <= 0) continue;
			element.dataset.revealPending = 'true';
			pending.add(element);
			// Include initial content in the same staggered entrance batch.
			if (rect.top < innerHeight) {
				queueReveal(element);
				continue;
			}
			observer.observe(element);
		}
		for (const element of pending) if (!root.contains(element)) reveal(element, false);
		scheduleEndCheck();
	}
	const mutation = new MutationObserver(() => {
		if (!frame) frame = requestAnimationFrame(scan);
	});
	const focus = (event: FocusEvent) => {
		const target = event.target as HTMLElement;
		for (const element of pending) if (element.contains(target)) reveal(element, false);
		for (const element of animations.keys()) if (element.contains(target)) reveal(element, false);
	};
	const preference = () => {
		if (reduced.matches) {
			for (const element of pending) reveal(element, false);
			for (const animation of animations.values()) animation.cancel();
			animations.clear();
		}
	};
	scan();
	mutation.observe(root, { subtree: true, childList: true });
	root.addEventListener('focusin', focus);
	window.addEventListener('scroll', scheduleEndCheck, { passive: true });
	window.addEventListener('resize', resize);
	reduced.addEventListener('change', preference);
	return () => {
		cancelAnimationFrame(frame);
		cancelAnimationFrame(endFrame);
		cancelAnimationFrame(revealFrame);
		mutation.disconnect();
		observer.disconnect();
		root.removeEventListener('focusin', focus);
		window.removeEventListener('scroll', scheduleEndCheck);
		window.removeEventListener('resize', resize);
		reduced.removeEventListener('change', preference);
		for (const element of pending) delete element.dataset.revealPending;
		queued.clear();
		for (const animation of animations.values()) animation.cancel();
	};
};
