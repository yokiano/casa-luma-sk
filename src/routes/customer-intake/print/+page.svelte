<script lang="ts">
  import logo from "$lib/assets/logo/logo-no-sun-transparent.png";
</script>

<svelte:head>
  <title>Casa Luma - Family Registration Form</title>
  <style>
    @media print {
      @page {
        margin: 1cm;
        size: A4;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</svelte:head>

<div class="max-w-3xl mx-auto p-8 print:p-0 print:max-w-none font-sans text-gray-800 text-sm">
  <!-- Header -->
  <header class="flex items-start justify-between mb-3 pb-2 border-b border-gray-300">
    <img src={logo} alt="Casa Luma" class="h-12 w-auto print:h-10" />
    <div class="text-right">
      <h1 class="text-lg font-bold tracking-tight">Family Registration Form</h1>
      <p class="text-xs text-gray-500">Casa Luma Play Cafe</p>
    </div>
  </header>

  <!-- Privacy Notice -->
  <div class="mb-3 p-2 bg-gray-50 border border-gray-200 print:bg-white text-xs">
    <p class="text-gray-600 leading-tight">
      We ask for this information to help us keep everyone safe and to provide the best experience for your family.
      Your details will be handled with care and won't be shared with third parties.
    </p>
  </div>

  <!-- Basic Information -->
  <section class="mb-3">
    <h2 class="text-sm font-semibold mb-2 pb-0.5 border-b border-gray-200">Basic Information</h2>
    
    <div class="grid grid-cols-2 gap-x-4 gap-y-2">
      <div>
        <div class="flex items-end gap-1.5">
          <label class="text-xs font-medium whitespace-nowrap">Family Name <span class="text-red-500">*</span></label>
          <div class="flex-1 border-b border-gray-400 min-h-[1.25rem]"></div>
        </div>
        <p class="text-[10px] text-gray-500 -mt-1 ml-1 italic">Only the family (last) name</p>
      </div>

      <div>
        <div class="flex items-end gap-1.5">
          <label class="text-xs font-medium whitespace-nowrap">Main Phone <span class="text-red-500">*</span></label>
          <div class="flex-1 border-b border-gray-400 min-h-[1.25rem]"></div>
        </div>
        <p class="text-[10px] text-gray-500 -mt-1 ml-1 italic">Primary contact for safety and emergency. We will never send any message or call you without reason.</p>
      </div>

      <div class="col-span-2">
        <div class="flex items-end gap-1.5">
          <label class="text-xs font-medium whitespace-nowrap">Main Email</label>
          <span class="text-[10px] text-gray-400 uppercase">(optional)</span>
          <div class="flex-1 border-b border-gray-400 min-h-[1.25rem]"></div>
        </div>
        <p class="text-[10px] text-gray-500 -mt-1 ml-1 italic">Occasional updates only</p>
      </div>
    </div>
  </section>

  <!-- Kids Section -->
  <section class="mb-3">
    <h2 class="text-sm font-semibold mb-1.5 pb-0.5 border-b border-gray-200">Children</h2>
    
    <table class="w-full border-collapse text-xs">
      <thead>
        <tr class="bg-gray-100 print:bg-gray-100">
          <th class="border border-gray-300 px-2 py-1 text-left font-semibold w-1/4">Name</th>
          <th class="border border-gray-300 px-1 py-1 text-center font-semibold w-20">Gender</th>
          <th class="border border-gray-300 px-2 py-1 text-left font-semibold w-28">Date of Birth</th>
          <th class="border border-gray-300 px-2 py-1 text-left font-semibold">Notes</th>
        </tr>
      </thead>
      <tbody>
        {#each Array(3) as _, i}
          <tr>
            <td class="border border-gray-300 px-2 py-2"></td>
            <td class="border border-gray-300 px-1 py-2 text-center">
              <div class="flex justify-center gap-2 text-[10px]">
                <span class="inline-block w-3 h-3 border border-gray-400"></span> Boy
                <span class="inline-block w-3 h-3 border border-gray-400 ml-2"></span> Girl
              </div>
            </td>
            <td class="border border-gray-300 px-2 py-2">
              <span class="text-gray-300 text-[10px]">DD/MM/YYYY</span>
            </td>
            <td class="border border-gray-300 px-2 py-2"></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <!-- Caregivers Section -->
  <section class="mb-3">
    <h2 class="text-sm font-semibold mb-1 pb-0.5 border-b border-gray-200">Parents / Caregivers</h2>
    <p class="text-[10px] text-gray-500 mb-1.5 italic">
      Include anyone who might show up with the child (nannies, regular caregivers). Safety measure. At least one required.
    </p>
    
    <table class="w-full border-collapse text-xs">
      <thead>
        <tr class="bg-gray-100 print:bg-gray-100">
          <th class="border border-gray-300 px-2 py-1 text-left font-semibold">Name</th>
          <th class="border border-gray-300 px-1 py-1 text-center font-semibold w-24">Role</th>
          <th class="border border-gray-300 px-1 py-1 text-center font-semibold w-28">Contact</th>
          <th class="border border-gray-300 px-2 py-1 text-left font-semibold w-28">Phone</th>
          <th class="border border-gray-300 px-2 py-1 text-left font-semibold w-20">Notes</th>
        </tr>
      </thead>
      <tbody>
        {#each Array(3) as _, i}
          <tr>
            <td class="border border-gray-300 px-2 py-2"></td>
            <td class="border border-gray-300 px-1 py-2 text-center">
              <div class="flex justify-center gap-1.5 text-[10px]">
                <span class="inline-block w-3 h-3 border border-gray-400"></span> P
                <span class="inline-block w-3 h-3 border border-gray-400 ml-1"></span> C
              </div>
            </td>
            <td class="border border-gray-300 px-1 py-2 text-center">
              <div class="flex justify-center gap-1 text-[10px]">
                <span class="inline-block w-3 h-3 border border-gray-400"></span> T
                <span class="inline-block w-3 h-3 border border-gray-400 ml-1"></span> W
              </div>
            </td>
            <td class="border border-gray-300 px-2 py-2"></td>
            <td class="border border-gray-300 px-2 py-2"></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <!-- Additional Information - Compact 2 Column -->
  <section class="mb-2">
    <h2 class="text-sm font-semibold mb-1.5 pb-0.5 border-b border-gray-200">
      Additional Information <span class="text-[10px] font-normal text-gray-400 uppercase ml-1">Optional</span>
    </h2>
    
    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      <div class="col-span-2">
        <div class="flex items-end gap-1.5">
          <label class="font-medium whitespace-nowrap text-xs">Nationality:</label>
          <div class="flex-1 border-b border-gray-400 min-h-[1.25rem]"></div>
        </div>
      </div>

      <div>
        <label class="font-medium block mb-1 text-xs">Dietary:</label>
        <div class="space-y-0.5 text-[10px]">
          <div class="flex items-center gap-1">
            <span class="inline-block w-3 h-3 border border-gray-400"></span> None
            <span class="inline-block w-3 h-3 border border-gray-400 ml-2"></span> Veg
          </div>
          <div class="flex items-center gap-1">
            <span class="inline-block w-3 h-3 border border-gray-400"></span> Vegan
            <span class="inline-block w-3 h-3 border border-gray-400 ml-2"></span> GF
          </div>
        </div>
        <div class="flex items-end gap-1 mt-1">
          <label class="text-[10px] text-gray-600">Other:</label>
          <div class="flex-1 border-b border-gray-400 min-h-[1rem]"></div>
        </div>
      </div>

      <div>
        <label class="font-medium block mb-1 text-xs">Live in Phangan?</label>
        <div class="flex gap-4 text-[10px]">
          <span class="inline-block w-3 h-3 border border-gray-400"></span> Yes
          <span class="inline-block w-3 h-3 border border-gray-400 ml-2"></span> No
        </div>
        
        <label class="font-medium block mb-1 mt-2 text-xs">How did you hear about us?</label>
        <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
          <div class="flex items-center gap-1">
            <span class="inline-block w-3 h-3 border border-gray-400"></span> Instagram
          </div>
          <div class="flex items-center gap-1">
            <span class="inline-block w-3 h-3 border border-gray-400"></span> Facebook
          </div>
          <div class="flex items-center gap-1">
            <span class="inline-block w-3 h-3 border border-gray-400"></span> Google
          </div>
          <div class="flex items-center gap-1">
            <span class="inline-block w-3 h-3 border border-gray-400"></span> Friend
          </div>
          <div class="flex items-center gap-1">
            <span class="inline-block w-3 h-3 border border-gray-400"></span> Walk-in
          </div>
          <div class="flex items-center gap-1">
            <span class="inline-block w-3 h-3 border border-gray-400"></span> Other
          </div>
        </div>
      </div>

      <div class="col-span-2">
        <label class="font-medium block mb-0.5 text-xs">Special Notes / Requirements</label>
        <p class="text-[10px] text-gray-500 mb-1 italic">Allergies, accessibility needs, or other notes</p>
        <div class="border border-gray-300 min-h-[2.5rem] p-1.5"></div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="pt-2 border-t border-gray-200 text-center text-[10px] text-gray-400">
    <p>Thank you for registering with Casa Luma. We look forward to welcoming your family.</p>
  </footer>
</div>
