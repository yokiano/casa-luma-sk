<script lang="ts">
	import { ExternalLink } from 'lucide-svelte';

	interface Props {
		customerId?: string | null;
		label?: string;
		variant?: 'primary' | 'subtle';
		class?: string;
	}

	let {
		customerId = null,
		label = 'View customer receipts',
		variant = 'primary',
		class: className = ''
	}: Props = $props();

	const href = $derived.by(() => {
		if (!customerId) return '/tools/receipts';
		const params = new URLSearchParams({
			customerId,
			tab: 'receipts',
			view: 'compact',
			sortOrder: 'desc'
		});
		return `/tools/receipts?${params.toString()}`;
	});

	const baseClass = 'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition';
	const variantClass = $derived(
		variant === 'primary'
			? 'bg-[#7a6550] px-4 py-2 text-white hover:bg-[#6a5847]'
			: 'border border-[#d9d0c7] bg-white px-3 py-2 text-[#7a6550] hover:bg-[#fdfbf9]'
	);
</script>

{#if customerId}
	<a class={`${baseClass} ${variantClass} ${className}`} {href} title="View all receipts for this customer">
		<span>{label}</span>
		<ExternalLink size={14} />
	</a>
{/if}
