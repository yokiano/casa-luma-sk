<script lang="ts">
	import { onMount } from 'svelte';
	import SupplierSelector from '$lib/components/suppliers/SupplierSelector.svelte';
	import type { ShiftExpenseDraft, ShiftExpensePreset } from '$lib/close-shift-expenses/types';
	import {
		findPresetForTitle,
		presetToDraft,
		sortPresetsForPicker,
		upsertPresetFromDraft
	} from '$lib/close-shift-expenses/presets';
	import { loadShiftExpensePresets, saveShiftExpensePresets } from '$lib/close-shift-expenses/storage';

	type SupplierOption = { id: string; name: string };

	type CloseShiftStateLike = {
		expenses: ShiftExpenseDraft[];
		expensesTotal: number;
		paidOut: number | undefined;
		paidOutDifference: number;
		addExpense(expense?: Partial<ShiftExpenseDraft>): void;
		updateExpense(id: string, patch: Partial<ShiftExpenseDraft>): void;
		removeExpense(id: string): void;
		normalizeExpenseAmount(id: string): void;
	};

	type Props = {
		shiftState: CloseShiftStateLike;
		categories: string[];
		departments: string[];
		suppliers: SupplierOption[];
		onSupplierCreated?: (supplier: SupplierOption) => void;
	};

	let { shiftState, categories, departments, suppliers, onSupplierCreated }: Props = $props();

	let presets = $state<ShiftExpensePreset[]>([]);
	let selectedPresetId = $state('');

	const sortedPresets = $derived(sortPresetsForPicker(presets));

	onMount(() => {
		presets = loadShiftExpensePresets();
	});

	function formatCurrency(value: number | undefined) {
		return (value ?? 0).toLocaleString();
	}

	function saveDraftAsPreset(draft: ShiftExpenseDraft) {
		const next = upsertPresetFromDraft(presets, draft);
		if (next === presets) return;
		presets = next;
		saveShiftExpensePresets(next);
	}

	function applyTitlePreset(expense: ShiftExpenseDraft) {
		const preset = findPresetForTitle(presets, expense.title);
		if (!preset) {
			saveDraftAsPreset(expense);
			return;
		}

		shiftState.updateExpense(expense.id, {
			category: expense.category || preset.category,
			department: expense.department || preset.department,
			supplierId: expense.supplierId || preset.supplierId || ''
		});
		saveDraftAsPreset({ ...expense, category: expense.category || preset.category, department: expense.department || preset.department, supplierId: expense.supplierId || preset.supplierId || '' });
	}

	function handlePresetSelected() {
		const preset = presets.find((item) => item.id === selectedPresetId);
		if (!preset) return;
		shiftState.addExpense(presetToDraft(preset));
		selectedPresetId = '';
	}
</script>

<section class="space-y-4 bg-white p-6 rounded-2xl border border-[#e6e1db] shadow-sm">
	<div class="flex items-start justify-between gap-3">
		<div>
			<h2 class="text-xl font-semibold text-[#5c4a3d] flex items-center gap-2">
				<span class="bg-[#5c4a3d] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
				Shift Expenses
			</h2>
			<p class="text-sm text-muted-foreground mt-1">Cash paid from the drawer during this shift.</p>
		</div>
		<button
			type="button"
			onclick={() => shiftState.addExpense()}
			class="shrink-0 rounded-xl bg-[#5c4a3d] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4a3b30]"
		>
			Add expense
		</button>
	</div>

	<div class="grid gap-2 sm:grid-cols-[1fr_auto]">
		<select
			bind:value={selectedPresetId}
			onchange={handlePresetSelected}
			class="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
		>
			<option value="">Choose previous expense...</option>
			{#each sortedPresets as preset (preset.id)}
				<option value={preset.id}>
					{preset.title} · {preset.category} · {preset.department}
				</option>
			{/each}
		</select>
		<p class="self-center text-xs text-muted-foreground">Presets are saved on this device.</p>
	</div>

	{#if shiftState.expenses.length === 0}
		<div class="rounded-xl border border-dashed border-[#d9d0c7] bg-[#f9f7f4] p-4 text-sm text-muted-foreground">
			No cash expenses paid out this shift.
		</div>
	{:else}
		<div class="space-y-4">
			{#each shiftState.expenses as expense (expense.id)}
				<div class="space-y-3 rounded-xl border border-[#e6e1db] bg-[#fbfaf8] p-4">
					<div class="grid gap-3 sm:grid-cols-[1fr_8rem]">
						<div class="space-y-1">
							<label for={`expense-title-${expense.id}`} class="text-xs font-medium">Description</label>
							<input
								id={`expense-title-${expense.id}`}
								type="text"
								bind:value={expense.title}
								onblur={() => applyTitlePreset(expense)}
								placeholder="Ice, shop supplies..."
								class="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							/>
						</div>
						<div class="space-y-1">
							<label for={`expense-amount-${expense.id}`} class="text-xs font-medium">Amount</label>
							<div class="relative">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
								<input
									id={`expense-amount-${expense.id}`}
									type="number"
									inputmode="decimal"
									min="0"
									step="0.01"
									bind:value={expense.amount}
									onblur={() => shiftState.normalizeExpenseAmount(expense.id)}
									placeholder="0.00"
									class="w-full rounded-xl border border-input bg-white pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								/>
							</div>
						</div>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<div class="space-y-1">
							<label for={`expense-category-${expense.id}`} class="text-xs font-medium">Category</label>
							<select
								id={`expense-category-${expense.id}`}
								bind:value={expense.category}
								onchange={() => saveDraftAsPreset(expense)}
								class="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								<option value="">Select category...</option>
								{#each categories as category}
									<option value={category}>{category}</option>
								{/each}
							</select>
						</div>
						<div class="space-y-1">
							<label for={`expense-department-${expense.id}`} class="text-xs font-medium">Department</label>
							<select
								id={`expense-department-${expense.id}`}
								bind:value={expense.department}
								onchange={() => saveDraftAsPreset(expense)}
								class="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								<option value="">Select department...</option>
								{#each departments as department}
									<option value={department}>{department}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="space-y-1">
						<label class="text-xs font-medium">Supplier (optional)</label>
						<SupplierSelector
							{suppliers}
							bind:value={expense.supplierId}
							placeholder="Select supplier..."
							onSelect={(supplierId) => {
								expense.supplierId = supplierId;
								saveDraftAsPreset(expense);
							}}
							{onSupplierCreated}
						/>
					</div>

					<div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
						<div class="space-y-1">
							<label for={`expense-notes-${expense.id}`} class="text-xs font-medium">Note (optional)</label>
							<input
								id={`expense-notes-${expense.id}`}
								type="text"
								bind:value={expense.notes}
								placeholder="Short staff note..."
								class="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							/>
						</div>
						<button
							type="button"
							onclick={() => shiftState.removeExpense(expense.id)}
							class="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
						>
							Remove
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if shiftState.expensesTotal > 0 || (shiftState.paidOut ?? 0) > 0}
		<div class="rounded-xl bg-[#f9f7f4] p-4 text-sm space-y-2">
			<div class="flex justify-between">
				<span class="text-muted-foreground">Detailed shift expenses</span>
				<span class="font-semibold">฿{formatCurrency(shiftState.expensesTotal)}</span>
			</div>
			<div class="flex justify-between {shiftState.paidOutDifference === 0 ? 'text-green-600' : 'text-red-500'}">
				<span>Paid Out difference</span>
				<span class="font-semibold">฿{formatCurrency(shiftState.paidOutDifference)}</span>
			</div>
		</div>
	{/if}
</section>
