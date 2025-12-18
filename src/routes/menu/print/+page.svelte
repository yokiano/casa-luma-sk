<script lang="ts">
	import type { PageData } from './$types';
	import MenuVariant1 from '$lib/components/menu/MenuVariant1.svelte';
	import MenuVariant2 from '$lib/components/menu/MenuVariant2.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="bg-neutral-100 p-8">
	<div class="mx-auto grid w-full max-w-[42cm] gap-12">
		<section class="bg-white p-12 shadow-xl w-full max-w-[21cm] min-h-[29.7cm] mx-auto">
			<MenuVariant1 menu={data.menu} />
		</section>

		<section class="bg-white p-12 shadow-xl w-full max-w-[21cm] min-h-[29.7cm] mx-auto">
			<MenuVariant2 menu={data.menu} />
		</section>
	</div>
</div>
