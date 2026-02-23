<script lang="ts">
	type Link = { label: string; href: string };

	let {
		open = false,
		links = [],
		onClose
	}: {
		open?: boolean;
		links?: readonly Link[];
		onClose: () => void;
	} = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Mobile menu">
		<button
			type="button"
			class="absolute inset-0 bg-[#2D3A3A]/35 backdrop-blur-[1px]"
			onclick={onClose}
			aria-label="Close mobile menu"
		></button>

		<div class="absolute right-0 top-0 h-full w-[84%] max-w-sm bg-[#F9F7F2] px-6 pb-8 pt-24 shadow-2xl">
			<nav class="flex flex-col gap-1">
				{#each links as link}
					<a
						href={link.href}
						class="rounded-lg px-4 py-3 text-sm tracking-[0.2em] uppercase text-[#2D3A3A] transition-colors hover:bg-[#EDE6D7] hover:text-[#E07A5F]"
						onclick={onClose}
					>
						{link.label}
					</a>
				{/each}
			</nav>

			<div class="mt-12 border-t border-[#2D3A3A]/10 pt-6 text-[11px] uppercase tracking-[0.18em] text-[#2D3A3A]/60">
				A space to play, eat and celebrate
			</div>
		</div>
	</div>
{/if}
