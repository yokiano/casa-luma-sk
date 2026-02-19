import { scrollY, innerHeight } from 'svelte/reactivity/window';

export interface InviewOptions {
	threshold?: number;
	rootMargin?: string;
	once?: boolean;
	onEnter?: () => void;
	onLeave?: () => void;
}

/**
 * Svelte action that fires callbacks when the element enters/leaves the viewport.
 * Usage: <div use:inview={{ onEnter: () => visible = true }}>
 */
export function inview(node: HTMLElement, opts: InviewOptions = {}) {
	const { threshold = 0.15, rootMargin = '0px', once = true, onEnter, onLeave } = opts;

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					onEnter?.();
					if (once) observer.disconnect();
				} else {
					onLeave?.();
				}
			});
		},
		{ threshold, rootMargin }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}

/**
 * Computes a 0→1 scroll progress value for an element as it passes through the viewport.
 * Pass the element's getBoundingClientRect at call time.
 * Returns 0 before element enters, 1 after it has fully passed through.
 */
export function getScrollProgress(rect: DOMRect, viewportHeight: number): number {
	const elementTop = rect.top;
	const elementHeight = rect.height;
	const total = viewportHeight + elementHeight;
	const passed = viewportHeight - elementTop;
	return Math.min(1, Math.max(0, passed / total));
}

/**
 * Returns a reactive scroll progress (0→1) for a given element ref.
 * Works best when used with $derived inside a component.
 * Requires scrollY from svelte/reactivity/window to be imported at the call site.
 */
export function deriveScrollProgress(
	getElement: () => HTMLElement | undefined,
	getViewportHeight: () => number
): () => number {
	return () => {
		const el = getElement();
		if (!el) return 0;
		const rect = el.getBoundingClientRect();
		return getScrollProgress(rect, getViewportHeight());
	};
}
