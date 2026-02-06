<script lang="ts">
  import { type Snippet } from 'svelte';
  import { ChevronRight, ChevronLeft } from 'lucide-svelte';
  import { fade } from 'svelte/transition';

  interface Props {
    title: string;
    explainer?: string;
    required?: boolean;
    showSkip?: boolean;
    showBack?: boolean;
    nextDisabled?: boolean;
    onNext: () => void;
    onSkip?: () => void;
    onBack?: () => void;
    currentStep: number;
    totalSteps: number;
    children: Snippet;
  }

  let {
    title,
    explainer,
    required = false,
    showSkip = false,
    showBack = true,
    nextDisabled = false,
    onNext,
    onSkip,
    onBack,
    currentStep,
    totalSteps,
    children
  }: Props = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !nextDisabled) {
      // Prevent form submission if inside a form, though we aren't using one
      event.preventDefault();
      onNext();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="h-dvh w-full flex flex-col bg-background text-foreground overflow-hidden font-sans">
  <!-- Top: Progress indicator (subtle dots) -->
  <div class="flex-shrink-0 flex justify-center gap-1.5 py-4 sm:py-6">
    {#each Array(totalSteps) as _, i}
      <div 
        class="size-1.5 rounded-full transition-all duration-300 {i === currentStep ? 'bg-primary w-4' : 'bg-muted-foreground/20'}"
      ></div>
    {/each}
  </div>

  <!-- Center: Title + Content + Explainer -->
  <div class="flex-1 overflow-y-auto px-6 flex flex-col items-center">
    <div class="w-full max-w-xl flex flex-col py-4 sm:py-8 min-h-full">
      <div class="space-y-3 sm:space-y-4 mb-4 sm:mb-8 text-center">
        <h1 class="text-xl sm:text-3xl font-bold tracking-tight text-balance first-letter:capitalize">
          {title}
          {#if required}
            <span class="text-primary ml-1">*</span>
          {/if}
        </h1>
        
        {#if explainer}
          <div class="flex justify-center">
            <div class="p-2 sm:p-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-secondary/5 border border-secondary/20 flex items-center gap-2 sm:gap-3 transition-all group shadow-sm shadow-secondary/5">
              <div class="flex-shrink-0 size-5 sm:size-6 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lightbulb sm:w-[14px] sm:h-[14px]"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
              </div>
              <p class="text-[10px] sm:text-sm text-muted-foreground leading-relaxed font-medium italic">
                {explainer}
              </p>
            </div>
          </div>
        {/if}
      </div>

      <div class="flex-1">
        {@render children()}
      </div>
    </div>
  </div>

  <!-- Bottom: Button row -->
  <div class="flex-shrink-0 p-4 sm:p-6 border-t bg-background/80 backdrop-blur-md">
    <div class="max-w-xl mx-auto flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        {#if showBack}
          <button
            onclick={onBack}
            class="p-2 sm:p-4 rounded-full hover:bg-muted transition-colors flex items-center justify-center gap-2 text-muted-foreground"
            aria-label="Go back"
          >
            <ChevronLeft class="size-5 sm:size-6" />
            <span class="hidden sm:inline font-medium">Back</span>
          </button>
        {/if}
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        {#if showSkip}
          <button
            onclick={onSkip}
            class="px-4 sm:px-6 py-2 sm:py-4 rounded-full text-muted-foreground hover:text-foreground transition-colors font-medium text-sm sm:text-base"
          >
            Skip
          </button>
        {/if}

        <button
          onclick={onNext}
          disabled={nextDisabled}
          class="bg-primary text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:scale-100"
        >
          <span>{currentStep === totalSteps - 1 ? 'Submit' : 'Next'}</span>
          <ChevronRight class="size-4 sm:size-5" />
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  /* Custom scrollbar for the content area */
  div::-webkit-scrollbar {
    width: 4px;
  }
  div::-webkit-scrollbar-track {
    background: transparent;
  }
  div::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.1);
    border-radius: 10px;
  }
  div::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.2);
  }
</style>
