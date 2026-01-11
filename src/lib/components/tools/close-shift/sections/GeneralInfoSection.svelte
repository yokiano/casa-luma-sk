<script lang="ts">
	type Manager = { id: string; name: string; personId?: string };

	type CloseShiftStateLike = {
		closerId: string;
		closerPersonId: string | undefined;
		closerName: string;
		expectedCash: number;
	};

	type Props = {
		shiftState: CloseShiftStateLike;
		managers: Manager[];
	};

	let { shiftState, managers }: Props = $props();
</script>

<section class="space-y-4 bg-white p-6 rounded-2xl border border-[#e6e1db] shadow-sm">
	<h2 class="text-xl font-semibold text-[#5c4a3d] flex items-center gap-2">
		<span class="bg-[#5c4a3d] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
		General Info
	</h2>

	<div class="grid gap-4">
		<div class="space-y-2">
			<label for="closerName" class="text-sm font-medium">Closer Name</label>
			<select
				id="closerName"
				bind:value={shiftState.closerId}
				onchange={(e) => {
					const manager = managers.find((m) => m.id === e.currentTarget.value);
					if (manager) {
						shiftState.closerName = manager.name;
						shiftState.closerPersonId = (manager as any).personId;
					}
				}}
				class="w-full rounded-xl border border-input bg-background px-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			>
				<option value="" disabled selected>Select closer...</option>
				{#each managers as manager}
					<option value={manager.id}>{manager.name}</option>
				{/each}
			</select>
		</div>

		<div class="space-y-2">
			<label for="expectedCash" class="text-sm font-medium">Expected Cash (from POS)</label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">฿</span>
				<input
					id="expectedCash"
					type="number"
					inputmode="decimal"
					step="0.01"
					bind:value={shiftState.expectedCash}
					placeholder="0.00"
					class="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				/>
			</div>
		</div>
	</div>
</section>

