<script lang="ts">
	import { page } from '$app/state';
	import { BUSINESS_INFO } from '$lib/constants';

	const isNotFound = $derived(page.status === 404);
	const eyebrow = $derived(isNotFound ? '404 · Tiny detour' : `${page.status} · Something wandered off`);
	const title = $derived(isNotFound ? '404 — this page is still finding its way.' : 'A little pause in the play.');
	const message = $derived(
		isNotFound
			? 'The page you were looking for is not in the playroom, garden, or café. Let’s guide you somewhere warm and useful.'
			: page.error?.message || 'Something unexpected happened. We can still help you get back to Casa Luma.'
	);
</script>

<svelte:head>
	<title>{isNotFound ? 'Page not found' : 'Error'} · {BUSINESS_INFO.name}</title>
	<meta
		name="description"
		content={isNotFound
			? 'This Casa Luma page could not be found. Return home, view birthdays, or contact us.'
			: 'Casa Luma error page.'}
	/>
</svelte:head>

<section class="relative isolate min-h-[70vh] overflow-hidden bg-background px-6 py-20 text-foreground sm:px-10 lg:px-20">
	<div class="pointer-events-none absolute inset-0 -z-10">
		<div class="absolute left-[8%] top-14 h-44 w-44 rounded-full bg-secondary/25 blur-3xl"></div>
		<div class="absolute right-[10%] top-28 h-64 w-64 rounded-full bg-accent/15 blur-3xl"></div>
		<div class="absolute bottom-8 left-1/2 h-56 w-80 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"></div>
	</div>

	<div class="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
		<div>
			<p class="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">{eyebrow}</p>
			<h1 class="max-w-3xl text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
				{title}
			</h1>
			<p class="mt-7 max-w-2xl text-lg leading-relaxed text-foreground/72 sm:text-xl">
				{message}
			</p>

			<div class="mt-10 flex flex-col gap-3 sm:flex-row">
				<a
					href="/"
					class="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground shadow-[0_18px_40px_rgb(223_188_105_/_0.35)] transition hover:-translate-y-0.5 hover:bg-primary/90"
				>
					Back home
				</a>
				<a
					href="/contact"
					class="inline-flex items-center justify-center rounded-full border border-foreground/15 bg-white/55 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent"
				>
					Ask us
				</a>
			</div>
		</div>

		<aside class="relative mx-auto aspect-square w-full max-w-sm" aria-label="Casa Luma decorative lost path illustration">
			<div class="absolute inset-0 rounded-[3rem] bg-white/65 shadow-[0_24px_90px_rgb(45_58_58_/_0.12)]"></div>
			<div class="absolute left-8 top-8 h-24 w-24 rounded-full bg-secondary/70"></div>
			<div class="absolute right-10 top-14 h-20 w-20 rotate-12 rounded-2xl bg-primary/85"></div>
			<div class="shape-triangle-up absolute bottom-12 left-10 h-28 w-28 bg-accent/85"></div>
			<div class="absolute bottom-16 right-12 h-28 w-28 rounded-full border-[18px] border-foreground/12"></div>
			<div class="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background text-4xl shadow-[0_18px_60px_rgb(45_58_58_/_0.16)]">
				<span aria-hidden="true">?</span>
			</div>
		</aside>
	</div>
</section>
