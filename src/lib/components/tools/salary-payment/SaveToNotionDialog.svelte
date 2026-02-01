<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import PdfDropZone from "$lib/components/ui/PdfDropZone.svelte";
	import { LoaderCircle } from "lucide-svelte";
	import type { SalaryEmployee, SalaryResult } from "$lib/salary";
	import { saveSalaryPayment } from "$lib/salary.remote";
	import { toast } from "svelte-sonner";

	let { 
		isOpen = $bindable(false),
		employee,
		result,
		startDate,
		endDate,
		isMidMonthRun
	}: {
		isOpen: boolean;
		employee: SalaryEmployee;
		result: SalaryResult;
		startDate: string;
		endDate: string;
		isMidMonthRun: boolean;
	} = $props();

	let isSaving = $state(false);
	let fileDataUrl = $state<string | null>(null);
	let fileName = $state<string | null>(null);
	
	// Pre-filled properties
	let paymentTitle = $state(`${isMidMonthRun ? 'Mid' : 'End'}-Month Salary - ${employee.name} (${startDate})`);
	let paymentDate = $state(new Date().toISOString().split('T')[0]);
	let notes = $state("");

	async function handleSave() {
		isSaving = true;
		try {
			const totalDeductions = result.totalAttendanceDeductions + result.deductions + result.ssfDeduction;
			
			await saveSalaryPayment({
				employeeId: employee.id,
				paymentDate,
				paymentTitle,
				baseSalaryThb: result.baseSalaryForPeriod,
				otAmountThb: result.otPay,
				advancesThb: result.advances,
				deductionsThb: totalDeductions,
				totalPaidThb: result.netPay,
				notes: notes || undefined,
				fileDataUrl: fileDataUrl || undefined,
				fileName: fileName || undefined
			});

			toast.success("Salary payment saved to Notion successfully");
			isOpen = false;
		} catch (e: any) {
			console.error("Failed to save to Notion", e);
			toast.error(e.message || "Failed to save to Notion");
		} finally {
			isSaving = false;
		}
	}

	function handleFileSelect(url: string | null, name: string | null) {
		fileDataUrl = url;
		fileName = name;
	}
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Content class="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-[#fdfbf9] border-[#d3c5b8] rounded-[2rem] p-6 shadow-2xl">
		<Dialog.Header class="mb-6">
			<Dialog.Title class="text-2xl font-serif text-[#7a6550] mb-1">Save to Notion</Dialog.Title>
			<Dialog.Description class="text-[#7a6550]/60">
				Review payment details and upload the PDF payslip.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-6 py-4">
			<div class="grid gap-2">
				<label for="title" class="text-[10px] font-bold uppercase tracking-widest text-[#7a6550]/60 ml-1">Payment Title</label>
				<input 
					id="title" 
					bind:value={paymentTitle} 
					class="w-full px-4 py-2.5 bg-white border border-[#d3c5b8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6550]/20 transition-all text-[#7a6550]" 
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="date" class="text-[10px] font-bold uppercase tracking-widest text-[#7a6550]/60 ml-1">Payment Date</label>
					<input 
						id="date" 
						type="date" 
						bind:value={paymentDate} 
						class="w-full px-4 py-2 bg-white border border-[#d3c5b8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6550]/20 transition-all text-[#7a6550]" 
					/>
				</div>
				<div class="grid gap-1 text-right self-center">
					<span class="text-[10px] font-bold uppercase tracking-widest text-[#7a6550]/60">Net Payout</span>
					<div class="text-xl font-bold text-[#7a6550]">{result.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB</div>
				</div>
			</div>

			<div class="bg-[#f6f1eb]/50 p-4 rounded-2xl border border-[#d3c5b8]/30 grid grid-cols-2 gap-y-2.5 text-xs">
				<div class="text-[#7a6550]/60 font-semibold uppercase tracking-wider text-[9px]">
					{employee.salaryCalculation === 'Daily' ? 'Days Worked' : 'Base Salary (50%)'}
				</div>
				<div class="text-right font-bold text-[#7a6550]">{result.baseSalaryForPeriod.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB</div>
				
				<div class="text-[#7a6550]/60 font-semibold uppercase tracking-wider text-[9px]">OT Amount</div>
				<div class="text-right font-bold text-[#7a6550]">{result.otPay.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB</div>
				
				{#if result.advances > 0}
					<div class="text-[#7a6550]/60 font-semibold uppercase tracking-wider text-[9px]">Advances</div>
					<div class="text-right font-bold text-amber-700">-{result.advances.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB</div>
				{/if}
				
				{#if result.totalAttendanceDeductions + result.deductions + result.ssfDeduction > 0}
					{@const totalDeductions = result.totalAttendanceDeductions + result.deductions + result.ssfDeduction}
					<div class="text-[#7a6550]/60 font-semibold uppercase tracking-wider text-[9px]">Total Deductions</div>
					<div class="text-right font-bold text-amber-700">-{totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB</div>
				{/if}
			</div>

			<div class="grid gap-2">
				<span class="text-[10px] font-bold uppercase tracking-widest text-[#7a6550]/60 ml-1">Upload PDF Slip</span>
				<PdfDropZone value={fileDataUrl} onFileSelect={handleFileSelect} />
				<p class="text-[9px] text-center text-[#7a6550]/50 italic mt-1">First print and save as PDF, then upload here.</p>
			</div>

			<div class="grid gap-2">
				<label for="notes" class="text-[10px] font-bold uppercase tracking-widest text-[#7a6550]/60 ml-1">Notes (Optional)</label>
				<textarea 
					id="notes" 
					bind:value={notes} 
					placeholder="Any additional details..." 
					class="w-full px-4 py-3 bg-white border border-[#d3c5b8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6550]/20 transition-all text-[#7a6550] min-h-[80px]"
				></textarea>
			</div>
		</div>

		<Dialog.Footer class="gap-3 mt-4">
			<button 
				type="button"
				onclick={() => isOpen = false}
				class="flex-1 px-6 py-3 border border-[#d3c5b8] text-[#7a6550] rounded-full font-semibold text-sm hover:bg-white transition-all"
			>
				Cancel
			</button>
			<button 
				type="button"
				onclick={handleSave}
				disabled={isSaving}
				class="flex-[2] bg-[#7a6550] hover:bg-[#635241] text-white py-3 rounded-full font-semibold text-sm shadow-lg shadow-[#7a6550]/20 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
			>
				{#if isSaving}
					<LoaderCircle class="h-4 w-4 animate-spin" />
					Saving to Notion...
				{:else}
					Confirm & Save
				{/if}
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
