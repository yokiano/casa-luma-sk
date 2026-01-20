<script lang="ts">
	import type { PageData } from './$types';
	import { toast } from 'svelte-sonner';
	import { getMemberships, deleteMembership } from '$lib/memberships.remote';
	import MembershipDialog from './MembershipDialog.svelte';
	import { ChevronDown, ChevronUp, MoreVertical, Pencil, Trash2 } from 'lucide-svelte';

	type FamilySummary = {
		id: string;
		familyName: string;
		customerCode: string | null;
		mainPhone: string | null;
	};

	type MembershipItem = {
		id: string;
		name: string;
		type: 'Weekly' | 'Monthly' | null;
		numberOfKids: number | null;
		startDate: string | null;
		endDate: string | null;
		status: string | null;
		notes: string | null;
		createdTime: string;
		family: FamilySummary | null;
	};

	let { data }: { data: PageData } = $props();

	let memberships = $state<MembershipItem[]>(data.initialMemberships ?? []);
	let nextCursor = $state<string | null>(data.nextCursor ?? null);
	let hasMore = $state<boolean>(data.hasMore ?? false);
	let searchValue = $state('');
	let activeSearch = $state('');
	let isLoading = $state(false);
	let isLoadingMore = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let expandedMemberships = $state<Set<string>>(new Set());

	// Actions menu state
	let openMenuId = $state<string | null>(null);

	// Edit dialog state
	let editDialogOpen = $state(false);
	let editingMembership = $state<MembershipItem | null>(null);

	const formatDate = (value: string | null) => {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	};

	const runSearch = async (query: string) => {
		isLoading = true;
		try {
			const response = await getMemberships({ search: query || undefined });
			memberships = response.items;
			nextCursor = response.nextCursor;
			hasMore = response.hasMore;
			activeSearch = query;
		} catch (error) {
			console.error('memberships: failed to load', error);
			toast.error('Failed to load memberships.');
		} finally {
			isLoading = false;
		}
	};

	const scheduleSearch = (value: string) => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
		searchTimeout = setTimeout(() => {
			void runSearch(value.trim());
		}, 300);
	};

	const handleSearchInput = (value: string) => {
		searchValue = value;
		scheduleSearch(value);
	};

	const loadMore = async () => {
		if (!hasMore || !nextCursor || isLoadingMore) return;
		isLoadingMore = true;
		try {
			const response = await getMemberships({
				cursor: nextCursor,
				search: activeSearch || undefined
			});
			memberships = [...memberships, ...response.items];
			nextCursor = response.nextCursor;
			hasMore = response.hasMore;
		} catch (error) {
			console.error('memberships: failed to load more', error);
			toast.error('Failed to load more memberships.');
		} finally {
			isLoadingMore = false;
		}
	};

	const handleCreated = (item: MembershipItem) => {
		if (!activeSearch) {
			memberships = [item, ...memberships];
			return;
		}
		void runSearch(activeSearch);
	};

	const handleUpdated = (item: MembershipItem) => {
		memberships = memberships.map((m) => (m.id === item.id ? item : m));
		editingMembership = null;
		editDialogOpen = false;
	};

	const handleEdit = (membership: MembershipItem) => {
		editingMembership = membership;
		editDialogOpen = true;
		openMenuId = null;
	};

	const handleDelete = async (membership: MembershipItem) => {
		openMenuId = null;
		if (!confirm(`Delete membership for "${membership.family?.familyName ?? 'Unknown Family'}"? This cannot be undone.`)) {
			return;
		}

		try {
			await deleteMembership({ id: membership.id });
			memberships = memberships.filter((m) => m.id !== membership.id);
			toast.success('Membership deleted successfully.');
		} catch (error) {
			console.error('memberships: failed to delete', error);
			toast.error('Failed to delete membership.');
		}
	};

	const toggleMenu = (id: string, event: MouseEvent) => {
		event.stopPropagation();
		openMenuId = openMenuId === id ? null : id;
	};

	const closeMenu = () => {
		openMenuId = null;
	};
</script>

<div class="space-y-8">
	<div class="flex flex-col gap-6 border-b border-[#e3d7cc] pb-6 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-semibold tracking-tight text-[#5c4a3d]">Memberships</h1>
			<p class="mt-2 text-sm text-[#7a6550]/80">
				Manage active memberships, link them to families, and track durations.
			</p>
		</div>
		<MembershipDialog mode="create" onSaved={handleCreated} />
	</div>

	<div class="flex flex-col gap-3 rounded-3xl border border-[#e3d7cc] bg-white/80 p-4 sm:flex-row sm:items-center">
		<div class="flex-1">
			<label class="text-xs font-semibold uppercase tracking-wide text-[#7a6550]">Search</label>
			<input
				type="text"
				placeholder="Family name, customer code, or phone number"
				class="mt-2 h-11 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
				value={searchValue}
				oninput={(event) => handleSearchInput((event.target as HTMLInputElement).value)}
			/>
		</div>
		<div class="text-sm text-[#7a6550]/70">
			{#if activeSearch}
				Showing results for "{activeSearch}"
			{:else}
				Showing the most recent memberships
			{/if}
		</div>
	</div>

	{#if isLoading}
		<div class="rounded-3xl border border-[#e3d7cc] bg-white/70 p-6 text-sm text-[#7a6550]/80">
			Loading memberships...
		</div>
	{:else if memberships.length === 0}
		<div class="rounded-3xl border border-[#e3d7cc] bg-white/70 p-6 text-sm text-[#7a6550]/80">
			No memberships found. Try a different search or add a new membership.
		</div>
	{:else}
		<div class="grid gap-3">
			{#each memberships as membership (membership.id)}
				{@const isExpanded = expandedMemberships.has(membership.id)}
				{@const isMenuOpen = openMenuId === membership.id}
				<div class="rounded-3xl border border-[#e3d7cc] bg-white/90 shadow-sm">
					<!-- Collapsed single-line view -->
					<div class="flex items-center gap-2 p-4">
						<button
							type="button"
							onclick={() => {
								if (expandedMemberships.has(membership.id)) {
									expandedMemberships.delete(membership.id);
								} else {
									expandedMemberships.add(membership.id);
								}
								expandedMemberships = new Set(expandedMemberships);
							}}
							class="flex min-w-0 flex-1 flex-col gap-2 text-left transition hover:opacity-80 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
						>
							<div class="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
								<span class="text-base font-semibold text-[#2c2925]">
									{membership.family?.familyName ?? 'Unknown Family'}
								</span>
								{#if membership.family?.customerCode}
									<span class="rounded-full bg-[#f0e6db] px-2.5 py-0.5 text-xs font-medium text-[#7a6550]">
										{membership.family.customerCode}
									</span>
								{/if}
								{#if membership.type}
									<span class="rounded-full bg-[#e3d7cc]/50 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-[#5c4a3d]">
										{membership.type}
									</span>
								{/if}
								{#if membership.numberOfKids !== null && membership.numberOfKids !== undefined}
									<span class="rounded-full bg-[#e3d7cc]/50 px-2.5 py-0.5 text-xs font-medium text-[#5c4a3d]">
										{membership.numberOfKids} {membership.numberOfKids === 1 ? 'kid' : 'kids'}
									</span>
								{/if}
								{#if membership.startDate}
									<span class="rounded-full bg-[#e3d7cc]/50 px-2.5 py-0.5 text-xs font-medium text-[#5c4a3d]">
										{formatDate(membership.startDate)}
									</span>
								{/if}
								{#if membership.status && membership.status !== '—'}
									<span class="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-700">
										{membership.status}
									</span>
								{/if}
							</div>
							<div class="shrink-0 self-end text-[#7a6550]/60 sm:self-auto">
								{#if isExpanded}
									<ChevronUp class="h-5 w-5" />
								{:else}
									<ChevronDown class="h-5 w-5" />
								{/if}
							</div>
						</button>

						<!-- Actions menu -->
						<div class="relative" data-actions-menu>
							<button
								type="button"
								onclick={(e) => toggleMenu(membership.id, e)}
								class="rounded-full p-2 text-[#7a6550]/60 transition hover:bg-[#f0e6db] hover:text-[#5c4a3d]"
								aria-label="More actions"
							>
								<MoreVertical class="h-5 w-5" />
							</button>
							{#if isMenuOpen}
								<div class="absolute right-0 top-full z-50 mt-1 w-40 rounded-2xl border border-[#e3d7cc] bg-white py-1 shadow-lg">
									<button
										type="button"
										onclick={() => handleEdit(membership)}
										class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#5c4a3d] transition hover:bg-[#fdfbf9]"
									>
										<Pencil class="h-4 w-4" />
										Edit
									</button>
									<button
										type="button"
										onclick={() => handleDelete(membership)}
										class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
									>
										<Trash2 class="h-4 w-4" />
										Delete
									</button>
								</div>
							{/if}
						</div>
					</div>

					<!-- Expanded details -->
					{#if isExpanded}
						<div class="border-t border-[#e3d7cc] p-6">
							<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div class="space-y-3">
									<div class="flex flex-wrap gap-2">
										{#if membership.type}
											<span class="rounded-full bg-[#e3d7cc]/50 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-[#5c4a3d]">
												Type: {membership.type}
											</span>
										{/if}
										{#if membership.numberOfKids !== null && membership.numberOfKids !== undefined}
											<span class="rounded-full bg-[#e3d7cc]/50 px-2.5 py-0.5 text-xs font-medium text-[#5c4a3d]">
												Kids: {membership.numberOfKids}
											</span>
										{/if}
										{#if membership.status && membership.status !== '—'}
											<span class="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-700">
												Status: {membership.status}
											</span>
										{/if}
									</div>
								</div>
								<div class="rounded-2xl border border-[#f0e6db] bg-[#fdfbf9] px-4 py-3 text-xs text-[#7a6550]/80">
									{#if membership.family?.customerCode}
										<p>Customer Code: {membership.family.customerCode}</p>
									{/if}
									{#if membership.family?.mainPhone}
										<p>Phone: {membership.family.mainPhone}</p>
									{/if}
								</div>
							</div>

							<div class="mt-4 grid gap-4 text-sm text-[#5c4a3d] sm:grid-cols-3">
								<div>
									<p class="text-xs uppercase tracking-wide text-[#7a6550]/60">Start Date</p>
									<p class="mt-1">{formatDate(membership.startDate)}</p>
								</div>
								<div>
									<p class="text-xs uppercase tracking-wide text-[#7a6550]/60">End Date</p>
									<p class="mt-1">{formatDate(membership.endDate)}</p>
								</div>
								<div>
									<p class="text-xs uppercase tracking-wide text-[#7a6550]/60">Created</p>
									<p class="mt-1">{formatDate(membership.createdTime)}</p>
								</div>
							</div>

							{#if membership.notes}
								<div class="mt-4 rounded-2xl border border-[#f0e6db] bg-[#faf6f2] px-4 py-3 text-sm text-[#5c4a3d]/90">
									<p class="text-xs uppercase tracking-wide text-[#7a6550]/60">Notes</p>
									<p class="mt-1">{membership.notes}</p>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if hasMore}
			<div class="flex justify-center pt-4">
				<button
					type="button"
					class="rounded-full border border-[#d9d0c7] bg-white px-6 py-2 text-sm font-medium text-[#7a6550] transition hover:bg-[#fdfbf9] disabled:cursor-not-allowed disabled:opacity-60"
					onclick={loadMore}
					disabled={isLoadingMore}
				>
					{isLoadingMore ? 'Loading...' : 'Load more memberships'}
				</button>
			</div>
		{/if}
	{/if}
</div>

<!-- Edit Dialog -->
<MembershipDialog
	mode="edit"
	membership={editingMembership}
	bind:open={editDialogOpen}
	onSaved={handleUpdated}
/>

<!-- Click outside handler to close menus -->
<svelte:document
	onclick={(event) => {
		if (openMenuId && !(event.target as HTMLElement).closest('[data-actions-menu]')) {
			closeMenu();
		}
	}}
/>
