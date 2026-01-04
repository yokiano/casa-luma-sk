<script lang="ts">
    interface Props {
        sop: {
            name: string;
            department?: string;
            when?: string;
            blocks: any[];
        };
    }

    let { sop }: Props = $props();
</script>

<!-- A5 Size container approximately (148mm x 210mm) but fitting 4 on A4 means A6 actually (105x148). 
     Assuming the user means printing "2 pages per sheet" twice or "4 pages per sheet" via printer settings. 
     We optimize for compact single page first. -->
<div class="mx-auto w-full bg-white p-4 print:p-0 relative text-xs">
    
    <!-- Header -->
    <header class="mb-4 border-b border-neutral-300 print:border-black pb-2 flex justify-between items-end">
        <div>
            <h1 class="text-lg font-bold tracking-tight uppercase text-neutral-800 leading-none">{sop.name}</h1>
            <p class="text-[10px] text-neutral-500 mt-1">{sop.department || 'General / ทั่วไป'} · {sop.when || ''}</p>
        </div>
        <div class="text-right">
            <p class="text-[10px] uppercase tracking-widest text-neutral-400">Casa Luma</p>
        </div>
    </header>

    <div class="flex gap-4">
        <!-- Column 1: Checklist Content (65%) -->
        <div class="w-[60%] space-y-2 notion-content">
            {#each sop.blocks as block}
                {#if block.type === 'to_do'}
                    <div class="flex items-start gap-2 py-0.5 break-inside-avoid">
                        <div class="h-3 w-3 border border-neutral-400 print:border-black rounded-[2px] flex-shrink-0 mt-0.5"></div>
                        <div class="text-[11px] leading-tight pt-0.5">
                            {#each block.to_do.rich_text as text}
                                <span class="{text.annotations.bold ? 'font-bold' : ''} {text.annotations.italic ? 'italic' : ''} {text.annotations.strikethrough ? 'line-through' : ''} {text.annotations.underline ? 'underline' : ''}"
                                >{text.plain_text}</span>
                            {/each}
                        </div>
                    </div>
                {:else if block.type === 'heading_1'}
                    <h2 class="text-sm font-bold uppercase tracking-tight text-neutral-800 mt-3 mb-1 border-b border-neutral-200 pb-0.5 break-after-avoid">
                        {#each block.heading_1.rich_text as text}
                            {text.plain_text}
                        {/each}
                    </h2>
                {:else if block.type === 'heading_2'}
                    <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-700 mt-2 mb-1 break-after-avoid">
                        {#each block.heading_2.rich_text as text}
                            {text.plain_text}
                        {/each}
                    </h3>
                {:else if block.type === 'heading_3'}
                     <h4 class="text-[11px] font-bold uppercase tracking-wider text-neutral-600 mt-2 mb-0.5 break-after-avoid">
                        {#each block.heading_3.rich_text as text}
                            {text.plain_text}
                        {/each}
                    </h4>
                {:else if block.type === 'paragraph'}
                    {#if block.paragraph.rich_text.length > 0}
                        <p class="text-[10px] text-neutral-600 mb-1">
                            {#each block.paragraph.rich_text as text}
                                <span class="{text.annotations.bold ? 'font-bold' : ''} {text.annotations.italic ? 'italic' : ''} {text.annotations.strikethrough ? 'line-through' : ''} {text.annotations.underline ? 'underline' : ''}"
                                >{text.plain_text}</span>
                            {/each}
                        </p>
                    {:else}
                        <div class="h-1"></div>
                    {/if}
                {:else if block.type === 'bulleted_list_item'}
                     <div class="flex items-start gap-2 py-0.5 ml-2">
                        <div class="h-1 w-1 bg-neutral-400 rounded-full flex-shrink-0 mt-1.5"></div>
                        <div class="text-[10px] leading-tight">
                            {#each block.bulleted_list_item.rich_text as text}
                                <span class="{text.annotations.bold ? 'font-bold' : ''} {text.annotations.italic ? 'italic' : ''} {text.annotations.strikethrough ? 'line-through' : ''} {text.annotations.underline ? 'underline' : ''}"
                                >{text.plain_text}</span>
                            {/each}
                        </div>
                    </div>
                 {:else if block.type === 'numbered_list_item'}
                     <div class="flex items-start gap-2 py-0.5 ml-2 numbered-item">
                        <div class="text-[10px] leading-tight">
                            {#each block.numbered_list_item.rich_text as text}
                                <span class="{text.annotations.bold ? 'font-bold' : ''} {text.annotations.italic ? 'italic' : ''} {text.annotations.strikethrough ? 'line-through' : ''} {text.annotations.underline ? 'underline' : ''}"
                                >{text.plain_text}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
            {/each}
        </div>

        <!-- Column 2: Signatures & Requests (35%) -->
        <div class="w-[40%] flex flex-col gap-4 border-l border-neutral-200 pl-4 print:border-gray-300">
            
            <!-- Signatures -->
            <div class="space-y-4">
                <div>
                    <h3 class="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Sign-off / ลงชื่อ</h3>
                    <!-- Opening -->
                    <div class="mb-3">
                        <div class="text-[9px] uppercase tracking-wide text-neutral-400 mb-1">Opened By / ผู้เปิด</div>
                        <div class="border-b border-neutral-300 print:border-black h-6"></div>
                        <div class="flex gap-2 mt-1">
                            <div class="w-1/2 border-b border-neutral-300 print:border-black h-6"></div> <!-- Time -->
                            <div class="w-1/2 text-[9px] text-neutral-400 self-end text-right">Time / เวลา</div>
                        </div>
                    </div>
                    <!-- Closing -->
                    <div>
                        <div class="text-[9px] uppercase tracking-wide text-neutral-400 mb-1">Closed By / ผู้ปิด</div>
                        <div class="border-b border-neutral-300 print:border-black h-6"></div>
                        <div class="flex gap-2 mt-1">
                            <div class="w-1/2 border-b border-neutral-300 print:border-black h-6"></div> <!-- Time -->
                            <div class="w-1/2 text-[9px] text-neutral-400 self-end text-right">Time / เวลา</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Restock Request -->
            <div class="flex-1 flex flex-col">
                <h3 class="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Re-stock / Maint. / เติมของ / ซ่อมบำรุง</h3>
                <div class="space-y-2 flex-1">
                    {#each Array(8) as _}
                        <div class="flex items-end gap-2">
                            <div class="flex-grow border-b border-neutral-300 print:border-black h-5"></div>
                            <div class="w-10 border-b border-neutral-300 print:border-black h-5 text-[8px] text-neutral-400 text-right">Qty / จำนวน</div>
                        </div>
                    {/each}
                </div>
                <div class="mt-4">
                     <div class="text-[9px] uppercase tracking-wide text-neutral-400 mb-1">Req. By / ผู้ขอ</div>
                     <div class="border-b border-neutral-300 print:border-black h-5"></div>
                </div>
            </div>

        </div>
    </div>
</div>

<style>
    /* CSS Counter for numbered lists */
    .notion-content {
        counter-reset: numbered-list;
    }
    
    .numbered-item {
        counter-increment: numbered-list;
    }

    .numbered-item::before {
        content: counter(numbered-list) ".";
        font-size: 0.7rem; 
        line-height: 1rem;
        color: oklch(0.556 0 0);
        font-weight: 500;
        min-width: 0.75rem;
    }

    @media print {
        @page {
            /* Remove margins to maximize printable area for N-up printing */
            margin: 0;
            size: auto; 
        }
        
        :global(body) {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
    }
</style>
