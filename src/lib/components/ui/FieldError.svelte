<script lang="ts">
	type Props = {
		message?: string | null;
		forId?: string;
	};

	let { message = null, forId }: Props = $props();
</script>

{#if message}
	<p id={forId ? `${forId}-error` : undefined} class="text-sm font-medium text-red-600" role="alert">
		{message}
	</p>
{/if}

<style>
	:global(.validation-attention) {
		animation: validation-wiggle 0.45s ease-in-out;
	}

	@keyframes validation-wiggle {
		0%, 100% { transform: translateX(0); }
		20%, 60% { transform: translateX(-6px); }
		40%, 80% { transform: translateX(6px); }
	}
</style>
