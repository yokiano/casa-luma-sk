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
      "קאסה לומה אינה אחראית לכל פציעה או תאונה בשטח המקום. הורים ואפוטרופוסים אחראים באופן מלא לבטיחות ילדיהם.",
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
        <span class="size-6 flex items-center justify-center">
          {#if lang === 'HE'}
            {@render israelIcon()}
          {:else if lang === 'RU'}
            {@render russiaIcon()}
          {:else}
            {@render englandIcon()}
          {/if}
        </span>
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

{#snippet israelIcon()}
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#eee" d="M0 0h512v55.7l-25 32.7l25 34v267.2l-26 36l26 30.7V512H0v-55.7l24.8-34.1L0 389.6V122.4l27.2-33.2L0 55.7z"/><path fill="#0052b4" d="M0 55.7v66.7h512V55.7zm0 333.9v66.7h512v-66.7zm352.4-189.3H288l-32-55.6l-32.1 55.6h-64.3l32.1 55.7l-32 55.7h64.2l32.1 55.6l32.1-55.6h64.3L320.3 256l32-55.7zm-57 55.7l-19.7 34.2h-39.4L216.5 256l19.8-34.2h39.4l19.8 34.2zM256 187.6l7.3 12.7h-14.6zm-59.2 34.2h14.7l-7.4 12.7zm0 68.4l7.3-12.7l7.4 12.7zm59.2 34.2l-7.3-12.7h14.6zm59.2-34.2h-14.7l7.4-12.7zm-14.7-68.4h14.7l-7.3 12.7z"/></g></svg>
{/snippet}

{#snippet russiaIcon()}
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#0052b4" d="M512 170v172l-256 32L0 342V170l256-32z"/><path fill="#eee" d="M512 0v170H0V0Z"/><path fill="#d80027" d="M512 342v170H0V342Z"/></g></svg>
{/snippet}

{#snippet englandIcon()}
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><mask id="SVGuywqVbel"><circle cx="256" cy="256" r="256" fill="#fff"/></mask><g mask="url(#SVGuywqVbel)"><path fill="#eee" d="m0 0l8 22l-8 23v23l32 54l-32 54v32l32 48l-32 48v32l32 54l-32 54v68l22-8l23 8h23l54-32l54 32h32l48-32l48 32h32l54-32l54 32h68l-8-22l8-23v-23l-32-54l32-54v-32l-32-48l32-48v-32l-32-54l32-54V0l-22 8l-23-8h-23l-54 32l-54-32h-32l-48 32l-48-32h-32l-54 32L68 0z"/><path fill="#0052b4" d="M336 0v108L444 0Zm176 68L404 176h108zM0 176h108L0 68ZM68 0l108 108V0Zm108 512V404L68 512ZM0 444l108-108H0Zm512-108H404l108 108Zm-68 176L336 404v108z"/><path fill="#d80027" d="M0 0v45l131 131h45zm208 0v208H0v96h208v208h96V304h208v-96H304V0zm259 0L336 131v45L512 0zM176 336L0 512h45l131-131zm160 0l176 176v-45L381 336z"/></g></svg>
{/snippet}

<style>
  /* Ensure smooth transitions for RTL change */
  div {
    transition: direction 0.3s ease;
  }
</style>
