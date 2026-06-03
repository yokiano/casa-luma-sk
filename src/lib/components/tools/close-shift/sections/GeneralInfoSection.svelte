<script lang="ts">
	import FieldError from '$lib/components/ui/FieldError.svelte';
	import type { SubmitValidationIssue } from '$lib/close-shift/validation';

	type CloseShiftStateLike = {
		closerName: string;
		expectedCash: number | undefined;
		cashIn: number | undefined;
		paidOut: number | undefined;
		normalizeExpectedCash(): void;
		normalizeCashIn(): void;
		normalizePaidOut(): void;
	};

	type Props = {
		shiftState: CloseShiftStateLike;
		validationIssues?: SubmitValidationIssue[];
	};

	let { shiftState, validationIssues = [] }: Props = $props();

	const errorFor = (fieldId: string) => validationIssues.find((issue) => issue.fieldId === fieldId)?.message;
</script>

<section class="space-y-4 bg-white p-6 rounded-2xl border border-[#e6e1db] shadow-sm">
	<h2 class="text-xl font-semibold text-[#5c4a3d] flex items-center gap-2">
		<span class="bg-[#5c4a3d] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
		General Info
	</h2>

	<div class="grid gap-4">
		<div class="space-y-2">
			<label for="closerName" class="text-sm font-medium">Closer Name</label>
			<input
				id="closerName"
				type="text"
				bind:value={shiftState.closerName}
				placeholder="Enter closer name..."
				aria-invalid={Boolean(errorFor('closerName'))}
				aria-describedby={errorFor('closerName') ? 'closerName-error' : undefined}
				class="w-full rounded-xl border bg-background px-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {errorFor('closerName') ? 'border-red-500' : 'border-input'}"
			/>
			<FieldError forId="closerName" message={errorFor('closerName')} />
		</div>

		<div class="space-y-2">
			<label for="expectedCash" class="text-sm font-medium">Expected Cash (from POS)</label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
				<input
					id="expectedCash"
					type="number"
					inputmode="decimal"
					min="0"
					step="0.01"
					bind:value={shiftState.expectedCash}
					onblur={() => shiftState.normalizeExpectedCash()}
					placeholder="0.00"
					aria-invalid={Boolean(errorFor('expectedCash'))}
					aria-describedby={errorFor('expectedCash') ? 'expectedCash-error' : undefined}
					class="w-full rounded-xl border bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {errorFor('expectedCash') ? 'border-red-500' : 'border-input'}"
				/>
			</div>
			<FieldError forId="expectedCash" message={errorFor('expectedCash')} />
		</div>

		<div class="space-y-2">
			<label for="paidOut" class="text-sm font-medium">Paid Out (from POS shift report)</label>
			<p class="text-xs text-muted-foreground">Used only to reconcile shift expenses. Loyverse expected cash already includes these payouts.</p>
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
				<input
					id="paidOut"
					type="number"
					inputmode="decimal"
					min="0"
					step="0.01"
					bind:value={shiftState.paidOut}
					onblur={() => shiftState.normalizePaidOut()}
					placeholder="0.00"
					aria-invalid={Boolean(errorFor('paidOut'))}
					aria-describedby={errorFor('paidOut') ? 'paidOut-error' : undefined}
					class="w-full rounded-xl border bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {errorFor('paidOut') ? 'border-red-500' : 'border-input'}"
				/>
			</div>
			<FieldError forId="paidOut" message={errorFor('paidOut')} />
		</div>

		<div class="space-y-2">
			<label for="cashIn" class="text-sm font-medium">Cash In (Opening + Extra Change)</label>
			<p class="text-xs text-muted-foreground">All cash in drawer NOT considered as income (e.g. 5,000 opening cash).</p>
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
				<input
					id="cashIn"
					type="number"
					inputmode="decimal"
					min="0"
					step="0.01"
					bind:value={shiftState.cashIn}
					onblur={() => shiftState.normalizeCashIn()}
					placeholder="0.00"
					aria-invalid={Boolean(errorFor('cashIn'))}
					aria-describedby={errorFor('cashIn') ? 'cashIn-error' : undefined}
					class="w-full rounded-xl border bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {errorFor('cashIn') ? 'border-red-500' : 'border-input'}"
				/>
			</div>
			<FieldError forId="cashIn" message={errorFor('cashIn')} />
		</div>
	</div>
</section>
