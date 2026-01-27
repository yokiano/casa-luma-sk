<script lang="ts">
	import FileDropZone from "$lib/components/ui/FileDropZone.svelte";

	type CloseShiftStateLike = {
		expectedCash: number;
		actualCash: number;
		difference: number;
		notes: string;
		isSubmitting: boolean;
		error: string | null;
		closerId: string;
	};

	type Props = {
		shiftState: CloseShiftStateLike;
		uploadedFile: string | null;
		onSubmit: () => void | Promise<void>;
	};

	let {
		shiftState,
		uploadedFile = $bindable(null),
		onSubmit,
	}: Props = $props();
</script>

<section
	class="space-y-6 bg-[#f9f7f4] p-6 rounded-2xl border border-[#e6e1db] sticky top-8"
>
	<h2 class="text-xl font-semibold text-[#5c4a3d]">Summary</h2>

	<div class="space-y-4">
		<div class="flex justify-between items-center text-sm">
			<span class="text-muted-foreground">Expected Cash</span>
			<span class="font-medium"
				>฿{shiftState.expectedCash.toLocaleString()}</span
			>
		</div>
		<div class="flex justify-between items-center text-sm">
			<span class="text-muted-foreground">Actual Cash Count</span>
			<span class="font-medium"
				>฿{shiftState.actualCash.toLocaleString()}</span
			>
		</div>
		<div class="h-px bg-border"></div>
		<div class="flex justify-between items-center text-lg font-bold">
			<span>Difference</span>
			<span
				class={shiftState.difference === 0
					? "text-green-600"
					: "text-red-500"}
			>
				{shiftState.difference > 0
					? "+"
					: ""}฿{shiftState.difference.toLocaleString()}
			</span>
		</div>
	</div>

	<div class="space-y-2">
		<label for="notes" class="text-sm font-medium"
			>Notes & Explanations</label
		>
		<textarea
			id="notes"
			bind:value={shiftState.notes}
			rows="4"
			class="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
			placeholder="Explain any discrepancies or add shift notes..."
		></textarea>
	</div>

	<div class="space-y-2">
		<span class="text-sm font-medium">Shift Summary (POS Print)</span>
		<FileDropZone
			onFileSelect={(file) => (uploadedFile = file)}
			value={uploadedFile}
		/>
		<p class="text-xs text-muted-foreground text-center italic">
			* File upload currently only for display, not yet saved.
		</p>
	</div>

	<div class="pt-4">
		<button
			onclick={onSubmit}
			disabled={shiftState.isSubmitting }
			class="w-full bg-[#5c4a3d] text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-[#4a3b30] hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
		>
			{shiftState.isSubmitting ? "Submitting..." : "Submit Report"}
		</button>
		{#if shiftState.error}
			<p
				class="text-sm text-red-500 text-center mt-2 bg-red-50 p-2 rounded-lg border border-red-100"
			>
				{shiftState.error}
			</p>
		{/if}
	</div>
</section>
