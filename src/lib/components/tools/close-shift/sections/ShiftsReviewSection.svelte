<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { SHIFTS_PROP_VALUES } from '$lib/notion-sdk/dbs/shifts/constants';
	import { ShiftsReviewState, type ShiftsReviewMode } from './ShiftsReviewState.svelte';
	import type { ShiftForReview } from '$lib/shifts.remote';

	type Props = {
		title: string;
		mode: ShiftsReviewMode;
		shifts: ShiftForReview[];
		employeesById: Record<string, string>;
	};

	let { title, mode, shifts, employeesById }: Props = $props();

	const state = new ShiftsReviewState({
		mode,
		shifts: shifts as any,
		employeesById
	});

	// TypeScript can lag behind regenerated SDK types; keep runtime-correct options.
	const approverOptions = ((SHIFTS_PROP_VALUES as any).otApprover ?? []) as readonly string[];

	async function handleComplete(shiftId: string) {
		try {
			await state.markShiftCompleted(shiftId);
			toast.success('Shift updated');
		} catch {
			toast.error(state.error ?? 'Failed to update shift');
		}
	}

	async function handleSaveOt(shiftId: string) {
		try {
			await state.saveOt(shiftId);
			toast.success('OT updated');
		} catch {
			toast.error(state.error ?? 'Failed to update OT');
		}
	}

	async function handleClearOt(shiftId: string) {
		try {
			await state.clearOt(shiftId);
			toast.success('OT cleared');
		} catch {
			toast.error(state.error ?? 'Failed to clear OT');
		}
	}

	async function handleConfirm(shiftId: string) {
		try {
			await state.markShiftConfirmed(shiftId);
			toast.success('Marked confirmed');
		} catch {
			toast.error(state.error ?? 'Failed to confirm shift');
		}
	}

	async function handleUndoCompleted(shiftId: string) {
		try {
			await state.setShiftStatus(shiftId, 'Confirmed');
			toast.success('Reverted to Confirmed');
		} catch {
			toast.error(state.error ?? 'Failed to undo');
		}
	}

	async function handleUndoConfirmed(shiftId: string) {
		try {
			await state.setShiftStatus(shiftId, 'Planned');
			toast.success('Reverted to Planned');
		} catch {
			toast.error(state.error ?? 'Failed to undo');
		}
	}
</script>

<section class="space-y-4 bg-white p-6 rounded-2xl border border-[#e6e1db] shadow-sm">
	<div class="flex items-start justify-between gap-4">
		<div class="space-y-1">
			<h2 class="text-xl font-semibold text-[#5c4a3d]">{title}</h2>
			{#if mode === 'today'}
				<p class="text-xs text-muted-foreground">Quick list: mark Completed, OT is opt-in per shift.</p>
			{:else}
				<p class="text-xs text-muted-foreground">Tomorrow’s plan: confirm staff arrival (Status → Confirmed).</p>
			{/if}
		</div>
		<div class="text-right text-xs text-muted-foreground">
			{#if state.hasShifts}
				{state.shifts.length} shifts
			{:else}
				0 shifts
			{/if}
		</div>
	</div>

	{#if !state.hasShifts}
		<div class="rounded-xl border border-dashed border-[#e6e1db] bg-[#faf8f5] p-6 text-sm text-muted-foreground">
			No shifts found.
		</div>
	{:else if mode === 'today'}
		<!-- Compact list -->
		<div class="space-y-2">
			{#each state.shifts as s (s.id)}
				<div class="rounded-2xl border border-[#efe8df] bg-[#faf8f5] p-4 space-y-3">
					<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div class="min-w-0 space-y-1">
							<div class="text-sm font-medium text-[#5c4a3d] truncate">
								{state.employeeNames(s.id).join(', ') || 'Unknown employee'}
							</div>
							<div class="text-xs text-muted-foreground">
								<span class="font-medium">{s.type ?? 'Unknown shift type'}</span>
								{#if s.shiftTime?.start}
									<span class="mx-2">•</span>
									<span>{s.shiftTime.start}</span>
								{/if}
								{#if state.getStatus(s.id)}
									<span class="mx-2">•</span>
									<span>Status: {state.getStatus(s.id)}</span>
								{/if}
							</div>
						</div>

						<div class="flex items-center gap-2">
							<button
								class="h-9 px-3 rounded-xl border border-[#e6e1db] bg-white text-sm font-medium hover:bg-[#fffdf9] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
								onclick={() => state.toggleOtOpen(s.id)}
								disabled={state.saving}
							>
								OT
							</button>

							{#if state.getStatus(s.id) === 'Completed'}
								<button
									class="h-9 px-3 rounded-xl border border-[#e6e1db] bg-white text-sm font-medium hover:bg-[#fffdf9] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
									onclick={() => handleUndoCompleted(s.id)}
									disabled={state.saving}
								>
									Undo
								</button>
							{:else}
								<button
									class="h-9 px-3 rounded-xl bg-[#5c4a3d] text-white text-sm font-semibold hover:bg-[#4a3b30] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
									onclick={() => handleComplete(s.id)}
									disabled={state.saving}
								>
									Complete
								</button>
							{/if}
						</div>
					</div>

					{#if state.isOtOpen(s.id)}
						<div class="rounded-xl border border-[#e6e1db] bg-white p-4 space-y-3">
							<div class="grid gap-3 sm:grid-cols-3 sm:items-end">
								<div class="space-y-2 sm:col-span-1">
									<label class="text-xs font-medium text-[#5c4a3d]" for="ot-{s.id}">OT (hours)</label>
									<input
										id="ot-{s.id}"
										type="number"
										min="0"
										step="0.25"
										value={state.getOt(s.id)}
										onchange={(e) => state.setOt(s.id, Number(e.currentTarget.value))}
										class="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									/>
								</div>

								<div class="space-y-2 sm:col-span-2">
									<label class="text-xs font-medium text-[#5c4a3d]" for="approver-{s.id}">OT Approver</label>
									<select
										id="approver-{s.id}"
										value={state.getApprover(s.id)}
										onchange={(e) => state.setApprover(s.id, e.currentTarget.value)}
										class="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										<option value="">Select approver…</option>
										{#each approverOptions as name}
											<option value={name}>{name}</option>
										{/each}
									</select>
								</div>
							</div>

							<div class="flex items-center justify-between gap-3">
								<div class="text-xs text-muted-foreground">
									OT is optional. Save/clear OT now or just press Complete (it saves OT too).
								</div>
								<div class="flex items-center gap-2">
									<button
										class="h-9 px-3 rounded-xl border border-[#e6e1db] bg-white text-sm font-medium hover:bg-[#fffdf9] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
										onclick={() => handleClearOt(s.id)}
										disabled={state.saving}
									>
										Clear OT
									</button>
									<button
										class="h-9 px-3 rounded-xl border border-[#e6e1db] bg-white text-sm font-medium hover:bg-[#fffdf9] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
										onclick={() => handleSaveOt(s.id)}
										disabled={state.saving}
									>
										Save OT
									</button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<!-- Tomorrow list -->
		<div class="space-y-3">
			{#each state.shifts as s (s.id)}
				<div class="rounded-2xl border border-[#efe8df] bg-[#faf8f5] p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div class="space-y-1">
						<div class="text-sm font-medium text-[#5c4a3d]">
							{(s.employeeIds ?? []).map((id) => employeesById[id] ?? id).join(', ') || 'Unknown employee'}
						</div>
						<div class="text-xs text-muted-foreground">
							<span class="font-medium">{s.type ?? 'Unknown shift type'}</span>
							{#if s.shiftTime?.start}
								<span class="mx-2">•</span>
								<span>{s.shiftTime.start}</span>
							{/if}
							{#if state.getStatus(s.id)}
								<span class="mx-2">•</span>
								<span>Status: {state.getStatus(s.id)}</span>
							{/if}
						</div>
					</div>

					<button
						class="h-9 px-3 rounded-xl border border-[#e6e1db] bg-white text-sm font-medium hover:bg-[#fffdf9] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						onclick={() => (state.getStatus(s.id) === 'Confirmed' ? handleUndoConfirmed(s.id) : handleConfirm(s.id))}
						disabled={state.saving}
					>
						{state.getStatus(s.id) === 'Confirmed' ? 'Undo' : 'Mark Confirmed'}
					</button>
				</div>
			{/each}
		</div>
	{/if}
</section>

