<script lang="ts">
  import { getMenuItems } from '$lib/menu.remote';
  import {
    generateMenuImage,
    updateMenuItemImage
  } from '$lib/tools/menu-assistant.remote';

  import type { MenuItem } from '$lib/types/menu';

  const PLACEHOLDER = (item: MenuItem) =>
    `https://placehold.co/600x400/eee9e2/5c4a3d?text=${encodeURIComponent(item.name)}`;

  let items = $state(await getMenuItems());
  let selectedItemId = $state<string | null>(null);
  let isGenerating = $state(false);
  let generateError = $state<string | null>(null);
  let successMessage = $state<string | null>(null);
  let systemPrompt = $state(
    'Cozy cafe table food dish shot semi-professional iphone neutral background of wooden table'
  );

  const visibleItems = $derived(items);
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
      const result = await generateMenuImage({ prompt });
      items = items.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              image: result.imageUrl
            }
          : entry
      );

      successMessage = `Image generated for ${item.name}`;
    } catch (error) {
      generateError = error instanceof Error ? error.message : 'Failed to generate image.';
    } finally {
      isGenerating = false;
    }
  }

  async function handleUpdateNotion(item: MenuItem) {
    if (!item.image) {
      generateError = 'Generate an image first.';
      return;
    }

    try {
      await updateMenuItemImage({
        id: item.id,
        imageUrl: item.image,
        gallery: item.gallery
      });
      successMessage = 'Image synced to Notion.';
    } catch (error) {
      generateError = error instanceof Error ? error.message : 'Unable to update Notion.';
    }
  }

  function openItem(item: MenuItem) {
    selectedItemId = item.id;
    generateError = null;
    successMessage = null;
  }
</script>

<div class="space-y-8">
  <header class="space-y-2">
    <h2 class="text-xl font-semibold text-[#5c4a3d]">Menu Assistant</h2>
    <p class="max-w-3xl text-sm text-[#5c4a3d]/70">
      Generate fresh imagery for menu items, review locally, then sync updates back to Notion.
    </p>
  </header>

  <section class="rounded-3xl border border-[#d3c5b8] bg-white/80 p-6 shadow-sm">
    <label class="block">
      <span class="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6550]/80">
        System Prompt
      </span>
      <textarea
        bind:value={systemPrompt}
        rows={2}
        class="mt-2 w-full rounded-2xl border border-[#d9d0c7] bg-white px-4 py-3 text-sm text-[#2c2925] shadow-inner focus:border-[#7a6550] focus:outline-none focus:ring-2 focus:ring-[#cdb69f]/50"
        placeholder="Base style and setting for all image generations..."
      ></textarea>
    </label>
    <p class="mt-2 text-xs text-[#5c4a3d]/60">
      This prompt will be applied to all generated images along with each item's specific details.
    </p>
  </section>

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

  <section class="grid gap-4">
    <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-[#7a6550]/80">
      Menu Items
    </h3>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                disabled={isGenerating && selectedItemId === item.id}
              >
                {#if isGenerating && selectedItemId === item.id}
                  <span class="spinner"></span>
                  Generating
                {:else}
                  Generate Image
                {/if}
              </button>
              {#if item.image && item.image !== PLACEHOLDER(item)}
                <button
                  class="card-update"
                  onclick={async () => {
                    await handleUpdateNotion(item);
                  }}
                  disabled={isGenerating}
                >
                  Update Notion
                </button>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </div>
  </section>
</div>

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
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

  .card-select {
    position: absolute;
    inset: 0;
    cursor: pointer;
    z-index: 1;
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


