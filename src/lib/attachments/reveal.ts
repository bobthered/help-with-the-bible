import type { Attachment } from 'svelte/attachments';

/** One root attachment discovers semantic blocks, including those added by navigation. */
export const revealOnScroll: Attachment<HTMLElement> = (root) => {
	if (!('IntersectionObserver' in window) || !('animate' in Element.prototype)) return;
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');
	const pending = new Set<HTMLElement>();
	const seen = new WeakSet<Element>();
	const animations = new Set<Animation>();
	let frame = 0;
	const selector =
		'header.site-header, footer.site-footer, main > section, main .experience-steps > article, main .faq-list > details, main .journey-card, main .chapter-summary, main .verse-sheet, main .install-platforms > section';
	function reveal(element: HTMLElement, animate = true) {
		pending.delete(element);
		delete element.dataset.revealPending;
		observer.unobserve(element);
		if (animate && !reduced.matches) {
			const animation = element.animate(
				[
					{ opacity: 0, transform: 'translateY(12px)' },
					{ opacity: 1, transform: 'translateY(0)' }
				],
				{ duration: 420, easing: 'cubic-bezier(.2,.65,.3,1)' }
			);
			animations.add(animation);
			void animation.finished.catch(() => {}).finally(() => animations.delete(animation));
		}
	}
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) if (entry.isIntersecting) reveal(entry.target as HTMLElement);
		},
		{ threshold: 0, rootMargin: '0px 0px -24px 0px' }
	);
	function scan() {
		frame = 0;
		for (const element of root.querySelectorAll<HTMLElement>(selector)) {
			if (seen.has(element)) continue;
			seen.add(element);
			// Never hide the initial viewport or a block containing keyboard focus.
			if (
				reduced.matches ||
				element.contains(document.activeElement) ||
				element.getBoundingClientRect().top < innerHeight
			)
				continue;
			element.dataset.revealPending = 'true';
			pending.add(element);
			observer.observe(element);
		}
		for (const element of pending) if (!root.contains(element)) reveal(element, false);
	}
	const mutation = new MutationObserver(() => {
		if (!frame) frame = requestAnimationFrame(scan);
	});
	const focus = (event: FocusEvent) => {
		const target = event.target as HTMLElement;
		for (const element of pending) if (element.contains(target)) reveal(element, false);
	};
	const preference = () => {
		if (reduced.matches) {
			for (const element of pending) reveal(element, false);
			for (const animation of animations) animation.cancel();
		}
	};
	scan();
	mutation.observe(root, { subtree: true, childList: true });
	root.addEventListener('focusin', focus);
	reduced.addEventListener('change', preference);
	return () => {
		cancelAnimationFrame(frame);
		mutation.disconnect();
		observer.disconnect();
		root.removeEventListener('focusin', focus);
		reduced.removeEventListener('change', preference);
		for (const element of pending) delete element.dataset.revealPending;
		for (const animation of animations) animation.cancel();
	};
};
