<script lang="ts">
  import { Users, UsersRound } from 'lucide-svelte';
  import { BIRTHDAY_BASE_PRICING, BIRTHDAY_PACKAGE_DISPLAY_NAMES, formatThb } from '$lib/birthday-pricing';

  interface Props {
    selected: 'up-to-8' | 'up-to-15' | null;
    onSelect: (value: 'up-to-8' | 'up-to-15') => void;
    isSunday: boolean;
  }

  let { selected = $bindable(), onSelect, isSunday }: Props = $props();

  const options = $derived([
    {
      id: 'up-to-8',
      title: BIRTHDAY_PACKAGE_DISPLAY_NAMES.simpleTable,
      description: 'Parent-led garden table for up to 8 kids. Buffet and playground are optional and charged per child when selected.',
      priceImpact: `${formatThb(BIRTHDAY_BASE_PRICING.simpleTable.base)} base fee`,
      extraInfo: 'Buffet +500 THB/child • Playground +320 THB/child',
      icon: Users
    },
    {
      id: 'up-to-15',
      title: BIRTHDAY_PACKAGE_DISPLAY_NAMES.fullHosted,
      description: 'Hosted birthday for up to 15 kids including garden & pool, 3 hours, buffet food, cake, decorations, dedicated waiter, and background music.',
      priceImpact: isSunday
        ? `Base price: ${formatThb(BIRTHDAY_BASE_PRICING.fullHosted.sunday)}`
        : `Base price: ${formatThb(BIRTHDAY_BASE_PRICING.fullHosted.monSat)}`,
      extraInfo: isSunday
        ? `Extra kids: +${formatThb(BIRTHDAY_BASE_PRICING.fullHosted.extraChildSunday)} / child`
        : `Extra kids: +${formatThb(BIRTHDAY_BASE_PRICING.fullHosted.extraChildMonSat)} / child`,
      icon: UsersRound
    }
  ]);
</script>

<div class="grid grid-cols-1 gap-4 sm:gap-6 mt-2 sm:mt-4 w-full max-w-2xl mx-auto pb-8">
  {#each options as opt (opt.id)}
    <button
      onclick={() => onSelect(opt.id as 'up-to-8' | 'up-to-15')}
      class="flex flex-col sm:flex-row items-stretch rounded-[1.5rem] sm:rounded-[2rem] border-2 text-left transition-all overflow-hidden relative group
        {selected === opt.id 
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5 scale-[1.02]' 
          : 'border-muted hover:border-primary/40 hover:bg-muted/30 hover:scale-[1.01]'}"
    >
      <div class="p-6 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-center sm:w-52 border-b sm:border-b-0 sm:border-r border-muted bg-muted/10 shrink-0 gap-3">
        <div class="size-14 rounded-2xl bg-background shadow-md border flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          <opt.icon class="size-7" />
        </div>
        <div class="text-right sm:text-center space-y-1">
          <span class="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Capacity</span>
          <span class="text-sm font-black text-foreground block tracking-tight leading-tight">{opt.priceImpact}</span>
        </div>
      </div>

      <div class="p-6 flex-1 flex flex-col justify-center space-y-2">
        <span class="text-lg sm:text-xl font-bold tracking-tight block">{opt.title}</span>
        <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {opt.description}
        </p>
        <div class="pt-1">
          <span class="inline-block px-2 py-0.5 rounded-md bg-foreground text-background text-[10px] font-bold uppercase tracking-wide shadow-sm">
            {opt.extraInfo}
          </span>
        </div>
        <p class="text-[11px] text-muted-foreground/80 leading-snug">
          Per-child charges are finalized on-site after Casa Luma counts actual child attendance.
        </p>
      </div>
    </button>
  {/each}

</div>
