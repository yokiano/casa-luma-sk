<script lang="ts">
	import { Circle, Leaf, Plus, ThumbsUp } from 'lucide-svelte';

	type IconKind = 'recommended' | 'vegan' | 'vegan-option';

	let {
		kind,
		class: className = '',
		title
	}: {
		kind: IconKind;
		class?: string;
		title?: string;
	} = $props();

	const strokeWidth = 2;
</script>

{#if kind === 'vegan'}
	<!-- Single icon -->
	<Leaf class={className} strokeWidth={strokeWidth} />
{:else if kind === 'recommended'}
	<ThumbsUp
		class={className}
		strokeWidth={strokeWidth}
		fill="currentColor"
		aria-hidden={title ? undefined : true}
		aria-label={title}
		role={title ? 'img' : 'presentation'}
		title={title}
	/>
{:else}
	<!-- Composed: leaf + plus-badge -->
	<span
		class={`relative inline-block ${className}`}
		aria-hidden={title ? undefined : true}
		aria-label={title}
		role={title ? 'img' : 'presentation'}
		title={title}
	>
		<Leaf class="absolute inset-0 h-full w-full" strokeWidth={strokeWidth} />

		<!-- badge -->
		<Circle class="absolute -right-[18%] -top-[18%] h-[58%] w-[58%] bg-white" strokeWidth={strokeWidth} />
		<Plus class="absolute -right-[18%] -top-[18%] h-[58%] w-[58%]" strokeWidth={strokeWidth} />
	</span>
{/if}
