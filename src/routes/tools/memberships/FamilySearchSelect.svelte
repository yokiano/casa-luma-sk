<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import { cn } from '$lib/utils';
	import { searchFamilies } from '$lib/memberships.remote';
	import CheckIcon from '@lucide/svelte/icons/check';

	type FamilySummary = {
		id: string;
		familyName: string;
		customerCode: string | null;
		mainPhone: string | null;
	};

	interface Props {
		value?: FamilySummary | null;
		placeholder?: string;
		emptyMessage?: string;
		class?: string;
		id?: string;
		disabled?: boolean;
		onSelect?: (family: FamilySummary) => void;
	}

	let {
		value = $bindable<FamilySummary | null>(null),
		placeholder = 'Search for a family...',
		emptyMessage = 'No families found.',
		class: className,
		id,
		disabled = false,
		onSelect
	}: Props = $props();

	let open = $state(false);
	let searchValue = $state('');
	let isLoading = $state(false);
	let results = $state<FamilySummary[]>([]);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	const filteredResults = $derived.by(() => results);

	const handleSelect = (family: FamilySummary) => {
		value = family;
		onSelect?.(family);
		open = false;
		searchValue = '';
	};

	const clearResults = () => {
		results = [];
		isLoading = false;
	};

	const runSearch = async (query: string) => {
		const trimmed = query.trim();
		if (!trimmed) {
			clearResults();
			return;
		}

		isLoading = true;
		try {
			results = await searchFamilies({ search: trimmed });
		} catch (error) {
			console.error('memberships: failed to search families', error);
			results = [];
		} finally {
			isLoading = false;
		}
	};

	const scheduleSearch = (query: string) => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
		searchTimeout = setTimeout(() => {
			void runSearch(query);
		}, 250);
	};
</script>

<div class={cn('relative', className)} data-family-select>
	<button
		type="button"
		class={cn(
			'flex h-11 w-full items-center justify-between rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm text-left transition focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40',
			disabled && 'cursor-not-allowed opacity-60'
		)}
		onclick={() => !disabled && (open = !open)}
		id={id}
		disabled={disabled}
	>
		<span class={cn(!value && 'text-[#7a6550]/50')}>
			{value ? value.familyName : placeholder}
		</span>
		<svg
			class="h-4 w-4 opacity-50 transition-transform {open ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if open}
		<div class="absolute z-50 mt-2 w-full rounded-2xl border border-[#d9d0c7] bg-white shadow-lg">
			<Command.Root class="rounded-2xl border-0" shouldFilter={false}>
				<Command.Input
					bind:value={searchValue}
					placeholder={placeholder}
					class="border-0 border-b border-[#d9d0c7] focus:ring-0"
					oninput={() => scheduleSearch(searchValue)}
				/>
				<Command.List class="max-h-[220px]">
					{#if isLoading}
						<Command.Empty>Searching…</Command.Empty>
					{:else}
						<Command.Empty>{emptyMessage}</Command.Empty>
					{/if}
					<Command.Group>
						{#each filteredResults as family (family.id)}
							<Command.Item
								value={family.id}
								onSelect={() => handleSelect(family)}
								class="cursor-pointer"
							>
								<CheckIcon class={cn('mr-2 h-4 w-4', value?.id === family.id ? 'opacity-100' : 'opacity-0')} />
								<div class="flex flex-col">
									<span>{family.familyName}</span>
									<span class="text-xs text-[#7a6550]/70">
										{family.customerCode ?? 'No customer code'} · {family.mainPhone ?? 'No phone'}
									</span>
								</div>
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</div>
	{/if}
</div>

<svelte:document
	onclick={(event) => {
		if (open && !(event.target as HTMLElement).closest('[data-family-select]')) {
			open = false;
			searchValue = '';
			clearResults();
		}
	}}
/>
