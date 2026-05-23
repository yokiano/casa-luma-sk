<script lang="ts">
  import IntakeQRCode from "$lib/components/intake/IntakeQRCode.svelte";
</script>

<svelte:head>
  <title>Print QR Code - Casa Luma</title>
</svelte:head>

<div class="min-h-screen bg-[#fdfaf6] py-12">
  <div class="max-w-4xl mx-auto px-4">
    <div class="mb-8 no-print">
      <a 
        href="/customer-intake/print" 
        class="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Back to Registration Form
      </a>
    </div>

    <IntakeQRCode hideFromPrint={false} />
  </div>
</div>

<style>
  @media print {
    :global(body) {
      background-color: white !important;
    }
    .min-h-screen {
      min-height: 0 !important;
      padding: 0 !important;
      background: none !important;
    }
    .max-w-4xl {
      max-width: none !important;
      padding: 0 !important;
    }
  }
</style>
