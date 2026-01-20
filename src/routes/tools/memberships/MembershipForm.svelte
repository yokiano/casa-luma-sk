<script lang="ts">
	import { MEMBERSHIPS_PROP_VALUES } from '$lib/notion-sdk/dbs/memberships/constants';
	import FamilySearchSelect from './FamilySearchSelect.svelte';
	import { Pencil, RotateCcw } from 'lucide-svelte';

	type FamilySummary = {
		id: string;
		familyName: string;
		customerCode: string | null;
		mainPhone: string | null;
	};

	interface Props {
		selectedFamily: FamilySummary | null;
		membershipType: 'Weekly' | 'Monthly';
		numberOfKids: number;
		startDate: string;
		endDate: string;
		endDateOverridden: boolean;
		notes: string;
		errorMessage: string | null;
		onResetEndDate?: () => void;
	}

	let {
		selectedFamily = $bindable(),
		membershipType = $bindable(),
		numberOfKids = $bindable(),
		startDate = $bindable(),
		endDate = $bindable(),
		endDateOverridden = $bindable(),
		notes = $bindable(),
		errorMessage,
		onResetEndDate
	}: Props = $props();

	let isEditingEndDate = $state(false);

	const handleEndDateEdit = () => {
		isEditingEndDate = true;
	};

	const handleEndDateChange = (value: string) => {
		endDate = value;
		endDateOverridden = true;
		isEditingEndDate = false;
	};

	const handleResetEndDate = () => {
		endDateOverridden = false;
		isEditingEndDate = false;
		onResetEndDate?.();
	};
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<label class="text-sm font-medium text-[#5c4a3d]">Family</label>
		<FamilySearchSelect bind:value={selectedFamily} />
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<label class="text-sm font-medium text-[#5c4a3d]">Membership Type</label>
			<select
				class="h-11 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
				bind:value={membershipType}
			>
				{#each MEMBERSHIPS_PROP_VALUES.type as typeOption}
					<option value={typeOption}>{typeOption}</option>
				{/each}
			</select>
		</div>
		<div class="space-y-2">
			<label class="text-sm font-medium text-[#5c4a3d]">Number of Kids</label>
			<input
				type="number"
				min="1"
				max="20"
				class="h-11 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
				bind:value={numberOfKids}
			/>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<label class="text-sm font-medium text-[#5c4a3d]">Start Date</label>
			<input
				type="date"
				class="h-11 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
				bind:value={startDate}
			/>
		</div>
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<label class="text-sm font-medium text-[#5c4a3d]">End Date</label>
				{#if endDateOverridden}
					<button
						type="button"
						onclick={handleResetEndDate}
						class="flex items-center gap-1 text-xs text-[#7a6550]/70 transition hover:text-[#5c4a3d]"
						title="Reset to calculated date"
					>
						<RotateCcw class="h-3 w-3" />
						Reset
					</button>
				{/if}
			</div>
			{#if isEditingEndDate}
				<input
					type="date"
					class="h-11 w-full rounded-2xl border border-[#7a6550] bg-white px-4 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
					value={endDate}
					onchange={(e) => handleEndDateChange((e.target as HTMLInputElement).value)}
					onblur={() => (isEditingEndDate = false)}
				/>
			{:else}
				<button
					type="button"
					onclick={handleEndDateEdit}
					class="flex h-11 w-full items-center justify-between rounded-2xl border border-[#d9d0c7] bg-[#fdfbf9] px-4 text-left text-sm transition hover:border-[#7a6550]"
				>
					<span class={endDate ? 'text-[#2c2925]' : 'text-[#7a6550]/50'}>
						{endDate || 'Not set'}
					</span>
					<Pencil class="h-4 w-4 text-[#7a6550]/50" />
				</button>
			{/if}
			{#if !endDateOverridden && endDate}
				<p class="text-xs text-[#7a6550]/60">Auto-calculated based on {membershipType.toLowerCase()} duration</p>
			{/if}
		</div>
	</div>

	<div class="space-y-2">
		<label class="text-sm font-medium text-[#5c4a3d]">Notes</label>
		<textarea
			class="min-h-[100px] w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-3 text-sm focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/40"
			placeholder="Optional notes for the team..."
			bind:value={notes}
		></textarea>
	</div>

	{#if errorMessage}
		<p class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
			{errorMessage}
		</p>
	{/if}
</div>
