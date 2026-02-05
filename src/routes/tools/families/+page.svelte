<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { searchFamilies } from '$lib/tools/families/families.remote';
	import type { FamilySummary } from '$lib/tools/families/families.server';
	import { Search, Users, Phone, Mail, Hash, User, Baby, Heart, Info, Loader2 } from 'lucide-svelte';

	let searchValue = $state('');
	let families = $state<FamilySummary[]>([]);
	let isLoading = $state(false);
	let hasSearched = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	const runSearch = async (query: string) => {
		if (!query) {
			families = [];
			hasSearched = false;
			return;
		}

		isLoading = true;
		try {
			families = await searchFamilies({ search: query });
			hasSearched = true;
		} catch (error) {
			console.error('families: search failed', error);
			toast.error('Search failed. Please try again.');
		} finally {
			isLoading = false;
		}
	};

	const handleInput = (event: Event) => {
		const target = event.target as HTMLInputElement;
		searchValue = target.value;
		
		if (searchTimeout) clearTimeout(searchTimeout);
		
		if (searchValue.trim().length >= 2) {
			families = [];
			hasSearched = false;
			isLoading = true;
			searchTimeout = setTimeout(() => {
				runSearch(searchValue.trim());
			}, 400);
		} else if (searchValue.trim().length === 0) {
			families = [];
			hasSearched = false;
		}
	};

	const getMemberIcon = (type: string | null) => {
		if (type?.toLowerCase().includes('child') || type?.toLowerCase().includes('kid')) return Baby;
		if (type?.toLowerCase().includes('parent') || type?.toLowerCase().includes('mother') || type?.toLowerCase().includes('father')) return Heart;
		return User;
	};
</script>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 border-b border-[#e3d7cc] pb-6">
		<h1 class="text-3xl font-semibold tracking-tight text-[#5c4a3d]">Families Directory</h1>
		<p class="text-sm text-[#7a6550]/80">
			Search for families and members by name, phone, email, or customer code.
		</p>
	</div>

	<!-- Search Bar -->
	<div class="relative max-w-2xl">
		<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#7a6550]/50">
			<Search size={20} />
		</div>
		<input
			type="text"
			placeholder="Search names, phones, emails, or codes..."
			class="h-14 w-full rounded-2xl border-2 border-[#e3d7cc] bg-white pl-12 pr-4 text-lg transition-all focus:border-[#7a6550] focus:outline-none focus:ring-4 focus:ring-[#7a6550]/5 shadow-sm"
			value={searchValue}
			oninput={handleInput}
		/>
		{#if isLoading}
			<div class="absolute inset-y-0 right-0 flex items-center pr-4">
				<Loader2 class="animate-spin text-[#7a6550]/40" size={20} />
			</div>
		{/if}
	</div>

	<!-- Results -->
	<div class="space-y-6">
		{#if isLoading && families.length === 0}
			<div class="grid gap-6 sm:grid-cols-2">
				{#each Array(4) as _}
					<div class="h-48 animate-pulse rounded-3xl bg-[#e3d7cc]/20"></div>
				{/each}
			</div>
		{:else if hasSearched && families.length === 0}
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<div class="mb-4 rounded-full bg-[#e3d7cc]/30 p-6 text-[#7a6550]/40">
					<Info size={40} />
				</div>
				<h3 class="text-xl font-medium text-[#5c4a3d]">No families found</h3>
				<p class="mt-2 text-[#7a6550]/70">Try searching for something else</p>
			</div>
		{:else if families.length > 0}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each families as family (family.id)}
					<div class="group flex flex-col rounded-3xl border border-[#e3d7cc] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
						<!-- Family Header -->
						<div class="p-6 pb-4">
							<div class="mb-2 flex items-start justify-between gap-2">
								<h2 class="text-xl font-semibold text-[#2c2925] line-clamp-1">{family.familyName}</h2>
								{#if family.customerCode}
									<span class="shrink-0 rounded-lg bg-[#f0e6db] px-2 py-1 text-xs font-bold tracking-tight text-[#7a6550]">
										{family.customerCode}
									</span>
								{/if}
							</div>
							
							<div class="flex flex-wrap gap-y-2 gap-x-4 text-sm text-[#7a6550]">
								{#if family.mainPhone}
									<div class="flex items-center gap-1.5">
										<Phone size={14} />
										<span>{family.mainPhone}</span>
									</div>
								{/if}
								{#if family.mainEmail}
									<div class="flex items-center gap-1.5">
										<Mail size={14} />
										<span class="line-clamp-1">{family.mainEmail}</span>
									</div>
								{/if}
							</div>
						</div>

						<!-- Members Section -->
						<div class="mt-auto border-t border-[#f0e6db] bg-[#faf6f2]/50 p-6 pt-4">
							<div class="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7a6550]/40">
								<Users size={14} />
								<span>Family Members</span>
							</div>
							<div class="space-y-3">
								{#each family.members as member}
									{@const Icon = getMemberIcon(member.type)}
									<div class="flex items-start gap-3">
										<div class="mt-0.5 rounded-full bg-white p-1.5 text-[#7a6550]/60 shadow-sm">
											<Icon size={14} />
										</div>
										<div class="min-w-0 flex-1">
											<p class="text-sm font-medium text-[#2c2925]">{member.name}</p>
											{#if member.type}
												<p class="text-[10px] uppercase tracking-wide text-[#7a6550]/60">{member.type}</p>
											{/if}
										</div>
									</div>
								{:else}
									<p class="text-xs italic text-[#7a6550]/50">No members listed</p>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else if !hasSearched}
			<div class="flex flex-col items-center justify-center py-20 text-center opacity-40">
				<Users size={64} class="mb-4 text-[#7a6550]" />
				<h3 class="text-xl font-medium text-[#5c4a3d]">Search to see families</h3>
				<p class="mt-2 text-[#7a6550]">Start typing in the box above</p>
			</div>
		{/if}
	</div>
</div>
