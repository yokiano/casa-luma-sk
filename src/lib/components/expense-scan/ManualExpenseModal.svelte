<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { submitExpenseSlip } from '$lib/expense-submit.remote';
  import { toast } from 'svelte-sonner';

  type Props = {
    open: boolean;
    onClose: () => void;
    categories: string[];
    departments: string[];
    suppliers: { id: string; name: string }[];
    bankAccounts: string[];
    paymentMethods: string[];
  };

  let { open, onClose, categories, departments, suppliers, bankAccounts, paymentMethods }: Props = $props();

  let isSubmitting = $state(false);

  let form = $state({
    title: '',
    amount: '',
    date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
    category: '',
    department: '',
    supplierId: '',
    bankAccount: '',
    paymentMethod: 'Cash',
    referenceNumber: '',
    notes: ''
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!form.title || !form.amount || !form.date || !form.category || !form.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    isSubmitting = true;
    try {
      await submitExpenseSlip({
        title: form.title,
        amount: parseFloat(form.amount),
        date: form.date,
        category: form.category,
        department: form.department,
        supplierId: form.supplierId || undefined,
        bankAccount: form.bankAccount || undefined,
        paymentMethod: form.paymentMethod || undefined,
        transactionId: form.referenceNumber || undefined,
        notes: form.notes || undefined
      });

      toast.success('Expense added successfully');
      onClose();
      // Reset form
      form = {
        title: '',
        amount: '',
        date: new Date().toLocaleDateString('en-GB'),
        category: '',
        department: '',
        supplierId: '',
        bankAccount: '',
        paymentMethod: 'Cash',
        referenceNumber: '',
        notes: ''
      };
    } catch (err: any) {
      toast.error('Failed to add expense', { description: err.message });
    } finally {
      isSubmitting = false;
    }
  }
</script>

<Dialog.Root {open} onOpenChange={(val) => !val && onClose()}>
  <Dialog.Content class="max-w-2xl rounded-3xl border-[#e0d6cc] bg-white p-6 shadow-xl">
    <Dialog.Header>
      <Dialog.Title class="text-2xl font-semibold text-[#2c2925]">Manual Expense Entry</Dialog.Title>
      <Dialog.Description class="text-[#5c4a3d]/70">
        Fill in the details for a new expense. This will be synced directly to Notion.
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={handleSubmit} class="mt-6 space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <label for="title" class="text-sm font-semibold text-[#5c4a3d]">Description *</label>
          <input
            id="title"
            type="text"
            bind:value={form.title}
            placeholder="e.g. Office Supplies"
            required
            class="w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm outline-none focus:border-[#7a6550]"
          />
        </div>

        <div class="space-y-2">
          <label for="amount" class="text-sm font-semibold text-[#5c4a3d]">Amount (THB) *</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            bind:value={form.amount}
            placeholder="0.00"
            required
            class="w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm outline-none focus:border-[#7a6550]"
          />
        </div>

        <div class="space-y-2">
          <label for="date" class="text-sm font-semibold text-[#5c4a3d]">Date (DD/MM/YYYY) *</label>
          <input
            id="date"
            type="text"
            bind:value={form.date}
            placeholder="DD/MM/YYYY"
            required
            class="w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm outline-none focus:border-[#7a6550]"
          />
        </div>

        <div class="space-y-2">
          <label for="ref" class="text-sm font-semibold text-[#5c4a3d]">Reference Number</label>
          <input
            id="ref"
            type="text"
            bind:value={form.referenceNumber}
            placeholder="Optional"
            class="w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm outline-none focus:border-[#7a6550]"
          />
        </div>

        <div class="space-y-2">
          <label for="category" class="text-sm font-semibold text-[#5c4a3d]">Category *</label>
          <select
            id="category"
            bind:value={form.category}
            required
            class="w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm outline-none focus:border-[#7a6550]"
          >
            <option value="" disabled>Select Category</option>
            {#each categories as cat}
              <option value={cat}>{cat}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2">
          <label for="department" class="text-sm font-semibold text-[#5c4a3d]">Department *</label>
          <select
            id="department"
            bind:value={form.department}
            required
            class="w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm outline-none focus:border-[#7a6550]"
          >
            <option value="" disabled>Select Department</option>
            {#each departments as dep}
              <option value={dep}>{dep}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2">
          <label for="supplier" class="text-sm font-semibold text-[#5c4a3d]">Supplier</label>
          <select
            id="supplier"
            bind:value={form.supplierId}
            class="w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm outline-none focus:border-[#7a6550]"
          >
            <option value="">None</option>
            {#each suppliers as sup}
              <option value={sup.id}>{sup.name}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2">
          <label for="bank" class="text-sm font-semibold text-[#5c4a3d]">Bank Account</label>
          <select
            id="bank"
            bind:value={form.bankAccount}
            class="w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm outline-none focus:border-[#7a6550]"
          >
            <option value="">Not Specified</option>
            {#each bankAccounts as bank}
              <option value={bank}>{bank}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2">
          <label for="method" class="text-sm font-semibold text-[#5c4a3d]">Payment Method</label>
          <select
            id="method"
            bind:value={form.paymentMethod}
            class="w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm outline-none focus:border-[#7a6550]"
          >
            {#each paymentMethods as method}
              <option value={method}>{method}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2">
          <label for="notes" class="text-sm font-semibold text-[#5c4a3d]">Notes</label>
          <input
            id="notes"
            type="text"
            bind:value={form.notes}
            placeholder="Optional"
            class="w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-2 text-sm outline-none focus:border-[#7a6550]"
          />
        </div>
      </div>

      <Dialog.Footer class="mt-8 flex gap-3">
        <button
          type="button"
          onclick={onClose}
          class="flex-1 rounded-full border border-[#d8c9bb] py-3 text-sm font-semibold text-[#7a6550] hover:bg-[#f6f1eb]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          class="flex-[2] rounded-full bg-[#7a6550] py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Submitting...' : 'Add Expense'}
        </button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
