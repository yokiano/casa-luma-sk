<script lang="ts">
  import { Check } from 'lucide-svelte';
  
  interface Props {
    accepted: boolean;
  }
  
  let { accepted = $bindable() }: Props = $props();

  type Language = 'EN' | 'HE' | 'RU';
  let currentLang = $state<Language>('EN');

  const rules = {
    EN: [
      "Children must be supervised by a parent or guardian at all times. You may not leave the venue without your child.",
      "Casa Luma is not liable for any injuries or accidents on the premises. Parents and guardians are fully responsible for their children's safety.",
      "For everyone's wellbeing, please do not bring children who are sick or showing symptoms of illness."
    ],
    HE: [
      "ילדים חייבים להיות תחת השגחת הורה או אפוטרופוס בכל עת. אין לעזוב את המקום ללא ילדכם.",
      "קאזה לומה אינה אחראית לכל פציעה או תאונה בשטח המקום. הורים ואפוטרופוסים אחראים באופן מלא לבטיחות ילדיהם.",
      "למען רווחת כולם, אנא אל תביאו ילדים חולים או המראים סימני מחלה."
    ],
    RU: [
      "Дети должны находиться под присмотром родителей или опекунов в любое время. Вы не можете покидать заведение без своего ребенка.",
      "Casa Luma не несет ответственности за любые травмы или несчастные случаи на территории. Родители и опекуны несут полную ответственность за безопасность своих детей.",
      "Для всеобщего благополучия, пожалуйста, не приводите детей, которые больны или имеют симптомы заболевания."
    ]
  };

  const labels = {
    EN: { agree: "I agree to the rules", title: "House Rules" },
    HE: { agree: "אני מסכים/ה לכללים", title: "כללי הבית" },
    RU: { agree: "Я согласен с правилами", title: "Правила дома" }
  };
</script>

<div class="w-full space-y-8">
  <!-- Language Switcher -->
  <div class="flex justify-center sm:justify-start">
    <div class="inline-flex p-1 bg-muted/50 rounded-2xl border border-border/50 backdrop-blur-sm">
      {#each ['EN', 'HE', 'RU'] as lang}
        <button
          class="px-5 py-2 rounded-xl text-sm font-bold transition-all {currentLang === lang ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => currentLang = lang as Language}
        >
          {lang}
        </button>
      {/each}
    </div>
  </div>

  <!-- Rules Block -->
  <div class="space-y-6 bg-card/30 rounded-3xl p-8 border border-border/50 relative overflow-hidden group">
    <div class="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
    
    <h2 class="text-xl font-bold tracking-tight mb-4" dir={currentLang === 'HE' ? 'rtl' : 'ltr'}>{labels[currentLang].title}</h2>

    <ol class="space-y-6" dir={currentLang === 'HE' ? 'rtl' : 'ltr'}>
      {#each rules[currentLang] as rule, i}
        <li class="flex gap-4 items-start">
          <span class="flex-shrink-0 size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            {i + 1}
          </span>
          <p class="text-lg leading-relaxed text-foreground/80 font-medium pt-0.5">
            {rule}
          </p>
        </li>
      {/each}
    </ol>
  </div>

  <!-- Acceptance -->
  <button
    onclick={() => accepted = !accepted}
    class="w-full flex items-center justify-center gap-4 p-8 rounded-3xl border-2 transition-all duration-300 group {accepted ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-background text-muted-foreground hover:border-primary/30'}"
  >
    <div class="size-8 rounded-full border-2 flex items-center justify-center transition-all {accepted ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20' : 'border-muted-foreground/30 group-hover:border-primary/50'}">
      {#if accepted}
        <Check class="size-5 stroke-[3]" />
      {/if}
    </div>
    <span class="text-xl font-bold tracking-tight" dir={currentLang === 'HE' ? 'rtl' : 'ltr'}>
      {labels[currentLang].agree}
    </span>
  </button>
</div>

<style>
  /* Ensure smooth transitions for RTL change */
  div {
    transition: direction 0.3s ease;
  }
</style>
