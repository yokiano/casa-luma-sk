<script lang="ts">
	type CloseShiftStateLike = {
		actualCash: number;
		billCounts: Record<string, number>;
		clearBillCounts(): void;
	};

	type Props = {
		shiftState: CloseShiftStateLike;
		denominations: readonly string[];
	};

	let { shiftState, denominations }: Props = $props();
</script>

<section class="space-y-4 bg-white p-6 rounded-2xl border border-[#e6e1db] shadow-sm">
	<div class="flex justify-between items-start mb-2">
		<div>
			<h2 class="text-xl font-semibold text-[#5c4a3d] flex items-center gap-2">
				<span class="bg-[#5c4a3d] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
				Cash Count
			</h2>
			<p class="text-xs text-muted-foreground mt-1 ml-8">Enter the quantity of each bill/coin</p>
		</div>
		<div class="text-right flex flex-col items-end gap-1">
			<div class="text-xs text-muted-foreground">Actual Cash</div>
			<div class="text-xl font-mono font-bold text-[#5c4a3d]">฿{shiftState.actualCash.toLocaleString()}</div>
			{#if shiftState.actualCash > 0}
				<button
					onclick={() => shiftState.clearBillCounts()}
					class="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
				>
					Clear All
				</button>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
		{#each denominations as denom}
			<div class="bg-gray-50 p-3 rounded-xl border border-gray-200 hover:border-[#5c4a3d]/30 transition-all flex flex-col gap-2 relative">
				{#if (shiftState.billCounts[denom] ?? 0) > 0}
					<button
						onclick={() => (shiftState.billCounts[denom] = 0)}
						class="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 border shadow-sm rounded-full w-8 h-8 flex items-center justify-center text-sm z-20"
						title="Clear"
						tabindex="-1"
					>
						✕
					</button>
				{/if}
				<label for="denom-{denom}" class="text-center font-bold text-[#5c4a3d] text-lg block">{denom}</label>

				<input
					id="denom-{denom}"
					type="number"
					inputmode="numeric"
					min="0"
					placeholder="0"
					bind:value={shiftState.billCounts[denom]}
					class="w-full bg-white border border-gray-300 rounded-lg py-2 px-1 text-center text-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#5c4a3d]/20 focus:border-[#5c4a3d]"
					onfocus={(e) => e.currentTarget.select()}
				/>

				<div class="text-center text-xs text-muted-foreground font-mono">
					= ฿{((shiftState.billCounts[denom] ?? 0) * Number(denom)).toLocaleString()}
				</div>
			</div>
		{/each}
	</div>
</section>

