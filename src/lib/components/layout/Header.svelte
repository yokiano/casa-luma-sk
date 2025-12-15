<script lang="ts">
	import { NAV_LINKS, BUSINESS_INFO } from '$lib/constants';
	import { page } from '$app/stores';

	let mobileMenuOpen = $state(false);
</script>

<header class=" bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
	<nav class="container mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo -->
			<a href="/" class="flex items-center gap-2 text-xl font-semibold text-foreground hover:text-primary transition-colors">
				{BUSINESS_INFO.name}
			</a>

			<!-- Desktop Navigation -->
			<div class="hidden md:flex items-center gap-6">
				{#each NAV_LINKS as link}
					<a
						href={link.href}
						class="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
					>
						{link.label}
					</a>
				{/each}
			</div>

			<!-- Mobile Menu Button -->
			<button
				class="md:hidden p-2 text-foreground hover:text-primary"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				aria-label="Toggle menu"
			>
				<svg
					class="w-6 h-6"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					{#if mobileMenuOpen}
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					{:else}
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					{/if}
				</svg>
			</button>
		</div>

		<!-- Mobile Navigation -->
		{#if mobileMenuOpen}
			<div class="md:hidden py-4 border-t border-border">
				{#each NAV_LINKS as link}
					<a
						href={link.href}
						class="block py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
						onclick={() => (mobileMenuOpen = false)}
					>
						{link.label}
					</a>
				{/each}
			</div>
		{/if}
	</nav>
</header>

