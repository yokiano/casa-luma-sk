<script lang="ts">
  import IntakeForm from '$lib/components/intake/IntakeForm.svelte';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';../$types.js

  let { data } = $props();

  onMount(() => {
    // If authorized and the secret is still in the URL, remove it
    if (data.authorized && $page.url.searchParams.has('secret')) {
      const newUrl = new URL($page.url);
      newUrl.searchParams.delete('secret');
      replaceState(newUrl, $page.state);
    }
  });
</script>

{#if data.authorized}
  <IntakeForm />
{:else}
  <div class="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
    <div class="mb-6 rounded-full bg-secondary/10 p-6 text-primary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-map-pin"
      >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </div>
    <h1 class="mb-4 text-2xl font-bold text-foreground">
      In-Person Access Only
    </h1>
    <p class="max-w-md text-muted-foreground">
      This form is accessible only when visiting Casa Luma in person. Please scan the QR code provided at the location.
    </p>
  </div>
{/if}
