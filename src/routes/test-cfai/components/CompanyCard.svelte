<script lang="ts">
    import type { Company } from '../data';
    import { ExternalLink, QrCode } from 'lucide-svelte';

    let { company, onclick }: { company: Company; onclick: (c: Company) => void } = $props();
</script>

<button 
    class="flex flex-col text-right bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all h-full border border-gray-100 group relative"
    onclick={() => onclick(company)}
>
    <!-- Top accent ribbon -->
    <div class="h-1 bg-[#00A890] w-full absolute top-0 left-0 right-0"></div>
    
    <div class="h-32 bg-gradient-to-br from-gray-50 to-[#00A890]/5 flex items-center justify-center p-6 w-full mt-1">
        {#if company.logo}
            <img src={company.logo} alt={company.name} class="max-h-full max-w-full object-contain" />
        {:else}
            <div class="text-[#00A890]/30">
                <QrCode class="w-12 h-12" strokeWidth={1} />
            </div>
        {/if}
    </div>
    
    <div class="p-5 flex-1 flex flex-col gap-2">
        <h3 class="text-lg font-bold text-gray-900 group-hover:text-[#00A890] transition-colors">{company.name}</h3>
        <p class="text-sm text-gray-500 line-clamp-2">{company.description}</p>
        
        <div class="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
            <div class="flex flex-wrap gap-1.5">
                {#each company.tags as tag}
                    <span class="text-[10px] px-2.5 py-1 bg-[#00A890]/5 rounded text-[#00A890]/70 uppercase tracking-wider font-medium">{tag}</span>
                {/each}
            </div>
            <div class="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-[#ee9129] flex items-center justify-center transition-all">
                <ExternalLink class="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" strokeWidth={1.5} />
            </div>
        </div>
    </div>
</button>
