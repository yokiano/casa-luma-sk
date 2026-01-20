<script lang="ts">
	import type { PageData } from './$types';

	type Props = { data: PageData };
	let { data }: Props = $props();

	const updatedAt = new Date();
</script>

<div class="mx-auto max-w-6xl px-0 print:max-w-none print:px-0">
	<header class="mb-6 border-b border-[#d3c5b8] pb-4 print:mb-4 print:border-black/20">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<p class="text-xs uppercase tracking-[0.18em] text-[#7a6550]/80 print:text-black/70">
					Tools · Onboarding · {data.role}
				</p>
				<h1 class="mt-2 text-2xl font-semibold tracking-tight text-[#2c2925] print:text-black">
					Kitchen onboarding — Menu names (EN/TH)
				</h1>
				<p class="mt-2 max-w-3xl text-sm leading-relaxed text-[#7a6550]/85 print:text-black/70">
					Reference sheet for dish names + translations. Grouped by category. Food, Desserts, and Kids only.
				</p>
			</div>
			<div class="text-right text-xs text-[#7a6550]/70 print:text-black/60">
				<div>Total: {data.totalItems}</div>
				<div class="tabular-nums">Generated: {updatedAt.toLocaleString()}</div>
			</div>
		</div>
	</header>

	<div class="space-y-8 print:space-y-6">
		{#each data.groups as group (group.category)}
			<section class="break-inside-avoid-page">
				<h2
					class="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#7a6550] print:text-black/80"
				>
					<span class="h-[1px] w-6 bg-[#d3c5b8] print:bg-black/30"></span>
					{group.category}
				</h2>

				<ul class="divide-y divide-[#e6ddd4] border border-[#e6ddd4] bg-white/60 print:border-black/20 print:bg-white">
					{#each group.items as item (item.id)}
						<li class="px-4 py-3 print:px-3 print:py-2">
							<div class="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-6">
								<div class="min-w-0">
									<div class="flex items-start justify-between gap-3">
										<p class="truncate text-sm font-semibold text-[#2c2925] print:text-black">
											{item.name}
										</p>
										<p class="shrink-0 text-[11px] uppercase tracking-[0.12em] text-[#7a6550]/60 print:text-black/50">
											{item.grandCategory}
										</p>
									</div>
									{#if item.description?.trim()}
										<p class="mt-1 text-xs leading-snug text-[#7a6550]/85 print:text-black/70">
											{item.description}
										</p>
									{/if}
								</div>

								<div class="min-w-0">
									<p class="truncate text-sm font-semibold text-[#2c2925] print:text-black">
										{item.thaiName?.trim() || '—'}
									</p>
									{#if item.thaiDescription?.trim()}
										<p class="mt-1 text-xs leading-snug text-[#7a6550]/85 print:text-black/70">
											{item.thaiDescription}
										</p>
									{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/each}

		{#if data.modifiers?.length}
			<section class="break-inside-avoid-page pt-2">
				<h2
					class="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#7a6550] print:text-black/80"
				>
					<span class="h-[1px] w-6 bg-[#d3c5b8] print:bg-black/30"></span>
					Modifiers
				</h2>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
					{#each data.modifiers as mod (mod.id)}
						<div class="border border-[#e6ddd4] bg-white/60 px-4 py-3 print:border-black/20 print:bg-white">
							<p class="text-sm font-semibold text-[#2c2925] print:text-black">{mod.name}</p>

							{#if mod.options?.length}
								<ul class="mt-2 space-y-1">
									{#each mod.options as opt (opt.name)}
										<li class="flex items-baseline justify-between gap-3 text-xs text-[#7a6550]/85 print:text-black/70">
											<span class="min-w-0">
												<span class="font-medium text-[#2c2925] print:text-black">{opt.name}</span>
												<span class="mx-2 text-[#7a6550]/50 print:text-black/40">—</span>
												<span>{opt.thaiName?.trim() || '—'}</span>
											</span>
											{#if opt.price}
												<span class="shrink-0 tabular-nums text-[#7a6550]/70 print:text-black/60">
													+{opt.price}
												</span>
											{/if}
										</li>
									{/each}
								</ul>
							{:else}
								<p class="mt-2 text-xs text-[#7a6550]/70 print:text-black/60">No options.</p>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>

