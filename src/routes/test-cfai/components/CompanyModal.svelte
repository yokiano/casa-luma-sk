<script lang="ts">
    import type { Company } from '../data';
    import { fade, scale } from 'svelte/transition';
    import { X, ExternalLink, QrCode } from 'lucide-svelte';

    let { company, onclose }: { company: Company | null; onclose: () => void } = $props();
</script>

{#if company}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        onclick={onclose}
        transition:fade={{ duration: 200 }}
    >
        <!-- Modal -->
        <div 
            class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onclick={(e) => e.stopPropagation()}
            transition:scale={{ duration: 300, start: 0.95 }}
            dir="rtl"
        >
            <!-- Top accent bar -->
            <div class="h-1 bg-[#00A890] w-full rounded-t-2xl"></div>

            <!-- Close Button -->
            <button 
                class="absolute left-4 top-5 p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                onclick={onclose}
                aria-label="סגור"
            >
                <X class="w-6 h-6" strokeWidth={1.5} />
            </button>

            <div class="p-8">
                <div class="flex flex-col md:flex-row gap-6 items-start">
                    <div class="w-24 h-24 bg-gray-50 rounded-xl flex items-center justify-center p-4 shrink-0 border border-gray-100">
                        {#if company.logo}
                            <img src={company.logo} alt={company.name} class="max-h-full max-w-full object-contain" />
                        {:else}
                            <QrCode class="w-10 h-10 text-gray-300" strokeWidth={1} />
                        {/if}
                    </div>

                    <div class="flex-1">
                        <h2 class="text-2xl font-bold text-gray-900 mb-3">{company.name}</h2>
                        <div class="flex flex-wrap gap-2">
                            {#each company.tags as tag}
                                <span class="text-xs px-3 py-1.5 bg-[#00A890]/10 rounded text-[#00A890] font-medium uppercase tracking-wider">{tag}</span>
                            {/each}
                        </div>
                    </div>
                </div>

                <!-- Decorative line -->
                <div class="flex items-center gap-3 my-6">
                    <div class="w-2 h-2 rounded-full bg-[#ee9129]"></div>
                    <div class="h-px bg-gray-200 flex-1"></div>
                </div>

                <div class="space-y-6">
                    <div>
                        <h4 class="text-sm font-semibold text-[#00A890] mb-3">אודות החברה</h4>
                        <p class="text-gray-600 leading-relaxed">
                            {company.longDescription}
                        </p>
                    </div>

                    {#if company.website}
                        <div class="pt-4">
                            <a 
                                href={company.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                class="inline-flex items-center gap-2 border-2 border-[#00A890] text-[#00A890] px-6 py-3 rounded-xl font-semibold hover:bg-[#00A890] hover:text-white transition-all"
                            >
                                ביקור באתר החברה
                                <ExternalLink class="w-5 h-5" strokeWidth={1.5} />
                            </a>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}
