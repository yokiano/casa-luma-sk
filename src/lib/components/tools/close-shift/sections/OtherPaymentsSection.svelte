<script lang="ts">
	type CloseShiftStateLike = {
		paymentMethods: {
			scan: number;
			card: number;
		};
	};

	type Props = {
		shiftState: CloseShiftStateLike;
	};

	let { shiftState }: Props = $props();
</script>

<section class="space-y-4 bg-white p-6 rounded-2xl border border-[#e6e1db] shadow-sm">
	<h2 class="text-xl font-semibold text-[#5c4a3d] flex items-center gap-2">
		<span class="bg-[#5c4a3d] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
		Other Payments
	</h2>

	<div class="grid gap-4">
		<div class="space-y-2">
			<label for="scanPayments" class="text-sm font-medium">Scan / Transfer Total</label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
				<input
					id="scanPayments"
					type="number"
					inputmode="decimal"
					step="0.01"
					bind:value={shiftState.paymentMethods.scan}
					class="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				/>
			</div>
		</div>

		<div class="space-y-2">
			<label for="cardPayments" class="text-sm font-medium">Credit Card Total</label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
				<input
					id="cardPayments"
					type="number"
					inputmode="decimal"
					step="0.01"
					bind:value={shiftState.paymentMethods.card}
					class="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				/>
			</div>
		</div>
	</div>
</section>

