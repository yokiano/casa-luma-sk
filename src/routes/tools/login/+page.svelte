<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowRight } from 'lucide-svelte';

  let { form } = $props();
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center">
  <div class="w-full max-w-md space-y-8 rounded-2xl bg-white/50 p-8 backdrop-blur-sm border border-[#d3c5b8] shadow-sm">
    <div class="text-center">
      <h2 class="text-2xl font-semibold tracking-tight text-[#7a6550]">
        Restricted Access
      </h2>
      <p class="mt-2 text-sm text-[#7a6550]/70">
        Enter the password to access Casa Luma internal tools.
      </p>
    </div>

    <form method="POST" use:enhance class="mt-8 space-y-6">
      <div class="space-y-2">
        <label for="password" class="sr-only">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="Password"
          class="block w-full rounded-full border border-[#d3c5b8] bg-white px-4 py-3 text-[#2c2925] placeholder-[#7a6550]/40 focus:border-[#7a6550] focus:outline-none focus:ring-1 focus:ring-[#7a6550] transition-all"
        />
        {#if form?.incorrect}
          <p class="text-center text-sm text-red-500">
            Incorrect password. Please try again.
          </p>
        {/if}
      </div>

      <button
        type="submit"
        class="group relative flex w-full justify-center rounded-full bg-[#7a6550] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#635140] focus:outline-none focus:ring-2 focus:ring-[#7a6550] focus:ring-offset-2"
      >
        <span>Enter Tools</span>
        <ArrowRight class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  </div>
</div>

