<script lang="ts">
  import { getMenuItems } from '$lib/menu.remote';
  import {
    generateMenuImage,
    updateMenuItemImage
  } from '$lib/tools/menu-assistant.remote';
  import { REPLICATE_MODELS, REPLICATE_MODEL_LABELS } from '$lib/constants';
  import { toast } from "svelte-sonner";

  import type { MenuItem } from '$lib/types/menu';

  const PLACEHOLDER = (item: MenuItem) =>
    `https://placehold.co/600x400/eee9e2/5c4a3d?text=${encodeURIComponent(item.name)}`;

  const MODELS = Object.values(REPLICATE_MODELS).map((id) => ({
    id,
    label: REPLICATE_MODEL_LABELS[id]
  }));

  let items = $state(await getMenuItems());
  let selectedItemId = $state<string | null>(null);
  let isGenerating = $state(false);
  let updatingItemId = $state<string | null>(null);
  let generateError = $state<string | null>(null);
  let successMessage = $state<string | null>(null);
  let systemPrompt = $state(
    'Cozy cafe table food dish shot semi-professional neutral background of natural color wooden table. focus on dish. visually appealing food.'
  );
  let selectedModel = $state(MODELS[0].id);

  // Filters & Sort State
  let imageFilter = $state<'all' | 'with-image' | 'no-image'>('all');
  let selectedSection = $state<string>('all');
  let sortBy = $state<'order' | 'name' | 'price' | 'missing-image'>('order');
  let sortDirection = $state<'asc' | 'desc'>('asc');

  // Batch operations state
  let batchStatus = $state<{
    active: boolean;
    total: number;
    current: number;
    mode: 'generate' | 'update' | null;
    errors: string[];
  }>({
    active: false,
    total: 0,
    current: 0,
    mode: null,
    errors: []
  });

  const uniqueSections = $derived([...new Set(items.map((i) => i.section))].sort());

  const visibleItems = $derived.by(() => {
    let result = items.filter((item) => {
      if (imageFilter === 'with-image' && !item.image) return false;
      if (imageFilter === 'no-image' && item.image) return false;
      if (selectedSection !== 'all' && item.section !== selectedSection) return false;
      return true;
    });

    return result.sort((a, b) => {
      let diff = 0;
      switch (sortBy) {
        case 'name':
          diff = a.name.localeCompare(b.name);
          break;
        case 'price':
          diff = a.price - b.price;
          break;
        case 'missing-image':
            // items without image come first
            const aHas = !!a.image;
            const bHas = !!b.image;
            if (aHas === bHas) diff = 0;
            else diff = aHas ? 1 : -1; 
            break;
        case 'order':
        default:
          diff = a.order - b.order;
          break;
      }
      return sortDirection === 'asc' ? diff : -diff;
    });
  });

  const activeItem = $derived(
    selectedItemId ? visibleItems.find((entry) => entry.id === selectedItemId) ?? null : null
  );

  const cardClass = (id: string) =>
    selectedItemId === id ? 'menu-card menu-card--active' : 'menu-card';

  const buildPrompt = (item: MenuItem) => {
    const sections = [
      systemPrompt,
      `${item.name} plated for a Montessori-inspired beachfront cafe in Koh Phangan`,
      item.description ? `Description: ${item.description}` : null,
      item.tags?.length ? `Ingredients: ${item.tags.join(', ')}` : null,
      item.category ? `Course: ${item.category}` : null,
      item.section ? `Menu section: ${item.section}` : null,
      'Soft morning sunlight, natural textures, artisanal styling, editorial food photography, 35mm film warmth'
    ];

    return sections.filter(Boolean).join('. ');
  };

  async function handleGenerate(item: MenuItem) {
    const prompt = buildPrompt(item);

    selectedItemId = item.id;
    isGenerating = true;
    generateError = null;
    successMessage = null;

    try {
      const result = await generateMenuImage({ prompt, model: selectedModel });
      items = items.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              image: result.imageUrl
            }
          : entry
      );

      toast.success(`Image generated for ${item.name}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to generate image.';
      generateError = msg;
      toast.error(msg);
      return false;
    } finally {
      isGenerating = false;
    }
  }

  async function handleUpdateNotion(item: MenuItem) {
    if (!item.image) {
      toast.error('Generate an image first.');
      return false;
    }

    updatingItemId = item.id;
    
    try {
      await updateMenuItemImage({
        id: item.id,
        imageUrl: item.image,
        gallery: item.gallery
      });
      toast.success('Image synced to Notion.');
      return true;
    } catch (error) {
       const msg = error instanceof Error ? error.message : 'Unable to update Notion.';
       toast.error(msg);
      return false;
    } finally {
      updatingItemId = null;
    }
  }

  function openItem(item: MenuItem) {
    selectedItemId = item.id;
    generateError = null;
    successMessage = null;
  }

  async function handleBatchGenerate() {
    const itemsToGenerate = visibleItems.filter((item) => !item.image);

    if (itemsToGenerate.length === 0) {
      toast.info('All items already have images.');
      return;
    }

    if (!confirm(`This will generate images for ${itemsToGenerate.length} items (skipping those with existing images). Continue?`)) return;

    batchStatus = {
        active: true,
        total: itemsToGenerate.length,
        current: 0,
        mode: 'generate',
        errors: []
    };

    for (const item of itemsToGenerate) {
        batchStatus.current++;
        const success = await handleGenerate(item);
        if (!success) {
            batchStatus.errors.push(`Failed to generate: ${item.name}`);
        }
        // Small delay to be nice to APIs
        await new Promise(r => setTimeout(r, 1000));
    }

    batchStatus.active = false;
    successMessage = `Batch generation complete. ${batchStatus.errors.length} errors.`;
  }

  async function handleBatchUpdate() {
    if (!confirm('This will update Notion for ALL items that have images. Continue?')) return;

     batchStatus = {
        active: true,
        total: visibleItems.length,
        current: 0,
        mode: 'update',
        errors: []
    };

    for (const item of visibleItems) {
        batchStatus.current++;
        if (item.image && item.image !== PLACEHOLDER(item)) {
            const success = await handleUpdateNotion(item);
             if (!success) {
                batchStatus.errors.push(`Failed to update: ${item.name}`);
            }
        }
    }

    batchStatus.active = false;
    successMessage = `Batch update complete. ${batchStatus.errors.length} errors.`;
  }

</script>

<div class="min-h-screen grid lg:grid-cols-[300px_1fr] gap-8 items-start pb-20">
  
  <!-- Sidebar Panel -->
  <aside class="space-y-6 lg:sticky lg:top-8 bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-[#d3c5b8]/50 shadow-sm">
    <div>
        <h2 class="text-xl font-semibold text-[#5c4a3d]">Menu Assistant</h2>
        <p class="text-xs text-[#5c4a3d]/70 mt-1">
        Generate fresh imagery for menu items.
        </p>
    </div>

    <!-- Configuration -->
    <div class="space-y-4">
        <label class="block">
            <span class="text-xs font-semibold uppercase tracking-wider text-[#7a6550]/80">Model</span>
            <select 
                bind:value={selectedModel}
                class="mt-1 w-full rounded-lg border border-[#d9d0c7] bg-white px-3 py-2 text-sm text-[#2c2925] focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/50"
            >
                {#each MODELS as model}
                    <option value={model.id}>{model.label}</option>
                {/each}
            </select>
        </label>

        <label class="block">
            <span class="text-xs font-semibold uppercase tracking-wider text-[#7a6550]/80">System Prompt</span>
            <textarea
                bind:value={systemPrompt}
                rows={4}
                class="mt-1 w-full rounded-xl border border-[#d9d0c7] bg-white px-3 py-2 text-xs text-[#2c2925] shadow-inner focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/50 leading-relaxed"
                placeholder="Base style..."
            ></textarea>
        </label>
    </div>

    <div class="h-px bg-[#d3c5b8]/50"></div>

    <!-- Filters & Sort -->
    <div class="space-y-4">
        <h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]">
            Filters & Sort
        </h3>
        
        <div class="grid gap-3">
             <label class="block">
                <span class="text-[10px] font-medium uppercase text-[#7a6550]/70 mb-1 block">Status</span>
                <select 
                    bind:value={imageFilter}
                    class="w-full rounded-lg border border-[#d9d0c7] bg-white px-2 py-1.5 text-xs text-[#2c2925]"
                >
                    <option value="all">Show All</option>
                    <option value="no-image">Missing Image Only</option>
                    <option value="with-image">Has Image Only</option>
                </select>
            </label>

            <label class="block">
                <span class="text-[10px] font-medium uppercase text-[#7a6550]/70 mb-1 block">Section</span>
                <select 
                    bind:value={selectedSection}
                    class="w-full rounded-lg border border-[#d9d0c7] bg-white px-2 py-1.5 text-xs text-[#2c2925]"
                >
                    <option value="all">All Sections</option>
                    {#each uniqueSections as section}
                        <option value={section}>{section}</option>
                    {/each}
                </select>
            </label>

            <div class="grid grid-cols-2 gap-2">
                 <label class="block">
                    <span class="text-[10px] font-medium uppercase text-[#7a6550]/70 mb-1 block">Sort By</span>
                    <select 
                        bind:value={sortBy}
                        class="w-full rounded-lg border border-[#d9d0c7] bg-white px-2 py-1.5 text-xs text-[#2c2925]"
                    >
                        <option value="order">Order</option>
                        <option value="name">Name</option>
                        <option value="price">Price</option>
                        <option value="missing-image">Missing Image</option>
                    </select>
                </label>
                 <label class="block">
                    <span class="text-[10px] font-medium uppercase text-[#7a6550]/70 mb-1 block">Direction</span>
                    <select 
                        bind:value={sortDirection}
                        class="w-full rounded-lg border border-[#d9d0c7] bg-white px-2 py-1.5 text-xs text-[#2c2925]"
                    >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </label>
            </div>
        </div>
    </div>

     <div class="h-px bg-[#d3c5b8]/50"></div>

    <!-- Batch Actions -->
    <div class="space-y-3">
        <h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]">
            Actions
        </h3>
        <button 
            onclick={handleBatchGenerate}
            disabled={batchStatus.active}
            class="w-full rounded-xl bg-[#7a6550] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-[#655140] hover:shadow-md disabled:opacity-50 text-center"
        >
            {batchStatus.active && batchStatus.mode === 'generate' ? `Generating (${batchStatus.current}/${batchStatus.total})...` : 'Generate Visible Missing'}
        </button>

         <button 
            onclick={handleBatchUpdate}
            disabled={batchStatus.active}
            class="w-full rounded-xl border border-[#7a6550] bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#7a6550] transition-all hover:bg-[#f7f1ea] hover:shadow-md disabled:opacity-50 text-center"
        >
             {batchStatus.active && batchStatus.mode === 'update' ? `Updating (${batchStatus.current}/${batchStatus.total})...` : 'Update Visible to Notion'}
        </button>
    </div>

  </aside>

  <!-- Main Content -->
  <main class="space-y-6">
    
    <!-- Status Messages -->
    {#if batchStatus.errors.length > 0}
        <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#8a3d33]">
            <p class="font-bold">Errors during batch operation:</p>
            <ul class="list-disc pl-5">
                {#each batchStatus.errors as error}
                    <li>{error}</li>
                {/each}
            </ul>
        </div>
    {/if}

    {#if generateError}
        <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#8a3d33]">
        {generateError}
        </div>
    {/if}

    {#if successMessage}
        <div class="rounded-2xl border border-[#bcd1c1] bg-[#edf5ec] px-4 py-3 text-sm text-[#38563a]">
        {successMessage}
        </div>
    {/if}

    <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-[#7a6550]/80">
        Results ({visibleItems.length})
        </h3>
    </div>

    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
      {#each visibleItems as item}
        <article class={cardClass(item.id)}>

          <div class="card-image">
            <img
              src={item.image || PLACEHOLDER(item)}
              alt={item.name}
              class={`card-image__media ${item.image ? 'card-image__media--loaded' : ''}`}
            />
            <div class="card-image__overlay"></div>
            <div class="card-image__badge">
              {item.section}
            </div>
          </div>

          <div class="card-body">
            <div class="card-body__header">
              <h4>{item.name}</h4>
              <p>
                {item.currency ?? 'THB'} {item.price}
              </p>
            </div>
            {#if item.description}
              <p class="line-clamp-3">
                {item.description}
              </p>
            {/if}

            <div class="card-body__meta">
              {#if item.highlight}<span>Highlight</span>{/if}
              {#if !item.isAvailable}<span>Unavailable</span>{/if}
              {#each item.dietaryTags as tag}<span>{tag}</span>{/each}
            </div>

            <div class="card-body__footer">
              <span>ID {item.id.slice(0, 6)}...</span>
              <span>Order {item.order}</span>
            </div>
            <div class="card-actions">
              <button
                class="card-generate"
                onclick={async () => {
                  await handleGenerate(item);
                }}
                disabled={(isGenerating && selectedItemId === item.id) || batchStatus.active}
              >
                {#if isGenerating && selectedItemId === item.id}
                  <span class="spinner"></span>
                  Generating
                {:else}
                  Generate
                {/if}
              </button>
              {#if item.image && item.image !== PLACEHOLDER(item)}
                <button
                  class="card-update"
                  onclick={async () => {
                    await handleUpdateNotion(item);
                  }}
                  disabled={isGenerating || batchStatus.active || updatingItemId === item.id}
                >
                  {#if updatingItemId === item.id}
                     <span class="spinner text-[#7a6550] border-[#7a6550]/30 border-t-[#7a6550]"></span>
                     Sync
                  {:else}
                    Sync
                  {/if}
                </button>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </div>
  </main>
</div>

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .menu-card {
    position: relative;
    overflow: hidden;
    border-radius: 1.75rem;
    border: 1px solid #d9d0c7;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 15px 35px -25px rgba(34, 26, 18, 0.45);
    transition: box-shadow 160ms ease, transform 160ms ease;
  }

  .menu-card--active {
    box-shadow: 0 22px 45px -20px rgba(121, 103, 80, 0.55);
    outline: 2px solid #7a6550;
    transform: translateY(-2px);
  }

  .menu-card:focus-within {
    outline: 2px solid #7a6550;
  }

  .menu-card:hover {
    box-shadow: 0 18px 40px -25px rgba(121, 103, 80, 0.4);
  }

  .card-generate {
    position: relative;
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.65rem 1rem;
    border-radius: 9999px;
    background: #7a6550;
    color: white;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    transition: all 160ms ease;
    cursor: pointer;
  }

  .card-generate:hover:not(:disabled) {
    background: #655140;
    transform: translateY(-1px);
    box-shadow: 0 8px 20px -8px rgba(122, 101, 80, 0.5);
  }

  .card-generate:disabled {
    background: #cdb69f;
    cursor: not-allowed;
    opacity: 0.7;
  }

  .spinner {
    display: inline-block;
    width: 0.85rem;
    height: 0.85rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .card-actions {
    position: relative;
    z-index: 2;
    margin-top: 0.75rem;
    display: flex;
    gap: 0.5rem;
  }

  .card-update {
    position: relative;
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.65rem 1rem;
    border-radius: 9999px;
    background: white;
    border: 1.5px solid #7a6550;
    color: #7a6550;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    transition: all 160ms ease;
    cursor: pointer;
  }

  .card-update:hover:not(:disabled) {
    background: #f7f1ea;
    border-color: #655140;
    color: #655140;
    transform: translateY(-1px);
  }

  .card-update:disabled {
    border-color: #d3c5b8;
    color: #d3c5b8;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .card-image {
    position: relative;
    height: 12rem;
    width: 100%;
    overflow: hidden;
    background: #f4ede6;
  }

  .card-image__media {
    height: 100%;
    width: 100%;
    object-fit: cover;
    transform: scale(0.98);
    transition: transform 220ms ease;
  }

  .card-image__media--loaded {
    transform: scale(1);
  }

  .menu-card:hover .card-image__media {
    transform: scale(1.02);
  }

  .card-image__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), transparent);
    opacity: 0;
    transition: opacity 180ms ease;
  }

  .menu-card:hover .card-image__overlay {
    opacity: 1;
  }

  .card-image__badge {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.35rem 0.75rem;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #7a6550;
  }

  .card-body {
    padding: 1.25rem 1.4rem 1.4rem;
    display: grid;
    gap: 0.75rem;
  }

  .card-body__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .card-body__header h4 {
    font-size: 1rem;
    font-weight: 600;
    color: #5c4a3d;
  }

  .card-body__header p {
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(92, 74, 61, 0.75);
  }

  .card-body__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    font-size: 0.68rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(122, 101, 80, 0.7);
  }

  .card-body__meta span {
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    background: rgba(229, 220, 209, 0.4);
  }

  .card-body__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.72rem;
    color: rgba(92, 74, 61, 0.55);
    padding-top: 0.5rem;
  }

  .menu-card--active .card-body__footer {
    color: rgba(92, 74, 61, 0.75);
  }
</style>
