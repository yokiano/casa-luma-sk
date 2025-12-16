<script lang="ts">
	import { getEmployees, type PublicEmployee } from '$lib/employees.remote';
	import FloatingShapes3 from '$lib/components/workshops/FloatingShapes3.svelte';
	
	let team = $state(await getEmployees());

	// Define the order and display names for departments
	const departmentOrder = [
		{ id: 'Management', label: 'Leadership' },
		{ id: 'Open Play', label: 'Play Supervisors' },
		{ id: 'Café', label: 'Café & Kitchen' },
		{ id: 'Marketing', label: 'Marketing' },
		{ id: 'Maintenance', label: 'Maintenance' }
	];

	const groupedTeam = $derived.by(() => {
		const groups: Record<string, PublicEmployee[]> = {};
		
		// Initialize groups
		departmentOrder.forEach(d => groups[d.id] = []);
		
		// Add "Other" group for anyone else
		groups['Other'] = [];

		team.forEach(employee => {
			const dept = employee.department;
			if (dept && groups[dept]) {
				groups[dept].push(employee);
			} else {
				groups['Other'].push(employee);
			}
		});

		return groups;
	});

	function getInitials(name: string) {
		return name
			.split(' ')
			.map(n => n[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	const pastelColors = [
		'bg-rose-100 text-rose-500',
		'bg-orange-100 text-orange-500', 
		'bg-amber-100 text-amber-600',
		'bg-green-100 text-green-600',
		'bg-emerald-100 text-emerald-600',
		'bg-teal-100 text-teal-600',
		'bg-cyan-100 text-cyan-600',
		'bg-sky-100 text-sky-600',
		'bg-indigo-100 text-indigo-600',
		'bg-violet-100 text-violet-600',
		'bg-purple-100 text-purple-600',
		'bg-fuchsia-100 text-fuchsia-600',
		'bg-pink-100 text-pink-600'
	];

	function getColorForName(name: string) {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash) % pastelColors.length;
		return pastelColors[index];
	}
</script>

<div class="relative overflow-hidden bg-background min-h-screen pb-24">
	<!-- Background Elements -->
	<div class="absolute inset-0 z-0 opacity-40 pointer-events-none">
		<FloatingShapes3 />
	</div>

	<!-- Hero -->
	<div class="relative z-10 pt-32 pb-12 px-4 text-center">
		<h1 class="font-serif text-5xl md:text-7xl text-primary mb-6">Meet Our Family</h1>
		<p class="text-xl text-stone-600 max-w-2xl mx-auto font-light leading-relaxed">
			The dedicated team behind the smiles, safe play, and delicious treats at Casa Luma.
		</p>
	</div>

	<!-- Team Sections -->
	<div class="container mx-auto px-4 relative z-10 space-y-24">
		{#each departmentOrder as dept}
			{#if groupedTeam[dept.id] && groupedTeam[dept.id].length > 0}
				<section>
					<div class="flex items-center gap-4 mb-12">
						<h2 class="font-serif text-3xl md:text-4xl text-stone-800">{dept.label}</h2>
						<div class="h-px bg-stone-300 flex-grow"></div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 gap-y-12">
						{#each groupedTeam[dept.id] as member, i}
							{@render employeeCard(member, i)}
						{/each}
					</div>
				</section>
			{/if}
		{/each}

		{#if groupedTeam['Other'].length > 0}
			<section>
				<div class="flex items-center gap-4 mb-12">
					<h2 class="font-serif text-3xl md:text-4xl text-stone-800">Support Team</h2>
					<div class="h-px bg-stone-300 flex-grow"></div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 gap-y-12">
					{#each groupedTeam['Other'] as member, i}
						{@render employeeCard(member, i)}
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>

{#snippet employeeCard(member: PublicEmployee, index: number)}
	<div 
		class="group flex flex-col h-full bg-white/50 backdrop-blur-sm rounded-2xl p-4 transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-1 border border-transparent hover:border-primary/20"
		style="transition-delay: {index * 50}ms"
	>
		<!-- Photo -->
		<div class="aspect-[3/4] mb-6 overflow-hidden rounded-xl bg-stone-100 relative shadow-inner">
			{#if member.photo}
				<img 
					src={member.photo} 
					alt={member.name} 
					class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
					loading="lazy"
				/>
			{:else}
				<div class="absolute inset-0 flex items-center justify-center {getColorForName(member.name)}">
					<span class="text-4xl font-serif font-bold opacity-50 tracking-widest">{getInitials(member.name)}</span>
				</div>
			{/if}
			
			<!-- Floating Roles Badge -->
			{#if member.roles.length > 0}
				<div class="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
					<span class="bg-white/90 backdrop-blur text-xs font-medium px-3 py-1.5 rounded-full text-stone-700 shadow-sm border border-stone-100">
						{member.roles[0]}
					</span>
				</div>
			{/if}
		</div>

		<!-- Info -->
		<div class="text-center flex-grow flex flex-col">
			<h3 class="font-serif text-2xl text-stone-800 mb-1 group-hover:text-primary transition-colors">{member.name}</h3>
			
			<!-- Secondary Roles display if multiple or just clean layout -->
			<p class="text-xs uppercase tracking-widest text-primary/80 font-semibold mb-4 min-h-[1.5em]">
				{member.roles.join(' • ')}
			</p>
			
			<div class="relative">
				<!-- Decorative quote mark -->
				<span class="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full text-5xl text-stone-200 font-serif leading-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">“</span>
				
				<p class="text-sm text-stone-600 leading-relaxed font-light line-clamp-4 group-hover:line-clamp-none transition-all">
					{member.bio || `Part of our wonderful ${member.department || 'team'}.`}
				</p>
			</div>
			
			<!-- Hometown/Languages if available -->
			<div class="mt-auto pt-4 flex flex-wrap gap-2 justify-center text-xs text-stone-400 opacity-60 group-hover:opacity-100 transition-opacity">
				{#if member.hometown}
					<span class="flex items-center gap-1">
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
						{member.hometown}
					</span>
				{/if}
			</div>
		</div>
	</div>
{/snippet}
