<script lang="ts">
  import logo from "$lib/assets/logo/logo-no-sun-transparent.png";
</script>

<svelte:head>
  <title>Casa Luma - Family Registration Form</title>
  <style>
    @media print {
      @page {
        margin: 1.5cm;
        size: A4;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</svelte:head>

<div class="max-w-3xl mx-auto p-8 print:p-0 print:max-w-none font-sans text-gray-800">
  <!-- Header -->
  <header class="flex items-start justify-between mb-8 pb-4 border-b-2 border-gray-300">
    <img src={logo} alt="Casa Luma" class="h-16 w-auto" />
    <div class="text-right">
      <h1 class="text-2xl font-bold tracking-tight">Family Registration Form</h1>
      <p class="text-sm text-gray-500 mt-1">Casa Luma Play Cafe</p>
    </div>
  </header>

  <!-- Privacy Notice -->
  <div class="mb-8 p-4 bg-gray-50 border border-gray-200 print:bg-white">
    <p class="text-sm text-gray-600 leading-relaxed">
      We ask for this information to help us keep everyone safe and to provide the best experience for your family.
      Your details will be handled with care and won't be shared with third parties.
    </p>
  </div>

  <!-- Basic Information -->
  <section class="mb-8">
    <h2 class="text-lg font-semibold mb-4 pb-1 border-b border-gray-200">Basic Information</h2>
    
    <div class="space-y-4">
      <div class="flex items-end gap-2">
        <label class="font-medium whitespace-nowrap">Family Name <span class="text-red-500">*</span></label>
        <div class="flex-1 border-b border-gray-400 min-h-[1.5rem]"></div>
      </div>
      <p class="text-xs text-gray-500 -mt-2 ml-4 italic">Only the family (last) name</p>

      <div class="flex items-end gap-2">
        <label class="font-medium whitespace-nowrap">Main Phone <span class="text-red-500">*</span></label>
        <div class="flex-1 border-b border-gray-400 min-h-[1.5rem]"></div>
      </div>
      <p class="text-xs text-gray-500 -mt-2 ml-4 italic">
        This is our primary way to reach you about your child. We will never send any message or call you without reason.
        This is only for safety and to ensure we can reach you immediately if needed.
      </p>

      <div class="flex items-end gap-2">
        <label class="font-medium whitespace-nowrap">Main Email</label>
        <span class="text-xs text-gray-400 uppercase tracking-wide">(optional)</span>
        <div class="flex-1 border-b border-gray-400 min-h-[1.5rem]"></div>
      </div>
      <p class="text-xs text-gray-500 -mt-2 ml-4 italic">
        We don't send spam, only occasional important updates regarding Casa Luma.
      </p>
    </div>
  </section>

  <!-- Kids Section -->
  <section class="mb-8">
    <h2 class="text-lg font-semibold mb-4 pb-1 border-b border-gray-200">Children</h2>
    
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="bg-gray-100 print:bg-gray-100">
          <th class="border border-gray-300 px-3 py-2 text-left font-semibold w-1/4">Name</th>
          <th class="border border-gray-300 px-3 py-2 text-center font-semibold w-24">Gender</th>
          <th class="border border-gray-300 px-3 py-2 text-left font-semibold w-32">Date of Birth</th>
          <th class="border border-gray-300 px-3 py-2 text-left font-semibold">Notes</th>
        </tr>
      </thead>
      <tbody>
        {#each Array(4) as _, i}
          <tr>
            <td class="border border-gray-300 px-3 py-4"></td>
            <td class="border border-gray-300 px-3 py-4 text-center">
              <div class="flex justify-center gap-4 text-xs">
                <label class="flex items-center gap-1">
                  <span class="inline-block w-4 h-4 border border-gray-400"></span> Boy
                </label>
                <label class="flex items-center gap-1">
                  <span class="inline-block w-4 h-4 border border-gray-400"></span> Girl
                </label>
              </div>
            </td>
            <td class="border border-gray-300 px-3 py-4">
              <span class="text-gray-300 text-xs">DD / MM / YYYY</span>
            </td>
            <td class="border border-gray-300 px-3 py-4"></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <!-- Caregivers Section -->
  <section class="mb-8">
    <h2 class="text-lg font-semibold mb-2 pb-1 border-b border-gray-200">Parents / Caregivers</h2>
    <p class="text-xs text-gray-500 mb-4 italic">
      Please include anyone who might show up with the child, including nannies or other regular caregivers. 
      This is a safety measure. At least one caregiver is required.
    </p>
    
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="bg-gray-100 print:bg-gray-100">
          <th class="border border-gray-300 px-3 py-2 text-left font-semibold">Name</th>
          <th class="border border-gray-300 px-3 py-2 text-center font-semibold w-32">Role</th>
          <th class="border border-gray-300 px-3 py-2 text-center font-semibold w-36">Contact Method</th>
          <th class="border border-gray-300 px-3 py-2 text-left font-semibold w-36">Phone</th>
          <th class="border border-gray-300 px-3 py-2 text-left font-semibold w-24">Notes</th>
        </tr>
      </thead>
      <tbody>
        {#each Array(4) as _, i}
          <tr>
            <td class="border border-gray-300 px-3 py-4"></td>
            <td class="border border-gray-300 px-2 py-4 text-center">
              <div class="flex justify-center gap-3 text-xs">
                <label class="flex items-center gap-1">
                  <span class="inline-block w-4 h-4 border border-gray-400"></span> Parent
                </label>
                <label class="flex items-center gap-1">
                  <span class="inline-block w-4 h-4 border border-gray-400"></span> Caregiver
                </label>
              </div>
            </td>
            <td class="border border-gray-300 px-2 py-4 text-center">
              <div class="flex justify-center gap-2 text-xs">
                <label class="flex items-center gap-1">
                  <span class="inline-block w-4 h-4 border border-gray-400"></span> Thai
                </label>
                <label class="flex items-center gap-1">
                  <span class="inline-block w-4 h-4 border border-gray-400"></span> WhatsApp
                </label>
              </div>
            </td>
            <td class="border border-gray-300 px-3 py-4"></td>
            <td class="border border-gray-300 px-3 py-4"></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <!-- Additional Information -->
  <section class="mb-8">
    <h2 class="text-lg font-semibold mb-4 pb-1 border-b border-gray-200">Additional Information <span class="text-xs font-normal text-gray-400 uppercase tracking-wide ml-2">Optional</span></h2>
    
    <div class="space-y-5">
      <div class="flex items-end gap-2">
        <label class="font-medium whitespace-nowrap">Nationality / Where are you from?</label>
        <div class="flex-1 border-b border-gray-400 min-h-[1.5rem]"></div>
      </div>

      <div>
        <label class="font-medium block mb-3">Dietary Preferences</label>
        <div class="flex flex-wrap gap-6 text-sm">
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> None
          </label>
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> Vegetarian
          </label>
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> Vegan
          </label>
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> Gluten Free
          </label>
        </div>
        <div class="flex items-end gap-2 mt-3">
          <label class="text-sm text-gray-600 whitespace-nowrap">Other:</label>
          <div class="flex-1 border-b border-gray-400 min-h-[1.5rem]"></div>
        </div>
      </div>

      <div>
        <label class="font-medium block mb-3">Do you live in Koh Phangan?</label>
        <div class="flex gap-8 text-sm">
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> Yes
          </label>
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> No
          </label>
        </div>
      </div>

      <div>
        <label class="font-medium block mb-3">How did you hear about us?</label>
        <div class="flex flex-wrap gap-4 text-sm">
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> Instagram
          </label>
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> Facebook
          </label>
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> Google
          </label>
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> Friend
          </label>
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> Walk-in
          </label>
          <label class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 border border-gray-400"></span> Other
          </label>
        </div>
      </div>

      <div>
        <label class="font-medium block mb-2">Special Notes / Requirements</label>
        <p class="text-xs text-gray-500 mb-2 italic">Allergies, accessibility needs, or other notes</p>
        <div class="border border-gray-300 min-h-[4rem] p-2"></div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
    <p>Thank you for registering with Casa Luma. We look forward to welcoming your family.</p>
  </footer>
</div>
