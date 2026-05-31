<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { FileText, Printer, Copy, Check, ArrowLeft, ChevronDown } from 'lucide-svelte';
  import logo from '$lib/assets/logo/logo-no-sun-transparent.png';
  import * as Popover from "$lib/components/ui/popover";
  import {
    BIRTHDAY_BASE_PRICING,
    BIRTHDAY_PACKAGE_NOTION_LABELS,
    packageLabelToTrack,
    upgradesIncludePlayground
  } from '$lib/birthday-pricing';

  let { data } = $props();
  const b = data.booking;

  const track = $derived(packageLabelToTrack(b.selectedPackage));
  const includePlayground = $derived(upgradesIncludePlayground(b.upgrades));

  const selectedPackageName = $derived(
    track ? BIRTHDAY_PACKAGE_NOTION_LABELS[track] : b.selectedPackage
  );

  const extraChildRate = $derived(
    track === 'mon-sat'
      ? BIRTHDAY_BASE_PRICING.fullHosted.extraChildMonSat
      : track === 'sunday'
        ? BIRTHDAY_BASE_PRICING.fullHosted.extraChildSunday
        : null
  );

  let copied = $state(false);

  // Derive Markdown string representing the contract / summary
  const markdownText = $derived(`### Casa Luma – Birthday Event Summary

**Booking Reference:** ${b.reference}
**Event Date:** ${b.eventDate}
**Start Time:** ${b.startTime} (Duration: 3 hours)
**Celebrant:** ${b.childName} (Turning ${b.turningAge})
**Package Selected:** ${selectedPackageName}
**Expected Guests:** ${b.kidsCount} children

---

#### Contact Information
- **Parent Name:** ${b.parentName}
- **Phone:** ${b.phone}
- **Email:** ${b.email || 'N/A'}

---

#### What’s Included
- Exclusive use of Garden & Pool for 3 hours
- Party waiter & background music
${track === 'smaller-setup' ? '- Custom garden table setup' : '- Included venue decorations & birthday cake\n- Buffet menu & drinks'}
${includePlayground ? '- Indoor playground add-on: **Selected**' : '- Indoor playground: not included'}
${b.upgrades.length > 0 ? `\n**Upgrades Added:**\n${b.upgrades.map(u => `- ${u}`).join('\n')}` : ''}
${b.activities.length > 0 ? `\n**Add-On Activities:**\n${b.activities.map(a => `- ${a}`).join('\n')}` : ''}

---

#### Food & Drinks (Buffet Menu)
${track !== 'smaller-setup' || b.upgrades.some(u => u.includes('Buffet')) ? `- **Starters:** Fresh veggie sticks with dips & chopped salad\n- **Main Course:** ${b.mainCourse || 'Selected mixed sandwiches/nuggets'}\n- **Dessert:** Birthday cake & seasonal fruit platter\n- **Refilled Drinks:** Infused water jar & juice jar` : 'DIY - Parent handles food & beverage (outside wine/items permitted with approval)'}

---

#### Notes & Venue Policies
- Base packages include up to 15 children.${extraChildRate ? ` Extra kids incur a surcharge of ${extraChildRate} THB per child.` : ''}
- Please arrive 15 minutes early for welcoming and setup.
- Parents/hosts are responsible for supervising children at all times.
- Outside catering is not permitted without prior venue authorization.

---

**Estimated Total Quote:** **${b.estimatedTotal.toLocaleString()} THB**
`);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(markdownText);
      copied = true;
      toast.success('Summary copied as markdown to clipboard!');
      setTimeout(() => (copied = false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy to clipboard.');
    }
  }

  function handlePrint() {
    window.print();
  }
</script>

<svelte:head>
  <title>Summary - {b.reference}</title>
  <style>
    @media print {
      @page {
        margin: 1.5cm;
        size: A4;
      }
      body {
        background-color: white !important;
        color: black !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
      .print-box {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
    }
  </style>
</svelte:head>

<div class="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8 no-print font-sans">
  <div class="max-w-5xl mx-auto space-y-6">
    <!-- Top Bar: Navigation -->
    <div class="flex items-center justify-between">
      <a
        href="/birthdays/book"
        class="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft class="size-4" />
        Back to booking form
      </a>
      
      <div class="flex items-center">
        <div class="flex items-center -space-x-px">
          <button
            onclick={handlePrint}
            class="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-l-full text-sm font-semibold shadow-sm transition-all border-r border-primary-foreground/20"
          >
            <Printer class="size-4" />
            <span>Print Summary / PDF</span>
          </button>

          <Popover.Root>
            <Popover.Trigger
              class="inline-flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 px-3 py-2 rounded-r-full text-sm font-semibold shadow-sm transition-all"
            >
              <ChevronDown class="size-4" />
            </Popover.Trigger>
            <Popover.Content class="w-56 p-2 rounded-2xl shadow-xl border-muted-foreground/10" align="end">
              <button
                onclick={copyToClipboard}
                class="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl hover:bg-muted transition-colors text-left"
              >
                {#if copied}
                  <Check class="size-4 text-green-600" />
                  <span class="text-green-600">Copied!</span>
                {:else}
                  <Copy class="size-4 text-muted-foreground" />
                  <span>Copy as Markdown</span>
                {/if}
              </button>
            </Popover.Content>
          </Popover.Root>
        </div>
      </div>
    </div>

    <!-- Main layout: Printable Invoice centered -->
    <div class="flex justify-center">
      
      <!-- High-end Invoice design (Printable area) -->
      <div class="w-full max-w-3xl bg-background rounded-3xl border border-muted-foreground/10 shadow-xl shadow-foreground/2 p-6 sm:p-10 space-y-8 print-box">
        
        <!-- Document Header -->
        <div class="flex justify-between items-start border-b pb-6 border-muted">
          <div class="space-y-2">
            <img src={logo} alt="Casa Luma" class="h-10 w-auto" />
            <p class="text-xs text-muted-foreground italic font-medium">Casa Luma Play Cafe, Koh Phangan</p>
          </div>
          <div class="text-right space-y-1">
            <span class="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">Booking Contract Summary</span>
            <p class="text-xs text-muted-foreground">Reference: <span class="font-bold text-foreground">{b.reference}</span></p>
          </div>
        </div>

        <!-- Party Details HUD -->
        <div class="grid grid-cols-2 gap-6 p-5 bg-muted/20 rounded-2xl">
          <div class="space-y-1">
            <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Celebrant</span>
            <span class="text-base font-bold block text-foreground">{b.childName}</span>
            <span class="text-xs text-muted-foreground block">Turning {b.turningAge} Years Old</span>
          </div>
          <div class="space-y-1">
            <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Date & Time</span>
            <span class="text-base font-bold block text-foreground">{b.eventDate}</span>
            <span class="text-xs text-muted-foreground block">Starting at {b.startTime} (3 hrs)</span>
          </div>
        </div>

        <!-- Section: Organizer Contacts -->
        <div class="space-y-3">
          <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">Contact Information</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <p><span class="font-semibold text-muted-foreground">Parent Name:</span> {b.parentName}</p>
            <p><span class="font-semibold text-muted-foreground">Phone:</span> {b.phone}</p>
            {#if b.email}
              <p class="col-span-1 sm:col-span-2"><span class="font-semibold text-muted-foreground">Email:</span> {b.email}</p>
            {/if}
          </div>
        </div>

        <!-- Section: Package Details -->
        <div class="space-y-4">
          <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">Selected Package & Specifications</h3>
          
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <span class="font-bold text-base block text-foreground">{selectedPackageName}</span>
              <span class="text-xs text-muted-foreground block">Expected Guest Count: {b.kidsCount} Children</span>
            </div>
            <span class="text-sm font-black text-muted-foreground bg-muted/40 p-2 rounded-xl">
              {track === 'mon-sat' ? '8,000 THB Base' : ''}
              {track === 'sunday' ? '10,000 THB Base' : ''}
              {track === 'smaller-setup' ? 'Table Booking' : ''}
            </span>
          </div>

          <!-- Package Details List -->
          <ul class="space-y-2 text-xs sm:text-sm text-muted-foreground pl-1">
            <li class="flex items-center gap-2">
              <span class="text-primary font-bold">✓</span>
              <span>Exclusive Use of Garden & Pool for 3 hours</span>
            </li>
            {#if track !== 'smaller-setup'}
              <li class="flex items-center gap-2">
                <span class="text-primary font-bold">✓</span>
                <span>Included custom venue decorations & birthday cake</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="text-primary font-bold">✓</span>
                <span>Buffet menu with starters, drinks, desserts, and mains</span>
              </li>
            {:else}
              <li class="flex items-center gap-2">
                <span class="text-primary font-bold">✓</span>
                <span>Dedicated Table Booking in Garden</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="text-primary font-bold">✓</span>
                <span>DIY decorations and cake handled by parent</span>
              </li>
            {/if}
            <li class="flex items-center gap-2">
              <span class="text-primary font-bold">✓</span>
              <span>
                Indoor playground: {includePlayground ? 'add-on selected' : 'not included'}
              </span>
            </li>
          </ul>
        </div>

        <!-- Section: Upgrades & Activities -->
        {#if b.upgrades.length > 0 || b.activities.length > 0}
          <div class="space-y-4">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">Upgrades & Activities Added</h3>
            <div class="space-y-2 text-sm">
              {#each b.upgrades as upgrade}
                <div class="flex justify-between text-muted-foreground">
                  <span>{upgrade}</span>
                  <span class="font-medium text-foreground">Included</span>
                </div>
              {/each}
              {#each b.activities as activity}
                <div class="flex justify-between text-muted-foreground">
                  <span>{activity}</span>
                  <span class="font-medium text-foreground">Included</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Section: Menu Selections -->
        {#if track !== 'smaller-setup' || b.upgrades.some(u => u.includes('Buffet'))}
          <div class="space-y-3">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">Food & Drinks Selection</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-muted-foreground">
              <p><span class="font-bold text-foreground">Starters:</span> Fresh veggie sticks with dips & chopped salad</p>
              <p><span class="font-bold text-foreground">Main Course choice:</span> <span class="text-primary font-bold">{b.mainCourse || 'Mixed Sandwiches / Nuggets'}</span></p>
              <p><span class="font-bold text-foreground">Desserts:</span> Birthday cake & seasonal fruit platter</p>
              <p><span class="font-bold text-foreground">Drinks:</span> Refillable water & juice jars</p>
            </div>
          </div>
        {/if}

        <!-- Section: Special Notes -->
        {#if b.specialNotes}
          <div class="space-y-2">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">Special Notes / Requests</h3>
            <p class="text-sm italic text-muted-foreground bg-muted/10 p-4 rounded-xl leading-relaxed border-l-4 border-primary">
              "{b.specialNotes}"
            </p>
          </div>
        {/if}

        <!-- Section: Total Cost Quote block -->
        <div class="border-t pt-6 flex justify-between items-center">
          <div class="space-y-1">
            <span class="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Estimated Quote Total</span>
            <span class="text-xs text-muted-foreground italic">*Final invoice to be sent separately</span>
          </div>
          <span class="text-3xl font-black text-primary tracking-tight">{b.estimatedTotal.toLocaleString()} THB</span>
        </div>

        <!-- Venue Guidelines Signature Box -->
        <div class="pt-8 border-t-2 border-dashed border-muted grid grid-cols-2 gap-8 text-xs text-muted-foreground">
          <div class="space-y-12">
            <p class="italic leading-relaxed">By checking each guideline, parent acknowledges responsibility for supervision and arrival policies.</p>
            <div class="border-b border-muted-foreground/30 h-6">Parent/Host Signature</div>
          </div>
          <div class="space-y-12 flex flex-col justify-end">
            <div class="border-b border-muted-foreground/30 h-6">Date</div>
          </div>
        </div>

      </div>
    </div>
  </div>
</div>

<!-- PRINT ONLY VIEW (Rendered strictly when window.print() is called) -->
<div class="hidden print:block font-sans text-gray-800 text-xs leading-relaxed max-w-none">
  <!-- Print Header -->
  <header class="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-300">
    <div class="space-y-1">
      <img src={logo} alt="Casa Luma" class="h-10 w-auto" />
      <p class="text-[10px] text-gray-500">Casa Luma Play Cafe, Koh Phangan</p>
    </div>
    <div class="text-right space-y-1">
      <h1 class="text-base font-black tracking-tight uppercase">Birthday Booking Contract</h1>
      <p class="text-[10px] text-gray-500 font-semibold">Reference: {b.reference}</p>
    </div>
  </header>

  <!-- Split Contact & Date Summary -->
  <div class="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
    <div class="space-y-1">
      <p class="text-[10px] uppercase font-bold text-gray-500">Event Details</p>
      <p class="text-sm font-bold text-black">{b.childName} is turning {b.turningAge}!</p>
      <p class="text-xs">Date: <span class="font-bold">{b.eventDate}</span></p>
      <p class="text-xs">Time Slot: <span class="font-bold">{b.startTime}</span> (3-hour party)</p>
    </div>
    <div class="space-y-1 border-l pl-6 border-gray-300">
      <p class="text-[10px] uppercase font-bold text-gray-500">Organizer Details</p>
      <p class="text-sm font-bold text-black">{b.parentName}</p>
      <p class="text-xs">Phone: <span class="font-bold">{b.phone}</span></p>
      {#if b.email}<p class="text-xs">Email: <span class="font-bold">{b.email}</span></p>{/if}
    </div>
  </div>

  <!-- Package Specifications -->
  <div class="space-y-3 mb-6">
    <h2 class="text-xs font-bold uppercase tracking-wider border-b pb-1 text-black">Selected Package</h2>
    <div class="flex justify-between items-center">
      <div>
        <p class="text-sm font-bold text-black">{selectedPackageName}</p>
        <p class="text-[10px] text-gray-500">Guest Count: {b.kidsCount} children</p>
      </div>
      <p class="text-sm font-black text-black">
        {track === 'mon-sat' ? '8,000 THB Base' : ''}
        {track === 'sunday' ? '10,000 THB Base' : ''}
        {track === 'smaller-setup' ? 'Table Booking' : ''}
      </p>
    </div>

    <ul class="space-y-1.5 text-xs text-gray-600 pl-1 mt-2">
      <li>✓ Exclusive Use of Garden & Pool for 3 hours</li>
      {#if track !== 'smaller-setup'}
        <li>✓ Included custom venue decorations & birthday cake</li>
        <li>✓ Buffet menu with starters, desserts, and refillable drinks jars</li>
      {:else}
        <li>✓ Dedicated table reservation in garden</li>
        <li>✓ Parent handles cake and decorations</li>
      {/if}
      <li>✓ Indoor playground: {includePlayground ? 'add-on selected' : 'not included'}</li>
    </ul>
  </div>

  <!-- Upgrades & Activities -->
  {#if b.upgrades.length > 0 || b.activities.length > 0}
    <div class="space-y-2 mb-6">
      <h2 class="text-xs font-bold uppercase tracking-wider border-b pb-1 text-black">Custom Add-Ons & Activities</h2>
      <div class="space-y-1">
        {#each b.upgrades as upgrade}
          <div class="flex justify-between text-gray-600">
            <span>{upgrade}</span>
            <span class="font-bold text-black">Included</span>
          </div>
        {/each}
        {#each b.activities as activity}
          <div class="flex justify-between text-gray-600">
            <span>{activity}</span>
            <span class="font-bold text-black">Included</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Food Selections -->
  {#if track !== 'smaller-setup' || b.upgrades.some(u => u.includes('Buffet'))}
    <div class="space-y-2 mb-6">
      <h2 class="text-xs font-bold uppercase tracking-wider border-b pb-1 text-black">Buffet Catering Details</h2>
      <div class="grid grid-cols-2 gap-4 text-xs text-gray-600">
        <p><span class="font-bold text-black">Starters:</span> Veggie sticks with dips & chopped salad</p>
        <p><span class="font-bold text-black">Main Course:</span> <span class="font-bold text-black">{b.mainCourse || 'Mixed Sandwiches'}</span></p>
        <p><span class="font-bold text-black">Dessert:</span> Birthday cake & seasonal fruit platter</p>
        <p><span class="font-bold text-black">Drinks:</span> Refillable water & juice jars</p>
      </div>
    </div>
  {/if}

  <!-- Special Notes -->
  {#if b.specialNotes}
    <div class="space-y-1 mb-6">
      <h2 class="text-xs font-bold uppercase tracking-wider border-b pb-1 text-black">Special Requests / Dietary Notes</h2>
      <p class="text-xs italic text-gray-600 bg-gray-50 p-3 border-l-4 border-gray-400 rounded-lg">
        "{b.specialNotes}"
      </p>
    </div>
  {/if}

  <!-- Rules & Polices Checklist Summary -->
  <div class="space-y-2 mb-6">
    <h2 class="text-xs font-bold uppercase tracking-wider border-b pb-1 text-black">Notes & Rules Agreed</h2>
    <ul class="space-y-1 text-[10px] text-gray-500">
      <li>• Base packages cover up to 15 children. Surcharge applies for extra children.</li>
      <li>• Event is scheduled strictly for 3 hours. Arrival 15 mins early is requested.</li>
      <li>• Outside food & drink is not permitted without prior venue authorization.</li>
      <li>• Host parents agree to full child supervision responsibility during the event.</li>
    </ul>
  </div>

  <!-- Price Summary Quote Block -->
  <div class="border-t pt-4 flex justify-between items-center mb-12">
    <div>
      <p class="text-xs font-bold text-black uppercase">Estimated Total Cost Quote</p>
      <p class="text-[9px] text-gray-400 font-semibold">*Final formal invoice will be issued separately upon contract review</p>
    </div>
    <span class="text-xl font-black text-black">{b.estimatedTotal.toLocaleString()} THB</span>
  </div>

  <!-- Signatures Printable Box -->
  <div class="grid grid-cols-2 gap-12 text-[10px] mt-16 text-gray-700">
    <div class="space-y-8">
      <div class="border-b border-gray-400 h-6"></div>
      <p class="text-center font-bold">Parent / Host Signature</p>
    </div>
    <div class="space-y-8">
      <div class="border-b border-gray-400 h-6"></div>
      <p class="text-center font-bold">Casa Luma Representative Signature</p>
    </div>
  </div>
</div>
