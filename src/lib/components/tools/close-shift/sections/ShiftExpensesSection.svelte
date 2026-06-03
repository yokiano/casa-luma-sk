<script lang="ts">
	import { onMount } from 'svelte';
	import SupplierSelector from '$lib/components/suppliers/SupplierSelector.svelte';
	import FieldError from '$lib/components/ui/FieldError.svelte';
	import type { ShiftExpenseDraft, ShiftExpensePreset } from '$lib/close-shift-expenses/types';
	import type { SubmitValidationIssue } from '$lib/close-shift/validation';
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
		validationIssues?: SubmitValidationIssue[];
	};

	let { shiftState, categories, departments, suppliers, onSupplierCreated, validationIssues = [] }: Props = $props();

	let presets = $state<ShiftExpensePreset[]>([]);
	let selectedPresetId = $state('');

	const sortedPresets = $derived(sortPresetsForPicker(presets));
	const errorFor = (fieldId: string) => validationIssues.find((issue) => issue.fieldId === fieldId)?.message;

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
				{@const titleFieldId = `expense-title-${expense.id}`}
				{@const amountFieldId = `expense-amount-${expense.id}`}
				{@const categoryFieldId = `expense-category-${expense.id}`}
				{@const departmentFieldId = `expense-department-${expense.id}`}
				<div class="space-y-3 rounded-xl border border-[#e6e1db] bg-[#fbfaf8] p-4">
					<div class="grid gap-3 sm:grid-cols-[1fr_8rem]">
						<div class="space-y-1">
							<label for={titleFieldId} class="text-xs font-medium">Title</label>
							<input
								id={titleFieldId}
								type="text"
								bind:value={expense.title}
								onblur={() => applyTitlePreset(expense)}
								placeholder="Ice, shop supplies..."
								aria-invalid={Boolean(errorFor(titleFieldId))}
								aria-describedby={errorFor(titleFieldId) ? `${titleFieldId}-error` : undefined}
								class="w-full rounded-xl border bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {errorFor(titleFieldId) ? 'border-red-500' : 'border-input'}"
							/>
							<FieldError forId={titleFieldId} message={errorFor(titleFieldId)} />
						</div>
						<div class="space-y-1">
							<label for={amountFieldId} class="text-xs font-medium">Amount</label>
							<div class="relative">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
								<input
									id={amountFieldId}
									type="number"
									inputmode="decimal"
									min="0"
									step="0.01"
									bind:value={expense.amount}
									onblur={() => shiftState.normalizeExpenseAmount(expense.id)}
									placeholder="0.00"
									aria-invalid={Boolean(errorFor(amountFieldId))}
									aria-describedby={errorFor(amountFieldId) ? `${amountFieldId}-error` : undefined}
									class="w-full rounded-xl border bg-white pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {errorFor(amountFieldId) ? 'border-red-500' : 'border-input'}"
								/>
							</div>
							<FieldError forId={amountFieldId} message={errorFor(amountFieldId)} />
						</div>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<div class="space-y-1">
							<label for={categoryFieldId} class="text-xs font-medium">Category (optional)</label>
							<select
								id={categoryFieldId}
								bind:value={expense.category}
								onchange={() => saveDraftAsPreset(expense)}
								aria-invalid={Boolean(errorFor(categoryFieldId))}
								aria-describedby={errorFor(categoryFieldId) ? `${categoryFieldId}-error` : undefined}
								class="w-full rounded-xl border bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {errorFor(categoryFieldId) ? 'border-red-500' : 'border-input'}"
							>
								<option value="">Unclassified</option>
								{#each categories as category}
									<option value={category}>{category}</option>
								{/each}
							</select>
							<FieldError forId={categoryFieldId} message={errorFor(categoryFieldId)} />
						</div>
						<div class="space-y-1">
							<label for={departmentFieldId} class="text-xs font-medium">Department (optional)</label>
							<select
								id={departmentFieldId}
								bind:value={expense.department}
								onchange={() => saveDraftAsPreset(expense)}
								aria-invalid={Boolean(errorFor(departmentFieldId))}
								aria-describedby={errorFor(departmentFieldId) ? `${departmentFieldId}-error` : undefined}
								class="w-full rounded-xl border bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {errorFor(departmentFieldId) ? 'border-red-500' : 'border-input'}"
							>
								<option value="">Unclassified</option>
								{#each departments as department}
									<option value={department}>{department}</option>
								{/each}
							</select>
							<FieldError forId={departmentFieldId} message={errorFor(departmentFieldId)} />
						</div>
					</div>

					<div class="space-y-1">
						<span class="text-xs font-medium">Supplier (optional)</span>
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
