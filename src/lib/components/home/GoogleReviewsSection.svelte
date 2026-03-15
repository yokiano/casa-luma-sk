<script lang="ts">
	import Reveal from '$lib/components/animations/Reveal.svelte';
	import { MapPinned, Star } from 'lucide-svelte';
	import {
		GOOGLE_REVIEW_HIGHLIGHTS,
		type GoogleReviewHighlight
	} from '$lib/constants';

	interface Props {
		reviews?: GoogleReviewHighlight[];
	}

	let { reviews = GOOGLE_REVIEW_HIGHLIGHTS }: Props = $props();

	const stars = [0, 1, 2, 3, 4];
	const TRUNCATE_THRESHOLD = 180;

	function isLong(quote: string) {
		return quote.length > TRUNCATE_THRESHOLD;
	}

	function getDisplayQuote(review: GoogleReviewHighlight) {
		if (!isLong(review.quote)) return review.quote;
		return review.quote.slice(0, TRUNCATE_THRESHOLD).trimEnd() + '…';
	}
</script>

<section class="relative overflow-hidden bg-[#F9F7F2] px-6 py-24 sm:px-10 lg:px-20">
	<div class="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
		<div class="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#E07A5F]/5 blur-[120px]"></div>
		<div class="absolute -left-20 bottom-0 h-[30rem] w-[30rem] rounded-full bg-[#A8C3A0]/5 blur-[120px]"></div>
	</div>

	<div class="relative mx-auto w-full max-w-7xl">
		<div class="mb-16 text-center">
			<Reveal direction="up" amount={30}>
				<h2 class="font-heading text-4xl font-medium tracking-tight text-[#2D3A3A] sm:text-5xl">
					Loved by parents
				</h2>
			</Reveal>
			<Reveal direction="up" delay={150} amount={20}>
				<p class="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#2D3A3A]/50">
					Kind words from the families who spend their days at Casa Luma.
				</p>
			</Reveal>
		</div>

		<div class="columns-1 gap-6 sm:columns-2 lg:columns-3">
			{#each reviews as review, index (review.id)}
				<Reveal direction="up" delay={250 + index * 70} amount={30} class="mb-6 break-inside-avoid">
					<div class="group relative flex flex-col overflow-hidden rounded-[2.2rem] border border-[#2D3A3A]/8 bg-white p-6 transition-all duration-500 hover:border-[#E07A5F]/20 hover:shadow-[0_20px_40px_-12px_rgba(45,58,58,0.08)]">
						<!-- Decorative quote mark -->
						<div class="pointer-events-none absolute right-6 top-4 select-none font-heading text-[4rem] leading-none text-[#F4EEE7]">
							"
						</div>

						<!-- Stars -->
						<div class="mb-4 flex items-center gap-0.5 text-[#DFBC69]">
							{#each stars as star}
								<Star size={13} fill={star < review.rating ? 'currentColor' : 'none'} class="stroke-[#DFBC69]" />
							{/each}
						</div>

						<!-- Review text -->
						<blockquote class="relative z-10 flex-1 text-[0.92rem] leading-[1.6] font-light text-[#2D3A3A]/75">
							{getDisplayQuote(review)}
						</blockquote>

						{#if isLong(review.quote)}
							<a
								href={review.reviewUrl}
								target="_blank"
								rel="noreferrer"
								class="mt-2.5 inline-flex items-center gap-1.5 self-start text-[10px] font-medium uppercase tracking-[0.16em] text-[#E07A5F] hover:opacity-70 transition-opacity"
							>
								Read more on Google
							</a>
						{/if}

						<!-- Author + link -->
						<div class="mt-6 flex items-center justify-between border-t border-[#2D3A3A]/5 pt-5">
							<div class="flex items-center gap-2.5">
								<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4EEE7] font-heading text-xs font-semibold text-[#E07A5F] transition-all duration-500 group-hover:bg-[#E07A5F] group-hover:text-white">
									{review.author.charAt(0).toUpperCase()}
								</div>
								<span class="font-heading text-[0.95rem] font-medium text-[#2D3A3A]">
									{review.author}
								</span>
							</div>

							{#if review.reviewUrl}
								<a
									href={review.reviewUrl}
									target="_blank"
									rel="noreferrer"
									class="inline-flex items-center gap-2 rounded-full border border-[#2D3A3A]/5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#2D3A3A]/30 transition-all duration-300 hover:bg-[#F4EEE7] hover:text-[#E07A5F]"
								>
									<MapPinned size={11} />
									<span>Google</span>
								</a>
							{/if}
						</div>
					</div>
				</Reveal>
			{/each}
		</div>
	</div>
</section>
