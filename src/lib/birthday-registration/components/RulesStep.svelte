<script lang="ts">
  interface Props {
    accepted: boolean;
  }

  let { accepted = $bindable() }: Props = $props();

  const rules = [
    {
      title: 'Parental Supervision Required',
      desc: 'Parents or adult hosts are fully responsible for supervising children at all times during the event to ensure safety.'
    },
    {
      title: 'Arrival and Setup Timing',
      desc: 'Please arrive exactly 15 minutes early. This ensures we can welcome you and complete any setup before your guests start arriving.'
    },
    {
      title: 'No Outside Food & Drinks',
      desc: 'Outside catering is not permitted. Exceptions are made only for custom birthday cakes, wine (corkage may apply), or pre-approved dietary items.'
    },
    {
      title: 'Guest Count & Safety Caps',
      desc: 'Full Hosted includes up to 15 children. If more children arrive, each additional child is charged according to the selected package.'
    },
    {
      title: 'Additional Food Orders',
      desc: 'If the party needs more food, Casa Luma may prepare additional items at a fixed cost per item ordered.'
    }
  ];
</script>

<div class="space-y-6 mt-2 sm:mt-4 w-full max-w-lg mx-auto pb-12">
  <div class="text-center space-y-2 mb-4">
    <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Casa Luma Policies</p>
    <p class="text-sm text-muted-foreground">Please review our venue guidelines for a safe and happy celebration.</p>
  </div>

  <div class="space-y-4">
    {#each rules as rule}
      <div class="p-4 sm:p-5 rounded-2xl border border-muted bg-muted/5 flex items-start gap-4">
        <div class="shrink-0 mt-1 size-1.5 rounded-full bg-primary/40"></div>
        <div class="space-y-1">
          <span class="text-sm sm:text-base font-bold text-foreground block">{rule.title}</span>
          <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">{rule.desc}</p>
        </div>
      </div>
    {/each}
  </div>

  <div class="pt-4">
    <button
      onclick={() => { accepted = !accepted; }}
      class="w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 group
        {accepted ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' : 'border-muted-foreground/20 bg-background hover:border-primary/30'}"
    >
      <div class="shrink-0 size-7 rounded-lg border-2 flex items-center justify-center transition-all
        {accepted ? 'bg-primary border-primary text-primary-foreground scale-110' : 'border-muted-foreground/30 bg-background group-hover:border-primary/50'}"
      >
        {#if accepted}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
        {/if}
      </div>
      <span class="text-sm sm:text-base font-extrabold text-foreground text-left leading-tight">
        I have read and agree to all venue rules above, including extra child charges above 15 kids for Full Hosted and any additional food items ordered.
      </span>
    </button>
  </div>
</div>
