<script lang="ts">
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
	};

	let { shiftState }: Props = $props();
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
				class="w-full rounded-xl border border-input bg-background px-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			/>
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
					class="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				/>
			</div>
		</div>

		<div class="space-y-2">
			<label for="paidOut" class="text-sm font-medium">Paid Out (from POS shift report)</label>
			<p class="text-xs text-muted-foreground">Total cash removed from register for expenses according to the shift report slip.</p>
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
					class="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				/>
			</div>
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
					class="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				/>
			</div>
		</div>
	</div>
</section>

