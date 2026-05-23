<script lang="ts">
  import { onMount } from 'svelte';
  import QRCode from 'qrcode';
  import logo from '$lib/assets/logo/logo-no-sun-transparent.png';
  import { cn } from '$lib/utils';

  const intakeUrl = 'https://www.casalumakpg.com/customer-intake?secret=happycustomer';
  let qrDataUrl = $state('');

  let { hideFromPrint = true } = $props();

  onMount(async () => {
    try {
      qrDataUrl = await QRCode.toDataURL(intakeUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: '#5c4a3d', // Dark brown/charcoal from brand
          light: '#ffffff00' // transparent background
        },
        errorCorrectionLevel: 'H'
      });
    } catch (err) {
      console.error(err);
    }
  });

  function handlePrint() {
    window.print();
  }
</script>

<div 
  class={cn(
    "flex flex-col items-center space-y-8",
    hideFromPrint && "mt-16 pt-12 border-t border-border/50 no-print"
  )}
>
  <div class="text-center space-y-3">
    {#if hideFromPrint}
    <div class="pt-2">
      <a 
        href="/customer-intake/print-qr" 
        class="text-sm font-medium text-primary hover:underline flex items-center justify-center gap-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg>
        Open dedicated QR print page
      </a>
    </div>
    {/if}
  </div>

  <!-- The Card Design -->
  <div 
    id="qr-card"
    class="qr-card-container relative w-full max-w-[520px] bg-[#fdfaf6] border-[2px] border-[#d4af37] rounded-[24px] p-8 shadow-xl overflow-hidden flex flex-col select-all"
  >
    <!-- Double Border Effect -->
    <div class="absolute inset-2.5 border border-[#d4af37]/40 rounded-[18px] pointer-events-none"></div>

    <div class="relative z-10 flex items-center justify-between gap-6">
      <div class="flex flex-col items-start text-left space-y-3">
        <div class="h-20 flex items-center">
          <img src={logo} alt="Casa Luma Logo" class="h-full w-auto object-contain" />
        </div>
        <h2 class="text-[#5c4a3d] font-bold text-2xl tracking-tight leading-tight max-w-[220px]" style="font-family: serif;">
          Family Registration Form
        </h2>
      </div>

      <div class="bg-white p-3 rounded-2xl border border-[#d4af37]/30 shadow-sm">
        {#if qrDataUrl}
          <img src={qrDataUrl} alt="QR Code" class="w-32 h-32" />
        {:else}
          <div class="w-32 h-32 bg-gray-100 animate-pulse rounded-xl"></div>
        {/if}
      </div>
    </div>

    <div class="relative z-10 mt-6 border-t border-[#d4af37]/30 pt-4">
      <p class="text-[#5c4a3d]/70 text-xs font-medium italic leading-tight text-center">
        Information we need for safety measures and improving our services
      </p>
    </div>
  </div>

  <div class="flex flex-col items-center gap-4 pb-12 no-print">
    <button 
      onclick={handlePrint}
      class="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all"
    >
      Print this card
    </button>
    
  </div>
</div>

<style>
  @media print {
    :global(.no-print) {
      display: none !important;
    }
    .mt-16 {
      margin-top: 0 !important;
      padding-top: 0 !important;
      border: none !important;
    }
    #qr-card {
      box-shadow: none !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      margin: 2rem auto;
    }
  }

  .qr-card-container {
    background-image: radial-gradient(circle at 50% 50%, #fdfaf6 0%, #f9f5f0 100%);
  }
</style>
