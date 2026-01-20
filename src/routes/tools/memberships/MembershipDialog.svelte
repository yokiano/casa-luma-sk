<script lang="ts">
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog';
	import { cn } from '$lib/utils';
	import { createMembership, updateMembership } from '$lib/memberships.remote';
	import { MEMBERSHIPS_PROP_VALUES } from '$lib/notion-sdk/dbs/memberships/constants';
	import MembershipForm from './MembershipForm.svelte';

	type FamilySummary = {
		id: string;
		familyName: string;
		customerCode: string | null;
		mainPhone: string | null;
	};

	type MembershipItem = {
		id: string;
		name: string;
		type: 'Weekly' | 'Monthly' | null;
		numberOfKids: number | null;
		startDate: string | null;
		endDate: string | null;
		status: string | null;
		notes: string | null;
		createdTime: string;
		family: FamilySummary | null;
	};

	interface Props {
		class?: string;
		mode?: 'create' | 'edit';
		membership?: MembershipItem | null;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		onSaved?: (item: MembershipItem) => void;
	}

	let {
		class: className,
		mode = 'create',
		membership = null,
		open = $bindable(false),
		onOpenChange,
		onSaved
	}: Props = $props();

	const getTodayDate = () => {
		const today = new Date();
		return today.toISOString().split('T')[0];
	};

	let isSubmitting = $state(false);
	let selectedFamily = $state<FamilySummary | null>(null);
	let membershipType = $state<'Weekly' | 'Monthly'>(MEMBERSHIPS_PROP_VALUES.type[0]);
	let numberOfKids = $state<number>(1);
	let startDate = $state<string>(getTodayDate());
	let endDate = $state<string>('');
	let endDateOverridden = $state<boolean>(false);
	let notes = $state<string>('');
	let errorMessage = $state<string | null>(null);

	const isEditMode = $derived(mode === 'edit');

	// Auto-calculate end date when start date or type changes (unless overridden)
	const calculatedEndDate = $derived.by(() => {
		if (!startDate) return '';
		const startDateObj = new Date(startDate);
		if (Number.isNaN(startDateObj.getTime())) return '';

		const endDateObj = new Date(startDateObj);
		if (membershipType === 'Weekly') {
			endDateObj.setDate(endDateObj.getDate() + 7);
		} else if (membershipType === 'Monthly') {
			endDateObj.setMonth(endDateObj.getMonth() + 1);
		}

		return endDateObj.toISOString().split('T')[0];
	});

	// Update endDate when calculated changes (unless manually overridden)
	$effect(() => {
		if (!endDateOverridden && calculatedEndDate) {
			endDate = calculatedEndDate;
		}
	});

	const handleResetEndDate = () => {
		endDateOverridden = false;
		endDate = calculatedEndDate;
	};
	const dialogTitle = $derived(isEditMode ? 'Edit Membership' : 'Create Membership');
	const dialogDescription = $derived(
		isEditMode
			? 'Update membership details for this family.'
			: 'Link a family, choose a membership type, and set the duration details.'
	);
	const submitLabel = $derived(isEditMode ? 'Save Changes' : 'Create Membership');

	const resetForm = () => {
		selectedFamily = null;
		membershipType = MEMBERSHIPS_PROP_VALUES.type[0];
		numberOfKids = 1;
		startDate = getTodayDate();
		endDateOverridden = false;
		endDate = '';
		notes = '';
		errorMessage = null;
	};

	const loadMembership = (m: MembershipItem | null) => {
		if (!m) {
			resetForm();
			return;
		}
		selectedFamily = m.family;
		membershipType = m.type ?? MEMBERSHIPS_PROP_VALUES.type[0];
		numberOfKids = m.numberOfKids ?? 1;
		startDate = m.startDate ?? getTodayDate();
		// If the existing end date differs from calculated, it was overridden
		const existingEndDate = m.endDate ?? '';
		endDate = existingEndDate;
		
		// Calculate what the end date should be based on the loaded values
		// We use the helper function instead of the derived calculatedEndDate to avoid 
		// creating a dependency that would cause this effect to re-run when local state changes
		const calculated = calculateEndDate(startDate, membershipType) ?? '';
		endDateOverridden = existingEndDate !== '' && existingEndDate !== calculated;
		
		notes = m.notes ?? '';
		errorMessage = null;
	};

	// Load membership data when it changes (for edit mode)
	$effect(() => {
		if (open && mode === 'edit' && membership) {
			loadMembership(membership);
		} else if (open && mode === 'create') {
			resetForm();
		}
	});

	const handleSubmit = async () => {
		if (!selectedFamily) {
			errorMessage = 'Please select a family.';
			return;
		}
		if (!membershipType) {
			errorMessage = 'Please select a membership type.';
			return;
		}
		if (!numberOfKids || numberOfKids < 1) {
			errorMessage = 'Number of kids must be at least 1.';
			return;
		}

		errorMessage = null;
		isSubmitting = true;

		try {
			let result: { item: MembershipItem };

			if (isEditMode && membership) {
				result = await updateMembership({
					id: membership.id,
					familyId: selectedFamily.id,
					type: membershipType,
					numberOfKids,
					startDate: startDate.trim() ? startDate : undefined,
					endDate: endDate.trim() ? endDate : undefined,
					notes: notes.trim() ? notes.trim() : undefined
				});
				toast.success('Membership updated successfully.');
			} else {
				result = await createMembership({
					familyId: selectedFamily.id,
					type: membershipType,
					numberOfKids,
					startDate: startDate.trim() ? startDate : undefined,
					endDate: endDate.trim() ? endDate : undefined,
					notes: notes.trim() ? notes.trim() : undefined
				});
				toast.success('Membership created successfully.');
			}

			onSaved?.(result.item);
			open = false;
			onOpenChange?.(false);
			resetForm();
		} catch (error) {
			console.error('memberships: save membership failed', error);
			toast.error(isEditMode ? 'Failed to update membership. Try again.' : 'Failed to create membership. Try again.');
		} finally {
			isSubmitting = false;
		}
	};

	const handleClose = () => {
		open = false;
		onOpenChange?.(false);
		resetForm();
	};
</script>

<Dialog.Root bind:open onOpenChange={(o) => onOpenChange?.(o)}>
	{#if mode === 'create'}
		<Dialog.Trigger
			class={cn(
				'flex items-center justify-center rounded-full bg-[#7a6550] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-md transition hover:bg-[#6d5a47]',
				className
			)}
		>
			New Membership
		</Dialog.Trigger>
	{/if}
	<Dialog.Content class="border-[#e3d7cc] bg-[#fdfbf9] sm:max-w-[520px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-semibold text-[#5c4a3d]">{dialogTitle}</Dialog.Title>
			<Dialog.Description class="text-sm text-[#7a6550]/80">
				{dialogDescription}
			</Dialog.Description>
		</Dialog.Header>

		<MembershipForm
			bind:selectedFamily
			bind:membershipType
			bind:numberOfKids
			bind:startDate
			bind:endDate
			bind:endDateOverridden
			bind:notes
			{errorMessage}
			onResetEndDate={handleResetEndDate}
		/>

		<Dialog.Footer class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
			<button
				type="button"
				class="rounded-full border border-[#d9d0c7] px-4 py-2 text-sm font-medium text-[#7a6550] transition hover:bg-white"
				onclick={handleClose}
				disabled={isSubmitting}
			>
				Cancel
			</button>
			<button
				type="button"
				class="rounded-full bg-[#2c2925] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1f1d1a] disabled:cursor-not-allowed disabled:opacity-60"
				onclick={handleSubmit}
				disabled={isSubmitting}
			>
				{isSubmitting ? 'Saving...' : submitLabel}
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
