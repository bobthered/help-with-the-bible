import type { Attachment } from 'svelte/attachments';

export const preventPageZoom: Attachment<HTMLElement> = (root) => {
	const gesture = (event: Event) => event.preventDefault();
	const touch = (event: TouchEvent) => {
		if (event.touches.length > 1) event.preventDefault();
	};
	const wheel = (event: WheelEvent) => {
		if (event.ctrlKey) event.preventDefault();
	};
	root.addEventListener('gesturestart', gesture, { passive: false });
	root.addEventListener('gesturechange', gesture, { passive: false });
	root.addEventListener('touchmove', touch, { passive: false });
	root.addEventListener('wheel', wheel, { passive: false });
	return () => {
		root.removeEventListener('gesturestart', gesture);
		root.removeEventListener('gesturechange', gesture);
		root.removeEventListener('touchmove', touch);
		root.removeEventListener('wheel', wheel);
	};
};
